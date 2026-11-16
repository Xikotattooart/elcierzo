'use strict';
/* =====================================================================
   TheTalaVillage · interfaz: diálogos, menús, equipo, mochila, Talapedia…
   ===================================================================== */
const FONT = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';
const font = (s, b = 'bold') => `${b} ${s}px ${FONT}`;
function panel(x, X, Y, w, h, o = {}) {
  x.save(); x.fillStyle = o.shadow === false ? 'transparent' : 'rgba(0,0,0,.35)'; x.beginPath(); x.roundRect(X + 3, Y + 4, w, h, o.r || 14); x.fill();
  x.fillStyle = o.bg || '#fbfaf6'; x.beginPath(); x.roundRect(X, Y, w, h, o.r || 14); x.fill();
  x.lineWidth = o.lw || 4; x.strokeStyle = o.border || '#3a4a6a'; x.stroke(); if (o.inner !== false) { x.lineWidth = 2; x.strokeStyle = o.inner || '#9fb6d8'; x.beginPath(); x.roundRect(X + 5, Y + 5, w - 10, h - 10, (o.r || 14) - 4); x.stroke(); } x.restore();
}
function txt(x, s, X, Y, o = {}) { x.font = o.f || font(o.s || 22, o.w || 'bold'); x.textAlign = o.a || 'left'; x.textBaseline = o.b || 'alphabetic'; if (o.sh !== false) { x.fillStyle = o.shc || 'rgba(0,0,0,.18)'; x.fillText(s, X + 1.5, Y + 1.5); } x.fillStyle = o.c || '#2a2f3a'; x.fillText(s, X, Y); }
function wrap(x, s, maxW, f) { x.font = f; const out = []; for (const para of String(s).split('\n')) { let line = ''; for (const w of para.split(' ')) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } out.push(line); } return out; }
function hpBar(x, X, Y, w, frac, h = 10) { x.fillStyle = '#3a3a44'; x.beginPath(); x.roundRect(X - 2, Y - 2, w + 4, h + 4, 5); x.fill(); x.fillStyle = '#f2f2f2'; x.fillRect(X, Y, w, h); const c = frac > .5 ? '#3cc85a' : frac > .2 ? '#f0c030' : '#e8483a'; x.fillStyle = c; x.fillRect(X, Y, Math.max(0, w * frac), h); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(X, Y, Math.max(0, w * frac), h * .35); }
function typeBadge(x, t, X, Y, w = 92, h = 24) { x.fillStyle = TYPES[t].c; x.beginPath(); x.roundRect(X, Y, w, h, 8); x.fill(); x.strokeStyle = shade(TYPES[t].c, -.35); x.lineWidth = 2; x.stroke(); txt(x, TYPES[t].n.toUpperCase(), X + w / 2, Y + h / 2 + 1, { s: 14, a: 'center', b: 'middle', c: '#fff', shc: 'rgba(0,0,0,.4)' }); }
function statusBadge(x, st, X, Y) { if (!st) return; const S = STATUS[st]; x.fillStyle = S.c; x.beginPath(); x.roundRect(X, Y, 46, 20, 6); x.fill(); txt(x, S.n, X + 23, Y + 11, { s: 13, a: 'center', b: 'middle', c: '#fff', sh: false }); }
function drawMonIcon(x, id, X, Y, sz = 56, shadowOnly) { const s = shadowOnly ? monShadow(id) : monSprite(id); x.imageSmoothingEnabled = false; x.drawImage(s, X - sz / 2, Y - sz / 2, sz, sz); }

/* ---------- pila de interfaz ---------- */
function pushUI(u) { return new Promise(res => { u._res = res; G.ui.push(u); }); }
function closeUI(u, v) { const i = G.ui.indexOf(u); if (i >= 0) G.ui.splice(i, 1); u._res && u._res(v); }
// toques en pantalla: cada UI registra zonas
let hitZones = [];
function zone(X, Y, w, h, fn) { hitZones.push({ X, Y, w, h, fn }); }
function handleTap(tx, ty) { for (let i = hitZones.length - 1; i >= 0; i--) { const z = hitZones[i]; if (tx >= z.X && ty >= z.Y && tx < z.X + z.w && ty < z.Y + z.h) { z.fn(); return true; } } return false; }

/* ---------- Diálogo ---------- */
class Dialog {
  constructor(text, o = {}) { this.o = o; this.pages = []; const [, cx] = mkCanvas(1, 1); const lines = wrap(cx, text, W - 110, font(23, 'bold')); for (let i = 0; i < lines.length; i += 2) this.pages.push(lines.slice(i, i + 2)); this.pi = 0; this.n = 0; this.t = 0; }
  update(dt) {
    const page = this.pages[this.pi], total = page.join('\n').length, sp = G.S && G.S.opts.fast ? 90 : 45;
    if (this.n < total) { this.n = Math.min(total, this.n + dt * sp); if ((this.n | 0) % 3 === 0) { } }
    if (Input.pressed('a') || Input.pressed('b') || this._tap) { this._tap = false;
      if (this.n < total) this.n = total; else if (this.pi < this.pages.length - 1) { this.pi++; this.n = 0; Audio.sfx('blip'); } else if (!this.o.keep) closeUI(this); else this.done = true; }
  }
  draw(x) {
    const Y = H - 118, X = 22, w = W - 44, h = 104; panel(x, X, Y, w, h, { bg: '#fdfcf8' });
    if (this.o.name) { const nw = Math.max(110, (x.measureText ? 0 : 0) + this.o.name.length * 13 + 36); panel(x, X + 16, Y - 34, nw, 40, { bg: '#3a4a6a', border: '#24304a', inner: false, r: 10 }); txt(x, this.o.name, X + 16 + nw / 2, Y - 9, { s: 20, a: 'center', c: '#fff', sh: false }); }
    const page = this.pages[this.pi]; let left = this.n | 0;
    page.forEach((ln, i) => { const s = ln.slice(0, Math.max(0, left)); left -= ln.length + 1; txt(x, s, X + 28, Y + 42 + i * 34, { s: 23 }); });
    const total = page.join('\n').length; if (this.n >= total && (this.pi < this.pages.length - 1 || !this.o.keep)) { const b = Math.sin(G.t * 8) * 3; x.fillStyle = '#d4343f'; x.beginPath(); x.moveTo(X + w - 34, Y + h - 26 + b); x.lineTo(X + w - 22, Y + h - 26 + b); x.lineTo(X + w - 28, Y + h - 18 + b); x.fill(); }
    zone(0, 0, W, H, () => { this._tap = true; });
  }
}
function say(text, o = {}) { if (G.S && o.name === undefined && /^[^:\n]{1,22}: /.test(text)) { const i = text.indexOf(': '); o = Object.assign({}, o, { name: text.slice(0, i) }); text = text.slice(i + 2); } return pushUI(new Dialog(text, o)); }

