const fs = require("fs");

// Reads config/scenes.json and merges each entry in "animals" on top of the
// shared top-level "defaultAnimal" (e.g. rotationOffsetDeg/strideLengthPx),
// so per-animal entries only need to specify what's actually different
// (source, motionGrid) instead of repeating shared physics defaults.
function loadScenesConfig(configPath) {
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const defaultAnimal = raw.defaultAnimal;
  const animals = (raw.animals || []).map((animal) => {
    if (!defaultAnimal) return animal;
    return { ...defaultAnimal, ...animal };
  });
  return { ...raw, animals, scenes: raw.scenes || [], ornaments: raw.ornaments || [] };
}

module.exports = { loadScenesConfig };
