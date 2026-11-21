"""Thumbnail for "crucible." (sunkensol): single colour, no gradients, pixel art.

usage: python3 thumbnail.py events.json drums.json song.mp3 out.png
Background: the song's own arrangement view, recoloured in the one colour at low brightness (flat, no vignette).
Centre: a pixel-art crucible over three flames, molten metal at the brim, sparks rising in groups of 3+3+2 (the
song's ostinato rhythm). One colour on black: details are cut-outs (negative space), never shading.
"""
import sys, os, subprocess, tempfile
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'scripts'))   # the skill's visualize.py
import visualize

W, H = 1280, 720
COL = np.array([255, 138, 48], np.float32)   # the song's molten orange (its A section colour), the only colour

def arrangement(events, drums, audio, t):
    visualize.PX = 70.0
    with tempfile.TemporaryDirectory() as d:
        mp4, png = os.path.join(d, 'f.mp4'), os.path.join(d, 'f.png')
        visualize.main(events, drums, audio, mp4, 30, t, 0.1)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', mp4, '-frames:v', '1', png], check=True)
        return Image.open(png).convert('L')

def opening(m):   # 2x2 morphological opening: drops stray single pixels so every shape reads clean
    er = m[:-1, :-1] & m[1:, :-1] & m[:-1, 1:] & m[1:, 1:]
    op = np.zeros_like(m); op[:-1, :-1] |= er; op[1:, :-1] |= er; op[:-1, 1:] |= er; op[1:, 1:] |= er
    return op

def icon(g=80):
    """A crucible on an 80x80 grid as a 1-bit mask (True = the colour)."""
    im = Image.new('1', (g, g), 0); d = ImageDraw.Draw(im)
    # the vessel: a tapering bowl with rounded bottom corners, walls 3 px, a wider lip
    outer = [(17, 33), (62, 33), (55, 61), (52, 64), (27, 64), (24, 61)]
    inner = [(21, 36), (58, 36), (52, 59), (50, 61), (29, 61), (27, 59)]
    d.polygon(outer, fill=1); d.polygon(inner, fill=0)
    d.rectangle([14, 30, 65, 33], fill=1)                       # the lip
    d.rectangle([14, 34, 16, 35], fill=1); d.rectangle([63, 34, 65, 35], fill=1)   # lip ends turn down
    # molten metal to just under the brim; its surface swells by a pixel here and there (continuous, no dashes)
    d.polygon([(23, 39), (56, 39), (51, 57), (49, 59), (30, 59), (28, 57)], fill=1)
    for x0, x1 in [(26, 31), (37, 43), (48, 53)]: d.line([(x0, 38), (x1, 38)], fill=1)
    d.rectangle([20, 64, 59, 65], fill=1)                       # the grate the crucible sits on
    d.polygon([(9, 28), (14, 30), (14, 33)], fill=1)               # the pouring spout on the lip
    m = np.asarray(im, bool).copy()
    # the fire: five flame tongues on a low bed across the grate; each narrows to a point along curved sides and leans
    # as it rises (like flames licking upward), with deep gaps between them
    for x in range(21, 59):
        for y in range(76, 80): m[y, x] = True                  # the bed of embers
    for tx, th, lean, w in [(24, 7, -2, 3.5), (32, 9, 2, 4.0), (40, 10, -2, 4.5), (48, 9, 2, 4.0), (56, 7, 2, 3.5)]:   # tips stay 2 px under the grate
        for k in range(th):                                     # k: height above the bed
            f = k / th; hw = w * (1 - f) ** 1.25; c = tx + lean * f ** 2
            for x in range(int(np.floor(c - hw + 0.5)), int(np.floor(c + hw + 0.5)) + 1):
                if 0 <= x < 80: m[77 - k, x] = True
        if th >= 9:                                             # a hollow inner tongue in the tall flames
            for k in range(1, th // 2 + 1): m[77 - k, int(round(tx + lean * (k / th) ** 2))] = False
    im = Image.fromarray(m.astype(np.uint8) * 255).convert('1')
    m = opening(np.asarray(im, bool))
    # sparks rising from the metal in groups of 3, 3 and 2 (the ostinato's 3+3+2), small plus shapes
    for x, y in [(24, 22), (29, 17), (34, 21), (42, 14), (47, 19), (52, 15), (58, 21), (61, 13)]:
        for dx, dy in [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)]: m[y + dy, x + dx] = True
    return m

def main(events, drums, audio, out):
    bg = np.asarray(arrangement(events, drums, audio, t=40.0).resize((W, H)), np.float32) / 255
    lum = (bg > 0.18).astype(np.float32) * 0.2 + (bg > 0.5).astype(np.float32) * 0.1   # flat: two dim levels of the one colour
    arr = lum[..., None] * COL
    ic = icon(); s = 7; big = np.kron(ic, np.ones((s, s), bool))
    ox, oy = (W - big.shape[1]) // 2, (H - big.shape[0]) // 2
    halo = np.zeros_like(ic)                                    # a 1-cell black outline around the icon (no box, no glow)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1): halo |= np.roll(np.roll(ic, dy, 0), dx, 1)
    hb = np.kron(halo, np.ones((s, s), bool)); arr[oy:oy + hb.shape[0], ox:ox + hb.shape[1]][hb] = 0
    reg = arr[oy:oy + big.shape[0], ox:ox + big.shape[1]]; reg[big] = COL
    arr[::3] *= 0.85                                            # faint, even scanlines
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(out); print('wrote', out)

if __name__ == '__main__':
    main(*sys.argv[1:5])
