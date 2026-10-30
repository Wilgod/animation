"""Build an articulated 3D eastern chipmunk: reddish-brown fur with black and
cream back stripes, striped cheeks, a medium bushy tail and a quick bounding
scurry. Run:
blender --background --python scripts/build-chipmunk.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from mammal import *

reset(41)
STRIDE, DUTY, FRAMES = .42, .45, 30
L, W, H = 2.0, .56, .46
legs, tail, head = build_mammal(dict(
    name='Chipmunk', length=L, width=W, height=H,
    fur=(.62, .38, .2), fur_dark=(.32, .18, .08), fur_light=(.82, .62, .4),
    skin=(.42, .3, .26), ear=(.72, .5, .42), ear_scale=(.05, .12, .15), head_width=.66,
    front=(.5, .7, .0), hind=(-.42, -.38, .5), side_offset=.06,
    front_len=(.24, .28), hind_len=(.32, .36),
    tail_len=1.5, tail_segments=8, tail_r=(.07, .04), tail_rise=.3, bushy_tail=(.2, .2),
    fur_count=1500,
))
# Back stripes: a black stripe down the spine and black-cream-black on each
# side, running from the shoulders to the rump.
black = mat('Chipmunk stripe', (.06, .04, .03), .9)
cream = mat('Chipmunk light stripe', (.9, .82, .66), .9)
cx = -L * .07
for y, z, m, w in ((0, H * 1.83, black, .045), (.17, H * 1.74, black, .04), (.24, H * 1.66, cream, .045),
                   (.31, H * 1.55, black, .04)):
    for s in ((1,) if y == 0 else (-1, 1)):
        ellipsoid('Back stripe', (cx, s * y, z), (L * .3, w, .05), m, rot=(s * y * 1.6, 0, 0))
# Cream belly and the striped face.
ellipsoid('Pale belly', (0, 0, H * .45), (L * .32, W * .7, H * .35), cream)
for s in (-1, 1):
    ellipsoid('Face stripe', (L * .1, s * W * .4, H * .1), (L * .1, .02, .03), black, parent=head)
    ellipsoid('Cheek stripe', (L * .1, s * W * .41, -H * .02), (L * .09, .02, .025), cream, parent=head)
animate_mammal(legs, tail, head, FRAMES, STRIDE, DUTY, .18, tail_amp=.14, head_amp=.05)
print('STRIDE_PX', stride_px(STRIDE, DUTY))
export('chipmunk', 'Walk', FRAMES)
