"""Render a DAW-style scrolling arrangement video of a song, in the colours of the Drowned Sun fight.

usage: python3 visualize.py events.json drums.json song.mp3 out.mp4 [fps] [scale]   (scale 1.5 = 1920x1080)
Tracks are stacked down the screen with their names on the left; every note is a thin bar that scrolls
past the playhead at the left edge; each track's clip strip lights up in the colour of the current phase.
"""
import sys, json, subprocess, bisect
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 720
BPM = 178; BAR = 60 / BPM * 4
PX = 300.0                     # pixels per second of scroll
X0 = 76                        # playhead (left edge of the lanes)
# the Drowned Sun palette (from the fight): ember-black, molten orange, gold, flare red, eclipse violet
BG, PANEL, GRID = (9, 4, 6), (18, 8, 8), (34, 16, 14)
CREAM, GOLD, ORANGE, RED, VIOLET = (255, 240, 192), (255, 208, 96), (255, 176, 64), (255, 80, 48), (192, 96, 255)
SECTIONS = [('intro', 8), ('a1', 16), ('b1', 16), ('brk', 8), ('a2', 16), ('clx', 16), ('inter', 8), ('a3', 16), ('b3', 12), ('coda', 8), ('outro', 6)]
PHASE = {'intro': ORANGE, 'a1': ORANGE, 'b1': ORANGE, 'brk': RED, 'a2': ORANGE, 'clx': RED, 'inter': VIOLET, 'a3': VIOLET, 'b3': VIOLET, 'coda': GOLD, 'outro': GOLD}
SEC_NAME = {'intro': 'Dawn', 'a1': 'Phase I', 'b1': 'Phase I', 'brk': 'Corona', 'a2': 'Phase II', 'clx': 'Phase II', 'inter': 'Eclipse', 'a3': 'Phase III', 'b3': 'Phase III', 'coda': 'Drowning', 'outro': 'Drowned'}
sec_at = []
t = 0.0
for name, n in SECTIONS: sec_at.append((t, name)); t += n * BAR

def section(t):
    i = bisect.bisect_right([s[0] for s in sec_at], t) - 1
    return sec_at[max(0, i)][1]

def mix(a, b, f): return tuple(int(a[k] + (b[k] - a[k]) * f) for k in range(3))

