"""Build two long, snake-like swimmers facing +X, both bending in a
travelling S-wave along a twelve-bone spine (anguilliform swimming, the
wave growing toward the tail), which reads clearly from the top-down view:

- moray-eel: a mottled green-brown moray with a blunt head, small eyes,
  and a continuous dorsal fin running from behind the head to the tail.
- sea-snake: a banded sea krait, blue-grey with black rings, a small
  rounded head and a flattened paddle tail.

Run: blender --background --python scripts/build-eel.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

N_SECTIONS = 26
BONES = [1.6 - i * (3.2 / 12) for i in range(13)]  # twelve bones nose to tail
FRAMES = 90  # 1.5 s per body wave


def sections(profile):
    """Evenly spaced cross-sections from nose (x=1.6) to tail (x=-1.6);
    profile(t) gives (half_width, half_height) at t in [0, 1]."""
    out = []
    for i in range(N_SECTIONS):
        t = i / (N_SECTIONS - 1)
        w, h = profile(t)
        out.append((1.6 - 3.2 * t, .2, w, h))
    return out


def skin_to_rig(o, rig, bone_xs):
    """Weight every vertex of a separate mesh (e.g. a fin) to the same bone
    chain as skinned_loft, so it bends with the body."""
    names = [b.name for b in rig.data.bones]
    mids = [(bone_xs[i] + bone_xs[i + 1]) / 2 for i in range(len(names))]
    groups = [o.vertex_groups.new(name=n) for n in names]
    for v in o.data.vertices:
        x = v.co.x
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
    o.modifiers.new('Skeleton', 'ARMATURE').object = rig
    o.parent = rig


def ribbon(name, x0, x1, base, height, material, segments=60):
    """Thin upright fin strip along the back from x0 to x1; base(x) is the
    z of the fin's root, height(x) its height there."""
    verts, faces = [], []
    for i in range(segments + 1):
        x = x0 + (x1 - x0) * i / segments
        z = base(x)
        verts += [(x, 0, z), (x, 0, z + height(x))]
    for i in range(segments):
        a = i * 2
        faces.append((a, a + 2, a + 3, a + 1))
    return mesh_object(name, verts, faces, material)


def image_from(name, rgb):
    h, w, _ = rgb.shape
    img = bpy.data.images.new(name, width=w, height=h)
    img.pixels.foreach_set(np.concatenate([np.clip(rgb, 0, 1), np.ones((h, w, 1))], axis=2).astype(np.float32).ravel())
    img.pack()
    return img


def swim(rig, amps, wavelength_bones=11.0):
    bones = [b.name for b in rig.data.bones]
    k = math.tau / wavelength_bones
    for frame in range(FRAMES + 1):
        ph = frame / FRAMES * math.tau
        for i, (name, amp) in enumerate(zip(bones, amps)):
            key_bone(rig, name, frame, (0, 0, amp * math.sin(ph - i * k)))


