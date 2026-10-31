// ===== ONLINE CO-OP (host-authoritative, via the artifact `room` capability presence) =====
const ALL_ETYPES = [...Object.keys(ENEMY), ...Object.keys(BOSS)];
const PTYPES = Object.keys(PROJ);
const STATES = ['idle', 'run', 'crouch', 'squat', 'land0', 'land', 'air', 'helpless', 'move', 'shield', 'roll', 'spot', 'adodge', 'shieldbreak', 'hitstun', 'ledge'];
const R2 = v => Math.round(v);
const Net = {
  isHost: false, isGuest: false, room: null, r: null, code: '', status: '', ok: false, guestPeer: null, guestState: null, remote: null,
  evq: [], seq: 0, lastSeq: 0, hostP: null, guestScene: 'wait', hostPaused: false, sig: '', cnt: { a: 0, b: 0, j: 0, s: 0, m: 0, p: 0, c: 0 }, pf: 0, pfy: 0, lastPres: null,
  async getRoom() {
    if (this.room) return this.room;
    if (typeof Peer !== 'undefined' && typeof PeerRoom !== 'undefined') { this.room = PeerRoom; return this.room; }
    if (!window.claude || !window.claude.use) { this.status = 'Online play is not available in this copy of the game.'; return null; }
    try { this.room = await window.claude.use('room'); } catch (e) { this.room = null; }
    if (!this.room) this.status = 'Online co-op is not available to this account here. The host must invite you directly (public links do not work), and some accounts outside the host organization cannot join live rooms.';
    return this.room;
  },
  async host() {
    this.leave(); this.isHost = true; this.ok = false; this.guestPeer = null; this.guestState = null; this.remote = new RemoteInput();
    this.code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[ri(0, 23)]).join(''); this.status = 'Connecting…';
    const room = await this.getRoom(); if (!room) return;
    try {
      for (let tries = 0; ; tries++) {
        try { this.r = await room.join('rb-' + this.code.toLowerCase(), { host: true }); break; }
        catch (e) { if (e && e.code === 'taken' && tries < 4) { this.code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[ri(0, 23)]).join(''); continue; } throw e; }
      }
      this.ok = true; this.status = 'Room open — waiting for your partner to join…';
      this.r.presence({ role: 'host', v: 1 }).catch(() => { });
      this.r.onPeers(ch => {
        const g = ch.peers.find(p => !p.sameTab && p.presence && p.presence.role === 'guest');
        if (g && !this.guestPeer) { UI.toast('Partner joined!'); Audio2.play('select'); }
        if (!g && this.guestPeer) { UI.toast('Partner disconnected'); const p2 = World.players[1]; if (p2) { p2.out = true; } }
        this.guestPeer = g ? g.peer : null;
      }, e => { this.status = 'Room error: ' + e.code; this.ok = false; });
    } catch (e) { this.status = 'Could not open room: ' + ((e && (e.message || e.code)) || 'error'); }
    this.wrapFX();
  },
  async join(code) {
    this.leave(); this.code = code; this.status = 'Connecting to ' + code + '…'; this.ok = false;
    const room = await this.getRoom(); if (!room) return;
    try {
      this.r = await room.join('rb-' + code.toLowerCase(), { host: false });
      this.ok = true; this.status = 'Connected — looking for host…'; this.isGuest = true; this.guestScene = 'wait'; this.sig = ''; this.lastSeq = 0;
      this.r.presence({ role: 'guest', in: [] }).catch(() => { });
      showJoinBox(false); Game.scene = 'wait';
      this.local = Devices.get(Game.primary || 'kb1');
      this.r.onPeers(ch => { const h = ch.peers.find(p => !p.sameTab && p.presence && p.presence.role === 'host'); if (!h && this.hostP) { UI.toast('Host left the game'); this.leave(); Game.setScene('title'); } this.hostP = h ? h.peer : null; });
      setTimeout(() => { if (this.isGuest && !this.hostP) this.status = 'No host found with code ' + code + ' (yet). Double-check the code.'; }, 6000);
    } catch (e) { this.status = 'Could not join: ' + ((e && (e.message || e.code)) || 'error'); }
  },
  leave() {
    if (this.r) { try { this.r.leave(); } catch (e) { } }
    this.r = null; this.isHost = false; this.isGuest = false; this.guestPeer = null; this.hostP = null; this.ok = false;
  },
  // capture FX + sounds on host so the guest can replay them
  wrapFX() {
    if (this.wrapped) return; this.wrapped = true;
    for (const k of ['burst', 'ring', 'hit', 'explode', 'text', 'ko', 'zap', 'portal', 'after', 'swarm', 'dissolve']) { const o = FX[k].bind(FX); FX[k] = (...a) => { if (Net.isHost && Game.scene === 'play') Net.pushEv(k, a); o(...a); }; }
    const op = Audio2.play.bind(Audio2); Audio2.play = (n, k) => { if (Net.isHost && Game.scene === 'play' && n !== 'charge') Net.pushEv('snd', [n, k || 0]); op(n, k); };
    const os = World.shake.bind(World); World.shake = a => { if (Net.isHost && a > 3) Net.pushEv('sh', [R2(a)]); os(a); };
  },
  pushEv(k, a) { this.evq.push([++this.seq, k, ...a.map(v => typeof v === 'number' ? Math.round(v * 10) / 10 : v)]); if (this.evq.length > 40) this.evq.shift(); },
  tick() {
    if (!this.r) return;
    this.tc = (this.tc || 0) + 1;
    if (this.isHost) {
      // read guest presence
      const g = this.r.peers().find(p => p.peer === this.guestPeer);
      if (g && g.presence !== this.lastPres) { this.lastPres = g.presence; this.guestState = g.presence; if (Array.isArray(g.presence.in)) this.remote.feed(g.presence.in); }
      if (this.tc % 2 === 0) this.r.presence({ role: 'host', s: this.snapshot() }).catch(() => { });
    } else if (this.isGuest) {
      const s = this.local.cur;
      for (const k of ['a', 'b', 'j', 's', 'm', 'p']) if (s[k + 'p']) this.cnt[k] = (this.cnt[k] + 1) % 1000;
      if (s.cp) this.cnt.c = (this.cnt.c + 1) % 1000;
      if (s.flick) this.pf = s.flick; if (s.flickY) this.pfy = s.flickY;
      if (this.tc % 2 === 0) {
        const inp = Game.localPause ? [0, 0, 0, 0, 0, this.cnt.a, this.cnt.b, this.cnt.j, this.cnt.s, this.cnt.m, this.cnt.p, this.cnt.c, 0, 0, 0] : [R2(s.mx * 100), R2(s.my * 100), R2(s.cx * 100), R2(s.cy * 100), (s.a ? 1 : 0) | (s.b ? 2 : 0) | (s.j ? 4 : 0) | (s.s ? 8 : 0) | (s.m ? 16 : 0) | (s.p ? 32 : 0) | (s.kb ? 64 : 0), this.cnt.a, this.cnt.b, this.cnt.j, this.cnt.s, this.cnt.m, this.cnt.p, this.cnt.c, this.pf, this.pfy, 0];
        this.pf = 0; this.pfy = 0;
        this.r.presence({ role: 'guest', in: inp, ch: Game.gch | 0, rdy: Game.grdy ? 1 : 0, bp: Game.gbp || 0 }).catch(() => { });
      }
    }
  },
  snapshot() {
    const G = Game; const s = { sc: G.scene === 'lobby' ? 'wait' : G.scene, pa: G.paused ? 1 : 0 };
    if (G.scene === 'charsel') s.cs = [G.csel[0] | 0, G.cready[0] ? 1 : 0];
    if (G.scene === 'over' && G.overStats) { const o = G.overStats; s.os = [o.win ? 1 : 0, o.stage, o.time, o.kills, o.endless]; }
    if (G.run && World.stage && ['play', 'boon', 'victory'].includes(G.scene)) {
      const R = G.run, st = World.stage;
      s.sg = [R.stageSeed, R.idx, World.players.length, (st.mods || []).join('.'), R.idx >= 12 ? 1 : 0, R.endless ? 1 : 0];
      const b = G.bossRef;
      s.hud = [G.teamStocks, R.time, R.kills, G.arenaI, G.waveI, World.barriers ? R2(World.barriers.l) : 0, World.barriers ? R2(World.barriers.r) : 0, st.arenas.reduce((m, a, i) => m | (a.done ? 1 << i : 0), 0), st.events.reduce((m, e, i) => m | (e.used ? 1 << i : 0), 0), G.stageT, b && !b.dead ? b.id : 0];
      s.pl = World.players.map(p => [p.def.id, R2(p.x), R2(p.y), p.face, STATES.indexOf(p.state), p.move ? p.move.name : '', p.mf, Math.floor(p.pct), (p.dead ? 1 : 0) | (p.out ? 2 : 0) | (p.air ? 4 : 0) | (p.tumble ? 8 : 0) | (p.hammerOut ? 16 : 0) | (p.mods.orb ? 32 : 0), R2(p.shieldHP), R2(p.chgT), p.sf % 1000, R2(p.mods.size * 100), Math.min(99, p.intang), R2(p.vy), p.jumps, p.boons.join('.')]);
      s.en = World.enemies.slice(0, 24).map(e => [e.id, ALL_ETYPES.indexOf(e.type), R2(e.x), R2(e.y), e.face, e.atk ? e.atkName : '', Math.floor(e.af), R2(e.hp / e.maxHp * 100), (e.dying ? 1 : 0) | (e.flash > 0 ? 2 : 0) | (e.hitstun > 0 ? 4 : 0) | (e.air ? 8 : 0) | (e.stunGuard ? 16 : 0) | (e.minion ? 32 : 0) | (Math.abs(e.vx) > 0.3 ? 64 : 0), e.elite ? ELITES.indexOf(e.elite) + 1 : 0, e.aim != null ? R2(e.aim * 100) : -999, R2(e.ward), e.dying | 0, e.spawnT | 0]);
      s.pr = World.projs.slice(0, 28).map(p => [PTYPES.indexOf(p.type), R2(p.x), R2(p.y), R2(p.vx * 10), R2(p.vy * 10), R2(p.r), p.t]);
      s.it = World.items.map(i => [i.type === 'food' ? 0 : 1, R2(i.x), R2(i.y)]);
      s.ev = this.evq.slice(-16);
      s.cm = [R2(World.cam.x), R2(World.cam.y), R2(World.cam.z * 100)];
    }
    if (G.scene === 'boon') { s.bo = [(G.boonOpts[1] || []).join('.'), G.boonPick[1] ? 1 : 0, G.boonPick[0] ? 1 : 0, (G.boonOpts[0] || []).join('.')]; }
    // keep within 4 KiB
    let js = JSON.stringify(s);
    if (js.length > 3800) { s.ev = s.ev.slice(-8); js = JSON.stringify(s); }
    if (js.length > 3800 && s.pr) { s.pr = s.pr.slice(0, 14); js = JSON.stringify(s); }
    if (js.length > 3800 && s.en) { s.en = s.en.slice(0, 16); js = JSON.stringify(s); }
    if (js.length > 3900) { s.ev = []; s.it = []; }
    return s;
  },
  // ---------- guest side ----------
  guestUpdate() {
    const G = Game; World.frame++;
    const h = this.r && this.r.peers().find(p => p.peer === this.hostP);
    const s = h && h.presence && h.presence.s;
    if (!s) { this.guestScene = 'wait'; if (this.hostP === null && this.ok) this.status = this.status.startsWith('No host') ? this.status : 'Connected — waiting for host…'; updateParticles(); return; }
    if (s !== this.lastS) { this.lastS = s; this.applySnap(s); }
    this.guestScene = ['title', 'mode', 'controls', 'remap', 'join', 'lobby'].includes(s.sc) ? 'wait' : s.sc; this.hostPaused = !!s.pa;
    if (this.guestScene === 'wait') this.status = 'Connected! Waiting for the host to start…';
    const src = this.local;
    // local guest UI
    if (s.sc === 'charsel') {
      G.mode = 'guest'; G.slots = [{ dev: 'net' }, { dev: src.dev, input: src }]; G.csel[0] = s.cs ? s.cs[0] : 0; G.cready[0] = !!(s.cs && s.cs[1]);
      if (G.gch === undefined) G.gch = 1;
      const d = menuDir(src);
      if (!G.grdy) { if (d === 'left') { G.gch = (G.gch + 3) % 4; Audio2.play('blip'); } if (d === 'right') { G.gch = (G.gch + 1) % 4; Audio2.play('blip'); } if (menuOK(src)) { G.grdy = true; Audio2.play('select'); } }
      else if (menuBack(src)) G.grdy = false;
      if (G.clickChar !== undefined) { if (!G.grdy) G.gch = G.clickChar; G.clickChar = undefined; }
      G.csel[1] = G.gch; G.cready[1] = !!G.grdy; G.t++;
    } else { G.grdy = false; }
    if (s.sc === 'boon' && s.bo) {
      const opts = s.bo[0] ? s.bo[0].split('.') : []; G.boonOpts = { 0: s.bo[3] ? s.bo[3].split('.') : [], 1: opts }; G.slots = [{ dev: 'net' }, { dev: src.dev }];
      G.boonPick[0] = s.bo[2] ? 'x' : null; if (G.boonIdx[1] === undefined) G.boonIdx[1] = 0;
      const key = (s.sg ? s.sg[1] : 0) + (s.sg && s.sg[5] ? 1000 : 0);
      if (s.bo[1]) G.boonPick[1] = G.boonPick[1] || opts[G.boonIdx[1]]; else if (G.gbpKey !== key) { G.boonPick[1] = null; G.gbp = 0; G.gbpKey = key; }
      if (!G.boonPick[1] && opts.length) {
        const d = menuDir(src); const n = opts.length;
        if (d === 'up' || d === 'left') G.boonIdx[1] = (G.boonIdx[1] + n - 1) % n; if (d === 'down' || d === 'right') G.boonIdx[1] = (G.boonIdx[1] + 1) % n;
        if (G.clickBoon && G.clickBoon[0] === 1) { G.boonIdx[1] = G.clickBoon[1]; G.clickBoon = null; G.gbp = [key, G.boonIdx[1]]; G.boonPick[1] = opts[G.boonIdx[1]]; Audio2.play('boon'); }
        else if (menuOK(src)) { G.gbp = [key, G.boonIdx[1]]; G.boonPick[1] = opts[G.boonIdx[1]]; Audio2.play('boon'); }
      }
    } else if (s.sc !== 'boon') { G.boonIdx = {}; G.boonPick = {}; }
    if (s.sc === 'play') {
      if (src.cur.pp) { G.localPause = !G.localPause; G.pauseIdx = 0; }
      if (G.localPause) { const d = menuDir(src); if (d === 'up' || d === 'down') G.pauseIdx = 1 - G.pauseIdx; if (G.clickPick !== undefined) { G.pauseIdx = G.clickPick; } if (menuOK(src) || G.clickPick !== undefined) { G.clickPick = undefined; if (G.pauseIdx === 0) G.localPause = false; else { G.localPause = false; this.leave(); G.setScene('title'); return; } } }
      // smooth entities toward targets
      for (const p of World.players) if (p.tx !== undefined) { p.x = lerp(p.x, p.tx, 0.55); p.y = lerp(p.y, p.ty, 0.55); }
      for (const e of World.enemies) if (e.tx !== undefined) { e.x = lerp(e.x, e.tx, 0.5); e.y = lerp(e.y, e.ty, 0.5); }
      for (const p of World.projs) { p.x += p.vx; p.y += p.vy; }
      if (s.cm) { const c = World.cam; c.x = lerp(c.x, s.cm[0], 0.3); c.y = lerp(c.y, s.cm[1], 0.3); c.z = lerp(c.z, s.cm[2] / 100, 0.3); }
      if (G.banner) G.banner.t++;
    }
    updateParticles();
  },
  applySnap(s) {
    const G = Game;
    if (s.os) G.overStats = { win: s.os[0], stage: s.os[1], time: s.os[2], kills: s.os[3], endless: s.os[4] };
    if (!s.sg) return;
    const sig = s.sg.join('|');
    if (sig !== this.sig) {
      this.sig = sig; const [seed, idx, np, modsStr, endless] = s.sg; const mods = modsStr ? modsStr.split('.') : [];
      const kind = stageKind(idx);
      World.stage = genStage(seed, idx, kind, { mods, endless: !!endless, players: np }); G.applyStageState(mods);
      World.enemies = []; World.projs = []; Particles.length = 0;
      G.banner = { t: 0, title: stageLabel(idx), sub: kind.startsWith('boss') ? BOSS[kind.split(':')[1]].name : World.stage.B.name, mods };
      G.run = { idx, time: 0, kills: 0, endless: !!s.sg[5] };
      World.cam.x = 300; World.cam.y = 420;
    }
    G.run.idx = s.sg[1]; G.run.endless = !!s.sg[5];
    if (s.hud) {
      const h = s.hud; G.teamStocks = h[0]; G.run.time = h[1]; G.run.kills = h[2]; G.arenaI = h[3]; G.waveI = h[4];
      World.barriers = h[5] || h[6] ? { l: h[5], r: h[6] } : null;
      World.stage.arenas.forEach((a, i) => a.done = !!(h[7] & (1 << i))); World.stage.events.forEach((e, i) => e.used = !!(h[8] & (1 << i))); G.stageT = h[9];
    }
    // players
    if (s.pl) {
      s.pl.forEach((a, i) => {
        let p = World.players[i];
        if (!p || p.def.id !== a[0]) { p = World.players[i] = new Fighter(FIGHTERS[a[0]], i, { cur: new InputSource('none').blank() }); p.x = a[1]; p.y = a[2]; }
        p.tx = a[1]; p.ty = a[2]; p.face = a[3]; p.state = STATES[a[4]] || 'idle'; p.move = a[5] ? p.def.moves[a[5]] : null; if (p.state === 'move' && !p.move) p.state = 'idle';
        p.mf = a[6]; p.pct = a[7]; const fl = a[8]; p.dead = !!(fl & 1); p.out = !!(fl & 2); p.air = fl & 4 ? 1 : 0; p.tumble = fl & 8 ? 1 : 0; p.hammerOut = fl & 16 ? 1 : null; p.mods.orb = fl & 32 ? 1 : 0;
        p.shieldHP = a[9]; p.chgT = a[10]; p.sf = a[11]; p.mods.size = a[12] / 100; p.intang = a[13]; p.vy = a[14]; p.jumps = a[15]; p.boons = a[16] ? a[16].split('.') : [];
        if (p.dead) { p.x = p.tx; p.y = p.ty; }
      });
      World.players.length = s.pl.length;
    }
    if (s.en) {
      const byId = new Map(World.enemies.map(e => [e.id, e])); const next = [];
      for (const a of s.en) {
        let e = byId.get(a[0]); const type = ALL_ETYPES[a[1]]; if (!type) continue;
        if (!e) { e = new Enemy(type, a[2], a[3], { elite: a[9] ? ELITES[a[9] - 1] : null }); e.id = a[0]; }
        e.tx = a[2]; e.ty = a[3]; e.face = a[4]; e.atkName = a[5]; e.atk = a[5] ? e.def.atks[a[5]] : null; e.af = a[6]; e.maxHp = 100; e.hp = a[7];
        const fl = a[8]; e.dying = fl & 1 ? (a[12] || 1) : 0; e.flash = fl & 2 ? 2 : 0; e.hitstun = fl & 4 ? 1 : 0; e.air = fl & 8 ? 1 : 0; e.stunGuard = fl & 16 ? 1 : 0; e.minion = fl & 32 ? 1 : 0; e.vx = fl & 64 ? 1 : 0;
        e.aim = a[10] === -999 ? null : a[10] / 100; e.ward = a[11]; e.spawnT = a[13] || 0; e.dead = false; next.push(e);
      }
      World.enemies = next; const b = next.find(e => e.id === s.hud[10]); G.bossRef = b || null;
    }
    if (s.pr) World.projs = s.pr.map(a => ({ type: PTYPES[a[0]], x: a[1], y: a[2], vx: a[3] / 10, vy: a[4] / 10, r: a[5], t: a[6], owner: null }));
    if (s.it) World.items = s.it.map(a => ({ type: a[0] ? 'chest' : 'food', x: a[1], y: a[2], t: World.frame }));
    if (s.ev) for (const ev of s.ev) {
      if (ev[0] <= this.lastSeq) continue; this.lastSeq = ev[0]; const k = ev[1], a = ev.slice(2);
      if (k === 'snd') Audio2.play(a[0], a[1]); else if (k === 'sh') World.shake(a[0]); else if (FX[k]) FX[k](...a);
    }
  },
};
