"""Build an articulated 3D ruby-throated hummingbird in flight: iridescent
green back, ruby throat, long needle beak and very fast wingbeats. Run:
blender --background --python scripts/build-hummingbird.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from bird import *

reset(31)
FRAMES = 6  # wings blur at this speed, as real ones do
parts = build_bird(dict(
    name='Hummingbird', back=(.12, .42, .18), back_dark=(.04, .2, .08), back_light=(.3, .62, .3),
    breast=(.82, .84, .78), head=(.1, .38, .16), neck=(.1, .4, .18), neck_metal=.5,
    bib=(.75, .04, .1), beak=(.05, .04, .04), beak_len=.6, eye=(.03, .02, .02),
    wing=(.2, .22, .2), feathers=[(.16, .17, .16), (.22, .23, .22), (.12, .13, .12)], wing_bar=None,
    tail=(.1, .3, .14), tail_len=.55, primary_len=1.25, legs=(.08, .07, .06),
), 'fly')
animate_fly(parts, FRAMES, amp=1.1, hand_amp=.35)
export('hummingbird', 'Fly', FRAMES)
