// ===== WORLD, PHYSICS, COMBAT, FIGHTER, PROJECTILES, FX =====
const World = {
  stage: null, players: [], enemies: [], projs: [], items: [], barriers: null, frame: 0, shakeAmt: 0, slowT: 0, uid: 1,
  diff: { hp: 1, dmg: 1, count: 1 }, mod: {}, cam: { x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 1 },
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); },
  slowmo(n) { this.slowT = Math.max(this.slowT, n); },
  reset() { this.players = []; this.enemies = []; this.projs = []; this.items = []; this.barriers = null; },
};

// --- Collision ---
function overlapRect(ax, ay, aw, ah, b) { return ax < b.x + b.w && ax + aw > b.x && ay < b.y + b.h && ay + ah > b.y; }
function circleRect(cx, cy, r, x, y, w, h) { const nx = clamp(cx, x, x + w), ny = clamp(cy, y, y + h); return (cx - nx) ** 2 + (cy - ny) ** 2 <= r * r; }
function solidAt(x, y) { const st = World.stage; if (!st) return false; for (const s of st.solids) if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true; return false; }
function groundBelow(x, y, maxd = 200) { // returns y of ground below point or null
  const st = World.stage; let best = null;
  for (const s of st.solids) if (x >= s.x && x <= s.x + s.w && s.y >= y - 2 && s.y - y < maxd) if (best === null || s.y < best) best = s.y;
  for (const p of st.plats) if (x >= p.x && x <= p.x + p.w && p.y >= y - 2 && p.y - y < maxd) if (best === null || p.y < best) best = p.y;
  return best;
}
// body: {x (center), y (bottom), w, h, vx, vy, air, drop}
function moveBody(b, dx, dy, opt = {}) {
  const st = World.stage; const res = { wall: 0, land: false, ceil: false, plat: null };
  const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 10) || 1;
  const sx = dx / steps, sy = dy / steps;
  for (let i = 0; i < steps; i++) {
    b.x += sx;
    for (const s of st.solids) {
      if (overlapRect(b.x - b.w / 2, b.y - b.h, b.w, b.h - 1, s)) {
        if (sx > 0) b.x = s.x - b.w / 2 - 0.01; else if (sx < 0) b.x = s.x + s.w + b.w / 2 + 0.01;
        res.wall = sign(sx) || res.wall;
      }
    }
    const B = World.barriers;
    if (B && !opt.passBarrier) {
      if (b.x - b.w / 2 < B.l) { b.x = B.l + b.w / 2; res.wall = -1; res.barrier = 1; }
      if (b.x + b.w / 2 > B.r) { b.x = B.r - b.w / 2; res.wall = 1; res.barrier = 1; }
    }
    if (!opt.noWorldEdge) { if (b.x < st.x0 + b.w / 2) { b.x = st.x0 + b.w / 2; res.wall = -1; } if (b.x > st.x1 - b.w / 2) { b.x = st.x1 - b.w / 2; res.wall = 1; } }
    const py = b.y; b.y += sy;
    for (const s of st.solids) {
      if (overlapRect(b.x - b.w / 2, b.y - b.h, b.w, b.h, s)) {
        if (sy > 0) { b.y = s.y; res.land = true; res.plat = s; }
        else if (sy < 0) { b.y = s.y + s.h + b.h; res.ceil = true; }
      }
    }
    if (sy >= 0 && !b.drop) {
      for (const p of st.plats) {
        if (py <= p.y + 0.5 && b.y >= p.y && b.x + b.w / 2 > p.x && b.x - b.w / 2 < p.x + p.w) { b.y = p.y; res.land = true; res.plat = p; }
      }
    }
  }
  return res;
}
function onGround(b) { // probe 1px below
  const st = World.stage;
  for (const s of st.solids) if (b.x + b.w / 2 > s.x && b.x - b.w / 2 < s.x + s.w && Math.abs(b.y - s.y) < 1.5) return s;
  if (!b.drop) for (const p of st.plats) if (b.x + b.w / 2 > p.x && b.x - b.w / 2 < p.x + p.w && Math.abs(b.y - p.y) < 1.5) return p;
  return null;
}

// --- Knockback (Smash-style) ---
function calcKB(p, d, w, bkb, kbg) { return ((((p / 10 + p * d / 20) * (200 / (w + 100)) * 1.4) + 18) * (kbg / 100)) + bkb; }
const KB_SPEED = 0.105, KB_DECAY = 0.2;

function hitlagFor(d) { return Math.min(18, Math.floor(d * 0.45 + 4)); }

