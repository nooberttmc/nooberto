#!/usr/bin/env bash
# Exports the song for FL Studio (or any DAW): a multitrack MIDI file plus one audio stem per part, all from 0:00.
# Stems are rendered with the master compressor bypassed and a shared scale, so together they add up to the mix.
set -euo pipefail
cd "$(dirname "$0")/.."
SF=../skills/song-forge/scripts; OUT=fl_export; mkdir -p "$OUT/stems"
STEMS=$(python3 -c "import json; print(' '.join(f'--stem {k}=stems/{k}.wav' for k in json.load(open('stems/events.json'))['parts']))")
PEAK=$(node $SF/render.js drowned_sun.js x $STEMS --solo all --wav-out "$OUT/_all.wav" | awk '/peak/ {print $NF}')
NORM=$(python3 -c "print(0.89 / $PEAK)")
for p in $(python3 -c "import json; print(' '.join(json.load(open('stems/events.json'))['parts']))") drums; do
  node $SF/render.js drowned_sun.js x $STEMS --solo "$p" --norm "$NORM" --wav-out "$OUT/stems/$p.wav" > /dev/null
  echo "stem $p"
done
rm "$OUT/_all.wav"
python3 $SF/export_midi.py stems/events.json stems/drums.json "$OUT/apricity.mid"
