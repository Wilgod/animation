"""Build an articulated 3D green lacewing in flight: slender pale-green
body, shining golden eyes, long antennae and four large clear wings with a
dense net of green veins, fluttering slowly. Run:
blender --background --python scripts/build-lacewing.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from insect import *

reset(131)
body = mat('Lacewing green body', (.45, .78, .3), .5)
eye = mat('Lacewing golden eye', (.85, .65, .15), .15, metal=.4)
wing_mat = mat('Lacewing wing membrane', (.85, .95, .85), .15, alpha=.22)
vein_mat = mat('Lacewing green vein', (.35, .7, .25), .5)

loft('Abdomen', [(-.1, .5, .03, .03), (-.2, .5, .09, .09), (-.7, .48, .085, .08), (-1.0, .46, .04, .04), (-1.05, .46, .01, .01)], body, subdiv=1)
ellipsoid('Thorax', (.12, 0, .55), (.22, .11, .12), body)
ellipsoid('Head', (.38, 0, .55), (.07, .09, .07), body)
for s in (-1, 1):
    ellipsoid('Compound eye', (.38, s * .09, .57), (.06, .05, .06), eye)
    tube('Antenna', [(.44, s * .03, .6), (.8, s * .15, .72), (1.2, s * .3, .7), (1.5, s * .42, .62)], [.01, .008, .006, .003], body, sides=5)
    for x in (.22, .12, .02):
        tube('Leg', [(x, s * .06, .44), (x + .05, s * .2, .32), (x - .05, s * .26, .2)], .012, body, sides=5)

wings = []
for s in (-1, 1):
    for hind, (x, length, phase) in enumerate([(.2, 1.45, 0.0), (.0, 1.3, -.8)]):
        wings.append((membrane_wing('hind_wing' if hind else 'fore_wing', (x, s * .08, .66), s, length,
                                    lambda u: .12 * math.sin(math.pi * u) ** .6,
                                    lambda u: .32 * math.sin(math.pi * min(1, u * 1.05)) ** .6, wing_mat, vein_mat,
                                    veins=(.15, .27, .39, .51, .63, .75, .87)), s, phase))

FRAMES = 20
flap(wings, FRAMES, amp=.7, base=.2, sweep=.15)
export('lacewing', 'Fly', FRAMES)
