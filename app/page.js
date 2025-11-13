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

/* ---------- Page ---------- */
export default function Page() {
  /* form */
  const [name, setName] = useState("");                 // required
  const [country, setCountry] = useState("");           // optional
  const [theme, setTheme] = useState("");               // required
  const [timeOfDay, setTimeOfDay] = useState("");       // required
  const [bagColor, setBagColor] = useState("beige");    // meta only
  const [bagType, setBagType] = useState("regular");    // meta only

  /* generation */
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  /* choose */
  const [previews, setPreviews] = useState([]); // data URLs
  const [chosenIndex, setChosenIndex] = useState(null);
  const [isChoosing, setIsChoosing] = useState(false);

  /* result */
  const [s3Url, setS3Url] = useState("");
  const [jobId, setJobId] = useState("");

  const hasRequired = useMemo(() => {
    return name.trim().length > 0 && timeOfDay;
  }, [name, timeOfDay]);

  const canGenerate = useMemo(
    () => hasRequired && !isGenerating && !isChoosing && previews.length === 0 && !s3Url,
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
    // keep the form values so the user can tweak and try again
  }, []);

  /* ---------- handlers ---------- */
  async function handleGenerate(e) {
    e.preventDefault();
    if (!canGenerate) {
      if (!hasRequired) {
        setGenerateError("Please fill Name and Time of Day before generating.");
      }
      return;
    }
    setIsGenerating(true);
    setGenerateError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Name is strictly for order labeling later (NOT embedded in the image)
          name: name.trim(),
          country: country || undefined, // optional
          theme: theme || undefined,     // optional now
          timeOfDay,                     // "daytime" | "nighttime"
          previewCount: 3,
          deferUpload: true,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to generate previews");
      }
      const data = await res.json();
      if (!data?.images?.length) throw new Error("No previews returned");

      setPreviews(data.images.slice(0, 3));
      setJobId(data.jobId || "");
    } catch (err) {
      setGenerateError(`Issue: ${err.message || String(err)}`);
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
            // Saved with the render for staff reference only
            name: name.trim(),
            country,
            theme,
            timeOfDay,
            bagColor,
            bagType,
          },
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Upload failed");
      }
      const data = await res.json();
      setS3Url(data.s3Url || "");
      setJobId(data.orderId || jobId || "");
    } catch (err) {
      setGenerateError(`Issue: ${err.message || String(err)}`);
    } finally {
      setIsChoosing(false);
    }
  }

  /* ---------- styles ---------- */
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
    borderRadius: 16,
    boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
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

  /* ---------- UI ---------- */
  return (
    <div style={pageBg}>
      <div style={shell}>
        <header style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>
            Fid Deen Custom Tote Generator
          </h1>
          <p style={{ marginTop: 8, color: "#4a5568" }}>
            Fill the form, generate 3 options, and choose your favorite.
          </p>
        </header>

        {/* FORM CARD */}
        <form onSubmit={handleGenerate} style={{ ...card, padding: 20 }}>
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
                Name (for order label){reqBadge}
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
                  <option key={c.value || "none"} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={label}>Theme (optional)</label>
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

          {/* Time of Day row */}
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
                Time of Day{reqBadge}
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

            {/* Tote options (do NOT affect design prompt; only saved with meta) */}
            <div />
          </div>

          {/* Tote options */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 6,
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
            <button type="submit" style={primaryBtn(canGenerate)} disabled={!canGenerate}>
              {isGenerating ? "Generating…" : "Generate 3 Options"}
            </button>
            <button type="button" onClick={resetAll} style={secondaryBtn}>
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
              <h2 style={{ margin: 0, fontSize: 22 }}>Pick your favorite</h2>
              <div style={{ color: "#6b7280", fontSize: 14 }}>Click a card to select</div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
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
                      border: active ? "3px solid #0f172a" : "1px solid #e2e8f0",
                      borderRadius: 16,
                      padding: 12,
                      background: "#fff",
                      cursor: "pointer",
                      transition: "transform 120ms ease, box-shadow 120ms ease",
                      boxShadow: active
                        ? "0 10px 18px rgba(15,23,42,0.18)"
                        : "0 2px 8px rgba(17,24,39,0.06)",
                      transform: active ? "translateY(-3px)" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1/1",
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "#f4f6f9",
                      }}
                    >
                      <img
                        src={src}
                        alt={`Option ${i + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        paddingTop: 10,
                        textAlign: "center",
                        fontWeight: 700,
                        color: "#111827",
                      }}
                    >
                      {`Option ${["A", "B", "C"][i]}`}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button
                type="button"
                onClick={handleChoose}
                disabled={!canChoose}
                style={primaryBtn(canChoose)}
              >
                {isChoosing ? "Saving…" : "Choose This Design"}
              </button>
              <button
                type="button"
                onClick={() => setChosenIndex(null)}
                style={secondaryBtn}
              >
                Unselect
              </button>
            </div>
          </section>
        )}

        {/* RESULT */}
        {s3Url && (
          <section style={{ ...card, padding: 20, marginTop: 18 }}>
            <h3 style={{ marginTop: 0 }}>Ready to Print</h3>
            <p style={{ margin: "6px 0" }}>
              Order ID: <strong>{jobId || "—"}</strong>
            </p>
            <p style={{ margin: "6px 0" }}>
              File: <code>{new URL(s3Url).pathname.slice(1)}</code>
            </p>

            {/* show tote meta for staff clarity */}
            <div
              style={{
                marginTop: 8,
                background: "#f7fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "10px 12px",
                color: "#374151",
              }}
            >
              <strong>Tote Options:</strong> Color – {bagColor}, Type – {bagType}; Time of
              Day – {timeOfDay || "—"}; Theme – {theme || "—"}; Country –{" "}
              {COUNTRIES.find((c) => c.value === country)?.label || "—"}
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <a
                href={s3Url}
                target="_blank"
                rel="noreferrer"
                style={{
                  ...primaryBtn(true),
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Open Image
              </a>
              <button type="button" onClick={resetAll} style={secondaryBtn}>
                New Tote
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
