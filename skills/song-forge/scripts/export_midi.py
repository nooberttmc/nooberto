"""Multitrack MIDI of the song for a DAW: one named track per part, plus drum tracks, at the song's tempo.

usage: python3 export_midi.py events.json drums.json|- out.mid [--title NAME] [--key F#m]
Times in events.json are seconds; they're written on the song's tempo grid (events.json "bpm", 960 ticks per beat).
Drums: Kick = 36, layered Hard Steppin snares = 38; the main break's slices are written on their own track
(one note per slice, pitch = slice number from C3), so the groove's rhythm is there to rebuild with any kit.
"""
import sys, json, argparse
import mido

BPM, TPB = 120, 960
NAMES = {'lead': 'Lead Guitar', 'harmony': 'Harmony Guitar', 'rhythmL': 'Rhythm Guitar L', 'rhythmR': 'Rhythm Guitar R',
         'bass': 'Bass', 'piano': 'Piano', 'strings': 'Strings', 'low': 'Low Strings', 'brass': 'Brass',
         'organ': 'Organ', 'timp': 'Timpani'}
BT = None   # tempo map: start time of every bar (events.json "bar_times"); ticks then follow the bars
BEATS = 4   # beats per bar (events.json "meter", e.g. [3, 4])
def tick(sec):
    if BT is None: return int(round(sec * BPM / 60 * TPB))
    import bisect
    b = max(0, min(len(BT) - 2, bisect.bisect_right(BT, sec) - 1)); f = (sec - BT[b]) / (BT[b + 1] - BT[b])
    return int(round((b + f) * BEATS * TPB))

def track(name, notes, channel, program=None, pedal=None):
    tr = mido.MidiTrack(); tr.append(mido.MetaMessage('track_name', name=name, time=0))
    if program is not None: tr.append(mido.Message('program_change', channel=channel, program=program, time=0))
    ev = []
    for dn, up in pedal or []:   # the sustain pedal (CC64), as the song played it
        ev += [(tick(dn), 2, 'cc', 64, 127), (tick(up), 0, 'cc', 64, 0)]
    for t, m, d, v in notes:
        a, b = tick(t), max(tick(t) + 1, tick(t + d))
        ev += [(a, 1, 'note_on', m, v), (b, 0, 'note_off', m, 0)]
    ev.sort(); last = 0
    for at, _, kind, m, v in ev:
        if kind == 'cc': tr.append(mido.Message('control_change', channel=channel, control=m, value=v, time=at - last))
        else: tr.append(mido.Message(kind, channel=channel, note=max(0, min(127, int(m))), velocity=max(0, min(127, int(v))), time=at - last))
        last = at
    return tr

def main(events, drums, out, title='song', key=None):
    global BPM, BT, BEATS
    ev = json.load(open(events)); parts = ev['parts']; BPM = ev.get('bpm', 120); BT = ev.get('bar_times')
    meter = ev.get('meter') or [4, 4]; BEATS = meter[0]
    dr = json.load(open(drums)) if drums and drums != '-' else {}
    mid = mido.MidiFile(ticks_per_beat=TPB)
    meta = mido.MidiTrack(); mid.tracks.append(meta)
    meta.append(mido.MetaMessage('track_name', name=title, time=0))
    meta.append(mido.MetaMessage('time_signature', numerator=meter[0], denominator=meter[1], time=0))
    if key: meta.append(mido.MetaMessage('key_signature', key=key, time=0))
    if BT:   # one tempo per bar (its average), so the MIDI follows the song's speed-ups and slow-downs
        last = 0
        for b in range(len(BT) - 1):
            at = b * BEATS * TPB; meta.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(60 * BEATS / (BT[b + 1] - BT[b])), time=at - last)); last = at
    else: meta.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(BPM), time=0))
    ch = 0
    for k in parts:
        p = parts[k]; name = p.get('label') or NAMES.get(k, k)
        if not p.get('notes'): continue
        notes = [(t, m, d, v) for t, m, d, v, art in p['notes']]
        chans = [c for c in range(16) if c != 9]                  # 15 melodic channels (9 is GM drums); reused beyond that
        mid.tracks.append(track(name, notes, chans[ch % 15], p.get('program', 27), p.get('pedal'))); ch += 1
    if dr.get('kick'): mid.tracks.append(track('Kick', [(t, 36, d, 110) for t, d, p in dr['kick']], 9))
    if dr.get('layer'): mid.tracks.append(track('Snare (layer)', [(t, 38, d, 100) for t, d, p in dr['layer']], 9))
    if dr.get('break'): mid.tracks.append(track('Break Slices', [(t, 48 + int(p), d, 100) for t, d, p in dr['break']], 9))
    mid.save(out); print('wrote', out, len(mid.tracks) - 1, 'tracks')

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('events'); ap.add_argument('drums'); ap.add_argument('out'); ap.add_argument('--title', default='song'); ap.add_argument('--key')
    a = ap.parse_args(); main(a.events, a.drums, a.out, a.title, a.key)
