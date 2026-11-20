"""Thumbnail for "apricity." in the style of glitchy pixel-icon breakcore covers.

usage: python3 thumbnail.py events.json drums.json song.mp3 out.png
Background: the song's own arrangement view (from visualize.py), zoomed out and dimmed.
Centre: a pixel-art sun sinking beneath the waves, with a soft glow and ember sparks.
Colours from the song video; faint scanlines.
"""
import sys, os, subprocess, tempfile, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
import visualize

W, H = 1280, 720
# the song video's palette (the Drowned Sun fight): ember-black, molten orange, gold, cream, flare red, eclipse violet
GOLD, CREAM, ORANGE, RED, VIOLET = (255, 208, 96), (255, 240, 192), (255, 176, 64), (255, 80, 48), (192, 96, 255)

def arrangement(events, drums, audio, t=96.0):
    """One frame of the arrangement view, zoomed out so many bars are visible."""
    visualize.PX = 70.0
    with tempfile.TemporaryDirectory() as d:
        mp4, png = os.path.join(d, 'f.mp4'), os.path.join(d, 'f.png')
        visualize.main(events, drums, audio, mp4, 30, t, 0.1)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', mp4, '-frames:v', '1', png], check=True)
        return Image.open(png).convert('RGB')

def icon(grid=80):
    """A sun setting into the sea: a half disc shading from warm gold at its heart to cream at the rim, seven bold rays,
    four smooth swells narrowing to the horizon with the sun's reflection down their middle, and ember twinkles.
    Drawn on an 80x80 grid, then scaled with hard pixel edges."""
    img = Image.new('RGBA', (grid, grid), (0, 0, 0, 0)); d = ImageDraw.Draw(img); px = img.load()
    cx, hy, r = 40, 46, 20                                        # centre x, horizon y, sun radius
    heart = (246, 186, 98)                                        # a deeper, warmer gold at the centre
    for y in range(hy - r, hy):
        for x in range(cx - r, cx + r):
            dist = np.hypot(x - cx + 0.5, y - hy + 0.5)
            if dist <= r:
                f = min(1, (dist / r) ** 1.6 * 1.15)              # heart -> cream towards the rim
                px[x, y] = tuple(int(heart[i] + (CREAM[i] - heart[i]) * f) for i in range(3)) + (255,)
    rays = Image.new('L', (grid, grid), 0); rd = ImageDraw.Draw(rays)
    for k in range(7):                                            # seven rays over the upper half
        ang = np.pi + (k + 0.5) * np.pi / 7; L = 10 if k % 2 == 1 else 7
        x0, y0 = cx - 0.5 + np.cos(ang) * (r + 4), hy - 0.5 + np.sin(ang) * (r + 4)
        x1, y1 = cx - 0.5 + np.cos(ang) * (r + 4 + L), hy - 0.5 + np.sin(ang) * (r + 4 + L)
        nx, ny = -np.sin(ang) * 1.5, np.cos(ang) * 1.5            # a solid bar, 3 px wide, square ends
        rd.polygon([(x0 + nx, y0 + ny), (x1 + nx, y1 + ny), (x1 - nx, y1 - ny), (x0 - nx, y0 - ny)], fill=255)
    m = np.asarray(rays) > 0                                      # clean-up: a 2x2 opening drops stray single pixels
    er = m[:-1, :-1] & m[1:, :-1] & m[:-1, 1:] & m[1:, 1:]
    op = np.zeros_like(m); op[:-1, :-1] |= er; op[1:, :-1] |= er; op[:-1, 1:] |= er; op[1:, 1:] |= er
    for y, x in zip(*np.nonzero(op)): px[x, y] = ORANGE + (255,)
    d.rectangle([cx - 32, hy, cx + 31, hy + 1], fill=CREAM)       # the horizon
    def wave_col(x, half):                                        # gold reflection in the middle -> orange -> red
        f = min(1, abs(x - cx + 0.5) / half * 1.4)
        a0, a1, k = (GOLD, ORANGE, f * 2) if f < 0.5 else (ORANGE, RED, f * 2 - 1)
        return tuple(int(a0[i] + (a1[i] - a0[i]) * k) for i in range(3))
    for n, (row, half) in enumerate([(hy + 6, 27), (hy + 12, 21), (hy + 18, 15), (hy + 24, 9)]):   # smooth swells
        for x in range(cx - half, cx + half):
            # a gentle swell: a long, shallow sine (one-pixel rise), so the line reads as smooth water
            y = row - int(round(0.5 + 0.5 * np.sin(2 * np.pi * (x - cx) / 16 + n * 1.7)))
            edge = min(x - (cx - half), cx + half - 1 - x)        # the ends fade out instead of breaking off
            al = int(255 * min(1, (edge + 1) / 4))
            d.rectangle([x, y, x, y + 1], fill=wave_col(x, half) + (al,))
    for fx, fy, big in [(8, 8, 1), (70, 7, 1), (6, 26, 0), (73, 24, 0), (20, 4, 0), (58, 4, 0)]:   # twinkles
        a = 4 if big else 3
        for k in range(1, a + 1):                                 # arms fade towards their tips
            al = int(230 * (1 - (k - 1) / a) ** 1.2)
            for dx, dy in [(k, 0), (-k, 0), (0, k), (0, -k)]: px[fx + dx, fy + dy] = GOLD + (al,)
        for dx, dy in [(1, 1), (-1, 1), (1, -1), (-1, -1)]: px[fx + dx, fy + dy] = GOLD + (110,)   # soft diagonal glow
        px[fx, fy] = CREAM + (255,)
    return img

