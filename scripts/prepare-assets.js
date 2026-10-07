const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const { removeWhiteBackgroundFloodFill, removeColorBackgroundFloodFill, CHROMA_GREEN } = require("./lib/chromaKey");
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
// The logical coordinate space that scene bands/patches (and paths/waypoints,
// via engine.js's own CANVAS_WIDTH/CANVAS_HEIGHT) are authored in — patch
// rects get scaled up by BACKGROUND_SCALE to land at the right place/size on
// the actual CANVAS_WIDTH x CANVAS_HEIGHT background.jpg. Numerically equal
// to ASSET_UPRES_FACTOR below (both reduce to 3840/1600), but a distinct
// ratio conceptually — this one is background-composition scale, not sprite
// upres — so it's kept as its own constant rather than reused.
const LOGICAL_WIDTH = 1600; // pairs with LOGICAL_HEIGHT 900 == CANVAS_HEIGHT / BACKGROUND_SCALE
const BACKGROUND_SCALE = CANVAS_WIDTH / LOGICAL_WIDTH;
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
// Rig body layer is sized like a walk-cycle frame (the rig replaces the
// walk cycle, not the static pose) — every other rig layer (each limb)
// shares this same animal's single scale factor rather than getting sized
// independently; see buildRig.
const DEFAULT_RIG_MAX_WIDTH = DEFAULT_WALK_FRAME_MAX_WIDTH;

function resolveSource(label, relativePath, kind) {
  const abs = path.join(ROOT, relativePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`${label}: ${kind} source not found at ${abs}. Check config/scenes.json.`);
  }
  return abs;
}

// Composites the scene's background from, in order: a full-canvas base
// (skipped entirely if the scene has none — see scenesConfig.js's
// bandsFullyCoverCanvas, for a scene built purely from self-sufficient
// bands), then each band that carries its own image as a full-width stripe
// at its configured y-range (a band with no elementId is metadata-only and
// left as whatever the base already shows there), then patches (e.g. a
// pond) as small overlays — each scaled up from the shared logical
// coordinate space to the actual render resolution.
async function buildBackground(scene, sceneOutDir) {
  const outFile = path.join(sceneOutDir, "background.jpg");

  let pipeline;
  if (scene.baseSource) {
    const src = resolveSource(`Scene "${scene.id}"`, scene.baseSource, "background");
    pipeline = sharp(src).resize(CANVAS_WIDTH, CANVAS_HEIGHT, { fit: "cover" });
  } else {
    // Bands fully tile the canvas with their own images, so this base is
    // never actually visible — it just gives sharp something to composite onto.
    pipeline = sharp({ create: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, channels: 3, background: { r: 0, g: 0, b: 0 } } });
  }

  const overlays = [];
  for (const band of scene.bands) {
    if (!band.source) continue; // metadata-only zone tag — no image of its own
    const bandSrc = resolveSource(`Scene "${scene.id}" band`, band.source, "background band");
    const bandHeightPx = Math.round((band.y1 - band.y0) * BACKGROUND_SCALE);
    const buffer = await sharp(bandSrc).resize(CANVAS_WIDTH, bandHeightPx, { fit: "cover" }).toBuffer();
    overlays.push({ input: buffer, left: 0, top: Math.round(band.y0 * BACKGROUND_SCALE) });
  }
  for (const patch of scene.patches) {
    const patchSrc = resolveSource(`Scene "${scene.id}" patch`, patch.source, "background patch");
    const buffer = await sharp(patchSrc)
      .resize(Math.round(patch.w * BACKGROUND_SCALE), Math.round(patch.h * BACKGROUND_SCALE), { fit: "cover" })
      .toBuffer();
    overlays.push({
      input: buffer,
      left: Math.round(patch.x * BACKGROUND_SCALE),
      top: Math.round(patch.y * BACKGROUND_SCALE),
    });
  }

  if (overlays.length > 0) pipeline = pipeline.composite(overlays);
  await pipeline.jpeg({ quality: 85 }).toFile(outFile);

  const stat = fs.statSync(outFile);
  console.log(`  background.jpg (${(stat.size / 1024).toFixed(0)} KB)`);
}

