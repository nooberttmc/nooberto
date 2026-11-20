// "The Drowned Sun" v5 (no Think break: its vocal shouts don't belong): the final boss theme, written again from a blank page. Original composition.
// F# minor, 178 BPM, ~3:10. Built from what the reference does (not its notes): an Andalusian-style descent
// (i - VII - VI - V), flowing 16th-note runs, galloping octave bass, staccato chord stabs at the climax,
// a lift up a half step into G minor for the final stretch, and an ending on one low, heavy note.
// Pitched parts are recorded by tools/guitar_stems.py: sampled instruments (MuseScore General via FluidSynth),
// every guitar re-amped through an overdrive, Guitarix JCM800 + DS-1 and a 4x12 cabinet curve.
// Drums: at most two breakbeats from the pack at any moment, pitched from 160 to 178 BPM.
const BPM = 178, STEP = 60 / BPM / 4, BAR = STEP * 16;
const SECTIONS = [['intro', 8], ['a1', 16], ['b1', 16], ['brk', 8], ['a2', 16], ['clx', 16], ['inter', 8], ['a3', 16], ['b3', 16], ['outro', 4]];
const Q = { m: [0, 3, 7], M: [0, 4, 7], '7': [0, 4, 7, 10] };
// roots in octave 3 (F#3 = 54)
const Fsm = [54, 'm'], E = [52, 'M'], D = [50, 'M'], Cs = [49, 'M'], Cs7 = [49, '7'], Bm = [59, 'm'], A = [57, 'M'], G = [55, 'M'], D7 = [50, '7'];
const PROG_A = [Fsm, E, D, Cs, Bm, D, G, Cs7];        // the descent, then the dark bII (G) before the dominant
const PROG_B = [D, A, E, Fsm, Bm, Fsm, G, Cs7];
const PROG_BRK = [Fsm, Fsm, G, Cs];
const PROG_CLX = [Fsm, Fsm, D, D, Bm, Bm, Cs, Cs7];
const PROG_INT = [Fsm, D, Bm, Cs, Fsm, D, Cs7, D7];   // D7 pivots into G minor
// melodies: [16th step, midi, length in 16ths]
const THEME_A = [
  [[0, 73, 4], [4, 78, 4], [8, 76, 2], [10, 78, 2], [12, 81, 4]],
  [[0, 80, 6], [6, 76, 2], [8, 71, 4], [12, 76, 4]],
  [[0, 78, 4], [4, 74, 2], [6, 78, 2], [8, 81, 6], [14, 83, 2]],
  [[0, 80, 8], [8, 77, 4], [12, 73, 4]],
  [[0, 74, 4], [4, 78, 4], [8, 83, 4], [12, 81, 2], [14, 78, 2]],
  [[0, 81, 6], [6, 78, 2], [8, 74, 4], [12, 69, 4]],
  [[0, 71, 4], [4, 74, 4], [8, 79, 6], [14, 78, 2]],
  [[0, 77, 4], [4, 80, 4], [8, 83, 4], [12, 80, 2], [14, 77, 2]],
];
const BRK_LEAD = [[[0, 78, 16]], [[0, 76, 8], [8, 73, 8]], [[0, 79, 12], [12, 78, 4]], [[0, 77, 16]]];
// climax: staccato stabs on a dotted grid, the top voice moving
const STAB = [0, 3, 6, 8, 11, 14];
const CLX_TOP = [[81, 80, 78, 81, 85, 81], [83, 81, 80, 78, 76, 78], [81, 78, 74, 78, 81, 86], [85, 83, 81, 78, 81, 83],
  [83, 78, 74, 78, 83, 86], [85, 83, 81, 83, 85, 86], [85, 80, 77, 80, 85, 89], [83, 80, 77, 73, 77, 80]];
const LO = -12;  // every lead line sits an octave lower: darker, heavier, less piercing
const SCALE = [0, 2, 3, 5, 7, 8, 10];  // natural minor from the tonic
const RUNS = [[1, 2, 1, 3, 2, 1, 2, 0, 1, 0, 1, 2], [0, 1, 2, 3, 2, 3, 4, 3, 2, 1, 2, 1], [3, 2, 1, 2, 0, 1, 0, -1, 0, 1, 2, 3]];

