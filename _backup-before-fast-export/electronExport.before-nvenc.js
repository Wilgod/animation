const path = require("path");
const fs = require("fs");
const os = require("os");
const { BrowserWindow } = require("electron");
const ffmpeg = require("fluent-ffmpeg");

// ffmpeg-static's resolved path points *inside* app.asar when packaged,
// which can't be spawned (asar's fs transparency covers reads, not exec).
// asarUnpack (see package.json "build" config) puts a real, executable copy
// on disk at the equivalent app.asar.unpacked path — rewrite to that. In
// dev (no asar) the path never contains "app.asar", so this is a no-op.
const ffmpegPath = require("ffmpeg-static").replace("app.asar", "app.asar.unpacked");
ffmpeg.setFfmpegPath(ffmpegPath);

const FPS = 60;
const GIF_FPS = 15;
const GIF_WIDTH = 800;
const CANVAS_WIDTH = 3840;
const CANVAS_HEIGHT = 2160;

// Output size per video format. "short" (YouTube Shorts, 9:16) renders the
// normal 16:9 scene and keeps only its full-height centre strip — auto-
// generated paths keep the animals inside that strip (see app.js videoFrame).
const VIDEO_SIZES = {
  landscape: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
  short: { width: 1080, height: 1920 },
};

function videoSize(format) {
  return VIDEO_SIZES[format] || VIDEO_SIZES.landscape;
}

// Frame capture is the memory-heavy phase: every hidden 4K capture window
// holds its own full-size canvases + WebGL buffers, and each captured frame
// is a 33-75 MB native bitmap in this (main) process. Running 4 of those at
// once (Batch Export / Generate Video) exhausted memory and Electron aborted
// with 0xE0000008. Cap how many exports run at a time across the whole app;
// extra exports just queue. The slot is held through ffmpeg encoding too:
// 4K60 libx264 already saturates every CPU core, so letting the next capture
// start while earlier videos were still encoding made all of them crawl and
// delayed every finished MP4 instead of delivering each one as soon as it
// was ready.
// Default 2. With frames now streamed straight to ffmpeg (no JPEG backlog)
// more can be tried: set PATHANIM_MAX_EXPORTS=3 (1-4) before starting the
// app. Each running export also runs its own 4K x264 encoder, so a higher
// number only helps while the CPU still has spare capacity.
const MAX_CONCURRENT_CAPTURES = Math.max(1, Math.min(4, Math.round(Number(process.env.PATHANIM_MAX_EXPORTS)) || 2));
let activeCaptures = 0;
const captureQueue = [];
async function withCaptureSlot(fn) {
  if (activeCaptures >= MAX_CONCURRENT_CAPTURES) {
    await new Promise((resolve) => captureQueue.push(resolve));
  }
  activeCaptures++;
  try {
    return await fn();
  } finally {
    activeCaptures--;
    captureQueue.shift()?.();
  }
}

// NativeImage bitmaps live outside the V8 heap, so V8 doesn't feel their
// size and lets hundreds of frames pile up before collecting. Force a GC
// every so often during capture to release them promptly.
require("v8").setFlagsFromString("--expose-gc");
const forceGc = require("vm").runInNewContext("gc");
const GC_EVERY_N_FRAMES = 20;

