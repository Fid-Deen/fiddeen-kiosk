// app/api/generate/route.js

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { FormData as UndiciFormData } from "undici";

/** ──────────────────────────────────────────────────────────────────────────
 * Country → motif/palette text fragments (artisan, pre-modern cues, symbols)
 * Keep these short but material-rich. No readable text anywhere.
 * You can extend this list anytime.
 * ────────────────────────────────────────────────────────────────────────── */
const COUNTRY_MOTIFS = {
  morocco:
    "Fez zellij in earth tones, hand-cut geometric tiles, tadelakt lime plaster, carved cedar mashrabiyya, brass lanterns with candlelight, terracotta planters, turquoise accents, narrow riad courtyard proportions, pre-1950 craftsmanship, no glass panels, no LEDs",
  egypt:
    "Fatimid and Mamluk arches, stone muqarnas, mashrabiyya screens, Nile palm fronds, warm limestone and sandstone, turquoise inlays, late-afternoon amber light, historic Cairo courtyard character, pre-modern craft, no chrome, no neon",
  turkey:
    "Ottoman arcades and domes, Iznik tilework in cobalt and turquoise, tulip and cintamani motifs, stone fountain, aged walnut doors, moonlit courtyard reflections, artisan glaze irregularities",
  iran:
    "Safavid iwans, intricate girih patterns, haft-rangi tiles, turquoise and lapis domes, chahar bagh water rills, Persian garden cypress silhouettes, soft dawn light, traditional kiln glaze",
  pakistan:
    "Mughal red sandstone and white marble inlay, charbagh channels, pietra dura floral medallions, jali screens, Kashmiri papier-mâché floral accents, hand-painted look, warm dusk",
  saudi:
    "Hijazi mashrabiya lattice, Najdi carved doors, date palms, coral stone texture, desert courtyard walls, calm night desert blues, oil-lamp warmth, historical materials",
  uae:
    "barajeel wind towers, gypsum and coral stone, coastal courtyard planters, pearl-sand palette with teal hints, calm water reflections, pre-oil era craft detailing",
  jordan:
    "Levantine stone arches, olive wood accents, desert limestone blocks, wadi canyon tones, sage green and sky blue palette, gentle dusk, hand-carved stone textures",
  palestine:
    "old-city hewn stone courtyard, olive tree centerpiece and olive branches worked into the ornament, hand-loom keffiyeh chevron pattern used subtly as geometric border, Mediterranean light, olive-green and sea-blue palette, artisan chisel marks, no modern materials",
  indonesia:
    "tropical courtyard with layered roof silhouettes, batik-inspired floral arabesques, teak wood lattice, jade and deep blue with gold leaf accents, humid garden air, hand-dyed fabric feel",
};

/** Theme → style guidance (handcrafted media + subtle imperfections) */
const THEME_STYLES = {
  traditional:
    "hand-crafted fine-art illustration, museum-grade craft, natural patina, subtle imperfections, paper texture visible",
  geometric:
    "hand-set geometric arabesque, interlaced star polygons and tessellation, carved plaster and mosaic patterns, artisan precision not computer-perfect",
  floral:
    "illumination motifs inspired by Islamic manuscripts, delicate vines and blossoms as ornament, hand-inked outlines, no legible text",
  nature:
    "serene garden atmosphere, water reflection, palms or olive trees as appropriate, soft natural light, tranquil composition, matte finish",
  calligraphic:
    "calligraphic ornament strokes as abstract swashes only, ink on paper look, integrated as pattern—no readable words",
  minimal:
    "minimal composition, a single elegant arch or dome silhouette with subtle low-contrast patterning, airy negative space, matte paper",
};

/** Era/medium constants to push away from glossy CGI */
const ERA_MEDIUM_LINES = [
  "era: pre-1950 craftsmanship, historically grounded materials",
  "medium: gouache and ink on textured paper, matte finish",
  "natural ambient light, realistic materials, subtle film-grain texture",
];

/** Build positive prompt */
function buildPrompt({ country = "turkey", theme = "traditional" }) {
  const countryText = COUNTRY_MOTIFS[country] || COUNTRY_MOTIFS.turkey;
  const themeText = THEME_STYLES[theme] || THEME_STYLES.traditional;

  return [
    "high-quality hand-crafted illustration for a tote print",
    "Islamic architecture and ornament",
    countryText,
    themeText,
    ...ERA_MEDIUM_LINES,
    "rich yet tasteful color, crisp artisan detail, square composition",
    "no text",
  ].join(", ");
}

/** Negative prompt: remove CGI/AI sheen and modern elements */
function negativePrompt() {
  return [
    "people, person, human, figures, face, portrait, crowd",
    "readable text, typography, slogans, watermark, signature, logo, flags",
    "3d render, cgi, plastic, ultra-gloss, HDR bloom, lens flare, neon, cyberpunk, sci-fi, futuristic",
    "oversaturated, over-sharpened, noisy, blurry, warped geometry, uncanny perspective",
    "digital painting look, airbrush sheen, smooth plastic surfaces, chrome, stainless steel",
    "modern glass curtain walls, LED strips, acrylic, plexiglass",
  ].join(", ");
}

/** One Stability request → data URL */
async function generateOne({ prompt, negative_prompt }) {
  const fd = new UndiciFormData();
  fd.append("prompt", prompt);
  fd.append("negative_prompt", negative_prompt);
  fd.append("model", "sd3.5-large");
  fd.append("output_format", "png");
  // Intentionally omit style_preset to avoid synthetic bias.
  fd.append("cfg_scale", String(7)); // 6–8 gives the prompt more authority
  fd.append("aspect_ratio", "1:1");
  // Optional: set a seed for reproducible A/B tests
  // fd.append("seed", String(123456789));

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

  const arrayBuf = await resp.arrayBuffer();
  const b64 = Buffer.from(new Uint8Array(arrayBuf)).toString("base64");
  return `data:image/png;base64,${b64}`;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      // name purposely ignored for prompt (keeps outputs clean)
      country = "turkey",
      theme = "traditional",
      previewCount = 3,
    } = body || {};

    if (!process.env.STABILITY_API_KEY) {
      return NextResponse.json(
        { error: "Missing STABILITY_API_KEY" },
        { status: 500 }
      );
    }

    const prompt = buildPrompt({ country, theme });
    const neg = negativePrompt();

    const n = Math.max(1, Math.min(Number(previewCount) || 3, 3));
    const tasks = Array.from({ length: n }, () =>
      generateOne({ prompt, negative_prompt: neg })
    );

    const settled = await Promise.allSettled(tasks);
    const images = settled
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);

    if (!images.length) {
      const firstErr =
        settled.find((r) => r.status === "rejected")?.reason?.message ||
        "Image generation failed";
      return NextResponse.json({ error: firstErr }, { status: 502 });
    }

    const jobId = `job_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    return NextResponse.json({ images, jobId }, { status: 200 });
  } catch (err) {
    console.error("generate route error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
