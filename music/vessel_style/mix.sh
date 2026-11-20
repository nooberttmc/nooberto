#!/usr/bin/env bash
# re-mix only (no re-recording): the song's recorded stems -> MP3, then measure against the reference
set -euo pipefail
cd "$(dirname "$0")"; SF=/home/user/nooberto/skills/song-forge/scripts
ARGS=$(python3 -c "import json; print(' '.join(f'--stem {k}=stems/{k}.wav' for k, p in json.load(open('stems/events.json'))['parts'].items() if p.get('record') is not False))")
node $SF/render.js song.js "${TITLE:-untitled (vbuh style)}" $ARGS --breaks ../breaks --artist sunkensol --gain ${GAIN:-4} $(python3 -c "import json; e=json.load(open('stems/events.json')); bt=e['bar_times']; S={}; g=0
for n,l in e['sections']: S[n]=g; g+=l
print(f\"--level {bt[8]:.2f}:{bt[S['hold']]:.2f} --free {bt[S['drop']-1]:.2f}:{bt[S['drop']]+0.3:.2f}\")") | tail -1
python3 $SF/analyze.py "${TITLE:-untitled (vbuh style)}.mp3" | sed -n "2,9p"; echo "   (reference: -8.4 LUFS, corr 76%, bands -3.7 -3.7 -12.0 -11.9 -17.2, corr by band 92 76 42 41 40)"