// A band's optional `cloud` layer is NOT baked into background.jpg — unlike
// the static base/bands/patches, it needs to keep moving every frame (see
// engine.js's setScrollLayer/drawScrollLayer), so it's exported as its own
// alpha-preserving PNG instead, sized like a sprite (ASSET_UPRES_FACTOR),
// not like a background (BACKGROUND_SCALE) — engine.js draws it fresh each
// frame the same way it draws animal/ornament sprites, dividing back out by
// the same factor.
// AI-generated cloud art typically can't be produced with real transparency
// (see background-elements-prompts.md's 提示詞 1c) — it's shot on a solid
// chroma-key green instead, same idea as removeWhiteBackground for other
// assets, but keyed on green rather than white since the clouds themselves
// are white and a white key would erase them too. A source that's already
// pre-cut (real alpha, e.g. a hand-made/programmatically generated texture)
// skips keying entirely, same guard buildOrnament uses.
async function buildCloudLayer(scene, band, sceneOutDir) {
  const src = resolveSource(`Scene "${scene.id}" band cloud`, band.cloud.source, "cloud layer");
  const fileName = `cloud-${band.zone}.png`;
  const outFile = path.join(sceneOutDir, fileName);
  const targetHeight = Math.round((band.y1 - band.y0) * ASSET_UPRES_FACTOR);

  let pipeline;
  if (await hasRealTransparency(src)) {
    pipeline = sharp(src);
  } else {
    const keyed = await removeColorBackgroundFloodFill(src, CHROMA_GREEN);
    pipeline = sharp(keyed.data, { raw: { width: keyed.info.width, height: keyed.info.height, channels: 4 } });
  }

  await pipeline.resize({ height: targetHeight }).png().toFile(outFile);
  const meta = await sharp(outFile).metadata();
  console.log(`  ${fileName} (${meta.width}x${meta.height})`);
  return fileName;
}

// Writes the resolved zone map (bands + patches, in logical 1600x900 space)
// alongside background.jpg — this is the runtime contract the editor reads
// (via scripts/lib/zones.js) to decide where each animal's habitat can be
// placed/auto-generated, and (for a band's optional `cloud`) how to animate
// a scrolling texture over it — see buildCloudLayer.
async function writeZones(scene, sceneOutDir) {
  const bands = [];
  for (const band of scene.bands) {
    const entry = { zone: band.zone, y0: band.y0, y1: band.y1 };
    if (band.cloud) {
      const image = await buildCloudLayer(scene, band, sceneOutDir);
      entry.cloud = { image, scrollPxPerSec: band.cloud.scrollPxPerSec ?? 15 };
    }
    bands.push(entry);
  }
  const zones = {
    bands,
    patches: scene.patches.map(({ zone, x, y, w, h }) => ({ zone, x, y, w, h })),
  };
  const outFile = path.join(sceneOutDir, "zones.json");
  fs.writeFileSync(outFile, JSON.stringify(zones, null, 2));
  console.log(`  zones.json (${zones.bands.length} band(s), ${zones.patches.length} patch(es))`);
}

