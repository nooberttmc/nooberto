// An original song in the style of "Vessel To Be Fueled" (Vbuh): measured from the reference, not copied from it.
// 199 BPM, F minor with Phrygian colour (Gb) and the E leading tone. Constant, flat-out energy (the reference's level
// stays within ~1-2 dB from 0:10 to the end); a pitched, distorted hardcore kick on every beat with 16th hats driving
// into each kick; thick, dark, sustained, heavily distorted low guitars (F2/Eb2 region) hard-panned; a bright synth-brass
// lead layered in octaves with no vibrato (long held notes and repeated high stabs); a "drop" around the 2-minute mark;
// and an ending at full energy: one held chord, a cut, and a short tail.
const BPM = 199, STEP = 60 / BPM / 4, BAR = STEP * 16;   // nominal tempo (the tempo map below bends it)
const SECTIONS = [['intro', 8], ['A', 48], ['B', 40], ['drop', 24], ['C', 16], ['D', 24], ['end', 8], ['hold', 2]];
const LEN = Object.fromEntries(SECTIONS), START = {}; { let g = 0; for (const [n, l] of SECTIONS) { START[n] = g; g += l; } }
// Tempo effects (like the example "CHRONOPHOBIA"): every bar has a start and end tempo, ramped smoothly across it.
//  - the intro accelerates from 120 to 199
//  - a brake on the last bar before the drop (199 -> 60, with a closing filter and the kick bending down), then the drop slams
//  - slow motion after the drop: the drop's last bar eases to half speed, two half-speed bars, then a snap back to 199
//  - a final brake into the held chord
const TOTAL = SECTIONS.reduce((a, x) => a + x[1], 0);
function barTempo(gi) {
  const ease = x => 120 + 79 * Math.pow(x, 1.6);
  if (gi < START.A) return [ease(gi / LEN.intro), ease((gi + 1) / LEN.intro)];
  if (gi === START.drop - 1) return [199, 60];                                   // brake into the drop
  if (gi === START.C - 1) return [199, 100];                                     // easing into slow motion
  if (gi === START.C || gi === START.C + 1) return [99.5, 99.5];                 // slow motion
  if (gi === START.hold - 1) return [199, 110];                                  // final brake into the held chord
  if (gi >= START.hold) return [110, 110];
  return [199, 199];
}
const BRAKES = [START.drop - 1, START.hold - 1];   // bars with the tape-stop treatment
// cumulative time of every 16th: TT[gi][s] (s = 0..16); T(gi, s) handles fractional and overflowing steps
const TT = []; { let t = 0; for (let gi = 0; gi < TOTAL + 1; gi++) { const [a, b] = barTempo(Math.min(gi, TOTAL - 1)), row = [t];
  for (let k = 0; k < 16; k++) { const bpm = a + (b - a) * (k + 0.5) / 16; t += 60 / bpm / 4; row.push(t); } TT.push(row); } }
