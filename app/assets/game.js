'use strict';
// ================= EMBERWAKE =================
const cvs = document.getElementById('c');
const g = cvs.getContext('2d');
let W = 0, H = 0, DPR = 1, S = 1, VW = 400, VH = 720;
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  if (W * H * DPR * DPR > 3200000) DPR = Math.sqrt(3200000 / (W * H));
  cvs.width = Math.floor(W * DPR); cvs.height = Math.floor(H * DPR);
  cvs.style.width = W + 'px'; cvs.style.height = H + 'px';
  S = W / 400; if (H / S < 660) S = H / 660;
  VW = W / S; VH = H / S;
}
window.addEventListener('resize', resize);
resize();

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
    settings: { music: 0.6, sfx: 0.8, shake: true, numbers: true }, selSpirit: 'ember', selDepth: 0, seenTutorial: false, askedPin: false };
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
const glowCache = {};
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
    }
  } else if (kind === 'heal') {
    g.beginPath(); g.moveTo(0, k * 0.8); g.bezierCurveTo(-k * 1.3, -k * 0.1, -k * 0.6, -k * 1.1, 0, -k * 0.4); g.bezierCurveTo(k * 0.6, -k * 1.1, k * 1.3, -k * 0.1, 0, k * 0.8); g.fill();
  } else if (kind === 'cache') {
    g.beginPath(); g.moveTo(0, -k); g.lineTo(k * 0.7, 0); g.lineTo(0, k); g.lineTo(-k * 0.7, 0); g.closePath(); g.fill();
  } else if (kind === 'relic') {
    g.beginPath(); g.moveTo(0, -k); g.lineTo(k * 0.8, -k * 0.2); g.lineTo(0, k); g.lineTo(-k * 0.8, -k * 0.2); g.closePath(); g.globalAlpha = 0.35; g.fill(); g.globalAlpha = 1; g.stroke();
    g.beginPath(); g.moveTo(-k * 0.8, -k * 0.2); g.lineTo(k * 0.8, -k * 0.2); g.stroke();
  } else {
    g.beginPath(); g.arc(0, 0, k * 0.85, 0, TAU); g.globalAlpha = 0.25; g.fill(); g.globalAlpha = 1; g.stroke();
    text(PASSIVES[id] ? PASSIVES[id].name[0] : '?', 0, 1, s * 0.6, color);
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
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if (e.key === 'Escape') handleBack(); SFX.init(); });
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
  if (R.boss) return 'boss';
  return R.wave >= 11 ? 'deep' : 'run';
}
function go(s) { scene = s; SFX.play('click'); SFX.music(currentMusic()); }
function showToast(t, color) { toast = { t: 2.6, text: t, color: color || '#ffd080' }; }

// ================= RUN =================
let R = null;
const st = {}; // computed stats
const xpFor = L => Math.floor(6 + 4.2 * L + 0.3 * L * L);
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
    eid: 1, result: null, tutorial: !save.seenTutorial ? 9 : 0, combo: 0, comboT: 0, bestCombo: 0, cleared: 0,
  };
  addWeapon(spirit.weapon);
  if (spirit.relic) R.relics.push(pick(RELIC_IDS.filter(k => k !== 'coin')));
  recalc(); R.p.hp = st.maxHp;
  save.stats.runs++; persist();
  stopJoy();
  scene = 'run';
  SFX.music('run'); SFX.setIntensity(1);
}
function recalc() {
  const P = k => R.passives[k] || 0, has = hasRelic, sp = R.spirit;
  const oldMax = st.maxHp || 0;
  st.maxHp = Math.round((sp.hp + 10 * hR('vit') + 20 * P('vigor') + (has('titan') ? 60 : 0)) * (has('glass') ? 0.75 : 1));
  st.speed = 120 * sp.speed * (1 + 0.03 * hR('haste') + 0.08 * P('swift') + (has('quick') ? 0.15 : 0) - (has('titan') ? 0.06 : 0));
  st.dmg = sp.dmg * (1 + 0.04 * hR('might') + 0.10 * P('fury') + (has('glass') ? 0.4 : 0) + (has('prism') ? 0.1 : 0));
  st.cdm = (1 - 0.03 * hR('cel')) * (1 - 0.07 * P('alacrity')) * (has('hourglass') ? 0.85 : 1) * (has('quick') ? 0.92 : 1);
  st.pickup = 55 * (1 + 0.12 * hR('mag') + 0.30 * P('reach')) * (has('lode') ? 2 : 1);
  st.regen = 0.2 * hR('regen') + 0.5 * P('mending');
  st.crit = 0.05 + 0.07 * P('precision') + (has('lantern') ? 0.1 : 0);
  st.critMult = has('lantern') ? 3 : 2;
  st.taken = (1 - 0.03 * hR('arm')) * (1 - 0.06 * P('bulwark')) * (1 - (sp.armor || 0));
  st.extra = P('multi') + (has('crown') ? 1 : 0);
  st.area = (1 + 0.12 * P('expanse')) * (has('prism') ? 1.25 : 1);
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

// ---------- particles & fx ----------
function burst(x, y, color, n, spd, size, life) {
  for (let i = 0; i < n; i++) {
    if (R.parts.length > 650) R.parts.shift();
    const a = rand(TAU), v = rand(0.3, 1) * (spd || 120);
    R.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: (life || 0.5) * rand(0.6, 1.2), max: life || 0.5, s: (size || 3) * rand(0.6, 1.3), c: color });
  }
}
function floatText(x, y, str, color, size) {
  if (!save.settings.numbers && size < 20) return;
  if (R.texts.length > 45) R.texts.shift();
  R.texts.push({ x: x + rand(-6, 6), y, str, c: color, s: size || 13, life: 0.75 });
}
function addShake(v) { if (save.settings.shake) R.shake = Math.min(14, R.shake + v); }

