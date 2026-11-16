'use strict';
/* =====================================================================
   TheTalaVillage · arte procedural
   - Talamones: dibujados con formas (pixelados a 64×64, o en vector grande para el logo)
   - Personas: pixel-art 16×24 con 4 direcciones y 3 pasos
   - Edificios, árboles y objetos del pueblo
   ===================================================================== */
const OUT = '#1d1a26';
function MonG(x, opt = {}) { this.x = x; this.back = !!opt.back; this.vec = !!opt.vec; this.lw = this.vec ? .5 : .9; }
MonG.prototype = {
  _sh(path, col, b, opt = {}) { // relleno con volumen: sombra abajo-derecha y brillo arriba-izquierda
    const x = this.x; x.fillStyle = col; x.fill(path);
    if (opt.flat) { this._ol(path, col); return; }
    x.save(); x.clip(path);
    x.fillStyle = shade(col, -.26); x.beginPath(); x.ellipse(b.cx + b.rx * .25, b.cy + b.ry * .35, b.rx * 1.25, b.ry * 1.25, 0, 0, 7); x.fill();
    x.fillStyle = col; x.beginPath(); x.ellipse(b.cx - b.rx * .12, b.cy - b.ry * .14, b.rx * .98, b.ry * .9, 0, 0, 7); x.fill();
    if (!opt.nohi) { x.fillStyle = shade(col, .38); x.beginPath(); x.ellipse(b.cx - b.rx * .42, b.cy - b.ry * .48, Math.max(1.2, b.rx * .22), Math.max(1, b.ry * .15), -.5, 0, 7); x.fill(); }
    x.restore(); this._ol(path, col);
  },
  _ol(path, col) { const x = this.x; x.lineWidth = this.lw; x.strokeStyle = this.vec ? '#151218' : shade(col, -.62); x.stroke(path); },
  ell(cx, cy, rx, ry, col, opt) { const p = new Path2D(); p.ellipse(cx, cy, rx, ry, opt && opt.rot || 0, 0, Math.PI * 2); this._sh(p, col, { cx, cy, rx, ry }, opt || {}); return this; },
  circ(cx, cy, r, col, opt) { return this.ell(cx, cy, r, r, col, opt); },
  poly(pts, col, opt) { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath(); this._sh(p, col, this._bb(pts), opt || {}); return this; },
  blob(pts, col, opt) { // curva suave cerrada por los puntos
    const p = new Path2D(), n = pts.length; const P = i => pts[(i + n) % n];
    p.moveTo((P(0)[0] + P(1)[0]) / 2, (P(0)[1] + P(1)[1]) / 2);
    for (let i = 1; i <= n; i++) { const a = P(i), b = P(i + 1); p.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    p.closePath(); this._sh(p, col, this._bb(pts), opt || {}); return this;
  },
  _bb(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [a, b] of pts) { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, a); y1 = Math.max(y1, b); } return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2, ry: (y1 - y0) / 2 }; },
  line(x0, y0, x1, y1, w, col) { const x = this.x; x.lineCap = 'round'; x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); return this; },
  curve(pts, w, col) { const x = this.x; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) x.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2); const l = pts[pts.length - 1]; x.lineTo(l[0], l[1]); x.stroke(); return this; },
  dot(cx, cy, r, col) { const x = this.x; x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); return this; },
  // ---- cara (no se dibuja de espaldas) ----
  eye(cx, cy, s = 3, st = 'big', look = 0) {
    if (this.back) return this; const x = this.x;
    if (st === 'happy') { x.strokeStyle = OUT; x.lineWidth = s * .55; x.lineCap = 'round'; x.beginPath(); x.arc(cx, cy + s * .3, s * .8, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); return this; }
    if (st === 'closed') { this.line(cx - s * .8, cy, cx + s * .8, cy, s * .45, OUT); return this; }
    if (st === 'dot') { this.dot(cx, cy, s * .55, OUT); this.dot(cx - s * .15, cy - s * .2, s * .18, '#fff'); return this; }
    x.fillStyle = '#fff'; x.beginPath(); x.ellipse(cx, cy, s, s * 1.15, 0, 0, 7); x.fill(); x.lineWidth = this.lw; x.strokeStyle = OUT; x.stroke();
    const pr = st === 'small' ? s * .45 : s * .66; x.fillStyle = OUT; x.beginPath(); x.ellipse(cx + look * s * .3, cy + s * .12, pr, pr * 1.12, 0, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(cx + look * s * .3 - pr * .35, cy - pr * .25, Math.max(.6, pr * .38), 0, 7); x.fill();
    if (st === 'angry') { this.line(cx - s * 1.1, cy - s * 1.35, cx + s * 1.1, cy - s * .65, s * .55, OUT); }
    if (st === 'angryL') { this.line(cx - s * 1.1, cy - s * .65, cx + s * 1.1, cy - s * 1.35, s * .55, OUT); }
    if (st === 'sleepy') { x.fillStyle = this._lid || '#888'; x.beginPath(); x.ellipse(cx, cy - s * .35, s * 1.05, s * .75, 0, Math.PI, 0); x.fill(); }
    return this;
  },
  eyes(cx, cy, gap, s, st, look) { return this.eye(cx - gap / 2, cy, s, st, look).eye(cx + gap / 2, cy, s, st === 'angry' ? 'angryL' : st, look); },
  mouth(cx, cy, w = 4, st = 'smile', col) {
    if (this.back) return this; const x = this.x; x.strokeStyle = OUT; x.lineWidth = Math.max(.8, w * .22); x.lineCap = 'round';
    if (st === 'smile') { x.beginPath(); x.arc(cx, cy - w * .35, w * .6, Math.PI * .2, Math.PI * .8); x.stroke(); }
    else if (st === 'flat') { this.line(cx - w * .5, cy, cx + w * .5, cy, x.lineWidth, OUT); }
    else if (st === 'frown') { x.beginPath(); x.arc(cx, cy + w * .45, w * .55, Math.PI * 1.2, Math.PI * 1.8); x.stroke(); }
    else if (st === 'open' || st === 'o') { x.fillStyle = '#7a2230'; x.beginPath(); x.ellipse(cx, cy, w * .5, st === 'o' ? w * .5 : w * .38, 0, 0, 7); x.fill(); x.stroke(); if (st === 'open') { x.fillStyle = '#e87a8a'; x.beginPath(); x.ellipse(cx, cy + w * .18, w * .28, w * .14, 0, 0, 7); x.fill(); } }
    else if (st === 'fang') { x.beginPath(); x.arc(cx, cy - w * .35, w * .6, Math.PI * .2, Math.PI * .8); x.stroke(); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(cx + w * .1, cy + w * .12); x.lineTo(cx + w * .35, cy + w * .12); x.lineTo(cx + w * .22, cy + w * .55); x.closePath(); x.fill(); x.lineWidth = .5; x.stroke(); }
    else if (st === 'grin') { x.fillStyle = '#fff'; x.beginPath(); x.ellipse(cx, cy, w * .6, w * .3, 0, 0, Math.PI); x.fill(); x.stroke(); this.line(cx - w * .6, cy, cx + w * .6, cy, .6, OUT); }
    return this;
  },
  blush(cx, cy, r = 2.2, col = '#ff8fa3') { if (this.back) return this; const x = this.x; x.globalAlpha = .75; x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, r, r * .6, 0, 0, 7); x.fill(); x.globalAlpha = 1; return this; },
  stache(cx, cy, w, col = '#4a2f1d') { // bigote retorcido de barbero
    if (this.back) return this; const h = w * .32;
    const p = [[cx, cy - h * .2], [cx + w * .3, cy - h * .7], [cx + w * .5, cy - h * .1], [cx + w * .62, cy - h * 1.1], [cx + w * .48, cy + h * .5], [cx + w * .15, cy + h * .45], [cx, cy + h * .1],
      [cx - w * .15, cy + h * .45], [cx - w * .48, cy + h * .5], [cx - w * .62, cy - h * 1.1], [cx - w * .5, cy - h * .1], [cx - w * .3, cy - h * .7]];
    this.blob(p, col, { nohi: 1 }); return this;
  },
  brows(cx, cy, gap, w, col = '#3a2a1a', tilt = .3) { if (this.back) return this; this.line(cx - gap / 2 - w / 2, cy - tilt * w, cx - gap / 2 + w / 2, cy + tilt * w, w * .45, col); this.line(cx + gap / 2 - w / 2, cy + tilt * w, cx + gap / 2 + w / 2, cy - tilt * w, w * .45, col); return this; },
  pine(cx, by, h, col = '#3f7a4b', trunk = '#6b4426') { // pino como los del escudo (copa redondeada)
    this.poly([[cx - 1.3, by], [cx + 1.3, by], [cx + 1, by - h * .35], [cx - 1, by - h * .35]], trunk, { flat: 1 });
    const r = h * .3; this.circ(cx - r * .8, by - h * .5, r * .8, col).circ(cx + r * .8, by - h * .52, r * .85, col).circ(cx, by - h * .72, r, shade(col, .06)); return this;
  },
  cone(cx, by, h, w, col = '#2f6b3f') { // pino cónico
    for (let i = 0; i < 3; i++) { const t = by - i * h * .28; this.poly([[cx - w * (1 - i * .22), t], [cx + w * (1 - i * .22), t], [cx, t - h * .45]], shade(col, i * .05)); } return this;
  },
  flame(cx, by, h, c1 = '#ff8a1e', c2 = '#ffd84a') {
    const w = h * .42; this.blob([[cx, by - h], [cx + w * .45, by - h * .55], [cx + w, by - h * .3], [cx + w * .8, by], [cx - w * .8, by], [cx - w, by - h * .35], [cx - w * .3, by - h * .5]], c1, { nohi: 1 });
    this.blob([[cx + w * .05, by - h * .62], [cx + w * .5, by - h * .2], [cx + w * .35, by - h * .02], [cx - w * .35, by - h * .02], [cx - w * .45, by - h * .25]], c2, { flat: 1 }); return this;
  },
  leaf(cx, cy, len, ang, col = '#5fae4a') { const c = Math.cos(ang), s = Math.sin(ang), w = len * .32; const P = (a, b) => [cx + a * c - b * s, cy + a * s + b * c]; this.blob([P(0, 0), P(len * .5, -w), P(len, 0), P(len * .5, w)], col); this.line(...P(len * .1, 0), ...P(len * .85, 0), .5, shade(col, -.4)); return this; },
  wing(cx, cy, len, ang, col) { const c = Math.cos(ang), s = Math.sin(ang); const P = (a, b) => [cx + a * c - b * s, cy + a * s + b * c]; this.blob([P(0, -len * .2), P(len * .6, -len * .5), P(len, -len * .25), P(len * .9, len * .1), P(len * .5, len * .15), P(0, len * .2)], col); return this; },
  swirl(cx, cy, r, col = '#ffffff', w = 1.2) { const x = this.x; x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); for (let t = 0; t < 9; t += .25) { const rr = r * t / 9, a = t * 1.2; const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr; t ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); return this; },
  sparkle(cx, cy, r, col = '#fff7a8') { this.poly([[cx, cy - r], [cx + r * .3, cy - r * .3], [cx + r, cy], [cx + r * .3, cy + r * .3], [cx, cy + r], [cx - r * .3, cy + r * .3], [cx - r, cy], [cx - r * .3, cy - r * .3]], col, { flat: 1 }); return this; },
  feet(cx, cy, gap, r, col) { return this.ell(cx - gap / 2, cy, r, r * .6, col).ell(cx + gap / 2, cy, r, r * .6, col); },
};

