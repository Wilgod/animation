"""Build an articulated 3D paper wasp in flight: yellow and black striped
abdomen on a thin waist, black thorax with yellow marks, dangling yellow
legs and four smoky amber wings with a fast beat. Run:
blender --background --python scripts/build-wasp.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from insect import *

reset(61)
yellow = mat('Wasp yellow', (.85, .62, .03), .35)
black = mat('Wasp black', (.02, .018, .015), .3)
eye = mat('Wasp compound eye', (.06, .03, .01), .2)
wing_mat = mat('Smoky amber wing membrane', (.7, .55, .3), .2, alpha=.35)
vein_mat = mat('Wasp wing vein', (.25, .15, .05), .5)

# Striped abdomen: alternate yellow and black bands along its length.
abdomen = loft('Abdomen', [(-.12, .55, .03, .03), (-.22, .54, .15, .14), (-.45, .52, .23, .21), (-.75, .5, .22, .2),
                           (-1.0, .48, .16, .15), (-1.18, .47, .06, .06), (-1.25, .47, .01, .01)], yellow, subdiv=1)
abdomen.data.materials.append(black)
for poly in abdomen.data.polygons:
    poly.material_index = 1 if int((-.12 - poly.center.x) / .17) % 2 == 0 else 0
tube('Stinger', [(-1.24, 0, .47), (-1.34, 0, .46)], [.012, .003], black, sides=6)
tube('Waist', [(.2, 0, .6), (.05, 0, .58), (-.15, 0, .55)], [.06, .03, .05], black, sides=10)

# Thorax with yellow marks, and the head with big eyes and a yellow face.
ellipsoid('Thorax', (.42, 0, .62), (.3, .22, .22), black)
for s in (-1, 1):
    ellipsoid('Thorax mark', (.5, s * .14, .75), (.12, .04, .04), yellow)
ellipsoid('Scutellum mark', (.18, 0, .78), (.07, .1, .04), yellow)
ellipsoid('Head', (.82, 0, .62), (.13, .22, .19), black)
ellipsoid('Face', (.93, 0, .58), (.06, .14, .14), yellow)
for s in (-1, 1):
    ellipsoid('Compound eye', (.84, s * .15, .64), (.1, .08, .15), eye)
    tube('Antenna', [(.93, s * .05, .74), (1.05, s * .1, .9), (1.22, s * .2, .92), (1.35, s * .3, .82)],
         [.02, .018, .016, .012], black, sides=6)
    for x, back in ((.55, -.05), (.42, -.2), (.3, -.45)):  # legs dangle down and back in flight
        tube('Leg', [(x, s * .12, .5), (x + back * .4, s * .3, .35), (x + back, s * .32, .12), (x + back * 1.3, s * .3, .02)],
             [.03, .025, .02, .012], yellow, sides=6)

# Two pairs of wings on hinges at the thorax.
wings = []
for s in (-1, 1):
    wings.append((membrane_wing('fore_wing', (.5, s * .12, .8), s, 1.05,
                                lambda u: .05 * math.sin(math.pi * u),
                                lambda u: .2 * math.sin(math.pi * min(1, u * 1.08)) ** .6, wing_mat, vein_mat,
                                veins=(.35, .65)), s, 0.0))
    wings.append((membrane_wing('hind_wing', (.32, s * .1, .78), s, .7,
                                lambda u: .03 * math.sin(math.pi * u),
                                lambda u: .14 * math.sin(math.pi * min(1, u * 1.1)) ** .6, wing_mat, vein_mat,
                                veins=(.5,)), s, .3))

FRAMES = 6
flap(wings, FRAMES, amp=.65, base=.15, sweep=.3)
export('wasp', 'Fly', FRAMES)
