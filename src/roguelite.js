// ===== ROGUELITE LAYER: path choice, duo boons, Rift Shards meta-progression, Rift Burst super =====
// ---- paths (Hades-style door choice with the reward shown up front) ----
const PATHS = {
  road: { name: 'RIFT ROAD', icon: '✦', col: '#ffd23c', desc: 'A normal stage.', reward: 'Boon' },
  elite: { name: 'PROVING GROUNDS', icon: '☠', col: '#ff6b6b', desc: 'Elite enemies everywhere.', reward: 'RARE+ Boon' },
  grove: { name: 'QUIET GROVE', icon: '✚', col: '#7dff8a', desc: 'Fewer waves, a healing spring.', reward: 'Heal 30% + Boon' },
  vault: { name: 'SHARD VAULT', icon: '◆', col: '#5ab4ff', desc: 'Extra treasure chests.', reward: 'Double Rift Shards' },
  gauntlet: { name: 'GAUNTLET', icon: '⚔', col: '#c77dff', desc: 'An extra arena of tough waves.', reward: 'EPIC Boon' },
  lifeline: { name: 'LIFELINE TRIAL', icon: '♥', col: '#ff8fab', desc: 'Enemies have +25% health.', reward: '+1 Life' },
};
function rollPaths() { const keys = shuffle(Object.keys(PATHS).filter(k => k !== 'road')); return rnd() < 0.35 ? ['road', keys[0]] : [keys[0], keys[1]]; }

// ---- duo boons: unlock when you own both prerequisite boons ----
RARITY[3] = { n: 'DUO', c: '#ffb3e6' };
BOONS.push(
  { id: 'stormcall', name: 'Storm Caller', r: 3, req: ['chain', 'speed'], desc: 'Lightning arcs far more often, +8% speed', max: 1, ap: p => { p.mods.chain += 2; p.mods.speed *= 1.08; } },
  { id: 'bloodpact', name: 'Blood Pact', r: 3, req: ['steal', 'thorns'], desc: 'Heal 15% more of damage dealt, stronger thorns', max: 1, ap: p => { p.mods.steal += 0.15; p.mods.thorns += 0.4; } },
  { id: 'juggernaut', name: 'Juggernaut', r: 3, req: ['weight', 'take'], desc: 'Smashes & specials shrug off light hits', max: 1, ap: p => { p.mods.armorAll = 1; } },
  { id: 'skylord', name: 'Sky Sovereign', r: 3, req: ['aerial', 'jump'], desc: '+1 midair jump, aerials deal +20%', max: 1, ap: p => { p.mods.jumps++; p.jumps++; p.mods.aerial *= 1.2; } },
  { id: 'overcharge', name: 'Overcharge', r: 3, req: ['smash', 'kb'], desc: 'Fully charged smashes erupt in a shockwave', max: 1, ap: p => { p.mods.overcharge = 1; } },
  { id: 'arcanist', name: 'Arcanist', r: 3, req: ['spec', 'atk'], desc: 'Specials +25%, Rift Burst charges 50% faster', max: 1, ap: p => { p.mods.spec *= 1.25; p.mods.meterMul = (p.mods.meterMul || 1) * 1.5; } },
);
BOON_BY_ID.stormcall = BOONS.find(b => b.id === 'stormcall'); for (const b of BOONS) BOON_BY_ID[b.id] = b;
function rollBoonsPlus(p, minTier = 0) {
  const have = id => p.boons.filter(x => x === id).length;
  const fortune = (Game.meta && Game.meta.fortune) || 0;
  const avail = BOONS.filter(b => b.r < 3 && have(b.id) < b.max);
  const out = [];
  for (let i = 0; i < 3; i++) {
    const r = rnd() - fortune * 0.06; let tier = r < 0.08 ? 2 : r < 0.36 ? 1 : 0; if (minTier >= 2 && i === 0) tier = 2; tier = Math.max(tier, Math.min(minTier, i === 0 ? minTier : 1));
    let c = avail.filter(b => b.r === tier && !out.includes(b.id)); if (!c.length) c = avail.filter(b => !out.includes(b.id)); if (c.length) out.push(pick(c).id);
  }
  const duos = BOONS.filter(b => b.r === 3 && !have(b.id) && b.req.every(q => have(q)));
  if (duos.length && rnd() < 0.45) out[0] = pick(duos).id;
  return out;
}