/* ---------------- Diseños de los Talamones ---------------- */
const ROD = '#b8664b', PINO = '#3f7a4b', BIG = '#4a2f1d';
const ART = {
  rodenin: g => { g.feet(32, 58, 14, 5, shade(ROD, -.1)); g.ell(17, 46, 4, 3, ROD).ell(47, 46, 4, 3, ROD);
    g.blob([[16, 44], [20, 33], [30, 29], [42, 31], [49, 40], [48, 52], [38, 58], [24, 58], [16, 52]], ROD);
    g.line(22, 50, 26, 54, .8, shade(ROD, -.35)); g.pine(33, 33, 26, PINO); g.ell(33, 12, 4, 3, shade(PINO, .1)); // tupé
    g.eyes(32, 40, 13, 3.6, 'big'); g.stache(32, 47.5, 20, BIG); g.mouth(32, 51.5, 3, 'smile'); g.blush(22, 46, 2).blush(42, 46, 2); },
  rodenazo: g => { g.feet(32, 59, 22, 6, shade(ROD, -.1)); g.ell(10, 42, 6, 5, ROD).ell(54, 42, 6, 5, ROD);
    g.blob([[10, 40], [16, 28], [30, 23], [46, 26], [55, 38], [53, 52], [42, 60], [22, 60], [12, 52]], ROD); g.line(18, 36, 22, 44, 1, shade(ROD, -.35)).line(46, 48, 50, 52, 1, shade(ROD, -.35));
    g.pine(25, 27, 22, PINO).pine(40, 28, 26, PINO); g.eyes(32, 37, 16, 3.8, 'angry'); g.stache(32, 46, 30, BIG); g.mouth(32, 51, 4, 'fang'); },
  penaskin: g => { g.poly([[14, 40], [50, 40], [58, 62], [6, 62]], '#c9353c'); for (let i = 0; i < 4; i++) g.line(12 + i * 13, 44, 9 + i * 14, 61, 2.4, '#f2f2f2'); // capa de barbero
    g.blob([[8, 38], [12, 24], [24, 17], [40, 17], [54, 24], [57, 40], [50, 52], [14, 52]], ROD); g.line(14, 30, 19, 38, 1, shade(ROD, -.35)).line(48, 30, 44, 37, 1, shade(ROD, -.35));
    g.pine(17, 22, 22, PINO).pine(32, 19, 26, PINO).pine(47, 22, 22, PINO); g.eyes(32, 32, 18, 3.8, 'angry'); g.stache(32, 42, 44, BIG); g.mouth(32, 47.5, 4, 'grin'); },

  cierzin: g => { const C = '#d6eef9'; g.swirl(10, 28, 7, '#9fd3ee').swirl(54, 22, 6, '#9fd3ee');
    g.blob([[14, 44], [14, 34], [22, 26], [32, 24], [42, 27], [50, 35], [50, 46], [40, 52], [24, 52]], C); g.circ(22, 30, 7, C).circ(41, 29, 8, C);
    g.poly([[16, 46], [48, 46], [46, 51], [18, 51]], '#d4343f'); g.poly([[40, 48], [48, 50], [52, 60], [44, 58]], '#d4343f'); g.line(46, 56, 50, 59, 1, '#f2f2f2');
    g.eyes(32, 38, 12, 3.2, 'happy'); g.mouth(32, 43, 3, 'o'); g.blush(23, 42, 2.2, '#8fc8ff').blush(41, 42, 2.2, '#8fc8ff'); },
  cierzote: g => { const C = '#cde8f6'; for (const [a, b] of [[16, 54], [24, 57], [32, 58], [40, 57], [48, 54]]) g.poly([[a - 3, b - 6], [a + 3, b - 6], [a, b + 3]], '#a8e6ff');
    g.blob([[8, 42], [10, 28], [22, 18], [36, 16], [50, 22], [56, 36], [52, 50], [32, 54], [12, 50]], C);
    g.blob([[16, 22], [22, 10], [36, 7], [48, 14], [50, 22], [32, 25]], '#3e6fb8'); g.circ(33, 6, 4, '#f2f2f2'); g.line(18, 20, 48, 20, 2.5, '#f2f2f2');
    g.poly([[12, 44], [54, 44], [52, 49], [14, 49]], '#d4343f'); g.eyes(32, 33, 16, 3.6, 'big'); g.mouth(32, 40, 4, 'smile'); g.blush(20, 38, 2.6, '#8fc8ff').blush(44, 38, 2.6, '#8fc8ff'); g.swirl(58, 32, 5, '#7fc4e6'); },
  ventarron: g => { const C = '#e2f3fb'; g.swirl(6, 44, 6, '#8ccbea').swirl(58, 46, 6, '#8ccbea');
    g.blob([[10, 40], [6, 24], [18, 10], [36, 6], [52, 12], [60, 28], [54, 46], [44, 56], [22, 56]], C); g.circ(14, 18, 7, C).circ(50, 16, 8, C);
    for (let i = 0; i < 5; i++) g.poly([[18 + i * 7, 54], [24 + i * 7, 54], [21 + i * 7, 63]], '#9fe2ff');
    g.blob([[14, 26], [20, 20], [28, 23], [24, 28]], '#f8fbff').blob([[50, 26], [44, 20], [36, 23], [40, 28]], '#f8fbff'); // cejas pobladas
    g.eyes(32, 32, 14, 3.4, 'angry'); g.ell(32, 44, 9, 6, '#cfe6f3'); g.mouth(32, 44, 6, 'o'); g.blush(17, 38, 3, '#8fc8ff').blush(47, 38, 3, '#8fc8ff');
    g.line(40, 44, 58, 40, 1.4, '#ffffff').line(40, 47, 60, 50, 1.4, '#ffffff'); },

  brasin: g => { const P = '#d99a52'; g.flame(32, 30, 18); g.feet(32, 57, 14, 4.5, '#b9773a');
    g.blob([[12, 46], [16, 34], [32, 28], [48, 34], [52, 46], [44, 56], [20, 56]], P); for (let i = 0; i < 3; i++) g.curve([[22 + i * 9, 33], [25 + i * 9, 38], [24 + i * 9, 43]], 1.4, '#f3cf91');
    g.eyes(32, 45, 12, 3, 'big'); g.mouth(32, 51, 3, 'open'); g.blush(22, 50, 2).blush(42, 50, 2); },
  hogazo: g => { const P = '#c9853f'; g.flame(22, 22, 16).flame(42, 22, 16).flame(32, 18, 22); g.ell(8, 44, 5, 4, P).ell(56, 44, 5, 4, P);
    g.blob([[8, 42], [14, 26], [32, 20], [50, 26], [56, 42], [48, 58], [16, 58]], P); g.line(16, 34, 48, 34, 1.6, '#f0c88c').line(14, 42, 50, 42, 1.2, '#f0c88c');
    g.dot(20, 28, .8, '#fff8e8').dot(44, 30, .8, '#fff8e8'); g.eyes(32, 46, 16, 3.6, 'angry'); g.mouth(32, 53, 4, 'grin'); },
  hornazo: g => { const B = '#b5573c'; g.poly([[44, 6], [52, 6], [52, 22], [44, 22]], '#8a8a8a'); g.circ(50, 4, 3, '#ddd').circ(55, 1, 2, '#ccc');
    g.blob([[4, 60], [6, 34], [18, 16], [32, 12], [46, 16], [58, 34], [60, 60]], B); for (let r = 0; r < 4; r++) g.line(10, 26 + r * 9, 54, 26 + r * 9, .7, shade(B, -.35));
    g.blob([[20, 60], [20, 46], [32, 38], [44, 46], [44, 60]], '#2a1410', { flat: 1 }); g.flame(32, 60, 16, '#ff6a1e', '#ffd24a'); g.flame(25, 60, 10).flame(39, 60, 10);
    g.eyes(32, 28, 18, 3.6, 'angry'); g.ell(4, 50, 5, 6, '#9a948a').ell(60, 50, 5, 6, '#9a948a'); },

  pardalito: g => { const C = '#9a6a43'; g.line(28, 54, 27, 60, 1.2, '#d9893a').line(36, 54, 37, 60, 1.2, '#d9893a'); g.poly([[44, 44], [58, 38], [56, 46]], shade(C, -.2));
    g.ell(32, 44, 15, 12, C); g.ell(30, 48, 9, 7, '#ead7b5', { nohi: 1 }); g.circ(26, 30, 10, C); g.poly([[13, 30], [17, 28], [17, 32]], '#e8a33a'); g.wing(36, 40, 14, .5, shade(C, -.12));
    g.ell(26, 26, 7, 4, '#7c4a2a', { nohi: 1 }); g.eye(22, 30, 2.6, 'big'); g.blush(24, 35, 1.8); },
  pardalon: g => { const C = '#8a5a35'; g.line(28, 54, 26, 61, 1.6, '#d9893a').line(38, 54, 39, 61, 1.6, '#d9893a'); g.poly([[44, 40], [62, 30], [60, 44]], shade(C, -.25));
    g.ell(34, 42, 17, 14, C); g.ell(31, 47, 10, 8, '#ead7b5', { nohi: 1 }); g.circ(24, 26, 11, C); g.poly([[18, 16], [22, 6], [26, 16]], '#6b3a1f').poly([[23, 15], [30, 5], [31, 16]], '#6b3a1f');
    g.poly([[9, 27], [14, 24], [14, 30]], '#e8a33a'); g.wing(34, 36, 22, .3, shade(C, -.15)); g.eye(19, 25, 2.8, 'angry'); },
  ratolin: g => { const C = '#a6a2a8'; g.curve([[44, 52], [56, 50], [58, 40], [52, 34]], 1.6, '#e3a1b0'); g.feet(32, 58, 14, 4, shade(C, -.1));
    g.ell(32, 46, 14, 12, C); g.circ(18, 22, 8, C).circ(46, 22, 8, C); g.circ(18, 22, 4.5, '#f2b2c2', { flat: 1 }).circ(46, 22, 4.5, '#f2b2c2', { flat: 1 }); g.circ(32, 32, 13, C);
    g.eyes(32, 31, 11, 3, 'big'); g.dot(32, 37, 2, '#e36d84'); g.line(20, 37, 12, 35, .5, OUT).line(20, 39, 12, 41, .5, OUT).line(44, 37, 52, 35, .5, OUT).line(44, 39, 52, 41, .5, OUT); g.mouth(32, 41, 3, 'smile'); },
  ratonazo: g => { const C = '#8d8590'; g.curve([[46, 54], [60, 52], [62, 36], [54, 28]], 2.2, '#d98ea0'); g.feet(32, 59, 20, 5.5, shade(C, -.15));
    g.ell(32, 46, 18, 14, C); g.circ(14, 18, 8, C).circ(50, 18, 8, C); g.circ(14, 18, 4, '#e8a2b4', { flat: 1 }).circ(50, 18, 4, '#e8a2b4', { flat: 1 }); g.circ(32, 30, 15, C);
    g.poly([[18, 22], [46, 22], [44, 27], [20, 27]], '#c83a3a'); g.eyes(32, 31, 13, 3.2, 'angry'); g.dot(32, 37, 2.4, '#d85a74'); if (!g.back) { g.x.fillStyle = '#fff'; g.x.fillRect(29.5, 41, 2.3, 4); g.x.fillRect(32.2, 41, 2.3, 4); } g.mouth(32, 40, 4, 'flat'); },
  lagartin: g => { const C = '#7f9a4a'; g.curve([[44, 50], [56, 54], [62, 46]], 3, C); g.ell(26, 56, 4, 3, C).ell(42, 56, 4, 3, C);
    g.ell(34, 48, 14, 8, C); g.blob([[10, 38], [16, 30], [28, 30], [32, 38], [26, 44], [14, 44]], C); g.dot(38, 46, 1.5, '#5d7a33').dot(30, 50, 1.2, '#5d7a33').dot(42, 50, 1.2, '#5d7a33');
    g.eye(20, 35, 2.8, 'big', -.5); g.mouth(14, 40, 3, 'smile'); g.line(10, 41, 8, 43, 1, '#e2556d'); },
  lagartijon: g => { const C = '#6f8a3e'; g.curve([[44, 50], [58, 56], [63, 44]], 4, C); g.ell(22, 57, 5, 4, C).ell(44, 57, 5, 4, C);
    g.ell(34, 46, 18, 11, C); for (let i = 0; i < 4; i++) g.poly([[24 + i * 7, 37], [30 + i * 7, 37], [27 + i * 7, 29]], '#a89a7a');
    g.blob([[4, 36], [10, 26], [24, 26], [28, 36], [22, 42], [8, 42]], C); g.poly([[8, 30], [24, 30], [23, 34], [9, 34]], OUT, { flat: 1 }); g.line(12, 31, 15, 31, .6, '#9bd2ff'); // gafas de sol
    g.mouth(10, 38, 3.5, 'grin'); },
  saltamontin: g => { const C = '#7cc04a'; g.line(28, 30, 22, 14, 1, OUT).line(34, 30, 40, 12, 1, OUT); g.poly([[40, 44], [56, 34], [58, 56], [52, 58]], shade(C, -.15));
    g.ell(32, 46, 16, 9, C); g.circ(22, 36, 9, C); g.line(18, 52, 16, 60, 1.4, shade(C, -.3)).line(28, 54, 28, 61, 1.4, shade(C, -.3)); g.wing(30, 40, 16, .1, '#b7e88e');
    g.eye(18, 34, 3.2, 'big'); g.mouth(16, 40, 2.5, 'smile'); },
  langoston: g => { const C = '#6aac3e'; g.line(28, 22, 20, 6, 1.2, OUT).line(36, 22, 44, 6, 1.2, OUT); g.poly([[42, 42], [60, 30], [62, 58], [54, 60]], shade(C, -.15));
    g.ell(32, 44, 16, 12, C); g.circ(28, 28, 10, C); g.circ(10, 38, 6, '#d6343c').circ(50, 30, 6, '#d6343c'); g.line(20, 42, 12, 40, 2.5, C).line(42, 38, 48, 32, 2.5, C);
    g.poly([[18, 22], [38, 22], [37, 25], [19, 25]], '#ffffff'); g.eyes(28, 29, 10, 2.8, 'angry'); g.mouth(28, 35, 3, 'grin'); },
  caracolin: g => { const C = '#c3cfa2'; g.blob([[8, 58], [10, 50], [24, 48], [54, 52], [58, 58]], C); g.line(14, 50, 10, 38, 1.2, C).line(20, 50, 20, 38, 1.2, C);
    g.circ(10, 37, 3, '#fff').dot(10, 37, 1.4, OUT); g.circ(20, 37, 3, '#fff').dot(20, 37, 1.4, OUT); g.circ(38, 40, 14, '#b87a44'); g.swirl(38, 40, 13, '#7a4a28', 1.6); g.mouth(14, 54, 3, 'smile'); },
  caracolazo: g => { const C = '#b9c695'; g.blob([[4, 60], [6, 50], [22, 48], [58, 52], [62, 60]], C); g.line(10, 50, 6, 36, 1.4, C).line(18, 50, 18, 34, 1.4, C);
    g.circ(6, 35, 3.4, '#fff').dot(6, 35, 1.6, OUT); g.circ(18, 33, 3.4, '#fff').dot(18, 33, 1.6, OUT);
    g.poly([[26, 52], [26, 30], [56, 30], [56, 52]], '#efe2c6'); g.poly([[22, 32], [41, 14], [60, 32]], '#b9493a'); for (let i = 0; i < 3; i++) g.line(26 + i * 2, 28 - i * 5, 56 - i * 2, 28 - i * 5, .6, '#8a2f24');
    g.poly([[30, 36], [36, 36], [36, 42], [30, 42]], '#5a8fc0'); g.poly([[44, 40], [50, 40], [50, 52], [44, 52]], '#7a4a28'); g.mouth(10, 56, 3.5, 'smile'); },
  ranacuajo: g => { const C = '#5fb06a'; g.curve([[44, 50], [54, 48], [62, 54]], 3.4, shade(C, .2)); g.ell(30, 48, 18, 12, C); g.circ(22, 36, 6, C).circ(38, 36, 6, C);
    g.eye(22, 35, 3, 'big').eye(38, 35, 3, 'big'); g.ell(30, 52, 11, 5, '#d8efb8', { nohi: 1 }); g.mouth(30, 46, 6, 'smile'); g.blush(16, 46).blush(44, 46); },
  ranota: g => { const C = '#4f9a54'; g.ell(10, 56, 8, 4, C).ell(54, 56, 8, 4, C); g.ell(32, 46, 24, 15, C); g.dot(16, 46, 3, '#7a5a34').dot(48, 42, 2.5, '#7a5a34').dot(40, 54, 2, '#7a5a34');
    g.circ(20, 30, 8, C).circ(44, 30, 8, C); g.eye(20, 29, 4, 'sleepy').eye(44, 29, 4, 'sleepy'); g.ell(32, 54, 14, 5, '#d0e8a8', { nohi: 1 }); g.mouth(32, 44, 14, 'smile'); },
  truchin: g => { const C = '#8fa9b9'; g.poly([[48, 40], [62, 30], [62, 52]], shade(C, -.1)); g.ell(30, 41, 22, 11, C); g.line(12, 41, 48, 41, 2.6, '#e58aa8');
    for (const [a, b] of [[20, 36], [28, 34], [36, 36], [42, 46], [24, 47]]) g.dot(a, b, 1, '#3d4a55'); g.poly([[26, 30], [36, 24], [38, 32]], shade(C, -.15));
    g.eye(15, 38, 2.8, 'big', -.5); g.mouth(10, 44, 3, 'o'); },
  truchazo: g => { const C = '#7f97a8'; g.poly([[46, 30], [62, 10], [60, 36]], shade(C, -.1)); g.ell(30, 40, 26, 13, C, { rot: -.4 }); g.line(10, 50, 48, 30, 3, '#e07898');
    for (const [a, b] of [[20, 40], [28, 34], [36, 30], [40, 38], [26, 46]]) g.dot(a, b, 1.3, '#2e3a44'); g.poly([[22, 26], [34, 14], [36, 28]], shade(C, -.2));
    g.eye(14, 44, 3.2, 'angry'); g.mouth(8, 50, 4, 'fang'); for (const [a, b] of [[4, 22], [10, 16], [56, 54]]) g.dot(a, b, 1.6, '#9fd7ff'); },
  tomatito: g => { const C = '#e2453c'; g.feet(32, 58, 14, 4, '#3f8a3a'); g.blob([[12, 40], [18, 28], [32, 25], [46, 28], [52, 40], [46, 54], [32, 58], [18, 54]], C);
    for (let i = 0; i < 5; i++) g.leaf(32, 26, 10, -Math.PI / 2 + (i - 2) * .7, '#3f9a45'); g.line(32, 26, 32, 18, 1.6, '#3f7a35'); g.eyes(32, 40, 12, 3.2, 'big'); g.mouth(32, 47, 3, 'smile'); g.blush(22, 45).blush(42, 45); },
  tomatazo: g => { const C = '#d6342e'; g.curve([[10, 40], [4, 30], [8, 20]], 2, '#3f8a3a').curve([[54, 40], [60, 30], [56, 20]], 2, '#3f8a3a'); g.leaf(8, 20, 7, -2, '#4aa64a').leaf(56, 20, 7, -1.1, '#4aa64a');
    g.blob([[8, 40], [14, 24], [32, 20], [50, 24], [56, 40], [48, 58], [32, 62], [16, 58]], C);
    g.ell(32, 18, 20, 4, '#e8c66a').ell(32, 12, 11, 7, '#e8c66a'); g.line(21, 14, 43, 14, 1.4, '#c0392b');
    g.eyes(32, 36, 16, 3.6, 'big'); g.mouth(32, 46, 6, 'grin'); g.blush(18, 42, 3).blush(46, 42, 3); },
  calabacin: g => { const C = '#3f8f3c'; g.feet(32, 59, 12, 4, shade(C, -.2)); g.ell(32, 38, 12, 21, C); for (let i = 0; i < 4; i++) g.line(26 + i * 4, 22, 26 + i * 4, 54, .6, '#9bd27a');
    g.poly([[28, 18], [36, 18], [34, 10], [30, 10]], '#c5a24a'); g.leaf(36, 12, 9, -.6, '#5fae4a'); g.eyes(32, 34, 10, 2.8, 'sleepy'); g.mouth(32, 41, 3, 'flat'); },
  calabazon: g => { const C = '#e88a2a'; g.x.globalAlpha = .35; g.circ(32, 38, 30, '#9b6fd6', { flat: 1 }); g.x.globalAlpha = 1;
    g.blob([[6, 40], [12, 22], [32, 18], [52, 22], [58, 40], [50, 58], [14, 58]], C); for (let i = 0; i < 4; i++) g.curve([[18 + i * 9, 22], [16 + i * 9, 40], [19 + i * 9, 57]], .8, shade(C, -.3));
    g.poly([[28, 20], [36, 20], [35, 10], [31, 12]], '#5a7a2a'); g.curve([[36, 14], [46, 8], [52, 14]], 1.4, '#5a9a3a');
    if (!g.back) { g.poly([[16, 32], [26, 30], [22, 38]], '#ffe27a', { flat: 1 }).poly([[38, 30], [48, 32], [42, 38]], '#ffe27a', { flat: 1 }).poly([[18, 44], [46, 44], [42, 52], [36, 48], [32, 53], [28, 48], [22, 52]], '#ffe27a', { flat: 1 }); } },
  ajete: g => { const C = '#f3eee3'; g.feet(32, 58, 12, 3.6, '#d9cdb8'); g.blob([[14, 46], [18, 36], [28, 30], [32, 24], [36, 30], [46, 36], [50, 46], [42, 57], [22, 57]], C);
    g.curve([[32, 26], [32, 46]], .6, '#c9bca3').curve([[24, 34], [22, 52]], .6, '#c9bca3').curve([[40, 34], [42, 52]], .6, '#c9bca3');
    g.leaf(32, 26, 14, -1.8, '#6aba54').leaf(32, 26, 12, -1.2, '#7acb5e'); g.eyes(32, 44, 11, 2.8, 'big'); g.mouth(32, 50, 2.5, 'smile'); g.blush(23, 49).blush(41, 49); },
  ajazo: g => { const C = '#ece4d3'; g.feet(32, 59, 18, 5, '#d4c6ab'); g.circ(10, 40, 6, '#e8d27a').circ(54, 40, 6, '#e8d27a'); g.line(16, 42, 10, 40, 3, C).line(48, 42, 54, 40, 3, C);
    g.blob([[12, 44], [16, 30], [28, 22], [32, 14], [36, 22], [48, 30], [52, 44], [44, 58], [20, 58]], C); for (let i = 0; i < 5; i++) g.circ(16 + i * 8, 50, 3.2, '#f6f1e6');
    g.leaf(32, 16, 16, -1.9, '#5aaa48').leaf(32, 16, 14, -1.1, '#6aba54'); g.poly([[16, 30], [48, 30], [47, 33], [17, 33]], '#c83a3a'); g.eyes(32, 38, 13, 3, 'angry'); g.mouth(32, 44, 4, 'grin'); },
  michi: g => { const C = '#e39a4a'; g.curve([[44, 54], [56, 52], [58, 38]], 3, C); g.ell(32, 48, 14, 11, C); g.ell(32, 51, 8, 7, '#fbe3c2', { nohi: 1 });
    g.poly([[16, 26], [18, 10], [28, 20]], C).poly([[48, 26], [46, 10], [36, 20]], C); g.circ(32, 30, 14, C); for (let i = 0; i < 3; i++) g.line(26 + i * 6, 17, 27 + i * 6, 22, 1.2, shade(C, -.3));
    g.eyes(32, 29, 12, 3, 'big'); g.dot(32, 34, 1.4, '#e36d84'); g.mouth(32, 37, 3, 'smile'); g.line(22, 34, 12, 32, .5, OUT).line(42, 34, 52, 32, .5, OUT); },
  michote: g => { const C = '#2a2836'; g.curve([[44, 56], [60, 52], [60, 34], [54, 30]], 3.4, C); g.ell(32, 48, 16, 12, C);
    g.poly([[14, 26], [14, 6], [28, 18]], C).poly([[50, 26], [50, 6], [36, 18]], C); g.circ(32, 30, 15, C);
    g.curve([[22, 44], [28, 50], [24, 56]], 1.2, '#7a5ad6').curve([[40, 44], [36, 50], [42, 56]], 1.2, '#7a5ad6'); g.dot(32, 50, 2, '#e04a6a'); // tatuajes
    g.eye(26, 29, 3.2, 'angry').eye(38, 29, 3.2, 'angryL'); if (!g.back) { g.x.fillStyle = '#d4f04a'; g.x.fillRect(25.4, 27, 1.2, 4); g.x.fillRect(37.4, 27, 1.2, 4); } g.dot(32, 35, 1.4, '#e36d84'); g.mouth(32, 38, 3, 'fang'); },
  chuchito: g => { const C = '#d8b07a'; g.curve([[44, 46], [52, 40], [54, 34]], 2.6, C); g.feet(32, 58, 16, 4, shade(C, -.1)); g.ell(32, 48, 14, 10, C);
    g.circ(32, 30, 14, C); g.ell(18, 32, 5, 9, '#9a6a3a', { rot: .3 }).ell(46, 32, 5, 9, '#9a6a3a', { rot: -.3 }); g.ell(32, 36, 7, 5, '#f1dbb8', { nohi: 1 });
    g.eyes(32, 28, 12, 3, 'big'); g.dot(32, 33, 2, OUT); g.mouth(32, 38, 3, 'open'); },
  perrazo: g => { const C = '#a8794a'; g.feet(32, 59, 24, 6, shade(C, -.15)); g.ell(32, 46, 20, 13, C); g.poly([[16, 38], [48, 38], [47, 42], [17, 42]], '#3a3a3a');
    for (let i = 0; i < 5; i++) g.poly([[19 + i * 6, 38], [23 + i * 6, 38], [21 + i * 6, 34]], '#d0d4dc', { flat: 1 }); g.circ(32, 24, 16, C);
    g.ell(14, 26, 6, 10, '#6a4424', { rot: .4 }).ell(50, 26, 6, 10, '#6a4424', { rot: -.4 }); g.ell(32, 30, 9, 6, '#e6c79e', { nohi: 1 }); g.eyes(32, 21, 14, 3.2, 'angry'); g.dot(32, 27, 2.6, OUT); g.mouth(32, 33, 4, 'fang'); },
  palomo: g => { const C = '#9aa1ad'; g.line(28, 54, 27, 60, 1.4, '#e06a6a').line(36, 54, 37, 60, 1.4, '#e06a6a'); g.poly([[44, 46], [58, 42], [56, 52]], shade(C, -.25));
    g.ell(32, 44, 17, 13, C); g.ell(26, 34, 9, 7, '#5fa08a', { nohi: 1 }); g.ell(28, 37, 8, 4, '#8a6aaa', { nohi: 1 }); g.circ(24, 26, 9, C); g.poly([[13, 27], [17, 25], [17, 29]], '#e2b0a0');
    g.wing(34, 40, 16, .4, shade(C, -.12)); g.eye(20, 25, 2.4, 'sleepy'); },
  mosquin: g => { const C = '#5a5d70'; g.wing(30, 30, 18, -2.2, '#d6ecff').wing(34, 30, 18, -.9, '#d6ecff'); g.line(24, 44, 18, 56, .8, OUT).line(32, 46, 32, 58, .8, OUT).line(40, 44, 46, 56, .8, OUT);
    g.ell(36, 40, 12, 7, C); for (let i = 0; i < 3; i++) g.line(34 + i * 4, 34, 33 + i * 4, 46, 1.2, '#c9cfdc'); g.circ(22, 34, 7, C); g.line(16, 36, 4, 44, 1.2, '#2a2a3a');
    g.eye(20, 32, 3, 'angry'); },
  chispin: g => { const C = '#3b3a44'; g.poly([[26, 56], [38, 56], [36, 60], [28, 60]], C); g.poly([[22, 24], [42, 24], [40, 56], [24, 56]], '#fff2b0', { nohi: 1 });
    g.x.globalAlpha = .5; g.circ(32, 40, 16, '#ffe866', { flat: 1 }); g.x.globalAlpha = 1; g.sparkle(32, 40, 8, '#ffd21a'); g.poly([[20, 24], [44, 24], [38, 16], [26, 16]], C); g.circ(32, 13, 3, C);
    g.line(22, 24, 24, 56, 1, C).line(42, 24, 40, 56, 1, C); g.eyes(32, 36, 10, 2.6, 'big'); g.mouth(32, 44, 2.5, 'smile'); },
  farolon: g => { const C = '#2e2c36'; g.poly([[28, 40], [36, 40], [38, 62], [26, 62]], C); g.curve([[32, 40], [32, 30], [44, 22]], 3, C);
    g.poly([[36, 22], [56, 22], [52, 46], [40, 46]], '#ffe58a', { nohi: 1 }); g.x.globalAlpha = .4; g.circ(46, 34, 18, '#fff1a0', { flat: 1 }); g.x.globalAlpha = 1;
    g.poly([[34, 22], [58, 22], [52, 12], [40, 12]], C); g.circ(46, 9, 3, C); g.eyes(46, 32, 10, 2.8, 'angry'); g.mouth(46, 40, 3, 'grin'); g.sparkle(16, 20, 5, '#ffe14a').sparkle(12, 44, 4, '#ffe14a'); g.line(20, 58, 44, 58, 3, C); },
  escarchin: g => { const C = '#eef7ff'; g.feet(32, 58, 12, 4, '#cfe3f5'); g.circ(32, 40, 18, C); for (const [a, b] of [[16, 26], [48, 26], [12, 44], [52, 44], [32, 20]]) g.sparkle(a, b, 4, '#9fd8ff');
    g.eyes(32, 38, 12, 3, 'big'); g.mouth(32, 46, 3, 'o'); g.blush(20, 45, 2.4, '#8fc8ff').blush(44, 45, 2.4, '#8fc8ff'); },
  escarchon: g => { const C = '#bcd9ec'; g.feet(32, 60, 26, 7, '#8fb3cc'); g.ell(8, 40, 7, 9, C).ell(56, 40, 7, 9, C); g.blob([[10, 40], [14, 18], [32, 10], [50, 18], [54, 40], [46, 58], [18, 58]], C);
    for (const [a, b, h] of [[20, 14, 10], [32, 8, 12], [44, 14, 10]]) g.poly([[a - 4, b + 6], [a + 4, b + 6], [a, b - h]], '#e6f6ff'); g.ell(32, 42, 12, 8, '#98a0a8');
    g.eyes(32, 30, 14, 3.4, 'angry'); g.mouth(32, 44, 4, 'grin'); },
  tijerin: g => { const C = '#aeb7c4'; g.poly([[28, 36], [22, 62], [26, 62], [32, 40]], C).poly([[36, 36], [42, 62], [38, 62], [32, 40]], C); g.circ(32, 38, 3, '#8a95a5');
    g.ell(22, 22, 10, 9, '#c9353c').ell(42, 22, 10, 9, '#c9353c'); g.ell(22, 22, 6, 5, '#ffffff', { flat: 1 }).ell(42, 22, 6, 5, '#ffffff', { flat: 1 });
    if (!g.back) { g.dot(23, 23, 2.6, OUT).dot(43, 23, 2.6, OUT); g.dot(22, 22, .8, '#fff').dot(42, 22, .8, '#fff'); } g.mouth(32, 33, 3, 'smile'); },
  tijeron: g => { const C = '#9aa4b2'; g.poly([[14, 42], [50, 42], [56, 62], [8, 62]], '#f2f2f2'); for (let i = 0; i < 3; i++) g.line(14 + i * 14, 44, 11 + i * 16, 61, 2.6, '#d4343f');
    g.poly([[24, 38], [4, 2], [12, 0], [32, 34]], C).poly([[40, 38], [60, 2], [52, 0], [32, 34]], C); g.circ(32, 38, 4, '#7a8595');
    g.ell(22, 46, 9, 8, '#2a2a36').ell(42, 46, 9, 8, '#2a2a36'); g.ell(22, 46, 5.5, 4.5, '#ffffff', { flat: 1 }).ell(42, 46, 5.5, 4.5, '#ffffff', { flat: 1 });
    if (!g.back) { g.dot(23, 47, 2.6, OUT).dot(43, 47, 2.6, OUT); g.line(14, 39, 28, 42, 1.4, OUT).line(50, 39, 36, 42, 1.4, OUT); } g.stache(32, 55, 22, '#2a2a2a'); },
  peinecillo: g => { const C = '#e04a7a'; for (let i = 0; i < 9; i++) g.line(14 + i * 4.5, 40, 14 + i * 4.5, 58, 1.6, shade(C, -.1)); g.poly([[10, 26], [54, 26], [56, 42], [8, 42]], C);
    g.eyes(32, 33, 14, 3, 'big'); g.mouth(32, 39, 3, 'smile'); g.sparkle(8, 16, 4, '#ffe14a').sparkle(56, 18, 3, '#ffe14a'); g.line(20, 22, 18, 16, 1, '#ffe14a'); },
  tintorro: g => { const C = '#2b2f5a'; g.blob([[32, 8], [40, 24], [48, 38], [46, 52], [32, 58], [18, 52], [16, 38], [24, 24]], C); g.ell(26, 26, 3, 6, '#6a72c9', { flat: 1, rot: .4 });
    g.ell(20, 60, 6, 2, C, { flat: 1 }).ell(44, 61, 4, 1.6, C, { flat: 1 }); g.eyes(32, 42, 12, 3.2, 'big'); g.mouth(32, 50, 3, 'smile'); g.blush(22, 47, 2, '#e46aa0').blush(42, 47, 2, '#e46aa0'); },
  tintazo: g => { const C = '#3a3f7a'; for (let i = 0; i < 6; i++) { const a = 14 + i * 7.5; g.curve([[a, 40], [a - 4 + (i % 2) * 8, 52], [a + (i % 2 ? -4 : 4), 62]], 4, C); }
    g.blob([[10, 34], [14, 14], [32, 6], [50, 14], [54, 34], [44, 44], [20, 44]], C); if (!g.back || true) { g.x.save(); g.x.globalAlpha = .9; g.curve([[16, 18], [22, 12], [28, 18], [22, 24], [16, 18]], 1.1, '#f05a8a'); g.line(40, 12, 48, 22, 1.1, '#5ad0f0').line(48, 12, 40, 22, 1.1, '#5ad0f0'); g.x.restore(); }
    g.eyes(32, 30, 14, 3.4, 'big'); g.mouth(32, 38, 3, 'o'); },
  agujin: g => { const C = '#3fb08f'; g.wing(36, 30, 20, -2.4, '#9fe8d4').wing(36, 30, 20, -1.2, '#9fe8d4'); g.ell(38, 40, 12, 9, C); g.ell(40, 44, 7, 5, '#e05a8a', { nohi: 1 });
    g.curve([[46, 46], [56, 54], [60, 50]], 2.4, shade(C, -.2)); g.circ(26, 32, 8, C); g.line(18, 33, 2, 38, 1.4, '#c0c6d2'); g.dot(2, 38, 1.2, '#2b2f5a'); g.eye(24, 30, 2.6, 'big'); },
  fantasmin: g => { const C = '#f1f2fa'; g.x.globalAlpha = .92; g.blob([[12, 56], [12, 28], [20, 14], [32, 10], [44, 14], [52, 28], [52, 56], [46, 50], [40, 58], [32, 50], [24, 58], [18, 50]], C); g.x.globalAlpha = 1;
    if (!g.back) { g.ell(26, 30, 3, 4.5, OUT, { flat: 1 }).ell(38, 30, 3, 4.5, OUT, { flat: 1 }); g.mouth(32, 40, 4, 'o'); g.blush(22, 37, 2, '#c4b8ff').blush(42, 37, 2, '#c4b8ff'); } },
  espantajo: g => { const C = '#d8b678'; g.line(32, 34, 32, 62, 3, '#7a5534'); g.line(4, 38, 60, 38, 3, '#7a5534'); g.poly([[16, 34], [48, 34], [52, 56], [12, 56]], '#6a4ab0');
    g.poly([[14, 56], [18, 62], [22, 56], [28, 62], [32, 56], [36, 62], [42, 56], [46, 62], [50, 56]], '#e8d28a'); g.circ(32, 24, 12, C);
    g.ell(32, 14, 22, 4, '#c9a24a').poly([[22, 14], [42, 14], [38, 2], [26, 2]], '#c9a24a'); g.line(23, 12, 41, 12, 1.4, '#b03a3a');
    if (!g.back) { g.poly([[24, 20], [30, 20], [27, 26]], OUT, { flat: 1 }).poly([[34, 20], [40, 20], [37, 26]], OUT, { flat: 1 }); g.line(25, 30, 39, 30, .9, OUT); for (let i = 0; i < 5; i++) g.line(26 + i * 3, 28.5, 26 + i * 3, 31.5, .6, OUT); }
    g.x.globalAlpha = .4; g.circ(32, 30, 28, '#9b6fd6', { flat: 1 }); g.x.globalAlpha = 1; },
  murcielin: g => { const C = '#5b4a7a'; g.wing(26, 34, 26, -2.7, '#7a62a4').wing(38, 34, 26, -.45, '#7a62a4'); g.ell(32, 40, 11, 12, C);
    g.poly([[22, 32], [20, 14], [30, 28]], C).poly([[42, 32], [44, 14], [34, 28]], C); g.eyes(32, 36, 10, 3, 'big'); g.mouth(32, 44, 3, 'fang'); },
  guijarrin: g => { const C = '#9a948c'; g.ell(14, 46, 4, 3, C).ell(50, 46, 4, 3, C); g.blob([[14, 46], [18, 34], [30, 30], [44, 32], [50, 44], [44, 56], [22, 56]], C);
    g.dot(40, 36, 1.4, '#7a746c').dot(22, 50, 1.2, '#7a746c'); g.brows(32, 38, 12, 6, '#4a4540'); g.eyes(32, 42, 12, 2.8, 'small'); g.mouth(32, 49, 4, 'frown'); },
  pedrusco: g => { const C = '#8a847a'; g.ell(6, 42, 7, 9, C).ell(58, 42, 7, 9, C); g.feet(32, 60, 26, 6, shade(C, -.15)); g.blob([[8, 40], [12, 20], [30, 10], [50, 16], [56, 40], [48, 58], [16, 58]], C);
    g.blob([[14, 20], [26, 10], [42, 12], [32, 18]], '#5aa04a'); g.line(16, 32, 22, 40, 1, shade(C, -.35)); g.brows(32, 30, 16, 8, '#3a3530'); g.eyes(32, 34, 16, 3, 'small'); g.mouth(32, 46, 6, 'frown'); },
  becerrin: g => { const C = '#7a5232'; g.feet(32, 59, 18, 4.5, '#2a2a2a'); g.ell(32, 48, 15, 10, C); g.circ(32, 30, 13, C); g.ell(20, 28, 6, 3, C, { rot: .4 }).ell(44, 28, 6, 3, C, { rot: -.4 });
    g.circ(24, 20, 2.4, '#efe2c6').circ(40, 20, 2.4, '#efe2c6'); g.ell(32, 36, 8, 5.5, '#e8b2a8', { nohi: 1 }); g.dot(29, 36, 1, OUT).dot(35, 36, 1, OUT); g.eyes(32, 28, 12, 2.8, 'big'); g.blush(22, 33).blush(42, 33); },
  torazo: g => { const C = '#2a2428'; g.feet(32, 60, 26, 6, '#151214'); g.ell(32, 46, 22, 14, C); g.circ(32, 26, 15, C);
    g.curve([[18, 20], [8, 16], [6, 6]], 4, '#efe2c6').curve([[46, 20], [56, 16], [58, 6]], 4, '#efe2c6'); g.poly([[18, 38], [46, 38], [42, 46], [32, 50], [22, 46]], '#d4343f');
    g.ell(32, 32, 9, 6, '#4a3a40', { nohi: 1 }); g.dot(28, 32, 1.2, '#000').dot(36, 32, 1.2, '#000'); g.line(26, 35, 38, 35, 1.2, '#d8b84a'); g.eyes(32, 23, 14, 3, 'angry'); },
  ovejin: g => { const C = '#f4f1ea'; g.line(24, 54, 24, 61, 2.2, '#2a2a2a').line(40, 54, 40, 61, 2.2, '#2a2a2a'); for (const [a, b] of [[20, 42], [32, 36], [44, 42], [26, 52], [38, 52], [32, 46]]) g.circ(a, b, 9, C);
    g.ell(14, 34, 8, 9, '#2f2c30'); g.ell(8, 28, 4, 2.2, '#2f2c30', { rot: -.4 }); g.eye(12, 33, 2.4, 'big', -.4); g.mouth(12, 39, 2.5, 'smile'); g.circ(16, 26, 4, C); },
  ovejona: g => { const C = '#fff5c2'; g.line(22, 55, 22, 62, 3, '#2a2a2a').line(42, 55, 42, 62, 3, '#2a2a2a'); for (const [a, b] of [[14, 40], [28, 30], [44, 32], [52, 44], [22, 52], [40, 52], [32, 42]]) g.circ(a, b, 11, C);
    g.sparkle(8, 22, 5, '#ffd21a').sparkle(56, 22, 5, '#ffd21a').sparkle(34, 16, 4, '#ffd21a'); g.ell(12, 32, 9, 10, '#2f2c30'); g.eye(10, 31, 2.8, 'angry'); g.mouth(10, 38, 3, 'grin'); g.circ(14, 22, 5, C); },
  abejin: g => { const C = '#f2c230'; g.wing(28, 30, 14, -2.2, '#e6f6ff').wing(36, 30, 14, -.9, '#e6f6ff'); g.circ(32, 42, 15, C); g.line(18, 40, 46, 40, 3, OUT).line(20, 48, 44, 48, 3, OUT);
    g.poly([[30, 56], [34, 56], [32, 62]], OUT); g.line(26, 28, 22, 18, .9, OUT).line(38, 28, 42, 18, .9, OUT); g.dot(22, 18, 1.6, OUT).dot(42, 18, 1.6, OUT); g.eyes(32, 34, 12, 2.8, 'big'); g.blush(22, 38).blush(42, 38); },
  abejorrona: g => { const C = '#e8a828'; g.wing(26, 26, 20, -2.4, '#e6f6ff').wing(38, 26, 20, -.7, '#e6f6ff'); g.circ(32, 40, 20, C);
    for (let i = 0; i < 3; i++) g.line(14, 34 + i * 9, 50, 34 + i * 9, 3.2, '#3a2a1a'); g.x.globalAlpha = .5; g.circ(32, 40, 20, '#fff2c0', { flat: 1 }); g.x.globalAlpha = 1;
    g.poly([[20, 18], [24, 10], [28, 16], [32, 8], [36, 16], [40, 10], [44, 18]], '#f2d24a'); g.eyes(32, 30, 14, 3, 'big'); g.mouth(32, 38, 3, 'smile'); },
  setin: g => { const C = '#e88a3a'; g.ell(32, 50, 9, 10, '#f3e6cc'); g.blob([[8, 38], [14, 24], [32, 16], [50, 24], [56, 38], [32, 42]], C); g.line(14, 38, 50, 38, .8, shade(C, -.4));
    g.eyes(32, 50, 9, 2.4, 'big'); g.mouth(32, 56, 2.5, 'smile'); g.dot(24, 26, 2, '#f6b88a').dot(40, 28, 2.5, '#f6b88a'); },
  setazo: g => { const C = '#d6342e'; g.x.globalAlpha = .35; g.circ(32, 36, 30, '#9b6fd6', { flat: 1 }); g.x.globalAlpha = 1; g.ell(32, 50, 12, 12, '#efe6d0');
    g.blob([[2, 36], [10, 18], [32, 8], [54, 18], [62, 36], [32, 40]], C); for (const [a, b, r] of [[16, 24, 3], [30, 16, 4], [44, 22, 3.4], [52, 32, 2.4], [10, 32, 2.4], [32, 30, 2.6]]) g.circ(a, b, r, '#fff', { flat: 1 });
    g.eyes(32, 50, 11, 3, 'sleepy'); g._lid = '#efe6d0'; g.mouth(32, 57, 3, 'fang'); },
  talayon: g => { const C = '#a08878'; g.swirl(6, 50, 6, '#bfe6f7').swirl(58, 52, 6, '#bfe6f7');
    g.blob([[4, 62], [6, 40], [16, 26], [32, 22], [48, 26], [58, 40], [60, 62]], C); g.line(14, 44, 20, 58, 1.4, '#5d4e42').line(50, 44, 44, 58, 1.4, '#5d4e42');
    g.pine(12, 30, 18, '#4a7a5e').pine(52, 30, 18, '#4a7a5e');
    g.poly([[18, 22], [46, 22], [44, 14], [40, 18], [36, 8], [32, 16], [28, 8], [24, 18], [20, 14]], '#e2b84a'); g.circ(32, 6, 2.6, '#3a8ad6'); g.dot(26, 19, 1.4, '#3a8a5a').dot(38, 19, 1.4, '#3a8a5a');
    g.eyes(32, 36, 16, 3.6, 'angry'); g.ell(32, 47, 8, 3, '#7d6a5c', { flat: 1 }); g.sparkle(32, 54, 3, '#ffe9a0'); },
  bochornazo: g => { const C = '#f06a2a'; g.x.globalAlpha = .4; g.circ(32, 34, 30, '#ffb24a', { flat: 1 }); g.x.globalAlpha = 1;
    g.blob([[10, 50], [8, 30], [18, 14], [32, 8], [46, 14], [56, 30], [54, 50], [32, 60]], C); g.flame(16, 20, 14, '#ff4a1a').flame(48, 20, 14, '#ff4a1a').flame(32, 12, 16, '#ff4a1a');
    g.poly([[14, 30], [50, 30], [48, 37], [36, 37], [32, 33], [28, 37], [16, 37]], '#1a1a22', { flat: 1 }); g.line(18, 31, 23, 31, .8, '#ff9a6a'); g.mouth(32, 46, 6, 'grin'); g.swirl(4, 52, 6, '#ffd08a').swirl(60, 52, 6, '#ffd08a'); },
  calimin: g => { const C = '#e8a35a'; g.swirl(32, 50, 14, '#d48a3a', 2.4); g.blob([[16, 40], [20, 24], [32, 18], [44, 24], [48, 40], [32, 48]], C);
    g.poly([[18, 30], [46, 30], [44, 35], [34, 35], [32, 32], [30, 35], [20, 35]], '#1a1a22', { flat: 1 }); g.mouth(32, 41, 3, 'grin'); g.flame(32, 20, 10); },
  calimazo: g => { const C = '#d97a3a'; g.swirl(32, 52, 20, '#c26a2a', 3); g.blob([[8, 42], [12, 18], [32, 8], [52, 18], [56, 42], [32, 52]], C);
    g.poly([[12, 26], [52, 26], [50, 34], [36, 34], [32, 29], [28, 34], [14, 34]], '#1a1a22', { flat: 1 }); g.mouth(32, 42, 5, 'fang'); g.flame(20, 14, 12).flame(44, 14, 12).flame(32, 10, 14);
    g.ell(4, 34, 5, 7, '#f0b070').ell(60, 34, 5, 7, '#f0b070'); },
};