def moray():
    reset(211)

    def profile(t):
        # blunt rounded head, thick neck, long laterally flattened body
        if t < .06:
            s = math.sin(t / .06 * math.pi / 2)
            return .02 + .085 * s, .02 + .11 * s
        taper = 1 - max(0, t - .55) / .45 * .85
        return .11 * taper, .15 * taper

    secs = sections(profile)

    def mottle(w=512, h=128):
        """u runs nose to tail, v around the body: green-brown with dark
        blotches, slightly paler belly, dark eye stripe on the head."""
        v = (np.arange(h) + .5) / h
        up = np.sin(v * math.tau)[:, None, None]
        n = fractal(w)[:h, :, None]
        base = np.array((.42, .44, .16))
        dark = np.array((.12, .14, .05))
        rgb = base * (.8 + .35 * n)
        blot = np.clip((fractal(w)[:h, :, None] - .55) * 5, 0, 1)
        rgb = rgb * (1 - blot) + dark * blot
        rgb = rgb * (.85 + .15 * np.clip(up + .5, 0, 1)) + np.array((.12, .1, .02)) * np.clip(-up, 0, 1)
        return image_from('Moray mottling', rgb)

    skin = mat('Moray skin', (.42, .44, .16), .35, image=mottle())
    fin = mat('Moray fin', (.17, .18, .06), .5)
    eye = mat('Moray eye', (.75, .6, .15), .15)
    pupil = mat('Pupil', (.01, .01, .01), .05)
    mouth = mat('Mouth', (.05, .04, .03), .5)

    body, rig = skinned_loft('Body', secs, skin, BONES)
    bones = [b.name for b in rig.data.bones]

    def top(x):
        t = (1.6 - x) / 3.2
        return .2 + profile(t)[1] * .92

    dorsal = ribbon('Dorsal fin', 1.25, -1.6, top, lambda x: .05 + .03 * (1.25 - x) / 2.85, fin)
    skin_to_rig(dorsal, rig, BONES)
    for s in (-1, 1):
        e = ellipsoid('Eye', (1.46, s * .055, .3), (.022, .016, .02), eye)
        attach_to_bone(e, rig, bones[0])
        attach_to_bone(ellipsoid('Pupil', (1.475, s * .064, .305), (.01, .008, .011), pupil), rig, bones[0])
        attach_to_bone(ellipsoid('Nostril', (1.57, s * .03, .26), (.012, .008, .008), pupil), rig, bones[0])
    attach_to_bone(ellipsoid('Mouth line', (1.48, 0, .17), (.11, .065, .012), mouth), rig, bones[0])

    swim(rig, [.03, .06, .08, .1, .11, .12, .13, .14, .15, .17, .19, .21])
    export('moray-eel', 'Swim', FRAMES)


def sea_snake():
    reset(223)

    def profile(t):
        # small rounded head, slim round body, flattened paddle tail
        if t < .05:
            s = math.sin(t / .05 * math.pi / 2)
            return .015 + .065 * s, .015 + .055 * s
        if t < .08:
            return .06, .052  # slight neck
        if t < .85:
            return .085, .08
        p = (t - .85) / .15
        return .085 * (1 - .75 * p), .08 + .06 * math.sin(min(p, .8) / .8 * math.pi / 2) * (1 - max(0, p - .8) * 4)

    secs = sections(profile)

    def bands(w=512, h=64, rings=26):
        """u runs nose to tail: blue-grey with black rings that go all the
        way round, a black head, and a pale yellow belly band."""
        u = (np.arange(w) + .5) / w
        v = (np.arange(h) + .5) / h
        ring = ((u * rings) % 1 < .38) | (u < .07)
        base = np.array((.55, .66, .74)) * (fractal(w)[:h, :, None] * .12 + .94)
        rgb = np.where(ring[None, :, None], np.array((.04, .05, .07)), base)
        belly = (np.sin(v * math.tau) < -.75)[:, None, None] & ~ring[None, :, None]
        rgb = np.where(belly, np.array((.85, .82, .55)), rgb)
        return image_from('Sea snake bands', rgb)

    skin = mat('Sea snake skin', (.55, .66, .74), .3, image=bands())
    eye = mat('Snake eye', (.02, .02, .02), .05)
    lip = mat('Pale lip', (.82, .82, .6), .4)

    body, rig = skinned_loft('Body', secs, skin, BONES)
    bones = [b.name for b in rig.data.bones]
    for s in (-1, 1):
        attach_to_bone(ellipsoid('Eye', (1.52, s * .045, .245), (.014, .01, .012), eye), rig, bones[0])
    attach_to_bone(ellipsoid('Snout', (1.565, 0, .2), (.04, .045, .03), lip), rig, bones[0])

    swim(rig, [.04, .07, .09, .11, .12, .13, .14, .15, .16, .17, .18, .19], wavelength_bones=10.0)
    export('sea-snake', 'Swim', FRAMES)


moray()
sea_snake()
