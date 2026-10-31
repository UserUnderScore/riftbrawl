// ===== PROCEDURAL STAGES =====
const BIOMES = {
  ruins: { name: 'Ashen Ruins', sky: ['#efe6d8', '#d9c9b2'], far: '#cbb89c', mid: '#b49f82', ground: '#3a3330', top: '#5a4e48', plat: '#6b5d55', acc: '#e07a5f', deco: 'columns' },
  garden: { name: 'Sky Garden', sky: ['#dff2ee', '#b8e0d8'], far: '#a6d3c8', mid: '#86bfae', ground: '#2f3b37', top: '#4d6b5e', plat: '#5e7f70', acc: '#f2cc8f', deco: 'trees' },
  foundry: { name: 'Clockwork Foundry', sky: ['#e8e1d9', '#c9bdb0'], far: '#b5a594', mid: '#9a8775', ground: '#2c2a2a', top: '#5b4f45', plat: '#7a6a5a', acc: '#ff9f43', deco: 'gears' },
  crystal: { name: 'Crystal Depths', sky: ['#dfe3f2', '#bcc4e3'], far: '#a7b0d6', mid: '#8a93c2', ground: '#262838', top: '#4a4f73', plat: '#5c6290', acc: '#7df9ff', deco: 'crystals' },
  frost: { name: 'Frost Peaks', sky: ['#eef4f8', '#cfdde8'], far: '#bccddb', mid: '#a1b6c8', ground: '#2b3440', top: '#e9f1f7', plat: '#9fb3c4', acc: '#9cc8ff', deco: 'peaks' },
  void: { name: 'Void Rift', sky: ['#2a2238', '#120d1c'], far: '#3a2c50', mid: '#4b3666', ground: '#0d0a14', top: '#7a3cff', plat: '#5a2fa0', acc: '#ff3cd5', deco: 'shards' },
};
const ACT_BIOMES = [['ruins', 'garden'], ['foundry', 'crystal'], ['frost', 'void']];
const MODIFIERS = {
  lowgrav: { name: 'Low Gravity', desc: 'Everyone floats a little higher.' },
  wind: { name: 'Gale', desc: 'A strong wind pushes across the stage.' },
  glass: { name: 'Glass Bones', desc: 'Players take 40% more damage.' },
  dark: { name: 'Darkness', desc: 'Light only surrounds the fighters.' },
  elite: { name: 'Elite Surge', desc: 'Far more elite enemies appear.' },
  meteor: { name: 'Meteor Shower', desc: 'Rocks fall from the sky during fights.' },
};
const POOL_BY_STAGE = [
  ['shade', 'spitter', 'flit', 'bomber'],
  ['shade', 'spitter', 'flit', 'bomber', 'hopper', 'lancer'],
  ['shade', 'spitter', 'flit', 'bomber', 'hopper', 'lancer', 'shieldbearer'],
  ['shade', 'spitter', 'flit', 'bomber', 'hopper', 'lancer', 'shieldbearer', 'brute', 'sniper'],
  ENEMY_TYPES,
];
const ELITES = ['giant', 'swift', 'volatile', 'warded'];

