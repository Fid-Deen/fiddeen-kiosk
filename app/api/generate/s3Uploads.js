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
  // allow only AWS tag safe chars then trim
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
 * @param {string} key - S3 key (e.g. renders/2025/10/30/bilal-khan_spiritual_black_1761857600000.png)
 * @param {Object} meta - { name, theme, color, lang, email? }
 * @returns {Promise<string>} s3Url
 */
export default async function uploadToS3(fileBuffer, key, meta = {}) {
  if (!REGION || !S3_BUCKET) {
    throw new Error("Missing AWS_REGION or S3_BUCKET environment variables");
  }

  // whitelist and defaults
  const name = meta.name ?? "na";
  const theme = meta.theme ?? "na";
  const color = meta.color ?? "na";
  const lang = meta.lang ?? "na";
  const email = meta.email ?? ""; // optional, do not place in S3 tags

  // S3 object tags: keep values safe and short
  const Tagging = [
    encodeKV("app", "fiddeen"),
    encodeKV("kind", "render"),
    encodeKV("name", tagSafe(name)),
    encodeKV("theme", tagSafe(theme)),
    encodeKV("color", tagSafe(color)),
    encodeKV("lang", tagSafe(lang)),
  ].join("&");

  // Metadata can contain the full original values (including email if present)
  const Metadata = {
    app: "fiddeen",
    kind: "render",
    name: String(name),
    theme: String(theme),
    color: String(color),
    lang: String(lang),
  };
  if (email) Metadata.email = String(email);

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

    // build item
    const Item = {
      pk: { S: dayPk },
      sk: { N: String(now) },

      name: { S: String(name) },
      theme: { S: String(theme) },
      color: { S: String(color) },
      lang: { S: String(lang) },

      s3_key: { S: key },
      s3_url: { S: s3Url },
    };

    if (email) Item.email = { S: String(email) };

    await ddb.send(
      new PutItemCommand({
        TableName: "fiddeen_renders", // matches your actual table name
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
