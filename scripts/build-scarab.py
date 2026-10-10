"""Build an articulated 3D jewel scarab (金龜子): a round domed metallic-green
shell with a fine dimpled texture, small head with fan antennae, walking on
six legs in a tripod gait. Run:
blender --background --python scripts/build-scarab.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(83)
shell = mat('Scarab metallic shell', (.08, .42, .12), .2, metal=.6,
            image=texture('Scarab sheen', (.08, .42, .12), (.03, .22, .05), (.3, .7, .2), contrast=.3, scales=.3))
dark = mat('Scarab underside', (.04, .08, .03), .3, metal=.3)
leg_mat = mat('Scarab leg', (.06, .2, .06), .3, metal=.4)
eye = mat('Scarab eye', (.02, .02, .02), .2)

ellipsoid('Elytra', (-.28, 0, .42), (.82, .64, .42), shell)
tube('Elytra seam', [(.4, 0, .82), (0, 0, .85), (-.5, 0, .78), (-1.0, 0, .5)], .01, dark)
ellipsoid('Underside', (-.2, 0, .3), (.8, .58, .14), dark)
ellipsoid('Pronotum', (.5, 0, .45), (.28, .5, .27), shell)
ellipsoid('Head', (.8, 0, .36), (.16, .26, .13), shell)
for s in (-1, 1):
    ellipsoid('Eye', (.84, s * .22, .38), (.05, .04, .04), eye)
    tube('Antenna', [(.92, s * .15, .36), (1.02, s * .24, .38)], .012, leg_mat, sides=6)
    for k in range(3):  # lamellate fan club
        ellipsoid('Antenna club', (1.06, s * (.27 + k * .02), .38 + k * .015), (.05, .012, .03), leg_mat)

STRIDE, DUTY, FRAMES = .3, .5, 36
legs = []
for s in (-1, 1):
    for i, (x, fx, fy) in enumerate([(.55, 1.05, .9), (.1, .05, 1.05), (-.35, -.95, .95)]):
        phase = 0 if (i % 2 == 0) == (s > 0) else .5
        legs.append(Leg(f'leg_{s}_{i}', (x, s * .35, .28), (fx, s * fy, .02), (.48, .55), (.05, .038, .016),
                        leg_mat, phase, (0, s * .5, 1)))
for frame in range(FRAMES + 1):
    for leg in legs:
        leg.key(frame, frame / FRAMES, STRIDE, DUTY, .1)

print('STRIDE_PX', stride_px(STRIDE, DUTY))
export('scarab', 'Walk', FRAMES)
