// ===== extras: options, move list, records & feats, Rift Heat =====
const Opt = Object.assign({ shake: 1, flash: 1, hints: 1 }, store('sse_opt') || {});
function saveOpt() { store('sse_opt', Opt); }
VOL_ROWS['SCREEN SHAKE'] = () => Opt.shake;
// rows that show a value instead of a slider; left/right or confirm changes them
const ROW_TXT = {
  'HIT FLASHES': () => Opt.flash ? 'ON' : 'OFF',
  'TIPS IN PLAY': () => Opt.hints ? 'ON' : 'OFF',
  'RIFT HEAT': () => (Meta.d.heat | 0) + ' / ' + (Meta.d.heatMax | 0),
};
function rowAdjust(label, dir) {
  if (!dir) return false;
  if (volAdjust(label, dir)) return true;
  if (label === 'HIT FLASHES') { Opt.flash = Opt.flash ? 0 : 1; saveOpt(); Audio2.play('cursor'); return true; }
  if (label === 'TIPS IN PLAY') { Opt.hints = Opt.hints ? 0 : 1; saveOpt(); if (Opt.hints) { Meta.d.tut = 0; Meta.save(); Game._hint = null; } /* turning tips back on replays them */ Audio2.play('cursor'); return true; }
  if (label === 'RIFT HEAT') { const mx = Meta.d.heatMax | 0; Meta.d.heat = ((Meta.d.heat | 0) + dir + mx + 1) % (mx + 1); Meta.save(); Audio2.play('cursor'); return true; }
  return false;
}
function modeOpts() { const o = ['SOLO RUN', 'LOCAL CO-OP (2-3P)', 'ONLINE: HOST', 'ONLINE: JOIN', 'TRAINING', 'MOVE LIST', 'RIFT FORGE', 'RECORDS', 'OPTIONS']; if ((Meta.d.heatMax | 0) > 0) o.splice(5, 0, 'RIFT HEAT'); return o; }
const MODE_INFO = {
  'SOLO RUN': 'Dive into the rift on your own. 12 stages, 3 bosses, then Endless.',
  'LOCAL CO-OP (2-3P)': 'Up to three players on one screen: share the keyboard (two players fit on it) or plug in controllers.',
  'ONLINE: HOST': 'Open an online room and read your 4-letter code to your partners. Up to 3 players.',
  'ONLINE: JOIN': "Type in your partner's room code to join their run.",
  'TRAINING': 'A floating practice stage with ledges, a wall and respawning dummies. Infinite lives and a full Rift Burst meter.',
  'RIFT HEAT': 'Turn up the difficulty for bigger rewards. Each level: enemies get +15% health and +12% damage, more elites appear, and you earn +25% Rift Shards. Clear the rift at your highest Heat to unlock the next (up to 5).',
  'MOVE LIST': "Every fighter's attacks with their inputs, shown in motion.",
  'RIFT FORGE': 'Spend Rift Shards earned from runs on permanent upgrades.',
  'RECORDS': 'Your best times, totals and Feats. Each Feat pays out Rift Shards the first time you earn it.',
  'OPTIONS': 'Controls, controller setup, volume, screen shake and flashes.',
};
const OPT_OPTS = ['CONTROLS', 'CONTROLLER SETUP', 'SFX VOLUME', 'MUSIC VOLUME', 'SCREEN SHAKE', 'HIT FLASHES', 'TIPS IN PLAY', 'BACK'];
const OPT_INFO = {
  'CONTROLS': 'See every button for controllers and keyboard.', 'CONTROLLER SETUP': 'Rebind your controller buttons if any feel wrong.',
  'SFX VOLUME': 'Volume of sound effects and menu sounds. Use left/right (or click the bar) to adjust.', 'MUSIC VOLUME': 'Volume of the soundtrack. 0% turns music off.',
  'SCREEN SHAKE': 'How hard the screen shakes on big hits. 0% turns it off.', 'HIT FLASHES': 'White screen flashes on KOs, parries and heavy hits. Turn off if they bother you.',
  'TIPS IN PLAY': 'Short reminders of the basics during your first stages.', 'BACK': 'Return to the main menu.',
};
function optionsUpdate() {
  const G = Game; const d = menuNav(OPT_OPTS.length), lab0 = OPT_OPTS[G.menuIdx]; rowAdjust(lab0, d === 'left' ? -1 : d === 'right' ? 1 : 0);
  const ok = anyOK() || G.clickPick !== undefined; if (G.clickPick !== undefined) { G.menuIdx = G.clickPick; G.clickPick = undefined; }
  if (ok) {
    const lab = OPT_OPTS[G.menuIdx], prim = ok.dev || G.primary || 'kb1'; Audio2.play('select');
    if (lab === 'CONTROLS') G.setScene('controls'); else if (lab === 'CONTROLLER SETUP') { G.remap = { dev: prim, step: 0, map: {} }; G.setScene('remap'); }
    else if (lab === 'BACK') G.setScene('mode'); else rowAdjust(lab, 1);
  }
  if (anyBack()) G.setScene('mode');
}
function optionsDraw() {
  const G = Game; drawTitleBG(); T('OPTIONS', 320, 118, 54, null, { stroke: 10, grad: ['#fff7c2', '#ffb02c'] });
  drawMenu('opt', OPT_OPTS, G.menuIdx, 196, 70, 58);
  glass(W - 520, 190, 450, 190, '#ffd23c', 22, 0.85); T(OPT_OPTS[G.menuIdx], W - 295, 236, 26, '#ffd23c', { stroke: 6 }); UI.wrap(OPT_INFO[OPT_OPTS[G.menuIdx]] || '', W - 470, 276, 360, 17, '#e8e2f5');
}