// Runs *inside* the headless BrowserWindow (serialized via toString() below,
// never executed in Node). Renders every active animal's walk sound into one
// offline audio mix, matching the live editor's speed-synced looping
// (updateAnimalAudio in app.js) so exported sound matches preview sound.
// Returns a base64-encoded WAV string, or null if the scene has no audio.
async function __exportSceneAudio() {
  function audioBufferToWavBase64(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const numFrames = buffer.length;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = numFrames * blockAlign;
    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);

    function writeString(offset, str) {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    }

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    const channelData = [];
    for (let c = 0; c < numChannels; c++) channelData.push(buffer.getChannelData(c));

    let offset = 44;
    for (let i = 0; i < numFrames; i++) {
      for (let c = 0; c < numChannels; c++) {
        const s = Math.max(-1, Math.min(1, channelData[c][i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        offset += 2;
      }
    }

    let binary = "";
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  const ids = window.AnimEngine.getActorIds();
  if (!ids || ids.length === 0) return null;

  const totalMs = window.AnimEngine.getTotalDurationMs();
  if (!totalMs || totalMs <= 0) return null;

  const config = await fetch("/api/config").then((r) => r.json());
  const animalById = new Map((config.animals || []).map((a) => [a.id, a]));
  const tuning = window.__walkSoundTuning || {
    BASE_WALK_SOUND_SPEED_PX_PER_SEC: 150,
    WALK_SOUND_RATE_MIN: 0.3,
    WALK_SOUND_RATE_MAX: 3,
  };

  const jobs = [];
  for (const id of ids) {
    const def = animalById.get(id);
    const src = def && def.walkSound && def.walkSound.source;
    if (!src) continue;
    const totalDurMs = window.AnimEngine.getActorTotalDurationMs(id);
    if (totalDurMs <= 0) continue;
    jobs.push({
      id,
      src,
      volume: def.walkSound.volume ?? 1,
      // Wing/fin sounds keep time with a time-driven clip, not with speed
      // (or a continuous texture, e.g. a snail's slime, with walkSound.fixedRate)
      fixedRate: def.walkSound.fixedRate ?? def.modelAnimation === "fly",
      startAtMs: window.AnimEngine.getActorStartAtMs(id),
      totalDurMs,
    });
  }
  if (jobs.length === 0) return null;

  const SAMPLE_RATE = 44100;
  const totalFrames = Math.max(1, Math.ceil((totalMs / 1000) * SAMPLE_RATE));
  const offlineCtx = new OfflineAudioContext(2, totalFrames, SAMPLE_RATE);
  const RATE_STEP_MS = 33; // ~matches export FPS granularity

  for (const job of jobs) {
    const arrayBuffer = await fetch(job.src).then((r) => r.arrayBuffer());
    const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    // OfflineAudioContext has no volume cap the way HTMLAudioElement does,
    // so a plain gain node handles both quieter (<1) and louder (>1) —
    // matching the live-preview volume from app.js's applyAudioVolume.
    const gainNode = offlineCtx.createGain();
    source.connect(gainNode).connect(offlineCtx.destination);

    const startSec = job.startAtMs / 1000;
    const durSec = job.totalDurMs / 1000;
    // Short fades where the sound starts and stops, so it never clicks.
    const fadeSec = Math.min(0.03, durSec / 4);
    gainNode.gain.setValueAtTime(0, startSec);
    gainNode.gain.linearRampToValueAtTime(job.volume, startSec + fadeSec);
    gainNode.gain.setValueAtTime(job.volume, startSec + durSec - fadeSec);
    gainNode.gain.linearRampToValueAtTime(0, startSec + durSec);

    const times = [];
    const rates = [];
    for (let t = 0; t <= job.totalDurMs; t += RATE_STEP_MS) {
      const speed = window.AnimEngine.getActorSpeedPxPerSec(job.id, t);
      const rate = job.fixedRate ? 1 : Math.min(
        tuning.WALK_SOUND_RATE_MAX,
        Math.max(tuning.WALK_SOUND_RATE_MIN, speed / tuning.BASE_WALK_SOUND_SPEED_PX_PER_SEC)
      );
      times.push(startSec + t / 1000);
      rates.push(rate);
    }
    if (times[times.length - 1] < startSec + durSec) {
      times.push(startSec + durSec);
      rates.push(rates[rates.length - 1]);
    }

    source.playbackRate.setValueAtTime(rates[0], Math.max(0, times[0]));
    for (let i = 1; i < times.length; i++) {
      source.playbackRate.linearRampToValueAtTime(rates[i], times[i]);
    }

    source.start(startSec);
    source.stop(startSec + durSec);
  }

  const rendered = await offlineCtx.startRendering();
  // Several animals' sounds add up. If the mix would clip, lower the whole
  // soundtrack evenly (keeps its dynamics) to leave headroom for AAC encoding.
  let peak = 0;
  for (let c = 0; c < rendered.numberOfChannels; c++) {
    const data = rendered.getChannelData(c);
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  }
  const HEADROOM_PEAK = 0.7; // -3 dBFS: AAC overshoots sharp clicks by ~2 dB
  if (peak > HEADROOM_PEAK) {
    const scale = HEADROOM_PEAK / peak;
    for (let c = 0; c < rendered.numberOfChannels; c++) {
      const data = rendered.getChannelData(c);
      for (let i = 0; i < data.length; i++) data[i] *= scale;
    }
  }
  return audioBufferToWavBase64(rendered);
}

async function renderSceneAudio(win) {
  return win.webContents.executeJavaScript(`(${__exportSceneAudio.toString()})()`);
}

// win.setContentSize() on an offscreen BrowserWindow is unreliable on its
// *first* call after creation on this machine (a HiDPI, scaleFactor:2
// display) — it silently applies at half the requested size, as if using a
// stale scale factor, and only settles to the correct size on a repeated
// call with the same target. Retrying (rather than a single call) is what
// actually fixes it; a plain delay between calls does not.
function setContentSizeReliably(win, width, height) {
  for (let attempt = 0; attempt < 5; attempt++) {
    win.setContentSize(width, height);
    const [actualW, actualH] = win.getContentSize();
    if (actualW === width && actualH === height) return;
  }
}

async function captureFrames({ port, sceneId, layoutId, framesDir, minDurationMs = 0, format = "landscape", onProgress, onFrame = null }) {
  // Created small and offscreen, then grown via setContentSize() below —
  // Windows caps a *newly created* window (even a hidden/offscreen one) to
  // roughly the monitor's resolution when a size is requested directly in
  // the constructor, but that cap doesn't apply to an offscreen window's
  // setContentSize() calls made after creation. On a screen smaller than
  // the 4K export canvas, asking for the full size up front silently left
  // the page too small for its own content, so a real scrollbar appeared
  // and got baked into every captured frame.
  const win = new BrowserWindow({
    width: 400,
    height: 300,
    useContentSize: true,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, offscreen: true },
  });

  try {
    // Starting guess — grown further below, once the page has actually
    // loaded, to whatever its content really needs. The page has its own
    // layout padding around the canvas (even in export mode) plus hint
    // text/a timeline strip below it, so a fixed guess previously fell
    // short: the window overflowed, a scrollbar ate into the viewport, and
    // the canvas's captured bounding rect ended up clipped/misaligned as a
    // result — the exported video wasn't the full 3840x2160 canvas.
    setContentSizeReliably(win, CANVAS_WIDTH + 200, CANVAS_HEIGHT + 200);

    // layoutId: render a generated layout (see /api/auto-layout) instead of
    // the scene's own saved one.
    const layoutParam = layoutId ? `&layout=${encodeURIComponent(layoutId)}` : "";
    await win.loadURL(`http://127.0.0.1:${port}/index.html?export=1&scene=${encodeURIComponent(sceneId)}${layoutParam}`);
    await win.webContents.executeJavaScript(
      `new Promise((resolve) => { const check = () => window.__ready ? resolve() : setTimeout(check, 30); check(); })`
    );

    const totalMs = await win.webContents.executeJavaScript(`window.AnimEngine.getTotalDurationMs()`);
    if (!totalMs || totalMs <= 0) {
      throw new Error(
        `Scene "${sceneId}" has no saved path with duration. Open the editor, select this ` +
          "scene, place at least two waypoints with a nonzero duration between them, and " +
          "click Save Path first."
      );
    }

    // Grow the window's content area to fit whatever the page actually
    // needs (never shrink below the starting guess) so nothing overflows
    // into a scrollbar, then re-measure — resizing can shift layout.
    const needed = await win.webContents.executeJavaScript(
      `({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight })`
    );
    const [currentW, currentH] = win.getContentSize();
    setContentSizeReliably(win, Math.max(currentW, needed.width), Math.max(currentH, needed.height));

    // Capture the canvas element's own bounding rect (not an assumed (0,0)
    // origin) — mirrors Puppeteer's element-scoped screenshot behavior and
    // stays correct regardless of surrounding page layout/padding.
    const stageRect = await win.webContents.executeJavaScript(
      `(() => { const r = document.getElementById('stage').getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`
    );
    // A non-16:9 format captures only the centred part of the canvas with
    // that format's aspect ratio (full height for a portrait Short).
    const size = videoSize(format);
    const cropWidth = Math.min(stageRect.width, (stageRect.height * size.width) / size.height);
    const canvasRect = {
      x: Math.round(stageRect.x + (stageRect.width - cropWidth) / 2),
      y: Math.round(stageRect.y),
      width: Math.round(cropWidth),
      height: Math.round(stageRect.height),
    };

    // minDurationMs: long-video segments are padded to their full slot
    // length (animals have already walked off by then) so every segment of
    // a joined video lasts exactly as long as asked.
    const frameCount = Math.max(1, Math.round((Math.max(totalMs, minDurationMs) / 1000) * FPS));

    for (let i = 0; i < frameCount; i++) {
      const t = (i * 1000) / FPS;
      await win.webContents.executeJavaScript(`window.AnimEngine.renderFrame(${t})`);
      // capturePage() returns a bitmap at the window's *physical* pixel
      // resolution (display scale factor applied), not the logical
      // pixels the rect was requested in — resize back to the exact
      // target so output is deterministic regardless of this machine's
      // display DPI (and so the main editor window can stay at native
      // HiDPI resolution rather than forcing scale-factor 1 app-wide).
      const image = await win.webContents.capturePage(canvasRect);
      // Skip the resize when the capture already has the exact output size
      // (a display at 100% scaling): a "best"-quality 4K resize on every
      // frame is costly, and a same-size resize changes nothing.
      const captured = image.getSize();
      if (i === 0) console.log(`[export] ${sceneId}: captured ${captured.width}x${captured.height}, output ${size.width}x${size.height}`);
      const resized =
        captured.width === size.width && captured.height === size.height
          ? image
          : image.resize({ width: size.width, height: size.height, quality: "best" });
      if (onFrame) {
        // Streamed straight into the running encoder: no JPEG, no disk.
        await onFrame(resized, size);
        onProgress?.(i + 1, frameCount);
        if (i % GC_EVERY_N_FRAMES === GC_EVERY_N_FRAMES - 1) forceGc();
        continue;
      }
      // JPEG, not PNG: these frames are throwaway intermediates immediately
      // re-encoded to lossy H.264 by ffmpeg below, and profiling showed
      // PNG's own encode step (resized.toPNG()) was ~78% of total export
      // time — PNG compression is CPU-heavy on complex/photographic frames.
      // JPEG at this quality is visually lossless once re-compressed to
      // H.264 but encodes dramatically faster.
      const framePath = path.join(framesDir, `frame_${String(i).padStart(5, "0")}.jpg`);
      fs.writeFileSync(framePath, resized.toJPEG(92));
      onProgress?.(i + 1, frameCount);
      if (i % GC_EVERY_N_FRAMES === GC_EVERY_N_FRAMES - 1) forceGc();
    }

    // Rendered here (not after win.destroy()) since it needs the same
    // AnimEngine actor state — populated by the page's own scene-load logic
    // when it loaded the export URL above — that the frame loop just used.
    const audioBase64 = await renderSceneAudio(win);
    let audioPath = null;
    if (audioBase64) {
      audioPath = path.join(framesDir, "audio.wav");
      fs.writeFileSync(audioPath, Buffer.from(audioBase64, "base64"));
    }

    return { frameCount, audioPath };
  } finally {
    win.destroy();
  }
}

// segment: a piece of a joined long video. Every segment must have
// identical stream layouts for the concat step to copy them without
// re-encoding, so it always gets a 48 kHz stereo AAC track (silence when the
// scene has no sound) padded/trimmed to exactly the video's length.
function encodeVideo(framesDir, outputFile, audioPath, frameCount, onProgress, { segment = false } = {}) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg().input(path.join(framesDir, "frame_%05d.jpg")).inputFPS(FPS);
    const outputOptions = ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-r", String(FPS)];
    if (segment) {
      if (audioPath) cmd.input(audioPath);
      else cmd.input("anullsrc=r=48000:cl=stereo").inputFormat("lavfi");
      outputOptions.push(
        "-map", "0:v:0", "-map", "1:a:0",
        "-af", "apad", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-t", (frameCount / FPS).toFixed(3)
      );
    } else if (audioPath) {
      cmd.input(audioPath);
      outputOptions.push("-map", "0:v:0", "-map", "1:a:0", "-c:a", "aac", "-b:a", "192k", "-shortest");
    }
    cmd
      .outputOptions(outputOptions)
      .on("progress", (p) => {
        if (p.frames) onProgress?.(Math.min(p.frames, frameCount), frameCount, "encode");
      })
      .on("error", reject)
      .on("end", resolve)
      .save(outputFile);
  });
}

