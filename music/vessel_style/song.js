// An original song in the style of "Vessel To Be Fueled" (Vbuh): its devices, measured and read, never its notes.
// 200 BPM, F minor, the last stretch a half step up (F# minor). Genre devices (hardcore / breakcore boss music): a pedal-tone
// bass ostinato in a 3+3+2 rhythm with a pickup into each bar; long held octaves above it; a theme in syncopated 8ths; a wide
// brass section; chopped breakbeats over a distorted hardcore kick that change every 4 bars; constant energy to the end, then
// one held chord, a cut and a short tail.
// The lead is a DUEL: the lead guitar and the brass section trade phrases (call and response), swap roles, then play together
// in thirds; in the drop the guitar harmonizes under the brass and later fills the brass's long notes; the solo section trades
// bar by bar (guitar runs vs brass stabs) before both play in unison. Ornaments (grace notes, guitar bends, brass scoops and
// falls) are placed by hand, a few per phrase.
const BPM = 200, STEP = 60 / BPM / 4, BAR = STEP * 16;   // nominal tempo (the tempo map below bends it)

// ---- harmony ----
const F = 5, Gb = 6, Ab = 8, Bb = 10, Db = 1, Eb = 3, E = 4, C = 0;
const QUAL = { 5: [0, 3, 7], 10: [0, 3, 7], 1: [0, 4, 7], 3: [0, 4, 7], 8: [0, 4, 7], 0: [0, 4, 7, 10] };   // Fm, Bbm; Db, Eb, Ab; C7 (V)
const chordPcs = pc => QUAL[pc].map(i => (pc + i) % 12);
const SCALE = [5, 7, 8, 10, 0, 1, 3, 4];                    // F natural minor + the harmonic-minor E
const barScale = pc => pc === C ? [5, 7, 8, 10, 0, 1, 4] : [5, 7, 8, 10, 0, 1, 3];   // E only over the V (and no Eb there)
const into = (m, lo, hi) => { while (m < lo) m += 12; while (m > hi) m -= 12; return m; };
const PROG = {   // one chord per bar, 8-bar phrases
  pedal: [F, Db, F, Db, F, Db, Bb, C],     // i - bVI rocking over the ostinato, iv, V
  q: [F, F, Db, Eb, F, F, Db, C],          // theme (ends on V)
  a: [Bb, Bb, Db, Eb, F, Db, C, C],        // theme answer (ends on V, resolves into the next downbeat)
  h: [Db, Ab, Eb, F, Db, Ab, Bb, C],       // breakdown: bVI - bIII - bVII - i, iv - V
  d: [Db, Eb, F, F, Db, Eb, C, C],         // the drop: bVI bVII i, then the long dominant
  e: [Db, Eb, F, F, Db, Eb, C, F],         // the drop's answer: lands home
  s: [F, Eb, Db, C, F, Eb, Db, C],         // the solo: the Andalusian descent
};
const SECTIONS = [['intro', 8], ['A', 16], ['B', 32], ['C', 16], ['A2', 8], ['drop', 24], ['S', 16], ['F', 16], ['end', 8], ['hold', 2]];
const PLAN = { intro: ['pedal'], A: ['pedal', 'pedal'], B: ['q', 'a', 'q', 'a'], C: ['h', 'h'], A2: ['pedal'], drop: ['d', 'e', 'd'],
  S: ['s', 's'], F: ['q', 'a'], end: ['d'], hold: [] };
const TRANS = { F: 1, end: 1, hold: 1 };   // the last stretch a half step up; the solo's last bar is its pivot (C#7)

// ---- tempo map: changes only at the two pivotal moments ----
const LEN = Object.fromEntries(SECTIONS), START = {}; { let g = 0; for (const [n, l] of SECTIONS) { START[n] = g; g += l; } }
const TOTAL = SECTIONS.reduce((a, x) => a + x[1], 0);
function barTempo(gi) {
  if (gi === START.drop - 1) return [200, 60];     // brake into the drop
  if (gi === START.hold - 1) return [200, 110];    // final brake into the held chord
  if (gi >= START.hold) return [110, 110];
  return [200, 200];
}
const BRAKES = [START.drop - 1, START.hold - 1];
const TT = []; { let t = 0; for (let gi = 0; gi < TOTAL + 1; gi++) { const [a, b] = barTempo(Math.min(gi, TOTAL - 1)), row = [t];
  for (let k = 0; k < 16; k++) { const bpm = a + (b - a) * (k + 0.5) / 16; t += 60 / bpm / 4; row.push(t); } TT.push(row); } }
function T(gi, s) { while (s >= 16 && gi < TOTAL) { s -= 16; gi++; } const k = Math.floor(s), f = s - k, row = TT[gi]; return row[k] + (k < 16 ? (row[k + 1] - row[k]) * f : 0); }
const BAR_TIMES = TT.map(r => r[0]);
const COLORS = { intro: '#ff6030', A: '#ff8a30', B: '#ff5030', C: '#a04060', A2: '#ff9a40', drop: '#ffd060', S: '#ff4040', F: '#ffb040', end: '#ffd060', hold: '#fff0c0' };

function bars() {   // every bar: section, bar in section, global bar, phrase, bar in phrase, chord (F minor terms), next chord, transposition
  const out = []; let gi = 0;
  for (const [sec, n] of SECTIONS) for (let b = 0; b < n; b++, gi++) {
    const ph = PLAN[sec].length ? PLAN[sec][Math.floor(b / 8) % PLAN[sec].length] : null;
    const tr = TRANS[sec] || (sec === 'S' && b === n - 1 ? 1 : 0);
    out.push({ sec, b, gi, t0: T(gi, 0), ph, k: b % 8, pc: ph ? PROG[ph][b % 8] : F, tr });
  }
  out.forEach((x, i) => x.next = (out[i + 1] || { pc: F }).pc);
  return out;
}
const ARP_ON = (sec, b) => (sec === 'A' && b >= 8) || sec === 'S' || (sec === 'F' && b >= 8);

