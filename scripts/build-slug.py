"""Build a 3D garden slug: a long soft body with a wrinkled skin texture,
the mantle saddle with its breathing pore, a pale foot fringe and four
tentacles, with a gliding crawl clip like the snail's. Run:
blender --background --python scripts/build-slug.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(103)
skin = mat('Slug skin', (.42, .25, .1), .35,
           image=texture('Slug wrinkles', (.42, .25, .1), (.24, .13, .05), (.58, .38, .18), contrast=.45, streak=.6))
mantle_mat = mat('Slug mantle', (.36, .2, .08), .3,
                 image=texture('Slug mantle grain', (.36, .2, .08), (.2, .1, .04), (.5, .3, .14), contrast=.5))
sole = mat('Slug foot fringe', (.62, .48, .3), .45)
horn = mat('Slug tentacle', (.34, .2, .08), .4)
eye = mat('Slug eye', (.01, .01, .01), .2)

body = loft('Slug body', [(-1.75, .06, .02, .02), (-1.5, .1, .12, .07), (-1.0, .14, .24, .12), (-.3, .17, .3, .16),
                          (.4, .19, .29, .18), (.95, .2, .24, .17), (1.25, .18, .16, .13), (1.35, .16, .03, .03)], skin)
foot = loft('Foot fringe', [(-1.78, .03, .02, .01), (-1.4, .04, .17, .03), (-.4, .05, .35, .04), (.5, .05, .34, .04),
                            (1.2, .06, .2, .03), (1.37, .07, .03, .02)], sole)
mantle = ellipsoid('Mantle', (.55, 0, .3), (.55, .3, .12), mantle_mat)
ellipsoid('Breathing pore', (.52, .27, .33), (.04, .02, .03), eye)

tentacles = []
for s in (-1, 1):
    for upper in (True, False):
        root = pivot(('Eye stalk' if upper else 'Sensory tentacle') + (' left' if s > 0 else ' right'), (1.25, s * .09, .26 if upper else .14))
        pts = [(0, 0, 0), (.1, s * .07, .17), (.2, s * .13, .33), (.26, s * .16, .42)] if upper else [(0, 0, 0), (.12, s * .1, .02), (.24, s * .16, .05)]
        tube('Tentacle', pts, [.045, .035, .026, .02] if upper else [.035, .024, .012], horn, root, sides=12)
        if upper:
            ellipsoid('Eye', Vector(pts[-1]) + Vector((.02, 0, .01)), (.025, .025, .025), eye, root)
        tentacles.append((root, s, upper))

FRAMES = 120
for frame in range(FRAMES + 1):
    phase = frame / FRAMES * math.tau
    for root, s, upper in tentacles:
        key_rot(root, frame, (s * .08 * math.sin(phase), .1 * math.sin(phase + s * .5), s * .06 * math.sin(phase + (0 if upper else 1))))
    for part in (body, foot, mantle):
        part.scale = (1 + .02 * math.sin(phase), 1 - .015 * math.sin(phase), 1)
        part.keyframe_insert(data_path='scale', frame=frame)

print('STRIDE_PX', stride_px(.1, 1))
export('slug', 'Walk', FRAMES)
