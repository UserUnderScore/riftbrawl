// ===== ENEMIES (10 types) + BOSSES =====
function A(s, e, x, y, r, d, a, bkb, kbg, o = {}) { return { s, e, x, y, r, d, a, bkb, kbg, ...o }; }
const ENEMY = {
  shade: { name: 'Shade', w: 22, h: 50, hp: 30, spd: 2.6, weight: 90, col: '#2b2d42', eye: '#ff4fd8',
    atks: {
      slash: { d: 40, tele: 14, hb: [A(14, 18, 34, -30, 22, 9, 40, 35, 70)], go: (e, t) => { if (t === 14) Audio2.play('swing'); } },
      rang: { d: 44, tele: 16, go: (e, t) => { if (t === 16) { spawnProj('erang', e, e.x + e.face * 18, e.y - 32, e.face * 9, 0); Audio2.play('swing'); } } },
      jab2: { d: 36, tele: 10, hb: [A(10, 12, 22, -34, 12, 4, 30, 20, 15), A(20, 23, 24, -34, 13, 5, 40, 35, 60)] },
      kick: { d: 42, tele: 16, hb: [A(16, 24, 20, -24, 14, 8, 45, 35, 70)], go: (e, t) => { if (t === 16) e.vx = e.face * 6; } },
    },
    ai(e, T) {
      const v = e.id % 3, ad = Math.abs(T.dx);
      if (v === 2 && ad < 200) e.walk(T, -1.5); else e.walk(T, 2.6);
      if (e.cd > 0) return;
      if (v === 2 && ad > 140 && ad < 430 && Math.abs(T.dy) < 70 && !World.projs.some(p => p.owner === e)) { e.face = sign(T.dx); e.attack('rang'); e.cd = 90; return; }
      if (ad < (v === 1 ? 64 : 50) && Math.abs(T.dy) < 40) { e.attack(v === 1 ? 'slash' : rnd() < 0.6 ? 'jab2' : 'kick'); e.cd = 50; }
    } },
  spitter: { name: 'Spitter', w: 34, h: 30, hp: 28, spd: 1.2, weight: 80, col: '#2f5544', eye: '#a8ff3c',
    atks: {
      spit: { d: 40, tele: 20, go: (e, t, T) => { if (t === 20 && T) { const vx = clamp(T.dx / 42, -8, 8); spawnProj('goo', e, e.x + e.face * 14, e.y - 22, vx, -7.5); Audio2.play('shoot'); } } },
      puff: { d: 30, tele: 10, hb: [A(10, 14, 0, -16, 34, 5, 60, 45, 30)] },
    },
    ai(e, T) {
      const ad = Math.abs(T.dx); if (ad < 180) e.walk(T, -1.6); else if (ad > 340) e.walk(T, 1.2); else e.vx *= 0.8; e.face = sign(T.dx) || e.face;
      if (e.cd <= 0) { if (ad < 50 && Math.abs(T.dy) < 40) { e.attack('puff'); e.cd = 60; } else if (ad < 600) { e.attack('spit'); e.cd = 100 + ri(0, 40); } }
    } },
  lancer: { name: 'Lancer', w: 20, h: 54, hp: 45, spd: 2.0, weight: 100, col: '#4a2f2f', eye: '#ff7a3c',
    atks: {
      charge: { d: 96, tele: 32, hb: [A(32, 62, 32, -30, 16, 11, 35, 45, 80)], go: (e, t) => { if (t === 32) Audio2.play('swing'); if (t >= 32 && t < 62) { e.vx = e.face * 11; if (t % 3 === 0) FX.dust(e.x, e.y); } if (t === 62) e.vx *= 0.2; } },
      poke: { d: 34, tele: 12, hb: [A(12, 15, 48, -32, 12, 7, 30, 30, 60)] },
    },
    ai(e, T) { const ad = Math.abs(T.dx); if (ad > 80) e.walk(T, 2.0); else e.vx *= 0.8; if (e.cd <= 0) { if (ad < 70 && Math.abs(T.dy) < 50) { e.attack('poke'); e.cd = 50; } else if (ad < 400 && Math.abs(T.dy) < 60) { e.face = sign(T.dx); e.attack('charge'); e.cd = 120; } } } },
  flit: { name: 'Flit', w: 26, h: 20, hp: 18, spd: 3, weight: 70, col: '#3a3157', eye: '#ffe14a', fly: 1,
    atks: { dive: { d: 64, tele: 24, hb: [A(24, 54, 0, -10, 15, 7, 50, 30, 60)], go: (e, t, T) => { if (t === 24 && T) { const m = Math.hypot(T.dx, T.dy - 10) || 1; e.dvx = T.dx / m * 10; e.dvy = (T.dy + 10) / m * 10; Audio2.play('swing'); } if (t >= 24 && t < 54) { e.vx = e.dvx; e.vy = e.dvy; } else { e.vx *= 0.9; e.vy *= 0.9; } } } },
    ai(e, T) { const tx = T.x + Math.sin(e.t / 40 + e.id) * 120, ty = T.y - 160; e.vx += clamp((tx - e.x) * 0.01, -0.4, 0.4); e.vy += clamp((ty - e.y) * 0.01, -0.4, 0.4); e.vx *= 0.95; e.vy *= 0.95; e.face = sign(T.dx) || e.face; if (e.cd <= 0 && Math.hypot(T.dx, T.dy) < 320) { e.attack('dive'); e.cd = 110 + ri(0, 60); } } },
  brute: { name: 'Brute', w: 44, h: 86, hp: 110, spd: 1.4, weight: 150, col: '#2e2a3d', eye: '#ff3c3c', armorKB: 110,
    atks: {
      swing: { d: 60, tele: 26, armor: 1, hb: [A(26, 32, 56, -50, 32, 13, 40, 50, 85)], go: (e, t) => { if (t === 26) Audio2.play('swing'); } },
      slam: { d: 76, tele: 36, armor: 1, hb: [A(36, 40, 44, -10, 36, 15, 80, 50, 70)], go: (e, t) => { if (t === 36) { spawnProj('eshock', e, e.x + 40, e.y - 10, 7, 0); spawnProj('eshock', e, e.x - 40, e.y - 10, -7, 0); World.shake(8); Audio2.play('boom'); FX.ring(e.x + e.face * 44, e.y, 70, '#ff6b6b'); } } },
    },
    ai(e, T) { const ad = Math.abs(T.dx); if (ad > 70) e.walk(T, 1.4); else e.vx *= 0.8; if (e.cd <= 0) { if (ad < 100 && Math.abs(T.dy) < 80) { e.attack('swing'); e.cd = 90; } else if (ad < 240) { e.face = sign(T.dx); e.attack('slam'); e.cd = 120; } } } },
  bomber: { name: 'Bomber', w: 22, h: 24, hp: 14, spd: 4.2, weight: 60, col: '#3d2b20', eye: '#ffde3c',
    atks: { fuse: { d: 48, tele: 48, go: (e, t) => { e.vx *= 0.8; if (t % 8 === 0) Audio2.play('blip'); if (t === 47) e.explode(); } } },
    ai(e, T) { e.walk(T, 4.2); if (Math.hypot(T.dx, T.dy) < 60) e.attack('fuse'); } },
  shieldbearer: { name: 'Shieldbearer', w: 26, h: 56, hp: 50, spd: 1.5, weight: 120, col: '#2a3a4a', eye: '#3cd5ff', shield: 1,
    atks: { bash: { d: 44, tele: 16, hb: [A(16, 24, 26, -30, 18, 9, 30, 55, 60)], go: (e, t) => { if (t === 16) e.vx = e.face * 6; } } },
    ai(e, T) { const want = sign(T.dx) || e.face; if (want !== e.face) { e.turnT = (e.turnT || 0) + 1; if (e.turnT > 40) { e.face = want; e.turnT = 0; } } else e.turnT = 0; if (Math.abs(T.dx) > 50) e.walk(T, 1.5, true); else e.vx *= 0.8; if (e.cd <= 0 && Math.abs(T.dx) < 70 && Math.abs(T.dy) < 50 && want === e.face) { e.attack('bash'); e.cd = 70; } } },
  sniper: { name: 'Sniper', w: 18, h: 52, hp: 24, spd: 2.2, weight: 80, col: '#2b3a2b', eye: '#ff3c3c',
    atks: { aim: { d: 96, tele: 0, go: (e, t, T) => { if (t < 60 && T) e.aim = Math.atan2(T.dy + 2, T.dx); e.aimT = t; if (t === 75) { spawnProj('bullet', e, e.x + Math.cos(e.aim) * 30, e.y - 36 + Math.sin(e.aim) * 30, Math.cos(e.aim) * 24, Math.sin(e.aim) * 24, { dmg: 13 * World.diff.dmg }); Audio2.play('shoot'); FX.burst(e.x + Math.cos(e.aim) * 30, e.y - 36 + Math.sin(e.aim) * 30, '#ff9a9a', 6); } if (t > 78) e.aim = null; } } },
    ai(e, T) {
      const ad = Math.abs(T.dx); e.face = sign(T.dx) || e.face;
      if (ad < 130 && (e.blinkCD || 0) <= 0) { e.blinkCD = 240; const B = World.barriers || { l: e.x - 500, r: e.x + 500 }; const nx = clamp(e.x - sign(T.dx) * 340, B.l + 40, B.r - 40); FX.portal(e.x, e.y - 26); const gy = groundBelow(nx, e.y - 300, 600); e.x = nx; if (gy !== null) e.y = gy; FX.portal(e.x, e.y - 26); Audio2.play('portal'); return; }
      if (ad < 300) e.walk(T, -2.2); else e.vx *= 0.8;
      if (e.cd <= 0 && ad < 900) { e.attack('aim'); e.cd = 70; }
    } },
  hopper: { name: 'Hopper', w: 28, h: 28, hp: 32, spd: 0, weight: 90, col: '#2f4a3a', eye: '#ffa83c',
    atks: {
      leap: { d: 120, tele: 18, hb: [A(19, 120, 0, -12, 18, 9, 70, 35, 60)], go: (e, t, T) => { if (t === 18 && T) { e.vy = -12.5; e.vx = clamp(T.dx / 45, -7, 7); e.air = 1; Audio2.play('jump'); } if (t > 22 && !e.air) { e.af = e.atk.d; spawnProj('blast', e, e.x, e.y - 8, 0, 0, { r: 44, dmg: 5 * World.diff.dmg, a: 'radial', bkb: 35, kbg: 30 }); FX.ring(e.x, e.y, 46, '#ffa83c'); World.shake(3); } } },
      tongue: { d: 40, tele: 14, hb: [A(14, 20, 64, -16, 12, 7, 20, 30, 50)] },
    },
    ai(e, T) { e.vx *= 0.85; e.face = sign(T.dx) || e.face; if (e.cd <= 0 && !e.air) { if (Math.abs(T.dx) < 80 && Math.abs(T.dy) < 30) { e.attack('tongue'); e.cd = 50; } else { e.attack('leap'); e.cd = 40 + ri(0, 30); } } } },
  warlock: { name: 'Warlock', w: 24, h: 54, hp: 40, spd: 2, weight: 90, col: '#3a2550', eye: '#c77dff', fly: 1,
    atks: {
      hex: { d: 50, tele: 30, go: (e, t) => { if (t === 30) { spawnProj('hex', e, e.x + e.face * 20, e.y - 40, e.face * 2, -1); Audio2.play('shoot'); } } },
      summon: { d: 60, tele: 40, go: (e, t) => { if (t === 40) { const m = spawnEnemy('shade', e.x + e.face * 60, e.y, { minion: 1 }); m && (m.summoner = e); FX.portal(e.x + e.face * 60, e.y - 25); Audio2.play('portal'); } } },
    },
    ai(e, T) {
      const tx = T.x - sign(T.dx || 1) * 240, ty = T.y - 90 + Math.sin(e.t / 50) * 30; e.vx += clamp((tx - e.x) * 0.006, -0.3, 0.3); e.vy += clamp((ty - e.y) * 0.01, -0.3, 0.3); e.vx *= 0.94; e.vy *= 0.94; e.face = sign(T.dx) || e.face;
      e.tp = (e.tp || 200) - 1;
      if (e.tp <= 0) { e.tp = 300; FX.portal(e.x, e.y - 27); e.x = clamp(T.x + pick([-1, 1]) * rr(200, 320), (World.barriers || { l: -1e9 }).l + 40, (World.barriers || { r: 1e9 }).r - 40); e.y = T.y - rr(60, 140); FX.portal(e.x, e.y - 27); Audio2.play('portal'); }
      if (e.cd <= 0) { const minions = World.enemies.filter(m => m.summoner === e && !m.dead).length; if (minions < 2 && rnd() < 0.35) { e.attack('summon'); e.cd = 160; } else { e.attack('hex'); e.cd = 120; } }
    } },
};
const ENEMY_TYPES = Object.keys(ENEMY);

