"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/* ---------- Options ---------- */

const THEMES = [
  { value: "peaceful", label: "Peaceful" },
  { value: "islamic", label: "Islamic" },
  { value: "nature", label: "Nature" },
  { value: "city_vibrant", label: "City / Vibrant" },
];

const COUNTRIES = [
  { value: "", label: "— No country (skip) —" }, // optional
  { value: "morocco", label: "Morocco" },
  { value: "egypt", label: "Egypt" },
  { value: "turkey", label: "Turkey (Anatolia)" },
  { value: "iran", label: "Iran (Persia)" },
  { value: "pakistan", label: "Pakistan (Mughal)" },
  { value: "saudi", label: "Saudi / Hejaz" },
  { value: "uae", label: "UAE" },
  { value: "jordan", label: "Jordan / Levant" },
  { value: "palestine", label: "Palestine" },
  { value: "indonesia", label: "Indonesia" },
];

const TIME_OF_DAY = [
  { value: "daytime", label: "Daytime" },
  { value: "nighttime", label: "Nighttime" },
];

const BAG_COLORS = [
  { value: "beige", label: "Beige" },
  { value: "black", label: "Black" },
];

const BAG_TYPES = [
  { value: "regular", label: "Regular" },
  { value: "zipper", label: "Zipper" },
];

const FONT_COLORS = [
  { value: "white", label: "White" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
];

/**
 * Language / script config for name cards.
 * Font family names must match @font-face declarations in app_globals.css.
 * For languages where you want auto transliteration, useTransliteration = true.
 */
const LANGUAGE_CONFIG = {
  arabic: {
    value: "arabic",
    label: "Arabic",
    fontFamily: "FiddeenScheherazade",
    direction: "rtl",
    useTransliteration: true,
    targetCode: "ar",
  },
  urdu: {
    value: "urdu",
    label: "Urdu",
    fontFamily: "FiddeenUrdu",
    direction: "rtl",
    useTransliteration: true,
    targetCode: "ur",
  },
  bengali: {
    value: "bengali",
    label: "Bengali",
    fontFamily: "FiddeenBengali",
    direction: "ltr",
    useTransliteration: true,
    targetCode: "bn",
  },
  hindi: {
    value: "hindi",
    label: "Hindi (Devanagari)",
    fontFamily: "FiddeenDevanagari",
    direction: "ltr",
    useTransliteration: true,
    targetCode: "hi",
  },
  japanese: {
    value: "japanese",
    label: "Japanese",
    fontFamily: "FiddeenJapanese",
    direction: "ltr",
    useTransliteration: true, // you enabled this
    targetCode: "ja",
  },
  korean: {
    value: "korean",
    label: "Korean",
    fontFamily: "FiddeenKorean",
    direction: "ltr",
    useTransliteration: true, // you enabled this
    targetCode: "ko",
  },
  zh_hans: {
    value: "zh_hans",
    label: "Chinese (Simplified)",
    fontFamily: "FiddeenChineseSimplified",
    direction: "ltr",
    useTransliteration: true, // you enabled this
    targetCode: "zh-CN",
  },
  zh_hant: {
    value: "zh_hant",
    label: "Chinese (Traditional)",
    fontFamily: "FiddeenChineseTraditional",
    direction: "ltr",
    useTransliteration: true, // you enabled this
    targetCode: "zh-TW",
  },
};

/* ---------- Styles ---------- */

const pageBg = {
  background:
    "linear-gradient(180deg, rgba(244,247,250,1) 0%, rgba(250,251,253,1) 60%)",
  minHeight: "100vh",
};

const shell = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "40px 20px 80px",
  color: "#1b1f24",
};

const card = {
  background: "#ffffff",
  border: "1px solid #e9eef5",
  borderRadius: 24,
  boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
};

const labelStyle = {
  fontWeight: 600,
  marginBottom: 8,
  display: "block",
};

const reqBadge = (
  <span style={{ fontWeight: 600, color: "#b00020", marginLeft: 6 }}>*</span>
);

const inputBase = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d4dbe6",
  background: "#fff",
  fontSize: 16,
  color: "#131722",
  outline: "none",
};

const selectStyle = {
  ...inputBase,
  appearance: "none",
  backgroundClip: "padding-box",
};

