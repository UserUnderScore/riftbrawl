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
    if (q.get('icefail') === '1') c.config = { iceServers: [], iceTransportPolicy: 'relay' }; // test hook: simulate a network that blocks direct links
    if (q.get('peerhost')) { c.host = q.get('peerhost'); c.port = +(q.get('peerport') || 9000); c.path = q.get('peerpath') || '/'; c.secure = q.get('peersecure') === '1'; }
    return c;
  },
  // Public MQTT-over-WebSocket brokers used as a fallback relay when a direct WebRTC link can't be made
  // (strict NATs, CGNAT, school/work Wi-Fi). Plain WSS on port 443-ish ports gets through almost any network.
  brokers() { const q = new URLSearchParams(location.search); if (q.get('mqtt')) return q.get('mqtt').split(','); return ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt']; },
  join(name, opt = {}) {
    const self = this, q = new URLSearchParams(location.search), forceRelay = q.get('relay') === '1';
    return this.cfg().then(cfg => new Promise((resolve, reject) => {
      const status = m => { try { opt.onStatus && opt.onStatus(m); } catch (e) { } };
      const hostId = 'riftbrawl-v1-' + name, topic = 'riftbrawl/v2/' + name, myId = Math.random().toString(36).slice(2, 10);
      let peer = null;
      try { if (typeof Peer !== 'undefined') peer = opt.host ? new Peer(hostId, cfg) : new Peer(cfg); } catch (e) { peer = null; }
      let conn = null, mine = Object.freeze({}), other = null, subs = [], snap = [], done = false, sendT = null, closed = false, lastSend = 0;
      const relays = []; // connected MQTT clients
      const meP = () => ({ peer: (peer && peer.id) || myId, presence: mine, isMe: true, sameTab: true, kind: 'viewer', guest: false, by: null });
      const rebuild = () => { snap = Object.freeze([Object.freeze(meP()), ...(other ? [other] : [])]); };
      const notify = (joined = [], left = []) => { rebuild(); for (const f of subs) try { f({ peers: snap, joined, left, updated: [] }); } catch (e) { console.error(e); } };
      const flush = () => { sendT = null; if (conn && conn.open) { lastSend = performance.now(); try { conn.send({ p: mine }); } catch (e) { } } };
      const attach = c => {
        if (conn && conn !== c) { try { conn.close(); } catch (e) { } }
        conn = c;
        c.on('data', d => { if (conn !== c || !d || typeof d !== 'object' || !d.p || typeof d.p !== 'object') return; const was = !!other; other = Object.freeze({ peer: c.peer, presence: Object.freeze(d.p), isMe: false, sameTab: false, kind: 'viewer', guest: false, by: null }); notify(was ? [] : [other]); });
        c.on('open', () => flush());
        const gone = () => { if (conn !== c) return; const o = other; other = null; conn = null; notify([], o ? [o] : []); };
        c.on('close', gone); c.on('error', gone);
        if (c.open) flush();
      };
      const api = {
        name,
        presence(patch) { mine = Object.freeze({ ...mine, ...patch }); rebuild(); if (!sendT) { const gap = conn && conn.relay ? Math.max(0, 60 - (performance.now() - lastSend)) : 30; sendT = setTimeout(flush, Math.max(16, gap)); } return Promise.resolve(); },
        peers() { return snap; },
        onPeers(fn) { subs.push(fn); setTimeout(() => fn({ peers: snap, joined: snap, left: [], updated: [] }), 0); return () => { subs = subs.filter(x => x !== fn); }; },
        emit() { return Promise.resolve(); }, on() { return () => { }; },
        connected() { return !!(conn && conn.open); }, onConnection() { return () => { }; },
        get viaRelay() { return !!(conn && conn.relay); },
        leave() { closed = true; try { conn && conn.close(); } catch (e) { } try { peer && peer.destroy(); } catch (e) { } for (const r of relays) try { r.close(); } catch (e) { } return Promise.resolve(); },
      };
      rebuild();
      const finish = () => { if (!done) { done = true; clearTimeout(timer); resolve(api); } };
      const fail = (code, message) => { if (!done) { done = true; clearTimeout(timer); try { peer && peer.destroy(); } catch (e) { } for (const r of relays) try { r.close(); } catch (e) { } reject({ code, message }); } };
      let iceState = '', relayTried = false, hostSeen = false, tryRelay = () => { };
      const timer = setTimeout(() => fail('timeout', opt.host ? 'Could not reach any matchmaking server. Check your internet and reload.' : hostSeen ? 'Found the host, but could not connect, even through the relay. Reload both pages and try again.' : 'No answer from a host with that code. Make sure the host is still on the lobby screen.'), opt.host ? 20000 : 40000);

      // ---------- relay (MQTT over WebSocket) ----------
      const relayConn = (cl, pubTopic, peerId) => {
        const h = {}; const c = { relay: 1, open: true, peer: 'relay-' + peerId, rid: peerId, last: performance.now(),
          on(e, f) { (h[e] = h[e] || []).push(f); }, emit(e, a) { for (const f of h[e] || []) try { f(a); } catch (er) { console.error(er); } },
          send(d) { if (c.open) cl.pub(pubTopic, JSON.stringify({ to: peerId, from: myId, d })); },
          close() { if (!c.open) return; c.open = false; clearInterval(c.hb); c.emit('close'); } };
        c.hb = setInterval(() => { if (!c.open) return clearInterval(c.hb); if (performance.now() - c.last > 10000) c.close(); else if (performance.now() - lastSend > 1500) { try { cl.pub(pubTopic, JSON.stringify({ to: peerId, from: myId, ping: 1 })); } catch (e) { } } }, 1000);
        return c;
      };
      const startRelay = (onClient) => { for (const url of self.brokers()) MQ.connect(url, 8000).then(cl => { if (closed || (done && !opt.host && conn && !conn.relay)) { cl.close(); return; } relays.push(cl); onClient(cl); }).catch(() => { }); };
      if (opt.host) {
        // host listens on every broker it can reach; replies go back through whichever broker the guest used
        startRelay(cl => {
          cl.sub(topic + '/g', raw => {
            let m; try { m = JSON.parse(raw); } catch (e) { return; } if (!m || !m.from) return;
            let c = conn && conn.relay && conn.rid === m.from ? conn : null;
            if (!c) { if (conn && conn.open && !conn.relay) return; if (m.hi) { c = relayConn(cl, topic + '/h', m.from); attach(c); } else return; }
            c.last = performance.now(); if (m.hi) c.send({ p: mine }); if (m.d) c.emit('data', m.d);
          });
          if (!peer) { finish(); status('Room open (relay)'); }
        });
      } else {
        tryRelay = why => {
          if (relayTried || done) return; relayTried = true; status(why || 'Trying the relay connection…'); let picked = null;
          setTimeout(() => { if (!picked) fail(hostSeen ? 'no_link' : 'no_host', hostSeen ? 'Found the host, but could not connect, even through the relay. Reload both pages and try again.' : 'No host found with that code. Check the letters, and make sure the host is still on the lobby screen.'); }, 15000);
          startRelay(cl => {
            cl.sub(topic + '/h', raw => {
              let m; try { m = JSON.parse(raw); } catch (e) { return; } if (!m || m.to !== myId) return;
              if (!picked) { picked = cl; hostSeen = true; const c = relayConn(cl, topic + '/g', m.from); attach(c); finish(); }
              if (conn && conn.relay && conn.rid === m.from) { conn.last = performance.now(); if (m.d) conn.emit('data', m.d); }
            });
            const hello = () => { if (!picked && !done) { cl.pub(topic + '/g', JSON.stringify({ from: myId, hi: 1 })); setTimeout(hello, 1500); } };
            setTimeout(hello, 300);
          });
        };
        if (forceRelay || !peer) tryRelay('Connecting through the relay…');
        else {
          let tries = 0;
          const tryConnect = () => {
            if (done) return; tries++; status(tries === 1 ? 'Looking for the host…' : 'Still connecting…');
            const c = peer.connect(hostId, { reliable: true, serialization: 'json' }); attach(c);
            const watch = setInterval(() => { const pc = c.peerConnection; if (!pc) return; const st = pc.iceConnectionState; if (st && st !== iceState) { iceState = st; if (st === 'checking') { hostSeen = true; status('Found the host — linking networks…'); } if (st === 'failed' || st === 'disconnected') tryRelay('Direct link blocked by your network — switching to the relay…'); } }, 250);
            c.on('open', () => { clearInterval(watch); if (!done) { if (conn !== c) attach(c); finish(); } });
            setTimeout(() => { clearInterval(watch); if (done || c.open) return; if (tries < 2 && (!relayTried || hostSeen)) tryConnect(); }, 9000);
          };
          peer.on('open', tryConnect);
          setTimeout(() => tryRelay(hostSeen ? 'Direct link is slow — also trying the relay…' : 'Trying the relay connection…'), 7000);
        }
      }
      if (peer) {
        peer.on('error', e => {
          const t = e && e.type;
          if (t === 'unavailable-id') fail('taken', 'That room code is in use');
          else if (!opt.host) tryRelay(t === 'peer-unavailable' ? 'Checking the relay for that room…' : 'Matchmaking server trouble — trying the relay…');
        });
        peer.on('disconnected', () => { if (!closed) try { peer.reconnect(); } catch (e) { } });
        if (opt.host) {
          peer.on('open', () => { finish(); });
          peer.on('connection', c => { if (conn && conn.open) { c.on('open', () => c.close()); return; } attach(c); });
        }
      }
    }));
  },
};