// ---------- enemies ----------
function waveScale(n) {
  return { hp: (1 + 0.16 * (n - 1) + 0.012 * (n - 1) * (n - 1)) * R.depth.hp, dmg: (1 + 0.05 * (n - 1)) * R.depth.dmg, spd: 1 + Math.min(0.3, 0.015 * (n - 1)), xp: 1 + 0.05 * (n - 1) };
}
function spawnEnemy(type, x, y, o) {
  o = o || {};
  const d = ENEMIES[type], sc = waveScale(Math.max(1, R.wave));
  const elite = !!o.elite;
  const e = { id: R.eid++, type, d, x, y, r: d.r * (elite ? 1.4 : 1), hp: d.hp * sc.hp * (elite ? 5 : 1), spd: d.spd * sc.spd * rand(0.9, 1.1), dmg: d.dmg * sc.dmg * (elite ? 1.4 : 1),
    xp: d.xp * sc.xp * (elite ? 6 : 1), color: d.color, elite, flash: 0, kx: 0, ky: 0, chill: 0, t: rand(0, 2), state: 'walk', st: rand(1, 3), orbCd: 0, blinkT: 0, a: 0, dead: false, spawnT: 0.35 };
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
  for (const k of ENEMY_IDS) { const d = ENEMIES[k]; if (d.from <= R.wave) { const w = d.w * (k === 'drifter' ? Math.max(0.35, 1 - R.wave * 0.035) : 1); pool.push([k, w]); total += w; } }
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
  const hp = endless ? BOSSES[3].hp * 1.1 * Math.pow(n / FINAL_WAVE, 1.8) : b.hp;
  const dmg = b.dmg * (endless ? 1.15 * Math.pow(n / FINAL_WAVE, 1.3) : 1);
  const name = endless ? 'Enhanced ' + b.name.replace(/^The /, '') : b.name;
  Object.assign(e, { boss: true, bd: b, kind: b.kind, r: b.r * (endless ? 1.12 : 1), color: b.color, spd: b.spd * (endless ? 1.1 : 1), hp: hp * Math.pow(R.depth.hp, 0.85), dmg: dmg * R.depth.dmg,
    xp: 120 + 20 * n, state: 'chase', st: 2, pt: 1.5, sumT: 5, ringN: 0, spiralA: 0, enraged: false, name, enh });
  e.maxHp = e.hp;
  R.boss = e;
  R.banner = { text: name, sub: endless ? 'Empowered by the endless tide' : 'A Warden rises from the deep', t: 3, color: endless ? '#ffd040' : b.color };
  SFX.play('bossroar'); SFX.music('boss'); addShake(8);
}
function eShoot(x, y, a, spd, dmg, color, r, life) {
  if (R.ebul.length > 450) return;
  R.ebul.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: r || 6, dmg, life: life || 7, c: color || '#ff4070' });
}

function hurtEnemy(e, dmg, o) {
  if (e.dead || e.spawnT > 0.2) return;
  o = o || {};
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
  if (e.elite) {
    if (Math.random() < 0.45) R.items.push({ k: 'chest', x: e.x, y: e.y, t: 0 });
    else for (let i = 0; i < 3; i++) R.items.push({ k: 'coin', x: e.x + rand(-14, 14), y: e.y + rand(-14, 14), v: 2, t: 0 });
    addShake(3);
  } else if (!e.boss) {
    const r = Math.random();
    if (r < 0.012) R.items.push({ k: 'heart', x: e.x, y: e.y, t: 0 });
    else if (r < 0.016) R.items.push({ k: 'magnet', x: e.x, y: e.y, t: 0 });
    else if (r < 0.05) R.items.push({ k: 'coin', x: e.x, y: e.y, v: 1, t: 0 });
  }
  if (e.d.split && !e.boss) for (let i = 0; i < 3; i++) { const m = spawnEnemy('mini', e.x + rand(-10, 10), e.y + rand(-10, 10)); m.spawnT = 0; m.kx = rand(-120, 120); m.ky = rand(-120, 120); }
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
  SFX.music(R.wave >= 11 ? 'deep' : 'run');
}

