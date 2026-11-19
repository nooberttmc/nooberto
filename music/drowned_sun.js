// "The Drowned Sun" v2: the final boss theme. 174 BPM, E minor, lifting to F minor for the last stand.
// Drums: real breakbeats (Myor break pack) chopped and pitched up from 160 BPM, reinforced with synthesized kicks.
// Guitars: guitarEvents() describes the parts; tools/guitar_stems.py records them with sampled electric guitars
// (FluidSynth) and re-amps them through Guitarix plugins and a 4x12 cabinet curve; renderSong() mixes the stems in.
const BPM = 174, STEP = 60 / BPM / 4, BAR = STEP * 16;
const SECTIONS = [['intro', 8], ['phase1', 16], ['phase2', 16], ['bridge', 8], ['phase3', 16], ['outro', 4]];
const Q = { m: [0, 3, 7], M: [0, 4, 7], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11], '7': [0, 4, 7, 10] };
const Em = [52, 'm'], Cmaj7 = [48, 'M7'], C = [48, 'M'], Am7 = [57, 'm7'], B7 = [59, '7'], G = [55, 'M'], D = [50, 'M'], Gmaj7 = [55, 'M7'], Em7 = [52, 'm7'];
const PA = [Em, Cmaj7, Am7, B7, Em, G, D, B7], PB = [Cmaj7, D, B7, Em, Am7, D, Gmaj7, B7];
const CLIMAX_P = [C, D, Em, Em, C, D, B7, B7];
// melodies: [16th step, midi, length in 16ths]
const THEME_A = [
  [[0, 71, 6], [6, 74, 2], [8, 76, 8]], [[0, 79, 4], [4, 76, 4], [8, 71, 4], [12, 72, 4]], [[0, 72, 6], [6, 71, 2], [8, 69, 4], [12, 67, 4]], [[0, 66, 8], [8, 63, 6]],
  [[0, 71, 4], [4, 74, 4], [8, 79, 6], [14, 78, 2]], [[0, 79, 6], [6, 78, 2], [8, 74, 8]], [[0, 78, 4], [4, 74, 4], [8, 69, 4], [12, 74, 4]], [[0, 75, 8], [8, 78, 6]],
];
const THEME_B = [
  [[0, 76, 2], [2, 79, 2], [4, 76, 2], [6, 72, 2], [8, 71, 4], [12, 72, 4]], [[0, 74, 2], [2, 78, 2], [4, 81, 4], [8, 78, 4], [12, 74, 4]],
  [[0, 75, 4], [4, 78, 4], [8, 81, 4], [12, 78, 4]], [[0, 79, 8], [8, 76, 6]],
  [[0, 72, 2], [2, 76, 2], [4, 79, 4], [8, 76, 4], [12, 72, 4]], [[0, 74, 4], [4, 78, 4], [8, 81, 6], [14, 78, 2]],
  [[0, 79, 4], [4, 78, 4], [8, 74, 4], [12, 71, 4]], [[0, 75, 8], [8, 71, 6]],
];
const CLIMAX = [
  [[0, 79, 8], [8, 76, 4], [12, 79, 4]], [[0, 81, 8], [8, 78, 4], [12, 81, 4]], [[0, 83, 12], [12, 81, 4]], [[0, 79, 8], [8, 76, 8]],
  [[0, 84, 8], [8, 83, 4], [12, 79, 4]], [[0, 81, 8], [8, 78, 4], [12, 81, 4]], [[0, 83, 8], [8, 81, 4], [12, 78, 4]], [[0, 75, 16]],
];
const BREAKDOWN_LEAD = [[[0, 76, 16]], [[0, 74, 8], [8, 76, 8]], [[0, 79, 16]], [[0, 78, 8], [8, 75, 8]]];
const BREAKDOWN_P = [Em, Em, C, B7];

