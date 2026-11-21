// An original SOLO PIANO piece in the style of the aggressive passages of "oh, nameless sky" (AZALI; transcription by
// Kachium): its devices, never its notes - 3/4, right-hand chords with the melody on top, left-hand leaps through the
// fifth to the tenth, triplet arpeggios, octave stomps an octave down, cascades across the hands, runs into downbeats,
// rolled chords, the Neapolitan.
// Played with soul and passion (what that means, from research, made concrete):
//  - rubato: every 4-bar phrase pushes forward toward its middle and broadens into its cadence (the tempo map), a slower
//    singing section (piu lento, like the score's "Plus lent") that presses back to tempo, a ritardando coda
//  - phrasing: a crescendo/diminuendo arch inside every phrase; the melody voiced over the chords; the melody a hair ahead
//  - yearning: appoggiaturas (a dissonant note leant on, resolving down by step) at the phrase peaks
//  - the climax about two-thirds through (the theme an octave higher, the melody in octaves in both hands), then release
//  - ornaments: upward grace notes, two-note slides, rolled chords, octave flourishes (no trills)
// On the house grand (the Salamander SFZ through piano_render.py: harder keystrokes play harder-hammer recordings).
const BPM = 172, STEPS = 12, STEP = 60 / BPM / 4, BAR = STEP * STEPS;   // 3/4: 12 sixteenths per bar

// ---- harmony ----
const CH = { Em: [4, 7, 11], C: [0, 4, 7], D: [2, 6, 9], B: [11, 3, 6], B7: [11, 3, 6, 9], A: [9, 1, 4], Am: [9, 0, 4], G: [7, 11, 2],
  F: [5, 9, 0], Bm: [11, 2, 6], Cm: [0, 3, 7], E: [4, 8, 11] };
const bassOf = n => CH[n][0];
const KEY = [4, 6, 7, 9, 11, 0, 2];   // E natural minor
const ALT = { 3: 2, 1: 0, 5: 6, 10: 9, 8: 7 };   // a borrowed chord tone replaces the key note it alters: D# for D, C# for C, F for F#, G# for G
const ALTC = { Cm: { 3: 4 } };                  // ... per chord where it differs: in C minor the Eb replaces E
const barScale = n => { let s = KEY.slice(); for (const c of CH[n]) if (!s.includes(c)) { const r = ALTC[n] && ALTC[n][c] !== undefined ? ALTC[n][c] : ALT[c]; s = s.filter(k => k !== r).concat([c]); } return s; };
const into = (m, lo, hi) => { while (m < lo) m += 12; while (m > hi) m -= 12; return m; };
const PROG = {
  IN: ['Em', 'Em', 'Em', 'Em'],
  PA: ['Em', 'Cm', 'Am', 'B', 'Em', 'F', 'B7', 'Em'],        // C minor: bittersweet (the melody avoids E there)
  PA2: ['Em', 'C', 'A', 'B', 'C', 'F', 'B7', 'Em'],
  PB: ['Cm', 'D', 'Bm', 'Em', 'Am', 'D', 'G', 'B'],
  PB2: ['Cm', 'D', 'Bm', 'Em', 'A', 'F', 'B7', 'B7'],
  PL: ['Em', 'C', 'G', 'D', 'Am', 'Em', 'F', 'B7'],         // the singing section
  PL2: ['Em', 'C', 'G', 'B', 'Em', 'Am', 'B7', 'B7'],
  PC: ['Em', 'Em', 'F', 'F', 'Am', 'Am', 'B7', 'B7'],
  PE: ['C', 'F', 'B7', 'Em', 'C', 'Am', 'B7', 'Em'],
};
const SECTIONS = [['intro', 4], ['A', 16], ['B', 16], ['L', 8], ['C', 8], ['A2', 16], ['B2', 8], ['end', 8], ['hold', 2]];
const PLAN = { intro: ['IN'], A: ['PA', 'PA2'], B: ['PB', 'PB2'], L: ['PL'], C: ['PC'], A2: ['PA', 'PA2'], B2: ['PB2'], end: ['PE'], hold: [] };
const LEN = Object.fromEntries(SECTIONS), START = {}; { let g = 0; for (const [n, l] of SECTIONS) { START[n] = g; g += l; } }
const TOTAL = SECTIONS.reduce((a, x) => a + x[1], 0);
const secOf = gi => { let s = SECTIONS[0][0]; for (const [n] of SECTIONS) if (gi >= START[n]) s = n; return s; };
// ---- rubato: the tempo of every bar (start, end) ----
function barTempo(gi) {
  const sec = secOf(gi), b = gi - START[sec];
  if (sec === 'hold') return [96, 96];
  let base = BPM;
  if (sec === 'L') base = b < 4 ? 138 : 138 + (BPM - 138) * (b - 3) / 5;                // piu lento, pressing back to tempo
  if (sec === 'end') base = BPM - (BPM - 118) * Math.pow(b / 8, 1.6);                  // the ritardando coda
  if (sec === 'intro') base = b === 0 ? 150 : BPM;
  const arc = [[0.985, 1.01], [1.01, 1.035], [1.035, 1.015], [1.0, 0.93]][b % 4];   // push into the phrase, broaden its end
  const end = sec === 'end' ? BPM - (BPM - 118) * Math.pow((b + 1) / 8, 1.6) : sec === 'L' && b >= 3 ? 138 + (BPM - 138) * (b - 2) / 5 : base;
  return [base * arc[0], end * arc[1]];
}
const BRAKES = [];
const TT = []; { let t = 0; for (let gi = 0; gi < TOTAL + 1; gi++) { const [a, b] = barTempo(Math.min(gi, TOTAL - 1)), row = [t];
  for (let k = 0; k < STEPS; k++) { const bpm = a + (b - a) * (k + 0.5) / STEPS; t += 60 / bpm / 4; row.push(t); } TT.push(row); } }