// Direct-to-encoder export: each captured frame is piped into an ffmpeg
// process as raw pixels while capture keeps going, instead of every frame
// being saved as a JPEG and encoded in a second pass afterwards. Same
// encoder settings as encodeVideo (libx264, CRF 18, 60 fps, yuv420p), so
// quality is unchanged (if anything slightly better: no JPEG step).
// Set PATHANIM_LEGACY_EXPORT=1 to go back to the JPEG-frames path.
const DIRECT_EXPORT = process.env.PATHANIM_LEGACY_EXPORT !== "1";

function startFrameEncoder(outputFile, { width, height }) {
  const args = [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "rawvideo", "-pix_fmt", "bgra", "-s", `${width}x${height}`, "-framerate", String(FPS), "-i", "pipe:0",
    "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-r", String(FPS),
    "-f", "mp4", outputFile,
  ];
  const proc = require("child_process").spawn(ffmpegPath, args, { stdio: ["pipe", "ignore", "pipe"] });
  let stderr = "";
  let failure = null;
  proc.stderr.on("data", (d) => (stderr += d));
  const exited = new Promise((resolve) => {
    proc.on("error", (err) => { failure = err; resolve(); });
    proc.on("close", (code) => {
      if (code !== 0 && !failure) failure = new Error(`ffmpeg (video encode) exited with code ${code}: ${stderr.trim()}`);
      resolve();
    });
  });
  proc.stdin.on("error", (err) => { if (!failure) failure = err; });

  return {
    // Waits for the pipe to drain, so at most a frame or two is ever held
    // in memory and capture runs at the encoder's pace when it's slower.
    async write(image, size) {
      if (failure) throw failure;
      const bitmap = image.toBitmap();
      if (bitmap.length !== size.width * size.height * 4) {
        throw new Error(`Unexpected frame buffer size ${bitmap.length} for ${size.width}x${size.height}`);
      }
      if (!proc.stdin.write(bitmap)) {
        await new Promise((resolve) => {
          const done = () => { proc.stdin.off("drain", done); proc.off("close", done); resolve(); };
          proc.stdin.once("drain", done);
          proc.once("close", done);
        });
      }
      if (failure) throw failure;
    },
    async finish() {
      proc.stdin.end();
      await exited;
      if (failure) throw failure;
    },
    abort() {
      try { proc.stdin.destroy(); } catch {}
      try { proc.kill(); } catch {}
    },
  };
}

