"""Build an articulated 3D barn owl in flight: golden-buff speckled back,
white heart-shaped face with dark eyes, pale underside and broad soft wings
with a slow, silent beat. Run: blender --background --python scripts/build-owl.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from bird import *

reset(37)
FRAMES = 32
parts = build_bird(dict(
    name='Owl', back=(.72, .52, .28), back_dark=(.45, .3, .15), back_light=(.85, .7, .45),
    back_spots=((.35, .35, .38), 50, .01, .025),
    breast=(.95, .92, .85), head=(.72, .52, .28), beak=(.8, .72, .6), beak_len=-.2, eye=(.05, .04, .04),
    wing=(.78, .6, .35), feathers=[(.72, .55, .32), (.85, .72, .5), (.62, .45, .25)], wing_bar=None,
    tail=(.78, .62, .38), tail_len=.5, primary_len=1.3, legs=(.85, .8, .7),
), 'fly')
# Big round head with the white heart-shaped facial disc and large dark eyes.
neck = parts['neck']
face = mat('Owl facial disc', (.97, .95, .9), .85)
rim = mat('Owl disc rim', (.6, .42, .22), .8)
owl_eye = mat('Owl eye', (.02, .015, .015), .1)
ellipsoid('Owl round head', (.1, 0, .16), (.38, .4, .36), mat('Owl crown', (.72, .52, .28), .8), parent=neck)
ellipsoid('Owl disc rim', (.3, 0, .12), (.14, .38, .32), rim, parent=neck)
ellipsoid('Owl facial disc', (.34, 0, .12), (.12, .34, .29), face, parent=neck)
for s in (-1, 1):
    ellipsoid('Owl eye', (.44, s * .13, .16), (.04, .07, .07), owl_eye, parent=neck)
animate_fly(parts, FRAMES, amp=.75, hand_amp=.45)
export('owl', 'Fly', FRAMES)
