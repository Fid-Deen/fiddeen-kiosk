"use client";

import { useEffect, useRef, useState } from "react";

const LANGS = ["English", "Arabic", "Urdu", "Turkish", "Indonesian"];
const THEMES = [
  "Spiritual",
  "Mosque Night",
  "Nature Serenity",
  "Palestine",
  "Desert Sunset",
  "Calligraphy",
];

export default function Page() {
  const [name, setName] = useState("Bilal Khan");
  const [lang, setLang] = useState(LANGS[0]);
  const [theme, setTheme] = useState(THEMES[0]);
  const [bagColor, setBagColor] = useState("black"); // "black" | "beige"
  const [loading, setLoading] = useState(false);
  const [mockupUrl, setMockupUrl] = useState("");
  const [lastArtUrl, setLastArtUrl] = useState("");
  const canvasRef = useRef(null);

  // --- Prompt builder tuned for detailed Islamic tote art
  function buildPrompt() {
    const base =
      "highly detailed illustration for a tote bag print, professional product design";
    const islamic =
      "islamic art, elegant arabesque motifs, crescent moon, domes, minarets, patterned tiles, warm cinematic lighting, volumetric light rays";
    const people =
      "modest muslim figures, hijabi women and men in thobes, respectful and dignified, reading Quran or praying, natural poses";
    const nature =
      "lush gardens, date palms, water reflection, moonlit sky, soft bokeh, painterly yet crisp";
    const style =
      "studio quality, SDXL-level detail, rich textures, fine brushwork, realistic fabric print edges, no frame, no watermark";

    let themeLine = "";
    switch (theme) {
      case "Mosque Night":
        themeLine =
          "grand mosque courtyard at night, golden light from the gate, full moon, reflective pool";
        break;
      case "Nature Serenity":
        themeLine = "quiet forest clearing with light rays, prayer rug in foreground";
        break;
      case "Palestine":
        themeLine =
          "gentle hillside of Jerusalem with olive trees and domes, Arabic word 'فلسطين' in tasteful calligraphy";
        break;
      case "Desert Sunset":
        themeLine =
          "golden desert at sunset with palm trees, warm orange haze, prayer rug";
        break;
      case "Calligraphy":
        themeLine =
          "beautiful Arabic calligraphy of the name, intertwined with geometric star patterns";
        break;
      default:
        themeLine = "calm devotional scene with mosque, garden, and moonlight";
    }

    return `${base}. ${islamic}. ${people}. ${nature}. ${style}. Theme: ${themeLine}. Primary name text: "${name}" in ${lang}.`;
  }

  // Negative prompt to keep outputs clean for print
  const negativePrompt =
    "distorted anatomy, extra fingers, text artifacts, logos, watermarks, frame, UI, low-res, blurry, noisy, jpeg artifacts, cut off, duplicate, deformed";

  // Draws a realistic tote mockup (black or beige) and pastes the generated art
  async function drawMockup(artDataUrl) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = 900;
    const H = 1200;
    canvas.width = W;
    canvas.height = H;

    // Background – studio tabletop look
    ctx.fillStyle = "#e9e0d4";
    ctx.fillRect(0, 0, W, H);

    // Helper: rounded rect
    function roundRect(ctx, x, y, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    }

    // Bag colors
    const body = bagColor === "black" ? "#0e0e0f" : "#efe4d1";
    const shadow = bagColor === "black" ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.18)";

    // Drop shadow for bag
    ctx.save();
    ctx.shadowColor = shadow;
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 28;

    // Bag body
    const bagX = 140,
      bagY = 260,
      bagW = W - 280,
      bagH = H - 360;
    roundRect(ctx, bagX, bagY, bagW, bagH, 26);
    ctx.fillStyle = body;
    ctx.fill();

    ctx.restore();

    // Handles
    function handlePath(x, y, w, h, thickness) {
      // outer strap
      roundRect(ctx, x, y, w, h, w / 2);
      ctx.fill();
      // inner cutout
      ctx.globalCompositeOperation = "destination-out";
      roundRect(ctx, x + thickness, y + thickness, w - thickness * 2, h - thickness * 2, (w - thickness * 2) / 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }

    ctx.fillStyle = body;
    // left handle
    handlePath(bagX + 70, 120, 180, 200, 44);
    // right handle
    handlePath(bagX + bagW - 250, 120, 180, 200, 44);

    // Art panel (the “print” area)
    const margin = 60;
    const panelX = bagX + margin;
    const panelY = bagY + margin + 10;
    const panelW = bagW - margin * 2;
    const panelH = bagH - margin * 2 - 20;

    // White mat + subtle inner shadow
    ctx.save();
    ctx.fillStyle = bagColor === "black" ? "#0b0b0b" : "#f7efe1";
    roundRect(ctx, panelX - 14, panelY - 14, panelW + 28, panelH + 28, 20);
    ctx.fill();

    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, panelX, panelY, panelW, panelH, 16);
    ctx.fill();
    ctx.restore();

    // Paste generated art inside panel (letterbox to fit)
    const art = await loadImage(artDataUrl);
    const fit = cover(art.width, art.height, panelW, panelH);
    ctx.drawImage(
      art,
      fit.sx,
      fit.sy,
      fit.sw,
      fit.sh,
      panelX,
      panelY,
      panelW,
      panelH
    );

    // Save data URL to show & download
    const url = canvas.toDataURL("image/png");
    setMockupUrl(url);
  }

  // Utilities
  function loadImage(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });
  }
  // cover algorithm (like CSS background-size: cover)
  function cover(sw, sh, dw, dh) {
    const sRatio = sw / sh;
    const dRatio = dw / dh;
    let sx = 0,
      sy = 0,
      sw2 = sw,
      sh2 = sh;
    if (sRatio > dRatio) {
      // source too wide
      sh2 = sh;
      sw2 = sh * dRatio;
      sx = (sw - sw2) / 2;
    } else {
      // source too tall
      sw2 = sw;
      sh2 = sw / dRatio;
      sy = (sh - sh2) / 2;
    }
    return { sx, sy, sw: sw2, sh: sh2 };
  }

  async function onGenerate() {
    setLoading(true);
    setMockupUrl("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: buildPrompt(),
          negative_prompt: negativePrompt,
          // model & options understood by your existing /api/generate (Stability)
          model: "sd3.5-large",
          output_format: "png",
          style_preset: "cinematic",
          cfg_scale: 4,
          aspect_ratio: "1:1",
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        alert(`Generation failed: ${res.status}\n${txt}`);
        setLoading(false);
        return;
      }

      // Expecting { images: ["data:image/png;base64,..."] }
      const data = await res.json();
      const artDataUrl = data?.images?.[0];
      if (!artDataUrl) {
        alert("No image returned from /api/generate.");
        setLoading(false);
        return;
      }
      setLastArtUrl(artDataUrl);
      await drawMockup(artDataUrl);
    } catch (e) {
      console.error(e);
      alert("Something went wrong generating the image.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-4xl font-semibold tracking-tight mb-8">
        FidDeen Tote Generator
      </h1>

      <div className="space-y-4 mb-6">
        <input
          className="w-full rounded-md border px-4 py-3"
          placeholder="Name for the tote (used in calligraphy)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <select
          className="w-full rounded-md border px-4 py-3"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
        >
          {LANGS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        <select
          className="w-full rounded-md border px-4 py-3"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        >
          {THEMES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <div className="flex gap-3 items-center">
          <span className="text-sm text-gray-600">Tote color:</span>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="bag"
              checked={bagColor === "black"}
              onChange={() => setBagColor("black")}
            />
            <span>Black</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="bag"
              checked={bagColor === "beige"}
              onChange={() => setBagColor("beige")}
            />
            <span>Beige</span>
          </label>
        </div>

        <button
          onClick={onGenerate}
          disabled={loading}
          className="rounded-md bg-black text-white px-5 py-3 hover:bg-gray-900 disabled:opacity-60"
        >
          {loading ? "Generating…" : "Generate Design"}
        </button>
      </div>

      {/* Hidden canvas used to build the mockup */}
      <canvas ref={canvasRef} className="hidden" />

      {mockupUrl && (
        <div className="mt-8 space-y-3">
          <img
            src={mockupUrl}
            alt="Tote mockup"
            className="w-full rounded-lg shadow-lg"
          />
          <div className="flex gap-3">
            <a
              href={mockupUrl}
              download={`fiddeen-tote-${Date.now()}.png`}
              className="rounded-md border px-4 py-2"
            >
              Download mockup
            </a>
            {lastArtUrl && (
              <a
                href={lastArtUrl}
                download={`art-${Date.now()}.png`}
                className="rounded-md border px-4 py-2"
              >
                Download art only
              </a>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
