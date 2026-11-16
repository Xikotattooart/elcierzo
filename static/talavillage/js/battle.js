'use strict';
/* =====================================================================
   TheTalaVillage · combates por turnos, captura, experiencia y evolución
   ===================================================================== */
let BT = null; const monCache2 = {};
const stageMul = s => s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
const accMul = s => s >= 0 ? (3 + s) / 3 : 3 / (3 - s);
const STRUGGLE = { id: 'forcejeo', n: 'Forcejeo', t: 'NORMAL', c: 'f', p: 50, a: 101, pp: 1, ef: { recoil: .25 } };

/* ---------- mensajes de combate ---------- */
class BMsg extends Dialog {
  constructor(text, o = {}) { super(text, o); this.auto = o.auto !== false; this.wait = 0; }
  update(dt) { const page = this.pages[this.pi], total = page.join('\n').length; if (this.auto && this.n >= total) { this.wait += dt; if (this.wait > (G.S.opts.fast ? .75 : 1.2)) { this._tap = true; this.wait = 0; } } super.update(dt); }
  draw(x) {
    const Y = H - 120; x.fillStyle = '#2a3048'; x.fillRect(0, Y, W, 120); x.fillStyle = '#d4343f'; x.fillRect(0, Y, W, 5);
    panel(x, 14, Y + 14, W - 28, 94, { bg: '#fdfcf8', border: '#5a6a8a', r: 12 }); const page = this.pages[this.pi]; let left = this.n | 0;
    page.forEach((ln, i) => { const s = ln.slice(0, Math.max(0, left)); left -= ln.length + 1; txt(x, s, 36, Y + 52 + i * 32, { s: 23 }); }); zone(0, 0, W, H, () => { this._tap = true; });
  }
}
const bsay = (t, o) => pushUI(new BMsg(t, o));

/* ---------- arranque ---------- */
async function wildBattle(id, lvl) { const m = makeMon(id, lvl); return battle({ wild: m }); }
async function battle(o) {
  const prevMode = G.mode; G.mode = 'battle'; const T = o.trainer;
  const foes = o.wild ? [o.wild] : T.team.map(([id, lv, mv]) => makeMon(id, lv, mv ? { moves: mv } : {}));
  BT = { o, T, foes, fi: 0, pi: G.S.party.findIndex(m => m.hp > 0), st: [newSide(), newSide()], part: new Set(), runs: 0, t0: G.t, intro: 0, anim: {}, hp: [0, 0], ball: null, trainerShown: !!T, shake: 0, fx: [] };
  BT.hp[0] = BT.foes[0].hp; BT.hp[1] = G.S.party[BT.pi].hp; BT.part.add(G.S.party[BT.pi].uid); G.S.seen[foes[0].id] = 1;
  Audio.play(T && T.leader ? 'maestro' : T && T.boss ? 'leyenda' : o.legend ? 'leyenda' : 'combate'); Audio.sfx('encounter');
  // transición
  G.flash = 1; await sleep(450); G.battleIn = 1; await sleep(250);
  let result;
  try { result = await battleLoop(); } catch (e) { console.error(e); result = 'run'; }
  G.battleIn = 0; G.mode = 'world'; BT = null; Audio.play(G.map.music || 'pueblo');
  if (result === 'lose' && !o.noLose) await whiteout();
  else await postBattleEvolutions();
  void prevMode; return result;
}
function newSide() { return { atk: 0, def: 0, esp: 0, vel: 0, acc: 0 }; }
const mine = () => G.S.party[BT.pi], foe = () => BT.foes[BT.fi];

async function battleLoop() {
  const T = BT.T;
  if (T) { await bsay(`¡${T.cls ? T.cls + ' ' : ''}${T.name} quiere luchar!`); BT.trainerShown = false; await bsay(`¡${T.name} saca a ${monName(foe())}!`); }
  else await bsay(`¡Un ${SPECIES[foe().id].n} salvaje ${BT.o.legend ? 'te desafía' : 'aparece'}!`);
  BT.anim.mineIn = 1; await bsay(`¡Adelante, ${monName(mine())}!`);
  while (true) {
    const act = await chooseAction(); if (act === null) continue;
    const r = await doTurn(act); if (r) return r;
  }
}