// --- Fighter (player) ---
class Fighter {
  constructor(def, slot, input) {
    this.def = def; this.slot = slot; this.input = input; this.id = World.uid++; this.team = 0;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.kx = 0; this.ky = 0; this.w = 22; this.h = 56;
    this.face = 1; this.air = 1; this.state = 'air'; this.sf = 0; this.move = null; this.mf = 0; this.mft = 0;
    this.pct = 0; this.hitstun = 0; this.hitlag = 0; this.intang = 0; this.shieldHP = 50; this.jumps = def.stats.jumps;
    this.chg = 0; this.chgT = 0; this.hitSet = new Set(); this.mid = 0; this.ledge = null; this.ledgeCD = 0; this.drop = 0;
    this.out = false; this.dead = false; this.respawnT = 0; this.usedAir = {}; this.adodged = 0; this.ff = 0; this.lastFlick = { x: 0, y: 0, t: -99 };
    this.boons = []; this.mods = { dmg: 1, kb: 1, take: 1, weight: 0, speed: 1, jumps: 0, shield: 1, spec: 1, smash: 1, smashChg: 1, steal: 0, thorns: 0, atk: 1, exec: 0, meteor: 0, phoenix: 0, chain: 0, orb: 0, landShock: 0, size: 1, aerial: 1, lagMul: 1 };
    this.phoenixUsed = false; this.jabNext = null; this.jabT = 0; this.kos = 0; this.dmgDealt = 0; this.tumble = 0; this.hammerOut = null; this.orbA = 0;
    this.inp = new InputSource('none').blank(); this.lastHitBy = null; this.counterD = 0; this.fallStart = 0;
  }
  get st() { return this.def.stats; }
  get maxJumps() { return this.st.jumps + this.mods.jumps; }
  get weight() { return this.st.weight + this.mods.weight; }
  setMove(name) {
    const mv = this.def.moves[name]; if (!mv) return;
    this.move = mv; this.mf = 0; this.mft = 0; this.state = 'move'; this.hitSet.clear(); this.mid++; this.chg = 0; this.chgT = 0;
    if (mv.airOnce && this.air) this.usedAir[name] = 1;
    if (!mv.special && !mv.jab) Audio2.play('swing');
  }
  teleport(x, y) {
    const ox = this.x, oy = this.y; this.x = x; this.y = y;
    // ensure not inside a solid; step back toward origin
    for (let i = 0; i < 20 && this.insideSolid(); i++) { this.x = lerp(this.x, ox, 0.15); this.y = lerp(this.y, oy, 0.15); }
    const B = World.barriers; if (B) this.x = clamp(this.x, B.l + 12, B.r - 12);
  }
  insideSolid() { for (const s of World.stage.solids) if (overlapRect(this.x - this.w / 2, this.y - this.h, this.w, this.h, s)) return true; return false; }
  actionable() { return ['idle', 'run', 'crouch', 'air', 'land0'].includes(this.state); }
  update() {
    if (this.out) return;
    if (this.dead) { this.respawnT--; if (this.respawnT <= 0) this.respawn(); return; }
    const inp = this.inp = this.input.cur;
    if (inp.flick) this.lastFlick = { x: inp.flick, y: 0, t: World.frame };
    if (inp.flickY) this.lastFlick = { x: 0, y: inp.flickY, t: World.frame };
    if (this.hitlag > 0) { this.hitlag--; return; }
    this.sf++; tickStatus(this); if (this.intang > 0) this.intang--; if (this.ledgeCD > 0) this.ledgeCD--; if (this.drop > 0) this.drop--; if (this.jabT > 0) this.jabT--;
    const st = this.st, spd = this.mods.speed;
    if (this.state !== 'shield') this.shieldHP = Math.min(50 * this.mods.shield, this.shieldHP + 0.12);
    // orbit orb boon
    if (this.mods.orb) this.orbA += 0.08;
    const smashDir = this.smashInput(inp);

    switch (this.state) {
      case 'idle': case 'run': case 'crouch': {
        if (this.air) { this.state = 'air'; break; }
        if (this.groundAttack(inp, smashDir)) break;
        if (inp.jp || (!inp.kb && inp.flickY === -1)) { this.state = 'squat'; this.sf = 0; break; }
        if (inp.s) { this.state = 'shield'; this.sf = 0; Audio2.play('shield'); break; }
        if (inp.my > 0.6) {
          if (this.state !== 'crouch') { this.state = 'crouch'; this.sf = 0; }
          if (this.plat && !this.plat.solid && (inp.flickY === 1 || (this.sf > 12 && inp.my > 0.85))) { this.drop = 12; this.y += 3; this.air = 1; this.state = 'air'; this.sf = 0; }
          this.vx *= 0.8;
        } else {
          if (Math.abs(inp.mx) > 0.2) { this.state = 'run'; this.face = sign(inp.mx); const t = inp.mx * st.run * spd; this.vx += clamp(t - this.vx, -st.acc * 1.5, st.acc * 1.5); if (this.sf % 12 === 0) FX.dust(this.x - this.face * 8, this.y); }
          else { this.state = 'idle'; this.vx *= 0.78; }
        }
        break;
      }
      case 'squat': this.vx *= 0.9; if (this.sf >= 4) { const full = inp.j || (!inp.kb && inp.my < -0.5); this.vy = -(full ? st.jump : st.jump * 0.68); this.air = 1; this.state = 'air'; this.sf = 0; Audio2.play('jump'); FX.dust(this.x, this.y); } break;
      case 'land0': this.vx *= 0.8; if (this.sf >= 3) this.state = 'idle'; else if (this.groundAttack(inp, smashDir)) { } break;
      case 'land': this.vx *= 0.82; if (this.sf >= this.landLag) this.state = 'idle'; break;
      case 'air': {
        if (!this.air) { this.toLand(3); break; }
        if (this.airAttack(inp, smashDir)) break;
        if ((inp.jp || (!inp.kb && inp.flickY === -1 && this.sf > 6)) && this.jumps > 0) { this.jumps--; this.vy = -st.djump; this.vx = inp.mx * st.air * spd; this.ff = 0; Audio2.play('jump'); FX.ring(this.x, this.y, 18, '#ffffff'); this.sf = 0; break; }
        if (inp.sp && !this.adodged) { this.startAirDodge(inp); break; }
        this.airDrift(inp);
        if (this.vy > 0 && inp.flickY === 1) this.ff = 1;
        break;
      }
      case 'helpless': this.airDrift(inp, 0.6); if (!this.air) this.toLand(14); break;
      case 'move': this.updateMove(inp); break;
      case 'shield': {
        this.vx *= 0.8; this.shieldHP -= 0.18;
        if (this.shieldHP <= 0) { this.shieldBreak(); break; }
        if (this.air) { this.state = 'air'; break; }
        if (inp.jp || (!inp.kb && inp.flickY === -1)) { this.state = 'squat'; this.sf = 0; break; }
        if (inp.flick || (inp.kb && Math.abs(inp.mx) > 0.5 && this.sf > 2 && this.sf < 99 && (inp.flick || this.prevMx === 0))) { const d = sign(inp.mx || inp.flick); this.state = 'roll'; this.sf = 0; this.rollDir = d; this.face = -d; break; }
        if (inp.flickY === 1 || (inp.kb && inp.my > 0.5 && !this.prevMy)) { this.state = 'spot'; this.sf = 0; break; }
        if (inp.ap && this.sf > 2) { this.setMove(Math.abs(inp.mx) > 0.3 ? 'ftilt' : 'jab1'); break; } // shield-drop attack
        if (!inp.s) { this.state = 'land'; this.landLag = 6; this.sf = 0; }
        break;
      }
      case 'roll': { const t = this.sf; this.intang = t > 3 && t < 18 ? 2 : this.intang; this.vx = t < 20 ? this.rollDir * 6.2 : this.vx * 0.7; if (t >= 28) { this.state = 'idle'; } if (this.air) this.state = 'air'; break; }
      case 'spot': { this.vx *= 0.7; this.intang = this.sf > 2 && this.sf < 18 ? 2 : this.intang; if (this.sf >= 26) this.state = 'idle'; break; }
      case 'adodge': {
        const t = this.sf; this.intang = t > 2 && t < 22 ? 2 : this.intang;
        if (this.adDir) { this.vx *= 0.9; this.vy *= 0.9; } else { this.vx *= 0.95; }
        if (!this.air) { this.toLand(this.adDir ? 10 : 4); break; }
        if (t >= 34) { this.state = 'air'; this.sf = 0; }
        break;
      }
      case 'shieldbreak': { this.vx *= 0.9; if (this.sf % 20 === 0) FX.text(this.x, this.y - 70, '?!', '#ffe14a', 14); if (this.sf >= 150) { this.state = 'idle'; this.shieldHP = 25; } break; }
      case 'hitstun': {
        this.hitstun--;
        if (this.hitstun <= 0) { this.state = this.air ? 'air' : 'idle'; this.sf = 0; this.tumble = 0; }
        if (this.air && this.hitstun < 10) this.airDrift(inp, 0.5);
        break;
      }
      case 'ledge': this.updateLedge(inp); break;
    }
    this.prevMx = inp.mx; this.prevMy = inp.my;
    if (this.state !== 'ledge') this.physics();
  }
  smashInput(inp) {
    // returns direction string or null for a smash attack this frame
    if (inp.cp && !this.air) { if (Math.abs(inp.cy) > Math.abs(inp.cx)) return inp.cy < 0 ? 'u' : 'd'; return inp.cx > 0 ? 'r' : 'l'; }
    if (inp.ap) {
      const recent = World.frame - this.lastFlick.t <= 4;
      if (inp.m || (!inp.kb && recent)) {
        let dx = inp.mx, dy = inp.my; if (recent && !inp.kb) { dx = this.lastFlick.x || dx; dy = this.lastFlick.y || dy; }
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 0.4) return dy < 0 ? 'u' : 'd';
        if (Math.abs(dx) > 0.4) return dx > 0 ? 'r' : 'l';
        if (inp.m) return this.face > 0 ? 'r' : 'l';
      }
    }
    if (inp.mp && !inp.ap) { const dx = inp.mx, dy = inp.my; if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 0.4) return dy < 0 ? 'u' : 'd'; if (Math.abs(dx) > 0.3) return dx > 0 ? 'r' : 'l'; return this.face > 0 ? 'r' : 'l'; }
    return null;
  }
  groundAttack(inp, smashDir) {
    if (smashDir) { if (smashDir === 'u') this.setMove('usmash'); else if (smashDir === 'd') this.setMove('dsmash'); else { this.face = smashDir === 'r' ? 1 : -1; this.setMove('fsmash'); } this.vx *= 0.3; return true; }
    if (inp.bp) return this.special(inp);
    if (inp.ap) {
      if (this.state === 'run' && Math.abs(this.vx) > this.st.run * 0.75 && Math.abs(inp.mx) > 0.6) { this.setMove('dash'); return true; }
      if (inp.my < -0.5) this.setMove('utilt');
      else if (inp.my > 0.5) this.setMove('dtilt');
      else if (Math.abs(inp.mx) > 0.5) { this.face = sign(inp.mx); this.setMove('ftilt'); this.vx *= 0.3; }
      else { const nm = this.jabT > 0 && this.jabNext ? this.jabNext : 'jab1'; this.setMove(nm); this.vx *= 0.3; }
      return true;
    }
    return false;
  }
  airAttack(inp, smashDir) {
    let dir = null;
    if (inp.cp) { dir = Math.abs(inp.cy) > Math.abs(inp.cx) ? (inp.cy < 0 ? 'u' : 'd') : (sign(inp.cx) === this.face ? 'f' : 'b'); }
    else if (inp.ap || inp.mp) { const dx = inp.mx, dy = inp.my; if (Math.abs(dy) > 0.5 && Math.abs(dy) >= Math.abs(dx)) dir = dy < 0 ? 'u' : 'd'; else if (Math.abs(dx) > 0.5) dir = sign(dx) === this.face ? 'f' : 'b'; else dir = 'n'; }
    if (dir) { this.setMove({ n: 'nair', f: 'fair', b: 'bair', u: 'uair', d: 'dair' }[dir]); return true; }
    if (inp.bp) return this.special(inp);
    return false;
  }
  special(inp) {
    let nm = 'nspec';
    if (inp.my < -0.5 && Math.abs(inp.my) >= Math.abs(inp.mx) * 0.8) nm = 'uspec';
    else if (inp.my > 0.5 && Math.abs(inp.my) >= Math.abs(inp.mx)) nm = 'dspec';
    else if (Math.abs(inp.mx) > 0.5) { nm = 'sspec'; this.face = sign(inp.mx); }
    const mv = this.def.moves[nm];
    if (mv.airOnce && this.air && this.usedAir[nm]) return false;
    if (nm === 'nspec' && this.def.id === 3 && this.hammerOut) return false;
    if (this.air && mv.airTo) nm = mv.airTo;
    this.setMove(nm); return true;
  }
  startAirDodge(inp) {
    this.state = 'adodge'; this.sf = 0; this.adodged = 1; const m = Math.hypot(inp.mx, inp.my);
    if (m > 0.4) { this.adDir = 1; this.vx = inp.mx / m * 9; this.vy = inp.my / m * 9; } else { this.adDir = 0; this.vy = Math.min(this.vy, 1); }
  }
  airDrift(inp, k = 1) {
    const st = this.st, mx = inp.mx, max = st.air * this.mods.speed;
    if (Math.abs(mx) > 0.15) { const t = mx * max; if ((t > 0 && this.vx < t) || (t < 0 && this.vx > t)) this.vx += clamp(t - this.vx, -st.aacc * k, st.aacc * k); }
    else this.vx *= 0.985;
  }
  updateMove(inp) {
    const mv = this.move;
    // hold / charge
    const holdAt = mv.charge ?? (mv.hold && mv.hold.at);
    if (holdAt !== undefined && this.mf === holdAt) {
      const held = mv.charge ? (inp.a || inp.m || Math.hypot(inp.cx, inp.cy) > 0.5) : inp[mv.hold.btn];
      const max = mv.charge ? 60 : mv.hold.max;
      if (held && this.chgT < max) { this.chgT += mv.charge ? this.mods.smashChg : 1; this.chg = Math.min(1, this.chgT / max); if (this.chgT % 6 === 0) { FX.spark(this.x + rr(-14, 14), this.y - rr(10, 60), '#fff6a0'); Audio2.play('charge', this.chg); } if (!this.air) this.vx *= 0.85; else this.vy = Math.min(this.vy, 1.5); if (inp.sp && mv.hold) { this.state = this.air ? 'air' : 'idle'; this.move = null; } return; }
    }
    // counter window
    const sp = mv.special ? 1 : this.mods.atk;
    this.mft += sp; const prev = this.mf; this.mf = Math.floor(this.mft);
    for (let t = prev + 1; t <= this.mf; t++) if (mv.go) { mv.go(this, t); if (this.move !== mv) return; }
    if (!mv.go && this.mf > prev) { }
    if (mv.dash) { if (this.mf < 18) this.vx = this.face * Math.max(Math.abs(this.vx) * 0.97, 3); }
    if (mv.jab && this.mf >= 4) { this.jabNext = mv.jab === 1 ? 'jab2' : 'jab3'; this.jabT = 18; }
    if (!this.air && !mv.air && !mv.special && !mv.dash) this.vx *= 0.82;
    if (this.air && !mv.special) this.airDrift(inp, 0.8);
    if (mv.air && this.vy > 0 && inp.flickY === 1) this.ff = 1;
    if (mv.air && !this.air) { // landed during aerial
      this.toLand(Math.round((mv.lag || 6) * this.mods.lagMul)); return;
    }
    if (mv.untilLand && !this.air && this.mf > 8) { if (mv.land) this.setMove(mv.land); else this.toLand(10); return; }
    if (this.mf >= mv.d) {
      this.move = null;
      if (mv.helpless && this.air) { this.state = 'helpless'; } else this.state = this.air ? 'air' : (mv.crouchEnd && inp.my > 0.5 ? 'crouch' : 'idle');
      this.sf = 0;
    }
    if (mv.untilLand && this.mf >= mv.d - 1 && this.air) this.mft = mv.d - 2; // keep falling
  }
  toLand(lag) { this.state = lag <= 3 ? 'land0' : 'land'; this.landLag = lag; this.sf = 0; this.move = null; Audio2.play('land'); FX.dust(this.x, this.y); }
  shieldBreak() { this.state = 'shieldbreak'; this.sf = 0; this.vy = -9; this.air = 1; this.shieldHP = 0; FX.burst(this.x, this.y - 30, '#9ae7ff', 20); Audio2.play('bighit'); }
  physics() {
    const st = this.st;
    const g = st.grav * (World.mod.lowgrav ? 0.6 : 1);
    if (this.air) {
      const noGrav = this.state === 'adodge' && this.adDir && this.sf < 14;
      if (!noGrav) this.vy += g;
      const maxF = this.ff ? st.ffall : st.fall; if (this.ff && this.vy > 0) this.vy = Math.max(this.vy, st.ffall * 0.9);
      if (this.vy > maxF) this.vy = maxF;
      if (World.mod.wind) this.vx += World.mod.wind * 0.04;
    }
    // knockback decay
    const km = Math.hypot(this.kx, this.ky);
    if (km > 0) { const nm = Math.max(0, km - KB_DECAY); this.kx *= nm / km; this.ky *= nm / km; }
    if (this.state === 'hitstun' && km > 8 && World.frame % 2 === 0) FX.trail(this.x - this.kx, this.y - 30 - this.ky, km > 14 ? 'rgba(255,120,60,0.6)' : 'rgba(90,90,100,0.45)', 5 + km * 0.3);
    const passB = this.state === 'hitstun' && km > 13;
    const wasAir = this.air; const vyBefore = this.vy + this.ky;
    const r = moveBody(this, this.vx + this.kx, this.vy + this.ky, { passBarrier: passB, noWorldEdge: passB });
    if (r.wall) { if (this.state === 'hitstun' && Math.abs(this.kx) > 6) { this.kx *= -0.5; FX.burst(this.x + r.wall * 10, this.y - 30, '#fff', 6); } else { this.kx = 0; } this.vx = 0; }
    if (r.ceil) { this.vy = Math.max(0, this.vy); this.ky = Math.max(0, this.ky) * 0.5; }
    if (r.land) {
      if (this.state === 'hitstun' && vyBefore > 6 && km > 8) { this.ky = -Math.abs(this.ky) * 0.5; this.vy = 0; FX.dust(this.x, this.y); World.shake(3); }
      else {
        this.vy = 0; this.ky = 0; this.plat = r.plat;
        if (wasAir) { this.air = 0; this.jumps = this.maxJumps; this.adodged = 0; this.usedAir = {}; this.ff = 0; if (this.mods.landShock && this.y - this.fallStart > 120) this.landShock(); }
      }
    } else {
      const gp = onGround(this);
      if (gp && this.vy + this.ky >= 0) { this.plat = gp; if (this.air) { this.air = 0; this.jumps = this.maxJumps; this.adodged = 0; this.usedAir = {}; this.ff = 0; } }
      else { if (!this.air) this.fallStart = this.y; this.air = 1; this.plat = null; }
    }
    if (!this.air) this.fallStart = this.y; else this.fallStart = Math.min(this.fallStart, this.y);
    // ledge grab
    if (this.air && this.ledgeCD === 0 && ['air', 'helpless', 'move'].includes(this.state) && this.vy >= -1 && !(this.state === 'move' && !this.move.helpless && !this.move.untilLand)) this.tryLedge();
  }
  tryLedge() {
    for (const L of World.stage.ledges) {
      const hx = L.x + L.dir * 10;
      if (Math.abs(this.x - hx) < 18 && this.y - 66 < L.y && this.y - 30 > L.y) {
        if (World.players.some(p => p !== this && p.state === 'ledge' && p.ledge === L)) continue;
        this.state = 'ledge'; this.ledge = L; this.sf = 0; this.move = null; this.face = -L.dir; this.x = L.x + L.dir * 10; this.y = L.y + 50;
        this.vx = this.vy = this.kx = this.ky = 0; this.intang = 40; this.jumps = this.maxJumps; this.adodged = 0; this.usedAir = {}; this.ff = 0; Audio2.play('land'); return;
      }
    }
  }
  updateLedge(inp) {
    const L = this.ledge; this.x = L.x + L.dir * 10; this.y = L.y + 50;
    if (this.sf < 8) return;
    const toward = inp.mx * this.face > 0.5, away = inp.mx * this.face < -0.5;
    const leave = (cd = 30) => { this.ledgeCD = cd; this.ledge = null; this.air = 1; this.sf = 0; };
    if (inp.jp || (!inp.kb && inp.flickY === -1)) { leave(); this.state = 'air'; this.vy = -this.st.jump; this.vx = this.face * 1.5; Audio2.play('jump'); return; }
    if (inp.ap) { leave(); this.x = L.x - L.dir * 14; this.y = L.y; this.air = 0; this.setMove('ftilt'); this.intang = 10; return; }
    if (toward || inp.my < -0.6) { leave(); this.x = L.x - L.dir * 14; this.y = L.y; this.air = 0; this.state = 'land'; this.landLag = 10; this.intang = 10; return; }
    if (away || inp.my > 0.6 || this.sf > 300) { leave(); this.state = 'air'; this.x += L.dir * 6; return; }
  }
  landShock() { spawnProj('blast', this, this.x, this.y - 10, 0, 0, { r: 60, dmg: 8, life: 4 }); FX.ring(this.x, this.y, 70, '#ffd27a'); World.shake(4); }
  // hitboxes in world space
  hitboxes() {
    const out = [];
    if (this.state !== 'move' || this.hitlag > 0 && false) return out;
    const mv = this.move, sz = this.mods.size;
    mv.hb.forEach((h, i) => {
      if (this.mf < h.s || this.mf > h.e) return;
      let key = this.mid * 100 + i; if (h.multi) key = this.mid * 100 + 50 + Math.floor((this.mf - h.s) / h.multi);
      if (h.chg !== undefined || mv.charge || mv.hold) { }
      out.push({ x: this.x + this.face * h.x * sz, y: this.y + h.y * sz, r: h.r * sz, h, key, move: mv });
    });
    if (this.mods.orb && !this.dead) { const ox = this.x + Math.cos(this.orbA) * 46, oy = this.y - 30 + Math.sin(this.orbA) * 46; out.push({ x: ox, y: oy, r: 10, h: { d: 3, a: 60, bkb: 20, kbg: 20, orb: 1 }, key: 'orb' + Math.floor(World.frame / 30), move: null }); }
    return out;
  }
  hurt() { const sz = this.mods.size; const h = (this.state === 'crouch' ? 38 : this.h) * sz; return { x: this.x - this.w * sz / 2, y: this.y - h, w: this.w * sz, h }; }
  takeHit(info) {
    if (this.dead || this.out) return null;
    if (this.intang > 0) return null;
    // counter
    if (this.state === 'move' && this.move.counter && this.mf >= this.move.counter[0] && this.mf <= this.move.counter[1]) {
      this.counterD = info.dmg; const att = info.att; if (att && att.hitlag !== undefined) att.hitlag = 24;
      if (info.ax !== undefined) this.face = info.ax > this.x ? 1 : -1;
      this.setMove('riposte'); this.move.hb[0].d = Math.max(10, Math.round(info.dmg * 1.4)); FX.text(this.x, this.y - 80, 'COUNTER!', '#9cc8ff', 18);
      return 'counter';
    }
    if (this.state === 'shield' && !info.unblockable) {
      this.shieldHP -= info.dmg * 1.1; this.vx += sign(this.x - (info.ax ?? info.x)) * Math.min(6, 1 + info.dmg * 0.25); this.hitlag = Math.floor(hitlagFor(info.dmg) * 0.7);
      FX.burst(info.x, info.y, '#9ae7ff', 5); Audio2.play('shield');
      if (this.shieldHP <= 0) this.shieldBreak();
      return 'shield';
    }
    const dmg = info.dmg * this.mods.take * (World.mod.glass ? 1.4 : 1);
    this.pct = Math.min(999, this.pct + dmg);
    if (this.mods.thorns && info.att && info.att.takeHit && info.att.team !== 0) info.att.hurtRaw?.(info.dmg * this.mods.thorns);
    let kb = calcKB(this.pct * (this.team === 0 ? 1.6 : 1.3), dmg, this.weight, info.bkb, info.kbg * (this.team === 0 && info.att && info.att.team !== 0 ? 1.15 : 1));
    if (this.state === 'move' && this.move.armor && this.mf >= this.move.armor[0] && this.mf <= this.move.armor[1] && kb < 130) { this.hitlag = 4; FX.burst(info.x, info.y, '#ffffff', 4); Audio2.play('hit', 0); return 'armor'; }
    this.launch(kb, info);
    return 'hit';
  }
  launch(kb, info) {
    let ang = deg(info.ang);
    // DI: shift launch angle by stick perpendicular component
    const mx = this.inp.mx, my = -this.inp.my;
    if (Math.hypot(mx, my) > 0.3) { const px = -Math.sin(ang), py = Math.cos(ang); const dot = mx * px + my * py; ang += dot * deg(15); }
    const sp = kb * KB_SPEED;
    this.kx = Math.cos(ang) * sp; this.ky = -Math.sin(ang) * sp; this.vx = 0; this.vy = 0;
    if (!this.air && this.ky > 0) this.ky = -this.ky * 0.6;
    if (this.ky < -1 || kb > 50) { this.air = 1; this.y -= 1; }
    this.hitstun = Math.floor(kb * 0.4) + (info.stun || 0); this.state = 'hitstun'; this.sf = 0; this.move = null; this.tumble = kb > 80 ? 1 : 0;
    this.hitlag = hitlagFor(info.dmg); this.ledge = null;
    FX.hit(info.x, info.y, kb, info.fx); World.shake(Math.min(10, kb / 25));
    Audio2.play(kb > 120 ? 'bighit' : 'hit', Math.min(1, kb / 120));
  }
  ko(type) {
    if (this.dead || this.out) return;
    if (this.mods.phoenix && !this.phoenixUsed) { this.phoenixUsed = true; FX.text(this.x, this.y - 60, 'PHOENIX!', '#ff9a3c', 20); FX.burst(this.x, this.y, '#ff9a3c', 30); this.respawn(true); return; }
    FX.ko(this.x, this.y, this.def.color); Audio2.play('ko'); World.shake(12);
    this.dead = true; this.respawnT = 100; this.kx = this.ky = this.vx = this.vy = 0;
    Game.teamStocks--; if (Game.teamStocks < 0) { this.out = true; Game.teamStocks = 0; }
  }
  respawn(keepPct) {
    const c = World.cam; const B = World.barriers;
    let x = c.x; if (B) x = clamp(x, B.l + 60, B.r - 60);
    const other = World.players.find(p => p !== this && !p.dead && !p.out);
    if (other) x = other.x;
    this.x = x; this.y = c.y - 160; this.vx = this.vy = this.kx = this.ky = 0; this.air = 1; this.state = 'helpless'; this.sf = 0; this.move = null;
    if (!keepPct) this.pct = 0; this.dead = false; this.intang = 150; this.hitstun = 0; this.jumps = this.maxJumps; this.shieldHP = 50 * this.mods.shield; this.state = 'air';
    for (let i = 0; i < 20 && this.insideSolid(); i++) this.y -= 20;
  }
}

