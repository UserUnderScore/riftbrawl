// ===== CORE: utils, rng, input, audio =====
const W = 1280, H = 720;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sign = v => v < 0 ? -1 : v > 0 ? 1 : 0;
const rnd = Math.random;
const rr = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const deg = d => d * Math.PI / 180;

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function SRng(seed) {
  const r = mulberry32(seed);
  return {
    f: r,
    r: (a, b) => a + r() * (b - a),
    i: (a, b) => Math.floor(a + r() * (b - a + 1)),
    pick: arr => arr[Math.floor(r() * arr.length)],
    chance: p => r() < p,
  };
}
function shuffle(a, f = Math.random) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function store(key, val) { try { if (val === undefined) return JSON.parse(localStorage.getItem(key)); localStorage.setItem(key, JSON.stringify(val)); } catch (e) { return null; } }

// ===== INPUT =====
// Normalised per-frame input: mx,my (-1..1), held a,b,j,s,m(smash key),p ; pressed ap,bp,jp,sp,pp; cx,cy (c-stick), flick dir
const Keys = {}; const KeysPressed = {};
addEventListener('keydown', e => {
  if (!Keys[e.code]) KeysPressed[e.code] = true;
  Keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  Audio2.unlock();
});
addEventListener('keyup', e => { Keys[e.code] = false; });
addEventListener('blur', () => { for (const k in Keys) Keys[k] = false; });
addEventListener('mousedown', () => Audio2.unlock());

const KB_LAYOUTS = {
  // P1 (left side of the keyboard): WASD + Space, with F/G/H/R as shared-keyboard alternatives to J/K/L/I
  kb1: { l: ['KeyA'], r: ['KeyD'], u: ['KeyW'], d: ['KeyS'], a: ['KeyJ', 'KeyF'], b: ['KeyK', 'KeyG'], j: ['Space'], s: ['KeyL', 'ShiftLeft', 'KeyH'], m: ['KeyI', 'KeyR'], p: ['Escape', 'Enter'], t: ['KeyT'] },
  // P2 (right side of the same keyboard): Arrows + M jump, Comma attack, Period special, Slash shield (or the numpad)
  kb2: { l: ['ArrowLeft'], r: ['ArrowRight'], u: ['ArrowUp'], d: ['ArrowDown'], a: ['Comma', 'Numpad1'], b: ['Period', 'Numpad2'], j: ['ShiftRight', 'KeyM', 'Numpad0'], s: ['Slash', 'Numpad3'], m: ['Semicolon', 'Numpad4'], p: ['Backspace', 'NumpadEnter'], t: ['Quote', 'Numpad5'] },
};
// Positional mapping (standard gamepad): 0=bottom(B on Switch) 1=right(A) 2=left(Y) 3=top(X)
// Smash defaults on Pro Controller: A(right)=attack, B(bottom)=special, X/Y=jump, L/R/ZL/ZR=shield
const PAD_DEFAULT = { a: [1], b: [0], j: [2, 3], s: [4, 5, 6, 7], m: [], p: [9], back: [8] };
let padMap = store('sse_padmap') || JSON.parse(JSON.stringify(PAD_DEFAULT));
let gamepadBlocked = false;
function getPads() {
  if (gamepadBlocked || !navigator.getGamepads) return [];
  try { return Array.from(navigator.getGamepads()).filter(Boolean); } catch (e) { gamepadBlocked = true; return []; }
}
addEventListener('gamepadconnected', e => { UI.toast('Controller connected: ' + shortPadName(e.gamepad.id)); Audio2.unlock(); });
addEventListener('gamepaddisconnected', e => UI.toast('Controller disconnected'));
function shortPadName(id) {
  if (/pro controller|057e/i.test(id)) return 'Switch Pro Controller';
  if (/xbox|xinput/i.test(id)) return 'Xbox Controller';
  if (/dualsense|dualshock|054c/i.test(id)) return 'PlayStation Controller';
  return id.split('(')[0].trim().slice(0, 28) || 'Gamepad';
}

