// song-forge template: a short but complete song using every technique in the pipeline. Copy it, then rewrite the
// composition (keep the plumbing). Original composition only: use references for style (tempo, key, textures,
// structure), never their melodies.
//
//   node render.js song.js "title" --events stems/events.json      -> the notes of every part
//   python3 guitar_stems.py stems/events.json stems                  -> records each part (FluidSynth + amp sim)
//   node render.js song.js "title" --stem part=stems/part.wav ...    -> the mix (breaks, drums, synths, effects)
//
// Every timing is on a 16th-note grid: STEP seconds per 16th, BAR = 16 steps.
const BPM = 174, STEP = 60 / BPM / 4, BAR = STEP * 16;
const SECTIONS = [['intro', 4], ['verse', 8], ['drop', 8], ['outro', 3]];
const LEN = Object.fromEntries(SECTIONS), START = {}; { let g = 0; for (const [n, l] of SECTIONS) { START[n] = g; g += l; } }
const Q = { m: [0, 3, 7], M: [0, 4, 7], '7': [0, 4, 7, 10] };
// chords: [root midi (octave 3), quality]. E minor: i - VI - III - VII  (Em C G D), then the dark bII (F) and V (B7)
const Em = [52, 'm'], C = [48, 'M'], G = [55, 'M'], D = [50, 'M'], F = [53, 'M'], B7 = [59, '7'];
const PROG = [Em, C, G, D, Em, C, F, B7];
// melodies: [16th step, midi, length in 16ths]. Write every note on purpose; formula-generated runs sound random.
const THEME = [
  [[0, 71, 4], [4, 76, 4], [8, 74, 2], [10, 76, 2], [12, 79, 4]],
  [[0, 76, 6], [6, 72, 2], [8, 67, 4], [12, 72, 4]],
  [[0, 74, 4], [4, 71, 2], [6, 74, 2], [8, 79, 6], [14, 81, 2]],
  [[0, 78, 8], [8, 74, 4], [12, 69, 4]],
];
const LO = -12;   // leads an octave down: heavier, less shrill
function bars() {
  const out = []; let gi = 0;
  for (const [sec, n] of SECTIONS) for (let b = 0; b < n; b++, gi++) {
    const ch = sec === 'outro' ? Em : PROG[b % 8];
    out.push({ sec, b, gi, t0: gi * BAR, ch, notes: Q[ch[1]].map(i => ch[0] + i) });
  }
  return out;
}
const gRoot = c => 40 + ((c[0] - 40) % 12);   // lowest playable power chord (E2..D#3)
const below = (m, notes) => { for (let k = m - 3; k > m - 6; k--) if (notes.some(n => (n - k) % 12 === 0)) return k; return m - 4; };   // a third/fourth under, in the chord