// --- Projectiles ---
const PROJ = {
  wave: { r: 23, life: 40, dmg: 7, a: 40, bkb: 25, kbg: 55, pierce: 2, solid: 1 },
  orb: { el: 'arcane', r: 11, life: 80, dmg: 5, a: 45, bkb: 30, kbg: 50, pierce: 1, solid: 1 },
  bolt: { r: 12, life: 24, dmg: 6, a: 30, bkb: 20, kbg: 28, pierce: 3, stun: 25, solid: 1, fx: 'spark', el: 'shock' },
  mine: { r: 10, life: 1200, dmg: 0, grav: 0.4, solid: 0, mine: 1 },
  blast: { r: 55, life: 4, dmg: 12, a: 85, bkb: 50, kbg: 70, pierce: 99, radial: 1, fx: 'fire' },
  hammer: { r: 21, life: 220, dmg: 10, a: 45, bkb: 30, kbg: 70, pierce: 99, solid: 0 },
  shock: { r: 18, life: 40, dmg: 8, a: 80, bkb: 40, kbg: 50, pierce: 99, ground: 1, solid: 1 },
  // enemy
  goo: { r: 10, life: 160, dmg: 7, a: 60, bkb: 25, kbg: 40, grav: 0.3, solid: 1 },
  bullet: { r: 7, life: 90, dmg: 6, a: 30, bkb: 20, kbg: 35, solid: 1 },
  hex: { r: 12, life: 200, dmg: 9, a: 50, bkb: 30, kbg: 50, solid: 0, homing: 0.18 },
  eshock: { r: 15, life: 50, dmg: 9, a: 75, bkb: 45, kbg: 50, pierce: 99, ground: 1, solid: 1 },
  stinger: { r: 7, life: 120, dmg: 6, a: 40, bkb: 25, kbg: 35, solid: 1 },
  shard: { r: 10, life: 160, dmg: 8, a: 45, bkb: 35, kbg: 50, solid: 0 },
  egg: { r: 12, life: 200, dmg: 6, a: 70, bkb: 30, kbg: 30, grav: 0.35, solid: 1, egg: 1 },
  rock: { r: 14, life: 200, dmg: 9, a: 70, bkb: 30, kbg: 40, grav: 0.25, solid: 1 },
  ebomb: { r: 80, life: 5, dmg: 18, a: 'radial', bkb: 60, kbg: 75, pierce: 99, radial: 1, ff: 1, fx: 'fire' },
  erang: { r: 13, life: 200, dmg: 6, a: 40, bkb: 25, kbg: 40, pierce: 99, solid: 0 },
  swordwave: { r: 22, life: 70, dmg: 10, a: 35, bkb: 40, kbg: 55, solid: 1 },
};
function spawnProj(type, owner, x, y, vx, vy, extra = {}) {
  const d = PROJ[type];
  const p = { type, owner, team: owner ? owner.team : 1, x, y, vx, vy, r: d.r, life: d.life, max: d.life, dmg: d.dmg, a: d.a, bkb: d.bkb, kbg: d.kbg, pierce: d.pierce || 1, grav: d.grav || 0, hits: new Set(), stun: d.stun || 0, fx: d.fx, id: World.uid++, t: 0, ...extra };
  if (owner && owner.team === 0) {
    const m = owner.mods; p.dmg *= m.dmg * m.spec; p.kbg *= m.kb;
  } else if (p.team === 1 && extra.dmg === undefined) p.dmg *= World.diff.dmg;
  if (type === 'orb') { const c = extra.c || 0; p.r = 11 + 13 * c; p.dmg = (5 + 15 * c) * (owner.mods.dmg * owner.mods.spec); p.kbg = 50 + 40 * c; }
  World.projs.push(p); return p;
}
function updateProj(p) {
  p.t++; p.life--;
  const D = PROJ[p.type];
  if (p.type === 'hammer' || p.type === 'erang') {
    const o = p.owner; const dir = sign(p.vx0 || (p.vx0 = p.vx));
    if (p.type === 'erang' && (!o || o.dead || o.dying)) p.life = 0;
    if (!p.ret) { p.vx -= dir * (p.type === 'erang' ? 0.3 : 0.36); p.vy = Math.sin(p.t / 10) * 0.6; if (sign(p.vx) !== dir) { p.ret = 1; p.hits.clear(); } }
    else { const dx = o.x - p.x, dy = (o.y - 40) - p.y, m = Math.hypot(dx, dy) || 1; const s = Math.min(14, 4 + p.t * 0.08); p.vx = dx / m * s; p.vy = dy / m * s; if (m < 30 || o.dead) { p.life = 0; if (p.type === 'hammer') o.hammerOut = null; } }
    if (p.life <= 0 && p.type === 'hammer') o.hammerOut = null;
  }
  if (p.type === 'mine') {
    if (p.t > 30) {
      const tgts = p.team === 0 ? World.enemies : World.players;
      if (tgts.some(e => !e.dead && dist(e.x, e.y - 20, p.x, p.y) < 50)) { p.life = 0; spawnProj('blast', p.owner, p.x, p.y - 10, 0, 0, { dmg: 12 }); FX.explode(p.x, p.y, 55); Audio2.play('boom'); }
    }
    if (!p.landed) { p.vy += p.grav; const g = groundBelow(p.x, p.y - 10, 30); if (g !== null && p.y + p.vy >= g) { p.y = g - 6; p.vy = 0; p.landed = 1; } }
  }
  if (D.homing) {
    const tgts = (p.team === 1 ? World.players : World.enemies).filter(t => !t.dead && !t.out);
    let best = null, bd = 1e9; for (const t of tgts) { const d2 = dist(t.x, t.y - 30, p.x, p.y); if (d2 < bd) { bd = d2; best = t; } }
    if (best) { const dx = best.x - p.x, dy = best.y - 30 - p.y, m = Math.hypot(dx, dy) || 1; p.vx += dx / m * D.homing; p.vy += dy / m * D.homing; const s = Math.hypot(p.vx, p.vy), mx = 3.6; if (s > mx) { p.vx *= mx / s; p.vy *= mx / s; } }
  }
  if (D.column) { if (p.t === D.delay) { Audio2.play('boom'); World.shake(6); FX.burst(p.x, p.y - 20, '#ff3cd5', 14); } return; }
  if (p.grav && p.type !== 'mine') p.vy += p.grav;
  p.x += p.vx; p.y += p.vy;
  if (D.ground) { // follow ground surface
    const g = groundBelow(p.x, p.y - 20, 60); if (g === null) p.life = 0; else p.y = g - 10;
    if (p.t % 3 === 0) FX.dust(p.x, p.y + 10);
  }
  if (D.solid && !D.ground && solidAt(p.x, p.y)) {
    p.life = 0; FX.burst(p.x, p.y, '#ffffff', 5);
    if (p.type === 'egg') spawnEnemy('hopper', p.x, p.y - 20, { minion: 1 });
  }
  if (p.type === 'egg' && p.life <= 0 && !p.hatched) { p.hatched = 1; }
  if (p.type === 'orb' || p.type === 'hex' || p.type === 'shard') { if (p.t % 3 === 0) FX.trail(p.x, p.y, p.type === 'orb' ? '#9dff8a' : p.type === 'hex' ? '#c77dff' : '#ff6bd6', p.r * 0.6); }
}
function projHitAngle(p, tgt) {
  if (PROJ[p.type].radial || p.a === 'radial') { const a = Math.atan2(-(tgt.y - 30 - p.y), tgt.x - p.x) * 180 / Math.PI; return clamp(a, 20, 160) === a ? a : (tgt.x > p.x ? 50 : 130); }
  const dir = p.type === 'hammer' ? sign(p.vx) : sign(p.vx) || (tgt.x > p.x ? 1 : -1);
  return dir >= 0 ? p.a : 180 - p.a;
}

