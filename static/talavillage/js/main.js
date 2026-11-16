'use strict';
/* =====================================================================
   TheTalaVillage · arranque, título, guardado y bucle principal
   ===================================================================== */
const cv = document.getElementById('scr'), ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
const EMBED = window.parent !== window;
let APODO = new URLSearchParams(location.search).get('apodo') || '', SAVE_TXT = null, saveAck = null;
const GBMODE = new URLSearchParams(location.search).get('gb') === '1'; if (GBMODE) document.body.classList.add('extctl');

/* ---------- comunicación con Secret Games (página padre) ---------- */
function post(m) { try { window.parent.postMessage(Object.assign({ tv: 1 }, m), location.origin); } catch (e) { } }
addEventListener('message', e => {
  if (e.origin !== location.origin || !e.data || !e.data.tv) return; const d = e.data;
  if (d.type === 'init') { APODO = d.apodo || APODO; SAVE_TXT = d.data || null; initDone(); }
  if (d.type === 'saved' && saveAck) { saveAck(d.ok); saveAck = null; }
  // modo consola (mandos de la Game Boy de la web) o pantalla completa con botones táctiles propios
  if (d.type === 'mode') layout();
  if (d.type === 'key' && d.k) { if (d.down) Input.press(d.k); else Input.release(d.k); }
  if (d.type === 'cmd' && d.cmd === 'save') { if (!G.S || G.mode === 'title') post({ type: 'nosave' }); else { const txt = JSON.stringify(G.S); try { localStorage.setItem('talavillage:' + (APODO || 'local'), txt); } catch (err) { } SAVE_TXT = txt; Audio.sfx('save'); post({ type: 'save', data: txt }); } }
});
let inited = false; function initDone() { if (inited) return; inited = true; if (!SAVE_TXT) { try { SAVE_TXT = localStorage.getItem('talavillage:' + (APODO || 'local')); } catch (e) { } } Title.ready = true; }
if (EMBED) { post({ type: 'hello' }); setTimeout(initDone, 2500); } else setTimeout(initDone, 50);

async function saveGame(silent) {
  const txt = JSON.stringify(G.S); try { localStorage.setItem('talavillage:' + (APODO || 'local'), txt); } catch (e) { }
  SAVE_TXT = txt; let ok = true;
  if (EMBED) { ok = await new Promise(res => { saveAck = res; post({ type: 'save', data: txt }); setTimeout(() => { if (saveAck) { saveAck = null; res(false); } }, 6000); }); }
  Audio.sfx('save'); if (!silent) await say(ok ? `Partida guardada para «${APODO || G.S.name}».` : 'Partida guardada en este dispositivo (sin conexión con el servidor).');
  return ok;
}
function exitGame() { Audio.stop(); if (EMBED) post({ type: 'exit' }); else location.href = '/'; }
function loadSave(txt) {
  const S = JSON.parse(txt); G.S = Object.assign(newSave('Edgar', 'chico'), S, { name: 'Edgar', look: 'chico' }); let mx = 0;
  for (const m of [...G.S.party, ...G.S.box]) { mx = Math.max(mx, m.uid || 0); m.moves = m.moves.filter(mv => MOVES[mv.k]); calcStats(m); m.hp = Math.min(m.hp, m.mhp); }
  setMonUID(mx + 1); Audio.setOn(G.S.opts.sound !== false);
}

