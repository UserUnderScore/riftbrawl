// ===== RENDERING =====
const cv = document.getElementById('c'); const ctx = cv.getContext('2d');
cv.width = W; cv.height = H;
function ik(rx, ry, tx, ty, l1, l2, bend) {
  let dx = tx - rx, dy = ty - ry; let d = Math.hypot(dx, dy); const max = l1 + l2 - 0.01; if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  const a = Math.atan2(dy, dx); const c = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * Math.max(d, 0.01)), -1, 1); const off = Math.acos(c) * bend;
  return [rx + Math.cos(a + off) * l1, ry + Math.sin(a + off) * l1, rx + dx, ry + dy];
}
function drawStick(g, x, y, face, pose, col, o = {}) {
  const s = o.s || 1, lw = (o.lw || 5.5) * s;
  const hip = [x + face * pose[0] * s, y + pose[1] * s], ln = pose[2];
  const sh = [hip[0] + face * Math.sin(ln) * 22 * s, hip[1] - Math.cos(ln) * 22 * s];
  const hd = [hip[0] + face * Math.sin(ln) * 33 * s, hip[1] - Math.cos(ln) * 33 * s];
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = lw;
  const limb = (rx, ry, tx, ty, bend) => { const [jx, jy, ex, ey] = ik(rx, ry, tx, ty, 12 * s, 12 * s, bend); g.beginPath(); g.moveTo(rx, ry); g.lineTo(jx, jy); g.lineTo(ex, ey); g.stroke(); return [ex, ey]; };
  // back limbs first (slightly darker)
  const back = o.dark || col;
  g.strokeStyle = back;
  limb(hip[0], hip[1], hip[0] + face * pose[9] * s, hip[1] + pose[10] * s, -face);
  const h2 = limb(sh[0], sh[1], sh[0] + face * pose[5] * s, sh[1] + pose[6] * s, face);
  g.strokeStyle = col;
  g.beginPath(); g.moveTo(hip[0], hip[1]); g.lineTo(sh[0], sh[1]); g.stroke();
  limb(hip[0], hip[1], hip[0] + face * pose[7] * s, hip[1] + pose[8] * s, -face);
  g.beginPath(); g.arc(hd[0], hd[1], 8.5 * s, 0, TAU); g.fill();
  const h1 = limb(sh[0], sh[1], sh[0] + face * pose[3] * s, sh[1] + pose[4] * s, face);
  return { hip, sh, hd, h1, h2, ln };
}
function drawWeapon(g, kind, hx, hy, face, wdeg, s, col, extra = {}) {
  const a = deg(wdeg); const dx = face * Math.cos(a), dy = Math.sin(a);
  g.lineCap = 'round';
  if (kind === 'sword') {
    const L = (extra.len || 42) * s;
    g.strokeStyle = '#e9eef5'; g.lineWidth = 4.5 * s; g.beginPath(); g.moveTo(hx + dx * 5 * s, hy + dy * 5 * s); g.lineTo(hx + dx * L, hy + dy * L); g.stroke();
    g.strokeStyle = '#2b2b33'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(hx - dy * 6 * s * face, hy + dx * 6 * s * face); g.lineTo(hx + dy * 6 * s * face, hy - dx * 6 * s * face); g.stroke();
  } else if (kind === 'staff') {
    const L = 30 * s; g.strokeStyle = '#7b5a3a'; g.lineWidth = 3.5 * s; g.beginPath(); g.moveTo(hx - dx * 12 * s, hy - dy * 12 * s); g.lineTo(hx + dx * L, hy + dy * L); g.stroke();
    g.fillStyle = extra.glow || '#b8ff9a'; g.beginPath(); g.arc(hx + dx * (L + 4 * s), hy + dy * (L + 4 * s), 5.5 * s, 0, TAU); g.fill();
  } else if (kind === 'hammer') {
    const L = 30 * s; g.strokeStyle = '#6b4a2a'; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(hx - dx * 4 * s, hy - dy * 4 * s); g.lineTo(hx + dx * L, hy + dy * L); g.stroke();
    g.save(); g.translate(hx + dx * L, hy + dy * L); g.rotate(Math.atan2(dy, dx)); g.fillStyle = '#4a4a55'; g.fillRect(-6 * s, -11 * s, 14 * s, 22 * s); g.fillStyle = '#6d6d7a'; g.fillRect(-6 * s, -11 * s, 14 * s, 5 * s); g.restore();
  } else if (kind === 'spear') {
    const L = 54 * s; g.strokeStyle = '#7a6040'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(hx - dx * 18 * s, hy - dy * 18 * s); g.lineTo(hx + dx * L, hy + dy * L); g.stroke();
    g.fillStyle = '#d8d8e0'; g.beginPath(); g.moveTo(hx + dx * (L + 12 * s), hy + dy * (L + 12 * s)); g.lineTo(hx + dx * L - dy * 5 * s, hy + dy * L + dx * 5 * s); g.lineTo(hx + dx * L + dy * 5 * s, hy + dy * L - dx * 5 * s); g.fill();
  } else if (kind === 'rifle') {
    const L = 34 * s; g.strokeStyle = '#1b1b22'; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(hx - dx * 8 * s, hy - dy * 8 * s); g.lineTo(hx + dx * L, hy + dy * L); g.stroke();
  }
}
// pose for a fighter based on state
function fighterPose(f) {
  const t = World.frame;
  switch (f.state) {
    case 'move': { let p = kfPose(f.move.kf, f.mf); return p; }
    case 'run': { const c = Math.sin(t * 0.35 * (1 + Math.abs(f.vx) / 8)); return P(0, -25 + Math.abs(c) * 2, 0.25, 8 - c * 10, 14, -6 + c * 10, 14, 6 + c * 14, 22 - Math.max(0, c) * 8, -6 - c * 14, 22 - Math.max(0, -c) * 8, 30); }
    case 'idle': case 'land0': { const b = Math.sin(t * 0.08) * 1.2; return P(0, -25 + b, 0.05, 6, 19 - b, -4, 19 - b, 6, 25 - b, -6, 25 - b, 70); }
    case 'crouch': return POSE.crouch;
    case 'squat': case 'land': return POSE.crouch;
    case 'air': return f.vy < 0 ? (f.jumps < f.maxJumps && f.sf < 18 ? spinPose(f.sf) : POSE.jump) : POSE.fall;
    case 'helpless': return POSE.helpless;
    case 'hitstun': return f.tumble ? spinPose(t) : POSE.hurt;
    case 'shield': return POSE.shield;
    case 'roll': case 'spot': case 'adodge': return POSE.dodge;
    case 'ledge': return POSE.ledge;
    case 'shieldbreak': return POSE.hurt;
    default: return STAND;
  }
}
function spinPose(t) { const a = Math.sin(t * 0.4); return P(0, -26, a * 0.6, 14, 4, -14, 4, 12 * a, 18, -12 * a, 18, 360 * (t % 20) / 20); }
function drawFighter(g, f) {
  if (f.out || f.dead) return;
  if (f.intang > 0 && f.state !== 'roll' && f.state !== 'spot' && f.state !== 'adodge' && World.frame % 6 < 3 && f.intang > 20) g.globalAlpha = 0.5;
  const pose = fighterPose(f); const def = f.def; const s = f.mods ? f.mods.size : 1;
  const shakeX = f.hitlag > 0 && f.state === 'hitstun' ? rr(-3, 3) : 0;
  let col = def.color;
  if (['roll', 'spot', 'adodge'].includes(f.state) && f.intang > 0) g.globalAlpha = 0.55;
  if (f.state === 'move' && f.chgT > 0 && World.frame % 8 < 4) col = '#fff6c0';
  // shadow
  g.globalAlpha *= 1;
  const J = drawStick(g, f.x + shakeX, f.y, f.face, pose, col, { s, dark: def.dark });
  // accessory
  const hx = J.hd[0], hy = J.hd[1];
  g.lineWidth = 3 * s;
  if (def.id === 0) { g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(hx - 8 * s, hy - 3 * s); g.lineTo(hx + 8 * s, hy - 3 * s); g.stroke(); g.beginPath(); g.moveTo(hx - f.face * 8 * s, hy - 3 * s); g.lineTo(hx - f.face * 18 * s, hy + 2 * s + Math.sin(World.frame * 0.3) * 3); g.stroke(); }
  if (def.id === 1) { g.strokeStyle = def.dark; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(hx - f.face * 6 * s, hy - 5 * s); g.quadraticCurveTo(hx - f.face * 18 * s, hy - 2 * s, hx - f.face * 16 * s + Math.sin(World.frame * 0.2) * 2, hy + 10 * s); g.stroke(); }
  if (def.id === 2) { g.fillStyle = def.dark; g.beginPath(); g.moveTo(hx - 11 * s, hy - 4 * s); g.lineTo(hx + 11 * s, hy - 4 * s); g.lineTo(hx - f.face * 6 * s, hy - 24 * s); g.fill(); }
  if (def.id === 3) { g.strokeStyle = '#ddd'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(hx - 7 * s, hy - 5 * s); g.lineTo(hx - 12 * s, hy - 15 * s); g.moveTo(hx + 7 * s, hy - 5 * s); g.lineTo(hx + 12 * s, hy - 15 * s); g.stroke(); }
  // eye
  g.fillStyle = '#fff'; g.beginPath(); g.arc(hx + f.face * 3.5 * s, hy - 1 * s, 1.8 * s, 0, TAU); g.fill();
  if (def.weapon !== 'none' && !(def.id === 3 && f.hammerOut)) drawWeapon(g, def.weapon, J.h1[0], J.h1[1], f.face, pose[11], s, col, { glow: '#b8ff9a' });
  if (f.state === 'move' && f.move.name === 'nspec' && def.id === 2 && f.chgT > 0) { g.fillStyle = 'rgba(157,255,138,0.6)'; g.beginPath(); g.arc(J.h1[0] + f.face * 10, J.h1[1], 6 + f.chg * 12, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  if (f.state === 'shield') { const r = 16 + 22 * (f.shieldHP / 50); g.fillStyle = 'rgba(120,220,255,0.35)'; g.strokeStyle = 'rgba(200,245,255,0.8)'; g.lineWidth = 2; g.beginPath(); g.arc(f.x, f.y - 30, r, 0, TAU); g.fill(); g.stroke(); }
  if (f.mods && f.mods.orb) { const ox = f.x + Math.cos(f.orbA) * 46, oy = f.y - 30 + Math.sin(f.orbA) * 46; g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(ox, oy, 7, 0, TAU); g.fill(); }
  // swing trails for active hitboxes
  if (f.state === 'move') for (const hb of f.hitboxes()) { if (hb.h.orb) continue; g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 3; g.beginPath(); g.arc(hb.x, hb.y, hb.r * 0.9, 0, TAU); g.stroke(); }
  // player tag
  g.fillStyle = def.color; g.font = 'bold 13px ui-monospace,monospace'; g.textAlign = 'center';
  g.fillText('P' + (f.slot + 1), f.x, f.y - 72 * s); g.beginPath(); g.moveTo(f.x - 5, f.y - 66 * s); g.lineTo(f.x + 5, f.y - 66 * s); g.lineTo(f.x, f.y - 61 * s); g.fill();
}

// ----- enemies -----
function eCol(e, base) { if (e.flash > 0) return '#ffffff'; if (e.atk && e.af < (e.atk.tele || 0) && World.frame % 6 < 3) return '#e8e0ff'; return base; }
function drawEnemy(g, e) {
  if (e.dead) return;
  const d = e.def, s = e.scale, f = e.face, t = World.frame + e.id * 7; const col = eCol(e, d.col); const tele = e.atk && e.af < (e.atk.tele || 0);
  if (e.dying) g.globalAlpha = Math.max(0, 1 - e.dying / 40);
  if (e.elite) { g.shadowColor = { giant: '#ff4a4a', swift: '#ffe14a', volatile: '#ff9a3c', warded: '#7df9ff' }[e.elite]; g.shadowBlur = 14; }
  const walk = Math.sin(t * 0.25) * (Math.abs(e.vx) > 0.3 ? 1 : 0);
  const af = e.atk ? e.af : 0;
  const eye = (x, y, r = 2.5) => { g.shadowBlur = 0; g.fillStyle = d.eye; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); if (e.elite) g.shadowBlur = 14; };
  switch (e.type) {
    case 'shade': case 'lancer': case 'shieldbearer': case 'sniper': case 'brute': {
      let pose = P(0, -24, 0.15, 6 + walk * 6, 18, -4 - walk * 6, 18, 6 + walk * 12, 24, -6 - walk * 12, 24, 0);
      if (e.hitstun > 0) pose = POSE.hurt;
      else if (e.atk) {
        const tl = e.atk.tele || 0, n = e.atkName;
        if (n === 'jab2' || n === 'bash' || n === 'poke' || n === 'swing') pose = af < tl ? P(-4, -24, -0.2, -10, 8, -8, 12, 8, 24, -8, 24, -40) : P(4, -24, 0.4, 24, -2, -8, 10, 14, 24, -12, 24, 0);
        if (n === 'kick') pose = af < tl ? POSE.crouch : P(0, -26, -0.3, -8, 6, -10, 6, 28, -6, -4, 24, 0);
        if (n === 'slam') pose = af < tl ? P(0, -26, -0.2, 4, -28, -4, -28, 8, 24, -8, 24, -90) : P(0, -16, 0.6, 26, 12, 20, 12, 12, 16, -12, 16, 90);
        if (n === 'charge') pose = af < tl ? P(-6, -20, -0.3, -14, 4, -4, 6, 10, 20, -14, 22, 0) : P(6, -22, 0.6, 18, 4, 4, 8, 20, 18, -22, 20, 0);
        if (n === 'aim') pose = P(0, -24, 0.0, 22, -2, 12, 0, 6, 24, -6, 24, 0);
      }
      const lw = e.type === 'brute' ? 9 : 5;
      const J = drawStick(g, e.x, e.y, f, pose, col, { s: s * (e.type === 'brute' ? 1.7 : 1), lw: lw / (e.type === 'brute' ? 1.7 : 1) });
      eye(J.hd[0] + f * 3 * s, J.hd[1] - 1, 2.5 * s);
      if (e.type === 'lancer') drawWeapon(g, 'spear', J.h1[0], J.h1[1], f, e.atk && e.atkName === 'charge' && af >= e.atk.tele ? 0 : (tele ? -10 : 10), s, col);
      if (e.type === 'sniper') { drawWeapon(g, 'rifle', J.h1[0], J.h1[1], f, e.aim != null ? (f > 0 ? e.aim : Math.PI - e.aim) * 180 / Math.PI : 0, s, col); }
      if (e.type === 'brute') { g.fillStyle = col; g.beginPath(); g.arc(J.h1[0], J.h1[1], 9 * s, 0, TAU); g.arc(J.h2[0], J.h2[1], 8 * s, 0, TAU); g.fill(); }
      if (e.type === 'shieldbearer') { g.shadowBlur = 0; g.fillStyle = e.stunGuard ? '#556' : '#5b7a99'; g.strokeStyle = '#cfe8ff'; g.lineWidth = 2; const sx = e.x + f * 16 * s; g.fillRect(sx - 6 * s, e.y - 58 * s, 12 * s, 50 * s); g.strokeRect(sx - 6 * s, e.y - 58 * s, 12 * s, 50 * s); }
      if (e.type === 'shade' && e.minion) { g.globalAlpha *= 0.85; }
      break;
    }
    case 'spitter': {
      const inflate = e.atk && e.af < e.atk.tele ? 1 + e.af / e.atk.tele * 0.25 : 1; g.fillStyle = col;
      g.beginPath(); g.ellipse(e.x, e.y - 15 * s * inflate, 18 * s * inflate, 15 * s * inflate + Math.sin(t * 0.15) * 1.5, 0, 0, TAU); g.fill();
      g.fillStyle = '#152a20'; g.beginPath(); g.ellipse(e.x + f * 10 * s, e.y - 12 * s, 5 * s, 4 * s * inflate, 0, 0, TAU); g.fill();
      eye(e.x + f * 6 * s, e.y - 22 * s, 3 * s); break;
    }
    case 'flit': {
      const fl = Math.sin(t * 0.6) * 10; g.fillStyle = col; g.beginPath(); g.ellipse(e.x, e.y - 10, 11 * s, 8 * s, 0, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(e.x - 4, e.y - 12); g.lineTo(e.x - 26 * s, e.y - 18 - fl); g.lineTo(e.x - 10, e.y - 6); g.fill();
      g.beginPath(); g.moveTo(e.x + 4, e.y - 12); g.lineTo(e.x + 26 * s, e.y - 18 - fl); g.lineTo(e.x + 10, e.y - 6); g.fill();
      eye(e.x + f * 5, e.y - 11, 2.5); break;
    }
    case 'bomber': {
      const blink = e.atk && World.frame % 8 < 4; g.fillStyle = blink ? '#ff5a3c' : col; g.beginPath(); g.arc(e.x, e.y - 13 * s, 12 * s, 0, TAU); g.fill();
      g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.moveTo(e.x - 5, e.y - 3); g.lineTo(e.x - 7 + walk * 4, e.y); g.moveTo(e.x + 5, e.y - 3); g.lineTo(e.x + 7 - walk * 4, e.y); g.stroke();
      g.strokeStyle = '#a08060'; g.beginPath(); g.moveTo(e.x, e.y - 25 * s); g.quadraticCurveTo(e.x + 6, e.y - 32 * s, e.x + 3, e.y - 36 * s); g.stroke();
      g.fillStyle = World.frame % 4 < 2 ? '#ffde3c' : '#ff7a3c'; g.beginPath(); g.arc(e.x + 3, e.y - 36 * s, 3, 0, TAU); g.fill();
      eye(e.x + f * 5, e.y - 15 * s, 2.5); break;
    }
    case 'hopper': {
      const sq = e.atk && e.atkName === 'leap' && e.af < 18 ? 0.7 : e.air ? 1.2 : 1; g.fillStyle = col;
      g.beginPath(); g.ellipse(e.x, e.y - 12 * s * sq, 16 * s / Math.sqrt(sq), 12 * s * sq, 0, 0, TAU); g.fill();
      g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.moveTo(e.x - 10, e.y - 6); g.lineTo(e.x - 18, e.y); g.moveTo(e.x + 10, e.y - 6); g.lineTo(e.x + 18, e.y); g.stroke();
      if (e.atk && e.atkName === 'tongue' && e.af >= 14 && e.af <= 22) { g.strokeStyle = '#ff6b8a'; g.lineWidth = 4; g.beginPath(); g.moveTo(e.x + f * 12, e.y - 14); g.lineTo(e.x + f * 70 * s, e.y - 16); g.stroke(); }
      eye(e.x + f * 7 * s, e.y - 22 * s * sq, 3); eye(e.x + f * 1 * s, e.y - 23 * s * sq, 3); break;
    }
    case 'warlock': {
      const bob = Math.sin(t * 0.07) * 3; g.fillStyle = col; g.beginPath(); g.moveTo(e.x, e.y - 50 * s + bob); g.lineTo(e.x + 16 * s, e.y + bob); g.lineTo(e.x - 16 * s, e.y + bob); g.fill();
      g.beginPath(); g.arc(e.x, e.y - 50 * s + bob, 8 * s, 0, TAU); g.fill();
      g.fillStyle = tele ? '#ffffff' : '#c77dff'; g.beginPath(); g.arc(e.x + f * 20 * s, e.y - 34 * s + bob, 5 + (tele ? e.af / 8 : 0), 0, TAU); g.fill();
      eye(e.x + f * 3, e.y - 51 * s + bob, 2.5); break;
    }
    case 'gatekeeper': drawGatekeeper(g, e, col, af); break;
    case 'matriarch': drawMatriarch(g, e, col, t); break;
    case 'crown': drawCrown(g, e, col, t); break;
  }
  g.shadowBlur = 0; g.globalAlpha = 1;
  if (e.ward > 0) { g.strokeStyle = 'rgba(125,249,255,0.7)'; g.lineWidth = 2; g.beginPath(); g.arc(e.x, e.y - e.h / 2, Math.max(e.w, e.h) * 0.7, 0, TAU); g.stroke(); }
  // sniper aim laser
  if (e.type === 'sniper' && e.aim != null && e.atk) { const locked = e.af >= 60; g.strokeStyle = locked ? 'rgba(255,40,40,0.9)' : 'rgba(255,80,80,0.35)'; g.lineWidth = locked ? 2.5 : 1.5; g.beginPath(); g.moveTo(e.x, e.y - 36); g.lineTo(e.x + Math.cos(e.aim) * 900, e.y - 36 + Math.sin(e.aim) * 900); g.stroke(); }
  // hp bar
  if (!e.boss && e.hp < e.maxHp && !e.dying) { const w = Math.max(30, e.w); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(e.x - w / 2, e.y - e.h - 12, w, 4); g.fillStyle = '#ff4fd8'; g.fillRect(e.x - w / 2, e.y - e.h - 12, w * Math.max(0, e.hp / e.maxHp), 4); }
  // telegraph "!"
  if (tele && !e.boss && e.type !== 'bomber') { g.fillStyle = '#ffde3c'; g.font = 'bold 18px ui-monospace,monospace'; g.textAlign = 'center'; g.fillText('!', e.x, e.y - e.h - 18); }
}
function drawGatekeeper(g, e, col, af) {
  const f = e.face, n = e.atkName, tl = e.atk ? e.atk.tele : 0; let pose = P(0, -24, 0.1, 10, 14, -6, 16, 7, 24, -7, 24, 60);
  if (e.atk) {
    if (n === 'sweep') pose = af < tl ? P(-2, -24, -0.2, -10, -18, -6, 10, 8, 24, -8, 24, -140) : P(4, -22, 0.4, 24, 6, -8, 10, 14, 24, -12, 24, 10);
    if (n === 'leap') pose = e.air ? POSE.jump : POSE.crouch;
    if (n === 'charge') pose = P(6, -22, 0.5, 20, 0, 4, 8, 18, 20, -20, 20, 0);
    if (n === 'waves') pose = af % 20 < 10 ? P(-2, -24, -0.2, -10, -18, -6, 10, 8, 24, -8, 24, -140) : P(4, -22, 0.4, 24, 6, -8, 10, 14, 24, -12, 24, 10);
  }
  const J = drawStick(g, e.x, e.y, f, pose, col, { s: 2.9, lw: 3.4 });
  g.fillStyle = '#4a3d66'; g.beginPath(); g.arc(J.hd[0], J.hd[1], 26, Math.PI, 0); g.fill(); g.fillRect(J.hd[0] - 26, J.hd[1] - 2, 52, 10);
  g.fillStyle = '#ff4fd8'; g.fillRect(J.hd[0] + f * 4, J.hd[1] - 2, f * 16, 4);
  g.strokeStyle = '#ff4fd8'; g.lineWidth = 5; g.beginPath(); g.moveTo(J.hd[0], J.hd[1] - 26); g.quadraticCurveTo(J.hd[0] - f * 30, J.hd[1] - 46, J.hd[0] - f * 50, J.hd[1] - 20); g.stroke();
  drawWeapon(g, 'sword', J.h1[0], J.h1[1], f, pose[11], 2.6, col, { len: 46 });
}
function drawMatriarch(g, e, col, t) {
  const fl = Math.sin(t * 0.5) * 20, x = e.x, y = e.y - 40, f = e.face;
  g.fillStyle = 'rgba(255,240,200,0.35)'; g.beginPath(); g.ellipse(x - 30, y - 30 - fl * 0.5, 50, 18, -0.6, 0, TAU); g.ellipse(x + 30, y - 30 - fl * 0.5, 50, 18, 0.6, 0, TAU); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(x - f * 40, y + 10, 42, 28, 0, 0, TAU); g.fill();
  g.fillStyle = '#ffe14a'; for (let i = 0; i < 3; i++) g.fillRect(x - f * (24 + i * 14), y - 10, 6, 40);
  g.fillStyle = col; g.beginPath(); g.ellipse(x + f * 10, y, 30, 24, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(x + f * 40, y - 6, 20, 0, TAU); g.fill();
  g.fillStyle = e.flash ? '#fff' : '#ffe14a'; g.beginPath(); g.arc(x + f * 48, y - 10, 6, 0, TAU); g.arc(x + f * 36, y - 12, 5, 0, TAU); g.fill();
  g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.moveTo(x - f * 78, y + 12); g.lineTo(x - f * 96, y + 22); g.stroke();
}
function drawCrown(g, e, col, t) {
  const x = e.x, y = e.y - 50; const ph = BOSS.crown.phase(e);
  for (let i = 0; i < 6 + ph * 2; i++) { const a = t * 0.02 * (i % 2 ? 1 : -1) + i; const r = 80 + Math.sin(t * 0.03 + i) * 10; g.fillStyle = '#ff3cd5'; g.save(); g.translate(x + Math.cos(a) * r, y + Math.sin(a) * r); g.rotate(a); g.fillRect(-4, -9, 8, 18); g.restore(); }
  const grd = g.createRadialGradient(x, y, 10, x, y, 60); grd.addColorStop(0, e.flash ? '#ffffff' : '#3a1f5c'); grd.addColorStop(1, col); g.fillStyle = grd; g.beginPath(); g.arc(x, y, 52, 0, TAU); g.fill();
  g.fillStyle = '#ffd24a'; g.beginPath(); g.moveTo(x - 44, y - 34); for (let i = 0; i <= 5; i++) { const px = x - 44 + i * 17.6; g.lineTo(px, y - 34 - (i % 2 ? 0 : 30)); g.lineTo(px + 8.8, y - 34); } g.lineTo(x + 44, y - 26); g.lineTo(x - 44, y - 26); g.fill();
  const eyeOpen = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.02)); g.fillStyle = '#ff3cd5'; g.beginPath(); g.ellipse(x, y + 4, 20, 12 * eyeOpen, 0, 0, TAU); g.fill();
  g.fillStyle = '#fff'; const T = e.target ? e.target() : null; const ex = T ? clamp(T.dx / 40, -8, 8) : 0; g.beginPath(); g.arc(x + ex, y + 4, 5 * eyeOpen, 0, TAU); g.fill();
}

// ----- projectiles -----
function drawProj(g, p) {
  const T = p.t || 0;
  switch (p.type) {
    case 'wave': g.strokeStyle = '#bfe0ff'; g.lineWidth = 5; g.beginPath(); g.arc(p.x - sign(p.vx) * 10, p.y, 20, sign(p.vx) > 0 ? -1.1 : Math.PI - 1.1 + 0.0, sign(p.vx) > 0 ? 1.1 : Math.PI + 1.1); g.stroke(); break;
    case 'orb': g.fillStyle = 'rgba(157,255,138,0.4)'; g.beginPath(); g.arc(p.x, p.y, p.r + 4, 0, TAU); g.fill(); g.fillStyle = '#e8ffe0'; g.beginPath(); g.arc(p.x, p.y, p.r * 0.7, 0, TAU); g.fill(); break;
    case 'bolt': g.strokeStyle = '#d8ffb0'; g.lineWidth = 3; g.beginPath(); g.moveTo(p.x - p.vx * 1.5, p.y); for (let i = 1; i <= 4; i++) g.lineTo(p.x - p.vx * 1.5 + p.vx * 0.4 * i, p.y + rr(-6, 6)); g.stroke(); break;
    case 'mine': g.fillStyle = p.t > 30 && World.frame % 30 < 15 ? '#7dff8a' : '#2f6b38'; g.beginPath(); g.arc(p.x, p.y, 8, 0, TAU); g.fill(); g.strokeStyle = '#7dff8a'; g.lineWidth = 1.5; g.beginPath(); g.arc(p.x, p.y, 12, 0, TAU); g.stroke(); break;
    case 'hammer': g.save(); g.translate(p.x, p.y); g.rotate(T * 0.4); drawWeapon(g, 'hammer', -14, 0, 1, 0, 1, '#fff'); g.restore(); break;
    case 'shock': case 'eshock': g.fillStyle = p.type === 'shock' ? '#ffcf70' : '#ff6b6b'; g.beginPath(); g.moveTo(p.x - 14, p.y + 10); g.lineTo(p.x, p.y - 18 - Math.sin(T) * 4); g.lineTo(p.x + 14, p.y + 10); g.fill(); break;
    case 'goo': g.fillStyle = '#a8ff3c'; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); break;
    case 'bullet': g.strokeStyle = '#ff9a9a'; g.lineWidth = 4; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 1.2, p.y - p.vy * 1.2); g.stroke(); break;
    case 'hex': g.fillStyle = '#c77dff'; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, p.r * 0.5, T * 0.2, T * 0.2 + 4); g.stroke(); break;
    case 'stinger': g.strokeStyle = '#ffe14a'; g.lineWidth = 3; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 1.6, p.y - p.vy * 1.6); g.stroke(); break;
    case 'shard': g.save(); g.translate(p.x, p.y); g.rotate(Math.atan2(p.vy, p.vx)); g.fillStyle = '#ff6bd6'; g.beginPath(); g.moveTo(12, 0); g.lineTo(-8, -6); g.lineTo(-8, 6); g.fill(); g.restore(); break;
    case 'egg': g.fillStyle = '#efe3c0'; g.beginPath(); g.ellipse(p.x, p.y, 9, 12, 0, 0, TAU); g.fill(); break;
    case 'swordwave': g.strokeStyle = '#ff4fd8'; g.lineWidth = 7; g.beginPath(); g.arc(p.x - sign(p.vx) * 14, p.y, 26, sign(p.vx) > 0 ? -1.1 : Math.PI - 1.1, sign(p.vx) > 0 ? 1.1 : Math.PI + 1.1); g.stroke(); break;
    case 'pillar': { const D = PROJ.pillar; if (T < D.delay) { g.fillStyle = `rgba(255,60,213,${0.12 + 0.2 * (T % 10 < 5 ? 1 : 0)})`; g.fillRect(p.x - p.r, p.y - 900, p.r * 2, 900); g.strokeStyle = 'rgba(255,60,213,0.6)'; g.lineWidth = 2; g.strokeRect(p.x - p.r, p.y - 900, p.r * 2, 900); } else { const a = 1 - (T - D.delay) / (D.life - D.delay); g.fillStyle = `rgba(255,120,230,${0.85 * a})`; g.fillRect(p.x - p.r, p.y - 900, p.r * 2, 900); g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(p.x - p.r * 0.35, p.y - 900, p.r * 0.7, 900); } break; }
    case 'blast': case 'ebomb': break;
  }
}
function drawParticles(g) {
  for (const p of Particles) {
    const a = clamp(p.life / p.max, 0, 1); g.globalAlpha = a;
    switch (p.k) {
      case 'spark': case 'dust': g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.s * (p.k === 'dust' ? (1.5 - a) : a + 0.3), 0, TAU); g.fill(); break;
      case 'ring': g.strokeStyle = p.c; g.lineWidth = 3 * a + 1; g.beginPath(); g.arc(p.x, p.y, lerp(p.r, p.r0, a), 0, TAU); g.stroke(); break;
      case 'star': { g.fillStyle = p.c; g.beginPath(); const r = p.r * (1.3 - a * 0.3); for (let i = 0; i < 10; i++) { const rr2 = i % 2 ? r * 0.35 : r; const an = i / 10 * TAU; g.lineTo(p.x + Math.cos(an) * rr2, p.y + Math.sin(an) * rr2); } g.fill(); break; }
      case 'slash': g.strokeStyle = p.c; g.lineWidth = 4 * a; g.beginPath(); g.moveTo(p.x - Math.cos(p.a) * p.r, p.y - Math.sin(p.a) * p.r); g.lineTo(p.x + Math.cos(p.a) * p.r, p.y + Math.sin(p.a) * p.r); g.stroke(); break;
      case 'text': g.font = `900 ${p.s}px ui-monospace,monospace`; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.strokeText(p.t, p.x, p.y); g.fillStyle = p.c; g.fillText(p.t, p.x, p.y); break;
      case 'ko': { g.strokeStyle = p.c; g.lineWidth = 8 * a; for (let i = 0; i < 8; i++) { const an = i / 8 * TAU; const r1 = (1 - a) * 160; g.beginPath(); g.moveTo(p.x + Math.cos(an) * r1 * 0.4, p.y + Math.sin(an) * r1 * 0.4); g.lineTo(p.x + Math.cos(an) * r1, p.y + Math.sin(an) * r1); g.stroke(); } break; }
      case 'after': g.strokeStyle = p.c; g.lineWidth = 5; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x, p.y - 55); g.stroke(); break;
      case 'zap': g.strokeStyle = p.c; g.lineWidth = 2.5; g.beginPath(); g.moveTo(p.x, p.y); for (let i = 1; i < 6; i++) g.lineTo(lerp(p.x, p.x2, i / 6) + rr(-8, 8), lerp(p.y, p.y2, i / 6) + rr(-8, 8)); g.lineTo(p.x2, p.y2); g.stroke(); break;
      case 'portal': g.strokeStyle = p.c; g.lineWidth = 3; g.beginPath(); g.ellipse(p.x, p.y, 20 * Math.sin(a * Math.PI), 34 * Math.sin(a * Math.PI), 0, 0, TAU); g.stroke(); break;
    }
  }
  g.globalAlpha = 1;
}