class InputSource {
  constructor(dev) { this.dev = dev; this.prev = {}; this.hist = []; this.cur = this.blank(); }
  blank() { return { mx: 0, my: 0, cx: 0, cy: 0, a: 0, b: 0, j: 0, s: 0, m: 0, p: 0, back: 0, ap: 0, bp: 0, jp: 0, sp: 0, mp: 0, pp: 0, backp: 0, flick: 0, flickY: 0, kb: 1 }; }
  poll() {
    const o = this.blank();
    if (this.dev.startsWith('kb')) {
      const L = KB_LAYOUTS[this.dev];
      const any = arr => arr.some(k => Keys[k]);
      o.mx = (any(L.r) ? 1 : 0) - (any(L.l) ? 1 : 0);
      o.my = (any(L.d) ? 1 : 0) - (any(L.u) ? 1 : 0);
      for (const k of ['a', 'b', 'j', 's', 'm', 'p']) o[k] = any(L[k]) ? 1 : 0;
      o.t = any(L.t || []) ? 1 : 0;
      o.kb = 1;
    } else if (this.dev.startsWith('pad')) {
      const idx = +this.dev.slice(3);
      const pads = getPads(); const gp = pads.find(p => p.index === idx);
      if (gp) {
        const ax = i => (gp.axes[i] || 0);
        let x = ax(0), y = ax(1);
        if (Math.hypot(x, y) < 0.22) { x = 0; y = 0; }
        const btn = i => gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5);
        if (btn(14)) x = -1; if (btn(15)) x = 1; if (btn(12)) y = -1; if (btn(13)) y = 1;
        o.mx = x; o.my = y;
        let cx = ax(2), cy = ax(3); if (Math.hypot(cx, cy) < 0.45) { cx = 0; cy = 0; }
        o.cx = cx; o.cy = cy;
        for (const k of ['a', 'b', 'j', 's', 'm', 'p', 'back']) o[k] = (padMap[k] || []).some(btn) ? 1 : 0;
        o.t = o.back; // the − button taunts during play
        o.kb = 0;
      }
    }
    for (const k of ['a', 'b', 'j', 's', 'm', 'p', 'back', 't']) o[k + 'p'] = o[k] && !this.prev[k] ? 1 : 0;
    // c-stick edge
    const cmag = Math.hypot(o.cx, o.cy), pc = Math.hypot(this.prev.cx || 0, this.prev.cy || 0);
    o.cp = cmag > 0.6 && pc <= 0.6 ? 1 : 0;
    // flick detection (smash input)
    this.hist.push([o.mx, o.my]); if (this.hist.length > 5) this.hist.shift();
    if (!o.kb) {
      const old = this.hist[0];
      if (Math.abs(o.mx) > 0.8 && Math.abs(old[0]) < 0.35) o.flick = sign(o.mx);
      if (Math.abs(o.my) > 0.8 && Math.abs(old[1]) < 0.35) o.flickY = sign(o.my);
    } else {
      // keyboard: pressing a direction this frame counts as a flick (dash), smash via smash key
      if (o.mx && !this.prev.mx) o.flick = sign(o.mx);
      if (o.my && !this.prev.my) o.flickY = sign(o.my);
    }
    this.prev = o; this.cur = o;
    return o;
  }
}
// Wire format for remote input (compact) — includes press counters so quick taps aren't lost
function packInput(src, counters) {
  const o = src.cur;
  for (const k of ['a', 'b', 'j', 's', 'm', 'p', 'c']) if ((k === 'c' ? o.cp : o[k + 'p'])) counters[k] = (counters[k] + 1) % 1000;
  return [Math.round(o.mx * 100), Math.round(o.my * 100), Math.round(o.cx * 100), Math.round(o.cy * 100),
  (o.a ? 1 : 0) | (o.b ? 2 : 0) | (o.j ? 4 : 0) | (o.s ? 8 : 0) | (o.m ? 16 : 0) | (o.p ? 32 : 0) | (o.kb ? 64 : 0),
  counters.a, counters.b, counters.j, counters.s, counters.m, counters.p, counters.c, o.flick, o.flickY];
}
class RemoteInput {
  constructor() { this.last = null; this.cur = new InputSource('none').blank(); this.pend = { a: 0, b: 0, j: 0, s: 0, m: 0, p: 0, c: 0, flick: 0, flickY: 0 }; }
  feed(arr) {
    if (!Array.isArray(arr) || arr.length < 15) return;
    const keys = ['a', 'b', 'j', 's', 'm', 'p', 'c'];
    if (this.last) keys.forEach((k, i) => { if (arr[5 + i] !== this.last[5 + i]) this.pend[k] = 1; });
    if (arr[12]) this.pend.flick = arr[12]; if (arr[13]) this.pend.flickY = arr[13]; if (this.last && arr[14] !== this.last[14]) this.pend.t = 1;
    this.last = arr;
  }
  poll() {
    const o = new InputSource('none').blank(); const a = this.last;
    if (a) {
      o.mx = clamp(a[0] / 100, -1, 1); o.my = clamp(a[1] / 100, -1, 1); o.cx = clamp(a[2] / 100, -1, 1); o.cy = clamp(a[3] / 100, -1, 1);
      const f = a[4] | 0; o.a = f & 1; o.b = (f >> 1) & 1; o.j = (f >> 2) & 1; o.s = (f >> 3) & 1; o.m = (f >> 4) & 1; o.p = (f >> 5) & 1; o.kb = (f >> 6) & 1;
    }
    for (const k of ['a', 'b', 'j', 's', 'm', 'p']) { o[k + 'p'] = this.pend[k]; this.pend[k] = 0; }
    o.cp = this.pend.c; this.pend.c = 0; o.tp = this.pend.t || 0; this.pend.t = 0;
    o.flick = this.pend.flick; o.flickY = this.pend.flickY; this.pend.flick = 0; this.pend.flickY = 0;
    this.cur = o; return o;
  }
}

