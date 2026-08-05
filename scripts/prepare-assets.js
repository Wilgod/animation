const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const { removeWhiteBackground, removeWhiteBackgroundFloodFill } = require("./lib/chromaKey");
const { loadScenesConfig } = require("./lib/scenesConfig");

const ROOT = path.join(__dirname, "..");
const CONFIG_PATH = path.join(ROOT, "config", "scenes.json");
const ASSETS_ROOT = path.join(ROOT, "assets");
const ANIMALS_OUT_DIR = path.join(ASSETS_ROOT, "_animals");
const ORNAMENTS_OUT_DIR = path.join(ASSETS_ROOT, "_ornaments");

// Output pixel resolution for background.jpg — this is the actual render
// target (see index.html's #stage canvas size + style.css's export-mode
// rule), decoupled from the 1600x900 logical coordinate space that
// paths/waypoints/ornament positions are stored in (engine.js's own
// CANVAS_WIDTH/CANVAS_HEIGHT, left untouched so saved layouts still apply).
const CANVAS_WIDTH = 3840;
const CANVAS_HEIGHT = 2160;
// Animal/ornament sprites are rendered at this many times their intended
// on-canvas (logical-space) size so they stay sharp at the higher render
// resolution above — engine.js divides back out by the same factor when
// drawing them, so their on-screen size/placement is unaffected. Keep in
// sync with ASSET_UPRES_FACTOR in engine.js.
const ASSET_UPRES_FACTOR = 2.4;
const DEFAULT_STATIC_MAX_WIDTH = Math.round(350 * ASSET_UPRES_FACTOR);
const DEFAULT_WALK_FRAME_MAX_WIDTH = Math.round(260 * ASSET_UPRES_FACTOR);
const DEFAULT_GRID_CELL_INSET = 10;
const DEFAULT_ORNAMENT_MAX_WIDTH = Math.round(300 * ASSET_UPRES_FACTOR);

function resolveSource(label, relativePath, kind) {
  const abs = path.join(ROOT, relativePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`${label}: ${kind} source not found at ${abs}. Check config/scenes.json.`);
  }
  return abs;
}

async function buildBackground(scene, sceneOutDir) {
  const src = resolveSource(`Scene "${scene.id}"`, scene.background.source, "background");
  const outFile = path.join(sceneOutDir, "background.jpg");
  await sharp(src)
    .resize(CANVAS_WIDTH, CANVAS_HEIGHT, { fit: "cover" })
    .jpeg({ quality: 85 })
    .toFile(outFile);
  const stat = fs.statSync(outFile);
  console.log(`  background.jpg (${(stat.size / 1024).toFixed(0)} KB)`);
}

// Animals with only a motion-grid source (no separate standalone static
// photo) skip this — main() copies the first walk frame as animal.png
// instead, once buildWalkFrames has produced it.
async function buildAnimalStatic(animal, animalOutDir) {
  if (!animal.source) return;
  const src = resolveSource(`Animal "${animal.id}"`, animal.source, "animal");
  const outFile = path.join(animalOutDir, "animal.png");
  const maxWidth = animal.staticMaxWidth || DEFAULT_STATIC_MAX_WIDTH;

  const keyed = await removeWhiteBackground(src);
  const trimmed = await sharp(keyed.data, {
    raw: { width: keyed.info.width, height: keyed.info.height, channels: 4 },
  })
    .png()
    .trim()
    .toBuffer();

  await sharp(trimmed)
    .resize({ width: maxWidth, height: maxWidth, fit: "inside" })
    .png()
    .toFile(outFile);

  const meta = await sharp(outFile).metadata();
  const stat = fs.statSync(outFile);
  console.log(`  animal.png (${meta.width}x${meta.height}, ${(stat.size / 1024).toFixed(0)} KB)`);
}

async function buildWalkFrames(animal, animalOutDir) {
  if (!animal.motionGrid) return;

  const grid = animal.motionGrid;
  const src = resolveSource(`Animal "${animal.id}"`, grid.source, "motion grid");
  const cols = grid.cols || 4;
  const rows = grid.rows || 2;
  const inset = grid.cellInset ?? DEFAULT_GRID_CELL_INSET;
  const maxWidth = animal.walkFrameMaxWidth || DEFAULT_WALK_FRAME_MAX_WIDTH;

  const framesDir = path.join(animalOutDir, "walk_frames");
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  const gridMeta = await sharp(src).metadata();
  const cellW = Math.floor(gridMeta.width / cols);
  const cellH = Math.floor(gridMeta.height / rows);

  // First pass: extract, key, and trim each cell down to its actual content.
  // Grid cells aren't always perfectly registered — the subject can sit at
  // a slightly different position within its cell from frame to frame — so
  // trimming to content here and re-anchoring in the second pass (rather
  // than trusting raw cell placement) is what keeps the sprite from
  // visibly jumping position as the walk cycle plays.
  const trimmedFrames = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const left = col * cellW + inset;
      const top = row * cellH + inset;
      const width = cellW - inset * 2;
      const height = cellH - inset * 2;
      const cellBuffer = await sharp(src).extract({ left, top, width, height }).png().toBuffer();
      const keyed = await removeWhiteBackground(cellBuffer);
      // Resize while still at full cell size (matching every other frame's
      // scale) *then* trim — trimming first would crop to content before
      // the common scale is applied, so the same physical creature would
      // resize (and appear) larger the more of the cell's blank margin got
      // cropped away, inflating on-screen size inconsistently per frame.
      const resizedBuffer = await sharp(keyed.data, {
        raw: { width: keyed.info.width, height: keyed.info.height, channels: 4 },
      })
        .resize({ width: maxWidth, withoutEnlargement: true })
        .png()
        .toBuffer();
      const trimmedBuffer = await sharp(resizedBuffer).trim().toBuffer();
      const meta = await sharp(trimmedBuffer).metadata();
      trimmedFrames.push({ buffer: trimmedBuffer, width: meta.width, height: meta.height });
    }
  }

  // Second pass: composite every frame onto one shared canvas, each one
  // centered — engine.js draws every walk frame centered on the actor's
  // (x, y), so centering here is what keeps that point anchored to the
  // creature's actual body across frames instead of drifting with however
  // each raw grid cell happened to be cropped.
  const canvasW = Math.max(...trimmedFrames.map((f) => f.width));
  const canvasH = Math.max(...trimmedFrames.map((f) => f.height));
  for (let i = 0; i < trimmedFrames.length; i++) {
    const frame = trimmedFrames[i];
    const left = Math.round((canvasW - frame.width) / 2);
    const top = Math.round((canvasH - frame.height) / 2);
    await sharp({
      create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: frame.buffer, left, top }])
      .png()
      .toFile(path.join(framesDir, `frame_${String(i).padStart(2, "0")}.png`));
  }
  console.log(`  walk_frames/ (${trimmedFrames.length} frames, ${canvasW}x${canvasH})`);
}

