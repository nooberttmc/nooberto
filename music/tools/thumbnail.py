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
    """A sun setting into the sea: clean half disc, bold rays, four swells narrowing to the horizon with the sun's
    warm reflection down their middle, and ember sparks. Drawn on an 80x80 grid, then scaled with hard pixel edges."""
    img = Image.new('RGBA', (grid, grid), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    cx, hy, r = 40, 46, 20                                        # centre x, horizon y, sun radius
    d.pieslice([cx - r, hy - r, cx + r - 1, hy + r - 1], 180, 360, fill=CREAM)
    for k in range(1, 6):                                         # five rays over the upper half
        ang = np.pi + (k + 0.5) * np.pi / 7; L = 10 if k % 2 == 1 else 7
        x0, y0 = cx - 0.5 + np.cos(ang) * (r + 4), hy - 0.5 + np.sin(ang) * (r + 4)
        x1, y1 = cx - 0.5 + np.cos(ang) * (r + 4 + L), hy - 0.5 + np.sin(ang) * (r + 4 + L)
        d.line([(round(x0), round(y0)), (round(x1), round(y1))], fill=ORANGE, width=3)
    d.rectangle([cx - 32, hy, cx + 31, hy + 1], fill=CREAM)       # the horizon
    def wave_col(x, half):                                        # gold reflection in the middle -> orange -> red
        f = min(1, abs(x - cx + 0.5) / half * 1.4)
        a0, a1, k = (GOLD, ORANGE, f * 2) if f < 0.5 else (ORANGE, RED, f * 2 - 1)
        return tuple(int(a0[i] + (a1[i] - a0[i]) * k) for i in range(3))
    for n, (row, half) in enumerate([(hy + 6, 27), (hy + 12, 21), (hy + 18, 15), (hy + 24, 9)]):   # swells, narrowing
        for x in range(cx - half, cx + half):
            ph = (x - cx + n * 3) % 8
            if ph == 7: continue                                  # small breaks between crests
            y = row - (1 if ph in (2, 3, 4) else 0)               # a rounded crest on every wave
            d.rectangle([x, y, x, y + 1], fill=wave_col(x, half))
    for fx, fy, big in [(8, 8, 1), (70, 7, 1), (6, 26, 0), (73, 24, 0), (20, 4, 0), (58, 4, 0)]:   # ember sparks: twinkles
        a = 3 if big else 2
        d.line([(fx - a, fy), (fx + a, fy)], fill=GOLD + (200,)); d.line([(fx, fy - a), (fx, fy + a)], fill=GOLD + (200,))
        d.point((fx, fy), fill=CREAM + (230,))
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

def main(events, drums, audio, out):
    # background: the arrangement view in its own colours (a Phase I frame), dimmed, with a vignette
    bg = arrangement(events, drums, audio, t=20.0).resize((W, H))
    arr = np.asarray(bg, np.float32) * 0.55
    yy, xx = np.mgrid[0:H, 0:W]
    vign = 1 - 0.6 * np.clip(np.hypot((xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2)) - 0.25, 0, 1)
    arr *= vign[..., None]
    halo = np.exp(-(((xx - W / 2) ** 2 + (yy - H / 2 + 20) ** 2) / (2 * 220.0 ** 2)))   # warm light behind the sun
    arr += np.array([70, 34, 8], np.float32) * halo[..., None]
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert('RGBA')
    # the icon, centred, with a glow
    ic = icon(); s = 6; big = ic.resize((ic.width * s, ic.height * s), Image.NEAREST)
    ox, oy = (W - big.width) // 2, (H - big.height) // 2
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); glow.paste(big, (ox, oy), big)
    glow = glow.filter(ImageFilter.GaussianBlur(20))
    img = Image.alpha_composite(img, Image.blend(Image.new('RGBA', (W, H), (0, 0, 0, 0)), glow, 0.75))
    img.alpha_composite(big, (ox, oy))
    a = np.asarray(img.convert('RGB')).copy()
    a[::3] = (a[::3] * 0.88).astype(np.uint8)   # faint, even scanlines
    Image.fromarray(a).save(out)
    print('wrote', out)

if __name__ == '__main__':
    main(*sys.argv[1:5])
