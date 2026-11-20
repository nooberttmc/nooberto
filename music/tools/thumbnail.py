"""Thumbnail for "apricity." in the style of glitchy pixel-icon breakcore covers.

usage: python3 thumbnail.py events.json drums.json song.mp3 out.png
Background: the song's own arrangement view (from visualize.py), zoomed out, tinted cold and dimmed.
Centre: a pixel-art winter sun sinking beneath the waves, with a soft glow and drifting snow.
Below: the title in a pixel font. Scanlines and horizontal glitch bands over everything.
"""
import sys, os, subprocess, tempfile, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
import visualize

W, H = 1280, 720
GOLD, CREAM, EMBER = (255, 214, 140), (255, 240, 205), (232, 150, 70)
COLD_DARK, COLD = (8, 12, 24), (70, 110, 170)

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
        d.line([(round(x0), round(y0)), (round(x1), round(y1))], fill=GOLD, width=2)
    d.line([(cx - 16, hy), (cx + 15, hy)], fill=CREAM)            # the horizon
    for row, half in [(hy + 3, 13), (hy + 6, 10), (hy + 9, 7), (hy + 12, 4)]:   # swells, narrowing
        for x in range(cx - half, cx + half):
            if (x - cx) % 4 == 3: continue                        # little breaks between crests
            near = abs(x - cx + 0.5) / half
            c = tuple(int(GOLD[i] + ((150, 190, 235)[i] - GOLD[i]) * min(1, near * 1.4)) for i in range(3))
            d.point((x, row), fill=c)
            if (x - cx) % 4 == 1: d.point((x, row - 1), fill=c)   # a crest pixel above each wave
    for fx, fy in [(4, 4), (35, 3), (3, 13), (36, 12), (10, 2), (29, 2)]:  # snowflakes: small crosses, in open sky
        for dx, dy in [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)]:
            d.point((fx + dx, fy + dy), fill=(214, 232, 255, 230))
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
    rnd = random.Random(11)
    # background: the arrangement, made cold and quiet
    bg = arrangement(events, drums, audio).resize((W, H))
    g = np.asarray(bg.convert('L'), np.float32) / 255
    base = np.array(COLD_DARK, np.float32); tint = np.array(COLD, np.float32)
    arr = base + (tint - base) * (g[..., None] ** 0.9) * 0.6
    yy, xx = np.mgrid[0:H, 0:W]
    vign = 1 - 0.55 * np.clip(np.hypot((xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2)) - 0.25, 0, 1)
    arr *= vign[..., None]
    # a faint warm halo behind the sun
    halo = np.exp(-(((xx - W / 2) ** 2 + (yy - 250) ** 2) / (2 * 200.0 ** 2)))
    arr += np.array([60, 38, 14], np.float32) * halo[..., None]
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    # icon + glow
    ic = icon(); s = 10; big = ic.resize((ic.width * s, ic.height * s), Image.NEAREST)
    ox, oy = (W - big.width) // 2, 285 - big.height // 2
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); glow.paste(big, (ox, oy), big)
    glow = glow.filter(ImageFilter.GaussianBlur(18))
    img = Image.alpha_composite(img.convert('RGBA'), Image.blend(Image.new('RGBA', (W, H), (0, 0, 0, 0)), glow, 0.75))
    img.alpha_composite(big, (ox, oy))
    # title
    tx = pixel_text('apricity.', 7); tcol = Image.new('RGBA', tx.size, CREAM + (255,)); tcol.putalpha(tx)
    tglow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); tx0, ty0 = (W - tx.width) // 2, 545
    tglow.paste(tcol, (tx0, ty0), tcol); tglow = tglow.filter(ImageFilter.GaussianBlur(8))
    img = Image.alpha_composite(img, Image.blend(Image.new('RGBA', (W, H), (0, 0, 0, 0)), tglow, 0.6))
    img.alpha_composite(tcol, (tx0, ty0))
    # glitch: shifted horizontal bands, bright hairlines, scanlines
    a = np.asarray(img.convert('RGB')).copy()
    keep = [(oy - 10, oy + big.height + 10), (ty0 - 10, ty0 + tx.height + 10)]   # icon and title stay clean
    n = 0
    while n < 14:
        y0 = rnd.randrange(0, H - 8); hgt = rnd.randrange(2, 9); sh = rnd.randrange(-40, 40)
        if any(y0 < b and y0 + hgt > a0 for a0, b in keep): continue
        a[y0:y0 + hgt] = np.roll(a[y0:y0 + hgt], sh, axis=1); n += 1
    for _ in range(22):
        y0 = rnd.randrange(0, H); x0 = rnd.randrange(0, W - 200); ln = rnd.randrange(80, 520)
        c = np.array(rnd.choice([GOLD, (160, 200, 255), CREAM]), np.float32)
        a[y0, x0:x0 + ln] = np.clip(a[y0, x0:x0 + ln] * 0.6 + c * 0.4, 0, 255)
    a[::3] = (a[::3] * 0.86).astype(np.uint8)
    Image.fromarray(a).save(out)
    print('wrote', out)

if __name__ == '__main__':
    main(*sys.argv[1:5])
