// ===== ART: HD canvas, color utils, cartoon fighter bodies =====
const OL = '#1a1423';
const FONT = "Rubik, 'Segoe UI', system-ui, sans-serif";
// --- color helpers ---
function hexRGB(h) { if (h[0] !== '#') { const m = h.match(/\d+(\.\d+)?/g); return m ? [+m[0], +m[1], +m[2]] : [255, 255, 255]; } if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; const n = parseInt(h.slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
const _shadeCache = new Map();
function shade(h, k) { const key = h + k; let v = _shadeCache.get(key); if (v) return v; const [r, g, b] = hexRGB(h); const f = c => Math.round(clamp(k >= 0 ? c + (255 - c) * k : c * (1 + k), 0, 255)); v = `rgb(${f(r)},${f(g)},${f(b)})`; _shadeCache.set(key, v); return v; }
function rgba(h, a) { const [r, g, b] = hexRGB(h); return `rgba(${r},${g},${b},${a})`; }
// --- HD canvas: render at device resolution, draw in 1280x720 logical units ---
const HD = { k: 1 };
function setupHD() {
  const cvs = document.getElementById('c'); const dpr = window.devicePixelRatio || 1;
  const cw = cvs.clientWidth || W; const k = clamp(cw * dpr / W, 1, 2.5);
  if (Math.abs(k - HD.k) > 0.01 || cvs.width !== Math.round(W * k)) { HD.k = k; cvs.width = Math.round(W * k); cvs.height = Math.round(H * k); }
}
addEventListener('resize', () => setupHD());

// --- skeleton ---
function ik2(rx, ry, tx, ty, l1, l2, bend) {
  let dx = tx - rx, dy = ty - ry; let d = Math.hypot(dx, dy); const max = l1 + l2 - 0.01; if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  const a = Math.atan2(dy, dx); const c = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * Math.max(d, 0.01)), -1, 1); const off = Math.acos(c) * bend;
  return [[rx + Math.cos(a + off) * l1, ry + Math.sin(a + off) * l1], [rx + dx, ry + dy]];
}
function joints(x, y, face, pose, s, A) {
  const hip = [x + face * pose[0] * s, y + pose[1] * s], ln = pose[2];
  const up = [face * Math.sin(ln), -Math.cos(ln)];
  const sh = [hip[0] + up[0] * 21 * s, hip[1] + up[1] * 21 * s];
  const nk = [hip[0] + up[0] * 25 * s, hip[1] + up[1] * 25 * s];
  const hd = [hip[0] + up[0] * (33 + (A.headUp || 0)) * s, hip[1] + up[1] * (33 + (A.headUp || 0)) * s];
  const L = 12 * s, AL = 11 * s;
  const [k1, f1] = ik2(hip[0], hip[1], hip[0] + face * pose[7] * s, hip[1] + pose[8] * s, L, L, -face);
  const [k2, f2] = ik2(hip[0], hip[1], hip[0] + face * pose[9] * s, hip[1] + pose[10] * s, L, L, -face);
  const [e1, h1] = ik2(sh[0], sh[1], sh[0] + face * pose[3] * s, sh[1] + pose[4] * s, AL, AL, face);
  const [e2, h2] = ik2(sh[0], sh[1], sh[0] + face * pose[5] * s, sh[1] + pose[6] * s, AL, AL, face);
  return { hip, sh, nk, hd, k1, f1, k2, f2, e1, h1, e2, h2, ln, up, face, s };
}
// tube segments: outline pass then color pass then light pass, for seamless cartoon limbs
function seg(g, a, b, w, col, pass) {
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
  if (pass === 0) { g.strokeStyle = OL; g.lineWidth = w + 3.2; g.stroke(); }
  else if (pass === 1) { g.strokeStyle = col; g.lineWidth = w; g.stroke(); }
  else { const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1; const nx = -dy / m, ny = dx / m; const sgn = ny > 0 ? -1 : 1; const ox = nx * sgn * w * 0.2, oy = ny * sgn * w * 0.2;
    g.beginPath(); g.moveTo(a[0] + ox, a[1] + oy); g.lineTo(b[0] + ox, b[1] + oy); g.strokeStyle = shade(col, 0.2); g.lineWidth = w * 0.26; g.stroke();
    g.beginPath(); g.moveTo(a[0] - ox * 1.1, a[1] - oy * 1.1); g.lineTo(b[0] - ox * 1.1, b[1] - oy * 1.1); g.strokeStyle = shade(col, -0.2); g.lineWidth = w * 0.22; g.stroke(); }
}
function ball(g, p, r, col, pass) { g.beginPath(); g.arc(p[0], p[1], pass === 0 ? r + 1.6 : r, 0, TAU); if (pass === 0) { g.fillStyle = OL; g.fill(); } else if (pass === 1) { g.fillStyle = col; g.fill(); } else { g.fillStyle = shade(col, 0.35); g.beginPath(); g.arc(p[0] - r * 0.3, p[1] - r * 0.35, r * 0.35, 0, TAU); g.fill(); } }
function boot(g, k, f, face, s, col, pass, big = 1) {
  const dx = f[0] - k[0], dy = f[1] - k[1]; const a = Math.atan2(dy, dx) - Math.PI / 2;
  const cx = f[0] + face * 3.5 * s * big, cy = f[1] - 1 * s; const rx = 7 * s * big, ry = 4.2 * s * big;
  g.save(); g.translate(cx, cy); g.rotate(a * 0.6);
  g.beginPath(); g.ellipse(0, 0, pass === 0 ? rx + 1.6 : rx, pass === 0 ? ry + 1.6 : ry, 0, 0, TAU);
  if (pass === 0) { g.fillStyle = OL; g.fill(); } else if (pass === 1) { g.fillStyle = col; g.fill(); g.fillStyle = shade(col, -0.35); g.fillRect(-rx, ry * 0.25, rx * 2, ry * 0.75); } else { g.fillStyle = shade(col, 0.35); g.beginPath(); g.ellipse(-rx * 0.2, -ry * 0.35, rx * 0.45, ry * 0.25, 0, 0, TAU); g.fill(); }
  g.restore();
}
function torsoPath(g, J, wHip, wSh) {
  const { hip, sh, up } = J; const px = -up[1], py = up[0];
  g.beginPath();
  g.moveTo(hip[0] + px * wHip / 2, hip[1] + py * wHip / 2);
  g.quadraticCurveTo(hip[0] + px * wHip * 0.62 + up[0] * 10 * J.s, hip[1] + py * wHip * 0.62 + up[1] * 10 * J.s, sh[0] + px * wSh / 2, sh[1] + py * wSh / 2);
  g.quadraticCurveTo(sh[0] + up[0] * 5 * J.s, sh[1] + up[1] * 5 * J.s, sh[0] - px * wSh / 2, sh[1] - py * wSh / 2);
  g.quadraticCurveTo(hip[0] - px * wHip * 0.62 + up[0] * 10 * J.s, hip[1] - py * wHip * 0.62 + up[1] * 10 * J.s, hip[0] - px * wHip / 2, hip[1] - py * wHip / 2);
  g.closePath();
}
function fillShaded(g, col, cx, cy, r) { const gr = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r); gr.addColorStop(0, shade(col, 0.25)); gr.addColorStop(0.55, col); gr.addColorStop(1, shade(col, -0.3)); g.fillStyle = gr; g.fill(); g.strokeStyle = OL; g.lineWidth = 2.6; g.stroke(); }

