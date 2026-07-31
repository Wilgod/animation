const sharp = require("sharp");

const WHITE_THRESHOLD = 232;
const FEATHER_START = 195;

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
      data[i + 3] = Math.round(data[i + 3] * (1 - frac));
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
async function removeWhiteBackgroundFloodFill(input) {
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
    if (!isBg[p]) continue;
    const i = p * 4;
    const w = whiteness(p);
    if (w >= WHITE_THRESHOLD) {
      data[i + 3] = 0;
    } else {
      const frac = (w - FEATHER_START) / (WHITE_THRESHOLD - FEATHER_START);
      data[i + 3] = Math.round(data[i + 3] * (1 - frac));
    }
  }

  return { data, info };
}

module.exports = { removeWhiteBackground, removeWhiteBackgroundFloodFill };
