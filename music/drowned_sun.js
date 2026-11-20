// "The Drowned Sun" v5 (no Think break: its vocal shouts don't belong): the final boss theme, written again from a blank page. Original composition.
// F# minor, 178 BPM, ~3:10. Built from what the reference does (not its notes): an Andalusian-style descent
// (i - VII - VI - V), flowing 16th-note runs, galloping octave bass, staccato chord stabs at the climax,
// a lift up a half step into G minor for the final stretch, and an ending on one low, heavy note.
// Pitched parts are recorded by tools/guitar_stems.py: sampled instruments (MuseScore General via FluidSynth),
// every guitar re-amped through an overdrive, Guitarix JCM800 + DS-1 and a 4x12 cabinet curve.
// Drums: at most two breakbeats from the pack at any moment, pitched from 160 to 178 BPM.
const BPM = 178, STEP = 60 / BPM / 4, BAR = STEP * 16;
const SECTIONS = [['intro', 8], ['a1', 16], ['b1', 16], ['brk', 8], ['a2', 16], ['clx', 16], ['inter', 8], ['a3', 16], ['b3', 12], ['coda', 8], ['outro', 6]];
const LEN = Object.fromEntries(SECTIONS), START = {}; { let g = 0; for (const [n, l] of SECTIONS) { START[n] = g; g += l; } }
const Q = { m: [0, 3, 7], M: [0, 4, 7], '7': [0, 4, 7, 10] };
// roots in octave 3 (F#3 = 54)
const Fsm = [54, 'm'], E = [52, 'M'], D = [50, 'M'], Cs = [49, 'M'], Cs7 = [49, '7'], Bm = [59, 'm'], A = [57, 'M'], G = [55, 'M'], D7 = [50, '7'];
const PROG_A = [Fsm, E, D, Cs, Bm, D, G, Cs7];        // the descent, then the dark bII (G) before the dominant
const PROG_B = [D, A, E, Fsm, Bm, Fsm, G, Cs7];
const PROG_BRK = [Fsm, Fsm, G, Cs];
const PROG_CLX = [Fsm, Fsm, D, D, Bm, Bm, Cs, Cs7];
const CODA_P = [[54, 'm'], [54, 'm'], [50, 'M'], [50, 'M'], [59, 'm'], [59, 'm'], [55, 'M'], [49, '7']];
const PROG_INT = [Fsm, D, Bm, Cs, Fsm, D, Cs7, D7];   // D7 pivots into G minor
// melodies: [16th step, midi, length in 16ths]
const THEME_A = [
  [[0, 73, 4], [4, 78, 4], [8, 76, 2], [10, 78, 2], [12, 81, 4]],
  [[0, 80, 6], [6, 76, 2], [8, 71, 4], [12, 76, 4]],
  [[0, 78, 4], [4, 74, 2], [6, 78, 2], [8, 81, 6], [14, 83, 2]],
  [[0, 80, 8], [8, 77, 4], [12, 73, 4]],
  [[0, 74, 4], [4, 78, 4], [8, 83, 4], [12, 81, 2], [14, 78, 2]],
  [[0, 81, 6], [6, 78, 2], [8, 74, 4], [12, 69, 4]],
  [[0, 71, 4], [4, 74, 4], [8, 79, 6], [14, 78, 2]],
  [[0, 77, 4], [4, 80, 4], [8, 83, 4], [12, 80, 2], [14, 77, 2]],
];
const BRK_LEAD = [[[0, 78, 16]], [[0, 76, 8], [8, 73, 8]], [[0, 79, 12], [12, 78, 4]], [[0, 77, 16]]];
// climax: staccato stabs on a dotted grid, the top voice moving
const STAB = [0, 3, 6, 8, 11, 14];
const CLX_TOP = [[81, 80, 78, 81, 85, 81], [83, 81, 80, 78, 76, 78], [81, 78, 74, 78, 81, 86], [85, 83, 81, 78, 81, 83],
  [83, 78, 74, 78, 83, 86], [85, 83, 81, 83, 85, 86], [85, 80, 77, 80, 85, 89], [83, 80, 77, 73, 77, 80]];
const LO = -12;  // every lead line sits an octave lower: darker, heavier, less piercing
const SCALE = [0, 2, 3, 5, 7, 8, 10];
// Phase III run section, written out bar by bar (chords D A E F#m | Bm F#m G C#7 | D A E F#m, in F# minor before the lift)
const B3_LINE = [
  [[0, 74, 1], [1, 78, 1], [2, 81, 1], [3, 86, 1], [4, 85, 2], [6, 81, 2], [8, 78, 4], [12, 81, 4]],   // D: the motif, rising
  [[0, 73, 1], [1, 76, 1], [2, 81, 1], [3, 85, 1], [4, 83, 2], [6, 81, 2], [8, 76, 4], [12, 80, 4]],   // A: same shape
  [[0, 71, 1], [1, 76, 1], [2, 80, 1], [3, 83, 1], [4, 81, 2], [6, 80, 2], [8, 76, 4], [12, 78, 4]],   // E: same shape, leading home
  [[0, 78, 8], [8, 73, 8]],                                                                              // F#m: resolve
  [[0, 86, 3], [3, 85, 3], [6, 83, 2], [8, 81, 3], [11, 83, 3], [14, 78, 2]],                            // Bm: call (stab rhythm)
  [[0, 78, 3], [3, 80, 3], [6, 81, 2], [8, 85, 3], [11, 83, 3], [14, 81, 2]],                            // F#m: answer
  [[0, 86, 1], [1, 85, 1], [2, 83, 1], [3, 81, 1], [4, 79, 2], [6, 78, 2], [8, 79, 4], [12, 83, 4]],   // G (bII): a dark fall
  [[0, 80, 2], [2, 77, 2], [4, 80, 2], [6, 83, 2], [8, 85, 6], [14, 83, 2]],                            // C#7: tension
  [[0, 81, 2], [2, 86, 2], [4, 85, 2], [6, 86, 2], [8, 90, 8]],                                          // D: the high point (bent)
  [[0, 88, 6], [6, 85, 2], [8, 81, 8]],                                                                  // A: coming down
  [[0, 83, 1], [1, 81, 1], [2, 80, 1], [3, 78, 1], [4, 76, 1], [5, 74, 1], [6, 73, 1], [7, 71, 1],
   [8, 73, 2], [10, 76, 2], [12, 80, 2], [14, 83, 2]],                                                   // E: fall, then climb back
  [[0, 85, 8], [8, 78, 8]],                                                                              // F#m: home
];
const B3_TWIN = [3, 4, 5, 7, 8, 9, 11];
// coda: the main theme returns broadened (every note twice as long) as the band settles, then a dark bII and the
// dominant lead into the final fall. Chords (F# minor, played in G minor): F#m F#m D D | Bm Bm G C#7
const CODA_LINE = [
  [[0, 73, 8], [8, 78, 8]], [[0, 76, 4], [4, 78, 4], [8, 81, 8]],     // theme bar 1, broadened
  [[0, 78, 8], [8, 74, 4], [12, 78, 4]], [[0, 81, 12], [12, 83, 4]],   // theme bar 3, broadened
  [[0, 74, 16]], [[0, 73, 8], [8, 71, 8]],                             // settling: D, then C# - B
  [[0, 74, 8], [8, 71, 8]], [[0, 77, 8], [8, 80, 8]],                  // bII (G): D - B; dominant: E# - G#
];   // the harmony guitar doubles the held and stab bars, not the runs  // natural minor from the tonic
const RUNS = [[1, 2, 1, 3, 2, 1, 2, 0, 1, 0, 1, 2], [0, 1, 2, 3, 2, 3, 4, 3, 2, 1, 2, 1], [3, 2, 1, 2, 0, 1, 0, -1, 0, 1, 2, 3]];