// --- character art definitions (original designs) ---
const ART = [
  { // ROOK — street brawler
    skin: '#f0bf86', hair: '#2b1d14', top: '#d63b33', top2: '#f6efe6', pants: '#2f3542', boots: '#c0392b', arm: 'skin', fore: '#f4f1ea', hand: '#f4f1ea', belt: '#1e1e1e', band: '#e8473f', thick: 1.05,
    hairDraw(g, J, s) { const [x, y] = J.hd, f = J.face; g.fillStyle = this.hair; g.strokeStyle = OL; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x - f * 11 * s, y + 1 * s); for (let i = 0; i < 6; i++) { const a = Math.PI + 0.15 + i * 0.5; g.lineTo(x + Math.cos(a) * 16 * s * (i % 2 ? 0.95 : 1.3) - f * 2 * s, y + Math.sin(a) * 15 * s * (i % 2 ? 0.95 : 1.3) - 2 * s); } g.lineTo(x + f * 10 * s, y - 4 * s); g.closePath(); g.fill(); g.stroke(); },
    headAcc(g, J, s, t) { const [x, y] = J.hd, f = J.face; g.fillStyle = this.band; g.strokeStyle = OL; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y - 5.5 * s, 11.6 * s, 3.2 * s, 0, 0, TAU); g.fill(); g.stroke(); if (J.cl) { drawRibbon(g, ribbon(J.cl, 'hb2', x - f * 10 * s, y - 3.5 * s, 5, 4.6 * s, { dir: f, wind: -f * 0.1, drag: 0.86 }), 3.6 * s, 2 * s, shade(this.band, -0.18)); drawRibbon(g, ribbon(J.cl, 'hb1', x - f * 10.5 * s, y - 5 * s, 6, 5 * s, { dir: f, wind: -f * 0.13, drag: 0.9 }), 4 * s, 2.2 * s, this.band); return; } const wv = Math.sin(t * 0.3) * 3; g.beginPath(); g.moveTo(x - f * 10 * s, y - 5 * s); g.quadraticCurveTo(x - f * 18 * s, y - 2 * s + wv, x - f * 26 * s, y + 2 * s - wv); g.lineTo(x - f * 24 * s, y + 6 * s - wv); g.quadraticCurveTo(x - f * 16 * s, y + 2 * s, x - f * 10 * s, y - 1 * s); g.fill(); g.stroke(); },
    torsoDetail(g, J, s) { const { hip, sh, up } = J; const px = -up[1], py = up[0]; g.strokeStyle = this.top2; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(sh[0] + px * 2 * s, sh[1] + py * 2 * s); g.lineTo(hip[0] + up[0] * 6 * s, hip[1] + up[1] * 6 * s); g.stroke(); g.strokeStyle = this.belt; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(hip[0] + px * 8 * s, hip[1] + py * 8 * s); g.lineTo(hip[0] - px * 8 * s, hip[1] - py * 8 * s); g.stroke(); g.fillStyle = '#ffd23c'; g.fillRect(hip[0] - 2.5 * s, hip[1] - 2.5 * s, 5 * s, 5 * s); },
  },
  { // VELA — wandering swordswoman
    skin: '#ffd9b3', hair: '#27367a', top: '#3f8de8', top2: '#d6dee8', pants: '#24324a', boots: '#6b4f36', arm: '#2b5fa8', fore: '#2b5fa8', hand: '#2b2b33', belt: '#6b4f36', scarf: '#f5f7ff', thick: 0.95,
    back(g, J, s, t) { if (J.cl) { const [hx, hy] = J.hd, ff = J.face; drawRibbon(g, ribbon(J.cl, 'scarf', J.sh[0] - ff * 3 * s, J.sh[1] + 1 * s, 6, 5.4 * s, { dir: ff, wind: -ff * 0.14, drag: 0.9, grav: 0.26 }), 7 * s, 3.4 * s, this.scarf); drawRibbon(g, ribbon(J.cl, 'tail', hx - ff * 8 * s, hy - 6 * s, 6, 5.6 * s, { dir: ff, wind: -ff * 0.08, drag: 0.88, grav: 0.4 }), 9.5 * s, 3.5 * s, this.hair); return; } const [x, y] = J.hd, f = J.face; const sw = Math.sin(t * 0.12) * 4 + (J.vx || 0) * -1.2 * f; g.fillStyle = this.hair; g.strokeStyle = OL; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x - f * 6 * s, y - 8 * s); g.quadraticCurveTo(x - f * 22 * s, y - 4 * s + sw, x - f * (26 + Math.abs(sw)) * s, y + 18 * s + sw); g.quadraticCurveTo(x - f * 16 * s, y + 6 * s, x - f * 4 * s, y + 2 * s); g.closePath(); g.fill(); g.stroke();
      const { sh } = J; g.fillStyle = this.scarf; g.beginPath(); g.moveTo(sh[0], sh[1] - 2 * s); g.quadraticCurveTo(sh[0] - f * 14 * s, sh[1] + sw, sh[0] - f * (24 + Math.abs(sw) * 1.5) * s, sh[1] + 8 * s + sw); g.lineTo(sh[0] - f * 20 * s, sh[1] + 12 * s + sw); g.quadraticCurveTo(sh[0] - f * 10 * s, sh[1] + 6 * s, sh[0], sh[1] + 4 * s); g.closePath(); g.fill(); g.stroke(); },
    hairDraw(g, J, s) { const [x, y] = J.hd, f = J.face; g.fillStyle = this.hair; g.strokeStyle = OL; g.lineWidth = 2.4; g.beginPath(); g.arc(x - f * 1 * s, y - 2 * s, 12.4 * s, Math.PI * 0.95, Math.PI * 2.05); g.quadraticCurveTo(x + f * 10 * s, y + 2 * s, x + f * 6 * s, y + 4 * s); g.lineTo(x + f * 2 * s, y - 4 * s); g.lineTo(x - f * 2 * s, y + 2 * s); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#c9d2ff'; g.beginPath(); g.arc(x - f * 9 * s, y - 6 * s, 2.2 * s, 0, TAU); g.fill(); },
    torsoDetail(g, J, s) { const { hip, sh, up } = J; const px = -up[1], py = up[0]; const c = [lerp(hip[0], sh[0], 0.62), lerp(hip[1], sh[1], 0.62)]; g.fillStyle = this.top2; g.strokeStyle = OL; g.lineWidth = 2; g.beginPath(); g.ellipse(c[0] + J.face * 1.5 * s, c[1], 7.5 * s, 8.5 * s, Math.atan2(up[1], up[0]) + Math.PI / 2, 0, TAU); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(c[0] - 1.5 * s, c[1] - 2.5 * s, 2.5 * s, 3.5 * s, 0.4, 0, TAU); g.fill(); g.strokeStyle = this.belt; g.lineWidth = 3.5 * s; g.beginPath(); g.moveTo(hip[0] + px * 8 * s, hip[1] + py * 8 * s); g.lineTo(hip[0] - px * 8 * s, hip[1] - py * 8 * s); g.stroke(); },
  },
  { // PIP — young spellslinger
    skin: '#ffe0bd', hair: '#f5d76e', top: '#4cc35a', top2: '#ffd23c', pants: '#3b5b3f', boots: '#7a5230', arm: '#3fae54', fore: '#3fae54', hand: '#ffe0bd', belt: '#ffd23c', thick: 0.9, headScale: 1.12, headUp: 0,
    robe(g, J, s) { const { hip, up } = J; const px = -up[1], py = up[0]; const k = [lerp(J.k1[0], J.k2[0], 0.5), Math.max(J.k1[1], J.k2[1]) + 3 * s]; g.beginPath(); g.moveTo(hip[0] + px * 9 * s, hip[1] + py * 9 * s); g.lineTo(k[0] + 13 * s, k[1]); g.quadraticCurveTo(k[0], k[1] + 4 * s, k[0] - 13 * s, k[1]); g.lineTo(hip[0] - px * 9 * s, hip[1] - py * 9 * s); g.closePath(); fillShaded(g, this.top, hip[0], hip[1] + 8 * s, 16 * s); g.strokeStyle = this.top2; g.lineWidth = 2.2 * s; g.beginPath(); g.moveTo(k[0] + 12 * s, k[1] - 1 * s); g.quadraticCurveTo(k[0], k[1] + 3 * s, k[0] - 12 * s, k[1] - 1 * s); g.stroke(); },
    hairDraw(g, J, s) { const [x, y] = J.hd, f = J.face; g.fillStyle = this.hair; g.strokeStyle = OL; g.lineWidth = 2; for (let i = -1; i <= 1; i++) { g.beginPath(); g.ellipse(x - f * 8 * s + i * 4 * s, y + 3 * s + Math.abs(i) * 2 * s, 3.5 * s, 5 * s, 0.3 * i, 0, TAU); g.fill(); g.stroke(); } },
    headAcc(g, J, s, t) { const [x, y] = J.hd, f = J.face; let tip = Math.sin(t * 0.08) * 3, ty = 0; if (J.cl) { const W = wobble(J.cl, 'hat', x - f * 12 * s, y - 34 * s, 0.16, 0.8); tip = clamp((W.x - (x - f * 12 * s)) * f / s, -9, 9) + Math.sin(t * 0.08) * 1.5; ty = clamp((W.y - (y - 34 * s)) / s, -5, 6); } g.fillStyle = this.top; g.strokeStyle = OL; g.lineWidth = 2.6; g.beginPath(); g.moveTo(x - 16 * s, y - 6.5 * s); g.quadraticCurveTo(x - f * 2 * s, y - 16 * s, x - f * (12 - tip) * s, y - (34 - ty) * s); g.quadraticCurveTo(x + f * 6 * s, y - 16 * s, x + 16 * s, y - 6.5 * s); g.closePath(); fillShaded(g, this.top, x, y - 16 * s, 14 * s); g.fillStyle = shade(this.top, -0.38); g.beginPath(); g.ellipse(x, y - 7 * s, 18 * s, 4 * s, 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = this.top2; g.fillRect(x - 11 * s, y - 12.5 * s, 22 * s, 3.5 * s); g.fillStyle = '#fff6a0'; star(g, x - f * (10 - tip * 0.7) * s, y - (30 - ty * 0.8) * s, 3.4 * s); },
    torsoDetail(g, J, s) { const { hip, sh, up } = J; const px = -up[1], py = up[0]; g.strokeStyle = this.top2; g.lineWidth = 2.5 * s; g.beginPath(); g.moveTo(sh[0], sh[1] + 1 * s); g.lineTo(hip[0], hip[1]); g.stroke(); g.strokeStyle = '#8a5a2b'; g.lineWidth = 3.5 * s; g.beginPath(); g.moveTo(hip[0] + px * 8 * s + up[0] * 3 * s, hip[1] + py * 8 * s + up[1] * 3 * s); g.lineTo(hip[0] - px * 8 * s + up[0] * 3 * s, hip[1] - py * 8 * s + up[1] * 3 * s); g.stroke(); },
  },
  { // GROM — mountain smith
    skin: '#e0ac69', hair: '#d9822b', top: '#f2a33a', top2: '#8d6e4c', pants: '#5b4033', boots: '#3b2a20', arm: 'skin', fore: 'skin', hand: '#7a5a3a', belt: '#4a3222', thick: 1.3, wide: 1.25, bootBig: 1.25,
    hairDraw(g, J, s) { const [x, y] = J.hd, f = J.face; let bx = 0, by = 0; if (J.cl) { const W = wobble(J.cl, 'beard', x + f * 2 * s, y + 19 * s, 0.2, 0.74); bx = clamp(W.x - (x + f * 2 * s), -7 * s, 7 * s); by = clamp(W.y - (y + 19 * s), -4 * s, 5 * s); } g.fillStyle = this.hair; g.strokeStyle = OL; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x + f * 11 * s, y + 0 * s); g.quadraticCurveTo(x + f * 14 * s + bx * 0.4, y + 14 * s, x + f * 4 * s + bx, y + 20 * s + by); g.lineTo(x + f * 1 * s + bx * 0.7, y + 15 * s + by * 0.5); g.lineTo(x - f * 3 * s + bx, y + 19 * s + by); g.quadraticCurveTo(x - f * 8 * s, y + 10 * s, x - f * 6 * s, y + 2 * s); g.closePath(); g.fill(); g.stroke(); g.strokeStyle = shade(this.hair, -0.25); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + f * 6 * s, y + 6 * s); g.lineTo(x + f * 4 * s, y + 15 * s); g.stroke(); },
    headAcc(g, J, s) { const [x, y] = J.hd, f = J.face; g.strokeStyle = OL; g.lineWidth = 2.4; for (const sd of [-1, 1]) { g.fillStyle = '#f2efe6'; g.beginPath(); g.moveTo(x + sd * 9 * s, y - 6 * s); g.quadraticCurveTo(x + sd * 22 * s, y - 10 * s, x + sd * 20 * s, y - 24 * s); g.quadraticCurveTo(x + sd * 15 * s, y - 13 * s, x + sd * 6 * s, y - 11 * s); g.closePath(); g.fill(); g.stroke(); } g.beginPath(); g.arc(x, y - 2 * s, 12.5 * s, Math.PI, 0); g.closePath(); fillShaded(g, '#8a96a3', x, y - 8 * s, 12 * s); g.fillStyle = '#5f6b78'; g.fillRect(x - 13 * s, y - 4 * s, 26 * s, 3.5 * s); g.fillStyle = '#ffd23c'; g.beginPath(); g.arc(x, y - 9 * s, 2 * s, 0, TAU); g.fill(); },
    torsoDetail(g, J, s) { const { hip, sh, up } = J; const px = -up[1], py = up[0]; g.fillStyle = this.top2; g.strokeStyle = OL; g.lineWidth = 2.2; g.beginPath(); g.ellipse(sh[0] - px * 2 * s, sh[1] + 1 * s, 11 * s, 7 * s, Math.atan2(py, px), 0, TAU); g.fill(); g.stroke(); g.strokeStyle = shade(this.top2, 0.3); g.lineWidth = 1.2; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(sh[0] + px * i * 3 * s, sh[1] - 3 * s); g.lineTo(sh[0] + px * i * 3.5 * s, sh[1] + 4 * s); g.stroke(); } g.strokeStyle = this.belt; g.lineWidth = 5.5 * s; g.beginPath(); g.moveTo(hip[0] + px * 11 * s + up[0] * 2 * s, hip[1] + py * 11 * s + up[1] * 2 * s); g.lineTo(hip[0] - px * 11 * s + up[0] * 2 * s, hip[1] - py * 11 * s + up[1] * 2 * s); g.stroke(); g.fillStyle = '#ffd23c'; g.strokeStyle = OL; g.lineWidth = 1.5; g.fillRect(hip[0] + up[0] * 2 * s - 4 * s, hip[1] + up[1] * 2 * s - 3.5 * s, 8 * s, 7 * s); g.strokeRect(hip[0] + up[0] * 2 * s - 4 * s, hip[1] + up[1] * 2 * s - 3.5 * s, 8 * s, 7 * s); },
  },
];
const RIVAL_TINT = { skin: '#3a2f52', hair: '#1a1326', top: '#2b2140', top2: '#4a3a6a', pants: '#1e1730', boots: '#231a35', arm: '#2b2140', fore: '#2b2140', hand: '#1e1730', belt: '#140e20' };
// alternate outfits: when two players pick the same fighter, the later one wears a different palette so they can be told apart
const ALT_ART = [
  [{ top: '#2f6fd6', pants: '#e8e2d4', boots: '#2f6fd6', band: '#3f8de8', hair: '#5a3b22' }, { top: '#2a2a33', top2: '#ffd23c', pants: '#7a1f1f', boots: '#d9a400', band: '#ffd23c', hair: '#d9d9e0' }],
  [{ hair: '#b5342f', top: '#e8e2d4', top2: '#f0c9c0', arm: '#8a2a2a', fore: '#8a2a2a', pants: '#3a2222', scarf: '#ffd9a0' }, { hair: '#e9e4f5', top: '#6b3fb8', arm: '#4a2a86', fore: '#4a2a86', pants: '#241a3a', scarf: '#ffb3e6' }],
  [{ top: '#8a4fd8', arm: '#7a3fc4', fore: '#7a3fc4', pants: '#3a2a5b', hair: '#ffd0e4' }, { top: '#d64b3b', arm: '#b83a2c', fore: '#b83a2c', pants: '#5b2a2a', hair: '#8a5a2b' }],
  [{ top: '#4f9bd8', top2: '#6d7a8c', pants: '#2f3b4a', hair: '#e6e6ea' }, { top: '#6fb04a', top2: '#7a6a3c', pants: '#3b3320', hair: '#2b1d14' }],
];
function artFor(fid, rival, alt) { const A = ART[fid]; if (!rival && alt > 0) { A._alt = A._alt || {}; return A._alt[alt] || (A._alt[alt] = Object.assign(Object.create(A), ALT_ART[fid][(alt - 1) % ALT_ART[fid].length])); } if (!rival) return A; if (!A._rival) { A._rival = Object.assign(Object.create(A), RIVAL_TINT, { rival: 1 }); } return A._rival; }
function star(g, x, y, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const rr2 = i % 2 ? r * 0.45 : r; const a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } g.closePath(); g.fill(); }

