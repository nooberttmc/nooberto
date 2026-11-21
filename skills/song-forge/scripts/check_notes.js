// song-forge note checker: node check_notes.js song.js
// Best: guitarEvents() returns `harmony`, one {tones: [chord pitch classes, root first], scale: [allowed pitch classes]} per bar
// (handles key changes and borrowed notes per chord). Older form: song.js defines QUAL (root pc -> intervals), SCALE, and
// guitarEvents() returns `chords` (one root pc per bar).
// Prints: out-of-key notes; E natural (the harmonic-minor leading tone of F minor) anywhere but over the V (edit LEADING/V
// below for other keys); non-chord tones held on strong beats (beat 1 and the 3+3+2 hits) in melody parts; minor 2nds /
// minor 9ths sounding together between any two parts for > 120 ms (unaccented stepwise passing tones are allowed).
const fs = require('fs'), path = require('path'); global.window = {};
const SONG = path.resolve(process.argv[2] || 'song.js');
eval(fs.readFileSync(SONG, 'utf8') + ';global.G = guitarEvents; global.QUAL = typeof QUAL !== "undefined" ? QUAL : {}; global.SCALE_ = typeof SCALE !== "undefined" ? SCALE : null;');
const ev = G(), bt = ev.bar_times, ch = ev.chords || [], HM = ev.harmony, N = 'C Db D Eb E F Gb G Ab A Bb B'.split(' ');
const barOf = t => { let b = 0; while (b + 1 < bt.length && bt[b + 1] <= t + 1e-6) b++; return b; };
// meter: guitarEvents() may export eighths_per_bar (default 8 = 4/4) and strong (the strong 8th slots; default the 3+3+2 hits)
const EPB = ev.eighths_per_bar || 8, STRONG = ev.strong || (EPB === 8 ? [0, 3, 6] : [...Array(EPB).keys()].filter(k => k % 2 === 0));
const slot = t => { const b = barOf(t); return [b, (t - bt[b]) / (bt[b + 1] - bt[b]) * EPB]; };
const SC = SCALE_ || [5, 7, 8, 10, 0, 1, 3, 4], LEADING = 4, V = 0;   // F minor defaults
let problems = 0;
const name = m => N[m % 12] + (Math.floor(m / 12) - 1);
for (const [part, p] of Object.entries(ev.parts)) {
  if (/R$/.test(part)) continue;   // second takes double the L part
  for (const [t, m, len, v, art] of p.notes) {
    if (art === 'mute') continue;
    const [b, s] = slot(t), pc = HM ? HM[b].tones[0] : ch[b], cps = HM ? HM[b].tones : QUAL[pc].map(i => (pc + i) % 12), mp = m % 12, SCb = HM ? HM[b].scale : SC;
    const iv = cps.map(c => (c - pc + 12) % 12), tag = `${part.padEnd(8)} bar ${String(b + 1).padStart(3)} slot ${s.toFixed(1).padStart(4)} ${name(m).padEnd(4)} over ${N[pc]}${iv[1] === 3 ? 'm' : iv.length > 3 ? '7' : ''}`;
    if (!SCb.includes(mp)) { console.log('OUT OF KEY ', tag); problems++; continue; }
    if (!HM && mp === LEADING && pc !== V) { console.log('E NOT ON V ', tag); problems++; }
    const strong = Math.abs(s - Math.round(s)) < 0.05 && STRONG.includes(Math.round(s));
    const longEnough = len > (bt[b + 1] - bt[b]) / EPB * 1.2;
    if (!cps.includes(mp) && strong && longEnough && !/bass|piano|rhythm|timp|arp/.test(part)) { console.log('NON-CHORD  ', tag, `(${(len * 1000) | 0} ms)`); problems++; }
  }
}
// melody vs bass: semitone clashes sounding together
const mel = ev.parts.lead ? ev.parts.lead.notes : [], bass = ev.parts.bass ? ev.parts.bass.notes : [];
for (const [t, m, l] of mel) for (const [tb, mb, lb] of bass) {
  if (tb < t + l - 0.02 && t < tb + lb - 0.02) { const iv = ((m - mb) % 12 + 12) % 12; if (iv === 1) { const [b, s] = slot(t); console.log('CLASH b9  ', `lead ${name(m)} vs bass ${name(mb)} bar ${b + 1} slot ${s.toFixed(1)}`); problems++; } }
}
// every pair of sustained notes in different parts: minor 2nds / minor 9ths sounding together for > 120 ms
{ const keep = Object.keys(ev.parts).filter(k => !/R$/.test(k)), all = [];
  for (const k of keep) for (const [t, m, l, v, art] of ev.parts[k].notes) if (art !== 'mute') all.push([t, t + (k === 'bells' ? Math.min(l, 1.0) : l), m, k]);
  all.sort((x, y) => x[0] - y[0]); const seen = new Set();
  // unaccented passing tones are correct counterpoint: off the beat, approached and left by step in the same direction
  const passing = new Set(); for (const k of keep) { const ns = ev.parts[k].notes.filter(n => n[4] !== 'mute').map(n => [n[0], n[1]]);
    const byT = new Map(); for (const [t, m] of ns) { const key = t.toFixed(3); if (!byT.has(key)) byT.set(key, []); byT.get(key).push(m); }
    const ts = [...byT.keys()].sort((x, y) => x - y), low = key => Math.min(...byT.get(key));
    for (let i = 1; i + 1 < ts.length; i++) { const p = low(ts[i - 1]), m = low(ts[i]), n = low(ts[i + 1]), [, sl] = slot(+ts[i]);
      if (Math.round(sl) % 2 === 1 || Math.round(sl) === 2) { const d1 = m - p, d2 = n - m; if (Math.abs(d1) <= 2 && Math.abs(d2) <= 2 && d1 * d2 > 0) byT.get(ts[i]).forEach(mm => passing.add(k + ts[i] + ':' + (mm % 12))); } } }
  const isPassing = (k, t, m) => passing.has(k + t.toFixed(3) + ':' + (m % 12));
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length && all[j][0] < all[i][1]; j++) {
    const [a0, a1, am, ak] = all[i], [b0, b1, bm, bk] = all[j]; if (ak === bk && !(ev.parts[ak].sf === 'piano')) continue;   // within one piano part too (a hand can clash with itself)
    const ov = Math.min(a1, b1) - Math.max(a0, b0); if (ov < 0.12) continue;
    const lo = Math.min(am, bm), hi = Math.max(am, bm); if ((hi - lo) % 12 !== 1) continue; if (isPassing(ak, a0, am) || isPassing(bk, b0, bm)) continue;
    const [b] = slot(b0), key = `${b} ${ak}/${bk} ${name(am)}/${name(bm)}`; if (seen.has(key)) continue; seen.add(key);
    console.log('CLASH      ', `bar ${b + 1}: ${ak} ${name(am)} vs ${bk} ${name(bm)} (${(ov * 1000) | 0} ms)`); problems++; } }
console.log(problems ? problems + ' problems' : 'all notes OK');