// ---- meta progression (saved per browser) ----
const FORGE = [
  { id: 'might', name: 'MIGHT', desc: '+4% damage per level', max: 5, cost: l => 40 + l * 35 },
  { id: 'guard', name: 'GUARD', desc: '-4% damage taken per level', max: 5, cost: l => 40 + l * 35 },
  { id: 'vigor', name: 'VIGOR', desc: '+1 starting life per level', max: 2, cost: l => 120 + l * 140 },
  { id: 'fortune', name: 'FORTUNE', desc: 'Better boon rarity odds', max: 3, cost: l => 70 + l * 60 },
  { id: 'reroll', name: 'REROLL', desc: '+1 boon reroll per run (SHIELD on the boon screen)', max: 3, cost: l => 60 + l * 50 },
  { id: 'head', name: 'HEAD START', desc: 'Begin each run with a random boon', max: 1, cost: l => 150 },
  { id: 'burst', name: 'RIFT AFFINITY', desc: 'Start runs with a half-charged Rift Burst', max: 1, cost: l => 110 },
];
const Meta = {
  d: store('sse_meta') || { shards: 0, lv: {}, total: 0, runs: 0 },
  lv(id) { return this.d.lv[id] || 0; },
  save() { store('sse_meta', this.d); },
  levels() { return Object.fromEntries(FORGE.map(f => [f.id, this.lv(f.id)])); },
  buy(i) { const f = FORGE[i], l = this.lv(f.id); if (l >= f.max) return false; const c = f.cost(l); if (this.d.shards < c) return false; this.d.shards -= c; this.d.lv[f.id] = l + 1; this.save(); return true; },
};
function applyMeta(p, mu) {
  if (!mu) return; p.mods.dmg *= 1 + 0.04 * (mu.might || 0); p.mods.take *= 1 - 0.04 * (mu.guard || 0);
  if (mu.head) { const c = BOONS.filter(b => b.r === 0 && b.id !== 'heal'); applyBoon(p, pick(c).id); }
  if (mu.burst) p.meter = 50;
}
function shardsFor(st) { return Math.round((st.kills || 0) * 0.5 + (st.cleared || 0) * 6 + (st.bosses || 0) * 25 + (st.endless || 0) * 10 + (st.bonus || 0) + (st.win ? 60 : 0)); }
function awardShards(st) { if (st._awarded) return st._earned; st._awarded = 1; const n = shardsFor(st); st._earned = n; Meta.d.shards += n; Meta.d.total += n; Meta.d.runs++; Meta.save(); return n; }

// ---- Rift Burst (super) ----
const BURST = [
  { name: 'METEOR RUSH', col: '#ff6b3c', fx: 'fire' },
  { name: 'THOUSAND CUTS', col: '#7fc4ff', fx: 'slash' },
  { name: 'STARFALL', col: '#c77dff', fx: 'arcane' },
  { name: 'WORLDBREAKER', col: '#ffb347', fx: 'fire' },
];
function startBurst(p) {
  p.meter = 0; p.state = 'burst'; p.sf = 0; p.move = null; p.vx = p.vy = p.kx = p.ky = 0; p.intang = 999; p.buf = {};
  World.freezeT = 54; World.burster = p; Audio2.play('burst'); World.flashT = 8; World.zp = 0.1;
}
function burstStrike(p) {
  const c = World.cam, vw = W / (2 * c.z) + 40, vh = H / (2 * c.z) + 40; const B = BURST[p.def.id];
  for (const e of World.enemies) {
    if (e.dead || e.dying || Math.abs(e.x - c.x) > vw || Math.abs(e.y - c.y) > vh) continue;
    const dx = e.x - p.x; const ang = dx >= 0 ? 60 : 120;
    const dmg = 26 * p.mods.dmg * (e.boss ? 1.6 : 1);
    if (p.def.id === 0) FX.explode(e.x, e.y - 30, 60); if (p.def.id === 2) { FX.ring(e.x, e.y - 30, 80, '#c77dff'); FX.burst(e.x, e.y - 30, '#f0d9ff', 14); } if (p.def.id === 1) { for (let i = 0; i < 3; i++) FX.add({ k: 'slash', x: e.x, y: e.y - 30, a: rr(0, TAU), r: 70, life: 14, max: 14, c: '#dff0ff' }); }
    if (p.def.id === 3) FX.dust(e.x, e.y);
    const was = e.intang; if (e.intang) e.intang = 0;
    e.takeHit({ dmg, ang, bkb: 80, kbg: 95, att: p, x: e.x, y: e.y - 30, ax: p.x, fx: B.fx, unblockable: 1 });
    onPlayerHit(p, e, dmg, 'hit');
  }
  World.shake(p.def.id === 3 ? 22 : 14); World.flashT = 6; Audio2.play('boom'); Audio2.play('bighit');
  p.state = p.air ? 'air' : 'idle'; p.sf = 0; p.intang = 40;
}
// called from Game.simStep while the world is frozen for the cut-in
function burstFreezeStep() {
  const p = World.burster; World.freezeT--; World.frame++; updateParticles();
  if (p) { p.sf++; if (World.freezeT === 0) { burstStrike(p); World.burster = null; } }
}