/* ---------- elección del jugador ---------- */
class ActionMenu {
  constructor() { this.i = 0; }
  update() { if (Input.repeat('left') || Input.repeat('right')) { this.i ^= 1; Audio.sfx('blip'); } if (Input.repeat('up') || Input.repeat('down')) { this.i ^= 2; Audio.sfx('blip'); } if (Input.pressed('a') || this._t) { this._t = false; Audio.sfx('ok'); closeUI(this, this.i); } }
  draw(x) {
    const Y = H - 120; x.fillStyle = '#2a3048'; x.fillRect(0, Y, W, 120); x.fillStyle = '#d4343f'; x.fillRect(0, Y, W, 5);
    panel(x, 14, Y + 14, 330, 94, { bg: '#fdfcf8', border: '#5a6a8a', r: 12 }); txt(x, '¿Qué hará', 34, Y + 52, { s: 22 }); txt(x, monName(mine()) + '?', 34, Y + 84, { s: 22 });
    const B = [['LUCHAR', '#e8483a'], ['MOCHILA', '#f0b020'], ['EQUIPO', '#3cb85a'], ['HUIR', '#3a7ad6']];
    B.forEach(([l, c], k) => { const X = 358 + (k % 2) * 216, YY = Y + 12 + (k >> 1) * 52, sel = k === this.i; x.fillStyle = shade(c, -.35); x.beginPath(); x.roundRect(X, YY + 3, 206, 46, 12); x.fill(); x.fillStyle = sel ? shade(c, .15) : c; x.beginPath(); x.roundRect(X, YY, 206, 46, 12); x.fill(); if (sel) { x.lineWidth = 4; x.strokeStyle = '#fff'; x.stroke(); }
      txt(x, l, X + 103, YY + 31, { s: 22, a: 'center', c: '#fff', shc: 'rgba(0,0,0,.35)' }); zone(X, YY, 206, 46, () => { this.i = k; this._t = true; }); });
  }
}
class MoveMenu {
  constructor(m) { this.m = m; this.i = 0; }
  update() { const n = this.m.moves.length; if (Input.repeat('left') || Input.repeat('right')) { this.i = Math.min(n - 1, this.i ^ 1); Audio.sfx('blip'); } if (Input.repeat('up') || Input.repeat('down')) { this.i = Math.min(n - 1, this.i ^ 2); Audio.sfx('blip'); }
    if (Input.pressed('a') || this._t) { this._t = false; if (this.m.moves[this.i].pp <= 0) { Audio.sfx('bump'); return; } Audio.sfx('ok'); closeUI(this, this.i); } else if (Input.pressed('b') || this._b) { this._b = false; Audio.sfx('back'); closeUI(this, -1); } }
  draw(x) {
    const Y = H - 150; x.fillStyle = '#2a3048'; x.fillRect(0, Y, W, 150); x.fillStyle = '#d4343f'; x.fillRect(0, Y, W, 5);
    this.m.moves.forEach((mv, k) => { const M = MOVES[mv.k], c = TYPES[M.t].c, X = 14 + (k % 2) * 330, YY = Y + 14 + (k >> 1) * 66, sel = k === this.i, eff = typeEff(M.t, SPECIES[foe().id].t);
      x.fillStyle = shade(c, -.35); x.beginPath(); x.roundRect(X, YY + 3, 318, 58, 12); x.fill(); x.fillStyle = sel ? shade(c, .15) : c; x.beginPath(); x.roundRect(X, YY, 318, 58, 12); x.fill(); if (sel) { x.lineWidth = 4; x.strokeStyle = '#fff'; x.stroke(); }
      txt(x, M.n, X + 16, YY + 27, { s: 22, c: '#fff', shc: 'rgba(0,0,0,.4)' }); txt(x, `PP ${mv.pp}/${M.pp}`, X + 304, YY + 48, { s: 15, a: 'right', c: mv.pp ? '#fff' : '#ffd0d0', shc: 'rgba(0,0,0,.4)' });
      txt(x, TYPES[M.t].n + (M.c !== 's' && eff !== 1 ? (eff > 1 ? '  · ¡Muy eficaz!' : eff === 0 ? '  · No afecta' : '  · Poco eficaz') : ''), X + 16, YY + 49, { s: 14, c: '#fff', shc: 'rgba(0,0,0,.4)', w: 'normal' });
      zone(X, YY, 318, 58, () => { this.i = k; this._t = true; }); });
    const bx = 678, by = Y + 14; x.fillStyle = '#5a6a8a'; x.beginPath(); x.roundRect(bx, by, 108, 124, 12); x.fill(); txt(x, 'Atrás', bx + 54, by + 70, { s: 20, a: 'center', c: '#fff' }); zone(bx, by, 108, 124, () => { this._b = true; });
  }
}
async function chooseAction() {
  const m = mine();
  if (m.moves.every(mv => mv.pp <= 0)) { const a = await pushUI(new ActionMenu()); if (a === 0) return { k: 'move', i: -1 }; return actFromMenu(a); }
  const a = await pushUI(new ActionMenu()); return actFromMenu(a);
}
async function actFromMenu(a) {
  if (a === 0) { const i = await pushUI(new MoveMenu(mine())); if (i < 0) return null; return { k: 'move', i }; }
  if (a === 1) { const id = await bagScreen(true); if (!id) return null; const it = ITEMS[id];
    if (it.k === 'ball') { if (BT.T) { await bsay('¡No puedes atrapar el Talamón de otro entrenador! ¡Eso es de mala educación!'); return null; } return { k: 'ball', id }; }
    const pi = await partyScreen('pick', { title: 'Usar ' + it.n }); if (pi < 0) return null; return { k: 'item', id, pi }; }
  if (a === 2) { const pi = await partyScreen('battle'); if (pi < 0 || pi === BT.pi) { if (pi === BT.pi) await bsay(`¡${monName(mine())} ya está luchando!`); return null; } if (G.S.party[pi].hp <= 0) { await bsay('¡Ese Talamón está debilitado!'); return null; } return { k: 'switch', pi }; }
  if (a === 3) return { k: 'run' };
  return null;
}

