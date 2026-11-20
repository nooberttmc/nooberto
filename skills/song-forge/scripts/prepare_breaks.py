"""Prepare a folder of breakbeat loops for song-forge songs.

usage: python3 prepare_breaks.py SRC_DIR OUT_DIR [--bpm 160] [--rename "long file name=key" ...]
For every audio loop in SRC_DIR: trims the silence before the first hit, writes OUT_DIR/<key>.mp3, and records in
OUT_DIR/break_info.json  {key: {"kick": i, "snare": i, "ghost": i, "steps": n, "bpm": bpm}}  where the indices are
16th-note slices: the strongest clean kick, the cleanest snare, and a softer "ghost" snare.
Songs use these to play grooves (whole bars), fills (snare slices rolled faster/higher), and single hits.
Keys default to a slug of the file name (the part after the last ' - ', lowercased, spaces -> '_').
Listen for vocals: some classic breaks (e.g. "Think (About It)") have shouts in them that read as a random voice.
"""
import sys, os, json, re, argparse, subprocess
import numpy as np
from scipy import signal

SR = 44100

def load(path):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)

def band(x, lo, hi):
    return signal.sosfilt(signal.butter(4, [lo, hi], 'bandpass', fs=SR, output='sos'), x)

def hits(x, step):
    """Strongest kick slice, cleanest snare slice and a softer (ghost) snare slice, as 16th indices."""
    n = int(round(len(x) / SR / step)); n -= n % 16; n = max(16, n)
    low, mid, hi = band(x, 40, 120), band(x, 150, 300), band(x, 2000, 8000)
    w = int(0.045 * SR); F = []
    for i in range(n):
        a = int(i * step * SR); F.append([np.sqrt(np.mean(b[a:a + w] ** 2)) if a + w <= len(x) else 0.0 for b in (low, mid, hi)])
    F = np.array(F); F = F / (F.max(axis=0) + 1e-9)
    kick = int(np.argmax(F[:, 0] - 0.6 * F[:, 1]))
    sn = F[:, 1] + 0.4 * F[:, 2] - 0.7 * F[:, 0]
    snare = int(np.argmax(sn))
    ghosts = [int(i) for i in np.argsort(-sn) if i != snare and 0.25 < F[i, 1] < 0.7]
    return {'kick': kick, 'snare': snare, 'ghost': ghosts[0] if ghosts else snare, 'steps': n}

def slug(name):
    base = os.path.splitext(name)[0].split(' - ')[-1]
    return re.sub(r'[^a-z0-9]+', '_', base.lower()).strip('_')

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('out'); ap.add_argument('--bpm', type=float, default=160)
    ap.add_argument('--rename', action='append', default=[])
    a = ap.parse_args(); ren = dict(r.split('=', 1) for r in a.rename)
    os.makedirs(a.out, exist_ok=True); step = 60 / a.bpm / 4
    info_path = os.path.join(a.out, 'break_info.json')
    info = json.load(open(info_path)) if os.path.exists(info_path) else {}
    for f in sorted(os.listdir(a.src)):
        if not re.search(r'\.(wav|mp3|flac|ogg|aif|aiff)$', f, re.I): continue
        key = ren.get(f, slug(f)); x = load(os.path.join(a.src, f))
        env = np.abs(x); start = max(0, int(np.argmax(env > 0.1 * env.max())) - int(0.003 * SR))   # a hair before the first hit
        y = x[start:]
        tmp = os.path.join(a.out, key + '.f32'); y.astype(np.float32).tofile(tmp)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', tmp, '-b:a', '256k', os.path.join(a.out, key + '.mp3')], check=True)
        os.remove(tmp)
        info[key] = dict(hits(y, step), bpm=a.bpm)
        print(f"{key:20s} {info[key]['steps'] // 16} bars  kick {info[key]['kick']:2d}  snare {info[key]['snare']:2d}  ghost {info[key]['ghost']:2d}")
    json.dump(info, open(info_path, 'w'), indent=1)
    print('wrote', info_path)

if __name__ == '__main__':
    main()
