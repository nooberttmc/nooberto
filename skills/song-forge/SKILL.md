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
4. **Check before you send.** `node scripts/check_notes.js song.js` until it prints "all notes OK" (out-of-key notes,
   non-chord tones held on strong beats, minor-2nd clashes between any two parts; export per-bar `harmony` from
   guitarEvents()), and `node scripts/density_check.js song.js` (stacked unisons, overlapping pads). Then read the
   analysis: loudness ~-11 LUFS, true peak <= -1 dBTP, loudness range ~3-8 LU with real pull-backs (lesson 26), width, tonal balance vs the reference. For composition changes, print the notes per bar with their chords and
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
8. **-11 LUFS, true peak <= -1 dBTP in EVERY delivered file** (render.js limits the MP3; the video's AAC re-encode added
   +2.8 dB of peaks, so visualize.py true-peak-limits the MP4's audio as the very last step and checks it). Louder only
   gets turned down and clips. Measure the files you send: `ffmpeg -i f -af ebur128=peak=true -f null -`. (mixing.md)
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
18. **Set a distorted synth part's level after its clipper**: turning down the gain into a tanh drive barely changes
    the output level (a synthesized kick swamped the low end until a post-drive gain was added).
19. **Per-stem band contributions** (solo each stem at mix level, octave-band energy) find what's actually causing a
    band excess before you EQ the master.
20. **Learn a reference's devices from the recording (or a score the user sends), never its notes**: e.g. a pedal-tone
    bass ostinato in 3+3+2 with a pickup into each bar, long held octaves over it, a scale fill on the V, the
    harmonic-minor leading tone only over V. Build the song from those devices, then run check_notes.js. (composition.md 1b)
21. **Test a fix you can't hear by checking it's connected**: a hi-hat whose connect() calls ended up inside a comment
    played nothing for a whole round ("I can't hear the drums").
22. **Listener preferences from the duel round**: bells only as chords and sparse where the arrangement is dense;
    grace notes flicking UP from the step below; harmony lines as a second player (own part: +9 ms lag, -6 cents,
    own dynamics, panned apart) rather than a perfect copy; lead guitar darker (top rolled off ~4.5 kHz) and as loud as
    the instrument it duels with; heavier breaks (tanh drive, +4 dB low shelf, compression); hold the final chord ~4 s.
    Measure buried parts with `scripts/audibility.py` (unmasked share per section; slow: one render per part).
23. **The house guitar and piano (the listener's standing choice: use them whenever a song has guitar or piano)**:
    - Guitar: every guitar uses the RHYTHM tone - `amp: 'rhythm'`, `release: -1400`, the GTR mix chain
      `[HP(100), PK(350,-3,1.1), PK(2000,-3.5,1.4), PK(3500,2.5,1), LP(9000)]`. Rhythm: two takes hard L/R (humanize 6 /
      9, velvar 10, cents 8 on the second). Lead: the same tone, single notes at the written pitch (above the rhythm
      guitars), centred, `mono: true`, little reverb, no echo. Harmony: a second player like the right take (humanize 9,
      velvar 10, cents 8), panned ~0.45. (Rejected: the 'lead' amp chain as "weird", the scooped 'modern' tone.)
    - Piano: the Salamander Grand (`sf: 'piano'`; `bash scripts/setup.sh --piano`), phrase-shaped velocities ~60-120
      (played hard), chords rolled ~6 ms, sustain pedal per chord in lyrical passages, stabs dry (mixing.md).
    The template already uses both.
24. **Every note has a purpose**: fills and countermelodies quote the song's own motifs (e.g. the guitar answers the
    brass's long notes with the drop's hook on the current chord, rests when the brass moves, tightens into unison);
    chord-tone sweeps that relate to nothing read as "random".
25. **Balance by measurement**: `scripts/balance.py` renders each part solo and reports its loudness where it plays
    relative to the mix (LU); set levels against a target table (drums -5, lead -8, each rhythm take -11, bass -12,
    piano -12, strings -15, bells/timp -14, choir -16 as a starting point), master ~-10 LUFS / <= -1 dBTP. It found a
    bass 11 dB and an arp 16 dB too quiet that no one had noticed by ear-proxy.
26. **Contrast for a constant-energy song: colour, not volume, and one big moment.** Don't flatten everything with a
    leveler (it gave 0.8 LU: "one volume for three minutes"), but don't carve quiet sections either (-4 to -8 LU dips
    were "way too quiet", even 1-2 LU dips felt like a hole). What the listener wanted: every section at full energy
    (within ~1 LU), sections told apart by colour - who leads, bells / choir / synth arp moving in and out, strings and
    choir trading - and ONE big moment (here the tempo brake into the drop). Build within the groove into that moment:
    denser break chops every two bars, a fill, a snare roll through the brake bar. Integrated ~-11 LUFS,
    `--ceiling -2.5` for <= -1 dBTP.
27. **No stacked unisons**: give a melody to 1-2 instruments; others stab, answer or rest; strings and choir take turns
    or sit an octave apart. `node scripts/density_check.js song.js` flags 3-way same-rhythm stacks and overlapping pads.
28. **Drums: two sounds per section** - the kick and ONE break, played mostly as its own groove (its snare and hats do
    the work), fills cut from the same break, a crash only at section starts. Stacking dense chops, synth snares, hats,
    rides and toms read as "too many samples"; pushing kicks and snare rolls that speed up / slow down (a roll across a
    tempo brake) read as a bouncing ball - use them sparingly (one push every other bar; even 16ths on the last beat).
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
- `scripts/check_notes.js` (every note vs its chord and the key, clashes between parts), `scripts/level.py` (slow leveler), `scripts/analyze.py` (measurement), `scripts/prepare_breaks.py` (loops ->
  trimmed MP3 + slice map), `scripts/visualize.py` (video), `scripts/export_midi.py` + `scripts/export_stems.sh`
  (DAW export).

## References
- `references/composition.md`: references vs copying, harmony, writing melodies, ornaments, structure, endings, drums.
- `references/guitars.md`: release tails, fast notes, heavy tone, rhythm takes, bass, humanizing, Guitarix gotchas.
- `references/mixing.md`: separation, consistent volume vs dynamics, width, tone, loudness, noise, verification.
- `references/visuals.md`: visualizer, pixel-art thumbnail/profile picture/banner rules, cover art and tags.
- `references/examples/`: the two complete songs, apricity's build, and its artwork scripts (see its README).
