"""How audible is each part in the mix? Renders every part solo at its exact mix level (render.js --solo, a shared
--norm, master compressor bypassed) and the whole mix the same way, then, per section, measures each part's UNMASKED
share: the fraction of its energy in time-frequency cells where it is no more than 6 dB under everything else
playing there. Rough guide: > 40% clearly heard (a lead), 15-40% heard, 5-15% felt more than heard, < 5% buried.

usage: python3 audibility.py song.js stems_dir [--breaks DIR] [--parts a,b,c] [--jobs 3]
The song's renderSong() must honour window.SOLO for every part name (stems, synthesized parts, 'drums').
"""
import sys, os, json, subprocess, argparse, tempfile, concurrent.futures as cf
import numpy as np
from scipy import signal
from scipy.io import wavfile
HERE = os.path.dirname(os.path.abspath(__file__))

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('song'); ap.add_argument('stems'); ap.add_argument('--breaks')
    ap.add_argument('--parts'); ap.add_argument('--jobs', type=int, default=3); ap.add_argument('--norm', default='0.25')
    a = ap.parse_args()
    ev = json.load(open(os.path.join(a.stems, 'events.json')))
    recorded = [k for k, p in ev['parts'].items() if p.get('record') is not False]
    parts = a.parts.split(',') if a.parts else [k for k in ev['parts']] + ['drums']
    stem_args = sum([['--stem', f'{k}={os.path.join(a.stems, k)}.wav'] for k in recorded], [])
    tmp = tempfile.mkdtemp(prefix='aud_')
    def render(name):
        out = os.path.join(tmp, name + '.wav')
        cmd = ['node', os.path.join(HERE, 'render.js'), a.song, 'x', *stem_args, '--solo', name, '--norm', a.norm, '--wav-out', out]
        if a.breaks: cmd += ['--breaks', a.breaks]
        subprocess.run(cmd, check=True, capture_output=True); return name, out
    with cf.ThreadPoolExecutor(a.jobs) as ex: files = dict(ex.map(render, parts + ['all']))
    def load(f):
        sr, x = wavfile.read(f); x = x.astype(np.float32).mean(axis=1) / 32768; return sr, x
    sr, mix = load(files['all']); nper = 2048
    f_, t_, M = signal.stft(mix, sr, nperseg=nper); Pm = np.abs(M) ** 2
    bt = ev['bar_times']; secs = []; g = 0
    for n, l in ev['sections']: secs.append((n, bt[g], bt[min(g + l, len(bt) - 1)])); g += l
    rows = {}
    for p in parts:
        _, x = load(files[p]); x = np.pad(x, (0, max(0, len(mix) - len(x))))[:len(mix)]
        _, _, S = signal.stft(x, sr, nperseg=nper); Ps = np.abs(S) ** 2; rest = np.maximum(Pm - Ps, 1e-12)
        un = Ps * (Ps >= rest * 10 ** (-6 / 10))
        r = []
        for n, a0, a1 in secs:
            sl = (t_ >= a0) & (t_ < a1); tot = Ps[:, sl].sum()
            share = Ps[:, sl].sum() / max(Pm[:, sl].sum(), 1e-12)
            r.append(None if share < 1e-3 else 100 * un[:, sl].sum() / max(tot, 1e-12))
        rows[p] = r
    print('unmasked share of each part, per section (%; blank = not playing). >40 clearly heard, 15-40 heard, 5-15 felt, <5 buried')
    print(f"{'':10s}" + ''.join(f'{n:>7s}' for n, _, _ in secs))
    for p, r in rows.items(): print(f'{p:10s}' + ''.join(f'{"":>7s}' if v is None else f'{v:7.0f}' for v in r))

if __name__ == '__main__': main()
