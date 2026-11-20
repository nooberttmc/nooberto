---
name: song-forge
description: Write, produce, mix and release original songs entirely in code - sampled instruments (FluidSynth + MuseScore General), re-amped distorted guitars (Guitarix JCM800/DS-1), breakbeats, orchestra, Web Audio mixing in headless Chromium, mastering to -11 LUFS / -1 dBTP, measurement against a reference track, DAW-style visualizer videos, FL Studio stem + MIDI export, and pixel-art cover/profile/banner images. Use this whenever the user wants music made or changed - a song, soundtrack, game music, boss theme, breakcore/DnB/metal/orchestral track, "make it sound like this reference", remixing levels/tone/arrangement from listener feedback, exporting stems or MIDI for a DAW, a music video/visualizer, or album/channel artwork for a release - even if they don't mention any of these tools.
---

# song-forge

An offline pipeline for making finished songs without a DAW, plus everything learned producing two of them
("apricity." and "Undertow Requiem") through dozens of rounds of listener feedback. You can't hear audio, so this skill
leans on two things: proven code (templates and scripts) and measurement (`analyze.py`), with the listener's ears as
the final judge.

Paths below are relative to this skill's folder. `scripts/` holds the tools, `templates/` the starting song and build
script, `references/` the detailed notes and the two complete songs.

## Setup (once per machine)
`bash scripts/setup.sh` installs FluidSynth, the MuseScore General / FluidR3 SoundFonts, Guitarix LV2 + lv2file, ffmpeg,
Python libs (mido, numpy, scipy, pillow) and Playwright's Chromium, then reports what it found. Without Guitarix
(macOS), `reamp.py` uses a built-in amp model automatically.

## The workflow
1. **Pin down the brief.** Genre, mood, length, tempo/key if known, where it's used (game loop? release?), any
   reference track. If there's a reference, measure it: `python3 scripts/analyze.py REF` (tempo, key, loudness,
   tonal balance, width, centre-channel tone). Take style from references, never their melodies (see
   references/composition.md section 1).
2. **Start from the template.** Copy `templates/song_template.js` into a project folder as `song.js`, and set up
   breaks: `python3 scripts/prepare_breaks.py <loops folder> <project>/breaks --bpm <loop bpm>`. The template is a
   complete, working short song; keep its plumbing (stems, EQ slots, glides, drums, export hooks) and rewrite the
   composition: SECTIONS, chords, hand-written melody lines, riffs, arrangement per section. For a full-length song,
   read `references/examples/apricity.js`; for synth-only electronic music, `references/examples/undertow_requiem.js`.
3. **Build.** `SONGFORGE=<skill>/scripts bash templates/build.sh song.js "Title" --artist NAME --gain 4 [--video]`
   exports the notes, records every part (FluidSynth -> amp sim), mixes in Chromium, masters to MP3 and prints the
   analysis. To iterate on the mix only (no re-recording), re-run just the `render.js ... --stem` step.
4. **Check before you send.** Read the analysis: loudness ~-11 LUFS, true peak <= -1 dBTP, level jumps (few over
   3 dB), width, tonal balance vs the reference. For composition changes, print the notes per bar with their chords and
   confirm every note is intended. For guitar changes, check that short and long notes start at the same level.
