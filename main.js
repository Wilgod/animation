const path = require("path");
const fs = require("fs");
const { app, BrowserWindow, ipcMain, shell } = require("electron");

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

function resolveSceneId(requested) {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config", "scenes.json"), "utf8"));
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
let mainWindow = null;

function pathsDir() {
  return path.join(app.getPath("userData"), "paths");
}

async function startServer() {
  serverInstance = await start(0, { pathsDir: pathsDir() });
  return serverInstance.address().port;
}

async function createMainWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    show: !isSmokeTest,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) mainWindow.webContents.openDevTools();

  await mainWindow.loadURL(`http://127.0.0.1:${port}/index.html`);
  return mainWindow;
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
  const outputDir = path.join(__dirname, "output");

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

  console.log(`Captured ${frameCount} frames at 30fps. Done: ${outputFile}`);
  if (outputGif) console.log(`Done: ${outputGif}`);
  app.quit();
}

app.whenReady().then(async () => {
  const port = await startServer();

  if (isExportCli) {
    try {
      await runExportCli(port);
    } catch (err) {
      console.error(err.message);
      process.exitCode = 1;
      app.quit();
    }
    return;
  }

  await createMainWindow(port);

  ipcMain.handle("export:run", async (event, sceneId, opts) => {
    const result = await exportScene({
      port,
      sceneId,
      outputDir: app.getPath("videos"),
      gif: !!opts?.gif,
      onProgress: (frame, total) => {
        event.sender.send("export:progress", { sceneId, frame, total });
      },
    });
    return result;
  });

  ipcMain.handle("export:reveal", (event, filePath) => {
    shell.showItemInFolder(filePath);
  });

  ipcMain.handle("config:open", () => {
    return shell.openPath(path.join(__dirname, "config", "scenes.json"));
  });

  if (isSmokeTest) {
    await runSmokeTest(port);
    return;
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
});

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