// --- face ---
function drawFace(g, J, A, s, expr, eyeCol) {
  const [x, y] = J.hd, f = J.face; const t = World.frame;
  const blink = expr === 'normal' && (t + (J.seed || 0)) % 200 < 6;
  const ex1 = x + f * 6 * s, ex2 = x + f * 0.5 * s, ey = y - 0.5 * s;
  if (expr === 'happy') { // closed, smiling eyes and an open grin (taunts, victory)
    g.strokeStyle = OL; g.lineWidth = 2 * s; g.lineCap = 'round'; for (const [ex, sz] of [[ex1, 1], [ex2, 0.82]]) { g.beginPath(); g.arc(ex, ey + 1.2 * s, 2.6 * s * sz, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    g.lineCap = 'butt'; g.fillStyle = '#7a2e2e'; g.beginPath(); g.arc(x + f * 4 * s, y + 4.2 * s, 3 * s, 0.05, Math.PI - 0.05); g.closePath(); g.fill(); g.lineWidth = 1.4 * s; g.stroke(); return;
  }
  if (expr === 'effort') { // squeezed eyes and gritted teeth (charging, heavy wind-ups)
    g.strokeStyle = OL; g.lineWidth = 2 * s; for (const [ex, sz] of [[ex1, 1], [ex2, 0.82]]) { g.beginPath(); g.moveTo(ex - 2.4 * s * sz, ey - 1.6 * s); g.lineTo(ex + 2 * s * sz, ey + 0.4 * s); g.lineTo(ex - 2.4 * s * sz, ey + 1.8 * s); g.stroke(); }
    g.fillStyle = '#fff'; g.fillRect(x + f * 1.5 * s - (f < 0 ? 5 * s : 0), y + 4.6 * s, 5 * s, 2.6 * s); g.lineWidth = 1.2 * s; g.strokeRect(x + f * 1.5 * s - (f < 0 ? 5 * s : 0), y + 4.6 * s, 5 * s, 2.6 * s); g.beginPath(); g.moveTo(x + f * 4 * s, y + 4.6 * s); g.lineTo(x + f * 4 * s, y + 7.2 * s); g.stroke(); return;
  }
  if (expr === 'hurt') { g.strokeStyle = OL; g.lineWidth = 2 * s; for (const ex of [ex1, ex2]) { g.beginPath(); g.moveTo(ex - 2 * s, ey - 2 * s); g.lineTo(ex + 2 * s, ey); g.lineTo(ex - 2 * s, ey + 2 * s); g.stroke(); } g.beginPath(); g.arc(x + f * 4 * s, y + 6 * s, 2 * s, 0, Math.PI, true); g.stroke(); return; }
  for (const [ex, sz] of [[ex1, 1], [ex2, 0.82]]) {
    if (blink) { g.strokeStyle = OL; g.lineWidth = 1.8 * s; g.beginPath(); g.moveTo(ex - 2 * s * sz, ey); g.lineTo(ex + 2 * s * sz, ey); g.stroke(); continue; }
    g.fillStyle = A.rival ? eyeCol : '#ffffff'; g.beginPath(); g.ellipse(ex, ey, 2.4 * s * sz, 3.4 * s * sz, 0, 0, TAU); g.fill();
    if (!A.rival) { const lx = (J.look || 0) * 0.9 * s * f - (J.look < -0.3 ? f * 0.5 * s : 0), ly = (J.lookY || 0) * 0.7 * s; g.fillStyle = OL; g.beginPath(); g.ellipse(ex + f * 0.8 * s + lx, ey + 0.3 * s + ly, 1.4 * s * sz, 2.2 * s * sz, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + f * 0.3 * s + lx, ey - 1 * s + ly, 0.6 * s, 0, TAU); g.fill(); }
  }
  // brows
  g.strokeStyle = A.rival ? eyeCol : OL; g.lineWidth = 1.8 * s; const ang = expr === 'fight' ? 0.45 : 0.1;
  for (const ex of [ex1, ex2]) { g.beginPath(); g.moveTo(ex - f * 2.6 * s, ey - 5 * s - Math.sin(ang) * 1.5 * s); g.lineTo(ex + f * 2.6 * s, ey - 5 * s + Math.sin(ang) * 2 * s); g.stroke(); }
  if (!A.rival) { g.strokeStyle = shade(A.skin, -0.45); g.lineWidth = 1.5 * s; g.beginPath(); if (expr === 'fight') { g.moveTo(x + f * 2 * s, y + 6.5 * s); g.lineTo(x + f * 6.5 * s, y + 6 * s); } else { g.arc(x + f * 4 * s, y + 4.5 * s, 2.2 * s, 0.2, Math.PI - 0.2); } g.stroke(); }
}

// --- the body renderer ---
function drawBody(g, x, y, face, pose, A, s, o = {}) {
  const J = joints(x, y, face, pose, s, A); J.seed = o.seed || 0; J.vx = o.vx || 0;
  if (o.head) { J.hd = [J.hd[0] + o.head.x * s, J.hd[1] + o.head.y * s]; J.nk = [J.nk[0] + o.head.x * s * 0.4, J.nk[1] + o.head.y * s * 0.4]; }
  J.cl = o.cloth || null; J.look = o.look || 0; J.lookY = o.lookY || 0;
  const t = World.frame, th = A.thick || 1, wd = A.wide || 1;
  const flash = o.flash; const C = c => flash ? '#ffffff' : (c === 'skin' ? A.skin : c);
  const backDark = c => flash ? '#e8e8e8' : shade(C(c), -0.28);
  const wThigh = 10 * s * th, wShin = 8.6 * s * th, wUp = 7.8 * s * th, wFore = 7 * s * th;
  const hs = (A.headScale || 1) * s;
  // back limbs (darker for depth)
  const backLeg = p => { seg(g, J.hip, J.k2, wThigh, backDark(A.pants), p); seg(g, J.k2, J.f2, wShin, backDark(A.pants), p); boot(g, J.k2, J.f2, face, s, backDark(A.boots), p, A.bootBig || 1); };
  const backArm = p => { seg(g, J.sh, J.e2, wUp, backDark(A.arm), p); seg(g, J.e2, J.h2, wFore, backDark(A.fore), p); ball(g, J.h2, 4.6 * s * th, backDark(A.hand), p); };
  for (const p of [0, 1, 2]) { backLeg(p); backArm(p); }
  if (A.back) A.back(g, J, s, t);
  // front leg
  const frontLeg = p => { seg(g, J.hip, J.k1, wThigh, C(A.pants), p); seg(g, J.k1, J.f1, wShin, C(A.pants), p); boot(g, J.k1, J.f1, face, s, C(A.boots), p, A.bootBig || 1); };
  for (const p of [0, 1, 2]) frontLeg(p);
  if (A.robe && !flash) A.robe(g, J, s);
  // torso
  torsoPath(g, J, 15 * s * wd, 19 * s * wd); fillShaded(g, C(A.top), lerp(J.hip[0], J.sh[0], 0.5), lerp(J.hip[1], J.sh[1], 0.5), 14 * s);
  if (!flash && A.torsoDetail) A.torsoDetail(g, J, s);
  // neck + head
  seg(g, J.sh, J.nk, 6 * s, C('skin'), 0); seg(g, J.sh, J.nk, 6 * s, C('skin'), 1);
  const [hx, hy] = J.hd; const hr = 11.2 * hs;
  g.beginPath(); g.arc(hx, hy, hr, 0, TAU); const gr = g.createRadialGradient(hx - J.face * 3 * s, hy - 4 * s, 2, hx, hy, hr); gr.addColorStop(0, shade(C('skin'), 0.25)); gr.addColorStop(1, shade(C('skin'), -0.18)); g.fillStyle = flash ? '#fff' : gr; g.fill(); g.strokeStyle = OL; g.lineWidth = 2.6; g.stroke();
  if (!flash) {
    const Jh = hs !== s ? { ...J, s: hs } : J;
    A.hairDraw && A.hairDraw(g, Jh, hs);
    drawFace(g, Jh, A, hs, o.expr || 'normal', o.eye || '#fff');
    A.headAcc && A.headAcc(g, Jh, hs, t);
  }
  // weapon then front arm
  if (o.weapon) o.weapon(J);
  const frontArm = p => { seg(g, J.sh, J.e1, wUp, C(A.arm), p); seg(g, J.e1, J.h1, wFore, C(A.fore), p); ball(g, J.h1, 4.8 * s * th, C(A.hand), p); };
  for (const p of [0, 1, 2]) frontArm(p);
  return J;
}

// --- detailed weapons ---
function drawWeaponHD(g, kind, hx, hy, face, wdeg, s, o = {}) {
  const a = deg(wdeg); const dx = face * Math.cos(a), dy = Math.sin(a); const ang = Math.atan2(dy, dx);
  g.save(); g.translate(hx, hy); g.rotate(ang); g.lineJoin = 'round';
  if (kind === 'sword') {
    const L = (o.len || 44) * s;
    g.fillStyle = OL; g.fillRect(-10 * s, -2.6 * s, 12 * s, 5.2 * s);
    g.fillStyle = '#5a3d2b'; g.fillRect(-9 * s, -1.8 * s, 10 * s, 3.6 * s);
    g.beginPath(); g.moveTo(4 * s, -3.4 * s); g.lineTo(L, -2 * s); g.lineTo(L + 7 * s, 0); g.lineTo(L, 2 * s); g.lineTo(4 * s, 3.4 * s); g.closePath();
    const gr = g.createLinearGradient(0, -3.4 * s, 0, 3.4 * s); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, o.blade || '#cfe0f5'); gr.addColorStop(1, '#7d93b2'); g.fillStyle = gr; g.fill(); g.strokeStyle = OL; g.lineWidth = 2; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(8 * s, -1 * s); g.lineTo(L - 2 * s, -0.6 * s); g.stroke();
    g.fillStyle = '#ffd23c'; g.strokeStyle = OL; g.lineWidth = 1.8; g.beginPath(); g.roundRect ? g.roundRect(1 * s, -7 * s, 4 * s, 14 * s, 2) : g.rect(1 * s, -7 * s, 4 * s, 14 * s); g.fill(); g.stroke();
    g.fillStyle = '#4aa3ff'; g.beginPath(); g.arc(-11 * s, 0, 2.6 * s, 0, TAU); g.fill(); g.stroke();
  } else if (kind === 'staff') {
    const L = 34 * s;
    g.strokeStyle = OL; g.lineWidth = 6 * s; g.beginPath(); g.moveTo(-14 * s, 0); g.lineTo(L, 0); g.stroke();
    g.strokeStyle = '#8a5a2b'; g.lineWidth = 3.6 * s; g.stroke(); g.strokeStyle = '#b07a44'; g.lineWidth = 1.2 * s; g.beginPath(); g.moveTo(-13 * s, -0.8 * s); g.lineTo(L - 1 * s, -0.8 * s); g.stroke();
    g.strokeStyle = '#ffd23c'; g.lineWidth = 2.4 * s; g.beginPath(); g.arc(L + 5 * s, 0, 6 * s, Math.PI * 0.6, Math.PI * 1.4); g.stroke();
    const glow = o.glow || '#9dff8a'; g.save(); g.globalCompositeOperation = 'lighter'; const gg = g.createRadialGradient(L + 6 * s, 0, 0, L + 6 * s, 0, 14 * s); gg.addColorStop(0, rgba(glow, 0.9)); gg.addColorStop(1, rgba(glow, 0)); g.fillStyle = gg; g.beginPath(); g.arc(L + 6 * s, 0, 14 * s, 0, TAU); g.fill(); g.restore();
    g.fillStyle = '#eaffdf'; g.strokeStyle = OL; g.lineWidth = 1.8; g.beginPath(); g.moveTo(L + 6 * s, -6 * s); g.lineTo(L + 10 * s, 0); g.lineTo(L + 6 * s, 6 * s); g.lineTo(L + 2 * s, 0); g.closePath(); g.fill(); g.stroke();
  } else if (kind === 'hammer') {
    const L = 32 * s;
    g.strokeStyle = OL; g.lineWidth = 7 * s; g.beginPath(); g.moveTo(-6 * s, 0); g.lineTo(L, 0); g.stroke(); g.strokeStyle = '#6b4a2a'; g.lineWidth = 4.4 * s; g.stroke();
    g.strokeStyle = '#3b2a1a'; g.lineWidth = 4.4 * s; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo((-2 + i * 4) * s, 0); g.lineTo((0 + i * 4) * s, 0); g.stroke(); }
    g.translate(L, 0);
    g.beginPath(); g.roundRect ? g.roundRect(-8 * s, -14 * s, 18 * s, 28 * s, 3 * s) : g.rect(-8 * s, -14 * s, 18 * s, 28 * s);
    const gr = g.createLinearGradient(-8 * s, 0, 10 * s, 0); gr.addColorStop(0, '#9aa5b1'); gr.addColorStop(0.4, '#d5dde5'); gr.addColorStop(1, '#5f6b78'); g.fillStyle = gr; g.fill(); g.strokeStyle = OL; g.lineWidth = 2.4; g.stroke();
    g.fillStyle = '#f2a33a'; g.fillRect(-8 * s, -3 * s, 18 * s, 6 * s); g.strokeRect(-8 * s, -3 * s, 18 * s, 6 * s);
    g.fillStyle = '#ffd23c'; g.beginPath(); g.arc(1 * s, 0, 2 * s, 0, TAU); g.fill();
  }
  g.restore();
}
function dropShadow(g, x, y, w) {
  const gy = groundBelow(x, y - 2, 500); if (gy === null) return; const hgt = gy - y; const k = clamp(1 - hgt / 400, 0.15, 1);
  g.fillStyle = `rgba(0,0,0,${0.28 * k})`; g.beginPath(); g.ellipse(x, gy + 1, w * (0.6 + 0.4 * k), 4.5 * k + 1.5, 0, 0, TAU); g.fill();
}
// head-only portrait (HUD, menus)
function drawPortrait(g, fid, x, y, r, rival, alt) {
  const A = artFor(fid, rival, alt); const s = r / 13; const J = { hd: [x, y], face: 1, s, up: [0, -1] };
  g.beginPath(); g.arc(x, y, 11.2 * s * (A.headScale || 1), 0, TAU); const gr = g.createRadialGradient(x - 3 * s, y - 4 * s, 2, x, y, 12 * s); gr.addColorStop(0, shade(A.skin, 0.25)); gr.addColorStop(1, shade(A.skin, -0.18)); g.fillStyle = gr; g.fill(); g.strokeStyle = OL; g.lineWidth = 2.6; g.stroke();
  const hs = s * (A.headScale || 1); const Jh = { ...J, s: hs };
  A.hairDraw && A.hairDraw(g, Jh, hs); drawFace(g, Jh, A, hs, 'fight', FIGHTERS[fid].color); A.headAcc && A.headAcc(g, Jh, hs, World.frame);
}
