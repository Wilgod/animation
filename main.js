const path = require("path");
const fs = require("fs");
const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");

const { start } = require("./server");
const { exportScene, joinVideos, encodeIntro, probeDuration } = require("./electronExport");

const isDev = process.argv.includes("--dev");
const smokeTestExport = process.argv.includes("--smoke-test-export");
const isSmokeTest = process.argv.includes("--smoke-test") || smokeTestExport;
const isExportCli = process.argv.includes("--export");
const wantGifCli = process.argv.includes("--gif");

process.on("uncaughtException", (err) => {
  console.error(`[main] uncaughtException: ${err.stack || err.message}`);
});
process.on("unhandledRejection", (err) => {
  console.error(`[main] unhandledRejection: ${err?.stack || err}`);
});

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

// The packaged config lives inside app.asar, which Windows can't open or
// edit. Packaged builds use an editable copy in userData instead, refreshed
// from the bundled one on upgrade unless the user has edited their copy.
const BUNDLED_CONFIG = path.join(__dirname, "config", "scenes.json");

function configFile() {
  if (!app.isPackaged) return BUNDLED_CONFIG;
  const file = path.join(app.getPath("userData"), "config", "scenes.json");
  const stamp = `${file}.bundled-sha1`;
  const sha1 = (text) => require("crypto").createHash("sha1").update(text).digest("hex");
  const bundled = fs.readFileSync(BUNDLED_CONFIG, "utf8");
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  const lastBundled = fs.existsSync(stamp) ? fs.readFileSync(stamp, "utf8").trim() : null;
  const userEdited = current !== null && sha1(current) !== lastBundled;
  if (current !== bundled && !userEdited) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bundled);
    fs.writeFileSync(stamp, sha1(bundled));
  }
  return file;
}

function resolveSceneId(requested) {
  const config = JSON.parse(fs.readFileSync(configFile(), "utf8"));
  const scenes = config.scenes || [];
  if (scenes.length === 0) throw new Error("config/scenes.json has no scenes defined.");
  if (requested) {
    if (!scenes.some((s) => s.id === requested)) {
      throw new Error(`Unknown scene "${requested}". Available scenes: ${scenes.map((s) => s.id).join(", ")}`);
    }
    return requested;
  }
  if (scenes.length > 1) {
    console.log(`No --scene given, defaulting to "${scenes[0].id}". Available: ${scenes.map((s) => s.id).join(", ")}`);
  }
  return scenes[0].id;
}

let serverInstance = null;
let mainWindow = null; // the first editor window opened — used by the smoke test only
const editorWindows = new Set(); // every open editor window, including mainWindow

function pathsDir() {
  return path.join(app.getPath("userData"), "paths");
}

async function startServer() {
  serverInstance = await start(0, { pathsDir: pathsDir(), configFile: configFile() });
  return serverInstance.address().port;
}

// Each editor window is a full, independent instance of the app (its own
// in-memory scene/path/ornament state, own export lock) that happens to
// share the same local server/config/paths storage — so you can keep
// editing a different scene in one window while another window's video
// export runs in the background, and multiple windows can export at the
// same time without interfering with each other.
async function createEditorWindow(port) {
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  editorWindows.add(win);
  win.on("closed", () => editorWindows.delete(win));

  // The editor's stage + sidebar layout needs more room than the 1440x960
  // default to avoid scrollbars, so start maximized instead of guessing a
  // fixed size that fits every monitor.
  if (!isSmokeTest) {
    win.once("ready-to-show", () => {
      win.maximize();
      win.show();
    });
  }

  if (isDev) win.webContents.openDevTools();

  await win.loadURL(`http://127.0.0.1:${port}/${process.argv.includes('--3d') ? 'gecko-3d.html' : 'index.html'}`);
  return win;
}