function T(gi, s) { while (s >= 16 && gi < TOTAL) { s -= 16; gi++; } const k = Math.floor(s), f = s - k, row = TT[gi]; return row[k] + (k < 16 ? (row[k + 1] - row[k]) * f : 0); }
const BAR_TIMES = TT.map(r => r[0]);
const COLORS = { intro: '#ff6030', A: '#ff8a30', B: '#ff5030', drop: '#ffd060', C: '#c04030', D: '#ffb040', end: '#ffd060', hold: '#fff0c0' };
// chord roots as pitch classes (F=5), one chord per 2 bars; the guitars play them as low power chords (C2..B2)
const F = 5, Gb = 6, Ab = 8, Bb = 10, Db = 1, Eb = 3, E = 4;
const PROG = {
  A: [F, F, Db, Db, Eb, Eb, F, E],        // home, the dark VI, the VII, home, the leading-tone push
  B: [Db, Db, Eb, Eb, F, F, Gb, Gb],      // lifts, then the Phrygian bII hangs over the turn
  drop: [F, F, Ab, Ab, Db, Db, Eb, E],
  C: [Bb, Bb, Db, Db, F, F, Gb, E],
};
const root2 = pc => 36 + pc;               // C2..B2: tuned-down, heavy
// the lead (synth brass), written bar by bar: [16th step, midi, length in 16ths]. A beat is 4 steps (0.3 s).
const THEME_A = [   // F F Db Db Eb Eb F E
  [[0, 72, 8], [8, 67, 8]], [[0, 68, 12], [12, 67, 4]], [[0, 65, 8], [8, 68, 4], [12, 72, 4]], [[0, 73, 12], [12, 72, 4]],
  [[0, 70, 8], [8, 67, 4], [12, 70, 4]], [[0, 75, 12], [12, 73, 4]], [[0, 72, 16]], [[0, 71, 8], [8, 68, 8]],
];
const THEME_B = [   // Db Db Eb Eb F F Gb Gb: lower, call and answer
  [[0, 68, 8], [8, 65, 8]], [[0, 61, 8], [8, 65, 8]], [[0, 67, 12], [12, 70, 4]], [[0, 63, 16]],
  [[0, 65, 4], [4, 68, 4], [8, 72, 8]], [[0, 70, 8], [8, 68, 8]], [[0, 66, 8], [8, 70, 8]], [[0, 73, 12], [12, 72, 4]],
];
const DROP = [      // F F Ab Ab Db Db Eb E: long notes, then repeated high stabs
  [[0, 65, 6], [6, 72, 6], [12, 68, 4]], [[0, 67, 16]],
  [[0, 72, 4], [4, 75, 4], [8, 79, 2], [10, 79, 2], [12, 79, 2], [14, 79, 2]], [[0, 77, 12], [12, 75, 4]],
  [[0, 73, 8], [8, 72, 4], [12, 68, 4]], [[0, 65, 16]],
  [[0, 67, 4], [4, 70, 4], [8, 79, 2], [10, 79, 2], [12, 80, 4]], [[0, 78, 8], [8, 76, 8]],
];
const THEME_C = [   // Bb Bb Db Db F F Gb E: the dark answer
  [[0, 70, 8], [8, 65, 8]], [[0, 68, 8], [8, 70, 8]], [[0, 73, 12], [12, 72, 4]], [[0, 68, 16]],
  [[0, 72, 4], [4, 68, 4], [8, 65, 8]], [[0, 67, 8], [8, 68, 8]], [[0, 70, 8], [8, 73, 8]], [[0, 71, 16]],
];
function bars() {
  const out = []; let gi = 0;
  for (const [sec, n] of SECTIONS) for (let b = 0; b < n; b++, gi++) {
    const p = PROG[sec === 'intro' ? 'A' : sec === 'D' ? 'A' : sec === 'end' ? 'drop' : sec] || [F];
    const pc = sec === 'hold' ? F : p[Math.floor(b / 2) % p.length];
    out.push({ sec, b, gi, t0: T(gi, 0), pc });
  }
  return out;
}

