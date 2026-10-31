// ===== GAME: scenes, run flow, boons, camera, HUD, menus =====
const BOONS = [
  { id: 'dmg', name: 'Iron Knuckles', r: 0, desc: '+12% damage on everything', max: 5, ap: p => p.mods.dmg *= 1.12 },
  { id: 'weight', name: 'Heavyweight', r: 0, desc: '+18 weight: harder to launch', max: 4, ap: p => p.mods.weight += 18 },
  { id: 'speed', name: 'Fleet Foot', r: 0, desc: '+12% run & air speed', max: 4, ap: p => p.mods.speed *= 1.12 },
  { id: 'jump', name: 'Spring Legs', r: 0, desc: '+1 midair jump', max: 2, ap: p => { p.mods.jumps++; p.jumps++; } },
  { id: 'heal', name: 'Second Wind', r: 0, desc: 'Heal 45% damage right now', max: 99, ap: p => p.pct = Math.max(0, p.pct - 45) },
  { id: 'shield', name: 'Bulwark', r: 0, desc: 'Shield is 50% sturdier', max: 3, ap: p => { p.mods.shield *= 1.5; p.shieldHP = 50 * p.mods.shield; } },
  { id: 'spec', name: 'Arcane Edge', r: 0, desc: '+20% special move damage', max: 4, ap: p => p.mods.spec *= 1.2 },
  { id: 'smash', name: 'Power Charger', r: 0, desc: 'Smashes charge 2x faster, +12% smash damage', max: 3, ap: p => { p.mods.smashChg *= 2; p.mods.smash *= 1.12; } },
  { id: 'take', name: 'Thick Skin', r: 0, desc: 'Take 10% less damage', max: 4, ap: p => p.mods.take *= 0.9 },
  { id: 'lag', name: 'Light Landing', r: 0, desc: '-35% aerial landing lag', max: 2, ap: p => p.mods.lagMul *= 0.65 },
  { id: 'kb', name: 'Haymaker', r: 1, desc: '+20% knockback dealt', max: 3, ap: p => p.mods.kb *= 1.2 },
  { id: 'aerial', name: 'Momentum', r: 1, desc: 'Aerials & dash attacks deal +25%', max: 3, ap: p => p.mods.aerial *= 1.25 },
  { id: 'land', name: 'Crater Landing', r: 1, desc: 'Big falls end in a damaging shockwave', max: 1, ap: p => p.mods.landShock = 1 },
  { id: 'thorns', name: 'Thorns', r: 1, desc: 'Enemies that hit you take 40% back', max: 2, ap: p => p.mods.thorns += 0.4 },
  { id: 'stock', name: 'Extra Life', r: 1, desc: '+1 team stock', max: 99, ap: p => Game.teamStocks++ },
  { id: 'atk', name: 'Overclock', r: 1, desc: 'Normal attacks are 12% faster', max: 3, ap: p => p.mods.atk *= 1.12 },
  { id: 'orb', name: 'Spirit Orb', r: 1, desc: 'An orb circles you, zapping foes', max: 1, ap: p => p.mods.orb = 1 },
  { id: 'steal', name: 'Vampiric', r: 1, desc: 'Hits heal 12% of damage dealt', max: 3, ap: p => p.mods.steal += 0.12 },
  { id: 'exec', name: 'Executioner', r: 1, desc: '+50% damage to foes under 30% HP', max: 1, ap: p => p.mods.exec = 1 },
  { id: 'meteor', name: 'Meteor Heart', r: 2, desc: 'Spikes deal +30% and launch harder', max: 1, ap: p => { p.mods.meteor = 1; } },
  { id: 'phoenix', name: 'Phoenix Feather', r: 2, desc: 'Once per stage, revive on the spot when KO\'d', max: 1, ap: p => p.mods.phoenix = 1 },
  { id: 'chain', name: 'Chain Lightning', r: 2, desc: 'Hits may arc lightning to a nearby foe', max: 2, ap: p => p.mods.chain += 1 },
  { id: 'giant', name: 'Titan Form', r: 2, desc: '+20% size & damage, +25 weight', max: 1, ap: p => { p.mods.size *= 1.2; p.mods.dmg *= 1.2; p.mods.weight += 25; } },
  { id: 'glass', name: 'Glass Cannon', r: 2, desc: '+40% damage, but take +25% damage', max: 1, ap: p => { p.mods.dmg *= 1.4; p.mods.take *= 1.25; } },
];
const RARITY = [{ n: 'COMMON', c: '#d9d9d9' }, { n: 'RARE', c: '#5ab4ff' }, { n: 'EPIC', c: '#c77dff' }];
const BOON_BY_ID = Object.fromEntries(BOONS.map(b => [b.id, b]));
function rollBoons(p, bossReward) {
  const have = id => p.boons.filter(x => x === id).length;
  const avail = BOONS.filter(b => have(b.id) < b.max);
  const out = [];
  for (let i = 0; i < 3; i++) {
    let r = rnd(); let tier = bossReward ? (i === 0 ? 2 : r < 0.5 ? 1 : 2) : (r < 0.08 ? 2 : r < 0.35 ? 1 : 0);
    let cands = avail.filter(b => b.r === tier && !out.includes(b.id)); if (!cands.length) cands = avail.filter(b => !out.includes(b.id));
    if (cands.length) out.push(pick(cands).id);
  }
  return out;
}
function applyBoon(p, id) { const b = BOON_BY_ID[id]; if (!b) return; p.boons.push(id); b.ap(p); }

const STAGE_KINDS = ['normal', 'normal', 'normal', 'boss:gatekeeper', 'normal', 'normal', 'normal', 'boss:matriarch', 'normal', 'normal', 'normal', 'boss:crown'];
function stageKind(idx) { if (idx < 12) return STAGE_KINDS[idx]; const e = idx - 12; return (e + 1) % 4 === 0 ? 'boss:' + ['gatekeeper', 'matriarch', 'crown'][Math.floor(e / 4) % 3] : 'normal'; }
function stageLabel(idx) { if (idx >= 12) return 'ENDLESS ' + (idx - 11); return 'STAGE ' + (Math.floor(idx / 4) + 1) + '-' + (idx % 4 + 1); }

// ---- device manager ----
const Devices = { srcs: {}, list() { const ids = ['kb1', 'kb2']; for (const p of getPads()) ids.push('pad' + p.index); return ids; }, get(id) { return this.srcs[id] || (this.srcs[id] = new InputSource(id)); }, pollAll() { for (const id of this.list()) this.get(id).poll(); } };
const navState = {};
function menuDir(src) {
  const o = src.cur, id = src.dev; const st = navState[id] || (navState[id] = { d: 0, t: 0 });
  let d = 0; if (o.my < -0.5) d = 1; else if (o.my > 0.5) d = 2; else if (o.mx < -0.5) d = 3; else if (o.mx > 0.5) d = 4;
  let fire = 0; if (d !== st.d) { st.d = d; st.t = 0; fire = d; } else if (d) { st.t++; if (st.t > 18 && st.t % 6 === 0) fire = d; }
  return ['', 'up', 'down', 'left', 'right'][fire];
}
function menuOK(src) { const o = src.cur; return o.ap || (o.kb ? (o.jp || (src.dev === 'kb1' && KeysPressed['Enter'])) : 0); }
function menuBack(src) { const o = src.cur; return o.bp || (src.dev === 'kb1' && KeysPressed['Escape']); }

