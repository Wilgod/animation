"""Build an articulated 3D housefly in flight: big red-brown eyes, grey
striped thorax, checkered abdomen, bristly legs and two clear veined wings
with a fast buzzing beat. Run: blender --background --python scripts/build-housefly.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from insect import *

reset(27)
thorax_mat = mat('Grey striped thorax', (.32, .32, .33), .6,
                 image=texture('Fly thorax', (.32, .32, .33), (.08, .08, .09), (.5, .5, .5), contrast=.5, streak=.6))
belly_mat = mat('Checkered abdomen', (.28, .27, .25), .5,
                image=texture('Fly abdomen', (.28, .27, .25), (.07, .07, .07), (.55, .52, .45), contrast=.6,
                              spots=((.06, .06, .06), 14, .05, .1)))
eye_mat = mat('Red-brown compound eye', (.45, .1, .06), .2)
black = mat('Bristly black', (.03, .03, .03), .6)
wing_mat = mat('Clear wing membrane', (.8, .82, .85), .15, alpha=.3)
vein_mat = mat('Brown wing vein', (.2, .14, .08), .5)

ellipsoid('Thorax', (.05, 0, .55), (.3, .25, .24), thorax_mat)
loft('Abdomen', [(-.15, .52, .2, .17), (-.45, .5, .26, .2), (-.75, .48, .2, .15), (-.92, .47, .06, .05)], belly_mat, subdiv=1)
fur('Thorax bristles', (.05, 0, .55), (.3, .25, .24), black, count=260, length=(.03, .07))
ellipsoid('Head', (.38, 0, .52), (.14, .23, .2), black)
for s in (-1, 1):
    ellipsoid('Compound eye', (.4, s * .13, .55), (.13, .13, .17), eye_mat)
    for x in (.25, .05, -.15):
        tube('Leg', [(x, s * .15, .38), (x - .02, s * .32, .26), (x + .08, s * .36, .12), (x + .14, s * .37, .1)], .022, black, sides=6)
tube('Proboscis', [(.46, 0, .38), (.52, 0, .28)], .03, black, sides=8)

wings = []
for s in (-1, 1):
    wings.append((membrane_wing('wing', (.1, s * .18, .74), s, 1.15,
                                lambda u: .04 * math.sin(math.pi * u),
                                lambda u: .34 * math.sin(math.pi * min(1, u * 1.1)) ** .5, wing_mat, vein_mat,
                                veins=(.3, .55, .8)), s, 0.0))

FRAMES = 8
flap(wings, FRAMES, amp=.6, base=.1, sweep=.3)
export('housefly', 'Fly', FRAMES)
