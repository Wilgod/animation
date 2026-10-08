"""Build an articulated 3D firefly in flight: dark wing cases held open,
orange-and-black shield over the head, buzzing hindwings, and a glowing
yellow-green lantern at the tail. Run:
blender --background --python scripts/build-firefly.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from insect import *

reset(25)


def glow(name, color, strength, alpha=1.0):
    m = mat(name, color, .4, alpha=alpha)
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Emission Color'].default_value = (*color, 1)
    p.inputs['Emission Strength'].default_value = strength
    return m


elytra_mat = mat('Dark wing case', (.07, .06, .05), .45)
shield_mat = mat('Orange pronotum', (.85, .45, .12), .4)
black = mat('Black body', (.02, .02, .02), .4)
red = mat('Red spot', (.75, .12, .08), .4)
lantern = glow('Glowing lantern', (.6, .95, .1), 1.0)
halo = glow('Lantern glow halo', (.55, .9, .15), .6, alpha=.12)
wing_mat = mat('Smoky wing membrane', (.55, .5, .42), .3, alpha=.4)
vein_mat = mat('Wing vein', (.15, .12, .08), .5)
eye_mat = mat('Compound eye', (.04, .04, .04), .2)

loft('Abdomen', [(0, .48, .14, .1), (-.35, .47, .17, .11), (-.7, .46, .15, .1), (-.95, .45, .1, .08)], black, subdiv=1)
ellipsoid('Lantern', (-.82, 0, .43), (.2, .14, .08), lantern)
ellipsoid('Lantern glow', (-.82, 0, .43), (.3, .24, .17), halo)
ellipsoid('Thorax', (.12, 0, .52), (.2, .17, .12), black)
ellipsoid('Pronotum shield', (.32, 0, .58), (.2, .22, .07), shield_mat)
ellipsoid('Shield spot', (.32, 0, .64), (.08, .05, .03), black)
for s in (-1, 1):
    ellipsoid('Shield red mark', (.32, s * .1, .63), (.05, .04, .02), red)
ellipsoid('Head', (.45, 0, .5), (.08, .1, .08), black)
for s in (-1, 1):
    ellipsoid('Eye', (.48, s * .07, .52), (.04, .04, .05), eye_mat)
    tube('Antenna', [(.5, s * .04, .55), (.65, s * .12, .62), (.8, s * .2, .62)], .01, black, sides=6)
    for x in (.25, .1, -.05):
        tube('Leg', [(x, s * .1, .44), (x + .04, s * .22, .34), (x + .12, s * .24, .26)], .014, black, sides=6)
    # Wing cases raised and spread, held still in flight like any beetle.
    case = pivot('wing_case', (.18, s * .06, .62))
    ellipsoid('Wing case', (-.42, s * .1, 0), (.46, .12, .05), elytra_mat, parent=case)
    case.rotation_euler = (s * .7, -.25, s * .35)

wings = []
for s in (-1, 1):
    wings.append((membrane_wing('hind_wing', (.08, s * .1, .6), s, 1.0,
                                lambda u: .05 * math.sin(math.pi * u),
                                lambda u: .3 * math.sin(math.pi * min(1, u * 1.05)) ** .6, wing_mat, vein_mat, veins=(.35, .65)), s, 0.0))

FRAMES = 10
flap(wings, FRAMES, amp=.7, base=.15, sweep=.1)
export('firefly', 'Fly', FRAMES)
