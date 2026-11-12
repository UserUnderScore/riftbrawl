const NO_INPUT = Object.freeze({ mx: 0, my: 0, cx: 0, cy: 0, a: 0, b: 0, j: 0, s: 0, m: 0, p: 0, back: 0, ap: 0, bp: 0, jp: 0, sp: 0, mp: 0, pp: 0, backp: 0, flick: 0, flickY: 0, kb: 1 });
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
    this.meter = 0; this.buf = {}; this.coyote = 0; this.techBuf = 0; this.techLock = 0; this.wallT = 0; this.wallSide = 0; this.wallJumped = 0; this.staleQ = []; this.stale = 1; this.bounced = 0; this.rollDir = 1;
  }
  get st() { return this.def.stats; }
  get maxJumps() { return this.st.jumps + this.mods.jumps; }
  get weight() { return this.st.weight + this.mods.weight; }
  setMove(name) {
    const mv = this.def.moves[name]; if (!mv) return;
    this.move = mv; this.mf = 0; this.mft = 0; this.state = 'move'; this.hitSet.clear(); this.mid++; this.chg = 0; this.chgT = 0; this.eat('ap', 'bp', 'cp', 'mp');
    const sc = this.staleQ.filter(n => n === name).length; this.stale = sc === 0 ? 1.05 : Math.max(0.55, 1 - 0.07 * sc); this._glint = 0; // freshness bonus for unused moves
    if (mv.airOnce && this.air) this.usedAir[name] = 1;
    if (!mv.special && !mv.jab && !mv.taunt && mv.hb.length) Audio2.play('swing');
  }
  teleport(x, y) {
    const ox = this.x, oy = this.y; this.x = x; this.y = y;
    // ensure not inside a solid; step back toward origin
    for (let i = 0; i < 20 && this.insideSolid(); i++) { this.x = lerp(this.x, ox, 0.15); this.y = lerp(this.y, oy, 0.15); }
    const B = World.barriers; if (B) this.x = clamp(this.x, B.l + 12, B.r - 12);
  }
  insideSolid() { for (const s of World.stage.solids) if (overlapRect(this.x - this.w / 2, this.y - this.h, this.w, this.h, s)) return true; return false; }
  actionable() { return ['idle', 'run', 'crouch', 'air', 'land0'].includes(this.state); }
  // ---- input buffer (Smash Ultimate style, 9 frames) ----
  pushBuf(raw) {
    for (const k of ['ap', 'bp', 'jp', 'sp', 'cp', 'mp']) if (raw[k]) this.buf[k] = { t: 9, mx: raw.mx, my: raw.my, cx: raw.cx, cy: raw.cy, sd: k === 'ap' || k === 'cp' || k === 'mp' ? this.smashInput(raw) : null };
    for (const k in this.buf) if (--this.buf[k].t < 0) delete this.buf[k];
  }
  merged(raw) {
    const E = Object.assign({}, raw); let last = null;
    for (const k in this.buf) { E[k] = 1; if (!last || this.buf[k].t > last.t) last = this.buf[k]; }
    if (last && Math.hypot(raw.mx, raw.my) < 0.3) { E.mx = last.mx; E.my = last.my; }
    if (this.buf.cp && !raw.cp) { E.cx = this.buf.cp.cx; E.cy = this.buf.cp.cy; }
    E._sd = (this.buf.ap && this.buf.ap.sd) || (this.buf.cp && this.buf.cp.sd) || (this.buf.mp && this.buf.mp.sd) || null;
    return E;
  }
  eat(...ks) { for (const k of ks) delete this.buf[k]; }
  jointsAt(fr) { const pose = kfPose(this.move.kf, fr); const J = joints(this.x, this.y, this.face, pose, this.mods.size, ART[this.def.id] || {}); J.w = pose[11]; return J; }
  update() {
    if (this.out) return;
    if (this.dead) { this.respawnT--; if (this.respawnT <= 0) this.respawn(); return; }
    const raw = Game.countT > 50 && this.team === 0 ? NO_INPUT : this.input.cur; // frozen during the 3-2-1 countdown
    if (raw.flick) this.lastFlick = { x: raw.flick, y: 0, t: World.frame };
    if (raw.flickY) this.lastFlick = { x: 0, y: raw.flickY, t: World.frame };
    // tech input: a shield press opens a 13-frame tech window, then a lockout (works during hitlag)
    if (raw.sp && this.techLock <= 0 && (this.state === 'hitstun' || this.hitlag > 0)) { this.techBuf = 13; this.techLock = 40; }
    if (this.techBuf > 0) this.techBuf--; if (this.techLock > 0) this.techLock--;
    this.pushBuf(raw);
    if (this.hitlag > 0) {
      // Smash DI: a fresh stick input during hitlag nudges you a few pixels (max 3 per hit)
      if (this.state === 'hitstun' && (raw.mx || raw.my) && (raw.mx !== this._sdiX || raw.my !== this._sdiY) && (this.sdiN | 0) < 3) { const ox = this.x, oy = this.y; this.x += raw.mx * 7; if (this.air) this.y += raw.my * 7; if (this.insideSolid()) { this.x = ox; this.y = oy; } else { this.sdiN = (this.sdiN | 0) + 1; FX.add({ k: 'dust', x: ox, y: oy - 30, vx: 0, vy: 0, life: 8, max: 8, c: 'rgba(255,255,255,0.5)', s: 4 }); } }
      this._sdiX = raw.mx; this._sdiY = raw.my; this.hitlag--; this.inp = raw; return;
    }
    if (this.buriedT > 0) { this.buriedT -= (raw.ap || raw.bp || raw.jp) && this.team === 0 ? 4 : 1; this.vx = this.vy = this.kx = this.ky = 0; this.inp = raw; if (World.frame % 6 === 0) FX.dust(this.x + rr(-12, 12), this.y); if (this.buriedT <= 0) { this.buriedT = 0; this.vy = -8; this.air = 1; this.state = 'air'; this.sf = 0; this.y -= 2; FX.dust(this.x - 10, this.y); FX.dust(this.x + 10, this.y); Audio2.play('jump'); } return; }
    const inp = this.inp = this.merged(raw);
    if (this.coyote > 0) this.coyote--; if (this.wallT > 0) this.wallT--;
    this.sf++; tickStatus(this); if (this.intang > 0) this.intang--; if (this.ledgeCD > 0) this.ledgeCD--; if (this.drop > 0) this.drop--; if (this.jabT > 0) this.jabT--;
    const st = this.st, spd = this.mods.speed;
    if (this.state !== 'shield') this.shieldHP = Math.min(50 * this.mods.shield, this.shieldHP + 0.12);
    // orbit orb boon
    if (this.mods.orb) this.orbA += 0.08;
    if (this.team === 0 && raw.s && raw.bp && this.meter >= 100 && (this.actionable() || this.state === 'shield')) { startBurst(this); return; }
    if (this.team === 0 && !this.isRival) itemInput(this, inp, raw);
    const smashDir = this.smashInput(raw) || inp._sd;
    if (this.dStale > 0 && World.frame % 100 === 0) this.dStale--;
    if (this.footCD > 0) this.footCD--;
    if (this.team === 0 && !this.isRival && raw.tp && !this.air && ['idle', 'run', 'crouch', 'land0'].includes(this.state)) { const nm = raw.my < -0.5 ? 'tauntU' : raw.my > 0.5 ? 'tauntD' : Math.abs(raw.mx) > 0.5 ? 'tauntS' : 'tauntU'; if (this.def.moves[nm]) { if (nm === 'tauntS' && raw.mx) this.face = sign(raw.mx); this.setMove(nm); this.vx *= 0.3; } }

    switch (this.state) {
      case 'idle': case 'run': case 'crouch': {
        if (this.air) { this.state = 'air'; break; }
        if (inp.jp && (inp.ap || inp.cp)) { this.state = 'squat'; this.sf = 0; this.shMacro = { ...inp }; this.eat('jp', 'ap'); break; } // jump + attack together = short-hop aerial
        if (this.groundAttack(inp, smashDir)) break;
        if (inp.jp) { this.state = 'squat'; this.sf = 0; this.eat('jp'); break; } // stick jump is off: only the jump button jumps
        if (inp.s || inp.sp) { this.state = 'shield'; this.sf = 0; this.eat('sp'); Audio2.play('shield'); break; }
        if (inp.my > 0.6) {
          if (this.state !== 'crouch') { this.state = 'crouch'; this.sf = 0; }
          if (this.plat && !this.plat.solid && (inp.flickY === 1 || (this.sf > 12 && inp.my > 0.85))) { this.drop = 12; this.y += 3; this.air = 1; this.state = 'air'; this.sf = 0; }
          this.vx *= 0.8;
        } else {
          if (Math.abs(inp.mx) > 0.2) {
            const d = sign(inp.mx);
            if (this.state !== 'run') { this.runF = 0; this.skidT = 0; if (Math.abs(inp.mx) > 0.8) this.vx = d * Math.max(Math.abs(this.vx), st.run * spd * 0.9); } // initial dash burst
            else if (d !== this.face && !this.skidT) { if ((this.runF | 0) < 12) { this.vx = d * st.run * spd * 0.9; this.runF = 0; FX.dust(this.x, this.y); } else this.skidT = 9; } // dash dance vs. skidding run turnaround
            if (this.skidT > 0) { this.skidT--; this.vx *= 0.8; if (this.skidT % 2 === 0) FX.dust(this.x + this.face * 8, this.y); if (this.skidT === 0) { this.face = d; this.vx = d * st.run * spd * 0.55; this.runF = 6; } this.state = 'run'; }
            else { this.state = 'run'; this.face = d; this.runF = (this.runF | 0) + 1; const t = inp.mx * st.run * spd; this.vx += clamp(t - this.vx, -st.acc * 1.5, st.acc * 1.5); if (this.sf % 12 === 0) FX.dust(this.x - this.face * 8, this.y); }
          }
          else { this.state = 'idle'; this.vx *= 0.78; }
        }
        break;
      }
      case 'squat': this.vx *= 0.9; if (inp.ap && inp.s) { this.setMove('grab'); this.eat('jp'); break; } if (smashDir === 'u') { this.setMove('usmash'); break; } /* jump-cancelled grab / up smash */ if (inp.ap || inp.cp) this.shMacro = { ...inp }; if (this.sf >= 4) { const full = !this.shMacro && raw.j; this.vy = -(full ? st.jump : st.jump * 0.68); this.shop = !full; this.air = 1; this.coyote = 0; this.state = 'air'; this.sf = 0; this.squashT = 8; Audio2.play('jump'); FX.dust(this.x, this.y); FX.dust(this.x, this.y); if (this.shMacro) { const m = this.shMacro; this.shMacro = null; m.ap = m.ap || (m.cp ? 0 : 1); this.airAttack(m, null); } } break;
      case 'land0': this.vx *= 0.8; if (this.groundAttack(inp, smashDir)) break; if (inp.jp) { this.state = 'squat'; this.sf = 0; this.eat('jp'); break; } if (this.sf >= 3) this.state = 'idle'; break;
      case 'land': this.vx *= 0.82; if (this.sf >= this.landLag) this.state = 'idle'; break;
      case 'shielddrop': this.vx *= 0.8; if (inp.jp) { this.state = 'squat'; this.sf = 0; this.eat('jp'); break; } if (this.sf >= 11) this.state = 'idle'; break;
      case 'revive': { this.vx = this.vy = 0; if (this.revY !== undefined && this.sf <= 34) { this.y = lerp(this.revY - 240, this.revY, 1 - Math.pow(1 - this.sf / 34, 3)); if (this.sf === 34) this.revY = undefined; } const moved = Math.hypot(raw.mx, raw.my) > 0.4 || raw.ap || raw.bp || raw.jp || raw.sp || this.sf > 200; this.intang = Math.max(this.intang, 2); if (moved && this.sf > 20) { this.state = 'air'; this.air = 1; this.sf = 0; this.intang = 100; this.buf = {}; } break; }
      case 'tech': this.vx *= 0.7; if (this.sf <= 20) this.intang = Math.max(this.intang, 2); if (this.sf >= 26) this.state = 'idle'; break;
      case 'techroll': if (this.sf <= 20) this.intang = Math.max(this.intang, 2); this.vx = this.sf < 26 ? this.rollDir * 5.6 : this.vx * 0.7; if (this.sf >= 36) this.state = 'idle'; break;
      case 'walltech': this.vx = this.vy = 0; if (this.sf <= 14) this.intang = Math.max(this.intang, 2); if (raw.jp && this.sf > 2) { this.state = 'air'; this.sf = 0; this.vy = -st.djump; this.vx = -this.wallSide * 4.5; this.face = -this.wallSide; Audio2.play('jump'); FX.dust(this.x + this.wallSide * 10, this.y - 20); this.eat('jp'); break; } if (this.sf >= 16) { this.state = 'air'; this.sf = 0; this.vx = -this.wallSide * 2; } break;
      case 'ceiltech': this.vy = Math.max(this.vy, 0); this.vx *= 0.8; if (this.sf <= 14) this.intang = Math.max(this.intang, 2); if (this.sf >= 14) { this.state = 'air'; this.sf = 0; } break;
      case 'down': {
        this.vx *= 0.85; if (this.air) { this.state = 'air'; break; }
        if (this.sf > 20) {
          if (inp.ap) { this.face = this.face; this.setMove('getupatk'); this.intang = 16; break; }
          if (Math.abs(inp.mx) > 0.5) { this.state = 'getuproll'; this.rollDir = sign(inp.mx); this.sf = 0; this.eat('ap', 'bp', 'jp', 'sp'); break; }
          if (inp.jp || inp.sp || inp.bp || inp.my < -0.5) { this.state = 'getup'; this.sf = 0; this.eat('ap', 'bp', 'jp', 'sp'); break; }
        }
        if (this.sf >= 130) { this.state = 'getup'; this.sf = 0; }
        break;
      }
      case 'getup': this.vx *= 0.7; if (this.sf <= 22) this.intang = Math.max(this.intang, 2); if (this.sf >= 29) this.state = 'idle'; break;
      case 'getuproll': if (this.sf <= 22) this.intang = Math.max(this.intang, 2); this.vx = this.sf < 28 ? this.rollDir * 5 : this.vx * 0.7; if (this.sf >= 35) this.state = 'idle'; break;
      case 'air': {
        if (!this.air) { this.toLand(3); break; }
        if (this.airAttack(inp, smashDir)) break;
        const wantJ = inp.jp;
        if (wantJ && this.coyote > 0) { this.coyote = 0; this.vy = -st.jump; this.ff = 0; this.squashT = 8; Audio2.play('jump'); FX.dust(this.x, this.y); this.eat('jp'); break; }
        if (wantJ && this.footstool()) { this.eat('jp'); break; }
        if (wantJ && this.wallT > 0 && !this.wallJumped && inp.mx * this.wallSide < -0.3) { this.wallJumped = 1; this.vy = -st.djump * 0.95; this.vx = -this.wallSide * 5.5; this.face = -this.wallSide; this.ff = 0; this.sf = 0; this.squashT = 8; Audio2.play('jump'); FX.dust(this.x + this.wallSide * 10, this.y - 20); FX.ring(this.x + this.wallSide * 10, this.y - 30, 20, '#ffffff'); this.eat('jp'); break; }
        if (wantJ && this.jumps > 0) { this.jumps--; this.shop = false; this.vy = -st.djump; this.vx = inp.mx * st.air * spd; this.ff = 0; this.squashT = 8; Audio2.play('jump'); FX.ring(this.x, this.y, 18, '#ffffff'); this.sf = 0; this.eat('jp'); break; }
        if (inp.sp && !this.adodged) { this.startAirDodge(inp); this.eat('sp'); break; }
        this.airDrift(inp);
        if (this.vy > 0 && inp.flickY === 1) this.fastFall();
        break;
      }
      case 'helpless': this.airDrift(inp, 0.6); if (!this.air) this.toLand(14); break;
      case 'move': this.updateMove(inp); break;
      case 'shield': {
        this.vx *= 0.8; this.shieldHP -= 0.18;
        if (this.shieldHP <= 0) { this.shieldBreak(); break; }
        if (this.air) { this.state = 'air'; break; }
        if (inp.jp) { this.state = 'squat'; this.sf = 0; break; }
        if (this.plat && !this.plat.solid && inp.my > 0.7 && Math.abs(inp.mx) > 0.35) { this.drop = 12; this.y += 3; this.air = 1; this.state = 'air'; this.sf = 0; FX.dust(this.x, this.y); break; } // shield drop
        if (inp.flick || (inp.kb && Math.abs(inp.mx) > 0.5 && this.sf > 2 && this.sf < 99 && (inp.flick || this.prevMx === 0))) { const d = sign(inp.mx || inp.flick); this.state = 'roll'; this.sf = 0; this.rollDir = d; this.face = -d; this.dsp = this.dStale | 0; this.dStale = Math.min(6, (this.dStale | 0) + 1); break; }
        if (inp.flickY === 1 || (inp.kb && inp.my > 0.5 && !this.prevMy)) { this.state = 'spot'; this.sf = 0; this.dsp = this.dStale | 0; this.dStale = Math.min(6, (this.dStale | 0) + 1); break; }
        if (inp.ap && this.sf > 1) { this.setMove('grab'); break; } // shield grab
        if (inp.bp && inp.my < -0.5) { this.state = 'idle'; this.special(inp); break; } // up special out of shield
        if (smashDir === 'u' || (inp.cp && inp.cy < -0.5)) { this.setMove('usmash'); break; } // up smash out of shield
        if (!raw.s && this.sf >= 3) { this.state = 'shielddrop'; this.sf = 0; }
        break;
      }
      case 'roll': { const t = this.sf, ds = this.dsp | 0; this.intang = t > 3 && t < 18 - ds * 2 ? 2 : this.intang; this.vx = t < 20 ? this.rollDir * 6.2 * (1 - ds * 0.04) : this.vx * 0.7; if (t >= 28 + ds * 3) { this.state = 'idle'; } if (this.air) this.state = 'air'; break; }
      case 'spot': { const ds = this.dsp | 0; this.vx *= 0.7; this.intang = this.sf > 2 && this.sf < 18 - ds * 2 ? 2 : this.intang; if (this.sf >= 26 + ds * 3) this.state = 'idle'; break; }
      case 'adodge': {
        const t = this.sf, ds = this.dsp | 0; this.intang = t > 2 && t < 22 - ds * 2 ? 2 : this.intang;
        if (this.adDir) { this.vx *= 0.9; this.vy *= 0.9; } else { this.vx *= 0.95; }
        if (!this.air) { const v = this.vx; this.toLand(this.adDir ? 10 : 4); if (this.adDir && Math.abs(v) > 1.5) { this.vx = v * 1.25; this.waveT = 10; FX.dust(this.x, this.y); FX.dust(this.x - sign(v) * 12, this.y); } break; } // wavedash / waveland
        if (t >= 34 + ds * 3) { this.state = 'air'; this.sf = 0; }
        break;
      }
      case 'shieldbreak': { this.vx *= 0.9; if (raw.ap || raw.bp || raw.jp || raw.sp) this.sf += 5; /* mash to recover faster */ if (this.sf % 20 === 0) FX.text(this.x, this.y - 70, '?!', '#ffe14a', 14); if (this.sf >= 150) { this.state = 'idle'; this.shieldHP = 25; } break; }
      case 'hitstun': {
        this.hitstun--;
        if (this.hitstun > 0 && this.air && this.tumble && this.team === 0) { if (this.sf >= 40 && inp.sp && !this.adodged && groundBelow(this.x, this.y, 90) === null) { this.hitstun = 0; this.tumble = 0; this.startAirDodge(inp); this.eat('sp'); break; } if (this.sf >= 45 && (inp.ap || inp.cp)) { this.hitstun = 0; this.tumble = 0; this.state = 'air'; this.sf = 0; if (this.airAttack(inp, null)) break; } }
        if (this.hitstun <= 0) { this.state = this.air ? 'air' : 'idle'; this.sf = 0; this.tumble = 0; }
        if (this.air && this.hitstun < 10) this.airDrift(inp, 0.5);
        break;
      }
      case 'ledge': this.updateLedge(inp); break;
      case 'burst': this.vx = this.vy = 0; break;
      case 'grabhold': {
        const T = this.held; this.vx *= 0.7;
        if (!T || T.dead || T.dying || T.grabbedBy !== this) { this.held = null; this.state = 'idle'; break; }
        this.placeHeld(18, -30);
        if (this.pumT > 0) this.pumT--;
        const dx = inp.mx * this.face, dy = inp.my; const cx = inp.cx * this.face, cy = inp.cy;
        let dir = null; if (Math.hypot(cx, cy) > 0.6) dir = Math.abs(cy) > Math.abs(cx) ? (cy < 0 ? 'u' : 'd') : (cx > 0 ? 'f' : 'b'); else if (Math.hypot(dx, dy) > 0.6 && this.sf > 4) dir = Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? 'u' : 'd') : (dx > 0 ? 'f' : 'b');
        if (dir) { const nm = { f: 'fthrow', b: 'bthrow', u: 'uthrow', d: 'dthrow' }[dir]; const h = this.held; this.setMove(nm); this.held = h; this.thrDone = 0; break; }
        if (inp.ap && this.pumT <= 0) { this.pumT = 14; this.eat('ap'); const T2 = this.held; if (T2.isRival) T2.pct += 2; else if (T2.hurtRaw) T2.hurtRaw(2 * this.mods.dmg, false); FX.hit(T2.x, T2.y - 30, 10); Audio2.play('hit', 0.1); this.meter = Math.min(100, this.meter + 2); }
        if (this.sf > 110) { this.releaseHeld(); this.state = 'idle'; }
        break;
      }
      case 'grabbed': { this.vx = this.vy = 0; if (!this.grabbedBy || this.grabbedBy.held !== this) { this.grabbedBy = null; this.state = 'air'; this.air = 1; this.grabEsc = 0; break; } this.grabEsc = (this.grabEsc | 0) + 1; if (this.grabEsc > clamp(100 - this.pct * 0.6, 34, 100)) { const g = this.grabbedBy; g.releaseHeld(); g.state = 'idle'; g.vx = -g.face * 4; this.kx = g.face * 4.5; this.ky = -2; this.grabEsc = 0; FX.ring(this.x, this.y - 30, 30, '#ffffff'); FX.text(this.x, this.y - 80, 'GRAB RELEASE', '#ffffff', 12); Audio2.play('clink'); } break; }
      case 'climb': { const C = this.climb, k = clamp(this.sf / 13, 0, 1), e = 1 - Math.pow(1 - k, 3); this.x = lerp(C.x0, C.x1, clamp((e - 0.3) / 0.7, 0, 1)); this.y = lerp(C.y0, C.y1, clamp(e / 0.6, 0, 1)) - Math.sin(k * Math.PI) * 10; this.vx = this.vy = 0; if (this.sf >= 14) { this.x = C.x1; this.y = C.y1; this.state = 'land0'; this.sf = 0; FX.dust(this.x, this.y); } break; }
    }
    this.prevMx = inp.mx; this.prevMy = inp.my;
    if (this.state !== 'ledge' && this.state !== 'climb') this.physics();
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
    if (inp.ap && inp.s) { if (this.state === 'run' && Math.abs(this.vx) > this.st.run * 0.6 && this.def.moves.dashgrab) { this.setMove('dashgrab'); return true; } this.setMove('grab'); this.vx *= 0.4; return true; }
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
    // turnaround special on the ground: hold back on neutral/down special to turn around first
    if ((nm === 'nspec' || nm === 'dspec') && !this.air && Math.abs(inp.mx) > 0.5 && sign(inp.mx) !== this.face && Math.abs(inp.my) > 0.5) this.face = sign(inp.mx);
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
      if (held && this.chgT < max) { this.chgT += mv.charge ? this.mods.smashChg : 1; this.chg = Math.min(1, this.chgT / max); if (this.chg >= 1 && !this._glint) { this._glint = 1; FX.glint(this.x + this.face * 14, this.y - 60); Audio2.play('ready', 0.4); } if (this.chgT % 6 === 0) { FX.spark(this.x + rr(-14, 14), this.y - rr(10, 60), '#fff6a0'); Audio2.play('charge', this.chg); } if (!this.air) this.vx *= 0.85; else this.vy = Math.min(this.vy, 1.5); if (inp.sp && mv.hold) { this.state = this.air ? 'air' : 'idle'; this.move = null; } return; }
    }
    // counter window
    const sp = mv.special ? 1 : this.mods.atk;
    this.mft += sp; const prev = this.mf; this.mf = Math.floor(this.mft);
    if ((mv.name === 'nspec' || mv.name === 'dspec' || mv.name === 'quakeDrop') && this.mf <= 5 && this._brev !== this.mid && Math.abs(inp.mx) > 0.6 && sign(inp.mx) !== this.face) { this._brev = this.mid; this.face = sign(inp.mx); if (this.air) this.vx = -this.vx * 0.9; FX.add({ k: 'ring', x: this.x, y: this.y - 30, r0: 4, r: 22, life: 8, max: 8, c: 'rgba(255,255,255,0.7)' }); } // B-reverse
    for (let t = prev + 1; t <= this.mf; t++) if (mv.go) { mv.go(this, t); if (this.move !== mv) return; }
    if (mv.thr && this.held) { const T = this.held; const k = clamp(this.mf / mv.thr.at, 0, 1); const P0 = mv.thr.path; const seg = k < 0.5 ? [P0[0], P0[1], k * 2] : [P0[1], P0[2], (k - 0.5) * 2]; this.placeHeld(lerp(seg[0][0], seg[1][0], seg[2]), lerp(seg[0][1], seg[1][1], seg[2]));
      if (this.mf >= mv.thr.at && !this.thrDone) { this.thrDone = 1; this.throwHeld(mv.thr); } }
    if (mv.smash && this.mods.overcharge && this.chg > 0.8 && this._oc !== this.mid && mv.hb.length && this.mf >= mv.hb[0].s) { this._oc = this.mid; spawnProj('blast', this, this.x + this.face * 50, this.y - 30, 0, 0, { r: 85, dmg: 10 }); FX.explode(this.x + this.face * 50, this.y - 30, 80); World.shake(8); Audio2.play('boom'); }
    if (!mv.go && this.mf > prev) { }
    if (mv.dash) { if (this.mf < 18) this.vx = this.face * Math.max(Math.abs(this.vx) * 0.97, 3); }
    if (mv.jab && this.mf >= 4) { this.jabNext = mv.jab === 1 ? 'jab2' : 'jab3'; this.jabT = 18; }
    if (!this.air && !mv.air && !mv.special && !mv.dash) this.vx *= 0.82;
    if (this.air && !mv.special) this.airDrift(inp, 0.8);
    if (mv.air && this.vy > 0 && inp.flickY === 1) this.fastFall();
    if (mv.air && !this.air) { // landed during aerial: autocancel windows before the first / after the last hitbox
      const s0 = Math.min(...mv.hb.map(h => h.s)), e0 = Math.max(...mv.hb.map(h => h.e)); const ac = this.mf < s0 - 1 || this.mf > e0 + 3;
      if (mv.onLand) mv.onLand(this); if (ac) FX.dust(this.x, this.y); this.toLand(ac ? 3 : Math.round((mv.lag || 6) * this.mods.lagMul)); return;
    }
    if (mv.untilLand && !this.air && this.mf > 8) { if (mv.land) this.setMove(mv.land); else this.toLand(10); return; }
    if (this.mf >= mv.d) {
      this.move = null;
      if (mv.helpless && this.air) { this.state = 'helpless'; } else this.state = this.air ? 'air' : (mv.crouchEnd && inp.my > 0.5 ? 'crouch' : 'idle');
      this.sf = 0;
    }
    if (mv.untilLand && this.mf >= mv.d - 1 && this.air) this.mft = mv.d - 2; // keep falling
  }
  toLand(lag) { this.state = lag <= 3 ? 'land0' : 'land'; this.landLag = lag; this.sf = 0; this.move = null; this.landT = 8; Audio2.play('land'); FX.dust(this.x, this.y); }
  placeHeld(ox, oy) { const T = this.held; if (!T) return; T.x = this.x + this.face * ox * this.mods.size; T.y = this.y + oy * this.mods.size + (T.isRival ? 30 : T.h * 0.5); T.vx = T.vy = T.kx = T.ky = 0; T.face = -this.face; }
  grabTarget(T) {
    if (this.held || T.boss || T.dead || T.dying || T.grabbedBy || T.spawnT > 0 || (T.intang > 0)) return false;
    this.held = T; T.grabbedBy = this; this.state = 'grabhold'; this.sf = 0; this.move = null; this.pumT = 6; this.vx = 0;
    if (T.isRival) { T.state = 'grabbed'; T.move = null; T.hitstun = 0; } else { T.atk = null; T.aim = null; }
    FX.ring(T.x, T.y - 30, 26, '#ffffff'); Audio2.play('grab'); return true;
  }
  releaseHeld() { const T = this.held; if (!T) return; T.grabbedBy = null; this.held = null; if (T.isRival) { T.state = 'air'; T.air = 1; T.intang = 10; } T.kx = this.face * 4; T.ky = -3; }
  throwHeld(th) {
    const T = this.held; if (!T) return; T.grabbedBy = null; this.held = null; if (T.isRival) { T.state = 'air'; T.air = 1; }
    const ang = this.face > 0 ? th.a : 180 - th.a; const dmg = th.d * this.mods.dmg * this.def.mul.dmg;
    const r = T.takeHit({ dmg, ang, bkb: th.bkb, kbg: th.kbg * this.mods.kb, att: this, x: T.x, y: T.y - 20, ax: this.x, unblockable: 1, throw: 1 });
    if (r) onPlayerHit(this, T, dmg, r); World.shake(5); Audio2.play('bighit');
  }
  doTech(kind, side) {
    this.techBuf = 0; this.techLock = 0; this.kx = this.ky = this.vx = this.vy = 0; this.hitstun = 0; this.tumble = 0; this.sf = 0; this.bounced = 0; this.eat('sp');
    FX.tech(this.x, this.y - 30); Audio2.play('tech'); World.slowmo(4); this.nTech = (this.nTech || 0) + 1;
    if (kind === 'ground') { this.air = 0; this.jumps = this.maxJumps; this.adodged = 0; this.wallJumped = 0; if (Math.abs(this.inp.mx) > 0.5) { this.state = 'techroll'; this.rollDir = sign(this.inp.mx); } else this.state = 'tech'; this.intang = 20; }
    else if (kind === 'wall') { this.state = 'walltech'; this.wallSide = side; this.face = side; this.intang = 14; }
    else { this.state = 'ceiltech'; this.intang = 14; }
  }
  knockdown(vx) { this.state = 'down'; this.sf = 0; this.vx = vx * 0.35; this.kx = this.ky = this.vy = 0; this.hitstun = 0; this.tumble = 0; this.air = 0; this.bounced = 0; this.jumps = this.maxJumps; this.adodged = 0; this.wallJumped = 0; FX.dust(this.x - 12, this.y); FX.dust(this.x + 12, this.y); Audio2.play('thud'); World.shake(3); }
  fastFall() { if (this.ff) return; this.ff = 1; FX.ffspark(this.x, this.y - 34); }
  footstool() { // jump off an enemy's head: a free jump for you, the enemy gets shoved down and briefly stunned
    if (this.team !== 0 || this.footCD > 0 || this.vy < -2) return false;
    for (const e of World.enemies) {
      if (e.dead || e.dying || e.boss || e.spawnT > 0 || e.grabbedBy) continue; const top = e.isRival ? e.y - 64 : e.y - e.h;
      if (Math.abs(e.x - this.x) < (e.isRival ? 20 : e.w / 2) + 12 && this.y > top - 16 && this.y < top + 22) {
        this.vy = -this.st.jump * 0.95; this.ff = 0; this.footCD = 24; this.squashT = 8; this.sf = 0;
        e.ky = e.air ? 9 : 0; e.kx = 0; if (e.isRival) { if (e.state !== 'hitstun') { e.state = 'hitstun'; e.move = null; } e.hitstun = Math.max(e.hitstun | 0, 22); e.sf = 0; } else { e.hitstun = Math.max(e.hitstun | 0, 26); e.atk = null; e.squashT = 10; }
        FX.ring(this.x, this.y, 26, '#ffffff'); FX.dust(this.x, this.y); FX.text(this.x, this.y - 70, 'FOOTSTOOL!', '#ffe9a0', 13); Audio2.play('thud'); Audio2.play('jump'); return true;
      }
    }
    return false;
  }
  shieldBreak() { this.state = 'shieldbreak'; this.sf = 0; this.vy = -11; this.air = 1; this.shieldHP = 0; FX.burst(this.x, this.y - 30, '#9ae7ff', 24); FX.ring(this.x, this.y - 30, 70, '#9ae7ff'); FX.text(this.x, this.y - 90, 'SHIELD BREAK!', '#9ae7ff', 16); Audio2.play('bighit'); World.shake(6); }
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
    if (this.state === 'walltech' || this.state === 'revive' || this.state === 'climb' || this.state === 'burst' || this.state === 'grabbed') return;
    const wasAir = this.air; const vyBefore = this.vy + this.ky; const vxBefore = this.vx + this.kx;
    const r = moveBody(this, this.vx + this.kx, this.vy + this.ky, { passBarrier: passB, noWorldEdge: passB });
    if (r.wall) {
      if (this.state === 'hitstun' && this.techBuf > 0 && Math.abs(this.kx) > 2.5) { this.doTech('wall', r.wall); return; }
      if (this.state === 'hitstun' && Math.abs(this.kx) > 6) { this.kx *= -0.5; FX.burst(this.x + r.wall * 10, this.y - 30, '#fff', 6); } else { this.kx = 0; } this.vx = 0;
      if (this.air && !r.barrier) { this.wallT = 7; this.wallSide = r.wall; }
    }
    if (r.ceil) { if (this.state === 'hitstun' && this.techBuf > 0) { this.doTech('ceil'); return; } this.vy = Math.max(0, this.vy); this.ky = Math.max(0, this.ky) * 0.5; }
    if (r.land) {
      if (this.state === 'hitstun' && this.techBuf > 0 && (this.tumble || vyBefore > 3)) { this.y = this.y; this.plat = r.plat; this.doTech('ground'); }
      else if (this.state === 'hitstun' && vyBefore > 9 && km > 10 && !this.bounced) { this.bounced = 1; this.ky = -Math.abs(this.ky) * 0.45; this.vy = 0; FX.dust(this.x, this.y); World.shake(3); }
      else if (this.state === 'hitstun' && (this.tumble || vyBefore > 6)) { this.plat = r.plat; this.knockdown(vxBefore); }
      else {
        this.vy = 0; this.ky = 0; this.plat = r.plat;
        if (wasAir) { this.air = 0; this.shop = false; this.ledgeN = 0; this.jumps = this.maxJumps; this.adodged = 0; this.usedAir = {}; this.ff = 0; this.wallJumped = 0; this.landT = 8; if (this.mods.landShock && this.y - this.fallStart > 120) this.landShock(); }
      }
    } else {
      const gp = onGround(this);
      if (gp && this.vy + this.ky >= 0) { this.plat = gp; if (this.air) { this.air = 0; this.jumps = this.maxJumps; this.adodged = 0; this.usedAir = {}; this.ff = 0; this.wallJumped = 0; } }
      else { if (!this.air) { this.fallStart = this.y; if (['idle', 'run', 'crouch', 'land0', 'land', 'shielddrop'].includes(this.state)) this.coyote = 6; } this.air = 1; this.plat = null; }
    }
    if (!this.air) this.fallStart = this.y; else this.fallStart = Math.min(this.fallStart, this.y);
    // ledge grab
    if (this.air && this.ledgeCD === 0 && (['air', 'helpless', 'move'].includes(this.state) || (this.state === 'adodge' && this.sf > 18)) && this.vy >= -1 && !(this.state === 'move' && !this.move.helpless && !this.move.untilLand)) this.tryLedge();
  }
  tryLedge() {
    for (const L of World.stage.ledges) {
      const hx = L.x + L.dir * 10;
      if (Math.abs(this.x - hx) < 18 && this.y - 66 < L.y && this.y - 30 > L.y) {
        const occ = World.players.find(p => p !== this && p.state === 'ledge' && p.ledge === L); if (occ) { if (this.team !== 0) continue; occ.state = 'air'; occ.ledge = null; occ.air = 1; occ.vx = L.dir * 3.5; occ.vy = -3; occ.ledgeCD = 40; occ.intang = Math.max(occ.intang, 16); occ.sf = 0; FX.ring(occ.x, occ.y - 30, 24, '#ffffff'); FX.text(occ.x, occ.y - 80, 'TRUMPED!', '#ffffff', 12); }
        this.ledgeN = (this.ledgeN | 0) + 1; this.intang = Math.max(this.intang, Math.max(4, 34 - (this.ledgeN - 1) * 10)); Audio2.play('grab', 0.4); // ledge-grab intangibility shrinks on repeated regrabs
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
    if (inp.jp) { leave(); this.state = 'air'; this.vy = -this.st.jump; this.vx = this.face * 1.5; Audio2.play('jump'); return; }
    if (inp.ap) { leave(); this.x = L.x - L.dir * 14; this.y = L.y; this.air = 0; this.setMove('ftilt'); this.intang = 10; return; }
    if (inp.sp) { leave(); this.x = L.x - L.dir * 14; this.y = L.y; this.air = 0; this.state = 'roll'; this.rollDir = -L.dir; this.face = L.dir; this.intang = 20; this.eat('sp'); return; }
    if (toward || inp.my < -0.6) { leave(); this.climb = { x0: this.x, y0: this.y, x1: L.x - L.dir * 14, y1: L.y }; this.state = 'climb'; this.air = 0; this.intang = 16; return; }
    if (away || inp.my > 0.6 || this.sf > 300) { leave(); this.state = 'air'; this.x += L.dir * 6; return; }
  }
  landShock() { spawnProj('blast', this, this.x, this.y - 10, 0, 0, { r: 60, dmg: 8, life: 4 }); FX.ring(this.x, this.y, 70, '#ffd27a'); World.shake(4); }
  // hitboxes in world space: the designed hitbox plus circles that ride the attacking limb / weapon,
  // swept between the previous and current frame so fast swings never skip over targets
  hitboxes() {
    const out = [];
    if (this.state === 'move') {
      const mv = this.move, sz = this.mods.size; let Jc = null, Jp = null;
      mv.hb.forEach((h, i) => {
        if (this.mf < h.s || this.mf > h.e) return;
        let key = this.mid * 100 + (h.grp !== undefined ? 80 + h.grp : i); if (h.multi) key = this.mid * 100 + 50 + Math.floor((this.mf - h.s) / h.multi);
        const att = hbAttach(this.def, mv, h);
        // hitboxes ride on the limb / weapon that swings them, so they always line up with the animation.
        // (magic, whole-body spins and body-centred hitboxes keep their designed spot)
        const follow = att && !h.el && !mv.spin && !mv.flip && !(Math.abs(h.x) < 16 && h.y > -56 && h.y < -6);
        if (!follow) out.push({ x: this.x + this.face * h.x * sz, y: this.y + h.y * sz, r: h.r * sz, h, key, move: mv, main: 1 });
        if (!att) return;
        if (!Jc) { Jc = this.jointsAt(this.mft); Jp = this.jointsAt(Math.max(0, this.mft - 1)); }
        const soft = h._soft || (h._soft = { ...h, d: Math.max(1, Math.round(h.d * 0.85)), kbg: h.kbg * 0.92 });
        limbCircles(att, Jc, h.r * sz, this.def).forEach(([px, py, r, k], ci) => out.push(follow && ci === 0 ? { x: px, y: py, r: h.r * sz * 0.95, h, key, move: mv, main: 1 } : { x: px, y: py, r, h: k ? h : soft, key, move: mv }));
        if (this.mf > h.s) { const [tx, ty, tr] = limbCircles(att, Jp, h.r * sz, this.def)[0]; const [cx, cy] = limbCircles(att, Jc, h.r * sz, this.def)[0]; out.push({ x: tx, y: ty, r: tr * 0.9, h, key, move: mv }, { x: (tx + cx) / 2, y: (ty + cy) / 2, r: tr, h, key, move: mv }); }
      });
    }
    if (this.mods.orb && !this.dead) { const ox = this.x + Math.cos(this.orbA) * 46, oy = this.y - 30 + Math.sin(this.orbA) * 46; out.push({ x: ox, y: oy, r: 10, h: { d: 3, a: 60, bkb: 20, kbg: 20, orb: 1 }, key: 'orb' + Math.floor(World.frame / 30), move: null, main: 1 }); }
    return out;
  }
  hurt() { const sz = this.mods.size; if (this.state === 'down') return { x: this.x - 30 * sz, y: this.y - 22 * sz, w: 60 * sz, h: 22 * sz }; const h = (this.state === 'crouch' ? 40 : 64) * sz, w = 32 * sz; return { x: this.x - w / 2, y: this.y - h, w, h }; }
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
    if (this.state === 'shielddrop' && this.sf <= 5 && !info.unblockable) return this.parry(info);
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
    if (this.team === 0 && this.pct > 0) this.meter = Math.min(100, this.meter + dmg * 0.5);
    if (this.state === 'move' && ((this.move.armor && this.mf >= this.move.armor[0] && this.mf <= this.move.armor[1] && kb < 130) || (this.mods.armorAll && (this.move.smash || this.move.special) && kb < 100))) { this.hitlag = 4; FX.burst(info.x, info.y, '#ffffff', 4); Audio2.play('hit', 0); return 'armor'; }
    if (this.state === 'crouch' && !this.air) kb *= 0.85; // crouch cancel
    this.launch(kb, info);
    return 'hit';
  }
  parry(info) {
    const a = info.att; if (a && !info.proj) { a.hitlag = (a.hitlag || 0) + 16; if (!a.boss && a.team === 1 && !a.isRival) { a.hitstun = Math.max(a.hitstun || 0, 40); a.atk = null; } }
    this.state = 'idle'; this.sf = 0; this.intang = 8; this.buf = {}; this.parryT = 20; this.nParry = (this.nParry || 0) + 1;
    FX.parry(this.x, this.y - 32); FX.text(this.x, this.y - 92, 'PARRY!', '#9ae7ff', 20); World.slowmo(10); World.flashT = Math.max(World.flashT || 0, 4); Audio2.play('parry');
    return 'parry';
  }
  launch(kb, info) {
    this.sdiN = 0; this.buriedT = 0;
    if (this.state === 'down' && kb < 70 && !this.air) { // jab reset: weak hits on a knocked-down fighter pop them up, stunned
      this.state = 'hitstun'; this.hitstun = 16; this.sf = 0; this.kx = sign(this.x - (info.ax ?? info.x)) * 1.5; this.ky = -1.5; this.tumble = 0; this.hitlag = hitlagFor(info.dmg); this.move = null;
      FX.hit(info.x, info.y, kb, info.fx); FX.text(this.x, this.y - 60, 'JAB RESET', '#ffe9a0', 12); Audio2.play('hit', 0.4); return;
    }
    if (this.item) dropItem(this, true);
    if (this.held) this.releaseHeld(); if (this.grabbedBy) { const g0 = this.grabbedBy; if (g0.held === this) g0.held = null; this.grabbedBy = null; }
    let ang = deg(info.ang);
    // DI: shift launch angle by stick perpendicular component
    const mx = this.inp.mx, my = -this.inp.my;
    if (Math.hypot(mx, my) > 0.3) { const px = -Math.sin(ang), py = Math.cos(ang); const dot = mx * px + my * py; ang += dot * deg(15); }
    const sp = kb * KB_SPEED;
    this.kx = Math.cos(ang) * sp; this.ky = -Math.sin(ang) * sp; this.vx = 0; this.vy = 0;
    if (!this.air && this.ky > 0) this.ky = -this.ky * 0.6;
    if (this.ky < -1 || kb > 50) { this.air = 1; this.y -= 1; }
    this.hitstun = Math.floor(kb * 0.4) + (info.stun || 0); this.state = 'hitstun'; this.sf = 0; this.move = null; this.tumble = kb > 80 ? 1 : 0;
    if (this.ky > 5 && Math.abs(this.ky) > Math.abs(this.kx)) meteorFX(this.x, this.y - 30);
    this.hitlag = hitlagFor(info.dmg); this.ledge = null;
    FX.hit(info.x, info.y, kb, info.fx); World.shake(Math.min(10, kb / 25));
    Audio2.play(kb > 120 ? 'bighit' : 'hit', Math.min(1, kb / 120));
  }
  ko(type) {
    if (this.dead || this.out) return;
    if (this.mods.phoenix && !this.phoenixUsed) { this.phoenixUsed = true; FX.text(this.x, this.y - 60, 'PHOENIX!', '#ff9a3c', 20); FX.burst(this.x, this.y, '#ff9a3c', 30); this.respawn(true); return; }
    if (this.held) this.releaseHeld(); if (this.item) dropItem(this);
    const c = World.cam, r = Math.random(), sx = clamp((this.x - c.x) * c.z + W / 2, 80, W - 80), sy = clamp((this.y - c.y) * c.z + H / 2, 60, H - 60);
    if (type === 'top' && r < 0.45) { FX.specialKO('starko', this.def.id, this.face, sx, sy, this.x < c.x ? -1 : 1); Audio2.play('ko'); } // Star KO
    else if (type === 'top' && r < 0.7) FX.specialKO('screenko', this.def.id, this.face, sx, sy, 0); // Screen KO
    else { FX.ko(this.x, this.y, this.def.color); Audio2.play('ko'); World.shake(12); }
    if (this.team === 0) this.falls = (this.falls || 0) + 1;
    this.dead = true; this.respawnT = 100; this.kx = this.ky = this.vx = this.vy = 0;
    Game.teamStocks--; if (Game.teamStocks < 0) { this.out = true; Game.teamStocks = 0; } else if (Game.teamStocks === 0 && !(World.stage && World.stage.training)) Game.callout('LAST STOCK!', '#ff4f6a', 40);
  }
  respawn(keepPct) {
    const c = World.cam; const B = World.barriers;
    let x = c.x; if (B) x = clamp(x, B.l + 60, B.r - 60);
    const other = World.players.find(p => p !== this && !p.dead && !p.out);
    if (other) x = other.x;
    const gy = groundBelow(x, c.y - 300, 900); this.x = x; this.y = (gy !== null ? Math.min(gy - 150, c.y - 60) : c.y - 160); this.vx = this.vy = this.kx = this.ky = 0; this.air = 1; this.sf = 0; this.move = null; this.buf = {};
    if (!keepPct) this.pct = 0; this.dead = false; this.intang = 150; this.hitstun = 0; this.jumps = this.maxJumps; this.shieldHP = 50 * this.mods.shield; this.state = keepPct ? 'air' : 'revive';
    for (let i = 0; i < 20 && this.insideSolid(); i++) this.y -= 20;
    if (!keepPct) { this.revY = this.y; this.y -= 240; } // the revival platform descends from the top
    FX.ring(this.x, this.y, 50, '#ffffff'); FX.burst(this.x, this.y - 30, this.def.color, 16);
  }
}

