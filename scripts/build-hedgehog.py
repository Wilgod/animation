"""Build an articulated 3D hedgehog: a round body covered in brown spines with
cream tips, a pale furry face with a pointed snout and black nose, tiny ears
and short legs in a quick waddling trot. Run:
blender --background --python scripts/build-hedgehog.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from mammal import *

reset(43)
STRIDE, DUTY, FRAMES = .26, .6, 36
L, W, H = 1.9, .78, .5
legs, tail, head = build_mammal(dict(
    name='Hedgehog', length=L, width=W, height=H,
    fur=(.72, .6, .46), fur_dark=(.45, .34, .24), fur_light=(.88, .8, .66),
    skin=(.3, .22, .2), ear=(.55, .4, .36), ear_scale=(.04, .08, .08), head_width=.5,
    front=(.42, .52, .25), hind=(-.4, -.36, .75), side_offset=.5,
    front_len=(.22, .24), hind_len=(.24, .26),
    tail_len=.18, tail_segments=2, tail_r=(.05, .02), tail_rise=0, fur_count=200,
))
# Pointed snout and shiny black nose on the head pivot.
skin = mat('Hedgehog snout', (.74, .62, .5), .8)
nose = mat('Hedgehog nose', (.02, .015, .015), .15)
cone('Snout', (L * .16, 0, -H * .12), (L * .3, 0, -H * .16), .1, .04, skin, parent=head)
ellipsoid('Nose', (L * .3, 0, -H * .16), (.05, .055, .045), nose, parent=head)

# Spines: one mesh of thin four-sided spikes over the back dome (dark base),
# and a second mesh for their cream tips.
base_mat = mat('Hedgehog spine', (.24, .16, .1), .55)
tip_mat = mat('Hedgehog spine tip', (.92, .86, .74), .55)
center, radii = Vector((-L * .08, 0, H * 1.0)), Vector((L * .42, W * 1.0, H * 1.0))
bv, bf, tv, tf = [], [], [], []
for _ in range(1300):
    z = random.uniform(-.15, 1)
    a = random.random() * math.tau
    q = math.sqrt(1 - z * z)
    nrm = Vector((q * math.cos(a), q * math.sin(a), z))
    if nrm.x > .55:  # keep the face clear
        continue
    root = center + Vector((nrm.x * radii.x, nrm.y * radii.y, nrm.z * radii.z)) * .97
    dirn = (nrm * .55 + Vector((-1, 0, .15)) * .45).normalized()
    length = random.uniform(.15, .21)
    side = dirn.cross(Vector((0, 0, 1)))
    side = (side if side.length > .01 else Vector((0, 1, 0))).normalized()
    up = side.cross(dirn).normalized()
    mid = root + dirn * length * .7
    tip = root + dirn * length
    for verts, faces, a0, r0, a1 in ((bv, bf, root, .022, mid), (tv, tf, mid, .009, tip)):
        k = len(verts)
        verts += [a0 + side * r0, a0 + up * r0, a0 - side * r0, a0 - up * r0, a1]
        faces += [(k, k + 1, k + 4), (k + 1, k + 2, k + 4), (k + 2, k + 3, k + 4), (k + 3, k, k + 4)]
mesh_object('Spines', bv, bf, base_mat, smooth=False)
mesh_object('Spine tips', tv, tf, tip_mat, smooth=False)
animate_mammal(legs, tail, head, FRAMES, STRIDE, DUTY, .06, tail_amp=.05, head_amp=.07)
print('STRIDE_PX', stride_px(STRIDE, DUTY))
export('hedgehog', 'Walk', FRAMES)
