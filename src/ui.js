const PCOL = ['#ff6b6b', '#5ab4ff', '#ffd23c'], PCOLD = ['#ff4b4b', '#3a8dff', '#d9a400'];
const GAME_VERSION = '11.13-c';
// ===== UI: HUD, menus, screens (overrides the simple versions in game.js) =====
function T(t, x, y, size, col = '#fff', o = {}) {
  ctx.font = `${o.italic === false ? '' : 'italic '}${o.weight || 900} ${size}px ${FONT}`; ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'alphabetic';
  if (o.shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillText(t, x + size * 0.05, y + size * 0.07); }
  if (o.stroke !== 0) { ctx.lineJoin = 'round'; ctx.lineWidth = o.stroke || Math.max(3, size * 0.16); ctx.strokeStyle = o.strokeCol || OL; ctx.strokeText(t, x, y); }
  if (o.grad) { const g = ctx.createLinearGradient(0, y - size * 0.85, 0, y); g.addColorStop(0, o.grad[0]); g.addColorStop(1, o.grad[1]); ctx.fillStyle = g; } else ctx.fillStyle = col;
  ctx.fillText(t, x, y);
}
function slant(x, y, w, h, k = 14) { ctx.beginPath(); ctx.moveTo(x + k, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - k, y + h); ctx.lineTo(x, y + h); ctx.closePath(); }
function glass(x, y, w, h, accent = '#ff4fd8', k = 14, a = 0.88) {
  slant(x, y, w, h, k); const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, `rgba(44,32,74,${a})`); g.addColorStop(1, `rgba(20,14,36,${a})`); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.stroke();
  ctx.save(); slant(x, y, w, h, k); ctx.clip(); ctx.fillStyle = accent; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + k, y); ctx.lineTo(x + k + 7, y); ctx.lineTo(x + 7, y + h); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x, y, w, h * 0.45); ctx.restore();
}
function menuIdlePose(i, t) { return ANIM[i] ? ANIM[i].idle(t, { slot: 0 }) : STAND; }
const MenuCloth = {};
function drawFighterArt(fid, x, y, face, s, pose, rival, expr) {
  const F = FIGHTERS[fid], A = artFor(fid, rival);
  const wpn = F.weapon !== 'none' ? J => drawWeaponHD(ctx, F.weapon, J.h1[0], J.h1[1], face, pose[11], s, { glow: '#9dff8a' }) : null;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 20 * s, 5 * s, 0, 0, TAU); ctx.fill();
  const ck = fid + '|' + Math.round(x / 40) + '|' + Math.round(s * 10) + '|' + face; // menus get the same simulated cloth as the fighters in play
  drawBody(ctx, x, y, face, pose, A, s, { expr: expr || 'fight', weapon: wpn, seed: fid * 50, eye: F.color, cloth: rival ? null : (MenuCloth[ck] || (MenuCloth[ck] = {})) });
}
const LogoCache = {};
function drawLogo(x, y, size) {
  const k = HD.k, key = size + ':' + k; let c = LogoCache[key];
  const cw = Math.ceil(size * 7.2 * k), ch = Math.ceil(size * 1.6 * k);
  if (!c) { c = LogoCache[key] = document.createElement('canvas'); c.width = cw; c.height = ch; }
  const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch); g.setTransform(k, 0, 0, k, 0, 0);
  const ox = size * 3.6, oy = size * 1.15; g.translate(ox, oy); g.transform(1, 0, -0.12, 1, 0, 0);
  g.font = `italic 900 ${size}px ${FONT}`; g.textAlign = 'center';
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillText('RIFTBRAWL', 6, 10);
  g.lineJoin = 'round'; g.lineWidth = size * 0.2; g.strokeStyle = '#1a0f2e'; g.strokeText('RIFTBRAWL', 0, 0);
  g.lineWidth = size * 0.08; g.strokeStyle = '#ff4fd8'; g.strokeText('RIFTBRAWL', 0, 0);
  const gr = g.createLinearGradient(0, -size * 0.8, 0, 0); gr.addColorStop(0, '#fff7c2'); gr.addColorStop(0.45, '#ffd23c'); gr.addColorStop(1, '#ff7a2c'); g.fillStyle = gr; g.fillText('RIFTBRAWL', 0, 0);
  const sx = ((World.frame * 8) % (size * 12)) - size * 6; g.globalCompositeOperation = 'source-atop'; const sg = g.createLinearGradient(sx - 60, 0, sx + 60, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.65)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sg; g.fillRect(-size * 5, -size * 1.2, size * 10, size * 1.6); g.globalCompositeOperation = 'source-over';
  ctx.drawImage(c, x - ox, y - oy, cw / k, ch / k);
}
function drawTitleBG() {
  const g = ctx; const t = Game.t + (Game.tt = (Game.tt || 0) + 1); World.frame++;
  const bg = g.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H * 0.42, W * 0.75); bg.addColorStop(0, '#5a2a9a'); bg.addColorStop(0.45, '#2a1450'); bg.addColorStop(1, '#0c0618'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.save(); g.translate(W / 2, H * 0.42); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) { g.strokeStyle = `rgba(${i % 2 ? '255,79,216' : '125,90,255'},${0.16 - i * 0.015})`; g.lineWidth = 18 - i * 2; g.beginPath(); g.ellipse(0, 0, 120 + i * 70, 50 + i * 26, 0.15, t * 0.004 * (i % 2 ? 1 : -1) + i, t * 0.004 * (i % 2 ? 1 : -1) + i + 4.2); g.stroke(); }
  const cg = g.createRadialGradient(0, 0, 0, 0, 0, 160); cg.addColorStop(0, 'rgba(255,220,255,0.55)'); cg.addColorStop(1, 'rgba(255,120,255,0)'); g.fillStyle = cg; g.beginPath(); g.arc(0, 0, 160, 0, TAU); g.fill();
  g.restore();
  for (let i = 0; i < 26; i++) { const x = (i * 97 + t * 0.3 * (i % 3 + 1)) % (W + 100) - 50, y = (i * 61 + Math.sin(t * 0.01 + i) * 20) % H; g.save(); g.translate(x, y); g.rotate(i + t * 0.006); g.fillStyle = i % 3 ? 'rgba(255,79,216,0.22)' : 'rgba(160,120,255,0.25)'; g.beginPath(); g.moveTo(0, -16); g.lineTo(6, 0); g.lineTo(0, 16); g.lineTo(-6, 0); g.fill(); g.restore(); }
  // stage platform
  const py = H - 118; const pg = g.createLinearGradient(0, py, 0, H); pg.addColorStop(0, '#3a2a5e'); pg.addColorStop(1, '#120a22'); g.fillStyle = pg; g.beginPath(); g.moveTo(80, py); g.lineTo(W - 80, py); g.lineTo(W - 20, H); g.lineTo(20, H); g.fill();
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,79,216,0.5)'; g.fillRect(80, py - 2, W - 160, 4); g.restore();
}
function drawTitleFighters(y, s, spread) {
  FIGHTERS.forEach((F, i) => { const x = W / 2 - spread * 1.5 + i * spread; const pose = menuIdlePose(i, World.frame); drawFighterArt(i, x, y, i < 2 ? 1 : -1, s, pose); });
}
const TIPS = ['Press SHIELD just before you hit the ground while tumbling to TECH and recover instantly.', 'Hold a direction while teching to tech-roll away.', 'Release SHIELD right as an attack lands to PARRY and stagger the attacker.', 'SHIELD + ATTACK grabs. Then press a direction to throw, or ATTACK to pummel.', 'Your damage % makes you fly farther. Eat food to bring it down.', 'Fill your meter, then press SHIELD + SPECIAL for a screen-clearing RIFT BURST.', 'Missed a tech? From the ground: ATTACK for a getup attack, or a direction to roll.', 'Jump while touching a wall and pushing away from it to WALL JUMP.', 'Inputs are buffered for 9 frames: press your next move a little early.', 'Land an aerial just after its hit ends (or before it starts) for no landing lag.', 'Repeating the same move makes it weaker. Mix it up!', 'Duo boons appear when you own both of their prerequisite boons.', 'Rift Shards from every run buy permanent upgrades in the RIFT FORGE.', 'Ledge: SHIELD rolls onto stage, ATTACK climbs with a strike, JUMP leaps off.', 'Knock enemies through the purple barriers for an instant KO.', 'Rift Bombs: ATTACK to pick one up, ATTACK again to throw. Hold up or down to aim.', 'In Training, pause to show hitboxes, launch lines and change dummy behaviour.', 'Press JUMP and ATTACK together for an instant short-hop aerial.', 'Jump while standing on a foe\'s head to FOOTSTOOL them into the ground.', 'Taunt with T (P1), \' (P2) or the minus button. Hold a direction for different taunts.', 'Grom\'s down tilt BURIES grounded foes. Rook and Vela\'s down tilts TRIP them.', 'Two grounded attacks that collide CLANK. Attacks also swat weak projectiles.', 'Your attacks hit harder the more damage you have taken (rage).', 'Moves you have not used yet get a small freshness bonus.'];
function drawRunInfo() {
  const ps = World.players; if (!ps || !ps.length || !Game.run) return; const x = W / 2 + 40, w = W / 2 - 80; const rowsOf = p => Math.max(1, Math.ceil(Math.min(12, new Set(p.boons).size) / 2)); const hgt = 70 + ps.reduce((a, p) => a + 40 + rowsOf(p) * 22, 0); glass(x, 250, w, Math.min(400, hgt), '#ffd23c', 18, 0.9); let yy = 316;
  T(Game.run.training ? 'TRAINING' : stageLabel(Game.run.idx) + '  ·  ' + fmtTime(Game.run.time) + '  ·  KO ' + Game.run.kills, x + w / 2, 284, 18, '#ffd23c', { stroke: 4 });
  ps.forEach((p, i) => {
    const y0 = yy; yy += 40 + rowsOf(p) * 22; T('P' + (i + 1) + ' ' + p.def.name + '  ·  best combo ' + (p.bestCombo || 0), x + 30, y0, 16, p.def.color, { align: 'left', stroke: 4 });
    const cnt = {}; for (const b of p.boons) cnt[b] = (cnt[b] || 0) + 1; const ids = Object.keys(cnt);
    if (!ids.length) T('No boons yet', x + 30, y0 + 26, 14, '#bfb4d8', { align: 'left', stroke: 0, italic: false, weight: 600, shadow: false });
    ids.slice(0, 12).forEach((id, k) => { const b = BOON_BY_ID[id]; if (!b) return; const cx = x + 30 + (k % 2) * (w / 2 - 20), cy = y0 + 26 + Math.floor(k / 2) * 22; ctx.fillStyle = RARITY[b.r].c; ctx.beginPath(); ctx.arc(cx + 5, cy - 5, 5, 0, TAU); ctx.fill(); T(b.name + (cnt[id] > 1 ? ' ×' + cnt[id] : ''), cx + 16, cy, 14, '#fff', { align: 'left', stroke: 3, shadow: false }); });
  });
}
function drawControlsPanel(x, y, a = 0.95) {
  glass(x - 40, y - 30, W - (x - 40) * 2, 486, '#ff4fd8', 20, a);
  T('CONTROLS', W / 2, y + 14, 34);
  const col1 = x - 10, col2 = W / 2 - 60, col3 = W / 2 + 230;
  const sec = (title, cx, items) => { T(title, cx, y + 58, 17, '#ff8fe4', { align: 'left' }); items.forEach((t, i) => T(t, cx, y + 86 + i * 22, 13.5, '#e8e2f5', { align: 'left', italic: false, weight: 600, stroke: 0, shadow: false })); };
  sec('SWITCH PRO / GAMEPAD', col1, ['Left stick — move / aim', 'A (right) — attack', 'B (bottom) — special', 'X / Y — jump', 'L / R / ZL / ZR — shield', 'Flick stick + A — smash', 'Right stick — smash / aerial', '+ — pause', '− — taunt (+ stick direction)']);
  sec('KEYBOARD  P1 / P2', col2, ['Move — WASD / Arrows', 'Attack — J or F / ,', 'Special — K or G / .', 'Jump — Space / M or R-Shift', 'Shield — L or H / /', 'Smash — I or R / ;', 'Pause — Esc / Backspace', 'Taunt — T / \u2019', 'Two on one keyboard: P1 uses', 'WASD+Space+F/G/H, P2 Arrows+M/,/./', 'Shield + direction — roll / dodge', 'Shield + down-diagonal — drop through'] );
  sec('TECHNIQUES', col3, ['Grab — SHIELD + ATTACK', 'Throw — grab + direction', 'Tech — SHIELD as you land', 'Tech roll — + direction', 'Parry — release SHIELD on hit', 'Wall jump — JUMP away from wall', 'Rift Burst — SHIELD + SPECIAL', 'Getup — ATTACK / dir / JUMP', 'Recovery — UP + SPECIAL', 'Rift Bomb — ATTACK: pick up / throw', 'Short-hop aerial — JUMP + ATTACK', 'Footstool — JUMP on a foe\u2019s head', 'Wavedash — air dodge into the floor', 'Hitstun cancel — dodge/attack late', 'B-reverse — tilt back after SPECIAL', 'Taunt — T / \u2019 / minus button']);
  T('Launch foes off-screen or through the purple barriers for a KO.  Food lowers your damage %.', W / 2, y + 438, 15, '#ffd23c', { stroke: 4 });
}
function drawControlsPanelOld(x, y, a = 0.95) {
  glass(x, y, W - x * 2, 470, '#ff4fd8', 20, a);
  T('CONTROLS', W / 2, y + 48, 34);
  const col1 = x + 50, col2 = W / 2 + 30;
  T('SWITCH PRO / GAMEPAD', col1, y + 92, 18, '#ff8fe4', { align: 'left' });
  ['Left stick — move / aim', 'A (right) — attack', 'B (bottom) — special', 'X / Y — jump', 'L / R / ZL / ZR — shield, dodge', 'Flick stick + A — smash attack', 'Right stick — smash / aerials', 'Flick up — jump', '+ — pause'].forEach((t, i) => T(t, col1, y + 124 + i * 28, 16, '#e8e2f5', { align: 'left', italic: false, weight: 600, stroke: 0, shadow: false }));
  T('KEYBOARD  P1  /  P2', col2, y + 92, 18, '#ff8fe4', { align: 'left' });
  ['Move — WASD / Arrows', 'Attack — J / ,', 'Special — K / .', 'Jump — Space / Right Shift', 'Shield — L / /', 'Smash — I / ;', 'Pause — Esc / Backspace', '', 'Shield + direction = roll / dodge'].forEach((t, i) => T(t, col2, y + 124 + i * 28, 16, '#e8e2f5', { align: 'left', italic: false, weight: 600, stroke: 0, shadow: false }));
  T('Up + Special = recovery  ·  Grab ledges by falling near them  ·  Launch foes off-screen for a KO!', W / 2, y + 448, 15, '#ffd23c', { stroke: 0 });
}
const MODE_DESC_X = 0;
const MODE_DESC = ["Dive into the rift on your own. 12 stages, 3 bosses, then Endless.", 'Two players on one screen: plug in a second controller or share the keyboard.', 'Open an online room and read your 4-letter code to your partner.', "Type in your partner's room code to join their run.", 'A floating practice stage with ledges, a wall and respawning dummies. Infinite lives and a full Rift Burst meter.', 'Spend Rift Shards earned from runs on permanent upgrades.', 'See every button for controllers and keyboard.', 'Rebind your controller buttons if any feel wrong.', 'Volume of sound effects and menu sounds. Use left/right (or click the bar) to adjust.', 'Volume of the soundtrack. Use left/right (or click the bar) to adjust. 0% turns music off.'];
function drawMenu(title, opts, idx, y0 = 300, x0 = null, gap = 58) {
  opts.forEach((o, i) => {
    const sel = i === idx; Game._ma = Game._ma || {}; const ak = title + o; const k = Game._ma[ak] = lerp(Game._ma[ak] || 0, sel ? 1 : 0, 0.3);
    const intro = easeOut(clamp((UIW.st - i * 2) / 14, 0, 1)); const w = 430 + 40 * k, h = 48, x = (x0 ?? W / 2 - 220) - 10 * k - (1 - intro) * 300, y = y0 + i * gap - 32;
    if (intro < 1) ctx.globalAlpha = intro;
    if (sel) { slant(x + 6, y + 6, w, h); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill(); }
    slant(x, y, w, h); const g = ctx.createLinearGradient(x, 0, x + w, 0); if (sel) { g.addColorStop(0, '#ff4fd8'); g.addColorStop(1, '#8a3cff'); } else { g.addColorStop(0, 'rgba(40,28,70,0.92)'); g.addColorStop(1, 'rgba(24,16,44,0.92)'); } ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = sel ? '#fff' : 'rgba(255,255,255,0.15)'; ctx.stroke();
    T(o, x + 34, y + 33, sel ? 24 : 21, sel ? '#fff' : '#d8d0ea', { align: 'left', stroke: sel ? 5 : 0, shadow: sel });
    if (VOL_ROWS[o]) {
      const v = VOL_ROWS[o](), bx = x + w - 200, by = y + 15, bw = 130;
      for (let k = 0; k < 10; k++) { const on = k < Math.round(v * 10); ctx.fillStyle = on ? (sel ? '#fff' : '#ffd23c') : 'rgba(0,0,0,0.45)'; slant(bx + k * 13, by, 11, 18, 3); ctx.fill(); }
      T(Math.round(v * 100) + '%', x + w - 30, y + 32, 16, '#fff', { align: 'right', stroke: 4, shadow: false });
      if (sel) { T('◀', bx - 16, y + 31, 14, '#fff', { stroke: 3, shadow: false }); }
      clickRegions().push({ x: bx - 6, y, w: bw + 12, h, fn: (cx) => { Game.menuIdx = i; Game.pauseIdx = i; volSet(o, clamp((cx - bx) / bw, 0, 1) + 0.05); } });
      clickRegions().push({ x, y, w: bx - x - 8, h, fn: () => { Game.menuIdx = i; Game.pauseIdx = i; } });
      return;
    }
    if (ROW_TXT[o]) { T((sel ? '◀  ' : '') + ROW_TXT[o]() + (sel ? '  ▶' : ''), x + w - 30, y + 32, 18, sel ? '#fff' : '#ffd23c', { align: 'right', stroke: 4, shadow: false }); clickRegions().push({ x, y, w, h, fn: () => { Game.menuIdx = i; Game.pauseIdx = i; rowAdjust(o, 1); } }); ctx.globalAlpha = 1; return; }
    if (sel) { const bob = Math.sin(World.frame * 0.25) * 3; ctx.fillStyle = '#ffd23c'; ctx.beginPath(); ctx.moveTo(x + w - 40 + bob, y + 14); ctx.lineTo(x + w - 26, y + 24); ctx.lineTo(x + w - 40, y + 34); ctx.fill(); }
    clickRegions().push({ x, y, w, h, fn: () => { Game.clickPick = i; } }); ctx.globalAlpha = 1;
  });
}
function pctGrad(p) { const c = pctColor(p); return [shade('#ffffff', 0) === c ? '#fff' : '#ffffff', c]; }
function pctColor(p) { const t = clamp(p / 150, 0, 1); const stops = [[255, 255, 255], [255, 230, 90], [255, 140, 40], [235, 40, 40], [140, 10, 20]]; const f = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(f)), k = f - i; const c = stops[i].map((v, j) => Math.round(v + (stops[i + 1][j] - v) * k)); return `rgb(${c[0]},${c[1]},${c[2]})`; }
function drawHUD() {
  const G = Game, R = G.run; if (!R) return;
  const n = World.players.length; const cw = 270, gap = 26, total = n * cw + (n - 1) * gap; const x0 = W / 2 - total / 2;
  const slide = (1 - easeOut(clamp(((G.stageT || 0) - 6) / 34, 0, 1))) * 130;
  World.players.forEach((p, i) => {
    const x = x0 + i * (cw + gap), y = H - 92 + slide + i * slide * 0.3; const col = p.def.color;
    if (p._hp === undefined) p._hp = p.pct; if (p.pct > p._hp + 0.5) { p._pop = 12; } p._hp = p.pct; if (p._pop > 0) p._pop--;
    glass(x, y, cw, 80, col, 16, 0.9);
    // portrait
    const px = x + 52, py = y + 38; ctx.save(); ctx.beginPath(); ctx.arc(px, py, 33, 0, TAU); const pg = ctx.createRadialGradient(px, py - 10, 4, px, py, 34); pg.addColorStop(0, shade(col, 0.2)); pg.addColorStop(1, shade(col, -0.45)); ctx.fillStyle = pg; ctx.fill(); ctx.clip(); if (!p.out) drawPortrait(ctx, p.def.id, px + 2, py + (p.def.id === 2 ? 16 : p.def.id === 3 ? 10 : 6), p.def.id === 2 ? 26 : 30, false); ctx.restore();
    ctx.lineWidth = 3.5; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py, 33, 0, TAU); ctx.stroke(); ctx.lineWidth = 1.5; ctx.strokeStyle = OL; ctx.beginPath(); ctx.arc(px, py, 35, 0, TAU); ctx.stroke();
    T(p.def.name, x + 96, y + 72, 14, '#fff', { align: 'left', stroke: 4 });
    const tag = 'P' + (i + 1);
    ctx.fillStyle = col; slant(x + cw - 74, y - 12, 62, 20, 6); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke(); T(tag, x + cw - 43, y + 3, 13, '#fff', { stroke: 3, shadow: false });
    // damage
    const pop = (p._pop || 0) / 12; const jx = pop > 0 ? rr(-3, 3) * pop : 0, jy = pop > 0 ? rr(-3, 3) * pop : 0;
    if (p.out || p.dead) T(p.out ? 'OUT' : 'KO', x + cw - 26, y + 60, 44, '#9a90b0', { align: 'right', stroke: 8 });
    else {
      ctx.save(); const num = String(Math.floor(p.pct)); const sz = 60 * (1 + pop * 0.25); ctx.translate(x + cw - 48 + jx, y + 62 + jy);
      T(num, 0, 0, sz, null, { align: 'right', stroke: 10, grad: ['#ffffff', pctColor(p.pct)] }); T('%', 4, 0, 26, null, { align: 'left', stroke: 6, grad: ['#ffffff', pctColor(p.pct)] }); T('.' + Math.floor((p.pct % 1) * 10), 4, -28, 17, '#ffffff', { align: 'left', stroke: 4, shadow: false }); ctx.restore();
    }
    { const m = clamp((p.meter || 0) / 100, 0, 1), full = m >= 1; const mx0 = x + 96, my0 = y + 22, mw = cw - 150; ctx.fillStyle = 'rgba(0,0,0,0.55)'; slant(mx0, my0, mw, 9, 4); ctx.fill();
      if (m > 0) { const mg = ctx.createLinearGradient(mx0, 0, mx0 + mw, 0); mg.addColorStop(0, full ? '#fff7c2' : '#8a3cff'); mg.addColorStop(1, full ? '#ffb02c' : '#ff4fd8'); ctx.fillStyle = mg; slant(mx0, my0, Math.max(6, mw * m), 9, 4); ctx.fill(); }
      if (full) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,220,120,${0.25 + 0.25 * Math.sin(World.frame * 0.3)})`; slant(mx0 - 3, my0 - 3, mw + 6, 15, 5); ctx.fill(); ctx.restore(); T('BURST! SHIELD+SPECIAL', mx0 + mw / 2, my0 - 4, 11, '#ffe9a0', { stroke: 3, shadow: false }); } }
    if ((p.combo || 0) >= 2 && World.frame - (p.lastHitF ?? -999) < 70) { const ag = World.frame - p.lastHitF; const pk = ag < 6 ? 1.3 - ag * 0.05 : 1; ctx.save(); ctx.translate(x + cw / 2 + 20, y - 26); ctx.rotate(-0.06); ctx.scale(pk, pk); ctx.globalAlpha = clamp((70 - ag) / 20, 0, 1); T(p.combo + ' HIT COMBO!', 0, 0, 22, null, { stroke: 6, grad: ['#ffffff', p.combo >= 8 ? '#ff4fd8' : p.combo >= 5 ? '#ffb02c' : '#ffd23c'] }); ctx.restore(); }
    const bs = p.boons.slice(-12); bs.forEach((id, k) => { ctx.fillStyle = RARITY[BOON_BY_ID[id].r].c; ctx.beginPath(); ctx.arc(x + 100 + k * 11, y + 14, 4, 0, TAU); ctx.fill(); });
  });
  // top-left stage plate
  glass(10, 10, 330, 52, '#ff4fd8', 14, 0.82);
  const trn = World.stage.training; T(trn ? 'PRACTICE' : stageLabel(R.idx) + (R.path && R.path !== 'road' && PATHS[R.path] ? '  ·  ' + PATHS[R.path].name : '') + ((R.heat | 0) > 0 ? '  ·  HEAT ' + R.heat : ''), 36, 30, 13, (R.heat | 0) > 0 ? '#ffb02c' : '#ff9ae8', { align: 'left', stroke: 0, weight: 800 });
  T(trn ? 'TRAINING' : World.stage.B.name.toUpperCase(), 36, 54, 22, '#fff', { align: 'left', stroke: 5 });
  let mx = 22; for (const m of (World.stage.mods || [])) { const t = MODIFIERS[m].name; ctx.font = `italic 800 13px ${FONT}`; const w = ctx.measureText(t).width + 24; ctx.fillStyle = '#ffd23c'; slant(mx, 68, w, 22, 6); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke(); T(t, mx + w / 2, 84, 13, OL, { stroke: 0, shadow: false, weight: 800 }); mx += w + 6; }
  // top-right: timer, KOs, lives
  glass(W - 300, 10, 290, 52, '#ffd23c', 14, 0.82);
  const tsec = Math.floor(R.time / 60); T(String(Math.floor(tsec / 60)).padStart(2, '0') + ':' + String(tsec % 60).padStart(2, '0'), W - 30, 48, 28, '#fff', { align: 'right', stroke: 6 });
  T('KO ' + R.kills, W - 134, 48, 18, '#ffd23c', { align: 'right', stroke: 4 });
  if (trn) T('∞', W - 255, 46, 24, '#ff6b8a', { stroke: 4 }); else for (let i = 0; i < Math.min(6, G.teamStocks); i++) heart(W - 280 + i * 15, 36, 7);
  if (!trn && G.teamStocks > 6) T('+' + (G.teamStocks - 6), W - 194, 42, 13, '#ff6b8a', { align: 'left', stroke: 3 });
  // center status
  const b = G.bossRef;
  if (b && !b.dead && !b.dying) {
    const bw = 620, bx = W / 2 - bw / 2, by = 22; b._trail = b._trail === undefined ? b.hp : Math.max(b.hp, b._trail - b.maxHp * 0.004);
    glass(bx - 16, by - 8, bw + 32, 40, '#ff3cd5', 14, 0.9);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx, by + 2, bw, 20);
    ctx.fillStyle = '#fff'; ctx.fillRect(bx, by + 2, bw * clamp(b._trail / b.maxHp, 0, 1), 20);
    const hg = ctx.createLinearGradient(0, by, 0, by + 22); hg.addColorStop(0, '#ff8ae8'); hg.addColorStop(1, '#c2189a'); ctx.fillStyle = hg; ctx.fillRect(bx, by + 2, bw * clamp(b.hp / b.maxHp, 0, 1), 20);
    ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.strokeRect(bx, by + 2, bw, 20);
    T(b.def.name.toUpperCase(), W / 2, by + 56, 22, '#fff', { stroke: 6 });
  } else if (G.arenaI >= 0) { const A = World.stage.arenas[G.arenaI]; glass(W / 2 - 150, 14, 300, 40, '#ff4fd8', 12, 0.85); T('WAVE ' + Math.min(A.waves.length, G.waveI + 1) + ' / ' + A.waves.length, W / 2, 43, 24, '#fff', { stroke: 5 }); }
  else if (!trn && World.stage.arenas.every(a => a.done)) { if (World.frame % 60 < 44) T('EXIT OPEN ➜', W / 2, 46, 26, '#e6c8ff', { stroke: 6 }); }
  else if (!trn && World.frame % 90 < 64 && G.stageT < 600) T('GO! ➜', W / 2, 50, 34, '#ffd23c', { stroke: 7 });
  // stage intro banner
  const bn = G.banner; if (bn && bn.t < 210 && !G.paused && !G.localPause) {
    const k = bn.t < 16 ? 1 - Math.pow(1 - bn.t / 16, 3) : bn.t > 180 ? 1 - (bn.t - 180) / 30 : 1; const off = (1 - k) * -W;
    ctx.save(); ctx.globalAlpha = clamp(k * 1.2, 0, 1); ctx.translate(off, 0);
    slant(-20, H / 2 - 92, W + 40, 150, 40); const bg = ctx.createLinearGradient(0, H / 2 - 92, 0, H / 2 + 58); bg.addColorStop(0, 'rgba(40,20,80,0.92)'); bg.addColorStop(1, 'rgba(14,8,30,0.92)'); ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = '#ff4fd8'; ctx.fillRect(0, H / 2 - 92, W, 5); ctx.fillStyle = '#ffd23c'; ctx.fillRect(0, H / 2 + 53, W, 5);
    T(bn.title, W / 2, H / 2 - 22, 58, null, { stroke: 10, grad: ['#fff7c2', '#ffb02c'] });
    T(bn.sub.toUpperCase(), W / 2, H / 2 + 18, 26, '#ff8fe4', { stroke: 6 });
    const tip = World.stage && TIPS[(World.stage.seed >>> 0) % TIPS.length]; if (tip && !bn.mods.length) T('TIP: ' + tip, W / 2, H / 2 + 45, 15, '#ffe9a0', { stroke: 4 });
    if (bn.mods.length) T(bn.mods.map(m => MODIFIERS[m].name + ': ' + MODIFIERS[m].desc).join('   ·   '), W / 2, H / 2 + 45, 15, '#ffe9a0', { stroke: 4 });
    ctx.restore();
  }
  drawHints(); drawCallout(G); drawBossIntro(G); drawBurstCutin(); drawCountdown(G); drawGameSplash(G); drawCritFlash();
  if (G.showControls > 0) { G.showControls--; drawControlsPanel(140, 110, 0.94); }
}
function drawBurstCutin() {
  const p = World.burster; if (!p || !(World.freezeT > 0)) return; const t = 54 - World.freezeT; const B = BURST[p.def.id]; const F = p.def;
  const inK = easeOut(clamp(t / 10, 0, 1)), outK = t > 44 ? (t - 44) / 10 : 0;
  ctx.fillStyle = `rgba(5,0,15,${0.55 * inK * (1 - outK)})`; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = 1 - outK; const bandY = H / 2 - 120, off = (1 - inK) * -W + outK * W;
  ctx.translate(off, 0); slant(-40, bandY, W + 80, 240, 80); const g = ctx.createLinearGradient(0, bandY, W, bandY + 240); g.addColorStop(0, shade(F.color, -0.5)); g.addColorStop(0.5, F.color); g.addColorStop(1, shade(F.color, -0.4)); ctx.fillStyle = g; ctx.fill();
  ctx.save(); slant(-40, bandY, W + 80, 240, 80); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; for (let i = 0; i < 26; i++) { const yy = bandY + ((i * 37 + t * 18) % 240); ctx.beginPath(); ctx.moveTo(((i * 131 + t * 60) % (W + 400)) - 200, yy); ctx.lineTo(((i * 131 + t * 60) % (W + 400)) - 20, yy); ctx.stroke(); }
  drawPortrait(ctx, F.id, 330 + Math.sin(t * 0.2) * 3, bandY + 130, 120, false); ctx.restore();
  ctx.fillStyle = '#fff'; ctx.fillRect(0, bandY, W, 5); ctx.fillRect(0, bandY + 235, W, 5);
  T(F.name + "'S RIFT BURST", 820, bandY + 90, 30, '#fff', { stroke: 7 }); T(B.name, 820, bandY + 160, 66, null, { stroke: 12, grad: ['#ffffff', '#ffd23c'] });
  ctx.restore();
}
function drawPath() {
  drawWorld(); ctx.fillStyle = 'rgba(10,6,20,0.8)'; ctx.fillRect(0, 0, W, H); const G = Game;
  T('CHOOSE YOUR PATH', W / 2, 92, 50, null, { stroke: 10, grad: ['#fff7c2', '#ffb02c'] });
  T('Next: ' + stageLabel((G.run ? G.run.idx : 0) + 1) + (Net.isGuest ? '   ·   your partner is choosing' : ''), W / 2, 128, 18, '#ff9ae8', { stroke: 4 });
  (G.pathOpts || []).forEach((k, i) => {
    const P0 = PATHS[k]; if (!P0) return; const sel = G.pathIdx === i; const ein = easeBack(clamp((UIW.st - 6 - i * 6) / 18, 0, 1));
    const x = W / 2 - 430 + i * 460 + (1 - ein) * (i ? 400 : -400), y = 170, w = 400, h = 420; ctx.save(); ctx.globalAlpha = clamp(ein, 0, 1);
    const lift = sel ? -10 + Math.sin(World.frame * 0.12) * 3 : 0;
    // door
    ctx.beginPath(); ctx.moveTo(x + 40, y + h + lift); ctx.lineTo(x + 40, y + 130 + lift); ctx.quadraticCurveTo(x + w / 2, y - 20 + lift, x + w - 40, y + 130 + lift); ctx.lineTo(x + w - 40, y + h + lift); ctx.closePath();
    const dg = ctx.createLinearGradient(0, y, 0, y + h); dg.addColorStop(0, shade(P0.col, -0.2)); dg.addColorStop(1, shade(P0.col, -0.75)); ctx.fillStyle = dg; ctx.fill(); ctx.lineWidth = sel ? 6 : 3; ctx.strokeStyle = sel ? '#fff' : OL; ctx.stroke();
    ctx.save(); ctx.clip(); ctx.globalCompositeOperation = 'lighter'; const sg = ctx.createRadialGradient(x + w / 2, y + 170 + lift, 10, x + w / 2, y + 170 + lift, 220); sg.addColorStop(0, rgba(P0.col, sel ? 0.65 : 0.35)); sg.addColorStop(1, rgba(P0.col, 0)); ctx.fillStyle = sg; ctx.fillRect(x, y, w, h); ctx.restore();
    T(P0.icon, x + w / 2, y + 200 + lift, 92, '#fff', { italic: false, stroke: 10 });
    T(P0.name, x + w / 2, y + 268 + lift, 28, '#fff', { stroke: 6 });
    T(P0.desc, x + w / 2, y + 302 + lift, 16, '#e8e2f5', { stroke: 0, italic: false, weight: 600, shadow: false });
    glass(x + 60, y + 330 + lift, w - 120, 50, P0.col, 12, 0.92); T('REWARD: ' + P0.reward, x + w / 2, y + 362 + lift, 18, P0.col, { stroke: 4 });
    ctx.restore();
    clickRegions().push({ x, y, w, h, fn: () => { Game.clickPick = i; } });
  });
  T('◀ ▶ choose    ATTACK confirm', W / 2, H - 40, 16, '#cfc6e6', { stroke: 4 });
}
function drawForge() {
  drawTitleBG(); const G = Game; T('RIFT FORGE', W / 2, 80, 54, null, { stroke: 10, grad: ['#fff7c2', '#ffb02c'] });
  glass(W / 2 - 170, 100, 340, 46, '#5ab4ff', 12, 0.9); T('◆ ' + Meta.d.shards + ' RIFT SHARDS', W / 2, 132, 24, '#9fd8ff', { stroke: 5 });
  FORGE.forEach((f, i) => {
    const l = Meta.lv(f.id), maxed = l >= f.max, cost = maxed ? 0 : f.cost(l), afford = Meta.d.shards >= cost; const sel = G.forgeIdx === i; const y = 168 + i * 66, x = W / 2 - 360;
    slant(x - (sel ? 10 : 0), y, 720 + (sel ? 20 : 0), 58, 14); const g = ctx.createLinearGradient(x, 0, x + 720, 0); g.addColorStop(0, sel ? '#4a2f7a' : 'rgba(36,26,62,0.92)'); g.addColorStop(1, sel ? '#26164a' : 'rgba(20,14,36,0.92)'); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = sel ? 3 : 1.5; ctx.strokeStyle = sel ? '#fff' : 'rgba(255,255,255,0.15)'; ctx.stroke();
    T(f.name, x + 28, y + 26, 22, '#fff', { align: 'left', stroke: 5 }); T(f.desc, x + 28, y + 48, 14, '#cfc6e6', { align: 'left', stroke: 0, italic: false, weight: 600, shadow: false });
    for (let k = 0; k < f.max; k++) { ctx.fillStyle = k < l ? '#ffd23c' : 'rgba(0,0,0,0.5)'; slant(x + 430 + k * 24, y + 18, 20, 20, 5); ctx.fill(); }
    T(maxed ? 'MAXED' : '◆ ' + cost, x + 700, y + 38, 20, maxed ? '#7dff8a' : afford ? '#9fd8ff' : '#ff8a8a', { align: 'right', stroke: 4 });
    clickRegions().push({ x, y, w: 720, h: 58, fn: () => { Game.clickPick = i; } });
  });
  if (G.forgeFlash > 0) { G.forgeFlash--; ctx.fillStyle = `rgba(255,230,140,${G.forgeFlash / 60})`; ctx.fillRect(0, 0, W, H); }
  T('ATTACK: buy upgrade    SPECIAL: back    ·    Shards are earned at the end of every run', W / 2, H - 26, 15, '#cfc6e6', { stroke: 4 });
}
function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
function easeBack(k) { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }
function drawCallout(G) {
  const c = G.co; if (!c || c.t > 96) return; c.t++;
  const t = c.t, inK = easeBack(clamp(t / 12, 0, 1)), outK = t > 76 ? (t - 76) / 20 : 0; const sc = 0.4 + 0.6 * inK + outK * 0.3;
  ctx.save(); ctx.globalAlpha = clamp(1 - outK, 0, 1); ctx.translate(W / 2, H * 0.3); ctx.scale(sc, sc); ctx.rotate(-0.04);
  ctx.font = `italic 900 ${c.size}px ${FONT}`; const w = ctx.measureText(c.text).width + 90;
  slant(-w / 2, -c.size * 0.95, w, c.size * 1.25, 26); ctx.fillStyle = 'rgba(20,12,36,0.82)'; ctx.fill(); ctx.strokeStyle = c.col; ctx.lineWidth = 4; ctx.stroke();
  T(c.text, 0, 0, c.size, null, { stroke: Math.max(6, c.size * 0.17), grad: ['#ffffff', c.col] });
  ctx.restore();
}
const BOSS_SUB = { gatekeeper: 'WARDEN OF THE FIRST GATE', matriarch: 'QUEEN OF THE SWARM', crown: 'HEART OF THE RIFT' };
function drawBossIntro(G) {
  const bi = G.bossIntro; if (!bi || bi.t >= 130) return; const t = bi.t; const b = G.bossRef; const type = bi.type || (b && b.type) || 'gatekeeper';
  const bar = 90 * easeOut(clamp(t / 14, 0, 1)) * (t > 116 ? 1 - (t - 116) / 14 : 1);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.9); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(120,0,60,${0.45 * Math.min(1, t / 20)})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (t > 28) {
    const k = clamp((t - 28) / 10, 0, 1); const sc = 2.6 - 1.6 * easeOut(k); const sh = t < 44 ? rr(-6, 6) * (1 - (t - 28) / 16) : 0; const al = t > 116 ? 1 - (t - 116) / 14 : 1;
    ctx.save(); ctx.globalAlpha = al * k; ctx.translate(W / 2 + sh, H * 0.62 + sh); ctx.scale(sc, sc);
    T((BOSS[type] ? BOSS[type].name : 'BOSS').toUpperCase(), 0, 0, 64, null, { stroke: 12, grad: ['#ffffff', '#ff3cd5'] }); ctx.restore();
    if (t === 29) { World.shake(10); }
    if (t > 50) { ctx.globalAlpha = clamp((t - 50) / 14, 0, 1) * al; T(BOSS_SUB[type] || '', W / 2, H * 0.62 + 46, 22, '#ffe9a0', { stroke: 5 }); ctx.globalAlpha = 1; }
  }
}
const UIW = { last: '', t: 99, st: 0, conf: [], ready: {} };
function drawWipe() {
  if (UIW.t > 26) return; const t = UIW.t++; const e = easeOut(clamp(t / 24, 0, 1));
  const cols = ['#ff4fd8', '#8a3cff', '#1a0f2e'];
  cols.forEach((c, i) => { const xl = -260 + clamp(e * 1.15 - i * 0.07, 0, 1) * (W + 560); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(xl, 0); ctx.lineTo(W + 300, 0); ctx.lineTo(W + 300, H); ctx.lineTo(xl - 180, H); ctx.closePath(); ctx.fill(); });
}
function drawConfetti(spawn) {
  if (spawn && UIW.conf.length < 160 && World.frame % 2 === 0) for (let i = 0; i < 3; i++) UIW.conf.push({ x: rr(0, W), y: -10, vx: rr(-1, 1), vy: rr(2, 4), r: rr(0, TAU), vr: rr(-0.2, 0.2), c: pick(['#ffd23c', '#ff4fd8', '#5ab4ff', '#7dff8a', '#ffffff']) });
  for (const p of UIW.conf) { p.x += p.vx + Math.sin(p.y * 0.02) * 0.6; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-4, -2, 8, 4); ctx.restore(); }
  UIW.conf = UIW.conf.filter(p => p.y < H + 20);
}
function heart(x, y, r) { ctx.fillStyle = '#ff4d6d'; ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + r); ctx.bezierCurveTo(x - r * 1.8, y - r * 0.2, x - r * 0.9, y - r * 1.5, x, y - r * 0.5); ctx.bezierCurveTo(x + r * 0.9, y - r * 1.5, x + r * 1.8, y - r * 0.2, x, y + r); ctx.fill(); ctx.stroke(); }
function drawCharSel() {
  drawTitleBG(); const G = Game; const t = World.frame;
  T('CHOOSE YOUR FIGHTER', W / 2, 62, 44, null, { stroke: 9, grad: ['#fff7c2', '#ffb02c'] });
  const ns = G.slots.length;
  if (G.mode !== 'guest' && G.mode !== 'training' && (Meta.d.heat | 0) > 0) { slant(W - 196, 26, 170, 40, 10); ctx.fillStyle = 'rgba(90,40,10,0.92)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffb02c'; ctx.stroke(); T('RIFT HEAT ' + Meta.d.heat, W - 108, 54, 19, '#ffd23c', { stroke: 4 }); }
  { const bits = []; if (G.mode === 'host') bits.push('ROOM CODE ' + Net.code + (Net.guests.length ? '  ·  ' + Net.guests.length + ' online computer' + (Net.guests.length > 1 ? 's' : '') + ' connected ✓' : '  ·  waiting for online players…'));
    if ((G.mode === 'local' || G.mode === 'host') && ns < 3) bits.push('P' + (ns + 1) + ' joins with ATTACK/JUMP on another controller or Arrows + Comma on this keyboard');
    if (G.mode === 'guest' && ns < 3 && Net.locals.length < 2) bits.push('A 2nd player here can join with Arrows + Comma or another controller');
    if (bits.length) T(bits.join('   ·   '), W / 2, 96, bits.join('').length > 110 ? 13 : 15, G.mode === 'host' && Net.guests.length ? '#b8ffc0' : '#ffe9a0', { stroke: 4 }); }
  // big previews for each slot
  const slots = G.slots.length ? G.slots : [{}];
  slots.forEach((sl, k) => {
    const fid = G.csel[k] ?? 0, F = FIGHTERS[fid]; const left = slots.length === 3 ? k < 2 : k === 0; const px = slots.length === 3 ? 40 + k * 420 : (k === 0 ? 60 : W - 60 - 360), py = 112;
    glass(px, py, 360, 400, F.color, 24, 0.85);
    ctx.save(); slant(px, py, 360, 400, 24); ctx.clip(); const sg = ctx.createRadialGradient(px + 180, py + 230, 10, px + 180, py + 230, 230); sg.addColorStop(0, rgba(F.color, 0.55)); sg.addColorStop(1, rgba(F.color, 0)); ctx.fillStyle = sg; ctx.fillRect(px, py, 360, 400);
    const rk = 'r' + k; if (G.cready[k] && UIW.ready[rk] === undefined) UIW.ready[rk] = UIW.st; if (!G.cready[k]) delete UIW.ready[rk];
    const rt = UIW.ready[rk] !== undefined ? UIW.st - UIW.ready[rk] : -1;
    const pose = rt >= 0 ? kfPose(F.moves.usmash.kf, Math.min(F.moves.usmash.kf[2][0] + 2, rt * 0.9)) : menuIdlePose(fid, t);
    drawFighterArt(fid, px + 180, py + 300 - (rt >= 0 && rt < 10 ? Math.sin(rt / 10 * Math.PI) * 20 : 0), left ? 1 : -1, 3.1, pose);
    if (rt >= 0 && rt < 16) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - rt / 16)})`; ctx.fillRect(px, py, 360, 400); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
    T('P' + (k + 1) + (slots[k] && slots[k].mine ? ' · YOU' : slots[k] && slots[k].dev === 'net' ? ' · ONLINE' : ''), px + 34, py + 36, 22, PCOL[k] || '#fff', { align: 'left', stroke: 5 });
    T(F.name, px + 180, py + 340, 46, F.color, { stroke: 9 }); T(F.title.toUpperCase(), px + 180, py + 366, 16, '#fff', { stroke: 4 });
    if (G.cready[k]) { ctx.save(); ctx.translate(px + 180, py + 180); ctx.rotate(-0.15); slant(-130, -34, 260, 64, 18); ctx.fillStyle = 'rgba(255,210,60,0.95)'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 4; ctx.stroke(); T('READY!', 0, 18, 46, '#fff', { stroke: 9 }); ctx.restore(); }
  });
  // moveset card in the middle
  if (slots.length < 3) { const mf = FIGHTERS[G.csel[0] ?? 0]; glass(W / 2 - 200, 130, 400, 180, mf.color, 18, 0.85);
  T('SPECIAL MOVES', W / 2, 160, 18, '#ffd23c', { stroke: 4 });
  [['NEUTRAL', 'nspec'], ['SIDE', 'sspec'], ['UP', 'uspec'], ['DOWN', 'dspec']].forEach(([k, m], j) => { T(k, W / 2 - 160, 194 + j * 28, 14, '#ff9ae8', { align: 'left', stroke: 3, weight: 800 }); T(mf.specials[m].name, W / 2 - 70, 194 + j * 28, 17, '#fff', { align: 'left', stroke: 4 }); });
  UI.wrap(mf.blurb, W / 2 - 180, 330, 360, 14, '#e8e2f5');
  const st = mf.stats; [['WEIGHT', st.weight / 130], ['SPEED', st.run / 7], ['JUMPS', (st.jumps + 1) / 3]].forEach(([n, v], j) => { const y = 380 + j * 24; T(n, W / 2 - 160, y + 12, 13, '#cfc6e6', { align: 'left', stroke: 0, weight: 800 }); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(W / 2 - 70, y, 230, 13); ctx.fillStyle = mf.color; ctx.fillRect(W / 2 - 70, y, 230 * clamp(v, 0, 1), 13); ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.strokeRect(W / 2 - 70, y, 230, 13); }); }
  // roster
  const tw = 128, ty = H - 168;
  FIGHTERS.forEach((F, i) => {
    const x = W / 2 - 2 * (tw + 14) + i * (tw + 14) + 7; const sel = G.slots.map((s2, k) => G.csel[k] === i ? k : -1).filter(k => k >= 0);
    slant(x, ty, tw, 120, 16); const g = ctx.createLinearGradient(0, ty, 0, ty + 120); g.addColorStop(0, shade(F.color, -0.1)); g.addColorStop(1, shade(F.color, -0.6)); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = sel.length ? 4 : 2; ctx.strokeStyle = sel.length ? '#fff' : OL; ctx.stroke();
    ctx.save(); slant(x, ty, tw, 120, 16); ctx.clip(); drawPortrait(ctx, i, x + tw / 2, ty + 58, 40, false); ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; slant(x - 2, ty + 92, tw - 6, 28, 16); ctx.fill(); T(F.name, x + tw / 2 - 6, ty + 113, 18, '#fff', { stroke: 4 });
    sel.forEach((k, j) => { const bx = x + 8 + j * 46, by = ty - 14; ctx.fillStyle = PCOLD[k] || '#888'; slant(bx, by, 44, 24, 8); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2.5; ctx.stroke(); T('P' + (k + 1), bx + 22, by + 18, 15, '#fff', { stroke: 3, shadow: false }); });
    clickRegions().push({ x, y: ty, w: tw, h: 120, fn: () => { Game.clickChar = i; } });
  });
  T('◀ ▶ choose     ATTACK / JUMP confirm     SPECIAL back', W / 2, H - 16, 15, '#cfc6e6', { stroke: 4 });
  if (G.readyT > 0) { const k = easeOut(clamp(G.readyT / 10, 0, 1)); ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.setTransform(HD.k, 0, 0, HD.k, 0, 0); ctx.translate((1 - k) * -W, 0); const y = H / 2 - 50; const gr = ctx.createLinearGradient(0, y, 0, y + 100); gr.addColorStop(0, '#ff4fd8'); gr.addColorStop(1, '#8a3cff'); ctx.fillStyle = gr; slant(-20, y, W + 40, 100, 24); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 5; ctx.stroke(); T('READY TO FIGHT!', W / 2 + Math.sin(G.readyT * 0.3) * 2, y + 72, 64, null, { stroke: 11, grad: ['#ffffff', '#ffe27a'] }); ctx.restore(); }
}
const BOON_ICON = { dmg: '✊', weight: '⛰', speed: '➤', jump: '⇧', heal: '✚', shield: '⬢', spec: '✦', smash: '✸', take: '◆', lag: '⤓', kb: '✹', aerial: '✈', land: '☄', thorns: '✶', stock: '♥', atk: '⚡', orb: '◉', steal: '♦', exec: '☠', meteor: '☄', phoenix: '❂', chain: 'ϟ', giant: '▲', glass: '◇', opener: '➹', trophy: '♛', medic: '✙', cache: '◈', combo: '∞', crit: '✪', riposte: '⟲', conduit: '⌁', berserk: '♨', flow: '≋', jackpot: '❖' };
function drawBoon() {
  drawWorld(); ctx.fillStyle = 'rgba(10,6,20,0.78)'; ctx.fillRect(0, 0, W, H); const G = Game;
  T(G.run && G.run.endless && G.run.idx === 11 ? 'ENDLESS AWAITS · CHOOSE A BOON' : 'STAGE CLEAR!', W / 2, 74, 46, null, { stroke: 9, grad: ['#fff7c2', '#ffb02c'] });
  T('Choose a boon' + (G.run && G.run.rerolls ? '   ·   SHIELD: reroll (' + Object.values(G.run.rerolls).map(v => v | 0).join(' / ') + ' left)' : ''), W / 2, 104, 18, '#ff9ae8', { stroke: 4 });
  const n = World.players.length; const C3 = n >= 3; const colW = C3 ? 400 : n > 1 ? 560 : 640;
  World.players.forEach((p, i) => {
    const x0 = C3 ? W / 2 - (3 * colW + 2 * 16) / 2 + i * (colW + 16) : n > 1 ? W / 2 - colW - 12 + i * (colW + 24) : W / 2 - colW / 2;
    T('P' + (i + 1) + ' · ' + p.def.name + (G.boonPick[i] ? '  ✓' : ''), x0 + colW / 2, 140, 22, p.def.color, { stroke: 5 });
    (G.boonOpts[i] || []).forEach((id, k) => {
      const b = BOON_BY_ID[id]; const sel = G.boonIdx[i] === k && !G.boonPick[i]; const picked = G.boonPick[i] === id; const rc = RARITY[b.r].c;
      const ein = easeBack(clamp((UIW.st - 8 - k * 6 - i * 3) / 18, 0, 1)); ctx.save(); ctx.globalAlpha = clamp(ein, 0, 1); ctx.translate((1 - ein) * (i ? 500 : -500), 0);
      if (C3) { const y = 158 + k * 156, lift = sel ? -4 + Math.sin(World.frame * 0.15) * 1.5 : 0; slant(x0, y + lift, colW, 138, 16); const g = ctx.createLinearGradient(x0, y, x0 + colW, y + 138); g.addColorStop(0, picked ? '#2f6b3a' : sel ? '#4a2f7a' : '#2a1f45'); g.addColorStop(1, picked ? '#173a1e' : sel ? '#26164a' : '#160f28'); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = sel || picked ? 4 : 2.5; ctx.strokeStyle = sel ? '#fff' : rc; ctx.stroke();
        const ix = x0 + 48, iy = y + 52 + lift; ctx.beginPath(); ctx.arc(ix, iy, 30, 0, TAU); const ig = ctx.createRadialGradient(ix - 8, iy - 10, 3, ix, iy, 32); ig.addColorStop(0, shade(rc, 0.4)); ig.addColorStop(1, shade(rc, -0.45)); ctx.fillStyle = ig; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OL; ctx.stroke(); T(BOON_ICON[id] || '✦', ix, iy + 12, 32, '#fff', { italic: false, stroke: 4 });
        T(RARITY[b.r].n, x0 + 92, y + 28 + lift, 12, rc, { align: 'left', stroke: 3, weight: 800 }); T(b.name, x0 + 92, y + 56 + lift, 22, '#fff', { align: 'left', stroke: 5 });
        wrapLeft(b.desc, x0 + 22, y + 96 + lift, colW - 44, 13, '#e0d8f0', 2); if (picked) T('CHOSEN!', x0 + colW - 60, y + 30, 18, '#7dff8a', { stroke: 5 });
        ctx.restore(); if (G.slots[i] && G.slots[i].dev !== 'net') clickRegions().push({ x: x0, y, w: colW, h: 138, fn: () => { Game.clickBoon = [i, k]; } }); return; }
      const y = 158 + k * 156; const lift = sel ? -4 + Math.sin(World.frame * 0.15) * 1.5 : 0; slant(x0, y + lift, colW, 138, 20);
      const g = ctx.createLinearGradient(x0, y, x0 + colW, y + 138); g.addColorStop(0, picked ? '#2f6b3a' : sel ? '#4a2f7a' : '#2a1f45'); g.addColorStop(1, picked ? '#173a1e' : sel ? '#26164a' : '#160f28'); ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = sel || picked ? 4 : 2.5; ctx.strokeStyle = sel ? '#fff' : rc; ctx.stroke();
      // icon medallion
      const ix = x0 + 76, iy = y + 69 + lift; ctx.beginPath(); ctx.arc(ix, iy, 44, 0, TAU); const ig = ctx.createRadialGradient(ix - 12, iy - 14, 4, ix, iy, 46); ig.addColorStop(0, shade(rc, 0.4)); ig.addColorStop(1, shade(rc, -0.45)); ctx.fillStyle = ig; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OL; ctx.stroke();
      T(BOON_ICON[id] || '✦', ix, iy + 17, 46, '#fff', { italic: false, stroke: 5 });
      T(RARITY[b.r].n, x0 + 140, y + 34 + lift, 14, rc, { align: 'left', stroke: 3, weight: 800 });
      T(b.name, x0 + 140, y + 72 + lift, 32, '#fff', { align: 'left', stroke: 6 });
      T(b.desc, x0 + 140, y + 104 + lift, 17, '#e0d8f0', { align: 'left', stroke: 0, italic: false, weight: 600, shadow: false });
      const have = p.boons.filter(z => z === id).length; if (have) T('OWNED ×' + have, x0 + colW - 30, y + 34 + lift, 13, '#bfb4d8', { align: 'right', stroke: 3 });
      if (picked) { ctx.save(); ctx.translate(x0 + colW - 70, y + 92); ctx.rotate(-0.2); T('CHOSEN!', 0, 0, 26, '#7dff8a', { stroke: 6 }); ctx.restore(); }
      ctx.restore();
      if (G.slots[i] && G.slots[i].dev !== 'net') clickRegions().push({ x: x0, y, w: colW, h: 138, fn: () => { Game.clickBoon = [i, k]; } });
    });
    if (G.slots[i] && G.slots[i].dev === 'net' && !G.boonPick[i]) T('waiting for partner…', x0 + colW / 2, 650, 18, '#cfc6e6', { stroke: 4 });
  });
}
function drawPause(local) {
  if (Game.pauseMoves) { movesDraw(true); return; }
  ctx.fillStyle = 'rgba(10,6,20,0.7)'; ctx.fillRect(0, 0, W, H);
  const trn = !!(World.stage && World.stage.training);
  T(Net.isGuest && Net.hostPaused && !local ? 'PAUSED BY HOST' : 'PAUSED', W / 2, trn ? 78 : 190, trn ? 60 : 72, null, { stroke: 12, grad: ['#fff7c2', '#ffb02c'] });
  if (!Net.isGuest) drawMenu('', pauseOpts(), Game.pauseIdx, trn ? 150 : 300, 70, trn ? 52 : 58); else if (local) drawMenu('', GUEST_PAUSE, Game.pauseIdx, 300, 70);
  drawRunInfo();
  T(trn ? '◀ ▶ change dummy / volume' : '◀ ▶ adjust volume', 290, trn ? 690 : 615, 15, '#cfc6e6', { stroke: 4 });
}
function sceneDraw() {
  const G = Game; Game.clicks = [];
  const sc = Net.isGuest ? Net.guestScene : G.scene;
  if (sc !== UIW.last) { if (!(UIW.last === 'play' && sc === 'boon') && !(UIW.last === 'boon' && sc === 'play')) UIW.t = 0; UIW.last = sc; UIW.st = 0; UIW.conf = []; } UIW.st++;
  setupHD(); ctx.setTransform(HD.k, 0, 0, HD.k, 0, 0); ctx.clearRect(0, 0, W, H); ctx.imageSmoothingQuality = 'high';
  switch (sc) {
    case 'title':
      drawTitleBG(); drawTitleFighters(H - 118, 2.2, 190); drawLogo(W / 2, 220, 120);
      T('A CO-OP ROGUELIKE PLATFORM FIGHTER', W / 2, 268, 20, '#ff9ae8', { stroke: 5 });
      if (G.t % 70 < 50) T('PRESS ANY BUTTON', W / 2, 352, 32, '#fff', { stroke: 7 });
      T('version ' + GAME_VERSION, 16, H - 14, 13, '#cfc6e6', { align: 'left', stroke: 3, shadow: false });
      if (!Audio2.ctx || Audio2.ctx.state !== 'running') T('♪ Click or press a key to turn on music & sound', W / 2, 440, 15, '#ffe9a0', { stroke: 4 });
      T(gamepadBlocked ? 'Controllers unavailable in this view — open the page full-screen to use one' : (getPads().length ? 'Controller detected: ' + shortPadName(getPads()[0].id) : 'Keyboard ready · plug in a controller and press a button'), W / 2, 390, 15, '#cfc6e6', { stroke: 4 });
      if (G.best.time) T('Best clear ' + fmtTime(G.best.time) + (G.best.endless ? '  ·  Endless best ' + G.best.endless : ''), W / 2, 414, 14, '#bfb4d8', { stroke: 3 });
      clickRegions().push({ x: 0, y: 0, w: W, h: H, fn: () => { Game.clicked = 1; } }); break;
    case 'mode': {
      drawTitleBG(); drawLogo(320, 118, 72);
      const MO = modeOpts(), ml = MO[G.menuIdx] || MO[0];
      drawMenu('', MO, G.menuIdx, 196, 70, MO.length > 9 ? 52 : 56);
      glass(W - 520, 190, 450, 300, '#ffd23c', 22, 0.85);
      T(ml, W - 295, 236, 26, '#ffd23c', { stroke: 6 });
      UI.wrap(MODE_INFO[ml] || '', W - 470, 276, 360, ml === 'RIFT HEAT' ? 15 : 17, '#e8e2f5');
      const fi = G.menuIdx % 4; ctx.save(); slant(W - 520, 190, 450, 300, 22); ctx.clip(); drawFighterArt(fi, W - 295, 476, -1, 1.9, menuIdlePose(fi, World.frame)); ctx.restore();
      break;
    }
    case 'controls': drawTitleBG(); drawControlsPanel(120, 110); T('press any button to return', W / 2, 650, 15, '#cfc6e6', { stroke: 4 }); clickRegions().push({ x: 0, y: 0, w: W, h: H, fn: () => { Game.clickPick = 0; } }); break;
    case 'remap': { drawTitleBG(); const R = G.remap; glass(W / 2 - 360, 120, 720, 400, '#ff4fd8', 24); T('CONTROLLER SETUP', W / 2, 180, 40, '#fff', { stroke: 8 }); if (!getPads().length) T('No controller detected. Connect one and press a button first.', W / 2, 300, 18, '#ffe9a0', { stroke: 4 }); else { T('Press the button you want for:', W / 2, 270, 20, '#e8e2f5', { stroke: 4 }); T(REMAP_STEPS[Math.min(R.step, REMAP_STEPS.length - 1)][1], W / 2, 350, 64, null, { stroke: 10, grad: ['#fff', '#ff4fd8'] }); T('Smash default: ATTACK = A (right), SPECIAL = B (bottom), JUMP = X, SHIELD = R', W / 2, 420, 15, '#cfc6e6', { stroke: 3 }); T('Esc: cancel   ·   Backspace: reset to default', W / 2, 460, 14, '#bfb4d8', { stroke: 3 }); } break; }
    case 'lobby': drawTitleBG(); glass(W / 2 - 380, 110, 760, 420, '#ffd23c', 26); T('HOSTING ONLINE CO-OP', W / 2, 180, 40, '#fff', { stroke: 8 }); T('Read this room code to your partner:', W / 2, 238, 20, '#e8e2f5', { stroke: 4 }); T(Net.code || '····', W / 2, 350, 110, null, { stroke: 14, grad: ['#fff7c2', '#ffb02c'] }); T(Net.status, W / 2, 410, 18, Net.ok ? '#7dff8a' : '#ff8a8a', { stroke: 4 }); T('They open this same game, pick ONLINE: JOIN, and enter the code.', W / 2, 450, 16, '#cfc6e6', { stroke: 3 }); T('SPECIAL / Esc to go back', W / 2, 500, 14, '#bfb4d8', { stroke: 3 }); T('version ' + GAME_VERSION, W / 2, 560, 13, '#cfc6e6', { stroke: 3, shadow: false }); break;
    case 'join': drawTitleBG(); glass(W / 2 - 380, 110, 760, 420, '#5ab4ff', 26); T('JOIN ONLINE CO-OP', W / 2, 180, 40, '#fff', { stroke: 8 }); T("Type your partner's 4-letter code, then press Enter", W / 2, 240, 18, '#e8e2f5', { stroke: 4 }); TWrap(Net.status, W / 2, 452, 17, Net.ok ? '#7dff8a' : '#ffe9a0', 700); T('version ' + GAME_VERSION + ' — both players must show the same version', W / 2, 518, 13, '#cfc6e6', { stroke: 3, shadow: false }); break;
    case 'charsel': drawCharSel(); break;
    case 'play': drawWorld(); drawHUD(); if (G.paused || (Net.isGuest && Net.hostPaused)) drawPause(); if (Net.isGuest && G.localPause) drawPause(true); break;
    case 'boon': drawBoon(); break;
    case 'path': drawPath(); break;
    case 'forge': drawForge(); break;
    case 'options': optionsDraw(); break;
    case 'moves': movesDraw(false); break;
    case 'records': recordsDraw(); break;
    case 'over': { drawTitleBG(); const s = G.overStats || {}; if (s.ps && s.ps.length) drawResultCards(s); else drawTitleFighters(H - 118, 2.2, 190); T(s.win ? 'VICTORY!' : 'DEFEATED', W / 2, 190, 100, null, { stroke: 14, grad: s.win ? ['#fff7c2', '#ffb02c'] : ['#ffb3c1', '#e8203f'] }); T(s.stage || '', W / 2, 248, 26, '#fff', { stroke: 6 }); T('TIME ' + fmtTime(s.time || 0) + '    KOs ' + (s.kills || 0) + (s.endless ? '    ENDLESS STAGES ' + s.endless : ''), W / 2, 292, 22, '#e8e2f5', { stroke: 5 }); if (s._earned !== undefined) { glass(W / 2 - 220, 318, 440, 50, '#5ab4ff', 12, 0.9); T('+' + s._earned + ' RIFT SHARDS  ·  total ' + Meta.d.shards, W / 2, 352, 22, '#9fd8ff', { stroke: 5 }); } drawFeatToasts(s);
      if (G.t > 40 || Net.isGuest) T('ATTACK: new run    ·    SPECIAL: title    ·    spend shards in the RIFT FORGE', W / 2, s.ps && s.ps.length ? 690 : 410, 20, '#ffd23c', { stroke: 5 }); clickRegions().push({ x: 0, y: 0, w: W, h: H, fn: () => { Game.clickPick = 0; } }); break; }
    case 'victory': { drawWorld(); ctx.fillStyle = 'rgba(10,6,20,0.72)'; ctx.fillRect(0, 0, W, H); T('THE HOLLOW CROWN FALLS', W / 2, 170, 58, null, { stroke: 11, grad: ['#fff7c2', '#ffb02c'] }); T('RUN TIME ' + fmtTime(G.run ? G.run.time : 0), W / 2, 220, 22, '#fff', { stroke: 5 }); T('The rift is still open… how far can you go?', W / 2, 258, 20, '#ff9ae8', { stroke: 5 }); drawMenu('', ['ENTER ENDLESS MODE', 'END RUN (VICTORY)'], G.menuIdx, 360); break; }
    case 'wait': drawTitleBG(); drawTitleFighters(H - 118, 2.2, 190); glass(W / 2 - 360, 260, 720, 110, '#5ab4ff', 22); T(Net.status || 'Waiting for host…', W / 2, 326, 24, '#fff', { stroke: 6 }); break;
  }
  if (sc === 'victory' || (sc === 'over' && G.overStats && G.overStats.win)) drawConfetti(true);
  drawWipe();
  UI.toasts.forEach((t, i) => { t.life--; ctx.globalAlpha = clamp(t.life / 30, 0, 1); ctx.font = `italic 800 16px ${FONT}`; const w = ctx.measureText(t.t).width + 40; glass(W - w - 16, 100 + i * 44, w, 36, '#7dff8a', 10, 0.92); T(t.t, W - 16 - w / 2 - 4, 124 + i * 44, 16, '#fff', { stroke: 4 }); ctx.globalAlpha = 1; });
  UI.toasts = UI.toasts.filter(t => t.life > 0);
}

