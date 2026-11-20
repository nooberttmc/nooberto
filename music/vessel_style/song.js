// An original song in the style of "Vessel To Be Fueled" (Vbuh): its devices, measured and read, never its notes.
// 200 BPM, F minor. Genre devices (hardcore / breakcore boss music): a pedal-tone bass ostinato in a 3+3+2 rhythm with a
// pickup into each bar, rocking i - bVI; long held octaves above it; a theme in syncopated 8ths grouped 3+3+2; a wide brass
// section for the drop (bVI - bVII - i, then a long V with the harmonic-minor E natural); constant energy to the very end,
// then one held chord, a cut and a short tail.
const BPM = 200, STEP = 60 / BPM / 4, BAR = STEP * 16;   // nominal tempo (the tempo map below bends it)
// ---- harmony: F minor with the genre's devices (a pedal-tone ostinato, bVI and bVII, a harmonic-minor V with E natural) ----
const F = 5, Gb = 6, Ab = 8, Bb = 10, Db = 1, Eb = 3, E = 4, C = 0;
const QUAL = { 5: [0, 3, 7], 10: [0, 3, 7], 1: [0, 4, 7], 3: [0, 4, 7], 8: [0, 4, 7], 0: [0, 4, 7, 10] };   // Fm, Bbm minor; Db, Eb, Ab major; C7 (V)
const chordPcs = pc => QUAL[pc].map(i => (pc + i) % 12);
const SCALE = [5, 7, 8, 10, 0, 1, 3, 4];   // F harmonic + natural minor (F G Ab Bb C Db Eb, and E over C)
const into = (m, lo, hi) => { while (m < lo) m += 12; while (m > hi) m -= 12; return m; };
// one chord per bar, 8-bar phrases
const PROG = {
  pedal: [F, Db, F, Db, F, Db, Bb, C],     // i - bVI rocking over the ostinato, iv, V
  q: [F, F, Db, Eb, F, F, Db, C],          // theme, first half (ends on V)
  a: [Bb, Bb, Db, Eb, F, Db, C, C],        // theme, answer (ends on V, resolves into the next downbeat)
  d: [Db, Eb, F, F, Db, Eb, C, C],         // the drop: bVI bVII i, then the long dominant
  e: [Db, Eb, F, F, Db, Eb, C, F],         // the drop's answer: lands home
};
const SECTIONS = [['intro', 8], ['A', 16], ['B', 32], ['A2', 8], ['drop', 24], ['C', 16], ['D', 24], ['end', 8], ['hold', 2]];
const PLAN = {   // which 8-bar phrase each section plays
  intro: ['pedal'], A: ['pedal', 'pedal'], B: ['q', 'a', 'q', 'a'], A2: ['pedal'], drop: ['d', 'e', 'd'],
  C: ['q', 'a'], D: ['d', 'e', 'd'], end: ['a'], hold: [] };
const LEN = Object.fromEntries(SECTIONS), START = {}; { let g = 0; for (const [n, l] of SECTIONS) { START[n] = g; g += l; } }
// Tempo effects (like the example "CHRONOPHOBIA"), only at pivotal moments: every bar has a start and end tempo.
//  - a brake on the last bar before the drop (200 -> 60, with a closing filter and the kick bending down), then the drop slams
//  - a final brake into the held chord
const TOTAL = SECTIONS.reduce((a, x) => a + x[1], 0);
function barTempo(gi) {   // tempo changes only at the two pivotal moments
  if (gi === START.drop - 1) return [200, 60];                                   // brake into the drop
  if (gi === START.hold - 1) return [200, 110];                                  // final brake into the held chord
  if (gi >= START.hold) return [110, 110];
  return [200, 200];
}
const BRAKES = [START.drop - 1, START.hold - 1];   // bars with the tape-stop treatment
// cumulative time of every 16th: TT[gi][s] (s = 0..16); T(gi, s) handles fractional and overflowing steps
const TT = []; { let t = 0; for (let gi = 0; gi < TOTAL + 1; gi++) { const [a, b] = barTempo(Math.min(gi, TOTAL - 1)), row = [t];
  for (let k = 0; k < 16; k++) { const bpm = a + (b - a) * (k + 0.5) / 16; t += 60 / bpm / 4; row.push(t); } TT.push(row); } }