// ---------- MOVE LIST ----------
const MOVE_ROWS = [
  ['jab', 'GROUND', 'ATTACK  (tap up to 3 times)', 'Jab combo'], ['ftilt', 'GROUND', 'Hold forward + ATTACK', 'Forward tilt'], ['utilt', 'GROUND', 'Hold up + ATTACK', 'Up tilt'], ['dtilt', 'GROUND', 'Hold down + ATTACK', 'Down tilt'], ['dash', 'GROUND', 'ATTACK while running', 'Dash attack'],
  ['fsmash', 'SMASH', 'SMASH + forward  (or flick forward + ATTACK)', 'Forward smash'], ['usmash', 'SMASH', 'SMASH + up  (or flick up + ATTACK)', 'Up smash'], ['dsmash', 'SMASH', 'SMASH + down  (or flick down + ATTACK)', 'Down smash'],
  ['nair', 'AIR', 'ATTACK in the air', 'Neutral air'], ['fair', 'AIR', 'Forward + ATTACK in the air', 'Forward air'], ['bair', 'AIR', 'Back + ATTACK in the air', 'Back air'], ['uair', 'AIR', 'Up + ATTACK in the air', 'Up air'], ['dair', 'AIR', 'Down + ATTACK in the air', 'Down air'],
  ['nspec', 'SPECIAL', 'SPECIAL', ''], ['sspec', 'SPECIAL', 'Forward + SPECIAL', ''], ['uspec', 'SPECIAL', 'Up + SPECIAL', ''], ['dspec', 'SPECIAL', 'Down + SPECIAL', ''],
  ['grab', 'GRAB', 'SHIELD + ATTACK', 'Grab'], ['burst', 'BURST', 'SHIELD + SPECIAL with a full Rift meter', ''],
];
const CAT_COL = { GROUND: '#9fd8ff', SMASH: '#ffb02c', AIR: '#7dff8a', SPECIAL: '#ff9ae8', GRAB: '#d8d0ea', BURST: '#ffe14a' };
const SPEC_INFO = [
  { nspec: 'Hold SPECIAL to wind up, release to throw a straight punch. Fully charged it hits like a truck.', sspec: 'Dash forward and tear through foes with a flurry of blows.', uspec: 'A leaping uppercut. This is how you get back to the stage.', dspec: 'Dive straight down. Foes underneath are spiked toward the ground.' },
  { nspec: 'Fires a crescent of energy across the stage.', sspec: 'Vanish forward in a flash, cutting whatever you pass through.', uspec: 'A spinning, rising slash. This is how you get back to the stage.', dspec: 'A counter stance: if you are struck during it, you strike back harder.' },
  { nspec: 'Hold SPECIAL to grow the orb, release to fire it.', sspec: 'A fast bolt of lightning.', uspec: 'Teleport in the direction you hold (up by default). This is how you get back to the stage.', dspec: 'Places a rune that bursts when a foe comes near. Two can be out at once.' },
  { nspec: 'Throws the hammer. You fight bare-handed until it comes back.', sspec: 'An armoured charge that carries foes along.', uspec: 'An explosive leap. This is how you get back to the stage.', dspec: 'Slams the ground with a shockwave. In the air it becomes a plunging drop.' },
];
const BURST_INFO = ['A blazing rush that carries everything in front of you away.', 'Blinks across the screen cutting every foe many times over.', 'Calls a rain of stars down across the arena.', 'A single stage-shaking hammer blow.'];
const GENERIC_INFO = {
  jab: 'Your fastest attack. Keep tapping to finish the combo.', ftilt: 'A quick poke with good reach.', utilt: 'Covers the space above you and starts juggles.', dtilt: 'A low, fast hit from a crouch.', dash: 'A running attack that keeps your momentum.',
  fsmash: 'Your strongest sideways launcher. Hold to charge it.', usmash: 'A powerful launcher straight up. Hold to charge it.', dsmash: 'Hits on both sides. Hold to charge it.',
  nair: 'A quick all-round aerial that is safe to throw out.', fair: 'Attacks in front of you in the air.', bair: 'Attacks behind you in the air, usually strong.', uair: 'Attacks above you to juggle.', dair: 'Attacks below you.',
  grab: 'Grabs a foe through their shield. Then press ATTACK to pummel, or a direction to throw.',
};
function moveRowsFor(fid) {
  const F = FIGHTERS[fid];
  return MOVE_ROWS.map(([key, cat, input, gen]) => {
    const seq = key === 'jab' ? [F.moves.jab1, F.moves.jab2, F.moves.jab3].filter(Boolean) : key === 'burst' ? [] : [F.moves[key]].filter(Boolean);
    const last = seq[seq.length - 1], spec = F.specials && F.specials[key];
    const title = key === 'burst' ? BURST[fid].name.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()) : spec ? spec.name : (last && last.title) || gen;
    const tags = []; let dmg = 0;
    for (const mv of seq) {
      const grp = {}; for (const h of mv.hb || []) { if (h.grab) continue; const d = h.d * (h.multi || 1); if (h.grp !== undefined) grp[h.grp] = Math.max(grp[h.grp] || 0, d); else dmg += d; if (h.spike) tags.includes('METEOR') || tags.push('METEOR'); if (h.trip) tags.includes('TRIPS') || tags.push('TRIPS'); if (h.bury) tags.includes('BURIES') || tags.push('BURIES'); if (h.multi) tags.includes('MULTI-HIT') || tags.push('MULTI-HIT'); }
      for (const k in grp) dmg += grp[k];
      if (mv.charge !== undefined || mv.hold) tags.includes('CHARGE') || tags.push('CHARGE'); if (mv.armor) tags.push('ARMOR'); if (mv.heavy && !tags.includes('HEAVY')) tags.push('HEAVY'); if (mv.agile && !tags.includes('AGILE')) tags.push('AGILE'); if (mv.counter) tags.push('COUNTER');
    }
    const info = key === 'burst' ? BURST_INFO[fid] : spec ? SPEC_INFO[fid][key] : GENERIC_INFO[key] || '';
    return { key, cat, input, title, seq, dmg: Math.round(dmg), tags, info, gen: spec || key === 'burst' ? cat === 'BURST' ? 'Rift Burst' : ({ nspec: 'Neutral special', sspec: 'Side special', uspec: 'Up special', dspec: 'Down special' })[key] : gen };
  });
}
const _mvRows = {};
function mvRows(fid) { return _mvRows[fid] || (_mvRows[fid] = moveRowsFor(fid)); }
function movesUpdate(overlay) {
  const G = Game; if (G.mvChar === undefined) G.mvChar = 0; if (G.mvIdx === undefined) G.mvIdx = 0;
  const rows = mvRows(G.mvChar), d = anyDir();
  if (d === 'up') { G.mvIdx = (G.mvIdx + rows.length - 1) % rows.length; G.mvT = 0; Audio2.play('cursor'); }
  if (d === 'down') { G.mvIdx = (G.mvIdx + 1) % rows.length; G.mvT = 0; Audio2.play('cursor'); }
  if (d === 'left') { G.mvChar = (G.mvChar + 3) % 4; G.mvT = 0; Audio2.play('blip'); }
  if (d === 'right') { G.mvChar = (G.mvChar + 1) % 4; G.mvT = 0; Audio2.play('blip'); }
  if (G.clickPick !== undefined) { if (G.clickPick >= 100) G.mvChar = G.clickPick - 100; else G.mvIdx = G.clickPick; G.mvT = 0; G.clickPick = undefined; }
  G.mvT = (G.mvT || 0) + 1;
  const back = anyBack() || (overlay && (KeysPressed['Escape'] || localSources().some(s => s.cur.pp)));
  if (back) { if (overlay) G.pauseMoves = 0; else G.setScene('mode'); return true; }
  return false;
}
function movesDraw(overlay) {
  const G = Game; if (G.mvChar === undefined) G.mvChar = 0; if (G.mvIdx === undefined) G.mvIdx = 0;
  if (overlay) { ctx.fillStyle = 'rgba(10,6,20,0.88)'; ctx.fillRect(0, 0, W, H); } else drawTitleBG();
  const fid = G.mvChar, F = FIGHTERS[fid], rows = mvRows(fid), row = rows[G.mvIdx] || rows[0];
  T('MOVE LIST', 60, 66, 40, null, { align: 'left', stroke: 9, grad: ['#fff7c2', '#ffb02c'] });
  // fighter tabs
  FIGHTERS.forEach((f, i) => {
    const x = 470 + i * 190, sel = i === fid; slant(x, 28, 176, 52, 12); ctx.fillStyle = sel ? f.color : 'rgba(30,22,54,0.92)'; ctx.fill(); ctx.lineWidth = sel ? 3 : 1.5; ctx.strokeStyle = sel ? '#fff' : 'rgba(255,255,255,0.18)'; ctx.stroke();
    drawPortrait(ctx, i, x + 34, 54, 20); T(f.name, x + 64, 63, 22, sel ? '#fff' : '#bfb4d8', { align: 'left', stroke: sel ? 5 : 0, shadow: sel });
    clickRegions().push({ x, y: 28, w: 176, h: 52, fn: () => { Game.clickPick = 100 + i; } });
  });
  // list
  const lx = 50, ly = 100, lw = 470, rh = 29.5; glass(lx, ly, lw, rows.length * rh + 20, F.color, 16, 0.9);
  rows.forEach((r, i) => {
    const y = ly + 12 + i * rh, sel = i === G.mvIdx;
    if (sel) { slant(lx + 8, y, lw - 22, rh - 2, 8); const g = ctx.createLinearGradient(lx, 0, lx + lw, 0); g.addColorStop(0, '#ff4fd8'); g.addColorStop(1, '#8a3cff'); ctx.fillStyle = g; ctx.fill(); }
    T(r.cat, lx + 34, y + 20, 11, sel ? '#fff' : CAT_COL[r.cat], { align: 'left', stroke: 0, shadow: false, weight: 800 });
    T(r.title, lx + 112, y + 21, 17, sel ? '#fff' : '#e8e2f5', { align: 'left', stroke: sel ? 4 : 0, shadow: sel });
    T(r.gen && r.gen !== r.title ? r.gen : '', lx + lw - 30, y + 20, 12, sel ? '#ffe9f8' : '#9a8fb8', { align: 'right', stroke: 0, shadow: false, weight: 600 });
    clickRegions().push({ x: lx, y, w: lw, h: rh, fn: () => { Game.clickPick = i; } });
  });
  // preview
  const px = 560, py = 100, pw = 670, ph = 330; glass(px, py, pw, ph, F.color, 20, 0.9);
  ctx.save(); slant(px, py, pw, ph, 20); ctx.clip();
  const gy = py + ph - 46; ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(px, gy, pw, 3);
  let pose = menuIdlePose(fid, World.frame), rot = 0, lift = 0, active = false, expr = 0;
  if (row.seq.length) {
    const tot = row.seq.reduce((a, m) => a + m.d, 0) + 34; let t = ((G.mvT || 0) * 0.8) % tot, mv = null;
    for (const m of row.seq) { if (t < m.d) { mv = m; break; } t -= m.d; }
    if (mv) {
      pose = kfPose(mv.kf, t); const hb = (mv.hb || []).filter(h => !h.orb);
      if (hb.length) { const s0 = Math.min(...hb.map(h => h.s)), e1 = Math.max(...hb.map(h => h.e)); active = t >= s0 && t <= e1 + 1; if (mv.flip) rot = -easeOutQ(clamp((t - mv.flip[0]) / (mv.flip[1] - mv.flip[0]), 0, 1)) * TAU; else if (mv.spin) rot = clamp((t - s0) / Math.max(1, e1 - s0), 0, 1) * TAU * 2; }
      if (mv.air || row.key === 'uspec') lift = 56;
    }
  } else { const w = Math.sin(World.frame * 0.2); pose = P(0, -26 + w, 0, 12, -20 + w * 2, -12, -20 - w * 2, 8, 26 - w, -8, 26 - w, -90); if (World.frame % 3 === 0) FX2D.push({ x: px + pw / 2 + rr(-60, 60), y: gy - rr(0, 150), life: 20, c: `hsl(${(World.frame * 9) % 360},100%,70%)` }); }
  const cx = px + pw / 2 - 30, s = 2.3;
  if (active) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gg = ctx.createRadialGradient(cx + 60, gy - lift - 80, 10, cx + 60, gy - lift - 80, 190); gg.addColorStop(0, rgba(F.color, 0.38)); gg.addColorStop(1, rgba(F.color, 0)); ctx.fillStyle = gg; ctx.fillRect(px, py, pw, ph); ctx.restore(); }
  if (lift) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(cx, gy + 2, 40, 9, 0, 0, TAU); ctx.fill(); }
  ctx.save(); if (rot) { const cy = gy - lift - 28 * s; ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-cx, -cy); }
  drawFighterArt(fid, cx, gy - lift, 1, s, pose); ctx.restore();
  for (const q of FX2D) { ctx.globalAlpha = q.life / 20; ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x, q.y -= 1.2, 3, 0, TAU); ctx.fill(); q.life--; } ctx.globalAlpha = 1; for (let i = FX2D.length - 1; i >= 0; i--) if (FX2D[i].life <= 0) FX2D.splice(i, 1);
  if (active) T('HIT!', px + pw - 70, py + 46, 22, '#ffe14a', { stroke: 5 });
  ctx.restore();
  // details
  const dx = 560, dy = 446, dw = 670, dh = 216; glass(dx, dy, dw, dh, CAT_COL[row.cat], 18, 0.9);
  T(row.title, dx + 46, dy + 46, 32, '#fff', { align: 'left', stroke: 7 });
  T(row.gen && row.gen !== row.title ? row.gen.toUpperCase() : row.cat, dx + dw - 40, dy + 40, 14, CAT_COL[row.cat], { align: 'right', stroke: 4, weight: 800 });
  T(row.input, dx + 44, dy + 82, 19, '#ffd23c', { align: 'left', stroke: 4 });
  UI.wrap(row.info, dx + 42, dy + 114, dw - 90, 16, '#e8e2f5');
  let tx = dx + 38; const chips = (row.dmg ? [row.dmg + '% DAMAGE'] : []).concat(row.tags);
  for (const c of chips) { ctx.font = `800 13px ${FONT}`; const w = ctx.measureText(c).width + 26; slant(tx, dy + dh - 48, w, 28, 7); ctx.fillStyle = c.endsWith('DAMAGE') ? 'rgba(255,210,60,0.22)' : 'rgba(255,255,255,0.12)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.stroke(); T(c, tx + w / 2 + 3, dy + dh - 29, 13, c.endsWith('DAMAGE') ? '#ffe9a0' : '#fff', { stroke: 0, shadow: false, weight: 800 }); tx += w + 8; }
  T('▲ ▼ move     ◀ ▶ fighter     SPECIAL back', W / 2, 700, 15, '#cfc6e6', { stroke: 4 });
}
const FX2D = [];

