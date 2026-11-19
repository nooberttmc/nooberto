'use strict';
// ================= EMBERWAKE =================
const cvs = document.getElementById('c');
let g = cvs.getContext('2d', { alpha: false });
// pixel budget per graphics quality: Performance / Balanced / High
const PIXEL_BUDGET = [560000, 900000, 2000000];
let autoBudget = Infinity; // lowered automatically when the device struggles
let W = 0, H = 0, DPR = 1, S = 1, VW = 400, VH = 720;
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  DPR = Math.min(window.devicePixelRatio || 1, 2.5);
  const q = (typeof save !== 'undefined' && save.settings.quality != null) ? save.settings.quality : 1;
  const budget = Math.min(PIXEL_BUDGET[q], autoBudget);
  if (W * H * DPR * DPR > budget) DPR = Math.sqrt(budget / (W * H));
  if (typeof spriteCache !== 'undefined') spriteCache.clear();
  cvs.width = Math.floor(W * DPR); cvs.height = Math.floor(H * DPR);
  cvs.style.width = W + 'px'; cvs.style.height = H + 'px';
  S = W / 400; if (H / S < 660) S = H / 660;
  VW = W / S; VH = H / S;
}
window.addEventListener('resize', resize);

// ---------- helpers ----------
const rand = (a, b) => b === undefined ? Math.random() * (a === undefined ? 1 : a) : a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function mixHex(hex, t, to) { // blend toward white (or 'to')
  const n = parseInt(hex.slice(1), 16), m = to ? parseInt(to.slice(1), 16) : 0xffffff;
  const r = lerp((n >> 16) & 255, (m >> 16) & 255, t) | 0, gg = lerp((n >> 8) & 255, (m >> 8) & 255, t) | 0, b = lerp(n & 255, m & 255, t) | 0;
  return '#' + ((1 << 24) | (r << 16) | (gg << 8) | b).toString(16).slice(1);
}
const fmt = n => Math.floor(n).toLocaleString('en-US');

// ---------- save ----------
const SAVE_KEY = 'emberwake_save_v1';
function defaultSave() {
  return { embers: 0, lifetimeEmbers: 0, hearth: {}, unlocked: { ember: true }, best: {}, depthCleared: 0,
    stats: { kills: 0, bosses: 0, runs: 0, bestWave: 0, bestLevel: 0, playTime: 0 },
    settings: { music: 0.6, sfx: 0.8, shake: true, numbers: true, quality: 1 }, selSpirit: 'ember', selDepth: 0, seenTutorial: false, askedPin: false };
}
function loadSave() {
  const d = defaultSave();
  try {
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { }
    if (!raw && window.Android && window.Android.load) raw = window.Android.load() || null;
    if (raw) {
      const s = JSON.parse(raw);
      for (const k in s) {
        if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) d[k] = Object.assign(d[k], s[k]);
        else d[k] = s[k];
      }
    }
  } catch (e) { }
  return d;
}
let save = loadSave();
function persist() {
  const json = JSON.stringify(save);
  try { localStorage.setItem(SAVE_KEY, json); } catch (e) { }
  try { if (window.Android && window.Android.save) window.Android.save(json); } catch (e) { }
}
SFX.setVolumes(save.settings.music, save.settings.sfx);

// ---------- sprite caches ----------
const glowCache = {}, bulletCache = {}, spriteCache = new Map();
// Pre-render an enemy's body (decoration + shape + eye) once; drawn later with a single rotated drawImage.
function enemySprite(e, variant) {
  const style = e.type === 'gleamer' ? 'plain' : R.depth.style, r = Math.max(4, Math.round(e.r));
  const key = e.type + '|' + e.color + '|' + style + '|' + (e.elite ? 1 : 0) + '|' + variant + '|' + r;
  let c = spriteCache.get(key);
  if (!c) {
    if (spriteCache.size > 500) spriteCache.clear();
    const sc = DPR * S, sz = Math.ceil(r * 2 * 2.1 * sc) + 4;
    c = document.createElement('canvas'); c.width = c.height = sz;
    const prev = g; g = c.getContext('2d');
    g.translate(sz / 2, sz / 2); g.scale(sc, sc);
    drawDeco(style, r, e.color, 0.7, false);
    SHAPES[e.d.shape](r);
    g.fillStyle = variant === 1 ? '#ffffff' : variant === 2 ? '#20406a' : style === 'void' ? '#060008' : e.type === 'gleamer' ? '#ffe9a0' : mixHex(e.color, 0.82, '#0a0a18');
    g.fill();
    g.lineWidth = e.elite ? 3 : 2; g.strokeStyle = variant === 1 ? '#fff' : variant === 2 ? '#9fe8ff' : e.color; g.stroke();
    if (e.elite) { g.beginPath(); g.arc(0, 0, r + 6, 0, TAU); g.strokeStyle = 'rgba(255,208,64,0.75)'; g.lineWidth = 2; g.stroke(); }
    g.fillStyle = e.color; g.beginPath(); g.arc(e.d.shape === 1 || e.d.shape === 5 ? r * 0.2 : r * 0.25, 0, r * 0.22, 0, TAU); g.fill();
    g = prev;
    c.wsz = sz / sc; spriteCache.set(key, c);
  }
  return c;
}
const GEM_COLORS = [['#4aa8ff', '#c8e4ff'], ['#a070ff', '#dcc8ff'], ['#ff70e0', '#ffd0f4']];
function gemSprite(tier) {
  const key = 'gem' + tier; let c = spriteCache.get(key);
  if (!c) {
    const sc = DPR * S, wr = 10 + tier * 4, sz = Math.ceil(wr * 2 * sc) + 2;
    c = document.createElement('canvas'); c.width = c.height = sz;
    const x = c.getContext('2d'); x.translate(sz / 2, sz / 2); x.scale(sc, sc);
    const gr = x.createRadialGradient(0, 0, 0, 0, 0, wr); gr.addColorStop(0, hexA(GEM_COLORS[tier][0], 0.6)); gr.addColorStop(1, hexA(GEM_COLORS[tier][0], 0));
    x.fillStyle = gr; x.fillRect(-wr, -wr, wr * 2, wr * 2);
    const q = 3 + tier * 1.6; x.fillStyle = GEM_COLORS[tier][1];
    x.beginPath(); x.moveTo(0, -q * 1.3); x.lineTo(q, 0); x.lineTo(0, q * 1.3); x.lineTo(-q, 0); x.closePath(); x.fill();
    c.wsz = wr * 2; spriteCache.set(key, c);
  }
  return c;
}
resize();
function bulletImg(color, r) {
  const key = color + (r | 0);
  let c = bulletCache[key];
  if (!c) {
    const S2 = Math.ceil(r * 2.3) * 2; c = document.createElement('canvas'); c.width = c.height = S2 * 2;
    const x = c.getContext('2d'); x.scale(2, 2); const m = S2 / 2;
    const gr = x.createRadialGradient(m, m, 0, m, m, m);
    gr.addColorStop(0, hexA(color, 0.9)); gr.addColorStop(0.45, hexA(color, 0.35)); gr.addColorStop(1, hexA(color, 0));
    x.fillStyle = gr; x.fillRect(0, 0, S2, S2);
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(m, m, r * 0.62, 0, TAU); x.fill();
    x.strokeStyle = '#ff2848'; x.lineWidth = 2; x.beginPath(); x.arc(m, m, r * 0.95, 0, TAU); x.stroke();
    c.half = m; bulletCache[key] = c;
  }
  return c;
}
function glowImg(color) {
  let c = glowCache[color];
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, hexA(color, 1)); gr.addColorStop(0.2, hexA(color, 0.55)); gr.addColorStop(0.5, hexA(color, 0.15)); gr.addColorStop(1, hexA(color, 0));
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    glowCache[color] = c;
  }
  return c;
}
function glow(x, y, r, color, a) {
  g.globalAlpha = a == null ? 1 : a;
  g.drawImage(glowImg(color), x - r, y - r, r * 2, r * 2);
  g.globalAlpha = 1;
}
// background star/mote tiles
function makeTile(n, minA, maxA, size) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  for (let i = 0; i < n; i++) {
    const px = Math.random() * 512, py = Math.random() * 512, r = rand(0.5, size);
    x.fillStyle = `rgba(180,210,255,${rand(minA, maxA)})`;
    x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
  }
  return c;
}
const tileFar = makeTile(140, 0.08, 0.3, 1.3), tileNear = makeTile(45, 0.12, 0.35, 2.2);
let vignette = null, vigW = 0, vigH = 0;
function getVignette() {
  if (!vignette || vigW !== cvs.width || vigH !== cvs.height) {
    vignette = document.createElement('canvas'); vignette.width = vigW = cvs.width; vignette.height = vigH = cvs.height;
    const x = vignette.getContext('2d');
    const gr = x.createRadialGradient(vigW / 2, vigH / 2, Math.min(vigW, vigH) * 0.3, vigW / 2, vigH / 2, Math.max(vigW, vigH) * 0.75);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.7)');
    x.fillStyle = gr; x.fillRect(0, 0, vigW, vigH);
  }
  return vignette;
}

// ---------- drawing helpers ----------
function rr(x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function text(str, x, y, size, color, align, weight, font) {
  g.font = `${weight || 'bold'} ${size}px ${font || 'sans-serif'}`;
  g.fillStyle = color || '#fff'; g.textAlign = align || 'center'; g.textBaseline = 'middle';
  g.fillText(str, x, y);
}
function wrap(str, x, y, maxW, size, color, lh, align, weight) {
  g.font = `${weight || 'normal'} ${size}px sans-serif`;
  const words = String(str).split(' '); let line = '', yy = y; const lines = [];
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  g.fillStyle = color || '#ccd'; g.textAlign = align || 'center'; g.textBaseline = 'middle';
  for (const l of lines) { g.fillText(l, x, yy); yy += lh || size * 1.3; }
  return lines.length;
}
function panel(x, y, w, h, accent, alpha) {
  rr(x, y, w, h, 12);
  const gr = g.createLinearGradient(x, y, x, y + h);
  gr.addColorStop(0, `rgba(30,36,64,${alpha || 0.92})`); gr.addColorStop(1, `rgba(12,14,30,${alpha || 0.92})`);
  g.fillStyle = gr; g.fill();
  g.lineWidth = 1.5; g.strokeStyle = accent ? hexA(accent, 0.7) : 'rgba(140,160,255,0.25)'; g.stroke();
}

// each legendary relic has its own emblem
function drawLegend(id, k) {
  const fillA = (a) => { g.globalAlpha = a; g.fill(); g.globalAlpha = 1; };
  switch (id) {
    case 'sigil': // crossed blades with a plus: an extra weapon slot
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(-k * 0.75 * sd, k * 0.75); g.lineTo(k * 0.7 * sd, -k * 0.7); g.stroke(); g.beginPath(); g.moveTo(-k * 0.55 * sd - k * 0.2, k * 0.35); g.lineTo(-k * 0.35 * sd + k * 0.2 * sd, k * 0.55); g.stroke(); }
      g.beginPath(); g.arc(0, -k * 0.05, k * 0.2, 0, TAU); g.fill(); break;
    case 'twin': // two intertwined flames
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(k * 0.3 * sd, -k * 0.9); g.quadraticCurveTo(k * 0.85 * sd, k * 0.1, k * 0.25 * sd, k * 0.75); g.quadraticCurveTo(-k * 0.3 * sd, k * 0.2, k * 0.3 * sd, -k * 0.9); fillA(sd < 0 ? 0.9 : 0.45); g.stroke(); }
      break;
    case 'sun': // radiant sun disc
      g.beginPath(); g.arc(0, 0, k * 0.42, 0, TAU); g.fill();
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12, q = i % 2 ? 0.8 : 0.98; g.beginPath(); g.moveTo(Math.cos(a) * k * 0.55, Math.sin(a) * k * 0.55); g.lineTo(Math.cos(a) * k * q, Math.sin(a) * k * q); g.stroke(); }
      break;
    case 'eternal': // a flame wrapped in an infinity loop
      g.beginPath(); g.moveTo(0, -k * 0.95); g.quadraticCurveTo(k * 0.45, -k * 0.35, 0, k * 0.05); g.quadraticCurveTo(-k * 0.45, -k * 0.35, 0, -k * 0.95); g.fill();
      g.beginPath(); g.ellipse(-k * 0.4, k * 0.45, k * 0.4, k * 0.25, 0, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(k * 0.4, k * 0.45, k * 0.4, k * 0.25, 0, 0, TAU); g.stroke(); break;
    case 'dragon': // scaled heart with horns
      g.beginPath(); g.moveTo(0, k * 0.8); g.bezierCurveTo(-k * 1.2, 0, -k * 0.6, -k * 0.8, 0, -k * 0.3); g.bezierCurveTo(k * 0.6, -k * 0.8, k * 1.2, 0, 0, k * 0.8); fillA(0.85); g.stroke();
      g.beginPath(); g.moveTo(-k * 0.45, -k * 0.55); g.lineTo(-k * 0.75, -k * 1.0); g.moveTo(k * 0.45, -k * 0.55); g.lineTo(k * 0.75, -k * 1.0); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(-k * 0.2, k * 0.05, k * 0.18, 0, Math.PI); g.arc(k * 0.2, k * 0.05, k * 0.18, 0, Math.PI); g.stroke(); break;
    case 'aeon': // hourglass inside a ring
      g.beginPath(); g.arc(0, 0, k * 0.95, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(-k * 0.45, -k * 0.6); g.lineTo(k * 0.45, -k * 0.6); g.lineTo(-k * 0.45, k * 0.6); g.lineTo(k * 0.45, k * 0.6); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(-k * 0.25, k * 0.6); g.lineTo(0, k * 0.2); g.lineTo(k * 0.25, k * 0.6); g.closePath(); g.fill(); break;
    case 'oracle': // all-seeing eye
      g.beginPath(); g.moveTo(-k, 0); g.quadraticCurveTo(0, -k * 0.95, k, 0); g.quadraticCurveTo(0, k * 0.95, -k, 0); fillA(0.3); g.stroke();
      g.beginPath(); g.arc(0, 0, k * 0.32, 0, TAU); g.fill(); g.fillStyle = '#10121e'; g.beginPath(); g.arc(0, 0, k * 0.13, 0, TAU); g.fill(); break;
    case 'halo': // winged halo
      g.beginPath(); g.ellipse(0, -k * 0.45, k * 0.55, k * 0.2, 0, 0, TAU); g.stroke();
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(k * 0.15 * sd, k * 0.1); g.quadraticCurveTo(k * 1.0 * sd, -k * 0.2, k * 0.95 * sd, k * 0.6); g.quadraticCurveTo(k * 0.55 * sd, k * 0.35, k * 0.15 * sd, k * 0.55); g.closePath(); fillA(0.7); }
      g.beginPath(); g.arc(0, k * 0.3, k * 0.17, 0, TAU); g.fill(); break;
  }
}
// icons
function drawIcon(kind, id, x, y, s, color) {
  g.save(); g.translate(x, y);
  g.globalCompositeOperation = 'lighter'; glow(0, 0, s * 1.4, color, 0.35); g.globalCompositeOperation = 'source-over';
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = Math.max(1.5, s * 0.14); g.lineCap = 'round'; g.lineJoin = 'round';
  const k = s * 0.5;
  if (kind === 'weapon') {
    switch (id) {
      case 'bolt': g.beginPath(); g.moveTo(-k, k * 0.6); g.lineTo(k * 0.2, -k * 0.2); g.lineTo(-k * 0.1, -k * 0.3); g.lineTo(k, -k * 0.9); g.stroke();
        g.beginPath(); g.arc(k * 0.9, -k * 0.85, k * 0.28, 0, TAU); g.fill(); break;
      case 'fan': for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(-k * 0.8, k * 0.8); g.lineTo(-k * 0.8 + Math.cos(-0.78 + i * 0.4) * k * 1.9, k * 0.8 + Math.sin(-0.78 + i * 0.4) * k * 1.9); g.stroke(); } break;
      case 'arc': g.beginPath(); g.moveTo(-k, -k); g.lineTo(-k * 0.2, -k * 0.1); g.lineTo(-k * 0.5, k * 0.1); g.lineTo(k * 0.4, k); g.lineTo(k * 0.1, k * 0.2); g.lineTo(k, 0); g.stroke(); break;
      case 'orbit': g.beginPath(); g.arc(0, 0, k * 0.85, 0, TAU); g.globalAlpha = 0.5; g.stroke(); g.globalAlpha = 1;
        for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(Math.cos(i * 2.09) * k * 0.85, Math.sin(i * 2.09) * k * 0.85, k * 0.25, 0, TAU); g.fill(); } break;
      case 'nova': g.beginPath(); g.arc(0, 0, k * 0.3, 0, TAU); g.fill(); g.beginPath(); g.arc(0, 0, k * 0.65, 0, TAU); g.stroke(); g.globalAlpha = 0.5; g.beginPath(); g.arc(0, 0, k, 0, TAU); g.stroke(); g.globalAlpha = 1; break;
      case 'seeker': g.beginPath(); g.moveTo(k, -k); g.lineTo(-k * 0.2, -k * 0.5); g.lineTo(k * 0.5, k * 0.2); g.closePath(); g.fill(); g.beginPath(); g.moveTo(k * 0.1, -k * 0.1); g.quadraticCurveTo(-k, 0, -k * 0.8, k); g.stroke(); break;
      case 'mine': g.beginPath(); g.arc(0, 0, k * 0.5, 0, TAU); g.fill(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; g.beginPath(); g.moveTo(Math.cos(a) * k * 0.6, Math.sin(a) * k * 0.6); g.lineTo(Math.cos(a) * k, Math.sin(a) * k); g.stroke(); } break;
      case 'lance': g.beginPath(); g.moveTo(-k, k); g.lineTo(k, -k); g.stroke(); g.beginPath(); g.moveTo(k, -k); g.lineTo(k * 0.3, -k * 0.75); g.lineTo(k * 0.75, -k * 0.3); g.closePath(); g.fill(); break;
      case 'crescent': g.beginPath(); g.arc(0, 0, k * 0.9, 0.6, TAU - 0.6); g.arc(k * 0.35, 0, k * 0.65, TAU - 0.9, 0.9, true); g.fill(); break;
      case 'aura': g.beginPath(); g.arc(0, 0, k * 0.3, 0, TAU); g.fill(); g.globalAlpha = 0.5; g.beginPath(); g.arc(0, 0, k * 0.85, 0, TAU); g.fill(); g.globalAlpha = 1; break;
      case 'meteor': g.beginPath(); g.arc(k * 0.35, k * 0.35, k * 0.4, 0, TAU); g.fill(); g.beginPath(); g.moveTo(k * 0.1, k * 0.1); g.lineTo(-k, -k); g.moveTo(k * 0.5, 0); g.lineTo(-k * 0.3, -k); g.moveTo(0, k * 0.5); g.lineTo(-k, -k * 0.3); g.stroke(); break;
      case 'ricochet': g.beginPath(); g.moveTo(-k, k * 0.6); g.lineTo(-k * 0.2, -k * 0.6); g.lineTo(k * 0.4, k * 0.4); g.lineTo(k, -k * 0.5); g.stroke(); g.beginPath(); g.arc(k, -k * 0.5, k * 0.22, 0, TAU); g.fill(); break;
    }
  } else if (kind === 'ability') {
    g.beginPath(); g.arc(0, 0, k * 0.95, 0, TAU); g.globalAlpha = 0.2; g.fill(); g.globalAlpha = 1; g.stroke();
    switch (id) {
      case 'purge': for (let i = 0; i < 8; i++) { const a = i * TAU / 8; g.beginPath(); g.moveTo(Math.cos(a) * k * 0.2, Math.sin(a) * k * 0.2); g.lineTo(Math.cos(a) * k * 0.65, Math.sin(a) * k * 0.65); g.stroke(); } break;
      case 'dash': for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(-k * 0.45 + i * k * 0.4, -k * 0.4); g.lineTo(-k * 0.05 + i * k * 0.4, 0); g.lineTo(-k * 0.45 + i * k * 0.4, k * 0.4); g.stroke(); } break;
      case 'warp': g.beginPath(); g.moveTo(-k * 0.4, -k * 0.5); g.lineTo(k * 0.4, -k * 0.5); g.lineTo(-k * 0.4, k * 0.5); g.lineTo(k * 0.4, k * 0.5); g.closePath(); g.stroke(); break;
      case 'aegis': g.beginPath(); g.moveTo(0, -k * 0.6); g.lineTo(k * 0.5, -k * 0.35); g.lineTo(k * 0.4, k * 0.25); g.lineTo(0, k * 0.6); g.lineTo(-k * 0.4, k * 0.25); g.lineTo(-k * 0.5, -k * 0.35); g.closePath(); g.fill(); break;
      case 'inferno': g.beginPath(); g.moveTo(0, -k * 0.6); g.quadraticCurveTo(k * 0.5, 0, 0, k * 0.55); g.quadraticCurveTo(-k * 0.5, 0, 0, -k * 0.6); g.fill(); break;
      case 'hole': for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, 0, k * (0.2 + i * 0.18), i, i + 3.6); g.stroke(); } break;
      case 'starfall': g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * TAU / 10, q = i % 2 ? k * 0.25 : k * 0.6; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fill(); break;
    }
  } else if (kind === 'heal') {
    g.beginPath(); g.moveTo(0, k * 0.8); g.bezierCurveTo(-k * 1.3, -k * 0.1, -k * 0.6, -k * 1.1, 0, -k * 0.4); g.bezierCurveTo(k * 0.6, -k * 1.1, k * 1.3, -k * 0.1, 0, k * 0.8); g.fill();
  } else if (kind === 'cache') {
    g.beginPath(); g.moveTo(0, -k); g.lineTo(k * 0.7, 0); g.lineTo(0, k); g.lineTo(-k * 0.7, 0); g.closePath(); g.fill();
  } else if (kind === 'relic') {
    if (LEGENDS[id]) { g.save(); g.rotate(menuT * 0.8); g.globalAlpha = 0.6; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; g.moveTo(Math.cos(a) * k * 1.05, Math.sin(a) * k * 1.05); g.lineTo(Math.cos(a) * k * 1.35, Math.sin(a) * k * 1.35); } g.stroke(); g.restore(); }
    if (LEGENDS[id]) drawLegend(id, k);
    else {
      g.beginPath(); g.moveTo(0, -k); g.lineTo(k * 0.8, -k * 0.2); g.lineTo(0, k); g.lineTo(-k * 0.8, -k * 0.2); g.closePath(); g.globalAlpha = 0.35; g.fill(); g.globalAlpha = 1; g.stroke();
      g.beginPath(); g.moveTo(-k * 0.8, -k * 0.2); g.lineTo(k * 0.8, -k * 0.2); g.stroke();
    }
  } else {
    g.beginPath(); g.arc(0, 0, k * 0.85, 0, TAU); g.globalAlpha = 0.25; g.fill(); g.globalAlpha = 1; g.stroke();
    text(PASSIVES[id] ? PASSIVES[id].name.slice(0, PASSIVES[id].name === 'Focus' ? 2 : 1) : '?', 0, 1, s * 0.6 * (id === 'focus' ? 0.8 : 1), color);
  }
  g.restore();
}

// ---------- input & UI buttons ----------
let buttons = [];
const ptr = { down: false, id: null, x: 0, y: 0, sx: 0, sy: 0, btn: null };
const joy = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0 };
const keys = {};
function stopJoy() { joy.active = false; joy.id = null; joy.dx = 0; joy.dy = 0; }
function toV(e) { return { x: e.clientX / S, y: e.clientY / S }; }
function button(x, y, w, h, label, onClick, o) {
  o = o || {};
  const b = { x, y, w, h, onClick, disabled: o.disabled };
  buttons.push(b);
  const pressed = ptr.down && ptr.btn && ptr.btn.x === x && ptr.btn.y === y && hitB(b, ptr.x, ptr.y);
  if (o.invisible) return b;
  const col = o.color || '#ff9a40';
  rr(x, y, w, h, o.radius == null ? 12 : o.radius);
  const gr = g.createLinearGradient(x, y, x, y + h);
  if (o.disabled) { gr.addColorStop(0, 'rgba(50,52,70,0.9)'); gr.addColorStop(1, 'rgba(30,32,46,0.9)'); }
  else { gr.addColorStop(0, hexA(mixHex(col, 0.15), pressed ? 0.55 : 0.32)); gr.addColorStop(1, hexA(col, pressed ? 0.35 : 0.14)); }
  g.fillStyle = gr; g.fill();
  g.lineWidth = 2; g.strokeStyle = o.disabled ? 'rgba(120,120,150,0.4)' : hexA(col, pressed ? 1 : 0.8); g.stroke();
  if (label) text(label, x + w / 2, y + h / 2 + (o.sub ? -7 : 1), o.size || 18, o.disabled ? '#778' : (o.textColor || '#fff'));
  if (o.sub) text(o.sub, x + w / 2, y + h / 2 + 12, 12, o.disabled ? '#667' : hexA(col, 1), 'center', 'normal');
  return b;
}
function hitB(b, x, y) { return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }
function findBtn(x, y) { for (let i = buttons.length - 1; i >= 0; i--) if (hitB(buttons[i], x, y)) return buttons[i]; return null; }

