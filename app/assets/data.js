'use strict';
// ---------- static game data ----------
const DEPTHS = [
  { name: 'The Shallows', hp: 1.0, dmg: 1.0, count: 1.0, embers: 1.0, bg: [8, 18, 38], tint: '#2a6cff' },
  { name: 'Twilight Reef', hp: 1.55, dmg: 1.25, count: 1.12, embers: 1.6, bg: [20, 10, 40], tint: '#a040ff' },
  { name: 'Abyssal Shelf', hp: 2.3, dmg: 1.5, count: 1.25, embers: 2.4, bg: [4, 26, 30], tint: '#20e0c0' },
  { name: 'Midnight Trench', hp: 3.3, dmg: 1.8, count: 1.4, embers: 3.5, bg: [30, 6, 18], tint: '#ff3070' },
  { name: 'The Hadal Deep', hp: 4.8, dmg: 2.2, count: 1.55, embers: 5.0, bg: [3, 3, 8], tint: '#ffffff' },
];
const FINAL_WAVE = 20;

const SPIRITS = [
  { id: 'ember', name: 'Ember', color: '#ffa040', weapon: 'bolt', hp: 100, speed: 1, dmg: 1, armor: 0,
    trait: 'Balanced. +10% XP gain.', xp: 1.1, unlock: null },
  { id: 'rime', name: 'Rime', color: '#8fe8ff', weapon: 'fan', hp: 120, speed: 0.95, dmg: 1, armor: 0,
    trait: 'Sturdy. Chill lasts twice as long.', chill: 2, unlock: { text: 'Reach wave 8', check: s => s.stats.bestWave >= 8 } },
  { id: 'volt', name: 'Volt', color: '#f4f060', weapon: 'arc', hp: 85, speed: 1.12, dmg: 1, armor: 0,
    trait: 'Swift. Arcs chain +2 further.', chain: 2, unlock: { text: 'Defeat 3 Wardens', check: s => s.stats.bosses >= 3 } },
  { id: 'nyx', name: 'Nyx', color: '#c890ff', weapon: 'orbit', hp: 105, speed: 1, dmg: 1, armor: 0.1,
    trait: 'Takes 10% less damage. Orbs +1.', orbs: 1, unlock: { text: 'Clear Depth 1 (wave 20)', check: s => s.depthCleared >= 1 } },
  { id: 'pyre', name: 'Pyre', color: '#ff5a4a', weapon: 'nova', hp: 80, speed: 1.03, dmg: 1.2, armor: 0,
    trait: 'Fragile but fierce. +20% damage.', unlock: { text: 'Slay 2500 foes in total', check: s => s.stats.kills >= 2500 } },
  { id: 'sol', name: 'Sol', color: '#ffe9a8', weapon: 'seeker', hp: 100, speed: 1, dmg: 1, armor: 0,
    trait: 'Radiant. Starts with a random relic.', relic: true, unlock: { text: 'Clear Depth 3', check: s => s.depthCleared >= 3 } },
];

