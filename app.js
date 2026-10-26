// Editor-only logic: waypoint drag/click handling, sidebar wiring, preview
// playback, save/load. Uses window.AnimEngine (engine.js) for all math and
// rendering of the background+lizard layer; this file only adds the
// editor's marker/path overlay on top and drives the UI. A scene can have
// several animals active at once (checked in the Animals panel); each has
// its own independent path, and one of them is the "editing" animal whose
// path is shown/edited via the canvas and Waypoints panel.
(function () {
  const urlParams = new URLSearchParams(location.search);
  const isExportMode = urlParams.get("export") === "1";
  if (isExportMode) document.body.classList.add("export-mode");

  const canvas = document.getElementById("stage");
  // Keep interactive playback lightweight; the export window retains 4K.
  if (!isExportMode) { canvas.width = 1600; canvas.height = 900; }
  const ctx = canvas.getContext("2d");
  const stagePad = document.getElementById("stagePad");
  const overlayCanvas = document.getElementById("overlayCanvas");
  const overlayCtx = overlayCanvas.getContext("2d");
  const sceneSelect = document.getElementById("sceneSelect");
  const scrub = document.getElementById("scrub");
  const timeLabel = document.getElementById("timeLabel");
  const seekStartBtn = document.getElementById("seekStartBtn");
  const stepBackBtn = document.getElementById("stepBackBtn");
  const playBtn = document.getElementById("playBtn");
  const stepForwardBtn = document.getElementById("stepForwardBtn");
  const seekEndBtn = document.getElementById("seekEndBtn");
  const timelineCanvas = document.getElementById("timelineCanvas");
  const timelineCtx = timelineCanvas.getContext("2d");
  const clearBtn = document.getElementById("clearBtn");
  const saveBtn = document.getElementById("saveBtn");
  const loadBtn = document.getElementById("loadBtn");
  const statusEl = document.getElementById("status");
  const templateSelect = document.getElementById("templateSelect");
  const saveTemplateBtn = document.getElementById("saveTemplateBtn");
  const loadTemplateBtn = document.getElementById("loadTemplateBtn");
  const deleteTemplateBtn = document.getElementById("deleteTemplateBtn");
  const templateStatusEl = document.getElementById("templateStatus");
  const modalOverlayEl = document.getElementById("modalOverlay");
  const modalMessageEl = document.getElementById("modalMessage");
  const modalInputEl = document.getElementById("modalInput");
  const modalOkBtn = document.getElementById("modalOkBtn");
  const modalCancelBtn = document.getElementById("modalCancelBtn");
  const exportBtn = document.getElementById("exportBtn");
  const exportProgressEl = document.getElementById("exportProgress");
  const outputDirRowEl = document.getElementById("outputDirRow");
  const outputDirInput = document.getElementById("outputDirInput");
  const outputDirBrowseBtn = document.getElementById("outputDirBrowseBtn");
  const reloadScenesBtn = document.getElementById("reloadScenesBtn");
  const openConfigBtn = document.getElementById("openConfigBtn");
  const newWindowBtn = document.getElementById("newWindowBtn");
  const multiExportSectionEl = document.getElementById("multiExportSection");
  const multiExportSceneListEl = document.getElementById("multiExportSceneList");
  const multiExportBtn = document.getElementById("multiExportBtn");
  const multiExportProgressListEl = document.getElementById("multiExportProgressList");
  const autoGenSectionHintEl = document.getElementById("autoGenSectionHint");
  const autoGenerateBtn = document.getElementById("autoGenerateBtn");
  const autoGenProgressListEl = document.getElementById("autoGenProgressList");
  const autoGenOverlayEl = document.getElementById("autoGenOverlay");
  const autoGenAnimalSelectEl = document.getElementById("autoGenAnimalSelect");
  const autoGenBgSelectEl = document.getElementById("autoGenBgSelect");
  const autoGenBgCountHintEl = document.getElementById("autoGenBgCountHint");
  const autoGenSecondsEl = document.getElementById("autoGenSeconds");
  const autoGenModalStatusEl = document.getElementById("autoGenModalStatus");
  const autoGenCancelBtn = document.getElementById("autoGenCancelBtn");
  const autoGenGoBtn = document.getElementById("autoGenGoBtn");
  const autoGenRandomEl = document.getElementById("autoGenRandom");
  const fxLightEl = document.getElementById("fxLight");
  const fxWaterEl = document.getElementById("fxWater");
  const fxWaterHintEl = document.getElementById("fxWaterHint");
  const fxParticlesEl = document.getElementById("fxParticles");
  const fxParticleKindEl = document.getElementById("fxParticleKind");
  const fxCameraEl = document.getElementById("fxCamera");
  const fxShuffleBtn = document.getElementById("fxShuffleBtn");
  const autoGenRandomOptionsEl = document.getElementById("autoGenRandomOptions");
  const autoGenCountEl = document.getElementById("autoGenCount");
  const autoGenCountLabelEl = document.getElementById("autoGenCountLabel");
  const autoGenJoinEl = document.getElementById("autoGenJoin");
  const autoGenLengthHintEl = document.getElementById("autoGenLengthHint");
  const autoGenIntroSectionEl = document.getElementById("autoGenIntroSection");
  const autoGenIntroEl = document.getElementById("autoGenIntro");
  const autoGenIntroPathEl = document.getElementById("autoGenIntroPath");
  const autoGenIntroBrowseBtn = document.getElementById("autoGenIntroBrowseBtn");
  const autoGenIntroHintEl = document.getElementById("autoGenIntroHint");
  const autoGenMaxAnimalsEl = document.getElementById("autoGenMaxAnimals");
  const autoGenSpeedMinEl = document.getElementById("autoGenSpeedMin");
  const autoGenSpeedMaxEl = document.getElementById("autoGenSpeedMax");
  const autoGenCameraDriftEl = document.getElementById("autoGenCameraDrift");
  const autoGenPreyMotionEl = document.getElementById("autoGenPreyMotion");
  const autoGenBgLabelEl = document.getElementById("autoGenBgLabel");
  const autoGenAnimalLabelEl = document.getElementById("autoGenAnimalLabel");
  const autoGenCategoryEl = document.getElementById("autoGenCategory");
  const autoGenCategoryHintEl = document.getElementById("autoGenCategoryHint");
  const autoGenScreensSectionEl = document.getElementById("autoGenScreensSection");
  const autoGenScreensDirEl = document.getElementById("autoGenScreensDir");
  const autoGenScreensBrowseBtn = document.getElementById("autoGenScreensBrowseBtn");
  const autoGenUseSavedEl = document.getElementById("autoGenUseSaved");
  const videoFormatSelectEl = document.getElementById("videoFormatSelect");
  const autoGenFormatEl = document.getElementById("autoGenFormat");
  const autoGenFormatHintEl = document.getElementById("autoGenFormatHint");
  const shortsCropLabelEl = document.getElementById("shortsCropLabel");
  const shortsCropEl = document.getElementById("shortsCrop");
  const shortsCropValueEl = document.getElementById("shortsCropValue");
  const longJobResumeEl = document.getElementById("longJobResume");
  const longJobResumeTextEl = document.getElementById("longJobResumeText");
  const longJobContinueBtn = document.getElementById("longJobContinueBtn");
  const longJobDiscardBtn = document.getElementById("longJobDiscardBtn");
  const configStatusEl = document.getElementById("configStatus");
  const animalListEl = document.getElementById("animalList");
  const ornamentListEl = document.getElementById("ornamentList");
  const ornamentSelectedPanelEl = document.getElementById("ornamentSelectedPanel");
  const ornamentSelectedLabelEl = document.getElementById("ornamentSelectedLabel");
  const ornamentShadowToggleEl = document.getElementById("ornamentShadowToggle");
  const editingAnimalLabelEl = document.getElementById("editingAnimalLabel");
  const waypointListEl = document.getElementById("waypointList");
  const optRotation = document.getElementById("optRotation");
  const optFlip = document.getElementById("optFlip");
  const optWalkCycle = document.getElementById("optWalkCycle");
  const strideLength = document.getElementById("strideLength");
  const optBobbing = document.getElementById("optBobbing");
  const bobAmplitude = document.getElementById("bobAmplitude");
  const pathSpeed = document.getElementById("pathSpeed");
  const pathSpeedLabel = document.getElementById("pathSpeedLabel");
  const sizeScale = document.getElementById("sizeScale");
  const sizeScaleLabel = document.getElementById("sizeScaleLabel");
  const optShadow = document.getElementById("optShadow");
  const sidebarTabsEl = document.getElementById("sidebarTabs");

  const MARKER_RADIUS = 9;
  const ROTATE_HANDLE_OFFSET = 30; // canvas px above the ornament's top edge
  const ROTATE_HANDLE_RADIUS = 7;
  const RESIZE_HANDLE_RADIUS = 7;
  const LAST_SCENE_STORAGE_KEY = "pathAnimator.lastSceneId";

  const TIMELINE_RULER_H = 16;
  const TIMELINE_LANE_H = 20;
  const ANIMAL_COLORS = { yellow: "#f2c94c", green: "#3ecf6a", red: "#ff5a5a" };
  const ANIMAL_COLOR_FALLBACK = ["#c98bff", "#ffb648", "#4ad9c9", "#ff8bcb"];

  function colorForAnimal(id) {
    if (ANIMAL_COLORS[id]) return ANIMAL_COLORS[id];
    const idx = Math.max(0, animalDefs.findIndex((a) => a.id === id));
    return ANIMAL_COLOR_FALLBACK[idx % ANIMAL_COLOR_FALLBACK.length];
  }

  function pickTickStepMs(totalMs) {
    const steps = [500, 1000, 2000, 5000, 10000, 15000, 30000, 60000];
    const target = totalMs / 6;
    return steps.find((s) => s >= target) || steps[steps.length - 1];
  }

  let scenes = [];
  let animalDefs = [];
  let ornamentDefs = [];
  let templateNames = [];
  let currentScene = null;
  let currentSceneZones = { bands: [], patches: [] }; // this scene's habitat regions — see scripts/lib/zones.js
  let assetCacheBust = Date.now();
  let spriteCache = new Map(); // animalId -> { lizardImage, walkFrames, rotationOffsetRad, strideLengthPx }
  let ornamentSpriteCache = new Map(); // ornamentId -> HTMLImageElement
  let audioCache = new Map(); // animalId -> HTMLAudioElement, or null if no walkSound configured
  let animalData = new Map(); // animalId -> { path, options } for the current scene
  let placedOrnaments = new Map(); // instanceId -> { defId, x, y } for the current scene
  let activeAnimalIds = new Set();
  let editingAnimalId = null;
  let path = []; // editingAnimalId's path (same array reference as animalData's copy)
  let isPlaying = false;
  let sceneEffects = null; // background motion saved with the layout (see applySceneEffects)
  let isExporting = false; // true while a video export is in flight (see setExportUIState)
  const MULTI_EXPORT_MAX = 4;
  let multiExportSelectedIds = new Set(); // scene ids checked in the batch-export checklist
  let autoGenSelectedAnimalIds = new Set(); // animal ids checked in the auto-generate modal
  let autoGenSelectedBgIds = new Set(); // scene ids checked in the auto-generate modal
  const AUTO_GEN_MAX_BACKGROUNDS = MULTI_EXPORT_MAX; // same cap as Batch Export — each selected background spawns its own concurrent hidden export window
  // sceneId -> (frame, total) => void, registered only while that scene's
  // export is actually in flight — lets the single-export flow and any
  // number of concurrent batch-export scenes share one onExportProgress
  // listener without needing a "which mode is active" flag.
  const exportProgressRoutes = new Map();
  let playStartPerf = 0;
  let playStartT = 0;
  let draggingIndex = -1;
  let draggingOrnamentId = null; // instanceId of a placed ornament being dragged on the canvas, or null
  let draggingRotateOrnamentId = null; // instanceId whose rotation handle is being dragged, or null
  let draggingResizeOrnamentId = null; // instanceId whose resize handle is being dragged, or null
  let selectedOrnamentId = null; // instanceId showing selection UI (rotate/resize handles) in the sidebar, or null
  let timelineDragging = false;

  function animalDefFor(id) {
    return animalDefs.find((a) => a.id === id);
  }

  function ornamentDefFor(id) {
    return ornamentDefs.find((o) => o.id === id);
  }

  function habitatFor(animalId) {
    const def = animalDefFor(animalId);
    return (def && def.habitat) || "ground";
  }

  // Fetches the habitat region map written by prepare-assets.js for a scene
  // (assets/<sceneId>/zones.json). Missing/unreadable is treated as an
  // all-ground scene (no bands/patches) rather than an error, so a scene
  // built before this feature existed still behaves exactly as before.
  async function fetchSceneZones(sceneId) {
    try {
      const res = await fetch(`assets/${sceneId}/zones.json?v=${assetCacheBust}`);
      if (res.ok) return await res.json();
    } catch (err) {
      // fall through to the all-ground default below
    }
    return { bands: [], patches: [] };
  }

  // frame: the part of the canvas the video shows (see videoFrame) — a
  // habitat counts only if some of its area falls inside it.
  function isHabitatAvailableInScene(habitat, zones, frame = null) {
    const W = window.AnimEngine.CANVAS_WIDTH;
    const H = window.AnimEngine.CANVAS_HEIGHT;
    if (!frame) return window.SceneZones.hasZone(zones, habitat, W, H);
    return window.SceneZones.candidateRects(zones, habitat, W, H).some(
      (r) => r.x < frame.x + frame.w && r.x + r.w > frame.x && r.y < frame.y + frame.h && r.y + r.h > frame.y
    );
  }

  // ---------------------------------------------------------------------
  // Video format. "landscape" is the normal 4K 16:9 video; "short" is a
  // 9:16 YouTube Short made from the same 16:9 scene by keeping only a
  // full-height strip of it (electronExport.js crops it at capture time).
  // Each background remembers where its strip sits (shortsCrop, 0 = left
  // edge, 0.5 = centre, 1 = right edge; saved by the server). Auto-generated
  // paths stay inside that strip, and the editor outlines it.
  // ---------------------------------------------------------------------
  const VIDEO_FORMAT_STORAGE_KEY = "pathAnimator.videoFormat";
  const SHORTS_MAX_SECONDS = 3 * 60; // YouTube's limit for a Short
  let shortsCrop = {}; // sceneId -> 0..1, see videoFrame

  function shortsCropFor(sceneId) {
    const v = shortsCrop[sceneId];
    return Number.isFinite(v) ? v : 0.5;
  }

  function videoFormat() {
    return videoFormatSelectEl?.value === "short" ? "short" : "landscape";
  }

  function videoFrame(format = videoFormat(), sceneId = currentScene?.id) {
    const W = window.AnimEngine.CANVAS_WIDTH;
    const H = window.AnimEngine.CANVAS_HEIGHT;
    if (format !== "short") return { x: 0, y: 0, w: W, h: H };
    const w = (H * 9) / 16;
    return { x: (W - w) * shortsCropFor(sceneId), y: 0, w, h: H };
  }

  function formatName(format) {
    return format === "short" ? "YouTube Short (9:16)" : "16:9 video";
  }

  function isPointAllowedForAnimal(animalId, x, y) {
    return window.SceneZones.allowsHabitatAt(currentSceneZones, habitatFor(animalId), x, y);
  }

  function habitatBlockedMessage(animalId) {
    const def = animalDefFor(animalId);
    return `${(def && (def.label || def.id)) || animalId} needs a "${habitatFor(animalId)}" area — can't place it there.`;
  }

  function isSkyScene(sceneId) {
    return scenes.find((s) => s.id === sceneId)?.category === "sky";
  }

  function normalizeOptions(id, opts, sceneId = currentScene?.id) {
    const def = animalDefFor(id) || {};
    const o = opts || {};
    return {
      // Most animals rotate to face the direction they're walking (a lizard
      // walking north points "up"). A few move sideways relative to their
      // own facing instead — e.g. a crab — so config can opt an animal out
      // of that by default (per-scene saved paths can still override it via
      // the editor's "Rotate to face path" toggle), same pattern as
      // useWalkCycle below.
      rotationFollowsPath: o.rotationFollowsPath !== undefined ? !!o.rotationFollowsPath : def.rotationFollowsPath !== false,
      flip: o.flip !== undefined ? !!o.flip : true,
      useWalkCycle: o.useWalkCycle !== undefined ? !!o.useWalkCycle : def.useWalkCycle !== false,
      bobbing: !!o.bobbing,
      bobbingAmplitude: o.bobbingAmplitude ?? 6,
      strideLengthPx: o.strideLengthPx ?? def.strideLengthPx ?? 140,
      pathSpeedMultiplier: o.pathSpeedMultiplier ?? 1,
      // Auto-generated "dart & freeze" paths: the engine follows each
      // segment's own timing with sharp stops and starts (see engine.js).
      preyMotion: !!o.preyMotion,
      // config "defaultSize" (e.g. 0.7 for insects) applies to newly placed
      // animals; saved layouts keep their own size.
      sizeScale: o.sizeScale ?? def.defaultSize ?? 1,
      // On by default for newly placed animals (off over open sky, where
      // there's no ground to catch it); saved layouts keep their choice.
      shadow: o.shadow !== undefined ? !!o.shadow : !isSkyScene(sceneId),
      airborne: habitatFor(id) === "air",
    };
  }

  function currentOptions() {
    return {
      rotationFollowsPath: optRotation.checked,
      flip: optFlip.checked,
      useWalkCycle: optWalkCycle.checked,
      bobbing: optBobbing.checked,
      bobbingAmplitude: Number(bobAmplitude.value),
      strideLengthPx: Number(strideLength.value),
      pathSpeedMultiplier: Number(pathSpeed.value) || 1,
      // Not editable in the sidebar; kept so editing a generated animal
      // doesn't quietly turn its dart & freeze movement off.
      preyMotion: !!(editingAnimalId && window.AnimEngine.getActorOptions(editingAnimalId).preyMotion),
      sizeScale: Number(sizeScale.value) || 1,
      shadow: optShadow.checked,
      airborne: habitatFor(editingAnimalId) === "air",
    };
  }

  function setControlsEnabled(enabled) {
    [
      optRotation,
      optFlip,
      optWalkCycle,
      strideLength,
      optBobbing,
      bobAmplitude,
      pathSpeed,
      optShadow,
      sizeScale,
      clearBtn,
      saveBtn,
      loadBtn,
      saveTemplateBtn,
      loadTemplateBtn,
    ].forEach((el) => (el.disabled = !enabled));
  }

  // Exporting spawns its own hidden window that reads the *saved* path for
  // currentScene.id — changing the scene, editing paths/ornaments, or
  // switching animals in the main window mid-export doesn't corrupt the
  // in-flight render, but it does desync what you're looking at from what's
  // actually being exported, which is confusing and easy to mistake for a
  // broken export. Lock down everything that could do that until it's done.
  function setExportUIState(exporting) {
    isExporting = exporting;
    [
      sceneSelect,
      reloadScenesBtn,
      openConfigBtn,
      templateSelect,
      deleteTemplateBtn,
      playBtn,
      seekStartBtn,
      stepBackBtn,
      stepForwardBtn,
      seekEndBtn,
      ornamentShadowToggleEl,
      exportBtn,
      autoGenerateBtn,
      longJobContinueBtn,
      longJobDiscardBtn,
      outputDirInput,
      outputDirBrowseBtn,
    ].forEach((el) => (el.disabled = exporting));
    setControlsEnabled(!exporting && !!editingAnimalId);
    renderAnimalList();
    renderOrnamentList();
    renderMultiExportSceneList();
  }

  function applyOptionsToEngine() {
    if (!editingAnimalId) return;
    const opts = currentOptions();
    const entry = animalData.get(editingAnimalId);
    if (entry) entry.options = opts;
    window.AnimEngine.setActorOptions(editingAnimalId, opts);
    window.AnimEngine.setActorWalkStrideLength(editingAnimalId, Number(strideLength.value));
    window.AnimEngine.setActorSpeedMultiplier(editingAnimalId, opts.pathSpeedMultiplier);
    pathSpeedLabel.textContent = `${opts.pathSpeedMultiplier.toFixed(2)}x`;
    sizeScaleLabel.textContent = `${opts.sizeScale.toFixed(2)}x`;
    refreshScrubRange();
  }

  function refreshScrubRange() {
    const total = window.AnimEngine.getTotalDurationMs();
    scrub.max = String(Math.max(total, 1));
    updateTimeLabel();
  }

  function updateTimeLabel() {
    if (isExportMode) return;
    const total = window.AnimEngine.getTotalDurationMs();
    timeLabel.textContent = `${(Number(scrub.value) / 1000).toFixed(1)}s / ${(total / 1000).toFixed(1)}s`;
  }

  function renderEditorFrame(tMs) {
    window.AnimEngine.setCameraActive(isExportMode || isPlaying);
    window.AnimEngine.renderFrame(tMs);
    if (isExportMode) return;
    if (!(isPlaying && sceneEffects?.camera)) drawOverlay();
    renderTimeline();
  }

  // Multi-track timeline: a ruler plus one lane per active animal showing
  // when it's on screen (its startAtMs through when its own path ends), and
  // a playhead synced to the scrub bar. Read-only visualization + click/drag
  // to seek — start times are still set via the Animals panel's input.
  function renderTimeline() {
    const displayWidth = timelineCanvas.clientWidth;
    if (displayWidth <= 0) return; // hidden (e.g. mid-layout) — skip this frame
    if (timelineCanvas.width !== displayWidth) timelineCanvas.width = displayWidth;

    const activeList = animalDefs.filter((d) => activeAnimalIds.has(d.id));
    const height = TIMELINE_RULER_H + Math.max(activeList.length, 1) * TIMELINE_LANE_H;
    if (timelineCanvas.height !== height) timelineCanvas.height = height;

    const width = timelineCanvas.width;
    const total = Math.max(window.AnimEngine.getTotalDurationMs(), 1);
    const tc = timelineCtx;
    tc.clearRect(0, 0, width, height);

    // ruler ticks + gridlines
    const step = pickTickStepMs(total);
    tc.font = "9px system-ui";
    tc.textBaseline = "top";
    for (let t = 0; t <= total; t += step) {
      const x = (t / total) * width;
      tc.strokeStyle = "rgba(255,255,255,0.08)";
      tc.beginPath();
      tc.moveTo(x, TIMELINE_RULER_H);
      tc.lineTo(x, height);
      tc.stroke();
      tc.fillStyle = "#888";
      tc.fillText(`${(t / 1000).toFixed(step < 1000 ? 1 : 0)}s`, Math.min(x + 2, width - 22), 2);
    }
    tc.strokeStyle = "#555";
    tc.beginPath();
    tc.moveTo(0, TIMELINE_RULER_H);
    tc.lineTo(width, TIMELINE_RULER_H);
    tc.stroke();

    // one lane per active animal
    activeList.forEach((def, i) => {
      const entry = animalData.get(def.id);
      if (!entry) return;
      const y = TIMELINE_RULER_H + i * TIMELINE_LANE_H + 3;
      const barH = TIMELINE_LANE_H - 6;
      const startMs = entry.startAtMs || 0;
      const dur = window.AnimEngine.getActorTotalDurationMs(def.id);
      const x0 = (startMs / total) * width;
      const w = Math.max((dur / total) * width, dur > 0 ? 2 : 6);
      const color = colorForAnimal(def.id);

      tc.globalAlpha = def.id === editingAnimalId ? 1 : 0.55;
      tc.fillStyle = color;
      tc.beginPath();
      tc.roundRect(x0, y, w, barH, 3);
      tc.fill();
      tc.globalAlpha = 1;

      if (def.id === editingAnimalId) {
        tc.strokeStyle = "#fff";
        tc.lineWidth = 1;
        tc.beginPath();
        tc.roundRect(x0 + 0.5, y + 0.5, w - 1, barH - 1, 3);
        tc.stroke();
      }

      if (w > 22) {
        tc.fillStyle = "#111";
        tc.font = "9px system-ui";
        tc.fillText(def.label || def.id, x0 + 3, y + 3);
      }
    });

    // playhead
    const playX = (Number(scrub.value) / total) * width;
    tc.strokeStyle = "#ffcc33";
    tc.lineWidth = 2;
    tc.beginPath();
    tc.moveTo(playX, 0);
    tc.lineTo(playX, height);
    tc.stroke();
  }

  // Stops playback (if running) and jumps the shared timeline to tMs,
  // clamped to [0, total]. Used by every transport control (scrub, step,
  // skip-to-start/end) so they all update the scrub bar/canvas/time label
  // consistently.
  function seekTo(tMs) {
    isPlaying = false;
    pauseAllAnimalAudio();
    playBtn.textContent = "Play";
    const total = window.AnimEngine.getTotalDurationMs();
    const clamped = Math.max(0, Math.min(total, tMs));
    scrub.value = String(clamped);
    renderEditorFrame(clamped);
    updateTimeLabel();
  }

  // The overlay canvas covers the full padded area around the video (not
  // just the video canvas itself), so off-screen waypoints — placed in that
  // blank margin — are actually visible while editing. Its pixel buffer is
  // kept 1:1 with its own CSS size, and markers are drawn in video-space
  // coordinates via a computed offset/scale so they land exactly on top of
  // where they'd appear if drawn directly on #stage.
  function syncOverlayCanvasSize() {
    const w = stagePad.clientWidth;
    const h = stagePad.clientHeight;
    if (overlayCanvas.width !== w) overlayCanvas.width = w;
    if (overlayCanvas.height !== h) overlayCanvas.height = h;
  }

  // Selection outline + rotation handle for the selected placed ornament,
  // drawn in the ornament's own rotated local space so both the box and the
  // handle rotate together with it (see engine.js's drawOrnament).
  function drawOrnamentSelection(scaleX) {
    if (!selectedOrnamentId) return;
    const o = placedOrnaments.get(selectedOrnamentId);
    if (!o) return;
    const image = ornamentSpriteCache.get(o.defId);
    if (!image) return;

    const scale = o.scale || 1;
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    const rotation = o.rotation || 0;

    overlayCtx.save();
    overlayCtx.translate(o.x, o.y);
    overlayCtx.rotate(rotation);

    overlayCtx.lineWidth = 1.5 / scaleX;
    overlayCtx.strokeStyle = "rgba(120, 200, 255, 0.85)";
    overlayCtx.setLineDash([6 / scaleX, 4 / scaleX]);
    overlayCtx.strokeRect(-w / 2, -h / 2, w, h);
    overlayCtx.setLineDash([]);

    const handleY = -h / 2 - ROTATE_HANDLE_OFFSET;
    overlayCtx.beginPath();
    overlayCtx.moveTo(0, -h / 2);
    overlayCtx.lineTo(0, handleY);
    overlayCtx.stroke();

    overlayCtx.beginPath();
    overlayCtx.arc(0, handleY, ROTATE_HANDLE_RADIUS, 0, Math.PI * 2);
    overlayCtx.fillStyle = draggingRotateOrnamentId === selectedOrnamentId ? "#78c8ff" : "rgba(255,255,255,0.9)";
    overlayCtx.fill();
    overlayCtx.lineWidth = 1.5 / scaleX;
    overlayCtx.strokeStyle = "#2a6f99";
    overlayCtx.stroke();

    // Resize handle at the box's bottom-right corner (local, pre-rotation
    // space — see ornamentResizeHandleWorldPos for the matching hit test).
    overlayCtx.beginPath();
    overlayCtx.arc(w / 2, h / 2, RESIZE_HANDLE_RADIUS, 0, Math.PI * 2);
    overlayCtx.fillStyle = draggingResizeOrnamentId === selectedOrnamentId ? "#78c8ff" : "rgba(255,255,255,0.9)";
    overlayCtx.fill();
    overlayCtx.lineWidth = 1.5 / scaleX;
    overlayCtx.strokeStyle = "#2a6f99";
    overlayCtx.stroke();

    overlayCtx.restore();
  }

  function drawOverlay() {
    syncOverlayCanvasSize();
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    const stagePadRect = stagePad.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvasRect.width / window.AnimEngine.CANVAS_WIDTH;
    const scaleY = canvasRect.height / window.AnimEngine.CANVAS_HEIGHT;

    overlayCtx.save();
    overlayCtx.translate(canvasRect.left - stagePadRect.left, canvasRect.top - stagePadRect.top);
    overlayCtx.scale(scaleX, scaleY);

    // Shorts: shade what the 9:16 video won't show, so paths can be placed
    // inside the part that will.
    if (videoFormat() === "short") {
      const f = videoFrame("short");
      const W = window.AnimEngine.CANVAS_WIDTH;
      const H = window.AnimEngine.CANVAS_HEIGHT;
      overlayCtx.fillStyle = "rgba(0, 0, 0, 0.45)";
      overlayCtx.fillRect(0, 0, f.x, H);
      overlayCtx.fillRect(f.x + f.w, 0, W - f.x - f.w, H);
      overlayCtx.lineWidth = 2 / scaleX;
      overlayCtx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      overlayCtx.setLineDash([10 / scaleX, 8 / scaleX]);
      overlayCtx.strokeRect(f.x, f.y, f.w, f.h);
      overlayCtx.setLineDash([]);
    }

    if (editingAnimalId) {
      overlayCtx.lineWidth = 2 / scaleX;
      overlayCtx.strokeStyle = "rgba(255, 220, 80, 0.7)";
      overlayCtx.beginPath();
      path.forEach((p, i) => {
        if (i === 0) overlayCtx.moveTo(p.x, p.y);
        else overlayCtx.lineTo(p.x, p.y);
      });
      overlayCtx.stroke();

      path.forEach((p, i) => {
        overlayCtx.beginPath();
        overlayCtx.arc(p.x, p.y, MARKER_RADIUS, 0, Math.PI * 2);
        overlayCtx.fillStyle = i === draggingIndex ? "#ffcc33" : "rgba(255,255,255,0.85)";
        overlayCtx.fill();
        overlayCtx.lineWidth = 2 / scaleX;
        overlayCtx.strokeStyle = "#333";
        overlayCtx.stroke();
        overlayCtx.fillStyle = "#111";
        overlayCtx.font = "11px system-ui";
        overlayCtx.textAlign = "center";
        overlayCtx.textBaseline = "middle";
        overlayCtx.fillText(String(i + 1), p.x, p.y);
      });
    }

    drawOrnamentSelection(scaleX);

    overlayCtx.restore();
  }

  function renderWaypointList() {
    waypointListEl.innerHTML = "";
    path.forEach((p, i) => {
      const row = document.createElement("div");
      row.className = "waypoint-row";

      const label = document.createElement("span");
      label.className = "coords";
      label.textContent = `#${i + 1}`;
      row.appendChild(label);

      const xInput = document.createElement("input");
      xInput.type = "number";
      xInput.className = "coord-input";
      xInput.step = "1";
      xInput.value = Math.round(p.x);
      xInput.title = "x (can go negative or past canvas width to exit off-screen)";
      xInput.addEventListener("input", () => {
        path[i].x = Number(xInput.value) || 0;
        syncEngine();
        renderEditorFrame(Number(scrub.value));
      });
      row.appendChild(xInput);

      const yInput = document.createElement("input");
      yInput.type = "number";
      yInput.className = "coord-input";
      yInput.step = "1";
      yInput.value = Math.round(p.y);
      yInput.title = "y (can go negative or past canvas height to exit off-screen)";
      yInput.addEventListener("input", () => {
        path[i].y = Number(yInput.value) || 0;
        syncEngine();
        renderEditorFrame(Number(scrub.value));
      });
      row.appendChild(yInput);

      const hasNext = i < path.length - 1;
      const distToNext = hasNext ? Math.hypot(path[i + 1].x - p.x, path[i + 1].y - p.y) : 0;
      const durSec = (p.durationToNextMs || 0) / 1000;
      const speedPxPerSec = durSec > 0 ? distToNext / durSec : distToNext > 0 ? Infinity : 0;

      const speedInput = document.createElement("input");
      speedInput.type = "number";
      speedInput.min = "0";
      speedInput.step = "10";
      speedInput.disabled = !hasNext;
      speedInput.value = hasNext && Number.isFinite(speedPxPerSec) ? Math.round(speedPxPerSec) : "";
      speedInput.placeholder = hasNext && !Number.isFinite(speedPxPerSec) ? "instant" : "";
      speedInput.title = "px/sec to next waypoint (distance ÷ time) — 0 or blank = instant jump";
      speedInput.addEventListener("input", () => {
        const dist = Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y);
        const speed = Math.max(0, Number(speedInput.value) || 0);
        path[i].durationToNextMs = speed > 0 ? Math.round((dist / speed) * 1000) : 0;
        syncEngine();
        refreshScrubRange();
        renderEditorFrame(Number(scrub.value));
      });
      row.appendChild(speedInput);

      const spacer = document.createElement("span");
      spacer.className = "spacer";
      row.appendChild(spacer);

      const upBtn = document.createElement("button");
      upBtn.textContent = "↑";
      upBtn.disabled = i === 0;
      upBtn.addEventListener("click", () => {
        [path[i - 1], path[i]] = [path[i], path[i - 1]];
        afterPathStructureChange();
      });
      row.appendChild(upBtn);

      const downBtn = document.createElement("button");
      downBtn.textContent = "↓";
      downBtn.disabled = i === path.length - 1;
      downBtn.addEventListener("click", () => {
        [path[i + 1], path[i]] = [path[i], path[i + 1]];
        afterPathStructureChange();
      });
      row.appendChild(downBtn);

      const delBtn = document.createElement("button");
      delBtn.textContent = "×";
      delBtn.addEventListener("click", () => {
        path.splice(i, 1);
        afterPathStructureChange();
      });
      row.appendChild(delBtn);

      waypointListEl.appendChild(row);
    });
  }

  function syncEngine() {
    if (!editingAnimalId) return;
    window.AnimEngine.setActorPath(editingAnimalId, path);
  }

  function setEditingPath(newPath) {
    path = newPath;
    if (editingAnimalId) {
      const entry = animalData.get(editingAnimalId);
      if (entry) entry.path = newPath;
    }
  }

  function afterPathStructureChange() {
    syncEngine();
    refreshScrubRange();
    renderWaypointList();
    renderEditorFrame(Number(scrub.value));
  }

  function canvasCoordsFromEvent(evt) {
    // Map into the logical path-space (AnimEngine.CANVAS_WIDTH/HEIGHT), not
    // canvas.width/height — the canvas's actual pixel buffer can be rendered
    // at a higher resolution than that logical space (see engine.js's
    // setContext), so dividing by it directly would misplace every click.
    const rect = canvas.getBoundingClientRect();
    const scaleX = window.AnimEngine.CANVAS_WIDTH / rect.width;
    const scaleY = window.AnimEngine.CANVAS_HEIGHT / rect.height;
    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY,
    };
  }

  function hitTestMarker(pos) {
    for (let i = path.length - 1; i >= 0; i--) {
      const p = path[i];
      if (Math.hypot(p.x - pos.x, p.y - pos.y) <= MARKER_RADIUS + 4) return i;
    }
    return -1;
  }

  // Reverse insertion order so a click on overlapping ornaments hits the
  // topmost one (last drawn — see engine.js's drawFrame draw order).
  function hitTestOrnament(pos) {
    const ids = [...placedOrnaments.keys()];
    for (let i = ids.length - 1; i >= 0; i--) {
      const instanceId = ids[i];
      const o = placedOrnaments.get(instanceId);
      const image = ornamentSpriteCache.get(o.defId);
      if (!image) continue;
      const scale = o.scale || 1;
      const w = image.naturalWidth * scale;
      const h = image.naturalHeight * scale;
      if (Math.abs(pos.x - o.x) <= w / 2 && Math.abs(pos.y - o.y) <= h / 2) return instanceId;
    }
    return null;
  }

  // World-space position of the selected ornament's rotation handle — a
  // fixed point (0, -h/2 - OFFSET) in the ornament's own local space,
  // rotated and translated the same way engine.js's drawOrnament draws it.
  function ornamentHandleWorldPos(instanceId) {
    const o = placedOrnaments.get(instanceId);
    if (!o) return null;
    const image = ornamentSpriteCache.get(o.defId);
    if (!image) return null;
    const scale = o.scale || 1;
    const h = image.naturalHeight * scale;
    const rotation = o.rotation || 0;
    const r = h / 2 + ROTATE_HANDLE_OFFSET;
    return {
      x: o.x + r * Math.sin(rotation),
      y: o.y - r * Math.cos(rotation),
    };
  }

  function hitTestRotateHandle(pos) {
    if (!selectedOrnamentId) return false;
    const handlePos = ornamentHandleWorldPos(selectedOrnamentId);
    if (!handlePos) return false;
    return Math.hypot(pos.x - handlePos.x, pos.y - handlePos.y) <= ROTATE_HANDLE_RADIUS + 4;
  }

  // World-space position of the selected ornament's resize handle — the
  // local point (w/2, h/2) (its box's bottom-right corner, pre-rotation),
  // rotated and translated the same way engine.js's drawOrnament draws it.
  function ornamentResizeHandleWorldPos(instanceId) {
    const o = placedOrnaments.get(instanceId);
    if (!o) return null;
    const image = ornamentSpriteCache.get(o.defId);
    if (!image) return null;
    const scale = o.scale || 1;
    const localX = (image.naturalWidth * scale) / 2;
    const localY = (image.naturalHeight * scale) / 2;
    const rotation = o.rotation || 0;
    return {
      x: o.x + localX * Math.cos(rotation) - localY * Math.sin(rotation),
      y: o.y + localX * Math.sin(rotation) + localY * Math.cos(rotation),
    };
  }

  function hitTestResizeHandle(pos) {
    if (!selectedOrnamentId) return false;
    const handlePos = ornamentResizeHandleWorldPos(selectedOrnamentId);
    if (!handlePos) return false;
    return Math.hypot(pos.x - handlePos.x, pos.y - handlePos.y) <= RESIZE_HANDLE_RADIUS + 4;
  }

  function updateOrnamentSelectionPanel() {
    const o = selectedOrnamentId ? placedOrnaments.get(selectedOrnamentId) : null;
    if (!o) {
      ornamentSelectedPanelEl.hidden = true;
      return;
    }
    ornamentSelectedPanelEl.hidden = false;
    const def = ornamentDefFor(o.defId);
    ornamentSelectedLabelEl.textContent = (def && def.label) || o.defId;
    ornamentShadowToggleEl.checked = !!o.shadow;
  }

  // Allow placing/dragging a waypoint past the visible canvas edge (with a
  // generous margin, not unbounded) so a path can walk the lizard on/off
  // screen — canvas drawing naturally clips there, no extra work needed.
  // stagePad's own CSS padding is the actual click area and is roughly
  // this many canvas-space px wide, so the two stay visually consistent.
  const OFF_SCREEN_MARGIN = 125;

  function clampOffScreen(pos) {
    return {
      x: Math.max(-OFF_SCREEN_MARGIN, Math.min(window.AnimEngine.CANVAS_WIDTH + OFF_SCREEN_MARGIN, pos.x)),
      y: Math.max(-OFF_SCREEN_MARGIN, Math.min(window.AnimEngine.CANVAS_HEIGHT + OFF_SCREEN_MARGIN, pos.y)),
    };
  }

  stagePad.addEventListener("mousedown", (evt) => {
    if (isExporting) return;
    const rawPos = canvasCoordsFromEvent(evt);

    if (hitTestRotateHandle(rawPos)) {
      draggingRotateOrnamentId = selectedOrnamentId;
      return;
    }

    if (hitTestResizeHandle(rawPos)) {
      draggingResizeOrnamentId = selectedOrnamentId;
      return;
    }

    const ornamentHit = hitTestOrnament(rawPos);
    if (ornamentHit) {
      selectedOrnamentId = ornamentHit;
      draggingOrnamentId = ornamentHit;
      updateOrnamentSelectionPanel();
      renderEditorFrame(Number(scrub.value));
      return;
    }

    if (selectedOrnamentId) {
      selectedOrnamentId = null;
      updateOrnamentSelectionPanel();
      renderEditorFrame(Number(scrub.value));
    }

    if (!editingAnimalId) return;
    const pos = clampOffScreen(rawPos);
    const hit = hitTestMarker(pos);
    if (hit >= 0) {
      draggingIndex = hit;
    } else {
      if (!isPointAllowedForAnimal(editingAnimalId, pos.x, pos.y)) {
        statusEl.textContent = habitatBlockedMessage(editingAnimalId);
        return;
      }
      path.push({ x: pos.x, y: pos.y, durationToNextMs: 1000 });
      draggingIndex = path.length - 1;
      afterPathStructureChange();
    }
    renderEditorFrame(Number(scrub.value));
  });

  window.addEventListener("mousemove", (evt) => {
    if (draggingResizeOrnamentId) {
      const o = placedOrnaments.get(draggingResizeOrnamentId);
      const image = o && ornamentSpriteCache.get(o.defId);
      if (o && image) {
        const pos = canvasCoordsFromEvent(evt);
        const dist = Math.hypot(pos.x - o.x, pos.y - o.y);
        const halfDiagonal = Math.hypot(image.naturalWidth / 2, image.naturalHeight / 2);
        const nextScale = Math.max(ORNAMENT_SCALE_MIN, Math.min(ORNAMENT_SCALE_MAX, dist / halfDiagonal));
        o.scale = nextScale;
        window.AnimEngine.setOrnamentScale(draggingResizeOrnamentId, nextScale);
        renderEditorFrame(Number(scrub.value));
      }
      return;
    }

    if (draggingRotateOrnamentId) {
      const o = placedOrnaments.get(draggingRotateOrnamentId);
      if (o) {
        const pos = canvasCoordsFromEvent(evt);
        const dx = pos.x - o.x;
        const dy = pos.y - o.y;
        o.rotation = Math.atan2(dx, -dy);
        window.AnimEngine.setOrnamentRotation(draggingRotateOrnamentId, o.rotation);
        renderEditorFrame(Number(scrub.value));
      }
      return;
    }

    if (draggingOrnamentId) {
      const pos = canvasCoordsFromEvent(evt);
      const o = placedOrnaments.get(draggingOrnamentId);
      if (o) {
        o.x = pos.x;
        o.y = pos.y;
        window.AnimEngine.updateOrnamentPosition(draggingOrnamentId, pos.x, pos.y);
        renderEditorFrame(Number(scrub.value));
      }
      return;
    }

    if (draggingIndex < 0) return;
    const pos = clampOffScreen(canvasCoordsFromEvent(evt));
    if (!isPointAllowedForAnimal(editingAnimalId, pos.x, pos.y)) {
      statusEl.textContent = habitatBlockedMessage(editingAnimalId);
      return; // leave the waypoint at its last valid position
    }
    path[draggingIndex].x = pos.x;
    path[draggingIndex].y = pos.y;
    syncEngine();
    renderEditorFrame(Number(scrub.value));
    renderWaypointList();
  });

  window.addEventListener("mouseup", () => {
    if (draggingResizeOrnamentId) {
      draggingResizeOrnamentId = null;
      return;
    }
    if (draggingRotateOrnamentId) {
      draggingRotateOrnamentId = null;
      return;
    }
    if (draggingOrnamentId) {
      draggingOrnamentId = null;
      return;
    }
    if (draggingIndex >= 0) {
      draggingIndex = -1;
      renderEditorFrame(Number(scrub.value));
    }
  });

  stagePad.addEventListener("contextmenu", (evt) => {
    evt.preventDefault();
    if (isExporting) return;
    const pos = canvasCoordsFromEvent(evt);
    const ornamentHit = hitTestOrnament(pos);
    if (ornamentHit) {
      placedOrnaments.delete(ornamentHit);
      window.AnimEngine.removeOrnament(ornamentHit);
      if (selectedOrnamentId === ornamentHit) {
        selectedOrnamentId = null;
        updateOrnamentSelectionPanel();
      }
      renderEditorFrame(Number(scrub.value));
      return;
    }

    if (!editingAnimalId) return;
    const hit = hitTestMarker(pos);
    if (hit >= 0) {
      path.splice(hit, 1);
      afterPathStructureChange();
    }
  });

  // Scroll (wheel) over a placed ornament to resize it in place — the
  // resize is centered on the ornament's own x/y (see drawOrnament in
  // engine.js), so it grows/shrinks without needing to be repositioned.
  stagePad.addEventListener(
    "wheel",
    (evt) => {
      if (isExporting) return;
      const pos = canvasCoordsFromEvent(evt);
      const hit = hitTestOrnament(pos);
      if (!hit) return;
      evt.preventDefault();
      resizeOrnament(hit, evt.deltaY);
    },
    { passive: false }
  );

  // Native HTML5 drag-and-drop for animals and ornaments. Drop coordinates
  // use the same logical canvas space as click-to-add-waypoint.
  stagePad.addEventListener("dragover", (evt) => {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "copy";
  });

  stagePad.addEventListener("drop", async (evt) => {
    evt.preventDefault();
    if (isExporting) return;

    const animalId = evt.dataTransfer.getData("application/x-path-animator-animal");
    if (animalId && animalDefFor(animalId)) {
      const pos = clampOffScreen(canvasCoordsFromEvent(evt));
      if (!isPointAllowedForAnimal(animalId, pos.x, pos.y)) {
        statusEl.textContent = habitatBlockedMessage(animalId);
        return;
      }
      const startAtMs = Math.max(0, Number(scrub.value) || 0);

      if (!activeAnimalIds.has(animalId)) {
        await activateAnimal(animalId, undefined, undefined, startAtMs);
      }

      const entry = animalData.get(animalId);
      if (!entry) return;
      entry.startAtMs = startAtMs;
      if (entry.path.length === 0) {
        entry.path.push({ x: pos.x, y: pos.y, durationToNextMs: 1000 });
      } else {
        entry.path[0].x = pos.x;
        entry.path[0].y = pos.y;
      }

      window.AnimEngine.setActorStartAtMs(animalId, startAtMs);
      selectEditingAnimal(animalId);
      afterPathStructureChange();
      statusEl.textContent = `${animalDefFor(animalId).label || animalId} starts at ${(startAtMs / 1000).toFixed(1)}s.`;
      return;
    }

    const ornamentId = evt.dataTransfer.getData("text/plain");
    if (!ornamentId || !ornamentDefFor(ornamentId)) return;
    const pos = canvasCoordsFromEvent(evt);
    await placeOrnamentAt(ornamentId, pos.x, pos.y);
  });

  scrub.addEventListener("input", () => {
    isPlaying = false;
    pauseAllAnimalAudio();
    playBtn.textContent = "Play";
    renderEditorFrame(Number(scrub.value));
    updateTimeLabel();
  });

  playBtn.addEventListener("click", () => {
    if (isPlaying) {
      isPlaying = false;
      pauseAllAnimalAudio();
      playBtn.textContent = "Play";
      return;
    }
    const total = window.AnimEngine.getTotalDurationMs();
    if (total <= 0) return;
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    playStartT = Number(scrub.value) >= total ? 0 : Number(scrub.value);
    playStartPerf = performance.now();
    isPlaying = true;
    playBtn.textContent = "Pause";
    requestAnimationFrame(tick);
  });

  function tick(now) {
    if (!isPlaying) return;
    const total = window.AnimEngine.getTotalDurationMs();
    let t = playStartT + (now - playStartPerf);
    if (t >= total) {
      t = total;
      isPlaying = false;
      playBtn.textContent = "Play";
    }
    scrub.value = String(t);
    renderEditorFrame(t);
    updateTimeLabel();
    updateAnimalAudio(t);
    if (!isPlaying) pauseAllAnimalAudio();
    if (isPlaying) requestAnimationFrame(tick);
  }

  const STEP_MS = 100;

  seekStartBtn.addEventListener("click", () => seekTo(0));
  seekEndBtn.addEventListener("click", () => seekTo(window.AnimEngine.getTotalDurationMs()));
  stepBackBtn.addEventListener("click", () => seekTo(Number(scrub.value) - STEP_MS));
  stepForwardBtn.addEventListener("click", () => seekTo(Number(scrub.value) + STEP_MS));

  function seekFromTimelineEvent(evt) {
    const rect = timelineCanvas.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (evt.clientX - rect.left) / rect.width));
    seekTo(frac * window.AnimEngine.getTotalDurationMs());
  }

  timelineCanvas.addEventListener("mousedown", (evt) => {
    if (isExporting) return;
    timelineDragging = true;
    seekFromTimelineEvent(evt);
  });
  window.addEventListener("mousemove", (evt) => {
    if (timelineDragging) seekFromTimelineEvent(evt);
  });
  window.addEventListener("mouseup", () => {
    timelineDragging = false;
  });

  window.addEventListener("resize", () => {
    if (currentScene) renderEditorFrame(Number(scrub.value));
  });

  clearBtn.addEventListener("click", () => {
    if (!editingAnimalId) return;
    setEditingPath([]);
    afterPathStructureChange();
  });

  [optRotation, optFlip, optWalkCycle, strideLength, optBobbing, bobAmplitude, pathSpeed, sizeScale, optShadow].forEach((el) => {
    el.addEventListener("input", () => {
      applyOptionsToEngine();
      renderEditorFrame(Number(scrub.value));
    });
  });

  // Shared shape for both a per-scene save (/api/path/:sceneId) and a named,
  // reusable template (/api/template/:name) — animal/ornament x,y are in
  // canvas space (1600x900, same for every background). sceneId records
  // which background the layout was built on; loadTemplateBtn uses it to
  // switch to that background automatically. Per-scene saves ignore it
  // (their filename already pins the scene), so this only really matters
  // for templates.
  function buildLayoutData() {
    return {
      sceneId: currentScene ? currentScene.id : null,
      activeAnimals: [...activeAnimalIds],
      animals: Object.fromEntries(
        [...animalData.entries()].map(([id, d]) => [id, { path: d.path, options: d.options, startAtMs: d.startAtMs || 0 }])
      ),
      placedOrnaments: [...placedOrnaments.entries()].map(([instanceId, o]) => ({
        instanceId,
        defId: o.defId,
        x: o.x,
        y: o.y,
        scale: o.scale || 1,
        rotation: o.rotation || 0,
        shadow: !!o.shadow,
      })),
      effects: sceneEffects,
    };
  }

  saveBtn.addEventListener("click", async () => {
    try {
      await fetch(`/api/path/${currentScene.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildLayoutData()),
      });
      statusEl.textContent = "Saved.";
      setTimeout(() => (statusEl.textContent = ""), 2000);
    } catch (err) {
      statusEl.textContent = "Save failed: " + err.message;
    }
  });

  async function fetchTemplateNames() {
    try {
      const res = await fetch(`/api/templates?v=${Date.now()}`);
      const data = await res.json();
      return data.templates || [];
    } catch (err) {
      return [];
    }
  }

  function populateTemplateDropdown(selectName) {
    templateSelect.innerHTML = "";
    templateNames.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      templateSelect.appendChild(opt);
    });
    if (selectName && templateNames.includes(selectName)) templateSelect.value = selectName;
  }

  async function refreshTemplateList(selectName) {
    templateNames = await fetchTemplateNames();
    populateTemplateDropdown(selectName);
  }

  // window.prompt()/window.confirm() replacement: Electron doesn't support
  // prompt() at all (throws "prompt() is and will not be supported"), and
  // confirm() is a real OS-blocking dialog there — this in-page modal works
  // identically in the packaged app and the plain browser dev workflow.
  // withInput: show a text field (prompt-style) vs. just OK/Cancel (confirm-style).
  function showModal(message, { withInput = false, defaultValue = "", okText = "OK", cancelText = "Cancel" } = {}) {
    return new Promise((resolve) => {
      modalMessageEl.textContent = message;
      modalOkBtn.textContent = okText;
      modalCancelBtn.textContent = cancelText;
      modalInputEl.hidden = !withInput;
      modalInputEl.value = defaultValue;
      modalOverlayEl.hidden = false;
      if (withInput) {
        modalInputEl.focus();
        modalInputEl.select();
      } else {
        modalOkBtn.focus();
      }

      function cleanup(result) {
        modalOverlayEl.hidden = true;
        modalOkBtn.removeEventListener("click", onOk);
        modalCancelBtn.removeEventListener("click", onCancel);
        modalInputEl.removeEventListener("keydown", onKeydown);
        resolve(result);
      }
      function onOk() {
        cleanup(withInput ? modalInputEl.value : true);
      }
      function onCancel() {
        cleanup(withInput ? null : false);
      }
      function onKeydown(evt) {
        if (evt.key === "Enter") onOk();
        else if (evt.key === "Escape") onCancel();
      }
      modalOkBtn.addEventListener("click", onOk);
      modalCancelBtn.addEventListener("click", onCancel);
      modalInputEl.addEventListener("keydown", onKeydown);
    });
  }

  function promptDialog(message, defaultValue = "") {
    return showModal(message, { withInput: true, defaultValue });
  }

  // Sidebar tabs: Change Background / Select Animal / Ornaments share the
  // same column, so only one panel is shown at a time. Defaults to
  // Background (see the "active"/non-hidden panel already set in the HTML).
  if (sidebarTabsEl) {
    sidebarTabsEl.addEventListener("click", (evt) => {
      const btn = evt.target.closest(".tab-btn");
      if (!btn) return;
      const tab = btn.dataset.tab;
      sidebarTabsEl.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.hidden = panel.id !== `tabPanel-${tab}`;
      });
    });
  }

  function confirmDialog(message) {
    return showModal(message, { withInput: false });
  }

  saveTemplateBtn.addEventListener("click", async () => {
    const name = await promptDialog("Save as template — name it:", templateSelect.value || "");
    if (name === null) return; // cancelled
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`/api/template/${encodeURIComponent(trimmed)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildLayoutData()),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await refreshTemplateList(trimmed);
      templateStatusEl.textContent = `Saved template "${trimmed}".`;
      setTimeout(() => (templateStatusEl.textContent = ""), 2000);
    } catch (err) {
      templateStatusEl.textContent = "Save failed: " + err.message;
    }
  });

  loadTemplateBtn.addEventListener("click", async () => {
    const name = templateSelect.value;
    if (!name) {
      templateStatusEl.textContent = "No template selected.";
      return;
    }
    try {
      const res = await fetch(`/api/template/${encodeURIComponent(name)}?v=${Date.now()}`);
      if (!res.ok) {
        templateStatusEl.textContent = "Template not found.";
        return;
      }
      const saved = await res.json();
      // Switch to the template's own background first (older templates saved
      // before sceneId was recorded, or one whose scene no longer exists,
      // just apply onto whatever background is currently showing).
      if (saved.sceneId && saved.sceneId !== currentScene?.id && scenes.some((s) => s.id === saved.sceneId)) {
        await loadScene(saved.sceneId, { loadSavedLayout: false });
      }
      await applyLayoutData(saved);
      scrub.value = "0";
      renderEditorFrame(0);
      updateTimeLabel();
      templateStatusEl.textContent = `Loaded template "${name}".`;
      setTimeout(() => (templateStatusEl.textContent = ""), 2000);
    } catch (err) {
      templateStatusEl.textContent = "Load failed: " + err.message;
    }
  });

  deleteTemplateBtn.addEventListener("click", async () => {
    const name = templateSelect.value;
    if (!name) return;
    const confirmed = await confirmDialog(`Delete template "${name}"?`);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/template/${encodeURIComponent(name)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refreshTemplateList();
      templateStatusEl.textContent = `Deleted "${name}".`;
      setTimeout(() => (templateStatusEl.textContent = ""), 2000);
    } catch (err) {
      templateStatusEl.textContent = "Delete failed: " + err.message;
    }
  });

  loadBtn.addEventListener("click", async () => {
    await loadSavedPathsForScene();
    scrub.value = "0";
    renderEditorFrame(0);
    updateTimeLabel();
    statusEl.textContent = "Loaded.";
    setTimeout(() => (statusEl.textContent = ""), 2000);
  });

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // Sprite assets (static pose + walk-cycle frames) depend only on the
  // animal, not the scene, so they're loaded once and reused across scenes.
  async function ensureActorSprite(id) {
    if (spriteCache.has(id)) return spriteCache.get(id);
    const def = animalDefFor(id);
    if (def && def.model3d) {
      const { loadAnimal3D } = await import('./animal-3d.js');
      const model3d = await loadAnimal3D(def.model3d, def.modelColor, def);
      const lizardImage = await loadImage(model3d.canvas.toDataURL());
      const entry = { lizardImage, model3d, walkFrames: [], rotationOffsetRad: 0, staticRotationOffsetRad: 0, strideLengthPx: def.strideLengthPx || 140 };
      spriteCache.set(id, entry);
      return entry;
    }
    const base = `assets/_animals/${id}`;
    const motionGrid = def && def.motionGrid;
    const frameCount = motionGrid ? (motionGrid.cols || 4) * (motionGrid.rows || 2) : 0;
    const walkFramePaths = Array.from(
      { length: frameCount },
      (_, i) => `${base}/walk_frames/frame_${String(i).padStart(2, "0")}.png?v=${assetCacheBust}`
    );
    const [lizardImage, walkFrames, rig] = await Promise.all([
      loadImage(`${base}/animal.png?v=${assetCacheBust}`),
      Promise.all(walkFramePaths.map((p) => loadImage(p))).catch(() => []),
      def && def.rig ? ensureActorRig(id, def, base) : Promise.resolve(null),
    ]);
    const rotationOffsetRad = ((def && def.rotationOffsetDeg) || 0) * (Math.PI / 180);
    const entry = {
      lizardImage,
      walkFrames,
      rotationOffsetRad,
      // A hand-authored static "source" image is drawn neutrally horizontal
      // (offset 0). When there's no separate source, the static pose is
      // derived from a walk-cycle frame instead (see prepare-assets.js), so
      // it shares that frame's own (non-horizontal) neutral orientation.
      staticRotationOffsetRad: def && def.source ? 0 : rotationOffsetRad,
      strideLengthPx: (def && def.strideLengthPx) || 140,
      rig,
    };
    spriteCache.set(id, entry);
    return entry;
  }

  // Loads a layered cutout rig's geometry (assets/_animals/<id>/rig/rig.json
  // + its layer PNGs, built by prepare-assets.js's buildRig) and merges in
  // this animal's *live* motion tuning straight from scenes.json (restAngle/
  // swingAmplitude/swingPhaseOffset/drawOrder, config/scenes.json's
  // animal.rig.limbs) rather than from anything baked into rig.json — so
  // retuning a swing amplitude is a JSON edit + reload, not an asset rebuild.
  // Returns null (falling back to walk-cycle frames) if the rig assets
  // haven't been built yet for this animal.
  async function ensureActorRig(id, def, base) {
    const rigDef = def.rig;
    try {
      const manifest = await fetch(`${base}/rig/rig.json?v=${assetCacheBust}`).then((res) => {
        if (!res.ok) throw new Error(`rig manifest HTTP ${res.status}`);
        return res.json();
      });
      const tuningByName = new Map((rigDef.limbs || []).map((l) => [l.name, l]));
      const [bodyImage, ...limbImages] = await Promise.all([
        loadImage(`${base}/rig/${manifest.body.file}?v=${assetCacheBust}`),
        ...manifest.limbs.map((l) => loadImage(`${base}/rig/${l.file}?v=${assetCacheBust}`)),
      ]);
      const limbs = manifest.limbs.map((l, i) => {
        const tuning = tuningByName.get(l.name) || {};
        return {
          name: l.name,
          image: limbImages[i],
          anchorOffset: l.anchorOffset,
          pivotLocal: l.pivotLocal,
          restAngleRad: ((tuning.restAngleDeg || 0) * Math.PI) / 180,
          swingAmplitudeRad: ((tuning.swingAmplitudeDeg || 0) * Math.PI) / 180,
          swingPhaseOffset: tuning.swingPhaseOffset || 0,
          drawOrder: tuning.drawOrder || "front",
        };
      });
      return {
        bodyImage,
        bodyDrawOffset: manifest.body.drawOffset,
        strideLengthPx: (rigDef.gait && rigDef.gait.strideLengthPx) || 140,
        // Rig layers are cut from the static "source" photo (neutrally
        // horizontal — same convention as staticRotationOffsetRad above),
        // which is commonly a different neutral orientation than the
        // separately-authored walk-cycle motion-grid sheet, so this isn't
        // necessarily the same as rotationOffsetDeg. Override per-animal via
        // rig.rotationOffsetDeg if a rig's own source art needs it.
        rotationOffsetRad: ((rigDef.rotationOffsetDeg || 0) * Math.PI) / 180,
        limbs,
      };
    } catch (err) {
      console.error(`Animal "${id}": failed to load rig assets, falling back to walk-cycle frames.`, err);
      return null;
    }
  }

  // Ornament artwork depends only on the ornament def, not the scene, so
  // it's loaded once and reused across scenes (same idea as ensureActorSprite).
  async function ensureOrnamentSprite(id) {
    if (ornamentSpriteCache.has(id)) return ornamentSpriteCache.get(id);
    const image = await loadImage(`assets/_ornaments/${id}/ornament.png?v=${assetCacheBust}`);
    ornamentSpriteCache.set(id, image);
    return image;
  }

  async function placeOrnamentAt(defId, x, y) {
    const image = await ensureOrnamentSprite(defId);
    const instanceId = `${defId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    placedOrnaments.set(instanceId, { defId, x, y, scale: 1, rotation: 0, shadow: false });
    window.AnimEngine.addOrnament(instanceId, image, x, y, 1, 0, false);
    selectedOrnamentId = instanceId;
    updateOrnamentSelectionPanel();
    renderEditorFrame(Number(scrub.value));
  }

  const ORNAMENT_SCALE_MIN = 0.2;
  const ORNAMENT_SCALE_MAX = 4;
  const ORNAMENT_SCALE_STEP = 1.08;

  function resizeOrnament(instanceId, deltaY) {
    const o = placedOrnaments.get(instanceId);
    if (!o) return;
    const factor = deltaY < 0 ? ORNAMENT_SCALE_STEP : 1 / ORNAMENT_SCALE_STEP;
    const nextScale = Math.max(ORNAMENT_SCALE_MIN, Math.min(ORNAMENT_SCALE_MAX, (o.scale || 1) * factor));
    o.scale = nextScale;
    window.AnimEngine.setOrnamentScale(instanceId, nextScale);
    renderEditorFrame(Number(scrub.value));
  }

  function renderOrnamentList() {
    ornamentListEl.innerHTML = "";
    ornamentDefs.forEach((def) => {
      const item = document.createElement("div");
      item.className = "ornament-item";
      item.draggable = !isExporting;
      item.title = `Drag onto the background to place a ${def.label || def.id}`;

      const img = document.createElement("img");
      img.src = `assets/_ornaments/${def.id}/ornament.png?v=${assetCacheBust}`;
      img.alt = def.label || def.id;
      item.appendChild(img);

      const label = document.createElement("span");
      label.textContent = def.label || def.id;
      item.appendChild(label);

      item.addEventListener("dragstart", (evt) => {
        evt.dataTransfer.setData("text/plain", def.id);
        evt.dataTransfer.effectAllowed = "copy";
      });

      ornamentListEl.appendChild(item);
    });
  }

  ornamentShadowToggleEl.addEventListener("change", () => {
    if (!selectedOrnamentId) return;
    const o = placedOrnaments.get(selectedOrnamentId);
    if (!o) return;
    o.shadow = ornamentShadowToggleEl.checked;
    window.AnimEngine.setOrnamentShadow(selectedOrnamentId, o.shadow);
    renderEditorFrame(Number(scrub.value));
  });

  // Shared Web Audio context, created lazily — only needed for animals whose
  // configured walkSound.volume exceeds 1, since HTMLAudioElement.volume is
  // capped at 1 and can't actually amplify a quiet recording.
  let audioCtx = null;

  // Applies a per-animal volume multiplier (config's walkSound.volume,
  // default 1). At or below 1 this is just the element's native volume
  // (quieter than the recording). Above 1, the native property can't help —
  // it clamps at 1 — so instead the element is routed through a Web Audio
  // gain node, which can genuinely amplify past the recording's own level.
  function applyAudioVolume(audio, volume) {
    if (volume <= 1) {
      audio.volume = Math.max(0, volume);
      return;
    }
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const gain = audioCtx.createGain();
    gain.gain.value = volume;
    audioCtx.createMediaElementSource(audio).connect(gain).connect(audioCtx.destination);
  }

  // Walking sound (looped), only if this animal defines one. Its playback
  // rate gets synced to the animal's actual instantaneous speed each frame
  // (see updateAnimalAudio) so faster movement sounds faster, not just
  // louder/repeated — same "walk faster = step faster" idea as the leg
  // animation, applied to audio.
  function ensureActorAudio(id) {
    if (audioCache.has(id)) return audioCache.get(id);
    const def = animalDefFor(id);
    const src = def && def.walkSound && def.walkSound.source;
    if (!src) {
      audioCache.set(id, null);
      return null;
    }
    const audio = new Audio(`${src}?v=${assetCacheBust}`);
    audio.loop = true;
    audio.preload = "auto";
    applyAudioVolume(audio, def.walkSound.volume ?? 1);
    audioCache.set(id, audio);
    return audio;
  }

  async function activateAnimal(id, pathOverride, optionsOverride, startAtMsOverride) {
    if (!animalData.has(id)) {
      animalData.set(id, {
        path: pathOverride || [],
        options: normalizeOptions(id, optionsOverride),
        startAtMs: Math.max(0, startAtMsOverride || 0),
      });
    }
    activeAnimalIds.add(id);
    const sprite = await ensureActorSprite(id);
    window.AnimEngine.setActorSprite(id, sprite.lizardImage, sprite.walkFrames, {
      rotationOffsetRad: sprite.rotationOffsetRad,
      staticRotationOffsetRad: sprite.staticRotationOffsetRad,
      strideLengthPx: sprite.strideLengthPx,
    });
    window.AnimEngine.setActorRig(id, sprite.rig);
    window.AnimEngine.setActor3D(id, sprite.model3d);
    ensureActorAudio(id);
    const entry = animalData.get(id);
    window.AnimEngine.setActorPath(id, entry.path);
    window.AnimEngine.setActorOptions(id, entry.options);
    window.AnimEngine.setActorStartAtMs(id, entry.startAtMs);
    window.AnimEngine.setActorSpeedMultiplier(id, entry.options.pathSpeedMultiplier || 1);
  }

  function deactivateAnimal(id) {
    activeAnimalIds.delete(id);
    window.AnimEngine.removeActor(id);
    const audio = audioCache.get(id);
    if (audio) audio.pause();
  }

  function pauseAllAnimalAudio() {
    audioCache.forEach((audio) => {
      if (audio && !audio.paused) audio.pause();
    });
  }

  const BASE_WALK_SOUND_SPEED_PX_PER_SEC = 150;
  const WALK_SOUND_RATE_MIN = 0.3;
  const WALK_SOUND_RATE_MAX = 3;

  // Exposed so the Electron export pipeline (electronExport.js) can render
  // each animal's walk-sound audio offline with the exact same speed→rate
  // curve used here, instead of duplicating these numbers and risking drift.
  window.__walkSoundTuning = { BASE_WALK_SOUND_SPEED_PX_PER_SEC, WALK_SOUND_RATE_MIN, WALK_SOUND_RATE_MAX };

  // Called every playback tick: starts/stops each active animal's walking
  // sound based on whether it's currently between its start time and the
  // end of its own path, and matches the sound's playback rate to its
  // current speed.
  function updateAnimalAudio(tMs) {
    activeAnimalIds.forEach((id) => {
      const audio = audioCache.get(id);
      if (!audio) return;
      const entry = animalData.get(id);
      const startAtMs = entry?.startAtMs || 0;
      const localT = tMs - startAtMs;
      const totalDur = window.AnimEngine.getActorTotalDurationMs(id);
      const shouldPlay = isPlaying && totalDur > 0 && localT >= 0 && localT <= totalDur;

      if (!shouldPlay) {
        if (!audio.paused) audio.pause();
        return;
      }

      const speed = window.AnimEngine.getActorSpeedPxPerSec(id, localT);
      // Wing/fin sounds keep time with a time-driven clip, not with speed.
      const def = animalDefFor(id);
      const fixedRate = def?.walkSound?.fixedRate ?? def?.modelAnimation === "fly";
      const rate = fixedRate ? 1 : Math.min(
        WALK_SOUND_RATE_MAX,
        Math.max(WALK_SOUND_RATE_MIN, speed / BASE_WALK_SOUND_SPEED_PX_PER_SEC)
      );
      audio.playbackRate = rate;
      if (audio.paused) audio.play().catch(() => {});
    });
  }

  function selectEditingAnimal(id) {
    editingAnimalId = id || null;
    editingAnimalLabelEl.textContent = editingAnimalId ? (animalDefFor(editingAnimalId)?.label || editingAnimalId) : "—";
    setControlsEnabled(!!editingAnimalId);

    if (editingAnimalId && animalData.has(editingAnimalId)) {
      const entry = animalData.get(editingAnimalId);
      path = entry.path;
      optRotation.checked = !!entry.options.rotationFollowsPath;
      optFlip.checked = !!entry.options.flip;
      optWalkCycle.checked = entry.options.useWalkCycle !== false;
      strideLength.value = entry.options.strideLengthPx ?? 140;
      optBobbing.checked = !!entry.options.bobbing;
      bobAmplitude.value = entry.options.bobbingAmplitude ?? 6;
      pathSpeed.value = entry.options.pathSpeedMultiplier ?? 1;
      pathSpeedLabel.textContent = `${(entry.options.pathSpeedMultiplier ?? 1).toFixed(2)}x`;
      sizeScale.value = entry.options.sizeScale ?? 1;
      sizeScaleLabel.textContent = `${(entry.options.sizeScale ?? 1).toFixed(2)}x`;
      optShadow.checked = !!entry.options.shadow;
    } else {
      path = [];
    }

    draggingIndex = -1;
    renderAnimalList();
    renderWaypointList();
    renderEditorFrame(Number(scrub.value));
  }

  async function toggleAnimalActive(id, active) {
    if (active) {
      await activateAnimal(id);
      selectEditingAnimal(id);
      statusEl.textContent = `${animalDefFor(id).label || id} selected. Click the background to place it, then add another point and press Play.`;
    } else {
      deactivateAnimal(id);
      if (editingAnimalId === id) {
        const next = [...activeAnimalIds][0] || null;
        selectEditingAnimal(next);
      }
    }
    renderAnimalList();
    refreshScrubRange();
    renderEditorFrame(Number(scrub.value));
  }

  function renderAnimalList() {
    animalListEl.innerHTML = "";
    animalDefs.forEach((def) => {
      const row = document.createElement("div");
      row.className = "animal-row" + (def.id === editingAnimalId ? " editing" : "");

      const habitat = def.habitat || "ground";
      const available = isHabitatAvailableInScene(habitat, currentSceneZones) || activeAnimalIds.has(def.id);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = activeAnimalIds.has(def.id);
      checkbox.disabled = isExporting || !available;
      checkbox.addEventListener("click", (evt) => evt.stopPropagation());
      checkbox.addEventListener("change", async () => {
        checkbox.disabled = true;
        statusEl.textContent = checkbox.checked ? 'Loading animal…' : '';
        try { await toggleAnimalActive(def.id, checkbox.checked); }
        catch (error) {
          deactivateAnimal(def.id);
          renderAnimalList();
          statusEl.textContent = 'Could not load animal: ' + error.message;
        }
      });
      row.appendChild(checkbox);

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = def.label || def.id;
      name.draggable = !isExporting && available;
      name.title = available
        ? "Drag onto the video to place this animal at the current timeline time"
        : `${def.label || def.id} needs a "${habitat}" area, which this scene doesn't have.`;
      name.addEventListener("dragstart", (evt) => {
        evt.stopPropagation();
        evt.dataTransfer.setData("application/x-path-animator-animal", def.id);
        evt.dataTransfer.setData("text/plain", def.id);
        evt.dataTransfer.effectAllowed = "copy";
      });
      row.appendChild(name);

      const startLabel = document.createElement("label");
      startLabel.className = "start-at";
      startLabel.textContent = "start";
      const startInput = document.createElement("input");
      startInput.type = "number";
      startInput.min = "0";
      startInput.step = "0.1";
      startInput.disabled = isExporting || !activeAnimalIds.has(def.id);
      const entryForStart = animalData.get(def.id);
      startInput.value = entryForStart ? (entryForStart.startAtMs || 0) / 1000 : 0;
      startInput.title = "Seconds into the timeline before this animal appears and starts walking";
      startInput.addEventListener("click", (evt) => evt.stopPropagation());
      startInput.addEventListener("input", () => {
        const ms = Math.max(0, Number(startInput.value) || 0) * 1000;
        const entry = animalData.get(def.id);
        if (!entry) return;
        entry.startAtMs = ms;
        window.AnimEngine.setActorStartAtMs(def.id, ms);
        refreshScrubRange();
        renderEditorFrame(Number(scrub.value));
      });
      startLabel.appendChild(startInput);
      startLabel.appendChild(document.createTextNode("s"));
      row.appendChild(startLabel);

      row.addEventListener("click", async (event) => {
        if (isExporting || !available || event.target.closest('input, label')) return;
        if (activeAnimalIds.has(def.id)) selectEditingAnimal(def.id);
        else {
          statusEl.textContent = 'Loading animal…';
          try { await toggleAnimalActive(def.id, true); }
          catch (error) {
            deactivateAnimal(def.id);
            renderAnimalList();
            statusEl.textContent = 'Could not load animal: ' + error.message;
          }
        }
      });

      animalListEl.appendChild(row);
    });
  }

  // Applies a saved layout (the shape shared by a per-scene save and a named
  // template — see buildLayoutData) to the current scene: resets animals and
  // placed ornaments, then re-registers them as engine actors.
  async function applyLayoutData(saved) {
    // Older layouts saved the yellow lizard as 'lizard-3d' or 'yellow'; it is
    // now 'lizard-yellow'.
    const legacyYellow = ['lizard-3d', 'yellow'].find(id => saved?.activeAnimals?.includes(id));
    if (legacyYellow) {
      saved = {
        ...saved,
        activeAnimals: [...new Set(saved.activeAnimals.map(id => id === 'lizard-3d' || id === 'yellow' ? 'lizard-yellow' : id))],
        animals: { ...saved.animals, 'lizard-yellow': saved.animals?.['lizard-yellow'] || saved.animals?.[legacyYellow] },
      };
    }
    animalData = new Map();
    activeAnimalIds = new Set();
    window.AnimEngine.clearActors();
    sceneEffects = saved?.effects || null;
    applySceneEffects();

    placedOrnaments = new Map();
    window.AnimEngine.clearOrnaments();
    selectedOrnamentId = null;
    updateOrnamentSelectionPanel();

    const savedActive =
      saved && Array.isArray(saved.activeAnimals)
        ? saved.activeAnimals.filter((id) => animalDefFor(id))
        : null;
    const activeList = savedActive && savedActive.length > 0
      ? savedActive
      : [animalDefs[0] && animalDefs[0].id].filter(Boolean);

    for (const id of activeList) {
      const entry = saved && saved.animals && saved.animals[id];
      await activateAnimal(id, entry && entry.path, entry && entry.options, entry && entry.startAtMs);
    }

    if (saved && Array.isArray(saved.placedOrnaments)) {
      for (const o of saved.placedOrnaments) {
        if (!o || !ornamentDefFor(o.defId)) continue;
        const image = await ensureOrnamentSprite(o.defId);
        const scale = o.scale || 1;
        const rotation = o.rotation || 0;
        const shadow = !!o.shadow;
        placedOrnaments.set(o.instanceId, { defId: o.defId, x: o.x, y: o.y, scale, rotation, shadow });
        window.AnimEngine.addOrnament(o.instanceId, image, o.x, o.y, scale, rotation, shadow);
      }
    }

    selectEditingAnimal(activeList[0] || null);
    refreshScrubRange();
  }

  // Loads the saved per-animal paths/options for the current scene, or
  // starts fresh if none saved yet.
  async function loadSavedPathsForScene() {
    let saved = null;
    try {
      // An export of a generated layout (Generate Video's random mix) loads
      // that layout instead of the scene's own saved one.
      const layoutId = isExportMode ? urlParams.get("layout") : null;
      const res = await fetch(layoutId ? `/api/auto-layout/${encodeURIComponent(layoutId)}` : `/api/path/${currentScene.id}`);
      if (res.ok) saved = await res.json();
    } catch (err) {
      saved = null;
    }
    await applyLayoutData(saved);
  }

  // loadSavedLayout: whether to replace the current animals/paths/placed
  // ornaments with whatever's saved for `sceneId`. Defaults to false so
  // picking a different background from the dropdown just swaps the
  // backdrop — it does not discard whatever you're currently working on;
  // use "Load Path" (or pass true, as the initial page load does) to
  // actually pull in that scene's own saved layout.
  async function loadScene(sceneId, { loadSavedLayout = false } = {}) {
    isPlaying = false;
    pauseAllAnimalAudio();
    playBtn.textContent = "Play";

    const scene = scenes.find((s) => s.id === sceneId) || scenes[0];
    currentScene = scene;
    sceneSelect.value = scene.id;

    // Cache-bust: if the user just re-ran prepare-assets for this scene
    // (same filenames, new content) and clicked Reload Scenes, a plain
    // <img src> re-fetch could otherwise show stale cached image bytes.
    const bgImage = await loadImage(`assets/${scene.id}/background.jpg?v=${assetCacheBust}`);
    window.AnimEngine.setContext(ctx, bgImage);
    window.AnimEngine.setBackgroundSway(scene.sway || null); // plants move only on scenes configured to
    currentSceneZones = await fetchSceneZones(scene.id);
    applySceneEffects(); // water areas differ per scene

    window.AnimEngine.clearScrollLayers();
    for (const band of currentSceneZones.bands || []) {
      if (!band.cloud) continue;
      const cloudImage = await loadImage(`assets/${scene.id}/${band.cloud.image}?v=${assetCacheBust}`);
      window.AnimEngine.setScrollLayer(band.zone, cloudImage, band.y0, band.y1, band.cloud.scrollPxPerSec);
    }

    if (!isExportMode) localStorage.setItem(LAST_SCENE_STORAGE_KEY, scene.id);
    syncShortsCropControl();

    draggingIndex = -1;
    if (loadSavedLayout) await loadSavedPathsForScene();
    renderAnimalList(); // habitat availability (currentSceneZones) and/or active set just changed
    scrub.value = "0";
    renderEditorFrame(0);
    updateTimeLabel();
  }

  // ---------------------------------------------------------------------
  // Background motion (see engine.js setSceneEffects). sceneEffects is what
  // gets saved with a layout; water areas are filled in from the current
  // scene's zone map when applied, so a layout moved to another background
  // ripples in that background's own water.
  // ---------------------------------------------------------------------
  function waterRects(zones) {
    const W = window.AnimEngine.CANVAS_WIDTH;
    return [
      ...(zones.patches || []).filter((p) => p.zone === "water").map((p) => ({ x: p.x, y: p.y, w: p.w, h: p.h })),
      ...(zones.bands || []).filter((b) => b.zone === "water").map((b) => ({ x: 0, y: b.y0, w: W, h: b.y1 - b.y0 })),
    ];
  }

  function applySceneEffects() {
    let fx = sceneEffects ? JSON.parse(JSON.stringify(sceneEffects)) : null;
    const rects = waterRects(currentSceneZones);
    if (fx?.water) {
      if (rects.length) fx.water.rects = rects;
      else delete fx.water;
    }
    window.AnimEngine.setSceneEffects(fx);
    if (!fxLightEl) return;
    fxLightEl.checked = !!sceneEffects?.light;
    fxWaterEl.checked = !!sceneEffects?.water && rects.length > 0;
    fxWaterEl.disabled = rects.length === 0;
    fxWaterHintEl.textContent = rects.length === 0 ? "(this scene has no water)" : "";
    fxParticlesEl.checked = !!sceneEffects?.particles;
    if (sceneEffects?.particles) fxParticleKindEl.value = sceneEffects.particles.kind;
    fxCameraEl.checked = !!sceneEffects?.camera;
  }

  // Snow scenes get snow, outdoor scenes leaves or petals, indoor ones dust.
  function particleKindFor(sceneId, rand = Math.random) {
    const scene = scenes.find((s) => s.id === sceneId);
    if (/snow/i.test(sceneId)) return "snow";
    if (scene?.category === "outdoor") return rand() < 0.6 ? "leaves" : "petals";
    return "dust";
  }

  function randomParticles(kind, rand = Math.random) {
    const ranges = { leaves: [8, 16, 25, 60], petals: [14, 26, 20, 45], snow: [70, 130, 10, 30], dust: [40, 80, 4, 12] };
    const [cMin, cMax, wMin, wMax] = ranges[kind];
    const angle = rand() * Math.PI * 2;
    const wind = wMin + rand() * (wMax - wMin);
    return {
      kind,
      count: Math.round(cMin + rand() * (cMax - cMin)),
      wind: { x: Math.cos(angle) * wind, y: Math.sin(angle) * wind },
    };
  }

  function randomLight(sceneId, rand = Math.random) {
    const outdoor = scenes.find((s) => s.id === sceneId)?.category === "outdoor";
    return {
      strength: outdoor ? 0.3 + rand() * 0.3 : 0.16 + rand() * 0.18,
      scale: 1.1 + rand() * 0.9,
      speed: 2 + rand() * 8,
      angle: rand() * Math.PI * 2,
    };
  }

  function randomCamera(rand = Math.random) {
    const a = 1 + rand() * 0.03;
    const b = 1.05 + rand() * 0.07;
    const pushIn = rand() < 0.7;
    return { zoomFrom: pushIn ? a : b, zoomTo: pushIn ? b : a, panX: rand() * 2 - 1, panY: rand() * 2 - 1 };
  }

  // A random mix of effects suited to the scene; always at least one.
  // Camera drift only when allowed: on a floor it reads as the ground moving.
  function randomSceneEffects(sceneId, zones, rand = Math.random, { camera = true } = {}) {
    const outdoor = scenes.find((s) => s.id === sceneId)?.category === "outdoor";
    const fx = { seed: Math.floor(rand() * 1e9) };
    // Open sky has no canopy to cast dappled light, nor dust/leaves drifting
    // across it; camera drift alone keeps it moving.
    if (isSkyScene(sceneId)) {
      if (camera) fx.camera = randomCamera(rand);
      return fx;
    }
    if (rand() < (outdoor ? 0.8 : 0.5)) fx.light = randomLight(sceneId, rand);
    if (waterRects(zones).length) fx.water = { strength: 0.4 + rand() * 0.4 };
    if (rand() < 0.65) fx.particles = randomParticles(particleKindFor(sceneId, rand), rand);
    if (camera && rand() < 0.7) fx.camera = randomCamera(rand);
    if (!(fx.light || fx.water || fx.particles || fx.camera)) fx.light = randomLight(sceneId, rand);
    return fx;
  }

  function onEffectsChanged() {
    applySceneEffects();
    renderEditorFrame(Number(scrub.value));
  }

  function toggleEffect(key, on, make) {
    const fx = { seed: Math.floor(Math.random() * 1e9), ...(sceneEffects || {}) };
    if (on) fx[key] = fx[key] || make();
    else delete fx[key];
    sceneEffects = fx.light || fx.water || fx.particles || fx.camera ? fx : null;
    onEffectsChanged();
  }

  if (fxLightEl) {
    fxLightEl.addEventListener("change", () => toggleEffect("light", fxLightEl.checked, () => randomLight(currentScene?.id)));
    fxWaterEl.addEventListener("change", () => toggleEffect("water", fxWaterEl.checked, () => ({ strength: 0.6 })));
    fxParticlesEl.addEventListener("change", () =>
      toggleEffect("particles", fxParticlesEl.checked, () => randomParticles(fxParticleKindEl.value))
    );
    fxParticleKindEl.addEventListener("change", () => {
      if (!fxParticlesEl.checked) return;
      sceneEffects = { ...sceneEffects, particles: randomParticles(fxParticleKindEl.value) };
      onEffectsChanged();
    });
    fxCameraEl.addEventListener("change", () => toggleEffect("camera", fxCameraEl.checked, () => randomCamera()));
    // New random look: re-roll the seed and the settings of whatever is on
    // (or a whole random mix if nothing is on yet).
    fxShuffleBtn.addEventListener("click", () => {
      if (!currentScene) return;
      if (!sceneEffects) {
        sceneEffects = randomSceneEffects(currentScene.id, currentSceneZones);
      } else {
        const fx = { seed: Math.floor(Math.random() * 1e9) };
        if (sceneEffects.light) fx.light = randomLight(currentScene.id);
        if (sceneEffects.water) fx.water = { strength: 0.4 + Math.random() * 0.4 };
        if (sceneEffects.particles) fx.particles = randomParticles(sceneEffects.particles.kind);
        if (sceneEffects.camera) fx.camera = randomCamera();
        sceneEffects = fx;
      }
      onEffectsChanged();
    });
  }

  async function fetchConfig() {
    const res = await fetch(`/api/config?v=${Date.now()}`);
    return res.json();
  }

  // Scenes without a category (or an unrecognized one) fall into their own
  // trailing group rather than being silently dropped, so a future scene
  // added without a category still shows up somewhere.
  const SCENE_CATEGORY_ORDER = [
    { key: "outdoor", label: "Outdoor" },
    { key: "indoor", label: "Indoor" },
    { key: "underwater", label: "Underwater" },
    { key: "sky", label: "Sky" },
    { key: "floor", label: "Floor / Other" },
  ];

  // Themed scenes (e.g. "halloween") keep their normal category — it still
  // drives habitat filtering and outdoor effects — but are listed in a group
  // of their own and only join a random mix when that theme is picked.
  const SCENE_THEMES = [{ key: "halloween", label: "Halloween" }];

  function themeLabel(key) {
    return SCENE_THEMES.find((t) => t.key === key)?.label || key;
  }

  function populateSceneDropdown() {
    sceneSelect.innerHTML = "";
    const byCategory = new Map(SCENE_CATEGORY_ORDER.map((c) => [c.key, []]));
    const byTheme = new Map();
    const uncategorized = [];
    scenes.forEach((scene) => {
      if (scene.theme) {
        if (!byTheme.has(scene.theme)) byTheme.set(scene.theme, []);
        byTheme.get(scene.theme).push(scene);
        return;
      }
      const bucket = byCategory.get(scene.category);
      if (bucket) bucket.push(scene);
      else uncategorized.push(scene);
    });

    const appendGroup = (label, list) => {
      if (list.length === 0) return;
      const group = document.createElement("optgroup");
      group.label = label;
      list.forEach((scene) => {
        const opt = document.createElement("option");
        opt.value = scene.id;
        opt.textContent = scene.label || scene.id;
        group.appendChild(opt);
      });
      sceneSelect.appendChild(group);
    };

    SCENE_CATEGORY_ORDER.forEach(({ key, label }) => appendGroup(label, byCategory.get(key)));
    byTheme.forEach((list, key) => appendGroup(themeLabel(key), list));
    appendGroup("Other", uncategorized);
  }

  // Checklist for the "Batch Export" feature: pick up to MULTI_EXPORT_MAX
  // scenes to save the current layout to and export all at once. Kept in
  // sync with `scenes` (re-render on reload) and with isExporting (locked
  // the same way the rest of the editor is during any export).
  function renderMultiExportSceneList() {
    multiExportSceneListEl.innerHTML = "";
    const atCap = multiExportSelectedIds.size >= MULTI_EXPORT_MAX;
    scenes.forEach((scene) => {
      const row = document.createElement("label");
      row.className = "animal-row scene-check-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = multiExportSelectedIds.has(scene.id);
      checkbox.disabled = isExporting || (!checkbox.checked && atCap);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) multiExportSelectedIds.add(scene.id);
        else multiExportSelectedIds.delete(scene.id);
        renderMultiExportSceneList();
      });
      row.appendChild(checkbox);

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = scene.label || scene.id;
      row.appendChild(name);

      multiExportSceneListEl.appendChild(row);
    });

    multiExportBtn.disabled = isExporting || multiExportSelectedIds.size === 0;
    multiExportBtn.textContent =
      multiExportSelectedIds.size > 0
        ? `Export Selected (${multiExportSelectedIds.size}/${MULTI_EXPORT_MAX})`
        : "Export Selected";
  }

  function renderMultiExportProgressList(sceneIds) {
    multiExportProgressListEl.innerHTML = "";
    sceneIds.forEach((sceneId) => {
      const scene = scenes.find((s) => s.id === sceneId);
      const row = document.createElement("div");
      row.className = "scene-progress-row";

      const label = document.createElement("span");
      label.textContent = scene ? scene.label || scene.id : sceneId;
      row.appendChild(label);

      const status = document.createElement("span");
      status.className = "scene-progress-status";
      status.id = `multiExportStatus-${sceneId}`;
      status.textContent = "Queued…";
      row.appendChild(status);

      multiExportProgressListEl.appendChild(row);
    });
  }

  function setMultiExportRowStatus(sceneId, text, kind) {
    const el = document.getElementById(`multiExportStatus-${sceneId}`);
    if (!el) return;
    el.textContent = text;
    el.className = "scene-progress-status" + (kind ? ` ${kind}` : "");
  }

  reloadScenesBtn.addEventListener("click", async () => {
    const previousSceneId = currentScene ? currentScene.id : null;
    try {
      assetCacheBust = Date.now();
      spriteCache.forEach(entry => entry.model3d?.dispose());
      spriteCache = new Map();
      ornamentSpriteCache = new Map();
      pauseAllAnimalAudio();
      audioCache = new Map();
      const config = await fetchConfig();
      scenes = config.scenes || [];
      animalDefs = config.animals || [];
      ornamentDefs = config.ornaments || [];
      populateSceneDropdown();
      renderOrnamentList();
      multiExportSelectedIds = new Set([...multiExportSelectedIds].filter((id) => scenes.some((s) => s.id === id)));
      renderMultiExportSceneList();
      const nextSceneId =
        (previousSceneId && scenes.some((s) => s.id === previousSceneId) && previousSceneId) ||
        (scenes[0] && scenes[0].id);
      if (nextSceneId) await loadScene(nextSceneId);
      configStatusEl.textContent = `Reloaded (${scenes.length} scene${scenes.length === 1 ? "" : "s"}, ${animalDefs.length} animal${animalDefs.length === 1 ? "" : "s"}, ${ornamentDefs.length} ornament${ornamentDefs.length === 1 ? "" : "s"}).`;
    } catch (err) {
      configStatusEl.textContent = "Reload failed: " + err.message;
    }
    setTimeout(() => (configStatusEl.textContent = ""), 2500);
  });

  // ---------------------------------------------------------------------
  // Auto-Generate Video: builds a random walk-in/wander/walk-out path for
  // each chosen animal on each chosen background, then saves + exports each
  // background exactly like Batch Export does — just with a computer-
  // generated layout instead of whatever's currently on the canvas.
  // ---------------------------------------------------------------------

  const AUTO_GEN_OFFSCREEN_MARGIN = 220; // how far past the canvas edge entry/exit points land — enough that the sprite is fully hidden, not just clipped at the edge
  const AUTO_GEN_MIN_SEGMENT_MS = 600; // floor per leg so a short hop never reads as an instant jump
  const AUTO_GEN_SPEED_MIN = 90; // px/sec
  const AUTO_GEN_SPEED_MAX = 200; // px/sec
  const AUTO_GEN_PATH_SPEED_MIN = 0.7; // default random per-animal "Path speed" multiplier, so animals in one video don't all move at 1.00x
  const AUTO_GEN_PATH_SPEED_MAX = 1.6;

  // The modal's "Animal speed" from/to inputs, clamped to the Path speed
  // slider's 0.25–3 range; a reversed pair is swapped.
  function autoGenSpeedRange() {
    const clamp = (v, fallback) => Math.max(0.25, Math.min(3, Number(v) || fallback));
    const a = clamp(autoGenSpeedMinEl.value, AUTO_GEN_PATH_SPEED_MIN);
    const b = clamp(autoGenSpeedMaxEl.value, AUTO_GEN_PATH_SPEED_MAX);
    return a <= b ? [a, b] : [b, a];
  }
  const AUTO_GEN_DWELL_MIN_MS = 1500; // how long the animal pauses at its on-screen stop — long enough to actually register on screen, not just flash past
  const AUTO_GEN_DWELL_MAX_MS = 2600;
  const AUTO_GEN_INTERIOR_PAD_FRACTION = 0.22; // keeps the dwell point well clear of the edges (not just technically on-canvas), so it isn't half-clipped by the frame

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function pickRandomSide(excludeSide) {
    const sides = ["left", "right", "top", "bottom"].filter((s) => s !== excludeSide);
    return sides[Math.floor(Math.random() * sides.length)];
  }

  // frame: the visible part of the canvas ({ x, y, w, h }, see videoFrame).
  function randomEdgePoint(side, frame, margin) {
    const { x, y, w, h } = frame;
    switch (side) {
      case "left":
        return { x: x - margin, y: randRange(y, y + h) };
      case "right":
        return { x: x + w + margin, y: randRange(y, y + h) };
      case "top":
        return { x: randRange(x, x + w), y: y - margin };
      default:
        return { x: randRange(x, x + w), y: y + h + margin };
    }
  }

  function randomInteriorPoint(frame, pad) {
    return { x: randRange(frame.x + pad, frame.x + frame.w - pad), y: randRange(frame.y + pad, frame.y + frame.h - pad) };
  }

  function pointInFrame(p, frame) {
    return p.x >= frame.x && p.x <= frame.x + frame.w && p.y >= frame.y && p.y <= frame.y + frame.h;
  }

  // A point of the habitat's own zone that's also inside the frame
  // (rejection-sampled; a Short's frame is about a third of the canvas).
  function sampleZonePointInFrame(zones, habitat, frame) {
    const W = window.AnimEngine.CANVAS_WIDTH;
    const H = window.AnimEngine.CANVAS_HEIGHT;
    let p = window.SceneZones.sampleZonePoint(zones, habitat, W, H);
    for (let attempt = 0; attempt < 60 && !pointInFrame(p, frame); attempt++) {
      p = window.SceneZones.sampleZonePoint(zones, habitat, W, H);
    }
    if (pointInFrame(p, frame)) return p;
    return {
      x: Math.max(frame.x, Math.min(frame.x + frame.w, p.x)),
      y: Math.max(frame.y, Math.min(frame.y + frame.h, p.y)),
    };
  }

  // Ground's dwell point additionally avoids landing inside another zone
  // (e.g. a sky band or a water patch) that happens to overlap the padded
  // interior rectangle — rejection-sampled against the real zone map rather
  // than just the rectangle, since "ground" has no rect of its own (it's
  // whatever isn't claimed by another zone). Falls back to the plain
  // interior point if the scene is unusually zone-dense.
  function randomGroundDwellPoint(zones, frame, pad) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const p = randomInteriorPoint(frame, pad);
      if (window.SceneZones.zoneAt(zones, p.x, p.y) === "ground") return p;
    }
    return randomInteriorPoint(frame, pad);
  }

  // Entry -> dwell (a clearly-on-screen point, visited twice in a row so the
  // animal actually pauses there rather than just passing through it for a
  // single instant) -> exit. Durations are computed from distance at a
  // random-but-constant speed, except the dwell itself, which uses a fixed
  // range independent of distance — that's the segment that guarantees the
  // animal is visible for a real stretch of time, not a blink.
  //
  // "ground" animals enter/exit from off-screen edges of the whole canvas,
  // same as before this habitat system existed. Animals confined to a
  // specific zone (e.g. a goldfish's water patch, a bird's sky band) instead
  // stay entirely within that zone's rect for the whole path — there's no
  // "off-screen" for a fish the way there is for something that can walk in
  // from outside the frame. Either way, calling this again — even for the
  // same animal — produces a visibly different path (used to guarantee every
  // background gets its own route).
  // frame: the visible part of the canvas (see videoFrame) — "off-screen"
  // and "on-screen" are relative to it, so a Short's animals stay in its strip.
  function generateAutoWalkPath(habitat, zones, wanderStops = 0, frame = videoFrame("landscape")) {
    const pad = Math.round(Math.min(frame.w, frame.h) * AUTO_GEN_INTERIOR_PAD_FRACTION);

    let entry, dwell, exit, pickStop;
    if (habitat === "ground") {
      const entrySide = pickRandomSide();
      const exitSide = Math.random() < 0.55 ? entrySide : pickRandomSide(entrySide);
      entry = randomEdgePoint(entrySide, frame, AUTO_GEN_OFFSCREEN_MARGIN);
      dwell = randomGroundDwellPoint(zones, frame, pad);
      exit = randomEdgePoint(exitSide, frame, AUTO_GEN_OFFSCREEN_MARGIN);
      pickStop = () => randomGroundDwellPoint(zones, frame, pad);
    } else {
      pickStop = () => sampleZonePointInFrame(zones, habitat, frame);
      entry = pickStop();
      dwell = pickStop();
      exit = pickStop();
    }

    // Extra wander stops, split randomly before and after the pause.
    const stops = Array.from({ length: wanderStops }, pickStop);
    const before = Math.floor(Math.random() * (wanderStops + 1));
    const points = [entry, ...stops.slice(0, before), dwell, dwell, ...stops.slice(before), exit];

    const speed = randRange(AUTO_GEN_SPEED_MIN, AUTO_GEN_SPEED_MAX);
    const dwellMs = Math.round(randRange(AUTO_GEN_DWELL_MIN_MS, AUTO_GEN_DWELL_MAX_MS));
    const dwellIndex = before + 1; // segment from dwell to its repeat is the pause
    const durations = [];
    for (let i = 0; i < points.length - 1; i++) {
      const dist = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
      durations.push(i === dwellIndex ? dwellMs : Math.max(AUTO_GEN_MIN_SEGMENT_MS, Math.round((dist / speed) * 1000)));
    }
    return { points, durations, dwellIndex };
  }

  // A walk shape whose natural length fills most of budgetMs: adds wander
  // stops (up to 3) until it does, so in a long video the animal keeps
  // moving around the scene instead of crossing it once.
  function generateAutoWalkForBudget(habitat, zones, budgetMs, frame) {
    let shape = generateAutoWalkPath(habitat, zones, 0, frame);
    for (let stops = 1; stops <= 3 && sum(shape.durations) < budgetMs * 0.8; stops++) {
      shape = generateAutoWalkPath(habitat, zones, stops, frame);
    }
    return shape;
  }

  function sum(values) {
    return values.reduce((a, b) => a + b, 0);
  }

  // Fits a generateAutoWalkPath() shape into budgetMs, prioritizing the dwell
  // segment — the part where the animal is sure to be on screen — over the
  // moving legs. A short video or a tight per-animal budget compresses the
  // legs first, down to their own minimum floor, and only eats into the
  // dwell itself once the legs can't shrink any further.
  function fitAutoWalkToBudget({ points, durations, dwellIndex }, budgetMs) {
    const legFloor = AUTO_GEN_MIN_SEGMENT_MS;
    const naturalTotal = sum(durations);
    if (naturalTotal <= budgetMs) {
      return { path: buildWalkPath(points, durations), totalDurationMs: naturalTotal };
    }

    const dwellMs = durations[dwellIndex];
    const legCount = durations.length - 1;
    const legsTotal = naturalTotal - dwellMs;
    const legsBudget = Math.max(legFloor * legCount, budgetMs - dwellMs);
    const factor = legsBudget / legsTotal;
    const fitted = durations.map((d, i) => (i === dwellIndex ? d : Math.max(legFloor, Math.round(d * factor))));

    // Even every leg at its floor plus the full dwell might still exceed a
    // very tight budget — as a last resort shrink the dwell too, but never
    // below a small floor so there's still something to see.
    const remainingForDwell = budgetMs - (sum(fitted) - fitted[dwellIndex]);
    if (remainingForDwell < fitted[dwellIndex]) {
      fitted[dwellIndex] = Math.max(400, remainingForDwell);
    }
    return { path: buildWalkPath(points, fitted), totalDurationMs: sum(fitted) };
  }

  function buildWalkPath(points, durations) {
    return points.map((p, i) => ({ x: p.x, y: p.y, durationToNextMs: i < durations.length ? durations[i] : 0 }));
  }

  // ---------------------------------------------------------------------
  // Prey motion ("dart & freeze"): the way a mouse, lizard or bird moves,
  // which is what holds a cat's attention. Instead of one even walk, the
  // path is a chain of beats, each followed (usually) by a freeze:
  //   dart  – a fast bolt to a new spot
  //   creep – a slow, short sneak
  //   twitch – a tiny, quick hop
  //   hide  – (ground only) bolt to the edge, half out of view, wait, bolt back
  // Every leg's duration comes from its own speed, so the engine (which
  // follows per-segment timing for prey-motion actors) plays sudden speed
  // changes and real stops. A freeze is a repeated waypoint.
  // ---------------------------------------------------------------------
  const PREY_MIN_LEG_MS = 160; // shortest move, so a twitch isn't a teleport
  const PREY_MIN_FREEZE_MS = 150;

  function generatePreyWalkPath(habitat, zones, budgetMs, frame = videoFrame("landscape")) {
    const pad = Math.round(Math.min(frame.w, frame.h) * AUTO_GEN_INTERIOR_PAD_FRACTION);
    const ground = habitat === "ground";
    let entry, exit, pickStop;
    if (ground) {
      const entrySide = pickRandomSide();
      const exitSide = Math.random() < 0.55 ? entrySide : pickRandomSide(entrySide);
      entry = randomEdgePoint(entrySide, frame, AUTO_GEN_OFFSCREEN_MARGIN);
      exit = randomEdgePoint(exitSide, frame, AUTO_GEN_OFFSCREEN_MARGIN);
      pickStop = () => randomGroundDwellPoint(zones, frame, pad);
    } else {
      pickStop = () => sampleZonePointInFrame(zones, habitat, frame);
      entry = pickStop();
      exit = pickStop();
    }
    // A stop roughly `want` px away from `from` (best of several samples, so
    // it stays inside the animal's own habitat).
    const stopNear = (from, minD, maxD) => {
      const want = randRange(minD, maxD);
      let best = null;
      let bestErr = Infinity;
      for (let i = 0; i < 16; i++) {
        const c = pickStop();
        const err = Math.abs(Math.hypot(c.x - from.x, c.y - from.y) - want);
        if (err < bestErr) [best, bestErr] = [c, err];
      }
      return best;
    };
    // Half out of view at a frame edge: hiding, but still peeking.
    const edgePeek = () => randomEdgePoint(pickRandomSide(), frame, randRange(-10, 35));

    const base = randRange(AUTO_GEN_SPEED_MIN, AUTO_GEN_SPEED_MAX);
    const points = [entry];
    const durations = [];
    let cur = entry;
    const move = (to, speedMult) => {
      const dist = Math.hypot(to.x - cur.x, to.y - cur.y);
      durations.push(Math.max(PREY_MIN_LEG_MS, Math.round((dist / (base * speedMult)) * 1000)));
      points.push(to);
      cur = to;
    };
    const freeze = (ms) => {
      durations.push(Math.round(ms));
      points.push({ x: cur.x, y: cur.y });
    };
    const randomFreeze = () => {
      const r = Math.random();
      if (r < 0.15) freeze(randRange(3000, 5000)); // long, tense stillness
      else if (r < 0.85) freeze(randRange(500, 2500));
      else freeze(randRange(200, 450)); // a split-second hesitation
    };

    // Bolt in, then freeze as if checking for danger.
    move(pickStop(), randRange(1.8, 3));
    freeze(randRange(700, 2500));

    while (sum(durations) < budgetMs * 0.8 && points.length < 80) {
      const r = Math.random();
      if (ground && r < 0.12) {
        move(edgePeek(), randRange(2.2, 3.5));
        freeze(randRange(800, 2500));
        move(pickStop(), randRange(2, 3.2));
      } else if (r < 0.32) {
        move(stopNear(cur, 25, 70), randRange(1.5, 2.5)); // twitch
      } else if (r < 0.5) {
        move(stopNear(cur, 80, 220), randRange(0.35, 0.6)); // creep
      } else {
        move(pickStop(), randRange(2.2, 4)); // dart
      }
      if (Math.random() < 0.8) randomFreeze();
    }
    move(exit, randRange(2.2, 3.5)); // bolt away
    return { points, durations };
  }

  // Squeezes a prey path into budgetMs: every leg and freeze shrinks by the
  // same factor (never below its floor), so the rhythm of darts and pauses
  // survives in a short clip.
  function fitPreyWalkToBudget({ points, durations }, budgetMs) {
    const total = sum(durations);
    let fitted = durations;
    if (total > budgetMs) {
      const factor = budgetMs / total;
      fitted = durations.map((d, i) => {
        const still = points[i].x === points[i + 1].x && points[i].y === points[i + 1].y;
        return Math.max(still ? PREY_MIN_FREEZE_MS : PREY_MIN_LEG_MS, Math.round(d * factor));
      });
    }
    return { path: buildWalkPath(points, fitted), totalDurationMs: sum(fitted) };
  }

  // Builds a full saved-layout object (same shape as buildLayoutData/what
  // /api/path/:sceneId expects) for one background: every animal in
  // animalIds gets its own random walk path, and start times are staggered
  // across the timeline so animals don't all walk in at once.
  //
  // Each animal's *intended* start time is chosen first, independent of how
  // long its path naturally takes — only then is its path fitted (if needed)
  // to the time left before the video ends. Fitting every animal to the same
  // shared cap would collapse all their start times to that cap whenever
  // paths come out longer than the video (the common case for a short clip),
  // defeating the stagger; computing the budget from each animal's own
  // intended start avoids that, while still guaranteeing startAtMs + its
  // path duration never exceeds totalMs — so every animal has always walked
  // back off-screen by the end.
  // `zones` is this scene's own habitat region map (fetched by the caller
  // via fetchSceneZones, since a batch run can target several different
  // backgrounds — each needs its own zones, not whatever's currently
  // loaded). Animals whose habitat has nowhere to go in this scene (e.g. a
  // goldfish selected for a scene with no water patch) are silently dropped
  // rather than generated somewhere wrong.
  function buildAutoLayoutForScene(sceneId, animalIds, totalMs, zones, frame = videoFrame("landscape")) {
    const eligibleIds = animalIds.filter((id) => isHabitatAvailableInScene(habitatFor(id), zones, frame));
    const n = eligibleIds.length;
    const shuffled = [...eligibleIds].sort(() => Math.random() - 0.5);
    const animals = {};

    shuffled.forEach((id, i) => {
      const staggerBase = n > 1 ? (i / n) * totalMs * 0.5 : 0;
      const jitter = randRange(0, totalMs * 0.12);
      const desiredStart = staggerBase + jitter;
      const buffer = totalMs * 0.03;
      const budget = Math.max(totalMs * 0.25, totalMs - desiredStart - buffer);

      // The path speed multiplier divides every segment's duration at
      // playback, so the path is generated/fitted in "raw" time (budget ×
      // mult) and its on-screen length is totalDurationMs / mult.
      const [speedMin, speedMax] = autoGenSpeedRange();
      const pathSpeedMultiplier = Math.round(randRange(speedMin, speedMax) * 20) / 20;
      const rawBudget = budget * pathSpeedMultiplier;
      const preyMotion = !autoGenPreyMotionEl || autoGenPreyMotionEl.checked;
      const { path, totalDurationMs } = preyMotion
        ? fitPreyWalkToBudget(generatePreyWalkPath(habitatFor(id), zones, rawBudget, frame), rawBudget)
        : fitAutoWalkToBudget(generateAutoWalkForBudget(habitatFor(id), zones, rawBudget, frame), rawBudget);
      const playedDurationMs = totalDurationMs / pathSpeedMultiplier;

      const maxStart = Math.max(0, totalMs - playedDurationMs);
      const startAtMs = Math.round(Math.min(maxStart, desiredStart));
      animals[id] = { path, options: normalizeOptions(id, { pathSpeedMultiplier, preyMotion }, sceneId), startAtMs };
    });

    return { sceneId, activeAnimals: shuffled, animals, placedOrnaments: [] };
  }

  // Generate Video categories. "sea"/"ground"/"air" keep every video to
  // animals of that habitat; "variants" makes each video a group of the
  // same species in different colors (animals sharing one model).
  function variantKeyFor(def) {
    return def.model3d || def.source || def.id;
  }

  function variantGroups(ids) {
    const groups = new Map();
    for (const id of ids) {
      const key = variantKeyFor(animalDefFor(id) || { id });
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(id);
    }
    return [...groups.values()].filter((g) => g.length >= 2);
  }

  function animalMatchesCategory(def, category) {
    if (category === "sea") return habitatFor(def.id) === "water";
    if (category === "ground") return habitatFor(def.id) === "ground";
    if (category === "air") return habitatFor(def.id) === "air";
    if (category === "variants") return variantGroups(animalDefs.map((d) => d.id)).some((g) => g.includes(def.id));
    return true;
  }

  function sceneMatchesCategory(scene, category) {
    // A theme category picks exactly that theme's backgrounds; every other
    // category leaves themed backgrounds out of the mix.
    if (SCENE_THEMES.some((t) => t.key === category)) return scene.theme === category;
    if (scene.theme) return false;
    // Color variants include sea animals (fish) as well as land ones; the
    // planner pairs each group only with backgrounds it can live on.
    if (category === "all" || category === "variants") return true;
    const underwater = scene.category === "underwater";
    const sky = scene.category === "sky";
    if (category === "sea") return underwater;
    if (category === "air") return !underwater; // land scenes have air too
    return !underwater && !sky;
  }

  // Picking a category re-selects the animal and background lists to match
  // (they can still be adjusted by hand afterwards).
  function applyAutoGenCategory() {
    const category = autoGenCategoryEl.value;
    const random = autoGenRandomEl.checked;
    if (category === "all" && !random) {
      autoGenCategoryHintEl.textContent = "";
      return;
    }
    for (const opt of autoGenAnimalSelectEl.options) {
      opt.selected = animalMatchesCategory(animalDefFor(opt.value) || { id: opt.value }, category);
    }
    if (random) {
      for (const opt of autoGenBgSelectEl.options) {
        opt.selected = sceneMatchesCategory(scenes.find((sc) => sc.id === opt.value) || {}, category);
      }
      autoGenSelectedBgIds = new Set([...autoGenBgSelectEl.selectedOptions].map((o) => o.value));
    }
    autoGenCategoryHintEl.textContent =
      category === "variants"
        ? "Each video shows 2+ of the same animal in different colors."
        : SCENE_THEMES.some((t) => t.key === category)
          ? `Every video uses only ${themeLabel(category)} backgrounds, with any animal that can live on them.`
          : category === "all"
          ? ""
          : random
            ? "Every video uses only animals from this category."
            : "";
    updateAutoGenBgHint();
  }

  function renderAutoGenAnimalList() {
    autoGenAnimalSelectEl.innerHTML = "";
    animalDefs.forEach((def) => {
      const opt = document.createElement("option");
      opt.value = def.id;
      opt.textContent = def.label || def.id;
      opt.selected = autoGenSelectedAnimalIds.has(def.id);
      autoGenAnimalSelectEl.appendChild(opt);
    });
  }

  // <select multiple> for which backgrounds to generate videos for, capped
  // at AUTO_GEN_MAX_BACKGROUNDS for the same reason as Batch Export's own
  // checklist (renderMultiExportSceneList) — each selected background spawns
  // its own concurrent hidden export window. A native multi-select has no
  // per-option "disabled once at cap" affordance the way checkboxes did, so
  // the cap is enforced after the fact: if a change event leaves more than
  // the cap selected, the newest picks beyond the cap are deselected again.
  function renderAutoGenBgList() {
    autoGenBgSelectEl.innerHTML = "";
    const themeGroups = new Map();
    scenes.forEach((scene) => {
      const opt = document.createElement("option");
      opt.value = scene.id;
      opt.textContent = scene.label || scene.id;
      opt.selected = autoGenSelectedBgIds.has(scene.id);
      if (!scene.theme) {
        autoGenBgSelectEl.appendChild(opt);
        return;
      }
      if (!themeGroups.has(scene.theme)) {
        const group = document.createElement("optgroup");
        group.label = themeLabel(scene.theme);
        themeGroups.set(scene.theme, group);
      }
      themeGroups.get(scene.theme).appendChild(opt);
    });
    themeGroups.forEach((group) => autoGenBgSelectEl.appendChild(group));
    updateAutoGenBgHint();
  }

  function updateAutoGenBgHint() {
    const count = autoGenBgSelectEl.selectedOptions.length;
    autoGenBgCountHintEl.textContent = autoGenRandomEl.checked
      ? `${count} background(s) in the mix — each video picks one at random.`
      : `${count}/${AUTO_GEN_MAX_BACKGROUNDS} selected — each becomes its own video.`;
  }

  autoGenBgSelectEl.addEventListener("change", () => {
    const selected = [...autoGenBgSelectEl.selectedOptions];
    if (!autoGenRandomEl.checked && selected.length > AUTO_GEN_MAX_BACKGROUNDS) {
      const newlySelected = selected.filter((opt) => !autoGenSelectedBgIds.has(opt.value));
      let overflow = selected.length - AUTO_GEN_MAX_BACKGROUNDS;
      // Deselect the most recently added picks first (falling back to the
      // tail of the whole selection if everything was already selected
      // before this change, e.g. a shift-click range spanning past the cap).
      for (const opt of newlySelected.length > 0 ? newlySelected : [...selected].reverse()) {
        if (overflow <= 0) break;
        opt.selected = false;
        overflow--;
      }
    }
    autoGenSelectedBgIds = new Set([...autoGenBgSelectEl.selectedOptions].map((o) => o.value));
    updateAutoGenBgHint();
  });

  function sceneLabel(sceneId) {
    const scene = scenes.find((s) => s.id === sceneId);
    return scene ? scene.label || scene.id : sceneId;
  }

  function renderAutoGenProgressList(sceneIds) {
    renderAutoGenProgressRows(sceneIds.map((sceneId) => ({ key: sceneId, label: sceneLabel(sceneId) })));
  }

  // rows: [{ key, label }] — key addresses the row in setAutoGenRowStatus.
  // A counter above the rows shows how many videos are done, in progress
  // and still waiting, so a long run (e.g. 480 screens) is easy to follow,
  // plus an overall progress bar. With join set, the run ends by joining
  // everything into one video, and that step is the last part of the bar.
  const AUTO_GEN_JOIN_WEIGHT = 0.05; // share of the overall bar for joining (it only copies the files, so it's quick next to rendering)
  const autoGenRowKinds = new Map();
  const autoGenRowFractions = new Map(); // key -> 0..1 of that row's export
  let autoGenCounterEl = null;
  let autoGenCounterTextEl = null;
  let autoGenBarFillEl = null;
  let autoGenBarPctEl = null;
  let autoGenJoinStage = false;
  let autoGenJoinFraction = null; // null until joining starts

  function updateAutoGenCounter() {
    if (!autoGenCounterEl) return;
    let done = 0, working = 0, failed = 0;
    for (const kind of autoGenRowKinds.values()) {
      if (kind === "done") done++;
      else if (kind === "info") working++;
      else if (kind === "error") failed++;
    }
    const rowCount = autoGenRowKinds.size;
    const waiting = rowCount - done - working - failed;
    const parts = [];
    if (rowCount) {
      parts.push(
        `Done ${done} / ${rowCount} · In progress ${working} · Waiting ${waiting}` + (failed ? ` · Failed ${failed}` : "")
      );
    }
    if (autoGenJoinFraction !== null) parts.push("Joining into one video…");
    autoGenCounterTextEl.textContent = parts.join(" · ");

    let renderShare = 0;
    for (const f of autoGenRowFractions.values()) renderShare += f;
    renderShare = rowCount ? renderShare / rowCount : 1;
    const joinWeight = !autoGenJoinStage ? 0 : rowCount ? AUTO_GEN_JOIN_WEIGHT : 1;
    const overall = renderShare * (1 - joinWeight) + (autoGenJoinFraction ?? 0) * joinWeight;
    const pct = Math.floor(Math.min(1, overall) * 100);
    autoGenBarFillEl.style.width = `${pct}%`;
    autoGenBarPctEl.textContent = `${pct}%`;
  }

  function setAutoGenJoinProgress(fraction) {
    autoGenJoinFraction = Math.max(0, Math.min(1, fraction));
    updateAutoGenCounter();
  }

  function renderAutoGenProgressRows(rows, { join = false } = {}) {
    autoGenProgressListEl.innerHTML = "";
    autoGenRowKinds.clear();
    autoGenRowFractions.clear();
    autoGenJoinStage = join;
    autoGenJoinFraction = null;
    autoGenCounterEl = document.createElement("div");
    autoGenCounterEl.className = "autogen-progress-counter";
    autoGenCounterTextEl = document.createElement("div");
    autoGenCounterEl.appendChild(autoGenCounterTextEl);
    const bar = document.createElement("div");
    bar.className = "autogen-progress-bar";
    autoGenBarFillEl = document.createElement("div");
    autoGenBarFillEl.className = "autogen-progress-bar-fill";
    bar.appendChild(autoGenBarFillEl);
    autoGenBarPctEl = document.createElement("span");
    autoGenBarPctEl.className = "autogen-progress-bar-pct";
    bar.appendChild(autoGenBarPctEl);
    autoGenCounterEl.appendChild(bar);
    autoGenProgressListEl.appendChild(autoGenCounterEl);
    rows.forEach(({ key, label: text }) => {
      autoGenRowKinds.set(key, "queued");
      autoGenRowFractions.set(key, 0);
      const row = document.createElement("div");
      row.className = "scene-progress-row";
      row.id = `autoGenRow-${key}`;

      const label = document.createElement("span");
      label.textContent = text;
      row.appendChild(label);

      const status = document.createElement("span");
      status.className = "scene-progress-status";
      status.id = `autoGenStatus-${key}`;
      status.textContent = "Queued…";
      row.appendChild(status);

      autoGenProgressListEl.appendChild(row);
    });
    updateAutoGenCounter();
  }

  // fraction: 0..1 of this row's export, for its own fill and the overall
  // bar. Omitted = unchanged, except done/failed rows count as finished.
  function setAutoGenRowStatus(sceneId, text, kind, fraction) {
    const el = document.getElementById(`autoGenStatus-${sceneId}`);
    if (!el) return;
    el.textContent = text;
    el.className = "scene-progress-status" + (kind ? ` ${kind}` : "");
    if (autoGenRowKinds.has(sceneId)) {
      if (kind === "done" || kind === "error") fraction = 1;
      if (fraction !== undefined) {
        autoGenRowFractions.set(sceneId, fraction);
        // A failed row counts toward the overall bar but shows no fill.
        document.getElementById(`autoGenRow-${sceneId}`)?.style.setProperty("--progress", kind === "error" ? 0 : fraction);
      }
      autoGenRowKinds.set(sceneId, kind || "queued");
      updateAutoGenCounter();
    }
  }

  // The plain browser dev workflow (npm start, no window.electronAPI) has no
  // way to spawn ffmpeg/a headless capture window, so it can generate and
  // save each background's random layout (exactly like Save Path) but can't
  // render an actual video file — only the Electron app/packaged exe can go
  // all the way through to export. Both flows share every other step (path
  // generation, per-scene checklist, progress rows), just not the final
  // render call.
  if (!window.electronAPI) {
    autoGenSectionHintEl.textContent =
      "Pick animals, which backgrounds, and a length in seconds. Each animal automatically walks " +
      "in from off-screen, wanders, and walks back off before the video ends, and every selected " +
      "background gets its own random path. This saves the generated layout for each background " +
      "(like Save Path) — open the desktop app or the packaged .exe to actually render the videos.";
  }

  autoGenerateBtn.addEventListener("click", () => {
    if (isExporting) return;
    autoGenSelectedAnimalIds = new Set(
      activeAnimalIds.size > 0 ? activeAnimalIds : [animalDefs[0] && animalDefs[0].id].filter(Boolean)
    );
    renderAutoGenAnimalList();
    autoGenSelectedBgIds = new Set(
      currentScene ? [currentScene.id] : [scenes[0] && scenes[0].id].filter(Boolean)
    );
    renderAutoGenBgList();
    autoGenGoBtn.textContent = window.electronAPI ? "Generate & Export" : "Generate & Save Paths";
    applyAutoGenMode();
    updateAutoGenLengthHint();
    updateAutoGenIntroHint();
    autoGenModalStatusEl.textContent = "";
    autoGenProgressListEl.innerHTML = "";
    autoGenOverlayEl.hidden = false;
  });

  autoGenCancelBtn.addEventListener("click", () => {
    autoGenOverlayEl.hidden = true;
  });

  // Random mix turns the two lists into pools to draw from (all selected by
  // default) and lifts the 4-background cap, since videos render 4 at a time.
  function applyAutoGenMode() {
    const random = autoGenRandomEl.checked;
    autoGenRandomOptionsEl.hidden = !random;
    autoGenAnimalLabelEl.textContent = random
      ? "Animals that may appear (ctrl/cmd-click to change)"
      : "Animals (ctrl/cmd-click to select multiple)";
    autoGenBgLabelEl.textContent = random
      ? "Backgrounds that may be used (ctrl/cmd-click to change)"
      : `Backgrounds (ctrl/cmd-click to select multiple, up to ${AUTO_GEN_MAX_BACKGROUNDS})`;
    if (random) {
      for (const opt of autoGenAnimalSelectEl.options) opt.selected = true;
      for (const opt of autoGenBgSelectEl.options) opt.selected = true;
      autoGenSelectedBgIds = new Set([...autoGenBgSelectEl.selectedOptions].map((o) => o.value));
    }
    applyAutoGenCategory();
    updateAutoGenBgHint();
    applyAutoGenSavedMode();
  }

  // Long videos keep their screens in the screens folder; "Use saved
  // screens" joins some of those instead of rendering, so the animal,
  // background, length and per-screen options don't apply then.
  function useSavedScreens() {
    return !!window.electronAPI && autoGenRandomEl.checked && autoGenJoinEl.checked && autoGenUseSavedEl.checked;
  }

  function applyAutoGenSavedMode() {
    autoGenScreensSectionEl.hidden = !(window.electronAPI && autoGenRandomEl.checked && autoGenJoinEl.checked);
    const saved = useSavedScreens();
    for (const el of [
      autoGenAnimalSelectEl.closest("label"),
      autoGenBgSelectEl.closest("label"),
      autoGenBgCountHintEl,
      autoGenSecondsEl.closest("label"),
      autoGenSpeedMinEl.closest("label"),
      autoGenMaxAnimalsEl.closest("label"),
      autoGenCameraDriftEl.closest("label"),
    ]) {
      el.hidden = saved;
    }
    if (saved) refreshSavedScreens();
  }

  autoGenCategoryEl.addEventListener("change", () => {
    applyAutoGenCategory();
    if (useSavedScreens()) refreshSavedScreens();
  });

  autoGenRandomEl.addEventListener("change", () => {
    if (autoGenRandomEl.checked) autoGenSecondsEl.value = 15;
    applyAutoGenMode();
    updateAutoGenLengthHint();
    updateAutoGenIntroHint();
  });

  // "Join into one long video": the count becomes a number of screens (each
  // `seconds` long) joined back to back, capped at AUTO_GEN_LONG_MAX_SECONDS
  // in total — e.g. 240 screens x 15s = 1 hour, 480 x 15s = 2 hours.
  const AUTO_GEN_MAX_VIDEOS = 50;
  const AUTO_GEN_LONG_MAX_SECONDS = 2 * 60 * 60;

  function autoGenSeconds() {
    return Math.max(3, Math.min(120, Number(autoGenSecondsEl.value) || 8));
  }

  // A joined Short must stay within YouTube's Shorts length limit.
  function autoGenMaxCount() {
    if (useSavedScreens()) return Math.max(1, savedScreens.length);
    const maxSeconds = videoFormat() === "short" ? SHORTS_MAX_SECONDS : AUTO_GEN_LONG_MAX_SECONDS;
    return autoGenJoinEl.checked ? Math.max(1, Math.floor(maxSeconds / autoGenSeconds())) : AUTO_GEN_MAX_VIDEOS;
  }

  // Screens folder sub-folders. A screen on a themed background goes to that
  // theme's folder (e.g. halloween); otherwise to sky / ground / sea when all
  // its animals live there, else to mixed. Shorts screens get the same names
  // with a "short-" prefix: screens are joined without re-encoding, so 9:16
  // and 16:9 screens must never be mixed.
  const SCREEN_FOLDERS = ["sky", "ground", "sea", "mixed"];
  const SCREEN_FOLDERS_BY_CATEGORY = { sea: ["sea"], ground: ["ground"], air: ["sky"], halloween: ["halloween"] };

  function screenFolderFor(animalIds, sceneId, format = "landscape") {
    const prefix = format === "short" ? "short-" : "";
    const theme = scenes.find((s) => s.id === sceneId)?.theme;
    if (theme) return prefix + theme;
    const habitats = new Set(animalIds.map(habitatFor));
    if (habitats.size !== 1) return prefix + "mixed";
    return prefix + ({ water: "sea", air: "sky", ground: "ground" }[[...habitats][0]] || "mixed");
  }

  function screenFoldersForCategory(category, format = videoFormat()) {
    const folders = SCREEN_FOLDERS_BY_CATEGORY[category] || SCREEN_FOLDERS;
    return format === "short" ? folders.map((f) => `short-${f}`) : folders;
  }

  function screensDirValue() {
    return autoGenScreensDirEl.value.trim();
  }

  // Saved screens for the current category: [{ file, folder, seconds }].
  let savedScreens = [];
  let savedScreensRequest = 0;
  async function refreshSavedScreens() {
    const request = ++savedScreensRequest;
    autoGenLengthHintEl.textContent = "Looking for saved screens…";
    const folders = screenFoldersForCategory(autoGenCategoryEl.value);
    let found = [];
    try {
      found = await window.electronAPI.listScreens(screensDirValue(), folders);
    } catch (err) {
      found = [];
    }
    if (request !== savedScreensRequest) return savedScreens;
    savedScreens = found;
    if (useSavedScreens() && Number(autoGenCountEl.value) > found.length) autoGenCountEl.value = Math.max(1, found.length);
    updateAutoGenLengthHint();
    return savedScreens;
  }

  function formatLength(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const sec = totalSeconds % 60;
    return [h ? `${h}h` : "", m ? `${m}m` : "", sec || (!h && !m) ? `${sec}s` : ""].filter(Boolean).join(" ");
  }

  function updateAutoGenLengthHint() {
    const join = autoGenJoinEl.checked;
    const max = autoGenMaxCount();
    autoGenCountEl.max = String(max);
    if (useSavedScreens()) {
      const folders = screenFoldersForCategory(autoGenCategoryEl.value).join(" / ");
      const total = savedScreens.reduce((sum, f) => sum + f.seconds, 0);
      autoGenCountLabelEl.textContent = `Saved screens to use (up to ${savedScreens.length})`;
      if (savedScreens.length === 0) {
        autoGenLengthHintEl.textContent = `No saved screens in the ${folders} folder(s) yet.`;
        return;
      }
      const count = Math.max(1, Math.min(max, Math.round(Number(autoGenCountEl.value) || 1)));
      const average = total / savedScreens.length;
      autoGenLengthHintEl.textContent =
        `${savedScreens.length} saved screens in ${folders} (${formatLength(Math.round(total))}). ` +
        `${count} picked at random ≈ ${formatLength(Math.round(count * average))} in one video.`;
      return;
    }
    autoGenCountLabelEl.textContent = join ? `Screens (up to ${max})` : "Videos to make";
    if (!join) {
      autoGenLengthHintEl.textContent = "";
      return;
    }
    const count = Math.max(1, Math.min(max, Math.round(Number(autoGenCountEl.value) || 1)));
    const seconds = autoGenSeconds();
    autoGenLengthHintEl.textContent =
      `${count} screens × ${seconds}s = ${formatLength(count * seconds)} in one video.` +
      (videoFormat() === "short" ? ` (A Short can be at most ${formatLength(SHORTS_MAX_SECONDS)}.)` : "");
  }

  autoGenJoinEl.addEventListener("change", () => {
    updateAutoGenIntroHint();
    applyAutoGenSavedMode();
    if (autoGenJoinEl.checked) {
      autoGenSecondsEl.value = 15;
      autoGenCountEl.value = 240;
    } else if (Number(autoGenCountEl.value) > AUTO_GEN_MAX_VIDEOS) {
      autoGenCountEl.value = 5;
    }
    updateAutoGenLengthHint();
  });
  autoGenCountEl.addEventListener("input", updateAutoGenLengthHint);
  autoGenUseSavedEl.addEventListener("change", () => {
    applyAutoGenSavedMode();
    updateAutoGenLengthHint();
  });
  autoGenSecondsEl.addEventListener("input", updateAutoGenLengthHint);

  function shuffled(list) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Every k-animal subset (k = 1..maxAnimals) of `ids`, as sorted arrays.
  // "variants" only: every 2..maxAnimals subset within one same-model group.
  function variantCombos(ids, maxAnimals) {
    return variantGroups(ids).flatMap((group) =>
      animalCombos(group, Math.max(2, maxAnimals)).filter((c) => c.length >= 2)
    );
  }

  function animalCombos(ids, maxAnimals) {
    const out = [];
    const sorted = [...ids].sort();
    (function walk(start, picked) {
      if (picked.length > 0) out.push(picked);
      if (picked.length === maxAnimals) return;
      for (let i = start; i < sorted.length; i++) walk(i + 1, [...picked, sorted[i]]);
    })(0, []);
    return out;
  }

  const RANDOM_MIX_ENUMERATE_LIMIT = 20000;

  function binomial(n, k) {
    let r = 1;
    for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
    return Math.round(r);
  }

  // `size` random distinct ids from `ids`, sorted.
  function randomPick(ids, size) {
    return shuffled(ids).slice(0, size).sort();
  }

  // planRandomMix for pools too large to list: same rules (background
  // first, avoid the previous background and animals, animal count chosen
  // evenly, no reused combination), but each screen's animals are drawn at
  // random and redrawn if that combination was already used.
  function sampleRandomMix(count, bgPool, groupsByBg, zonesByBg, used, keyOf, minSize, maxAnimals) {
    const plan = [];
    let lastBg = null;
    let lastAnimals = [];
    for (let v = 0; v < count; v++) {
      const bgOrder = shuffled(bgPool).sort((a, b) => (a === lastBg) - (b === lastBg));
      let job = null;
      for (let attempt = 0; attempt < 200 && !job; attempt++) {
        const sceneId = bgOrder[attempt % bgOrder.length];
        const groups = groupsByBg.get(sceneId);
        if (groups.length === 0) continue;
        const group = groups[Math.floor(Math.random() * groups.length)];
        // Early attempts leave out the previous screen's animals.
        const fresh = group.filter((id) => !lastAnimals.includes(id));
        const pool = attempt < 100 && fresh.length >= minSize ? fresh : group;
        const top = Math.min(maxAnimals, pool.length);
        const size = minSize + Math.floor(Math.random() * (top - minSize + 1));
        const animals = randomPick(pool, size);
        const key = keyOf(sceneId, animals);
        if (used.has(key)) continue;
        job = { sceneId, animals, key, zones: zonesByBg.get(sceneId) };
      }
      if (!job) break;
      used.add(job.key);
      plan.push(job);
      lastBg = job.sceneId;
      lastAnimals = job.animals;
    }
    return plan;
  }

  // Plans `count` videos for the random mix. Each gets a random background
  // from the pool and 1..maxAnimals random animals that can live there,
  // never reusing a background+animals combination already used in this
  // run or an earlier one (history kept by the server). Once every
  // combination in the pool has been used, the history starts over.
  // Paths are generated fresh for every video, so even a reused
  // combination never looks the same.
  async function planRandomMix(count, animalPool, bgPool, maxAnimals, category = "all", format = "landscape") {
    const zonesByBg = new Map(await Promise.all(bgPool.map(async (id) => [id, await fetchSceneZones(id)])));
    let history = [];
    try {
      history = (await (await fetch("/api/auto-history")).json()).used || [];
    } catch (err) {
      history = [];
    }
    const used = new Set(history);

    // Animal groups per background (one group of every eligible animal, or
    // one per same-model group for "variants") and the allowed sizes.
    const minSize = category === "variants" ? 2 : 1;
    const groupsByBg = new Map();
    for (const sceneId of bgPool) {
      const frame = format === "short" ? videoFrame(format, sceneId) : null;
      const eligible = animalPool.filter((id) => isHabitatAvailableInScene(habitatFor(id), zonesByBg.get(sceneId), frame));
      const groups = category === "variants" ? variantGroups(eligible) : [eligible];
      groupsByBg.set(sceneId, groups.filter((g) => g.length >= minSize).map((g) => [...g].sort()));
    }
    const keyOf = (sceneId, animals) => `${sceneId}|${animals.join("+")}`;
    const comboCount = [...groupsByBg.values()].flat().reduce((sum, g) => {
      for (let k = minSize; k <= Math.min(maxAnimals, g.length); k++) sum += binomial(g.length, k);
      return sum;
    }, 0);
    // Listing every combination freezes the app for large pools (e.g. 100
    // animals x up to 4 per screen is millions), so those are sampled.
    if (comboCount > RANDOM_MIX_ENUMERATE_LIMIT) {
      return { plan: sampleRandomMix(count, bgPool, groupsByBg, zonesByBg, used, keyOf, minSize, maxAnimals), history };
    }

    const combosByBg = new Map();
    for (const [sceneId, groups] of groupsByBg) {
      combosByBg.set(sceneId, category === "variants" ? groups.flatMap((g) => variantCombos(g, maxAnimals)) : animalCombos(groups[0] || [], maxAnimals));
    }
    const allKeys = [...combosByBg].flatMap(([sceneId, combos]) => combos.map((c) => keyOf(sceneId, c)));
    if (allKeys.length === 0) return { plan: [], history };

    const plan = [];
    let lastBg = null;
    let lastAnimals = [];
    for (let v = 0; v < count; v++) {
      if (allKeys.every((k) => used.has(k))) {
        // Pool used up: forget earlier runs' use of it, keeping this run's
        // own picks unless this run alone has used everything.
        allKeys.forEach((k) => used.delete(k));
        if (plan.length < allKeys.length) plan.forEach((job) => used.add(job.key));
      }
      // Pick the background first (so backgrounds with many animal options
      // don't dominate), avoiding the previous video's background if possible.
      const bgOrder = shuffled(bgPool).sort((a, b) => (a === lastBg) - (b === lastBg));
      let job = null;
      for (const sceneId of bgOrder) {
        let fresh = combosByBg.get(sceneId).filter((c) => !used.has(keyOf(sceneId, c)));
        if (fresh.length === 0) continue;
        // Prefer animals that weren't in the previous video, so back-to-back
        // screens of a long video never show the same animal twice in a row.
        const notLast = fresh.filter((c) => !c.some((id) => lastAnimals.includes(id)));
        if (notLast.length > 0) fresh = notLast;
        // Choose the animal count evenly rather than by how many
        // combinations each count has (pairs vastly outnumber singles).
        const sizes = [...new Set(fresh.map((c) => c.length))];
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        const ofSize = fresh.filter((c) => c.length === size);
        const animals = ofSize[Math.floor(Math.random() * ofSize.length)];
        job = { sceneId, animals, key: keyOf(sceneId, animals), zones: zonesByBg.get(sceneId) };
        break;
      }
      if (!job) break;
      used.add(job.key);
      plan.push(job);
      lastBg = job.sceneId;
      lastAnimals = job.animals;
    }
    // Earlier history entries that survived any restart above.
    return { plan, history: history.filter((k) => used.has(k)) };
  }

  // introPath: opening video (片頭) to put first, or null for none.
  async function runRandomMix(animalPool, bgPool, seconds, introPath = null) {
    if (!window.electronAPI) {
      autoGenModalStatusEl.textContent = "Random mix renders videos, so it needs the desktop app or the packaged .exe.";
      return;
    }
    const join = autoGenJoinEl.checked;
    const count = Math.max(1, Math.min(autoGenMaxCount(), Math.round(Number(autoGenCountEl.value) || 1)));
    const maxAnimals = Math.max(1, Math.min(4, Math.round(Number(autoGenMaxAnimalsEl.value) || 1)));
    const totalMs = seconds * 1000;
    const format = videoFormat();
    const category = autoGenCategoryEl.value;
    if (category !== "all") {
      animalPool = animalPool.filter((id) => animalMatchesCategory(animalDefFor(id) || { id }, category));
    }
    const { plan, history } = await planRandomMix(count, animalPool, bgPool, maxAnimals, category, format);
    if (plan.length === 0) {
      autoGenModalStatusEl.textContent =
        category === "variants"
          ? "Pick at least two color variants of the same animal, on a background they can live on."
          : "None of the chosen animals can live on the chosen backgrounds (fish need water, birds need sky).";
      return;
    }
    // Only one long-video task is kept, so starting a new one replaces an
    // unfinished one (its finished screens stay in the screens folder).
    const unfinished = join ? await window.electronAPI.loadLongJob() : null;
    if (unfinished?.busy) {
      autoGenModalStatusEl.textContent = "A long video is already being made in another window.";
      return;
    }
    const replaceText = unfinished
      ? ` This replaces the unfinished long video (${unfinished.job.screens.filter((sc) => sc.file).length} / ` +
        `${unfinished.job.screens.length} screens done) — its finished screens stay in the screens folder.`
      : "";
    const confirmed = await confirmDialog(
      join
        ? `This makes one ${formatLength(plan.length * seconds)} ${formatName(format)}: ${plan.length} screens of ${seconds}s, each with a ` +
            `new random background, animals and paths. Rendering takes a long time and needs free disk space. ` +
            `If it stops (error, closing the app, restart), you can continue it later.` +
            `${introConfirmText(introPath, true)}${replaceText} Continue?`
        : `This makes ${plan.length} ${formatName(format)}(s), ${seconds}s each, with random backgrounds, animals and paths. ` +
            `Your saved scene layouts are not changed.${introConfirmText(introPath, false)} Continue?`
    );
    if (!confirmed) return;

    autoGenOverlayEl.hidden = true;
    const runId = Date.now().toString(36);
    const jobs = plan.map((job, i) => ({
      sceneId: job.sceneId,
      animals: job.animals,
      key: job.key,
      rowKey: `rnd-${runId}-${i + 1}`,
      label: `${sceneLabel(job.sceneId)} — ${job.animals.map(screenAnimalName).join(", ")}`,
    }));

    if (join) {
      // A long video is saved as a task list first, so it can be continued
      // after an error, closing the app or a restart.
      await runLongJob({
        version: 1,
        runId,
        createdAt: new Date().toISOString(),
        seconds,
        format,
        introPath,
        outputDir: outputDirInput.value.trim(),
        screensDir: screensDirValue(),
        camera: autoGenCameraDriftEl.checked,
        history,
        screens: jobs.map((job) => ({ ...job, folder: screenFolderFor(job.animals, job.sceneId, format), file: null })),
      });
      return;
    }

    setExportUIState(true);
    renderAutoGenProgressRows(jobs.map((j) => ({ key: j.rowKey, label: j.label })));
    const succeeded = [];
    const camera = autoGenCameraDriftEl.checked;
    async function renderOne(job) {
      const result = await renderRandomScreen(job, { seconds, camera, introPath, format });
      setAutoGenRowStatus(job.rowKey, `Done: ${result.outputFile}`, "done");
      succeeded.push(job.key);
    }

    // Render up to MULTI_EXPORT_MAX videos at a time.
    let failCount = 0;
    let next = 0;
    async function worker() {
      while (next < jobs.length) {
        const job = jobs[next++];
        try {
          await renderOne(job);
        } catch (err) {
          failCount++;
          setAutoGenRowStatus(job.rowKey, "Failed: " + (err?.message || String(err)), "error");
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(MULTI_EXPORT_MAX, jobs.length) }, worker));
    await saveAutoHistory([...history, ...succeeded]);

    const summaryEl = document.createElement("p");
    summaryEl.className = "status";
    summaryEl.textContent =
      failCount === 0
        ? `All ${jobs.length} video(s) generated.`
        : `${jobs.length - failCount}/${jobs.length} succeeded, ${failCount} failed.`;
    autoGenProgressListEl.appendChild(summaryEl);
    setExportUIState(false);
  }

  // Chinese display label without the "3D " prefix, for filenames/rows.
  function screenAnimalName(id) {
    return (animalDefFor(id)?.label || id).replace(/^3D\s*/i, "");
  }

  // Only combinations that actually became videos count as used.
  async function saveAutoHistory(used) {
    try {
      await fetch("/api/auto-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ used }),
      });
    } catch (err) {
      console.warn("Could not save the random-mix history:", err);
    }
  }

  // Renders one random-mix video: a fresh random path for job.animals on
  // job.sceneId. screensFolder set = a long-video screen, padded to exactly
  // `seconds` and kept in that sub-folder of the screens folder.
  async function renderRandomScreen(job, { seconds, camera, introPath = null, screensDir = "", screensFolder = null, format = "landscape" }) {
    setAutoGenRowStatus(job.rowKey, "Generating path…", "info", 0);
    const zones = await fetchSceneZones(job.sceneId);
    const layout = buildAutoLayoutForScene(job.sceneId, job.animals, seconds * 1000, zones, videoFrame(format, job.sceneId));
    layout.effects = randomSceneEffects(job.sceneId, zones, Math.random, { camera });
    const saveRes = await fetch(`/api/auto-layout/${job.rowKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(layout),
    });
    if (!saveRes.ok) throw new Error(`Save failed (HTTP ${saveRes.status})`);
    setAutoGenRowStatus(job.rowKey, "Starting export…", "info");
    exportProgressRoutes.set(job.rowKey, (frame, total, phase) => {
      setAutoGenRowStatus(job.rowKey, exportProgressText(frame, total, phase), "info", exportFraction(frame, total, phase));
    });
    try {
      return await exportWithIntro(job.sceneId, {
        gif: false,
        format,
        layoutId: job.rowKey,
        progressKey: job.rowKey,
        name: `${sceneLabel(job.sceneId)}-${job.animals.map(screenAnimalName).join("-")}`,
        ...(screensFolder ? { screensDir, screensFolder, minDurationMs: seconds * 1000 } : {}),
      }, screensFolder ? null : introPath);
    } finally {
      exportProgressRoutes.delete(job.rowKey);
    }
  }

  // Runs (or continues) a long-video task: renders every screen that has no
  // file yet, saving the task after each one, then joins them in order.
  // The task file is only removed once the long video is written, so an
  // error, closing the app or a restart can be continued from the
  // "Unfinished long video" box (also offered when the app opens).
  async function runLongJob(job) {
    hideLongJobResume();
    setExportUIState(true);
    await window.electronAPI.saveLongJob(job);
    const screens = job.screens;
    renderAutoGenProgressRows(screens.map((sc) => ({ key: sc.rowKey, label: sc.label })), { join: true });
    screens.forEach((sc) => {
      if (sc.file) setAutoGenRowStatus(sc.rowKey, "Done (earlier).", "done");
    });

    let saving = Promise.resolve();
    const saveJob = () => (saving = saving.then(() => window.electronAPI.saveLongJob(job)).catch((err) => {
      console.warn("Could not save the long-video task:", err);
    }));

    const pending = screens.filter((sc) => !sc.file);
    let next = 0;
    async function worker() {
      while (next < pending.length) {
        const sc = pending[next++];
        // A long video is hours of work, so give a failed screen one retry
        // before moving on (it can still be retried later by continuing).
        for (let attempt = 1; attempt <= 2 && !sc.file; attempt++) {
          try {
            const result = await renderRandomScreen(sc, {
              seconds: job.seconds,
              camera: job.camera,
              screensDir: job.screensDir,
              screensFolder: sc.folder,
              format: job.format || "landscape", // tasks saved before Shorts existed are 16:9
            });
            sc.file = result.outputFile;
            setAutoGenRowStatus(sc.rowKey, "Done.", "done");
            await saveJob();
          } catch (err) {
            setAutoGenRowStatus(sc.rowKey, "Failed: " + (err?.message || String(err)), "error");
          }
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(MULTI_EXPORT_MAX, pending.length) }, worker));
    await saving;
    await saveAutoHistory([...(job.history || []), ...screens.filter((sc) => sc.file).map((sc) => sc.key)]);

    const done = screens.filter((sc) => sc.file);
    const failCount = screens.length - done.length;
    const summaryEl = document.createElement("p");
    summaryEl.className = "status";
    autoGenProgressListEl.appendChild(summaryEl);
    if (failCount > 0) {
      const joinAnyway = done.length > 0 && await confirmDialog(
        `${failCount} of ${screens.length} screens failed. Join the long video without them now? ` +
          `(Cancel keeps the task, so you can press Continue later to retry them.)`
      );
      if (!joinAnyway) {
        summaryEl.textContent = `${failCount} screen(s) failed. The task is saved — press Continue to retry them.`;
        await window.electronAPI.releaseLongJob();
        setExportUIState(false);
        showLongJobResume(job);
        return;
      }
    }

    const total = done.length * job.seconds;
    summaryEl.textContent = `Joining ${done.length} screens into one video…`;
    try {
      const result = await joinLongVideo(done.map((sc) => sc.file), {
        outputDir: job.outputDir,
        name: `${job.format === "short" ? "short" : "long-video"}-${formatLength(total).replace(/\s+/g, "")}`,
        introPath: job.introPath,
        totalSeconds: total,
        format: job.format || "landscape",
      });
      await window.electronAPI.clearLongJob();
      summaryEl.textContent =
        `Done: ${result.outputFile} (${formatLength(total)})` +
        (failCount ? ` — ${failCount} screen(s) failed and were left out.` : "");
    } catch (err) {
      summaryEl.textContent = "Joining failed: " + (err?.message || String(err)) + " The task is saved — press Continue to try again.";
      await window.electronAPI.releaseLongJob();
      showLongJobResume(job);
    }
    setExportUIState(false);
  }

  function longJobProgressText(job) {
    const done = job.screens.filter((sc) => sc.file).length;
    const started = new Date(job.createdAt);
    return (
      `Unfinished ${job.format === "short" ? "YouTube Short" : "long video"} (${formatLength(job.screens.length * job.seconds)}, started ` +
      `${started.toLocaleString()}): ${done} / ${job.screens.length} screens done, ` +
      `${job.screens.length - done} to go.`
    );
  }

  let resumableLongJob = null;
  function showLongJobResume(job) {
    resumableLongJob = job;
    longJobResumeTextEl.textContent = longJobProgressText(job);
    longJobResumeEl.hidden = false;
  }

  function hideLongJobResume() {
    resumableLongJob = null;
    longJobResumeEl.hidden = true;
  }

  longJobContinueBtn.addEventListener("click", async () => {
    if (isExporting || !resumableLongJob) return;
    // Re-read it: files may have been deleted since, and another window
    // may have started it.
    const saved = await window.electronAPI.loadLongJob();
    if (!saved) return hideLongJobResume();
    if (saved.busy) {
      longJobResumeTextEl.textContent = "This long video is already being made in another window.";
      return;
    }
    await runLongJob(saved.job);
  });

  longJobDiscardBtn.addEventListener("click", async () => {
    if (isExporting || !resumableLongJob) return;
    const ok = await confirmDialog(
      "Discard the unfinished long video? Screens already made stay in the screens folder (you can reuse them with \"Use saved screens\")."
    );
    if (!ok) return;
    await window.electronAPI.clearLongJob();
    hideLongJobResume();
  });

  // On opening the app: offer to continue a long video that didn't finish.
  async function checkUnfinishedLongJob() {
    const saved = await window.electronAPI.loadLongJob();
    if (!saved || saved.busy || !saved.job?.screens?.length) return;
    showLongJobResume(saved.job);
    const ok = await showModal(`${longJobProgressText(saved.job)} Continue it now?`, {
      okText: "Continue",
      cancelText: "Later",
    });
    if (ok && !isExporting) longJobContinueBtn.click();
  }

  // Saved screens are named "<background>-<animals>-<time>.mp4"; the
  // background is the longest scene label the name starts with.
  function screenSceneLabel(file) {
    const name = file.split(/[\\/]/).pop();
    let best = "";
    for (const scene of scenes) {
      const label = sceneLabel(scene.id);
      if (name.startsWith(`${label}-`) && label.length > best.length) best = label;
    }
    return best || name;
  }

  // Random order that avoids the same background twice in a row where
  // possible.
  function orderScreens(screens) {
    const left = shuffled(screens);
    const out = [];
    while (left.length) {
      const last = out.length ? screenSceneLabel(out[out.length - 1].file) : null;
      let i = left.findIndex((f) => screenSceneLabel(f.file) !== last);
      if (i < 0) i = 0;
      out.push(left.splice(i, 1)[0]);
    }
    return out;
  }

  // Makes a long video by joining saved screens from the screens folder —
  // no rendering, so it takes about as long as copying the files.
  async function runFromSavedScreens(introPath) {
    const screens = await refreshSavedScreens();
    if (screens.length === 0) {
      autoGenModalStatusEl.textContent =
        "No saved screens found. Make a long video once (without this option) to fill the screens folder.";
      return;
    }
    const count = Math.max(1, Math.min(screens.length, Math.round(Number(autoGenCountEl.value) || 1)));
    const picked = orderScreens(shuffled(screens).slice(0, count));
    const total = Math.round(picked.reduce((sum, f) => sum + f.seconds, 0));
    const format = videoFormat();
    const confirmed = await confirmDialog(
      `This makes one ${formatLength(total)} ${formatName(format)} from ${picked.length} saved screens picked at random. ` +
        `Nothing is rendered, and the saved screens are kept.${introConfirmText(introPath, true)} Continue?`
    );
    if (!confirmed) return;

    autoGenOverlayEl.hidden = true;
    setExportUIState(true);
    renderAutoGenProgressRows([], { join: true });
    const summaryEl = document.createElement("p");
    summaryEl.className = "status";
    summaryEl.textContent = `Joining ${picked.length} saved screens into one video…`;
    autoGenProgressListEl.appendChild(summaryEl);
    try {
      const result = await joinLongVideo(picked.map((f) => f.file), {
        outputDir: outputDirInput.value.trim(),
        name: `${format === "short" ? "short" : "long-video"}-${formatLength(total).replace(/\s+/g, "")}`,
        introPath,
        totalSeconds: picked.reduce((sum, f) => sum + f.seconds, 0),
        format,
      });
      summaryEl.textContent = `Done: ${result.outputFile} (${formatLength(total)})`;
    } catch (err) {
      summaryEl.textContent = "Joining failed: " + (err?.message || String(err));
    }
    setExportUIState(false);
  }

  autoGenGoBtn.addEventListener("click", async () => {
    if (useSavedScreens()) {
      const introPath = autoGenIntroEl.checked ? autoGenIntroPathEl.value.trim() : null;
      if (introPath === "") {
        autoGenModalStatusEl.textContent = 'Choose the opening video (片頭), or untick "Add opening video".';
        return;
      }
      await runFromSavedScreens(introPath);
      return;
    }
    const selectedAnimalIds = [...autoGenAnimalSelectEl.selectedOptions].map((o) => o.value);
    if (selectedAnimalIds.length === 0) {
      autoGenModalStatusEl.textContent = "Pick at least one animal.";
      return;
    }
    const sceneIds = [...autoGenBgSelectEl.selectedOptions].map((o) => o.value);
    if (sceneIds.length === 0) {
      autoGenModalStatusEl.textContent = "Pick at least one background.";
      return;
    }

    const seconds = autoGenSeconds();
    const introPath = window.electronAPI && autoGenIntroEl.checked ? autoGenIntroPathEl.value.trim() : null;
    if (introPath === "") {
      autoGenModalStatusEl.textContent = 'Choose the opening video (片頭), or untick "Add opening video".';
      return;
    }
    if (autoGenRandomEl.checked) {
      await runRandomMix(selectedAnimalIds, sceneIds, seconds, introPath);
      return;
    }
    const totalMs = seconds * 1000;
    const canExport = !!window.electronAPI;
    const format = videoFormat();

    const confirmed = await confirmDialog(
      canExport
        ? `This generates and overwrites the saved layout for ${sceneIds.length} background(s), then exports ` +
          `${sceneIds.length} ${formatName(format)}(s) at ${seconds}s each.${introConfirmText(introPath, false)} Continue?`
        : `This generates and overwrites the saved layout for ${sceneIds.length} background(s) at ${seconds}s ` +
          `each. No video file is produced here — open the desktop app to render them. Continue?`
    );
    if (!confirmed) return;

    autoGenOverlayEl.hidden = true;
    setExportUIState(true);
    renderAutoGenProgressList(sceneIds);

    async function generateAndSaveOne(sceneId, i) {
      setAutoGenRowStatus(sceneId, "Generating path…", "info");
      const zones = await fetchSceneZones(sceneId);
      const layout = buildAutoLayoutForScene(sceneId, selectedAnimalIds, totalMs, zones, videoFrame(format, sceneId));

      setAutoGenRowStatus(sceneId, "Saving…", "info");
      const saveRes = await fetch(`/api/path/${sceneId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(layout),
      });
      if (!saveRes.ok) throw new Error(`Save failed (HTTP ${saveRes.status})`);

      if (!canExport) {
        setAutoGenRowStatus(sceneId, "Saved.", "done");
        return { saved: true };
      }

      setAutoGenRowStatus(sceneId, "Starting export…", "info");
      exportProgressRoutes.set(sceneId, (frame, total, phase) => {
        setAutoGenRowStatus(sceneId, exportProgressText(frame, total, phase), "info", exportFraction(frame, total, phase));
      });
      try {
        const result = await exportWithIntro(sceneId, { gif: false, format }, introPath);
        setAutoGenRowStatus(sceneId, `Done: ${result.outputFile}${encoderNote(result)}`, "done");
        return result;
      } finally {
        exportProgressRoutes.delete(sceneId);
      }
    }

    const results = await Promise.allSettled(sceneIds.map(generateAndSaveOne));

    results.forEach((r, i) => {
      if (r.status === "rejected") {
        setAutoGenRowStatus(sceneIds[i], "Failed: " + (r.reason?.message || String(r.reason)), "error");
      }
    });

    const failCount = results.filter((r) => r.status === "rejected").length;
    const summaryEl = document.createElement("p");
    summaryEl.className = "status";
    summaryEl.textContent =
      failCount === 0
        ? canExport
          ? `All ${sceneIds.length} video(s) generated successfully.`
          : `Saved layout for all ${sceneIds.length} background(s). Open the desktop app to render them.`
        : `${sceneIds.length - failCount}/${sceneIds.length} succeeded, ${failCount} failed.`;
    autoGenProgressListEl.appendChild(summaryEl);

    setExportUIState(false);
  });

  // The video format applies to every export (single, Batch, Generate Video)
  // and is remembered per machine. The Generate Video dialog has its own
  // copy of the sidebar's select; the two stay in sync.
  function initVideoFormat() {
    if (!videoFormatSelectEl) return;
    try {
      if (localStorage.getItem(VIDEO_FORMAT_STORAGE_KEY) === "short") videoFormatSelectEl.value = "short";
    } catch (err) { /* use default */ }
    const onChange = (source) => {
      if (source === autoGenFormatEl) videoFormatSelectEl.value = autoGenFormatEl.value;
      autoGenFormatEl.value = videoFormat();
      try { localStorage.setItem(VIDEO_FORMAT_STORAGE_KEY, videoFormat()); } catch (err) { /* not persisted */ }
      autoGenFormatHintEl.textContent =
        videoFormat() === "short"
          ? `Made from a 9:16 strip of each background — the centre unless you moved it with ` +
            `"Shorts crop position" (the editor shades the rest). ` +
            `A joined Short is at most ${formatLength(SHORTS_MAX_SECONDS)}.`
          : "";
      if (!useSavedScreens() && Number(autoGenCountEl.value) > autoGenMaxCount()) autoGenCountEl.value = autoGenMaxCount();
      updateAutoGenLengthHint();
      if (useSavedScreens()) refreshSavedScreens();
      syncShortsCropControl();
      if (!isExportMode && currentScene) drawOverlay();
    };
    videoFormatSelectEl.addEventListener("change", () => onChange(videoFormatSelectEl));
    autoGenFormatEl.addEventListener("change", () => onChange(autoGenFormatEl));
    onChange(null);
  }

  function shortsCropText(v) {
    if (Math.abs(v - 0.5) < 0.005) return "centre";
    return v < 0.5 ? `${Math.round((0.5 - v) * 200)}% left` : `${Math.round((v - 0.5) * 200)}% right`;
  }

  function syncShortsCropControl() {
    if (!shortsCropEl) return;
    shortsCropLabelEl.hidden = videoFormat() !== "short" || !currentScene;
    if (!currentScene) return;
    const v = shortsCropFor(currentScene.id);
    shortsCropEl.value = String(Math.round(v * 100));
    shortsCropValueEl.textContent = shortsCropText(v);
  }

  async function initShortsCrop() {
    try {
      const res = await fetch("/api/shorts-crop");
      if (res.ok) shortsCrop = await res.json();
    } catch (err) { /* every background starts centred */ }
    if (!shortsCropEl) return;
    let saveTimer = null;
    shortsCropEl.addEventListener("input", () => {
      if (!currentScene) return;
      shortsCrop[currentScene.id] = Number(shortsCropEl.value) / 100;
      syncShortsCropControl();
      drawOverlay();
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        fetch("/api/shorts-crop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(shortsCrop),
        }).catch(() => { /* kept for this session */ });
      }, 300);
    });
  }

  async function init() {
    initVideoFormat();
    await initShortsCrop();
    const config = await fetchConfig();
    scenes = config.scenes || [];
    animalDefs = config.animals || [];
    ornamentDefs = config.ornaments || [];
    populateSceneDropdown();
    renderOrnamentList();
    renderMultiExportSceneList();
    refreshTemplateList();

    const requestedScene = urlParams.get("scene");
    const rememberedScene = !isExportMode ? localStorage.getItem(LAST_SCENE_STORAGE_KEY) : null;
    const initialSceneId =
      (requestedScene && scenes.some((s) => s.id === requestedScene) && requestedScene) ||
      (rememberedScene && scenes.some((s) => s.id === rememberedScene) && rememberedScene) ||
      (scenes[0] && scenes[0].id);

    sceneSelect.addEventListener("change", () => loadScene(sceneSelect.value));

    await loadScene(initialSceneId, { loadSavedLayout: true });
    window.__ready = true;
    if (window.electronAPI && !isExportMode) checkUnfinishedLongJob();
  }

  // Every export (single, Batch, Generate & Export) goes to the folder in the
  // "Output folder" box, remembered per machine; blank = the Videos folder.
  const OUTPUT_DIR_STORAGE_KEY = "pathAnimator.outputDir";

  function saveOutputDir() {
    try { localStorage.setItem(OUTPUT_DIR_STORAGE_KEY, outputDirInput.value.trim()); } catch (err) { /* not persisted */ }
  }

  async function initOutputDir() {
    let saved = "";
    try { saved = localStorage.getItem(OUTPUT_DIR_STORAGE_KEY) || ""; } catch (err) { /* use default */ }
    outputDirInput.value = saved || await window.electronAPI.defaultOutputDir();
    outputDirInput.addEventListener("change", saveOutputDir);
    outputDirBrowseBtn.addEventListener("click", async () => {
      const dir = await window.electronAPI.chooseOutputDir(outputDirInput.value.trim());
      if (!dir) return;
      outputDirInput.value = dir;
      saveOutputDir();
    });
  }

  // phase: "capture" while frames are being rendered, "encode" while ffmpeg
  // turns them into the MP4 (see electronExport.js's exportScene).
  function exportProgressText(frame, total, phase) {
    if (phase === "intro") return "Adding opening video…";
    return phase === "encode" ? `Encoding video ${frame}/${total}…` : `Rendering frame ${frame}/${total}…`;
  }

  // 0..1 of one export for the progress bars: rendering frames is most of
  // the work, encoding the rest.
  function exportFraction(frame, total, phase) {
    if (phase === "intro") return 1;
    const f = total > 0 ? Math.min(1, frame / total) : 0;
    return phase === "encode" ? 0.85 + 0.15 * f : 0.85 * f;
  }

  // Joins files into one long video, feeding the overall progress bar.
  // totalSeconds: the files' combined length (the opening video, if any, is
  // measured by the main process).
  async function joinLongVideo(files, { outputDir, name, introPath, totalSeconds, format = "landscape" }) {
    const progressKey = `join-${Date.now().toString(36)}`;
    setAutoGenJoinProgress(0);
    exportProgressRoutes.set(progressKey, (frame, total, phase) => {
      setAutoGenJoinProgress(phase === "join" && total > 0 ? frame / total : 0);
    });
    try {
      const result = await window.electronAPI.joinSegments(null, files, { outputDir, name, introPath, progressKey, totalSeconds, format });
      setAutoGenJoinProgress(1);
      return result;
    } finally {
      exportProgressRoutes.delete(progressKey);
    }
  }

  // Exports one video, with the opening video (片頭) joined in front when
  // introPath is set: the scene is rendered as a segment (uniform audio, in
  // a temp folder) and export:join writes the final file to the output
  // folder. Callers that already render segments pass introPath = null.
  async function exportWithIntro(sceneId, opts, introPath) {
    if (!introPath || opts.segmentGroup) return exportVideo(sceneId, opts);
    const segmentGroup = `intro-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const rendered = await exportVideo(sceneId, { ...opts, segmentGroup });
    exportProgressRoutes.get(opts.progressKey || sceneId)?.(0, 0, "intro");
    return window.electronAPI.joinSegments(segmentGroup, [rendered.outputFile], {
      outputDir: outputDirInput.value.trim(),
      name: opts.name || sceneLabel(sceneId),
      introPath,
      format: opts.format || videoFormat(),
    });
  }

  function introConfirmText(introPath, once) {
    if (!introPath) return "";
    const name = introPath.split(/[\\/]/).pop();
    return once ? ` The opening video "${name}" plays first.` : ` Every video starts with the opening video "${name}".`;
  }

  function updateAutoGenIntroHint() {
    autoGenIntroHintEl.textContent = autoGenJoinEl.checked && autoGenRandomEl.checked
      ? "Plays once at the start of the long video. Any size works — it's fitted to the video format."
      : "Every generated video starts with it. Any size works — it's fitted to the video format.";
  }

  // The opening-video choice is remembered per machine; first run defaults
  // to the video bundled in the header/ folder (if any).
  const INTRO_STORAGE_KEY = "pathAnimator.intro";

  function saveIntroSettings() {
    try {
      localStorage.setItem(INTRO_STORAGE_KEY, JSON.stringify({ enabled: autoGenIntroEl.checked, path: autoGenIntroPathEl.value.trim() }));
    } catch (err) { /* not persisted */ }
  }

  async function initIntro() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(INTRO_STORAGE_KEY) || "null"); } catch (err) { /* use default */ }
    const defaultPath = await window.electronAPI.defaultIntroPath();
    autoGenIntroPathEl.value = saved?.path || defaultPath;
    autoGenIntroEl.checked = saved ? !!saved.enabled : !!defaultPath;
    autoGenIntroSectionEl.hidden = false;
    autoGenIntroEl.addEventListener("change", saveIntroSettings);
    autoGenIntroPathEl.addEventListener("change", saveIntroSettings);
    autoGenIntroBrowseBtn.addEventListener("click", async () => {
      const file = await window.electronAPI.chooseIntroFile(autoGenIntroPathEl.value.trim());
      if (!file) return;
      autoGenIntroPathEl.value = file;
      autoGenIntroEl.checked = true;
      saveIntroSettings();
    });
  }

  // The screens folder is remembered per machine; first run defaults to
  // Videos\PathAnimator screens.
  const SCREENS_DIR_STORAGE_KEY = "pathAnimator.screensDir";

  function saveScreensDir() {
    try { localStorage.setItem(SCREENS_DIR_STORAGE_KEY, screensDirValue()); } catch (err) { /* not persisted */ }
    if (useSavedScreens()) refreshSavedScreens();
  }

  async function initScreensDir() {
    let saved = "";
    try { saved = localStorage.getItem(SCREENS_DIR_STORAGE_KEY) || ""; } catch (err) { /* use default */ }
    autoGenScreensDirEl.value = saved || await window.electronAPI.defaultScreensDir();
    autoGenScreensDirEl.addEventListener("change", saveScreensDir);
    autoGenScreensBrowseBtn.addEventListener("click", async () => {
      const dir = await window.electronAPI.chooseScreensDir(screensDirValue());
      if (!dir) return;
      autoGenScreensDirEl.value = dir;
      saveScreensDir();
    });
  }

  // Which video encoder made an export (graphics card or CPU), shown after
  // "Done:" so it's easy to check the GPU is actually being used.
  function encoderNote(result) {
    return result?.encoder ? ` (encoded with ${result.encoder})` : "";
  }

  function exportVideo(sceneId, opts) {
    // Videos are named after the scene's Chinese label unless a caller
    // passes its own name.
    return window.electronAPI.exportScene(sceneId, {
      name: sceneLabel(sceneId),
      format: videoFormat(),
      cropX: shortsCropFor(sceneId),
      ...opts,
      outputDir: outputDirInput.value.trim(),
    });
  }

  // Electron-only: window.electronAPI only exists when running inside the
  // packaged/dev Electron app (exposed by preload.js) — absent in the plain
  // browser dev workflow (npm start), so this block simply never runs there
  // and the button stays hidden, leaving that workflow untouched.
  if (window.electronAPI) {
    exportBtn.hidden = false;
    outputDirRowEl.hidden = false;
    initOutputDir();
    initIntro();
    initScreensDir();
    openConfigBtn.hidden = false;
    openConfigBtn.addEventListener("click", () => window.electronAPI.openConfigFile());
    newWindowBtn.hidden = false;
    newWindowBtn.addEventListener("click", () => window.electronAPI.openNewWindow());
    multiExportSectionEl.hidden = false;
    renderMultiExportSceneList();

    // Routed by sceneId (see exportProgressRoutes) instead of filtering to
    // currentScene.id, so both the single-export flow and any number of
    // concurrent batch-export scenes can each track their own progress.
    window.electronAPI.onExportProgress(({ sceneId, key, frame, total, phase }) => {
      const route = exportProgressRoutes.get(key || sceneId);
      if (route) route(frame, total, phase);
    });

    exportBtn.addEventListener("click", async () => {
      setExportUIState(true);
      exportProgressEl.innerHTML = "Starting export…";
      const sceneId = currentScene.id;
      exportProgressRoutes.set(sceneId, (frame, total, phase) => {
        exportProgressEl.textContent = exportProgressText(frame, total, phase);
      });
      try {
        const result = await exportVideo(sceneId, { gif: false });
        exportProgressEl.innerHTML = `Done: ${result.outputFile}${encoderNote(result)} <button id="revealBtn">Show in folder</button>`;
        document.getElementById("revealBtn").addEventListener("click", () => {
          window.electronAPI.showItemInFolder(result.outputFile);
        });
      } catch (err) {
        exportProgressEl.textContent = "Export failed: " + err.message;
      } finally {
        exportProgressRoutes.delete(sceneId);
        setExportUIState(false);
      }
    });

    multiExportBtn.addEventListener("click", async () => {
      const sceneIds = [...multiExportSelectedIds];
      if (sceneIds.length === 0) return;

      const confirmed = await confirmDialog(
        `Save the current animal paths/ornament placement as the saved layout for ${sceneIds.length} ` +
          `scene(s) (overwriting each one's existing saved path), then export ${sceneIds.length} video(s)?`
      );
      if (!confirmed) return;

      setExportUIState(true);
      renderMultiExportProgressList(sceneIds);

      // Captured once, up front — the same layout is applied to every
      // selected scene, and the editor is locked for the duration anyway
      // (setExportUIState(true) above), so this can't drift mid-batch.
      const layoutSnapshot = buildLayoutData();


      async function saveAndExportOne(sceneId, i) {
        setMultiExportRowStatus(sceneId, "Saving…", "info");
        const saveRes = await fetch(`/api/path/${sceneId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(layoutSnapshot),
        });
        if (!saveRes.ok) throw new Error(`Save failed (HTTP ${saveRes.status})`);

        setMultiExportRowStatus(sceneId, "Starting export…", "info");
        exportProgressRoutes.set(sceneId, (frame, total, phase) => {
          setMultiExportRowStatus(sceneId, exportProgressText(frame, total, phase), "info");
        });
        try {
          const result = await exportVideo(sceneId, { gif: false });
          setMultiExportRowStatus(sceneId, `Done: ${result.outputFile}${encoderNote(result)}`, "done");
          return result;
        } finally {
          exportProgressRoutes.delete(sceneId);
        }
      }

      const results = await Promise.allSettled(sceneIds.map(saveAndExportOne));

      results.forEach((r, i) => {
        if (r.status === "rejected") {
          setMultiExportRowStatus(sceneIds[i], "Failed: " + (r.reason?.message || String(r.reason)), "error");
        }
      });

      const failCount = results.filter((r) => r.status === "rejected").length;
      const summaryEl = document.createElement("p");
      summaryEl.className = "status";
      summaryEl.textContent =
        failCount === 0
          ? `All ${sceneIds.length} scene(s) exported successfully.`
          : `${sceneIds.length - failCount}/${sceneIds.length} succeeded, ${failCount} failed.`;
      multiExportProgressListEl.appendChild(summaryEl);

      setExportUIState(false);
    });
  }

  init();
})();
