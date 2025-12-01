// app/api/generate/constants.js
// Central creative config for Fid Deen art scene prompts

/* ---------------------------------------------------------
   Core visual style for all art scenes
   This should be stable and brand defining
--------------------------------------------------------- */

export const BASE_STYLE =
  "Clean, high end architectural illustration in a single coherent scene, filling the entire square canvas edge to edge; no borders, no frames, no drop shadows, no white margin areas of any kind. The artwork should fully occupy the full 1:1 space. Crisp lines, refined detailing, soft print-safe color palette. No grain, no heavy texture, no collage, no multi-panel layouts. No people, no faces, no animals, no signage, no readable text in any language. Elegant and culturally respectful stylization suitable for tote bag printing.";

/* ---------------------------------------------------------
   Composition types (will power your Composition Type dropdown)
   These describe how the camera frames the landmark
--------------------------------------------------------- */

export const COMPOSITION_TYPES = {
  wide: "Wide angle view that shows more of the surrounding architecture and environment while keeping the landmark clearly readable in the frame",
  mid: "Mid distance view that centers the landmark and shows some surrounding context with a balanced, stable composition",
  close: "Close up architectural detail that focuses on the landmark surfaces, textures, arches, doors, or tilework while still reading as a complete scene",
};

// Temporary alias so older code that still imports THEME_DESCRIPTIONS
// does not crash before route.js is updated.
// Later we will switch imports to COMPOSITION_TYPES directly.
export const THEME_DESCRIPTIONS = COMPOSITION_TYPES;

/* ---------------------------------------------------------
   Time of day hints
   These should only affect lighting and mood, not geometry
--------------------------------------------------------- */

export const TIME_OF_DAY_HINTS = {
  daytime:
    "Daytime scene with soft natural light, gentle shadows, and warm highlights on stone and tile surfaces",
  nighttime:
    "Night scene with calm ambient darkness, selective lantern or window glow, and soft moonlit shadows on the architecture",
};

/* ---------------------------------------------------------
   Country specific landmark scenes
   Each array has three distinct scene descriptions
   The generator should use one entry per image, not all at once
--------------------------------------------------------- */

export const COUNTRY_LANDMARKS = {
  morocco: [
    "Historic Moroccan courtyard in the style of Fez medina, with a central zellige tiled fountain, carved plaster arches, and cedar doors",
    "View of a mosque courtyard inspired by the Koutoubia area in Marrakech, with minaret silhouette and warm adobe stone surfaces",
    "Narrow blue washed alley inspired by Chefchaouen, with horseshoe arches, tiled steps, and simple doorways",
  ],
  egypt: [
    "Scene near the Giza plateau with pyramids on the horizon, desert palms, and warm limestone textures",
    "Courtyard and arches inspired by Mamluk mosques in Cairo, with mashrabiya screens and carved stone details",
    "Nile riverside promenade with palm silhouettes, moored boats, and distant city architecture",
  ],
  turkey: [
    "Ottoman courtyard scene inspired by Istanbul mosques, with domes and arcades and Iznik tile accents",
    "Exterior architectural view in the spirit of Hagia Sophia, with strong stone buttresses and grand portal forms",
    "Palace style courtyard inspired by Topkapi, with a small fountain, colonnade, and garden planting",
  ],
  iran: [
    "Iwan and courtyard scene inspired by Isfahan mosques, with haft rangi tiles and a turquoise dome presence",
    "Interior style scene with patterned light inspired by stained glass and carpets, reminiscent of historic Shiraz mosques",
    "Terrace and column view inspired by Persepolis reliefs and Achaemenid stone architecture",
  ],
  pakistan: [
    "Large mosque courtyard scene inspired by Badshahi Mosque in Lahore, with red sandstone and white marble accents",
    "Modern mosque silhouette inspired by Faisal Mosque in Islamabad, with mountain backdrop and clear sky",
    "Fort and garden composition inspired by Lahore Fort and Sheesh Mahal, with jali screens and inlay details",
  ],
  saudi: [
    "Courtyard arcade scene inspired by historic mosques in Medina, with classical lamps and stone paving",
    "Adobe wall and tower forms inspired by Diriyah and traditional Najdi architecture, with geometric details",
    "Historic street scene inspired by old Jeddah, with coral stone houses and roshan style wooden balconies",
  ],
  uae: [
    "Old Dubai style lane inspired by Al Fahidi district, with wind towers, coral stone walls, and narrow shaded passages",
    "Colonnade scene inspired by Sheikh Zayed Grand Mosque, with white marble columns and floral inlay motifs",
    "Desert courtyard scene with simple walls, palm shade, and a small water jar or fountain element",
  ],
  jordan: [
    "Canyon approach scene inspired by Petra, with carved rock facade and narrow passage framing the view",
    "Hilltop ruin or citadel scene inspired by Amman, with stone arches and layered city hills in the distance",
    "Desert rock landscape inspired by Wadi Rum, with sandstone outcrops and a simple camp foreground",
  ],
  palestine: [
    "Old city courtyard scene inspired by Jerusalem limestone architecture, with arches and an olive tree",
    "Dome and arcade scene inspired by Islamic architecture in Jerusalem, with golden dome and blue tile ornament, without readable inscriptions",
    "Historic market lane scene inspired by Hebron and other Palestinian towns, with stone vaults and small shop fronts",
  ],
  indonesia: [
    "Temple terrace scene inspired by Borobudur, with stone stupas and relief panels in a misty highland setting",
    "Temple complex scene inspired by Prambanan, with clustered spires and volcanic plain in the distance",
    "Water temple or courtyard scene in a lush setting, with carved stone, lotus pool, and tropical planting",
  ],
};

/* ---------------------------------------------------------
   Optional legacy knobs for Stability API
   These are currently not used by the Gemini flow but kept
   in case you ever route back through Stability for some tasks
--------------------------------------------------------- */

export const DEFAULT_MODEL = "sd3.5-large";
export const DEFAULT_STYLE_PRESET = "analog-film";
export const DEFAULT_CFG_SCALE = 4;
export const DEFAULT_ASPECT_RATIO = "1:1";