class Enemy {
  constructor(type, x, y, o = {}) {
    const d = this.def = ENEMY[type] || BOSS[type]; this.type = type; this.id = World.uid++; this.team = 1;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.kx = 0; this.ky = 0; this.face = -1; this.air = 1; this.t = 0;
    this.scale = d.boss ? 1 : 1.3; this.w = d.w * this.scale; this.h = d.h * this.scale; this.maxHp = d.hp * World.diff.hp; this.hp = this.maxHp; this.pct = 0; this.weight = d.weight;
    this.hitstun = 0; this.hitlag = 0; this.atk = null; this.af = 0; this.cd = 60 + ri(0, 60); this.hitSet = new Set(); this.mid = 0; this.dead = false; this.dying = 0; this.flash = 0;
    this.spawnT = o.spawn ? 40 : 0;
    this.elite = o.elite || null; this.minion = o.minion; this.spd = 1; this.dmgMul = 1; this.ward = 0; this.wardT = 0; this.boss = !!d.boss; this.jumpCD = 0;
    if (this.elite) {
      if (this.elite === 'giant') { this.scale *= 1.35; this.maxHp *= 1.8; this.dmgMul = 1.3; this.weight *= 1.3; }
      if (this.elite === 'swift') { this.spd = 1.5; this.maxHp *= 1.2; }
      if (this.elite === 'volatile') { this.maxHp *= 1.2; }
      if (this.elite === 'warded') { this.ward = 25; }
      this.hp = this.maxHp; this.w = d.w * this.scale; this.h = d.h * this.scale;
    }
    if (d.init) d.init(this);
  }
  target() {
    let best = null, bd = 1e9;
    for (const p of World.players) { if (p.dead || p.out) continue; const dd = Math.abs(p.x - this.x) + Math.abs(p.y - this.y) * 0.5; if (dd < bd) { bd = dd; best = p; } }
    if (!best) return null; return { x: best.x, y: best.y, dx: best.x - this.x, dy: best.y - this.y, p: best };
  }
  walk(T, s, noTurn) {
    s *= this.spd; const dir = sign(T.dx); if (!noTurn && s > 0) this.face = dir || this.face; if (s < 0) this.face = dir || this.face;
    let mv = dir * s;
    if (!this.def.fly && !this.air) {
      // edge check
      const ahead = this.x + sign(mv) * (this.w / 2 + 8); const g = groundBelow(ahead, this.y - 4, 60);
      if (g === null && T.dy < 40) mv = 0;
      // jump to reach higher target or over walls
      if (this.jumpCD <= 0 && ((T.dy < -70 && Math.abs(T.dx) < 220) || (Math.abs(this.vx) < 0.3 && Math.abs(mv) > 0.5 && solidAt(ahead + sign(mv) * 4, this.y - 10)))) { this.vy = -11.5; this.air = 1; this.jumpCD = 70; }
    }
    this.vx += clamp(mv - this.vx, -0.5, 0.5);
  }
  attack(name) { this.atk = this.def.atks[name]; this.atkName = name; this.af = 0; this.hitSet.clear(); this.mid++; }
  update() {
    if (this.dead) return;
    this.t++; tickStatus(this); if (this.flash > 0) this.flash--; if (this.jumpCD > 0) this.jumpCD--; if (this.blinkCD > 0) this.blinkCD--;
    if (this.hitlag > 0) { this.hitlag--; return; }
    if (this.spawnT > 0) { this.spawnT--; if (!this.def.fly) this.physics(); return; }
    if (this.asleep) { const T0 = this.target(); if (!T0 || Math.abs(T0.dx) > 760) { this.physics(); return; } this.asleep = false; }
    if (this.ward === 0 && this.elite === 'warded') { this.wardT++; if (this.wardT > 300) { this.ward = 25; this.wardT = 0; } }
    if (this.dying) { this.dying++; this.physics(); if (this.dying > 40) this.remove(); return; }
    const T = this.target();
    if (this.hitstun > 0) { this.hitstun--; if (this.type === 'bomber' && this.hitstun === 0 && this.launched) this.explode(); }
    else if (this.atk) {
      this.af += this.spd > 1 ? 1.3 : 1; const t = Math.floor(this.af);
      for (let k = Math.floor(this.af - (this.spd > 1 ? 1.3 : 1)) + 1; k <= t; k++) if (this.atk.go) this.atk.go(this, k, T);
      if (!this.def.fly && !this.atk.go) this.vx *= 0.85;
      if (this.atk && this.af >= this.atk.d) { this.atk = null; this.aim = null; }
    } else if (T) {
      this.cd -= this.spd;
      this.def.ai(this, T);
    } else { this.vx *= 0.9; }
    this.physics();
  }
  physics() {
    const fly = this.def.fly && !this.dying && this.hitstun <= 0;
    if (!fly) { this.vy += 0.55 * (World.mod.lowgrav ? 0.6 : 1); if (this.vy > 11) this.vy = 11; }
    else if (this.hitstun > 0) this.vy += 0.3;
    const km = Math.hypot(this.kx, this.ky); if (km > 0) { const nm = Math.max(0, km - KB_DECAY); this.kx *= nm / km; this.ky *= nm / km; }
    if ((this.hitstun > 0 || this.dying) && km > 8 && World.frame % 2 === 0) FX.trail(this.x - this.kx, this.y - this.h / 2 - this.ky, 'rgba(90,90,100,0.45)', 5 + km * 0.3);
    const passB = (this.hitstun > 0 || this.dying) && km > 12;
    const r = moveBody(this, this.vx + this.kx, this.vy + this.ky, { passBarrier: passB, noWorldEdge: passB });
    if (r.wall) { if ((this.hitstun > 0 || this.dying) && Math.abs(this.kx) > 7) { const sp = Math.abs(this.kx); this.kx *= -0.4; if (!this.dying) { this.hurtRaw(Math.min(10, sp * 0.6), true); FX.text(this.x, this.y - this.h - 10, 'SPLAT', '#ffd27a', 14); } World.shake(4); if (this.type === 'bomber') this.explode(); } else this.kx = 0; this.vx = 0; }
    if (r.ceil) { this.vy = Math.max(0, this.vy); this.ky = Math.max(0, this.ky); }
    if (r.land) { if (this.ky > 5 && this.hitstun > 0) { this.ky *= -0.4; } else { this.ky = 0; this.vy = 0; } this.air = 0; }
    else if (!onGround(this)) this.air = 1; else this.air = 0;
    if (fly) { this.vy *= 1; }
  }
  hitboxes() {
    const out = []; if (!this.atk || this.dying || this.hitstun > 0 || this.spawnT > 0) return out;
    const t = Math.floor(this.af), sc = this.scale;
    (this.atk.hb || []).forEach((h, i) => { if (t >= h.s && t <= h.e) out.push({ x: this.x + this.face * h.x * sc, y: this.y + h.y * sc, r: h.r * sc, d: h.d * this.dmgMul, a: h.a, bkb: h.bkb, kbg: h.kbg, key: this.mid * 10 + i, fx: h.fx, ang: h.ang, unblockable: h.unblockable }); });
    return out;
  }
  hurt() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }
  takeHit(info) {
    if (this.dead || this.dying || this.spawnT > 0) return null;
    // shieldbearer front guard
    if (this.def.shield && !this.stunGuard) {
      const fromFront = sign((info.ax ?? info.x) - this.x) === this.face; const above = info.y < this.y - this.h * 0.95;
      if (fromFront && !above) {
        if (info.dmg >= 15) { this.stunGuard = 1; this.hitstun = 70; FX.text(this.x, this.y - this.h - 10, 'GUARD BREAK', '#3cd5ff', 14); Audio2.play('bighit'); setTimeout(() => this.stunGuard = 0, 1400); }
        else { FX.burst(info.x, info.y, '#3cd5ff', 6); Audio2.play('clink'); if (info.att && info.att.team === 0 && !info.proj) { info.att.kx = -this.face * 4; info.att.hitlag = 6; } return 'block'; }
      }
    }
    let dmg = info.dmg;
    if (this.ward > 0) { const ab = Math.min(this.ward, dmg); this.ward -= ab; dmg -= ab; this.wardT = 0; FX.burst(info.x, info.y, '#7df9ff', 6); if (this.ward <= 0) { FX.text(this.x, this.y - this.h, 'WARD BROKEN', '#7df9ff', 13); } if (dmg <= 0) { Audio2.play('clink'); return 'hit'; } }
    this.hp -= dmg; this.flash = 6; this.pct += dmg * (this.boss ? 0 : 100 / Math.max(20, this.maxHp / World.diff.hp));
    FX.text(info.x, info.y - 10, Math.round(dmg), '#fff', 12 + Math.min(10, dmg / 2));
    if (this.boss) { this.hitlag = 3; FX.hit(info.x, info.y, 20, info.fx); Audio2.play('hit', 0.3); if (this.def.onHurt) this.def.onHurt(this); if (this.hp <= 0) this.die(info); return 'hit'; }
    let kb = calcKB(this.pct, dmg, this.weight, info.bkb, info.kbg);
    const armored = this.atk && this.atk.armor && kb < (this.def.armorKB || 100) && this.hp > 0;
    if (armored) { this.hitlag = 4; FX.hit(info.x, info.y, 10, info.fx); Audio2.play('hit', 0); return 'hit'; }
    if (this.hp <= 0) kb = Math.max(kb, 95);
    let ang = deg(info.ang); const sp = kb * KB_SPEED;
    this.kx = Math.cos(ang) * sp; this.ky = -Math.sin(ang) * sp; this.vx = 0; this.vy = 0;
    if (!this.air && this.ky > 0) this.ky = -this.ky * 0.6;
    if (this.ky < -1) { this.air = 1; this.y -= 1; }
    this.hitstun = Math.floor(kb * 0.4) + (info.stun || 0); this.atk = null; this.aim = null; this.hitlag = hitlagFor(dmg); this.launched = kb > 60;
    FX.hit(info.x, info.y, kb, info.fx); World.shake(Math.min(8, kb / 30)); Audio2.play(kb > 110 ? 'bighit' : 'hit', Math.min(1, kb / 120));
    if (this.hp <= 0) this.die(info);
    return 'hit';
  }
  hurtRaw(d, silent) { if (this.dead || this.dying) return; this.hp -= d; this.flash = 6; if (!silent) FX.text(this.x, this.y - this.h, Math.round(d), '#bfe3ff', 12); if (this.hp <= 0) { if (this.boss) this.die({}); else { this.dying = 1; this.hitstun = 0; this.onDeath(); } } }
  die(info) {
    if (this.boss) { this.dying = 1; this.def.onDeath && this.def.onDeath(this); Game.bossDefeated(this); this.onDeath(); return; }
    this.dying = 1; this.onDeath();
  }
  onDeath() {
    if (this.deathDone) return; this.deathDone = 1;
    Game.onEnemyKilled(this);
    if (this.elite === 'volatile' || (this.type === 'bomber' && !this.exploded)) this.explode(true);
    if (!this.minion && !this.boss && rnd() < 0.08 + (this.elite ? 0.25 : 0)) spawnItem('food', this.x, this.y - 20);
  }
  explode(fromDeath) {
    if (this.exploded) return; this.exploded = 1;
    spawnProj('ebomb', null, this.x, this.y - 12, 0, 0, { team: 2, r: fromDeath ? 70 : 80, dmg: (fromDeath ? 12 : 18) * World.diff.dmg });
    FX.explode(this.x, this.y - 12, 75); Audio2.play('boom'); World.shake(9);
    if (!this.dying) { this.hp = 0; this.dying = 1; this.onDeath(); }
    this.remove();
  }
  remove() { if (!this.dead && !this.exploded) FX.dissolve(this.x, this.y, this.h); this.dead = true; }
  ko() { if (this.dead) return; FX.ko(this.x, this.y, '#ff4fd8'); Audio2.play('ko'); FX.text(this.x, this.y - 40, 'KO!', '#ffde3c', 22); if (!this.dying) { this.hp = 0; this.dying = 1; if (this.boss) { Game.bossDefeated(this); } this.onDeath(); } this.remove(); }
}

