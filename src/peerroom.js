// ===== PeerJS transport (used when running outside Claude, e.g. GitHub Pages) =====
// Mimics the small subset of the Claude `room` API that Net uses: join(name,{host}) -> {presence, peers, onPeers, leave}
const PeerRoom = {
  cfg() {
    const q = new URLSearchParams(location.search); const c = { debug: 0, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] } };
    if (q.get('peerhost')) { c.host = q.get('peerhost'); c.port = +(q.get('peerport') || 9000); c.path = q.get('peerpath') || '/'; c.secure = q.get('peersecure') === '1'; }
    return c;
  },
  join(name, opt = {}) {
    return new Promise((resolve, reject) => {
      if (typeof Peer === 'undefined') { reject({ code: 'no_peerjs', message: 'Networking library failed to load' }); return; }
      const hostId = 'riftbrawl-v1-' + name;
      const peer = opt.host ? new Peer(hostId, this.cfg()) : new Peer(this.cfg());
      let conn = null, mine = Object.freeze({}), other = null, subs = [], snap = [], done = false, sendT = null, closed = false;
      const meP = () => ({ peer: peer.id || 'me', presence: mine, isMe: true, sameTab: true, kind: 'viewer', guest: false, by: null });
      const rebuild = () => { snap = Object.freeze([Object.freeze(meP()), ...(other ? [other] : [])]); };
      const notify = (joined = [], left = []) => { rebuild(); for (const f of subs) try { f({ peers: snap, joined, left, updated: [] }); } catch (e) { console.error(e); } };
      const flush = () => { sendT = null; if (conn && conn.open) try { conn.send({ p: mine }); } catch (e) { } };
      const attach = c => {
        conn = c;
        c.on('data', d => { if (!d || typeof d !== 'object' || !d.p || typeof d.p !== 'object') return; const was = !!other; other = Object.freeze({ peer: c.peer, presence: Object.freeze(d.p), isMe: false, sameTab: false, kind: 'viewer', guest: false, by: null }); notify(was ? [] : [other]); });
        c.on('open', () => flush());
        const gone = () => { if (conn !== c) return; const o = other; other = null; conn = null; notify([], o ? [o] : []); };
        c.on('close', gone); c.on('error', gone);
      };
      const api = {
        name,
        presence(patch) { mine = Object.freeze({ ...mine, ...patch }); rebuild(); if (!sendT) sendT = setTimeout(flush, 30); return Promise.resolve(); },
        peers() { return snap; },
        onPeers(fn) { subs.push(fn); setTimeout(() => fn({ peers: snap, joined: snap, left: [], updated: [] }), 0); return () => { subs = subs.filter(x => x !== fn); }; },
        emit() { return Promise.resolve(); }, on() { return () => { }; },
        connected() { return !!(conn && conn.open); }, onConnection() { return () => { }; },
        leave() { closed = true; try { conn && conn.close(); } catch (e) { } try { peer.destroy(); } catch (e) { } return Promise.resolve(); },
      };
      rebuild();
      const fail = (code, message) => { if (!done) { done = true; try { peer.destroy(); } catch (e) { } reject({ code, message }); } };
      const timer = setTimeout(() => fail('timeout', opt.host ? 'Could not reach the matchmaking server' : 'No host answered with that code'), 15000);
      peer.on('error', e => {
        const t = e && e.type;
        if (t === 'unavailable-id') fail('taken', 'That room code is in use');
        else if (t === 'peer-unavailable') fail('no_host', 'No host found with that code');
        else if (!done) fail(t || 'error', 'Connection error: ' + (t || e));
        else if (t === 'network' || t === 'disconnected') { /* signalling lost; data channel may still be alive */ }
      });
      peer.on('disconnected', () => { if (!closed) try { peer.reconnect(); } catch (e) { } });
      if (opt.host) {
        peer.on('open', () => { clearTimeout(timer); done = true; resolve(api); });
        peer.on('connection', c => { if (conn && conn.open) { c.on('open', () => c.close()); return; } attach(c); });
      } else {
        peer.on('open', () => {
          const c = peer.connect(hostId, { reliable: true, serialization: 'json' }); attach(c);
          c.on('open', () => { clearTimeout(timer); if (!done) { done = true; resolve(api); } });
        });
      }
    });
  },
};
