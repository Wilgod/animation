"""Build a 3D group of tadpoles facing +X: eight round, dark speckled bodies
with long wriggling tails, each on its own skinned four-bone spine, beating at
its own pace and drifting a little within the group. Run:
blender --background --python scripts/build-tadpoles.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(59)
FRAMES = 120  # 2 s loop; every tail beat and drift repeats within it
COUNT = 8
SECTIONS = [(.34, .2, .01, .01), (.3, .2, .12, .1), (.18, .2, .18, .14), (.02, .2, .17, .13), (-.1, .2, .1, .09),
            (-.25, .2, .06, .08), (-.45, .2, .045, .07), (-.65, .2, .03, .05), (-.8, .2, .008, .01)]
BONES = [.34, .0, -.25, -.5, -.8]

skin = mat('Tadpole skin', (.12, .1, .07), .3,
           image=texture('Tadpole speckles', (.14, .12, .08), (.06, .05, .03), (.24, .2, .12), contrast=.3,
                         spots=((.55, .48, .25), 60, .008, .018)))
eye = mat('Tadpole eye', (.7, .62, .3), .15)
pupil = mat('Pupil', (.01, .01, .01), .05)


def place_group():
    """Loose oval of tadpole positions with no two overlapping."""
    spots = []
    tries = 0
    while len(spots) < COUNT and tries < 20000:
        tries += 1
        a = random.uniform(0, math.tau)
        r = math.sqrt(random.random())
        x, y = 1.5 * r * math.cos(a), 1.0 * r * math.sin(a)
        if all(((x - px) / 1.3) ** 2 + ((y - py) / .45) ** 2 > 1 for px, py in spots):
            spots.append((x, y))
    return spots


def build_tadpole(i, x, y):
    body, rig = skinned_loft(f'Tadpole {i}', SECTIONS, skin, BONES, sides=16)
    rig.name = f'Tadpole {i} rig'
    bones = [b.name for b in rig.data.bones]
    for s in (-1, 1):
        attach_to_bone(ellipsoid('Eye', (.24, s * .1, .28), (.035, .03, .035), eye, segments=12, rings=8), rig, bones[0])
        attach_to_bone(ellipsoid('Pupil', (.25, s * .115, .29), (.02, .016, .02), pupil, segments=10, rings=6),
                       rig, bones[0])
    scale = random.uniform(.85, 1.15)
    rig.scale = (scale, scale, scale)
    rig.rotation_euler = (0, 0, random.uniform(-.25, .25))
    z = random.uniform(-.05, .05)

    beats = random.choice((6, 8, 10))  # quick wriggles per 2 s loop
    phase = random.uniform(0, math.tau)
    drift_phase = random.uniform(0, math.tau)
    dx, dy = random.uniform(.05, .12), random.uniform(.04, .09)
    for frame in range(FRAMES + 1):
        f = frame / FRAMES
        ph = f * math.tau * beats + phase
        for j, (name, amp) in enumerate(zip(bones, (.08, .25, .4, .5))):
            key_bone(rig, name, frame, (0, 0, amp * math.sin(ph - j * 1.3)))
        d = f * math.tau + drift_phase
        key_loc(rig, frame, (x + dx * math.sin(d), y + dy * math.sin(d * 2 + 1), z))


bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'
spots = place_group()
for i, (x, y) in enumerate(spots):
    build_tadpole(i, x, y)
# Drift and tail swings can carry edge tadpoles past their first-frame spot.
framing_guide([(2.4, 1.35, .2), (-2.4, -1.35, .2)])
export('tadpoles', 'Swim', FRAMES)
print(f'TADPOLE_COUNT={len(spots)}')
