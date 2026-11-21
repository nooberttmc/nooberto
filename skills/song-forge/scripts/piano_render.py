"""Render a MIDI file with the Salamander Grand Piano V3 SFZ (sfzinstruments edition): a small, faithful SFZ piano sampler.

usage: python3 piano_render.py in.mid out.wav [--sfz PATH] [--tuning retuned|natural] [--sr 44100]

Why: the SF2 conversion of the Salamander drops the velocity tracking, the hammer/key-release noises, the pedal noises
and the string resonance - the things that make a hard keystroke sound like the hammer slamming the strings. This
reads the SFZ itself and plays its samples:
  - 16 velocity layers (each velocity picks the layer recorded at that force: soft = warm, hard = bright, percussive)
    plus the SFZ's velocity tracking (amp_veltrack 100 - 73% via its cc99 default = 27%, squared curve)
  - samples every minor third, repitched to the key with the Retuned tuning set (Markus Fiedler) by default
  - the sustain pedal (CC64): note-offs wait for the pedal; pedal-down / pedal-up noise samples
  - release triggers on the effective release: hammer/key-release noise (rel1..88) and string resonance (harmS/harmL),
    quieter the longer the key was held (rt_decay dB per second)
  - ampeg_release (1 s, 4 s in the top octave) and note_polyphony=1 (a repeated key cuts the previous voice, 0.5 s)
Install: git clone --depth 1 https://github.com/sfzinstruments/SalamanderGrandPiano (1.4 GB, CC-BY 3.0, Alexander Holm)
"""
import sys, os, re, math, argparse, json
import numpy as np
import soundfile as sf
import mido

DEFAULT_SFZ = [os.environ.get('SONGFORGE_GRAND_SFZ', ''),
               os.path.expanduser('~/.local/share/song-forge/SalamanderGrandPiano/Salamander Grand Piano V3.sfz')]