// Adds the audio track to a video-only encode without touching the video
// (stream copy), with exactly the same audio handling as encodeVideo.
function muxAudio(videoFile, outputFile, audioPath, frameCount, { segment = false } = {}) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg().input(videoFile);
    const outputOptions = ["-c:v", "copy"];
    if (segment) {
      if (audioPath) cmd.input(audioPath);
      else cmd.input("anullsrc=r=48000:cl=stereo").inputFormat("lavfi");
      outputOptions.push(
        "-map", "0:v:0", "-map", "1:a:0",
        "-af", "apad", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-t", (frameCount / FPS).toFixed(3)
      );
    } else if (audioPath) {
      cmd.input(audioPath);
      outputOptions.push("-map", "0:v:0", "-map", "1:a:0", "-c:a", "aac", "-b:a", "192k", "-shortest");
    } else {
      outputOptions.push("-map", "0:v:0");
    }
    cmd.outputOptions(outputOptions).format("mp4").on("error", reject).on("end", resolve).save(outputFile);
  });
}

// Single-pass palette-optimized GIF: generates a palette from the actual
// frames then reuses it, which looks much better than ffmpeg's default
// fixed palette for a photo-like background.
function encodeGif(framesDir, outputFile) {
  return new Promise((resolve, reject) => {
    const filter = `fps=${GIF_FPS},scale=${GIF_WIDTH}:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse`;
    ffmpeg()
      .input(path.join(framesDir, "frame_%05d.jpg"))
      .inputFPS(FPS)
      .outputOptions(["-filter_complex", filter])
      .on("error", reject)
      .on("end", resolve)
      .save(outputFile);
  });
}

