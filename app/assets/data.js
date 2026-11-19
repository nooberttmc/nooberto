'use strict';
// ---------- static game data ----------
// Each Depth has its own look: enemy palette (pal), boss colours, a decoration style and an epithet for wardens.
// fire: how fast ranged foes shoot / how fast their bullets fly.
const DEPTHS = [
  { name: 'The Shallows', hp: 1.0, dmg: 1.0, count: 1.0, fire: 1.0, embers: 1.0, bg: [8, 18, 38], tint: '#2a6cff', style: 'plain', epithet: '',
    pal: null, boss: null },
  { name: 'Twilight Reef', hp: 1.4, dmg: 1.2, count: 1.08, fire: 1.1, embers: 1.5, bg: [22, 10, 40], tint: '#c050ff', style: 'coral', epithet: 'Coral',
    pal: ['#ff6ad5', '#c86bff', '#ff8f6b', '#ff4f8b', '#e0a0ff', '#ffb0d0'], boss: ['#ff6ad5', '#ff8f6b', '#c86bff', '#ff4f8b'] },
  { name: 'Abyssal Shelf', hp: 1.9, dmg: 1.4, count: 1.16, fire: 1.2, embers: 2.1, bg: [4, 24, 30], tint: '#20e0c0', style: 'lure', epithet: 'Luminous',
    pal: ['#2ef0d0', '#30a8ff', '#7cf05a', '#00d0ff', '#a0ffe0', '#5a8cff'], boss: ['#2ef0d0', '#30a8ff', '#7cf05a', '#00e0ff'] },
  { name: 'Midnight Trench', hp: 2.5, dmg: 1.65, count: 1.24, fire: 1.3, embers: 2.8, bg: [30, 6, 16], tint: '#ff3060', style: 'spiked', epithet: 'Crimson',
    pal: ['#ff3040', '#ff6a20', '#d01060', '#ff9050', '#ff2080', '#c04040'], boss: ['#ff3040', '#ff6a20', '#ff2080', '#ff9050'] },
  { name: 'The Hadal Deep', hp: 3.2, dmg: 1.9, count: 1.32, fire: 1.4, embers: 3.6, bg: [6, 6, 12], tint: '#e8e8ff', style: 'bone', epithet: 'Bone',
    pal: ['#e8e4d8', '#b8c0d8', '#f0d8b0', '#d0d0e8', '#ffffff', '#c8b8a0'], boss: ['#e8e4d8', '#f0d8b0', '#b8c0d8', '#ffffff'] },
  { name: 'Sunless Rift', hp: 4.0, dmg: 2.2, count: 1.4, fire: 1.5, embers: 4.6, bg: [26, 18, 4], tint: '#ffc030', style: 'crystal', epithet: 'Gilded',
    pal: ['#ffc030', '#ffe070', '#ff9a20', '#fff0a0', '#e8b040', '#ffd050'], boss: ['#ffc030', '#ff9a20', '#ffe070', '#fff0a0'] },
  { name: "Leviathan's Grave", hp: 5.0, dmg: 2.5, count: 1.48, fire: 1.6, embers: 5.8, bg: [6, 8, 30], tint: '#6070ff', style: 'tentacle', epithet: 'Drowned',
    pal: ['#6070ff', '#40c0ff', '#9060ff', '#3090c0', '#80a0ff', '#5050d0'], boss: ['#6070ff', '#40c0ff', '#9060ff', '#80a0ff'] },
  { name: 'The Endless Maw', hp: 6.2, dmg: 2.9, count: 1.56, fire: 1.75, embers: 7.2, bg: [2, 0, 4], tint: '#ff1030', style: 'void', epithet: 'Void',
    pal: ['#ff1030', '#ff3070', '#c00040', '#ff5050', '#ff0090', '#d02020'], boss: ['#ff1030', '#ff0090', '#ff3070', '#ff5050'] },
];
const FINAL_WAVE = 20;
const TIDEBREAKER_WAVE = 40;