/* ---------- Menú de lista ---------- */
class ListMenu {
  constructor(items, o = {}) { this.items = items; this.o = o; this.i = o.start || 0; this.scroll = 0; this.rows = o.rows || Math.min(items.length, 8); }
  update() {
    const n = this.items.length; if (Input.repeat('up')) { this.i = (this.i - 1 + n) % n; Audio.sfx('blip'); } if (Input.repeat('down')) { this.i = (this.i + 1) % n; Audio.sfx('blip'); }
    if (this.o.onLR) { if (Input.repeat('left')) this.o.onLR(this, -1); if (Input.repeat('right')) this.o.onLR(this, 1); }
    if (this.i < this.scroll) this.scroll = this.i; if (this.i >= this.scroll + this.rows) this.scroll = this.i - this.rows + 1;
    if (Input.pressed('a')) this.choose(this.i); else if (Input.pressed('b') || (this.o.menuCloses && Input.pressed('menu'))) { if (this.o.noCancel) return; Audio.sfx('back'); closeUI(this, -1); }
  }
  choose(i) { const it = this.items[i]; if (it && it.disabled) { Audio.sfx('bump'); return; } Audio.sfx('ok'); closeUI(this, i); }
  draw(x) {
    const o = this.o, rh = o.rh || 44, w = o.w || 260, h = this.rows * rh + 24 + (o.title ? 34 : 0), X = o.x !== undefined ? o.x : W - w - 16, Y = o.y !== undefined ? o.y : 16;
    if (o.back) o.back(x); panel(x, X, Y, w, h);
    let yy = Y + 12; if (o.title) { txt(x, o.title, X + 20, yy + 24, { s: 19, c: '#3a4a6a' }); yy += 34; }
    for (let r = 0; r < this.rows; r++) {
      const i = this.scroll + r, it = this.items[i]; if (!it) break; const sel = i === this.i, Yr = yy + r * rh;
      if (sel) { x.fillStyle = '#ffe9a8'; x.beginPath(); x.roundRect(X + 10, Yr + 2, w - 20, rh - 4, 9); x.fill(); x.fillStyle = '#d4343f'; x.beginPath(); x.moveTo(X + 18, Yr + rh / 2 - 7); x.lineTo(X + 28, Yr + rh / 2); x.lineTo(X + 18, Yr + rh / 2 + 7); x.fill(); }
      txt(x, it.label, X + 36, Yr + rh / 2 + 8, { s: o.fs || 21, c: it.disabled ? '#9aa0aa' : '#2a2f3a' });
      if (it.right) txt(x, it.right, X + w - 22, Yr + rh / 2 + 8, { s: 18, a: 'right', c: '#4a5a7a' });
      zone(X, Yr, w, rh, () => { if (this.i === i) this.choose(i); else { this.i = i; Audio.sfx('blip'); if (o.tapChoose) this.choose(i); } });
    }
    if (this.items.length > this.rows) { const sh = h - 30, th = sh * this.rows / this.items.length, ty = Y + 15 + (sh - th) * this.scroll / (this.items.length - this.rows); x.fillStyle = '#c8d2e4'; x.fillRect(X + w - 10, Y + 15, 4, sh); x.fillStyle = '#3a4a6a'; x.fillRect(X + w - 10, ty, 4, th); }
    if (o.desc) { const it = this.items[this.i]; if (it && it.desc) { panel(x, 16, H - 110, W - 32 - (o.descRight ? w + 10 : 0), 96); wrap(x, it.desc, W - 90 - (o.descRight ? w + 10 : 0), font(19)).slice(0, 3).forEach((l, k) => txt(x, l, 36, H - 76 + k * 26, { s: 19, w: 'normal' })); } }
  }
}
const menu = (items, o) => pushUI(new ListMenu(items.map(i => typeof i === 'string' ? { label: i } : i), o));
async function ask(text, opts = ['Sí', 'No'], o = {}) { const d = new Dialog(text, Object.assign({ keep: true }, o)); G.ui.push(d); while (!d.done) await nextFrame(); const r = await menu(opts, { x: W - 200, y: H - 140 - opts.length * 44, w: 180, noCancel: o.noCancel }); closeUI(d); return r; }

/* ---------- Pantallas completas ---------- */
class Screen { constructor(o) { Object.assign(this, o); } update(dt) { this.upd && this.upd(dt); } draw(x) { this.drw(x); } }
function bgScreen(x, title, c1 = '#7fb8e8', c2 = '#c8e4f8') {
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i < 12; i++) { x.beginPath(); x.arc((i * 97 + G.t * 12) % (W + 80) - 40, 60 + (i * 53) % 380, 18 + i % 3 * 10, 0, 7); x.fill(); }
  x.fillStyle = '#3a4a6a'; x.fillRect(0, 0, W, 52); txt(x, title, 24, 36, { s: 26, c: '#fff', sh: false });
  x.fillStyle = '#d4343f'; x.fillRect(0, 52, W, 4);
}