// ---------- minimal MQTT 3.1.1 client over WebSocket (QoS 0 publish/subscribe only) ----------
const MQ = {
  connect(url, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      let ws; try { ws = new WebSocket(url, ['mqtt']); } catch (e) { reject(e); return; }
      ws.binaryType = 'arraybuffer'; const te = new TextEncoder(), td = new TextDecoder(); let buf = new Uint8Array(0), pid = 1, ok = false, ping = null; const handlers = {};
      const str = s => { const b = te.encode(s); return [b.length >> 8, b.length & 255, ...b]; };
      const len = n => { const o = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; o.push(d); } while (n > 0); return o; };
      const pkt = (h, body) => { const a = new Uint8Array(1 + len(body.length).length + body.length); a.set([h, ...len(body.length)]); a.set(body, a.length - body.length); return a; };
      const send = a => { if (ws.readyState === 1) ws.send(a); };
      const cid = 'rb' + Math.random().toString(36).slice(2, 12);
      const to = setTimeout(() => { try { ws.close(); } catch (e) { } reject(new Error('timeout')); }, timeoutMs);
      ws.onopen = () => send(pkt(0x10, [...str('MQTT'), 4, 0x02, 0, 60, ...str(cid)]));
      ws.onerror = () => { if (!ok) { clearTimeout(to); reject(new Error('ws error')); } };
      ws.onclose = () => { clearInterval(ping); if (!ok) { clearTimeout(to); reject(new Error('closed')); } };
      ws.onmessage = ev => {
        const inc = new Uint8Array(ev.data); const nb = new Uint8Array(buf.length + inc.length); nb.set(buf); nb.set(inc, buf.length); buf = nb;
        for (;;) {
          if (buf.length < 2) break; let mul = 1, rl = 0, i = 1, b; do { if (i >= buf.length) return; b = buf[i++]; rl += (b & 127) * mul; mul *= 128; } while (b & 128);
          if (buf.length < i + rl) break; const buf0 = buf[0], type = buf0 >> 4, body = buf.slice(i, i + rl); buf = buf.slice(i + rl);
          if (type === 2) { if (body[1] === 0) { ok = true; clearTimeout(to); ping = setInterval(() => send(new Uint8Array([0xC0, 0])), 25000); resolve(client); } else { reject(new Error('refused')); try { ws.close(); } catch (e) { } } }
          else if (type === 3) { const tl = (body[0] << 8) | body[1]; const t = td.decode(body.subarray(2, 2 + tl)); const off = 2 + tl + (((buf0 >> 1) & 3) ? 2 : 0); const payload = td.decode(body.subarray(off)); for (const k in handlers) if (k === t) for (const f of handlers[k]) try { f(payload); } catch (e) { console.error(e); } }
        }
      };
      const client = {
        url,
        sub(topic, fn) { (handlers[topic] = handlers[topic] || []).push(fn); const id = pid++ & 0xffff || 1; send(pkt(0x82, [id >> 8, id & 255, ...str(topic), 0])); },
        pub(topic, payload) { const p = te.encode(payload); const t = str(topic); const body = new Uint8Array(t.length + p.length); body.set(t); body.set(p, t.length); send(pkt(0x30, body)); },
        close() { clearInterval(ping); try { send(new Uint8Array([0xE0, 0])); ws.close(); } catch (e) { } },
      };
    });
  },
};
