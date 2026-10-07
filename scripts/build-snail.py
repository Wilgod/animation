"""Build a garden snail. Run Blender --background --python scripts/build-snail.py.

Faces +X, with a continuous expanding shell coil and a seamless crawl clip.
"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(23)
skin = mat('Warm mottled snail skin', (.32, .25, .15), .48,
           image=texture('Fine skin grain', (.36, .29, .19), (.20, .16, .10), (.51, .43, .29), scales=.45))
sole = mat('Pale foot rim', (.52, .43, .28), .52)
horn = mat('Tentacle skin', (.29, .23, .14), .43)
eye = mat('Tiny black eyes', (.008, .006, .004), .2)
shell_mats = [mat('Shell amber', (.49, .25, .085), .3),
              mat('Shell chestnut bands', (.15, .062, .022), .34),
              mat('Shell honey bands', (.66, .40, .17), .32)]

body = loft('Muscular crawling foot', [(-1.65,.105,.015,.012),(-1.4,.15,.16,.09),
    (-1.0,.19,.33,.13),(-.4,.22,.43,.17),(.25,.24,.38,.19),
    (.75,.28,.29,.23),(1.12,.35,.25,.26),(1.35,.34,.16,.18),(1.43,.32,.035,.05)], skin)
foot = loft('Pale sole edge', [(-1.67,.075,.01,.015),(-1.35,.09,.19,.045),
    (-.8,.095,.39,.055),(0,.10,.43,.055),(.7,.11,.32,.055),
    (1.25,.13,.22,.05),(1.43,.15,.04,.02)], sole)

# A swept logarithmic spiral, widening into the final body whorl. Fine
# corrugations follow growth; pigment bands follow the length of the coil.
shell = pivot('Shell sway', (-.35, 0, .91))
verts, faces, material_ids = [], [], []
steps, sides = 360, 48
turns = math.tau * 2.55
for i in range(steps + 1):
    t = i / steps
    a = turns * t - turns - .95
    r = .045 * math.exp(math.log(.56 / .045) * t)
    thickness = .028 + .355 * t ** 3.2
    y = -.40 * (1 - t) ** .8
    for j in range(sides):
        b = math.tau * j / sides
        ridge = 1 + .012 * math.cos(t * math.tau * 115)
        rr = thickness * ridge
        verts.append((r * math.cos(a) + rr * math.cos(b) * math.cos(a),
                      y + rr * math.sin(b),
                      r * math.sin(a) + rr * math.cos(b) * math.sin(a)))
for i in range(steps):
    for j in range(sides):
        faces.append((i*sides+j, i*sides+(j+1)%sides,
                      (i+1)*sides+(j+1)%sides, (i+1)*sides+j))
        material_ids.append(1 if j % 16 in (3,4,5,6) else (2 if j % 16 in (8,9) else 0))
faces.extend([tuple(reversed(range(sides))), tuple(range(steps*sides,(steps+1)*sides))])
coil = mesh_object('Continuous spiral shell', verts, faces, shell_mats[0], shell)
for material in shell_mats[1:]:
    coil.data.materials.append(material)
for polygon, index in zip(coil.data.polygons, material_ids):
    polygon.material_index = index

# Two long eye stalks plus the shorter pair of sensory tentacles.
tentacles = []
for side in (-1, 1):
    for upper in (True, False):
        root = pivot(('Eye stalk' if upper else 'Sensory tentacle') + (' left' if side > 0 else ' right'),
                     (1.18, side*.14, .49 if upper else .29))
        points = [(0,0,0),(.10,side*.08,.19),(.20,side*.16,.38),(.27,side*.20,.49)] if upper else [
            (0,0,0),(.13,side*.13,.025),(.28,side*.22,.07)]
        tube('Upper tentacle' if upper else 'Lower tentacle', points,
             [.052,.042,.031,.023] if upper else [.038,.027,.013], horn, root, sides=16)
        if upper:
            tip = Vector(points[-1])
            ellipsoid('Eye bulb', tip, (.046,.043,.046), horn, root)
            ellipsoid('Black eye', tip + Vector((.028,-.023,.018)), (.021,.018,.021), eye, root)
        tentacles.append((root, side, upper))

FRAMES = 120
for frame in range(FRAMES + 1):
    phase = frame / FRAMES * math.tau
    for root, side, upper in tentacles:
        key_rot(root, frame, (side*.07*math.sin(phase), .09*math.sin(phase+side*.5),
                             side*.055*math.sin(phase+(0 if upper else 1))))
    key_rot(shell, frame, (.015*math.sin(phase), .012*math.sin(phase), 0))
    for part in (body, foot):
        part.scale = (1+.016*math.sin(phase), 1-.012*math.sin(phase), 1)
        part.keyframe_insert(data_path='scale', frame=frame)

export('snail', 'Walk', FRAMES)
