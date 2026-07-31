# Path Animator

Drag-to-animate tool: pick a background + animal (with an optional walk-cycle
sprite sheet), draw a waypoint path visually, and export a smooth MP4/GIF of
the animal walking along it. Runs as a normal local dev tool (browser +
terminal) or as a packaged standalone Windows app (double-click .exe, no
Node.js required).

## One-time setup (dev machine)

```
npm install
npm run prepare-assets
```

`prepare-assets` processes every scene in `config/scenes.json` (crop/resize/
chroma-key the raw images in `image/`) into `assets/<sceneId>/`. Re-run it
whenever you add a scene or change its source images.

## Everyday use (editor + CLI export)

```
npm start
```
Opens the editor at `http://localhost:5173` in your browser. Pick a scene,
click to add waypoints, drag to move them, Save Path.

```
npm run export             # renders output/<sceneId>.mp4 for the first scene in config/scenes.json
npm run export:gif         # also renders output/<sceneId>.gif
```
Export runs through Electron under the hood even for this CLI path (it's
what replaced the old Puppeteer-based exporter). To target a specific scene
instead of the config's first one:
```
npx electron . --export --scene <id>
npx electron . --export --scene <id> --gif
```

## Running as the desktop app (dev mode, no packaging)

```
npm run electron:dev
```
Opens the same editor in a native window with the Export button built into
the sidebar — no terminal needed to export. This is the fastest way to try
the packaged-app experience without waiting for a full build.

## Building the standalone .exe

```
npm run prepare-assets   # make sure assets/ are current before packaging
npm run dist
```

This runs `electron-builder`, which produces a single self-contained
portable executable at:

```
dist\PathAnimator-<version>-portable.exe
```

Double-click it to run — no installer, no Node.js, no dependencies needed on
the target machine. It bundles Electron (runtime + Chromium), ffmpeg, and
every configured scene's pre-generated assets.

**Rebuild whenever you:**
- Add/edit a scene in `config/scenes.json` (run `prepare-assets` first)
- Change any of `main.js`, `preload.js`, `electronExport.js`, `server.js`,
  `index.html`, `app.js`, `engine.js`, `style.css`

**Not included in the package** (and don't need to be): `scripts/`, `image/`
(raw sources), `sharp` — these are dev-time-only tools for generating
`assets/`. The packaged app only ever reads the already-generated
`assets/<sceneId>/*`.

### Known gotchas

- **`electron` and `electron-builder` are pinned to specific versions**
  (`electron@31`, `electron-builder@24`) in `package.json`, not `latest`.
  Newer majors of both (at least as of when this was set up) ship a
  postinstall/runtime script that crashes with `ERR_REQUIRE_ESM` on this
  Node version. If you ever bump these, try `npx electron .` and
  `npm run dist` right after — if either throws that error, roll back to a
  known-stable major version rather than debugging the ESM/CJS mismatch.
- **First run on any given machine (including your own, from a new folder)
  may trigger a Windows SmartScreen "unknown publisher" warning.** This is
  expected for an unsigned exe, not a bug — click "More info" → "Run
  anyway". Code-signing would remove this but isn't set up.
- **Icon**: no custom `.ico` is configured yet, so the exe uses Electron's
  default icon. To add one, put a multi-resolution `.ico` at `build/icon.ico`
  and add `"icon": "build/icon.ico"` under `"win"` in `package.json`'s
  `"build"` config.

## Adding a new background + animal

1. Drop the raw images in `image/`.
2. Add an entry to `config/scenes.json`:
   ```json
   {
     "id": "my-new-scene",
     "label": "My New Scene",
     "background": { "source": "image/my-background.png" },
     "animal": {
       "source": "image/my-animal.png",
       "motionGrid": { "source": "image/my-animal-walk-grid.png", "cols": 4, "rows": 2 },
       "rotationOffsetDeg": 90,
       "strideLengthPx": 140
     }
   }
   ```
   `motionGrid` is optional — omit it entirely for a static (non-walking)
   sprite. `rotationOffsetDeg` is how far the art's neutral drawn
   orientation sits from "facing right" (0 = drawn facing right, 90 = drawn
   facing up) — figure it out by trial and error with the rotate-to-face-path
   toggle on.
3. `npm run prepare-assets`
4. If the app is already open, click **Reload Scenes** in the sidebar
   instead of restarting it — it re-fetches `config/scenes.json` and
   refreshes the dropdown immediately. Otherwise just `npm start` (or
   `npm run electron:dev`) and pick the new scene from the dropdown.

The sidebar also has an **Open Config File** button (Electron app only, not
in the plain-browser dev workflow) that opens `config/scenes.json` directly
in your OS's default editor for that file type — handy for step 2 above
without hunting for the file yourself.

## Project layout

```
main.js / preload.js / electronExport.js   Electron app shell + export
server.js                                   Express server (dev + packaged, shared)
index.html / app.js / engine.js / style.css Editor UI + rendering (shared by browser & Electron)
config/scenes.json                          Scene definitions (edit this to add scenes)
scripts/prepare-assets.js                   Dev-only: raw image/ -> processed assets/
assets/<sceneId>/                           Generated, read-only at runtime
paths/<sceneId>.json                        Saved waypoint paths (dev mode only —
                                             the packaged app stores these under
                                             %APPDATA%\lizard-animation\paths\ instead)
```
# animation
