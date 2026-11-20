#!/usr/bin/env bash
# Export a song for FL Studio (or any DAW): one audio stem per part + drums (FLAC, all from 0:00, summing to the mix
# before the master compressor/limiter) and a multitrack MIDI file.
# usage: export_stems.sh <song.js> <stems_dir> <out_dir> [--title NAME] [--key F#m]
#   stems_dir holds events.json + the recorded <part>.wav files (and drums.json from a normal render).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SONG="$1"; STEMS_DIR="$2"; OUT="$3"; shift 3
TITLE="song"; KEY=""
while [ $# -gt 0 ]; do case "$1" in --title) TITLE="$2"; shift 2;; --key) KEY="$2"; shift 2;; *) echo "unknown $1"; exit 2;; esac; done
mkdir -p "$OUT/stems_wav"
PARTS=$(python3 -c "import json,sys; print(' '.join(json.load(open(sys.argv[1]))['parts']))" "$STEMS_DIR/events.json")
STEM_ARGS=""; for p in $PARTS; do [ -f "$STEMS_DIR/$p.wav" ] && STEM_ARGS="$STEM_ARGS --stem $p=$STEMS_DIR/$p.wav"; done   # recorded parts only (synth parts render inside the song)
# 1) the whole song uncompressed, to find one shared scale for every stem
PEAK=$(node "$HERE/render.js" "$SONG" x $STEM_ARGS --solo all --wav-out "$OUT/.all.wav" | awk '/peak/ {print $NF}')
NORM=$(python3 -c "print(0.89 / $PEAK)"); rm -f "$OUT/.all.wav"
# 2) each part alone (the drum pattern keeps running silently so kick ducking matches the mix), then the drums
i=1
for p in $PARTS drums; do
  node "$HERE/render.js" "$SONG" x $STEM_ARGS --solo "$p" --norm "$NORM" --wav-out "$OUT/stems_wav/$p.wav" > /dev/null
  ffmpeg -loglevel error -y -i "$OUT/stems_wav/$p.wav" -c:a flac -compression_level 8 "$OUT/$(printf %02d $i) $p.flac"; i=$((i+1))
  echo "stem $p"
done
rm -rf "$OUT/stems_wav"
DRUMS="$STEMS_DIR/drums.json"; [ -f "$DRUMS" ] || DRUMS=-
python3 "$HERE/export_midi.py" "$STEMS_DIR/events.json" "$DRUMS" "$OUT/$TITLE (all parts).mid" --title "$TITLE" ${KEY:+--key "$KEY"}
cat > "$OUT/README.txt" <<TXT
$TITLE
Stems (.flac): every part as it sounds in the song (tone, EQ, pan, level, reverb, echo), all starting at 0:00.
Drag them all into the FL Studio Playlist at bar 1: together they are the mix (before the master compressor/limiter;
add Fruity Limiter on the Master for the finished loudness). MIDI: File > Import > MIDI file, one channel per part.
Tempo: $(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('bpm','?'))" "$STEMS_DIR/events.json") BPM.
TXT
echo "done: $OUT"