// ---------------- the parts (notes) ----------------
function guitarEvents() {
  const P = { rhythm: [], bass: [], lead: [] };
  const pc5 = (t, r, len, art, vel) => { for (const n of [r, r + 7, r + 12]) P.rhythm.push([t, n, len, vel, art]); };
  // riffs on the 16th grid: [step, length, articulation, interval above the root]. Sustained chords re-picked on 8ths,
  // with a chromatic neighbour (b2 above or the leading tone below) to end the bar, like the reference's F-F#-E-Eb motion
  const RIFF = [[0, 3, 'open', 0], [3, 1, 'mute', 0], [4, 2, 'open', 0], [6, 2, 'open', 0], [8, 3, 'open', 0], [11, 1, 'mute', 0], [12, 2, 'open', 0], [14, 2, 'open', 1]];
  const RIFF2 = [[0, 3, 'open', 0], [3, 1, 'mute', 0], [4, 2, 'open', 0], [6, 2, 'open', 0], [8, 3, 'open', 0], [11, 1, 'mute', 0], [12, 2, 'open', 0], [14, 2, 'open', -1]];
  const HOLD = [[0, 8, 'open', 0], [8, 6, 'open', 0], [14, 2, 'mute', 0]];            // ringing chords (the drop)
  const DRIVE = [0, 2, 4, 6, 8, 10, 12, 14].map(s => [s, 2, s % 4 === 0 ? 'open' : 'mute', 0]);   // 8th chugs (the finale)
  let gi = 0;   // the bar being written (all timing goes through the tempo map T)
  const dt = (s, l, k) => (T(gi, s + l) - T(gi, s)) * k;
  const play = (t0, r, PT) => PT.forEach(([s, l, art, iv]) => { const rr = r + iv;
    pc5(T(gi, s), rr, dt(s, l, 0.96), art, art === 'open' ? 122 : 108); P.bass.push([T(gi, s), rr - 12, dt(s, l, 0.96), art === 'open' ? 114 : 100, 'open']); });
  const lead = (t0, line, up) => line.forEach(([s, m, l]) => P.lead.push([T(gi, s), m + (up || 0), dt(s, l, 0.97), 112, 'open']));
  for (const x of bars()) {
    const { sec, b, t0, pc } = x; gi = x.gi;
    const r = root2(pc);
    if (sec === 'intro') play(t0, r, b % 2 ? RIFF2 : RIFF);
    else if (sec === 'A') { play(t0, r, b % 2 ? RIFF2 : RIFF); if ((b >= 8 && b < 24) || b >= 32) lead(t0, THEME_A[b % 8], b >= 40 ? 12 : 0); }
    else if (sec === 'B') { play(t0, r, b % 2 ? RIFF2 : RIFF); if (b >= 8) lead(t0, THEME_B[b % 8], b >= 24 ? 12 : 0); }
    else if (sec === 'drop' || sec === 'end') { play(t0, r, HOLD); lead(t0, DROP[b % 8], sec === 'drop' && b >= 16 ? 12 : 0); }
    else if (sec === 'C' && b < 2) { play(t0, r, HOLD); lead(t0, [[0, b ? 67 : 72, 16]]); }   // slow motion: chords ring, one long note per bar
    else if (sec === 'C') { play(t0, r, b % 2 ? RIFF2 : RIFF); lead(t0, THEME_C[b % 8]); }
    else if (sec === 'D') { play(t0, r, b % 4 === 3 ? RIFF2 : DRIVE); lead(t0, THEME_A[b % 8], b >= 8 ? 12 : 0); }
    else if (b === 0) {   // hold: one big chord at full energy (the song cuts it at ~1.8 s)
      pc5(t0, root2(F), 2.0, 'open', 126); P.bass.push([t0, root2(F) - 12, 2.0, 120, 'open']);
      P.lead.push([t0, 65, 2.0, 116, 'open'], [t0, 72, 2.0, 112, 'open']);
    }
  }
  const part = (notes, o) => Object.assign({ sf: 'musescore', amp: 'none', humanize: 3, notes }, o);
  return { bpm: BPM, sections: SECTIONS, colors: COLORS, bar_times: BAR_TIMES.slice(0, TOTAL + 1), parts: {
    rhythmL: part(P.rhythm, { amp: 'modern', humanize: 6, release: -1400 }),
    rhythmR: part(P.rhythm.filter(n => !P.rhythm.some(o => o[0] === n[0] && o[1] === n[1] - 12)), { amp: 'modern', humanize: 9, velvar: 10, cents: 8, release: -1400 }),
    bass: part(P.bass, { program: 34, amp: 'bass', humanize: 3, release: -1400 }),
    lead: part(P.lead, { record: false, label: 'Synth Brass', program: 62 }),   // synthesized in renderSong
  } };
}