function spawnEnemy(type, x, y, o = {}) {
  if (World.enemies.filter(e => !e.dead).length > 26) return null;
  const e = type.startsWith('rival') ? new Rival(type === 'rival' ? (o.fid ?? ri(0, 3)) : +type.slice(5), x, y, o) : new Enemy(type, x, y, o);
  World.enemies.push(e); return e;
}

// ---------- BOSSES ----------
function bossStep(e, T) {
  // generic boss scheduler: chooses from pattern list
  const d = e.def;
  if (e.cd > 0) { e.cd -= 1; d.idle && d.idle(e, T); return; }
  const list = d.pattern(e);
  const nm = list[(e.patIdx = ((e.patIdx || 0) + 1)) % list.length];
  e.attack(nm); e.cd = d.rest(e);
}
const BOSS = {
  gatekeeper: { name: 'The Gatekeeper', boss: 1, w: 80, h: 150, hp: 650, weight: 999, col: '#2b2440', eye: '#ff4fd8',
    pattern: e => e.hp < e.maxHp * 0.5 ? ['sweep', 'leap', 'waves', 'charge', 'leap', 'summon'] : ['sweep', 'leap', 'charge', 'sweep', 'leap'],
    rest: e => e.hp < e.maxHp * 0.5 ? 35 : 55,
    idle(e, T) { e.face = sign(T.dx) || e.face; if (Math.abs(T.dx) > 160) e.vx += clamp(sign(T.dx) * 1.5 - e.vx, -0.2, 0.2); else e.vx *= 0.9; },
    atks: {
      sweep: { d: 80, tele: 40, hb: [A(40, 50, 90, -40, 70, 14, 40, 60, 70)], go: (e, t) => { e.vx *= 0.85; if (t === 40) { Audio2.play('swing'); World.shake(4); } } },
      leap: { d: 110, tele: 20, go: (e, t, T) => { if (t === 20 && T) { e.vy = -17; e.vx = clamp(T.dx / 55, -11, 11); e.air = 1; Audio2.play('jump'); } if (t > 26 && !e.air && !e.landed) { e.landed = 1; World.shake(12); Audio2.play('boom'); FX.ring(e.x, e.y, 140, '#ff4fd8'); spawnProj('blast', e, e.x, e.y - 20, 0, 0, { team: 1, r: 110, dmg: 12 * World.diff.dmg, a: 'radial', bkb: 55, kbg: 50 }); spawnProj('eshock', e, e.x + 50, e.y - 10, 7, 0); spawnProj('eshock', e, e.x - 50, e.y - 10, -7, 0); e.vx = 0; } if (t === 1) e.landed = 0; } },
      charge: { d: 100, tele: 35, hb: [A(35, 85, 50, -60, 55, 13, 35, 60, 70)], go: (e, t) => { if (t >= 35 && t < 85) { e.vx = e.face * 11; if (t % 3 === 0) FX.dust(e.x - e.face * 30, e.y); } else e.vx *= 0.85; if (t === 35) Audio2.play('swing'); } },
      waves: { d: 90, tele: 30, go: (e, t) => { if (t === 30 || t === 50 || t === 70) { spawnProj('swordwave', e, e.x + e.face * 60, e.y - 50 - (t === 50 ? 60 : 0), e.face * 8, 0, { team: 1, dmg: 10 * World.diff.dmg }); Audio2.play('shoot'); } } },
      summon: { d: 60, tele: 30, go: (e, t) => { if (t === 30) for (const dx of [-200, 200]) { spawnEnemy('shade', e.x + dx, e.y - 10, { minion: 1 }); FX.portal(e.x + dx, e.y - 25); } } },
    },
    ai(e, T) { bossStep(e, T); } },
  matriarch: { name: 'Hive Matriarch', boss: 1, fly: 1, w: 110, h: 80, hp: 760, weight: 999, col: '#3a2a20', eye: '#ffe14a',
    pattern: e => e.hp < e.maxHp * 0.5 ? ['volley', 'dive', 'rain', 'eggs', 'volley', 'dive'] : ['volley', 'dive', 'eggs', 'volley', 'dive'],
    rest: e => e.hp < e.maxHp * 0.5 ? 30 : 50,
    idle(e, T) { const B = World.barriers; const cx = B ? (B.l + B.r) / 2 : T.x; const tx = cx + Math.sin(e.t / 90) * 300, ty = T.y - 230; e.vx += clamp((tx - e.x) * 0.004, -0.3, 0.3); e.vy += clamp((ty - e.y) * 0.006, -0.3, 0.3); e.vx *= 0.95; e.vy *= 0.95; e.face = sign(T.dx) || e.face; },
    atks: {
      volley: { d: 70, tele: 30, go: (e, t, T) => { e.vx *= 0.9; e.vy *= 0.9; if (T && (t === 30 || t === 45)) { const a0 = Math.atan2(T.dy + 30, T.dx); for (let i = -2; i <= 2; i++) { const a = a0 + i * 0.18; spawnProj('stinger', e, e.x, e.y - 40, Math.cos(a) * 7, Math.sin(a) * 7, { team: 1, dmg: 6 * World.diff.dmg }); } Audio2.play('shoot'); } } },
      dive: { d: 100, tele: 36, hb: [A(36, 70, 0, -40, 55, 13, 60, 55, 70)], go: (e, t, T) => { if (t === 36 && T) { const m = Math.hypot(T.dx, T.dy) || 1; e.dvx = T.dx / m * 12; e.dvy = T.dy / m * 12; Audio2.play('swing'); } if (t >= 36 && t < 70) { e.vx = e.dvx; e.vy = e.dvy; if (solidAt(e.x, e.y + 4)) { e.dvy = -Math.abs(e.dvy) * 0.5; World.shake(6); } } else { e.vx *= 0.9; e.vy = e.vy * 0.9 - (t > 70 ? 0.3 : 0); } } },
      eggs: { d: 70, tele: 30, go: (e, t) => { if (t === 30 && World.enemies.filter(x => x.type === 'hopper' && !x.dead).length < 4) for (let i = 0; i < 3; i++) spawnProj('egg', e, e.x + (i - 1) * 30, e.y - 10, (i - 1) * 2.5, -3, { team: 1 }); } },
      rain: { d: 110, tele: 30, go: (e, t) => { const B = World.barriers; if (B && t >= 30 && t % 6 === 0) spawnProj('stinger', e, rr(B.l + 20, B.r - 20), World.cam.y - 420, 0, 7, { team: 1, dmg: 6 * World.diff.dmg }); } },
    },
    ai(e, T) { bossStep(e, T); } },
  crown: { name: 'The Hollow Crown', boss: 1, fly: 1, w: 100, h: 100, hp: 1250, weight: 999, col: '#120a1f', eye: '#ff3cd5',
    phase: e => e.hp > e.maxHp * 0.66 ? 1 : e.hp > e.maxHp * 0.33 ? 2 : 3,
    pattern: e => { const p = BOSS.crown.phase(e); return p === 1 ? ['barrage', 'aimed', 'pillars', 'barrage', 'aimed'] : p === 2 ? ['barrage', 'pillars', 'summon', 'aimed', 'quake', 'pillars'] : ['pillars', 'barrage', 'quake', 'aimed', 'summon', 'barrage', 'pillars']; },
    rest: e => [0, 50, 38, 26][BOSS.crown.phase(e)],
    onHurt(e) { const p = BOSS.crown.phase(e); if (p !== e.lastPhase) { if (e.lastPhase) { FX.text(e.x, e.y - 140, 'PHASE ' + p, '#ff3cd5', 26); World.shake(14); Audio2.play('ko'); e.cd = 60; e.atk = null; } e.lastPhase = p; } },
    idle(e, T) { const B = World.barriers; const cx = B ? (B.l + B.r) / 2 : T.x; const tx = cx + Math.sin(e.t / 120) * 260, ty = (World.stage.arenaFloor || T.y) - 260 + Math.cos(e.t / 70) * 40; e.vx += clamp((tx - e.x) * 0.004, -0.25, 0.25); e.vy += clamp((ty - e.y) * 0.005, -0.25, 0.25); e.vx *= 0.95; e.vy *= 0.95; },
    atks: {
      barrage: { d: 80, tele: 30, go: (e, t) => { e.vx *= 0.9; e.vy *= 0.9; const p = BOSS.crown.phase(e); if (t === 30 || (p >= 2 && t === 50) || (p >= 3 && t === 70)) { const n = 10 + p * 2, off = t / 30; for (let i = 0; i < n; i++) { const a = i / n * TAU + off; spawnProj('shard', e, e.x, e.y - 50, Math.cos(a) * 5, Math.sin(a) * 5, { team: 1, dmg: 8 * World.diff.dmg }); } Audio2.play('shoot'); } } },
      aimed: { d: 80, tele: 20, go: (e, t) => { if (t >= 20 && t <= 60 && t % 10 === 0) { for (const p of World.players) { if (p.dead || p.out) continue; const dx = p.x - e.x, dy = p.y - 30 - (e.y - 50), m = Math.hypot(dx, dy) || 1; spawnProj('shard', e, e.x, e.y - 50, dx / m * 9, dy / m * 9, { team: 1, dmg: 8 * World.diff.dmg }); } Audio2.play('shoot'); } } },
      pillars: { d: 100, tele: 10, go: (e, t) => { if (t === 10) { const xs = []; for (const p of World.players) if (!p.dead && !p.out) xs.push(p.x); const B = World.barriers; const ph = BOSS.crown.phase(e); for (let i = 0; i < ph; i++) if (B) xs.push(rr(B.l + 40, B.r - 40)); for (const x of xs) spawnProj('pillar', e, x, World.stage.arenaFloor || e.y + 200, 0, 0, { team: 1, dmg: 14 * World.diff.dmg }); } } },
      quake: { d: 70, tele: 30, go: (e, t) => { if (t === 30) { const gy = World.stage.arenaFloor; const B = World.barriers; if (B && gy) { spawnProj('eshock', e, B.l + 20, gy - 10, 7, 0, { life: 140 }); spawnProj('eshock', e, B.r - 20, gy - 10, -7, 0, { life: 140 }); } World.shake(10); Audio2.play('boom'); } } },
      summon: { d: 60, tele: 30, go: (e, t) => { if (t === 30) { const B = World.barriers; for (let i = 0; i < 2; i++) { const ty = pick(['shade', 'bomber', 'rival', 'hopper', 'lancer']); const x = B ? rr(B.l + 60, B.r - 60) : e.x; spawnEnemy(ty, x, (World.stage.arenaFloor || e.y) - 200, { minion: 1 }); FX.portal(x, (World.stage.arenaFloor || e.y) - 220); } Audio2.play('portal'); } } },
    },
    ai(e, T) { bossStep(e, T); } },
};
PROJ.pillar = { r: 36, life: 80, dmg: 14, a: 90, bkb: 60, kbg: 55, pierce: 99, column: 1, delay: 50 };

