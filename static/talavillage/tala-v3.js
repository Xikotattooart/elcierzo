'use strict';
/* =====================================================================
   TheTalaVillage · utilidades: azar, entrada (teclado + táctil), sonido
   ===================================================================== */
const TV = window.TV = {};
const W = 800, H = 480;              // resolución interna (píxel del mundo = 2 px)
const PX = 2;                        // escala del pixel-art
const TILE = 16;                     // tamaño de casilla del mundo (en píxeles de arte)

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const chance = p => Math.random() < p;
const sleep = ms => new Promise(r => setTimeout(r, ms));
// azar con semilla (para NPCs y decorado estables)
function srand(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function hash2(x, y, k = 0) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(k | 0, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function shade(hex, f) { // f<0 oscurece, f>0 aclara
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b | 0).toString(16).slice(1).replace(/^(.{6}).*/, '$1');
}
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }

/* ---------------- Entrada ---------------- */
const Input = TV.Input = {
  down: {}, hit: {}, rep: {}, t: {},
  map: { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    KeyZ: 'a', Space: 'a', Enter: 'a', KeyX: 'b', Backspace: 'b', KeyK: 'b', KeyJ: 'a', Escape: 'menu', KeyM: 'menu', KeyQ: 'menu', ShiftLeft: 'run', ShiftRight: 'run' },
  press(k) { if (!this.down[k]) { this.hit[k] = true; this.t[k] = performance.now(); } this.down[k] = true; Audio.unlock(); },
  release(k) { this.down[k] = false; },
  pressed(k) { const v = this.hit[k]; this.hit[k] = false; return !!v; },
  // repetición para menús (mantener pulsado)
  repeat(k) { if (this.pressed(k)) return true; if (!this.down[k]) return false; const d = performance.now() - this.t[k]; if (d > 380) { this.t[k] = performance.now() - 380 + 95; return true; } return false; },
  endFrame() { for (const k in this.hit) this.hit[k] = false; },
  clear() { this.hit = {}; },
  dir() { const d = this.down; if (d.up) return 'up'; if (d.down) return 'down'; if (d.left) return 'left'; if (d.right) return 'right'; return null; },
  tap: null, // {x,y} pulsación sobre la pantalla en coordenadas internas
};
addEventListener('keydown', e => { const k = Input.map[e.code]; if (k) { e.preventDefault(); if (!e.repeat) Input.press(k); } });
addEventListener('keyup', e => { const k = Input.map[e.code]; if (k) { e.preventDefault(); Input.release(k); } });
addEventListener('blur', () => { for (const k in Input.down) Input.down[k] = false; });

/* ---------------- Sonido (chiptune generado) ---------------- */
const Audio = TV.Audio = {
  ctx: null, master: null, on: true, music: null, musicName: '', vol: .5,
  unlock() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; } try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.gain.value = this.on ? this.vol : 0; this.master.connect(this.ctx.destination); if (this.pending) { const p = this.pending; this.pending = null; this.play(p); } } catch (e) { } },
  setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? this.vol : 0; },
  tone(f, d, type = 'square', v = .12, t0 = 0, slide = 0) {
    if (!this.ctx || !this.on) return; const c = this.ctx, t = c.currentTime + t0, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0008, t + d); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + d + .02);
  },
  noise(d, v = .1, t0 = 0, hp = 800) {
    if (!this.ctx || !this.on) return; const c = this.ctx, n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), a = b.getChannelData(0);
    for (let i = 0; i < n; i++) a[i] = Math.random() * 2 - 1; const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = c.createGain(), t = c.currentTime + t0; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  },
  sfx(n) {
    switch (n) {
      case 'blip': this.tone(880, .05, 'square', .06); break;
      case 'ok': this.tone(660, .06, 'square', .07); this.tone(990, .08, 'square', .07, .05); break;
      case 'back': this.tone(440, .07, 'square', .06, 0, -120); break;
      case 'bump': this.tone(110, .08, 'square', .08); break;
      case 'door': this.noise(.12, .08, 0, 300); this.tone(220, .12, 'triangle', .1, .05, -60); break;
      case 'hit': this.noise(.16, .18, 0, 400); this.tone(160, .12, 'square', .1, 0, -80); break;
      case 'super': this.noise(.22, .22, 0, 300); this.tone(300, .2, 'sawtooth', .1, 0, -200); break;
      case 'weak': this.noise(.1, .1, 0, 1500); break;
      case 'faint': this.tone(500, .5, 'square', .1, 0, -420); break;
      case 'throw': this.tone(300, .25, 'triangle', .12, 0, 500); break;
      case 'wobble': this.tone(200, .08, 'square', .08); this.tone(260, .08, 'square', .08, .09); break;
      case 'catch': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .14, 'square', .08, i * .1)); break;
      case 'heal': [523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, .16, 'triangle', .14, i * .13)); break;
      case 'level': [392, 523, 659, 784].forEach((f, i) => this.tone(f, .12, 'square', .08, i * .08)); break;
      case 'item': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, .14, 'square', .07, i * .09)); break;
      case 'encounter': for (let i = 0; i < 6; i++) this.tone(i % 2 ? 440 : 330, .07, 'square', .08, i * .07); break;
      case 'stat': this.tone(400, .25, 'triangle', .1, 0, 300); break;
      case 'statdown': this.tone(700, .25, 'triangle', .1, 0, -400); break;
      case 'evo': for (let i = 0; i < 10; i++) this.tone(400 + i * 60, .1, 'triangle', .08, i * .09); break;
      case 'save': [659, 880, 1319].forEach((f, i) => this.tone(f, .1, 'square', .06, i * .07)); break;
      case 'run': this.tone(300, .3, 'triangle', .08, 0, 400); break;
      case 'surprise': this.tone(880, .08, 'square', .08); this.tone(1320, .14, 'square', .08, .07); break;
    }
  },
  /* música: patrones de notas (semitonos sobre A4, '.' = silencio); cada canción = melodía + bajo + percusión */
  songs: {},
  play(name) {
    if (!this.ctx) { this.pending = name; return; }
    if (this.musicName === name) return; this.stop(); this.musicName = name; const S = this.songs[name]; if (!S) return;
    const c = this.ctx, step = 60 / S.bpm / 2; let i = 0, next = c.currentTime + .05; const len = S.mel.length;
    const tick = () => {
      while (next < c.currentTime + .25) {
        const idx = i % len, note = S.mel[idx], bass = S.bass[idx % S.bass.length], dr = S.drum ? S.drum[idx % S.drum.length] : '.';
        if (this.on) {
          if (note !== null && note !== undefined) this.toneAt(440 * Math.pow(2, note / 12), step * .9, S.lead || 'square', .045, next);
          if (bass !== null && bass !== undefined) this.toneAt(110 * Math.pow(2, bass / 12), step * .95, 'triangle', .11, next);
          if (dr === 'k') this.kickAt(next); else if (dr === 'h') this.hatAt(next); else if (dr === 's') this.snareAt(next);
        }
        next += step; i++; if (!S.loop && i >= len) { this.stop(); return; }
      }
    };
    this.music = setInterval(tick, 60); tick();
  },
  stop() { if (this.music) clearInterval(this.music); this.music = null; this.musicName = ''; },
  toneAt(f, d, type, v, t) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + d * .7); g.gain.exponentialRampToValueAtTime(.0005, t + d); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + d + .02); },
  kickAt(t) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + .12); g.gain.setValueAtTime(.18, t); g.gain.exponentialRampToValueAtTime(.001, t + .14); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + .15); },
  hatAt(t) { const c = this.ctx; if (!this._nb) { const n = c.sampleRate * .05 | 0; this._nb = c.createBuffer(1, n, c.sampleRate); const a = this._nb.getChannelData(0); for (let i = 0; i < n; i++) a[i] = Math.random() * 2 - 1; } const s = c.createBufferSource(); s.buffer = this._nb; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000; const g = c.createGain(); g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.001, t + .04); s.connect(f); f.connect(g); g.connect(this.master); s.start(t); },
  snareAt(t) { const c = this.ctx; if (!this._nb) this.hatAt(t); const s = c.createBufferSource(); s.buffer = this._nb; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; const g = c.createGain(); g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + .09); s.connect(f); f.connect(g); g.connect(this.master); s.start(t); },
};
// Notación compacta: "0 2 4 . 7" → semitonos (relativos a A4 para melodía, A2 para bajo); '-' alarga la nota anterior
function seq(s) { return s.trim().split(/\s+/).map(t => t === '.' || t === '-' ? null : +t); }
// tonos en la escala: C=−9, D=−7, E=−5, F=−4, G=−2, A=0, B=2, C5=3, D5=5, E5=7, F5=8, G5=10, A5=12
Audio.songs.pueblo = { bpm: 112, loop: 1, lead: 'square',
  mel: seq(`3 . 7 . 10 . 7 . 8 . 7 5 3 . . . 5 . 8 . 12 . 10 8 7 . 5 . 3 . . . 3 . 7 . 10 . 12 . 15 . 12 10 8 . 7 . 5 . 7 . 8 . 7 5 3 . 2 . 3 . . . . .`),
  bass: seq(`-9 . -9 . -2 . -2 . -4 . -4 . -9 . -9 . -7 . -7 . -4 . -4 . -2 . -2 . -9 . -9 . -9 . -9 . -2 . -2 . -4 . -4 . -2 . -2 . -7 . -7 . -2 . -2 . -9 . -9 . -9 . -9 .`),
  drum: 'k.h.s.h.k.h.s.hh'.split('') };
Audio.songs.ruta = { bpm: 132, loop: 1, lead: 'square',
  mel: seq(`7 . 7 10 12 . 10 7 5 . 3 5 7 . . . 8 . 8 7 5 . 3 5 7 . 5 3 2 . . . 7 . 7 10 12 . 15 12 10 . 8 10 12 . . . 15 . 14 12 10 . 8 7 5 . 7 8 7 . . .`),
  bass: seq(`-9 . -2 . -9 . -2 . -4 . 3 . -4 . 3 . -7 . 0 . -7 . 0 . -2 . 5 . -2 . 5 . -9 . -2 . -9 . -2 . -4 . 3 . -4 . 3 . -7 . 0 . -2 . 5 . -9 . -2 . -9 . . .`),
  drum: 'k.hsk.hsk.hskhhs'.split('') };
Audio.songs.combate = { bpm: 168, loop: 1, lead: 'sawtooth',
  mel: seq(`0 0 3 0 5 0 7 6 5 3 0 3 5 . 7 . 0 0 3 0 5 0 8 7 5 3 7 . 12 . 10 . 12 12 10 8 7 8 10 7 5 7 8 5 3 5 7 . 0 0 3 0 5 0 7 6 5 3 2 3 0 . . .`),
  bass: seq(`-12 -12 -12 -12 -9 -9 -9 -9 -7 -7 -7 -7 -5 -5 -5 -5 -12 -12 -12 -12 -9 -9 -9 -9 -4 -4 -4 -4 -2 -2 -2 -2`),
  drum: 'k.hsk.hskkhsk.hs'.split('') };
Audio.songs.maestro = { bpm: 176, loop: 1, lead: 'sawtooth',
  mel: seq(`12 . 10 12 15 . 12 10 8 . 7 8 10 . 7 . 12 . 10 12 17 . 15 12 10 . 12 15 19 . . . 17 15 14 15 12 . 10 12 8 . 7 8 10 . 12 . 15 . 14 12 10 . 8 7 5 . 7 8 7 . . .`),
  bass: seq(`-12 . -12 . -9 . -9 . -7 . -7 . -5 . -5 . -12 . -12 . -9 . -9 . -4 . -4 . -2 . -2 .`),
  drum: 'kkhskkhskkhskhss'.split('') };
Audio.songs.casa = { bpm: 96, loop: 1, lead: 'triangle',
  mel: seq(`7 . 10 . 12 . 10 . 7 . 5 . 3 . . . 5 . 7 . 8 . 7 . 5 . 3 . 2 . . . 7 . 10 . 12 . 15 . 14 . 12 . 10 . . . 8 . 7 . 5 . 3 . 2 . 3 . . . . .`),
  bass: seq(`-9 . . . -2 . . . -4 . . . -9 . . . -7 . . . -4 . . . -2 . . . -9 . . .`),
  drum: 'k...h...k...h...'.split('') };
Audio.songs.victoria = { bpm: 150, loop: 0, lead: 'square',
  mel: seq(`3 7 10 15 . 15 . 15 14 12 14 15 . . . .`), bass: seq(`-9 . -2 . -4 . -2 . -9 . . . . . . .`), drum: 'k.h.k.h.k.h.s...'.split('') };
Audio.songs.leyenda = { bpm: 120, loop: 1, lead: 'sawtooth',
  mel: seq(`0 . 3 . 7 . 6 . 0 . 3 . 8 . 7 . 0 . 3 . 7 . 10 . 12 . 10 . 8 . 7 . 3 . 6 . 7 . . .`),
  bass: seq(`-12 . . . -12 . . . -11 . . . -11 . . .`), drum: 'k...s...k.k.s...'.split('') };

Object.assign(window, { W, H, PX, TILE, clamp, lerp, rnd, irnd, pick, chance, sleep, srand, hash2, shade, mkCanvas, Input, Audio, seq });

'use strict';
/* =====================================================================
   TheTalaVillage · datos: tipos, ataques, objetos
   ===================================================================== */
const TYPES = {
  NORMAL: { n: 'Normal', c: '#a8a77a' }, FUEGO: { n: 'Fuego', c: '#ee8130' }, AGUA: { n: 'Agua', c: '#6390f0' }, PLANTA: { n: 'Planta', c: '#7ac74c' },
  VIENTO: { n: 'Cierzo', c: '#89c8e8' }, ROCA: { n: 'Roca', c: '#b6a136' }, TIERRA: { n: 'Tierra', c: '#c9a05a' }, BICHO: { n: 'Bicho', c: '#a6b91a' },
  HIELO: { n: 'Hielo', c: '#96d9d6' }, ELEC: { n: 'Eléctrico', c: '#f7d02c' }, LUCHA: { n: 'Lucha', c: '#c22e28' }, FANTASMA: { n: 'Fantasma', c: '#735797' },
  METAL: { n: 'Metal', c: '#9aa6b8' }, TINTA: { n: 'Tinta', c: '#3b3b58' },
};
// eficacia: CHART[atacante][defensor] (por defecto 1)
const CHART = {};
(function () {
  const S = (a, list, v) => list.split(' ').forEach(d => { (CHART[a] = CHART[a] || {})[d] = v; });
  S('NORMAL', 'ROCA METAL', .5); S('NORMAL', 'FANTASMA', 0);
  S('FUEGO', 'PLANTA BICHO HIELO METAL', 2); S('FUEGO', 'FUEGO AGUA ROCA', .5);
  S('AGUA', 'FUEGO ROCA TIERRA', 2); S('AGUA', 'AGUA PLANTA', .5);
  S('PLANTA', 'AGUA ROCA TIERRA', 2); S('PLANTA', 'FUEGO PLANTA BICHO VIENTO METAL', .5);
  S('VIENTO', 'PLANTA BICHO LUCHA', 2); S('VIENTO', 'ROCA ELEC METAL', .5);
  S('ROCA', 'FUEGO VIENTO BICHO HIELO', 2); S('ROCA', 'LUCHA TIERRA METAL', .5);
  S('TIERRA', 'FUEGO ROCA ELEC METAL', 2); S('TIERRA', 'PLANTA BICHO', .5); S('TIERRA', 'VIENTO', 0);
  S('BICHO', 'PLANTA TINTA', 2); S('BICHO', 'FUEGO VIENTO LUCHA FANTASMA METAL', .5);
  S('HIELO', 'PLANTA VIENTO TIERRA', 2); S('HIELO', 'FUEGO AGUA HIELO METAL', .5);
  S('ELEC', 'AGUA VIENTO', 2); S('ELEC', 'PLANTA ELEC', .5); S('ELEC', 'TIERRA', 0);
  S('LUCHA', 'NORMAL ROCA HIELO METAL TINTA', 2); S('LUCHA', 'VIENTO BICHO', .5); S('LUCHA', 'FANTASMA', 0);
  S('FANTASMA', 'FANTASMA', 2); S('FANTASMA', 'TINTA', .5); S('FANTASMA', 'NORMAL', 0);
  S('METAL', 'ROCA HIELO', 2); S('METAL', 'FUEGO AGUA ELEC METAL', .5);
  S('TINTA', 'FANTASMA LUCHA', 2); S('TINTA', 'TINTA METAL', .5);
})();
function typeEff(at, defTypes) { let m = 1; for (const d of defTypes) { const v = CHART[at] && CHART[at][d]; if (v !== undefined) m *= v; } return m; }

/* Ataques: t=tipo, c=categoría (f=física, e=especial, s=estado), p=potencia, a=precisión, pp
   ef: efecto extra → {st:'quem'|'vene'|'para'|'dorm', ch:prob}, {stat:'atk'|'def'|'esp'|'vel'|'acc', to:'yo'|'rival', n:±k, ch}, drain, recoil, crit, prio, heal, flinch */
