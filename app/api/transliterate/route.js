// app/api/transliterate/route.js

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

function safeTrim(val) {
  return typeof val === "string" ? val.trim() : "";
}

export async function POST(req) {
  try {
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_TRANSLATE_API_KEY is not set on the server." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const name = safeTrim(body.name);
    const targetLanguage = safeTrim(body.targetLanguage);

    if (!name || !targetLanguage) {
      return NextResponse.json(
        { error: "Both 'name' and 'targetLanguage' are required." },
        { status: 400 }
      );
    }

    // Call Google Cloud Translation API (v2) using the API key.
    // This will effectively give you the name rendered in the target script.
    const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(
      apiKey
    )}`;

    const googleRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: name,
        target: targetLanguage,
        format: "text",
      }),
    });

    if (!googleRes.ok) {
      const text = await googleRes.text();
      console.error("Google Translate API error:", text);
      return NextResponse.json(
        { error: "Failed to call Google Translate API." },
        { status: 502 }
      );
    }

    const data = await googleRes.json();
    const translated =
      data?.data?.translations?.[0]?.translatedText || name;

    // Return unified JSON shape for the frontend.
    return NextResponse.json(
      { text: translated },
      { status: 200 }
    );
  } catch (err) {
    console.error("Transliterate route error:", err);
    return NextResponse.json(
      { error: "Server error while transliterating." },
      { status: 500 }
    );
  }
}