/* ---------- Equipo ---------- */
async function partyScreen(mode = 'view', o = {}) {
  // mode: 'view' | 'pick' (devuelve índice) | 'battle'
  return pushUI(new Screen({
    i: 0, swap: -1,
    upd() {
      const P = G.S.party, n = P.length + 1; if (Input.repeat('up')) { this.i = (this.i - 2 + n) % n; Audio.sfx('blip'); } if (Input.repeat('down')) { this.i = (this.i + 2) % n; Audio.sfx('blip'); }
      if (Input.repeat('left')) { this.i = (this.i - 1 + n) % n; Audio.sfx('blip'); } if (Input.repeat('right')) { this.i = (this.i + 1) % n; Audio.sfx('blip'); }
      if (Input.pressed('a') || this._t) { this._t = false; this.act(); } else if (Input.pressed('b')) { if (this.swap >= 0) { this.swap = -1; return; } if (o.noCancel) return; Audio.sfx('back'); closeUI(this, -1); }
    },
    async act() {
      const P = G.S.party; if (this.i >= P.length) { if (o.noCancel) return; Audio.sfx('back'); closeUI(this, -1); return; }
      if (this.swap >= 0) { const a = P[this.swap]; P[this.swap] = P[this.i]; P[this.i] = a; this.swap = -1; Audio.sfx('ok'); return; }
      if (this.busy) return; this.busy = true; Audio.sfx('ok');
      if (mode === 'pick') { closeUI(this, this.i); return; }
      const m = P[this.i]; const opts = mode === 'battle' ? ['Cambiar', 'Datos', 'Volver'] : ['Datos', 'Mover', 'Volver'];
      const r = await menu(opts, { x: W - 220, y: H - 60 - opts.length * 44, w: 200 });
      this.busy = false;
      if (opts[r] === 'Datos') await summary(m);
      else if (opts[r] === 'Mover') this.swap = this.i;
      else if (opts[r] === 'Cambiar') closeUI(this, this.i);
    },
    drw(x) {
      bgScreen(x, o.title || (mode === 'pick' ? 'Elige un Talamón' : 'Equipo'), '#6aa8d8', '#bfe0f4'); const P = G.S.party;
      for (let k = 0; k < 6; k++) {
        const cx = 20 + (k % 2) * 385, cy = 70 + (k >> 1) * 112, m = P[k], sel = k === this.i, sw = k === this.swap;
        x.save(); x.globalAlpha = m ? 1 : .35; panel(x, cx, cy, 370, 100, { bg: sel ? '#fff4c8' : m && m.hp <= 0 ? '#f4d0c8' : '#f4f8fc', border: sw ? '#d4343f' : sel ? '#e8a020' : '#3a4a6a', r: 20 }); x.restore();
        if (!m) continue; drawMonIcon(x, m.id, cx + 52, cy + 50, 84);
        txt(x, monName(m), cx + 102, cy + 36, { s: 22 }); txt(x, 'Nv. ' + m.lvl, cx + 350, cy + 36, { s: 18, a: 'right', c: '#4a5a7a' });
        hpBar(x, cx + 104, cy + 50, 200, m.hp / m.mhp); txt(x, `${m.hp}/${m.mhp}`, cx + 350, cy + 86, { s: 17, a: 'right', c: '#4a5a7a' }); statusBadge(x, m.st, cx + 104, cy + 70);
        if (m.hp <= 0) txt(x, 'DEBILITADO', cx + 104, cy + 86, { s: 15, c: '#c83a3a' });
        zone(cx, cy, 370, 100, () => { if (this.i === k) this._t = true; else { this.i = k; Audio.sfx('blip'); this._t = true; } });
      }
      const sel = this.i === P.length; panel(x, W - 190, H - 62, 170, 48, { bg: sel ? '#fff4c8' : '#f4f8fc', border: sel ? '#e8a020' : '#3a4a6a' }); txt(x, o.noCancel ? '—' : 'Volver', W - 105, H - 31, { s: 21, a: 'center' });
      zone(W - 190, H - 62, 170, 48, () => { this.i = P.length; this._t = true; });
      if (this.swap >= 0) txt(x, '¿Con quién lo cambias?', 24, H - 26, { s: 20, c: '#fff', shc: 'rgba(0,0,0,.6)' });
      if (o.msg) txt(x, o.msg, 24, H - 26, { s: 20, c: '#fff', shc: 'rgba(0,0,0,.6)' });
    },
  }));
}
async function summary(m) {
  const sp = SPECIES[m.id];
  return pushUI(new Screen({
    pg: 0,
    upd() { if (Input.pressed('left') || Input.pressed('right')) { this.pg ^= 1; Audio.sfx('blip'); } if (Input.pressed('a') || Input.pressed('b') || this._t) { this._t = false; Audio.sfx('back'); closeUI(this); } },
    drw(x) {
      bgScreen(x, 'Datos · ' + monName(m), '#7ac0a0', '#d4f0e0'); panel(x, 20, 70, 300, 380, { r: 20 });
      const bob = Math.sin(G.t * 3) * 3; drawMonIcon(x, m.id, 170, 200 + bob, 220);
      txt(x, `Nº ${String(sp.num).padStart(3, '0')}  ${sp.n}`, 40, 110, { s: 22 }); sp.t.forEach((t, i) => typeBadge(x, t, 40 + i * 100, 330)); txt(x, 'Nv. ' + m.lvl, 300, 110, { s: 20, a: 'right', c: '#4a5a7a' });
      const nx = expFor(m.lvl + 1), pv = expFor(m.lvl), fr = m.lvl >= 100 ? 1 : (m.exp - pv) / (nx - pv); txt(x, 'Exp. para subir: ' + Math.max(0, nx - m.exp), 40, 386, { s: 16, w: 'normal' }); x.fillStyle = '#ddd'; x.fillRect(40, 396, 260, 8); x.fillStyle = '#3a8ae0'; x.fillRect(40, 396, 260 * fr, 8);
      txt(x, m.ot ? 'Entrenador: ' + m.ot : '', 40, 432, { s: 15, w: 'normal', c: '#5a6a8a' });
      panel(x, 336, 70, 444, 380, { r: 20 });
      if (this.pg === 0) {
        txt(x, 'Estadísticas', 360, 108, { s: 21, c: '#3a4a6a' });
        const rows = [['PS', `${m.hp}/${m.mhp}`], ['Ataque', m.atk], ['Defensa', m.def], ['Especial', m.esp], ['Velocidad', m.vel]];
        rows.forEach(([a, b], i) => { txt(x, a, 370, 150 + i * 38, { s: 20, w: 'normal' }); txt(x, String(b), 760, 150 + i * 38, { s: 20, a: 'right' }); });
        statusBadge(x, m.st, 370, 340); wrap(x, sp.d, 400, font(16, 'normal')).slice(0, 3).forEach((l, i) => txt(x, l, 360, 380 + i * 22, { s: 16, w: 'normal', c: '#4a5a6a' }));
      } else {
        txt(x, 'Ataques', 360, 108, { s: 21, c: '#3a4a6a' });
        m.moves.forEach((mv, i) => { const M = MOVES[mv.k]; typeBadge(x, M.t, 360, 128 + i * 76, 86, 22); txt(x, M.n, 456, 146 + i * 76, { s: 21 }); txt(x, `PP ${mv.pp}/${M.pp}`, 760, 146 + i * 76, { s: 17, a: 'right', c: '#4a5a7a' }); txt(x, `${M.c === 's' ? 'Estado' : M.c === 'f' ? 'Físico' : 'Especial'}${M.p ? ' · Pot. ' + M.p : ''} · Prec. ${M.a > 100 ? '—' : M.a}`, 456, 170 + i * 76, { s: 15, w: 'normal', c: '#5a6a8a' }); });
      }
      txt(x, '◀ ▶ cambiar página', W - 30, H - 14, { s: 15, a: 'right', c: '#2a4a3a', sh: false });
      zone(336, 70, 444, 380, () => { this.pg ^= 1; Audio.sfx('blip'); }); zone(20, 70, 300, 380, () => { this._t = true; });
    },
  }));
}

