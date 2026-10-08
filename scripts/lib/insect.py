"""Shared insect wing helpers for the flying insect models (dragonfly, moth,
firefly, housefly, flying ladybug): a membrane wing on a hinge pivot with
UVs for patterned textures and optional veins, and a flapping keyframer."""
from model_kit import *


def membrane_wing(name, root, side, length, lead, trail, material, vein=None, veins=(), parent=None, camber=.03, steps=24):
    """Wing on a hinge pivot at `root` spreading along side*Y. `lead(u)` and
    `trail(u)` give the leading (+X) and trailing (-X) edge offsets at span
    fraction u. Returns the pivot (rotate X to flap, Z to sweep)."""
    hinge = pivot(name, root, parent)
    front = [(lead(i / steps), side * length * i / steps, camber * math.sin(math.pi * i / steps)) for i in range(steps + 1)]
    back = [(-trail(i / steps), side * length * i / steps, camber * math.sin(math.pi * i / steps)) for i in range(steps, -1, -1)]
    outline = front + back[1:-1]
    center = (sum(p[0] for p in outline) / len(outline) * .5, side * length * .45, camber * .8)
    verts = [center] + outline
    faces = [(0, i, i % len(outline) + 1) for i in range(1, len(outline) + 1)]
    xs = [v[0] for v in verts]
    span_x = max(1e-6, max(xs) - min(xs))
    uvs = [((v[0] - min(xs)) / span_x, abs(v[1]) / length) for v in verts]
    mesh_object(name + ' membrane', verts, faces, material, hinge, smooth=False, uvs=uvs)
    if vein is not None:
        tube(name + ' leading vein', front, .012 * length, vein, parent=hinge, sides=6)
        tube(name + ' rim', back, .006 * length, vein, parent=hinge, sides=6)
        for u in veins:
            k = round(u * steps)
            a, b = front[k], back[steps - k]
            tube(name + ' cross vein', [a, ((a[0] + b[0]) / 2, a[1] + side * .04 * length, a[2]), b], .005 * length, vein, parent=hinge, sides=6)
    return hinge


def flap(wings, frames, amp, base=0.0, sweep=0.0, cycles=1):
    """wings: [(pivot, side, phase)]. Up/down beat around X, with an
    optional fore-aft sweep around Z on the same cycle."""
    for frame in range(frames + 1):
        ph = frame / frames * math.tau * cycles
        for hinge, side, phase in wings:
            key_rot(hinge, frame, (side * (base + amp * math.sin(ph + phase)), 0, side * sweep * math.cos(ph + phase)))