function T(gi, s) { while (s >= 16 && gi < TOTAL) { s -= 16; gi++; } const k = Math.floor(s), f = s - k, row = TT[gi]; return row[k] + (k < 16 ? (row[k + 1] - row[k]) * f : 0); }
const BAR_TIMES = TT.map(r => r[0]);
const COLORS = { intro: '#ff6030', A: '#ff8a30', A2: '#ff9a40', B: '#ff5030', drop: '#ffd060', C: '#c04030', D: '#ffb040', end: '#ffd060', hold: '#fff0c0' };

// ---- the hand-written lines, in 8ths: [slot 0..7, midi, length in 8ths]. Every note checked against its chord (see check.py) ----
const LONG = [   // the pedal sections' held octaves, one per bar over F Db F Db F Db Bbm C7: the C-Db-C sigh, then a climb and a fall to E
  [[0, 72, 8]], [[0, 73, 8]], [[0, 72, 8]], [[0, 77, 8]], [[0, 80, 16]], [], [[0, 77, 8]], [[0, 76, 8]] ];
const THEME = {
  q: [ [[0, 68, 3], [3, 72, 3], [6, 77, 2]],                       // F   Ab C F: rising
       [[0, 80, 3], [3, 79, 1], [4, 77, 2], [6, 72, 2]],           // F   Ab G F C
       [[0, 77, 3], [3, 80, 3], [6, 77, 2]],                       // Db  F Ab F
       [[0, 79, 3], [3, 82, 3], [6, 79, 2]],                       // Eb  G Bb G
       [[0, 84, 3], [3, 80, 3], [6, 82, 1], [7, 80, 1]],           // F   C Ab (Bb passing) Ab
       [[0, 77, 4], [4, 72, 2], [6, 68, 2]],                       // F   F C Ab
       [[0, 77, 3], [3, 73, 3], [6, 77, 1], [7, 80, 1]],           // Db  F Db F Ab
       [[0, 79, 3], [3, 76, 3], [6, 72, 2]] ],                     // C7  G E C
  a: [ [[0, 73, 3], [3, 77, 3], [6, 82, 2]],                       // Bbm Db F Bb
       [[0, 82, 3], [3, 77, 3], [6, 82, 2]],                       // Bbm Bb F Bb
       [[0, 77, 3], [3, 80, 3], [6, 77, 2]],                       // Db  F Ab F
       [[0, 79, 3], [3, 82, 3], [6, 82, 2]],                       // Eb  G Bb Bb
       [[0, 84, 6], [6, 82, 1], [7, 80, 1]],                       // F   C (Bb passing) Ab
       [[0, 77, 3], [3, 80, 3], [6, 77, 2]],                       // Db  F Ab F
       [[0, 79, 3], [3, 76, 3], [6, 79, 2]],                       // C7  G E G
       [[0, 82, 4], [4, 79, 2], [6, 76, 2]] ],                     // C7  Bb G E -> F
};
const DROP = {   // the brass section's line, in quarter and half notes (F4..Ab5)
  d: [ [[0, 68, 2], [2, 73, 2], [4, 77, 4]],                       // Db  Ab Db F
       [[0, 75, 2], [2, 79, 2], [4, 70, 2], [6, 75, 2]],           // Eb  Eb G Bb Eb
       [[0, 77, 6], [6, 75, 1], [7, 77, 1]],                       // F   F (Eb neighbour) F
       [[0, 72, 2], [2, 68, 2], [4, 72, 2], [6, 77, 2]],           // F   C Ab C F
       [[0, 77, 4], [4, 73, 2], [6, 68, 2]],                       // Db  F Db Ab
       [[0, 70, 2], [2, 75, 2], [4, 79, 4]],                       // Eb  Bb Eb G
       [[0, 79, 4], [4, 76, 2], [6, 72, 2]],                       // C7  G E C
       [[0, 70, 2], [2, 72, 2], [4, 76, 2], [6, 79, 2]] ],         // C7  Bb C E G
  e: [ [[0, 68, 2], [2, 73, 2], [4, 77, 4]],
       [[0, 75, 2], [2, 79, 2], [4, 70, 2], [6, 75, 2]],
       [[0, 77, 6], [6, 75, 1], [7, 77, 1]],
       [[0, 72, 2], [2, 68, 2], [4, 72, 2], [6, 77, 2]],
       [[0, 73, 2], [2, 77, 2], [4, 80, 4]],                       // Db  Db F Ab: higher
       [[0, 79, 4], [4, 75, 2], [6, 70, 2]],                       // Eb  G Eb Bb
       [[0, 76, 4], [4, 79, 2], [6, 72, 2]],                       // C7  E G C
       [[0, 77, 8]] ],                                             // F   home
};
function bars() {   // every bar: section, bar in section, global bar, phrase name, chord, next chord
  const out = []; let gi = 0;
  for (const [sec, n] of SECTIONS) for (let b = 0; b < n; b++, gi++) {
    const ph = PLAN[sec].length ? PLAN[sec][Math.floor(b / 8) % PLAN[sec].length] : null;
    out.push({ sec, b, gi, t0: T(gi, 0), ph, k: b % 8, pc: ph ? PROG[ph][b % 8] : F });
  }
  out.forEach((x, i) => x.next = (out[i + 1] || { pc: F }).pc);
  return out;
}
const ARP_ON = (sec, b) => (sec === 'A' && b >= 8) || sec === 'B' || sec === 'D';
// the bass ostinato (8ths): root, root, octave + a pickup that steps into the next chord; a scale fill on each phrase's V
function bassBar(pc, next, k) {
  const r2 = 36 + ((pc - 36) % 12 + 12) % 12;   // C2..B2: Db and Eb sit just below F, C a fourth below
  if (pc === C && k === 7) {   // the scale fill, ending on a step into the next chord
    const head = [[0, 48, 1], [1, 46, 1], [2, 44, 1], [3, 43, 1], [4, 40, 1], [5, 41, 1]];   // C Bb Ab G E F
    return head.concat(next === F ? [[6, 43, 1], [7, 40, 1]]        // G E -> F
                     : next === Bb ? [[6, 43, 1], [7, 44, 1]]       // G Ab -> Bb
                     : [[6, 43, 1], [7, 48, 1]]); }                 // G C -> Db
  const tgt = 36 + ((next - 36) % 12 + 12) % 12 + 12, ct = chordPcs(pc), sc = m => { const q = ((m % 12) + 12) % 12; return SCALE.includes(q) && (pc === C ? q !== Eb : q !== E); };   // E only over the V, Eb never over it
  let pick = null; for (const d of [-1, 2, -2, 1, -4, 3, -3, 4]) { const m = tgt + d; if (m !== r2 + 12 && sc(m) && ct.includes(((m % 12) + 12) % 12)) { pick = m; break; } }   // a chord tone that steps (or leaps a 3rd) into the next root
  if (pick === null) for (const d of [-1, 2, -2, 1]) if (sc(tgt + d)) { pick = tgt + d; break; }
  if (next === pc) pick = r2 + 7;   // same chord next: the fifth
  return [[0, r2, 3], [3, r2, 3], [6, r2 + 12, 1], [7, pick, 1]];
}

