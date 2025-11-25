"use client";

import { useCallback, useMemo, useState } from "react";

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
  if (color === "white") return "#FFFFFF";      // clean bright white
  if (color === "silver") return "#D8D8D8";     // royal silver
  if (color === "gold") return "#D4AF37";       // royal gold
  return "#FFFFFF";
}


/**
 * Render Arabic name on a black background using canvas.
 * Returns a PNG data URL string.
 */

async function renderNameCardToDataUrl(arabicName, fontColor) {
  const text = (arabicName || "").trim();
  if (!text) return null;

  if (typeof document === "undefined") {
    // Should not happen because this is a client component
    return null;
  }

  // Make sure our custom font is loaded before drawing
  try {
    if (document.fonts && document.fonts.load) {
      // same descriptor we will use in ctx.font below
      await document.fonts.load('400 520px "FiddeenScheherazade"');
    }
  } catch (e) {
    console.warn("Could not ensure font load, continuing anyway:", e);
  }

  // Bigger canvas so it prints nicely on a full sheet of paper
  const size = 1600;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background: solid black
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, size, size);

  // Text styling
  ctx.fillStyle = getFontColorHex(fontColor);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Use our Scheherazade New Bold font, big and dramatic
  ctx.font = "400 520px 'FiddeenScheherazade'";

  // Try to force right-to-left layout where supported
  try {
    ctx.direction = "rtl";
  } catch {
    // ignore if not supported
  }

  const x = size / 2;
  // Slightly below mathematical center so it feels visually centered
  const y = size * 0.55;

  ctx.fillText(text, x, y);

  return canvas.toDataURL("image/png");
}

/* ---------- Page ---------- */

export default function Page() {
  /* design mode */
  const [designType, setDesignType] = useState("art"); // "art" | "nameCard"

  /* form */
  const [name, setName] = useState(""); // English label
  const [arabicName, setArabicName] = useState(""); // for nameCard
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

  /* computed flags */

  const hasRequired = useMemo(() => {
    if (designType === "art") {
      return name.trim().length > 0 && !!timeOfDay;
    }
    // nameCard mode
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
    // keep form values so they can tweak and regenerate
  }, []);

  /* ---------- handlers ---------- */

  async function handleGenerate(e) {
    e.preventDefault();

    if (!canGenerate) {
      if (!hasRequired) {
        setGenerateError(
          designType === "art"
            ? "Please fill Name and Time of Day before generating."
            : "Please fill both English Name and Arabic Name before generating."
        );
      }
      return;
    }

    setIsGenerating(true);
    setGenerateError("");

    try {
      if (designType === "nameCard") {
        // Generate locally using canvas
        const dataUrl = await renderNameCardToDataUrl(arabicName, fontColor);
        if (!dataUrl) {
          throw new Error("Could not render name card image.");
        }
        setPreviews([dataUrl]);
        setChosenIndex(0);
      } else {
        // Art scene still uses OpenAI backend
        const payload = {
          name: name.trim(), // label only, not embedded
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
            // for staff reference only
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
        err?.message ||
          "Something went wrong while saving. Please try again."
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
            Fid Deen Custom Tote Generator
          </h1>
          <p style={{ marginTop: 8, color: "#4a5568" }}>
            Choose your design type, generate a preview, and save the final tote
            art.
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

              {/* Time of day row */}
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

          {/* Name card fields */}
          {designType === "nameCard" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 14,
              }}
            >
              <div>
                <label style={labelStyle}>
                  English name (for order label) {reqBadge}
                </label>
                <input
                  style={inputBase}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Bilal"
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Arabic name (for print) {reqBadge}
                </label>
                <input
                  style={inputBase}
                  value={arabicName}
                  onChange={(e) => setArabicName(e.target.value)}
                  placeholder="e.g., بلال"
                />
              </div>
            </div>
          )}

          {/* Bag options row (meta only) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 10,
            }}
          >
            <div>
              <label style={labelStyle}>Tote Bag Color</label>
              <select
                style={selectStyle}
                value={bagColor}
                onChange={(e) => setBagColor(e.target.value)}
              >
                {BAG_COLORS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

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
                <>
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
                </>
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
                {isChoosing ? "Saving…" : "Confirm & upload to S3"}
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
