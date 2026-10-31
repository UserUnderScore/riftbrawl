// ===== RENDERING =====
const cv = document.getElementById('c'); const ctx = cv.getContext('2d');

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
// pose for a fighter based on state (procedural movement animation)
function fighterPose(f) {
  const t = World.frame;
  switch (f.state) {
    case 'move': return kfPose(f.move.kf, f.mf + (f.mft - f.mf || 0));
    case 'run': {
      if (f.turnT > 0) return P(-3, -23, -0.3, -10, 6, -14, 4, 14, 22, -8, 24, 120);
      const ph = f.runPh || 0, c = Math.sin(ph), c2 = Math.cos(ph), sp = clamp(Math.abs(f.dxr || 0) / 6.5, 0.35, 1);
      return P(0, -24 - Math.abs(c2) * 2.5 * sp, 0.08 + 0.24 * sp, 4 - c * 13 * sp, 13 - Math.abs(c) * 3, -2 + c * 13 * sp, 14 - Math.abs(c) * 2, c * 14 * sp, 23 - Math.max(0, c2) * 10 * sp, -c * 14 * sp, 23 - Math.max(0, -c2) * 10 * sp, 40 + c * 25);
    }
    case 'idle': { const b = Math.sin(t * 0.06 + f.slot) * 1; const sway = Math.sin(t * 0.03 + f.slot) * 1.5; return P(sway * 0.3, -25 + b, 0.05, 7, 18 - b * 1.4, -5, 18 - b, 7 - sway * 0.3, 25 - b, -6 - sway * 0.3, 25 - b, 70 + b * 4); }
    case 'land0': return P(0, -17, 0.25, 12, 10, -6, 12, 10, 17, -10, 17, 40);
    case 'crouch': return POSE.crouch;
    case 'squat': return P(0, -16, 0.3, 10, 12, -8, 12, 10, 16, -10, 16, 40);
    case 'land': return P(0, -15, 0.3, 12, 12, -6, 14, 11, 15, -11, 15, 40);
    case 'air': {
      if (f.ff && f.vy > 0) return P(0, -26, -0.05, 10, -22, -10, -22, 3, 26, -3, 26, -80);
      if (f.vy < -3) return P(0, -28, 0.1, 12, -2, -10, 4, 9, 14, -6, 19, 20);
      const w = Math.sin(t * 0.25) * 4; return P(0, -26, -0.08, 13, -8 + w, -13, -6 - w, 7, 23, -7, 19, 10);
    }
    case 'helpless': { const w = Math.sin(t * 0.15) * 3; return P(0, -26, -0.25, 12, 10 + w, -12, 10 - w, 6, 24, -6, 22, 110); }
    case 'hitstun': return f.tumble ? P(0, -26, 0.2, 16, -4, -16, -4, 12, 16, -12, 16, 200) : POSE.hurt;
    case 'shield': return P(0, -21, 0.2, 14, 4, 10, 8, 10, 21, -9, 21, -20);
    case 'roll': return P(0, -20, 0.9, 10, 10, 6, 12, 10, 8, -2, 12, 90);
    case 'spot': { const k = Math.sin(clamp(f.sf / 26, 0, 1) * Math.PI); return P(-4 * k, -25 + 4 * k, 0.05 + 0.5 * k, 4, 18, -6, 18, 8, 25 - 4 * k, -8, 25 - 4 * k, 80); }
    case 'adodge': return P(0, -26, 0.5, 8, 8, -6, 10, 10, 10, -4, 14, 90);
    case 'ledge': { const w = Math.sin(t * 0.05) * 2; return P(-6, -26, 0.15, 14, -6, 10, -6, 2 + w, 24, -4 - w, 22, -80); }
    case 'shieldbreak': { const w = Math.sin(t * 0.1) * 0.15; return P(0, -24, 0.4 + w, 6, 22, -6, 22, 6, 24, -6, 24, 90); }
    case 'shielddrop': return mix(POSE.shield, STAND, clamp(f.sf / 11, 0, 1));
    case 'revive': { const b = Math.sin(t * 0.08) * 1; return P(0, -25 + b, 0.02, 10, 6 - b, -10, 6 - b, 5, 25 - b, -5, 25 - b, 40); }
    case 'tech': return mix(P(0, -14, 0.5, 14, 12, -10, 14, 12, 14, -12, 14, 60), STAND, clamp(f.sf / 18, 0, 1));
    case 'techroll': case 'getuproll': return P(0, -18, 0.9, 10, 10, 6, 12, 10, 8, -2, 12, 90);
    case 'walltech': return P(-4, -26, -0.15, 15, -8, 15, 6, 10, 18, 2, 24, -40);
    case 'ceiltech': return P(0, -26, 0, 6, -27, -6, -27, 6, 24, -6, 22, -90);
    case 'down': return P(0, -25, 0.05, 10, 12, -8, 14, 6, 25, -6, 24, 80);
    case 'getup': return mix(P(0, -25, 0.05, 10, 12, -8, 14, 6, 25, -6, 24, 80), STAND, clamp(f.sf / 26, 0, 1));
    default: return STAND;
  }
}
function fighterDy(f) {
  if (f.state === 'down') { const b = f.sf < 14 ? Math.abs(Math.sin(f.sf / 14 * Math.PI)) * 10 : 0; return 21 - b; }
  if (f.state === 'getup') return 21 * (1 - clamp(f.sf / 14, 0, 1));
  if (f.state === 'getuproll' && f.sf < 6) return 21 * (1 - f.sf / 6) + 6;
  if (f.state === 'techroll' || f.state === 'getuproll') return 8;
  if (f.state === 'move' && f.move && f.move.name === 'getupatk') return 21 * (1 - clamp(f.mf / 8, 0, 1));
  return 0;
}
function fighterRot(f) {
  // whole-body rotation for flips, rolls, tumbles, knockdowns and getups
  const lie = -Math.PI / 2;
  if (f.state === 'down') return lie;
  if (f.state === 'getup') return lie * (1 - clamp(f.sf / 14, 0, 1));
  if (f.state === 'move' && f.move && f.move.name === 'getupatk') return lie * (1 - clamp(f.mf / 8, 0, 1));
  if (f.state === 'techroll' || f.state === 'getuproll') return clamp(f.sf / 30, 0, 1) * TAU * (f.rollDir || 1) * f.face;
  if (f.state === 'tech') return (1 - clamp(f.sf / 8, 0, 1)) * 0.8;
  if (f.state === 'air' && f.vy < 0 && f.jumps < f.maxJumps && f.sf < 22) return (f.sf / 22) * TAU;
  if (f.state === 'roll') return clamp(f.sf / 22, 0, 1) * TAU * (f.rollDir || 1) * f.face;
  if (f.state === 'adodge') return clamp(f.sf / 24, 0, 1) * TAU;
  if (f.state === 'hitstun' && f.tumble) return World.frame * 0.3;
  return 0;
}
const ELC = { fire: ['#ff9a3c', '#ffd23c', '#ff5a3c'], ice: ['#bfefff', '#e8fbff', '#7fd6ff'], shock: ['#f4ff7a', '#ffffff', '#c6ff5a'], wind: ['#ffffff', '#e8f7ff', '#cdeaff'], arcane: ['#d29bff', '#f0d9ff', '#9b5de5'] };
function drawElementHB(g, hb, el) {
  const t = World.frame, C = ELC[el];
  if (el === 'fire') { for (let i = 0; i < 6; i++) { g.fillStyle = C[i % 3]; g.globalAlpha = 0.75; g.beginPath(); g.arc(hb.x + rr(-0.6, 0.6) * hb.r, hb.y + rr(-0.6, 0.6) * hb.r, hb.r * rr(0.25, 0.5), 0, TAU); g.fill(); } }
  else if (el === 'ice') { g.globalAlpha = 0.85; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + t * 0.05; g.fillStyle = C[i % 3]; g.beginPath(); g.moveTo(hb.x + Math.cos(a) * hb.r, hb.y + Math.sin(a) * hb.r); g.lineTo(hb.x + Math.cos(a + 0.3) * hb.r * 0.3, hb.y + Math.sin(a + 0.3) * hb.r * 0.3); g.lineTo(hb.x + Math.cos(a - 0.3) * hb.r * 0.3, hb.y + Math.sin(a - 0.3) * hb.r * 0.3); g.fill(); } }
  else if (el === 'shock') { g.strokeStyle = C[t % 3]; g.lineWidth = 2.5; g.globalAlpha = 0.9; for (let k = 0; k < 3; k++) { g.beginPath(); let a = rr(0, TAU); g.moveTo(hb.x, hb.y); for (let i = 1; i <= 4; i++) g.lineTo(hb.x + Math.cos(a) * hb.r * i / 4 + rr(-5, 5), hb.y + Math.sin(a) * hb.r * i / 4 + rr(-5, 5)); g.stroke(); } }
  else if (el === 'wind') { g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(hb.x, hb.y, hb.r * (0.4 + k * 0.25), t * 0.3 + k, t * 0.3 + k + 2.2); g.stroke(); } }
  else if (el === 'arcane') { g.strokeStyle = C[0]; g.lineWidth = 3; g.globalAlpha = 0.8; g.beginPath(); g.arc(hb.x, hb.y, hb.r, 0, TAU); g.stroke(); g.strokeStyle = C[1]; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i <= 5; i++) { const a = i * 4 * Math.PI / 5 + t * 0.05; g.lineTo(hb.x + Math.cos(a) * hb.r * 0.7, hb.y + Math.sin(a) * hb.r * 0.7); } g.stroke(); for (let i = 0; i < 3; i++) { g.fillStyle = C[2]; g.beginPath(); g.arc(hb.x + rr(-1, 1) * hb.r, hb.y + rr(-1, 1) * hb.r, 2, 0, TAU); g.fill(); } }
  g.globalAlpha = 1;
}
function drawFighter(g, f) {
  if (f.out || f.dead) return;
  const def = f.def, s = f.mods ? f.mods.size : 1, rival = !!f.isRival;
  // render-side animation bookkeeping
  const dx = f.x - (f.lastX ?? f.x); f.lastX = f.x; f.dxr = lerp(f.dxr || 0, dx, 0.3);
  if (f.state === 'run') f.runPh = (f.runPh || 0) + Math.min(9, Math.abs(dx)) * 0.085 + 0.02;
  if (f.lastFace !== undefined && f.lastFace !== f.face && f.state === 'run') f.turnT = 7; f.lastFace = f.face; if (f.turnT > 0) f.turnT--;
  const target = fighterPose(f);
  const blend = f.state === 'move' || f.state === 'hitstun' ? 1 : (f.state !== f.lastState ? 0.45 : 0.6);
  f.rp = f.rp && f.state !== 'move' ? mix(f.rp, target, blend) : target; f.lastState = f.state;
  const pose = f.rp;
  if (!f.dead) dropShadow(g, f.x, f.y, 16 * s);
  g.save();
  if (rival && f.spawnT > 0) { const k = 1 - f.spawnT / 40; g.globalAlpha = k; }
  if (f.intang > 0 && f.state !== 'roll' && f.state !== 'spot' && f.state !== 'adodge' && World.frame % 6 < 3 && f.intang > 20) g.globalAlpha = 0.5;
  if (['roll', 'spot', 'adodge'].includes(f.state) && f.intang > 0) g.globalAlpha = 0.6;
  const shakeX = f.hitlag > 0 && f.state === 'hitstun' ? rr(-3, 3) : 0;
  let col = rival ? '#2b2140' : def.color, dark = rival ? '#160f22' : def.dark, acc = rival ? def.color : def.dark;
  if (f.flash > 0 || (f.hitlag > 0 && f.state === 'hitstun' && World.frame % 4 < 2)) col = '#ffffff';
  if (f.frozenT > 0) { col = '#9fdcff'; dark = '#6fb8e0'; }
  const rot = fighterRot(f), fdy = fighterDy(f) * s;
  if (fdy) g.translate(0, fdy);
  if (rot) { const cy = f.y - 28 * s; g.translate(f.x, cy); g.rotate(rot * f.face); g.translate(-f.x, -cy); }
  if (f.state === 'revive') { g.save(); g.globalCompositeOperation = 'lighter'; const hy = f.y + 4; const hg = g.createRadialGradient(f.x, hy, 4, f.x, hy, 46); hg.addColorStop(0, 'rgba(255,255,255,0.9)'); hg.addColorStop(1, rgba(def.color, 0)); g.fillStyle = hg; g.beginPath(); g.ellipse(f.x, hy, 46, 12, 0, 0, TAU); g.fill(); g.restore(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.ellipse(f.x, hy, 34, 7, 0, 0, TAU); g.stroke(); }
  const A = artFor(def.id, rival);
  const expr = f.state === 'hitstun' || f.state === 'shieldbreak' ? 'hurt' : f.state === 'move' ? 'fight' : 'normal';
  if (rival || (f.state === 'move' && f.chgT > 0)) { const c = rival ? def.color : '#ffe27a'; const k = rival ? 0.28 : 0.35 + 0.25 * Math.sin(World.frame * 0.5); g.save(); g.globalCompositeOperation = 'lighter'; const gg = g.createRadialGradient(f.x, f.y - 30 * s, 4, f.x, f.y - 30 * s, 46 * s); gg.addColorStop(0, rgba(c, k)); gg.addColorStop(1, rgba(c, 0)); g.fillStyle = gg; g.beginPath(); g.arc(f.x, f.y - 30 * s, 46 * s, 0, TAU); g.fill(); g.restore(); }
  const wpn = def.weapon !== 'none' && !(def.id === 3 && f.hammerOut) ? (J) => drawWeaponHD(g, def.weapon, J.h1[0], J.h1[1], f.face, pose[11], s, { glow: rival ? def.color : '#9dff8a' }) : null;
  const J = drawBody(g, f.x + shakeX, f.y, f.face, pose, A, s, { flash: col === '#ffffff', expr, eye: def.color, weapon: wpn, seed: (f.id || 0) * 37 + f.slot * 91, vx: f.dxr || 0 });
  if (f.state === 'move' && f.move.name === 'nspec' && def.id === 2 && f.chgT > 0) { g.save(); g.globalCompositeOperation = 'lighter'; const r = 8 + f.chg * 14; const gg = g.createRadialGradient(J.h1[0] + f.face * 12, J.h1[1], 1, J.h1[0] + f.face * 12, J.h1[1], r * 1.6); gg.addColorStop(0, 'rgba(230,255,220,0.95)'); gg.addColorStop(0.5, 'rgba(120,255,120,0.6)'); gg.addColorStop(1, 'rgba(120,255,120,0)'); g.fillStyle = gg; g.beginPath(); g.arc(J.h1[0] + f.face * 12, J.h1[1], r * 1.6, 0, TAU); g.fill(); g.restore(); }
  g.restore();
  if (f.frozenT > 0) { g.fillStyle = 'rgba(190,240,255,0.35)'; g.strokeStyle = 'rgba(230,250,255,0.8)'; g.lineWidth = 2; g.fillRect(f.x - 16, f.y - 62, 32, 62); g.strokeRect(f.x - 16, f.y - 62, 32, 62); }
  if (f.state === 'shield') { const r = 16 + 22 * (f.shieldHP / 50); g.fillStyle = rival ? 'rgba(200,120,255,0.3)' : 'rgba(120,220,255,0.35)'; g.strokeStyle = 'rgba(200,245,255,0.8)'; g.lineWidth = 2; g.beginPath(); g.arc(f.x, f.y - 30, r, 0, TAU); g.fill(); g.stroke(); }
  if (f.mods && f.mods.orb && !rival) { const ox = f.x + Math.cos(f.orbA) * 46, oy = f.y - 30 + Math.sin(f.orbA) * 46; g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(ox, oy, 7, 0, TAU); g.fill(); }
  if (f.state === 'move') for (const hb of Fighter.prototype.hitboxes.call(f)) { if (hb.h.orb || !hb.main) continue; if (hb.h.el) drawElementHB(g, hb, hb.h.el); else if (false) { g.strokeStyle = rival ? 'rgba(220,160,255,0.55)' : 'rgba(255,255,255,0.55)'; g.lineWidth = 3; g.beginPath(); g.arc(hb.x, hb.y, hb.r * 0.9, 0, TAU); g.stroke(); } }
  if (rival) { const pc = Math.floor(f.pct) + '%'; g.font = '900 13px Rubik,system-ui,sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#000'; g.strokeText(pc, f.x, f.y - 90 * s); g.fillStyle = pctColor(f.pct * 160 / f.limit); g.fillText(pc, f.x, f.y - 90 * s); return; }
  g.fillStyle = def.color; g.font = 'bold 13px Rubik,system-ui,sans-serif'; g.textAlign = 'center';
  const ty = f.y - (def.id === 2 ? 108 : def.id === 3 ? 98 : 88) * s; g.lineWidth = 3; g.strokeStyle = OL; g.strokeText('P' + (f.slot + 1), f.x, ty); g.fillText('P' + (f.slot + 1), f.x, ty); g.beginPath(); g.moveTo(f.x - 6, ty + 5); g.lineTo(f.x + 6, ty + 5); g.lineTo(f.x, ty + 11); g.closePath(); g.stroke(); g.fill();
}

// ----- enemies (chunky cartoon "subspace" creatures) -----
const SHADE_V = [{ face: '#ffb703', name: 'fist' }, { face: '#e63946', name: 'blade' }, { face: '#4cc9f0', name: 'rang' }];
function eCol(e, base) { if (e.flash > 0) return '#ffffff'; if (e.atk && e.af < (e.atk.tele || 0) && World.frame % 6 < 3) return '#fff3c4'; return base; }
function oval(g, x, y, rx, ry, fill, lw = 3, rot = 0) {
  rx = Math.max(0.5, rx); ry = Math.max(0.5, ry); g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU);
  if (lw && fill[0] === '#' && rx > 4) { const r = Math.max(rx, ry); const gr = g.createRadialGradient(x - rx * 0.35, y - ry * 0.45, r * 0.08, x, y, r * 1.05); gr.addColorStop(0, shade(fill, 0.38)); gr.addColorStop(0.5, fill); gr.addColorStop(1, shade(fill, -0.32)); g.fillStyle = gr; } else g.fillStyle = fill;
  g.fill(); if (lw) { g.strokeStyle = OL; g.lineWidth = lw; g.stroke(); }
}
function bigEye(g, x, y, r, lx, ly, iris = '#1a1423') { oval(g, x, y, r, r, '#fff', 2); oval(g, x + lx * r * 0.35, y + ly * r * 0.35, r * 0.5, r * 0.55, iris, 0); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + lx * r * 0.35 - r * 0.15, y + ly * r * 0.35 - r * 0.2, r * 0.15, 0, TAU); g.fill(); }
function feet(g, x, y, s, walk, col, gap = 8) { oval(g, x - gap * s + walk * 3, y - 3 * s, 6 * s, 4 * s, col, 2.5); oval(g, x + gap * s - walk * 3, y - 3 * s, 6 * s, 4 * s, col, 2.5); }
function drawEnemy(g, e) {
  if (e.dead) return;
  if (e.isRival) { drawFighter(g, e); return; }
  if (!e.def.fly && !e.boss) dropShadow(g, e.x, e.y, e.w * 0.7); else if (e.boss && !e.def.fly) dropShadow(g, e.x, e.y, e.w * 0.6);
  const d = e.def, s = e.scale, f = e.face, t = World.frame + e.id * 7, x = e.x, y = e.y;
  const tele = e.atk && e.af < (e.atk.tele || 0), af = e.atk ? e.af : 0, n = e.atkName;
  const active = e.atk && !tele;
  const walk = Math.sin(t * 0.3) * (Math.abs(e.vx) > 0.3 && !e.air ? 1 : 0);
  const T = e.boss ? null : (World.players.find(p => !p.dead && !p.out) || null); const lx = T ? clamp((T.x - x) / 200, -1, 1) : f, ly = T ? clamp((T.y - 40 - (y - e.h)) / 200, -1, 1) : 0;
  g.save();
  if (e.dying) g.globalAlpha = Math.max(0, 1 - e.dying / 40);
  if (e.spawnT > 0) { const k = 1 - e.spawnT / 40; g.globalAlpha = k; g.translate(x, y); g.scale(0.4 + 0.6 * k, 0.4 + 0.6 * k); g.translate(-x, -y); }
  if (e.hitstun > 0 && !e.boss) { g.translate(x, y - e.h / 2); g.rotate(Math.sin(t * 0.5) * 0.25); g.translate(-x, -(y - e.h / 2)); }
  if (e.elite) { g.shadowColor = { giant: '#ff4a4a', swift: '#ffe14a', volatile: '#ff9a3c', warded: '#7df9ff' }[e.elite]; g.shadowBlur = 16; }
  switch (e.type) {
    case 'shade': {
      const v = SHADE_V[e.id % 3]; const body = eCol(e, d.col);
      feet(g, x, y, s, walk, '#14151f');
      // back fist
      oval(g, x - f * 14 * s, y - 22 * s, 5 * s, 5 * s, body, 2.5);
      oval(g, x, y - 24 * s, 14 * s, 18 * s, body);
      oval(g, x + f * 4 * s, y - 29 * s, 10 * s, 9 * s, eCol(e, v.face), 2.5);
      g.fillStyle = OL; g.fillRect(x + f * 2 * s - 1.5, y - 33 * s, 3, 6 * s); g.fillRect(x + f * 8 * s - 1.5, y - 33 * s, 3, 6 * s);
      let fx = x + f * 14 * s, fy = y - 22 * s;
      if (tele) { fx = x - f * 6 * s; fy = y - 30 * s; } else if (active && (n === 'jab2' || n === 'slash' || n === 'kick')) { fx = x + f * 24 * s; fy = y - 26 * s; } else if (active && n === 'rang') { fx = x + f * 20 * s; fy = y - 34 * s; }
      if (v.name === 'blade') { const a = tele ? -2.2 : active && n === 'slash' ? -0.1 : -0.7; g.strokeStyle = '#e9eef5'; g.lineWidth = 4; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + f * Math.cos(a) * 30 * s, fy + Math.sin(a) * 30 * s); g.stroke(); g.strokeStyle = OL; g.lineWidth = 1.5; g.stroke(); }
      if (v.name === 'rang' && !(n === 'rang' && af > 16) && !World.projs.some(p => p.owner === e)) drawRang(g, fx + f * 6, fy - 4, 0.6, '#4cc9f0');
      oval(g, fx, fy, 5.5 * s, 5.5 * s, body, 2.5);
      if (e.minion) { g.globalAlpha *= 0.85; }
      break;
    }
    case 'spitter': {
      const inflate = tele ? 1 + af / e.atk.tele * 0.25 : 1; const body = eCol(e, '#70e000');
      for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.45 + Math.sin(t * 0.08 + i) * 0.08; oval(g, x + Math.cos(a) * 14 * s, y - 28 * s + Math.sin(a) * 14 * s, 5 * s, 10 * s, '#38b000', 2, a + Math.PI / 2); }
      oval(g, x, y - 15 * s * inflate, 19 * s * inflate, 15 * s * inflate, body);
      oval(g, x - 7 * s, y - 10 * s, 3 * s, 2.5 * s, '#9b5de5', 0); oval(g, x + 5 * s, y - 6 * s, 2.5 * s, 2 * s, '#9b5de5', 0);
      oval(g, x + f * 11 * s, y - 13 * s, 6 * s, (tele ? 6 : 3.5) * s, '#3c1642', 2);
      bigEye(g, x + f * 3 * s, y - 22 * s, 6 * s, lx, ly);
      break;
    }
    case 'lancer': {
      const body = eCol(e, '#ef476f'); const charging = n === 'charge' && active && af < 62; const lean = charging ? 0.35 : tele && n === 'charge' ? -0.25 : 0;
      feet(g, x, y, s, walk * (charging ? 2 : 1), '#3d0e1a');
      g.save(); g.translate(x, y - 6); g.rotate(f * lean); g.translate(-x, -(y - 6));
      oval(g, x, y - 26 * s, 13 * s, 19 * s, body);
      g.fillStyle = '#adb5bd'; g.strokeStyle = OL; g.lineWidth = 3; g.beginPath(); g.arc(x, y - 40 * s, 12 * s, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ffd166'; g.fillRect(x + f * 2 * s - (f < 0 ? 10 * s : 0), y - 41 * s, 10 * s, 3 * s);
      g.strokeStyle = '#e63946'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y - 52 * s); g.quadraticCurveTo(x - f * 8, y - 62 * s, x - f * 16, y - 56 * s); g.stroke();
      const sy = y - 26 * s, back = tele ? -16 : 0, len = 58 * s; const sx = x + f * (back - 10) * s;
      g.strokeStyle = '#7a5230'; g.lineWidth = 4; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + f * len, sy); g.stroke();
      g.fillStyle = '#e9eef5'; g.strokeStyle = OL; g.lineWidth = 2; g.beginPath(); g.moveTo(sx + f * (len + 14 * s), sy); g.lineTo(sx + f * len, sy - 6 * s); g.lineTo(sx + f * len, sy + 6 * s); g.closePath(); g.fill(); g.stroke();
      oval(g, x + f * 6 * s, sy, 5 * s, 5 * s, body, 2.5);
      g.restore(); break;
    }
    case 'flit': {
      const fl = Math.sin(t * 0.6) * 0.6; const body = eCol(e, '#7b2cbf');
      for (const side of [-1, 1]) { g.fillStyle = '#5a189a'; g.strokeStyle = OL; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x + side * 6, y - 14); g.lineTo(x + side * 30 * s, y - 24 - fl * 14); g.lineTo(x + side * 22 * s, y - 12 - fl * 6); g.lineTo(x + side * 26 * s, y - 4 - fl * 4); g.closePath(); g.fill(); g.stroke(); }
      oval(g, x, y - 12, 13 * s, 12 * s, body);
      bigEye(g, x + f * 2, y - 13, 7.5 * s, lx, ly, n === 'dive' ? '#ff006e' : '#ffbe0b');
      g.strokeStyle = OL; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 4, y - 1); g.lineTo(x - 6, y + 4); g.moveTo(x + 4, y - 1); g.lineTo(x + 6, y + 4); g.stroke();
      break;
    }
    case 'brute': {
      const body = eCol(e, '#6c757d'); const S = s; const slamUp = n === 'slam' && tele, slamDown = n === 'slam' && active && af < 50, swingBack = n === 'swing' && tele, swingHit = n === 'swing' && active && af < 40;
      oval(g, x - 12 * S + walk * 4, y - 6 * S, 11 * S, 7 * S, '#495057'); oval(g, x + 12 * S - walk * 4, y - 6 * S, 11 * S, 7 * S, '#495057');
      oval(g, x, y - 44 * S, 28 * S, 34 * S, body, 3.5);
      g.strokeStyle = '#ff006e'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 10 * S, y - 60 * S); g.lineTo(x - 2 * S, y - 46 * S); g.lineTo(x - 12 * S, y - 34 * S); g.moveTo(x + 12 * S, y - 56 * S); g.lineTo(x + 6 * S, y - 40 * S); g.stroke();
      oval(g, x + f * 6 * S, y - 76 * S, 13 * S, 10 * S, body, 3);
      g.fillStyle = '#ff006e'; g.fillRect(x + f * 6 * S - 8 * S, y - 79 * S, 5 * S, 4 * S); g.fillRect(x + f * 6 * S + 3 * S, y - 79 * S, 5 * S, 4 * S);
      let fx = x + f * 30 * S, fy = y - 40 * S, bx = x - f * 26 * S, by = y - 40 * S;
      if (slamUp) { fx = x + f * 8 * S; fy = y - 96 * S; bx = x - f * 8 * S; by = y - 96 * S; } else if (slamDown) { fx = x + f * 40 * S; fy = y - 12 * S; bx = x + f * 22 * S; by = y - 12 * S; }
      if (swingBack) { fx = x - f * 34 * S; fy = y - 54 * S; } else if (swingHit) { fx = x + f * 56 * S; fy = y - 48 * S; }
      oval(g, bx, by, 12 * S, 12 * S, body, 3); oval(g, fx, fy, 14 * S, 14 * S, body, 3);
      break;
    }
    case 'bomber': {
      const blink = e.atk && World.frame % 8 < 4; feet(g, x, y, s, walk * 1.5, '#fca311', 7);
      oval(g, x, y - 14 * s, 13 * s, 13 * s, blink ? '#ff5a3c' : eCol(e, '#212529'));
      oval(g, x - 5 * s, y - 19 * s, 3 * s, 2 * s, 'rgba(255,255,255,0.5)', 0);
      g.fillStyle = '#495057'; g.fillRect(x - 4 * s, y - 30 * s, 8 * s, 5 * s);
      g.strokeStyle = '#a08060'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, y - 30 * s); g.quadraticCurveTo(x + 6, y - 38 * s, x + 3, y - 42 * s); g.stroke();
      g.fillStyle = World.frame % 4 < 2 ? '#ffde3c' : '#ff7a3c'; g.beginPath(); g.arc(x + 3, y - 42 * s, 3.5, 0, TAU); g.fill();
      bigEye(g, x + f * 3 * s - 4, y - 14 * s, 4 * s, lx, ly); bigEye(g, x + f * 3 * s + 4, y - 14 * s, 4 * s, lx, ly);
      g.strokeStyle = OL; g.lineWidth = 2; g.beginPath(); g.moveTo(x + f * 3 * s - 8, y - 20 * s); g.lineTo(x + f * 3 * s - 1, y - 18 * s); g.moveTo(x + f * 3 * s + 8, y - 20 * s); g.lineTo(x + f * 3 * s + 1, y - 18 * s); g.stroke();
      break;
    }
    case 'shieldbearer': {
      const body = eCol(e, '#118ab2'); feet(g, x, y, s, walk, '#073b4c');
      oval(g, x, y - 26 * s, 14 * s, 20 * s, body);
      g.fillStyle = '#ffd166'; g.strokeStyle = OL; g.lineWidth = 3; g.beginPath(); g.arc(x, y - 42 * s, 12 * s, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#7df9ff'; g.fillRect(x + (f > 0 ? 1 : -9) * s, y - 42 * s, 8 * s, 3 * s);
      const sx = x + f * (n === 'bash' && active ? 24 : 17) * s, top = y - 60 * s, hgt = 54 * s, wd = 14 * s;
      g.fillStyle = e.stunGuard ? '#8d8d8d' : '#ffd166'; g.strokeStyle = OL; g.lineWidth = 3; g.beginPath(); g.roundRect ? g.roundRect(sx - wd / 2, top, wd, hgt, 6) : g.rect(sx - wd / 2, top, wd, hgt); g.fill(); g.stroke();
      g.fillStyle = e.stunGuard ? '#555' : '#e09f3e'; g.beginPath(); g.arc(sx, top + hgt / 2, 4.5 * s, 0, TAU); g.fill();
      break;
    }
    case 'sniper': {
      const body = eCol(e, '#8d99ae'); g.strokeStyle = OL; g.lineWidth = 3.5;
      g.beginPath(); g.moveTo(x, y - 22 * s); g.lineTo(x - 13 * s, y); g.moveTo(x, y - 22 * s); g.lineTo(x + 13 * s, y); g.moveTo(x, y - 22 * s); g.lineTo(x + f * 3, y); g.stroke();
      const a = e.aim != null ? e.aim : (f > 0 ? 0 : Math.PI);
      g.save(); g.translate(x, y - 34 * s); g.rotate(a);
      g.fillStyle = '#495057'; g.strokeStyle = OL; g.lineWidth = 2.5; g.fillRect(8 * s, -3.5 * s, 26 * s, 7 * s); g.strokeRect(8 * s, -3.5 * s, 26 * s, 7 * s);
      g.restore();
      oval(g, x, y - 34 * s, 14 * s, 12 * s, body);
      const ex = x + Math.cos(a) * 6 * s, ey = y - 34 * s + Math.sin(a) * 6 * s; oval(g, ex, ey, 5 * s, 5 * s, e.aim != null ? '#ff1e1e' : '#ff8fa3', 2);
      break;
    }
    case 'hopper': {
      const sq = n === 'leap' && tele ? 0.7 : e.air ? 1.2 : 1; const body = eCol(e, '#06d6a0');
      oval(g, x - f * 12 * s, y - 6 * s, 9 * s, 6 * s, '#049f76', 2.5);
      oval(g, x, y - 13 * s * sq, 18 * s / Math.sqrt(sq), 13 * s * sq, body);
      oval(g, x + f * 6 * s, y - 7 * s * sq, 10 * s, 5 * s, '#d8f3dc', 0);
      if (n === 'tongue' && af >= 14 && af <= 22) { g.strokeStyle = '#ff6b8a'; g.lineWidth = 5; g.beginPath(); g.moveTo(x + f * 14 * s, y - 12 * s); g.lineTo(x + f * 70 * s, y - 16 * s); g.stroke(); oval(g, x + f * 70 * s, y - 16 * s, 5, 5, '#ff6b8a', 2); }
      bigEye(g, x + f * 2 * s - 6 * s, y - 25 * s * sq, 5.5 * s, lx, ly); bigEye(g, x + f * 2 * s + 6 * s, y - 25 * s * sq, 5.5 * s, lx, ly);
      break;
    }
    case 'warlock': {
      const bob = Math.sin(t * 0.07) * 3, body = eCol(e, '#3a0ca3');
      g.fillStyle = body; g.strokeStyle = OL; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y - 54 * s + bob); g.quadraticCurveTo(x + 20 * s, y - 20 * s + bob, x + 16 * s, y + bob); g.lineTo(x - 16 * s, y + bob); g.quadraticCurveTo(x - 20 * s, y - 20 * s + bob, x, y - 54 * s + bob); g.fill(); g.stroke();
      oval(g, x + f * 2 * s, y - 38 * s + bob, 9 * s, 8 * s, '#10002b', 0);
      g.fillStyle = '#f72585'; g.beginPath(); g.arc(x + f * 2 * s - 3.5 * s, y - 39 * s + bob, 2.2 * s, 0, TAU); g.arc(x + f * 2 * s + 3.5 * s, y - 39 * s + bob, 2.2 * s, 0, TAU); g.fill();
      const ox = x + f * 22 * s, oy = y - 30 * s + bob; const r = 6 + (tele ? af / 6 : 0);
      g.fillStyle = 'rgba(247,37,133,0.35)'; g.beginPath(); g.arc(ox, oy, r + 5, 0, TAU); g.fill(); oval(g, ox, oy, r, r, tele ? '#ffffff' : '#f72585', 2);
      break;
    }
    case 'gatekeeper': drawGatekeeper(g, e, eCol(e, d.col), af); break;
    case 'matriarch': drawMatriarch(g, e, eCol(e, d.col), t); break;
    case 'crown': drawCrown(g, e, eCol(e, d.col), t); break;
  }
  g.restore(); g.shadowBlur = 0; g.globalAlpha = 1;
  if (e.spawnT > 0) return;
  if (e.frozenT > 0) { g.fillStyle = 'rgba(190,240,255,0.4)'; g.strokeStyle = 'rgba(230,250,255,0.85)'; g.lineWidth = 2; g.fillRect(x - e.w / 2 - 6, y - e.h - 6, e.w + 12, e.h + 6); g.strokeRect(x - e.w / 2 - 6, y - e.h - 6, e.w + 12, e.h + 6); }
  if (e.shockT > 0 && World.frame % 3 === 0) { g.strokeStyle = '#f4ff7a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + rr(-15, 15), y - rr(0, e.h)); for (let i = 0; i < 3; i++) g.lineTo(x + rr(-15, 15), y - rr(0, e.h)); g.stroke(); }
  if (e.ward > 0) { g.strokeStyle = 'rgba(125,249,255,0.7)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y - e.h / 2, Math.max(e.w, e.h) * 0.7, 0, TAU); g.stroke(); }
  if (e.type === 'sniper' && e.aim != null && e.atk) { const locked = e.af >= 60; g.strokeStyle = locked ? 'rgba(255,40,40,0.9)' : 'rgba(255,80,80,0.35)'; g.lineWidth = locked ? 2.5 : 1.5; g.beginPath(); g.moveTo(x, y - 34); g.lineTo(x + Math.cos(e.aim) * 900, y - 34 + Math.sin(e.aim) * 900); g.stroke(); }
  if (!e.boss && e.hp < e.maxHp && !e.dying) { const w = Math.max(30, e.w); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x - w / 2, y - e.h - 14, w, 5); g.fillStyle = '#ff4fd8'; g.fillRect(x - w / 2, y - e.h - 14, w * Math.max(0, e.hp / e.maxHp), 5); }
  if (tele && !e.boss && e.type !== 'bomber') { g.fillStyle = '#ffde3c'; g.strokeStyle = OL; g.lineWidth = 3; g.font = '900 20px Rubik,system-ui,sans-serif'; g.textAlign = 'center'; g.strokeText('!', x, y - e.h - 20); g.fillText('!', x, y - e.h - 20); }
}
function drawRang(g, x, y, rot, col) { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = col; g.strokeStyle = OL; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-12, 6); g.lineTo(0, -6); g.lineTo(12, 6); g.lineTo(8, 9); g.lineTo(0, 1); g.lineTo(-8, 9); g.closePath(); g.fill(); g.stroke(); g.restore(); }
const KNIGHT = { skin: '#2b2440', hair: '#2b2440', top: '#4a3d66', top2: '#8f80b8', pants: '#3a3052', boots: '#5a4b80', arm: '#5a4b80', fore: '#4a3d66', hand: '#6d5d99', thick: 1.25, wide: 1.4, bootBig: 1.2,
  headAcc(g, J, s) { const [x, y] = J.hd, f = J.face; g.beginPath(); g.arc(x, y, 13 * s, 0, TAU); fillShaded(g, '#5a4b80', x, y, 13 * s); g.fillStyle = '#ff4fd8'; g.fillRect(x + (f > 0 ? 1 : -13) * s, y - 2 * s, 12 * s, 3.5 * s); g.strokeStyle = '#ff4fd8'; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(x, y - 12 * s); g.quadraticCurveTo(x - f * 12 * s, y - 22 * s, x - f * 22 * s, y - 8 * s); g.stroke(); },
  torsoDetail(g, J, s) { const { sh, hip } = J; g.fillStyle = '#8f80b8'; g.strokeStyle = OL; g.lineWidth = 2.4; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sh[0] + sd * 9 * s, sh[1] + 1 * s, 8 * s, 6 * s, 0, 0, TAU); g.fill(); g.stroke(); } g.fillStyle = '#ff4fd8'; g.beginPath(); g.arc(lerp(hip[0], sh[0], 0.6), lerp(hip[1], sh[1], 0.6), 3 * s, 0, TAU); g.fill(); } };