/* ---------- título ---------- */
const Title = { ready: false, t0: 0, menu: null, art: null };
function drawTitle(x) {
  const t = G.t; const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#5ab0e8'); g.addColorStop(.55, '#cfeaf8'); g.addColorStop(.56, '#8ac868'); g.addColorStop(1, '#4a8a3a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  // nubes y cierzo
  x.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 6; i++) { const cx = ((i * 170 + t * 25) % (W + 200)) - 100, cy = 40 + (i * 37) % 90; x.beginPath(); x.arc(cx, cy, 26, 0, 7); x.arc(cx + 30, cy - 10, 32, 0, 7); x.arc(cx + 62, cy, 24, 0, 7); x.fill(); }
  x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 3; for (let i = 0; i < 5; i++) { const yy = 120 + i * 30, xx = ((t * 160 + i * 230) % (W + 300)) - 150; x.beginPath(); x.moveTo(xx, yy); x.bezierCurveTo(xx + 40, yy - 12, xx + 80, yy + 12, xx + 120, yy); x.stroke(); }
  // peñas y pinos (como el escudo)
  for (const [px, s] of [[90, 1], [710, 1.1]]) { x.fillStyle = '#a08878'; x.beginPath(); x.moveTo(px - 70 * s, 300); x.lineTo(px - 50 * s, 180); x.lineTo(px, 150); x.lineTo(px + 50 * s, 190); x.lineTo(px + 70 * s, 300); x.fill(); x.fillStyle = '#4a7a5e'; x.beginPath(); x.arc(px - 14, 132, 26 * s, 0, 7); x.arc(px + 16, 130, 28 * s, 0, 7); x.arc(px, 110, 30 * s, 0, 7); x.fill(); }
  // pueblo al fondo
  for (let i = 0; i < 14; i++) { const bx = 150 + i * 38, bh = 26 + (i * 13) % 22; x.fillStyle = ['#efe6d4', '#e8d9bf', '#f4e3cc'][i % 3]; x.fillRect(bx, 268 - bh, 34, bh); x.fillStyle = '#b5513c'; x.beginPath(); x.moveTo(bx - 3, 268 - bh); x.lineTo(bx + 17, 256 - bh); x.lineTo(bx + 37, 268 - bh); x.fill(); }
  // Rodenín grande
  if (!Title.art) Title.art = monVector('rodenin', 300);
  const bob = Math.sin(t * 2.2) * 6; x.imageSmoothingEnabled = true; x.drawImage(Title.art, W / 2 - 150, 150 + bob, 300, 300); x.imageSmoothingEnabled = false;
  // logo
  x.save(); x.textAlign = 'center'; x.font = `900 66px ${FONT}`; x.lineJoin = 'round'; x.lineWidth = 14; x.strokeStyle = '#1d3a6a'; x.strokeText('TheTalaVillage', W / 2, 92); x.fillStyle = '#ffd23a'; x.fillText('TheTalaVillage', W / 2, 92);
  x.lineWidth = 3; x.strokeStyle = '#fff6c0'; x.strokeText('TheTalaVillage', W / 2, 92); x.font = `bold 20px ${FONT}`; x.fillStyle = '#1d3a6a'; x.fillText('Una aventura de Talamones en Talayuelas', W / 2, 124); x.restore();
  if (!Title.menu && Title.ready && G.ui.length === 0) { const a = .5 + .5 * Math.sin(t * 4); txt(x, 'Toca la pantalla o pulsa A', W / 2, H - 22, { s: 22, a: 'center', c: `rgba(255,255,255,${.6 + a * .4})`, shc: 'rgba(0,0,0,.5)' }); zone(0, 0, W, H, () => { Title.go = true; }); }
  if (!Title.ready) txt(x, 'Cargando…', W / 2, H - 22, { s: 20, a: 'center', c: '#fff' });
  if (!Title.esc) { Title.esc = new Image(); Title.esc.src = 'escudo.png'; } if (Title.esc.complete && Title.esc.naturalWidth) { x.imageSmoothingEnabled = true; x.drawImage(Title.esc, 14, H - 128, 80, 118); x.imageSmoothingEnabled = false; }
  txt(x, 'El Cierzo · Tattoo & Barber Shop', W - 12, H - 8, { s: 12, a: 'right', c: 'rgba(255,255,255,.8)', sh: false });
}
async function titleFlow() {
  Audio.play('pueblo');
  const items = []; if (SAVE_TXT) items.push('Continuar'); items.push('Nueva partida', 'Volver a Secret Games');
  const i = await menu(items, { x: W / 2 - 150, y: 300, w: 300, rows: items.length, noCancel: true }); const k = items[i];
  if (k === 'Volver a Secret Games') { exitGame(); return; }
  if (k === 'Continuar') { try { loadSave(SAVE_TXT); } catch (e) { console.error(e); await say('No se pudo leer la partida guardada. Empieza una nueva.'); return titleFlow(); } await fadeOut(); G.mode = 'world'; enterMap(G.S.map, G.S.x, G.S.y, G.S.dir); await fadeIn(); return; }
  if (SAVE_TXT && await ask('Ya tienes una partida guardada. Si empiezas otra nueva, se sobrescribirá al guardar. ¿Seguro?', ['Sí, empezar de nuevo', 'No']) !== 0) return titleFlow();
  await newGame();
}
async function newGame() {
  G.S = newSave('Edgar', 'chico'); setMonUID(1);
  const XS = new Screen({ look: null, drw(x) { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a2a3a'); g.addColorStop(1, '#5a4a6a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 20; i++) { x.beginPath(); x.arc((i * 131) % W, (i * 71) % H, 30, 0, 7); x.fill(); }
    x.imageSmoothingEnabled = false; x.drawImage(personSheet(this.look || LOOK.xiko), 0, 0, 16, 24, W / 2 - 64, 60, 128, 192); if (this.mon) drawMonIcon(x, this.mon, W / 2 + 170, 190 + Math.sin(G.t * 3) * 4, 170); } });
  G.ui.push(XS); Audio.play('casa');
  await say('Xiko: ¡Hola! ¡Bienvenido al mundo de los Talamones!');
  await say('Xiko: Me llamo Xiko. Tengo una barbería y estudio de tatuaje en Talayuelas, un pueblo precioso de la Serranía de Cuenca: El Cierzo.');
  XS.mon = 'rodenin'; Audio.sfx('blip'); await say('Xiko: Este pueblo está lleno de unas criaturas llamadas Talamones. Este de aquí es Rodenín: una piedrecita de rodeno con un pino por tupé.');
  await say('Xiko: Unos Talamones viven en las eras, otros en los huertos, en el arroyo… ¡y algunos hasta en las farolas!');
  XS.mon = null; G.S.look = 'chico'; G.S.name = 'Edgar'; XS.look = playerLook(); Audio.sfx('blip');
  await say('Xiko: ¡Y tú debes de ser Edgar! Tu abuela me ha hablado mucho de ti. ¡Qué ganas tenía de conocerte!');
  await say('Xiko: Tu aventura en Talayuelas está a punto de empezar. Hay mucho que descubrir: Talamones, Maestros, leyendas… y algún que otro sinvergüenza.');
  await say('Xiko: ¡Nos vemos en el pueblo! ¡Vamos allá!');
  closeUI(XS); await fadeOut(); G.mode = 'world'; enterMap('pueblo', 48, 42, 'up'); await fadeIn();
}