// ---------- RECORDS & FEATS ----------
const FEATS = [
  { id: 'first', n: 'First Steps', d: 'Finish any run', r: 20, t: () => true },
  { id: 'gate', n: 'Gate Crasher', d: 'Defeat The Gatekeeper', r: 30, t: s => s.bosses >= 1 },
  { id: 'hive', n: 'Exterminator', d: 'Defeat the Hive Matriarch', r: 50, t: s => s.bosses >= 2 },
  { id: 'crown', n: 'Crownbreaker', d: 'Clear the rift', r: 100, t: s => s.win },
  { id: 'fast', n: 'Rift Runner', d: 'Clear the rift in under 25 minutes', r: 100, t: s => s.win && s.time < 25 * 3600 },
  { id: 'clean', n: 'Sure-Footed', d: 'Clear the rift with no one KO\'d more than twice', r: 120, t: s => s.win && (s.ps || []).every(p => (p[6] | 0) <= 2) },
  { id: 'w0', n: "Rook's Triumph", d: 'Clear the rift with Rook on the team', r: 40, t: s => s.win && (s.ps || []).some(p => p[0] === 0) },
  { id: 'w1', n: "Vela's Triumph", d: 'Clear the rift with Vela on the team', r: 40, t: s => s.win && (s.ps || []).some(p => p[0] === 1) },
  { id: 'w2', n: "Pip's Triumph", d: 'Clear the rift with Pip on the team', r: 40, t: s => s.win && (s.ps || []).some(p => p[0] === 2) },
  { id: 'w3', n: "Grom's Triumph", d: 'Clear the rift with Grom on the team', r: 40, t: s => s.win && (s.ps || []).some(p => p[0] === 3) },
  { id: 'roster', n: 'Full Roster', d: 'Clear the rift with all four fighters', r: 100, t: (s, R) => [0, 1, 2, 3].every(i => R.by[i] > 0) },
  { id: 'k500', n: 'Riftsweeper', d: 'Defeat 500 enemies in total', r: 40, t: (s, R) => R.kills >= 500 },
  { id: 'k2500', n: 'Legion Breaker', d: 'Defeat 2,500 enemies in total', r: 120, t: (s, R) => R.kills >= 2500 },
  { id: 'combo', n: 'Combo Fiend', d: 'Land a 10-hit combo', r: 30, t: s => (s.ps || []).some(p => (p[3] | 0) >= 10) },
  { id: 'parry', n: 'Perfect Guard', d: 'Parry 5 attacks in one run', r: 40, t: s => (s.ps || []).some(p => (p[5] | 0) >= 5) },
  { id: 'duo', n: 'Better Together', d: 'Finish a run with a partner', r: 20, t: s => (s.ps || []).length >= 2 },
  { id: 'trio', n: "Three's a Party", d: 'Finish a run with three players', r: 30, t: s => (s.ps || []).length >= 3 },
  { id: 'end5', n: 'Into the Deep', d: 'Reach Endless depth 5', r: 60, t: s => s.endless >= 5 },
  { id: 'heat1', n: 'Feeling the Heat', d: 'Clear the rift on Heat 1 or higher', r: 80, t: s => s.win && (s.heat | 0) >= 1 },
  { id: 'heat5', n: 'Inferno', d: 'Clear the rift on Heat 5', r: 300, t: s => s.win && (s.heat | 0) >= 5 },
];
function recOf() { const d = Meta.d; d.rec = d.rec || { kills: 0, wins: 0, by: {}, endless: 0, time: 0, frames: 0 }; d.rec.by = d.rec.by || {}; d.feats = d.feats || {}; return d.rec; }
// called once per finished run on every machine; returns the shards paid out by newly earned feats
function recordRun(st0) {
  const st = st0.won && !st0.win ? Object.assign(Object.create(st0), { win: 1 }) : st0; // a run that went on into Endless still counts as a clear
  const R = recOf(); R.kills += st.kills | 0; R.frames = (R.frames | 0) + (st.time | 0); R.endless = Math.max(R.endless | 0, st.endless | 0);
  if (st.win) { R.wins = (R.wins | 0) + 1; if (st0.win && (!R.time || st.time < R.time)) R.time = st.time; for (const p of st.ps || []) R.by[p[0]] = (R.by[p[0]] | 0) + 1; R.heatWon = Math.max(R.heatWon ?? -1, st.heat | 0); const was = Meta.d.heatMax | 0; Meta.d.heatMax = Math.max(was, Math.min(5, (st.heat | 0) + 1)); if (Meta.d.heatMax > was) st0._heatUp = Meta.d.heatMax; }
  let bonus = 0; st0._feats = [];
  for (const f of FEATS) { if (Meta.d.feats[f.id]) continue; let ok = false; try { ok = !!f.t(st, R); } catch (e) { } if (ok) { Meta.d.feats[f.id] = 1; bonus += f.r; st0._feats.push(f); } }
  return bonus;
}
function recordsUpdate() { if (anyOK() || anyBack() || Game.clickPick !== undefined) { Game.clickPick = undefined; Game.setScene('mode'); } }
function recordsDraw() {
  drawTitleBG(); const R = recOf(), d = Meta.d; T('RECORDS', 60, 70, 46, null, { align: 'left', stroke: 9, grad: ['#fff7c2', '#ffb02c'] });
  glass(40, 96, 400, 560, '#5ab4ff', 18, 0.9);
  const rows = [['Runs played', d.runs | 0], ['Rift clears', R.wins | 0], ['Best clear time', R.time ? fmtTime(R.time) : (Game.best && Game.best.time ? fmtTime(Game.best.time) : '—')], ['Deepest Endless', R.endless || (Game.best && Game.best.endless) || '—'], ['Enemies defeated', (R.kills | 0).toLocaleString()], ['Time in the rift', Math.floor((R.frames | 0) / 216000) + 'h ' + Math.floor((R.frames | 0) / 3600 % 60) + 'm'], ['Rift Shards earned', (d.total | 0).toLocaleString()], ['Highest Heat cleared', R.heatWon >= 0 ? R.heatWon : '—']];
  rows.forEach(([k, v], i) => { const y = 142 + i * 39; T(k, 84, y, 17, '#cfc6e6', { align: 'left', stroke: 0, shadow: false, weight: 600 }); T(String(v), 404, y, 20, '#fff', { align: 'right', stroke: 4 }); });
  T('CLEARS BY FIGHTER', 240, 468, 14, '#9fd8ff', { stroke: 3, weight: 800 });
  FIGHTERS.forEach((f, i) => { const x = 96 + i * 92; drawPortrait(ctx, i, x, 540, 24); T(String(R.by[i] | 0), x, 592, 22, R.by[i] ? '#fff' : '#7a6f98', { stroke: 4 }); T(f.name, x, 614, 11, f.color, { stroke: 0, shadow: false, weight: 800 }); });
  const n = FEATS.filter(f => d.feats[f.id]).length; T('FEATS  ' + n + ' / ' + FEATS.length, 470, 122, 22, '#ffd23c', { align: 'left', stroke: 5 });
  FEATS.forEach((f, i) => {
    const col = i % 2, row = Math.floor(i / 2), x = 462 + col * 392, y = 138 + row * 51, got = !!d.feats[f.id];
    slant(x, y, 380, 45, 10); ctx.fillStyle = got ? 'rgba(74,47,122,0.95)' : 'rgba(24,17,42,0.9)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = got ? 'rgba(255,210,60,0.75)' : 'rgba(255,255,255,0.12)'; ctx.stroke();
    if (got) drawStar5(ctx, x + 32, y + 23, 10, '#ffd23c'); else { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 32, y + 23, 8, 0, TAU); ctx.stroke(); }
    T(f.n, x + 54, y + 20, 16, got ? '#fff' : '#a79cc4', { align: 'left', stroke: got ? 3 : 0, shadow: false }); T(f.d, x + 54, y + 37, 11.5, got ? '#d8d0ea' : '#8177a0', { align: 'left', stroke: 0, shadow: false, weight: 600, italic: false });
    T((got ? '✓ ' : '◆ ') + f.r, x + 364, y + 29, 14, got ? '#7dff8a' : '#9fd8ff', { align: 'right', stroke: 0, shadow: false, weight: 800 });
  });
  T('press any button to return', W / 2, 700, 15, '#cfc6e6', { stroke: 4 });
  clickRegions().push({ x: 0, y: 0, w: W, h: H, fn: () => { Game.clickPick = 0; } });
}
// newly earned feats (and a new Heat level) on the results screen
function drawFeatToasts(s) {
  const list = (s._feats || []).map(f => ['FEAT', f.n, '+' + f.r]); if (s._heatUp) list.unshift(['UNLOCKED', 'Rift Heat ' + s._heatUp, 'main menu']);
  if (!list.length) return; const show = list.slice(0, 5), k = clamp((Game.t - 50) / 20, 0, 1); if (k <= 0) return;
  show.forEach(([tag, name, r], i) => {
    const kk = easeOut(clamp((Game.t - 50 - i * 8) / 18, 0, 1)), w = 320, x = W - 26 - w * kk, y = 96 + i * 44; ctx.globalAlpha = kk;
    slant(x, y, w, 38, 10); ctx.fillStyle = 'rgba(54,34,92,0.96)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffd23c'; ctx.stroke(); drawStar5(ctx, x + 28, y + 19, 9, '#ffd23c');
    T(tag, x + 48, y + 16, 10, '#ffd23c', { align: 'left', stroke: 0, shadow: false, weight: 800 }); T(name, x + 48, y + 32, 16, '#fff', { align: 'left', stroke: 3, shadow: false }); T(r, x + w - 18, y + 26, 14, '#9fd8ff', { align: 'right', stroke: 0, shadow: false, weight: 800 });
  });
  ctx.globalAlpha = 1; if (list.length > 5) T('+' + (list.length - 5) + ' more in RECORDS', W - 186, 96 + 5 * 44 + 18, 13, '#cfc6e6', { stroke: 3 });
}

