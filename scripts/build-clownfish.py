"""Build a 3D clownfish: a stout orange body with three black-edged white
bands, black-rimmed fins, a skinned waddling swim and busy rowing pectoral
fins (clownfish swim mostly with them). Run:
blender --background --python scripts/build-clownfish.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(83)
SECTIONS = [(1.0, .5, .02, .02), (.92, .5, .14, .18), (.7, .5, .24, .36), (.35, .5, .29, .46), (0, .5, .28, .46),
            (-.35, .5, .23, .38), (-.65, .5, .15, .24), (-.85, .5, .09, .15), (-1.0, .5, .07, .13)]
# White bands (body x centre, half width) with thin black edges.
BANDS = [(.53, .07), (-.04, .1), (-.84, .055)]
EDGE = .028


def band_texture(w=512, h=64):
    """u runs nose to tail (the loft's section index), v around the body."""
    sec_u = [i / (len(SECTIONS) - 1) for i in range(len(SECTIONS))]
    sec_x = [s[0] for s in SECTIONS]
    x = np.interp(np.arange(w) / (w - 1), sec_u, sec_x)
    shade = fractal(w)[:h] * .2 + .9
    orange = np.array((1, .38, .02))
    rgb = np.ones((h, w, 3)) * orange * shade[..., None]
    for cx, half in BANDS:
        d = np.abs(x - cx)
        rgb[:, d < half + EDGE] = (.03, .02, .02)
        rgb[:, d < half] = (.97, .96, .93)
    img = bpy.data.images.new('Clownfish bands', width=w, height=h)
    img.pixels.foreach_set(np.concatenate([rgb, np.ones((h, w, 1))], axis=2).astype(np.float32).ravel())
    img.pack()
    return img


skin = mat('Orange banded skin', (1, .38, .02), .35, image=band_texture())
fin = mat('Orange fin', (1, .42, .05), .4, alpha=.9)
edge = mat('Black fin edge', (.03, .02, .02), .4)
eye = mat('Orange iris', (.9, .45, .08), .2)
pupil = mat('Black pupil', (.01, .01, .01), .05)

BONES = [1.0, .45, -.1, -.6, -1.0]
body, rig = skinned_loft('Body', SECTIONS, skin, BONES)
bones = [b.name for b in rig.data.bones]


def on_bone(o, i):
    attach_to_bone(o, rig, bones[i])
    return o


def rimmed_fin(name, origin, outline, bone):
    on_bone(fan(name, origin, outline, fin), bone)
    on_bone(tube(name + ' edge', outline, .007, edge, sides=6), bone)


for s in (-1, 1):
    on_bone(ellipsoid('Eye', (.72, s * .2, .64), (.1, .08, .1), eye), 0)
    on_bone(ellipsoid('Pupil', (.75, s * .25, .65), (.065, .04, .065), pupil), 0)

# Dorsal fin: spiny front part, a notch, then the taller soft part.
rimmed_fin('Dorsal fin', (-.1, 0, .9), [(.45, 0, .9), (.36, 0, 1.1), (.18, 0, 1.14), (.02, 0, 1.08), (-.1, 0, 1.0),
                                        (-.26, 0, 1.2), (-.45, 0, 1.19), (-.6, 0, 1.03), (-.68, 0, .8)], 2)
rimmed_fin('Anal fin', (-.45, 0, .15), [(-.22, 0, .12), (-.32, 0, -.1), (-.5, 0, -.13), (-.66, 0, -.02), (-.72, 0, .28)], 3)
# Rounded tail fin.
tail = [(-.97 - .45 * math.cos(a), 0, .5 + .4 * math.sin(a)) for a in (-1.15 + 2.3 * i / 12 for i in range(13))]
rimmed_fin('Caudal fin', (-.95, 0, .5), [(-.95, 0, .36)] + tail + [(-.95, 0, .64)], 3)

# Pectoral and pelvic fins on hinges, rowing.
paddles = []
for s in (-1, 1):
    for x, z, size, b, amp in ((.42, .42, .5, 1, .55), (.3, .12, .3, 1, .25)):
        piv = pivot(f'fin_{x}_{s}', (x, s * .26, z))
        # Rounded paddle: a half-ellipse fanning out from the hinge.
        outline = [(0, 0, 0)] + [(-size * (.5 - .5 * math.cos(a)), s * (.04 + size * .5 * math.sin(a)), -.02 * math.sin(a))
                                 for a in (math.pi * i / 14 for i in range(15))] + [(0, 0, 0)]
        fan('Paired fin', (0, 0, 0), outline, fin, parent=piv)
        tube('Paired fin edge', outline[2:-2], .006, edge, parent=piv, sides=6)
        on_bone(piv, b)
        paddles.append((s, piv, piv.matrix_basis.to_quaternion(), amp))

FRAMES = 30  # 0.5 s per tail beat
for frame in range(FRAMES + 1):
    ph = frame / FRAMES * math.tau
    for i, (name, amp) in enumerate(zip(bones, (.03, .07, .12, .2))):
        key_bone(rig, name, frame, (0, 0, amp * math.sin(ph - i * 1.1)))
    for s, piv, rest, amp in paddles:
        key_rot_on(piv, frame, (s * amp * math.sin(ph * 2), 0, s * .35 * math.sin(ph * 2 + 1.2)), rest)
export('clownfish', 'Swim', FRAMES)