// Animals with only a motion-grid source (no separate standalone static
// photo) skip this — main() copies the first walk frame as animal.png
// instead, once buildWalkFrames has produced it.
async function buildAnimalStatic(animal, animalOutDir) {
  if (!animal.source) return;
  const src = resolveSource(`Animal "${animal.id}"`, animal.source, "animal");
  const outFile = path.join(animalOutDir, "animal.png");
  const maxWidth = animal.staticMaxWidth || DEFAULT_STATIC_MAX_WIDTH;

  // Flood-fill (not the global-threshold removeWhiteBackground) so widening
  // FEATHER_START to fully fade a photo's soft drop-shadow (see chromaKey.js)
  // can't also eat into a pale subject area that isn't actually connected to
  // the backdrop (e.g. a light-colored toe or belly highlight). stripEnclosedWhite
  // additionally hard-cuts any backdrop pocket sealed off by the pose itself
  // (see chromaKey.js) — safe here since a studio animal photo has no
  // legitimate enclosed pure-white subject area.
  const keyed = await removeWhiteBackgroundFloodFill(src, { stripEnclosedWhite: true });
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
      // stripEnclosedWhite: a walk-cycle pose can curl a limb back close
      // enough to the body to seal off a pocket of backdrop between the legs
      // that never touches the cell's crop edge — see chromaKey.js.
      const keyed = await removeWhiteBackgroundFloodFill(cellBuffer, { stripEnclosedWhite: true });
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

// Builds a layered "cutout rig" (a body layer + independently-rotatable
// limb layers) for an animal that defines a `rig` block, as an alternative
// to (or alongside) the flat walk-cycle frames from buildWalkFrames — see
// engine.js's drawRiggedBody for how these get composited/animated at
// runtime. Unlike buildWalkFrames (whole-body poses, each independently
// resized to maxWidth and recentered to its own bounding box — fine when
// every frame contains the same whole creature at the same relative scale),
// a rig's layers are parts of wildly different sizes (a torso vs. a small
// foot) that must all share one scale factor and stay positioned relative
// to a common `anchor` point, or each limb's pivot would drift out of
// alignment with the body once trimmed.
//
// Rig source layers (image/animal/<rig.sourceDir>/*.png) are expected to
// already be background-removed and share one full-size "authoring canvas"
// (every layer the same pixel dimensions, each layer's content positioned
// wherever it actually sits on the creature) — see scripts/cut-lizard-rig.js
// for how the pilot's layers were produced. `rig.anchor` and each limb's
// `rig.limbs[].pivot` are pixel coordinates in that same authoring space.
async function buildRig(animal, animalOutDir) {
  if (!animal.rig) return;
  const rig = animal.rig;
  const maxWidth = animal.rigMaxWidth || DEFAULT_RIG_MAX_WIDTH;

  const rigOutDir = path.join(animalOutDir, "rig");
  fs.rmSync(rigOutDir, { recursive: true, force: true });
  fs.mkdirSync(rigOutDir, { recursive: true });

  // Trims a layer to its own content bounding box and reports where that
  // box's top-left corner sits in the shared authoring canvas (sharp's
  // trimOffsetLeft/Top are the *negative* of that position — see
  // resolveTrimOrigin) — every downstream coordinate (pivots, anchor
  // offsets) is computed relative to this so it stays correct regardless of
  // how much blank margin trim() strips off any individual layer.
  async function trimLayer(label, relSrcPath) {
    const src = resolveSource(`Animal "${animal.id}" rig`, relSrcPath, `rig layer "${label}"`);
    const { data, info } = await sharp(src).trim().png().toBuffer({ resolveWithObject: true });
    return { data, info, contentOrigin: { x: -info.trimOffsetLeft, y: -info.trimOffsetTop } };
  }

  async function writeLayer(name, trimmed, scale) {
    const outWidth = Math.max(1, Math.round(trimmed.info.width * scale));
    const outHeight = Math.max(1, Math.round(trimmed.info.height * scale));
    const file = `${name}.png`;
    await sharp(trimmed.data)
      .resize({ width: outWidth, height: outHeight })
      .png()
      .toFile(path.join(rigOutDir, file));
    return { file, widthPx: outWidth, heightPx: outHeight };
  }

  const bodyTrimmed = await trimLayer("body", path.join(rig.sourceDir, rig.bodyLayer));
  // The one scale factor every layer of this animal shares, derived from the
  // body layer's own trimmed content width (mirrors how buildWalkFrames/
  // buildAnimalStatic size a whole-body frame to maxWidth) — reused as-is
  // for every limb below instead of each fitting itself to maxWidth.
  const scale = maxWidth / bodyTrimmed.info.width;
  const anchor = rig.anchor;

  const bodyOut = await writeLayer("body", bodyTrimmed, scale);
  const body = {
    ...bodyOut,
    drawOffset: {
      x: (bodyTrimmed.contentOrigin.x - anchor.x) * scale,
      y: (bodyTrimmed.contentOrigin.y - anchor.y) * scale,
    },
  };

  const limbs = [];
  for (const limb of rig.limbs) {
    const trimmed = await trimLayer(limb.name, path.join(rig.sourceDir, limb.layer));
    const out = await writeLayer(limb.name, trimmed, scale);
    limbs.push({
      name: limb.name,
      ...out,
      // Where the pivot sits inside this layer's own trimmed bitmap — for
      // drawImage's top-left-corner draw convention (see engine.js).
      pivotLocal: {
        x: (limb.pivot.x - trimmed.contentOrigin.x) * scale,
        y: (limb.pivot.y - trimmed.contentOrigin.y) * scale,
      },
      // Where the pivot sits relative to the body's own anchor point — this
      // is where engine.js translates to before rotating the limb.
      anchorOffset: {
        x: (limb.pivot.x - anchor.x) * scale,
        y: (limb.pivot.y - anchor.y) * scale,
      },
    });
  }

  fs.writeFileSync(path.join(rigOutDir, "rig.json"), JSON.stringify({ body, limbs }, null, 2));
  console.log(`  rig/ (body + ${limbs.length} limb layer(s), scale ${scale.toFixed(3)})`);
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
    await writeZones(scene, sceneOutDir);
  }

  for (const animal of config.animals) {
    if (animal.model3d) continue; // GLB models load directly at runtime.
    console.log(`Animal: ${animal.id} (${animal.label || animal.id})`);
    const animalOutDir = path.join(ANIMALS_OUT_DIR, animal.id);
    fs.mkdirSync(animalOutDir, { recursive: true });
    await buildAnimalStatic(animal, animalOutDir);
    await buildWalkFrames(animal, animalOutDir);
    await buildRig(animal, animalOutDir);

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

// Exported so a one-off script can rebuild just one piece (e.g. buildRig
// after re-cutting rig layers from a manually replaced source photo)
// without running the full pipeline, which would otherwise regenerate
// animal.png from the original raw photo and clobber that replacement.
module.exports = { buildRig, buildAnimalStatic, buildWalkFrames, ROOT, ANIMALS_OUT_DIR, CONFIG_PATH };

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
