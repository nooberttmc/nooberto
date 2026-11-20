"""Render a DAW-style scrolling arrangement video of a song (like a playlist view in FL Studio).

usage: python3 visualize.py events.json drums.json|- song.mp3 out.mp4 [fps] [scale] [--theme theme.json]
  scale 1.5 = 1920x1080 (everything is redrawn larger, not upscaled).
Tracks are stacked down the screen with their names on the left; every note is a thin bar that scrolls past the
playhead at the left edge and lights up as it sounds; each track's clip strips cover the bars it plays in, in the
colour of the current section.
events.json is the song's guitarEvents() export. Read from it: "bpm", "sections" ([[name, bars], ...]),
optional "colors" ({section: "#rrggbb"}), optional "bar_times" (start time of every bar) and "bar_tempi" ([start, end] BPM per bar) for
songs with tempo changes: the video scrolls by musical position like a DAW, so the whole view visibly slows down in a
brake and rushes in a speed-up, and (with --tempo-lane) a Tempo lane shows the BPM curve and the current value; and per part optional "label" (lane name) and "lane" (parts with the same
lane share one, e.g. two rhythm guitar takes). drums.json (from renderSong's DLOG) adds a Drums lane; pass - to skip.
theme.json may set bg, panel, grid, cream, gold (hex) and palette (list of hex, cycled per section).
"""
import sys, json, subprocess, bisect, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 720
PX = 300.0                     # pixels per second of scroll
X0 = 76                        # playhead (left edge of the lanes)
hx = lambda h: tuple(int(h.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4))
# default theme: ember-black with molten orange, gold, flare red and eclipse violet
THEME = {'bg': '#090406', 'panel': '#120808', 'grid': '#22100e', 'cream': '#fff0c0', 'gold': '#ffd060',
         'palette': ['#ffb040', '#ff5030', '#c060ff', '#ffd060']}
BG = PANEL = GRID = CREAM = GOLD = None
BPM, BAR, SECTIONS, PHASE, sec_at, BT = 120, 2.0, [('song', 9999)], {}, [(0.0, 'song')], None

def bar_start(b):   # start time of bar b: from the song's tempo map (bar_times) if it has one, else a constant tempo
    if BT is None: return b * BAR
    return BT[b] if 0 <= b < len(BT) else BT[-1] + (b - len(BT) + 1) * BAR if b >= len(BT) else b * BAR

TEMPI = None   # per bar [start BPM, end BPM] (events.json "bar_tempi"), for exact positions inside ramping bars

def frac_in_bar(b, dt):
    """Fraction (0..1) of bar b reached dt seconds after its start; exact for a linear tempo ramp."""
    d = BT[b + 1] - BT[b]
    if TEMPI and b < len(TEMPI):
        a, c = TEMPI[b]
        if abs(c - a) > 1e-6: return max(0.0, min(1.0, a * (math.exp(dt * (c - a) / 240) - 1) / (c - a)))
    return max(0.0, min(1.0, dt / d))

def pos(t):
    """Musical position in bars (what the video scrolls by: a bar is always the same width, so tempo changes show)."""
    if BT is None: return t / BAR
    if t >= BT[-1]: return len(BT) - 1 + (t - BT[-1]) / BAR
    if t <= BT[0]: return t / BAR
    b = bisect.bisect_right(BT, t) - 1; return b + frac_in_bar(b, t - BT[b])

def time_of(p):
    """Inverse of pos (bisection; only used to pick which notes are on screen)."""
    lo, hi = -10.0, (BT[-1] if BT else p * BAR) + 60
    for _ in range(40):
        m = (lo + hi) / 2
        if pos(m) < p: lo = m
        else: hi = m
    return hi

def bpm_at(p):
    if BT is None: return BPM
    b = int(p)
    if b >= len(BT) - 1: return TEMPI[-1][1] if TEMPI else BPM
    if TEMPI and b < len(TEMPI): a, c = TEMPI[b]; return a + (c - a) * (p - b)
    return 240 / (BT[b + 1] - BT[b])

