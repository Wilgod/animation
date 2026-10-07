// One-off script: cuts each lizard variant's assets/_animals/<id>/animal.png
// (a flattened top-down photo, already background-removed) into separate rig
// layers — body + 4 legs — for the layered cutout walk-rig. Not part of the
// regular prepare-assets.js build; run manually once per source photo.
//
// Approach: each leg is a hand-traced polygon (drawn in
// scripts/rig-polygon-cutter.html against this exact source image, so the
// coordinates below are in its native pixel space) rather than a bounding
// rectangle — a rectangle's straight edge cuts across the torso's curved
// silhouette and leaves a visible rectangular notch; a polygon traced along
// the real leg/torso seam doesn't. The photo's background is already
// transparent outside the creature's silhouette, and legs are external
// appendages hanging off the torso rather than overlapping it, so masking by
// polygon needs no inpainting: `dest-in` keeps only the polygon's content
// (the leg), `dest-out` erases it (the body).
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");

// "front"/"back" = near the head (x~600-770) vs near the tail (x~320-480);
// "left"/"right" = which side of the body's long axis (top vs bottom of the
// image in this sprawled top-down pose). Traced by hand — see
// scripts/rig-polygon-cutter.html.
const ANIMALS = {
  // Re-traced at the higher resolution of a manually re-cut, shadow-free
  // source photo (assets/_animals/yellow/animal.png replaced 2026-08 with a
  // cleaner 3058x1376 cutout) — coordinates below are scaled from an
  // 840x379 trace (rig-polygon-cutter.html's embedded reference image for
  // "yellow") by that image's own metadata, not hand-retraced at full res,
  // since the two crops are pixel-aligned. This second pass traces each
  // toe individually (vs. the first pass's broad per-leg notch) so the
  // polygon boundary sits right against the leg's actual silhouette —
  // less reliant on the dilate-stroke overlap margin (see cutAnimal below)
  // to hide the seam once the rig rotates the leg during a walk cycle.
  yellow: {
    "front-left-leg": [
      [2319, 516], [2275, 425], [2399, 294], [2323, 196], [2472, 102],
      [2610, 185], [2665, 298], [2592, 418], [2486, 396], [2435, 454], [2450, 530],
    ],
    "front-right-leg": [
      [2301, 886], [2253, 1006], [2334, 1125], [2250, 1234], [2399, 1314],
      [2570, 1271], [2596, 1122], [2516, 995], [2472, 988], [2435, 1027], [2392, 973], [2450, 879],
    ],
    "back-left-leg": [
      [1682, 537], [1747, 363], [1737, 309], [1649, 254], [1602, 4],
      [1271, 4], [1321, 388], [1449, 301], [1565, 370], [1463, 574],
    ],
    "back-right-leg": [
      [1453, 828], [1562, 1013], [1474, 1042], [1351, 1002], [1307, 1009],
      [1296, 1285], [1427, 1372], [1602, 1365], [1682, 1169], [1613, 1147], [1696, 1100], [1787, 1042], [1693, 850],
    ],
  },
  green: {
    "front-left-leg": [
      [604, 151], [681, 159], [713, 149], [751, 148], [768, 153], [772, 3], [601, 0],
    ],
    "front-right-leg": [
      [601, 251], [601, 383], [653, 387], [767, 375], [770, 253], [731, 264], [686, 247],
    ],
    "back-left-leg": [
      [482, 142], [480, 1], [318, 0], [320, 154], [378, 168], [440, 160],
    ],
    "back-right-leg": [
      [320, 235], [319, 379], [378, 397], [479, 378], [482, 259], [437, 247], [418, 238], [380, 236],
    ],
  },
  red: {
    "front-left-leg": [
      [603, 150], [672, 157], [686, 158], [714, 146], [753, 143], [767, 146], [772, 3], [601, 0],
    ],
    "front-right-leg": [
      [600, 252], [599, 374], [646, 378], [769, 375], [772, 247], [772, 248],
      [743, 254], [712, 253], [678, 242], [671, 242], [625, 249],
    ],
    "back-left-leg": [
      [480, 140], [478, 2], [320, 0], [320, 152], [369, 167], [428, 162],
    ],
    "back-right-leg": [
      [320, 228], [322, 394], [364, 396], [480, 378], [478, 259],
      [428, 242], [419, 234], [374, 237], [340, 228],
    ],
  },
};

function polygonPoints(points) {
  return points.map((p) => p.join(",")).join(" ");
}

async function cutAnimal(id, legs) {
  const src = path.join(ROOT, "assets", "_animals", id, "animal.png");
  const outDir = path.join(ROOT, "image", "animal", `${id}-lizard-rig`);
  fs.mkdirSync(outDir, { recursive: true });

  const meta = await sharp(src).metadata();
  const { width, height } = meta;

  const erasePolygons = Object.values(legs)
    .map((pts) => `<polygon points="${polygonPoints(pts)}" fill="white"/>`)
    .join("");
  const eraseMask = Buffer.from(`<svg width="${width}" height="${height}">${erasePolygons}</svg>`);
  await sharp(src)
    .composite([{ input: eraseMask, blend: "dest-out" }])
    .png()
    .toFile(path.join(outDir, "body.png"));
  console.log(`  ${id}/body.png`);

  // The leg's own kept region is cut a bit *larger* than the hole punched
  // out of the body (fill + a stroke, which — since the stroke straddles the
  // polygon's edge — dilates the visible shape outward by ~strokeWidth/2).
  // A single rigid pivot rotating a piece whose seam exactly matches the
  // body only looks seamless at the exact angle it was cut at; any swing
  // away from that necessarily opens a gap where the two once-touching
  // edges separate. The overlap margin is slack against that: since the leg
  // draws in front of the body, the extra material just sits invisibly over
  // matching body pixels at rest, and still covers the seam through a range
  // of rotation before a gap becomes visible.
  const dilateStroke = Math.round(width * 0.035);
  for (const [name, pts] of Object.entries(legs)) {
    const keepMask = Buffer.from(
      `<svg width="${width}" height="${height}"><polygon points="${polygonPoints(pts)}" fill="white" stroke="white" stroke-width="${dilateStroke}" stroke-linejoin="round"/></svg>`
    );
    await sharp(src)
      .composite([{ input: keepMask, blend: "dest-in" }])
      .png()
      .toFile(path.join(outDir, `${name}.png`));
    console.log(`  ${id}/${name}.png`);
  }
}

async function main() {
  for (const [id, legs] of Object.entries(ANIMALS)) {
    await cutAnimal(id, legs);
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
