"""Build an articulated 3D field mouse: brown furred body, large ears, long
bare swaying tail and a four-beat walk. Approximates
image/animal/fieldmouse-walk.png. Run:
blender --background --python scripts/build-fieldmouse.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from mammal import *

reset(21)
STRIDE, DUTY, FRAMES = .32, .6, 40
legs, tail, head = build_mammal(dict(
    name='Field mouse', length=2.1, width=.6, height=.48,
    fur=(.42, .26, .14), fur_dark=(.2, .11, .05), fur_light=(.62, .45, .28),
    skin=(.78, .55, .5), ear=(.8, .52, .5), ear_scale=(.05, .2, .2), head_width=.7,
    front=(.5, .62, .25), hind=(-.45, -.42, 0), side_offset=.5,
    front_len=(.26, .3), hind_len=(.3, .36),
    tail_len=2.2, tail_segments=8, tail_r=(.05, .015), tail_rise=.05, bare_tail=True,
))
animate_mammal(legs, tail, head, FRAMES, STRIDE, DUTY, .1, tail_amp=.1)
print('STRIDE_PX', stride_px(STRIDE, DUTY))
export('fieldmouse', 'Walk', FRAMES, reference='image/animal/fieldmouse-walk.png')
