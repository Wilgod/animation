"""Build a 3D common octopus jet-swimming mantle first (+X): the mantle
squeezes as the eight arms snap together into a streamlined trailing
bundle, it glides, then slowly refills while the arms and web spread into
a wide star. Ripples run down every arm. Run:
blender --background --python scripts/build-octopus.py

The soft body is baked as one shape key per sampled phase and cross-faded
so the glTF morph weights loop seamlessly (as for the jellyfish).
"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(137)
bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'
skin_tex = texture('Octopus mottling', (.66, .24, .14), (.4, .12, .07), (.85, .45, .3), size=512, contrast=.45,
                   spots=((.93, .68, .55), 120, .005, .014))
skin = mat('Mottled red-brown skin', (.66, .24, .14), .45, image=skin_tex)
web_mat = mat('Arm web', (.6, .22, .13), .5, alpha=.85)
eye_mat = mat('Golden eye', (.88, .7, .3), .25)
pupil = mat('Slit pupil', (.02, .02, .02), .1)

FRAMES, STEP = 108, 3            # 1.8 s per jet cycle, a shape key every 3 frames
ARM_LEN, ARM_PTS, SIDES = 1.35, 16, 8
CROWN = Vector((-.05, 0, .2))
OFFSETS = [-157.5, -112.5, -67.5, -22.5, 22.5, 67.5, 112.5, 157.5]  # degrees from straight back


def openness(ph):
    """1 = arms spread, 0 = streamlined. Snap shut (25%), glide (20%),
    then a slow reopening as the mantle refills."""
    u = (ph / math.tau) % 1
    if u < .25:
        return .5 + .5 * math.cos(math.pi * u / .25)
    if u < .45:
        return 0.0
    return .5 - .5 * math.cos(math.pi * (u - .45) / .55)


def arm_points(k, ph):
    f = openness(ph)
    off = math.radians(OFFSETS[k]) * (.06 + .94 * f)
    heading = math.pi + off
    side = 1 if OFFSETS[k] > 0 else -1
    p = CROWN + Vector((math.cos(heading), math.sin(heading), 0)) * .12
    pts = [p.copy()]
    step = ARM_LEN / (ARM_PTS - 1) * (.92 + .08 * f)
    for i in range(1, ARM_PTS):
        s = i / (ARM_PTS - 1)
        curl = side * (.9 * f + .15) * s ** 2.2                      # tips curl, more when spread
        ripple = (.22 + .2 * f) * math.sin(ph * 2 - 7 * s + k * .9) * s  # wave down the arm
        a = heading + curl * .55 + ripple * .5
        p = p + Vector((math.cos(a), math.sin(a), 0)) * step
        z = .2 + .12 * math.sin(math.pi * s) * f - .16 * s * f - .04 * s
        pts.append(Vector((p.x, p.y, z)))
    return pts


ARM_R = [.09 * (1 - .88 * (i / (ARM_PTS - 1)) ** .8) + .006 for i in range(ARM_PTS)]


def tube_mesh(paths, radii):
    """Tubes in one mesh, rings oriented from a fixed vertical reference (the
    arms stay roughly horizontal) so vertices line up between shape keys."""
    verts, faces = [], []
    for pts in paths:
        base = len(verts)
        for i, p in enumerate(pts):
            d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            n = Vector((0, 0, 1))
            n = (n - d * n.dot(d)).normalized()
            bn = d.cross(n)
            for j in range(SIDES):
                t = j / SIDES * math.tau
                # Flattened underneath where the suckers grip.
                verts.append(tuple(p + n * math.cos(t) * radii[i] * (1 if math.cos(t) > 0 else .6) + bn * math.sin(t) * radii[i]))
        for i in range(len(pts) - 1):
            for j in range(SIDES):
                faces.append((base + i * SIDES + j, base + i * SIDES + (j + 1) % SIDES,
                              base + (i + 1) * SIDES + (j + 1) % SIDES, base + (i + 1) * SIDES + j))
        last = base + (len(pts) - 1) * SIDES
        faces.append(tuple(last + j for j in range(SIDES)))
    return verts, faces


def arms_verts(ph):
    return tube_mesh([arm_points(k, ph) for k in range(8)], ARM_R)[0]


WEB_PTS = 5  # web spans the first part of each arm, between neighbours


def web_verts(ph):
    verts = [tuple(CROWN + Vector((0, 0, -.02)))]
    for k in range(8):
        pts = arm_points(k, ph)
        verts += [tuple(pts[i] + Vector((0, 0, -.01))) for i in range(WEB_PTS)]
    return verts


web_faces = []
for k in range(7):  # no web across the front, where the mantle sits
    a, b = 1 + k * WEB_PTS, 1 + (k + 1) * WEB_PTS
    web_faces.append((0, a, b))
    web_faces += [(a + i, a + i + 1, b + i + 1, b + i) for i in range(WEB_PTS - 1)]


def body_sections(ph):
    """Head with eye bumps behind a bulbous mantle that deflates on the jet."""
    m = .82 + .18 * openness(ph)
    return [(-.12, .2, .12, .1), (-.02, .24, .2, .16), (.1, .28, .2, .17), (.2, .3, .17, .15),
            (.3, .32, .2 * m, .19 * m), (.5, .36, .29 * m, .26 * m), (.72, .38, .31 * m, .28 * m),
            (.92, .37, .26 * m, .24 * m), (1.06, .35, .16 * m, .15 * m), (1.13, .34, .03, .03)]


def body_verts(ph):
    tmp = loft('tmp', body_sections(ph), None, sides=28, subdiv=0)
    co = [tuple(v.co) for v in tmp.data.vertices]
    bpy.data.objects.remove(tmp)
    return co


def planar_uv(obj):
    layer = obj.data.uv_layers.new(name='UVMap')
    for poly in obj.data.polygons:
        for li in poly.loop_indices:
            co = obj.data.vertices[obj.data.loops[li].vertex_index].co
            layer.data[li].uv = (co.x / 3 + .5, co.y / 3 + .5)


body = loft('Mantle and head', body_sections(0), skin, sides=28, subdiv=0)
v, f = tube_mesh([arm_points(k, 0) for k in range(8)], ARM_R)
arms = mesh_object('Arms', v, f, skin)
planar_uv(arms)
web = mesh_object('Web', web_verts(0), web_faces, web_mat, smooth=False)
for s in (-1, 1):
    ellipsoid('Eye', (.06, s * .19, .37), (.07, .05, .06), eye_mat)
    ellipsoid('Pupil', (.075, s * .235, .375), (.04, .012, .012), pupil)  # horizontal slit
framing_guide([(1.25, 1.45, .2), (1.25, -1.45, .2), (-1.55, 1.45, .2), (-1.55, -1.45, .2)])

KEYS = FRAMES // STEP
for obj, fn in ((body, body_verts), (arms, arms_verts), (web, web_verts)):
    obj.shape_key_add(name='Basis', from_mix=False)
    for k in range(KEYS):
        sk = obj.shape_key_add(name=f'jet{k:02d}', from_mix=False)
        for d, co in zip(sk.data, fn(k / KEYS * math.tau)):
            d.co = co
        for fr in [k * STEP] + ([FRAMES] if k == 0 else []):
            for ff, val in ((fr - STEP, 0.0), (fr, 1.0), (fr + STEP, 0.0)):
                if 0 <= ff <= FRAMES:
                    sk.value = val
                    sk.keyframe_insert(data_path='value', frame=ff)
export('octopus', 'Swim', FRAMES)
