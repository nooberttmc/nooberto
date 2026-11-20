"""Record a song's instrument parts: notes -> MIDI -> FluidSynth (sampled instruments) -> optional re-amp.

usage: python3 guitar_stems.py events.json outdir
events.json (from the song's guitarEvents()):
  {"parts": {name: {"sf": "musescore"|"fluid", "amp": "rhythm"|"lead"|"none", "humanize": ms,
                    "notes": [[t_sec, midi, dur_sec, velocity, "open"|"mute"|"lead"], ...]}}}
Open notes use the part's "program" (default GM 27, clean electric guitar), palm mutes "mute_program" (default 28).
Lead notes get vibrato; 'bend' notes bend up a whole step into pitch, 'release' notes sag a semitone as they end, 'bendrel' does both. amp "none" leaves orchestral parts (piano, strings, organ...) as recorded.
"""
import sys, os, json, math, random, subprocess
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
    tr.append(mido.Message('program_change', channel=0, program=part.get('program', 27), time=0))
    tr.append(mido.Message('program_change', channel=1, program=part.get('mute_program', 28), time=0))
    tr.append(mido.Message('control_change', channel=0, control=101, value=0, time=0))   # pitch-bend range: 2 semitones
    tr.append(mido.Message('control_change', channel=0, control=100, value=0, time=0))
    tr.append(mido.Message('control_change', channel=0, control=6, value=2, time=0))
    ev = []; hum = part.get('humanize', 0) / 1000.0
    lag = part.get('lag', 0) / 1000.0; velvar = part.get('velvar', 7)   # a player sits slightly behind the grid; small dynamics
    cents = part.get('cents', 0); base = int(8192 * cents / 200)   # constant detune, kept under every bend
    if cents:
        for ch in (0, 1): tr.append(mido.Message('pitchwheel', channel=ch, pitch=base, time=0))
    PB = lambda t, v: ev.append((t, 2, ('pitchwheel', 0, base + int(v), 0)))   # v in 1/4096 semitone, range +-2
    notes = []
    for t, m, d, v, art in part['notes']:
        jt = lag + (rnd.uniform(-hum, hum) if hum else 0.0)
        ch = 1 if art == 'mute' else 0
        vel = max(30, min(127, int(v + (rnd.randint(-velvar, velvar) if hum else 0))))
        notes.append([t, jt, d, ch, int(m), vel, art])
    # a note may not ring into the next note of the same pitch (its note-off would cut the new note short)
    last = {}
    for n in sorted(notes, key=lambda n: n[0] + n[1]):
        k = (n[3], n[4])
        if k in last:
            p = last[k]; start = n[0] + n[1]
            if p[0] + p[1] + p[2] > start - 0.002: p[2] = max(0.01, start - 0.002 - p[0] - p[1])
        last[k] = n
    for t, jt, d, ch, m, vel, art in notes:
        ev.append((t + jt, 1, ('note_on', ch, m, vel)))
        ev.append((t + jt + d, 0, ('note_off', ch, m, 0)))
        if art in ('lead', 'bend', 'release', 'bendrel'):  # ('legato' and 'open' notes: no bends or vibrato)
            t0 = t + jt; vib_from = 0.18
            if art in ('bend', 'bendrel'):  # pick a whole step low, then bend up to pitch (eased)
                bl = min(0.16, d * 0.35); n = 10
                for k in range(n + 1): PB(t0 + k * bl / n, -8191 * (1 - (k / n) ** 0.6))
                vib_from = bl + 0.12
            rel = art in ('release', 'bendrel') and d >= 0.25
            vib_to = d - (0.14 if rel else 0)
            if vib_to - vib_from >= 0.15:  # vibrato that grows after the attack
                k = 0
                while vib_from + k * 0.02 < vib_to:
                    tt = t0 + vib_from + k * 0.02; depth = min(1.0, k / 12) * 600
                    PB(tt, depth * math.sin(2 * math.pi * 5.6 * (tt - t0))); k += 1
            if rel:  # let the note sag down a semitone as it ends
                for k in range(8): PB(t0 + vib_to + k * 0.0175, -4096 * (k / 7) ** 1.5)
            PB(t0 + d + 0.001, 0)
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