// Weapons: s(l) returns stats at level l (1..5)
const WEAPONS = {
  bolt: { name: 'Spark Bolt', color: '#ffb050', icon: 'bolt',
    lv: ['', 'Fires bolts at the nearest foe.', '+40% damage, faster fire.', '+1 bolt per volley.', 'Bolts pierce one foe.', '+1 bolt, +30% damage.'],
    s: l => ({ dmg: [0, 10, 14, 15, 17, 22][l], cd: [0, 0.6, 0.5, 0.48, 0.45, 0.42][l], count: l >= 5 ? 3 : l >= 3 ? 2 : 1, pierce: l >= 4 ? 1 : 0, speed: 440 }) },
  fan: { name: 'Frost Shards', color: '#8fe8ff', icon: 'fan',
    lv: ['', 'Sprays chilling shards in a cone.', '+1 shard, +damage.', 'Faster volleys.', '+2 shards.', 'Shards pierce, +damage.'],
    s: l => ({ dmg: [0, 7, 9, 9, 10, 13][l], cd: [0, 1.0, 0.95, 0.8, 0.78, 0.72][l], count: [0, 3, 4, 4, 6, 6][l], pierce: l >= 5 ? 1 : 0, speed: 380 }) },
  arc: { name: 'Chain Arc', color: '#f4f060', icon: 'arc',
    lv: ['', 'Lightning leaps between foes.', '+1 chain, +damage.', 'Faster strikes.', '+2 chains.', 'Twin arcs, +damage.'],
    s: l => ({ dmg: [0, 14, 18, 19, 21, 26][l], cd: [0, 1.15, 1.05, 0.85, 0.82, 0.75][l], chain: [0, 3, 4, 4, 6, 6][l], count: l >= 5 ? 2 : 1, range: 200 }) },
  orbit: { name: 'Orbit Orbs', color: '#c890ff', icon: 'orbit',
    lv: ['', 'Orbs circle and guard you.', '+1 orb.', '+damage, wider orbit.', '+1 orb, faster spin.', '+1 orb, +damage.'],
    s: l => ({ dmg: [0, 9, 10, 14, 15, 19][l], count: [0, 2, 3, 3, 4, 5][l], radius: [0, 58, 60, 72, 74, 78][l], spin: [0, 2.6, 2.7, 2.8, 3.4, 3.6][l] }) },
  nova: { name: 'Nova Pulse', color: '#ff7a4a', icon: 'nova',
    lv: ['', 'Periodic blast around you.', '+damage, larger.', 'Pulses more often.', '+damage, larger.', 'Double pulse.'],
    s: l => ({ dmg: [0, 20, 28, 30, 40, 44][l], cd: [0, 3.2, 3.0, 2.4, 2.3, 2.1][l], radius: [0, 110, 130, 135, 155, 160][l], count: l >= 5 ? 2 : 1 }) },
  seeker: { name: 'Seekers', color: '#ffe9a8', icon: 'seeker',
    lv: ['', 'Homing sparks that explode.', '+1 seeker.', 'Bigger blasts, +damage.', '+1 seeker.', '+1 seeker, faster.'],
    s: l => ({ dmg: [0, 16, 17, 23, 24, 28][l], cd: [0, 1.6, 1.55, 1.5, 1.45, 1.25][l], count: [0, 1, 2, 2, 3, 4][l], aoe: [0, 38, 40, 52, 54, 58][l] }) },
  mine: { name: 'Cinder Mines', color: '#ff4a80', icon: 'mine',
    lv: ['', 'Drop mines that erupt near foes.', '+damage, faster drops.', 'Bigger eruptions.', '+1 mine per drop.', 'Erupt twice.'],
    s: l => ({ dmg: [0, 32, 42, 46, 48, 55][l], cd: [0, 1.6, 1.35, 1.3, 1.3, 1.2][l], aoe: [0, 56, 58, 74, 76, 80][l], count: l >= 4 ? 2 : 1, twice: l >= 5 }) },
};
const WEAPON_IDS = Object.keys(WEAPONS);

const PASSIVES = {
  vigor:    { name: 'Vigor', desc: '+20 max HP and heal 20.', color: '#ff5a6a', max: 5 },
  swift:    { name: 'Swiftness', desc: '+8% move speed.', color: '#7affc8', max: 5 },
  fury:     { name: 'Fury', desc: '+10% damage.', color: '#ff7040', max: 5 },
  alacrity: { name: 'Alacrity', desc: '-7% weapon cooldowns.', color: '#ffd060', max: 5 },
  reach:    { name: 'Reach', desc: '+30% pickup radius.', color: '#60c0ff', max: 5 },
  mending:  { name: 'Mending', desc: '+0.5 HP regenerated per second.', color: '#80ff80', max: 5 },
  precision:{ name: 'Precision', desc: '+7% critical chance.', color: '#ffffff', max: 5 },
  bulwark:  { name: 'Bulwark', desc: '-6% damage taken.', color: '#a0a8c0', max: 5 },
  multi:    { name: 'Multiplicity', desc: '+1 projectile / orb / seeker.', color: '#ff90ff', max: 2 },
  expanse:  { name: 'Expanse', desc: '+12% area of effect.', color: '#ffb0ff', max: 5 },
  wisdom:   { name: 'Wisdom', desc: '+12% XP gained.', color: '#b0ff60', max: 5 },
};
const PASSIVE_IDS = Object.keys(PASSIVES);

const RELICS = {
  glass:   { name: 'Glass Heart', desc: '+40% damage, -25% max HP.', color: '#ff80c0' },
  crown:   { name: 'Tidal Crown', desc: '+1 projectile to every weapon.', color: '#60e0ff' },
  phoenix: { name: 'Phoenix Plume', desc: 'Revive once at full HP.', color: '#ffa030' },
  hourglass:{ name: 'Sunken Hourglass', desc: '-15% weapon cooldowns.', color: '#ffe080' },
  leech:   { name: 'Leech Ember', desc: 'Heal 1 HP for every 6 foes slain.', color: '#ff4040' },
  lantern: { name: 'Storm Lantern', desc: '+10% crit chance, crits deal 3x.', color: '#f8ff80' },
  lode:    { name: 'Lodestone', desc: 'Double pickup radius, +15% XP.', color: '#80a0ff' },
  thorn:   { name: 'Thornshell', desc: 'Being hit unleashes a fiery nova.', color: '#ff6a30' },
  quick:   { name: 'Quicksilver', desc: '+15% move speed, -8% cooldowns.', color: '#d0e8ff' },
  coin:    { name: 'Gilded Coin', desc: '+50% Embers earned this run.', color: '#ffd040' },
  titan:   { name: 'Titan Shell', desc: '+60 max HP, -6% move speed.', color: '#c0a080' },
  prism:   { name: 'Prism Core', desc: '+25% area, +10% damage.', color: '#e0a0ff' },
};
const RELIC_IDS = Object.keys(RELICS);