// ---- UI helpers ----
const UI = {
  toasts: [],
  toast(t) { this.toasts.push({ t, life: 200 }); },
  panel(x, y, w, h, c = 'rgba(20,16,28,0.85)') { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); },
  text(t, x, y, size = 20, c = '#fff', align = 'center', weight = 800) { ctx.font = `${weight} ${size}px Rubik,system-ui,sans-serif`; ctx.textAlign = align; ctx.fillStyle = c; ctx.fillText(t, x, y); },
  wrap(t, x, y, maxW, size, c, lh = 1.3, align = 'left') { ctx.font = `600 ${size}px Rubik,system-ui,sans-serif`; ctx.textAlign = align; ctx.fillStyle = c; const words = t.split(' '); let line = ''; for (const w of words) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW) { ctx.fillText(line, x, y); line = w; y += size * lh; } else line = test; } ctx.fillText(line, x, y); return y + size * lh; },
};

// ---- GAME ----
const Game = {
  scene: 'title', mode: 'solo', slots: [], menuIdx: 0, teamStocks: 3, run: null, banner: null, pauseIdx: 0, msg: '', t: 0, best: store('sse_best') || { endless: 0, time: 0 },
  boonOpts: {}, boonPick: {}, boonIdx: {}, csel: {}, cready: {}, overStats: null, victoryIdx: 0, remap: null,
  setScene(s) { this.scene = s; this.menuIdx = 0; this.t = 0; },
  // --- run lifecycle ---
  startRun() {
    this.run = { idx: 0, seed: (Math.random() * 1e9) | 0, time: 0, kills: 0, endless: false, stageSeed: 0 };
    World.reset(); Particles.length = 0;
    World.players = this.slots.map((s, i) => new Fighter(FIGHTERS[this.csel[i]], i, s.input));
    this.teamStocks = World.players.length > 1 ? 4 : 3;
    this.loadStage(0);
  },
  loadStage(idx) {
    const R = this.run; R.idx = idx; R.stageSeed = (R.seed + idx * 7919) >>> 0;
    const kind = stageKind(idx), rr0 = SRng(R.stageSeed ^ 0xabc);
    const mods = [];
    if (kind === 'normal' && (idx >= 2 || R.endless)) { const n = idx >= 12 ? (rr0.chance(0.5) ? 2 : 1) : (rr0.chance(0.35) ? 1 : 0); const ks = shuffle(Object.keys(MODIFIERS), rr0.f); for (let i = 0; i < n; i++) mods.push(ks[i]); }
    const np = World.players.length;
    World.stage = genStage(R.stageSeed, idx, kind, { mods, endless: idx >= 12, players: np });
    this.applyStageState(mods);
    const e = Math.max(0, idx - 11);
    World.diff = { hp: (1 + idx * 0.12 + e * 0.1) * (np > 1 ? 1.15 : 1), dmg: 1 + idx * 0.05 + e * 0.04 };
    World.enemies = []; World.projs = []; World.items = []; World.barriers = null; Particles.length = 0;
    for (const sp of World.stage.spawns) { const en = spawnEnemy(sp.type, sp.x, sp.y, { fid: sp.fid }); if (en) en.asleep = true; }
    World.players.forEach((p, i) => {
      if (p.out) { p.out = false; p.dead = false; }
      p.dead = false; p.x = 80 + i * 50; p.y = 600; p.vx = p.vy = p.kx = p.ky = 0; p.state = 'idle'; p.air = 0; p.move = null; p.intang = 60; p.phoenixUsed = false; p.hitstun = 0; p.hammerOut = null; p.jumps = p.maxJumps;
    });
    World.cam.x = 300; World.cam.y = 420;
    this.arenaI = -1; this.waveI = 0; this.waveDelay = 0; this.bossRef = null; this.stageClearT = 0; this.stageT = 0;
    this.banner = { t: 0, title: stageLabel(idx), sub: kind.startsWith('boss') ? BOSS[kind.split(':')[1]].name : World.stage.B.name, mods };
    this.setScene('play');
    if (kind.startsWith('boss')) Audio2.play('lock');
  },
  applyStageState(mods) { World.mod = {}; for (const m of mods) World.mod[m] = 1; if (World.mod.wind) World.mod.wind = pick([-1.6, 1.6]); },
  onEnemyKilled(e) { if (this.run) this.run.kills++; },
  bossDefeated(e) {
    FX.text(e.x, e.y - 160, 'DEFEATED!', '#ffde3c', 34); World.shake(20); World.slowmo(50); Audio2.play('ko');
    for (const o of World.enemies) if (o !== e && !o.dead) { o.hurtRaw(9999, true); }
    this.teamStocks++;
    FX.text(e.x, e.y - 120, '+1 STOCK', '#7dff8a', 20);
    if (e.type === 'crown' && this.run && !this.run.endless && this.run.idx === 11) this.crownDown = 120;
  },
  chestBoon(p) {
    const opts = rollBoons(p, false); const id = opts[0]; if (!id) return; applyBoon(p, id);
    FX.text(p.x, p.y - 90, BOON_BY_ID[id].name + '!', RARITY[BOON_BY_ID[id].r].c, 18); Audio2.play('boon');
  },
  // --- per-frame simulation (host / local) ---
  simStep() {
    const R = this.run; R.time++; this.stageT++;
    World.frame++;
    for (const p of World.players) p.update();
    for (const e of World.enemies) e.update();
    for (const pr of World.projs) updateProj(pr);
    resolveCombat();
    World.projs = World.projs.filter(p => p.life > 0);
    World.enemies = World.enemies.filter(e => !e.dead);
    updateItems();
    this.stageLogic();
    this.blastZones();
    updateParticles();
    if (this.crownDown) { this.crownDown--; if (this.crownDown === 0) { this.setScene('victory'); this.victoryIdx = 0; } }
    // game over?
    if (World.players.every(p => p.out || (p.dead && this.teamStocks <= 0 && p.respawnT > 0 && false))) this.gameOver();
    if (World.players.every(p => p.out)) this.gameOver();
  },
  stageLogic() {
    const st = World.stage; const alive = World.players.filter(p => !p.dead && !p.out);
    // events
    for (const ev of st.events) {
      if (ev.used) continue;
      for (const p of alive) {
        if (Math.abs(p.x - ev.x) < 30 && Math.abs(p.y - ev.y) < 60) {
          if (ev.type === 'chest') { ev.used = 1; this.chestBoon(p); FX.burst(ev.x, ev.y - 14, '#ffd24a', 20); }
          if (ev.type === 'spring') { ev.used = 1; for (const q of World.players) { q.pct = Math.max(0, q.pct - 40); FX.text(q.x, q.y - 70, '-40%', '#7dff8a', 18); } Audio2.play('heal'); }
          if (ev.type === 'elite' && !ev.spawned) { ev.spawned = 1; ev.used = 1; const e = spawnEnemy(pick(['brute', 'lancer', 'shieldbearer', 'hopper']), ev.x + 160, ev.y - 20, { elite: pick(ELITES) }); if (e) { e.maxHp *= 1.5; e.hp = e.maxHp; e.dropChest = 1; FX.portal(ev.x + 160, ev.y - 40); Audio2.play('portal'); } }
        }
      }
    }
    for (const e of World.enemies) if (e.dropChest && (e.dying || e.hp <= 0) && !e.chestDropped) { e.chestDropped = 1; spawnItem('chest', e.x, e.y - 20); }
    // arenas
    if (this.arenaI < 0) {
      const ai = st.arenas.findIndex(a => !a.done && alive.some(p => p.x > a.trig && p.x < a.r));
      if (ai >= 0) {
        const A = st.arenas[ai]; this.arenaI = ai; this.waveI = 0; this.waveDelay = 50; World.barriers = { l: A.l, r: A.r }; Audio2.play('lock');
        for (const e of World.enemies) if (e.x > A.l - 60 && e.x < A.r + 60) e.asleep = false;
        for (const p of World.players) if (!p.dead && (p.x < A.l + 20 || p.x > A.r - 20)) { p.x = A.l + 80; p.y = A.floor - 40; p.vx = p.kx = 0; }
        // enemies outside the arena wake & are pulled in? leave them.
      }
    } else {
      const A = st.arenas[this.arenaI];
      if (this.waveDelay > 0) { this.waveDelay--; if (this.waveDelay === 0) this.spawnWave(A, this.waveI); }
      else {
        const left = World.enemies.filter(e => !e.dead && !e.dying && e.x > A.l - 50 && e.x < A.r + 50 && !e.minion).length;
        const minions = World.enemies.filter(e => !e.dead && e.minion).length;
        if (left === 0 && (minions === 0 || this.waveI + 1 >= A.waves.length)) {
          this.waveI++; this.dropFood(A);
          if (this.waveI >= A.waves.length) {
            A.done = true; World.barriers = null; this.arenaI = -1; FX.text(World.cam.x, World.cam.y - 160, 'CLEAR!', '#ffde3c', 40); Audio2.play('boon');
            for (const e of World.enemies) if (e.minion && !e.dead) e.hurtRaw(999, true);
          } else this.waveDelay = 60;
        }
      }
      // meteor hazard
      if (World.mod.meteor && World.frame % 75 === 0 && World.barriers) spawnProj('rock', null, rr(A.l + 30, A.r - 30), World.cam.y - 450, rr(-1, 1), 2, { team: 1 });
    }
    if (World.mod.wind && World.frame % 480 === 0) World.mod.wind *= -1;
    // goal
    if (st.goal && st.arenas.every(a => a.done) && alive.some(p => Math.abs(p.x - st.goal.x) < 40 && p.y > st.goal.y - 140)) this.stageClear();
  },
  dropFood(A) {
    const n = 1 + World.players.length + (rnd() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i++) { const x = rr(A.l + 80, A.r - 80); spawnItem('food', x, World.cam.y - 300 - i * 40, { kind: rollFood() }); }
    FX.text(World.cam.x, World.cam.y - 120, 'FOOD!', '#7dff8a', 22);
  },
  spawnWave(A, wi) {
    const w = A.waves[wi]; if (!w) return;
    for (const s of w) {
      if (s.boss) {
        const e = new Enemy(s.type, (A.l + A.r) / 2, A.floor - (BOSS[s.type].fly ? 260 : 10), {});
        e.maxHp *= World.players.length > 1 ? 1.6 : 1; e.hp = e.maxHp; e.lastPhase = 1; World.enemies.push(e); this.bossRef = e; FX.swarm(e.x, e.y, e.h); FX.swarm(e.x, e.y - 40, e.h); continue;
      }
      const x = A.l + 80 + s.side * (A.r - A.l - 160); const y = A.floor - 140 - rr(0, 120);
      const e = spawnEnemy(s.type, x, y, { elite: s.elite, spawn: 1, fid: s.fid }); if (e) { FX.swarm(x, y, e.h); if (!e.isRival) e.cd = 50 + ri(0, 50); }
    }
    Audio2.play('portal');
    FX.text(World.cam.x, World.cam.y - 200, A.waves.length > 1 ? `WAVE ${wi + 1}/${A.waves.length}` : '', '#ff4fd8', 28);
  },
  blastZones() {
    const st = World.stage, c = World.cam, B = World.barriers;
    const top = c.y - H / (2 * c.z) - 380;
    const L = B ? B.l - 430 : st.x0 - 300, Rr = B ? B.r + 430 : st.x1 + 300;
    for (const p of World.players) { if (p.dead || p.out) continue; if (p.y > st.killY || (p.y < top && p.state === 'hitstun') || p.y < -2000 || p.x < L || p.x > Rr) p.ko(); }
    for (const e of World.enemies) { if (e.dead || e.boss) continue; if (e.y > st.killY || (e.y < top && (e.hitstun > 0 || e.dying)) || e.x < L || e.x > Rr) e.ko(); }
    // offscreen co-op warp
    const alive = World.players.filter(p => !p.dead && !p.out);
    if (alive.length > 1) for (const p of alive) { const vw = W / (2 * c.z) + 120; if (Math.abs(p.x - c.x) > vw && p.state !== 'hitstun') { p.offT = (p.offT || 0) + 1; if (p.offT > 90) { const o = alive.find(q => q !== p); p.x = o.x; p.y = o.y - 60; p.vx = p.vy = 0; p.air = 1; p.state = 'air'; p.offT = 0; FX.burst(p.x, p.y - 30, p.def.color, 12); } } else p.offT = 0; }
  },
  stageClear() {
    if (this.scene !== 'play') return;
    if (this.run.idx === 11 && !this.run.endless) { if (!this.crownDown) { this.setScene('victory'); this.victoryIdx = 0; } return; }
    Audio2.play('boon'); const R = this.run; const wasBoss = stageKind(R.idx).startsWith('boss');
    this.boonOpts = {}; this.boonPick = {}; this.boonIdx = {};
    World.players.forEach((p, i) => { this.boonOpts[i] = rollBoons(p, wasBoss); this.boonPick[i] = null; this.boonIdx[i] = 0; });
    this.setScene('boon');
  },
  finishBoons() {
    World.players.forEach((p, i) => { const id = this.boonPick[i]; if (id && id !== 'skip') applyBoon(p, id); });
    this.loadStage(this.run.idx + 1);
  },
  gameOver() {
    if (this.scene === 'over') return;
    const R = this.run; this.overStats = { stage: stageLabel(R.idx), time: R.time, kills: R.kills, endless: R.idx >= 12 ? R.idx - 11 : 0 };
    if (this.overStats.endless > this.best.endless) { this.best.endless = this.overStats.endless; store('sse_best', this.best); }
    this.setScene('over');
  },
  // --- camera ---
  updateCamera() {
    const c = World.cam, st = World.stage; if (!st) return;
    const ps = World.players.filter(p => !p.dead && !p.out); if (!ps.length) return;
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9; for (const p of ps) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y - 40); maxY = Math.max(maxY, p.y); }
    if (this.bossRef && !this.bossRef.dead) { const b = this.bossRef; minX = Math.min(minX, b.x); maxX = Math.max(maxX, b.x); minY = Math.min(minY, b.y - b.h); }
    let tz = clamp(Math.min(W / (maxX - minX + 460), H / (maxY - minY + 380)), 0.78, 1.32);
    const B = World.barriers;
    if (B) tz = clamp(Math.max(tz, W / (B.r - B.l), this.bossRef && !this.bossRef.dead ? 0 : 1.22), 0.78, 1.4);
    let tx = (minX + maxX) / 2 + (ps.length === 1 ? ps[0].face * 60 : 0), ty = (minY + maxY) / 2 - 85;
    if (B) { const vw = W / tz; tx = clamp(tx, B.l + vw / 2, B.r - vw / 2); }
    const vw2 = W / (2 * tz); tx = clamp(tx, st.x0 + vw2, st.x1 - vw2);
    const maxCamY = 600 + 175 - H / (2 * tz); if (!ps.some(p => p.y > 680)) ty = Math.min(ty, maxCamY);
    if (B) { const fl = st.arenas.find(a => a.l === B.l)?.floor ?? 600; ty = fl - (H / 2 - 135) / tz; }
    c.z = lerp(c.z, tz, B ? 0.12 : 0.05); c.x = lerp(c.x, tx, B ? 0.2 : 0.12); c.y = lerp(c.y, ty, 0.1);
    if (B) { const vw = W / (2 * c.z); c.x = clamp(c.x, B.l + vw, B.r - vw); }
  },
};

