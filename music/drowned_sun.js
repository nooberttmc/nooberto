// "The Drowned Sun" v4: the final boss theme, rebuilt from scratch. Original composition.
// F# minor, 178 BPM. Dark harmony: the Neapolitan (G, bII) and the dominant C#7 drive every cadence.
// Pitched parts are recorded by tools/guitar_stems.py: sampled instruments (MuseScore General via FluidSynth),
// guitars re-amped through Guitarix (JCM800 + DS-1) and a 4x12 cabinet curve, bass with gentle grit.
// Drums: at most two breakbeats from the pack at a time (Amen, Hard Steppin 1/2), pitched from 160 to 178 BPM.
const BPM = 178, STEP = 60 / BPM / 4, BAR = STEP * 16;
const SECTIONS = [['intro', 8], ['phase1', 16], ['phase2', 16], ['eclipse', 8], ['phase3', 16], ['outro', 4]];
const Q = { m: [0, 3, 7], M: [0, 4, 7], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11], '7': [0, 4, 7, 10], d: [0, 3, 6] };
// roots in octave 3 (F#3 = 54)
const Fsm = [54, 'm'], D = [50, 'M'], Bm = [59, 'm'], Cs7 = [49, '7'], G = [55, 'M'], A = [57, 'M'], E = [52, 'M'], Bm7 = [59, 'm7'], Dmaj7 = [50, 'M7'];
const PROG_A = [Fsm, D, Bm, Cs7, Fsm, D, G, Cs7];          // main: the G (bII) darkens the second cadence
const PROG_B = [Bm, Cs7, Fsm, D, G, Cs7, Fsm, Fsm];       // phase II
const PROG_ECL = [Fsm, Dmaj7, Bm7, Cs7, Fsm, Dmaj7, G, Cs7];
const BREAKDOWN_P = [Fsm, Fsm, G, Cs7];
// melodies: [16th step, midi, length in 16ths]
const THEME_A = [
  [[0, 73, 6], [6, 76, 2], [8, 78, 8]], [[0, 81, 4], [4, 78, 4], [8, 74, 4], [12, 73, 4]], [[0, 74, 6], [6, 73, 2], [8, 71, 4], [12, 69, 4]], [[0, 77, 8], [8, 73, 6]],
  [[0, 73, 4], [4, 76, 4], [8, 81, 6], [14, 79, 2]], [[0, 78, 6], [6, 76, 2], [8, 74, 8]], [[0, 79, 4], [4, 74, 4], [8, 71, 4], [12, 74, 4]], [[0, 77, 8], [8, 80, 4], [12, 77, 4]],
];
const THEME_B = [
  [[0, 74, 2], [2, 78, 2], [4, 81, 4], [8, 78, 4], [12, 74, 4]], [[0, 77, 4], [4, 80, 4], [8, 83, 4], [12, 80, 4]],
  [[0, 81, 8], [8, 78, 6]], [[0, 78, 4], [4, 81, 4], [8, 74, 4], [12, 78, 4]],
  [[0, 79, 6], [6, 78, 2], [8, 74, 4], [12, 71, 4]], [[0, 73, 4], [4, 77, 4], [8, 80, 6], [14, 77, 2]],
  [[0, 78, 8], [8, 73, 8]], [[0, 66, 4], [4, 69, 4], [8, 73, 4], [12, 76, 4]],
];
const BREAKDOWN_LEAD = [[[0, 78, 16]], [[0, 76, 8], [8, 73, 8]], [[0, 79, 16]], [[0, 77, 8], [8, 80, 8]]];
// dark piano motif: low octaves + a falling right hand (intro, eclipse, and doubled in the phases)
const PIANO_RH = [[[0, 73, 4], [4, 69, 4], [8, 66, 4], [12, 69, 4]], [[0, 74, 4], [4, 69, 4], [8, 66, 4], [12, 69, 4]],
  [[0, 74, 4], [4, 71, 4], [8, 66, 4], [12, 71, 4]], [[0, 77, 4], [4, 73, 4], [8, 68, 4], [12, 73, 4]]];