cvs.addEventListener('pointerdown', e => {
  e.preventDefault();
  SFX.init(); SFX.music(currentMusic());
  const p = toV(e);
  const b = findBtn(p.x, p.y);
  if (b && !ptr.down) { ptr.down = true; ptr.id = e.pointerId; ptr.x = p.x; ptr.y = p.y; ptr.sx = p.x; ptr.sy = p.y; ptr.btn = b; return; }
  if (scene === 'run' && !R.overlay && !joy.active) {
    joy.active = true; joy.id = e.pointerId; joy.ox = p.x; joy.oy = p.y; joy.x = p.x; joy.y = p.y; joy.dx = 0; joy.dy = 0;
  } else if (!ptr.down) { ptr.down = true; ptr.id = e.pointerId; ptr.x = p.x; ptr.y = p.y; ptr.sx = p.x; ptr.sy = p.y; ptr.btn = null; }
  try { cvs.setPointerCapture(e.pointerId); } catch (er) { }
}, { passive: false });
cvs.addEventListener('pointermove', e => {
  const p = toV(e);
  if (joy.active && e.pointerId === joy.id) {
    let dx = p.x - joy.ox, dy = p.y - joy.oy; const d = Math.hypot(dx, dy), max = 46;
    if (d > max) { dx *= max / d; dy *= max / d; } // the base stays where the thumb first landed
    joy.x = p.x; joy.y = p.y; joy.dx = dx / max; joy.dy = dy / max;
  }
  if (ptr.down && e.pointerId === ptr.id) { ptr.x = p.x; ptr.y = p.y; }
});
function endPtr(e, cancel) {
  if (joy.active && e.pointerId === joy.id) { stopJoy(); }
  if (ptr.down && e.pointerId === ptr.id) {
    ptr.down = false;
    const p = toV(e);
    if (!cancel && ptr.btn && hitB(ptr.btn, p.x, p.y) && !ptr.btn.disabled) {
      const b = ptr.btn; ptr.btn = null; b.onClick && b.onClick();
    } else if (!cancel && ptr.btn && ptr.btn.disabled) { SFX.play('deny'); }
    else if (!cancel && !ptr.btn) { onTap(p.x, p.y, ptr.sx, ptr.sy); }
    ptr.btn = null;
  }
}
cvs.addEventListener('pointerup', e => endPtr(e, false));
cvs.addEventListener('pointercancel', e => endPtr(e, true));
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if (scene === 'run' && R && (e.key === 'q' || e.key === 'e')) useAbility(e.key === 'q' ? 0 : 1); if (e.key === 'Escape') handleBack(); SFX.init(); });
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
function onTap(x, y, sx, sy) {
  // swipe on embark screen to change spirit
  if (scene === 'embark' && Math.abs(x - sx) > 50 && Math.abs(y - sy) < 80 && sy < VH * 0.55) cycleSpirit(x < sx ? 1 : -1);
}

// ---------- scenes ----------
let scene = 'title', menuT = 0, toast = null, confirmReset = 0;
const motes = [];
for (let i = 0; i < 60; i++) motes.push({ x: rand(400), y: rand(900), v: rand(8, 30), s: rand(1, 3.2), p: rand(TAU) });
function currentMusic() {
  if (scene !== 'run' || !R) return 'menu';
  if (R.overlay === 'over') return 'over';
  return 'd' + R.di + (R.boss ? 'b' : '');
}
function go(s) { scene = s; SFX.play('click'); SFX.music(currentMusic()); }
function showToast(t, color) { toast = { t: 3.8, text: t, color: color || '#ffd080' }; }

// ================= RUN =================
let R = null;
const st = {}; // computed stats
const xpFor = L => Math.floor(6 + 4.2 * L + 0.3 * L * L + 0.006 * L * L * L); // gets steeper at high levels
function hR(id) { return save.hearth[id] || 0; }
function hasRelic(k) { return R.relics.indexOf(k) >= 0; }

function newRun() {
  const spirit = SPIRITS.find(s => s.id === save.selSpirit) || SPIRITS[0];
  const di = save.selDepth;
  R = {
    spirit, di, depth: DEPTHS[di], t: 0, wave: 0, waveT: 0, inter: 1.5, toSpawn: 0, spawnDur: 1, spawnAcc: 0, boss: null, waveActive: false,
    p: { x: 0, y: 0, vx: 0, vy: 0, hp: 1, r: 11, inv: 0, level: 1, xp: 0, xpNext: xpFor(1), fx: 1, fy: 0, trail: 0 },
    cam: { x: 0, y: 0 }, weapons: [], passives: {}, relics: [], enemies: [], shots: [], ebul: [], gems: [], items: [], parts: [], texts: [], fx: [], mines: [],
    kills: 0, embersFound: 0, bossKills: 0, rerolls: hR('reroll'), windUsed: false, phoenixUsed: false, pending: 0, overlay: null, choices: [], relicChoices: [],
    shake: 0, hitstop: 0, slow: 1, dead: false, deathT: 0, orbitA: 0, leech: 0, hurtFlash: 0, banner: null, endless: false, victory: false,
    eid: 1, result: null, tutorial: !save.seenTutorial ? 13 : 0, combo: 0, comboT: 0, bestCombo: 0, cleared: 0,
    abilities: [], banished: new Set(), banishes: hR('banish'), banishMode: false, buffs: {}, shrines: [], shrineT: 30, bounty: null, bountyT: 40,
    gleamT: rand(45, 75), hazards: [], holes: [], warp: 0, aegis: 0, inferno: 0, infernoTick: 0, dashT: 0, wardT: 0, ward: false, eternalUsed: 0,
    bountiesDone: 0, trial: null,
  };
  addWeapon(spirit.weapon);
  if (spirit.relic) R.relics.push(pick(RELIC_IDS.filter(k => k !== 'coin')));
  if (spirit.legendary) R.relics.push(pick(LEGEND_IDS));
  if (spirit.ability) R.abilities.push({ id: spirit.ability, lvl: 1, cd: 0 });
  R.pending += hR('start');
  // announce the Depth's twist
  if (R.depth.twists.length) { const tw = TWISTS[R.depth.twists[0]]; R.banner = { text: R.depth.twists.map(k => TWISTS[k][0]).join(' + '), sub: tw[1], t: 3, color: tw[2] }; }
  recalc(); R.p.hp = st.maxHp;
  save.stats.runs++; persist();
  stopJoy();
  scene = 'run';
  SFX.music('d' + R.di); SFX.setIntensity(1);
}
function recalc() {
  const P = k => R.passives[k] || 0, has = hasRelic, sp = R.spirit, B = R.buffs, forge = save.forge || 0;
  const oldMax = st.maxHp || 0;
  st.maxHp = Math.round((sp.hp + 10 * hR('vit') + 20 * P('vigor') + (has('titan') ? 60 : 0) + (has('dragon') ? 100 : 0)) * (has('glass') ? 0.75 : 1) * (1 + 0.05 * hR('heart')) * (1 + 0.02 * forge));
  st.speed = 120 * sp.speed * (1 + 0.03 * hR('haste') + 0.08 * P('swift') + (has('quick') ? 0.15 : 0) - (has('titan') ? 0.06 : 0)) * (B.swift > 0 ? 1.35 : 1);
  st.dmg = sp.dmg * (1 + 0.04 * hR('might') + 0.10 * P('fury') + (has('glass') ? 0.4 : 0) + (has('prism') ? 0.1 : 0) + (has('sun') ? 0.5 : 0) + 0.02 * forge) * (B.power > 0 ? 1.5 : 1);
  st.cdm = (1 - 0.03 * hR('cel')) * (1 - 0.07 * P('alacrity')) * (has('hourglass') ? 0.85 : 1) * (has('quick') ? 0.92 : 1) * (has('aeon') ? 0.7 : 1) * (B.power > 0 ? 0.8 : 1);
  st.abilCd = (1 - 0.06 * hR('abil')) * (1 - 0.10 * P('focus')) * (has('battery') ? 0.8 : 1) * (has('aeon') ? 0.7 : 1) * (sp.abil || 1);
  st.pickup = 55 * (1 + 0.12 * hR('mag') + 0.30 * P('reach')) * (has('lode') ? 2 : 1) * (B.swift > 0 ? 2.5 : 1);
  st.regen = 0.2 * hR('regen') + 0.5 * P('mending') + (has('dragon') ? 3 : 0);
  st.crit = 0.05 + 0.07 * P('precision') + 0.03 * hR('crit') + (has('lantern') ? 0.1 : 0);
  st.critMult = has('lantern') ? 3 : 2;
  st.taken = (1 - 0.03 * hR('arm')) * (1 - 0.06 * P('bulwark')) * (1 - (sp.armor || 0));
  st.extra = P('multi') + (has('crown') ? 1 : 0) + (has('halo') ? 2 : 0);
  st.area = (1 + 0.12 * P('expanse')) * (has('prism') ? 1.25 : 1) * (has('sun') ? 1.2 : 1);
  st.maxW = 4 + (has('sigil') ? 1 : 0);
  st.maxA = 2 + (has('twin') ? 1 : 0);
  st.choices = 3 + hR('choice') + (has('oracle') ? 1 : 0);
  st.xp = (sp.xp || 1) * (1 + 0.05 * hR('wis') + 0.12 * P('wisdom')) * (has('lode') ? 1.15 : 1);
  if (oldMax && st.maxHp > oldMax) R.p.hp += st.maxHp - oldMax;
  R.p.hp = Math.min(R.p.hp, st.maxHp);
}
function addWeapon(id) { R.weapons.push({ id, lvl: 1, cd: 0.5, t: 0 }); }
function weaponLvl(id) { const w = R.weapons.find(w => w.id === id); return w ? w.lvl : 0; }

// ---------- spatial grid ----------
const CELL = 56; let grid = new Map();
function buildGrid() {
  grid = new Map();
  for (const e of R.enemies) {
    if (e.dead) continue;
    const k = Math.floor(e.x / CELL) * 100000 + Math.floor(e.y / CELL);
    let a = grid.get(k); if (!a) { a = []; grid.set(k, a); } a.push(e);
  }
}
function query(x, y, r, cb) {
  const x0 = Math.floor((x - r - 50) / CELL), x1 = Math.floor((x + r + 50) / CELL), y0 = Math.floor((y - r - 50) / CELL), y1 = Math.floor((y + r + 50) / CELL);
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
    const a = grid.get(cx * 100000 + cy); if (!a) continue;
    for (const e of a) { if (e.dead) continue; const rr2 = r + e.r; const dx = e.x - x, dy = e.y - y; if (dx * dx + dy * dy <= rr2 * rr2) { if (cb(e) === false) return; } }
  }
}
function nearest(x, y, maxD, exclude) {
  let best = null, bd = maxD * maxD;
  for (const e of R.enemies) {
    if (e.dead || (exclude && exclude.has(e.id)) || e.blinkT > 0) continue;
    const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// ---------- one-time hints: each mechanic is explained the first time it shows up ----------
const HINTS = {
  ebullet: ['Enemy bullets', 'Red-rimmed orbs hurt. Weave between them!', '#ff6070'],
  elite:   ['Elite foe', 'Gold-ringed foes are tough, but may drop a treasure chest.', '#ffd040'],
  chest:   ['Treasure chest', 'Chests burst with experience.', '#ffd040'],
  boss:    ['Warden', 'Red lines and circles warn of attacks. Step out of them!', '#ff6070'],
  ability: ['Ability gained', 'Tap the round button at the bottom right to use it.', '#80e0ff'],
  shrine:  ['Shrine', 'Follow the arrow and stand inside the shrine to activate it.', '#c070ff'],
  bounty:  ['Bounty', 'Finish the goal shown at the top before time runs out.', '#80ffb0'],
  gleamer: ['Gleamer', 'Chase the golden creature and catch it before it escapes!', '#ffd040'],
  legend:  ['Legendary relic', 'Rare and powerful. They can even add weapon or ability slots.', '#ffd040'],
};
function hint(k) {
  if (!R || (save.hints && save.hints[k])) return;
  save.hints = save.hints || {}; save.hints[k] = 1; persist();
  R.hints = R.hints || []; if (!R.hints.find(h => h.k === k)) R.hints.push({ k, t: 8.5 });
}

// ---------- particles & fx ----------
function burst(x, y, color, n, spd, size, life) {
  for (let i = 0; i < n; i++) {
    if (R.parts.length > (save.settings.quality === 0 ? 180 : 320)) R.parts.shift();
    const a = rand(TAU), v = rand(0.3, 1) * (spd || 120);
    R.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: (life || 0.5) * rand(0.6, 1.2), max: life || 0.5, s: (size || 3) * rand(0.6, 1.3), c: color });
  }
}
function floatText(x, y, str, color, size) {
  if (!save.settings.numbers && size < 20) return;
  if (size < 14 && R.enemies.length > 80) return; // keep crowded screens readable: only crits and big events
  if (R.texts.length > 24) R.texts.shift();
  const big = (size || 13) >= 15; // messages linger; damage numbers stay snappy
  R.texts.push({ x: x + rand(-6, 6), y, str, c: color, s: size || 13, life: big ? 2.2 : 0.8, max: big ? 2.2 : 0.8, rise: big ? 16 : 32 });
}
function addShake(v) { if (save.settings.shake) R.shake = Math.min(14, R.shake + v); }

// ---------- enemies ----------
function waveScale(n) {
  // quadratic growth up to wave 20, then a gentler linear climb in the endless tide
  const m = Math.min(n, FINAL_WAVE) - 1, hp = 1 + 0.16 * m + 0.012 * m * m + Math.max(0, n - FINAL_WAVE) * 0.3;
  return { hp: hp * R.depth.hp, dmg: (1 + 0.05 * (n - 1)) * R.depth.dmg, spd: 1 + Math.min(0.3, 0.015 * (n - 1)), xp: 1 + 0.05 * (n - 1) };
}
function enemyColor(d) { const pal = R.depth.pal; return pal && d.pi >= 0 ? pal[d.pi % pal.length] : d.color; }
function spawnEnemy(type, x, y, o) {
  o = o || {};
  const d = ENEMIES[type], sc = waveScale(Math.max(1, R.wave));
  const elite = !!o.elite;
  const e = { id: R.eid++, type, d, x, y, r: d.r * (elite ? 1.4 : 1), hp: d.hp * sc.hp * (elite ? 5 : 1), spd: d.spd * sc.spd * rand(0.9, 1.1), dmg: d.dmg * sc.dmg * (elite ? 1.4 : 1),
    xp: d.xp * sc.xp * (elite ? 6 : 1), color: enemyColor(d), elite, flash: 0, kx: 0, ky: 0, chill: 0, t: rand(0, 2), state: 'walk', st: rand(1, 3), orbCd: 0, blinkT: 0, a: 0, dead: false, spawnT: 0.35 };
  e.maxHp = e.hp;
  R.enemies.push(e);
  return e;
}
function spawnAround(type, o) {
  const a = rand(TAU), dist = Math.hypot(VW, VH) / 2 + rand(30, 90);
  return spawnEnemy(type, R.p.x + Math.cos(a) * dist, R.p.y + Math.sin(a) * dist, o);
}
function pickType() {
  let total = 0; const pool = [];
  for (const k of ENEMY_IDS) { const d = ENEMIES[k]; if (d.from <= R.wave && (d.minDepth || 0) <= R.di) { const w = d.w * (k === 'drifter' ? Math.max(0.35, 1 - R.wave * 0.035) : 1) * (d.ranged || d.pop ? Math.min(1.2, 0.5 + 0.1 * R.di) : 1); pool.push([k, w]); total += w; } }
  let r = rand(total);
  for (const [k, w] of pool) { r -= w; if (r <= 0) return k; }
  return 'drifter';
}
function spawnBoss(n) {
  const endless = n > FINAL_WAVE;
  // Endless mode: "Enhanced" wardens whose health, damage and attack power keep scaling with the wave,
  // so e.g. the wave-25 Hollow Eye outclasses the wave-20 Heart of the Deep.
  const enh = endless ? 1.3 + (n - FINAL_WAVE) * 0.035 : 1;
  const idx = (n % FINAL_WAVE === 0) ? 3 : ((n / 5 - 1) % 4);
  const b = BOSSES[idx];
  const a = rand(TAU), dist = Math.min(VW, VH) / 2 + 40;
  const e = spawnEnemy('drifter', R.p.x + Math.cos(a) * dist, R.p.y + Math.sin(a) * dist);
  const hp = endless ? BOSSES[3].hp * 1.1 * Math.pow(n / FINAL_WAVE, 1.5) : b.hp;
  const dmg = b.dmg * (endless ? 1.15 * Math.pow(n / FINAL_WAVE, 1.3) : 1);
  const base = BOSS_NAMES[R.di][idx];
  const name = endless ? 'Enhanced ' + base.replace(/^The /, '') : base;
  const color = R.depth.boss ? R.depth.boss[idx] : b.color;
  // signature extra attack plus one more per Depth (and endless), drawn from the library
  const extras = [b.sig].concat(shuffle(BOSS_EXTRAS.filter(k => k !== b.sig)).slice(0, R.di + (endless ? 1 : 0)));
  Object.assign(e, { boss: true, bd: b, kind: b.kind, r: b.r * (endless ? 1.12 : 1), color, spd: b.spd * (endless ? 1.1 : 1), hp: hp * Math.pow(R.depth.hp, 0.75), dmg: dmg * R.depth.dmg,
    xp: 120 + 20 * n, state: 'chase', st: 2, pt: 1.5, sumT: 5, ringN: 0, spiralA: 0, enraged: false, name, enh, extras, xt: 4, xi: 0 });
  e.maxHp = e.hp;
  R.boss = e; hint('boss');
  R.banner = { text: name, sub: endless ? 'Empowered by the endless tide' : 'A Warden rises from the deep', t: 3, color: endless ? '#ffd040' : color };
  SFX.play('bossroar'); SFX.music('d' + R.di + 'b'); addShake(8);
}
const BULLET_CAP = [140, 180, 230, 290, 350, 420, 490, 560];
function eShoot(x, y, a, spd, dmg, color, r, life, home) {
  if (R.ebul.length > BULLET_CAP[R.di]) return null;
  if (!R.hintedBullet) { R.hintedBullet = true; hint('ebullet'); }
  const b = { x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: r || 6, dmg, life: life || 7, c: color || '#ff4070', home: home || 0 };
  R.ebul.push(b);
  return b;
}

function hurtEnemy(e, dmg, o) {
  if (e.dead || e.spawnT > 0.2) return;
  o = o || {};
  if (e.type === 'gleamer' && (e.coins || 0) < 8 && Math.random() < 0.3) { e.coins = (e.coins || 0) + 1; R.items.push({ k: 'coin', x: e.x, y: e.y, v: 1, t: 0, mag: true }); }
  const crit = Math.random() < st.crit;
  const dd = dmg * st.dmg * (crit ? st.critMult : 1);
  e.hp -= dd; e.flash = 0.09;
  if (o.kx && !e.boss) { const k = e.elite ? 0.4 : 1; e.kx += o.kx * k; e.ky += o.ky * k; }
  if (o.chill) e.chill = Math.max(e.chill, o.chill * (R.spirit.chill || 1));
  if (crit) floatText(e.x, e.y - e.r, Math.round(dd) + '!', '#ffe060', 17);
  else floatText(e.x, e.y - e.r, Math.round(dd), '#ffffff', 12);
  SFX.play('hit');
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  if (e.dead) return;
  e.dead = true; R.kills++;
  R.combo++; R.comboT = 2.2; if (R.combo > R.bestCombo) R.bestCombo = R.combo;
  burst(e.x, e.y, e.color, e.boss ? 80 : e.elite ? 24 : 9, e.boss ? 320 : 150, e.boss ? 6 : 3, e.boss ? 1.2 : 0.5);
  SFX.play('kill');
  // xp gems
  let xp = e.xp;
  if (e.boss) { for (let i = 0; i < 24; i++) dropGem(e.x + rand(-40, 40), e.y + rand(-40, 40), xp / 24); }
  else dropGem(e.x, e.y, xp);
  if (hasRelic('leech')) { R.leech++; if (R.leech >= 6) { R.leech = 0; healP(1, true); } }
  if (e.type === 'gleamer') {
    R.items.push({ k: 'chest', x: e.x, y: e.y, t: 0 });
    for (let i = 0; i < 5; i++) R.items.push({ k: 'coin', x: e.x + rand(-20, 20), y: e.y + rand(-20, 20), v: 2, t: 0 });
    R.banner = { text: 'GLEAMER CAUGHT', sub: 'Its hoard is yours', t: 1.6, color: '#ffd040' }; SFX.play('chest');
  } else if (e.elite) {
    if (Math.random() < 0.4 + 0.1 * hR('chest')) R.items.push({ k: 'chest', x: e.x, y: e.y, t: 0 });
    else for (let i = 0; i < 3; i++) R.items.push({ k: 'coin', x: e.x + rand(-14, 14), y: e.y + rand(-14, 14), v: 2, t: 0 });
    addShake(3);
  } else if (!e.boss) {
    const r = Math.random();
    if (r < 0.012) R.items.push({ k: 'heart', x: e.x, y: e.y, t: 0 });
    else if (r < 0.016) R.items.push({ k: 'magnet', x: e.x, y: e.y, t: 0 });
    else if (r < (twist('gold') ? 0.05 : 0.028)) R.items.push({ k: 'coin', x: e.x, y: e.y, v: 1, t: 0 });
  }
  if (e.d.pop && !e.boss) { const n = Math.max(5, Math.round(10 * R.depth.bullets)), off = rand(TAU); for (let i = 0; i < n; i++) eShoot(e.x, e.y, off + i * TAU / n, 100 * Math.sqrt(R.depth.fire), e.dmg * 0.7, '#ff7040', 6); SFX.play('eshot'); }
  if (e.marked && R.bounty && R.bounty.k === 'hunt') completeBounty();
  if (R.trial && R.trial.ids.has(e.id)) { R.trial.ids.delete(e.id); if (R.trial.ids.size === 0) completeTrial(); }
  if (e.d.split && !e.boss) for (let i = 0; i < 3; i++) { const m = spawnEnemy('mini', e.x + rand(-10, 10), e.y + rand(-10, 10)); m.spawnT = 0; m.kx = rand(-120, 120); m.ky = rand(-120, 120); }
  if (twist('restless') && !e.boss && !e.ghost && e.type !== 'gleamer' && e.type !== 'mini' && Math.random() < 0.12) {
    const gh = spawnEnemy('wraith', e.x, e.y); gh.ghost = true; gh.hp = gh.maxHp = gh.hp * 0.4; gh.xp *= 0.3; gh.spawnT = 0.9; gh.color = '#d8e0ff';
  }
  if (e.boss) bossDefeated(e);
}
function dropGem(x, y, v) {
  R.gems.push({ x, y, v, mag: false, sp: 0, t: 0 });
  if (R.gems.length > 360) { // merge oldest gems to keep things fast
    let sum = 0; const n = 120;
    for (let i = 0; i < n; i++) sum += R.gems[i].v;
    const first = R.gems[0];
    R.gems.splice(0, n);
    R.gems.push({ x: first.x, y: first.y, v: sum, mag: false, sp: 0, t: 0 });
  }
}
function bossDefeated(e) {
  R.bossKills++; R.boss = null;
  save.stats.bosses++;
  SFX.play('bossdie'); addShake(14); R.slow = 0.25; R.slowT = 1.2;
  R.fx.push({ k: 'ring', x: e.x, y: e.y, r: 0, max: 600, life: 0.8, c: e.color });
  for (const o of R.enemies) if (!o.dead && o !== e) { o.hp = 0; killEnemy(o); }
  R.ebul.length = 0;
  for (let i = 0; i < 6; i++) R.items.push({ k: 'coin', x: e.x + rand(-40, 40), y: e.y + rand(-40, 40), v: 5, t: 0 });
  R.items.push({ k: 'heart', x: e.x, y: e.y, t: 0 });
  R.banner = { text: 'WARDEN SLAIN', sub: e.name, t: 2.5, color: '#ffd060' };
  R.relicPending = true;
  SFX.music('d' + R.di);
}

// ---------- player ----------
function healP(v, quiet) {
  const before = R.p.hp;
  R.p.hp = Math.min(st.maxHp, R.p.hp + v);
  if (!quiet && R.p.hp > before) { floatText(R.p.x, R.p.y - 20, '+' + Math.round(R.p.hp - before), '#70ff90', 16); SFX.play('heal'); }
}
function hurtPlayer(d, src) {
  const p = R.p;
  if (p.inv > 0 || R.dead || R.dashT > 0) return;
  if (R.ward) { R.ward = false; R.wardT = 0; p.inv = 0.5; R.fx.push({ k: 'ring', x: p.x, y: p.y, r: 10, max: 60, life: 0.4, c: '#a0c0ff' }); SFX.play('select'); return; }
  if (R.bounty && R.bounty.k === 'untouched') failBounty();
  d *= st.taken;
  p.hp -= d; p.inv = 0.55; R.hurtFlash = 0.35; R.hitstop = 0.05;
  addShake(6); SFX.play('hurt');
  floatText(p.x, p.y - 18, '-' + Math.round(d), '#ff5050', 16);
  burst(p.x, p.y, '#ff4040', 10, 140, 3, 0.4);
  R.combo = 0;
  if (hasRelic('thorn')) novaBlast(p.x, p.y, 120 * st.area, 35, '#ff6a30');
  if (p.hp <= 0) {
    if (hasRelic('eternal') && R.eternalUsed < 2) { R.eternalUsed++; revive(1); }
    else if (hasRelic('phoenix') && !R.phoenixUsed) { R.phoenixUsed = true; revive(1); }
    else if (hR('wind') && !R.windUsed) { R.windUsed = true; revive(0.5); }
    else { p.hp = 0; R.dead = true; R.deathT = 2; R.slow = 0.3; SFX.play('death'); burst(p.x, p.y, R.spirit.color, 60, 260, 4, 1.4); stopJoy(); }
  }
}
function revive(frac) {
  const p = R.p;
  p.hp = st.maxHp * frac; p.inv = 2.5;
  SFX.play('revive');
  R.banner = { text: 'REKINDLED', sub: 'The flame refuses to die', t: 2.2, color: '#ffb040' };
  R.fx.push({ k: 'ring', x: p.x, y: p.y, r: 0, max: 400, life: 0.7, c: '#ffb040' });
  for (const e of R.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < 260) { if (e.boss) hurtEnemy(e, 50); else { e.hp = 0; killEnemy(e); } } }
  R.ebul.length = 0;
}
function novaBlast(x, y, radius, dmg, color) {
  R.fx.push({ k: 'ring', x, y, r: 10, max: radius, life: 0.35, c: color });
  query(x, y, radius, e => { const a = Math.atan2(e.y - y, e.x - x); hurtEnemy(e, dmg, { kx: Math.cos(a) * 260, ky: Math.sin(a) * 260 }); });
}

