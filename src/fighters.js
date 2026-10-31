// ===== FIGHTERS: poses + movesets =====
// Pose: [hipX, hipY, lean, h1x,h1y, h2x,h2y, f1x,f1y, f2x,f2y, weaponDeg]
// hands relative to shoulder, feet relative to hip, all in facing space (+x forward, +y down)
const STAND = [0, -25, 0.05, 5, 19, -4, 19, 5, 25, -5, 25, 70];
const P = (...a) => a;
const POSE = {
  stand: STAND,
  crouch: P(0, -15, 0.35, 10, 12, 0, 14, 12, 16, -10, 16, 40),
  jump: P(0, -28, 0.0, 10, 8, -10, 6, 8, 16, -6, 20, 30),
  fall: P(0, -26, -0.05, 12, -6, -12, -4, 6, 22, -8, 18, 20),
  helpless: P(0, -26, -0.2, 14, -14, -14, -12, 10, 18, -10, 20, -60),
  hurt: P(-3, -26, -0.45, -16, -8, -10, -14, 10, 20, -8, 24, -40),
  tumble: P(0, -26, 1.2, -18, -2, 16, 8, 14, 14, -14, 18, 160),
  shield: P(0, -22, 0.15, 12, 6, 8, 10, 8, 22, -8, 22, 10),
  ledge: P(-6, -26, 0.15, 14, -6, 10, -6, 2, 24, -4, 22, -80),
  dead: P(0, -10, 1.5, 10, 10, -10, 10, 10, 10, -10, 10, 90),
  dodge: P(-2, -24, 0.4, 2, 14, -6, 14, 2, 22, -8, 18, 60),
};
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
function kfPose(kf, f) {
  if (f <= kf[0][0]) return kf[0][1];
  for (let i = 0; i < kf.length - 1; i++) {
    const [fa, pa] = kf[i], [fb, pb] = kf[i + 1];
    if (f <= fb) { let t = (f - fa) / Math.max(1, fb - fa); t = t * t * (3 - 2 * t); return mix(pa, pb, t); }
  }
  return kf[kf.length - 1][1];
}
// hb: [start,end, x,y, r, dmg, angle, bkb, kbg, opts]
function HB(s, e, x, y, r, d, a, bkb, kbg, o = {}) { return { s, e, x, y, r, d, a, bkb, kbg, ...o }; }

