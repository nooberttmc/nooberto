// "Undertow Requiem": atmospheric DnB / breakcore, made entirely with Web Audio synthesis.
// Step 1 loads a real Amen break (Myor break pack, 160 BPM).
// Step 2 treats it like a sample: chopped into 16th slices, pitched up to 172 BPM and re-sequenced
// in phrases: grooves keep the backbeat, edits and fills build toward each next downbeat.
// A tape-wobbled synthesized piano carries the motif; an analog-style arp opens up through the builds.
async function renderSong() {
  const SR = 44100;
  const rand = (() => { let s = 1337; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); // deterministic
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  // ---------------- 1. the break ----------------
  // The real Amen break from the Myor pack (160 BPM, 2 bars), loaded by render.js and chopped into 16th slices.
  const bStep = 60 / 160 / 4;
  const noiseBuf = (ctx, sec) => { const b = ctx.createBuffer(1, SR * sec, SR), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1; return b; };

  // ---------------- 2. the song ----------------
  const BPM = 172, step = 60 / BPM / 4, bar = step * 16;
  const S = [['intro', 8], ['build', 4], ['dropA', 24], ['breakdown', 12], ['build2', 4], ['dropB', 24], ['outro', 8]];
  const totalBars = S.reduce((a, s) => a + s[1], 0), dur = totalBars * bar + 5;
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * dur), SR);
  const noise = noiseBuf(ctx, 2);
  const breakBuf = await loadAsset('break/amen_yki', ctx); // reversed copy for reverse chops
  const rev = new AudioBuffer({ length: breakBuf.length, sampleRate: SR, numberOfChannels: 1 });
  { const a = breakBuf.getChannelData(0), r = rev.getChannelData(0); for (let i = 0; i < a.length; i++) r[i] = a[a.length - 1 - i]; }
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
  const master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ctx.destination);
  const dry = ctx.createGain(); dry.connect(master);
  const verb = ctx.createConvolver();
  { const len = SR * 3.4, ir = ctx.createBuffer(2, len, SR); for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, 2.4); } verb.buffer = ir; }
  const verbOut = ctx.createGain(); verbOut.gain.value = 0.6; verb.connect(verbOut); verbOut.connect(master);
  const delay = ctx.createDelay(2); delay.delayTime.value = step * 3; const fb = ctx.createGain(); fb.gain.value = 0.36;
  const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2200;
  delay.connect(dlp); dlp.connect(fb); fb.connect(delay); dlp.connect(master); dlp.connect(verb);
  const drumBus = ctx.createGain(); drumBus.gain.value = 0.82;
  const drumLP = ctx.createBiquadFilter(); drumLP.type = 'lowpass'; drumLP.frequency.value = 18000; drumLP.Q.value = 0.6;
  const drumDip = ctx.createBiquadFilter(); drumDip.type = 'peaking'; drumDip.frequency.value = 1300; drumDip.Q.value = 0.8; drumDip.gain.value = -5; // make room for lead and piano
  drumBus.connect(drumDip); drumDip.connect(drumLP); drumLP.connect(dry);
  let dCut = 18000, aCut = 500; // filter positions, so automation always continues from where it is
  const drumVerb = ctx.createGain(); drumVerb.gain.value = 0.1; drumLP.connect(drumVerb); drumVerb.connect(verb);
  const padBus = ctx.createGain(); padBus.connect(dry); const padSend = ctx.createGain(); padSend.gain.value = 0.6; padBus.connect(padSend); padSend.connect(verb);
  const bassBus = ctx.createGain(); bassBus.connect(dry);
  const fxBus = ctx.createGain(); fxBus.connect(dry); fxBus.connect(verb); fxBus.connect(delay);
  // the "modified piano": tape-wobbled, darkened, washed in delay and reverb
  const pianoBus = ctx.createGain(); pianoBus.gain.value = 1;
  const pianoLP = ctx.createBiquadFilter(); pianoLP.type = 'lowpass'; pianoLP.frequency.value = 2600; pianoLP.Q.value = 0.5;
  const pianoSat = ctx.createWaveShaper(); { const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; c[i] = Math.tanh(x * 1.6); } pianoSat.curve = c; }
  pianoBus.connect(pianoSat); pianoSat.connect(pianoLP); pianoLP.connect(dry);
  const pianoSend = ctx.createGain(); pianoSend.gain.value = 0.55; pianoLP.connect(pianoSend); pianoSend.connect(verb); pianoSend.connect(delay);
  const wobble = ctx.createOscillator(); wobble.frequency.value = 0.55; const wobbleAmt = ctx.createGain(); wobbleAmt.gain.value = 11; // cents of tape wow
  wobble.connect(wobbleAmt); wobble.start(0); wobble.stop(dur);
  // synth arp bus with a filter that opens through the intro and builds
  const arpBus = ctx.createGain(); const arpLP = ctx.createBiquadFilter(); arpLP.type = 'lowpass'; arpLP.Q.value = 6; arpLP.frequency.value = 500;
  arpBus.connect(arpLP); arpLP.connect(dry); const arpSend = ctx.createGain(); arpSend.gain.value = 0.35; arpLP.connect(arpSend); arpSend.connect(delay);

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
      if (f * k > 3500) continue; // keep the piano warm: no high, bell-like partials
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
    for (const m of [41, 53, 56, 60, 63]) for (let k = 1; k <= 4; k++) {
      const o = oc.createOscillator(); o.frequency.value = mtof(m) * k; const g = oc.createGain(), v = 0.06 / Math.pow(k, 1.3);
      g.gain.setValueAtTime(v, 0); g.gain.exponentialRampToValueAtTime(0.0001, len / (0.5 + k * 0.4)); o.connect(g); g.connect(oc.destination); o.start(0); o.stop(len);
    }
    const b = await oc.startRendering(), d = b.getChannelData(0); d.reverse(); return b;
  })();
  function reverseSwell(tEnd, vol) { // ends exactly on tEnd, sucking into the next downbeat
    const src = ctx.createBufferSource(); src.buffer = swell; const g = ctx.createGain(); g.gain.value = vol;
    src.connect(g); g.connect(master); g.connect(verb); src.start(tEnd - swell.duration);
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
  const R = 172 / 160; // break pitched up to song tempo
  // Slice map of the break: 0 kick, 2 kick, 4 snare, 7 ghost, 9 ghost, 10-11 double kick, 12 snare, 15 ghost; 16-31 the second bar.
  const BI = window.BREAK_INFO.amen_yki, KICK = BI.kick, SNARE = BI.snare, SNARE2 = BI.snare, GHOST = BI.ghost; // measured by tools/analyze_breaks.py
  // ---- drum bars: every edit has a job. The groove keeps kick on 1 and snares on 2 and 4 ----
  function groove(t0, which, vol) { for (let i = 0; i < 16; i++) slice(t0 + i * step, which * 16 + i, 1, R, { vol }); }
  function rolling(t0) { // groove variant: kick re-triggered on the "and" of 3 for a rolling feel
    const map = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, KICK, KICK, 12, 13, 14, 15]; map.forEach((s, i) => slice(t0 + i * step, s, 1, R));
  }
  function roll(t, steps, n, pitchFrom, pitchTo, volFrom, volTo, idx) { // even roll spanning `steps` 16ths
    for (let k = 0; k < n; k++) { const f = k / Math.max(1, n - 1); slice(t + k * steps * step / n, idx == null ? SNARE : idx, steps / n, R * (pitchFrom + (pitchTo - pitchFrom) * f), { vol: volFrom + (volTo - volFrom) * f }); }
  }
  // jungle fills (last bar of a 4-bar phrase), growing in size
  function fillSmall(t0) { for (let i = 0; i < 12; i++) slice(t0 + i * step, 16 + i, 1, R); slice(t0 + 12 * step, SNARE2, 1, R); slice(t0 + 13 * step, 13, 1, R); slice(t0 + 14 * step, GHOST, 1, R, { vol: 0.7 }); slice(t0 + 15 * step, SNARE, 1, R, { vol: 0.75 }); }
  function fillMedium(t0) { for (let i = 0; i < 8; i++) slice(t0 + i * step, i, 1, R); [KICK, KICK, SNARE, GHOST].forEach((s, i) => slice(t0 + (8 + i) * step, s, 1, R)); roll(t0 + 12 * step, 4, 6, 1, 1.25, 0.55, 0.9); }
  function fillBig(t0, tNext) { for (let i = 0; i < 8; i++) slice(t0 + i * step, 16 + i, 1, R); roll(t0 + 8 * step, 4, 4, 1, 1.15, 0.6, 0.85); reverseSwell(tNext, 0.9); slice(t0 + 12 * step, SNARE, 4, R, { reverse: true, vol: 0.9 }); }
  // breakcore bars
  function bcEdit(t0) { // groove, then a re-ordered second half: same hits, new order, snare still on 4
    for (let i = 0; i < 8; i++) slice(t0 + i * step, i, 1, R);
    [KICK, GHOST, SNARE, 1, SNARE2, 9, 14, 15].forEach((s2, i) => slice(t0 + (8 + i) * step, s2, 1, R * (i === 2 ? 0.9 : 1)));
  }
  function bcReverse(t0) { // the third beat plays backwards, pulling into beat 4
    for (let i = 0; i < 8; i++) slice(t0 + i * step, 16 + i, 1, R);
    slice(t0 + 8 * step, 8, 4, R, { reverse: true, vol: 0.85 }); for (let i = 12; i < 16; i++) slice(t0 + i * step, 16 + i, 1, R);
  }
  function bcHalftime(t0) { // half-time at normal speed: kick on 1, snare on 3, space in between
    [[0, KICK, 2], [2, 1, 1], [3, 3, 1], [6, 2, 2], [8, SNARE, 2], [10, 1, 1], [12, KICK, 1], [14, GHOST, 2]].forEach(([at, s2, l]) => slice(t0 + at * step, s2, l, R));
  }
  function bcRoll(t0) { // groove, then one rising roll on the last beats that resolves on the next downbeat
    for (let i = 0; i < 8; i++) slice(t0 + i * step, i, 1, R);
    roll(t0 + 8 * step, 4, 4, 1, 1.1, 0.6, 0.7); roll(t0 + 12 * step, 4, 8, 1.15, 1.45, 0.65, 0.95);
  }
  // ---- harmony: F minor, mixing triads and 7th chords; C7 (the dominant) pulls back home ----
  const Q = { m: [0, 3, 7], M: [0, 4, 7], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11], '7': [0, 4, 7, 10] };
  const notesOf = c => Q[c[1]].map(i => c[0] + i);
  const Fm = [53, 'm'], Fm7 = [53, 'm7'], Db = [49, 'M'], Dbmaj7 = [49, 'M7'], Ab = [56, 'M'], Eb = [51, 'M'], Bbm7 = [46, 'm7'], C7 = [48, '7'], Gbmaj7 = [54, 'M7'];
  const PROG = {
    calm:  [Fm7, Dbmaj7, Bbm7, C7, Fm7, Dbmaj7, Bbm7, C7],      // intro, breakdown
    build: [Bbm7, C7, Dbmaj7, C7],                              // tension into the drop
    dropA: [Fm, Db, Ab, Eb, Fm7, Dbmaj7, Bbm7, C7],              // triads first, then the 7ths bloom
    dropB: [Fm7, Gbmaj7, Dbmaj7, C7, Bbm7, Gbmaj7, Ab, C7],      // darker: the Gb (bII) colour
    outro: [Fm7, Dbmaj7, Bbm7, C7, Fm7, Dbmaj7, Bbm7, Fm],       // finally resolves to a bare F minor
  };
  // melodies: [16th step, midi, length in 16ths]; question / answer phrases with rests to breathe
  const MEL_CALM = [
    [[0, 72, 4], [4, 75, 2], [6, 72, 2], [8, 68, 6]], [[0, 72, 6], [6, 68, 2], [8, 65, 4], [12, 68, 4]],
    [[0, 73, 4], [4, 72, 2], [6, 70, 2], [8, 68, 4], [12, 65, 4]], [[0, 67, 6], [8, 64, 8]],
    [[0, 77, 4], [4, 75, 2], [6, 72, 2], [8, 75, 6]], [[0, 80, 4], [4, 77, 4], [8, 72, 8]],
    [[0, 73, 4], [4, 70, 4], [8, 68, 4], [12, 70, 4]], [[0, 72, 4], [4, 67, 4], [8, 64, 6]],
  ];
  const MEL_OUTRO = MEL_CALM.slice(0, 7).concat([[[0, 65, 16]]]);
  const MEL_A = [
    [[0, 77, 3], [3, 77, 3], [6, 75, 2], [8, 72, 4], [12, 75, 2], [14, 77, 2]], [[0, 80, 3], [3, 77, 3], [6, 73, 2], [8, 77, 6]],
    [[0, 75, 3], [3, 72, 3], [6, 68, 2], [8, 72, 4], [12, 75, 4]], [[0, 70, 6], [6, 67, 2], [8, 70, 4]],
    [[0, 77, 3], [3, 77, 3], [6, 75, 2], [8, 72, 4], [12, 80, 2], [14, 77, 2]], [[0, 80, 3], [3, 84, 3], [6, 80, 2], [8, 77, 8]],
    [[0, 82, 4], [4, 80, 4], [8, 77, 4], [12, 73, 4]], [[0, 76, 4], [4, 79, 4], [8, 82, 6]],
  ];
  const MEL_B = [
    [[0, 72, 2], [2, 75, 2], [4, 77, 4], [8, 80, 4], [12, 75, 4]], [[0, 78, 4], [4, 77, 4], [8, 73, 4], [12, 70, 4]],
    [[0, 72, 4], [4, 77, 4], [8, 80, 6]], [[0, 76, 6], [6, 79, 2], [8, 82, 4], [12, 79, 4]],
    [[0, 77, 4], [4, 73, 4], [8, 70, 4], [12, 73, 4]], [[0, 70, 4], [4, 73, 4], [8, 77, 4], [12, 78, 4]],
    [[0, 80, 6], [6, 75, 2], [8, 72, 4], [12, 75, 4]], [[0, 76, 8], [8, 72, 4]],
  ];
  // the lead: detuned saws with a touch of vibrato, darkened so it never rings
  const leadBus = ctx.createGain(); const leadLP = ctx.createBiquadFilter(); leadLP.type = 'lowpass'; leadLP.frequency.value = 1900; leadLP.Q.value = 1.2;
  leadBus.connect(leadLP); leadLP.connect(dry); const leadSend = ctx.createGain(); leadSend.gain.value = 0.3; leadLP.connect(leadSend); leadSend.connect(delay); leadSend.connect(verb);
  function lead(t, midi, len, vol, pan) {
    const d = len * step;
    for (const det of [-8, 8]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(midi); o.detune.value = det;
      const vib = ctx.createOscillator(); vib.frequency.value = 5.2; const va = ctx.createGain(); va.gain.setValueAtTime(0, t); va.gain.linearRampToValueAtTime(9, t + Math.min(d, 0.35));
      vib.connect(va); va.connect(o.detune);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.setValueAtTime(vol * 0.85, t + d * 0.6); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.08);
      const p = ctx.createStereoPanner(); p.pan.value = (pan || 0) + det / 40;
      o.connect(g); g.connect(p); p.connect(leadBus); o.start(t); vib.start(t); o.stop(t + d + 0.1); vib.stop(t + d + 0.1);
    }
  }
  const below = (m, notes) => { for (let k = m - 1; k > m - 6; k--) if (notes.some(n => (n - k) % 12 === 0)) return k; return m - 3; }; // harmony a chord tone below
  // silence as an instrument: duck the dry mix while reverb and delay tails keep ringing
  function hush(t0, t1) { dry.gain.setValueAtTime(1, t0); dry.gain.linearRampToValueAtTime(0, t0 + 0.012); dry.gain.setValueAtTime(0, t1 - 0.006); dry.gain.linearRampToValueAtTime(1, t1); }

  let barI = 0;
  for (const [sec, nb] of S) {
    for (let b = 0; b < nb; b++, barI++) {
      const t0 = barI * bar, tNext = t0 + bar;
      const progKey = sec === 'intro' || sec === 'breakdown' ? 'calm' : sec === 'build' || sec === 'build2' ? 'build' : sec;
      const P = PROG[progKey], ci = b % P.length, ch = P[ci], notes = notesOf(ch), nextCh = P[(ci + 1) % P.length];
      const drop = sec === 'dropA' || sec === 'dropB', prog = b / nb, phraseEnd4 = b % 4 === 3, phraseEnd8 = b % 8 === 7;
      // ---- the four silences ----
      if (sec === 'build' && b === nb - 1) hush(t0 + 12 * step, tNext);        // one beat of air before Drop A
      if (sec === 'dropA' && b === 15) hush(t0 + 12 * step, tNext);            // stop-time between phrases
      if (sec === 'breakdown' && b === 0) hush(t0, t0 + 4 * step);             // let the drop's tail hang
      if (sec === 'build2' && b === nb - 1) hush(t0 + 8 * step, tNext);        // two beats of silence before Drop B
      // ---- piano: rolled chord voicings + the calm melody in the quiet sections; stabs in the drops ----
      const voicing = [ch[0] - 12].concat(notes.map(n => n + (n < 55 ? 12 : 0)));
      if (sec === 'intro' || sec === 'breakdown' || sec === 'outro' || sec === 'build' || sec === 'build2') {
        const pv = sec === 'outro' ? 0.85 * (1 - prog * 0.55) : 0.85;
        voicing.forEach((n, i) => piano(t0 + i * 0.035, n, pv * (i ? 0.42 : 0.8), 0.12 * (i - 2)));
        if (sec === 'build' || sec === 'build2') voicing.slice(1).forEach((n, i) => piano(t0 + 8 * step + i * 0.02, n, pv * 0.3, 0.1 * (i - 1)));
        const mel = sec === 'outro' ? MEL_OUTRO : sec === 'intro' && b < 4 ? null : (sec === 'breakdown' && b >= 8) ? null : MEL_CALM;
        if (mel && !(sec === 'breakdown' && b === 0)) mel[ci].forEach(([s, m, l]) => piano(t0 + s * step, m, pv * (s === 0 ? 0.8 : 0.65), 0.25));
      } else if (drop) { // offbeat chord stabs under the lead
        for (const s of [0, 6, 10]) voicing.slice(1).forEach((n, i) => piano(t0 + s * step + i * 0.01, n, 0.28, 0.1 * (i - 1)));
      }
      // ---- the lead melody in the drops ----
      if (drop) {
        const phrase = Math.floor(b / 8), mel = sec === 'dropA' ? MEL_A : MEL_B;
        mel[ci].forEach(([s, m, l]) => {
          const mm = sec === 'dropB' && phrase === 1 ? m - 12 : m;              // Drop B, phrase 2: the hook drops an octave, darker
          lead(t0 + s * step, mm, l, 0.068, 0.1);
          if (phrase === 2) lead(t0 + s * step, below(mm, notes), l, 0.042, -0.25); // last phrase: a harmony line joins
        });
      }
      // ---- mellow arp (filtered saws, no high octave) ----
      const arpOn = (sec === 'intro' && b >= 4) || sec === 'build' || sec === 'build2' || drop || (sec === 'breakdown' && b >= 8);
      if (arpOn) {
        const seq = [0, 1, 2, 3, 2, 1, 3, 1];
        for (let i = 0; i < 16; i += 2) tone(t0 + i * step, mtof(notes[seq[(i / 2) % 8] % notes.length] + 12), step * 1.4, { type: 'sawtooth', vol: drop ? 0.022 : 0.034, release: 0.15, pan: i % 4 ? 0.3 : -0.3, dest: arpBus });
        const cut = sec === 'intro' ? 350 + (b - 4) * 180 : sec === 'build' || sec === 'build2' ? 900 + b * 450 : sec === 'breakdown' ? 650 : 1500;
        arpLP.frequency.setValueAtTime(aCut, t0); arpLP.frequency.linearRampToValueAtTime(cut, t0 + bar); aCut = cut;
      }
      // ---- soft pad underneath (ducks with the kick in the drops) ----
      const padVol = sec === 'intro' ? 0.008 + 0.012 * prog : sec === 'breakdown' ? 0.022 : drop ? 0.028 : sec === 'outro' ? 0.02 * (1 - prog) : 0.025;
      for (const n of notes) for (const det of [-9, 9]) tone(t0, mtof(n), bar, { type: 'sawtooth', vol: padVol * 0.5, attack: bar * 0.35, release: bar * 0.6, cutoff: 1000, detune: det, dest: padBus });
      if (drop) for (let q = 0; q < 4; q++) { const tq = t0 + q * step * 4; padBus.gain.setValueAtTime(0.6, tq); padBus.gain.linearRampToValueAtTime(1, tq + step * 3); }
      // ---- wind ----
      if (b % 4 === 0 && (sec === 'intro' || sec === 'outro')) {
        const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(300, t0); f.frequency.exponentialRampToValueAtTime(1100, t0 + bar * 3);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.025, t0 + bar * 2); g.gain.exponentialRampToValueAtTime(0.0001, t0 + bar * 4);
        src.connect(f); f.connect(g); g.connect(padBus); src.start(t0); src.stop(t0 + bar * 4 + 0.1);
      }
      // ---- reese bass + sub following the chord roots, sliding into the next chord at phrase ends ----
      if (drop || sec === 'build2' || (sec === 'breakdown' && b >= 8)) {
        const root = ch[0] - 24 + (ch[0] > 52 ? 0 : 12), bv = drop ? 1 : 0.6, nroot = nextCh[0] - 24 + (nextCh[0] > 52 ? 0 : 12);
        for (const det of [-14, 0, 14]) tone(t0, mtof(root), bar * 0.95, { type: 'sawtooth', vol: 0.042 * bv, attack: 0.02, release: 0.08, cutoff: 600, q: 4, detune: det, dest: bassBus });
        for (const s of [0, 10]) tone(t0 + s * step, mtof(root), s ? step * 5 : step * 9, { type: 'sine', vol: 0.24 * bv, attack: 0.008, release: 0.06, dest: bassBus });
        if (phraseEnd4) tone(t0 + step * 12, mtof(root + 12), step * 4, { type: 'sawtooth', to: mtof(nroot), glide: step * 4, vol: 0.05 * bv, cutoff: 900, q: 3, dest: bassBus });
      }
      // ---- drums ----
      if (sec === 'intro') { // the break creeps in, muffled, for the last two bars
        if (b >= 6) { if (b === 6) dCut = 400; groove(t0, b % 2, 0.35); drumLP.frequency.setValueAtTime(dCut, t0); drumLP.frequency.linearRampToValueAtTime(dCut = 400 + (b - 5) * 300, t0 + bar); }
        continue;
      }
      if (sec === 'build' || sec === 'build2') { // groove with the filter opening, then a roll and a reversed swell into the drop
        if (b === 0) dCut = 1000; drumLP.frequency.setValueAtTime(dCut, t0); drumLP.frequency.exponentialRampToValueAtTime(dCut = (b === nb - 1 ? 18000 : 2000 + b * 3000), t0 + bar);
        if (b < nb - 1) groove(t0, b % 2, 0.85);
        else if (sec === 'build') { for (let i = 0; i < 8; i++) slice(t0 + i * step, i, 1, R, { vol: 0.85 }); roll(t0 + 8 * step, 4, 8, 1, 1.4, 0.45, 0.95); reverseSwell(tNext, 1); }
        else { for (let i = 0; i < 4; i++) slice(t0 + i * step, i, 1, R, { vol: 0.85 }); roll(t0 + 4 * step, 4, 8, 1, 1.4, 0.45, 0.95); reverseSwell(tNext, 1.1); }
        continue;
      }
      if (sec === 'breakdown') { // half-time: the break at half speed, a single reversed snare pulling into each phrase
        drumLP.frequency.setValueAtTime(dCut, t0); drumLP.frequency.linearRampToValueAtTime(dCut = 3000, t0 + 0.05);
        if (b > 0) { drumBus.gain.setValueAtTime(0.5, t0); bcHalftime(t0); drumBus.gain.setValueAtTime(0.82, tNext - 0.001); }
        if (phraseEnd4) slice(t0 + 12 * step, SNARE, 4, R, { reverse: true, vol: 0.6 });
        continue;
      }
      if (sec === 'outro') { if (b < 4) { drumLP.frequency.setValueAtTime(dCut, t0); drumLP.frequency.linearRampToValueAtTime(dCut = 3000 - b * 650, t0 + bar); groove(t0, b % 2, 0.6 - b * 0.12); } if (b === nb - 1) reverseSwell(tNext + bar * 0.5, 0.6); continue; }
      drumLP.frequency.setValueAtTime(dCut = 18000, t0);
      if (b % 8 === 0) impact(t0, b === 0 ? 1 : 0.7); // every 8-bar phrase starts with an impact
      if (sec === 'dropA') { // jungle: groove, groove, rolling groove, then a fill whose size grows with the phrase
        const p = b % 4;
        if (p === 0) groove(t0, 0); else if (p === 1) groove(t0, 1); else if (p === 2) rolling(t0);
        else if (phraseEnd8 && b === nb - 1) fillBig(t0, tNext); else if (phraseEnd8) fillMedium(t0); else fillSmall(t0);
      } else { // breakcore: an 8-bar arc that escalates and resolves on the next downbeat
        const plan = ['g0', 'g1', 'g0', 'edit', 'g0', 'half', 'rev', 'roll'], k = plan[b % 8];
        if (k === 'g0') groove(t0, 0); else if (k === 'g1') groove(t0, 1);
        else if (k === 'edit') bcEdit(t0); else if (k === 'half') bcHalftime(t0); else if (k === 'rev') bcReverse(t0);
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