// ---------- weapons ----------
function fireWeapons(dt) {
  const p = R.p;
  for (const w of R.weapons) {
    const def = WEAPONS[w.id], s = def.s(w.lvl);
    if (w.id === 'orbit') continue;
    w.cd -= dt;
    if (w.cd > 0) continue;
    switch (w.id) {
      case 'bolt': {
        const t = nearest(p.x, p.y, 420); if (!t) { w.cd = 0.1; break; }
        const a0 = Math.atan2(t.y - p.y, t.x - p.x), n = s.count + st.extra;
        for (let i = 0; i < n; i++) {
          const a = a0 + (i - (n - 1) / 2) * 0.13;
          R.shots.push({ k: 'bolt', x: p.x, y: p.y, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, r: 5, dmg: s.dmg, pierce: s.pierce, life: 1.1, c: def.color, hit: [] });
        }
        SFX.play('shoot'); w.cd = s.cd * st.cdm; break;
      }
      case 'fan': {
        const t = nearest(p.x, p.y, 300); if (!t) { w.cd = 0.1; break; }
        const a0 = Math.atan2(t.y - p.y, t.x - p.x), n = s.count + st.extra, spread = 0.75 * st.area;
        for (let i = 0; i < n; i++) {
          const a = a0 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread) + rand(-0.03, 0.03);
          R.shots.push({ k: 'shard', x: p.x, y: p.y, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, r: 4, dmg: s.dmg, pierce: s.pierce, life: 0.5 * Math.sqrt(st.area), c: def.color, hit: [], chill: 1.4 });
        }
        SFX.play('fan'); w.cd = s.cd * st.cdm; break;
      }
      case 'arc': {
        let fired = false;
        for (let c = 0; c < s.count + (st.extra > 0 ? 1 : 0); c++) {
          const used = new Set();
          let cur = nearest(p.x, p.y, s.range * Math.sqrt(st.area), c > 0 ? null : null);
          if (c > 0 && cur) { // second arc picks a different start
            const alt = R.enemies.filter(e => !e.dead && e !== cur && Math.hypot(e.x - p.x, e.y - p.y) < s.range * 1.2);
            cur = alt.length ? pick(alt) : cur;
          }
          if (!cur) break;
          const pts = [[p.x, p.y]];
          const chains = s.chain + (R.spirit.chain || 0);
          for (let i = 0; i < chains && cur; i++) {
            used.add(cur.id); pts.push([cur.x, cur.y]);
            hurtEnemy(cur, s.dmg * (1 - i * 0.06));
            burst(cur.x, cur.y, def.color, 3, 90, 2, 0.25);
            cur = nearest(cur.x, cur.y, 130 * st.area, used);
          }
          R.fx.push({ k: 'arc', pts, life: 0.18, c: def.color }); fired = true;
        }
        if (fired) { SFX.play('arc'); w.cd = s.cd * st.cdm; } else w.cd = 0.15;
        break;
      }
      case 'nova': {
        if (!nearest(p.x, p.y, s.radius * st.area + 40)) { w.cd = 0.2; break; }
        novaBlast(p.x, p.y, s.radius * st.area, s.dmg, def.color);
        if (s.count > 1) R.delayed = (R.delayed || []).concat([{ t: 0.3, f: () => novaBlast(R.p.x, R.p.y, s.radius * st.area * 1.1, s.dmg * 0.7, '#ffb070') }]);
        SFX.play('nova'); addShake(1.5); w.cd = s.cd * st.cdm; break;
      }
      case 'seeker': {
        const n = s.count + st.extra;
        if (!nearest(p.x, p.y, 500)) { w.cd = 0.2; break; }
        for (let i = 0; i < n; i++) {
          const a = rand(TAU);
          R.shots.push({ k: 'seeker', x: p.x, y: p.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, r: 5, dmg: s.dmg, aoe: s.aoe * st.area, life: 3, c: def.color, target: null, hit: [], spd: 300 + w.lvl * 20 });
        }
        SFX.play('fan'); w.cd = s.cd * st.cdm; break;
      }
      case 'mine': {
        const n = s.count + (st.extra > 0 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          if (R.mines.length > 14) R.mines.shift();
          R.mines.push({ x: p.x + rand(-16, 16), y: p.y + rand(-16, 16), arm: 0.45, life: 7, dmg: s.dmg, aoe: s.aoe * st.area, twice: s.twice, c: WEAPONS.mine.color });
        }
        SFX.play('mine'); w.cd = s.cd * st.cdm; break;
      }
      case 'lance': {
        const t = nearest(p.x, p.y, s.len); if (!t) { w.cd = 0.15; break; }
        const a0 = Math.atan2(t.y - p.y, t.x - p.x), n = s.count + (st.extra > 0 ? 1 : 0), wd = s.width * Math.sqrt(st.area);
        for (let i = 0; i < n; i++) {
          const a = a0 + (n === 1 ? 0 : (i - (n - 1) / 2) * 0.28), dx = Math.cos(a), dy = Math.sin(a);
          for (const e of R.enemies) {
            if (e.dead || e.blinkT > 0) continue;
            const px = e.x - p.x, py = e.y - p.y, tt = px * dx + py * dy;
            if (tt > 0 && tt < s.len && Math.abs(px * dy - py * dx) < wd / 2 + e.r) hurtEnemy(e, s.dmg, { kx: dx * 60, ky: dy * 60 });
          }
          R.fx.push({ k: 'beam', x: p.x, y: p.y, x1: p.x + dx * s.len, y1: p.y + dy * s.len, w: wd, life: 0.22, max: 0.22, c: def.color });
        }
        SFX.play('arc'); w.cd = s.cd * st.cdm; break;
      }
      case 'crescent': {
        if (!nearest(p.x, p.y, 320)) { w.cd = 0.15; break; }
        const t = nearest(p.x, p.y, 320), a0 = Math.atan2(t.y - p.y, t.x - p.x), n = s.count + st.extra;
        for (let i = 0; i < n; i++) {
          const a = a0 + i * TAU / n;
          R.shots.push({ k: 'crescent', x: p.x, y: p.y, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, r: s.size * Math.sqrt(st.area), dmg: s.dmg, life: 4, c: def.color, hit: [], hits: {}, out: true, trav: 0, reach: s.reach, spin: 0 });
        }
        SFX.play('fan'); w.cd = s.cd * st.cdm; break;
      }
      case 'aura': {
        const rad = s.radius * Math.sqrt(st.area);
        query(p.x, p.y, rad, e => hurtEnemy(e, s.dmg, { chill: s.chill ? 0.6 : 0 }));
        w.cd = s.tick * st.cdm; break;
      }
      case 'meteor': {
        const pool = R.enemies.filter(e => !e.dead && Math.abs(e.x - p.x) < VW * 0.55 && Math.abs(e.y - p.y) < VH * 0.55);
        if (!pool.length) { w.cd = 0.2; break; }
        const n = s.count + (st.extra > 0 ? 1 : 0), aoe = s.aoe * st.area;
        for (let i = 0; i < n; i++) {
          const t = pick(pool), x = t.x + rand(-10, 10), y = t.y + rand(-10, 10);
          R.fx.push({ k: 'mark', x, y, r: aoe, life: 0.45, max: 0.45, c: def.color });
          R.delayed = (R.delayed || []).concat([{ t: 0.45, f: () => explode(x, y, aoe, s.dmg, def.color) }]);
        }
        w.cd = s.cd * st.cdm; break;
      }
      case 'ricochet': {
        const t = nearest(p.x, p.y, 380); if (!t) { w.cd = 0.15; break; }
        const n = s.count + (st.extra > 0 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const a = Math.atan2(t.y - p.y, t.x - p.x) + (i - (n - 1) / 2) * 0.3;
          R.shots.push({ k: 'rico', x: p.x, y: p.y, vx: Math.cos(a) * 460, vy: Math.sin(a) * 460, r: 5, dmg: s.dmg, life: 1.4, c: def.color, hit: [], bounces: s.bounces + st.extra, spin: 0 });
        }
        SFX.play('shoot'); w.cd = s.cd * st.cdm; break;
      }
    }
  }
  // orbit orbs: continuous
  const ow = R.weapons.find(w => w.id === 'orbit');
  if (ow) {
    const s = WEAPONS.orbit.s(ow.lvl), n = s.count + st.extra + (R.spirit.orbs || 0), rad = s.radius * Math.sqrt(st.area);
    R.orbitA += s.spin * dt;
    for (let i = 0; i < n; i++) {
      const a = R.orbitA + i * TAU / n, ox = p.x + Math.cos(a) * rad, oy = p.y + Math.sin(a) * rad;
      query(ox, oy, 9, e => {
        if (e.orbCd > 0) return;
        e.orbCd = 0.4;
        const ka = Math.atan2(e.y - p.y, e.x - p.x);
        hurtEnemy(e, s.dmg, { kx: Math.cos(ka) * 140, ky: Math.sin(ka) * 140 });
        burst(ox, oy, WEAPONS.orbit.color, 3, 80, 2, 0.25);
      });
    }
  }
}
function explode(x, y, radius, dmg, color) {
  R.fx.push({ k: 'boom', x, y, r: radius, life: 0.3, max: 0.3, c: color });
  burst(x, y, color, 12, 200, 3, 0.4);
  query(x, y, radius, e => { const a = Math.atan2(e.y - y, e.x - x); hurtEnemy(e, dmg, { kx: Math.cos(a) * 180, ky: Math.sin(a) * 180 }); });
  SFX.play('boom'); addShake(1.2);
}

// ---------- what each Depth introduces ----------
const FEAT_DEPTH = { abilities: 1, shrines: 1, bounties: 2, gleamers: 2, trials: 3, legendary: 3 };
function feat(k) { return R.di >= FEAT_DEPTH[k]; }
function twist(k) { return R.depth.twists.indexOf(k) >= 0; }
const TWISTS = {
  dark:     ['DARKNESS', 'Your flame is the only light', '#8090ff'],
  erupt:    ['ERUPTIONS', 'The seafloor bursts. Watch for red circles', '#ff6030'],
  restless: ['RESTLESS DEAD', 'Slain foes may rise again', '#e8e4d8'],
  gold:     ['GOLDEN FEVER', 'Riches, Gleamers and elites abound', '#ffc030'],
  current:  ['CURRENTS', 'The water drags everything with it', '#40c0ff'],
};
function updateTwists(dt) {
  const p = R.p;
  if (twist('erupt') && R.wave >= 2 && !R.overlay) {
    R.eruptT = (R.eruptT == null ? 8 : R.eruptT) - dt;
    if (R.eruptT <= 0) {
      R.eruptT = rand(9, 14);
      const n = 3 + Math.floor(R.di / 3), dm = 14 * waveScale(R.wave).dmg;
      for (let i = 0; i < n; i++) { const a = rand(TAU), d = i === 0 ? 20 : rand(60, 200); R.hazards.push({ k: 'zone', x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, r: 46, tele: 1.4 + i * 0.12, dmg: dm, c: '#ff6030', quiet: true }); }
    }
  }
  if (twist('current')) {
    R.currentT = (R.currentT == null ? 0 : R.currentT) - dt;
    if (R.currentT <= 0) { R.currentT = 18; R.currentA = rand(TAU); floatText(p.x, p.y - 34, 'The current shifts', '#40c0ff', 15); }
    const cx = Math.cos(R.currentA) * 38, cy = Math.sin(R.currentA) * 38;
    p.x += cx * dt; p.y += cy * dt;
    for (const b of R.ebul) { b.x += cx * 0.7 * dt; b.y += cy * 0.7 * dt; }
    for (const gm of R.gems) if (!gm.mag) { gm.x += cx * 0.5 * dt; gm.y += cy * 0.5 * dt; }
    if (Math.random() < 0.5) R.parts.push({ x: p.x + rand(-VW / 2, VW / 2), y: p.y + rand(-VH / 2, VH / 2), vx: cx * 4, vy: cy * 4, life: 0.8, max: 0.8, s: 1.6, c: '#80c8ff' });
  }
}

// ---------- abilities ----------
function abilityScale() { return 1 + Math.max(0, R.wave - 1) * 0.12; } // ability damage keeps up with the tide
function useAbility(i) {
  const ab = R.abilities[i]; if (!ab || R.overlay || R.dead) return;
  if (ab.cd > 0) { SFX.play('deny'); return; }
  const p = R.p, L = ab.lvl, sc = abilityScale();
  ab.cd = ABILITIES[ab.id].cd[L] * st.abilCd;
  switch (ab.id) {
    case 'purge': {
      for (const b of R.ebul.slice(0, 120)) burst(b.x, b.y, '#ffffff', 1, 60, 2, 0.3);
      R.ebul.length = 0; R.hazards.length = 0;
      for (const e of R.enemies) if (!e.dead && Math.abs(e.x - p.x) < VW * 0.6 && Math.abs(e.y - p.y) < VH * 0.6) hurtEnemy(e, (30 + 20 * L) * sc);
      R.fx.push({ k: 'ring', x: p.x, y: p.y, r: 10, max: Math.max(VW, VH), life: 0.6, c: '#ffffff' });
      R.flash = 0.25; addShake(8); SFX.play('nova'); break;
    }
    case 'dash': {
      let dx = p.fx, dy = p.fy; if (Math.hypot(dx, dy) < 0.1) { dx = 1; dy = 0; }
      R.dashT = 0.2 + 0.03 * L; R.dashV = [dx * 900, dy * 900]; R.dashHit = {}; R.dashDmg = 22 * L * sc;
      p.inv = Math.max(p.inv, R.dashT + 0.15); SFX.play('fan'); break;
    }
    case 'warp': R.warp = [0, 4, 5, 6][L]; SFX.play('telegraph'); R.fx.push({ k: 'ring', x: p.x, y: p.y, r: 10, max: 500, life: 0.6, c: '#80b0ff' }); break;
    case 'aegis': { const t = [0, 3, 4, 4][L]; R.aegis = t; p.inv = Math.max(p.inv, t); SFX.play('revive'); break; }
    case 'inferno': R.inferno = 6; R.infernoR = [0, 90, 110, 140][L]; R.infernoD = [0, 8, 11, 15][L] * sc; SFX.play('nova'); break;
    case 'hole': {
      const x = p.x + p.fx * 120, y = p.y + p.fy * 120;
      R.holes.push({ x, y, t: 2.2, pull: 150 + 40 * L, r: 230, dmg: 55 * L * sc, blast: 110 + 20 * L });
      SFX.play('bossroar'); break;
    }
    case 'starfall': {
      const n = [0, 12, 18, 24][L];
      for (let k = 0; k < n; k++) R.delayed = (R.delayed || []).concat([{ t: k * 0.07, f: () => {
        const pool = R.enemies.filter(e => !e.dead && Math.abs(e.x - R.p.x) < VW * 0.6 && Math.abs(e.y - R.p.y) < VH * 0.6);
        const t = pool.length ? pick(pool) : { x: R.p.x + rand(-200, 200), y: R.p.y + rand(-200, 200) };
        const x = t.x + rand(-12, 12), y = t.y + rand(-12, 12);
        R.fx.push({ k: 'mark', x, y, r: 55, life: 0.35, max: 0.35, c: '#b0c8ff' });
        R.delayed.push({ t: 0.35, f: () => explode(x, y, 55, 32 * sc, '#b0c8ff') });
      } }]);
      SFX.play('wave'); break;
    }
  }
}
function updateAbilities(dt) {
  const p = R.p;
  for (const ab of R.abilities) if (ab.cd > 0) ab.cd -= dt;
  if (R.dashT > 0) {
    R.dashT -= dt; p.x += R.dashV[0] * dt; p.y += R.dashV[1] * dt;
    query(p.x, p.y, 22, e => { if (R.dashHit[e.id]) return; R.dashHit[e.id] = 1; hurtEnemy(e, R.dashDmg); burst(e.x, e.y, '#a0fff0', 5, 120, 2, 0.3); });
    if (Math.random() < 0.8) R.parts.push({ x: p.x, y: p.y, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.4, max: 0.4, s: 5, c: '#a0fff0' });
    const dl = R.abilities.find(a => a.id === 'dash');
    if (dl && dl.lvl >= 3 && Math.random() < 0.35) { const x = p.x, y = p.y; R.delayed = (R.delayed || []).concat([{ t: 0.3, f: () => explode(x, y, 40, R.dashDmg * 0.5, '#60ffe0') }]); }
  }
  if (R.warp > 0) R.warp -= dt;
  if (R.aegis > 0) R.aegis -= dt;
  if (R.inferno > 0) {
    R.inferno -= dt; R.infernoTick -= dt;
    if (R.infernoTick <= 0) { R.infernoTick = 0.25; query(p.x, p.y, R.infernoR * st.area, e => hurtEnemy(e, R.infernoD)); }
  }
  for (const h of R.holes) {
    h.t -= dt;
    query(h.x, h.y, h.r, e => { if (e.boss) return; const dx = h.x - e.x, dy = h.y - e.y, d = Math.hypot(dx, dy) || 1; e.x += dx / d * h.pull * dt; e.y += dy / d * h.pull * dt; });
    if (h.t <= 0) { explode(h.x, h.y, h.blast, h.dmg, '#c070ff'); addShake(6); }
  }
  R.holes = R.holes.filter(h => h.t > 0);
  if (hasRelic('ward') && !R.ward) { R.wardT += dt; if (R.wardT >= 12) R.ward = true; }
}

// ---------- in-run events: shrines, gleamers, bounties, trials ----------
function updateEvents(dt) {
  const p = R.p;
  // buffs
  let changed = false;
  for (const k in R.buffs) if (R.buffs[k] > 0) { R.buffs[k] -= dt; if (R.buffs[k] <= 0) changed = true; }
  if (changed) recalc();
  // only one event at a time, with breathing room between them
  const busy = R.shrines.length > 0 || !!R.bounty || !!R.trial || R.enemies.some(e => e.type === 'gleamer') || R.boss || (R.t - (R.lastEvent || -99)) < 18;
  // shrines (from wave 4)
  R.shrineT -= dt;
  if (R.shrineT <= 0 && R.wave >= 4 && !busy && feat('shrines')) {
    R.shrineT = rand(55, 80); R.lastEvent = R.t;
    const a = rand(TAU), d = rand(260, 360);
    const type = pick(R.wave >= 8 && feat('trials') ? ['power', 'power', 'swift', 'fortune', 'trial', 'trial'] : ['power', 'swift', 'fortune']);
    hint('shrine');
    R.shrines.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, type, charge: 0, life: 45, t: 0 });
    floatText(p.x, p.y - 30, SHRINES[type].name + ' appeared', SHRINES[type].color, 15);
  }
  for (const sh of R.shrines) {
    sh.life -= dt; sh.t += dt;
    if (Math.hypot(p.x - sh.x, p.y - sh.y) < 46) { sh.charge += dt; if (Math.random() < 0.5) R.parts.push({ x: sh.x + rand(-30, 30), y: sh.y + 20, vx: 0, vy: -rand(40, 90), life: 0.6, max: 0.6, s: 3, c: SHRINES[sh.type].color }); }
    else sh.charge = Math.max(0, sh.charge - dt * 0.6);
    if (sh.charge >= 2.2) { sh.life = 0; activateShrine(sh); }
  }
  R.shrines = R.shrines.filter(sh => sh.life > 0);
  // gleamer
  R.gleamT -= dt;
  if (R.gleamT <= 0 && R.wave >= (twist('gold') ? 3 : 7) && !busy && feat('gleamers')) {
    R.gleamT = twist('gold') ? rand(28, 45) : rand(55, 95); R.lastEvent = R.t; hint('gleamer');
    const a = rand(TAU), g2 = spawnEnemy('gleamer', p.x + Math.cos(a) * 200, p.y + Math.sin(a) * 200);
    g2.hp = g2.maxHp = 40 * waveScale(R.wave).hp; g2.spawnT = 0.2;
    floatText(p.x, p.y - 30, 'A Gleamer appears! Catch it!', '#ffd040', 16);
  }
  // bounties
  if (R.bounty) {
    R.bounty.t -= dt;
    if (R.bounty.k === 'slay' && R.kills - R.bounty.base >= R.bounty.need) completeBounty();
    else if (R.bounty.k === 'untouched' && R.bounty.t <= 0) completeBounty();
    else if (R.bounty && R.bounty.t <= 0) failBounty();
  } else {
    R.bountyT -= dt;
    if (R.bountyT <= 0 && R.waveActive && R.wave >= 6 && !busy && feat('bounties')) {
      R.bountyT = rand(35, 55); R.lastEvent = R.t; hint('bounty');
      const k = pick(['slay', 'slay', 'untouched', 'hunt']);
      if (k === 'slay') R.bounty = { k, need: 25 + R.wave * 3, base: R.kills, t: 20, max: 20 };
      else if (k === 'untouched') R.bounty = { k, t: 20, max: 20 };
      else {
        const e = spawnAround(pickType(), { elite: true }); e.marked = true; e.hp *= 1.5; e.maxHp = e.hp;
        R.bounty = { k, t: 30, max: 30, target: e };
      }
      SFX.play('wave');
    }
  }
  if (R.trial) { R.trial.t -= dt; if (R.trial.t <= 0) { R.trial = null; floatText(p.x, p.y - 30, 'Trial failed', '#ff8080', 16); } }
}
function bountyText() {
  const b = R.bounty; if (!b) return '';
  if (b.k === 'slay') return 'Slay ' + b.need + ' foes  ' + Math.min(b.need, R.kills - b.base) + '/' + b.need;
  if (b.k === 'untouched') return 'Take no damage';
  return 'Hunt the marked elite';
}
function completeBounty() {
  const p = R.p;
  R.bounty = null; R.bountiesDone++; save.stats.bounties = (save.stats.bounties || 0) + 1;
  R.items.push({ k: 'chest', x: p.x + rand(-30, 30), y: p.y - 40, t: 0 });
  for (let i = 0; i < 3; i++) R.items.push({ k: 'coin', x: p.x + rand(-40, 40), y: p.y + rand(-40, 40), v: 1, t: 0 });
  R.banner = { text: 'BOUNTY COMPLETE', sub: 'A treasure chest appears', t: 1.6, color: '#80ffb0' }; SFX.play('chest');
}
function failBounty() {
  if (!R.bounty) return;
  if (R.bounty.target && !R.bounty.target.dead) R.bounty.target.marked = false;
  R.bounty = null; floatText(R.p.x, R.p.y - 30, 'Bounty failed', '#ff8080', 15);
}
function activateShrine(sh) {
  const p = R.p, def = SHRINES[sh.type], dur = 25 * (1 + 0.25 * hR('shrine')) * (R.spirit.shrine || 1);
  save.stats.shrines = (save.stats.shrines || 0) + 1;
  R.fx.push({ k: 'ring', x: sh.x, y: sh.y, r: 10, max: 160, life: 0.6, c: def.color }); SFX.play('chest');
  R.banner = { text: def.name.toUpperCase(), sub: def.desc, t: 1.8, color: def.color };
  if (sh.type === 'power' || sh.type === 'swift') { R.buffs[sh.type] = dur; recalc(); }
  else if (sh.type === 'fortune') {
    R.items.push({ k: 'chest', x: sh.x, y: sh.y, t: 0 });
    for (let i = 0; i < 6; i++) R.items.push({ k: 'coin', x: sh.x + rand(-40, 40), y: sh.y + rand(-40, 40), v: 1, t: 0 });
    if (Math.random() < 0.3) R.items.push({ k: 'heart', x: sh.x + 20, y: sh.y, t: 0 });
  } else { // trial: a pack of champions
    const n = 4 + Math.floor(R.wave / 5), ids = new Set();
    for (let i = 0; i < n; i++) { const a = i * TAU / n; const e = spawnEnemy(pickType(), p.x + Math.cos(a) * 240, p.y + Math.sin(a) * 240, { elite: true }); ids.add(e.id); }
    R.trial = { ids, t: 40 };
  }
}
function completeTrial() {
  const p = R.p; R.trial = null;
  R.items.push({ k: 'chest', x: p.x, y: p.y - 40, t: 0 }); R.items.push({ k: 'chest', x: p.x + 30, y: p.y - 30, t: 0 });
  for (let i = 0; i < 6; i++) R.items.push({ k: 'coin', x: p.x + rand(-50, 50), y: p.y + rand(-50, 50), v: 2, t: 0 });
  R.banner = { text: 'TRIAL CONQUERED', sub: 'Two chests of treasure', t: 1.8, color: '#c070ff' }; SFX.play('chest');
}

