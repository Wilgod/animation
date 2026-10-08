"""Build a 3D yellow seahorse facing +X: an upright ringed S-shaped body,
tubular snout and coronet, a curled prehensile tail, a fast-fluttering
dorsal fin and small pectoral fins. It bobs gently while the tail curl
breathes in and out. Rendered with the angled view so its profile reads.
Run: blender --background --python scripts/build-seahorse.py

The bending body and fluttering fins are baked as one shape key per sampled
phase and cross-faded (as for the stingray); the bob is on a root empty.
"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(89)
bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'


def ring_texture(w=512, h=64, rings=34):
    """u runs crown to tail tip: bony body rings over mottled yellow."""
    u = np.arange(w) / w
    ridge = (np.abs((u * rings) % 1 - .5) * 2) ** 6  # thin dark line between rings
    shade = fractal(w)[:h] * .25 + .85
    rgb = np.array((.98, .72, .14)) * shade[..., None] * (1 - .45 * ridge)[None, :, None]
    yy, xx = np.mgrid[0:h, 0:w]
    for _ in range(60):  # small soft pale speckles
        cx, cy = np.random.randint(w), np.random.randint(h)
        m = np.clip(1 - ((xx - cx) ** 2 / 4 + (yy - cy) ** 2 / 1.5) / 2, 0, 1)[..., None]
        rgb = rgb * (1 - .7 * m) + np.array((1, .93, .7)) * .7 * m
    img = bpy.data.images.new('Seahorse rings', width=w, height=h)
    img.pixels.foreach_set(np.concatenate([rgb, np.ones((h, w, 1))], axis=2).astype(np.float32).ravel())
    img.pack()
    return img


skin = mat('Yellow ringed skin', (.98, .72, .14), .45, image=ring_texture())
snout_mat = mat('Snout', (.95, .66, .12), .45)
fin = mat('Translucent fin', (1, .86, .5), .3, alpha=.4)
eye = mat('Eye', (.25, .16, .05), .2)
pupil = mat('Pupil', (.01, .01, .01), .05)

FRAMES, STEP = 120, 3  # 2 s per bob, a shape key every 3 frames
SIDES = 14

# Body centreline (x, z) from crown to tail tip, with radii.
SPINE = [(0, 1.55, .1), (-.14, 1.36, .1), (-.12, 1.1, .12), (.04, .86, .17), (.12, .56, .2), (.03, .26, .17),
         (-.12, 0, .12), (-.2, -.3, .085), (-.15, -.55, .065), (0, -.7, .05), (.15, -.63, .04), (.18, -.46, .032),
         (.07, -.38, .024), (0, -.47, .016), (.03, -.53, .008)]


def catmull(points, per=5):
    out = []
    pts = [points[0]] + points + [points[-1]]
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = (np.array(p) for p in pts[i - 1:i + 3])
        for k in range(per):
            t = k / per
            out.append(tuple(.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
                                   (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)))
    out.append(tuple(points[-1]))
    return out


def body_points(ph):
    """Centreline with the tail curl tightening and relaxing."""
    pts = []
    pivot_x, pivot_z = SPINE[6][0], SPINE[6][1]  # tail root
    for i, (x, z, r) in enumerate(SPINE):
        if i > 6:
            a = .12 * math.sin(ph) * (i - 6) / (len(SPINE) - 7)
            dx, dz = x - pivot_x, z - pivot_z
            x, z = pivot_x + dx * math.cos(a) - dz * math.sin(a), pivot_z + dx * math.sin(a) + dz * math.cos(a)
        pts.append((x, z, r))
    return catmull(pts)


def body_mesh(ph):
    pts = body_points(ph)
    verts, uvs = [], []
    for i, (x, z, r) in enumerate(pts):
        a = pts[max(i - 1, 0)]; b = pts[min(i + 1, len(pts) - 1)]
        d = Vector((b[0] - a[0], 0, b[1] - a[1])).normalized()
        n = Vector((0, 1, 0))
        bn = d.cross(n)
        for j in range(SIDES):
            t = j / SIDES * math.tau
            # Slightly flattened sideways, like the real deep, narrow body.
            verts.append(tuple(Vector((x, 0, z)) + n * math.cos(t) * r * .8 + bn * math.sin(t) * r))
            uvs.append((i / (len(pts) - 1), j / SIDES))
    return verts, uvs, len(pts)


def ridge_fan(ph):
    """Dorsal fin on the lower back: rays from the body with a fast ripple
    running along the fin edge (seahorses fan it dozens of times a second)."""
    base, tip = [], []
    for k in range(9):
        u = k / 8
        x, z = -.13 + .05 * u, .5 - .34 * u
        ripple = .035 * math.sin(ph * 6 - u * 5)
        base.append((x - .02, 0, z))
        tip.append((x - .03 - .13 * math.sin(math.pi * (.15 + .7 * u)) ** .6, ripple, z - .02))
    verts = base + tip
    return verts


def pectoral(ph, s):
    root = Vector((-.04, s * .09, 1.28))
    verts = [tuple(root)]
    for k in range(6):
        a = k / 5 * math.pi * .9
        flick = .04 * math.sin(ph * 6 + k * .8)
        verts.append(tuple(root + Vector((-.13 * math.sin(a) - .02, s * (.03 + flick), .1 * math.cos(a) - .04))))
    return verts


root = pivot('Bob', (0, 0, 0))
v, uvs, rings = body_mesh(0)
faces = [(i * SIDES + j, i * SIDES + (j + 1) % SIDES, (i + 1) * SIDES + (j + 1) % SIDES, (i + 1) * SIDES + j)
         for i in range(rings - 1) for j in range(SIDES)]
faces += [tuple(reversed(range(SIDES))), tuple(range((rings - 1) * SIDES, rings * SIDES))]
body = mesh_object('Body', v, faces, skin, root, uvs=uvs)

dorsal = mesh_object('Dorsal fin', ridge_fan(0), [(k, k + 1, 10 + k, 9 + k) for k in range(8)], fin, root, smooth=False)
pecs = []
for s in (-1, 1):
    pecs.append((s, mesh_object('Pectoral fin', pectoral(0, s), [(0, k, k + 1) for k in range(1, 6)], fin, root,
                                smooth=False)))

# Head: bulb, long tubular snout, coronet and spiny brow, held at a right
# angle to the neck.
ellipsoid('Head', (.08, 0, 1.44), (.17, .1, .13), skin, root)
tube('Snout', [(.18, 0, 1.42), (.38, 0, 1.37), (.55, 0, 1.33)], [.07, .045, .05], snout_mat, root, sides=12)
cone('Coronet', (.0, 0, 1.6), (-.03, 0, 1.74), .06, .025, skin, root, sides=8)
for s in (-1, 1):
    ellipsoid('Eye', (.12, s * .085, 1.48), (.045, .03, .045), eye, root)
    ellipsoid('Pupil', (.135, s * .108, 1.485), (.022, .012, .022), pupil, root)
    cone('Brow spine', (.07, s * .07, 1.53), (.05, s * .1, 1.6), .015, .003, skin, root, sides=6)
for i in range(4):  # small spines along the back of the neck
    z = 1.32 - i * .1
    cone('Neck spine', (-.13 + i * .02, 0, z), (-.2 + i * .02, 0, z + .02), .018, .003, skin, root, sides=6)

# The app frames a model by its footprint (length x width); widen it so the
# tall body fits the angled view's render square.
framing_guide([(1.0, .9, 0), (-1.0, -.9, 0)])

KEYS = FRAMES // STEP
for obj, fn in [(body, lambda ph: body_mesh(ph)[0]), (dorsal, ridge_fan)] + \
               [(o, lambda ph, s=s: pectoral(ph, s)) for s, o in pecs]:
    obj.shape_key_add(name='Basis', from_mix=False)
    for k in range(KEYS):
        sk = obj.shape_key_add(name=f'bob{k:02d}', from_mix=False)
        for d, co in zip(sk.data, fn(k / KEYS * math.tau)):
            d.co = co
        for f in [k * STEP] + ([FRAMES] if k == 0 else []):
            for ff, val in ((f - STEP, 0.0), (f, 1.0), (f + STEP, 0.0)):
                if 0 <= ff <= FRAMES:
                    sk.value = val
                    sk.keyframe_insert(data_path='value', frame=ff)
for frame in range(FRAMES + 1):
    ph = frame / FRAMES * math.tau
    key_loc(root, frame, (0, 0, .05 * math.sin(ph)))
    key_rot(root, frame, (0, .05 * math.sin(ph + 1), 0))
export('seahorse', 'Swim', FRAMES)
