// An original SOLO PIANO piece in the style of the aggressive passages of "oh, nameless sky" (AZALI; bars 1-20, 50-66 and
// 74-88 of the transcription by Kachium): its devices, never its notes. 3/4 at 200 (presto); the right hand hits a full
// chord on beat 1 with the melody on top, then quick 8th figures; the left hand leaps from a low bass note through the
// fifth to the tenth, rolls triplet arpeggios, or stomps accented octaves an octave down; descending cascades cross the
// hands; quick scale runs rise into downbeats; rolled chords at the climaxes; the Neapolitan (bII) for colour; the
// opening sweeps up from the bass with a crescendo. Played on the house grand (the Salamander SFZ through piano_render.py,
// so harder keystrokes play the harder-hammer recordings), in E minor.
const BPM = 200, STEPS = 12, STEP = 60 / BPM / 4, BAR = STEP * STEPS;   // 3/4: 12 sixteenths per bar

// ---- harmony ----
const CH = { Em: [4, 7, 11], C: [0, 4, 7], D: [2, 6, 9], B: [11, 3, 6], B7: [11, 3, 6, 9], A: [9, 1, 4], Am: [9, 0, 4], G: [7, 11, 2],
  F: [5, 9, 0], Bm: [11, 2, 6] };
const chordOf = n => n, bassOf = n => CH[n][0];
const KEY = [4, 6, 7, 9, 11, 0, 2];   // E natural minor
const ALT = { 3: 2, 1: 0, 5: 6, 10: 9 };   // a borrowed chord tone replaces the key note it alters: D# for D, C# for C, F for F#, A# for A
const barScale = n => { let s = KEY.slice(); for (const c of CH[n]) if (!s.includes(c)) s = s.filter(k => k !== ALT[c]).concat([c]); return s; };
const into = (m, lo, hi) => { while (m < lo) m += 12; while (m > hi) m -= 12; return m; };
const PROG = {
  IN: ['Em', 'Em', 'Em', 'Em'],
  PA: ['Em', 'C', 'Am', 'B', 'Em', 'F', 'B7', 'Em'],        // the Neapolitan F (bII) before the dominant
  PA2: ['Em', 'C', 'A', 'B', 'C', 'F', 'B7', 'Em'],         // the major IV, then bVI - bII - V7 - i
  PB: ['C', 'D', 'Bm', 'Em', 'Am', 'D', 'G', 'B'],
  PB2: ['C', 'D', 'Bm', 'Em', 'A', 'F', 'B7', 'B7'],
  PC: ['Em', 'Em', 'F', 'F', 'Am', 'Am', 'B7', 'B7'],       // two bars each: the octave stomps
  PE: ['C', 'F', 'B7', 'Em', 'C', 'Am', 'B7', 'Em'],
};
const SECTIONS = [['intro', 4], ['A', 16], ['B', 16], ['C', 8], ['A2', 16], ['B2', 16], ['C2', 8], ['end', 8], ['hold', 2]];
const PLAN = { intro: ['IN'], A: ['PA', 'PA2'], B: ['PB', 'PB2'], C: ['PC'], A2: ['PA', 'PA2'], B2: ['PB', 'PB2'], C2: ['PC'], end: ['PE'], hold: [] };
const LEN = Object.fromEntries(SECTIONS), START = {}; { let g = 0; for (const [n, l] of SECTIONS) { START[n] = g; g += l; } }
const TOTAL = SECTIONS.reduce((a, x) => a + x[1], 0);
function barTempo(gi) { return gi >= START.hold ? [120, 120] : gi === START.hold - 1 ? [200, 150] : [BPM, BPM]; }   // a held-back last bar
const BRAKES = [];
const TT = []; { let t = 0; for (let gi = 0; gi < TOTAL + 1; gi++) { const [a, b] = barTempo(Math.min(gi, TOTAL - 1)), row = [t];
  for (let k = 0; k < STEPS; k++) { const bpm = a + (b - a) * (k + 0.5) / STEPS; t += 60 / bpm / 4; row.push(t); } TT.push(row); } }
function T(gi, s) { while (s >= STEPS && gi < TOTAL) { s -= STEPS; gi++; } const k = Math.floor(s), f = s - k, row = TT[gi]; return row[k] + (k < STEPS ? (row[k + 1] - row[k]) * f : 0); }
const BAR_TIMES = TT.map(r => r[0]);
const COLORS = { intro: '#7a8cff', A: '#5f74ff', B: '#9a5cff', C: '#c06cff', A2: '#5f74ff', B2: '#9a5cff', C2: '#c06cff', end: '#8fb4ff', hold: '#e0e4ff' };
const DIVE_BARS = () => [START.C - 1, START.A2 + 7, START.C2 - 1];   // tape-stop dives at a few phrase ends (whole mix)

