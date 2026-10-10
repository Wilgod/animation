"""Build an articulated 3D rhinoceros beetle (Japanese kabutomushi): glossy
chestnut wing cases, a short thoracic horn and the long forked head horn,
walking slowly on six spiny legs in a tripod gait. Run:
blender --background --python scripts/build-rhino-beetle.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(53)
shell = mat('Chestnut beetle shell', (.2, .075, .03), .2,
            image=texture('Beetle lacquer', (.2, .075, .03), (.1, .035, .012), (.32, .14, .06), contrast=.25, streak=.3))
dark = mat('Dark beetle chitin', (.06, .03, .015), .3)
leg_mat = mat('Beetle leg chitin', (.05, .025, .012), .35)
eye = mat('Beetle eye', (.01, .008, .006), .2)

# Domed wing cases with a center seam.
def dome_z(x, y):
    q = (x + .35) ** 2 / 1.05 ** 2 + y * y / .64 ** 2
    return .45 + .42 * math.sqrt(max(0, 1 - q))

ellipsoid('Elytra', (-.35, 0, .45), (1.05, .64, .42), shell)
tube('Elytra seam', [(x, 0, dome_z(x, 0) + .004) for x in (.62, .3, 0, -.4, -.8, -1.2, -1.36)], .012, dark)
ellipsoid('Underside', (-.3, 0, .3), (1.0, .58, .14), dark)

# Pronotum with its short forward horn, small head and the long forked horn.
ellipsoid('Pronotum', (.68, 0, .5), (.38, .58, .3), shell)
tube('Thoracic horn', [(.8, 0, .76), (1.0, 0, .84), (1.16, 0, .82)], [.07, .05, .02], shell, sides=10)
ellipsoid('Head', (1.05, 0, .36), (.2, .3, .15), dark)
for s in (-1, 1):
    ellipsoid('Eye', (1.08, s * .26, .38), (.06, .05, .05), eye)
    tube('Antenna', [(1.2, s * .18, .34), (1.3, s * .3, .35), (1.36, s * .36, .33)], .014, leg_mat, sides=6)
horn = [(1.15, 0, .42), (1.45, 0, .5), (1.75, 0, .65), (1.98, 0, .82), (2.1, 0, .9)]
tube('Head horn', horn, [.13, .11, .09, .07, .055], shell, sides=12)
for s in (-1, 1):
    tube('Horn fork', [(2.08, 0, .88), (2.22, s * .1, .96), (2.3, s * .17, 1.0)], [.045, .03, .012], shell, sides=8)

# Six stout spiny legs, slow tripod gait.
STRIDE, DUTY, FRAMES = .32, .55, 48
legs = []
for s in (-1, 1):
    for i, (x, fx, fy) in enumerate([(.75, 1.35, 1.0), (.25, .2, 1.15), (-.25, -.95, 1.05)]):
        phase = 0 if (i % 2 == 0) == (s > 0) else .5
        legs.append(Leg(f'leg_{s}_{i}', (x, s * .35, .3), (fx, s * fy, .02), (.55, .65), (.065, .05, .022),
                        leg_mat, phase, (0, s * .5, 1)))
for frame in range(FRAMES + 1):
    for leg in legs:
        leg.key(frame, frame / FRAMES, STRIDE, DUTY, .1)

print('STRIDE_PX', stride_px(STRIDE, DUTY))
export('rhino-beetle', 'Walk', FRAMES)
