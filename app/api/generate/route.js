/* ---------------------------------------------------------
   app/api/generate/route.js
   Updated for:
   - IP rate limiting (art only)
   - Gemini 3.0 Pro Preview (Nano Banana Pro)
   - No UI / name card changes
--------------------------------------------------------- */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

import {
  COUNTRY_LANDMARKS,
  THEME_DESCRIPTIONS,
  TIME_OF_DAY_HINTS,
  BASE_STYLE,
} from "./constants.js";

/* ---------------------------------------
   ENV
--------------------------------------- */
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

/* ---------------------------------------
   IP RATE LIMITING (art scenes ONLY)
--------------------------------------- */
const ipStore = new Map();

function extractIP(req) {
  const h = req.headers;
  const xf = h.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  const xr = h.get("x-real-ip");
  if (xr) return xr.trim();
  return "unknown";
}

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = ipStore.get(ip) || { recent: [], hourly: [] };

  entry.recent = entry.recent.filter(t => now - t < 15000);
  entry.hourly = entry.hourly.filter(t => now - t < 3600_000);

  if (entry.recent.length >= 1) return false;
  if (entry.hourly.length >= 20) return false;

  entry.recent.push(now);
  entry.hourly.push(now);

  ipStore.set(ip, entry);
  return true;
}

/* ---------------------------------------
   HELPERS
--------------------------------------- */
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
  return (
    THEME_DESCRIPTIONS?.[key] ||
    THEME_DESCRIPTIONS?.[key.toLowerCase()] ||
    ""
  );
}

function buildTimeOfDayFragment(timeOfDay) {
  const key = safeTrim(timeOfDay);
  if (!key) return "";
  return (
    TIME_OF_DAY_HINTS?.[key] ||
    TIME_OF_DAY_HINTS?.[key.toLowerCase()] ||
    ""
  );
}

function buildArtScenePrompt({ country, theme, timeOfDay }) {
  const parts = [];

  const c = buildCountryFragment(country);
  if (c) parts.push(c);

  const t = buildThemeFragment(theme);
  if (t) parts.push(t);

  const tod = buildTimeOfDayFragment(timeOfDay);
  if (tod) parts.push(tod);

  parts.push(
    BASE_STYLE,
    "no logos, no UI, no screenshots, no watermarks, no usernames",
    "no readable text in any language"
  );

  return parts.join(", ");
}

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

/* ---------------------------------------
   GEMINI (Nano Banana Pro / Gemini 3 Pro Preview)
--------------------------------------- */

async function generateWithGemini(prompt, count) {
  if (!GEMINI_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY is not set");
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({
    model: "gemini-3.0-pro-preview",
  });

  const result = await model.generateImages({
    prompt,
    n: count,
    size: "1024x1024",
  });

  const imgs = result?.images || [];
  if (!Array.isArray(imgs) || imgs.length === 0) {
    throw new Error("Gemini returned no images");
  }

  return imgs.map(img => {
    const b64 = img.imageBytes;
    if (!b64) throw new Error("Invalid Gemini payload");
    return `data:image/png;base64,${b64}`;
  });
}

/* ---------------------------------------
   ROUTE HANDLER
--------------------------------------- */

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
    /* ---------------------------------------
       NAME CARD — unchanged
    --------------------------------------- */
    if (designType === "nameCard") {
      const arabicName = safeTrim(body?.arabicName);
      if (!arabicName) {
        return NextResponse.json(
          { error: "Arabic name is required for nameCard designs." },
          { status: 400 }
        );
      }

      const prompt = buildNameCardPrompt(arabicName);
      const images = await generateWithGemini(prompt, 1);

      return NextResponse.json({
        images,
        provider: "gemini",
      });
    }

    /* ---------------------------------------
       ART SCENES — rate limited + Gemini
    --------------------------------------- */
    const ip = extractIP(req);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          error:
            "Too many art-scene generations from this IP. Please wait and try again.",
        },
        { status: 429 }
      );
    }

    const country = safeTrim(body?.country);
    const theme = safeTrim(body?.theme);
    const timeOfDay = safeTrim(body?.timeOfDay);

    if (!timeOfDay) {
      return NextResponse.json(
        { error: "Time of day is required for art scene designs." },
        { status: 400 }
      );
    }

    const artPrompt = buildArtScenePrompt({ country, theme, timeOfDay });

    const images = await generateWithGemini(artPrompt, previewCount);

    return NextResponse.json({
      images,
      provider: "gemini",
    });
  } catch (err) {
    console.error("Generate route error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate images" },
      { status: 500 }
    );
  }
}
