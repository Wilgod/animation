"""Build an articulated 3D bumblebee in flight: a round furry body with a
yellow collar, black thorax, yellow and black abdomen bands and a white
tail, small smoky wings with a fast beat and dangling legs. Run:
blender --background --python scripts/build-bumblebee.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from insect import *

reset(109)
yellow = mat('Bumblebee yellow body', (.85, .6, .08), .8)
yellow_fur = mat('Bumblebee yellow fur', (.9, .66, .12), .9)
black = mat('Bumblebee black body', (.03, .025, .02), .8)
black_fur = mat('Bumblebee black fur', (.04, .035, .03), .9)
white_fur = mat('Bumblebee white tail fur', (.88, .85, .78), .9)
eye = mat('Bumblebee eye', (.02, .02, .02), .2)
wing_mat = mat('Bumblebee wing membrane', (.55, .48, .4), .2, alpha=.4)
vein_mat = mat('Bumblebee wing vein', (.15, .1, .06), .5)

parts = [  # (name, center, radii, body material, fur material)
    ('Collar', (.42, 0, .62), (.16, .36, .32), yellow, yellow_fur),
    ('Thorax', (.15, 0, .65), (.3, .38, .36), black, black_fur),
    ('Abdomen front', (-.3, 0, .58), (.28, .44, .38), yellow, yellow_fur),
    ('Abdomen middle', (-.6, 0, .55), (.26, .42, .36), black, black_fur),
    ('Abdomen tail', (-.88, 0, .52), (.2, .32, .28), white_fur, white_fur),
]
for name, c, r, m, f in parts:
    ellipsoid(name, c, r, m)
    fur(name + ' fur', c, r, f, count=500, length=(.04, .08), back_only=False)
ellipsoid('Head', (.65, 0, .55), (.16, .24, .22), black)
for s in (-1, 1):
    ellipsoid('Compound eye', (.68, s * .17, .6), (.09, .06, .14), eye)
    tube('Antenna', [(.78, s * .06, .7), (.9, s * .12, .88), (1.05, s * .2, .9)], .02, black, sides=6)
    for x, back in ((.5, -.05), (.25, -.25), (0, -.5)):
        tube('Leg', [(x, s * .25, .35), (x + back * .4, s * .4, .22), (x + back, s * .42, .05)], [.035, .03, .02], black, sides=6)

wings = []
for s in (-1, 1):
    wings.append((membrane_wing('fore_wing', (.2, s * .22, .98), s, .95,
                                lambda u: .04 * math.sin(math.pi * u),
                                lambda u: .22 * math.sin(math.pi * min(1, u * 1.08)) ** .6, wing_mat, vein_mat, veins=(.35, .65)), s, 0.0))
    wings.append((membrane_wing('hind_wing', (.02, s * .2, .95), s, .62,
                                lambda u: .03 * math.sin(math.pi * u),
                                lambda u: .14 * math.sin(math.pi * min(1, u * 1.1)) ** .6, wing_mat, vein_mat, veins=(.5,)), s, .3))

FRAMES = 6
flap(wings, FRAMES, amp=.6, base=.15, sweep=.3)
export('bumblebee', 'Fly', FRAMES)
