#!/usr/bin/env bash
# Install everything song-forge needs. Safe to re-run. Linux (apt) is the full setup; macOS (brew) works too, with the
# built-in amp model standing in for Guitarix (reamp.py falls back automatically).
set -e
need() { command -v "$1" >/dev/null 2>&1; }
SUDO=""; [ "$(id -u)" -ne 0 ] && need sudo && SUDO=sudo
if need apt-get; then
  $SUDO apt-get update -qq
  # sampled instruments (FluidSynth + MuseScore General / FluidR3 GM), guitar amp plugins (Guitarix via lv2file), ffmpeg
  $SUDO apt-get install -y -qq fluidsynth musescore-general-soundfont fluid-soundfont-gm guitarix-lv2 lv2file ffmpeg python3-pip fonts-dejavu-core >/dev/null
elif need brew; then
  brew install fluid-synth ffmpeg >/dev/null
  echo "macOS: download MuseScore_General.sf3 (https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/) and set"
  echo "  export SONGFORGE_SF_MUSESCORE=/path/to/MuseScore_General.sf3   (Guitarix isn't on macOS: the built-in amp model is used)"
else
  echo "No apt or brew: install fluidsynth, ffmpeg, a GM SoundFont (MuseScore General), and optionally lv2file + guitarix-lv2."
fi
python3 -m pip install -q mido numpy scipy pillow 2>/dev/null || python3 -m pip install -q --break-system-packages mido numpy scipy pillow
# headless Chromium for the Web Audio renderer
if ! node -e "require('playwright')" 2>/dev/null; then
  npm install -g playwright >/dev/null 2>&1 || npm install playwright >/dev/null
  npx playwright install --with-deps chromium >/dev/null
fi
echo "song-forge: checking..."
need fluidsynth && echo "  fluidsynth ok" || echo "  fluidsynth MISSING"
need ffmpeg && echo "  ffmpeg ok" || echo "  ffmpeg MISSING"
python3 -c "import mido, numpy, scipy, PIL" && echo "  python libs ok"
node -e "require('playwright')" 2>/dev/null && echo "  playwright ok" || echo "  playwright: run from a folder where it's installed, or set NODE_PATH"
python3 -c "import sys; sys.path.insert(0, '$(dirname "$0")'); import reamp; print('  guitar amp: ' + ('Guitarix (real JCM800 + DS-1)' if reamp.have_guitarix() else 'built-in model'))"

# optional: the Salamander Grand Piano SF2 (1.27 GB, CC-BY 3.0) for realistic piano: bash setup.sh --piano [dest_dir]
if [ "${1:-}" = "--piano" ]; then
  DEST="${2:-$HOME/.local/share/song-forge}"; mkdir -p "$DEST"; TMP=$(mktemp -d)
  curl -L -o "$TMP/sal.tar.xz" "https://freepats.zenvoid.org/Piano/SalamanderGrandPiano/SalamanderGrandPiano-SF2-V3+20200602.tar.xz"
  tar -xJf "$TMP/sal.tar.xz" -C "$TMP" && mv "$TMP"/SalamanderGrandPiano-SF2-*/*.sf2 "$DEST/SalamanderGrandPiano.sf2" && rm -rf "$TMP"
  echo "piano: $DEST/SalamanderGrandPiano.sf2 (credit: Salamander Grand Piano by Alexander Holm, CC-BY 3.0)"
fi

# optional: the Salamander Grand Piano SFZ (1.4 GB, CC-BY 3.0) for the house grand (sf: 'grand', piano_render.py):
#   bash setup.sh --grand    -> ~/.local/share/song-forge/SalamanderGrandPiano
if [ "${1:-}" = "--grand" ]; then
  mkdir -p "$HOME/.local/share/song-forge" && git clone --depth 1 https://github.com/sfzinstruments/SalamanderGrandPiano "$HOME/.local/share/song-forge/SalamanderGrandPiano"
  pip install -q soundfile mido numpy
fi