// Headless verification mode: open the editor, confirm the page actually
// initialized correctly (scene list populated, engine ready, no console
// errors), print a JSON result, then quit. Not part of normal app usage.
async function runSmokeTest(port) {
  const consoleErrors = [];
  mainWindow.webContents.on("console-message", (event, level, message) => {
    if (level >= 2) consoleErrors.push(message);
  });

  await mainWindow.webContents.executeJavaScript(
    `new Promise((resolve) => { const check = () => window.__ready ? resolve() : setTimeout(check, 30); check(); })`
  );

  const result = await mainWindow.webContents.executeJavaScript(`({
    sceneOptionCount: document.querySelectorAll('#sceneSelect option').length,
    hasAnimEngine: !!window.AnimEngine,
    hasElectronAPI: !!window.electronAPI,
    exportBtnHidden: document.getElementById('exportBtn').hidden,
    openConfigBtnHidden: document.getElementById('openConfigBtn').hidden,
    totalDurationMs: window.AnimEngine.getTotalDurationMs(),
  })`);

  let exportResult = null;
  if (smokeTestExport) {
    await mainWindow.webContents.executeJavaScript(`document.getElementById('exportBtn').click()`);
    exportResult = await mainWindow.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const check = () => {
          const el = document.getElementById('exportProgress');
          if (el.textContent.startsWith('Done:') || el.textContent.startsWith('Export failed')) {
            resolve(el.textContent);
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      })
    `);
  }

  // Exercise Reload Scenes too — clicking it should re-fetch config, keep
  // the current scene selected, and reload without throwing.
  await mainWindow.webContents.executeJavaScript(`document.getElementById('reloadScenesBtn').click()`);
  const reloadResult = await mainWindow.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const check = () => {
        const el = document.getElementById('configStatus');
        if (el.textContent.startsWith('Reloaded') || el.textContent.startsWith('Reload failed')) {
          resolve(el.textContent);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    })
  `);

  const output = { ...result, exportResult, reloadResult, consoleErrors, port };
  // Packaged Windows GUI-subsystem exes don't attach a console, so
  // console.log is invisible when run directly (not a bug) — write the
  // result to a file too so smoke testing works against the packaged app.
  const resultFile = path.join(app.getPath("temp"), "pathanimator-smoketest-result.json");
  fs.writeFileSync(resultFile, JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output));
  console.log(`Result also written to ${resultFile}`);
  app.quit();
}

// CLI export mode: `electron . --export --scene <id> [--gif]` — no visible
// window, just renders the scene to video via the same electronExport.js
// logic the in-app Export button uses, then quits. Replaces the old
// Puppeteer-based export.js CLI.
async function runExportCli(port) {
  const sceneId = resolveSceneId(argValue("--scene"));
  // In a packaged build, __dirname resolves inside the read-only app.asar
  // archive — mkdirSync-ing "output" under it fails (ENOTDIR), since asar
  // isn't a real writable filesystem. Dev mode (unpacked) keeps writing to
  // the repo's own output/ folder as before; packaged builds fall back to
  // the same real, writable folder the in-app Export button already uses.
  const outputDir = app.isPackaged ? app.getPath("videos") : path.join(__dirname, "output");

  console.log(`Scene: ${sceneId}`);
  console.log("Rendering frames deterministically...");

  let lastLogged = 0;
  const { outputFile, outputGif, frameCount } = await exportScene({
    port,
    sceneId,
    outputDir,
    gif: wantGifCli,
    onProgress: (frame, total) => {
      if (frame - lastLogged >= 30 || frame === total) {
        console.log(`  frame ${frame}/${total}`);
        lastLogged = frame;
      }
    },
  });

  console.log(`Captured ${frameCount} frames at 60fps. Done: ${outputFile}`);
  if (outputGif) console.log(`Done: ${outputGif}`);
  app.quit();
}