const SPIRITS = [
  { id: 'ember', name: 'Ember', color: '#ffa040', weapon: 'bolt', hp: 100, speed: 1, dmg: 1, armor: 0,
    trait: 'Balanced. +10% XP gain.', xp: 1.1, unlock: null },
  { id: 'rime', name: 'Rime', color: '#8fe8ff', weapon: 'fan', hp: 120, speed: 0.95, dmg: 1, armor: 0,
    trait: 'Sturdy. Chill lasts twice as long.', chill: 2, unlock: { text: 'Reach wave 15', check: s => s.stats.bestWave >= 15 } },
  { id: 'volt', name: 'Volt', color: '#f4f060', weapon: 'arc', hp: 85, speed: 1.12, dmg: 1, armor: 0,
    trait: 'Swift. Arcs chain +2 further.', chain: 2, unlock: { text: 'Slay 12 Wardens', check: s => s.stats.bosses >= 12 } },
  { id: 'nyx', name: 'Nyx', color: '#c890ff', weapon: 'orbit', hp: 105, speed: 1, dmg: 1, armor: 0.1,
    trait: 'Takes 10% less damage. Orbs +1.', orbs: 1, unlock: { text: 'Clear Depth 2', check: s => s.depthCleared >= 2 } },
  { id: 'pyre', name: 'Pyre', color: '#ff5a4a', weapon: 'nova', hp: 80, speed: 1.03, dmg: 1.2, armor: 0,
    trait: 'Fragile but fierce. +20% damage.', unlock: { text: 'Slay 15,000 foes in total', check: s => s.stats.kills >= 15000 } },
  { id: 'sol', name: 'Sol', color: '#ffe9a8', weapon: 'seeker', hp: 100, speed: 1, dmg: 1, armor: 0,
    trait: 'Radiant. Starts with a random relic.', relic: true, unlock: { text: 'Clear Depth 4', check: s => s.depthCleared >= 4 } },
  { id: 'wisp', name: 'Wisp', color: '#a0fff0', weapon: 'crescent', hp: 95, speed: 1.08, dmg: 1, armor: 0,
    trait: 'Starts with an ability: Phase Dash.', ability: 'dash', unlock: { text: 'Complete 25 bounties', check: s => (s.stats.bounties || 0) >= 25 } },
  { id: 'tempest', name: 'Tempest', color: '#b0c8ff', weapon: 'meteor', hp: 100, speed: 1, dmg: 1.1, armor: 0,
    trait: 'Shrine blessings last 50% longer.', shrine: 1.5, unlock: { text: 'Activate 40 shrines', check: s => (s.stats.shrines || 0) >= 40 } },
  { id: 'gloom', name: 'Gloom', color: '#8070ff', weapon: 'lance', hp: 110, speed: 1, dmg: 1.1, armor: 0.05,
    trait: 'Abilities recharge 25% faster.', abil: 0.75, unlock: { text: 'Clear Depth 6', check: s => s.depthCleared >= 6 } },
  { id: 'aurora', name: 'Aurora', color: '#ff90f0', weapon: 'ricochet', hp: 120, speed: 1.08, dmg: 1.25, armor: 0.1,
    trait: 'Tidebreaker. Starts with a Legendary relic.', legendary: true, unlock: { text: 'Survive wave 40 in The Endless Maw', check: s => !!s.tidebreaker } },
];

