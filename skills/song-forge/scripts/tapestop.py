"""Tape-stop pitch dives on a finished mix (the whole mix slows and drops in pitch, then snaps back).

usage: python3 tapestop.py in.wav out.wav T0:T1 [T0:T1 ...]
Over each window the audio is replayed from T0 at a speed that decays from 1x to ~0.25x (pitch and speed dive
together, like a turntable or tape stopping), with a short fade at the end; at T1 the original audio cuts back in,
so the song's timeline never drifts. Use it at the end of a bar (e.g. the last half bar before a downbeat).
"""
import sys
import numpy as np
from scipy.io import wavfile

def dive(x, fs, t0, t1, rmin=0.25):
    a, b = int(t0 * fs), int(t1 * fs); n = b - a
    if n <= 16 or b > len(x): return
    tau = np.arange(n) / n
    rate = rmin ** tau                                  # exponential slow-down from 1x to rmin
    pos = a + np.concatenate([[0], np.cumsum(rate[:-1])])   # read position in the source, in samples
    i = np.floor(pos).astype(int); f = (pos - i)[:, None]
    seg = x[i] * (1 - f) + x[np.minimum(i + 1, len(x) - 1)] * f
    fade = np.ones(n); k = int(0.03 * fs); fade[-k:] = np.linspace(1, 0, k)   # a quick fade as it stops
    x[a:b] = seg * fade[:, None]
    k2 = int(0.004 * fs); x[b:b + k2] *= np.linspace(0, 1, k2)[:, None]          # click-free return

def main(inp, out, wins):
    fs, x = wavfile.read(inp); dt = x.dtype; x = x.astype(np.float64)
    if x.ndim == 1: x = x[:, None]
    src = x.copy()
    for w in wins:
        t0, t1 = map(float, w.split(':'))
        y = src.copy(); dive(y, fs, t0, t1); a, b = int(t0 * fs), int(t1 * fs) + int(0.004 * fs); x[a:b] = y[a:b]
    x = np.clip(x, -32768, 32767) if dt == np.int16 else x
    wavfile.write(out, fs, x.astype(dt) if x.shape[1] > 1 else x[:, 0].astype(dt))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3:])