const MOVES = {
  placaje: { n: 'Placaje', t: 'NORMAL', c: 'f', p: 40, a: 100, pp: 35, d: 'Embiste con todo el cuerpo.' },
  aranazo: { n: 'Arañazo', t: 'NORMAL', c: 'f', p: 40, a: 100, pp: 35, d: 'Araña con uñas afiladas.' },
  grunido: { n: 'Gruñido', t: 'NORMAL', c: 's', a: 100, pp: 40, ef: { stat: 'atk', to: 'rival', n: -1 }, d: 'Gruñe con mala cara y baja el Ataque rival.' },
  latigo: { n: 'Látigo', t: 'NORMAL', c: 's', a: 100, pp: 30, ef: { stat: 'def', to: 'rival', n: -1 }, d: 'Mueve la cola con gracia y baja la Defensa rival.' },
  rapido: { n: 'Ataque Rápido', t: 'NORMAL', c: 'f', p: 40, a: 100, pp: 30, ef: { prio: 1 }, d: 'Ataca siempre primero.' },
  golpecuerpo: { n: 'Golpe Cuerpo', t: 'NORMAL', c: 'f', p: 85, a: 100, pp: 15, ef: { st: 'para', ch: .3 }, d: 'Se lanza con todo su peso. Puede paralizar.' },
  derribo: { n: 'Derribo', t: 'NORMAL', c: 'f', p: 90, a: 85, pp: 20, ef: { recoil: .25 }, d: 'Placaje bestia. El usuario también se hace daño.' },
  rapado: { n: 'Rapado', t: 'NORMAL', c: 'f', p: 70, a: 100, pp: 20, ef: { crit: 1 }, d: 'Un corte de pelo al cero, rápido y certero. Golpes críticos frecuentes.' },
  chillido: { n: 'Chillido', t: 'NORMAL', c: 's', a: 85, pp: 40, ef: { stat: 'def', to: 'rival', n: -2 }, d: 'Un grito que pone los pelos de punta. Baja mucho la Defensa.' },
  siesta: { n: 'Siesta', t: 'NORMAL', c: 's', a: 101, pp: 10, ef: { siesta: 1 }, d: 'Una siesta española: duerme 2 turnos y recupera todo.' },
  hiperrayo: { n: 'Hipergolpe', t: 'NORMAL', c: 'e', p: 120, a: 90, pp: 5, d: 'Un ataque brutal y agotador.' },
  piropo: { n: 'Piropo', t: 'NORMAL', c: 's', a: 100, pp: 20, ef: { stat: 'atk', to: 'rival', n: -2 }, d: 'Un piropo tan majo que el rival se ablanda. Baja mucho su Ataque.' },

  ascuas: { n: 'Ascuas', t: 'FUEGO', c: 'e', p: 40, a: 100, pp: 25, ef: { st: 'quem', ch: .1 }, d: 'Brasas del horno. Puede quemar.' },
  barraardiente: { n: 'Barra Ardiente', t: 'FUEGO', c: 'f', p: 65, a: 95, pp: 20, ef: { st: 'quem', ch: .1 }, d: 'Golpe con una barra de pan recién salida del horno.' },
  lanzallamas: { n: 'Lanzallamas', t: 'FUEGO', c: 'e', p: 90, a: 100, pp: 15, ef: { st: 'quem', ch: .1 }, d: 'Una gran llamarada.' },
  hornoinfernal: { n: 'Horno Infernal', t: 'FUEGO', c: 'e', p: 110, a: 85, pp: 5, ef: { st: 'quem', ch: .3 }, d: 'Abre las puertas del horno de leña. Quema muchísimo.' },
  calentar: { n: 'Precalentar', t: 'FUEGO', c: 's', a: 101, pp: 20, ef: { stat: 'esp', to: 'yo', n: 2 }, d: 'Precalienta el horno: sube mucho el Especial.' },

  pistolaagua: { n: 'Pistola Agua', t: 'AGUA', c: 'e', p: 40, a: 100, pp: 25, d: 'Un chorro de agua del arroyo.' },
  burbuja: { n: 'Burbuja', t: 'AGUA', c: 'e', p: 40, a: 100, pp: 30, ef: { stat: 'vel', to: 'rival', n: -1, ch: .1 }, d: 'Lanza burbujas. Puede bajar la Velocidad.' },
  chapuzon: { n: 'Chapuzón', t: 'AGUA', c: 'f', p: 65, a: 100, pp: 20, d: 'Se tira de cabeza como en la piscina municipal.' },
  hidrobomba: { n: 'Hidrobomba', t: 'AGUA', c: 'e', p: 110, a: 80, pp: 5, d: 'Agua a presión. Muy potente pero falla a veces.' },
  riego: { n: 'Riego', t: 'AGUA', c: 's', a: 101, pp: 10, ef: { heal: .5 }, d: 'Se riega a sí mismo como una lechuga. Recupera la mitad de PS.' },
  surf: { n: 'Riada', t: 'AGUA', c: 'e', p: 90, a: 100, pp: 15, d: 'Una crecida del arroyo arrasa al rival.' },

  latigocepa: { n: 'Látigo Cepa', t: 'PLANTA', c: 'f', p: 45, a: 100, pp: 25, d: 'Azota con ramitas.' },
  absorber: { n: 'Absorber', t: 'PLANTA', c: 'e', p: 30, a: 100, pp: 25, ef: { drain: .5 }, d: 'Roba nutrientes. Recupera PS.' },
  pinazo: { n: 'Piñazo', t: 'PLANTA', c: 'f', p: 65, a: 95, pp: 20, d: 'Lanza una piña de pino con mucha puntería.' },
  megaagotar: { n: 'Megaagotar', t: 'PLANTA', c: 'e', p: 70, a: 100, pp: 15, ef: { drain: .5 }, d: 'Absorbe mucha energía. Recupera PS.' },
  solanera: { n: 'Solanera', t: 'PLANTA', c: 'e', p: 110, a: 90, pp: 5, d: 'El sol de agosto en los huertos, concentrado en un rayo.' },
  somnifero: { n: 'Somnífero', t: 'PLANTA', c: 's', a: 75, pp: 15, ef: { st: 'dorm', ch: 1 }, d: 'Polvo de tila que duerme al rival.' },
  pinar: { n: 'Pinar Salvaje', t: 'PLANTA', c: 'f', p: 95, a: 100, pp: 10, d: 'Un bosque de pinos aplasta al rival.' },

  rafaga: { n: 'Ráfaga', t: 'VIENTO', c: 'e', p: 40, a: 100, pp: 35, d: 'Un golpe de aire.' },
  corriente: { n: 'Corriente', t: 'VIENTO', c: 'e', p: 60, a: 100, pp: 25, d: 'Una corriente que se cuela por todas las rendijas.' },
  cierzo: { n: 'Cierzo', t: 'VIENTO', c: 'e', p: 80, a: 100, pp: 15, ef: { stat: 'vel', to: 'rival', n: -1, ch: .3 }, d: 'El viento más frío de la Serranía. Puede bajar la Velocidad.' },
  vendaval: { n: 'Vendaval', t: 'VIENTO', c: 'e', p: 100, a: 85, pp: 10, d: 'Arranca tejas y peinados.' },
  agilidad: { n: 'Agilidad', t: 'VIENTO', c: 's', a: 101, pp: 30, ef: { stat: 'vel', to: 'yo', n: 2 }, d: 'Se vuelve ligero como el viento. Sube mucho la Velocidad.' },
  picotazo: { n: 'Picotazo', t: 'VIENTO', c: 'f', p: 35, a: 100, pp: 35, d: 'Pica con el pico.' },
  aleteo: { n: 'Aleteo', t: 'VIENTO', c: 'f', p: 60, a: 100, pp: 20, d: 'Golpea con las alas.' },

  lanzarrocas: { n: 'Lanzarrocas', t: 'ROCA', c: 'f', p: 50, a: 90, pp: 15, d: 'Tira piedras de rodeno.' },
  penazo: { n: 'Peñazo', t: 'ROCA', c: 'f', p: 80, a: 95, pp: 15, d: 'Se deja caer como una peña de la sierra.' },
  avalancha: { n: 'Avalancha', t: 'ROCA', c: 'f', p: 100, a: 85, pp: 10, ef: { flinch: .3 }, d: 'Un alud de rocas. Puede hacer retroceder.' },
  endurecer: { n: 'Endurecer', t: 'ROCA', c: 's', a: 101, pp: 30, ef: { stat: 'def', to: 'yo', n: 1 }, d: 'Se pone duro como el rodeno. Sube la Defensa.' },

  bofetonlodo: { n: 'Bofetón Lodo', t: 'TIERRA', c: 'e', p: 25, a: 100, pp: 10, ef: { stat: 'acc', to: 'rival', n: -1 }, d: 'Barro a la cara. Baja la Precisión.' },
  terronazo: { n: 'Terronazo', t: 'TIERRA', c: 'f', p: 60, a: 95, pp: 20, d: 'Un terrón de la huerta bien lanzado.' },
  excavar: { n: 'Excavar', t: 'TIERRA', c: 'f', p: 80, a: 100, pp: 10, d: 'Cava y sale por debajo del rival.' },
  terremoto: { n: 'Terremoto', t: 'TIERRA', c: 'f', p: 100, a: 100, pp: 10, d: 'Hace temblar todo el pueblo.' },
  arena: { n: 'Polvareda', t: 'TIERRA', c: 's', a: 100, pp: 15, ef: { stat: 'acc', to: 'rival', n: -1 }, d: 'Levanta polvo del camino. Baja la Precisión.' },

  picadura: { n: 'Picadura', t: 'BICHO', c: 'f', p: 60, a: 100, pp: 20, d: 'Pica como un mosquito en verano.' },
  zumbido: { n: 'Zumbido', t: 'BICHO', c: 'e', p: 70, a: 100, pp: 15, d: 'Un zumbido insoportable a medianoche.' },
  aguijon: { n: 'Aguijón', t: 'BICHO', c: 'f', p: 40, a: 100, pp: 30, ef: { st: 'vene', ch: .3 }, d: 'Pica con un aguijón. Puede envenenar.' },
  pinza: { n: 'Pinza', t: 'BICHO', c: 'f', p: 85, a: 100, pp: 15, d: 'Atrapa con pinzas enormes.' },
  polvoveneno: { n: 'Polvo Veneno', t: 'BICHO', c: 's', a: 75, pp: 35, ef: { st: 'vene', ch: 1 }, d: 'Esparce polvo que envenena.' },

  escarcha: { n: 'Escarcha', t: 'HIELO', c: 'e', p: 40, a: 100, pp: 25, d: 'La escarcha de las mañanas de enero.' },
  helada: { n: 'Helada', t: 'HIELO', c: 'e', p: 65, a: 95, pp: 20, ef: { stat: 'vel', to: 'rival', n: -1, ch: .3 }, d: 'Una helada de las de Talayuelas. Puede bajar la Velocidad.' },
  rayohielo: { n: 'Rayo Hielo', t: 'HIELO', c: 'e', p: 90, a: 100, pp: 10, d: 'Un rayo congelado.' },
  ventisca: { n: 'Ventisca', t: 'HIELO', c: 'e', p: 110, a: 70, pp: 5, d: 'Nieve y cierzo a la vez. Brutal.' },

  impactrueno: { n: 'Chispa', t: 'ELEC', c: 'e', p: 40, a: 100, pp: 30, ef: { st: 'para', ch: .1 }, d: 'Una chispita. Puede paralizar.' },
  chispazo: { n: 'Chispazo', t: 'ELEC', c: 'f', p: 65, a: 100, pp: 20, ef: { st: 'para', ch: .3 }, d: 'Descarga de farola. Puede paralizar.' },
  rayo: { n: 'Rayo', t: 'ELEC', c: 'e', p: 90, a: 100, pp: 15, ef: { st: 'para', ch: .1 }, d: 'Un rayo de tormenta de verano.' },
  ondatrueno: { n: 'Onda Trueno', t: 'ELEC', c: 's', a: 90, pp: 20, ef: { st: 'para', ch: 1 }, d: 'Paraliza al rival.' },
  apagon: { n: 'Apagón', t: 'ELEC', c: 'e', p: 110, a: 85, pp: 5, d: 'Se va la luz en todo el pueblo.' },

  patada: { n: 'Patada', t: 'LUCHA', c: 'f', p: 40, a: 100, pp: 35, d: 'Una patada de fútbol sala.' },
  punetazo: { n: 'Puñetazo', t: 'LUCHA', c: 'f', p: 60, a: 100, pp: 20, d: 'Un puñetazo sin miramientos.' },
  llave: { n: 'Llave', t: 'LUCHA', c: 'f', p: 75, a: 100, pp: 15, d: 'Una llave de lucha libre.' },
  embestida: { n: 'Embestida Brava', t: 'LUCHA', c: 'f', p: 110, a: 90, pp: 5, ef: { recoil: .25 }, d: 'Una embestida a lo bravo. El usuario se hace daño.' },
  musculitos: { n: 'Musculitos', t: 'LUCHA', c: 's', a: 101, pp: 20, ef: { stat: 'atk', to: 'yo', n: 1, also: { stat: 'def', n: 1 } }, d: 'Saca bíceps: sube Ataque y Defensa.' },

  lenguetazo: { n: 'Lengüetazo', t: 'FANTASMA', c: 'f', p: 30, a: 100, pp: 30, ef: { st: 'para', ch: .3 }, d: 'Un lametón frío. Puede paralizar.' },
  susto: { n: 'Susto', t: 'FANTASMA', c: 's', a: 100, pp: 15, ef: { stat: 'atk', to: 'rival', n: -2 }, d: '¡BU! Baja mucho el Ataque rival.' },
  bolasombra: { n: 'Bola Sombra', t: 'FANTASMA', c: 'e', p: 80, a: 100, pp: 15, d: 'Una bola de sombras.' },
  pesadilla: { n: 'Pesadilla', t: 'FANTASMA', c: 's', a: 70, pp: 15, ef: { st: 'dorm', ch: 1 }, d: 'Duerme al rival con una historia de miedo.' },
  leyenda: { n: 'Leyenda Negra', t: 'FANTASMA', c: 'e', p: 110, a: 85, pp: 5, d: 'Cuenta la leyenda del pueblo... y el rival se desmaya.' },

  tijeretazo: { n: 'Tijeretazo', t: 'METAL', c: 'f', p: 60, a: 100, pp: 25, ef: { crit: 1 }, d: 'Corte de tijera de barbero. Críticos frecuentes.' },
  garrametal: { n: 'Garra Metal', t: 'METAL', c: 'f', p: 55, a: 95, pp: 30, ef: { stat: 'atk', to: 'yo', n: 1, ch: .2 }, d: 'Puede subir el Ataque.' },
  afeitado: { n: 'Afeitado Apurado', t: 'METAL', c: 'f', p: 90, a: 100, pp: 15, d: 'Un afeitado a navaja tan apurado que duele.' },
  peinado: { n: 'Peinado Perfecto', t: 'METAL', c: 's', a: 101, pp: 20, ef: { stat: 'def', to: 'yo', n: 1, also: { stat: 'esp', n: 1 } }, d: 'Se peina con gomina: sube Defensa y Especial.' },
  cabezahierro: { n: 'Cabeza Hierro', t: 'METAL', c: 'f', p: 80, a: 100, pp: 15, ef: { flinch: .3 }, d: 'Un cabezazo de hierro.' },

  mancha: { n: 'Mancha', t: 'TINTA', c: 'e', p: 40, a: 100, pp: 25, ef: { stat: 'acc', to: 'rival', n: -1, ch: .3 }, d: 'Salpica tinta a los ojos.' },
  tatuaje: { n: 'Tatuaje', t: 'TINTA', c: 'e', p: 65, a: 100, pp: 20, ef: { stat: 'def', to: 'rival', n: -1, ch: .3 }, d: 'Tatúa al rival un dibujo humillante. Puede bajar su Defensa.' },
  tintanegra: { n: 'Tinta Negra', t: 'TINTA', c: 'e', p: 85, a: 100, pp: 15, d: 'Un chorro de tinta negra de tatuar.' },
  obramaestra: { n: 'Obra Maestra', t: 'TINTA', c: 'e', p: 110, a: 85, pp: 5, d: 'Un tatuaje de cuerpo entero en un solo turno.' },
  repaso: { n: 'Repaso', t: 'TINTA', c: 'f', p: 50, a: 100, pp: 25, ef: { drain: .5 }, d: 'Repasa las líneas y se queda con la energía.' },
};
for (const k in MOVES) MOVES[k].id = k;

/* Objetos */
const ITEMS = {
  gomina: { n: 'Gomina', k: 'ball', ball: 1, price: 200, d: 'Un bote de gomina. Si lo lanzas a un Talamón salvaje débil, se queda pegado y lo atrapas.' },
  supergomina: { n: 'Supergomina', k: 'ball', ball: 1.5, price: 600, d: 'Gomina fijación fuerte. Atrapa mejor que la normal.' },
  hipergomina: { n: 'Hipergomina', k: 'ball', ball: 2, price: 1200, d: 'Gomina efecto mojado extremo. Muy eficaz.' },
  gominamaestra: { n: 'Gomina Maestra', k: 'ball', ball: 255, price: 0, d: 'La gomina secreta de El Cierzo. Nunca falla.' },
  locion: { n: 'Loción', k: 'heal', hp: 20, price: 300, d: 'Loción refrescante. Recupera 20 PS.' },
  aftershave: { n: 'After Shave', k: 'heal', hp: 60, price: 700, d: 'Escuece pero cura. Recupera 60 PS.' },
  balsamo: { n: 'Bálsamo Total', k: 'heal', hp: 999, price: 1500, d: 'Bálsamo para barba de lujo. Recupera todos los PS.' },
  remedio: { n: 'Remedio de la Abuela', k: 'status', price: 250, d: 'Manzanilla, miel y cariño. Cura cualquier problema de estado.' },
  peine: { n: 'Peine Mágico', k: 'revive', price: 1500, d: 'Un peine que levanta hasta a un Talamón debilitado. Recupera la mitad de PS.' },
  bizcocho: { n: 'Bizcocho de la Abuela', k: 'level', price: 0, d: 'Tan rico que el Talamón sube un nivel.' },
  colonia: { n: 'Colonia Fuerte', k: 'repel', steps: 120, price: 350, d: 'Huele tanto que los Talamones salvajes no se acercan durante 120 pasos.' },
  pan: { n: 'Pan del Horno', k: 'heal', hp: 40, price: 150, d: 'Pan de leña recién hecho. Recupera 40 PS.' },
  caramelo: { n: 'Caramelo PP', k: 'pp', price: 900, d: 'Recupera 10 PP de todos los ataques de un Talamón.' },
  // objetos clave
  talapedia: { n: 'Talapedia', k: 'key', d: 'Enciclopedia de Talamones que te dio Xiko.' },
  bici: { n: 'Bici del Abuelo', k: 'key', d: 'Una bici antigua pero rapidísima. Úsala desde el menú (o con el botón B para correr).' },
  pina: { n: 'Piña Sagrada', k: 'key', d: 'Una de las tres Piñas Sagradas de Las Peñas. Brilla con luz dorada.' },
  flotador: { n: 'Flotador', k: 'key', d: 'Un flotador de la piscina municipal. Te deja cruzar el agua profunda del arroyo.' },
  carta: { n: 'Carta de la Abuela', k: 'key', d: 'Una carta para Xiko, el de la barbería El Cierzo.' },
};
for (const k in ITEMS) ITEMS[k].id = k;

const STATUS = { quem: { n: 'QUE', c: '#e86a2a', t: 'quemado' }, vene: { n: 'ENV', c: '#9a4fc9', t: 'envenenado' }, para: { n: 'PAR', c: '#d6b21a', t: 'paralizado' }, dorm: { n: 'DOR', c: '#7d8a99', t: 'dormido' } };
const STATN = { atk: 'Ataque', def: 'Defensa', esp: 'Especial', vel: 'Velocidad', acc: 'Precisión' };

Object.assign(window, { TYPES, CHART, typeEff, MOVES, ITEMS, STATUS, STATN });

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

'use strict';
/* =====================================================================
   TheTalaVillage · Talamones (especies)
   b: [PS, Ataque, Defensa, Especial, Velocidad] · ex: experiencia que da · r: ratio de captura
   ev: [nivel, especie] · L: ataques por nivel "nivel:ataque ..."
   ===================================================================== */
const SPECIES = {};
let DEXN = 0;
function S(id, n, t, b, ex, r, ev, L, d, h, w) {
  SPECIES[id] = { id, num: ++DEXN, n, t, b: { hp: b[0], atk: b[1], def: b[2], esp: b[3], vel: b[4] }, ex, r, ev, L: L.trim().split(/\s+/).map(s => { const [l, m] = s.split(':'); return [+l, m]; }), d, h, w };
}
S('rodenin', 'Rodenín', ['ROCA', 'PLANTA'], [45, 52, 60, 42, 38], 64, 45, [16, 'rodenazo'], '1:placaje 1:grunido 5:endurecer 8:latigocepa 12:lanzarrocas 15:pinazo 19:absorber 23:penazo 28:megaagotar',
  'Una piedrecita de rodeno con un pino por tupé. Se peina cada mañana en El Cierzo y se pone de muy mal humor si alguien le despeina.', '0,4 m', '18 kg');
S('rodenazo', 'Rodenazo', ['ROCA', 'PLANTA'], [62, 72, 82, 56, 50], 142, 45, [34, 'penaskin'], '1:placaje 1:endurecer 1:latigocepa 16:pinazo 20:penazo 24:megaagotar 28:musculitos 31:avalancha 38:pinar',
  'Ya tiene dos pinos en la cabeza y un bigote que da envidia a medio pueblo. Dicen que se lo recorta Xiko en persona.', '1,0 m', '95 kg');
S('penaskin', 'Peñaskín', ['ROCA', 'PLANTA'], [82, 102, 108, 76, 62], 236, 45, null, '1:pinazo 1:penazo 1:musculitos 34:pinar 38:avalancha 44:terremoto 50:solanera',
  'Lleva tres pinos en la cabeza, igual que el escudo de Talayuelas. Su bigote es tan largo que en invierno lo usa de bufanda.', '1,9 m', '310 kg');
S('cierzin', 'Cierzín', ['VIENTO'], [42, 44, 40, 58, 62], 64, 45, [16, 'cierzote'], '1:rafaga 1:latigo 5:agilidad 9:escarcha 13:corriente 17:helada 22:cierzo 27:siesta',
  'Una nubecita del viento cierzo. Siempre tiene frío, por eso nunca se quita la bufanda. Si estornuda, se vuelan las sábanas tendidas.', '0,3 m', '0,5 kg');
S('cierzote', 'Cierzote', ['VIENTO', 'HIELO'], [58, 62, 56, 80, 82], 142, 45, [34, 'ventarron'], '1:rafaga 1:escarcha 1:agilidad 16:corriente 20:helada 25:cierzo 30:rayohielo 38:vendaval',
  'Le regalaron un gorro de lana y ya no se lo quita. Cuando pasa por la calle, la gente dice: «¡Cierra la puerta, que entra Cierzote!».', '1,1 m', '3 kg');
S('ventarron', 'Ventarrón', ['VIENTO', 'HIELO'], [80, 82, 74, 108, 102], 236, 45, null, '1:cierzo 1:helada 1:agilidad 34:vendaval 40:rayohielo 46:ventisca',
  'El viento más frío de la Serranía. Sopla tan fuerte que arranca tejas, peinados y hasta las ganas de salir de casa.', '2,0 m', '12 kg');
S('brasin', 'Brasín', ['FUEGO'], [44, 56, 42, 52, 52], 64, 45, [16, 'hogazo'], '1:aranazo 1:grunido 6:ascuas 10:rapido 14:barraardiente 19:calentar 23:lanzallamas 30:golpecuerpo',
  'Nació en el horno del pueblo. Huele a pan recién hecho y por eso todo el mundo intenta darle un mordisco.', '0,4 m', '4 kg');
S('hogazo', 'Hogazo', ['FUEGO'], [62, 80, 60, 70, 64], 142, 45, [34, 'hornazo'], '1:ascuas 1:rapido 1:barraardiente 16:calentar 21:lanzallamas 27:golpecuerpo 32:musculitos 40:hornoinfernal',
  'Una hogaza de pueblo con muy malas pulgas. Si lo dejas mucho rato al sol, se le tuesta la corteza y se pone aún más gruñón.', '1,0 m', '30 kg');
S('hornazo', 'Hornazo', ['FUEGO', 'ROCA'], [82, 106, 88, 102, 72], 236, 45, null, '1:lanzallamas 1:penazo 1:calentar 34:hornoinfernal 40:avalancha 46:terremoto',
  'Un horno de leña con patas. Cuando abre la boca sale un calor que te seca la ropa recién lavada en un segundo.', '2,2 m', '600 kg');
S('pardalito', 'Pardalito', ['NORMAL', 'VIENTO'], [40, 45, 38, 32, 56], 50, 255, [18, 'pardalon'], '1:picotazo 1:grunido 5:rapido 9:rafaga 13:chillido 18:aleteo 24:agilidad 30:corriente',
  'El gorrión de toda la vida. Se pasa el día en la Plaza España robando migas a los abuelos del banco.', '0,2 m', '0,1 kg');
S('pardalon', 'Pardalón', ['NORMAL', 'VIENTO'], [62, 68, 60, 52, 80], 120, 120, null, '1:picotazo 1:rapido 1:rafaga 18:aleteo 22:chillido 27:agilidad 33:corriente 40:vendaval',
  'Ha crecido tanto que ya no le roba migas a los abuelos: les roba el bocadillo entero.', '0,9 m', '9 kg');
S('ratolin', 'Ratolín', ['NORMAL'], [32, 56, 35, 25, 72], 52, 255, [20, 'ratonazo'], '1:placaje 1:latigo 5:rapido 10:aranazo 15:chillido 20:rapado 26:golpecuerpo',
  'Vive en los graneros. Le encanta el queso de la Serranía y se cuela en la carnicería cuando nadie mira.', '0,3 m', '2 kg');
