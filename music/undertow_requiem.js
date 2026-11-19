// "Undertow Requiem": atmospheric DnB / breakcore, made entirely with Web Audio synthesis.
// Step 1 synthesizes an Amen-style break (original pattern played at ~140 BPM) into a buffer.
// Step 2 treats that buffer like a sample: chopped into 16th slices, pitched up to 172 BPM and
// re-sequenced with stutters, reversals, pitched rolls and snare edits, under reese bass, pads, bells and wind.
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
  // sections (in bars)
  const S = [['intro', 8], ['build', 4], ['dropA', 24], ['breakdown', 12], ['build2', 4], ['dropB', 24], ['outro', 8]];
  const totalBars = S.reduce((a, s) => a + s[1], 0), dur = totalBars * bar + 4;
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * dur), SR);
  const noise = noiseBuf(ctx, 2);
  // master: compressor + gain
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
  const master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ctx.destination);
  // reverb (generated impulse) + tempo delay
  const verb = ctx.createConvolver();
  { const len = SR * 3.2, ir = ctx.createBuffer(2, len, SR); for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, 2.6); } verb.buffer = ir; }
  const verbOut = ctx.createGain(); verbOut.gain.value = 0.55; verb.connect(verbOut); verbOut.connect(master);
  const delay = ctx.createDelay(2); delay.delayTime.value = step * 3; const fb = ctx.createGain(); fb.gain.value = 0.38;
  const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2400;
  delay.connect(dlp); dlp.connect(fb); fb.connect(delay); dlp.connect(master); dlp.connect(verb);
  // buses
  const drumBus = ctx.createGain(); drumBus.gain.value = 1.35; const drumLP = ctx.createBiquadFilter(); drumLP.type = 'lowpass'; drumLP.frequency.value = 18000; drumLP.Q.value = 0.8;
  drumBus.connect(drumLP); drumLP.connect(master);
  const drumVerb = ctx.createGain(); drumVerb.gain.value = 0.12; drumLP.connect(drumVerb); drumVerb.connect(verb);
  const padBus = ctx.createGain(); padBus.connect(master); const padSend = ctx.createGain(); padSend.gain.value = 0.6; padBus.connect(padSend); padSend.connect(verb);
  const bassBus = ctx.createGain(); bassBus.connect(master);
  const fxBus = ctx.createGain(); fxBus.connect(master); fxBus.connect(verb); fxBus.connect(delay);

  function tone(t, f, d, o) {
    const osc = ctx.createOscillator(); osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || d));
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain(), a = o.attack || 0.005, r = o.release || 0.1, v = o.vol;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.setValueAtTime(v, t + Math.max(a, d)); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a, d) + r);
    let n = osc; if (o.cutoff) { const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.cutoff; f2.Q.value = o.q || 0.7; osc.connect(f2); n = f2; }
    n.connect(g); g.connect(o.dest); osc.start(t); osc.stop(t + Math.max(a, d) + r + 0.05);
  }
  // play a slice of the break: like hitting a pad on a sampler
  function slice(t, idx, len, rate, opts) {
    opts = opts || {};
    const src = ctx.createBufferSource(); src.buffer = opts.reverse ? rev : breakBuf; src.playbackRate.value = rate;
    const g = ctx.createGain(), sliceDur = len * bStep / rate, v = opts.vol == null ? 1 : opts.vol;
    g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + Math.max(0.005, sliceDur - 0.006)); g.gain.linearRampToValueAtTime(0, t + sliceDur);
    src.connect(g); g.connect(drumBus);
    const off = opts.reverse ? breakBuf.duration - (idx + len) * bStep : idx * bStep;
    src.start(t, Math.max(0, off), len * bStep); src.stop(t + sliceDur + 0.01);
  }
  // F minor: Fm - Db - Ab - Eb (the last section darkens to Fm - Gb - Db - C)
  const chordsA = [[53, 'm'], [49, 'M'], [56, 'M'], [51, 'M']], chordsB = [[53, 'm'], [54, 'M'], [49, 'M'], [48, 'M']];
  const notesOf = c => c[1] === 'm' ? [c[0], c[0] + 3, c[0] + 7, c[0] + 10] : [c[0], c[0] + 4, c[0] + 7, c[0] + 11];
  const scale = [0, 2, 3, 5, 7, 8, 10];
  const R = 172 / 140; // break pitched up to song tempo, the classic jungle move

  let barI = 0;
  for (const [sec, nb] of S) {
    for (let b = 0; b < nb; b++, barI++) {
      const t0 = barI * bar, chords = sec === 'dropB' || sec === 'build2' ? chordsB : chordsA, ch = chords[barI % 4], notes = notesOf(ch);
      const drop = sec === 'dropA' || sec === 'dropB', last = b === nb - 1, prog = b / nb;
      // ---- pads (sidechained under the drops) ----
      const padVol = sec === 'intro' ? 0.018 + 0.02 * prog : sec === 'breakdown' ? 0.03 : drop ? 0.04 : sec === 'outro' ? 0.03 * (1 - prog) + 0.006 : 0.035;
      for (let i = 0; i < 4; i++) for (const det of [-9, 9]) tone(t0, mtof(notes[i] + 12), bar, { type: 'sawtooth', vol: padVol * 0.5, attack: bar * 0.35, release: bar * 0.6, cutoff: sec === 'breakdown' ? 900 : 1500, detune: det, dest: padBus });
      if (drop) for (let q = 0; q < 4; q++) { const tq = t0 + q * step * 4; padBus.gain.setValueAtTime(0.25, tq); padBus.gain.linearRampToValueAtTime(1, tq + step * 3); }
      // ---- bells and wind ----
      if (sec !== 'dropB' || b % 2 === 0) for (let k = 0; k < 4; k++) if (rand() < (sec === 'breakdown' || sec === 'intro' ? 0.55 : 0.3)) {
        const f = mtof(77 + scale[Math.floor(rand() * 7)] + (rand() < 0.3 ? 12 : 0)), tb = t0 + k * step * 4 + (rand() < 0.5 ? step * 2 : 0);
        tone(tb, f, 0.02, { type: 'sine', vol: 0.05, release: 2.2, dest: fxBus }); tone(tb, f * 2.76, 0.02, { type: 'sine', vol: 0.012, release: 1, dest: fxBus });
      }
      if (b % 2 === 0 && sec !== 'dropB') {
        const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(300, t0); f.frequency.exponentialRampToValueAtTime(1400, t0 + bar * 1.6);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.05, t0 + bar); g.gain.exponentialRampToValueAtTime(0.0001, t0 + bar * 2);
        src.connect(f); f.connect(g); g.connect(padBus); src.start(t0); src.stop(t0 + bar * 2 + 0.1);
      }
      // ---- reese bass + sub ----
      if (drop || sec === 'build2' || (sec === 'breakdown' && b >= 8)) {
        const root = ch[0] - 24, bv = drop ? 1 : 0.6;
        for (const det of [-14, 0, 14]) tone(t0, mtof(root), bar * 0.95, { type: 'sawtooth', vol: 0.045 * bv, attack: 0.02, release: 0.08, cutoff: 600, q: 4, detune: det, dest: bassBus });
        tone(t0, mtof(root), bar * 0.95, { type: 'sine', vol: 0.22 * bv, attack: 0.01, release: 0.08, dest: bassBus });
        if (b % 4 === 3) tone(t0 + step * 12, mtof(root + 12), step * 4, { type: 'sawtooth', to: mtof(root), glide: step * 4, vol: 0.05 * bv, cutoff: 900, q: 3, dest: bassBus });
      }
      // ---- drums: the chopped break ----
      if (sec === 'intro') {
        if (b >= 4) { for (let i = 0; i < 16; i++) slice(t0 + i * step, (barI * 16 + i) % 32, 1, R, { vol: 0.25 }); drumLP.frequency.setValueAtTime(400 + b * 120, t0); }
        continue;
      }
      if (sec === 'build' || sec === 'build2') { // filter opens, snare roll accelerates
        drumLP.frequency.setValueAtTime(600, t0); drumLP.frequency.exponentialRampToValueAtTime(last ? 18000 : 3000 + b * 3000, t0 + bar);
        if (!last) for (let i = 0; i < 16; i++) slice(t0 + i * step, (barI * 16 + i) % 32, 1, R, { vol: 0.8 });
        else { for (let i = 0; i < 32; i++) slice(t0 + i * step / 2, 4, 0.5, R * (1 + i / 32), { vol: 0.5 + i / 64 }); }
        continue;
      }
      drumLP.frequency.setValueAtTime(sec === 'breakdown' ? 1400 : sec === 'outro' ? 2000 - prog * 1600 : 18000, t0);
      if (sec === 'breakdown') { // halftime: break at half speed, sparse
        for (let i = 0; i < 16; i += 2) if (rand() < 0.8) slice(t0 + i * step, (barI * 8 + i / 2) % 32, 1, R / 2, { vol: 0.55 });
        if (b % 4 === 3) slice(t0 + step * 12, 12, 2, R * 0.8, { reverse: true, vol: 0.6 });
        continue;
      }
      if (sec === 'outro') { if (b < 6) for (let i = 0; i < 16; i++) slice(t0 + i * step, (barI * 16 + i) % 32, 1, R, { vol: 0.6 * (1 - prog) }); continue; }
      // drops: jungle in drop A, breakcore chaos in drop B
      const chaos = sec === 'dropA' ? 0.12 + 0.1 * (b % 8 === 7) : 0.38 + 0.2 * (b % 4 === 3);
      for (let i = 0; i < 16; i++) {
        const t = t0 + i * step, base = (barI * 16 + i) % 32;
        if (rand() > chaos) { slice(t, base, 1, R); continue; }
        const r = rand();
        if (r < 0.3) { const n = rand() < 0.5 ? 2 : 4; for (let k = 0; k < n; k++) slice(t + k * step / n, [4, 12, 9][Math.floor(rand() * 3)], 1 / n, R * (1 + 0.12 * k), { vol: 0.9 }); }   // stutter roll
        else if (r < 0.5) slice(t, Math.floor(rand() * 32), 1, R, { reverse: true });                                                          // reversed chop
        else if (r < 0.7) slice(t, [4, 12, 20, 28][Math.floor(rand() * 4)], 1, R * [0.75, 1.5, 2][Math.floor(rand() * 3)]);                  // pitched snare
        else if (r < 0.85) slice(t, (base + 8) % 32, 1, R);                                                                                // swapped slice
        else { for (let k = 0; k < 4; k++) slice(t + k * step / 4, 0, 0.25, R * 0.6, { vol: 0.8 }); }                                     // kick machine-gun
      }
      if (sec === 'dropB' && b % 8 === 7) for (let i = 0; i < 16; i++) slice(t0 + step * 12 + i * step / 4, 4, 0.25, R * (1 + i / 8), { vol: 0.7 }); // end-of-phrase roll
    }
  }
  // fade out the last moments
  master.gain.setValueAtTime(0.9, totalBars * bar - bar * 2); master.gain.linearRampToValueAtTime(0, dur);
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
