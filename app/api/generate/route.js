export const runtime = "nodejs"; // ensure Node runtime for Buffer/FormData

import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      prompt,
      negative_prompt,
      model = "sd3.5-large",        // Stability SD 3.5
      output_format = "png",
      style_preset = "cinematic",
      cfg_scale = 4,
      aspect_ratio = "1:1",
    } = body || {};

    if (!process.env.STABILITY_API_KEY) {
      return NextResponse.json(
        { error: "Missing STABILITY_API_KEY in .env.local" },
        { status: 500 }
      );
    }
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Missing prompt" },
        { status: 400 }
      );
    }

    const fd = new FormData();
    fd.append("prompt", prompt);
    if (negative_prompt) fd.append("negative_prompt", negative_prompt);
    fd.append("model", model);
    fd.append("output_format", output_format); // "png" | "jpeg" | "webp"
    fd.append("style_preset", style_preset);   // e.g. "cinematic"
    fd.append("cfg_scale", String(cfg_scale)); // 1..10
    fd.append("aspect_ratio", aspect_ratio);   // e.g. "1:1"

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
      // surface Stability error text to the browser so we can see what's wrong
      const msg = await resp.text();
      return NextResponse.json({ error: msg }, { status: resp.status });
    }

    const ab = await resp.arrayBuffer();
    const b64 = Buffer.from(new Uint8Array(ab)).toString("base64");
    const dataUrl = `data:image/${output_format};base64,${b64}`;

    return NextResponse.json({ images: [dataUrl] });
  } catch (err) {
    console.error("API /generate failed:", err);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}