// ===== AUDIO (synth) =====
const Audio2 = {
  ctx: null, vol: store('sse_sfxvol') ?? (store('sse_muted') ? 0 : 0.5), muted: false,
  unlock() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => { }); return; } try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination); } catch (e) { } },
  tone(freq, dur, type = 'square', vol = 0.2, slide = 0) {
    if (!this.ctx || this.muted) return; const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur);
  },
  noise(dur, vol = 0.3, freq = 1200) {
    if (!this.ctx || this.muted) return; const t = this.ctx.currentTime; const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(); s.buffer = buf; const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  },
  sweep(f0, f1, dur, vol, q = 2) {
    if (!this.ctx || this.muted) return; const t = this.ctx.currentTime; const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = this.ctx.createBufferSource(); s.buffer = buf; const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  },
  chime(freqs, gap, vol, dur = 0.35) { freqs.forEach((f, i) => setTimeout(() => { this.tone(f, dur, 'sine', vol); this.tone(f * 2.01, dur * 0.6, 'sine', vol * 0.35); }, i * gap)); },
  play(name, k = 1) {
    switch (name) {
      case 'cursor': this.tone(2093, 0.045, 'sine', 0.11, 1.12); this.tone(1046, 0.03, 'triangle', 0.05); break;
      case 'back': this.tone(988, 0.09, 'triangle', 0.12, 0.55); this.tone(659, 0.11, 'sine', 0.08, 0.6); break;
      case 'ready': this.sweep(500, 5000, 0.22, 0.22); this.tone(110, 0.25, 'sine', 0.3, 0.45); this.chime([1047, 1319, 1568, 2093], 35, 0.09, 0.5); break;
      case 'confirm': this.sweep(400, 4500, 0.16, 0.2); this.chime([1568, 2349], 40, 0.1, 0.4); this.tone(140, 0.14, 'sine', 0.22, 0.5); break;
      case 'hit': this.noise(0.08 + k * 0.04, 0.25 + k * 0.1, 900 + k * 900); this.tone(180 - k * 30, 0.1, 'square', 0.12, 0.5); break;
      case 'bighit': this.noise(0.25, 0.45, 2500); this.tone(110, 0.3, 'sawtooth', 0.2, 0.3); break;
      case 'crowd': { // stadium cheer: two formant-filtered noise swells
        if (!this.ctx || this.muted) break; const c = this.ctx, t = c.currentTime, dur = 1.8, n = Math.floor(c.sampleRate * dur); const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 + 0.35 * Math.sin(i / c.sampleRate * 2 * Math.PI * (7 + Math.random())));
        for (const [fq, v] of [[650, 0.5], [1500, 0.32], [2600, 0.16]]) { const s = c.createBufferSource(); s.buffer = buf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fq; f.Q.value = 1.4; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.5 * k, t + 0.25); g.gain.linearRampToValueAtTime(v * 0.35 * k, t + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(this.master); s.start(t); }
        break; }
      case 'count': this.tone(880, 0.16, 'square', 0.12); this.tone(440, 0.2, 'triangle', 0.12); break;
      case 'go': this.chime([1047, 1319, 1568, 2093], 0, 0.12, 0.7); this.sweep(300, 6000, 0.35, 0.25); this.tone(130, 0.5, 'sawtooth', 0.18, 0.5); break;
      case 'game': this.chime([523, 659, 784, 1047], 0, 0.14, 1.2); this.tone(65, 0.9, 'sawtooth', 0.22, 0.6); this.noise(0.6, 0.35, 3000); break;
      case 'fanfare': { const seq = [[523, 0], [659, 110], [784, 220], [1047, 330], [988, 560], [1047, 680], [1319, 820]]; for (const [f, d] of seq) setTimeout(() => { this.tone(f, 0.34, 'square', 0.07); this.tone(f / 2, 0.34, 'triangle', 0.08); this.tone(f * 1.5, 0.2, 'sine', 0.03); }, d); setTimeout(() => this.chime([1047, 1319, 1568, 2093], 40, 0.08, 0.9), 820); break; }
      case 'sting': { const seq = [[392, 0], [370, 220], [349, 440], [262, 700]]; for (const [f, d] of seq) setTimeout(() => { this.tone(f, 0.4, 'triangle', 0.1); this.tone(f / 2, 0.45, 'sine', 0.1); }, d); break; }
      case 'twinkle': this.chime([2093, 2637, 3136], 70, 0.08, 0.5); break;
      case 'splat': this.noise(0.18, 0.5, 900); this.tone(90, 0.25, 'square', 0.22, 0.4); break;
      case 'dizzy': this.chime([1568, 1760, 1568, 1760], 90, 0.04, 0.2); break;
      case 'taunt': this.chime([784, 988, 1175], 60, 0.09, 0.35); break;
      case 'swing': this.noise(0.06, 0.08, 3000); break;
      case 'jump': this.tone(300, 0.08, 'square', 0.07, 1.8); break;
      case 'land': this.noise(0.05, 0.08, 500); break;
      case 'bossin': this.tone(55, 1.4, 'sawtooth', 0.22, 0.5); this.noise(1.2, 0.3, 500); setTimeout(() => { this.noise(0.5, 0.45, 2200); this.tone(82, 0.8, 'square', 0.15, 0.5); }, 900); break;
      case 'grab': this.noise(0.05, 0.15, 900); this.tone(260, 0.08, 'square', 0.08, 0.7); break;
      case 'thud': this.noise(0.12, 0.22, 380); this.tone(90, 0.16, 'sine', 0.25, 0.5); break;
      case 'tech': this.sweep(1500, 6500, 0.12, 0.18, 3); this.tone(1760, 0.12, 'triangle', 0.1, 1.3); break;
      case 'parry': this.tone(2637, 0.4, 'sine', 0.16, 0.98); this.tone(3951, 0.3, 'sine', 0.08); this.sweep(3000, 9000, 0.15, 0.18, 4); break;
      case 'walljump': this.noise(0.06, 0.12, 1400); this.tone(420, 0.08, 'square', 0.06, 1.6); break;
      case 'shield': this.tone(600, 0.08, 'triangle', 0.15, 1.2); break;
      case 'ko': this.noise(0.6, 0.5, 4000); this.tone(800, 0.6, 'sawtooth', 0.2, 0.1); break;
      case 'blip': this.play('cursor'); break;
      case 'select': this.play('confirm'); break;
      case 'shoot': this.tone(900, 0.1, 'triangle', 0.1, 0.4); break;
      case 'boom': this.noise(0.4, 0.5, 700); this.tone(70, 0.4, 'sine', 0.3, 0.4); break;
      case 'portal': this.tone(200, 0.4, 'sine', 0.12, 3); break;
      case 'clink': this.tone(1400, 0.06, 'square', 0.1, 0.7); break;
      case 'boon': this.sweep(800, 6000, 0.3, 0.16); this.chime([784, 988, 1175, 1568, 1976], 45, 0.08, 0.6); break;
      case 'lock': this.tone(150, 0.3, 'sawtooth', 0.15, 0.6); break;
      case 'heal': this.tone(500, 0.2, 'sine', 0.15, 2); break;
      case 'charge': this.tone(200 + k * 400, 0.04, 'sine', 0.05); break;
    }
  }
};

// Announcer voice (uses the browser's speech synthesis, pitched down; silent when SFX volume is 0)
function announce(t) {
  try {
    if (!window.speechSynthesis || Audio2.muted || Audio2.vol <= 0.01) return;
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.rate = 0.92; u.pitch = 0.5; u.volume = Math.min(1, Audio2.vol * 1.7);
    const vs = speechSynthesis.getVoices(); const v = vs.find(v => /^en/i.test(v.lang) && /male|david|daniel|alex|fred|george|guy/i.test(v.name) && !/female/i.test(v.name)) || vs.find(v => /^en/i.test(v.lang)); if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (e) { }
}