// ---------- level up choices ----------
function genChoices() {
  const pool = [];
  for (const w of R.weapons) if (w.lvl < 5) pool.push({ t: 'weapon', id: w.id, lvl: w.lvl + 1, wt: 3.2 });
  if (R.weapons.length < st.maxW) for (const id of WEAPON_IDS) if (!weaponLvl(id)) pool.push({ t: 'weapon', id, lvl: 1, wt: R.weapons.length < 2 ? 3 : 1.6 });
  for (const id of PASSIVE_IDS) { const l = R.passives[id] || 0; if (l < PASSIVES[id].max) pool.push({ t: 'passive', id, lvl: l + 1, wt: 2 }); }
  for (const ab of R.abilities) if (ab.lvl < 3) pool.push({ t: 'ability', id: ab.id, lvl: ab.lvl + 1, wt: 1.4 });
  if (R.abilities.length < st.maxA && R.p.level >= 5 && feat('abilities')) for (const id of ABILITY_IDS) if (!R.abilities.find(a => a.id === id)) pool.push({ t: 'ability', id, lvl: 1, wt: R.abilities.length ? 0.7 : 1.3 });
  for (let i = pool.length - 1; i >= 0; i--) if (R.banished.has(pool[i].t + ':' + pool[i].id)) pool.splice(i, 1);
  const n = st.choices, out = [];
  while (out.length < n && pool.length) {
    let tot = 0; for (const c of pool) tot += c.wt;
    let r = rand(tot), idx = 0;
    for (; idx < pool.length; idx++) { r -= pool[idx].wt; if (r <= 0) break; }
    out.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0]);
  }
  if (out.length < n) out.push({ t: 'heal' });
  if (out.length < n) out.push({ t: 'embers' });
  R.choices = out;
}
function applyChoice(c) {
  if (c.t === 'weapon') { const w = R.weapons.find(w => w.id === c.id); if (w) w.lvl = Math.min(5, Math.max(w.lvl, c.lvl)); else addWeapon(c.id); }
  else if (c.t === 'passive') { R.passives[c.id] = Math.min(PASSIVES[c.id].max, Math.max(R.passives[c.id] || 0, c.lvl)); if (c.id === 'vigor') { recalc(); healP(20, true); } }
  else if (c.t === 'ability') { const a = R.abilities.find(a => a.id === c.id); if (a) a.lvl = Math.min(3, Math.max(a.lvl, c.lvl)); else { R.abilities.push({ id: c.id, lvl: 1, cd: 0 }); hint('ability'); } }
  else if (c.t === 'heal') healP(st.maxHp * 0.4);
  else if (c.t === 'embers') R.embersFound += 6;
  recalc();
  SFX.play('select');
  R.pending--;
  if (R.pending > 0) { genChoices(); R.overlayT = 0; } else R.overlay = null;
}
function choiceInfo(c) {
  if (c.t === 'weapon') { const d = WEAPONS[c.id]; return { name: d.name, desc: d.lv[c.lvl], color: d.color, tag: c.lvl === 1 ? 'NEW WEAPON' : 'LEVEL ' + c.lvl, kind: 'weapon', lvl: c.lvl, max: 5 }; }
  if (c.t === 'passive') { const d = PASSIVES[c.id]; return { name: d.name, desc: d.desc, color: d.color, tag: c.lvl === 1 ? 'NEW' : 'LEVEL ' + c.lvl, kind: 'passive', lvl: c.lvl, max: d.max }; }
  if (c.t === 'ability') { const d = ABILITIES[c.id]; return { name: d.name, desc: d.lv[c.lvl] + ' (' + d.cd[c.lvl] + 's cooldown)', color: d.color, tag: c.lvl === 1 ? 'NEW ABILITY · TAP TO USE' : 'ABILITY LEVEL ' + c.lvl, kind: 'ability', lvl: c.lvl, max: 3 }; }
  if (c.t === 'heal') return { name: 'Warm Embers', desc: 'Restore 40% of your HP. (Repeatable bonus)', color: '#70ff90', tag: 'BONUS · HEAL', kind: 'heal' };
  return { name: 'Ember Cache', desc: '+6 Embers for the Hearth. (Repeatable bonus)', color: '#ffd040', tag: 'BONUS · TREASURE', kind: 'cache' };
}
function legendChance() { return feat('legendary') ? 0.025 + 0.01 * hR('lucky') + (R.endless ? 0.02 : 0) : 0; }
function openRelics() {
  const pool = shuffle(RELIC_IDS.filter(k => !hasRelic(k))), legends = shuffle(LEGEND_IDS.filter(k => !hasRelic(k)));
  const out = [];
  for (let i = 0; i < 3; i++) {
    if (legends.length && Math.random() < legendChance()) out.push(legends.pop());
    else if (pool.length) out.push(pool.pop());
    else if (legends.length) out.push(legends.pop());
  }
  R.relicChoices = out; R.relicSrc = 'boss';
  if (R.relicChoices.length) { R.overlay = 'relic'; R.overlayT = 0; SFX.play('chest'); }
}
function openLegendChest() {
  const legends = LEGEND_IDS.filter(k => !hasRelic(k));
  if (!legends.length) return false;
  R.relicChoices = [pick(legends)]; R.relicSrc = 'chest'; R.overlay = 'relic'; R.overlayT = 0; SFX.play('bossdie');
  return true;
}

// ---------- waves ----------
function startWave(n) {
  R.wave = n; R.waveT = 0; R.waveActive = true;
  const isBoss = n % 5 === 0;
  R.toSpawn = R.waveTotal = Math.floor((14 + 8 * Math.min(n, FINAL_WAVE) + 3 * Math.max(0, n - FINAL_WAVE)) * R.depth.count * (isBoss ? 0.4 : 1));
  R.spawnDur = isBoss ? 45 : 18 + Math.min(n, 12);
  R.spawnAcc = 0;
  if (isBoss) spawnBoss(n);
  else { R.banner = { text: 'WAVE ' + n, sub: n === FINAL_WAVE - 1 ? 'The Heart stirs below...' : (n > FINAL_WAVE ? 'Endless tide' : R.depth.name), t: 2, color: '#9ec8ff' }; SFX.play('wave'); SFX.music('d' + R.di); }
  SFX.setIntensity(n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4);
}
function updateWaves(dt) {
  if (!R.waveActive) {
    R.inter -= dt;
    if (R.inter <= 0) startWave(R.wave + 1);
    return;
  }
  R.waveT += dt;
  if (R.toSpawn > 0) {
    const rate = R.waveTotal / R.spawnDur;
    R.spawnAcc += rate * dt * (R.waveT < 2 ? 2.5 : 1);
    while (R.spawnAcc >= 1 && R.toSpawn > 0) {
      R.spawnAcc -= 1;
      const alive = R.enemies.length;
      if (alive > 260) { R.spawnAcc = 0; break; }
      if (R.wave >= 6 && Math.random() < 0.04 && R.toSpawn >= 6) { // flock from one side
        const a = rand(TAU), dist = Math.hypot(VW, VH) / 2 + 50, t = R.wave >= 9 ? pick(['dart', 'drifter', 'mini']) : 'dart';
        for (let i = 0; i < 6; i++) spawnEnemy(t, R.p.x + Math.cos(a) * dist + rand(-40, 40), R.p.y + Math.sin(a) * dist + rand(-40, 40));
        R.toSpawn -= 6; continue;
      }
      if (R.wave >= 5 && Math.random() < 0.025 && R.toSpawn >= 12) { // encircling tide
        const n = Math.min(R.toSpawn, 12 + Math.floor(R.wave / 2)), t = R.wave >= 12 ? 'mini' : 'drifter', rad = Math.min(VW, VH) * 0.62;
        for (let i = 0; i < n; i++) { const a = i * TAU / n; spawnEnemy(t, R.p.x + Math.cos(a) * rad, R.p.y + Math.sin(a) * rad); }
        R.toSpawn -= n; R.banner = R.banner || { text: 'ENCIRCLED', sub: 'Break through!', t: 1.2, color: '#ff6080' }; continue;
      }
      const eliteChance = (R.wave >= 4 ? Math.min(0.1, 0.012 + 0.004 * R.wave) : 0) * (twist('gold') ? 1.6 : 1);
      const el = Math.random() < eliteChance; spawnAround(pickType(), { elite: el }); if (el) hint('elite');
      R.toSpawn--;
    }
  }
  const isBoss = R.wave % 5 === 0;
  if (isBoss) {
    if (!R.boss) endWave();
    else if (R.toSpawn <= 0 && R.waveT > R.spawnDur) { R.toSpawn = Math.floor(6 + R.wave); R.waveT = 0; }
  } else if ((R.toSpawn <= 0 && !R.enemies.some(e => e.type !== 'gleamer')) || R.waveT > R.spawnDur + 28) endWave();
}
function endWave() {
  R.waveActive = false; R.inter = 3; R.cleared = R.wave;
  if (R.wave > save.stats.bestWave) save.stats.bestWave = R.wave;
  const key = 'd' + R.di;
  save.best[key] = Math.max(save.best[key] || 0, R.wave);
  // magnetize gems at end of wave so you never miss XP
  for (const gm of R.gems) gm.mag = true;
  if (R.relicPending) { R.relicPending = false; openRelics(); }
  if (R.di === DEPTHS.length - 1 && R.wave >= TIDEBREAKER_WAVE && !R.tbDone) {
    R.tbDone = true; R.tbFirst = !save.tidebreaker; save.tidebreaker = true; R.tidebreakerPending = true;
  }
  if (R.wave === FINAL_WAVE && !R.endless) {
    R.victory = true;
    if (save.depthCleared < R.di + 1) { save.depthCleared = R.di + 1; R.newDepth = R.di + 1 < DEPTHS.length; }
    R.victoryPending = true;
  }
  persist();
}

// ---------- end of run ----------
function finishRun(victory) {
  victory = victory || R.victory;
  const fort = 1 + 0.08 * hR('fort');
  const parts = [
    ['Foes slain', Math.floor(R.kills * 0.1)],
    ['Waves survived', R.cleared * 3],
    ['Wardens slain', R.bossKills * 12],
    ['Bounties & trials', R.bountiesDone * 6],
    ['Embers gathered', Math.floor(R.embersFound)],
  ];
  if (victory) parts.push(['Depth cleared!', 60 * (R.di + 1)]);
  if (R.tbDone) parts.push(['Tidebreaker!', R.tbFirst ? 5000 : 800]);
  let base = 0; for (const p of parts) base += p[1];
  const mult = R.depth.embers * fort * (hasRelic('coin') ? 1.5 : 1);
  const total = Math.round(base * mult);
  save.embers += total; save.lifetimeEmbers += total;
  save.stats.kills += R.kills;
  save.stats.bestLevel = Math.max(save.stats.bestLevel, R.p.level);
  save.stats.playTime += R.t;
  save.seenTutorial = true;
  const unlocks = [];
  for (const sp of SPIRITS) if (!save.unlocked[sp.id] && sp.unlock && sp.unlock.check(save)) { save.unlocked[sp.id] = true; unlocks.push(sp.name); }
  if (R.newDepth) unlocks.push(DEPTHS[R.di + 1].name + ' (Depth ' + (R.di + 2) + ')');
  persist();
  R.result = { parts, mult, total, unlocks, victory };
  R.overlay = 'over'; R.overlayT = 0;
  SFX.music('over');
}