function T(gi, s) { while (s >= STEPS && gi < TOTAL) { s -= STEPS; gi++; } const k = Math.floor(s), f = s - k, row = TT[gi]; return row[k] + (k < STEPS ? (row[k + 1] - row[k]) * f : 0); }
const BAR_TIMES = TT.map(r => r[0]);
const MINT = '#9cffd0';   // the video: everything mint green
const COLORS = Object.fromEntries(SECTIONS.map(([n]) => [n, MINT]));
const DIVE_BARS = () => [];   // no tape-stop dives: the effect doesn't fit a piano piece (the listener removed it)

function bars() {
  const out = []; let gi = 0;
  for (const [sec, n] of SECTIONS) for (let b = 0; b < n; b++, gi++) {
    const ph = PLAN[sec].length ? PLAN[sec][Math.floor(b / 8) % PLAN[sec].length] : null, prog = ph ? PROG[ph] : [sec === 'hold' ? 'E' : 'Em'];   // the end: E major
    out.push({ sec, b, gi, t0: T(gi, 0), ph, k: b % 8, name: prog[b % prog.length], tr: 0 });
  }
  out.forEach((x, i) => { x.chord = x.name; x.bass = bassOf(x.name); x.next = (out[i + 1] || x).name; });
  return out;
}

// ---- the melodies, in 8ths: [slot 0..5, midi, length, ornament] (E5 = 76). Ornaments: 'g' an upward grace note,
// 's' a two-note slide up into the note, 'a' an appoggiatura (the scale step above, leant on for an 8th, then the note),
// 'o' an octave flourish (the octave above flicked in just before), 'f' a soft fall-away (shorter, quieter) ----
const MA = [
  [[0, 79, 3], [3, 81, 1], [4, 83, 1], [5, 84, 1]],
  [[0, 84, 3, 'a'], [3, 83, 1], [4, 81, 1], [5, 79, 1]],
  [[0, 81, 3], [3, 84, 1], [4, 88, 2, 'g']],
  [[0, 87, 3, 'a'], [3, 83, 1], [4, 78, 2]],
  [[0, 79, 3, 's'], [3, 81, 1], [4, 83, 1], [5, 84, 1]],
  [[0, 84, 3], [3, 81, 1], [4, 77, 2]],
  [[0, 78, 1], [1, 81, 1], [2, 83, 1], [3, 87, 1], [4, 90, 2, 'o']],
  [[0, 88, 4, 'a'], [4, 83, 2]] ];
const MA2 = [MA[0], MA[1],
  [[0, 81, 3, 's'], [3, 85, 1], [4, 88, 2, 'g']],
  MA[3],
  [[0, 84, 2], [2, 88, 2], [4, 91, 2, 'g']],
  [[0, 89, 3, 'a'], [3, 84, 1], [4, 81, 2]],
  [[0, 87, 2], [2, 83, 1], [3, 81, 1], [4, 78, 2]],
  [[0, 76, 6, 'f']] ];
const MB = [
  [[0, 79, 2], [2, 84, 2, 'g'], [4, 83, 1], [5, 84, 1]],
  [[0, 86, 4, 'a'], [4, 81, 2]],
  [[0, 83, 2], [2, 86, 2], [4, 90, 2, 's']],
  [[0, 88, 4], [4, 86, 1], [5, 84, 1]],
  [[0, 84, 2], [2, 81, 2], [4, 76, 2]],
  [[0, 78, 2], [2, 81, 2], [4, 86, 2, 'g']],
  [[0, 83, 4, 'a'], [4, 79, 2]],
  [[0, 78, 2], [2, 83, 2], [4, 87, 2, 'o']] ];
const MB2 = MB.slice(0, 4).concat([
  [[0, 85, 2], [2, 81, 2], [4, 76, 2]],
  [[0, 77, 2], [2, 81, 2], [4, 84, 2, 's']],
  [[0, 87, 2, 'a'], [2, 83, 2], [4, 81, 2]],
  [[0, 78, 1], [1, 81, 1], [2, 83, 1], [3, 87, 1], [4, 90, 2, 'o']] ]);