// the whole song as a list of bars: chord, transposition, section and bar index within it
function bars() {
  const out = []; let gi = 0;
  for (const [sec, n] of SECTIONS) for (let b = 0; b < n; b++, gi++) {
    let ch, tr = 0;
    if (sec === 'intro' || sec === 'bridge') ch = (sec === 'intro' ? PA.slice(0, 4).concat(PA.slice(0, 4)) : [Am7, Em7, Cmaj7, B7, Am7, Em7, Cmaj7, B7])[b];
    else if (sec === 'phase1') ch = PA[b % 8];
    else if (sec === 'phase2') ch = b >= 8 && b < 12 ? BREAKDOWN_P[b - 8] : PB[b % 8];
    else if (sec === 'phase3') { ch = b < 8 ? PA[b] : CLIMAX_P[b - 8]; tr = b < 8 ? 0 : 1; }
    else { ch = Em; tr = 1; }
    out.push({ sec, b, gi, t0: gi * BAR, ch, tr, notes: Q[ch[1]].map(i => ch[0] + i + tr) });
  }
  return out;
}
const gRoot = (c, tr) => 40 + ((c[0] + tr - 40) % 12);  // power-chord root, E2..D#3
const below = (m, notes) => { for (let k = m - 3; k > m - 6; k--) if (notes.some(n => (n - k) % 12 === 0)) return k; return m - 4; };

// ---------------- the guitar parts (recorded by tools/guitar_stems.py) ----------------
function guitarEvents() {
  const rhythm = [], lead = [], harm = [], clean = [];
  const pc = (t, root, len, art, vel) => { for (const n of [root, root + 7, root + 12]) rhythm.push([t, n, len, vel, art]); };
  const pat = (t0, root, P) => P.forEach(([s, l, art]) => pc(t0 + s * STEP, root, l * STEP * 0.95, art, art === 'open' ? 116 : 100));
  const RIFF1 = [[0, 3, 'open'], [3, 1, 'mute'], [4, 1, 'mute'], [6, 1, 'mute'], [7, 2, 'open'], [10, 1, 'mute'], [11, 1, 'mute'], [12, 3, 'open'], [15, 1, 'mute']];
  const RIFF1_END = [[0, 3, 'open'], [4, 1, 'mute'], [6, 2, 'open'], [8, 1, 'mute'], [9, 1, 'mute'], [10, 1, 'mute'], [11, 1, 'mute'], [12, 4, 'open']];
  const GALLOP = [0, 4, 8, 12].flatMap(b => [[b, 2, b % 8 === 0 ? 'open' : 'mute'], [b + 2, 1, 'mute'], [b + 3, 1, 'mute']]);
  const BREAKDOWN = [[0, 4, 'open'], [6, 1, 'mute'], [7, 1, 'mute'], [10, 2, 'open'], [13, 1, 'mute'], [14, 1, 'mute'], [15, 1, 'mute']];
  const DRIVE = [0, 4, 8, 12].flatMap(b => [[b, 2, 'open'], [b + 2, 1, 'mute'], [b + 3, 1, 'mute']]);
  const melody = (t0, line, tr, notes, twin) => line.forEach(([s, m, l]) => {
    const mm = m + tr; lead.push([t0 + s * STEP, mm, l * STEP * 0.97, 112, 'lead']);
    if (twin) harm.push([t0 + s * STEP, below(mm, notes), l * STEP * 0.97, 104, 'lead']);
  });
  for (const x of bars()) {
    const { sec, b, t0, ch, tr, notes } = x, r = gRoot(ch, tr);
    if (sec === 'intro') {
      if (b >= 4 && b < 7) pc(t0, r, BAR * 0.98, 'open', 92 + b * 4);
      if (b === 7) { pc(t0, r, STEP * 7.6, 'open', 108); for (let s = 8; s < 16; s++) pc(t0 + s * STEP, 40, STEP * 0.9, 'mute', 84 + s * 3); }
    } else if (sec === 'phase1') {
      pat(t0, r, b % 8 === 7 ? RIFF1_END : RIFF1); melody(t0, THEME_A[b % 8], 0, notes, b >= 8);
    } else if (sec === 'phase2') {
      if (b >= 8 && b < 12) { pat(t0, b < 10 ? 40 : r, BREAKDOWN); melody(t0, BREAKDOWN_LEAD[b - 8], 0, notes, true); }
      else { pat(t0, r, GALLOP); melody(t0, THEME_B[b % 8], 0, notes, b < 8); }
    } else if (sec === 'bridge') {
      const arp = [0, 1, 2, 3, 2, 1, 2, 3].map(i => notes[i % notes.length] - 12 + (notes[i % notes.length] - 12 < 47 ? 12 : 0));
      for (let s = 0; s < 16; s += 2) clean.push([t0 + s * STEP, arp[s / 2], STEP * 3.5, 84, 'open']);
      if (b === 7) melody(t0, [[0, 71, 8]], 0, notes, false);
    } else if (sec === 'phase3') {
      pat(t0, r, DRIVE); melody(t0, b < 8 ? THEME_A[b] : CLIMAX[b - 8], tr, notes, true);
    } else if (b === 0) { // outro: one huge chord in F minor and a held twin note
      pc(t0, gRoot(ch, tr), BAR * 3, 'open', 120);
      lead.push([t0, 77, BAR * 3, 116, 'lead']); harm.push([t0, 72, BAR * 3, 108, 'lead']);
    }
  }
  return { bpm: BPM, parts: {
    rhythmL: { sf: 'musescore', amp: 'rhythm', humanize: 6, notes: rhythm },              // two takes of the same guitar and rig:
    rhythmR: { sf: 'musescore', amp: 'rhythm', humanize: 6, cents: 6, notes: rhythm },     // own timing, own picking strength, a few cents apart
    lead: { sf: 'musescore', amp: 'lead', humanize: 0, notes: lead },
    harmony: { sf: 'musescore', amp: 'lead', humanize: 4, cents: -5, notes: harm },
    clean: { sf: 'musescore', amp: 'none', humanize: 5, notes: clean },
  } };
}

