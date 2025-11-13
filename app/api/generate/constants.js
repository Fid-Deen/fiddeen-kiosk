// app/api/generate/constants.js
// One-stop creative config for Fid Deen prompts.
// Edit text here to change art direction without touching logic.

/* ---------------------------------------------------------
   Core, timeless look (avoid hyper-real / futuristic)
   --------------------------------------------------------- */
   export const BASE_STYLE =
   "traditional, heritage illustration style; vintage print and handcrafted texture; museum-grade craft feeling; stone, tile, carved plaster; square composition with clean margins; no people, no faces, no hands, no readable text or brands";
 
 /* ---------------------------------------------------------
    Theme descriptions (your four) → mood / visual language
    --------------------------------------------------------- */
 export const THEME_DESCRIPTIONS = {
   peaceful:
     "serene, contemplative atmosphere; balanced composition; gentle ornament; calm, low-contrast palette",
   islamic:
     "emphasis on Islamic geometry and architectural craft; arabesques, muqarnas, and abstract calligraphic border flourishes (unreadable)",
   nature:
     "garden and landscape emphasis; palms, cypress, water rills, mountains and desert gardens; organic arabesque vines",
   city_vibrant:
     "busy historic streets, marketplaces, arcades, layered signage shapes (no text), lively tiling; energetic composition",
 };
 
 /* ---------------------------------------------------------
    Time of Day → lighting & palette phrasing
    --------------------------------------------------------- */
 export const TIME_OF_DAY_HINTS = {
   daytime:
     "daytime scene; soft natural light; gentle shadows; sun-warmed stone and glazed tile; fresh sky tones",
   nighttime:
     "night scene; lantern and window glow; moonlit courtyards; deep indigo and teal shadows; warm brass highlights on stone and tile",
 };
 
 /* ---------------------------------------------------------
    Country → three distinct landmark/scene prompts
    (Keep 3 per country to guarantee unique options A/B/C)
    --------------------------------------------------------- */
 export const COUNTRY_LANDMARKS = {
   morocco: [
     "Fez medina courtyard with zellige fountain, cedar doors, and carved plaster arches in warm sunlight",
     "Marrakech Koutoubia Mosque minaret with palm-lined plaza and sunlit adobe tones",
     "Chefchaouen blue-washed alley with ornate doorways, horseshoe arches, and tiled steps",
   ],
   egypt: [
     "Giza pyramids rising over limestone plateau with desert palms and ancient stone texture",
     "Mosque-Madrasa of Sultan Hassan in Cairo with Mamluk arches, mashrabiya screens, and sandstone",
     "Nile riverside promenade with feluccas and palm silhouettes near Cairo skyline",
   ],
   turkey: [
     "Blue Mosque domes and arcades with Iznik tile accents",
     "Hagia Sophia exterior buttresses and grand portal stonework",
     "Topkapı Palace courtyard with Ottoman fountain and colonnade",
   ],
   iran: [
     "Shah Mosque Isfahan iwan with haft-rangi tiles and turquoise dome",
     "Nasir al-Mulk mosque stained-glass patterns cast on carpets",
     "Persepolis terrace reliefs and Achaemenid columns in view",
   ],
   pakistan: [
     "Badshahi Mosque red sandstone courtyard and white marble inlay",
     "Faisal Mosque Islamabad tent-like silhouette and mountain backdrop",
     "Lahore Fort Sheesh Mahal jali screens and pietra dura motifs",
   ],
   saudi: [
     "Masjid an-Nabawi courtyard arcades and classical lamps",
     "Diriyah At-Turaif adobe walls and Najdi geometric details",
     "Historic Jeddah Al-Balad coral-stone houses with roshan mashrabiyas",
   ],
   uae: [
     "Al Fahidi wind towers and coral-stone lanes near the creek",
     "Sheikh Zayed Grand Mosque colonnade with floral marble inlay",
     "Desert caravanserai courtyard with palm shade and water jar",
   ],
   jordan: [
     "Petra Treasury rock-cut façade and canyon approach",
     "Amman Citadel Umayyad arches with hillscape",
     "Wadi Rum sandstone outcrops and desert camp lights",
   ],
   palestine: [
     "Jerusalem Old City limestone arches with olive tree courtyard",
     "Dome of the Rock golden dome with blue tile ornament and arcade",
     "Hebron traditional stone market lanes and archways",
   ],
   indonesia: [
     "Borobudur terraces with stone stupas and relief panels",
     "Prambanan temple spires with volcanic plain",
     "Ubud water temple courtyard with carved stone and lotus pool",
   ],
 };
 
 /* ---------------------------------------------------------
    Generic theme scenes (fallback when no country selected)
    Keep 3 per theme to guarantee distinct options A/B/C.
    --------------------------------------------------------- */
 export const GENERIC_THEME_SCENES = {
   peaceful: [
     "quiet courtyard with small tiled fountain and cypress shadows",
     "shaded arcade with repeating arches and cool stone floor",
     "garden wall with carved plaster medallion and gentle water rill",
   ],
   islamic: [
     "geometric star tessellation border framing an architectural centerpiece",
     "muqarnas-inspired vault with interlaced arabesque ornament",
     "abstract calligraphic cartouche motifs with tiled spandrels (unreadable)",
   ],
   nature: [
     "oasis garden with palms, citrus, and mosaic-edged pool",
     "mountain silhouettes beyond a walled garden with narrow water channel",
     "desert flora with date palms and patterned ceramic planters",
   ],
   city_vibrant: [
     "historic souq arcade with patterned stalls and tiled columns",
     "stone alley with stacked balconies, mashrabiya screens, and lanterns",
     "city courtyard with fountain, colorful ceramic tiles, and busy paving",
   ],
 };
 
 /* ---------------------------------------------------------
    Optional knobs (safe defaults for Stability API)
    Edit here if you want a different stylistic baseline.
    --------------------------------------------------------- */
 export const DEFAULT_MODEL = "sd3.5-large";
 export const DEFAULT_STYLE_PRESET = "analog-film"; // softer, non-futuristic
 export const DEFAULT_CFG_SCALE = 4;
 export const DEFAULT_ASPECT_RATIO = "1:1";
 