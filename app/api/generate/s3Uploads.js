// app/api/generate/s3Uploads.js 

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const REGION = process.env.AWS_REGION;
const S3_BUCKET = process.env.S3_BUCKET;
const SES_FROM = process.env.SES_FROM_EMAIL;
const SES_TO = process.env.SES_TO_EMAIL;

const baseAwsConfig = {
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

const s3 = new S3Client(baseAwsConfig);
const ddb = new DynamoDBClient(baseAwsConfig);
const ses = new SESv2Client(baseAwsConfig);

function tagSafe(s = "") {
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

async function emailRenderNotification(s3Url, meta = {}) {
  if (!SES_FROM || !SES_TO) return;

  const {
    name = "customer",
    theme = "",
    timeOfDay = "",
    country = "",
    bagColor = "",
    bagType = "",
    designType = "",
  } = meta;

  let subject = `New Fid Deen tote design for ${name}`;
  if (designType === "upload") {
    subject = `New Fid Deen uploaded design for ${name}`;
  } else if (designType === "smart") {
    subject = `New Fid Deen smart mode AI design for ${name}`;
  }

  const headerLine =
    designType === "upload"
      ? "A customer has UPLOADED their own tote design and it has been saved to S3."
      : designType === "smart"
      ? "A new SMART MODE AI tote design has been generated and uploaded to S3."
      : "A new tote design has been generated and uploaded to S3.";

  const lines = [
    headerLine,
    "",
    `Name:        ${name}`,
    designType ? `Design type: ${designType}` : "",
    country ? `Country:     ${country}` : "",
    theme ? `Theme:       ${theme}` : "",
    timeOfDay ? `Time of day: ${timeOfDay}` : "",
    bagColor ? `Bag color:   ${bagColor}` : "",
    bagType ? `Bag type:    ${bagType}` : "",
    "",
    `Image URL:`,
    s3Url,
  ].filter(Boolean);

  const bodyText = lines.join("\n");

  const command = new SendEmailCommand({
    FromEmailAddress: SES_FROM,
    Destination: { ToAddresses: [SES_TO] },
    Content: {
      Simple: {
        Subject: { Data: subject },
        Body: { Text: { Data: bodyText } },
      },
    },
  });

  await ses.send(command);
}

export default async function uploadToS3(fileBuffer, key, meta = {}) {
  if (!REGION || !S3_BUCKET) {
    throw new Error("Missing AWS_REGION or S3_BUCKET environment variables");
  }

  const {
    name = "na",
    theme = "na",
    color = "na",
    lang = "na",
    email = "",
    orderId = "",
    jobId = "",
    chosenIndex = 0,
    country = "",
    timeOfDay = "",
    bagType = "",
    bagColor = "",
    app = "fiddeen",
    kind = "render",
    designType = "art",
  } = meta;

  const tagPairs = [
    ["app", app],
    ["kind", kind],
    ["name", name],
    ["theme", theme],
    ["timeOfDay", timeOfDay],
    ["country", country],
    ["color", color],
    ["lang", lang],
    ["designType", designType],
  ]
    .filter(([_, v]) => String(v || "").trim().length > 0)
    .map(([k, v]) => encodeKV(k, tagSafe(v)));

  const Tagging = tagPairs.join("&");

  const Metadata = {
    app: String(app),
    kind: String(kind),
    name: String(name),
    theme: String(theme),
    color: String(color),
    lang: String(lang),
    country: String(country || ""),
    timeOfDay: String(timeOfDay || ""),
    bagType: String(bagType || ""),
    bagColor: String(bagColor || ""),
    orderId: String(orderId || ""),
    jobId: String(jobId || ""),
    chosenIndex: String(chosenIndex ?? 0),
    createdAt: new Date().toISOString(),
    designType: String(designType || ""),
  };
  if (email) Metadata.email = String(email);

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

  try {
    const now = Date.now();
    const d = new Date();
    const dayPk = `day#${d.getUTCFullYear()}-${String(
      d.getUTCMonth() + 1
    ).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

    const Item = {
      pk: { S: dayPk },
      sk: { N: String(now) },
      name: { S: String(name) },
      color: { S: String(color) },
      lang: { S: String(lang) },
      s3_key: { S: key },
      s3_url: { S: s3Url },
      order_id: { S: String(orderId || "") },
      job_id: { S: String(jobId || "") },
      chosen_index: { N: String(chosenIndex ?? 0) },
    };

    // Only include these if non-empty so DynamoDB secondary indexes are happy
    if (String(theme || "").trim() !== "") {
      Item.theme = { S: String(theme) };
    }
    if (String(timeOfDay || "").trim() !== "") {
      Item.time_of_day = { S: String(timeOfDay) };
    }
    if (String(country || "").trim() !== "") {
      Item.country = { S: String(country) };
    }
    if (String(bagColor || "").trim() !== "") {
      Item.bag_color = { S: String(bagColor) };
    }
    if (String(bagType || "").trim() !== "") {
      Item.bag_type = { S: String(bagType) };
    }
    if (String(designType || "").trim() !== "") {
      Item.design_type = { S: String(designType) };
    }
    if (email) {
      Item.email = { S: String(email) };
    }

    await ddb.send(
      new PutItemCommand({
        TableName: "fiddeen_renders",
        Item,
      })
    );

    console.log("✅ Logged render to DynamoDB");
  } catch (err) {
    console.error("❌ DynamoDB logging failed:", err);
  }

  try {
    await emailRenderNotification(s3Url, {
      name,
      theme,
      timeOfDay,
      country,
      bagColor,
      bagType,
      designType,
    });
    console.log("✅ Email notification sent");
  } catch (err) {
    console.error("❌ Email notification failed:", err);
  }

  return s3Url;
}
