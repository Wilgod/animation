"""Build a 3D purple sea urchin: a slightly flattened shell bristling with
long spines that sway in a slow rolling wave as it creeps over the seabed
on its (hidden) tube feet. Run:
blender --background --python scripts/build-sea-urchin.py

Only the spine tips move, baked as one shape key per sampled phase and
cross-faded so the glTF morph weights loop seamlessly (as for the sea star).
"""
import sys, math, random
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(71)
bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'
shell_tex = texture('Urchin shell', (.3, .1, .3), (.16, .04, .16), (.5, .22, .45), size=256, contrast=.35,
                    spots=((.62, .38, .58), 140, .006, .012))
shell = mat('Purple shell', (.3, .1, .3), .5, image=shell_tex)
spine_dark = mat('Dark violet spines', (.16, .04, .2), .35)
spine_light = mat('Violet spines', (.36, .13, .42), .35)
mouth = mat('Periproct', (.52, .3, .36), .6)

R, H = .5, .34                   # shell radius and half height
N_SPINES, SIDES = 260, 5
FRAMES, STEP = 60, 3             # one creep cycle, a shape key every 3 frames
SWAY = .22                       # tip swing, as a fraction of spine length

ellipsoid('Shell', (0, 0, 0), (R, R, H), shell)
ellipsoid('Periproct', (0, 0, H - .01), (.06, .06, .02), mouth)

# Spines on a jittered Fibonacci sphere, skipping the flat underside where
# the urchin rests on its tube feet.
spines = []
golden = math.pi * (3 - math.sqrt(5))
k = 0
while len(spines) < N_SPINES:
    z = 1 - (k + .5) / (N_SPINES * 1.5) * 2  # ~2/3 of the sphere is kept
    k += 1
    if z < -.35:
        continue
    q = math.sqrt(1 - z * z)
    az = k * golden + random.uniform(-.08, .08)
    n = Vector((q * math.cos(az), q * math.sin(az), z))
    base = Vector((R * n.x, R * n.y, H * n.z)) * .96
    normal = Vector((n.x / R, n.y / R, n.z / H)).normalized()
    length = random.uniform(.5, .72) * (1 - .25 * max(0, z) ** 2)  # shorter around the crown
    spines.append((base, normal, length, az, math.asin(z), random.random() * math.tau))


def tip(spine, ph):
    base, normal, length, az, el, seed = spine
    side = Vector((-math.sin(az), math.cos(az), 0))  # around the body
    up = normal.cross(side).normalized()             # towards the poles
    wave = ph + 2 * az + 3 * el                      # rolling wave around the shell
    lean = side * math.sin(wave) + up * .6 * math.cos(wave + seed)
    d = (normal + lean * SWAY).normalized()
    return base + d * length


def spine_mesh(group, ph):
    verts, faces = [], []
    for spine in group:
        base, normal = spine[0], spine[1]
        ref = Vector((0, 0, 1)) if abs(normal.z) < .9 else Vector((1, 0, 0))
        a = normal.cross(ref).normalized()
        b = normal.cross(a)
        o = len(verts)
        for j in range(SIDES):
            t = j / SIDES * math.tau
            verts.append(tuple(base + (a * math.cos(t) + b * math.sin(t)) * .022))
        verts.append(tuple(tip(spine, ph)))
        faces += [(o + j, o + (j + 1) % SIDES, o + SIDES) for j in range(SIDES)]
        faces.append(tuple(o + j for j in reversed(range(SIDES))))
    return verts, faces


groups = [(spines[0::2], spine_dark), (spines[1::2], spine_light)]
KEYS = FRAMES // STEP
for i, (group, material) in enumerate(groups):
    v, f = spine_mesh(group, 0)
    obj = mesh_object(f'Spines {i}', v, f, material)
    obj.shape_key_add(name='Basis', from_mix=False)
    for key in range(KEYS):
        sk = obj.shape_key_add(name=f'sway{key:02d}', from_mix=False)
        for d, co in zip(sk.data, spine_mesh(group, key / KEYS * math.tau)[0]):
            d.co = co
        for fr in [key * STEP] + ([FRAMES] if key == 0 else []):
            for ff, val in ((fr - STEP, 0.0), (fr, 1.0), (fr + STEP, 0.0)):
                if 0 <= ff <= FRAMES:
                    sk.value = val
                    sk.keyframe_insert(data_path='value', frame=ff)
export('sea-urchin', 'Walk', FRAMES)
