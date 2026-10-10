"""Build an articulated 3D stick insect: a long twig-like body with knobbly
joints, long thin legs and antennae, walking slowly while the body rocks
side to side like a twig in the wind. Run:
blender --background --python scripts/build-stick-insect.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(79)
skin = mat('Stick insect body', (.3, .45, .14), .6,
           image=texture('Twig bark', (.3, .45, .14), (.18, .3, .07), (.45, .58, .24), contrast=.35, streak=.7))
leg_mat = mat('Stick insect leg', (.34, .48, .16), .6)
eye = mat('Stick insect eye', (.2, .15, .06), .3)

# Body on a sway pivot: thorax and abdomen as one long twig with knots.
sway = pivot('body_sway', (0, 0, 0))
tube('Body', [(1.3, 0, .32), (.6, 0, .34), (0, 0, .34), (-1.0, 0, .33), (-2.0, 0, .3), (-2.4, 0, .28)],
     [.07, .065, .06, .055, .04, .02], skin, sway, sides=10)
for x in (.6, 0, -.6, -1.2, -1.8):
    ellipsoid('Body knot', (x, 0, .33), (.06, .075, .07), skin, sway)
ellipsoid('Head', (1.4, 0, .34), (.13, .08, .07), skin, sway)
for s in (-1, 1):
    ellipsoid('Eye', (1.45, s * .07, .37), (.03, .025, .025), eye, sway)
    tube('Antenna', [(1.5, s * .03, .36), (1.9, s * .12, .4), (2.4, s * .25, .38)], [.012, .008, .004], leg_mat, sway, sides=5)

STRIDE, DUTY, FRAMES = .4, .6, 72
legs = []
for s in (-1, 1):
    for i, (x, fx, fy, lengths) in enumerate([(1.1, 2.0, .7, (.65, .8)), (.4, .5, 1.1, (.7, .85)), (-.1, -1.0, 1.0, (.75, .9))]):
        phase = 0 if (i % 2 == 0) == (s > 0) else .5
        legs.append(Leg(f'leg_{s}_{i}', (x, s * .05, .3), (fx, s * fy, .02), lengths, (.03, .022, .012),
                        leg_mat, phase, (0, s * .3, 1)))
for frame in range(FRAMES + 1):
    c = frame / FRAMES
    rock = .08 * math.sin(c * math.tau * 2)
    key_loc(sway, frame, (0, rock, 0))
    for leg in legs:
        leg.key(frame, c, STRIDE, DUTY, .14, root_offset=Vector((0, rock, 0)))

print('STRIDE_PX', stride_px(STRIDE, DUTY))
export('stick-insect', 'Walk', FRAMES)