const primaryBtn = (enabled = true) => ({
  background: enabled
    ? "linear-gradient(135deg,#121a26 0%,#1f2937 100%)"
    : "#b9c2d0",
  color: "#fff",
  padding: "14px 18px",
  borderRadius: 12,
  border: "none",
  fontSize: 16,
  fontWeight: 700,
  cursor: enabled ? "pointer" : "not-allowed",
  boxShadow: enabled ? "0 6px 14px rgba(17,24,39,0.20)" : "none",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
});

const secondaryBtn = {
  background: "#fff",
  color: "#1b1f24",
  padding: "14px 18px",
  borderRadius: 12,
  border: "1px solid #d4dbe6",
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
};

/* ---------- Helpers ---------- */

function getFontColorHex(color) {
  if (color === "white") return "#FFFFFF";
  if (color === "silver") return "#D8D8D8";
  if (color === "gold") return "#D4AF37";
  return "#FFFFFF";
}

/**
 * Render name on a black background using canvas.
 * Returns a PNG data URL string.
 */
async function renderNameCardToDataUrl(arabicName, fontColor, langConfig) {
  const text = (arabicName || "").trim();
  if (!text) return null;
  if (typeof document === "undefined") return null;

  // FONT + DIRECTION
  const fontFamily = langConfig?.fontFamily || "FiddeenScheherazade";
  const direction = langConfig?.direction === "ltr" ? "ltr" : "rtl";

  // SPLIT INTO 1–3 LINES
  const words = text.split(/\s+/);
  let lines = [];
  if (words.length === 1) {
    lines = [text];
  } else if (words.length === 2) {
    lines = [words[0], words[1]];
  } else {
    const first = words[0];
    const last = words[words.length - 1];
    const middle = words.slice(1, words.length - 1).join(" ");
    lines = [first, middle, last];
  }

  const canvasSize = 1600;
  const padding = 100; // Top, bottom, left, right safe zone
  const usableWidth = canvasSize - padding * 2;
  const usableHeight = canvasSize - padding * 2;

  // CANVAS
  const canvas = document.createElement("canvas");
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext("2d");

  // BG
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // TEXT ALIGNMENT
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  try { ctx.direction = direction; } catch {}

  // OUTLINE + FILL COLORS
  const fillColor = getFontColorHex(fontColor);
  const outlineColor = "#000000"; // Cricut-safe outline

  // LOAD FONT LARGE FOR MEASUREMENT
  try {
    if (document.fonts && document.fonts.load) {
      await document.fonts.load(`400 520px "${fontFamily}"`);
    }
  } catch {}

  // ==== FIND CONSISTENT FONT SIZE ====
  // Try a large size, shrink until BOTH width and height fit.
  let fontSize = 520;
  const minFont = 120;

  while (fontSize > minFont) {
    ctx.font = `400 ${fontSize}px "${fontFamily}"`;

    // Measure each line width
    const widths = lines.map(line => ctx.measureText(line).width);
    const maxLineWidth = Math.max(...widths);

    // Compute total height
    const totalHeight = lines.length * fontSize * 1.25;

    if (maxLineWidth <= usableWidth && totalHeight <= usableHeight) {
      break;
    }

    fontSize -= 10;
  }

  // ==== DRAW LINES ====
  const totalHeight = lines.length * fontSize * 1.25;
  let startY = (canvasSize - totalHeight) / 2 + fontSize / 2;

  ctx.lineWidth = Math.max(fontSize * 0.06, 6); // auto outline thickness

  for (const line of lines) {
    ctx.font = `400 ${fontSize}px "${fontFamily}"`;
    ctx.strokeStyle = outlineColor;
    ctx.strokeText(line, canvasSize / 2, startY);
    ctx.fillStyle = fillColor;
    ctx.fillText(line, canvasSize / 2, startY);

    startY += fontSize * 1.25; // move down for next line
  }

  return canvas.toDataURL("image/png");
}


/* ---------- Page ---------- */