// Weapons: s(l) returns stats at level l (1..5)
const WEAPONS = {
  bolt: { name: 'Spark Bolt', color: '#ffb050',
    lv: ['', 'Fires bolts at the nearest foe.', '+40% damage, faster fire.', '+1 bolt per volley.', 'Bolts pierce one foe.', '+1 bolt, +30% damage.'],
    s: l => ({ dmg: [0, 10, 14, 15, 17, 22][l], cd: [0, 0.6, 0.5, 0.48, 0.45, 0.42][l], count: l >= 5 ? 3 : l >= 3 ? 2 : 1, pierce: l >= 4 ? 1 : 0, speed: 440 }) },
  fan: { name: 'Frost Shards', color: '#8fe8ff',
    lv: ['', 'Sprays chilling shards in a cone.', '+1 shard, +damage.', 'Faster volleys.', '+2 shards.', 'Shards pierce, +damage.'],
    s: l => ({ dmg: [0, 7, 9, 9, 10, 13][l], cd: [0, 1.0, 0.95, 0.8, 0.78, 0.72][l], count: [0, 3, 4, 4, 6, 6][l], pierce: l >= 5 ? 1 : 0, speed: 380 }) },
  arc: { name: 'Chain Arc', color: '#f4f060',
    lv: ['', 'Lightning leaps between foes.', '+1 chain, +damage.', 'Faster strikes.', '+2 chains.', 'Twin arcs, +damage.'],
    s: l => ({ dmg: [0, 14, 18, 19, 21, 26][l], cd: [0, 1.15, 1.05, 0.85, 0.82, 0.75][l], chain: [0, 3, 4, 4, 6, 6][l], count: l >= 5 ? 2 : 1, range: 200 }) },
  orbit: { name: 'Orbit Orbs', color: '#c890ff',
    lv: ['', 'Orbs circle and guard you.', '+1 orb.', '+damage, wider orbit.', '+1 orb, faster spin.', '+1 orb, +damage.'],
    s: l => ({ dmg: [0, 9, 10, 14, 15, 19][l], count: [0, 2, 3, 3, 4, 5][l], radius: [0, 58, 60, 72, 74, 78][l], spin: [0, 2.6, 2.7, 2.8, 3.4, 3.6][l] }) },
  nova: { name: 'Nova Pulse', color: '#ff7a4a',
    lv: ['', 'Periodic blast around you.', '+damage, larger.', 'Pulses more often.', '+damage, larger.', 'Double pulse.'],
    s: l => ({ dmg: [0, 20, 28, 30, 40, 44][l], cd: [0, 3.2, 3.0, 2.4, 2.3, 2.1][l], radius: [0, 110, 130, 135, 155, 160][l], count: l >= 5 ? 2 : 1 }) },
  seeker: { name: 'Seekers', color: '#ffe9a8',
    lv: ['', 'Homing sparks that explode.', '+1 seeker.', 'Bigger blasts, +damage.', '+1 seeker.', '+1 seeker, faster.'],
    s: l => ({ dmg: [0, 16, 17, 23, 24, 28][l], cd: [0, 1.6, 1.55, 1.5, 1.45, 1.25][l], count: [0, 1, 2, 2, 3, 4][l], aoe: [0, 38, 40, 52, 54, 58][l] }) },
  mine: { name: 'Cinder Mines', color: '#ff4a80',
    lv: ['', 'Drop mines that erupt near foes.', '+damage, faster drops.', 'Bigger eruptions.', '+1 mine per drop.', 'Erupt twice.'],
    s: l => ({ dmg: [0, 32, 42, 46, 48, 55][l], cd: [0, 1.6, 1.35, 1.3, 1.3, 1.2][l], aoe: [0, 56, 58, 74, 76, 80][l], count: l >= 4 ? 2 : 1, twice: l >= 5 }) },
  lance: { name: 'Ember Lance', color: '#ff9a60',
    lv: ['', 'A piercing beam scorches every foe in a line.', '+damage, faster.', 'Wider beam.', 'Fires a second beam.', '+damage, much faster.'],
    s: l => ({ dmg: [0, 22, 30, 32, 36, 46][l], cd: [0, 1.6, 1.4, 1.35, 1.3, 1.0][l], width: [0, 9, 9, 14, 14, 16][l], count: l >= 4 ? 2 : 1, len: 380 }) },
  crescent: { name: 'Moon Crescent', color: '#a0fff0',
    lv: ['', 'A spinning blade flies out and returns.', '+damage, faster throws.', '+1 crescent.', 'Bigger, longer reach.', '+1 crescent, +damage.'],
    s: l => ({ dmg: [0, 12, 16, 16, 19, 24][l], cd: [0, 1.8, 1.5, 1.5, 1.45, 1.3][l], count: [0, 1, 1, 2, 2, 3][l], size: [0, 10, 10, 11, 15, 16][l], reach: [0, 210, 210, 220, 270, 280][l] }) },
  aura: { name: 'Searing Aura', color: '#ff6a3a',
    lv: ['', 'Burns every foe close to you.', '+damage.', 'Larger aura.', '+damage, burns faster.', 'Huge aura that also chills.'],
    s: l => ({ dmg: [0, 5, 7, 8, 10, 12][l], tick: [0, 0.45, 0.45, 0.42, 0.33, 0.3][l], radius: [0, 62, 64, 78, 80, 96][l], chill: l >= 5 }) },
  meteor: { name: 'Starcaller', color: '#b0c8ff',
    lv: ['', 'Calls falling stars onto foes.', '+1 star.', 'Bigger impacts, +damage.', '+1 star, faster.', '+1 star, +damage.'],
    s: l => ({ dmg: [0, 30, 32, 42, 44, 52][l], cd: [0, 2.2, 2.1, 2.0, 1.7, 1.6][l], count: [0, 1, 2, 2, 3, 4][l], aoe: [0, 48, 50, 60, 62, 66][l] }) },
  ricochet: { name: 'Prism Shard', color: '#ff90f0',
    lv: ['', 'A shard that bounces between foes.', '+2 bounces.', '+damage, faster.', '+2 bounces.', 'Fires twin shards.'],
    s: l => ({ dmg: [0, 11, 13, 16, 17, 20][l], cd: [0, 1.1, 1.05, 0.9, 0.88, 0.8][l], bounces: [0, 3, 5, 5, 7, 7][l], count: l >= 5 ? 2 : 1 }) },
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
  focus:    { name: 'Focus', desc: '-10% ability cooldowns.', color: '#80e0ff', max: 3 },
};
const PASSIVE_IDS = Object.keys(PASSIVES);

