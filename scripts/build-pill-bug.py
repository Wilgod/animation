"""Build an articulated 3D pill bug (woodlouse): an oval dome of overlapping
grey armour plates, short antennae that tap the ground and seven pairs of
short legs pattering underneath. Run:
blender --background --python scripts/build-pill-bug.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(97)
armour = mat('Pill bug armour', (.36, .36, .38), .4,
             image=texture('Pill bug plates', (.36, .36, .38), (.22, .22, .24), (.52, .52, .54), contrast=.35, spots=((.62, .6, .55), 30, .01, .025)))
under = mat('Pill bug underside', (.2, .2, .21), .5)
leg_mat = mat('Pill bug leg', (.42, .4, .4), .5)
eye = mat('Pill bug eye', (.02, .02, .02), .2)

# Overlapping plates: each a flattened ellipsoid following the dome profile.
ellipsoid('Underside', (-.05, 0, .14), (.9, .48, .08), under)
for k in range(9):
    x = .65 - k * .17
    t = (x + .05) / .95
    w = .5 * math.sqrt(max(.05, 1 - t * t))
    h = .32 * math.sqrt(max(.05, 1 - t * t))
    ellipsoid('Armour plate', (x, 0, .14 + h * .2), (.12, w, h), armour)
ellipsoid('Tail plate', (-.88, 0, .18), (.1, .2, .07), armour)
ellipsoid('Head', (.85, 0, .18), (.1, .2, .08), armour)
antennae = []
for s in (-1, 1):
    ellipsoid('Eye', (.86, s * .15, .22), (.03, .03, .02), eye)
    root = pivot('antenna', (.92, s * .12, .17))
    tube('Antenna', [(0, 0, 0), (.15, s * .12, .02), (.3, s * .2, -.04), (.42, s * .24, -.12)], [.025, .02, .015, .01], leg_mat, root, sides=6)
    antennae.append((root, s))

STRIDE, DUTY, FRAMES = .16, .5, 30
legs = []
for s in (-1, 1):
    for i in range(7):
        x = .55 - i * .17
        phase = (i * .5 + (0 if s > 0 else .5)) % 1
        legs.append(Leg(f'leg_{s}_{i}', (x, s * .3, .1), (x + .03, s * .58, .01), (.18, .2), (.025, .02, .01),
                        leg_mat, phase, (0, s * .3, 1)))
for frame in range(FRAMES + 1):
    c = frame / FRAMES
    for leg in legs:
        leg.key(frame, c, STRIDE, DUTY, .06)
    for root, s in antennae:
        key_rot(root, frame, (0, .2 * math.sin(c * math.tau * 2 + s), s * .15 * math.sin(c * math.tau)))

print('STRIDE_PX', stride_px(STRIDE, DUTY))
export('pill-bug', 'Walk', FRAMES)