// ---- the hand-written lines: [slot in 8ths (0..7, .5 = a 16th), midi, length in 8ths, ornament] (F minor; F4 = 65) ----
// ornaments: 'g' grace note just before the beat, always flicking up from the scale step below,
// 'b' bend up into the note (guitar) / scoop (brass), 'f' fall off the end, 'v' vibrato (guitar long notes)
const LONG = [ [[0, 72, 8]], [[0, 73, 8]], [[0, 72, 8]], [[0, 77, 8, 'g']], [[0, 80, 16, 'g']], [], [[0, 77, 8]], [[0, 76, 8, 'f']] ];
const THEME = {
  q: [ [[0, 68, 3], [3, 72, 3], [6, 77, 2, 'g']],
       [[0, 80, 3, 'g'], [3, 79, 1], [4, 77, 2], [6, 72, 2]],
       [[0, 77, 3], [3, 80, 3, 'g'], [6, 77, 2]],
       [[0, 79, 3], [3, 82, 3], [6, 79, 2]],
       [[0, 84, 3, 'g'], [3, 80, 3], [6, 82, 1], [7, 80, 1]],
       [[0, 77, 4], [4, 72, 2], [6, 68, 2]],
       [[0, 77, 3], [3, 73, 3], [6, 77, 1], [7, 80, 1]],
       [[0, 79, 3], [3, 76, 3], [6, 72, 2, 'f']] ],
  a: [ [[0, 73, 3], [3, 77, 3], [6, 82, 2, 'g']],
       [[0, 82, 3], [3, 77, 3], [6, 82, 2]],
       [[0, 77, 3], [3, 80, 3], [6, 77, 2]],
       [[0, 79, 3], [3, 82, 3, 'g'], [6, 82, 2]],
       [[0, 84, 6, 'g'], [6, 82, 1], [7, 80, 1]],
       [[0, 77, 3], [3, 80, 3], [6, 77, 2]],
       [[0, 79, 3], [3, 76, 3], [6, 79, 2]],
       [[0, 82, 4], [4, 79, 2], [6, 76, 2]] ],
};
// the guitar's answers in the duel (bars 3-4 and 7-8 of each phrase), guitar-idiomatic: 16th turns, bends
const ANSWER = {
  q: { 2: [[0, 80, 3, 'b'], [3, 77, 1], [4, 73, 1], [5, 77, 1], [6, 80, 2]],
       3: [[0, 82, 2], [2, 80, 0.5], [2.5, 79, 0.5], [3, 75, 3], [6, 82, 1], [7, 79, 1]],
       6: [[0, 77, 2, 'g'], [2, 73, 1], [3, 80, 3, 'b'], [6, 77, 2]],
       7: [[0, 79, 1], [1, 76, 1], [2, 72, 1], [3, 76, 1], [4, 79, 1], [5, 82, 1], [6, 84, 2, 'f']] },
  a: { 2: [[0, 80, 1], [1, 77, 1], [2, 73, 1], [3, 77, 3, 'b'], [6, 80, 1], [7, 82, 1]],
       3: [[0, 82, 3, 'v'], [3, 79, 1], [4, 75, 1], [5, 79, 1], [6, 82, 2]],
       6: [[0, 79, 3, 'b'], [3, 76, 1], [4, 79, 1], [5, 82, 1], [6, 84, 2]],
       7: [[0, 82, 1], [1, 79, 1], [2, 76, 1], [3, 72, 1], [4, 70, 1], [5, 72, 1], [6, 76, 2]] },
};
const BREAK = [   // the breakdown (half time): guitar sings bars 1-8, the brass bars 9-16 with the guitar a third below
  [[0, 77, 6, 'b'], [6, 80, 2]], [[0, 84, 4, 'g'], [4, 80, 2], [6, 75, 2]], [[0, 79, 6, 'v'], [6, 82, 2]], [[0, 80, 4, 'g'], [4, 77, 4, 'f']],
  [[0, 73, 2], [2, 77, 2], [4, 80, 4, 'b']], [[0, 84, 6, 'v'], [6, 80, 2]], [[0, 82, 4], [4, 77, 2], [6, 73, 2]], [[0, 76, 4, 'b'], [4, 79, 4, 'v']],
  [[0, 80, 4], [4, 77, 2], [6, 73, 2]], [[0, 75, 4], [4, 72, 2], [6, 75, 2]], [[0, 79, 4], [4, 82, 4, 'g']], [[0, 84, 6], [6, 80, 2]],
  [[0, 85, 4, 'g'], [4, 84, 1], [5, 80, 1], [6, 77, 2]], [[0, 80, 4], [4, 75, 4]], [[0, 77, 4], [4, 82, 4]], [[0, 79, 4], [4, 76, 2], [6, 72, 2, 'f']],
];
const DROP = {   // the brass section's line (Ab4..Ab5)
  d: [ [[0, 68, 2], [2, 73, 2], [4, 77, 4, 'b']],
       [[0, 75, 2], [2, 79, 2], [4, 70, 2], [6, 75, 2]],
       [[0, 77, 6], [6, 75, 1], [7, 77, 1]],
       [[0, 72, 2], [2, 68, 2], [4, 72, 2], [6, 77, 2, 'g']],
       [[0, 77, 4], [4, 73, 2], [6, 68, 2]],
       [[0, 70, 2], [2, 75, 2], [4, 79, 4, 'g']],
       [[0, 79, 4], [4, 76, 2], [6, 72, 2]],
       [[0, 70, 2], [2, 72, 2], [4, 76, 2], [6, 79, 2]] ],
  e: [ [[0, 68, 2], [2, 73, 2], [4, 77, 4]],
       [[0, 75, 2], [2, 79, 2], [4, 70, 2], [6, 75, 2]],
       [[0, 77, 6, 'b'], [6, 75, 1], [7, 77, 1]],
       [[0, 72, 2], [2, 68, 2], [4, 72, 2], [6, 77, 2, 'g']],
       [[0, 73, 2], [2, 77, 2], [4, 80, 4, 'g']],
       [[0, 79, 4], [4, 75, 2], [6, 70, 2]],
       [[0, 76, 4], [4, 79, 2], [6, 72, 2]],
       [[0, 77, 8, 'f']] ],
};
const FILLS = [   // the guitar fills the brass's long notes in the drop's last pass (chord-tone 16th sweeps)
  [[4, 73, 0.5], [4.5, 77, 0.5], [5, 80, 0.5], [5.5, 77, 0.5], [6, 73, 0.5], [6.5, 77, 0.5], [7, 80, 1]],
  [],
  [[0, 72, 0.5], [0.5, 68, 0.5], [1, 65, 0.5], [1.5, 68, 0.5], [2, 72, 0.5], [2.5, 77, 0.5], [3, 80, 1], [4, 79, 0.5], [4.5, 77, 0.5], [5, 72, 1]],
  [],
  [[0, 80, 0.5], [0.5, 77, 0.5], [1, 73, 0.5], [1.5, 68, 0.5], [2, 73, 0.5], [2.5, 77, 0.5], [3, 80, 1]],
  [[4, 70, 0.5], [4.5, 75, 0.5], [5, 79, 0.5], [5.5, 82, 0.5], [6, 79, 0.5], [6.5, 75, 0.5], [7, 70, 1]],
  [[0, 72, 0.5], [0.5, 76, 0.5], [1, 79, 0.5], [1.5, 82, 0.5], [2, 84, 0.5], [2.5, 82, 0.5], [3, 79, 1, 'v']],
  [],
];
const sixteen = (ns, from) => ns.map((m, i) => [(from || 0) + i * 0.5, m, 0.5]);
const SOLO = {   // the trading solo: guitar runs (bars 1, 3, 5, 7, 9, 11), then guitar + brass in unison (bars 13-16)
  0: sixteen([65, 67, 68, 72, 68, 72, 77, 72, 77, 80, 84, 80, 77, 72, 68, 72]),
  2: sixteen([73, 77, 80, 85, 80, 77, 73, 77, 80, 77, 73, 68, 73, 77, 80, 77]),
  4: sixteen([84, 82, 80, 79, 80, 79, 77, 75, 77, 75, 73, 72, 68, 72, 77, 80]),
  6: sixteen([80, 77, 73, 77, 80, 85, 80, 77, 73, 77, 80, 85, 80, 77, 73, 68]),
  8: sixteen([65, 68, 72, 77, 72, 77, 80, 77, 80, 84, 80, 77, 72, 77, 80, 84]),
  10: sixteen([85, 80, 77, 73, 77, 73, 68, 73, 77, 80, 85, 80, 77, 73, 77, 80]),
  12: [[0, 84, 1], [1, 80, 1], [2, 77, 1], [3, 80, 1], [4, 84, 1], [5, 80, 1], [6, 77, 2]],
  13: [[0, 82, 1], [1, 79, 1], [2, 75, 1], [3, 79, 1], [4, 82, 1], [5, 79, 1], [6, 75, 2]],
  14: [[0, 80, 1], [1, 77, 1], [2, 73, 1], [3, 77, 1], [4, 80, 1], [5, 77, 1], [6, 73, 2]],
  15: sixteen([79, 76, 72, 76, 79, 82, 84, 82, 79, 76, 72, 70, 72, 76, 79, 76]),   // over C#7 (the pivot, a half step up)
};

