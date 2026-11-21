// An original SOLO PIANO piece in the style of the first 24 s and 0:52-1:02 of "oh nameless sky" (azali): aggressive
// but heartfelt.
// Devices measured from the reference, not its notes: ~198 BPM, a minor key, one chord per bar in descending emotional
// progressions with borrowed major chords (a major IV, a major V, a secondary dominant), one piano: heavily pedalled,
// saturated, dark and very wide, pounding low octaves under a melody in octaves (8ths and quarters), and tape-stop pitch
// dives on the whole mix at bar ends.
// E minor; the last section lifts a half step to F minor. The piano is the house Salamander Grand.
const BPM = 198, STEP = 60 / BPM / 4, BAR = STEP * 16;

// ---- harmony: chords by name (pitch classes, root first) and the bass note under each ----
const CH = { Em: [4, 7, 11], C: [0, 4, 7], D: [2, 6, 9], B: [11, 3, 6], B7: [11, 3, 6, 9], A: [9, 1, 4], Am: [9, 0, 4], G: [7, 11, 2],
  'F#7': [6, 10, 1, 4], C7: [0, 4, 7, 10] };
const BASSOF = { 'D/F#': ['D', 6], 'B/D#': ['B', 3], 'G/B': ['G', 11], 'Em/G': ['Em', 7] };   // inversions: [chord, bass pc]
const chordOf = n => BASSOF[n] ? BASSOF[n][0] : n, bassOf = n => BASSOF[n] ? BASSOF[n][1] : CH[n][0];
const KEY = [4, 6, 7, 9, 11, 0, 2];   // E natural minor
const barScale = n => { const t = CH[chordOf(n)]; let s = KEY.slice(); for (const c of t) if (!s.includes(c)) s = s.filter(k => k !== (c + 11) % 12 && k !== (c + 1) % 12).concat([c]); return s; };   // chord tones replace their clashing neighbours (D# for D, C# for C...)
const into = (m, lo, hi) => { while (m < lo) m += 12; while (m > hi) m -= 12; return m; };
const PROG = {
  P1: ['Em', 'C', 'D', 'B', 'Em', 'A', 'C', 'B7'],                 // i - VI - VII - V - i - IV(major) - VI - V7
  P2: ['A', 'D', 'C', 'B', 'Em', 'F#7', 'B', 'B7'],                // IV - VII - VI - V (descending), i - V/V - V
  P3: ['Em', 'D/F#', 'G', 'A', 'C', 'B/D#', 'Em', 'D'],            // the bass climbs E F# G A C D# E D (like 0:52)
  P3b: ['Em', 'D/F#', 'G', 'A', 'C', 'B/D#', 'Am', 'B7'],
  PD: ['C', 'G/B', 'Am', 'Em/G', 'C', 'D', 'B7', 'B7'],            // the piano section
  PD2: ['C', 'G/B', 'Am', 'Em/G', 'C', 'D', 'B7', 'C7'],           // ... its last bar pivots to C7 (V of F minor)
  PE: ['C', 'D', 'B7', 'Em'],
  BRK: ['Em', 'B7'],
};
const SECTIONS = [['intro', 8], ['A', 16], ['brk', 2], ['B', 16], ['C', 16], ['D', 16], ['E', 16], ['end', 4], ['hold', 2]];
const PLAN = { intro: ['P1'], A: ['P1', 'P2'], brk: ['BRK'], B: ['P3', 'P3b'], C: ['P1', 'P2'], D: ['PD', 'PD2'], E: ['P1', 'P2'], end: ['PE'], hold: [] };
const TRANS = { E: 1, end: 1, hold: 1 };
const LEN = Object.fromEntries(SECTIONS), START = {}; { let g = 0; for (const [n, l] of SECTIONS) { START[n] = g; g += l; } }
const TOTAL = SECTIONS.reduce((a, x) => a + x[1], 0);
function barTempo(gi) { return gi >= START.hold ? [140, 140] : [BPM, BPM]; }   // steady; the dives do the bending
const BRAKES = [];
const TT = []; { let t = 0; for (let gi = 0; gi < TOTAL + 1; gi++) { const [a, b] = barTempo(Math.min(gi, TOTAL - 1)), row = [t];
  for (let k = 0; k < 16; k++) { const bpm = a + (b - a) * (k + 0.5) / 16; t += 60 / bpm / 4; row.push(t); } TT.push(row); } }
