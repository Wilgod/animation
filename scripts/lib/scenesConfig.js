const fs = require("fs");

const LOGICAL_HEIGHT = 900; // must match engine.js's CANVAS_HEIGHT — the logical space bands/patches are authored in

function elementSource(elements, elementId, context) {
  const el = elements.find((e) => e.id === elementId);
  if (!el) throw new Error(`${context}: unknown elementId "${elementId}"`);
  return el.source;
}

// True if `bands`, sorted by y0, tile the full 0..LOGICAL_HEIGHT range with no
// gaps/overlaps and every one supplies its own elementId — i.e. the bands
// alone are a complete, self-sufficient stack of visual layers (e.g. a sky
// image on top of a separate grass image), with no need for a baseElementId/
// background.source underneath them at all.
function bandsFullyCoverCanvas(bands) {
  if (bands.length === 0 || bands.some((b) => !b.elementId)) return false;
  const sorted = [...bands].sort((a, b) => a.y0 - b.y0);
  if (sorted[0].y0 !== 0) return false;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].y1 !== sorted[i + 1].y0) return false;
  }
  return sorted[sorted.length - 1].y1 === LOGICAL_HEIGHT;
}

// Normalizes a scene into a consistent { baseSource, bands, patches } shape
// regardless of authoring style — a legacy flat `background.source`, a
// `baseElementId` full-canvas photo, or a stack of independently-swappable
// `bands` (each optionally its own elementId/image, e.g. a sky band and a
// ground band as two separate pictures) — so prepare-assets.js and the
// runtime zone logic never need to branch on which style a scene used.
// `bands`/`patches` coordinates are in the shared 1600x900 logical space
// (see engine.js's CANVAS_WIDTH/CANVAS_HEIGHT).
function normalizeScene(scene, elements) {
  const bands = (scene.bands || []).map((b) => {
    const band = b.elementId ? { ...b, source: elementSource(elements, b.elementId, `Scene "${scene.id}" band`) } : { ...b };
    if (b.cloud) {
      band.cloud = {
        ...b.cloud,
        source: elementSource(elements, b.cloud.elementId, `Scene "${scene.id}" band cloud`),
      };
    }
    return band;
  });
  // Like bands, a patch with no elementId is metadata-only — it just tags a
  // zone (e.g. the water inside a barrel already painted in the base photo).
  const patches = (scene.patches || []).map((p) =>
    p.elementId ? { ...p, source: elementSource(elements, p.elementId, `Scene "${scene.id}" patch`) } : { ...p }
  );

  if (scene.baseElementId) {
    return { ...scene, baseSource: elementSource(elements, scene.baseElementId, `Scene "${scene.id}"`), bands, patches };
  }
  // Legacy shape: a single flat photo, treated as a full-canvas base with no
  // patches/bands unless the scene also declares its own (so a legacy scene
  // can add e.g. a sky band without fully migrating to elements[]).
  if (scene.background && scene.background.source) {
    return { ...scene, baseSource: scene.background.source, bands, patches };
  }
  // No single base photo at all — only valid if the bands themselves fully
  // tile the canvas (each bringing its own image), e.g. a scene built purely
  // from a sky-image band + a ground-image band.
  if (bandsFullyCoverCanvas(bands)) {
    return { ...scene, baseSource: null, bands, patches };
  }
  throw new Error(
    `Scene "${scene.id}": needs "baseElementId" or "background.source", or "bands" that fully tile the canvas (each with its own elementId).`
  );
}

// Reads config/scenes.json and merges each entry in "animals" on top of the
// shared top-level "defaultAnimal" (e.g. rotationOffsetDeg/strideLengthPx/
// habitat), so per-animal entries only need to specify what's actually
// different (source, motionGrid) instead of repeating shared defaults. Also
// normalizes each scene's background composition (see normalizeScene).
function loadScenesConfig(configPath) {
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const defaultAnimal = raw.defaultAnimal;
  const animals = (raw.animals || []).map((animal) => {
    if (!defaultAnimal) return animal;
    return { ...defaultAnimal, ...animal };
  });
  const elements = raw.elements || [];
  const scenes = (raw.scenes || []).map((scene) => normalizeScene(scene, elements));
  return { ...raw, animals, scenes, elements, ornaments: raw.ornaments || [] };
}

module.exports = { loadScenesConfig };
