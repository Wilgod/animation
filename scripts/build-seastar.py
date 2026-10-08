"""Build a 3D orange sea star (starfish): a five-armed body with a bumpy
spotted back that creeps over the seabed, each arm in turn curling its tip
up and sweeping sideways so a slow wave travels around the star. Run:
blender --background --python scripts/build-seastar.py

Like the stingray, the soft-bodied motion is baked as one shape key per
sampled phase and cross-faded so the glTF morph weights loop seamlessly.
"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(53)
bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'
top_tex = texture('Sea star back', (.86, .34, .1), (.62, .18, .05), (.95, .5, .2), size=512, contrast=.3,
                  spots=((1, .78, .5), 320, .004, .009))
skin = mat('Orange bumpy back', (.86, .34, .1), .6, image=top_tex)
belly = mat('Pale orange underside', (.96, .7, .45), .7)
plate = mat('Madreporite', (1, .82, .55), .5)

ARMS, CORE, TIP = 5, .3, 1.0     # arm count, inner radius, arm tip radius (units)
NPHI, NR = 120, 16               # samples around and outward
FRAMES, STEP = 60, 3             # one creep cycle, a shape key every 3 frames
LIFT, SWAY, HEIGHT = .14, .12, .24


def outline(phi):
    """Star edge radius: full at each arm's centre line, CORE between arms,
    with a rounded tip."""
    c = (1 + math.cos(ARMS * phi)) / 2
    return CORE + (TIP - CORE) * c ** 1.5


def star_point(phi, t, top, ph, amount):
    r = outline(phi) * t
    reach = (r / TIP) ** 2
    h = HEIGHT * max(0, 1 - t * t) ** .5 * (1 - .55 * r / TIP)
    z = h if top else -.25 * h
    wave = ph + phi  # each arm a fifth of a cycle behind the one before
    z += amount * LIFT * reach * (.5 + .5 * math.sin(wave))
    a = phi + amount * SWAY * reach * math.sin(wave + math.pi / 2)
    return (r * math.cos(a), r * math.sin(a), z)


phis = [i / NPHI * math.tau for i in range(NPHI)]
ts = [j / NR for j in range(1, NR + 1)]
COL = 2 * NR - 1  # top t1..edge, then bottom back towards the centre


def star_verts(ph, amount=1.0):
    verts = []
    for phi in phis:
        verts += [star_point(phi, t, True, ph, amount) for t in ts]
        verts += [star_point(phi, t, False, ph, amount) for t in reversed(ts[:-1])]
    verts.append((0, 0, HEIGHT))
    verts.append((0, 0, -.25 * HEIGHT))
    return verts


faces, top_faces = [], set()
for i in range(NPHI):
    a, b = i * COL, ((i + 1) % NPHI) * COL
    for j in range(COL - 1):
        if j < NR - 1:
            top_faces.add(len(faces))
        faces.append((a + j, a + j + 1, b + j + 1, b + j))
top_c, bot_c = NPHI * COL, NPHI * COL + 1
for i in range(NPHI):
    a, b = i * COL, ((i + 1) % NPHI) * COL
    top_faces.add(len(faces))
    faces.append((top_c, a, b))
    faces.append((bot_c, b + COL - 1, a + COL - 1))
rest = star_verts(0, amount=0)
uvs = [(x / 2.4 + .5, y / 2.4 + .5) for x, y, _ in rest]  # planar from above
body = mesh_object('Sea star', rest, faces, skin, uvs=uvs)
body.data.materials.append(belly)
for k, poly in enumerate(body.data.polygons):
    poly.material_index = 0 if k in top_faces else 1

# Madreporite: the small pale sieve plate just off-centre on the stiff disc.
ellipsoid('Madreporite', (-.1, .07, HEIGHT - .005), (.045, .045, .015), plate)

KEYS = FRAMES // STEP
body.shape_key_add(name='Basis', from_mix=False)
for k in range(KEYS):
    sk = body.shape_key_add(name=f'creep{k:02d}', from_mix=False)
    for d, co in zip(sk.data, star_verts(k / KEYS * math.tau)):
        d.co = co
    for f in [k * STEP] + ([FRAMES] if k == 0 else []):
        for ff, val in ((f - STEP, 0.0), (f, 1.0), (f + STEP, 0.0)):
            if 0 <= ff <= FRAMES:
                sk.value = val
                sk.keyframe_insert(data_path='value', frame=ff)
export('seastar', 'Walk', FRAMES)
