"""Small four-legged mammal (field mouse, squirrel) shared by their build scripts:
furred body, head with ears, eyes and whiskers, four stepping legs and a
swaying tail made of nested pivots."""
from model_kit import *


def build_mammal(p):
    """p: dict of proportions/colors; returns (legs, tail_pivots, head_pivot)."""
    fur_tex = texture(p['name'] + ' fur', p['fur'], p['fur_dark'], p['fur_light'], size=512, contrast=.22, streak=.4)
    coat = mat(p['name'] + ' coat', p['fur'], .85, image=fur_tex)
    hair = mat(p['name'] + ' guard hair', p['fur_dark'], .9)
    light_hair = mat(p['name'] + ' light hair', p['fur_light'], .9)
    skin = mat(p['name'] + ' pink skin', p['skin'], .6)
    ear_in = mat(p['name'] + ' inner ear', p['ear'], .6)
    eye = mat('Glossy eye', (.01, .008, .008), .08)
    whisker = mat('Whisker', (.15, .13, .12), .5)

    L = p['length']  # body length from rump to nose tip
    W = p['width']
    H = p['height']
    body_secs = []
    # Body from rump to neck; the head is a separate part on a pivot so it
    # can turn slightly while walking.
    for t, wf, hf in [(0, .05, .05), (.05, .5, .6), (.18, .85, .88), (.4, 1, 1), (.6, .92, .95),
                      (.75, .72, .8), (.85, .55, .66), (.9, .3, .4), (.92, .05, .1)]:
        body_secs.append((-L * .45 + L * .8 * t, H, W * wf, H * hf * .9))
    loft(p['name'] + ' body', body_secs, coat, flat_belly=.6)
    fur(p['name'] + ' back fur', (-L * .1, 0, H * 1.0), (L * .36, W * .82, H * .55), hair, count=p.get('fur_count', 1400),
        length=(.025, .06))
    head = pivot('head', (L * .28, 0, H * 1.0))
    hw = W * p.get('head_width', .62)
    ellipsoid('Head', (0, 0, 0), (L * .16, hw, H * .55), coat, parent=head)
    ellipsoid('Snout', (L * .14, 0, -H * .1), (L * .1, hw * .55, H * .35), coat, parent=head)
    fur('Head fur', (0, 0, 0), (L * .16, hw, H * .55), hair, count=300, length=(.015, .035), parent=head)
    ellipsoid('Nose', (L * .235, 0, -H * .1), (.06, .065, .05), skin, parent=head)
    for s in (-1, 1):
        ellipsoid('Eye', (L * .08, s * hw * .78, H * .18), (.075, .06, .07), eye, parent=head)
        ellipsoid('Ear', (-L * .07, s * hw * .72, H * .48), p['ear_scale'], coat, parent=head, rot=(s * .4, -.3, 0))
        ellipsoid('Inner ear', (-L * .06, s * hw * .74, H * .5), tuple(v * .72 for v in p['ear_scale']), ear_in, parent=head, rot=(s * .4, -.3, 0))
        if p.get('ear_tuft'):
            cone('Ear tuft', (-L * .07, s * hw * .74, H * .62), (-L * .1, s * hw * .8, H * .85), .04, .004, hair, parent=head)
        for k in range(3):
            tube('Whisker', [(L * .22, s * hw * .3, -H * .12 + k * .03), (L * .3, s * (hw * 1.2 + k * .1), -H * .1 + k * .06)],
                 .005, whisker, parent=head)

    legs = []
    for s in (-1, 1):
        for front, (rx, fx, phase) in [(True, p['front']), (False, p['hind'])]:
            legs.append(Leg(f'{"front" if front else "hind"}_{s}', (rx, s * W * .62, H * .55), (fx, s * W * 1.05, .02),
                            p['front_len' if front else 'hind_len'], (.1, .07, .04), skin if front else coat,
                            phase if s > 0 else (phase + p.get('side_offset', .5)) % 1,
                            (-1 if front else 1, s * .6, .5), tip_material=skin))

    # Tail: nested pivots from the rump; each holds one tapering segment.
    tail_len = p['tail_len']
    n = p['tail_segments']
    joints = []
    for i in range(n + 1):
        t = i / n
        joints.append((-L * .45 - tail_len * t, 0, H * (.35 + p['tail_rise'] * math.sin(math.pi * t * .8))))
    pivots = spine('tail', joints[:-1])
    for i in range(n):
        a, b = Vector(joints[i]), Vector(joints[i + 1])
        r1 = p['tail_r'][0] + (p['tail_r'][1] - p['tail_r'][0]) * i / n
        r2 = p['tail_r'][0] + (p['tail_r'][1] - p['tail_r'][0]) * (i + 1) / n
        cone(f'Tail segment {i}', Vector((0, 0, 0)), b - a, r1, r2, skin if p.get('bare_tail') else coat, parent=pivots[i])
        if p.get('bushy_tail'):
            bush = ellipsoid(f'Tail plume {i}', ((b - a) / 2), (p['bushy_tail'][0], p['bushy_tail'][1], p['bushy_tail'][1] * .8),
                             coat, parent=pivots[i], rot=(0, 0, 0))
            fur(f'Tail hair {i}', tuple((b - a) / 2), (p['bushy_tail'][0], p['bushy_tail'][1], p['bushy_tail'][1] * .8),
                light_hair, count=700, length=(.08, .22), parent=pivots[i], back_only=False,
                comb=Vector((-1, 0, .1)))
    return legs, pivots, head


def animate_mammal(legs, tail, head, frames, stride, duty, lift, tail_amp=.12, head_amp=.04):
    for frame in range(frames + 1):
        c = frame / frames
        for leg in legs:
            leg.key(frame, c, stride, duty, lift)
        for i, piv in enumerate(tail):
            key_rot(piv, frame, (0, 0, tail_amp * math.sin(c * math.tau - i * .6)))
        key_rot(head, frame, (0, 0, head_amp * math.sin(c * math.tau + .8)))