/* ---------- turno ---------- */
function foeMove() {
  const f = foe(), m = mine(), usable = f.moves.filter(mv => mv.pp > 0); if (!usable.length) return -1;
  if (!BT.T) return f.moves.indexOf(pick(usable));
  const smart = BT.T.leader || BT.T.boss ? .85 : .6; let best = null, bv = -1;
  for (const mv of usable) { const M = MOVES[mv.k]; let v;
    if (M.c === 's') { v = 25; if (M.ef && M.ef.st && m.st) v = 0; if (M.ef && M.ef.heal && f.hp > f.mhp * .6) v = 0; if (M.ef && M.ef.siesta && f.hp > f.mhp * .4) v = 0; if (M.ef && M.ef.stat && M.ef.to === 'yo' && BT.st[0][M.ef.stat] >= 2) v = 2; }
    else { v = M.p * typeEff(M.t, SPECIES[m.id].t) * (SPECIES[f.id].t.includes(M.t) ? 1.5 : 1) * Math.min(1, M.a / 100); }
    v *= .7 + Math.random() * .6; if (v > bv) { bv = v; best = mv; } }
  return Math.random() < smart ? f.moves.indexOf(best) : f.moves.indexOf(pick(usable));
}
function speedOf(m, side) { return m.vel * stageMul(BT.st[side].vel) * (m.st === 'para' ? .5 : 1); }
async function doTurn(act) {
  BT.flinch = [false, false];
  if (act.k === 'run') {
    if (BT.T) { await bsay('¡No puedes huir de un combate contra un entrenador!'); return null; }
    if (BT.o.legend) { await bsay('¡No hay escapatoria!'); return null; }
    BT.runs++; const a = speedOf(mine(), 1), b = speedOf(foe(), 0); if (a >= b || Math.random() * 256 < (a * 128 / b + 30 * BT.runs) % 256) { Audio.sfx('run'); await bsay('¡Escapas sin problemas!'); return 'run'; }
    await bsay('¡No has podido escapar!'); if (await foeAct()) return endCheck();
    return endOfTurn();
  }
  if (act.k === 'ball') { const r = await throwBall(act.id); if (r) return r; if (await foeAct()) return endCheck(); return endOfTurn(); }
  if (act.k === 'item') { const used = await useItemOn(act.id, G.S.party[act.pi]); if (!used) return null; if (act.pi === BT.pi) BT.hp[1] = mine().hp; if (await foeAct()) return endCheck(); return endOfTurn(); }
  if (act.k === 'switch') { await switchTo(act.pi); if (await foeAct()) return endCheck(); return endOfTurn(); }
  // ataques
  const mi = act.i, fi = foeMove(); const mm = mi < 0 ? STRUGGLE : MOVES[mine().moves[mi].k], fm = fi < 0 ? STRUGGLE : MOVES[foe().moves[fi].k];
  const pm = (mm.ef && mm.ef.prio) || 0, pf = (fm.ef && fm.ef.prio) || 0; let first = pm !== pf ? pm > pf : speedOf(mine(), 1) === speedOf(foe(), 0) ? chance(.5) : speedOf(mine(), 1) > speedOf(foe(), 0);
  const order = first ? [[1, mi], [0, fi]] : [[0, fi], [1, mi]];
  for (const [side, idx] of order) {
    const atk = side ? mine() : foe(), def = side ? foe() : mine(); if (atk.hp <= 0 || def.hp <= 0) continue;
    if (BT.flinch[side]) { await bsay(`¡${who(side)} se ha acobardado y no se mueve!`); continue; }
    await useMove(side, idx);
    const r = await faintCheck(); if (r) return r; if (r === false) break; // alguien cayó: termina el turno
  }
  return endOfTurn();
}
async function foeAct() { if (foe().hp <= 0) return false; await useMove(0, foeMove()); const r = await faintCheck(); return r !== null && r !== undefined ? r : false; }
let lastFaintResult = null;
async function endCheck() { return lastFaintResult; }
const who = side => side ? monName(mine()) : (BT.T ? `${monName(foe())} rival` : `${SPECIES[foe().id].n} salvaje`);

