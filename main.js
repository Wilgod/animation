const path = require("path");
const fs = require("fs");
const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");

const { start } = require("./server");
const { exportScene } = require("./electronExport");

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
    const result = await exportScene({
      port,
      sceneId,
      outputDir: resolveOutputDir(opts?.outputDir),
      gif: !!opts?.gif,
      layoutId: opts?.layoutId,
      name: opts?.name,
      onProgress: (frame, total, phase) => {
        // key: lets the editor tell apart concurrent exports of the same scene
        event.sender.send("export:progress", { sceneId, key: opts?.progressKey || sceneId, frame, total, phase });
      },
    });
    return result;
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