function bars() {
  const out = []; let gi = 0;
  for (const [sec, n] of SECTIONS) for (let b = 0; b < n; b++, gi++) {
    const ph = PLAN[sec].length ? PLAN[sec][Math.floor(b / 8) % PLAN[sec].length] : null, prog = ph ? PROG[ph] : ['Em'];
    out.push({ sec, b, gi, t0: T(gi, 0), ph, k: b % 8, name: prog[b % prog.length], tr: 0 });
  }
  out.forEach((x, i) => { x.chord = x.name; x.bass = bassOf(x.name); x.next = (out[i + 1] || x).name; });
  return out;
}

// ---- the melodies (right hand, top voice), in 8ths: [slot 0..5, midi, length, ornament] (E5 = 76) ----
const MA = [
  [[0, 79, 3], [3, 81, 1], [4, 83, 1], [5, 84, 1]],                  // Em  G (A B C climbing into the next bar)
  [[0, 84, 3], [3, 83, 1], [4, 81, 1], [5, 79, 1]],                  // C   C (B A G)
  [[0, 81, 3], [3, 84, 1], [4, 88, 2, 'g']],                         // Am  A C E
  [[0, 87, 3], [3, 83, 1], [4, 78, 2]],                              // B   D# B F#
  [[0, 79, 3], [3, 81, 1], [4, 83, 1], [5, 84, 1]],                  // Em
  [[0, 84, 3], [3, 81, 1], [4, 77, 2]],                              // F   C A F  (the Neapolitan)
  [[0, 78, 1], [1, 81, 1], [2, 83, 1], [3, 87, 1], [4, 90, 2, 'f']], // B7  F# A B D# F#
  [[0, 88, 4], [4, 83, 2]] ];                                        // Em  E B
const MA2 = [MA[0], MA[1],
  [[0, 81, 3], [3, 85, 1], [4, 88, 2, 'g']],                         // A   A C# E (the major IV)
  MA[3],
  [[0, 84, 2], [2, 88, 2], [4, 91, 2]],                              // C   C E G
  [[0, 89, 3], [3, 84, 1], [4, 81, 2]],                              // F   F C A
  [[0, 87, 2], [2, 83, 1], [3, 81, 1], [4, 78, 2]],                  // B7  D# B A F#
  [[0, 76, 6, 'f']] ];                                               // Em  E
const MB = [
  [[0, 79, 2], [2, 84, 2], [4, 83, 1], [5, 84, 1]],                  // C   G C (B) C
  [[0, 86, 4], [4, 81, 2]],                                          // D   D A
  [[0, 83, 2], [2, 86, 2], [4, 90, 2]],                              // Bm  B D F#
  [[0, 88, 4], [4, 86, 1], [5, 84, 1]],                              // Em  E (D C)
  [[0, 84, 2], [2, 81, 2], [4, 76, 2]],                              // Am  C A E
  [[0, 78, 2], [2, 81, 2], [4, 86, 2, 'g']],                         // D   F# A D
  [[0, 83, 4], [4, 79, 2]],                                          // G   B G
  [[0, 78, 2], [2, 83, 2], [4, 87, 2]] ];                            // B   F# B D#
const MB2 = MB.slice(0, 4).concat([
  [[0, 85, 2], [2, 81, 2], [4, 76, 2]],                              // A   C# A E
  [[0, 77, 2], [2, 81, 2], [4, 84, 2, 'g']],                         // F   F A C
  [[0, 87, 2], [2, 83, 2], [4, 81, 2]],                              // B7  D# B A
  [[0, 78, 1], [1, 81, 1], [2, 83, 1], [3, 87, 1], [4, 90, 2]] ]);   // B7  F# A B D# F#
const ME = [
  [[0, 84, 3], [3, 88, 3]], [[0, 89, 3], [3, 84, 3]], [[0, 87, 3], [3, 81, 3]], [[0, 88, 6]],
  [[0, 84, 2], [2, 88, 2], [4, 91, 2]], [[0, 88, 3], [3, 84, 3]], [[0, 83, 2], [2, 87, 2], [4, 90, 2]], [[0, 88, 6]] ];
const MEL = { PA: MA, PA2: MA2, PB: MB, PB2: MB2, PE: ME };