def bar_of(t):
    if BT is None: return int(t // BAR)
    return max(0, bisect.bisect_right(BT, t) - 1) if t < BT[-1] else len(BT) - 1 + int((t - BT[-1]) // BAR)
NICE = {'brassL': 'Brass', 'brassR': 'Brass', 'bells': 'Bells', 'arp': 'Synth Arp', 'lead': 'Lead Guitar', 'harmony': 'Harmony', 'rhythmL': 'Rhythm Gtrs', 'rhythmR': 'Rhythm Gtrs', 'bass': 'Bass', 'piano': 'Piano',
        'strings': 'Strings', 'choir': 'Choir', 'low': 'Low Strings', 'brass': 'Brass', 'organ': 'Organ', 'timp': 'Timpani', 'synth': 'Synth', 'pad': 'Pad'}

def configure(ev, theme=None):
    global BG, PANEL, GRID, CREAM, GOLD, BPM, BAR, SECTIONS, PHASE, sec_at, BT, TEMPI
    th = dict(THEME, **(theme or {}))
    BG, PANEL, GRID, CREAM, GOLD = (hx(th[k]) for k in ('bg', 'panel', 'grid', 'cream', 'gold'))
    BPM = ev.get('bpm', 120); BAR = 60 / BPM * 4; BT = ev.get('bar_times'); TEMPI = ev.get('bar_tempi')   # tempo map: bar start times (+ start/end BPM per bar)
    SECTIONS = [tuple(x) for x in ev.get('sections', [['song', 9999]])]
    pal = [hx(c) for c in th['palette']]; order = []
    for n, _ in SECTIONS:
        if n not in order: order.append(n)
    cols = ev.get('colors', {})
    PHASE = {n: hx(cols[n]) if n in cols else pal[i % len(pal)] for i, n in enumerate(order)}
    sec_at = []; t = 0.0
    g0 = 0
    for name, n in SECTIONS: sec_at.append((bar_start(g0), name)); g0 += n

def section(t):
    i = bisect.bisect_right([s[0] for s in sec_at], t) - 1
    return sec_at[max(0, i)][1]

def mix(a, b, f): return tuple(int(a[k] + (b[k] - a[k]) * f) for k in range(3))

def main(events, drums, audio, out, fps=60, start=0.0, length=None, scale=1.0, theme=None, tempo_lane=False):
    # scale: 1.0 = 1280x720; 1.5 = 1920x1080. Every size below is multiplied by K, so the layout is identical.
    K = scale; W_, H_ = int(round(W * K)), int(round(H * K)); X0_ = int(round(X0 * K)); PX_ = PX * K
    u = lambda v: int(round(v * K))
    ev = json.load(open(events)); configure(ev, theme); parts = ev['parts']
    dr = json.load(open(drums)) if drums and drums != '-' else {}
    # lanes: one per part (or per shared "lane"), in the song's order
    groups = {}
    for k, p in parts.items():
        if not p.get('notes'): continue
        lane = p.get('lane') or NICE.get(k) or k
        if lane in groups and not p.get('lane'): continue   # a second take of a part already shown (e.g. rhythmR after rhythmL)
        groups.setdefault(lane, {'label': p.get('label') or lane, 'notes': []})['notes'] += p['notes']
    lanes = []
    for lane, g0 in groups.items():
        ps = set(int(n[1]) for n in g0['notes'])
        lanes.append((g0['label'], g0['label'].split()[0], g0['notes'], 50 if len(ps) > 14 else 36 if len(ps) > 5 else 26))
    # drums share one lane: kick on the bottom row, the layered break above it, the main break's slices on top
    if dr:
        drum = [[t, 0, d, 100, 'd'] for t, d, p in dr.get('kick', [])] + [[t, 4, d, 100, 'd'] for t, d, p in dr.get('layer', [])] + \
               [[t, 8 + p, d, 100, 'd'] for t, d, p in dr.get('break', [])]
        lanes.append(('Drums', 'Breaks', drum, 56))
    if BT and tempo_lane: lanes.append(('Tempo', 'Tempo', [], 30))   # the tempo curve (opt-in: --tempo-lane)
    top = u(38)
    lay = []
    for label, clip, notes, h in lanes:
        notes = sorted(notes, key=lambda n: n[0])
        ps = [n[1] for n in notes] or [60]
        lo, hi = min(ps), max(ps)
        lay.append(dict(label=label, clip=clip, notes=notes, starts=[n[0] for n in notes], y=top, h=h, lo=lo, hi=max(hi, lo + 1),
                        maxd=max([n[2] for n in notes] or [0]), bars=set(b for n in notes for b in range(bar_of(n[0]), bar_of(n[0] + n[2] - 1e-3) + 1))))
        top += h + u(13)
    # stretch the lanes to fill the screen
    k = (H_ - u(44) - u(13) * len(lay)) / sum(L['h'] for L in lay); y = u(38)
    for L in lay: L['h'] = int(L['h'] * k); L['y'] = y; y += L['h'] + u(13)
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audio], capture_output=True, text=True).stdout)
    # the video runs until the last note has passed the playhead (no notes left on screen), even past the audio (padded)
    last_note = max((n[0] + n[2] for L in lay for n in L['notes']), default=0)
    dur = max(dur, last_note + 0.4)
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
           '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-af', 'apad', '-c:a', 'aac', '-b:a', '192k', '-t', f'{(length or dur - start):.3f}', '-movflags', '+faststart', out]
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    PXB = PX_ * BAR                     # pixels per bar (at the nominal tempo, the same scroll speed as before)
    viewB = (W_ - X0_) / PXB
    nframes = int(((length or dur - start)) * fps)
    for fi in range(nframes):
        t = start + fi / fps
        img = base.copy(); g = ImageDraw.Draw(img)
        sec = section(t); col = PHASE[sec]
        # smooth colour change into each new section
        st = max(s for s, n in sec_at if s <= t + 1e-9); prev = PHASE[section(st - 0.01)] if st > 0 else col
        col = mix(prev, col, min(1, (t - st) / 1.2))
        # ruler: bar numbers scroll with the music
        p0 = pos(t); tv = time_of(p0 + viewB)   # musical position now, and the time at the right edge
        X = lambda tt: X0_ + (pos(tt) - p0) * PXB
        for b in range(max(0, int(p0)), int(p0 + viewB) + 2):
            x = X0_ + (b - p0) * PXB
            if x < X0_ or x > W_: continue
            b1 = b + 1   # 1-based bar number
            g.line([x, u(22), x, u(32)], fill=(110, 70, 50), width=max(1, u(1))); g.text((x + u(3), u(20)), str(b1), font=font, fill=(150, 110, 90))
            g.line([x, u(34), x, H_], fill=GRID, width=max(1, u(1)))
        for L in lay:
            y, h = L['y'], L['h']
            if L['label'] == 'Tempo':   # the tempo lane: BPM curve across the view, with the current value
                g.rectangle([X0_, y, W_, y + u(9)], fill=mix(BG, col, 0.62)); g.text((X0_ + u(4), y - u(1)), 'Tempo', font=font, fill=mix(col, CREAM, 0.6))
                pts = [(x, y + u(12) + (h - u(6)) * (1 - (min(220, max(60, bpm_at(p0 + (x - X0_) / PXB))) - 60) / 160)) for x in range(X0_, W_, u(3))]
                g.line(pts, fill=mix(col, CREAM, 0.4), width=max(2, u(2)))
                bn = bpm_at(p0); g.text((X0_ + u(8), y + u(12)), f'{bn:.0f} BPM', font=fbig, fill=CREAM if abs(bn - BPM) > 1 else mix(col, CREAM, 0.5))
                continue
            i0 = bisect.bisect_left(L['starts'], t - L['maxd'] - 0.01); i1 = bisect.bisect_right(L['starts'], tv)
            vis = [n for n in L['notes'][i0:i1] if n[0] + n[2] >= t]
            # clip strips (drawn from the bars, so a strip scrolls off the left edge like the notes do), like pattern blocks, over the bars this track plays in, in the phase colour
            b = int(p0)
            while b < p0 + viewB:
                if b in L['bars']:
                    e = b
                    while e + 1 in L['bars'] and e + 1 < p0 + viewB: e += 1
                    xa = max(X0_, X0_ + (b - p0) * PXB); xb = min(W_, X0_ + (e + 1 - p0) * PXB) - 1
                    if xb > xa: g.rectangle([xa, y, xb, y + u(9)], fill=mix(BG, col, 0.62))
                    if xb - xa > u(60): g.text((xa + u(4), y - u(1)), L['clip'] + ' ' + str(b // 8 + 1), font=font, fill=mix(col, CREAM, 0.6))
                    b = e + 1
                else: b += 1
            span = L['hi'] - L['lo']
            for n in vis:
                x1 = X(n[0]); x2 = X(n[0] + n[2])
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
    a = sys.argv[1:]; theme = None; tl = '--tempo-lane' in a
    if tl: a.remove('--tempo-lane')
    if '--theme' in a: i = a.index('--theme'); theme = json.load(open(a[i + 1])); del a[i:i + 2]
    main(a[0], a[1], a[2], a[3], int(a[4]) if len(a) > 4 else 60, scale=float(a[5]) if len(a) > 5 else 1.0, theme=theme, tempo_lane=tl)
