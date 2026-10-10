"""Build the grasshopper in flight (a flying locust): the same body as
build-grasshopper.py, forewings held out, the fan-shaped yellow hind wings
with a dark band beating, and the big hind legs trailing straight back. Run:
blender --background --python scripts/build-locust-flying.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from insect import *

reset(57)
skin = mat('Grasshopper green body', (.32, .55, .12), .5,
           image=texture('Grasshopper green', (.32, .55, .12), (.18, .36, .06), (.5, .7, .22), contrast=.3, streak=.4))
wing = mat('Grasshopper folded wing', (.36, .5, .14), .5,
           image=texture('Grasshopper wing', (.36, .5, .14), (.24, .36, .08), (.5, .62, .24), contrast=.35, streak=.7))
pale = mat('Grasshopper pale legs', (.42, .6, .18), .5)
eye = mat('Grasshopper eye', (.3, .26, .12), .25)
dark = mat('Grasshopper dark stripe', (.1, .14, .04), .5)
hind_mat = mat('Locust hind wing membrane', (.9, .75, .3), .3, alpha=.7)
vein_mat = mat('Locust hind wing band', (.12, .1, .06), .5)

loft('Abdomen', [(.35, .42, .02, .02), (.2, .42, .17, .17), (-.4, .42, .2, .19), (-1.0, .4, .17, .15),
                 (-1.4, .38, .1, .09), (-1.55, .38, .02, .02)], skin)
ellipsoid('Pronotum', (.55, 0, .5), (.32, .22, .24), skin)
ellipsoid('Head', (1.0, 0, .48), (.2, .18, .25), skin)
ellipsoid('Face', (1.13, 0, .38), (.1, .14, .14), pale)
for s in (-1, 1):
    tube('Pronotum side stripe', [(.3, s * .19, .58), (.6, s * .21, .6), (.84, s * .18, .57)], .018, dark, sides=6)
    ellipsoid('Eye', (1.03, s * .15, .6), (.08, .06, .1), eye)
    tube('Antenna', [(1.12, s * .07, .66), (1.4, s * .16, .72), (1.7, s * .3, .7), (1.9, s * .42, .64)],
         [.018, .014, .01, .006], skin, sides=6)
    # Forewings held out to the sides as gliding planes.
    fw = pivot('fore_wing', (.4, s * .12, .66))
    fan('Forewing', (0, 0, 0), [(.05, s * .4, 0), (-.05, s * 1.3, .02), (-.25, s * 1.45, .02), (-.3, s * .4, 0), (-.2, 0, 0)], wing, fw)
    fw.rotation_euler = (s * .1, 0, s * -.15)
    # Legs: front pairs tucked, hind legs trailing back.
    for x in (.7, .45):
        tube('Tucked leg', [(x, s * .12, .36), (x - .1, s * .3, .25), (x - .3, s * .3, .2)], [.04, .03, .015], pale, sides=6)
    tube('Hind femur', [(.25, s * .16, .42), (-.6, s * .3, .55), (-1.1, s * .35, .5)], [.09, .07, .04], pale, sides=8)
    tube('Hind tibia', [(-1.1, s * .35, .5), (-1.8, s * .3, .42)], [.035, .02], pale, sides=6)

wings = []
for s in (-1, 1):
    wings.append((membrane_wing('hind_wing', (.15, s * .12, .64), s, 1.35,
                                lambda u: .08 * math.sin(math.pi * u),
                                lambda u: .75 * math.sin(math.pi * min(1, u * 1.05)) ** .5, hind_mat, vein_mat,
                                veins=(.3, .5, .7)), s, 0.0))

FRAMES = 10
flap(wings, FRAMES, amp=.7, base=.15, sweep=.2)
export('locust-flying', 'Fly', FRAMES)
