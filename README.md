# Path Animator

## 3D crab

Select **3D 螃蟹**, place it on a ground region, add a path, and press Play. The crab has a photo-textured domed shell, raised pincers, eyestalks, and eight articulated walking legs. Its looping Walk clip follows distance along the path; fixed facing preserves sideways travel on horizontal paths. Geometry and hidden surfaces are an approximation of `image/animal/crab-walk.png`.

Model: `assets/models/crab.glb`; editable source: `assets/models/crab.blend`. Rebuild with Blender using `scripts/build-crab.py`. Run `npx electron scripts/check-crab-3d.cjs` to check all eight legs, loop continuity, placement, and deterministic timeline rendering. Add `--packaged` after building to verify packaged assets.

## 3D butterfly

Select **3D 蝴蝶** in a scene with an air region (for example, the garden pond scene), place it in the sky, add a path, and press Play. Four hinged, photo-textured wings use a looping Fly animation during flight and hovering. The body, six legs, clubbed antennae, and curled proboscis are modeled geometry. This is an approximate reconstruction from the first pose in `image/animal/Butterfly.png`; hidden surfaces are mirrored from the visible wing.

Model: `assets/models/butterfly.glb`; editable source: `assets/models/butterfly.blend`. Rebuild with Blender using `scripts/build-butterfly.py`. Verify animation, loop continuity, and editor placement using `npx electron scripts/check-butterfly-3d.cjs` (the check starts its own server). Add `--packaged` to check the packaged assets.

## 3D honeybee

Select **3D 蜜蜂** in a scene with an air region, place it in that region,
add a path, and press Play. The bee uses actual 3D body, leg, antenna, fur,
and veined wing geometry inspired by `image/animal/bee-fly.png`; it is an
approximation, not a photogrammetric reconstruction. Four hinged wings play
a looping Fly clip based on timeline time, including while hovering.

Model: `assets/models/honeybee.glb`; editable source: `assets/models/honeybee.blend`.
Rebuild with Blender using `scripts/build-bee.py`. Run
`npx electron scripts/check-bee-3d.cjs` with the local server running to
check the wing loop, selector, air placement, and hover animation.


## 3D models for the other animals

Spider, mantis, ladybug, squirrel, pigeon, frog and field mouse walk as 3D
models (viewed from above). Sparrow, flying pigeon and cicada fly (angled
view). The goldfish swims in water areas. Each is a procedural approximation
of its reference photo in `image/animal/`, not a scanned reconstruction:

- Walkers use jointed legs whose feet are solved to stay planted. The frog
  hops; the squirrel bounds; the pigeon bobs its head.
- Wings and fins flap on hinges; the goldfish body bends on a skeleton.
- Walk clips follow distance along the path. Fly and swim clips follow time,
  so they keep moving while hovering.