// ---------- tips in play: the basics, one at a time, during a new player's first stages ----------
const HINT_KEYS = {
  kb1: { move: 'W A S D', j: 'SPACE', a: 'F', b: 'G', s: 'H', m: 'R' }, kb2: { move: 'ARROWS', j: 'M', a: ',', b: '.', s: '/', m: ';' },
  pad: { move: 'LEFT STICK', j: 'X / Y', a: 'A', b: 'B', s: 'L / R', m: 'RIGHT STICK' },
};
const HINTS = [
  { txt: K => ['Move with', K.move, 'and jump with', K.j], done: (p, H) => Math.abs(p.x - H.x0) > 140 && H.jumped },
  { txt: K => ['ATTACK with', K.a, '— hold a direction for a different attack'], done: (p, H) => H.n.atk >= 3 },
  { txt: K => ['Hold a direction and press', K.m, 'for a SMASH attack. Hold it to charge.'], done: (p, H) => H.n.smash >= 1, pad: K => ['Flick the', K.m, 'for a SMASH attack. Hold it to charge.'] },
  { txt: K => ['SPECIAL moves are on', K.b, '— try it with each direction'], done: (p, H) => H.n.spec >= 2 },
  { txt: K => ['Hold', K.s, 'to SHIELD. Tap a direction while shielding to dodge.'], done: (p, H) => H.n.shield >= 1 },
  { txt: () => ['The more damage a foe has taken, the farther your hits send them. Launch them off the screen!'], done: (p, H) => H.t > 420, wide: 1 },
  { txt: K => ['Knocked off the stage? Jump again in mid-air, then press up +', K.b, 'to recover.'], done: (p, H) => H.t > 480 },
  { txt: K => ['When the meter under your portrait is full, press', K.s, '+', K.b, 'for your RIFT BURST.'], done: (p, H) => H.t > 540 || H.n.burst },
];
function hintState() {
  const G = Game; if (!Opt.hints || Meta.d.tut || !G.run || G.run.training || (G.run.idx | 0) > 2 || !World.stage || World.stage.training) return null;
  const i = Net.isGuest ? Math.max(0, G.slots.findIndex(s => s && s.mine)) : 0, p = World.players[i], sl = G.slots[i]; if (!p || !sl) return null;
  const H = G._hint || (G._hint = { i: 0, t: 0, x0: p.x, n: { atk: 0, smash: 0, spec: 0, shield: 0 }, jumped: 0, fade: 0, last: '' });
  return { H, p, K: HINT_KEYS[sl.dev && sl.dev.startsWith('kb') ? sl.dev : 'pad'] || HINT_KEYS.pad, pad: !(sl.dev && sl.dev.startsWith('kb')) };
}
function drawHints() {
  const G = Game, S = hintState(); if (!S || (G.countT | 0) > 0 || G.bossIntro || G.paused) return; const { H, p, K, pad } = S;
  // watch what the player does (render-side, so it works for online guests too)
  const st = p.state + (p.move ? ':' + p.move.name : '');
  if (st !== H.last) { H.last = st; if (p.state === 'move' && p.move) { if (p.move.special) H.n.spec++; else if (p.move.smash) H.n.smash++; else H.n.atk++; } if (p.state === 'shield' || p.state === 'roll' || p.state === 'spot') H.n.shield++; }
  if (p.air) H.jumped = 1; if (World.freezeT > 0 && World.burster === p) H.n.burst = 1;
  const h = HINTS[H.i]; if (!h) { Meta.d.tut = 1; Meta.save(); return; }
  H.t++; H.fade = Math.min(1, H.fade + 0.06);
  if (H.t > 50 && (h.done(p, H) || H.t > 1500)) { H.doneT = (H.doneT | 0) + 1; if (H.doneT === 1) Audio2.play('confirm', 0.5); if (H.doneT > 34) { H.i++; H.t = 0; H.doneT = 0; H.fade = 0; H.x0 = p.x; } }
  const parts = (pad && h.pad ? h.pad : h.txt)(K), ok = (H.doneT | 0) > 0, y = 96, a = H.fade * (ok ? Math.max(0, 1 - (H.doneT - 14) / 20) : 1);
  ctx.save(); ctx.globalAlpha = a; ctx.font = `700 18px ${FONT}`;
  const ws = parts.map((s, i) => i % 2 ? ctx.measureText(s).width + 22 : ctx.measureText(s).width), tot = ws.reduce((x, w) => x + w + 9, 0) + 60, x0 = W / 2 - tot / 2;
  slant(x0, y, tot, 44, 12); ctx.fillStyle = ok ? 'rgba(30,90,50,0.92)' : 'rgba(26,18,48,0.9)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = ok ? '#7dff8a' : 'rgba(255,210,60,0.8)'; ctx.stroke();
  let x = x0 + 34; T(ok ? '✓' : 'TIP', x - 6, y + 29, ok ? 20 : 11, ok ? '#7dff8a' : '#ffd23c', { stroke: 0, shadow: false, weight: 800 }); x += 18;
  parts.forEach((s, i) => {
    if (i % 2) { ctx.fillStyle = '#ffd23c'; slant(x, y + 9, ws[i], 26, 5); ctx.fill(); T(s, x + ws[i] / 2 + 2, y + 28, 16, '#241640', { stroke: 0, shadow: false, weight: 800, italic: false }); }
    else T(s, x, y + 29, 17, '#fff', { align: 'left', stroke: 0, shadow: false, weight: 600, italic: false });
    x += ws[i] + 9;
  });
  ctx.restore();
}