S('ratonazo', 'Ratonazo', ['NORMAL'], [58, 82, 60, 50, 98], 116, 127, null, '1:placaje 1:rapido 1:aranazo 20:rapado 25:chillido 30:golpecuerpo 36:derribo',
  'Lleva una cinta en la cabeza porque se cree boxeador. Sus dientes pueden roer hasta la valla de la huerta.', '0,8 m', '18 kg');
S('lagartin', 'Lagartín', ['TIERRA'], [40, 50, 46, 36, 56], 58, 200, [22, 'lagartijon'], '1:placaje 1:arena 6:terronazo 11:rapido 16:bofetonlodo 22:excavar 30:terremoto',
  'Se pasa las tardes de verano tomando el sol en las tapias de las eras. Si le pisas la cola, se la deja y sale corriendo.', '0,3 m', '1 kg');
S('lagartijon', 'Lagartijón', ['TIERRA', 'ROCA'], [66, 82, 78, 56, 82], 135, 90, null, '1:terronazo 1:rapido 1:lanzarrocas 22:excavar 27:penazo 33:terremoto 40:avalancha',
  'Se compró unas gafas de sol en la feria y ya no se las quita ni de noche. Se cree el rey de las eras.', '1,4 m', '60 kg');
S('saltamontin', 'Saltamontín', ['BICHO'], [38, 46, 35, 30, 62], 50, 255, [20, 'langoston'], '1:placaje 1:chillido 6:picadura 11:patada 16:aguijon 20:pinza',
  'Salta tan alto entre las espigas que a veces aterriza en el tejado de la Plaza de Toros.', '0,3 m', '0,6 kg');
S('langoston', 'Langostón', ['BICHO', 'LUCHA'], [62, 88, 62, 46, 86], 130, 120, null, '1:patada 1:picadura 1:chillido 20:pinza 24:punetazo 30:musculitos 36:llave 42:embestida',
  'Entrena cada mañana en el Polideportivo con guantes de boxeo. Nadie sabe de dónde los ha sacado.', '1,2 m', '30 kg');
S('caracolin', 'Caracolín', ['BICHO', 'AGUA'], [45, 35, 66, 42, 20], 56, 200, [24, 'caracolazo'], '1:placaje 1:endurecer 6:burbuja 11:bofetonlodo 17:absorber 24:chapuzon 30:riego',
  'Sale después de las tormentas de verano. Los abuelos dicen que si ves tres seguidos, mañana vuelve a llover.', '0,2 m', '1 kg');
S('caracolazo', 'Caracolazo', ['BICHO', 'AGUA'], [72, 56, 108, 72, 30], 140, 75, null, '1:endurecer 1:burbuja 1:absorber 24:chapuzon 28:riego 34:surf 40:hidrobomba',
  'Su concha es una casa de pueblo de verdad, con tejado y todo. Hay una familia de Ratolines viviendo dentro de alquiler.', '1,0 m', '120 kg');
S('ranacuajo', 'Ranacuajo', ['AGUA'], [42, 46, 42, 46, 60], 56, 200, [22, 'ranota'], '1:burbuja 1:latigo 6:pistolaagua 11:bofetonlodo 16:chapuzon 22:surf 30:hidrobomba',
  'Vive en el Arroyo de Talayuelas. Por las noches de verano canta con sus amigos y no deja dormir a nadie.', '0,3 m', '2 kg');
S('ranota', 'Ranota', ['AGUA', 'TIERRA'], [78, 76, 72, 72, 70], 138, 90, null, '1:pistolaagua 1:bofetonlodo 1:chapuzon 22:excavar 26:surf 32:terremoto 38:hidrobomba',
  'Una rana enorme y perezosa. Pasa el día en el barro del arroyo con los ojos medio cerrados, pero si se enfada, salta como un muelle.', '1,1 m', '50 kg');
S('truchin', 'Truchín', ['AGUA'], [36, 52, 36, 40, 72], 54, 200, [25, 'truchazo'], '1:pistolaagua 1:rapido 8:burbuja 13:chapuzon 19:agilidad 25:surf',
  'Una truchita del arroyo. Es tan rápida que los pescadores del pueblo nunca la han pillado.', '0,3 m', '0,8 kg');
S('truchazo', 'Truchazo', ['AGUA'], [72, 88, 62, 72, 92], 140, 90, null, '1:pistolaagua 1:chapuzon 1:agilidad 25:surf 30:derribo 36:hidrobomba',
  'Salta por encima del puente del arroyo para presumir. Se dice que una vez se tragó una caña de pescar entera.', '1,3 m', '25 kg');
S('tomatito', 'Tomatito', ['PLANTA'], [42, 40, 46, 52, 40], 56, 190, [24, 'tomatazo'], '1:absorber 1:piropo 6:latigocepa 11:somnifero 16:megaagotar 22:riego 28:solanera',
  'El tomate más rico de los Huertos La Vega. Se pone colorado cuando le echan un piropo.', '0,3 m', '0,4 kg');
S('tomatazo', 'Tomatazo', ['PLANTA'], [74, 66, 72, 92, 56], 140, 75, null, '1:absorber 1:latigocepa 1:somnifero 24:megaagotar 28:riego 34:solanera 40:pinar',
  'Lleva el sombrero de paja del hortelano. En la Tomatina de agosto es el invitado de honor (y el más asustado).', '1,2 m', '20 kg');
S('calabacin', 'Calabacín', ['PLANTA'], [52, 56, 56, 36, 32], 56, 190, [26, 'calabazon'], '1:placaje 1:endurecer 8:latigocepa 14:golpecuerpo 20:pinazo 26:terronazo',
  'Se pasa el día medio dormido en la huerta. Crece tanto en verano que los vecinos ya no saben a quién regalarlo.', '0,6 m', '3 kg');
S('calabazon', 'Calabazón', ['PLANTA', 'FANTASMA'], [82, 86, 86, 66, 46], 142, 75, null, '1:latigocepa 1:golpecuerpo 1:susto 26:bolasombra 30:megaagotar 36:leyenda',
  'En la noche de difuntos se ilumina por dentro. Los niños le ponen velas y él se hace el muerto para asustarles.', '1,1 m', '40 kg');
S('ajete', 'Ajete', ['PLANTA'], [40, 48, 42, 48, 52], 54, 200, [22, 'ajazo'], '1:absorber 1:latigo 6:polvoveneno 11:latigocepa 16:megaagotar 20:musculitos',
  'Huele fortísimo. Los Talamones fantasma no se le acercan ni en pintura.', '0,2 m', '0,2 kg');
S('ajazo', 'Ajazo', ['PLANTA', 'LUCHA'], [66, 84, 62, 70, 72], 138, 90, null, '1:latigocepa 1:polvoveneno 1:musculitos 22:punetazo 26:megaagotar 32:llave 40:embestida',
  'Se cree un luchador y lleva una ristra de ajos como cinturón de campeón. Gana los combates por el olor.', '1,0 m', '15 kg');
S('michi', 'Michi', ['NORMAL'], [42, 50, 40, 42, 72], 56, 255, [24, 'michote'], '1:aranazo 1:grunido 5:rapido 10:chillido 15:piropo 20:rapado 26:golpecuerpo',
  'Un gato callejero que vive en los tejados del centro. Los vecinos le dan de comer y él se hace el interesante.', '0,4 m', '4 kg');
S('michote', 'Michote', ['NORMAL', 'TINTA'], [66, 82, 62, 68, 102], 135, 90, null, '1:aranazo 1:rapido 1:mancha 24:rapado 28:tatuaje 34:tintanegra 40:obramaestra',
  'Un gato negro tatuado. Dicen que fue el primer cliente de El Cierzo y que se hizo los tatuajes sin moverse ni un pelo.', '1,0 m', '20 kg');
S('chuchito', 'Chuchito', ['NORMAL'], [46, 52, 46, 36, 56], 56, 255, [26, 'perrazo'], '1:placaje 1:latigo 5:grunido 10:rapido 16:aranazo 22:golpecuerpo 28:derribo',
  'Un perrete muy cariñoso. Sigue a todo el que pasa por la calle Real esperando una caricia.', '0,4 m', '6 kg');
S('perrazo', 'Perrazo', ['NORMAL', 'LUCHA'], [82, 96, 78, 52, 76], 145, 90, null, '1:placaje 1:rapido 1:grunido 26:golpecuerpo 30:punetazo 36:derribo 42:embestida',
  'El mastín que cuida del ganado en la sierra. Parece fiero, pero se deshace si le rascas detrás de la oreja.', '1,3 m', '70 kg');
S('palomo', 'Palomo', ['NORMAL', 'VIENTO'], [52, 50, 52, 42, 60], 70, 200, null, '1:picotazo 5:chillido 10:aleteo 16:rapido 22:corriente 30:siesta',
  'Vive en el campanario y en todas las cornisas del pueblo. Su pasatiempo favorito es manchar los coches recién lavados.', '0,4 m', '1 kg');
S('mosquin', 'Mosquín', ['BICHO', 'VIENTO'], [36, 52, 32, 46, 88], 66, 190, null, '1:aguijon 6:picadura 12:zumbido 18:agilidad 24:polvoveneno 30:aleteo',
  'El enemigo número uno de las noches de verano. Zumba justo en tu oreja cuando te estás quedando dormido.', '0,1 m', '0,01 kg');
S('chispin', 'Chispín', ['ELEC'], [40, 40, 42, 62, 72], 60, 190, [28, 'farolon'], '1:impactrueno 1:latigo 7:ondatrueno 12:rapido 18:chispazo 24:agilidad 29:rayo',
  'Vive dentro de las farolas del pueblo. Cuando parpadea la luz de tu calle, es que Chispín se está riendo.', '0,4 m', '1 kg');
S('farolon', 'Farolón', ['ELEC', 'METAL'], [66, 62, 82, 98, 76], 148, 75, null, '1:impactrueno 1:ondatrueno 1:chispazo 28:garrametal 32:rayo 38:cabezahierro 44:apagon',
  'Una farola de hierro de las antiguas. Por las noches ilumina el Paseo del Prado y ahuyenta a los Talamones fantasma.', '2,0 m', '90 kg');
S('escarchin', 'Escarchín', ['HIELO'], [46, 40, 46, 56, 50], 60, 190, [30, 'escarchon'], '1:escarcha 1:grunido 8:bofetonlodo 13:helada 19:endurecer 25:siesta 31:rayohielo',
  'Aparece las mañanas de enero sobre los coches aparcados. Si le das un abrazo, te deja la cara congelada.', '0,3 m', '2 kg');
S('escarchon', 'Escarchón', ['HIELO', 'ROCA'], [82, 82, 98, 86, 46], 150, 75, null, '1:escarcha 1:helada 1:endurecer 30:rayohielo 34:penazo 40:avalancha 46:ventisca',
  'Un gigante de hielo y piedra que baja de la sierra en las nevadas. Los niños le hacen guerras de bolas de nieve.', '1,8 m', '400 kg');
S('tijerin', 'Tijerín', ['METAL'], [42, 62, 56, 32, 62], 62, 150, [30, 'tijeron'], '1:aranazo 1:garrametal 7:tijeretazo 13:rapido 18:rapado 24:peinado 31:afeitado',
  'Nació de unas tijeras olvidadas en la barbería. Corta todo lo que encuentra: pelo, papel y, a veces, los cordones de los zapatos.', '0,3 m', '1 kg');
S('tijeron', 'Tijerón', ['METAL', 'NORMAL'], [68, 104, 86, 52, 88], 152, 60, null, '1:tijeretazo 1:rapado 1:peinado 30:afeitado 36:cabezahierro 42:derribo',
  'El barbero perfecto: capa, bigote y unas tijeras que cortan el viento. Xiko dice que es su mejor ayudante.', '1,5 m', '50 kg');
S('peinecillo', 'Peinecillo', ['METAL', 'ELEC'], [48, 40, 62, 60, 50], 90, 150, null, '1:placaje 1:peinado 8:impactrueno 14:garrametal 20:chispazo 28:cabezahierro 34:rayo',
  'Un peine con mucha electricidad estática. Si te peina, se te quedan los pelos de punta durante horas.', '0,2 m', '0,3 kg');
S('tintorro', 'Tintorro', ['TINTA'], [42, 36, 42, 62, 56], 62, 150, [32, 'tintazo'], '1:mancha 1:susto 8:repaso 14:tatuaje 20:siesta 26:tintanegra 34:obramaestra',
  'Una gotita de tinta que se escapó de la máquina de tatuar. Le encanta mancharte la camiseta blanca.', '0,3 m', '0,5 kg');
S('tintazo', 'Tintazo', ['TINTA', 'AGUA'], [78, 62, 68, 104, 76], 150, 60, null, '1:mancha 1:repaso 1:tatuaje 32:tintanegra 36:surf 42:obramaestra 48:hidrobomba',
  'Un pulpo tatuador con ocho brazos. Puede hacerte un tatuaje de manga completa en cinco minutos (y sin preguntar).', '1,6 m', '40 kg');
S('agujin', 'Agujín', ['TINTA', 'METAL'], [48, 58, 46, 72, 96], 110, 90, null, '1:picotazo 6:mancha 12:tatuaje 17:agilidad 23:repaso 29:tintanegra 36:obramaestra',
  'Un colibrí con el pico de aguja de tatuar. Zumba como la máquina de El Cierzo y deja dibujitos en las flores.', '0,2 m', '0,3 kg');
S('fantasmin', 'Fantasmín', ['FANTASMA'], [36, 36, 36, 66, 62], 60, 190, [30, 'espantajo'], '1:lenguetazo 1:susto 8:pesadilla 14:bolasombra 22:chillido 30:leyenda',
  'Sale por la noche en la Plaza de Toros vacía. En realidad es muy miedoso y se esconde si le haces «¡BU!».', '0,6 m', '0,1 kg');
S('espantajo', 'Espantajo', ['FANTASMA', 'PLANTA'], [66, 76, 66, 92, 72], 145, 75, null, '1:susto 1:bolasombra 1:latigocepa 30:megaagotar 34:pesadilla 38:leyenda 44:solanera',
  'El espantapájaros de los huertos cobró vida una noche de tormenta. Ya no asusta pájaros: asusta a los hortelanos.', '1,7 m', '12 kg');
S('murcielin', 'Murcielín', ['FANTASMA', 'VIENTO'], [46, 46, 42, 46, 82], 68, 190, null, '1:chillido 1:lenguetazo 7:aleteo 13:susto 19:bolasombra 26:corriente 32:agilidad',
  'Duerme de día colgado en el campanario. Al anochecer revolotea alrededor de las farolas cazando mosquitos.', '0,4 m', '0,5 kg');
S('guijarrin', 'Guijarrín', ['ROCA'], [40, 62, 82, 26, 20], 58, 220, [25, 'pedrusco'], '1:placaje 1:endurecer 7:lanzarrocas 12:arena 18:penazo 25:terremoto',
  'Una piedra gruñona del camino. Siempre está de morros porque todo el mundo le da patadas sin querer.', '0,3 m', '20 kg');
S('pedrusco', 'Pedrusco', ['ROCA', 'TIERRA'], [72, 96, 116, 42, 30], 145, 90, null, '1:lanzarrocas 1:endurecer 1:arena 25:penazo 30:excavar 36:terremoto 42:avalancha',
  'Un pedrusco enorme con musgo en la cabeza. Si se sienta en medio de un camino, ya puedes dar la vuelta.', '1,5 m', '300 kg');
S('becerrin', 'Becerrín', ['LUCHA'], [46, 62, 46, 32, 52], 62, 180, [30, 'torazo'], '1:placaje 1:grunido 7:patada 12:rapido 18:punetazo 24:golpecuerpo 31:embestida',
  'Un ternero juguetón. Le encanta correr detrás de los ciclistas por los caminos de la sierra.', '0,7 m', '50 kg');
S('torazo', 'Torazo', ['LUCHA', 'TIERRA'], [82, 112, 82, 42, 82], 160, 60, null, '1:patada 1:punetazo 1:musculitos 30:embestida 34:excavar 40:terremoto',
  'Fuerte como diez hombres y noble como el que más. Lleva el pañuelo rojo de las fiestas de Talayuelas.', '1,8 m', '500 kg');
S('ovejin', 'Ovejín', ['NORMAL'], [52, 40, 52, 46, 36], 60, 220, [20, 'ovejona'], '1:placaje 1:latigo 6:piropo 11:golpecuerpo 16:siesta 20:impactrueno',
  'Una ovejita de los rebaños de la sierra. Duerme tanto que los pastores la usan de almohada.', '0,5 m', '20 kg');
S('ovejona', 'Ovejona', ['NORMAL', 'ELEC'], [82, 62, 82, 72, 46], 140, 90, null, '1:placaje 1:impactrueno 1:golpecuerpo 20:chispazo 26:ondatrueno 32:rayo 40:apagon',
  'Tiene tanta lana que se carga de electricidad. Si la acaricias, se te ponen los pelos como a un erizo.', '1,2 m', '60 kg');
S('abejin', 'Abejín', ['BICHO'], [42, 42, 42, 46, 62], 58, 200, [22, 'abejorrona'], '1:aguijon 6:polvoveneno 11:picadura 16:zumbido 22:agilidad',
  'Trabaja sin parar en las colmenas de la sierra. La miel de romero de Talayuelas es cosa suya.', '0,2 m', '0,2 kg');
S('abejorrona', 'Abejorrona', ['BICHO', 'VIENTO'], [72, 82, 62, 72, 82], 140, 90, null, '1:aguijon 1:polvoveneno 1:zumbido 22:aleteo 26:pinza 32:corriente 38:vendaval',
  'La reina de las colmenas. Lleva una corona de cera y no le gusta que le hablen antes de las diez.', '0,8 m', '5 kg');
S('setin', 'Setín', ['PLANTA'], [46, 42, 52, 56, 32], 60, 190, [28, 'setazo'], '1:absorber 1:somnifero 7:polvoveneno 12:megaagotar 18:siesta 24:bofetonlodo',
  'Un níscalo de los pinares. En otoño todo el pueblo sale a buscarlo... y él se esconde debajo de las hojas.', '0,3 m', '0,3 kg');
S('setazo', 'Setazo', ['PLANTA', 'FANTASMA'], [76, 66, 82, 92, 42], 148, 75, null, '1:absorber 1:somnifero 1:polvoveneno 28:bolasombra 32:megaagotar 38:pesadilla 44:solanera',
  'Una seta roja de lunares. ¡NO SE COME! Los abuelos lo repiten cada otoño, pero siempre hay algún despistado.', '1,2 m', '8 kg');
S('calimin', 'Calimín', ['FUEGO', 'TIERRA'], [44, 52, 46, 56, 56], 62, 150, [28, 'calimazo'], '1:ascuas 1:arena 7:bofetonlodo 12:calentar 18:barraardiente 24:terronazo 30:lanzallamas',
  'Un remolino de polvo caliente. La Banda del Bochorno los usa para quitarle el fresquito al pueblo.', '0,4 m', '1 kg');
S('calimazo', 'Calimazo', ['FUEGO', 'TIERRA'], [76, 86, 72, 86, 76], 150, 60, null, '1:ascuas 1:arena 1:barraardiente 28:lanzallamas 32:excavar 38:terremoto 44:hornoinfernal',
  'Una tormenta de calima con gafas de sol. Cuando pasa por el pueblo, los coches amanecen llenos de barro.', '1,5 m', '30 kg');
S('bochornazo', 'Bochornazo', ['FUEGO', 'VIENTO'], [92, 100, 82, 120, 96], 220, 3, null, '1:lanzallamas 1:vendaval 1:calentar 40:hornoinfernal 46:cierzo',
  'El viento caliente del sur, enemigo jurado del cierzo. Si gana, en Talayuelas haría un calor de agosto todo el año.', '2,4 m', '60 kg');
S('talayon', 'Talayón', ['ROCA', 'VIENTO'], [110, 118, 122, 110, 92], 270, 3, null, '1:penazo 1:cierzo 1:pinar 1:endurecer 45:avalancha 50:vendaval 55:terremoto',
  'El guardián de Las Peñas. Lleva tres pinos sobre los hombros y la corona del escudo. Cuenta la leyenda que sopló el primer cierzo.', '3,2 m', '999 kg');

/* ---------------- Instancias ---------------- */
let monUID = 1; function setMonUID(v) { monUID = v; }
function statOf(sp, k, lvl, iv) { const b = sp.b[k]; return k === 'hp' ? Math.floor((2 * b + iv) * lvl / 100) + lvl + 10 : Math.floor((2 * b + iv) * lvl / 100) + 5; }
function expFor(lvl) { return Math.floor(lvl * lvl * lvl * .9); }
function movesAt(sp, lvl) { const learned = []; for (const [l, m] of sp.L) if (l <= lvl && !learned.includes(m)) learned.push(m); return learned.slice(-4); }
function makeMon(id, lvl, opt = {}) {
  const sp = SPECIES[id]; if (!sp) throw new Error('especie ' + id);
  const iv = opt.iv || { hp: irnd(0, 31), atk: irnd(0, 31), def: irnd(0, 31), esp: irnd(0, 31), vel: irnd(0, 31) };
  const m = { uid: monUID++, id, lvl, exp: expFor(lvl), iv, hp: 0, st: null, moves: (opt.moves || movesAt(sp, lvl)).map(k => ({ k, pp: MOVES[k].pp })), nick: opt.nick || null, ot: opt.ot || null };
  calcStats(m); m.hp = m.mhp; return m;
}
function calcStats(m) { const sp = SPECIES[m.id]; const old = m.mhp; m.mhp = statOf(sp, 'hp', m.lvl, m.iv.hp); for (const k of ['atk', 'def', 'esp', 'vel']) m[k] = statOf(sp, k, m.lvl, m.iv[k]); if (old) m.hp = Math.max(m.hp > 0 ? 1 : 0, m.hp + (m.mhp - old)); }
function monName(m) { return m.nick || SPECIES[m.id].n; }