function drawGatekeeper(g, e, col, af) {
  const f = e.face, n = e.atkName, tl = e.atk ? e.atk.tele : 0; let pose = P(0, -24, 0.1, 10, 14, -6, 16, 7, 24, -7, 24, 60);
  if (e.atk) {
    if (n === 'sweep') pose = af < tl ? P(-2, -24, -0.2, -10, -18, -6, 10, 8, 24, -8, 24, -140) : P(4, -22, 0.4, 24, 6, -8, 10, 14, 24, -12, 24, 10);
    if (n === 'leap') pose = e.air ? POSE.jump : POSE.crouch;
    if (n === 'charge') pose = P(6, -22, 0.5, 20, 0, 4, 8, 18, 20, -20, 20, 0);
    if (n === 'waves') pose = af % 20 < 10 ? P(-2, -24, -0.2, -10, -18, -6, 10, 8, 24, -8, 24, -140) : P(4, -22, 0.4, 24, 6, -8, 10, 14, 24, -12, 24, 10);
  }
  drawBody(g, e.x, e.y, f, pose, KNIGHT, 2.7, { flash: col === '#ffffff', expr: 'fight', weapon: J => drawWeaponHD(g, 'sword', J.h1[0], J.h1[1], f, pose[11], 2.4, { len: 48, blade: '#e7c6ff' }) });
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
    case 'hammer': g.save(); g.translate(p.x, p.y); g.rotate(T * 0.4); drawWeaponHD(g, 'hammer', -16, 0, 1, 0, 1); g.restore(); break;
    case 'shock': case 'eshock': g.fillStyle = p.type === 'shock' ? '#ffcf70' : '#ff6b6b'; g.beginPath(); g.moveTo(p.x - 14, p.y + 10); g.lineTo(p.x, p.y - 18 - Math.sin(T) * 4); g.lineTo(p.x + 14, p.y + 10); g.fill(); break;
    case 'erang': drawRang(g, p.x, p.y, T * 0.5, '#4cc9f0'); break;
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
      case 'spark': case 'dust': if (p.k === 'spark') g.globalCompositeOperation = 'lighter'; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.s * (p.k === 'dust' ? (1.5 - a) : a + 0.3), 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; break;
      case 'ring': g.strokeStyle = p.c; g.lineWidth = 3 * a + 1; g.beginPath(); g.arc(p.x, p.y, lerp(p.r, p.r0, a), 0, TAU); g.stroke(); break;
      case 'impact': { const k = 1 - a; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, a * 1.6);
        const r = p.r * (0.6 + k * 0.7); const gg = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); gg.addColorStop(0, 'rgba(255,255,255,1)'); gg.addColorStop(0.35, rgba(p.c, 0.9)); gg.addColorStop(1, rgba(p.c, 0)); g.fillStyle = gg; g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); for (let i = 0; i < 16; i++) { const an = p.a * TAU + i / 16 * TAU; const rr2 = i % 2 ? r * 0.28 : r * (1.25 + (i % 4 === 0 ? 0.5 : 0)); g.lineTo(p.x + Math.cos(an) * rr2, p.y + Math.sin(an) * rr2); } g.closePath(); g.globalAlpha = a; g.fill();
        g.strokeStyle = rgba(p.c, a); g.lineWidth = 3; for (let i = 0; i < 6; i++) { const an = p.a * 9 + i / 6 * TAU; g.beginPath(); g.moveTo(p.x + Math.cos(an) * r * 1.1, p.y + Math.sin(an) * r * 1.1); g.lineTo(p.x + Math.cos(an) * r * (1.6 + k), p.y + Math.sin(an) * r * (1.6 + k)); g.stroke(); }
        g.restore(); break; }
      case 'kob': break;
      case 'techf': { const k = 1 - a; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.strokeStyle = p.c; g.lineWidth = 4 * a + 1; g.beginPath(); g.arc(p.x, p.y, 12 + k * 46, 0, TAU); g.stroke(); g.fillStyle = p.c; for (let i = 0; i < 8; i++) { const an = i / 8 * TAU + k; const r1 = 10 + k * 30, r2 = 22 + k * 60; g.beginPath(); g.moveTo(p.x + Math.cos(an - 0.08) * r1, p.y + Math.sin(an - 0.08) * r1); g.lineTo(p.x + Math.cos(an) * r2, p.y + Math.sin(an) * r2); g.lineTo(p.x + Math.cos(an + 0.08) * r1, p.y + Math.sin(an + 0.08) * r1); g.fill(); } g.restore(); break; }
      case 'star': { g.fillStyle = p.c; g.beginPath(); const r = p.r * (1.3 - a * 0.3); for (let i = 0; i < 10; i++) { const rr2 = i % 2 ? r * 0.35 : r; const an = i / 10 * TAU; g.lineTo(p.x + Math.cos(an) * rr2, p.y + Math.sin(an) * rr2); } g.fill(); break; }
      case 'slash': g.strokeStyle = p.c; g.lineWidth = 4 * a; g.beginPath(); g.moveTo(p.x - Math.cos(p.a) * p.r, p.y - Math.sin(p.a) * p.r); g.lineTo(p.x + Math.cos(p.a) * p.r, p.y + Math.sin(p.a) * p.r); g.stroke(); break;
      case 'text': g.font = `italic 900 ${p.s * 1.15}px ${FONT}`; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.strokeText(p.t, p.x, p.y); g.fillStyle = p.c; g.fillText(p.t, p.x, p.y); break;
      case 'ko': { g.strokeStyle = p.c; g.lineWidth = 8 * a; for (let i = 0; i < 8; i++) { const an = i / 8 * TAU; const r1 = (1 - a) * 160; g.beginPath(); g.moveTo(p.x + Math.cos(an) * r1 * 0.4, p.y + Math.sin(an) * r1 * 0.4); g.lineTo(p.x + Math.cos(an) * r1, p.y + Math.sin(an) * r1); g.stroke(); } break; }
      case 'after': g.strokeStyle = p.c; g.lineWidth = 5; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x, p.y - 55); g.stroke(); break;
      case 'zap': g.strokeStyle = p.c; g.lineWidth = 2.5; g.beginPath(); g.moveTo(p.x, p.y); for (let i = 1; i < 6; i++) g.lineTo(lerp(p.x, p.x2, i / 6) + rr(-8, 8), lerp(p.y, p.y2, i / 6) + rr(-8, 8)); g.lineTo(p.x2, p.y2); g.stroke(); break;
      case 'cube': g.fillStyle = p.c; g.save(); g.translate(p.x, p.y); g.rotate(p.rot); const cs = p.s * (p.rise ? 1 : 0.6 + 0.4 * a); g.fillRect(-cs / 2, -cs / 2, cs, cs); g.restore(); break;
      case 'portal': g.strokeStyle = p.c; g.lineWidth = 3; g.beginPath(); g.ellipse(p.x, p.y, 20 * Math.sin(a * Math.PI), 34 * Math.sin(a * Math.PI), 0, 0, TAU); g.stroke(); break;
    }
  }
  g.globalAlpha = 1;
}

