"""Build an articulated 3D mosquito in flight: slim banded abdomen, humped
thorax, long proboscis, feathery antennae, six very long dangling legs (the
hind pair curled up) and two narrow scaly wings with a very fast beat. Run:
blender --background --python scripts/build-mosquito.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from insect import *

reset(107)
body = mat('Mosquito grey body', (.3, .3, .3), .5,
           image=texture('Mosquito body', (.3, .3, .3), (.14, .14, .15), (.5, .5, .5), contrast=.4, streak=.5))
band = mat('Mosquito pale band', (.8, .8, .78), .5)
leg_mat = mat('Mosquito leg', (.18, .18, .18), .5)
eye = mat('Mosquito eye', (.04, .04, .04), .2)
wing_mat = mat('Mosquito wing membrane', (.75, .78, .8), .2, alpha=.3)
vein_mat = mat('Mosquito wing vein', (.25, .25, .25), .5)

loft('Abdomen', [(-.15, .55, .03, .03), (-.3, .54, .1, .09), (-.8, .5, .1, .09), (-1.3, .45, .07, .06), (-1.45, .44, .02, .02)], body, subdiv=1)
for x in (-.4, -.65, -.9, -1.15):
    ellipsoid('Abdomen band', (x, 0, .52 - (x + .4) * .1), (.03, .1, .09), band)
ellipsoid('Thorax', (.1, 0, .62), (.24, .16, .2), body)
ellipsoid('Head', (.38, 0, .55), (.1, .1, .1), eye)
tube('Proboscis', [(.46, 0, .5), (.75, 0, .38), (.95, 0, .3)], [.018, .012, .006], leg_mat, sides=6)
for s in (-1, 1):
    tube('Antenna', [(.46, s * .03, .58), (.62, s * .08, .66), (.78, s * .12, .7)], .01, leg_mat, sides=5)
    fur('Antenna plume', (.62, s * .08, .66), (.12, .05, .05), leg_mat, count=60, length=(.03, .06), comb=Vector((0, s, 0)))
    for x, back, up in ((.2, .5, -.2), (.08, -.2, -.25), (-.05, -.9, .25)):  # front, mid, curled-up hind legs
        tube('Leg', [(x, s * .08, .5), (x + back * .3, s * .35, .4 + up * .3), (x + back * .7, s * .5, .2 + up),
                     (x + back, s * .55, up * 1.3)], [.016, .012, .008, .004], leg_mat, sides=5)

wings = []
for s in (-1, 1):
    wings.append((membrane_wing('wing', (.12, s * .1, .8), s, 1.0,
                                lambda u: .02 * math.sin(math.pi * u),
                                lambda u: .14 * math.sin(math.pi * min(1, u * 1.1)) ** .5, wing_mat, vein_mat,
                                veins=(.4, .7)), s, 0.0))

FRAMES = 4
flap(wings, FRAMES, amp=.55, base=.1, sweep=.35)
export('mosquito', 'Fly', FRAMES)
