# Mixing and mastering

Everything is mixed in Web Audio inside `renderSong()` (see the template), then `render.js` runs the optional slow
leveler and encodes with a -2 dBFS limiter. Measure every change with `analyze.py` (against the reference if any):
the numbers below are what the listener's ears agreed with.

## Contents
1. Levels and separation
2. Consistent volume (and the dynamics trade-off)
3. Width
4. Tonal balance and air
5. Loudness and peaks
6. Noise and stray sounds
7. Verifying stems and renders

## 1. Levels and separation ("everything in the drops blends together")
- Level each stem to a target RMS while playing (`stem(name, pan, targetDb, ...)`), so parts sit where intended.
  Starting points: rhythm L/R -13.5, bass -20, lead -12.5 (the loudest thing), harmony -25.5, piano -21, strings -27.
- Give each part its own frequency slot: rhythm guitars HP 100, dip 350 Hz (bass/snare) and 2 kHz (the lead), lift
  3.5 kHz; lead presence ~1.9 kHz; bass owns 45-250 Hz; strings HP 320 Hz; drums dip 380 Hz, snap at 4.5 kHz.
- Thin the arrangement in drops: organ, low strings, piano out; strings an octave up; brass only on phrase accents.
- Kick ducking (sidechain via gain automation on each kick) should be light (rhythm 0.12, bass 0.28, sub 0.3).
  Heavier ducking (0.3-0.6) was heard as "random volume changes" / pumping.
- Pushing one part +8 dB drove it into the master compressor and "it doesn't sound like the same piano". Bring a part
  forward by pulling the others back around it, not by pushing it.
- Fast passages: if the lead disappears, the cause is usually tone/overlap (see guitars.md), not level.

## 2. Consistent volume (and the dynamics trade-off)
- Per-bar level riding (e.g. +1.5 dB lead in "fast" bars) sounded like random volume jumps. Don't ride bar by bar.
- Every intentional level change glides over the 2 bars *before* its downbeat (`glide()`), never on it.
- `level.py` (render.js `--level FROM:UNTIL`): a slow leveler on the finished mix: 4 s loudness, +-5 dB, gain smoothed
  over ~6 s, hands off the intro and the ending. It made the body consistent (10-90% spread 5.3 -> 1.2 dB).
- But a quiet section must stay quiet: an external review noted the leveler had flattened the breakdown (LRA 1.1 LU).
  Use `--free FROM:UNTIL` to let the mix shape a section itself, and shape the transition in the mix (`mride`: ease the
  last 2 bars before down ~2.5 dB, lift the quiet section slightly, swell its last 2 bars back up). Result: the
  interlude sat ~3 dB under the rest with ~3 s transitions, LRA ~2.9.
- Check: `analyze.py` "level jumps within 0.4 s" (target: few over 3 dB, and only where the music changes) and the
  per-second curve around transitions.

## 3. Width ("the stereo image is narrow")
- Overall L/R correlation went 94% -> 75% (reference 44%). What moved it: hard-panned *different* rhythm takes
  (guitars.md), rhythm guitars loud enough to dominate 500 Hz-6 kHz, orchestra spread (strings +0.65, brass -0.55,
  organ -0.45, harmony +0.55), and a ping-pong echo on the lead.
- The ping-pong echo must be ONE feedback loop with gain < 1 (left delay -> right delay -> feedback 0.35 -> left). A
  version with two loops summing to ~1 blew up the render (peak 2e12).
- Going wider than ~70% would mean guitars burying the lead; the listener prioritised the lead.

## 4. Tonal balance and air
- Match the reference's band shares within ~2-3 dB (`analyze.py --ref`). Drops: watch 20-120 Hz (thin breaks like the
  Amen need a low shelf ~+6 dB at 110 Hz; Hard Steppin-style breaks already have it) and 2-8 kHz (cymbals, fizz).
- "Too dark / muffled": ease the master high-shelf (-5 -> -3 dB at 6 kHz), no cut on cymbals, +3 dB shelf on strings.

## 5. Loudness and peaks
- Target about -11 LUFS integrated with true peak <= -1 dBTP. Platforms (YouTube ~-14) turn louder masters down
  anyway, and peaks at -0.1 dB clip in AAC/MP3 conversion. render.js limits at -2 dBFS (0.79); set `--gain` to land
  the LUFS. Check with `analyze.py` (it reads ffmpeg's ebur128 true peak).

## 6. Noise and stray sounds
- Remove non-instrument noise: noise risers, crash noise, impact hiss, kick clicks ("remove any unnecessary background
  noise that isn't an instrument"). Tonal synth hits (kick body, sub, low boom) are fine.
- A whistling band-passed noise riser read as "a little kid" to the listener; so did a break with vocal shouts.
- Sampled pads (organ, string ensemble) exposed alone can read as a voice; thin them or keep them under other parts.

## 7. Verifying stems and renders
- Stem export (`export_stems.sh`): each part solo with the master compressor bypassed and one shared scale; the drum
  pattern keeps running silently so kick ducking matches. Stems summed vs full mix: residual about -31 dB.
- Renders are not bit-identical run to run: the echo's feedback loop can be scheduled differently (~-29 dB difference
  at 400-1500 Hz, inaudible). Compare with a residual in dB, not max sample difference.
- An Edit that swallows the line after a `//` comment can silently disconnect the output (a silent render): always
  check the render's peak/loudness after editing the master chain.

## Realistic piano
The GM piano in MuseScore General sounds like a MIDI piano. What made it sound played:
- **Samples**: the Salamander Grand Piano SF2 (Yamaha C5, 16 velocity layers, stereo AB mics; CC-BY 3.0, Alexander
  Holm; SF2 by FreePats: freepats.zenvoid.org/Piano/SalamanderGrandPiano/SalamanderGrandPiano-SF2-V3+20200602.tar.xz,
  1.27 GB, keep it out of git). `setup.sh --piano` fetches it.
- **Velocity**: programmed pianos are usually played too hard and too evenly. Use ~60-95, shaped by the phrase: accent
  the downbeat, inner voices ~8 softer than the top note, arpeggios arched (louder at the top), a dynamic per section.
- **Rolled chords**: spread a chord's notes a few ms from the bass up (~6 ms per note) instead of one instant.
- **Sustain pedal** (`pedal: [[down, up], ...]` on the part -> CC64): change it at each chord in lyrical passages,
  lifting as the new chord sounds and pressing again ~70 ms later (legato pedalling); leave rhythmic stabs dry.
- **Mix**: a real stereo grand (don't collapse it), little EQ (a small 250 Hz dip, a touch of 3 kHz), some room.