// Sortable, filename-safe local timestamp (e.g. "20260731-140532") so
// repeated exports of the same scene land as separate files instead of each
// one overwriting the last.
function timestampSuffix() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// Strip characters Windows forbids in filenames (labels are Chinese text,
// but may contain things like "/" or ":").
function safeFileName(text) {
  return String(text).replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").replace(/\s+/g, " ").trim();
}

// Paths handed out to in-flight exports. timestampSuffix() only has 1-second
// resolution, so two exports with the same name in the same second (e.g. a
// batch) would otherwise collide; instead of numbering every file, only a
// clash gets a " (2)", " (3)"… suffix.
const reservedOutputs = new Set();
function reserveOutputPath(outputDir, base, ext) {
  for (let n = 1; ; n++) {
    const file = path.join(outputDir, n === 1 ? `${base}${ext}` : `${base} (${n})${ext}`);
    if (!reservedOutputs.has(file) && !fs.existsSync(file)) {
      reservedOutputs.add(file);
      return file;
    }
  }
}

// port: local server port already running (caller's responsibility to start it)
// sceneId: which scene to render
// outputDir: where the final video/gif should be written
// gif: also produce a palette-optimized GIF alongside the MP4
// onProgress(frame, total, phase): optional progress callback; phase is
// "capture" while rendering frames, then "encode" while ffmpeg builds the MP4
// minDurationMs / segment: see captureFrames / encodeVideo (long-video pieces)
// format: "landscape" (4K 16:9, default) or "short" (1080x1920 YouTube Short)
async function exportScene({ port, sceneId, layoutId, name, outputDir, gif = false, minDurationMs = 0, segment = false, format = "landscape", onProgress }) {
  const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), "pathanim-frames-"));
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    return await withCaptureSlot(async () => {
      const direct = DIRECT_EXPORT && !gif; // a GIF is made from saved frames
      const videoOnlyFile = path.join(framesDir, "video-only.mp4");
      const encoder = direct ? startFrameEncoder(videoOnlyFile, videoSize(format)) : null;
      let frameCount, audioPath;
      try {
        ({ frameCount, audioPath } = await captureFrames({
          port,
          sceneId,
          layoutId,
          framesDir,
          minDurationMs,
          format,
          onProgress: (frame, total) => onProgress?.(frame, total, "capture"),
          onFrame: encoder ? (image, size) => encoder.write(image, size) : null,
        }));
        if (encoder) await encoder.finish();
      } catch (err) {
        encoder?.abort();
        throw err;
      }

      const base = `${safeFileName(name || sceneId)}-${timestampSuffix()}`;
      const outputFile = reserveOutputPath(outputDir, base, ".mp4");
      // Encode under a .part name and rename when done, so a failed or
      // interrupted encode never leaves a broken .mp4 behind (long-video
      // screens are kept and reused later, so that matters).
      const partFile = outputFile.replace(/\.mp4$/, ".part.mp4");
      try {
        if (direct) {
          onProgress?.(frameCount, frameCount, "encode");
          await muxAudio(videoOnlyFile, partFile, audioPath, frameCount, { segment });
        } else {
          await encodeVideo(framesDir, partFile, audioPath, frameCount, onProgress, { segment });
        }
        fs.renameSync(partFile, outputFile);
      } catch (err) {
        fs.rmSync(partFile, { force: true });
        throw err;
      } finally {
        reservedOutputs.delete(outputFile);
      }

      let outputGif = null;
      if (gif) {
        outputGif = outputFile.replace(/\.mp4$/, ".gif");
        await encodeGif(framesDir, outputGif);
      }

      return { outputFile, outputGif, frameCount };
    });
  } finally {
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
}