function bars() {
  const out = []; let gi = 0;
  for (const [sec, n] of SECTIONS) for (let b = 0; b < n; b++, gi++) {
    let ch, tr = 0;
    if (sec === 'intro' || sec === 'a1' || sec === 'a2') ch = PROG_A[b % 8];
    else if (sec === 'b1') ch = PROG_B[b % 8];
    else if (sec === 'brk') ch = PROG_BRK[b % 4];
    else if (sec === 'clx') ch = PROG_CLX[b % 8];
    else if (sec === 'inter') ch = PROG_INT[b];
    else if (sec === 'a3') { ch = PROG_A[b % 8]; tr = 1; }
    else if (sec === 'b3') { ch = PROG_B[b % 8]; tr = 1; }
    else { ch = Fsm; tr = 1; }
    out.push({ sec, b, gi, t0: gi * BAR, ch, tr, notes: Q[ch[1]].map(i => ch[0] + i + tr) });
  }
  return out;
}
const gRoot = (c, tr) => 40 + ((c[0] + tr - 40) % 12);   // lowest playable power chord (E2..D#3)
const below = (m, notes) => { for (let k = m - 3; k > m - 6; k--) if (notes.some(n => (n - k) % 12 === 0)) return k; return m - 4; };
const voicing = (notes, base) => notes.map(n => base + ((n - base) % 12 + 12) % 12).sort((a, b) => a - b);
// a flowing 16th run over the chord: chord tones from `base` upward, indexed by a figure
function run(notes, base, fig) {
  const tones = voicing(notes, base); const ext = [tones[tones.length - 1] - 12, ...tones, ...tones.map(t => t + 12)];
  return fig.map(i => ext[Math.max(0, Math.min(ext.length - 1, i + 1))]);
}

