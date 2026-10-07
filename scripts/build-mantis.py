"""Build an articulated 3D praying mantis: four walking legs, folded raptorial
forelegs and a gentle rocking sway. Approximates
image/animal/praying-mantis-walk.png. Run:
blender --background --python scripts/build-mantis.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(5)
green_tex = texture('Mantis green', (.3, .52, .14), (.17, .34, .07), (.5, .68, .24), contrast=.3, streak=.5)
skin = mat('Leaf green body', (.3, .52, .14), .55, image=green_tex)
pale = mat('Pale green legs', (.4, .6, .2), .55)
wing = mat('Folded wing', (.27, .47, .12), .5)
vein = mat('Wing vein', (.22, .4, .1), .6)
eye = mat('Compound eye', (.45, .55, .22), .3)
pupil = mat('Pseudopupil', (.05, .06, .03), .3)

# Long abdomen covered by narrow folded wings, slim prothorax "neck", and the
# triangular head with large side eyes.
loft('Abdomen', [(.15, .5, .02, .02), (0, .5, .2, .16), (-.5, .5, .27, .2), (-1.1, .48, .26, .19),
                 (-1.6, .46, .19, .15), (-1.95, .45, .08, .08), (-2.05, .45, .02, .02)], skin)
for s in (-1, 1):
    fan('Forewing', (.12, s * .03, .64),
        [(.05, s * .16, .63), (-.6, s * .22, .62), (-1.3, s * .17, .6), (-1.85, s * .05, .56), (-1.9, 0, .56)], wing)
    tube('Wing vein', [(.1, s * .12, .645), (-.8, s * .18, .63), (-1.75, s * .06, .575)], .01, vein)
ellipsoid('Mesothorax', (.25, 0, .5), (.3, .17, .14), skin)
loft('Prothorax', [(.45, .53, .02, .02), (.55, .54, .09, .08), (.9, .58, .06, .06), (1.2, .62, .08, .07), (1.32, .63, .02, .02)], skin)
ellipsoid('Head', (1.45, 0, .66), (.13, .2, .1), skin)
ellipsoid('Face', (1.56, 0, .62), (.07, .1, .06), pale)
for s in (-1, 1):
    ellipsoid('Eye', (1.47, s * .22, .7), (.09, .08, .09), eye)
    ellipsoid('Pseudopupil', (1.53, s * .26, .72), (.025, .025, .025), pupil)
    tube('Antenna', [(1.55, s * .07, .74), (1.85, s * .2, .82), (2.15, s * .36, .78), (2.3, s * .46, .72)], [.012, .01, .007, .004], skin)

# Folded raptorial forelegs held up under the head, swaying while walking.
fore = []
for s in (-1, 1):
    fore.append((s, [link(f'raptor_{s}_{j}', r1, r2, pale) for j, (r1, r2) in enumerate([(.05, .045), (.07, .045), (.04, .02)])]))

# Mid and hind legs walk in diagonal pairs.
STRIDE, DUTY, FRAMES = .45, .55, 48
legs = []
for s in (-1, 1):
    legs.append(Leg(f'mid_{s}', (.2, s * .12, .45), (.55, s * 1.3, .01), (.85, 1.0), (.04, .03, .015), pale,
                    0 if s > 0 else .5, (0, s * .3, 1)))
    legs.append(Leg(f'hind_{s}', (-.05, s * .12, .45), (-1.3, s * 1.25, .01), (1.05, 1.25), (.04, .03, .015), pale,
                    .5 if s > 0 else 0, (0, s * .3, 1)))
for frame in range(FRAMES + 1):
    c = frame / FRAMES
    for leg in legs:
        leg.key(frame, c, STRIDE, DUTY, .16)
    sway = .06 * math.sin(c * math.tau * 2)
    for s, links in fore:
        coxa = Vector((1.18, s * .08, .55))
        femur_end = coxa + Vector((.32, s * (.18 + sway), .12))
        tibia_end = femur_end + Vector((.42, s * (.05 + sway * .5), .1))
        claw = tibia_end + Vector((-.32, -s * .03, -.12))
        for o, (a, b) in zip(links, [(coxa, femur_end), (femur_end, tibia_end), (tibia_end, claw)]):
            pose_link(o, a, b, frame)

print('STRIDE_PX', stride_px(STRIDE, DUTY))
export('mantis', 'Walk', FRAMES, reference='image/animal/praying-mantis-walk.png')