/* ---------- Mochila ---------- */
const BAGTABS = [['Objetos', it => ['heal', 'status', 'revive', 'level', 'repel', 'pp'].includes(it.k)], ['Gominas', it => it.k === 'ball'], ['Clave', it => it.k === 'key']];
async function bagScreen(inBattle = false) {
  return pushUI(new Screen({
    tab: inBattle ? 0 : 0, i: 0,
    list() { const f = BAGTABS[this.tab][1]; return Object.keys(G.S.bag).filter(k => G.S.bag[k] > 0 && ITEMS[k] && f(ITEMS[k])).map(k => ITEMS[k]); },
    upd() {
      const L = this.list(), n = L.length + 1;
      if (Input.repeat('left')) { this.tab = (this.tab + 2) % 3; this.i = 0; Audio.sfx('blip'); } if (Input.repeat('right')) { this.tab = (this.tab + 1) % 3; this.i = 0; Audio.sfx('blip'); }
      if (Input.repeat('up')) { this.i = (this.i - 1 + n) % n; Audio.sfx('blip'); } if (Input.repeat('down')) { this.i = (this.i + 1) % n; Audio.sfx('blip'); }
      if (Input.pressed('a') || this._t) { this._t = false; if (this.i >= L.length) { Audio.sfx('back'); closeUI(this, null); return; } this.use(L[this.i]); }
      else if (Input.pressed('b')) { Audio.sfx('back'); closeUI(this, null); }
    },
    async use(it) {
      if (this.busy) return; this.busy = true; Audio.sfx('ok');
      try {
        if (inBattle) { if (it.k === 'key') { await say('¡Ahora no es momento de usar eso!'); return; } closeUI(this, it.id); return; }
        if (it.k === 'ball') { await say('Las gominas se lanzan durante los combates contra Talamones salvajes.'); return; }
        if (it.id === 'bici') { G.p.bike = !G.p.bike; closeUI(this, null); return; }
        if (it.id === 'talapedia') { await dexScreen(); return; }
        if (it.k === 'key') { await say(it.d); return; }
        if (it.k === 'repel') { G.S.repel = it.steps; G.S.bag[it.id]--; await say('Te echas Colonia Fuerte. ¡Uf, qué olor! Los Talamones salvajes no se acercarán por un rato.'); return; }
        const pi = await partyScreen('pick', { title: 'Usar ' + it.n }); if (pi < 0) return; const m = G.S.party[pi]; await useItemOn(it.id, m);
      } finally { this.busy = false; }
    },
    drw(x) {
      bgScreen(x, 'Mochila', '#d8a060', '#f4e0c0'); const L = this.list();
      BAGTABS.forEach(([nm], k) => { const X = 20 + k * 170; panel(x, X, 66, 160, 44, { bg: k === this.tab ? '#fff4c8' : '#e8dccc', border: k === this.tab ? '#e8a020' : '#6a5a4a', r: 12 }); txt(x, nm, X + 80, 95, { s: 19, a: 'center' }); zone(X, 66, 160, 44, () => { this.tab = k; this.i = 0; Audio.sfx('blip'); }); });
      panel(x, 20, 120, 470, 346, { r: 18 });
      const rows = 7, sc = Math.max(0, Math.min(this.i - 3, L.length + 1 - rows));
      for (let r = 0; r < rows; r++) { const k = sc + r; if (k > L.length) break; const Y = 134 + r * 46, sel = k === this.i;
        if (sel) { x.fillStyle = '#ffe9a8'; x.beginPath(); x.roundRect(30, Y, 450, 42, 9); x.fill(); }
        if (k === L.length) txt(x, 'Cerrar mochila', 50, Y + 29, { s: 20, c: '#6a5a4a' }); else { txt(x, L[k].n, 50, Y + 29, { s: 21 }); if (L[k].k !== 'key') txt(x, '× ' + G.S.bag[L[k].id], 470, Y + 29, { s: 19, a: 'right', c: '#5a4a3a' }); }
        zone(30, Y, 450, 42, () => { if (this.i === k) this._t = true; else { this.i = k; Audio.sfx('blip'); } }); }
      panel(x, 504, 120, 276, 346, { r: 18 }); const it = L[this.i];
      if (it) { drawItemIcon(x, it, 642, 210); wrap(x, it.d, 236, font(17, 'normal')).slice(0, 7).forEach((l, k) => txt(x, l, 524, 290 + k * 24, { s: 17, w: 'normal' })); }
      txt(x, `Dinero: ${G.S.money} €`, W - 24, 36, { s: 20, a: 'right', c: '#fff', sh: false });
    },
  }));
}
function drawItemIcon(x, it, X, Y) {
  x.save(); x.translate(X, Y);
  if (it.k === 'ball') { const c = { gomina: '#3a8ad6', supergomina: '#d4343f', hipergomina: '#1d1d22', gominamaestra: '#8a3ad6' }[it.id]; x.fillStyle = c; x.beginPath(); x.roundRect(-26, -30, 52, 60, 10); x.fill(); x.fillStyle = '#eef'; x.fillRect(-28, -38, 56, 16); x.fillStyle = '#fff8'; x.fillRect(-18, -18, 8, 34); txt(x, 'G', 0, 14, { s: 28, a: 'center', c: '#fff' }); }
  else if (it.k === 'heal' || it.k === 'pp') { x.fillStyle = it.id === 'pan' ? '#d99a52' : '#9fd8f0'; if (it.id === 'pan') { x.beginPath(); x.ellipse(0, 0, 40, 26, 0, 0, 7); x.fill(); } else { x.beginPath(); x.roundRect(-18, -34, 36, 66, 10); x.fill(); x.fillStyle = '#e8e8f0'; x.fillRect(-10, -44, 20, 12); x.fillStyle = '#fff8'; x.fillRect(-10, -26, 6, 44); } }
  else if (it.k === 'key') { x.fillStyle = '#e8c84a'; x.beginPath(); x.arc(0, -10, 22, 0, 7); x.fill(); x.fillStyle = '#c9a23a'; x.fillRect(-5, 6, 10, 30); }
  else { x.fillStyle = '#e88aa8'; x.beginPath(); x.roundRect(-24, -30, 48, 60, 12); x.fill(); x.fillStyle = '#fff8'; x.fillRect(-14, -20, 6, 36); }
  x.restore();
}
async function useItemOn(id, m) {
  const it = ITEMS[id];
  if (it.k === 'heal') { if (m.hp <= 0) { await say('¡No sirve con un Talamón debilitado!'); return false; } if (m.hp >= m.mhp) { await say('Ya tiene todos los PS.'); return false; } const h = Math.min(it.hp, m.mhp - m.hp); m.hp += h; G.S.bag[id]--; Audio.sfx('heal'); await say(`${monName(m)} recupera ${h} PS.`); return true; }
  if (it.k === 'status') { if (!m.st) { await say('No tiene ningún problema de estado.'); return false; } m.st = null; m.sleep = 0; G.S.bag[id]--; Audio.sfx('heal'); await say(`${monName(m)} se encuentra estupendamente.`); return true; }
  if (it.k === 'revive') { if (m.hp > 0) { await say('¡Pero si no está debilitado!'); return false; } m.hp = Math.floor(m.mhp / 2); m.st = null; G.S.bag[id]--; Audio.sfx('heal'); await say(`¡${monName(m)} vuelve a estar en pie!`); return true; }
  if (it.k === 'pp') { for (const mv of m.moves) mv.pp = Math.min(MOVES[mv.k].pp, mv.pp + 10); G.S.bag[id]--; Audio.sfx('heal'); await say(`Los ataques de ${monName(m)} recuperan PP.`); return true; }
  if (it.k === 'level') { if (m.lvl >= 100) return false; G.S.bag[id]--; m.exp = expFor(m.lvl + 1); await levelUp(m, true); await checkEvolution(m); return true; }
  return false;
}

