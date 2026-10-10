"""Build an articulated 3D swallowtail butterfly in flight: yellow wings
with black veins stripes and borders, yellow lunules along the fore-wing
edge, blue crescents and an orange eye-spot on the hind wings and the long
hind-wing tails, gliding with slow deep wingbeats. Run:
blender --background --python scripts/build-swallowtail.py"""
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from insect import *

reset(127)
YELLOW, BLACK = np.array((.95, .78, .2)), np.array((.03, .03, .03))


def wing_pattern(name, hind, size=256):
    """Swallowtail pattern in membrane_wing UV space: u across the chord
    (1 = leading edge), v along the span (1 = tip)."""
    v, u = np.mgrid[0:size, 0:size] / (size - 1)
    rgb = np.ones((size, size, 3)) * YELLOW
    black = np.zeros((size, size), bool)
    if not hind:
        black |= u > .82                                     # leading edge
        black |= v > .78                                     # outer border
        for c in (.18, .38, .58):                            # diagonal stripes
            black |= (abs(v - c - (1 - u) * .08) < .035) & (u > .25)
        black |= abs(u - .5) < .02                           # vein lines
    else:
        black |= v > .62
        black |= u < .1
        black |= abs(u - .55) < .02
    rgb[black] = BLACK
    if not hind:
        for c in np.linspace(.15, .75, 6):                   # yellow lunules in the border
            rgb[((u - c) ** 2 + (v - .9) ** 2) < .0025] = YELLOW
    else:
        for c in np.linspace(.2, .8, 5):                     # blue crescents
            rgb[((u - c) ** 2 + (v - .72) ** 2) < .0018] = (.2, .45, .9)
        rgb[((u - .2) ** 2 + (v - .68) ** 2) < .004] = (.95, .35, .08)  # orange eye-spot
    rgba = np.concatenate([rgb, np.ones((size, size, 1))], axis=2)
    img = bpy.data.images.new(name, width=size, height=size)
    img.pixels.foreach_set(rgba.astype(np.float32).ravel())
    img.pack()
    return img


fore_mat = mat('Swallowtail fore wing scales', tuple(YELLOW), .8, image=wing_pattern('Fore wing pattern', False))
hind_mat = mat('Swallowtail hind wing scales', tuple(YELLOW), .8, image=wing_pattern('Hind wing pattern', True))
body = mat('Swallowtail body', (.04, .035, .03), .6)
stripe = mat('Swallowtail body stripe', (.9, .78, .3), .6)
eye = mat('Swallowtail eye', (.03, .03, .03), .2)

ellipsoid('Thorax', (0, 0, .52), (.3, .14, .15), body)
loft('Abdomen', [(-.2, .5, .02, .02), (-.3, .5, .1, .1), (-.8, .48, .08, .08), (-1.05, .47, .02, .02)], body, subdiv=1)
for s in (-1, 1):
    tube('Abdomen stripe', [(-.25, s * .09, .52), (-.6, s * .08, .51), (-.95, s * .03, .48)], .018, stripe, sides=6)
ellipsoid('Head', (.33, 0, .54), (.1, .12, .11), body)
for s in (-1, 1):
    ellipsoid('Eye', (.36, s * .09, .57), (.06, .05, .07), eye)
    tube('Antenna', [(.4, s * .05, .62), (.7, s * .15, .85), (1.0, s * .3, 1.0)], .012, body, sides=5)
    ellipsoid('Antenna club', (1.0, s * .3, 1.0), (.045, .022, .024), body)

wings = []
for s in (-1, 1):
    wings.append((membrane_wing('fore_wing', (.1, s * .1, .62), s, 1.6,
                                lambda u: .25 * math.sin(math.pi * u * .8) + .2 * u,
                                lambda u: .55 * math.sin(math.pi * min(1, u * 1.15)) ** .7, fore_mat), s, 0.0))
    back = pivot('hind_wing_sweep', (-.05, s * .1, .6))
    back.rotation_euler = (0, 0, s * -.75)
    wings.append((membrane_wing('hind_wing', (0, 0, 0), s, 1.15,
                                lambda u: .35 * math.sin(math.pi * min(1, u * 1.2)) ** .6,
                                lambda u: .3 * math.sin(math.pi * min(1, u * 1.1)) ** .6 + .55 * max(0, 1 - abs(u - .82) / .07),
                                hind_mat, parent=back), s, 0.0))

FRAMES = 30
flap(wings, FRAMES, amp=.85, base=.25, sweep=.05)
export('swallowtail', 'Fly', FRAMES)
