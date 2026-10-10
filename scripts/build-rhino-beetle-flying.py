"""Build the rhinoceros beetle in flight: the same shell and forked horn as
build-rhino-beetle.py, with the wing cases swung up and out and the big
brown hind wings beating underneath, legs tucked. Run:
blender --background --python scripts/build-rhino-beetle-flying.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from insect import *

reset(53)
shell = mat('Chestnut beetle shell', (.2, .075, .03), .2,
            image=texture('Beetle lacquer', (.2, .075, .03), (.1, .035, .012), (.32, .14, .06), contrast=.25, streak=.3))
dark = mat('Dark beetle chitin', (.06, .03, .015), .3)
leg_mat = mat('Beetle leg chitin', (.05, .025, .012), .35)
eye = mat('Beetle eye', (.01, .008, .006), .2)
wing_mat = mat('Beetle hindwing membrane', (.42, .28, .16), .35, alpha=.6)
vein_mat = mat('Beetle hindwing vein', (.16, .08, .04), .5)

ellipsoid('Abdomen', (-.35, 0, .42), (.95, .55, .3), dark)
ellipsoid('Pronotum', (.68, 0, .5), (.38, .58, .3), shell)
tube('Thoracic horn', [(.8, 0, .76), (1.0, 0, .84), (1.16, 0, .82)], [.07, .05, .02], shell, sides=10)
ellipsoid('Head', (1.05, 0, .36), (.2, .3, .15), dark)
for s in (-1, 1):
    ellipsoid('Eye', (1.08, s * .26, .38), (.06, .05, .05), eye)
    tube('Antenna', [(1.2, s * .18, .34), (1.3, s * .3, .35), (1.36, s * .36, .33)], .014, leg_mat, sides=6)
    for x in (.6, .15, -.3):
        tube('Tucked leg', [(x, s * .3, .2), (x - .1, s * .55, .1), (x - .35, s * .6, .02)], [.06, .045, .02], leg_mat, sides=6)
tube('Head horn', [(1.15, 0, .42), (1.45, 0, .5), (1.75, 0, .65), (1.98, 0, .82), (2.1, 0, .9)], [.13, .11, .09, .07, .055], shell, sides=12)
for s in (-1, 1):
    tube('Horn fork', [(2.08, 0, .88), (2.22, s * .1, .96), (2.3, s * .17, 1.0)], [.045, .03, .012], shell, sides=8)

# Wing cases on hinges at their front inner corners, held up and out.
for s in (-1, 1):
    case = pivot('wing_case', (.45, s * .04, .7))
    ellipsoid('Elytron', (-.7, s * .3, 0), (1.0, .34, .3), shell, parent=case)
    case.rotation_euler = (s * .8, -.35, s * .2)

wings = []
for s in (-1, 1):
    wings.append((membrane_wing('hind_wing', (.3, s * .1, .72), s, 2.0,
                                lambda u: .1 * math.sin(math.pi * u),
                                lambda u: .5 * math.sin(math.pi * min(1, u * 1.05)) ** .6, wing_mat, vein_mat, veins=(.3, .6)), s, 0.0))

FRAMES = 10
flap(wings, FRAMES, amp=.75, base=.2, sweep=.15)
export('rhino-beetle-flying', 'Fly', FRAMES)
