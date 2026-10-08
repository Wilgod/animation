"""Build an articulated 3D dragonfly in flight: long metallic-blue segmented
abdomen, big wraparound compound eyes, and four long clear veined wings
beating out of phase (fore and hind pairs). Run:
blender --background --python scripts/build-dragonfly.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from insect import *

reset(21)
body_mat = mat('Metallic blue abdomen', (.05, .28, .62), .3, metal=.35,
               image=texture('Blue sheen', (.05, .28, .62), (.02, .12, .32), (.15, .5, .85), contrast=.25))
ring_mat = mat('Black segment rings', (.02, .02, .03), .4)
thorax_mat = mat('Green thorax', (.12, .36, .2), .35, metal=.2)
eye_mat = mat('Compound eye', (.08, .45, .4), .15)
leg_mat = mat('Dark leg', (.04, .035, .03), .5)
wing_mat = mat('Clear wing membrane', (.82, .9, .95), .2, alpha=.28)
vein_mat = mat('Dark wing vein', (.12, .1, .08), .5)
stigma_mat = mat('Wing stigma', (.1, .06, .04), .4)

loft('Abdomen', [(-.25, .5, .08, .08), (-.6, .5, .055, .06), (-1.2, .49, .05, .055), (-1.8, .48, .05, .055),
                 (-2.3, .47, .06, .06), (-2.5, .47, .03, .03)], body_mat, subdiv=1)
for x in (-.55, -.85, -1.15, -1.45, -1.75, -2.05, -2.3):
    ellipsoid('Segment ring', (x, 0, .49), (.025, .062, .065), ring_mat)
for s in (-1, 1):
    tube('Tail clasper', [(-2.48, s * .02, .47), (-2.62, s * .06, .46)], .012, ring_mat)
ellipsoid('Thorax', (0, 0, .55), (.32, .17, .2), thorax_mat)
ellipsoid('Head', (.34, 0, .56), (.12, .2, .15), thorax_mat)
for s in (-1, 1):
    ellipsoid('Compound eye', (.38, s * .12, .6), (.14, .14, .15), eye_mat)
    for x in (.18, .05, -.08):
        tube('Leg', [(x, s * .08, .42), (x + .1, s * .2, .3), (x + .2, s * .16, .2)], .016, leg_mat)

# Four long narrow wings; the fore pair leads the hind pair by a quarter beat.
wings = []
for s in (-1, 1):
    for hind, (x, length, phase, w) in enumerate([(.06, 1.75, 0.0, .2), (-.14, 1.65, -1.5, .27)]):
        hinge = membrane_wing('hind_wing' if hind else 'fore_wing', (x, s * .12, .7), s, length,
                              lambda u: .06 * math.sin(math.pi * u) ** .5,
                              lambda u, w=w, hind=hind: w * math.sin(math.pi * min(1, u * 1.08)) ** .6 + .06 * hind * (1 - u),
                              wing_mat, vein_mat, veins=(.2, .4, .6, .8))
        ellipsoid('Wing stigma', (0, s * length * .86, .03), (.03, .07, .01), stigma_mat, parent=hinge)
        wings.append((hinge, s, phase))

FRAMES = 12  # fast beat; dragonfly wings blur at speed
flap(wings, FRAMES, amp=.45, base=.05, sweep=.12)
export('dragonfly', 'Fly', FRAMES)