// ---------- update ----------
function updateRun(rdt) {
  if (R.overlay) { R.overlayT = (R.overlayT || 0) + rdt; R.shake = 0; R.hurtFlash = 0; if (joy.active) stopJoy(); return; }
  if (R.hitstop > 0) { R.hitstop -= rdt; return; }
  if (R.slowT > 0) { R.slowT -= rdt; if (R.slowT <= 0) R.slow = 1; }
  const dt = rdt * (R.dead ? 0.3 : R.slow);
  R.t += dt;
  const p = R.p;
  if (R.dead) {
    R.deathT -= rdt;
    updateParts(dt);
    if (R.deathT <= 0) finishRun(false);
    return;
  }
  if (R.tutorial > 0) R.tutorial -= dt;
  // movement
  let mx = joy.active ? joy.dx : 0, my = joy.active ? joy.dy : 0;
  if (keys['w'] || keys['arrowup']) my -= 1; if (keys['s'] || keys['arrowdown']) my += 1;
  if (keys['a'] || keys['arrowleft']) mx -= 1; if (keys['d'] || keys['arrowright']) mx += 1;
  if (window.__bot) { const b = window.__bot(R); mx = b[0]; my = b[1]; }
  const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  p.vx = lerp(p.vx, mx * st.speed, Math.min(1, dt * 14)); p.vy = lerp(p.vy, my * st.speed, Math.min(1, dt * 14));
  p.x += p.vx * dt; p.y += p.vy * dt;
  if (ml > 0.1) { p.fx = mx / Math.max(ml, 1e-3); p.fy = my / Math.max(ml, 1e-3); }
  if (p.inv > 0) p.inv -= dt;
  if (st.regen > 0) p.hp = Math.min(st.maxHp, p.hp + st.regen * dt);
  p.trail -= dt;
  if (p.trail <= 0) { p.trail = 0.03; R.parts.push({ x: p.x + rand(-4, 4), y: p.y + rand(-4, 4), vx: -p.vx * 0.3 + rand(-20, 20), vy: -p.vy * 0.3 - rand(10, 40), life: 0.45, max: 0.45, s: rand(2, 4), c: R.spirit.color }); }
  R.cam.x = lerp(R.cam.x, p.x, Math.min(1, dt * 6)); R.cam.y = lerp(R.cam.y, p.y, Math.min(1, dt * 6));
  if (R.comboT > 0) { R.comboT -= dt; if (R.comboT <= 0) R.combo = 0; }
  if (R.hurtFlash > 0) R.hurtFlash -= dt;
  if (R.banner) { if (!R.banner.max) { R.banner.t = Math.max(2.8, R.banner.t * 1.6); R.banner.max = R.banner.t; } R.banner.t -= dt; if (R.banner.t <= 0) R.banner = null; }
  if (R.delayed) { for (const d of R.delayed) { d.t -= dt; if (d.t <= 0) d.f(); } R.delayed = R.delayed.filter(d => d.t > 0); }

  const edt = dt * (R.warp > 0 ? 0.3 : 1); // Time Warp slows foes and their bullets
  if (R.flash > 0) R.flash -= dt;
  updateWaves(dt);
  buildGrid();
  updateAbilities(dt);
  updateEvents(dt);
  updateTwists(dt);
  fireWeapons(dt);
  updateEnemies(edt);
  updateHazards(edt);
  updateShots(dt);
  updateMines(dt);
  updateEbul(edt);
  updatePickups(dt);
  updateParts(dt);
  R.enemies = R.enemies.filter(e => !e.dead);

  if (R.shake > 0) R.shake = Math.max(0, R.shake - dt * 30);
  if (!R.overlay && R.pending > 0 && !R.dead) { genChoices(); R.overlay = 'level'; R.overlayT = 0; SFX.play('level'); stopJoy(); }
  if (!R.overlay && R.tidebreakerPending) { R.tidebreakerPending = false; R.overlay = 'tidebreaker'; R.overlayT = 0; stopJoy(); SFX.play('bossdie'); }
  if (!R.overlay && R.victoryPending) { R.victoryPending = false; R.overlay = 'victory'; R.overlayT = 0; stopJoy(); SFX.play('revive'); }
}
function updateEnemies(dt) {
  const p = R.p, fire = R.depth.fire;
  for (const e of R.enemies) {
    if (e.dead) continue;
    e.t += dt; if (e.flash > 0) e.flash -= dt; if (e.chill > 0) e.chill -= dt; if (e.orbCd > 0) e.orbCd -= dt; if (e.spawnT > 0) e.spawnT -= dt;
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const slowF = e.chill > 0 ? 0.5 : 1;
    let vx = 0, vy = 0;
    if (e.boss) { bossAI(e, dt, d, ux, uy); }
    else if (e.type === 'gleamer') { // flees, then escapes with its treasure
      e.life = (e.life == null ? 14 : e.life) - dt;
      const wob = Math.sin(e.t * 2.3) * 0.7;
      vx = (-ux - uy * wob) * e.spd; vy = (-uy + ux * wob) * e.spd;
      if (e.life <= 0) { e.dead = true; floatText(e.x, e.y - 14, 'Escaped!', '#ffd040', 16); burst(e.x, e.y, '#ffd040', 16, 160, 3, 0.5); continue; }
    }
    else if (e.d.ranged) {
      const kind = e.d.ranged, a = Math.atan2(dy, dx);
      const want = kind === 'snipe' ? 270 : kind === 'ring' ? 150 : kind === 'spiral' ? 0 : kind === 'burst' ? 200 : 170;
      if (kind === 'spiral') { vx = ux * e.spd; vy = uy * e.spd; }
      else {
        const f = d > want + 30 ? 1 : d < want - 30 ? -1 : 0;
        vx = (ux * f - uy * 0.5) * e.spd; vy = (uy * f + ux * 0.5) * e.spd;
      }
      e.st -= dt;
      const inRange = d < 380, rate = fire * R.depth.bullets; // early Depths fire far less often
      if (kind === 'spit') {
        if (e.st <= 0 && inRange) { e.st = rand(2.2, 3.2) / rate; eShoot(e.x, e.y, a, 135 * Math.sqrt(fire), e.dmg, '#ff7040'); SFX.play('eshot'); }
      } else if (kind === 'burst') {
        if (e.st <= 0 && inRange) { e.st = rand(2.6, 3.4) / rate; for (let k = 0; k < 3; k++) R.delayed = (R.delayed || []).concat([{ t: k * 0.13, f: () => { if (!e.dead) eShoot(e.x, e.y, Math.atan2(R.p.y - e.y, R.p.x - e.x) + rand(-0.06, 0.06), 165 * Math.sqrt(fire), e.dmg, '#ffa040', 5); } }]); SFX.play('eshot'); }
      } else if (kind === 'ring') {
        if (e.st <= 0 && inRange) { e.st = rand(3.2, 4) / rate; const n = Math.max(5, Math.round((R.wave > 15 ? 10 : 8) * R.depth.bullets)), off = rand(TAU); for (let k = 0; k < n; k++) eShoot(e.x, e.y, off + k * TAU / n, 105 * Math.sqrt(fire), e.dmg, '#ff60b0', 6); SFX.play('eshot'); }
      } else if (kind === 'snipe') {
        if (e.aimT > 0) { vx = vy = 0; e.aimT -= dt; if (e.aimT <= 0) { eShoot(e.x, e.y, e.aimA, 340 * Math.sqrt(fire), e.dmg, '#ff3030', 5); SFX.play('eshot'); } }
        else if (e.st <= 0 && inRange) { e.st = rand(3.5, 4.5) / rate; e.aimT = 0.85; e.aimA = a; SFX.play('telegraph'); }
      } else if (kind === 'spiral') {
        e.life = (e.life == null ? 24 : e.life) - dt;
        if (e.life <= 0) { e.dead = true; burst(e.x, e.y, e.color, 14, 140, 3, 0.5); continue; }
        if (e.st <= 0) { e.st = 0.17 / rate; e.sa = (e.sa || 0) + 0.38; for (let k = 0; k < 2; k++) eShoot(e.x, e.y, e.sa + k * Math.PI, 92 * Math.sqrt(fire), e.dmg, '#ff8030', 5, 6); }
      }
    } else if (e.d.charge) {
      e.st -= dt;
      if (e.state === 'walk') { vx = ux * e.spd; vy = uy * e.spd; if (e.st <= 0 && d < 260) { e.state = 'wind'; e.st = 0.65; e.cx = ux; e.cy = uy; } }
      else if (e.state === 'wind') { if (e.st <= 0) { e.state = 'dash'; e.st = 0.5; } }
      else if (e.state === 'dash') { vx = e.cx * 340; vy = e.cy * 340; if (e.st <= 0) { e.state = 'walk'; e.st = rand(1.5, 2.5); } }
    } else if (e.d.blink) {
      e.st -= dt;
      if (e.blinkT > 0) { e.blinkT -= dt; if (e.blinkT <= 0.25 && !e.blinked) { e.blinked = true; const a = rand(TAU); e.x = p.x + Math.cos(a) * 130; e.y = p.y + Math.sin(a) * 130; } }
      else { vx = ux * e.spd; vy = uy * e.spd; if (e.st <= 0 && d > 140) { e.st = rand(3, 4.5); e.blinkT = 0.5; e.blinked = false; } }
    } else { vx = ux * e.spd; vy = uy * e.spd; }
    if (!e.boss) {
      e.x += (vx * slowF + e.kx) * dt; e.y += (vy * slowF + e.ky) * dt;
      e.kx *= Math.pow(0.02, dt); e.ky *= Math.pow(0.02, dt);
      // separation
      const k = Math.floor(e.x / CELL) * 100000 + Math.floor(e.y / CELL), cell = grid.get(k);
      if (cell && cell.length > 1) {
        for (const o of cell) {
          if (o === e || o.dead || o.boss) continue;
          const sx = e.x - o.x, sy = e.y - o.y, sd = sx * sx + sy * sy, min = e.r + o.r;
          if (sd < min * min && sd > 0.01) { const s = Math.sqrt(sd), push = (min - s) * 0.5; e.x += sx / s * push; e.y += sy / s * push; }
        }
      }
      // despawn very far enemies by moving them closer
      if (d > 900) { const a = rand(TAU), dist = Math.hypot(VW, VH) / 2 + 40; e.x = p.x + Math.cos(a) * dist; e.y = p.y + Math.sin(a) * dist; }
    }
    e.a = Math.atan2(uy, ux);
    if (e.blinkT > 0) continue;
    if (d < e.r + p.r && e.spawnT <= 0 && e.dmg > 0) hurtPlayer(e.dmg, e);
  }
}
function bossAI(e, dt, d, ux, uy) {
  const p = R.p, pw = Math.min(e.enh || 1, 2.2);
  e.pt -= dt; e.sumT -= dt;
  if (!e.enraged && e.hp < e.maxHp * 0.5) { e.enraged = true; R.banner = { text: 'ENRAGED', sub: e.name, t: 1.6, color: '#ff4040' }; SFX.play('bossroar'); addShake(6); }
  const rage = (e.enraged ? 1.35 : 1) * pw;          // attack tempo
  const dens = R.depth.bullets, cnt = n => Math.max(3, Math.round(n * (1 + (pw - 1) * 0.6) * dens)); // fewer bullets early, more deep and in endless
  const bsp = v => v * (1 + (pw - 1) * 0.35);           // bullet speeds grow in endless
  const bdmg = e.dmg * 0.6;
  let vx = 0, vy = 0;
  const summon = (type, n) => {
    n = Math.round(n * pw);
    for (let i = 0; i < n; i++) { const a = rand(TAU); const m = spawnEnemy(type, e.x + Math.cos(a) * 50, e.y + Math.sin(a) * 50, { elite: pw > 1 && Math.random() < 0.15 }); m.spawnT = 0.4; }
  };
  const ring = (n, spd, off, col) => { n = cnt(n); for (let i = 0; i < n; i++) eShoot(e.x, e.y, off + i * TAU / n, bsp(spd), bdmg, col || e.color, 7); SFX.play('eshot'); };
  const fan = (n, step, spd, col) => { n = cnt(n); const a0 = Math.atan2(R.p.y - e.y, R.p.x - e.x); for (let i = 0; i < n; i++) eShoot(e.x, e.y, a0 + (i - (n - 1) / 2) * step, bsp(spd), bdmg, col || e.color, 6); SFX.play('eshot'); };
  const later = (t, f) => { R.delayed = (R.delayed || []).concat([{ t, f: () => { if (!e.dead) f(); } }]); };
  const dashTo = (wind) => { e.state = 'wind'; e.pt = wind; e.cx = ux; e.cy = uy; SFX.play('telegraph'); };
  switch (e.kind) {
    case 'eye': { // easiest: orbits you, rings of bullets with an aimed burst every third volley
      e.orb = (e.orb || 0) + dt * 0.35;
      const tx = p.x + Math.cos(e.orb) * 175, ty = p.y + Math.sin(e.orb) * 175;
      const ddx = tx - e.x, ddy = ty - e.y, dl = Math.hypot(ddx, ddy) || 1;
      vx = ddx / dl * e.spd * 1.6; vy = ddy / dl * e.spd * 1.6;
      if (e.pt <= 0) {
        e.ringN++;
        if (e.ringN % 3 === 0) fan(7, 0.15, 175, '#ff80ff');
        else {
          const off = rand(TAU), n = e.enraged ? 18 : 12;
          ring(n, 110, off);
          if (e.enraged) later(0.35, () => ring(n, 110, off + Math.PI / n));
        }
        e.pt = 2.1 / rage;
      }
      if (e.sumT <= 0) { summon('drifter', 4); e.sumT = 8; }
      break;
    }
    case 'maw': { // charges with fiery trails, bursts at the end of each charge; double-charges when enraged
      if (e.state === 'chase') { vx = ux * e.spd * 1.1 * rage; vy = uy * e.spd * 1.1 * rage; if (e.pt <= 0) { e.dashes = e.enraged ? 2 : 1; dashTo(0.8); } }
      else if (e.state === 'wind') { if (e.pt <= 0) { e.state = 'dash'; e.pt = 0.65; e.trail = 0; } }
      else if (e.state === 'dash') {
        vx = e.cx * 430; vy = e.cy * 430;
        e.trail -= dt;
        if (e.trail <= 0) { e.trail = 0.08 / dens; eShoot(e.x, e.y, rand(TAU), 22, bdmg * 0.7, '#ff8030', 7, 1.8); }
        if (e.pt <= 0) {
          ring(e.enraged ? 12 : 8, 120, rand(TAU)); addShake(4);
          e.dashes--;
          if (e.dashes > 0) { const dx = R.p.x - e.x, dy = R.p.y - e.y, dl = Math.hypot(dx, dy) || 1; ux = dx / dl; uy = dy / dl; dashTo(0.45); }
          else { e.state = 'chase'; e.pt = 2.6 / rage; }
        }
      }
      if (e.sumT <= 0) { summon(R.wave > 10 ? 'dart' : 'drifter', 4); e.sumT = 7; }
      break;
    }
    case 'tide': { // keeps its distance: spiral arms, then aimed fans
      const want = 220, f = d > want + 40 ? 1 : d < want - 40 ? -1 : 0;
      vx = (ux * f - uy * 0.4) * e.spd; vy = (uy * f + ux * 0.4) * e.spd;
      if (e.state === 'chase') e.state = 'spiral';
      if (e.state === 'spiral') {
        e.sp = (e.sp || 0) - dt;
        if (e.sp <= 0) {
          e.sp = 0.105 / rage / dens; e.spiralA += 0.33;
          const arms = (e.enraged ? 3 : 2) + (pw > 1.5 ? 1 : 0) - (dens < 0.7 ? 1 : 0);
          for (let k = 0; k < arms; k++) eShoot(e.x, e.y, e.spiralA + k * TAU / arms, bsp(124), bdmg * 0.9, '#40d0ff', 6);
        }
        if (e.pt <= 0) { e.state = 'rest'; e.pt = 1.2; }
      } else if (e.state === 'rest') { if (e.pt <= 0) { e.state = 'fan'; e.pt = 1.2; e.fanN = 0; e.sp = 0; } }
      else if (e.state === 'fan') {
        e.sp -= dt;
        if (e.sp <= 0 && e.fanN < 3) { e.fanN++; e.sp = 0.35; fan(7, 0.14, 168, '#a0f0ff'); }
        if (e.pt <= 0) { e.state = 'spiral'; e.pt = 3; }
      }
      if (e.sumT <= 0) { summon('dart', 6); e.sumT = 7.5; }
      break;
    }
    case 'heart': { // hardest: cycles charges, double rings, triple volleys and a 4-arm spiral; heartbeat waves when enraged
      if (e.enraged) {
        e.beat = (e.beat || 0) - dt;
        if (e.beat <= 0) { e.beat = 3.2 / pw; ring(30, 68, rand(TAU), '#ff90c0'); addShake(2); }
      }
      if (e.state === 'wind') { if (e.pt <= 0) { e.state = 'dash'; e.pt = 0.6; } }
      else if (e.state === 'dash') { vx = e.cx * 420; vy = e.cy * 420; if (e.pt <= 0) { e.state = 'chase'; e.pt = 1.2 / rage; ring(20, 130, rand(TAU)); addShake(5); } }
      else if (e.state === 'spiral') {
        vx = ux * e.spd * 0.4; vy = uy * e.spd * 0.4;
        e.sp = (e.sp || 0) - dt;
        if (e.sp <= 0) { e.sp = 0.09 / pw / dens; e.spiralA += 0.27; const arms = e.enraged ? 5 : 4; for (let k = 0; k < arms; k++) eShoot(e.x, e.y, e.spiralA + k * TAU / arms, bsp(120), bdmg, '#ff60a0', 6); }
        if (e.pt <= 0) { e.state = 'chase'; e.pt = 1.0 / rage; }
      } else {
        vx = ux * e.spd * 1.1 * rage; vy = uy * e.spd * 1.1 * rage;
        if (e.pt <= 0) {
          e.ringN++;
          const k = e.ringN % (e.enraged ? 3 : 4);
          if (k === 0) dashTo(0.7);
          else if (k === 1) { const off = rand(TAU), n = e.enraged ? 24 : 18; ring(n, 115, off); later(0.3, () => ring(n, 115, off + Math.PI / n)); e.pt = 1.6 / rage; }
          else if (k === 2) { for (let j = 0; j < 4; j++) later(j * 0.2, () => fan(11, 0.12, 155)); e.pt = 1.6 / rage; }
          else { e.state = 'spiral'; e.pt = 2.2; }
        }
      }
      if (e.sumT <= 0) { summon(pick(['drifter', 'dart', 'spitter', 'charger', 'mini']), 7); e.sumT = 5; }
      break;
    }
  }
  // extra attacks from the library
  e.xt -= dt;
  if (e.xt <= 0 && e.state !== 'dash') {
    e.xt = Math.max(3.2, (7.5 - R.di * 0.45) / pw) * (e.enraged ? 0.8 : 1);
    bossExtra(e, e.extras[e.xi++ % e.extras.length], pw);
  }
  const sl = e.chill > 0 ? 0.75 : 1;
  e.x += vx * dt * sl; e.y += vy * dt * sl;
}
function bossExtra(e, kind, pw) {
  const p = R.p, bdmg = e.dmg * 0.6, deep = R.di, aim = Math.atan2(p.y - e.y, p.x - e.x);
  const later = (t, f) => { R.delayed = (R.delayed || []).concat([{ t, f: () => { if (!e.dead) f(); } }]); };
  const fs = 1 + (pw - 1) * 0.35, dens = R.depth.bullets;
  switch (kind) {
    case 'laser': { // telegraphed beams that sweep the arena
      const n = 1 + (e.enraged ? 1 : 0) + Math.floor(deep / 3);
      for (let i = 0; i < n; i++) {
        const a = aim + (i - (n - 1) / 2) * 0.5;
        R.hazards.push({ k: 'laser', x: e.x, y: e.y, a, len: 950, w: 20, tele: 0.95, life: 0.35, dmg: e.dmg * 0.9, c: e.color });
      }
      SFX.play('telegraph'); break;
    }
    case 'zones': { // the floor erupts under you
      const n = 4 + Math.floor(deep / 2) + (e.enraged ? 2 : 0);
      for (let i = 0; i < n; i++) {
        const a = rand(TAU), d = i === 0 ? 0 : rand(40, 140);
        R.hazards.push({ k: 'zone', x: p.x + Math.cos(a) * d + p.vx * 0.4, y: p.y + Math.sin(a) * d + p.vy * 0.4, r: 44, tele: 1.05 + i * 0.07, dmg: bdmg * 1.3, c: e.color });
      }
      SFX.play('telegraph'); break;
    }
    case 'wall': { // a wall of bullets with one gap
      const perp = aim + Math.PI / 2, n = Math.round(24 * Math.min(1, dens + 0.25)), gap = randi(3, n - 6);
      for (let i = 0; i < n; i++) {
        if (i >= gap && i < gap + 3) continue;
        const o = (i - n / 2) * 19;
        eShoot(e.x + Math.cos(perp) * o, e.y + Math.sin(perp) * o, aim, 92 * fs, bdmg, e.color, 6, 9);
      }
      SFX.play('eshot'); break;
    }
    case 'homing': { // slow seeking orbs
      const n = Math.max(2, Math.round((3 + Math.floor(deep / 2) + (e.enraged ? 1 : 0)) * dens));
      for (let i = 0; i < n; i++) eShoot(e.x, e.y, aim + (i - (n - 1) / 2) * 0.6, 88 * fs, bdmg, '#ff40c0', 9, 5.5, 1.6);
      SFX.play('eshot'); break;
    }
    case 'flower': { // spinning petals
      const petals = Math.max(3, Math.round((5 + (e.enraged ? 2 : 0)) * dens)), base = rand(TAU);
      for (let k = 0; k < 16; k++) later(k * 0.11, () => { for (let i = 0; i < petals; i++) eShoot(e.x, e.y, base + k * 0.12 + i * TAU / petals, 112 * fs, bdmg * 0.8, e.color, 5); });
      SFX.play('eshot'); break;
    }
    case 'cross': { // rotating cross streams
      const arms = e.enraged && dens >= 0.85 ? 8 : 4, base = rand(TAU);
      for (let k = 0; k < 14; k++) later(k * 0.1, () => { for (let i = 0; i < arms; i++) eShoot(e.x, e.y, base + k * 0.05 + i * TAU / arms, 135 * fs, bdmg * 0.8, e.color, 5); });
      SFX.play('eshot'); break;
    }
    case 'snipe': { // three marked shots
      for (let k = 0; k < 3; k++) {
        later(k * 0.4, () => {
          const a = Math.atan2(R.p.y - e.y, R.p.x - e.x);
          R.hazards.push({ k: 'aim', x: e.x, y: e.y, a, len: 700, w: 3, tele: 0.45, life: 0.01, dmg: 0, c: '#ff3030' });
          later(0.45, () => { eShoot(e.x, e.y, a, 360 * fs, bdmg, '#ff3030', 6); SFX.play('eshot'); });
        });
      }
      break;
    }
  }
}
function updateHazards(dt) {
  const p = R.p;
  for (const h of R.hazards) {
    if (h.tele > 0) { h.tele -= dt; if (h.tele <= 0 && h.k === 'zone') { // erupt
        h.life = 0.3;
        if (Math.hypot(p.x - h.x, p.y - h.y) < h.r + p.r) hurtPlayer(h.dmg);
        if (!h.quiet) for (let i = 0; i < Math.max(3, Math.round(6 * R.depth.bullets)); i++) eShoot(h.x, h.y, i * TAU / 6 + rand(0.5), 90, h.dmg * 0.6, h.c, 5, 3);
        burst(h.x, h.y, h.c, 14, 180, 3, 0.4); addShake(1.5);
      }
      continue;
    }
    h.life -= dt;
    if (h.k === 'laser' && h.dmg > 0) {
      const dx = Math.cos(h.a), dy = Math.sin(h.a), px = p.x - h.x, py = p.y - h.y, t = px * dx + py * dy;
      if (t > 0 && t < h.len && Math.abs(px * dy - py * dx) < h.w / 2 + p.r - 2) hurtPlayer(h.dmg);
    }
  }
  R.hazards = R.hazards.filter(h => h.tele > 0 || h.life > 0);
}
function updateShots(dt) {
  for (const s of R.shots) {
    s.life -= dt;
    if (s.k === 'seeker') {
      if (!s.target || s.target.dead) s.target = nearest(s.x, s.y, 500);
      if (s.target) {
        const a = Math.atan2(s.target.y - s.y, s.target.x - s.x), cur = Math.atan2(s.vy, s.vx);
        let da = a - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
        const na = cur + clamp(da, -7 * dt, 7 * dt), sp = Math.min(s.spd, Math.hypot(s.vx, s.vy) + 600 * dt);
        s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp;
      }
      if (Math.random() < 0.6) R.parts.push({ x: s.x, y: s.y, vx: rand(-15, 15), vy: rand(-15, 15), life: 0.3, max: 0.3, s: 2.5, c: s.c });
    }
    if (s.k === 'crescent') { // flies out, then returns to you; hits each foe at most every 0.35s
      s.spin += dt * 14;
      if (s.out) { s.trav += Math.hypot(s.vx, s.vy) * dt; if (s.trav >= s.reach) s.out = false; }
      else {
        const dx = R.p.x - s.x, dy = R.p.y - s.y, d = Math.hypot(dx, dy) || 1;
        s.vx = lerp(s.vx, dx / d * 420, Math.min(1, dt * 6)); s.vy = lerp(s.vy, dy / d * 420, Math.min(1, dt * 6));
        if (d < 18) s.life = 0;
      }
      s.x += s.vx * dt; s.y += s.vy * dt;
      query(s.x, s.y, s.r, e => {
        if ((s.hits[e.id] || 0) > R.t) return;
        s.hits[e.id] = R.t + 0.35;
        hurtEnemy(e, s.dmg, { kx: s.vx * 0.15, ky: s.vy * 0.15 });
      });
      continue;
    }
    if (s.k === 'rico') s.spin += dt * 12;
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.life <= 0) { if (s.k === 'seeker') explode(s.x, s.y, s.aoe, s.dmg, s.c); continue; }
    query(s.x, s.y, s.r, e => {
      if (s.life <= 0 || s.hit.indexOf(e.id) >= 0 || e.blinkT > 0) return;
      if (s.k === 'seeker') { explode(s.x, s.y, s.aoe, s.dmg, s.c); s.life = 0; return false; }
      s.hit.push(e.id);
      const sp = Math.hypot(s.vx, s.vy) || 1;
      hurtEnemy(e, s.dmg, { kx: s.vx / sp * 90, ky: s.vy / sp * 90, chill: s.chill });
      burst(s.x, s.y, s.c, 3, 90, 2, 0.2);
      if (s.k === 'rico') { // bounce to the next foe
        if (s.bounces-- <= 0) { s.life = 0; return false; }
        const nx = nearest(s.x, s.y, 240, new Set(s.hit));
        if (!nx) { s.life = 0; return false; }
        const a = Math.atan2(nx.y - s.y, nx.x - s.x); s.vx = Math.cos(a) * 460; s.vy = Math.sin(a) * 460; s.life = 1;
        return false;
      }
      if (s.pierce > 0) s.pierce--; else { s.life = 0; return false; }
    });
  }
  R.shots = R.shots.filter(s => s.life > 0);
}
function updateMines(dt) {
  for (const m of R.mines) {
    m.life -= dt; m.arm -= dt;
    let trig = m.life <= 0;
    if (m.arm <= 0 && !trig) query(m.x, m.y, 22, () => { trig = true; return false; });
    if (trig) {
      explode(m.x, m.y, m.aoe, m.dmg, m.c);
      if (m.twice) { const mx = m.x, my = m.y, a = m.aoe, d = m.dmg; R.delayed = (R.delayed || []).concat([{ t: 0.35, f: () => explode(mx, my, a * 1.2, d * 0.6, '#ff90b0') }]); }
      m.dead = true;
    }
  }
  R.mines = R.mines.filter(m => !m.dead);
}
function updateEbul(dt) {
  const p = R.p;
  for (const b of R.ebul) {
    b.life -= dt;
    if (b.home) { // slow homing orbs
      const a = Math.atan2(p.y - b.y, p.x - b.x), cur = Math.atan2(b.vy, b.vx), sp = Math.hypot(b.vx, b.vy);
      let da = a - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
      const na = cur + clamp(da, -b.home * dt, b.home * dt); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    const dx = b.x - p.x, dy = b.y - p.y;
    if (R.aegis > 0 && dx * dx + dy * dy < 34 * 34) { b.life = 0; burst(b.x, b.y, '#ffe080', 3, 80, 2, 0.25); continue; }
    if (dx * dx + dy * dy < (b.r + p.r - 3) * (b.r + p.r - 3)) { hurtPlayer(b.dmg); b.life = 0; }
    if (Math.abs(dx) > 900 || Math.abs(dy) > 1200) b.life = 0;
  }
  R.ebul = R.ebul.filter(b => b.life > 0);
}
function addXP(v) {
  const p = R.p;
  p.xp += v * st.xp;
  while (p.xp >= p.xpNext) { p.xp -= p.xpNext; p.level++; p.xpNext = xpFor(p.level); R.pending++; }
}
function updatePickups(dt) {
  const p = R.p, pr2 = st.pickup * st.pickup;
  for (const gm of R.gems) {
    gm.t += dt;
    const dx = p.x - gm.x, dy = p.y - gm.y, d2 = dx * dx + dy * dy;
    if (!gm.mag && d2 < pr2) gm.mag = true;
    if (gm.mag) {
      gm.sp = Math.min(900, gm.sp + 900 * dt);
      const d = Math.sqrt(d2) || 1; gm.x += dx / d * gm.sp * dt; gm.y += dy / d * gm.sp * dt;
      if (d < p.r + 8) { gm.dead = true; addXP(gm.v); R.gemPitch = (R.gemPitch || 0) + 1; R.gemPitchT = 0.4; SFX.play('gem', Math.min(R.gemPitch, 20)); }
    }
  }
  if (R.gemPitchT > 0) { R.gemPitchT -= dt; if (R.gemPitchT <= 0) R.gemPitch = 0; }
  R.gems = R.gems.filter(gm => !gm.dead);
  for (const it of R.items) {
    it.t += dt;
    const dx = p.x - it.x, dy = p.y - it.y, d = Math.hypot(dx, dy);
    if (d < st.pickup * 0.6 || it.mag) { it.mag = true; const sp = 380; it.x += dx / (d || 1) * sp * dt; it.y += dy / (d || 1) * sp * dt; }
    if (d < p.r + 12) {
      it.dead = true;
      if (it.k === 'heart') healP(st.maxHp * 0.25);
      else if (it.k === 'magnet') { for (const gm of R.gems) gm.mag = true; SFX.play('pick'); floatText(p.x, p.y - 20, 'MAGNET!', '#60c0ff', 18); }
      else if (it.k === 'coin') { R.embersFound += it.v; SFX.play('pick'); }
      else if (it.k === 'chest' && feat('legendary') && Math.random() < 0.005 + 0.0015 * hR('lucky') && openLegendChest()) { R.embersFound += 4; }
      else if (it.k === 'chest') { // a burst of experience: about 60% of a level
        addXP(R.p.xpNext * 0.6 / st.xp); R.embersFound += 4; hint('chest'); for (let i = 0; i < 14; i++) R.parts.push({ x: p.x, y: p.y, vx: rand(-160, 160), vy: rand(-160, 160), life: 0.6, max: 0.6, s: 3, c: '#7ab8ff' }); SFX.play('chest'); floatText(p.x, p.y - 24, 'TREASURE!', '#ffd040', 20); burst(p.x, p.y, '#ffd040', 30, 200, 3, 0.8); }
    }
  }
  R.items = R.items.filter(it => !it.dead);
}
function updateParts(dt) {
  for (const q of R.parts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.95; q.vy *= 0.95; }
  R.parts = R.parts.filter(q => q.life > 0);
  for (const t of R.texts) { t.life -= dt; t.y -= (t.rise || 32) * dt; }
  R.texts = R.texts.filter(t => t.life > 0);
  for (const f of R.fx) { f.life -= dt; if (f.k === 'ring') f.r = lerp(f.r, f.max, Math.min(1, dt * 12)); }
  R.fx = R.fx.filter(f => f.life > 0);
}

// ================= RENDER =================
function drawBackground(camX, camY, depth, t) {
  const c = depth ? depth.bg : [8, 16, 36];
  const gr = g.createLinearGradient(0, 0, 0, VH);
  gr.addColorStop(0, `rgb(${c[0] + 6},${c[1] + 8},${c[2] + 14})`); gr.addColorStop(1, `rgb(${c[0]},${c[1]},${c[2]})`);
  g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
  const layer = (img, f, alpha, drift) => {
    const ox = -((camX * f + t * drift) % 512 + 512) % 512, oy = -((camY * f + t * drift * 0.6) % 512 + 512) % 512;
    g.globalAlpha = alpha;
    for (let x = ox; x < VW; x += 512) for (let y = oy; y < VH; y += 512) g.drawImage(img, x, y);
    g.globalAlpha = 1;
  };
  layer(tileFar, 0.3, 0.9, 4);
  layer(tileNear, 0.65, 0.8, 9);
}
const SHAPES = [
  (r) => { g.beginPath(); g.arc(0, 0, r, 0, TAU); },
  (r) => { g.beginPath(); g.moveTo(r * 1.3, 0); g.lineTo(-r * 0.8, r * 0.85); g.lineTo(-r * 0.4, 0); g.lineTo(-r * 0.8, -r * 0.85); g.closePath(); },
  (r) => { g.beginPath(); g.moveTo(r * 1.15, 0); g.lineTo(0, r * 1.15); g.lineTo(-r * 1.15, 0); g.lineTo(0, -r * 1.15); g.closePath(); },
  (r) => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); },
  (r) => { g.beginPath(); g.rect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8); },
  (r) => { g.beginPath(); g.moveTo(r * 1.3, 0); g.lineTo(-r, r); g.lineTo(-r * 0.3, 0); g.lineTo(-r, -r); g.closePath(); },
  (r) => { g.beginPath(); g.arc(0, -r * 0.2, r, Math.PI, 0); g.lineTo(r, r); for (let i = 0; i < 4; i++) g.lineTo(r - (i + 0.5) * r / 2, r * (i % 2 ? 1 : 0.6)); g.lineTo(-r, r); g.closePath(); },
  (r) => { g.beginPath(); for (let i = 0; i < 5; i++) { const a = i * TAU / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.moveTo(r * 0.6, -r * 0.2); g.rect(r * 0.6, -r * 0.22, r * 0.8, r * 0.44); },
  (r) => { g.beginPath(); for (let i = 0; i < 16; i++) { const a = i * TAU / 16, q = i % 2 ? r * 0.62 : r * 1.12; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); },
  (r) => { g.beginPath(); for (let i = 0; i <= 24; i++) { const a = i * TAU / 24, q = r * (1 + Math.sin(i * 1.7) * 0.12); g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); },
  (r) => { g.beginPath(); g.moveTo(r * 1.6, 0); g.lineTo(0, r * 0.55); g.lineTo(-r * 1.1, 0); g.lineTo(0, -r * 0.55); g.closePath(); },
  (r) => { g.beginPath(); g.arc(0, 0, r, 0, TAU); for (let i = 0; i < 4; i++) { const a = i * TAU / 4; g.moveTo(Math.cos(a) * r, Math.sin(a) * r); g.arc(Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1, r * 0.3, a + Math.PI, a + Math.PI + TAU); } },
  (r) => { g.beginPath(); g.moveTo(0, -r * 1.3); g.lineTo(r, 0); g.lineTo(0, r * 1.3); g.lineTo(-r, 0); g.closePath(); },
];
// per-Depth decorations so every Depth's foes look different
function drawDeco(style, r, c, t, big) {
  if (style === 'plain' || !style) return;
  g.save(); g.lineWidth = big ? 2.5 : 1.5; g.strokeStyle = c; g.fillStyle = c;
  if (style === 'coral') {
    for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i - 1) * 0.7, x0 = Math.cos(a) * r, y0 = Math.sin(a) * r, x1 = Math.cos(a) * r * 1.5, y1 = Math.sin(a) * r * 1.5;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.moveTo(lerp(x0, x1, 0.6), lerp(y0, y1, 0.6)); g.lineTo(x1 + Math.cos(a + 0.9) * r * 0.3, y1 + Math.sin(a + 0.9) * r * 0.3); g.stroke(); }
  } else if (style === 'lure') {
    g.beginPath(); g.moveTo(0, -r); g.quadraticCurveTo(r * 0.8, -r * 1.8, r * 0.4, -r * 1.6); g.stroke();
    g.globalCompositeOperation = 'lighter'; glow(r * 0.4, -r * 1.6, r * 0.9, c, 0.8 + Math.sin(t * 6) * 0.2); g.globalCompositeOperation = 'source-over';
  } else if (style === 'spiked') {
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + t * 0.3; g.beginPath(); g.moveTo(Math.cos(a - 0.15) * r, Math.sin(a - 0.15) * r); g.lineTo(Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.45); g.lineTo(Math.cos(a + 0.15) * r, Math.sin(a + 0.15) * r); g.fill(); }
  } else if (style === 'bone') {
    g.strokeStyle = 'rgba(255,255,255,0.75)';
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(0, i * r * 0.35, r * 0.6, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
  } else if (style === 'crystal') {
    g.strokeStyle = 'rgba(255,255,255,0.6)';
    g.beginPath(); for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + t * 0.5; g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); } g.stroke();
    g.strokeStyle = c; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; g.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35); } g.closePath(); g.globalAlpha *= 0.6; g.stroke();
  } else if (style === 'tentacle') {
    for (let i = 0; i < 4; i++) { const yo = (i - 1.5) * r * 0.45; g.beginPath(); g.moveTo(-r * 0.6, yo);
      for (let k = 1; k <= 4; k++) g.lineTo(-r * 0.6 - k * r * 0.35, yo + Math.sin(t * 6 + i + k) * r * 0.25); g.stroke(); }
  } else if (style === 'void') {
    g.setLineDash([4, 5]); g.lineDashOffset = -t * 30; g.beginPath(); g.arc(0, 0, r * 1.3, 0, TAU); g.globalAlpha *= 0.7; g.stroke(); g.setLineDash([]);
  }
  g.restore();
}
function drawEnemy(e) {
  const t = e.t;
  g.save(); g.translate(e.x, e.y);
  let alpha = 1;
  if (e.spawnT > 0) alpha = 1 - e.spawnT / 0.35;
  if (e.blinkT > 0) alpha = Math.abs(e.blinkT - 0.25) / 0.25;
  if (e.type === 'wraith') alpha *= 0.65 + Math.sin(t * 6) * 0.2;
  g.globalAlpha = clamp(alpha, 0, 1);
  const r = e.r * (1 + Math.sin(t * 5) * 0.04);
  if (e.boss) drawBossBody(e, r);
  else {
    const rot = e.d.shape === 4 ? t * 1.5 : e.d.shape === 3 || e.d.shape === 8 ? t * 0.5 : e.d.shape === 11 ? t : e.a;
    const style = e.type === 'gleamer' ? 'plain' : R.depth.style;
    if (e.marked) { g.beginPath(); g.arc(0, 0, r + 12 + Math.sin(t * 8) * 2, 0, TAU); g.strokeStyle = '#80ffb0'; g.lineWidth = 2; g.setLineDash([6, 4]); g.stroke(); g.setLineDash([]); }
    if (e.type === 'gleamer') { g.globalCompositeOperation = 'lighter'; glow(0, 0, r * 3, '#ffd040', 0.6 + Math.sin(t * 10) * 0.2); g.globalCompositeOperation = 'source-over'; }
    g.rotate(rot);
    if (e.state === 'wind' || e.aimT > 0) { g.translate(rand(-2, 2), rand(-2, 2)); }
    const sp = enemySprite(e, e.flash > 0 ? 1 : e.chill > 0 ? 2 : 0), k = r / Math.max(4, Math.round(e.r)), ws = sp.wsz * k;
    g.drawImage(sp, -ws / 2, -ws / 2, ws, ws);
  }
  g.restore();
  if (e.aimT > 0) { // sniper sight line
    g.strokeStyle = hexA('#ff3030', 0.25 + (0.85 - e.aimT) * 0.7); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(e.x + Math.cos(e.aimA) * 700, e.y + Math.sin(e.aimA) * 700); g.stroke();
  }
  if (e.state === 'wind' && e.cx !== undefined) { // telegraph line
    g.strokeStyle = hexA(e.boss ? '#ff4040' : '#ffd23b', 0.35 + Math.sin(e.t * 30) * 0.15); g.lineWidth = e.boss ? e.r * 1.4 : 4;
    g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(e.x + e.cx * (e.boss ? 300 : 170), e.y + e.cy * (e.boss ? 300 : 170)); g.stroke();
  }
}
function drawBossBody(e, r) {
  const t = e.t, c = e.color;
  if (e.enh > 1) {
    g.save(); g.rotate(-t * 0.7);
    g.strokeStyle = hexA('#ffd040', 0.75 + Math.sin(t * 5) * 0.2); g.lineWidth = 2.5;
    g.beginPath();
    for (let i = 0; i < 24; i++) { const a = i * TAU / 24, rr2 = r * (i % 2 ? 1.75 : 1.95); g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
    g.closePath(); g.stroke(); g.restore();
    g.globalCompositeOperation = 'lighter'; glow(0, 0, r * 2.4, '#ffd040', 0.25); g.globalCompositeOperation = 'source-over';
  }
  g.globalCompositeOperation = 'lighter'; glow(0, 0, r * 2.6, c, 0.45 + (e.enraged ? Math.sin(t * 10) * 0.15 : 0)); g.globalCompositeOperation = 'source-over';
  g.save(); if (R.depth.style !== 'tentacle' || e.kind === 'maw') g.rotate(e.kind === 'maw' ? 0 : e.a); drawDeco(R.depth.style, r * 1.05, c, t, true); g.restore();
  const fill = e.flash > 0 ? '#ffffff' : R.depth.style === 'void' ? '#050006' : mixHex(c, 0.8, '#08060f');
  g.lineWidth = 3; g.strokeStyle = c; g.fillStyle = fill;
  if (e.kind === 'eye') {
    for (let i = 0; i < 8; i++) { const a = t * 0.6 + i * TAU / 8; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); g.lineTo(Math.cos(a + 0.2) * r * 1.5, Math.sin(a + 0.2) * r * 1.5); g.stroke(); }
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.stroke();
    const pa = Math.atan2(R.p.y - e.y, R.p.x - e.x);
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(Math.cos(pa) * r * 0.35, Math.sin(pa) * r * 0.35, r * 0.45, r * 0.32, pa, 0, TAU); g.fill();
    g.fillStyle = c; g.beginPath(); g.arc(Math.cos(pa) * r * 0.45, Math.sin(pa) * r * 0.45, r * 0.18, 0, TAU); g.fill();
  } else if (e.kind === 'maw') {
    g.rotate(e.a);
    const open = e.state === 'wind' ? 0.7 : e.state === 'dash' ? 0.9 : 0.35 + Math.sin(t * 4) * 0.1;
    g.beginPath(); g.arc(0, 0, r, open, TAU - open); g.lineTo(r * 0.1, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffd0a0';
    for (let i = 0; i < 5; i++) { const a = open + i * 0.12; g.beginPath(); g.moveTo(Math.cos(a) * r, Math.sin(a) * r); g.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7 - 3); g.lineTo(Math.cos(a + 0.1) * r, Math.sin(a + 0.1) * r); g.fill(); }
    g.fillStyle = '#ff8040'; g.beginPath(); g.arc(-r * 0.3, -r * 0.45, r * 0.13, 0, TAU); g.fill();
  } else if (e.kind === 'tide') {
    g.rotate(t * 0.8);
    for (let i = 0; i < 3; i++) { g.rotate(TAU / 3); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(r * 1.2, r * 0.2, r * 1.3, r * 1.1); g.quadraticCurveTo(r * 0.5, r * 0.6, 0, 0); g.fill(); g.stroke(); }
    g.beginPath(); g.arc(0, 0, r * 0.6, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#c0f4ff'; g.beginPath(); g.arc(0, 0, r * 0.25, 0, TAU); g.fill();
  } else {
    const beat = 1 + Math.max(0, Math.sin(t * (e.enraged ? 9 : 6))) * 0.1;
    g.scale(beat, beat);
    g.beginPath(); g.moveTo(0, r * 0.95);
    g.bezierCurveTo(-r * 1.6, -r * 0.1, -r * 0.7, -r * 1.2, 0, -r * 0.45);
    g.bezierCurveTo(r * 0.7, -r * 1.2, r * 1.6, -r * 0.1, 0, r * 0.95); g.closePath(); g.fill(); g.stroke();
    for (let i = 0; i < 6; i++) { const a = t * 0.4 + i * TAU / 6; g.beginPath(); g.arc(Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35, 4, 0, TAU); g.fillStyle = c; g.fill(); }
    g.fillStyle = '#ffc0e0'; g.beginPath(); g.arc(0, 0, r * 0.2, 0, TAU); g.fill();
  }
}
function drawPlayer() {
  const p = R.p, c = R.spirit.color, t = R.t;
  if (p.inv > 0 && Math.floor(p.inv * 20) % 2 === 0) return;
  g.globalCompositeOperation = 'lighter';
  glow(p.x, p.y, 46 + Math.sin(t * 8) * 4, c, 0.55);
  glow(p.x, p.y, 20, '#ffffff', 0.5);
  g.globalCompositeOperation = 'source-over';
  g.save(); g.translate(p.x, p.y);
  // flame body (teardrop pointing opposite of movement)
  const a = Math.atan2(-p.fy, -p.fx) + Math.PI;
  g.rotate(a + Math.PI);
  g.beginPath(); g.moveTo(-p.r * 1.9 - Math.sin(t * 12) * 2, 0);
  g.quadraticCurveTo(-p.r * 0.3, -p.r * 1.1, p.r, 0);
  g.quadraticCurveTo(-p.r * 0.3, p.r * 1.1, -p.r * 1.9 - Math.sin(t * 12) * 2, 0);
  g.fillStyle = c; g.fill();
  g.beginPath(); g.arc(p.r * 0.1, 0, p.r * 0.72, 0, TAU); g.fillStyle = mixHex(c, 0.7); g.fill();
  g.beginPath(); g.arc(p.r * 0.2, 0, p.r * 0.38, 0, TAU); g.fillStyle = '#fff'; g.fill();
  g.restore();
}
function renderRun() {
  const p = R.p;
  const shk = R.overlay ? 0 : R.shake, sx = shk ? rand(-shk, shk) : 0, sy = shk ? rand(-shk, shk) : 0;
  const camX = R.cam.x - VW / 2 + sx, camY = R.cam.y - VH / 2 + sy;
  drawBackground(camX, camY, R.depth, R.t);
  g.save(); g.translate(-camX, -camY);
  const inView = (x, y, m) => x > camX - m && x < camX + VW + m && y > camY - m && y < camY + VH + m;
  // pickup radius hint
  g.beginPath(); g.arc(p.x, p.y, st.pickup, 0, TAU); g.strokeStyle = 'rgba(120,180,255,0.06)'; g.lineWidth = 1; g.stroke();
  // mines
  for (const m of R.mines) {
    const blink = m.arm > 0 ? 0.4 : 0.6 + Math.sin(R.t * 12) * 0.4;
    g.globalCompositeOperation = 'lighter'; glow(m.x, m.y, 16, m.c, blink); g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#2a0814'; g.strokeStyle = m.c; g.lineWidth = 2; g.beginPath(); g.arc(m.x, m.y, 6, 0, TAU); g.fill(); g.stroke();
  }
  // gems
  for (const gm of R.gems) {
    if (!inView(gm.x, gm.y, 20)) continue;
    const im = gemSprite(gm.v >= 20 ? 2 : gm.v >= 4 ? 1 : 0), hs = im.wsz / 2;
    g.drawImage(im, gm.x - hs, gm.y - hs, im.wsz, im.wsz);
  }
  // items
  for (const it of R.items) {
    const bob = Math.sin(it.t * 4) * 2;
    g.globalCompositeOperation = 'lighter';
    const col = it.k === 'heart' ? '#ff4060' : it.k === 'magnet' ? '#40a0ff' : it.k === 'coin' ? '#ffc030' : '#ffd040';
    glow(it.x, it.y + bob, it.k === 'chest' ? 30 : 16, col, 0.7);
    g.globalCompositeOperation = 'source-over';
    g.save(); g.translate(it.x, it.y + bob);
    if (it.k === 'heart') { g.fillStyle = '#ff5070'; g.beginPath(); g.moveTo(0, 6); g.bezierCurveTo(-10, -2, -5, -9, 0, -4); g.bezierCurveTo(5, -9, 10, -2, 0, 6); g.fill(); }
    else if (it.k === 'magnet') { g.strokeStyle = '#80c0ff'; g.lineWidth = 3.5; g.beginPath(); g.arc(0, 0, 6, Math.PI, 0, true); g.stroke(); g.fillStyle = '#fff'; g.fillRect(-7.7, -2, 3.5, 3); g.fillRect(4.2, -2, 3.5, 3); }
    else if (it.k === 'coin') { g.fillStyle = '#ffd050'; g.beginPath(); g.moveTo(0, -6); g.lineTo(5, 0); g.lineTo(0, 6); g.lineTo(-5, 0); g.closePath(); g.fill(); g.fillStyle = '#fff6c0'; g.fillRect(-1, -2, 2, 4); }
    else { g.fillStyle = '#5a3810'; g.strokeStyle = '#ffd040'; g.lineWidth = 2; rr(-10, -7, 20, 14, 3); g.fill(); g.stroke(); g.fillStyle = '#ffd040'; g.fillRect(-2, -3, 4, 5); }
    g.restore();
  }
  // shrines
  for (const sh of R.shrines) {
    const c = SHRINES[sh.type].color, f = sh.charge / 2.2;
    g.globalCompositeOperation = 'lighter'; glow(sh.x, sh.y, 70, c, 0.35 + f * 0.4); g.globalCompositeOperation = 'source-over';
    g.beginPath(); g.arc(sh.x, sh.y, 46, 0, TAU); g.strokeStyle = hexA(c, 0.5); g.lineWidth = 2; g.setLineDash([8, 6]); g.lineDashOffset = -sh.t * 20; g.stroke(); g.setLineDash([]);
    if (f > 0) { g.beginPath(); g.arc(sh.x, sh.y, 52, -Math.PI / 2, -Math.PI / 2 + TAU * f); g.strokeStyle = c; g.lineWidth = 4; g.stroke(); }
    g.save(); g.translate(sh.x, sh.y + Math.sin(sh.t * 2) * 3);
    g.fillStyle = '#10121e'; g.strokeStyle = c; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -22); g.lineTo(12, 0); g.lineTo(0, 22); g.lineTo(-12, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = c; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill();
    g.restore();
    if (sh.life < 8 && Math.floor(sh.life * 4) % 2) { g.globalAlpha = 0.5; }
    text(sh.type === 'trial' ? 'TRIAL' : sh.type === 'fortune' ? 'FORTUNE' : sh.type === 'swift' ? 'WIND' : 'FURY', sh.x, sh.y - 36, 10, c);
    g.globalAlpha = 1;
  }
  // hazards (telegraphs and beams)
  for (const h of R.hazards) {
    if (h.k === 'zone') {
      if (h.tele > 0) { const f = 1 - h.tele / 1.1; g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.fillStyle = hexA('#ff2040', 0.08 + f * 0.18); g.fill(); g.strokeStyle = hexA('#ff4060', 0.6); g.lineWidth = 2; g.stroke();
        g.beginPath(); g.arc(h.x, h.y, h.r * clamp(f, 0, 1), 0, TAU); g.strokeStyle = '#ff6080'; g.stroke(); }
      else { g.globalCompositeOperation = 'lighter'; glow(h.x, h.y, h.r * 1.8, h.c, h.life * 3); g.globalCompositeOperation = 'source-over'; }
    } else {
      const x1 = h.x + Math.cos(h.a) * h.len, y1 = h.y + Math.sin(h.a) * h.len;
      if (h.tele > 0) { g.strokeStyle = hexA('#ff2040', 0.25 + Math.sin(R.t * 30) * 0.12); g.lineWidth = h.k === 'aim' ? 1.5 : h.w * 0.35; }
      else { g.globalCompositeOperation = 'lighter'; g.strokeStyle = hexA(h.c, Math.min(1, h.life * 4)); g.lineWidth = h.w; }
      g.beginPath(); g.moveTo(h.x, h.y); g.lineTo(x1, y1); g.stroke();
      if (h.tele <= 0) { g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = h.w * 0.3; g.stroke(); g.globalCompositeOperation = 'source-over'; }
    }
  }
  // singularities
  for (const h of R.holes) {
    g.globalCompositeOperation = 'lighter'; glow(h.x, h.y, h.r * 0.7, '#c070ff', 0.35); g.globalCompositeOperation = 'source-over';
    g.beginPath(); g.arc(h.x, h.y, 26, 0, TAU); g.fillStyle = '#050008'; g.fill();
    g.strokeStyle = '#c070ff'; g.lineWidth = 2;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(h.x, h.y, 34 + i * 16, R.t * (3 - i) + i, R.t * (3 - i) + i + 2.2); g.stroke(); }
  }
  // searing aura / inferno
  const aw = R.weapons.find(w => w.id === 'aura');
  if (aw && !R.dead) { const rad = WEAPONS.aura.s(aw.lvl).radius * Math.sqrt(st.area); g.globalCompositeOperation = 'lighter'; glow(p.x, p.y, rad * 1.15, '#ff6a3a', 0.22 + Math.sin(R.t * 5) * 0.05); g.globalCompositeOperation = 'source-over';
    g.beginPath(); g.arc(p.x, p.y, rad, 0, TAU); g.strokeStyle = 'rgba(255,120,60,0.25)'; g.lineWidth = 2; g.stroke(); }
  if (R.inferno > 0) { const rad = R.infernoR * st.area; g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) { const a = i * TAU / 18 + R.t * 2; glow(p.x + Math.cos(a) * rad, p.y + Math.sin(a) * rad, 18 + Math.sin(R.t * 12 + i) * 4, '#ff6a30', 0.8); }
    g.globalCompositeOperation = 'source-over'; }
  // enemies
  for (const e of R.enemies) { if (!e.dead && inView(e.x, e.y, e.r + 60)) drawEnemy(e); }
  // darkness: only your flame lights the deep (bullets, shots and the player stay visible on top)
  if (twist('dark')) {
    const fl = 1 + Math.sin(R.t * 7) * 0.02, inner = 105 * fl, outer = 300 * fl;
    const gr = g.createRadialGradient(p.x, p.y, inner, p.x, p.y, outer);
    gr.addColorStop(0, 'rgba(1,2,8,0)'); gr.addColorStop(1, 'rgba(1,2,8,0.88)');
    g.fillStyle = gr; g.fillRect(camX - 20, camY - 20, VW + 40, VH + 40);
  }
  // player shots
  g.globalCompositeOperation = 'lighter';
  for (const s of R.shots) {
    if (!inView(s.x, s.y, 30)) continue;
    if (s.k === 'crescent') {
      glow(s.x, s.y, s.r * 2.4, s.c, 0.8);
      g.save(); g.translate(s.x, s.y); g.rotate(s.spin); g.fillStyle = s.c;
      g.beginPath(); g.arc(0, 0, s.r * 1.2, 0, Math.PI * 1.3); g.arc(s.r * 0.35, -s.r * 0.15, s.r * 0.85, Math.PI * 1.3, 0, true); g.fill(); g.restore();
      continue;
    }
    if (s.k === 'rico') {
      glow(s.x, s.y, 14, s.c, 0.9);
      g.save(); g.translate(s.x, s.y); g.rotate(s.spin); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -6); g.lineTo(4, 0); g.lineTo(0, 6); g.lineTo(-4, 0); g.closePath(); g.fill(); g.restore();
      continue;
    }
    glow(s.x, s.y, s.k === 'shard' ? 11 : 14, s.c, 0.9);
    g.strokeStyle = s.c; g.lineWidth = s.r * 0.9; g.lineCap = 'round';
    const sp = Math.hypot(s.vx, s.vy) || 1;
    g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x - s.vx / sp * (s.k === 'shard' ? 9 : 12), s.y - s.vy / sp * (s.k === 'shard' ? 9 : 12)); g.stroke();
  }
  // enemy bullets
  g.globalCompositeOperation = 'source-over';
  for (const b of R.ebul) {
    if (!inView(b.x, b.y, 20)) continue;
    const im = bulletImg(b.c, b.r); g.drawImage(im, b.x - im.half, b.y - im.half, im.half * 2, im.half * 2);
  }
  // orbit orbs
  const ow = R.weapons.find(w => w.id === 'orbit');
  if (ow && !R.dead) {
    const s = WEAPONS.orbit.s(ow.lvl), n = s.count + st.extra + (R.spirit.orbs || 0), rad = s.radius * Math.sqrt(st.area);
    g.beginPath(); g.arc(p.x, p.y, rad, 0, TAU); g.strokeStyle = 'rgba(200,144,255,0.1)'; g.lineWidth = 2; g.stroke();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) { const a = R.orbitA + i * TAU / n; glow(p.x + Math.cos(a) * rad, p.y + Math.sin(a) * rad, 20, '#c890ff', 0.9); glow(p.x + Math.cos(a) * rad, p.y + Math.sin(a) * rad, 7, '#ffffff', 0.9); }
    g.globalCompositeOperation = 'source-over';
  }
  // player
  if (!R.dead) drawPlayer();
  if (R.aegis > 0 && !R.dead) { g.beginPath(); g.arc(p.x, p.y, 30, 0, TAU); g.strokeStyle = hexA('#ffe080', 0.6 + Math.sin(R.t * 12) * 0.3); g.lineWidth = 3; g.stroke(); g.globalCompositeOperation = 'lighter'; glow(p.x, p.y, 40, '#ffe080', 0.3); g.globalCompositeOperation = 'source-over'; }
  if (R.ward && !R.dead) { g.beginPath(); g.arc(p.x, p.y, 22, 0, TAU); g.strokeStyle = 'rgba(160,192,255,0.55)'; g.lineWidth = 1.5; g.stroke(); }
  if (save.tidebreaker && !R.dead) drawCrown(p.x, p.y - 22, 0.8);
  // fx
  g.globalCompositeOperation = 'lighter';
  for (const f of R.fx) {
    if (f.k === 'ring') { g.strokeStyle = hexA(f.c, Math.min(1, f.life * 3)); g.lineWidth = 6 * f.life + 2; g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.stroke(); }
    else if (f.k === 'boom') { const k = 1 - f.life / f.max; glow(f.x, f.y, f.r * (0.6 + k * 0.6) * 1.6, f.c, (1 - k) * 0.9); }
    else if (f.k === 'beam') { const a = f.life / f.max; g.strokeStyle = hexA(f.c, a); g.lineWidth = f.w * (0.6 + a * 0.6); g.lineCap = 'round'; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x1, f.y1); g.stroke(); g.strokeStyle = hexA('#ffffff', a); g.lineWidth = f.w * 0.3; g.stroke(); }
    else if (f.k === 'mark') { const a = 1 - f.life / f.max; g.strokeStyle = hexA(f.c, 0.4 + a * 0.5); g.lineWidth = 2; g.beginPath(); g.arc(f.x, f.y, f.r * (1.4 - a * 0.4), 0, TAU); g.stroke(); glow(f.x, f.y - (1 - a) * 160, 14, '#ffffff', a); }
    else if (f.k === 'arc') {
      g.strokeStyle = hexA(f.c, Math.min(1, f.life * 7)); g.lineWidth = 2.5; g.beginPath();
      for (let i = 0; i < f.pts.length - 1; i++) {
        const [x0, y0] = f.pts[i], [x1, y1] = f.pts[i + 1];
        g.moveTo(x0, y0);
        for (let k = 1; k <= 4; k++) { const tt = k / 5; g.lineTo(lerp(x0, x1, tt) + rand(-7, 7), lerp(y0, y1, tt) + rand(-7, 7)); }
        g.lineTo(x1, y1);
      }
      g.stroke();
      for (const pt of f.pts) glow(pt[0], pt[1], 14, f.c, 0.6);
    }
  }
  // particles
  for (const q of R.parts) { if (inView(q.x, q.y, 10)) glow(q.x, q.y, q.s * 2.5, q.c, Math.max(0, q.life / q.max)); }
  g.globalCompositeOperation = 'source-over';
  // floating texts
  for (const t of R.texts) { g.globalAlpha = Math.min(1, t.life * 2.5); g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.font = `bold ${t.s}px sans-serif`; g.textAlign = 'center'; g.strokeText(t.str, t.x, t.y); text(t.str, t.x, t.y, t.s, t.c); }
  g.globalAlpha = 1;
  g.restore();
  // vignette (in device pixels)
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(getVignette(), 0, 0); g.restore();
  if (R.hurtFlash > 0) { g.fillStyle = `rgba(255,30,40,${R.hurtFlash * 0.5})`; g.fillRect(0, 0, VW, VH); }
  if (R.flash > 0) { g.fillStyle = `rgba(255,255,255,${R.flash * 2})`; g.fillRect(0, 0, VW, VH); }
  if (R.warp > 0) { g.fillStyle = 'rgba(60,110,255,0.10)'; g.fillRect(0, 0, VW, VH); }
  drawArrows(camX, camY);
  if (!R.dead && p.hp < st.maxHp * 0.3) { const a = 0.12 + Math.sin(R.t * 6) * 0.08; g.strokeStyle = `rgba(255,30,40,${a})`; g.lineWidth = 30; g.strokeRect(0, 0, VW, VH); }
  drawHUD();
  if (R.overlay) drawOverlay();
}
function drawCrown(x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.globalCompositeOperation = 'lighter'; glow(0, 0, 22, '#ffd040', 0.45); g.globalCompositeOperation = 'source-over';
  g.beginPath(); g.moveTo(-11, 5); g.lineTo(-13, -7); g.lineTo(-5, -1); g.lineTo(0, -10); g.lineTo(5, -1); g.lineTo(13, -7); g.lineTo(11, 5); g.closePath();
  g.fillStyle = '#ffd040'; g.fill(); g.strokeStyle = '#fff2b0'; g.lineWidth = 1; g.stroke();
  g.fillStyle = '#ff3060'; g.beginPath(); g.arc(0, 0, 2, 0, TAU); g.fill();
  g.restore();
}
// arrows at the screen edge pointing to shrines, gleamers and bounty targets
function drawArrows(camX, camY) {
  const tg = [];
  for (const sh of R.shrines) tg.push([sh.x, sh.y, SHRINES[sh.type].color]);
  for (const e of R.enemies) if (!e.dead && (e.type === 'gleamer' || e.marked)) tg.push([e.x, e.y, e.type === 'gleamer' ? '#ffd040' : '#80ffb0']);
  for (const [x, y, c] of tg) {
    const sx = x - camX, sy = y - camY;
    if (sx > 0 && sx < VW && sy > 0 && sy < VH) continue;
    const cx = VW / 2, cy = VH / 2, a = Math.atan2(sy - cy, sx - cx);
    const m = 26, k = Math.min((VW / 2 - m) / Math.abs(Math.cos(a) || 1e-6), (VH / 2 - m - 40) / Math.abs(Math.sin(a) || 1e-6));
    const ax = cx + Math.cos(a) * k, ay = cy + Math.sin(a) * k;
    g.save(); g.translate(ax, ay); g.rotate(a);
    g.globalAlpha = 0.75 + Math.sin(R.t * 6) * 0.25;
    g.fillStyle = c; g.beginPath(); g.moveTo(12, 0); g.lineTo(-6, 8); g.lineTo(-2, 0); g.lineTo(-6, -8); g.closePath(); g.fill();
    g.restore(); g.globalAlpha = 1;
  }
}
function bar(x, y, w, h, f, c1, c2) {
  rr(x, y, w, h, h / 2); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fill();
  if (f > 0) { rr(x, y, Math.max(h, w * clamp(f, 0, 1)), h, h / 2); const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fill(); }
  rr(x, y, w, h, h / 2); g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1; g.stroke();
}
function drawHUD() {
  const p = R.p, top = 8;
  // xp bar
  bar(10, top, VW - 70, 9, p.xp / p.xpNext, '#ffe070', '#ff9a30');
  text('LV ' + p.level, 12, top + 22, 14, '#ffe6a0', 'left');
  // hp
  bar(10, top + 34, 150, 13, p.hp / st.maxHp, '#ff7080', '#c02040');
  text(Math.ceil(p.hp) + ' / ' + st.maxHp, 85, top + 41, 10, '#fff');
  text('✦ ' + fmt(R.kills), 12, top + 62, 13, '#c8b8ff', 'left');
  text('◆ ' + Math.floor(R.embersFound), 80, top + 62, 13, '#ffd050', 'left');
  // wave
  text(R.wave ? 'WAVE ' + R.wave + (R.wave <= FINAL_WAVE && !R.endless ? ' / ' + FINAL_WAVE : '') : 'GET READY', VW / 2 + 40, top + 24, 15, '#bcd4ff');
  if (R.waveActive && !R.boss) {
    const left = R.toSpawn + R.enemies.length;
    text(left + ' foes', VW / 2 + 40, top + 41, 11, '#8898c0', 'center', 'normal');
  }
  if (R.combo >= 10) text(R.combo + ' CHAIN', VW - 14, top + 62, 13 + Math.min(8, R.combo / 25), '#ffb060', 'right');
  // pause button
  if (!R.overlay) button(VW - 52, 4, 44, 40, '❚❚', () => { R.overlay = 'pause'; R.overlayT = 0; SFX.play('click'); stopJoy(); }, { size: 15, color: '#8aa0ff', radius: 10 });
  // boss bar
  if (R.boss) {
    const b = R.boss, bw = VW - 40;
    text(b.name.toUpperCase(), VW / 2, top + 84, 13, b.color);
    bar(20, top + 94, bw, 10, b.hp / b.maxHp, mixHex(b.color, 0.3), b.color);
  }
  // weapons
  let x = 10; const y = VH - 30;
  for (const w of R.weapons) {
    const d = WEAPONS[w.id];
    rr(x, y - 16, 34, 34, 8); g.fillStyle = 'rgba(10,12,30,0.6)'; g.fill(); g.strokeStyle = hexA(d.color, 0.5); g.lineWidth = 1; g.stroke();
    drawIcon('weapon', w.id, x + 17, y - 1, 20, d.color);
    for (let i = 0; i < 5; i++) { g.fillStyle = i < w.lvl ? d.color : 'rgba(255,255,255,0.15)'; g.fillRect(x + 3 + i * 6, y + 13, 4, 3); }
    x += 38;
  }
  x += 4;
  for (const id in R.passives) { drawIcon('passive', id, x + 9, y + 2, 18, PASSIVES[id].color); text(R.passives[id], x + 17, y + 13, 9, '#fff'); x += 22; if (x > VW - 30) break; }
  if (R.relics.length) { let rx = VW - 18, ry = y - 30; for (const k of R.relics) { drawIcon('relic', k, rx, ry, 16, relicDef(k).color); rx -= 20; if (rx < VW - 200) { rx = VW - 18; ry -= 20; } } }
  // ability buttons (bottom right)
  R.abilities.forEach((ab, i) => {
    const d = ABILITIES[ab.id], cx = VW - 40 - i * 66, cy = VH - 124, rad = 27, ready = ab.cd <= 0;
    button(cx - rad - 4, cy - rad - 4, rad * 2 + 8, rad * 2 + 8, '', () => useAbility(i), { invisible: true });
    g.beginPath(); g.arc(cx, cy, rad, 0, TAU); g.fillStyle = ready ? hexA(d.color, 0.22) : 'rgba(10,12,30,0.7)'; g.fill();
    g.lineWidth = ready ? 2.5 : 1.5; g.strokeStyle = ready ? hexA(d.color, 0.7 + Math.sin(R.t * 5) * 0.3) : 'rgba(255,255,255,0.2)'; g.stroke();
    drawIcon('ability', ab.id, cx, cy, 30, ready ? d.color : '#667');
    if (!ready) {
      const f = ab.cd / (d.cd[ab.lvl] * st.abilCd);
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + TAU * f); g.closePath(); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fill();
      text(Math.ceil(ab.cd), cx, cy, 14, '#fff');
    }
    for (let k = 0; k < 3; k++) { g.fillStyle = k < ab.lvl ? d.color : 'rgba(255,255,255,0.2)'; g.fillRect(cx - 10 + k * 7, cy + rad + 4, 5, 3); }
  });
  // buffs
  let bx = 12;
  for (const k in R.buffs) if (R.buffs[k] > 0) { const c = SHRINES[k].color; rr(bx, top + 72, 56, 16, 8); g.fillStyle = hexA(c, 0.25); g.fill(); text((k === 'power' ? 'FURY ' : 'WIND ') + Math.ceil(R.buffs[k]), bx + 28, top + 80, 10, c); bx += 60; }
  // bounty / trial
  let qy = R.boss ? top + 118 : top + 56;
  if (R.bounty) {
    const b = R.bounty;
    rr(VW / 2 - 90 + 40, qy, 180, 30, 8); g.fillStyle = 'rgba(10,30,20,0.7)'; g.fill(); g.strokeStyle = 'rgba(128,255,176,0.5)'; g.lineWidth = 1; g.stroke();
    text('BOUNTY · ' + bountyText(), VW / 2 + 40, qy + 11, 10, '#80ffb0');
    bar(VW / 2 - 80 + 40, qy + 20, 160, 5, b.t / b.max, '#80ffb0', '#40c080');
    qy += 34;
  }
  if (R.trial) { text('TRIAL: slay the champions (' + R.trial.ids.size + ' left) ' + Math.ceil(R.trial.t) + 's', VW / 2 + 40, qy + 8, 10, '#c070ff'); }
  // banner
  if (R.banner && !R.overlay) {
    const b = R.banner, a = Math.min(1, b.t * 1.5, ((b.max || 3) - b.t) * 3 + 0.3);
    g.globalAlpha = clamp(a, 0, 1);
    g.globalCompositeOperation = 'lighter'; glow(VW / 2, VH * 0.3, 150, b.color, 0.25); g.globalCompositeOperation = 'source-over';
    text(b.text, VW / 2, VH * 0.3, 32, '#fff', 'center', 'bold', 'Georgia, serif');
    if (b.sub) text(b.sub, VW / 2, VH * 0.3 + 30, 14, b.color, 'center', 'normal');
    g.globalAlpha = 1;
  }
  if (R.tutorial > 0 && R.wave <= 1) {
    g.globalAlpha = Math.min(1, R.tutorial);
    panel(30, VH * 0.62, VW - 60, 74, '#ffa040', 0.75);
    text('Drag anywhere to move', VW / 2, VH * 0.62 + 20, 16, '#fff');
    text('Attacks fire automatically', VW / 2, VH * 0.62 + 40, 13, '#ffd0a0', 'center', 'normal');
    text('Collect shards to grow stronger', VW / 2, VH * 0.62 + 58, 13, '#9ec8ff', 'center', 'normal');
    g.globalAlpha = 1;
  }
  // hints
  if (R.hints && R.hints.length && !R.overlay) {
    const h = R.hints[0], d = HINTS[h.k]; h.t -= 1 / 60;
    if (h.t <= 0) R.hints.shift();
    else {
      g.globalAlpha = Math.min(1, h.t * 2, (8.5 - h.t) * 4);
      const hy = VH - 230; panel(24, hy, VW - 48, 54, d[2], 0.88);
      text(d[0].toUpperCase(), VW / 2, hy + 16, 11, d[2]);
      wrap(d[1], VW / 2, hy + 35, VW - 70, 12.5, '#e8ecff', 15);
      g.globalAlpha = 1;
    }
  }
  // joystick
  if (joy.active && !R.overlay) {
    g.beginPath(); g.arc(joy.ox, joy.oy, 46, 0, TAU); g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 2; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.05)'; g.fill();
    g.beginPath(); g.arc(joy.ox + joy.dx * 46, joy.oy + joy.dy * 46, 18, 0, TAU); g.fillStyle = 'rgba(255,200,140,0.35)'; g.fill();
  }
}