/* Pixelado: umbral de alfa + contorno exterior oscuro */
function pixelate(c) {
  const x = c.getContext('2d'), w = c.width, h = c.height, im = x.getImageData(0, 0, w, h), d = im.data, o = new Uint8ClampedArray(d);
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 110 ? 255 : 0;
  for (let i = 3; i < o.length; i += 4) o[i] = d[i];
  for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) {
    const i = (y * w + X) * 4; if (d[i + 3]) continue;
    const n = (dx, dy) => { const xx = X + dx, yy = y + dy; return xx >= 0 && yy >= 0 && xx < w && yy < h && d[((yy * w + xx) * 4) + 3]; };
    if (n(1, 0) || n(-1, 0) || n(0, 1) || n(0, -1)) { o[i] = 0x1d; o[i + 1] = 0x1a; o[i + 2] = 0x26; o[i + 3] = 255; }
  }
  x.putImageData(new ImageData(o, w, h), 0, 0); return c;
}
const monCache = {};
function monSprite(id, back = false) {
  const k = id + (back ? 'b' : ''); if (monCache[k]) return monCache[k];
  const [c, x] = mkCanvas(66, 66); x.imageSmoothingEnabled = true; x.translate(1, 1); x.lineJoin = 'round';
  try { (ART[id] || ART.guijarrin)(new MonG(x, { back })); } catch (e) { console.error('arte', id, e); }
  pixelate(c); if (back) { const [c2, x2] = mkCanvas(66, 66); x2.translate(66, 0); x2.scale(-1, 1); x2.drawImage(c, 0, 0); return monCache[k] = c2; }
  return monCache[k] = c;
}
// versión vectorial grande (logo, pantallas de título)
function monVector(id, size = 512) { const [c, x] = mkCanvas(size, size); x.imageSmoothingEnabled = true; x.scale(size / 64, size / 64); x.lineJoin = 'round'; ART[id](new MonG(x, { vec: true })); return c; }
// silueta (Talapedia sin ver)
function monShadow(id) { const s = monSprite(id), [c, x] = mkCanvas(s.width, s.height); x.drawImage(s, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#2a2e3a'; x.fillRect(0, 0, c.width, c.height); return c; }

/* ---------------- Personas (16×24, 4 direcciones × 3 pasos) ----------------
   spec: {skin, hair, hs (estilo), shirt, pants, shoes, hat, hatc, beard, apron, glasses, cape, dress, tattoo, bag} */
const personCache = {};
function personSheet(spec) {
  const key = JSON.stringify(spec); if (personCache[key]) return personCache[key];
  const [c, x] = mkCanvas(16 * 3, 24 * 4); const P = (px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  const S = Object.assign({ skin: '#f1c7a0', hair: '#4a3020', hs: 'short', shirt: '#3a6fc9', pants: '#33415e', shoes: '#2a2228' }, spec);
  const sk = S.skin, skD = shade(sk, -.18), hr = S.hair, hrD = shade(hr, -.3), sh = S.shirt, shD = shade(sh, -.25), pa = S.pants, paD = shade(pa, -.25), so = S.shoes;
  const dirs = ['down', 'up', 'left', 'right'];
  dirs.forEach((dir, di) => {
    for (let f = 0; f < 3; f++) {
      x.save(); x.translate(f * 16, di * 24); const walk = f === 0 ? 0 : (f === 1 ? 1 : -1), bob = f ? 1 : 0; const side = dir === 'left' || dir === 'right';
      x.translate(0, bob ? 0 : 0);
      // sombra
      x.fillStyle = 'rgba(0,0,0,.28)'; x.beginPath(); x.ellipse(8, 22.5, 5.5, 1.6, 0, 0, 7); x.fill();
      // piernas
      if (S.dress) { P(4, 15, 8, 6, S.dress); P(4, 20, 8, 1, shade(S.dress, -.25)); P(5, 21, 2, 2, sk); P(9, 21, 2, 2, sk); P(5, 22, 2, 1, so); P(9, 22, 2, 1, so); }
      else if (side) { const a = walk; P(6 + a, 16, 3, 5, pa); P(7 - a, 16, 3, 5, paD); P(6 + a, 21, 3, 1, so); P(7 - a, 21, 3, 1, so); }
      else { const l = walk === 1 ? -1 : 0, r = walk === -1 ? -1 : 0; P(4, 16, 3, 5 + l, pa); P(9, 16, 3, 5 + r, paD); P(4, 21 + l, 3, 1, so); P(9, 21 + r, 3, 1, so); }
      // cuerpo
      P(3, 10, 10, 7, sh); P(3, 15, 10, 2, shD); if (S.apron) P(4, 11, 8, 7, S.apron);
      if (S.cape) { P(2, 10, 12, 7, S.cape); for (let i = 0; i < 3; i++) P(3 + i * 4, 10, 2, 7, '#f2f2f2'); }
      // brazos
      if (side) { const a = walk; P(dir === 'left' ? 6 + a : 8 - a, 11, 3, 5, shD); P(dir === 'left' ? 6 + a : 8 - a, 15, 3, 2, sk); }
      else { const sw = walk; P(1, 11 + (sw === 1 ? -1 : 0), 2, 5, shD); P(13, 11 + (sw === -1 ? -1 : 0), 2, 5, shD); P(1, 15 + (sw === 1 ? -1 : 0), 2, 2, sk); P(13, 15 + (sw === -1 ? -1 : 0), 2, 2, sk); if (S.tattoo) { P(1, 12, 2, 2, S.tattoo); P(13, 13, 2, 2, S.tattoo); } }
      // cabeza
      P(3, 2, 10, 9, sk); P(3, 9, 10, 2, skD);
      if (dir === 'down') {
        P(5, 6, 2, 2, '#1d1a26'); P(9, 6, 2, 2, '#1d1a26'); P(5, 6, 1, 1, '#fff'); P(9, 6, 1, 1, '#fff'); P(7, 9, 2, 1, shade(sk, -.35));
        if (S.beard) { P(3, 8, 10, 3, S.beard); P(6, 9, 4, 1, shade(S.beard, -.3)); }
        if (S.stache) P(5, 8, 6, 1, S.stache);
        if (S.glasses) { P(4, 5, 3, 3, S.glasses); P(9, 5, 3, 3, S.glasses); P(7, 6, 2, 1, S.glasses); P(5, 6, 1, 1, '#9fd8ff'); P(10, 6, 1, 1, '#9fd8ff'); }
      } else if (side) { const ex = dir === 'left' ? 4 : 10; P(ex, 6, 2, 2, '#1d1a26'); if (S.beard) P(dir === 'left' ? 3 : 7, 8, 6, 3, S.beard); if (S.glasses) P(dir === 'left' ? 3 : 9, 5, 4, 2, S.glasses); }
      // pelo
      const hs = S.hs;
      if (hs !== 'bald') {
        if (dir === 'up') { P(3, 1, 10, 8, hr); P(3, 8, 10, 1, hrD); if (hs === 'long' || hs === 'pony') P(4, 9, 8, 4, hr); if (hs === 'bun') P(6, -1, 4, 3, hr); }
        else {
          P(3, 1, 10, 3, hr); P(2, 2, 1, 5, hr); P(13, 2, 1, 5, hr);
          if (hs === 'spiky') { P(3, 0, 2, 2, hr); P(6, -1, 2, 2, hr); P(10, 0, 2, 2, hr); }
          if (hs === 'fringe') P(3, 4, 6, 1, hr);
          if (hs === 'quiff') { P(4, -1, 7, 3, hr); P(10, 0, 3, 2, hrD); }
          if (hs === 'long') { P(2, 4, 2, 9, hr); P(12, 4, 2, 9, hr); }
          if (hs === 'pony' && side) P(dir === 'left' ? 12 : 1, 4, 3, 6, hr);
          if (hs === 'bun') P(6, -1, 4, 3, hr);
          if (hs === 'grey') { P(3, 1, 10, 2, hr); }
          if (side) { if (dir === 'left') P(9, 2, 4, 6, hr); else P(3, 2, 4, 6, hr); }
        }
      } else if (dir !== 'down') { P(3, 2, 10, 2, skD); }
      if (S.hat) { const hc = S.hatc || '#c83a3a'; if (S.hat === 'cap') { P(3, 0, 10, 3, hc); if (dir === 'down') P(3, 3, 10, 1, shade(hc, -.3)); else if (dir === 'left') P(0, 2, 4, 1, shade(hc, -.3)); else if (dir === 'right') P(12, 2, 4, 1, shade(hc, -.3)); }
        else if (S.hat === 'straw') { P(1, 2, 14, 1, hc); P(4, -1, 8, 3, hc); P(4, 1, 8, 1, shade(hc, -.3)); }
        else if (S.hat === 'beanie') { P(3, -1, 10, 4, hc); P(3, 2, 10, 1, shade(hc, -.3)); P(7, -2, 2, 1, '#fff'); }
        else if (S.hat === 'tricorn') { P(2, 0, 12, 3, hc); P(1, 2, 14, 1, shade(hc, -.3)); } // tricornio de la Guardia Civil
        else if (S.hat === 'chef') { P(4, -3, 8, 5, '#f4f4f4'); P(3, 1, 10, 1, '#d8d8d8'); }
        else if (S.hat === 'visor') { P(2, 1, 12, 2, hc); P(3, 3, 10, 1, shade(hc, -.3)); } }
      if (S.bag && dir === 'up') P(4, 10, 8, 6, S.bag);
      x.restore();
    }
  });
  return personCache[key] = c;
}

/* ---------------- Edificios (fachada en 3/4 + tejado) ---------------- */
const bCache = {};
function buildingImg(b) {
  const key = JSON.stringify([b.w, b.d, b.st, b.floors, b.sign, b.wall, b.roof, b.kind, b.door]); if (bCache[key]) return bCache[key];
  const w = b.w * 16, floors = b.floors || 2, wallH = 10 + floors * 22, roofH = Math.max(18, b.d * 16 * .62 - wallH * .15) | 0, h = wallH + roofH + 4;
  const [c, x] = mkCanvas(w, h); const R = srand((b.x || 1) * 997 + (b.y || 1) * 131 + b.w * 7);
  const P = (px, py, pw, ph, col) => { x.fillStyle = col; x.fillRect(px | 0, py | 0, pw | 0, ph | 0); };
  const wall = b.wall || pick(['#efe6d4', '#f2ebe0', '#e8d9bf', '#f4e3cc', '#e7c9b8', '#f0e0c8']), wallD = shade(wall, -.12), roof = b.roof || '#b5513c', roofD = shade(roof, -.3);
  const top = roofH + 4, base = h;
  // tejado (vista desde arriba en perspectiva): tejas árabes o azotea
  if (b.flat) { P(0, top - roofH * .6, w, roofH * .6, '#cfc6b6'); P(0, top - roofH * .6, w, 2, '#a9a092'); for (let i = 0; i < w; i += 4) P(i, top - 6, 2, 6, '#8a8a8a'); P(0, top - 2, w, 2, '#6a6a6a'); }
  else {
    P(0, 4, w, roofH, roof); for (let yy = 4; yy < top; yy += 4) { for (let xx = (yy / 4 % 2) * 3; xx < w; xx += 6) { P(xx, yy, 5, 3, shade(roof, (hash2(xx, yy) - .5) * .18)); P(xx, yy + 3, 5, 1, roofD); } }
    P(0, 3, w, 2, shade(roof, -.4)); P(0, top - 2, w, 3, roofD);
    if (b.chimney !== false && w > 40) { const cx = (R() * (w - 20) + 6) | 0; P(cx, 0, 7, 10, '#b8aa96'); P(cx - 1, 0, 9, 2, '#8a7e6e'); }
  }
  // pared
  P(0, top, w, wallH, wall); for (let i = 0; i < 40; i++) P(R() * w, top + R() * wallH, 1, 1, wallD); P(0, base - 4, w, 4, shade(wall, -.25)); // zócalo
  if (b.granite) { P(0, base - 30, w, 26, '#b9b7b2'); for (let yy = base - 30; yy < base - 4; yy += 6) for (let xx = (yy % 12 ? 0 : 5); xx < w; xx += 10) P(xx, yy, 1, 6, '#9b9994'); for (let yy = base - 30; yy < base - 4; yy += 6) P(0, yy, w, 1, '#a3a19c'); }
  // ventanas por planta
  const winC = b.shutter || pick(['#3f6a4a', '#5a3a26', '#2f5a7a', '#7a3a2a']);
  for (let fl = 0; fl < floors; fl++) {
    const yy = top + 6 + fl * 22, n = Math.max(1, Math.floor(w / 26));
    for (let i = 0; i < n; i++) {
      const xx = (w / n) * (i + .5) - 5; if (fl === floors - 1 && b.door !== undefined && Math.abs(xx + 5 - (b.door * 16 + 8)) < 12) continue;
      if (fl === floors - 1) { P(xx - 1, yy, 12, 14, '#ddd3c2'); P(xx, yy + 1, 10, 12, '#3a4a5a'); P(xx + 1, yy + 2, 3, 4, '#7fa6c4'); P(xx - 3, yy + 1, 2, 12, winC); P(xx + 11, yy + 1, 2, 12, winC); }
      else { P(xx - 1, yy, 12, 14, '#ddd3c2'); P(xx, yy + 1, 10, 13, '#3a4a5a'); P(xx + 1, yy + 2, 3, 4, '#7fa6c4'); P(xx - 3, yy + 1, 2, 13, winC); P(xx + 11, yy + 1, 2, 13, winC);
        if (hash2(i, fl, w) > .35) { P(xx - 4, yy + 13, 18, 2, '#3a3a3a'); for (let k = 0; k < 6; k++) P(xx - 4 + k * 3.4, yy + 8, 1, 5, '#3a3a3a'); P(xx - 4, yy + 8, 18, 1, '#3a3a3a'); if (hash2(i, fl + 9, w) > .4) for (let k = 0; k < 4; k++) P(xx - 2 + k * 4, yy + 6, 3, 3, pick(['#e04a5a', '#f0a030', '#e868a8', '#ffffff'])); } }
    }
  }
  // puerta
  if (b.door !== undefined) {
    const dx = b.door * 16 + 2, dy = base - 24;
    if (b.kind === 'cierzo') { P(dx - 4, dy - 2, 20, 26, '#2a2a2a'); P(dx - 2, dy, 16, 22, '#151a1e'); P(dx, dy + 2, 5, 18, '#3a4650'); P(dx + 7, dy + 2, 5, 18, '#3a4650'); P(dx + 2, dy + 4, 1, 10, '#6a7a88'); }
    else if (b.kind === 'shop') { P(dx - 2, dy - 2, 16, 26, '#3a3a3a'); P(dx, dy, 12, 22, '#9fd2e8'); P(dx + 5, dy, 2, 22, '#3a3a3a'); }
    else { P(dx - 1, dy - 1, 14, 25, shade(wall, -.35)); P(dx, dy, 12, 24, '#6a4226'); P(dx, dy, 12, 2, '#4a2a16'); P(dx + 9, dy + 12, 2, 2, '#e2b84a'); P(dx + 2, dy + 4, 8, 6, '#7a5232'); }
  }
  // extras
  if (b.kind === 'cierzo') {
    // letrero de madera "EL CIERZO" + poste de barbero
    P(4, top + 2, w - 8, 16, '#5a3218'); P(4, top + 2, w - 8, 2, '#7a4a28'); P(4, top + 16, w - 8, 2, '#3a1e0c');
    x.fillStyle = '#f6efe2'; x.font = 'bold 9px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('EL CIERZO', w / 2, top + 9);
    x.font = 'bold 5px sans-serif'; x.fillText('TATTOO · BARBER · SHOP', w / 2, top + 15.5);
    const px = (b.door * 16) - 10; P(px, base - 34, 6, 22, '#f4f4f4'); for (let k = 0; k < 5; k++) { P(px, base - 34 + k * 4.6, 6, 2, '#d4343f'); P(px + 3, base - 32 + k * 4.6, 3, 2, '#2f5ab0'); } P(px - 1, base - 37, 8, 4, '#dcdcdc'); P(px - 1, base - 13, 8, 2, '#a8a8a8');
  }
  if (b.sign) { const sw = Math.min(w - 8, b.sign.length * 5 + 10); P((w - sw) / 2, top + 2, sw, 10, b.signc || '#2f4a7a'); x.fillStyle = '#fff'; x.font = 'bold 7px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(b.sign, w / 2, top + 7.5); }
  if (b.kind === 'salud') { P(w / 2 - 8, top - 18, 16, 16, '#ffffff'); P(w / 2 - 2, top - 15, 4, 10, '#2ea84a'); P(w / 2 - 5, top - 12, 10, 4, '#2ea84a'); }
  if (b.kind === 'cuartel') { P(w / 2 - 12, top - 14, 24, 10, '#2f5a3a'); x.fillStyle = '#fff'; x.font = 'bold 6px sans-serif'; x.textAlign = 'center'; x.fillText('CUARTEL', w / 2, top - 7); }
  if (b.kind === 'toros') { // plaza de toros: muro circular blanco con arcos
    P(0, top, w, wallH, '#f3ece0'); for (let i = 6; i < w - 6; i += 16) { P(i, top + 8, 10, 16, '#c9573c'); P(i + 1, top + 9, 8, 15, '#7a2a1a'); } P(0, top, w, 4, '#c9573c'); P(0, base - 6, w, 6, '#c9573c'); }
  if (b.kind === 'iglesia') { P(w / 2 - 10, 0, 20, top + 10, '#d8c8a8'); P(w / 2 - 4, 6, 8, 10, '#3a3a4a'); P(w / 2 - 1, -2, 2, 8, '#3a3a3a'); }
  if (b.awning) { for (let i = 0; i < w; i += 8) { P(i, base - 34, 8, 6, i / 8 % 2 ? '#ffffff' : b.awning); } P(0, base - 28, w, 1, shade(b.awning, -.3)); }
  return bCache[key] = c;
}

/* ---------------- Árboles y objetos ---------------- */
const propCache = {};
function propImg(kind, v = 0) {
  const k = kind + v; if (propCache[k]) return propCache[k];
  let c, x; const P = (px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px | 0, py | 0, w | 0, h | 0); };
  const blob = (cx, cy, r, col, n = 18) => { for (let i = 0; i < n; i++) { const a = i / n * 6.283, rr = r * (.75 + .25 * hash2(i, v, cx)); x.fillStyle = col; x.beginPath(); x.arc(cx + Math.cos(a) * rr * .6, cy + Math.sin(a) * rr * .5, r * .55, 0, 7); x.fill(); } };
  switch (kind) {
    case 'pino': [c, x] = mkCanvas(36, 52); P(16, 34, 4, 14, '#6b4426'); P(16, 34, 1, 14, '#4a2e18');
      x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(18, 49, 12, 3, 0, 0, 7); x.fill();
      blob(18, 24, 18, '#2d5a3a'); blob(16, 20, 14, '#3a6e46'); blob(14, 16, 8, '#4f8a58'); break;
    case 'arbol': [c, x] = mkCanvas(40, 50); P(18, 30, 5, 16, '#6e4a2c'); x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(20, 47, 13, 3, 0, 0, 7); x.fill();
      blob(20, 22, 20, '#3f7a3a'); blob(17, 18, 15, '#55964a'); blob(14, 14, 8, '#74b25e'); break;
    case 'olivo': [c, x] = mkCanvas(36, 40); P(16, 22, 4, 14, '#7a6a5a'); blob(18, 16, 16, '#7a8f5a'); blob(15, 13, 10, '#94a874'); break;
    case 'seto': [c, x] = mkCanvas(16, 18); blob(8, 10, 9, '#3f7a3a', 10); blob(7, 8, 6, '#5a9a4a', 8); break;
    case 'farola': [c, x] = mkCanvas(12, 44); P(5, 8, 2, 34, '#2a2a30'); P(3, 40, 6, 3, '#2a2a30'); P(2, 2, 8, 7, '#2a2a30'); P(3, 3, 6, 5, '#ffe9a0'); P(4, 0, 4, 2, '#2a2a30'); break;
    case 'banco': [c, x] = mkCanvas(28, 16); P(1, 6, 26, 3, '#8a5a32'); P(1, 2, 26, 3, '#9a6a3a'); P(3, 9, 2, 6, '#3a3a3a'); P(23, 9, 2, 6, '#3a3a3a'); break;
    case 'fuente': [c, x] = mkCanvas(40, 34); x.fillStyle = '#b9b2a6'; x.beginPath(); x.ellipse(20, 24, 19, 8, 0, 0, 7); x.fill(); x.fillStyle = '#6aa8d8'; x.beginPath(); x.ellipse(20, 23, 15, 5.5, 0, 0, 7); x.fill();
      P(17, 6, 6, 18, '#c9c2b6'); P(15, 4, 10, 3, '#b9b2a6'); P(19, 0, 2, 5, '#9fd2f2'); P(14, 4, 1, 6, '#9fd2f2'); P(25, 4, 1, 6, '#9fd2f2'); break;
    case 'parada': [c, x] = mkCanvas(36, 40); P(2, 4, 32, 4, '#2f5a9a'); P(3, 8, 2, 30, '#5a5a5a'); P(31, 8, 2, 30, '#5a5a5a'); P(5, 10, 26, 18, 'rgba(180,220,240,.55)'); P(6, 28, 24, 3, '#7a5a3a');
      x.fillStyle = '#fff'; x.font = 'bold 4px sans-serif'; x.fillText('BUS', 13, 7.5); break;
    case 'cartel': [c, x] = mkCanvas(16, 20); P(7, 8, 2, 12, '#6a4a2a'); P(1, 1, 14, 9, '#8a5a32'); P(2, 2, 12, 7, '#c9a26a'); for (let i = 0; i < 3; i++) P(4, 3 + i * 2, 8, 1, '#6a4a2a'); break;
    case 'valla': [c, x] = mkCanvas(16, 14); P(0, 4, 16, 2, '#8a6a42'); P(0, 9, 16, 2, '#8a6a42'); P(2, 2, 2, 12, '#6a4a2a'); P(12, 2, 2, 12, '#6a4a2a'); break;
    case 'roca': [c, x] = mkCanvas(32, 28); x.fillStyle = '#a07a62'; x.beginPath(); x.moveTo(2, 26); x.lineTo(6, 8); x.lineTo(16, 2); x.lineTo(26, 6); x.lineTo(30, 26); x.fill(); x.fillStyle = '#7d5a46'; x.beginPath(); x.moveTo(16, 2); x.lineTo(26, 6); x.lineTo(30, 26); x.lineTo(18, 26); x.fill(); P(8, 12, 4, 2, '#c09a82'); break;
    case 'pena': [c, x] = mkCanvas(48, 64); x.fillStyle = '#a08878'; x.beginPath(); x.moveTo(4, 62); x.lineTo(8, 20); x.lineTo(20, 8); x.lineTo(32, 10); x.lineTo(42, 24); x.lineTo(46, 62); x.fill();
      x.fillStyle = '#5d4e42'; x.beginPath(); x.moveTo(30, 10); x.lineTo(42, 24); x.lineTo(46, 62); x.lineTo(32, 62); x.lineTo(34, 30); x.fill(); P(12, 30, 3, 14, '#c0a898'); break;
    case 'hierba': [c, x] = mkCanvas(16, 12); for (let i = 0; i < 7; i++) { const px = 1 + i * 2.2 + hash2(i, v) * 1.5, hh = 7 + hash2(v, i) * 4; P(px, 12 - hh, 2, hh, i % 2 ? '#2f7a34' : '#3f9a3e'); P(px, 12 - hh, 1, 2, '#6cc860'); } break;
    case 'flor': [c, x] = mkCanvas(8, 8); const fc = ['#ff5a7a', '#ffd23a', '#ffffff', '#b87aff'][v % 4]; P(3, 4, 1, 4, '#3a8a3a'); P(2, 1, 3, 3, fc); P(3, 2, 1, 1, '#ffef7a'); break;
    case 'objeto': [c, x] = mkCanvas(12, 12); x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(6, 10.5, 4.5, 1.5, 0, 0, 7); x.fill(); P(3, 2, 6, 8, '#3a8ad6'); P(3, 2, 6, 3, '#e8e8f0'); P(4, 5, 4, 4, '#5aa8f0'); P(4, 3, 2, 1, '#fff'); break;
    case 'maceta': [c, x] = mkCanvas(12, 16); P(3, 9, 6, 6, '#b8603a'); P(2, 8, 8, 2, '#c8704a'); blob(6, 6, 6, '#3f8a3a', 8); P(4, 3, 2, 2, '#ff5a7a'); P(7, 5, 2, 2, '#ffd23a'); break;
    case 'contenedor': [c, x] = mkCanvas(20, 18); P(1, 4, 18, 13, '#3a7a4a'); P(0, 2, 20, 3, '#2a5a36'); P(3, 15, 3, 3, '#222'); P(14, 15, 3, 3, '#222'); break;
    case 'coche': [c, x] = mkCanvas(34, 22); const cc = ['#c83a3a', '#e8e8e8', '#3a5ac8', '#2a2a2a'][v % 4]; P(2, 8, 30, 9, cc); P(8, 2, 18, 8, shade(cc, -.1)); P(10, 3, 6, 5, '#9fd2e8'); P(18, 3, 6, 5, '#9fd2e8'); P(5, 15, 6, 6, '#1a1a1a'); P(23, 15, 6, 6, '#1a1a1a'); P(30, 10, 2, 2, '#ffe9a0'); break;
    case 'silla': [c, x] = mkCanvas(20, 30); // sillón de barbero dorado y negro
      P(8, 22, 4, 6, '#c9a24a'); P(4, 27, 12, 2, '#c9a24a'); P(3, 4, 14, 12, '#1d1d22'); P(2, 14, 16, 6, '#1d1d22'); P(1, 12, 3, 8, '#c9a24a'); P(16, 12, 3, 8, '#c9a24a'); P(5, 6, 10, 2, '#3a3a44'); break;
    case 'espejo': [c, x] = mkCanvas(20, 30); P(2, 2, 16, 22, '#c9a24a'); P(4, 4, 12, 18, '#a8d8f0'); P(5, 5, 4, 8, '#e6f6ff'); P(0, 24, 20, 6, '#1d1d22'); P(2, 25, 4, 2, '#f2f2f2'); P(9, 25, 3, 3, '#3ac86a'); break;
    case 'camilla': [c, x] = mkCanvas(32, 20); P(2, 6, 28, 6, '#2a2a30'); P(2, 4, 28, 3, '#4a4a54'); P(4, 12, 2, 7, '#8a8a8a'); P(26, 12, 2, 7, '#8a8a8a'); P(24, 0, 6, 6, '#3a3a40'); break;
    case 'mostrador': [c, x] = mkCanvas(48, 24); P(0, 4, 48, 20, '#8a5a32'); P(0, 2, 48, 4, '#c9a26a'); P(4, 8, 40, 1, '#6a4226'); break;
    case 'estante': [c, x] = mkCanvas(32, 40); P(0, 0, 32, 40, '#7a4a28'); for (let s = 0; s < 4; s++) { P(2, 3 + s * 9, 28, 7, '#3a2414'); for (let b = 0; b < 6; b++) P(3 + b * 4.6, 4 + s * 9 + (hash2(b, s, v) * 2 | 0), 3, 6 - (hash2(s, b) * 2 | 0), pick(['#c83a3a', '#3a6ac8', '#e8c84a', '#4aa85a', '#e8e8e8', '#8a4ab8'])); } break;
    case 'mesa': [c, x] = mkCanvas(28, 18); P(1, 4, 26, 6, '#9a6a3a'); P(1, 2, 26, 3, '#b8844a'); P(3, 10, 2, 8, '#6a4226'); P(23, 10, 2, 8, '#6a4226'); break;
    case 'cama': [c, x] = mkCanvas(20, 32); P(1, 2, 18, 28, '#7a4a28'); P(2, 4, 16, 6, '#f4f4f4'); P(2, 10, 16, 18, '#4a7ac8'); P(2, 10, 16, 2, '#6a9ae8'); break;
    case 'pc': [c, x] = mkCanvas(24, 30); P(2, 10, 20, 20, '#d8d8e0'); P(4, 2, 16, 12, '#2a2a30'); P(5, 3, 14, 10, '#5ac8f0'); P(6, 4, 4, 2, '#e6f6ff'); P(4, 18, 16, 3, '#9a9aa6'); break;
    case 'nevera': [c, x] = mkCanvas(20, 34); P(1, 1, 18, 32, '#e8eef4'); P(2, 2, 16, 10, '#9fd2e8'); P(2, 14, 16, 18, '#f4f8fc'); for (let i = 0; i < 6; i++) P(3 + (i % 3) * 5, 3 + (i / 3 | 0) * 5, 4, 3, pick(['#e84a4a', '#4ac85a', '#f0c83a'])); break;
    case 'horno': [c, x] = mkCanvas(40, 36); x.fillStyle = '#b5573c'; x.beginPath(); x.arc(20, 22, 18, Math.PI, 0); x.lineTo(38, 34); x.lineTo(2, 34); x.fill(); P(13, 20, 14, 12, '#2a1410'); P(15, 24, 10, 8, '#ff8a2a'); P(17, 27, 6, 4, '#ffd84a'); break;
    case 'libros': [c, x] = mkCanvas(32, 44); P(0, 0, 32, 44, '#5a3a22'); for (let s = 0; s < 4; s++) { P(2, 2 + s * 10, 28, 9, '#2a1a10'); for (let b = 0; b < 7; b++) P(3 + b * 4, 3 + s * 10, 3, 8, pick(['#8a2a2a', '#2a4a8a', '#2a6a3a', '#8a6a2a', '#5a2a6a'])); } break;
    case 'tatu': [c, x] = mkCanvas(28, 30); P(2, 10, 24, 6, '#2a2a30'); P(4, 16, 2, 12, '#8a8a8a'); P(22, 16, 2, 12, '#8a8a8a'); P(16, 2, 10, 8, '#3a3a40'); P(18, 4, 2, 4, '#c9353c'); P(21, 4, 2, 4, '#2f5ab0'); P(24, 4, 1, 4, '#3ac86a'); break;
    case 'barra': [c, x] = mkCanvas(64, 26); P(0, 6, 64, 20, '#6a3a1a'); P(0, 4, 64, 4, '#9a6a3a'); for (let i = 0; i < 5; i++) { P(6 + i * 12, 0, 3, 5, '#4ab85a'); P(10 + i * 12, 1, 2, 4, '#e8c84a'); } break;
    case 'cesped': [c, x] = mkCanvas(16, 4); P(0, 0, 16, 4, '#4a9a3e'); break;
    case 'portería': [c, x] = mkCanvas(48, 30); P(0, 0, 48, 3, '#f4f4f4'); P(0, 0, 3, 30, '#f4f4f4'); P(45, 0, 3, 30, '#f4f4f4'); x.strokeStyle = 'rgba(255,255,255,.4)'; for (let i = 4; i < 45; i += 4) { x.beginPath(); x.moveTo(i, 3); x.lineTo(i, 30); x.stroke(); } break;
    case 'huerto': [c, x] = mkCanvas(16, 16); for (let i = 0; i < 3; i++) { P(2 + i * 5, 6, 3, 9, '#3f8a3a'); P(1 + i * 5, 4, 5, 4, '#5aaa48'); if (v % 2) P(2 + i * 5, 8, 3, 3, '#e2453c'); } break;
    case 'agua': [c, x] = mkCanvas(16, 6); P(2, 2, 6, 1, '#d8f0ff'); P(9, 4, 4, 1, '#d8f0ff'); break;
    case 'cartelazo': [c, x] = mkCanvas(40, 30); P(18, 14, 4, 16, '#5a5a5a'); P(0, 0, 40, 16, '#f4f4f4'); P(1, 1, 38, 14, '#2f5a9a'); x.fillStyle = '#fff'; x.font = 'bold 6px sans-serif'; x.textAlign = 'center'; x.fillText('TALAYUELAS', 20, 10); break;
    default: [c, x] = mkCanvas(8, 8); P(0, 0, 8, 8, '#f0f');
  }
  return propCache[k] = c;
}

Object.assign(window, { MonG, ART, monSprite, monVector, monShadow, personSheet, buildingImg, propImg, pixelate });
