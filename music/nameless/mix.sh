#!/usr/bin/env bash
# re-mix only (no re-recording): the recorded piano hands -> MP3, then measure against the reference's first 24 s
set -euo pipefail
cd "$(dirname "$0")"; SF=/home/user/nooberto/skills/song-forge/scripts
TITLE="${TITLE:-untitled (azali style)}"; FILE="${TITLE%.}"
ARGS=$(python3 -c "import json; print(' '.join(f'--stem {k}=stems/{k}.wav' for k, p in json.load(open('stems/events.json'))['parts'].items() if p.get('record') is not False))")
node $SF/render.js song.js "$TITLE" $ARGS --artist sunkensol --gain ${GAIN:-3} --ceiling ${CEIL:--2.5} | tail -1
python3 $SF/analyze.py "$FILE.mp3" | sed -n "2,9p"; echo "   (reference 0-24 s: -12.6 LUFS, corr 27%, bands -5.5 -5.2 -4.1 -15.7 -31.0)"
