"""Build an articulated 3D ant: head with elbowed antennae and mandibles,
narrow thorax, petiole node and a glossy gaster, walking on six long legs in
an alternating tripod gait. Exported twice: a black ant (ant.glb) and a red
fire ant (ant-red.glb); the brown variant recolors the red one in the app
(a luminance recolor cannot lighten the black ant). Run:
blender --background --python scripts/build-ant.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

BLACK = (.025, .022, .02)
RED = (.5, .1, .03)

reset(51)
body = mat('Ant body chitin', BLACK, .22)
leg_mat = mat('Ant leg chitin', BLACK, .35)
eye = mat('Ant compound eye', (.01, .01, .01), .15)

# Head, mandibles and small side eyes.
ellipsoid('Head', (1.05, 0, .42), (.27, .25, .19), body)
for s in (-1, 1):
    ellipsoid('Eye', (1.1, s * .2, .47), (.07, .045, .05), eye)
    tube('Mandible', [(1.28, s * .1, .36), (1.42, s * .1, .34), (1.47, s * .03, .33)], [.035, .028, .012], body, sides=8)

# Mesosoma (thorax) tapering back to the waist, petiole node and the gaster.
loft('Thorax', [(.8, .44, .02, .02), (.72, .45, .13, .12), (.5, .44, .11, .11), (.32, .42, .09, .1),
                (.15, .41, .08, .08), (.05, .4, .02, .02)], body, subdiv=1)
ellipsoid('Petiole node', (-.05, 0, .43), (.07, .07, .1), body)
ellipsoid('Gaster', (-.6, 0, .46), (.46, .34, .3), body)

# Elbowed antennae on pivots: long scape, then the bent funiculus.
antennae = []
for s in (-1, 1):
    root = pivot('antenna', (1.22, s * .1, .5))
    tube('Antenna scape', [(0, 0, 0), (.22, s * .12, .1), (.36, s * .2, .12)], .022, leg_mat, root, sides=6)
    tube('Antenna funiculus', [(.36, s * .2, .12), (.55, s * .3, .07), (.72, s * .42, .02)], [.022, .018, .03], leg_mat, root, sides=6)
    antennae.append((root, s))

# Six long legs in an alternating tripod gait.
STRIDE, DUTY, FRAMES = .4, .5, 30
legs = []
for s in (-1, 1):
    for i, (x, fx, fy) in enumerate([(.7, 1.15, .85), (.45, .45, 1.0), (.2, -.45, .95)]):
        phase = 0 if (i % 2 == 0) == (s > 0) else .5
        legs.append(Leg(f'leg_{s}_{i}', (x, s * .08, .36), (fx, s * fy, .02), (.55, .7), (.035, .025, .012),
                        leg_mat, phase, (0, s * .4, 1)))
for frame in range(FRAMES + 1):
    c = frame / FRAMES
    for leg in legs:
        leg.key(frame, c, STRIDE, DUTY, .12)
    for root, s in antennae:
        key_rot(root, frame, (0, .08 * math.sin(c * math.tau * 2), s * .18 * math.sin(c * math.tau + s)))

print('STRIDE_PX', stride_px(STRIDE, DUTY))
export('ant', 'Walk', FRAMES)

# Same rig as a red fire ant.
for m in (body, leg_mat):
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*RED, 1)
    m.diffuse_color = (*RED, 1)
export('ant-red', 'Walk', FRAMES)