// --- Elemental status effects ---
function applyEl(t, el, att) {
  if (!el || !t || t.dead) return;
  if (el === 'fire') { t.burnT = 100; t.burnBy = att; }
  else if (el === 'ice') { if (!t.boss) { t.frozenT = 30; t.hitstun = (t.hitstun || 0) + 26; } FX.burst(t.x, t.y - 30, '#bfefff', 8); }
  else if (el === 'shock') { if (!t.boss) { t.shockT = 14; t.hitstun = (t.hitstun || 0) + 12; } }
  else if (el === 'wind') { t.kx *= 1.35; t.ky *= 1.2; FX.ring(t.x, t.y - 30, 30, '#e8f7ff'); }
  else if (el === 'pull' && att) { t.kx = (att.x - t.x) * 0.06; t.ky = (att.y + 10 - t.y) * 0.06; }
}
function tickStatus(t) {
  if (t.frozenT > 0) t.frozenT--; if (t.shockT > 0) t.shockT--;
  if (t.burnT > 0) {
    t.burnT--; if (World.frame % 4 === 0) FX.add({ k: 'spark', x: t.x + rr(-8, 8), y: t.y - rr(10, 45), vx: rr(-0.4, 0.4), vy: rr(-2, -1), life: 18, max: 18, c: pick(['#ff9a3c', '#ffd23c', '#ff5a3c']), s: rr(2, 4) });
    if (t.burnT % 20 === 0) { if (t.team === 0 || t.isRival) { t.pct += 1; } else if (t.hurtRaw) t.hurtRaw(1, true); }
  }
}
// --- Combat resolution each frame ---
function resolveCombat() {
  const players = World.players.filter(p => !p.dead && !p.out), enemies = World.enemies.filter(e => !e.dead);
  // melee: players -> enemies
  for (const p of players) {
    for (const hb of p.hitboxes()) {
      for (const e of enemies) {
        if (e.dead || p.hitSet.has(e.id + ':' + hb.key)) continue;
        const r = e.hurt(); if (!circleRect(hb.x, hb.y, hb.r, r.x, r.y, r.w, r.h)) continue;
        p.hitSet.add(e.id + ':' + hb.key);
        const h = hb.h; let dmg = h.d * p.mods.dmg * (p.move && p.move.smash ? (1 + 0.45 * p.chg) * p.mods.smash : 1) * (p.move && p.move.special ? p.mods.spec : 1) * (p.move && (p.move.air || p.move.dash) ? p.mods.aerial : 1);
        if (h.chg) dmg += h.chg * p.chg;
        if (p.mods.exec && e.hp / e.maxHp < 0.3) dmg *= 1.5;
        let ang = p.face > 0 ? h.a : 180 - h.a; if (h.spike && p.mods.meteor) dmg *= 1.3;
        const res = e.takeHit({ dmg, ang, bkb: h.bkb + (h.chgKb || 0) * p.chg, kbg: h.kbg * p.mods.kb, att: p, x: hb.x, y: hb.y, ax: p.x, fx: h.fx || h.el, stun: h.stun || 0, fromX: p.x, fromY: p.y - 30 });
        if (res) { onPlayerHit(p, e, dmg, res); if (res === 'hit') { applyEl(e, h.el, p); if (h.pull) applyEl(e, 'pull', p); } }
      }
    }
  }
  // melee: enemies -> players
  for (const e of enemies) {
    for (const hb of e.hitboxes()) {
      const tg = hb.ff ? [...players, ...enemies.filter(o => o !== e)] : players;
      for (const p of tg) {
        if (p.dead || e.hitSet.has(p.id + ':' + hb.key)) continue;
        const r = p.hurt(); if (!circleRect(hb.x, hb.y, hb.r, r.x, r.y, r.w, r.h)) continue;
        e.hitSet.add(p.id + ':' + hb.key);
        const ang = hb.ang ?? (e.face > 0 ? hb.a : 180 - hb.a);
        const res = p.takeHit({ dmg: hb.d * (p.team === 0 ? World.diff.dmg : 1), ang, bkb: hb.bkb, kbg: hb.kbg, att: e, x: hb.x, y: hb.y, ax: e.x, fx: hb.fx, unblockable: hb.unblockable });
        if (res && res !== 'shield' && res !== 'counter') { e.hitlag = Math.max(e.hitlag || 0, Math.floor(hitlagFor(hb.d) * 0.6)); if (res === 'hit') applyEl(p, hb.el, e); }
      }
    }
  }
  // projectiles
  for (const pr of World.projs) {
    if (pr.life <= 0 || !pr.dmg) continue;
    const D = PROJ[pr.type];
    let targets = pr.team === 0 ? enemies : players;
    if (D.ff) targets = [...players, ...enemies];
    for (const t of targets) {
      if (pr.life <= 0) break;
      if (t.dead || pr.hits.has(t.id) || t === pr.owner) continue;
      const r = t.hurt();
      if (D.column) { if (pr.t < D.delay || Math.abs(t.x - pr.x) > pr.r + r.w / 2 || t.y < pr.y - 900 || t.y - t.h > pr.y + 10) continue; }
      else if (!circleRect(pr.x, pr.y, pr.r, r.x, r.y, r.w, r.h)) continue;
      pr.hits.add(t.id);
      let dmg = pr.dmg; const own = pr.owner;
      if (own && own.team === 0 && own.mods && own.mods.exec && t.hp && t.hp / t.maxHp < 0.3) dmg *= 1.5;
      const res = t.takeHit({ dmg, ang: projHitAngle(pr, t), bkb: pr.bkb, kbg: pr.kbg, att: own, x: pr.x, y: pr.y, ax: pr.x - sign(pr.vx) * 10, fx: pr.fx, stun: pr.stun, proj: 1 });
      if (res === 'shield' || res === 'reflect') { pr.life = 0; continue; }
      if (res && own && own.team === 0 && t.team === 1) onPlayerHit(own, t, dmg, res);
      if (res === 'hit' && D.el) applyEl(t, D.el, own);
      if (res) { pr.pierce--; if (pr.pierce <= 0) pr.life = 0; }
    }
  }
}
function onPlayerHit(p, e, dmg, res) {
  if (res === 'block') return;
  p.dmgDealt += dmg;
  if (res !== 'shield') p.hitlag = Math.max(p.hitlag, Math.floor(hitlagFor(dmg) * (p.move && p.move.special ? 0.5 : 0.85)));
  if (p.mods.steal) p.pct = Math.max(0, p.pct - dmg * p.mods.steal);
  if (p.mods.chain && Math.random() < 0.5) {
    const o = World.enemies.filter(x => !x.dead && x !== e).sort((a, b) => dist(a.x, a.y, e.x, e.y) - dist(b.x, b.y, e.x, e.y))[0];
    if (o && dist(o.x, o.y, e.x, e.y) < 260) { FX.zap(e.x, e.y - 30, o.x, o.y - 30); o.hurtRaw(5 * p.mods.chain); }
  }
}

