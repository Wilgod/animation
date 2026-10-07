const sharp = require("sharp");

const WHITE_THRESHOLD = 232;
// Studio photos of the animal sources typically have a soft drop-shadow
// baked into the backdrop around the subject (real pixel content, not a
// transparency artifact) — a pale gray gradient that's too dark to hit
// WHITE_THRESHOLD but too light to read as anything but a "halo" once
// composited over a non-white background. Starting the feather well below
// true white fades that whole gradient out along with the backdrop, not
// just the last sliver of it.
const FEATHER_START = 150;

// A soft/anti-aliased edge pixel is an alpha-blend of the true subject color
// and the white backdrop: observed = alphaFrac*subject + (1-alphaFrac)*white.
// Fading only the alpha channel (as this file used to do) leaves that white
// baked into the RGB, so a mostly-transparent edge pixel is still ~white —
// composited over anything other than a white page, that reads as a pale
// halo/fringe traced around the whole cutout. Inverting the blend recovers
// `subject` instead, the same technique removeColorBackgroundFloodFill below
// already uses for its own (chroma-green) edges.
function unblendWhite(data, i, alphaFrac) {
  if (alphaFrac <= 0 || alphaFrac >= 1) return;
  for (let c = 0; c < 3; c++) {
    const subject = (data[i + c] - (1 - alphaFrac) * 255) / alphaFrac;
    data[i + c] = Math.max(0, Math.min(255, Math.round(subject)));
  }
}

// Many source sprites have a solid near-white "card" background baked in
// rather than true transparency. This keys near-white pixels to transparent,
// with a feather band between FEATHER_START and WHITE_THRESHOLD to avoid a
// hard cutout edge.
async function removeWhiteBackground(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const whiteness = Math.min(r, g, b);
    if (whiteness >= WHITE_THRESHOLD) {
      data[i + 3] = 0;
    } else if (whiteness > FEATHER_START) {
      const frac = (whiteness - FEATHER_START) / (WHITE_THRESHOLD - FEATHER_START);
      const alphaFrac = 1 - frac;
      unblendWhite(data, i, alphaFrac);
      data[i + 3] = Math.round(data[i + 3] * alphaFrac);
    }
  }

  return { data, info };
}

// Like removeWhiteBackground, but only keys near-white pixels that are
// reachable (4-connected) from the image's own border — i.e. the actual
// backdrop the subject was shot on. This matters for subjects that have
// their own white/near-white areas enclosed by non-white edges (e.g. a
// clock's white dial ringed by a wooden case): a global threshold would
// punch a hole through the dial too, whereas flood-filling from the
// border only ever reaches the backdrop.
//
// `stripEnclosedWhite`: also hard-cuts (no feather — see below) any
// remaining fully-saturated-white pixel even when it's NOT reachable from
// the border. Needed for animal walk-cycle poses where a limb curls back
// close enough to the body to seal off a pocket of the white studio
// backdrop between the legs — that pocket never touches the crop's edge,
// so the border flood fill above leaves it opaque. Unlike the clock-dial
// case, an animal studio photo has no legitimate enclosed pure-white
// subject area, so this is safe to enable for animal sprites but must stay
// off (the default) for ornaments. Deliberately skips the feather band
// (only hits pixels at/above WHITE_THRESHOLD) so it can't eat into an
// enclosed pale-but-not-white area like a toe or belly highlight.
async function removeWhiteBackgroundFloodFill(input, { stripEnclosedWhite = false } = {}) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const n = width * height;

  function whiteness(p) {
    const i = p * 4;
    return Math.min(data[i], data[i + 1], data[i + 2]);
  }

  const visited = new Uint8Array(n);
  const isBg = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qTail = 0;

  function tryEnqueue(p) {
    if (visited[p]) return;
    visited[p] = 1;
    if (whiteness(p) > FEATHER_START) {
      isBg[p] = 1;
      queue[qTail++] = p;
    }
  }

  for (let x = 0; x < width; x++) {
    tryEnqueue(x);
    tryEnqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    tryEnqueue(y * width);
    tryEnqueue(y * width + width - 1);
  }

  for (let qHead = 0; qHead < qTail; qHead++) {
    const p = queue[qHead];
    const x = p % width;
    const y = (p / width) | 0;
    if (x > 0) tryEnqueue(p - 1);
    if (x < width - 1) tryEnqueue(p + 1);
    if (y > 0) tryEnqueue(p - width);
    if (y < height - 1) tryEnqueue(p + width);
  }

  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (isBg[p]) {
      const w = whiteness(p);
      if (w >= WHITE_THRESHOLD) {
        data[i + 3] = 0;
      } else {
        const frac = (w - FEATHER_START) / (WHITE_THRESHOLD - FEATHER_START);
        const alphaFrac = 1 - frac;
        unblendWhite(data, i, alphaFrac);
        data[i + 3] = Math.round(data[i + 3] * alphaFrac);
      }
    } else if (stripEnclosedWhite && whiteness(p) >= WHITE_THRESHOLD) {
      data[i + 3] = 0;
    }
  }

  return { data, info };
}

