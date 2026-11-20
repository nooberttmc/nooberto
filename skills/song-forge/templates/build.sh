#!/usr/bin/env bash
# Build a song-forge song: notes -> recorded parts -> mix -> MP3 (+ optional video).
# usage: build.sh song.js "Title" [--artist NAME] [--gain DB] [--level FROM:UNTIL] [--video]
# Set SONGFORGE to the skill's scripts folder (default: next to this file's skill install).
set -euo pipefail
SF="${SONGFORGE:-$(cd "$(dirname "$0")/../scripts" 2>/dev/null && pwd)}"
SONG="$1"; TITLE="$2"; shift 2
DIR="$(cd "$(dirname "$SONG")" && pwd)"; STEMS="$DIR/stems"; mkdir -p "$STEMS"
VIDEO=0; EXTRA=()
while [ $# -gt 0 ]; do case "$1" in --video) VIDEO=1; shift;; *) EXTRA+=("$1" "$2"); shift 2;; esac; done
node "$SF/render.js" "$SONG" "$TITLE" --events "$STEMS/events.json"              # 1. the notes
if grep -q "const QUAL" "$SONG"; then node "$SF/check_notes.js" "$SONG" | tail -15; fi       # 1b. every note vs its chord
python3 "$SF/guitar_stems.py" "$STEMS/events.json" "$STEMS"                       # 2. record every part
ARGS=$(python3 -c "import json,sys; print(' '.join(f'--stem {k}={sys.argv[2]}/{k}.wav' for k, p in json.load(open(sys.argv[1]))['parts'].items() if p.get('record') is not False))" "$STEMS/events.json" "$STEMS")
node "$SF/render.js" "$SONG" "$TITLE" $ARGS "${EXTRA[@]}"                         # 3. mix + master -> MP3
MP3="$DIR/$(echo "$TITLE" | sed 's#[\\/:*?"<>|]##g; s/\.$//').mp3"
python3 "$SF/analyze.py" "$MP3"                                                   # 4. measure it
if [ "$VIDEO" = 1 ]; then python3 "$SF/visualize.py" "$STEMS/events.json" "$STEMS/drums.json" "$MP3" "${MP3%.mp3}.mp4" 60 1.5; fi
