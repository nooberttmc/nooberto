"""Record a song's guitar parts: notes -> MIDI -> FluidSynth (sampled electric guitar DI) -> re-amp.

usage: python3 guitar_stems.py events.json outdir
events.json (from the song's guitarEvents()):
  {"parts": {name: {"sf": "musescore"|"fluid", "amp": "rhythm"|"lead"|"none", "humanize": ms,
                    "notes": [[t_sec, midi, dur_sec, velocity, "open"|"mute"|"lead"], ...]}}}
Open notes use GM program 27 (clean electric), palm mutes 28 (muted electric). Lead notes slide in and get vibrato.
"""
import sys, os, json, random, subprocess
import mido
sys.path.insert(0, os.path.dirname(__file__))
import reamp

SF = {'musescore': '/usr/share/sounds/sf3/MuseScore_General.sf3', 'fluid': '/usr/share/sounds/sf2/FluidR3_GM.sf2'}
TPB, BPM = 960, 120.0  # fixed MIDI clock: ticks map straight to seconds
sec = lambda t: int(round(t * TPB * BPM / 60))

def write_midi(part, path, seed):
    rnd = random.Random(seed)
    mid = mido.MidiFile(ticks_per_beat=TPB); tr = mido.MidiTrack(); mid.tracks.append(tr)
    tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(BPM)))
    tr.append(mido.Message('program_change', channel=0, program=27, time=0))
    tr.append(mido.Message('program_change', channel=1, program=28, time=0))
    tr.append(mido.Message('control_change', channel=0, control=101, value=0, time=0))   # pitch-bend range: 2 semitones
    tr.append(mido.Message('control_change', channel=0, control=100, value=0, time=0))
    tr.append(mido.Message('control_change', channel=0, control=6, value=2, time=0))
    ev = []; hum = part.get('humanize', 0) / 1000.0
    cents = part.get('cents', 0)
    if cents:
        for ch in (0, 1): tr.append(mido.Message('pitchwheel', channel=ch, pitch=int(8192 * cents / 200), time=0))
    for t, m, d, v, art in part['notes']:
        jt = rnd.uniform(-hum, hum) if hum else 0.0
        ch = 1 if art == 'mute' else 0
        vel = max(30, min(127, int(v + (rnd.randint(-7, 7) if hum else 0))))
        ev.append((t + jt, 1, ('note_on', ch, int(m), vel)))
        ev.append((t + jt + d, 0, ('note_off', ch, int(m), 0)))
        if art == 'lead':
            if d >= 0.2:  # slide into long notes from a whole step below
                for k in range(6): ev.append((t + jt + k * 0.012, 2, ('pitchwheel', 0, int(-4096 * (1 - k / 5)), 0)))
            if d >= 0.35:  # vibrato that grows after the attack
                n = int((d - 0.18) / 0.02)
                for k in range(n):
                    tt = t + jt + 0.18 + k * 0.02; depth = min(1.0, k / 12) * 700
                    import math
                    ev.append((tt, 2, ('pitchwheel', 0, int(depth * math.sin(2 * math.pi * 5.6 * (tt - t))), 0)))
            ev.append((t + jt + d + 0.001, 2, ('pitchwheel', 0, 0, 0)))
    ev.sort(key=lambda e: (e[0], e[1])); last = 0
    for t, _, (kind, ch, a, b) in ev:
        tk = max(0, sec(max(0.0, t))); dt = max(0, tk - last); last = max(last, tk)
        if kind == 'pitchwheel': tr.append(mido.Message('pitchwheel', channel=ch, pitch=max(-8192, min(8191, a)), time=dt))
        else: tr.append(mido.Message(kind, channel=ch, note=a, velocity=b, time=dt))
    mid.save(path)

def main(events, outdir):
    os.makedirs(outdir, exist_ok=True)
    parts = json.load(open(events))['parts']
    for i, (name, part) in enumerate(parts.items()):
        mid, di, out = [os.path.join(outdir, f'{name}{s}') for s in ('.mid', '_di.wav', '.wav')]
        write_midi(part, mid, seed=i * 101 + 7)
        subprocess.run(['fluidsynth', '-ni', '-q', '-R', '0', '-C', '0', '-g', '0.7', '-r', '44100', '-F', di, SF[part.get('sf', 'musescore')], mid], check=True)
        if part.get('amp', 'rhythm') == 'none': os.replace(di, out)
        else: reamp.main(di, out, part['amp']); os.remove(di)
        print('recorded', name)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
