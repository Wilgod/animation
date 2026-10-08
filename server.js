const path = require("path");
const fs = require("fs");
const express = require("express");
const { loadScenesConfig } = require("./scripts/lib/scenesConfig");

const ROOT = __dirname;
const PATHS_DIR = path.join(ROOT, "paths");
const TEMPLATES_DIR = path.join(ROOT, "templates");
const CONFIG_FILE = path.join(ROOT, "config", "scenes.json");
const DEFAULT_PORT = 5173;

// Scene ids come from config/scenes.json (author-controlled) and are only
// ever used to build a filename here, but validate anyway since they end up
// in a filesystem path.
function isValidSceneId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9_-]+$/.test(id);
}

function pathFileFor(pathsDir, sceneId) {
  return path.join(pathsDir, `${sceneId}.json`);
}

// Template names are freeform, user-typed labels (e.g. "Birthday setup"),
// unlike scene ids. No dots or slashes allowed, so this can't escape
// templatesDir or collide with a non-.json file.
function isValidTemplateName(name) {
  return typeof name === "string" && /^[\w][\w \-]{0,79}$/.test(name.trim());
}

function templateFileFor(templatesDir, name) {
  return path.join(templatesDir, `${name.trim()}.json`);
}

// Path files used to store a single animal's path directly as
// { path: [...], options: {...} }. Now a scene can have several active
// animals at once, each with its own path, so the shape is
// { activeAnimals: [id...], animals: { id: { path, options } } }. Old
// single-animal files are transparently upgraded on read (as animal
// "yellow", the only animal that used to exist — its id was originally
// "blue", renamed for consistency with its actual color/label) — nothing
// needs migrating on disk until the next save.
function migratePathData(data) {
  if (data && data.animals && typeof data.animals === "object") return data;
  if (data && Array.isArray(data.path)) {
    return { activeAnimals: ["yellow"], animals: { yellow: { path: data.path, options: data.options || {} } } };
  }
  return { activeAnimals: [], animals: {} };
}

// options.pathsDir overrides where per-scene path JSON files are read/written
// (used by the packaged Electron app to point at a writable per-user data
// dir instead of the app's own install location). Defaults to today's
// behavior so dev mode (npm start / node server.js) is unaffected.
function createApp(options = {}) {
  const pathsDir = options.pathsDir || PATHS_DIR;
  const templatesDir = options.templatesDir || path.join(path.dirname(pathsDir), "templates");
  const configFile = options.configFile || CONFIG_FILE;
  const app = express();
  app.use(express.json({ limit: "2mb" })); // auto-history can hold thousands of combinations
  app.use(express.static(ROOT, { index: "index.html" }));

  app.get("/api/config", (req, res) => {
    if (!fs.existsSync(configFile)) {
      return res.status(404).json({ error: "config/scenes.json not found" });
    }
    try {
      res.json(loadScenesConfig(configFile));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/path/:sceneId", (req, res) => {
    const { sceneId } = req.params;
    if (!isValidSceneId(sceneId)) return res.status(400).json({ error: "invalid scene id" });
    const file = pathFileFor(pathsDir, sceneId);
    if (!fs.existsSync(file)) {
      return res.status(404).json({ error: "no saved path for this scene" });
    }
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      res.json(migratePathData(data));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/path/:sceneId", (req, res) => {
    const { sceneId } = req.params;
    if (!isValidSceneId(sceneId)) return res.status(400).json({ error: "invalid scene id" });
    fs.mkdirSync(pathsDir, { recursive: true });
    fs.writeFileSync(pathFileFor(pathsDir, sceneId), JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  });

  // Random "Generate Video" runs keep their layouts apart from each scene's
  // own saved layout (so your hand-made paths are never overwritten), plus a
  // history of background+animal combinations already used, so later runs
  // don't repeat them.
  const autoDir = path.join(pathsDir, "_auto");
  const autoHistoryFile = path.join(autoDir, "history.json");
  const isValidAutoId = (id) => /^[a-z0-9-]{1,80}$/.test(id);

  app.get("/api/auto-layout/:id", (req, res) => {
    const { id } = req.params;
    if (!isValidAutoId(id)) return res.status(400).json({ error: "invalid layout id" });
    const file = path.join(autoDir, `${id}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ error: "no such layout" });
    res.json(JSON.parse(fs.readFileSync(file, "utf8")));
  });

  app.post("/api/auto-layout/:id", (req, res) => {
    const { id } = req.params;
    if (!isValidAutoId(id)) return res.status(400).json({ error: "invalid layout id" });
    fs.mkdirSync(autoDir, { recursive: true });
    fs.writeFileSync(path.join(autoDir, `${id}.json`), JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  });

  app.get("/api/auto-history", (req, res) => {
    try {
      res.json(JSON.parse(fs.readFileSync(autoHistoryFile, "utf8")));
    } catch {
      res.json({ used: [] });
    }
  });

  app.post("/api/auto-history", (req, res) => {
    const used = Array.isArray(req.body?.used) ? req.body.used.filter((k) => typeof k === "string") : [];
    fs.mkdirSync(autoDir, { recursive: true });
    fs.writeFileSync(autoHistoryFile, JSON.stringify({ used: used.slice(-5000) }, null, 2));
    res.json({ ok: true });
  });

  // Templates hold the same shape as a saved scene layout (activeAnimals,
  // animals, placedOrnaments) but are named by the user and not tied to a
  // scene id, so a layout built on one background can be re-applied to
  // another — ornament/animal x,y are in shared 1600x900 canvas space.
  app.get("/api/templates", (req, res) => {
    fs.mkdirSync(templatesDir, { recursive: true });
    const names = fs
      .readdirSync(templatesDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.slice(0, -5))
      .sort((a, b) => a.localeCompare(b));
    res.json({ templates: names });
  });

  app.get("/api/template/:name", (req, res) => {
    const { name } = req.params;
    if (!isValidTemplateName(name)) return res.status(400).json({ error: "invalid template name" });
    const file = templateFileFor(templatesDir, name);
    if (!fs.existsSync(file)) {
      return res.status(404).json({ error: "no such template" });
    }
    try {
      res.json(JSON.parse(fs.readFileSync(file, "utf8")));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/template/:name", (req, res) => {
    const { name } = req.params;
    if (!isValidTemplateName(name)) return res.status(400).json({ error: "invalid template name" });
    fs.mkdirSync(templatesDir, { recursive: true });
    fs.writeFileSync(templateFileFor(templatesDir, name), JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  });

  app.delete("/api/template/:name", (req, res) => {
    const { name } = req.params;
    if (!isValidTemplateName(name)) return res.status(400).json({ error: "invalid template name" });
    const file = templateFileFor(templatesDir, name);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    res.json({ ok: true });
  });

  return app;
}

function start(port = DEFAULT_PORT, options = {}) {
  const app = createApp(options);
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      resolve(server);
    });
  });
}

if (require.main === module) {
  start(DEFAULT_PORT).then((server) => {
    const { port } = server.address();
    console.log(`Lizard animator running at http://localhost:${port}`);
  });
}

module.exports = { createApp, start };
