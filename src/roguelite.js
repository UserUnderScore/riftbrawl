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
function shardsFor(st) { return Math.round((st.kills || 0) * 0.5 + (st.cleared || 0) * 6 + (st.bosses || 0) * 25 + (st.endless || 0) * 10 + (st.bonus || 0) + (st.win || st.won ? 60 : 0)); }
function awardShards(st) { if (st._awarded) return st._earned; st._awarded = 1; const n = Math.round(shardsFor(st) * (1 + 0.25 * (st.heat | 0))) + recordRun(st); st._earned = n; Meta.d.shards += n; Meta.d.total += n; Meta.d.runs++; Meta.save(); return n; }

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

// ===================== THROWABLE ITEMS: Rift Bombs =====================
// Smash-style: ATTACK near an item picks it up; ATTACK again throws it (stick up / down to aim, smash-flick for power).
function nearItem(p) { let best = null, bd = 44; for (const it of World.items) { if (it.type !== 'bomb' || it.holder || it.th) continue; const d = Math.abs(it.x - p.x); if (d < bd && Math.abs(it.y - p.y) < 30) { bd = d; best = it; } } return best; }
function itemInput(p, inp, raw) {
  if (p.item && (p.item.gone || p.item.holder !== p)) p.item = null;
  if (!inp.ap || raw.s) return;
  if (!p.item) {
    if (p.air || !(p.state === 'idle' || p.state === 'run' || p.state === 'crouch' || p.state === 'land0')) return;
    const it = nearItem(p); if (!it) return;
    it.holder = p; it.vy = 0; p.item = it; p.eat('ap'); p.state = 'land'; p.landLag = 7; p.sf = 0; p.vx *= 0.4; Audio2.play('grab', 0.6); FX.ring(it.x, it.y - 10, 16, '#ff9ae8'); return;
  }
  if (!p.actionable()) return;
  const up = inp.my < -0.55 || inp.cy < -0.55, down = inp.my > 0.55 || inp.cy > 0.55;
  if (!up && !down && Math.abs(inp.mx) > 0.3 && sign(inp.mx) !== p.face) p.face = sign(inp.mx);
  p._tossPow = (inp.flick || inp.m || Math.abs(inp.cx) > 0.5 || (World.frame - p.lastFlick.t < 8)) ? 1.35 : 1;
  p.setMove(up ? 'itossU' : down ? 'itossD' : 'itoss');
}
function itemToss(p, t, dir) {
  const it = p.item; if (!it) return;
  if (t !== 9) return;
  const pw = p._tossPow || 1; it.holder = null; p.item = null; it.t = 0;
  const J = p.jointsAt(p.mft); it.x = J.h1[0]; it.y = J.h1[1] + 10;
  if (dir === 'd' && !p.air) { it.vy = 0; it.th = null; it.x = p.x + p.face * 22; it.y = p.y; Audio2.play('land', 0.5); return; }
  const v = dir === 'u' ? [p.face * 1.2 + p.vx * 0.3, -15 * pw] : dir === 'd' ? [p.vx * 0.3, 12 * pw] : [p.face * 12.5 * pw + p.vx * 0.35, -3.2];
  it.th = { vx: v[0], vy: v[1], owner: p, t: 0 }; it.rot = 0;
  Audio2.play('swing', 0.9); FX.add({ k: 'ring', x: it.x, y: it.y, r0: 4, r: 26, life: 10, max: 10, c: '#ffd0f4' });
}
function dropItem(p, pop) { const it = p.item; if (!it) return; it.holder = null; p.item = null; it.th = null; it.vy = pop ? -6 : 0; it.x = p.x; it.y = p.y - 30; it.t = Math.min(it.t, 600); }
function updateBomb(it) {
  it.t++;
  const P = it.holder;
  if (P) {
    if (P.dead || P.out || P.item !== it) { it.holder = null; } else {
      if (P.state === 'move' && P.move && P.move.name && P.move.name.startsWith('itoss')) { const J = P.jointsAt(P.mft); it.x = J.h1[0]; it.y = J.h1[1] + 10; }
      else { it.x = P.x + P.face * 16 * P.mods.size; it.y = P.y - 30 * P.mods.size; }
      it.t = Math.min(it.t, 200); return;
    }
  }
  if (it.th) {
    const T = it.th; T.t++; it.x += T.vx; it.y += T.vy; T.vy = Math.min(14, T.vy + 0.5); T.vx *= 0.995; it.rot = (it.rot || 0) + T.vx * 0.04 + 0.08;
    if (T.t % 2 === 0) FX.add({ k: 'dust', x: it.x, y: it.y - 10, vx: 0, vy: 0, life: 12, max: 12, c: 'rgba(255,140,230,0.5)', s: 5 });
    for (const e of World.enemies) { if (e.dead || e.dying || e.spawnT > 0) continue; const r = e.hurt(); if (circleRect(it.x, it.y - 10, 14, r.x, r.y, r.w, r.h)) return bombBoom(it); }
    if (T.t > 4) { const g = groundBelow(it.x, it.y - 6, 14); if (g !== null && T.vy > 0) return bombBoom(it); if (solidAt(it.x, it.y - 10)) return bombBoom(it); }
    if (T.t > 160) return bombBoom(it);
    if (it.y > World.stage.killY) it.gone = 1;
    return;
  }
  it.vy = Math.min(8, it.vy + 0.4); const g = groundBelow(it.x, it.y - 4, 20); if (g !== null && it.y + it.vy >= g) { if (it.vy > 3) it.vy = -it.vy * 0.3; else { it.y = g; it.vy = 0; } } else it.y += it.vy;
  if (it.y > World.stage.killY) it.gone = 1;
  if (it.t > 1500) it.gone = 1;
}
function bombBoom(it) {
  const T = it.th || {}; const o = T.owner; it.gone = 1; const x = it.x, y = it.y - 10, R = 100;
  FX.explode(x, y, R); FX.add({ k: 'impact', x, y, r: 70, life: 12, max: 12, c: '#ff9ae8', a: rr(0, 1) }); FX.add({ k: 'ring', x, y, r0: 10, r: R * 1.5, life: 20, max: 20, c: '#ff4fd8' });
  World.shake(11); World.flashT = Math.max(World.flashT || 0, 3); Audio2.play('boom'); Audio2.play('bighit', 0.7);
  for (const c of World.items) if (c.type === 'crate' && !c.gone && Math.hypot(c.x - x, c.y - 20 - y) < R + 20) breakCrate(c);
  for (const e of World.enemies) {
    if (e.dead || e.dying || e.spawnT > 0) continue; const r = e.hurt(); const cx = clamp(x, r.x, r.x + r.w), cy = clamp(y, r.y, r.y + r.h); if (Math.hypot(cx - x, cy - y) > R) continue;
    const dmg = 17 * (o ? o.mods.dmg : 1) * (e.boss ? 1.2 : 1);
    e.takeHit({ dmg, ang: e.x >= x ? 55 : 125, bkb: 60, kbg: 85, att: o || World.players[0], x: e.x, y: e.y - 30, ax: x, fx: 'fire' });
    if (o) onPlayerHit(o, e, dmg, 'hit');
  }
}
function drawBomb(g, it, x, y) {
  const t = World.frame, pulse = 0.5 + 0.5 * Math.sin(t * 0.25 + it.id);
  g.save(); g.translate(x, y); if (it.rot) g.rotate(it.rot);
  const gl = g.createRadialGradient(0, 0, 4, 0, 0, 26); gl.addColorStop(0, `rgba(255,90,220,${0.35 + pulse * 0.25})`); gl.addColorStop(1, 'rgba(255,90,220,0)'); g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.fill();
  const bg = g.createRadialGradient(-4, -5, 2, 0, 0, 13); bg.addColorStop(0, '#6b4a9a'); bg.addColorStop(1, '#2a1546'); g.fillStyle = bg; g.strokeStyle = OL; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, 12, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = `rgba(255,120,235,${0.7 + pulse * 0.3})`; g.beginPath(); for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + t * 0.03; g.lineTo(Math.cos(a) * 6, Math.sin(a) * 6); g.lineTo(Math.cos(a + TAU / 8) * 2.5, Math.sin(a + TAU / 8) * 2.5); } g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(-4, -5, 3.5, 2.2, -0.5, 0, TAU); g.fill();
  g.fillStyle = '#3b2a1e'; g.fillRect(-3, -16, 6, 5); g.strokeRect(-3, -16, 6, 5);
  g.strokeStyle = '#c9b48a'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -16); g.quadraticCurveTo(5, -21, 3, -25); g.stroke();
  if (t % 4 < 3) { g.fillStyle = '#fff6a0'; g.beginPath(); g.arc(3 + rr(-1, 1), -26 + rr(-1, 1), 2.5 + pulse * 1.5, 0, TAU); g.fill(); }
  g.restore();
}

