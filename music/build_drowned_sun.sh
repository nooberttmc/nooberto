#!/usr/bin/env bash
# Builds "The Drowned Sun": export guitar parts -> record + re-amp them -> mix everything.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p stems
node render.js drowned_sun.js "The Drowned Sun" --events stems/events.json
python3 tools/guitar_stems.py stems/events.json stems
node render.js drowned_sun.js "The Drowned Sun" --stem rhythmL=stems/rhythmL.wav --stem rhythmR=stems/rhythmR.wav \
  --stem lead=stems/lead.wav --stem harmony=stems/harmony.wav --stem clean=stems/clean.wav --gain 7
