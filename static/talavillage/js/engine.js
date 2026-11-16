'use strict';
/* =====================================================================
   TheTalaVillage · motor del mundo
   - Vista 2.5D: suelo en perspectiva (fila a fila) + objetos de pie (billboards)
   - Movimiento por casillas, puertas, NPCs, entrenadores, eventos (async)
   ===================================================================== */
const GR = { GRASS: 0, TALL: 1, ROAD: 2, WALK: 3, PLAZA: 4, DIRT: 5, WATER: 6, SHALLOW: 7, BRIDGE: 8, SOIL: 9, COURT: 10, ERA: 11, ROCKY: 12, WOOD: 13, TILE: 14, DARK: 15, SAND: 16, CARPET: 17, VOID: 18, ROADL: 19, PINE: 20, GREYF: 21, MAT: 22 };
const ENC_GROUND = new Set([GR.TALL, GR.SHALLOW, GR.DARK]);
const MAPS = {};
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

function newMap(id, w, h, o = {}) {
  const m = Object.assign({ id, w, h, g: new Uint8Array(w * h), blk: new Uint8Array(w * h), zone: new Uint8Array(w * h), zones: [''], objs: [], npcs: [], warps: {}, doors: {}, signs: {}, trig: {}, items: [], music: 'pueblo', name: id, interior: false, onEnter: null }, o);
  m.g.fill(o.fill !== undefined ? o.fill : GR.GRASS); MAPS[id] = m; return m;
}
const T = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h ? y * m.w + x : -1;
function setG(m, x, y, g) { const i = T(m, x, y); if (i >= 0) m.g[i] = g; }
function getG(m, x, y) { const i = T(m, x, y); return i < 0 ? GR.VOID : m.g[i]; }
function rectG(m, x, y, w, h, g, cond) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { if (cond && !cond(getG(m, i, j), i, j)) continue; setG(m, i, j, g); } }
function block(m, x, y, v = 1) { const i = T(m, x, y); if (i >= 0) m.blk[i] = v; }
function zoneRect(m, name, x, y, w, h) { let z = m.zones.indexOf(name); if (z < 0) { z = m.zones.length; m.zones.push(name); } for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const k = T(m, i, j); if (k >= 0) m.zone[k] = z; } }
function building(m, b) {
  b.x |= 0; b.y |= 0; m.objs.push(Object.assign({ t: 'b' }, b)); for (let j = b.y; j < b.y + b.d; j++) for (let i = b.x; i < b.x + b.w; i++) block(m, i, j, 1);
  if (b.door !== undefined) { const dx = b.x + b.door, dy = b.y + b.d - 1; m.doors[dx + ',' + dy] = { to: b.to || null, name: b.name || '', locked: b.locked || null }; }
  return b;
}
function prop(m, x, y, kind, o = {}) { const p = Object.assign({ t: 'p', x, y, kind, v: o.v || 0 }, o); m.objs.push(p); if (o.block !== false) { const bw = o.bw || 1, bh = o.bh || 1; for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) block(m, x + i, y - j, 1); } return p; }
function warp(m, x, y, to, tx, ty, dir = 'down') { m.warps[x + ',' + y] = { to, tx, ty, dir }; }
function sign(m, x, y, text) { m.signs[x + ',' + y] = text; }
function trig(m, x, y, fn) { m.trig[x + ',' + y] = fn; }
function npc(m, o) { const n = Object.assign({ dir: 'down', look: {}, wander: 0, home: null }, o); n.home = n.home || [n.x, n.y]; m.npcs.push(n); return n; }
function hiddenItem(m, x, y, item, n = 1, id) { m.items.push({ x, y, item, n, id: id || (m.id + ':' + x + ',' + y), hidden: false }); }

/* ---------------- Estado global ---------------- */
const G = TV.G = {
  map: null, mode: 'title', lock: 0, ui: [], t: 0, frame: 0,
  p: { x: 0, y: 0, dir: 'down', mv: null, px: 0, py: 0, bike: false, look: 'chico' },
  cam: { x: 0, y: 0 }, fade: 0, fadeTo: 0, flash: 0, shake: 0, npcs: [], bubbles: [], toast: null,
  S: null, // partida
};
function newSave(name, look) {
  return { v: 1, name: name || 'Talayuelano', look: look || 'chico', map: 'pueblo', x: 48, y: 42, dir: 'up', party: [], box: [], bag: { locion: 2 }, money: 1500, flags: {}, seen: {}, caught: {}, time: 0, repel: 0, tr: {}, got: {}, medals: [], opts: { fast: true, sound: true }, created: Date.now() };
}
const flag = k => !!(G.S && G.S.flags[k]);
const setFlag = (k, v = true) => { G.S.flags[k] = v; };