// ---------- overlays ----------
function dim(a) { g.fillStyle = `rgba(4,6,16,${a})`; g.fillRect(0, 0, VW, VH); }
function choiceCard(x, y, w, h, info, onClick, appear) {
  const b = button(x, y, w, h, '', onClick, { color: info.color });
  const k = appear;
  g.save(); g.globalAlpha = k;
  drawIcon(info.kind, info.id || info.iconId, x + 34, y + h / 2, 34, info.color);
  text(info.tag, x + 66, y + 18, 10, info.color, 'left');
  text(info.name, x + 66, y + 36, 17, '#fff', 'left');
  wrap(info.desc, x + 66, y + 56, w - 80, 12, '#c4cce8', 15, 'left');
  if (info.max) for (let i = 0; i < info.max; i++) { g.fillStyle = i < info.lvl ? info.color : 'rgba(255,255,255,0.15)'; rr(x + w - 14 - (info.max - i) * 11, y + 12, 8, 8, 2); g.fill(); }
  g.restore();
  return b;
}
function drawOverlay() {
  const ot = R.overlayT || 0, k = Math.min(1, ot * 4);
  if (R.overlay === 'level') {
    dim(0.8 * k);
    g.globalCompositeOperation = 'lighter'; glow(VW / 2, 120, 160, '#ffb040', 0.3 * k); g.globalCompositeOperation = 'source-over';
    text('LEVEL UP', VW / 2, 105, 34, '#ffe0a0', 'center', 'bold', 'Georgia, serif');
    text('Level ' + R.p.level + ' — choose a gift of flame', VW / 2, 135, 13, '#c8b8a0', 'center', 'normal');
    const n = R.choices.length, gap = 10, ch = Math.min(96, Math.floor((VH - 230) / n) - gap), total = n * ch + (n - 1) * gap;
    let y = Math.max(155, VH / 2 - total / 2 + 10);
    if (R.banishMode) text('Tap a choice to banish it for this run', VW / 2, y - 10, 12, '#ff8080');
    R.choices.forEach((c, i) => {
      const info = choiceInfo(c); info.id = c.id;
      const ap = clamp(ot * 5 - i * 0.4, 0, 1);
      choiceCard(20 + (1 - ap) * 40, y, VW - 40, ch, info, () => {
        if (ot <= 0.35) return;
        if (R.banishMode && (c.t === 'weapon' || c.t === 'passive' || c.t === 'ability')) {
          R.banished.add(c.t + ':' + c.id); R.banishes--; R.banishMode = false; genChoices(); R.overlayT = 0.3; SFX.play('deny');
        } else { R.banishMode = false; applyChoice(c); }
      }, ap);
      y += ch + gap;
    });
    const bw = R.banishes > 0 && R.rerolls > 0 ? 150 : 170;
    if (R.rerolls > 0) button(R.banishes > 0 ? VW / 2 - bw - 6 : VW / 2 - bw / 2, y + 4, bw, 42, 'Reroll (' + R.rerolls + ')', () => { R.rerolls--; R.banishMode = false; genChoices(); SFX.play('click'); R.overlayT = 0.3; }, { size: 14, color: '#8aa0ff' });
    if (R.banishes > 0) button(R.rerolls > 0 ? VW / 2 + 6 : VW / 2 - bw / 2, y + 4, bw, 42, R.banishMode ? 'Cancel banish' : 'Banish (' + R.banishes + ')', () => { R.banishMode = !R.banishMode; SFX.play('click'); }, { size: 14, color: '#ff7070' });
    if (R.pending > 1) text('+' + (R.pending - 1) + ' more', VW / 2, y + 62, 12, '#ffd080');
  } else if (R.overlay === 'relic') {
    dim(0.7 * k);
    g.globalCompositeOperation = 'lighter'; glow(VW / 2, 120, 160, '#60e0ff', 0.3 * k); g.globalCompositeOperation = 'source-over';
    const chest = R.relicSrc === 'chest';
    text(chest ? 'LEGENDARY TREASURE' : 'RELIC OF THE DEEP', VW / 2, 105, chest ? 26 : 28, chest ? '#ffe08a' : '#c0f0ff', 'center', 'bold', 'Georgia, serif');
    text(chest ? 'The chest holds something extraordinary.' : 'The Warden leaves a treasure. Choose one.', VW / 2, 135, 13, '#9ab', 'center', 'normal');
    let y = 170;
    R.relicChoices.forEach((id, i) => {
      const d = relicDef(id), leg = !!LEGENDS[id]; const ap = clamp(ot * 5 - i * 0.4, 0, 1);
      if (leg) { if (!(save.hints && save.hints.legend)) { save.hints = save.hints || {}; save.hints.legend = 1; persist(); }
        g.globalCompositeOperation = 'lighter'; glow(VW / 2, y + 48, 190, '#ffc030', 0.25 + Math.sin(menuT * 4) * 0.1); g.globalCompositeOperation = 'source-over'; }
      choiceCard(20, y, VW - 40, 96, { name: d.name, desc: d.desc, color: d.color, tag: leg ? '★ LEGENDARY RELIC ★' : 'RELIC', kind: 'relic', id }, () => {
        if (ot < 0.35) return;
        R.relics.push(id); recalc(); SFX.play('select'); R.overlay = null;
      }, ap);
      y += 108;
    });
  } else if (R.overlay === 'pause') {
    dim(0.75);
    text('PAUSED', VW / 2, 80, 32, '#fff', 'center', 'bold', 'Georgia, serif');
    text(R.spirit.name + ' · ' + R.depth.name + ' · ' + Math.floor(R.t / 60) + ':' + String(Math.floor(R.t % 60)).padStart(2, '0'), VW / 2, 110, 13, '#9ab', 'center', 'normal');
    let y = 140;
    panel(20, y, VW - 40, 210);
    text('YOUR BUILD', VW / 2, y + 18, 12, '#ffd080');
    let yy = y + 44;
    for (const w of R.weapons) { const d = WEAPONS[w.id]; drawIcon('weapon', w.id, 46, yy, 22, d.color); text(d.name + '  Lv ' + w.lvl, 66, yy, 14, '#fff', 'left'); yy += 28; }
    let px = 40, py = y + 170;
    for (const id in R.passives) { drawIcon('passive', id, px, py, 20, PASSIVES[id].color); text(R.passives[id], px + 9, py + 10, 9, '#fff'); px += 26; if (px > VW - 40) { px = 40; py += 24; } }
    let rx = VW / 2 + 20; yy = y + 44;
    for (const ab of R.abilities) { const d = ABILITIES[ab.id]; drawIcon('ability', ab.id, rx, yy, 18, d.color); text(d.name + ' ' + ab.lvl, rx + 14, yy, 11, d.color, 'left'); yy += 22; }
    for (const kk of R.relics.slice(0, 6 - R.abilities.length)) { const d = relicDef(kk); drawIcon('relic', kk, rx, yy, 18, d.color); text(d.name, rx + 14, yy, 11, d.color, 'left'); yy += 22; }
    if (R.relics.length > 6 - R.abilities.length) text('+' + (R.relics.length - 6 + R.abilities.length) + ' more relics', rx + 14, yy, 10, '#9ab', 'left');
    y = 370;
    button(VW / 2 - 110, y, 220, 54, 'Resume', () => { R.overlay = null; R.quitConfirm = false; SFX.play('click'); }, { size: 20 });
    button(VW / 2 - 110, y + 66, 105, 44, 'Music ' + Math.round(save.settings.music * 10), () => { save.settings.music = (Math.round(save.settings.music * 10) + 2) % 12 / 10; if (save.settings.music > 1) save.settings.music = 0; SFX.setVolumes(save.settings.music, save.settings.sfx); persist(); SFX.play('click'); }, { size: 13, color: '#8aa0ff' });
    button(VW / 2 + 5, y + 66, 105, 44, 'Sound ' + Math.round(save.settings.sfx * 10), () => { save.settings.sfx = (Math.round(save.settings.sfx * 10) + 2) % 12 / 10; if (save.settings.sfx > 1) save.settings.sfx = 0; SFX.setVolumes(save.settings.music, save.settings.sfx); persist(); SFX.play('click'); }, { size: 13, color: '#8aa0ff' });
    button(VW / 2 - 110, y + 122, 220, 44, R.quitConfirm ? 'Tap again to abandon' : 'Abandon run', () => { if (R.quitConfirm) { R.quitConfirm = false; finishRun(false); } else { R.quitConfirm = true; SFX.play('click'); } }, { size: 14, color: '#ff6060' });
  } else if (R.overlay === 'tidebreaker') {
    dim(0.8 * k);
    g.globalCompositeOperation = 'lighter'; glow(VW / 2, 170, 260, '#ffc030', 0.45 * k); glow(VW / 2, 170, 120, '#ff3060', 0.3 * k); g.globalCompositeOperation = 'source-over';
    drawCrown(VW / 2, 120, 3);
    text('TIDEBREAKER', VW / 2, 190, 36, '#ffe6a0', 'center', 'bold', 'Georgia, serif');
    text('Wave ' + TIDEBREAKER_WAVE + ' of ' + DEPTHS[DEPTHS.length - 1].name + ' survived', VW / 2, 222, 14, '#ffb0a0', 'center', 'normal');
    wrap(R.tbFirst ? 'The deepest tide breaks before your flame. You earn the Tidebreaker Crown, the secret spirit Aurora awakens, and 5,000 Embers await you.' : 'You have broken the tide once more. +800 Embers.', VW / 2, 268, VW - 70, 14, '#e4d8c8', 20);
    button(VW / 2 - 120, 380, 240, 56, 'Keep Going', () => { R.overlay = null; SFX.play('select'); }, { size: 18, color: '#ffd060' });
    button(VW / 2 - 120, 450, 240, 50, 'Return in Glory', () => finishRun(true), { size: 16, color: '#ff8060' });
  } else if (R.overlay === 'victory') {
    dim(0.7 * k);
    g.globalCompositeOperation = 'lighter'; glow(VW / 2, 150, 220, '#ffd060', 0.4 * k); g.globalCompositeOperation = 'source-over';
    text('DEPTH CLEARED', VW / 2, 140, 32, '#ffe6a0', 'center', 'bold', 'Georgia, serif');
    text(R.depth.name + ' is calm once more.', VW / 2, 175, 14, '#c8b8a0', 'center', 'normal');
    wrap('The Heart of the Deep is extinguished. You may return to the Hearth with your Embers, or dive on into the endless tide for greater rewards.', VW / 2, 230, VW - 70, 14, '#c4cce8', 20);
    button(VW / 2 - 120, 340, 240, 56, 'Return Victorious', () => { finishRun(true); }, { size: 18, color: '#ffd060' });
    button(VW / 2 - 120, 410, 240, 56, 'Endless Tide', () => { R.endless = true; R.victory = true; R.overlay = null; SFX.play('select'); }, { size: 18, color: '#ff6080', sub: 'keep the victory bonus' });
  } else if (R.overlay === 'over') {
    const res = R.result;
    dim(0.8 * k);
    const title = res.victory ? 'TRIUMPH' : 'THE FLAME FADES';
    text(title, VW / 2, 70, res.victory ? 34 : 28, res.victory ? '#ffe6a0' : '#ffb0a0', 'center', 'bold', 'Georgia, serif');
    text('Wave ' + R.wave + ' · Level ' + R.p.level + ' · ' + Math.floor(R.t / 60) + 'm ' + Math.floor(R.t % 60) + 's · Best chain ' + R.bestCombo, VW / 2, 100, 12, '#9ab', 'center', 'normal');
    panel(24, 120, VW - 48, 52 + res.parts.length * 26);
    let y = 142;
    for (const [label, v] of res.parts) { text(label, 44, y, 14, '#c4cce8', 'left', 'normal'); text('+' + v, VW - 44, y, 14, '#fff', 'right'); y += 26; }
    text('Multiplier', 44, y, 14, '#c4cce8', 'left', 'normal'); text('x' + res.mult.toFixed(2), VW - 44, y, 14, '#9ec8ff', 'right');
    y += 44;
    const shown = Math.floor(res.total * Math.min(1, ot / 1.2));
    g.globalCompositeOperation = 'lighter'; glow(VW / 2, y, 90, '#ffb030', 0.35); g.globalCompositeOperation = 'source-over';
    text('◆ ' + fmt(shown) + ' Embers', VW / 2, y, 26, '#ffd050');
    y += 34;
    if (res.unlocks.length) {
      text('UNLOCKED', VW / 2, y, 12, '#80ffb0'); y += 20;
      for (const u of res.unlocks) { text(u, VW / 2, y, 15, '#fff'); y += 20; }
    }
    y = Math.max(y + 10, VH - 210);
    button(VW / 2 - 120, y, 240, 54, 'Dive Again', () => { newRun(); SFX.play('select'); }, { size: 19 });
    button(VW / 2 - 120, y + 64, 115, 46, 'Hearth', () => { R = null; go('hearth'); }, { size: 15, color: '#ffd060' });
    button(VW / 2 + 5, y + 64, 115, 46, 'Menu', () => { R = null; go('title'); }, { size: 15, color: '#8aa0ff' });
  }
}

