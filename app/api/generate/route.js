// app/api/generate/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { FormData as UndiciFormData } from "undici"; // keep using undici’s FormData in the route
import uploadToS3 from "./s3Upload";

// helpers
function pad2(n) {
  return String(n).padStart(2, "0");
}

// slugify for clean filenames
function slugify(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")            // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")                // non-alnum -> hyphen
    .replace(/^-+|-+$/g, "")                    // trim hyphens
    .slice(0, 50);                               // keep filenames reasonable
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      prompt = "",
      negative_prompt: negative_prompt,
      model = "sd3.5-large",
      output_format = "png",
      style_preset = "cinematic",
      cfg_scale = 4,
      aspect_ratio = "1:1",

      // meta coming from your UI
      name = "",
      theme = "",
      color = "",
      lang = "",
    } = body || {};

    if (!process.env.STABILITY_API_KEY) {
      return NextResponse.json(
        { error: "Missing STABILITY_API_KEY" },
        { status: 500 }
      );
    }

    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Missing or invalid prompt" },
        { status: 400 }
      );
    }

    // Build Stability request
    const fd = new UndiciFormData();
    fd.append("prompt", prompt);
    if (negative_prompt) fd.append("negative_prompt", negative_prompt);
    fd.append("model", model);
    fd.append("output_format", output_format);
    fd.append("style_preset", style_preset);
    fd.append("cfg_scale", String(cfg_scale));
    fd.append("aspect_ratio", aspect_ratio);

    const resp = await fetch(
      "https://api.stability.ai/v2beta/stable-image/generate/sd3",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
          Accept: "image/*",
        },
        body: fd,
      }
    );

    if (!resp.ok) {
      const msg = await resp.text();
      console.error("✖ Stability API error:", msg);
      return NextResponse.json({ error: `Stability API error: ${msg}` }, { status: 500 });
    }

    // Convert response to both base64 (for UI) and Buffer (for S3)
    const arrayBuf = await resp.arrayBuffer();
    const b64 = Buffer.from(new Uint8Array(arrayBuf)).toString("base64");
    const dataUrl = `data:image/png;base64,${b64}`;
    const pngBuffer = Buffer.from(arrayBuf);

    // Build dated folder and descriptive filename
    const d = new Date();
    const y = d.getUTCFullYear();
    const m = pad2(d.getUTCMonth() + 1);
    const day = pad2(d.getUTCDate());
    const ts = Date.now();

    const key = `renders/${y}/${m}/${day}/${slugify(name) || "na"}_${slugify(theme) || "na"}_${slugify(color) || "na"}_${ts}.png`;

    // Upload to S3 with tags & metadata
    const s3Url = await uploadToS3(pngBuffer, key, {
      name: name || "na",
      theme: theme || "na",
      color: color || "na",
      lang: lang || "na",
    });

    console.log("✅ Uploaded to S3:", s3Url);

    // Return both the data URL (for drawing the mockup) and the S3 URL
    return NextResponse.json({ images: [dataUrl], s3Url }, { status: 200 });
  } catch (err) {
    console.error("✖ Server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