async function useMove(side, idx) {
  const A = side ? mine() : foe(), D = side ? foe() : mine(), sa = BT.st[side], sd = BT.st[side ^ 1];
  // estados que impiden actuar
  if (A.st === 'dorm') { A.sleep = (A.sleep || 1) - 1; if (A.sleep > 0) { await bsay(`${who(side)} está profundamente dormido. Zzz…`); return; } A.st = null; await bsay(`¡${who(side)} se ha despertado!`); }
  if (A.st === 'para' && chance(.25)) { await bsay(`¡${who(side)} está paralizado! No se puede mover.`); return; }
  let mv = idx < 0 ? null : A.moves[idx], M = mv ? MOVES[mv.k] : STRUGGLE; if (mv) mv.pp = Math.max(0, mv.pp - 1);
  if (!mv) await bsay(`¡A ${who(side)} no le quedan ataques!`);
  await bsay(`¡${who(side)} usa ${M.n}!`, { auto: true });
  // precisión
  if (M.a <= 100 && !(M.c === 's' && M.ef && M.ef.to === 'yo')) { const acc = M.a * accMul(sa.acc); if (Math.random() * 100 >= acc) { await bsay(`¡Pero ha fallado!`); return; } }
  if (M.c === 's') { await statusMove(side, M); return; }
  const eff = typeEff(M.t, SPECIES[D.id].t); if (eff === 0) { await bsay(`No afecta a ${who(side ^ 1)}…`); return; }
  const crit = Math.random() < (M.ef && M.ef.crit ? 1 / 6 : 1 / 16), phys = M.c === 'f';
  const at = (phys ? A.atk * stageMul(crit ? Math.max(0, sa.atk) : sa.atk) : A.esp * stageMul(crit ? Math.max(0, sa.esp) : sa.esp)) * (phys && A.st === 'quem' ? .5 : 1);
  const df = phys ? D.def * stageMul(crit ? Math.min(0, sd.def) : sd.def) : D.esp * stageMul(crit ? Math.min(0, sd.esp) : sd.esp);
  let dmg = Math.floor(Math.floor(Math.floor(2 * A.lvl / 5 + 2) * M.p * at / Math.max(1, df)) / 50) + 2;
  dmg = Math.max(1, Math.floor(dmg * (SPECIES[A.id].t.includes(M.t) ? 1.5 : 1) * eff * (crit ? 1.5 : 1) * (.85 + Math.random() * .15)));
  dmg = Math.min(dmg, D.hp);
  await hitAnim(side, eff); D.hp -= dmg; await animHP(side ^ 1);
  if (crit) await bsay('¡Un golpe crítico!'); if (eff > 1) await bsay('¡Es muy eficaz!'); else if (eff < 1) await bsay('No es muy eficaz…');
  const ef = M.ef || {};
  if (ef.drain && A.hp > 0) { const h = Math.max(1, Math.floor(dmg * ef.drain)); A.hp = Math.min(A.mhp, A.hp + h); await animHP(side); await bsay(`${who(side ^ 1)} pierde energía.`); }
  if (ef.recoil && A.hp > 0) { const r = Math.max(1, Math.floor(dmg * ef.recoil)); A.hp = Math.max(0, A.hp - r); await animHP(side); await bsay(`¡${who(side)} también se hace daño!`); }
  if (D.hp > 0) {
    if (ef.st && chance(ef.ch || 1) && !D.st && !(ef.st === 'quem' && SPECIES[D.id].t.includes('FUEGO'))) await applyStatus(side ^ 1, ef.st);
    if (ef.stat && chance(ef.ch || 1)) await changeStat(ef.to === 'yo' ? side : side ^ 1, ef.stat, ef.n);
    if (ef.flinch && chance(ef.flinch)) BT.flinch[side ^ 1] = true;
  }
}
async function statusMove(side, M) {
  const ef = M.ef || {}, A = side ? mine() : foe(), D = side ? foe() : mine();
  if (ef.siesta) { if (A.hp >= A.mhp) { await bsay('¡Pero no tiene sueño!'); return; } A.hp = A.mhp; A.st = 'dorm'; A.sleep = 3; await animHP(side); Audio.sfx('heal'); await bsay(`¡${who(side)} se echa una siesta y recupera todos sus PS!`); return; }
  if (ef.heal) { if (A.hp >= A.mhp) { await bsay('¡Pero ya tiene todos sus PS!'); return; } A.hp = Math.min(A.mhp, A.hp + Math.floor(A.mhp * ef.heal)); Audio.sfx('heal'); await animHP(side); await bsay(`${who(side)} recupera PS.`); return; }
  if (ef.st) { if (D.st) { await bsay(`¡Pero no ha tenido efecto!`); return; } if (ef.st === 'para' && SPECIES[D.id].t.includes('TIERRA') && M.t === 'ELEC') { await bsay(`No afecta a ${who(side ^ 1)}…`); return; } await applyStatus(side ^ 1, ef.st); return; }
  if (ef.stat) { await changeStat(ef.to === 'yo' ? side : side ^ 1, ef.stat, ef.n); if (ef.also) await changeStat(ef.to === 'yo' ? side : side ^ 1, ef.also.stat, ef.also.n); }
}
async function applyStatus(side, st) {
  const m = side ? mine() : foe(); if (m.st || m.hp <= 0) return; m.st = st; if (st === 'dorm') m.sleep = irnd(2, 4);
  BT.anim['st' + side] = G.t; await bsay(`¡${who(side)} está ${STATUS[st].t}!`);
}
async function changeStat(side, k, n) {
  const s = BT.st[side]; const nv = clamp(s[k] + n, -6, 6); if (nv === s[k]) { await bsay(`¡${STATN[k]} de ${who(side)} no puede ${n > 0 ? 'subir' : 'bajar'} más!`); return; }
  s[k] = nv; Audio.sfx(n > 0 ? 'stat' : 'statdown'); BT.anim['stat' + side] = { t: G.t, up: n > 0 };
  await bsay(`¡${n > 0 ? 'Sube' : 'Baja'}${Math.abs(n) > 1 ? ' mucho' : ''} ${n > 0 ? 'el' : 'el'} ${STATN[k]} de ${who(side)}!`);
}
async function endOfTurn() {
  for (const side of [1, 0]) { const m = side ? mine() : foe(); if (m.hp <= 0) continue;
    if (m.st === 'quem' || m.st === 'vene') { const d = Math.max(1, Math.floor(m.mhp / (m.st === 'quem' ? 16 : 8))); m.hp = Math.max(0, m.hp - d); await animHP(side); await bsay(`¡${who(side)} sufre por ${m.st === 'quem' ? 'las quemaduras' : 'el veneno'}!`); } }
  const r = await faintCheck(); return r || null;
}

