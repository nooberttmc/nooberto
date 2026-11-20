#!/usr/bin/env bash
# Builds "The Drowned Sun": export every pitched part -> record (+ re-amp guitars) -> mix with breaks.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p stems
node render.js drowned_sun.js "The Drowned Sun" --events stems/events.json
python3 tools/guitar_stems.py stems/events.json stems
STEMS=$(python3 -c "import json; print(' '.join(f'--stem {k}=stems/{k}.wav' for k in json.load(open('stems/events.json'))['parts']))")
node render.js drowned_sun.js "The Drowned Sun" $STEMS --gain 4