/* ---------- Talapedia ---------- */
async function dexScreen() {
  const all = Object.values(SPECIES).filter(s => s.id !== 'bochornazo' || G.S.seen[s.id]);
  return pushUI(new Screen({
    i: 0,
    upd() { const n = all.length; if (Input.repeat('up')) { this.i = (this.i - 1 + n) % n; Audio.sfx('blip'); } if (Input.repeat('down')) { this.i = (this.i + 1) % n; Audio.sfx('blip'); } if (Input.repeat('left')) { this.i = Math.max(0, this.i - 7); Audio.sfx('blip'); } if (Input.repeat('right')) { this.i = Math.min(n - 1, this.i + 7); Audio.sfx('blip'); }
      if (Input.pressed('a') || this._t) { this._t = false; const s = all[this.i]; if (G.S.seen[s.id]) { Audio.sfx('ok'); dexEntry(s); } else Audio.sfx('bump'); } else if (Input.pressed('b')) { Audio.sfx('back'); closeUI(this); } },
    drw(x) {
      bgScreen(x, 'Talapedia', '#d4343f', '#f6c8c8'); const seen = Object.keys(G.S.seen).length, caught = Object.keys(G.S.caught).length;
      txt(x, `Vistos ${seen} · Capturados ${caught}`, W - 24, 36, { s: 19, a: 'right', c: '#fff', sh: false });
      panel(x, 400, 66, 384, 400, { r: 20 }); const rows = 8, sc = Math.max(0, Math.min(this.i - 3, all.length - rows));
      for (let r = 0; r < rows; r++) { const k = sc + r, s = all[k]; if (!s) break; const Y = 80 + r * 47, sel = k === this.i; if (sel) { x.fillStyle = '#ffe9a8'; x.beginPath(); x.roundRect(410, Y, 364, 43, 9); x.fill(); }
        txt(x, String(s.num).padStart(3, '0'), 424, Y + 29, { s: 18, c: '#7a5a5a' }); txt(x, G.S.seen[s.id] ? s.n : '- - -', 480, Y + 29, { s: 21 }); if (G.S.caught[s.id]) { x.fillStyle = '#3a8ad6'; x.beginPath(); x.roundRect(736, Y + 12, 18, 20, 4); x.fill(); }
        zone(410, Y, 364, 43, () => { if (this.i === k) this._t = true; else { this.i = k; Audio.sfx('blip'); } }); }
      panel(x, 16, 66, 370, 400, { r: 20 }); const s = all[this.i]; x.fillStyle = '#e8f4f0'; x.beginPath(); x.roundRect(36, 86, 330, 260, 16); x.fill();
      if (G.S.seen[s.id]) { drawMonIcon(x, s.id, 201, 216 + Math.sin(G.t * 3) * 3, 230, !G.S.caught[s.id] && false); txt(x, s.n, 201, 382, { s: 26, a: 'center' }); s.t.forEach((t, i) => typeBadge(x, t, 201 - s.t.length * 50 + i * 100 + 4, 400)); }
      else { drawMonIcon(x, s.id, 201, 216, 230, true); txt(x, '???', 201, 382, { s: 26, a: 'center' }); }
    },
  }));
}
async function dexEntry(s) {
  return pushUI(new Screen({
    upd() { if (Input.pressed('a') || Input.pressed('b') || this._t) { this._t = false; Audio.sfx('back'); closeUI(this); } },
    drw(x) {
      bgScreen(x, `Talapedia · Nº ${String(s.num).padStart(3, '0')}`, '#d4343f', '#f6c8c8'); panel(x, 20, 70, 340, 390, { r: 20 }); drawMonIcon(x, s.id, 190, 230 + Math.sin(G.t * 3) * 4, 260);
      panel(x, 376, 70, 404, 390, { r: 20 }); txt(x, s.n, 400, 116, { s: 30 }); s.t.forEach((t, i) => typeBadge(x, t, 400 + i * 100, 132));
      if (G.S.caught[s.id]) { txt(x, `Altura: ${s.h}    Peso: ${s.w}`, 400, 192, { s: 18, w: 'normal', c: '#5a6a8a' }); wrap(x, s.d, 356, font(19, 'normal')).forEach((l, i) => txt(x, l, 400, 236 + i * 28, { s: 19, w: 'normal' })); }
      else txt(x, 'Captúralo para saber más.', 400, 236, { s: 19, w: 'normal', c: '#7a6a6a' });
      zone(0, 0, W, H, () => { this._t = true; });
    },
  }));
}