function bars() {
  const out = []; let gi = 0;
  for (const [sec, n] of SECTIONS) for (let b = 0; b < n; b++, gi++) {
    let ch, tr = 0;
    if (sec === 'intro' || sec === 'a1' || sec === 'a2') ch = PROG_A[b % 8];
    else if (sec === 'b1') ch = PROG_B[b % 8];
    else if (sec === 'brk') ch = PROG_BRK[b % 4];
    else if (sec === 'clx') ch = PROG_CLX[b % 8];
    else if (sec === 'inter') ch = PROG_INT[b];
    else if (sec === 'a3') { ch = PROG_A[b % 8]; tr = 1; }
    else if (sec === 'b3') { ch = PROG_B[b % 8]; tr = 1; }
    else if (sec === 'coda') { ch = CODA_P[b]; tr = 1; }
    else { ch = Fsm; tr = 1; }
    out.push({ sec, b, gi, t0: gi * BAR, ch, tr, notes: Q[ch[1]].map(i => ch[0] + i + tr) });
  }
  return out;
}
const gRoot = (c, tr) => 40 + ((c[0] + tr - 40) % 12);   // lowest playable power chord (E2..D#3)
const below = (m, notes) => { for (let k = m - 3; k > m - 6; k--) if (notes.some(n => (n - k) % 12 === 0)) return k; return m - 4; };
const voicing = (notes, base) => notes.map(n => base + ((n - base) % 12 + 12) % 12).sort((a, b) => a - b);
// a flowing 16th run over the chord: chord tones from `base` upward, indexed by a figure
function run(notes, base, fig) {
  const tones = voicing(notes, base); const ext = [tones[tones.length - 1] - 12, ...tones, ...tones.map(t => t + 12)];
  return fig.map(i => ext[Math.max(0, Math.min(ext.length - 1, i + 1))]);
}