const ML = [   // the singing section: long notes, appoggiaturas at the peaks
  [[0, 76, 3], [3, 79, 1], [4, 83, 2, 'g']],          // Em  E G B
  [[0, 84, 4, 'a'], [4, 79, 2]],                      // C   (D) C G
  [[0, 83, 3], [3, 81, 1], [4, 79, 2]],               // G   B A G
  [[0, 78, 4, 'a'], [4, 74, 2]],                      // D   (G) F# D
  [[0, 76, 2], [2, 81, 2], [4, 84, 2, 's']],          // Am  E A C
  [[0, 83, 4, 'a'], [4, 79, 2]],                      // Em  (C) B G
  [[0, 81, 3], [3, 77, 1], [4, 72, 2]],               // F   A F C
  [[0, 75, 4, 'a'], [4, 78, 2]] ];                    // B7  (E) D# F#
const ML2 = [
  [[0, 76, 3], [3, 79, 1], [4, 83, 2, 'g']],          // Em
  [[0, 88, 4, 'a'], [4, 84, 2]],                      // C   (F) E C
  [[0, 86, 3], [3, 83, 1], [4, 79, 2]],               // G   D B G
  [[0, 87, 4, 'a'], [4, 83, 2]],                      // B   (E) D# B
  [[0, 88, 6, 'o']],                                  // Em  E, held
  [[0, 84, 2], [2, 88, 2], [4, 93, 2, 'g']],          // Am  C E A
  [[0, 90, 4, 'a'], [4, 87, 2]],                      // B7  (G) F# D#
  [[0, 83, 2], [2, 81, 2], [4, 78, 2]] ];             // B7  B A F#
const ME = [
  [[0, 84, 3, 'a'], [3, 88, 3]], [[0, 89, 3], [3, 84, 3]], [[0, 87, 3, 'a'], [3, 81, 3]], [[0, 88, 6]],
  [[0, 84, 2], [2, 88, 2], [4, 91, 2, 'g']], [[0, 88, 3, 'a'], [3, 84, 3]], [[0, 83, 2], [2, 87, 2], [4, 90, 2]], [[0, 88, 6, 'f']] ];
const MAV = [   // the theme's first statement: a chord on beat 1, then a quick 8th turn around the melody note
  [[0, 79, 3], [3, 79, 1], [4, 78, 1], [5, 79, 1]],                  // Em  G (G F# G)
  [[0, 84, 3, 'a'], [3, 84, 1], [4, 83, 1], [5, 84, 1]],             // C   (D) C (C B C)
  [[0, 81, 3], [3, 84, 1], [4, 83, 1], [5, 84, 1]],                  // Am  A (C B C)
  [[0, 87, 3, 'a'], [3, 87, 1], [4, 88, 1], [5, 87, 1]],             // B   (E) D# (D# E D#)
  [[0, 83, 3, 's'], [3, 83, 1], [4, 81, 1], [5, 83, 1]],             // Em  B (B A B)
  [[0, 84, 3], [3, 81, 1], [4, 79, 1], [5, 77, 1]],                  // F   C (A G F)
  [[0, 81, 2], [2, 83, 2], [4, 87, 2, 'o']],                         // B7  A B D#
  [[0, 88, 3, 'a'], [3, 83, 1], [4, 79, 1], [5, 76, 1]] ];           // Em  (F#) E (B G E)
const MAV2 = [
  [[0, 79, 3], [3, 79, 1], [4, 81, 1], [5, 83, 1]],                  // Em  G (G A B)
  [[0, 84, 3], [3, 84, 1], [4, 83, 1], [5, 84, 1]],                  // C   C (C B C)
  [[0, 85, 3, 'a'], [3, 85, 1], [4, 83, 1], [5, 85, 1]],             // A   (D) C# (C# B C#)
  [[0, 87, 3], [3, 87, 1], [4, 88, 1], [5, 87, 1]],                  // B   D# (D# E D#)
  [[0, 88, 3], [3, 88, 1], [4, 86, 1], [5, 84, 1]],                  // C   E (E D C)  (no slide: its D would sound against the B chord's D#)
  [[0, 89, 3, 'a'], [3, 84, 1], [4, 81, 1], [5, 77, 1]],             // F   (G) F (C A F)
  [[0, 87, 2], [2, 81, 2], [4, 78, 2]],                              // B7  D# A F#
  [[0, 76, 6, 'f']] ];                                               // Em  E
const MEL = { PA: MA, PA2: MA2, PB: MB, PB2: MB2, PL: ML, PL2: ML2, PE: ME, PAV: MAV, PAV2: MAV2 };

