"""Build a 3D kohaku koi with a skinned, undulating body: white scales with
large red-orange patches, a red head blotch, whisker barbels, a flowing
single tail and paddling pectoral fins. Run:
blender --background --python scripts/build-koi.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(53)
RED = (.9, .22, .04)
scale_tex = texture('Koi scales', (.95, .93, .88), (.82, .8, .76), (1, 1, .97), size=512, contrast=.15, scales=.5,
                    spots=(RED, 16, .07, .15))
skin = mat('Kohaku scaled skin', (.95, .93, .88), .35, image=scale_tex)
red = mat('Koi red patch', RED, .4)
belly = mat('Pearl belly', (.96, .95, .92), .4)
fin = mat('Translucent white fin', (.97, .95, .92), .4, alpha=.7)
fin_ray = mat('Fin ray', (.85, .5, .35), .5)
eye = mat('Silver iris', (.75, .72, .66), .15)
pupil = mat('Pupil', (.01, .01, .01), .05)

BONES = [1.5, .7, 0, -.6, -1.15, -1.55]
body, rig = skinned_loft('Body', [(1.55, .5, .02, .02), (1.45, .5, .2, .18), (1.15, .5, .34, .32), (.6, .5, .42, .42),
                                  (0, .5, .42, .42), (-.6, .5, .32, .32), (-1.1, .5, .18, .18), (-1.45, .5, .1, .1),
                                  (-1.6, .5, .07, .07)],
                         skin, BONES)
bones = [b.name for b in rig.data.bones]


def on_bone(o, i):
    attach_to_bone(o, rig, bones[i])
    return o


on_bone(ellipsoid('Head blotch', (1.12, 0, .74), (.26, .2, .1), red), 0)
on_bone(ellipsoid('Belly', (.2, 0, .2), (.9, .3, .2), belly), 1)
for s in (-1, 1):
    on_bone(ellipsoid('Eye', (1.25, s * .25, .6), (.07, .06, .07), eye), 0)
    on_bone(ellipsoid('Pupil', (1.28, s * .3, .61), (.04, .03, .04), pupil), 0)
    on_bone(tube('Barbel', [(1.52, s * .1, .42), (1.62, s * .18, .38), (1.66, s * .26, .36)], [.02, .014, .004], fin_ray), 0)

# Single broad tail fin on the last bone.
pts = [(-1.55 - .75 * t, .55 * math.sin(math.pi * t * .5) + .12 * t, .5) for t in (.2, .45, .7, 1)]
pts += [(-2.1, .2, .5), (-2.0, 0, .5), (-2.1, -.2, .5)]
pts += [(-1.55 - .75 * t, -.55 * math.sin(math.pi * t * .5) - .12 * t, .5) for t in (1, .7, .45, .2)]
on_bone(fan('Tail fin', (-1.5, 0, .5), [(-1.5, .05, .5)] + pts + [(-1.5, -.05, .5)], fin), 4)
for t in (-.5, -.25, 0, .25, .5):
    on_bone(tube('Tail ray', [(-1.52, 0, .505), (-2.15, t * .9, .51)], .008, fin_ray), 4)
dorsal = [(.6, 0, .9)] + [(.6 - 1.3 * t, 0, .9 + .22 * math.sin(math.pi * t ** .6)) for t in (.15, .35, .55, .75, .9, 1)]
on_bone(fan('Dorsal fin', (-.1, 0, .85), dorsal + [(-.8, 0, .8)], fin), 2)
paddles = []
for s in (-1, 1):
    for x, z, size, b in ((.75, .35, .55, 1), (-.4, .25, .38, 2)):
        piv = pivot(f'fin_{x}_{s}', (x, s * .38, z))
        fan('Paired fin', (0, 0, 0), [(-size * .2, s * size * .15, 0), (-size * .7, s * size * .55, -.03),
                                      (-size, s * size * .4, -.05), (-size * .8, s * .05, -.02), (0, 0, 0)], fin, parent=piv)
        on_bone(piv, b)
        paddles.append((s, piv, piv.matrix_basis.to_quaternion()))

FRAMES = 48  # 0.8 s per tail beat: slower and calmer than the goldfish
for frame in range(FRAMES + 1):
    ph = frame / FRAMES * math.tau
    for i, (name, amp) in enumerate(zip(bones, (.03, .06, .11, .18, .26))):
        key_bone(rig, name, frame, (0, 0, amp * math.sin(ph - i * 1.0)))
    for s, piv, rest in paddles:
        key_rot_on(piv, frame, (s * .3 * math.sin(ph * 2), 0, s * .2 * math.sin(ph * 2 + 1)), rest)
export('koi', 'Swim', FRAMES)