GLYPHS = {   # 5-wide pixel font, rows 0-6 + 2 descender rows
    'a': ['.....', '.....', '.###.', '....#', '.####', '#...#', '.####', '.....', '.....'],
    'p': ['.....', '.....', '####.', '#...#', '#...#', '#...#', '####.', '#....', '#....'],
    'r': ['.....', '.....', '#.##.', '##..#', '#....', '#....', '#....', '.....', '.....'],
    'i': ['..#..', '.....', '.##..', '..#..', '..#..', '..#..', '.###.', '.....', '.....'],
    'c': ['.....', '.....', '.###.', '#....', '#....', '#....', '.###.', '.....', '.....'],
    't': ['.#...', '.#...', '####.', '.#...', '.#...', '.#..#', '..##.', '.....', '.....'],
    'y': ['.....', '.....', '#...#', '#...#', '#...#', '#...#', '.####', '....#', '.###.'],
    '.': ['..', '..', '..', '..', '..', '##', '##', '..', '..'],
}

def pixel_text(text, scale):
    cols = []
    for ch in text:
        g = GLYPHS[ch]
        for c in range(len(g[0])): cols.append([g[r][c] == '#' for r in range(9)])
        cols.append([False] * 9)
    a = np.array(cols, bool).T[:, :-1]
    m = Image.fromarray((a * 255).astype(np.uint8), 'L')
    return m.resize((m.width * scale, m.height * scale), Image.NEAREST)

BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16

def main(events, drums, audio, out):
    # background: the arrangement view in its own colours (a Phase I frame), dimmed, with a vignette
    bg = arrangement(events, drums, audio, t=20.0).resize((W, H))
    arr = np.asarray(bg, np.float32) * 0.55
    yy, xx = np.mgrid[0:H, 0:W]
    vign = 1 - 0.6 * np.clip(np.hypot((xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2)) - 0.25, 0, 1)
    arr *= vign[..., None]
    # the icon's light (warm halo + glow) is pixel art too: built on the icon's own pixel grid, in stepped
    # bands with dithered seams, so it lines up with the icon's pixels. The background stays as it is.
    ic = icon(); s = 6; big = ic.resize((ic.width * s, ic.height * s), Image.NEAREST)
    ox, oy = (W - big.width) // 2, (H - big.height) // 2
    kx, ky = -(-ox // s), -(-oy // s)                       # grid cells to the left of / above the icon
    gx0, gy0 = ox - kx * s, oy - ky * s                     # where the grid starts (<= 0)
    nx, ny = -(-(W - gx0) // s), -(-(H - gy0) // s)
    cy, cx = (np.mgrid[0:ny, 0:nx] + 0.5) * s + np.array([gy0, gx0])[:, None, None]
    light = np.array([70, 34, 8], np.float32) * np.exp(-(((cx - W / 2) ** 2 + (cy - H / 2 + 20) ** 2) / (2 * 220.0 ** 2)))[..., None]
    grid_ic = Image.new('RGBA', (nx, ny), (0, 0, 0, 0)); grid_ic.paste(ic, (kx, ky), ic)
    gl = np.asarray(grid_ic.filter(ImageFilter.GaussianBlur(20 / s)), np.float32)
    light += gl[..., :3] * (gl[..., 3:4] / 255) * 0.75
    th = np.tile(BAYER, (ny // 4 + 1, nx // 4 + 1))[:ny, :nx, None]
    q = 9.0; light = np.floor(light / q + 0.5 + (th - 0.5) * 0.45) * q
    light_big = np.asarray(Image.fromarray(np.clip(light, 0, 255).astype(np.uint8)).resize((nx * s, ny * s), Image.NEAREST), np.float32)
    arr += light_big[-gy0:-gy0 + H, -gx0:-gx0 + W]
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert('RGBA')
    img.alpha_composite(big, (ox, oy))
    a = np.asarray(img.convert('RGB')).copy()
    a[::3] = (a[::3] * 0.88).astype(np.uint8)   # faint, even scanlines
    Image.fromarray(a).save(out)
    print('wrote', out)

if __name__ == '__main__':
    main(*sys.argv[1:5])