/* ---------- debilitados ---------- */
async function faintCheck() {
  lastFaintResult = null;
  if (foe().hp <= 0) {
    Audio.sfx('faint'); BT.anim.foeFaint = G.t; await sleep(500); await bsay(`¡${who(0)} se ha debilitado!`);
    await giveExp();
    if (BT.T && BT.fi < BT.foes.length - 1) {
      BT.fi++; BT.anim.foeFaint = 0; BT.st[0] = newSide(); BT.hp[0] = foe().hp; G.S.seen[foe().id] = 1; BT.part = new Set([mine().uid]);
      await bsay(`¡${BT.T.name} saca a ${monName(foe())}!`); return lastFaintResult = false;
    }
    if (BT.T) { BT.trainerShown = true; Audio.play('victoria'); const money = BT.T.money || foe().lvl * 40; G.S.money += money; await bsay(`¡Has ganado a ${BT.T.cls ? BT.T.cls + ' ' : ''}${BT.T.name}!`); if (BT.T.lose) await bsay(BT.T.name + ': ' + BT.T.lose, { auto: false }); await bsay(`Ganas ${money} €.`); }
    return lastFaintResult = 'win';
  }
  if (mine().hp <= 0) {
    Audio.sfx('faint'); BT.anim.mineFaint = G.t; await sleep(500); await bsay(`¡${monName(mine())} se ha debilitado!`);
    if (!G.S.party.some(m => m.hp > 0)) { await bsay('¡No te quedan Talamones en condiciones de luchar!', { auto: false }); return lastFaintResult = 'lose'; }
    let pi = -1; while (pi < 0 || G.S.party[pi].hp <= 0) pi = await partyScreen('pick', { title: '¿A quién envías?', noCancel: true });
    await switchTo(pi, true); return lastFaintResult = false;
  }
  return null;
}
async function switchTo(pi, forced) {
  if (!forced) await bsay(`¡Vuelve, ${monName(mine())}!`); BT.pi = pi; BT.st[1] = newSide(); BT.anim.mineFaint = 0; BT.anim.mineIn = G.t; BT.hp[1] = mine().hp; BT.part.add(mine().uid);
  await bsay(`¡Adelante, ${monName(mine())}!`);
}

/* ---------- experiencia y niveles ---------- */
async function giveExp() {
  const f = foe(), sp = SPECIES[f.id], tot = Math.floor(sp.ex * f.lvl / 7 * (BT.T ? 1.5 : 1));
  const parts = G.S.party.filter(m => BT.part.has(m.uid) && m.hp > 0); if (!parts.length) return;
  const each = Math.max(1, Math.floor(tot / parts.length));
  for (const m of parts) { if (m.lvl >= 100) continue; m.exp += each; await bsay(`¡${monName(m)} gana ${each} puntos de experiencia!`); while (m.lvl < 100 && m.exp >= expFor(m.lvl + 1)) await levelUp(m); }
}
async function levelUp(m, fromItem) {
  m.lvl++; const oh = m.mhp; calcStats(m); if (m.hp > 0) m.hp = Math.min(m.mhp, m.hp + (m.mhp - oh)); if (BT && m === mine()) BT.hp[1] = m.hp;
  Audio.sfx('level'); const say2 = BT ? bsay : say; await say2(`¡${monName(m)} sube al nivel ${m.lvl}!`, { auto: false });
  const sp = SPECIES[m.id]; for (const [l, k] of sp.L) if (l === m.lvl) await learnMove(m, k);
  if (sp.ev && m.lvl >= sp.ev[0]) m._evo = sp.ev[1];
}
async function learnMove(m, k) {
  if (m.moves.some(mv => mv.k === k)) return; const say2 = BT ? bsay : say;
  if (m.moves.length < 4) { m.moves.push({ k, pp: MOVES[k].pp }); Audio.sfx('item'); await say2(`¡${monName(m)} ha aprendido ${MOVES[k].n}!`, { auto: false }); return; }
  await say2(`${monName(m)} quiere aprender ${MOVES[k].n}, pero ya conoce cuatro ataques.`, { auto: false });
  const i = await menu(m.moves.map(mv => ({ label: MOVES[mv.k].n, right: TYPES[MOVES[mv.k].t].n, desc: MOVES[mv.k].d })).concat([{ label: `No aprender ${MOVES[k].n}`, desc: MOVES[k].d }]), { x: W - 420, y: 20, w: 400, rows: 5, title: '¿Qué ataque olvida?', desc: true });
  if (i < 0 || i >= 4) { await say2(`${monName(m)} no ha aprendido ${MOVES[k].n}.`, { auto: false }); return; }
  const old = MOVES[m.moves[i].k].n; m.moves[i] = { k, pp: MOVES[k].pp }; await say2(`1, 2 y… ¡zas! ${monName(m)} olvida ${old} y aprende ${MOVES[k].n}.`, { auto: false });
}
async function checkEvolution(m) { const sp = SPECIES[m.id]; if (sp.ev && m.lvl >= sp.ev[0]) { m._evo = sp.ev[1]; await postBattleEvolutions(); } }
async function postBattleEvolutions() { for (const m of G.S.party) if (m._evo && m.hp > 0) { const to = m._evo; m._evo = null; await evolveScene(m, to); } else m._evo = null; }
async function evolveScene(m, to) {
  const from = m.id; let t0 = G.t, done = false; Audio.play('leyenda');
  const sil = id => { const k = '_w' + id; if (monCache2[k]) return monCache2[k]; const sp = monSprite(id), [c, cx] = mkCanvas(sp.width, sp.height); cx.drawImage(sp, 0, 0); cx.globalCompositeOperation = 'source-in'; cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, c.width, c.height); return monCache2[k] = c; };
  const S = new Screen({ upd() { }, drw(x) { const g = x.createRadialGradient(W / 2, H / 2 - 40, 10, W / 2, H / 2 - 40, 420); g.addColorStop(0, '#fffbe0'); g.addColorStop(1, '#3a4a8a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    const e = G.t - t0; x.imageSmoothingEnabled = false;
    if (done) drawMonIcon(x, to, W / 2, H / 2 - 50, 240);
    else { const sw = Math.sin(e * (1.5 + e * 2.2)) > 0; const im = sil(sw ? to : from); x.drawImage(im, W / 2 - 120, H / 2 - 170, 240, 240); }
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28 + e, r = 150 + Math.sin(e * 3 + i) * 20; x.fillStyle = '#fff8c0'; x.beginPath(); x.arc(W / 2 + Math.cos(a) * r, H / 2 - 50 + Math.sin(a) * r * .6, 4, 0, 7); x.fill(); } } });
  G.ui.push(S); await say(`¿Eh? ¡${monName(m)} está evolucionando!`); Audio.sfx('evo'); await sleep(3600); done = true; G.S.seen[to] = 1; G.S.caught[to] = 1;
  const oldName = monName(m); m.id = to; calcStats(m); Audio.sfx('catch'); await say(`¡Enhorabuena! ¡${oldName} ha evolucionado en ${SPECIES[to].n}!`);
  for (const [l, k] of SPECIES[to].L) if (l === m.lvl) await learnMove(m, k);
  closeUI(S); Audio.play(G.map.music || 'pueblo');
}