// Smash-style per-player results cards
function drawResultCards(s) {
  const ps = s.ps, n = ps.length, cw = n >= 4 ? 236 : 270, ch = 236, gap = 22, x0 = W / 2 - (n * cw + (n - 1) * gap) / 2, y0 = 392;
  const mvp = ps.reduce((b, q, i) => (q[1] + q[2] * 40 > ps[b][1] + ps[b][2] * 40 ? i : b), 0);
  if (UIW.st === 14) { Audio2.play(s.win ? 'fanfare' : 'sting'); const nm = (FIGHTERS[ps[mvp][0]] || FIGHTERS[0]).name; announce(s.win ? (n > 1 ? 'The winner is... ' + nm[0] + nm.slice(1).toLowerCase() + '!' : 'Victory!') : 'Defeated.'); }
  ps.forEach((q, i) => {
    const F = FIGHTERS[q[0]] || FIGHTERS[0], ein = easeBack(clamp((UIW.st - 10 - i * 7) / 20, 0, 1)); if (ein <= 0) return;
    const x = x0 + i * (cw + gap), y = y0 + (1 - ein) * 260;
    ctx.save(); ctx.globalAlpha = clamp(ein, 0, 1);
    // fighter standing on the floor beside the row, celebrating or slumped
    if (n <= 2) { let pose = menuIdlePose(q[0], World.frame + i * 13); const vm = s.win && FIGHTERS[q[0]].moves[['tauntU', 'tauntS', 'tauntD'][(q[0] + i) % 3]]; if (vm) pose = kfPose(vm.kf, Math.min(vm.d - 14, (World.frame * 0.6 + i * 17) % (vm.d + 30))).slice(); else if (s.win) { pose[3] = 13; pose[4] = -23 + Math.sin(World.frame * 0.15 + i) * 3; pose[1] -= Math.abs(Math.sin(World.frame * 0.08 + i * 1.7)) * 6; } else { pose[1] += 4; pose[2] = 0.45; pose[3] = 4; pose[4] = 16; } const side = i === 0 ? -1 : 1; drawFighterArt(q[0], side < 0 ? x - 95 : x + cw + 95, 600, -side, 2.1, pose, false, s.win ? 'happy' : 'hurt'); }
    glass(x, y, cw, ch, F.color, 16, 0.92);
    drawPortrait(ctx, q[0], x + 40, y + 40, 26);
    T('P' + (i + 1), x + 76, y + 30, 14, F.color, { align: 'left', stroke: 4 }); T(F.name.toUpperCase(), x + 76, y + 56, 24, '#fff', { align: 'left', stroke: 5 });
    if (i === mvp && n > 1) { T('★ MVP', x + cw - 16, y + 30, 15, '#ffd23c', { align: 'right', stroke: 4 }); }
    const rows = [['DAMAGE DEALT', q[1]], ['KOs', q[2]], ['BEST COMBO', q[3] + ' hits'], ['TECHS', q[4]], ['PARRIES', q[5]], ['FALLS', q[6]]];
    rows.forEach(([k, v], r) => { const yy = y + 96 + r * 22; T(k, x + 22, yy, 13, '#bfb4d8', { align: 'left', stroke: 0, shadow: false, weight: 800 }); T(String(v), x + cw - 22, yy, 15, '#fff', { align: 'right', stroke: 3, shadow: false }); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x + 22, yy + 6, cw - 44, 1); });
    ctx.restore();
  });
}