function baseMoves() {
  const S = STAND;
  return {
    jab1: { d: 14, kf: [[0, S], [3, P(2, -25, 0.12, 22, -2, -6, 12, 7, 25, -7, 25, 0)], [8, P(2, -25, 0.12, 22, -2, -6, 12, 7, 25, -7, 25, 0)], [14, S]], hb: [HB(3, 5, 24, -46, 9, 3, 30, 14, 25)], jab: 1 },
    jab2: { d: 14, kf: [[0, S], [3, P(3, -25, 0.15, 4, 10, 22, 0, 7, 25, -7, 25, 30)], [8, P(3, -25, 0.15, 4, 10, 22, 0, 7, 25, -7, 25, 30)], [14, S]], hb: [HB(3, 5, 25, -44, 9, 3, 35, 16, 25)], jab: 2 },
    jab3: { d: 26, kf: [[0, S], [4, P(-2, -26, -0.15, -8, 8, -10, 10, 26, -12, -6, 25, 90)], [10, P(-2, -26, -0.15, -8, 8, -10, 10, 26, -12, -6, 25, 90)], [26, S]], hb: [HB(4, 7, 30, -36, 13, 5, 40, 45, 90)] },
    ftilt: { d: 26, kf: [[0, S], [6, P(-4, -26, -0.3, -10, 8, -12, 4, 30, -4, -4, 25, 100)], [12, P(-4, -26, -0.3, -10, 8, -12, 4, 30, -4, -4, 25, 100)], [26, S]], hb: [HB(6, 9, 34, -28, 12, 9, 35, 30, 95)] },
    utilt: { d: 24, kf: [[0, S], [4, P(0, -25, 0.1, 16, 2, -6, 12, 6, 25, -6, 25, 20)], [7, P(0, -26, -0.05, 2, -24, -6, 10, 6, 25, -6, 25, -90)], [11, P(0, -26, -0.15, -12, -16, -6, 10, 6, 25, -6, 25, -150)], [24, S]], hb: [HB(5, 10, 6, -66, 16, 7, 90, 32, 110)] },
    dtilt: { d: 18, kf: [[0, POSE.crouch], [4, P(0, -13, 0.45, 10, 14, -6, 12, 30, 12, -12, 14, 10)], [9, P(0, -13, 0.45, 10, 14, -6, 12, 30, 12, -12, 14, 10)], [18, POSE.crouch]], hb: [HB(4, 7, 32, -6, 11, 6, 75, 30, 70)], crouchEnd: 1 },
    dash: { d: 32, kf: [[0, S], [5, P(6, -30, 0.2, 10, -4, -12, 4, 24, 4, -10, 20, 0)], [16, P(6, -30, 0.2, 10, -4, -12, 4, 24, 4, -10, 20, 0)], [32, S]], hb: [HB(5, 9, 26, -32, 14, 10, 50, 50, 70), HB(10, 15, 24, -32, 12, 6, 50, 40, 60)], dash: 1 },
    fsmash: { d: 44, charge: 8, kf: [[0, S], [8, P(-4, -24, -0.25, -16, 4, 8, 6, 12, 25, -12, 25, -120)], [14, P(6, -24, 0.4, 30, -2, -14, 8, 18, 25, -16, 25, 0)], [24, P(6, -24, 0.4, 30, -2, -14, 8, 18, 25, -16, 25, 0)], [44, S]], hb: [HB(13, 17, 38, -44, 15, 16, 38, 40, 100)], smash: 1 },
    usmash: { d: 42, charge: 6, kf: [[0, S], [6, P(0, -17, 0.3, 8, 14, -8, 14, 12, 16, -12, 16, 60)], [12, P(0, -30, -0.05, 2, -26, -2, -26, 4, 28, -4, 28, -90)], [22, P(0, -30, -0.05, 2, -26, -2, -26, 4, 28, -4, 28, -90)], [42, S]], hb: [HB(11, 16, 0, -78, 18, 15, 90, 36, 100)], smash: 1 },
    dsmash: { d: 42, charge: 6, kf: [[0, S], [6, P(0, -18, 0.1, 10, 12, -10, 12, 6, 18, -6, 18, 80)], [12, P(0, -11, 0.0, 16, 12, -16, 12, 30, 10, -30, 10, 0)], [22, P(0, -11, 0.0, 16, 12, -16, 12, 30, 10, -30, 10, 180)], [42, S]], hb: [HB(11, 14, 32, -6, 13, 13, 25, 35, 95), HB(14, 17, -32, -6, 13, 12, 155, 35, 95)], smash: 1 },
    nair: { d: 30, air: 1, lag: 8, kf: [[0, POSE.jump], [4, P(0, -26, 0.0, 18, -6, -18, -6, 18, 4, -18, 4, 0)], [20, P(0, -26, 0.0, 18, -6, -18, -6, 18, 4, -18, 4, 360)], [30, POSE.jump]], hb: [HB(4, 8, 0, -30, 24, 10, 45, 30, 90), HB(9, 20, 0, -30, 22, 6, 45, 20, 70)] },
    fair: { d: 34, air: 1, lag: 12, kf: [[0, POSE.jump], [6, P(0, -26, -0.3, -4, -24, -10, -16, 12, 12, -10, 18, -110)], [11, P(0, -26, 0.4, 26, 8, 10, 10, 10, 16, -14, 16, 60)], [20, P(0, -26, 0.4, 26, 8, 10, 10, 10, 16, -14, 16, 60)], [34, POSE.jump]], hb: [HB(8, 12, 28, -34, 15, 12, 40, 32, 95)] },
    bair: { d: 28, air: 1, lag: 10, kf: [[0, POSE.jump], [6, P(2, -26, 0.4, 10, 4, 6, 8, -30, -6, 6, 14, 120)], [14, P(2, -26, 0.4, 10, 4, 6, 8, -30, -6, 6, 14, 120)], [28, POSE.jump]], hb: [HB(6, 10, -32, -30, 13, 13, 140, 32, 100)] },
    uair: { d: 26, air: 1, lag: 8, kf: [[0, POSE.jump], [5, P(0, -26, -0.3, -10, 4, 10, 4, 4, -44, -6, 16, -90)], [12, P(0, -26, -0.3, -10, 4, 10, 4, 4, -44, -6, 16, -90)], [26, POSE.jump]], hb: [HB(5, 10, 2, -74, 16, 9, 85, 30, 100)] },
    grab: { d: 30, kf: [[0, STAND], [5, P(6, -24, 0.35, 26, 2, 22, 6, 12, 25, -10, 25, 0)], [10, P(6, -24, 0.35, 26, 2, 22, 6, 12, 25, -10, 25, 0)], [30, STAND]], hb: [HB(6, 9, 32, -36, 19, 0, 0, 0, 0, { grab: 1 })] },
    fthrow: { d: 30, kf: [[0, P(2, -25, 0.2, 18, 2, 14, 4, 8, 25, -8, 25, 0)], [6, P(-4, -25, -0.25, -8, -6, -12, -2, 12, 25, -10, 25, -120)], [10, P(8, -24, 0.5, 30, 0, 20, 4, 16, 25, -14, 25, 0)], [30, STAND]], hb: [], thr: { at: 9, d: 8, a: 40, bkb: 60, kbg: 62, path: [[18, -30], [-6, -50], [40, -36]] } },
    bthrow: { d: 36, kf: [[0, P(2, -25, 0.2, 18, 2, 14, 4, 8, 25, -8, 25, 0)], [8, P(0, -26, -0.1, 0, -22, -4, -20, 8, 25, -8, 25, -90)], [14, P(-6, -24, -0.5, -26, 0, -20, 4, 10, 25, -16, 25, 180)], [36, STAND]], hb: [], thr: { at: 14, d: 10, a: 140, bkb: 62, kbg: 74, path: [[18, -30], [0, -64], [-40, -34]] } },
    uthrow: { d: 32, kf: [[0, P(2, -25, 0.2, 18, 2, 14, 4, 8, 25, -8, 25, 0)], [6, P(0, -18, 0.3, 10, 10, 6, 12, 12, 16, -12, 16, 60)], [11, P(0, -30, -0.05, 4, -28, -4, -28, 4, 28, -4, 28, -90)], [32, STAND]], hb: [], thr: { at: 11, d: 7, a: 88, bkb: 72, kbg: 58, path: [[18, -30], [10, -24], [2, -82]] } },
    dthrow: { d: 32, kf: [[0, P(2, -25, 0.2, 18, 2, 14, 4, 8, 25, -8, 25, 0)], [6, P(0, -28, -0.1, 14, -24, 10, -24, 8, 25, -8, 25, -90)], [11, P(2, -14, 0.7, 24, 18, 18, 18, 12, 14, -12, 14, 90)], [32, STAND]], hb: [], thr: { at: 11, d: 6, a: 72, bkb: 42, kbg: 32, path: [[18, -30], [14, -70], [26, -4]] } },
    itoss: { d: 22, kf: [[0, P(-2, -25, -0.2, -10, -20, -6, -8, 6, 25, -8, 25, -100)], [5, P(-4, -25, -0.3, -14, -22, -10, -6, 4, 25, -12, 25, -140)], [9, P(6, -24, 0.4, 24, -2, 10, 6, 14, 25, -14, 25, 20)], [22, STAND]], hb: [], go: (f, t) => itemToss(f, t, 'f') },
    itossU: { d: 22, kf: [[0, P(0, -23, 0.1, 10, 6, -8, 8, 8, 23, -8, 23, 60)], [5, P(0, -21, 0.2, 12, 10, -10, 8, 9, 21, -9, 21, 60)], [9, P(0, -27, -0.15, 4, -26, -6, -10, 7, 27, -7, 27, -80)], [22, STAND]], hb: [], go: (f, t) => itemToss(f, t, 'u') },
    itossD: { d: 20, kf: [[0, P(0, -26, -0.1, 4, -20, -6, -10, 7, 25, -7, 25, -60)], [5, P(0, -26, -0.15, 6, -24, -8, -12, 7, 25, -7, 25, -80)], [9, P(0, -22, 0.35, 10, 14, -6, 8, 8, 22, -8, 22, 80)], [20, STAND]], hb: [], go: (f, t) => itemToss(f, t, 'd') },
    getupatk: { d: 36, kf: [[0, P(0, -12, 1.2, 10, 8, -8, 8, 12, 10, -12, 10, 90)], [8, P(0, -14, 0.5, 14, 10, -14, 10, 24, 6, -24, 6, 0)], [16, P(0, -14, 0.5, 14, 10, -14, 10, -24, 6, 24, 6, 180)], [36, STAND]], hb: [HB(9, 12, 30, -8, 16, 7, 30, 55, 40), HB(13, 16, -30, -8, 16, 7, 150, 55, 40)] },
    dair: { d: 38, air: 1, lag: 16, kf: [[0, POSE.jump], [8, P(0, -30, 0.0, 10, -12, -10, -12, 2, 4, -4, 8, -90)], [12, P(0, -30, 0.0, 10, -6, -10, -6, 2, 34, -2, 32, 90)], [22, P(0, -30, 0.0, 10, -6, -10, -6, 2, 34, -2, 32, 90)], [38, POSE.jump]], hb: [HB(12, 16, 0, 6, 15, 12, -80, 22, 85, { spike: 1 })] },
  };
}