/* ---------- captura ---------- */
async function throwBall(id) {
  G.S.bag[id]--; const f = foe(), sp = SPECIES[f.id], b = ITEMS[id].ball;
  await bsay(`¡Lanzas una ${ITEMS[id].n}!`, { auto: true }); Audio.sfx('throw');
  BT.ball = { t: G.t, id, phase: 'fly' }; await sleep(650); BT.ball.phase = 'in'; BT.anim.caught = G.t; await sleep(450);
  let shakes = 0, caught = false;
  if (b >= 255) { caught = true; shakes = 3; }
  else { const sb = f.st === 'dorm' ? 2 : f.st ? 1.5 : 1, a = ((3 * f.mhp - 2 * f.hp) * sp.r * b) / (3 * f.mhp) * sb;
    if (a >= 255) { caught = true; shakes = 3; } else { const bb = 1048560 / Math.sqrt(Math.sqrt(16711680 / a)); for (shakes = 0; shakes < 4; shakes++) if (Math.random() * 65536 >= bb) break; caught = shakes >= 4; shakes = Math.min(3, shakes); } }
  BT.ball.phase = 'wob'; for (let i = 0; i < shakes; i++) { BT.ball.wob = G.t; Audio.sfx('wobble'); await sleep(700); }
  if (!caught) { BT.ball = null; BT.anim.caught = 0; Audio.sfx('back'); await bsay(pick(['¡Oh, no! ¡Se ha escapado!', '¡Casi! ¡Por un pelo!', '¡Uf! ¡Parecía que sí…!', '¡Aaah! ¡Se ha soltado de la gomina!'])); return null; }
  BT.ball.phase = 'ok'; Audio.sfx('catch'); await bsay(`¡Genial! ¡Has atrapado a ${sp.n}!`, { auto: false });
  const first = !G.S.caught[f.id]; G.S.caught[f.id] = 1; G.S.seen[f.id] = 1; f.ot = G.S.name; f.st = f.st;
  if (first && flag('talapedia')) { await bsay(`Los datos de ${sp.n} se han añadido a la Talapedia.`); await dexEntry(sp); }
  if (G.S.party.length < 6) G.S.party.push(f); else { healMon(f); G.S.box.push(f); await bsay(`Tu equipo está lleno. ${sp.n} se ha enviado a la Caja Rural.`); }
  if (BT.o.onCatch) await BT.o.onCatch(); return 'caught';
}

/* ---------- derrota ---------- */
async function whiteout() {
  const lost = Math.floor(G.S.money / 4); G.S.money -= lost; await fadeOut();
  await say(`Has perdido ${lost} €… Corres a recuperarte a toda prisa.`);
  const hp = G.S.heal || ['salud', 5, 5]; enterMap(hp[0], hp[1], hp[2], 'up'); await healParty(); await fadeIn();
  await say(hp[0] === 'salud' ? 'Enfermera Carmen: ¡Ay, criatura! Tus Talamones ya están como nuevos. ¡Ten más cuidado ahí fuera!' : 'Abuela: ¡Ay, mi niño! Ven que te dé un caldito… Ya están tus Talamones como nuevos.');
}