/* ---------- Tienda ---------- */
async function shopScreen(stock, who = 'Cajera') {
  const r = await menu(['Comprar', 'Vender', 'Nada, gracias'], { x: W - 240, y: 120, w: 220 }); if (r === 2 || r < 0) { await say('¡Vuelve cuando quieras!', { name: who }); return; }
  if (r === 1) { // vender
    while (true) { const L = Object.keys(G.S.bag).filter(k => G.S.bag[k] > 0 && ITEMS[k].k !== 'key' && ITEMS[k].price); if (!L.length) { await say('No tienes nada que vender.', { name: who }); return; }
      const i = await menu(L.map(k => ({ label: ITEMS[k].n + ' ×' + G.S.bag[k], right: (ITEMS[k].price / 2 | 0) + ' €' })).concat([{ label: 'Salir' }]), { x: 220, y: 60, w: 400, rows: 7, title: `Dinero: ${G.S.money} €` });
      if (i < 0 || i >= L.length) return; const k = L[i]; G.S.bag[k]--; G.S.money += ITEMS[k].price / 2 | 0; Audio.sfx('save'); }
  }
  while (true) {
    const L = stock.map(k => ({ label: ITEMS[k].n, right: ITEMS[k].price + ' €', desc: ITEMS[k].d })).concat([{ label: 'Salir', desc: '' }]);
    const i = await menu(L, { x: W - 400, y: 16, w: 384, rows: 7, title: `Dinero: ${G.S.money} €`, desc: true, descRight: false }); if (i < 0 || i >= stock.length) { await say('¡Gracias por tu compra!', { name: who }); return; }
    const k = stock[i], pr = ITEMS[k].price; let q = 1; const maxQ = Math.max(1, Math.min(99, G.S.money / pr | 0));
    if (G.S.money < pr) { await say('Uy… no te llega el dinero.', { name: who }); continue; }
    const qm = new ListMenu([{ label: '' }], { x: W - 330, y: 200, w: 300, rows: 1, title: '¿Cuántos?', onLR: (mm, d) => { q = clamp(q + d, 1, maxQ); Audio.sfx('blip'); } });
    const drawQ = qm.draw.bind(qm); qm.draw = (x) => { qm.items[0].label = `◀ ${q} ▶`; qm.items[0].right = (q * pr) + ' €'; drawQ(x); zone(W - 330, 250, 80, 50, () => { q = clamp(q - 1, 1, maxQ); }); zone(W - 250, 250, 80, 50, () => { q = clamp(q + 1, 1, maxQ); }); };
    const ok = await pushUI(qm); if (ok < 0) continue;
    G.S.money -= q * pr; addItem(k, q); Audio.sfx('save');
    if (k === 'gomina' && q >= 10) { addItem('supergomina', 1); await say('¡Por comprar tantas, te regalo una Supergomina!', { name: who }); } else await say(`Aquí tienes: ${q} × ${ITEMS[k].n}.`, { name: who });
  }
}

