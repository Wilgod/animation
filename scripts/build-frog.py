"""Build an articulated 3D green frog with a hop cycle: the hind legs kick out
behind, fold back in the air, and the front legs reach forward to land.
Approximates image/animal/frog-walk.png. Run:
blender --background --python scripts/build-frog.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(3)
skin_tex = texture('Frog skin', (.3, .38, .14), (.12, .16, .05), (.48, .55, .22), contrast=.45,
                   spots=((.1, .12, .04), 26, .025, .06))
skin = mat('Mottled olive skin', (.3, .38, .14), .45, image=skin_tex)
leg_tex = texture('Frog legs', (.34, .36, .15), (.12, .14, .05), (.5, .5, .24), contrast=.4,
                  spots=((.1, .1, .04), 30, .02, .045))
leg_skin = mat('Banded leg skin', (.3, .33, .13), .5, image=leg_tex)
leg_flat = mat('Leg skin', (.28, .31, .12), .5)
belly = mat('Pale throat', (.72, .7, .5), .6)
eye = mat('Golden eye', (.55, .42, .1), .15)
pupil = mat('Pupil', (.01, .01, .01), .1)
ridge = mat('Dorsolateral ridge', (.36, .42, .17), .5)

body = ellipsoid('Body', (-.1, 0, .42), (.95, .72, .4), skin)
ellipsoid('Head', (.7, 0, .42), (.5, .58, .3), skin)
ellipsoid('Snout', (1.08, 0, .38), (.25, .38, .2), skin)
ellipsoid('Throat', (.8, 0, .25), (.45, .5, .15), belly)
for s in (-1, 1):
    ellipsoid('Eye bulge', (.82, s * .36, .62), (.17, .15, .14), skin)
    ellipsoid('Eye', (.84, s * .39, .68), (.12, .11, .1), eye)
    ellipsoid('Pupil', (.9, s * .43, .72), (.05, .035, .03), pupil)
    ellipsoid('Eardrum', (.55, s * .5, .56), (.1, .03, .1), leg_flat, rot=(s * .5, 0, 0))
    tube('Dorsal ridge', [(.55, s * .36, .66), (0, s * .45, .78), (-.6, s * .4, .7)], .03, ridge)
    ellipsoid('Nostril', (1.25, s * .1, .48), (.025, .02, .015), pupil)

# Legs: hind = 3 links (thigh, shin, foot), front = 2 links (arm, forearm).
hind = {s: [link(f'hind_{s}_{j}', *r, leg_skin if j < 2 else leg_flat) for j, r in enumerate([(.16, .12), (.12, .07), (.07, .13)])] for s in (-1, 1)}
front = {s: [link(f'front_{s}_{j}', *r, leg_flat) for j, r in enumerate([(.08, .06), (.06, .07)])] for s in (-1, 1)}

FRAMES = 48
framing_guide([(-2.6, 1.3, 0), (-2.6, -1.3, 0), (1.5, 1.3, 0), (1.5, -1.3, 0)])
HOP = 1.6  # body travel per hop, model units


def smooth(t):
    t = min(1, max(0, t))
    return t * t * (3 - 2 * t)


for frame in range(FRAMES + 1):
    p = frame / FRAMES
    # extension of the hind legs: 0 crouched, 1 fully kicked back
    if p < .28:
        ext = smooth(p / .28)
    elif p < .62:
        ext = 1 - smooth((p - .28) / .34)
    else:
        ext = 0
    reach = math.sin(math.pi * min(1, max(0, (p - .3) / .45)))  # front legs reach while landing
    for s in (-1, 1):
        hip = Vector((-.62, s * .42, .38))
        crouch_foot = Vector((-.3, s * 1.05, .02))
        kick_foot = Vector((-2.35, s * .62, .06))
        foot = crouch_foot.lerp(kick_foot, ext)
        # Crouched, the heel tucks behind the forward-pointing foot; kicked
        # out, the foot trails straight behind the heel.
        heel = foot + Vector((-.42 + .84 * ext, -s * .05 * ext, .07))
        k = knee(hip, heel, .78, .74, (1 - ext, s * 1.2, .3))
        for o, (a, b) in zip(hind[s], [(hip, k), (k, heel), (heel, foot + Vector((.25 - .5 * ext, s * .02, 0)))]):
            pose_link(o, a, b, frame)
        shoulder = Vector((.5, s * .42, .3))
        hand = Vector((.95 + .4 * reach, s * .82, .02 + .1 * reach))
        e = knee(shoulder, hand, .32, .42, (-1, s * .4, .6))
        for o, (a, b) in zip(front[s], [(shoulder, e), (e, hand)]):
            pose_link(o, a, b, frame)

print('STRIDE_PX', stride_px(HOP, 1.0))
export('frog', 'Walk', FRAMES, reference='image/animal/frog-walk.png')
