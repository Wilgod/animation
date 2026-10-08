"""Build an articulated 3D herring gull in flight: white head and body,
pale grey back, long wings with black tips, yellow beak and a slow, gliding
wingbeat. Run: blender --background --python scripts/build-seagull.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from bird import *

reset(35)
FRAMES = 40  # slow, shallow strokes
parts = build_bird(dict(
    name='Seagull', back=(.66, .69, .73), back_dark=(.55, .58, .62), back_light=(.78, .8, .84),
    breast=(.95, .95, .94), head=(.95, .95, .94), neck=(.95, .95, .94),
    beak=(.95, .75, .15), beak_len=.08, eye=(.85, .75, .2), cere=None,
    wing=(.7, .73, .77), feathers=[(.05, .05, .06), (.72, .75, .79), (.08, .08, .09)], wing_bar=None,
    tail=(.95, .95, .94), tail_len=.7, primary_len=1.75, legs=(.85, .6, .55),
), 'fly')
animate_fly(parts, FRAMES, amp=.6, hand_amp=.35)
export('seagull', 'Fly', FRAMES)
