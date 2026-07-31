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
  const exportBtn = document.getElementById("exportBtn");
  const exportProgressEl = document.getElementById("exportProgress");
  const reloadScenesBtn = document.getElementById("reloadScenesBtn");
  const openConfigBtn = document.getElementById("openConfigBtn");
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

  const MARKER_RADIUS = 9;
  const ROTATE_HANDLE_OFFSET = 30; // canvas px above the ornament's top edge
  const ROTATE_HANDLE_RADIUS = 7;
  const RESIZE_HANDLE_RADIUS = 7;
  const LAST_SCENE_STORAGE_KEY = "pathAnimator.lastSceneId";

  const TIMELINE_RULER_H = 16;
  const TIMELINE_LANE_H = 20;
  const ANIMAL_COLORS = { blue: "#4aa3ff", green: "#3ecf6a", red: "#ff5a5a" };
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
  let playStartPerf = 0;
  let playStartT = 0;
  let draggingIndex = -1;
  let draggingOrnamentId = null; // instanceId of a placed ornament being dragged on the canvas, or null
  let draggingRotateOrnamentId = null; // instanceId whose rotation handle is being dragged, or null
  let draggingResizeOrnamentId = null; // instanceId whose resize handle is being dragged, or null
  let selectedOrnamentId = null; // instanceId showing selection UI (rotate/resize handles) in the sidebar, or null
  let timelineDragging = false;

  function defaultPath() {
    return [
      { x: 220, y: 460, durationToNextMs: 1500 },
      { x: 800, y: 460, durationToNextMs: 1500 },
      { x: 1380, y: 460, durationToNextMs: 0 },
    ];
  }

  function animalDefFor(id) {
    return animalDefs.find((a) => a.id === id);
  }

  function ornamentDefFor(id) {
    return ornamentDefs.find((o) => o.id === id);
  }

  function normalizeOptions(id, opts) {
    const def = animalDefFor(id) || {};
    const o = opts || {};
    return {
      rotationFollowsPath: o.rotationFollowsPath !== undefined ? !!o.rotationFollowsPath : true,
      flip: o.flip !== undefined ? !!o.flip : true,
      useWalkCycle: o.useWalkCycle !== false,
      bobbing: !!o.bobbing,
      bobbingAmplitude: o.bobbingAmplitude ?? 6,
      strideLengthPx: o.strideLengthPx ?? def.strideLengthPx ?? 140,
      pathSpeedMultiplier: o.pathSpeedMultiplier ?? 1,
      sizeScale: o.sizeScale ?? 1,
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
      sizeScale,
      clearBtn,
      saveBtn,
      loadBtn,
      saveTemplateBtn,
      loadTemplateBtn,
    ].forEach((el) => (el.disabled = !enabled));
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
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
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
      const pos = canvasCoordsFromEvent(evt);
      const hit = hitTestOrnament(pos);
      if (!hit) return;
      evt.preventDefault();
      resizeOrnament(hit, evt.deltaY);
    },
    { passive: false }
  );

  // Native HTML5 drag-and-drop: dragstart is wired per-item in
  // renderOrnamentList(); this pair on stagePad accepts the drop and
  // converts the drop point from screen to canvas coordinates the same
  // way click-to-add-waypoint does (see canvasCoordsFromEvent).
  stagePad.addEventListener("dragover", (evt) => {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "copy";
  });

  stagePad.addEventListener("drop", async (evt) => {
    evt.preventDefault();
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

  [optRotation, optFlip, optWalkCycle, strideLength, optBobbing, bobAmplitude, pathSpeed, sizeScale].forEach((el) => {
    el.addEventListener("input", () => {
      applyOptionsToEngine();
      renderEditorFrame(Number(scrub.value));
    });
  });

  // Shared shape for both a per-scene save (/api/path/:sceneId) and a named,
  // reusable template (/api/template/:name) — animal/ornament x,y are in
  // canvas space (1600x900, same for every background), so a template built
  // on one scene can be loaded onto any other unchanged.
  function buildLayoutData() {
    return {
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

  saveTemplateBtn.addEventListener("click", async () => {
    const name = window.prompt("Save as template — name it:", templateSelect.value || "");
    if (!name || !name.trim()) return;
    try {
      await fetch(`/api/template/${encodeURIComponent(name.trim())}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildLayoutData()),
      });
      await refreshTemplateList(name.trim());
      templateStatusEl.textContent = `Saved template "${name.trim()}".`;
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
    if (!window.confirm(`Delete template "${name}"?`)) return;
    try {
      await fetch(`/api/template/${encodeURIComponent(name)}`, { method: "DELETE" });
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
    const [lizardImage, walkFrames] = await Promise.all([
      loadImage(`${base}/animal.png?v=${assetCacheBust}`),
      Promise.all(walkFramePaths.map((p) => loadImage(p))).catch(() => []),
    ]);
    const entry = {
      lizardImage,
      walkFrames,
      rotationOffsetRad: ((def && def.rotationOffsetDeg) || 0) * (Math.PI / 180),
      strideLengthPx: (def && def.strideLengthPx) || 140,
    };
    spriteCache.set(id, entry);
    return entry;
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
      item.draggable = true;
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
    audioCache.set(id, audio);
    return audio;
  }

  async function activateAnimal(id, pathOverride, optionsOverride, startAtMsOverride) {
    if (!animalData.has(id)) {
      animalData.set(id, {
        path: pathOverride && pathOverride.length > 0 ? pathOverride : defaultPath(),
        options: normalizeOptions(id, optionsOverride),
        startAtMs: Math.max(0, startAtMsOverride || 0),
      });
    }
    activeAnimalIds.add(id);
    const sprite = await ensureActorSprite(id);
    window.AnimEngine.setActorSprite(id, sprite.lizardImage, sprite.walkFrames, {
      rotationOffsetRad: sprite.rotationOffsetRad,
      strideLengthPx: sprite.strideLengthPx,
    });
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

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = activeAnimalIds.has(def.id);
      checkbox.addEventListener("click", (evt) => evt.stopPropagation());
      checkbox.addEventListener("change", () => toggleAnimalActive(def.id, checkbox.checked));
      row.appendChild(checkbox);

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = def.label || def.id;
      row.appendChild(name);

      const startLabel = document.createElement("label");
      startLabel.className = "start-at";
      startLabel.textContent = "start";
      const startInput = document.createElement("input");
      startInput.type = "number";
      startInput.min = "0";
      startInput.step = "0.1";
      startInput.disabled = !activeAnimalIds.has(def.id);
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
        if (activeAnimalIds.has(def.id)) selectEditingAnimal(def.id);
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

  async function loadScene(sceneId) {
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

    if (!isExportMode) localStorage.setItem(LAST_SCENE_STORAGE_KEY, scene.id);

    draggingIndex = -1;
    await loadSavedPathsForScene();
    scrub.value = "0";
    renderEditorFrame(0);
    updateTimeLabel();
  }

  async function fetchConfig() {
    const res = await fetch(`/api/config?v=${Date.now()}`);
    return res.json();
  }

  function populateSceneDropdown() {
    sceneSelect.innerHTML = "";
    scenes.forEach((scene) => {
      const opt = document.createElement("option");
      opt.value = scene.id;
      opt.textContent = scene.label || scene.id;
      sceneSelect.appendChild(opt);
    });
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

  async function init() {
    const config = await fetchConfig();
    scenes = config.scenes || [];
    animalDefs = config.animals || [];
    ornamentDefs = config.ornaments || [];
    populateSceneDropdown();
    renderOrnamentList();
    refreshTemplateList();

    const requestedScene = urlParams.get("scene");
    const rememberedScene = !isExportMode ? localStorage.getItem(LAST_SCENE_STORAGE_KEY) : null;
    const initialSceneId =
      (requestedScene && scenes.some((s) => s.id === requestedScene) && requestedScene) ||
      (rememberedScene && scenes.some((s) => s.id === rememberedScene) && rememberedScene) ||
      (scenes[0] && scenes[0].id);

    sceneSelect.addEventListener("change", () => loadScene(sceneSelect.value));

    await loadScene(initialSceneId);
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

    window.electronAPI.onExportProgress(({ sceneId, frame, total }) => {
      if (!currentScene || sceneId !== currentScene.id) return;
      exportProgressEl.textContent = `Rendering frame ${frame}/${total}…`;
    });

    exportBtn.addEventListener("click", async () => {
      exportBtn.disabled = true;
      exportProgressEl.innerHTML = "Starting export…";
      try {
        const result = await window.electronAPI.exportScene(currentScene.id, { gif: false });
        exportProgressEl.innerHTML = `Done: ${result.outputFile} <button id="revealBtn">Show in folder</button>`;
        document.getElementById("revealBtn").addEventListener("click", () => {
          window.electronAPI.showItemInFolder(result.outputFile);
        });
      } catch (err) {
        exportProgressEl.textContent = "Export failed: " + err.message;
      } finally {
        exportBtn.disabled = false;
      }
    });
  }

  init();
})();
