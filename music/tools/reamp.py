"""Re-amp a clean guitar DI through real Guitarix amp-sim plugins plus a 4x12 cabinet curve.

usage: python3 reamp.py in.wav out.wav [rhythm|lead]
Chain: tighten (high-pass) -> GxJCM800 preamp -> GxBossDS1 -> 4x12 cabinet EQ.
"""
import sys, subprocess, tempfile, os
import numpy as np
from scipy.io import wavfile
from scipy import signal

GX = 'http://guitarix.sourceforge.net/plugins/'
def lv2(src, dst, plugin, params):
    cmd = ['lv2file', '-i', src, '-o', dst, '--ignore-clipping'] + sum([['-p', f'{k}:{v}'] for k, v in params.items()], []) + [GX + plugin]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def biquad_peak(f0, gain_db, q, fs):
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f0 / fs; al = np.sin(w) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w), 1 - al * A]; a = [1 + al / A, -2 * np.cos(w), 1 - al / A]
    return np.array(b) / a[0], np.array(a) / a[0]

def cabinet(x, fs):
    """Approximate a closed-back 4x12 with V30-style speakers: low cut, low thump, mid scoop, presence peak, steep top roll-off."""
    sos = signal.butter(2, 75, 'highpass', fs=fs, output='sos'); x = signal.sosfilt(sos, x)
    for f0, g, q in [(110, 3.5, 1.0), (420, -3.0, 1.0), (1250, 1.5, 1.2), (2600, 4.0, 1.4), (4200, -2.0, 2.0)]:
        b, a = biquad_peak(f0, g, q, fs); x = signal.lfilter(b, a, x)
    sos = signal.butter(4, 5200, 'lowpass', fs=fs, output='sos'); x = signal.sosfilt(sos, x)
    sos = signal.butter(2, 8000, 'lowpass', fs=fs, output='sos'); x = signal.sosfilt(sos, x)
    return x

def main(inp, out, mode='rhythm'):
    fs, x = wavfile.read(inp)
    x = x.astype(np.float32) / (32768.0 if x.dtype == np.int16 else 1.0)
    if x.ndim > 1: x = x.mean(axis=1)
    # tighten the low end before distortion (keeps palm mutes from going flubby)
    x = signal.sosfilt(signal.butter(2, 110 if mode == 'rhythm' else 140, 'highpass', fs=fs, output='sos'), x)
    pad = int(0.6 * fs)  # the plugins click as they start up: let that happen in silence, then trim it away
    x = np.concatenate([np.zeros(pad), x / (np.max(np.abs(x)) + 1e-9) * 0.5])
    with tempfile.TemporaryDirectory() as d:
        a, c, e = [os.path.join(d, n) for n in ('a.wav', 'c.wav', 'e.wav')]
        wavfile.write(a, fs, (x * 32767).astype(np.int16))  # the JCM800 plugin needs 16-bit input
        lv2(a, c, 'gx_jcm800pre_#_jcm800pre_', {'P6v': 0.9 if mode == 'rhythm' else 1.0, 'Bass': 0.55, 'Middle': 0.45 if mode == 'rhythm' else 0.62,
                                                'Treble': 0.6, 'WET_DRY': 100, 'GAIN': -16})
        lv2(c, e, 'gx_bossds1_#_bossds1_', {'DRIVE': 0.45 if mode == 'rhythm' else 0.62, 'TONE': 0.4, 'LEVEL': -8, 'BYPASS': 1})  # BYPASS 1 = pedal on
        fs2, y = wavfile.read(e)
    y = y.astype(np.float32)
    if y.ndim > 1: y = y.mean(axis=1)
    if np.max(np.abs(y)) > 2: y /= 32768.0
    y = cabinet(y, fs2)[pad:]
    y = y / (np.max(np.abs(y)) + 1e-9) * 0.9
    wavfile.write(out, fs2, y.astype(np.float32))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else 'rhythm')
