"""Build an articulated 3D damselfly in flight: a needle-thin bright blue
abdomen with black rings, a wide head with widely spaced eyes, and four
narrow stalked wings beating out of phase. Run:
blender --background --python scripts/build-damselfly.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from insect import *

reset(113)
body_mat = mat('Damselfly blue abdomen', (.1, .45, .85), .3, metal=.2)
thorax_mat = mat('Damselfly blue thorax', (.1, .42, .8), .35)
ring_mat = mat('Damselfly black ring', (.02, .02, .03), .4)
eye_mat = mat('Damselfly compound eye', (.08, .3, .55), .15)
leg_mat = mat('Damselfly leg', (.04, .04, .04), .5)
wing_mat = mat('Damselfly wing membrane', (.85, .9, .95), .2, alpha=.25)
vein_mat = mat('Damselfly wing vein', (.1, .1, .1), .5)
stigma_mat = mat('Damselfly wing stigma', (.1, .06, .04), .4)

loft('Abdomen', [(-.2, .5, .05, .05), (-.5, .5, .035, .04), (-1.4, .48, .032, .036), (-2.3, .46, .035, .04),
                 (-2.5, .46, .02, .02)], body_mat, subdiv=1)
for x in (-.45, -.75, -1.05, -1.35, -1.65, -1.95, -2.2):
    ellipsoid('Segment ring', (x, 0, .48 - (x + .45) * .01), (.05, .04, .044), ring_mat)
ellipsoid('Thorax', (0, 0, .55), (.24, .1, .14), thorax_mat)
tube('Thorax stripe', [(-.18, 0, .68), (.18, 0, .68)], .02, ring_mat, sides=6)
ellipsoid('Head', (.28, 0, .56), (.07, .2, .08), thorax_mat)
for s in (-1, 1):
    ellipsoid('Compound eye', (.28, s * .2, .58), (.08, .08, .09), eye_mat)
    for x in (.14, .04, -.06):
        tube('Leg', [(x, s * .05, .44), (x + .08, s * .16, .34), (x + .16, s * .14, .24)], .012, leg_mat)

wings = []
for s in (-1, 1):
    for hind, (x, phase) in enumerate([(.08, 0.0), (-.08, -1.5)]):
        hinge = membrane_wing('hind_wing' if hind else 'fore_wing', (x, s * .07, .66), s, 1.3,
                              lambda u: .05 * min(1, u * 4) * math.sin(math.pi * u) ** .3,
                              lambda u: .13 * min(1, u * 3) * math.sin(math.pi * min(1, u * 1.05)) ** .5,
                              wing_mat, vein_mat, veins=(.3, .55, .8))
        ellipsoid('Wing stigma', (0, s * 1.3 * .88, .03), (.03, .05, .01), stigma_mat, parent=hinge)
        wings.append((hinge, s, phase))

FRAMES = 14
flap(wings, FRAMES, amp=.5, base=.1, sweep=.15)
export('damselfly', 'Fly', FRAMES)
