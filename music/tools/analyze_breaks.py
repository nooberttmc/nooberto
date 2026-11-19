"""Find each break's start offset and label its 16th-note slices as K(kick) / S(snare) / s(ghost) / h(hat only).
All loops in the pack are 160 BPM. Prints a slice map per break (JSON) for the songs to use."""
import sys, json, subprocess, numpy as np
from scipy import signal
SR = 44100; STEP = 60 / 160 / 4
def load(path):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)
def band(x, lo, hi):
    return signal.sosfilt(signal.butter(4, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def analyze(path):
    x = load(path)
    env = np.abs(x); thr = 0.1 * env.max()
    start = int(np.argmax(env > thr))
    start = max(0, start - int(0.003 * SR))          # a hair before the first transient
    n_steps = int(round((len(x) - start) / SR / STEP))
    n_steps -= n_steps % 16
    low, mid, hi = band(x, 40, 120), band(x, 150, 300), band(x, 2000, 8000)
    w = int(0.045 * SR); labels = []; feats = []
    for i in range(n_steps):
        a = start + int(i * STEP * SR); seg = slice(a, a + w)
        e = [np.sqrt(np.mean(b[seg] ** 2)) for b in (low, mid, hi)]
        feats.append(e)
    feats = np.array(feats); mx = feats.max(axis=0) + 1e-9; f = feats / mx
    for lo_, mi_, hi_ in f:
        if lo_ > 0.55 and lo_ >= mi_ * 0.9: labels.append('K')
        elif mi_ > 0.6: labels.append('S')
        elif mi_ > 0.3: labels.append('s')
        elif hi_ > 0.25: labels.append('h')
        else: labels.append('.')
    return {'start': start / SR, 'steps': n_steps, 'map': ''.join(labels)}
if __name__ == '__main__':
    out = {}
    for p in sys.argv[1:]:
        r = analyze(p); name = p.split(' - ', 2)[-1].rsplit('.', 1)[0]; out[name] = r
        bars = [r['map'][i:i + 16] for i in range(0, r['steps'], 16)]
        print(f"{name:26s} start {r['start']*1000:5.1f} ms  {r['steps']//16} bars  " + ' | '.join(bars))
    json.dump(out, open('/tmp/claude-0/-home-user-nooberto/efdfad98-39e2-5d47-92ab-0d2cf5727cd9/scratchpad/break_maps.json', 'w'), indent=1)

def hits(path):
    """Strongest kick slice, cleanest snare slice and a softer (ghost) snare slice, as 16th indices."""
    x = load(path); n = int(round(len(x) / SR / STEP)); n -= n % 16
    low, mid, hi = band(x, 40, 120), band(x, 150, 300), band(x, 2000, 8000)
    w = int(0.045 * SR); F = []
    for i in range(n):
        a = int(i * STEP * SR); F.append([np.sqrt(np.mean(b[a:a + w] ** 2)) for b in (low, mid, hi)])
    F = np.array(F); F = F / (F.max(axis=0) + 1e-9)
    kick = int(np.argmax(F[:, 0] - 0.6 * F[:, 1]))
    sn = F[:, 1] + 0.4 * F[:, 2] - 0.7 * F[:, 0]
    snare = int(np.argmax(sn))
    ghosts = [i for i in np.argsort(-sn) if i != snare and 0.25 < F[i, 1] < 0.7]
    return {'kick': kick, 'snare': snare, 'ghost': int(ghosts[0]) if ghosts else snare, 'steps': n}
