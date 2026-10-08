"""Songbird/pigeon model shared by build-sparrow, build-pigeon and
build-pigeon-flying: feathered body, head on a neck pivot, beak and eyes,
fanned tail, and either folded wings with walking legs (mode 'walk') or
two-joint flapping wings with tucked feet (mode 'fly')."""
from model_kit import *

# Rock pigeon plumage, shared by the walking and flying pigeons.
PIGEON = dict(
    name='Pigeon', back=(.52, .55, .6), back_dark=(.36, .38, .43), back_light=(.66, .68, .73),
    breast=(.5, .5, .56), head=(.4, .43, .5), neck=(.22, .4, .33), neck_metal=.45,
    beak=(.25, .23, .24), cere=(.86, .86, .84), eye=(.85, .4, .08),
    wing=(.6, .63, .68), feathers=[(.28, .3, .34), (.38, .4, .45), (.32, .34, .38)], wing_bar=(.08, .08, .09),
    tail=(.46, .48, .54), tail_tip=(.14, .14, .16), tail_len=.95, primary_len=1.25, legs=(.72, .3, .3),
)



def build_bird(p, mode):
    S = p.get('scale', 1.0)
    body_tex = texture(p['name'] + ' back', p['back'], p['back_dark'], p['back_light'], size=512, contrast=.3,
                       streak=.25, spots=p.get('back_spots'))
    back = mat(p['name'] + ' back plumage', p['back'], .8, image=body_tex)
    breast = mat(p['name'] + ' breast', p['breast'], .85,
                 image=texture(p['name'] + ' breast tex', p['breast'], tuple(c * .85 for c in p['breast']), tuple(min(1, c * 1.08) for c in p['breast']), contrast=.2))
    head_mat = mat(p['name'] + ' head', p['head'], .75)
    neck_mat = mat(p['name'] + ' neck', p.get('neck', p['head']), .35, metal=p.get('neck_metal', 0))
    beak = mat('Beak', p['beak'], .45)
    eye_ring = mat('Eye ring', p['eye'], .25)
    pupil = mat('Pupil', (.01, .01, .01), .05)
    covert = mat(p['name'] + ' wing coverts', tuple(c * .82 for c in p['wing']), .8)
    feather_mats = [mat(p['name'] + f' flight feather {i}', c, .7) for i, c in enumerate(p['feathers'])]
    tail_mat = mat(p['name'] + ' tail', p['tail'], .75)
    tail_tip = mat(p['name'] + ' tail band', p.get('tail_tip', p['tail']), .75)
    bar = mat(p['name'] + ' wing bar', p['wing_bar'], .7) if p.get('wing_bar') else None
    leg_mat = mat('Scaly leg', p['legs'], .6)

    def sc(v):
        return tuple(c * S for c in v)

    loft('Body', [(x * S, z * S, w * S, h * S) for x, z, w, h in
                  [(-1.05, .78, .05, .05), (-.82, .78, .24, .2), (-.45, .8, .42, .36), (-.05, .82, .48, .43),
                   (.35, .86, .43, .43), (.62, .94, .3, .33), (.74, .98, .06, .08)]],
         back, belly=breast, belly_level=p.get('belly_level', .1))
    neck = pivot('neck', sc((.72, 0, 1.08)))
    ellipsoid('Neck', sc((-.02, 0, -.07)), sc((.27, .25, .3)), neck_mat, parent=neck)
    ellipsoid('Head', sc((.17, 0, .12)), sc((.3, .25, .26)), head_mat, parent=neck)
    if p.get('crown'):
        ellipsoid('Crown', sc((.14, 0, .23)), sc((.26, .2, .16)), mat('Crown', p['crown'], .7), parent=neck)
    if p.get('cheek'):
        cheek = mat('Cheek', p['cheek'], .8)
        for s in (-1, 1):
            ellipsoid('Cheek', sc((.17, s * .17, .05)), sc((.15, .1, .12)), cheek, parent=neck)
            if p.get('cheek_spot'):
                ellipsoid('Cheek spot', sc((.12, s * .25, .04)), sc((.06, .03, .05)), pupil, parent=neck)
    if p.get('bib'):
        ellipsoid('Bib', sc((.3, 0, -.08)), sc((.14, .14, .13)), mat('Bib', p['bib'], .8), parent=neck)
    cone('Beak upper', sc((.4, 0, .1)), sc((.64 + p.get('beak_len', 0), 0, .06)), .075 * S, .008 * S, beak, parent=neck)
    cone('Beak lower', sc((.4, 0, .05)), sc((.6 + p.get('beak_len', 0), 0, .045)), .06 * S, .006 * S, beak, parent=neck)
    if p.get('cere'):
        ellipsoid('Cere', sc((.42, 0, .12)), sc((.06, .07, .04)), mat('Cere', p['cere'], .8), parent=neck)
    for s in (-1, 1):
        ellipsoid('Eye', sc((.27, s * .17, .17)), sc((.06, .05, .06)), eye_ring, parent=neck)
        ellipsoid('Pupil', sc((.3, s * .2, .18)), sc((.03, .025, .03)), pupil, parent=neck)

    # Tail: fan of feathers, wider in flight.
    spread = .5 if mode == 'fly' else .22
    for i in range(9):
        a = (i / 8 - .5) * spread
        root = Vector(sc((-.85, 0, .8)))
        # tail_fork lengthens the outer feathers (a swallow's forked tail).
        length = p['tail_len'] * (1 + p.get('tail_fork', 0) * abs(i / 8 - .5) * 2)
        tip = root + Vector((-math.cos(a), math.sin(a), -.02)) * length * S
        feather('Tail feather', root, tip, .1 * S, tail_mat)
        if p.get('tail_tip'):
            band_root = root + (tip - root) * .72
            feather('Tail band', band_root + Vector((0, 0, .005)), tip + Vector((0, 0, .005)), .085 * S, tail_tip)

    if mode == 'walk':
        for s in (-1, 1):
            ellipsoid('Folded wing', sc((-.22, s * .26, 1.02)), sc((.66, .2, .11)), covert, rot=(s * .3, .08, -s * .03))
            for i in range(6):
                root = Vector(sc((-.35 + i * .03, s * (.3 - i * .025), 1.0 - i * .012)))
                feather('Primary', root, root + Vector(sc((-.85 - i * .05, -s * .05 * i, -.1))), .09 * S,
                        feather_mats[i % len(feather_mats)])
            if bar is not None:
                for k, x in enumerate((-.12, -.42)):
                    tube('Wing bar', [sc((x + .06, s * .12, 1.15 - k * .02)), sc((x, s * .27, 1.15 - k * .02)), sc((x - .05, s * .4, 1.07))], .035 * S, bar)
        legs = [Leg(f'leg_{s}', sc((.05, s * .18, .5)), sc((.12, s * .22, .01)), (.32 * S, .32 * S), (.05 * S, .04 * S, .03 * S),
                    leg_mat, 0 if s > 0 else .5, (-1, 0, .1)) for s in (-1, 1)]
        return dict(neck=neck, legs=legs)

    # Flying: shoulder pivot (arm feathers) -> wrist pivot (primaries).
    wings = []
    for s in (-1, 1):
        shoulder = pivot(f'shoulder_{s}', sc((.22, s * .3, 1.0)))
        # Arm: covert surface (leading edge to mid-wing), secondaries behind it.
        arm = ([sc((.06 + .05 * math.sin(math.pi * y / .95), s * y, .01)) for y in (0, .2, .4, .6, .8, .95)] +
               [sc((-.12 - .14 * math.sin(math.pi * y / .95), s * y, .015)) for y in (.95, .8, .6, .4, .2, 0)])
        fan('Arm coverts', sc((-.1, 0, .012)), arm + [arm[0]], covert, parent=shoulder)
        for i in range(9):
            y = s * (.06 + i * .1) * S
            root = Vector((-.12 * S, y, 0))
            m = bar if (bar is not None and i % 3 == 1 and p.get('bar_in_flight', True)) else feather_mats[i % len(feather_mats)]
            feather('Secondary', root, root + Vector(sc((-.62 + i * .015, s * .05, -.01))), .14 * S, m, parent=shoulder)
        wrist = pivot(f'wrist_{s}', sc((0, s * .95, 0)), shoulder)
        hand = [sc((.06, 0, .01)), sc((.03, s * .18, .01)), sc((-.06, s * .32, .01)), sc((-.18, s * .3, .012)), sc((-.22, 0, .012))]
        fan('Hand coverts', sc((-.12, s * .15, .013)), hand + [hand[0]], covert, parent=wrist)
        for i in range(9):
            a = -.1 - i * .13
            root = Vector(sc((-.04 - i * .03, s * (.04 + i * .035), 0)))
            tip = root + Vector((math.sin(a) * .95, s * math.cos(a) * .95, -.015 * i)) * p['primary_len'] * S
            feather('Primary', root, tip, .14 * S, feather_mats[(i + 1) % len(feather_mats)], parent=wrist)
        wings.append((s, shoulder, wrist))
        tube('Tucked foot', [sc((-.1, s * .15, .45)), sc((-.45, s * .13, .5))], .04 * S, leg_mat)
    return dict(neck=neck, wings=wings)


