"""Build an articulated 3D seven-spot ladybug (walking, wing cases closed).
Approximates image/animal/ladybug.png. Run:
blender --background --python scripts/build-ladybug.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(7)
red = mat('Glossy red elytra', (.62, .045, .02), .22, image=texture('Red lacquer', (.6, .05, .02), (.42, .02, .01), (.78, .1, .05), contrast=.2))
black = mat('Gloss black', (.012, .011, .011), .25)
cream = mat('Cream pronotum marks', (.86, .82, .7), .4)
leg_mat = mat('Dark leg chitin', (.03, .022, .02), .4)

# Domed wing cases with a fine center seam, and seven round spots.
def dome_z(x, y):
    q = (x + .12) ** 2 / .98 ** 2 + y * y / .86 ** 2
    return .42 + .5 * math.sqrt(max(0, 1 - q))

ellipsoid('Elytra dome', (-.12, 0, .42), (.98, .86, .5), red)
tube('Elytra seam', [(x, 0, dome_z(x, 0) + .004) for x in (.6, .4, .1, -.2, -.5, -.8, -1.0)], .011, black)
for x, y in [(.5, 0), (.2, .44), (-.32, .34), (-.6, .62), (.2, -.44), (-.32, -.34), (-.6, -.62)]:
    z = dome_z(x, y)
    r = .17 if x == .5 else .14
    ellipsoid('Spot', (x, y, z - .01), (r, r, .05), black, rot=(-y * .9, (x + .12) * .7, 0))
# Black pronotum with the two pale side patches, then the small head.
ellipsoid('Pronotum', (.72, 0, .4), (.3, .55, .26), black)
for s in (-1, 1):
    ellipsoid('Pronotum patch', (.8, s * .36, .47), (.14, .14, .1), cream)
ellipsoid('Head', (.98, 0, .33), (.17, .27, .16), black)
for s in (-1, 1):
    ellipsoid('Eye', (1.04, s * .16, .38), (.06, .06, .06), cream)
    tube('Antenna', [(1.1, s * .12, .37), (1.22, s * .2, .4), (1.3, s * .3, .38)], .012, leg_mat)
    ellipsoid('Mouthpart', (1.13, s * .05, .26), (.05, .04, .04), leg_mat)
ellipsoid('Underside', (-.05, 0, .28), (.85, .7, .14), black)

# Six legs in an alternating tripod gait, knees raised and splayed out.
STRIDE, DUTY, FRAMES = .34, .5, 40
legs = []
for s in (-1, 1):
    for i, (x, fx) in enumerate([(.45, .82), (.05, .12), (-.32, -.55)]):
        phase = 0 if (i % 2 == 0) == (s > 0) else .5
        legs.append(Leg(f'leg_{s}_{i}', (x, s * .3, .25), (fx, s * .95, .02), (.42, .46), (.05, .04, .022),
                        leg_mat, phase, (0, s * .4, 1)))
for frame in range(FRAMES + 1):
    for leg in legs:
        leg.key(frame, frame / FRAMES, STRIDE, DUTY, .1)

print('STRIDE_PX', stride_px(STRIDE, DUTY))
export('ladybug', 'Walk', FRAMES, reference='image/animal/ladybug.png')