Object.assign(window, { setMonUID, SPECIES, makeMon, calcStats, expFor, movesAt, monName, statOf });

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

'use strict';
/* =====================================================================
   TheTalaVillage · Talayuelas: mapa, interiores, personajes e historia
   Plano basado en el callejero real (Paseo del Prado / N-330, Plaza España,
   C. Constitución, C. Correos, C. Goya, C. Real, Plaza de Toros, Polideportivo,
   Biblioteca, Huertos La Vega, Arroyo de Talayuelas…) con El Cierzo en el centro.
   ===================================================================== */

/* ---------------- Encuentros por zona: [especie, nivMin, nivMax, peso] ---------------- */
const ENCOUNTERS = {
  eras: [['pardalito', 3, 6, 30], ['ratolin', 3, 6, 25], ['saltamontin', 3, 6, 18], ['lagartin', 4, 7, 12], ['ovejin', 4, 7, 10], ['palomo', 5, 7, 5]],
  poli: [['chuchito', 5, 9, 26], ['michi', 5, 9, 26], ['palomo', 6, 9, 20], ['chispin', 7, 10, 14], ['ratolin', 5, 8, 14]],
  patio: [['tijerin', 8, 11, 30], ['peinecillo', 8, 11, 25], ['tintorro', 8, 11, 25], ['michi', 8, 10, 12], ['agujin', 10, 12, 8]],
  huertos: [['tomatito', 10, 14, 22], ['calabacin', 10, 14, 18], ['ajete', 11, 14, 16], ['abejin', 11, 14, 16], ['caracolin', 10, 13, 14], ['saltamontin', 10, 13, 10], ['setin', 12, 14, 4]],
  arroyo: [['ranacuajo', 12, 16, 34], ['truchin', 12, 16, 30], ['caracolin', 12, 15, 20], ['mosquin', 13, 16, 16]],
  garaballa: [['lagartin', 15, 19, 20], ['guijarrin', 15, 19, 20], ['becerrin', 16, 20, 16], ['ovejin', 15, 18, 14], ['mosquin', 15, 18, 12], ['chuchito', 16, 19, 10], ['escarchin', 17, 19, 8]],
  toros: [['fantasmin', 18, 22, 34], ['murcielin', 18, 22, 30], ['becerrin', 19, 22, 20], ['ratolin', 19, 21, 16]],
  penas: [['setin', 26, 30, 18], ['guijarrin', 26, 30, 14], ['escarchin', 27, 31, 14], ['murcielin', 27, 30, 12], ['pardalon', 28, 31, 12], ['pedrusco', 30, 33, 8], ['lagartijon', 29, 32, 8], ['rodenin', 28, 31, 4], ['cierzin', 28, 31, 4], ['brasin', 28, 31, 4], ['abejorrona', 29, 31, 2]],
};

/* ---------------- Aspecto de personajes ---------------- */
const LOOK = {
  xiko: { hs: 'quiff', hair: '#1d1a1a', beard: '#2a2420', tattoo: '#3a4a8a', shirt: '#1d1d22', pants: '#2a2a3a', skin: '#e8b88a' },
  abuela: { hs: 'bun', hair: '#d8d8d8', shirt: '#6a4a7a', dress: '#3a3a5a', glasses: '#4a4a4a', skin: '#f0c8a8' },
  toni: { hs: 'spiky', hair: '#c87a2a', shirt: '#2fa860', pants: '#2a3a5a', skin: '#f1c7a0' },
  enfermera: { hs: 'bun', hair: '#8a4a2a', shirt: '#f4f4f4', dress: '#f4f4f4', hat: 'chef', skin: '#f1c7a0' },
  cajera: { hs: 'pony', hair: '#2a1a10', shirt: '#2f8a4a', apron: '#3fa85a', skin: '#e8b88a' },
  panadero: { hs: 'short', hair: '#5a3a20', shirt: '#f4f4f4', apron: '#f4f4f4', hat: 'chef', stache: '#3a2a1a', skin: '#f1c7a0' },
  guardia: { hs: 'short', hair: '#2a2a2a', shirt: '#3a5a3a', pants: '#3a5a3a', hat: 'tricorn', hatc: '#1d2a1d', stache: '#2a2a2a' },
  sara: { hs: 'pony', hair: '#1d1a1a', shirt: '#3a8ad6', pants: '#f4f4f4', skin: '#d8a070' },
  paco: { hs: 'grey', hair: '#cfcfcf', shirt: '#7a8a5a', pants: '#5a4a3a', hat: 'straw', hatc: '#e8c66a', stache: '#cfcfcf', skin: '#d8986a' },
  morena: { hs: 'long', hair: '#1d1a1a', shirt: '#c8343a', pants: '#2a2a2a', skin: '#d8a070' },
  leandro: { hs: 'grey', hair: '#e8e8e8', shirt: '#5a3a6a', pants: '#3a3a4a', glasses: '#2a2a2a', beard: '#e8e8e8' },
  calima: { hs: 'long', hair: '#e86a2a', shirt: '#f08a2a', pants: '#3a2a2a', glasses: '#1a1a1a', skin: '#e8b88a' },
  bochorno: { hs: 'short', hair: '#3a2a1a', shirt: '#f08a2a', pants: '#3a2a2a', hat: 'cap', hatc: '#e8562a', glasses: '#1a1a1a' },
  peluquera: { hs: 'long', hair: '#a83a8a', shirt: '#e868a8', pants: '#2a2a3a' },
  chef: { hs: 'short', hair: '#2a2a2a', shirt: '#f4f4f4', apron: '#f4f4f4', hat: 'chef', stache: '#2a2a2a' },
  carnicero: { hs: 'bald', shirt: '#f4f4f4', apron: '#c84a4a', stache: '#5a3a2a', skin: '#e8a888' },
};

/* ---------------- Personajes «infinitos» (vecinos generados) ---------------- */
const NOMBRES = ['Pili', 'Manolo', 'Encarna', 'Juanjo', 'Rosario', 'Fermín', 'Loli', 'Paqui', 'Andrés', 'Charo', 'Vicente', 'Merche', 'Ramón', 'Amparo', 'Toñi', 'Julián', 'Maripaz', 'Eusebio', 'Nieves', 'Goyo', 'Sole', 'Tino', 'Asun', 'Jesusín', 'Lola', 'Quique', 'Puri', 'Nacho', 'Reme', 'Chema', 'Elena', 'Marcos', 'Sergio', 'Lucía', 'Hugo', 'Irene', 'Álvaro', 'Carla', 'Raúl', 'Noelia'];
const FRASES = [
  '¡Madre mía, qué cierzo hace hoy! Me ha despeinado hasta las cejas.',
  'Dicen que en Las Peñas vive un Talamón legendario… pero el guardia no deja pasar a nadie.',
  '¿Has probado el pan del Horno? Está tan bueno que hasta los Brasín hacen cola.',
  'En la Plaza España siempre hay un Pardalito robándole las migas a mi marido.',
  'Mi nieto quiere hacerse un tatuaje en El Cierzo… ¡con lo bien que estaba sin nada!',
  'Si te cortas el pelo en El Cierzo, tus Talamones te respetan más. Eso lo sabe todo el pueblo.',
  'En agosto, en las fiestas, la Plaza de Toros se llena hasta arriba.',
  'Los Huertos La Vega dan los mejores tomates de la Serranía. Y los Tomatitos más majos.',
  'Cuidado en el arroyo: el agua está helada hasta en verano.',
  '¿A dónde vas con tanta prisa? Siéntate un ratito, hombre.',
  'Ayer vi a un Chispín parpadeando en la farola de mi calle. ¡Me dio un susto…!',
  'Aquí en Talayuelas nos conocemos todos. Tú no eres de aquí, ¿verdad?',
  'La biblioteca tiene libros de Talamones antiquísimos. Dicen que Don Leandro los ha leído todos.',
  'Por las noches en la Plaza de Toros se oyen ruidos raros… Fantasmas, seguro.',
  'Mi abuelo decía que el cierzo lo sopla un Talamón gigante desde Las Peñas.',
  'Esos de la Banda del Bochorno van por ahí con gafas de sol hasta de noche. ¡Qué gente más rara!',
  'Si tus Talamones están cansados, ve al Centro de Salud. La enfermera Carmen es un cielo.',
  'En la Caja Rural te guardan los Talamones que no lleves encima. ¡Y sin comisiones!',
  'Mira qué Michi más gordo… Seguro que es el de la carnicería.',
  '¿Sabías que si mantienes pulsado B vas corriendo? Lo leí en un libro.',
  'Me he comprado una Colonia Fuerte en el Súper y no se me acerca ni el perro.',
  'El otro día un Palomo me dejó el coche recién lavado hecho un cromo.',
  'De joven yo también tuve un Rodenín. ¡Qué tupé tenía el condenado!',
  'Las gominas funcionan mejor si el Talamón está débil. O dormido. Eso dicen.',
  'La niebla de enero aquí es tan espesa que no ves ni tu propio Talamón.',
  '¿Ya has visto la fuente de la plaza? Los Ranacuajos se cuelan dentro en verano.',
];
const VECINO_ROPA = ['#c83a3a', '#3a6ac8', '#3ac86a', '#e8a020', '#8a4ab8', '#e868a8', '#5a5a5a', '#2fa8a8', '#f4f4f4', '#7a5a3a', '#d4d43a'];
function randomVecino(rng) {
  const r = rng || Math.random, p = a => a[Math.floor(r() * a.length)];
  const old = r() < .35, girl = r() < .5;
  return { name: p(NOMBRES), look: { hs: old ? (girl ? 'bun' : p(['grey', 'bald'])) : girl ? p(['long', 'pony', 'bun', 'fringe']) : p(['short', 'spiky', 'quiff', 'fringe', 'bald']), hair: old ? p(['#d8d8d8', '#bdbdbd', '#ececec']) : p(['#2a1a10', '#5a3a20', '#c87a2a', '#1d1a1a', '#e8c66a', '#8a3a2a']), shirt: p(VECINO_ROPA), pants: p(['#2a2a3a', '#3a4a6a', '#5a4a3a', '#2a3a2a']), dress: girl && r() < .4 ? p(VECINO_ROPA) : null, skin: p(['#f1c7a0', '#e8b88a', '#d8a070', '#c08860', '#f4d4b4']), glasses: old && r() < .5 ? '#3a3a3a' : null, hat: r() < .15 ? p(['cap', 'straw', 'beanie']) : null, hatc: p(VECINO_ROPA), stache: !girl && r() < .25 ? '#3a2a1a' : null }, line: p(FRASES) };
}

/* ---------------- Ayudas de construcción ---------------- */
function hRoad(m, y, x0, x1, line) { for (let x = x0; x <= x1; x++) { setG(m, x, y, line ? GR.ROADL : GR.ROAD); setG(m, x, y + 1, GR.ROAD); } for (let x = x0; x <= x1; x++) for (const yy of [y - 1, y + 2]) { const g = getG(m, x, yy); if (g === GR.GRASS || g === GR.TALL || g === GR.DIRT) setG(m, x, yy, GR.WALK); } }
function vRoad(m, x, y0, y1) { for (let y = y0; y <= y1; y++) { if (getG(m, x, y) !== GR.ROADL) setG(m, x, y, GR.ROAD); if (getG(m, x + 1, y) !== GR.ROADL) setG(m, x + 1, y, GR.ROAD); } for (let y = y0; y <= y1; y++) for (const xx of [x - 1, x + 2]) { const g = getG(m, xx, y); if (g === GR.GRASS || g === GR.TALL || g === GR.DIRT) setG(m, xx, y, GR.WALK); } }
function tallPatch(m, x, y, w, h, seed = 1, dens = .78) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const e = Math.min(i - x, x + w - 1 - i, j - y, y + h - 1 - j); if (getG(m, i, j) === GR.GRASS && (e > 0 || hash2(i, j, seed) < dens)) setG(m, i, j, GR.TALL); } }
function trees(m, list, kind = 'arbol') { for (const [x, y] of list) prop(m, x, y, kind); }
let HOUSE_N = 0;
function house(m, x, y, w, d, o = {}) { const id = 'casa' + (++HOUSE_N); const door = o.door !== undefined ? o.door : (w >> 1); const b = building(m, Object.assign({ x, y, w, d, door, floors: o.floors || (d <= 3 ? 1 : 2), name: o.name || 'Casa' }, o)); if (o.enter !== false) { makeHouse(id, x + door, y + d, o.seed || HOUSE_N * 13); m.doors[(x + door) + ',' + (y + d - 1)].to = [id, 4, 5]; } return b; }

/* ---------------- Interiores ---------------- */
function wallImg(w, col = '#e8dcc6', o = {}) {
  const [c, x] = mkCanvas(w * 16, 44); const P = (a, b, ww, hh, cc) => { x.fillStyle = cc; x.fillRect(a, b, ww, hh); };
  P(0, 0, w * 16, 44, col); P(0, 0, w * 16, 3, shade(col, -.3)); P(0, 36, w * 16, 8, shade(col, -.35)); P(0, 34, w * 16, 2, shade(col, -.15));
  if (o.tiles) for (let i = 0; i < w * 16; i += 8) for (let j = 4; j < 34; j += 8) P(i, j, 7, 7, shade(col, (hash2(i, j) - .5) * .08));
  (o.pics || []).forEach(([px, kind]) => { if (kind === 'ventana') { P(px * 16, 6, 24, 20, '#6a4a2a'); P(px * 16 + 2, 8, 20, 16, '#9fd2f2'); P(px * 16 + 11, 8, 2, 16, '#6a4a2a'); }
    else if (kind === 'cuadro') { P(px * 16 + 2, 8, 20, 16, '#8a6a2a'); P(px * 16 + 4, 10, 16, 12, pick(['#5a8ac8', '#c86a4a', '#4aa86a'])); }
    else if (kind === 'reloj') { x.fillStyle = '#fff'; x.beginPath(); x.arc(px * 16 + 8, 16, 7, 0, 7); x.fill(); x.strokeStyle = '#333'; x.stroke(); P(px * 16 + 8, 11, 1, 6, '#333'); }
    else if (kind === 'escudo') { P(px * 16 + 2, 4, 18, 22, '#e3b84f'); P(px * 16 + 5, 14, 3, 10, '#a08878'); P(px * 16 + 9, 12, 3, 12, '#a08878'); P(px * 16 + 13, 14, 3, 10, '#a08878'); P(px * 16 + 4, 9, 14, 4, '#4a7a5e'); }
    else if (kind === 'cartel') { P(px * 16, 8, 40, 16, '#2f4a7a'); x.fillStyle = '#fff'; x.font = 'bold 7px sans-serif'; x.fillText(o.text || '', px * 16 + 3, 19); }
    else if (kind === 'tatus') { for (let k = 0; k < 4; k++) { P(px * 16 + k * 12, 6, 10, 14, '#f4f4f4'); P(px * 16 + k * 12 + 2, 8, 6, 10, pick(['#c83a3a', '#2a2a2a', '#3a6ac8'])); } }
  });
  return c;
}
function room(id, w, h, o = {}) {
  const m = newMap(id, w, h, Object.assign({ interior: true, fill: o.floor || GR.WOOD, music: o.music || 'casa' }, o));
  for (let x = 0; x < w; x++) { block(m, x, 0); block(m, x, 1); }
  m.objs.push({ t: 'w', x: 0, y: 0, w, d: 2, img: wallImg(w, o.wall, o) });
  const ex = o.exit !== undefined ? o.exit : (w >> 1); setG(m, ex, h - 1, GR.MAT); if (o.out) warp(m, ex, h - 1, o.out[0], o.out[1], o.out[2], 'down');
  m.exitX = ex; m.counters = {}; return m;
}
function makeHouse(id, ox, oy, seed) {
  const m = room(id, 9, 7, { out: ['pueblo', ox, oy], exit: 4, wall: pick(['#efe2c8', '#e8d8c0', '#f2e6d6', '#e6d2c2']), pics: [[1, 'ventana'], [4, 'cuadro'], [7, 'reloj']], floor: hash2(seed, 1) > .5 ? GR.WOOD : GR.TILE });
  prop(m, 1, 3, 'cama', { bh: 2 }); prop(m, 6, 3, 'mesa'); prop(m, 7, 2, 'estante', { v: seed % 5 }); prop(m, 1, 5, 'maceta');
  m.extraNpcs = () => { const rng = srand(seed * 7 + new Date().getDate()), n = 1 + (rng() * 2 | 0), out = []; for (let i = 0; i < n; i++) { const v = randomVecino(rng); out.push({ id: 'v' + i, name: v.name, look: v.look, x: 3 + i * 2, y: 3 + (i & 1), dir: 'down', wander: 1, say: v.name + ': ' + v.line }); }
    const gift = hash2(seed, 3) > .55; if (gift) { const it = pick(['locion', 'gomina', 'remedio', 'aftershave', 'colonia', 'pan', 'supergomina']); out[0].talk = async n2 => { const k = 'regalo_' + id; if (!flag(k)) { setFlag(k); await say(n2.name + ': ¡Hola! Toma, llévate esto, que a mí no me hace falta.'); await giveItem(it, 1, n2.name); } else await say(n2.say); }; }
    return out; };
  return m;
}

/* =====================================================================
   PUEBLO DE TALAYUELAS (120 × 96)
   ===================================================================== */
