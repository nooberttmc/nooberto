// song-forge density check: node density_check.js song.js
// Flags bars where 3+ melodic parts play the same rhythm (stacked unisons blur the mix and eat headroom: give a line to
// one or two instruments, let the others stab, answer or rest) and bars where strings and choir both hold full-bar pads
// within an octave of each other (let them take turns, or put one an octave away).
const fs = require('fs'), path = require('path'); global.window = {};
eval(fs.readFileSync(path.resolve(process.argv[2] || 'song.js'), 'utf8') + ';global.G = guitarEvents;');
const e = G(), bt = e.bar_times, nb = bt.length - 1, bo = t => { let b = 0; while (b + 1 < bt.length && bt[b + 1] <= t + 1e-6) b++; return b; };
const melodic = Object.keys(e.parts).filter(p => !/R$|rhythm|bass|timp|bells|arp|strings|choir|drum/.test(p));
const onsets = {}; for (const p of melodic) { onsets[p] = Array.from({ length: nb }, () => new Set());
  for (const n of e.parts[p].notes) if (n[2] >= 0.08) { const b = bo(n[0]); if (b < nb) onsets[p][b].add(Math.round((n[0] - bt[b]) * 100)); } }
const pads = k => { const m = new Map(); if (!e.parts[k]) return m; for (const n of e.parts[k].notes) { const b = bo(n[0]); if (b < nb && n[2] > 0.9 * (bt[b + 1] - bt[b])) { const a = m.get(b) || []; a.push(n[1]); m.set(b, a); } } return m; };
const sp = pads('strings'), cp = pads('choir'); const out = [];
for (let b = 0; b < nb; b++) {
  const groups = {}; for (const p of melodic) { const s = [...onsets[p][b]].sort((x, y) => x - y); if (s.length >= 2) (groups[s.join(',')] = groups[s.join(',')] || []).push(p); }
  for (const g of Object.values(groups)) if (g.length >= 3) out.push(`bar ${b + 1}: ${g.join(' + ')} in the same rhythm`);
  if (sp.has(b) && cp.has(b)) { const d = Math.abs(Math.min(...sp.get(b)) - Math.min(...cp.get(b))); if (d < 12) out.push(`bar ${b + 1}: strings and choir pads within an octave`); }
}
console.log(out.length ? out.join('\n') : 'no stacked unisons, no overlapping pads');
