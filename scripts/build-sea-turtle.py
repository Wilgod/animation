"""Green sea turtle, facing +X: the garden turtle's scuted shell (flatter
and streamlined), long front flippers beating in a slow "flying" stroke and
small rear flippers steering. Run:
blender --background --python scripts/build-sea-turtle.py
"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(37)
skin = mat('Scaly olive skin', (.4, .33, .2), .55,
           image=texture('Sea turtle skin', (.4, .33, .2), (.22, .16, .09), (.78, .68, .42), scales=.6))
shell_mat = mat('Brown carapace', (.36, .24, .11), .35,
                image=texture('Carapace mottling', (.36, .24, .11), (.19, .12, .05), (.6, .44, .2), size=512,
                              contrast=.45, spots=((.72, .52, .22), 70, .015, .045)))
seam = mat('Scute grooves', (.12, .08, .04), .7)
rim_mat = mat('Shell margin', (.5, .38, .2), .5)
belly = mat('Cream plastron', (.86, .8, .58), .65)
black = mat('Black eyes and nostrils', (.008, .011, .006), .23)
beak = mat('Horny beak', (.3, .25, .17), .4)

SX, SY = 1.15, .88  # shell half length / half width


def dome(x, y, offset=0):
    return .4 + .38 * math.sqrt(max(0, 1 - (x / SX) ** 2 - (y / SY) ** 2)) + offset


ellipsoid('Plastron', (0, 0, .3), (1.05, .78, .13), belly)
ellipsoid('Soft body', (0, 0, .36), (.98, .68, .2), skin)
shell = pivot('Carapace', (0, 0, 0))
# Upper half ellipsoid (as the garden turtle's), flattened.
verts, faces, uvs = [], [], []
for i in range(25):
    a = (i + .001) / 24.001 * math.pi / 2
    for j in range(96):
        b = j / 96 * math.tau
        verts.append((SX * math.sin(a) * math.cos(b), SY * math.sin(a) * math.sin(b), .4 + .38 * math.cos(a)))
        uvs.append((verts[-1][0] / (2 * SX) + .5, verts[-1][1] / (2 * SX) + .5))  # planar from above
for i in range(24):
    for j in range(96):
        faces.append((i * 96 + j, (i + 1) * 96 + j, (i + 1) * 96 + (j + 1) % 96, i * 96 + (j + 1) % 96))
faces.append(tuple(reversed(range(96))))
mesh_object('Domed carapace', verts, faces, shell_mat, shell, uvs=uvs)
tube('Shell rim', [(SX * math.cos(a), SY * math.sin(a), .4) for a in [j / 160 * math.tau for j in range(161)]],
     .03, rim_mat, shell, sides=12)


def groove(name, points, radius=.012, material=seam):
    samples = []
    for p, q in zip(points, points[1:]):
        for j in range(12):
            t = j / 12
            x, y = p[0] * (1 - t) + q[0] * t, p[1] * (1 - t) + q[1] * t
            samples.append((x, y, dome(x, y, .006)))
    x, y = points[-1]
    samples.append((x, y, dome(x, y, .006)))
    tube(name, samples, radius, material, shell, sides=8)


# Five vertebral plates, four costal pairs and marginal scutes, as on the
# garden turtle.
xs = [-1.02, -.62, -.21, .21, .62, 1.02]
for s in (-1, 1):
    groove('Vertebral border', [(x, s * (.16 if abs(x) > .9 else .29)) for x in xs])
    for x in xs[1:-1]:
        outer_y = SY * math.sqrt(1 - (x / SX) ** 2) * .93
        groove('Costal seam', [(x, s * .29), (x + .06, s * .52), (x, s * outer_y)])
for x in xs[1:-1]:
    groove('Vertebral seam', [(x, -.29), (x - .065, 0), (x, .29)])
groove('Marginal border', [(SX * .93 * math.cos(j / 160 * math.tau), SY * .93 * math.sin(j / 160 * math.tau))
                           for j in range(161)], .014)
for j in range(24):
    a = j / 24 * math.tau
    groove('Marginal division', [(SX * r * math.cos(a), SY * r * math.sin(a)) for r in (.93, .96, .985, .999)], .009)

# Rounded head held out in front (sea turtles can't retract it).
head = pivot('Head sway', (.98, 0, .4))
ellipsoid('Neck', (.1, 0, 0), (.36, .22, .17), skin, head)
ellipsoid('Head', (.46, 0, .04), (.32, .25, .2), skin, head)
ellipsoid('Beak', (.7, 0, -.03), (.12, .14, .1), beak, head)
for s in (-1, 1):
    ellipsoid('Eye', (.54, s * .2, .1), (.07, .04, .06), black, head)
    ellipsoid('Nostril', (.76, s * .05, .06), (.012, .012, .012), black, head)
tail = pivot('Tail sway', (-1.05, 0, .32))
tube('Short tail', [(0, 0, 0), (-.18, 0, -.02), (-.32, 0, -.04)], [.08, .045, .006], skin, tail, sides=12)


def flipper(name, root, yaw, sections):
    """Flattened paddle lofted along local +X from a shoulder hinge; the
    hinge's rest yaw points it outwards and back."""
    hinge = pivot(name, root)
    loft(name + ' blade', sections, skin, parent=hinge, sides=20)
    hinge.rotation_euler = (0, 0, yaw)
    return hinge, hinge.rotation_euler.to_quaternion()


FRONT = [(0, 0, .12, .08), (.15, 0, .17, .06), (.45, 0, .19, .045), (.8, 0, .16, .035), (1.1, 0, .1, .025), (1.32, 0, .035, .015)]
REAR = [(0, 0, .1, .06), (.15, 0, .15, .04), (.32, 0, .13, .03), (.45, 0, .05, .02)]
fronts = [(s, *flipper(f'Front flipper {s}', (.62, s * .58, .36), s * math.radians(118), FRONT)) for s in (-1, 1)]
rears = [(s, *flipper(f'Rear flipper {s}', (-.78, s * .45, .33), s * math.radians(150), REAR)) for s in (-1, 1)]
# Keep the forward reach of the stroke inside the render square.
framing_guide([(1.6, 1.85, .4), (1.6, -1.85, .4), (-1.6, 1.85, .4), (-1.6, -1.85, .4)])

FRAMES = 96  # 1.6 s per stroke
for frame in range(FRAMES + 1):
    ph = frame / FRAMES * math.tau
    for s, hinge, rest in fronts:
        # Flap about the chord (tip up/down), sweep fore and aft about the
        # vertical, and feather the blade about its length: down and back
        # with the blade flat, up and forward edge-on.
        flap = -.55 * math.sin(ph)
        sweep = s * .38 * math.cos(ph)
        feather = s * .4 * math.sin(ph + math.pi / 2)
        key_rot_on(hinge, frame, (feather, flap, sweep), rest)
    for s, hinge, rest in rears:
        key_rot_on(hinge, frame, (0, .12 * math.sin(ph + 1), s * .12 * math.sin(ph)), rest)
    key_rot(head, frame, (0, .04 * math.sin(ph + .6), .02 * math.sin(ph)))
    key_rot(tail, frame, (0, 0, .08 * math.sin(ph)))
export('sea-turtle', 'Swim', FRAMES)