// ---------------- every pitched part, recorded by tools/guitar_stems.py ----------------
function guitarEvents() {
  const P = { rhythm: [], bass: [], lead: [], harm: [], piano: [], strings: [], low: [], brass: [], organ: [], timp: [] };
  const note = (arr, t, m, len, vel, art) => arr.push([t, m, len, vel, art || 'open']);
  const chord = (arr, t, notes, len, vel) => notes.forEach(n => note(arr, t, n, len, vel));
  const pc = (t, root, len, art, vel) => { for (const n of [root, root + 7, root + 12]) P.rhythm.push([t, n, len, vel, art]); };
  const pat = (t0, root, PT, bassOct) => PT.forEach(([s, l, art]) => {
    pc(t0 + s * STEP, root, l * STEP * 0.95, art, art === 'open' ? 120 : 106);
    P.bass.push([t0 + s * STEP, root - 12 + (bassOct && s % 4 === 2 ? 12 : 0), l * STEP * 0.95, art === 'open' ? 112 : 98, 'open']);
  });
  // pitch bends, used sparingly: every other bar the longest held note is bent up into pitch,
  // and every fourth bar the phrase's last note sags down as it ends
  // ornaments for the main theme: grace notes, short trills and turns, a few more each time the theme returns
  // (orn 1..3), always resolving to the written note so the melody keeps its shape. Neighbours come from the key,
  // with the chord's own tones taking priority (E# over E on C#).
  const neighbours = (m, tr, notes) => {
    const cp = notes.map(n => ((n % 12) + 12) % 12), sc = SCALE.map(x => (x + 6 + tr) % 12)
      .filter(p => !cp.some(c => sc0(c, tr) && Math.abs(((c - p + 18) % 12) - 6) === 5 && c !== p)).concat(cp);
    const ok = n => sc.indexOf(((n % 12) + 12) % 12) >= 0;
    let up = m + 1; while (!ok(up)) up++; let dn = m - 1; while (!ok(dn)) dn--;
    return [up, dn];
  };
  const sc0 = (c, tr) => SCALE.map(x => (x + 6 + tr) % 12).indexOf(c) < 0;   // a chord tone outside the key (raised 7th)
  // Ornaments: grace notes only (acciaccaturas), placed by hand on the notes that carry the phrase.
  // Each is a quick neighbour played just BEFORE the beat (it borrows time from the previous note), so the main
  // note keeps its weight. It follows the line: a note the melody climbs to is approached from a step below,
  // a note it falls to from a step above. No trills (they cluttered the line). 3 / 5 / 4 per theme statement.
  const melody = (t0, line, tr, notes, twin, orn) => {
    const gi = Math.round(t0 / BAR), longest = line.reduce((a, n, i) => n[2] > line[a][2] ? i : a, 0);
    line.forEach(([s, m, l], i) => {
      const kind = (orn || []).filter(o => o[0] === i).map(o => o[1])[0];
      const bend = !kind && gi % 2 === 0 && i === longest && l >= 6, rel = gi % 4 === 3 && i === line.length - 1 && l >= 4;
      const art = bend && rel ? 'bendrel' : bend ? 'bend' : rel ? 'release' : 'lead';
      const mm = m + tr + LO, t = t0 + s * STEP;
      if (twin) note(P.harm, t, below(mm, notes), l * STEP * 0.97, 106, art);
      if (!kind) { note(P.lead, t, mm, l * STEP * 0.97, 114, art); return; }
      const [up, dn] = neighbours(mm, tr, notes);
      {  // grace: before the beat; the previous lead note gives up the time
        const q = STEP * 0.7, prev = P.lead[P.lead.length - 1];
        const fromAbove = prev && prev[1] > mm;
        if (prev && prev[0] < t - q && prev[0] + prev[2] > t - q) prev[2] = t - q - prev[0] - 0.004;
        note(P.lead, t - q, fromAbove ? up : dn, q * 0.92, 104, 'open');
        note(P.lead, t, mm, l * STEP * 0.97, 116, art);
      }
    });
  };
  const runBar = (t0, notes, fig, twin, base) => {
    const r = run(notes, (base || 73) + LO, RUNS[fig % RUNS.length]);
    r.forEach((m, i) => { note(P.lead, t0 + i * STEP, m, STEP * 1.02, 120 + (i % 4 === 0 ? 7 : 0), 'open'); if (twin) note(P.harm, t0 + i * STEP, below(m, notes), STEP * 0.92, 98, 'open'); });
    const last = r[r.length - 1];
    note(P.lead, t0 + 12 * STEP, last + (fig % 2 ? 3 : 2), STEP * 1.9, 112, 'lead'); note(P.lead, t0 + 14 * STEP, last, STEP * 1.9, 112, 'lead');
  };
  const scaleDown = (t0, top, tr, n, s0) => { // a descending minor-scale run in 16ths from `top`
    const pcs = SCALE.map(x => (x + 6 + tr) % 12); let m = top + LO;
    for (let i = 0; i < n; i++) { note(P.lead, t0 + (s0 + i) * STEP, m, STEP * 1.02, 122, 'open'); do m--; while (pcs.indexOf(((m % 12) + 12) % 12) < 0); }
  };
  const pianoBar = (t0, notes, ch, tr, vel, busy) => {
    const r = ch[0] + tr - 24; note(P.piano, t0, r, BAR * 0.98, vel); note(P.piano, t0, r + 12, BAR * 0.98, vel - 8);
    if (busy) run(notes, 66, RUNS[(t0 / BAR | 0) % 3]).forEach((m, i) => note(P.piano, t0 + i * STEP, m, STEP * 1.5, vel - 18 + (i % 4 ? 0 : 10)));
    else voicing(notes, 66).concat([voicing(notes, 66)[1] + 12]).forEach((m, i) => note(P.piano, t0 + i * 4 * STEP, m, STEP * 4, vel - 12));
  };
  const timp = (t, ch, tr, v) => note(P.timp, t, 30 + ((ch[0] + tr - 30) % 12), STEP * 3, v);
  // riffs (16th grid): [step, length, articulation]
  const CHUG = [[0, 3, 'open'], [3, 1, 'mute'], [4, 1, 'mute'], [5, 1, 'mute'], [6, 2, 'open'], [8, 1, 'mute'], [9, 1, 'mute'], [10, 2, 'open'], [12, 1, 'mute'], [13, 1, 'mute'], [14, 2, 'open']];
  const CHUG_END = [[0, 3, 'open'], [3, 1, 'mute'], [4, 1, 'mute'], [6, 2, 'open'], [8, 4, 'open'], [12, 4, 'open']];
  const GALLOP = [0, 4, 8, 12].flatMap(b => [[b, 2, b % 8 === 0 ? 'open' : 'mute'], [b + 2, 1, 'mute'], [b + 3, 1, 'mute']]);
  const BREAKDOWN = [[0, 4, 'open'], [6, 1, 'mute'], [7, 1, 'mute'], [10, 3, 'open'], [14, 1, 'mute'], [15, 1, 'mute']];
  const DRIVE = [0, 2, 4, 6, 8, 10, 12, 14].map(s => [s, 2, s % 4 === 0 ? 'open' : 'mute']).concat([[3, 1, 'mute'], [11, 1, 'mute']]);
  const STABS = STAB.map((s, i) => [s, i === 5 ? 2 : (STAB[i + 1] - s), 'open']).flatMap(([s, l]) => [[s, 1, 'open']].concat(l > 1 ? [[s + 1, 1, 'mute']] : []).concat(l > 2 ? [[s + 2, 1, 'mute']] : []));
  const EIGHTHS = [0, 2, 4, 6, 8, 10, 12, 14].map(s => [s, 2, 'mute']);
  for (const x of bars()) {
    const { sec, b, t0, ch, tr, notes } = x, r = gRoot(ch, tr), low = voicing(notes, 43), str = voicing(notes, 55), at = s => t0 + s * STEP;
    const strings = (v, oct) => chord(P.strings, t0, oct ? str.concat([str[0] + 12]) : str, BAR, v);
    const lowStr = v => chord(P.low, t0, [ch[0] + tr - 24, ch[0] + tr - 12], BAR, v);
    if (sec === 'intro') { // the piano alone with low strings, then the band joins at bar 5
      pianoBar(t0, notes, ch, tr, 92, b >= 2);
      lowStr(84 + b * 3); chord(P.organ, t0, low, BAR, 66 + b * 4);
      if (b >= 2) strings(70 + b * 4);
      if (b % 2 === 0 || b >= 4) timp(t0, ch, tr, 82 + b * 5);
      if (b >= 4 && b < 7) { pc(t0, r, STEP * 7.5, 'open', 116); pc(at(8), r, STEP * 7.5, 'open', 112); P.bass.push([t0, r - 12, BAR * 0.98, 110, 'open']); melody(t0, THEME_A[b - 4], 0, notes, false);
        if (b === 6) { // the phrase's last two notes hold into each other, and the last one rings on until the falling run
          const n = P.lead.length; P.lead[n - 2][2] = STEP * 6 + 0.012; P.lead[n - 1][2] = STEP * 8 + 0.012; } }
      if (b === 7) { pc(t0, r, STEP * 5.5, 'open', 118); for (let s = 6; s < 16; s++) pc(at(s), r, STEP * 0.9, 'mute', 92 + s * 2); P.bass.push([t0, r - 12, BAR * 0.98, 110, 'open']); scaleDown(t0, 85, 0, 10, 6); }
    } else if (sec === 'a1' || sec === 'a2' || sec === 'a3') { // the main theme
      const twin = sec !== 'a1' || b >= 8;
      pat(t0, r, b % 8 === 7 ? CHUG_END : (sec === 'a2' ? DRIVE : CHUG), sec === 'a2');
      // grace-note plan per section bar: [note index] -> the theme notes reached by a leap or a fall
      // (theme bar.note: 0.4 A, 1.2 B falling, 2.3 A, 3.0 G# falling, 4.2 B, 5.0 A, 6.2 G)
      const g = i => [[i, 'grace']];
      const orn = ({ a1: { 2: g(3), 10: g(3), 12: g(2) },
                     a2: { 0: g(4), 3: g(0), 6: g(2), 10: g(3), 13: g(0) },
                     a3: { 1: g(2), 4: g(2), 8: g(4), 14: g(2) } }[sec] || {})[b];
      if (b % 8 === 7 && b === 15) { melody(t0, THEME_A[7].slice(0, 2), tr, notes, twin, orn); scaleDown(t0, 85 + tr, tr, 8, 8); }
      else melody(t0, THEME_A[b % 8], tr, notes, twin, orn);
      // drops stay lean: guitars, bass, lead and drums carry them; strings sit an octave up, brass only marks phrases
      chord(P.strings, t0, str.map(n => n + 12), BAR, 72);
      if (b % 4 === 0) { timp(t0, ch, tr, 108); chord(P.brass, t0, str, STEP * 3, 104); }
    } else if (sec === 'b3') { // Phase III runs: one written 12-bar phrase (F# minor shapes, played a half step up in G minor)
      const line = B3_LINE[b], stabs = b === 4 || b === 5;
      pat(t0, r, stabs ? STABS : b === 3 || b === 7 || b === 11 ? CHUG_END : b === 9 ? DRIVE : GALLOP, true);   // guitars lock to the lead
      melody(t0, line, tr, notes, B3_TWIN.indexOf(b) >= 0);
      chord(P.strings, t0, str.map(n => n + 12), BAR, 72);
      if (b % 2 === 0) chord(P.brass, t0, str, STEP * 2, 110);
      if (b % 4 === 0) timp(t0, ch, tr, 112);
      if (b === LEN.b3 - 1) for (let s = 8; s < 16; s++) note(P.timp, at(s), 31, STEP, 90 + s * 3);
    } else if (sec === 'b1') { // flowing 16th runs over the gallop
      pat(t0, r, GALLOP, true);
      if (b % 4 === 3) { const v = voicing(notes, 73); melody(t0, [[0, v[2], 8], [8, v[1], 8]], 0, notes, true); }   // two half notes
      else runBar(t0, notes, b, b >= 8);
      chord(P.strings, t0, str.map(n => n + 12), BAR, 70);
      if (b % 2 === 0) chord(P.brass, t0, str, STEP * 2, 100);
      if (b % 4 === 0) timp(t0, ch, tr, 112);
    } else if (sec === 'brk') { // half-time breakdown, low and heavy
      pat(t0, b < 2 ? 42 : r, BREAKDOWN); melody(t0, BRK_LEAD[b % 4], 0, notes, true);
      chord(P.brass, t0, low, STEP * 6, 118); chord(P.brass, at(10), low, STEP * 4, 110);
      timp(t0, ch, tr, 122); timp(at(10), ch, tr, 112);
      lowStr(104); chord(P.organ, t0, low, BAR, 96);
    } else if (sec === 'clx') { // staccato chord stabs, everyone on the same rhythm
      pat(t0, r, STABS, true);
      const top = CLX_TOP[b % 8];
      STAB.forEach((s, i) => { const m = top[i] + tr + LO, len = ((STAB[i + 1] == null ? 16 : STAB[i + 1]) - s) * STEP + 0.012;   // legato: ring into the next note
        note(P.lead, at(s), m, len, 120, 'legato'); note(P.harm, at(s), below(m, notes), len, 106, 'legato');
        if (i === 0 || i === 3) chord(P.brass, at(s), str, STEP * 1.5, 112); });
      chord(P.strings, t0, str.map(n => n + 12), BAR, 76);
      if (b % 2 === 0) timp(t0, ch, tr, 118);
    } else if (sec === 'inter') { // the storm drops to piano and muted guitars, then climbs into G minor
      pianoBar(t0, notes, ch, tr, 96, true);
      pat(t0, r, b === 7 ? DRIVE : EIGHTHS);
      lowStr(84 + b * 3);
      if (b >= 4) { const v = voicing(notes, 73); melody(t0, b === 7 ? [[0, 74, 8], [8, 78, 4], [12, 81, 4]] : [[0, v[0], 8], [8, v[1], 8]], 0, notes, b >= 6); }
      if (b >= 6) for (let s = 0; s < 16; s += 4) timp(at(s), ch, tr, 90 + b * 4 + s);
    } else if (sec === 'coda') { // the band settles: ringing chords and half-time first, then piano and long notes
      melody(t0, CODA_LINE[b], tr, notes, b < 4 || b >= 6);
      if (b < 4) { pc(t0, r, STEP * 7.6, 'open', 118 - b * 2); pc(at(8), r, STEP * 7.6, 'open', 112 - b * 2); P.bass.push([t0, r - 12, BAR * 0.98, 110, 'open']); }
      else { pc(t0, r, STEP * 15.6, 'open', 104 - (b - 4) * 4); P.bass.push([t0, r - 12, BAR * 0.98, 100 - (b - 4) * 4, 'open']); }
      if (b >= 4) pianoBar(t0, notes, ch, tr, 88, false);                       // the intro's piano returns
      chord(P.strings, t0, str.concat([str[0] + 12]), BAR, 84); chord(P.organ, t0, low, BAR, 80 + b * 2); lowStr(96);
      if (b === 0 || b === 4) chord(P.brass, t0, str, STEP * 8, 104);
      if (b % 2 === 0 && b < 7) timp(t0, ch, tr, 104);
      if (b === 7) for (let s = 0; s < 16; s++) note(P.timp, at(s), 31, STEP, 70 + s * 3);   // a roll that swells into the end
    } else if (b === 0) { // outro: G minor; the lead falls two octaves and everything lands on one low G
      pc(t0, 43, STEP * 3, 'open', 124); for (let s = 3; s < 16; s++) pc(at(s), 43, STEP * 0.9, s % 4 === 0 ? 'open' : 'mute', 110);
      P.bass.push([t0, 31, BAR * 0.98, 116, 'open']);
      [79, 77, 74, 70, 67, 65, 62, 58].forEach((m, i) => { note(P.lead, at(i * 2), m, STEP * 2 + 0.012, 116, 'legato'); note(P.harm, at(i * 2), m - 5, STEP * 2 + 0.012, 106, 'legato'); });   // legato fall into the last note
      chord(P.organ, t0, [43, 50, 55], BAR, 100); chord(P.strings, t0, [55, 58, 62], BAR, 96); chord(P.low, t0, [31, 43], BAR, 110); timp(t0, [43], 0, 124);
      const tEnd = t0 + BAR; // the final low note
      pc(tEnd, 43, BAR * 4.4, 'open', 126); P.bass.push([tEnd, 31, BAR * 4.4, 120, 'open']);
      note(P.lead, tEnd, 55, BAR * 4.4, 118, 'lead'); note(P.harm, tEnd, 43, BAR * 4.4, 110, 'lead');
      chord(P.organ, tEnd, [31, 43, 50], BAR * 4.8, 108); chord(P.low, tEnd, [31, 43], BAR * 4.8, 116); chord(P.brass, tEnd, [43, 50, 55], BAR * 2, 118);
      note(P.piano, tEnd, 31, BAR * 4.8, 110); note(P.piano, tEnd, 19, BAR * 4.8, 110); note(P.timp, tEnd, 31, BAR, 127);
    }
  }
  const quick = n => n[4] === 'open' && n[2] < STEP * 2.5;
  // one lead guitar plays everything; quick notes are cleanly separated (no overlap) so each pitch speaks
  P.lead = P.lead.map(n => quick(n) ? [n[0], n[1], Math.min(n[2], STEP * 0.95), n[3], 'open'] : n); P.harm = P.harm.filter(n => !quick(n));
  const part = (notes, o) => Object.assign({ sf: 'musescore', amp: 'none', humanize: 3, notes }, o);
  return { bpm: BPM, parts: {
    rhythmL: part(P.rhythm, { amp: 'rhythm', humanize: 6, release: -1400 }),   // release: ~45 ms tails (was ~200)
    // the right guitar is a different take: looser timing and dynamics, and a root-fifth voicing (no octave),
    // so the two hard-panned guitars stay distinct and the mix opens up
    rhythmR: part(P.rhythm.filter(n => !P.rhythm.some(o => o[0] === n[0] && o[1] === n[1] - 12)), { amp: 'rhythm', humanize: 9, velvar: 10, cents: 8, release: -1400 }),
    bass: part(P.bass, { program: 34, amp: 'bass', humanize: 3, release: -1400 }),
    lead: part(P.lead, { amp: 'lead', humanize: 4, lag: 3, velvar: 6, release: -1800 }),   // ~25 ms tails: fast notes stay clean   // human: -1..+7 ms, a little dynamic variation
    harmony: part(P.harm, { amp: 'lead', humanize: 4, lag: 6, velvar: 6, cents: -5, release: -1800 }),
    piano: part(P.piano, { program: 0, humanize: 6 }),
    strings: part(P.strings, { program: 48 }),
    low: part(P.low, { program: 43 }),
    brass: part(P.brass, { program: 61, humanize: 4 }),
    organ: part(P.organ, { program: 19 }),
    timp: part(P.timp, { program: 47, humanize: 2 }),
  } };
}