app.whenReady().then(async () => {
  const port = await startServer();

  if (isExportCli) {
    try {
      await runExportCli(port);
    } catch (err) {
      console.error(err.stack || err.message);
      process.exitCode = 1;
      app.quit();
    }
    return;
  }

  // Registered before the first window loads — the editor asks for it on startup.
  ipcMain.handle("export:defaultDir", () => app.getPath("videos"));
  ipcMain.handle("screens:defaultDir", () => defaultScreensDir());
  ipcMain.handle("intro:default", () => defaultIntroPath());

  mainWindow = await createEditorWindow(port);

  // Resolve with a plain boolean, not the BrowserWindow itself — the
  // renderer's ipcRenderer.invoke() promise rejects if the resolved value
  // can't be structured-cloned across the IPC boundary, and a BrowserWindow
  // instance can't be.
  ipcMain.handle("window:new", async () => {
    await createEditorWindow(port);
    return true;
  });

  // Not scoped to a specific window — exportScene spawns its own hidden
  // capture window per call and runs fully independently of whichever
  // window invoked it, so concurrent exports (from the same or different
  // editor windows) just run in parallel with no shared state between them.
  ipcMain.handle("export:run", async (event, sceneId, opts) => {
    // Long-video screens are kept in the user's screens folder (screensDir,
    // already split into sky/ground/sea/mixed) so they can be reused later.
    // Other segments (a video plus its opening) go to a temp folder that
    // export:join deletes.
    const screensDir = opts?.screensFolder
      ? path.join(resolveScreensDir(opts.screensDir), path.basename(String(opts.screensFolder)))
      : null;
    const segment = !!screensDir || !!opts?.segmentGroup;
    const result = await exportScene({
      port,
      sceneId,
      outputDir: screensDir || (opts?.segmentGroup ? segmentDir(opts.segmentGroup) : resolveOutputDir(opts?.outputDir)),
      gif: !!opts?.gif,
      segment,
      minDurationMs: Number(opts?.minDurationMs) || 0,
      format: opts?.format === "short" ? "short" : "landscape",
      layoutId: opts?.layoutId,
      name: opts?.name,
      onProgress: (frame, total, phase) => {
        // key: lets the editor tell apart concurrent exports of the same scene
        event.sender.send("export:progress", { sceneId, key: opts?.progressKey || sceneId, frame, total, phase });
      },
    });
    return result;
  });

  // files: segment paths from export:run, in play order. With a
  // segmentGroup the segments and their temp folder are removed once the
  // joined video is written; without one (long-video screens from the
  // screens folder) the files are kept so they can be reused.
  ipcMain.handle("export:join", async (event, segmentGroup, files, opts) => {
    const dir = segmentGroup ? segmentDir(segmentGroup) : null;
    const inDir = (files || []).filter((f) =>
      dir
        ? path.dirname(path.resolve(f)) === dir
        : path.isAbsolute(f) && /\.mp4$/i.test(f) && fs.existsSync(f)
    );
    if (inDir.length === 0) throw new Error("No video segments to join.");
    // progressKey + totalSeconds (the segments' combined length): report
    // join progress as export:progress with phase "join", in seconds.
    const key = opts?.progressKey;
    const send = (frame, total, phase) => {
      if (key) event.sender.send("export:progress", { key, frame, total, phase });
    };
    // introPath: optional opening video (片頭) played before the segments.
    if (opts?.introPath) send(0, 0, "intro");
    const intro = opts?.introPath ? await preparedIntro(opts.introPath, opts?.format === "short" ? "short" : "landscape") : null;
    let totalSeconds = Number(opts?.totalSeconds) || 0;
    if (key && intro && totalSeconds > 0) totalSeconds += await probeDuration(intro).catch(() => 0);
    const result = await joinVideos({
      files: intro ? [intro, ...inDir] : inDir,
      outputDir: resolveOutputDir(opts?.outputDir),
      name: opts?.name,
      onProgress: totalSeconds > 0 ? (seconds) => send(Math.min(seconds, totalSeconds), totalSeconds, "join") : null,
    });
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
    return result;
  });

  // The long-video task list (see app.js runLongJob): one file in userData,
  // updated after every finished screen, so a run interrupted by an error,
  // closing the app or a restart can be continued later. longJobOwner is
  // the window currently running it, so a second window doesn't offer to
  // continue the same task at the same time.
  let longJobOwner = null;
  ipcMain.handle("longjob:load", (event) => {
    let job = null;
    try {
      job = JSON.parse(fs.readFileSync(longJobFile(), "utf8"));
    } catch (err) {
      return null;
    }
    // A screen whose file has gone missing is rendered again.
    for (const screen of job.screens || []) {
      if (screen.file && !fs.existsSync(screen.file)) screen.file = null;
    }
    // (A reloaded window that was running it isn't busy for itself.)
    return { job, busy: longJobOwner !== null && longJobOwner !== event.sender.id };
  });
  ipcMain.handle("longjob:save", (event, job) => {
    if (longJobOwner !== event.sender.id) {
      longJobOwner = event.sender.id;
      event.sender.once("destroyed", () => {
        if (longJobOwner === event.sender.id) longJobOwner = null;
      });
    }
    const file = longJobFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(job, null, 2));
    fs.renameSync(`${file}.tmp`, file);
    return true;
  });
  // Stops running it (it stays saved, to continue later).
  ipcMain.handle("longjob:release", (event) => {
    if (longJobOwner === event.sender.id) longJobOwner = null;
    return true;
  });
  ipcMain.handle("longjob:clear", () => {
    longJobOwner = null;
    fs.rmSync(longJobFile(), { force: true });
    return true;
  });

  ipcMain.handle("screens:chooseDir", async (event, current) => {
    const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
      title: "Choose screens folder",
      defaultPath: current || defaultScreensDir(),
      properties: ["openDirectory", "createDirectory"],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Saved screens in the chosen sub-folders (e.g. ["sky", "ground"]) of
  // the screens folder: [{ file, folder, seconds }].
  ipcMain.handle("screens:list", async (event, rootDir, folders) => {
    const root = resolveScreensDir(rootDir);
    const files = [];
    for (const folder of folders || []) {
      const dir = path.join(root, path.basename(String(folder)));
      let names = [];
      try { names = fs.readdirSync(dir); } catch (err) { continue; }
      for (const name of names) {
        if (/\.mp4$/i.test(name) && !/\.part\.mp4$/i.test(name)) files.push({ file: path.join(dir, name), folder });
      }
    }
    // Read lengths a few at a time; cached by path + size + modified time.
    let next = 0;
    async function worker() {
      while (next < files.length) {
        const entry = files[next++];
        entry.seconds = await screenDuration(entry.file).catch(() => 0);
      }
    }
    await Promise.all(Array.from({ length: Math.min(8, files.length) }, worker));
    return files.filter((f) => f.seconds > 0);
  });

  ipcMain.handle("intro:choose", async (event, current) => {
    const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
      title: "Choose opening video (片頭)",
      defaultPath: current || app.getPath("videos"),
      properties: ["openFile"],
      filters: [
        { name: "Videos", extensions: ["mp4", "mov", "m4v", "mkv", "webm", "avi"] },
        { name: "All files", extensions: ["*"] },
      ],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("export:chooseDir", async (event, current) => {
    const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
      title: "Choose output folder",
      defaultPath: current || app.getPath("videos"),
      properties: ["openDirectory", "createDirectory"],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("export:reveal", (event, filePath) => {
    shell.showItemInFolder(filePath);
  });

  ipcMain.handle("config:open", () => {
    return shell.openPath(configFile());
  });

  if (isSmokeTest) {
    await runSmokeTest(port);
    return;
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
});

// The editor's "Output folder" box; blank means the user's Videos folder.
// exportScene creates the folder if it doesn't exist yet.
function resolveOutputDir(dir) {
  const trimmed = typeof dir === "string" ? dir.trim() : "";
  if (!trimmed) return app.getPath("videos");
  if (!path.isAbsolute(trimmed)) {
    throw new Error(`Output folder must be a full path (e.g. D:\Videos), got "${trimmed}"`);
  }
  return trimmed;
}

function longJobFile() {
  return path.join(app.getPath("userData"), "long-video-task.json");
}

// Where long-video screens are kept for reuse; blank = Videos\PathAnimator screens.
function defaultScreensDir() {
  return path.join(app.getPath("videos"), "PathAnimator screens");
}

// The screens folder box's value as a full path.
function resolveScreensDir(dir) {
  const trimmed = typeof dir === "string" ? dir.trim() : "";
  if (!trimmed) return defaultScreensDir();
  if (!path.isAbsolute(trimmed)) {
    throw new Error(`Screens folder must be a full path (e.g. D:\Screens), got "${trimmed}"`);
  }
  return trimmed;
}

const screenDurations = new Map();
async function screenDuration(file) {
  const stat = fs.statSync(file);
  const key = `${file}|${stat.size}|${stat.mtimeMs}`;
  if (!screenDurations.has(key)) screenDurations.set(key, await probeDuration(file));
  return screenDurations.get(key);
}

function segmentDir(segmentGroup) {
  const safe = String(segmentGroup).replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safe) throw new Error("Invalid segment group.");
  return path.join(app.getPath("temp"), "pathanim-segments", safe);
}

// The opening video bundled in header/ (first video file found), or "" if
// none. Packaged builds unpack header/ out of app.asar (see asarUnpack) so
// ffmpeg can read it.
function defaultIntroPath() {
  const dir = path.join(__dirname.replace("app.asar", "app.asar.unpacked"), "header");
  try {
    const file = fs.readdirSync(dir).sort().find((f) => /\.(mp4|mov|m4v|mkv|webm|avi)$/i.test(f));
    return file ? path.join(dir, file) : "";
  } catch (err) {
    return "";
  }
}

// Opening videos re-encoded to the export format, cached by path + size +
// modified time so a batch of videos (or a re-run) encodes each one once.
const introJobs = new Map();
function preparedIntro(introPath, format = "landscape") {
  const file = String(introPath).trim();
  if (!path.isAbsolute(file) || !fs.existsSync(file)) {
    return Promise.reject(new Error(`Opening video not found: "${file}"`));
  }
  const stat = fs.statSync(file);
  // Landscape keeps its old key so intros already in the cache are reused.
  const formatKey = format === "landscape" ? "" : `|${format}`;
  const key = require("crypto").createHash("sha1").update(`${file}|${stat.size}|${stat.mtimeMs}${formatKey}`).digest("hex");
  const cacheDir = path.join(app.getPath("temp"), "pathanim-segments", "intro-cache");
  const out = path.join(cacheDir, `${key}.mp4`);
  if (fs.existsSync(out)) return Promise.resolve(out);
  if (!introJobs.has(key)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    const tmp = path.join(cacheDir, `${key}.part.mp4`);
    introJobs.set(
      key,
      encodeIntro(file, tmp, format)
        .then(() => {
          fs.renameSync(tmp, out);
          return out;
        })
        .finally(() => introJobs.delete(key))
    );
  }
  return introJobs.get(key);
}

app.on("window-all-closed", () => {
  // In --export CLI mode, the hidden capture window is destroyed as soon as
  // frame capture finishes (before ffmpeg encoding runs) — that's not a
  // signal to quit, runExportCli()/the in-app export handler manage their
  // own lifecycle and call app.quit() themselves when actually done.
  if (isExportCli) return;
  if (serverInstance) serverInstance.close();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serverInstance) serverInstance.close();
});
