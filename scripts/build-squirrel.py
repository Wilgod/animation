"""Build an articulated 3D grey squirrel: bounding gait (front and hind pairs
move together), tufted ears and a big bushy tail that waves.
Approximates image/animal/squirrel-walk.png. Run:
blender --background --python scripts/build-squirrel.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from mammal import *

reset(17)
STRIDE, DUTY, FRAMES = .55, .45, 36
legs, tail, head = build_mammal(dict(
    name='Squirrel', length=2.4, width=.55, height=.5,
    fur=(.42, .37, .31), fur_dark=(.2, .17, .13), fur_light=(.66, .6, .52),
    skin=(.3, .24, .2), ear=(.6, .45, .38), ear_scale=(.05, .13, .2), ear_tuft=True, head_width=.62,
    front=(.6, .78, .0), hind=(-.5, -.35, .5), side_offset=.06,
    front_len=(.3, .34), hind_len=(.4, .44),
    tail_len=2.1, tail_segments=9, tail_r=(.09, .05), tail_rise=.35, bushy_tail=(.3, .36),
    fur_count=1800,
))
animate_mammal(legs, tail, head, FRAMES, STRIDE, DUTY, .2, tail_amp=.16, head_amp=.05)
print('STRIDE_PX', stride_px(STRIDE, DUTY))
export('squirrel', 'Walk', FRAMES, reference='image/animal/squirrel-walk.png')
