// app/api/generate/route.js

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import OpenAI from "openai";

import {
  COUNTRY_LANDMARKS,
  THEME_DESCRIPTIONS,
  TIME_OF_DAY_HINTS,
  BASE_STYLE,
} from "./constants.js"; // adjust path if your constants file is elsewhere

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/* ---------------- helpers ---------------- */

function safeTrim(val) {
  return typeof val === "string" ? val.trim() : "";
}

function buildCountryFragment(country) {
  const key = safeTrim(country).toLowerCase();
  if (!key) return "";
  const pool = COUNTRY_LANDMARKS?.[key];
  if (!Array.isArray(pool) || pool.length === 0) return "";
  return pool.slice(0, 3).join(", ");
}

function buildThemeFragment(theme) {
  const key = safeTrim(theme);
  if (!key) return "";
  const desc =
    THEME_DESCRIPTIONS?.[key] ||
    THEME_DESCRIPTIONS?.[key.toLowerCase()];
  return desc || "";
}

function buildTimeOfDayFragment(timeOfDay) {
  const key = safeTrim(timeOfDay);
  if (!key) return "";
  const hint =
    TIME_OF_DAY_HINTS?.[key] ||
    TIME_OF_DAY_HINTS?.[key.toLowerCase()];
  return hint || "";
}

// art scene prompt (old behavior)
function buildArtScenePrompt({ country, theme, timeOfDay }) {
  const parts = [];

  const c = buildCountryFragment(country);
  if (c) parts.push(c);

  const t = buildThemeFragment(theme);
  if (t) parts.push(t);

  const tod = buildTimeOfDayFragment(timeOfDay);
  if (tod) parts.push(tod);

  parts.push(
    BASE_STYLE ||
      "highly detailed illustration, sharp focus, rich textures, subtle lighting",
    "no logos, no UI, no screenshots, no watermarks, no usernames",
    "no readable text in any language"
  );

  return parts.join(", ");
}

// name-card prompt (Arabic calligraphy, white on black)
function buildNameCardPrompt(arabicName) {
  const name = safeTrim(arabicName) || "اسم";
  return [
    `Refined Arabic Thuluth calligraphy of the name "${name}"`,
    "thin, flowing white strokes on a perfectly solid black background",
    "Render the following Arabic text EXACTLY as provided, with no changes in letters",
    "centered composition with generous margins around the lettering",
    "balanced and symmetrical layout, no cropping of any strokes",
    "flat 2D digital artwork, no gradients, no textures, no 3D, no glow",
    "no English letters, no Latin script, no numbers",
    "no extra symbols, no decorative borders, no additional words",
    "high-resolution square image suitable for printing on tote bags",
  ].join(", ");
}

/* --------------- OpenAI only --------------- */

async function generateWithOpenAI(prompt, count) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const client = new OpenAI({ apiKey: OPENAI_API_KEY });

  const result = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    n: count,
    size: "1024x1024",
  });

  const data = result?.data || [];
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("OpenAI returned no images");
  }

  const images = data.map((item) => {
    const b64 = item?.b64_json;
    if (!b64 || typeof b64 !== "string") {
      throw new Error("Invalid OpenAI image payload");
    }
    return `data:image/png;base64,${b64}`;
  });

  return images;
}

/* ---------------- route handler ---------------- */

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const designType = body?.designType === "nameCard" ? "nameCard" : "art";
  const previewCount =
    typeof body?.previewCount === "number"
      ? body.previewCount
      : designType === "nameCard"
      ? 1
      : 3;

  try {
    let prompt;

    if (designType === "nameCard") {
      const arabicName = safeTrim(body?.arabicName);
      if (!arabicName) {
        return NextResponse.json(
          { error: "Arabic name is required for nameCard designs." },
          { status: 400 }
        );
      }
      prompt = buildNameCardPrompt(arabicName);
    } else {
      const country = safeTrim(body?.country);
      const theme = safeTrim(body?.theme);
      const timeOfDay = safeTrim(body?.timeOfDay);

      if (!timeOfDay) {
        return NextResponse.json(
          { error: "Time of day is required for art scene designs." },
          { status: 400 }
        );
      }

      prompt = buildArtScenePrompt({ country, theme, timeOfDay });
    }

    const images = await generateWithOpenAI(prompt, previewCount);

    return NextResponse.json({
      images,
      provider: "openai",
    });
  } catch (err) {
    console.error("Generate route error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate images" },
      { status: 500 }
    );
  }
}