// the bass ostinato (8ths): root, root, octave + a pickup that steps into the next chord; a scale fill on each phrase's V
function bassBar(pc, next, k) {
  const r2 = 36 + ((pc - 36) % 12 + 12) % 12;   // C2..B2
  if (pc === C && k === 7) {
    const head = [[0, 48, 1], [1, 46, 1], [2, 44, 1], [3, 43, 1], [4, 40, 1], [5, 41, 1]];   // C Bb Ab G E F
    return head.concat(next === F ? [[6, 43, 1], [7, 40, 1]] : next === Bb ? [[6, 43, 1], [7, 44, 1]] : [[6, 43, 1], [7, 48, 1]]); }
  const tgt = 36 + ((next - 36) % 12 + 12) % 12 + 12, ct = chordPcs(pc), sc = m => barScale(pc).includes(((m % 12) + 12) % 12);
  let pick = null; for (const d of [-1, 2, -2, 1, -4, 3, -3, 4]) { const m = tgt + d; if (m !== r2 + 12 && sc(m) && ct.includes(((m % 12) + 12) % 12)) { pick = m; break; } }
  if (pick === null) for (const d of [-1, 2, -2, 1]) if (sc(tgt + d)) { pick = tgt + d; break; }
  if (next === pc) pick = r2 + 7;
  return [[0, r2, 3], [3, r2, 3], [6, r2 + 12, 1], [7, pick, 1]];
}
const third = (m, pc) => { const sc = barScale(pc), ct = chordPcs(pc);   // twin harmony: the nearest chord tone 3-5 semitones below
  const h = [m - 3, m - 4, m - 5].find(x => ct.includes(x % 12)); if (h !== undefined) return h;   // (under a root that's the 5th below)
  const c = [m - 3, m - 4].filter(x => sc.includes(x % 12)); return c[0] ?? m - 12; };   // passing notes: a diatonic third