const PUEBLO = newMap('pueblo', 120, 96, { name: 'Talayuelas', music: 'pueblo' });
PUEBLO.build = function (m) {
  HOUSE_N = 0;
  // ---- campo, eras y pinares ----
  rectG(m, 0, 0, 120, 16, GR.GRASS); for (let i = 0; i < 18; i++) rectG(m, 4 + (i * 13) % 80, 2 + (i * 7) % 11, 3 + i % 3, 2, GR.ERA);
  zoneRect(m, 'eras', 0, 0, 32, 16); zoneRect(m, 'eras', 50, 0, 40, 16);
  tallPatch(m, 2, 2, 12, 9, 1); tallPatch(m, 16, 9, 12, 6, 2); tallPatch(m, 52, 2, 14, 8, 3); tallPatch(m, 68, 6, 14, 8, 4); tallPatch(m, 58, 11, 8, 4, 5);
  // Las Peñas (noreste)
  rectG(m, 93, 0, 27, 31, GR.PINE); zoneRect(m, 'penas', 93, 0, 27, 31);
  for (let j = 0; j < 31; j++) for (let i = 93; i < 120; i++) if (hash2(i, j, 77) > .55 && !(i > 103 && i < 116 && j < 12)) setG(m, i, j, GR.TALL);
  rectG(m, 104, 3, 12, 9, GR.ROCKY);
  // ---- calles ----
  hRoad(m, 40, 0, 119, true);           // Paseo del Prado (N-330)
  hRoad(m, 24, 34, 100);                // C. Goya
  hRoad(m, 30, 14, 47);                 // C. San Antón
  hRoad(m, 17, 24, 47);                 // C. de la Plaza de Toros
  hRoad(m, 52, 2, 88);                  // Pl. España (sur)
  hRoad(m, 62, 10, 100);                // C. Francisco Pizarro
  hRoad(m, 73, 18, 96);                 // C. Maestro Pradas
  hRoad(m, 80, 0, 119);                 // C. Real
  hRoad(m, 90, 18, 80);                 // C. Serranos
  vRoad(m, 48, 16, 39);                 // C. Teruel
  vRoad(m, 63, 24, 81);                 // C. Constitución
  vRoad(m, 33, 42, 89);                 // C. Cervantes
  vRoad(m, 72, 42, 89);                 // C. Correos
  vRoad(m, 90, 24, 81);                 // C. Orellana
  for (let y = 0; y < 24; y++) { setG(m, 90, y, GR.DIRT); setG(m, 91, y, GR.DIRT); }  // camino a Las Peñas
  rectG(m, 92, 8, 14, 2, GR.DIRT); rectG(m, 104, 9, 2, 4, GR.DIRT);
  // ---- plazas ----
  rectG(m, 45, 43, 17, 8, GR.PLAZA);    // Plaza España
  rectG(m, 35, 33, 12, 6, GR.PLAZA);    // Plaza de Cervantes
  rectG(m, 36, 65, 11, 7, GR.PLAZA);    // Plaza del Obispo Almonacid
  rectG(m, 75, 65, 13, 7, GR.PLAZA);    // Plaza de Cuenca
  // ---- polideportivo y pista ----
  m.courtX0 = 2; m.courtX1 = 11; m.courtY0 = 55; m.courtY1 = 60; m.courtMid = 6; rectG(m, 2, 55, 10, 6, GR.COURT);
  rectG(m, 13, 55, 7, 6, GR.GRASS); tallPatch(m, 14, 55, 6, 6, 9, .9); zoneRect(m, 'poli', 13, 55, 8, 6);
  // ---- patio de El Cierzo ----
  rectG(m, 55, 27, 7, 6, GR.GRASS); tallPatch(m, 56, 28, 5, 4, 11, 1); zoneRect(m, 'patio', 55, 27, 7, 6);
  // ---- Huertos La Vega y arroyo ----
  zoneRect(m, 'huertos', 93, 43, 27, 37); zoneRect(m, 'huertos', 93, 82, 27, 14);
  for (let j = 58; j < 79; j++) for (let i = 101; i < 118; i++) if (getG(m, i, j) === GR.GRASS) setG(m, i, j, GR.SOIL);
  tallPatch(m, 94, 44, 7, 14, 21); tallPatch(m, 104, 44, 14, 12, 22); tallPatch(m, 96, 83, 8, 12, 23); tallPatch(m, 110, 83, 9, 12, 24);
  const river = [[119, 47], [110, 52], [103, 58], [99, 66], [97, 74], [96, 80], [95, 88], [93, 95]];
  for (let s = 0; s < river.length - 1; s++) { const [ax, ay] = river[s], [bx, by] = river[s + 1], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 3;
    for (let k = 0; k <= n; k++) { const px = ax + (bx - ax) * k / n, py = ay + (by - ay) * k / n; for (let dx = -2; dx <= 2; dx++) for (let dy = -1; dy <= 1; dy++) { const X = Math.round(px + dx), Y = Math.round(py + dy), g = getG(m, X, Y); if (g === GR.ROAD || g === GR.ROADL || g === GR.WALK) continue; const core = Math.abs(dx) <= 0 && Math.abs(dy) <= 0; if (core) setG(m, X, Y, GR.WATER); else if (g !== GR.WATER) setG(m, X, Y, GR.SHALLOW); } } }
  for (let x = 92; x < 100; x++) for (const y of [79, 80, 81, 82]) { const g = getG(m, x, y); if (g === GR.WATER || g === GR.SHALLOW) setG(m, x, y, GR.BRIDGE); }
  // Garaballa (suroeste)
  zoneRect(m, 'garaballa', 0, 82, 18, 14); tallPatch(m, 1, 83, 15, 12, 31, .85); rectG(m, 0, 92, 18, 1, GR.DIRT);

  // ---- edificios: norte del Paseo (fachadas al sur, acera y=39) ----
  house(m, 4, 33, 7, 6); house(m, 12, 33, 7, 6);
  building(m, { x: 20, y: 33, w: 6, d: 6, door: 2, sign: 'CAJA RURAL', signc: '#2f7a4a', wall: '#e8e2d4', name: 'Caja Rural', to: ['caja', 4, 5], kind: 'shop' });
  building(m, { x: 27, y: 33, w: 7, d: 6, door: 3, sign: 'CENTRO DE SALUD', signc: '#2ea84a', wall: '#f4f4f0', kind: 'salud', name: 'Centro de Salud', to: ['salud', 5, 6] });
  prop(m, 40, 35, 'fuente', { bw: 2 }); prop(m, 37, 37, 'banco', { block: true }); prop(m, 44, 37, 'banco'); trees(m, [[36, 34], [45, 34]], 'olivo');
  sign(m, 38, 38, 'Plaza de Cervantes.');
  house(m, 51, 33, 4, 6, { door: 1 });
  building(m, { x: 55, y: 33, w: 7, d: 6, door: 3, kind: 'cierzo', granite: true, wall: '#e7c9b8', floors: 2, name: 'El Cierzo · Tattoo & Barber Shop', to: ['cierzo', 6, 8], roof: '#8a8a8a', flat: true });
  building(m, { x: 66, y: 33, w: 7, d: 6, door: 3, sign: 'RESTAURANTE', signc: '#8a3a2a', name: 'Restaurante', to: ['restaurante', 5, 5], awning: '#c8343a' });
  house(m, 74, 33, 6, 6);
  building(m, { x: 81, y: 33, w: 8, d: 6, door: 3, kind: 'cuartel', wall: '#efe6d4', name: 'Cuartel de la Guardia Civil', to: ['cuartel', 4, 5] });
  house(m, 93, 33, 7, 6); house(m, 101, 33, 7, 6); house(m, 109, 33, 7, 6);
  // norte: C. San Antón / C. Goya
  building(m, { x: 24, y: 23, w: 7, d: 6, door: 3, sign: 'HORNO', signc: '#8a5a2a', name: 'Horno de Talayuelas', to: ['horno', 4, 5], awning: '#e8a020' });
  house(m, 32, 23, 6, 6); house(m, 16, 23, 7, 6);
  house(m, 52, 17, 7, 6); house(m, 60, 17, 7, 6); house(m, 68, 17, 7, 6); house(m, 76, 17, 5, 6);
  building(m, { x: 82, y: 17, w: 7, d: 6, door: 3, sign: 'TALLER', signc: '#3a3a3a', wall: '#d8d4cc', name: 'Taller Mecánico', to: ['taller', 4, 5], flat: true });
  house(m, 94, 17, 6, 6, { enter: false, name: 'Casa del guarda forestal' });
  building(m, { x: 32, y: 8, w: 14, d: 8, door: 7, kind: 'toros', floors: 2, flat: true, name: 'Plaza de Toros de Talayuelas', to: ['toros', 9, 14] });
  // ---- sur del Paseo ----
  building(m, { x: 3, y: 45, w: 11, d: 6, door: 5, sign: 'POLIDEPORTIVO MUNICIPAL', signc: '#3a6ac8', wall: '#e8e8e2', name: 'Polideportivo Municipal', to: ['poli', 7, 10], flat: true });
  prop(m, 2, 57, 'portería', { block: false, flatSort: true }); prop(m, 11, 57, 'portería', { block: false, flatSort: true });
  building(m, { x: 20, y: 45, w: 6, d: 6, door: 2, sign: 'PELUQUERÍA', signc: '#a83a8a', name: 'Peluquería', to: ['peluqueria', 4, 5], awning: '#e868a8' });
  building(m, { x: 36, y: 45, w: 8, d: 6, door: 3, sign: 'CAFÉ BAR', signc: '#6a3a1a', name: 'Café Bar', to: ['cafe', 5, 5], awning: '#3a8a5a' });
  prop(m, 52, 46, 'fuente', { bw: 2 }); for (const [a, b] of [[47, 44], [58, 44], [47, 49], [58, 49]]) prop(m, a, b, 'arbol'); for (const [a, b] of [[49, 49], [56, 49]]) prop(m, a, b, 'banco');
  prop(m, 46, 42, 'parada', { block: true }); for (const k of [44, 60]) prop(m, k, 42, 'farola');
  sign(m, 50, 47, 'Plaza España. Corazón de Talayuelas.');
  building(m, { x: 36, y: 55, w: 8, d: 6, door: 3, sign: 'BAR · PARRILLA', signc: '#8a3a2a', name: 'Bar Parrilla', to: ['bar', 6, 6] });
  building(m, { x: 45, y: 55, w: 9, d: 6, door: 4, sign: 'SÚPER', signc: '#c83a3a', wall: '#f4f4f0', name: 'Supermercado', to: ['super', 6, 6], kind: 'shop', awning: '#c83a3a', flat: true });
  building(m, { x: 55, y: 55, w: 7, d: 6, door: 3, sign: 'CARNICERÍA', signc: '#a8343a', name: 'Carnicería', to: ['carniceria', 4, 4], kind: 'shop' });
  house(m, 66, 55, 5, 6); house(m, 75, 55, 7, 6); house(m, 83, 55, 6, 6); house(m, 20, 55, 6, 6); house(m, 26, 55, 6, 6);
  building(m, { x: 20, y: 66, w: 9, d: 6, door: 4, sign: 'CASA RURAL', signc: '#5a7a3a', name: 'Casa Rural La Casa Grande', to: ['casarural', 5, 5], wall: '#f0e0c8' });
  for (const [a, b] of [[37, 66], [45, 66], [37, 70], [45, 70]]) prop(m, a, b, 'olivo'); prop(m, 41, 68, 'banco');
  building(m, { x: 48, y: 66, w: 11, d: 6, door: 5, sign: 'BIBLIOTECA', signc: '#5a3a6a', wall: '#e8dcc4', name: 'Biblioteca Pública Municipal', to: ['biblio', 7, 10] });
  house(m, 66, 66, 5, 6); prop(m, 81, 68, 'fuente', { bw: 2 }); for (const [a, b] of [[76, 66], [86, 66], [76, 70], [86, 70]]) prop(m, a, b, 'arbol');
  sign(m, 79, 71, 'Plaza de Cuenca.');
  house(m, 20, 76, 7, 3); house(m, 27, 76, 5, 3);
  building(m, { x: 40, y: 76, w: 7, d: 3, door: 3, floors: 1, name: 'Casa de la abuela', to: ['abuela', 4, 5], wall: '#f2e6d0', shutter: '#3f6a4a' });
  house(m, 48, 76, 7, 3); house(m, 56, 76, 6, 3); house(m, 66, 76, 5, 3); house(m, 75, 76, 7, 3); house(m, 83, 76, 6, 3);
  house(m, 20, 83, 7, 6); house(m, 36, 83, 7, 6); house(m, 44, 83, 7, 6); house(m, 52, 83, 7, 6); house(m, 60, 83, 7, 6); house(m, 74, 83, 6, 6);
  // huertos: caseta de Tío Paco
  building(m, { x: 106, y: 84, w: 6, d: 4, door: 2, floors: 1, name: 'Caseta del Tío Paco', wall: '#d8c8a8', to: ['caseta', 4, 4], roof: '#8a6a3a' });
  for (let y = 88; y < 92; y++) setG(m, 108, y, GR.DIRT);
  for (let j = 60; j < 78; j += 3) for (let i = 102; i < 117; i += 2) if (getG(m, i, j) === GR.SOIL) prop(m, i, j, 'huerto', { v: (i + j) % 2, block: false });
  for (let x = 100; x < 119; x += 1) if (getG(m, x, 57) === GR.GRASS) prop(m, x, 57, 'valla');
  // Las Peñas: las tres peñas del escudo + pinos
  for (const [a, b] of [[106, 6], [109, 5], [112, 6]]) prop(m, a, b, 'pena', { bw: 2 });
  for (let i = 0; i < 70; i++) { const x = 93 + (hash2(i, 5) * 27 | 0), y = (hash2(i, 9) * 30 | 0); if (getG(m, x, y) === GR.PINE || getG(m, x, y) === GR.TALL) { if (!(x > 101 && x < 117 && y < 14) && !(x >= 90 && x <= 92)) prop(m, x, y, 'pino'); } }
  sign(m, 92, 23, 'Camino de Las Peñas. Paso restringido por orden de la Guardia Civil.');
  // ---- árboles, farolas, decorado ----
  for (let x = 2; x < 118; x += 6) { if (getG(m, x, 39) === GR.WALK && !m.blk[39 * m.w + x]) prop(m, x, 39, 'farola'); }
  for (let x = 4; x < 90; x += 8) if (getG(m, x, 54) === GR.WALK && !m.blk[54 * m.w + x]) prop(m, x, 54, 'farola');
  for (let i = 0; i < 160; i++) { const x = hash2(i, 1) * 120 | 0, y = hash2(i, 2) * 96 | 0, g = getG(m, x, y); if (g === GR.GRASS && !m.blk[y * m.w + x] && !(x >= 54 && x <= 62 && y >= 26 && y <= 33)) { const near = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([a, b]) => { const q = getG(m, x + a, y + b); return q === GR.ROAD || q === GR.WALK || q === GR.ROADL; }); if (!near) prop(m, x, y, y < 16 || x > 92 ? 'pino' : pick(['arbol', 'arbol', 'olivo'])); } }
  for (let i = 0; i < 90; i++) { const x = hash2(i, 11) * 120 | 0, y = hash2(i, 12) * 96 | 0; if (getG(m, x, y) === GR.GRASS && !m.blk[y * m.w + x]) prop(m, x, y, 'flor', { v: i, block: false }); }
  for (const [a, b] of [[3, 86], [8, 89], [13, 84], [15, 93], [5, 93]]) prop(m, a, b, 'roca', { bw: 2 });
  [24, 38, 52, 66, 78, 86].forEach((cx, k) => prop(m, cx, 82, 'coche', { v: k, bw: 2 }));
  prop(m, 30, 82, 'contenedor'); prop(m, 61, 64, 'contenedor'); prop(m, 18, 42, 'cartelazo', { bw: 2 });
  // vallas del patio de El Cierzo
  for (let x = 54; x <= 62; x++) if (x !== 58) prop(m, x, 27, 'valla'); for (let y = 28; y <= 32; y++) { prop(m, 54, y, 'valla'); prop(m, 62, y, 'valla'); }
  // ---- objetos por el pueblo ----
  [[8, 6, 'gomina', 2], [22, 12, 'locion', 1], [60, 4, 'remedio', 1], [78, 10, 'gomina', 3], [27, 6, 'colonia', 1], [15, 58, 'locion', 2], [58, 30, 'supergomina', 1], [113, 46, 'aftershave', 1], [116, 70, 'pan', 3],
   [98, 92, 'supergomina', 2], [4, 90, 'peine', 1], [12, 94, 'aftershave', 2], [85, 68, 'caramelo', 1], [118, 2, 'balsamo', 1], [96, 26, 'hipergomina', 2], [110, 20, 'peine', 1], [100, 12, 'bizcocho', 1], [42, 70, 'remedio', 2], [66, 94, 'gomina', 3], [2, 44, 'colonia', 2]]
    .forEach(([a, b, it, n]) => hiddenItem(m, a, b, it, n));
  buildPuebloNpcs(m);
};

/* ---------------- Entrenadores ---------------- */
const TR = {};
function trainer(id, o) { TR[id] = Object.assign({ id }, o); return TR[id]; }
trainer('eras1', { cls: 'Chaval', name: 'Dani', look: { hs: 'spiky', hair: '#2a1a10', shirt: '#e8a020', pants: '#3a4a6a', hat: 'cap', hatc: '#3a6ac8' }, team: [['pardalito', 5], ['ratolin', 6]], pre: '¡Eh, tú! ¡Los que pisan mi hierba alta tienen que luchar conmigo!', lose: '¡Jo! Voy a entrenar más en las eras.', done: 'En la hierba alta salen Talamones salvajes. ¡Yo me paso aquí las tardes enteras!' });
trainer('eras2', { cls: 'Pastora', name: 'Lucía', look: { hs: 'long', hair: '#8a3a2a', shirt: '#7a8a5a', pants: '#5a4a3a', hat: 'straw', hatc: '#e8c66a' }, team: [['ovejin', 7], ['ovejin', 7]], pre: '¡Mis ovejas y yo no nos dejamos ganar por cualquiera!', lose: 'Beeee… quiero decir, ¡bien jugado!', done: 'Las ovejas de la sierra duermen muchísimo. Las mías más.' });
trainer('eras3', { cls: 'Cazabichos', name: 'Rubén', look: { hs: 'fringe', hair: '#5a3a20', shirt: '#4aa85a', pants: '#3a3a2a', hat: 'straw', hatc: '#d8c88a' }, team: [['saltamontin', 6], ['saltamontin', 7], ['mosquin', 7]], pre: '¡Mira qué bichos más chulos tengo! ¡A luchar!', lose: '¡Mis bichos…! Bueno, se lo han pasado bien.', done: 'Los Mosquines salen por la noche. ¡Lleva Colonia Fuerte!' });
trainer('poli1', { cls: 'Jugadora', name: 'Marta', look: { hs: 'pony', hair: '#c87a2a', shirt: '#3a8ad6', pants: '#f4f4f4' }, team: [['chuchito', 8], ['ratolin', 9]], pre: '¡Para llegar a la Maestra Sara tendrás que pasar por mí!', lose: '¡Tarjeta roja para mí!', done: 'Sara entrena aquí todas las mañanas. ¡Es durísima!' });
trainer('poli2', { cls: 'Portero', name: 'Iván', look: { hs: 'short', hair: '#1d1a1a', shirt: '#e8a020', pants: '#2a2a2a' }, team: [['becerrin', 9], ['saltamontin', 10]], pre: '¡Aquí no pasa nadie! ¡Soy el portero titular!', lose: '¡Goool! Pero en mi portería…', done: 'Los Talamones de Lucha son débiles contra el tipo Cierzo. ¡No se lo digas a Sara!' });
trainer('sara', { cls: 'Maestra', name: 'Sara', leader: true, look: LOOK.sara, team: [['chuchito', 10], ['becerrin', 11], ['langoston', 13]], money: 1300, pre: '¡Bienvenido al Polideportivo! Aquí entrenamos cuerpo y mente. ¡Demuéstrame lo que vales!', lose: '¡Qué partidazo! Te has ganado la Medalla Balón.' });
trainer('bar1', { cls: 'Abuelo', name: 'Ramón', look: { hs: 'grey', hair: '#d8d8d8', shirt: '#6a6a7a', pants: '#3a3a3a', hat: 'beanie', hatc: '#3a3a5a' }, team: [['palomo', 9], ['michi', 9]], pre: '¡Llevo cincuenta años jugando al guiñote en este bar! A ver si luchas igual de bien.', lose: '¡Ay, si me hubieras pillado con veinte años menos…!', done: 'Pasa por la Plaza España, que se está muy a gusto al solecito.' });
trainer('bar2', { cls: 'Abuela', name: 'Encarna', look: { hs: 'bun', hair: '#d8d8d8', shirt: '#a84a6a', dress: '#3a3a5a' }, team: [['chuchito', 10], ['palomo', 10]], pre: '¡Ni se te ocurra sentarte en mi silla sin luchar antes!', lose: '¡Qué arte tienes, criatura!', done: 'Mi nieto también quiere ser entrenador. ¡Este pueblo está lleno de talento!' });
trainer('huer1', { cls: 'Hortelana', name: 'Mari', look: { hs: 'bun', hair: '#5a3a20', shirt: '#d84a4a', pants: '#3a4a3a', hat: 'straw', hatc: '#e8c66a' }, team: [['tomatito', 12], ['calabacin', 13]], pre: '¡Ni se te ocurra pisar mis tomateras!', lose: '¡Vale, vale! Pero no pises las lechugas.', done: 'Los Tomatitos se ponen rojos cuando les dices algo bonito.' });
trainer('huer2', { cls: 'Apicultor', name: 'Jesús', look: { hs: 'short', hair: '#2a2a2a', shirt: '#f4f4f4', pants: '#f4f4f4', hat: 'beanie', hatc: '#f4f4f4' }, team: [['abejin', 13], ['abejin', 13], ['abejorrona', 15]], pre: '¡Bzzz! Mis abejas están algo nerviosas hoy…', lose: 'Tranquilas, chicas, tranquilas…', done: 'La miel de romero de la sierra es la mejor del mundo. Palabra.' });
trainer('huer3', { cls: 'Pescador', name: 'Luis', look: { hs: 'grey', hair: '#9a9a9a', shirt: '#4a7a9a', pants: '#3a3a3a', hat: 'cap', hatc: '#5a7a3a' }, team: [['truchin', 14], ['ranacuajo', 14]], pre: '¡Shhh! Que me asustas a las truchas… ¡Bueno, ya que estás, lucha!', lose: 'Hoy tampoco pesco nada…', done: 'En el agua poco profunda del arroyo salen Talamones de agua.' });
trainer('paco', { cls: 'Maestro', name: 'Tío Paco', leader: true, look: LOOK.paco, team: [['tomatito', 15], ['calabacin', 16], ['ajazo', 17], ['espantajo', 18]], money: 1900, pre: 'Cincuenta años cultivando la huerta y otros tantos criando Talamones. ¡A ver qué sabes hacer tú!', lose: '¡Ole! Te has ganado la Medalla Tomate. ¡Y un saco de tomates si quieres!' });
trainer('gar1', { cls: 'Ciclista', name: 'Álex', look: { hs: 'short', hair: '#e8c66a', shirt: '#e8562a', pants: '#2a2a2a', hat: 'visor', hatc: '#3a3a3a' }, team: [['lagartin', 16], ['pardalon', 18]], pre: '¡Estoy entrenando para subir el puerto! Pero un combate me viene bien.', lose: 'Me he quedado sin piernas…', done: 'El camino de Garaballa está lleno de piedras gruñonas. ¡Cuidado!' });
trainer('gar2', { cls: 'Camionero', name: 'Pepe', look: { hs: 'bald', shirt: '#3a5a8a', pants: '#3a3a3a', beard: '#5a4a3a' }, team: [['guijarrin', 17], ['pedrusco', 19]], pre: '¡Cuarenta años en la carretera y nadie me ha ganado en un área de servicio!', lose: '¡Pues ya hay alguien!', done: 'Por la N-330 pasan camiones de todo el país. Y ninguno para a cortarse el pelo en El Cierzo. ¡Ellos se lo pierden!' });
trainer('gar3', { cls: 'Pastor', name: 'Juan', look: { hs: 'grey', hair: '#9a9a9a', shirt: '#7a6a4a', pants: '#4a3a2a', hat: 'straw', hatc: '#c8a86a' }, team: [['ovejin', 16], ['perrazo', 19], ['ovejona', 20]], pre: 'Mi perro y mis ovejas son mi familia. ¡Defiéndete!', lose: 'Buen trabajo. Mi perro te ha cogido cariño.', done: 'Si te pierdes por la sierra, sigue el cierzo: siempre sopla hacia el pueblo.' });
trainer('gar4', { cls: 'Montañera', name: 'Sonia', look: { hs: 'pony', hair: '#5a3a20', shirt: '#2fa8a8', pants: '#5a4a3a', hat: 'beanie', hatc: '#c83a3a' }, team: [['lagartijon', 22]], pre: 'He subido a todos los picos de la Serranía. ¡Esto será un paseo!', lose: '¡Uf! Me falta oxígeno…', done: 'Dicen que en Las Peñas hay Talamones muy fuertes. Yo aún no he podido entrar.' });
trainer('toro1', { cls: 'Mozo', name: 'Jorge', look: { hs: 'short', hair: '#1d1a1a', shirt: '#f4f4f4', pants: '#f4f4f4', hat: 'cap', hatc: '#c83a3a' }, team: [['becerrin', 18], ['fantasmin', 19]], pre: '¡Esta plaza la cuido yo! ¡Nadie pasa sin luchar!', lose: '¡Ay, qué revolcón!', done: 'Por las noches aquí se oyen cosas raras. Yo no me quedo solo ni loco.' });
trainer('toro2', { cls: 'Peñista', name: 'Rosa', look: { hs: 'long', hair: '#c83a3a', shirt: '#c83a3a', pants: '#f4f4f4' }, team: [['palomo', 19], ['perrazo', 21]], pre: '¡Viva Talayuelas y viva su peña! ¡A luchar!', lose: '¡Viva igualmente!', done: 'En fiestas aquí hay vaquillas, verbena y Talamones a montones.' });
trainer('morena', { cls: 'Maestra', name: 'La Morena', leader: true, look: LOOK.morena, team: [['becerrin', 21], ['lagartijon', 22], ['perrazo', 23], ['torazo', 25]], money: 2500, pre: 'En esta plaza manda el coraje. ¡Sal al ruedo si te atreves!', lose: '¡Bravo! ¡Olé tú! La Medalla Capote es tuya.' });
trainer('bib1', { cls: 'Estudiante', name: 'Laura', look: { hs: 'fringe', hair: '#2a1a10', shirt: '#7a4ab8', pants: '#3a3a4a', glasses: '#3a3a3a' }, team: [['tintorro', 24], ['fantasmin', 24]], pre: '¡Shhh! En la biblioteca se lucha en silencio… ¡Venga!', lose: '(Susurrando) ¡Has ganado!', done: '(Susurrando) Don Leandro sabe todas las leyendas del pueblo.' });
trainer('bib2', { cls: 'Profesor', name: 'Antonio', look: { hs: 'bald', shirt: '#5a6a8a', pants: '#3a3a3a', glasses: '#2a2a2a', beard: '#7a6a5a' }, team: [['murcielin', 25], ['setin', 25], ['agujin', 26]], pre: 'Lección de hoy: cómo perder un combate con elegancia. ¡Empezamos!', lose: 'La lección era para mí, por lo visto.', done: 'Repasa la tabla de tipos: la Tinta es fuerte contra los Fantasma.' });
trainer('leandro', { cls: 'Maestro', name: 'Don Leandro', leader: true, look: LOOK.leandro, team: [['fantasmin', 26], ['michote', 27], ['tintazo', 28], ['espantajo', 29]], money: 3200, pre: 'He leído todos los libros de esta biblioteca. Ahora leeré tu forma de luchar… ¡En guardia!', lose: 'Fascinante. Te mereces la Medalla Libro.' });
trainer('taller1', { cls: 'Mecánico', name: 'Fermín', look: { hs: 'short', hair: '#3a2a1a', shirt: '#3a5a8a', pants: '#3a5a8a', hat: 'cap', hatc: '#3a3a3a' }, team: [['chispin', 18], ['peinecillo', 19], ['farolon', 22]], pre: '¡Te reviso el motor de tus Talamones gratis! Con un combate, claro.', lose: '¡Necesito cambiar el aceite!', done: 'Los Farolones dan buena luz, pero gastan una barbaridad.' });
trainer('rural1', { cls: 'Turista', name: 'Paqui', look: { hs: 'long', hair: '#e8c66a', shirt: '#2fa8a8', dress: '#2fa8a8', glasses: '#c83a3a' }, team: [['palomo', 13], ['pardalito', 14]], pre: '¡Vengo de Valencia de vacaciones! ¿Luchamos, xiquet?', lose: '¡Ay, qué bien se está en la sierra!', done: 'Aquí en verano se duerme con manta. ¡En Valencia, imposible!' });
trainer('rural2', { cls: 'Turista', name: 'Vicent', look: { hs: 'short', hair: '#2a1a10', shirt: '#e8562a', pants: '#2a2a3a', hat: 'cap', hatc: '#f4f4f4' }, team: [['truchin', 15], ['michi', 15]], pre: '¡He venido a pescar truchas y a coger Talamones! ¡Prepárate!', lose: '¡Mañana me vuelvo a la playa!', done: '¿Has visto el escudo del pueblo? Tres pinos sobre tres peñas. ¡Precioso!' });
// Banda del Bochorno
const GRUNT = { cls: 'Bochornista', look: LOOK.bochorno };
trainer('g1', Object.assign({ name: 'Recluta', team: [['calimin', 11], ['ratolin', 11]], pre: '¡Fuera de mi camino! ¡La Banda del Bochorno no tiene tiempo para mocosos!', lose: '¡Bah! ¡Da igual! ¡Ya tenemos las Tres Piñas Sagradas de Las Peñas!' }, GRUNT));
trainer('g2', Object.assign({ name: 'Recluta', team: [['calimin', 15], ['mosquin', 16]], pre: '¿Qué haces aquí? ¡Estoy escondiendo… digo, cultivando tomates!', lose: '¡Puaj! ¡Toma tu piña y déjame en paz!' }, GRUNT));
trainer('g3', Object.assign({ name: 'Recluta', team: [['calimin', 20], ['michi', 21], ['calimin', 21]], pre: '¡Los corrales de la plaza son nuestro escondite! ¡Lárgate!', lose: '¡Doña Calima me va a echar una bronca…!' }, GRUNT));
trainer('g4', Object.assign({ name: 'Atracador', team: [['calimazo', 26], ['mosquin', 25]], pre: '¡Esto es un atraco! ¡Que nadie se mueva! ¡Vengo a por… eh… la tercera piña!', lose: '¡Mi primer atraco y me sale fatal!' }, GRUNT));
trainer('g5', Object.assign({ name: 'Vigía', team: [['calimin', 27], ['murcielin', 27]], pre: '¡Alto! ¡Doña Calima está ocupada!', lose: '¡Uf! ¡No le digas que te he dejado pasar!' }, GRUNT));
trainer('g6', Object.assign({ name: 'Vigía', team: [['calimazo', 28], ['mosquin', 27], ['calimin', 28]], pre: '¡Ni un paso más! ¡El cierzo tiene los días contados!', lose: '¡Qué fresquito más desagradable!' }, GRUNT));
trainer('calima', { cls: 'Jefa del Bochorno', name: 'Doña Calima', boss: true, look: LOOK.calima, team: [['calimazo', 31], ['murcielin', 30], ['mosquin', 30], ['bochornazo', 34]], money: 5000, pre: '¡Así que tú eres quien está arruinando mis planes! Con las Tres Piñas y Bochornazo, el cierzo dejará de soplar para siempre. ¡Y en Talayuelas hará un calor de agosto todo el año! ¡JA, JA, JA!', lose: '¡NO! ¡Mi precioso bochorno…! Esto no quedará así… ¡Bochornistas, retirada!' });
function rivalTeam(stage) {
  const me = G.S.flags.starter, riv = me === 'rodenin' ? 'cierzin' : 'rodenin', evo = { rodenin: ['rodenin', 'rodenazo', 'penaskin'], cierzin: ['cierzin', 'cierzote', 'ventarron'] }[riv];
  return [[[evo[0], 5]], [['pardalito', 12], [evo[0], 14]], [['pardalon', 20], ['michi', 19], [evo[1], 22]], [['pardalon', 30], ['michote', 29], ['ranota', 30], [evo[2], 32]]][stage];
}
function xikoTeam() { const me = G.S.flags.starter; const ace = { rodenin: 'hornazo', cierzin: 'hornazo', brasin: 'ventarron' }[me]; return [['tijeron', 36], ['michote', 37], ['tintazo', 37], ['ovejona', 36], ['agujin', 37], [ace, 40]]; }
function toni(stage) { return { id: 'toni' + stage, cls: 'Rival', name: 'Toni', look: LOOK.toni, team: rivalTeam(stage), money: [300, 900, 1800, 3000][stage] }; }

