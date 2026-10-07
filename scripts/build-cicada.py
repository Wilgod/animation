"""Build an articulated 3D cicada in flight: broad head with wide-set eyes,
stout dark body and four clear, dark-veined flapping wings.
Approximates image/animal/cycle-fly.png. Run:
blender --background --python scripts/build-cicada.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(19)
body_tex = texture('Cicada body', (.12, .1, .075), (.04, .035, .03), (.3, .26, .17), contrast=.4, streak=.3)
body = mat('Dark olive body', (.12, .1, .075), .4, image=body_tex)
marks = mat('Olive thorax marks', (.36, .33, .18), .45)
eye = mat('Compound eye', (.16, .1, .06), .15)
leg_mat = mat('Leg', (.1, .085, .06), .45)
membrane = mat('Clear wing membrane', (.86, .88, .84), .15, alpha=.28)
vein = mat('Dark wing vein', (.08, .07, .05), .45)

loft('Abdomen', [(.12, .62, .05, .05), (0, .62, .36, .33), (-.4, .6, .42, .36), (-.8, .56, .36, .3),
                 (-1.1, .52, .2, .18), (-1.25, .5, .03, .03)], body)
for i, x in enumerate((-.15, -.38, -.6, -.82)):
    tube('Abdomen segment', [(x, -.38 + .03 * i, .62), (x - .03, 0, .95 - .05 * i), (x, .38 - .03 * i, .62)], .02, leg_mat)
ellipsoid('Thorax', (.42, 0, .72), (.45, .44, .34), body)
tube('Thorax mark', [(.62, -.18, .98), (.38, -.08, 1.04), (.3, 0, 1.0), (.38, .08, 1.04), (.62, .18, .98)], .03, marks)
ellipsoid('Head', (.92, 0, .7), (.2, .44, .2), body)
for s in (-1, 1):
    ellipsoid('Eye', (.92, s * .45, .76), (.15, .13, .14), eye)
    ellipsoid('Ocellus', (1.0, s * .07, .88), (.03, .03, .03), marks)
    tube('Antenna', [(1.08, s * .2, .76), (1.2, s * .28, .8)], .012, leg_mat)
    for i, x in enumerate((.65, .4, .15)):
        tube('Tucked leg', [(x, s * .22, .45), (x - .1, s * .4, .3), (x - .45, s * .32, .32)], [.04, .035, .02], leg_mat)
tube('Rostrum', [(1.02, 0, .55), (.8, 0, .38), (.4, 0, .35)], [.04, .03, .015], leg_mat)

# Four wings on hinges; forewings long and pointed, hindwings shorter.
pivots = []
for s in (-1, 1):
    for hind in (False, True):
        piv = pivot(('hind' if hind else 'fore') + f'_wing_{s}', (.3 if not hind else .15, s * .3, 1.0))
        length, width = (1.35, .3) if hind else (2.3, .42)
        outline = []
        for i in range(41):
            t = i / 40
            # leading edge out along the span, back along the trailing edge
            if t <= .5:
                u = t * 2
                outline.append((-length * .78 * u + width * .5 * math.sin(math.pi * u), s * length * .55 * u, .02 * math.sin(math.pi * u)))
            else:
                u = (1 - t) * 2
                outline.append((-length * .78 * u - width * math.sin(math.pi * u) ** .8, s * length * .38 * u, .01))
        fan('Wing membrane', (0, 0, 0), outline, membrane, parent=piv)
        tube('Wing rim', outline, .01, vein, parent=piv)
        for t in (.3, .5, .68, .85):
            a = outline[int(t * 20)]
            b = outline[40 - int(t * 20)]
            tube('Cross vein', [a, ((a[0] + b[0]) / 2 + .05, (a[1] + b[1]) / 2, .02), b], .007, vein, parent=piv)
        tube('Main vein', [(0, 0, 0), outline[10], outline[20]], .013, vein, parent=piv)
        pivots.append((s, hind, piv))

FRAMES = 12
for frame in range(FRAMES + 1):
    ph = frame / FRAMES * math.tau
    for s, hind, piv in pivots:
        key_rot(piv, frame, (s * (.2 + .75 * math.sin(ph + (.25 if hind else 0))), 0, s * (-.12 if hind else .05)))
export('cicada', 'Fly', FRAMES, reference='image/animal/cycle-fly.png')