function genStage(seed, idx, kind, opts = {}) {
  // kind: 'normal' | 'boss:<name>'
  const R = SRng(seed);
  const act = Math.min(2, Math.floor((idx) / 4));
  const biomeKey = opts.biome || (opts.endless ? R.pick(Object.keys(BIOMES)) : R.pick(ACT_BIOMES[act]));
  const B = BIOMES[biomeKey];
  const st = { seed, idx, kind, biome: biomeKey, B, solids: [], plats: [], ledges: [], arenas: [], spawns: [], events: [], deco: [], x0: 0, x1: 0, killY: 0, mods: opts.mods || [] };
  const G = 600; let x = 0, gy = G;
  const solid = (x, y, w, h = 900) => { const s = { x, y, w, h, solid: true }; st.solids.push(s); return s; };
  const plat = (x, y, w) => st.plats.push({ x, y, w });
  const pool = POOL_BY_STAGE[Math.min(POOL_BY_STAGE.length - 1, Math.floor(idx / 2))];
  const roam = (x0, x1, y, n) => { for (let i = 0; i < n; i++) st.spawns.push({ type: R.pick(pool.filter(t => t !== 'warlock')), x: R.r(x0, x1), y: y - 5 }); };
  // start
  solid(-200, G, 700); x = 500;
  const segs = {
    flat(len) { solid(x, gy, len); if (R.chance(0.6)) plat(x + R.r(60, len - 200), gy - R.r(110, 150), R.r(120, 180)); roam(x + 80, x + len - 80, gy, R.i(1, 2)); x += len; },
    gap(len) { const pre = R.r(140, 220); solid(x, gy, pre); x += pre; const gap = R.r(180, 280); const ny = clamp(gy + R.pick([-60, 0, 0, 60]), G - 160, G + 80);
      if (gap > 220 || R.chance(0.5)) plat(x + gap / 2 - 60, Math.min(gy, ny) - R.r(60, 120), 120);
      x += gap; gy = ny; solid(x, gy, len - pre); roam(x + 40, x + len - pre - 40, gy, R.i(0, 2)); x += len - pre; },
    steps(len) { const n = R.i(3, 4); const w = len / n; for (let i = 0; i < n; i++) { gy = clamp(gy + R.pick([-70, -50, 50, 70]), G - 180, G + 80); solid(x, gy, w + 1); x += w; } roam(x - len + 60, x - 60, gy, R.i(1, 2)); },
    pillars(len) { solid(x, gy, len); const n = R.i(1, 2); for (let i = 0; i < n; i++) { const px = x + (i + 1) * len / (n + 1) - 40; const h = R.r(80, 150); solid(px, gy - h, 80, h); } plat(x + len / 2 - 70, gy - 220, 140); roam(x + 40, x + len - 40, gy, R.i(1, 2)); x += len; },
    islands(len) { const pre = 160; solid(x, gy, pre); x += pre; const n = R.i(2, 3); const span = len - pre * 2; const w = span / n;
      for (let i = 0; i < n; i++) { const iy = gy + R.r(-80, 40); const iw = R.r(110, 170); const s = solid(x + i * w + (w - iw) / 2 + 40, iy, iw, 40); } x += span + 80; solid(x, gy, pre); x += pre; },
  };
  const travel = n => { for (let i = 0; i < n; i++) { const k = R.pick(['flat', 'gap', 'steps', 'pillars', 'islands', 'gap']); segs[k](R.r(520, 760)); } };
  const arena = (len, waves, layout) => {
    gy = G; const l = x + 40; solid(x, gy, len + 80);
    const lay = layout || R.pick(['tri', 'duo', 'stack', 'pit', 'bridge']);
    if (lay === 'tri') { plat(l + len * 0.15, gy - 130, 180); plat(l + len * 0.5 - 90, gy - 240, 180); plat(l + len * 0.85 - 180, gy - 130, 180); }
    if (lay === 'duo') { plat(l + len * 0.22, gy - 150, 220); plat(l + len * 0.78 - 220, gy - 150, 220); }
    if (lay === 'stack') { plat(l + len * 0.5 - 130, gy - 130, 260); plat(l + len * 0.5 - 90, gy - 250, 180); }
    if (lay === 'pit') { // pit in the middle with floating platform (ledges!)
      st.solids.pop(); const pw = 220; const a = (len + 80 - pw) / 2; solid(x, gy, a); solid(x + a + pw, gy, a); plat(x + a + 30, gy - 120, pw - 60); }
    if (lay === 'bridge') { solid(l + len * 0.5 - 80, gy - 160, 160, 26); plat(l + 60, gy - 120, 160); plat(l + len - 220, gy - 120, 160); }
    const A = { l, r: l + len, trig: l + 120, waves, floor: gy, done: false };
    st.arenas.push(A); x += len + 80; return A;
  };
  const wave = (n) => { const w = []; const eliteP = 0.05 + idx * 0.03 + (st.mods.includes('elite') ? 0.3 : 0) + (opts.endless ? 0.15 : 0);
    for (let i = 0; i < n; i++) w.push({ type: R.pick(pool), elite: R.chance(eliteP) ? R.pick(ELITES) : null, side: R.f() }); return w; };
  const nP = opts.players || 1;
  const wsize = () => Math.round((3 + Math.floor(idx * 0.45) + R.i(0, 2)) * (nP > 1 ? 1.35 : 1) * (opts.endless ? 1.2 : 1));
  if (kind === 'normal') {
    travel(R.i(1, 2));
    // event room
    const evx = x + 60; solid(x, gy, 380); st.events.push({ type: R.pick(['chest', 'spring', 'chest', 'elite']), x: x + 190, y: gy }); x += 380;
    const nw = idx >= 5 || opts.endless ? 3 : 2;
    arena(R.r(1000, 1200), Array.from({ length: nw }, () => wave(wsize())));
    travel(R.i(1, 2));
    arena(R.r(1000, 1200), Array.from({ length: nw }, () => wave(wsize())));
    if (idx >= 8 || opts.endless) { travel(1); arena(R.r(1000, 1200), Array.from({ length: 2 }, () => wave(wsize()))); }
    solid(x, G, 600); st.goal = { x: x + 300, y: G }; x += 600;
  } else {
    const boss = kind.split(':')[1];
    solid(x, G, 200); x += 200;
    const A = arena(1250, [[{ type: boss, boss: 1 }]], boss === 'crown' ? 'tri' : boss === 'matriarch' ? 'duo' : 'stack');
    st.arenaFloor = A.floor; st.bossArena = A;
    solid(x, G, 600); st.goal = { x: x + 300, y: G }; x += 600;
  }
  st.x0 = -200; st.x1 = x; st.killY = G + 520;
  // ledges
  for (const s of st.solids) {
    const exposedL = !solidAtList(st.solids, s.x - 3, s.y + 30) && !solidAtList(st.solids, s.x + 3, s.y - 3);
    const exposedR = !solidAtList(st.solids, s.x + s.w + 3, s.y + 30) && !solidAtList(st.solids, s.x + s.w - 3, s.y - 3);
    if (exposedL && s.x > st.x0 + 10) st.ledges.push({ x: s.x, y: s.y, dir: -1 });
    if (exposedR && s.x + s.w < st.x1 - 10) st.ledges.push({ x: s.x + s.w, y: s.y, dir: 1 });
  }
  // deco
  for (let dx = -400; dx < x + 400; dx += R.r(120, 260)) st.deco.push({ x: dx, s: R.r(0.6, 1.4), layer: R.pick([0, 1, 1]), v: R.f() });
  return st;
}
function solidAtList(list, x, y) { for (const s of list) if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true; return false; }
