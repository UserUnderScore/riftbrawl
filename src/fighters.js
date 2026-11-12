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
const J_ = POSE.jump;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
// Blend two poses with the hands and feet travelling along arcs around the shoulder / hip (as real limbs swing),
// instead of sliding in straight lines. Very wide swings (near a half-turn, where the direction is ambiguous) fall back to a straight blend.
function arcMix(a, b, t) {
  const o = mix(a, b, t);
  for (let i = 3; i < 11; i += 2) {
    const ra = Math.hypot(a[i], a[i + 1]), rb = Math.hypot(b[i], b[i + 1]); if (ra < 5 || rb < 5) continue;
    let d = Math.atan2(b[i + 1], b[i]) - Math.atan2(a[i + 1], a[i]); if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
    const w = clamp((2.7 - Math.abs(d)) / 0.6, 0, 1); if (w <= 0 || Math.abs(d) < 0.12) continue;
    const th = Math.atan2(a[i + 1], a[i]) + d * t, r = ra + (rb - ra) * t;
    o[i] += (Math.cos(th) * r - o[i]) * w; o[i + 1] += (Math.sin(th) * r - o[i + 1]) * w;
  }
  return o;
}
function kfPose(kf, f) {
  if (f <= kf[0][0]) return kf[0][1];
  for (let i = 0; i < kf.length - 1; i++) {
    const [fa, pa] = kf[i], [fb, pb] = kf[i + 1];
    if (f <= fb) { let t = clamp((f - fa) / Math.max(1, fb - fa), 0, 1); const ez = kf[i + 1][2]; t = ez === 'snap' ? 1 - Math.pow(1 - t, 4) : ez === 'slow' ? Math.pow(t * t * (3 - 2 * t), 1.6) : t * t * (3 - 2 * t); return arcMix(pa, pb, t); }
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
const HB_SCALE = 1.75; // very generous player hitboxes (attacks should connect where they look like they do)
const HB_REACH = 1.12, HB_LINGER = 2; // push hitboxes a little further out and keep them active a couple frames longer
function growHB(h) { return { ...h, x: h.x * HB_REACH, y: h.y < -20 ? h.y : h.y, r: h.r * HB_SCALE, e: h.e + (h.multi ? 0 : HB_LINGER) }; }
function snapStrikes(mv) { // make the keyframe that lands on the first active frame a fast 'snap'
  if (!mv.hb || !mv.hb.length || !mv.kf) return mv; const s0 = Math.min(...mv.hb.map(h => h.s)); let bi = -1, bd = 99;
  mv.kf.forEach((k, i) => { if (i > 0 && Math.abs(k[0] - s0) < bd && k[0] <= s0 + 2) { bd = Math.abs(k[0] - s0); bi = i; } });
  if (bi > 0 && !mv.kf[bi][2]) mv.kf = mv.kf.map((k, i) => i === bi ? [k[0], k[1], 'snap'] : k);
  if (bi > 1 && !mv.kf[bi - 1][2] && (mv.smash || mv.heavy)) mv.kf = mv.kf.map((k, i) => i === bi - 1 ? [k[0], k[1], 'slow'] : k);
  return mv;
}
const SIGNATURE = { 0: rookMoves, 1: velaMoves, 3: gromMoves, 2: pipMagic };
for (const F of FIGHTERS) {
  const base = baseMoves(); const m = F.mul; F.moves = {};
  for (const [k, mv] of Object.entries(base)) {
    const nm = { ...mv, name: k }; if (mv.thr) nm.thr = { ...mv.thr, at: Math.round(mv.thr.at * m.spd) };
    nm.d = Math.round(mv.d * m.spd);
    const sc = m.spd; nm.kf = mv.kf.map(([f, p, e]) => [Math.round(f * sc), p, e]);
    if (mv.charge) nm.charge = Math.round(mv.charge * sc);
    nm.hb = mv.hb.map(h => ({ ...h, s: Math.round(h.s * sc), e: Math.max(Math.round(h.s * sc) + 1, Math.round(h.e * sc)), x: h.x * m.reach, y: h.y, r: h.r * m.rad * (F.weapon === 'none' ? 1 : 1.08), d: Math.round(h.d * m.dmg), bkb: h.bkb, kbg: h.kbg * m.kb }));
    F.moves[k] = nm;
  }
  // signature movesets replace the shared templates
  Object.assign(F.moves, SIGNATURE[F.id](), tauntMoves(F.id));
  if (F.id === 3) for (const k of ['grab', 'getupatk']) F.moves[k].heavy = 1;
  { const g = F.moves.grab; F.moves.dashgrab = { ...g, name: 'dashgrab', d: 38, dash: 1, kf: [[0, STAND], [6, P(10, -22, 0.6, 30, 4, 24, 8, 18, 22, -16, 22, 0)], [12, P(10, -22, 0.6, 30, 4, 24, 8, 18, 22, -16, 22, 0)], [38, STAND]], hb: g.hb.map(h => ({ ...h, s: 7, e: 11, x: h.x * 1.35 })) }; } // dash grab: longer reach, slides
  for (const [k, mv] of Object.entries(F.moves)) { mv.hb = mv.hb.map(h => h.grab ? { ...h, r: h.r * 1.35 } : growHB(h)); enrichMove(snapStrikes(mv)); }
  for (const [k, mv] of Object.entries(F.specials)) F.moves[k] = enrichMove(snapStrikes({ ...mv, name: k, hb: (mv.hb || []).map(growHB), special: 1 }));
}

// ---- Pip's elemental spellbook: every normal is a short-range spell with an effect ----
// el: fire = burn over time, ice = freeze (extra stun), shock = stun, wind = big push, arcane = raw power
function pipMagic() {
  const S = STAND, k = HB_SCALE, M = {};
  const mk = (name, d, kf, hb, extra = {}) => { M[name] = { name, d, kf, hb: hb.map(h => ({ ...h })), ...extra }; };
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

// ===================== Signature movesets =====================
// kf entries may carry a 3rd element: 'snap' (fast strike that settles) or 'slow' (heavy, weighted wind-up).
// Moves flagged heavy get anticipation, impact shake, dust & cracks; agile moves get afterimages, speed lines & snappy stretch.
function mkSet(fn) { const M = {}; fn((name, d, kf, hb, extra = {}) => { M[name] = { name, d, kf, hb: hb.map(h => ({ ...h })), ...extra }; }); return M; }
function rookMoves() {
  const S = STAND;
  return mkSet(mk => {
    const pA = P(4, -25, 0.2, 24, -4, -4, 10, 8, 25, -8, 25, 0), pB = P(4, -25, 0.2, -2, 10, 24, -2, 8, 25, -8, 25, 0);
    mk('jab1', 12, [[0, S], [2, P(2, -25, 0.14, 23, -2, -6, 12, 7, 25, -7, 25, 0), 'snap'], [6, P(2, -25, 0.14, 23, -2, -6, 12, 7, 25, -7, 25, 0)], [12, S]], [HB(2, 5, 26, -47, 11, 3, 30, 14, 25)], { jab: 1, agile: 1 });
    mk('jab2', 12, [[0, S], [2, P(4, -25, 0.2, -2, 8, 24, -2, 8, 25, -8, 25, 0), 'snap'], [6, P(4, -25, 0.2, -2, 8, 24, -2, 8, 25, -8, 25, 0)], [12, S]], [HB(2, 5, 27, -46, 11, 3, 35, 16, 25)], { jab: 2, agile: 1 });
    mk('jab3', 34, [[0, S], [3, pA, 'snap'], [6, pB, 'snap'], [9, pA, 'snap'], [12, pB, 'snap'], [15, pA, 'snap'], [18, pB, 'snap'], [21, P(6, -28, -0.05, 20, -26, -6, 8, 10, 25, -8, 25, -90), 'snap'], [26, P(6, -28, -0.05, 20, -26, -6, 8, 10, 25, -8, 25, -90)], [34, S]],
      [HB(3, 18, 28, -45, 13, 1.5, 70, 8, 0, { multi: 3 }), HB(21, 24, 30, -54, 15, 5, 55, 55, 100, { fx: 'fire' })], { agile: 1, title: 'Flurry' });
    mk('ftilt', 24, [[0, S], [3, P(-2, -26, -0.2, -8, 4, -10, 6, 6, 25, -6, 25, 0)], [6, P(6, -27, -0.35, -10, 2, -12, 6, 32, -8, -4, 25, 0), 'snap'], [12, P(6, -27, -0.35, -10, 2, -12, 6, 32, -8, -4, 25, 0)], [24, S]],
      [HB(6, 10, 38, -33, 13, 9, 38, 32, 95)], { agile: 1, go: (f, t) => { if (t === 4 && !f.air) f.vx = f.face * 5.5; } });
    mk('dtilt', 18, [[0, POSE.crouch], [4, P(0, -12, 0.5, 10, 14, -6, 12, 34, 12, -12, 14, 10), 'snap'], [9, P(0, -12, 0.5, 10, 14, -6, 12, 34, 12, -12, 14, 10)], [18, POSE.crouch]], [HB(4, 8, 36, -5, 13, 6, 18, 40, 40, { trip: 1 })], { crouchEnd: 1, agile: 1 });
    mk('dash', 30, [[0, S], [4, P(6, -34, 0.1, 8, -6, -12, 4, 22, -10, -8, 22, 0), 'snap'], [14, P(6, -34, 0.1, 8, -6, -12, 4, 22, -10, -8, 22, 0)], [30, S]],
      [HB(4, 8, 24, -38, 15, 12, 45, 55, 88), HB(9, 15, 24, -38, 13, 6, 55, 40, 50)], { dash: 1, agile: 1, title: 'Flying Knee' });
    mk('fsmash', 46, [[0, S], [8, P(-8, -23, -0.4, -18, 2, 10, 4, 14, 25, -14, 25, 0), 'slow'], [13, P(10, -24, 0.55, 34, -6, -14, 8, 22, 24, -18, 24, 0), 'snap'], [24, P(10, -24, 0.55, 34, -6, -14, 8, 22, 24, -18, 24, 0)], [46, S]],
      [HB(13, 17, 46, -47, 16, 17, 38, 42, 102, { fx: 'fire' })], { charge: 8, smash: 1, heavy: 1, title: 'Haymaker', go: (f, t) => { if (t === 12 && !f.air) f.vx = f.face * 7; } });
    mk('usmash', 42, [[0, S], [6, POSE.crouch], [10, P(0, -30, -0.6, -10, 8, -14, 4, 10, -34, -6, 20, 0), 'snap'], [16, P(0, -30, -1.3, -14, -4, -10, -8, 4, -36, -6, 14, 0)], [26, P(0, -27, -0.3, -10, 4, -12, 4, 6, 20, -6, 24, 0)], [42, S]],
      [HB(10, 13, 10, -78, 15, 6, 88, 30, 50), HB(14, 18, 0, -86, 18, 11, 90, 38, 102)], { charge: 6, smash: 1, agile: 1, flip: [21, 33], title: 'Flip Kick' });
    mk('dsmash', 44, [[0, S], [6, POSE.crouch], [11, P(0, -12, 0.6, 10, 16, -6, 16, 34, 6, -14, 10, 0), 'snap'], [15, P(0, -12, 0.6, 10, 16, -6, 16, -34, 6, 10, 10, 0), 'snap'], [26, P(0, -12, 0.6, 10, 16, -6, 16, -34, 6, 10, 10, 0)], [44, S]],
      [HB(11, 14, 36, -6, 14, 12, 30, 35, 95), HB(15, 18, -36, -6, 14, 12, 150, 35, 95)], { charge: 6, smash: 1, agile: 1, title: 'Breakdance Sweep' });
    mk('nair', 32, [[0, J_], [4, P(0, -26, 0, 18, -6, -18, -6, 22, 2, -22, 2, 0), 'snap'], [20, P(0, -26, 0, 18, -6, -18, -6, 22, 2, -22, 2, 0)], [32, J_]],
      [HB(4, 18, 0, -30, 24, 2, 60, 15, 0, { multi: 4 }), HB(19, 22, 0, -30, 26, 5, 45, 40, 82)], { air: 1, lag: 8, agile: 1, spin: 1, title: 'Tornado Kick' });
    mk('fair', 32, [[0, J_], [5, P(0, -26, 0.3, 24, -2, -8, 8, 10, 16, -10, 18, 0), 'snap'], [10, P(0, -26, 0.3, -4, 8, 24, -2, 10, 16, -10, 18, 0), 'snap'], [16, P(0, -26, 0.35, 26, 4, -6, 10, 10, 16, -10, 18, 0), 'snap'], [32, J_]],
      [HB(5, 7, 28, -42, 13, 4, 75, 30, 15), HB(10, 12, 28, -42, 13, 4, 75, 30, 15), HB(16, 19, 30, -40, 16, 8, 40, 34, 98)], { air: 1, lag: 10, agile: 1, title: 'Triple Hook' });
    mk('bair', 28, [[0, J_], [6, P(2, -26, 0.45, 10, 4, 6, 8, -34, -6, 6, 14, 120), 'snap'], [13, P(2, -26, 0.45, 10, 4, 6, 8, -34, -6, 6, 14, 120)], [28, J_]],
      [HB(6, 10, -36, -30, 14, 14, 145, 34, 104)], { air: 1, lag: 10, heavy: 1, title: 'Mule Kick' });
    mk('uair', 26, [[0, J_], [4, P(0, -26, -0.3, -10, 4, 10, 4, 10, -40, -6, 16, -90), 'snap'], [9, P(0, -26, -0.3, -10, 4, 10, 4, -8, -42, 6, 14, -90), 'snap'], [14, P(0, -26, -0.3, -10, 4, 10, 4, -8, -42, 6, 14, -90)], [26, J_]],
      [HB(4, 7, 8, -72, 14, 4, 85, 40, 20), HB(9, 13, -4, -76, 16, 8, 88, 30, 100)], { air: 1, lag: 8, agile: 1, title: 'Scissor Kick' });
    mk('dair', 36, [[0, J_], [7, P(0, -32, 0, 10, -14, -10, -14, 6, 4, -6, 6, -90), 'slow'], [11, P(0, -30, 0, 12, -4, -12, -4, 4, 34, -4, 32, 90), 'snap'], [22, P(0, -30, 0, 12, -4, -12, -4, 4, 34, -4, 32, 90)], [36, J_]],
      [HB(11, 16, 0, 8, 16, 12, -85, 22, 86, { spike: 1, bounce: 1 })], { air: 1, lag: 14, heavy: 1, title: 'Stomp' });
  });
}
function velaMoves() {
  const S = STAND;
  return mkSet(mk => {
    const th1 = P(2, -25, 0.16, 20, -2, -6, 12, 7, 25, -7, 25, 0), th2 = P(4, -25, 0.2, 22, -6, -6, 12, 8, 25, -8, 25, -8), th3 = P(4, -25, 0.2, 22, 2, -6, 12, 8, 25, -8, 25, 8);
    mk('jab1', 12, [[0, S], [2, th1, 'snap'], [6, th1], [12, S]], [HB(2, 5, 54, -47, 11, 3, 30, 14, 25, { fx: 'slash' })], { jab: 1, agile: 1 });
    mk('jab2', 12, [[0, S], [2, P(3, -25, 0.15, 18, 4, -6, 10, 7, 25, -7, 25, -28), 'snap'], [6, P(3, -25, 0.15, 18, 4, -6, 10, 7, 25, -7, 25, -28)], [12, S]], [HB(2, 5, 50, -58, 12, 3, 40, 16, 25, { fx: 'slash' })], { jab: 2, agile: 1 });
    mk('jab3', 34, [[0, S], [3, th2, 'snap'], [5, P(0, -25, 0.1, 10, 0, -6, 12, 8, 25, -8, 25, 0)], [7, th3, 'snap'], [9, P(0, -25, 0.1, 10, 0, -6, 12, 8, 25, -8, 25, 0)], [11, th1, 'snap'], [13, P(0, -25, 0.1, 10, 0, -6, 12, 8, 25, -8, 25, 0)], [15, th2, 'snap'], [18, P(-2, -25, -0.1, 0, -6, -6, 10, 8, 25, -8, 25, -20)], [21, P(10, -24, 0.45, 26, -2, -14, 6, 22, 25, -18, 25, 0), 'snap'], [26, P(10, -24, 0.45, 26, -2, -14, 6, 22, 25, -18, 25, 0)], [34, S]],
      [HB(3, 17, 56, -46, 14, 1.5, 70, 8, 0, { multi: 3, fx: 'slash' }), HB(21, 24, 66, -46, 16, 5, 40, 55, 100, { fx: 'slash' })], { agile: 1, title: 'Hundred Stabs' });
    mk('ftilt', 26, [[0, S], [4, P(-4, -24, -0.1, -6, 4, -10, 8, 8, 25, -8, 25, 0)], [7, P(12, -22, 0.45, 24, -2, -14, 6, 26, 25, -22, 25, 0), 'snap'], [14, P(12, -22, 0.45, 24, -2, -14, 6, 26, 25, -22, 25, 0)], [26, S]],
      [HB(7, 10, 80, -44, 13, 12, 35, 36, 102, { fx: 'slash', grp: 0 }), HB(7, 10, 46, -44, 13, 7, 40, 30, 80, { grp: 0 })], { agile: 1, title: 'Lunge (tip = sweetspot)', go: (f, t) => { if (t === 6 && !f.air) f.vx = f.face * 4.5; } });
    mk('utilt', 24, [[0, S], [3, P(0, -25, 0.1, 18, 0, -6, 10, 6, 25, -6, 25, 10)], [6, P(0, -26, 0, 6, -20, -6, 10, 6, 25, -6, 25, -80), 'snap'], [9, P(0, -26, -0.1, -10, -16, -6, 10, 6, 25, -6, 25, -160), 'snap'], [24, S]],
      [HB(4, 5, 54, -56, 14, 8, 80, 32, 110, { grp: 0, fx: 'slash' }), HB(6, 7, 8, -96, 16, 8, 90, 32, 110, { grp: 0, fx: 'slash' }), HB(8, 10, -44, -72, 14, 8, 110, 32, 110, { grp: 0, fx: 'slash' })], { agile: 1, title: 'Arc Slash' });
    mk('dtilt', 18, [[0, POSE.crouch], [4, P(0, -13, 0.45, 22, 14, -6, 12, 18, 12, -12, 14, 10), 'snap'], [9, P(0, -13, 0.45, 22, 14, -6, 12, 18, 12, -12, 14, 10)], [18, POSE.crouch]],
      [HB(4, 8, 62, -10, 13, 7, 25, 35, 65, { grp: 0, fx: 'slash', trip: 1 }), HB(4, 8, 32, -10, 12, 5, 30, 30, 60, { grp: 0, trip: 1 })], { crouchEnd: 1, agile: 1 });
    mk('dash', 30, [[0, S], [3, P(4, -20, 0.7, -14, 6, -10, 8, 18, 20, -22, 18, 170)], [7, P(10, -21, 0.6, 26, 2, -14, 6, 22, 18, -22, 18, 10), 'snap'], [16, P(10, -21, 0.6, 26, 2, -14, 6, 22, 18, -22, 18, 10)], [30, S]],
      [HB(6, 13, 34, -36, 22, 10, 45, 45, 82, { fx: 'slash' })], { dash: 1, agile: 1, title: 'Passing Slash', go: (f, t) => { if (t >= 4 && t < 14) f.vx = f.face * 9; } });
    mk('fsmash', 48, [[0, S], [8, P(-6, -24, -0.35, -6, -22, 10, 6, 12, 25, -14, 25, -140), 'slow'], [11, P(6, -24, 0.3, 22, -14, -14, 8, 20, 25, -16, 25, -40), 'snap'], [14, P(10, -23, 0.55, 26, 6, -14, 8, 22, 24, -18, 24, 40), 'snap'], [26, P(10, -23, 0.55, 26, 6, -14, 8, 22, 24, -18, 24, 40)], [48, S]],
      [HB(11, 12, 58, -84, 18, 18, 40, 40, 100, { grp: 0, fx: 'slash' }), HB(13, 15, 72, -42, 20, 18, 38, 42, 102, { grp: 0, fx: 'slash' })], { charge: 8, smash: 1, agile: 1, title: 'Crescent Cleave' });
    mk('usmash', 42, [[0, S], [6, P(0, -18, 0.3, 16, 14, -6, 12, 12, 16, -12, 16, 30)], [11, P(0, -27, 0.1, 20, -8, -6, 8, 6, 27, -6, 27, -30), 'snap'], [13, P(0, -29, 0, 4, -26, -4, 8, 6, 27, -6, 27, -90), 'snap'], [16, P(0, -28, -0.15, -14, -16, -4, 8, 6, 27, -6, 27, -150), 'snap'], [26, P(0, -28, -0.15, -14, -16, -4, 8, 6, 27, -6, 27, -150)], [42, S]],
      [HB(11, 12, 54, -44, 16, 14, 85, 36, 100, { grp: 0, fx: 'slash' }), HB(13, 15, 6, -102, 20, 15, 90, 36, 100, { grp: 0, fx: 'slash' }), HB(16, 18, -50, -60, 16, 13, 95, 36, 100, { grp: 0, fx: 'slash' })], { charge: 6, smash: 1, agile: 1, title: 'Rising Moon' });
    mk('dsmash', 42, [[0, S], [6, P(0, -18, 0.1, 10, 12, -10, 12, 6, 18, -6, 18, 80)], [11, P(0, -12, 0.3, 22, 14, -10, 12, 26, 10, -26, 10, 8), 'snap'], [15, P(0, -12, -0.3, -22, 14, 10, 12, 26, 10, -26, 10, 172), 'snap'], [24, P(0, -12, -0.3, -22, 14, 10, 12, 26, 10, -26, 10, 172)], [42, S]],
      [HB(11, 13, 62, -8, 15, 13, 25, 35, 95, { fx: 'slash' }), HB(15, 17, -62, -8, 15, 12, 155, 35, 95, { fx: 'slash' })], { charge: 6, smash: 1, agile: 1, title: 'Spin Sweep' });
    mk('fair', 30, [[0, J_], [4, P(0, -26, -0.2, 10, -20, -8, 6, 10, 16, -10, 18, -100)], [7, P(0, -26, 0.2, 22, -6, -8, 8, 10, 16, -12, 16, -20), 'snap'], [10, P(0, -26, 0.35, 18, 12, -8, 8, 10, 16, -12, 16, 60), 'snap'], [18, P(0, -26, 0.35, 18, 12, -8, 8, 10, 16, -12, 16, 60)], [30, J_]],
      [HB(6, 7, 42, -88, 15, 10, 45, 30, 95, { grp: 0, fx: 'slash' }), HB(8, 9, 66, -50, 16, 11, 40, 30, 98, { grp: 0, fx: 'slash' }), HB(10, 12, 50, -12, 15, 10, 30, 30, 90, { grp: 0, fx: 'slash' })], { air: 1, lag: 10, agile: 1, title: 'Crescent Fair' });
    mk('bair', 28, [[0, J_], [5, P(2, -26, 0.2, 10, -10, 6, 8, 8, 16, 6, 14, -60)], [8, P(2, -26, 0.35, -20, -4, 6, 8, -8, 16, 6, 14, 180), 'snap'], [15, P(2, -26, 0.35, -20, -4, 6, 8, -8, 16, 6, 14, 180)], [28, J_]],
      [HB(8, 11, -60, -48, 16, 13, 145, 32, 100, { fx: 'slash' })], { air: 1, lag: 10, agile: 1, title: 'Reverse Cut' });
    mk('uair', 26, [[0, J_], [4, P(0, -26, -0.1, 16, -14, -6, 8, 6, 16, -6, 18, -40)], [7, P(0, -26, -0.2, 4, -24, -6, 8, 6, 16, -6, 18, -90), 'snap'], [10, P(0, -26, -0.3, -12, -16, -6, 8, 6, 16, -6, 18, -140), 'snap'], [16, P(0, -26, -0.3, -12, -16, -6, 8, 6, 16, -6, 18, -140)], [26, J_]],
      [HB(5, 6, 44, -88, 15, 9, 80, 30, 100, { grp: 0, fx: 'slash' }), HB(7, 9, 4, -112, 18, 10, 90, 30, 100, { grp: 0, fx: 'slash' }), HB(10, 12, -40, -88, 15, 9, 100, 30, 100, { grp: 0, fx: 'slash' })], { air: 1, lag: 8, agile: 1, title: 'Sky Arc' });
    mk('dair', 44, [[0, J_], [6, P(0, -30, 0, 10, -10, -10, -10, 4, 16, -4, 18, -90), 'slow'], [10, P(0, -30, 0, 4, 18, -4, 16, 4, 14, -4, 14, 90), 'snap'], [40, P(0, -30, 0, 4, 18, -4, 16, 4, 14, -4, 14, 90)], [44, J_]],
      [HB(10, 34, 2, 14, 16, 12, -85, 25, 85, { spike: 1, fx: 'slash' })], { air: 1, lag: 14, agile: 1, title: 'Plunge', go: (f, t) => { if (t < 10) { f.vy = Math.min(f.vy, 0.3); f.vx *= 0.85; } else if (t < 34) { f.vy = 14; f.vx *= 0.9; } } });
  });
}
function gromMoves() {
  const S = STAND;
  const quake = (f, x, big) => { FX.ring(x, f.y, big ? 80 : 50, '#ffcf70'); World.shake(big ? 12 : 6); Audio2.play('boom', big ? 1 : 0.6); FX.dust(x - 10, f.y); FX.dust(x + 10, f.y); };
  return mkSet(mk => {
    mk('jab1', 16, [[0, S], [3, P(8, -25, 0.5, 12, 4, -4, 10, 14, 25, -12, 25, 40), 'snap'], [8, P(8, -25, 0.5, 12, 4, -4, 10, 14, 25, -12, 25, 40)], [16, S]], [HB(3, 6, 26, -46, 15, 5, 40, 30, 40)], { jab: 1, heavy: 1, title: 'Shoulder Bash' });
    mk('jab2', 16, [[0, S], [3, P(4, -25, 0.2, 26, -2, -4, 10, 8, 25, -8, 25, 180), 'snap'], [8, P(4, -25, 0.2, 26, -2, -4, 10, 8, 25, -8, 25, 180)], [16, S]], [HB(3, 6, 32, -46, 14, 5, 40, 30, 40)], { jab: 2, heavy: 1 });
    mk('jab3', 30, [[0, S], [5, P(2, -24, 0.3, 20, 12, -6, 10, 10, 25, -10, 25, 60), 'slow'], [9, P(2, -27, -0.1, 16, -20, -6, 8, 10, 25, -10, 25, -80), 'snap'], [16, P(2, -27, -0.1, 16, -20, -6, 8, 10, 25, -10, 25, -80)], [30, S]],
      [HB(9, 12, 40, -72, 18, 9, 70, 50, 88)], { heavy: 1, title: 'Hammer Upswing' });
    mk('ftilt', 34, [[0, S], [8, P(-4, -25, -0.3, -16, 0, -6, 8, 10, 25, -12, 25, 180), 'slow'], [12, P(4, -25, 0.35, 26, 0, -6, 8, 14, 25, -14, 25, 0), 'snap'], [20, P(4, -25, 0.35, 26, 0, -6, 8, 14, 25, -14, 25, 0)], [34, S]],
      [HB(11, 15, 58, -44, 20, 14, 35, 40, 96)], { heavy: 1, title: 'Hammer Swing' });
    mk('utilt', 32, [[0, S], [6, P(0, -24, 0.2, 18, 6, -6, 8, 8, 25, -8, 25, 30), 'slow'], [10, P(0, -26, 0, 4, -24, -4, 6, 8, 25, -8, 25, -90), 'snap'], [14, P(0, -26, -0.2, -14, -14, -4, 6, 8, 25, -8, 25, -160), 'snap'], [32, S]],
      [HB(9, 10, 42, -80, 18, 11, 80, 40, 100, { grp: 0 }), HB(11, 12, 4, -104, 20, 12, 90, 40, 105, { grp: 0 }), HB(13, 14, -40, -80, 18, 11, 100, 40, 100, { grp: 0 })], { heavy: 1, title: 'Overhead Arc' });
    mk('dtilt', 30, [[0, POSE.crouch], [6, P(0, -16, 0.4, 14, -10, -4, 10, 14, 16, -12, 16, -90), 'slow'], [10, P(0, -14, 0.6, 26, 14, -4, 10, 14, 14, -12, 14, 90), 'snap'], [18, P(0, -14, 0.6, 26, 14, -4, 10, 14, 14, -12, 14, 90)], [30, POSE.crouch]],
      [HB(10, 13, 48, -6, 18, 10, 80, 40, 70, { bury: 1 })], { crouchEnd: 1, heavy: 1, title: 'Ground Pound', go: (f, t) => { if (t === 10 && !f.air) quake(f, f.x + f.face * 48, false); } });
    mk('dash', 42, [[0, S], [6, P(4, -30, 0.6, 20, -4, -6, -4, 10, 16, -14, 18, 0)], [14, P(10, -10, 1.4, 24, 6, 20, 6, 4, 0, -20, 0, 0), 'snap'], [30, P(10, -10, 1.4, 24, 6, 20, 6, 4, 0, -20, 0, 0)], [42, S]],
      [HB(8, 17, 22, -22, 26, 13, 50, 55, 82)], { dash: 1, heavy: 1, title: 'Body Slam', go: (f, t) => { if (t === 6 && !f.air) f.vy = -5; if (t < 16) f.vx = f.face * 7; if (t === 16 && !f.air) quake(f, f.x + f.face * 20, false); } });
    mk('fsmash', 60, [[0, S], [10, P(-6, -27, -0.35, -2, -28, -4, -26, 10, 25, -14, 25, -120), 'slow'], [16, P(10, -17, 0.85, 30, 14, 20, 14, 22, 20, -18, 22, 80), 'snap'], [34, P(10, -17, 0.85, 30, 14, 20, 14, 22, 20, -18, 22, 80)], [60, S]],
      [HB(15, 16, 60, -50, 22, 26, 40, 45, 106, { grp: 0, fx: 'fire' }), HB(16, 19, 66, -6, 26, 20, 50, 45, 98, { grp: 0 })], { charge: 10, smash: 1, heavy: 1, armor: [4, 17], title: 'Earthsplitter', go: (f, t) => { if (t === 17 && !f.air) { quake(f, f.x + f.face * 66, true); spawnProj('shock', f, f.x + f.face * 70, f.y - 10, f.face * 9, 0); } } });
    mk('usmash', 54, [[0, S], [8, P(0, -17, 0.4, -16, 14, -12, 14, 12, 16, -12, 16, 150), 'slow'], [14, P(0, -30, -0.1, 4, -28, -4, -26, 6, 27, -6, 27, -90), 'snap'], [28, P(0, -30, -0.1, 4, -28, -4, -26, 6, 27, -6, 27, -90)], [54, S]],
      [HB(13, 16, 2, -102, 26, 22, 90, 40, 102, { grp: 0, fx: 'fire' }), HB(13, 16, 34, -62, 20, 17, 80, 40, 100, { grp: 0 })], { charge: 8, smash: 1, heavy: 1, armor: [4, 14], title: 'Skyward Hammer' });
    mk('dsmash', 56, [[0, S], [8, P(0, -27, 0, 6, -28, -6, -26, 8, 25, -8, 25, -90), 'slow'], [14, P(4, -14, 0.7, 28, 14, 20, 14, 14, 14, -12, 14, 80), 'snap'], [20, P(4, -14, 0.7, 28, 14, 20, 14, 14, 14, -12, 14, 80)], [24, P(-4, -14, -0.7, -28, 14, -20, 14, 12, 14, -14, 14, 100), 'snap'], [34, P(-4, -14, -0.7, -28, 14, -20, 14, 12, 14, -14, 14, 100)], [56, S]],
      [HB(14, 17, 60, -6, 22, 19, 30, 40, 100), HB(24, 27, -60, -6, 22, 18, 150, 40, 100)], { charge: 8, smash: 1, heavy: 1, title: 'Fault Line', go: (f, t) => { if (!f.air && t === 15) quake(f, f.x + f.face * 60, true); if (!f.air && t === 25) quake(f, f.x - f.face * 60, true); } });
    mk('nair', 34, [[0, J_], [5, P(0, -26, 0, 18, -6, -18, -6, 14, 10, -14, 10, 0), 'snap'], [22, P(0, -26, 0, 18, -6, -18, -6, 14, 10, -14, 10, 360)], [34, J_]],
      [HB(5, 10, 0, -32, 30, 12, 45, 32, 92), HB(11, 22, 0, -32, 26, 7, 45, 22, 70)], { air: 1, lag: 10, heavy: 1, spin: 1, title: 'Hammer Spin' });
    mk('fair', 40, [[0, J_], [8, P(0, -26, -0.3, 0, -28, -6, -8, 10, 16, -10, 18, -110), 'slow'], [13, P(0, -26, 0.4, 24, 12, -6, 8, 10, 16, -12, 16, 60), 'snap'], [22, P(0, -26, 0.4, 24, 12, -6, 8, 10, 16, -12, 16, 60)], [40, J_]],
      [HB(12, 13, 50, -62, 18, 15, 45, 35, 100, { grp: 0 }), HB(13, 16, 50, -12, 20, 17, -80, 25, 92, { grp: 0, spike: 1, fx: 'fire' })], { air: 1, lag: 14, heavy: 1, title: 'Overhead Smash (meteor)' });
    mk('bair', 32, [[0, J_], [6, P(2, -26, 0.1, 10, -10, 6, 8, 8, 16, -6, 14, -40), 'slow'], [9, P(2, -26, 0.35, -22, -2, 6, 8, 8, 16, 6, 14, 180), 'snap'], [16, P(2, -26, 0.35, -22, -2, 6, 8, 8, 16, 6, 14, 180)], [32, J_]],
      [HB(9, 12, -54, -46, 20, 16, 145, 35, 104)], { air: 1, lag: 12, heavy: 1, title: 'Back Hammer' });
    mk('uair', 30, [[0, J_], [5, P(0, -26, 0, 16, -10, -6, 8, 6, 16, -6, 18, -30), 'slow'], [9, P(0, -26, -0.2, 4, -26, -6, 8, 6, 16, -6, 18, -90), 'snap'], [13, P(0, -26, -0.35, -14, -16, -6, 8, 6, 16, -6, 18, -150), 'snap'], [30, J_]],
      [HB(8, 10, 30, -88, 20, 12, 85, 32, 100, { grp: 0 }), HB(10, 14, -10, -96, 22, 13, 92, 32, 102, { grp: 0 })], { air: 1, lag: 10, heavy: 1, title: 'Hammer Twirl' });
    mk('dair', 50, [[0, J_], [10, P(0, -30, -0.1, 8, -26, -8, -26, 6, 14, -6, 14, -90), 'slow'], [13, P(0, -28, 0.1, 6, 20, -6, 20, 6, 20, -6, 20, 90), 'snap'], [44, P(0, -28, 0.1, 6, 20, -6, 20, 6, 20, -6, 20, 90)], [50, J_]],
      [HB(13, 44, 0, 10, 22, 15, -88, 25, 90, { spike: 1 })], { air: 1, lag: 18, heavy: 1, title: 'Anvil Drop',
        go: (f, t) => { if (t < 13) { f.vy = Math.min(f.vy, -0.4); f.vx *= 0.8; } else if (t < 44) { f.vy = 16; f.vx *= 0.9; } },
        onLand: (f) => { if (f.mf >= 13 && f.mf < 44) { quake(f, f.x, true); spawnProj('shock', f, f.x + 24, f.y - 10, 8, 0); spawnProj('shock', f, f.x - 24, f.y - 10, -8, 0); } } });
  });
}

// ===================== Taunts (up / side / down) — pure style, no hitboxes =====================
function tauntMoves(id) {
  const S = STAND, M = {};
  const mk = (name, d, kf, go) => { M[name] = { name, d, kf, hb: [], taunt: 1, go }; };
  const fx = (f, t, at, fn) => { if (t === at) fn(); };
  if (id === 0) { // Rook: flex, shadowbox, knuckle-crack bounce
    mk('tauntU', 70, [[0, S], [10, P(0, -26, -0.1, 14, -20, -14, -20, 9, 25, -9, 25, 0)], [24, P(0, -27, -0.15, 12, -24, -12, -24, 9, 26, -9, 26, 0)], [34, P(0, -26, -0.1, 14, -20, -14, -20, 9, 25, -9, 25, 0)], [50, P(0, -27, -0.15, 12, -24, -12, -24, 9, 26, -9, 26, 0)], [70, S]], (f, t) => { fx(f, t, 12, () => { FX.burst(f.x, f.y - 60, '#ff8a6a', 8); Audio2.play('taunt'); }); });
    const a = P(4, -25, 0.2, 24, -4, -4, 10, 8, 25, -8, 25, 0), b = P(4, -25, 0.2, -2, 10, 24, -2, 8, 25, -8, 25, 0);
    mk('tauntS', 60, [[0, S], [4, a, 'snap'], [8, b, 'snap'], [12, a, 'snap'], [16, b, 'snap'], [20, a, 'snap'], [24, b, 'snap'], [34, P(0, -25, 0.05, 10, 0, -10, 2, 8, 25, -8, 25, 0)], [60, S]], (f, t) => { if (t % 4 === 0 && t <= 24) FX.add({ k: 'speed', x: f.x + f.face * 30, y: f.y - 48, vx: f.face * 6, vy: 0, len: 18, life: 8, max: 8, c: 'rgba(255,255,255,0.8)' }); fx(f, t, 2, () => Audio2.play('swing')); });
    mk('tauntD', 56, [[0, S], [8, POSE.crouch], [16, P(0, -28, 0, 8, -6, -8, -6, 8, 27, -8, 27, 0)], [24, POSE.crouch], [32, P(0, -28, 0, 8, -6, -8, -6, 8, 27, -8, 27, 0)], [56, S]], (f, t) => { if (t === 16 || t === 32) FX.dust(f.x, f.y); fx(f, t, 6, () => Audio2.play('taunt')); });
  } else if (id === 1) { // Vela: sword salute, flourish twirl, bow
    mk('tauntU', 64, [[0, S], [12, P(0, -26, -0.05, 6, -24, -6, 12, 7, 25, -7, 25, -90)], [48, P(0, -26, -0.05, 6, -24, -6, 12, 7, 25, -7, 25, -90)], [64, S]], (f, t) => { fx(f, t, 14, () => { FX.add({ k: 'glint', x: f.x + f.face * 6, y: f.y - 116, life: 22, max: 22, c: '#ffffff' }); Audio2.play('twinkle'); }); });
    mk('tauntS', 56, [[0, S], [6, P(2, -25, 0.1, 18, -4, -6, 12, 7, 25, -7, 25, 0)], [30, P(2, -25, 0.1, 18, -4, -6, 12, 7, 25, -7, 25, 1080)], [40, P(2, -25, 0.1, 14, 6, -6, 12, 7, 25, -7, 25, 1150)], [56, S]], (f, t) => { fx(f, t, 6, () => Audio2.play('swing')); fx(f, t, 30, () => Audio2.play('clink')); });
    mk('tauntD', 64, [[0, S], [14, P(-2, -24, 0.75, 4, 16, -14, 10, 9, 24, -9, 25, 160)], [46, P(-2, -24, 0.75, 4, 16, -14, 10, 9, 24, -9, 25, 160)], [64, S]], (f, t) => { fx(f, t, 14, () => Audio2.play('taunt')); });
  } else if (id === 2) { // Pip: starburst, juggle sparks, sit & sparkle
    mk('tauntU', 60, [[0, S], [10, P(0, -27, -0.1, 4, -26, -8, 6, 7, 26, -7, 26, -90)], [44, P(0, -27, -0.1, 4, -26, -8, 6, 7, 26, -7, 26, -90)], [60, S]], (f, t) => { if (t >= 10 && t <= 40 && t % 6 === 0) FX.burst(f.x + f.face * 4, f.y - 100, ['#7dff8a', '#ffe14a', '#c77dff'][t % 3], 6); fx(f, t, 10, () => Audio2.play('twinkle')); });
    mk('tauntS', 64, [[0, S], [8, P(0, -25, 0.1, 16, -10, -10, -8, 7, 25, -7, 25, -40)], [20, P(0, -25, 0.1, 10, -16, -14, -12, 7, 25, -7, 25, -60)], [32, P(0, -25, 0.1, 16, -10, -10, -8, 7, 25, -7, 25, -40)], [44, P(0, -25, 0.1, 10, -16, -14, -12, 7, 25, -7, 25, -60)], [64, S]], (f, t) => { if (t >= 8 && t <= 50 && t % 5 === 0) FX.add({ k: 'spark', x: f.x + Math.cos(t * 0.5) * 22, y: f.y - 72 + Math.sin(t * 0.5) * 12, vx: 0, vy: -0.6, life: 18, max: 18, c: '#9dff8a', s: 3 }); fx(f, t, 8, () => Audio2.play('taunt')); });
    mk('tauntD', 70, [[0, S], [12, P(0, -10, 0.2, 12, 8, -10, 10, 18, 8, -14, 8, 30)], [56, P(0, -10, 0.2, 12, 8, -10, 10, 18, 8, -14, 8, 30)], [70, S]], (f, t) => { if (t > 14 && t < 54 && t % 10 === 0) FX.add({ k: 'spark', x: f.x + rr(-14, 14), y: f.y - 40, vx: 0, vy: -1, life: 24, max: 24, c: '#ffe14a', s: 3 }); fx(f, t, 12, () => Audio2.play('taunt')); });
  } else { // Grom: roar, hammer twirl on the shoulder, ground slam
    mk('tauntU', 72, [[0, S], [10, P(-2, -26, -0.35, 20, -18, -20, -18, 12, 25, -12, 25, -60), 'slow'], [56, P(-2, -26, -0.4, 22, -20, -22, -20, 12, 25, -12, 25, -60)], [72, S]], (f, t) => { if (t === 12) { World.shake(5); Audio2.play('bighit', 0.5); } if (t > 12 && t < 54 && t % 6 === 0) FX.add({ k: 'ring', x: f.x + f.face * 10, y: f.y - 66, r0: 6, r: 40, life: 10, max: 10, c: 'rgba(255,220,150,0.7)' }); });
    mk('tauntS', 64, [[0, S], [10, P(0, -25, 0, 10, -20, -6, 10, 8, 25, -8, 25, -90)], [40, P(0, -25, 0, 10, -20, -6, 10, 8, 25, -8, 25, 630)], [52, P(0, -25, 0, 12, -6, -6, 10, 8, 25, -8, 25, 650)], [64, S]], (f, t) => { fx(f, t, 10, () => Audio2.play('swing')); fx(f, t, 40, () => Audio2.play('taunt')); });
    mk('tauntD', 60, [[0, S], [10, P(0, -27, 0, 6, -28, -4, -26, 8, 25, -8, 25, -90), 'slow'], [16, P(4, -14, 0.7, 28, 14, 20, 14, 14, 14, -12, 14, 80), 'snap'], [40, P(4, -14, 0.7, 28, 14, 20, 14, 14, 14, -12, 14, 80)], [60, S]], (f, t) => { fx(f, t, 16, () => { World.shake(7); Audio2.play('boom', 0.6); FX.dust(f.x + f.face * 50, f.y); FX.dust(f.x + f.face * 60, f.y); for (let i = 0; i < 4; i++) FX.add({ k: 'crack', x: f.x + f.face * 56, y: f.y, a: rr(-Math.PI, 0), len: rr(14, 30), life: 40, max: 40, seed: Math.random() * 99 }); }); });
  }
  return M;
}

// ---- procedural animation pass: anticipation, overshoot / follow-through and a settle on recovery ----
function enrichMove(mv) {
  if (!mv.hb || !mv.hb.length || !mv.kf || mv.kf.length < 2 || mv.taunt || mv.thr || mv._rich) return mv;
  mv._rich = 1; const s0 = Math.min(...mv.hb.map(h => h.s));
  const kf = mv.kf.map(k => [k[0], k[1].slice(), k[2]]);
  let bi = kf.findIndex((k, i) => i > 0 && k[2] === 'snap'); if (bi < 1) bi = kf.findIndex((k, i) => i > 0 && k[0] >= s0 - 1); if (bi < 1) return mv;
  const strike = kf[bi][1], prev = kf[bi - 1][1], sf = kf[bi][0];
  const L = [[3, 4], [5, 6], [7, 8], [9, 10]].reduce((b, l) => (Math.hypot(strike[l[0]] - prev[l[0]], strike[l[1]] - prev[l[1]]) > Math.hypot(strike[b[0]] - prev[b[0]], strike[b[1]] - prev[b[1]]) ? l : b));
  const add = (f, pose, ez) => { f = Math.round(f); if (f <= 0 || f >= mv.d || kf.some(k => k[0] === f)) return; kf.push([f, pose, ez]); };
  // anticipation: pull the striking limb back and lean away before the hit (only when the move has no wind-up pose yet)
  if (bi === 1 && sf >= 4) {
    const p = prev.slice(); p[L[0]] = prev[L[0]] - (strike[L[0]] - prev[L[0]]) * 0.32; p[L[1]] = prev[L[1]] - (strike[L[1]] - prev[L[1]]) * 0.32;
    p[2] = prev[2] - (strike[2] - prev[2]) * 0.45; p[1] = prev[1] + 1.5; p[11] = prev[11] - (strike[11] - prev[11]) * 0.25; p[0] = prev[0] - (strike[0] - prev[0]) * 0.3;
    add(Math.max(1, sf * 0.6), p, 'slow');
  }
  // overshoot / follow-through just after the strike, before it settles into the held pose
  const nx = kf.filter(k => k[0] > sf).sort((a, b) => a[0] - b[0])[0];
  if (nx && nx[0] - sf >= 4) {
    const p = strike.slice(); p[L[0]] = strike[L[0]] + (strike[L[0]] - prev[L[0]]) * 0.12; p[L[1]] = strike[L[1]] + (strike[L[1]] - prev[L[1]]) * 0.12;
    p[2] = strike[2] + (strike[2] - prev[2]) * 0.22; p[11] = strike[11] + (strike[11] - prev[11]) * 0.12; p[0] = strike[0] + (strike[0] - prev[0]) * 0.15;
    // the off arm counter-swings for balance
    const off = L[0] === 3 ? [5, 6] : L[0] === 5 ? [3, 4] : null; if (off) { p[off[0]] = strike[off[0]] - 4; p[off[1]] = strike[off[1]] + 2; }
    add(sf + Math.max(2, Math.min(5, (nx[0] - sf) * 0.35)), p);
  }
  // recovery: a small dip as the fighter settles back into stance
  kf.sort((a, b) => a[0] - b[0]);
  const last = kf[kf.length - 1], pl = kf[kf.length - 2];
  if (last && pl && last[0] - pl[0] >= 10) { const p = mix(pl[1], last[1], 0.72); p[1] += 2; add(pl[0] + (last[0] - pl[0]) * 0.6, p); }
  kf.sort((a, b) => a[0] - b[0]); mv.kf = kf;
  for (const h of mv.hb) delete h._att; // re-derive limb attachment from the richer animation
  return mv;
}
