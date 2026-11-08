// ===== PeerJS transport (used when running outside Claude, e.g. GitHub Pages) =====
// Mimics the small subset of the Claude `room` API that Net uses: join(name,{host}) -> {presence, peers, onPeers, leave}
const PeerRoom = {
  // ICE: several public STUN servers + TURN relays so players behind strict NATs (phone hotspots, school/work Wi-Fi, CGNAT) can still link up.
  async turnCreds(secret) { // coturn "TURN REST" credentials: user = expiry:id, pass = base64(HMAC-SHA1(secret, user))
    try { const user = (Math.floor(Date.now() / 1000) + 24 * 3600) + ':riftbrawl'; const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']); const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(user)); return { username: user, credential: btoa(String.fromCharCode(...new Uint8Array(sig))) }; } catch (e) { return null; }
  },
  async cfg() {
    const q = new URLSearchParams(location.search);
    const ice = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: 'stun:stun.cloudflare.com:3478' }, { urls: 'stun:global.stun.twilio.com:3478' }];
    const oc = await this.turnCreds('openrelayprojectsecret'); // Open Relay Project's published static-auth secret
    if (oc) ice.push({ urls: ['turn:staticauth.openrelay.metered.ca:80', 'turn:staticauth.openrelay.metered.ca:443', 'turn:staticauth.openrelay.metered.ca:443?transport=tcp', 'turns:staticauth.openrelay.metered.ca:443?transport=tcp'], username: oc.username, credential: oc.credential });
    // optional custom relay: ?turn=turn:host:port&turnuser=u&turncred=p   or   ?metered=APPNAME:APIKEY (free Metered account)
    if (q.get('turn')) ice.push({ urls: q.get('turn').split(','), username: q.get('turnuser') || '', credential: q.get('turncred') || '' });
    const met = q.get('metered') || (() => { try { return localStorage.getItem('rb_metered'); } catch (e) { return null; } })();
    if (met && met.includes(':')) { try { if (q.get('metered')) localStorage.setItem('rb_metered', met); const [app, key] = met.split(':'); const r = await fetch('https://' + app + '.metered.live/api/v1/turn/credentials?apiKey=' + encodeURIComponent(key)); const j = await r.json(); if (Array.isArray(j)) ice.push(...j); } catch (e) { } }
    const c = { debug: 0, config: { iceServers: ice, iceCandidatePoolSize: 4 } };
    if (q.get('peerhost')) { c.host = q.get('peerhost'); c.port = +(q.get('peerport') || 9000); c.path = q.get('peerpath') || '/'; c.secure = q.get('peersecure') === '1'; }
    return c;
  },
  join(name, opt = {}) {
    return this.cfg().then(cfg => new Promise((resolve, reject) => {
      if (typeof Peer === 'undefined') { reject({ code: 'no_peerjs', message: 'Networking library failed to load. Reload the page.' }); return; }
      const hostId = 'riftbrawl-v1-' + name;
      const peer = opt.host ? new Peer(hostId, cfg) : new Peer(cfg);
      const status = m => { try { opt.onStatus && opt.onStatus(m); } catch (e) { } };
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
      let iceState = '';
      const timer = setTimeout(() => fail('timeout', opt.host ? 'Could not reach the matchmaking server. Check your internet and reload.' : iceState ? 'Found the host, but your two networks could not link up (' + iceState + '). Try turning off any VPN, or have the other player host.' : 'No answer from a host with that code. Make sure the host is still on the lobby screen.'), opt.host ? 15000 : 32000);
      peer.on('error', e => {
        const t = e && e.type;
        if (t === 'unavailable-id') fail('taken', 'That room code is in use');
        else if (t === 'peer-unavailable') fail('no_host', 'No host found with that code. Check the letters, and make sure the host is still on the lobby screen.');
        else if (t === 'server-error' || t === 'socket-error' || t === 'socket-closed') fail(t, 'Could not reach the matchmaking server (' + t + '). Check your internet and try again.');
        else if (!done) fail(t || 'error', 'Connection error: ' + (t || e));
        else if (t === 'network' || t === 'disconnected') { /* signalling lost; data channel may still be alive */ }
      });
      peer.on('disconnected', () => { if (!closed) try { peer.reconnect(); } catch (e) { } });
      if (opt.host) {
        peer.on('open', () => { clearTimeout(timer); done = true; resolve(api); });
        peer.on('connection', c => { if (conn && conn.open) { c.on('open', () => c.close()); return; } attach(c); });
      } else {
        let tries = 0;
        const tryConnect = () => {
          if (done) return; tries++; status(tries === 1 ? 'Looking for the host…' : 'Still connecting… (attempt ' + tries + ')');
          const c = peer.connect(hostId, { reliable: true, serialization: 'json' }); attach(c);
          const watch = setInterval(() => { const pc = c.peerConnection; if (!pc) return; const st = pc.iceConnectionState; if (st && st !== iceState) { iceState = st; if (st === 'checking') status('Found the host — linking networks…'); if (st === 'failed') status('Direct link failed — trying a relay…'); } }, 250);
          c.on('open', () => { clearInterval(watch); clearTimeout(retry); clearTimeout(timer); if (!done) { done = true; resolve(api); } });
          const retry = setTimeout(() => { clearInterval(watch); if (done || c.open) return; if (tries < 3) { try { c.close(); } catch (e) { } tryConnect(); } }, 10000);
        };
        peer.on('open', tryConnect);
      }
    }));
  },
};