5. **Deliver and iterate.** Send the MP3 (and video). Say plainly that you can't listen, so the user's ears decide.
   Turn each piece of feedback into a specific, measurable cause before changing anything (see "Iterating with a
   listener"). Ship each round as a whole: re-render, re-measure, re-send.
6. **Release extras** (when asked): video `scripts/visualize.py events.json drums.json song.mp3 out.mp4 60 1.5`
   (1080p); FL Studio / DAW package `scripts/export_stems.sh song.js stems out_dir --title T --key Em` (FLAC stems
   that sum to the mix + multitrack MIDI); artwork from `references/examples/art/` (see references/visuals.md); MP3
   tags and cover art (visuals.md has the ffmpeg line).

## Iterating with a listener
You can't hear the result, so treat each complaint as a symptom and find the mechanism before touching anything:
- Locate it: timestamps -> bars (`bar = seconds / (60/BPM*4)`), video clip labels -> section bars, and the parts and
  notes playing there (print them from events.json).
- Measure it where you can (`analyze.py` level curve, band shares, centre tone, jumps; per-stem levels).
- Fix the cause, not the symptom: "fast notes sound scratched" was overlapping release tails inside the distortion, not
  too little level; "random volume changes" was per-bar level riding and heavy kick ducking, not the mix overall;
  "a little kid talking" was a vocal sample inside a breakbeat. Then confirm with numbers.
- Keep what they liked. Change one family of things per round when you can, and tell them exactly what changed and
  what to listen for.
- Report honestly: what you measured, what you couldn't verify, and trade-offs (e.g. more distortion = muddier runs).

## Hard-won lessons (the short list)
Details and the reasoning live in `references/`. These are the ones that cost the most iterations:
1. **Guitar release tails**: set `release: -1800` (lead) / `-1400` (rhythm, bass) per part, or fast notes overlap
   inside the distortion and sound scratchy. (guitars.md)
2. **One lead tone** for fast and slow notes; sustain from the compressor, heaviness from the cabinet curve (thick
   250-1000 Hz, dark 2-4 kHz), not from piling on gain. (guitars.md)
3. **Write melodies by hand**; formula runs/arpeggios sound random. Vary long repeated sections. (composition.md)
4. **Ornaments sparingly**: grace notes just before the beat on leap targets, direction following the line, ~3-5 per
   16 bars, placed by hand; listeners disliked trills. (composition.md)
5. **Two different rhythm takes**, hard-panned, for width. (guitars.md, mixing.md)
6. **Consistent levels**: no per-bar riding; glide every change over 2 bars before its downbeat; light kick ducking;
   slow leveler on the master, but let a real breakdown stay ~3 dB quieter. (mixing.md)
7. **Bring a part forward by pulling others back**, not by pushing it into the compressor. (mixing.md)
8. **-11 LUFS, true peak <= -1 dBTP** (render.js limits at -2 dBFS). Louder only gets turned down and clips. (mixing.md)
9. **No non-instrument noise** (risers, hiss, clicks); listen out for vocal samples in breaks. (mixing.md)
10. **Feedback loops must have gain < 1** (the ping-pong echo once blew up a render). (mixing.md)
11. **At most 1-2 breaks at once**; change breaks between sections; avoid "bouncing" accelerating rolls if disliked.
12. **Endings need a coda**, then one low note that rings out; no abrupt stops, no dead space. (composition.md)
13. **Leads an octave down** read heavier and less shrill (for guitar leads; bright synth leads can sit higher).
14. **Check edits to the master chain** by looking at the render's peak/loudness: a swallowed line once made a
    silent render.
15. **Tempo effects need a tempo map** (`T(bar, step)` for all timing, `bar_times` exported). (composition.md 5b)
16. **Measure tone against the reference's isolated guitars** (side channel), never by eye. (guitars.md)
17. **Renders aren't bit-identical** (echo scheduling); compare mixes by residual dB, not max sample difference.

## How the pieces fit
- `song.js` defines `guitarEvents()` (every pitched part as notes: `[t_sec, midi, dur_sec, velocity, articulation]`,
  plus `bpm` and `sections`) and `async renderSong()` (the mix: loads recorded stems via `loadAsset('stem/NAME', ctx)`,
  breaks via `loadAsset('break/KEY', ctx)` with `window.BREAK_INFO`, synthesizes drums/sub/effects in an
  OfflineAudioContext, returns `{ wav, seconds, peak, drums }`).
- `scripts/render.js` runs it in headless Chromium (`--events`, `--stem`, `--breaks`, `--gain`, `--level`, `--dip`,
  `--free`, `--artist`, `--solo`/`--norm`/`--wav-out` for stems). See its header.
- `scripts/guitar_stems.py` records parts (per-part options: program, sf, amp, humanize, lag, velvar, cents, release;
  articulations open/mute/lead/bend/release/bendrel/legato; amp rhythm/dark/lead/bass/none) and calls `scripts/reamp.py` (amp chain, cabinet voices,
  `LEAD` settings, fallback model).
- `scripts/level.py` (slow leveler), `scripts/analyze.py` (measurement), `scripts/prepare_breaks.py` (loops ->
  trimmed MP3 + slice map), `scripts/visualize.py` (video), `scripts/export_midi.py` + `scripts/export_stems.sh`
  (DAW export).

## References
- `references/composition.md`: references vs copying, harmony, writing melodies, ornaments, structure, endings, drums.
- `references/guitars.md`: release tails, fast notes, heavy tone, rhythm takes, bass, humanizing, Guitarix gotchas.
- `references/mixing.md`: separation, consistent volume vs dynamics, width, tone, loudness, noise, verification.
- `references/visuals.md`: visualizer, pixel-art thumbnail/profile picture/banner rules, cover art and tags.
- `references/examples/`: the two complete songs, apricity's build, and its artwork scripts (see its README).