def note_num(name):
    m = re.match(r'([A-Ga-g])([#b]?)(-?\d+)$', name.strip())
    if not m: return int(name)
    base = {'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11}[m.group(1).lower()]
    return base + (1 if m.group(2) == '#' else -1 if m.group(2) == 'b' else 0) + 12 * (int(m.group(3)) + 1)

def parse_sfz(path):
    """Flatten the SFZ into a list of region dicts (header inheritance resolved). Handles #define, #include, comments."""
    root = os.path.dirname(path); defines = {}
    def subst(tok):   # apply the definitions as they stand at this point of the file (the SFZ redefines $VEL per layer)
        for k in sorted(defines, key=len, reverse=True): tok = tok.replace(k, defines[k])
        return tok
    def load(p):
        txt = open(p, encoding='utf-8', errors='replace').read()
        txt = re.sub(r'//[^\n]*', '', txt)
        out = []
        for tok in re.split(r'(#define\s+\$\w+\s+\S+|#include\s+"[^"]+")', txt):
            m = re.match(r'#define\s+(\$\w+)\s+(\S+)', tok)
            if m: defines[m.group(1)] = subst(m.group(2)); continue
            m = re.match(r'#include\s+"([^"]+)"', tok)
            if m: out.append(load(os.path.join(root, subst(m.group(1))))); continue
            out.append(subst(tok))
        return ''.join(out)
    text = load(path)
    regions, scope = [], {'control': {}, 'global': {}, 'master': {}, 'group': {}}
    order = ['control', 'global', 'master', 'group']
    for m in re.finditer(r'<(\w+)>|(\w+)=((?:(?!\s\w+=|<).)*)', text, re.S):
        if m.group(1):
            h = m.group(1); cur = h
            if h in scope:
                for k in order[order.index(h):]: scope[k] = {}
            if h == 'region': regions.append({});
            continue
        k, v = m.group(2), m.group(3).strip()
        if cur == 'region': regions[-1][k] = v
        elif cur in scope: scope[cur][k] = v
        if cur == 'region' and '_inherit' not in regions[-1]:
            regions[-1]['_inherit'] = {**scope['control'], **scope['global'], **scope['master'], **scope['group']}
    flat = []
    for r in regions:
        base = r.pop('_inherit', {}); d = {**base, **r}; flat.append(d)
    return flat, scope['control']

class Piano:
    def __init__(self, sfz, tuning='retuned', sr=44100):
        self.sr = sr; self.root = os.path.dirname(sfz)
        regions, control = parse_sfz(sfz)
        self.path = control.get('default_path', '')
        sw = 'C#0' if tuning == 'retuned' else 'C0'
        self.notes, self.rel, self.pedal = [], [], {'down': [], 'up': []}
        for r in regions:
            if 'sample' not in r: continue
            if r.get('sw_last') and note_num(r['sw_last']) != note_num(sw): continue
            if r.get('trigger') == 'release': self.rel.append(r)
            elif 'on_locc64' in r: self.pedal['down' if r['on_locc64'] == '127' else 'up'].append(r)
            else: self.notes.append(r)
        self.cache = {}
        # a measured per-key correction onto a smooth, gentle stretch (salamander_tuning.json, made by measuring every
        # sampled key): the Retuned set still has 12-15 cent bumps between neighbouring regions, which make octaves beat
        tf = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'salamander_tuning.json')
        self.fix = {int(k): v for k, v in json.load(open(tf))['cents'].items()} if tuning == 'retuned' and os.path.exists(tf) else {}
        # the instrument's control defaults: veltrack cc99 = 0.73 -> amp_veltrack 100 - 73 = 27 %
        self.veltrack = 0.27; self.release = 1.0; self.str_res = 1.0; self.hammer = 1.0; self.pedal_vol = 1.0
    def sample(self, name):
        if name not in self.cache:
            x, fs = sf.read(os.path.join(self.root, self.path, name), dtype='float32', always_2d=True)
            self.cache[name] = (x, fs)
        return self.cache[name]
    @staticmethod
    def keyrange(r):
        if 'key' in r: k = note_num(r['key']); return k, k, k
        lo, hi = note_num(r.get('lokey', '0')), note_num(r.get('hikey', '127'))
        return lo, hi, note_num(r.get('pitch_keycenter', r.get('key', str(lo))))
    def pick(self, regions, key, vel):
        for r in regions:
            lo, hi, kc = self.keyrange(r)
            if lo <= key <= hi and int(r.get('lovel', 1)) <= vel <= int(r.get('hivel', 127)): return r, kc
        return None, None
    def voice(self, r, kc, key, vel, length=None, veltrack=None, gain_db=0.0):
        """One sample, repitched to `key`, at the SFZ's level for `vel`; optionally cut to `length` seconds."""
        x, fs = self.sample(r['sample'])
        cents = (key - kc) * 100 + float(r.get('tune', 0)) + (self.fix.get(kc, 0.0) if r in self.notes else 0.0)
        rate = 2 ** (cents / 1200) * fs / self.sr
        n_out = int(min(len(x) / rate, (length or 1e9) * self.sr)) - 1
        if n_out <= 8: return None
        pos = np.arange(n_out) * rate; i = pos.astype(np.int64); f = (pos - i)[:, None].astype(np.float32)
        y = x[i] * (1 - f) + x[np.minimum(i + 1, len(x) - 1)] * f
        vt = (float(r['amp_veltrack']) / 100 if 'amp_veltrack' in r else self.veltrack) if veltrack is None else veltrack
        amp = (1 - vt) + vt * (vel / 127) ** 2
        db = float(r.get('volume', 0)) + gain_db
        return y * (amp * 10 ** (db / 20))