/* ---------- bucle ---------- */
let last = performance.now(), saveTimer = 0;
function frame(now) {
  requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; G.t += dt; G.frame++;
  if (G.S && G.mode !== 'title') G.S.time += dt;
  // lógica
  if (G.mode === 'title' && !G.ui.length && Title.ready && (Input.pressed('a') || Title.go)) { Title.go = false; Audio.unlock(); runScript(titleFlow); }
  if (G.ui.length) G.ui[G.ui.length - 1].update(dt);
  if (G.mode === 'world') worldUpdate(dt);
  G.fade = G.fadeTo > G.fade ? Math.min(G.fadeTo, G.fade + dt * 4) : Math.max(G.fadeTo, G.fade - dt * 4); G.flash = Math.max(0, G.flash - dt * 2.5);
  const w = frameWaiters.splice(0); w.forEach(r => r());
  // dibujo
  resetZones(); ctx.imageSmoothingEnabled = false;
  if (G.mode === 'title') drawTitle(ctx); else if (G.mode === 'battle') drawBattle(ctx); else if (G.map) drawWorld(ctx);
  if (G.mode === 'world' && G.map && !G.ui.length && !G.lock && G.map.name && G.mapNameT !== G.map.id) { G.mapNameT = G.map.id; G.mapName = { n: G.map.name, t: G.t + 2.2 }; }
  if (G.mapName && G.t < G.mapName.t && G.mode === 'world') { const a = Math.min(1, (G.mapName.t - G.t) * 2); ctx.globalAlpha = a; panel(ctx, 16, 14, Math.max(200, G.mapName.n.length * 13 + 40), 50, { bg: '#fbfaf6', r: 12 }); txt(ctx, G.mapName.n, 36, 47, { s: 21 }); ctx.globalAlpha = 1; }
  for (let i = 0; i < G.ui.length; i++) { if (i < G.ui.length - 1) { const z = getZones().length; G.ui[i].draw(ctx); getZones().length = z; } else G.ui[i].draw(ctx); }
  if (G.toast && G.t < G.toast.t) { panel(ctx, W / 2 - 200, 14, 400, 46, { r: 12 }); txt(ctx, G.toast.msg, W / 2, 44, { s: 19, a: 'center' }); }
  if (G.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${G.flash})`; ctx.fillRect(0, 0, W, H); }
  if (G.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${G.fade})`; ctx.fillRect(0, 0, W, H); }
  Input.endFrame();
  // autoguardado local cada 2 minutos (en el servidor solo al guardar)
  if (G.S && G.mode === 'world') { saveTimer += dt; if (saveTimer > 120) { saveTimer = 0; try { localStorage.setItem('talavillage:' + (APODO || 'local'), JSON.stringify(G.S)); } catch (e) { } } }
}
requestAnimationFrame(frame);

