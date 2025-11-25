"use client";

import { useCallback, useMemo, useState } from "react";

/* ---------- UI choices ---------- */

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

const label = { fontWeight: 600, marginBottom: 8, display: "block" };

const reqBadge = (
  <span style={{ fontWeight: 600, color: "#b00020", marginLeft: 6 }}>*</span>
);

const input = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d4dbe6",
  background: "#fff",
  fontSize: 16,
  color: "#131722",
  outline: "none",
};

const select = { ...input, appearance: "none", backgroundClip: "padding-box" };

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

/* ---------- Page ---------- */

export default function Page() {
  /* design mode */
  const [designType, setDesignType] = useState("art"); // "art" | "nameCard"

  /* form */
  const [name, setName] = useState(""); // English label, always used
  const [arabicName, setArabicName] = useState(""); // only for nameCard
  const [country, setCountry] = useState("");
  const [theme, setTheme] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [bagColor, setBagColor] = useState("beige");
  const [bagType, setBagType] = useState("regular");

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
      return name.trim().length > 0 && timeOfDay;
    }
    // nameCard mode
    return (
      name.trim().length > 0 &&
      arabicName.trim().length > 0
    );
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
    // keep form values so you can tweak and regenerate
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
      const payload = {
        name: name.trim(), // label only, never embedded in the art
        designType,
        country: designType === "art" ? country || undefined : undefined,
        theme: designType === "art" ? theme || undefined : undefined,
        timeOfDay: designType === "art" ? timeOfDay : undefined,
        arabicName:
          designType === "nameCard" ? arabicName.trim() || undefined : undefined,
        bagColor,
        bagType,
        previewCount: designType === "art" ? 3 : 1,
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
      if (!data?.images?.length) throw new Error("No previews returned");

      setPreviews(data.images);
      setChosenIndex(0); // auto select first
    } catch (err) {
      console.error(err);
      setGenerateError(
        err?.message || "Something went wrong while generating. Please try again."
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
            bagType,
          },
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to save chosen image");
      }

      const data = await res.json();
      if (!data?.s3Url) throw new Error("No S3 URL returned");

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
            Fid Deen Custom Tote Generator
          </h1>
          <p style={{ marginTop: 8, color: "#4a5568" }}>
            Choose your design type, generate a preview, and save the final tote art.
          </p>
        </header>

        {/* FORM CARD */}
        <form onSubmit={handleGenerate} style={{ ...card, padding: 20 }}>
          {/* Design Type toggle */}
          <div style={{ marginBottom: 20 }}>
            <label style={label}>Design Type</label>
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
                onClick={() => setDesignType("art")}
                style={{
                  border: "none",
                  borderRadius: 999,
                  padding: "6px 14px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  background:
                    designType === "art" ? "#fff" : "transparent",
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
                onClick={() => setDesignType("nameCard")}
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

          {/* Main row: name + art settings */}
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
                  <label style={label}>
                    Name (for order label)
                    {reqBadge}
                  </label>
                  <input
                    style={input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Bilal"
                  />
                </div>

                <div>
                  <label style={label}>Country</label>
                  <select
                    style={select}
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
                  <label style={label}>Theme</label>
                  <select
                    style={select}
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
                  <label style={label}>
                    Time of Day
                    {reqBadge}
                  </label>
                  <select
                    style={select}
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

          {/* Name-card mode fields */}
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
                <label style={label}>
                  English name (for order label)
                  {reqBadge}
                </label>
                <input
                  style={input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Bilal"
                />
              </div>
              <div>
                <label style={label}>
                  Arabic name (for print)
                  {reqBadge}
                </label>
                <input
                  style={input}
                  value={arabicName}
                  onChange={(e) => setArabicName(e.target.value)}
                  placeholder="e.g., بلال"
                />
              </div>
            </div>
          )}

          {/* Bag options row (meta only, same for both modes) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 10,
            }}
          >
            <div>
              <label style={label}>Tote Bag Color</label>
              <select
                style={select}
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
              <label style={label}>Tote Bag Type</label>
              <select
                style={select}
                value={bagType}
                onChange={(e) => setBagType(e.target.value)}
              >
                {BAG_TYPES.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
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
                        : "1px solid #e2e8f0",
                      borderRadius: 16,
                      padding: 12,
                      background: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "#f9fafb",
                        padding: 8,
                      }}
                    >
                      <img
                        src={src}
                        alt={`Preview ${i + 1}`}
                        style={{
                          width: "100%",
                          display: "block",
                          borderRadius: 10,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 14,
                        color: "#4b5563",
                      }}
                    >
                      <span>
                        Option {i + 1}
                        {active ? " (selected)" : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={handleChoose}
                style={primaryBtn(canChoose)}
                disabled={!canChoose}
              >
                {isChoosing ? "Saving…" : "Confirm and upload"}
              </button>
              <button
                type="button"
                onClick={resetAll}
                style={secondaryBtn}
              >
                Start over
              </button>
            </div>
          </section>
        )}

        {/* FINAL STATE */}
        {s3Url && (
          <section style={{ ...card, padding: 20, marginTop: 18 }}>
            <h2 style={{ marginTop: 0, fontSize: 22 }}>Tote saved</h2>
            <p style={{ color: "#4b5563", marginBottom: 12 }}>
              The chosen design is uploaded to S3 with all order details.
              Use the link below to view or download the image for printing.
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <a
                href={s3Url}
                target="_blank"
                rel="noreferrer"
                style={{
                  ...primaryBtn(true),
                  textDecoration: "none",
                }}
              >
                Open Image
              </a>
              <button
                type="button"
                onClick={resetAll}
                style={secondaryBtn}
              >
                New Tote
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: "#6b7280" }}>
              {designType === "nameCard" && arabicName && (
                <div>
                  Name card for <strong>{name}</strong> (
                  <span dir="rtl" style={{ fontFamily: "inherit" }}>
                    {arabicName}
                  </span>
                  )
                </div>
              )}
              {jobId && (
                <div style={{ marginTop: 4 }}>
                  Internal job id: <code>{jobId}</code>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