// Joins long-video segments (all encoded with segment: true, so their
// streams match) into one MP4 without re-encoding — a 2-hour 4K video is
// joined in about the time it takes to copy the files.
// onProgress(seconds): optional, how much of the output is written so far.
function joinVideos({ files, outputDir, name, onProgress }) {
  fs.mkdirSync(outputDir, { recursive: true });
  const outputFile = reserveOutputPath(outputDir, `${safeFileName(name || "long-video")}-${timestampSuffix()}`, ".mp4");
  const listFile = path.join(os.tmpdir(), `pathanim-concat-${process.pid}-${Date.now()}.txt`);
  fs.writeFileSync(listFile, files.map((f) => `file '${f.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n"));
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listFile)
      .inputOptions(["-f", "concat", "-safe", "0"])
      .outputOptions(["-c", "copy", "-movflags", "+faststart"])
      .on("progress", (p) => {
        const m = /^(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(p.timemark || "");
        if (m) onProgress?.(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]));
      })
      .on("error", reject)
      .on("end", () => resolve({ outputFile }))
      .save(outputFile);
  }).finally(() => fs.rmSync(listFile, { force: true }));
}

// Whether a media file has an audio track. ffmpeg-static ships no ffprobe,
// so read it from `ffmpeg -i`'s stream listing instead.
function hasAudioStream(file) {
  return new Promise((resolve, reject) => {
    const proc = require("child_process").spawn(ffmpegPath, ["-hide_banner", "-i", file]);
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("error", reject);
    proc.on("close", () => {
      if (!/Stream #.*Video:/.test(stderr)) reject(new Error(`Not a video file: ${file}`));
      else resolve(/Stream #.*Audio:/.test(stderr));
    });
  });
}

// A media file's length in seconds, read from `ffmpeg -i` (no ffprobe).
function probeDuration(file) {
  return new Promise((resolve, reject) => {
    const proc = require("child_process").spawn(ffmpegPath, ["-hide_banner", "-i", file]);
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("error", reject);
    proc.on("close", () => {
      const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr);
      if (!m) reject(new Error(`Not a video file: ${file}`));
      else resolve(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]));
    });
  });
}

// Re-encodes an opening video (片頭) of any size/frame rate into the same
// format as segment-encoded exports (60fps H.264 + 48 kHz stereo AAC, at the
// video format's size), so joinVideos can put it in front of them.
// Letterboxed, never stretched.
async function encodeIntro(inputFile, outputFile, format = "landscape") {
  const withAudio = await hasAudioStream(inputFile);
  const { width, height } = videoSize(format);
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg().input(inputFile);
    if (!withAudio) cmd.input("anullsrc=r=48000:cl=stereo").inputFormat("lavfi");
    const vf =
      `scale=${width}:${height}:force_original_aspect_ratio=decrease:flags=lanczos,` +
      `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${FPS}`;
    cmd
      .outputOptions([
        "-map", "0:v:0", "-map", withAudio ? "0:a:0" : "1:a:0",
        "-vf", vf, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-r", String(FPS),
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        ...(withAudio ? [] : ["-shortest"]),
      ])
      .on("error", reject)
      .on("end", resolve)
      .save(outputFile);
  });
}

module.exports = { exportScene, joinVideos, encodeIntro, probeDuration };