// --- Items ---
const FOODS = [
  { n: 'apple', heal: 8, w: 5 }, { n: 'drumstick', heal: 12, w: 4 }, { n: 'riceball', heal: 10, w: 4 }, { n: 'cake', heal: 15, w: 3 },
  { n: 'pizza', heal: 14, w: 3 }, { n: 'feast', heal: 30, w: 1 }, { n: 'heart', heal: 60, w: 0.35 },
];
function rollFood() { const tot = FOODS.reduce((a, f) => a + f.w, 0); let r = rnd() * tot; for (let i = 0; i < FOODS.length; i++) { r -= FOODS[i].w; if (r <= 0) return i; } return 0; }
function spawnItem(type, x, y, o = {}) { World.items.push({ type, x, y, vy: -4, t: 0, id: World.uid++, kind: o.kind ?? (type === 'food' ? rollFood() : 0) }); }
function updateItems() {
  for (const it of World.items) {
    it.t++; it.vy = Math.min(8, it.vy + 0.4); const g = groundBelow(it.x, it.y - 4, 20); if (g !== null && it.y + it.vy >= g) { it.y = g; it.vy = 0; } else it.y += it.vy;
    for (const p of World.players) {
      if (p.dead || p.out) continue;
      if (Math.abs(p.x - it.x) < 26 && Math.abs(p.y - 20 - it.y) < 40) {
        it.gone = 1;
        if (it.type === 'food') { const F = FOODS[it.kind] || FOODS[0]; const h = Math.min(p.pct, F.heal); p.pct = Math.max(0, p.pct - F.heal); FX.text(p.x, p.y - 70, '-' + Math.round(h) + '%', '#7dff8a', F.heal >= 30 ? 22 : 16); FX.burst(it.x, it.y - 10, '#7dff8a', 8); Audio2.play('heal'); }
        if (it.type === 'chest') { Game.chestBoon(p); }
        break;
      }
    }
    if (it.t > 1500 && it.type === 'food') it.gone = 1;
  }
  World.items = World.items.filter(i => !i.gone);
}

