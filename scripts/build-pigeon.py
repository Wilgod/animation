"""Build an articulated 3D rock pigeon walking: grey plumage with two black
wing bars, iridescent neck, head-bobbing gait.
Approximates image/animal/Pigeon-walk.png. Run:
blender --background --python scripts/build-pigeon.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from bird import *

reset(13)
STRIDE, DUTY, FRAMES = .4, .6, 40
parts = build_bird(PIGEON, 'walk')
animate_walk(parts, FRAMES, STRIDE, DUTY)
print('STRIDE_PX', stride_px(STRIDE, DUTY))
export('pigeon', 'Walk', FRAMES, reference='image/animal/Pigeon-walk.png')
