// app/api/generate/s3Upload.js
// Upload a PNG buffer to S3 with tags + metadata, then log the render in DynamoDB.
// Returns the public-style S3 URL (virtual-hosted).

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

// ---- AWS clients ----
const REGION = process.env.AWS_REGION;
const S3_BUCKET = process.env.S3_BUCKET;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const ddb = new DynamoDBClient({ region: REGION });

// ---- helpers ----
function encodeKV(k, v) {
  return `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`;
}

/**
 * Upload to S3 and log to DynamoDB.
 * @param {Buffer} fileBuffer - PNG image bytes
 * @param {string} key - S3 object key (e.g., renders/2025/10/30/bilal-khan_spiritual_black_1761857600000.png)
 * @param {Object} meta - Analytics fields: { name, theme, color, lang, ... }
 * @returns {Promise<string>} s3Url
 */
export default async function uploadToS3(fileBuffer, key, meta = {}) {
  // Whitelist + defaults for analytics fields
  const name = meta.name ?? "na";
  const theme = meta.theme ?? "na";
  const color = meta.color ?? "na";
  const lang = meta.lang ?? "na";

  // Build S3 Object Tags (URL-encoded key=value joined with &)
  // Always include app + kind so tags are easy to find in console/reports.
  const tagPairs = [
    encodeKV("app", "fiddeen"),
    encodeKV("kind", "render"),
    encodeKV("name", name),
    encodeKV("theme", theme),
    encodeKV("color", color),
    encodeKV("lang", lang),
  ];
  const Tagging = tagPairs.join("&");

  // Object metadata (becomes x-amz-meta-*). Keys must be plain strings.
  const Metadata = {
    app: "fiddeen",
    kind: "render",
    name: String(name),
    theme: String(theme),
    color: String(color),
    lang: String(lang),
  };

  // ---- Put to S3 ----
  const params = {
    Bucket: S3_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: "image/png",
    Tagging,
    Metadata,
  };

  await s3.send(new PutObjectCommand(params));

  // Virtual-hosted–style URL
  const s3Url = `https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

  // ---- Log to DynamoDB (best-effort, non-blocking for the user) ----
  try {
    const now = Date.now();
    const d = new Date();
    const dayPk = `day#${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

    await ddb.send(
      new PutItemCommand({
        TableName: "fiddeen_renders",
        Item: {
          pk:     { S: dayPk },
          sk:     { N: String(now) },

          name:   { S: String(name) },
          theme:  { S: String(theme) },
          color:  { S: String(color) },
          lang:   { S: String(lang) },

          s3_key:{ S: key },
          s3_url:{ S: s3Url },
        },
      })
    );

    console.log("✅ Logged render to DynamoDB");
  } catch (err) {
    console.error("❌ DynamoDB logging failed:", err);
    // Do not throw; uploading succeeded and the user should still get their URL.
  }

  return s3Url;
}
