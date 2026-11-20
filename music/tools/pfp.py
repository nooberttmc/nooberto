"""Profile picture for sunkensol: a sun sunk beneath the waterline, light rising from it to the surface.

usage: python3 pfp.py out.png
Pixel art on a 64x64 grid (same palette as the apricity. thumbnail), scaled 16x to 1024x1024.
Everything important sits inside the central circle, so a round crop loses nothing.
"""
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
from thumbnail import GOLD, CREAM, ORANGE, RED

G, S = 64, 16
SIZE = G * S
BG_TOP, BG_DEEP = (20, 9, 8), (9, 4, 6)          # ember-black, deepening with depth

def art():
    img = Image.new('RGBA', (G, G), (0, 0, 0, 0)); px = img.load()
    cx, sea = 32, 18                              # centre x, waterline y
    sy, r = 42, 11                                # the sunken sun
    heart = (240, 160, 70)
    def put(x, y, c, a=255):
        if 0 <= x < G and 0 <= y < G:
            if a >= 255: px[x, y] = c + (255,)
            else:                                 # blend over what is there
                o = px[x, y]; oa = o[3] / 255; na = a / 255; ta = na + oa * (1 - na)
                if ta <= 0: return
                px[x, y] = tuple(int((c[i] * na + o[i] * oa * (1 - na)) / ta) for i in range(3)) + (int(ta * 255),)
    # light shafts: three straight beams fanning up from the sun to the surface, fading as they rise
    for dx in (-7, 0, 7):
        top, bot = sea + 2, sy - r - 1
        for y in range(top, bot + 1):
            f = (y - top) / (bot - top)           # 0 at the surface .. 1 at the sun
            x = cx - 0.5 + dx * (1.0 - 0.55 * f)
            for j in (-1, 0): put(int(np.floor(x)) + j + 1, y, GOLD, int(25 + 90 * f))
    # the sun: a full disc, deep gold at its heart, cream at the rim
    for y in range(sy - r - 1, sy + r + 1):
        for x in range(cx - r - 1, cx + r + 1):
            d = np.hypot(x + 0.5 - cx, y + 0.5 - sy)   # pixel centres: a round disc with no nubs
            if d <= r:
                f = min(1, (d / r) ** 1.6 * 1.15)
                put(x, y, tuple(int(heart[i] + (CREAM[i] - heart[i]) * f) for i in range(3)))
    # the waterline: a cream surface with gentle swells, and the light pooling on it
    for x in range(8, 56):
        y = sea - int(round(0.5 + 0.5 * np.sin(2 * np.pi * (x - cx) / 14)))
        edge = min(x - 8, 55 - x); a = int(255 * min(1, (edge + 1) / 5))
        put(x, y, CREAM, a); put(x, y + 1, GOLD, int(a * 0.6))
    # bubbles rising beside the beams: small rings
    for bx, by, a in [(19, 34, 170), (45, 31, 170), (16, 25, 120), (48, 38, 120), (42, 23, 110)]:
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]: put(bx + dx, by + dy, CREAM, a)
    # ember twinkles in the sky above the water
    for fx, fy, a in [(19, 9, 3), (45, 8, 3), (32, 5, 2)]:
        for k in range(1, a + 1):
            al = int(230 * (1 - (k - 1) / a) ** 1.2)
            for dx, dy in [(k, 0), (-k, 0), (0, k), (0, -k)]: put(fx + dx, fy + dy, GOLD, al)
        put(fx, fy, CREAM)
    return img

def main(out):
    yy, xx = np.mgrid[0:SIZE, 0:SIZE] / SIZE
    depth = np.clip((yy - 0.3) / 0.7, 0, 1)[..., None]
    sky_c, sea_top, sea_deep = np.array([14, 7, 7], np.float32), np.array([44, 14, 10], np.float32), np.array([12, 4, 6], np.float32)
    under = (yy >= 18.5 / 64)[..., None]
    d2 = np.clip((yy - 18.5 / 64) / (1 - 18.5 / 64), 0, 1)[..., None]
    arr = np.where(under, sea_top + (sea_deep - sea_top) * d2 ** 0.8, sky_c)
    glow = np.exp(-(((xx - 0.5) ** 2 + (yy - 42 / 64) ** 2) / (2 * 0.17 ** 2)))[..., None]   # warmth around the sun
    arr += np.array([90, 40, 10], np.float32) * glow
    sky = np.exp(-(((xx - 0.5) ** 2 + (yy - 18 / 64) ** 2 * 6) / (2 * 0.2 ** 2)))[..., None]   # light at the surface
    arr += np.array([40, 22, 6], np.float32) * sky
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert('RGBA')
    big = art().resize((SIZE, SIZE), Image.NEAREST)
    halo = big.filter(ImageFilter.GaussianBlur(28))
    img = Image.alpha_composite(img, Image.blend(Image.new('RGBA', img.size, (0, 0, 0, 0)), halo, 0.7))
    img.alpha_composite(big)
    img.convert('RGB').save(out)
    print('wrote', out)

if __name__ == '__main__':
    main(sys.argv[1])