function TWrap(text, x, y, size, col, maxW) {
  text = String(text || ''); ctx.font = `italic 800 ${size}px ${FONT}`; const words = text.split(' '), lines = []; let ln = '';
  for (const w of words) { const t = ln ? ln + ' ' + w : w; if (ctx.measureText(t).width > maxW && ln) { lines.push(ln); ln = w; } else ln = t; } if (ln) lines.push(ln);
  lines.slice(0, 4).forEach((l, i) => T(l, x, y + i * (size + 7), size, col, { stroke: 4 }));
}

// 3-2-1-GO! countdown, GAME! splash and critical-hit flash (all driven by synced timers so online guests see them too)
function drawCountdown(G) {
  const c = G.countT | 0; if (c <= 0) { G._cdLast = 0; return; }
  const n = c > 150 ? '3' : c > 100 ? '2' : c > 50 ? '1' : 'GO!', local = (c > 150 ? c - 150 : c > 100 ? c - 100 : c > 50 ? c - 50 : c) / 50, k = 1 - local;
  if (Net.isGuest && G._cdLast !== n) { G._cdLast = n; if (n === 'GO!') { Audio2.play('go'); announce('Go!'); } else { Audio2.play('count'); announce(n); } }
  const pop = n === 'GO!' ? 1 + easeBack(clamp(k * 3, 0, 1)) * 0.4 : 1.6 - easeOut(clamp(k * 4, 0, 1)) * 0.6; const a = n === 'GO!' ? clamp(local * 2.5, 0, 1) : clamp((1 - k) * 3, 0, 1) * clamp(local * 5, 0, 1) + (k < 0.2 ? 1 : 0);
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(W / 2, H / 2 - 30); ctx.scale(pop, pop);
  T(n, 0, 0, n === 'GO!' ? 150 : 170, null, { stroke: 18, grad: n === 'GO!' ? ['#fff7c2', '#ff4fd8'] : ['#ffffff', '#ffb02c'] }); ctx.restore();
}
function drawGameSplash(G) {
  const t = G.gameT | 0; if (t <= 0) { G._gsShown = 0; return; }
  if (Net.isGuest && !G._gsShown) { G._gsShown = 1; Audio2.play('game'); announce('Game!'); }
  const k = clamp((120 - t) / 14, 0, 1), sc = 2.2 - easeOut(k) * 1.2;
  ctx.save(); ctx.fillStyle = `rgba(0,0,0,${0.35 * k})`; ctx.fillRect(0, 0, W, H); ctx.translate(W / 2, H / 2); ctx.rotate(-0.06); ctx.scale(sc, sc); ctx.globalAlpha = k;
  T('GAME!', 0, 30, 170, null, { stroke: 20, grad: ['#ffffff', '#ff3c5a'] }); ctx.restore();
}
function drawCritFlash() {
  const t = World.critT | 0; if (t <= 0) return; const k = t / 26;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.7); gr.addColorStop(0, `rgba(120,200,255,${0.0})`); gr.addColorStop(1, `rgba(90,170,255,${0.45 * k})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = `rgba(255,255,255,${0.6 * k})`; ctx.lineWidth = 3; for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + t * 0.02, r0 = 260 + (i % 3) * 40; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); ctx.lineTo(W / 2 + Math.cos(a) * 900, H / 2 + Math.sin(a) * 900); ctx.stroke(); } ctx.restore();
}

function wrapLeft(text, x, y, maxW, size, col, maxLines = 3) { ctx.font = `600 ${size}px ${FONT}`; const words = String(text || '').split(' '), lines = []; let ln = ''; for (const w of words) { const t = ln ? ln + ' ' + w : w; if (ctx.measureText(t).width > maxW && ln) { lines.push(ln); ln = w; } else ln = t; } if (ln) lines.push(ln); lines.slice(0, maxLines).forEach((l, i) => T(l, x, y + i * (size + 5), size, col, { align: 'left', stroke: 0, italic: false, weight: 600, shadow: false })); }
