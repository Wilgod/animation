"""Build a 3D school of small fish facing +X: about twenty slim silvery
sardine-like fish (blue-green backs, silver bellies, forked tails) packed
in a loose oval, all heading the same way. Each fish has its own skinned
three-bone spine and beats its tail at its own phase and pace, while
drifting slightly within the school, so the group shimmers instead of
moving in lockstep. Run:
blender --background --python scripts/build-fish-school.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(307)
FRAMES = 120  # 2 s loop; every fish's tail beat and drift repeat within it
COUNT = 20
SECTIONS = [(.5, .2, .01, .01), (.44, .2, .05, .06), (.3, .2, .085, .1), (.08, .2, .095, .11),
            (-.15, .2, .075, .085), (-.33, .2, .04, .05), (-.43, .2, .018, .03)]
BONES = [.5, .1, -.2, -.45]


def sardine_texture(w=256, h=64):
    """u runs nose to tail, v around the body (v < .5 is the upper half):
    blue-green back, a thin bright lateral stripe and a silver belly, with
    a row of faint dark spots along the shoulder."""
    v = (np.arange(h) + .5) / h
    up = np.sin(v * math.tau)[:, None, None]
    back = np.array((.24, .5, .6))
    silver = np.array((.86, .9, .93))
    blend = np.clip(up * 2.5 - .2, 0, 1)
    rgb = back * blend + silver * (1 - blend)
    stripe = np.exp(-((up - .15) / .07) ** 2)
    rgb = rgb + stripe * .3
    rgb = rgb * (fractal(w)[:h, :, None] * .1 + .95)
    u = (np.arange(w) + .5) / w
    for cu in (.3, .37, .44):
        spot = np.exp(-((u - cu) / .012) ** 2)[None, :, None] * np.exp(-((up - .55) / .12) ** 2)
        rgb = rgb * (1 - .5 * spot)
    img = bpy.data.images.new('Sardine skin', width=w, height=h)
    img.pixels.foreach_set(np.concatenate([np.clip(rgb, 0, 1), np.ones((h, w, 1))], axis=2).astype(np.float32).ravel())
    img.pack()
    return img


skin = mat('Sardine skin', (.5, .62, .7), .25, image=sardine_texture(), metal=.25)
fin = mat('Clear fin', (.62, .72, .78), .3, alpha=.55)
eye = mat('Silver eye', (.82, .84, .82), .15, metal=.4)
pupil = mat('Pupil', (.01, .01, .01), .05)


def place_school():
    """Loose oval of fish positions with no two overlapping (fish are long
    and thin, so spacing is measured in a stretched metric)."""
    spots = []
    tries = 0
    while len(spots) < COUNT and tries < 20000:
        tries += 1
        a = random.uniform(0, math.tau)
        r = math.sqrt(random.random())
        x, y = 1.9 * r * math.cos(a), 1.05 * r * math.sin(a)
        if all(((x - px) / 1.05) ** 2 + ((y - py) / .3) ** 2 > 1 for px, py in spots):
            spots.append((x, y))
    return spots


def build_fish(i, x, y):
    body, rig = skinned_loft(f'Fish {i}', SECTIONS, skin, BONES, sides=16)
    rig.name = f'Fish {i} rig'
    bones = [b.name for b in rig.data.bones]
    for s in (-1, 1):
        attach_to_bone(ellipsoid('Eye', (.37, s * .055, .23), (.03, .012, .03), eye, segments=12, rings=8), rig, bones[0])
        attach_to_bone(ellipsoid('Pupil', (.38, s * .062, .23), (.016, .006, .016), pupil, segments=10, rings=6),
                       rig, bones[0])
    # Forked tail, small dorsal fin and a pair of pectoral fins.
    attach_to_bone(fan('Tail', (-.41, 0, .2), [(-.4, 0, .22), (-.6, 0, .36), (-.55, 0, .2), (-.6, 0, .04), (-.4, 0, .18)],
                       fin), rig, bones[-1])
    attach_to_bone(fan('Dorsal fin', (.02, 0, .3), [(.1, 0, .3), (.04, 0, .4), (-.08, 0, .3)], fin, thickness=.01),
                   rig, bones[1])
    for s in (-1, 1):
        attach_to_bone(fan('Pectoral fin', (.25, s * .07, .15), [(.25, s * .07, .15), (.12, s * .17, .12),
                                                                  (.14, s * .09, .13)], fin), rig, bones[0])
    # Place the whole fish (rig carries the body and every attached part).
    scale = random.uniform(.85, 1.12)
    rig.scale = (scale, scale, scale)
    rig.rotation_euler = (0, 0, random.uniform(-.1, .1))
    z = random.uniform(-.08, .08)

    beats = random.choice((5, 6, 7))  # tail beats per 2 s loop
    phase = random.uniform(0, math.tau)
    drift_phase = random.uniform(0, math.tau)
    dx, dy = random.uniform(.04, .1), random.uniform(.03, .07)
    for frame in range(FRAMES + 1):
        f = frame / FRAMES
        ph = f * math.tau * beats + phase
        for j, (name, amp) in enumerate(zip(bones, (.06, .16, .3))):
            key_bone(rig, name, frame, (0, 0, amp * math.sin(ph - j * 1.2)))
        d = f * math.tau + drift_phase
        key_loc(rig, frame, (x + dx * math.sin(d), y + dy * math.sin(d * 2 + 1), z))


bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'
spots = place_school()
for i, (x, y) in enumerate(spots):
    build_fish(i, x, y)
# Drift can carry edge fish a little past their first-frame spot.
framing_guide([(2.75, 1.35, .2), (-2.75, -1.35, .2)])
export('fish-school', 'Swim', FRAMES)
print(f'FISH_COUNT={len(spots)}')