// ================= MENUS =================
function menuBackground(dt) {
  drawBackground(menuT * 6, menuT * 3, DEPTHS[save.selDepth] || DEPTHS[0], menuT);
  g.globalCompositeOperation = 'lighter';
  for (const m of motes) {
    m.y -= m.v * dt; m.p += dt;
    if (m.y < -10) { m.y = VH + 10; m.x = rand(VW); }
    glow(m.x + Math.sin(m.p) * 8, m.y, m.s * 5, '#ff9040', 0.35 + Math.sin(m.p * 2) * 0.2);
  }
  g.globalCompositeOperation = 'source-over';
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(getVignette(), 0, 0); g.restore();
}
function drawTitle() {
  const cy = VH * 0.24;
  g.globalCompositeOperation = 'lighter';
  glow(VW / 2, cy - 10, 170 + Math.sin(menuT * 2) * 10, '#ff8a30', 0.35);
  glow(VW / 2, cy + 50, 26 + Math.sin(menuT * 7) * 3, '#ffd090', 0.9);
  g.globalCompositeOperation = 'source-over';
  // flame mark
  g.save(); g.translate(VW / 2, cy + 52);
  g.beginPath(); g.moveTo(0, -30 - Math.sin(menuT * 9) * 3); g.quadraticCurveTo(16, -4, 9, 10); g.quadraticCurveTo(0, 16, -9, 10); g.quadraticCurveTo(-16, -4, 0, -30 - Math.sin(menuT * 9) * 3);
  g.fillStyle = '#ffb050'; g.fill(); g.beginPath(); g.arc(0, 4, 5, 0, TAU); g.fillStyle = '#fff'; g.fill();
  g.restore();
  text('EMBERWAKE', VW / 2, cy, 46, '#ffe8c8', 'center', 'bold', 'Georgia, serif');
  text(save.tidebreaker ? 'Tidebreaker' : 'a flame against the endless tide', VW / 2, cy + 98, 14, save.tidebreaker ? '#ffd040' : '#c8a890', 'center', 'italic', 'Georgia, serif');
  if (save.tidebreaker) drawCrown(VW / 2, cy - 44, 1.4);
  let y = VH * 0.47;
  button(VW / 2 - 120, y, 240, 62, 'EMBARK', () => go('embark'), { size: 24 });
  button(VW / 2 - 120, y + 74, 240, 54, 'The Hearth', () => go('hearth'), { size: 18, color: '#ffd060', sub: '◆ ' + fmt(save.embers) + ' Embers' });
  button(VW / 2 - 120, y + 140, 115, 46, 'Codex', () => go('codex'), { size: 15, color: '#8aa0ff' });
  button(VW / 2 + 5, y + 140, 115, 46, 'Settings', () => go('settings'), { size: 15, color: '#8aa0ff' });
  if (UPD.state === 'available' && !UPD.open) {
    const pulse = 0.6 + Math.sin(menuT * 4) * 0.4;
    g.globalAlpha = 0.75 + pulse * 0.25;
    button(VW / 2 - 110, y + 200, 220, 40, 'Update ready: v' + UPD.info.versionName, () => { UPD.open = true; SFX.play('click'); }, { size: 13, color: '#60d090' });
    g.globalAlpha = 1;
  }
  const s = save.stats;
  text('Best wave ' + s.bestWave + '  ·  Depths cleared ' + save.depthCleared + '/' + DEPTHS.length + '  ·  Foes ' + fmt(s.kills), VW / 2, VH - 46, 11, '#7888b0', 'center', 'normal');
  const tips = ['Shrines grant blessings. Stand inside to activate.', 'Catch the golden Gleamer before it escapes.', 'Bounties reward treasure chests.', 'Legendary relics are rare. Relic Sense helps.', 'Abilities appear on level up from level 3.', 'Wardens appear every 5 waves and drop relics.', 'Golden-ringed elites may carry treasure chests.', 'Spend Embers at the Hearth for permanent power.', 'Clear wave 20 to unlock a deeper, richer Depth.', 'New spirits awaken as you reach milestones.', 'Chill slows foes; mines and novas reward kiting.'];
  text(tips[Math.floor(menuT / 5) % tips.length], VW / 2, VH - 26, 11, '#a08870', 'center', 'italic');
}
function cycleSpirit(d) {
  const i = SPIRITS.findIndex(s => s.id === save.selSpirit);
  save.selSpirit = SPIRITS[(i + d + SPIRITS.length) % SPIRITS.length].id; persist(); SFX.play('click');
}
function drawSpiritOrb(sp, x, y, r, locked) {
  const c = locked ? '#404660' : sp.color;
  g.globalCompositeOperation = 'lighter'; if (!locked) glow(x, y, r * 3.2, c, 0.45 + Math.sin(menuT * 3) * 0.08); g.globalCompositeOperation = 'source-over';
  g.save(); g.translate(x, y);
  g.beginPath(); g.moveTo(0, -r * 1.9 - Math.sin(menuT * 10) * 3); g.quadraticCurveTo(r * 1.1, -r * 0.3, r * 0.8, r * 0.5); g.quadraticCurveTo(0, r * 1.2, -r * 0.8, r * 0.5); g.quadraticCurveTo(-r * 1.1, -r * 0.3, 0, -r * 1.9 - Math.sin(menuT * 10) * 3);
  g.fillStyle = c; g.fill();
  g.beginPath(); g.arc(0, r * 0.15, r * 0.6, 0, TAU); g.fillStyle = locked ? '#2a2e40' : mixHex(c, 0.7); g.fill();
  if (!locked) { g.beginPath(); g.arc(0, r * 0.2, r * 0.3, 0, TAU); g.fillStyle = '#fff'; g.fill(); }
  else text('?', 0, r * 0.15, r * 0.8, '#7880a0');
  g.restore();
}
function drawEmbark() {
  text('CHOOSE YOUR SPIRIT', VW / 2, 40, 20, '#ffe0c0', 'center', 'bold', 'Georgia, serif');
  const sp = SPIRITS.find(s => s.id === save.selSpirit) || SPIRITS[0];
  const locked = !save.unlocked[sp.id];
  panel(20, 64, VW - 40, 300, locked ? null : sp.color);
  drawSpiritOrb(sp, VW / 2, 140, 26, locked);
  text(locked ? '???' : sp.name, VW / 2, 200, 26, locked ? '#7880a0' : '#fff', 'center', 'bold', 'Georgia, serif');
  if (locked) {
    text('LOCKED', VW / 2, 230, 13, '#ff8080');
    wrap(sp.unlock.text, VW / 2, 256, VW - 90, 14, '#c4cce8', 18);
  } else {
    const wd = WEAPONS[sp.weapon];
    drawIcon('weapon', sp.weapon, VW / 2 - 70, 232, 22, wd.color);
    text(wd.name, VW / 2 - 54, 232, 14, wd.color, 'left');
    wrap(sp.trait, VW / 2, 260, VW - 80, 13, '#c4cce8', 17);
    const stat = (label, v, y) => { text(label, 50, y, 12, '#9ab', 'left', 'normal'); bar(110, y - 5, VW - 170, 10, v, mixHex(sp.color, 0.4), sp.color); };
    stat('Health', sp.hp / 130, 300); stat('Speed', sp.speed / 1.2, 318); stat('Power', sp.dmg / 1.3, 336);
  }
  // dots
  SPIRITS.forEach((s, i) => { g.beginPath(); g.arc(VW / 2 + (i - (SPIRITS.length - 1) / 2) * 16, 352, s.id === sp.id ? 4 : 2.5, 0, TAU); g.fillStyle = save.unlocked[s.id] ? s.color : '#445'; g.fill(); });
  button(24, 110, 44, 60, '‹', () => cycleSpirit(-1), { size: 30, color: '#8aa0ff' });
  button(VW - 68, 110, 44, 60, '›', () => cycleSpirit(1), { size: 30, color: '#8aa0ff' });
  // depth
  const di = save.selDepth, d = DEPTHS[di], dLocked = di > save.depthCleared;
  const y = 382;
  text('DEPTH ' + (di + 1), VW / 2, y + 10, 12, d.tint);
  panel(20, y + 22, VW - 40, 108, dLocked ? null : d.tint);
  text(d.name, VW / 2, y + 46, 20, dLocked ? '#7880a0' : '#fff', 'center', 'bold', 'Georgia, serif');
  if (dLocked) text('Clear Depth ' + di + ' to unlock', VW / 2, y + 76, 13, '#ff9090', 'center', 'normal');
  else {
    text(di === 0 ? 'The gentle beginning.' : 'Foes +' + Math.round((d.hp - 1) * 100) + '% HP, +' + Math.round((d.dmg - 1) * 100) + '% dmg, fire ' + Math.round((d.fire - 1) * 100) + '% faster', VW / 2, y + 72, 11.5, '#c4cce8', 'center', 'normal');
    const best = save.best['d' + di] || 0;
    text('Embers x' + d.embers.toFixed(1) + '  ·  ' + (best ? 'Best wave ' + best + (save.depthCleared > di ? ' ✓' : '') : 'Not yet attempted'), VW / 2, y + 92, 12, '#ffd050');
    text(d.intro, VW / 2, y + 112, 11, d.tint === '#e8e8ff' ? '#c8c8f0' : mixHex(d.tint, 0.35), 'center');
    if (d.pal) d.pal.forEach((c, i) => { g.save(); g.translate(30 + i * 14, y + 10); g.globalAlpha = 0.9; SHAPES[i % 7](4.5); g.fillStyle = c; g.fill(); g.restore(); });
    if (di === DEPTHS.length - 1) text(save.tidebreaker ? '♛ Tidebreaker' : '♛ wave ' + TIDEBREAKER_WAVE + ' = reward', VW - 24, y + 10, 10, '#ffd040', 'right');
  }
  button(24, y + 46, 40, 56, '‹', () => { save.selDepth = Math.max(0, di - 1); persist(); SFX.play('click'); }, { size: 26, color: '#8aa0ff', disabled: di === 0 });
  button(VW - 64, y + 46, 40, 56, '›', () => { save.selDepth = Math.min(DEPTHS.length - 1, di + 1); persist(); SFX.play('click'); }, { size: 26, color: '#8aa0ff', disabled: di === DEPTHS.length - 1 });
  const by = Math.max(y + 150, VH - 140);
  button(VW / 2 - 120, by, 240, 62, 'BEGIN', () => { if (!locked && !dLocked) { SFX.play('select'); newRun(); } }, { size: 24, disabled: locked || dLocked });
  button(VW / 2 - 70, by + 74, 140, 44, 'Back', () => go('title'), { size: 15, color: '#8aa0ff' });
}
function hearthCard(h, x, y, cw, ch) {
  const r = hR(h.id), maxed = r >= h.max, cost = hearthCost(h, r), afford = save.embers >= cost, locked = save.depthCleared < (h.req || 0);
  if (locked) { // sealed until enough Depths are cleared
    button(x, y, cw, ch, '', () => { SFX.play('deny'); showToast('Clear Depth ' + h.req + ' to unlock ' + h.name, '#ff9090'); }, { color: '#3a3e55' });
    g.globalAlpha = 0.55; text(h.name, x + 10, y + 14, 13.5, '#aab', 'left'); g.globalAlpha = 1;
    drawLock(x + cw - 20, y + 16);
    text('Clear Depth ' + h.req, x + 10, y + ch - 13, 11.5, '#ff9a90', 'left');
    if (r) text('Rank ' + r + ' still active', x + cw - 10, y + ch - 13, 10, '#8898c0', 'right', 'normal');
    return;
  }
  button(x, y, cw, ch, '', () => {
    if (maxed) { SFX.play('deny'); return; }
    if (!afford) { SFX.play('deny'); showToast('Need ' + fmt(cost - save.embers) + ' more Embers', '#ff9090'); return; }
    save.embers -= cost; save.hearth[h.id] = r + 1; persist(); SFX.play('buy');
  }, { color: maxed ? '#60d090' : afford ? '#ffb040' : '#606888' });
  text(h.name, x + 10, y + 14, 13.5, '#fff', 'left');
  const pw = Math.min(12, (cw - 20) / h.max);
  for (let k = 0; k < h.max; k++) { g.fillStyle = k < r ? '#ffb040' : 'rgba(255,255,255,0.14)'; g.fillRect(x + 10 + k * pw, y + 25, Math.min(9, pw - 2), 4); }
  wrap(h.desc(Math.max(r, 1)) + (r && !maxed ? ' → ' + h.desc(r + 1).replace(/^[^0-9-+]*/, '') : ''), x + 10, y + 39, cw - 16, 10.5, '#b4bcd8', 12, 'left');
  text(maxed ? 'MAX' : '◆ ' + fmt(cost), x + cw - 10, y + ch - 11, 12.5, maxed ? '#60d090' : afford ? '#ffd050' : '#8a7060', 'right');
}
function drawLock(x, y) {
  g.strokeStyle = '#8a90b0'; g.lineWidth = 2; g.beginPath(); g.arc(x, y - 3, 5, Math.PI, 0); g.stroke();
  g.fillStyle = '#8a90b0'; rr(x - 7, y - 3, 14, 11, 2); g.fill();
}
function drawHearth() {
  text('THE HEARTH', VW / 2, 32, 24, '#ffe0c0', 'center', 'bold', 'Georgia, serif');
  g.globalCompositeOperation = 'lighter'; glow(VW / 2, 60, 60, '#ffb030', 0.3); g.globalCompositeOperation = 'source-over';
  text('◆ ' + fmt(save.embers) + ' Embers', VW / 2, 60, 18, '#ffd050');
  const tabs = ['Hearth', 'Deep Hearth', 'Soul Forge'], tab = save.hearthTab || 0;
  tabs.forEach((t, i) => button(12 + i * ((VW - 24) / 3), 80, (VW - 24) / 3 - 6, 34, t, () => { save.hearthTab = i; SFX.play('click'); }, { size: 12.5, color: i === tab ? '#ffb040' : '#606888' }));
  const cols = 2, gap = 8, cw = (VW - 24 - gap) / cols, top = 124;
  if (tab < 2) {
    const list = tab === 0 ? HEARTH : HEARTH2, rows = Math.ceil(list.length / 2);
    const ch = Math.min(80, (VH - top - 76) / 6 - gap);
    list.forEach((h, i) => hearthCard(h, 12 + (i % cols) * (cw + gap), top + Math.floor(i / cols) * (ch + gap), cw, ch));
    if (tab === 1) wrap('The Deep Hearth holds rarer powers for seasoned flames.', VW / 2, top + rows * (ch + gap) + 14, VW - 60, 11, '#8898c0', 14);
  } else {
    const r = save.forge || 0, cost = forgeCost(r), afford = save.embers >= cost;
    const y = top + 10;
    if (save.depthCleared < FORGE_REQ) {
      panel(20, y, VW - 40, 200, null);
      drawLock(VW / 2, y + 60);
      text('THE SOUL FORGE IS COLD', VW / 2, y + 100, 16, '#c0c4d8', 'center', 'bold', 'Georgia, serif');
      wrap('Clear Depth ' + FORGE_REQ + ' to kindle it. Each rank permanently adds +2% damage and +2% max HP.' + (r ? ' Your ' + r + ' ranks stay active.' : ''), VW / 2, y + 132, VW - 80, 12, '#9aa0bc', 16);
      button(VW / 2 - 70, VH - 62, 140, 46, 'Back', () => go('title'), { size: 16, color: '#8aa0ff' });
      return;
    }
    panel(20, y, VW - 40, 300, '#ff8030');
    g.globalCompositeOperation = 'lighter'; glow(VW / 2, y + 90, 110 + Math.sin(menuT * 3) * 8, '#ff7020', 0.5); glow(VW / 2, y + 90, 40, '#ffe0a0', 0.8); g.globalCompositeOperation = 'source-over';
    text('SOUL FORGE', VW / 2, y + 30, 18, '#ffd0a0', 'center', 'bold', 'Georgia, serif');
    text('Rank ' + r, VW / 2, y + 90, 34, '#fff', 'center', 'bold', 'Georgia, serif');
    text('+' + (2 * r) + '% damage  ·  +' + (2 * r) + '% max HP', VW / 2, y + 140, 14, '#ffd080');
    wrap('Endless ranks. Each one adds +2% damage and +2% max HP to every spirit, forever.', VW / 2, y + 172, VW - 80, 12, '#b4bcd8', 16);
    button(VW / 2 - 110, y + 216, 220, 58, 'Stoke the Forge', () => {
      if (!afford) { SFX.play('deny'); showToast('Need ' + fmt(cost - save.embers) + ' more Embers', '#ff9090'); return; }
      save.embers -= cost; save.forge = r + 1; persist(); SFX.play('buy');
    }, { size: 18, color: afford ? '#ff8030' : '#606888', sub: '◆ ' + fmt(cost) });
  }
  button(VW / 2 - 70, VH - 62, 140, 46, 'Back', () => go('title'), { size: 16, color: '#8aa0ff' });
}
function drawCodex() {
  text('CODEX', VW / 2, 32, 24, '#ffe0c0', 'center', 'bold', 'Georgia, serif');
  const tabs = ['Weapons', 'Powers', 'Relics', 'Spirits', 'Records'];
  const tab = Math.min(save.codexTab || 0, tabs.length - 1), tw = (VW - 24) / tabs.length;
  tabs.forEach((t, i) => button(12 + i * tw, 54, tw - 4, 34, t, () => { save.codexTab = i; SFX.play('click'); }, { size: 11.5, color: i === tab ? '#ffb040' : '#606888', radius: 9 }));
  let y = 108;
  const row = (kind, id, color, name, desc, h) => { drawIcon(kind, id, 28, y + 8, 20, color); text(name, 46, y + 2, 13, color === '#ffffff' ? '#fff' : color, 'left'); text(desc, 46, y + 17, 10.5, '#b4bcd8', 'left', 'normal'); y += h; };
  if (tab === 0) {
    for (const id of WEAPON_IDS) row('weapon', id, WEAPONS[id].color, WEAPONS[id].name, WEAPONS[id].lv[1], 33);
    wrap('Passives: ' + PASSIVE_IDS.map(k => PASSIVES[k].name).join(', ') + '.', VW / 2, y + 8, VW - 40, 11, '#8898c0', 14);
  } else if (tab === 1) {
    text('ABILITIES · tap the buttons in a run (2 slots)', VW / 2, y, 11, '#ffd080'); y += 16;
    for (const id of ABILITY_IDS) row('ability', id, ABILITIES[id].color, ABILITIES[id].name + '  (' + ABILITIES[id].cd[1] + 's)', ABILITIES[id].lv[1], 31);
    y += 6; text('LEGENDARY RELICS · rare finds', VW / 2, y, 11, '#ffd040'); y += 16;
    for (const id of LEGEND_IDS) row('relic', id, '#ffd040', LEGENDS[id].name, LEGENDS[id].desc, 29);
  } else if (tab === 2) {
    for (const id of RELIC_IDS) row('relic', id, RELICS[id].color, RELICS[id].name, RELICS[id].desc, 30);
  } else if (tab === 3) {
    for (const sp of SPIRITS) {
      const u = save.unlocked[sp.id];
      text(u ? sp.name : '???', 30, y + 2, 14, u ? sp.color : '#667', 'left');
      text(u ? WEAPONS[sp.weapon].name + ' · ' + sp.trait : 'Locked: ' + sp.unlock.text, 30, y + 19, 10.5, u ? '#b4bcd8' : '#8898c0', 'left', 'normal');
      y += 40;
    }
  } else {
    const s = save.stats;
    const rows = [['Runs', s.runs], ['Foes slain', fmt(s.kills)], ['Wardens slain', s.bosses], ['Best wave', s.bestWave], ['Best level', s.bestLevel], ['Bounties completed', s.bounties || 0], ['Shrines activated', s.shrines || 0], ['Soul Forge rank', save.forge || 0], ['Lifetime Embers', fmt(save.lifetimeEmbers)], ['Time in the deep', Math.floor(s.playTime / 60) + ' min']];
    for (const [a, b] of rows) { text(a, 36, y, 13, '#b4bcd8', 'left', 'normal'); text(String(b), VW - 36, y, 13, '#fff', 'right'); y += 23; }
    y += 8;
    DEPTHS.forEach((d, i) => { text((i + 1) + '. ' + d.name, 36, y, 12, i < save.depthCleared ? d.tint : i <= save.depthCleared ? '#aab' : '#556', 'left'); text((i < save.depthCleared ? '✓ ' : '') + 'best wave ' + (save.best['d' + i] || 0), VW - 36, y, 11, '#8898c0', 'right', 'normal'); y += 19; });
    y += 10;
    if (save.tidebreaker) { drawCrown(VW / 2 - 70, y, 0.9); text('TIDEBREAKER', VW / 2 + 10, y, 14, '#ffd040'); }
    else text('Survive wave ' + TIDEBREAKER_WAVE + ' in ' + DEPTHS[DEPTHS.length - 1].name + ' for a legendary reward', VW / 2, y, 10.5, '#a08870', 'center', 'italic');
  }
  button(VW / 2 - 70, VH - 62, 140, 46, 'Back', () => go('title'), { size: 16, color: '#8aa0ff' });
}
function drawSettings() {
  text('SETTINGS', VW / 2, 40, 24, '#ffe0c0', 'center', 'bold', 'Georgia, serif');
  const s = save.settings;
  let y = 90;
  const vol = (label, key) => {
    text(label, 30, y + 22, 16, '#fff', 'left');
    button(VW - 170, y, 46, 44, '−', () => { s[key] = Math.max(0, Math.round(s[key] * 10 - 1) / 10); SFX.setVolumes(s.music, s.sfx); persist(); SFX.play('click'); }, { size: 22, color: '#8aa0ff' });
    text(Math.round(s[key] * 10), VW - 97, y + 22, 18, '#ffd080');
    button(VW - 72, y, 46, 44, '+', () => { s[key] = Math.min(1, Math.round(s[key] * 10 + 1) / 10); SFX.setVolumes(s.music, s.sfx); persist(); SFX.play('click'); }, { size: 22, color: '#8aa0ff' });
    y += 58;
  };
  vol('Music', 'music'); vol('Sound effects', 'sfx');
  const tog = (label, key) => {
    text(label, 30, y + 22, 16, '#fff', 'left');
    button(VW - 130, y, 104, 44, s[key] ? 'ON' : 'OFF', () => { s[key] = !s[key]; persist(); SFX.play('click'); }, { size: 15, color: s[key] ? '#60d090' : '#606888' });
    y += 58;
  };
  tog('Screen shake', 'shake'); tog('Damage numbers', 'numbers');
  const qv = s.quality == null ? 1 : s.quality;
  text('Graphics', 30, y + 22, 16, '#fff', 'left');
  button(VW - 170, y, 144, 44, ['Performance', 'Balanced', 'High'][qv], () => { s.quality = (qv + 1) % 3; autoBudget = Infinity; persist(); resize(); SFX.play('click'); }, { size: 14, color: ['#60d090', '#8aa0ff', '#ffb040'][qv] });
  y += 58;
  y += 10;
  if (window.Android && window.Android.pinShortcut) {
    button(30, y, VW - 60, 50, 'Add icon to Home screen', () => { try { window.Android.pinShortcut(); showToast('Check your home screen!'); } catch (e) { } SFX.play('click'); }, { size: 15, color: '#ffb040' });
    y += 62;
  }
  if (hasUpdater()) {
    const label = UPD.state === 'checking' ? 'Checking…' : UPD.state === 'available' ? 'Update to v' + UPD.info.versionName : 'Check for updates';
    button(30, y, VW - 60, 50, label, () => { SFX.play('click'); if (UPD.state === 'available') UPD.open = true; else checkForUpdate(true); }, { size: 15, color: '#60d090', sub: 'Installed: v' + appVersion() });
    y += 62;
  }
  button(30, y, VW - 60, 50, confirmReset > 0 ? 'Tap again to ERASE all progress' : 'Reset progress', () => {
    if (confirmReset > 0) { const keep = save.settings; save = defaultSave(); save.settings = keep; persist(); confirmReset = 0; showToast('Progress erased'); }
    else { confirmReset = 3; SFX.play('click'); }
  }, { size: 14, color: '#ff6060' });
  text('Emberwake v' + appVersion() + ' · made with flame and code', VW / 2, VH - 90, 11, '#667', 'center', 'normal');
  button(VW / 2 - 70, VH - 62, 140, 46, 'Back', () => go('title'), { size: 16, color: '#8aa0ff' });
}

