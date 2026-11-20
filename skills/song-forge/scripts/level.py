"""Slow automatic leveler: keeps a mix at one steady loudness, with long, smooth gain changes.

usage: python3 level.py in.wav out.wav --hold-from SEC --hold-until SEC [--dip FROM:UNTIL:DB ...] [--free FROM:UNTIL ...]
Loudness is measured in 0.4 s windows (high-passed at 100 Hz, roughly how ears weight it), smoothed over ~4 s,
and compared with the song's median. The correction (at most +-5 dB) is smoothed again over ~6 s, so the gain only
ever drifts slowly. Before --hold-from (the intro swell) and after --hold-until (the final ring-out) the gain eases
to 0 dB, so those keep their shape. A --dip keeps a section that much below the rest (a quiet section stays
quiet), reached through the same slow glide.
"""
import sys, argparse
import numpy as np
from scipy import signal
from scipy.io import wavfile

def smooth(v, n):
    k = np.hanning(max(3, n)); k /= k.sum()
    p = np.pad(v, (len(k) // 2, len(k) - len(k) // 2 - 1), mode='edge'); return np.convolve(p, k, 'valid')

def main(inp, out, hold_from, hold_until, dips=(), free=()):
    fs, x = wavfile.read(inp); x = x.astype(np.float64); x /= 32768.0 if np.abs(x).max() > 2 else 1.0
    mono = x.mean(axis=1) if x.ndim > 1 else x
    y = signal.sosfilt(signal.butter(2, 100, 'highpass', fs=fs, output='sos'), mono)
    hop = int(0.1 * fs); win = int(0.4 * fs)
    L = np.array([10 * np.log10(np.mean(y[i:i + win] ** 2) + 1e-12) for i in range(0, len(y) - win, hop)])
    t = np.arange(len(L)) * 0.1 + 0.2
    Ls = smooth(L, 40)                                         # ~4 s loudness
    body = (t > hold_from) & (t < hold_until)
    target = np.median(Ls[body])
    goal = np.full_like(Ls, target)
    for a, b, d in dips:   # the dip is reached by a ~2-bar ease down before it, and left by a ~2-bar swell back up
        pre = 2.7
        goal += d * np.clip(np.minimum((t - (a - pre)) / pre, (b - t) / pre), 0, 1)
    g = np.clip(goal - Ls, -5, 5)
    w = np.clip(np.minimum((t - (hold_from - 4)) / 4, (hold_until + 2 - t) / 2), 0, 1)   # ease in after the intro, out before the end
    for a, b in free: w *= 1 - np.clip(np.minimum((t - (a - 3)) / 3, (b + 3 - t) / 3), 0, 1)   # hands off: the mix shapes these itself
    g = smooth(g * w, 60)                                       # ~6 s: changes only ever drift
    gain = 10 ** (np.interp(np.arange(len(mono)) / fs, t, g) / 20)
    out_x = x * (gain[:, None] if x.ndim > 1 else gain)
    wavfile.write(out, fs, (np.clip(out_x, -1, 1) * 32767).astype(np.int16))
    print(f'levelled: correction range {g.min():+.1f} .. {g.max():+.1f} dB')

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('inp'); ap.add_argument('out')
    ap.add_argument('--dip', action='append', default=[]); ap.add_argument('--free', action='append', default=[])
    ap.add_argument('--hold-from', type=float, default=0); ap.add_argument('--hold-until', type=float, default=1e9)
    a = ap.parse_args(); main(a.inp, a.out, a.hold_from, a.hold_until, [tuple(map(float, d.split(':'))) for d in a.dip], [tuple(map(float, d.split(':'))) for d in a.free])