// ---------------- the piano: right hand and left hand ----------------
function guitarEvents() {
  const P = { rh: [], lh: [] };
  let gi = 0, X = null;
  const S16 = s => T(gi, s), D16 = (s, l, k) => (T(gi, s + l) - T(gi, s)) * (k || 0.97);
  const E8 = slot => S16(slot * 2), D8 = (slot, len, k) => D16(slot * 2, len * 2, k);
  const tones = () => CH[X.chord];
  const PEDAL = [];
  const pedalBar = () => PEDAL.push([T(gi, 0) + 0.06, T(gi + 1, 0) + 0.012]);
  const OCT = 12;   // the whole piece sits an octave higher than written (the listener's request)
  const lilt = (t, d) => { if (d < 0.07) return 0; const p = (t - T(gi, 0)) / (T(gi + 1, 0) - T(gi, 0)) * 3, n = Math.round(p);
    if (Math.abs(p - n) > 0.12) return -8; return n === 0 || n === 3 ? 10 : -4; };   // beat 1 +10, beats 2-3 -4, off-beats -8
  const key = (hand, t, m, d, v, art) => P[hand].push([t, m + OCT, d, Math.max(26, Math.min(127, Math.round(v + lilt(t, d)))), art || 'open']);
  const keyA = (hand, t, m, d, v, art) => key(hand, t, m - OCT, d, v, art);   // an absolute pitch (not under the OCT shift)
  const rolled = (hand, t, ms, d, v, gap) => ms.slice().sort((a, b) => a - b).forEach((m, i, arr) => key(hand, t + i * (gap || 0.014), m, d, i === arr.length - 1 ? v + 4 : v - 4));
  const low = () => into(24 + X.bass, 28, 39);
  const third = () => (tones()[1] - tones()[0] + 12) % 12;
  const ctones = (lo, hi) => { const out = []; for (let m = lo; m <= hi; m++) if (tones().includes(m % 12)) out.push(m); return out; };
  // dynamics: a crescendo/diminuendo arch inside every 4-bar phrase (peak in its third bar), per section a level
  const LEVEL = { intro: 0, A: 0, B: 4, L: -3, C: 6, A2: 10, B2: 8, end: 0, hold: 0 };   // the singing section softer, not a hole
  const arch = () => [-6, 0, 6, -2][X.b % 4] + LEVEL[X.sec] + (X.sec === 'L' && X.b >= 4 ? (X.b - 3) * 3 : 0) + (X.sec === 'end' ? -X.b * 1.0 : 0);
  // ---- left hand ----
  const LB = () => into(24 + X.bass, 24, 35);   // the bass: C1..B1 (absolute)
  const leap = (v) => { const b = LB(); v += arch();   // the bass octave, then a quick arpeggio leaping up 2-3 octaves
    keyA('lh', E8(0), b, D8(0, 1, 0.9), v + 10); keyA('lh', E8(0) + 0.005, b + 12, D8(0, 1, 0.9), v + 4);
    keyA('lh', E8(1), b + 19, D8(1, 1), v - 6); keyA('lh', E8(2), b + 24 + third(), D8(2, 1), v - 4); keyA('lh', E8(3), b + 31, D8(3, 2, 0.92), v - 2); };   // the top lets go before the last 8th (the melody passes there)
  const trip = (v) => { const b = LB(), up = [b, b + 12, b + 19, b + 24, b + 24 + third(), b + 31, b + 36]; const idx = [0, 1, 2, 3, 4, 5, 6, 5, 4]; v += arch();
    idx.forEach((j, i) => keyA('lh', S16(i * 4 / 3), up[j], D16(i * 4 / 3, 4 / 3, 0.95), v + (i === 0 ? 10 : -6) + (j === 6 ? 4 : 0))); };   // triplets sweeping 3 octaves
  const wide = (v) => { const b = LB(); v += arch();
    keyA('lh', E8(0), b, D8(0, 2, 0.95), v + 8); keyA('lh', E8(0) + 0.005, b + 12, D8(0, 2, 0.95), v + 2);
    [[1, b + 19], [2, b + 24], [3, b + 24 + third()], [4, b + 31], [5, b + 24 + third()]].forEach(([sl, m]) => keyA('lh', E8(sl), m, D8(sl, 1, 0.95), v - 6)); };
  const stomp = (v) => { const b = LB(); v += arch();   // accented octaves, low
    for (let q = 0; q < 3; q++) { keyA('lh', S16(q * 4), b, D16(q * 4, 4, 0.85), v + (q === 0 ? 12 : 4)); keyA('lh', S16(q * 4) + 0.004, b + 12, D16(q * 4, 4, 0.85), v); } };
  // ---- right hand: the melody on top (a hair ahead of the chord), voiced over it; long notes get the chord ----
  const MEL_RANGE = [72, 95];   // the main melody stays within C5..B6 (the listener's request): written pitch, under the OCT shift
  const melody = (notes, v, o) => { o = o || {}; o.up = (o.up || 0) - OCT; const sc = barScale(X.name), step = (m, dir) => { let g = m + dir; while (!sc.includes(((g % 12) + 12) % 12)) g += dir; return g; };
    v += arch();
    for (const [s, m0, l, orn] of notes) { const m = m0 + (o.up || 0); let t = E8(s), d = D8(s, l, l <= 1 ? 0.9 : 0.97);
      const acc = s === 0 ? 8 : l >= 2 ? 3 : -5, lead = -0.012;
      const trim = tt => { const p = P.rh[P.rh.length - 1]; if (p && p[0] + p[2] > tt - 0.01) p[2] = Math.max(0.04, tt - 0.012 - p[0]); };
      if (orn === 'g') { trim(t - 0.06); key('rh', t - 0.06, step(m, -1), 0.055, v - 20); }
      if (orn === 's') { trim(t - 0.1); key('rh', t - 0.1, step(step(m, -1), -1), 0.045, v - 24); key('rh', t - 0.052, step(m, -1), 0.045, v - 18); }
      if (orn === 'o') { trim(t - 0.065); key('rh', t - 0.065, m - 12, 0.06, v - 14); }   // an octave leap up into the note
      let mm = m;
      if (orn === 'a' && l >= 2) {   // the appoggiatura: the scale step above, on the beat and leant on, resolving down
        const ap = step(m, 1), d1 = D8(s, 1, 1.0); key('rh', t + lead, ap, d1, v + acc + 6, 'appog'); key('rh', t + 0.004 + lead, ap - 12, d1, v + acc - 6, 'appog');
        t = E8(s + 1); d = D8(s + 1, l - 1, 0.97); }
      const vv = orn === 'f' ? v - 12 : v + acc;
      const roll = (s === 0 && (X.b % 4 === 0) && l >= 2) ? 0.028 : 0.006;   // phrase starts: the chord rolled up into the melody
      const dance = !o.float && s === 0 && l >= 4 && orn !== 'a';   // a held note: struck for 3 8ths, then the quick figure (note, lower neighbour, note)
      const dt = dance ? D8(s, 3, 0.95) : d, dc = Math.min(dt, D8(s, 2, 0.9));   // the chord under it lasts about a beat: struck, not held
      key('rh', t + lead + (roll > 0.01 ? roll * 3 : 0), mm, dt, vv); key('rh', t + lead, mm - 12, dc, vv - 10);
      if (l >= 2 || s === 0) { const inner = ctones(mm - 11, mm - 1).filter(x => x >= mm - 9).slice(-2);
        inner.forEach((x, i) => key('rh', t + lead + roll * (i + 1), x, dc, vv - 18)); }
      if (dance) { const nb = mm - 1, chrom = !sc.includes(((nb % 12) + 12) % 12);   // the lower neighbour a half step down: often outside the key (bittersweet)
        const fig = l - 3 >= 3 ? [[3, mm], [4, nb], [5, mm]] : l - 3 === 2 ? [[3, mm], [4, nb]] : [[3, nb]];
        fig.forEach(([fs, fm]) => { const art = fm === nb && chrom ? 'chrom' : 'open'; key('rh', E8(fs) + lead, fm, D8(fs, 1, 0.9), v - 4, art); key('rh', E8(fs) + lead + 0.004, fm - 12, D8(fs, 1, 0.9), v - 14, art); }); } } };
  // ---- flourishes as punctuation (one per 8-bar phrase): a rolled chord, five- and four-note groups, one upward run ----
  const arp5 = (fromTop, target, v) => { const tn = ctones(fromTop - 12 - OCT, fromTop - OCT).slice(-5); const sc = barScale(X.name);   // beat 2: five chord tones sweeping up an octave
    let m = target - OCT; const four = []; for (let i = 0; i < 4; i++) { m--; while (!sc.includes(((m % 12) + 12) % 12)) m--; four.unshift(m); }      // beat 3: four stepping into the next downbeat
    v += arch(); tn.forEach((n, i) => key('rh', S16(4 + i * 4 / 5), n, D16(4 + i * 4 / 5, 4 / 5, 0.85), v - 4 + i * 2));
    four.forEach((n, i) => key('rh', S16(8 + i), n, D16(8 + i, 1, 0.85), v - 6 + i * 3)); };
  const runDown8 = (fromTop, v) => { const sc = barScale(X.name); let m = fromTop - OCT + 12; v += arch();   // a short fast run down over beats 2-3 (8 notes)
    for (let i = 0; i < 8; i++) { while (!sc.includes(((m % 12) + 12) % 12)) m--; key('rh', S16(4 + i), m, D16(4 + i, 1, 0.85), v - i * 1.5); m--; } };
  const roll2 = (v, hi) => { const b = LB(); v += arch(); hi = hi || 0;   // a big two-hand rolled chord: the low bass up through four octaves, 35 ms a note
    const lh = [b, b + 12, b + 19, b + 24 + third()], rh = ctones(b + 31 + hi - OCT, b + 62 + hi - OCT).slice(0, hi ? 7 : 5);   // hi: reaching an octave higher (the final one)
    lh.forEach((m, i) => keyA('lh', E8(0) + i * 0.035, m, D8(0, 3, 0.95), v + (i === 0 ? 8 : -4)));
    rh.forEach((m, i) => key('rh', E8(0) + (lh.length + i) * 0.035, m, D8(0, 3, 0.95), v - 6 + i * 2)); };
  const tuplets = (fromTop, target, v) => { const sc = barScale(X.name), st = (m, d) => { let g = m + d; while (!sc.includes(((g % 12) + 12) % 12)) g += d; return g; };
    const a = fromTop - OCT, tg = target - OCT; v += arch();   // beat 2: five notes turning around the melody note; beat 3: four rising into the next downbeat
    const five = [a, st(a, 1), a, st(a, -1), a]; let four = [], m = tg; for (let i = 0; i < 4; i++) { m = st(m, -1); four.unshift(m); }
    five.forEach((n, i) => { key('rh', S16(4 + i * 4 / 5), n, D16(4 + i * 4 / 5, 4 / 5, 0.85), v - 6 + (i === 0 ? 4 : 0)); });
    four.forEach((n, i) => { key('rh', S16(8 + i), n, D16(8 + i, 1, 0.85), v - 8 + i * 3); }); };
  const bigRoll = (v) => { const ch = ctones(43, 66); rolled('rh', E8(0), ch, D8(0, 2, 0.9), v + arch() - 8, 0.012); };   // a spread chord rolled up from the downbeat (from it, not before: no notes of the next chord in this bar)
  const stabs = (v, tops) => { v += arch(); tops.forEach((top0, s) => { if (top0 == null) return; const top = top0 - OCT, ch = ctones(top - 11, top).slice(-4);   // the tops carry the melody: in its range
    ch.forEach((m, i) => key('rh', E8(s) + i * 0.004, m, D8(s, 1, 0.8), v + (s === 0 ? 10 : s % 2 ? -10 : -2) - (m === top ? 0 : 10))); }); };
  const runDown = (from, slot16, n, v) => { const sc = barScale(X.name), len = STEPS - slot16; let m = from; v += arch();   // a cascade in the right hand, inside its bar
    for (let i = 0; i < n; i++) { while (!sc.includes(((m % 12) + 12) % 12)) m--; key('rh', S16(slot16 + i * len / n), m, D16(slot16 + i * len / n, len / n, 0.9), v - i * 1.2); m--; } };
  const runUp = (to, slot16, n, v) => { const sc = barScale(X.name), ns = []; let m = to - 1; v += arch();
    while (ns.length < n) { if (sc.includes(((m % 12) + 12) % 12)) ns.unshift(m); m--; }
    ns.forEach((mm, i) => key('rh', S16(slot16 + i * (4 / n)), mm, D16(slot16 + i * 4 / n, 4 / n, 0.85), v - 14 + i * 4)); };
  const lineFor = (y) => y.sec === 'A' ? MEL[y.ph === 'PA' ? 'PAV' : 'PAV2'][y.k] : y.sec === 'end' ? ME[y.k] : MEL[y.ph] ? MEL[y.ph][y.k] : [[0, 88, 6]];
  const FLOURISH = { 'A:7': 'arp5', 'A:15': 'run', 'B:0': 'roll', 'B:7': 'down', 'B:15': 'arp5', 'A2:3': 'casc', 'A2:7': 'arp5', 'A2:8': 'roll', 'A2:15': 'down', 'B2:0': 'roll', 'B2:7': 'bigrun' };   // one per phrase, varied
  const ALLB = bars(); ALLB.forEach((y, i) => y.nextX = ALLB[i + 1]);
  for (const x of ALLB) {
    X = x; gi = x.gi; const { sec, b, k, ph } = x;
    if (sec === 'hold') { if (b === 0) { const H = 5.0;   // the last chord, rolled wide over five octaves, fermata
        rolled('lh', E8(0), [28, 40, 47, 52], 0.5, 108, 0.03); rolled('rh', E8(0) + 0.1, [64, 68, 71, 76, 80, 83, 88, 92], 0.09, 100, 0.024); PEDAL.push([E8(0) + 0.05, E8(0) + H]); } continue; }   // a wide arpeggio, the pedal holds it
    if (sec === 'intro') {   // a big rolled chord, then the left hand's leap figure announcing the theme
      if (b === 0) { rolled('lh', E8(0), [28, 35, 40], 0.5, 96, 0.03); rolled('rh', E8(0) + 0.08, [64, 67, 71, 76], 0.5, 92, 0.026); pedalBar(); }
      else { leap(100 + b * 3); melody([[0, 79, 3, b === 1 ? 's' : null], [3, 78, 1], [4, 76, 2]], 96 + b * 4); pedalBar(); }
    } else if (sec === 'A' || sec === 'A2' || sec === 'B' || sec === 'B2') {   // the themes, full and hard: left hand alternating leap and triplets
      const climax = sec === 'A2' || sec === 'B2', isA = sec[0] === 'A';
      const line = lineFor(x), F = FLOURISH[sec + ':' + b];
      if (F !== 'roll') { if (b % 2) trip(climax ? 108 : 106); else leap(climax ? 110 : 106); }   // (a roll bar: the roll is the left hand's figure)
      if (F === 'roll') roll2(climax ? 110 : 104);
      if (F === 'casc') { melody(line.filter(n => n[0] < 3), climax ? 116 : 110); runDown(95, 6, 10, 106); }
      else if (F === 'arp5' || F === 'run' || F === 'down' || F === 'bigrun') { const nx = X.nextX, tg = nx ? lineFor(nx)[0][1] : 88;
        melody(line.filter(n => n[0] < 2), climax ? 116 : 110);
        if (F === 'arp5') arp5(line[0][1], tg, climax ? 112 : 106); else if (F === 'down') runDown8(line[0][1], climax ? 112 : 106); else if (F === 'bigrun') runUp(tg + 12, 4, 12, 114); else runUp(tg, 4, 8, 108); }   // bigrun: from two octaves below, 12 notes, up to the octave above
      else melody(line, isA ? (climax ? 116 : 110) : (climax ? 114 : 110));
      pedalBar();
    } else if (sec === 'L') {   // the singing section: slower, softer, the left hand alternating wide broken chords and triplets
      if (b === 0) roll2(84); else if (b % 2) trip(86); else wide(88); melody(MEL[ph][k], 88, { float: true });   // floats on purpose: the contrast
      pedalBar();
    } else if (sec === 'C') {   // the octave stomps under repeated chords whose tops carry the line; building
      stomp(110);
      const tops = { 0: [83, 79, 83, 88, 83, 79], 1: [88, 83, 88, 91, 88, 83], 2: [84, 81, 84, 89, 84, 81], 3: [89, 84, 89, 93, 89, 84],
        4: [81, 76, 81, 84, 81, 76], 5: [84, 81, 84, 88, 84, 81], 6: [87, 81, 87, 90, 87, 81], 7: [87, 90, 87, 93, 90, 87] };
      stabs(108 + (k === 7 ? 6 : 0), tops[k]);
      pedalBar();
    } else if (sec === 'end') {   // the release: the theme broadens, slower
      if (k === 0) roll2(108, 12); else if (k % 2 === 0) leap(102); else wide(96);   // the coda opens on the biggest roll
      melody(ME[k], 104);
      pedalBar();
    }
  }
  const part = (notes, o) => Object.assign({ sf: 'grand', program: 0, amp: 'none', notes }, o);
  const B = bars();
  return { bpm: BPM, sections: SECTIONS, colors: COLORS, roll_color: MINT, bar_times: BAR_TIMES.slice(0, TOTAL + 1), bar_tempi: Array.from({ length: TOTAL }, (_, g) => barTempo(g)),
    eighths_per_bar: 6, strong: [0, 2, 4], meter: [3, 4],
    harmony: B.map(x => ({ tones: CH[x.chord], scale: barScale(x.name) })),
    parts: {
      rh: part(P.rh, { label: 'Piano (right hand)', humanize: 7, velvar: 5, pedal: PEDAL }),   // humanized: +-7 ms, +-5 velocity
      lh: part(P.lh, { label: 'Piano (left hand)', humanize: 8, velvar: 6, pedal: PEDAL }),
    } };
}

