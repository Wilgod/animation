"""Build an articulated 3D blue-tailed skink facing +X: a glossy, slender
dark-brown body with five cream stripes that fade into a bright electric-blue
tail, short sprawling legs in a diagonal trot and a body that swings side to
side with every step. Run:
blender --background --python scripts/build-skink.py"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from model_kit import *

reset(61)


def skink_texture(w=512, h=128):
    """u runs nose to tail tip, v around the body (v = .25 is the spine):
    dark brown with five cream stripes on the back and a pale belly,
    blending into electric blue along the tail."""
    u = (np.arange(w) + .5) / w
    v = (np.arange(h) + .5) / h
    up = np.sin(v * math.tau)[:, None, None]
    across = np.cos(v * math.tau)[:, None, None]
    brown = np.array((.16, .1, .06))
    cream = np.array((.92, .84, .6))
    belly = np.array((.78, .76, .7))
    rgb = np.broadcast_to(brown, (h, w, 3)).copy()
    for c in (-.62, -.32, 0, .32, .62):
        stripe = np.exp(-((across - c) / .06) ** 2) * (up > 0)
        rgb = rgb * (1 - stripe) + cream * stripe
    under = np.clip(-up * 3, 0, 1)
    rgb = rgb * (1 - under) + belly * under
    blue = np.array((.1, .45, .95))
    tail = np.clip((u - .45) / .15, 0, 1)[None, :, None]
    rgb = rgb * (1 - tail * .85) + blue * tail * .85
    rgb = rgb * (fractal(w)[:h, :, None] * .15 + .92)
    img = bpy.data.images.new('Skink skin', width=w, height=h)
    img.pixels.foreach_set(np.concatenate([np.clip(rgb, 0, 1), np.ones((h, w, 1))], axis=2).astype(np.float32).ravel())
    img.pack()
    return img


skin = mat('Glossy skink skin', (.2, .14, .1), .25, image=skink_texture())
leg_mat = mat('Skink leg', (.2, .14, .09), .35)
eye = mat('Skink eye', (.02, .015, .01), .08)

H = .22
BONES = [1.05, .55, .05, -.45, -1.0, -1.6, -2.2]
body, rig = skinned_loft('Body', [(1.05, H, .02, .02), (.98, H, .1, .07), (.8, H, .16, .11), (.55, H, .14, .11),
                                  (.3, H, .19, .14), (-.1, H, .21, .15), (-.45, H, .17, .13), (-.75, H, .1, .09),
                                  (-1.2, H, .07, .06), (-1.7, H, .04, .04), (-2.2, H, .01, .01)],
                         skin, BONES, sides=24)
bones = [b.name for b in rig.data.bones]
for s in (-1, 1):
    attach_to_bone(ellipsoid('Eye', (.8, s * .12, .29), (.04, .025, .03), eye), rig, bones[0])

STRIDE, DUTY, FRAMES = .34, .55, 30
legs = []
for s in (-1, 1):
    # Diagonal pairs (front right + hind left, front left + hind right) step together.
    for x, phase in ((.42, 0 if s > 0 else .5), (-.38, .5 if s > 0 else 0)):
        legs.append(Leg(f'leg_{s}_{x}', (x, s * .14, H), (x + .05, s * .42, .01), (.17, .18), (.075, .06, .045),
                        leg_mat, phase, (0, s, .6)))

for frame in range(FRAMES + 1):
    c = frame / FRAMES
    for leg in legs:
        leg.key(frame, c, STRIDE, DUTY, .07)
    # The body swings side to side twice per cycle and the wave travels
    # down the tail.
    for i, (name, amp) in enumerate(zip(bones, (.05, .1, .12, .14, .18, .22))):
        key_bone(rig, name, frame, (0, 0, amp * math.sin(c * math.tau * 2 - i * .9)))
framing_guide([(1.1, .9, .2), (-2.3, -.9, .2)])
print('STRIDE_PX', stride_px(STRIDE, DUTY))
export('skink', 'Walk', FRAMES)
