// app/api/generate/s3Upload.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a PNG buffer to S3 with tags + metadata
 * @param {Buffer} fileBuffer
 * @param {string} key           e.g. renders/2025/10/30/bilal-khan_spiritual_black_1761857600000.png
 * @param {object} meta          { name, theme, color, lang }
 * @returns {string} public-ish S3 object URL (virtual)
 */
export default async function uploadToS3(fileBuffer, key, meta = {}) {
  const { name = "na", theme = "na", color = "na", lang = "na" } = meta;

  // Tags must be URL-encoded key=value pairs joined by '&'
  const tagging =
    `app=${encodeURIComponent("fiddeen")}` +
    `&kind=${encodeURIComponent("render")}` +
    `&name=${encodeURIComponent(name)}` +
    `&theme=${encodeURIComponent(theme)}` +
    `&color=${encodeURIComponent(color)}` +
    `&lang=${encodeURIComponent(lang)}`;

  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: "image/png",
    Tagging: tagging, // visible in “Tags” tab
    Metadata: {
      app: "fiddeen",
      kind: "render",
      name,
      theme,
      color,
      lang, // visible in “Metadata” tab as x-amz-meta-*
    },
  };

  await s3.send(new PutObjectCommand(params));

  const url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  console.log("✅ Uploaded to S3:", key);
  return url;
}
