// "Undertow Requiem": atmospheric DnB / breakcore, made entirely with Web Audio synthesis.
// Step 1 synthesizes an Amen-style break (original pattern played at ~140 BPM) into a buffer.
// Step 2 treats that buffer like a sample: chopped into 16th slices, pitched up to 172 BPM and re-sequenced
// in phrases: grooves keep the backbeat, edits and fills build toward each next downbeat.
// A tape-wobbled synthesized piano carries the motif; an analog-style arp opens up through the builds.
async function renderSong() {
  const SR = 44100;
  const rand = (() => { let s = 1337; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); // deterministic
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  // ---------------- 1. the break ----------------
  const BREAK_BPM = 140, bStep = 60 / BREAK_BPM / 4, bSteps = 32;
  const bctx = new OfflineAudioContext(1, Math.ceil(SR * bStep * bSteps + SR * 0.5), SR);
  const noiseBuf = (ctx, sec) => { const b = ctx.createBuffer(1, SR * sec, SR), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1; return b; };
  const bNoise = noiseBuf(bctx, 1);
  const shaper = bctx.createWaveShaper(); // a little grit, like a dusty record
  const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); }
  shaper.curve = curve; shaper.connect(bctx.destination);
  const bOut = bctx.createGain(); bOut.gain.value = 0.8; bOut.connect(shaper);
  function bNoiseHit(t, dur, type, f, q, v, dest) {
    const src = bctx.createBufferSource(); src.buffer = bNoise;
    const fl = bctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = bctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(fl); fl.connect(g); g.connect(dest || bOut); src.start(t, rand() * 0.5); src.stop(t + dur + 0.02);
  }
  function bTone(t, f0, f1, dur, type, v) {
    const o = bctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
    const g = bctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(bOut); o.start(t); o.stop(t + dur + 0.02);
  }
  const kick = (t, v) => { bTone(t, 160, 42, 0.32, 'sine', 0.95 * v); bNoiseHit(t, 0.012, 'highpass', 3000, 0.7, 0.25 * v); };
  const snare = (t, v) => { bTone(t, 230, 170, 0.12, 'triangle', 0.45 * v); bNoiseHit(t, 0.2, 'bandpass', 1900, 0.6, 0.7 * v); bNoiseHit(t, 0.08, 'highpass', 6000, 0.7, 0.25 * v); };
  const hat = (t, v) => bNoiseHit(t, 0.045, 'highpass', 8000, 0.8, 0.22 * v);
  const ride = (t, v) => { bNoiseHit(t, 0.35, 'bandpass', 5200, 3, 0.18 * v); bTone(t, 3150, 3100, 0.3, 'square', 0.025 * v); bTone(t, 4720, 4700, 0.25, 'square', 0.018 * v); };
  // Amen-style two-bar pattern (K kick, S snare, s ghost snare)
  const pat = [
    'K.K.S..s.sKKS..s',
    'K.K.S..s.sK...S.',
  ].join('');
  for (let i = 0; i < bSteps; i++) {
    const t = i * bStep, c = pat[i];
    if (c === 'K') kick(t, i % 16 === 0 ? 1 : 0.85);
    if (c === 'S') snare(t, 1);
    if (c === 's') snare(t, 0.45);
    if (i % 2 === 0) ride(t, i % 4 === 0 ? 1 : 0.7);
    hat(t, i % 2 ? 0.55 : 0.8);
  }
  const breakBuf = await bctx.startRendering();
  // reversed copy for reverse chops
  const rev = new AudioBuffer({ length: breakBuf.length, sampleRate: SR, numberOfChannels: 1 });
  { const a = breakBuf.getChannelData(0), r = rev.getChannelData(0); for (let i = 0; i < a.length; i++) r[i] = a[a.length - 1 - i]; }

  // ---------------- 2. the song ----------------
  const BPM = 172, step = 60 / BPM / 4, bar = step * 16;
  const S = [['intro', 8], ['build', 4], ['dropA', 24], ['breakdown', 12], ['build2', 4], ['dropB', 24], ['outro', 8]];
  const totalBars = S.reduce((a, s) => a + s[1], 0), dur = totalBars * bar + 5;
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * dur), SR);
  const noise = noiseBuf(ctx, 2);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
  const master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ctx.destination);
  const verb = ctx.createConvolver();
  { const len = SR * 3.4, ir = ctx.createBuffer(2, len, SR); for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, 2.4); } verb.buffer = ir; }
  const verbOut = ctx.createGain(); verbOut.gain.value = 0.6; verb.connect(verbOut); verbOut.connect(master);
  const delay = ctx.createDelay(2); delay.delayTime.value = step * 3; const fb = ctx.createGain(); fb.gain.value = 0.36;
  const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2200;
  delay.connect(dlp); dlp.connect(fb); fb.connect(delay); dlp.connect(master); dlp.connect(verb);
  const drumBus = ctx.createGain(); drumBus.gain.value = 1.35;
  const drumLP = ctx.createBiquadFilter(); drumLP.type = 'lowpass'; drumLP.frequency.value = 18000; drumLP.Q.value = 0.8;
  drumBus.connect(drumLP); drumLP.connect(master);
  const drumVerb = ctx.createGain(); drumVerb.gain.value = 0.1; drumLP.connect(drumVerb); drumVerb.connect(verb);
  const padBus = ctx.createGain(); padBus.connect(master); const padSend = ctx.createGain(); padSend.gain.value = 0.6; padBus.connect(padSend); padSend.connect(verb);
  const bassBus = ctx.createGain(); bassBus.connect(master);
  const fxBus = ctx.createGain(); fxBus.connect(master); fxBus.connect(verb); fxBus.connect(delay);
  // the "modified piano": tape-wobbled, darkened, washed in delay and reverb
  const pianoBus = ctx.createGain(); pianoBus.gain.value = 1;
  const pianoLP = ctx.createBiquadFilter(); pianoLP.type = 'lowpass'; pianoLP.frequency.value = 2600; pianoLP.Q.value = 0.5;
  const pianoSat = ctx.createWaveShaper(); { const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; c[i] = Math.tanh(x * 1.6); } pianoSat.curve = c; }
  pianoBus.connect(pianoSat); pianoSat.connect(pianoLP); pianoLP.connect(master);
  const pianoSend = ctx.createGain(); pianoSend.gain.value = 0.55; pianoLP.connect(pianoSend); pianoSend.connect(verb); pianoSend.connect(delay);
  const wobble = ctx.createOscillator(); wobble.frequency.value = 0.55; const wobbleAmt = ctx.createGain(); wobbleAmt.gain.value = 11; // cents of tape wow
  wobble.connect(wobbleAmt); wobble.start(0); wobble.stop(dur);
  // synth arp bus with a filter that opens through the intro and builds
  const arpBus = ctx.createGain(); const arpLP = ctx.createBiquadFilter(); arpLP.type = 'lowpass'; arpLP.Q.value = 6; arpLP.frequency.value = 500;
  arpBus.connect(arpLP); arpLP.connect(master); const arpSend = ctx.createGain(); arpSend.gain.value = 0.35; arpLP.connect(arpSend); arpSend.connect(delay);

  function tone(t, f, d, o) {
    const osc = ctx.createOscillator(); osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || d));
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain(), a = o.attack || 0.005, r = o.release || 0.1, v = o.vol;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.setValueAtTime(v, t + Math.max(a, d)); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a, d) + r);
    let n = osc; if (o.cutoff) { const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.cutoff; f2.Q.value = o.q || 0.7; osc.connect(f2); n = f2; }
    if (o.pan) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; n.connect(p); n = p; }
    n.connect(g); g.connect(o.dest); osc.start(t); osc.stop(t + Math.max(a, d) + r + 0.05);
  }
  // additive piano: slightly inharmonic partials, faster decay up the series, a hammer click
  function piano(t, midi, vel, pan) {
    const f = mtof(midi), p = ctx.createStereoPanner(); p.pan.value = pan || 0; p.connect(pianoBus);
    const body = Math.max(1.2, 4.2 - (midi - 48) * 0.05);
    for (let k = 1; k <= 6; k++) {
      const o = ctx.createOscillator(); o.frequency.value = f * k * Math.sqrt(1 + 0.0004 * k * k); wobbleAmt.connect(o.detune);
      const g = ctx.createGain(), v = vel * 0.16 / Math.pow(k, 1.25), dec = body / (0.6 + k * 0.55);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(v * 0.35, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(g); g.connect(p); o.start(t); o.stop(t + dec + 0.05);
    }
    const src = ctx.createBufferSource(); src.buffer = noise; const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 2800; nf.Q.value = 1.2;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(vel * 0.05, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    src.connect(nf); nf.connect(ng); ng.connect(p); src.start(t, rand()); src.stop(t + 0.05);
  }
  // reversed piano chord, made like a sampler would: render it, flip it
  const swell = await (async () => {
    const len = 2.6, oc = new OfflineAudioContext(1, Math.ceil(SR * len), SR);
    for (const m of [53, 60, 63, 65, 68, 72]) for (let k = 1; k <= 5; k++) {
      const o = oc.createOscillator(); o.frequency.value = mtof(m) * k; const g = oc.createGain(), v = 0.06 / Math.pow(k, 1.3);
      g.gain.setValueAtTime(v, 0); g.gain.exponentialRampToValueAtTime(0.0001, len / (0.5 + k * 0.4)); o.connect(g); g.connect(oc.destination); o.start(0); o.stop(len);
    }
    const b = await oc.startRendering(), d = b.getChannelData(0); d.reverse(); return b;
  })();
  function reverseSwell(tEnd, vol) { // ends exactly on tEnd, sucking into the next downbeat
    const src = ctx.createBufferSource(); src.buffer = swell; const g = ctx.createGain(); g.gain.value = vol;
    src.connect(g); g.connect(fxBus); src.start(tEnd - swell.duration);
  }
  function impact(t, v) { // downbeat crash + sub drop that marks a new phrase
    const src = ctx.createBufferSource(); src.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 4500;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.32 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    src.connect(f); f.connect(g); g.connect(master); g.connect(verb); src.start(t, rand()); src.stop(t + 1.9);
    tone(t, 90, 0.5, { type: 'sine', to: 32, glide: 0.5, vol: 0.5 * v, release: 0.2, dest: bassBus });
  }
  // a slice of the synthesized break, like hitting a pad on a sampler
  function slice(t, idx, len, rate, opts) {
    opts = opts || {};
    const src = ctx.createBufferSource(); src.buffer = opts.reverse ? rev : breakBuf; src.playbackRate.value = rate;
    const g = ctx.createGain(), sliceDur = len * bStep / rate, v = opts.vol == null ? 1 : opts.vol;
    g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + Math.max(0.005, sliceDur - 0.006)); g.gain.linearRampToValueAtTime(0, t + sliceDur);
    src.connect(g); g.connect(drumBus);
    const off = opts.reverse ? breakBuf.duration - (idx + len) * bStep : idx * bStep;
    src.start(t, Math.max(0, off), len * bStep); src.stop(t + sliceDur + 0.01);
  }
  const R = 172 / 140; // break pitched up to song tempo
  // Slice map of the break: 0 kick, 2 kick, 4 snare, 7 ghost, 9 ghost, 10-11 double kick, 12 snare, 15 ghost; 16-31 the second bar.
  const KICK = 0, SNARE = 4, SNARE2 = 12, GHOST = 7;
  // ---- drum bars: every edit has a job. The groove keeps kick on 1 and snares on 2 and 4 ----
  function groove(t0, which, vol) { for (let i = 0; i < 16; i++) slice(t0 + i * step, which * 16 + i, 1, R, { vol }); }
  function rolling(t0) { // groove variant: kick re-triggered on the "and" of 3 for a rolling feel
    const map = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 12, 13, 14, 15]; map.forEach((s, i) => slice(t0 + i * step, s, 1, R));
  }
  function roll(t, steps, n, pitchFrom, pitchTo, volFrom, volTo, idx) { // even roll spanning `steps` 16ths
    for (let k = 0; k < n; k++) { const f = k / Math.max(1, n - 1); slice(t + k * steps * step / n, idx == null ? SNARE : idx, steps / n, R * (pitchFrom + (pitchTo - pitchFrom) * f), { vol: volFrom + (volTo - volFrom) * f }); }
  }
  // jungle fills (last bar of a 4-bar phrase), growing in size
  function fillSmall(t0) { for (let i = 0; i < 12; i++) slice(t0 + i * step, 16 + i, 1, R); slice(t0 + 12 * step, SNARE2, 1, R); slice(t0 + 13 * step, 13, 1, R); roll(t0 + 14 * step, 2, 4, 1, 1.15, 0.6, 0.9); }
  function fillMedium(t0) { for (let i = 0; i < 8; i++) slice(t0 + i * step, i, 1, R); [KICK, KICK, SNARE, GHOST].forEach((s, i) => slice(t0 + (8 + i) * step, s, 1, R)); roll(t0 + 12 * step, 4, 12, 1, 1.4, 0.5, 1); }
  function fillBig(t0, tNext) { for (let i = 0; i < 8; i++) slice(t0 + i * step, 16 + i, 1, R); roll(t0 + 8 * step, 4, 8, 1, 1.2, 0.5, 0.8); reverseSwell(tNext, 0.9); slice(t0 + 12 * step, SNARE, 4, R, { reverse: true, vol: 0.9 }); }
  // breakcore bars
  function bcEdit(t0) { // groove first half, then a drill that still lands the snare on 4
    for (let i = 0; i < 8; i++) slice(t0 + i * step, i, 1, R);
    roll(t0 + 8 * step, 1, 2, 1, 1, 0.9, 0.9, KICK); roll(t0 + 9 * step, 1, 2, 1.1, 1.1, 0.8, 0.8, KICK);
    roll(t0 + 10 * step, 2, 4, 1, 1.2, 0.6, 0.8); slice(t0 + 12 * step, SNARE2, 1, R); roll(t0 + 13 * step, 3, 6, 1.1, 1.6, 0.6, 1);
  }
  function bcHalftime(t0) { // the floor drops out: second half plays the break at half speed
    for (let i = 0; i < 8; i++) slice(t0 + i * step, 16 + i, 1, R);
    for (let i = 0; i < 4; i++) slice(t0 + (8 + i * 2) * step, [KICK, 1, SNARE, GHOST][i], 1, R / 2);
  }
  function bcDrill(t0) { // machine-gun 32nds over a kept backbeat, pitch climbing through the bar
    for (let i = 0; i < 16; i++) {
      const t = t0 + i * step, p = 1 + i / 24;
      if (i === 0 || i === 10) slice(t, KICK, 1, R);
      else if (i === 4 || i === 12) slice(t, SNARE, 1, R * p);
      else { slice(t, i % 2 ? GHOST : 1, 0.5, R * p, { vol: 0.65 }); slice(t + step / 2, i % 2 ? GHOST : 1, 0.5, R * p, { vol: 0.5 }); }
    }
  }
  function bcRoll(t0) { // a full-bar snare roll that accelerates and rises, resolving on the next downbeat
    let t = t0; for (let k = 0; k < 4; k++) { const n = [4, 8, 8, 16][k]; roll(t, 4, n, 1 + k * 0.15, 1.15 + k * 0.2, 0.45 + k * 0.1, 0.6 + k * 0.12); t += 4 * step; }
  }
  // ---- harmony ----
  const chordsA = [[53, 'm'], [49, 'M'], [56, 'M'], [51, 'M']], chordsB = [[53, 'm'], [54, 'M'], [49, 'M'], [48, 'M']];
  const notesOf = c => c[1] === 'm' ? [c[0], c[0] + 3, c[0] + 7, c[0] + 10] : [c[0], c[0] + 4, c[0] + 7, c[0] + 11];
  // the piano motif (16th-step, midi) over Fm - Db - Ab - Eb: a falling, unresolved line
  const MOTIF = [[[0, 72], [6, 68], [8, 67], [12, 68]], [[0, 65], [6, 68], [8, 72], [14, 73]], [[0, 75], [6, 72], [8, 68], [12, 72]], [[0, 70], [6, 67], [8, 75], [12, 74]]];
  const MOTIF_B = [[[0, 72], [6, 68], [8, 67], [12, 65]], [[0, 66], [6, 70], [8, 73], [14, 75]], [[0, 73], [6, 72], [8, 68], [12, 65]], [[0, 67], [6, 64], [8, 67], [12, 72]]];

  let barI = 0;
  for (const [sec, nb] of S) {
    for (let b = 0; b < nb; b++, barI++) {
      const t0 = barI * bar, tNext = t0 + bar, darkSec = sec === 'dropB' || sec === 'build2';
      const chords = darkSec ? chordsB : chordsA, ci = barI % 4, ch = chords[ci], notes = notesOf(ch);
      const drop = sec === 'dropA' || sec === 'dropB', prog = b / nb, phraseEnd4 = b % 4 === 3, phraseEnd8 = b % 8 === 7;
      // ---- modified piano: motif + rolled chord, carries the intro, breakdown and outro ----
      const pianoOn = sec === 'intro' || sec === 'build' || sec === 'breakdown' || sec === 'outro' || (drop && b % 8 >= 4);
      if (pianoOn) {
        const pv = drop ? 0.45 : sec === 'outro' ? 0.8 * (1 - prog * 0.6) : 0.85;
        piano(t0, ch[0] - 12, pv * 0.9, -0.2); notes.slice(1).forEach((n, i) => piano(t0 + (i + 1) * 0.03, n, pv * 0.45, 0.15 * (i - 1)));
        (darkSec ? MOTIF_B : MOTIF)[ci].forEach(([s, m]) => piano(t0 + s * step, m + (drop ? 12 : 0), pv * (s === 0 ? 0.9 : 0.7), 0.25));
      }
      // ---- analog synth arp: enters in bar 5 of the intro, opens through the builds ----
      const arpOn = (sec === 'intro' && b >= 4) || sec === 'build' || sec === 'build2' || drop || (sec === 'breakdown' && b >= 6);
      if (arpOn) {
        const seq = [0, 2, 1, 3, 2, 1, 3, 0];
        for (let i = 0; i < 16; i += (drop ? 1 : 2)) tone(t0 + i * step, mtof(notes[seq[(i / (drop ? 1 : 2)) % 8]] + 12), step * 0.8, { type: i % 4 ? 'sawtooth' : 'square', vol: drop ? 0.03 : 0.045, release: 0.12, pan: i % 4 < 2 ? -0.35 : 0.35, dest: arpBus });
        const cut = sec === 'intro' ? 400 + (b - 4) * 220 : sec === 'build' || sec === 'build2' ? 1200 + b * 700 : sec === 'breakdown' ? 700 : 2400;
        arpLP.frequency.setValueAtTime(arpLP.frequency.value, t0); arpLP.frequency.linearRampToValueAtTime(cut, t0 + bar);
      }
      // ---- soft pad underneath (quiet; ducks with the kick in the drops) ----
      const padVol = sec === 'intro' ? 0.008 + 0.012 * prog : sec === 'breakdown' ? 0.022 : drop ? 0.03 : sec === 'outro' ? 0.02 * (1 - prog) : 0.025;
      for (let i = 0; i < 4; i++) for (const det of [-9, 9]) tone(t0, mtof(notes[i]), bar, { type: 'sawtooth', vol: padVol * 0.5, attack: bar * 0.35, release: bar * 0.6, cutoff: 1100, detune: det, dest: padBus });
      if (drop) for (let q = 0; q < 4; q++) { const tq = t0 + q * step * 4; padBus.gain.setValueAtTime(0.25, tq); padBus.gain.linearRampToValueAtTime(1, tq + step * 3); }
      // ---- wind ----
      if (b % 4 === 0 && !drop) {
        const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(300, t0); f.frequency.exponentialRampToValueAtTime(1300, t0 + bar * 3);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.03, t0 + bar * 2); g.gain.exponentialRampToValueAtTime(0.0001, t0 + bar * 4);
        src.connect(f); f.connect(g); g.connect(padBus); src.start(t0); src.stop(t0 + bar * 4 + 0.1);
      }
      // ---- reese bass + sub, locked to the kicks ----
      if (drop || sec === 'build2' || (sec === 'breakdown' && b >= 8)) {
        const root = ch[0] - 24, bv = drop ? 1 : 0.6;
        for (const det of [-14, 0, 14]) tone(t0, mtof(root), bar * 0.95, { type: 'sawtooth', vol: 0.042 * bv, attack: 0.02, release: 0.08, cutoff: 600, q: 4, detune: det, dest: bassBus });
        for (const s of [0, 10]) tone(t0 + s * step, mtof(root), s ? step * 5 : step * 9, { type: 'sine', vol: 0.24 * bv, attack: 0.008, release: 0.06, dest: bassBus });
        if (phraseEnd4) tone(t0 + step * 12, mtof(root + 12), step * 4, { type: 'sawtooth', to: mtof(chords[(ci + 1) % 4][0] - 24), glide: step * 4, vol: 0.05 * bv, cutoff: 900, q: 3, dest: bassBus });
      }
      // ---- drums ----
      if (sec === 'intro') { // the break creeps in, muffled, for the last two bars
        if (b >= 6) { groove(t0, b % 2, 0.35); drumLP.frequency.setValueAtTime(350 + (b - 6) * 250, t0); }
        continue;
      }
      if (sec === 'build' || sec === 'build2') { // groove with the filter opening, then a roll and a reversed swell into the drop
        drumLP.frequency.setValueAtTime(700, t0); drumLP.frequency.exponentialRampToValueAtTime(b === nb - 1 ? 18000 : 2500 + b * 3500, t0 + bar);
        if (b < nb - 1) groove(t0, b % 2, 0.85);
        else { for (let i = 0; i < 8; i++) slice(t0 + i * step, i, 1, R, { vol: 0.85 }); roll(t0 + 8 * step, 8, 16, 1, 1.6, 0.4, 1); reverseSwell(tNext, 1); }
        continue;
      }
      if (sec === 'breakdown') { // half-time: the break at half speed, a single reversed snare pulling into each phrase
        drumLP.frequency.setValueAtTime(1500, t0);
        for (let i = 0; i < 8; i++) slice(t0 + i * 2 * step, (b % 2) * 16 + i * 2, 2, R / 2, { vol: 0.5 });
        if (phraseEnd4) slice(t0 + 12 * step, SNARE, 4, R, { reverse: true, vol: 0.6 });
        continue;
      }
      if (sec === 'outro') { if (b < 4) { drumLP.frequency.setValueAtTime(2500 - b * 500, t0); groove(t0, b % 2, 0.6 - b * 0.12); } if (b === nb - 1) reverseSwell(tNext + bar * 0.5, 0.6); continue; }
      drumLP.frequency.setValueAtTime(18000, t0);
      if (b % 8 === 0) impact(t0, b === 0 ? 1 : 0.7); // every 8-bar phrase starts with an impact
      if (sec === 'dropA') { // jungle: groove, groove, rolling groove, then a fill whose size grows with the phrase
        const p = b % 4;
        if (p === 0) groove(t0, 0); else if (p === 1) groove(t0, 1); else if (p === 2) rolling(t0);
        else if (phraseEnd8 && b === nb - 1) fillBig(t0, tNext); else if (phraseEnd8) fillMedium(t0); else fillSmall(t0);
      } else { // breakcore: an 8-bar arc that escalates and resolves on the next downbeat
        const plan = ['g0', 'edit', 'g1', 'half', 'g0', 'edit', 'drill', 'roll'], k = plan[b % 8];
        if (k === 'g0') groove(t0, 0); else if (k === 'g1') groove(t0, 1);
        else if (k === 'edit') bcEdit(t0); else if (k === 'half') bcHalftime(t0); else if (k === 'drill') bcDrill(t0);
        else { bcRoll(t0); if (b === nb - 1) reverseSwell(tNext, 0.8); }
      }
    }
  }
  master.gain.setValueAtTime(0.9, totalBars * bar); master.gain.linearRampToValueAtTime(0, dur);
  const out = await ctx.startRendering();
  // encode 16-bit WAV
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
