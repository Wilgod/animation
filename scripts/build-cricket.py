"""Build an articulated 3D field cricket: round head, very long antennae,
flat folded wings with a fine vein net, two tail cerci and the thick jumping
hind legs, walking in a tripod gait. Exported black (cricket.glb) and brown
(cricket-brown.glb); the green variant recolors the brown one. Run:
blender --background --python scripts/build-cricket.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(73)
body = mat('Cricket body', (.035, .03, .025), .3)
wing = mat('Cricket wing', (.05, .04, .03), .35)
vein = mat('Cricket wing vein', (.16, .12, .08), .5)
leg_mat = mat('Cricket leg', (.05, .04, .03), .4)
eye = mat('Cricket eye', (.01, .01, .01), .15)

loft('Abdomen', [(.3, .38, .02, .02), (.15, .38, .22, .17), (-.4, .38, .25, .18), (-.9, .36, .2, .14),
                 (-1.1, .35, .08, .06), (-1.15, .35, .02, .02)], body)
ellipsoid('Pronotum', (.5, 0, .42), (.26, .27, .2), body)
ellipsoid('Head', (.85, 0, .42), (.24, .26, .22), body)
for s in (-1, 1):
    ellipsoid('Eye', (.92, s * .2, .5), (.07, .05, .06), eye)
    tube('Antenna', [(1.02, s * .1, .5), (1.4, s * .3, .55), (1.9, s * .55, .5), (2.4, s * .8, .4)],
         [.016, .012, .008, .004], leg_mat, sides=6)
    fan('Folded wing', (.35, 0, .57), [(.3, s * .26, .55), (-.3, s * .3, .53), (-.9, s * .22, .47), (-1.05, 0, .45)], wing)
    for y in (.1, .2):
        tube('Wing vein', [(.25, s * y, .575), (-.4, s * (y + .04), .55), (-.9, s * y * .7, .48)], .008, vein, sides=5)
    tube('Cercus', [(-1.1, s * .05, .36), (-1.45, s * .22, .38), (-1.7, s * .32, .36)], [.025, .015, .005], leg_mat, sides=6)

STRIDE, DUTY, FRAMES = .34, .55, 36
legs = []
for s in (-1, 1):
    for i, (root, foot, lengths, radii) in enumerate([
            ((.6, .12, .3), (1.05, .7, .02), (.4, .45), (.045, .035, .015)),
            ((.4, .15, .3), (.35, .8, .02), (.42, .48), (.045, .035, .015)),
            ((.2, .2, .34), (-.95, .6, .02), (.85, .85), (.11, .05, .02))]):
        phase = 0 if (i % 2 == 0) == (s > 0) else .5
        hint = (-.3, s * .3, 1) if i == 2 else (0, s * .4, 1)
        legs.append(Leg(f'leg_{s}_{i}', (root[0], s * root[1], root[2]), (foot[0], s * foot[1], foot[2]),
                        lengths, radii, leg_mat, phase, hint))
for frame in range(FRAMES + 1):
    for leg in legs:
        leg.key(frame, frame / FRAMES, STRIDE, DUTY, .12)

print('STRIDE_PX', stride_px(STRIDE, DUTY))
export('cricket', 'Walk', FRAMES)
for m, c in ((body, (.3, .17, .07)), (wing, (.36, .22, .1)), (leg_mat, (.32, .2, .09))):
    set_color(m, c)
export('cricket-brown', 'Walk', FRAMES)