// which limb (or weapon) does a designed hitbox belong to? computed once per hitbox from the move's pose
const WPN_LEN = { sword: 46, staff: 40, hammer: 34 };
function hbAttach(def, mv, h) {
  if (h._att !== undefined) return h._att;
  const f = Math.round((h.s + h.e) / 2), pose = kfPose(mv.kf, f), J = joints(0, 0, 1, pose, 1, ART[def.id] || {}); J.w = pose[11];
  const c = { h1: J.h1, h2: J.h2, f1: J.f1, f2: J.f2 };
  if (WPN_LEN[def.weapon]) { const a = deg(J.w), L = WPN_LEN[def.weapon]; c.w = [J.h1[0] + Math.cos(a) * L, J.h1[1] + Math.sin(a) * L]; c.wm = [J.h1[0] + Math.cos(a) * L * 0.55, J.h1[1] + Math.sin(a) * L * 0.55]; }
  let best = null, bd = 1e9; for (const k in c) { const d = Math.hypot(c[k][0] - h.x, c[k][1] - h.y) * (k === 'w' || k === 'wm' ? 0.75 : 1); if (d < bd) { bd = d; best = k; } } // weapon users strike with the weapon
  if (best === 'wm') best = 'w';
  return h._att = bd < h.r * 2.2 + 40 ? best : null;
}
function limbCircles(att, J, r, def) {
  const mid = (a, b, t = 0.5) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  if (att === 'w') { const a = deg(J.w), L = WPN_LEN[def.weapon] * J.s; const d = [J.face * Math.cos(a), Math.sin(a)]; const p = t => [J.h1[0] + d[0] * L * t, J.h1[1] + d[1] * L * t]; const tip = p(1), m = p(0.62), b = p(0.3); return [[tip[0], tip[1], r * 0.8, 1], [m[0], m[1], r * 0.7, 0], [b[0], b[1], r * 0.55, 0]]; }
  const seg = { h1: [J.e1, J.h1], h2: [J.e2, J.h2], f1: [J.k1, J.f1], f2: [J.k2, J.f2] }[att]; const [a, b] = seg; const m = mid(a, b);
  return [[b[0], b[1], r * 0.8, 1], [m[0], m[1], r * 0.62, 0]];
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
  // clank: grounded attacks that collide trade off (within 9 damage both rebound, otherwise the weaker one is cancelled)
  for (const p of players) {
    if (p.state !== 'move' || p.air || !p.move || p.move.special || p._clank === p.mid) continue; const phb = p.hitboxes().filter(h => h.main && !h.h.grab); if (!phb.length) continue;
    for (const e of enemies) {
      if (e.boss || e.dead || e.dying || e.air) continue; const ehb = e.hitboxes(); if (!ehb.length) continue; let hit = null;
      for (const a of phb) { for (const b of ehb) if (Math.hypot(a.x - b.x, a.y - b.y) < (a.r + b.r) * 0.8) { hit = [a, b]; break; } if (hit) break; }
      if (!hit) continue; const [a, b] = hit, dp = a.h.d * (p.stale || 1), de = b.d || 0; p._clank = p.mid;
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2; FX.add({ k: 'glint', x: cx, y: cy, life: 14, max: 14, c: '#ffffff' }); FX.burst(cx, cy, '#ffffff', 10); Audio2.play('clink'); World.shake(3);
      if (dp - de < 9) { p.move = null; p.state = 'land'; p.landLag = 14; p.sf = 0; p.hitlag = 8; p.vx = -p.face * 3; FX.text(cx, cy - 30, 'CLANK!', '#ffffff', 13); }
      if (de - dp < 9) { if (e.isRival) { e.move = null; e.state = 'land'; e.landLag = 16; e.sf = 0; e.hitlag = 8; } else { e.atk = null; e.hitlag = 10; e.cd = Math.max(e.cd | 0, 40); } }
      break;
    }
  }
  // attacks swat weak enemy projectiles out of the air
  for (const p of players) {
    if (p.state !== 'move') continue; const phb = p.hitboxes(); if (!phb.length) continue;
    for (const pr of World.projs) { if (pr.team === 0 || pr.life <= 0 || ['pillar', 'eshock', 'blast', 'ebomb', 'swordwave'].includes(pr.type)) continue; for (const a of phb) { if (a.h.grab || (pr.dmg || 0) > a.h.d * 1.5 + 4) continue; if (Math.hypot(a.x - pr.x, a.y - pr.y) < a.r + (pr.r || 8)) { pr.life = 0; FX.burst(pr.x, pr.y, '#ffffff', 8); FX.add({ k: 'glint', x: pr.x, y: pr.y, life: 12, max: 12, c: '#ffffff' }); Audio2.play('clink'); break; } } }
  }
  // melee: players -> enemies
  for (const p of players) {
    for (const hb of p.hitboxes()) {
      for (const e of enemies) {
        if (e.dead || p.hitSet.has(e.id + ':' + hb.key)) continue;
        const r = e.hurt(); if (!circleRect(hb.x, hb.y, hb.r, r.x, r.y, r.w, r.h)) continue;
        p.hitSet.add(e.id + ':' + hb.key);
        const h = hb.h;
        if (h.grab) { if (p.grabTarget(e)) break; continue; } let dmg = (p.stale || 1) * h.d * p.mods.dmg * (p.move && p.move.smash ? (1 + 0.45 * p.chg) * p.mods.smash : 1) * (p.move && p.move.special ? p.mods.spec : 1) * (p.move && (p.move.air || p.move.dash) ? p.mods.aerial : 1);
        if (h.chg) dmg += h.chg * p.chg;
        if (p.mods.exec && e.hp / e.maxHp < 0.3) dmg *= 1.5;
        let ang = p.face > 0 ? h.a : 180 - h.a; if (h.spike && p.mods.meteor) dmg *= 1.3;
        if (p.move && p.move.air && p.shop) dmg *= 0.85; // short-hop aerial damage multiplier (Ultimate)
        const rage = p.team === 0 ? 1 + clamp((p.pct - 35) / 115, 0, 1) * 0.1 : 1; // rage: more knockback the more damage you have
        const gnd = !e.air;
        const res = e.takeHit({ dmg, ang, bkb: h.bkb + (h.chgKb || 0) * p.chg, kbg: h.kbg * p.mods.kb * rage, att: p, x: hb.x, y: hb.y, ax: p.x, fx: h.fx || h.el, stun: h.stun || 0, fromX: p.x, fromY: p.y - 30 });
        if (res) { onPlayerHit(p, e, dmg, res); if (res === 'hit' && h.el === 'shock') { e.hitlag = Math.round((e.hitlag || 0) * 1.5); p.hitlag = Math.round((p.hitlag || 0) * 1.5); } if (res === 'hit') { applyEl(e, h.el, p); if (h.pull) applyEl(e, 'pull', p); if (h.bounce && p.air) { p.vy = -8.5; p.ff = 0; p.jumps = Math.max(p.jumps, 1); }
          if (h.bury && gnd && !e.boss) buryTarget(e); else if (h.trip && gnd && !e.boss) tripTarget(e, p);
          if (!e.boss || e.hp <= 0) criticalCheck(p, e, h); if (p.move && p.move.heavy) { World.shake(Math.min(14, 4 + dmg * 0.45)); World.zp = Math.max(World.zp || 0, 0.035); e.hitlag = Math.round((e.hitlag || 0) * 1.25); p.hitlag = Math.round(p.hitlag * 1.25); } } }
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
      if (res === 'shield' || res === 'reflect' || res === 'parry') { pr.life = 0; continue; }
      if (res && own && own.team === 0 && t.team === 1) onPlayerHit(own, t, dmg, res);
      if (res === 'hit' && D.el) applyEl(t, D.el, own);
      if (res) { pr.pierce--; if (pr.pierce <= 0) pr.life = 0; }
    }
  }
}
function onPlayerHit(p, e, dmg, res) {
  if (res === 'block') return;
  p.dmgDealt += dmg; if (e && p.team === 0) e._lastP = p; if (World.frame - (p.lastHitF ?? -999) <= 55) p.combo = (p.combo || 1) + 1; else p.combo = 1; p.lastHitF = World.frame; p.bestCombo = Math.max(p.bestCombo || 0, p.combo);
  if (p.move && p._staleMid !== p.mid) { p._staleMid = p.mid; p.staleQ.push(p.move.name); if (p.staleQ.length > 9) p.staleQ.shift(); }
  if (res !== 'shield') p.hitlag = Math.max(p.hitlag, Math.floor(hitlagFor(dmg) * (p.move && p.move.special ? 0.5 : 0.85)));
  if (p.mods.steal) p.pct = Math.max(0, p.pct - dmg * p.mods.steal);
  if (p.team === 0) { const was = p.meter; p.meter = Math.min(100, p.meter + dmg * 0.9 * (p.mods.meterMul || 1)); if (was < 100 && p.meter >= 100) { FX.text(p.x, p.y - 100, 'BURST READY!', '#ffd23c', 18); Audio2.play('ready'); } }
  if (p.mods.chain && Math.random() < Math.min(0.9, 0.3 + 0.2 * p.mods.chain)) {
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
  specialKO(k, fid, face, sx, sy, side) { this.add({ k, fid, face, sx, sy, side, life: k === 'starko' ? 90 : 80, max: k === 'starko' ? 90 : 80 }); },
  meteor(x, y) { this.add({ k: 'meteor', x, y, life: 16, max: 16, c: '#ffffff' }); for (let i = 0; i < 6; i++) this.add({ k: 'speed', x: x + rr(-20, 20), y: y - rr(10, 50), vx: 0, vy: 8, len: rr(20, 40), life: 10, max: 10, c: 'rgba(255,220,160,0.9)' }); },
  glint(x, y) { this.add({ k: 'glint', x, y, life: 18, max: 18, c: '#ffffff' }); },
  ffspark(x, y) { this.add({ k: 'ffspark', x, y, life: 12, max: 12, c: '#ffffff' }); },
  tech(x, y) { this.add({ k: 'techf', x, y, life: 16, max: 16, c: '#ffffff' }); this.burst(x, y, '#ffffff', 10); },
  parry(x, y) { this.add({ k: 'techf', x, y, life: 22, max: 22, c: '#9ae7ff' }); this.add({ k: 'ring', x, y, r0: 10, r: 110, life: 20, max: 20, c: '#9ae7ff' }); this.burst(x, y, '#cfffff', 16); },
  zap(x1, y1, x2, y2) { this.add({ k: 'zap', x: x1, y: y1, x2, y2, life: 10, max: 10, c: '#bfe3ff' }); },
  portal(x, y) { this.swarm(x, y + 20, 50); },
  swarm(x, y, h = 50) { for (let i = 0; i < 26; i++) { const a = rr(0, TAU), d = rr(50, 110), t = ri(18, 40); this.add({ k: 'cube', x: x + Math.cos(a) * d, y: y - h / 2 + Math.sin(a) * d, vx: -Math.cos(a) * d / t, vy: -Math.sin(a) * d / t, life: t, max: t, c: Math.random() < 0.6 ? '#2a1140' : '#9b3cff', s: rr(4, 9), rot: rr(0, 3) }); } this.add({ k: 'ring', x, y: y - h / 2, r0: 70, r: 4, life: 36, max: 36, c: 'rgba(155,60,255,0.6)' }); },
  dissolve(x, y, h = 50) { for (let i = 0; i < 22; i++) this.add({ k: 'cube', x: x + rr(-18, 18), y: y - rr(0, h), vx: rr(-0.8, 0.8), vy: rr(-2.4, -0.6), life: ri(30, 55), max: 55, c: Math.random() < 0.6 ? '#2a1140' : '#9b3cff', s: rr(4, 10), rot: rr(0, 3), rise: 1 }); },
};
function updateParticles() {
  for (let i = Particles.length - 1; i >= 0; i--) {
    const p = Particles[i]; p.life--;
    if (p.k === 'cube') p.rot += 0.12; if (p.g) { p.vy += p.g; p.vx *= 0.98; } if (p.vx !== undefined) { p.x += p.vx; p.y += p.vy || 0; if (p.k === 'spark') { p.vx *= 0.92; p.vy = p.vy * 0.92 + 0.15; } }
    if (p.k === 'text') p.y += p.vy;
    if (p.life <= 0) Particles.splice(i, 1);
  }
}

// ---------- obscure Smash mechanics helpers ----------
function meteorFX(x, y) { FX.meteor(x, y); }
function buryTarget(e) { // ground-pound style hits plant grounded targets in the floor
  e.air = 0; const gy = groundBelow(e.x, e.y - 4, 30); if (gy !== null) e.y = gy;
  const T = Math.min(110, Math.round(40 + (e.pct || 0) * 0.35)); e.buriedT = T; e.kx = e.ky = e.vx = e.vy = 0;
  if (e.isRival) { e.state = 'hitstun'; e.hitstun = T + 2; e.move = null; } else { e.hitstun = Math.max(e.hitstun | 0, T); e.atk = null; }
  FX.dust(e.x - 14, e.y); FX.dust(e.x + 14, e.y); for (let i = 0; i < 4; i++) FX.add({ k: 'crack', x: e.x, y: e.y, a: rr(-Math.PI, 0), len: rr(14, 30), life: 40, max: 40, seed: Math.random() * 99 });
  FX.text(e.x, e.y - 70, 'BURIED!', '#e0b070', 13); Audio2.play('thud'); World.shake(5);
}
function tripTarget(e, p) { // low sweeps trip grounded foes onto the floor
  e.air = 0; const gy = groundBelow(e.x, e.y - 4, 30); if (gy !== null) e.y = gy; e.kx = e.ky = 0;
  if (e.isRival) { e.hitlag = 0; e.knockdown(p.face * 2); } else { e.tripT = 40; e.hitstun = Math.max(e.hitstun | 0, 40); e.atk = null; e.kx *= 0.3; e.ky = 0; }
  FX.text(e.x, e.y - 50, 'TRIP!', '#ffe9a0', 12);
}
function criticalCheck(p, e, h) { // Ultimate-style finishing-blow zoom on huge launches of tough foes
  const sp = Math.hypot(e.kx || 0, e.ky || 0); if (sp < 21 || !(e.isRival || e.boss || e.elite)) return;
  if (World.frame - (World._critF || -999) < 200) return; World._critF = World.frame;
  World.slowmo(26); World.zp = Math.max(World.zp || 0, 0.16); World.flashT = 7; World.critT = 26; World.critAt = { x: e.x, y: e.y - 30 };
  FX.add({ k: 'ring', x: e.x, y: e.y - 30, r0: 10, r: 200, life: 24, max: 24, c: '#7fd8ff' }); Audio2.play('crowd'); Audio2.play('bighit');
}