/* ---------- animaciones ---------- */
async function hitAnim(side, eff) { BT.anim['lunge' + side] = G.t; await sleep(220); BT.anim['hit' + (side ^ 1)] = G.t; Audio.sfx(eff > 1 ? 'super' : eff < 1 ? 'weak' : 'hit'); G.shake = eff > 1 ? .35 : .18; await sleep(380); }
async function animHP(side) { const m = side ? mine() : foe(); while (Math.abs(BT.hp[side ^ 0] - m.hp) > .5) { const d = m.hp - BT.hp[side]; BT.hp[side] += Math.sign(d) * Math.max(.6, Math.abs(d) * .12); await nextFrame(); } BT.hp[side] = m.hp; }

function drawBattle(x) {
  if (!BT) return; const t = G.t, sh = G.shake > 0 ? (Math.random() - .5) * 14 * G.shake : 0;
  // fondo
  const night = timeTint && timeTint() && timeTint().includes('20,30,90');
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, night ? '#2a3a6a' : '#8ccaf0'); g.addColorStop(.42, night ? '#5a6a9a' : '#dff2fb'); g.addColorStop(.43, night ? '#3a5a3a' : '#9fd27a'); g.addColorStop(1, night ? '#2a4a2a' : '#5aa04a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  if (!G.map.interior) { x.fillStyle = night ? '#2a3a2a' : '#7ab070'; for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(i * 110 - 20, 205, 60 + (i % 3) * 18, Math.PI, 0); x.fill(); } x.fillStyle = night ? '#203020' : '#5f9a5a'; for (let i = 0; i < 12; i++) { const px = i * 74 + 10; x.beginPath(); x.moveTo(px, 205); x.lineTo(px + 16, 150 - (i % 3) * 14); x.lineTo(px + 32, 205); x.fill(); } }
  else { x.fillStyle = G.map.dark ? '#3a2a3a' : '#cfc6b6'; x.fillRect(0, 0, W, 206); x.fillStyle = G.map.dark ? '#2a1e2a' : '#b8ae9e'; for (let i = 0; i < W; i += 60) x.fillRect(i, 0, 4, 206); }
  // plataformas
  x.fillStyle = 'rgba(0,0,0,.15)'; x.beginPath(); x.ellipse(590, 214, 150, 36, 0, 0, 7); x.fill(); x.fillStyle = '#c8e8a0'; x.beginPath(); x.ellipse(590, 208, 140, 32, 0, 0, 7); x.fill(); x.fillStyle = '#a8d080'; x.beginPath(); x.ellipse(590, 212, 120, 22, 0, 0, 7); x.fill();
  x.fillStyle = '#c8e8a0'; x.beginPath(); x.ellipse(200, 372, 180, 40, 0, 0, 7); x.fill(); x.fillStyle = '#a8d080'; x.beginPath(); x.ellipse(200, 376, 150, 26, 0, 0, 7); x.fill();
  const intro = Math.min(1, (t - BT.t0) / .9);
  // rival
  const f = foe();
  if (BT.trainerShown && BT.T && BT.T.look) { const sheet = personSheet(BT.T.look); x.imageSmoothingEnabled = false; x.drawImage(sheet, 0, 0, 16, 24, 590 - 48 + (1 - intro) * 300, 214 - 150, 96, 144); }
  else if (f) {
    let fx = 590 + (1 - intro) * 320 + sh, fy = 214, sc = 3, al = 1; const lg = BT.anim.lunge0, ht = BT.anim.hit0;
    if (lg && t - lg < .3) fx -= Math.sin((t - lg) / .3 * Math.PI) * 40;
    if (BT.anim.foeFaint) { const e = Math.min(1, (t - BT.anim.foeFaint) / .5); fy += e * 80; al = 1 - e; }
    if (BT.anim.caught && BT.ball && BT.ball.phase !== 'fly') { al = 0; } else if (BT.anim.caught) { const e = Math.min(1, (t - BT.anim.caught) / .4); sc *= 1 - e; al = 1 - e; }
    const vis = !(ht && t - ht < .45 && ((t - ht) * 16 | 0) % 2 === 0);
    const bob = Math.sin(t * 2.4) * 2;
    if (vis && al > 0) { x.save(); x.globalAlpha = al; x.imageSmoothingEnabled = false; const s = monSprite(f.id); x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.ellipse(fx, fy - 2, 56 * sc / 3, 12, 0, 0, 7); x.fill(); x.drawImage(s, fx - 33 * sc, fy - 64 * sc + bob, 66 * sc, 66 * sc * (1 + Math.sin(t * 2.4) * .012)); x.restore(); }
    statFx(x, 0, fx, fy - 100);
  }
  // gomina
  if (BT.ball) { const b = BT.ball, e = Math.min(1, (t - b.t) / .6); let bx = lerp(140, 590, e), by = lerp(330, 170, e) - Math.sin(e * Math.PI) * 140; if (b.phase !== 'fly') { bx = 590; by = 186; }
    let rot = b.phase === 'fly' ? e * 12 : 0; if (b.phase === 'wob' && b.wob && t - b.wob < .5) rot = Math.sin((t - b.wob) * 20) * .4;
    x.save(); x.translate(bx, by); x.rotate(rot); drawItemIcon(x, ITEMS[b.id], 0, 0); x.restore(); if (b.phase === 'ok') for (let i = 0; i < 3; i++) { x.fillStyle = '#ffe14a'; x.beginPath(); x.arc(bx - 30 + i * 30, by - 50 - Math.abs(Math.sin(t * 4 + i)) * 10, 5, 0, 7); x.fill(); } }
  // propio
  const m = mine();
  if (m && (BT.anim.mineIn || intro >= 1)) {
    let mx = 200 - (1 - Math.min(1, BT.anim.mineIn ? (t - (BT.anim.mineIn === 1 ? BT.t0 + .9 : BT.anim.mineIn)) / .4 : 1)) * 300 + sh * .6, my = 380, al = 1; const lg = BT.anim.lunge1, ht = BT.anim.hit1;
    if (lg && t - lg < .3) mx += Math.sin((t - lg) / .3 * Math.PI) * 40;
    if (BT.anim.mineFaint) { const e = Math.min(1, (t - BT.anim.mineFaint) / .5); my += e * 90; al = 1 - e; }
    const vis = !(ht && t - ht < .45 && ((t - ht) * 16 | 0) % 2 === 0);
    if (vis && al > 0) { x.save(); x.globalAlpha = al; x.imageSmoothingEnabled = false; const s = monSprite(m.id, true), sc = 3.8; x.drawImage(s, mx - 33 * sc, my - 62 * sc + Math.sin(t * 2.4 + 1) * 2, 66 * sc, 66 * sc); x.restore(); }
    statFx(x, 1, mx, my - 120);
  }
  // cajas de PS
  if (f && !(BT.trainerShown && BT.T) && !BT.anim.foeFaint && !(BT.ball && BT.ball.phase !== 'fly')) { panel(x, 20, 20, 350, 88, { bg: '#fdfcf8', r: 14 }); txt(x, BT.T ? monName(f) : SPECIES[f.id].n, 40, 54, { s: 23 }); txt(x, 'Nv.' + f.lvl, 352, 54, { s: 19, a: 'right', c: '#4a5a7a' }); txt(x, 'PS', 40, 85, { s: 15, c: '#e8a020' }); hpBar(x, 70, 74, 280, Math.max(0, BT.hp[0]) / f.mhp, 12); statusBadge(x, f.st, 300, 30); if (G.S.caught[f.id] && !BT.T) { x.fillStyle = '#3a8ad6'; x.beginPath(); x.roundRect(20 + 350 - 30, 92, 18, 12, 3); x.fill(); } }
  if (m && (intro >= 1) && !BT.anim.mineFaint) { const Y = 236; panel(x, 430, Y, 352, 110, { bg: '#fdfcf8', r: 14 }); txt(x, monName(m), 452, Y + 36, { s: 23 }); txt(x, 'Nv.' + m.lvl, 762, Y + 36, { s: 19, a: 'right', c: '#4a5a7a' }); txt(x, 'PS', 452, Y + 66, { s: 15, c: '#e8a020' }); hpBar(x, 482, Y + 55, 280, Math.max(0, BT.hp[1]) / m.mhp, 12); txt(x, `${Math.max(0, Math.round(BT.hp[1]))} / ${m.mhp}`, 762, Y + 92, { s: 19, a: 'right' }); statusBadge(x, m.st, 452, Y + 76);
    const nx = expFor(m.lvl + 1), pv = expFor(m.lvl); x.fillStyle = '#ddd'; x.fillRect(452, Y + 100, 310, 5); x.fillStyle = '#3a8ae0'; x.fillRect(452, Y + 100, 310 * clamp((m.exp - pv) / (nx - pv), 0, 1), 5); }
  // equipo del rival (bolitas)
  if (BT.T) { const n = BT.foes.length; for (let i = 0; i < n; i++) { x.fillStyle = BT.foes[i].hp > 0 ? '#3a8ad6' : '#888'; x.beginPath(); x.arc(30 + i * 22, 122, 7, 0, 7); x.fill(); } }
  if (G.shake > 0) G.shake = Math.max(0, G.shake - 1 / 60);
}
function statFx(x, side, cx, cy) { const a = BT.anim['stat' + side]; if (!a || G.t - a.t > .9) return; const e = (G.t - a.t) / .9; x.save(); x.globalAlpha = 1 - e; x.fillStyle = a.up ? '#e86a2a' : '#3a7ad6'; for (let i = 0; i < 6; i++) { const yy = cy + (a.up ? -1 : 1) * e * 60 + (i % 3) * 18, xx = cx - 50 + i * 20; x.beginPath(); x.moveTo(xx, yy + (a.up ? 10 : -10)); x.lineTo(xx + 8, yy); x.lineTo(xx + 16, yy + (a.up ? 10 : -10)); x.fill(); } x.restore(); }

Object.assign(window, { battle, wildBattle, drawBattle, levelUp, learnMove, checkEvolution, postBattleEvolutions, evolveScene, bsay, BTget: () => BT });