/* ---------------- Proyección 2.5D ---------------- */
const CAM = { th: 54 * Math.PI / 180, h: 330, yc: 0.55 * H };
CAM.cos = Math.cos(CAM.th); CAM.sin = Math.sin(CAM.th); CAM.D0 = CAM.h / Math.tan(CAM.th); CAM.f = PX * CAM.h / CAM.sin;
const ROWS = [];
(function () {
  const rowAt = sy => { const s = (sy - CAM.yc) / CAM.f, d = CAM.h * (CAM.cos - s * CAM.sin) / (s * CAM.cos + CAM.sin), zc = d * CAM.cos + CAM.h * CAM.sin; return { dy: CAM.D0 - d, k: CAM.f / zc }; };
  for (let sy = 0; sy <= H; sy++) ROWS.push(rowAt(sy + .5));
  for (let sy = 0; sy < H; sy++) ROWS[sy].dh = Math.max(.05, ROWS[sy + 1].dy - ROWS[sy].dy);
})();
function proj(wx, wy) { const dyw = wy - G.cam.y, d = CAM.D0 - dyw, zc = d * CAM.cos + CAM.h * CAM.sin; if (zc < 20) return null; const k = CAM.f / zc; return { x: W / 2 + (wx - G.cam.x) * k, y: CAM.yc + CAM.f * (CAM.h * CAM.cos - d * CAM.sin) / zc, k }; }