// ===================== RIFT CRATES: breakable containers =====================
const CRATE_W = 44, CRATE_H = 40;
function placeCrates(st) {
  const cand = [];
  for (const A of st.arenas) if (!A.boss && Math.random() < 0.6) cand.push([rr(A.l + 90, A.r - 90), A.floor - 200]);
  const big = st.solids.filter(s => s.w > 260 && s.y < st.killY - 100); for (let i = 0; i < 2 && big.length; i++) { const s = pick(big); cand.push([s.x + rr(60, s.w - 60), s.y - 40]); }
  for (const [x, y] of cand) { const gy = groundBelow(x, y, 600); if (gy === null) continue; World.items.push({ type: 'crate', x, y: gy, vy: 0, t: 0, id: World.uid++, kind: 0, hp: 14, hitT: 0 }); }
  const A0 = st.arenas.find(a => !a.boss); if (A0 && Math.random() < 0.3) World.items.push({ type: 'riftball', x: (A0.l + A0.r) / 2, y: A0.floor - 230, ax: (A0.l + A0.r) / 2, ay: A0.floor - 230, vy: 0, t: 0, id: World.uid++, kind: 0, hp: 32, hitT: 0 }); // rare Rift Ball (Smash Ball)
}
function updateCrate(it) {
  it.t++; if (it.hitT > 0) it.hitT--;
  it.vy = Math.min(10, it.vy + 0.5); const g = groundBelow(it.x, it.y - 4, 24); if (g !== null && it.y + it.vy >= g) { it.y = g; it.vy = 0; } else it.y += it.vy;
  if (it.y > World.stage.killY) { it.gone = 1; return; }
  const rx = it.x - CRATE_W / 2, ry = it.y - CRATE_H;
  for (const p of World.players) {
    if (p.dead || p.out || p.state !== 'move') continue;
    for (const hb of p.hitboxes()) {
      if (it['_k' + p.slot] === p.mid) break; if (!circleRect(hb.x, hb.y, hb.r, rx, ry, CRATE_W, CRATE_H)) continue;
      it['_k' + p.slot] = p.mid; const d = (hb.h && hb.h.d) || 6; it.hp -= d * p.mods.dmg; it.hitT = 9; it.vy = -Math.min(6, d * 0.4);
      FX.burst(hb.x, hb.y, '#e0b070', 6); Audio2.play('thud', 0.7); p.hitlag = Math.max(p.hitlag, 3);
      if (it.hp <= 0) breakCrate(it, p);
      break;
    }
  }
}
function breakCrate(it) {
  if (it.gone) return; it.gone = 1; const x = it.x, y = it.y - 20;
  for (let i = 0; i < 10; i++) { const a = rr(-Math.PI, 0), s = rr(3, 8); FX.add({ k: 'cube', x: x + rr(-14, 14), y: y + rr(-12, 12), vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: ri(30, 50), max: 50, c: pick(['#b8783a', '#8a5a2b', '#d9a066']), s: rr(5, 10), rot: rr(0, 6), g: 0.35, rise: 1 }); }
  FX.burst(x, y, '#ffe2a8', 12); FX.add({ k: 'ring', x, y, r0: 6, r: 50, life: 14, max: 14, c: '#ffe2a8' }); Audio2.play('bighit', 0.5); World.shake(5);
  const r = Math.random();
  if (r < 0.32) spawnItem('bomb', x, y - 10);
  const nf = r < 0.32 ? 1 : 1 + (Math.random() < 0.5 ? 1 : 0); for (let i = 0; i < nf; i++) { spawnItem('food', x + rr(-16, 16), y - 10); World.items[World.items.length - 1].vy = -rr(5, 8); }
}
function drawCrate(g, it) {
  const sh = it.hitT > 0 ? Math.sin(it.hitT * 2.5) * it.hitT * 0.5 : 0, x = it.x + sh, y = it.y, w = CRATE_W, h = CRATE_H, dmg = 1 - clamp((it.hp ?? 14) / 14, 0, 1);
  g.save(); g.translate(x, y);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(0, 0, w * 0.55, 5, 0, 0, TAU); g.fill();
  const gr = g.createLinearGradient(0, -h, 0, 0); gr.addColorStop(0, '#d9a066'); gr.addColorStop(1, '#a8682e'); g.fillStyle = gr; g.strokeStyle = OL; g.lineWidth = 2.5;
  g.beginPath(); g.roundRect(-w / 2, -h, w, h, 4); g.fill(); g.stroke();
  g.strokeStyle = '#7a4a1e'; g.lineWidth = 2; g.beginPath(); g.moveTo(-w / 2 + 4, -h + 4); g.lineTo(w / 2 - 4, -4); g.moveTo(w / 2 - 4, -h + 4); g.lineTo(-w / 2 + 4, -4); g.stroke();
  g.fillStyle = '#c48848'; g.fillRect(-w / 2 + 2, -h / 2 - 3, w - 4, 6); g.strokeStyle = OL; g.lineWidth = 1.5; g.strokeRect(-w / 2 + 2, -h / 2 - 3, w - 4, 6);
  const pul = 0.6 + 0.4 * Math.sin(World.frame * 0.08 + (it.id || 0)); g.fillStyle = `rgba(255,90,220,${0.75 * pul})`; g.beginPath(); g.arc(0, -h / 2, 6, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.stroke();
  if (dmg > 0.2) { g.strokeStyle = '#3a220e'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-8, -h); g.lineTo(-3, -h + 10); g.lineTo(-9, -h + 18); if (dmg > 0.55) { g.moveTo(w / 2, -12); g.lineTo(w / 2 - 9, -16); g.lineTo(w / 2 - 12, -26); } g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-w / 2 + 3, -h + 3, w - 6, 4);
  g.restore();
}