/* ---------------- NPCs del pueblo ---------------- */
function buildPuebloNpcs(m) {
  // obligar a coger Talamón antes de entrar en la hierba alta
  m.enterCheck = (x, y) => { if (!G.S.party.length && getG(m, x, y) === GR.TALL) return async () => { await say('¡Espera! Sin un Talamón propio es muy peligroso meterse en la hierba alta. Primero lleva la carta de la abuela a El Cierzo.'); }; return null; };
  // guardia de Las Peñas
  m.gates = [{ x: 91, y: 20, cond: () => !pasoPenas(), fn: async () => { const n = findNpc('guardia'); if (n) facePlayer(n); await say('Guardia Fermoso: ¡Alto! El camino de Las Peñas está cortado. Hay gente muy rara rondando por allí.'); await say('Guardia Fermoso: Vuelve cuando seas un entrenador de verdad: con las cuatro Medallas de Talayuelas y… bueno, ya me entiendes.'); await playerWalk('down', 1); } }];
  npc(m, { id: 'guardia', name: 'Guardia Fermoso', x: 90, y: 20, dir: 'down', look: LOOK.guardia, when: () => !pasoPenas(), talk: async () => { await say('Guardia Fermoso: Nadie pasa a Las Peñas sin las cuatro Medallas. Órdenes del cuartel.'); if (medals() >= 4 && !piñas()) await say('Guardia Fermoso: Además, dicen que alguien ha robado las Piñas Sagradas de allí arriba… Si las encuentras, tráelas.'); } });
  npc(m, { id: 'guardia2', name: 'Guardia Fermoso', x: 89, y: 20, dir: 'right', look: LOOK.guardia, when: () => pasoPenas(), say: 'Guardia Fermoso: ¡Adelante, campeón! Ten mucho cuidado en Las Peñas. La Banda del Bochorno está allí arriba.' });
  // Plaza España: vecinos fijos
  npc(m, { id: 'abuelo1', name: 'Abuelo Julián', x: 49, y: 48, dir: 'down', look: { hs: 'bald', shirt: '#7a6a5a', pants: '#3a3a3a', hat: 'beanie', hatc: '#5a3a2a' }, say: () => pick(['Abuelo Julián: Yo me siento aquí todas las mañanas a ver pasar los coches de la N-330.', 'Abuelo Julián: ¿Ves a ese Pardalito? Lleva tres días robándome las pipas.', 'Abuelo Julián: En mis tiempos los Talamones se atrapaban con boina, no con gomina.']) });
  npc(m, { id: 'nina1', name: 'Paula', x: 55, y: 45, dir: 'left', wander: 2, look: { hs: 'pony', hair: '#c87a2a', shirt: '#e868a8', pants: '#3a4a6a' }, say: 'Paula: ¡Cuando sea mayor quiero ser Maestra de Talamones como Sara, la del Polideportivo!' });
  npc(m, { id: 'bus', name: 'Conductor', x: 47, y: 43, dir: 'up', look: { hs: 'short', hair: '#3a3a3a', shirt: '#3a6ac8', pants: '#2a2a3a', hat: 'cap', hatc: '#2a3a6a' }, when: () => flag('intro'), say: 'Conductor: El autobús a Cuenca sale a las siete y media. ¡No llegues tarde!' });
  npc(m, { id: 'vecina_cierzo', name: 'Vecina', x: 57, y: 39, dir: 'down', wander: 1, look: { hs: 'long', hair: '#2a1a10', shirt: '#3ac86a', dress: '#3ac86a' }, say: () => flag('starter') ? 'Vecina: Xiko dice que eres su nuevo ayudante. ¡Qué suerte! Él me hizo este peinado.' : 'Vecina: Esa es la barbería El Cierzo. El dueño, Xiko, sabe más de Talamones que nadie en el pueblo.' });
  // eras y rutas: entrenadores
  npc(m, { id: 't_eras1', x: 20, y: 12, dir: 'left', sight: 4, look: TR.eras1.look, trainer: TR.eras1 });
  npc(m, { id: 't_eras2', x: 60, y: 8, dir: 'down', sight: 3, look: TR.eras2.look, trainer: TR.eras2 });
  npc(m, { id: 't_eras3', x: 72, y: 12, dir: 'left', sight: 4, look: TR.eras3.look, trainer: TR.eras3 });
  npc(m, { id: 't_huer1', x: 108, y: 66, dir: 'left', sight: 4, look: TR.huer1.look, trainer: TR.huer1 });
  npc(m, { id: 't_huer2', x: 112, y: 48, dir: 'down', sight: 4, look: TR.huer2.look, trainer: TR.huer2 });
  npc(m, { id: 't_huer3', x: 101, y: 63, dir: 'left', sight: 3, look: TR.huer3.look, trainer: TR.huer3 });
  npc(m, { id: 't_gar1', x: 8, y: 81, dir: 'right', sight: 4, look: TR.gar1.look, trainer: TR.gar1 });
  npc(m, { id: 't_gar2', x: 12, y: 88, dir: 'up', sight: 4, look: TR.gar2.look, trainer: TR.gar2 });
  npc(m, { id: 't_gar3', x: 4, y: 84, dir: 'down', sight: 4, look: TR.gar3.look, trainer: TR.gar3 });
  npc(m, { id: 't_gar4', x: 16, y: 94, dir: 'left', sight: 5, look: TR.gar4.look, trainer: TR.gar4 });
  // Banda del Bochorno y rival
  npc(m, { id: 'g1', x: 53, y: 49, dir: 'left', sight: 3, look: LOOK.bochorno, trainer: TR.g1, when: () => medalOf('balon') && !G.S.tr.g1, });
  TR.g1.after = async () => { await say('Recluta: ¡La jefa, Doña Calima, se va a encargar de que el cierzo no vuelva a soplar nunca más! ¡Ja! ¡Me piro!'); const n = findNpc('g1'); if (n) { await npcWalk(n, 'down', 3, .12); n.hidden = true; } await say('¿Las Piñas Sagradas…? Habrá que avisar a Xiko. Seguro que él sabe qué está pasando.'); setFlag('bochorno_visto'); };
  npc(m, { id: 'g2', x: 114, y: 92, dir: 'left', sight: 3, look: LOOK.bochorno, trainer: TR.g2, when: () => flag('bochorno_visto') && !G.S.tr.g2 });
  TR.g2.after = async () => { await giveItem('pina', 1, 'El Recluta'); setFlag('p1'); await say(`¡Primera Piña Sagrada recuperada! (${piñas()}/3)`); const n = findNpc('g2'); if (n) n.hidden = true; };
  npc(m, { id: 'toni1', x: 92, y: 43, dir: 'left', sight: 4, look: LOOK.toni, trainer: null, when: () => medalOf('balon') && !G.S.tr.toni1 });
  npc(m, { id: 'toni2', x: 96, y: 79, dir: 'down', sight: 3, look: LOOK.toni, trainer: null, when: () => medalOf('tomate') && !G.S.tr.toni2 });
  npc(m, { id: 'toni3', x: 91, y: 14, dir: 'down', sight: 4, look: LOOK.toni, trainer: null, when: () => pasoPenas() && !G.S.tr.toni3 });
  npc(m, { id: 'g5', x: 97, y: 9, dir: 'left', sight: 4, look: LOOK.bochorno, trainer: TR.g5, when: () => pasoPenas() && !flag('calima') });
  npc(m, { id: 'g6', x: 103, y: 9, dir: 'left', sight: 4, look: LOOK.bochorno, trainer: TR.g6, when: () => pasoPenas() && !flag('calima') });
  npc(m, { id: 'calima', x: 109, y: 8, dir: 'down', look: LOOK.calima, when: () => pasoPenas() && !flag('calima'), talk: calimaEvent });
  npc(m, { id: 'talayon', x: 109, y: 6, dir: 'down', look: { hs: 'bald', shirt: '#a08878', pants: '#a08878', skin: '#a08878' }, hidden: true, when: () => false });
  // Tío Paco (fuera, en sus tierras)
  npc(m, { id: 'paco_fuera', name: 'Tío Paco', x: 104, y: 90, dir: 'down', look: LOOK.paco, wander: 1, when: () => !medalOf('tomate'), say: 'Tío Paco: ¡Buenas! Soy el Tío Paco. Si quieres la Medalla Tomate, búscame en mi caseta. ¡Te espero dentro!' });
  // personajes «infinitos»: vecinos que cambian cada vez que vuelves al pueblo
  m.extraNpcs = () => {
    const out = [], spots = [[46, 45], [60, 47], [50, 50], [38, 36], [43, 34], [41, 67], [44, 69], [78, 68], [84, 70], [30, 39], [70, 39], [86, 42], [24, 52], [66, 61], [55, 72], [35, 80], [60, 79], [22, 31], [40, 18], [75, 23], [10, 42], [5, 52], [80, 54], [50, 91]];
    for (const [x, y] of spots) { if (Math.random() < .3) continue; const v = randomVecino(); out.push({ id: 'vec' + x + '_' + y, name: v.name, look: v.look, x, y, dir: pick(['down', 'left', 'right', 'up']), wander: 2, say: v.name + ': ' + v.line }); }
    // entrenador ambulante: equipo al nivel de tu equipo
    if (G.S.party.length) { const lv = Math.max(4, Math.round(G.S.party.reduce((a, b) => a + b.lvl, 0) / G.S.party.length)); const v = randomVecino(); const pool = Object.keys(SPECIES).filter(k => !['talayon', 'bochornazo', 'rodenin', 'cierzin', 'brasin', 'rodenazo', 'cierzote', 'hogazo', 'penaskin', 'ventarron', 'hornazo'].includes(k)); const n = Math.min(3, 1 + (lv / 12 | 0));
      const team = []; for (let i = 0; i < n; i++) team.push([pick(pool), Math.max(3, lv - 2 + i)]); const id = 'amb' + Date.now();
      out.push({ id: 'ambulante', name: v.name, look: v.look, x: 57, y: 50, dir: 'left', wander: 0, talk: async n2 => { if (G.S.tr[id]) { await say(n2.name + ': ¡Qué paliza! Vuelve otro día y te busco otro equipo.'); return; } const r = await ask(n2.name + ': ¡Soy entrenador ambulante! Recorro la Serranía buscando rivales. ¿Luchamos?'); if (r !== 0) { await say(n2.name + ': ¡Otra vez será!'); return; } const T = { id, cls: 'Entrenador', name: n2.name, look: v.look, team, lose: '¡Buen combate! Me voy al siguiente pueblo.' }; const res = await battle({ trainer: T, npc: n2 }); if (res === 'win') G.S.tr[id] = true; } }); }
    return out;
  };
  // puerta del patio de El Cierzo
  m.gates.push({ x: 58, y: 27, cond: () => !flag('patio'), fn: async () => { await say('La puerta del patio de El Cierzo está cerrada con llave. Dentro se oyen tijeras… ¿Talamones?'); } });
  // primer encuentro con la abuela (al llegar en autobús)
  m.onEnter = async () => { if (!flag('intro')) await introBus(); };
  // eventos de rival (los NPCs rival se activan al verte)
  for (const st of [1, 2, 3]) { const n = m.npcs.find(q => q.id === 'toni' + st); n.trainer = { id: 'toni' + st, get name() { return 'Toni'; }, cls: 'Rival', look: LOOK.toni, get team() { return rivalTeam(st); }, money: [0, 900, 1800, 3000][st],
    pre: ['', '¡Eh, tú! ¿Ya tienes la Medalla Balón? ¡Yo también! A ver quién ha entrenado más.', '¡Te estaba esperando en el puente! He estado entrenando en el arroyo. ¡Prepárate!', '¡Así que tú también vas a Las Peñas! Antes de que te enfrentes a esa tal Calima… ¡lucha conmigo!'][st],
    lose: ['', '¡Jo! Has mejorado un montón. ¡Pero la próxima te gano!', '¡Otra vez! ¿Cómo lo haces? Voy a pedirle a Xiko que me corte el pelo como a ti, a ver si es eso.', 'Vale… eres el mejor entrenador del pueblo. Ve y dale su merecido a la Banda del Bochorno. ¡Yo te cubro!'][st],
    after: async () => { const n2 = findNpc('toni' + st); if (n2) { await npcWalk(n2, n2.dir === 'down' ? 'left' : 'down', 4, .14); n2.hidden = true; } } }; }
}
const medalOf = k => G.S.medals.includes(k);
const piñas = () => (flag('p1') ? 1 : 0) + (flag('p2') ? 1 : 0) + (flag('p3') ? 1 : 0);
const pasoPenas = () => medals() >= 4 && piñas() >= 3;
function currentGoal() {
  if (!flag('starter')) return 'Lleva la carta de la abuela a Xiko, en la barbería El Cierzo (Paseo del Prado, junto a la C. Constitución).';
  if (!medalOf('balon')) return 'Ve al Polideportivo Municipal (al oeste del Paseo del Prado) y vence a la Maestra Sara.';
  if (!flag('bici')) return 'Visita a tu abuela en su casa de la C. Real. Tiene algo para ti.';
  if (!G.S.tr.g1) return 'Hay jaleo en la Plaza España. ¡Ve a ver qué pasa!';
  if (!medalOf('tomate')) return 'Cruza al este del pueblo hasta los Huertos La Vega y vence al Tío Paco en su caseta.';
  if (!flag('p1')) return 'Un Bochornista se esconde en los huertos, al sur del arroyo. ¡Recupera la Piña Sagrada!';
  if (!medalOf('capote')) return 'Ve a la Plaza de Toros, al norte del pueblo, y vence a La Morena.';
  if (!flag('p2')) return 'Busca al Bochornista escondido en los corrales de la Plaza de Toros.';
  if (!medalOf('libro')) return 'Ve a la Biblioteca (C. Maestro Pradas) y vence a Don Leandro.';
  if (!flag('p3')) return '¡Están atracando la Caja Rural! Ve a recuperar la tercera Piña Sagrada.';
  if (!flag('calima')) return 'Con las 4 Medallas y las 3 Piñas, el guardia te dejará pasar a Las Peñas (norte de la C. Orellana). ¡Detén a Doña Calima!';
  if (!flag('champ')) return 'Vuelve a El Cierzo. Xiko quiere luchar contra ti: ¡el combate final!';
  return '¡Eres el Campeón de Talayuelas! Completa la Talapedia y explora todo el pueblo.';
}