/* ---------------- Textura del suelo ---------------- */
const M_OUT = 16, M_IN = 10;
function groundTile(x, g, tx, ty, m) {
  const P = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); }, hh = (k) => hash2(tx, ty, k);
  const nb = (dx, dy) => getG(m, tx + dx, ty + dy);
  switch (g) {
    case GR.GRASS: case GR.TALL: case GR.PINE: {
      const base = g === GR.TALL ? '#4f9a44' : g === GR.PINE ? '#58854a' : '#6cb455'; P(0, 0, 16, 16, base);
      for (let i = 0; i < 5; i++) P(hh(i) * 15 | 0, hh(i + 9) * 15 | 0, 1, 2, shade(base, hh(i + 3) > .5 ? .15 : -.15));
      if (g === GR.GRASS && hh(30) > .93) { P(hh(31) * 12 + 2 | 0, hh(32) * 12 + 2 | 0, 2, 2, pick(['#fff', '#ffe14a', '#ff8aa8'])); }
      if (g === GR.PINE) { for (let i = 0; i < 3; i++) P(hh(i + 40) * 14 | 0, hh(i + 50) * 14 | 0, 2, 1, '#8a6a42'); }
      break; }
    case GR.ROAD: case GR.ROADL: { P(0, 0, 16, 16, '#5e5f66'); for (let i = 0; i < 6; i++) P(hh(i) * 15 | 0, hh(i + 7) * 15 | 0, 1, 1, hh(i + 2) > .5 ? '#6c6d75' : '#53545a');
      if (g === GR.ROADL && tx % 3 !== 0) P(0, 15, 16, 2, '#f2f0e6'); break; }
    case GR.WALK: { P(0, 0, 16, 16, '#c9c4ba'); P(0, 7, 16, 1, '#b3aea4'); P(0, 15, 16, 1, '#b3aea4'); P(7 + ((ty & 1) * 4), 0, 1, 7, '#b3aea4'); P(3 + ((ty & 1) * 4), 8, 1, 7, '#b3aea4');
      if (nb(0, -1) === GR.ROAD || nb(0, -1) === GR.ROADL) P(0, 0, 16, 2, '#8e8a82'); if (nb(0, 1) === GR.ROAD || nb(0, 1) === GR.ROADL) P(0, 14, 16, 2, '#8e8a82');
      if (nb(-1, 0) === GR.ROAD) P(0, 0, 2, 16, '#8e8a82'); if (nb(1, 0) === GR.ROAD) P(14, 0, 2, 16, '#8e8a82'); break; }
    case GR.PLAZA: { P(0, 0, 16, 16, '#d8c3a0'); const c = '#c4ad88'; P(0, 0, 16, 1, c); P(0, 8, 16, 1, c); P(0, 0, 1, 8, c); P(8, 8, 1, 8, c); if (hh(1) > .7) P(2, 3, 3, 2, '#e4d2b4'); break; }
    case GR.DIRT: case GR.ERA: { const base = g === GR.ERA ? '#d9bf86' : '#b98d5a'; P(0, 0, 16, 16, base); for (let i = 0; i < 6; i++) P(hh(i) * 15 | 0, hh(i + 5) * 15 | 0, 2, 1, shade(base, hh(i + 1) > .5 ? .12 : -.14)); break; }
    case GR.WATER: { P(0, 0, 16, 16, '#3f7fc4'); for (let i = 0; i < 3; i++) P(hh(i) * 12 | 0, hh(i + 4) * 15 | 0, 4, 1, '#6aa6e6'); break; }
    case GR.SHALLOW: { P(0, 0, 16, 16, '#6aaee0'); for (let i = 0; i < 3; i++) P(hh(i) * 12 | 0, hh(i + 4) * 15 | 0, 3, 1, '#a8d8f6'); P(hh(8) * 12 | 0, hh(9) * 12 | 0, 2, 2, '#8a8a7a'); break; }
    case GR.BRIDGE: { P(0, 0, 16, 16, '#9a6a3a'); for (let i = 0; i < 16; i += 4) P(i, 0, 1, 16, '#6a4422'); P(0, 0, 16, 2, '#5a3a1a'); P(0, 14, 16, 2, '#5a3a1a'); break; }
    case GR.SOIL: { P(0, 0, 16, 16, '#7a5232'); for (let j = 1; j < 16; j += 4) P(0, j, 16, 2, '#6a4428'); break; }
    case GR.COURT: { P(0, 0, 16, 16, '#3f8ac4'); if (tx === m.courtX0 || tx === m.courtX1) P(tx === m.courtX0 ? 0 : 14, 0, 2, 16, '#f4f4f4'); if (ty === m.courtY0 || ty === m.courtY1) P(0, ty === m.courtY0 ? 0 : 14, 16, 2, '#f4f4f4'); if (tx === m.courtMid) P(15, 0, 2, 16, '#f4f4f4'); break; }
    case GR.ROCKY: { P(0, 0, 16, 16, '#9a8a78'); for (let i = 0; i < 4; i++) P(hh(i) * 13 | 0, hh(i + 4) * 13 | 0, 3, 2, hh(i + 8) > .5 ? '#b0a090' : '#7a6a5a'); break; }
    case GR.WOOD: { P(0, 0, 16, 16, '#b07a4a'); for (let j = 0; j < 16; j += 4) { P(0, j, 16, 1, '#8a5a32'); P(((ty * 7 + j) % 16), j, 1, 4, '#8a5a32'); } break; }
    case GR.TILE: { P(0, 0, 16, 16, '#e6e2da'); P(0, 0, 16, 1, '#c8c4bc'); P(0, 0, 1, 16, '#c8c4bc'); if ((tx + ty) % 2) P(1, 1, 15, 15, '#dcd8d0'); break; }
    case GR.GREYF: { P(0, 0, 16, 16, '#9c9ea4'); P(0, 0, 16, 1, '#8a8c92'); P(0, 0, 1, 16, '#8a8c92'); if ((tx + ty) % 2) P(1, 1, 15, 15, '#a4a6ac'); break; }
    case GR.DARK: { P(0, 0, 16, 16, '#4a4250'); for (let i = 0; i < 4; i++) P(hh(i) * 14 | 0, hh(i + 4) * 14 | 0, 2, 2, '#3a3440'); break; }
    case GR.SAND: { P(0, 0, 16, 16, '#e0c088'); for (let i = 0; i < 5; i++) P(hh(i) * 15 | 0, hh(i + 4) * 15 | 0, 1, 1, '#c8a46a'); break; }
    case GR.CARPET: { P(0, 0, 16, 16, '#a83a3a'); P(0, 0, 16, 1, '#c85a5a'); break; }
    case GR.MAT: { P(0, 0, 16, 16, '#b07a4a'); P(2, 4, 12, 10, '#7a2a2a'); P(3, 5, 10, 8, '#9a3a3a'); break; }
    case GR.VOID: P(0, 0, 16, 16, m.interior ? '#000' : '#5a8a46'); break;
  }
}
function buildGround(m) {
  const M = m.interior ? M_IN : M_OUT, [c, x] = mkCanvas((m.w + M * 2) * 16, (m.h + M * 2) * 16);
  x.fillStyle = m.interior ? '#000' : '#5f9e4c'; x.fillRect(0, 0, c.width, c.height);
  if (!m.interior) { for (let ty = -M; ty < m.h + M; ty++) for (let tx = -M; tx < m.w + M; tx++) if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) { x.save(); x.translate((tx + M) * 16, (ty + M) * 16); groundTile(x, GR.PINE, tx, ty, m); x.restore(); } }
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) { x.save(); x.translate((tx + M) * 16, (ty + M) * 16); groundTile(x, m.g[ty * m.w + tx], tx, ty, m); x.restore(); }
  // orillas suaves del agua
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) { const g = m.g[ty * m.w + tx]; if (g !== GR.WATER && g !== GR.SHALLOW) continue; for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { const n = getG(m, tx + dx, ty + dy); if (n === GR.GRASS || n === GR.TALL || n === GR.SOIL || n === GR.DIRT) { x.fillStyle = 'rgba(214,196,150,.9)'; const X = (tx + M) * 16, Y = (ty + M) * 16; if (dy === -1) x.fillRect(X, Y, 16, 2); if (dy === 1) x.fillRect(X, Y + 14, 16, 2); if (dx === -1) x.fillRect(X, Y, 2, 16); if (dx === 1) x.fillRect(X + 14, Y, 2, 16); } } }
  m._ground = c; m._M = M; return c;
}

