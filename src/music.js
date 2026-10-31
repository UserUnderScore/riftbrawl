// ===== MUSIC: a small synth orchestra + sequencer. All compositions are original. =====
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(n) { const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); if (!m) return null; return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); }
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
// "G4:2 C5:6 R:4 ..." durations in 16th steps -> [[step, midi, len, vel]]
function mel(str, start = 0, vel = 1) { const out = []; let t = start; for (const tok of str.split(/\s+/)) { if (!tok || tok === '|') continue; const [n, d] = tok.split(':'); const len = +d || 4; if (n !== 'R') { const ns = n.split('+'); for (const x of ns) out.push([t, midi(x), len, vel]); } t += len; } return out; }
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6], sus: [0, 5, 7], 5: [0, 7, 12] };
function chordTones(sym) { const m = /^([A-G][#b]?)(m7|maj7|m|7|dim|sus|5)?$/.exec(sym); const root = midi(m[1] + '3'); return { root, tones: (QUAL[m[2] || ''] || QUAL['']).map(i => root + i) }; }
// chord chart: one string per bar, may contain 2 chords "F G"
function chart(bars) { const out = []; bars.forEach((b, i) => { const cs = b.trim().split(/\s+/); cs.forEach((c, k) => out.push({ step: i * 16 + k * (16 / cs.length), len: 16 / cs.length, ...chordTones(c) })); }); return out; }

const Music = {
  ctx: null, out: null, rev: null, cur: null, curKey: '', step: 0, nextT: 0, timer: null, vol: store('sse_musicvol') ?? 0.5, enabled: store('sse_music') ?? true, songs: {},
  init() {
    if (this.out || !Audio2.ctx) return !!this.out; const c = this.ctx = Audio2.ctx;
    this.out = c.createGain(); this.out.gain.value = 0;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.2;
    this.bus = c.createGain(); this.bus.gain.value = 1; this.bus.connect(comp); comp.connect(this.out); this.out.connect(c.destination);
    // reverb send
    this.rev = c.createConvolver(); const len = Math.floor(c.sampleRate * 2.4), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.rev.buffer = ir; this.revIn = c.createGain(); this.revIn.gain.value = 0.32; this.revIn.connect(this.rev); this.rev.connect(this.bus);
    this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const nd = this.noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.timer = setInterval(() => this.pump(), 25);
    return true;
  },
  // ---------- instruments ----------
  env(g, t, a, d, s, r, dur, peak) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.linearRampToValueAtTime(peak * s, t + a + d); g.gain.setValueAtTime(peak * s, t + Math.max(a + d, dur)); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + d, dur) + r); return t + Math.max(a + d, dur) + r; },
  voice(type, freqs, t, dur, vel, o = {}) {
    const c = this.ctx, g = c.createGain(); let end;
    const f = c.createBiquadFilter(); f.type = o.ft || 'lowpass'; f.Q.value = o.q ?? 0.8;
    const oscs = [];
    for (const [fr, wt, det] of freqs) { const os = c.createOscillator(); os.type = wt; os.frequency.value = fr; os.detune.value = det || 0; os.connect(f); oscs.push(os);
      if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib; lg.gain.value = o.vibAmt || 6; l.connect(lg); lg.connect(os.detune); l.start(t + (o.vibDelay || 0.15)); l.stop(t + dur + 1.2); } }
    f.connect(g); g.connect(this.bus); if (o.rev !== 0) { const sg = c.createGain(); sg.gain.value = o.rev ?? 0.6; g.connect(sg); sg.connect(this.revIn); }
    if (o.fenv) { const [f0, f1, f2, ft] = o.fenv; f.frequency.setValueAtTime(f0, t); f.frequency.linearRampToValueAtTime(f1, t + ft); f.frequency.linearRampToValueAtTime(f2, t + ft + 0.3); } else f.frequency.value = o.cut || 3000;
    end = this.env(g, t, o.a ?? 0.01, o.d ?? 0.1, o.s ?? 0.7, o.r ?? 0.2, dur, vel);
    for (const os of oscs) { os.start(t); os.stop(end + 0.05); }
  },
  noise(t, dur, vel, ftype, freq, q = 1, rev = 0.3) { const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = ftype; f.frequency.value = freq; f.Q.value = q; const g = c.createGain(); g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(this.bus); if (rev) { const sg = c.createGain(); sg.gain.value = rev; g.connect(sg); sg.connect(this.revIn); } s.start(t); s.stop(t + dur + 0.05); },
  play(inst, m, t, dur, vel) {
    const F = hz(m);
    switch (inst) {
      case 'brass': this.voice(inst, [[F, 'sawtooth', -6], [F, 'sawtooth', 7], [F / 2, 'square', 0]], t, dur, 0.13 * vel, { fenv: [500, 3200, 1600, 0.06], a: 0.03, d: 0.15, s: 0.75, r: 0.18, vib: 5.2, vibAmt: 7, vibDelay: 0.25, q: 1.2 }); break;
      case 'horn': this.voice(inst, [[F, 'sawtooth', -4], [F, 'triangle', 4]], t, dur, 0.12 * vel, { fenv: [400, 1600, 1000, 0.08], a: 0.05, d: 0.2, s: 0.8, r: 0.3, rev: 0.8 }); break;
      case 'strings': this.voice(inst, [[F, 'sawtooth', -9], [F, 'sawtooth', 0], [F, 'sawtooth', 9]], t, dur, 0.055 * vel, { cut: 2400, a: 0.18, d: 0.2, s: 0.85, r: 0.45, vib: 5.5, vibAmt: 5, rev: 0.9 }); break;
      case 'stacc': this.voice(inst, [[F, 'sawtooth', -7], [F, 'sawtooth', 7]], t, Math.min(dur, 0.09), 0.07 * vel, { cut: 3200, a: 0.005, d: 0.06, s: 0.3, r: 0.08, rev: 0.5 }); break;
      case 'pluck': this.voice(inst, [[F, 'triangle', 0], [F * 2, 'sine', 0]], t, 0.05, 0.12 * vel, { cut: 5000, a: 0.002, d: 0.18, s: 0.0, r: 0.15, rev: 0.6 }); break;
      case 'bell': this.voice(inst, [[F, 'sine', 0], [F * 2.76, 'sine', 0], [F * 5.4, 'sine', 0]], t, 0.05, 0.07 * vel, { cut: 9000, a: 0.002, d: 0.6, s: 0, r: 0.6, rev: 1 }); break;
      case 'lead': this.voice(inst, [[F, 'square', -5], [F, 'sawtooth', 5]], t, dur, 0.06 * vel, { fenv: [900, 3600, 2200, 0.04], a: 0.01, d: 0.12, s: 0.7, r: 0.12, vib: 6, vibAmt: 9, vibDelay: 0.18, rev: 0.6 }); break;
      case 'buzz': this.voice(inst, [[F, 'sawtooth', -12], [F * 1.005, 'sawtooth', 12]], t, dur, 0.07 * vel, { fenv: [1200, 4200, 2500, 0.03], a: 0.005, d: 0.08, s: 0.6, r: 0.08, vib: 11, vibAmt: 18, vibDelay: 0.02, q: 3 }); break;
      case 'bass': this.voice(inst, [[F, 'sawtooth', 0], [F / 2, 'sine', 0]], t, dur, 0.16 * vel, { fenv: [300, 900, 500, 0.03], a: 0.005, d: 0.12, s: 0.6, r: 0.08, rev: 0.1 }); break;
      case 'organ': this.voice(inst, [[F, 'sine', 0], [F * 2, 'sine', 0], [F * 3, 'sine', 0], [F * 4, 'triangle', 0]], t, dur, 0.05 * vel, { cut: 4000, a: 0.03, d: 0.1, s: 0.9, r: 0.3, rev: 1 }); break;
      case 'choir': for (const fm of [800, 1150]) this.voice(inst, [[F, 'sawtooth', -10], [F, 'sawtooth', 10], [F * 2, 'triangle', 0]], t, dur, 0.06 * vel, { ft: 'bandpass', cut: fm, q: 2.5, a: 0.35, d: 0.2, s: 0.9, r: 0.6, vib: 4.5, vibAmt: 8, rev: 1.2 }); break;
      case 'kick': { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); g.gain.setValueAtTime(0.55 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.32); break; }
      case 'snare': this.noise(t, 0.16, 0.22 * vel, 'bandpass', 1900, 0.8, 0.4); this.voice(inst, [[190, 'triangle', 0]], t, 0.02, 0.12 * vel, { a: 0.001, d: 0.07, s: 0, r: 0.05, rev: 0.2 }); break;
      case 'roll': this.noise(t, 0.07, 0.09 * vel, 'bandpass', 2400, 0.9, 0.5); break;
      case 'hat': this.noise(t, 0.04, 0.07 * vel, 'highpass', 8000, 0.7, 0.1); break;
      case 'ohat': this.noise(t, 0.22, 0.06 * vel, 'highpass', 7000, 0.7, 0.2); break;
      case 'crash': this.noise(t, 1.8, 0.14 * vel, 'highpass', 5000, 0.5, 0.8); break;
      case 'timp': { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(F * 1.08, t); o.frequency.exponentialRampToValueAtTime(F, t + 0.08); g.gain.setValueAtTime(0.4 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1); o.connect(g); g.connect(this.bus); const sg = c.createGain(); sg.gain.value = 0.7; g.connect(sg); sg.connect(this.revIn); o.start(t); o.stop(t + 1.2); this.noise(t, 0.08, 0.08 * vel, 'lowpass', 600, 0.7, 0.4); break; }
      case 'swell': this.noise(t, dur, 0.001, 'highpass', 4000); { const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 4000; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12 * vel, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05); s.connect(f); f.connect(g); g.connect(this.bus); s.start(t); s.stop(t + dur + 0.1); } break;
    }
  },
  // ---------- transport ----------
  want(key) {
    if (!this.enabled) key = '';
    if (key === this.curKey) return; this.curKey = key;
    if (!this.init()) { this.curKey = ''; return; }
    const c = this.ctx, now = c.currentTime;
    this.out.gain.cancelScheduledValues(now); this.out.gain.setValueAtTime(this.out.gain.value, now); this.out.gain.linearRampToValueAtTime(0, now + 0.5);
    this.cur = null;
    clearTimeout(this.swapT);
    this.swapT = setTimeout(() => {
      if (!key) return; const song = this.songs[key] || (this.songs[key] = buildSong(key)); if (!song) return;
      this.cur = song; this.step = 0; this.nextT = this.ctx.currentTime + 0.1;
      this.out.gain.cancelScheduledValues(this.ctx.currentTime); this.out.gain.setValueAtTime(0, this.ctx.currentTime); this.out.gain.linearRampToValueAtTime(this.vol, this.ctx.currentTime + 0.4);
    }, 520);
  },
  duck(on) { if (!this.out) return; const c = this.ctx; const v = on ? this.vol * 0.45 : this.vol; if (Math.abs(this._duck - v) < 0.001) return; this._duck = v; if (!this.cur) return; this.out.gain.cancelScheduledValues(c.currentTime); this.out.gain.setValueAtTime(this.out.gain.value, c.currentTime); this.out.gain.linearRampToValueAtTime(v, c.currentTime + 0.3); },
  pump() {
    const s = this.cur; if (!s || !this.ctx || this.ctx.state !== 'running') { if (this.ctx && s) this.nextT = Math.max(this.nextT, this.ctx.currentTime + 0.05); return; }
    const spb = 60 / s.bpm / 4; // seconds per 16th
    while (this.nextT < this.ctx.currentTime + 0.15) {
      const evs = s.byStep[this.step]; if (evs) for (const [inst, m, len, vel] of evs) this.play(inst, m, this.nextT + (s.swing && this.step % 2 ? spb * s.swing : 0), len * spb, vel);
      this.nextT += spb; this.step = (this.step + 1) % s.steps;
    }
  },
};
function twice(bars, tracks, lift = []) { const out = []; for (const [inst, evs] of tracks) { out.push([inst, evs.concat(evs.map(([s, m, l, v]) => [s + bars * 16, m, l, v]))]); } for (const [inst, evs] of lift) out.push([inst, evs.map(([s, m, l, v]) => [s + bars * 16, m, l, v])]); return out; }
function compile(bpm, bars, tracks, o = {}) {
  const steps = bars * 16, byStep = new Array(steps);
  for (const [inst, evs] of tracks) for (const [st, m, len, vel] of evs) { if (st >= steps || m === null) continue; (byStep[st] || (byStep[st] = [])).push([inst, m, len, vel ?? 1]); }
  return { bpm, steps, byStep, bars, swing: o.swing || 0 };
}
// ----- shared arrangement helpers -----
function padTrack(ch, oct = 0, vel = 0.9) { const out = []; for (const c of ch) for (const m of c.tones.slice(0, 3)) out.push([c.step, m + 12 + oct * 12, c.len - 0.5, vel]); return out; }
function bassTrack(ch, pat, oct = -1, vel = 1) { const out = []; for (const c of ch) { for (const [o, k, l] of pat) { if (o >= c.len) continue; out.push([c.step + o, c.root + 12 * oct + (k === 5 ? 7 : k === 8 ? 12 : k === 3 ? (c.tones[1] - c.root) : 0), l, vel]); } } return out; }
function arpTrack(ch, rate = 2, oct = 1, shape = [0, 1, 2, 1], vel = 0.7) { const out = []; for (const c of ch) { const tones = [...c.tones.slice(0, 3), c.tones[0] + 12]; for (let i = 0; i < c.len; i += rate) out.push([c.step + i, tones[shape[(i / rate) % shape.length] % tones.length] + 12 * oct, rate, vel]); } return out; }
function drumTrack(bars, pats, fills = []) { const out = []; for (let b = 0; b < bars; b++) { const p = (fills.includes(b) && pats.fill) || pats.main; for (const [inst, steps, vel] of p) for (const st of steps) out.push([inst, b * 16 + st, vel ?? 1]); } return out; }
function splitDrums(evs) { const by = {}; for (const [inst, st, vel] of evs) (by[inst] || (by[inst] = [])).push([st, 60, 1, vel]); return Object.entries(by); }
const DR = {
  march: { main: [['snare', [4, 12], 0.9], ['roll', [6, 7, 14, 15], 0.6], ['kick', [0, 8], 1], ['hat', [0, 2, 4, 6, 8, 10, 12, 14], 0.6]], fill: [['snare', [0, 4, 8, 10, 12, 13, 14, 15], 1], ['kick', [0, 8], 1]] },
  rock: { main: [['kick', [0, 6, 8], 1], ['snare', [4, 12], 1], ['hat', [0, 2, 4, 6, 8, 10, 12, 14], 0.7]], fill: [['kick', [0, 8], 1], ['snare', [4, 8, 10, 12, 13, 14, 15], 1]] },
  four: { main: [['kick', [0, 4, 8, 12], 1], ['snare', [4, 12], 0.8], ['ohat', [2, 6, 10, 14], 0.7], ['hat', [1, 3, 5, 7, 9, 11, 13, 15], 0.4]], fill: [['kick', [0, 4, 8, 12], 1], ['snare', [8, 10, 12, 13, 14, 15], 1]] },
  half: { main: [['kick', [0, 10], 1], ['snare', [8], 1], ['hat', [0, 4, 8, 12], 0.6]], fill: [['kick', [0], 1], ['snare', [8, 12, 14], 1]] },
  drive: { main: [['kick', [0, 3, 8, 11], 1], ['snare', [4, 12], 1], ['hat', [0, 2, 4, 6, 8, 10, 12, 14], 0.8], ['roll', [15], 0.6]], fill: [['kick', [0, 2, 4, 6], 1], ['snare', [8, 9, 10, 11, 12, 13, 14, 15], 1]] },
  blast: { main: [['kick', [0, 2, 4, 6, 8, 10, 12, 14], 0.9], ['snare', [4, 12], 1], ['hat', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], 0.4]], fill: [['kick', [0, 4, 8, 12], 1], ['snare', [0, 2, 4, 6, 8, 9, 10, 11, 12, 13, 14, 15], 1]] },
};

