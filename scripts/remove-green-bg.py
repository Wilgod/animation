import sys
from PIL import Image

def dechroma(path_in, path_out, low=45, high=140, bg=(7, 216, 3)):
    im = Image.open(path_in).convert('RGBA')
    px = im.load()
    w, h = im.size
    bg_r, bg_g, bg_b = bg
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            excess = g - max(r, b)
            if excess <= low:
                alpha = 255
            elif excess >= high:
                alpha = 0
            else:
                t = (excess - low) / (high - low)
                alpha = int(round((1 - t) * 255))
            alpha = min(alpha, a)
            if alpha <= 0:
                px[x, y] = (r, g, b, 0)
                continue
            af = alpha / 255.0
            af = max(af, 0.4)
            inv = 1 - af
            nr = int(round((r - inv * bg_r) / af))
            ng = int(round((g - inv * bg_g) / af))
            nb = int(round((b - inv * bg_b) / af))
            nr = max(0, min(255, nr))
            ng = max(0, min(255, ng))
            nb = max(0, min(255, nb))
            ng = min(ng, max(nr, nb))
            px[x, y] = (nr, ng, nb, alpha)
    im.save(path_out)

if __name__ == '__main__':
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else src
    dechroma(src, dst)
    print('done ->', dst)
