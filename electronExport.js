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

// Frame capture is the memory-heavy phase: every hidden 4K capture window
// holds its own full-size canvases + WebGL buffers, and each captured frame
// is a 33-75 MB native bitmap in this (main) process. Running 4 of those at
// once (Batch Export / Generate Video) exhausted memory and Electron aborted
// with 0xE0000008. Cap how many captures run at a time across the whole app;
// extra exports just queue, and ffmpeg encoding still overlaps freely.
const MAX_CONCURRENT_CAPTURES = 2;
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

async function captureFrames({ port, sceneId, layoutId, framesDir, onProgress }) {
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
    const canvasRect = await win.webContents.executeJavaScript(
      `(() => { const r = document.getElementById('stage').getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }; })()`
    );

    const frameCount = Math.max(1, Math.round((totalMs / 1000) * FPS));

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
      const resized = image.resize({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, quality: "best" });
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

function encodeVideo(framesDir, outputFile, audioPath) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg().input(path.join(framesDir, "frame_%05d.jpg")).inputFPS(FPS);
    const outputOptions = ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-r", String(FPS)];
    if (audioPath) {
      cmd.input(audioPath);
      outputOptions.push("-map", "0:v:0", "-map", "1:a:0", "-c:a", "aac", "-b:a", "192k", "-shortest");
    }
    cmd
      .outputOptions(outputOptions)
      .on("error", reject)
      .on("end", resolve)
      .save(outputFile);
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

// port: local server port already running (caller's responsibility to start it)
// sceneId: which scene to render
// outputDir: where the final video/gif should be written
// gif: also produce a palette-optimized GIF alongside the MP4
// onProgress(frame, total): optional per-frame progress callback
// sequence: optional 1-based position within a multi-background batch (Batch
// Export / Generate Video's "N" selected backgrounds) — appended to the
// filename alongside the timestamp so a batch's videos are visibly grouped
// and, since timestampSuffix() only has 1-second resolution, still guaranteed
// distinct filenames even if two exports in the same batch land in the same
// second (same-scene reruns without a sequence would otherwise risk
// overwriting each other).
async function exportScene({ port, sceneId, layoutId, name, outputDir, gif = false, onProgress, sequence }) {
  const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), "pathanim-frames-"));
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    const { frameCount, audioPath } = await withCaptureSlot(() =>
      captureFrames({ port, sceneId, layoutId, framesDir, onProgress })
    );

    const stamp = timestampSuffix();
    const seqSuffix = sequence != null ? `-${sequence}` : "";
    const base = name || sceneId;
    const outputFile = path.join(outputDir, `${base}-${stamp}${seqSuffix}.mp4`);
    await encodeVideo(framesDir, outputFile, audioPath);

    let outputGif = null;
    if (gif) {
      outputGif = path.join(outputDir, `${base}-${stamp}${seqSuffix}.gif`);
      await encodeGif(framesDir, outputGif);
    }

    return { outputFile, outputGif, frameCount };
  } finally {
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
}

module.exports = { exportScene };
