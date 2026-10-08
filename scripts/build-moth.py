"""Build an articulated 3D moth in flight: plump furry body, feathery
antennae, and broad patterned forewings over smaller hindwings with a slow
fluttering beat. Run: blender --background --python scripts/build-moth.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from insect import *

reset(23)
fur_mat = mat('Moth body fur', (.55, .45, .33), .95)
fore_mat = mat('Patterned forewing', (.62, .52, .38), .9,
               image=texture('Moth forewing', (.62, .52, .38), (.3, .23, .15), (.8, .72, .58), contrast=.45, streak=.35,
                             spots=((.22, .16, .1), 10, .03, .07)))
hind_mat = mat('Pale hindwing', (.78, .7, .56), .9,
               image=texture('Moth hindwing', (.78, .7, .56), (.55, .45, .32), (.9, .84, .72), contrast=.25))
eye_mat = mat('Dark eye', (.03, .02, .02), .2)
antenna_mat = mat('Feathery antenna', (.45, .36, .25), .8)
leg_mat = mat('Moth leg', (.4, .32, .23), .8)

ellipsoid('Thorax', (.05, 0, .55), (.3, .2, .2), fur_mat)
loft('Abdomen', [(-.15, .53, .14, .14), (-.5, .52, .16, .15), (-.85, .5, .12, .11), (-1.05, .49, .04, .04)], fur_mat, subdiv=1)
fur('Thorax fuzz', (.05, 0, .55), (.3, .2, .2), fur_mat, count=900, length=(.03, .07))
ellipsoid('Head', (.36, 0, .55), (.12, .14, .13), fur_mat)
for s in (-1, 1):
    ellipsoid('Eye', (.42, s * .09, .57), (.06, .06, .07), eye_mat)
    # Feathery antenna: a curved shaft with short side barbs.
    shaft = [(.45 + .07 * i, s * (.07 + .05 * i), .62 + .035 * i - .006 * i * i) for i in range(8)]
    tube('Antenna shaft', shaft, .01, antenna_mat, sides=6)
    for p in shaft[1:]:
        for k in (-1, 1):
            tube('Antenna barb', [p, (p[0] - .04, p[1] + k * .04, p[2] - .01)], .005, antenna_mat, sides=4)
    for x in (.18, .02, -.14):
        tube('Leg', [(x, s * .12, .42), (x + .05, s * .26, .3), (x + .14, s * .3, .2)], .018, leg_mat)

wings = []
for s in (-1, 1):
    fore = membrane_wing('fore_wing', (.12, s * .14, .66), s, 1.35,
                         lambda u: .08 + .22 * u - .1 * u * u,
                         lambda u: .25 + .55 * math.sin(math.pi * u * .75), fore_mat)
    hind = membrane_wing('hind_wing', (-.08, s * .14, .64), s, .95,
                         lambda u: .05 * (1 - u),
                         lambda u: .55 * math.sin(math.pi * min(1, u * 1.05)) ** .7, hind_mat, camber=.02)
    wings += [(fore, s, 0.0), (hind, s, -.25)]

FRAMES = 22
flap(wings, FRAMES, amp=.85, base=.2, sweep=.08)
export('moth', 'Fly', FRAMES)
