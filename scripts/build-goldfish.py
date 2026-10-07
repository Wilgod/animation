"""Build a 3D goldfish with a skinned, undulating body, flowing double tail
and paddling pectoral fins. Approximates image/animal/goldfish-swim.png. Run:
blender --background --python scripts/build-goldfish.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(23)
scale_tex = texture('Goldfish scales', (.95, .36, .04), (.75, .2, .02), (1, .6, .2), size=512, contrast=.25, scales=.6)
skin = mat('Orange scaled skin', (.95, .36, .04), .35, image=scale_tex)
belly = mat('Pale gold belly', (1, .62, .25), .4)
fin = mat('Translucent orange fin', (1, .42, .08), .4, alpha=.72)
fin_ray = mat('Fin ray', (.9, .3, .03), .5)
eye = mat('Gold iris', (.85, .55, .15), .15)
pupil = mat('Pupil', (.01, .01, .01), .05)

BONES = [1.05, .45, -.1, -.6, -1.05]
body, rig = skinned_loft('Body', [(1.08, .5, .02, .02), (.98, .5, .18, .2), (.72, .51, .32, .38), (.3, .52, .37, .5),
                                  (-.1, .52, .33, .46), (-.5, .5, .21, .3), (-.85, .5, .1, .15), (-1.05, .5, .07, .09)],
                         skin, BONES)
bones = [b.name for b in rig.data.bones]


def on_bone(o, i):
    attach_to_bone(o, rig, bones[i])
    return o


on_bone(ellipsoid('Belly', (.25, 0, .2), (.6, .28, .2), belly), 1)
for s in (-1, 1):
    on_bone(ellipsoid('Eye', (.8, s * .29, .66), (.095, .075, .095), eye), 0)
    on_bone(ellipsoid('Pupil', (.84, s * .35, .68), (.05, .035, .05), pupil), 0)
    on_bone(ellipsoid('Gill cover', (.58, s * .3, .52), (.05, .06, .26), belly, rot=(0, 0, s * .2)), 0)

# Long double caudal fin (two lobes) on the last bone.
for s in (-1, 1):
    pts = []
    for i in range(13):
        t = i / 12
        pts.append((-1.0 - 1.25 * math.sin(math.pi / 2 * t), s * (.05 + .75 * math.sin(math.pi * t * .9)), .5 + .04 * math.sin(math.pi * t)))
    pts.append((-1.9, s * .05, .5))
    on_bone(fan('Caudal lobe', (-.98, 0, .5), pts, fin), 3)
    for t in (.25, .5, .75):
        on_bone(tube('Caudal ray', [(-.98, 0, .505), (-1.0 - 1.1 * t, s * .6 * t, .51)], .008, fin_ray), 3)
dorsal = [(.25, 0, .98)] + [(.25 - .9 * t, 0, .98 + .35 * math.sin(math.pi * t ** .7)) for t in (.2, .4, .6, .8, 1)]
on_bone(fan('Dorsal fin', (-.3, 0, .9), dorsal + [(-.65, 0, .88)], fin), 2)
# Paddling pectoral and pelvic fins on small hinges.
paddles = []
for s in (-1, 1):
    for x, z, size, b in ((.48, .38, .6, 1), (-.25, .28, .42, 2)):
        piv = pivot(f'fin_{x}_{s}', (x, s * .33, z))
        fan('Paired fin', (0, 0, 0), [(-size * .2, s * size * .15, 0), (-size * .7, s * size * .55, -.03),
                                      (-size, s * size * .4, -.05), (-size * .8, s * .05, -.02), (0, 0, 0)], fin, parent=piv)
        on_bone(piv, b)
        paddles.append((s, piv, piv.matrix_basis.to_quaternion()))

FRAMES = 36  # 0.6 s per tail beat
for frame in range(FRAMES + 1):
    ph = frame / FRAMES * math.tau
    for i, (name, amp) in enumerate(zip(bones, (.04, .09, .16, .26))):
        key_bone(rig, name, frame, (0, 0, amp * math.sin(ph - i * 1.1)))
    for s, piv, rest in paddles:
        key_rot_on(piv, frame, (s * .35 * math.sin(ph * 2), 0, s * .25 * math.sin(ph * 2 + 1)), rest)
export('goldfish', 'Swim', FRAMES, reference='image/animal/goldfish-swim.png')