// ---------------- the piano: right hand and left hand ----------------
function guitarEvents() {
  const P = { rh: [], lh: [] };
  let gi = 0, X = null;
  const S16 = s => T(gi, s), D16 = (s, l, k) => (T(gi, s + l) - T(gi, s)) * (k || 0.97);
  const E8 = slot => S16(slot * 2), D8 = (slot, len, k) => D16(slot * 2, len * 2, k);
  const tones = () => CH[X.chord];
  const PEDAL = [];
  const pedalBar = () => PEDAL.push([T(gi, 0) + 0.06, T(gi + 1, 0) + 0.012]);
  const key = (hand, t, m, d, v) => P[hand].push([t, m, d, Math.max(30, Math.min(127, Math.round(v))), 'open']);
  const rolled = (hand, t, ms, d, v, gap) => ms.slice().sort((a, b) => a - b).forEach((m, i, arr) => key(hand, t + i * (gap || 0.012), m, d, i === arr.length - 1 ? v + 4 : v - 4));
  const low = () => into(24 + X.bass, 28, 39);                      // the bass: E1..D#2
  const third = () => (tones()[1] - tones()[0] + 12) % 12;
  const ctones = (lo, hi) => { const out = []; for (let m = lo; m <= hi; m++) if (tones().includes(m % 12)) out.push(m); return out; };
  // ---- left hand ----
  const leap = (v) => { const b = low(); key('lh', E8(0), b, D8(0, 1), v + 8); key('lh', E8(1), b + 7, D8(1, 1), v - 6);
    key('lh', E8(2), b + 12 + third(), D8(2, 4, 0.98), v - 2); key('lh', E8(3), b + 19, D8(3, 2, 0.95), v - 10); };   // the top fifth lets go before the last 8th   // bass - fifth - tenth (+ fifth above)
  const trip = (v) => { const b = low(), up = [b, b + 7, b + 12, b + 12 + third(), b + 19, b + 24]; const idx = [0, 1, 2, 3, 4, 5, 4, 3, 2];
    idx.forEach((j, i) => key('lh', S16(i * 4 / 3), up[j], D16(i * 4 / 3, 4 / 3, 0.98), v + (i === 0 ? 10 : i % 3 === 0 ? 2 : -6))); };   // triplet 8ths, 3 per beat
  const stomp = (v) => { const b = low(); for (let q = 0; q < 3; q++) { key('lh', S16(q * 4), b - (b >= 33 ? 12 : 0), D16(q * 4, 4, 0.9), v + (q === 0 ? 12 : 4)); key('lh', S16(q * 4) + 0.003, b + 12 - (b >= 33 ? 12 : 0), D16(q * 4, 4, 0.9), v); } };   // accented octaves, 8va bassa
  // ---- right hand: the melody on top; long notes get the full chord under them, short ones the octave ----
  const melody = (notes, v, o) => { o = o || {}; const sc = barScale(X.name);
    for (const [s, m, l, orn] of notes) { const t = E8(s), d = D8(s, l, l <= 1 ? 0.9 : 0.97);
      if (orn === 'g') { let g = m - 1; while (!sc.includes(((g % 12) + 12) % 12)) g -= 1;
        const p = P.rh[P.rh.length - 1]; if (p && p[0] + p[2] > t - 0.07) p[2] = Math.max(0.04, t - 0.072 - p[0]); key('rh', t - 0.06, g, 0.055, v - 18); }
      const acc = s === 0 ? 8 : l >= 2 ? 2 : -4;
      key('rh', t, m, d, v + acc);
      if (l >= 2 || s === 0) { const inner = ctones(m - 11, m - 1).filter(x => x >= m - 9).slice(-2); key('rh', t + 0.004, m - 12, d, v + acc - 10);
        inner.forEach((x, i) => key('rh', t + 0.006 + i * 0.002, x, d, v + acc - 16)); }   // octave + two chord tones inside it
      else if (o.oct) key('rh', t + 0.003, m - 12, d, v + acc - 12); } };
  const stabs = (v, tops) => tops.forEach((top, s) => { if (top == null) return; const ch = ctones(top - 11, top).slice(-4);
    ch.forEach((m, i) => key('rh', E8(s) + i * 0.002, m, D8(s, 1, 0.8), v + (s === 0 ? 10 : s % 2 ? -8 : 0) - (m === top ? 0 : 8))); });   // repeated chords in 8ths
  const runDown = (from, slot16, n, v) => { const sc = barScale(X.name); let m = from; for (let i = 0; i < n; i++) {   // a cascade, 16ths
      while (!sc.includes(((m % 12) + 12) % 12)) m--; key(i < n / 2 ? 'rh' : 'lh', S16(slot16 + i * (8 / n) * 1), m, D16(slot16 + i * 8 / n, 8 / n, 0.9), v - i * 1.5); m--; } };
  const runUp = (to, slot16, n, v, hand) => { const sc = barScale(X.name), ns = []; let m = to - 1;   // a quick scale run rising into a note
      while (ns.length < n) { if (sc.includes(((m % 12) + 12) % 12)) ns.unshift(m); m--; }
      ns.forEach((mm, i) => key(hand || 'rh', S16(slot16 + i * (4 / n)), mm, D16(slot16 + i * 4 / n, 4 / n, 0.85), v - 12 + i * 4)); };
  for (const x of bars()) {
    X = x; gi = x.gi; const { sec, b, k, ph } = x;
    if (sec === 'hold') { if (b === 0) { const H = 4.4;   // the last chord, rolled, fermata
        rolled('lh', E8(0), [28, 40, 47], H, 116, 0.02); rolled('rh', E8(0) + 0.07, [64, 67, 71, 76, 79, 83, 88], H, 112, 0.016); PEDAL.push([E8(0) + 0.05, E8(0) + H]); } continue; }
    if (sec === 'intro') {
      if (b === 0) { const sweep = [28, 35, 40, 43, 47, 52, 55, 59, 64, 67, 71, 76];   // a sweep up from the bass, crescendo
        sweep.forEach((m, i) => key(i < 6 ? 'lh' : 'rh', S16(i), m, D16(i, STEPS - i, 0.98), 60 + i * 5)); pedalBar(); }
      else { leap(104 + b * 3); melody([[0, 79, 3], [3, 78, 1], [4, 76, 2]], 100 + b * 4); pedalBar(); }   // the band of the theme announced
    } else if (sec === 'A' || sec === 'A2') {
      const thick = sec === 'A2';
      if (thick) trip(110); else leap(108);
      melody(MEL[ph][k], thick ? 116 : 110, { oct: true });
      if (k === 3 && b < 8) runDown(100, 6, 12, 108);                           // a cascade across the hands
      if (k === 7 && b >= 8) runUp(MEL.PB[0][0][1] + 12, 8, 5, 110);            // a run into the next section
      pedalBar();
    } else if (sec === 'B' || sec === 'B2') {
      if (sec === 'B') trip(108); else leap(112);
      melody(MEL[ph][k], sec === 'B2' ? 118 : 112, { oct: true });
      if (k === 7 && b >= 8) runUp(88, 8, 5, 114);
      if (sec === 'B2' && k === 0) rolled('rh', E8(0) - 0.05, ctones(52, 64), D8(0, 3), 100);   // rolled chords at the phrase starts
      pedalBar();
    } else if (sec === 'C' || sec === 'C2') {   // the octave stomps under repeated chords; the last two bars build
      stomp(114);
      const tops = { 0: [83, 79, 83, 88, 83, 79], 1: [88, 83, 88, 91, 88, 83], 2: [84, 81, 84, 89, 84, 81], 3: [89, 84, 89, 93, 89, 84],
        4: [81, 76, 81, 84, 81, 76], 5: [84, 81, 84, 88, 84, 81], 6: [87, 81, 87, 90, 87, 81] };
      if (k < 7) stabs(sec === 'C2' ? 116 : 110, tops[k]);
      else { const arp = ctones(59, 95); for (let i = 0; i < 12; i++) key('rh', S16(i), arp[Math.min(arp.length - 1, i)], D16(i, 1, 0.9), 96 + i * 2); }   // B7 rising in 16ths
      pedalBar();
    } else if (sec === 'end') {
      if (k % 2 === 0) leap(114); else trip(112);
      melody(ME[k], 118, { oct: true });
      if (k === 3) runDown(100, 4, 16, 112);
      if (k === 7) runDown(95, 6, 12, 110);
      pedalBar();
    }
  }
  const part = (notes, o) => Object.assign({ sf: 'grand', program: 0, amp: 'none', notes }, o);
  const B = bars();
  return { bpm: BPM, sections: SECTIONS, colors: COLORS, bar_times: BAR_TIMES.slice(0, TOTAL + 1), bar_tempi: Array.from({ length: TOTAL }, (_, g) => barTempo(g)),
    eighths_per_bar: 6, strong: [0, 2, 4], meter: [3, 4],
    harmony: B.map(x => ({ tones: CH[x.chord], scale: barScale(x.name) })),
    parts: {
      rh: part(P.rh, { label: 'Piano (right hand)', humanize: 4, velvar: 4, pedal: PEDAL }),   // the house grand
      lh: part(P.lh, { label: 'Piano (left hand)', humanize: 5, velvar: 5, pedal: PEDAL }),
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
  pin.connect(drive);
  const tone = eqChain(drive, [HP(28), ['lowshelf', 100, 1.5], PK(300, -1.5, 0.9), PK(3500, 1.5, 0.9), ['highshelf', 9000, 1]]);
  const pc = ctx.createDynamicsCompressor(); pc.threshold.value = -16; pc.ratio.value = 2; pc.attack.value = 0.008; pc.release.value = 0.12; tone.connect(pc);
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
  const SECT_DB = x => 0;
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