// ----- stage -----
function drawBackground(g, st, cam) {
  const B = st.B; const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, B.sky[0]); gr.addColorStop(1, B.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (const layer of [0, 1]) {
    const par = layer ? 0.45 : 0.18; g.fillStyle = layer ? B.mid : B.far;
    for (const d of st.deco) {
      if (d.layer !== layer) continue;
      const sx = (d.x - cam.x * par) * (layer ? 1 : 0.8) + W / 2 - cam.x * (1 - par) * 0 ;
      const x = d.x * (layer ? 0.9 : 0.7) - cam.x * par + W / 2 - (cam.x * (layer ? 0.9 : 0.7) - cam.x * par) - (layer ? 0 : 0);
      const px = ((d.x - cam.x) * par) + W / 2 + (d.x * (1 - par) - d.x * (1 - par));
      const X = W / 2 + (d.x - cam.x) * par, base = H - 40 - (cam.y - 400) * par * 0.4 + (layer ? 30 : 0);
      const s = d.s * (layer ? 1 : 1.5);
      drawDeco(g, B.deco, X, base, s, d.v, layer);
    }
  }
}
function drawDeco(g, k, x, y, s, v, layer) {
  if (x < -200 || x > W + 200) return;
  if (k === 'columns') { const h = 160 * s + v * 80; g.fillRect(x - 14 * s, y - h, 28 * s, h); g.fillRect(x - 22 * s, y - h - 12 * s, 44 * s, 12 * s); if (v > 0.6) { g.fillRect(x - 22 * s, y - h * 0.5, 44 * s, 8 * s); } }
  else if (k === 'trees') { g.fillRect(x - 5 * s, y - 120 * s, 10 * s, 120 * s); g.beginPath(); g.arc(x, y - 130 * s, 44 * s, 0, TAU); g.arc(x - 30 * s, y - 105 * s, 30 * s, 0, TAU); g.arc(x + 30 * s, y - 108 * s, 32 * s, 0, TAU); g.fill(); }
  else if (k === 'gears') { const r = 50 * s + v * 30; g.save(); g.translate(x, y - 150 * s); g.rotate(World.frame * 0.003 * (v > 0.5 ? 1 : -1)); g.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; const rr2 = i % 2 ? r : r * 1.18; g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } g.fill(); g.restore(); g.fillRect(x - 6 * s, y - 150 * s, 12 * s, 150 * s); }
  else if (k === 'crystals') { const h = 120 * s + v * 90; g.beginPath(); g.moveTo(x - 20 * s, y); g.lineTo(x - 8 * s, y - h); g.lineTo(x + 6 * s, y - h * 1.08); g.lineTo(x + 22 * s, y); g.fill(); g.beginPath(); g.moveTo(x + 10 * s, y); g.lineTo(x + 30 * s, y - h * 0.6); g.lineTo(x + 40 * s, y); g.fill(); }
  else if (k === 'peaks') { const h = 200 * s + v * 120; g.beginPath(); g.moveTo(x - 120 * s, y); g.lineTo(x, y - h); g.lineTo(x + 120 * s, y); g.fill(); }
  else if (k === 'shards') { const h = 90 * s + v * 60; g.save(); g.translate(x, y - 200 * s - Math.sin(World.frame * 0.01 + v * 10) * 20); g.rotate(v * 2); g.beginPath(); g.moveTo(0, -h / 2); g.lineTo(14 * s, 0); g.lineTo(0, h / 2); g.lineTo(-14 * s, 0); g.fill(); g.restore(); }
}
function drawStage(g, st) {
  const B = st.B;
  for (const s of st.solids) { g.fillStyle = B.ground; g.fillRect(s.x, s.y, s.w, Math.min(s.h, 2000)); g.fillStyle = B.top; g.fillRect(s.x, s.y, s.w, Math.min(8, s.h)); }
  for (const p of st.plats) { g.fillStyle = B.plat; g.fillRect(p.x, p.y, p.w, 10); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(p.x, p.y + 10, p.w, 4); }
  // events
  for (const ev of st.events) {
    if (ev.used) continue;
    if (ev.type === 'chest') { g.fillStyle = '#8a5a2b'; g.fillRect(ev.x - 18, ev.y - 26, 36, 26); g.fillStyle = '#ffd24a'; g.fillRect(ev.x - 18, ev.y - 18, 36, 4); g.fillRect(ev.x - 3, ev.y - 22, 6, 8); }
    if (ev.type === 'spring') { g.fillStyle = '#6f8aa0'; g.fillRect(ev.x - 24, ev.y - 12, 48, 12); for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(125,220,255,0.7)'; g.beginPath(); g.arc(ev.x + (i - 1) * 10, ev.y - 16 - ((World.frame * 0.6 + i * 12) % 30), 4, 0, TAU); g.fill(); } }
    if (ev.type === 'elite' && !ev.spawned) { g.fillStyle = '#3a2550'; g.fillRect(ev.x - 10, ev.y - 60, 20, 60); g.fillStyle = '#ff4a4a'; g.beginPath(); g.arc(ev.x, ev.y - 66, 8, 0, TAU); g.fill(); }
    if (dist(ev.x, ev.y, World.cam.x, World.cam.y) < 900 && !ev.spawned) { g.font = 'bold 12px ui-monospace,monospace'; g.textAlign = 'center'; g.fillStyle = '#000a'; g.fillText({ chest: 'BOON CHEST', spring: 'HEALING SPRING', elite: 'ELITE CHALLENGE' }[ev.type], ev.x, ev.y - 76); }
  }
  // goal portal
  if (st.goal) { const open = st.arenas.every(a => a.done); const x = st.goal.x, y = st.goal.y - 60; g.strokeStyle = open ? '#b05cff' : 'rgba(0,0,0,0.25)'; g.lineWidth = 6; g.beginPath(); g.ellipse(x, y, 30, 56, 0, 0, TAU); g.stroke(); if (open) { g.fillStyle = `rgba(176,92,255,${0.35 + Math.sin(World.frame * 0.1) * 0.15})`; g.fill(); g.fillStyle = '#fff'; g.font = 'bold 13px ui-monospace,monospace'; g.textAlign = 'center'; g.fillText('EXIT', x, y - 70); } }
  // barriers
  const Bb = World.barriers; if (Bb) for (const bx of [Bb.l, Bb.r]) { const a = 0.5 + Math.sin(World.frame * 0.15) * 0.2; g.fillStyle = `rgba(255,79,216,${a * 0.35})`; g.fillRect(bx - 6, World.cam.y - 900, 12, 1800); g.fillStyle = `rgba(255,79,216,${a})`; g.fillRect(bx - 2, World.cam.y - 900, 4, 1800); }
}
function drawItems(g) { for (const it of World.items) { if (it.type === 'food') { const b = Math.sin(it.t * 0.1) * 2; g.fillStyle = '#c86a3a'; g.beginPath(); g.arc(it.x, it.y - 10 + b, 8, 0, TAU); g.fill(); g.fillStyle = '#f2e6d0'; g.fillRect(it.x + 4, it.y - 12 + b, 10, 4); } } }