// ---------- player ----------
function healP(v, quiet) {
  const before = R.p.hp;
  R.p.hp = Math.min(st.maxHp, R.p.hp + v);
  if (!quiet && R.p.hp > before) { floatText(R.p.x, R.p.y - 20, '+' + Math.round(R.p.hp - before), '#70ff90', 16); SFX.play('heal'); }
}
function hurtPlayer(d, src) {
  const p = R.p;
  if (p.inv > 0 || R.dead) return;
  d *= st.taken;
  p.hp -= d; p.inv = 0.55; R.hurtFlash = 0.35; R.hitstop = 0.05;
  addShake(6); SFX.play('hurt');
  floatText(p.x, p.y - 18, '-' + Math.round(d), '#ff5050', 16);
  burst(p.x, p.y, '#ff4040', 10, 140, 3, 0.4);
  R.combo = 0;
  if (hasRelic('thorn')) novaBlast(p.x, p.y, 120 * st.area, 35, '#ff6a30');
  if (p.hp <= 0) {
    if (hasRelic('phoenix') && !R.phoenixUsed) { R.phoenixUsed = true; revive(1); }
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

// ---------- level up choices ----------
function genChoices() {
  const pool = [];
  for (const w of R.weapons) if (w.lvl < 5) pool.push({ t: 'weapon', id: w.id, lvl: w.lvl + 1, wt: 3.2 });
  if (R.weapons.length < 4) for (const id of WEAPON_IDS) if (!weaponLvl(id)) pool.push({ t: 'weapon', id, lvl: 1, wt: R.weapons.length < 2 ? 3 : 1.6 });
  for (const id of PASSIVE_IDS) { const l = R.passives[id] || 0; if (l < PASSIVES[id].max) pool.push({ t: 'passive', id, lvl: l + 1, wt: 2 }); }
  const n = hR('choice') ? 4 : 3, out = [];
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
  else if (c.t === 'heal') healP(st.maxHp * 0.4);
  else if (c.t === 'embers') R.embersFound += 15;
  recalc();
  SFX.play('select');
  R.pending--;
  if (R.pending > 0) { genChoices(); R.overlayT = 0; } else R.overlay = null;
}
function choiceInfo(c) {
  if (c.t === 'weapon') { const d = WEAPONS[c.id]; return { name: d.name, desc: d.lv[c.lvl], color: d.color, tag: c.lvl === 1 ? 'NEW WEAPON' : 'LEVEL ' + c.lvl, kind: 'weapon', lvl: c.lvl, max: 5 }; }
  if (c.t === 'passive') { const d = PASSIVES[c.id]; return { name: d.name, desc: d.desc, color: d.color, tag: c.lvl === 1 ? 'NEW' : 'LEVEL ' + c.lvl, kind: 'passive', lvl: c.lvl, max: d.max }; }
  if (c.t === 'heal') return { name: 'Warm Embers', desc: 'Restore 40% of your HP. (Repeatable bonus)', color: '#70ff90', tag: 'BONUS · HEAL', kind: 'heal' };
  return { name: 'Ember Cache', desc: '+15 Embers for the Hearth. (Repeatable bonus)', color: '#ffd040', tag: 'BONUS · TREASURE', kind: 'cache' };
}
function openRelics() {
  const pool = shuffle(RELIC_IDS.filter(k => !hasRelic(k)));
  R.relicChoices = pool.slice(0, 3);
  if (R.relicChoices.length) { R.overlay = 'relic'; SFX.play('chest'); }
}

// ---------- waves ----------
function startWave(n) {
  R.wave = n; R.waveT = 0; R.waveActive = true;
  const isBoss = n % 5 === 0;
  R.toSpawn = R.waveTotal = Math.floor((14 + 8 * n) * R.depth.count * (isBoss ? 0.4 : 1));
  R.spawnDur = isBoss ? 45 : 18 + Math.min(n, 12);
  R.spawnAcc = 0;
  if (isBoss) spawnBoss(n);
  else { R.banner = { text: 'WAVE ' + n, sub: n === FINAL_WAVE - 1 ? 'The Heart stirs below...' : (n > FINAL_WAVE ? 'Endless tide' : R.depth.name), t: 2, color: '#9ec8ff' }; SFX.play('wave'); SFX.music(n >= 11 ? 'deep' : 'run'); }
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
      const eliteChance = R.wave >= 4 ? Math.min(0.1, 0.012 + 0.004 * R.wave) : 0;
      spawnAround(pickType(), { elite: Math.random() < eliteChance });
      R.toSpawn--;
    }
  }
  const isBoss = R.wave % 5 === 0;
  if (isBoss) {
    if (!R.boss) endWave();
    else if (R.toSpawn <= 0 && R.waveT > R.spawnDur) { R.toSpawn = Math.floor(6 + R.wave); R.waveT = 0; }
  } else if ((R.toSpawn <= 0 && R.enemies.length === 0) || R.waveT > R.spawnDur + 28) endWave();
}
function endWave() {
  R.waveActive = false; R.inter = 3; R.cleared = R.wave;
  if (R.wave > save.stats.bestWave) save.stats.bestWave = R.wave;
  const key = 'd' + R.di;
  save.best[key] = Math.max(save.best[key] || 0, R.wave);
  // magnetize gems at end of wave so you never miss XP
  for (const gm of R.gems) gm.mag = true;
  if (R.relicPending) { R.relicPending = false; openRelics(); }
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
    ['Foes slain', Math.floor(R.kills * 0.25)],
    ['Waves survived', R.cleared * 6],
    ['Wardens slain', R.bossKills * 30],
    ['Embers gathered', Math.floor(R.embersFound)],
  ];
  if (victory) parts.push(['Depth cleared!', 150 * (R.di + 1)]);
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
  if (R.banner) { R.banner.t -= dt; if (R.banner.t <= 0) R.banner = null; }
  if (R.delayed) { for (const d of R.delayed) { d.t -= dt; if (d.t <= 0) d.f(); } R.delayed = R.delayed.filter(d => d.t > 0); }

  updateWaves(dt);
  buildGrid();
  fireWeapons(dt);
  updateEnemies(dt);
  updateShots(dt);
  updateMines(dt);
  updateEbul(dt);
  updatePickups(dt);
  updateParts(dt);
  R.enemies = R.enemies.filter(e => !e.dead);

  if (R.shake > 0) R.shake = Math.max(0, R.shake - dt * 30);
  if (!R.overlay && R.pending > 0 && !R.dead) { genChoices(); R.overlay = 'level'; R.overlayT = 0; SFX.play('level'); stopJoy(); }
  if (!R.overlay && R.victoryPending) { R.victoryPending = false; R.overlay = 'victory'; R.overlayT = 0; stopJoy(); SFX.play('revive'); }
}
function updateEnemies(dt) {
  const p = R.p;
  for (const e of R.enemies) {
    if (e.dead) continue;
    e.t += dt; if (e.flash > 0) e.flash -= dt; if (e.chill > 0) e.chill -= dt; if (e.orbCd > 0) e.orbCd -= dt; if (e.spawnT > 0) e.spawnT -= dt;
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const slowF = e.chill > 0 ? 0.5 : 1;
    let vx = 0, vy = 0;
    if (e.boss) { bossAI(e, dt, d, ux, uy); }
    else if (e.d.ranged) {
      const want = 170;
      const f = d > want + 30 ? 1 : d < want - 30 ? -1 : 0;
      vx = (ux * f - uy * 0.5) * e.spd; vy = (uy * f + ux * 0.5) * e.spd;
      e.st -= dt;
      if (e.st <= 0 && d < 330) { e.st = rand(2.2, 3.2); eShoot(e.x, e.y, Math.atan2(dy, dx), 135, e.dmg, '#70ff9a'); SFX.play('eshot'); }
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
    if (d < e.r + p.r && e.spawnT <= 0) hurtPlayer(e.dmg, e);
  }
}
function bossAI(e, dt, d, ux, uy) {
  const p = R.p, pw = Math.min(e.enh || 1, 2.2);
  e.pt -= dt; e.sumT -= dt;
  if (!e.enraged && e.hp < e.maxHp * 0.5) { e.enraged = true; R.banner = { text: 'ENRAGED', sub: e.name, t: 1.6, color: '#ff4040' }; SFX.play('bossroar'); addShake(6); }
  const rage = (e.enraged ? 1.35 : 1) * pw;          // attack tempo
  const cnt = n => Math.round(n * (1 + (pw - 1) * 0.6)); // bullet counts grow in endless
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
        if (e.trail <= 0) { e.trail = 0.08; eShoot(e.x, e.y, rand(TAU), 22, bdmg * 0.7, '#ff8030', 7, 1.8); }
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
          e.sp = 0.105 / rage; e.spiralA += 0.33;
          const arms = (e.enraged ? 3 : 2) + (pw > 1.5 ? 1 : 0);
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
        if (e.sp <= 0) { e.sp = 0.09 / pw; e.spiralA += 0.27; const arms = e.enraged ? 5 : 4; for (let k = 0; k < arms; k++) eShoot(e.x, e.y, e.spiralA + k * TAU / arms, bsp(120), bdmg, '#ff60a0', 6); }
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
  const sl = e.chill > 0 ? 0.75 : 1;
  e.x += vx * dt * sl; e.y += vy * dt * sl;
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
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.life <= 0) { if (s.k === 'seeker') explode(s.x, s.y, s.aoe, s.dmg, s.c); continue; }
    query(s.x, s.y, s.r, e => {
      if (s.life <= 0 || s.hit.indexOf(e.id) >= 0 || e.blinkT > 0) return;
      if (s.k === 'seeker') { explode(s.x, s.y, s.aoe, s.dmg, s.c); s.life = 0; return false; }
      s.hit.push(e.id);
      const sp = Math.hypot(s.vx, s.vy) || 1;
      hurtEnemy(e, s.dmg, { kx: s.vx / sp * 90, ky: s.vy / sp * 90, chill: s.chill });
      burst(s.x, s.y, s.c, 3, 90, 2, 0.2);
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
    b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
    const dx = b.x - p.x, dy = b.y - p.y;
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
      else if (it.k === 'chest') { R.pending++; R.embersFound += 10; SFX.play('chest'); floatText(p.x, p.y - 24, 'TREASURE!', '#ffd040', 20); burst(p.x, p.y, '#ffd040', 30, 200, 3, 0.8); }
    }
  }
  R.items = R.items.filter(it => !it.dead);
}
function updateParts(dt) {
  for (const q of R.parts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.95; q.vy *= 0.95; }
  R.parts = R.parts.filter(q => q.life > 0);
  for (const t of R.texts) { t.life -= dt; t.y -= 32 * dt; }
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
];
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
    const rot = e.d.shape === 4 ? t * 1.5 : e.d.shape === 3 ? t * 0.5 : e.a;
    g.rotate(rot);
    if (e.state === 'wind') { g.translate(rand(-2, 2), rand(-2, 2)); }
    SHAPES[e.d.shape](r);
    g.fillStyle = e.flash > 0 ? '#ffffff' : e.chill > 0 ? '#20406a' : mixHex(e.color, 0.82, '#0a0a18');
    g.fill();
    g.lineWidth = e.elite ? 3 : 2; g.strokeStyle = e.flash > 0 ? '#fff' : e.chill > 0 ? '#9fe8ff' : e.color; g.stroke();
    if (e.elite) { g.rotate(-rot); g.beginPath(); g.arc(0, 0, r + 6, 0, TAU); g.strokeStyle = hexA('#ffd040', 0.5 + Math.sin(t * 6) * 0.3); g.lineWidth = 2; g.stroke(); g.rotate(rot); }
    // eye
    g.fillStyle = e.state === 'wind' ? '#ffffff' : e.color;
    g.beginPath(); g.arc(e.d.shape === 1 || e.d.shape === 5 ? r * 0.2 : r * 0.25, 0, r * 0.22, 0, TAU); g.fill();
  }
  g.restore();
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
  const fill = e.flash > 0 ? '#ffffff' : mixHex(c, 0.8, '#08060f');
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
  g.globalCompositeOperation = 'lighter';
  for (const gm of R.gems) {
    if (!inView(gm.x, gm.y, 20)) continue;
    const big = gm.v >= 20 ? 2 : gm.v >= 4 ? 1 : 0;
    const col = big === 2 ? '#ff60c0' : big === 1 ? '#60ffb0' : '#60c8ff';
    glow(gm.x, gm.y, 9 + big * 4, col, 0.7);
  }
  g.globalCompositeOperation = 'source-over';
  for (const gm of R.gems) {
    if (!inView(gm.x, gm.y, 20)) continue;
    const big = gm.v >= 20 ? 2 : gm.v >= 4 ? 1 : 0, s = 3 + big * 1.6;
    g.fillStyle = big === 2 ? '#ffc0ea' : big === 1 ? '#c0ffe0' : '#c0ecff';
    g.beginPath(); g.moveTo(gm.x, gm.y - s * 1.3); g.lineTo(gm.x + s, gm.y); g.lineTo(gm.x, gm.y + s * 1.3); g.lineTo(gm.x - s, gm.y); g.closePath(); g.fill();
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
  // enemies
  for (const e of R.enemies) { if (!e.dead && inView(e.x, e.y, e.r + 60)) drawEnemy(e); }
  // player shots
  g.globalCompositeOperation = 'lighter';
  for (const s of R.shots) {
    if (!inView(s.x, s.y, 20)) continue;
    glow(s.x, s.y, s.k === 'shard' ? 11 : 14, s.c, 0.9);
    g.strokeStyle = s.c; g.lineWidth = s.r * 0.9; g.lineCap = 'round';
    const sp = Math.hypot(s.vx, s.vy) || 1;
    g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x - s.vx / sp * (s.k === 'shard' ? 9 : 12), s.y - s.vy / sp * (s.k === 'shard' ? 9 : 12)); g.stroke();
  }
  // enemy bullets
  for (const b of R.ebul) { if (inView(b.x, b.y, 20)) glow(b.x, b.y, b.r * 2.6, b.c, 0.9); }
  g.globalCompositeOperation = 'source-over';
  for (const b of R.ebul) { if (!inView(b.x, b.y, 20)) continue; g.fillStyle = '#fff'; g.beginPath(); g.arc(b.x, b.y, b.r * 0.55, 0, TAU); g.fill(); }
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
  // fx
  g.globalCompositeOperation = 'lighter';
  for (const f of R.fx) {
    if (f.k === 'ring') { g.strokeStyle = hexA(f.c, Math.min(1, f.life * 3)); g.lineWidth = 6 * f.life + 2; g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.stroke(); }
    else if (f.k === 'boom') { const k = 1 - f.life / f.max; glow(f.x, f.y, f.r * (0.6 + k * 0.6) * 1.6, f.c, (1 - k) * 0.9); }
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
  if (!R.dead && p.hp < st.maxHp * 0.3) { const a = 0.12 + Math.sin(R.t * 6) * 0.08; g.strokeStyle = `rgba(255,30,40,${a})`; g.lineWidth = 30; g.strokeRect(0, 0, VW, VH); }
  drawHUD();
  if (R.overlay) drawOverlay();
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
  if (R.relics.length) { let rx = VW - 18; for (const k of R.relics) { drawIcon('relic', k, rx, y - 30, 16, RELICS[k].color); rx -= 20; } }
  // banner
  if (R.banner && !R.overlay) {
    const b = R.banner, a = Math.min(1, b.t * 2, (3 - b.t) * 3 + 0.3);
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
    const n = R.choices.length, ch = 96, gap = 12, total = n * ch + (n - 1) * gap;
    let y = Math.max(160, VH / 2 - total / 2 + 20);
    R.choices.forEach((c, i) => {
      const info = choiceInfo(c); info.id = c.id;
      const ap = clamp(ot * 5 - i * 0.4, 0, 1);
      choiceCard(20 + (1 - ap) * 40, y, VW - 40, ch, info, () => { if (ot > 0.35) applyChoice(c); }, ap);
      y += ch + gap;
    });
    if (R.rerolls > 0) button(VW / 2 - 80, y + 6, 160, 44, 'Reroll (' + R.rerolls + ')', () => { R.rerolls--; genChoices(); SFX.play('click'); R.overlayT = 0.3; }, { size: 15, color: '#8aa0ff' });
    if (R.pending > 1) text('+' + (R.pending - 1) + ' more', VW / 2, y + 70, 12, '#ffd080');
  } else if (R.overlay === 'relic') {
    dim(0.7 * k);
    g.globalCompositeOperation = 'lighter'; glow(VW / 2, 120, 160, '#60e0ff', 0.3 * k); g.globalCompositeOperation = 'source-over';
    text('RELIC OF THE DEEP', VW / 2, 105, 28, '#c0f0ff', 'center', 'bold', 'Georgia, serif');
    text('The Warden leaves a treasure. Choose one.', VW / 2, 135, 13, '#9ab', 'center', 'normal');
    let y = 170;
    R.relicChoices.forEach((id, i) => {
      const d = RELICS[id]; const ap = clamp(ot * 5 - i * 0.4, 0, 1);
      choiceCard(20, y, VW - 40, 96, { name: d.name, desc: d.desc, color: d.color, tag: 'RELIC', kind: 'relic', id }, () => {
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
    for (const kk of R.relics.slice(0, 5)) { drawIcon('relic', kk, rx, yy, 18, RELICS[kk].color); text(RELICS[kk].name, rx + 14, yy, 11, RELICS[kk].color, 'left'); yy += 24; }
    y = 370;
    button(VW / 2 - 110, y, 220, 54, 'Resume', () => { R.overlay = null; R.quitConfirm = false; SFX.play('click'); }, { size: 20 });
    button(VW / 2 - 110, y + 66, 105, 44, 'Music ' + Math.round(save.settings.music * 10), () => { save.settings.music = (Math.round(save.settings.music * 10) + 2) % 12 / 10; if (save.settings.music > 1) save.settings.music = 0; SFX.setVolumes(save.settings.music, save.settings.sfx); persist(); SFX.play('click'); }, { size: 13, color: '#8aa0ff' });
    button(VW / 2 + 5, y + 66, 105, 44, 'Sound ' + Math.round(save.settings.sfx * 10), () => { save.settings.sfx = (Math.round(save.settings.sfx * 10) + 2) % 12 / 10; if (save.settings.sfx > 1) save.settings.sfx = 0; SFX.setVolumes(save.settings.music, save.settings.sfx); persist(); SFX.play('click'); }, { size: 13, color: '#8aa0ff' });
    button(VW / 2 - 110, y + 122, 220, 44, R.quitConfirm ? 'Tap again to abandon' : 'Abandon run', () => { if (R.quitConfirm) { R.quitConfirm = false; finishRun(false); } else { R.quitConfirm = true; SFX.play('click'); } }, { size: 14, color: '#ff6060' });
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
  text('a flame against the endless tide', VW / 2, cy + 98, 14, '#c8a890', 'center', 'italic', 'Georgia, serif');
  let y = VH * 0.47;
  button(VW / 2 - 120, y, 240, 62, 'EMBARK', () => go('embark'), { size: 24 });
  button(VW / 2 - 120, y + 74, 240, 54, 'The Hearth', () => go('hearth'), { size: 18, color: '#ffd060', sub: '◆ ' + fmt(save.embers) + ' Embers' });
  button(VW / 2 - 120, y + 140, 115, 46, 'Codex', () => go('codex'), { size: 15, color: '#8aa0ff' });
  button(VW / 2 + 5, y + 140, 115, 46, 'Settings', () => go('settings'), { size: 15, color: '#8aa0ff' });
  const s = save.stats;
  text('Best wave ' + s.bestWave + '  ·  Depths cleared ' + save.depthCleared + '/' + DEPTHS.length + '  ·  Foes ' + fmt(s.kills), VW / 2, VH - 46, 11, '#7888b0', 'center', 'normal');
  const tips = ['Wardens appear every 5 waves and drop relics.', 'Golden-ringed elites may carry treasure chests.', 'Spend Embers at the Hearth for permanent power.', 'Clear wave 20 to unlock a deeper, richer Depth.', 'New spirits awaken as you reach milestones.', 'Chill slows foes; mines and novas reward kiting.'];
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
    text(di === 0 ? 'The gentle beginning.' : 'Foes +' + Math.round((d.hp - 1) * 100) + '% health, +' + Math.round((d.dmg - 1) * 100) + '% damage', VW / 2, y + 72, 12, '#c4cce8', 'center', 'normal');
    text('Embers x' + d.embers.toFixed(1), VW / 2, y + 92, 13, '#ffd050');
    const best = save.best['d' + di] || 0;
    text(best ? 'Best: wave ' + best + (save.depthCleared > di ? '  ✓ cleared' : '') : 'Not yet attempted', VW / 2, y + 112, 11, '#8898c0', 'center', 'normal');
  }
  button(24, y + 46, 40, 56, '‹', () => { save.selDepth = Math.max(0, di - 1); persist(); SFX.play('click'); }, { size: 26, color: '#8aa0ff', disabled: di === 0 });
  button(VW - 64, y + 46, 40, 56, '›', () => { save.selDepth = Math.min(DEPTHS.length - 1, di + 1); persist(); SFX.play('click'); }, { size: 26, color: '#8aa0ff', disabled: di === DEPTHS.length - 1 });
  const by = Math.max(y + 150, VH - 140);
  button(VW / 2 - 120, by, 240, 62, 'BEGIN', () => { if (!locked && !dLocked) { SFX.play('select'); newRun(); } }, { size: 24, disabled: locked || dLocked });
  button(VW / 2 - 70, by + 74, 140, 44, 'Back', () => go('title'), { size: 15, color: '#8aa0ff' });
}
function drawHearth() {
  text('THE HEARTH', VW / 2, 36, 24, '#ffe0c0', 'center', 'bold', 'Georgia, serif');
  g.globalCompositeOperation = 'lighter'; glow(VW / 2, 66, 60, '#ffb030', 0.3); g.globalCompositeOperation = 'source-over';
  text('◆ ' + fmt(save.embers) + ' Embers', VW / 2, 66, 18, '#ffd050');
  const cols = 2, gap = 8, cw = (VW - 24 - gap) / cols, top = 92;
  const ch = Math.min(84, (VH - top - 80) / 6 - gap);
  HEARTH.forEach((h, i) => {
    const r = hR(h.id), maxed = r >= h.max, cost = hearthCost(h, r), afford = save.embers >= cost;
    const x = 12 + (i % cols) * (cw + gap), y = top + Math.floor(i / cols) * (ch + gap);
    button(x, y, cw, ch, '', () => {
      if (maxed) { SFX.play('deny'); return; }
      if (!afford) { SFX.play('deny'); showToast('Need ' + fmt(cost - save.embers) + ' more Embers', '#ff9090'); return; }
      save.embers -= cost; save.hearth[h.id] = r + 1; persist(); SFX.play('buy');
    }, { color: maxed ? '#60d090' : afford ? '#ffb040' : '#606888' });
    text(h.name, x + 10, y + 15, 14, '#fff', 'left');
    for (let k = 0; k < h.max; k++) { g.fillStyle = k < r ? '#ffb040' : 'rgba(255,255,255,0.14)'; g.fillRect(x + 10 + k * (Math.min(12, (cw - 20) / h.max)), y + 27, Math.min(9, (cw - 20) / h.max - 2), 4); }
    wrap(h.desc(Math.max(r, 1)) + (r && !maxed ? ' → ' + h.desc(r + 1).replace(/^[^0-9-+]*/, '') : ''), x + 10, y + 42, cw - 16, 10.5, '#b4bcd8', 13, 'left');
    text(maxed ? 'MAX' : '◆ ' + fmt(cost), x + cw - 10, y + ch - 12, 13, maxed ? '#60d090' : afford ? '#ffd050' : '#8a7060', 'right');
  });
  button(VW / 2 - 70, VH - 62, 140, 46, 'Back', () => go('title'), { size: 16, color: '#8aa0ff' });
}
function drawCodex() {
  text('CODEX', VW / 2, 36, 24, '#ffe0c0', 'center', 'bold', 'Georgia, serif');
  const tabs = ['Weapons', 'Relics', 'Records'];
  const tab = save.codexTab || 0;
  tabs.forEach((t, i) => button(12 + i * ((VW - 24) / 3), 58, (VW - 24) / 3 - 6, 36, t, () => { save.codexTab = i; SFX.play('click'); }, { size: 13, color: i === tab ? '#ffb040' : '#606888' }));
  let y = 110;
  if (tab === 0) {
    for (const id of WEAPON_IDS) {
      const d = WEAPONS[id]; drawIcon('weapon', id, 34, y + 14, 24, d.color);
      text(d.name, 56, y + 6, 14, '#fff', 'left'); text(d.lv[1], 56, y + 24, 11, '#b4bcd8', 'left', 'normal');
      y += 44; if (y > VH - 140) break;
    }
    wrap('Passives: ' + PASSIVE_IDS.map(k => PASSIVES[k].name).join(', ') + '.', VW / 2, y + 10, VW - 40, 11, '#8898c0', 15);
  } else if (tab === 1) {
    for (const id of RELIC_IDS) {
      const d = RELICS[id]; drawIcon('relic', id, 30, y + 10, 18, d.color);
      text(d.name, 50, y + 3, 13, d.color, 'left'); text(d.desc, 50, y + 19, 11, '#b4bcd8', 'left', 'normal');
      y += 38; if (y > VH - 110) break;
    }
  } else {
    const s = save.stats;
    const rows = [['Runs', s.runs], ['Foes slain', fmt(s.kills)], ['Wardens slain', s.bosses], ['Best wave', s.bestWave], ['Best level', s.bestLevel], ['Depths cleared', save.depthCleared + ' / ' + DEPTHS.length], ['Lifetime Embers', fmt(save.lifetimeEmbers)], ['Time in the deep', Math.floor(s.playTime / 60) + ' min']];
    for (const [a, b] of rows) { text(a, 40, y, 14, '#b4bcd8', 'left', 'normal'); text(String(b), VW - 40, y, 14, '#fff', 'right'); y += 28; }
    y += 10; text('SPIRITS', VW / 2, y, 12, '#ffd080'); y += 22;
    for (const sp of SPIRITS) { const u = save.unlocked[sp.id]; text(u ? sp.name : '???', 40, y, 13, u ? sp.color : '#667', 'left'); text(u ? 'Awakened' : sp.unlock.text, VW - 40, y, 11, u ? '#80ffb0' : '#8898c0', 'right', 'normal'); y += 22; }
    y += 6;
    DEPTHS.forEach((d, i) => { text(d.name, 40, y, 12, i < save.depthCleared ? d.tint : '#667', 'left'); text('best wave ' + (save.best['d' + i] || 0), VW - 40, y, 11, '#8898c0', 'right', 'normal'); y += 20; });
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
  y += 10;
  if (window.Android && window.Android.pinShortcut) {
    button(30, y, VW - 60, 50, 'Add icon to Home screen', () => { try { window.Android.pinShortcut(); showToast('Check your home screen!'); } catch (e) { } SFX.play('click'); }, { size: 15, color: '#ffb040' });
    y += 62;
  }
  button(30, y, VW - 60, 50, confirmReset > 0 ? 'Tap again to ERASE all progress' : 'Reset progress', () => {
    if (confirmReset > 0) { const keep = save.settings; save = defaultSave(); save.settings = keep; persist(); confirmReset = 0; showToast('Progress erased'); }
    else { confirmReset = 3; SFX.play('click'); }
  }, { size: 14, color: '#ff6060' });
  text('Emberwake v1.1 · made with flame and code', VW / 2, VH - 90, 11, '#667', 'center', 'normal');
  button(VW / 2 - 70, VH - 62, 140, 46, 'Back', () => go('title'), { size: 16, color: '#8aa0ff' });
}

// ================= MAIN LOOP =================
let lastT = performance.now(), paused = false;
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000)); lastT = now;
  try { step(dt); } catch (err) { console.error(err); }
  requestAnimationFrame(frame);
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
