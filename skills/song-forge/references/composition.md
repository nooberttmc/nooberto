# Composition: writing a song that holds up

Lessons from writing "apricity." (breakcore/metal final-boss theme, 178 BPM, F# minor -> G minor) and "Undertow
Requiem" (atmospheric drum & bass, 172 BPM, F minor). Most of them came from listener feedback, so they're about what a
listener actually hears.

## Contents
1. Working from a reference (1b: reading its devices)
2. Harmony and key
3. Melody: write it, don't generate it
4. Ornaments (grace notes, trills, bends)
5. Structure and length
6. Endings
7. Drums and breakbeats in the arrangement

## 1. Working from a reference (1b: reading its devices)
- Measure the reference first (`analyze.py REF`): tempo, key, loudness, tonal balance, width, section shape. These
  are facts you can match; "make it sound like X" is otherwise guesswork.
- Take the *style*, not the notes: tempo, key, the chord *device* (e.g. an Andalusian descent i-VII-VI-V), textures
  (16th-note runs, galloping octave bass, staccato chord stabs), the modulation (up a half step for the last stretch),
  the kind of ending. Do not transcribe another artist's melody into the song, even from sheet music the user sends,
  unless they say it's their own piece. Say so plainly and offer: "if it's yours, send the MIDI/MusicXML".
- Beat trackers often report half time (89 for 178). Key detectors confuse relative keys (D major vs B minor).

## 1b. Reading a reference's devices
When asked to "pay attention to the notes" of a reference, find its devices with music theory, from the recording
(chroma of the low band per 8th note shows the bass line; pyin on the centre shows the lead) or from a score the user
sends, then write new material with them. From "Vessel To Be Fueled" (Vbuh), confirmed against the recording: a
pedal-tone bass ostinato in 8ths with a 3+3+2 rhythm and a pickup run into each bar, alternating two chords a bar apart;
long held octaves above it moving by step; a descending scale fill closing each 4-8 bar phrase; a chromatic descent in the
bass; a theme in syncopated 8ths grouped 3+3+2; the harmonic-minor leading tone over the dominant. The song built from
these used its own progression (i - bVI rocking, bVI - bVII - i, a long V7), its own lines, and passed check_notes.js.
Typical mistakes the checker caught that a listener would hear: a power chord's fifth on a passing note (B or D natural
in F minor), a timpani pitch formula off by a fourth, a held melody note a half step above a bass pickup, a held C over a
Db chord, bells ringing into the next chord.