// ---- Scenes: update + draw ----
function localSources() { return Devices.list().map(id => Devices.get(id)); }
function anyOK() { return localSources().find(s => menuOK(s)); }
function anyBack() { const r = localSources().find(s => menuBack(s)); if (r) Audio2.play('back'); return r; }
function anyDir() { for (const s of localSources()) { const d = menuDir(s); if (d) return d; } return ''; }
function menuNav(n) { const d = anyDir(); if (d === 'up') { Game.menuIdx = (Game.menuIdx + n - 1) % n; Audio2.play('blip'); } if (d === 'down') { Game.menuIdx = (Game.menuIdx + 1) % n; Audio2.play('blip'); } return d; }
const MODE_OPTS = ['SOLO RUN', 'LOCAL CO-OP (2P)', 'ONLINE: HOST', 'ONLINE: JOIN', 'CONTROLS', 'CONTROLLER SETUP', 'SFX VOLUME', 'MUSIC VOLUME'];
function clickRegions() { return Game.clicks || (Game.clicks = []); }

function sceneUpdate() {
  const G = Game; G.t++;
  if (Net.isGuest) { Net.guestUpdate(); return; }
  switch (G.scene) {
    case 'title': {
      const s = anyOK() || localSources().find(s => s.cur.jp || s.cur.pp);
      if (s || G.clicked) { G.primary = s ? s.dev : 'kb1'; G.clicked = 0; Audio2.unlock(); Audio2.play('select'); G.setScene('mode'); }
      break;
    }
    case 'mode': {
      { const d = menuNav(MODE_OPTS.length); volAdjust(MODE_OPTS[G.menuIdx], d === 'left' ? -1 : d === 'right' ? 1 : 0); }
      const ok = anyOK() || G.clickPick !== undefined; if (G.clickPick !== undefined) { G.menuIdx = G.clickPick; G.clickPick = undefined; }
      if (ok) {
        Audio2.play('select'); const i = G.menuIdx; const prim = ok.dev || G.primary || 'kb1';
        if (i === 0) { G.mode = 'solo'; G.slots = [{ input: Devices.get(prim), dev: prim }]; G.toCharSel(); }
        if (i === 1) { G.mode = 'local'; G.slots = [{ input: Devices.get(prim), dev: prim }]; G.toCharSel(); }
        if (i === 2) { G.mode = 'host'; G.slots = [{ input: Devices.get(prim), dev: prim }]; Net.host(); G.setScene('lobby'); }
        if (i === 3) { G.mode = 'guest'; G.primary = prim; G.setScene('join'); showJoinBox(true); }
        if (i === 4) G.setScene('controls');
        if (i === 5) { G.remap = { dev: prim, step: 0, map: {} }; G.setScene('remap'); }
        if (i === 6) { setSfxVol(Audio2.vol >= 1 ? 0 : Audio2.vol + 0.1); }
        if (i === 7) { setMusicVol(Music.vol >= 1 ? 0 : Music.vol + 0.1); }
      }
      if (anyBack()) G.setScene('title');
      break;
    }
    case 'controls': if (anyOK() || anyBack() || G.clickPick !== undefined) { G.clickPick = undefined; G.setScene('mode'); } break;
    case 'remap': updateRemap(); break;
    case 'lobby': {
      if (Net.guestPeer) { G.slots[1] = { input: Net.remote, dev: 'net' }; G.toCharSel(); }
      if (anyBack()) { Net.leave(); G.setScene('mode'); }
      break;
    }
    case 'join': if (anyBack() && !joinFocused()) { showJoinBox(false); G.setScene('mode'); } break;
    case 'charsel': updateCharSel(); break;
    case 'play': {
      if (G.paused) { updatePause(); break; }
      const pp = World.players.some(p => p.input.cur && p.input.cur.pp && p.input !== Net.remote) || KeysPressed['Escape'];
      if (pp) { G.paused = true; G.pauseIdx = 0; Audio2.play('blip'); break; }
      if (World.slowT > 0) { World.slowT--; if (World.slowT % 2 === 0) break; }
      G.simStep(); if (G.banner) G.banner.t++;
      break;
    }
    case 'boon': updateBoon(); break;
    case 'over': if (G.t > 40 && (anyOK() || G.clickPick !== undefined)) { G.clickPick = undefined; G.toCharSel(); } if (G.t > 40 && anyBack()) { Net.leave(); G.setScene('title'); } break;
    case 'victory': {
      const d = menuNav(2); if (G.clickPick !== undefined) { G.menuIdx = G.clickPick; }
      if (G.t > 60 && (anyOK() || G.clickPick !== undefined)) {
        G.clickPick = undefined;
        if (G.menuIdx === 0) { G.run.endless = true; FX.text(0, 0, '', '#fff'); G.boonOpts = {}; G.boonPick = {}; World.players.forEach((p, i) => { G.boonOpts[i] = rollBoons(p, true); G.boonPick[i] = null; G.boonIdx[i] = 0; }); G.setScene('boon'); }
        else { G.overStats = { stage: 'RUN COMPLETE', time: G.run.time, kills: G.run.kills, endless: 0, win: 1 }; if (!G.best.time || G.run.time < G.best.time) { G.best.time = G.run.time; store('sse_best', G.best); } G.setScene('over'); }
      }
      break;
    }
  }
}
Game.toCharSel = function () {
  this.csel = {}; this.cready = {}; this.slots.forEach((s, i) => { this.csel[i] = this.csel[i] ?? i % 4; this.cready[i] = false; });
  if (this.mode === 'local') this.waitP2 = true;
  this.setScene('charsel'); this.paused = false;
};
function updateCharSel() {
  const G = Game;
  // P2 join for local
  if (G.mode === 'local' && G.slots.length < 2) {
    for (const s of localSources()) { if (G.slots.some(x => x.dev === s.dev)) continue; if (s.cur.ap || s.cur.jp) { G.slots.push({ input: s, dev: s.dev }); G.csel[1] = 1; G.cready[1] = false; Audio2.play('select'); s.cur.ap = 0; s.cur.jp = 0; } }
  }
  G.slots.forEach((sl, i) => {
    if (sl.dev === 'net') return;
    const s = sl.input; const d = menuDir(s);
    if (!G.cready[i]) {
      if (d === 'left') { G.csel[i] = (G.csel[i] + 3) % 4; Audio2.play('blip'); }
      if (d === 'right') { G.csel[i] = (G.csel[i] + 1) % 4; Audio2.play('blip'); }
      if (menuOK(s)) { G.cready[i] = true; Audio2.play('ready'); }
      if (menuBack(s) && G.t > 10) { if (i === 0) { Net.leave(); G.setScene('mode'); return; } else { G.slots.splice(i, 1); } }
    } else if (menuBack(s)) G.cready[i] = false;
  });
  if (G.clickChar !== undefined) { G.csel[0] = G.clickChar; G.clickChar = undefined; }
  if (G.mode === 'host' && Net.guestState) { const gs = Net.guestState; if (typeof gs.ch === 'number') G.csel[1] = clamp(gs.ch | 0, 0, 3); G.cready[1] = !!gs.rdy; }
  if (G.mode === 'host' && !Net.guestPeer) { G.slots.length = 1; }
  if (G.mode === 'host' && Net.guestPeer && G.slots.length < 2) { G.slots[1] = { input: Net.remote, dev: 'net' }; G.csel[1] = 1; G.cready[1] = false; }
  const all = G.slots.length && G.slots.every((_, i) => G.cready[i]) && (G.mode !== 'local' || G.slots.length >= 1);
  if (all && G.t > 20) { if (G.mode === 'local' && G.slots.length < 2 && !G.soloOK) { } G.startRun(); }
}
const PAUSE_OPTS = ['RESUME', 'SHOW CONTROLS', 'SFX VOLUME', 'MUSIC VOLUME', 'QUIT RUN'];
function updatePause() {
  const G = Game; const n = PAUSE_OPTS.length; const d = anyDir(); if (d === 'up') { G.pauseIdx = (G.pauseIdx + n - 1) % n; Audio2.play('cursor'); } if (d === 'down') { G.pauseIdx = (G.pauseIdx + 1) % n; Audio2.play('cursor'); }
  volAdjust(PAUSE_OPTS[G.pauseIdx], d === 'left' ? -1 : d === 'right' ? 1 : 0);
  if (G.clickPick !== undefined) { G.pauseIdx = G.clickPick; }
  const lab = PAUSE_OPTS[G.pauseIdx];
  if (VOL_ROWS[lab]) { if (G.clickPick !== undefined) G.clickPick = undefined; if (anyOK()) volAdjust(lab, 1); }
  else if (anyOK() || G.clickPick !== undefined) { G.clickPick = undefined; if (lab === 'RESUME') G.paused = false; if (lab === 'SHOW CONTROLS') { G.paused = false; G.showControls = 240; } if (lab === 'QUIT RUN') { G.paused = false; Net.leave(); G.setScene('title'); } }
  else if (anyBack() || KeysPressed['Escape'] || localSources().some(s => s.cur.pp)) G.paused = false;
}
function updateBoon() {
  const G = Game;
  World.players.forEach((p, i) => {
    if (G.boonPick[i]) return; const sl = G.slots[i]; if (!sl) { G.boonPick[i] = 'skip'; return; }
    if (sl.dev === 'net') { const gs = Net.guestState; if (gs && Array.isArray(gs.bp) && gs.bp[0] === G.run.idx + (G.run.endless ? 1000 : 0) && typeof gs.bp[1] === 'number') { const id = G.boonOpts[i][gs.bp[1] | 0]; if (id) { G.boonPick[i] = id; Audio2.play('select'); } } return; }
    const s = sl.input; const d = menuDir(s); const n = G.boonOpts[i].length;
    if (d === 'up' || d === 'left') G.boonIdx[i] = (G.boonIdx[i] + n - 1) % n; if (d === 'down' || d === 'right') G.boonIdx[i] = (G.boonIdx[i] + 1) % n;
    if (G.clickBoon && G.clickBoon[0] === i) { G.boonIdx[i] = G.clickBoon[1]; G.clickBoon = null; G.boonPick[i] = G.boonOpts[i][G.boonIdx[i]]; Audio2.play('boon'); return; }
    if (menuOK(s) && G.t > 20) { G.boonPick[i] = G.boonOpts[i][G.boonIdx[i]] || 'skip'; Audio2.play('boon'); }
  });
  if (World.players.every((p, i) => G.boonPick[i])) { if (!G.boonDoneT) G.boonDoneT = 30; G.boonDoneT--; if (G.boonDoneT <= 0) { G.boonDoneT = 0; G.finishBoons(); } }
}
const REMAP_STEPS = [['a', 'ATTACK'], ['b', 'SPECIAL'], ['j', 'JUMP'], ['s', 'SHIELD'], ['p', 'PAUSE']];
function updateRemap() {
  const G = Game, R = G.remap; const pads = getPads();
  if (!pads.length) { if (anyBack() || anyOK()) G.setScene('mode'); return; }
  const gp = pads[0];
  R.prev = R.prev || gp.buttons.map(b => b.pressed);
  const now = gp.buttons.map(b => b.pressed);
  for (let i = 0; i < now.length; i++) if (now[i] && !R.prev[i]) {
    const k = REMAP_STEPS[R.step][0]; R.map[k] = R.map[k] || []; R.map[k].push(i);
    if (k === 'j' || k === 's') { /* allow one button; the default extras are kept */ }
    R.step++; Audio2.play('select');
    if (R.step >= REMAP_STEPS.length) { padMap = { ...PAD_DEFAULT, a: R.map.a, b: R.map.b, j: R.map.j, s: [...new Set([...R.map.s, ...PAD_DEFAULT.s.filter(x => ![...R.map.a, ...R.map.b, ...R.map.j].includes(x))])], p: R.map.p }; store('sse_padmap', padMap); UI.toast('Controller mapping saved'); G.setScene('mode'); }
    break;
  }
  R.prev = now;
  if (KeysPressed['Escape']) { G.setScene('mode'); }
  if (KeysPressed['Backspace']) { padMap = JSON.parse(JSON.stringify(PAD_DEFAULT)); store('sse_padmap', padMap); UI.toast('Mapping reset to default'); G.setScene('mode'); }
}

