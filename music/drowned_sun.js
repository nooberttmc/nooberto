// "The Drowned Sun": the final boss theme. Grand and intense, built entirely from synthesis.
// Electric guitars use Karplus-Strong plucked strings (computed sample by sample) through a distortion amp
// and cabinet filters; strings, choir, brass, taiko and a rock kit fill out the orchestra.
// E minor; three phases like the boss, a calm bridge, and a last stand.
async function renderSong() {
  const SR = 44100;
  const rand = (() => { let s = 2025; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const BPM = 160, step = 60 / BPM / 4, bar = step * 16;
  const S = [['intro', 8], ['phase1', 16], ['phase2', 16], ['bridge', 8], ['phase3', 16], ['outro', 4]];
  const totalBars = S.reduce((a, s) => a + s[1], 0), dur = totalBars * bar + 6;
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * dur), SR);

  // ---------- mix buses ----------
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3.5; comp.attack.value = 0.006; comp.release.value = 0.2;
  const master = ctx.createGain(); master.gain.value = 0.85; master.connect(comp); comp.connect(ctx.destination);
  const dry = ctx.createGain(); dry.connect(master); // can be silenced while reverb tails ring on
  const verb = ctx.createConvolver();
  { const len = SR * 4, ir = ctx.createBuffer(2, len, SR); for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, 2.2); } verb.buffer = ir; }
  const verbOut = ctx.createGain(); verbOut.gain.value = 0.5; verb.connect(verbOut); verbOut.connect(master);
  const delay = ctx.createDelay(2); delay.delayTime.value = step * 3; const fb = ctx.createGain(); fb.gain.value = 0.3;
  const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2500; delay.connect(dlp); dlp.connect(fb); fb.connect(delay); dlp.connect(master);
  const send = (node, v, alsoDelay) => { const g = ctx.createGain(); g.gain.value = v; node.connect(g); g.connect(verb); if (alsoDelay) g.connect(delay); };
  const noise = (() => { const b = ctx.createBuffer(1, SR * 2, SR), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1; return b; })();

  // ---------- electric guitar: amp + cabinet ----------
  function amp(drive, pan, out, toVerb) {
    const inp = ctx.createGain(), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 85;
    const pre = ctx.createGain(); pre.gain.value = drive;
    const sh = ctx.createWaveShaper(); const c = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) { const x = i / 1024 - 1; c[i] = Math.tanh(3 * x) * (x < 0 ? 0.92 : 1); } sh.curve = c; sh.oversample = '4x';
    const lowMid = ctx.createBiquadFilter(); lowMid.type = 'peaking'; lowMid.frequency.value = 450; lowMid.Q.value = 1; lowMid.gain.value = -3;
    const pres = ctx.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 2300; pres.Q.value = 1; pres.gain.value = 3.5;
    const cab = ctx.createBiquadFilter(); cab.type = 'lowpass'; cab.frequency.value = 4800; cab.Q.value = 0.7;
    const cab2 = ctx.createBiquadFilter(); cab2.type = 'lowpass'; cab2.frequency.value = 6500; cab2.Q.value = 0.5;
    const o = ctx.createGain(); o.gain.value = out; const p = ctx.createStereoPanner(); p.pan.value = pan;
    inp.connect(hp); hp.connect(pre); pre.connect(sh); sh.connect(lowMid); lowMid.connect(pres); pres.connect(cab); cab.connect(cab2); cab2.connect(o); o.connect(p); p.connect(dry);
    send(p, toVerb, toVerb > 0.2);
    return inp;
  }
  const gtrL = amp(9, -0.75, 0.16, 0.12), gtrR = amp(9, 0.75, 0.16, 0.12);   // double-tracked rhythm
  const gtrLead = amp(14, 0.05, 0.15, 0.35);                                 // lead
  const gtrClean = (() => { const g = ctx.createGain(); g.gain.value = 0.5; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800; g.connect(lp); lp.connect(dry); send(lp, 0.6, true); return g; })();
  // Karplus-Strong strings, computed directly: a noise burst circulating in a damped delay line
  const ksCache = new Map();
  function ks(midis, len, o) {
    const key = midis.join(',') + '|' + len.toFixed(3) + '|' + (o.mute ? 1 : 0) + '|' + (o.sus || 0);
    if (ksCache.has(key)) return ksCache.get(key);
    const n = Math.ceil(len * SR), out = new Float32Array(n);
    midis.forEach((m, si) => {
      const N = Math.max(2, Math.round(SR / mtof(m) - 0.5)), y = new Float32Array(n), off = Math.round(si * (o.mute ? 0.0015 : 0.005) * SR);
      let prev = 0; const br = o.mute ? 0.3 : 0.55;
      for (let i = 0; i < N && i < n; i++) { prev += br * ((rand() * 2 - 1) - prev); y[i] = prev; }
      const decay = o.mute ? 0.9 : (o.sus || 0.998);
      for (let i = N + 1; i < n; i++) y[i] = decay * 0.5 * (y[i - N] + y[i - N - 1]);
      const a = 1 / (1 + si * 0.3);
      for (let i = 0; i + off < n; i++) out[i + off] += y[i] * a;
    });
    const b = new AudioBuffer({ length: n, numberOfChannels: 1, sampleRate: SR }); b.copyToChannel(out, 0);
    ksCache.set(key, b); return b;
  }
  function gtr(dest, t, midis, len, o) {
    o = o || {};
    const src = ctx.createBufferSource(); src.buffer = ks(midis, len + 0.05, o);
    if (o.slide) { src.playbackRate.setValueAtTime(Math.pow(2, -o.slide / 12), t); src.playbackRate.linearRampToValueAtTime(1, t + 0.07); }
    if (o.vib) { const l = ctx.createOscillator(); l.frequency.value = 5.5; const d = ctx.createGain(); d.gain.setValueAtTime(0, t); d.gain.linearRampToValueAtTime(0.0065, t + Math.min(len, 0.4)); l.connect(d); d.connect(src.playbackRate); l.start(t); l.stop(t + len + 0.1); }
    const g = ctx.createGain(), v = o.vol == null ? 1 : o.vol;
    if (o.swell) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + len * 0.7); } else g.gain.setValueAtTime(v, t);
    g.gain.setValueAtTime(v, t + len - 0.03); g.gain.linearRampToValueAtTime(0, t + len);
    src.connect(g); g.connect(dest); src.start(t); src.stop(t + len + 0.05);
  }
  const power = r => [r, r + 7, r + 12];
  function rhythm(t, root, len, mute, vol) { // both sides, slightly humanised
    gtr(gtrL, t, power(root), len, { mute, vol });
    gtr(gtrR, t + 0.006, power(root), len, { mute, vol: (vol || 1) * 0.95 });
  }

  // ---------- orchestra ----------
  const strBus = ctx.createGain(); strBus.gain.value = 1; const strLP = ctx.createBiquadFilter(); strLP.type = 'lowpass'; strLP.frequency.value = 2400; strBus.connect(strLP); strLP.connect(dry); send(strLP, 0.5);
  function strings(t, notes, len, vol, att) {
    notes.forEach((m, i) => { for (const det of [-7, 7]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det + (rand() - 0.5) * 4;
      const g = ctx.createGain(), a = att == null ? 0.35 : att; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.setValueAtTime(vol, t + len); g.gain.linearRampToValueAtTime(0.0001, t + len + 0.4);
      const p = ctx.createStereoPanner(); p.pan.value = (i / Math.max(1, notes.length - 1) - 0.5) * 0.9 + det / 40;
      o.connect(g); g.connect(p); p.connect(strBus); o.start(t); o.stop(t + len + 0.45);
    } });
  }
  const choirBus = ctx.createGain(); choirBus.connect(dry); send(choirBus, 0.9);
  function choir(t, m, len, vol) { // "aah": a buzzy source shaped by two vowel formants
    for (const det of [-10, 0, 10]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
      const vib = ctx.createOscillator(); vib.frequency.value = 4.8 + rand(); const vd = ctx.createGain(); vd.gain.value = 12; vib.connect(vd); vd.connect(o.detune);
      const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 720; f1.Q.value = 6;
      const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1150; f2.Q.value = 8;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.6); g.gain.setValueAtTime(vol, t + len); g.gain.linearRampToValueAtTime(0.0001, t + len + 0.8);
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(choirBus); o.start(t); vib.start(t); o.stop(t + len + 0.85); vib.stop(t + len + 0.85);
    }
  }
  function brass(t, notes, len, vol) { // stab: filter opens fast, then settles
    notes.forEach(m => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.05); f.frequency.exponentialRampToValueAtTime(900, t + len);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(vol * 0.5, t + len); g.gain.linearRampToValueAtTime(0.0001, t + len + 0.15);
      o.connect(f); f.connect(g); g.connect(dry); send(g, 0.4); o.start(t); o.stop(t + len + 0.2);
    });
  }
  const bassBus = ctx.createGain(); bassBus.gain.value = 0.62; bassBus.connect(dry); // sits under the guitars, not over them
  function bass(t, m, len, vol, grit) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(m);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.setValueAtTime(vol, t + len - 0.05); g.gain.linearRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(bassBus); o.start(t); o.stop(t + len + 0.05);
    if (grit) { const s = ctx.createOscillator(); s.type = 'sawtooth'; s.frequency.value = mtof(m + 12); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 3;
      const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.0001, t); g2.gain.linearRampToValueAtTime(vol * 0.18, t + 0.01); g2.gain.setValueAtTime(vol * 0.18, t + len - 0.05); g2.gain.linearRampToValueAtTime(0.0001, t + len);
      s.connect(f); f.connect(g2); g2.connect(bassBus); s.start(t); s.stop(t + len + 0.05); }
  }

  // ---------- drums (noise-only cymbals: nothing that rings) ----------
  const drumBus = ctx.createGain(); drumBus.gain.value = 0.9; drumBus.connect(dry); send(drumBus, 0.14);
  function hit(t, f0, f1, d, v, type) { const o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d * 0.7);
    const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(g); g.connect(drumBus); o.start(t); o.stop(t + d + 0.02); }
  function nz(t, d, type, f, q, v, dest) { const s = ctx.createBufferSource(); s.buffer = noise; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); s.connect(fl); fl.connect(g); g.connect(dest || drumBus); s.start(t, rand()); s.stop(t + d + 0.02); }
  const kick = (t, v) => { hit(t, 130, 42, 0.32, 0.9 * v); nz(t, 0.012, 'highpass', 2500, 0.7, 0.2 * v); };
  const snare = (t, v) => { hit(t, 210, 160, 0.14, 0.4 * v, 'triangle'); nz(t, 0.24, 'bandpass', 2000, 0.6, 0.6 * v); };
  const hat = (t, v) => nz(t, 0.045, 'highpass', 8000, 0.8, 0.13 * v);
  const crash = (t, v) => { nz(t, 2.2, 'highpass', 5000, 0.5, 0.2 * v); nz(t, 1.2, 'bandpass', 3000, 0.6, 0.08 * v); };
  const tom = (t, f, v) => hit(t, f, f * 0.6, 0.35, 0.55 * v);
  const taiko = (t, v) => { hit(t, 75, 42, 0.9, 0.9 * v); nz(t, 0.25, 'lowpass', 500, 0.7, 0.35 * v); };

  // ---------- harmony: E minor, triads and 7ths; B7 (the dominant) pulls home ----------
  const Q = { m: [0, 3, 7], M: [0, 4, 7], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11], '7': [0, 4, 7, 10] };
  const Em = [52, 'm'], Cmaj7 = [48, 'M7'], C = [48, 'M'], Am7 = [57, 'm7'], B7 = [59, '7'], G = [55, 'M'], D = [50, 'M'], Gmaj7 = [55, 'M7'], Em7 = [52, 'm7'];
  const PROG = {
    intro:  [Em, Cmaj7, Am7, B7, Em, Cmaj7, Am7, B7],
    phase1: [Em, Cmaj7, Am7, B7, Em, G, D, B7],
    phase2: [Cmaj7, D, B7, Em, Am7, D, Gmaj7, B7],
    bridge: [Am7, Em7, Cmaj7, B7, Am7, Em7, Cmaj7, B7],
    phase3: [Em, Cmaj7, Am7, B7, Em, G, D, B7, C, D, Em, Em, C, D, B7, B7],
    outro:  [Em, Em, Em, Em],
  };
  const notesOf = c => Q[c[1]].map(i => c[0] + i);
  const gRoot = c => 40 + ((c[0] - 40) % 12);       // guitar power-chord root, E2..D#3
  const subRoot = c => 28 + ((c[0] - 28) % 12);     // sub bass, E1..D#2
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
  const CHOIR_LINE = [71, 72, 72, 71, 76, 76, 72, 75];
  const below = (m, notes) => { for (let k = m - 3; k > m - 6; k--) if (notes.some(n => (n - k) % 12 === 0)) return k; return m - 4; }; // twin-guitar harmony
  function lead(t0, line, harmony, notes, vol) {
    line.forEach(([s, m, l], i) => {
      const t = t0 + s * step, len = l * step, o = { sus: 0.9993, vib: l >= 4, slide: i === 0 && l >= 6 ? 2 : 0, vol: vol || 1 };
      gtr(gtrLead, t, [m], len, o);
      if (harmony) gtr(gtrLead, t + 0.008, [below(m, notes)], len, Object.assign({}, o, { vol: (vol || 1) * 0.75 }));
    });
  }
  function hush(t0, t1) { dry.gain.setValueAtTime(1, t0); dry.gain.linearRampToValueAtTime(0, t0 + 0.015); dry.gain.setValueAtTime(0, t1 - 0.006); dry.gain.linearRampToValueAtTime(1, t1); }

  let barI = 0;
  for (const [sec, nb] of S) {
    for (let b = 0; b < nb; b++, barI++) {
      const t0 = barI * bar, P = PROG[sec], ch = P[b % P.length], notes = notesOf(ch), gr = gRoot(ch), sr = subRoot(ch);
      const last = b === nb - 1, at = s => t0 + s * step;
      if (sec === 'intro') {
        strings(t0, notes.map(n => n - 12 + (n < 52 ? 12 : 0)), bar, 0.012 + 0.002 * b, 0.8);
        choir(t0, CHOIR_LINE[b], bar * 0.95, 0.02 + 0.002 * b);
        if (b % 2 === 0) taiko(t0, 0.5 + b * 0.06);
        bass(t0, sr, bar, 0.12 + 0.02 * b);
        if (b >= 4 && b % 2 === 0) gtr(gtrL, t0, power(gr), bar * 2, { swell: true, vol: 0.8 }), gtr(gtrR, t0 + 0.01, power(gr), bar * 2, { swell: true, vol: 0.8 }); // feedback swells
        if (last) { [0, 4, 8, 12].forEach((s, i) => tom(at(s), [140, 120, 100, 80][i], 0.7 + i * 0.1)); taiko(at(12), 1); }
        continue;
      }
      if (sec === 'phase1') { // heavy half-time
        if (b % 8 === 0) { crash(t0, 1); taiko(t0, 0.9); }
        [0, 3, 10].forEach(s => kick(at(s), 1)); snare(at(8), 1); for (let s = 0; s < 16; s += 2) hat(at(s), s % 4 ? 0.6 : 1);
        if (b % 8 === 7) { [12, 13, 14, 15].forEach((s, i) => tom(at(s), [150, 125, 105, 85][i], 0.8)); }
        for (let s = 0; s < 16; s += 2) { const open = s === 0 || s === 10; rhythm(at(s), gr, open ? step * (s === 0 ? 6 : 4) : step * 1.6, !open, open ? 1 : 0.85); }
        strings(t0, notes, bar, 0.009);
        bass(t0, sr, step * 9, 0.32, true); bass(at(10), sr, step * 6, 0.3, true);
        if (b >= 0) lead(t0, THEME_A[b % 8], false, notes, b >= 8 ? 1 : 0.9);
        if (b >= 8) choir(t0, notes[1] + 12, bar * 0.95, 0.012);
        continue;
      }
      if (sec === 'phase2') { // drum & bass drive, galloping guitars, brass
        if (b % 8 === 0) { crash(t0, 1); }
        kick(at(0), 1); kick(at(10), 0.95); snare(at(4), 1); snare(at(12), 1); snare(at(7), 0.22);
        for (let s = 0; s < 16; s += 2) hat(at(s), 0.8);
        if (b % 4 === 3) { tom(at(13), 130, 0.7); tom(at(14), 105, 0.75); tom(at(15), 85, 0.8); }
        [0, 2, 3, 4, 6, 8, 10, 11, 12, 14].forEach(s => { const open = s === 0 || s === 8; rhythm(at(s), gr, open ? step * 2 : step * 0.9, !open, open ? 1 : 0.8); });
        brass(t0, notes.map(n => n + 12), step * 3, 0.03); if (b % 2) brass(at(10), notes.map(n => n + 12), step * 2, 0.022);
        for (let s = 0; s < 16; s += 4) strings(at(s), [notes[(s / 4) % notes.length] + 12], step * 1.5, 0.008, 0.01); // staccato ostinato
        bass(t0, sr, step * 9, 0.34, true); bass(at(10), sr, step * 6, 0.32, true);
        lead(t0, THEME_B[b % 8], b >= 8, notes, 1);
        continue;
      }
      if (sec === 'bridge') { // calm before the end: clean guitar, choir, taiko heartbeat
        if (b === 0) crash(t0, 0.6);
        strings(t0, notes, bar, 0.01, 0.6); choir(t0, notes[0] + 12, bar, 0.018); choir(t0, notes[2] + 12, bar, 0.014);
        const arp = [0, 1, 2, 3, 2, 1, 2, 3].map(i => notes[i % notes.length] - 12 + (notes[i % notes.length] - 12 < 47 ? 12 : 0));
        for (let s = 0; s < 16; s += 2) gtr(gtrClean, at(s), [arp[s / 2]], step * 3, { sus: 0.997, vol: 0.55 });
        taiko(t0, 0.45); if (b >= 4) taiko(at(8), 0.35);
        bass(t0, sr, bar, 0.18);
        if (last) { hush(at(12), t0 + bar); } // one beat of silence before the last stand
        continue;
      }
      if (sec === 'phase3') { // the last stand: everything, twin guitars
        if (b % 4 === 0) { crash(t0, 1); taiko(t0, 1); }
        for (let s = 0; s < 16; s += 2) kick(at(s), s % 4 ? 0.8 : 1); // driving 8th-note double kick
        snare(at(4), 1); snare(at(12), 1); for (let s = 0; s < 16; s += 2) hat(at(s + 1 < 16 ? s : s), 0.7);
        if (b === nb - 1) { [8, 10, 12, 14].forEach((s, i) => tom(at(s), [150, 125, 100, 80][i], 0.9)); }
        for (let s = 0; s < 16; s += 4) rhythm(at(s), gr, step * 3.6, false, 1);          // open power chords on every beat
        for (let s = 2; s < 16; s += 4) rhythm(at(s), gr, step * 0.9, true, 0.75);        // muted offbeats
        strings(t0, notes.concat([notes[0] + 12]), bar, 0.011);
        choir(t0, notes[0] + 12, bar * 0.95, 0.02); choir(t0, notes[2] + 12, bar * 0.95, 0.016);
        brass(t0, notes.map(n => n + 12), step * 4, 0.032);
        bass(t0, sr, bar - 0.02, 0.36, true);
        lead(t0, b < 8 ? THEME_A[b] : CLIMAX[b - 8], true, notes, 1.05);
        continue;
      }
      if (sec === 'outro') { // a final chord, then nothing
        if (b === 0) {
          crash(t0, 1.2); taiko(t0, 1.2); kick(t0, 1); rhythm(t0, gr, bar * 2.5, false, 1);
          gtr(gtrLead, t0, [76], bar * 2.5, { sus: 0.9995, vib: true }); gtr(gtrLead, t0 + 0.008, [71], bar * 2.5, { sus: 0.9995, vib: true, vol: 0.75 });
          strings(t0, [52, 59, 64, 67, 71], bar * 2.5, 0.013); choir(t0, 64, bar * 2.5, 0.022); choir(t0, 71, bar * 2.5, 0.018);
          bass(t0, 28, bar * 2.5, 0.38);
        }
        if (b === 2) { taiko(at(8), 0.6); }
        continue;
      }
    }
  }
  master.gain.setValueAtTime(0.85, totalBars * bar + 1); master.gain.linearRampToValueAtTime(0, dur);
  const out = await ctx.startRendering();
  const L = out.getChannelData(0), Rch = out.getChannelData(1), n = L.length, buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rch[i]));
  const norm = peak > 0 ? 0.95 / peak : 1;
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, n * 4, true);
  for (let i = 0, o = 44; i < n; i++, o += 4) { v.setInt16(o, Math.max(-1, Math.min(1, L[i] * norm)) * 32767, true); v.setInt16(o + 2, Math.max(-1, Math.min(1, Rch[i] * norm)) * 32767, true); }
  let bin = ''; const u8 = new Uint8Array(buf); for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
  return { wav: btoa(bin), seconds: dur, peak };
}