// --- per-fighter definitions ---
const FIGHTERS = [
  {
    id: 0, name: 'ROOK', title: 'The Brawler', color: '#e8473f', dark: '#9e2420', weapon: 'none',
    blurb: 'Balanced fists & fury. Chargeable punch, rush combo, and a meteor dive.',
    stats: { run: 6.3, air: 4.5, acc: 0.85, aacc: 0.5, grav: 0.56, fall: 10, ffall: 14.5, jump: 12.4, djump: 11.2, jumps: 1, weight: 100 },
    mul: { reach: 1, dmg: 1, kb: 1, spd: 1, rad: 1 },
    specials: {
      nspec: { name: 'Pressure Punch', d: 46, hold: { at: 6, max: 60, btn: 'b' }, kf: [[0, STAND], [6, P(-6, -22, -0.3, -18, 6, 8, 4, 10, 22, -14, 22, 0)], [14, P(10, -24, 0.45, 32, -4, -14, 8, 20, 24, -18, 24, 0)], [26, P(10, -24, 0.45, 32, -4, -14, 8, 20, 24, -18, 24, 0)], [46, STAND]],
        hb: [HB(13, 18, 36, -44, 15, 9, 35, 30, 95, { chg: 14, chgKb: 25, fx: 'fire' })], go: (f, t) => { if (t === 12) { f.vx = f.face * (6 + 7 * f.chg); Audio2.play('swing'); } } },
      sspec: { name: 'Rush Combo', d: 44, airOnce: 1, kf: [[0, STAND], [6, P(6, -26, 0.3, 24, -2, -8, 8, 16, 24, -12, 22, 0)], [12, P(6, -26, 0.3, -2, 6, 24, 0, 16, 24, -12, 22, 0)], [22, P(4, -28, 0.1, 18, -22, -6, 8, 14, 22, -10, 24, -60)], [44, STAND]],
        hb: [HB(5, 7, 24, -44, 11, 4, 10, 35, 0), HB(11, 13, 24, -44, 11, 4, 10, 35, 0), HB(22, 26, 24, -56, 15, 8, 75, 55, 70)], go: (f, t) => { if (t >= 3 && t < 18) f.vx = f.face * 9.5; if (t === 18) f.vx *= 0.3; if (f.air && t < 24) f.vy = Math.min(f.vy, 0.5); } },
      uspec: { name: 'Rising Uppercut', d: 44, helpless: 1, kf: [[0, POSE.crouch], [4, P(0, -28, -0.1, 8, -26, -10, 8, 6, 22, -6, 26, -90)], [20, P(0, -28, -0.1, 8, -26, -10, 8, 6, 22, -6, 26, -90)], [44, POSE.fall]],
        hb: [HB(4, 16, 8, -60, 16, 2, 88, 45, 0, { multi: 4 }), HB(18, 21, 6, -72, 18, 6, 80, 45, 90)], go: (f, t) => { if (t === 4) { f.vy = -14.5; f.vx = f.inp.mx * 3; f.air = 1; Audio2.play('jump'); } if (t > 4) f.vx = lerp(f.vx, f.inp.mx * 3.5, 0.1); } },
      dspec: { name: 'Meteor Drop', d: 70, untilLand: 1, kf: [[0, POSE.jump], [8, P(0, -32, 0.1, 10, -16, -10, -16, 4, 30, -4, 24, -90)], [70, P(0, -32, 0.1, 10, -16, -10, -16, 4, 30, -4, 24, -90)]],
        hb: [HB(8, 70, 2, 0, 17, 11, -75, 30, 70, { spike: 1 })], go: (f, t) => { if (!f.air && t < 8) { f.setMove('meteorLand'); return; } if (t < 8) { f.vy = -2; f.vx *= 0.8; } if (t === 8) { f.vy = 16; f.vx = f.face * 2.5; } }, land: 'meteorLand' },
      meteorLand: { d: 26, kf: [[0, POSE.crouch], [8, POSE.crouch], [26, STAND]], hb: [HB(1, 4, 0, -8, 46, 7, 80, 55, 50)], go: (f, t) => { if (t === 1) { FX.ring(f.x, f.y, 60, '#ffb070'); Audio2.play('boom'); World.shake(5); } } },
    }
  },
  {
    id: 1, name: 'VELA', title: 'The Blade', color: '#3f8de8', dark: '#1f4f95', weapon: 'sword',
    blurb: 'Fast, long-reaching sword. Wave slashes, flash dashes, and a counter.',
    stats: { run: 6.9, air: 4.7, acc: 0.95, aacc: 0.55, grav: 0.58, fall: 10.5, ffall: 15, jump: 12.6, djump: 11.4, jumps: 1, weight: 88 },
    mul: { reach: 1.42, dmg: 0.93, kb: 1, spd: 0.92, rad: 1.1 },
    specials: {
      nspec: { name: 'Crescent Wave', d: 34, kf: [[0, STAND], [6, P(-2, -25, -0.2, -10, -16, -8, 10, 8, 25, -8, 25, -120)], [11, P(4, -25, 0.3, 24, 4, -8, 10, 10, 25, -10, 25, 20)], [34, STAND]],
        go: (f, t) => { if (t === 11) { spawnProj('wave', f, f.x + f.face * 30, f.y - 36, f.face * 10, 0); Audio2.play('shoot'); } if (f.air) f.vy = Math.min(f.vy, 1.5); } },
      sspec: { name: 'Flash Step', d: 38, airOnce: 1, kf: [[0, STAND], [4, P(-4, -22, 0.5, -16, 8, -12, 8, 14, 20, -18, 18, 170)], [14, P(8, -22, 0.6, 24, 4, -14, 6, 20, 18, -22, 18, 0)], [38, STAND]],
        hb: [HB(6, 14, 0, -34, 24, 11, 40, 40, 85, { fx: 'slash' })], go: (f, t) => { if (t >= 5 && t <= 14) { f.vx = f.face * 16; f.vy = 0; f.intang = Math.max(f.intang, 2); FX.after(f.x, f.y, f.face, '#9cc8ff'); } if (t === 15) f.vx *= 0.15; if (t === 5) Audio2.play('swing'); } },
      uspec: { name: 'Skyward Spiral', d: 42, helpless: 1, kf: [[0, POSE.crouch], [4, P(0, -28, 0, 20, -10, -20, -10, 6, 24, -6, 24, 0)], [22, P(0, -28, 0, 20, -10, -20, -10, 6, 24, -6, 24, 1080)], [42, POSE.fall]],
        hb: [HB(4, 22, 0, -36, 28, 2, 90, 35, 0, { multi: 5 }), HB(23, 26, 0, -46, 28, 6, 75, 45, 90)], go: (f, t) => { if (t === 4) { f.vy = -13.5; f.air = 1; Audio2.play('swing'); } if (t > 4) f.vx = lerp(f.vx, f.inp.mx * 4, 0.12); } },
      dspec: { name: 'Riposte', d: 40, counter: [4, 28], kf: [[0, STAND], [4, P(-4, -22, -0.1, 12, -14, -6, 10, 10, 22, -10, 22, -80)], [28, P(-4, -22, -0.1, 12, -14, -6, 10, 10, 22, -10, 22, -80)], [40, STAND]], go: (f, t) => { if (f.air) f.vy = Math.min(f.vy, 1); } },
      riposte: { d: 30, kf: [[0, P(-4, -22, -0.1, 12, -14, -6, 10, 10, 22, -10, 22, -80)], [5, P(10, -24, 0.5, 30, 2, -10, 8, 18, 24, -18, 24, 10)], [30, STAND]], hb: [HB(4, 8, 34, -38, 26, 10, 35, 60, 90, { fx: 'slash' })], go: (f, t) => { f.intang = Math.max(f.intang, 2); if (t === 1) { World.slowmo(14); Audio2.play('clink'); } } },
    }
  },
  {
    id: 2, name: 'PIP', title: 'The Spellslinger', color: '#4cc35a', dark: '#24782f', weapon: 'staff',
    blurb: 'Floaty zoner with 3 jumps. Chargeable orbs, lightning, blinks, and mines.',
    stats: { run: 5.5, air: 4.3, acc: 0.7, aacc: 0.5, grav: 0.42, fall: 8, ffall: 12, jump: 11.4, djump: 10.2, jumps: 2, weight: 76 },
    mul: { reach: 1.08, dmg: 0.86, kb: 1, spd: 0.95, rad: 1.05 },
    specials: {
      nspec: { name: 'Spark Orb', d: 30, hold: { at: 4, max: 90, btn: 'b' }, kf: [[0, STAND], [4, P(-2, -25, -0.05, 6, -18, -6, -10, 7, 25, -7, 25, -60)], [10, P(2, -25, 0.25, 24, -4, -10, 8, 8, 25, -8, 25, 0)], [30, STAND]],
        go: (f, t) => { if (t === 9) { const c = f.chg; spawnProj('orb', f, f.x + f.face * 28, f.y - 42, f.face * (6 + 4 * c), 0, { c }); Audio2.play('shoot'); } if (f.air) f.vy = Math.min(f.vy, 1.2); } },
      sspec: { name: 'Arc Bolt', d: 30, kf: [[0, STAND], [6, P(-2, -25, -0.1, -8, -10, -8, 10, 8, 25, -8, 25, -30)], [9, P(4, -25, 0.3, 26, -2, -8, 10, 10, 25, -10, 25, 0)], [30, STAND]],
        go: (f, t) => { if (t === 9) { spawnProj('bolt', f, f.x + f.face * 28, f.y - 42, f.face * 18, 0); Audio2.play('shoot'); } if (f.air) f.vy = Math.min(f.vy, 0.8); } },
      uspec: { name: 'Blink', d: 30, helpless: 1, kf: [[0, POSE.crouch], [8, POSE.dodge], [30, POSE.fall]],
        hb: [HB(10, 12, 0, -30, 26, 5, 70, 45, 50, { fx: 'spark' })], go: (f, t) => { f.vx *= 0.8; f.vy = Math.min(f.vy, 0.5); if (t < 10) f.intang = 2; if (t === 8) { let dx = f.inp.mx, dy = f.inp.my; if (Math.hypot(dx, dy) < 0.3) { dx = 0; dy = -1; } const m = Math.hypot(dx, dy); FX.burst(f.x, f.y - 30, '#7dff8a', 12); f.teleport(f.x + dx / m * 150, f.y + dy / m * 150); FX.burst(f.x, f.y - 30, '#7dff8a', 12); Audio2.play('portal'); f.air = 1; } } },
      dspec: { name: 'Rune Mine', d: 26, kf: [[0, STAND], [10, P(0, -18, 0.4, 14, 18, -6, 14, 10, 18, -10, 18, 90)], [26, STAND]],
        go: (f, t) => { if (t === 10) { const mines = World.projs.filter(p => p.type === 'mine' && p.owner === f); if (mines.length >= 2) mines[0].life = 0; spawnProj('mine', f, f.x + f.face * 16, f.y - 8, 0, f.air ? 2 : 0); Audio2.play('blip'); } } },
    }
  },
  {
    id: 3, name: 'GROM', title: 'The Hammer', color: '#f2a33a', dark: '#a66510', weapon: 'hammer',
    blurb: 'Slow, heavy, and devastating. Boomerang hammer, armored charge, quakes.',
    stats: { run: 5.0, air: 3.9, acc: 0.65, aacc: 0.4, grav: 0.62, fall: 11.5, ffall: 15.5, jump: 11.8, djump: 10.8, jumps: 1, weight: 124 },
    mul: { reach: 1.3, dmg: 1.3, kb: 1.08, spd: 1.22, rad: 1.25 },
    specials: {
      nspec: { name: 'Hammer Toss', d: 32, kf: [[0, STAND], [6, P(-4, -25, -0.25, -14, -18, -8, 10, 10, 25, -10, 25, -150)], [12, P(4, -25, 0.3, 26, -4, -8, 10, 12, 25, -12, 25, 0)], [32, STAND]],
        go: (f, t) => { if (t === 12 && !f.hammerOut) { f.hammerOut = spawnProj('hammer', f, f.x + f.face * 30, f.y - 44, f.face * 12, -1); Audio2.play('swing'); } if (f.air) f.vy = Math.min(f.vy, 1.5); } },
      sspec: { name: 'Bull Charge', d: 52, airOnce: 1, kf: [[0, STAND], [10, P(-6, -22, 0.6, 12, 6, -4, 10, 18, 20, -20, 20, 120)], [34, P(6, -22, 0.7, 14, 6, -4, 10, 22, 18, -22, 20, 120)], [52, STAND]],
        hb: [HB(10, 34, 24, -34, 22, 12, 40, 45, 80)], armor: [6, 34], go: (f, t) => { if (t >= 10 && t <= 34) { f.vx = f.face * 10.5; if (t % 4 === 0) FX.dust(f.x - f.face * 10, f.y); } if (t === 35) f.vx *= 0.2; if (f.air) f.vy = Math.min(f.vy, 1); } },
      uspec: { name: 'Blast Jump', d: 46, helpless: 1, kf: [[0, POSE.crouch], [8, P(0, -28, 0, 10, -26, -10, -26, 6, 24, -6, 24, -90)], [46, POSE.fall]],
        hb: [HB(8, 11, 0, 4, 40, 11, 270, 45, 70, { fx: 'fire' })], go: (f, t) => { if (t === 8) { f.vy = -15.5; f.air = 1; FX.explode(f.x, f.y, 50); Audio2.play('boom'); World.shake(6); } if (t > 8) f.vx = lerp(f.vx, f.inp.mx * 3.5, 0.08); } },
      dspec: { name: 'Quake', d: 46, untilLand: 1, airTo: 'quakeDrop', kf: [[0, STAND], [14, P(0, -28, -0.2, 6, -28, -4, -28, 6, 25, -6, 25, -90)], [19, P(0, -16, 0.6, 26, 12, 20, 12, 12, 16, -12, 16, 90)], [46, STAND]],
        hb: [HB(19, 22, 34, -10, 24, 12, 80, 50, 70)], go: (f, t) => { if (t === 19) { spawnProj('shock', f, f.x + 24, f.y - 10, 8, 0); spawnProj('shock', f, f.x - 24, f.y - 10, -8, 0); FX.ring(f.x + f.face * 30, f.y, 50, '#ffcf70'); Audio2.play('boom'); World.shake(7); } } },
      quakeDrop: { d: 80, untilLand: 1, land: 'quakeLand', kf: [[0, P(0, -28, -0.2, 6, -28, -4, -28, 6, 25, -6, 25, -90)], [80, P(0, -28, -0.2, 6, -28, -4, -28, 6, 25, -6, 25, -90)]], hb: [HB(8, 80, 0, 0, 20, 10, -70, 30, 60, { spike: 1 })], go: (f, t) => { if (t < 8) f.vy = -1; if (t >= 8) f.vy = 15; } },
      quakeLand: { d: 34, kf: [[0, P(0, -16, 0.6, 26, 12, 20, 12, 12, 16, -12, 16, 90)], [34, STAND]], hb: [HB(1, 4, 30, -10, 26, 10, 80, 50, 70)], go: (f, t) => { if (t === 1) { spawnProj('shock', f, f.x + 24, f.y - 10, 8, 0); spawnProj('shock', f, f.x - 24, f.y - 10, -8, 0); Audio2.play('boom'); World.shake(8); } } },
    }
  },
];
// Build complete move tables with per-fighter scaling
const HB_SCALE = 1.35; // generous player hitboxes
for (const F of FIGHTERS) {
  const base = baseMoves(); const m = F.mul; F.moves = {};
  for (const [k, mv] of Object.entries(base)) {
    const nm = { ...mv, name: k }; if (mv.thr) nm.thr = { ...mv.thr, at: Math.round(mv.thr.at * m.spd) };
    nm.d = Math.round(mv.d * m.spd);
    const sc = m.spd; nm.kf = mv.kf.map(([f, p]) => [Math.round(f * sc), p]);
    if (mv.charge) nm.charge = Math.round(mv.charge * sc);
    nm.hb = mv.hb.map(h => ({ ...h, s: Math.round(h.s * sc), e: Math.max(Math.round(h.s * sc) + 1, Math.round(h.e * sc)), x: h.x * m.reach, y: h.y, r: h.r * m.rad * (F.weapon === 'none' ? 1 : 1.08) * HB_SCALE, d: Math.round(h.d * m.dmg), bkb: h.bkb, kbg: h.kbg * m.kb }));
    F.moves[k] = nm;
  }
  // Signature tweaks
  if (F.id === 1) { F.moves.dair.hb[0].a = -90; F.moves.utilt.hb[0].r *= 1.2; F.moves.fsmash.hb[0].d = 17; }
  if (F.id === 2) Object.assign(F.moves, pipMagic());
  if (F.id === 3) { F.moves.fsmash.hb[0].d = 24; F.moves.fsmash.hb[0].r *= 1.15; F.moves.dair.hb[0].d = 16; }
  for (const [k, mv] of Object.entries(F.specials)) F.moves[k] = { ...mv, name: k, hb: (mv.hb || []).map(h => ({ ...h, r: h.r * HB_SCALE })), special: 1 };
}

