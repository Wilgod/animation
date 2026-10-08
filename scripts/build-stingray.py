"""Build a 3D blue-spotted stingray: a flat disc whose wing margins ripple
in a wave running nose to tail, with a trailing whip tail. Seen from above
it glides over the seabed scenes. Run:
blender --background --python scripts/build-stingray.py

The wave is baked as one shape key per sampled phase (a disc has no useful
bone chain), cross-faded in turn so the glTF morph weights loop seamlessly.
"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(41)
bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'
top_tex = texture('Stingray back', (.42, .33, .17), (.26, .19, .09), (.55, .44, .24), size=512, contrast=.3,
                  spots=((.15, .6, 1.0), 85, .007, .016))
skin = mat('Spotted olive-brown back', (.42, .33, .17), .45, image=top_tex)
belly = mat('White underside', (.93, .91, .86), .55)
tail_mat = mat('Tail with blue stripes', (.36, .27, .14), .45,
               image=texture('Stingray tail', (.36, .27, .14), (.12, .5, .95), (.46, .36, .2), size=128, streak=.8))
eye = mat('Raised eye', (.36, .27, .14), .3)
pupil = mat('Dark pupil', (.02, .02, .02), .1)
spiracle = mat('Spiracle', (.16, .11, .06), .6)

NOSE, REAR, SPAN, PEAK = .9, -1.0, 1.15, .05  # disc outline (units)
NX, NS = 46, 30                                # x sections, points per surface
FRAMES, STEP = 72, 3                           # 1.2 s per wave, a shape key every 3 frames
WAVE_K, LIFT = 3.2, .5                         # wavenumber along the body, max wing angle (rad)


def half_width(x):
    if x >= PEAK:
        t = (x - PEAK) / (NOSE - PEAK)
        return SPAN * max(0, 1 - t ** 1.9) ** .55 + .02
    t = (PEAK - x) / (PEAK - REAR)
    return (SPAN - .07) * (1 - t ** 1.35) ** .8 + .07


def thickness(x):
    t = (x - REAR) / (NOSE - REAR)
    return .2 * math.sin(math.pi * min(1, t * 1.08)) ** .6 + .015


def disc_point(x, s, top, ph, lift):
    """Surface point at body x and normalized span s in [-1, 1]; the wing
    rotates about the body axis by an angle growing toward the margin."""
    w = half_width(x)
    a = abs(s)
    t = thickness(x) * max(0, 1 - a * a) ** .6
    z = t * (.75 if top else -.3)
    edge = a * a * (3 - 2 * a)  # smoothstep: stiff middle, flexible margin
    theta = lift * edge * math.sin(ph + WAVE_K * x)
    r = a * w
    return (x, math.copysign(r * math.cos(theta) - z * math.sin(theta), s or 1),
            r * math.sin(theta) + z * math.cos(theta))


xs = [REAR + (NOSE - REAR) * i / (NX - 1) for i in range(NX)]
ss = [-math.cos(math.pi * j / (NS - 1)) for j in range(NS)]  # denser near the margins


def disc_verts(ph, lift=LIFT):
    verts = []
    for x in xs:
        verts += [disc_point(x, s, True, ph, lift) for s in ss]
        verts += [disc_point(x, s, False, ph, lift) for s in reversed(ss[1:-1])]
    verts.append((REAR - .01, 0, 0))
    verts.append((NOSE + .01, 0, 0))
    return verts


RING = 2 * NS - 2
faces, uvs, top_faces = [], [], set()
for i, x in enumerate(xs):
    for j in range(RING):
        y = (ss[j] if j < NS else ss[RING - j]) * half_width(x)
        uvs.append(((x - REAR) / 2.4, y / 2.4 + .5))  # planar from above: round spots
uvs += [(0, .5), ((NOSE - REAR) / 2.4, .5)]
for i in range(NX - 1):
    for j in range(RING):
        if j < NS - 1:
            top_faces.add(len(faces))
        faces.append((i * RING + j, i * RING + (j + 1) % RING, (i + 1) * RING + (j + 1) % RING, (i + 1) * RING + j))
rear_c, nose_c = NX * RING, NX * RING + 1
faces += [(rear_c, (j + 1) % RING, j) for j in range(RING)]
faces += [(nose_c, (NX - 1) * RING + j, (NX - 1) * RING + (j + 1) % RING) for j in range(RING)]
# Rest pose is the flat disc; the shape keys add the wave.
disc = mesh_object('Disc', disc_verts(0, lift=0), faces, skin, uvs=uvs)
disc.data.materials.append(belly)
for k, poly in enumerate(disc.data.polygons):
    poly.material_index = 0 if k in top_faces or (poly.vertices[0] >= rear_c and poly.center.z > 0) else 1


def tail_points(ph):
    pts = []
    for k in range(12):
        t = k / 11
        x = REAR + .02 - 1.45 * t
        pts.append((x, .09 * t ** 1.5 * math.sin(ph + WAVE_K * x - 1.2), .04 * (1 - t) + .02 * t ** 2))
    return pts


TAIL_R = [.07 * (1 - k / 11) ** 1.2 + .006 for k in range(12)]
tail = tube('Tail', tail_points(0), TAIL_R, tail_mat)
tail_uv = tail.data.uv_layers.new(name='UVMap')
for poly in tail.data.polygons:
    for li in poly.loop_indices:
        vi = tail.data.loops[li].vertex_index
        tail_uv.data[li].uv = ((vi // 10) / 11, (vi % 10) / 10)


def tail_verts(ph):
    tmp = tube('tmp', tail_points(ph), TAIL_R, None)
    co = [tuple(v.co) for v in tmp.data.vertices]
    bpy.data.objects.remove(tmp)
    return co


# Eyes and spiracles sit on the stiff middle of the disc and stay rigid.
for s in (-1, 1):
    ellipsoid('Eye', (.42, s * .16, thickness(.42) * .75 + .02), (.07, .05, .045), eye)
    ellipsoid('Pupil', (.43, s * .19, thickness(.42) * .75 + .045), (.035, .02, .02), pupil)
    ellipsoid('Spiracle', (.27, s * .17, thickness(.27) * .72 + .01), (.05, .035, .015), spiracle)
    fan('Pelvic fin', (-.9, s * .06, .02), [(-.88, s * .2, .01), (-1.02, s * .24, 0), (-1.12, s * .12, .01),
                                            (-1.08, s * .05, .02)], skin)

# Bake the wave: shape key k is the pose at frame k*STEP; neighbours cross-fade.
KEYS = FRAMES // STEP
for obj, fn in ((disc, disc_verts), (tail, tail_verts)):
    obj.shape_key_add(name='Basis', from_mix=False)
    for k in range(KEYS):
        sk = obj.shape_key_add(name=f'wave{k:02d}', from_mix=False)
        for d, co in zip(sk.data, fn(k / KEYS * math.tau)):
            d.co = co
        frames = [k * STEP] + ([FRAMES] if k == 0 else [])
        for f in frames:
            for ff, val in ((f - STEP, 0.0), (f, 1.0), (f + STEP, 0.0)):
                if 0 <= ff <= FRAMES:
                    sk.value = val
                    sk.keyframe_insert(data_path='value', frame=ff)
export('stingray', 'Swim', FRAMES)