// ----- stage (HD layered) -----
const TEX = {};
function texFor(key, B) {
  if (TEX[key]) return TEX[key];
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const R = SRng(key.length * 977 + 13);
  g.fillStyle = B.ground; g.fillRect(0, 0, 128, 128);
  const dk = shade(B.ground, -0.25), lt = shade(B.ground, 0.12);
  if (B.deco === 'columns' || B.deco === 'peaks') { // stone bricks
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) { const x = col * 44 + (row % 2) * 22 - 22, y = row * 32; g.fillStyle = R.chance(0.5) ? lt : B.ground; g.fillRect(x + 2, y + 2, 40, 28); g.strokeStyle = dk; g.lineWidth = 2; g.strokeRect(x + 2, y + 2, 40, 28); }
  } else if (B.deco === 'trees') { // soil with roots & pebbles
    for (let i = 0; i < 26; i++) { g.fillStyle = R.chance(0.5) ? lt : dk; g.beginPath(); g.ellipse(R.r(0, 128), R.r(0, 128), R.r(2, 6), R.r(1.5, 4), R.r(0, 3), 0, TAU); g.fill(); }
    g.strokeStyle = dk; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); let x = R.r(0, 128), y = R.r(0, 128); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += R.r(-14, 14); y += R.r(4, 14); g.lineTo(x, y); } g.stroke(); }
  } else if (B.deco === 'gears') { // riveted metal plates
    for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) { const x = col * 64, y = row * 64; const gr = g.createLinearGradient(x, y, x + 64, y + 64); gr.addColorStop(0, lt); gr.addColorStop(1, dk); g.fillStyle = gr; g.fillRect(x + 2, y + 2, 60, 60); g.fillStyle = shade(B.ground, 0.3); for (const [a, b] of [[8, 8], [56, 8], [8, 56], [56, 56]]) { g.beginPath(); g.arc(x + a, y + b, 2.5, 0, TAU); g.fill(); } }
  } else if (B.deco === 'crystals') { for (let i = 0; i < 14; i++) { g.fillStyle = rgba(B.acc, R.r(0.08, 0.25)); const x = R.r(0, 128), y = R.r(0, 128), h = R.r(10, 26); g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + h * 0.3, y); g.lineTo(x, y + h * 0.4); g.lineTo(x - h * 0.3, y); g.fill(); } }
  else { for (let i = 0; i < 18; i++) { g.fillStyle = rgba(B.acc, R.r(0.05, 0.2)); g.fillRect(R.r(0, 128), R.r(0, 128), R.r(2, 6), R.r(2, 6)); } }
  return TEX[key] = g.createPattern(c, 'repeat');
}
function ridge(x, seed, amp) { return Math.sin(x * 0.0021 + seed) * amp + Math.sin(x * 0.0053 + seed * 2.1) * amp * 0.5 + Math.sin(x * 0.0117 + seed * 3.7) * amp * 0.22; }
function drawBackground(g, st, cam) {
  const B = st.B; const t = World.frame;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, shade(B.sky[0], -0.05)); gr.addColorStop(0.6, B.sky[0]); gr.addColorStop(1, B.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // sun / glow
  const night = st.biome === 'void' || st.biome === 'crystal';
  const sx = W * 0.72 - cam.x * 0.02, sy = 150 - (cam.y - 400) * 0.02;
  g.save(); g.globalCompositeOperation = 'lighter'; const sg = g.createRadialGradient(sx, sy, 10, sx, sy, 260); sg.addColorStop(0, night ? 'rgba(200,120,255,0.3)' : 'rgba(255,250,220,0.5)'); sg.addColorStop(0.25, night ? 'rgba(160,80,255,0.12)' : 'rgba(255,240,200,0.14)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sg; g.fillRect(0, 0, W, H); g.restore();
  g.fillStyle = night ? '#f0d8ff' : '#fffaf0'; g.beginPath(); g.arc(sx, sy, 34, 0, TAU); g.fill();
  // clouds
  g.fillStyle = night ? 'rgba(180,140,230,0.12)' : 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 7; i++) { const cx = ((i * 331 - cam.x * 0.05 + t * 0.15 * (1 + i % 3)) % (W + 400) + W + 400) % (W + 400) - 200, cy = 70 + (i * 53) % 170; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(cx + k * 34 - 50, cy + Math.sin(k * 1.7) * 8, 46 - Math.abs(k - 1.5) * 8, 20, 0, 0, TAU); g.fill(); } }
  // mountain ranges (3 layers, atmospheric perspective)
  const layers = [[0.08, B.far, 0.62, 130, 1.3], [0.2, shade(B.far, -0.08), 0.7, 100, 2.9], [0.38, B.mid, 0.8, 80, 5.3]];
  for (const [par, col, baseK, amp, seed] of layers) {
    const base = H * baseK - (cam.y - 420) * par * 0.5; g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W + 20; x += 16) { const wx = (x - W / 2) + cam.x * par; g.lineTo(x, base - ridge(wx, seed, amp) - amp * 0.6); }
    g.lineTo(W, H); g.closePath(); const lg = g.createLinearGradient(0, base - amp * 2, 0, H); lg.addColorStop(0, col); lg.addColorStop(1, shade(col, 0.25)); g.fillStyle = lg; g.fill();
  }
  // deco silhouettes on mid + near layers
  for (const layer of [0, 1]) {
    const par = layer ? 0.55 : 0.32; g.fillStyle = layer ? shade(B.mid, -0.12) : shade(B.mid, 0.05);
    for (const d of st.deco) { if (d.layer !== layer) continue; const X = W / 2 + (d.x - cam.x) * par, base = H - 30 - (cam.y - 420) * par * 0.5 + (layer ? 40 : 0); drawDeco(g, B, X, base, d.s * (layer ? 1.05 : 1.35), d.v, layer); }
  }
  // haze band near horizon
  const hz = g.createLinearGradient(0, H * 0.55, 0, H); hz.addColorStop(0, rgba(B.sky[1], 0)); hz.addColorStop(1, rgba(B.sky[1], 0.18)); g.fillStyle = hz; g.fillRect(0, H * 0.55, W, H * 0.45);
  // light rays
  if (!night) { g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { const x0 = sx - 200 + i * 120 + Math.sin(t * 0.004 + i) * 30; g.fillStyle = 'rgba(255,250,230,0.035)'; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + 60, 0); g.lineTo(x0 - 220, H); g.lineTo(x0 - 380, H); g.fill(); } g.restore(); }
}
function drawDeco(g, B, x, y, s, v, layer) {
  if (x < -260 || x > W + 260) return; const k = B.deco;
  if (k === 'columns') { const h = 170 * s + v * 90; g.fillRect(x - 15 * s, y - h, 30 * s, h); g.fillRect(x - 24 * s, y - h - 14 * s, 48 * s, 14 * s); g.fillRect(x - 22 * s, y - 10 * s, 44 * s, 10 * s); if (v > 0.55) { g.beginPath(); g.moveTo(x - 24 * s, y - h - 14 * s); g.lineTo(x - 6 * s, y - h - 30 * s); g.lineTo(x + 10 * s, y - h - 14 * s); g.fill(); } g.save(); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x - 15 * s, y - h, 8 * s, h); g.restore(); }
  else if (k === 'trees') { g.fillRect(x - 6 * s, y - 120 * s, 12 * s, 120 * s); for (const [dx, dy, r] of [[0, -138, 50], [-34, -110, 36], [36, -112, 38], [0, -170, 34]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill(); } g.save(); g.fillStyle = 'rgba(255,255,255,0.1)'; g.beginPath(); g.arc(x - 12 * s, y - 150 * s, 26 * s, 0, TAU); g.fill(); g.restore(); }
  else if (k === 'gears') { const r = 52 * s + v * 30; g.save(); g.translate(x, y - 160 * s); g.rotate(World.frame * 0.004 * (v > 0.5 ? 1 : -1)); g.beginPath(); for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; const r2 = i % 2 ? r : r * 1.16; g.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); } g.closePath(); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(0, 0, r * 0.35, 0, TAU); g.fill(); g.restore(); g.fillRect(x - 7 * s, y - 160 * s, 14 * s, 160 * s); }
  else if (k === 'crystals') { const h = 130 * s + v * 100; g.beginPath(); g.moveTo(x - 22 * s, y); g.lineTo(x - 9 * s, y - h); g.lineTo(x + 7 * s, y - h * 1.1); g.lineTo(x + 24 * s, y); g.fill(); g.beginPath(); g.moveTo(x + 12 * s, y); g.lineTo(x + 32 * s, y - h * 0.6); g.lineTo(x + 44 * s, y); g.fill(); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba(B.acc, 0.12); g.beginPath(); g.moveTo(x - 9 * s, y - h); g.lineTo(x + 7 * s, y - h * 1.1); g.lineTo(x + 2 * s, y); g.lineTo(x - 6 * s, y); g.fill(); g.restore(); }
  else if (k === 'peaks') { const h = 220 * s + v * 140; g.beginPath(); g.moveTo(x - 130 * s, y); g.lineTo(x, y - h); g.lineTo(x + 130 * s, y); g.fill(); g.save(); g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.moveTo(x - 40 * s, y - h * 0.7); g.lineTo(x, y - h); g.lineTo(x + 40 * s, y - h * 0.7); g.lineTo(x + 18 * s, y - h * 0.62); g.lineTo(x, y - h * 0.72); g.lineTo(x - 16 * s, y - h * 0.6); g.fill(); g.restore(); }
  else if (k === 'shards') { const h = 100 * s + v * 70; g.save(); g.translate(x, y - 220 * s - Math.sin(World.frame * 0.01 + v * 10) * 22); g.rotate(v * 2); g.beginPath(); g.moveTo(0, -h / 2); g.lineTo(16 * s, 0); g.lineTo(0, h / 2); g.lineTo(-16 * s, 0); g.fill(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba(B.acc, 0.2); g.beginPath(); g.moveTo(0, -h / 2); g.lineTo(16 * s, 0); g.lineTo(0, 0); g.fill(); g.restore(); }
}
function topLip(g, B, s) {
  const x0 = s.x, x1 = s.x + s.w, y = s.y; const k = B.deco;
  if (k === 'trees') { // grass
    g.fillStyle = B.top; g.beginPath(); g.moveTo(x0 - 3, y - 3); g.lineTo(x1 + 3, y - 3); g.lineTo(x1 + 3, y + 8); for (let x = x1; x > x0; x -= 14) g.quadraticCurveTo(x - 7, y + 16 + ((x * 7) % 5), x - 14, y + 8); g.lineTo(x0 - 3, y + 8); g.closePath(); g.fill(); g.strokeStyle = OL; g.lineWidth = 2; g.stroke();
    g.fillStyle = shade(B.top, 0.25); g.fillRect(x0, y - 3, s.w, 3);
    g.strokeStyle = shade(B.top, 0.15); g.lineWidth = 2; g.beginPath(); for (let x = x0 + 6; x < x1 - 4; x += 9 + ((x * 13) % 7)) { const h = 5 + ((x * 31) % 7); g.moveTo(x, y - 2); g.lineTo(x + 2 - ((x * 3) % 4), y - 2 - h); } g.stroke();
  } else if (k === 'peaks') { // snow cap
    g.fillStyle = '#f4f9fd'; g.beginPath(); g.moveTo(x0 - 4, y - 4); g.lineTo(x1 + 4, y - 4); g.lineTo(x1 + 4, y + 6); for (let x = x1; x > x0; x -= 18) g.quadraticCurveTo(x - 9, y + 14 + ((x * 7) % 9), x - 18, y + 6); g.closePath(); g.fill(); g.strokeStyle = OL; g.lineWidth = 2; g.stroke(); g.fillStyle = '#ffffff'; g.fillRect(x0, y - 4, s.w, 2);
  } else if (k === 'gears') { g.fillStyle = '#c99a4a'; g.fillRect(x0 - 2, y - 3, s.w + 4, 9); g.strokeStyle = OL; g.lineWidth = 2; g.strokeRect(x0 - 2, y - 3, s.w + 4, 9); g.fillStyle = '#2a2420'; for (let x = x0 + 4; x < x1 - 8; x += 22) { g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x + 8, y - 3); g.lineTo(x + 14, y - 3); g.lineTo(x + 6, y + 6); g.fill(); } }
  else if (k === 'crystals' || k === 'shards') { g.fillStyle = B.top; g.fillRect(x0 - 2, y - 3, s.w + 4, 8); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba(B.acc, 0.6); g.fillRect(x0, y - 3, s.w, 2); g.restore(); g.strokeStyle = OL; g.lineWidth = 2; g.strokeRect(x0 - 2, y - 3, s.w + 4, 8); }
  else { g.fillStyle = B.top; g.fillRect(x0 - 3, y - 3, s.w + 6, 10); g.strokeStyle = OL; g.lineWidth = 2; g.strokeRect(x0 - 3, y - 3, s.w + 6, 10); g.fillStyle = shade(B.top, 0.2); g.fillRect(x0 - 3, y - 3, s.w + 6, 3); g.strokeStyle = shade(B.top, -0.3); g.lineWidth = 1.5; g.beginPath(); for (let x = x0 + 30; x < x1; x += 46 + ((x * 7) % 30)) { g.moveTo(x, y - 3); g.lineTo(x, y + 7); } g.stroke(); }
}
function drawStage(g, st) {
  const B = st.B, c = World.cam; const vl = c.x - W / (2 * c.z) - 50, vr = c.x + W / (2 * c.z) + 50, vb = c.y + H / (2 * c.z) + 50;
  const pat = texFor(st.biome, B);
  for (const s of st.solids) {
    if (s.x > vr || s.x + s.w < vl || s.y > vb) continue;
    const h = Math.min(s.h, vb - s.y + 10);
    g.fillStyle = pat; g.fillRect(s.x, s.y, s.w, h);
    const dg = g.createLinearGradient(0, s.y, 0, s.y + 260); dg.addColorStop(0, 'rgba(255,255,255,0.06)'); dg.addColorStop(0.15, 'rgba(0,0,0,0)'); dg.addColorStop(1, 'rgba(0,0,0,0.55)'); g.fillStyle = dg; g.fillRect(s.x, s.y, s.w, h);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(s.x, s.y, 5, h); g.fillRect(s.x + s.w - 5, s.y, 5, h);
    g.strokeStyle = OL; g.lineWidth = 2.5; g.beginPath(); g.moveTo(s.x, s.y + h); g.lineTo(s.x, s.y); g.lineTo(s.x + s.w, s.y); g.lineTo(s.x + s.w, s.y + h); g.stroke();
    topLip(g, B, s);
  }
  for (const p of st.plats) {
    if (p.x > vr || p.x + p.w < vl) continue;
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(p.x + p.w / 2, p.y + 26, p.w * 0.45, 6, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + p.w, p.y); g.lineTo(p.x + p.w - 10, p.y + 14); g.lineTo(p.x + 10, p.y + 14); g.closePath();
    const pg = g.createLinearGradient(0, p.y, 0, p.y + 14); pg.addColorStop(0, shade(B.plat, 0.15)); pg.addColorStop(1, shade(B.plat, -0.35)); g.fillStyle = pg; g.fill(); g.strokeStyle = OL; g.lineWidth = 2.2; g.stroke();
    g.fillStyle = shade(B.plat, 0.35); g.fillRect(p.x + 3, p.y + 1, p.w - 6, 2.5);
    if (B.deco === 'crystals' || B.deco === 'shards') { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba(B.acc, 0.35); g.fillRect(p.x + 10, p.y + 12, p.w - 20, 2); g.restore(); }
  }
  // events
  for (const ev of st.events) {
    if (ev.used) continue;
    if (ev.type === 'chest') { g.save(); g.translate(ev.x, ev.y); const b = Math.sin(World.frame * 0.08) * 1.5; g.fillStyle = 'rgba(255,220,100,0.25)'; g.beginPath(); g.ellipse(0, -14, 34, 26, 0, 0, TAU); g.fill(); g.strokeStyle = OL; g.lineWidth = 2.5; g.beginPath(); g.roundRect ? g.roundRect(-20, -28 + b, 40, 28, 4) : g.rect(-20, -28 + b, 40, 28); fillShaded(g, '#9a6430', 0, -14, 20); g.fillStyle = '#ffd24a'; g.fillRect(-20, -19 + b, 40, 5); g.strokeRect(-20, -19 + b, 40, 5); g.fillRect(-4, -23 + b, 8, 11); g.strokeRect(-4, -23 + b, 8, 11); g.restore(); }
    if (ev.type === 'spring') { oval(g, ev.x, ev.y - 6, 30, 8, '#6f8aa0', 2.5); oval(g, ev.x, ev.y - 8, 24, 5, '#7dd8ff', 0); for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(160,230,255,0.8)'; g.beginPath(); g.arc(ev.x + (i - 2) * 8, ev.y - 14 - ((World.frame * 0.7 + i * 11) % 40), 3, 0, TAU); g.fill(); } }
    if (ev.type === 'elite' && !ev.spawned) { g.fillStyle = '#3a2550'; g.strokeStyle = OL; g.lineWidth = 2.5; g.fillRect(ev.x - 12, ev.y - 64, 24, 64); g.strokeRect(ev.x - 12, ev.y - 64, 24, 64); g.save(); g.globalCompositeOperation = 'lighter'; const eg = g.createRadialGradient(ev.x, ev.y - 74, 2, ev.x, ev.y - 74, 30); eg.addColorStop(0, 'rgba(255,80,80,0.9)'); eg.addColorStop(1, 'rgba(255,80,80,0)'); g.fillStyle = eg; g.beginPath(); g.arc(ev.x, ev.y - 74, 30, 0, TAU); g.fill(); g.restore(); }
    if (dist(ev.x, ev.y, c.x, c.y) < 900 && !ev.spawned) { g.font = '800 13px ' + FONT; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = OL; const tx = { chest: 'BOON CHEST', spring: 'HEALING SPRING', elite: 'ELITE CHALLENGE' }[ev.type]; g.strokeText(tx, ev.x, ev.y - 90); g.fillStyle = '#fff'; g.fillText(tx, ev.x, ev.y - 90); }
  }
  // goal portal
  if (st.goal) { const open = st.arenas.every(a => a.done); const x = st.goal.x, y = st.goal.y - 62; g.save(); if (open) { g.globalCompositeOperation = 'lighter'; const pg = g.createRadialGradient(x, y, 4, x, y, 80); pg.addColorStop(0, 'rgba(220,170,255,0.9)'); pg.addColorStop(0.5, 'rgba(150,70,255,0.4)'); pg.addColorStop(1, 'rgba(150,70,255,0)'); g.fillStyle = pg; g.beginPath(); g.ellipse(x, y, 60, 90, 0, 0, TAU); g.fill(); for (let i = 0; i < 3; i++) { g.strokeStyle = `rgba(230,200,255,${0.5 - i * 0.12})`; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, 26 + i * 8, 52 + i * 10, 0, World.frame * 0.05 * (i % 2 ? -1 : 1), World.frame * 0.05 * (i % 2 ? -1 : 1) + 4.5); g.stroke(); } } g.restore(); g.strokeStyle = open ? '#e6c8ff' : 'rgba(0,0,0,0.3)'; g.lineWidth = 6; g.beginPath(); g.ellipse(x, y, 30, 58, 0, 0, TAU); g.stroke(); if (open) { g.font = '900 15px ' + FONT; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = OL; g.strokeText('EXIT', x, y - 74); g.fillStyle = '#fff'; g.fillText('EXIT', x, y - 74); } }
}
// ambient screen-space particles & vignette
const Ambient = { list: [], biome: '' };
function drawAmbient(g, st) {
  const A = Ambient; if (A.biome !== st.biome) { A.biome = st.biome; A.list = []; for (let i = 0; i < 46; i++) A.list.push({ x: rr(0, W), y: rr(0, H), s: rr(0.5, 1.4), p: rr(0, TAU) }); }
  const k = st.B.deco, t = World.frame; const cdx = (World.cam.x - (A.lx ?? World.cam.x)) * World.cam.z; A.lx = World.cam.x;
  for (const q of A.list) {
    q.p += 0.03; q.x -= cdx * 0.6 * q.s;
    if (k === 'trees') { q.x += Math.sin(q.p) * 0.8 - 0.3; q.y += 0.6 * q.s; g.fillStyle = 'rgba(120,190,110,0.7)'; g.save(); g.translate(q.x, q.y); g.rotate(q.p); g.beginPath(); g.ellipse(0, 0, 4 * q.s, 2 * q.s, 0, 0, TAU); g.fill(); g.restore(); }
    else if (k === 'peaks') { q.x += Math.sin(q.p) * 0.5 - 0.4; q.y += 0.9 * q.s; g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(q.x, q.y, 2.2 * q.s, 0, TAU); g.fill(); }
    else if (k === 'gears') { q.y -= 0.7 * q.s; q.x += Math.sin(q.p) * 0.5; g.fillStyle = `rgba(255,${150 + (q.s * 60) | 0},60,${0.5 + 0.3 * Math.sin(q.p * 3)})`; g.fillRect(q.x, q.y, 2.5 * q.s, 2.5 * q.s); }
    else { q.y -= 0.3 * q.s; q.x += Math.sin(q.p) * 0.4; g.fillStyle = rgba(k === 'columns' ? '#fff3d6' : st.B.acc, 0.35 + 0.3 * Math.sin(q.p * 2)); g.beginPath(); g.arc(q.x, q.y, 1.8 * q.s, 0, TAU); g.fill(); }
    if (q.y > H + 10) q.y = -10; if (q.y < -10) q.y = H + 10; if (q.x < -10) q.x = W + 10; if (q.x > W + 10) q.x = -10;
  }
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,5,20,0.38)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
}
function drawItems(g) {
  for (const it of World.items) {
    const b = Math.sin((it.t || World.frame) * 0.1) * 2, x = it.x, y = it.y - 10 + b;
    if (it.t > 1300 && World.frame % 8 < 4) continue;
    if (it.type === 'chest') { g.fillStyle = '#8a5a2b'; g.fillRect(x - 14, y - 10, 28, 20); g.fillStyle = '#ffd24a'; g.fillRect(x - 14, y - 4, 28, 4); continue; }
    g.lineWidth = 2; g.strokeStyle = OL;
    switch ((FOODS[it.kind] || FOODS[0]).n) {
      case 'apple': oval(g, x, y, 9, 8, '#e63946', 2); g.strokeStyle = '#5a3b1e'; g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 1, y - 12); g.stroke(); oval(g, x + 5, y - 11, 4, 2, '#52b788', 1.5, -0.4); break;
      case 'drumstick': g.strokeStyle = '#f2e6d0'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 2, y); g.lineTo(x + 12, y - 6); g.stroke(); oval(g, x + 13, y - 7, 3, 3, '#f2e6d0', 1.5); oval(g, x - 3, y + 2, 9, 7, '#c8743a', 2, -0.4); break;
      case 'riceball': g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x, y - 10); g.lineTo(x + 10, y + 7); g.lineTo(x - 10, y + 7); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#1b4332'; g.fillRect(x - 5, y + 1, 10, 6); break;
      case 'cake': g.fillStyle = '#ffe5ec'; g.beginPath(); g.moveTo(x - 10, y + 7); g.lineTo(x + 10, y + 7); g.lineTo(x + 10, y - 3); g.lineTo(x - 10, y + 1); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#ff8fab'; g.fillRect(x - 10, y + 2, 20, 2); oval(g, x + 6, y - 6, 3, 3, '#e63946', 1.5); break;
      case 'pizza': g.fillStyle = '#ffd166'; g.beginPath(); g.moveTo(x - 10, y - 7); g.lineTo(x + 10, y - 7); g.lineTo(x, y + 10); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#d62828'; [[-3, -3], [3, -2], [0, 3]].forEach(([a, c]) => { g.beginPath(); g.arc(x + a, y + c, 2, 0, TAU); g.fill(); }); break;
      case 'feast': oval(g, x, y + 4, 14, 5, '#e9ecef', 2); oval(g, x - 3, y - 2, 9, 7, '#c8743a', 2); oval(g, x + 7, y - 1, 5, 5, '#e63946', 1.5); oval(g, x + 2, y - 7, 4, 3, '#52b788', 1.5); break;
      case 'heart': { g.fillStyle = '#ff4d6d'; g.beginPath(); g.moveTo(x, y + 9); g.bezierCurveTo(x - 16, y - 2, x - 8, y - 14, x, y - 5); g.bezierCurveTo(x + 8, y - 14, x + 16, y - 2, x, y + 9); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(x - 5, y - 5, 2.5, 0, TAU); g.fill(); break; }
    }
  }
}

