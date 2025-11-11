// app/api/generate/choose/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import uploadToS3 from "../s3Uploads.js"; // must match the renamed file exactly

/** Convert a data URL ("data:image/png;base64,...") to a PNG Buffer */
function dataUrlToPngBuffer(dataUrl) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    throw new Error("Invalid imageDataUrl");
  }
  const parts = dataUrl.split(",");
  if (parts.length < 2) throw new Error("Malformed data URL");
  return Buffer.from(parts[1], "base64");
}

/** Make a safe slug for filenames */
function toSlug(s = "") {
  return String(s)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

/** Build dated S3 key: renders/YYYY/MM/DD/name_theme_color_timestamp.png */
function buildS3Key({ name = "", theme = "", color = "" }) {
  const now = Date.now();
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  const parts = [toSlug(name), toSlug(theme)];
  if (color && String(color).trim()) parts.push(toSlug(color));

  const base = parts.filter(Boolean).join("_") || "design";
  return `renders/${yyyy}/${mm}/${dd}/${base}_${now}.png`;
}

/** Optional: human-readable order id for staff */
function makeOrderId(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const slug = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `FD-${yyyy}-${mm}-${dd}-${slug}`;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { imageDataUrl, meta = {} } = body || {};
    if (!imageDataUrl) {
      return NextResponse.json({ error: "Missing imageDataUrl" }, { status: 400 });
    }

    const {
      name = "",
      theme = "",
      color = "",
      lang = "",
      email = "",
      jobId = "",
      chosenIndex = 0,
    } = meta;

    const buffer = dataUrlToPngBuffer(imageDataUrl);
    const key = buildS3Key({ name, theme, color });
    const orderId = makeOrderId();

    // Your helper: (fileBuffer, key, meta) -> returns s3Url (string)
    const s3Url = await uploadToS3(buffer, key, {
      name,
      theme,
      color,
      lang,
      email,
      orderId,
      jobId,
      chosenIndex,
    });

    if (!s3Url) {
      return NextResponse.json({ error: "Upload failed (no URL returned)" }, { status: 502 });
    }

    return NextResponse.json({ s3Url, filename: key, orderId }, { status: 200 });
  } catch (err) {
    console.error("choose route error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