const HEARTH = [
  { id: 'vit',   name: 'Vitality',    max: 10, base: 18, grow: 1.42, desc: r => `+${10 * r} max HP` },
  { id: 'might', name: 'Might',       max: 10, base: 25, grow: 1.45, desc: r => `+${4 * r}% damage` },
  { id: 'haste', name: 'Haste',       max: 5,  base: 22, grow: 1.6,  desc: r => `+${3 * r}% move speed` },
  { id: 'cel',   name: 'Celerity',    max: 8,  base: 30, grow: 1.5,  desc: r => `-${3 * r}% cooldowns` },
  { id: 'mag',   name: 'Magnetism',   max: 5,  base: 15, grow: 1.6,  desc: r => `+${12 * r}% pickup radius` },
  { id: 'wis',   name: 'Insight',     max: 8,  base: 25, grow: 1.5,  desc: r => `+${5 * r}% XP gain` },
  { id: 'arm',   name: 'Carapace',    max: 6,  base: 35, grow: 1.55, desc: r => `-${3 * r}% damage taken` },
  { id: 'fort',  name: 'Fortune',     max: 8,  base: 40, grow: 1.5,  desc: r => `+${8 * r}% Embers earned` },
  { id: 'reroll',name: 'Second Sight',max: 3,  base: 70, grow: 2.0,  desc: r => `${r} reroll${r === 1 ? '' : 's'} per run` },
  { id: 'regen', name: 'Kindling',    max: 5,  base: 40, grow: 1.6,  desc: r => `+${(0.2 * r).toFixed(1)} HP/s regen` },
  { id: 'wind',  name: 'Second Wind', max: 1,  base: 300, grow: 1,   desc: r => r ? 'Revive once at 50% HP' : 'Revive once per run' },
  { id: 'choice',name: 'Foresight',   max: 1,  base: 260, grow: 1,   desc: r => r ? '4 choices on level up' : 'Get a 4th level-up choice' },
];
const hearthCost = (h, r) => Math.round(h.base * Math.pow(h.grow, r));

const ENEMIES = {
  drifter:  { hp: 12, spd: 56, dmg: 9,  r: 11, xp: 1,   color: '#9a5cff', shape: 0, from: 1, w: 10 },
  dart:     { hp: 8,  spd: 112, dmg: 7, r: 8,  xp: 1,   color: '#ff4fa8', shape: 1, from: 3, w: 5 },
  spitter:  { hp: 22, spd: 44, dmg: 8,  r: 12, xp: 2,   color: '#5cff9a', shape: 2, from: 4, w: 3, ranged: true },
  brute:    { hp: 75, spd: 30, dmg: 18, r: 19, xp: 4,   color: '#ff3b3b', shape: 3, from: 6, w: 2.5 },
  splitter: { hp: 34, spd: 46, dmg: 10, r: 14, xp: 2,   color: '#3be0d0', shape: 4, from: 8, w: 2.5, split: true },
  charger:  { hp: 42, spd: 42, dmg: 16, r: 13, xp: 3,   color: '#ffd23b', shape: 5, from: 11, w: 2.5, charge: true },
  wraith:   { hp: 30, spd: 62, dmg: 12, r: 12, xp: 3,   color: '#c8e8ff', shape: 6, from: 14, w: 2.5, blink: true },
  mini:     { hp: 6,  spd: 76, dmg: 5,  r: 7,  xp: 0.5, color: '#3be0d0', shape: 0, from: 99, w: 0 },
};
const ENEMY_IDS = Object.keys(ENEMIES).filter(k => ENEMIES[k].w > 0);

const BOSSES = [
  { name: 'The Hollow Eye',   hp: 2400,  r: 34, color: '#b06cff', spd: 45, dmg: 20, kind: 'eye' },
  { name: 'Maw of Ash',       hp: 5200,  r: 40, color: '#ff5030', spd: 48, dmg: 22, kind: 'maw' },
  { name: 'The Tidecaller',   hp: 8200,  r: 38, color: '#30c0ff', spd: 40, dmg: 24, kind: 'tide' },
  { name: 'Heart of the Deep',hp: 15000, r: 48, color: '#ff3080', spd: 40, dmg: 30, kind: 'heart' },
];