function T(gi, s) { while (s >= 16 && gi < TOTAL) { s -= 16; gi++; } const k = Math.floor(s), f = s - k, row = TT[gi]; return row[k] + (k < 16 ? (row[k + 1] - row[k]) * f : 0); }
const BAR_TIMES = TT.map(r => r[0]);
const COLORS = { intro: '#7a8cff', A: '#5f74ff', brk: '#b0b8ff', B: '#9a5cff', C: '#5f74ff', D: '#8fb4ff', E: '#c06cff', end: '#9a5cff', hold: '#e0e4ff' };
// the tape-stop dives: the last half bar of these bars dives (whole mix), then the next downbeat snaps back
const DIVE_BARS = () => [3, START.A + 7, START.B + 3, START.B + 11, START.C + 15, START.E + 7, START.E + 15];

function bars() {
  const out = []; let gi = 0;
  for (const [sec, n] of SECTIONS) for (let b = 0; b < n; b++, gi++) {
    const ph = PLAN[sec].length ? PLAN[sec][Math.floor(b / 8) % PLAN[sec].length] : null, prog = ph ? PROG[ph] : ['Em'];
    out.push({ sec, b, gi, t0: T(gi, 0), ph, k: b % 8, name: prog[b % prog.length], tr: TRANS[sec] || 0 });
  }
  out.forEach((x, i) => { x.chord = chordOf(x.name); x.bass = bassOf(x.name); x.next = (out[i + 1] || x).name; });
  return out;
}
const ARP_ON = () => false;

// ---- the hand-written lines, in 8ths: [slot, midi, length, ornament] (E4 = 64). 'g' an upward grace note, 'f' a fall,
// 'b' a bend, 'v' vibrato. Every note checked against its chord by check_notes.js ----
const TA = [
  [[0, 71, 2], [2, 79, 2], [4, 78, 1], [5, 76, 1], [6, 71, 2]],        // Em  B G (F#) E B
  [[0, 72, 3], [3, 76, 3], [6, 79, 2]],                                // C   C E G
  [[0, 78, 2], [2, 81, 2, 'g'], [4, 78, 2], [6, 74, 2]],               // D   F# A F# D
  [[0, 75, 6], [6, 71, 2]],                                            // B   D# (the leading tone, held) B
  [[0, 76, 2], [2, 83, 2, 'g'], [4, 81, 1], [5, 79, 1], [6, 76, 2]],   // Em  E B (A) G E
  [[0, 76, 3], [3, 73, 3], [6, 69, 2]],                                // A   E C# A: the major IV
  [[0, 72, 2], [2, 76, 2], [4, 79, 2], [6, 81, 1], [7, 79, 1]],        // C   C E G (A) G
  [[0, 78, 4], [4, 75, 2], [6, 71, 2, 'f']] ];                         // B7  F# D# B
const TB = [
  [[0, 81, 3], [3, 76, 3], [6, 73, 2]],                                // A   A E C#
  [[0, 74, 2], [2, 78, 2], [4, 81, 4, 'g']],                           // D   D F# A
  [[0, 79, 3], [3, 76, 3], [6, 72, 2]],                                // C   G E C
  [[0, 78, 6], [6, 75, 2]],                                            // B   F# D#
  [[0, 76, 2], [2, 79, 2], [4, 83, 4, 'g']],                           // Em  E G B
  [[0, 82, 3], [3, 78, 3], [6, 76, 2]],                                // F#7 A# F# E
  [[0, 75, 3], [3, 78, 3], [6, 83, 2]],                                // B   D# F# B
  [[0, 81, 4], [4, 78, 2], [6, 75, 2]] ];                              // B7  A F# D#
const TC = [   // over the climbing bass: long notes
  [[0, 79, 4], [4, 76, 4]], [[0, 78, 4], [4, 74, 4]], [[0, 79, 4], [4, 83, 4, 'g']], [[0, 81, 6], [6, 85, 2]],
  [[0, 84, 4], [4, 79, 4]], [[0, 83, 4], [4, 78, 4]], [[0, 79, 4], [4, 76, 4]], [[0, 78, 6], [6, 81, 2, 'g']] ];
