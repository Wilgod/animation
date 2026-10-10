"""Shared Blender helpers for the procedural animal models (build-*.py).

Convention for every model: +X faces forward (the direction of travel),
+Y is the animal's left, +Z is up. The app renders ground animals from
directly above and flying ones from the angled side view, so the silhouette
from those views matters most.

Animation is baked as keyframes on rigid parts, hinge empties and armature
bones, then merged into one named clip (Walk, Fly or Swim) so every part
plays together in the app and in other glTF viewers.
"""
import bpy, math, random, json, struct
import numpy as np
from mathutils import Vector, Quaternion, Matrix
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets' / 'models'
# Same framing as animal-3d.js: the model's larger horizontal extent times
# 1.3 spans the 320 px (at size 1) render square.
RENDER_PX = 320
FRAME_MARGIN = 1.3


def reset(seed=1):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.curves, bpy.data.armatures, bpy.data.actions):
        for item in list(block):
            block.remove(item)
    random.seed(seed)
    np.random.seed(seed)
    OUT.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------- materials
def mat(name, color, rough=.6, alpha=1.0, image=None, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.use_backface_culling = False  # exported as doubleSided: fins, wings and feathers are single sheets
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    p.inputs['Alpha'].default_value = alpha
    m.diffuse_color = (*color, alpha)
    if alpha < 1:
        m.surface_render_method = 'DITHERED'
    if image is not None:
        tex = m.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = image
        m.node_tree.links.new(tex.outputs['Color'], p.inputs['Base Color'])
    return m


def set_color(m, color):
    """Change a plain (untextured) material's color, e.g. to export a second
    base color of the same rig (a black and a brown beetle)."""
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*color, 1)
    m.diffuse_color = (*color, m.diffuse_color[3])


def _value_noise(size, cells):
    grid = np.random.rand(cells + 1, cells + 1)
    grid[-1, :] = grid[0, :]
    grid[:, -1] = grid[:, 0]  # tile seamlessly
    t = np.linspace(0, cells, size, endpoint=False)
    i = t.astype(int)
    f = t - i
    f = f * f * (3 - 2 * f)
    a = grid[i][:, i]; b = grid[i][:, i + 1]; c = grid[i + 1][:, i]; d = grid[i + 1][:, i + 1]
    fx = f[None, :]; fy = f[:, None]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def fractal(size=256, octaves=(4, 9, 22, 48), weights=(.45, .3, .15, .1)):
    n = sum(w * _value_noise(size, c) for c, w in zip(octaves, weights))
    return (n - n.min()) / max(1e-6, n.max() - n.min())