// KO blast beams + screen flash (screen space)
function drawKOBlasts(g) {
  const c = World.cam;
  for (const p of Particles) {
    if (p.k !== 'kob') continue; const a = clamp(p.life / p.max, 0, 1), k = 1 - a;
    let sx = (p.x - c.x) * c.z + W / 2, sy = (p.y - c.y) * c.z + H / 2; sx = clamp(sx, 0, W); sy = clamp(sy, 40, H);
    const ang = Math.atan2(H / 2 - sy, W / 2 - sx); const L = 380 + k * 700;
    g.save(); g.translate(sx, sy); g.rotate(ang); g.globalCompositeOperation = 'lighter';
    for (const [wd, col, al] of [[0.5, p.c, 0.55], [0.3, '#ffffff', 0.7], [0.12, '#ffffff', 1]]) { const gr = g.createLinearGradient(0, 0, L, 0); gr.addColorStop(0, rgba(col[0] === '#' ? col : '#ffffff', al * a)); gr.addColorStop(1, rgba(col[0] === '#' ? col : '#ffffff', 0)); g.fillStyle = gr; g.beginPath(); g.moveTo(-20, 0); g.lineTo(L, -L * wd * (0.4 + k)); g.lineTo(L, L * wd * (0.4 + k)); g.closePath(); g.fill(); }
    g.fillStyle = rgba('#ffffff', a); for (let i = 0; i < 12; i++) { const an = i / 12 * TAU + k * 2; const r = 40 + k * 140; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(an - 0.06) * r, Math.sin(an - 0.06) * r); g.lineTo(Math.cos(an + 0.06) * r, Math.sin(an + 0.06) * r); g.fill(); }
    g.restore();
  }
  if (World.flashT > 0) { g.fillStyle = `rgba(255,255,255,${World.flashT / 32})`; g.fillRect(0, 0, W, H); World.flashT--; }
}
