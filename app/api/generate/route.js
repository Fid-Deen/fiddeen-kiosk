/* ---------------------------------------------------------
  app/api/generate/route.js

  Art scene + (legacy) name card generation for Fid Deen

  - Art scenes use Google Gemini image model (Nano Banana style)
  - One coherent scene per image (no collages)
  - Up to 3 distinct landmarks per country for previews
  - Composition Type controls camera framing (wide / mid / close)
  - IP rate limiting for art scenes
--------------------------------------------------------- */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

import {
  COUNTRY_LANDMARKS,
  TIME_OF_DAY_HINTS,
  BASE_STYLE,
  COMPOSITION_TYPES,
} from "./constants.js";

/* ---------------------------------------
  ENV
--------------------------------------- */

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || "";

console.log(
  "[generate route] GEMINI_API_KEY present?",
  GEMINI_API_KEY ? "YES" : "NO"
);

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

  // One request every 15 seconds
  entry.recent = entry.recent.filter((t) => now - t < 15_000);
  // Max 20 per hour
  entry.hourly = entry.hourly.filter((t) => now - t < 3_600_000);

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

// Fallback generic scenes when no country is selected
const GENERIC_SCENES = [
  "Architectural courtyard scene with arches, geometric tilework, and a small fountain",
  "Stone arcade scene with repeating arches and patterned paving",
  "Quiet walled garden scene with carved plaster panel and tiled water channel",
];

function normalizeCountryKey(country) {
  const key = safeTrim(country).toLowerCase();
  if (!key) return null;
  return COUNTRY_LANDMARKS[key] ? key : null;
}

function pickLandmarkScene(countryKey, index) {
  if (countryKey && COUNTRY_LANDMARKS[countryKey]) {
    const list = COUNTRY_LANDMARKS[countryKey];
    if (Array.isArray(list) && list.length > 0) {
      return list[index % list.length];
    }
  }
  // No country or unknown → generic scenes
  const list = GENERIC_SCENES;
  return list[index % list.length];
}

function getCompositionSentence(compositionKey) {
  const normalized = safeTrim(compositionKey).toLowerCase();
  if (normalized && COMPOSITION_TYPES[normalized]) {
    return COMPOSITION_TYPES[normalized];
  }
  // Default to mid distance if unset or invalid
  return COMPOSITION_TYPES.mid;
}

function getTimeOfDaySentence(timeOfDayKey) {
  const key = safeTrim(timeOfDayKey).toLowerCase();
  if (key && TIME_OF_DAY_HINTS[key]) {
    return TIME_OF_DAY_HINTS[key];
  }
  // Soft default if not provided
  return "Neutral, even lighting suitable for printing, with gentle shadows and clear visibility of architectural details";
}

/**
 * Build the final structured prompt for an art scene.
 * One image = one landmark scene.
 */
function buildArtScenePrompt({
  country,
  landmarkIndex,
  compositionKey,
  timeOfDay,
}) {
  const countryKey = normalizeCountryKey(country);
  const sceneSentence = pickLandmarkScene(countryKey, landmarkIndex);
  const compositionSentence = getCompositionSentence(compositionKey);
  const timeSentence = getTimeOfDaySentence(timeOfDay);

  // Structured, sentence-based prompt
  const parts = [
    // 1) Scene layout / subject
    `A single, cohesive architectural scene featuring: ${sceneSentence}.`,

    // 2) Composition / camera framing
    `${compositionSentence}.`,

    // 3) Time of day / mood
    `${timeSentence}.`,

    // 4) Global brand style + safety rules
    `${BASE_STYLE}.`,
  ];

  return parts.join(" ");
}

/**
 * Build name card prompt (legacy) – in practice your UI uses canvas,
 * but we keep this here for compatibility if designType === "nameCard"
 * ever comes through.
 */
function buildNameCardPrompt(arabicName) {
  const name = safeTrim(arabicName) || "اسم";
  return [
    `Refined Arabic Thuluth style calligraphy of the name "${name}".`,
    "Thin, flowing strokes on a perfectly solid background.",
    "Render the provided Arabic text exactly as given, with no changes to letters or spelling.",
    "Centered composition with generous margins around the lettering.",
    "Balanced and symmetrical layout, no cropping of any strokes.",
    "Flat 2D digital artwork, no gradients, no textures, no 3D, no glow.",
    "No English letters, no Latin script, no numbers.",
    "No extra symbols, no decorative borders, no additional words.",
    "High resolution square image suitable for printing on tote bags.",
  ].join(" ");
}

/* ---------------------------------------
  GEMINI IMAGE GENERATION (Nano Banana)
--------------------------------------- */

/**
 * Generate ONE image with Gemini for a given prompt
 * and return it as a data URL string.
 */
async function generateWithGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const modelName = "gemini-2.5-flash-image";



  const response = await ai.models.generateContent({
    model: modelName,
    contents: [prompt],
    config: {
      responseModalities: ["IMAGE"],
    },
  });

  for (const candidate of response.candidates ?? []) {
    const parts = candidate.content?.parts ?? [];
    for (const part of parts) {
      const inline = part.inlineData || part.inline_data;
      if (inline?.data) {
        return `data:image/png;base64,${inline.data}`;
      }
    }
  }

  throw new Error("Gemini returned no image parts");
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

  // How many previews we try to produce for art scenes
  const previewCount =
    typeof body?.previewCount === "number"
      ? Math.max(1, Math.min(body.previewCount, 3))
      : designType === "nameCard"
      ? 1
      : 3;

  try {
    /* ---------------------------------------
       NAME CARD (legacy path)
       Your UI currently uses canvas for name cards,
       but we keep this for compatibility.
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
      const img = await generateWithGemini(prompt);

      return NextResponse.json({
        images: [img],
        provider: "gemini",
      });
    }

    /* ---------------------------------------
       ART SCENES — Country + Composition Type + Time of Day
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
    const timeOfDay = safeTrim(body?.timeOfDay);

    // Backward compatibility:
    // - page.js currently sends "theme"
    // - future version will send "composition" or "compositionType"
    const compositionKey =
      safeTrim(body?.composition) ||
      safeTrim(body?.compositionType) ||
      safeTrim(body?.theme);

    if (!timeOfDay) {
      return NextResponse.json(
        { error: "Time of day is required for art scene designs." },
        { status: 400 }
      );
    }

    const images = [];

    // Generate up to previewCount images; each one uses a different
    // landmark index so you get distinct scenes per country.
    for (let i = 0; i < previewCount; i++) {
      const prompt = buildArtScenePrompt({
        country,
        landmarkIndex: i,
        compositionKey,
        timeOfDay,
      });

      const img = await generateWithGemini(prompt);
      images.push(img);
    }

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