// ---------------- the parts (notes) ----------------
function guitarEvents() {
  const P = { rhythm: [], bass: [], lead: [], harmony: [], brass: [], synth: [], strings: [], piano: [], bells: [], choir: [], timp: [] };
  let gi = 0, X = null;
  const E8 = slot => T(gi, slot * 2), D8 = (slot, len, k) => (T(gi, (slot + len) * 2) - T(gi, slot * 2)) * k;
  const last = {};   // the last pitch per line, for grace-note direction
  // a melodic line into a part, with its ornaments. who: 'gtr' (lead guitar) or 'brass' (brass section + synth double)
  function line(who, notes, opt) {
    const o = opt || {}, up = o.up || 0, vel = o.vel || 112, sc = barScale(X.pc);
    for (const n of notes) {
      const [s, m0, l, orn] = n, m = (o.harm ? third(m0, X.pc) : m0) + up, t = E8(s), d = D8(s, l, l <= 1 ? 0.92 : 0.97);
      const dests = who === 'gtr' ? [o.harm ? P.harmony : P.lead] : [P.brass, P.synth];
      if (orn === 'g' && !o.harm) {   // grace note: a step below when climbing to it, above when falling, ~75 ms before the beat
        let g = m - 1; while (!sc.includes(((g % 12) + 12) % 12)) g -= 1;   // always from the scale step below: an upward flick
        for (const dst of dests) { const p = dst[dst.length - 1]; if (p && p[0] + p[2] > t - 0.08) p[2] = Math.max(0.05, t - 0.085 - p[0]);
          dst.push([t - 0.075, g, 0.07, vel - 6, 'open']); } }
      const art = who === 'gtr' ? (orn === 'b' ? 'bend' : orn === 'f' ? 'release' : (orn === 'v' || l >= 3) ? 'lead' : 'open')
                                : (orn === 'b' && !o.harm ? 'bend' : orn === 'f' ? 'release' : 'open');
      for (const dst of dests) dst.push([t, dst === P.synth ? m : m, d, l >= 2 ? vel : vel - 6, dst === P.synth ? 'open' : art]);
      if (!o.harm) last[who] = m;
    }
  }
  const bell = (slot, m, vel, len) => P.bells.push([E8(slot), into(m, 57, 84), len || D8(slot, 8 - slot, 1) + 0.1, vel, 'open']);
  // bells only ever play chords: the triad, close voiced around C5 (plus the root an octave up for the big ones)
  const toll = (pc, vel, full, len) => { chordPcs(pc).slice(0, 3).forEach((c, i) => bell(0, into(60 + c, 62, 73), vel - i * 4, len));
    if (full) bell(0, into(60 + pc, 62, 73) + 12, vel - 6, len); };
  const triad = pc => chordPcs(pc).slice(0, 3);
  // bass + rhythm guitars: a power chord on every bass note (passing notes as octaves), muted 16th chugs in the gaps
  const ostinato = (notes, chug, vel) => { for (const [s, m, l] of notes) {
      P.bass.push([E8(s), m - 12, D8(s, l, 0.92), s === 0 ? 118 : 108, 'open']);
      const g = into(m, 37, 48), fifth = s === 0 || chordPcs(X.pc).includes((g + 7) % 12);
      for (const n of fifth ? [g, g + 7, g + 12] : [g, g + 12]) P.rhythm.push([E8(s), n, D8(s, l, 0.92), (vel || 120) + (s === 0 ? 4 : 0), 'open']);
      if (chug && l >= 3) for (const q of [1, 2]) for (const n of fifth ? [g, g + 7] : [g]) P.rhythm.push([E8(s + q), n, D8(0, 0.5, 0.9), 100, 'mute']);
    } };
  const strings = (pc, lo, vel, len) => triad(pc).forEach(c => P.strings.push([E8(0), into(c + 60, lo || 60, (lo || 60) + 11), D8(0, len || 8, 0.98), vel || 84, 'open']));
  const choir = (pc, vel) => triad(pc).forEach(c => P.choir.push([E8(0), into(c + 60, 57, 68), D8(0, 8, 0.98), vel || 92, 'open']));
  const pianoStab = (pc, slots) => slots.forEach(s => { P.piano.push([E8(s), into(36 + pc, 36, 47), D8(s, 1, 0.9), 104, 'open']);
    triad(pc).forEach(c => P.piano.push([E8(s), into(c + 60, 60, 71), D8(s, 1, 0.9), 96, 'open'])); });
  const pianoArp = pc => { const tn = triad(pc).map(c => into(c + 60, 60, 71)).sort((a, b) => a - b), seq = [tn[0] - 12, tn[0], tn[1], tn[2], tn[0] + 12, tn[2], tn[1], tn[0]];
    P.piano.push([E8(0), into(36 + pc, 36, 47), D8(0, 8, 0.95), 104, 'open']); seq.forEach((m, i) => P.piano.push([E8(i), m, D8(i, 1, 0.95), i % 2 ? 88 : 98, 'open'])); };
  const timp = (slot, pc, vel) => P.timp.push([E8(slot), into(36 + pc, 41, 52), Math.min(0.6, D8(slot, 8 - slot, 1)), vel || 118, 'open']);   // damped at the barline
  const timpRoll = (from, pc) => { for (let s = from; s < 8; s += 0.5) timp(s, pc, 90 + Math.round((s - from) * 8)); };

  for (const x of bars()) {
    X = x; gi = x.gi; const { sec, b, ph, k, pc, next } = x, mark = Object.fromEntries(Object.entries(P).map(([n, a]) => [n, a.length]));
    if (sec === 'hold') { if (b === 0) {   // one big tonic chord at full energy (cut at ~1.8 s)
        const H = 4.2;   // the held chord rings ~4 s
        for (const n of [41, 48, 53]) P.rhythm.push([E8(0), n, H, 126, 'open']); P.bass.push([E8(0), 29, H, 120, 'open']);
        P.lead.push([E8(0), 77, H, 120, 'bend']); P.harmony.push([E8(0), 72, H, 112, 'lead']); P.brass.push([E8(0), 72, H, 120, 'open'], [E8(0), 77, H, 118, 'open']); P.synth.push([E8(0), 77, H, 116, 'open']);
        bell(0, 65, 124, 9); bell(0, 68, 118, 9); bell(0, 72, 120, 9); bell(0, 77, 116, 9);
        [65, 68, 72].forEach(m => P.strings.push([E8(0), m, H, 100, 'open'])); [60, 65, 68].forEach(m => P.choir.push([E8(0), m, H, 104, 'open']));
        P.timp.push([E8(0), 41, 1.5, 127, 'open']); P.piano.push([E8(0), 29, H, 120, 'open'], [E8(0), 41, H, 116, 'open'], [E8(0), 65, H, 100, 'open'], [E8(0), 68, H, 100, 'open'], [E8(0), 72, H, 100, 'open']); }
    } else if (ph === 'pedal') {
      const bb = bassBar(pc, next, k);
      if (sec === 'intro' && b < 4) {   // piano + bells alone: the ostinato in octaves, the held line on the bells
        for (const [s, m, l] of bb) P.piano.push([E8(s), m, D8(s, l, 0.9), 100, 'open'], [E8(s), m + 12, D8(s, l, 0.9), 92, 'open']);
        if (k % 2 === 0) toll(pc, 104, false, D8(0, 16, 1));
        if (b >= 2) strings(pc, 60, 70);
      } else {
        ostinato(bb, sec === 'A2', sec === 'intro' ? 112 : 120);
        strings(pc, 60, sec === 'A2' ? 96 : 84);
        const up = sec === 'A2' || (sec === 'A' && b >= 8) ? 12 : 0;
        if (sec !== 'intro') { line('brass', LONG[k].map(n => [n[0], n[1] - 12 + up, n[2], n[3]]));
          line('gtr', LONG[k].map(n => [n[0], n[1] - 12 + up, n[2], 'v']), { harm: true, vel: 104 });           // the guitar a third under the brass
          LONG[k].forEach(n => P.strings.push([E8(n[0]), n[1] + up, D8(n[0], n[2], 0.98), 92, 'open'])); }
        if (sec === 'intro') for (const [s, m, l] of bb) P.piano.push([E8(s), m + 12, D8(s, l, 0.9), 94, 'open']);
        else pianoStab(pc, [0, 3, 6]);
        if (sec === 'A' && b === 0) toll(pc, 112, true);
        if (sec === 'A2') { choir(pc, 96); if (k === 0 || k === 4) timp(0, pc); if (k >= 6) timpRoll(k === 6 ? 4 : 0, pc); }
      }
    } else if (ph === 'q' || ph === 'a') {
      ostinato(bassBar(pc, next, k), sec === 'F');
      if (sec === 'B') {   // the duel: pass 1 brass calls / guitar answers; pass 2 the guitar calls / brass answers; last 4 bars together
        const pass = Math.floor(b / 16), callBar = k % 4 < 2, together = pass === 1 && ph === 'a' && k >= 4;
        if (together) { line('brass', THEME[ph][k]); line('gtr', THEME[ph][k], { harm: true, vel: 108 }); }
        else if ((pass === 0) === callBar) line('brass', callBar ? THEME[ph][k] : ANSWER[ph][k]);
        else line('gtr', callBar ? THEME[ph][k] : ANSWER[ph][k], { up: callBar ? -12 : 0 });   // the guitar calls an octave down (heavier)
        strings(pc, 60, 76); if (b >= 8) pianoStab(pc, [0, 3, 6]);
        if (b % 16 === 0) toll(pc, 112, true);
      } else {   // F: the final theme a half step up, guitar and brass in octaves, choir and bells
        line('brass', THEME[ph][k]); line('gtr', THEME[ph][k], { up: -12 });
        strings(pc, 60, 90); choir(pc, 100); pianoStab(pc, [0, 3, 6]);
        if (b === 0 || b === 8) toll(pc, 116, true); if (k === 0) timp(0, pc, 124);
      }
    } else if (ph === 'h') {   // breakdown, half time: ringing chords, piano arpeggios, the guitar sings, then the brass with the guitar under it
      const r2 = 36 + ((pc - 36) % 12 + 12) % 12, g = into(r2, 37, 48);
      P.bass.push([E8(0), r2 - 12, D8(0, 6, 0.95), 116, 'open'], [E8(6), r2, D8(6, 2, 0.9), 104, 'open']);
      for (const n of [g, g + 7, g + 12]) P.rhythm.push([E8(0), n, D8(0, b >= 12 ? 3 : 8, 0.97), b >= 12 ? 120 : 108, 'open']);
      if (b >= 12) for (const n of [g, g + 7, g + 12]) P.rhythm.push([E8(3), n, D8(3, 3, 0.95), 116, 'open'], [E8(6), n, D8(6, 2, 0.95), 118, 'open']);
      pianoArp(pc); strings(pc, 60, 96); if (b >= 8) { strings(pc, 72, 84); choir(pc, 88); }
      if (b < 8) line('gtr', BREAK[b]); else { line('brass', BREAK[b]); line('gtr', BREAK[b], { harm: true, vel: 106 }); }
      if (k % 2 === 0) toll(pc, 108, false); timp(0, pc, 110);
      if (b === 15) timpRoll(4, pc);
    } else if (ph === 'd' || ph === 'e') {
      ostinato(bassBar(pc, next, k), true);
      const pass = sec === 'drop' ? Math.floor(b / 8) : 3;
      line('brass', DROP[ph][k]);
      if (pass === 0) line('gtr', DROP[ph][k], { harm: true, vel: 110 });         // guitar a third under the brass
      else if (pass === 1) line('gtr', DROP[ph][k], { up: -12 });               // octaves
      else { line('gtr', FILLS[k]); if (!FILLS[k].length) line('gtr', DROP[ph][k], { harm: true, vel: 104 }); }   // fills the long notes
      for (const s of [0, 1, 2, 3, 4, 5, 6, 7]) { const c = triad(pc), r = into(60 + c[0], 60, 71), f = into(60 + c[2], 60, 71);   // string ostinato in 8ths
        P.strings.push([E8(s), s % 2 ? f + 12 : r + 12, D8(s, 1, 0.8), s % 2 ? 84 : 96, 'open']); }
      choir(pc, 96); P.piano.push(...DROP[ph][k].map(([s, m, l]) => [E8(s), m + 12, D8(s, l, 0.9), 96, 'open']));
      if (k % 2 === 0) timp(0, pc); if (sec === 'drop' && b === 0) toll(pc, 118, true);
      if (sec === 'end' && k === 7) timpRoll(0, pc);
    } else if (ph === 's') {   // the trading solo
      const r2 = 36 + ((pc - 36) % 12 + 12) % 12, gtrBar = b < 12 && b % 2 === 0, brassBar = b < 12 && b % 2 === 1;
      const bass8 = [[0, r2, 1], [1, r2, 1], [2, r2 + 12, 1], [3, r2, 1], [4, r2, 1], [5, r2 + 12, 1], [6, r2, 1], [7, r2 + 7, 1]];
      if (k === 7) ostinato(bassBar(pc, next, k), false);
      else if (brassBar) ostinato([[0, r2, 3], [3, r2, 3], [6, r2, 2]], false, 124);
      else ostinato(bass8, false, 112);
      if (gtrBar) line('gtr', SOLO[b]);
      else if (brassBar) { for (const s of [0, 3, 6]) triad(pc).forEach((c, i) => { const m = into(c + 72, 70, 81); P.brass.push([E8(s), m, D8(s, s === 6 ? 2 : 1, 0.85), 116, 'open']); if (i === 2) P.synth.push([E8(s), m, D8(s, 1, 0.85), 112, 'open']); });
        pianoStab(pc, [0, 3, 6]); timp(0, pc); }
      else { line('brass', SOLO[b]); line('gtr', SOLO[b], { up: -12 }); }
      strings(pc, 60, 80); if (b >= 12) choir(pc, 96);
    }
    if (x.tr) for (const [n, a] of Object.entries(P)) for (let i = mark[n]; i < a.length; i++) a[i] = [a[i][0], a[i][1] + x.tr, ...a[i].slice(2)];
  }
  const ARPN = [];
  { const ARP = [0, 1, 2, 3, 2, 1, 2, 3, 4, 3, 2, 1, 2, 3, 2, 1];
    for (const x of bars()) { if (!ARP_ON(x.sec, x.b)) continue;
      const cp = chordPcs(x.pc).slice(0, 3).map(c => into(72 + c, 72, 83)).sort((p, q) => p - q), tones = [cp[0], cp[1], cp[2], cp[0] + 12, cp[1] + 12];
      ARP.forEach((kk, s) => ARPN.push([T(x.gi, s), tones[kk] + x.tr, (T(x.gi, s + 1) - T(x.gi, s)) * 0.8, 90, 'open'])); } }
  const part = (notes, o) => Object.assign({ sf: 'musescore', amp: 'none', humanize: 3, notes }, o);
  const B = bars();
  return { bpm: BPM, sections: SECTIONS, colors: COLORS, bar_times: BAR_TIMES.slice(0, TOTAL + 1), bar_tempi: Array.from({ length: TOTAL }, (_, g) => barTempo(g)),
    harmony: B.map(x => ({ tones: chordPcs(x.pc).map(c => (c + x.tr) % 12), scale: barScale(x.pc).map(c => (c + x.tr) % 12) })),
    parts: {
    lead: part(P.lead, { amp: 'lead', label: 'Lead Guitar', humanize: 4, lag: 3, velvar: 6, release: -1800 }),
    harmony: part(P.harmony, { amp: 'lead', label: 'Harmony Guitar', humanize: 7, lag: 9, velvar: 9, cents: -6, release: -1800 }),   // a second player: a hair late, slightly flat, own dynamics
    brassL: part(P.brass, { program: 61, label: 'Brass Section', humanize: 8, velvar: 6, cents: -7 }),
    brassR: part(P.brass, { program: 61, humanize: 10, velvar: 6, cents: 8, lag: 6 }),
    synth: part(P.synth, { record: false, label: 'Synth Brass', program: 62 }),
    rhythmL: part(P.rhythm, { amp: 'modern', humanize: 6, release: -1400 }),
    rhythmR: part(P.rhythm.filter(n => !P.rhythm.some(o => o[0] === n[0] && o[1] === n[1] - 12)), { amp: 'modern', humanize: 9, velvar: 10, cents: 8, release: -1400 }),
    bass: part(P.bass, { program: 34, amp: 'bass', humanize: 3, release: -1400 }),
    strings: part(P.strings, { program: 48, humanize: 4 }),
    choir: part(P.choir, { program: 52, label: 'Choir', humanize: 6 }),
    piano: part(P.piano, { program: 0, humanize: 5 }),
    bells: part(P.bells, { sf: '../soundfonts/TubularBells.sf2', program: 0, label: 'Bells', humanize: 2 }),
    timp: part(P.timp, { program: 47, humanize: 2 }),
    arp: part(ARPN, { record: false, label: 'Synth Arp', program: 80 }),
  } };
}