def texture(name, base, dark=None, light=None, size=256, contrast=.35, streak=0.0, spots=None, scales=0.0):
    """Packed RGBA image: fractal mottling between dark/base/light tones,
    optional along-U streaks (fur/feather grain), round spots and fish scales."""
    base = np.array(base)
    dark = np.array(dark if dark is not None else base * .55)
    light = np.array(light if light is not None else np.minimum(1, base * 1.35))
    n = fractal(size)
    if streak:
        grain = _value_noise(size, size // 3)
        grain = np.repeat(grain[:, :1], size, axis=1) * .5 + np.roll(grain, 3, axis=1) * .5
        n = n * (1 - streak) + grain * streak
    n = (n - .5) * (1 + contrast * 2) + .5
    n = np.clip(n, 0, 1)[..., None]
    rgb = np.where(n < .5, dark + (base - dark) * (n * 2), base + (light - base) * ((n - .5) * 2))
    if scales:
        yy, xx = np.mgrid[0:size, 0:size] / size * 24
        row = np.floor(yy)
        ring = ((xx + (row % 2) * .5) % 1 - .5) ** 2 + ((yy % 1) - .15) ** 2
        rgb = rgb * (1 - scales * np.clip(1 - ring * 6, 0, 1)[..., None] * .5) + scales * .12 * (ring < .05)[..., None]
    if spots:
        color, count, rmin, rmax = spots
        yy, xx = np.mgrid[0:size, 0:size] / size
        for _ in range(count):
            cx, cy, r = random.random(), random.random(), random.uniform(rmin, rmax)
            dx = np.minimum(abs(xx - cx), 1 - abs(xx - cx)); dy = np.minimum(abs(yy - cy), 1 - abs(yy - cy))
            mask = np.clip((r - np.sqrt(dx * dx + dy * dy)) / (r * .35), 0, 1)[..., None]
            rgb = rgb * (1 - mask) + np.array(color) * mask
    rgba = np.concatenate([np.clip(rgb, 0, 1), np.ones((size, size, 1))], axis=2)
    img = bpy.data.images.new(name, width=size, height=size)
    img.pixels.foreach_set(rgba.astype(np.float32).ravel())
    img.pack()
    return img


# ---------------------------------------------------------------- geometry
def _finish(o, material, parent=None, smooth=True):
    if material is not None:
        o.data.materials.append(material)
    if smooth:
        for p in o.data.polygons:
            p.use_smooth = True
    if parent is not None:
        o.parent = parent
    return o


def ellipsoid(name, loc, scale, material, parent=None, rot=(0, 0, 0), segments=32, rings=16):
    # Poles point front/back (X) so no pinched pole shows from above or the side.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=(0, 0, 0), rotation=(0, math.pi / 2, 0))
    o = bpy.context.object
    o.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    o.scale = scale
    o.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    o.location = loc
    return _finish(o, material, parent)


def cone(name, a, b, r1, r2, material, parent=None, sides=16):
    """Tapered closed cylinder from a to b (radii r1 -> r2)."""
    a, b = Vector(a), Vector(b)
    axis = b - a
    q = axis.to_track_quat('Z', 'Y')
    verts, faces = [], []
    for k, (t, r) in enumerate([(0, r1), (1, r2)]):
        for j in range(sides):
            ang = j / sides * math.tau
            verts.append(a + axis * t + q @ Vector((r * math.cos(ang), r * math.sin(ang), 0)))
    for j in range(sides):
        faces.append((j, (j + 1) % sides, sides + (j + 1) % sides, sides + j))
    faces += [tuple(reversed(range(sides))), tuple(range(sides, 2 * sides))]
    return mesh_object(name, verts, faces, material, parent)


def mesh_object(name, verts, faces, material, parent=None, smooth=True, uvs=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    if uvs is not None:
        layer = me.uv_layers.new(name='UVMap')
        for poly in me.polygons:
            for li in poly.loop_indices:
                layer.data[li].uv = uvs[me.loops[li].vertex_index]
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    return _finish(o, material, parent, smooth)


def tube(name, points, radii, material, parent=None, sides=10):
    """Smooth tapered tube through points (radii per point or one radius)."""
    if not isinstance(radii, (list, tuple)):
        radii = [radii] * len(points)
    pts = [Vector(p) for p in points]
    verts, faces = [], []
    prev_normal = None
    for i, p in enumerate(pts):
        d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        n = prev_normal if prev_normal is not None else d.orthogonal().normalized()
        n = (n - d * n.dot(d)).normalized()
        prev_normal = n
        bnorm = d.cross(n)
        for j in range(sides):
            ang = j / sides * math.tau
            verts.append(p + (n * math.cos(ang) + bnorm * math.sin(ang)) * radii[i])
    for i in range(len(pts) - 1):
        for j in range(sides):
            faces.append((i * sides + j, i * sides + (j + 1) % sides, (i + 1) * sides + (j + 1) % sides, (i + 1) * sides + j))
    faces += [tuple(reversed(range(sides))), tuple(range((len(pts) - 1) * sides, len(pts) * sides))]
    return mesh_object(name, verts, faces, material, parent)


def loft(name, sections, material, parent=None, sides=28, flat_belly=0.0, subdiv=2, belly=None, belly_level=0.0):
    """Closed body through cross-sections (x, z_center, half_width_y, half_height_z).
    UVs run u along the body and v around it, for the generated textures."""
    verts, faces, uvs = [], [], []
    n = len(sections)
    for i, (x, zc, wy, hz) in enumerate(sections):
        for j in range(sides):
            ang = j / sides * math.tau
            s = math.sin(ang)
            z = zc + hz * s * (1 - flat_belly * .5 if s < 0 else 1)
            verts.append((x, wy * math.cos(ang), z))
            uvs.append((i / (n - 1), j / sides))
    for i in range(n - 1):
        for j in range(sides):
            faces.append((i * sides + j, (i + 1) * sides + j, (i + 1) * sides + (j + 1) % sides, i * sides + (j + 1) % sides))
    # pointed caps
    for end, idx in [(0, 0), (1, n - 1)]:
        x, zc, wy, hz = sections[idx]
        verts.append((x + (-.001 if end == 0 else .001), 0, zc))
        uvs.append((end, .5))
        c = len(verts) - 1
        for j in range(sides):
            a, b = idx * sides + j, idx * sides + (j + 1) % sides
            faces.append((c, a, b) if end == 1 else (c, b, a))
    o = mesh_object(name, verts, faces, material, parent, uvs=uvs)
    if belly is not None:
        # Underside faces (below belly_level of each section's half height)
        # use the belly material, e.g. a bird's pale breast.
        o.data.materials.append(belly)
        for poly in o.data.polygons:
            vi = poly.vertices[0]
            if vi < n * sides:
                sec = sections[vi // sides]
                if poly.center.z < sec[1] + belly_level * sec[3]:
                    poly.material_index = 1
    if subdiv:
        # Smooth the sparse cross-sections (applied at export).
        o.modifiers.new('Smooth body', 'SUBSURF').levels = subdiv
    return o


def fan(name, origin, outline, material, parent=None, thickness=0.0):
    """Flat membrane (fin, wing, feather) as a fan from origin to outline points."""
    verts = [Vector(origin)] + [Vector(p) for p in outline]
    faces = [(0, i, i + 1) for i in range(1, len(outline))]
    o = mesh_object(name, verts, faces, material, parent, smooth=False)
    if thickness:
        mod = o.modifiers.new('thickness', 'SOLIDIFY')
        mod.thickness = thickness
    return o


def feather(name, root, tip, width, material, parent=None, lift=0.0):
    """Leaf-shaped flat feather from root to tip lying roughly in the XY plane."""
    root, tip = Vector(root), Vector(tip)
    d = tip - root
    side = Vector((-d.y, d.x, 0)).normalized() * width
    pts = []
    for k in range(9):
        t = k / 8
        w = math.sin(math.pi * min(1, t * 1.15)) ** .7
        pts.append(root + d * t + side * w + Vector((0, 0, lift * math.sin(math.pi * t))))
    for k in range(7, 0, -1):
        t = k / 8
        w = math.sin(math.pi * min(1, t * 1.15)) ** .7
        pts.append(root + d * t - side * w * .55 + Vector((0, 0, lift * math.sin(math.pi * t))))
    return fan(name, root, pts + [root], material, parent)


def pivot(name, loc, parent=None):
    e = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(e)
    e.location = loc
    e.rotation_mode = 'XYZ'
    if parent is not None:
        e.parent = parent
    return e


def fur(name, center, radii, material, count=900, length=(.02, .06), parent=None, back_only=True, comb=Vector((-1, 0, 0))):
    """Short hair strands (thin triangles) over an ellipsoid, combed backwards."""
    cx, cy, cz = center
    rx, ry, rz = radii
    v, f = [], []
    for _ in range(count):
        z = random.uniform(-.2 if back_only else -1, 1)
        a = random.random() * math.tau
        q = math.sqrt(max(0, 1 - z * z))
        nrm = Vector((q * math.cos(a), q * math.sin(a), z))
        p = Vector((cx + nrm.x * rx, cy + nrm.y * ry, cz + nrm.z * rz))
        dirn = (nrm * .45 + comb * .55).normalized()
        end = p + dirn * random.uniform(*length)
        t = dirn.cross(Vector((0, 0, 1)))
        if t.length < .01:
            t = Vector((0, 1, 0))
        t = t.normalized() * .006
        k = len(v)
        v += [p - t, p + t, end]
        f.append((k, k + 1, k + 2))
    return mesh_object(name, v, f, material, parent, smooth=False)


# ---------------------------------------------------------------- animation
def link(name, r1, r2, material, sides=10):
    """Unit-length limb segment along +Z from its origin; posed by pose_link."""
    verts, faces = [], []
    for z, r in [(0, r1), (.15, r1 * 1.1), (.85, r2 * 1.1), (1, r2)]:
        for j in range(sides):
            t = j / sides * math.tau
            verts.append((r * math.cos(t), r * .85 * math.sin(t), z))
    for i in range(3):
        for j in range(sides):
            faces.append((i * sides + j, i * sides + (j + 1) % sides, (i + 1) * sides + (j + 1) % sides, (i + 1) * sides + j))
    faces += [tuple(reversed(range(sides))), tuple(range(3 * sides, 4 * sides))]
    o = mesh_object(name, verts, faces, material)
    o.rotation_mode = 'QUATERNION'
    return o


def pose_link(o, a, b, frame):
    a, b = Vector(a), Vector(b)
    o.location = a
    o.rotation_quaternion = (b - a).to_track_quat('Z', 'Y')
    o.scale = (1, 1, max(1e-4, (b - a).length))
    for prop in ('location', 'rotation_quaternion', 'scale'):
        o.keyframe_insert(data_path=prop, frame=frame)


def knee(root, end, l1, l2, hint):
    """Two-bone IK: joint position between root and end, bent toward hint."""
    root, end, hint = Vector(root), Vector(end), Vector(hint)
    d = end - root
    dist = min(d.length, (l1 + l2) * .999)
    axis = d.normalized()
    along = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist)
    bend = (hint - axis * hint.dot(axis))
    bend = bend.normalized() if bend.length > 1e-6 else axis.orthogonal().normalized()
    return root + axis * along + bend * math.sqrt(max(0, l1 * l1 - along * along))


def gait_offset(phase, stride, duty=.5, lift=.1):
    """Foot offset along travel (x) and height (z) for a cycle phase in [0,1).
    Stance: the foot slides backwards at constant speed, matching travel.
    Swing: it lifts and returns forward with a smooth ease."""
    if phase < duty:
        return stride * (.5 - phase / duty), 0.0
    t = (phase - duty) / (1 - duty)
    e = t * t * (3 - 2 * t)
    return stride * (-.5 + e), lift * math.sin(math.pi * t)


class Leg:
    """Jointed leg: root (on the body) -> knee -> [ankle ->] foot on the floor.
    `hint` points the knee (e.g. up and outwards for insects)."""

    def __init__(self, name, root, foot, lengths, radii, material, phase, hint, ankle=None, tip_material=None):
        self.root = Vector(root)
        self.foot = Vector(foot)
        self.lengths = lengths
        self.phase = phase
        self.hint = Vector(hint)
        self.ankle = Vector(ankle) if ankle is not None else None
        n = 3 if ankle is not None else 2
        self.links = []
        for j in range(n):
            m = tip_material if (tip_material is not None and j == n - 1) else material
            self.links.append(link(f'{name}_{j}', radii[j], radii[j + 1], m))

    def key(self, frame, cycle, stride, duty, lift, root_offset=Vector()):
        dx, dz = gait_offset((cycle + self.phase) % 1, stride, duty, lift)
        foot = self.foot + Vector((dx, 0, dz))
        root = self.root + root_offset
        if self.ankle is not None:
            ankle = foot + self.ankle
            k = knee(root, ankle, self.lengths[0], self.lengths[1], self.hint)
            pts = [root, k, ankle, foot]
        else:
            k = knee(root, foot, self.lengths[0], self.lengths[1], self.hint)
            pts = [root, k, foot]
        for j, o in enumerate(self.links):
            pose_link(o, pts[j], pts[j + 1], frame)


def key_rot(o, frame, euler):
    o.rotation_euler = euler
    o.keyframe_insert(data_path='rotation_euler', frame=frame)


def key_rot_on(o, frame, euler, base):
    """Key a rotation applied on top of a rest rotation `base` (a Quaternion),
    e.g. a hinge whose rest rotation compensates for a parent bone's frame."""
    from mathutils import Euler
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = base @ Euler(euler).to_quaternion()
    o.keyframe_insert(data_path='rotation_quaternion', frame=frame)


def key_loc(o, frame, loc):
    o.location = loc
    o.keyframe_insert(data_path='location', frame=frame)


def spine(name, joints, parent=None):
    """Chain of nested pivots (e.g. tail or fish body) at the given points;
    rotating each a little bends the whole chain smoothly."""
    pivots = []
    prev = parent
    origin = Vector((0, 0, 0))
    for i, p in enumerate(joints):
        p = Vector(p)
        e = pivot(f'{name}_{i}', p - origin, prev)
        pivots.append(e)
        prev = e
        origin = p
    return pivots


def skinned_loft(name, sections, material, bone_xs, sides=28, flat_belly=0.0):
    """Loft whose vertices are weighted to a chain of bones along -X (front to
    back at bone_xs). Returns (mesh object, armature object); animate the
    armature's pose bones with key_bone."""
    body = loft(name, sections, material, sides=sides, flat_belly=flat_belly)
    arm = bpy.data.armatures.new(name + ' skeleton')
    rig = bpy.data.objects.new(name + ' rig', arm)
    bpy.context.collection.objects.link(rig)
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    prev = None
    names = []
    for i in range(len(bone_xs) - 1):
        b = arm.edit_bones.new(f'{name}_b{i}')
        b.head = (bone_xs[i], 0, sections[0][1])
        b.tail = (bone_xs[i + 1], 0, sections[0][1])
        if prev is not None:
            b.parent = prev
            b.use_connect = True
        prev = b
        names.append(b.name)
    bpy.ops.object.mode_set(mode='OBJECT')
    groups = [body.vertex_groups.new(name=n) for n in names]
    for v in body.data.vertices:
        x = v.co.x
        # linear blend between neighboring bone midpoints
        mids = [(bone_xs[i] + bone_xs[i + 1]) / 2 for i in range(len(names))]
        if x >= mids[0]:
            groups[0].add([v.index], 1.0, 'REPLACE'); continue
        if x <= mids[-1]:
            groups[-1].add([v.index], 1.0, 'REPLACE'); continue
        for i in range(len(mids) - 1):
            if mids[i] >= x >= mids[i + 1]:
                t = (mids[i] - x) / (mids[i] - mids[i + 1])
                groups[i].add([v.index], 1 - t, 'REPLACE')
                groups[i + 1].add([v.index], t, 'REPLACE')
                break
    mod = body.modifiers.new('Skeleton', 'ARMATURE')
    mod.object = rig
    body.parent = rig
    for pb in rig.pose.bones:
        pb.rotation_mode = 'XYZ'
    return body, rig


def attach_to_bone(o, rig, bone_name):
    """Rigidly parent a part to a bone so it follows the bending body."""
    bpy.context.view_layer.update()  # matrix_world is stale for freshly placed objects
    mw = o.matrix_world.copy()
    o.parent = rig
    o.parent_type = 'BONE'
    o.parent_bone = bone_name
    bpy.context.view_layer.update()
    o.matrix_world = mw


def key_bone(rig, bone_name, frame, euler):
    pb = rig.pose.bones[bone_name]
    pb.rotation_euler = euler
    pb.keyframe_insert(data_path='rotation_euler', frame=frame)


def framing_guide(points):
    """Zero-area (invisible) mesh spanning points. animal-3d.js frames the
    model from its first-frame bounds, so this keeps poses that reach farther
    later in the clip (a frog's kick) inside the render square."""
    verts, faces = [], []
    for p in points:
        k = len(verts)
        verts += [p, p, p]
        faces.append((k, k + 1, k + 2))
    me = bpy.data.meshes.new('Framing guide')
    me.from_pydata([tuple(v) for v in verts], [], faces)
    o = bpy.data.objects.new('Framing guide', me)
    bpy.context.collection.objects.link(o)
    return o


# ---------------------------------------------------------------- export
def stride_px(stride_units, duty):
    """strideLengthPx for config: on-screen travel per walk cycle at size 1,
    so feet stay planted while the app drives the cycle by distance."""
    bpy.context.scene.frame_set(0)
    pts = []
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    xs = [p.x for p in pts]; ys = [p.y for p in pts]
    extent = max(max(xs) - min(xs), max(ys) - min(ys))
    px_per_unit = RENDER_PX / (extent * FRAME_MARGIN)
    return round(stride_units / duty * px_per_unit)


def export(file_stem, clip, frame_end, fps=60, reference=None):
    scene = bpy.context.scene
    scene.frame_start = 0
    scene.frame_end = frame_end
    scene.render.fps = fps
    scene.frame_set(0)
    if reference:
        ref = bpy.data.images.load(str(ROOT / reference))
        ref.pack()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / f'{file_stem}.blend'))
    path = OUT / f'{file_stem}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', export_animations=True,
                              export_animation_mode='SCENE', export_frame_range=True, export_force_sampling=True,
                              export_apply=True)
    # Merge every exported action into one clip so all parts play together.
    raw = path.read_bytes()
    n = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + n])
    merged = {'name': clip, 'samplers': [], 'channels': []}
    for action in doc.get('animations', []):
        offset = len(merged['samplers'])
        merged['samplers'].extend(action['samplers'])
        for channel in action['channels']:
            channel['sampler'] += offset
            merged['channels'].append(channel)
    doc['animations'] = [merged]
    chunk = json.dumps(doc, separators=(',', ':')).encode()
    chunk += b' ' * ((-len(chunk)) % 4)
    rest = raw[20 + n:]
    path.write_bytes(struct.pack('<III', 0x46546c67, 2, 20 + len(chunk) + len(rest)) +
                     struct.pack('<II', len(chunk), 0x4e4f534a) + chunk + rest)
    print(f'{file_stem.upper()}_BUILD_OK channels={len(merged["channels"])} size={path.stat().st_size // 1024}KB')