/* ---------------- Mapa activo ---------------- */
function enterMap(id, tx, ty, dir) {
  const m = MAPS[id]; if (!m) { console.error('mapa', id); return; }
  if (m.build && !m._built) { m.build(m); m._built = true; }
  G.map = m; if (!m._ground) buildGround(m);
  G.p.x = tx; G.p.y = ty; G.p.dir = dir || G.p.dir; G.p.mv = null; G.p.px = tx * 16 + 8; G.p.py = ty * 16 + 14;
  G.cam.x = G.p.px; G.cam.y = G.p.py;
  G.npcs = m.npcs.filter(n => !n.when || n.when()).map(n => Object.assign(Object.create(null), n, { x: n.home[0], y: n.home[1], px: n.home[0] * 16 + 8, py: n.home[1] * 16 + 14, mv: null, dir: n.dir, next: G.t + 1 + Math.random() * 3, src: n }));
  if (m.extraNpcs) G.npcs.push(...m.extraNpcs(m).map(n => Object.assign(n, { px: n.x * 16 + 8, py: n.y * 16 + 14, mv: null, next: G.t + Math.random() * 3, home: [n.x, n.y], src: n })));
  G.S.map = id; G.S.x = tx; G.S.y = ty;
  Audio.play(m.music || 'pueblo');
  if (m.onEnter) runScript(() => m.onEnter(m));
}
function isBlocked(x, y, who) {
  const m = G.map; if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
  const i = y * m.w + x; if (m.blk[i]) return true; const g = m.g[i]; if (g === GR.WATER || g === GR.VOID) return true;
  if (who !== 'p' && G.p.x === x && G.p.y === y) return true; if (who !== 'p' && G.p.mv && G.p.mv.tx === x && G.p.mv.ty === y) return true;
  for (const n of G.npcs) { if (n === who || n.hidden) continue; if ((n.x === x && n.y === y) || (n.mv && n.mv.tx === x && n.mv.ty === y)) return n; }
  return false;
}

/* ---------------- Movimiento ---------------- */
function startMove(e, dir, dur) {
  const [dx, dy] = DIRS[dir]; e.dir = dir; e.mv = { fx: e.x, fy: e.y, tx: e.x + dx, ty: e.y + dy, t: 0, dur };
}
function stepEnt(e, dt) {
  if (!e.mv) return false; e.mv.t += dt; const k = Math.min(1, e.mv.t / e.mv.dur);
  e.px = lerp(e.mv.fx, e.mv.tx, k) * 16 + 8; e.py = lerp(e.mv.fy, e.mv.ty, k) * 16 + 14;
  if (k >= 1) { e.x = e.mv.tx; e.y = e.mv.ty; e.mv = null; return true; } return false;
}
let bumpT = 0, turnT = 0, lastDir = null;
function playerInput(dt) {
  const p = G.p; if (p.mv) return;
  const d = Input.dir();
  if (!d) { lastDir = null; return; }
  if (d !== p.dir) { p.dir = d; lastDir = d; turnT = G.t; return; } // un toque corto solo gira; si mantienes, anda
  if (G.t - turnT < .1) return;
  lastDir = d; const [dx, dy] = DIRS[d], nx = p.x + dx, ny = p.y + dy;
  const b = isBlocked(nx, ny, 'p');
  if (b) {
    const door = G.map.doors[nx + ',' + ny];
    if (door && d === 'up') { runScript(() => useDoor(door, nx, ny)); return; }
    if (G.t - bumpT > .35) { Audio.sfx('bump'); bumpT = G.t; } return;
  }
  // bloqueos de historia (puntos que no se pueden cruzar todavía)
  const gate = G.map.gates && G.map.gates.find(q => q.x === nx && q.y === ny && q.cond());
  if (gate) { runScript(gate.fn); return; }
  if (G.map.enterCheck) { const f = G.map.enterCheck(nx, ny); if (f) { runScript(f); return; } }
  const dur = p.bike ? .1 : (Input.down.run || Input.down.b) ? .13 : .21;
  startMove(p, d, dur);
}
async function useDoor(door, x, y) {
  if (door.locked && door.locked()) { const msg = typeof door.lockMsg === 'string' ? door.lockMsg : 'Está cerrado.'; await say(door.name ? `${door.name}\n${msg}` : msg); return; }
  if (!door.to) { await say(door.name ? `${door.name}.\nLa puerta está cerrada.` : 'La puerta está cerrada.'); return; }
  Audio.sfx('door'); await fadeOut(); const [mid, tx, ty] = door.to; enterMap(mid, tx, ty, 'up'); G.p.bike = false; await fadeIn();
}
async function onStep() {
  const p = G.p, m = G.map, k = p.x + ',' + p.y;
  if (G.S.repel > 0) { G.S.repel--; if (!G.S.repel) await say('Se acabó el efecto de la Colonia Fuerte.'); }
  const w = m.warps[k]; if (w) { Audio.sfx('door'); await fadeOut(); enterMap(w.to, w.tx, w.ty, w.dir); await fadeIn(); return; }
  const tr = m.trig[k]; if (tr) { await tr(); if (G.mode !== 'world') return; }
  if (await trainerSight()) return;
  // encuentros
  const g = m.g[p.y * m.w + p.x];
  if (ENC_GROUND.has(g) && !G.S.repel) {
    const zn = g === GR.SHALLOW ? 'arroyo' : m.zones[m.zone[p.y * m.w + p.x]]; const tab = ENCOUNTERS[zn];
    if (tab && G.S.party.length && chance(g === GR.DARK ? .09 : .1)) { const e = rollEncounter(tab); await wildBattle(e[0], e[1]); }
  }
}
function rollEncounter(tab) { let s = 0; for (const e of tab) s += e[3]; let r = Math.random() * s; for (const e of tab) { r -= e[3]; if (r <= 0) return [e[0], irnd(e[1], e[2])]; } const e = tab[0]; return [e[0], irnd(e[1], e[2])]; }

