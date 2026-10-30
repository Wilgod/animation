"""Build an articulated 3D European robin in flight: orange-red face and
breast, olive-brown back and wings, pale belly and two-joint flapping wings.
Run: blender --background --python scripts/build-robin.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from bird import *

reset(47)
FRAMES = 16  # ~0.27 s per wingbeat
parts = build_bird(dict(
    name='Robin', back=(.4, .34, .2), back_dark=(.22, .18, .1), back_light=(.55, .48, .32),
    breast=(.92, .42, .12), head=(.42, .35, .22), cheek=(.95, .45, .14),
    bib=(.95, .45, .14), beak=(.12, .1, .09), eye=(.05, .04, .04),
    wing=(.42, .35, .2), feathers=[(.34, .28, .16), (.26, .2, .12), (.44, .37, .22)],
    tail=(.36, .3, .18), tail_len=.75, primary_len=1.0, legs=(.5, .38, .3), beak_len=-.08,
), 'fly')
# Orange face mask (visible from above), and a pale belly behind the
# orange breast.
orange = mat('Robin orange face', (.95, .45, .14), .8)
ellipsoid('Face', (.34, 0, .05), (.16, .26, .2), orange, parent=parts['neck'])
ellipsoid('Throat', (.04, 0, -.1), (.25, .27, .24), orange, parent=parts['neck'])
ellipsoid('White belly', (-.35, 0, .5), (.42, .3, .14), mat('Robin belly', (.92, .9, .86), .85))
animate_fly(parts, FRAMES, amp=1.05, hand_amp=.6)
export('robin', 'Fly', FRAMES)
