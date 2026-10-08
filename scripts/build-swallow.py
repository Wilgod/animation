"""Build an articulated 3D barn swallow in flight: glossy steel-blue back,
rusty throat, cream belly, long pointed wings and a deeply forked tail. Run:
blender --background --python scripts/build-swallow.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from bird import *

reset(33)
FRAMES = 18
parts = build_bird(dict(
    name='Swallow', back=(.06, .1, .26), back_dark=(.02, .03, .1), back_light=(.12, .2, .45),
    breast=(.88, .78, .62), head=(.06, .1, .26), neck=(.06, .1, .26), neck_metal=.4,
    crown=(.06, .1, .26), bib=(.55, .2, .08), beak=(.05, .04, .04), beak_len=-.12, eye=(.03, .02, .02),
    wing=(.08, .1, .2), feathers=[(.05, .06, .14), (.08, .1, .2), (.04, .05, .1)], wing_bar=None,
    tail=(.06, .09, .22), tail_len=.75, tail_fork=1.4, primary_len=1.55, legs=(.1, .08, .07),
), 'fly')
animate_fly(parts, FRAMES, amp=.9, hand_amp=.55)
export('swallow', 'Fly', FRAMES)