def render(mid_path, out_path, sfz=None, tuning='retuned', sr=44100):
    sfz = sfz or next((p for p in DEFAULT_SFZ if p and os.path.exists(p)), None)
    if not sfz: raise SystemExit('Salamander SFZ not found (set SONGFORGE_GRAND_SFZ or clone it, see the header)')
    P = Piano(sfz, tuning, sr)
    # read the MIDI: notes (with velocity), the sustain pedal
    mf = mido.MidiFile(mid_path); t = 0.0; on = {}; notes = []; ped = []; pedal_down = False
    for msg in mf:
        t += msg.time
        if msg.type == 'note_on' and msg.velocity > 0: on[(msg.channel, msg.note)] = (t, msg.velocity)
        elif msg.type in ('note_off', 'note_on'):
            s = on.pop((msg.channel, msg.note), None)
            if s: notes.append([s[0], t, msg.note, s[1]])
        elif msg.type == 'control_change' and msg.control == 64:
            d = msg.value >= 64
            if d != pedal_down: ped.append((t, d)); pedal_down = d
    ped.sort()
    def release_time(t_on, t_off):   # a note-off under the pedal waits for the pedal to come up
        down = False
        for tp, d in ped:
            if tp > t_off: break
            down = d
        if not down: return t_off
        for tp, d in ped:
            if tp > t_off and not d: return tp
        return t_off + 30.0
    end = max([n[1] for n in notes] + [0]) + 12.0
    out = np.zeros((int(end * sr), 2), np.float32)
    def add(y, t0):
        if y is None: return
        a = int(t0 * sr); b = min(len(out), a + len(y))
        if b > a: out[a:b] += y[:b - a]
    # voices, with note_polyphony = 1: a repeated key cuts the previous voice with a 0.5 s fade
    notes.sort(); by_key = {}
    for n in notes: by_key.setdefault(n[2], []).append(n)
    for key, seq in by_key.items():
        for j, (t_on, t_off, _, vel) in enumerate(seq):
            r, kc = P.pick(P.notes, key, vel)
            if r is None: continue
            t_rel = release_time(t_on, t_off)
            nxt = seq[j + 1][0] if j + 1 < len(seq) else None
            rel = float(r.get('ampeg_release', P.release))
            stop = t_rel if nxt is None or nxt > t_rel else nxt; fade = rel if (nxt is None or nxt > t_rel) else 0.5
            hold = stop - t_on
            y = P.voice(r, kc, key, vel, length=hold + fade)
            if y is None: continue
            k0 = int(hold * sr)
            if k0 < len(y):   # the release: an exponential fade to -60 dB over the release time
                m = len(y) - k0; env = np.exp(np.arange(m) / sr * math.log(1e-3) / fade).astype(np.float32); y[k0:] *= env[:, None]
            add(y, t_on)
            if nxt is not None and nxt <= t_rel: continue   # cut by a repeat of the same key: no release noises
            held = t_rel - t_on
            for rr in P.rel:   # hammer/key-release noise and string resonance, on the effective release
                lo, hi, kc2 = P.keyrange(rr)
                if not (lo <= key <= hi and int(rr.get('lovel', 1)) <= vel <= int(rr.get('hivel', 127))): continue
                if 'harmV' in rr.get('sample', ''): continue
                db = -float(rr.get('rt_decay', 0)) * min(held, 10.0)
                add(P.voice(rr, kc2, key, vel, gain_db=db), t_rel)
    for tp, d in ped:   # pedal noises
        regs = P.pedal['down' if d else 'up']
        if regs: rr = regs[int(tp * 997) % len(regs)]; add(P.voice(rr, 60, 60, 100, veltrack=0.0), tp)
    last = np.nonzero(np.abs(out).max(1) > 1e-5)[0]; out = out[:(last[-1] + sr // 2) if len(last) else sr]
    # many loud notes sum far past full scale: write 32-bit float (it can't clip) and leave headroom (peak 0.5); the mix
    # sets each stem's level itself. (A 24-bit write once hard-clipped 64k samples: crackle on every loud passage.)
    pk = float(np.abs(out).max()) or 1.0
    sf.write(out_path, out * (0.5 / pk), sr, subtype='FLOAT')
    return out_path

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('mid'); ap.add_argument('out'); ap.add_argument('--sfz'); ap.add_argument('--tuning', default='retuned'); ap.add_argument('--sr', type=int, default=44100)
    a = ap.parse_args(); render(a.mid, a.out, a.sfz, a.tuning, a.sr); print('wrote', a.out)