const TC2 = TC.slice(0, 6).concat([[[0, 76, 4], [4, 72, 4]], [[0, 75, 4], [4, 78, 2], [6, 81, 2]]]);   // ... Am, B7
const TD = [
  [[0, 76, 3], [3, 79, 3], [6, 84, 2]], [[0, 83, 4], [4, 79, 2], [6, 74, 2]], [[0, 76, 3], [3, 72, 3], [6, 69, 2]],
  [[0, 71, 6], [6, 76, 2]], [[0, 79, 3], [3, 84, 3, 'g'], [6, 79, 2]], [[0, 81, 3], [3, 78, 3], [6, 74, 2]],
  [[0, 78, 4], [4, 81, 2], [6, 75, 2]], [[0, 71, 8, 'f']] ];
const TD2 = TD.slice(0, 7).concat([[[0, 76, 4], [4, 79, 2], [6, 82, 2]]]);   // the C7 pivot: E G Bb -> F minor
const TE = [[[0, 79, 4], [4, 76, 4]], [[0, 78, 4], [4, 81, 4, 'g']], [[0, 78, 4], [4, 75, 4]], [[0, 76, 8]]];
const MEL = { P1: TA, P2: TB, P3: TC, P3b: TC2, PD: TD, PD2: TD2, PE: TE };