// ---------------- the parts (notes), recorded by guitar_stems.py ----------------
function guitarEvents() {
  const P = { rhythm: [], bass: [], lead: [], harm: [], piano: [], strings: [] };
  const note = (arr, t, m, len, vel, art) => arr.push([t, m, len, vel, art || 'open']);
  const chord = (arr, t, notes, len, vel) => notes.forEach(n => note(arr, t, n, len, vel));
  const pc = (t, root, len, art, vel) => { for (const n of [root, root + 7, root + 12]) P.rhythm.push([t, n, len, vel, art]); };   // power chord
  const pat = (t0, root, PT) => PT.forEach(([s, l, art]) => { pc(t0 + s * STEP, root, l * STEP * 0.95, art, art === 'open' ? 120 : 106); P.bass.push([t0 + s * STEP, root - 12, l * STEP * 0.95, 110, 'open']); });
  // riffs (16th grid): [step, length, articulation]
  const GALLOP = [0, 4, 8, 12].flatMap(b => [[b, 2, b % 8 === 0 ? 'open' : 'mute'], [b + 2, 1, 'mute'], [b + 3, 1, 'mute']]);
  const CHUG = [[0, 3, 'open'], [3, 1, 'mute'], [4, 1, 'mute'], [5, 1, 'mute'], [6, 2, 'open'], [8, 1, 'mute'], [9, 1, 'mute'], [10, 2, 'open'], [12, 1, 'mute'], [13, 1, 'mute'], [14, 2, 'open']];
  // the lead: grace notes only on notes reached by a leap, placed just BEFORE the beat (they borrow the previous note's time);
  // a bend on the longest note every other bar, a release at phrase ends. Sparing ornaments sound intentional.
  const melody = (t0, line, notes, twin, graces) => {
    const gi = Math.round(t0 / BAR), longest = line.reduce((a, n, i) => n[2] > line[a][2] ? i : a, 0);
    line.forEach(([s, m, l], i) => {
      const grace = (graces || []).indexOf(i) >= 0, bend = !grace && gi % 2 === 0 && i === longest && l >= 6, rel = gi % 4 === 3 && i === line.length - 1;
      const art = bend && rel ? 'bendrel' : bend ? 'bend' : rel ? 'release' : 'lead', mm = m + LO, t = t0 + s * STEP;
      if (twin) note(P.harm, t, below(mm, notes), l * STEP * 0.97, 106, art);
      if (grace) { const q = STEP * 0.7, prev = P.lead[P.lead.length - 1], from = prev && prev[1] > mm ? mm + 2 : mm - 2;
        if (prev && prev[0] + prev[2] > t - q) prev[2] = t - q - prev[0] - 0.004; note(P.lead, t - q, from, q * 0.92, 104, 'open'); }
      note(P.lead, t, mm, l * STEP * 0.97, 114, art);
    });
  };
  for (const { sec, b, t0, ch, notes } of bars()) {
    const r = gRoot(ch), str = notes.map(n => n + 12);
    if (sec === 'intro') {   // piano alone, strings join
      note(P.piano, t0, ch[0] - 24, BAR, 90); note(P.piano, t0, ch[0] - 12, BAR, 80);
      notes.concat([notes[1] + 12]).forEach((m, i) => note(P.piano, t0 + i * 4 * STEP, m + 12, STEP * 4, 78));
      if (b >= 2) chord(P.strings, t0, str, BAR, 70 + b * 4);
      if (b === LEN.intro - 1) pc(t0 + 8 * STEP, r, STEP * 7.5, 'open', 116);   // pickup
    } else if (sec === 'verse') {   // chug + theme, harmony from bar 5
      pat(t0, r, CHUG); melody(t0, THEME[b % 4], notes, b >= 4, b === 2 ? [3] : []);
      chord(P.strings, t0, str, BAR, 72);
    } else if (sec === 'drop') {   // gallop, theme an octave up, twin leads, legato stabs on the last bar
      pat(t0, r, GALLOP);
      if (b < 7) melody(t0, THEME[b % 4].map(([s, m, l]) => [s, m + 12, l]), notes, true, b === 0 ? [4] : []);
      else [0, 3, 6, 8, 11, 14].forEach((s, i, A) => { const len = ((A[i + 1] || 16) - s) * STEP + 0.012;   // legato: ring into the next
        note(P.lead, t0 + s * STEP, notes[i % 3] + 24 + LO, len, 120, 'legato'); });
      chord(P.strings, t0, str.concat([str[0] + 12]), BAR, 80);
    } else if (b === 0) {   // outro: one low chord that rings out
      pc(t0, 40, BAR * 2.6, 'open', 124); P.bass.push([t0, 28, BAR * 2.6, 118, 'open']);
      note(P.lead, t0, 64 + LO + 12, BAR * 2.6, 116, 'lead'); note(P.piano, t0, 28, BAR * 3, 104); chord(P.strings, t0, [52, 55, 59], BAR * 2.6, 84);
    }
  }
  const part = (notes, o) => Object.assign({ sf: 'musescore', amp: 'none', humanize: 3, notes }, o);
  return { bpm: BPM, sections: SECTIONS, parts: {
    rhythmL: part(P.rhythm, { amp: 'rhythm', humanize: 6, release: -1400 }),
    // the right guitar is a different take: looser, root-fifth voicing (no octave), so hard-panned it stays wide
    rhythmR: part(P.rhythm.filter(n => !P.rhythm.some(o => o[0] === n[0] && o[1] === n[1] - 12)), { amp: 'rhythm', humanize: 9, velvar: 10, cents: 8, release: -1400 }),
    bass: part(P.bass, { program: 34, amp: 'bass', humanize: 3, release: -1400 }),
    // THE HOUSE GUITAR (the listener's choice): every guitar - rhythm, lead, harmony - uses the rhythm tone (amp 'rhythm',
    // the GTR chain below, release -1400). The lead plays single notes at the written pitch (above the rhythm guitars);
    // mono: true keeps bends/vibrato from bleeding between notes. The harmony is a second player like rhythmR.
    lead: part(P.lead, { amp: 'rhythm', mono: true, humanize: 6, release: -1400 }),
    harmony: part(P.harm, { amp: 'rhythm', mono: true, humanize: 9, velvar: 10, cents: 8, release: -1400 }),
    // THE HOUSE PIANO: the Salamander Grand ('piano'; bash scripts/setup.sh --piano), played like a pianist: velocities
    // ~60-120 shaped by the phrase, chords rolled ~6 ms bass-up, sustain pedal changed per chord in lyrical passages
    // (pedal: [[down, up], ...]); see references/mixing.md "Realistic piano"
    piano: part(P.piano, { sf: 'piano', program: 0, humanize: 4, velvar: 5, pedal: [] }),
    strings: part(P.strings, { program: 48 }),
  } };
}