// ---------------- the mix ----------------
async function renderSong() {
  const SR = 44100;
  const rand = (() => { let s = 2025; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const BARS = bars(), totalBars = BARS.length, dur = totalBars * BAR + 6;
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * dur), SR);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3.5; comp.attack.value = 0.005; comp.release.value = 0.15;
  const master = ctx.createGain(); master.gain.value = 0.85;
  const lowShelf = ctx.createBiquadFilter(); lowShelf.type = 'lowshelf'; lowShelf.frequency.value = 90; lowShelf.gain.value = -4.5; // keep the sub from eating the guitars' headroom
  master.connect(lowShelf); lowShelf.connect(comp); comp.connect(ctx.destination);
  const dry = ctx.createGain(); dry.connect(master);
  const verb = ctx.createConvolver();
  { const len = SR * 3.5, ir = ctx.createBuffer(2, len, SR); for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, 2.3); } verb.buffer = ir; }
  const verbOut = ctx.createGain(); verbOut.gain.value = 0.45; verb.connect(verbOut); verbOut.connect(master);
  const delay = ctx.createDelay(2); delay.delayTime.value = STEP * 3; const fb = ctx.createGain(); fb.gain.value = 0.3;
  const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2600; delay.connect(dlp); dlp.connect(fb); fb.connect(delay); dlp.connect(master);
  const send = (node, v, alsoDelay) => { const g = ctx.createGain(); g.gain.value = v; node.connect(g); g.connect(verb); if (alsoDelay) g.connect(delay); };
  const noise = (() => { const b = ctx.createBuffer(1, SR * 2, SR), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1; return b; })();
  const has = n => (window.ASSET_NAMES || []).indexOf(n) >= 0;

  // ---- guitars: the recorded, re-amped stems ----
  async function stem(name, pan, vol, verbAmt, useDelay) {
    if (!has('stem/' + name)) return;
    const buf = await loadAsset('stem/' + name, ctx), src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = vol; const p = ctx.createStereoPanner(); p.pan.value = pan;
    src.connect(g); g.connect(p); p.connect(dry); send(p, verbAmt, useDelay); src.start(0);
  }
  await stem('rhythmL', -0.7, 0.62, 0.02);
  await stem('rhythmR', 0.7, 0.62, 0.02);
  await stem('lead', 0.0, 0.46, 0.3, true);
  await stem('harmony', 0.3, 0.3, 0.25, true);
  await stem('clean', -0.1, 0.42, 0.7, true);

  // ---- breaks: chopped from the pack (160 BPM) and pitched up to 174 ----
  const BRK = {}; for (const k of Object.keys(window.BREAK_INFO || {})) if (has('break/' + k)) BRK[k] = await loadAsset('break/' + k, ctx);
  const INFO = window.BREAK_INFO || {}, bStep = 60 / 160 / 4, R = BPM / 160;
  const drumBus = ctx.createGain(); drumBus.gain.value = 0.95;
  const drumLP = ctx.createBiquadFilter(); drumLP.type = 'lowpass'; drumLP.frequency.value = 18000;
  const drumDip = ctx.createBiquadFilter(); drumDip.type = 'peaking'; drumDip.frequency.value = 1500; drumDip.Q.value = 0.8; drumDip.gain.value = -3; // room for the lead
  drumBus.connect(drumDip); drumDip.connect(drumLP); drumLP.connect(dry); send(drumLP, 0.08);
  function slice(name, t, idx, len, rate, vol) {
    const buf = BRK[name]; if (!buf) return;
    const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    const g = ctx.createGain(), d = len * bStep / rate, v = vol == null ? 1 : vol;
    g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + Math.max(0.005, d - 0.008)); g.gain.linearRampToValueAtTime(0, t + d);
    src.connect(g); g.connect(drumBus); src.start(t, idx * bStep, len * bStep); src.stop(t + d + 0.01);
  }
  const groove = (name, t0, loopBar, vol, len) => slice(name, t0, (loopBar % (INFO[name].steps / 16)) * 16, len || 16, R, vol); // a bar (or its first `len` 16ths), untouched
  const snareRoll = (name, t, steps, n, p0, p1, v0, v1) => { for (let k = 0; k < n; k++) { const f = k / Math.max(1, n - 1); slice(name, t + k * steps * STEP / n, INFO[name].snare, steps / n, R * (p0 + (p1 - p0) * f), v0 + (v1 - v0) * f); } };

  // ---- synthesized reinforcement: punchy kick, crash, impacts, risers, taiko ----
  function hit(t, f0, f1, d, v, type, dest) { const o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d * 0.7);
    const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(g); g.connect(dest || drumBus); o.start(t); o.stop(t + d + 0.02); }
  function nz(t, d, type, f, q, v, dest, attack) { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); if (attack) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + attack); } else g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + d); s.connect(fl); fl.connect(g); g.connect(dest || drumBus); s.start(t, rand()); s.stop(t + d + 0.02); return fl; }
  const kick = (t, v) => { hit(t, 150, 55, 0.2, 0.75 * v); nz(t, 0.01, 'highpass', 3000, 0.7, 0.2 * v); }; // tighter, less boomy
  const crash = (t, v) => { nz(t, 2.4, 'highpass', 5200, 0.5, 0.17 * v); nz(t, 1.3, 'bandpass', 3200, 0.6, 0.07 * v); };
  const taiko = (t, v) => { hit(t, 78, 40, 0.9, 0.9 * v); nz(t, 0.25, 'lowpass', 500, 0.7, 0.32 * v); };
  const tom = (t, f, v) => hit(t, f, f * 0.6, 0.32, 0.55 * v);
  function impact(t, v) { crash(t, v); taiko(t, v); hit(t, 95, 30, 0.9, 0.55 * v, 'sine', master); }
  function riser(tEnd, len, v) { const f = nz(tEnd - len, len, 'bandpass', 400, 2, v, master, len * 0.95); f.frequency.setValueAtTime(300, tEnd - len); f.frequency.exponentialRampToValueAtTime(7000, tEnd); }

  // ---- orchestra ----
  const strBus = ctx.createGain(); const strLP = ctx.createBiquadFilter(); strLP.type = 'lowpass'; strLP.frequency.value = 2400; strBus.connect(strLP); strLP.connect(dry); send(strLP, 0.5);
  function strings(t, notes, len, vol, att) {
    notes.forEach((m, i) => { for (const det of [-7, 7]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det + (rand() - 0.5) * 4;
      const g = ctx.createGain(), a = att == null ? 0.3 : att; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.setValueAtTime(vol, t + len); g.gain.linearRampToValueAtTime(0.0001, t + len + 0.4);
      const p = ctx.createStereoPanner(); p.pan.value = (i / Math.max(1, notes.length - 1) - 0.5) * 0.9 + det / 40;
      o.connect(g); g.connect(p); p.connect(strBus); o.start(t); o.stop(t + len + 0.45);
    } });
  }
  function brass(t, notes, len, vol) {
    notes.forEach(m => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2800, t + 0.04); f.frequency.exponentialRampToValueAtTime(900, t + len);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(vol * 0.5, t + len); g.gain.linearRampToValueAtTime(0.0001, t + len + 0.12);
      o.connect(f); f.connect(g); g.connect(dry); send(g, 0.35); o.start(t); o.stop(t + len + 0.15);
    });
  }
  const bassBus = ctx.createGain(); bassBus.gain.value = 0.42; bassBus.connect(dry);
  function bass(t, m, len, vol, grit) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(m);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.setValueAtTime(vol, t + len - 0.04); g.gain.linearRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(bassBus); o.start(t); o.stop(t + len + 0.05);
    if (grit) { const s = ctx.createOscillator(); s.type = 'sawtooth'; s.frequency.value = mtof(m + 12); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 650; f.Q.value = 3;
      const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.0001, t); g2.gain.linearRampToValueAtTime(vol * 0.2, t + 0.008); g2.gain.setValueAtTime(vol * 0.2, t + len - 0.04); g2.gain.linearRampToValueAtTime(0.0001, t + len);
      s.connect(f); f.connect(g2); g2.connect(bassBus); s.start(t); s.stop(t + len + 0.05); }
  }
  function hush(t0, t1) { dry.gain.setValueAtTime(1, t0); dry.gain.linearRampToValueAtTime(0, t0 + 0.015); dry.gain.setValueAtTime(0, t1 - 0.006); dry.gain.linearRampToValueAtTime(1, t1); }

  let dCut = 18000;
  for (const x of BARS) {
    const { sec, b, t0, ch, tr, notes } = x, at = s => t0 + s * STEP, sub = 28 + ((ch[0] + tr - 28) % 12), last = b === SECTIONS.find(s => s[0] === sec)[1] - 1;
    const up = notes.map(n => n + 12);
    if (sec === 'intro') {
      strings(t0, notes.map(n => n - 12 + (n < 52 ? 12 : 0)), BAR, 0.013 + 0.002 * b, 0.7);
      if (b % 2 === 0) taiko(t0, 0.5 + b * 0.06);
      bass(t0, sub, BAR, 0.12 + 0.02 * b);
      if (b >= 6) { // the break fades in through a closing filter
        if (b === 6) { dCut = 500; drumLP.frequency.setValueAtTime(dCut, t0); }
        groove('amen_yki', t0, b, 0.75); drumLP.frequency.linearRampToValueAtTime(dCut = b === 6 ? 1500 : 18000, t0 + BAR);
      }
      if (last) { [8, 10, 12, 14].forEach((s, i) => tom(at(s), [150, 125, 100, 80][i], 0.8)); riser(t0 + BAR, BAR * 2, 0.08); }
      continue;
    }
    if (sec === 'phase1') { // full-tilt drum & bass with the main theme
      if (b % 8 === 0) impact(t0, b === 0 ? 1.2 : 0.8);
      if (b % 4 === 3) { groove('amen_yki', t0, b, 1, 12); slice('amen_yki', at(12), INFO.amen_yki.snare, 1, R); snareRoll('amen_yki', at(13), 3, b % 8 === 7 ? 6 : 3, 1, 1.2, 0.6, 0.9); }
      else groove('amen_yki', t0, b, 1);
      kick(t0, 1); kick(at(10), 0.7);
      brass(t0, up, STEP * 3, 0.03); if (b % 2) brass(at(7), up, STEP * 2, 0.022);
      strings(t0, notes, BAR, 0.009);
      bass(t0, sub, STEP * 7, 0.3, true); bass(at(7), sub, STEP * 5, 0.28, true); bass(at(12), sub, STEP * 4, 0.28, true);
      if (last) riser(t0 + BAR, BAR, 0.06);
      continue;
    }
    if (sec === 'phase2') { // heavier breaks; a half-time metal breakdown in bars 9-12
      if (b === 0 || b === 12) impact(t0, 1);
      if (b >= 8 && b < 12) {
        if (b === 8) { impact(t0, 1.2); }
        [0, 6, 7, 10].forEach(s => { kick(at(s), 1); slice('steppin1', at(s), INFO.steppin1.kick, 1, R, 0.8); });
        slice('steppin1', at(8), INFO.steppin1.snare, 2, R * 0.92, 1.1); crash(at(8), 0.25);
        if (b === 11) snareRoll('steppin2', at(12), 4, 8, 1, 1.35, 0.5, 1);
        strings(t0, notes.map(n => n - 12), BAR, 0.012, 0.05);
        bass(t0, 28, STEP * 6, 0.4, true); bass(at(10), 28, STEP * 5, 0.38, true);
        continue;
      }
      const name = b < 8 ? (b % 4 < 2 ? 'steppin1' : 'steppin2') : 'amen_df';
      if (b % 4 === 3) { groove(name, t0, b, 1, 12); snareRoll(name, at(12), 4, b % 8 === 7 ? 8 : 4, 1, 1.25, 0.55, 0.95); }
      else groove(name, t0, b, 1);
      kick(t0, 1); kick(at(10), 0.75);
      brass(t0, up, STEP * 3, 0.034); brass(at(8), up, STEP * 2, 0.026);
      for (let s = 0; s < 16; s += 4) strings(at(s), [notes[(s / 4) % notes.length] + 12], STEP * 1.5, 0.008, 0.01);
      bass(t0, sub, STEP * 8, 0.32, true); bass(at(8), sub, STEP * 8, 0.3, true);
      if (last) riser(t0 + BAR, BAR, 0.06);
      continue;
    }
    if (sec === 'bridge') { // the calm before the end
      if (b === 0) { crash(t0, 0.6); dCut = 18000; }
      strings(t0, notes, BAR, 0.013, 0.6);
      taiko(t0, 0.45); if (b >= 4) taiko(at(8), 0.35);
      if (b >= 6) groove('think', t0, b, 0.35 + (b - 6) * 0.2);
      bass(t0, sub, BAR, 0.18);
      if (last) { riser(t0 + BAR, BAR * 2, 0.1); hush(at(12), t0 + BAR); }
      continue;
    }
    if (sec === 'phase3') { // the last stand: dense breaks, double kicks, twin guitars; key lifts for the last 8 bars
      if (b % 4 === 0) impact(t0, b === 0 || b === 8 ? 1.3 : 0.8);
      const name = b < 8 ? 'bloodfire' : 'amen_df';
      if (b === 15) { groove(name, t0, b, 1, 8); snareRoll(name, at(8), 8, 16, 1, 1.5, 0.45, 1); }
      else groove(name, t0, b, 1);
      for (let s = 0; s < 16; s += 2) kick(at(s), s % 4 ? 0.45 : 0.7);
      brass(t0, up, STEP * 4, 0.036); brass(at(8), up, STEP * 3, 0.03);
      strings(t0, notes.concat([notes[0] + 12]), BAR, 0.011);
      bass(t0, sub, BAR - 0.02, 0.36, true);
      continue;
    }
    if (sec === 'outro' && b === 0) {
      impact(t0, 1.4); kick(t0, 1);
      strings(t0, [53, 60, 65, 68, 72], BAR * 2.5, 0.013);
      bass(t0, 29, BAR * 2.5, 0.4);
    }
  }
  master.gain.setValueAtTime(0.85, totalBars * BAR + 1); master.gain.linearRampToValueAtTime(0, dur);
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
