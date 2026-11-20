"""Measure a mix (optionally against a reference track): the numbers that steered every mix decision.

usage: python3 analyze.py SONG [--ref REFERENCE] [--bpm 178 --sections intro:8,a1:16,...] [--curve]
Prints: length, tempo, key, integrated loudness (LUFS), loudness range (LRA), true peak; tonal balance (share of
energy per band); stereo width (L/R correlation per band and overall); the centre channel's tone (mid minus side,
i.e. what sits in the middle: lead, vocals, kick/snare); sudden level jumps (> 2 dB / > 3 dB within 0.4 s) and the
10-90% level spread; and, with --sections, the RMS level of each section. --curve prints the level every second.
With --ref, the reference is measured the same way and shown alongside, with differences.
"""
import sys, re, argparse, subprocess
import numpy as np
from scipy import signal

BANDS = [(20, 120), (120, 400), (400, 1500), (1500, 5000), (5000, 10000)]

def load(p, sr=22050):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', p, '-ac', '2', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2), sr

def ebur(p):
    o = subprocess.run(['ffmpeg', '-nostats', '-i', p, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    g = lambda k: (re.findall(k + r':\s+(-?[\d.]+|-inf)', o) or ['nan'])[-1]
    return float(g('I')), float(g('LRA')), float(g('Peak'))

def tempo(m, sr):
    hop = 256; env = np.abs(signal.stft(m, sr, nperseg=1024, noverlap=1024 - hop)[2]); flux = np.maximum(0, np.diff(env, axis=1)).sum(0)
    flux -= flux.mean(); ac = np.correlate(flux, flux, 'full')[len(flux) - 1:]; fps = sr / hop
    lags = np.arange(len(ac)) / fps; ok = (lags > 60 / 200) & (lags < 60 / 70)
    return 60 / lags[ok][np.argmax(ac[ok])]

def key(m, sr):
    f, t, Z = signal.stft(m, sr, nperseg=8192); P = np.abs(Z).mean(1); chroma = np.zeros(12)
    for fi, p in zip(f, P):
        if 60 < fi < 2000: chroma[int(round(12 * np.log2(fi / 440))) % 12] += p
    names = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#']
    maj = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]); mi = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    sc = [(np.corrcoef(np.roll(maj, k), chroma)[0, 1], names[k] + ' major') for k in range(12)] + [(np.corrcoef(np.roll(mi, k), chroma)[0, 1], names[k] + ' minor') for k in range(12)]
    return max(sc)[1] + ' (relative keys can be confused)'

def measure(p, args):
    x, sr = load(p); L, R = x[:, 0], x[:, 1]; M = (L + R) / 2; S = (L - R) / 2
    r = {'len': len(M) / sr, 'tempo': tempo(M[:sr * 60], sr), 'key': key(M, sr)}
    r['lufs'], r['lra'], r['tp'] = ebur(p)
    r['corr'] = np.corrcoef(L, R)[0, 1]
    f, Pm = signal.welch(M, sr, nperseg=4096); _, Ps = signal.welch(S, sr, nperseg=4096); C = np.maximum(Pm - Ps, 1e-20)
    tot = Pm[(f >= 20) & (f < 10000)].sum(); ctot = C[(f >= 250) & (f < 8000)].sum()
    r['bands'] = []
    for lo, hi in BANDS:
        sos = signal.butter(4, [lo, min(hi, sr / 2 - 100)], 'bandpass', fs=sr, output='sos')
        l, rr = signal.sosfilt(sos, L), signal.sosfilt(sos, R); sel = (f >= lo) & (f < hi)
        r['bands'].append((f'{lo}-{hi} Hz', 10 * np.log10(Pm[sel].sum() / tot), np.corrcoef(l, rr)[0, 1]))
    r['centre'] = [(f'{lo}-{hi}', 10 * np.log10(C[(f >= lo) & (f < hi)].sum() / ctot)) for lo, hi in [(250, 500), (500, 1000), (1000, 2000), (2000, 4000), (4000, 8000)]]
    y = signal.sosfilt(signal.butter(2, 100, 'highpass', fs=sr, output='sos'), M)
    w, h = int(0.4 * sr), int(0.1 * sr)
    Lm = np.array([10 * np.log10(np.mean(y[i:i + w] ** 2) + 1e-12) for i in range(0, len(y) - w, h)])
    body = Lm[min(len(Lm) - 1, 100):max(101, len(Lm) - 60)]
    d = np.abs(body[4:] - body[:-4]) if len(body) > 5 else np.zeros(1)
    r['jumps2'], r['jumps3'], r['jmax'] = int((d > 2).sum()), int((d > 3).sum()), float(d.max())
    r['spread'] = float(np.percentile(body, 90) - np.percentile(body, 10))
    if args.sections and args.bpm:
        bar = 60 / args.bpm * 4; t = 0; r['sections'] = []
        for part in args.sections.split(','):
            n, l = part.split(':'); a, b = int(t * bar * sr), int((t + float(l)) * bar * sr); t += float(l)
            seg = M[a:b]; r['sections'].append((n, 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9) if len(seg) else float('nan')))
    if args.curve: r['curve'] = [20 * np.log10(np.sqrt(np.mean(M[i * sr:(i + 1) * sr] ** 2)) + 1e-9) for i in range(int(len(M) / sr))]
    return r

def show(name, r, ref=None):
    dv = lambda k, fmt='{:.1f}': ('  (ref ' + fmt.format(ref[k]) + ')') if ref else ''
    print(f'== {name}: {r["len"]:.0f} s, ~{r["tempo"]:.0f} BPM (or double: beat trackers often find half time), key ~{r["key"]}')
    print(f'   loudness {r["lufs"]:.1f} LUFS{dv("lufs")}   range {r["lra"]:.1f} LU{dv("lra")}   true peak {r["tp"]:.1f} dBTP{dv("tp")}')
    print(f'   stereo: L/R correlation {r["corr"] * 100:.0f}%' + (f'  (ref {ref["corr"] * 100:.0f}%)' if ref else '') + '   (100% = mono)')
    print('   band            energy share      L/R corr')
    for i, (b, e, c) in enumerate(r['bands']):
        print(f'   {b:14s} {e:6.1f} dB' + (f' (ref {ref["bands"][i][1]:6.1f})' if ref else '') + f'   {c * 100:4.0f}%' + (f' (ref {ref["bands"][i][2] * 100:3.0f}%)' if ref else ''))
    print('   centre channel tone (lead/vocal region): ' + '  '.join(f'{b}: {v:.1f}' + (f' ({ref["centre"][i][1]:.1f})' if ref else '') for i, (b, v) in enumerate(r['centre'])))
    print(f'   level jumps within 0.4 s: {r["jumps2"]} over 2 dB, {r["jumps3"]} over 3 dB (largest {r["jmax"]:.1f} dB); 10-90% spread {r["spread"]:.1f} dB')
    if 'sections' in r: print('   sections (RMS dB): ' + ' | '.join(f'{n} {v:.1f}' for n, v in r['sections']))
    if 'curve' in r: print('   level per second: ' + ' '.join(f'{v:.0f}' for v in r['curve']))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('song'); ap.add_argument('--ref'); ap.add_argument('--bpm', type=float)
    ap.add_argument('--sections'); ap.add_argument('--curve', action='store_true')
    a = ap.parse_args()
    ref = measure(a.ref, argparse.Namespace(sections=None, bpm=None, curve=False)) if a.ref else None
    if ref: show('reference ' + a.ref.split('/')[-1], ref)
    show(a.song.split('/')[-1], measure(a.song, a), ref)
