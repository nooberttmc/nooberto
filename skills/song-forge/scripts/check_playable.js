// song-forge playability check for piano parts (one part per hand): node check_playable.js song.js [part ...]
// Every note must be on an 88-key piano (A0..C8). A human pianist has two hands. Per hand, notes starting within 30 ms are one chord; flags:
//  - more than 5 notes at once, or a chord wider than a 10th (16 semitones: big hands; 14 = a 9th is comfortable)
//  - jumps the hand can't make in the time: between consecutive chords, a move of more than ~2 octaves needs at least
//    ~0.17 s, more than ~3 octaves at least ~0.3 s (a leap measured hand-centre to hand-centre)
//  - more than 5 keys held down in one hand at once (the sustain pedal holds the sound, not the keys)
const fs = require('fs'), path = require('path'); global.window = {};
eval(fs.readFileSync(path.resolve(process.argv[2] || 'song.js'), 'utf8') + ';global.G = guitarEvents;');
const ev = G(), hands = process.argv.slice(3).length ? process.argv.slice(3) : Object.keys(ev.parts).filter(k => /^(rh|lh)$/.test(k));
const bt = ev.bar_times, barOf = t => { let b = 0; while (b + 1 < bt.length && bt[b + 1] <= t + 0.03) b++; return b + 1; };
let problems = 0; const out = [];
for (const h of hands) {
  const notes = ev.parts[h].notes.filter(n => n[2] > 0.035 || true).slice().sort((a, b) => a[0] - b[0]);
  const groups = []; for (const n of notes) { const g = groups[groups.length - 1]; if (g && n[0] - g.t < 0.03) { g.ms.push(n[1]); g.end = Math.max(g.end, n[0] + n[2]); } else groups.push({ t: n[0], ms: [n[1]], end: n[0] + n[2] }); }
  for (const n of notes) if (n[1] < 21 || n[1] > 108) { out.push(`${h} bar ${barOf(n[0])}: MIDI ${n[1]} is off the 88-key keyboard (21..108)`); problems++; }
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i], lo = Math.min(...g.ms), hi = Math.max(...g.ms), c = (lo + hi) / 2;
    if (g.ms.length > 5) { out.push(`${h} bar ${barOf(g.t)}: ${g.ms.length} notes at once`); problems++; }
    if (hi - lo > 16) { out.push(`${h} bar ${barOf(g.t)}: chord spans ${hi - lo} semitones`); problems++; }
    const held = notes.filter(n => n[0] <= g.t + 0.001 && n[0] + n[2] > g.t + 0.02).length;
    if (held > 5) { out.push(`${h} bar ${barOf(g.t)}: ${held} keys held at once`); problems++; }
    if (i > 0) { const p = groups[i - 1], pc = (Math.min(...p.ms) + Math.max(...p.ms)) / 2, dt = g.t - p.t, dist = Math.abs(c - pc);
      if ((dist > 24 && dt < 0.17) || (dist > 36 && dt < 0.3)) { out.push(`${h} bar ${barOf(g.t)}: a ${dist.toFixed(0)}-semitone jump in ${(dt * 1000).toFixed(0)} ms`); problems++; } }
  }
}
console.log(out.length ? out.join('\n') + `\n${problems} problems` : 'playable by two hands');
