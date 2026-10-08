"""Build a 3D moon jellyfish: a translucent pulsing bell with four pink
horseshoe gonads showing through from above, frilly oral arms and a fringe
of fine marginal tentacles that stream back behind it (+X is the direction
of travel). Run: blender --background --python scripts/build-jellyfish.py

The soft body is baked as one shape key per sampled phase and cross-faded
so the glTF morph weights loop seamlessly (as for the stingray).
"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(61)
bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'
bell_mat = mat('Translucent bell', (.78, .87, 1), .15, alpha=.4)
gonad_mat = mat('Pink gonads', (1, .52, .74), .4, alpha=.75)
rim_mat = mat('Bell rim', (.86, .92, 1), .2, alpha=.6)
arm_mat = mat('Frilly oral arms', (.95, .62, .84), .3, alpha=.42)
tentacle_mat = mat('Fine tentacles', (.92, .9, 1), .3, alpha=.4)

R, H = .75, .42                  # bell radius and height at rest
NA, NT = 64, 16                  # bell samples around and outward
FRAMES, STEP = 90, 3             # 1.5 s per pulse, a shape key every 3 frames
N_TENT, TENT_LEN = 40, .75
SIDES = 6


def contraction(ph):
    """0 relaxed .. 1 squeezed: quick squeeze (35% of the cycle), slow relax."""
    u = (ph / math.tau) % 1
    if u < .35:
        return .5 - .5 * math.cos(math.pi * u / .35)
    return .5 + .5 * math.cos(math.pi * (u - .35) / .65)


def bell_point(a, t, outer, c):
    sc, hs = 1 - .14 * c, 1 + .22 * c
    rho = R * t * sc
    z = H * hs * math.sqrt(max(0, 1 - t * t)) ** .8
    z -= (.05 + .14 * c) * t ** 4  # rim curls down, more when squeezed
    if not outer:
        z -= .1 * (1 - t) + .012
    return (rho * math.cos(a), rho * math.sin(a), z)


angles = [i / NA * math.tau for i in range(NA)]
ts = [j / NT for j in range(1, NT + 1)]
COL = 2 * NT - 1


def bell_verts(c):
    verts = []
    for a in angles:
        verts += [bell_point(a, t, True, c) for t in ts]
        verts += [bell_point(a, t, False, c) for t in reversed(ts[:-1])]
    verts.append(bell_point(0, 0, True, c))
    verts.append(bell_point(0, 0, False, c))
    return verts


bell_faces = []
for i in range(NA):
    a, b = i * COL, ((i + 1) % NA) * COL
    bell_faces += [(a + j, a + j + 1, b + j + 1, b + j) for j in range(COL - 1)]
    bell_faces += [(NA * COL, a, b), (NA * COL + 1, b + COL - 1, a + COL - 1)]


def tube_mesh(paths, radii):
    """Several tubes in one mesh. Rings are oriented from a fixed side axis
    (no tube runs along Y) so vertices line up between shape keys."""
    verts, faces = [], []
    for pts in paths:
        base = len(verts)
        pts = [Vector(p) for p in pts]
        for i, p in enumerate(pts):
            d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            n = Vector((0, 1, 0))
            n = (n - d * n.dot(d)).normalized()
            bn = d.cross(n)
            r = radii[i] if isinstance(radii, (list, tuple)) else radii
            for j in range(SIDES):
                ang = j / SIDES * math.tau
                verts.append(tuple(p + (n * math.cos(ang) + bn * math.sin(ang)) * r))
        for i in range(len(pts) - 1):
            for j in range(SIDES):
                faces.append((base + i * SIDES + j, base + i * SIDES + (j + 1) % SIDES,
                              base + (i + 1) * SIDES + (j + 1) % SIDES, base + (i + 1) * SIDES + j))
        faces.append(tuple(base + j for j in reversed(range(SIDES))))
        last = base + (len(pts) - 1) * SIDES
        faces.append(tuple(last + j for j in range(SIDES)))
    return verts, faces


TENT_VARY = [.75 + .4 * random.random() for _ in range(N_TENT)]  # uneven lengths
TENT_SEED = [random.random() * math.tau for _ in range(N_TENT)]


def tentacle_paths(ph):
    c = contraction(ph)
    paths = []
    for k in range(N_TENT):
        a = (k + .5) / N_TENT * math.tau
        root = Vector(bell_point(a, 1, True, c)) + Vector((0, 0, -.01))
        out = Vector((math.cos(a), math.sin(a), 0))
        pts = []
        for s in range(9):
            u = s / 8
            ln = TENT_LEN * TENT_VARY[k]
            back = ln * u * (.55 + .2 * c)
            wave = .09 * u * math.sin(ph * 2 - 6 * u + TENT_SEED[k])
            p = root + Vector((-back, wave, -ln * u * .7)) + out * (.08 * u * (1 - .6 * c))
            pts.append(p)
        paths.append(pts)
    return paths


def arm_paths(ph):
    c = contraction(ph)
    paths = []
    for k in range(4):
        a = (k + .5) / 4 * math.tau
        side = math.sin(a)
        pts = []
        for s in range(14):
            u = s / 13
            sway = .08 * u * math.sin(ph - 4 * u + k * 1.7) + .025 * math.sin(14 * u + ph * 2 + k)  # frills
            pts.append((.08 * math.cos(a) * (1 - u) - 1.2 * u * (.8 + .15 * c),
                        .1 * side + side * .3 * u + sway,
                        -.06 - .45 * u - .03 * math.sin(9 * u + ph * 2 + k)))
        paths.append(pts)
    return paths


ARM_R = [.04 * (1 - .6 * s / 13) * (1 + .35 * math.sin(s * 1.9)) for s in range(14)]


def gonad_paths(ph):
    c = contraction(ph)
    sc, hs = 1 - .14 * c, 1 + .22 * c
    paths = []
    for k in range(4):
        a = (k + .5) / 4 * math.tau
        cx, cy = .27 * sc * math.cos(a), .27 * sc * math.sin(a)
        pts = []
        for s in range(15):
            # 290-degree horseshoe, open towards the bell centre, slightly squashed
            b = a + math.pi + math.radians(35) + s / 14 * math.radians(290)
            rr = .11 * sc * (1 + .12 * math.sin(2 * b))
            pts.append((cx + rr * math.cos(b), cy + rr * math.sin(b), H * hs * .72))
        paths.append(pts)
    return paths


parts = []
bell = mesh_object('Bell', bell_verts(0), bell_faces, bell_mat)
parts.append((bell, lambda ph: bell_verts(contraction(ph))))
def rim_paths(ph):
    c = contraction(ph)
    return [[bell_point(i / 48 * math.tau, .995, True, c) for i in range(49)]]


for name, fn, radii, material in (('Gonads', gonad_paths, .042, gonad_mat), ('Rim', rim_paths, .014, rim_mat), ('Oral arms', arm_paths, ARM_R, arm_mat),
                                  ('Tentacles', tentacle_paths, [.009 * (1 - .6 * s / 8) for s in range(9)], tentacle_mat)):
    v, f = tube_mesh(fn(0), radii)
    obj = mesh_object(name, v, f, material)
    parts.append((obj, lambda ph, fn=fn, radii=radii: tube_mesh(fn(ph), radii)[0]))

KEYS = FRAMES // STEP
for obj, fn in parts:
    obj.shape_key_add(name='Basis', from_mix=False)
    for k in range(KEYS):
        sk = obj.shape_key_add(name=f'pulse{k:02d}', from_mix=False)
        for d, co in zip(sk.data, fn(k / KEYS * math.tau)):
            d.co = co
        for f in [k * STEP] + ([FRAMES] if k == 0 else []):
            for ff, val in ((f - STEP, 0.0), (f, 1.0), (f + STEP, 0.0)):
                if 0 <= ff <= FRAMES:
                    sk.value = val
                    sk.keyframe_insert(data_path='value', frame=ff)
export('jellyfish', 'Swim', FRAMES)