/* ---------------- Historia: llegada ---------------- */
async function introBus() {
  G.p.dir = 'up'; await sleep(300);
  const ab = { id: 'abuela_intro', name: 'Abuela', look: LOOK.abuela, x: 50, y: 44, px: 50 * 16 + 8, py: 44 * 16 + 14, dir: 'left', mv: null, home: [50, 44] }; G.npcs.push(ab);
  await say('Llegas a Talayuelas en el autobús de la tarde. El cierzo sopla fresquito y huele a pino y a pan recién hecho.');
  await npcWalkTo(ab, 49, 42); facePlayer(ab); G.p.dir = 'right'; bubble(ab, '♥', 1);
  await say(`Abuela: ¡Ay, ${G.S.name}! ¡Pero qué mayor estás! Ven aquí que te dé un abrazo.`);
  await say('Abuela: Este verano lo vas a pasar conmigo en el pueblo. Ya verás qué bien: aquí hay Talamones por todas partes.');
  await say('Abuela: Mira, toma esta carta. Llévasela a Xiko, el de la barbería El Cierzo. Está aquí mismo, en el Paseo del Prado, cruzando la carretera.');
  addItem('carta'); Audio.sfx('item'); await say('Recibes la Carta de la Abuela.');
  await say('Abuela: Yo me voy a casa, que tengo el cocido al fuego. Vivo en la calle Real, ¡no te pierdas! ¡Y mira bien antes de cruzar la carretera!');
  await npcWalkTo(ab, 49, 52, .16); ab.hidden = true; setFlag('intro'); G.S.heal = ['abuela', 4, 4];
  await say('Consejo: Abre el MENÚ para ver tu objetivo, tu mochila y guardar la partida.');
}

/* ---------------- El Cierzo (interior) ---------------- */
const CIERZO = room('cierzo', 14, 10, { out: ['pueblo', 58, 39], exit: 6, wall: '#e9e6e0', floor: GR.GREYF, pics: [[1, 'escudo'], [9, 'tatus']], music: 'casa', name: 'El Cierzo' });
CIERZO.build = m => {
  for (const x of [2, 5, 8]) { prop(m, x, 2, 'espejo'); prop(m, x, 3, 'silla'); }
  prop(m, 11, 3, 'tatu', { bw: 2 }); prop(m, 12, 2, 'estante', { v: 2 }); prop(m, 1, 7, 'maceta'); prop(m, 12, 7, 'maceta');
  prop(m, 4, 6, 'mesa', { bw: 1 }); prop(m, 6, 6, 'mesa'); prop(m, 8, 6, 'mesa');
  sign(m, 2, 4, 'Un sillón de barbero dorado y negro. ¡Qué elegancia!'); sign(m, 5, 4, 'Un sillón de barbero. Huele a after shave.'); sign(m, 8, 4, 'Un sillón de barbero recién limpiado.');
  sign(m, 11, 4, 'La zona de tatuaje de Xiko. Hay dibujos de Talamones por todas partes.');
  npc(m, { id: 'xiko', name: 'Xiko', x: 6, y: 4, dir: 'down', look: LOOK.xiko, talk: xikoTalk });
  // botes de gomina con los tres Talamones (sobre las mesas)
  [['rodenin', 4], ['cierzin', 6], ['brasin', 8]].forEach(([id, x]) => { prop(m, x, 6, 'objeto', { block: false, dy: 1, lift: 9 }); sign(m, x, 6, async () => { await chooseStarter(id); return ''; }); });
  m.onEnter = async () => { if (flag('carta_dada') && !flag('starter')) return; if (G.S.bag.carta && !flag('carta_dada')) await xikoCarta(); };
};
async function xikoCarta() {
  const x = findNpc('xiko'); await sleep(250); bubble(x, '!', .8); await sleep(600);
  await say('Xiko: ¡Hombre! ¡Bienvenido a El Cierzo! ¿Vienes a cortarte el pelo o a hacerte un tatuaje?');
  await say(`${G.S.name}: (Le das la carta de la abuela.)`); delete G.S.bag.carta;
  await say('Xiko: A ver… «Querido Xiko: este verano viene mi nieto. Quiere conocer a los Talamones. Cuídamelo, que tú sabes más que nadie…»');
  await say('Xiko: ¡Ja, ja! Tu abuela es la mejor clienta que tengo. Bueno, pues encantado. Yo soy Xiko: barbero, tatuador… y experto en Talamones.');
  await say('Xiko: Los Talamones son criaturas que viven por todo Talayuelas: en las eras, en los huertos, en el arroyo… ¡hasta en las farolas!');
  await say('Xiko: La gente del pueblo los cría, los entrena y combate con ellos. Y los mejores son los cuatro Maestros del pueblo.');
  await say('Xiko: Mira, ahí en las mesas tengo tres botes de gomina. Dentro hay tres Talamones jóvenes que necesitan entrenador. ¡Elige el que más te guste!');
  setFlag('carta_dada');
}
async function chooseStarter(id) {
  if (flag('starter')) { const t = G.S.flags.starter === id ? 'Es el bote vacío de tu Talamón.' : id === G.S.flags.rival ? 'El bote que se llevó Toni. Está vacío.' : 'Un bote de gomina con un Talamón dentro. Es de Xiko.'; await say(t); return; }
  if (!flag('carta_dada')) { await say('Un bote de gomina con algo moviéndose dentro… Mejor habla primero con el dueño.'); return; }
  const sp = SPECIES[id], tipo = sp.t.map(t => TYPES[t].n).join(' y ');
  const S = new Screen({ upd() { }, drw(x) { x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 0, W, H); panel(x, W / 2 - 150, 30, 300, 300, { r: 24 }); drawMonIcon(x, id, W / 2, 180 + Math.sin(G.t * 3) * 4, 250); } }); G.ui.push(S);
  const desc = { rodenin: 'Rodenín: Una piedrecita de rodeno con un pino por tupé. Duro como una peña y muy presumido.', cierzin: 'Cierzín: Una nubecita del viento cierzo, siempre con su bufanda. Rápido y fresquito.', brasin: 'Brasín: Nació en el horno del pueblo y huele a pan recién hecho. ¡Pura energía!' }[id];
  await say(desc); const r = await ask(`¿Te quedas con ${sp.n}, el Talamón de tipo ${tipo}?`); closeUI(S);
  if (r !== 0) return;
  const m = await giveMon(id, 5); setFlag('starter', id); Audio.sfx('catch');
  await say(`¡Ya tienes tu primer Talamón: ${sp.n}!`);
  await say(`Xiko: ¡Buena elección! Se nota que ${sp.n} y tú vais a hacer buen equipo.`);
  // llega Toni
  const toniN = { id: 'toni0', name: 'Toni', look: LOOK.toni, x: 6, y: 9, px: 6 * 16 + 8, py: 9 * 16 + 14, dir: 'up', mv: null, home: [6, 9] }; G.npcs.push(toniN);
  Audio.sfx('door'); await sleep(300); await say('¿?: ¡Xiko! ¡Xiko! ¿Es verdad que regalas Talamones? ¡Yo también quiero uno!');
  await npcWalkTo(toniN, 6, 7); toniN.dir = 'up';
  await say('Xiko: ¡Toni! Este es Toni, el nieto del panadero. Siempre llega tarde a todo… Venga, coge uno de los que quedan.');
  const riv = id === 'rodenin' ? 'cierzin' : 'rodenin'; setFlag('rival', riv);
  await say(`Toni: ¡Pues yo me quedo con ${SPECIES[riv].n}! ¡Es justo el que necesito para ganarte!`);
  toniN.dir = 'left'; facePlayer(toniN); await say(`Toni: Oye, ¿${G.S.name}, no? ¡Vamos a probar nuestros Talamones! ¡Ahora mismo!`);
  const res = await battle({ trainer: { id: 'toni0', cls: 'Rival', name: 'Toni', look: LOOK.toni, team: [[riv, 5]], money: 300, lose: '¿Qué? ¡Pero si lo he elegido yo! Bueno… la próxima vez te gano seguro.' }, npc: toniN, noLose: true });
  if (res === 'lose') { await healParty(); await say('Toni: ¡Ja! ¡He ganado! Bueno, no te desanimes, que es tu primer combate.'); }
  G.S.tr.toni0 = true; await healParty();
  await say('Xiko: ¡Qué combate! Toma, para empezar con buen pie.');
  setFlag('talapedia'); addItem('talapedia'); Audio.sfx('item'); await say('Recibes la Talapedia. Anota todos los Talamones que veas y captures.');
  await giveItem('gomina', 5, 'Xiko');
  await say('Xiko: Con las gominas puedes atrapar Talamones salvajes. Debilítalos un poco y ¡zas!, gomina al canto.');
  await say('Xiko: En Talayuelas hay cuatro Maestros: Sara en el Polideportivo, el Tío Paco en los Huertos La Vega, La Morena en la Plaza de Toros y Don Leandro en la Biblioteca.');
  await say('Xiko: Gánales a los cuatro y consigue sus Medallas. Cuando lo hagas… vuelve aquí. Te estaré esperando.');
  await say('Toni: ¡Yo las voy a conseguir antes que tú! ¡Hasta luego!'); await npcWalkTo(toniN, 6, 9, .12); toniN.hidden = true;
  await say('Xiko: Y si tus Talamones se cansan, pasa por el Centro de Salud o por casa de tu abuela. ¡Suerte!');
  void m;
}
async function xikoTalk() {
  if (!flag('carta_dada')) { await xikoCarta(); return; }
  if (!flag('starter')) { await say('Xiko: ¡Venga, elige uno de los tres botes de las mesas! No tengas miedo, que no muerden. Bueno, Brasín un poco.'); return; }
  if (medalOf('balon') && !flag('patio')) { await say('Xiko: ¡La Medalla Balón! Sabía que lo conseguirías. Toma, la llave de mi patio trasero.'); setFlag('patio'); Audio.sfx('item'); await say('Recibes la Llave del Patio. Está en la C. Goya, detrás de El Cierzo.'); await say('Xiko: Ahí viven Talamones muy raros: Tijerines, Peinecillos, Tintorros… Se escapan de la barbería y del estudio de tatuaje. ¡Atrapa los que quieras!'); return; }
  if (flag('bochorno_visto') && !flag('xiko_piñas')) { setFlag('xiko_piñas'); await say('Xiko: ¿La Banda del Bochorno? ¿Las Tres Piñas Sagradas de Las Peñas? Esto es muy grave…'); await say('Xiko: Cuenta la leyenda que en Las Peñas vive Talayón, el guardián que sopla el cierzo. Las Tres Piñas le dan su fuerza.'); await say('Xiko: Si se las llevan, el cierzo dejará de soplar y en Talayuelas hará un calor espantoso. ¡Tienes que recuperarlas!'); return; }
  if (flag('calima') && !flag('champ')) { await xikoFinal(); return; }
  if (flag('champ')) { await say(pick(['Xiko: ¡Mi campeón! ¿Te corto el pelo? Invita la casa.', 'Xiko: ¿Ya has completado la Talapedia? En Las Peñas aún quedan Talamones muy raros.', 'Xiko: Cuando quieras te hago un tatuaje de Rodenín. ¡Queda genial en el brazo!'])); return; }
  await say('Xiko: ' + currentGoal().replace(/^/, 'Tu próximo objetivo: '));
  if (G.S.party.some(m => m.hp < m.mhp) && await ask('Xiko: ¿Quieres que tus Talamones descansen en los sillones un ratito?') === 0) { await healParty(); Audio.sfx('heal'); await say('Xiko: ¡Listo! Como nuevos. Y con el pelo impecable.'); }
}
async function xikoFinal() {
  await say('Xiko: Así que has derrotado a Doña Calima y has devuelto el cierzo a Talayuelas… Todo el pueblo habla de ti.');
  await say('Xiko: ¿Sabes? Hace muchos años yo fui el Campeón de Talayuelas. Y desde entonces nadie me ha ganado.');
  const r = await ask('Xiko: Es hora de comprobar si el alumno ha superado al maestro. ¿Estás listo para el combate final?');
  if (r !== 0) { await say('Xiko: Tómate tu tiempo. Prepara bien a tu equipo. Aquí te espero.'); return; }
  await say('Xiko: ¡Pues adelante! ¡Esta vez no me voy a cortar… ni un pelo!');
  const res = await battle({ trainer: { id: 'xiko', cls: 'Campeón', name: 'Xiko', leader: true, look: LOOK.xiko, team: xikoTeam(), money: 10000, lose: '¡Increíble! El alumno ha superado al maestro. ¡Eres el nuevo Campeón de Talayuelas!' }, npc: findNpc('xiko') });
  if (res !== 'win') return;
  setFlag('champ'); await healParty(); await say('Xiko: Toma, te lo has ganado: la Gomina Maestra. La gomina secreta de El Cierzo. Nunca falla.'); addItem('gominamaestra'); Audio.sfx('item');
  await creditos();
}
async function creditos() {
  Audio.play('victoria'); const lines = ['¡ENHORABUENA!', `${G.S.name}, Campeón de Talayuelas`, '', 'TheTalaVillage', 'Una aventura de El Cierzo · Tattoo & Barber Shop', 'Talayuelas · Serranía de Cuenca', '', 'Gracias a todos los vecinos', 'por inspirar a cada Talamón', '', '¡El cierzo vuelve a soplar!'];
  const t0 = G.t; const S = new Screen({ upd() { if ((G.t - t0 > 4 && (Input.pressed('a') || Input.pressed('b'))) || this._t) closeUI(this); }, drw(x) { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a2a5a'); g.addColorStop(1, '#4a6aa8'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    const e = G.t - t0; x.globalAlpha = Math.min(1, e); drawMonIcon(x, 'rodenin', 130, 380, 160); drawMonIcon(x, 'talayon', 670, 360, 200); x.globalAlpha = 1;
    lines.forEach((l, i) => txt(x, l, W / 2, 80 + i * 34 - Math.max(0, e - 3) * 0, { s: i === 0 ? 36 : i === 3 ? 30 : 21, a: 'center', c: i === 0 ? '#ffe14a' : '#fff', shc: 'rgba(0,0,0,.5)' }));
    if (e > 4) txt(x, 'Pulsa A para continuar', W / 2, H - 20, { s: 16, a: 'center', c: '#cfe0ff', sh: false }); zone(0, 0, W, H, () => { if (G.t - t0 > 4) this._t = true; }); } });
  await pushUI(S); Audio.play(G.map.music); await say('¡Tu aventura continúa! Sigue explorando Talayuelas y completa la Talapedia.'); await saveGame();
}

/* ---------------- Doña Calima y Talayón ---------------- */
async function calimaEvent(n) {
  if (!G.S.tr.g5 || !G.S.tr.g6) { await say('Doña Calima: ¿Cómo has llegado hasta aquí? ¡Vigías! ¿Dónde están mis vigías? (Derrota primero a sus vigías.)'); return; }
  const res = await trainerBattle(Object.assign({}, n, { trainer: TR.calima })); if (res !== 'win') return;
  await say('Doña Calima: ¡Bochornistas! ¡Nos vamos! ¡Pero volveremos el próximo agosto!'); n.hidden = true; setFlag('calima');
  await say('Colocas las Tres Piñas Sagradas sobre Las Peñas… Las piñas empiezan a brillar con una luz dorada.'); delete G.S.bag.pina;
  G.flash = 1; Audio.sfx('evo'); await sleep(1200); G.shake = .6; await say('¡El suelo tiembla! ¡Un viento helado baja de lo alto de las peñas!');
  await talayonEncounter();
}
async function talayonEncounter() {
  if (G.S.caught.talayon || flag('talayon_out')) return;
  Audio.play('leyenda'); await say('¡¡¡TALAYÓÓÓN!!!');
  const res = await battle({ wild: makeMon('talayon', 40), legend: true });
  if (res === 'caught') { setFlag('talayon_out'); await say('¡Has atrapado a Talayón, el guardián de Las Peñas! El cierzo sopla de nuevo sobre Talayuelas.'); }
  else if (res === 'win') { await say('Talayón se retira a lo alto de las peñas a descansar. Puede que vuelva a aparecer si regresas por aquí…'); }
  await say('Xiko te estará esperando en El Cierzo. ¡Ve a contárselo!');
}
PUEBLO.trig = PUEBLO.trig || {};
for (const [a, b] of [[108, 7], [109, 7], [110, 7], [109, 9], [108, 9], [110, 9]]) trig(PUEBLO, a, b, async () => { if (flag('calima') && !G.S.caught.talayon && !flag('talayon_out') && !flag('talayon_seen_now')) { setFlag('talayon_seen_now'); await say('Sientes una presencia enorme entre las peñas…'); await talayonEncounter(); G.S.flags.talayon_seen_now = false; } });

/* ---------------- Interiores del pueblo ---------------- */
const SALUD = room('salud', 11, 8, { out: ['pueblo', 30, 39], exit: 5, wall: '#eef6f2', floor: GR.TILE, pics: [[1, 'ventana'], [8, 'cartel']], text: 'SALUD', name: 'Centro de Salud' });
SALUD.build = m => { prop(m, 3, 3, 'mostrador', { bw: 3, ox: 8 }); prop(m, 9, 3, 'camilla', { bw: 2, ox: -8 }); prop(m, 1, 6, 'maceta'); prop(m, 9, 6, 'maceta'); prop(m, 7, 5, 'banco');
  npc(m, { id: 'carmen', name: 'Enfermera Carmen', x: 5, y: 2, dir: 'down', look: LOOK.enfermera, talk: async () => { G.S.heal = ['salud', 5, 4]; await say('Enfermera Carmen: ¡Bienvenido al Centro de Salud de Talayuelas! ¿Quieres que cuide de tus Talamones?'); if (await ask('¿Curar a tus Talamones?') === 0) { await fadeOut(); await healParty(); Audio.sfx('heal'); await sleep(1300); await fadeIn(); await say('Enfermera Carmen: ¡Ya están como nuevos! Abrigaditos, que el cierzo no perdona. ¡Vuelve cuando quieras!'); } else await say('Enfermera Carmen: Aquí estaré, criatura.'); } });
  m.counters['5,3'] = [5, 2]; m.counters['4,3'] = [5, 2]; m.counters['6,3'] = [5, 2];
  npc(m, { id: 'paciente', name: 'Señor Goyo', x: 8, y: 5, dir: 'left', look: { hs: 'bald', shirt: '#7a6a5a', pants: '#3a3a3a', stache: '#d8d8d8' }, say: 'Señor Goyo: Vengo por la rodilla, ¿sabes? Pero me quedo por la tertulia.' }); };
const CAJA = room('caja', 9, 7, { out: ['pueblo', 22, 39], exit: 4, wall: '#e6ece6', floor: GR.TILE, pics: [[1, 'reloj'], [5, 'cuadro']], name: 'Caja Rural' });
CAJA.build = m => { prop(m, 3, 3, 'mostrador', { bw: 3, ox: 8 }); prop(m, 7, 2, 'pc');
  npc(m, { id: 'cajero', name: 'Empleado', x: 4, y: 2, dir: 'down', look: { hs: 'short', hair: '#2a2a2a', shirt: '#f4f4f4', pants: '#2a2a3a', glasses: '#2a2a2a' }, talk: async () => { await say('Empleado: Bienvenido a la Caja Rural. Aquí guardamos los Talamones que no lleves en tu equipo. ¡Sin comisiones!'); await boxScreen(); } });
  m.counters['4,3'] = [4, 2]; m.counters['3,3'] = [4, 2]; m.counters['5,3'] = [4, 2];
  sign(m, 7, 3, async () => { await boxScreen(); return ''; });
  npc(m, { id: 'g4', x: 6, y: 4, dir: 'left', sight: 2, look: LOOK.bochorno, trainer: TR.g4, when: () => medalOf('libro') && !G.S.tr.g4 });
  TR.g4.after = async () => { await giveItem('pina', 1, 'El Atracador'); setFlag('p3'); await say(`¡Tercera Piña Sagrada recuperada! (${piñas()}/3)`); const n = findNpc('g4'); if (n) n.hidden = true; await say('Empleado: ¡Gracias! Avisaré a la Guardia Civil. Seguro que ahora te dejan pasar a Las Peñas.'); }; };
const SUPER = room('super', 12, 8, { out: ['pueblo', 49, 61], exit: 6, wall: '#f4f2ea', floor: GR.TILE, pics: [[5, 'cartel']], text: 'OFERTAS', name: 'Supermercado' });
SUPER.build = m => { prop(m, 2, 3, 'mostrador', { bw: 3, ox: 8 }); for (const x of [6, 8, 10]) prop(m, x, 3, 'estante', { v: x }); prop(m, 10, 6, 'nevera'); prop(m, 7, 6, 'estante', { v: 9 });
  npc(m, { id: 'cajera', name: 'Cajera', x: 2, y: 2, dir: 'down', look: LOOK.cajera, talk: async () => { await say('Cajera: ¡Hola! ¿Qué te pongo hoy?'); const st = ['gomina', 'locion', 'remedio', 'colonia']; if (medals() >= 1) st.push('supergomina', 'aftershave', 'peine'); if (medals() >= 3) st.push('hipergomina', 'balsamo', 'caramelo'); await shopScreen(st, 'Cajera'); } });
  m.counters['2,3'] = [2, 2]; m.counters['1,3'] = [2, 2]; m.counters['3,3'] = [2, 2];
  npc(m, { id: 'cliente', name: 'Vecina', x: 8, y: 5, dir: 'up', wander: 1, look: { hs: 'bun', hair: '#5a3a20', shirt: '#e8a020', dress: '#7a4ab8' }, say: 'Vecina: ¡Las gominas están de oferta! Bueno, como siempre.' }); };