// ---------------- the mix ----------------
async function renderSong() {
  const SR = 44100, BARS = bars(), totalBars = BARS.length, dur = totalBars * BAR + 2.5;
  const rand = (() => { let s = 4242; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();   // seeded: renders repeat
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * dur), SR);
  const has = n => (window.ASSET_NAMES || []).indexOf(n) >= 0;
  const SOLO = window.SOLO, DRUMS_ON = !SOLO || SOLO === 'all' || SOLO === 'drums';
  // master: gentle glue compression (bypassed for stem export so stems sum exactly), slight low-shelf and air trim
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -9; comp.ratio.value = SOLO ? 1 : 1.6; comp.attack.value = 0.015; comp.release.value = 0.15;
  const master = ctx.createGain(); master.gain.value = 0.8;
  const lowShelf = ctx.createBiquadFilter(); lowShelf.type = 'lowshelf'; lowShelf.frequency.value = 80; lowShelf.gain.value = -3;
  const air = ctx.createBiquadFilter(); air.type = 'highshelf'; air.frequency.value = 6000; air.gain.value = -2;
  const mride = ctx.createGain();   // whole-mix level shaping (e.g. easing into a quiet section)
  master.connect(mride); mride.connect(lowShelf); lowShelf.connect(air); air.connect(comp); comp.connect(ctx.destination);
  const dry = ctx.createGain(); dry.connect(master);
  // reverb: a decaying-noise impulse; a 5 kHz low-pass on its return keeps it dark
  const verb = ctx.createConvolver();
  { const len = SR * 3, ir = ctx.createBuffer(2, len, SR); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, 2.4); } verb.buffer = ir; }
  const verbLP = ctx.createBiquadFilter(); verbLP.type = 'lowpass'; verbLP.frequency.value = 5000; const verbOut = ctx.createGain(); verbOut.gain.value = 0.4;
  verb.connect(verbLP); verbLP.connect(verbOut); verbOut.connect(master);
  // ping-pong echo: left echo -> right echo -> fed back quieter. ONE loop with gain < 1 (a loop at >= 1 blows up)
  const delay = ctx.createDelay(2), delay2 = ctx.createDelay(2); delay.delayTime.value = delay2.delayTime.value = STEP * 3;
  const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2400; dlp.Q.value = 0;
  const fb = ctx.createGain(); fb.gain.value = 0.35; const dL = ctx.createStereoPanner(), dR = ctx.createStereoPanner(); dL.pan.value = -0.8; dR.pan.value = 0.8;
  const dOut = ctx.createGain(); dOut.gain.value = 0.6;
  delay.connect(dlp); dlp.connect(dL); dL.connect(dOut); dlp.connect(delay2); delay2.connect(dR); dR.connect(dOut); dOut.connect(master); delay2.connect(fb); fb.connect(delay);
  const send = (node, v, echo) => { const g = ctx.createGain(); g.gain.value = v; node.connect(g); g.connect(verb); if (echo) g.connect(delay); };

  // ---- stems: each levelled to a target loudness, given its own EQ slot, panned, optionally ducked under the kick ----
  const ducks = [], RIDE = {};
  const eqChain = (src, eq) => { let n = src; for (const [type, f, g, q] of eq || []) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (g != null) b.gain.value = g; b.Q.value = q || 0.7; n.connect(b); n = b; } return n; };
  async function stem(name, pan, targetDb, verbAmt, echo, eq, duck) {
    if (!has('stem/' + name) || (SOLO && SOLO !== 'all' && SOLO !== name)) return;
    const buf = await loadAsset('stem/' + name, ctx), d = buf.getChannelData(0);
    let sum = 0, n = 0; for (let i = 0; i < d.length; i += 4) { const a = Math.abs(d[i]); if (a > 1e-3) { sum += a * a; n++; } }
    const rms = Math.sqrt(sum / Math.max(1, n)) || 1e-3, src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = Math.pow(10, targetDb / 20) / rms; const p = ctx.createStereoPanner(); p.pan.value = pan;
    src.connect(g); let out = eqChain(g, eq);
    if (duck) { const dg = ctx.createGain(); out.connect(dg); out = dg; ducks.push([dg, duck]); }
    const ride = ctx.createGain(); RIDE[name] = ride; out.connect(ride); ride.connect(p); p.connect(dry); send(p, verbAmt, echo); src.start(0);
  }
  const HP = f => ['highpass', f, null, 0.7], LP = f => ['lowpass', f, null, 0.7], PK = (f, g, q) => ['peaking', f, g, q || 1];
  const GTR = [HP(100), PK(350, -3, 1.1), PK(2000, -3.5, 1.4), PK(3500, 2.5, 1), LP(9000)];   // rhythm: room for bass/snare (350) and the lead (2k)
  await stem('rhythmL', -1, -13.5, 0.02, false, GTR, 0.12);                                  // hard left / hard right: width
  await stem('rhythmR', 1, -13.5, 0.02, false, GTR, 0.12);
  await stem('bass', 0, -20, 0, false, [HP(45), PK(350, -3, 1), PK(900, 2, 1), LP(2600)], 0.28);
  await stem('lead', 0, -12.5, 0.08, false, GTR);   // the house guitar tone, centred
  await stem('harmony', 0.45, -16, 0.08, false, GTR);
  await stem('piano', -0.15, -14, 0.32, false, [HP(60), PK(250, -2, 1), PK(3000, 1.5, 1)]);   // a real stereo grand, a room around it
  await stem('strings', 0.6, -27, 0.45, false, [HP(320), ['highshelf', 6000, 3, 0.7], LP(14000)]);

  // level changes never jump: each glides over the 2 bars before the downbeat it belongs to
  const glide = (param, a, c, b) => { if (a === c) return; const v = x => Math.pow(10, x / 20); param.setValueAtTime(v(a), b * BAR - 2 * BAR); param.linearRampToValueAtTime(v(c), b * BAR); };
  const ADJ = { lead: b => b < START.drop ? -1 : 0 };   // e.g. the lead sits back in the verse; add per-part rules here
  for (const k in ADJ) if (RIDE[k]) for (let b = 1; b < totalBars; b++) glide(RIDE[k].gain, ADJ[k](b - 1), ADJ[k](b), b);

  // ---- drums: breaks (grooves, fills, single hits) + a synth kick and sub ----
  const BRK = {}; for (const k of Object.keys(window.BREAK_INFO || {})) if (has('break/' + k)) BRK[k] = await loadAsset('break/' + k, ctx);
  const INFO = window.BREAK_INFO || {}, names = Object.keys(BRK), MAIN = names[0], LAYER = names[1] || names[0];
  const drumBus = ctx.createGain(); drumBus.gain.value = DRUMS_ON ? 1.0 : 0;   // stem export: drums silent but still ducking
  const drumEQ = eqChain(drumBus, [HP(35), PK(380, -4, 1), PK(4500, 1.5, 0.9)]); const drumLP = ctx.createBiquadFilter(); drumLP.type = 'lowpass'; drumLP.frequency.value = 18000;
  drumEQ.connect(drumLP); drumLP.connect(dry); send(drumLP, 0.05);
  const DLOG = { break: [], layer: [], kick: [] };   // drum hits, for visualize.py / export_midi.py
  const rate = name => BPM / ((INFO[name] && INFO[name].bpm) || 160), bStep = name => 60 / ((INFO[name] && INFO[name].bpm) || 160) / 4;
  function slice(name, t, idx, len, r, vol, quiet) {   // play `len` 16th-slices of a break starting at slice idx, at playback rate r
    const buf = BRK[name]; if (!buf) return;
    if (!quiet) DLOG[name === LAYER && name !== MAIN ? 'layer' : 'break'].push([t, Math.min(len, 2) * STEP * 0.8, idx % 12]);
    const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = r; const g = ctx.createGain(), d = len * bStep(name) / r, v = vol == null ? 1 : vol;
    g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + Math.max(0.005, d - 0.008)); g.gain.linearRampToValueAtTime(0, t + d);
    src.connect(g); g.connect(drumBus); src.start(t, idx * bStep(name), len * bStep(name)); src.stop(t + d + 0.01);
  }
  const groove = (name, t0, bar, vol, len) => { if (!INFO[name]) return; const i0 = (bar % (INFO[name].steps / 16)) * 16;
    slice(name, t0, i0, len || 16, rate(name), vol, true); for (let k = 0; k < (len || 16); k += 2) DLOG.break.push([t0 + k * STEP, STEP * 1.6, (i0 + k) % 12]); };
  const roll = (name, t, steps, n, p0, p1, v0, v1) => { for (let k = 0; k < n; k++) { const f = k / Math.max(1, n - 1); slice(name, t + k * steps * STEP / n, INFO[name].snare, steps / n, rate(name) * (p0 + (p1 - p0) * f), v0 + (v1 - v0) * f); } };
  const fillBar = (name, t0, b) => { groove(name, t0, b, 1, 12); roll(name, t0 + 12 * STEP, 4, 6, 1, 1.25, 0.55, 0.95); };
  function hit(t, f0, f1, d, v, dest) { if (!DRUMS_ON && dest) return; const o = ctx.createOscillator(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d * 0.7);
    const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(g); g.connect(dest || drumBus); o.start(t); o.stop(t + d + 0.02); }
  function duckAll(t, v) { for (const [g, depth] of ducks) { g.gain.setTargetAtTime(1 - depth * Math.min(1, v), t, 0.003); g.gain.setTargetAtTime(1, t + 0.03, 0.06); } }   // light: tight, no pumping
  const kick = (t, v) => { hit(t, 150, 50, 0.2, 0.7 * v); hit(t, 70, 42, 0.32, 0.45 * v); duckAll(t, v); DLOG.kick.push([t, STEP, 60]); };
  const subBus = ctx.createGain(); subBus.gain.value = DRUMS_ON ? 0.5 : 0; const subDuck = ctx.createGain(); subBus.connect(subDuck); subDuck.connect(dry); ducks.push([subDuck, 0.3]);
  function sub(t, m, len, v) { const o = ctx.createOscillator(); o.frequency.value = 440 * Math.pow(2, (m - 69) / 12); const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.setValueAtTime(v, t + len - 0.04); g.gain.linearRampToValueAtTime(0.0001, t + len); o.connect(g); g.connect(subBus); o.start(t); o.stop(t + len + 0.05); }
  for (const { sec, b, t0, ch } of BARS) {
    const at = s => t0 + s * STEP, subN = 28 + ((ch[0] - 28) % 12), last = b === LEN[sec] - 1;
    if (sec === 'intro') { if (b >= 2 && MAIN) { drumLP.frequency.setValueAtTime(400 + b * 300, t0); groove(MAIN, t0, b, 0.6); } continue; }   // filtered in
    if (sec === 'outro') { if (b === 0) { kick(t0, 1.2); hit(t0, 70, 24, 3, 0.7, master); sub(t0, 28, BAR * 2.6, 0.45); } continue; }
    if (b === 0) drumLP.frequency.setTargetAtTime(18000, t0, 0.1);
    if (MAIN) { if (last || b % 4 === 3) fillBar(MAIN, t0, b); else groove(MAIN, t0, b, 1); }
    if (sec === 'drop' && LAYER && LAYER !== MAIN && b % 4 !== 3) { slice(LAYER, at(4), INFO[LAYER].snare, 1, rate(LAYER), 0.5); slice(LAYER, at(12), INFO[LAYER].snare, 1, rate(LAYER), 0.5); }   // at most 2 breaks at once
    for (let s = 0; s < 16; s += sec === 'drop' ? 4 : 8) kick(at(s), s ? 0.6 : 1);
    sub(t0, subN, BAR - 0.02, 0.3);
  }
  const end = totalBars * BAR + 2.5; master.gain.setValueAtTime(0.8, end - 3); master.gain.linearRampToValueAtTime(0, end);   // gentle fade on the last ring
  const out = await ctx.startRendering();
  const L = out.getChannelData(0), R = out.getChannelData(1), n = L.length, wavBuf = new ArrayBuffer(44 + n * 4), v = new DataView(wavBuf);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const norm = window.SOLO_NORM || (peak > 0 ? 0.95 / peak : 1);   // stems share the full mix's scale
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, n * 4, true);
  for (let i = 0, o = 44; i < n; i++, o += 4) { v.setInt16(o, Math.max(-1, Math.min(1, L[i] * norm)) * 32767, true); v.setInt16(o + 2, Math.max(-1, Math.min(1, R[i] * norm)) * 32767, true); }
  let bin = ''; const u8 = new Uint8Array(wavBuf); for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
  return { wav: btoa(bin), seconds: dur, peak, drums: DLOG };
}
