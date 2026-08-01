// contextBridge surface exposed to the renderer as window.electronAPI.
// The editor (app.js) feature-detects this to decide whether to show
// Electron-only UI (the Export button) — it stays undefined in the plain
// browser dev workflow (npm start), so that workflow is unaffected.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  exportScene: (sceneId, opts) => ipcRenderer.invoke("export:run", sceneId, opts),
  onExportProgress: (callback) => {
    ipcRenderer.on("export:progress", (event, data) => callback(data));
  },
  showItemInFolder: (filePath) => ipcRenderer.invoke("export:reveal", filePath),
  openConfigFile: () => ipcRenderer.invoke("config:open"),
  openNewWindow: () => ipcRenderer.invoke("window:new"),
});