// ---------------- the parts (notes) ----------------
function guitarEvents() {
  const P = { rhythm: [], bass: [], lead: [], bells: [], brass: [], strings: [], piano: [], timp: [] };
  let gi = 0;
  const E8 = (slot) => T(gi, slot * 2), D8 = (slot, len, k) => (T(gi, (slot + len) * 2) - T(gi, slot * 2)) * k;
  const inRange = m => into(m, 57, 84);
  const bell = (slot, m, vel, len) => P.bells.push([E8(slot), inRange(m), len || D8(slot, 8 - slot, 1) + 0.1, vel, 'open']);   // damped at the bar's end so it never rings into the next chord
  const toll = (pc, vel, full) => { bell(0, 60 + pc, vel); if (full) { bell(0, 67 + pc, vel - 8); bell(0, 72 + pc, vel - 4); } };
  // bass + guitars: the guitars play a power chord on every bass note (same rhythm), with muted 16th chugs filling the gaps
  const ostinato = (pc, next, k, chug) => { for (const [s, m, l] of bassBar(pc, next, k)) {
      P.bass.push([E8(s), m - 12, D8(s, l, 0.92), s === 0 ? 118 : 108, 'open']);
      const g = into(m, 37, 48);                                 // Db2..C3 power chords (low, like the reference's F2/Eb2)
      const fifth = s === 0 || chordPcs(pc).includes((g + 7) % 12);   // passing notes: octaves only, so no out-of-key fifths
      for (const n of fifth ? [g, g + 7, g + 12] : [g, g + 12]) P.rhythm.push([E8(s), n, D8(s, l, 0.92), s === 0 ? 124 : 116, 'open']);
      if (chug && l === 3) for (const q of [2, 4]) for (const n of fifth ? [g, g + 7] : [g]) P.rhythm.push([T(gi, s * 2 + q), n, D8(0, 0.5, 0.9), 100, 'mute']);
    } };
  const line = (notes, dest, vel, up) => notes.forEach(([s, m, l]) => dest.push([E8(s), m + (up || 0), D8(s, l, 0.95), vel, 'open']));
  const brassLine = (notes, up) => { line(notes, P.lead, 112, up); notes.forEach(([s, m, l]) => P.brass.push([E8(s), into(m + (up || 0), 53, 81), D8(s, l, 0.95), l >= 4 ? 114 : 106, 'open'])); };
  const strings = (pc, lo) => chordPcs(pc).slice(0, 3).forEach(c => P.strings.push([E8(0), into(c + 60, lo || 60, (lo || 60) + 11), D8(0, 8, 0.98), 84, 'open']));
  const piano = (pc, next, k) => { for (const [s, m, l] of bassBar(pc, next, k)) P.piano.push([E8(s), into(m, 29, 40), D8(s, l, 0.9), 104, 'open'], [E8(s), into(m, 41, 52), D8(s, l, 0.9), 96, 'open']);
    chordPcs(pc).slice(0, 3).forEach(c => P.piano.push([E8(0), into(c + 60, 60, 71), D8(0, 3, 0.9), 90, 'open'], [E8(3), into(c + 60, 60, 71), D8(3, 3, 0.9), 84, 'open'])); };
  for (const x of bars()) {
    const { sec, b, ph, k, pc, next } = x; gi = x.gi;
    if (sec === 'hold') { if (b === 0) {   // one big F minor chord at full energy (cut at ~1.8 s)
      for (const n of [41, 48, 53]) P.rhythm.push([E8(0), n, 2.0, 126, 'open']); P.bass.push([E8(0), 29, 2.0, 120, 'open']);
      P.lead.push([E8(0), 65, 2.0, 116, 'open'], [E8(0), 72, 2.0, 112, 'open']); P.brass.push([E8(0), 65, 2.0, 118, 'open'], [E8(0), 72, 2.0, 114, 'open']);
      bell(0, 65, 127, 7); bell(0, 72, 120, 7); bell(0, 77, 118, 7);
      [65, 68, 72].forEach(m => P.strings.push([E8(0), m, 2.0, 100, 'open'])); P.timp.push([E8(0), 41, 1.5, 127, 'open']);
      P.piano.push([E8(0), 29, 2.0, 120, 'open'], [E8(0), 41, 2.0, 116, 'open'], [E8(0), 65, 2.0, 100, 'open'], [E8(0), 68, 2.0, 100, 'open'], [E8(0), 72, 2.0, 100, 'open']); }
      continue; }
    const pedal = ph === 'pedal', theme = ph === 'q' || ph === 'a', drop = ph === 'd' || ph === 'e';
    ostinato(pc, next, k, drop || sec === 'C' || sec === 'end');
    if (pedal) {
      strings(pc);
      if (sec !== 'intro' || b >= 4) { const up = sec === 'A2' || (sec === 'A' && b >= 8) ? 12 : 0;   // held octaves (an octave up the second time)
        for (const [s, m, l] of LONG[k]) { const ln = [[s, m - 12 + up, l]]; brassLine(ln); line(ln, P.strings, 92, 12); }
        if (k % 2 === 0 && LONG[k].length) bell(0, LONG[k][0][1], sec === 'intro' ? 100 : 112, LONG[k][0][2] > 8 ? D8(0, 16, 1) : undefined); }
      if (sec === 'intro' && b === 0) toll(F, 110, true);
    } else if (theme) {
      const up = 0; brassLine(THEME[ph][k], up - 12 * (sec === 'C' ? 0 : 0));
      strings(pc); if (sec !== 'B' || b >= 16) piano(pc, next, k);
      if (k === 0) toll(pc, 112, true);
    } else if (drop) {
      brassLine(DROP[ph][k]); strings(pc, 53); piano(pc, next, k);
      DROP[ph][k].forEach(([s, m, l]) => { if (l >= 4) bell(s, m, 114); });    // bells double the drop's long notes
      if (k % 2 === 0) P.timp.push([E8(0), into(36 + pc, 41, 52), 0.6, 118, 'open']);
      if (k === 0) toll(pc, 118, true);
    }
    if (sec === 'end') P.timp.push([E8(0), into(36 + pc, 41, 52), 0.6, 112, 'open']);
  }
  const ARPN = [];
  { const ARP = [0, 1, 2, 3, 2, 1, 2, 3, 4, 3, 2, 1, 2, 3, 2, 1];
    for (const { sec, b, gi: g2, pc } of bars()) { if (!ARP_ON(sec, b)) continue;
      const cp = chordPcs(pc).slice(0, 3).map(c => into(72 + c, 72, 83)).sort((x, y) => x - y), tones = [cp[0], cp[1], cp[2], cp[0] + 12, cp[1] + 12];
      ARP.forEach((kk, s) => ARPN.push([T(g2, s), tones[kk], (T(g2, s + 1) - T(g2, s)) * 0.8, 90, 'open'])); } }
  const part = (notes, o) => Object.assign({ sf: 'musescore', amp: 'none', humanize: 3, notes }, o);
  return { bpm: BPM, sections: SECTIONS, colors: COLORS, bar_times: BAR_TIMES.slice(0, TOTAL + 1), bar_tempi: Array.from({ length: TOTAL }, (_, g) => barTempo(g)),
    chords: bars().map(x => x.pc), parts: {
    rhythmL: part(P.rhythm, { amp: 'modern', humanize: 6, release: -1400 }),
    rhythmR: part(P.rhythm.filter(n => !P.rhythm.some(o => o[0] === n[0] && o[1] === n[1] - 12)), { amp: 'modern', humanize: 9, velvar: 10, cents: 8, release: -1400 }),
    bass: part(P.bass, { program: 34, amp: 'bass', humanize: 3, release: -1400 }),
    lead: part(P.lead, { record: false, label: 'Synth Brass', program: 62 }),
    bells: part(P.bells, { sf: '../soundfonts/TubularBells.sf2', program: 0, label: 'Bells', humanize: 2 }),
    brassL: part(P.brass, { program: 61, label: 'Brass Section', humanize: 8, velvar: 6, cents: -7 }),
    brassR: part(P.brass, { program: 61, humanize: 10, velvar: 6, cents: 8, lag: 6 }),
    strings: part(P.strings, { program: 48, humanize: 4 }),
    piano: part(P.piano, { program: 0, humanize: 5 }),
    timp: part(P.timp, { program: 47, humanize: 2 }),
    arp: part(ARPN, { record: false, label: 'Synth Arp', program: 80 }),
  } };
}