// ---------- RIVALS: player-sized shadow fighters that use the real movesets ----------
const RIVAL_NAMES = ['Shadow Rook', 'Shadow Vela', 'Shadow Pip', 'Shadow Grom'];
class Rival extends Fighter {
  constructor(fid, x, y, o = {}) {
    super(FIGHTERS[fid], -1, { cur: new InputSource('none').blank() });
    this.team = 1; this.isRival = 1; this.fid = fid; this.type = 'rival' + fid; this.x = x; this.y = y; this.minion = o.minion; this.elite = null;
    this.spawnT = o.spawn ? 40 : 0; this.dying = 0; this.boss = false; this.flash = 0; this.hitSet = new Set();
    const idx = Game.run ? Game.run.idx : 0;
    this.limit = Math.round((120 + idx * 9) * (World.diff.hp > 1.5 ? 1.15 : 1));
    this.mods.dmg = 0.8 + idx * 0.035; this.mods.speed = 0.9 + Math.min(0.15, idx * 0.012);
    this.ai = { cd: 40 + ri(0, 40), shieldT: 0, react: Math.max(6, 22 - idx * 1.2), jumpCD: 0, hold: 0, plan: null };
    this.def = FIGHTERS[fid]; this.face = -1; this.state = 'air'; this.air = 1;
  }
  get hp() { return Math.max(0, this.limit - this.pct); }
  set hp(v) { }
  get maxHp() { return this.limit; }
  set maxHp(v) { }
  update() {
    if (this.dead) return;
    if (this.pct >= this.limit) { this.collapse(); return; }
    if (this.spawnT > 0) { this.spawnT--; this.physics(); return; }
    if (this.asleep) { const p = World.players.find(q => !q.dead && !q.out && Math.abs(q.x - this.x) < 760); if (!p) { this.physics(); return; } this.asleep = false; }
    if (this.flash > 0) this.flash--;
    this.think();
    super.update();
    if (this.pct >= this.limit && !this.dead) this.collapse();
  }
  think() {
    const o = new InputSource('none').blank(); o.kb = 1; this.input.cur = o;
    const A = this.ai; if (A.cd > 0) A.cd--; if (A.jumpCD > 0) A.jumpCD--;
    if (this.hitlag > 0) return;
    let T = null, bd = 1e9; for (const p of World.players) { if (p.dead || p.out) continue; const d = Math.abs(p.x - this.x) + Math.abs(p.y - this.y); if (d < bd) { bd = d; T = p; } }
    if (!T) return;
    const dx = T.x - this.x, dy = T.y - this.y, ad = Math.abs(dx), dir = sign(dx) || this.face;
    const reach = 60 * this.def.mul.reach;
    // recovery
    if (this.air && this.state !== 'hitstun' && groundBelow(this.x, this.y, 700) === null) {
      const B = World.barriers; const home = B ? (B.l + B.r) / 2 : T.x; o.mx = sign(home - this.x);
      if (this.vy > 1 && this.jumps > 0 && this.sf > 6) o.jp = 1;
      else if (this.jumps === 0 && this.vy > 1 && this.state === 'air') { o.my = -1; o.bp = 1; }
      return;
    }
    if (this.state === 'hitstun') { o.mx = -dir * (rnd() < 0.7 ? 1 : 0); o.my = -0.6; return; }
    if (this.state === 'ledge') { if (this.sf > 14) { if (rnd() < 0.5) o.jp = 1; else o.my = -1; } return; }
    if (this.state === 'helpless') { o.mx = sign(((World.barriers ? (World.barriers.l + World.barriers.r) / 2 : T.x)) - this.x); return; }
    // holding shield
    if (A.shieldT > 0) { A.shieldT--; o.s = 1; if (A.shieldT === 0 && rnd() < 0.4 && ad < reach) { o.ap = 1; o.a = 1; } return; }
    // react to a threat with shield / dodge
    const threat = T.state === 'move' && T.hitboxes().length && ad < 110 && Math.abs(dy) < 70;
    if (threat && !this.air && this.actionable() && rnd() < 0.08 + Game.run.idx * 0.008) { if (rnd() < 0.7) { A.shieldT = 14 + ri(0, 10); o.s = 1; } else { o.s = 1; o.sp = 1; o.mx = -dir; o.flick = -dir; } return; }
    if (!this.actionable()) return;
    // movement
    const ranged = this.fid === 1 || this.fid === 2 || this.fid === 3;
    if (ad > reach * 0.9) {
      o.mx = dir;
      if (!this.air) { const ahead = groundBelow(this.x + dir * 34, this.y - 4, 90); if (ahead === null && dy <= 20) o.mx = 0; }
      if (!this.air && A.jumpCD <= 0 && ((dy < -70 && ad < 260) || (Math.abs(this.vx) < 0.5 && o.mx && solidAt(this.x + dir * 24, this.y - 20)))) { o.jp = 1; o.j = 1; A.jumpCD = 50; }
    } else if (ad < reach * 0.4 && rnd() < 0.05) o.mx = -dir;
    if (A.cd > 0) return;
    // ranged poke
    if (ranged && !this.air && ad > 170 && ad < 460 && Math.abs(dy) < 60 && rnd() < 0.03) { this.face = dir; o.mx = 0; o.bp = 1; A.cd = 70; return; }
    if (this.air) {
      if (ad < reach * 1.2 && Math.abs(dy) < 80) {
        if (dy < -35) { o.my = -1; } else if (dy > 35) { o.my = 1; } else if (dir === this.face) { o.mx = dir; } else { o.mx = dir; }
        o.ap = 1; o.a = 1; A.cd = 26 + ri(0, 18) - Math.min(10, Game.run.idx); return;
      }
      return;
    }
    if (dy < -60 && ad < 70) { o.my = -1; o.ap = 1; o.a = 1; if (rnd() < 0.3) o.m = 1; A.cd = 34; return; }
    if (ad < reach && Math.abs(dy) < 45) {
      const r = rnd(); this.face = dir;
      if (r < 0.28) { o.ap = 1; o.a = 1; }
      else if (r < 0.5) { o.mx = dir * 0.7; o.ap = 1; o.a = 1; }
      else if (r < 0.62) { o.my = 1; o.ap = 1; o.a = 1; }
      else if (r < 0.8) { o.mx = dir; o.ap = 1; o.a = 1; o.m = 1; }
      else if (r < 0.88) { o.my = 1; o.ap = 1; o.a = 1; o.m = 1; }
      else { o.mx = dir; o.bp = 1; }
      A.cd = 30 + ri(0, 26) - Math.min(14, Game.run.idx * 1.2); return;
    }
    if (ad < 240 && rnd() < 0.03 && A.jumpCD <= 0) { o.jp = 1; o.j = 1; o.mx = dir; A.jumpCD = 40; }
  }
  hitboxes() {
    if (this.dead || this.spawnT > 0) return [];
    return super.hitboxes().filter(b => !b.h.orb).map(b => {
      const h = b.h; let d = h.d * this.mods.dmg * (this.move && this.move.smash ? 1 + 0.45 * this.chg : 1); if (h.chg) d += h.chg * this.chg;
      return { x: b.x, y: b.y, r: b.r, d, a: h.a, bkb: h.bkb + (h.chgKb || 0) * this.chg, kbg: h.kbg, key: b.key, fx: h.fx || h.el, el: h.el };
    });
  }
  takeHit(info) {
    if (this.dead || this.spawnT > 0) return null;
    const r = super.takeHit(info);
    if (r === 'hit' || r === 'armor') { this.flash = 4; FX.text(info.x, info.y - 10, Math.round(info.dmg), '#fff', 12 + Math.min(10, info.dmg / 2)); return 'hit'; }
    return r;
  }
  hurtRaw(d) { if (this.dead) return; this.pct += d; FX.text(this.x, this.y - 70, Math.round(d), '#bfe3ff', 12); }
  ko() {
    if (this.dead) return;
    FX.ko(this.x, this.y, this.def.color); Audio2.play('ko'); FX.text(this.x, this.y - 40, 'KO!', '#ffde3c', 22); World.shake(10);
    this.finish();
  }
  collapse() { FX.text(this.x, this.y - 80, 'BROKEN!', '#ff4fd8', 20); Audio2.play('bighit'); this.finish(); }
  finish() { this.dead = true; FX.dissolve(this.x, this.y, 56); Game.onEnemyKilled(this); if (rnd() < 0.3) spawnItem('food', this.x, this.y - 20); }
  remove() { this.finish(); }
  explode() { }
  die() { this.finish(); }
}