Models: `assets/models/<id>.glb`, with editable `.blend` files beside them.
Each has its own build script, `scripts/build-<id>.py`, using shared helpers
in `scripts/lib/` (`model_kit.py`, `mammal.py`, `bird.py`). Rebuild one with:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python scripts/build-frog.py
```

A walker's build prints `STRIDE_PX`. Copy that number to the animal's
`strideLengthPx` in `config/scenes.json` so its feet don't slide.
With `npm start` running, check all of them with
`npx electron scripts/check-animals-3d.cjs`.

## Random videos (never the same twice)

Click **Generate Video…** and tick **Random mix**. Set **Videos to make**,
**Length** (defaults to 15 s), and **Animals per video (up to)**. Every
animal and background starts selected as the pool; deselect any you don't
want. For each video the app:

- picks a random background, then 1 to N random animals that can live
  there (birds need sky, fish need water);
- generates a fresh random path for each animal: it enters, wanders
  through extra stops to fill the video, pauses, then leaves, at a random
  speed, with start times staggered;
- never reuses a background + animals combination from this run or any
  earlier run. Once every combination in the pool has been used, the
  history starts over. Paths are always new, so even then no two videos
  match.

Videos render 4 at a time into your Videos folder, named like
`garden-lawn-grass-frog-spider-<timestamp>-3.mp4`. Random runs keep their
layouts in `paths/_auto/` (in the app's data folder), along with
`history.json`, the combinations already used. Delete `history.json` to
start fresh. Your own saved scene layouts are never touched. Random mix
needs the desktop app or the packaged .exe.

## Background motion

Under **Change Background → Background motion**:

- **Sunlight & leaf shadows**: branch-and-leaf shadows drift and sway
  across the whole scene, animals included.
- **Water ripples**: tints water areas, adds moving caustics, and spreads
  rings behind anything swimming. Shown only on scenes with water.
- **Falling** leaves, petals, snow or dust in the light. Leaves and petals
  tumble and cast small shadows.
- **Camera drift**: a slow push-in or pull-out with a gentle pan. It runs
  only during Play and export, so your waypoint markers stay put while
  you edit.

**Swaying plants** come from the scene itself, not from a checkbox. Scenes
with a `sway` setting in `config/scenes.json` move their plants in the wind:
the balcony herb garden, the picket fence's flowers, the lawn, the pond
garden's grass, and the hanging vines on the wall shelf and basket. Every
other background (terrazzo, wood, stone, carpet…) stays perfectly still. The
app finds plants by color (green foliage, purple/pink flowers), so wood,
soil, pots and walls never move. Options:
`{ "strength": 1, "rootY": 0.8, "tipY": 0.04, "hang": false, "region": { "x0": 0, "x1": 0.6, "y0": 0, "y1": 1 } }`.
`rootY`/`tipY` (0–1 down the image) anchor side-view plants at their
roots. Set `hang: true` for vines trailing down from a pot, leave `rootY`
out for top-down grass, and use `region` to limit what moves.

**Shuffle look** re-rolls the settings of the effects that are on. Effects
are saved with the layout and in templates. Random-mix videos each get
their own mix suited to the scene: snow on snow scenes, leaves or petals
outdoors, dust indoors. Random mix leaves camera drift off unless you tick
**Camera drift** in its options, because on a floor it looks like the ground
is moving. Everything is seeded and depends only on time, so exports are
deterministic.

## Animal sounds

Every animal's sound is a synthesized, seamless WAV loop in `audio/`,
generated by `python scripts/make-animal-sounds.py` (numpy only). Pass an
id to rebuild one (for example, `... make-animal-sounds.py frog`).

- Walk sounds place a footstep each time the 3D model's foot lands. The
  editor plays them faster or slower with the animal's speed, so the steps
  stay in time with the legs.
- Wing and fin sounds (`modelAnimation: "fly"`) play at a fixed rate in
  time with the wingbeat or tail beat.
- Continuous textures with no footsteps (the snail's slime) set
  `"fixedRate": true` in `walkSound`, so a slow animal's sound isn't
  stretched to silence.
- Loops are loudness-matched, so `walkSound.volume` is only for taste.
- If you change a walker's `strideLengthPx`, also change the stride in
  its generator and rebuild its sound.

Video export fades each sound in and out and leaves 3 dB of headroom, so
overlapping animals don't clip.

## Your lizard in the main editor

Choose **Select Animal → 3D 黃蜥蝪**. Drag its name onto the
background, add waypoints, and press **Play**. The actual GLB model renders
on the main scene, with its embedded Walk animation driven by distance along
the path. Size, heading, stride, timeline scrubbing, saved layouts, and the
existing MP4/GIF export use the same shared renderer. No separate page is needed.

The supplied file is `model/Lizard.glb`, included in packaged builds.
With `npm start` running, verify the integration using
`npx electron scripts/check-editor-3d.cjs`.

## Green gecko 3D prototype

Run `npm start` and open `http://localhost:5173/gecko-3d.html`, and select the green gecko prototype from the Model menu. Drag to orbit, scroll to zoom,
pause or scrub the walk, and select **Click to walk** to set a destination.
Run `npm run gecko` to open the preview directly in the desktop app.
This preview is separate from the 2D path editor and MP4/GIF exporter.

The editable model is `assets/models/green-gecko.blend`; the web-ready model
is `assets/models/green-gecko.glb`. Both contain a 19-bone skeleton and a Walk
animation. The supplied eight-pose reference is packed in the Blender file.
Shape, depth, scale markings, and motion are an approximation of that image,
not a scanned reconstruction. The mesh uses articulated parts and a smoothly
weighted tail. Two-link inverse kinematics are baked into the walk: diagonal
feet alternate between a grounded backward push and a low forward swing.
Separate ankle joints keep toes level. Straight-line travel matches stance
speed; turning does not yet use runtime foot locking or terrain adaptation.

Rebuild with Blender:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python scripts/build-green-gecko.py
```

With the local server running, verify rendering and animation with
`npx electron scripts/check-gecko-3d.cjs`.

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