// ---------------- the mix ----------------
async function renderSong() {
  const SR = 44100;
  const rand = (() => { let s = 5050; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const BARS = bars(), totalBars = BARS.length, dur = totalBars * BAR + 1.5;
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * dur), SR);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -9; comp.ratio.value = 1.6; comp.attack.value = 0.015; comp.release.value = 0.15; // gentle glue: lets drum hits through
  const master = ctx.createGain(); master.gain.value = 0.8;
  const lowShelf = ctx.createBiquadFilter(); lowShelf.type = 'lowshelf'; lowShelf.frequency.value = 80; lowShelf.gain.value = -3;
  const dark = ctx.createBiquadFilter(); dark.type = 'highshelf'; dark.frequency.value = 6000; dark.gain.value = -3;
  const mride = ctx.createGain(); master.connect(mride); mride.connect(lowShelf); lowShelf.connect(dark); dark.connect(comp); comp.connect(ctx.destination);   // mride: whole-mix level shaping
  const dry = ctx.createGain(); dry.connect(master);
  const verb = ctx.createConvolver();
  { const len = SR * 3.2, ir = ctx.createBuffer(2, len, SR); for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, 2.4); } verb.buffer = ir; }
  const verbOut = ctx.createGain(); verbOut.gain.value = 0.4; const verbLP = ctx.createBiquadFilter(); verbLP.type = 'lowpass'; verbLP.frequency.value = 5000;
  verb.connect(verbLP); verbLP.connect(verbOut); verbOut.connect(master);
  // ping-pong echo: input -> left echo -> right echo -> (fed back, quieter) -> left ... ; one loop, gain 0.35 < 1
  const delay = ctx.createDelay(2); delay.delayTime.value = STEP * 3;
  const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2400; dlp.Q.value = 0;
  const delay2 = ctx.createDelay(2); delay2.delayTime.value = STEP * 3; const fb = ctx.createGain(); fb.gain.value = 0.35;
  const dL = ctx.createStereoPanner(); dL.pan.value = -0.8; const dR = ctx.createStereoPanner(); dR.pan.value = 0.8;
  const dOut = ctx.createGain(); dOut.gain.value = 0.6;
  delay.connect(dlp); dlp.connect(dL); dL.connect(dOut); dlp.connect(delay2); delay2.connect(dR); dR.connect(dOut); dOut.connect(master);
  delay2.connect(fb); fb.connect(delay);
  const send = (node, v, alsoDelay) => { const g = ctx.createGain(); g.gain.value = v; node.connect(g); g.connect(verb); if (alsoDelay) g.connect(delay); };
  const noise = (() => { const b = ctx.createBuffer(1, SR * 2, SR), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1; return b; })();
  const has = n => (window.ASSET_NAMES || []).indexOf(n) >= 0;

  // ---- recorded stems, each levelled to a target loudness (dB RMS while playing) ----
  // every part gets its own frequency slot (EQ), and the low end ducks under each kick (sidechain-style)
  const ducks = [];   // [gainNode, depth]
  function eqChain(src, eq) {
    let n = src;
    for (const [type, f, g, q] of eq || []) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (g != null) b.gain.value = g; b.Q.value = q || 0.7; n.connect(b); n = b; }
    return n;
  }
  const RIDE = {}; let DRUM_DB = () => 0;
  // level changes never jump: every change glides over the bar before the downbeat it belongs to (a section boundary is always at least 2 bars from the next, so glides never overlap)
  function glide(param, a, c, b) {
    if (a === c) return; const v = d => Math.pow(10, d / 20), t = b * BAR, half = BAR * 2;   // two-bar glides
    param.setValueAtTime(v(a), t - half); param.linearRampToValueAtTime(v(c), t);   // the change happens over the two bars before
  }   // per-part level riding (automation), on top of the static levels
  const GUITARS = ['rhythmL', 'rhythmR', 'bass', 'lead', 'harmony'];
  async function stem(name, pan, targetDb, verbAmt, useDelay, eq, duck) {
    if (!has('stem/' + name)) return;
    const buf = await loadAsset('stem/' + name, ctx), d = buf.getChannelData(0);
    let sum = 0, n = 0; for (let i = 0; i < d.length; i += 4) { const a = Math.abs(d[i]); if (a > 1e-3) { sum += a * a; n++; } }
    const rms = Math.sqrt(sum / Math.max(1, n)) || 1e-3, src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = Math.pow(10, targetDb / 20) / rms; const p = ctx.createStereoPanner(); p.pan.value = pan;
    src.connect(g); let out = eqChain(g, eq);
    if (GUITARS.indexOf(name) >= 0) { // the guitars arrive softly at bar 5 and swell to full level as the main theme starts (bar 9)
      const f = ctx.createGain(); f.gain.setValueAtTime(Math.pow(10, -14 / 20), 0); f.gain.setValueAtTime(Math.pow(10, -14 / 20), 4 * BAR);
      f.gain.exponentialRampToValueAtTime(1, 8 * BAR); out.connect(f); out = f;
    }
    if (duck) { const dg = ctx.createGain(); out.connect(dg); out = dg; ducks.push([dg, duck]); }
    const ride = ctx.createGain(); RIDE[name] = ride; out.connect(ride); out = ride;
    out.connect(p); p.connect(dry); send(p, verbAmt, useDelay); src.start(0);
  }
  const HP = f => ['highpass', f, null, 0.7], LP = f => ['lowpass', f, null, 0.7], PK = (f, g, q) => ['peaking', f, g, q || 1];
  // rhythm guitars: 100 Hz up, scooped where bass/snare live (350) and where the lead sings (1.8-2.5k)
  const GTR = [HP(100), PK(350, -3, 1.1), PK(2000, -3.5, 1.4), PK(3500, 2.5, 1), LP(9000)];
  await stem('rhythmL', -1, -13.5, 0.02, false, GTR, 0.12);
  await stem('rhythmR', 1, -13.5, 0.02, false, GTR, 0.12);
  // bass: owns 45-250 Hz under the guitars; the sub synth owns the very bottom
  await stem('bass', 0, -20, 0, false, [HP(45), PK(350, -3, 1), PK(900, 2, 1), LP(2600)], 0.28);   // light kick ducking: tight, no pumping
  // lead: on top, with presence where the rhythm guitars were scooped
  await stem('lead', 0.0, -12.5, 0.14, true, [HP(110), PK(700, 1.5, 0.9), PK(1900, 1, 1), LP(6500)]);   // heavy body, a touch of presence
  await stem('harmony', 0.55, -25.5, 0.2, true, [HP(260), PK(2000, 1.5, 0.9), LP(6000)]);
  await stem('piano', -0.3, -21, 0.4, false, [HP(110)]);
  await stem('strings', 0.65, -27, 0.45, false, [HP(320), ['highshelf', 6000, 3, 0.7], LP(14000)]);   // a little air
  await stem('low', 0, -24, 0.2, false, [LP(500)], 0.4);
  await stem('brass', -0.55, -24, 0.3, false, [HP(180)]);
  await stem('organ', -0.45, -27, 0.45, false, [HP(120)]);
  await stem('timp', 0, -21, 0.3, false, [HP(45), PK(300, -2, 1)]);

  // riding the faders, bar by bar:
  //  - where the lead plays mostly fast notes, the rhythm guitars step back so runs, trills and stabs read clearly
  //  - in Phase III (the G minor return, bars 89-120) the wall is bigger, so the rhythm guitars sit lower and the lead higher
  {
    const p3 = b => b >= START.a3 && b < START.outro, db = v => Math.pow(10, v / 20);
    const inter = b => b >= 80 && b < 88;
    // energy contour: pull back before the big moments so they hit harder (0-indexed bars)
    const verse = b => (b >= 24 && b < 32) || (b >= 48 && b < 56);   // run section 1st half; theme return 1st half
    const tease = b => b >= 8 && b < 16;                               // first statement of the theme
    const gtrPull = b => 0;   // pull-backs are arrangement only now (no level changes)
    const adj = { rhythmL: b => (p3(b) ? -3 : 0) + (inter(b) ? -4 : 0) + gtrPull(b), rhythmR: b => (p3(b) ? -3 : 0) + (inter(b) ? -4 : 0) + gtrPull(b),
                  lead: b => (p3(b) ? 2 : 0) + (inter(b) ? (b < START.inter + 6 ? -6 : -3) : 0), harmony: b => p3(b) ? 1 : 0,
                  piano: b => inter(b) ? 2 : 0, bass: b => inter(b) ? -2 : 0, low: b => inter(b) ? -3 : 0,
                  brass: b => verse(b) || b === 62 || b === 63 ? -60 : 0 };   // brass sits out the pull-backs   // the interlude belongs to the piano: the band steps back around it
    DRUM_DB = b => inter(b) ? -2 : (b === 62 || b === 63) ? -60 : 0;   // drums drop out for the 2 bars before the climax
    for (const k in adj) if (RIDE[k]) for (let b = 1; b < BARS.length; b++) glide(RIDE[k].gain, adj[k](b - 1), adj[k](b), b);
  }

  // ---- breaks: one per section (two at most, when a snare layer is added) ----
  const BRK = {}; for (const k of ['amen_yki', 'amen_df', 'steppin1', 'steppin2']) if (has('break/' + k)) BRK[k] = await loadAsset('break/' + k, ctx);
  const INFO = window.BREAK_INFO || {}, bStep = 60 / 160 / 4, R = BPM / 160;
  const drumBus = ctx.createGain(); drumBus.gain.value = 0.9;
  const drumBus2 = ctx.createGain(); drumBus.gain.value = 1.05;
  // drums: no boxiness at 300-400 Hz (that's the guitars' and bass's space), snap at 4-5 kHz to cut through the wall
  const drumDip = eqChain(drumBus2, [HP(35), PK(380, -4, 1), PK(4500, 1.5, 0.9), ['highshelf', 8000, 1, 0.7]]);   // cymbals keep their air
  const drumLP = ctx.createBiquadFilter(); drumLP.type = 'lowpass'; drumLP.frequency.value = 18000;
  const drumLow = ctx.createBiquadFilter(); drumLow.type = 'lowshelf'; drumLow.frequency.value = 110; drumLow.gain.value = 0;
  drumBus.connect(drumLow); drumLow.connect(drumBus2); drumDip.connect(drumLP); drumLP.connect(dry); send(drumLP, 0.05);
  { // into the interlude: the climax's last two bars ease down 2.5 dB, then the thinner interlude gets a small lift so it
    // sits about 3.5 dB under the rest; its last two bars swell back up into Phase III
    const v = d => Math.pow(10, d / 20), a = START.inter * BAR, b = START.a3 * BAR;
    mride.gain.setValueAtTime(1, a - 2 * BAR); mride.gain.linearRampToValueAtTime(v(-2.5), a);
    mride.gain.setValueAtTime(v(1.5), a); mride.gain.setValueAtTime(v(1.5), b - 2 * BAR); mride.gain.linearRampToValueAtTime(v(3), b - 0.05);
    mride.gain.linearRampToValueAtTime(1, b); }
  for (let b = 1; b < BARS.length; b++) {   // drum level per bar (energy contour + the interlude)
    glide(drumBus2.gain, DRUM_DB(b - 1), DRUM_DB(b), b);
  }
  const DLOG = { break: [], layer: [], kick: [] };   // drum hits, for the visualizer
  function slice(name, t, idx, len, rate, vol, quiet) {
    const buf = BRK[name]; if (!buf) return;
    if (!quiet) DLOG[name === 'steppin1' ? 'layer' : 'break'].push([t, Math.min(len, 2) * STEP * 0.8, idx % 12]);
    const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    const g = ctx.createGain(), d = len * bStep / rate, v = vol == null ? 1 : vol;
    g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + Math.max(0.005, d - 0.008)); g.gain.linearRampToValueAtTime(0, t + d);
    src.connect(g); g.connect(drumBus); src.start(t, idx * bStep, len * bStep); src.stop(t + d + 0.01);
  }
  const groove = (name, t0, loopBar, vol, len) => { if (!INFO[name]) return; const i0 = (loopBar % (INFO[name].steps / 16)) * 16;
    slice(name, t0, i0, len || 16, R, vol, true); for (let k = 0; k < (len || 16); k += 2) DLOG.break.push([t0 + k * STEP, STEP * 1.6, (i0 + k) % 12]); };
  const roll = (name, t, steps, n, p0, p1, v0, v1) => { for (let k = 0; k < n; k++) { const f = k / Math.max(1, n - 1); slice(name, t + k * steps * STEP / n, INFO[name].snare, steps / n, R * (p0 + (p1 - p0) * f), v0 + (v1 - v0) * f); } };
  const fillBar = (name, t0, b, big) => { groove(name, t0, b, 1, 12); roll(name, t0 + 12 * STEP, 4, big ? 8 : 4, 1, 1.25, 0.55, 0.95); };

  // ---- a little synthesis for weight: sub, kick punch, impacts, risers ----
  function hit(t, f0, f1, d, v, dest) { const o = ctx.createOscillator(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d * 0.7);
    const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(g); g.connect(dest || drumBus); o.start(t); o.stop(t + d + 0.02); }
  function nz(t, d, type, f, q, v, dest, attack) { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); if (attack) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + attack); } else g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + d); s.connect(fl); fl.connect(g); g.connect(dest || drumBus); s.start(t, rand()); s.stop(t + d + 0.02); return fl; }
  const kick = (t, v) => { hit(t, 150, 50, 0.2, 0.7 * v); hit(t, 70, 42, 0.32, 0.45 * v); duck(t, v); DLOG.kick.push([t, STEP, 60]); };
  function duck(t, v) { // the bass, sub and rhythm guitars dip for ~120 ms so every kick lands clean
    for (const [g, depth] of ducks) { const k = 1 - depth * Math.min(1, v); g.gain.setTargetAtTime(k, t, 0.003); g.gain.setTargetAtTime(1, t + 0.03, 0.06); }
  }
    function impact(t, v) { hit(t, 90, 28, 1.0, 0.6 * v, master); }
  function riser() {}  // removed: noise sweeps aren't instruments
  const subBus = ctx.createGain(); subBus.gain.value = 0.5; const subDuck = ctx.createGain(); subBus.connect(subDuck); subDuck.connect(dry); ducks.push([subDuck, 0.3]);
  function sub(t, m, len, v) { const o = ctx.createOscillator(); o.frequency.value = 440 * Math.pow(2, (m - 69) / 12); const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.setValueAtTime(v, t + len - 0.04); g.gain.linearRampToValueAtTime(0.0001, t + len); o.connect(g); g.connect(subBus); o.start(t); o.stop(t + len + 0.05); }

  for (const x of BARS) {
    const { sec, b, t0, ch, tr } = x, at = s => t0 + s * STEP, subN = 30 + ((ch[0] + tr - 30) % 12), last = b === LEN[sec] - 1;
    if (sec === 'intro') { // drums come in early (bar 3), filtered open by bar 8
      sub(t0, subN, BAR, 0.12 + 0.025 * b);
      if (b >= 2) { drumLP.frequency.setValueAtTime(300 + b * 150, t0); drumLP.frequency.linearRampToValueAtTime(b === 7 ? 18000 : 450 + b * 150, t0 + BAR); groove('amen_yki', t0, b, 0.55 + b * 0.05); }
      if (b >= 4) kick(t0, 0.8);
      if (b === 7) riser(t0 + BAR, BAR * 2, 0.08);
      continue;
    }
    if (sec === 'outro') { if (b === 0) { impact(t0, 1); groove('amen_yki', t0, 0, 1, 12); roll('amen_yki', at(12), 4, 6, 1, 1.3, 0.6, 1); kick(t0, 1); sub(t0, 31, BAR, 0.32); }
      if (b === 1) { impact(t0, 1.5); kick(t0, 1.2); hit(t0, 70, 24, 3, 0.7, master); sub(t0, 31, BAR * 4.4, 0.45); }
      continue; }
    if (sec === 'coda') {
      if (b === 0) impact(t0, 1.2);
      if (b < 4) { [0, 10].forEach(s => { kick(at(s), 1); slice('steppin1', at(s), INFO.steppin1.kick, 1, R, 0.8); });
                   slice('steppin1', at(8), INFO.steppin1.snare, 2, R * 0.9, 1.0); sub(t0, subN, BAR - 0.02, 0.3); }
      else if (b < 6) { kick(t0, 0.8); sub(t0, subN, BAR - 0.02, 0.24); }
      else sub(t0, subN, BAR - 0.02, 0.2);
      continue;
    }
    if (b === 0) impact(t0, sec === 'a3' || sec === 'clx' ? 1.4 : 1);
    else if (b % 8 === 0 && sec !== 'brk' && sec !== 'inter') impact(t0, 0.8);
    if (last && sec !== 'brk') riser(t0 + BAR, BAR, 0.06);
    if (sec === 'brk') { // single hits from Hard Steppin 1, half-time
      [0, 6, 7, 10].forEach(s => { kick(at(s), 1); slice('steppin1', at(s), INFO.steppin1.kick, 1, R, 0.85); });
      slice('steppin1', at(8), INFO.steppin1.snare, 2, R * 0.9, 1.1);
      if (b === 7) roll('steppin1', at(12), 4, 8, 1, 1.35, 0.5, 1);
      sub(t0, 30, STEP * 6, 0.42); sub(at(10), subN, STEP * 5, 0.4);
      continue;
    }
    // the Amen breaks are thin below 120 Hz next to Hard Steppin: give them the same floor
    if (b === 0) drumLow.gain.setTargetAtTime(sec === 'a1' || sec === 'a2' ? 6 : 0, t0, 0.15);   // glides, no jump
    const brk = { a1: 'amen_yki', b1: 'steppin2', a2: 'amen_df', clx: 'steppin2', inter: 'amen_df', a3: 'amen_yki', b3: 'steppin2' }[sec];
    if (sec === 'inter') { // a lighter break; opens up over the last two bars
      if (b === 0) { drumLP.frequency.setTargetAtTime(3000, t0 - BAR / 2, 0.25); drumLP.frequency.setValueAtTime(3000, t0 + BAR); drumLP.frequency.exponentialRampToValueAtTime(18000, t0 + BAR * 7.5); }   // one continuous sweep
      if (b === 7) fillBar(brk, t0, b, true); else groove(brk, t0, b, 0.85 + b * 0.02);
      if (b >= 6) kick(t0, 1);
      sub(t0, subN, BAR - 0.02, 0.22);
      continue;
    }
    if (sec === 'a1' && b === 0) drumLP.frequency.setValueAtTime(18000, t0);
    if (sec === 'b1' && b === 0) drumLP.frequency.setTargetAtTime(1800, t0, 0.15);
    if (sec === 'b1' && b === 8) drumLP.frequency.setTargetAtTime(18000, t0 - BAR / 2, 0.12);   // opens over the half bar before
    if (last) fillBar(brk, t0, b, true); else if (b % 4 === 3) fillBar(brk, t0, b, false); else groove(brk, t0, b, 1);
    if (sec === 'a3' || sec === 'b3' || sec === 'clx') { // second layer: Hard Steppin 1 snares on the backbeat
      if (b % 4 !== 3) { slice('steppin1', at(4), INFO.steppin1.snare, 1, R, 0.5); slice('steppin1', at(12), INFO.steppin1.snare, 1, R, 0.5); }
    }
    if (sec === 'clx') STAB.forEach(s => kick(at(s), s ? 0.7 : 1));
    else if (sec === 'a2' || sec === 'a3') for (let s = 0; s < 16; s += 4) kick(at(s), s ? 0.6 : 1);
    else { kick(t0, 1); kick(at(10), 0.6); }
    sub(t0, subN, BAR - 0.02, 0.3);
  }
  const end = totalBars * BAR + 1.5;
  master.gain.setValueAtTime(0.8, end - 5); master.gain.linearRampToValueAtTime(0, end);   // a long, gentle fade on the last note
  const out = await ctx.startRendering();
  const L = out.getChannelData(0), Rc = out.getChannelData(1), n = L.length, buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rc[i]));
  const norm = peak > 0 ? 0.95 / peak : 1;
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, n * 4, true);
  for (let i = 0, o = 44; i < n; i++, o += 4) { v.setInt16(o, Math.max(-1, Math.min(1, L[i] * norm)) * 32767, true); v.setInt16(o + 2, Math.max(-1, Math.min(1, Rc[i] * norm)) * 32767, true); }
  let bin = ''; const u8 = new Uint8Array(buf); for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
  return { wav: btoa(bin), seconds: dur, peak, drums: DLOG };
}