// ---- Pip's elemental spellbook: every normal is a short-range spell with an effect ----
// el: fire = burn over time, ice = freeze (extra stun), shock = stun, wind = big push, arcane = raw power
function pipMagic() {
  const S = STAND, k = HB_SCALE, M = {};
  const mk = (name, d, kf, hb, extra = {}) => { M[name] = { name, d, kf, hb: hb.map(h => ({ ...h, r: h.r * k })), ...extra }; };
  const cast = (hx, hy, w, lean = 0.2) => P(2, -25, lean, hx, hy, -8, 10, 9, 25, -9, 25, w);
  mk('jab1', 12, [[0, S], [3, cast(24, -4, 0)], [7, cast(24, -4, 0)], [12, S]], [HB(3, 5, 30, -46, 11, 3, 30, 14, 20, { el: 'shock' })], { jab: 1, spell: 'Spark Jab' });
  mk('jab2', 12, [[0, S], [3, cast(24, 2, 10)], [7, cast(24, 2, 10)], [12, S]], [HB(3, 5, 30, -42, 11, 3, 35, 16, 20, { el: 'shock' })], { jab: 2, spell: 'Spark Jab' });
  mk('jab3', 26, [[0, S], [5, cast(28, -6, -10, 0.35)], [12, cast(28, -6, -10, 0.35)], [26, S]], [HB(5, 9, 40, -44, 20, 6, 40, 45, 80, { el: 'shock', stun: 10 })], { spell: 'Spark Burst' });
  mk('ftilt', 30, [[0, S], [5, cast(26, 0, 0, 0.3)], [20, cast(26, 0, 0, 0.3)], [30, S]], [HB(5, 16, 36, -42, 18, 2, 30, 10, 0, { el: 'fire', multi: 4 }), HB(17, 19, 44, -42, 22, 4, 40, 45, 75, { el: 'fire' })], { spell: 'Flame Palm' });
  mk('utilt', 26, [[0, S], [5, P(0, -26, -0.05, 4, -26, -6, 10, 6, 25, -6, 25, -90)], [14, P(0, -26, -0.05, 4, -26, -6, 10, 6, 25, -6, 25, -90)], [26, S]], [HB(6, 12, 4, -84, 18, 7, 88, 35, 95, { el: 'ice' })], { spell: 'Frost Spire' });
  mk('dtilt', 20, [[0, POSE.crouch], [4, P(0, -14, 0.5, 24, 14, -6, 12, 14, 14, -12, 14, 20)], [10, P(0, -14, 0.5, 24, 14, -6, 12, 14, 14, -12, 14, 20)], [20, POSE.crouch]], [HB(4, 9, 38, -6, 15, 5, 80, 30, 60, { el: 'ice' })], { crouchEnd: 1, spell: 'Frost Sweep' });
  mk('dash', 32, [[0, S], [4, POSE.dodge], [8, cast(20, 0, 0, 0.4)], [20, cast(20, 0, 0, 0.4)], [32, S]], [HB(8, 12, 0, -32, 28, 8, 50, 45, 70, { el: 'shock' })], { dash: 1, spell: 'Blink Strike', go: (f, t) => { if (t === 6) { FX.burst(f.x, f.y - 30, '#d8ffb0', 10); f.teleport(f.x + f.face * 70, f.y); FX.burst(f.x, f.y - 30, '#d8ffb0', 10); Audio2.play('portal'); } if (t < 6) f.intang = 2; } });
  mk('fsmash', 46, [[0, S], [8, P(-4, -24, -0.25, -8, -18, 8, 6, 12, 25, -12, 25, -110)], [14, cast(30, -4, 0, 0.45)], [26, cast(30, -4, 0, 0.45)], [46, S]], [HB(14, 18, 44, -42, 30, 17, 40, 40, 100, { el: 'arcane' })], { charge: 8, smash: 1, spell: 'Arcane Nova', go: (f, t) => { if (t === 14) { FX.ring(f.x + f.face * 44, f.y - 42, 50, '#c77dff'); World.shake(5); } } });
  mk('usmash', 44, [[0, S], [6, POSE.crouch], [10, P(0, -28, -0.05, 2, -28, -2, -26, 4, 27, -4, 27, -90)], [26, P(0, -28, -0.05, 2, -28, -2, -26, 4, 27, -4, 27, -90)], [44, S]], [HB(10, 20, 0, -76, 22, 2, 90, 25, 0, { el: 'shock', multi: 3 }), HB(21, 24, 0, -96, 26, 7, 88, 45, 100, { el: 'shock' })], { charge: 6, smash: 1, spell: 'Thunder Pillar' });
  mk('dsmash', 42, [[0, S], [6, P(0, -18, 0.1, 10, 12, -10, 12, 6, 18, -6, 18, 80)], [11, P(0, -16, 0, 6, 20, -6, 20, 14, 16, -14, 16, 90)], [24, P(0, -16, 0, 6, 20, -6, 20, 14, 16, -14, 16, 90)], [42, S]], [HB(11, 14, 34, -8, 22, 13, 30, 35, 95, { el: 'arcane' }), HB(11, 14, -34, -8, 22, 13, 150, 35, 95, { el: 'arcane' })], { charge: 6, smash: 1, spell: 'Rune Circle', go: (f, t) => { if (t === 11) FX.ring(f.x, f.y - 4, 60, '#c77dff'); } });
  mk('nair', 30, [[0, POSE.jump], [4, P(0, -26, 0, 18, -6, -18, -6, 14, 8, -14, 8, 0)], [24, P(0, -26, 0, 18, -6, -18, -6, 14, 8, -14, 8, 720)], [30, POSE.jump]], [HB(4, 22, 0, -30, 26, 2, 70, 30, 0, { multi: 4, el: 'arcane' }), HB(23, 25, 0, -30, 28, 5, 45, 40, 80, { el: 'arcane' })], { air: 1, lag: 8, spell: 'Rune Orbit' });
  mk('fair', 32, [[0, POSE.jump], [6, P(0, -26, -0.2, -6, -16, -10, 8, 10, 18, -8, 20, -100)], [10, P(0, -26, 0.4, 26, 0, -10, 8, 10, 18, -8, 20, 0)], [20, P(0, -26, 0.4, 26, 0, -10, 8, 10, 18, -8, 20, 0)], [32, POSE.jump]], [HB(9, 13, 34, -36, 20, 10, 40, 30, 90, { el: 'fire' })], { air: 1, lag: 10, spell: 'Fireball Palm' });
  mk('bair', 28, [[0, POSE.jump], [6, P(2, -26, 0.3, -24, -2, -20, 4, 8, 16, -6, 18, 180)], [14, P(2, -26, 0.3, -24, -2, -20, 4, 8, 16, -6, 18, 180)], [28, POSE.jump]], [HB(6, 11, -36, -32, 24, 6, 150, 70, 60, { el: 'wind' })], { air: 1, lag: 9, spell: 'Gust' });
  mk('uair', 26, [[0, POSE.jump], [5, P(0, -26, -0.2, 4, -28, -4, -26, 6, 18, -6, 18, -90)], [12, P(0, -26, -0.2, 4, -28, -4, -26, 6, 18, -6, 18, -90)], [26, POSE.jump]], [HB(5, 10, 0, -76, 20, 8, 85, 30, 95, { el: 'arcane' })], { air: 1, lag: 8, spell: 'Starburst' });
  mk('dair', 38, [[0, POSE.jump], [6, P(0, -30, 0, 10, -14, -10, -14, 6, 14, -6, 14, -90)], [12, P(0, -30, 0, 6, 26, -6, 26, 6, 14, -6, 14, 90)], [22, P(0, -30, 0, 6, 26, -6, 26, 6, 14, -6, 14, 90)], [38, POSE.jump]], [HB(6, 11, 0, 10, 26, 2, 90, 20, 0, { el: 'arcane', pull: 1 }), HB(12, 16, 0, 8, 20, 11, -80, 25, 85, { el: 'arcane', spike: 1 })], { air: 1, lag: 14, spell: 'Gravity Well' });
  return M;
}