// ---------------- the parts: one piano (the house Salamander Grand), two hands ----------------
// Aggressive: the left hand pounds octaves in 8ths, the right hand plays the melody in octaves filled with chord tones,
// hard. Heartfelt: the progressions and the melody; the piano section and the breath play softly shaped arpeggios.
// The two hands are recorded as separate parts of the same piano (same sound, same place), so they can be balanced.
function guitarEvents() {
  const P = { lh: [], rh: [] };
  let gi = 0, X = null;
  const E8 = slot => T(gi, slot * 2), D8 = (slot, len, k) => (T(gi, (slot + len) * 2) - T(gi, slot * 2)) * k;
  const tones = () => CH[X.chord];
  const PEDAL = [];
  const pedalBar = (half) => { if (half) { PEDAL.push([T(gi, 0) + 0.06, T(gi, 8) + 0.012]); PEDAL.push([T(gi, 8) + 0.06, T(gi + 1, 0) + 0.012]); }
    else PEDAL.push([T(gi, 0) + 0.07, T(gi + 1, 0) + 0.015]); };
  const key = (hand, t, m, d, v) => P[hand].push([t, m, d, Math.max(36, Math.min(127, Math.round(v))), 'open']);
  const rolled = (hand, t, ms, d, v) => ms.slice().sort((a, b) => a - b).forEach((m, i, arr) => key(hand, t + i * 0.006, m, d, i === arr.length - 1 ? v + 4 : i === 0 ? v : v - 8));
  const low = () => into(24 + X.bass, 28, 39);   // the bass note, E1..D#2 region
  // ---- left hand ----
  const pound = (v) => { const b = low(); for (let s = 0; s < 8; s++) { const acc = s === 0 ? 10 : s % 2 ? -6 : 0;   // 8th-note octaves
      key('lh', E8(s), b, D8(s, 1, 0.85), v + acc); key('lh', E8(s) + 0.004, b + 12, D8(s, 1, 0.85), v + acc - 4); } };
  const gallop = (v) => { const b = low(), f = into(36 + tones()[2], b + 5, b + 11);   // octave, fifth, octave: driving
      [[0, b, 2], [2, b + 12, 1], [3, f, 1], [4, b, 2], [6, b + 12, 1], [7, f, 1]].forEach(([s, m, l], i) => key('lh', E8(s), m, D8(s, l, 0.9), v + (s === 0 ? 10 : 0) - (i % 3 ? 6 : 0))); };
  const longBass = (v) => { const b = low(); key('lh', E8(0), b, D8(0, 8, 0.97), v + 8); key('lh', E8(0) + 0.004, b + 12, D8(0, 8, 0.97), v);
      const tn = tones().slice(0, 3).map(c => into(c + 48, 48, 59)).sort((p, q) => p - q), seq = [tn[0], tn[1], tn[2], tn[1]];   // broken chord in the middle, 8ths
      for (let s = 0; s < 8; s++) key('lh', E8(s), seq[s % 4], D8(s, Math.min(1.5, 8 - s), 0.98), v - 14 + (s % 4 === 0 ? 6 : 0)); };
  const arp = (v) => { const b = low(), tn = tones().slice(0, 3).map(c => into(c + 48, 47, 58)).sort((p, q) => p - q);
      const seq = [b, b + 12, tn[0], tn[1], tn[2], tn[1], tn[0], b + 12], arch = [8, 0, 2, 5, 8, 4, 1, -2];
      seq.forEach((m, i) => key('lh', E8(i), m, D8(i, Math.min(1.8, 8 - i), 0.98), v + arch[i])); };   // let go at the barline
  // ---- right hand: the melody in octaves, filled with a chord tone under it on long notes, played hard ----
  const melody = (notes, v, opt) => { const o = opt || {}, up = o.up || 0, sc = barScale(X.name), ct = tones();
    for (const [s, m0, l, orn] of notes) { const m = m0 + up, t = E8(s), d = D8(s, l, l <= 1 ? 0.92 : 0.97);
      if (orn === 'g') { let g = m - 1; while (!sc.includes(((g % 12) + 12) % 12)) g -= 1;   // an upward grace note (in octaves)
        const p = P.rh[P.rh.length - 1]; if (p && p[0] + p[2] > t - 0.08) p[2] = Math.max(0.05, t - 0.085 - p[0]);
        key('rh', t - 0.07, g, 0.065, v - 20); key('rh', t - 0.07, g - 12, 0.065, v - 26); }
      const acc = s === 0 ? 6 : l >= 3 ? 3 : 0; key('rh', t, m, d, v + acc); key('rh', t + 0.003, m - 12, d, v + acc - 8);
      if (l >= 2 && !o.thin) { const inner = [m - 3, m - 4, m - 5, m - 7].find(x => ct.includes(((x % 12) + 12) % 12));   // a chord tone inside the octave
        if (inner !== undefined && inner > m - 12) key('rh', t + 0.005, inner, d, v + acc - 14); } } };
  for (const x of bars()) {
    X = x; gi = x.gi; const { sec, b, k, ph } = x, mark = { lh: P.lh.length, rh: P.rh.length };
    if (sec === 'hold') { if (b === 0) { const H = 4.2;   // the last chord, hit hard and left ringing
        rolled('lh', E8(0), [28, 40, 47], H, 112); rolled('rh', E8(0) + 0.02, [64, 67, 71, 76, 79], H, 110); PEDAL.push([E8(0) + 0.05, E8(0) + H]); } }
    else if (sec === 'intro') {
      if (b === 0) { rolled('lh', E8(0), [28, 40], D8(0, 8, 0.98), 70); rolled('rh', E8(0) + 0.02, [64, 67, 71], D8(0, 8, 0.98), 64); pedalBar(); }   // the first bar: soft
      else { pound(b < 4 ? 98 : 108); rolled('rh', E8(0), tones().slice(0, 3).map(c => into(c + 60, 60, 71)).concat([into(tones()[0] + 72, 72, 83)]), D8(0, 3, 0.95), 104);
        rolled('rh', E8(3), tones().slice(0, 3).map(c => into(c + 60, 60, 71)), D8(3, 3, 0.95), 94); rolled('rh', E8(6), tones().slice(0, 3).map(c => into(c + 60, 60, 71)), D8(6, 2, 0.95), 98); pedalBar(true); }
    } else if (sec === 'A') { pound(106); melody(MEL[ph][k], 108); pedalBar(true); }
    else if (sec === 'brk') { if (b === 0) { arp(70); pedalBar(); } else { pound(84 + 0); melody([[0, 78, 4], [4, 81, 2], [6, 75, 2]], 96, { thin: true }); pedalBar(true); } }
    else if (sec === 'B') { longBass(110); melody(MEL[ph][k], 112); pedalBar(); }   // long notes over the climbing bass (0:52)
    else if (sec === 'C') { gallop(110); melody(MEL[ph][k], 114); pedalBar(true); }
    else if (sec === 'D') { arp(b < 8 ? 96 : 104); melody(MEL[ph][k], b < 8 ? 106 : 112, { thin: b < 8 }); pedalBar(); }   // the heartfelt one
    else if (sec === 'E') { pound(114); melody(MEL[ph][k], 118, { up: 12 }); pedalBar(true); }   // the lift: an octave higher, hardest
    else if (sec === 'end') { if (b < 3) pound(114); else longBass(110); melody(MEL[ph][k], 116, { up: 12 }); pedalBar(b < 3); }
    if (x.tr) for (const n of ['lh', 'rh']) for (let i = mark[n]; i < P[n].length; i++) P[n][i] = [P[n][i][0], P[n][i][1] + x.tr, ...P[n][i].slice(2)];
  }
  const part = (notes, o) => Object.assign({ sf: 'piano', program: 0, amp: 'none', notes }, o);
  const B = bars();
  return { bpm: BPM, sections: SECTIONS, colors: COLORS, bar_times: BAR_TIMES.slice(0, TOTAL + 1), bar_tempi: Array.from({ length: TOTAL }, (_, g) => barTempo(g)),
    harmony: B.map(x => ({ tones: CH[x.chord].map(c => (c + x.tr) % 12), scale: barScale(x.name).map(c => (c + x.tr) % 12) })),
    parts: {
      rh: part(P.rh, { label: 'Piano (right hand)', humanize: 4, velvar: 5, pedal: PEDAL }),   // house piano: the Salamander Grand
      lh: part(P.lh, { label: 'Piano (left hand)', humanize: 5, velvar: 6, pedal: PEDAL }),
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
  // ---- the piano bus: saturated (aggression), dark (the reference has almost nothing above 5 kHz), glued, very wide ----
  const pin = ctx.createGain(); pin.channelCountMode = 'explicit'; pin.channelCount = 2;
  const drive = ctx.createWaveShaper(); { const c = new Float32Array(2048); for (let i = 0; i < 2048; i++) { const x = i / 1023.5 - 1; c[i] = Math.tanh(1.8 * x) / Math.tanh(1.8); } drive.curve = c; drive.oversample = '4x'; }
  pin.connect(drive);
  const tone = eqChain(drive, [HP(30), ['lowshelf', 110, 3.5], PK(250, 1, 0.8), PK(1200, -1, 0.8), PK(3000, -2.5, 0.8), LP(8000)]);
  const pc = ctx.createDynamicsCompressor(); pc.threshold.value = -20; pc.ratio.value = 3; pc.attack.value = 0.008; pc.release.value = 0.12; tone.connect(pc);
  // mid/side width: L' = L + k(L-R)/2, R' = R + k(R-L)/2 (the Salamander is already very wide: k < 0 narrows it a touch,
  // to the reference's ~27-40% correlation, safe in mono)
  const k = -0.12, split = ctx.createChannelSplitter(2), merge = ctx.createChannelMerger(2); pc.connect(split);
  const g = v => { const n = ctx.createGain(); n.gain.value = v; return n; };
  const lL = g(1 + k / 2), rL = g(-k / 2), rR = g(1 + k / 2), lR = g(-k / 2);
  split.connect(lL, 0); split.connect(rL, 1); split.connect(rR, 1); split.connect(lR, 0);
  lL.connect(merge, 0, 0); rL.connect(merge, 0, 0); rR.connect(merge, 0, 1); lR.connect(merge, 0, 1);
  const dry = ctx.createGain(); merge.connect(dry); dry.connect(master);
  // a large hall
  const verb = ctx.createConvolver();
  { const len = SR * 3.0, ir = ctx.createBuffer(2, len, SR); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, 3.0); } verb.buffer = ir; }
  const verbOut = g(0.3); eqChain(verb, [HP(200), LP(4500)]).connect(verbOut); verbOut.connect(master);
  const vs = g(0.28); merge.connect(vs); vs.connect(verb);
  // section dynamics: only the first bar (the soft opening) sits under; everything else is full energy, colour not volume
  const sect = ctx.createGain(); pin.gain.value = 1;
  const SECT_DB = x => x.sec === 'intro' && x.b === 0 ? -3 : x.sec === 'brk' && x.b === 0 ? -2 : 0;
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