def main(events, drums, audio, out, fps=60, start=0.0, length=None, scale=1.0):
    # scale: 1.0 = 1280x720; 1.5 = 1920x1080. Every size below is multiplied by K, so the layout is identical.
    K = scale; W_, H_ = int(round(W * K)), int(round(H * K)); X0_ = int(round(X0 * K)); PX_ = PX * K
    u = lambda v: int(round(v * K))
    parts = json.load(open(events))['parts']
    dr = json.load(open(drums))
    # lanes: (label, clip name, note list, height)
    rhythm = parts['rhythmL']['notes']
    lanes = [('Lead Guitar', 'Lead', parts['lead']['notes'], 64), ('Harmony', 'Harmony', parts['harmony']['notes'], 40),
             ('Rhythm Gtrs', 'Rhythm', rhythm, 50), ('Bass', 'Bass', parts['bass']['notes'], 34),
             ('Piano', 'Piano', parts['piano']['notes'], 50), ('Strings', 'Strings', parts['strings']['notes'], 28),
             ('Low Strings', 'Low', parts['low']['notes'], 26), ('Brass', 'Brass', parts['brass']['notes'], 26),
             ('Organ', 'Organ', parts['organ']['notes'], 26), ('Timpani', 'Timpani', parts['timp']['notes'], 24)]
    # drums share one lane: kick on the bottom row, the layered break above it, the main break's slices on top
    drum = [[t, 0, d, 100, 'd'] for t, d, p in dr.get('kick', [])] + [[t, 4, d, 100, 'd'] for t, d, p in dr.get('layer', [])] + \
           [[t, 8 + p, d, 100, 'd'] for t, d, p in dr.get('break', [])]
    lanes.append(('Drums', 'Breaks', drum, 56))
    top = u(38)
    lay = []
    for label, clip, notes, h in lanes:
        notes = sorted(notes, key=lambda n: n[0])
        ps = [n[1] for n in notes] or [60]
        lo, hi = min(ps), max(ps)
        lay.append(dict(label=label, clip=clip, notes=notes, starts=[n[0] for n in notes], y=top, h=h, lo=lo, hi=max(hi, lo + 1),
                        maxd=max([n[2] for n in notes] or [0]), bars=set(b for n in notes for b in range(int(n[0] / BAR), int((n[0] + n[2] - 1e-3) / BAR) + 1))))
        top += h + u(13)
    # stretch the lanes to fill the screen
    k = (H_ - u(44) - u(13) * len(lay)) / sum(L['h'] for L in lay); y = u(38)
    for L in lay: L['h'] = int(L['h'] * k); L['y'] = y; y += L['h'] + u(13)
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audio], capture_output=True, text=True).stdout)
    try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', u(10)); fbig = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', u(11))
    except OSError: font = fbig = ImageFont.load_default()
    # static backdrop: panel, track names, lane shading
    base = Image.new('RGB', (W_, H_), BG); d = ImageDraw.Draw(base)
    d.rectangle([0, 0, X0_ - u(4), H_], fill=PANEL); d.line([X0_ - u(4), 0, X0_ - u(4), H_], fill=(60, 26, 20), width=max(1, u(1)))
    d.text((u(4), u(4)), 'Instruments', font=font, fill=(200, 170, 150))
    for L in lay:
        d.rectangle([X0_, L['y'], W_, L['y'] + L['h'] + u(10)], fill=(14, 6, 8))
        d.text((u(4), L['y'] + u(1)), L['label'], font=font, fill=(214, 186, 160))
        d.ellipse([X0_ - u(16), L['y'] + L['h'] - u(2), X0_ - u(10), L['y'] + L['h'] + u(4)], outline=(120, 70, 50))
        d.line([X0_, L['y'] + L['h'] + u(11), W_, L['y'] + L['h'] + u(11)], fill=(26, 12, 12), width=max(1, u(1)))
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W_}x{H_}', '-r', str(fps), '-i', '-', '-ss', str(start), '-i', audio,
           '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    view = (W_ - X0_) / PX_
    nframes = int(((length or dur - start)) * fps)
    for fi in range(nframes):
        t = start + fi / fps
        img = base.copy(); g = ImageDraw.Draw(img)
        sec = section(t); col = PHASE[sec]
        # smooth colour change into each new section
        st = max(s for s, n in sec_at if s <= t + 1e-9); prev = PHASE[section(st - 0.01)] if st > 0 else col
        col = mix(prev, col, min(1, (t - st) / 1.2))
        # ruler: bar numbers scroll with the music
        b0 = int(t / BAR)
        for b in range(b0, b0 + int(view / BAR) + 2):
            x = X0_ + (b * BAR - t) * PX_
            if x < X0_: continue
            g.line([x, u(22), x, u(32)], fill=(110, 70, 50), width=max(1, u(1))); g.text((x + u(3), u(20)), str(b + 1), font=font, fill=(150, 110, 90))
            g.line([x, u(34), x, H_], fill=GRID, width=max(1, u(1)))
        for L in lay:
            y, h = L['y'], L['h']
            i0 = bisect.bisect_left(L['starts'], t - L['maxd'] - 0.01); i1 = bisect.bisect_right(L['starts'], t + view)
            vis = [n for n in L['notes'][i0:i1] if n[0] + n[2] >= t]
            # clip strips (drawn from the bars, so a strip scrolls off the left edge like the notes do), like pattern blocks, over the bars this track plays in, in the phase colour
            b = int(t / BAR)
            while b * BAR < t + view:
                if b in L['bars']:
                    e = b
                    while e + 1 in L['bars'] and (e + 1) * BAR < t + view: e += 1
                    xa = max(X0_, X0_ + (b * BAR - t) * PX_); xb = min(W_, X0_ + ((e + 1) * BAR - t) * PX_) - 1
                    if xb > xa: g.rectangle([xa, y, xb, y + u(9)], fill=mix(BG, col, 0.62))
                    if xb - xa > u(60): g.text((xa + u(4), y - u(1)), L['clip'] + ' ' + str(b // 8 + 1), font=font, fill=mix(col, CREAM, 0.6))
                    b = e + 1
                else: b += 1
            span = L['hi'] - L['lo']
            for n in vis:
                x1 = X0_ + (n[0] - t) * PX_; x2 = X0_ + (n[0] + n[2] - t) * PX_
                ny = y + u(12) + (h - u(6)) * (1 - (n[1] - L['lo']) / span) if span > 1 else y + u(12) + h / 2 - u(4)
                playing = n[0] <= t < n[0] + n[2]
                c = CREAM if playing else mix(col, CREAM, 0.55)
                xa = max(X0_, x1); g.rectangle([xa, ny, max(xa + 1, x2 - 1), ny + u(2)], fill=c)
                if playing: g.rectangle([X0_, ny - u(1), X0_ + u(3), ny + u(3)], fill=GOLD)
        # playhead glow
        g.line([X0_, u(34), X0_, H_], fill=GOLD, width=u(2))
        enc.stdin.write(img.tobytes())
        if fi % (fps * 20) == 0: print(f'{t:.0f}s / {dur:.0f}s', flush=True)
    enc.stdin.close(); enc.wait()
    print('wrote', out)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], int(sys.argv[5]) if len(sys.argv) > 5 else 60,
         scale=float(sys.argv[6]) if len(sys.argv) > 6 else 1.0)