export default function Page() {
  /* design mode */
  const [designType, setDesignType] = useState("nameCard"); // "art" | "nameCard"

  /* form */
  const [name, setName] = useState(""); // Purchaser name (order label, internal only)
  const [englishName, setEnglishName] = useState(""); // Name for tote bag (typed in English)
  const [arabicName, setArabicName] = useState(""); // Name for print (Preview / final script)
  const [preferredScript, setPreferredScript] = useState("arabic");
  const [country, setCountry] = useState("");
  const [theme, setTheme] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [bagColor, setBagColor] = useState("beige");
  const [bagType, setBagType] = useState("regular");
  const [fontColor, setFontColor] = useState("white");

  /* generation */
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChoosing, setIsChoosing] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [previews, setPreviews] = useState([]); // string[] data URLs
  const [chosenIndex, setChosenIndex] = useState(null);
  const [s3Url, setS3Url] = useState("");
  const [jobId, setJobId] = useState("");

  /* transliteration state */
  const [isTransliterating, setIsTransliterating] = useState(false);
  const [previewTouched, setPreviewTouched] = useState(false);

  const selectedLanguageConfig = useMemo(
    () => LANGUAGE_CONFIG[preferredScript] || LANGUAGE_CONFIG.arabic,
    [preferredScript]
  );

  /* computed flags */
  const hasRequired = useMemo(() => {
    if (designType === "art") {
      return name.trim().length > 0 && !!timeOfDay;
    }
    return name.trim().length > 0 && arabicName.trim().length > 0;
  }, [designType, name, timeOfDay, arabicName]);

  const canGenerate = useMemo(
    () =>
      hasRequired &&
      !isGenerating &&
      !isChoosing &&
      previews.length === 0 &&
      !s3Url,
    [hasRequired, isGenerating, isChoosing, previews.length, s3Url]
  );

  const canChoose = useMemo(
    () =>
      previews.length > 0 &&
      chosenIndex !== null &&
      !isChoosing &&
      !s3Url &&
      !isGenerating,
    [previews.length, chosenIndex, isChoosing, s3Url, isGenerating]
  );

  const resetAll = useCallback(() => {
    setIsGenerating(false);
    setIsChoosing(false);
    setGenerateError("");
    setPreviews([]);
    setChosenIndex(null);
    setS3Url("");
    setJobId("");
  }, []);

  /* ---------- transliteration effect ---------- */

  useEffect(() => {
    if (designType !== "nameCard") return;

    const trimmedName = englishName.trim();
    const cfg = selectedLanguageConfig;

    if (!trimmedName) return;
    if (!cfg || !cfg.useTransliteration) return;
    if (previewTouched) return;

    let cancelled = false;
    const controller = new AbortController();

    const timeoutId = setTimeout(async () => {
      try {
        setIsTransliterating(true);

        const res = await fetch("/api/transliterate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            targetLanguage: cfg.targetCode || cfg.value,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Transliteration failed");
        }

        const data = await res.json();

        if (!cancelled && data && typeof data.text === "string") {
          setArabicName(data.text);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Transliteration error:", err);
        }
      } finally {
        if (!cancelled) {
          setIsTransliterating(false);
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [designType, englishName, selectedLanguageConfig, previewTouched]);

  /* ---------- handlers ---------- */

  async function handleGenerate(e) {
    e.preventDefault();

    if (!canGenerate) {
      if (!hasRequired) {
        setGenerateError(
          designType === "art"
            ? "Please fill Name and Time of Day before generating."
            : "Please fill both Purchaser Name and Name For Print (Preview) before generating."
        );
      }
      return;
    }

    setIsGenerating(true);
    setGenerateError("");

    try {
      if (designType === "nameCard") {
        const dataUrl = await renderNameCardToDataUrl(
          arabicName,
          fontColor,
          selectedLanguageConfig
        );
        if (!dataUrl) {
          throw new Error("Could not render name card image.");
        }
        setPreviews([dataUrl]);
        setChosenIndex(0);
      } else {
        const payload = {
          name: name.trim(),
          designType,
          country: country || undefined,
          theme: theme || undefined,
          timeOfDay,
          bagColor,
          bagType,
          previewCount: 3,
          deferUpload: true,
        };

        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to generate previews");
        }

        const data = await res.json();
        if (!data?.images?.length) {
          throw new Error("No previews returned");
        }

        setPreviews(data.images);
        setChosenIndex(0);
      }
    } catch (err) {
      console.error(err);
      setGenerateError(
        err?.message ||
          "Something went wrong while generating. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleChoose() {
    if (!canChoose) return;

    setIsChoosing(true);
    setGenerateError("");

    try {
      const imageDataUrl = previews[chosenIndex];

      const res = await fetch("/api/generate/choose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl,
          meta: {
            name: name.trim(),
            arabicName:
              designType === "nameCard"
                ? arabicName.trim() || undefined
                : undefined,
            designType,
            country: designType === "art" ? country : undefined,
            theme: designType === "art" ? theme : undefined,
            timeOfDay: designType === "art" ? timeOfDay : undefined,
            bagColor,
            bagType: designType === "art" ? bagType : undefined,
            fontColor: designType === "nameCard" ? fontColor : undefined,
          },
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to save chosen image");
      }

      const data = await res.json();
      if (!data?.s3Url) {
        throw new Error("No S3 URL returned");
      }

      setS3Url(data.s3Url);
      if (data.jobId) setJobId(data.jobId);
    } catch (err) {
      console.error(err);
      setGenerateError(
        err?.message || "Something went wrong while saving. Please try again."
      );
      setIsChoosing(false);
    }
  }

  /* ---------- UI ---------- */

  return (
    <div style={pageBg}>
      <div style={shell}>
        <header style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>
           Fid Deen Custom Calligraphy Studio
          </h1>
          <p style={{ marginTop: 8, color: "#4a5568" }}>
          Create Your Personalized Tote Bag Name Design With Precision And Elegance.
          </p>
        </header>

        {/* FORM CARD */}
        <form onSubmit={handleGenerate} style={{ ...card, padding: 20 }}>
          {/* Design Type toggle */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Design Type</label>
            <div
              style={{
                display: "inline-flex",
                padding: 4,
                borderRadius: 999,
                background: "#f3f4f6",
                gap: 4,
              }}
            >
              {/* Hide Art scene button */}
              {/*
              <button
                type="button"
                onClick={() => {
                  setDesignType("art");
                  setPreviews([]);
                  setS3Url("");
                  setChosenIndex(null);
                  setGenerateError("");
                }}
                style={{
                  border: "none",
                  borderRadius: 999,
                  padding: "6px 14px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: designType === "art" ? "#fff" : "transparent",
                  boxShadow:
                    designType === "art"
                      ? "0 1px 4px rgba(15,23,42,0.18)"
                      : "none",
                }}
              >
                Art scene
              </button>
              */}
                {/* leave the Name card button EXACTLY as it is below */}
              <button
                type="button"
                onClick={() => {
                  setDesignType("nameCard");
                  setPreviews([]);
                  setS3Url("");
                  setChosenIndex(null);
                  setGenerateError("");
                }}
                style={{
                  border: "none",
                  borderRadius: 999,
                  padding: "6px 14px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  background:
                    designType === "nameCard" ? "#fff" : "transparent",
                  boxShadow:
                    designType === "nameCard"
                      ? "0 1px 4px rgba(15,23,42,0.18)"
                      : "none",
                }}
              >
                Name card
              </button>
            </div>
          </div>

          {/* Art scene fields */}
          {designType === "art" && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr 1fr",
                  gap: 16,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label style={labelStyle}>
                    Name (for order label) {reqBadge}
                  </label>
                  <input
                    style={inputBase}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Bilal"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Country</label>
                  <select
                    style={selectStyle}
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Theme</label>
                  <select
                    style={selectStyle}
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                  >
                    <option value="">— Select a theme —</option>
                    {THEMES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 10,
                }}
              >
                <div>
                  <label style={labelStyle}>
                    Time of Day {reqBadge}
                  </label>
                  <select
                    style={selectStyle}
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value)}
                  >
                    <option value="">— Select —</option>
                    {TIME_OF_DAY.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Name card fields – reordered as you requested */}
          {designType === "nameCard" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 14,
              }}
            >
              {/* LEFT COLUMN */}
              <div>
                <label style={labelStyle}>
                  Purchaser Name (Order Label) {reqBadge}
                </label>
                <input
                  style={inputBase}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Bilal"
                />

                <div style={{ marginTop: 10 }}>
                  <label style={labelStyle}>
                    Name For Tote Bag (Type in English)
                  </label>
                  <input
                    style={inputBase}
                    value={englishName}
                    onChange={(e) => {
                      setEnglishName(e.target.value);
                      setPreviewTouched(false);
                    }}
                    placeholder="e.g., Bilal"
                  />
                </div>

                <div style={{ marginTop: 10 }}>
                  <label style={labelStyle}>Font Color</label>
                  <select
                    style={selectStyle}
                    value={fontColor}
                    onChange={(e) => setFontColor(e.target.value)}
                  >
                    {FONT_COLORS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginTop: 10 }}>
                  <label style={labelStyle}>Preferred Script / Language</label>
                  <select
                    style={selectStyle}
                    value={preferredScript}
                    onChange={(e) => {
                      setPreferredScript(e.target.value);
                      setPreviewTouched(false);
                    }}
                  >
                    {Object.values(LANGUAGE_CONFIG).map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                  {isTransliterating && (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: "#6b7280",
                      }}
                    >
                      Generating script…
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div>
                <label style={labelStyle}>
                  Name For Print (Preview) {reqBadge}
                </label>
                <input
                  style={inputBase}
                  value={arabicName}
                  onChange={(e) => {
                    setArabicName(e.target.value);
                    setPreviewTouched(true);
                  }}
                  placeholder="Preview text in final script"
                />
              </div>
            </div>
          )}

          {/* Bag options row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 10,
            }}
          >
            

            <div>
              {designType === "art" ? (
                <>
                  <label style={labelStyle}>Tote Bag Type</label>
                  <select
                    style={selectStyle}
                    value={bagType}
                    onChange={(e) => setBagType(e.target.value)}
                  >
                    {BAG_TYPES.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                // In nameCard mode we no longer show anything here;
                // we left this column empty to avoid changing the broader layout.
                <div />
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
            <button
              type="submit"
              style={primaryBtn(canGenerate)}
              disabled={!canGenerate}
            >
              {isGenerating
                ? "Generating…"
                : designType === "art"
                ? "Generate 3 Options"
                : "Generate Name Card"}
            </button>
            <button
              type="button"
              onClick={resetAll}
              style={secondaryBtn}
            >
              Reset
            </button>
          </div>

          {generateError && (
            <div
              style={{
                marginTop: 12,
                color: "#b00020",
                fontSize: 14,
                background: "#fff6f6",
                border: "1px solid #ffe0e0",
                padding: "10px 12px",
                borderRadius: 10,
              }}
            >
              {generateError}
            </div>
          )}
        </form>

        {/* PREVIEWS */}
        {previews.length > 0 && !s3Url && (
          <section style={{ ...card, padding: 20, marginTop: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 22 }}>
                {designType === "art"
                  ? "Pick your favorite"
                  : "Preview name card"}
              </h2>
              <div style={{ color: "#6b7280", fontSize: 14 }}>
                {designType === "art"
                  ? "Click a card to select"
                  : "Confirm this name card"}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  designType === "art" ? "repeat(3, 1fr)" : "1fr",
                gap: 20,
              }}
            >
              {previews.map((src, i) => {
                const active = chosenIndex === i;
                return (
                  <div
                    key={i}
                    onClick={() => setChosenIndex(i)}
                    style={{
                      border: active
                        ? "3px solid #0f172a"
                        : "1px solid #e5e7eb",
                      borderRadius: 18,
                      overflow: "hidden",
                      cursor: "pointer",
                      boxShadow: active
                        ? "0 14px 32px rgba(15,23,42,0.30)"
                        : "0 8px 18px rgba(15,23,42,0.10)",
                      transform: active ? "translateY(-2px)" : "none",
                      transition:
                        "box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease",
                      background: "#000",
                    }}
                  >
                    <img
                      src={src}
                      alt={
                        designType === "art"
                          ? `Generated tote design ${i + 1}`
                          : "Generated name card"
                      }
                      style={{
                        width: "100%",
                        display: "block",
                        aspectRatio: "1 / 1",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={handleChoose}
                disabled={!canChoose}
                style={primaryBtn(canChoose)}
              >
                {isChoosing ? "Saving…" : "Approve & Upload"}
              </button>
              {chosenIndex !== null && (
                <div style={{ fontSize: 14, color: "#6b7280" }}>
                  Selected option {chosenIndex + 1}
                </div>
              )}
            </div>
          </section>
        )}

        {/* SUCCESS STATE */}
        {s3Url && (
          <section style={{ ...card, padding: 20, marginTop: 18 }}>
            <h2 style={{ margin: 0, fontSize: 22, marginBottom: 8 }}>
              Design saved to S3
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: "#4b5563" }}>
              You can now open the image from S3 and send it to the Cricut /
              printer workflow.
            </p>
            <div style={{ marginTop: 12 }}>
              <a
                href={s3Url}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#1d4ed8",
                  textDecoration: "underline",
                  fontSize: 14,
                }}
              >
                Open image in new tab
              </a>
            </div>
            {jobId && (
              <p style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
                Job ID: {jobId}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
