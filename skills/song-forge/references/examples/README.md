# Worked examples

- `apricity.js`: "apricity." by sunkensol (released form of "The Drowned Sun", the Emberwake final-boss theme).
  178 BPM, F# minor -> G minor, 2:57. Everything in the pipeline: sampled guitars re-amped, twin leads with hand-placed
  grace notes and bends, legato climax stabs, hand-written run section, orchestra (piano, strings, low strings, brass,
  organ, timpani), breaks (Amen, Hard Steppin) with fills and a snare layer, synth kick/sub, kick ducking, glides, a
  coda and a long ending, solo/stem-export hooks. Its sections and parts are the reference for a full-length song.
- `build_apricity.sh`: its build (events -> record -> mix with the leveler, `--level`/`--free` for the interlude).
  Paths there are the original project's (`render.js`, `tools/`); with the skill use `scripts/`.
- `undertow_requiem.js`: "Undertow Requiem", atmospheric drum & bass / breakcore, 172 BPM, F minor. Pure Web Audio
  synthesis (no recorded stems): tape-warped piano, synth lead, sub, an Amen break played as edited phrases, a drumless
  breakdown, and deliberate silences. A good starting point for electronic songs without guitars.
- `art/thumbnail.py`, `art/pfp.py`, `art/banner.py`: the release artwork (pixel-art sun sinking into the sea,
  palette from the song). thumbnail.py imports visualize.py: run it with `PYTHONPATH=<skill>/scripts`.