// --- FX (purely visual; replicated to guests) ---
const Particles = [];
const FX = {
  add(o) { if (Particles.length < 600) Particles.push(o); },
  spark(x, y, c = '#fff') { this.add({ k: 'spark', x, y, vx: rr(-1, 1), vy: rr(-2, -0.5), life: 20, max: 20, c, s: 3 }); },
  burst(x, y, c = '#fff', n = 10) { for (let i = 0; i < n; i++) { const a = rr(0, TAU), s = rr(2, 7); this.add({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rr(14, 26), max: 26, c, s: rr(2, 4) }); } },
  dust(x, y) { for (let i = 0; i < 2; i++) this.add({ k: 'dust', x: x + rr(-6, 6), y: y - 2, vx: rr(-1, 1), vy: rr(-1, -0.2), life: 22, max: 22, c: 'rgba(255,255,255,0.5)', s: rr(3, 6) }); },
  ring(x, y, r, c = '#fff') { this.add({ k: 'ring', x, y, r0: 4, r, life: 16, max: 16, c }); },
  hit(x, y, kb, fx) {
    const c = { fire: '#ffb347', spark: '#9dff8a', slash: '#9cc8ff', ice: '#bfefff', shock: '#f4ff7a', wind: '#e8f7ff', arcane: '#d29bff' }[fx] || '#fff7c2';
    this.add({ k: 'impact', x, y, r: 16 + Math.min(52, kb / 3), life: 11, max: 11, c, a: rr(0, 1) });
    this.burst(x, y, c, Math.min(22, 5 + kb / 10));
    if (kb > 125) { World.flashT = Math.max(World.flashT || 0, 5); World.zp = Math.max(World.zp || 0, 0.05); this.add({ k: 'ring', x, y, r0: 10, r: 120, life: 18, max: 18, c: '#ffffff' }); }
    if (fx === 'slash') this.add({ k: 'slash', x, y, a: rr(0, TAU), r: 40, life: 10, max: 10, c });
  },
  explode(x, y, r) { this.add({ k: 'ring', x, y, r0: 6, r: r * 1.3, life: 18, max: 18, c: '#ffd27a' }); this.burst(x, y - 10, '#ff9a3c', 18); this.burst(x, y - 10, '#555', 8); },
  text(x, y, t, c = '#fff', s = 16) { this.add({ k: 'text', x, y, vy: -1, t: String(t), life: 50, max: 50, c, s }); },
  ko(x, y, c) { this.add({ k: 'kob', x, y, life: 64, max: 64, c }); this.burst(x, y, c, 30); World.flashT = 7; World.zp = 0.07; },
  after(x, y, face, c) { this.add({ k: 'after', x, y, face, life: 12, max: 12, c }); },
  trail(x, y, c, s) { this.add({ k: 'dust', x, y, vx: 0, vy: 0, life: 14, max: 14, c, s }); },
  zap(x1, y1, x2, y2) { this.add({ k: 'zap', x: x1, y: y1, x2, y2, life: 10, max: 10, c: '#bfe3ff' }); },
  portal(x, y) { this.swarm(x, y + 20, 50); },
  swarm(x, y, h = 50) { for (let i = 0; i < 26; i++) { const a = rr(0, TAU), d = rr(50, 110), t = ri(18, 40); this.add({ k: 'cube', x: x + Math.cos(a) * d, y: y - h / 2 + Math.sin(a) * d, vx: -Math.cos(a) * d / t, vy: -Math.sin(a) * d / t, life: t, max: t, c: Math.random() < 0.6 ? '#2a1140' : '#9b3cff', s: rr(4, 9), rot: rr(0, 3) }); } this.add({ k: 'ring', x, y: y - h / 2, r0: 70, r: 4, life: 36, max: 36, c: 'rgba(155,60,255,0.6)' }); },
  dissolve(x, y, h = 50) { for (let i = 0; i < 22; i++) this.add({ k: 'cube', x: x + rr(-18, 18), y: y - rr(0, h), vx: rr(-0.8, 0.8), vy: rr(-2.4, -0.6), life: ri(30, 55), max: 55, c: Math.random() < 0.6 ? '#2a1140' : '#9b3cff', s: rr(4, 10), rot: rr(0, 3), rise: 1 }); },
};
function updateParticles() {
  for (let i = Particles.length - 1; i >= 0; i--) {
    const p = Particles[i]; p.life--;
    if (p.k === 'cube') p.rot += 0.12; if (p.vx !== undefined) { p.x += p.vx; p.y += p.vy || 0; if (p.k === 'spark') { p.vx *= 0.92; p.vy = p.vy * 0.92 + 0.15; } }
    if (p.k === 'text') p.y += p.vy;
    if (p.life <= 0) Particles.splice(i, 1);
  }
}