async function renderSong() {
  const SR = 44100, BARS = bars();
  const tHold = T(START.hold, 0), dur = tHold + 7.0;   // the last chord rings ~4 s, then the hall tail
  const rand = (() => { let s = 707; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * dur), SR);
  const has = n => (window.ASSET_NAMES || []).indexOf(n) >= 0;
  const SOLO = window.SOLO, ON = n => !SOLO || SOLO === 'all' || SOLO === n;
  const eqChain = (src, eq) => { let n = src; for (const [type, f, g, q] of eq || []) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (g != null) b.gain.value = g; b.Q.value = q || 0.7; n.connect(b); n = b; } return n; };
  const HP = f => ['highpass', f, null, 0.7], LP = f => ['lowpass', f, null, 0.7], PK = (f, g, q) => ['peaking', f, g, q || 1];
  const master = ctx.createGain(); master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = SOLO ? 1 : 2; comp.attack.value = 0.01; comp.release.value = 0.15;
  master.connect(comp); comp.connect(ctx.destination);
  // ---- the piano bus, tuned as a real grand in a hall: the aggression comes from the hammer layers themselves, so only
  // a trace of saturation; a little low-mid clean-up, hammer definition around 3.5 kHz, air; the sample's own stereo image ----
  const pin = ctx.createGain(); pin.channelCountMode = 'explicit'; pin.channelCount = 2;
  const drive = ctx.createWaveShaper(); { const c = new Float32Array(2048); for (let i = 0; i < 2048; i++) { const x = i / 1023.5 - 1; c[i] = Math.tanh(1.15 * x) / Math.tanh(1.15); } drive.curve = c; drive.oversample = '4x'; }
  const trim = ctx.createGain(); trim.gain.value = 0.3; pin.connect(trim);   // headroom: piano chords peak ~15-20 dB over their average
  const clean = ctx.createGain(); trim.connect(clean);                          // no saturation: it squashed the loud chords (sounded broken)
  const tone = eqChain(clean, [HP(28), ['lowshelf', 140, 2.5], PK(300, -1, 0.9), PK(3500, -1, 0.9), ['highshelf', 9000, -0.5]]);   // an octave higher: more body, no extra presence
  const pc = ctx.createDynamicsCompressor(); pc.threshold.value = -30; pc.ratio.value = 3; pc.knee.value = 12; pc.attack.value = 0.015; pc.release.value = 0.25; tone.connect(pc);   // clean level control: rounds the loud chords off
  // mid/side width: L' = L + k(L-R)/2, R' = R + k(R-L)/2 (the Salamander is already very wide: k < 0 narrows it a touch,
  // to the reference's ~27-40% correlation, safe in mono)
  const k = -0.3, split = ctx.createChannelSplitter(2), merge = ctx.createChannelMerger(2); pc.connect(split);
  const g = v => { const n = ctx.createGain(); n.gain.value = v; return n; };
  const lL = g(1 + k / 2), rL = g(-k / 2), rR = g(1 + k / 2), lR = g(-k / 2);
  split.connect(lL, 0); split.connect(rL, 1); split.connect(rR, 1); split.connect(lR, 0);
  lL.connect(merge, 0, 0); rL.connect(merge, 0, 0); rR.connect(merge, 0, 1); lR.connect(merge, 0, 1);
  const dry = ctx.createGain(); merge.connect(dry); dry.connect(master);
  // a large hall
  const verb = ctx.createConvolver();
  { const len = SR * 2.6, pre = Math.round(SR * 0.025), ir = ctx.createBuffer(2, len + pre, SR);   // a hall: 25 ms pre-delay, early reflections, a smooth tail
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[pre + i] = (rand() * 2 - 1) * Math.exp(-6.9 * i / len) * (1 - Math.exp(-i / (SR * 0.004)));
      for (const [ms, a] of [[11, 0.5], [17, 0.35], [23, 0.3], [31, 0.22], [41, 0.18]]) d[pre + Math.round(SR * ms / 1000) + c * 37] += (c ? -a : a); }
    verb.buffer = ir; }
  const verbOut = g(0.26); eqChain(verb, [HP(250), PK(2500, -2, 0.7), LP(7000)]).connect(verbOut); verbOut.connect(master);
  const vs = g(0.3); merge.connect(vs); vs.connect(verb);
  // section dynamics: only the first bar (the soft opening) sits under; everything else is full energy, colour not volume
  const sect = ctx.createGain(); pin.gain.value = 1;
  const SECT_DB = x => x.sec === 'L' ? 2.5 : x.sec === 'end' ? 2 : 0;   // the thinner singing section and coda lifted (soft playing, not a hole)
  { let prev = null; for (const x of BARS) { const v = Math.pow(10, SECT_DB(x) / 20); if (prev === null) pin.gain.setValueAtTime(v, 0);
      else if (v !== prev) { pin.gain.setValueAtTime(prev, T(x.gi - 1, 8)); pin.gain.linearRampToValueAtTime(v, T(x.gi, 0)); } prev = v; } }
  async function stem(name, targetDb) {
    if (!has('stem/' + name) || !ON(name)) return;
    const buf = await loadAsset('stem/' + name, ctx), d = buf.getChannelData(0);
    let sum = 0, n = 0; for (let i = 0; i < d.length; i += 4) { const a = Math.abs(d[i]); if (a > 1e-3) { sum += a * a; n++; } }
    const rms = Math.sqrt(sum / Math.max(1, n)) || 1e-3, gg = g(Math.pow(10, targetDb / 20) / rms); gg.connect(pin);
    if (has('stem/' + name + '@L')) {   // the Salamander is stereo (low notes left, high right): keep its image
      const l = await loadAsset('stem/' + name + '@L', ctx), r = await loadAsset('stem/' + name + '@R', ctx);
      const st = ctx.createBuffer(2, l.length, SR); st.copyToChannel(l.getChannelData(0), 0); st.copyToChannel(r.getChannelData(0), 1);
      const src = ctx.createBufferSource(); src.buffer = st; src.connect(gg); src.start(0);
    } else { const src = ctx.createBufferSource(); src.buffer = buf; src.connect(gg); src.start(0); }
  }
  await stem('rh', -12); await stem('lh', -13.5);   // the melody hand a touch over the pounding hand
  master.gain.setValueAtTime(0.8, dur - 1.8); master.gain.linearRampToValueAtTime(0, dur);
  const out = await ctx.startRendering();
  const L = out.getChannelData(0), R = out.getChannelData(1), n = L.length, wavBuf = new ArrayBuffer(44 + n * 4), v = new DataView(wavBuf);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const norm = window.SOLO_NORM || (peak > 0 ? 0.95 / peak : 1);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, n * 4, true);
  for (let i = 0, o = 44; i < n; i++, o += 4) { v.setInt16(o, Math.max(-1, Math.min(1, L[i] * norm)) * 32767, true); v.setInt16(o + 2, Math.max(-1, Math.min(1, R[i] * norm)) * 32767, true); }
  let bin = ''; const u8 = new Uint8Array(wavBuf); for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
  return { wav: btoa(bin), seconds: dur, peak, dives: SOLO ? [] : DIVE_BARS().map(gb => [T(gb, 8), T(gb + 1, 0)]) };
}
