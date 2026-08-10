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

  function isHabitatAvailableInScene(habitat, zones) {
    return window.SceneZones.hasZone(zones, habitat, window.AnimEngine.CANVAS_WIDTH, window.AnimEngine.CANVAS_HEIGHT);
  }

  function isPointAllowedForAnimal(animalId, x, y) {
    return window.SceneZones.zoneAt(currentSceneZones, x, y) === habitatFor(animalId);
  }

  function habitatBlockedMessage(animalId) {
    const def = animalDefFor(animalId);
    return `${(def && (def.label || def.id)) || animalId} needs a "${habitatFor(animalId)}" area — can't place it there.`;
  }

  function normalizeOptions(id, opts) {
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
      sizeScale: o.sizeScale ?? 1,
      shadow: !!o.shadow,
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
      sizeScale: Number(sizeScale.value) || 1,
      shadow: optShadow.checked,
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
    window.AnimEngine.renderFrame(tMs);
    if (isExportMode) return;
    drawOverlay();
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
  function showModal(message, { withInput = false, defaultValue = "" } = {}) {
    return new Promise((resolve) => {
      modalMessageEl.textContent = message;
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
      const rate = Math.min(
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
      if (!editingAnimalId) selectEditingAnimal(id);
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
      checkbox.addEventListener("change", () => toggleAnimalActive(def.id, checkbox.checked));
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

      row.addEventListener("click", () => {
        if (!isExporting && activeAnimalIds.has(def.id)) selectEditingAnimal(def.id);
      });

      animalListEl.appendChild(row);
    });
  }

  // Applies a saved layout (the shape shared by a per-scene save and a named
  // template — see buildLayoutData) to the current scene: resets animals and
  // placed ornaments, then re-registers them as engine actors.
  async function applyLayoutData(saved) {
    animalData = new Map();
    activeAnimalIds = new Set();
    window.AnimEngine.clearActors();

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
      const res = await fetch(`/api/path/${currentScene.id}`);
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
    currentSceneZones = await fetchSceneZones(scene.id);

    window.AnimEngine.clearScrollLayers();
    for (const band of currentSceneZones.bands || []) {
      if (!band.cloud) continue;
      const cloudImage = await loadImage(`assets/${scene.id}/${band.cloud.image}?v=${assetCacheBust}`);
      window.AnimEngine.setScrollLayer(band.zone, cloudImage, band.y0, band.y1, band.cloud.scrollPxPerSec);
    }

    if (!isExportMode) localStorage.setItem(LAST_SCENE_STORAGE_KEY, scene.id);

    draggingIndex = -1;
    if (loadSavedLayout) await loadSavedPathsForScene();
    renderAnimalList(); // habitat availability (currentSceneZones) and/or active set just changed
    scrub.value = "0";
    renderEditorFrame(0);
    updateTimeLabel();
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
    { key: "floor", label: "Floor / Other" },
  ];

  function populateSceneDropdown() {
    sceneSelect.innerHTML = "";
    const byCategory = new Map(SCENE_CATEGORY_ORDER.map((c) => [c.key, []]));
    const uncategorized = [];
    scenes.forEach((scene) => {
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

  function randomEdgePoint(side, w, h, margin) {
    switch (side) {
      case "left":
        return { x: -margin, y: randRange(0, h) };
      case "right":
        return { x: w + margin, y: randRange(0, h) };
      case "top":
        return { x: randRange(0, w), y: -margin };
      default:
        return { x: randRange(0, w), y: h + margin };
    }
  }

  function randomInteriorPoint(w, h, pad) {
    return { x: randRange(pad, w - pad), y: randRange(pad, h - pad) };
  }

  // Ground's dwell point additionally avoids landing inside another zone
  // (e.g. a sky band or a water patch) that happens to overlap the padded
  // interior rectangle — rejection-sampled against the real zone map rather
  // than just the rectangle, since "ground" has no rect of its own (it's
  // whatever isn't claimed by another zone). Falls back to the plain
  // interior point if the scene is unusually zone-dense.
  function randomGroundDwellPoint(zones, w, h, pad) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const p = randomInteriorPoint(w, h, pad);
      if (window.SceneZones.zoneAt(zones, p.x, p.y) === "ground") return p;
    }
    return randomInteriorPoint(w, h, pad);
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
  function generateAutoWalkPath(habitat, zones) {
    const w = window.AnimEngine.CANVAS_WIDTH;
    const h = window.AnimEngine.CANVAS_HEIGHT;

    let entry, dwell, exit;
    if (habitat === "ground") {
      const entrySide = pickRandomSide();
      const exitSide = Math.random() < 0.55 ? entrySide : pickRandomSide(entrySide);
      const pad = Math.round(Math.min(w, h) * AUTO_GEN_INTERIOR_PAD_FRACTION);
      entry = randomEdgePoint(entrySide, w, h, AUTO_GEN_OFFSCREEN_MARGIN);
      dwell = randomGroundDwellPoint(zones, w, h, pad);
      exit = randomEdgePoint(exitSide, w, h, AUTO_GEN_OFFSCREEN_MARGIN);
    } else {
      entry = window.SceneZones.sampleZonePoint(zones, habitat, w, h);
      dwell = window.SceneZones.sampleZonePoint(zones, habitat, w, h);
      exit = window.SceneZones.sampleZonePoint(zones, habitat, w, h);
    }

    const speed = randRange(AUTO_GEN_SPEED_MIN, AUTO_GEN_SPEED_MAX);
    const distIn = Math.hypot(dwell.x - entry.x, dwell.y - entry.y);
    const distOut = Math.hypot(exit.x - dwell.x, exit.y - dwell.y);
    const durIn = Math.max(AUTO_GEN_MIN_SEGMENT_MS, Math.round((distIn / speed) * 1000));
    const durOut = Math.max(AUTO_GEN_MIN_SEGMENT_MS, Math.round((distOut / speed) * 1000));
    const dwellMs = Math.round(randRange(AUTO_GEN_DWELL_MIN_MS, AUTO_GEN_DWELL_MAX_MS));

    return { entry, dwell, exit, durIn, dwellMs, durOut };
  }

  // Fits a generateAutoWalkPath() shape into budgetMs, prioritizing the dwell
  // segment — the only part of the path that's actually on screen — over the
  // (mostly off-screen) entry/exit legs. A short video or a tight per-animal
  // budget compresses the legs first, down to their own minimum floor, and
  // only eats into the dwell itself once the legs can't shrink any further;
  // this is what actually fixes animals being generated with a walk-through
  // so brief it's easy to never see on screen at all.
  function fitAutoWalkToBudget({ entry, dwell, exit, durIn, dwellMs, durOut }, budgetMs) {
    const legFloor = AUTO_GEN_MIN_SEGMENT_MS;
    const naturalTotal = durIn + dwellMs + durOut;
    if (naturalTotal <= budgetMs) {
      return { path: buildDwellPath(entry, dwell, exit, durIn, dwellMs, durOut), totalDurationMs: naturalTotal };
    }

    const legsBudget = Math.max(legFloor * 2, budgetMs - dwellMs);
    const legsTotal = durIn + durOut;
    const legsFactor = legsBudget / legsTotal;
    let fitDurIn = Math.max(legFloor, Math.round(durIn * legsFactor));
    let fitDurOut = Math.max(legFloor, Math.round(durOut * legsFactor));
    let fitDwellMs = dwellMs;

    // Even both legs at their floor plus the full dwell might still exceed a
    // very tight budget (many animals crammed into a very short video) — as
    // a last resort, shrink the dwell too, but never below a small floor so
    // there's still *something* to see rather than nothing.
    const remainingForDwell = budgetMs - fitDurIn - fitDurOut;
    if (remainingForDwell < fitDwellMs) {
      fitDwellMs = Math.max(400, remainingForDwell);
    }

    const path = buildDwellPath(entry, dwell, exit, fitDurIn, fitDwellMs, fitDurOut);
    return { path, totalDurationMs: fitDurIn + fitDwellMs + fitDurOut };
  }

  function buildDwellPath(entry, dwell, exit, durIn, dwellMs, durOut) {
    return [
      { x: entry.x, y: entry.y, durationToNextMs: durIn },
      { x: dwell.x, y: dwell.y, durationToNextMs: dwellMs },
      { x: dwell.x, y: dwell.y, durationToNextMs: durOut },
      { x: exit.x, y: exit.y, durationToNextMs: 0 },
    ];
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
  function buildAutoLayoutForScene(sceneId, animalIds, totalMs, zones) {
    const eligibleIds = animalIds.filter((id) => isHabitatAvailableInScene(habitatFor(id), zones));
    const n = eligibleIds.length;
    const shuffled = [...eligibleIds].sort(() => Math.random() - 0.5);
    const animals = {};

    shuffled.forEach((id, i) => {
      const staggerBase = n > 1 ? (i / n) * totalMs * 0.5 : 0;
      const jitter = randRange(0, totalMs * 0.12);
      const desiredStart = staggerBase + jitter;
      const buffer = totalMs * 0.03;
      const budget = Math.max(totalMs * 0.25, totalMs - desiredStart - buffer);

      const shape = generateAutoWalkPath(habitatFor(id), zones);
      const { path, totalDurationMs } = fitAutoWalkToBudget(shape, budget);

      const maxStart = Math.max(0, totalMs - totalDurationMs);
      const startAtMs = Math.round(Math.min(maxStart, desiredStart));
      animals[id] = { path, options: normalizeOptions(id, {}), startAtMs };
    });

    return { sceneId, activeAnimals: shuffled, animals, placedOrnaments: [] };
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
    scenes.forEach((scene) => {
      const opt = document.createElement("option");
      opt.value = scene.id;
      opt.textContent = scene.label || scene.id;
      opt.selected = autoGenSelectedBgIds.has(scene.id);
      autoGenBgSelectEl.appendChild(opt);
    });
    updateAutoGenBgHint();
  }

  function updateAutoGenBgHint() {
    const count = autoGenBgSelectEl.selectedOptions.length;
    autoGenBgCountHintEl.textContent = `${count}/${AUTO_GEN_MAX_BACKGROUNDS} selected — each becomes its own video.`;
  }

  autoGenBgSelectEl.addEventListener("change", () => {
    const selected = [...autoGenBgSelectEl.selectedOptions];
    if (selected.length > AUTO_GEN_MAX_BACKGROUNDS) {
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

  function renderAutoGenProgressList(sceneIds) {
    autoGenProgressListEl.innerHTML = "";
    sceneIds.forEach((sceneId) => {
      const scene = scenes.find((s) => s.id === sceneId);
      const row = document.createElement("div");
      row.className = "scene-progress-row";

      const label = document.createElement("span");
      label.textContent = scene ? scene.label || scene.id : sceneId;
      row.appendChild(label);

      const status = document.createElement("span");
      status.className = "scene-progress-status";
      status.id = `autoGenStatus-${sceneId}`;
      status.textContent = "Queued…";
      row.appendChild(status);

      autoGenProgressListEl.appendChild(row);
    });
  }

  function setAutoGenRowStatus(sceneId, text, kind) {
    const el = document.getElementById(`autoGenStatus-${sceneId}`);
    if (!el) return;
    el.textContent = text;
    el.className = "scene-progress-status" + (kind ? ` ${kind}` : "");
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
    autoGenModalStatusEl.textContent = "";
    autoGenProgressListEl.innerHTML = "";
    autoGenOverlayEl.hidden = false;
  });

  autoGenCancelBtn.addEventListener("click", () => {
    autoGenOverlayEl.hidden = true;
  });

  autoGenGoBtn.addEventListener("click", async () => {
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

    const seconds = Math.max(3, Math.min(120, Number(autoGenSecondsEl.value) || 8));
    const totalMs = seconds * 1000;
    const canExport = !!window.electronAPI;

    const confirmed = await confirmDialog(
      canExport
        ? `This generates and overwrites the saved layout for ${sceneIds.length} background(s), then exports ` +
          `${sceneIds.length} video(s) at ${seconds}s each. Continue?`
        : `This generates and overwrites the saved layout for ${sceneIds.length} background(s) at ${seconds}s ` +
          `each. No video file is produced here — open the desktop app to render them. Continue?`
    );
    if (!confirmed) return;

    autoGenOverlayEl.hidden = true;
    setExportUIState(true);
    renderAutoGenProgressList(sceneIds);

    // A 1-based position appended to the output filename (see
    // electronExport.js's exportScene) whenever more than one background is
    // being generated in this batch — keeps every video in a multi-
    // background run distinctly named (and visibly grouped) even though
    // they share the same timestamp, instead of relying on the timestamp's
    // 1-second resolution alone.
    function sequenceFor(i) {
      return sceneIds.length > 1 ? i + 1 : undefined;
    }

    async function generateAndSaveOne(sceneId, i) {
      setAutoGenRowStatus(sceneId, "Generating path…", "info");
      const zones = await fetchSceneZones(sceneId);
      const layout = buildAutoLayoutForScene(sceneId, selectedAnimalIds, totalMs, zones);

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
      exportProgressRoutes.set(sceneId, (frame, total) => {
        setAutoGenRowStatus(sceneId, `Rendering frame ${frame}/${total}…`, "info");
      });
      try {
        const result = await window.electronAPI.exportScene(sceneId, { gif: false, sequence: sequenceFor(i) });
        setAutoGenRowStatus(sceneId, `Done: ${result.outputFile}`, "done");
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

  async function init() {
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
  }

  // Electron-only: window.electronAPI only exists when running inside the
  // packaged/dev Electron app (exposed by preload.js) — absent in the plain
  // browser dev workflow (npm start), so this block simply never runs there
  // and the button stays hidden, leaving that workflow untouched.
  if (window.electronAPI) {
    exportBtn.hidden = false;
    openConfigBtn.hidden = false;
    openConfigBtn.addEventListener("click", () => window.electronAPI.openConfigFile());
    newWindowBtn.hidden = false;
    newWindowBtn.addEventListener("click", () => window.electronAPI.openNewWindow());
    multiExportSectionEl.hidden = false;
    renderMultiExportSceneList();

    // Routed by sceneId (see exportProgressRoutes) instead of filtering to
    // currentScene.id, so both the single-export flow and any number of
    // concurrent batch-export scenes can each track their own progress.
    window.electronAPI.onExportProgress(({ sceneId, frame, total }) => {
      const route = exportProgressRoutes.get(sceneId);
      if (route) route(frame, total);
    });

    exportBtn.addEventListener("click", async () => {
      setExportUIState(true);
      exportProgressEl.innerHTML = "Starting export…";
      const sceneId = currentScene.id;
      exportProgressRoutes.set(sceneId, (frame, total) => {
        exportProgressEl.textContent = `Rendering frame ${frame}/${total}…`;
      });
      try {
        const result = await window.electronAPI.exportScene(sceneId, { gif: false });
        exportProgressEl.innerHTML = `Done: ${result.outputFile} <button id="revealBtn">Show in folder</button>`;
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

      // Same reasoning as Generate Video's sequenceFor: keeps a multi-scene
      // batch's output filenames distinctly numbered instead of relying
      // solely on the timestamp's 1-second resolution.
      function sequenceFor(i) {
        return sceneIds.length > 1 ? i + 1 : undefined;
      }

      async function saveAndExportOne(sceneId, i) {
        setMultiExportRowStatus(sceneId, "Saving…", "info");
        const saveRes = await fetch(`/api/path/${sceneId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(layoutSnapshot),
        });
        if (!saveRes.ok) throw new Error(`Save failed (HTTP ${saveRes.status})`);

        setMultiExportRowStatus(sceneId, "Starting export…", "info");
        exportProgressRoutes.set(sceneId, (frame, total) => {
          setMultiExportRowStatus(sceneId, `Rendering frame ${frame}/${total}…`, "info");
        });
        try {
          const result = await window.electronAPI.exportScene(sceneId, { gif: false, sequence: sequenceFor(i) });
          setMultiExportRowStatus(sceneId, `Done: ${result.outputFile}`, "done");
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
