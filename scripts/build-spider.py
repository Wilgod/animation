"""Build an articulated 3D wolf-spider-like spider with eight 3-link legs.
Approximates image/animal/spider.png. Run:
blender --background --python scripts/build-spider.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(11)
body_tex = texture('Spider chestnut', (.2, .085, .05), (.06, .025, .015), (.36, .17, .1), contrast=.45)
abdomen = mat('Chestnut abdomen', (.2, .085, .05), .45, image=body_tex)
cephalo = mat('Glossy cephalothorax', (.17, .07, .04), .35, image=texture('Carapace', (.18, .075, .045), (.07, .03, .02), (.3, .14, .08), contrast=.3))
leg_dark = mat('Leg femur', (.13, .055, .032), .5)
leg_mid = mat('Leg tibia', (.2, .09, .052), .5)
hair = mat('Fine dark hair', (.09, .04, .025), .9)
eye = mat('Glossy black eyes', (.005, .004, .004), .1)

ellipsoid('Abdomen', (-.62, 0, .45), (.74, .56, .42), abdomen)
fur('Abdomen hair', (-.62, 0, .45), (.74, .56, .42), hair, count=1400, length=(.02, .05))
tube('Abdomen heart mark', [(-.05, 0, .84), (-.4, 0, .87), (-.8, 0, .8)], [.05, .07, .03], hair)
cone('Pedicel', (.02, 0, .4), (-.08, 0, .42), .1, .12, leg_dark)
ellipsoid('Cephalothorax', (.42, 0, .42), (.5, .42, .26), cephalo)
fur('Cephalothorax hair', (.42, 0, .42), (.5, .42, .26), hair, count=500, length=(.015, .035))
tube('Thoracic groove', [(.25, 0, .67), (.45, 0, .685)], .018, eye)
for x, y, z, r in [(.84, .07, .6, .045), (.84, -.07, .6, .045), (.78, .17, .62, .035), (.78, -.17, .62, .035),
                   (.72, .1, .67, .06), (.72, -.1, .67, .06), (.62, .15, .68, .04), (.62, -.15, .68, .04)]:
    ellipsoid('Eye', (x, y, z), (r, r, r), eye)
for s in (-1, 1):
    tube('Chelicera', [(.86, s * .1, .42), (.98, s * .1, .32), (1.0, s * .07, .2)], [.08, .07, .04], leg_dark)
    tube('Pedipalp', [(.82, s * .2, .35), (1.08, s * .32, .32), (1.25, s * .3, .18)], [.045, .04, .03], leg_mid)

# Eight legs; alternating tetrapods (L1 R2 L3 R4 / R1 L2 R3 L4) step together.
STRIDE, DUTY, FRAMES = .5, .55, 48
legs = []
spec = [((.62, .3), (2.0, 1.25)), ((.5, .36), (1.0, 1.85)), ((.34, .38), (-.25, 1.8)), ((.2, .32), (-1.35, 1.45))]
for s in (-1, 1):
    for i, ((rx, ry), (fx, fy)) in enumerate(spec):
        root = Vector((rx, s * ry, .38))
        foot = Vector((fx, s * fy, .02))
        toward = (root - foot); toward.z = 0; toward.normalize()
        phase = 0 if (i % 2 == 0) == (s > 0) else .5
        legs.append(Leg(f'leg_{s}_{i}', root, foot, (1.05, 1.0), (.07, .055, .04, .018), leg_dark, phase,
                        (toward.x * -.2, toward.y * -.2, 1), ankle=toward * .5 + Vector((0, 0, .32)), tip_material=leg_mid))
for frame in range(FRAMES + 1):
    for leg in legs:
        leg.key(frame, frame / FRAMES, STRIDE, DUTY, .22)

print('STRIDE_PX', stride_px(STRIDE, DUTY))
export('spider', 'Walk', FRAMES, reference='image/animal/spider.png')