def animate_walk(parts, frames, stride, duty):
    neck = parts['neck']
    step = stride / duty / 2  # body travel per step
    rest = neck.location.copy()
    for frame in range(frames + 1):
        c = frame / frames
        for leg in parts['legs']:
            leg.key(frame, c, stride, duty, .12)
        # Head bob: the head holds still in the world (sliding back relative
        # to the body) for most of each step, then thrusts forward.
        t = (c * 2) % 1
        hold = .7
        x = step * (.5 - t / hold) if t < hold else step * (-.5 + (t - hold) / (1 - hold))
        x *= hold
        key_loc(neck, frame, rest + Vector((x, 0, 0)))


def animate_fly(parts, frames, amp=1.0, hand_amp=.55):
    for frame in range(frames + 1):
        ph = frame / frames * math.tau
        for s, shoulder, wrist in parts['wings']:
            key_rot(shoulder, frame, (s * (.15 + amp * math.sin(ph)), .05 * math.sin(ph), 0))
            # The hand lags the arm and sweeps back on the upstroke.
            key_rot(wrist, frame, (s * hand_amp * math.sin(ph - .7), 0, -s * .25 * max(0, math.sin(ph + 1.5))))
        key_rot(parts['neck'], frame, (0, .04 * math.sin(ph), 0))