// Active abilities (max 2 equipped, 3 with Twin Soul). Levels 1..3.
const ABILITIES = {
  purge:   { name: 'Purge', color: '#ffffff', cd: [0, 45, 38, 30],
    lv: ['', 'Erase every enemy bullet and blast all foes on screen.', 'Recharges faster, blast hits harder.', 'Recharges much faster.'] },
  dash:    { name: 'Phase Dash', color: '#a0fff0', cd: [0, 7, 5.5, 4],
    lv: ['', 'Dash forward, untouchable, burning foes you pass.', 'Recharges faster, longer dash.', 'Recharges much faster, leaves a fire trail.'] },
  warp:    { name: 'Time Warp', color: '#80b0ff', cd: [0, 35, 30, 25],
    lv: ['', 'Slow all foes and bullets by 70% for 4s.', 'Lasts 5s.', 'Lasts 6s and recharges faster.'] },
  aegis:   { name: 'Aegis', color: '#ffe080', cd: [0, 32, 27, 22],
    lv: ['', 'Become invulnerable for 3s. Touching bullets are destroyed.', 'Lasts 4s.', 'Lasts 4s, recharges faster.'] },
  inferno: { name: 'Inferno', color: '#ff6a30', cd: [0, 26, 22, 18],
    lv: ['', 'A ring of fire surrounds you for 6s.', 'Bigger, hotter ring.', 'Huge ring, recharges faster.'] },
  hole:    { name: 'Singularity', color: '#c070ff', cd: [0, 28, 24, 20],
    lv: ['', 'A black hole drags foes in, then detonates.', 'Stronger pull, bigger blast.', 'Recharges faster.'] },
  starfall:{ name: 'Starfall', color: '#b0c8ff', cd: [0, 30, 25, 20],
    lv: ['', 'Call down 12 meteors on nearby foes.', '18 meteors.', '24 meteors, recharges faster.'] },
};
const ABILITY_IDS = Object.keys(ABILITIES);

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
  battery: { name: 'Storm Battery', desc: '-20% ability cooldowns.', color: '#80e0ff' },
  ward:    { name: 'Ward Stone', desc: 'Every 12s, a shield blocks one hit.', color: '#a0c0ff' },
};
const RELIC_IDS = Object.keys(RELICS);
// Rare, run-defining relics. Each slot in a relic choice has a small chance to be one of these.
const LEGENDS = {
  sigil:   { name: 'Arsenal Sigil', desc: '+1 weapon slot (5 weapons).', color: '#ffd040' },
  twin:    { name: 'Twin Soul', desc: '+1 ability slot (3 abilities).', color: '#ffd040' },
  sun:     { name: 'Sun Core', desc: '+50% damage and +20% area.', color: '#ffd040' },
  eternal: { name: 'Eternal Flame', desc: 'Revive twice at full HP.', color: '#ffd040' },
  dragon:  { name: 'Dragon Heart', desc: '+100 max HP and +3 HP/s regen.', color: '#ffd040' },
  aeon:    { name: 'Aeon Glass', desc: '-30% weapon and ability cooldowns.', color: '#ffd040' },
  oracle:  { name: 'Oracle Eye', desc: '+1 level-up choice and +3 rerolls.', color: '#ffd040' },
  halo:    { name: 'Seraph Halo', desc: '+2 projectiles to every weapon.', color: '#ffd040' },
};
const LEGEND_IDS = Object.keys(LEGENDS);
const relicDef = k => RELICS[k] || LEGENDS[k];

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
// The Deep Hearth: expensive second tier.
const HEARTH2 = [
  { id: 'abil',  name: 'Attunement',    max: 5, base: 1200, grow: 1.65, desc: r => `-${6 * r}% ability cooldowns` },
  { id: 'lucky', name: 'Relic Sense',   max: 5, base: 2000, grow: 1.7,  desc: r => `+${2 * r}% Legendary relic chance` },
  { id: 'crit',  name: 'Keen Edge',     max: 5, base: 1000, grow: 1.6,  desc: r => `+${3 * r}% critical chance` },
  { id: 'chest', name: 'Treasure Hunter', max: 4, base: 1400, grow: 1.7, desc: r => `+${10 * r}% chest chance from elites` },
  { id: 'start', name: 'Kindled Start', max: 3, base: 3000, grow: 2.2,  desc: r => `${r} free upgrade${r === 1 ? '' : 's'} at the start` },
  { id: 'banish',name: 'Banishment',    max: 3, base: 1600, grow: 2.0,  desc: r => `Banish ${r} level-up choice${r === 1 ? '' : 's'} per run` },
  { id: 'shrine',name: 'Shrine Keeper', max: 4, base: 1500, grow: 1.6,  desc: r => `Shrine blessings last +${25 * r}%` },
  { id: 'heart', name: 'Ember Heart',   max: 5, base: 1600, grow: 1.6,  desc: r => `+${5 * r}% max HP` },
];
const hearthCost = (h, r) => Math.round(h.base * Math.pow(h.grow, r));
// Soul Forge: endless rank, each +2% damage and +2% max HP.
const forgeCost = r => Math.round(2500 * Math.pow(1.28, r));

