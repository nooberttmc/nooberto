"""YouTube banner for sunkensol, in the same pixel-art rules as the profile picture.

usage: python3 banner.py out.png
2560x1440 built on one 320x180 grid (8x scale): stepped, seam-dithered gradients, glow on the grid, and the
palette of the apricity. thumbnail. The sun and the name sit inside YouTube's 1546x423 safe area (visible on
every device); the open sea and sky around them fill the wider TV/desktop crop.
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
from thumbnail import GOLD, CREAM, ORANGE

GW, GH, S = 320, 180, 8
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16
FONT = {   # 5-wide pixel font, 9 rows (2 descender)
    's': ['.....', '.....', '.####', '#....', '.###.', '....#', '####.', '.....', '.....'],
    'u': ['.....', '.....', '#...#', '#...#', '#...#', '#..##', '.##.#', '.....', '.....'],
    'n': ['.....', '.....', '#.##.', '##..#', '#...#', '#...#', '#...#', '.....', '.....'],
    'k': ['#....', '#....', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '.....', '.....'],
    'e': ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.', '.....', '.....'],
    'o': ['.....', '.....', '.###.', '#...#', '#...#', '#...#', '.###.', '.....', '.....'],
    'l': ['.##..', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.', '.....', '.....'],
}

def text_mask(t):
    cols = []
    for ch in t:   # each letter trimmed to its own width, then one blank column: even spacing
        g = np.array([[c == '#' for c in row] for row in FONT[ch]])
        used = np.nonzero(g.any(axis=0))[0]
        for c in range(used[0], used[-1] + 1): cols.append(g[:, c].tolist())
        cols.append([False] * 9)
    return np.array(cols, bool).T[:, :-1]

def art(sea, sun_y, r):
    img = np.zeros((GH, GW, 4), np.float32)
    def put(x, y, c, a=255):
        if 0 <= x < GW and 0 <= y < GH:
            na = a / 255; o = img[y, x]; oa = o[3] / 255; ta = na + oa * (1 - na)
            if ta > 0: img[y, x, :3] = (np.array(c) * na + o[:3] * oa * (1 - na)) / ta; img[y, x, 3] = ta * 255
    cx = GW // 2
    # beams from the sun up to the surface
    for dx in (-6, 0, 6):
        top, bot = sea + 2, sun_y - r - 1
        for y in range(top, bot + 1):
            f = (y - top) / max(1, bot - top); x = cx - 0.5 + dx * (1.0 - 0.5 * f)
            for j in (-1, 0): put(int(np.floor(x)) + j + 1, y, GOLD, int(25 + 90 * f))
    heart = (240, 160, 70)                                     # the sunken sun
    for y in range(sun_y - r - 1, sun_y + r + 1):
        for x in range(cx - r - 1, cx + r + 1):
            d = np.hypot(x + 0.5 - cx, y + 0.5 - sun_y)
            if d <= r:
                f = min(1, (d / r) ** 1.6 * 1.15); put(x, y, tuple(heart[i] + (CREAM[i] - heart[i]) * f for i in range(3)))
    # the waterline across the whole width, with gentle swells; fainter swells below it
    for x in range(GW):
        y = sea - int(round(0.5 + 0.5 * np.sin(2 * np.pi * (x - cx) / 18)))
        put(x, y, CREAM, 230); put(x, y + 1, GOLD, 120)
    for k, row in enumerate([sea + 7, sea + 15, sea + 26]):
        for x in range(GW):
            if (x // 22 + k) % 3 == 0: continue                 # swells come and go across the sea
            y = row - int(round(0.5 + 0.5 * np.sin(2 * np.pi * (x - cx) / 22 + k * 1.9)))
            put(x, y, ORANGE, int(70 - 15 * k))
    # bubbles beside the beams
    for bx, by, a in [(cx - 14, sun_y - 2, 170), (cx + 15, sun_y - 6, 170), (cx - 19, sea + 6, 120), (cx + 20, sun_y + 5, 120)]:
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]: put(bx + dx, by + dy, CREAM, a)
    # ember twinkles scattered across the sky (more out on the wide edges)
    rng = np.random.default_rng(5)
    stars = []
    while len(stars) < 30:                                        # spaced out: no two twinkles touch
        x, y = int(rng.integers(6, GW - 6)), int(rng.integers(4, sea - 8))
        if all(abs(x - a) + abs(y - b) > 14 for a, b in stars): stars.append((x, y))
    for i, (fx, fy) in enumerate(stars):
        if abs(fx - cx) < 64 and 56 < fy < sea: continue        # keep the name clear
        a = 2 if i % 3 else 3
        for k in range(1, a + 1):
            al = int(220 * (1 - (k - 1) / a) ** 1.2)
            for dx, dy in [(k, 0), (-k, 0), (0, k), (0, -k)]: put(fx + dx, fy + dy, GOLD, al)
        put(fx, fy, CREAM)
    # the name, above the waterline
    m = np.kron(text_mask('sunkensol')[:7], np.ones((2, 2), bool)); tx, ty = cx - m.shape[1] // 2, sea - 19   # 2x pixels
    for y, x in zip(*np.nonzero(m)): put(tx + x, ty + y, CREAM)
    return img

def main(out):
    sea, sun_y, r = 84, 104, 11                                  # all inside the safe area (grid y 63..116)
    yy, xx = (np.mgrid[0:GH, 0:GW] + 0.5)
    sky_c, sea_top, sea_deep = np.array([14, 7, 7], np.float32), np.array([44, 14, 10], np.float32), np.array([12, 4, 6], np.float32)
    under = (yy >= sea + 0.5)[..., None]
    d2 = np.clip((yy - sea) / (GH - sea), 0, 1)[..., None]
    arr = np.where(under, sea_top + (sea_deep - sea_top) * d2 ** 0.8, sky_c)
    arr += np.array([90, 40, 10], np.float32) * np.exp(-(((xx - GW / 2) / 70) ** 2 + ((yy - sun_y) / 30) ** 2) / 2)[..., None]
    arr += np.array([40, 22, 6], np.float32) * np.exp(-(((xx - GW / 2) / 140) ** 2 + ((yy - sea) / 14) ** 2) / 2)[..., None]
    A = art(sea, sun_y, r); alpha = A[..., 3:4] / 255
    halo = np.asarray(Image.fromarray(A.astype(np.uint8), 'RGBA').filter(ImageFilter.GaussianBlur(1.75)), np.float32)
    arr += halo[..., :3] * (halo[..., 3:4] / 255) * 0.7
    q = 11.0; th = np.tile(BAYER, (GH // 4, GW // 4))[..., None]
    bg = np.floor(arr / q + 0.5 + (th - 0.5) * 0.45) * q          # solid bands, dithered seams
    out_arr = bg * (1 - alpha) + np.round(A[..., :3] / 8) * 8 * alpha
    Image.fromarray(np.clip(out_arr, 0, 255).astype(np.uint8)).resize((GW * S, GH * S), Image.NEAREST).save(out)
    print('wrote', out)

if __name__ == '__main__':
    main(sys.argv[1])
