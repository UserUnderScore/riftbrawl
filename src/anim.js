// ===== animation v2: every fighter moves in their own way =====
// Poses are [hipX, hipY, lean, hand1 x/y, hand2 x/y, foot1 x/y, foot2 x/y, weaponDeg] (hands from the shoulder, feet from the hip).
// Rook bounces in a boxer's stance and sprints; Vela stands en garde and ninja-runs with her blade trailing;
// Pip bobs and scampers with the staff held high; Grom plants a wide stance with the hammer on his shoulder and lumbers.
const easeIO = k => k * k * (3 - 2 * k);
const ANIM = [
  { // ROOK
    snap: 1,
    idle(t, f) { const ph = t * 0.085 + f.slot * 1.7, b = Math.abs(Math.sin(ph)) * 1.8, w = Math.sin(ph + 0.6), h = -24 - b; return P(-1, h, 0.13, 13 + w, -3 - b * 0.6, 7 - w, 1 - b * 0.4, 9, -h, -8, -h, 0); },
    run: { hip: -24, bounce: 2.6, lean0: 0.1, lean: 0.27, a1: [6, 8, 1], a2: [-2, 9, 1], arm: 13, armLift: 4, stride: 16, knee: 11, w: 40, wSwing: 25 },
    rise: P(0, -28, 0.12, 9, -15, -8, 7, 9, 11, -6, 21, 20), apex: P(0, -27, 0, 13, -4, -12, -2, 9, 17, -8, 17, 10), fall: P(0, -26, -0.08, 13, -13, -13, -10, 6, 24, -7, 20, 10),
    dive: P(0, -26, 0.25, 6, 14, -10, -18, 4, 25, -6, 20, 60), tuck: P(0, -24, 0.5, 8, 8, -6, 10, 10, 9, -4, 13, 90),
    guard: P(0, -22, 0.18, 12, -3, 9, 2, 9, 22, -8, 22, 0), crouch: P(0, -15, 0.35, 11, 8, 4, 11, 12, 15, -10, 15, 40), landP: P(0, -15, 0.32, 13, 10, -7, 13, 12, 15, -11, 15, 40),
  },
  { // VELA
    snap: 1.2,
    idle(t, f) { const b = Math.sin(t * 0.05 + f.slot * 1.7), h = -24.6 + b * 0.7; return P(0, h, 0.03, 10, 9 - b * 1.2, -7, 15 - b, 7, -h, -7, -h, -42 + b * 3); },
    run: { hip: -22.5, bounce: 1.5, lean0: 0.2, lean: 0.3, a1: [-9, 10, 0.25], a2: [-13, 7, 0.25], arm: 6, armLift: 1, stride: 15, knee: 11, w: 165, wSwing: 6 },
    rise: P(0, -28, 0.06, 9, 9, -10, 5, 5, 16, -3, 22, 105), apex: P(0, -27, -0.04, 13, 0, -12, 2, 8, 18, -6, 20, 20), fall: P(0, -26, -0.1, 11, -10, -12, -12, 4, 25, -5, 23, -30),
    dive: P(0, -26, 0.3, 10, 16, -8, -16, 3, 26, -4, 24, 85), tuck: P(0, -24, 0.5, 8, 8, -6, 10, 10, 9, -4, 13, 150),
    guard: P(0, -22, 0.12, 12, 5, 9, 10, 8, 22, -8, 22, -82), crouch: P(0, -15, 0.35, 11, 12, -2, 14, 12, 15, -10, 15, 15), landP: P(0, -16, 0.28, 12, 12, -8, 12, 11, 16, -11, 16, 30),
  },
  { // PIP
    snap: 1.1,
    idle(t, f) { const ph = t * 0.07 + f.slot * 1.7, b = Math.sin(ph), h = -24.5 + b * 0.9; return P(0, h, 0.02, 9, 8 - b, -7, 14 + Math.sin(ph + 1) * 2.5, 5, -h, -5, -h, -84 + Math.sin(t * 0.035) * 5); },
    run: { hip: -24, bounce: 4.2, lean0: 0.05, lean: 0.12, a1: [9, -2, 0.35], a2: [-9, 3, 1], arm: 10, armLift: 5, stride: 11, knee: 9, w: -75, wSwing: 12 },
    rise: P(0, -28, 0, 10, -18, -10, -18, 7, 14, -7, 16, -90), apex: P(0, -27, 0, 14, -8, -14, -8, 9, 18, -9, 18, -60), fall: P(0, -26, -0.05, 12, -20, -12, -20, 5, 22, -5, 24, -90),
    dive: P(0, -26, 0.2, 8, 16, -10, -18, 3, 26, -4, 22, 80), tuck: P(0, -24, 0.5, 8, 8, -6, 10, 9, 9, -4, 13, -30),
    guard: P(0, -22, 0.1, 13, 6, 8, 8, 7, 22, -7, 22, -88), crouch: P(0, -15, 0.3, 10, 10, -2, 13, 10, 15, -9, 15, -70), landP: P(0, -15, 0.25, 12, 6, -10, 6, 10, 15, -10, 15, -60),
  },
  { // GROM
    snap: 0.72,
    idle(t, f) { const b = Math.sin(t * 0.04 + f.slot * 1.7), h = -22.5 + b * 0.9; return P(0, h, 0.1 + b * 0.015, 6, -5 + b * 0.8, -8, 17 - b, 10, -h, -10, -h, -142 + b * 2); },
    run: { hip: -22.5, bounce: 3.4, lean0: 0.12, lean: 0.16, a1: [5, -5, 0.2], a2: [-3, 14, 1.3], arm: 11, armLift: 2, stride: 15, knee: 8, w: -140, wSwing: 7 },
    rise: P(0, -27, 0.15, 8, -3, -8, 8, 10, 13, -8, 17, -130), apex: P(0, -26, 0.05, 12, 0, -12, 4, 11, 17, -10, 18, -110), fall: P(0, -25, 0.1, 10, -8, -12, -4, 10, 21, -10, 22, -100),
    dive: P(0, -25, 0.3, 10, 14, 6, 16, 6, 25, -8, 22, 90), tuck: P(0, -23, 0.5, 8, 8, -6, 10, 10, 9, -4, 13, -120),
    guard: P(0, -20, 0.22, 13, 6, 9, 10, 11, 20, -10, 20, -72), crouch: P(0, -15, 0.38, 7, -3, 2, 14, 13, 15, -11, 15, -140), landP: P(0, -14, 0.36, 8, 0, -6, 14, 13, 14, -12, 14, -150),
  },
];
function runPose(S, ph, sp, leanK) {
  const R = S.run, c = Math.sin(ph), c2 = Math.cos(ph), h = R.hip - Math.abs(c2) * R.bounce * sp;
  return P(0, h, R.lean0 + R.lean * sp * leanK,
    R.a1[0] - c * R.arm * sp * R.a1[2], R.a1[1] - Math.abs(c) * R.armLift * sp, R.a2[0] + c * R.arm * sp * R.a2[2], R.a2[1] - Math.abs(c) * R.armLift * sp * 0.7,
    c * R.stride * sp, -R.hip - 1 - Math.max(0, c2) * R.knee * sp, -c * R.stride * sp, -R.hip - 1 - Math.max(0, -c2) * R.knee * sp, R.w + c * R.wSwing * sp);
}
const HURT_UP = P(0, -27, -0.25, -10, -18, 12, -16, 9, 18, -9, 22, -70), HURT_DOWN = P(0, -25, 0.5, 12, -14, -12, -12, 8, 14, -8, 18, 120), HURT_FWD = P(3, -25, 0.5, 14, 2, 8, 10, 4, 23, -12, 20, 60);
function fighterPose(f) {
  const S = ANIM[f.def.id] || ANIM[0], t = World.frame, vx = f.dxr || 0, vy = f.vy || 0;
  switch (f.state) {
    case 'idle':
      if (f._teeter || f._fidget || (Math.abs(vx) > 2.2 && !f.air)) return basePose(f);
      return S.idle(t, f);
    case 'run': {
      if (f.skidT > 0 || f.turnT > 0) return basePose(f);
      const ph = f.runPh || 0;
      if (Math.abs(vx) < 3.4) return runPose(S, ph, 0.5, 0.25); // walking
      const p = runPose(S, ph, clamp(Math.abs(vx) / 6.5, 0.35, 1), 1);
      if ((f._runT | 0) < 7) { const k = 1 - (f._runT | 0) / 7; p[2] += 0.2 * k; p[1] += 2 * k; } // digging in as the dash starts
      return p;
    }
    case 'air': {
      if (f.ff && vy > 0) return S.dive;
      if (vy < 0 && f.jumps < f.maxJumps && f.sf < 22) return S.tuck; // mid-air jumps somersault
      const u = clamp(vy / 8, -1, 1), p = u < 0 ? mix(S.apex, S.rise, easeIO(-u)) : mix(S.apex, S.fall, easeIO(u));
      const fl = Math.sin(t * 0.3 + f.slot) * (u > 0.3 ? 2.5 : 0.8); p[4] += fl; p[6] -= fl; // arms flutter on the way down
      p[2] += clamp(vx * f.face * 0.035, -0.25, 0.3); // lean into the drift
      return p;
    }
    case 'land': case 'land0': { const k = clamp(f.sf / (f.state === 'land' ? Math.max(6, f.landLag || 8) : 4), 0, 1); return mix(S.landP, S.idle(t, f), k * k); }
    case 'squat': { const p = S.landP.slice(); p[1] += 1; p[4] += 4; p[6] += 4; return p; }
    case 'crouch': { const b = Math.sin(t * 0.07 + f.slot), p = S.crouch.slice(); p[1] += b * 0.6; p[4] -= b; p[6] -= b * 0.8; return p; }
    case 'shield': { const b = Math.sin(t * 0.2) * 0.5, p = S.guard.slice(); p[1] += b; return p; }
    case 'shielddrop': return mix(S.guard, S.idle(t, f), clamp(f.sf / 11, 0, 1));
    case 'hitstun': {
      if (f.tumble) return basePose(f);
      let p = POSE.hurt; const dyr = f.dyr || 0;
      if (vx * f.face > 2.5) p = HURT_FWD;
      if (dyr < -3) p = mix(p, HURT_UP, clamp(-dyr / 9, 0, 1)); else if (dyr > 3 && f.air) p = mix(p, HURT_DOWN, clamp(dyr / 9, 0, 1));
      p = p.slice(); const w = Math.sin(t * 0.9 + f.slot) * 2; p[4] += w; p[6] -= w; return p;
    }
  }
  return basePose(f);
}
// ---- spring-driven posing: limbs and weapons trail, overshoot and settle instead of sliding between poses ----
// per channel: [stiffness, damping ratio]
const SPR = { hip: [0.36, 0.78], lean: [0.2, 0.6], hand: [0.22, 0.55], foot: [0.42, 0.85], wpn: [0.17, 0.46] };
const SPR_CH = ['hip', 'hip', 'lean', 'hand', 'hand', 'hand', 'hand', 'foot', 'foot', 'foot', 'foot', 'wpn'];
function springPose(f, target, mode) {
  let S = f._sp; if (!S) { S = f._sp = { x: target.slice(), v: target.map(() => 0) }; return S.x; }
  const x = S.x, v = S.v;
  if (mode === 'snap') { for (let i = 0; i < 12; i++) { v[i] = 0; x[i] = target[i]; } return x; }
  if (mode === 'exact') { for (let i = 0; i < 12; i++) { v[i] = (target[i] - x[i]) * 0.6; x[i] = target[i]; } return x; } // keep the momentum so the follow-through carries on after
  const snap = (ANIM[f.def.id] || ANIM[0]).snap, tight = mode === 'tight' ? 1 : mode === 'blend' ? 0.6 : 0;
  for (let i = 0; i < 12; i++) {
    const [k0, z] = SPR[SPR_CH[i]]; let k = k0 * snap, c;
    if (tight) { k = lerp(k, i >= 3 && i <= 6 ? 0.55 : 0.75, tight); c = lerp(2 * z * Math.sqrt(k), 1, tight); } else c = 2 * z * Math.sqrt(k);
    v[i] += (target[i] - x[i]) * k - v[i] * c; x[i] += v[i];
  }
  if (!f.air) { const g = -x[1]; if (x[8] > g) { x[8] = g; if (v[8] > 0) v[8] = 0; } if (x[10] > g) { x[10] = g; if (v[10] > 0) v[10] = 0; } } // feet never sink into the floor
  return x;
}
// ---- secondary motion: the head lags behind sudden starts/stops, and cloth is simulated as little ropes ----
function headLag(f, ax, ay) {
  const H = f._hl || (f._hl = { x: 0, y: 0, vx: 0, vy: 0 });
  H.vx += -ax * 0.55 - H.x * 0.24; H.vy += -ay * 0.4 - H.y * 0.3; H.vx *= 0.7; H.vy *= 0.66; H.x = clamp(H.x + H.vx, -4.5, 4.5); H.y = clamp(H.y + H.vy, -3, 3.5);
  return H;
}
// a rope pinned at (ax, ay): n points, each `seg` long. Simulated once per game frame; returns the points.
function ribbon(store, key, ax, ay, n, seg, o = {}) {
  let R = store[key]; const fr = World.frame;
  if (!R || R.n !== n || Math.hypot(R.p[0] - ax, R.p[1] - ay) > 90) { R = store[key] = { n, p: [], q: [], f: fr }; for (let i = 0; i < n; i++) { R.p.push(ax - (o.dir || 0) * i * seg * 0.7, ay + i * seg * 0.7); R.q.push(R.p[i * 2], R.p[i * 2 + 1]); } }
  const p = R.p, q = R.q;
  if (R.f !== fr) {
    R.f = fr; const drag = o.drag ?? 0.9, grav = o.grav ?? 0.32, wind = (o.wind || 0) + Math.sin(fr * 0.11 + ax * 0.01) * 0.07;
    for (let i = 1; i < n; i++) { const j = i * 2, vx = (p[j] - q[j]) * drag, vy = (p[j + 1] - q[j + 1]) * drag; q[j] = p[j]; q[j + 1] = p[j + 1]; p[j] += vx + wind + Math.sin(fr * 0.23 + i * 1.3) * 0.05 * i; p[j + 1] += vy + grav; }
    p[0] = ax; p[1] = ay;
    for (let it = 0; it < 2; it++) for (let i = 1; i < n; i++) { const j = i * 2, dx = p[j] - p[j - 2], dy = p[j + 1] - p[j - 1], d = Math.hypot(dx, dy) || 0.001, k = seg / d; p[j] = p[j - 2] + dx * k; p[j + 1] = p[j - 1] + dy * k; }
  } else { p[0] = ax; p[1] = ay; }
  return p;
}
// a single point pulled toward a rest position by a spring (hat tips, beards)
function wobble(store, key, rx, ry, k = 0.2, d = 0.78) {
  let W = store[key]; const fr = World.frame;
  if (!W || Math.hypot(W.x - rx, W.y - ry) > 90) W = store[key] = { x: rx, y: ry, vx: 0, vy: 0, f: fr };
  if (W.f !== fr) { W.f = fr; W.vx = (W.vx + (rx - W.x) * k) * d; W.vy = (W.vy + (ry - W.y) * k) * d; W.x += W.vx; W.y += W.vy; }
  return W;
}
// draw a rope as a tapered, outlined band
function drawRibbon(g, p, w0, w1, col) {
  const n = p.length / 2; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const pass of [0, 1]) for (let i = 0; i < n - 1; i++) { const w = lerp(w0, w1, i / (n - 1)); g.strokeStyle = pass ? col : OL; g.lineWidth = pass ? w : w + 3.4; g.beginPath(); g.moveTo(p[i * 2], p[i * 2 + 1]); g.lineTo(p[i * 2 + 2], p[i * 2 + 3]); g.stroke(); }
  g.lineCap = 'butt';
}
// attacks start from and return to each fighter's own stance (instead of a shared neutral pose), so they flow in and out of idle
{
  const NEUT = ANIM.map(S => S.idle(0, { slot: 0 }));
  for (const F of FIGHTERS) { const N = NEUT[F.id], A = ANIM[F.id].apex; for (const mv of Object.values(F.moves)) if (mv && mv.kf) mv.kf = mv.kf.map(k => k[1] === STAND ? [k[0], N, k[2]] : k[1] === POSE.jump ? [k[0], A, k[2]] : k); }
}
