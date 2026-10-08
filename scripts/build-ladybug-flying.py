"""Build an articulated 3D seven-spot ladybug in flight: red spotted wing
cases raised open and the thin brown hindwings unfolded and beating.
Flying partner of build-ladybug.py (same colors). Run:
blender --background --python scripts/build-ladybug-flying.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from insect import *

reset(7)
red = mat('Glossy red elytra', (.62, .045, .02), .22, image=texture('Red lacquer', (.6, .05, .02), (.42, .02, .01), (.78, .1, .05), contrast=.2))
black = mat('Gloss black', (.012, .011, .011), .25)
cream = mat('Cream pronotum marks', (.86, .82, .7), .4)
leg_mat = mat('Dark leg chitin', (.03, .022, .02), .4)
wing_mat = mat('Brown hindwing membrane', (.45, .32, .2), .35, alpha=.55)
vein_mat = mat('Hindwing vein', (.2, .12, .06), .5)

ellipsoid('Abdomen', (-.1, 0, .4), (.8, .62, .28), black)
ellipsoid('Pronotum', (.62, 0, .45), (.3, .52, .24), black)
for s in (-1, 1):
    ellipsoid('Pronotum patch', (.7, s * .34, .52), (.14, .14, .1), cream)
ellipsoid('Head', (.88, 0, .38), (.17, .27, .16), black)
for s in (-1, 1):
    ellipsoid('Eye', (.94, s * .16, .43), (.06, .06, .06), cream)
    tube('Antenna', [(1.0, s * .12, .42), (1.12, s * .2, .45), (1.2, s * .3, .43)], .012, leg_mat)
    for x in (.4, .05, -.3):
        tube('Tucked leg', [(x, s * .3, .2), (x + .05, s * .45, .12), (x + .15, s * .42, .05)], .03, leg_mat, sides=6)

# Each wing case is a half dome on a hinge at its front inner corner,
# swung up and out, carrying its spots.
for s in (-1, 1):
    case = pivot('wing_case', (.55, s * .04, .62))
    ellipsoid('Elytron', (-.62, s * .38, 0), (.92, .44, .32), red, parent=case)
    for x, y in [(-.15, .1), (-.4, .44), (-.95, .36), (-1.2, .6)]:
        ellipsoid('Spot', (x - .1, s * y, .26 - abs(y - .38) * .3), (.13, .13, .05), black, parent=case,
                  rot=(-s * (y - .38) * 1.2, -.15, 0))
    case.rotation_euler = (s * .85, -.35, s * .25)

wings = []
for s in (-1, 1):
    wings.append((membrane_wing('hind_wing', (.35, s * .1, .62), s, 1.7,
                                lambda u: .08 * math.sin(math.pi * u),
                                lambda u: .45 * math.sin(math.pi * min(1, u * 1.05)) ** .6, wing_mat, vein_mat, veins=(.3, .6)), s, 0.0))

FRAMES = 10
flap(wings, FRAMES, amp=.75, base=.2, sweep=.15)
export('ladybug-flying', 'Fly', FRAMES, reference='image/animal/ladybug.png')
