// app/api/generate/route.js

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { FormData as UndiciFormData } from "undici";
import OpenAI from "openai";

import {
  COUNTRY_LANDMARKS,
  THEME_DESCRIPTIONS,
  DEFAULT_MODEL,
  DEFAULT_STYLE_PRESET,
  DEFAULT_CFG_SCALE,
  DEFAULT_ASPECT_RATIO,
} from "./constants.js";

// ---------- OpenAI client (optional) ----------
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ---------- Prompt helpers ----------
function basePrompt() {
  return [
    "High-quality Islamic-inspired artwork for a tote design.",
    "Traditional, heritage craft; oil-painting texture; soft, natural light.",
    "Square composition; clean margins; print-ready clarity.",
    "Absolutely no people, faces, hands, or readable text.",
  ].join(" ");
}

function themeText(theme) {
  if (!theme) return "";
  const t = THEME_DESCRIPTIONS?.[theme] || "";
  return t ? ` ${t}` : "";
}

function timeOfDayText(timeOfDay) {
  if (!timeOfDay) return "";
  const map = {
    Dawn: "pre-dawn cool light, gentle mist, subtle glow",
    Sunrise: "golden sunrise light, long soft shadows",
    Daytime: "balanced daylight, soft sky, gentle contrast",
    Sunset: "warm sunset glow, amber rim light, calm atmosphere",
    Night: "moonlit night, soft lanterns, serene blues",
  };
  const t = map[timeOfDay] || "";
  return t ? ` ${t}` : "";
}

function pickCountryVariants(country, k = 3) {
  const key = (country || "").toLowerCase();
  const pool =
    COUNTRY_LANDMARKS?.[key] ||
    COUNTRY_LANDMARKS?.default || [
      "Traditional Islamic ornament. No people, no text.",
    ];

  const idx = [...Array(pool.length).keys()];
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const out = [];
  for (let i = 0; i < k; i++) out.push(pool[idx[i % pool.length]]);
  return out;
}

// ---------- Providers ----------
async function generateWithStability({
  prompt,
  model = DEFAULT_MODEL || "sd3.5-large",
  style_preset = DEFAULT_STYLE_PRESET || "analog-film",
  cfg_scale = DEFAULT_CFG_SCALE ?? 4,
  aspect_ratio = DEFAULT_ASPECT_RATIO || "1:1",
}) {
  if (!process.env.STABILITY_API_KEY) throw new Error("Missing STABILITY_API_KEY");

  const fd = new UndiciFormData();
  fd.append("model", model);
  fd.append("prompt", prompt);
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
    throw new Error(msg || "Stability API error");
  }

  const buf = await resp.arrayBuffer();
  const b64 = Buffer.from(new Uint8Array(buf)).toString("base64");
  return `data:image/png;base64,${b64}`;
}

// OpenAI: handle both b64_json and url
async function generateWithOpenAI({ prompt, size = "1024x1024" }) {
  if (!openai) throw new Error("Missing OPENAI_API_KEY");

  const r = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size,
  });

  const item = r?.data?.[0];
  if (!item) throw new Error("OpenAI returned no data");

  if (item.b64_json) {
    return `data:image/png;base64,${item.b64_json}`;
  }

  if (item.url) {
    const imgResp = await fetch(item.url);
    if (!imgResp.ok) throw new Error("Failed to fetch OpenAI image URL");
    const buf = await imgResp.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    return `data:image/png;base64,${b64}`;
  }

  throw new Error("OpenAI returned neither b64_json nor url");
}

function logOpenAIError(label, err) {
  const info = {
    label,
    message: err?.message,
    status: err?.status,
    code: err?.code,
  };
  try {
    info.body = err?.response ? JSON.stringify(err.response.data) : undefined;
  } catch {}
  console.error("OpenAI image error:", info);
}

// ---------- POST /api/generate ----------
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      name = "",
      country = "morocco", 
      theme = "", // Optional Now
      timeOfDay = "Daytime",
      previewCount = 3,
      model = DEFAULT_MODEL || "sd3.5-large",
      style_preset = DEFAULT_STYLE_PRESET || "analog-film",
    } = body || {};

    const need = Math.max(1, Math.min(Number(previewCount) || 3, 3));
    const variants = pickCountryVariants(country, need);

    const base = basePrompt();
    const prompts = variants.map(
      (motif) =>
        `${base} ${motif}${themeText(theme)}${timeOfDayText(timeOfDay)}. Ultra-detailed materials; natural palettes; soft cinematic light.`
    );

    // 1 Stability + 2 OpenAI (fallback to Stability for any failures)
    const tasks = [];

    if (process.env.STABILITY_API_KEY) {
      tasks.push(
        generateWithStability({ prompt: prompts[0], model, style_preset })
      );
    }

    if (openai) {
      const p1 = prompts[1] || prompts[0];
      const p2 = prompts[2] || prompts[0];
      tasks.push(
        (async () => {
          try {
            return await generateWithOpenAI({ prompt: p1 });
          } catch (e) {
            logOpenAIError("openai-1", e);
            throw e;
          }
        })()
      );
      tasks.push(
        (async () => {
          try {
            return await generateWithOpenAI({ prompt: p2 });
          } catch (e) {
            logOpenAIError("openai-2", e);
            throw e;
          }
        })()
      );
    }

    // If OpenAI is not configured, fill remaining slots with Stability
    while (tasks.length < need && process.env.STABILITY_API_KEY) {
      const p = prompts[tasks.length] || prompts[0];
      tasks.push(generateWithStability({ prompt: p, model, style_preset }));
    }

    if (tasks.length === 0) {
      return NextResponse.json(
        { error: "No providers available (check API keys)" },
        { status: 500 }
      );
    }

    const settled = await Promise.allSettled(tasks);
    let images = settled
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);

    // Top up to `need` with Stability if any failed
    while (images.length < need && process.env.STABILITY_API_KEY) {
      try {
        const p = prompts[images.length] || prompts[0];
        const img = await generateWithStability({ prompt: p, model, style_preset });
        images.push(img);
      } catch {
        break;
      }
    }

    if (images.length === 0) {
      const firstErr =
        settled.find((r) => r.status === "rejected")?.reason?.message ||
        "Image generation failed";
      return NextResponse.json({ error: firstErr }, { status: 502 });
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return NextResponse.json({ images, jobId }, { status: 200 });
  } catch (err) {
    console.error("Generate route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
