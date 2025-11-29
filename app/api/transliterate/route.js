/* -----------------------------------------------------------
   app/api/transliterate/route.js
   PRIMARY: OpenAI gpt-4.1
   FALLBACK: Google Cloud Translation API
   Returns always: { text: "..." }
----------------------------------------------------------- */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import OpenAI from "openai";

/* Utility: safe string trimming */
function safeTrim(v) {
  return typeof v === "string" ? v.trim() : "";
}

/* Validate "name" input */
function isInvalidName(s) {
  return !s || typeof s !== "string" || !s.trim();
}

/* Validate language code */
function isInvalidCode(code) {
  return !code || typeof code !== "string" || !code.trim();
}

/* Very strict OpenAI system prompt */
function buildStrictPrompt(name, targetLanguage) {
  return `
You are a transliteration engine.

TASK:
Transliterate or rewrite the following NAME into the target script.

REQUIREMENTS:
• Output ONLY the final text in the target script.
• No explanations.
• No English.
• No punctuation.
• No extra words.
• Do NOT correct spelling.
• Do NOT interpret meaning.
• STRICTLY output the transliterated name.

INPUT NAME: ${name}
TARGET LANGUAGE: ${targetLanguage}

Output ONLY the transliterated text.`;
}

/* Attempt OpenAI transliteration */
async function tryOpenAI(name, targetLanguage) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const client = new OpenAI({ apiKey });

  const systemPrompt = buildStrictPrompt(name, targetLanguage);

  const result = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: name }
    ],
    max_tokens: 30,
    temperature: 0
  });

  const out = result?.choices?.[0]?.message?.content?.trim() || "";
  if (!out) throw new Error("OpenAI returned empty string");

  // Basic sanity: no English words, no Latin-only output
  if (/^[A-Za-z0-9\s]+$/.test(out)) {
    throw new Error("OpenAI hallucinated English output");
  }

  return out;
}

/* Fallback → Google Translate API */
async function tryGoogle(name, targetLanguage) {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) throw new Error("Missing GOOGLE_TRANSLATE_API_KEY");

  const url =
    "https://translation.googleapis.com/language/translate/v2?key=" +
    encodeURIComponent(key);

  const body = {
    q: name,
    target: targetLanguage,
    format: "text"
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error("Google API error: " + txt);
  }

  const data = await res.json();
  const out = data?.data?.translations?.[0]?.translatedText || "";

  if (!out.trim()) throw new Error("Google returned empty text");

  return out;
}

/* Final POST handler */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const name = safeTrim(body.name);
    const targetLanguage = safeTrim(body.targetLanguage);

    if (isInvalidName(name) || isInvalidCode(targetLanguage)) {
      return NextResponse.json(
        { error: "Both 'name' and 'targetLanguage' are required." },
        { status: 400 }
      );
    }

    // 1) Try OpenAI primary
    try {
      const openaiText = await tryOpenAI(name, targetLanguage);
      return NextResponse.json({ text: openaiText }, { status: 200 });
    } catch (err) {
      console.warn("Primary OpenAI failed → fallback. Reason:", err.message);
    }

    // 2) Try Google fallback
    try {
      const googleText = await tryGoogle(name, targetLanguage);
      return NextResponse.json({ text: googleText }, { status: 200 });
    } catch (err) {
      console.warn("Google fallback failed:", err.message);
    }

    // 3) Ultimate fallback → original text
    return NextResponse.json({ text: name }, { status: 200 });

  } catch (err) {
    console.error("Transliterate route fatal error:", err);
    return NextResponse.json(
      { error: "Server error while transliterating." },
      { status: 500 }
    );
  }
}
