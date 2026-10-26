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
  const SEGMENT_ARC_SAMPLES = 64;
  // Start/stop acceleration time for a 2D path (capped at half a segment).
  const PATH_RAMP_MS = 350;
  // Prey motion (auto-generated "dart & freeze" paths): stops and starts
  // happen over a much shorter ramp, so the animal snaps still and bolts
  // off the way a mouse or bird does — the movement cats react to.
  const PREY_RAMP_MS = 90;

  function rampMsFor(actor) {
    return actor.options && actor.options.preyMotion ? PREY_RAMP_MS : PATH_RAMP_MS;
  }
  // Actor shadow layers (offset/blur in logical px at size 1, scaled with
  // the actor). Light comes from the upper left, so shadows fall down-right.
  const GROUND_SHADOW_LAYERS = [
    { dx: 3, dy: 5, blur: 3, alpha: 0.55 },
    { dx: 10, dy: 16, blur: 12, alpha: 0.42 },
  ];
  const AIR_SHADOW_LAYERS = [{ dx: 40, dy: 70, blur: 14, alpha: 0.38 }];
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
  const scrollLayers = new Map(); // zone -> { image, y0, y1, scrollPxPerSec }, drawn over the static background, under actors

  const DEFAULT_OPTIONS = {
    rotationFollowsPath: true,
    flip: true,
    bobbing: false,
    bobbingAmplitude: 6,
    useWalkCycle: true,
    sizeScale: 1,
    shadow: false,
    airborne: false,
  };

  // Centripetal Catmull-Rom (alpha = 0.5) through p1..p2 at local parameter
  // u in [0,1], with p0/p3 as neighbors. Unlike the uniform variant, it never
  // overshoots or forms loops when waypoints are unevenly spaced
  // (Barry-Goldman pyramid formulation).
  function centripetalCatmullRom(p0, p1, p2, p3, u) {
    const knot = (a, b) => Math.max(1e-4, Math.sqrt(Math.hypot(b.x - a.x, b.y - a.y)));
    const t1 = knot(p0, p1);
    const t2 = t1 + knot(p1, p2);
    const t3 = t2 + knot(p2, p3);
    const t = t1 + (t2 - t1) * u;
    const lerpPt = (a, b, ta, tb) => {
      const w = (t - ta) / (tb - ta);
      return { x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w };
    };
    const a1 = lerpPt(p0, p1, 0, t1);
    const a2 = lerpPt(p1, p2, t1, t2);
    const a3 = lerpPt(p2, p3, t2, t3);
    const b1 = lerpPt(a1, a2, 0, t2);
    const b2 = lerpPt(a2, a3, t1, t3);
    return lerpPt(b1, b2, t1, t2);
  }

  // Fraction of a segment's distance covered at local time fraction tau,
  // cruising at constant speed with short linear-acceleration ramps on the
  // requested ends. Ramp lengths are fractions of the segment's duration;
  // velocity is continuous, so there is no lurch where a ramp meets cruise.
  function rampedProgress(tau, rampIn, rampOut) {
    const cruise = 1 - rampIn / 2 - rampOut / 2;
    let d;
    if (tau < rampIn) d = (tau * tau) / (2 * rampIn);
    else if (tau > 1 - rampOut) d = cruise - ((1 - tau) * (1 - tau)) / (2 * rampOut);
    else d = tau - rampIn / 2;
    return d / cruise;
  }

  function getActor(id) {
    let actor = actors.get(id);
    if (!actor) {
      actor = {
        lizardImage: null,
        walkFrames: null,
        walkRotationOffsetRad: 0,
        walkStrideLengthPx: 140,
        rig: null,
        rigRotationOffsetRad: 0,
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

  // Position at spline parameter u for a segment. Path ends get a mirrored
  // phantom neighbor so the curve leaves/arrives along the end segment.
  function evaluateSegment(actor, segIndex, u) {
    const path = actor.path;
    const n = path.length;
    const p1 = path[segIndex];
    const p2 = path[segIndex + 1];
    if (p1.x === p2.x && p1.y === p2.y) return { x: p1.x, y: p1.y };
    const p0 = segIndex - 1 >= 0 ? path[segIndex - 1] : { x: 2 * p1.x - p2.x, y: 2 * p1.y - p2.y };
    const p3 = segIndex + 2 < n ? path[segIndex + 2] : { x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y };
    return centripetalCatmullRom(p0, p1, p2, p3, u);
  }

  // Per-segment table of cumulative curve length vs spline parameter, so
  // motion can advance by distance rather than by u (equal steps of u are
  // bunched in tight bends and spread out on long stretches, which made the
  // animal speed up and slow down within a segment and its feet slide).
  function segmentArcTable(actor, segIndex) {
    if (!actor.segmentArcTables) actor.segmentArcTables = [];
    let table = actor.segmentArcTables[segIndex];
    if (!table) {
      const lengths = [0];
      let prev = evaluateSegment(actor, segIndex, 0);
      for (let i = 1; i <= SEGMENT_ARC_SAMPLES; i++) {
        const p = evaluateSegment(actor, segIndex, i / SEGMENT_ARC_SAMPLES);
        lengths.push(lengths[i - 1] + Math.hypot(p.x - prev.x, p.y - prev.y));
        prev = p;
      }
      table = actor.segmentArcTables[segIndex] = lengths;
    }
    return table;
  }

  // Spline parameter at which a segment has covered `fraction` of its length.
  function segmentParamAtFraction(actor, segIndex, fraction) {
    const lengths = segmentArcTable(actor, segIndex);
    const total = lengths[lengths.length - 1];
    if (total <= 0) return fraction;
    const target = Math.max(0, Math.min(1, fraction)) * total;
    let low = 1;
    let high = lengths.length - 1;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (lengths[mid] < target) low = mid + 1;
      else high = mid;
    }
    const d0 = lengths[low - 1];
    const d1 = lengths[low];
    const frac = d1 > d0 ? (target - d0) / (d1 - d0) : 0;
    return (low - 1 + frac) / SEGMENT_ARC_SAMPLES;
  }

  function isStationarySegment(actor, segIndex) {
    const a = actor.path[segIndex];
    const b = actor.path[segIndex + 1];
    return !a || !b || (a.x === b.x && a.y === b.y);
  }

  // Constant speed within each segment; the actor accelerates only where it
  // starts moving (path start, or leaving a dwell) and decelerates only
  // where it stops (path end, or arriving at a dwell), over a short ramp.
  // Easing every segment independently (the original approach) made the
  // lizard decelerate and re-accelerate at every waypoint, and a cubic ease
  // over a whole segment made it lurch where that met cruise speed.
  function distanceFractionForSegment(actor, segIndex, lastSegIndex, localT) {
    const duration = segDurationMs(actor, segIndex);
    if (duration <= 0) return localT;
    const ramp = Math.min(0.5, rampMsFor(actor) / duration);
    const rampIn = segIndex === 0 || isStationarySegment(actor, segIndex - 1) ? ramp : 0;
    const rampOut = segIndex === lastSegIndex || isStationarySegment(actor, segIndex + 1) ? ramp : 0;
    return rampedProgress(localT, rampIn, rampOut);
  }

  // Point of a motion table (cumulative-distance samples) at a distance along it.
  function pointAtDistance(points, target) {
    let low = 1, high = points.length - 1;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (points[mid].distance < target) low = mid + 1;
      else high = mid;
    }
    const a = points[low - 1], b = points[low];
    const fraction = b.distance > a.distance ? (target - a.distance) / (b.distance - a.distance) : 0;
    return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
  }

  // Direction of travel to keep while an actor stands still (a pause at a
  // waypoint): the way it last moved, or else the way it's about to move.
  // Without this, a frozen animal has no movement to face and snaps to
  // facing right for the length of the pause.
  function heldDirection(actor, tMs, total) {
    const here = getPositionAt(actor, tMs);
    const STEP_MS = 40;
    for (let k = 1; k <= 200; k++) {
      const t = tMs - k * STEP_MS;
      if (t < 0) break;
      const p = getPositionAt(actor, t);
      const dx = here.x - p.x, dy = here.y - p.y;
      if (Math.hypot(dx, dy) > 0.5) return { dx, dy };
    }
    for (let k = 1; k <= 200; k++) {
      const t = tMs + k * STEP_MS;
      if (t > total) break;
      const p = getPositionAt(actor, t);
      const dx = p.x - here.x, dy = p.y - here.y;
      if (Math.hypot(dx, dy) > 0.5) return { dx, dy };
    }
    return { dx: 0, dy: 0 };
  }

  // Position at absolute time tMs (ms), clamped to [0, actor's own total duration].
  function get3DPositionAt(actor, tMs, total) {
    if (!actor.motionTable) {
      const points = [{ ...actor.path[0], distance: 0 }];
      const segStarts = [0];
      let distance = 0;
      for (let segment = 0; segment < actor.path.length - 1; segment++) {
        for (let sample = 1; sample <= 64; sample++) {
          const point = evaluateSegment(actor, segment, sample / 64);
          const previous = points[points.length - 1];
          distance += Math.hypot(point.x - previous.x, point.y - previous.y);
          points.push({ ...point, distance });
        }
        segStarts.push(distance);
      }
      actor.motionTable = { points, distance, segStarts };
    }
    const { points, distance, segStarts } = actor.motionTable;
    if (total <= 0 || distance === 0) return points[points.length - 1];
    // Prey motion follows each segment's own timing (fast darts, slow
    // creeps, frozen pauses at repeated waypoints) instead of one even
    // cruise over the whole path, which would erase every stop.
    if (actor.options && actor.options.preyMotion) {
      const seg = findSegment(actor, Math.max(0, Math.min(total, tMs)));
      if (!seg) return points[0];
      const fraction = distanceFractionForSegment(actor, seg.index, actor.path.length - 2, seg.localT);
      const start = segStarts[seg.index];
      return pointAtDistance(points, start + (segStarts[seg.index + 1] - start) * fraction);
    }
    // One continuous cruise across waypoints, with short acceleration and
    // deceleration ramps only at the start/end. Preserve total path duration.
    const time = Math.max(0, Math.min(total, tMs));
    const ramp = Math.min(250, total / 4);
    let progress;
    if (time < ramp) progress = time * time / (2 * ramp);
    else if (time > total - ramp) progress = total - ramp - (total - time) ** 2 / (2 * ramp);
    else progress = time - ramp / 2;
    const target = distance * progress / (total - ramp);
    let low = 1, high = points.length - 1;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (points[mid].distance < target) low = mid + 1;
      else high = mid;
    }
    const a = points[low - 1], b = points[low];
    const fraction = b.distance > a.distance ? (target - a.distance) / (b.distance - a.distance) : 0;
    return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
  }

  function getPositionAt(actor, tMs) {
    const path = actor.path;
    if (path.length === 0) return { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
    if (path.length === 1) return { x: path[0].x, y: path[0].y };
    if (actor.model3d) return get3DPositionAt(actor, tMs, actorTotalDurationMs(actor));
    const clamped = Math.max(0, Math.min(actorTotalDurationMs(actor), tMs));
    const seg = findSegment(actor, clamped);
    if (!seg) return { x: path[0].x, y: path[0].y };
    const fraction = distanceFractionForSegment(actor, seg.index, path.length - 2, seg.localT);
    return evaluateSegment(actor, seg.index, segmentParamAtFraction(actor, seg.index, fraction));
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

  // Which visual mode is active right now, tiered rig > walk-cycle frames >
  // static image, purely additive over what existed before rigs: an actor
  // with no `rig` registered falls through to the exact same walkFrames/
  // static behavior as always. Each mode's artwork has its own "neutral"
  // drawn orientation, so each needs its own rotation offset to align its
  // heading with the direction of travel (see getPose). The rig's offset is
  // independent of the walk-cycle frames' — a rig is typically cut from the
  // static "source" photo (neutrally horizontal, offset 0), which is often a
  // different neutral orientation than the separately-authored motion-grid
  // sheet the walkFrames offset was tuned for (see setActorRig).
  function activeSprite(actor) {
    if (actor.model3d) return { rotationOffsetRad: 0, mode: "model3d" };
    if (actor.rig) {
      return { rotationOffsetRad: actor.rigRotationOffsetRad, mode: "rig" };
    }
    if (actor.walkFrames && actor.walkFrames.length > 0 && actor.options.useWalkCycle) {
      return { rotationOffsetRad: actor.walkRotationOffsetRad, mode: "walkFrames" };
    }
    return { rotationOffsetRad: actor.staticRotationOffsetRad || 0, mode: "static" };
  }

  // Continuous (non-discretized) gait phase in [0, 1), by distance traveled
  // — same distance-driven idea as currentWalkFrames below, just without
  // snapping to one of N baked poses, since a rig's limbs move continuously.
  function gaitPhase01(actor, tMs, strideLengthPx) {
    const dist = distanceTraveledAt(actor, tMs);
    const cycle = strideLengthPx > 0 ? strideLengthPx : 1;
    return ((((dist % cycle) + cycle) % cycle) / cycle);
  }

  function limbAngleRad(limb, phase01) {
    return limb.restAngleRad + limb.swingAmplitudeRad * Math.sin(2 * Math.PI * (phase01 + limb.swingPhaseOffset));
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
      let dx = after.x - before.x;
      let dy = after.y - before.y;
      if (Math.hypot(dx, dy) < 0.01) ({ dx, dy } = heldDirection(actor, clamped, total));
      // A top-down 3D model turns 180deg to head left; a side-angled one
      // (snail, sparrow…) would end up upside down, so it mirrors instead.
      flipped = actor.options.flip && dx < 0 && !(actor.model3d && !actor.model3d.angled && actor.options.rotationFollowsPath);
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

  // Picks a gait-cycle position by distance traveled (not wall-clock time),
  // so leg-stepping speed automatically scales with how fast the lizard is
  // actually moving along the path instead of ticking at a fixed rate.
  // Returns the two neighboring frames (the sheet loops, so the frame after
  // the last one wraps to the first) plus how far between them we are, so
  // drawActor can cross-fade instead of hard-cutting between poses — with
  // only 8-12 frames per animal, snapping to the nearest one reads as a
  // choppy flipbook, especially at slow speeds where one frame holds for a
  // long stretch and then jumps.
  function currentWalkFrames(actor, tMs) {
    const dist = distanceTraveledAt(actor, tMs);
    const cycle = actor.walkStrideLengthPx > 0 ? actor.walkStrideLengthPx : 1;
    const n = actor.walkFrames.length;
    const phase = ((((dist % cycle) + cycle) % cycle) / cycle) * n;
    const i0 = Math.floor(phase) % n;
    const i1 = (i0 + 1) % n;
    const frac = phase - Math.floor(phase);
    return { frame: actor.walkFrames[i0], nextFrame: actor.walkFrames[i1], frac };
  }

  // Draws a rig-mode actor's body + limb layers, nested inside drawActor's
  // already-applied translate/flip/heading-rotation/shadow transform (so a
  // rig is positioned/oriented exactly like any other actor — this function
  // only handles what's drawn, not where/how the whole actor sits). `k`
  // converts the rig's authored pixel space (see prepare-assets.js's
  // buildRig — same upres'd convention as every other sprite asset) into
  // this frame's actual draw scale. Limbs are drawn behind the body, then
  // the body, then the remaining limbs, so far-side/near-side legs occlude
  // correctly for a quadruped's alternating gait.
  function drawRiggedBody(rig, sizeScale, poseScale, phase01) {
    const k = (poseScale * sizeScale) / ASSET_UPRES_FACTOR;

    function drawLimb(limb) {
      const w = limb.image.naturalWidth * k;
      const h = limb.image.naturalHeight * k;
      ctx.save();
      ctx.translate(limb.anchorOffset.x * k, limb.anchorOffset.y * k);
      ctx.rotate(limbAngleRad(limb, phase01));
      ctx.drawImage(limb.image, -limb.pivotLocal.x * k, -limb.pivotLocal.y * k, w, h);
      ctx.restore();
    }

    for (const limb of rig.limbs) {
      if (limb.drawOrder === "behind") drawLimb(limb);
    }

    const bw = rig.bodyImage.naturalWidth * k;
    const bh = rig.bodyImage.naturalHeight * k;
    ctx.drawImage(rig.bodyImage, rig.bodyDrawOffset.x * k, rig.bodyDrawOffset.y * k, bw, bh);

    for (const limb of rig.limbs) {
      if (limb.drawOrder !== "behind") drawLimb(limb);
    }
  }

  function drawActor(actor, tMs) {
    const localT = tMs - actor.startAtMs;
    if (localT < 0) return; // hasn't started yet — stays offscreen/invisible
    if (actor.path.length === 0) return;

    const sprite = activeSprite(actor);
    const isRig = sprite.mode === "rig";
    const walk = sprite.mode === "walkFrames" ? currentWalkFrames(actor, localT) : null;
    const spriteImage = walk ? walk.frame : actor.lizardImage;
    if (!isRig && !spriteImage) return;
    if (isRig && !actor.rig.bodyImage) return;

    const pose = getPose(actor, localT, sprite.rotationOffsetRad);
    const sizeScale = actor.options.sizeScale || 1;
    const scale = pose.scale * sizeScale;

    // Everything below draws the body centered on the current origin, already
    // turned to face its heading. Returns the body's half-extent (logical px)
    // from that origin, which bounds it at any rotation.
    let drawBody;
    let radius;
    if (actor.model3d) {
      const phase = actor.options.useWalkCycle ? gaitPhase01(actor, localT, actor.walkStrideLengthPx) : 0;
      const surface = actor.model3d.render(phase, actor.options.useWalkCycle ? localT / 1000 : 0);
      const size = 320 * scale;
      radius = size * Math.SQRT1_2;
      drawBody = () => ctx.drawImage(surface, -size / 2, -size / 2, size, size);
    } else if (isRig) {
      const phase01 = gaitPhase01(actor, localT, actor.rig.strideLengthPx);
      radius = rigRadius(actor.rig, scale);
      drawBody = () => drawRiggedBody(actor.rig, sizeScale, pose.scale, phase01);
    } else {
      const w = (spriteImage.naturalWidth / ASSET_UPRES_FACTOR) * scale;
      const h = (spriteImage.naturalHeight / ASSET_UPRES_FACTOR) * scale;
      radius = Math.hypot(w, h) / 2;
      drawBody = () => {
        ctx.drawImage(spriteImage, -w / 2, -h / 2, w, h);
        if (walk && walk.nextFrame && walk.nextFrame !== walk.frame && walk.frac > 0.004) {
          ctx.globalAlpha = walk.frac;
          ctx.drawImage(walk.nextFrame, -w / 2, -h / 2, w, h);
          ctx.globalAlpha = 1;
        }
      };
    }
    const orient = () => {
      if (pose.flipped) ctx.scale(-1, 1);
      if (pose.angle) ctx.rotate(pose.angle);
    };

    if (!actor.options.shadow) {
      ctx.save();
      ctx.translate(pose.x, pose.y);
      orient();
      drawBody();
      ctx.restore();
      return;
    }
    drawWithGroundShadow(actor, pose, radius, scale, orient, drawBody);
  }

  // Bounding radius of a cutout rig: body corners plus each limb's reach.
  function rigRadius(rig, scale) {
    const k = scale / ASSET_UPRES_FACTOR;
    const bx = rig.bodyDrawOffset.x * k;
    const by = rig.bodyDrawOffset.y * k;
    const bw = rig.bodyImage.naturalWidth * k;
    const bh = rig.bodyImage.naturalHeight * k;
    let r = Math.max(Math.hypot(bx, by), Math.hypot(bx + bw, by), Math.hypot(bx, by + bh), Math.hypot(bx + bw, by + bh));
    for (const limb of rig.limbs) {
      const reach = Math.hypot(limb.anchorOffset.x * k, limb.anchorOffset.y * k) +
        Math.hypot(limb.image.naturalWidth * k, limb.image.naturalHeight * k);
      r = Math.max(r, reach);
    }
    return r;
  }

  // Soft top-down shadow cast by the body's own silhouette, lit from the
  // upper left. The body is rendered once into an offscreen buffer so the
  // shadow is one clean silhouette (no darker overlaps from cross-faded walk
  // frames or rig limbs) and a 3D model is only rendered once per frame.
  // Ground animals get a tight contact shadow plus a soft spread; flying
  // ones get a single faint shadow cast farther away, which reads as height.
  function drawWithGroundShadow(actor, pose, radius, scale, orient, drawBody) {
    const m = ctx.getTransform();
    const k = Math.hypot(m.a, m.b) || 1; // device px per logical px (see setContext)
    const side = Math.ceil((2 * radius + 4) * k);
    if (!actor.shadowBuffer) actor.shadowBuffer = document.createElement("canvas");
    const buffer = actor.shadowBuffer;
    if (buffer.width < side || buffer.height < side) {
      buffer.width = Math.max(buffer.width, side);
      buffer.height = Math.max(buffer.height, side);
    }
    const bctx = buffer.getContext("2d");
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, side, side);
    bctx.setTransform(k, 0, 0, k, side / 2, side / 2);

    const mainCtx = ctx;
    ctx = bctx; // drawRiggedBody and drawBody draw through the shared ctx
    try {
      orient();
      drawBody();
    } finally {
      ctx = mainCtx;
    }

    const half = side / 2 / k;
    const layers = actor.options.airborne ? AIR_SHADOW_LAYERS : GROUND_SHADOW_LAYERS;
    for (const layer of layers) {
      ctx.save();
      ctx.filter = `brightness(0) blur(${(layer.blur * scale * k).toFixed(2)}px)`;
      ctx.globalAlpha = layer.alpha;
      ctx.drawImage(buffer, 0, 0, side, side,
        pose.x + layer.dx * scale - half, pose.y + layer.dy * scale - half, 2 * half, 2 * half);
      ctx.restore();
    }
    ctx.drawImage(buffer, 0, 0, side, side, pose.x - half, pose.y - half, 2 * half, 2 * half);
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

  // A scrolling texture (e.g. clouds) drawn over its band every frame, tiled
  // horizontally and sliding sideways over time — unlike the static
  // background, this can't be pre-baked, so it's redrawn fresh each frame
  // like a sprite. Positive scrollPxPerSec drifts right; negative drifts
  // left. The source texture should tile seamlessly left-to-right (its own
  // left/right edges should match, e.g. via transparent margins) since it's
  // repeated edge-to-edge to cover the full canvas width with no gaps.
  function drawScrollLayer(layer, tMs) {
    const { image, y0, y1, scrollPxPerSec } = layer;
    if (!image) return;
    const h = y1 - y0;
    const w = h * (image.naturalWidth / image.naturalHeight);
    if (w <= 0) return;

    const offset = ((tMs / 1000) * scrollPxPerSec) % w;
    const phase = ((offset % w) + w) % w; // normalize into [0, w)
    let startX = phase - w;
    for (let x = startX; x < CANVAS_WIDTH; x += w) {
      ctx.drawImage(image, x, y0, w, h);
    }
  }

  // ---------------------------------------------------------------------
  // Background motion: dappled sunlight, water caustics and ripples,
  // drifting particles, and a slow camera drift. Like everything else here
  // it is a pure function of tMs (textures and particles come from a seed),
  // so scrubbing and export stay deterministic. See setSceneEffects.
  // ---------------------------------------------------------------------
  let effects = null;
  let effectAssets = null;
  let cameraActive = true;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  // Blurs a tile while keeping it seamless (blurs a 3x3 copy, keeps the middle).
  function blurTile(tile, px) {
    const s = tile.width;
    const big = makeCanvas(s * 3, s * 3);
    const bg = big.getContext("2d");
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) bg.drawImage(tile, i * s, j * s);
    const out = makeCanvas(s, s);
    const og = out.getContext("2d");
    og.filter = `blur(${px}px)`;
    og.drawImage(big, -s, -s);
    og.filter = "none";
    return out;
  }

  // Grayscale mask -> tinted tile whose alpha is alphaOf(mask 0..1).
  function tintTile(mask, rgb, alphaOf) {
    const c = makeCanvas(mask.width, mask.height);
    const g = c.getContext("2d");
    g.drawImage(mask, 0, 0);
    const img = g.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const m = d[i] / 255;
      d[i] = rgb[0];
      d[i + 1] = rgb[1];
      d[i + 2] = rgb[2];
      d[i + 3] = 255 * Math.max(0, Math.min(1, alphaOf(m)));
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  // Leaf-canopy shadow mask (white = shadow): clumps of small leaves along
  // a few branches, leaving irregular sunny gaps. Large and tileable.
  function makeCanopyMask(rand, size) {
    const c = makeCanvas(size, size);
    const g = c.getContext("2d");
    g.fillStyle = "#000";
    g.fillRect(0, 0, size, size);
    g.fillStyle = "#fff";
    const leaf = (x, y, len, a) => {
      for (const dx of [-size, 0, size]) {
        for (const dy of [-size, 0, size]) {
          g.beginPath();
          g.ellipse(x + dx, y + dy, len, len * 0.45, a, 0, Math.PI * 2);
          g.fill();
        }
      }
    };
    const branches = 7 + Math.floor(rand() * 4);
    for (let b = 0; b < branches; b++) {
      let x = rand() * size;
      let y = rand() * size;
      let dir = rand() * Math.PI * 2;
      const steps = 10 + Math.floor(rand() * 12);
      for (let i = 0; i < steps; i++) {
        dir += (rand() - 0.5) * 0.7;
        x += Math.cos(dir) * 14;
        y += Math.sin(dir) * 14;
        // a clump of leaves around this point of the branch
        const clump = 3 + Math.floor(rand() * 5);
        for (let k = 0; k < clump; k++) {
          const r = rand() * 26;
          const t = rand() * Math.PI * 2;
          leaf(x + Math.cos(t) * r, y + Math.sin(t) * r, 6 + rand() * 11, rand() * Math.PI);
        }
      }
    }
    return blurTile(c, 5);
  }

  // Pool-floor caustics: bright wavy web from ridged, tileable noise.
  function makeCausticMask(rand, size) {
    const cells = 8;
    const grid = [];
    for (let i = 0; i < cells * cells; i++) grid.push(rand());
    const at = (x, y) => grid[((y % cells) + cells) % cells * cells + ((x % cells) + cells) % cells];
    const c = makeCanvas(size, size);
    const g = c.getContext("2d");
    const img = g.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let v = 0;
        let amp = 1;
        let total = 0;
        for (let o = 0; o < 2; o++) {
          const f = (cells * (1 << o)) / size;
          const fx = x * f;
          const fy = y * f;
          const ix = Math.floor(fx);
          const iy = Math.floor(fy);
          let tx = fx - ix;
          let ty = fy - iy;
          tx = tx * tx * (3 - 2 * tx);
          ty = ty * ty * (3 - 2 * ty);
          const n = (at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx) * (1 - ty) + (at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx) * ty;
          v += amp * n;
          total += amp;
          amp *= 0.5;
        }
        const ridge = Math.pow(1 - Math.abs(2 * (v / total) - 1), 10);
        const k = (y * size + x) * 4;
        img.data[k] = img.data[k + 1] = img.data[k + 2] = 255 * ridge;
        img.data[k + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return blurTile(c, 1.5);
  }

  const PARTICLE_COLORS = {
    leaves: [[92, 128, 44], [134, 150, 52], [196, 150, 48], [170, 92, 38], [120, 84, 46]],
    petals: [[248, 196, 210], [255, 228, 236], [244, 170, 196], [255, 246, 240]],
    snow: [[255, 255, 255]],
    dust: [[255, 236, 200]],
  };

  function makeParticles(rand, spec) {
    const out = [];
    const wind = spec.wind || { x: 30, y: 18 };
    for (let i = 0; i < spec.count; i++) {
      const depth = 0.6 + rand() * 0.7; // nearer particles are bigger and faster
      const palette = PARTICLE_COLORS[spec.kind];
      out.push({
        x0: rand() * CANVAS_WIDTH,
        y0: rand() * CANVAS_HEIGHT,
        vx: (wind.x * (0.6 + rand() * 0.8)) * depth,
        vy: (wind.y * (0.6 + rand() * 0.8)) * depth,
        depth,
        size: depth * (spec.kind === "leaves" ? 15 + rand() * 12 : spec.kind === "petals" ? 8 + rand() * 5 : spec.kind === "snow" ? 1.5 + rand() * 3 : 0.8 + rand() * 1.6),
        rot: rand() * Math.PI * 2,
        spin: (rand() - 0.5) * 3,
        tumble: 0.6 + rand() * 1.8,
        swayAmp: 6 + rand() * 22,
        swayFreq: 0.2 + rand() * 0.5,
        phase: rand() * Math.PI * 2,
        color: palette[Math.floor(rand() * palette.length)],
      });
    }
    return out;
  }

  function buildEffectAssets(fx) {
    const rand = mulberry32(fx.seed || 1);
    const assets = {};
    if (fx.light) {
      const mask = makeCanopyMask(rand, 512);
      assets.lightShadow = tintTile(mask, [6, 12, 8], (m) => m);
      assets.lightSun = tintTile(mask, [255, 236, 190], (m) => (1 - m) * 0.6);
      assets.lightShadow2 = tintTile(makeCanopyMask(rand, 512), [6, 12, 8], (m) => m * 0.7);
    }
    if (fx.water) assets.caustic = tintTile(makeCausticMask(rand, 192), [225, 248, 255], (m) => m);
    if (fx.particles) assets.particles = makeParticles(rand, fx.particles);
    return assets;
  }

  function patternFill(tile, ox, oy, scale, alpha, op) {
    const pattern = ctx.createPattern(tile, "repeat");
    pattern.setTransform(new DOMMatrix().translateSelf(ox, oy).scaleSelf(scale, scale));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = op;
    ctx.fillStyle = pattern;
    ctx.fillRect(-40, -40, CANVAS_WIDTH + 80, CANVAS_HEIGHT + 80);
    ctx.restore();
  }

  // Dappled sunlight: two canopy shadow layers drifting and swaying at
  // different rates (branches at different heights), plus warm sun spots.
  function drawLight(tMs) {
    const { strength = 0.45, scale = 1.2, speed = 6, angle = 0.6 } = effects.light;
    const s = tMs / 1000;
    const dx = Math.cos(angle) * speed * s;
    const dy = Math.sin(angle) * speed * s;
    const sway1 = Math.sin(s * 0.9) * 10 + Math.sin(s * 2.3) * 3;
    const sway2 = Math.sin(s * 0.6 + 1.3) * 16;
    patternFill(effectAssets.lightShadow2, -dx * 0.6 + sway2, -dy * 0.6 - sway2 * 0.4, scale * 1.6, strength * 0.5, "multiply");
    patternFill(effectAssets.lightShadow, dx + sway1, dy + sway1 * 0.5, scale, strength, "multiply");
    patternFill(effectAssets.lightSun, dx + sway1, dy + sway1 * 0.5, scale, Math.min(1, strength * 1.1), "soft-light");
  }

  // Caustics shimmer on the water patch's floor (under the fish).
  function drawWaterFloor(tMs) {
    const { rects = [], strength = 0.5 } = effects.water;
    const s = tMs / 1000;
    for (const r of rects) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(r.x, r.y, r.w, r.h);
      ctx.clip();
      ctx.fillStyle = `rgba(30,115,150,${0.5 * strength})`; // water depth tint
      ctx.globalCompositeOperation = "multiply";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.globalCompositeOperation = "source-over";
      patternFill(effectAssets.caustic, s * 14, s * 9, 1.1, strength * 0.9, "screen");
      patternFill(effectAssets.caustic, -s * 11 + 40, s * 13 + 70, 1.45, strength * 0.65, "screen");
      // slow light/dark swell across the surface
      const swell = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
      const p = (Math.sin(s * 0.7) + 1) / 2;
      swell.addColorStop(Math.max(0, p - 0.3), "rgba(0,40,70,0)");
      swell.addColorStop(p, `rgba(0,40,70,${0.12 * strength})`);
      swell.addColorStop(Math.min(1, p + 0.3), "rgba(0,40,70,0)");
      ctx.fillStyle = swell;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.restore();
    }
  }

  // Expanding rings on the surface behind anything moving through water.
  function drawRipples(tMs) {
    const { rects = [], strength = 0.5 } = effects.water;
    const SPAWN_MS = 650;
    const LIFE_MS = 1900;
    for (const actor of actors.values()) {
      if (actor.path.length < 2) continue;
      const total = actorTotalDurationMs(actor);
      for (let k = Math.floor((tMs - LIFE_MS) / SPAWN_MS) + 1; k <= Math.floor(tMs / SPAWN_MS); k++) {
        const born = k * SPAWN_MS;
        const local = born - actor.startAtMs;
        if (local < 0 || local > total) continue;
        const pos = getPositionAt(actor, local);
        const r = rects.find((q) => pos.x >= q.x && pos.x <= q.x + q.w && pos.y >= q.y && pos.y <= q.y + q.h);
        if (!r) continue;
        const age = (tMs - born) / LIFE_MS;
        ctx.save();
        ctx.beginPath();
        ctx.rect(r.x, r.y, r.w, r.h);
        ctx.clip();
        const radius = 10 + age * 70;
        ctx.lineWidth = 2.2 * (1 - age) + 0.6;
        ctx.strokeStyle = `rgba(0,40,60,${0.3 * strength * (1 - age)})`; // trough
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 2.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${0.7 * strength * (1 - age)})`; // crest
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function leafPath(size) {
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.quadraticCurveTo(-size * 0.2, -size * 0.55, size, 0);
    ctx.quadraticCurveTo(-size * 0.2, size * 0.55, -size, 0);
  }

  // Leaves/petals tumble and cast a small shadow below them; snow and
  // dust are soft specks. Positions wrap around the frame.
  function drawParticles(tMs) {
    const { kind } = effects.particles;
    const s = tMs / 1000;
    const W = CANVAS_WIDTH + 120;
    const H = CANVAS_HEIGHT + 120;
    for (const p of effectAssets.particles) {
      const sway = Math.sin(s * p.swayFreq * Math.PI * 2 + p.phase) * p.swayAmp;
      const x = ((((p.x0 + p.vx * s + sway) % W) + W) % W) - 60;
      const y = ((((p.y0 + p.vy * s - sway * 0.4) % H) + H) % H) - 60;
      const [r, g, b] = p.color;
      ctx.save();
      if (kind === "leaves" || kind === "petals") {
        const flip = Math.cos(s * p.tumble + p.phase); // turning over in the air
        const rot = p.rot + s * p.spin;
        // shadow on the ground, offset by height
        ctx.save();
        ctx.translate(x + 14 * p.depth, y + 22 * p.depth);
        ctx.rotate(rot);
        ctx.scale(1, Math.max(0.15, Math.abs(flip)));
        ctx.fillStyle = "rgba(0,0,0,0.16)";
        if (kind === "leaves") leafPath(p.size);
        else {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.scale(1, Math.max(0.15, Math.abs(flip)));
        const shade = 0.75 + 0.25 * flip;
        ctx.fillStyle = `rgb(${r * shade},${g * shade},${b * shade})`;
        if (kind === "leaves") {
          leafPath(p.size);
          ctx.fill();
          ctx.strokeStyle = `rgba(${r * 0.6},${g * 0.6},${b * 0.5},0.8)`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(-p.size, 0);
          ctx.lineTo(p.size * 0.9, 0);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const twinkle = kind === "dust" ? 0.35 + 0.65 * Math.abs(Math.sin(s * 1.3 + p.phase)) : 0.9;
        ctx.globalCompositeOperation = kind === "dust" ? "lighter" : "source-over";
        const grad = ctx.createRadialGradient(x, y, 0, x, y, p.size * 2);
        grad.addColorStop(0, `rgba(${r},${g},${b},${twinkle})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(x - p.size * 2, y - p.size * 2, p.size * 4, p.size * 4);
      }
      ctx.restore();
    }
  }

  // Slow push-in and pan over the whole timeline. Zoom stays >= 1 and the
  // pan is limited to the zoomed-in margin, so no edge ever shows.
  function applyCamera(tMs) {
    const { zoomFrom = 1, zoomTo = 1.08, panX = 0, panY = 0 } = effects.camera;
    let total = 0;
    for (const actor of actors.values()) total = Math.max(total, actor.startAtMs + actorTotalDurationMs(actor));
    const u = total > 0 ? Math.max(0, Math.min(1, tMs / total)) : 0;
    const e = u * u * (3 - 2 * u);
    const s = Math.max(1, zoomFrom + (zoomTo - zoomFrom) * e);
    const marginX = ((s - 1) * CANVAS_WIDTH) / 2;
    const marginY = ((s - 1) * CANVAS_HEIGHT) / 2;
    const px = panX * marginX * 0.9 * (2 * e - 1);
    const py = panY * marginY * 0.9 * (2 * e - 1);
    ctx.translate(CANVAS_WIDTH / 2 + px, CANVAS_HEIGHT / 2 + py);
    ctx.scale(s, s);
    ctx.translate(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2);
  }

  // ---------------------------------------------------------------------
  // Swaying plants: scenes with a `sway` config get their background photo
  // drawn through a small WebGL warp. A mask built from the photo's colors
  // (green foliage, purple/pink flowers) says what may move, so wood, soil,
  // tiles and walls stay still. With `rootY` (side views, e.g. a planter)
  // plants stay anchored at their roots and sway more toward their tips;
  // without it (top-down grass) everything in the mask ripples evenly.
  // Time-driven, so scrubbing and export stay deterministic.
  // ---------------------------------------------------------------------
  let sway = null;

  // Per-pixel 0..1: how plant-like this color is.
  function plantWeight(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < 0.1) return 0;
    const sat = (max - min) / max;
    let hue = 0;
    if (max !== min) {
      if (max === r) hue = 60 * (((g - b) / (max - min)) % 6);
      else if (max === g) hue = 60 * ((b - r) / (max - min) + 2);
      else hue = 60 * ((r - g) / (max - min) + 4);
    }
    if (hue < 0) hue += 360;
    const satRamp = (lo, hi) => Math.max(0, Math.min(1, (sat - lo) / (hi - lo)));
    if (hue >= 55 && hue <= 175) return satRamp(0.08, 0.25); // foliage, incl. grey-green herbs
    if (hue >= 230 && hue <= 345) return satRamp(0.12, 0.3); // purple/pink/lilac flowers
    return 0;
  }

  function buildSwayMask(image, cfg) {
    const w = 480;
    const h = Math.round((w * image.naturalHeight) / image.naturalWidth);
    const src = makeCanvas(w, h);
    const sg = src.getContext("2d");
    sg.drawImage(image, 0, 0, w, h);
    const img = sg.getImageData(0, 0, w, h);
    const d = img.data;
    const { rootY, region } = cfg;
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    for (let y = 0; y < h; y++) {
      const fy = y / h;
      // Side view: 0 at the roots, rising to 1 toward the plant tips — up
      // from the roots for growing plants, down from the pot for hanging ones.
      let height = 1;
      if (rootY != null) {
        height = cfg.hang
          ? clamp01((fy - rootY) / Math.max(0.05, (cfg.tipY ?? 1) - rootY))
          : clamp01((rootY - fy) / Math.max(0.05, rootY - (cfg.tipY ?? 0)));
        height = Math.pow(height, 0.8);
      }
      for (let x = 0; x < w; x++) {
        const k = (y * w + x) * 4;
        const fx = x / w;
        const inside = !region || (fx >= (region.x0 ?? 0) && fx <= (region.x1 ?? 1) && fy >= (region.y0 ?? 0) && fy <= (region.y1 ?? 1));
        const v = inside ? 255 * plantWeight(d[k] / 255, d[k + 1] / 255, d[k + 2] / 255) * height : 0;
        d[k] = d[k + 1] = d[k + 2] = v;
        d[k + 3] = 255;
      }
    }
    sg.putImageData(img, 0, 0);
    const out = makeCanvas(w, h);
    const og = out.getContext("2d");
    og.filter = "blur(2px)"; // soft edges so plant borders bend instead of tearing
    og.drawImage(src, 0, 0);
    og.filter = "none";
    // ...but anything that isn't itself a plant (a fence picket, a pot) stays
    // perfectly still, so the blur can't make its edges wobble.
    const soft = og.getImageData(0, 0, w, h);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] < 20) soft.data[i] = soft.data[i + 1] = soft.data[i + 2] = 0;
    }
    og.putImageData(soft, 0, 0);
    return out;
  }

  const SWAY_VERTEX = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;
  const SWAY_FRAGMENT = `
    precision highp float;
    uniform sampler2D uImage;
    uniform sampler2D uMask;
    uniform float uTime;
    uniform float uStrength;
    uniform vec2 uDir;
    varying vec2 vUv;
    void main() {
      float m = texture2D(uMask, vUv).r;
      float t = uTime;
      // gusts travel across the scene; within them, two waves of sway
      float gust = 0.55 + 0.45 * sin(t * 0.55 + vUv.x * 2.4 - vUv.y * 1.3);
      float wave = sin(t * 1.8 + vUv.x * 13.0 + vUv.y * 5.0) * 0.65
                 + sin(t * 3.1 + vUv.x * 31.0 - vUv.y * 11.0) * 0.35;
      vec2 offset = uDir * wave * gust * m * uStrength * 0.004;
      gl_FragColor = texture2D(uImage, vUv - offset);
    }`;

  function buildSway(cfg, image) {
    const canvas = makeCanvas(image.naturalWidth, image.naturalHeight);
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: false, alpha: false, antialias: false }); // drawn and copied out in the same task, so no need for a second 4K buffer
    if (!gl) return null;
    const shader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, SWAY_VERTEX));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, SWAY_FRAGMENT));
    gl.linkProgram(program);
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // one big triangle
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const texture = (unit, source) => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    texture(0, image);
    texture(1, buildSwayMask(image, cfg));
    gl.uniform1i(gl.getUniformLocation(program, "uImage"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "uMask"), 1);
    // side views sway sideways; top-down grass ripples along the wind
    gl.uniform2f(gl.getUniformLocation(program, "uDir"), 1, cfg.rootY == null ? 0.5 : 0.08);
    gl.uniform1f(gl.getUniformLocation(program, "uStrength"), cfg.strength ?? 1);
    gl.viewport(0, 0, canvas.width, canvas.height);
    return { gl, canvas, uTime: gl.getUniformLocation(program, "uTime") };
  }

  function drawSwayingBackground(tMs) {
    sway.gl.uniform1f(sway.uTime, tMs / 1000);
    sway.gl.drawArrays(sway.gl.TRIANGLES, 0, 3);
    ctx.drawImage(sway.canvas, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  function drawFrame(tMs) {
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.save();
    if (effects?.camera && cameraActive) applyCamera(tMs);
    if (sway) {
      drawSwayingBackground(tMs);
    } else if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    for (const layer of scrollLayers.values()) {
      drawScrollLayer(layer, tMs);
    }
    if (effects?.water) drawWaterFloor(tMs);
    for (const actor of actors.values()) {
      drawActor(actor, tMs);
    }
    for (const ornament of ornaments.values()) {
      drawOrnament(ornament);
    }
    if (effects?.water) drawRipples(tMs);
    if (effects?.light) drawLight(tMs);
    if (effects?.particles) drawParticles(tMs);
    ctx.restore();
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

    setActor3D(id, model) {
      const actor = getActor(id);
      actor.model3d = model || null;
      actor.motionTable = null;
      actor.segmentArcTables = null;
      actor.arcLengthCache = null;
    },

    setActorWalkStrideLength(id, px) {
      getActor(id).walkStrideLengthPx = Math.max(1, px);
    },

    // Registers a layered cutout rig for actor `id` — takes over drawing
    // from the walkFrames/static sprite (see activeSprite) as long as it
    // stays registered; call removeActor or setActorRig(id, null) to fall
    // back. `rigData`: { bodyImage, bodyDrawOffset:{x,y}, strideLengthPx,
    // rotationOffsetRad, limbs: [{ name, image, anchorOffset:{x,y},
    // pivotLocal:{x,y}, restAngleRad, swingAmplitudeRad, swingPhaseOffset,
    // drawOrder }] } — see prepare-assets.js's buildRig for how the geometry
    // fields are derived, and app.js's ensureActorSprite for how the
    // per-limb motion fields (restAngleRad etc.) get merged in live from
    // scenes.json.
    setActorRig(id, rigData) {
      const actor = getActor(id);
      actor.rig = rigData || null;
      actor.rigRotationOffsetRad = (rigData && rigData.rotationOffsetRad) || 0;
    },

    actorHasRig(id) {
      const actor = actors.get(id);
      return !!(actor && actor.rig && actor.rig.bodyImage);
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
      return !!(actor && (actor.model3d || (actor.walkFrames && actor.walkFrames.length > 0)));
    },

    setActorPath(id, newPath) {
      const actor = getActor(id);
      actor.motionTable = null;
      actor.segmentArcTables = null;
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

    // Scroll layers: a moving texture (e.g. clouds) tiled across a band's
    // full width and drawn fresh every frame (see drawScrollLayer) — unlike
    // ornaments/actors this has no path, just a constant drift speed.
    // `zoneKey` just needs to be unique per layer (the scene's band zone,
    // e.g. "air", works well since a scene has at most one cloud layer per
    // band today).
    setScrollLayer(zoneKey, image, y0, y1, scrollPxPerSec) {
      scrollLayers.set(zoneKey, { image, y0, y1, scrollPxPerSec });
    },

    clearScrollLayers() {
      scrollLayers.clear();
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

    // Background motion for the current scene, or null for none:
    // { seed,
    //   light: { strength, scale, speed, angle },          dappled sunlight
    //   water: { rects: [{x,y,w,h}], strength },           caustics + ripples
    //   particles: { kind: leaves|petals|snow|dust, count, wind: {x,y} },
    //   camera: { zoomFrom, zoomTo, panX, panY } }         slow drift
    // Any part may be omitted. Textures are rebuilt only when this changes.
    // Swaying plants for the current background (call after setContext), or null:
    // { strength: 1 = default,
    //   rootY: 0..1 where side-view plants are rooted (omit for top-down grass),
    //   tipY: 0..1 where their tips reach, hang: true for plants trailing down
    //   from a pot, region: { x0, x1, y0, y1 } (0..1) to limit what moves }
    setBackgroundSway(cfg) {
      if (sway) sway.gl.getExtension("WEBGL_lose_context")?.loseContext();
      sway = null;
      if (cfg && bgImage) {
        try {
          sway = buildSway(cfg, bgImage);
        } catch (err) {
          console.warn("Background sway unavailable:", err);
        }
      }
    },

    setSceneEffects(fx) {
      effects = fx && (fx.light || fx.water || fx.particles || fx.camera) ? fx : null;
      effectAssets = effects ? buildEffectAssets(effects) : null;
    },

    getSceneEffects() {
      return effects ? JSON.parse(JSON.stringify(effects)) : null;
    },

    // The editor turns camera drift off while you place waypoints (its
    // markers are drawn unmoved on top) and on for playback and export.
    setCameraActive(active) {
      cameraActive = !!active;
    },

    renderFrame: drawFrame,
  };
})();
