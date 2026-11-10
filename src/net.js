// ===== ONLINE CO-OP (host-authoritative, via the artifact `room` capability presence) =====
const ALL_ETYPES = [...Object.keys(ENEMY), ...Object.keys(BOSS), 'rival0', 'rival1', 'rival2', 'rival3'];
const PTYPES = Object.keys(PROJ);
const STATES = ['idle', 'run', 'crouch', 'squat', 'land0', 'land', 'air', 'helpless', 'move', 'shield', 'roll', 'spot', 'adodge', 'shieldbreak', 'hitstun', 'ledge', 'shielddrop', 'revive', 'tech', 'techroll', 'walltech', 'ceiltech', 'down', 'getup', 'getuproll', 'climb', 'burst', 'grabhold', 'grabbed'];
const R2 = v => Math.round(v);
const Net = {
  isHost: false, isGuest: false, room: null, r: null, code: '', status: '', ok: false, guestPeer: null, guestState: null, remote: null, guests: [], gid: '', locals: [],
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
    this.leave(); this.isHost = true; this.ok = false; this.guestPeer = null; this.guestState = null; this.guests = [];
    this.code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[ri(0, 23)]).join(''); this.status = 'Connecting…';
    const room = await this.getRoom(); if (!room) return;
    try {
      for (let tries = 0; ; tries++) {
        try { this.r = await room.join('rb-' + this.code.toLowerCase(), { host: true }); break; }
        catch (e) { if (e && e.code === 'taken' && tries < 4) { this.code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[ri(0, 23)]).join(''); continue; } throw e; }
      }
      this.ok = true; this.status = 'Room open — waiting for your partner to join…';
      this.r.presence({ role: 'host', v: 1, gv: GAME_VERSION }).catch(() => { });
      this.r.onPeers(ch => this.syncGuests(ch.peers), e => { this.status = 'Room error: ' + e.code; this.ok = false; });
    } catch (e) { this.status = 'Could not open room: ' + ((e && (e.message || e.code)) || 'error'); }
    this.wrapFX();
  },
  async join(code) {
    this.leave(); this.code = code; this.status = 'Connecting to ' + code + '…'; this.ok = false; this._vw = 0;
    const room = await this.getRoom(); if (!room) return;
    try {
      this.r = await room.join('rb-' + code.toLowerCase(), { host: false, onStatus: m => { if (!this.isGuest) this.status = m; } });
      this.ok = true; this.status = 'Connected — looking for host…'; this.isGuest = true; this.guestScene = 'wait'; this.sig = ''; this.lastSeq = 0;
      this.gid = Math.random().toString(36).slice(2, 10); this.locals = [Devices.get(Game.primary || 'kb1')]; this.local = this.locals[0]; this.cnts = [{ a: 0, b: 0, j: 0, s: 0, m: 0, p: 0, c: 0, t: 0 }, { a: 0, b: 0, j: 0, s: 0, m: 0, p: 0, c: 0, t: 0 }]; this.pfs = [[0, 0], [0, 0]];
      Game.gch = [1, 2]; Game.grdy = [false, false]; Game.gbp = [0, 0]; Game.grr = [0, 0]; Game.gbpKey = [null, null];
      this.r.presence({ role: 'guest', gid: this.gid, n: 1, in: [] }).catch(() => { });
      showJoinBox(false); Game.scene = 'wait';
      this.r.onPeers(ch => { const h = ch.peers.find(p => !p.sameTab && p.presence && p.presence.role === 'host'); if (!h && this.hostP) { UI.toast('Host left the game'); this.leave(); Game.setScene('title'); } this.hostP = h ? h.peer : null; if (h && h.presence && h.presence.gv !== GAME_VERSION && !this._vw) { this._vw = 1; UI.toast('Host is on a different version (' + (h.presence.gv || 'older') + '). Both players: press Ctrl+Shift+R to refresh.'); } });
      setTimeout(() => { if (this.isGuest && !this.hostP) this.status = 'No host found with code ' + code + ' (yet). Double-check the code.'; }, 6000);
    } catch (e) { this.status = 'Could not join: ' + ((e && (e.message || e.code)) || 'error'); }
  },
  leave() {
    if (this.r) { try { this.r.leave(); } catch (e) { } }
    this.r = null; this.isHost = false; this.isGuest = false; this.guestPeer = null; this.guestState = null; this.guests = []; this.hostP = null; this.ok = false;
  },
  // capture FX + sounds on host so the guest can replay them
  wrapFX() {
    if (this.wrapped) return; this.wrapped = true;
    for (const k of ['burst', 'ring', 'hit', 'explode', 'text', 'ko', 'zap', 'portal', 'after', 'swarm', 'dissolve', 'tech', 'parry', 'specialKO', 'meteor', 'glint', 'ffspark']) { const o = FX[k].bind(FX); FX[k] = (...a) => { if (Net.isHost && Game.scene === 'play') Net.pushEv(k, a); o(...a); }; }
    const op = Audio2.play.bind(Audio2); Audio2.play = (n, k) => { if (Net.isHost && Game.scene === 'play' && n !== 'charge') Net.pushEv('snd', [n, k || 0]); op(n, k); };
    const os = World.shake.bind(World); World.shake = a => { if (Net.isHost && a > 3) Net.pushEv('sh', [R2(a)]); os(a); };
  },
  pushEv(k, a) { this.evq.push([++this.seq, k, ...a.map(v => typeof v === 'number' ? Math.round(v * 10) / 10 : v)]); if (this.evq.length > 40) this.evq.shift(); },
  // ---------- host: track every guest machine (each can bring 1-2 local players; 3 players max in total) ----------
  syncGuests(peers) {
    const seen = [];
    for (const p of peers) { if (p.sameTab || !p.presence || p.presence.role !== 'guest') continue; const gid = p.presence.gid || p.peer; if (seen.some(g => g.gid === gid)) continue; let g = this.guests.find(x => x.gid === gid); if (!g) { g = { gid, peer: p.peer, st: p.presence, remotes: [new RemoteInput(), new RemoteInput()], lastPres: null }; g.remotes.forEach(r => r.isRemote = true); UI.toast('A player joined!'); Audio2.play('select'); } g.peer = p.peer; seen.push(g); }
    for (const g of this.guests) if (!seen.includes(g)) { UI.toast('A player disconnected'); Game.slots.forEach((sl, i) => { if (sl.gid === g.gid && World.players[i]) World.players[i].out = true; }); }
    this.guests = seen; this.guestPeer = seen.length ? seen[0].peer : null; this.guestState = seen.length ? seen[0].st : null;
  },
  guestByGid(gid) { return this.guests.find(g => g.gid === gid) || null; },
  pollRemotes() { for (const g of this.guests) for (const r of g.remotes) r.poll(); },
  encodeInput(k) {
    const s = this.locals[k].cur, C = this.cnts[k], pf = this.pfs[k];
    for (const key of ['a', 'b', 'j', 's', 'm', 'p']) if (s[key + 'p']) C[key] = (C[key] + 1) % 1000;
    if (s.cp) C.c = (C.c + 1) % 1000; if (s.tp) C.t = (C.t + 1) % 1000;
    if (s.flick) pf[0] = s.flick; if (s.flickY) pf[1] = s.flickY;
    return null;
  },
  packInput(k) {
    const s = this.locals[k].cur, C = this.cnts[k], pf = this.pfs[k];
    const out = Game.localPause ? [0, 0, 0, 0, 0, C.a, C.b, C.j, C.s, C.m, C.p, C.c, 0, 0, C.t] : [R2(s.mx * 100), R2(s.my * 100), R2(s.cx * 100), R2(s.cy * 100), (s.a ? 1 : 0) | (s.b ? 2 : 0) | (s.j ? 4 : 0) | (s.s ? 8 : 0) | (s.m ? 16 : 0) | (s.p ? 32 : 0) | (s.kb ? 64 : 0), C.a, C.b, C.j, C.s, C.m, C.p, C.c, pf[0], pf[1], C.t];
    pf[0] = 0; pf[1] = 0; return out;
  },
  tick() {
    if (!this.r) return;
    this.tc = (this.tc || 0) + 1;
    if (this.isHost) {
      const peers = this.r.peers();
      for (const g of this.guests) { const p = peers.find(q => q.peer === g.peer); if (p && p.presence !== g.lastPres) { g.lastPres = p.presence; g.st = p.presence; if (Array.isArray(p.presence.in)) g.remotes[0].feed(p.presence.in); if (Array.isArray(p.presence.in2)) g.remotes[1].feed(p.presence.in2); } }
      this.guestState = this.guests.length ? this.guests[0].st : null;
      if (this.tc % 2 === 0) this.r.presence({ role: 'host', s: this.snapshot() }).catch(() => { });
    } else if (this.isGuest) {
      for (let k = 0; k < this.locals.length; k++) this.encodeInput(k);
      if (this.tc % 2 === 0) {
        const G = Game, n = this.locals.length;
        this.r.presence({ role: 'guest', gid: this.gid, n, in: this.packInput(0), in2: n > 1 ? this.packInput(1) : null, ch: G.gch.slice(0, n), rdy: G.grdy.slice(0, n).map(v => v ? 1 : 0), bp: G.gbp.slice(0, n), mu: Meta.levels(), rr: G.grr.slice(0, n) }).catch(() => { });
      }
    }
  },
  snapshot() {
    const G = Game; const s = { sc: G.scene === 'lobby' ? 'wait' : G.scene, pa: G.paused ? 1 : 0 };
    s.sl = G.slots.map(sl => sl.dev === 'net' ? [sl.gid, sl.k | 0] : 0);
    if (G.scene === 'charsel') s.cs = G.slots.map((_, i) => [G.csel[i] | 0, G.cready[i] ? 1 : 0]);
    if (G.scene === 'over' && G.overStats) { const o = G.overStats; s.os = [o.win ? 1 : 0, o.stage, o.time, o.kills, o.endless, o.cleared | 0, o.bosses | 0, o.bonus | 0, o.ps || []]; }
    if (G.scene === 'path' && G.pathOpts) s.po = [G.pathOpts.join('.'), G.pathIdx | 0, G.run ? G.run.idx : 0];
    if (G.run && World.stage && ['play', 'boon', 'victory'].includes(G.scene)) {
      const R = G.run, st = World.stage;
      s.sg = [R.stageSeed, R.idx, World.players.length, (st.mods || []).join('.'), R.idx >= 12 ? 1 : 0, R.endless ? 1 : 0, R.path || 'road'];
      s.bz = World.freezeT > 0 && World.burster ? [World.burster.slot, World.freezeT] : 0;
      const b = G.bossRef;
      s.hud = [G.teamStocks, R.time, R.kills, G.arenaI, G.waveI, World.barriers ? R2(World.barriers.l) : 0, World.barriers ? R2(World.barriers.r) : 0, st.arenas.reduce((m, a, i) => m | (a.done ? 1 << i : 0), 0), st.events.reduce((m, e, i) => m | (e.used ? 1 << i : 0), 0), G.stageT, b && !b.dead ? b.id : 0, G.bossIntro ? G.bossIntro.t : -1, G.countT | 0, G.gameT | 0, World.critT | 0];
      if (G.co) s.co = [G.co.seq, G.co.text, G.co.col, G.co.size];
      s.pl = World.players.map(p => [p.def.id, R2(p.x), R2(p.y), p.face, STATES.indexOf(p.state), p.move ? p.move.name : '', p.mf, Math.floor(p.pct), (p.dead ? 1 : 0) | (p.out ? 2 : 0) | (p.air ? 4 : 0) | (p.tumble ? 8 : 0) | (p.hammerOut ? 16 : 0) | (p.mods.orb ? 32 : 0) | (p.frozenT > 0 ? 64 : 0) | (p.burnT > 0 ? 128 : 0) | (p.ff ? 256 : 0) | (p.buriedT > 0 ? 512 : 0), R2(p.shieldHP), R2(p.chgT), p.sf % 1000, R2(p.mods.size * 100), Math.min(99, p.intang), R2(p.vy), p.jumps, p.boons.join('.'), p.rollDir | 0, p.wallSide | 0, Math.floor(p.meter || 0), p.combo | 0, Math.min(99, World.frame - (p.lastHitF ?? -999))]);
      s.en = World.enemies.slice(0, 24).map(e => [e.id, ALL_ETYPES.indexOf(e.type), R2(e.x), R2(e.y), e.face, e.atk ? e.atkName : '', Math.floor(e.af), R2(e.hp / e.maxHp * 100), (e.dying ? 1 : 0) | (e.flash > 0 ? 2 : 0) | (e.hitstun > 0 ? 4 : 0) | (e.air ? 8 : 0) | (e.stunGuard ? 16 : 0) | (e.minion ? 32 : 0) | (Math.abs(e.vx) > 0.3 ? 64 : 0) | (e.frozenT > 0 ? 128 : 0) | (e.burnT > 0 ? 256 : 0) | (e.shockT > 0 ? 512 : 0) | (e.buriedT > 0 ? 1024 : 0) | (e.tripT > 0 ? 2048 : 0), e.elite ? ELITES.indexOf(e.elite) + 1 : 0, e.aim != null ? R2(e.aim * 100) : -999, e.ward | 0, e.dying | 0, e.spawnT | 0, ...(e.isRival ? [STATES.indexOf(e.state), e.move ? e.move.name : '', e.mf, Math.floor(e.pct), e.sf % 1000, e.jumps, R2(e.chgT), R2(e.vy), e.limit, e.hammerOut ? 1 : 0, e.ff ? 1 : 0, e.rollDir | 0] : [])]);
      s.pr = World.projs.slice(0, 28).map(p => [PTYPES.indexOf(p.type), R2(p.x), R2(p.y), R2(p.vx * 10), R2(p.vy * 10), R2(p.r), p.t]);
      s.it = World.items.map(i => [i.type === 'food' ? 0 : i.type === 'chest' ? 1 : i.type === 'bomb' ? 2 : i.type === 'riftball' ? 4 : 3, R2(i.x), R2(i.y), i.type === 'crate' || i.type === 'riftball' ? (i.hp > 0 ? Math.ceil(i.hp / 8) : 0) * 10 + Math.min(9, i.hitT | 0) : i.kind | 0, i.t > 1300 ? 1 : 0, i.holder ? i.holder.slot + 1 : 0, i.th ? Math.round((i.rot || 0) * 10) / 10 : 0, i.th ? 1 : 0, i.id % 97]);
      s.ev = this.evq.slice(-16);
      s.cm = [R2(World.cam.x), R2(World.cam.y), R2(World.cam.z * 100)];
    }
    if (G.scene === 'boon') { s.bo = World.players.map((p, i) => [(G.boonOpts[i] || []).join('.'), G.boonPick[i] ? 1 : 0]); }
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
    const src = this.locals[0];
    // which player slots belong to this machine (a guest can bring a second player on the same keyboard / another pad)
    const sl = s.sl || []; const mine = []; sl.forEach((x, i) => { if (x && x[0] === this.gid) mine[x[1]] = i; });
    const buildSlots = () => sl.length ? sl.map((x, i) => x && x[0] === this.gid ? { dev: (this.locals[x[1]] || src).dev, input: this.locals[x[1]] || src, mine: 1, k: x[1] } : { dev: 'net' }) : [{ dev: 'net' }, { dev: src.dev, input: src, mine: 1, k: 0 }];
    if (s.sc === 'charsel') {
      G.mode = 'guest'; G.slots = buildSlots();
      // a second local player joins by pressing ATTACK/JUMP on another device of this computer (e.g. Arrows + Comma on the same keyboard)
      if (this.locals.length < 2 && sl.length < 3) for (const ls of localSources()) { if (this.locals.includes(ls)) continue; if (ls.cur.ap || ls.cur.jp) { this.locals.push(ls); G.gch[1] = (G.gch[0] + 1) % 4; G.grdy[1] = false; Audio2.play('select'); ls.cur.ap = 0; ls.cur.jp = 0; this.joinT = 0; break; } }
      if (this.locals.length > 1 && mine[1] === undefined) { this.joinT = (this.joinT | 0) + 1; if (this.joinT > 90) { this.locals.pop(); UI.toast('The game is full (3 players max)'); } }
      sl.forEach((x, i) => { if (!(x && x[0] === this.gid)) { G.csel[i] = s.cs && s.cs[i] ? s.cs[i][0] : 0; G.cready[i] = !!(s.cs && s.cs[i] && s.cs[i][1]); } });
      for (let k = 0; k < this.locals.length; k++) {
        const ls = this.locals[k], d = menuDir(ls);
        if (!G.grdy[k]) {
          if (d === 'left') { G.gch[k] = (G.gch[k] + 3) % 4; Audio2.play('blip'); } if (d === 'right') { G.gch[k] = (G.gch[k] + 1) % 4; Audio2.play('blip'); }
          if (menuOK(ls)) { G.grdy[k] = true; Audio2.play('ready'); const nm = FIGHTERS[G.gch[k]].name; announce(nm[0] + nm.slice(1).toLowerCase() + '!'); }
          else if (k === 1 && menuBack(ls)) { this.locals.pop(); Audio2.play('back'); break; }
        } else if (menuBack(ls)) G.grdy[k] = false;
        if (mine[k] !== undefined) { G.csel[mine[k]] = G.gch[k]; G.cready[mine[k]] = !!G.grdy[k]; }
      }
      if (G.clickChar !== undefined) { if (!G.grdy[0]) G.gch[0] = G.clickChar; G.clickChar = undefined; }
      if (!sl.length) { G.csel[1] = G.gch[0]; G.cready[1] = !!G.grdy[0]; }
      G.t++;
    } else { G.grdy = [false, false]; }
    if (s.sc === 'boon' && s.bo) {
      G.slots = buildSlots(); const key = (s.sg ? s.sg[1] : 0) + (s.sg && s.sg[5] ? 1000 : 0);
      s.bo.forEach((b, i) => { G.boonOpts[i] = b[0] ? b[0].split('.') : []; });
      s.bo.forEach((b, i) => {
        const x = sl[i]; const isMine = x && x[0] === this.gid; if (!isMine) { G.boonPick[i] = b[1] ? 'x' : null; return; }
        const k = x[1], ls = this.locals[k] || src, opts = G.boonOpts[i];
        if (G.boonIdx[i] === undefined) G.boonIdx[i] = 0;
        if (ls.cur.sp && !G.boonPick[i]) { G.grr[k] = (G.grr[k] | 0) + 1; Audio2.play('confirm'); }
        if (b[1]) G.boonPick[i] = G.boonPick[i] || opts[G.boonIdx[i]]; else if (G.gbpKey[k] !== key) { G.boonPick[i] = null; G.gbp[k] = 0; G.gbpKey[k] = key; }
        if (!G.boonPick[i] && opts.length) {
          const d = menuDir(ls); const n = opts.length;
          if (d === 'up' || d === 'left') G.boonIdx[i] = (G.boonIdx[i] + n - 1) % n; if (d === 'down' || d === 'right') G.boonIdx[i] = (G.boonIdx[i] + 1) % n;
          if (G.clickBoon && G.clickBoon[0] === i) { G.boonIdx[i] = G.clickBoon[1]; G.clickBoon = null; G.gbp[k] = [key, G.boonIdx[i]]; G.boonPick[i] = opts[G.boonIdx[i]]; Audio2.play('boon'); }
          else if (menuOK(ls)) { G.gbp[k] = [key, G.boonIdx[i]]; G.boonPick[i] = opts[G.boonIdx[i]]; Audio2.play('boon'); }
        }
      });
    } else if (s.sc !== 'boon') { G.boonIdx = {}; G.boonPick = {}; }
    if (s.sc === 'play') {
      if (this.locals.some(l => l.cur.pp)) { G.localPause = !G.localPause; G.pauseIdx = 0; }
      if (G.localPause) { const GP = GUEST_PAUSE; const d = menuDir(src); if (d === 'up') G.pauseIdx = (G.pauseIdx + GP.length - 1) % GP.length; if (d === 'down') G.pauseIdx = (G.pauseIdx + 1) % GP.length; volAdjust(GP[G.pauseIdx], d === 'left' ? -1 : d === 'right' ? 1 : 0); if (G.clickPick !== undefined) { G.pauseIdx = G.clickPick; } const lab = GP[G.pauseIdx]; if (VOL_ROWS[lab]) { G.clickPick = undefined; if (menuOK(src)) volAdjust(lab, 1); } else if (menuOK(src) || G.clickPick !== undefined) { G.clickPick = undefined; if (lab === 'RESUME') G.localPause = false; else { G.localPause = false; this.leave(); G.setScene('title'); return; } } }
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
    if (s.os && (!G.overStats || G.overStats._k !== JSON.stringify(s.os))) { G.overStats = { win: s.os[0], stage: s.os[1], time: s.os[2], kills: s.os[3], endless: s.os[4], cleared: s.os[5], bosses: s.os[6], bonus: s.os[7], ps: s.os[8] || [], _k: JSON.stringify(s.os) }; awardShards(G.overStats); }
    if (s.po) { G.pathOpts = s.po[0].split('.'); G.pathIdx = s.po[1]; }
    World.freezeT = s.bz ? s.bz[1] : 0; World.burster = s.bz ? World.players[s.bz[0]] : null;
    if (!s.sg) return;
    const sig = s.sg.join('|');
    if (sig !== this.sig) {
      this.sig = sig; const [seed, idx, np, modsStr, endless] = s.sg; const mods = modsStr ? modsStr.split('.') : [];
      const kind = stageKind(idx);
      World.stage = genStage(seed, idx, kind, { mods, endless: !!endless, players: np, path: s.sg[6] || 'road' }); G.applyStageState(mods);
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
      G.bossIntro = h[11] >= 0 ? { t: h[11] } : null; G.countT = h[12] | 0; G.gameT = h[13] | 0; World.critT = h[14] | 0;
    }
    // players
    if (s.pl) {
      s.pl.forEach((a, i) => {
        let p = World.players[i];
        if (!p || p.def.id !== a[0]) { p = World.players[i] = new Fighter(FIGHTERS[a[0]], i, { cur: new InputSource('none').blank() }); p.x = a[1]; p.y = a[2]; }
        p.tx = a[1]; p.ty = a[2]; p.face = a[3]; p.state = STATES[a[4]] || 'idle'; p.move = a[5] ? p.def.moves[a[5]] : null; if (p.state === 'move' && !p.move) p.state = 'idle';
        p.mf = a[6]; p.pct = a[7]; const fl = a[8]; p.dead = !!(fl & 1); p.buriedT = fl & 512 ? 1 : 0; p.out = !!(fl & 2); p.air = fl & 4 ? 1 : 0; p.tumble = fl & 8 ? 1 : 0; p.hammerOut = fl & 16 ? 1 : null; p.mods.orb = fl & 32 ? 1 : 0; p.frozenT = fl & 64 ? 1 : 0; p.burnT = fl & 128 ? 2 : 0; p.ff = fl & 256 ? 1 : 0;
        p.shieldHP = a[9]; p.chgT = a[10]; p.sf = a[11]; p.mods.size = a[12] / 100; p.intang = a[13]; p.vy = a[14]; p.jumps = a[15]; p.boons = a[16] ? a[16].split('.') : []; p.rollDir = a[17] || 1; p.wallSide = a[18] || 0; p.meter = a[19] || 0; p.combo = a[20] || 0; p.lastHitF = World.frame - (a[21] ?? 99);
        if (p.dead) { p.x = p.tx; p.y = p.ty; }
      });
      World.players.length = s.pl.length;
    }
    if (s.en) {
      const byId = new Map(World.enemies.map(e => [e.id, e])); const next = [];
      for (const a of s.en) {
        let e = byId.get(a[0]); const type = ALL_ETYPES[a[1]]; if (!type) continue;
        if (!e) { e = type.startsWith('rival') ? new Rival(+type.slice(5), a[2], a[3]) : new Enemy(type, a[2], a[3], { elite: a[9] ? ELITES[a[9] - 1] : null }); e.id = a[0]; }
        e.tx = a[2]; e.ty = a[3]; e.face = a[4];
        if (e.isRival) { e.state = STATES[a[14]] || 'idle'; e.move = a[15] ? e.def.moves[a[15]] : null; if (e.state === 'move' && !e.move) e.state = 'idle'; e.mf = a[16]; e.mft = a[16]; e.pct = a[17]; e.sf = a[18]; e.jumps = a[19]; e.chgT = a[20]; e.vy = a[21]; e.limit = a[22]; e.hammerOut = a[23] ? 1 : null; e.ff = a[24]; e.rollDir = a[25] || 1; e.dead = false; e.spawnT = a[13] || 0; const fl = a[8]; e.flash = fl & 2 ? 2 : 0; e.tumble = fl & 4 && e.state === 'hitstun' ? 1 : 0; e.air = fl & 8 ? 1 : 0; e.frozenT = fl & 128 ? 1 : 0; e.burnT = fl & 256 ? 2 : 0; e.shockT = fl & 512 ? 2 : 0; next.push(e); continue; }
        e.atkName = a[5]; e.atk = a[5] ? e.def.atks[a[5]] : null; e.af = a[6]; e.maxHp = 100; e.hp = a[7];
        const fl = a[8]; e.dying = fl & 1 ? (a[12] || 1) : 0; e.flash = fl & 2 ? 2 : 0; e.hitstun = fl & 4 ? 1 : 0; e.air = fl & 8 ? 1 : 0; e.stunGuard = fl & 16 ? 1 : 0; e.minion = fl & 32 ? 1 : 0; e.vx = fl & 64 ? 1 : 0;
        e.aim = a[10] === -999 ? null : a[10] / 100; e.ward = a[11]; e.spawnT = a[13] || 0; e.frozenT = fl & 128 ? 1 : 0; e.burnT = fl & 256 ? 2 : 0; e.shockT = fl & 512 ? 2 : 0; e.buriedT = fl & 1024 ? 1 : 0; e.tripT = fl & 2048 ? 1 : 0; e.dead = false; next.push(e);
      }
      World.enemies = next; const b = next.find(e => e.id === s.hud[10]); G.bossRef = b || null;
    }
    if (s.co && (!G.co || G.co.seq !== s.co[0])) G.co = { seq: s.co[0], text: s.co[1], col: s.co[2], size: s.co[3], t: 0 };
    if (s.pr) World.projs = s.pr.map(a => ({ type: PTYPES[a[0]], x: a[1], y: a[2], vx: a[3] / 10, vy: a[4] / 10, r: a[5], t: a[6], owner: null }));
    if (s.it) World.items = s.it.map(a => ({ type: ['food', 'chest', 'bomb', 'crate', 'riftball'][a[0]] || 'food', hp: a[0] >= 3 ? Math.floor(a[3] / 10) * 8 : 0, hitT: a[0] >= 3 ? a[3] % 10 : 0, x: a[1], y: a[2], kind: a[3] | 0, t: a[4] ? 1400 : 1, hs: a[5] | 0, rot: a[6] || 0, th: a[7] ? 1 : null, id: a[8] | 0 }));
    if (s.ev) for (const ev of s.ev) {
      if (ev[0] <= this.lastSeq) continue; this.lastSeq = ev[0]; const k = ev[1], a = ev.slice(2);
      if (k === 'snd') Audio2.play(a[0], a[1]); else if (k === 'sh') World.shake(a[0]); else if (FX[k]) FX[k](...a);
    }
  },
};

const GUEST_PAUSE = ['RESUME', 'SFX VOLUME', 'MUSIC VOLUME', 'LEAVE GAME'];