const ENEMIES = {
  drifter:  { hp: 12, spd: 56, dmg: 9,  r: 11, xp: 1,   color: '#9a5cff', shape: 0, pi: 0, from: 1, w: 10 },
  dart:     { hp: 8,  spd: 112, dmg: 7, r: 8,  xp: 1,   color: '#ff4fa8', shape: 1, pi: 1, from: 3, w: 5 },
  spitter:  { hp: 22, spd: 44, dmg: 8,  r: 12, xp: 2,   color: '#5cff9a', shape: 2, pi: 2, from: 3, w: 4, ranged: 'spit' },
  brute:    { hp: 75, spd: 30, dmg: 18, r: 19, xp: 4,   color: '#ff3b3b', shape: 3, pi: 3, from: 6, w: 2.5 },
  gunner:   { hp: 26, spd: 46, dmg: 8,  r: 12, xp: 2,   color: '#ffa040', shape: 7, pi: 4, from: 6, w: 3, ranged: 'burst' },
  splitter: { hp: 34, spd: 46, dmg: 10, r: 14, xp: 2,   color: '#3be0d0', shape: 4, pi: 5, from: 8, w: 2.5, split: true },
  sprayer:  { hp: 44, spd: 30, dmg: 8,  r: 15, xp: 3,   color: '#ff70c0', shape: 8, pi: 1, from: 9, w: 2.5, ranged: 'ring' },
  bloater:  { hp: 55, spd: 34, dmg: 12, r: 17, xp: 3,   color: '#c0ff60', shape: 9, pi: 2, from: 10, w: 2, pop: true },
  charger:  { hp: 42, spd: 42, dmg: 16, r: 13, xp: 3,   color: '#ffd23b', shape: 5, pi: 4, from: 11, w: 2.5, charge: true },
  sniper:   { hp: 22, spd: 40, dmg: 14, r: 11, xp: 3,   color: '#ff5050', shape: 10, pi: 3, from: 12, w: 2, ranged: 'snipe' },
  wraith:   { hp: 30, spd: 62, dmg: 12, r: 12, xp: 3,   color: '#c8e8ff', shape: 6, pi: 5, from: 14, w: 2.5, blink: true },
  beacon:   { hp: 110, spd: 12, dmg: 10, r: 16, xp: 6,  color: '#ff8030', shape: 11, pi: 0, from: 15, w: 0.8, ranged: 'spiral' },
  mini:     { hp: 6,  spd: 76, dmg: 5,  r: 7,  xp: 0.5, color: '#3be0d0', shape: 0, pi: 5, from: 999, w: 0 },
  gleamer:  { hp: 60, spd: 108, dmg: 0, r: 11, xp: 4,   color: '#ffd040', shape: 12, pi: -1, from: 999, w: 0 },
};
const ENEMY_IDS = Object.keys(ENEMIES).filter(k => ENEMIES[k].w > 0);

