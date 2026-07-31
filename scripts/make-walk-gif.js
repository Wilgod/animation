// Quick preview: composites a scene's already-generated walk-cycle frames
// (from `npm run prepare-assets`) centered over its background, walking in
// place, and encodes a looping GIF. Useful to sanity-check a new animal's
// walk cycle before authoring a real path in the editor.
//
// Usage: node scripts/make-walk-gif.js [--scene <id>]
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const ffmpegPath = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");

ffmpeg.setFfmpegPath(ffmpegPath);

const ROOT = path.join(__dirname, "..");
const CONFIG_PATH = path.join(ROOT, "config", "scenes.json");
const TMP_COMPOSITE_DIR = path.join(ROOT, "output", "walk_preview_frames");

const GIF_FPS = 8;
const GIF_WIDTH = 800;

function resolveSceneId() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const scenes = config.scenes || [];
  if (scenes.length === 0) throw new Error("config/scenes.json has no scenes defined.");

  const flagIndex = process.argv.indexOf("--scene");
  const requested = flagIndex >= 0 ? process.argv[flagIndex + 1] : null;
  if (requested) {
    if (!scenes.some((s) => s.id === requested)) {
      throw new Error(`Unknown scene "${requested}". Available: ${scenes.map((s) => s.id).join(", ")}`);
    }
    return requested;
  }
  return scenes[0].id;
}

async function main() {
  const sceneId = resolveSceneId();
  const sceneDir = path.join(ROOT, "assets", sceneId);
  const backgroundFile = path.join(sceneDir, "background.jpg");
  const framesDir = path.join(sceneDir, "walk_frames");
  const outputGif = path.join(ROOT, "output", `${sceneId}-walk-preview.gif`);

  if (!fs.existsSync(framesDir)) {
    throw new Error(
      `No walk_frames found for scene "${sceneId}" — this scene has no motionGrid configured, ` +
        "or you haven't run `npm run prepare-assets` yet."
    );
  }

  const frameFiles = fs
    .readdirSync(framesDir)
    .filter((f) => f.endsWith(".png"))
    .sort();
  if (frameFiles.length === 0) throw new Error(`${framesDir} has no frame files.`);

  fs.rmSync(TMP_COMPOSITE_DIR, { recursive: true, force: true });
  fs.mkdirSync(TMP_COMPOSITE_DIR, { recursive: true });

  const bgMeta = await sharp(backgroundFile).metadata();
  const firstFrameMeta = await sharp(path.join(framesDir, frameFiles[0])).metadata();
  const centerLeft = Math.round((bgMeta.width - firstFrameMeta.width) / 2);
  const centerTop = Math.round((bgMeta.height - firstFrameMeta.height) / 2);

  for (let i = 0; i < frameFiles.length; i++) {
    const composited = await sharp(backgroundFile)
      .composite([{ input: path.join(framesDir, frameFiles[i]), left: centerLeft, top: centerTop }])
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(TMP_COMPOSITE_DIR, `composite_${String(i).padStart(2, "0")}.png`), composited);
  }

  await new Promise((resolve, reject) => {
    const filter = `fps=${GIF_FPS},scale=${GIF_WIDTH}:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse`;
    ffmpeg()
      .input(path.join(TMP_COMPOSITE_DIR, "composite_%02d.png"))
      .inputFPS(GIF_FPS)
      .outputOptions(["-filter_complex", filter])
      .on("error", reject)
      .on("end", resolve)
      .save(outputGif);
  });

  const stat = fs.statSync(outputGif);
  console.log(`Done: ${outputGif} (${(stat.size / 1024).toFixed(0)} KB)`);

  fs.rmSync(TMP_COMPOSITE_DIR, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
