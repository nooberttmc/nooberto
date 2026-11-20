"""Re-amp a clean guitar DI through real Guitarix amp-sim plugins plus a 4x12 cabinet curve.

usage: python3 reamp.py in.wav out.wav [rhythm|lead|bass]
Chain: tighten (high-pass) -> overdrive boost -> GxJCM800 preamp -> GxBossDS1 -> 4x12 cabinet EQ.
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

def cabinet(x, fs, bright=False):
    """A 4x12 with thick low mids: weight at 100-1200 Hz, the 2-5 kHz fizz pulled back, steep roll-off above 4.5 kHz.
    bright (rhythm guitars): a more open speaker, so the pick attack and edge come through instead of a muffled wall."""
    sos = signal.butter(2, 80, 'highpass', fs=fs, output='sos'); x = signal.sosfilt(sos, x)
    peaks = [(120, 3.0, 0.9), (380, 1.5, 0.8), (750, 3.5, 0.8), (1500, 0.0, 1.2), (2600, -4.0, 1.0), (4000, -3.0, 1.0)] if bright else \
            [(120, 3.0, 0.9), (380, 2.5, 0.8), (750, 5.0, 0.8), (1500, 0.0, 1.2), (2600, -8.0, 0.9), (4000, -9.0, 1.0)]
    for f0, g, q in peaks:
        b, a = biquad_peak(f0, g, q, fs); x = signal.lfilter(b, a, x)
    sos = signal.butter(4, 5200 if bright else 3800, 'lowpass', fs=fs, output='sos'); x = signal.sosfilt(sos, x)
    sos = signal.butter(2, 7500 if bright else 5500, 'lowpass', fs=fs, output='sos'); x = signal.sosfilt(sos, x)
    return x

def compress(x, fs, thresh_db, ratio, attack, release):
    """Feed-forward peak compressor (smoothed envelope) with makeup gain."""
    a, r = np.exp(-1 / (attack * fs)), np.exp(-1 / (release * fs)); env = np.empty_like(x); e = 0.0
    ax = np.abs(x)
    for i in range(len(x)):
        v = ax[i]; e = a * e + (1 - a) * v if v > e else r * e + (1 - r) * v; env[i] = e
    lvl = 20 * np.log10(env + 1e-9); over = np.maximum(0, lvl - thresh_db)
    return x * 10 ** (-over * (1 - 1 / ratio) / 20)

def main(inp, out, mode='rhythm'):
    fs, x = wavfile.read(inp)
    x = x.astype(np.float32) / (32768.0 if x.dtype == np.int16 else 1.0)
    if x.ndim > 1: x = x.mean(axis=1)
    # tighten the low end before distortion (keeps palm mutes from going flubby)
    if mode == 'bass':  # bass guitar: gentle grit, keep the lows, no guitar cabinet
        x = x / (np.max(np.abs(x)) + 1e-9) * 0.8
        lows = signal.sosfilt(signal.butter(4, 110, 'lowpass', fs=fs, output='sos'), x)        # clean sub stays tight
        hi = signal.sosfilt(signal.butter(2, 110, 'highpass', fs=fs, output='sos'), x)
        y = 0.9 * lows + 0.7 * np.tanh(9 * hi)                                                  # heavily driven upper bass
        y = signal.sosfilt(signal.butter(4, 2600, 'lowpass', fs=fs, output='sos'), y)
        y = signal.sosfilt(signal.butter(2, 32, 'highpass', fs=fs, output='sos'), y)
        wavfile.write(out, fs, (y / (np.max(np.abs(y)) + 1e-9) * 0.9).astype(np.float32)); return
    x = signal.sosfilt(signal.butter(2, 90 if mode == 'rhythm' else 100, 'highpass', fs=fs, output='sos'), x)
    pad = int(0.6 * fs)  # the plugins click as they start up: let that happen in silence, then trim it away
    x = x / (np.max(np.abs(x)) + 1e-9)
    # overdrive pedal in front of the amp (tube-screamer style): mid hump, then hard soft-clipping
    mid = signal.sosfilt(signal.butter(1, [500, 1800], 'bandpass', fs=fs, output='sos'), x)
    k = {'rhythm': 3.5, 'lead': 4.0}[mode]   # rhythm: tight; lead: singing but articulate (sustain comes from compression)
    x = np.tanh(k * (x + 1.5 * mid)) / np.tanh(k)
    x = signal.sosfilt(signal.butter(2, 5000, 'lowpass', fs=fs, output='sos'), x)
    x = np.concatenate([np.zeros(pad), x / (np.max(np.abs(x)) + 1e-9) * 0.5])
    with tempfile.TemporaryDirectory() as d:
        a, c, e = [os.path.join(d, n) for n in ('a.wav', 'c.wav', 'e.wav')]
        wavfile.write(a, fs, (x * 32767).astype(np.int16))  # the JCM800 plugin needs 16-bit input
        lv2(a, c, 'gx_jcm800pre_#_jcm800pre_', {'P6v': 1.0, 'Bass': 0.6, 'Middle': {'rhythm': 0.7, 'lead': 0.8}[mode],
                                                'Treble': 0.45 if mode == 'lead' else 0.4, 'WET_DRY': 100, 'GAIN': {'rhythm': -12, 'lead': -9}[mode]})
        lv2(c, e, 'gx_bossds1_#_bossds1_', {'DRIVE': {'rhythm': 0.8, 'lead': 0.7}[mode], 'TONE': 0.25 if mode == 'lead' else 0.15, 'LEVEL': -8, 'BYPASS': 1})  # BYPASS 1 = pedal on; dark tone, less fizz
        fs2, y = wavfile.read(e)
    y = y.astype(np.float32)
    if y.ndim > 1: y = y.mean(axis=1)
    if np.max(np.abs(y)) > 2: y /= 32768.0
    y = cabinet(y, fs2, bright=True)[pad:]
    if mode == 'lead':  # sustain from a compressor, not more distortion: held notes stay up, quick notes keep their pitch
        y = compress(y / (np.max(np.abs(y)) + 1e-9), fs2, thresh_db=-20, ratio=5, attack=0.004, release=0.09)
    y = y / (np.max(np.abs(y)) + 1e-9) * 0.9
    wavfile.write(out, fs2, y.astype(np.float32))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else 'rhythm')