/* ---------------- NPCs ---------------- */
function npcUpdate(dt) {
  for (const n of G.npcs) {
    if (n.mv) { stepEnt(n, dt); continue; }
    if (G.lock || n.busy || !n.wander || G.mode !== 'world') continue;
    if (G.t > n.next) {
      n.next = G.t + 1.2 + Math.random() * 3;
      const d = pick(['up', 'down', 'left', 'right']), [dx, dy] = DIRS[d], nx = n.x + dx, ny = n.y + dy;
      if (Math.abs(nx - n.home[0]) > n.wander || Math.abs(ny - n.home[1]) > n.wander) { n.dir = d; continue; }
      if (isBlocked(nx, ny, n) || (G.map.g[ny * G.map.w + nx] === GR.TALL && !n.grass)) { n.dir = d; continue; }
      startMove(n, d, .3);
    }
  }
}
async function npcWalk(n, dir, steps = 1, dur = .22) { for (let i = 0; i < steps; i++) { const [dx, dy] = DIRS[dir]; if (isBlocked(n.x + dx, n.y + dy, n) === true) break; startMove(n, dir, dur); while (n.mv) await nextFrame(); } }
async function npcWalkTo(n, tx, ty, dur = .2) { let guard = 60; while ((n.x !== tx || n.y !== ty) && guard--) { const dir = n.x !== tx ? (tx > n.x ? 'right' : 'left') : (ty > n.y ? 'down' : 'up'); const [dx, dy] = DIRS[dir]; if (isBlocked(n.x + dx, n.y + dy, n)) { const alt = n.y !== ty ? (ty > n.y ? 'down' : 'up') : (tx > n.x ? 'right' : 'left'); const [ax, ay] = DIRS[alt]; if (isBlocked(n.x + ax, n.y + ay, n)) break; startMove(n, alt, dur); } else startMove(n, dir, dur); while (n.mv) await nextFrame(); } }
async function playerWalk(dir, steps = 1, dur = .2) { for (let i = 0; i < steps; i++) { const [dx, dy] = DIRS[dir]; if (isBlocked(G.p.x + dx, G.p.y + dy, 'p')) { G.p.dir = dir; break; } startMove(G.p, dir, dur); while (G.p.mv) await nextFrame(); } }
function findNpc(id) { return G.npcs.find(n => n.id === id); }
function facePlayer(n) { const dx = G.p.x - n.x, dy = G.p.y - n.y; n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
function bubble(e, txt = '!', dur = .8) { G.bubbles.push({ e, txt, t: G.t + dur }); }
async function trainerSight() {
  for (const n of G.npcs) {
    if (!n.trainer || G.S.tr[n.trainer.id] || n.hidden) continue; const [dx, dy] = DIRS[n.dir]; const r = n.sight || 4; let seen = false;
    for (let i = 1; i <= r; i++) { const x = n.x + dx * i, y = n.y + dy * i; if (x === G.p.x && y === G.p.y) { seen = true; break; } if (isBlocked(x, y, n)) break; }
    if (seen) {
      await runScriptNow(async () => {
        Audio.sfx('surprise'); bubble(n, '!', .9); await sleep(800); while (Math.abs(n.x - G.p.x) + Math.abs(n.y - G.p.y) > 1) { startMove(n, n.dir, .2); while (n.mv) await nextFrame(); }
        G.p.dir = OPP[n.dir]; await trainerBattle(n);
      }); return true;
    }
  }
  return false;
}
async function trainerBattle(n) {
  const T = n.trainer; facePlayer(n);
  if (T.pre) await say(T.pre, { name: T.name }); else if (n.say) await say(n.say, { name: T.name });
  const res = await battle({ trainer: T, npc: n });
  if (res === 'win') { G.S.tr[T.id] = true; if (T.after) await T.after(); }
  return res;
}

/* ---------------- Interacción (botón A) ---------------- */
async function interact() {
  const p = G.p, [dx, dy] = DIRS[p.dir], x = p.x + dx, y = p.y + dy, m = G.map, k = x + ',' + y;
  const n = G.npcs.find(q => q.x === x && q.y === y && !q.hidden) || G.npcs.find(q => q.mv && q.mv.tx === x && q.mv.ty === y);
  if (n) { if (n.mv) return; facePlayer(n); n.busy = true; try {
      if (n.trainer && !G.S.tr[n.trainer.id]) await trainerBattle(n);
      else if (n.talk) await n.talk(n); else if (n.trainer && n.trainer.done) await say(n.trainer.done, { name: n.trainer.name }); else if (n.say) { const t = typeof n.say === 'function' ? n.say() : n.say; await say(t, n.name && t.startsWith(n.name + ':') ? {} : { name: n.name }); }
    } finally { n.busy = false; } return; }
  // mostrador: hablar por encima
  if (m.counters && m.counters[k]) { const c = m.counters[k]; const n2 = G.npcs.find(q => q.x === c[0] && q.y === c[1]); if (n2) { facePlayer(n2); n2.busy = true; try { if (n2.talk) await n2.talk(n2); else { const t = typeof n2.say === 'function' ? n2.say() : n2.say; await say(t, n2.name && t.startsWith(n2.name + ':') ? {} : { name: n2.name }); } } finally { n2.busy = false; } return; } }
  const it = m.items.find(q => q.x === x && q.y === y && !G.S.got[q.id]); if (it) { await pickItem(it); return; }
  const it2 = m.items.find(q => q.x === p.x && q.y === p.y && !G.S.got[q.id] && q.hidden); if (it2) { await pickItem(it2); return; }
  if (m.signs[k]) { const s = m.signs[k]; const t = typeof s === 'function' ? await s() : s; if (t) await say(t); return; }
  const door = m.doors[k]; if (door && p.dir === 'up') { await useDoor(door, x, y); return; }
  const g = getG(m, x, y); if (g === GR.WATER) await say('El agua del arroyo está helada. Mejor no meterse.');
}
async function pickItem(it) { G.S.got[it.id] = true; addItem(it.item, it.n); Audio.sfx('item'); await say(`¡Has encontrado ${it.n > 1 ? it.n + ' × ' : ''}${ITEMS[it.item].n}!`); }
function addItem(id, n = 1) { G.S.bag[id] = (G.S.bag[id] || 0) + n; }

/* ---------------- Scripts (eventos asíncronos) ---------------- */
const frameWaiters = [];
const nextFrame = () => new Promise(r => frameWaiters.push(r));
async function runScript(fn) { G.lock++; try { await fn(); } catch (e) { console.error(e); } finally { G.lock = Math.max(0, G.lock - 1); Input.clear(); } }
const runScriptNow = runScript;
async function fadeOut(ms = 260) { G.fadeTo = 1; while (G.fade < .99) await nextFrame(); }
async function fadeIn(ms = 260) { G.fadeTo = 0; while (G.fade > .01) await nextFrame(); }
async function healParty() { for (const m of G.S.party) { m.hp = m.mhp; m.st = null; for (const mv of m.moves) mv.pp = MOVES[mv.k].pp; } }
async function giveItem(id, n = 1, who) { addItem(id, n); Audio.sfx('item'); await say(`${who ? who + ' te da' : 'Recibes'} ${n > 1 ? n + ' × ' : ''}${ITEMS[id].n}.`); }
async function giveMon(id, lvl, opt = {}) {
  const m = makeMon(id, lvl, Object.assign({ ot: G.S.name }, opt)); G.S.seen[id] = 1; G.S.caught[id] = 1;
  if (G.S.party.length < 6) G.S.party.push(m); else { G.S.box.push(m); await say(`Tu equipo está lleno. ${monName(m)} se ha enviado a la Caja Rural.`); }
  return m;
}
function medals() { return G.S.medals.length; }

/* ---------------- Dibujo del mundo ---------------- */
function drawWorld(x) {
  const m = G.map, gc = m._ground, M = m._M * 16;
  x.fillStyle = m.interior ? '#000' : '#4f8a40'; x.fillRect(0, 0, W, H);
  x.imageSmoothingEnabled = false;
  for (let sy = 0; sy < H; sy++) { const r = ROWS[sy], wy = G.cam.y + r.dy, sw = W / r.k, sx = G.cam.x - sw / 2; x.drawImage(gc, sx + M, wy + M, sw, r.dh, 0, sy, W, 1); }
  // objetos visibles
  const L = []; const cx = G.cam.x, cy = G.cam.y, vx0 = cx - 380, vx1 = cx + 380, vy0 = cy - 290, vy1 = cy + 160;
  for (const o of m.objs) {
    if (o.t === 'b' || o.t === 'w') { const bx0 = o.x * 16, bx1 = (o.x + o.w) * 16, by = (o.y + o.d) * 16; if (bx1 < vx0 - 100 || bx0 > vx1 + 100 || by < vy0 - 40 || by - 400 > vy1) continue; L.push({ y: by - .5, o }); }
    else { const px = o.x * 16 + 8, py = o.y * 16 + 16 + (o.dy || 0); if (px < vx0 || px > vx1 || py < vy0 || py > vy1 + 60) continue; L.push({ y: py - (o.flatSort ? 16 : 0), o }); }
  }
  // hierba alta (penachos) y brillos del agua
  const tx0 = Math.max(0, (vx0 / 16 | 0) - 1), tx1 = Math.min(m.w - 1, (vx1 / 16 | 0) + 1), ty0 = Math.max(0, (vy0 / 16 | 0) - 1), ty1 = Math.min(m.h - 1, (vy1 / 16 | 0) + 3);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { const g = m.g[ty * m.w + tx]; if (g === GR.TALL) L.push({ y: ty * 16 + 15.9, grass: [tx, ty] }); }
  for (const it of m.items) if (!G.S.got[it.id] && !it.hidden) L.push({ y: it.y * 16 + 16, item: it });
  for (const n of G.npcs) if (!n.hidden) L.push({ y: n.py, ent: n });
  L.push({ y: G.p.py, ent: G.p, player: true });
  L.sort((a, b) => a.y - b.y);
  for (const e of L) {
    if (e.o) drawObj(x, e.o);
    else if (e.grass) { const [tx, ty] = e.grass, im = propImg('hierba', (tx * 7 + ty * 3) % 4), pp = proj(tx * 16 + 8, ty * 16 + 16); if (pp) { const sway = Math.sin(G.t * 2 + tx) * .4; x.drawImage(im, pp.x - 8 * pp.k + sway, pp.y - 12 * pp.k, 16 * pp.k, 12 * pp.k); } }
    else if (e.item) { const im = propImg('objeto'), pp = proj(e.item.x * 16 + 8, e.item.y * 16 + 15); if (pp) { const bob = Math.sin(G.t * 3) * 1.5; x.drawImage(im, pp.x - 6 * pp.k, pp.y - 12 * pp.k + bob, 12 * pp.k, 12 * pp.k); } }
    else if (e.ent) drawEnt(x, e.ent, e.player);
  }
  // burbujas (!)
  G.bubbles = G.bubbles.filter(b => b.t > G.t);
  for (const b of G.bubbles) { const pp = proj(b.e.px, b.e.py); if (!pp) continue; const yy = pp.y - 30 * pp.k; x.fillStyle = '#fff'; x.strokeStyle = '#222'; x.lineWidth = 2; x.beginPath(); x.roundRect(pp.x - 14, yy - 30, 28, 28, 6); x.fill(); x.stroke(); x.fillStyle = b.txt === '!' ? '#d4343f' : '#222'; x.font = 'bold 22px Trebuchet MS, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(b.txt, pp.x, yy - 15); }
  // ambiente: neblina lejana + hora del día
  if (!m.interior) { const gr = x.createLinearGradient(0, 0, 0, H * .45); gr.addColorStop(0, 'rgba(210,228,255,.32)'); gr.addColorStop(1, 'rgba(210,228,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, H * .45); }
  const tint = timeTint(); if (tint && !m.interior) { x.fillStyle = tint; x.fillRect(0, 0, W, H); }
  if (m.dark) { x.fillStyle = 'rgba(10,6,30,.35)'; x.fillRect(0, 0, W, H); }
}
function timeTint() { const h = new Date().getHours() + new Date().getMinutes() / 60; if (h >= 21 || h < 6) return 'rgba(20,30,90,.32)'; if (h >= 19.5) return 'rgba(255,120,60,.14)'; if (h < 7.5) return 'rgba(255,170,120,.12)'; return null; }
function drawObj(x, o) {
  if (o.t === 'b' || o.t === 'w') {
    const img = o.t === 'w' ? o.img : buildingImg(o), a = proj(o.x * 16, (o.y + o.d) * 16), b = proj((o.x + o.w) * 16, (o.y + o.d) * 16); if (!a || !b) return;
    const w = b.x - a.x, k = a.k; x.drawImage(img, a.x, a.y - img.height * k, w, img.height * k); return;
  }
  const img = propImg(o.kind, o.v), pp = proj(o.x * 16 + 8 + (o.ox || 0), o.y * 16 + 16 + (o.dy || 0)); if (!pp) return;
  const sc = o.sc || 1; x.drawImage(img, pp.x - img.width / 2 * pp.k * sc, pp.y - (img.height + (o.lift || 0)) * pp.k * sc, img.width * pp.k * sc, img.height * pp.k * sc);
}
function drawEnt(x, e, isP) {
  const pp = proj(e.px, e.py + 2); if (!pp) return;
  const look = isP ? playerLook() : e.look, sheet = personSheet(look), di = { down: 0, up: 1, left: 2, right: 3 }[e.dir];
  let f = 0; if (e.mv) { const ph = (e.mv.t / e.mv.dur); f = ((e.x + e.y) % 2 === 0) ? (ph < .5 ? 1 : 0) : (ph < .5 ? 2 : 0); }
  const k = pp.k, inTall = G.map.g[(e.y) * G.map.w + e.x] === GR.TALL && !e.mv;
  if (isP && G.p.bike) { x.fillStyle = '#2a2a2a'; x.fillRect(pp.x - 9 * k, pp.y - 6 * k, 18 * k, 3 * k); x.strokeStyle = '#222'; x.lineWidth = k; x.beginPath(); x.arc(pp.x - 7 * k, pp.y - 3 * k, 3 * k, 0, 7); x.arc(pp.x + 7 * k, pp.y - 3 * k, 3 * k, 0, 7); x.stroke(); }
  x.drawImage(sheet, f * 16, di * 24, 16, 24, pp.x - 8 * k, pp.y - 24 * k - (isP && G.p.bike ? 3 * k : 0), 16 * k, 24 * k);
  if (e.label && !isP) { }
  void inTall;
}
function playerLook() { return G.S.look === 'chica' ? { hs: 'pony', hair: '#5a3020', shirt: '#e8564a', pants: '#3a4a7a', hat: 'cap', hatc: '#2f6ac8', skin: '#f1c7a0' } : { hs: 'short', hair: '#3a2416', shirt: '#2f6ac8', pants: '#3a3a4a', hat: 'cap', hatc: '#d4343f', skin: '#efc39a' }; }

/* ---------------- Bucle del mundo ---------------- */
function worldUpdate(dt) {
  const p = G.p;
  if (p.mv) { if (stepEnt(p, dt)) { if (!G.lock) runScript(onStep); } }
  if (!G.lock && !G.ui.length && G.mode === 'world') {
    playerInput(dt);
    if (Input.pressed('a') && !p.mv) runScript(interact);
    else if (Input.pressed('menu') && !p.mv) { Audio.sfx('blip'); runScript(openStartMenu); }
  }
  npcUpdate(dt);
  G.cam.x = lerp(G.cam.x, p.px, Math.min(1, dt * 12)); G.cam.y = lerp(G.cam.y, p.py, Math.min(1, dt * 12));
  if (Math.abs(G.cam.x - p.px) < .05) G.cam.x = p.px; if (Math.abs(G.cam.y - p.py) < .05) G.cam.y = p.py;
}

Object.assign(window, { GR, MAPS, newMap, setG, getG, rectG, block, zoneRect, building, prop, warp, sign, trig, npc, hiddenItem, G, newSave, flag, setFlag, proj, enterMap, isBlocked, startMove, stepEnt, worldUpdate, drawWorld, runScript, nextFrame, frameWaiters, fadeOut, fadeIn, healParty, giveItem, giveMon, addItem, medals, npcWalk, npcWalkTo, playerWalk, findNpc, facePlayer, bubble, trainerBattle, useDoor, playerLook, DIRS, OPP });
