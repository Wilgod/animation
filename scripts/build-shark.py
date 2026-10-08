"""Build a 3D blacktip reef shark facing +X: a sleek grey body, white
underneath, with gill slits, swept pectoral fins, a tall first dorsal fin
and a heterocercal tail, every fin tipped black. A six-bone spine gives the
slow S-curve swim, the wave growing toward the tail. Run:
blender --background --python scripts/build-shark.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(149)
SECTIONS = [(1.5, .5, .02, .02), (1.42, .49, .1, .07), (1.25, .5, .18, .13), (1.0, .5, .24, .19), (.6, .5, .27, .23),
            (.2, .5, .26, .22), (-.2, .5, .21, .18), (-.6, .5, .14, .12), (-.95, .5, .08, .075), (-1.2, .5, .05, .05),
            (-1.3, .5, .04, .045)]


def countershaded(w=512, h=128):
    """u runs nose to tail, v around the body (v < .5 is the upper half):
    grey back fading to a white belly, with five gill slits on each side."""
    v = (np.arange(h) + .5) / h
    up = np.sin(v * math.tau)
    blend = np.clip(up * 3 + .35, 0, 1)[:, None, None]  # white line sits a little below the flank
    shade = fractal(w)[:h, :, None] * .14 + .93
    grey = np.array((.42, .45, .48)) * shade
    rgb = grey * blend + np.array((.93, .93, .9)) * (1 - blend)
    sec_u = [i / (len(SECTIONS) - 1) for i in range(len(SECTIONS))]
    x = np.interp(np.arange(w) / (w - 1), sec_u, [s[0] for s in SECTIONS])
    for gx in (.88, .82, .76, .7, .64):
        cols = np.abs(x - gx) < .008
        for side in (0, .5):  # the two flanks
            rows = np.abs(((v - side + .5) % 1) - .5) < .07
            rgb[np.ix_(rows, cols)] *= .45
    img = bpy.data.images.new('Shark countershading', width=w, height=h)
    img.pixels.foreach_set(np.concatenate([rgb, np.ones((h, w, 1))], axis=2).astype(np.float32).ravel())
    img.pack()
    return img


skin = mat('Grey shark skin', (.42, .45, .48), .4, image=countershaded())
fin = mat('Grey fin', (.13, .14, .16), .5)  # dark: flat, upward-facing fins catch the full top light
tip = mat('Black fin tip', (.04, .04, .05), .4)
eye = mat('Dark eye', (.03, .03, .03), .1)

BONES = [1.5, .8, .2, -.35, -.85, -1.3]
body, rig = skinned_loft('Body', SECTIONS, skin, BONES)
bones = [b.name for b in rig.data.bones]


def on_bone(o, i):
    attach_to_bone(o, rig, bones[i])
    return o


def tipped_fin(name, root_a, root_b, apex, bone, tip_frac=.28, parent=None, thick=0.0):
    """Triangular fin from a root chord to a swept apex, the outer part black."""
    a, b, c = Vector(root_a), Vector(root_b), Vector(apex)
    k = 1 - tip_frac
    a2, b2 = a.lerp(c, k), b.lerp(c, k)
    pts = [a + (c - a) * t + (b - a) * .18 * math.sin(math.pi * t) for t in (0, .3, .55)] + [a2]
    # Upright fins get a little thickness so they still read as a sliver
    # from directly above, as in drone footage.
    grey = fan(name, tuple(b), [tuple(p) for p in pts] + [tuple(b2), tuple(b)], fin, parent=parent, thickness=thick)
    black = fan(name + ' tip', tuple(c), [tuple(a2), tuple(b2.lerp(a2, .5) + (c - b2) * .05), tuple(b2)], tip,
                parent=parent, thickness=thick)
    if parent is None:
        on_bone(grey, bone)
        on_bone(black, bone)
    return grey, black


for s in (-1, 1):
    on_bone(ellipsoid('Eye', (1.12, s * .17, .58), (.035, .02, .03), eye), 0)

# Pectoral fins on hinges so they can trim slightly, swept back and out.
pectorals = []
for s in (-1, 1):
    piv = pivot(f'Pectoral {s}', (.6, s * .2, .38))
    tipped_fin('Pectoral fin', (.16, 0, 0), (-.28, 0, 0), (-.5, s * .72, -.1), 1, parent=piv)
    on_bone(piv, 1)
    pectorals.append((s, piv, piv.matrix_basis.to_quaternion()))
tipped_fin('First dorsal fin', (.32, 0, .7), (-.08, 0, .68), (-.22, 0, 1.18), 2, thick=.035)
tipped_fin('Second dorsal fin', (-.78, 0, .56), (-.92, 0, .55), (-.98, 0, .68), 4, tip_frac=.4)
tipped_fin('Anal fin', (-.75, 0, .42), (-.88, 0, .43), (-.95, 0, .3), 4, tip_frac=.4)
for s in (-1, 1):
    tipped_fin('Pelvic fin', (-.42, s * .08, .32), (-.56, s * .06, .33), (-.68, s * .26, .26), 3, tip_frac=.35)
# Heterocercal tail: long upper lobe, shorter lower lobe, black-edged.
tipped_fin('Upper caudal lobe', (-1.22, 0, .52), (-1.32, 0, .5), (-1.85, 0, 1.12), 4, tip_frac=.25, thick=.045)
tipped_fin('Lower caudal lobe', (-1.26, 0, .48), (-1.34, 0, .5), (-1.58, 0, .12), 4, tip_frac=.35, thick=.035)

FRAMES = 72  # 1.2 s per tail beat
for frame in range(FRAMES + 1):
    ph = frame / FRAMES * math.tau
    for i, (name, amp) in enumerate(zip(bones, (.02, .05, .09, .14, .22))):
        key_bone(rig, name, frame, (0, 0, amp * math.sin(ph - i * .9)))
    for s, piv, rest in pectorals:
        key_rot_on(piv, frame, (s * .06 * math.sin(ph), 0, 0), rest)
export('shark', 'Swim', FRAMES)
