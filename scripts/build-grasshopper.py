"""Build an articulated 3D grasshopper: tall head with big eyes, saddle
pronotum, folded forewings over a long abdomen and the big jumping hind
legs, walking in a tripod gait. Run:
blender --background --python scripts/build-grasshopper.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(57)
skin = mat('Grasshopper green body', (.32, .55, .12), .5,
           image=texture('Grasshopper green', (.32, .55, .12), (.18, .36, .06), (.5, .7, .22), contrast=.3, streak=.4))
wing = mat('Grasshopper folded wing', (.36, .5, .14), .5,
           image=texture('Grasshopper wing', (.36, .5, .14), (.24, .36, .08), (.5, .62, .24), contrast=.35, streak=.7))
pale = mat('Grasshopper pale legs', (.42, .6, .18), .5)
eye = mat('Grasshopper eye', (.3, .26, .12), .25)
dark = mat('Grasshopper dark stripe', (.1, .14, .04), .5)

# Long abdomen under folded wings, saddle-shaped pronotum and tall head.
loft('Abdomen', [(.35, .42, .02, .02), (.2, .42, .17, .17), (-.4, .42, .2, .19), (-1.0, .4, .17, .15),
                 (-1.4, .38, .1, .09), (-1.55, .38, .02, .02)], skin)
ellipsoid('Pronotum', (.55, 0, .5), (.32, .22, .24), skin)
for s in (-1, 1):
    tube('Pronotum side stripe', [(.3, s * .19, .58), (.6, s * .21, .6), (.84, s * .18, .57)], .018, dark, sides=6)
    fan('Forewing', (.35, s * .03, .64),
        [(.3, s * .16, .63), (-.3, s * .23, .61), (-1.0, s * .2, .57), (-1.62, s * .08, .48), (-1.7, 0, .47)], wing)
ellipsoid('Head', (1.0, 0, .48), (.2, .18, .25), skin)
ellipsoid('Face', (1.13, 0, .38), (.1, .14, .14), pale)
for s in (-1, 1):
    ellipsoid('Eye', (1.03, s * .15, .6), (.08, .06, .1), eye)
    tube('Antenna', [(1.12, s * .07, .66), (1.4, s * .16, .72), (1.7, s * .3, .7), (1.9, s * .42, .64)],
         [.018, .014, .01, .006], skin, sides=6)

# Four walking legs plus the big hind legs, all in a tripod gait: the hind
# femur rises high above the body, the tibia folds down to the foot.
STRIDE, DUTY, FRAMES = .36, .55, 40
legs = []
for s in (-1, 1):
    for i, (root, foot, lengths, radii) in enumerate([
            ((.68, .1, .38), (1.1, .65, .02), (.4, .45), (.04, .03, .015)),
            ((.45, .12, .38), (.4, .78, .02), (.42, .48), (.04, .03, .015)),
            ((.25, .16, .42), (-1.0, .5, .02), (1.0, .95), (.09, .04, .018))]):
        phase = 0 if (i % 2 == 0) == (s > 0) else .5
        hint = (-.3, s * .25, 1) if i == 2 else (0, s * .4, 1)
        legs.append(Leg(f'leg_{s}_{i}', (root[0], s * root[1], root[2]), (foot[0], s * foot[1], foot[2]),
                        lengths, radii, pale, phase, hint))
for frame in range(FRAMES + 1):
    for leg in legs:
        leg.key(frame, frame / FRAMES, STRIDE, DUTY, .12)

print('STRIDE_PX', stride_px(STRIDE, DUTY))
export('grasshopper', 'Walk', FRAMES)
