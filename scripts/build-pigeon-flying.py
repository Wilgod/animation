"""Build an articulated 3D rock pigeon in flight (two-joint flapping wings,
fanned tail). Approximates image/animal/Pigeon-fly.png. Run:
blender --background --python scripts/build-pigeon-flying.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from bird import *

reset(13)
FRAMES = 24  # ~0.4 s per wingbeat
parts = build_bird(PIGEON, 'fly')
animate_fly(parts, FRAMES, amp=.95, hand_amp=.5)
export('pigeon-flying', 'Fly', FRAMES, reference='image/animal/Pigeon-fly.png')
