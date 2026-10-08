"""Build a 3D hermit crab facing +X: a red-orange crab emerging from a
borrowed turban shell (a conical shell coiled along its axis, apex to the
rear), with stalked eyes, long antennae, a big right claw and a smaller left
claw held in front, and two pairs of walking legs. Unlike the true crab it
walks forwards, the shell rocking slightly with each step. Run:
blender --background --python scripts/build-hermit-crab.py
"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(131)
red = mat('Red-orange granular shell', (.78, .22, .07), .5,
          image=texture('Hermit crab granules', (.78, .22, .07), (.5, .1, .03), (.95, .45, .2), spots=((1, .88, .72), 160, .004, .009)))
leg_mat = mat('Red legs', (.66, .17, .06), .5)
tip_mat = mat('White leg tips', (.95, .9, .82), .5)
black = mat('Black eyes', (.01, .01, .01), .15)
shell_mats = [mat('Cream shell', (.86, .76, .6), .35),
              mat('Brown spiral bands', (.42, .22, .1), .4),
              mat('Orange spiral bands', (.78, .46, .2), .38),
              mat('Shell aperture', (.25, .14, .1), .7)]

# ---------------------------------------------------------------- shell
# Logarithmic helico-spiral: each whorl's tube centre circles the shell
# axis (along X, apex at the rear) while it widens and moves forward, so the
# whorls overlap into a solid cone. Pigment bands follow the coil.
shell = pivot('Shell rock', (-.1, 0, .55))
verts, faces, material_ids = [], [], []
steps, sides, turns = 300, 36, 4.5  # ends at half a turn: aperture faces down
theta_end = turns * math.tau
k = math.log(18) / theta_end
for i in range(steps + 1):
    th = theta_end * i / steps
    s = math.exp(k * (th - theta_end))
    cx, cy, cz = -1.0 + 1.0 * s, .2 * s * math.cos(th), .2 * s * math.sin(th)
    rr = .3 * s
    # Tube frame: radial direction out from the axis and the axis itself.
    radial = Vector((0, math.cos(th), math.sin(th)))
    axis = Vector((1, 0, 0))
    for j in range(sides):
        b = math.tau * j / sides
        ridge = 1 + .02 * math.cos(th * 9)  # growth ridges
        p = Vector((cx, cy, cz)) + (radial * math.cos(b) + axis * math.sin(b)) * rr * ridge
        verts.append(tuple(p))
for i in range(steps):
    for j in range(sides):
        faces.append((i * sides + j, i * sides + (j + 1) % sides, (i + 1) * sides + (j + 1) % sides, (i + 1) * sides + j))
        material_ids.append(1 if j % 12 in (2, 3) else (2 if j % 12 in (6, 7, 8) else 0))
faces.append(tuple(reversed(range(sides))))
faces.append(tuple(range(steps * sides, (steps + 1) * sides)))
material_ids += [0, 3]
coil = mesh_object('Turban shell', verts, faces, shell_mats[0], shell)
for m in shell_mats[1:]:
    coil.data.materials.append(m)
for poly, idx in zip(coil.data.polygons, material_ids):
    poly.material_index = idx

# ---------------------------------------------------------------- crab
body = pivot('Body bob', (0, 0, 0))
ellipsoid('Carapace', (.24, 0, .45), (.27, .2, .14), red, body)
ellipsoid('Front shield', (.42, 0, .47), (.12, .14, .09), red, body)
eyes = []
for s in (-1, 1):
    tube('Eyestalk', [(.46, s * .06, .5), (.55, s * .09, .62), (.6, s * .1, .7)], [.03, .027, .025], red, body, sides=8)
    ellipsoid('Eye', (.62, s * .1, .73), (.045, .04, .04), black, body)
    ant = pivot(f'Antenna {s}', (.5, s * .04, .48), body)
    tube('Antenna', [(0, 0, 0), (.3, s * .14, .08), (.62, s * .38, .05), (.85, s * .62, -.02)],
         [.014, .01, .006, .002], leg_mat, ant, sides=6)
    eyes.append((s, ant))


def claw(side, size):
    """Upper arm, wrist and a granular palm with two fingers, on a hinge."""
    hinge = pivot(f'Claw {side}', (.38, side * .17, .42), body)
    cone('Claw arm', (0, 0, 0), (.2 * size, side * .12 * size, .04), .07 * size, .06 * size, red, hinge)
    ellipsoid('Claw wrist', (.22 * size, side * .13 * size, .04), (.08 * size, .07 * size, .07 * size), red, hinge)
    ellipsoid('Claw palm', (.38 * size, side * .13 * size, .05), (.17 * size, .12 * size, .1 * size), red, hinge)
    cone('Fixed finger', (.5 * size, side * .09 * size, .05), (.72 * size, side * .07 * size, .03), .06 * size, .012, tip_mat, hinge)
    finger = pivot('Moving finger', (.5 * size, side * .17 * size, .06), hinge)
    cone('Moving finger', (0, 0, 0), (.2 * size, -side * .03 * size, -.01), .055 * size, .01, tip_mat, finger)
    return hinge, finger


claws = [(s, *claw(s, 1.3 if s < 0 else .85)) for s in (-1, 1)]  # bigger right claw

# Two pairs of walking legs; the hind pairs stay hooked inside the shell.
STRIDE, DUTY, FRAMES = .28, .62, 48
legs = []
for s in (-1, 1):
    for i, x in enumerate((.3, .14)):
        phase = (0 if s > 0 else .5) + (0 if i == 0 else .5)
        legs.append(Leg(f'leg_{s}_{i}', (x, s * .17, .4), (x + .3 - i * .14, s * .66, 0), (.36, .38),
                        (.06, .05, .035, .008), leg_mat, phase % 1, (.3, s * .6, 1), ankle=(-.02, -s * .04, .15),
                        tip_material=tip_mat))

for frame in range(FRAMES + 1):
    p = frame / FRAMES
    ph = p * math.tau
    for leg in legs:
        leg.key(frame, p, STRIDE, DUTY, .1)
    # Two steps per cycle: the body bobs twice and the shell rocks behind it.
    key_loc(body, frame, (0, 0, .015 * math.sin(2 * ph)))
    key_rot(shell, frame, (.05 * math.sin(ph), .025 * math.sin(2 * ph + .5), .03 * math.sin(ph + .8)))
    for s, hinge, finger in claws:
        key_rot(hinge, frame, (0, -.06 * math.sin(2 * ph), s * .05 * math.sin(ph)))
        key_rot(finger, frame, (0, 0, -s * .15 * max(0, math.sin(ph + s))))
    for s, ant in eyes:
        key_rot(ant, frame, (0, .08 * math.sin(ph * 2 + s), s * .12 * math.sin(ph + s)))
print('STRIDE_PX', stride_px(STRIDE, DUTY))
export('hermit-crab', 'Walk', FRAMES)