// ----- TITLE THEME: "Riftbrawl" (heroic fanfare, C major) -----
function songTitle() {
  const ch = chart(['C', 'G', 'Am', 'F G', 'C', 'Em', 'F G', 'C', 'Am', 'Em', 'F', 'G', 'C', 'E', 'F G', 'C']);
  const melody = mel(`G4:2 G4:2 C5:6 D5:2 E5:4 | D5:4 C5:2 D5:2 G4:8 | A4:6 B4:2 C5:4 E5:4 | F5:6 E5:2 D5:8 |
    E5:4 G5:4 A5:8 | G5:4 F5:2 E5:2 D5:8 | C5:4 D5:4 E5:4 G5:4 | C6:16 |
    A4:6 C5:2 E5:4 A5:4 | G5:6 E5:2 D5:8 | F5:6 E5:2 D5:4 C5:4 | D5:16 |
    E5:4 F5:4 G5:4 A5:4 | B5:8 G#5:8 | C6:6 B5:2 A5:4 G5:4 | C6:12 R:4`);
  const counter = mel(`R:16 R:16 R:16 R:16 | C4:8 E4:8 | B3:8 G3:8 | A3:8 B3:8 | C4:16 |
    E4:16 | B3:16 | A3:16 | B3:16 | C4:16 | B3:8 G#3:8 | A3:8 B3:8 | C4:16`);
  const timp = []; for (let b = 0; b < 16; b++) { timp.push([b * 16, ch.find(c => c.step <= b * 16 + 0.1 && c.step + c.len > b * 16).root - 12, 4, 1]); if (b % 2) timp.push([b * 16 + 8, 43, 4, 0.8]); }
  timp.push([7 * 16 + 12, 43, 1, 0.7], [7 * 16 + 13, 43, 1, 0.8], [7 * 16 + 14, 43, 1, 0.9], [7 * 16 + 15, 43, 1, 1]);
  const dr = splitDrums(drumTrack(16, DR.march, [7, 15]));
  return compile(112, 16, [['brass', melody], ['strings', mel('R:1').concat(melody.map(([s, m, l, v]) => [s, m - 12, l, 0.6]))], ['horn', counter], ['strings', padTrack(ch, 0, 0.8)], ['stacc', arpTrack(ch.filter(c => c.step >= 128), 2, 1, [0, 1, 2, 3], 0.6)], ['bass', bassTrack(ch, [[0, 0, 3], [4, 5, 3], [8, 0, 3], [12, 8, 3]])], ['timp', timp], ['crash', [[0, 60, 1, 1], [128, 60, 1, 1]]], ['swell', [[7 * 16 + 8, 60, 8, 1]]], ...dr]);
}
// ----- BOSS: The Gatekeeper (martial, D minor, 150) -----
function songGatekeeper() {
  const ch = chart(['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Gm', 'A', 'Bb', 'C', 'Dm', 'A', 'Gm', 'Bb', 'A', 'A']);
  const ost = []; for (let b = 0; b < 16; b++) { const c = ch.find(x => x.step <= b * 16 && x.step + x.len > b * 16); const r = c.root; [0, 0, 12, 0, 7, 0, 12, 10].forEach((k, i) => ost.push([b * 16 + i * 2, r + k, 2, i % 2 ? 0.7 : 1])); }
  const melody = mel(`D5:4 R:2 A4:2 D5:2 E5:2 F5:4 | E5:4 C5:4 A4:8 | D5:6 F5:2 Bb5:4 A5:4 | G5:4 E5:4 C5:8 |
    D5:2 D5:2 F5:4 A5:4 G5:2 F5:2 | E5:4 F5:4 D5:8 | G5:6 F5:2 E5:4 D5:4 | C#5:8 E5:8 |
    F5:4 F5:2 G5:2 A5:8 | G5:4 G5:2 A5:2 Bb5:8 | A5:4 F5:4 D5:4 F5:4 | E5:8 C#5:8 |
    D5:4 Bb4:4 G4:4 Bb4:4 | D5:4 F5:4 Bb5:8 | A5:6 G5:2 F5:4 E5:4 | C#5:4 E5:4 A5:8`);
  const timp = []; for (let b = 0; b < 16; b++) timp.push([b * 16, 38, 4, 1], [b * 16 + 6, 38, 2, 0.7], [b * 16 + 8, 45, 4, 0.9]);
  return compile(150, 32, twice(16, [['brass', melody], ['horn', melody.map(([s, m, l]) => [s, m - 12, l, 0.7])], ['stacc', ost.map(([s, m, l, v]) => [s, m + 12, l, v])], ['bass', ost], ['strings', padTrack(ch, 0, 0.7)], ['timp', timp], ['crash', [[0, 60, 1, 1], [128, 60, 1, 1]]], ...splitDrums(drumTrack(16, DR.march, [7, 15])), ['kick', [0, 64, 128, 192].map(s => [s, 60, 1, 1])]], [['strings', melody.map(([s, m, l]) => [s, m + 12, l, 0.7])], ['roll', [...Array(64)].map((_, i) => [i * 4 + 2, 60, 1, 0.5])]]));
}
// ----- BOSS: Hive Matriarch (frantic, E phrygian, 168) -----
function songMatriarch() {
  const ch = chart(['Em', 'F', 'Em', 'Dm', 'Em', 'F', 'G', 'F', 'Am', 'F', 'Em', 'F', 'Am', 'Bb', 'F', 'E']);
  const arp = []; for (const c of ch) { const t = [c.tones[0] + 24, c.tones[1] + 24, c.tones[2] + 24, c.tones[0] + 36]; for (let i = 0; i < 16; i++) arp.push([c.step + i, t[[0, 1, 2, 3, 2, 1, 0, 1][i % 8]], 1, i % 4 ? 0.55 : 0.85]); }
  const melody = mel(`E5:2 F5:2 E5:2 B4:2 E5:4 G5:4 | F5:2 E5:2 F5:4 C6:8 | B5:2 A5:2 G5:2 F5:2 E5:4 D5:4 | E5:12 R:4 |
    E5:2 F5:2 G5:2 A5:2 B5:4 A5:4 | C6:4 B5:2 A5:2 F5:8 | G5:4 A5:4 B5:4 D6:4 | C6:8 A5:8 |
    A5:2 C6:2 E6:4 D6:2 C6:2 B5:4 | A5:4 F5:4 C6:8 | B5:2 G5:2 E5:4 G5:2 B5:2 E6:4 | F6:8 E6:8 |
    E6:4 D6:2 C6:2 A5:8 | Bb5:4 A5:2 G5:2 F5:8 | A5:4 G5:4 F5:4 E5:4 | G#5:8 B5:8`);
  return compile(168, 32, twice(16, [['buzz', melody], ['brass', melody.map(([s, m, l]) => [s, m - 12, l, 0.5])], ['pluck', arp], ['bass', bassTrack(ch, [[0, 0, 2], [2, 0, 2], [4, 8, 2], [6, 0, 2], [8, 0, 2], [10, 5, 2], [12, 0, 2], [14, 8, 2]])], ['strings', padTrack(ch, -1, 0.6)], ['crash', [[0, 60, 1, 1], [128, 60, 1, 1]]], ...splitDrums(drumTrack(16, DR.drive, [3, 7, 11, 15]))], [['brass', melody.map(([s, m, l]) => [s, m, l, 0.8])], ...splitDrums(drumTrack(16, DR.blast, [15]))]));
}
// ----- BOSS: The Hollow Crown (final, C harmonic minor, 140, choir + organ) -----
function songCrown() {
  const ch = chart(['Cm', 'Ab', 'Fm', 'G', 'Cm', 'Ab', 'Db', 'G', 'Fm', 'Cm', 'Ab', 'G', 'Cm', 'Bb', 'Ab', 'G']);
  const choir = []; for (const c of ch) for (const m of c.tones.slice(0, 3)) choir.push([c.step, m + 12, c.len - 0.5, 1]);
  const org = arpTrack(ch, 2, 1, [0, 2, 1, 2, 3, 2, 1, 2], 0.6);
  const melody = mel(`C5:6 D5:2 Eb5:4 G5:4 | Ab5:8 G5:4 Eb5:4 | F5:6 Eb5:2 D5:4 C5:4 | B4:8 D5:8 |
    C5:4 Eb5:4 G5:4 C6:4 | Ab5:6 G5:2 F5:8 | Db6:6 C6:2 Ab5:4 F5:4 | G5:8 B5:8 |
    Ab5:6 G5:2 F5:4 Ab5:4 | G5:8 Eb5:8 | C6:4 Bb5:4 Ab5:4 Eb5:4 | F5:4 G5:4 B5:8 |
    C6:6 D6:2 Eb6:8 | D6:4 C6:4 Bb5:8 | Ab5:4 C6:4 F6:4 Eb6:4 | D6:8 B5:8`);
  const timp = []; for (let b = 0; b < 16; b++) timp.push([b * 16, 36, 4, 1], [b * 16 + 10, 36, 2, 0.8], [b * 16 + 12, 43, 4, 0.9]);
  return compile(140, 32, twice(16, [['choir', choir], ['organ', org], ['brass', melody], ['horn', melody.map(([s, m, l]) => [s, m - 12, l, 0.8])], ['bass', bassTrack(ch, [[0, 0, 3], [3, 0, 1], [6, 0, 2], [8, 5, 3], [11, 0, 1], [14, 8, 2]])], ['timp', timp], ['crash', [0, 64, 128, 192].map(s => [s, 60, 1, 1])], ...splitDrums(drumTrack(16, DR.half, [7, 15])), ['snare', [...Array(16)].map((_, i) => [12 * 16 + 8 + i % 8, 60, 1, 0.4 + i * 0.03]).slice(0, 8)]], [['strings', melody.map(([s, m, l]) => [s, m + 12, l, 0.8])], ...splitDrums(drumTrack(16, DR.drive, [7, 15]))]));
}
// ----- AREA THEMES: composed per biome from a seed (each ~90 s, looping) -----
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], mixo: [0, 2, 4, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11] };
const AREA = {
  ruins: { key: 'D', mode: 'dorian', bpm: 120, lead: 'horn', lead2: 'brass', drums: 'rock', bassPat: 'gallop', arp: 'stacc', progs: [['i', 'VII', 'IV', 'i'], ['VI', 'VII', 'i', 'v'], ['iv', 'i', 'VII', 'VII']] },
  garden: { key: 'F', mode: 'major', bpm: 128, lead: 'brass', lead2: 'lead', drums: 'four', bassPat: 'bounce', arp: 'pluck', progs: [['I', 'V', 'vi', 'IV'], ['IV', 'V', 'iii', 'vi'], ['ii', 'V', 'I', 'I']] },
  foundry: { key: 'G', mode: 'mixo', bpm: 136, lead: 'lead', lead2: 'brass', drums: 'drive', bassPat: 'drive', arp: 'stacc', progs: [['I', 'VII', 'IV', 'I'], ['IV', 'VII', 'I', 'V'], ['vi', 'IV', 'VII', 'V']] },
  crystal: { key: 'B', mode: 'minor', bpm: 112, lead: 'bell', lead2: 'strings', drums: 'half', bassPat: 'long', arp: 'pluck', progs: [['i', 'VI', 'III', 'VII'], ['iv', 'i', 'VI', 'V'], ['VI', 'VII', 'i', 'i']] },
  frost: { key: 'E', mode: 'lydian', bpm: 124, lead: 'strings', lead2: 'bell', drums: 'rock', bassPat: 'bounce', arp: 'pluck', progs: [['I', 'II', 'vi', 'V'], ['IV', 'I', 'II', 'V'], ['vi', 'iii', 'II', 'II']] },
  void: { key: 'C', mode: 'minor', bpm: 132, lead: 'buzz', lead2: 'choir', drums: 'drive', bassPat: 'drive', arp: 'stacc', progs: [['i', 'VI', 'iv', 'V'], ['i', 'VII', 'VI', 'V'], ['iv', 'VI', 'V', 'V']] },
};
const ROMAN = { i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6 };
function romanChord(rn, key, mode) {
  const sc = SCALES[mode]; const deg = ROMAN[rn.toLowerCase()]; const root = midi(key + '3') + sc[deg];
  const minor = rn === rn.toLowerCase(); const fifth = 7; const third = minor ? 3 : 4; return { root, tones: [root, root + third, root + fifth] };
}
function songArea(biome) {
  const P = AREA[biome] || AREA.garden; const R = SRng([...biome].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0);
  const bars = Math.round(90 * P.bpm / 240 / 4) * 4; // ~90 s, multiple of 4
  // section plan (in bars)
  const plan = [['intro', 4], ['A', 8], ['A2', 8], ['B', 8], ['C', 8]]; let used = 36; while (used + 8 <= bars - 4) { plan.push([used % 16 ? 'A' : 'B', 8]); used += 8; } plan.push(['turn', bars - used]);
  const progOf = { intro: 0, A: 0, A2: 0, B: 1, C: 2, turn: 2 };
  const ch = []; let bar = 0;
  for (const [sec, n] of plan) { const pr = P.progs[progOf[sec]]; for (let i = 0; i < n; i++) { const c = romanChord(pr[i % 4], P.key, P.mode); ch.push({ step: (bar + i) * 16, len: 16, ...c, sec }); } bar += n; }
  // melody motif: 2-bar rhythm + contour, reused with variations, snapped to each bar's chord/scale
  const rhythms = [[4, 2, 2, 4, 4], [2, 2, 4, 2, 2, 4], [6, 2, 4, 4], [3, 3, 2, 4, 4], [4, 4, 2, 2, 4]];
  const motifR = [R.pick(rhythms), R.pick(rhythms)]; const contour = [...Array(12)].map(() => R.i(-2, 3));
  const sc = SCALES[P.mode], keyRoot = midi(P.key + '5') - 12;
  const scaleNotes = []; for (let o = -1; o < 3; o++) for (const d of sc) scaleNotes.push(keyRoot + o * 12 + d);
  const snap = (m, tones, strong) => { let best = m, bd = 99; for (const n of scaleNotes) { const ok = !strong || tones.some(t => (n - t) % 12 === 0); const d = Math.abs(n - m) + (ok ? 0 : 50); if (d < bd) { bd = d; best = n; } } return best; };
  const lead = [], lead2 = [];
  for (const c of ch) {
    const b = c.step / 16, secBar = b; if (c.sec === 'intro' || c.sec === 'turn') continue;
    const rhythm = motifR[b % 2]; let t = 0, k = 0; let pitch = c.tones[0] + 24 + (c.sec === 'A2' ? 12 : 0) + (c.sec === 'C' ? -12 : 0);
    if (c.sec === 'C' && b % 2) continue; // sparse bridge
    const target = c.sec === 'B' ? lead2 : lead;
    for (const d of rhythm) { pitch += contour[(k + b * 3) % contour.length] * 2; pitch = clamp(pitch, keyRoot + 7, keyRoot + 26); const n = snap(pitch, c.tones, t % 4 === 0); target.push([c.step + t, n, d, t === 0 ? 1 : 0.85]); t += d; k++; if (t >= 16) break; }
  }
  const bpat = { gallop: [[0, 0, 2], [3, 0, 1], [4, 0, 2], [6, 5, 2], [8, 0, 2], [11, 0, 1], [12, 8, 2], [14, 5, 2]], bounce: [[0, 0, 3], [4, 5, 2], [6, 8, 2], [8, 0, 3], [12, 5, 2], [14, 3, 2]], drive: [[0, 0, 2], [2, 0, 2], [4, 0, 2], [6, 0, 2], [8, 0, 2], [10, 0, 2], [12, 5, 2], [14, 8, 2]], long: [[0, 0, 8], [8, 5, 6], [14, 8, 2]] }[P.bassPat];
  const fills = []; let acc = 0; for (const [, n] of plan) { acc += n; fills.push(acc - 1); }
  const drumBars = []; acc = 0; const dr = []; for (const [sec, n] of plan) { const d = drumTrack(n, sec === 'intro' ? DR.half : sec === 'C' ? DR.half : DR[P.drums], [n - 1]); for (const [inst, st, v] of d) dr.push([inst, st + acc * 16, v]); acc += n; }
  const crashes = []; acc = 0; for (const [, n] of plan) { crashes.push([acc * 16, 60, 1, 1]); acc += n; }
  const arp = arpTrack(ch.filter(c => c.sec !== 'intro'), P.arp === 'pluck' ? 2 : 2, 1, [0, 1, 2, 3, 2, 1, 2, 1], 0.55);
  return compile(P.bpm, bars, [[P.lead, lead], [P.lead2, lead2], ['strings', padTrack(ch, 0, 0.7)], [P.arp, arp], ['bass', bassTrack(ch.filter(c => c.sec !== 'intro'), bpat)], ['crash', crashes], ...splitDrums(dr)]);
}
function buildSong(key) {
  try {
    if (key === 'title') return songTitle();
    if (key === 'boss:gatekeeper') return songGatekeeper();
    if (key === 'boss:matriarch') return songMatriarch();
    if (key === 'boss:crown') return songCrown();
    if (key.startsWith('area:')) return songArea(key.slice(5));
  } catch (e) { console.error('music', e); }
  return null;
}
// decide what should be playing each frame
function musicTick() {
  if (!Audio2.ctx || Audio2.ctx.state !== 'running') return;
  const sc = Net.isGuest ? Net.guestScene : Game.scene;
  let key = 'title';
  if (['play', 'boon', 'victory'].includes(sc) && World.stage) {
    const b = Game.bossRef; key = b && !b.dead && !b.dying ? 'boss:' + b.type : 'area:' + World.stage.biome;
    if (sc === 'victory') key = 'title';
  }
  if (Audio2.muted) key = '';
  Music.want(key);
  Music.duck(sc === 'boon' || Game.paused);
}