// ---------------- the mix ----------------
async function renderSong() {
  const SR = 44100, BARS = bars(), totalBars = BARS.length;
  const tHold = T(START.hold, 0), tCut = tHold + 1.8, dur = tCut + 2.6;   // held chord ~1.8 s, then a short tail
  const rand = (() => { let s = 1999; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * dur), SR);
  const has = n => (window.ASSET_NAMES || []).indexOf(n) >= 0;
  const SOLO = window.SOLO, ON = n => !SOLO || SOLO === 'all' || SOLO === n, DRUMS_ON = ON('drums');
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = SOLO ? 1 : 2.2; comp.attack.value = 0.01; comp.release.value = 0.12;
  const master = ctx.createGain(); master.gain.value = 0.8;
  const lowShelf = ctx.createBiquadFilter(); lowShelf.type = 'lowshelf'; lowShelf.frequency.value = 90; lowShelf.gain.value = -1;
  const midScoop = ctx.createBiquadFilter(); midScoop.type = 'peaking'; midScoop.frequency.value = 900; midScoop.Q.value = 0.6; midScoop.gain.value = -3;   // and scooped
  const brakeLP = ctx.createBiquadFilter(); brakeLP.type = 'lowpass'; brakeLP.frequency.value = 20000; brakeLP.Q.value = 0.7;   // closes during a brake
  master.connect(brakeLP); brakeLP.connect(lowShelf); lowShelf.connect(midScoop); midScoop.connect(comp); comp.connect(ctx.destination);
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
  async function stem(name, pan, targetDb, verbAmt, echo, eq, duck) {
    if (!has('stem/' + name) || !ON(name)) return;
    const buf = await loadAsset('stem/' + name, ctx), d = buf.getChannelData(0);
    let sum = 0, n = 0; for (let i = 0; i < d.length; i += 4) { const a = Math.abs(d[i]); if (a > 1e-3) { sum += a * a; n++; } }
    const rms = Math.sqrt(sum / Math.max(1, n)) || 1e-3, src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = Math.pow(10, targetDb / 20) / rms; const p = ctx.createStereoPanner(); p.pan.value = pan;
    src.connect(g); let out = eqChain(g, eq);
    if (duck) { const dg = ctx.createGain(); out.connect(dg); out = dg; ducks.push([dg, duck]); }
    out.connect(p); p.connect(dry); send(p, verbAmt, echo); src.start(0); src.stop(tCut + 0.03);   // everything stops at the cut
  }
  // guitars: scooped modern metal tone, matched to the reference's guitars band by band
  const GTR = [HP(45), LP(14000)];   // the 'modern' amp voicing already matches the reference guitars (within ~1 dB per band)
  await stem('rhythmL', -0.7, -6.5, 0.03, false, GTR, 0.2);
  await stem('rhythmR', 0.7, -6.5, 0.03, false, GTR, 0.2);
  await stem('bass', 0, -24, 0, false, [HP(55), PK(300, -2, 1), LP(2200)], 0.5);

  // ---- the synth-brass lead: detuned saws + a square an octave up (the reference's octave layering), no vibrato ----
  const leadBus = ctx.createGain(); leadBus.gain.value = ON('lead') ? 0.28 : 0;
  const leadDrive = ctx.createWaveShaper(); { const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(1.8 * x) / Math.tanh(1.8); } leadDrive.curve = c; }
  const leadEQ = eqChain(leadDrive, [HP(220), PK(3200, 4, 1), LP(10000)]);
  leadBus.connect(leadDrive); const leadOut = ctx.createGain(); leadEQ.connect(leadOut); leadOut.connect(dry); send(leadOut, 0.18, true);
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function synthBrass(t, m, len, vel) {
    const v = vel / 127, end = t + len, voices = [['sawtooth', 1, -9, -0.35, 0.5], ['sawtooth', 1, 9, 0.35, 0.5], ['sawtooth', 1, 0, 0, 0.35], ['square', 2, -5, -0.2, 0.22], ['square', 2, 5, 0.2, 0.22]];
    for (const [type, mul, cents, pan, amp] of voices) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz(m) * mul; o.detune.value = cents;
      const g = ctx.createGain(), p = ctx.createStereoPanner(); p.pan.value = pan;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(amp * v, t + 0.012); g.gain.setValueAtTime(amp * v, Math.max(t + 0.013, end - 0.05)); g.gain.linearRampToValueAtTime(0.0001, end);
      o.connect(g); g.connect(p); p.connect(leadBus); o.start(t); o.stop(end + 0.02);
    }
  }
  const EV = guitarEvents();
  for (const [t, m, len, vel] of EV.parts.lead.notes) if (t < tCut) synthBrass(t, m, Math.min(len, tCut - t), vel);

  // ---- drums: a pitched, distorted hardcore kick on every beat, 16th hats, a crack driving into each kick ----
  const drumBus = ctx.createGain(); drumBus.gain.value = DRUMS_ON ? 1 : 0;
  const drumOut = eqChain(drumBus, [HP(30)]); drumOut.connect(dry); send(drumOut, 0.04);
  const kickBus = ctx.createGain(); kickBus.gain.value = 0.36;
  const kickDrive = ctx.createWaveShaper(); { const c = new Float32Array(2048); for (let i = 0; i < 2048; i++) { const x = i / 1023.5 - 1; c[i] = Math.tanh(7 * x) / Math.tanh(7); } kickDrive.curve = c; kickDrive.oversample = '2x'; }
  const kickTone = eqChain(kickDrive, [PK(400, -3, 1), LP(9000)]); kickBus.connect(kickDrive); kickTone.connect(drumBus);
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
    const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7200;
    const g = ctx.createGain(), d = open ? 0.16 : 0.045; g.gain.setValueAtTime(1.0 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    const p = ctx.createStereoPanner(); p.pan.value = (HAT_N++ % 2 ? 0.35 : -0.35);   // alternating sides: a wide cymbal wash s.connect(f); f.connect(g); g.connect(p); p.connect(drumBus); s.start(t, rand() * 0.5, d + 0.02);
    DLOG.break.push([t, STEP * 0.8, open ? 8 : 2]);
  }
  function crack(t, v) {   // a short snare-like crack (tonal body + band of noise), on the 16th before each kick
    const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.9 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07); s.connect(f); f.connect(g); g.connect(drumBus); s.start(t, rand() * 0.5, 0.09);
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
  master.gain.setValueAtTime(0.8, dur - 0.6); master.gain.linearRampToValueAtTime(0, dur);
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