## 2. Harmony and key
- Minor keys with a dark bII (Neapolitan, e.g. G over F# minor) before the dominant read as "final boss".
- The dominant should be a real dominant (C#7 in F# minor, with E#), so cadences pull home.
- A half-step lift (F# minor -> G minor) for the final section adds intensity without new material. Write the parts
  in the original key and transpose with a `tr` offset per bar, so the same lines work in both keys.
- Every note should fit its chord or be a deliberate passing/neighbour tone. After writing a section, print the notes
  per bar with their chord and check them (the skill's workflow does this; it caught real mistakes).

## 3. Melody: write it, don't generate it
- Formula-generated runs ("arpeggiate the chord with pattern X", "triplet arpeggio up and down") were the single most
  common complaint: "feels randomized and out of place", "repetitive". Hand-write lines as `[step, midi, len16]`.
- A good written phrase: a motif sequenced over the chords (same shape, new chord), a resolution, a call-and-answer,
  a dark fall over the bII, tension on the dominant, a high point (bent), a falling scale home.
- Leads an octave lower (`LO = -12`) sounded heavier and less shrill than leads in the 5th/6th octave.
- Vary repeated sections. A 16-bar section of the same 16th-note runs "drags on way too long": cut it to 12 and give
  every 2-4 bars a different job, with the rhythm guitars changing pattern with the lead (stabs with stabs, drive under
  the high point, a phrase-ending chug).
- Whole-bar held notes in busy sections sounded static; two half notes moving between chord tones fixed it.
- Legato where the line should connect: give each note a length that overlaps the next by ~12 ms ("make all the notes
  go into each other"). Detached notes with gaps between them sounded choppy in melodic passages.

## 4. Ornaments (grace notes, trills, bends)
What worked, from research and listener feedback:
- **Grace notes (acciaccatura)**: a quick neighbour played just BEFORE the beat, borrowing time from the previous note
  (shorten it), so the main note keeps its weight. Use them on notes the melody leaps to. Approach from a step below
  when the line climbs, from a step above when it falls. Use neighbours from the key/chord.
- **Trills**: the listener disliked them (four quick alternating notes read as clutter). If used at all: only at a
  cadence, starting on the upper note, a fixed number of even notes, ending on the main note.
- **How many**: sparingly. ~3 / 5 / 4 grace notes per 16-bar statement was right; ~30 was "overused". Place them by
  hand per bar (`{bar: [[noteIndex, 'grace']]}`), never by a hash/probability.
- Ornament notes need ~60-85 ms each to be heard through distortion; 40-55 ms ones vanished.
- **Bends**: a bend-up into the longest note every other bar and a release (sag down) at phrase ends every 4th bar;
  no bend and ornament on the same note. ~40 bends in a 3-minute song was "not too much".

## 5. Structure and length
- Typical shape that worked (3 minutes at 178): intro (piano/strings, band swells in) -> theme -> run section ->
  half-time breakdown -> theme with twin leads -> climax (staccato stabs) -> quiet interlude (piano) -> theme + runs a
  half step up -> coda -> ending.
- "Less dead space": no silent beats, no long drumless stretches, no long fade tails. Silence is an instrument, but a
  listener noticed every overuse.
- Pull-backs before big moments (thinner arrangement, filtered drums) make the drop land. Do them with the
  arrangement, not by turning things down (see mixing.md: consistent levels).
- For a game loop, keep the loop region (first theme .. end of the last main section) separate from intro/coda/ending.

## 5b. Tempo effects
Real tempo changes are a strong effect (and look great in the visualizer, which scrolls at constant speed so slow
passages stretch out): an intro that accelerates into the song, a brake (199 -> ~60 BPM over one bar, with a closing
low-pass and the kick bending down like a tape stop) right before a drop that slams back at full tempo, a two-bar
"slow motion" at half speed that snaps back, a final brake into the last chord. Implement them with a tempo map:
every bar has a start and end tempo, precompute the time of every 16th (`T(bar, step)`), and route *all* timing
(notes, chords, drum hits) through it. Export `bar_times` from guitarEvents() so visualize.py and export_midi.py follow
the map. Example: the "vbuh-style" song (music/vessel_style/song.js in the project that produced this skill).

## 6. Endings
- Abrupt endings were called out. Add a coda: the main theme broadened (every note twice as long) over ringing chords
  and half-time drums, then thin out (piano returns, long notes over bII and the dominant, a timpani roll), then the
  final gesture (a two-octave fall into one low note that rings ~6 s with a ~5 s fade).
- For a constant-energy song, end at full energy: everything until the last bar, then one big held chord (~1.8 s),
  a hard cut of the dry signal, and only the reverb tail (~2 s). A coda/wind-down suits songs with a dynamic arc.
- "End on a lower note": the last melodic note low (e.g. G3), with the bass/organ/low strings on the tonic below.

## 7. Drums and breakbeats in the arrangement
- At most 1-2 breaks at a time: one main break per section, optionally one layer (e.g. another break's snare on 2 & 4).
- Change the break between sections for variety, but listen for character: an accelerating, pitch-rising snare roll
  read as "a bouncing ball"; a break with vocal shouts ("Think (About It)") read as "a little kid talking". Swap them.
- Fills on the last bar of each section (big) and every 4th bar (small): groove for 12 steps + a snare roll.
- A breakdown that drops drums entirely felt like a hole; half-time single hits (kick + snare slices) kept it heavy.