// ================= UPDATES =================
const UPD = { state: 'idle', info: null, open: false, progress: 0, msg: '', checked: false, manual: false, dismissed: 0 };
function hasUpdater() { return !!(window.Android && window.Android.checkUpdate); }
function appVersion() { try { return window.Android.getVersionName(); } catch (e) { return '1.2'; } }
function checkForUpdate(manual) {
  if (!hasUpdater() || UPD.state === 'checking' || UPD.state === 'downloading' || UPD.state === 'installing') return;
  UPD.state = 'checking'; UPD.manual = manual; UPD.msg = '';
  try { window.Android.checkUpdate(); } catch (e) { UPD.state = 'idle'; }
}
window.onUpdateInfo = function (info) {
  let cur = 0; try { cur = window.Android.getVersionCode(); } catch (e) { }
  if (info && info.versionCode > cur && info.apk) {
    UPD.info = info; UPD.state = 'available';
    if (UPD.manual || UPD.dismissed !== info.versionCode) UPD.open = true;
  } else { UPD.state = 'latest'; if (UPD.manual) showToast("You're on the latest version", '#80ffb0'); }
};
window.onUpdateProgress = function (f, done) { UPD.progress = f; if (done) UPD.state = 'installing'; };
window.onUpdateError = function (msg, quiet) {
  UPD.state = UPD.info ? 'available' : 'idle'; UPD.msg = msg;
  if (!quiet || UPD.manual) showToast(msg, '#ff9090');
};
function startUpdate() {
  persist(); // make sure the latest progress is saved before the app is replaced
  UPD.state = 'downloading'; UPD.progress = 0; UPD.msg = '';
  try { window.Android.downloadUpdate(UPD.info.apk); } catch (e) { window.onUpdateError('Update failed to start.'); }
}
function drawUpdateModal() {
  const info = UPD.info; if (!info) { UPD.open = false; return; }
  button(0, 0, VW, VH, '', () => { }, { invisible: true }); // blocks taps on the menu behind
  dim(0.72);
  const notes = info.notes || [];
  const w = VW - 40, x = 20;
  g.font = 'normal 12.5px sans-serif';
  const noteH = notes.map(n => { let lines = 1, line = ''; for (const wd of ('• ' + n).split(' ')) { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > w - 44 && line) { lines++; line = wd; } else line = t; } return Math.max(34, lines * 15 + 8); });
  const h = 200 + noteH.reduce((a, b) => a + b, 0), y = Math.max(20, VH / 2 - h / 2);
  panel(x, y, w, h, '#ffb040', 0.97);
  g.globalCompositeOperation = 'lighter'; glow(VW / 2, y + 34, 90, '#ffb040', 0.3); g.globalCompositeOperation = 'source-over';
  text('UPDATE AVAILABLE', VW / 2, y + 32, 22, '#ffe0c0', 'center', 'bold', 'Georgia, serif');
  text('v' + appVersion() + '  →  v' + info.versionName, VW / 2, y + 58, 14, '#ffd050');
  let yy = y + 88;
  notes.forEach((n, i) => { wrap('• ' + n, x + 22, yy, w - 44, 12.5, '#c4cce8', 15, 'left'); yy += noteH[i]; });
  text('Your progress is kept.', VW / 2, yy + 4, 12, '#80ffb0', 'center', 'normal');
  const by = y + h - 76;
  if (UPD.state === 'downloading') {
    bar(x + 30, by + 8, w - 60, 14, UPD.progress, '#ffe070', '#ff9a30');
    text('Downloading… ' + Math.round(UPD.progress * 100) + '%', VW / 2, by + 42, 13, '#ffd080');
  } else if (UPD.state === 'installing') {
    text('Confirm the update in the Android prompt', VW / 2, by + 10, 13, '#ffd080');
    button(VW / 2 - 60, by + 26, 120, 40, 'Close', () => { UPD.open = false; UPD.state = 'available'; SFX.play('click'); }, { size: 14, color: '#8aa0ff' });
  } else {
    if (UPD.msg) text(UPD.msg, VW / 2, by - 12, 11, '#ff9090', 'center', 'normal');
    button(x + 20, by + 4, w / 2 - 26, 52, 'Later', () => { UPD.open = false; UPD.dismissed = info.versionCode; SFX.play('click'); }, { size: 16, color: '#8aa0ff' });
    button(VW / 2 + 6, by + 4, w / 2 - 26, 52, 'Update now', () => { SFX.play('select'); startUpdate(); }, { size: 16, color: '#ffb040' });
  }
}

// ================= MAIN LOOP =================
let lastT = performance.now(), paused = false;
let perfT = 0, slowFrames = 0, perfFrames = 0;
function frame(now) {
  requestAnimationFrame(frame);
  // cap at ~60 fps on 90/120 Hz screens: there is no benefit in drawing more often
  if (now - lastT < 14) return;
  const raw = (now - lastT) / 1000, dt = Math.min(0.05, Math.max(0, raw)); lastT = now;
  try { step(dt); } catch (err) { console.error(err); }
  // if a run keeps dropping below ~45 fps, quietly lower the resolution (down to the Performance budget)
  if (scene === 'run' && R && !R.overlay && raw < 0.25) {
    perfT += raw; perfFrames++; if (raw > 0.022) slowFrames++;
    if (perfT > 4) {
      if (slowFrames / perfFrames > 0.4 && Math.min(autoBudget, PIXEL_BUDGET[save.settings.quality == null ? 1 : save.settings.quality]) > PIXEL_BUDGET[0]) {
        autoBudget = Math.max(PIXEL_BUDGET[0], cvs.width * cvs.height * 0.7); resize();
      }
      perfT = 0; slowFrames = 0; perfFrames = 0;
    }
  }
}
function step(dt) {
  if (paused) return;
  menuT += dt;
  if (toast) { toast.t -= dt; if (toast.t <= 0) toast = null; }
  if (confirmReset > 0) confirmReset -= dt;
  buttons = [];
  g.setTransform(DPR * S, 0, 0, DPR * S, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  if (scene === 'run' && R) {
    const reps = window.__speed || 1;
    for (let i = 0; i < reps && R && scene === 'run'; i++) updateRun(dt);
    if (R && scene === 'run') renderRun();
  } else {
    if (scene === 'run') scene = 'title';
    menuBackground(dt);
    if (scene === 'title') drawTitle();
    else if (scene === 'embark') drawEmbark();
    else if (scene === 'hearth') drawHearth();
    else if (scene === 'codex') drawCodex();
    else if (scene === 'settings') drawSettings();
    if (!UPD.checked && menuT > 1.5) { UPD.checked = true; checkForUpdate(false); }
    if (UPD.open) drawUpdateModal();
  }
  if (toast) {
    g.globalAlpha = Math.min(1, toast.t * 2);
    g.font = 'bold 14px sans-serif'; const tw = g.measureText(toast.text).width + 30;
    panel(VW / 2 - tw / 2, VH - 130, tw, 36, toast.color, 0.95); text(toast.text, VW / 2, VH - 112, 14, toast.color);
    g.globalAlpha = 1;
  }
}

// ---------- Android / lifecycle hooks ----------
window.handleBack = function () {
  if (UPD.open && scene !== 'run') { if (UPD.state !== 'downloading') UPD.open = false; return true; }
  if (scene === 'run' && R) {
    if (!R.overlay && !R.dead) { R.overlay = 'pause'; R.overlayT = 0; stopJoy(); return true; }
    if (R.overlay === 'pause') { R.overlay = null; return true; }
    return true;
  }
  if (scene !== 'title') { go('title'); return true; }
  return false;
};
window.onAppPause = function () {
  if (scene === 'run' && R && !R.overlay && !R.dead) { R.overlay = 'pause'; R.overlayT = 0; }
  stopJoy();
  persist(); SFX.suspend();
};
window.onAppResume = function () { SFX.resume(); lastT = performance.now(); };
document.addEventListener('visibilitychange', () => { if (document.hidden) window.onAppPause(); else window.onAppResume(); });

requestAnimationFrame(frame);