/* ---------- Caja Rural (almacén de Talamones) ---------- */
async function boxScreen() {
  while (true) {
    const r = await menu(['Sacar Talamón', 'Dejar Talamón', 'Salir'], { x: W - 280, y: 120, w: 260, title: 'Caja Rural · Cuenta de Talamones' }); if (r !== 0 && r !== 1) return;
    if (r === 1) { if (G.S.party.length <= 1) { await say('Tienes que llevar al menos un Talamón contigo.'); continue; }
      const i = await partyScreen('pick', { title: '¿Cuál quieres dejar?' }); if (i < 0) continue; const m = G.S.party.splice(i, 1)[0]; healMon(m); G.S.box.push(m); Audio.sfx('save'); await say(`${monName(m)} queda guardado en la Caja Rural. ¡Sin comisiones!`); }
    else { if (!G.S.box.length) { await say('Tu cuenta está vacía. Captura más Talamones.'); continue; } if (G.S.party.length >= 6) { await say('Tu equipo está lleno (6 Talamones).'); continue; }
      const i = await menu(G.S.box.map(m => ({ label: monName(m), right: 'Nv. ' + m.lvl })).concat([{ label: 'Volver' }]), { x: 200, y: 30, w: 400, rows: 8, title: `Caja (${G.S.box.length})` }); if (i < 0 || i >= G.S.box.length) continue;
      const m = G.S.box.splice(i, 1)[0]; G.S.party.push(m); Audio.sfx('ok'); await say(`¡${monName(m)} se une a tu equipo!`); }
  }
}
function healMon(m) { m.hp = m.mhp; m.st = null; for (const mv of m.moves) mv.pp = MOVES[mv.k].pp; }

/* ---------- Tarjeta de entrenador ---------- */
const MEDALS = [['balon', 'Medalla Balón', '#3a8ad6'], ['tomate', 'Medalla Tomate', '#d4343f'], ['capote', 'Medalla Capote', '#e8a020'], ['libro', 'Medalla Libro', '#7a4ab8']];
async function cardScreen() {
  return pushUI(new Screen({
    upd() { if (Input.pressed('a') || Input.pressed('b') || this._t) { this._t = false; Audio.sfx('back'); closeUI(this); } },
    drw(x) {
      bgScreen(x, 'Tarjeta de Entrenador', '#3a4a6a', '#8aa0c8'); panel(x, 40, 76, 720, 380, { bg: '#fff8e8', border: '#c9a24a', inner: '#e8d2a0', r: 24 });
      const sh = personSheet(playerLook()); x.imageSmoothingEnabled = false; x.drawImage(sh, 0, 0, 16, 24, 560, 110, 128, 192);
      txt(x, 'NOMBRE: ' + G.S.name, 80, 136, { s: 26 }); txt(x, 'DINERO: ' + G.S.money + ' €', 80, 180, { s: 22, w: 'normal' });
      txt(x, `TALAPEDIA: ${Object.keys(G.S.caught).length} capturados`, 80, 220, { s: 22, w: 'normal' });
      const t = G.S.time | 0; txt(x, `TIEMPO DE JUEGO: ${t / 3600 | 0}h ${String((t / 60 | 0) % 60).padStart(2, '0')}m`, 80, 260, { s: 22, w: 'normal' });
      txt(x, 'MEDALLAS DE TALAYUELAS', 80, 318, { s: 18, c: '#8a6a2a' });
      MEDALS.forEach(([id, n, c], i) => { const X = 110 + i * 150, Y = 380, has = G.S.medals.includes(id); x.fillStyle = has ? c : '#ddd'; x.beginPath(); x.arc(X, Y, 30, 0, 7); x.fill(); x.lineWidth = 4; x.strokeStyle = has ? shade(c, -.35) : '#bbb'; x.stroke(); if (has) { x.fillStyle = '#fff8'; x.beginPath(); x.arc(X - 9, Y - 10, 8, 0, 7); x.fill(); } txt(x, n.replace('Medalla ', ''), X, Y + 52, { s: 15, a: 'center', c: has ? '#3a3a3a' : '#aaa' }); });
      zone(0, 0, W, H, () => { this._t = true; });
    },
  }));
}

/* ---------- Menú de inicio ---------- */
async function openStartMenu() {
  while (true) {
    const items = []; if (flag('talapedia')) items.push({ label: 'Talapedia', k: 'dex' }); if (G.S.party.length) items.push({ label: 'Equipo', k: 'party' });
    items.push({ label: 'Mochila', k: 'bag' }, { label: G.S.name, k: 'card' }, { label: 'Objetivo', k: 'goal' }, { label: 'Guardar', k: 'save' }, { label: 'Opciones', k: 'opt' }, { label: 'Salir del juego', k: 'exit' }, { label: 'Volver', k: 'close' });
    const i = await menu(items, { menuCloses: true, rows: items.length, rh: 42, w: 250 }); if (i < 0) return; const k = items[i].k;
    if (k === 'close') return; if (k === 'dex') await dexScreen(); if (k === 'party') await partyScreen(); if (k === 'bag') { await bagScreen(); if (!G.ui.length) return; } if (k === 'card') await cardScreen();
    if (k === 'goal') await say('Objetivo: ' + currentGoal());
    if (k === 'save') { if (await ask('¿Quieres guardar la partida?') === 0) { await saveGame(); } }
    if (k === 'opt') await optionsMenu();
    if (k === 'exit') { if (await ask('¿Guardar y volver a Secret Games?') === 0) { await saveGame(true); exitGame(); return; } }
  }
}
async function optionsMenu() {
  while (true) {
    const o = G.S.opts; const i = await menu([{ label: 'Texto', right: o.fast ? 'Rápido' : 'Normal' }, { label: 'Sonido', right: o.sound ? 'Sí' : 'No' }, { label: 'Controles' }, { label: 'Volver' }], { w: 330, title: 'Opciones' });
    if (i === 0) o.fast = !o.fast; else if (i === 1) { o.sound = !o.sound; Audio.setOn(o.sound); } else if (i === 2) await say('Muévete con las flechas o la cruceta. A (Z / Espacio / Intro) para hablar y aceptar. B (X) para volver o correr manteniéndolo pulsado. MENÚ (Esc / M) para abrir este menú.'); else return;
  }
}
function toast(msg, t = 2.2) { G.toast = { msg, t: G.t + t }; }

