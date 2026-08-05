// Shared animation logic used by both the browser editor (app.js) and the
// headless Puppeteer/Electron export (electronExport.js). Exposed as
// window.AnimEngine. Rendering is a pure function of a time value `t` (ms)
// so editor scrubbing and frame-by-frame export always produce identical
// results. Supports any number of independent "actors" (animals), each with
// its own sprite, path, and options, animating together on one shared
// timeline over one shared background.
(function () {
  const CANVAS_WIDTH = 1600;
  const CANVAS_HEIGHT = 900;
  const HEADING_EPSILON_MS = 8;
  const BOB_WAVELENGTH_PX = 55;
  const ARC_LENGTH_SAMPLES = 240;
  // scripts/prepare-assets.js renders animal/ornament sprites at this many
  // times their intended on-canvas (logical-space) size, so they stay sharp
  // once drawn onto a higher-resolution canvas buffer (see setContext) —
  // divide back out here so on-screen size/placement is unaffected. Keep in
  // sync with ASSET_UPRES_FACTOR in prepare-assets.js.
  const ASSET_UPRES_FACTOR = 2.4;

  let ctx = null;
  let bgImage = null;
  const actors = new Map(); // id -> actor state, insertion order = draw order
  const ornaments = new Map(); // instanceId -> { image, x, y, scale }, drawn after actors so they occlude

  const DEFAULT_OPTIONS = {
    rotationFollowsPath: true,
    flip: true,
    bobbing: false,
    bobbingAmplitude: 6,
    useWalkCycle: true,
    sizeScale: 1,
    shadow: false,
  };

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function easeInCubic(t) {
    return t * t * t;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // Catmull-Rom spline through p1..p2 at local parameter u in [0,1],
  // using p0/p3 as the neighboring control points (duplicated at path ends).
  function catmullRom1D(p0, p1, p2, p3, u) {
    const u2 = u * u;
    const u3 = u2 * u;
    return (
      0.5 *
      (2 * p1 +
        (-p0 + p2) * u +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * u3)
    );
  }

  function getActor(id) {
    let actor = actors.get(id);
    if (!actor) {
      actor = {
        lizardImage: null,
        walkFrames: null,
        walkRotationOffsetRad: 0,
        walkStrideLengthPx: 140,
        path: [],
        options: { ...DEFAULT_OPTIONS },
        arcLengthCache: null,
        startAtMs: 0,
        speedMultiplier: 1,
      };
      actors.set(id, actor);
    }
    return actor;
  }

  // The per-segment duration a waypoint stores, scaled by this actor's
  // overall path-speed multiplier (2x multiplier = every segment takes half
  // as long, i.e. the whole path plays back faster).
  function segDurationMs(actor, i) {
    const raw = actor.path[i].durationToNextMs || 0;
    const mult = actor.speedMultiplier || 1;
    return mult > 0 ? raw / mult : raw;
  }

  function actorTotalDurationMs(actor) {
    if (actor.path.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < actor.path.length - 1; i++) {
      total += segDurationMs(actor, i);
    }
    return total;
  }

  function findSegment(actor, tMs) {
    const path = actor.path;
    if (path.length < 2) return null;
    let remaining = Math.max(0, tMs);
    for (let i = 0; i < path.length - 1; i++) {
      const segDuration = segDurationMs(actor, i);
      const isLast = i === path.length - 2;
      if (remaining <= segDuration || isLast) {
        const localRaw = segDuration > 0 ? Math.min(1, remaining / segDuration) : 1;
        return { index: i, localT: localRaw };
      }
      remaining -= segDuration;
    }
    return { index: path.length - 2, localT: 1 };
  }

  // Raw (un-eased-in-time) position at the eased local parameter for a segment.
  function evaluateSegment(actor, segIndex, easedLocalT) {
    const path = actor.path;
    const n = path.length;
    const p1 = path[segIndex];
    const p2 = path[segIndex + 1];
    const p0 = segIndex - 1 >= 0 ? path[segIndex - 1] : p1;
    const p3 = segIndex + 2 < n ? path[segIndex + 2] : p2;
    const x = catmullRom1D(p0.x, p1.x, p2.x, p3.x, easedLocalT);
    const y = catmullRom1D(p0.y, p1.y, p2.y, p3.y, easedLocalT);
    return { x, y };
  }

  // Only ease in at the very start of the whole path and ease out at the
  // very end; interior segments run at constant (linear) speed. Easing
  // every segment independently (the original approach) made the lizard
  // decelerate and re-accelerate at every waypoint, which reads as a
  // stutter rather than a walk once there are 3+ waypoints.
  function easeForSegment(segIndex, lastSegIndex, localT) {
    const isFirst = segIndex === 0;
    const isLast = segIndex === lastSegIndex;
    if (isFirst && isLast) return easeInOutCubic(localT);
    if (isFirst) return easeInCubic(localT);
    if (isLast) return easeOutCubic(localT);
    return localT;
  }

  // Position at absolute time tMs (ms), clamped to [0, actor's own total duration].
  function getPositionAt(actor, tMs) {
    const path = actor.path;
    if (path.length === 0) return { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
    if (path.length === 1) return { x: path[0].x, y: path[0].y };
    const clamped = Math.max(0, Math.min(actorTotalDurationMs(actor), tMs));
    const seg = findSegment(actor, clamped);
    if (!seg) return { x: path[0].x, y: path[0].y };
    const eased = easeForSegment(seg.index, path.length - 2, seg.localT);
    return evaluateSegment(actor, seg.index, eased);
  }

  function buildArcLengthTable(actor) {
    const total = actorTotalDurationMs(actor);
    if (actor.path.length < 2 || total <= 0) {
      actor.arcLengthCache = { times: [0], cumulative: [0], totalLength: 0 };
      return;
    }
    const times = [];
    const cumulative = [];
    let prev = getPositionAt(actor, 0);
    let acc = 0;
    times.push(0);
    cumulative.push(0);
    for (let i = 1; i <= ARC_LENGTH_SAMPLES; i++) {
      const t = (total * i) / ARC_LENGTH_SAMPLES;
      const p = getPositionAt(actor, t);
      acc += Math.hypot(p.x - prev.x, p.y - prev.y);
      times.push(t);
      cumulative.push(acc);
      prev = p;
    }
    actor.arcLengthCache = { times, cumulative, totalLength: acc };
  }

  function distanceTraveledAt(actor, tMs) {
    if (!actor.arcLengthCache) buildArcLengthTable(actor);
    const { times, cumulative } = actor.arcLengthCache;
    if (tMs <= times[0]) return cumulative[0];
    if (tMs >= times[times.length - 1]) return cumulative[cumulative.length - 1];
    // linear search is fine: ARC_LENGTH_SAMPLES is small (240) and this runs once per frame
    for (let i = 1; i < times.length; i++) {
      if (tMs <= times[i]) {
        const t0 = times[i - 1];
        const t1 = times[i];
        const d0 = cumulative[i - 1];
        const d1 = cumulative[i];
        const frac = t1 > t0 ? (tMs - t0) / (t1 - t0) : 0;
        return d0 + (d1 - d0) * frac;
      }
    }
    return cumulative[cumulative.length - 1];
  }

  // Instantaneous speed (px/sec) at local time tMs, via finite difference on
  // the arc-length table — used to sync a walking sound's playback rate to
  // how fast the actor is actually moving at that moment (not just the
  // segment's average speed, since easing makes speed vary within a segment).
  function instantaneousSpeedPxPerSec(actor, tMs) {
    const total = actorTotalDurationMs(actor);
    if (total <= 0) return 0;
    const eps = 40;
    const t0 = Math.max(0, tMs - eps);
    const t1 = Math.min(total, tMs + eps);
    if (t1 <= t0) return 0;
    const d0 = distanceTraveledAt(actor, t0);
    const d1 = distanceTraveledAt(actor, t1);
    return ((d1 - d0) / (t1 - t0)) * 1000;
  }

  // Which sprite is active right now: the multi-frame walk cycle (if loaded
  // and enabled) or the single static image. Each sprite's artwork has its
  // own "neutral" drawn orientation, so each needs its own rotation offset
  // to align its heading with the direction of travel (see getPose).
  function activeSprite(actor) {
    if (actor.walkFrames && actor.walkFrames.length > 0 && actor.options.useWalkCycle) {
      return { rotationOffsetRad: actor.walkRotationOffsetRad, isWalkCycle: true };
    }
    return { rotationOffsetRad: actor.staticRotationOffsetRad || 0, isWalkCycle: false };
  }

  // Full pose (position, heading, flip, bob offset) at absolute time tMs.
  // `rotationOffsetRad` compensates for the active sprite's own neutral
  // drawn orientation (e.g. a sprite drawn facing "up" needs +90deg to
  // align with atan2's "facing right at angle 0" convention) — rotations
  // commute, so adding it to the travel-aligned angle is exact regardless
  // of whether the sprite is also horizontally flipped.
  function getPose(actor, tMs, rotationOffsetRad) {
    const total = actorTotalDurationMs(actor);
    const clamped = Math.max(0, Math.min(total, tMs));
    const pos = getPositionAt(actor, clamped);

    let angle = 0;
    let flipped = false;
    if (actor.path.length >= 2) {
      const tBefore = Math.max(0, clamped - HEADING_EPSILON_MS);
      const tAfter = Math.min(total, clamped + HEADING_EPSILON_MS);
      const before = getPositionAt(actor, tBefore);
      const after = getPositionAt(actor, tAfter);
      const dx = after.x - before.x;
      const dy = after.y - before.y;
      flipped = actor.options.flip && dx < 0;
      if (actor.options.rotationFollowsPath) {
        angle = (flipped ? Math.atan2(dy, -dx) : Math.atan2(dy, dx)) + (rotationOffsetRad || 0);
      }
    }

    let bobY = 0;
    let bobScale = 1;
    if (actor.options.bobbing && actor.path.length >= 2) {
      const dist = distanceTraveledAt(actor, clamped);
      const phase = (dist / BOB_WAVELENGTH_PX) * Math.PI * 2;
      bobY = Math.sin(phase) * actor.options.bobbingAmplitude;
      bobScale = 1 + Math.sin(phase) * 0.04;
    }

    return {
      x: pos.x,
      y: pos.y + bobY,
      angle,
      flipped,
      scale: bobScale,
    };
  }

  // Picks a gait-cycle frame by distance traveled (not wall-clock time), so
  // leg-stepping speed automatically scales with how fast the lizard is
  // actually moving along the path instead of ticking at a fixed rate.
  function currentWalkFrame(actor, tMs) {
    const dist = distanceTraveledAt(actor, tMs);
    const cycle = actor.walkStrideLengthPx > 0 ? actor.walkStrideLengthPx : 1;
    const phase = (((dist % cycle) + cycle) % cycle) / cycle;
    const idx = Math.min(actor.walkFrames.length - 1, Math.floor(phase * actor.walkFrames.length));
    return actor.walkFrames[idx];
  }

  function drawActor(actor, tMs) {
    const localT = tMs - actor.startAtMs;
    if (localT < 0) return; // hasn't started yet — stays offscreen/invisible
    if (actor.path.length === 0) return;

    const sprite = activeSprite(actor);
    const spriteImage = sprite.isWalkCycle ? currentWalkFrame(actor, localT) : actor.lizardImage;
    if (!spriteImage) return;

    const pose = getPose(actor, localT, sprite.rotationOffsetRad);
    const sizeScale = actor.options.sizeScale || 1;
    const w = (spriteImage.naturalWidth / ASSET_UPRES_FACTOR) * pose.scale * sizeScale;
    const h = (spriteImage.naturalHeight / ASSET_UPRES_FACTOR) * pose.scale * sizeScale;

    ctx.save();
    ctx.translate(pose.x, pose.y);
    if (pose.flipped) ctx.scale(-1, 1);
    if (pose.angle) ctx.rotate(pose.angle);
    if (actor.options.shadow) {
      ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = 6;
      ctx.shadowOffsetY = 10;
    }
    ctx.drawImage(spriteImage, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // Ornaments are static (no path/animation) and always drawn after every
  // actor, so a lizard whose path crosses under a placed ornament (e.g. a
  // clock) reads as walking behind it rather than on top of it.
  function drawOrnament(ornament) {
    const { image, x, y, scale, rotation, shadow } = ornament;
    if (!image) return;
    const w = (image.naturalWidth / ASSET_UPRES_FACTOR) * scale;
    const h = (image.naturalHeight / ASSET_UPRES_FACTOR) * scale;
    ctx.save();
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation);
    if (shadow) {
      ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = 6;
      ctx.shadowOffsetY = 10;
    }
    ctx.drawImage(image, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function drawFrame(tMs) {
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    for (const actor of actors.values()) {
      drawActor(actor, tMs);
    }
    for (const ornament of ornaments.values()) {
      drawOrnament(ornament);
    }
  }

  window.AnimEngine = {
    CANVAS_WIDTH,
    CANVAS_HEIGHT,

    // The canvas element's actual pixel buffer (canvas.width/height) can be
    // rendered at a higher resolution than the CANVAS_WIDTH x CANVAS_HEIGHT
    // logical coordinate space that paths/waypoints/ornament positions are
    // stored in (e.g. a 3840x2160 buffer for 4K output over the same 1600x900
    // path space) — setTransform (not scale, which would compound on every
    // scene reload) maps every logical-space draw call onto the real buffer
    // so saved layouts render correctly regardless of output resolution.
    setContext(canvasCtx, backgroundImg) {
      ctx = canvasCtx;
      bgImage = backgroundImg;
      const el = ctx.canvas;
      ctx.setTransform(el.width / CANVAS_WIDTH, 0, 0, el.height / CANVAS_HEIGHT, 0, 0);
    },

    // Registers/updates the sprite assets for actor `id`.
    // rotationOffsetRad: how far (radians) the walk-cycle frames' neutral
    // drawn orientation sits from "facing right" (atan2's 0-angle
    // convention). staticRotationOffsetRad: same, for the static pose —
    // normally 0 (hand-authored static art is drawn neutrally horizontal),
    // but non-zero when the static pose is itself derived from a walk-cycle
    // frame (see prepare-assets.js's no-"source" fallback), since it then
    // shares the walk frames' non-horizontal neutral orientation.
    setActorSprite(
      id,
      lizardImg,
      frames,
      { rotationOffsetRad = Math.PI / 2, staticRotationOffsetRad = 0, strideLengthPx = 140 } = {}
    ) {
      const actor = getActor(id);
      actor.lizardImage = lizardImg;
      actor.walkFrames = frames && frames.length > 0 ? frames : null;
      actor.walkRotationOffsetRad = rotationOffsetRad;
      actor.staticRotationOffsetRad = staticRotationOffsetRad;
      actor.walkStrideLengthPx = strideLengthPx;
    },

    setActorWalkStrideLength(id, px) {
      getActor(id).walkStrideLengthPx = Math.max(1, px);
    },

    // When (ms, on the shared timeline) this actor begins animating. Before
    // this time the actor isn't drawn at all — it "enters" the scene at
    // this moment, like a clip starting on a video timeline.
    setActorStartAtMs(id, ms) {
      getActor(id).startAtMs = Math.max(0, ms || 0);
    },

    getActorStartAtMs(id) {
      const actor = actors.get(id);
      return actor ? actor.startAtMs : 0;
    },

    // Overall playback-speed multiplier for this actor's whole path (on top
    // of each segment's own px/sec speed) — 2 plays the whole path twice as
    // fast, 0.5 half as fast.
    setActorSpeedMultiplier(id, mult) {
      const actor = getActor(id);
      actor.speedMultiplier = mult > 0 ? mult : 1;
      actor.arcLengthCache = null;
    },

    getActorSpeedMultiplier(id) {
      const actor = actors.get(id);
      return actor ? actor.speedMultiplier : 1;
    },

    actorHasWalkFrames(id) {
      const actor = actors.get(id);
      return !!(actor && actor.walkFrames && actor.walkFrames.length > 0);
    },

    setActorPath(id, newPath) {
      const actor = getActor(id);
      actor.path = newPath.map((p) => ({
        x: p.x,
        y: p.y,
        durationToNextMs: p.durationToNextMs || 0,
      }));
      actor.arcLengthCache = null;
    },

    getActorPath(id) {
      const actor = actors.get(id);
      return actor ? actor.path.map((p) => ({ ...p })) : [];
    },

    setActorOptions(id, newOptions) {
      const actor = getActor(id);
      actor.options = { ...actor.options, ...newOptions };
      actor.arcLengthCache = null;
    },

    getActorOptions(id) {
      const actor = actors.get(id);
      return actor ? { ...actor.options } : { ...DEFAULT_OPTIONS };
    },

    getActorTotalDurationMs(id) {
      const actor = actors.get(id);
      return actor ? actorTotalDurationMs(actor) : 0;
    },

    // Instantaneous speed (px/sec) for actor `id` at local time tMs
    // (0 = start of its own path, regardless of its startAtMs offset).
    getActorSpeedPxPerSec(id, tMs) {
      const actor = actors.get(id);
      return actor ? instantaneousSpeedPxPerSec(actor, tMs) : 0;
    },

    removeActor(id) {
      actors.delete(id);
    },

    // Ornaments: static decorations (e.g. a clock) placed at a fixed
    // point on the canvas. Drawn after every actor each frame (see
    // drawFrame), so they always occlude an actor passing "behind" them.
    addOrnament(instanceId, image, x, y, scale = 1, rotation = 0, shadow = false) {
      ornaments.set(instanceId, { image, x, y, scale, rotation, shadow });
    },

    updateOrnamentPosition(instanceId, x, y) {
      const ornament = ornaments.get(instanceId);
      if (ornament) {
        ornament.x = x;
        ornament.y = y;
      }
    },

    setOrnamentScale(instanceId, scale) {
      const ornament = ornaments.get(instanceId);
      if (ornament) ornament.scale = Math.max(0.05, scale);
    },

    setOrnamentRotation(instanceId, rotation) {
      const ornament = ornaments.get(instanceId);
      if (ornament) ornament.rotation = rotation;
    },

    setOrnamentShadow(instanceId, enabled) {
      const ornament = ornaments.get(instanceId);
      if (ornament) ornament.shadow = !!enabled;
    },

    removeOrnament(instanceId) {
      ornaments.delete(instanceId);
    },

    clearOrnaments() {
      ornaments.clear();
    },

    // Ids of every currently-registered actor, insertion order — used by the
    // export pipeline to know which animals need a rendered audio track.
    getActorIds() {
      return [...actors.keys()];
    },

    // Clears every registered actor (used when switching scenes).
    clearActors() {
      actors.clear();
    },

    // Longest end time among all actors (start offset + that actor's own
    // path duration) — the shared timeline covers every animal, and each
    // actor simply holds at its final waypoint once its own path finishes.
    getTotalDurationMs() {
      let max = 0;
      for (const actor of actors.values()) {
        max = Math.max(max, actor.startAtMs + actorTotalDurationMs(actor));
      }
      return max;
    },

    renderFrame: drawFrame,
  };
})();
