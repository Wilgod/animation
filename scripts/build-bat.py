"""Build an articulated 3D fruit bat in flight: furry brown body, big ears,
and leathery wing membranes stretched between the arm and three long finger
bones, flapping at shoulder and wrist. Run:
blender --background --python scripts/build-bat.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(39)
fur_mat = mat('Bat body fur', (.32, .22, .14), .95,
              image=texture('Bat fur', (.32, .22, .14), (.16, .1, .06), (.45, .32, .2), contrast=.3, streak=.5))
skin = mat('Bat wing membrane', (.2, .14, .11), .6, alpha=.92)
bone = mat('Bat finger bone', (.14, .1, .08), .6)
ear_mat = mat('Bat ear skin', (.25, .16, .12), .7)
eye_mat = mat('Bat eye', (.02, .015, .015), .1)
nose_mat = mat('Bat nose', (.12, .08, .07), .5)

loft('Body', [(-.55, .5, .04, .04), (-.4, .5, .16, .13), (-.1, .52, .22, .18), (.2, .54, .2, .17), (.35, .55, .1, .1)], fur_mat)
fur('Body fur', (-.05, 0, .52), (.32, .2, .17), fur_mat, count=700, length=(.02, .05))
ellipsoid('Head', (.45, 0, .58), (.17, .14, .13), fur_mat)
ellipsoid('Snout', (.6, 0, .55), (.08, .07, .06), fur_mat)
ellipsoid('Nose', (.67, 0, .56), (.025, .04, .025), nose_mat)
for s in (-1, 1):
    ellipsoid('Bat eye', (.56, s * .08, .62), (.025, .025, .025), eye_mat)
    fan('Ear', (.42, s * .07, .66), [(.48, s * .08, .66), (.42, s * .16, .86), (.34, s * .12, .66), (.48, s * .08, .66)], ear_mat)
    tube('Hind leg', [(-.4, s * .1, .48), (-.55, s * .2, .45), (-.68, s * .24, .44)], .025, bone, sides=6)

wings = []
for s in (-1, 1):
    shoulder = pivot(f'shoulder_{s}', (.15, s * .15, .6))
    # Arm membrane from the body side to the wrist, back to the hind leg.
    arm_pts = [(.0, 0, 0), (.08, s * .35, .01), (.05, s * .72, .02), (-.5, s * .7, .01), (-.75, s * .1, -.12)]
    fan('Arm membrane', (-.25, s * .3, .01), arm_pts + [arm_pts[0]], skin, parent=shoulder)
    tube('Forearm', [(0, 0, 0), (.08, s * .35, .02), (.05, s * .72, .02)], .028, bone, parent=shoulder, sides=6)
    wrist = pivot(f'wrist_{s}', (.05, s * .72, .02), shoulder)
    tips = [(.25, s * .72, 0), (-.15, s * .85, 0), (-.5, s * .6, 0)]
    hand_pts = [(0, 0, 0)] + [p for tip in tips for p in (tip,)] + [(-.55, -s * .02, 0)]
    fan('Hand membrane', (-.12, s * .35, 0), hand_pts + [hand_pts[0]], skin, parent=wrist)
    for tip in tips:
        tube('Finger', [(0, 0, 0), ((tip[0]) * .5, tip[1] * .55, .02), tip], [.022, .016, .008], bone, parent=wrist, sides=6)
    tube('Thumb claw', [(0, 0, 0), (.1, s * .02, .03)], .015, bone, parent=wrist, sides=6)
    wings.append((s, shoulder, wrist))

FRAMES = 20
for frame in range(FRAMES + 1):
    ph = frame / FRAMES * math.tau
    for s, shoulder, wrist in wings:
        key_rot(shoulder, frame, (s * (.1 + .9 * math.sin(ph)), 0, 0))
        # The hand folds in and lags behind on the upstroke.
        key_rot(wrist, frame, (s * .55 * math.sin(ph - .8), 0, s * .35 * max(0, math.sin(ph + 1.4))))
export('bat', 'Fly', FRAMES)
