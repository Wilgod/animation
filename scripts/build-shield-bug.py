"""Build an articulated 3D shield bug (stink bug): a flat shield-shaped
body with pointed shoulders, the triangular scutellum, overlapping dark wing
tips, and a waddling six-leg tripod gait. Run:
blender --background --python scripts/build-shield-bug.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(101)
shell = mat('Shield bug shell', (.22, .5, .1), .4,
            image=texture('Shield bug punctures', (.22, .5, .1), (.13, .34, .05), (.36, .62, .2), contrast=.4,
                          spots=((.12, .3, .05), 60, .004, .01)))
wing_tip = mat('Shield bug wing tip', (.12, .1, .06), .4)
leg_mat = mat('Shield bug leg', (.24, .42, .1), .5)
eye = mat('Shield bug eye', (.25, .08, .04), .25)

def shield_outline(z):
    pts = [(.62, 0), (.6, .25), (.42, .58), (.3, .55), (0, .5), (-.5, .44), (-.85, .3), (-1.0, .12), (-1.02, 0)]
    return [(x, y, z) for x, y in pts] + [(x, -y, z) for x, y in reversed(pts[1:-1])]

# Shield body: a filled outline lifted into a gentle dome.
outline = shield_outline(.36)
verts = [(-.15, 0, .48)] + outline
faces = [(0, i, i % len(outline) + 1) for i in range(1, len(outline) + 1)]
body = mesh_object('Shield body', verts, faces, shell)
body.modifiers.new('thickness', 'SOLIDIFY').thickness = .12
ellipsoid('Belly', (-.2, 0, .26), (.75, .42, .12), leg_mat)
fan('Scutellum', (.25, 0, .5), [(.25, .32, .49), (-.2, .2, .5), (-.55, .02, .5), (-.55, -.02, .5), (-.2, -.2, .5), (.25, -.32, .49)], shell)
fan('Wing membrane tips', (-.6, 0, .49), [(-.6, .35, .47), (-.85, .28, .48), (-.98, 0, .48), (-.85, -.28, .48), (-.6, -.35, .47)], wing_tip)
ellipsoid('Head', (.75, 0, .38), (.16, .18, .08), shell)
for s in (-1, 1):
    ellipsoid('Eye', (.78, s * .17, .4), (.04, .04, .04), eye)
    tube('Antenna', [(.88, s * .08, .38), (1.1, s * .2, .4), (1.3, s * .34, .38), (1.45, s * .44, .35)], [.016, .014, .012, .01], leg_mat, sides=6)

STRIDE, DUTY, FRAMES = .3, .5, 36
legs = []
for s in (-1, 1):
    for i, (x, fx, fy) in enumerate([(.4, .95, .8), (0, .05, .95), (-.35, -.9, .85)]):
        phase = 0 if (i % 2 == 0) == (s > 0) else .5
        legs.append(Leg(f'leg_{s}_{i}', (x, s * .25, .24), (fx, s * fy, .02), (.42, .5), (.04, .03, .014),
                        leg_mat, phase, (0, s * .5, 1)))
for frame in range(FRAMES + 1):
    for leg in legs:
        leg.key(frame, frame / FRAMES, STRIDE, DUTY, .1)

print('STRIDE_PX', stride_px(STRIDE, DUTY))
export('shield-bug', 'Walk', FRAMES)
