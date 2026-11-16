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