// ---------------- the mix ----------------
async function renderSong() {
  const SR = 44100, BARS = bars(), totalBars = BARS.length;
  const tHold = T(START.hold, 0), tCut = tHold + 1.8, dur = tCut + 4.2;   // held chord ~1.8 s, then the tail (reverb + the last bell ringing out)
  const rand = (() => { let s = 1999; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * dur), SR);
  const has = n => (window.ASSET_NAMES || []).indexOf(n) >= 0;
  const SOLO = window.SOLO, ON = n => !SOLO || SOLO === 'all' || SOLO === n, DRUMS_ON = ON('drums');
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = SOLO ? 1 : 2.2; comp.attack.value = 0.01; comp.release.value = 0.12;
  const master = ctx.createGain(); master.gain.value = 0.8;
  const lowShelf = ctx.createBiquadFilter(); lowShelf.type = 'lowshelf'; lowShelf.frequency.value = 90; lowShelf.gain.value = -1.5;
  const midScoop = ctx.createBiquadFilter(); midScoop.type = 'peaking'; midScoop.frequency.value = 800; midScoop.Q.value = 0.7; midScoop.gain.value = -5;   // and scooped
  const brakeLP = ctx.createBiquadFilter(); brakeLP.type = 'lowpass'; brakeLP.frequency.value = 20000; brakeLP.Q.value = 0.7;   // closes during a brake
  master.connect(brakeLP); brakeLP.connect(lowShelf); const lowMid = ctx.createBiquadFilter(); lowMid.type = 'peaking'; lowMid.frequency.value = 250; lowMid.Q.value = 0.8; lowMid.gain.value = 2.5;
  lowShelf.connect(lowMid); lowMid.connect(midScoop); midScoop.connect(comp); comp.connect(ctx.destination);
  for (const gb of BRAKES) { const a = T(gb, 0), b = T(gb + 1, 0); brakeLP.frequency.setValueAtTime(20000, a); brakeLP.frequency.exponentialRampToValueAtTime(350, b - 0.02); brakeLP.frequency.setValueAtTime(20000, b); }
  const dry = ctx.createGain(); dry.connect(master);
  const verb = ctx.createConvolver();
  { const len = SR * 2.2, ir = ctx.createBuffer(2, len, SR); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, 2.6); } verb.buffer = ir; }
  const verbLP = ctx.createBiquadFilter(); verbLP.type = 'lowpass'; verbLP.frequency.value = 5000; const verbOut = ctx.createGain(); verbOut.gain.value = 0.35;
  verb.connect(verbLP); verbLP.connect(verbOut); verbOut.connect(master);
  const delay = ctx.createDelay(2), delay2 = ctx.createDelay(2); delay.delayTime.value = delay2.delayTime.value = STEP * 3;
  const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3000; dlp.Q.value = 0;
  const fb = ctx.createGain(); fb.gain.value = 0.3; const dL = ctx.createStereoPanner(), dR = ctx.createStereoPanner(); dL.pan.value = -0.8; dR.pan.value = 0.8;
  const dOut = ctx.createGain(); dOut.gain.value = 0.45;
  delay.connect(dlp); dlp.connect(dL); dL.connect(dOut); dlp.connect(delay2); delay2.connect(dR); dR.connect(dOut); dOut.connect(master); delay2.connect(fb); fb.connect(delay);
  const send = (node, v, echo) => { const g = ctx.createGain(); g.gain.value = v; node.connect(g); g.connect(verb); if (echo) g.connect(delay); };
  const eqChain = (src, eq) => { let n = src; for (const [type, f, g, q] of eq || []) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (g != null) b.gain.value = g; b.Q.value = q || 0.7; n.connect(b); n = b; } return n; };
  const HP = f => ['highpass', f, null, 0.7], LP = f => ['lowpass', f, null, 0.7], PK = (f, g, q) => ['peaking', f, g, q || 1];
  const ducks = [];

  // ---- recorded stems ----
  async function stem(name, pan, targetDb, verbAmt, echo, eq, duck, rings) {   // rings: not cut at the end (bells)
    if (!has('stem/' + name) || !ON(name)) return;
    const buf = await loadAsset('stem/' + name, ctx), d = buf.getChannelData(0);
    let sum = 0, n = 0; for (let i = 0; i < d.length; i += 4) { const a = Math.abs(d[i]); if (a > 1e-3) { sum += a * a; n++; } }
    const rms = Math.sqrt(sum / Math.max(1, n)) || 1e-3, src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = Math.pow(10, targetDb / 20) / rms; const p = ctx.createStereoPanner(); p.pan.value = pan;
    src.connect(g); let out = eqChain(g, eq);
    if (duck) { const dg = ctx.createGain(); out.connect(dg); out = dg; ducks.push([dg, duck]); }
    out.connect(p); p.connect(rings ? master : dry); send(p, verbAmt, echo); src.start(0); if (!rings) src.stop(tCut + 0.03);   // everything else stops at the cut
  }
  // guitars: scooped modern metal tone, matched to the reference's guitars band by band
  // guitars sit under the drums and the brass: well down, with the harsh 3-6 kHz pulled back
  const GTR = [HP(45), PK(4200, -5, 0.8), LP(8500)];
  await stem('rhythmL', -0.7, -12, 0.03, false, GTR, 0.25);
  await stem('rhythmR', 0.7, -12, 0.03, false, GTR, 0.25);
  // the 2:15-style lead: a brass section, two takes spread wide
  await stem('brassL', -0.65, -13, 0.3, true, [HP(150), PK(1200, 0, 0.8), LP(7000)]);
  await stem('brassR', 0.65, -13, 0.3, true, [HP(150), PK(1200, 0, 0.8), LP(7000)]);
  await stem('strings', 0.3, -20, 0.5, false, [HP(250), LP(9000)]);
  await stem('piano', -0.25, -17, 0.3, false, [HP(70)], 0.2);
  await stem('timp', 0, -16, 0.35, false, [HP(40)]);
  await stem('bells', 0.1, -17, 0.55, false, [HP(250), PK(2500, 2, 1)], 0, true);   // tubular bells: big hall, cut-proof
  await stem('bass', 0, -24, 0, false, [HP(55), PK(300, -2, 1), LP(2200)], 0.5);

  // ---- synth brass under the brass section: a wide detuned saw stack, low-passed round ----
  const leadBus = ctx.createGain(); leadBus.gain.value = ON('lead') ? 0.2 : 0;
  const leadDrive = ctx.createWaveShaper(); { const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(1.8 * x) / Math.tanh(1.8); } leadDrive.curve = c; }
  const leadEQ = eqChain(leadDrive, [HP(200), PK(1100, 3, 0.8), LP(3400)]);   // round, brass-like: strong low harmonics, rolled off above the 5th
  leadBus.connect(leadDrive); const leadOut = ctx.createGain(); leadEQ.connect(leadOut); leadOut.connect(dry); send(leadOut, 0.18, true);
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function synthBrass(t, m, len, vel) {
    const v = vel / 127, end = t + len, voices = [['sawtooth', 1, -12, -0.7, 0.5], ['sawtooth', 1, 12, 0.7, 0.5], ['sawtooth', 1, -4, -0.3, 0.3], ['sawtooth', 1, 5, 0.3, 0.3]];   // a wide, detuned stack (ensemble spread)
    for (const [type, mul, cents, pan, amp] of voices) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz(m) * mul; o.detune.value = cents;
      const g = ctx.createGain(), p = ctx.createStereoPanner(); p.pan.value = pan;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(amp * v, t + 0.012); g.gain.setValueAtTime(amp * v, Math.max(t + 0.013, end - 0.05)); g.gain.linearRampToValueAtTime(0.0001, end);
      o.connect(g); g.connect(p); p.connect(leadBus); o.start(t); o.stop(end + 0.02);
    }
  }
  const EV = guitarEvents();
  for (const [t, m, len, vel] of EV.parts.lead.notes) if (t < tCut) synthBrass(t, m, Math.min(len, tCut - t), vel);
  // ---- a bright 16th-note arpeggio (plucked square) running up and down the chord in the energetic sections ----
  const arpBus = ctx.createGain(); arpBus.gain.value = ON('arp') ? 0.07 : 0;
  const arpOut = eqChain(arpBus, [HP(400), LP(6000)]); const arpPan = ctx.createStereoPanner(); arpPan.pan.value = -0.2; arpOut.connect(arpPan); arpPan.connect(dry); send(arpPan, 0.12, true);
  const ARP = [0, 1, 2, 3, 2, 1, 2, 3, 4, 3, 2, 1, 2, 3, 2, 1];
  for (const { sec, b, gi, pc } of BARS) {
    if (!ARP_ON(sec, b)) continue;
    const cp = chordPcs(pc).slice(0, 3).map(c => into(72 + c, 72, 83)).sort((x, y) => x - y), tones = [cp[0], cp[1], cp[2], cp[0] + 12, cp[1] + 12];
    ARP.forEach((k, s) => { const t = T(gi, s), d = T(gi, s + 1) - t, o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = hz(tones[k]);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(s % 4 === 0 ? 1 : 0.7, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + d * 0.9);
      o.connect(g); g.connect(arpBus); o.start(t); o.stop(t + d); });
  }

  // ---- drums: a pitched, distorted hardcore kick on every beat, 16th hats, a crack driving into each kick ----
  const drumBus = ctx.createGain(); drumBus.gain.value = DRUMS_ON ? 1 : 0;
  const drumOut = eqChain(drumBus, [HP(30)]); drumOut.connect(dry); send(drumOut, 0.04);
  const kickBus = ctx.createGain(); kickBus.gain.value = 0.9;   // drive amount (into the clipper)
  const kickDrive = ctx.createWaveShaper(); { const c = new Float32Array(2048); for (let i = 0; i < 2048; i++) { const x = i / 1023.5 - 1; c[i] = Math.tanh(7 * x) / Math.tanh(7); } kickDrive.curve = c; kickDrive.oversample = '2x'; }
  const kickTone = eqChain(kickDrive, [PK(400, -3, 1), LP(9000)]); kickBus.connect(kickDrive);
  const kickLevel = ctx.createGain(); kickLevel.gain.value = 0.32; kickTone.connect(kickLevel); kickLevel.connect(drumBus);   // the kick's level (after the clipper, so it actually changes the level)
  const noise = (() => { const b = ctx.createBuffer(1, SR, SR), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1; return b; })();
  const DLOG = { break: [], layer: [], kick: [] };
  function duckAll(t, v) { for (const [g, depth] of ducks) { g.gain.setTargetAtTime(1 - depth * v, t, 0.002); g.gain.setTargetAtTime(1, t + 0.06, 0.05); } }
  function kick(t, v, pf) {   // pitch drop from ~300 Hz to C2 (65 Hz) - tuned to the key - with a held, saturated body; pf < 1 bends it down (brakes)
    pf = pf || 1; const o = ctx.createOscillator(); o.frequency.setValueAtTime(320 * pf, t); o.frequency.exponentialRampToValueAtTime(110 * pf, t + 0.035); o.frequency.exponentialRampToValueAtTime(65.4 * pf, t + 0.13);   // lands on C2 (the fifth), like the reference's ~60-65 Hz
    const g = ctx.createGain(); g.gain.setValueAtTime(0.95 * v, t); g.gain.setValueAtTime(0.85 * v, t + 0.14); g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    o.connect(g); g.connect(kickBus); o.start(t); o.stop(t + 0.28);
    if (DRUMS_ON || SOLO !== undefined) duckAll(t, v); DLOG.kick.push([t, STEP, 60]);
  }
  let HAT_N = 0;
  function hat(t, v, open) {
    const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
    const g = ctx.createGain(), d = open ? 0.16 : 0.045; g.gain.setValueAtTime(0.55 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    const p = ctx.createStereoPanner(); p.pan.value = (HAT_N++ % 2 ? 0.35 : -0.35);   // alternating sides: a wide cymbal wash
    s.connect(f); f.connect(g); g.connect(p); p.connect(drumBus); s.start(t, rand() * 0.5, d + 0.02);
    DLOG.break.push([t, STEP * 0.8, open ? 8 : 2]);
  }
  function crack(t, v) {   // a short snare-like crack (tonal body + band of noise), on the 16th before each kick
    const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.setValueAtTime(1.3 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07); s.connect(f); f.connect(g); g.connect(drumBus); s.start(t, rand() * 0.5, 0.09);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(170, t + 0.05); const og = ctx.createGain();
    og.gain.setValueAtTime(0.35 * v, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.08); o.connect(og); og.connect(drumBus); o.start(t); o.stop(t + 0.1);
    DLOG.layer.push([t, STEP, 0]);
  }
  for (const { sec, b, t0, gi } of BARS) {
    const at = s => T(gi, s), brake = BRAKES.indexOf(gi) >= 0;
    if (sec === 'hold') { if (b === 0) kick(t0, 1.1); continue; }   // one last hit under the held chord
    const kickOn = sec !== 'intro' || b >= 4;
    for (let s = 0; s < 16; s++) {
      if (kickOn && s % 4 === 0) kick(at(s), s === 0 ? 1 : 0.92, brake ? 1 - 0.13 * s / 4 : 1);
      if ((sec === 'drop' || sec === 'D' || sec === 'end') && s % 4 === 1 && kickOn) kick(at(s), 0.6);   // double kicks in the drop and finale
      hat(at(s), s % 4 === 2 ? 1 : 0.55, s % 4 === 2);   // open hats on every offbeat
      if (kickOn && s % 4 === 3) crack(at(s), 0.8);
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