// Standard chroma-key green — reliably distinct from most real-world
// subjects, and a well-understood instruction for an image-gen model
// ("solid chroma key green background") the way "plain white background" is
// for removeWhiteBackground — but unlike white, it won't collide with a
// subject that's itself white/light-colored (e.g. clouds).
const CHROMA_GREEN = [0, 255, 0];

// Like removeWhiteBackgroundFloodFill, but keys out any solid background
// color (not just white) that's reachable (4-connected) from the image's
// border. Needed for subjects whose own palette overlaps white — keying
// literal "white" on a white-clouds-on-white-background image would erase
// the clouds along with the backdrop. Distance is measured as the largest
// single-channel difference from the target color: pixels within
// `threshold` of it are fully removed, pixels out to `feather` fade out
// (recovering the true subject color via unblend() below, not just fading
// alpha — otherwise a soft/anti-aliased edge keeps a visible tint from the
// key color baked into its RGB), anything further is left untouched.
// `feather` defaults wide (220, close to the 0-255 ceiling) because a soft
// edge's blend can span a large chunk of that range — for CHROMA_GREEN
// specifically this is safe even at the extreme: white (the clouds' own
// color) sits at distance 255 (max(|255-0|,|255-255|,|255-0|)) since white
// and green share the same G channel, so it's never mistaken for an edge
// pixel no matter how wide feather gets, right up to 255.
async function removeColorBackgroundFloodFill(input, targetRgb, { threshold = 50, feather = 245 } = {}) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const n = width * height;
  const [tr, tg, tb] = targetRgb;

  function colorDistance(p) {
    const i = p * 4;
    return Math.max(Math.abs(data[i] - tr), Math.abs(data[i + 1] - tg), Math.abs(data[i + 2] - tb));
  }

  // A soft/anti-aliased edge pixel is an alpha-blend of the true subject
  // color and the key color: observed = alphaFrac*subject + (1-alphaFrac)*key.
  // Once we know alphaFrac (from the distance-based feathering below), this
  // inverts that blend to recover `subject` — e.g. a pixel that's 50% white
  // cloud over green key comes back as white, not the greenish/gray smear
  // a naive alpha-only cutout (or a crude per-channel clamp) would leave.
  function unblend(p, alphaFrac) {
    if (alphaFrac <= 0 || alphaFrac >= 1) return;
    const base = p * 4;
    const key = [tr, tg, tb];
    for (let c = 0; c < 3; c++) {
      const subject = (data[base + c] - (1 - alphaFrac) * key[c]) / alphaFrac;
      data[base + c] = Math.max(0, Math.min(255, Math.round(subject)));
    }
  }

  const visited = new Uint8Array(n);
  const isBg = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qTail = 0;

  function tryEnqueue(p) {
    if (visited[p]) return;
    visited[p] = 1;
    if (colorDistance(p) <= feather) {
      isBg[p] = 1;
      queue[qTail++] = p;
    }
  }

  for (let x = 0; x < width; x++) {
    tryEnqueue(x);
    tryEnqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    tryEnqueue(y * width);
    tryEnqueue(y * width + width - 1);
  }

  for (let qHead = 0; qHead < qTail; qHead++) {
    const p = queue[qHead];
    const x = p % width;
    const y = (p / width) | 0;
    if (x > 0) tryEnqueue(p - 1);
    if (x < width - 1) tryEnqueue(p + 1);
    if (y > 0) tryEnqueue(p - width);
    if (y < height - 1) tryEnqueue(p + width);
  }

  for (let p = 0; p < n; p++) {
    if (!isBg[p]) continue;
    const i = p * 4;
    const d = colorDistance(p);
    // 0 at/below threshold (pure key color, fully removed) ramping up to 1
    // at feather (edge of the keyed region, fully opaque/subject).
    const alphaFrac = Math.max(0, Math.min(1, (d - threshold) / (feather - threshold)));
    unblend(p, alphaFrac);
    data[i + 3] = Math.round(data[i + 3] * alphaFrac);
  }

  return { data, info };
}

module.exports = { removeWhiteBackground, removeWhiteBackgroundFloodFill, removeColorBackgroundFloodFill, CHROMA_GREEN };
