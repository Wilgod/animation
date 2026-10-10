"""Build an articulated 3D stag beetle: flat glossy wing cases, a wide head
and the big curved antler mandibles, walking on six legs in a tripod gait.
Exported as a black beetle (stag-beetle.glb) and a chestnut one
(stag-beetle-brown.glb), which the red variant recolors. Run:
blender --background --python scripts/build-stag-beetle.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(71)
shell = mat('Stag beetle shell', (.03, .025, .02), .18)
dark = mat('Stag beetle chitin', (.02, .016, .012), .3)
leg_mat = mat('Stag beetle leg', (.025, .02, .015), .35)
eye = mat('Stag beetle eye', (.12, .08, .04), .2)

ellipsoid('Elytra', (-.35, 0, .4), (.95, .56, .3), shell)
tube('Elytra seam', [(.55, 0, .62), (0, 0, .7), (-.6, 0, .66), (-1.2, 0, .5)], .01, dark)
ellipsoid('Pronotum', (.62, 0, .42), (.3, .52, .22), shell)
ellipsoid('Head', (.98, 0, .38), (.22, .4, .14), shell)
for s in (-1, 1):
    ellipsoid('Eye', (1.0, s * .38, .4), (.06, .05, .05), eye)
    tube('Antenna', [(1.12, s * .3, .38), (1.25, s * .45, .4), (1.3, s * .55, .38)], .015, leg_mat, sides=6)
    jaw = [(1.12, s * .22, .42), (1.4, s * .4, .47), (1.72, s * .42, .5), (1.98, s * .3, .5), (2.1, s * .12, .48)]
    tube('Mandible', jaw, [.09, .08, .065, .045, .02], shell, sides=10)
    tube('Mandible tooth', [(1.7, s * .4, .5), (1.75, s * .28, .5)], [.035, .01], shell, sides=8)

STRIDE, DUTY, FRAMES = .32, .55, 44
legs = []
for s in (-1, 1):
    for i, (x, fx, fy) in enumerate([(.7, 1.3, .95), (.2, .15, 1.1), (-.3, -.95, 1.0)]):
        phase = 0 if (i % 2 == 0) == (s > 0) else .5
        legs.append(Leg(f'leg_{s}_{i}', (x, s * .32, .28), (fx, s * fy, .02), (.55, .65), (.055, .04, .018),
                        leg_mat, phase, (0, s * .5, 1)))
for frame in range(FRAMES + 1):
    for leg in legs:
        leg.key(frame, frame / FRAMES, STRIDE, DUTY, .1)

print('STRIDE_PX', stride_px(STRIDE, DUTY))
export('stag-beetle', 'Walk', FRAMES)
set_color(shell, (.14, .05, .018))
export('stag-beetle-brown', 'Walk', FRAMES)
