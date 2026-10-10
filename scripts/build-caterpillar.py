"""Build an articulated 3D caterpillar: a chain of plump body segments with
yellow side spots and dark rings, a round head with short antennae, and a
crawl clip where a bunching wave runs from tail to head (each segment
swells as it lifts) while the head sways. Run:
blender --background --python scripts/build-caterpillar.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(59)
skin = mat('Caterpillar green skin', (.3, .58, .14), .55,
           image=texture('Caterpillar skin', (.3, .58, .14), (.2, .42, .08), (.45, .7, .24), contrast=.25))
spot = mat('Caterpillar yellow spot', (.9, .78, .12), .5)
ring = mat('Caterpillar dark band', (.05, .07, .03), .5)
head_mat = mat('Caterpillar head capsule', (.24, .44, .1), .4)
eye = mat('Caterpillar eye', (.01, .01, .01), .2)
leg_mat = mat('Caterpillar proleg', (.4, .6, .2), .6)

N = 11
GAP = .23
segments = []
for i in range(N):
    x0 = .95 - i * GAP
    taper = 1 - max(0, i - 7) * .1
    r = .24 * taper
    seg = pivot(f'segment_{i}', (x0, 0, r * .95))
    ellipsoid('Segment', (0, 0, 0), (.2, r, r * .95), skin, seg)
    if i % 2 == 0:  # dark back dots along the spine
        ellipsoid('Back dot', (0, 0, r * .9), (.05, .05, .04), ring, seg)
    for s in (-1, 1):
        ellipsoid('Side spot', (0, s * r * .82, r * .35), (.06, .03, .06), spot, seg)
        if 2 <= i <= 4 or 7 <= i <= 9:  # stubby prolegs / true legs
            cone('Proleg', (0, s * r * .55, -r * .6), (0, s * r * .7, -r * .95), .05, .035, leg_mat, seg, sides=8)
    segments.append((seg, x0, r))
# Tail horn on the last segment.
last, _, lr = segments[-1]
tube('Tail horn', [(-.05, 0, lr * .7), (-.18, 0, lr * 1.3), (-.22, 0, lr * 1.6)], [.035, .02, .006], ring, last, sides=6)

head = pivot('head', (1.18, 0, .22))
ellipsoid('Head capsule', (0, 0, 0), (.17, .2, .19), head_mat, head)
for s in (-1, 1):
    ellipsoid('Eye', (.1, s * .1, .06), (.03, .03, .03), eye, head)
    tube('Antenna', [(.13, s * .06, .12), (.22, s * .1, .2), (.28, s * .14, .23)], [.02, .012, .006], head_mat, head, sides=6)

# A bunching wave runs from tail to head: as it passes, a segment slides
# forward towards its neighbour, lifts and swells; the head sways.
FRAMES, BUNCH = 60, .055
for frame in range(FRAMES + 1):
    c = frame / FRAMES
    for i, (seg, x0, r) in enumerate(segments):
        w = math.sin(math.tau * (c + i / N * .9))
        lift = max(0, w)
        key_loc(seg, frame, (x0 + BUNCH * w, .02 * math.sin(math.tau * c + i * .4), r * .95 + .08 * lift))
        seg.scale = (1 - .1 * lift, 1 + .08 * lift, 1 + .08 * lift)
        seg.keyframe_insert(data_path='scale', frame=frame)
    key_loc(head, frame, (1.18 + BUNCH * math.sin(math.tau * c), .03 * math.sin(math.tau * c), .22 + .03 * max(0, math.sin(math.tau * c))))
    key_rot(head, frame, (0, -.12 * max(0, math.sin(math.tau * c)), .2 * math.sin(math.tau * c)))

print('STRIDE_PX', stride_px(BUNCH * 4, 1))
export('caterpillar', 'Walk', FRAMES)