const HORNO = room('horno', 9, 7, { out: ['pueblo', 27, 29], exit: 4, wall: '#f0e2c8', floor: GR.TILE, name: 'Horno' });
HORNO.build = m => { prop(m, 6, 3, 'horno', { bw: 2, ox: 8 }); prop(m, 2, 3, 'mostrador', { bw: 2 });
  npc(m, { id: 'panadero', name: 'Panadero Luis', x: 2, y: 2, dir: 'down', look: LOOK.panadero, talk: async () => { if (!flag('pan')) { setFlag('pan'); await say('Panadero Luis: ¡Hombre! ¿Tú eres el que le ganó a mi nieto Toni? ¡Ja! Le viene bien perder de vez en cuando.'); await giveItem('pan', 3, 'El panadero'); await say('Panadero Luis: Pan de leña. Si tus Talamones se lo comen, recuperan fuerzas. ¡Y está buenísimo!'); } else await say(pick(['Panadero Luis: El secreto del pan es el horno de leña… y madrugar mucho.', 'Panadero Luis: Los Brasín nacen en hornos como este. ¡A veces salen de la masa!'])); } });
  m.counters['2,3'] = [2, 2]; m.counters['1,3'] = [2, 2]; };
const ABUELA = room('abuela', 9, 7, { out: ['pueblo', 43, 79], exit: 4, wall: '#f2e6d0', floor: GR.WOOD, pics: [[1, 'ventana'], [4, 'cuadro'], [7, 'reloj']], name: 'Casa de la abuela' });
ABUELA.build = m => { prop(m, 1, 3, 'cama', { bh: 2 }); prop(m, 5, 3, 'mesa', { bw: 2, ox: 8 }); prop(m, 7, 2, 'estante', { v: 3 }); prop(m, 7, 5, 'maceta');
  sign(m, 1, 5, async () => { if (await ask('Es tu cama. ¿Quieres descansar un rato?') === 0) { await fadeOut(); await healParty(); Audio.sfx('heal'); await sleep(1000); await fadeIn(); G.S.heal = ['abuela', 4, 4]; await say('Duermes como un tronco. ¡Tus Talamones están como nuevos!'); } return ''; });
  npc(m, { id: 'abuela', name: 'Abuela', x: 4, y: 3, dir: 'down', look: LOOK.abuela, when: () => flag('intro'), talk: abuelaTalk }); };
async function abuelaTalk() {
  G.S.heal = ['abuela', 4, 4];
  if (!flag('starter')) { await say('Abuela: ¿Ya le has dado la carta a Xiko? Está en El Cierzo, en el Paseo del Prado, al lado de la calle Constitución.'); return; }
  if (medalOf('balon') && !flag('bici')) { setFlag('bici'); await say('Abuela: ¡Una medalla! ¡Ay, mi niño, que vas a ser campeón! Toma, la bici de tu abuelo. Con ella irás volando por el pueblo.'); addItem('bici'); Audio.sfx('item'); await say('Recibes la Bici del Abuelo. Úsala desde la Mochila (objetos clave).'); }
  const n = G.S.medals.length; const k = 'bizcocho' + n; if (n > 0 && !flag(k)) { setFlag(k); await say('Abuela: Y toma un trocito de bizcocho para tus Talamones, que están muy delgados.'); await giveItem('bizcocho', 1, 'La abuela'); }
  await say(pick(['Abuela: ¿Has comido? ¿Seguro? Pues come otra vez.', 'Abuela: Abrígate, que aquí por las noches refresca aunque sea verano.', 'Abuela: Cuando te canses, échate en tu cama y descansa. Tus Talamones también lo agradecerán.', 'Abuela: Saluda a Xiko de mi parte. ¡Qué buen chico es!']));
  await healParty(); Audio.sfx('heal'); await say('La abuela cuida de tus Talamones. ¡Están como nuevos!');
}
const BAR = room('bar', 12, 8, { out: ['pueblo', 39, 61], exit: 6, wall: '#e8d4b8', floor: GR.WOOD, pics: [[1, 'cuadro'], [9, 'reloj']], name: 'Bar Parrilla' });
BAR.build = m => { prop(m, 6, 3, 'barra', { bw: 4, ox: 0 }); for (const [a, b] of [[2, 5], [9, 5]]) prop(m, a, b, 'mesa', { bw: 2, ox: 8 });
  npc(m, { id: 'camarero', name: 'Camarero', x: 6, y: 2, dir: 'down', look: { hs: 'short', hair: '#2a2a2a', shirt: '#f4f4f4', apron: '#2a2a2a', stache: '#2a2a2a' }, say: () => pick(['Camarero: ¿Qué va a ser? ¿Un zumito? Las bravas de aquí son famosas en toda la Serranía.', 'Camarero: Los abuelos del rincón juegan al guiñote y a los Talamones. ¡Y hacen trampas en los dos!']) });
  m.counters['6,3'] = [6, 2]; m.counters['5,3'] = [6, 2]; m.counters['7,3'] = [6, 2];
  npc(m, { id: 't_bar1', x: 2, y: 4, dir: 'right', sight: 2, look: TR.bar1.look, trainer: TR.bar1 }); npc(m, { id: 't_bar2', x: 10, y: 4, dir: 'left', sight: 2, look: TR.bar2.look, trainer: TR.bar2 }); };
const CAFE = room('cafe', 10, 7, { out: ['pueblo', 39, 51], exit: 5, wall: '#e2d8c8', floor: GR.WOOD, pics: [[1, 'ventana'], [6, 'cuadro']], name: 'Café Bar' });
CAFE.build = m => { prop(m, 5, 3, 'barra', { ox: 0, bw: 4 }); prop(m, 2, 5, 'mesa', { bw: 2, ox: 8 });
  npc(m, { id: 'camarera', name: 'Camarera', x: 5, y: 2, dir: 'down', look: { hs: 'pony', hair: '#c87a2a', shirt: '#3a8a5a', apron: '#2a2a2a' }, talk: async () => { if (!flag('cafe')) { setFlag('cafe'); await say('Camarera: ¡Hola, guapo! Toma un Remedio de la Abuela, que dicen que tus Talamones vienen de pelear.'); await giveItem('remedio', 2, 'La camarera'); } else await say('Camarera: Un cafetito por la mañana y el cierzo se lleva todas las penas.'); } });
  m.counters['5,3'] = [5, 2]; m.counters['4,3'] = [5, 2];
  npc(m, { id: 'cafe2', name: 'Lector', x: 2, y: 4, dir: 'right', look: { hs: 'grey', hair: '#bdbdbd', shirt: '#4a6a8a', glasses: '#2a2a2a' }, say: 'Lector: Dice el periódico que la Banda del Bochorno quiere acabar con el cierzo. ¡Qué disparate! ¿Qué será de Talayuelas sin su viento?' }); };
const PELU = room('peluqueria', 9, 7, { out: ['pueblo', 22, 51], exit: 4, wall: '#f6e2ee', floor: GR.TILE, pics: [[1, 'cuadro'], [6, 'cuadro']], name: 'Peluquería' });
PELU.build = m => { for (const x of [2, 5]) { prop(m, x, 2, 'espejo'); prop(m, x, 3, 'silla'); }
  npc(m, { id: 'peluquera', name: 'Peluquera', x: 7, y: 3, dir: 'left', look: LOOK.peluquera, talk: async () => { if (!flag('peine')) { setFlag('peine'); await say('Peluquera: ¿Vienes de parte de Xiko? ¡Ese ladrón de clientes! Je, je, es broma: somos amigos.'); await say('Peluquera: Mira, toma este Peine Mágico. Si un Talamón se debilita, se lo pasas por la cabeza y como nuevo.'); await giveItem('peine', 1, 'La peluquera'); } else await say(pick(['Peluquera: Aquí peinamos a todo el pueblo. Y a sus Talamones, si se dejan.', 'Peluquera: ¿Un Peinecillo? ¡Esos bichos me roban los peines!'])); } }); };
const CARNE = room('carniceria', 8, 6, { out: ['pueblo', 58, 61], exit: 4, wall: '#f4f4f0', floor: GR.TILE, tiles: true, name: 'Carnicería' });
CARNE.build = m => { prop(m, 3, 3, 'mostrador', { bw: 3, ox: 8 });
  npc(m, { id: 'carnicero', name: 'Carnicero', x: 4, y: 2, dir: 'down', look: LOOK.carnicero, talk: async () => { if (!flag('carne')) { setFlag('carne'); await say('Carnicero: ¡Buenas! El Michi gordo que ves por la plaza es mío. Bueno, él cree que yo soy suyo.'); await giveItem('colonia', 2, 'El carnicero'); await say('Carnicero: Colonia Fuerte: echas un poco y los Talamones salvajes no se te acercan. Lo uso para que los Michis no me roben los chorizos.'); } else await say('Carnicero: El mejor jamón de la Serranía. Y el mejor chorizo. Y la mejor morcilla. Y…'); } });
  m.counters['4,3'] = [4, 2]; m.counters['3,3'] = [4, 2]; m.counters['5,3'] = [4, 2]; };
const REST = room('restaurante', 11, 7, { out: ['pueblo', 69, 39], exit: 5, wall: '#efe0cc', floor: GR.WOOD, pics: [[2, 'cuadro'], [7, 'ventana']], name: 'Restaurante' });
REST.build = m => { for (const [a, b] of [[2, 3], [7, 3], [2, 5], [7, 5]]) prop(m, a, b, 'mesa', { bw: 2, ox: 8 });
  npc(m, { id: 'chef', name: 'Cocinera Albina', x: 5, y: 3, dir: 'down', look: LOOK.chef, talk: async () => { if (medalOf('tomate') && !flag('chef')) { setFlag('chef'); await say('Cocinera Albina: ¡Tú le ganaste al Tío Paco! Sus tomates son los que uso para el pisto. Toma, por las molestias.'); await giveItem('supergomina', 3, 'La cocinera'); } else await say(pick(['Cocinera Albina: Hoy tenemos ajoarriero, gazpacho manchego y morteruelo. ¡Comida de la Serranía!', 'Cocinera Albina: Los Ajetes del huerto dan un sabor buenísimo. Pero no se dejan coger fácilmente.'])); } });
  npc(m, { id: 'comensal', name: 'Comensal', x: 8, y: 4, dir: 'left', look: { hs: 'short', hair: '#5a3a20', shirt: '#3a5a8a', pants: '#2a2a3a' }, say: 'Comensal: He venido desde Cuenca solo por el morteruelo. ¡Merece la pena!' }); };
const CUARTEL = room('cuartel', 10, 7, { out: ['pueblo', 84, 39], exit: 4, wall: '#e8e8e0', floor: GR.TILE, pics: [[1, 'escudo'], [6, 'cartel']], text: 'GUARDIA CIVIL', name: 'Cuartel' });
CUARTEL.build = m => { prop(m, 4, 3, 'mostrador', { bw: 3, ox: 8 }); prop(m, 8, 2, 'estante', { v: 1 });
  npc(m, { id: 'sargento', name: 'Sargento Moya', x: 5, y: 2, dir: 'down', look: LOOK.guardia, talk: async () => { if (medalOf('capote') && !flag('cuartel')) { setFlag('cuartel'); await say('Sargento Moya: Nos han informado de que estás plantando cara a la Banda del Bochorno. Buen trabajo, chaval.'); await giveItem('aftershave', 3, 'El sargento'); } else await say(pick(['Sargento Moya: Mantenemos el orden en Talayuelas desde hace más de cien años.', 'Sargento Moya: El camino de Las Peñas está cerrado. Solo pasarán los entrenadores con las cuatro Medallas.'])); } });
  m.counters['5,3'] = [5, 2]; m.counters['4,3'] = [5, 2]; m.counters['6,3'] = [5, 2]; };
const TALLER = room('taller', 10, 7, { out: ['pueblo', 85, 23], exit: 4, wall: '#cfcac0', floor: GR.GREYF, name: 'Taller Mecánico' });
TALLER.build = m => { prop(m, 3, 3, 'coche', { v: 0, bw: 2 }); prop(m, 8, 2, 'estante', { v: 4 });
  npc(m, { id: 't_taller', x: 6, y: 4, dir: 'left', sight: 3, look: TR.taller1.look, trainer: TR.taller1 }); };
const RURAL = room('casarural', 11, 7, { out: ['pueblo', 24, 72], exit: 5, wall: '#efe2c8', floor: GR.WOOD, pics: [[1, 'ventana'], [5, 'escudo'], [8, 'ventana']], name: 'Casa Rural' });
RURAL.build = m => { prop(m, 1, 3, 'cama', { bh: 2 }); prop(m, 9, 3, 'cama', { bh: 2 }); prop(m, 5, 3, 'mesa', { bw: 2, ox: 8 });
  npc(m, { id: 't_rural1', x: 3, y: 4, dir: 'right', sight: 3, look: TR.rural1.look, trainer: TR.rural1 }); npc(m, { id: 't_rural2', x: 8, y: 5, dir: 'left', sight: 3, look: TR.rural2.look, trainer: TR.rural2 }); };
const CASETA = room('caseta', 8, 6, { out: ['pueblo', 108, 88], exit: 4, wall: '#d8c8a8', floor: GR.WOOD, pics: [[1, 'ventana']], music: 'casa', name: 'Caseta del Tío Paco' });
CASETA.build = m => { prop(m, 6, 2, 'estante', { v: 7 }); prop(m, 1, 3, 'maceta'); prop(m, 2, 3, 'maceta');
  npc(m, { id: 'paco', name: 'Tío Paco', x: 4, y: 2, dir: 'down', look: LOOK.paco, talk: async n => { if (!medalOf('balon')) { await say('Tío Paco: ¿Tú quieres luchar conmigo? ¡Ja! Primero ve a por la Medalla Balón del Polideportivo, criatura.'); return; } if (medalOf('tomate')) { await say('Tío Paco: ¡Tienes mano para los Talamones! Si algún día te cansas de luchar, aquí tienes trabajo en la huerta.'); return; } const r = await trainerBattle(Object.assign({}, n, { trainer: TR.paco })); if (r === 'win') await medalGet('tomate', 'Tío Paco'); } }); };
const POLI = room('poli', 14, 12, { out: ['pueblo', 8, 51], exit: 7, wall: '#dfe6ee', floor: GR.COURT, pics: [[2, 'ventana'], [6, 'cartel'], [11, 'ventana']], text: 'POLIDEPORTIVO', music: 'ruta', name: 'Polideportivo' });
POLI.build = m => { m.courtX0 = 1; m.courtX1 = 12; m.courtY0 = 2; m.courtY1 = 10; m.courtMid = -1; prop(m, 7, 3, 'portería', { block: false, flatSort: true });
  for (const [a, b] of [[1, 5], [12, 5], [1, 8], [12, 8]]) prop(m, a, b, 'banco');
  npc(m, { id: 't_poli1', x: 4, y: 7, dir: 'right', sight: 4, look: TR.poli1.look, trainer: TR.poli1 }); npc(m, { id: 't_poli2', x: 10, y: 5, dir: 'left', sight: 4, look: TR.poli2.look, trainer: TR.poli2 });
  npc(m, { id: 'sara', name: 'Maestra Sara', x: 7, y: 2, dir: 'down', look: LOOK.sara, talk: async n => { if (medalOf('balon')) { await say('Maestra Sara: ¡Sigue entrenando! El siguiente Maestro es el Tío Paco, en los Huertos La Vega, al este.'); return; } const r = await trainerBattle(Object.assign({}, n, { trainer: TR.sara })); if (r === 'win') await medalGet('balon', 'Maestra Sara'); } }); };
const BIBLIO = room('biblio', 14, 12, { out: ['pueblo', 53, 72], exit: 7, wall: '#e6dcc8', floor: GR.CARPET, pics: [[2, 'cuadro'], [6, 'reloj'], [10, 'cuadro']], music: 'casa', name: 'Biblioteca' });
BIBLIO.build = m => { for (const y of [4, 7]) for (const x of [1, 3, 9, 11]) prop(m, x, y, 'libros', { bw: 2, ox: 8 }); prop(m, 10, 9, 'mesa', { bw: 2, ox: 8 });
  npc(m, { id: 't_bib1', x: 5, y: 6, dir: 'down', sight: 3, look: TR.bib1.look, trainer: TR.bib1 }); npc(m, { id: 't_bib2', x: 8, y: 4, dir: 'left', sight: 3, look: TR.bib2.look, trainer: TR.bib2 });
  sign(m, 1, 5, 'Un libro: «Leyendas de la Serranía». Habla de Talayón, el guardián que sopla el cierzo desde Las Peñas.'); sign(m, 9, 8, 'Un libro: «Tabla de tipos para principiantes». El Cierzo es fuerte contra Planta, Bicho y Lucha.');
  sign(m, 3, 8, 'Un libro: «El escudo de Talayuelas: tres pinos sobre tres peñas, bajo corona real».'); sign(m, 11, 5, 'Un libro de recetas: «Morteruelo, ajoarriero y otras maravillas».');
  npc(m, { id: 'leandro', name: 'Don Leandro', x: 7, y: 2, dir: 'down', look: LOOK.leandro, talk: async n => { if (medals() < 3) { await say('Don Leandro: Shhh… Esto es una biblioteca. Vuelve cuando tengas tres Medallas y entonces hablaremos de combates.'); return; } if (medalOf('libro')) { await say('Don Leandro: Ahora que tienes las cuatro Medallas… dicen que han visto Bochornistas en la Caja Rural. Ve con cuidado.'); return; } const r = await trainerBattle(Object.assign({}, n, { trainer: TR.leandro })); if (r === 'win') await medalGet('libro', 'Don Leandro'); } }); };
const TOROS = room('toros', 18, 16, { out: ['pueblo', 39, 16], exit: 9, wall: '#c9573c', floor: GR.SAND, pics: [], music: 'ruta', dark: true, name: 'Plaza de Toros' });
TOROS.build = m => {
  // callejón (anillo exterior oscuro con fantasmas) y ruedo de arena
  for (let y = 2; y < 15; y++) for (let x = 0; x < 18; x++) { const inner = x >= 4 && x <= 13 && y >= 4 && y <= 12; if (!inner) setG(m, x, y, GR.DARK); }
  zoneRect(m, 'toros', 0, 0, 18, 16);
  for (let x = 4; x <= 13; x++) { if (x !== 9) { prop(m, x, 3, 'valla'); } } for (let y = 4; y <= 12; y++) { prop(m, 3, y, 'valla'); prop(m, 14, y, 'valla'); } for (let x = 4; x <= 13; x++) if (x !== 9 && x !== 8) prop(m, x, 13, 'valla');
  setG(m, 9, 15, GR.MAT); for (let y = 13; y < 15; y++) setG(m, 9, y, GR.DIRT);
  npc(m, { id: 't_toro1', x: 2, y: 8, dir: 'down', sight: 4, look: TR.toro1.look, trainer: TR.toro1 }); npc(m, { id: 't_toro2', x: 15, y: 6, dir: 'up', sight: 4, look: TR.toro2.look, trainer: TR.toro2 });
  npc(m, { id: 'g3', x: 16, y: 2, dir: 'left', sight: 3, look: LOOK.bochorno, trainer: TR.g3, when: () => flag('bochorno_visto') && !G.S.tr.g3 });
  TR.g3.after = async () => { await giveItem('pina', 1, 'El Recluta'); setFlag('p2'); await say(`¡Segunda Piña Sagrada recuperada! (${piñas()}/3)`); const n = findNpc('g3'); if (n) n.hidden = true; };
  npc(m, { id: 'morena', name: 'La Morena', x: 9, y: 6, dir: 'down', look: LOOK.morena, talk: async n => { if (medals() < 2) { await say('La Morena: Al ruedo solo salen los valientes con dos Medallas. Vuelve cuando las tengas.'); return; } if (medalOf('capote')) { await say('La Morena: El último Maestro es Don Leandro, en la Biblioteca. Es listo como el hambre. ¡Suerte!'); return; } const r = await trainerBattle(Object.assign({}, n, { trainer: TR.morena })); if (r === 'win') await medalGet('capote', 'La Morena'); } });
  hiddenItem(m, 1, 14, 'aftershave', 1); hiddenItem(m, 17, 3, 'supergomina', 2);
};
TOROS.trig = {}; // salida de la plaza por la puerta (arena → callejón → calle)
async function medalGet(k, who) {
  G.S.medals.push(k); const M = MEDALS.find(q => q[0] === k); Audio.play('victoria'); await say(`${who} te entrega la ${M[1]}.`); Audio.sfx('catch');
  await say(`¡Has conseguido la ${M[1]}! (${medals()}/4)`); Audio.play(G.map.music);
  if (medals() === 4) await say(`${who}: ¡Las cuatro Medallas! Ahora ve a por las Piñas Sagradas y habla con el guardia del camino de Las Peñas.`);
}

Object.assign(window, { ENCOUNTERS, LOOK, TR, currentGoal, randomVecino, medalOf, piñas, pasoPenas, makeHouse });

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
