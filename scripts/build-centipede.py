"""Build an articulated 3D centipede: a chain of flat body plates that
snakes side to side, one pair of legs per plate stepping in a rippling wave
from tail to head, long antennae and trailing tail legs. Run:
blender --background --python scripts/build-centipede.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(89)
plate = mat('Centipede body plate', (.48, .14, .05), .35,
            image=texture('Centipede plate', (.48, .14, .05), (.3, .07, .02), (.62, .24, .08), contrast=.25))
leg_mat = mat('Centipede yellow leg', (.85, .6, .15), .45)
head_mat = mat('Centipede head', (.38, .1, .04), .3)
eye = mat('Centipede eye', (.02, .02, .02), .2)

N, GAP = 15, .2
X0 = 1.3
segments = []
for i in range(N):
    x = X0 - .25 - i * GAP
    seg = pivot(f'segment_{i}', (x, 0, .16))
    ellipsoid('Body plate', (0, 0, 0), (.13, .2 - .004 * i, .08), plate, seg)
    segments.append((seg, x))
head = pivot('head', (X0, 0, .17))
ellipsoid('Head plate', (0, 0, 0), (.13, .17, .07), head_mat, head)
for s in (-1, 1):
    ellipsoid('Eye', (.04, s * .12, .05), (.03, .03, .02), eye, head)
    tube('Antenna', [(.1, s * .06, .03), (.4, s * .2, .06), (.75, s * .35, .04), (1.0, s * .42, .02)],
         [.018, .014, .009, .004], leg_mat, head, sides=6)
    tube('Forcipule', [(.08, s * .1, -.03), (.18, s * .1, -.04), (.22, s * .03, -.04)], [.025, .018, .006], head_mat, head, sides=6)
tail = segments[-1][0]
for s in (-1, 1):
    tube('Tail leg', [(-.05, s * .12, 0), (-.35, s * .25, 0), (-.65, s * .3, -.06)], [.022, .016, .006], leg_mat, tail, sides=6)

# Legs: one pair per plate, the step wave rippling forward along the body.
STRIDE, DUTY, FRAMES = .2, .6, 48
legs = []
for i, (seg, x) in enumerate(segments[:-1]):
    for s in (-1, 1):
        phase = (i * .09 + (0 if s > 0 else .5)) % 1
        legs.append((Leg(f'leg_{i}_{s}', (x, s * .16, .14), (x + .05, s * .48, .01), (.2, .24), (.025, .02, .01),
                         leg_mat, phase, (0, s * .3, 1)), i))

def wave(i, c):
    """Lateral body wave travelling from head to tail."""
    return .07 * math.sin(math.tau * (c * 2 - i * .07))

for frame in range(FRAMES + 1):
    c = frame / FRAMES
    for i, (seg, x) in enumerate(segments):
        key_loc(seg, frame, (x, wave(i, c), .16))
    key_loc(head, frame, (X0, wave(-1, c), .17))
    for leg, i in legs:
        leg.key(frame, c, STRIDE, DUTY, .07, root_offset=Vector((0, wave(i, c), 0)))

print('STRIDE_PX', stride_px(STRIDE, DUTY))
export('centipede', 'Walk', FRAMES)