// ---- drawing scenes ----
function drawWorld() {
  const st = World.stage; if (!st) return; const c = World.cam;
  drawBackground(ctx, st, c);
  ctx.save();
  let sx = 0, sy = 0; if (World.shakeAmt > 0.3) { sx = rr(-1, 1) * World.shakeAmt; sy = rr(-1, 1) * World.shakeAmt; World.shakeAmt *= 0.85; } else World.shakeAmt = 0;
  World.zp = (World.zp || 0) * 0.85; const zz = c.z * (1 + World.zp);
  ctx.translate(W / 2 + sx, H / 2 + sy); ctx.scale(zz, zz); ctx.translate(-c.x, -c.y);
  drawStage(ctx, st); drawItems(ctx);
  for (const e of World.enemies) drawEnemy(ctx, e);
  for (const p of World.projs) drawProj(ctx, p);
  for (const p of World.players) drawFighter(ctx, p);
  drawParticles(ctx);
  ctx.restore();
  drawAmbient(ctx, st);
  if (World.mod.dark) drawDarkness();
  drawBarrierOverlay();
  drawKOBlasts(ctx);
  drawOffscreen();
}
let darkCv = null;
function drawDarkness() {
  if (!darkCv) { darkCv = document.createElement('canvas'); darkCv.width = W; darkCv.height = H; }
  const g = darkCv.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(8,4,16,0.88)'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'destination-out'; const c = World.cam;
  for (const p of World.players) { if (p.dead || p.out) continue; const x = (p.x - c.x) * c.z + W / 2, y = (p.y - 30 - c.y) * c.z + H / 2; const gr = g.createRadialGradient(x, y, 30, x, y, 260 * c.z); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 260 * c.z, 0, TAU); g.fill(); }
  for (const pr of World.projs) { const x = (pr.x - c.x) * c.z + W / 2, y = (pr.y - c.y) * c.z + H / 2; g.fillStyle = 'rgba(0,0,0,0.7)'; g.beginPath(); g.arc(x, y, 40, 0, TAU); g.fill(); }
  ctx.drawImage(darkCv, 0, 0);
}
function drawBarrierOverlay() {
  const B = World.barriers; if (!B) return; const c = World.cam; const t = World.frame;
  for (const side of [-1, 1]) {
    const bx = (side < 0 ? B.l : B.r); let sx = (bx - c.x) * c.z + W / 2; sx = side < 0 ? Math.max(0, sx) : Math.min(W, sx);
    const w = 90; const gr = ctx.createLinearGradient(sx, 0, sx - side * w, 0);
    gr.addColorStop(0, 'rgba(150,70,255,0.42)'); gr.addColorStop(0.35, 'rgba(150,70,255,0.16)'); gr.addColorStop(1, 'rgba(150,70,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(side < 0 ? sx : sx - w, 34, w, H - 34);
    // hex lattice shimmer
    ctx.strokeStyle = 'rgba(220,180,255,0.22)'; ctx.lineWidth = 1.2;
    for (let y = 40 + ((t * 0.6) % 34); y < H; y += 34) for (let k = 0; k < 2; k++) { const hx = sx - side * (12 + k * 26), hy = y + k * 17, r = 9; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; ctx.lineTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r); } ctx.closePath(); ctx.stroke(); }
    ctx.fillStyle = `rgba(230,200,255,${0.35 + Math.sin(t * 0.08) * 0.1})`; ctx.fillRect(side < 0 ? sx : sx - 3, 34, 3, H - 34);
  }
}
function drawOffscreen() {
  const c = World.cam;
  for (const p of World.players) {
    if (p.dead || p.out) continue; const x = (p.x - c.x) * c.z + W / 2, y = (p.y - 30 - c.y) * c.z + H / 2;
    if (x < 0 || x > W || y < 0 || y > H) { const cx = clamp(x, 40, W - 40), cy = clamp(y, 40, H - 140); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, TAU); ctx.fill(); ctx.strokeStyle = p.def.color; ctx.lineWidth = 4; ctx.stroke(); UI.text('P' + (p.slot + 1), cx, cy + 6, 16, p.def.color); }
  }
}
function pctColor(p) { const t = clamp(p / 160, 0, 1); const r = 255, g = Math.round(255 - t * 200), b = Math.round(255 - t * 230); return `rgb(${r},${g},${b})`; }
function drawHUD() {
  const G = Game, R = G.run; if (!R) return;
  // player cards
  const n = World.players.length; const cw = 230, total = n * cw + (n - 1) * 30; let x0 = W / 2 - total / 2;
  World.players.forEach((p, i) => {
    const x = x0 + i * (cw + 30), y = H - 80;
    ctx.fillStyle = 'rgba(15,12,22,0.72)'; ctx.fillRect(x, y, cw, 72); ctx.fillStyle = p.def.color; ctx.fillRect(x, y, 8, 72);
    // mini head
    ctx.fillStyle = p.def.color; ctx.beginPath(); ctx.arc(x + 38, y + 30, 16, 0, TAU); ctx.fill();
    UI.text(p.def.name, x + 38, y + 64, 12, '#ddd');
    const pctTxt = p.out ? 'OUT' : p.dead ? '--' : Math.floor(p.pct) + '%';
    ctx.font = '900 40px Rubik,system-ui,sans-serif'; ctx.textAlign = 'right'; ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.strokeText(pctTxt, x + cw - 14, y + 50); ctx.fillStyle = p.out ? '#888' : pctColor(p.pct); ctx.fillText(pctTxt, x + cw - 14, y + 50);
    UI.text('P' + (i + 1) + ((Net.isHost || Net.isGuest) ? (G.slots[i] && G.slots[i].dev === 'net' ? ' · PARTNER' : ' · YOU') : ''), x + 70, y + 18, 11, '#aaa', 'left');
    // boon pips
    const bs = p.boons.slice(-10); bs.forEach((id, k) => { ctx.fillStyle = RARITY[BOON_BY_ID[id].r].c; ctx.fillRect(x + 70 + k * 12, y + 58, 8, 8); });
  });
  // stocks
  // top bar
  ctx.fillStyle = 'rgba(15,12,22,0.6)'; ctx.fillRect(0, 0, W, 34);
  UI.text('LIVES', W - 330, 23, 13, '#fff', 'right');
  for (let i = 0; i < Math.min(10, G.teamStocks); i++) { ctx.fillStyle = '#ff4f6a'; const sx = W - 312 + i * 15; ctx.beginPath(); ctx.arc(sx, 18, 5.5, 0, TAU); ctx.fill(); }
  if (G.teamStocks > 10) UI.text('+' + (G.teamStocks - 10), W - 160, 23, 12, '#ff4f6a', 'left');
  UI.text(stageLabel(R.idx) + ' · ' + World.stage.B.name, 14, 23, 15, '#fff', 'left');
  const tsec = Math.floor(R.time / 60); UI.text(String(Math.floor(tsec / 60)).padStart(2, '0') + ':' + String(tsec % 60).padStart(2, '0'), W - 14, 23, 16, '#fff', 'right');
  UI.text('KOs ' + R.kills, W - 90, 23, 14, '#ffde3c', 'right');
  let mx = 380; for (const m of (World.stage.mods || [])) { const t = MODIFIERS[m].name; ctx.font = '700 12px Rubik,system-ui,sans-serif'; const w = ctx.measureText(t).width + 16; ctx.fillStyle = '#ff4fd8'; ctx.fillRect(mx, 8, w, 19); UI.text(t, mx + w / 2, 22, 12, '#fff', 'center', 700); mx += w + 8; }
  // arena status / boss bar
  const b = G.bossRef;
  if (b && !b.dead && !b.dying) { const bw = 600; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(W / 2 - bw / 2 - 4, 46, bw + 8, 22); ctx.fillStyle = '#ff3cd5'; ctx.fillRect(W / 2 - bw / 2, 50, bw * Math.max(0, b.hp / b.maxHp), 14); UI.text(b.def.name.toUpperCase(), W / 2, 86, 16, '#fff'); }
  else if (G.arenaI >= 0) { const A = World.stage.arenas[G.arenaI]; UI.text('⚔ LOCKED IN · WAVE ' + Math.min(A.waves.length, G.waveI + 1) + '/' + A.waves.length, W / 2, 60, 18, '#ff4fd8'); }
  else if (World.stage.arenas.every(a => a.done)) { if (World.frame % 60 < 40) UI.text('EXIT OPEN  ➜', W / 2, 60, 20, '#b05cff'); }
  else if (World.frame % 90 < 60 && G.stageT < 600) UI.text('GO  ➜', W / 2, 60, 22, '#fff');
  // banner
  const bn = G.banner; if (bn && bn.t < 200) { const a = bn.t < 20 ? bn.t / 20 : bn.t > 170 ? (200 - bn.t) / 30 : 1; ctx.globalAlpha = a; ctx.fillStyle = 'rgba(15,12,22,0.8)'; ctx.fillRect(0, H / 2 - 90, W, 150); UI.text(bn.title, W / 2, H / 2 - 30, 44, '#fff'); UI.text(bn.sub, W / 2, H / 2 + 10, 22, '#ff4fd8'); if (bn.mods.length) UI.text(bn.mods.map(m => MODIFIERS[m].name + ': ' + MODIFIERS[m].desc).join('   '), W / 2, H / 2 + 42, 15, '#ffde3c'); ctx.globalAlpha = 1; }
  if (G.showControls > 0) { G.showControls--; drawControlsPanel(140, 90, 0.92); }
}
function drawTitleBG() {
  const g = ctx; const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2a2238'); gr.addColorStop(1, '#120d1c'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const t = Game.t + (Game.tt = (Game.tt || 0) + 1);
  for (let i = 0; i < 26; i++) { const x = (i * 97 + t * 0.3 * (i % 3 + 1)) % (W + 100) - 50, y = (i * 61) % H; g.fillStyle = 'rgba(255,79,216,0.12)'; g.save(); g.translate(x, y); g.rotate(i + t * 0.005); g.fillRect(-6, -18, 12, 36); g.restore(); }
  g.fillStyle = '#0d0a14'; g.fillRect(0, H - 120, W, 120); g.fillStyle = '#7a3cff'; g.fillRect(0, H - 120, W, 6);
  // four fighters posing
  FIGHTERS.forEach((F, i) => { const x = W / 2 - 300 + i * 200, y = H - 120; const pose = kfPose(F.moves.fsmash.kf, ((t * 0.5 + i * 13) % 60)); const J = drawStick(g, x, y, i < 2 ? 1 : -1, pose, F.color, { s: 1.6, dark: F.dark }); if (F.weapon !== 'none') drawWeapon(g, F.weapon, J.h1[0], J.h1[1], i < 2 ? 1 : -1, pose[11], 1.6, F.color); });
}
function drawControlsPanel(x, y, a = 0.95) {
  UI.panel(x, y, W - x * 2, 470, `rgba(15,12,22,${a})`);
  UI.text('CONTROLS', W / 2, y + 40, 28, '#fff');
  const col1 = x + 40, col2 = W / 2 + 20;
  UI.text('SWITCH PRO / GAMEPAD', col1, y + 80, 17, '#ff4fd8', 'left');
  ['Left stick ........ move / aim', 'A (right button) .. attack', 'B (bottom) ........ special', 'X / Y ............. jump', 'L / R / ZL / ZR ... shield / dodge', 'Flick stick + A ... smash attack', 'Right stick ....... smash / aerials', 'Stick up/flick .... jump (tap-jump)', '+ ................. pause'].forEach((t, i) => UI.text(t, col1, y + 110 + i * 26, 15, '#ddd', 'left', 600));
  UI.text('KEYBOARD  P1  /  P2', col2, y + 80, 17, '#ff4fd8', 'left');
  ['Move ...... WASD   / Arrows', 'Attack .... J      / , (comma)', 'Special ... K      / . (period)', 'Jump ...... Space  / Right Shift', 'Shield .... L      / /', 'Smash ..... I      / ;', 'Pause ..... Esc    / Backspace', '', 'Shield + direction = roll/dodge'].forEach((t, i) => UI.text(t, col2, y + 110 + i * 26, 15, '#ddd', 'left', 600));
  UI.text('Up+Special = recovery.  Grab ledges by falling near them.  Knock foes past the edges for a KO!', W / 2, y + 450, 14, '#ffde3c');
}
function drawCharSel() {
  drawTitleBG(); const G = Game;
  UI.text('CHOOSE YOUR FIGHTER', W / 2, 60, 34, '#fff');
  if (G.mode === 'local' && G.slots.length < 2) UI.text('Player 2: press ATTACK or JUMP on another controller / keyboard (Arrows + Comma) to join', W / 2, 92, 15, '#ffde3c');
  if (G.mode === 'host') UI.text(Net.guestPeer ? 'Partner connected ✓' : 'Waiting for partner…  Room code: ' + Net.code, W / 2, 92, 16, '#7dff8a');
  const cw = 270; FIGHTERS.forEach((F, i) => {
    const x = W / 2 - 2 * cw + i * cw + 10, y = 120; const sel = G.slots.map((s, k) => G.csel[k] === i ? k : -1).filter(k => k >= 0);
    ctx.fillStyle = sel.length ? 'rgba(40,30,60,0.95)' : 'rgba(20,16,28,0.85)'; ctx.fillRect(x, y, cw - 20, 420);
    clickRegions().push({ x, y, w: cw - 20, h: 420, fn: () => { Game.clickChar = i; } });
    sel.forEach((k, j) => { ctx.strokeStyle = G.cready[k] ? '#7dff8a' : World.frame % 30 < 20 ? '#fff' : '#888'; ctx.lineWidth = 4; ctx.strokeRect(x + 2 + j * 6, y + 2 + j * 6, cw - 24 - j * 12, 416 - j * 12); UI.text('P' + (k + 1) + (G.cready[k] ? ' READY' : ''), x + 20 + j * 80, y + 26, 14, k === 0 ? '#ff6b6b' : '#5ab4ff', 'left'); });
    const pose = kfPose(F.moves[['fsmash', 'fair', 'nspec', 'usmash'][i % 4]].kf, (Game.t * 0.4) % 40);
    const J = drawStick(ctx, x + (cw - 20) / 2, y + 190, 1, pose, F.color, { s: 2.2, dark: F.dark }); if (F.weapon !== 'none') drawWeapon(ctx, F.weapon, J.h1[0], J.h1[1], 1, pose[11], 2.2, F.color);
    UI.text(F.name, x + (cw - 20) / 2, y + 230, 30, F.color); UI.text(F.title, x + (cw - 20) / 2, y + 254, 14, '#ccc');
    UI.wrap(F.blurb, x + 14, y + 282, cw - 48, 12, '#ddd');
    const sp = F.specials; [['N', 'nspec'], ['S', 'sspec'], ['U', 'uspec'], ['D', 'dspec']].forEach(([k, m], j) => UI.text(k + '-B  ' + sp[m].name, x + 14, y + 340 + j * 18, 12, '#ffde3c', 'left', 700));
    const s = F.stats; UI.text(`WT ${s.weight}  SPD ${s.run}  JUMPS ${s.jumps + 1}`, x + 14, y + 410, 11, '#999', 'left', 600);
  });
  UI.text('◀ ▶ choose    ATTACK/JUMP confirm    SPECIAL back', W / 2, H - 30, 15, '#aaa');
}
function drawBoon() {
  drawWorld(); ctx.fillStyle = 'rgba(10,8,16,0.82)'; ctx.fillRect(0, 0, W, H); const G = Game;
  UI.text(G.scene === 'boon' && G.run.endless && G.run.idx === 11 ? 'ENDLESS AWAITS · CHOOSE A BOON' : 'STAGE CLEAR · CHOOSE A BOON', W / 2, 70, 30, '#fff');
  const n = World.players.length; const colW = n > 1 ? 560 : 620;
  World.players.forEach((p, i) => {
    const x0 = n > 1 ? W / 2 - colW - 10 + i * (colW + 20) : W / 2 - colW / 2;
    UI.text('P' + (i + 1) + ' · ' + p.def.name + (G.boonPick[i] ? '  ✓' : ''), x0 + colW / 2, 120, 20, p.def.color);
    const opts = G.boonOpts[i] || [];
    opts.forEach((id, k) => {
      const b = BOON_BY_ID[id]; const y = 150 + k * 150; const sel = G.boonIdx[i] === k; const picked = G.boonPick[i] === id;
      ctx.fillStyle = picked ? 'rgba(60,90,60,0.95)' : sel ? 'rgba(50,40,75,0.95)' : 'rgba(25,20,35,0.9)'; ctx.fillRect(x0, y, colW, 130);
      ctx.fillStyle = RARITY[b.r].c; ctx.fillRect(x0, y, 8, 130);
      if (sel && !G.boonPick[i]) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(x0 + 1, y + 1, colW - 2, 128); }
      UI.text(RARITY[b.r].n, x0 + 28, y + 30, 12, RARITY[b.r].c, 'left'); UI.text(b.name, x0 + 28, y + 64, 26, '#fff', 'left'); UI.text(b.desc, x0 + 28, y + 98, 15, '#ccc', 'left', 600);
      const have = p.boons.filter(z => z === id).length; if (have) UI.text('owned ×' + have, x0 + colW - 16, y + 30, 12, '#aaa', 'right');
      if (G.slots[i] && G.slots[i].dev !== 'net') clickRegions().push({ x: x0, y, w: colW, h: 130, fn: () => { Game.clickBoon = [i, k]; } });
    });
    if (G.slots[i] && G.slots[i].dev === 'net' && !G.boonPick[i]) UI.text('waiting for partner…', x0 + colW / 2, 640, 16, '#aaa');
  });
}
function drawMenu(title, opts, idx, y0 = 300) {
  opts.forEach((o, i) => { const y = y0 + i * 52; const sel = i === idx; ctx.fillStyle = sel ? '#ff4fd8' : 'rgba(20,16,28,0.85)'; ctx.fillRect(W / 2 - 220, y - 30, 440, 44); UI.text(o, W / 2, y, 22, sel ? '#fff' : '#ddd'); clickRegions().push({ x: W / 2 - 220, y: y - 30, w: 440, h: 44, fn: () => { Game.clickPick = i; } }); });
}
function sceneDraw() {
  const G = Game; Game.clicks = [];
  const sc = Net.isGuest ? Net.guestScene : G.scene;
  setupHD(); ctx.setTransform(HD.k, 0, 0, HD.k, 0, 0); ctx.clearRect(0, 0, W, H); ctx.imageSmoothingQuality = 'high';
  switch (sc) {
    case 'title': drawTitleBG(); UI.text('RIFTBRAWL', W / 2, 200, 96, '#fff'); UI.text('a co-op roguelike platform fighter', W / 2, 245, 22, '#ff4fd8');
      if (G.t % 60 < 40) UI.text('PRESS ANY BUTTON', W / 2, 380, 26, '#ffde3c'); UI.text(gamepadBlocked ? 'Controllers unavailable in this view — open the page full-screen to use one' : (getPads().length ? 'Controller detected: ' + shortPadName(getPads()[0].id) : 'Keyboard ready · Plug in a controller and press a button'), W / 2, 430, 15, '#aaa');
      if (G.best.time) UI.text('Best clear ' + fmtTime(G.best.time) + (G.best.endless ? ' · Endless best ' + G.best.endless : ''), W / 2, 470, 14, '#888');
      clickRegions().push({ x: 0, y: 0, w: W, h: H, fn: () => { Game.clicked = 1; } }); break;
    case 'mode': drawTitleBG(); UI.text('RIFTBRAWL', W / 2, 140, 64, '#fff'); drawMenu('', MODE_OPTS, G.menuIdx, 230); break;
    case 'controls': drawTitleBG(); drawControlsPanel(120, 110); UI.text('press any button to return', W / 2, 650, 14, '#aaa'); clickRegions().push({ x: 0, y: 0, w: W, h: H, fn: () => { Game.clickPick = 0; } }); break;
    case 'remap': { drawTitleBG(); const R = G.remap; UI.text('CONTROLLER SETUP', W / 2, 160, 40, '#fff'); if (!getPads().length) UI.text('No controller detected. Connect one and press a button first.', W / 2, 300, 18, '#ffde3c'); else { UI.text('Press the button you want for:', W / 2, 280, 20, '#ccc'); UI.text(REMAP_STEPS[Math.min(R.step, REMAP_STEPS.length - 1)][1], W / 2, 350, 54, '#ff4fd8'); UI.text('Smash default: ATTACK = A (right), SPECIAL = B (bottom), JUMP = X, SHIELD = R', W / 2, 430, 15, '#aaa'); UI.text('Esc: cancel   Backspace: reset to default', W / 2, 470, 14, '#888'); } break; }
    case 'lobby': drawTitleBG(); UI.text('HOSTING ONLINE CO-OP', W / 2, 170, 36, '#fff'); UI.text('Share this room code with your partner:', W / 2, 250, 20, '#ccc'); UI.text(Net.code || '....', W / 2, 340, 90, '#ffde3c'); UI.text(Net.status, W / 2, 410, 17, Net.ok ? '#7dff8a' : '#ff8a8a'); UI.text('They open this same game, pick ONLINE: JOIN, and enter the code.', W / 2, 450, 15, '#aaa'); UI.text('SPECIAL / Esc to go back', W / 2, 620, 14, '#888'); break;
    case 'join': drawTitleBG(); UI.text('JOIN ONLINE CO-OP', W / 2, 170, 36, '#fff'); UI.text('Type the host\'s 4-letter code below, then press Enter', W / 2, 240, 18, '#ccc'); UI.text(Net.status, W / 2, 440, 17, Net.ok ? '#7dff8a' : '#ffde3c'); break;
    case 'charsel': drawCharSel(); break;
    case 'play': drawWorld(); drawHUD(); if (G.paused || (Net.isGuest && Net.hostPaused)) drawPause(); if (Net.isGuest && G.localPause) drawPause(true); break;
    case 'boon': drawBoon(); break;
    case 'over': { drawTitleBG(); const s = G.overStats || {}; UI.text(s.win ? 'VICTORY' : 'DEFEATED', W / 2, 170, 72, s.win ? '#ffde3c' : '#ff4f6a'); UI.text(s.stage || '', W / 2, 230, 22, '#fff'); UI.text('Time ' + fmtTime(s.time || 0) + '   ·   KOs ' + (s.kills || 0) + (s.endless ? '   ·   Endless stages ' + s.endless : ''), W / 2, 280, 20, '#ccc'); if (G.t > 40) UI.text('ATTACK: new run   ·   SPECIAL: title', W / 2, 400, 20, '#ffde3c'); clickRegions().push({ x: 0, y: 0, w: W, h: H, fn: () => { Game.clickPick = 0; } }); break; }
    case 'victory': { drawWorld(); ctx.fillStyle = 'rgba(10,8,16,0.8)'; ctx.fillRect(0, 0, W, H); UI.text('THE HOLLOW CROWN FALLS', W / 2, 170, 48, '#ffde3c'); UI.text('Run time ' + fmtTime(G.run ? G.run.time : 0), W / 2, 220, 20, '#fff'); UI.text('The rift is still open… how far can you go?', W / 2, 260, 18, '#ff4fd8'); drawMenu('', ['ENTER ENDLESS MODE', 'END RUN (VICTORY)'], G.menuIdx, 360); break; }
    case 'wait': drawTitleBG(); UI.text(Net.status || 'Waiting for host…', W / 2, 330, 24, '#fff'); break;
  }
  // toasts
  UI.toasts.forEach((t, i) => { t.life--; ctx.globalAlpha = clamp(t.life / 30, 0, 1); ctx.fillStyle = 'rgba(15,12,22,0.9)'; ctx.font = '700 15px Rubik,system-ui,sans-serif'; const w = ctx.measureText(t.t).width + 30; ctx.fillRect(W - w - 16, 46 + i * 40, w, 32); UI.text(t.t, W - 16 - w / 2, 67 + i * 40, 15, '#fff', 'center', 700); ctx.globalAlpha = 1; });
  UI.toasts = UI.toasts.filter(t => t.life > 0);
}
function drawPause(local) { ctx.fillStyle = 'rgba(10,8,16,0.75)'; ctx.fillRect(0, 0, W, H); UI.text(Net.isGuest && Net.hostPaused && !local ? 'PAUSED BY HOST' : 'PAUSED', W / 2, 200, 56, '#fff'); if (!Net.isGuest) drawMenu('', ['RESUME', 'SHOW CONTROLS', 'QUIT RUN'], Game.pauseIdx, 320); else if (local) drawMenu('', ['RESUME', 'LEAVE GAME'], Game.pauseIdx, 320); }
function fmtTime(f) { const s = Math.floor(f / 60); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }

// ---- join box (DOM) ----
const joinBox = document.getElementById('join');
const joinInput = document.getElementById('joincode');
function showJoinBox(v) { joinBox.style.display = v ? 'flex' : 'none'; if (v) setTimeout(() => joinInput.focus(), 50); }
function joinFocused() { return document.activeElement === joinInput; }
joinInput.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { const code = joinInput.value.trim().toUpperCase(); if (/^[A-Z]{4}$/.test(code)) { Net.join(code); } else Net.status = 'Codes are 4 letters'; } if (e.key === 'Escape') { showJoinBox(false); Game.setScene('mode'); } });
document.getElementById('joinbtn').addEventListener('click', () => { const code = joinInput.value.trim().toUpperCase(); if (/^[A-Z]{4}$/.test(code)) Net.join(code); else Net.status = 'Codes are 4 letters'; });

// ---- mouse clicks (menus) ----
cv.addEventListener('click', ev => {
  Audio2.unlock();
  const r = cv.getBoundingClientRect(); const x = (ev.clientX - r.left) / r.width * W, y = (ev.clientY - r.top) / r.height * H;
  const regs = (Game.clicks || []).slice().reverse(); for (const c of regs) if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) { c.fn(x, y); break; }
});

// ---- main loop ----
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  let steps = 0;
  while (acc >= 1000 / 60 && steps < 4) {
    Devices.pollAll(); if (Net.remote) Net.remote.poll();
    sceneUpdate();
    if (!Net.isGuest && Game.scene === 'play') Game.updateCamera();
    Net.tick();
    for (const k in KeysPressed) delete KeysPressed[k];
    acc -= 1000 / 60; steps++;
  }
  sceneDraw();
  musicTick();
  requestAnimationFrame(loop);
}
