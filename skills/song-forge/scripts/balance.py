"""Static-balance meter: how loud is each part, where it plays, relative to the whole mix?

Renders every part solo at its exact mix level (render.js --solo, shared --norm, master compressor bypassed) plus the
whole mix the same way, then for each part measures K-weighted loudness (ITU-R BS.1770, as LUFS) over the bars where it
plays and subtracts the mix's loudness over those same bars. 0 LU = as loud as the whole mix there; -6 LU = clearly one
of the loud things; -15 LU = a supporting texture. Compare with a target table and move each part's level by the
difference (the song's stem(..., targetDb) or synth bus gains).

usage: python3 balance.py song.js stems_dir [--breaks DIR] [--jobs 5] [--targets targets.json] [--reuse DIR]
targets.json: {"part": -6, ...} in LU relative to the mix (parts not listed are just reported).
Needs: pyloudnorm (pip install pyloudnorm).
"""
import sys, os, json, subprocess, argparse, tempfile, concurrent.futures as cf
import numpy as np
from scipy.io import wavfile
import pyloudnorm as pyln
HERE = os.path.dirname(os.path.abspath(__file__))

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('song'); ap.add_argument('stems'); ap.add_argument('--breaks')
    ap.add_argument('--jobs', type=int, default=5); ap.add_argument('--targets'); ap.add_argument('--reuse'); ap.add_argument('--norm', default='0.25')
    a = ap.parse_args()
    ev = json.load(open(os.path.join(a.stems, 'events.json')))
    recorded = [k for k, p in ev['parts'].items() if p.get('record') is not False]
    parts = [k for k, p in ev['parts'].items() if p.get('notes')] + ['drums']
    stem_args = sum([['--stem', f'{k}={os.path.join(a.stems, k)}.wav'] for k in recorded], [])
    tmp = a.reuse or tempfile.mkdtemp(prefix='bal_'); os.makedirs(tmp, exist_ok=True)
    def render(name):
        out = os.path.join(tmp, name + '.wav')
        if a.reuse and os.path.exists(out): return name, out
        cmd = ['node', os.path.join(HERE, 'render.js'), a.song, 'x', *stem_args, '--solo', name, '--norm', a.norm, '--wav-out', out]
        if a.breaks: cmd += ['--breaks', a.breaks]
        subprocess.run(cmd, check=True, capture_output=True); return name, out
    with cf.ThreadPoolExecutor(a.jobs) as ex: files = dict(ex.map(render, parts + ['all']))
    def load(f): sr, x = wavfile.read(f); return sr, x.astype(np.float64) / 32768
    sr, mix = load(files['all']); meter = pyln.Meter(sr, block_size=0.4)
    bt = ev['bar_times']
    def bars_of(notes):
        on = set()
        for t, m, d, *_ in notes:
            b0 = max(0, int(np.searchsorted(bt, t, 'right')) - 1); b1 = max(0, int(np.searchsorted(bt, t + d, 'right')) - 1)
            on.update(range(b0, min(b1, len(bt) - 2) + 1))
        return sorted(on)
    def cut(x, bars): return np.concatenate([x[int(bt[b] * sr):int(bt[b + 1] * sr)] for b in bars]) if bars else x[:0]
    dr = json.load(open(os.path.join(a.stems, 'drums.json'))) if os.path.exists(os.path.join(a.stems, 'drums.json')) else {}
    tg = json.load(open(a.targets)) if a.targets else {}
    print(f"{'part':10s} {'bars':>5s} {'rel LU':>7s} {'target':>7s} {'move dB':>8s}")
    res = {}
    for p in parts:
        notes = ev['parts'][p]['notes'] if p in ev['parts'] else [[t, 0, d] for k in dr for t, d, _ in dr[k]]
        bars = bars_of(notes); 
        if len(bars) < 2: continue
        _, x = load(files[p]); n = min(len(x), len(mix)); xs, ms = cut(x[:n], bars), cut(mix[:n], bars)
        try: lp, lm = meter.integrated_loudness(xs), meter.integrated_loudness(ms)
        except ValueError: continue
        rel = lp - lm; res[p] = rel; t = tg.get(p)
        print(f"{p:10s} {len(bars):5d} {rel:7.1f} {'' if t is None else f'{t:7.1f}':>7s} {'' if t is None else f'{t - rel:+8.1f}':>8s}")
    json.dump(res, open(os.path.join(tmp, 'balance.json'), 'w')); print('renders kept in', tmp)

if __name__ == '__main__': main()