function bars() {
  const out = []; let gi = 0;
  for (const [sec, n] of SECTIONS) for (let b = 0; b < n; b++, gi++) {
    let ch, tr = 0;
    if (sec === 'intro') ch = PROG_A[b % 4];
    else if (sec === 'phase1') ch = PROG_A[b % 8];
    else if (sec === 'phase2') ch = b >= 8 && b < 12 ? BREAKDOWN_P[b - 8] : PROG_B[b % 8];
    else if (sec === 'eclipse') ch = PROG_ECL[b];
    else if (sec === 'phase3') { ch = PROG_A[b % 8]; tr = b >= 8 ? 1 : 0; }   // the last 8 bars rise to G minor
    else { ch = Fsm; tr = 1; }
    out.push({ sec, b, gi, t0: gi * BAR, ch, tr, notes: Q[ch[1]].map(i => ch[0] + i + tr) });
  }
  return out;
}
const gRoot = (c, tr) => 40 + ((c[0] + tr - 40) % 12);  // lowest playable power chord (E2..D#3)
const below = (m, notes) => { for (let k = m - 3; k > m - 6; k--) if (notes.some(n => (n - k) % 12 === 0)) return k; return m - 4; };

// ---------------- every pitched part, recorded by tools/guitar_stems.py ----------------
function guitarEvents() {
  const P = { rhythm: [], bass: [], lead: [], harm: [], piano: [], strings: [], low: [], brass: [], organ: [], timp: [] };
  const pc = (t, root, len, art, vel) => { for (const n of [root, root + 7, root + 12]) P.rhythm.push([t, n, len, vel, art]); };
  const pat = (t0, root, PT) => PT.forEach(([s, l, art]) => { pc(t0 + s * STEP, root, l * STEP * 0.95, art, art === 'open' ? 118 : 104); P.bass.push([t0 + s * STEP, root - 12, l * STEP * 0.95, art === 'open' ? 110 : 96, 'open']); });
  const note = (arr, t, m, len, vel, art) => arr.push([t, m, len, vel, art || 'open']);
  const chord = (arr, t, notes, len, vel) => notes.forEach(n => note(arr, t, n, len, vel));
  const melody = (t0, line, tr, notes, twin, oct) => line.forEach(([s, m, l]) => {
    const mm = m + tr + (oct || 0); note(P.lead, t0 + s * STEP, mm, l * STEP * 0.97, 114, 'lead');
    if (twin) note(P.harm, t0 + s * STEP, below(mm, notes), l * STEP * 0.97, 106, 'lead');
  });
  const pianoBar = (t0, ch, tr, b, vel) => {
    const r = ch[0] + tr - 24; note(P.piano, t0, r, BAR * 0.98, vel); note(P.piano, t0, r + 12, BAR * 0.98, vel - 10);
    PIANO_RH[b % 4].forEach(([s, m, l]) => note(P.piano, t0 + s * STEP, m + tr + (ch === G ? -2 : 0), l * STEP, vel - 14));
  };
  // riffs (16th grid): [step, length, articulation]
  const CHUG = [[0, 3, 'open'], [3, 1, 'mute'], [4, 1, 'mute'], [5, 1, 'mute'], [6, 2, 'open'], [8, 1, 'mute'], [9, 1, 'mute'], [10, 2, 'open'], [12, 1, 'mute'], [13, 1, 'mute'], [14, 2, 'open']];
  const CHUG_END = [[0, 3, 'open'], [3, 1, 'mute'], [4, 1, 'mute'], [6, 2, 'open'], [8, 4, 'open'], [12, 4, 'open']];
  const GALLOP = [0, 4, 8, 12].flatMap(b => [[b, 2, b % 8 === 0 ? 'open' : 'mute'], [b + 2, 1, 'mute'], [b + 3, 1, 'mute']]);
  const BREAKDOWN = [[0, 4, 'open'], [6, 1, 'mute'], [7, 1, 'mute'], [10, 3, 'open'], [14, 1, 'mute'], [15, 1, 'mute']];
  const DRIVE = [0, 2, 4, 6, 8, 10, 12, 14].map(s => [s, 2, s % 4 === 0 ? 'open' : 'mute']).concat([[3, 1, 'mute'], [11, 1, 'mute']]);
  for (const x of bars()) {
    const { sec, b, t0, ch, tr, notes } = x, r = gRoot(ch, tr), low = notes.map(n => n - 12);
    if (sec === 'intro') {
      pianoBar(t0, ch, tr, b, 86 + b * 2);
      chord(P.low, t0, [ch[0] - 24, ch[0] - 12], BAR, 70 + b * 4);
      if (b >= 4) chord(P.strings, t0, notes, BAR, 64 + b * 5);
      if (b % 2 === 0) note(P.timp, t0, 30 + ((ch[0] - 30) % 12), STEP * 4, 80 + b * 5);
      if (b === 6) chord(P.organ, t0, low.concat([notes[0]]), BAR * 2, 90);
      if (b === 7) { pc(t0, 42, STEP * 7.5, 'open', 112); for (let s = 8; s < 16; s++) pc(t0 + s * STEP, 42, STEP * 0.9, 'mute', 88 + s * 2); }
    } else if (sec === 'phase1') {
      pat(t0, r, b % 8 === 7 ? CHUG_END : CHUG); melody(t0, THEME_A[b % 8], 0, notes, b >= 8);
      chord(P.organ, t0, low, BAR, b % 2 ? 78 : 88);
      chord(P.strings, t0, notes.concat([notes[0] + 12]), BAR, 80);
      if (b % 4 === 0) note(P.timp, t0, 30 + ((ch[0] - 30) % 12), STEP * 3, 110);
      if (b % 2 === 1) chord(P.brass, t0, notes, STEP * 3, 100);
    } else if (sec === 'phase2') {
      if (b >= 8 && b < 12) {
        pat(t0, b < 10 ? 42 : r, BREAKDOWN); melody(t0, BREAKDOWN_LEAD[b - 8], 0, notes, true);
        chord(P.brass, t0, low, STEP * 6, 118); chord(P.brass, t0 + 10 * STEP, low, STEP * 4, 110);
        note(P.timp, t0, 30 + ((ch[0] - 30) % 12), STEP * 3, 120); note(P.timp, t0 + 10 * STEP, 30 + ((ch[0] - 30) % 12), STEP * 3, 112);
        chord(P.low, t0, [ch[0] - 24, ch[0] - 12], BAR, 100); chord(P.organ, t0, low, BAR, 92);
      } else {
        pat(t0, r, GALLOP); melody(t0, THEME_B[b % 8], 0, notes, b < 8);
        chord(P.organ, t0, low, BAR, 84); chord(P.strings, t0, notes, BAR, 76);
        for (const s of [0, 6, 10]) chord(P.brass, t0 + s * STEP, notes, STEP * 2, 104);
        pianoBar(t0, ch, tr, b, 72);
      }
    } else if (sec === 'eclipse') {
      pianoBar(t0, ch, tr, b, 92); chord(P.strings, t0, notes, BAR, 70); chord(P.low, t0, [ch[0] - 24], BAR, 76);
      if (b >= 4) chord(P.organ, t0, low, BAR, 70 + b * 3);
      if (b % 2 === 0) note(P.timp, t0, 30 + ((ch[0] - 30) % 12), STEP * 4, 70 + b * 4);
      if (b === 7) melody(t0, [[0, 73, 12]], 0, notes, false);
    } else if (sec === 'phase3') {
      pat(t0, r, DRIVE); melody(t0, THEME_A[b % 8], tr, notes, true, b >= 8 ? 0 : 0);
      chord(P.organ, t0, low, BAR, 96); chord(P.strings, t0, notes.concat([notes[0] + 12]), BAR, 90);
      chord(P.low, t0, [ch[0] - 24 + tr, ch[0] - 12 + tr], BAR, 104);
      for (const s of [0, 8]) chord(P.brass, t0 + s * STEP, notes, STEP * 3, 112);
      if (b % 2 === 0) note(P.timp, t0, 30 + ((ch[0] + tr - 30) % 12), STEP * 3, 118);
      if (b === 15) for (let s = 8; s < 16; s++) note(P.timp, t0 + s * STEP, 31, STEP, 90 + s * 3);
    } else if (b === 0) { // outro: G minor, one last chord that rings out
      pc(t0, 43, BAR * 3, 'open', 122); P.bass.push([t0, 31, BAR * 3, 116, 'open']);
      note(P.lead, t0, 79, BAR * 3, 118, 'lead'); note(P.harm, t0, 74, BAR * 3, 110, 'lead');
      chord(P.organ, t0, [43, 50, 55, 58, 62], BAR * 3.5, 104); chord(P.strings, t0, [55, 58, 62, 67], BAR * 3, 92);
      chord(P.low, t0, [31, 43], BAR * 3, 110); chord(P.brass, t0, [55, 58, 62], BAR * 2, 118); note(P.timp, t0, 31, BAR, 127);
    }
  }
  const part = (notes, o) => Object.assign({ sf: 'musescore', amp: 'none', humanize: 3, notes }, o);
  return { bpm: BPM, parts: {
    rhythmL: part(P.rhythm, { amp: 'rhythm', humanize: 6 }),
    rhythmR: part(P.rhythm, { amp: 'rhythm', humanize: 6, cents: 6 }),
    bass: part(P.bass, { program: 34, amp: 'bass', humanize: 3 }),
    lead: part(P.lead, { amp: 'lead', humanize: 0 }),
    harmony: part(P.harm, { amp: 'lead', humanize: 4, cents: -5 }),
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
  const rand = (() => { let s = 4040; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const BARS = bars(), totalBars = BARS.length, dur = totalBars * BAR + 6;
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * dur), SR);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.12;
  const master = ctx.createGain(); master.gain.value = 0.8;
  const lowShelf = ctx.createBiquadFilter(); lowShelf.type = 'lowshelf'; lowShelf.frequency.value = 80; lowShelf.gain.value = -3;
  const dark = ctx.createBiquadFilter(); dark.type = 'highshelf'; dark.frequency.value = 6000; dark.gain.value = -5; // a darker top end, like the reference
  master.connect(lowShelf); lowShelf.connect(dark); dark.connect(comp); comp.connect(ctx.destination);
  const dry = ctx.createGain(); dry.connect(master);
  const verb = ctx.createConvolver();
  { const len = SR * 3.8, ir = ctx.createBuffer(2, len, SR); for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, 2.2); } verb.buffer = ir; }
  const verbOut = ctx.createGain(); verbOut.gain.value = 0.45; const verbLP = ctx.createBiquadFilter(); verbLP.type = 'lowpass'; verbLP.frequency.value = 5000;
  verb.connect(verbLP); verbLP.connect(verbOut); verbOut.connect(master);
  const delay = ctx.createDelay(2); delay.delayTime.value = STEP * 3; const fb = ctx.createGain(); fb.gain.value = 0.28;
  const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2400; delay.connect(dlp); dlp.connect(fb); fb.connect(delay); dlp.connect(master);
  const send = (node, v, alsoDelay) => { const g = ctx.createGain(); g.gain.value = v; node.connect(g); g.connect(verb); if (alsoDelay) g.connect(delay); };
  const noise = (() => { const b = ctx.createBuffer(1, SR * 2, SR), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1; return b; })();
  const has = n => (window.ASSET_NAMES || []).indexOf(n) >= 0;

  // ---- recorded stems ----
  // each stem is levelled to a target loudness (dB RMS while playing), so parts sit where intended whatever their raw level
  async function stem(name, pan, targetDb, verbAmt, useDelay) {
    if (!has('stem/' + name)) return;
    const buf = await loadAsset('stem/' + name, ctx), d = buf.getChannelData(0);
    let sum = 0, n = 0; for (let i = 0; i < d.length; i += 4) { const a = Math.abs(d[i]); if (a > 1e-3) { sum += a * a; n++; } }
    const rms = Math.sqrt(sum / Math.max(1, n)) || 1e-3, src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = Math.pow(10, targetDb / 20) / rms; const p = ctx.createStereoPanner(); p.pan.value = pan;
    src.connect(g); g.connect(p); p.connect(dry); send(p, verbAmt, useDelay); src.start(0);
  }
  await stem('rhythmL', -0.7, -17, 0.02);
  await stem('rhythmR', 0.7, -17, 0.02);
  await stem('bass', 0, -21, 0);
  await stem('lead', 0.0, -19, 0.28, true);
  await stem('harmony', 0.25, -24, 0.24, true);
  await stem('piano', -0.15, -21, 0.45);
  await stem('strings', 0.2, -26, 0.5);
  await stem('low', 0, -24, 0.25);
  await stem('brass', 0.15, -24, 0.35);
  await stem('organ', -0.1, -27, 0.5);
  await stem('timp', 0, -21, 0.35);

  // ---- breaks: one per section, never more than two at once ----
  const BRK = {}; for (const k of ['amen_yki', 'steppin1', 'steppin2']) if (has('break/' + k)) BRK[k] = await loadAsset('break/' + k, ctx);
  const INFO = window.BREAK_INFO || {}, bStep = 60 / 160 / 4, R = BPM / 160;
  const drumBus = ctx.createGain(); drumBus.gain.value = 0.9;
  const drumDip = ctx.createBiquadFilter(); drumDip.type = 'peaking'; drumDip.frequency.value = 1400; drumDip.Q.value = 0.8; drumDip.gain.value = -3;
  const drumLP = ctx.createBiquadFilter(); drumLP.type = 'lowpass'; drumLP.frequency.value = 18000;
  drumBus.connect(drumDip); drumDip.connect(drumLP); drumLP.connect(dry); send(drumLP, 0.06);
  function slice(name, t, idx, len, rate, vol) {
    const buf = BRK[name]; if (!buf) return;
    const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    const g = ctx.createGain(), d = len * bStep / rate, v = vol == null ? 1 : vol;
    g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + Math.max(0.005, d - 0.008)); g.gain.linearRampToValueAtTime(0, t + d);
    src.connect(g); g.connect(drumBus); src.start(t, idx * bStep, len * bStep); src.stop(t + d + 0.01);
  }
  const groove = (name, t0, loopBar, vol, len) => slice(name, t0, (loopBar % (INFO[name].steps / 16)) * 16, len || 16, R, vol);
  const roll = (name, t, steps, n, p0, p1, v0, v1) => { for (let k = 0; k < n; k++) { const f = k / Math.max(1, n - 1); slice(name, t + k * steps * STEP / n, INFO[name].snare, steps / n, R * (p0 + (p1 - p0) * f), v0 + (v1 - v0) * f); } };

  // ---- a little synthesis for weight: sub, kick punch, impacts, risers ----
  function hit(t, f0, f1, d, v, dest) { const o = ctx.createOscillator(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d * 0.7);
    const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(g); g.connect(dest || drumBus); o.start(t); o.stop(t + d + 0.02); }
  function nz(t, d, type, f, q, v, dest, attack) { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); if (attack) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + attack); } else g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + d); s.connect(fl); fl.connect(g); g.connect(dest || drumBus); s.start(t, rand()); s.stop(t + d + 0.02); return fl; }
  const kick = (t, v) => { hit(t, 150, 52, 0.2, 0.7 * v); nz(t, 0.01, 'highpass', 3000, 0.7, 0.18 * v); };
  const crash = (t, v) => nz(t, 2.2, 'highpass', 4800, 0.5, 0.14 * v);
  function impact(t, v) { crash(t, v); hit(t, 90, 28, 1.0, 0.6 * v, master); nz(t, 0.4, 'lowpass', 300, 0.7, 0.3 * v, master); }
  function riser(tEnd, len, v) { const f = nz(tEnd - len, len, 'bandpass', 400, 2, v, master, len * 0.95); f.frequency.setValueAtTime(250, tEnd - len); f.frequency.exponentialRampToValueAtTime(6000, tEnd); }
  const subBus = ctx.createGain(); subBus.gain.value = 0.35; subBus.connect(dry);
  function sub(t, m, len, v) { const o = ctx.createOscillator(); o.frequency.value = 440 * Math.pow(2, (m - 69) / 12); const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.setValueAtTime(v, t + len - 0.04); g.gain.linearRampToValueAtTime(0.0001, t + len); o.connect(g); g.connect(subBus); o.start(t); o.stop(t + len + 0.05); }
  function hush(t0, t1) { dry.gain.setValueAtTime(1, t0); dry.gain.linearRampToValueAtTime(0, t0 + 0.015); dry.gain.setValueAtTime(0, t1 - 0.006); dry.gain.linearRampToValueAtTime(1, t1); }

  for (const x of BARS) {
    const { sec, b, t0, ch, tr } = x, at = s => t0 + s * STEP, subN = 30 + ((ch[0] + tr - 30) % 12);
    if (sec === 'intro') {
      sub(t0, subN, BAR, 0.1 + 0.03 * b);
      if (b >= 6) { drumLP.frequency.setValueAtTime(b === 6 ? 400 : 1600, t0); drumLP.frequency.linearRampToValueAtTime(b === 6 ? 1600 : 18000, t0 + BAR); groove('amen_yki', t0, b, 0.7); }
      if (b === 7) riser(t0 + BAR, BAR * 2, 0.08);
      continue;
    }
    if (sec === 'phase1') { // break 1: the Amen
      if (b % 8 === 0) impact(t0, b === 0 ? 1.2 : 0.8);
      if (b % 8 === 7) { groove('amen_yki', t0, b, 1, 12); roll('amen_yki', at(12), 4, 6, 1, 1.25, 0.6, 0.95); }
      else groove('amen_yki', t0, b, 1);
      kick(t0, 1);
      sub(t0, subN, BAR - 0.02, 0.3);
      if (b === 15) riser(t0 + BAR, BAR, 0.06);
      continue;
    }
    if (sec === 'phase2') { // break 2: Hard Steppin 2; the breakdown uses single hits from Hard Steppin 1
      if (b === 0 || b === 12) impact(t0, 1);
      if (b >= 8 && b < 12) {
        if (b === 8) impact(t0, 1.3);
        [0, 6, 7, 10].forEach(s => { kick(at(s), 1); slice('steppin1', at(s), INFO.steppin1.kick, 1, R, 0.85); });
        slice('steppin1', at(8), INFO.steppin1.snare, 2, R * 0.9, 1.1);
        if (b === 11) roll('steppin1', at(12), 4, 8, 1, 1.3, 0.5, 1);
        sub(t0, 30, STEP * 6, 0.42); sub(at(10), 30 + (b >= 10 ? ((ch[0] - 30) % 12) : 0), STEP * 5, 0.4);
        continue;
      }
      if (b % 4 === 3) { groove('steppin2', t0, b, 1, 12); roll('steppin2', at(12), 4, b % 8 === 7 ? 8 : 4, 1, 1.25, 0.55, 0.95); }
      else groove('steppin2', t0, b, 1);
      kick(t0, 1); kick(at(10), 0.6);
      sub(t0, subN, BAR - 0.02, 0.3);
      if (b === 15) riser(t0 + BAR, BAR, 0.06);
      continue;
    }
    if (sec === 'eclipse') { // no drums: piano, strings, organ; one beat of silence at the end
      if (b === 0) crash(t0, 0.5);
      sub(t0, subN, BAR, 0.14);
      if (b === 7) { riser(t0 + BAR, BAR * 2, 0.1); hush(at(12), t0 + BAR); }
      continue;
    }
    if (sec === 'phase3') { // Amen with Hard Steppin 1 snares layered on the backbeat (two breaks at once)
      if (b % 4 === 0) impact(t0, b === 0 || b === 8 ? 1.3 : 0.8);
      if (b === 15) { groove('amen_yki', t0, b, 1, 8); roll('amen_yki', at(8), 8, 12, 1, 1.45, 0.45, 1); }
      else { groove('amen_yki', t0, b, 1); slice('steppin1', at(4), INFO.steppin1.snare, 1, R, 0.55); slice('steppin1', at(12), INFO.steppin1.snare, 1, R, 0.55); }
      for (let s = 0; s < 16; s += 4) kick(at(s), s ? 0.6 : 1);
      sub(t0, subN, BAR - 0.02, 0.32);
      continue;
    }
    if (sec === 'outro' && b === 0) { impact(t0, 1.4); kick(t0, 1); sub(t0, 31, BAR * 3, 0.4); }
  }
  master.gain.setValueAtTime(0.8, totalBars * BAR + 1); master.gain.linearRampToValueAtTime(0, dur);
  const out = await ctx.startRendering();
  const L = out.getChannelData(0), Rc = out.getChannelData(1), n = L.length, buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rc[i]));
  const norm = peak > 0 ? 0.95 / peak : 1;
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, n * 4, true);
  for (let i = 0, o = 44; i < n; i++, o += 4) { v.setInt16(o, Math.max(-1, Math.min(1, L[i] * norm)) * 32767, true); v.setInt16(o + 2, Math.max(-1, Math.min(1, Rc[i] * norm)) * 32767, true); }
  let bin = ''; const u8 = new Uint8Array(buf); for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
  return { wav: btoa(bin), seconds: dur, peak };
}
