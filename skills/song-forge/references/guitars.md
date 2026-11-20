# Guitars: recording and tone

The guitars are sampled (MuseScore General "Clean Electric Guitar" GM 27, palm mutes on GM 28) played by FluidSynth,
then re-amped: overdrive -> Guitarix JCM800 preamp -> Guitarix DS-1 -> a 4x12 cabinet EQ (scipy) -> (lead) compressor.
`guitar_stems.py` records, `reamp.py` amps. Settings live in `reamp.py` (`LEAD` dict, cabinet voices).

## The single biggest fix: short release tails
A SoundFont guitar's release envelope rings ~200 ms after note-off. At 16ths (84 ms at 178 BPM) two or three notes
sound at once *inside the distortion*, which intermodulates into a scratchy, fizzy, "different guitar" sound.
Set a part's `release` (SoundFont NRPN, generator 38): `-1800` (~25 ms) for leads, `-1400` (~45 ms) for rhythm and
bass. Measured: share of each fast note's energy on its own harmonics went from 37% to 85%. CC #72 does nothing in
FluidSynth by default; the NRPN does.

## Fast notes
- Keep quick notes separated (length ~0.95 of their slot) unless they're meant to be legato.
- Don't give fast passages a different guitar/tone: a separate lighter-drive track for fast notes "sounds like a
  different guitar plays it". One lead tone for everything.
- Sustain from compression, not more distortion: the lead chain ends in a compressor (-20 dB threshold, 5:1, 4 ms
  attack) so held notes stay up while quick notes keep their pitch. Check that short and long notes start at the same
  level (median attack level within ~1 dB).
- No bends or vibrato on tiny notes (the recorder only applies them to "lead"/"bend"/"release" notes long enough).

## Heavy lead tone ("like the reference")
Heaviness was mostly *tone*, not gain: compare our lead against the reference's centre channel (`analyze.py --ref`,
"centre channel tone"). The reference lead was thick and dark (strong 250-1000 Hz, weak 2-4 kHz). The `heavy` cabinet
voice (+6 dB around 380 Hz, -11 dB at 2.6 kHz) plus moderate drive (pre-drive 8, JCM800 -4, DS-1 0.9) matched it within
~2 dB per band while fast notes stayed ~68% harmonically clean. More gain than that only muddied fast notes.

## Rhythm guitars
- Two takes hard-panned L/R. They must be *different takes* or the stereo collapses to mono: different humanize seed,
  looser timing (9 ms) and dynamics (+-10), slight detune (+8 cents), and a different voicing (root-fifth vs
  root-fifth-octave). Measured L-vs-R take correlation: 0.8% (independent).
- Don't use different SoundFonts for L and R: "too stereo and fake".
- "Lower guitar sounds muffled": use the brighter cabinet for rhythm (less 2-5 kHz cut) plus a 3.5 kHz lift in the mix,
  above where the lead lives.
- "Lower guitar overly distorted, higher not enough": rhythm pre-drive ~3.5, lead more (see above).

## Bass
Clean sub below 110 Hz + heavily driven upper bass (tanh), low-passed at 2.6 kHz. The synth sub owns the very bottom.

## Humanizing (slightly human, not sloppy)
Lead: `humanize: 4, lag: 3, velvar: 6` (-1..+7 ms behind the grid, small dynamics). Harmony a hair later (`lag: 6`).
More than that starts to sound like a different take.

## Guitarix hosting gotchas (lv2file)
- `gx_amp` and `gx_cabinet` segfault under lv2file; use `gx_jcm800pre` + `gx_bossds1` and do the cabinet in scipy.
- The JCM800 plugin outputs silence for float input: write 16-bit WAV.
- DS-1 `BYPASS` is inverted: 1 = pedal on.
- Plugins click as they start: pad 0.6 s of silence and trim it after.
- Without Guitarix (macOS), `reamp.py` falls back to a built-in two-stage clipper model automatically.
