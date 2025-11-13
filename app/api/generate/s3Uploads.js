// app/api/generate/s3Uploads.js
// Upload a PNG buffer to S3 with tags + metadata, then log the render in DynamoDB.
// Returns the public S3 URL as a string.

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

// ---- env ----
const REGION = process.env.AWS_REGION;
const S3_BUCKET = process.env.S3_BUCKET;

// ---- aws clients ----
const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const ddb = new DynamoDBClient({ region: REGION });

// ---- helpers ----
function tagSafe(s = "") {
  // allow only AWS tag-safe chars then trim (max 256)
  return String(s)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 _.:/=+@-]/g, "")
    .slice(0, 256)
    .trim();
}

function encodeKV(k, v) {
  return `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`;
}

/**
 * Upload to S3 and log to DynamoDB.
 * @param {Buffer} fileBuffer - PNG bytes
 * @param {string} key - S3 key (e.g. renders/2025/11/12/bilal-peaceful-nighttime-palestine_1731430000000.png)
 * @param {Object} meta - fields forwarded from /choose
 *   Expected: {
 *     name, theme, color, lang, email,
 *     orderId, jobId, chosenIndex,
 *     country, timeOfDay, bagType, bagColor,
 *     app, kind
 *   }
 * @returns {Promise<string>} s3Url
 */
export default async function uploadToS3(fileBuffer, key, meta = {}) {
  if (!REGION || !S3_BUCKET) {
    throw new Error("Missing AWS_REGION or S3_BUCKET environment variables");
  }

  // Whitelist & defaults (keep backward compatible keys)
  const {
    name = "na",
    theme = "na",
    color = "na",        // historical 'color' field (we map bagColor -> color in /choose)
    lang = "na",
    email = "",          // optional; don't put in S3 tags
    orderId = "",
    jobId = "",
    chosenIndex = 0,

    // New fields
    country = "",
    timeOfDay = "",      // "daytime" | "nighttime"
    bagType = "",
    bagColor = "",

    app = "fiddeen",
    kind = "render",
  } = meta;

  // ---------------- S3 Tags ----------------
  // Keep under S3's 10-tag limit. Prioritize core queryable fields.
  const tagPairs = [
    ["app", app],
    ["kind", kind],
    ["name", name],
    ["theme", theme],
    ["timeOfDay", timeOfDay],
    ["country", country],
    ["color", color], // legacy compat
    ["lang", lang],
  ]
    .filter(([_, v]) => String(v || "").trim().length > 0)
    .map(([k, v]) => encodeKV(k, tagSafe(v)));

  const Tagging = tagPairs.join("&");

  // ---------------- S3 Metadata ----------------
  // Can be more verbose than tags.
  const Metadata = {
    app: String(app),
    kind: String(kind),

    name: String(name),
    theme: String(theme),
    color: String(color),      // legacy
    lang: String(lang),

    // new fields
    country: String(country || ""),
    timeOfDay: String(timeOfDay || ""),
    bagType: String(bagType || ""),
    bagColor: String(bagColor || ""),

    // operational context
    orderId: String(orderId || ""),
    jobId: String(jobId || ""),
    chosenIndex: String(chosenIndex ?? 0),

    // created-at for convenience
    createdAt: new Date().toISOString(),
  };
  if (email) Metadata.email = String(email); // include if provided

  // ---- put to S3 ----
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: "image/png",
      Tagging,
      Metadata,
    })
  );

  const s3Url = `https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

  // ---- log to dynamodb (best effort) ----
  try {
    const now = Date.now();
    const d = new Date();
    const dayPk = `day#${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getUTCDate()).padStart(2, "0")}`;

    // Build item (DynamoDB is schemaless; add new attributes safely)
    const Item = {
      pk: { S: dayPk },
      sk: { N: String(now) },

      // core fields
      name: { S: String(name) },
      theme: { S: String(theme) },
      color: { S: String(color) },
      lang: { S: String(lang) },

      // new fields
      time_of_day: { S: String(timeOfDay || "") },
      country: { S: String(country || "") },
      bag_color: { S: String(bagColor || "") },
      bag_type: { S: String(bagType || "") },

      // operational context
      order_id: { S: String(orderId || "") },
      job_id: { S: String(jobId || "") },
      chosen_index: { N: String(chosenIndex ?? 0) },

      // S3
      s3_key: { S: key },
      s3_url: { S: s3Url },
    };

    if (email) Item.email = { S: String(email) };

    await ddb.send(
      new PutItemCommand({
        TableName: "fiddeen_renders",
        Item,
      })
    );
    console.log("✅ Logged render to DynamoDB");
  } catch (err) {
    console.error("❌ DynamoDB logging failed:", err);
    // do not throw; upload succeeded and caller should still get the URL
  }

  return s3Url;
}
