"""Multitrack MIDI of the song for a DAW: one named track per part, plus drum tracks, at the song's tempo.

usage: python3 export_midi.py events.json drums.json out.mid
Times in events.json are seconds; they're written on a 178 BPM grid (960 ticks per beat).
Drums: Kick = 36, layered Hard Steppin snares = 38; the main break's slices are written on their own track
(one note per slice, pitch = slice number from C3), so the groove's rhythm is there to rebuild with any kit.
"""
import sys, json
import mido

BPM, TPB = 178, 960
NAMES = {'lead': 'Lead Guitar', 'harmony': 'Harmony Guitar', 'rhythmL': 'Rhythm Guitar L', 'rhythmR': 'Rhythm Guitar R',
         'bass': 'Bass', 'piano': 'Piano', 'strings': 'Strings', 'low': 'Low Strings', 'brass': 'Brass',
         'organ': 'Organ', 'timp': 'Timpani'}
tick = lambda sec: int(round(sec * BPM / 60 * TPB))

def track(name, notes, channel, program=None):
    tr = mido.MidiTrack(); tr.append(mido.MetaMessage('track_name', name=name, time=0))
    if program is not None: tr.append(mido.Message('program_change', channel=channel, program=program, time=0))
    ev = []
    for t, m, d, v in notes:
        a, b = tick(t), max(tick(t) + 1, tick(t + d))
        ev += [(a, 1, 'note_on', m, v), (b, 0, 'note_off', m, 0)]
    ev.sort(); last = 0
    for at, _, kind, m, v in ev:
        tr.append(mido.Message(kind, channel=channel, note=max(0, min(127, int(m))), velocity=max(0, min(127, int(v))), time=at - last)); last = at
    return tr

def main(events, drums, out):
    parts = json.load(open(events))['parts']; dr = json.load(open(drums))
    mid = mido.MidiFile(ticks_per_beat=TPB)
    meta = mido.MidiTrack(); mid.tracks.append(meta)
    meta.append(mido.MetaMessage('track_name', name='apricity. - sunkensol', time=0))
    meta.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(BPM), time=0))
    meta.append(mido.MetaMessage('time_signature', numerator=4, denominator=4, time=0))
    meta.append(mido.MetaMessage('key_signature', key='F#m', time=0))
    ch = 0
    for k, name in NAMES.items():
        if k not in parts: continue
        p = parts[k]; notes = [(t, m, d, v) for t, m, d, v, art in p['notes']]
        mid.tracks.append(track(name, notes, ch, p.get('program', 27))); ch += 1
        if ch == 9: ch += 1                                   # skip the GM drum channel
    mid.tracks.append(track('Kick', [(t, 36, d, 110) for t, d, p in dr['kick']], 9))
    mid.tracks.append(track('Snare (Hard Steppin)', [(t, 38, d, 100) for t, d, p in dr['layer']], 9))
    mid.tracks.append(track('Break Slices', [(t, 48 + int(p), d, 100) for t, d, p in dr['break']], 9))
    mid.save(out); print('wrote', out, len(mid.tracks) - 1, 'tracks')

if __name__ == '__main__':
    main(*sys.argv[1:4])