const BOSSES = [
  { name: 'The Hollow Eye',   hp: 2400,  r: 34, color: '#b06cff', spd: 45, dmg: 20, kind: 'eye',   sig: 'laser' },
  { name: 'Maw of Ash',       hp: 5200,  r: 40, color: '#ff5030', spd: 48, dmg: 22, kind: 'maw',   sig: 'zones' },
  { name: 'The Tidecaller',   hp: 8200,  r: 38, color: '#30c0ff', spd: 40, dmg: 24, kind: 'tide',  sig: 'wall' },
  { name: 'Heart of the Deep',hp: 15000, r: 48, color: '#ff3080', spd: 40, dmg: 30, kind: 'heart', sig: 'homing' },
];
// Extra boss attacks; deeper Depths unlock more of them for every warden.
const BOSS_EXTRAS = ['laser', 'zones', 'wall', 'homing', 'flower', 'cross', 'snipe'];

const SHRINES = {
  power:   { name: 'Shrine of Fury', desc: '+50% damage, -20% cooldowns', color: '#ff6040' },
  swift:   { name: 'Shrine of Wind', desc: '+35% speed, huge pickup radius', color: '#60ffc0' },
  fortune: { name: 'Shrine of Fortune', desc: 'Treasure and Embers', color: '#ffd040' },
  trial:   { name: 'Shrine of Trials', desc: 'Defeat the champions for a reward', color: '#c070ff' },
};
