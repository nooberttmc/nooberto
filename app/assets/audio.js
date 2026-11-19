'use strict';
// Emberwake procedural audio: a tiny synth, a step sequencer for the soundtrack and synthesized SFX.
const SFX = (() => {
  let ctx = null, master, musicGain, sfxGain, musicBus, delay, noiseBuf;
  let vol = { music: 0.6, sfx: 0.8 };
  const last = {};

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);
    musicGain = ctx.createGain(); musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.connect(master);
    musicBus = ctx.createGain(); musicBus.connect(musicGain);
    // feedback delay for space on the music
    delay = ctx.createDelay(1.0); delay.delayTime.value = 0.375;
    const fb = ctx.createGain(); fb.gain.value = 0.33;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    const send = ctx.createGain(); send.gain.value = 0.28;
    musicBus.connect(send); send.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(musicGain);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    apply();
    if (ctx.state === 'suspended') ctx.resume();
  }
  function apply() {
    if (!ctx) return;
    musicGain.gain.setTargetAtTime(vol.music * 0.55, ctx.currentTime, 0.05);
    sfxGain.gain.setTargetAtTime(vol.sfx * 0.7, ctx.currentTime, 0.05);
  }
  // Pre-rendered songs (played from the APK's assets): loop the middle section, skipping intro and outro
  const FILE_TRACKS = { sun: { src: 'the_drowned_sun.mp3', loopStart: 10.79, loopEnd: 161.8 } }; // first theme .. end of the G minor section (178 BPM)
  let fileEl = null, fileName = '';
  function playFile(name) {
    const ft = FILE_TRACKS[name];
    if (fileName === name && fileEl) { if (fileEl.paused) fileEl.play().catch(() => {}); return; }
    stopFile();
    try { fileEl = new Audio(ft.src); fileEl.volume = Math.min(1, vol.music); fileEl.play().catch(() => {}); fileName = name; } catch (e) { fileEl = null; }
  }
  function stopFile() { if (fileEl) { try { fileEl.pause(); } catch (e) { } } fileEl = null; fileName = ''; }
  function setVolumes(m, s) { vol.music = m; vol.sfx = s; apply(); if (fileEl) fileEl.volume = Math.min(1, m); }
  function suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); if (fileEl) fileEl.pause(); }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); if (fileEl && fileEl.paused) fileEl.play().catch(() => {}); }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function tone(t, freq, dur, o) {
    o = o || {};
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + (o.glide || dur));
    if (o.detune) osc.detune.value = o.detune;
    const gn = ctx.createGain();
    const v = o.vol == null ? 0.2 : o.vol, a = o.attack || 0.005, r = o.release || 0.08;
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.linearRampToValueAtTime(v, t + a);
    if (o.sustain != null) gn.gain.setValueAtTime(v * o.sustain, t + a + 0.0001);
    gn.gain.setValueAtTime(o.sustain != null ? v * o.sustain : v, t + Math.max(a, dur));
    gn.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a, dur) + r);
    let node = osc;
    if (o.cutoff) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.cutoff; f.Q.value = o.q || 1;
      osc.connect(f); node = f;
    }
    node.connect(gn); gn.connect(o.dest || sfxGain);
    osc.start(t); osc.stop(t + Math.max(a, dur) + r + 0.02);
  }
  function noise(t, dur, o) {
    o = o || {};
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = o.ftype || 'bandpass'; f.frequency.value = o.freq || 3000; f.Q.value = o.q || 1;
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const gn = ctx.createGain(); const v = o.vol == null ? 0.2 : o.vol;
    if (o.attack) { gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(v, t + o.attack); }
    else gn.gain.setValueAtTime(v, t);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, (o.attack || 0) + 0.05));
    src.connect(f); f.connect(gn); gn.connect(o.dest || sfxGain);
    src.loop = true; src.start(t, Math.random() * 0.5); src.stop(t + Math.max(dur, (o.attack || 0) + 0.05) + 0.02);
  }

  // ---------- sound effects ----------
  function play(name, p) {
    if (!ctx || ctx.state !== 'running' || vol.sfx <= 0) return;
    const now = ctx.currentTime;
    const gap = { shoot: 0.06, hit: 0.035, kill: 0.04, gem: 0.03, arc: 0.08, nova: 0.1, boom: 0.06, hurt: 0.15, mine: 0.08 }[name] || 0;
    if (gap && last[name] && now - last[name] < gap) return;
    last[name] = now;
    const t = now + 0.005;
    p = p || 0;
    switch (name) {
      case 'shoot': tone(t, 880 + Math.random() * 120, 0.03, { type: 'square', vol: 0.035, to: 440, cutoff: 3000 }); break;
      case 'fan': tone(t, 1600, 0.05, { type: 'triangle', vol: 0.05, to: 900 }); break;
      case 'hit': noise(t, 0.05, { freq: 2500, vol: 0.06, q: 2 }); break;
      case 'kill': tone(t, 300 + Math.random() * 80, 0.08, { type: 'triangle', vol: 0.08, to: 90 }); noise(t, 0.07, { freq: 1200, vol: 0.04 }); break;
      case 'gem': tone(t, mtof(76 + Math.min(p, 24)), 0.05, { type: 'sine', vol: 0.06, release: 0.12 }); break;
      case 'arc': noise(t, 0.12, { freq: 5000, vol: 0.08, q: 0.7, to: 1500 }); tone(t, 120, 0.1, { type: 'sawtooth', vol: 0.04, cutoff: 1800 }); break;
      case 'nova': tone(t, 180, 0.35, { type: 'sine', vol: 0.18, to: 50 }); noise(t, 0.3, { freq: 800, vol: 0.06, to: 200, ftype: 'lowpass' }); break;
      case 'boom': tone(t, 140, 0.2, { type: 'sine', vol: 0.16, to: 40 }); noise(t, 0.25, { freq: 900, vol: 0.1, ftype: 'lowpass', to: 120 }); break;
      case 'mine': tone(t, 520, 0.04, { type: 'square', vol: 0.03, cutoff: 1500 }); break;
      case 'hurt': tone(t, 110, 0.18, { type: 'sawtooth', vol: 0.14, to: 55, cutoff: 900 }); noise(t, 0.12, { freq: 400, vol: 0.12, ftype: 'lowpass' }); break;
      case 'level': [0, 4, 7, 12, 16].forEach((s, i) => tone(t + i * 0.06, mtof(72 + s), 0.12, { type: 'triangle', vol: 0.1, release: 0.25 })); break;
      case 'pick': tone(t, mtof(84), 0.05, { type: 'sine', vol: 0.1 }); tone(t + 0.05, mtof(91), 0.12, { type: 'sine', vol: 0.1, release: 0.2 }); break;
      case 'select': tone(t, mtof(79), 0.04, { type: 'triangle', vol: 0.09 }); tone(t + 0.04, mtof(86), 0.08, { type: 'triangle', vol: 0.08, release: 0.15 }); break;
      case 'click': tone(t, mtof(84), 0.025, { type: 'triangle', vol: 0.07 }); break;
      case 'deny': tone(t, 180, 0.12, { type: 'square', vol: 0.05, cutoff: 800 }); break;
      case 'buy': [0, 7, 12].forEach((s, i) => tone(t + i * 0.05, mtof(67 + s), 0.1, { type: 'triangle', vol: 0.1, release: 0.2 })); break;
      case 'heal': [0, 5, 9].forEach((s, i) => tone(t + i * 0.07, mtof(72 + s), 0.1, { type: 'sine', vol: 0.09, release: 0.25 })); break;
      case 'wave': tone(t, mtof(62), 0.25, { type: 'sawtooth', vol: 0.06, cutoff: 1200, release: 0.4 }); tone(t + 0.12, mtof(69), 0.4, { type: 'sawtooth', vol: 0.06, cutoff: 1500, release: 0.6 }); break;
      case 'bossroar': tone(t, 70, 1.1, { type: 'sawtooth', vol: 0.18, to: 40, cutoff: 600, release: 0.5 }); noise(t, 1.2, { freq: 300, vol: 0.12, ftype: 'lowpass', to: 80 }); break;
      case 'bossdie': tone(t, 220, 1.4, { type: 'sawtooth', vol: 0.15, to: 30, cutoff: 1200, release: 0.6 }); noise(t, 1.5, { freq: 2000, vol: 0.15, to: 100, ftype: 'lowpass' });
        [0, 3, 7, 12, 15, 19].forEach((s, i) => tone(t + 0.5 + i * 0.09, mtof(64 + s), 0.2, { type: 'triangle', vol: 0.08, release: 0.4 })); break;
      case 'eshot': tone(t, 400, 0.08, { type: 'sine', vol: 0.04, to: 250 }); break;
      case 'telegraph': tone(t, 300, 0.5, { type: 'square', vol: 0.05, to: 900, cutoff: 2000 }); break;
      case 'chest': [0, 4, 7, 11, 14, 19].forEach((s, i) => tone(t + i * 0.05, mtof(74 + s), 0.1, { type: 'sine', vol: 0.09, release: 0.3 })); break;
      case 'death': tone(t, 300, 1.2, { type: 'sawtooth', vol: 0.12, to: 40, cutoff: 900, release: 0.6 }); break;
      case 'revive': [0, 7, 12, 19, 24].forEach((s, i) => tone(t + i * 0.08, mtof(60 + s), 0.3, { type: 'triangle', vol: 0.1, release: 0.5 })); break;
    }
  }

  // ---------- music ----------
  // chords: [root midi, quality]. m, M, m7, M7, s (sus2), d (dim)
  // Every Depth has its own song; boss fights play a heavier remix of it.
  const RUN_BASS = [1,0,1,0,1,0,2,0,1,0,1,0,1,2,1,0];
  const TRACKS = {
    menu: { bpm: 72, chords: [[57, 'm'], [53, 'M'], [48, 'M'], [55, 'M']], bass: [1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0], arp: { rate: 2, type: 'square', vol: 0.02 }, lead: 0.25, padCut: 1400, scale: [0, 2, 3, 5, 7, 8, 10], bells: 0.04 },
    over: { bpm: 60, chords: [[45, 'm'], [41, 'M'], [38, 'm'], [40, 'M']], bass: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], arp: { rate: 4, type: 'triangle', vol: 0.02 }, lead: 0, padCut: 900, scale: [0, 2, 3, 5, 7, 8, 10], drone: 33, wind: true },
    // 1. The Glimmering Shallows: hopeful minor, sparkling arps
    d0: { bpm: 108, chords: [[50, 'm'], [46, 'M'], [53, 'M'], [48, 'M']], bass: RUN_BASS, kick: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,1], hat: [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,1], snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
      arp: { rate: 1, type: 'square', vol: 0.022 }, lead: 0.4, padCut: 1800, scale: [0, 2, 3, 5, 7, 8, 10], bells: 0.05 },
    // 2. Coralveil Reef: warm dorian groove, swung, with bubbling sines
    d1: { bpm: 98, swing: 0.16, chords: [[52, 'm7'], [57, 'M'], [55, 'M7'], [50, 'M']], bass: [1,0,0,1,0,0,1,0,1,0,0,1,0,1,0,0], bassType: 'sine', bassCut: 900,
      kick: [1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0], hat: [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0], snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
      arp: { rate: 2, type: 'triangle', vol: 0.03, seq: [0, 1, 2, 3, 2, 1, 0, 2] }, lead: 0.35, leadType: 'sine', padType: 'triangle', padCut: 2200, scale: [0, 2, 3, 5, 7, 9, 10], bubbles: 0.18 },
    // 3. The Lanternlit Shelf: glassy, slow and luminous, far-off chimes in the dark
    d2: { bpm: 86, chords: [[53, 'M7'], [55, 'M'], [52, 'm7'], [57, 'm']], bass: [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], bassType: 'sine', bassCut: 600,
      kick: [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0], hat: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
      arp: { rate: 2, type: 'sine', vol: 0.03, oct: 36 }, lead: 0.3, leadType: 'sine', padType: 'triangle', padCut: 2600, scale: [0, 2, 4, 5, 7, 9, 11], bells: 0.28, wind: true },
    // 4. Cinderwake Trench: phrygian, driving, smouldering low drone
    d3: { bpm: 118, chords: [[52, 'm'], [53, 'M'], [52, 'm'], [50, 'm']], bass: [1,0,1,1,0,1,1,0,1,0,1,1,0,1,2,0], bassCut: 650, drone: 40,
      kick: [1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0], hat: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
      arp: { rate: 1, type: 'square', vol: 0.016 }, lead: 0.4, leadType: 'sawtooth', padCut: 1300, scale: [0, 1, 3, 5, 7, 8, 10] },
    // 5. The Ossuary Depths: desolate. Heartbeat, drone, wind and lonely bells
    d4: { bpm: 64, chords: [[47, 'm'], [48, 'M'], [45, 'm'], [47, 's']], bass: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], bassType: 'sine', bassCut: 400, drone: 35,
      kick: [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
      arp: { rate: 4, type: 'triangle', vol: 0.025 }, lead: 0.25, leadType: 'sine', padType: 'triangle', padCut: 1100, scale: [0, 1, 3, 5, 6, 8, 10], bells: 0.32, wind: true },
    // 6. The Gilded Rift: exotic harmonic minor, plucked shimmer
    d5: { bpm: 104, chords: [[57, 'm'], [50, 'm'], [52, 'M'], [57, 'm']], bass: [1,0,1,1,0,1,1,0,1,0,1,1,0,1,1,0], bassCut: 800,
      kick: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], hat: [0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1], snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
      arp: { rate: 1, type: 'square', vol: 0.02, oct: 36, seq: [0, 2, 1, 2, 0, 2, 1, 3] }, lead: 0.4, leadType: 'triangle', padCut: 2000, scale: [0, 2, 3, 5, 7, 8, 11], bells: 0.14 },
    // 7. Leviathan's Hollow: vast and slow; sub drone and whale song
    d6: { bpm: 78, chords: [[42, 'm'], [38, 'M'], [47, 'm'], [40, 'M']], bass: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], bassType: 'sine', bassCut: 300, drone: 30,
      kick: [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], hat: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
      arp: { rate: 3, type: 'sine', vol: 0.026 }, lead: 0.3, leadType: 'sine', padCut: 900, scale: [0, 2, 3, 5, 7, 8, 10], whale: true, wind: true, bells: 0.08 },
    // 8. The Starless Abyss: dissonant and relentless
    d7: { bpm: 126, chords: [[48, 'm'], [54, 'd'], [48, 'm'], [49, 'M']], bass: [1,1,0,1,1,0,1,1,1,1,0,1,2,0,1,1], bassCut: 600, drone: 36,
      kick: [1,0,0,0,1,0,0,1,1,0,0,0,1,0,1,0], hat: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1],
      arp: { rate: 1, type: 'sawtooth', vol: 0.014 }, lead: 0.45, leadType: 'square', padCut: 1200, scale: [0, 1, 3, 5, 6, 8, 10], bells: 0.07, wind: true },
    // 9. The Drowned Spire: ancient and cavernous; organ pads, choir-like drones, tolling bells
    d8: { bpm: 84, chords: [[43, 'm'], [51, 'M'], [46, 'M'], [41, 'M']], bass: [1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0], bassType: 'sine', bassCut: 500, drone: 31,
      kick: [1,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0], hat: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], snare: [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
      arp: { rate: 2, type: 'square', vol: 0.014, oct: 24, seq: [0, 2, 1, 2, 0, 3, 1, 2] }, lead: 0.3, leadType: 'triangle', padType: 'square', padCut: 1100, scale: [0, 2, 3, 5, 7, 9, 10], bells: 0.18, wind: true, whale: true },
    // 10. The Ember's End: the last stand. Epic harmonic minor, war drums
    d9: { bpm: 132, chords: [[45, 'm'], [41, 'M'], [38, 'm'], [40, 'M']], bass: [1,0,1,1,1,0,1,1,1,0,1,1,2,0,1,1], bassCut: 700, drone: 33,
      kick: [1,0,0,1,1,0,0,0,1,0,0,1,1,0,1,0], hat: [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,1], snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1],
      arp: { rate: 1, type: 'square', vol: 0.016, oct: 36 }, lead: 0.5, leadType: 'sawtooth', padCut: 1600, scale: [0, 2, 3, 5, 7, 8, 11], bells: 0.08, wind: true },
    // The Drowned Sun: three phases that grow ever more desperate
    f1: { bpm: 122, chords: [[45, 'm'], [41, 'M7'], [43, 'M'], [40, 's']], bass: [1,0,1,0,1,0,1,1,1,0,1,0,1,0,2,0], bassCut: 700, drone: 33,
      kick: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,1,0], hat: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1], snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
      arp: { rate: 1, type: 'triangle', vol: 0.02, oct: 36 }, lead: 0.5, leadType: 'triangle', padCut: 2200, scale: [0, 2, 3, 5, 7, 8, 11], bells: 0.12, boss: true },
    f2: { bpm: 138, chords: [[45, 'm'], [46, 'M'], [43, 'M'], [44, 'd']], bass: [1,1,0,1,1,0,1,1,1,1,0,1,2,0,1,1], bassCut: 800, drone: 33,
      kick: [1,0,0,1,1,0,0,1,1,0,0,1,1,0,1,0], hat: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,1,1],
      arp: { rate: 1, type: 'square', vol: 0.018, oct: 36 }, lead: 0.55, leadType: 'sawtooth', padCut: 2400, scale: [0, 1, 3, 5, 7, 8, 11], bells: 0.06, wind: true, boss: true },
    f3: { bpm: 150, chords: [[45, 'm'], [51, 'd'], [46, 'M'], [44, 'd']], bass: [1,1,1,1,2,1,1,1,1,1,1,1,2,1,2,1], bassCut: 900, drone: 33,
      kick: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1], hat: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], snare: [0,0,0,0,1,0,0,1,0,0,0,0,1,0,1,1],
      arp: { rate: 1, type: 'sawtooth', vol: 0.016, oct: 24 }, lead: 0.6, leadType: 'square', padCut: 2000, scale: [0, 1, 3, 4, 6, 8, 10], bells: 0.1, wind: true, whale: true, boss: true },
  };
  // Boss remix of every Depth song: faster, full drums, busier bass, louder lead
  for (let i = 0; i < 10; i++) {
    const b = Object.assign({}, TRACKS['d' + i]);
    b.bpm = Math.min(150, Math.round(b.bpm * (b.bpm < 90 ? 1.35 : 1.15)));
    if (b.bass.filter(x => x).length < 8) b.bass = [1,0,1,0,1,0,1,1,1,0,1,0,1,0,2,0];
    b.kick = [1,0,0,0,1,0,0,0,1,0,0,0,1,0,1,0];
    b.hat = b.hat && b.hat.filter(x => x).length > 6 ? b.hat : [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1];
    b.snare = [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1];
    b.lead = Math.min(0.6, (b.lead || 0.3) + 0.15); b.padCut = (b.padCut || 1500) + 500; b.bassType = 'sawtooth'; b.bassCut = (b.bassCut || 600) + 200;
    b.swing = 0; b.bubbles = 0; b.bells = (b.bells || 0) * 0.4; b.boss = true;
    TRACKS['d' + i + 'b'] = b;
  }
  const M = { track: null, name: '', step: 0, next: 0, intensity: 0, timer: null, motif: [] };
  function chordNotes(c) {
    const r = c[0], q = c[1];
    if (q === 'm') return [r, r + 3, r + 7];
    if (q === 'm7') return [r, r + 3, r + 7, r + 10];
    if (q === 'M7') return [r, r + 4, r + 7, r + 11];
    if (q === 's') return [r, r + 2, r + 7];
    if (q === 'd') return [r, r + 3, r + 6];
    return [r, r + 4, r + 7];
  }
  function makeMotif() {
    // a repeating 2-bar melodic motif in scale degrees, -1 = rest
    const m = [];
    for (let i = 0; i < 32; i++) {
      if (i % 2 === 1 && Math.random() < 0.7) { m.push(-1); continue; }
      m.push(Math.random() < 0.35 ? -1 : Math.floor(Math.random() * 7));
    }
    M.motif = m;
  }
  function music(name) {
    if (FILE_TRACKS[name]) { // hand over to the pre-rendered song; the synth sequencer rests
      if (M.name !== name) { M.name = name; M.track = null; }
      playFile(name); if (!M.timer) M.timer = setInterval(tick, 30);
      return;
    }
    stopFile();
    if (!TRACKS[name]) name = 'menu';
    if (!ctx) { M.name = name; return; }
    if (M.name === name && M.track) return;
    M.name = name; M.track = TRACKS[name]; M.step = 0; M.next = ctx.currentTime + 0.12; makeMotif();
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(0.0001, ctx.currentTime);
    musicBus.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
    if (!M.timer) M.timer = setInterval(tick, 30);
  }
  function setIntensity(i) { M.intensity = i; }
  function tick() {
    if (fileEl && fileName) { const ft = FILE_TRACKS[fileName]; if (fileEl.currentTime >= ft.loopEnd) fileEl.currentTime = ft.loopStart; }
    if (!ctx || !M.track || ctx.state !== 'running') return;
    const tr = M.track, spb = 60 / tr.bpm / 4; // seconds per 16th
    if (M.next < ctx.currentTime - 0.3) M.next = ctx.currentTime + 0.05;
    while (M.next < ctx.currentTime + 0.15) { scheduleStep(M.next, M.step, tr, spb); M.next += spb; M.step++; }
  }
  function bell(t, f, vol) {
    tone(t, f, 0.02, { type: 'sine', vol: vol, attack: 0.004, release: 2.4, dest: musicBus });
    tone(t, f * 2.76, 0.02, { type: 'sine', vol: vol * 0.25, attack: 0.004, release: 1.2, dest: musicBus });
  }
  function scheduleStep(t0, step, tr, spb) {
    const t = t0 + (tr.swing && step % 2 === 1 ? spb * tr.swing : 0);
    const s16 = step % 16, bar = Math.floor(step / 16), barLen = spb * 16;
    const chord = tr.chords[bar % tr.chords.length];
    const notes = chordNotes(chord);
    // run songs build up in layers as the waves get harder; menus and bosses play in full
    const I = /^d\d$/.test(M.name) ? M.intensity : 4;
    const dest = musicBus, root = tr.chords[0][0];
    if (bar > 0 && bar % 8 === 0 && s16 === 0) makeMotif();
    if (s16 === 0) {
      // pad
      notes.forEach((n, i) => {
        tone(t, mtof(n + 12), spb * 15, { type: tr.padType || 'sawtooth', vol: tr.padType === 'triangle' ? 0.04 : 0.032, attack: spb * 4, release: spb * 5, cutoff: tr.padCut, detune: (i - 1) * 7, dest });
        if (!tr.padType) tone(t, mtof(n + 12), spb * 15, { type: 'triangle', vol: 0.026, attack: spb * 4, release: spb * 4, dest });
      });
      // low drone
      if (tr.drone) {
        tone(t, mtof(tr.drone), barLen, { type: 'sine', vol: 0.08, attack: barLen * 0.3, release: barLen * 0.5, dest });
        tone(t, mtof(tr.drone + 7), barLen, { type: 'triangle', vol: 0.018, attack: barLen * 0.4, release: barLen * 0.5, cutoff: 500, dest });
      }
      // wind swell
      if (tr.wind && bar % 2 === 0) noise(t, barLen * 1.8, { ftype: 'bandpass', freq: 350, to: 1100, q: 2.5, vol: 0.045, attack: barLen * 0.7, dest });
      // whale song: slow sliding calls
      if (tr.whale && bar % 4 === 2) tone(t + spb * 2, mtof(notes[0] + 24), barLen * 0.9, { type: 'sine', to: mtof(notes[0] + 17), glide: barLen * 0.9, vol: 0.045, attack: 0.5, release: 1.5, cutoff: 1500, dest });
    }
    // bass
    const b = tr.bass[s16];
    if (b) tone(t, mtof(chord[0] - 12 + (b === 2 ? 12 : 0)), spb * 0.9, { type: tr.bassType || 'sawtooth', vol: tr.bassType === 'sine' ? 0.16 : 0.11, release: 0.06, cutoff: (tr.bassCut || 500) + I * 120, q: 4, dest });
    // arpeggio
    const arp = tr.arp;
    if (I >= 1 && arp && step % arp.rate === 0) {
      const seq = arp.seq || [0, 1, 2, 1, 0, 2, 1, 2];
      const k = Math.floor(step / arp.rate) % seq.length;
      const n = notes[seq[k] % notes.length] + (arp.oct || 24) + (k >= 6 ? 12 : 0);
      tone(t, mtof(n), spb * 0.6 * arp.rate, { type: arp.type, vol: arp.vol, release: arp.type === 'sine' ? 0.4 : 0.1, cutoff: arp.type === 'sine' ? null : 2500, dest });
    }
    // distant bells and bubbles
    if (tr.bells && s16 % 2 === 0 && Math.random() < tr.bells) bell(t, mtof(root + 36 + tr.scale[Math.floor(Math.random() * 7)]), 0.035);
    if (tr.bubbles && Math.random() < tr.bubbles * 0.5) { const f = mtof(root + 31 + Math.floor(Math.random() * 10)); tone(t, f, 0.05, { type: 'sine', to: f * 1.6, glide: 0.06, vol: 0.03, release: 0.05, dest }); }
    // drums
    if (I >= 2 && tr.kick && tr.kick[s16]) { tone(t, 150, 0.09, { type: 'sine', vol: 0.3, to: 40, glide: 0.09, release: 0.05, dest: musicGain }); }
    if (I >= 2 && tr.hat && tr.hat[s16]) noise(t, 0.04, { freq: 8000, q: 1, vol: 0.032, ftype: 'highpass', dest: musicGain });
    if (I >= 3 && tr.snare && tr.snare[s16]) { noise(t, 0.14, { freq: 1800, q: 0.8, vol: 0.11, dest: musicGain }); tone(t, 220, 0.06, { type: 'triangle', vol: 0.06, to: 160, dest: musicGain }); }
    // lead melody
    if (I >= 3 && tr.lead > 0) {
      const deg = M.motif[(step % 32)];
      if (deg >= 0) {
        let semis = tr.scale[deg % 7];
        if (s16 % 4 === 0) { const ct = notes.map(x => (x - root + 120) % 12); semis = ct[deg % ct.length]; }
        const lt = tr.leadType || 'triangle';
        tone(t, mtof(root + 24 + semis), spb * 1.6, { type: lt, vol: 0.1 * tr.lead * (lt === 'sawtooth' || lt === 'square' ? 0.55 : 1), attack: 0.01, release: 0.22, cutoff: lt === 'sine' || lt === 'triangle' ? null : 2200, dest });
      }
    }
  }
  return { init, play, music, setIntensity, setVolumes, suspend, resume, get ready() { return !!ctx; } };
})();
