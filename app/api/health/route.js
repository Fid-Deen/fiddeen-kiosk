// app/api/health/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";

function bool(v) {
  return !!(typeof v === "string" ? v.trim() : v);
}

export async function GET(req) {
  const url = new URL(req.url);
  const deep = url.searchParams.get("deep") === "1";

  const AWS_REGION = process.env.AWS_REGION;
  const S3_BUCKET = process.env.S3_BUCKET;
  const STABILITY = process.env.STABILITY_API_KEY;

  const summary = {
    env: {
      AWS_REGION: bool(AWS_REGION),
      S3_BUCKET: bool(S3_BUCKET),
      STABILITY_API_KEY: bool(STABILITY),
      AWS_ACCESS_KEY_ID: bool(process.env.AWS_ACCESS_KEY_ID),
      AWS_SECRET_ACCESS_KEY: bool(process.env.AWS_SECRET_ACCESS_KEY),
    },
    deepChecks: { performed: deep, s3: null, dynamodb: null },
    notes: "Add ?deep=1 to verify S3 bucket access and DynamoDB table visibility.",
  };

  if (!deep) {
    return NextResponse.json(summary, { status: 200 });
  }

  try {
    if (!AWS_REGION || !S3_BUCKET)
      throw new Error("Missing AWS_REGION or S3_BUCKET");
    const s3 = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    summary.deepChecks.s3 = { ok: true, bucket: S3_BUCKET };
  } catch (err) {
    summary.deepChecks.s3 = { ok: false, error: err.message || String(err) };
  }

  try {
    const ddb = new DynamoDBClient({ region: AWS_REGION });
    const TableName = "fiddeen_renders";
    await ddb.send(new DescribeTableCommand({ TableName }));
    summary.deepChecks.dynamodb = { ok: true, table: TableName };
  } catch (err) {
    summary.deepChecks.dynamodb = { ok: false, error: err.message || String(err) };
  }

  return NextResponse.json(summary, { status: 200 });
}
