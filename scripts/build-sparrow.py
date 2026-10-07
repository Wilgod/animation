"""Build an articulated 3D tree sparrow in flight: chestnut crown, black bib,
white cheeks, streaked brown back and two-joint flapping wings.
Approximates image/animal/Sparrow-Flying.png. Run:
blender --background --python scripts/build-sparrow.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from bird import *

reset(9)
FRAMES = 16  # ~0.27 s per wingbeat
parts = build_bird(dict(
    name='Sparrow', back=(.46, .3, .16), back_dark=(.12, .07, .04), back_light=(.66, .5, .32),
    back_spots=((.08, .05, .03), 40, .015, .04),
    breast=(.74, .68, .58), head=(.5, .45, .4), crown=(.42, .19, .08), cheek=(.92, .9, .86), cheek_spot=True,
    bib=(.05, .04, .04), beak=(.2, .18, .17), eye=(.08, .06, .05),
    wing=(.5, .33, .18), feathers=[(.36, .23, .12), (.22, .14, .08), (.5, .35, .2)], wing_bar=(.88, .85, .78), bar_in_flight=False,
    tail=(.36, .25, .15), tail_len=.85, primary_len=1.05, legs=(.62, .48, .38), beak_len=-.06,
), 'fly')
animate_fly(parts, FRAMES, amp=1.05, hand_amp=.6)
export('sparrow', 'Fly', FRAMES, reference='image/animal/Sparrow-Flying.png')
