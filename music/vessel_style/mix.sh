#!/usr/bin/env bash
# re-mix only (no re-recording): the song's recorded stems -> MP3, then measure against the reference
# (no automatic leveler: the song's own section rides shape the dynamics; the leveler would flatten them)
set -euo pipefail
TITLE="${TITLE:-crucible.}"; FILE="${TITLE%.}"   # the file drops a trailing period; the title tag keeps it
cd "$(dirname "$0")"; SF=/home/user/nooberto/skills/song-forge/scripts
ARGS=$(python3 -c "import json; print(' '.join(f'--stem {k}=stems/{k}.wav' for k, p in json.load(open('stems/events.json'))['parts'].items() if p.get('record') is not False))")
node $SF/render.js song.js "$TITLE" $ARGS --breaks ../breaks --artist sunkensol --gain ${GAIN:-4} --ceiling ${CEIL:--2.5} | tail -1
python3 $SF/analyze.py "$FILE.mp3" | sed -n "2,9p"; echo "   (reference: -8.4 LUFS, corr 76%, bands -3.7 -3.7 -12.0 -11.9 -17.2, corr by band 92 76 42 41 40)"