// ===================== RIFT BALL: a floating orb; break it to get your Rift Burst instantly (like a Smash Ball) =====================
function updateRiftBall(it) {
  it.t++; if (it.hitT > 0) it.hitT--;
  const tt = it.t * 0.012; const tx = it.ax + Math.sin(tt * 1.3) * 260 + Math.sin(tt * 3.1) * 60, ty = it.ay + Math.sin(tt * 2.2) * 70;
  if (it.t > 1800) { it.ay -= 4; } // drifts away if nobody breaks it
  it.x += (tx - it.x) * 0.03 + (it.kx || 0); it.y += (ty - it.y) * 0.03 + (it.ky || 0); it.kx = (it.kx || 0) * 0.9; it.ky = (it.ky || 0) * 0.9;
  if (it.y < World.cam.y - 900) { it.gone = 1; return; }
  for (const p of World.players) {
    if (p.dead || p.out || p.state !== 'move') continue;
    for (const hb of p.hitboxes()) {
      if (it['_k' + p.slot] === p.mid) break; if (Math.hypot(hb.x - it.x, hb.y - it.y) > hb.r + 22) continue;
      it['_k' + p.slot] = p.mid; const d = (hb.h && hb.h.d) || 6; it.hp -= d; it.hitT = 9; it.kx = p.face * Math.min(9, d * 0.5); it.ky = -2;
      FX.burst(it.x, it.y, `hsl(${(World.frame * 9) % 360},100%,70%)`, 10); Audio2.play('clink'); p.hitlag = Math.max(p.hitlag, 4);
      if (it.hp <= 0) { it.gone = 1; p.meter = 100; FX.add({ k: 'ring', x: it.x, y: it.y, r0: 10, r: 160, life: 22, max: 22, c: '#ffffff' }); FX.burst(it.x, it.y, '#ffffff', 26); World.flashT = 6; World.shake(8); Audio2.play('ready'); Audio2.play('crowd'); Game.callout('RIFT BALL! BURST READY', '#ffe27a', 34); }
      break;
    }
  }
}
function drawRiftBall(g, it) {
  const t = World.frame, sh = it.hitT > 0 ? Math.sin(it.hitT * 2.4) * it.hitT * 0.4 : 0, x = it.x + sh, y = it.y, r = 20;
  g.save(); g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(x, y, 4, x, y, 56); gl.addColorStop(0, `hsla(${(t * 5) % 360},100%,70%,0.6)`); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.beginPath(); g.arc(x, y, 56, 0, TAU); g.fill(); g.restore();
  g.save(); g.translate(x, y); g.rotate(t * 0.02);
  for (let i = 0; i < 4; i++) { g.fillStyle = `hsl(${(t * 5 + i * 90) % 360},95%,58%)`; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, i * Math.PI / 2, (i + 1) * Math.PI / 2); g.fill(); }
  g.strokeStyle = OL; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
  g.strokeStyle = '#ffffff'; g.lineWidth = 3.5; g.beginPath(); g.arc(0, 0, r * 0.62, 0, TAU); g.moveTo(-r, 0); g.lineTo(r, 0); g.moveTo(0, -r); g.lineTo(0, r); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.4, r * 0.3, r * 0.18, -0.6, 0, TAU); g.fill();
  g.restore();
}