// ---------------- the mix ----------------
async function renderSong() {
  const SR = 44100, BARS = bars();
  const tHold = T(START.hold, 0), tCut = tHold + 4.0, dur = tCut + 4.0;   // the held chord ~4 s, then the tail
  const rand = (() => { let s = 2001; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * dur), SR);
  const has = n => (window.ASSET_NAMES || []).indexOf(n) >= 0;
  const SOLO = window.SOLO, ON = n => !SOLO || SOLO === 'all' || SOLO === n, DRUMS_ON = ON('drums');
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = SOLO ? 1 : 2.2; comp.attack.value = 0.01; comp.release.value = 0.12;
  const master = ctx.createGain(); master.gain.value = 0.8;
  const eqChain = (src, eq) => { let n = src; for (const [type, f, g, q] of eq || []) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (g != null) b.gain.value = g; b.Q.value = q || 0.7; n.connect(b); n = b; } return n; };
  const HP = f => ['highpass', f, null, 0.7], LP = f => ['lowpass', f, null, 0.7], PK = (f, g, q) => ['peaking', f, g, q || 1];
  const brakeLP = ctx.createBiquadFilter(); brakeLP.type = 'lowpass'; brakeLP.frequency.value = 20000; brakeLP.Q.value = 0.7;   // closes during a brake
  master.connect(brakeLP); eqChain(brakeLP, [['lowshelf', 90, -1.5], PK(250, 2, 0.8), PK(800, -4, 0.7)]).connect(comp); comp.connect(ctx.destination);
  for (const gb of BRAKES) { const a = T(gb, 0), b = T(gb + 1, 0); brakeLP.frequency.setValueAtTime(20000, a); brakeLP.frequency.exponentialRampToValueAtTime(350, b - 0.02); brakeLP.frequency.setValueAtTime(20000, b); }
  const dry = ctx.createGain(); dry.connect(master);
  const verb = ctx.createConvolver();
  { const len = SR * 2.2, ir = ctx.createBuffer(2, len, SR); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, 2.6); } verb.buffer = ir; }
  const verbOut = ctx.createGain(); verbOut.gain.value = 0.35; eqChain(verb, [LP(5000)]).connect(verbOut); verbOut.connect(master);
  const delay = ctx.createDelay(2), delay2 = ctx.createDelay(2); delay.delayTime.value = delay2.delayTime.value = STEP * 3;
  const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3000; dlp.Q.value = 0;
  const fb = ctx.createGain(); fb.gain.value = 0.3; const dL = ctx.createStereoPanner(), dR = ctx.createStereoPanner(); dL.pan.value = -0.8; dR.pan.value = 0.8;
  const dOut = ctx.createGain(); dOut.gain.value = 0.4;
  delay.connect(dlp); dlp.connect(dL); dL.connect(dOut); dlp.connect(delay2); delay2.connect(dR); dR.connect(dOut); dOut.connect(master); delay2.connect(fb); fb.connect(delay);
  const send = (node, v, echo) => { const g = ctx.createGain(); g.gain.value = v; node.connect(g); g.connect(verb); if (echo) g.connect(delay); };
  const ducks = [];
  // per-section level rides (dB), so each instrument gets moments where it's in front; every change glides over half a bar
  const RIDE = {
    piano: x => x.sec === 'intro' && x.b < 4 ? 5 : x.sec === 'C' ? 4 : x.sec === 'drop' ? 1 : 0,
    rhythmL: x => x.sec === 'C' && x.b < 12 ? -6 : x.sec === 'intro' ? -2 : 0,
    rhythmR: x => x.sec === 'C' && x.b < 12 ? -6 : x.sec === 'intro' ? -2 : 0,
    strings: x => x.sec === 'C' ? 3 : x.sec === 'drop' || x.sec === 'end' ? 2 : x.sec === 'A' || x.sec === 'A2' ? 1 : 0,
    bells: x => x.sec === 'intro' ? 3 : 0,
    choir: x => x.sec === 'F' || x.sec === 'end' ? 2 : 0,
    bass: x => x.sec === 'C' ? -3 : 0,
  };
  function levelRide(gainNode, fn) { let prev = null;
    for (const x of BARS) { const v = Math.pow(10, fn(x) / 20); if (prev === null) gainNode.gain.setValueAtTime(v, 0);
      else if (v !== prev) { gainNode.gain.setValueAtTime(prev, T(x.gi - 1, 8)); gainNode.gain.linearRampToValueAtTime(v, T(x.gi, 0)); } prev = v; } }

  // ---- recorded stems ----
  async function stem(name, pan, targetDb, verbAmt, echo, eq, duck, rings) {   // rings: not cut at the end (bells)
    if (!has('stem/' + name) || !ON(name)) return;
    const buf = await loadAsset('stem/' + name, ctx), d = buf.getChannelData(0);
    let sum = 0, n = 0; for (let i = 0; i < d.length; i += 4) { const a = Math.abs(d[i]); if (a > 1e-3) { sum += a * a; n++; } }
    const rms = Math.sqrt(sum / Math.max(1, n)) || 1e-3, src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = Math.pow(10, targetDb / 20) / rms; const p = ctx.createStereoPanner(); p.pan.value = pan;
    src.connect(g); let out = eqChain(g, eq);
    if (RIDE[name]) { const r = ctx.createGain(); levelRide(r, RIDE[name]); out.connect(r); out = r; }
    if (duck) { const dg = ctx.createGain(); out.connect(dg); out = dg; ducks.push([dg, duck]); }
    out.connect(p); p.connect(rings ? master : dry); send(p, verbAmt, echo); src.start(0); if (!rings) src.stop(tCut + 0.03);
  }
  const GTR = [HP(45), PK(4200, -5, 0.8), LP(8500)];
  await stem('rhythmL', -0.75, -14, 0.03, false, GTR, 0.25);
  await stem('rhythmR', 0.75, -14, 0.03, false, GTR, 0.25);
  // the duel: lead guitar just left of centre, the brass section spread wide around it, at the same level
  // the lead guitar: darker (top rolled off from ~4 kHz, more 500-900 Hz body) and louder, the brass's equal in the duel
  await stem('lead', -0.15, -8.5, 0.18, true, [HP(90), PK(650, 2.5, 0.9), PK(1600, 1, 0.9), PK(3200, -4, 0.9), LP(4800)]);
  await stem('harmony', 0.35, -10.5, 0.2, true, [HP(90), PK(650, 2, 0.9), PK(3200, -4, 0.9), LP(4600)]);   // the second guitarist, panned apart
  await stem('brassL', -0.6, -12.5, 0.3, true, [HP(150), LP(7000)]);
  await stem('brassR', 0.6, -12.5, 0.3, true, [HP(150), LP(7000)]);
  await stem('strings', 0.35, -15, 0.45, false, [HP(280), PK(3000, 1.5, 1), LP(10000)]);
  await stem('choir', -0.35, -17, 0.55, false, [HP(200), LP(8000)]);
  await stem('piano', -0.25, -14, 0.3, false, [HP(80), PK(2500, 2, 1)], 0.15);
  await stem('timp', 0.1, -14, 0.35, false, [HP(40)]);
  await stem('bells', 0.15, -14, 0.5, false, [HP(250), PK(2500, 2, 1)], 0, true);
  await stem('bass', 0, -24, 0, false, [HP(55), PK(300, -2, 1), LP(2200)], 0.5);

  // ---- synth brass under the brass section: a wide detuned saw stack, low-passed round ----
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const leadBus = ctx.createGain(); leadBus.gain.value = ON('synth') ? 0.16 : 0;
  const leadDrive = ctx.createWaveShaper(); { const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(1.8 * x) / Math.tanh(1.8); } leadDrive.curve = c; }
  leadBus.connect(leadDrive); const leadOut = ctx.createGain(); eqChain(leadDrive, [HP(200), PK(1100, 3, 0.8), LP(3400)]).connect(leadOut); leadOut.connect(dry); send(leadOut, 0.18, true);
  function synthBrass(t, m, len, vel) {
    const v = vel / 127, end = t + len;
    for (const [cents, pan, amp] of [[-12, -0.7, 0.5], [12, 0.7, 0.5], [-4, -0.3, 0.3], [5, 0.3, 0.3]]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = cents;
      const g = ctx.createGain(), p = ctx.createStereoPanner(); p.pan.value = pan;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(amp * v, t + 0.012); g.gain.setValueAtTime(amp * v, Math.max(t + 0.013, end - 0.05)); g.gain.linearRampToValueAtTime(0.0001, end);
      o.connect(g); g.connect(p); p.connect(leadBus); o.start(t); o.stop(end + 0.02);
    }
  }
  const EV = guitarEvents();
  for (const [t, m, len, vel] of EV.parts.synth.notes) if (t < tCut) synthBrass(t, m, Math.min(len, tCut - t), vel);
  // ---- a bright 16th-note arpeggio (plucked square) ----
  const arpBus = ctx.createGain(); arpBus.gain.value = ON('arp') ? 0.09 : 0;
  const arpPan = ctx.createStereoPanner(); arpPan.pan.value = -0.2; eqChain(arpBus, [HP(400), LP(6000)]).connect(arpPan); arpPan.connect(dry); send(arpPan, 0.12, true);
  for (const [t, m, d] of EV.parts.arp.notes) { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = hz(m);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.8, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(arpBus); o.start(t); o.stop(t + d + 0.01); }

  // ---------------- drums: chopped breakbeats over a distorted hardcore kick, changing every 4 bars ----------------
  const drumBus = ctx.createGain(); drumBus.gain.value = DRUMS_ON ? 1 : 0;
  eqChain(drumBus, [HP(30), PK(380, -3, 1), PK(4500, 1.5, 0.9)]).connect(dry); send(drumBus, 0.05);
  const kickBus = ctx.createGain(); kickBus.gain.value = 0.9;
  const kickDrive = ctx.createWaveShaper(); { const c = new Float32Array(2048); for (let i = 0; i < 2048; i++) { const x = i / 1023.5 - 1; c[i] = Math.tanh(7 * x) / Math.tanh(7); } kickDrive.curve = c; kickDrive.oversample = '2x'; }
  kickBus.connect(kickDrive); const kickLevel = ctx.createGain(); kickLevel.gain.value = 0.3; eqChain(kickDrive, [PK(400, -3, 1), LP(9000)]).connect(kickLevel); kickLevel.connect(drumBus);
  const noise = (() => { const b = ctx.createBuffer(1, SR * 2, SR), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1; return b; })();
  const DLOG = { break: [], layer: [], kick: [] };
  function duckAll(t, v) { for (const [g, depth] of ducks) { g.gain.setTargetAtTime(1 - depth * v, t, 0.002); g.gain.setTargetAtTime(1, t + 0.06, 0.05); } }
  // the breaks, heavier: saturated (tanh), more low end and snare body, a little compression to thicken the tails
  const breakBus = ctx.createGain(); breakBus.gain.value = 1.25;
  const breakDrive = ctx.createWaveShaper(); { const c = new Float32Array(2048); for (let i = 0; i < 2048; i++) { const x = i / 1023.5 - 1; c[i] = Math.tanh(2.6 * x) / Math.tanh(2.6); } breakDrive.curve = c; breakDrive.oversample = '2x'; }
  const breakComp = ctx.createDynamicsCompressor(); breakComp.threshold.value = -18; breakComp.ratio.value = 3; breakComp.attack.value = 0.006; breakComp.release.value = 0.08;
  breakBus.connect(breakDrive); const breakOut = ctx.createGain(); breakOut.gain.value = 0.8;
  eqChain(breakDrive, [['lowshelf', 120, 4], PK(220, 3, 1), PK(500, -2, 1), LP(12000)]).connect(breakComp); breakComp.connect(breakOut); breakOut.connect(drumBus);
  const BRK = {}; for (const k of ['amen_yki', 'amen_df', 'steppin1', 'steppin2', 'bloodfire']) if (has('break/' + k)) BRK[k] = await loadAsset('break/' + k, ctx);
  const INFO = window.BREAK_INFO || {}, bStep = 60 / 160 / 4;   // the loops are 160 BPM
  const bpmAt = (gi, s) => { const [a, b] = barTempo(gi); return a + (b - a) * s / 16; };
  function slice(name, gi, s, idx, len, vol) {   // one break slice at step s of bar gi, sped up to the local tempo
    const buf = BRK[name]; if (!buf || !INFO[name]) return; const t = T(gi, s), rate = bpmAt(gi, s) / 160;
    const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    const g = ctx.createGain(), d = len * bStep / rate, v = vol == null ? 1 : vol;
    g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + Math.max(0.005, d - 0.008)); g.gain.linearRampToValueAtTime(0, t + d);
    src.connect(g); g.connect(breakBus); src.start(t, (idx % INFO[name].steps) * bStep, len * bStep); src.stop(t + d + 0.01);
    DLOG.break.push([t, Math.min(d, STEP * 1.6), idx % 12]);
  }
  const groove = (name, gi, loopBar, vol, upto) => { const i0 = (loopBar % (INFO[name] ? INFO[name].steps / 16 : 2)) * 16; for (let s = 0; s < (upto || 16); s++) slice(name, gi, s, i0 + s, 1, vol); };
  // a chop pattern: one char per 16th; K = the break's kick slice, S = snare, g = ghost, '.' = nothing
  const chop = (name, gi, pat, vol, from) => { for (let s = from || 0; s < 16; s++) { const c = pat[s]; if (c === '.' || !INFO[name]) continue;
    slice(name, gi, s, INFO[name][c === 'K' ? 'kick' : c === 'S' ? 'snare' : 'ghost'], 1, (vol || 1) * (c === 'g' ? 0.7 : 1)); } };
  function kick(t, v, pf) {   // the hardcore kick: pitch drop to C2 with a saturated body; pf < 1 bends it down (brakes)
    pf = pf || 1; const o = ctx.createOscillator(); o.frequency.setValueAtTime(320 * pf, t); o.frequency.exponentialRampToValueAtTime(110 * pf, t + 0.035); o.frequency.exponentialRampToValueAtTime(65.4 * pf, t + 0.13);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.95 * v, t); g.gain.setValueAtTime(0.85 * v, t + 0.14); g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    o.connect(g); g.connect(kickBus); o.start(t); o.stop(t + 0.28); duckAll(t, v); DLOG.kick.push([t, STEP, 60]);
  }
  function nz(t, d, type, f, q, v, pan) { const s = ctx.createBufferSource(); s.buffer = noise; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); const p = ctx.createStereoPanner(); p.pan.value = pan || 0;
    s.connect(fl); fl.connect(g); g.connect(p); p.connect(drumBus); s.start(t, rand() * 0.8, d + 0.02); }
  function tone(t, f0, f1, d, v, type) { const o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d * 0.6);
    const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(g); g.connect(drumBus); o.start(t); o.stop(t + d + 0.02); }
  const snare = (t, v) => { nz(t, 0.14, 'bandpass', 2400, 0.7, 1.1 * v); tone(t, 230, 175, 0.1, 0.45 * v, 'triangle'); DLOG.layer.push([t, STEP, 0]); };
  let HN = 0; const hat = (t, v, open) => { nz(t, open ? 0.16 : 0.045, 'highpass', 7000, 0.7, 0.55 * v, HN++ % 2 ? 0.3 : -0.3); };
  const ride = (t, v) => { nz(t, 0.35, 'bandpass', 6500, 1.2, 0.3 * v, 0.35); tone(t, 3150, 3100, 0.4, 0.04 * v, 'triangle'); };
  const crash = (t, v) => { nz(t, 1.8, 'highpass', 4500, 0.5, 0.42 * (v || 1), -0.25); nz(t, 1.4, 'bandpass', 3200, 0.8, 0.25 * (v || 1), 0.25); DLOG.layer.push([t, STEP * 4, 6]); };
  const tom = (t, hi, v) => { tone(t, hi ? 190 : 120, hi ? 120 : 75, 0.3, 0.9 * v); nz(t, 0.06, 'bandpass', 1800, 1, 0.25 * v); DLOG.layer.push([t, STEP * 2, hi ? 3 : 1]); };
  const PAT = {   // 16th-note chop patterns
    A1: 'K.g.S..gK.K.S.g.', A2: 'K..gS.g.KK..S..g', TS: 'K.....S...K...S.', DN: 'KgSgK.SgKgS.KSgS',
    HF: 'K.......S.......', ST: 'K..K..S.K..K..S.' };
  const fill = (gi, from, big, name) => { for (let s = from; s < 16; s++) { slice(name, gi, s, INFO[name] ? INFO[name].snare : 0, 1, 0.6 + 0.4 * (s - from) / (16 - from)); if (big && s >= 12) tom(T(gi, s), s < 14, 0.8); } };
  for (const x of BARS) {
    const { sec, b, k, gi } = x, at = s => T(gi, s), brake = BRAKES.includes(gi), q4 = Math.floor(b / 4);
    const four = v => { for (const s of [0, 4, 8, 12]) kick(at(s), v || (s === 0 ? 1 : 0.92), brake ? 1 - 0.13 * s / 4 : 1); };
    const hats8 = v => { for (let s = 0; s < 16; s += 2) hat(at(s), (s % 4 === 2 ? 1 : 0.6) * (v || 1), s % 4 === 2); };
    const hats16 = v => { for (let s = 0; s < 16; s++) hat(at(s), (s % 4 === 2 ? 1 : s % 2 ? 0.4 : 0.6) * (v || 1), s % 4 === 2); };
    if (sec === 'hold') { if (b === 0) { kick(at(0), 1.1); crash(at(0), 1.2); snare(at(0), 1); } continue; }
    if (sec === 'intro') {
      if (b === 0) crash(at(0), 0.6);
      if (b >= 4) { kick(at(0), 0.9); kick(at(8), 0.85); hats8(0.7); }
      if (b === 6) { kick(at(12), 0.8); }
      if (b === 7) { four(); for (let s = 4; s < 16; s += s < 8 ? 2 : 1) snare(at(s), 0.4 + 0.6 * s / 16); }
    } else if (sec === 'A') {
      four(); if (k === 0) crash(at(0));
      if (b < 8) groove(b < 4 ? 'amen_yki' : 'amen_df', gi, b, 0.95, k === 7 ? 8 : k === 3 ? 12 : 16);
      else chop('amen_yki', gi, [PAT.A1, PAT.A2, PAT.A1, PAT.DN][q4 % 4], 0.95, 0);
      hats8(0.6);
      if (k === 3) fill(gi, 12, false, 'amen_yki'); if (k === 7) fill(gi, 8, true, 'amen_df');
    } else if (sec === 'B') {   // eight 4-bar variations over the 32-bar duel
      const v = q4 % 8;
      if (v === 0) { four(); groove('amen_df', gi, b, 0.95, k === 7 ? 12 : 16); hats8(0.5); }
      else if (v === 1) { four(); chop('amen_yki', gi, PAT.A1, 0.95); }
      else if (v === 2) { [0, 10].forEach(s => kick(at(s), 1)); chop('steppin2', gi, PAT.TS, 1); hats16(0.6); }
      else if (v === 3) { four(); chop('amen_df', gi, PAT.A2, 0.95); ride(at(0), 1); for (let s = 4; s < 16; s += 4) ride(at(s), 0.7); }
      else if (v === 4) { four(); groove('steppin1', gi, b, 0.9, k === 7 ? 12 : 16); hats16(0.5); }
      else if (v === 5) { four(); [6, 14].forEach(s => kick(at(s), 0.7)); chop('amen_yki', gi, PAT.DN, 0.9); }
      else if (v === 6) { [0, 6, 12].forEach(s => kick(at(s), 1)); chop('amen_df', gi, PAT.ST, 1); hats8(0.7); }
      else { four(); chop('amen_yki', gi, b % 2 ? PAT.DN : PAT.A1, 0.95); hats16(0.5); }
      if (k === 0) crash(at(0), b % 16 === 0 ? 1.1 : 0.8);
      if (k === 7) fill(gi, b % 16 === 15 ? 8 : 12, b % 16 === 15, 'amen_yki');
    } else if (sec === 'C') {   // half time: kick 1, snare 3, ride; then a build
      kick(at(0), 1); if (b >= 4 && b < 12) kick(at(10), 0.8);
      if (b < 12) { slice('amen_df', gi, 8, INFO.amen_df ? INFO.amen_df.snare : 0, 2, 1); snare(at(8), 0.8); for (let s = 0; s < 16; s += 2) ride(at(s), s % 4 ? 0.6 : 1); }
      else { const step = b === 12 ? 4 : b === 13 ? 2 : 1; for (let s = b === 12 ? 8 : 0; s < 16; s += step) snare(at(s), 0.35 + 0.65 * ((b - 12) * 16 + s) / 64); four(0.8);
        if (b === 15) for (let s = 8; s < 16; s += 2) tom(at(s), s < 12, 0.9); }
      if (b === 0 || b === 8) crash(at(0));
    } else if (sec === 'A2') {   // tutti: kicks and crashes on the 3+3+2 hits with the band
      if (!brake) { [0, 6, 12].forEach(s => { kick(at(s), 1); crash(at(s), s ? 0.6 : 1); }); [4, 14].forEach(s => snare(at(s), 0.9)); hats16(0.5); chop('amen_yki', gi, '....S.....g...S.', 0.8); }
      else { four(); for (let s = 0; s < 16; s++) snare(at(s), 0.3 + 0.6 * s / 16); }
    } else if (sec === 'drop' || sec === 'end') {
      const blast = sec === 'drop' && b >= 16 && b < 20;
      if (brake) { four(); for (let s = 0; s < 16; s++) snare(at(s), 0.3 + 0.6 * s / 16); }
      else if (blast) { for (let s = 0; s < 16; s += 2) kick(at(s), s % 4 ? 0.8 : 1); [2, 6, 10, 14].forEach(s => { snare(at(s), 0.9); slice('bloodfire', gi, s, INFO.bloodfire ? INFO.bloodfire.snare : 0, 1, 0.7); }); for (let s = 0; s < 16; s += 4) ride(at(s), 1); }
      else { four(); for (const s of [1, 5, 9, 13]) kick(at(s), 0.6);   // double kicks
        [4, 12].forEach(s => snare(at(s), 1)); groove('bloodfire', gi, b, 0.6, k === 7 ? 12 : 16); hats16(0.6);
        if (k === 7) fill(gi, 12, b === 23, 'bloodfire'); }
      if (k % 4 === 0) crash(at(0), k === 0 ? 1.1 : 0.8);
    } else if (sec === 'S') {   // the trade: busy chops under the guitar, unison accents with the brass stabs
      const brassBar = b < 12 && b % 2 === 1;
      if (b >= 12) { for (let s = 0; s < 16; s++) kick(at(s), s % 4 ? 0.55 : 1); [4, 12].forEach(s => snare(at(s), 1)); for (let s = 0; s < 16; s += 2) ride(at(s), 0.8);
        if (b === 15) for (let s = 8; s < 16; s++) { snare(at(s), 0.5 + 0.5 * (s - 8) / 8); if (s % 2 === 0) tom(at(s), s < 12, 0.8); } }
      else if (brassBar) { [0, 6, 12].forEach(s => { kick(at(s), 1); crash(at(s), 0.55); }); snare(at(14), 1); }
      else { four(); chop('amen_yki', gi, b % 4 === 0 ? PAT.DN : PAT.A2, 0.95); hats16(0.5); }
      if (b === 0 || b === 12) crash(at(0), 1.1);
    } else if (sec === 'F') {   // the final theme: the busiest variations, a crash every 4 bars
      four(); const v = q4 % 4;
      chop(v % 2 ? 'amen_df' : 'amen_yki', gi, [PAT.A1, PAT.DN, PAT.A2, PAT.DN][v], 0.95); if (v === 1 || v === 3) [6, 14].forEach(s => kick(at(s), 0.7));
      if (v === 2) for (let s = 0; s < 16; s += 2) ride(at(s), 0.8); else hats16(0.55);
      if (k % 4 === 0) crash(at(0), k === 0 ? 1.1 : 0.8);
      if (k === 7) fill(gi, b === 15 ? 8 : 12, b === 15, 'amen_yki');
    }
  }
  // ---- the ending: full energy until the cut, then only the reverb tail ----
  dry.gain.setValueAtTime(1, tCut); dry.gain.linearRampToValueAtTime(0, tCut + 0.06);
  master.gain.setValueAtTime(0.8, dur - 2.2); master.gain.linearRampToValueAtTime(0, dur);
  const out = await ctx.startRendering();
  const L = out.getChannelData(0), R = out.getChannelData(1), n = L.length, wavBuf = new ArrayBuffer(44 + n * 4), v = new DataView(wavBuf);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const norm = window.SOLO_NORM || (peak > 0 ? 0.95 / peak : 1);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, n * 4, true);
  for (let i = 0, o = 44; i < n; i++, o += 4) { v.setInt16(o, Math.max(-1, Math.min(1, L[i] * norm)) * 32767, true); v.setInt16(o + 2, Math.max(-1, Math.min(1, R[i] * norm)) * 32767, true); }
  let bin = ''; const u8 = new Uint8Array(wavBuf); for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
  return { wav: btoa(bin), seconds: dur, peak, drums: DLOG };
}