// ---------------- every pitched part, recorded by tools/guitar_stems.py ----------------
function guitarEvents() {
  const P = { rhythm: [], bass: [], lead: [], harm: [], piano: [], strings: [], low: [], brass: [], organ: [], timp: [] };
  const note = (arr, t, m, len, vel, art) => arr.push([t, m, len, vel, art || 'open']);
  const chord = (arr, t, notes, len, vel) => notes.forEach(n => note(arr, t, n, len, vel));
  const pc = (t, root, len, art, vel) => { for (const n of [root, root + 7, root + 12]) P.rhythm.push([t, n, len, vel, art]); };
  const pat = (t0, root, PT, bassOct) => PT.forEach(([s, l, art]) => {
    pc(t0 + s * STEP, root, l * STEP * 0.95, art, art === 'open' ? 120 : 106);
    P.bass.push([t0 + s * STEP, root - 12 + (bassOct && s % 4 === 2 ? 12 : 0), l * STEP * 0.95, art === 'open' ? 112 : 98, 'open']);
  });
  // pitch bends, used sparingly: every other bar the longest held note is bent up into pitch,
  // and every fourth bar the phrase's last note sags down as it ends
  const melody = (t0, line, tr, notes, twin) => {
    const gi = Math.round(t0 / BAR), longest = line.reduce((a, n, i) => n[2] > line[a][2] ? i : a, 0);
    line.forEach(([s, m, l], i) => {
      const bend = gi % 2 === 0 && i === longest && l >= 6, rel = gi % 4 === 3 && i === line.length - 1 && l >= 4;
      const art = bend && rel ? 'bendrel' : bend ? 'bend' : rel ? 'release' : 'lead';
      const mm = m + tr + LO; note(P.lead, t0 + s * STEP, mm, l * STEP * 0.97, 114, art);
      if (twin) note(P.harm, t0 + s * STEP, below(mm, notes), l * STEP * 0.97, 106, art);
    });
  };
  const runBar = (t0, notes, fig, twin, base) => {
    const r = run(notes, (base || 73) + LO, RUNS[fig % RUNS.length]);
    r.forEach((m, i) => { note(P.lead, t0 + i * STEP, m, STEP * 0.92, 108 + (i % 4 === 0 ? 10 : 0), 'open'); if (twin) note(P.harm, t0 + i * STEP, below(m, notes), STEP * 0.92, 98, 'open'); });
    const last = r[r.length - 1];
    note(P.lead, t0 + 12 * STEP, last + (fig % 2 ? 3 : 2), STEP * 1.9, 112, 'lead'); note(P.lead, t0 + 14 * STEP, last, STEP * 1.9, 112, 'lead');
  };
  const scaleDown = (t0, top, tr, n, s0) => { // a descending minor-scale run in 16ths from `top`
    const pcs = SCALE.map(x => (x + 6 + tr) % 12); let m = top + LO;
    for (let i = 0; i < n; i++) { note(P.lead, t0 + (s0 + i) * STEP, m, STEP * 0.92, 110, 'open'); do m--; while (pcs.indexOf(((m % 12) + 12) % 12) < 0); }
  };
  const pianoBar = (t0, notes, ch, tr, vel, busy) => {
    const r = ch[0] + tr - 24; note(P.piano, t0, r, BAR * 0.98, vel); note(P.piano, t0, r + 12, BAR * 0.98, vel - 8);
    if (busy) run(notes, 66, RUNS[(t0 / BAR | 0) % 3]).forEach((m, i) => note(P.piano, t0 + i * STEP, m, STEP * 1.5, vel - 18 + (i % 4 ? 0 : 10)));
    else voicing(notes, 66).concat([voicing(notes, 66)[1] + 12]).forEach((m, i) => note(P.piano, t0 + i * 4 * STEP, m, STEP * 4, vel - 12));
  };
  const timp = (t, ch, tr, v) => note(P.timp, t, 30 + ((ch[0] + tr - 30) % 12), STEP * 3, v);
  // riffs (16th grid): [step, length, articulation]
  const CHUG = [[0, 3, 'open'], [3, 1, 'mute'], [4, 1, 'mute'], [5, 1, 'mute'], [6, 2, 'open'], [8, 1, 'mute'], [9, 1, 'mute'], [10, 2, 'open'], [12, 1, 'mute'], [13, 1, 'mute'], [14, 2, 'open']];
  const CHUG_END = [[0, 3, 'open'], [3, 1, 'mute'], [4, 1, 'mute'], [6, 2, 'open'], [8, 4, 'open'], [12, 4, 'open']];
  const GALLOP = [0, 4, 8, 12].flatMap(b => [[b, 2, b % 8 === 0 ? 'open' : 'mute'], [b + 2, 1, 'mute'], [b + 3, 1, 'mute']]);
  const BREAKDOWN = [[0, 4, 'open'], [6, 1, 'mute'], [7, 1, 'mute'], [10, 3, 'open'], [14, 1, 'mute'], [15, 1, 'mute']];
  const DRIVE = [0, 2, 4, 6, 8, 10, 12, 14].map(s => [s, 2, s % 4 === 0 ? 'open' : 'mute']).concat([[3, 1, 'mute'], [11, 1, 'mute']]);
  const STABS = STAB.map((s, i) => [s, i === 5 ? 2 : (STAB[i + 1] - s), 'open']).flatMap(([s, l]) => [[s, 1, 'open']].concat(l > 1 ? [[s + 1, 1, 'mute']] : []).concat(l > 2 ? [[s + 2, 1, 'mute']] : []));
  const EIGHTHS = [0, 2, 4, 6, 8, 10, 12, 14].map(s => [s, 2, 'mute']);
  for (const x of bars()) {
    const { sec, b, t0, ch, tr, notes } = x, r = gRoot(ch, tr), low = voicing(notes, 43), str = voicing(notes, 55), at = s => t0 + s * STEP;
    const strings = (v, oct) => chord(P.strings, t0, oct ? str.concat([str[0] + 12]) : str, BAR, v);
    const lowStr = v => chord(P.low, t0, [ch[0] + tr - 24, ch[0] + tr - 12], BAR, v);
    if (sec === 'intro') { // the piano alone with low strings, then the band joins at bar 5
      pianoBar(t0, notes, ch, tr, 92, b >= 2);
      lowStr(84 + b * 3); chord(P.organ, t0, low, BAR, 66 + b * 4);
      if (b >= 2) strings(70 + b * 4);
      if (b % 2 === 0 || b >= 4) timp(t0, ch, tr, 82 + b * 5);
      if (b >= 4 && b < 7) { pc(t0, r, STEP * 7.5, 'open', 116); pc(at(8), r, STEP * 7.5, 'open', 112); P.bass.push([t0, r - 12, BAR * 0.98, 110, 'open']); melody(t0, THEME_A[b - 4], 0, notes, false); }
      if (b === 7) { pc(t0, r, STEP * 5.5, 'open', 118); for (let s = 6; s < 16; s++) pc(at(s), r, STEP * 0.9, 'mute', 92 + s * 2); P.bass.push([t0, r - 12, BAR * 0.98, 110, 'open']); scaleDown(t0, 85, 0, 10, 6); }
    } else if (sec === 'a1' || sec === 'a2' || sec === 'a3') { // the main theme
      const twin = sec !== 'a1' || b >= 8;
      pat(t0, r, b % 8 === 7 ? CHUG_END : (sec === 'a2' ? DRIVE : CHUG), sec === 'a2');
      if (b % 8 === 7 && b === 15) { melody(t0, THEME_A[7].slice(0, 2), tr, notes, twin); scaleDown(t0, 85 + tr, tr, 8, 8); }
      else melody(t0, THEME_A[b % 8], tr, notes, twin);
      // drops stay lean: guitars, bass, lead and drums carry them; strings sit an octave up, brass only marks phrases
      chord(P.strings, t0, str.map(n => n + 12), BAR, 72);
      if (b % 4 === 0) { timp(t0, ch, tr, 108); chord(P.brass, t0, str, STEP * 3, 104); }
    } else if (sec === 'b1' || sec === 'b3') { // flowing 16th runs over the gallop
      pat(t0, r, GALLOP, true);
      if (b % 4 === 3) melody(t0, [[0, voicing(notes, 73)[2], 16]], 0, notes, true);
      else runBar(t0, notes, b, sec === 'b3' || b >= 8);
      chord(P.strings, t0, str.map(n => n + 12), BAR, 70);
      if (b % 2 === 0) chord(P.brass, t0, str, STEP * 2, sec === 'b3' ? 110 : 100);
      if (b % 4 === 0) timp(t0, ch, tr, 112);
      if (sec === 'b3' && b === 15) for (let s = 8; s < 16; s++) note(P.timp, at(s), 31, STEP, 90 + s * 3);
    } else if (sec === 'brk') { // half-time breakdown, low and heavy
      pat(t0, b < 2 ? 42 : r, BREAKDOWN); melody(t0, BRK_LEAD[b % 4], 0, notes, true);
      chord(P.brass, t0, low, STEP * 6, 118); chord(P.brass, at(10), low, STEP * 4, 110);
      timp(t0, ch, tr, 122); timp(at(10), ch, tr, 112);
      lowStr(104); chord(P.organ, t0, low, BAR, 96);
    } else if (sec === 'clx') { // staccato chord stabs, everyone on the same rhythm
      pat(t0, r, STABS, true);
      const top = CLX_TOP[b % 8];
      STAB.forEach((s, i) => { const m = top[i] + tr + LO; note(P.lead, at(s), m, STEP * 1.6, 118, 'open'); note(P.harm, at(s), below(m, notes), STEP * 1.6, 108, 'open');
        if (i === 0 || i === 3) chord(P.brass, at(s), str, STEP * 1.5, 112); });
      chord(P.strings, t0, str.map(n => n + 12), BAR, 76);
      if (b % 2 === 0) timp(t0, ch, tr, 118);
    } else if (sec === 'inter') { // the storm drops to piano and muted guitars, then climbs into G minor
      pianoBar(t0, notes, ch, tr, 96, true);
      pat(t0, r, b === 7 ? DRIVE : EIGHTHS);
      lowStr(84 + b * 3);
      if (b >= 4) melody(t0, b === 7 ? [[0, 74, 8], [8, 78, 4], [12, 81, 4]] : [[0, voicing(notes, 73)[0], 16]], 0, notes, b >= 6);
      if (b >= 6) for (let s = 0; s < 16; s += 4) timp(at(s), ch, tr, 90 + b * 4 + s);
    } else if (b === 0) { // outro: G minor; the lead falls two octaves and everything lands on one low G
      pc(t0, 43, STEP * 3, 'open', 124); for (let s = 3; s < 16; s++) pc(at(s), 43, STEP * 0.9, s % 4 === 0 ? 'open' : 'mute', 110);
      P.bass.push([t0, 31, BAR * 0.98, 116, 'open']);
      [79, 77, 74, 70, 67, 65, 62, 58].forEach((m, i) => { note(P.lead, at(i * 2), m, STEP * 1.9, 116, 'open'); note(P.harm, at(i * 2), m - 5, STEP * 1.9, 106, 'open'); });
      chord(P.organ, t0, [43, 50, 55], BAR, 100); chord(P.strings, t0, [55, 58, 62], BAR, 96); chord(P.low, t0, [31, 43], BAR, 110); timp(t0, [43], 0, 124);
      const tEnd = t0 + BAR; // the final low note
      pc(tEnd, 43, BAR * 2.6, 'open', 126); P.bass.push([tEnd, 31, BAR * 2.6, 120, 'open']);
      note(P.lead, tEnd, 55, BAR * 2.6, 118, 'lead'); note(P.harm, tEnd, 43, BAR * 2.6, 110, 'lead');
      chord(P.organ, tEnd, [31, 43, 50], BAR * 3, 108); chord(P.low, tEnd, [31, 43], BAR * 3, 116); chord(P.brass, tEnd, [43, 50, 55], BAR * 2, 118);
      note(P.piano, tEnd, 31, BAR * 3, 110); note(P.piano, tEnd, 19, BAR * 3, 110); note(P.timp, tEnd, 31, BAR, 127);
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
  const rand = (() => { let s = 5050; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const BARS = bars(), totalBars = BARS.length, dur = totalBars * BAR + 1.5;
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * dur), SR);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 2.5; comp.attack.value = 0.015; comp.release.value = 0.15; // gentle glue: lets drum hits through
  const master = ctx.createGain(); master.gain.value = 0.8;
  const lowShelf = ctx.createBiquadFilter(); lowShelf.type = 'lowshelf'; lowShelf.frequency.value = 80; lowShelf.gain.value = -3;
  const dark = ctx.createBiquadFilter(); dark.type = 'highshelf'; dark.frequency.value = 6000; dark.gain.value = -5;
  master.connect(lowShelf); lowShelf.connect(dark); dark.connect(comp); comp.connect(ctx.destination);
  const dry = ctx.createGain(); dry.connect(master);
  const verb = ctx.createConvolver();
  { const len = SR * 3.2, ir = ctx.createBuffer(2, len, SR); for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, 2.4); } verb.buffer = ir; }
  const verbOut = ctx.createGain(); verbOut.gain.value = 0.4; const verbLP = ctx.createBiquadFilter(); verbLP.type = 'lowpass'; verbLP.frequency.value = 5000;
  verb.connect(verbLP); verbLP.connect(verbOut); verbOut.connect(master);
  const delay = ctx.createDelay(2); delay.delayTime.value = STEP * 3; const fb = ctx.createGain(); fb.gain.value = 0.25;
  const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2400; delay.connect(dlp); dlp.connect(fb); fb.connect(delay); dlp.connect(master);
  const send = (node, v, alsoDelay) => { const g = ctx.createGain(); g.gain.value = v; node.connect(g); g.connect(verb); if (alsoDelay) g.connect(delay); };
  const noise = (() => { const b = ctx.createBuffer(1, SR * 2, SR), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1; return b; })();
  const has = n => (window.ASSET_NAMES || []).indexOf(n) >= 0;

  // ---- recorded stems, each levelled to a target loudness (dB RMS while playing) ----
  // every part gets its own frequency slot (EQ), and the low end ducks under each kick (sidechain-style)
  const ducks = [];   // [gainNode, depth]
  function eqChain(src, eq) {
    let n = src;
    for (const [type, f, g, q] of eq || []) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (g != null) b.gain.value = g; b.Q.value = q || 0.7; n.connect(b); n = b; }
    return n;
  }
  async function stem(name, pan, targetDb, verbAmt, useDelay, eq, duck) {
    if (!has('stem/' + name)) return;
    const buf = await loadAsset('stem/' + name, ctx), d = buf.getChannelData(0);
    let sum = 0, n = 0; for (let i = 0; i < d.length; i += 4) { const a = Math.abs(d[i]); if (a > 1e-3) { sum += a * a; n++; } }
    const rms = Math.sqrt(sum / Math.max(1, n)) || 1e-3, src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = Math.pow(10, targetDb / 20) / rms; const p = ctx.createStereoPanner(); p.pan.value = pan;
    src.connect(g); let out = eqChain(g, eq);
    if (duck) { const dg = ctx.createGain(); out.connect(dg); out = dg; ducks.push([dg, duck]); }
    out.connect(p); p.connect(dry); send(p, verbAmt, useDelay); src.start(0);
  }
  const HP = f => ['highpass', f, null, 0.7], LP = f => ['lowpass', f, null, 0.7], PK = (f, g, q) => ['peaking', f, g, q || 1];
  // rhythm guitars: 100 Hz up, scooped where bass/snare live (350) and where the lead sings (1.8-2.5k)
  const GTR = [HP(100), PK(350, -3.5, 1.1), PK(2200, -4.5, 1.1), LP(5500)];
  await stem('rhythmL', -0.75, -17.5, 0.02, false, GTR, 0.3);
  await stem('rhythmR', 0.75, -17.5, 0.02, false, GTR, 0.3);
  // bass: owns 45-250 Hz under the guitars; the sub synth owns the very bottom
  await stem('bass', 0, -20, 0, false, [HP(45), PK(350, -3, 1), PK(900, 2, 1), LP(2600)], 0.5);
  // lead: on top, with presence where the rhythm guitars were scooped
  await stem('lead', 0.0, -14.5, 0.18, true, [HP(170), PK(450, -2.5, 1), PK(2100, 3, 0.9), LP(6000)]);
  await stem('harmony', 0.3, -25.5, 0.2, true, [HP(260), PK(2000, 1.5, 0.9), LP(6000)]);
  await stem('piano', -0.15, -21, 0.4, false, [HP(110)]);
  await stem('strings', 0.25, -27, 0.45, false, [HP(320), LP(8000)]);
  await stem('low', 0, -24, 0.2, false, [LP(500)], 0.4);
  await stem('brass', 0.15, -24, 0.3, false, [HP(180)]);
  await stem('organ', -0.1, -27, 0.45, false, [HP(120)]);
  await stem('timp', 0, -21, 0.3, false, [HP(45), PK(300, -2, 1)]);

  // ---- breaks: one per section (two at most, when a snare layer is added) ----
  const BRK = {}; for (const k of ['amen_yki', 'amen_df', 'steppin1', 'steppin2', 'bloodfire']) if (has('break/' + k)) BRK[k] = await loadAsset('break/' + k, ctx);
  const INFO = window.BREAK_INFO || {}, bStep = 60 / 160 / 4, R = BPM / 160;
  const drumBus = ctx.createGain(); drumBus.gain.value = 0.9;
  const drumBus2 = ctx.createGain(); drumBus.gain.value = 1.05;
  // drums: no boxiness at 300-400 Hz (that's the guitars' and bass's space), snap at 4-5 kHz to cut through the wall
  const drumDip = eqChain(drumBus2, [HP(35), PK(380, -4, 1), PK(4500, 1.5, 0.9), ['highshelf', 8000, -4, 0.7]]);
  const drumLP = ctx.createBiquadFilter(); drumLP.type = 'lowpass'; drumLP.frequency.value = 18000;
  const drumLow = ctx.createBiquadFilter(); drumLow.type = 'lowshelf'; drumLow.frequency.value = 110; drumLow.gain.value = 0;
  drumBus.connect(drumLow); drumLow.connect(drumBus2); drumDip.connect(drumLP); drumLP.connect(dry); send(drumLP, 0.05);
  const DLOG = { break: [], layer: [], kick: [] };   // drum hits, for the visualizer
  function slice(name, t, idx, len, rate, vol, quiet) {
    const buf = BRK[name]; if (!buf) return;
    if (!quiet) DLOG[name === 'steppin1' ? 'layer' : 'break'].push([t, Math.min(len, 2) * STEP * 0.8, idx % 12]);
    const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    const g = ctx.createGain(), d = len * bStep / rate, v = vol == null ? 1 : vol;
    g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + Math.max(0.005, d - 0.008)); g.gain.linearRampToValueAtTime(0, t + d);
    src.connect(g); g.connect(drumBus); src.start(t, idx * bStep, len * bStep); src.stop(t + d + 0.01);
  }
  const groove = (name, t0, loopBar, vol, len) => { if (!INFO[name]) return; const i0 = (loopBar % (INFO[name].steps / 16)) * 16;
    slice(name, t0, i0, len || 16, R, vol, true); for (let k = 0; k < (len || 16); k += 2) DLOG.break.push([t0 + k * STEP, STEP * 1.6, (i0 + k) % 12]); };
  const roll = (name, t, steps, n, p0, p1, v0, v1) => { for (let k = 0; k < n; k++) { const f = k / Math.max(1, n - 1); slice(name, t + k * steps * STEP / n, INFO[name].snare, steps / n, R * (p0 + (p1 - p0) * f), v0 + (v1 - v0) * f); } };
  const fillBar = (name, t0, b, big) => { groove(name, t0, b, 1, 12); roll(name, t0 + 12 * STEP, 4, big ? 8 : 4, 1, 1.25, 0.55, 0.95); };

  // ---- a little synthesis for weight: sub, kick punch, impacts, risers ----
  function hit(t, f0, f1, d, v, dest) { const o = ctx.createOscillator(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d * 0.7);
    const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(g); g.connect(dest || drumBus); o.start(t); o.stop(t + d + 0.02); }
  function nz(t, d, type, f, q, v, dest, attack) { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); if (attack) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + attack); } else g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + d); s.connect(fl); fl.connect(g); g.connect(dest || drumBus); s.start(t, rand()); s.stop(t + d + 0.02); return fl; }
  const kick = (t, v) => { hit(t, 150, 50, 0.2, 0.7 * v); hit(t, 70, 42, 0.32, 0.45 * v); duck(t, v); DLOG.kick.push([t, STEP, 60]); };
  function duck(t, v) { // the bass, sub and rhythm guitars dip for ~120 ms so every kick lands clean
    for (const [g, depth] of ducks) { const k = 1 - depth * Math.min(1, v); g.gain.setTargetAtTime(k, t, 0.003); g.gain.setTargetAtTime(1, t + 0.03, 0.06); }
  }
    function impact(t, v) { hit(t, 90, 28, 1.0, 0.6 * v, master); }
  function riser() {}  // removed: noise sweeps aren't instruments
  const subBus = ctx.createGain(); subBus.gain.value = 0.5; const subDuck = ctx.createGain(); subBus.connect(subDuck); subDuck.connect(dry); ducks.push([subDuck, 0.45]);
  function sub(t, m, len, v) { const o = ctx.createOscillator(); o.frequency.value = 440 * Math.pow(2, (m - 69) / 12); const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.setValueAtTime(v, t + len - 0.04); g.gain.linearRampToValueAtTime(0.0001, t + len); o.connect(g); g.connect(subBus); o.start(t); o.stop(t + len + 0.05); }

  for (const x of BARS) {
    const { sec, b, t0, ch, tr } = x, at = s => t0 + s * STEP, subN = 30 + ((ch[0] + tr - 30) % 12), last = b === ({ intro: 8, brk: 8, inter: 8, outro: 4 }[sec] || 16) - 1;
    if (sec === 'intro') { // drums come in early (bar 3), filtered open by bar 8
      sub(t0, subN, BAR, 0.12 + 0.025 * b);
      if (b >= 2) { drumLP.frequency.setValueAtTime(300 + b * 150, t0); drumLP.frequency.linearRampToValueAtTime(b === 7 ? 18000 : 450 + b * 150, t0 + BAR); groove('amen_yki', t0, b, 0.55 + b * 0.05); }
      if (b >= 4) kick(t0, 0.8);
      if (b === 7) riser(t0 + BAR, BAR * 2, 0.08);
      continue;
    }
    if (sec === 'outro') { if (b === 0) { impact(t0, 1); groove('amen_yki', t0, 0, 1, 12); roll('amen_yki', at(12), 4, 6, 1, 1.3, 0.6, 1); kick(t0, 1); sub(t0, 31, BAR, 0.32); }
      if (b === 1) { impact(t0, 1.5); kick(t0, 1.2); hit(t0, 70, 24, 3, 0.7, master); sub(t0, 31, BAR * 2.6, 0.45); }
      continue; }
    if (b === 0) impact(t0, sec === 'a3' || sec === 'clx' ? 1.4 : 1);
    else if (b % 8 === 0 && sec !== 'brk' && sec !== 'inter') impact(t0, 0.8);
    if (last && sec !== 'brk') riser(t0 + BAR, BAR, 0.06);
    if (sec === 'brk') { // single hits from Hard Steppin 1, half-time
      [0, 6, 7, 10].forEach(s => { kick(at(s), 1); slice('steppin1', at(s), INFO.steppin1.kick, 1, R, 0.85); });
      slice('steppin1', at(8), INFO.steppin1.snare, 2, R * 0.9, 1.1);
      if (b === 7) roll('steppin1', at(12), 4, 8, 1, 1.35, 0.5, 1);
      sub(t0, 30, STEP * 6, 0.42); sub(at(10), subN, STEP * 5, 0.4);
      continue;
    }
    // the Amen and Bloodfire breaks are thin below 120 Hz next to Hard Steppin: give them the same floor
    if (b === 0) drumLow.gain.setValueAtTime(sec === 'a1' || sec === 'a2' || sec === 'clx' ? 6 : 0, t0);
    const brk = { a1: 'amen_yki', b1: 'steppin2', a2: 'amen_df', clx: 'bloodfire', inter: 'amen_df', a3: 'amen_yki', b3: 'steppin2' }[sec];
    if (sec === 'inter') { // a lighter break; opens up over the last two bars
      if (b < 6) { drumLP.frequency.setValueAtTime(b < 4 ? 2500 : 6000, t0); groove(brk, t0, b, 0.85); }
      else { drumLP.frequency.setValueAtTime(18000, t0); if (b === 7) fillBar(brk, t0, b, true); else groove(brk, t0, b, 1); kick(t0, 1); }
      sub(t0, subN, BAR - 0.02, 0.22);
      continue;
    }
    if (sec === 'a1' && b === 0) drumLP.frequency.setValueAtTime(18000, t0);
    if (b % 8 === 7) fillBar(brk, t0, b, b === 15); else if (b % 4 === 3) fillBar(brk, t0, b, false); else groove(brk, t0, b, 1);
    if (sec === 'a3' || sec === 'b3' || sec === 'clx') { // second layer: Hard Steppin 1 snares on the backbeat
      if (b % 4 !== 3) { slice('steppin1', at(4), INFO.steppin1.snare, 1, R, 0.5); slice('steppin1', at(12), INFO.steppin1.snare, 1, R, 0.5); }
    }
    if (sec === 'clx') STAB.forEach(s => kick(at(s), s ? 0.7 : 1));
    else if (sec === 'a2' || sec === 'a3') for (let s = 0; s < 16; s += 4) kick(at(s), s ? 0.6 : 1);
    else { kick(t0, 1); kick(at(10), 0.6); }
    sub(t0, subN, BAR - 0.02, 0.3);
  }
  const end = totalBars * BAR + 1.5;
  master.gain.setValueAtTime(0.8, end - 2.2); master.gain.linearRampToValueAtTime(0, end);
  const out = await ctx.startRendering();
  const L = out.getChannelData(0), Rc = out.getChannelData(1), n = L.length, buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rc[i]));
  const norm = peak > 0 ? 0.95 / peak : 1;
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, n * 4, true);
  for (let i = 0, o = 44; i < n; i++, o += 4) { v.setInt16(o, Math.max(-1, Math.min(1, L[i] * norm)) * 32767, true); v.setInt16(o + 2, Math.max(-1, Math.min(1, Rc[i] * norm)) * 32767, true); }
  let bin = ''; const u8 = new Uint8Array(buf); for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
  return { wav: btoa(bin), seconds: dur, peak, drums: DLOG };
}