/* ---------- toques en la pantalla ---------- */
cv.addEventListener('pointerdown', e => { e.preventDefault(); Audio.unlock(); const r = cv.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H; handleTap(x, y); });
/* ---------- controles táctiles ---------- */
(function () {
  const pad = document.getElementById('dpad'); if (!pad) return; let cur = null, pid = null;
  const setDir = d => { if (cur === d) return; if (cur) Input.release(cur); cur = d; if (d) Input.press(d); pad.dataset.d = d || ''; };
  const dirAt = e => { const r = pad.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); if (Math.hypot(dx, dy) < r.width * .12) return cur; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); };
  pad.addEventListener('pointerdown', e => { e.preventDefault(); pid = e.pointerId; pad.setPointerCapture(pid); setDir(dirAt(e)); });
  pad.addEventListener('pointermove', e => { if (e.pointerId === pid) setDir(dirAt(e)); });
  const up = e => { if (e.pointerId === pid) { setDir(null); pid = null; } }; pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);
  for (const b of document.querySelectorAll('[data-k]')) { const k = b.dataset.k; b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add('on'); Input.press(k); }); const rel = () => { b.classList.remove('on'); Input.release(k); }; b.addEventListener('pointerup', rel); b.addEventListener('pointercancel', rel); }
})();
/* ---------- encaje en pantalla ---------- */
function layout() {
  const vw = innerWidth, vh = innerHeight, touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window; document.body.classList.toggle('touch', touch);
  let ext = false; if (GBMODE) { ext = true; try { const P = window.parent; ext = !(P.matchMedia('(orientation: landscape)').matches && P.matchMedia('(pointer: coarse)').matches); } catch (e) { } }
  document.body.classList.toggle('extctl', ext); const portrait = vh > vw && !ext; document.body.classList.toggle('portrait', portrait && touch);
  let w, h; if (portrait && touch) { w = vw; h = w * H / W; if (h > vh * .6) { h = vh * .6; w = h * W / H; } } else { w = Math.min(vw, vh * W / H); h = w * H / W; }
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
}
addEventListener('resize', layout); layout();
Object.assign(window, { saveGame, exitGame });
