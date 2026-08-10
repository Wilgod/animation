// Shared zone/region geometry for scene backgrounds — used by both the
// offline asset-prep script (Node) and the browser editor (app.js), so
// "which zone is a point in" and "where can a given habitat go" can't drift
// between the two. Exposed as module.exports (Node) and window.SceneZones
// (browser). `zones` is the { bands, patches } shape written to each scene's
// assets/<sceneId>/zones.json, all coordinates in the shared 1600x900
// logical space (see engine.js's CANVAS_WIDTH/CANVAS_HEIGHT).
(function (factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.SceneZones = api;
})(function () {
  const MAX_SAMPLE_ATTEMPTS = 30;

  function pointInRect(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  // Which zone a logical-space point falls in. Patches are checked first
  // since they sit "on top of" whatever band/default they overlap (e.g. a
  // water patch inside the default ground area).
  function zoneAt(zones, x, y) {
    const patches = (zones && zones.patches) || [];
    for (const p of patches) {
      if (pointInRect(x, y, p)) return p.zone;
    }
    const bands = (zones && zones.bands) || [];
    for (const b of bands) {
      if (y >= b.y0 && y <= b.y1) return b.zone;
    }
    return "ground";
  }

  // Bounding rects worth sampling within for a given habitat zone: every
  // patch/band tagged with that zone, plus (for "ground", the implicit
  // default) the full canvas as a fallback candidate. These are only
  // *candidates* — sampleZonePoint verifies the actual point against zoneAt,
  // since e.g. the full-canvas ground candidate may overlap a water patch.
  function candidateRects(zones, habitatZone, canvasWidth, canvasHeight) {
    const rects = [];
    for (const p of (zones && zones.patches) || []) {
      if (p.zone === habitatZone) rects.push({ x: p.x, y: p.y, w: p.w, h: p.h });
    }
    for (const b of (zones && zones.bands) || []) {
      if (b.zone === habitatZone) rects.push({ x: 0, y: b.y0, w: canvasWidth, h: b.y1 - b.y0 });
    }
    if (habitatZone === "ground") rects.push({ x: 0, y: 0, w: canvasWidth, h: canvasHeight });
    return rects;
  }

  // Whether a habitat has anywhere to go at all in this scene. "ground" is
  // the implicit default so it's always available; other zones need an
  // explicit matching band/patch.
  function hasZone(zones, habitatZone, canvasWidth, canvasHeight) {
    if (habitatZone === "ground") return true;
    return candidateRects(zones, habitatZone, canvasWidth, canvasHeight).length > 0;
  }

  function rectArea(r) {
    return Math.max(0, r.w) * Math.max(0, r.h);
  }

  // Picks one candidate rect at random, weighted by area (so a small pond
  // isn't sampled as often as the full-canvas ground fallback).
  function pickWeightedRect(rects, rand) {
    const total = rects.reduce((sum, r) => sum + rectArea(r), 0);
    if (total <= 0) return rects[0];
    let roll = rand() * total;
    for (const r of rects) {
      roll -= rectArea(r);
      if (roll <= 0) return r;
    }
    return rects[rects.length - 1];
  }

  // Rejection-samples a random logical-space point that actually belongs to
  // habitatZone: picks an area-weighted candidate rect, samples uniformly
  // inside it, and verifies with zoneAt (since candidate rects like the
  // ground fallback can overlap another zone's patch). Falls back to the
  // first candidate rect's center if no verified point turns up within
  // MAX_SAMPLE_ATTEMPTS (defensive only — callers should already have
  // checked hasZone before generating for this habitat).
  function sampleZonePoint(zones, habitatZone, canvasWidth, canvasHeight, rand = Math.random) {
    const rects = candidateRects(zones, habitatZone, canvasWidth, canvasHeight);
    if (rects.length === 0) return { x: canvasWidth / 2, y: canvasHeight / 2 };

    for (let attempt = 0; attempt < MAX_SAMPLE_ATTEMPTS; attempt++) {
      const rect = pickWeightedRect(rects, rand);
      const x = rect.x + rand() * rect.w;
      const y = rect.y + rand() * rect.h;
      if (zoneAt(zones, x, y) === habitatZone) return { x, y };
    }
    const fallback = rects[0];
    return { x: fallback.x + fallback.w / 2, y: fallback.y + fallback.h / 2 };
  }

  return { zoneAt, candidateRects, hasZone, sampleZonePoint };
});
