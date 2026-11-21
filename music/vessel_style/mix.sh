#!/usr/bin/env bash
# records the parts if they are missing, then mixes the song's recorded stems -> MP3, then measure against the reference
# (no automatic leveler: the song's own section rides shape the dynamics; the leveler would flatten them)
set -euo pipefail
TITLE="${TITLE:-crucible.}"; FILE="${TITLE%.}"   # the file drops a trailing period; the title tag keeps it
cd "$(dirname "$0")"; SF=../../skills/song-forge/scripts
mkdir -p stems   # a fresh copy has no recordings (they aren't in git): export the notes and record the parts first
[ -f stems/events.json ] || node $SF/render.js song.js "$TITLE" --events stems/events.json
python3 -c "import json,os,sys; sys.exit(any(p.get('record') is not False and not os.path.exists(f'stems/{k}.wav') for k, p in json.load(open('stems/events.json'))['parts'].items()))" \
  || python3 $SF/guitar_stems.py stems/events.json stems
ARGS=$(python3 -c "import json; print(' '.join(f'--stem {k}=stems/{k}.wav' for k, p in json.load(open('stems/events.json'))['parts'].items() if p.get('record') is not False))")
node $SF/render.js song.js "$TITLE" $ARGS --breaks ../breaks --artist noobertt --gain ${GAIN:-4} --ceiling ${CEIL:--2.5} | tail -1
python3 $SF/analyze.py "$FILE.mp3" | sed -n "2,9p"; echo "   (reference: -8.4 LUFS, corr 76%, bands -3.7 -3.7 -12.0 -11.9 -17.2, corr by band 92 76 42 41 40)"