Object.assign(window, { FONT, font, panel, txt, wrap, hpBar, typeBadge, statusBadge, drawMonIcon, pushUI, closeUI, zone, handleTap, Dialog, say, ListMenu, menu, ask, Screen, bgScreen, partyScreen, summary, bagScreen, useItemOn, dexScreen, shopScreen, boxScreen, healMon, cardScreen, openStartMenu, toast, MEDALS, getZones: () => hitZones, resetZones: () => { hitZones = []; } });

/* ---------- Teclado para escribir el nombre ---------- */
async function nameEntry(title = '¿Cómo te llamas?', max = 10) {
  const ROWS = ['ABCDEFGHIJ', 'KLMNÑOPQRS', 'TUVWXYZÁÉÍ', 'ÓÚÜÇ-.\'!¡ '];
  const SPECIAL = [['Aa', 0, 3], ['Borrar', 3, 4], ['OK', 7, 3]]; // etiqueta, columna inicial, ancho
  const KW = 66, KH = 50, GX = 400 - 5 * 70 + 2, GY = 150;
  const sc = new Screen({ name: '', up: true, r: 0, c: 0, t: 0,
    put(ch) { if (this.name.length >= max) { Audio.sfx('bump'); return; } this.name += ch; if (this.up && this.name.length === 1) this.up = false; Audio.sfx('blip'); },
    del() { if (!this.name.length) { Audio.sfx('bump'); return; } this.name = this.name.slice(0, -1); if (!this.name.length) this.up = true; Audio.sfx('back'); },
    ok() { const n = this.name.trim(); if (!n) { Audio.sfx('bump'); return; } Audio.sfx('ok'); Input.textHook = null; closeUI(this, n); },
    act(r, c) {
      if (r < 4) { const ch = ROWS[r][c]; this.put(this.up ? ch : ch.toLowerCase()); return; }
      const k = SPECIAL.find(s => c >= s[1] && c < s[1] + s[2])[0];
      if (k === 'Aa') { this.up = !this.up; Audio.sfx('blip'); } else if (k === 'Borrar') this.del(); else this.ok();
    },
    upd(dt) {
      this.t += dt;
      if (Input.repeat('left')) { this.c = (this.c + 9) % 10; Audio.sfx('blip'); }
      if (Input.repeat('right')) { this.c = (this.c + 1) % 10; Audio.sfx('blip'); }
      if (Input.repeat('up')) { this.r = (this.r + 4) % 5; Audio.sfx('blip'); }
      if (Input.repeat('down')) { this.r = (this.r + 1) % 5; Audio.sfx('blip'); }
      if (Input.pressed('a')) this.act(this.r, this.c);
      else if (Input.pressed('b')) this.del();
      else if (Input.pressed('menu')) { this.r = 4; this.c = 7; Audio.sfx('blip'); }
    },
    drw(x) {
      bgScreen(x, title);
      panel(x, 200, 72, 400, 60, { bg: '#fff' });
      const shown = this.name + (this.name.length < max && (this.t % 1) < .55 ? '_' : '');
      txt(x, shown, 400, 114, { s: 32, a: 'center', c: '#1d3a6a' });
      txt(x, `${this.name.length}/${max}`, 588, 126, { s: 13, a: 'right', c: '#8a96aa', sh: false });
      const key = (X, Y, w, label, sel, fn) => {
        x.fillStyle = sel ? '#ffd23a' : '#fbfaf6'; x.strokeStyle = sel ? '#d4343f' : '#3a4a6a'; x.lineWidth = sel ? 4 : 2;
        x.beginPath(); x.roundRect(X, Y, w, KH, 10); x.fill(); x.stroke();
        txt(x, label, X + w / 2, Y + 34, { s: label.length > 2 ? 22 : 26, a: 'center', c: '#2a2f3a', sh: false });
        zone(X, Y, w, KH, fn);
      };
      for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) {
        let ch = ROWS[r][c]; ch = this.up ? ch : ch.toLowerCase();
        key(GX + c * 70, GY + r * 56, KW, ch === ' ' ? '␣' : ch, this.r === r && this.c === c, () => { this.r = r; this.c = c; this.act(r, c); });
      }
      for (const [lab, c0, w] of SPECIAL) {
        const sel = this.r === 4 && this.c >= c0 && this.c < c0 + w;
        key(GX + c0 * 70, GY + 4 * 56 + 8, w * 70 - 4, lab === 'Aa' ? (this.up ? 'ABC' : 'abc') : lab, sel, () => { this.r = 4; this.c = c0; this.act(4, c0); });
      }
      txt(x, 'A: escribir   B: borrar   START: ir a OK', 400, H - 12, { s: 14, a: 'center', c: '#3a4a6a', sh: false });
    } });
  Input.textHook = ch => { if (G.ui[G.ui.length - 1] !== sc) return; if (ch === '\b') sc.del(); else if (ch === '\n') sc.ok(); else sc.put(ch); };
  return pushUI(sc);
}
