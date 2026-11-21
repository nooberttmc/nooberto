"""Thumbnail for "crucible." (sunkensol): single colour, no gradients, pixel art - a campfire.

usage: python3 thumbnail.py events.json drums.json song.mp3 out.png
Background: the song's own arrangement view, recoloured in the one colour at low brightness (flat, no vignette).
Centre: a pixel-art campfire (a big flame with side tongues and a hollow inner flame, on crossed logs), sparks
rising in groups of 3+3+2 (the song's ostinato rhythm). One colour on black: details are cut-outs (negative space), never shading.
"""
import sys, os, subprocess, tempfile
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'skills', 'song-forge', 'scripts'))
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

def flame(m, cx, base, h, w, lean, value=True, wave=0.0):
    """A flame tongue: rounded at the bottom, widest low down, narrowing to a point along curved sides, leaning as it
    rises. Written into the mask m (value False carves it out)."""
    for k in range(h):
        f = k / h
        hw = w * (1 - f) ** 1.15 * min(1.0, ((k + 2) / 7) ** 0.5)   # round bottom, curved taper to the tip
        c = cx + lean * f ** 2 + wave * np.sin(np.pi * f) * (1 if lean >= 0 else -1)   # an S-curve as it rises
        for x in range(int(np.floor(c - hw + 0.5)), int(np.floor(c + hw + 0.5)) + 1):
            if 0 <= x < m.shape[1] and 0 <= base - k < m.shape[0]: m[base - k, x] = value

def icon(g=80):
    """A campfire on an 80x80 grid as a 1-bit mask (True = the colour)."""
    m = np.zeros((g, g), bool)
    flame(m, 40, 66, 48, 14, 6, wave=-2.5)                       # the main flame, flickering in an S
    flame(m, 28, 66, 26, 8, -9)                                  # side tongues leaning out
    flame(m, 53, 66, 30, 8, 10)
    flame(m, 39, 63, 28, 7, 2, False, wave=-1.5)                 # a hollow inner flame (negative space)
    flame(m, 39, 62, 14, 4, 1)                                   # its core
    flame(m, 35, 23, 7, 2.2, -2)                                 # wisps breaking off above
    flame(m, 52, 30, 6, 2.0, 2)
    # two crossed logs under it, a 1 px gap from the fire, cut-out rings on their ends
    im = Image.fromarray(m.astype(np.uint8) * 255).convert('1'); d = ImageDraw.Draw(im)
    d.rectangle([18, 67, 61, 67], fill=0)
    for (x0, y0, x1, y1) in [(18, 68, 62, 77), (18, 77, 62, 68)]:
        L = np.hypot(x1 - x0, y1 - y0); nx, ny = -(y1 - y0) / L * 1.6, (x1 - x0) / L * 1.6
        d.polygon([(x0 + nx, y0 + ny), (x1 + nx, y1 + ny), (x1 - nx, y1 - ny), (x0 - nx, y0 - ny)], fill=1)
    m = opening(np.asarray(im, bool))

    # sparks rising off the top in groups of 3, 3 and 2 (the ostinato's 3+3+2), small plus shapes
    for x, y in [(20, 26), (25, 18), (29, 29), (45, 8), (60, 14), (65, 22), (70, 31), (73, 20)]:
        for dx, dy in [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)]: m[y + dy, x + dx] = True
    return m

def main(events, drums, audio, out):
    bg = np.asarray(arrangement(events, drums, audio, t=40.0).resize((W, H)), np.float32) / 255
    lum = (bg > 0.18).astype(np.float32) * 0.2 + (bg > 0.5).astype(np.float32) * 0.1   # flat: two dim levels of the one colour
    arr = lum[..., None] * COL
    ic = icon(); s = 7; big = np.kron(ic, np.ones((s, s), bool))
    ox, oy = (W - big.shape[1]) // 2, (H - big.shape[0]) // 2
    reg = arr[oy:oy + big.shape[0], ox:ox + big.shape[1]]; reg[big] = COL
    arr[::3] *= 0.85                                            # faint, even scanlines
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(out); print('wrote', out)

if __name__ == '__main__':
    main(*sys.argv[1:5])
