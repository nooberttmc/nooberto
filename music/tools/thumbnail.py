"""Thumbnail for "apricity." in the style of glitchy pixel-icon breakcore covers.

usage: python3 thumbnail.py events.json drums.json song.mp3 out.png
Background: the song's own arrangement view (from visualize.py), zoomed out and dimmed.
Centre: a pixel-art sun sinking beneath the waves, with a soft glow and violet sparks.
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

def icon(grid=40):
    """A winter sun setting into the sea: clean half disc, bold rays, three swells narrowing to the horizon,
    with the sun's warm reflection running down their middle. Drawn on a small grid, scaled with hard edges."""
    img = Image.new('RGBA', (grid, grid), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    cx, hy, r = 20, 23, 10                                        # centre x, horizon y, sun radius
    d.pieslice([cx - r, hy - r, cx + r - 1, hy + r - 1], 180, 360, fill=CREAM)
    for k in range(1, 6):                                         # five rays over the upper half
        ang = np.pi + (k + 0.5) * np.pi / 7; L = 5 if k % 2 == 0 else 3
        x0, y0 = cx - 0.5 + np.cos(ang) * (r + 2), hy - 0.5 + np.sin(ang) * (r + 2)
        x1, y1 = cx - 0.5 + np.cos(ang) * (r + 2 + L), hy - 0.5 + np.sin(ang) * (r + 2 + L)
        d.line([(round(x0), round(y0)), (round(x1), round(y1))], fill=ORANGE, width=2)
    d.line([(cx - 16, hy), (cx + 15, hy)], fill=CREAM)            # the horizon
    for row, half in [(hy + 3, 13), (hy + 6, 10), (hy + 9, 7), (hy + 12, 4)]:   # swells, narrowing
        for x in range(cx - half, cx + half):
            if (x - cx) % 4 == 3: continue                        # little breaks between crests
            near = abs(x - cx + 0.5) / half
            f = min(1, near * 1.4); a0, a1, k = (GOLD, ORANGE, f * 2) if f < 0.5 else (ORANGE, RED, f * 2 - 1)
            c = tuple(int(a0[i] + (a1[i] - a0[i]) * k) for i in range(3))
            d.point((x, row), fill=c)
            if (x - cx) % 4 == 1: d.point((x, row - 1), fill=c)   # a crest pixel above each wave
    for fx, fy in [(4, 4), (35, 3), (3, 13), (36, 12), (10, 2), (29, 2)]:  # eclipse-violet sparks, in open sky
        for dx, dy in [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)]:
            d.point((fx + dx, fy + dy), fill=VIOLET + (175,))
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
    ic = icon(); s = 12; big = ic.resize((ic.width * s, ic.height * s), Image.NEAREST)
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