// A source that already carries real (non-uniform) alpha was pre-cut by
// the author (e.g. exported from Adobe Express/Photoshop) — as opposed to
// merely *having* an alpha channel that's 255 everywhere, which is common
// even for plain opaque photos.
async function hasRealTransparency(src) {
  const meta = await sharp(src).metadata();
  if (!meta.hasAlpha) return false;
  const stats = await sharp(src).stats();
  const alphaChannel = stats.channels[stats.channels.length - 1];
  return alphaChannel.min < 255;
}

// Ornaments use a border-flood-fill background removal (not the animals'
// global white-threshold key) since ornament photos commonly have their own
// enclosed white areas (e.g. a clock's white dial) that a global threshold
// would incorrectly punch a hole through along with the actual backdrop.
// Skipped entirely if the source is already pre-cut (real alpha) — running
// it anyway would ignore that alpha and could eat into opaque areas whose
// RGB happens to be near-white (e.g. a cream vase) if they're pixel-connected
// to the transparent border.
async function buildOrnament(ornament, ornamentOutDir) {
  const src = resolveSource(`Ornament "${ornament.id}"`, ornament.source, "ornament");
  const outFile = path.join(ornamentOutDir, "ornament.png");
  const maxWidth = ornament.maxWidth || DEFAULT_ORNAMENT_MAX_WIDTH;

  let trimmed;
  if (await hasRealTransparency(src)) {
    trimmed = await sharp(src).png().trim().toBuffer();
  } else {
    const keyed = await removeWhiteBackgroundFloodFill(src);
    trimmed = await sharp(keyed.data, {
      raw: { width: keyed.info.width, height: keyed.info.height, channels: 4 },
    })
      .png()
      .trim()
      .toBuffer();
  }

  await sharp(trimmed)
    .resize({ width: maxWidth, height: maxWidth, fit: "inside" })
    .png()
    .toFile(outFile);

  const meta = await sharp(outFile).metadata();
  const stat = fs.statSync(outFile);
  console.log(`  ornament.png (${meta.width}x${meta.height}, ${(stat.size / 1024).toFixed(0)} KB)`);
}

async function main() {
  const config = loadScenesConfig(CONFIG_PATH);
  if (!config.scenes || config.scenes.length === 0) {
    throw new Error("config/scenes.json has no scenes defined.");
  }
  if (!config.animals || config.animals.length === 0) {
    throw new Error("config/scenes.json has no animals defined.");
  }

  for (const scene of config.scenes) {
    console.log(`Scene: ${scene.id} (${scene.label || scene.id})`);
    const sceneOutDir = path.join(ASSETS_ROOT, scene.id);
    fs.mkdirSync(sceneOutDir, { recursive: true });
    await buildBackground(scene, sceneOutDir);
  }

  for (const animal of config.animals) {
    console.log(`Animal: ${animal.id} (${animal.label || animal.id})`);
    const animalOutDir = path.join(ANIMALS_OUT_DIR, animal.id);
    fs.mkdirSync(animalOutDir, { recursive: true });
    await buildAnimalStatic(animal, animalOutDir);
    await buildWalkFrames(animal, animalOutDir);

    if (!animal.source) {
      const firstFrame = path.join(animalOutDir, "walk_frames", "frame_00.png");
      if (!fs.existsSync(firstFrame)) {
        throw new Error(`Animal "${animal.id}": no "source" and no motion grid to derive a static pose from.`);
      }
      fs.copyFileSync(firstFrame, path.join(animalOutDir, "animal.png"));
      console.log(`  animal.png (from walk_frames/frame_00.png — no static source configured)`);
    }
  }

  for (const ornament of config.ornaments || []) {
    console.log(`Ornament: ${ornament.id} (${ornament.label || ornament.id})`);
    const ornamentOutDir = path.join(ORNAMENTS_OUT_DIR, ornament.id);
    fs.mkdirSync(ornamentOutDir, { recursive: true });
    await buildOrnament(ornament, ornamentOutDir);
  }

  console.log(
    `\nDone. Processed ${config.scenes.length} scene(s), ${config.animals.length} animal(s), and ${(config.ornaments || []).length} ornament(s).`
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
