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
  npc(m, { id: 'vecina_cierzo', name: 'Vecina', x: 57, y: 39, dir: 'down', wander: 1, look: { hs: 'long', hair: '#2a1a10', shirt: '#3ac86a', dress: '#3ac86a' }, say: () => flag('starter') ? 'Vecina: Edgar dice que eres su nuevo ayudante. ¡Qué suerte! Él me hizo este peinado.' : 'Vecina: Esa es la barbería El Cierzo. El dueño, Edgar, sabe más de Talamones que nadie en el pueblo.' });
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
  TR.g1.after = async () => { await say('Recluta: ¡La jefa, Doña Calima, se va a encargar de que el cierzo no vuelva a soplar nunca más! ¡Ja! ¡Me piro!'); const n = findNpc('g1'); if (n) { await npcWalk(n, 'down', 3, .12); n.hidden = true; } await say('¿Las Piñas Sagradas…? Habrá que avisar a Edgar. Seguro que él sabe qué está pasando.'); setFlag('bochorno_visto'); };
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
    lose: ['', '¡Jo! Has mejorado un montón. ¡Pero la próxima te gano!', '¡Otra vez! ¿Cómo lo haces? Voy a pedirle a Edgar que me corte el pelo como a ti, a ver si es eso.', 'Vale… eres el mejor entrenador del pueblo. Ve y dale su merecido a la Banda del Bochorno. ¡Yo te cubro!'][st],
    after: async () => { const n2 = findNpc('toni' + st); if (n2) { await npcWalk(n2, n2.dir === 'down' ? 'left' : 'down', 4, .14); n2.hidden = true; } } }; }
}
const medalOf = k => G.S.medals.includes(k);
const piñas = () => (flag('p1') ? 1 : 0) + (flag('p2') ? 1 : 0) + (flag('p3') ? 1 : 0);
const pasoPenas = () => medals() >= 4 && piñas() >= 3;
function currentGoal() {
  if (!flag('starter')) return 'Lleva la carta de la abuela a Edgar, en la barbería El Cierzo (Paseo del Prado, junto a la C. Constitución).';
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
  if (!flag('champ')) return 'Vuelve a El Cierzo. Edgar quiere luchar contra ti: ¡el combate final!';
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
  await say('Abuela: Mira, toma esta carta. Llévasela a Edgar, el de la barbería El Cierzo. Está aquí mismo, en el Paseo del Prado, cruzando la carretera.');
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
  sign(m, 11, 4, 'La zona de tatuaje de Edgar. Hay dibujos de Talamones por todas partes.');
  npc(m, { id: 'xiko', name: 'Edgar', x: 6, y: 4, dir: 'down', look: LOOK.xiko, talk: xikoTalk });
  // botes de gomina con los tres Talamones (sobre las mesas)
  [['rodenin', 4], ['cierzin', 6], ['brasin', 8]].forEach(([id, x]) => { prop(m, x, 6, 'objeto', { block: false, dy: 1, lift: 9 }); sign(m, x, 6, async () => { await chooseStarter(id); return ''; }); });
  m.onEnter = async () => { if (flag('carta_dada') && !flag('starter')) return; if (G.S.bag.carta && !flag('carta_dada')) await xikoCarta(); };
};
async function xikoCarta() {
  const x = findNpc('xiko'); await sleep(250); bubble(x, '!', .8); await sleep(600);
  await say('Edgar: ¡Hombre! ¡Bienvenido a El Cierzo! ¿Vienes a cortarte el pelo o a hacerte un tatuaje?');
  await say(`${G.S.name}: (Le das la carta de la abuela.)`); delete G.S.bag.carta;
  await say(`Edgar: A ver… «Querido Edgar: este verano viene ${G.S.look === 'chica' ? 'mi nieta' : 'mi nieto'}, ${G.S.name}. Quiere conocer a los Talamones. Cuídamel${G.S.look === 'chica' ? 'a' : 'o'}, que tú sabes más que nadie…»`);
  await say('Edgar: ¡Ja, ja! Tu abuela es la mejor clienta que tengo. Bueno, pues encantado. Yo soy Edgar: barbero, tatuador… y experto en Talamones.');
  await say('Edgar: Los Talamones son criaturas que viven por todo Talayuelas: en las eras, en los huertos, en el arroyo… ¡hasta en las farolas!');
  await say('Edgar: La gente del pueblo los cría, los entrena y combate con ellos. Y los mejores son los cuatro Maestros del pueblo.');
  await say('Edgar: Mira, ahí en las mesas tengo tres botes de gomina. Dentro hay tres Talamones jóvenes que necesitan entrenador. ¡Elige el que más te guste!');
  setFlag('carta_dada');
}
async function chooseStarter(id) {
  if (flag('starter')) { const t = G.S.flags.starter === id ? 'Es el bote vacío de tu Talamón.' : id === G.S.flags.rival ? 'El bote que se llevó Toni. Está vacío.' : 'Un bote de gomina con un Talamón dentro. Es de Edgar.'; await say(t); return; }
  if (!flag('carta_dada')) { await say('Un bote de gomina con algo moviéndose dentro… Mejor habla primero con el dueño.'); return; }
  const sp = SPECIES[id], tipo = sp.t.map(t => TYPES[t].n).join(' y ');
  const S = new Screen({ upd() { }, drw(x) { x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 0, W, H); panel(x, W / 2 - 150, 30, 300, 300, { r: 24 }); drawMonIcon(x, id, W / 2, 180 + Math.sin(G.t * 3) * 4, 250); } }); G.ui.push(S);
  const desc = { rodenin: 'Rodenín: Una piedrecita de rodeno con un pino por tupé. Duro como una peña y muy presumido.', cierzin: 'Cierzín: Una nubecita del viento cierzo, siempre con su bufanda. Rápido y fresquito.', brasin: 'Brasín: Nació en el horno del pueblo y huele a pan recién hecho. ¡Pura energía!' }[id];
  await say(desc); const r = await ask(`¿Te quedas con ${sp.n}, el Talamón de tipo ${tipo}?`); closeUI(S);
  if (r !== 0) return;
  const m = await giveMon(id, 5); setFlag('starter', id); Audio.sfx('catch');
  await say(`¡Ya tienes tu primer Talamón: ${sp.n}!`);
  await say(`Edgar: ¡Buena elección! Se nota que ${sp.n} y tú vais a hacer buen equipo.`);
  // llega Toni
  const toniN = { id: 'toni0', name: 'Toni', look: LOOK.toni, x: 6, y: 9, px: 6 * 16 + 8, py: 9 * 16 + 14, dir: 'up', mv: null, home: [6, 9] }; G.npcs.push(toniN);
  Audio.sfx('door'); await sleep(300); await say('¿?: ¡Edgar! ¡Edgar! ¿Es verdad que regalas Talamones? ¡Yo también quiero uno!');
  await npcWalkTo(toniN, 6, 7); toniN.dir = 'up';
  await say('Edgar: ¡Toni! Este es Toni, el nieto del panadero. Siempre llega tarde a todo… Venga, coge uno de los que quedan.');
  const riv = id === 'rodenin' ? 'cierzin' : 'rodenin'; setFlag('rival', riv);
  await say(`Toni: ¡Pues yo me quedo con ${SPECIES[riv].n}! ¡Es justo el que necesito para ganarte!`);
  toniN.dir = 'left'; facePlayer(toniN); await say(`Toni: Oye, ¿${G.S.name}, no? ¡Vamos a probar nuestros Talamones! ¡Ahora mismo!`);
  const res = await battle({ trainer: { id: 'toni0', cls: 'Rival', name: 'Toni', look: LOOK.toni, team: [[riv, 5]], money: 300, lose: '¿Qué? ¡Pero si lo he elegido yo! Bueno… la próxima vez te gano seguro.' }, npc: toniN, noLose: true });
  if (res === 'lose') { await healParty(); await say('Toni: ¡Ja! ¡He ganado! Bueno, no te desanimes, que es tu primer combate.'); }
  G.S.tr.toni0 = true; await healParty();
  await say('Edgar: ¡Qué combate! Toma, para empezar con buen pie.');
  setFlag('talapedia'); addItem('talapedia'); Audio.sfx('item'); await say('Recibes la Talapedia. Anota todos los Talamones que veas y captures.');
  await giveItem('gomina', 5, 'Edgar');
  await say('Edgar: Con las gominas puedes atrapar Talamones salvajes. Debilítalos un poco y ¡zas!, gomina al canto.');
  await say('Edgar: En Talayuelas hay cuatro Maestros: Sara en el Polideportivo, el Tío Paco en los Huertos La Vega, La Morena en la Plaza de Toros y Don Leandro en la Biblioteca.');
  await say('Edgar: Gánales a los cuatro y consigue sus Medallas. Cuando lo hagas… vuelve aquí. Te estaré esperando.');
  await say('Toni: ¡Yo las voy a conseguir antes que tú! ¡Hasta luego!'); await npcWalkTo(toniN, 6, 9, .12); toniN.hidden = true;
  await say('Edgar: Y si tus Talamones se cansan, pasa por el Centro de Salud o por casa de tu abuela. ¡Suerte!');
  void m;
}
async function xikoTalk() {
  if (!flag('carta_dada')) { await xikoCarta(); return; }
  if (!flag('starter')) { await say('Edgar: ¡Venga, elige uno de los tres botes de las mesas! No tengas miedo, que no muerden. Bueno, Brasín un poco.'); return; }
  if (medalOf('balon') && !flag('patio')) { await say('Edgar: ¡La Medalla Balón! Sabía que lo conseguirías. Toma, la llave de mi patio trasero.'); setFlag('patio'); Audio.sfx('item'); await say('Recibes la Llave del Patio. Está en la C. Goya, detrás de El Cierzo.'); await say('Edgar: Ahí viven Talamones muy raros: Tijerines, Peinecillos, Tintorros… Se escapan de la barbería y del estudio de tatuaje. ¡Atrapa los que quieras!'); return; }
  if (flag('bochorno_visto') && !flag('xiko_piñas')) { setFlag('xiko_piñas'); await say('Edgar: ¿La Banda del Bochorno? ¿Las Tres Piñas Sagradas de Las Peñas? Esto es muy grave…'); await say('Edgar: Cuenta la leyenda que en Las Peñas vive Talayón, el guardián que sopla el cierzo. Las Tres Piñas le dan su fuerza.'); await say('Edgar: Si se las llevan, el cierzo dejará de soplar y en Talayuelas hará un calor espantoso. ¡Tienes que recuperarlas!'); return; }
  if (flag('calima') && !flag('champ')) { await xikoFinal(); return; }
  if (flag('champ')) { await say(pick(['Edgar: ¡Mi campeón! ¿Te corto el pelo? Invita la casa.', 'Edgar: ¿Ya has completado la Talapedia? En Las Peñas aún quedan Talamones muy raros.', 'Edgar: Cuando quieras te hago un tatuaje de Rodenín. ¡Queda genial en el brazo!'])); return; }
  await say('Edgar: ' + currentGoal().replace(/^/, 'Tu próximo objetivo: '));
  if (G.S.party.some(m => m.hp < m.mhp) && await ask('Edgar: ¿Quieres que tus Talamones descansen en los sillones un ratito?') === 0) { await healParty(); Audio.sfx('heal'); await say('Edgar: ¡Listo! Como nuevos. Y con el pelo impecable.'); }
}
async function xikoFinal() {
  await say('Edgar: Así que has derrotado a Doña Calima y has devuelto el cierzo a Talayuelas… Todo el pueblo habla de ti.');
  await say('Edgar: ¿Sabes? Hace muchos años yo fui el Campeón de Talayuelas. Y desde entonces nadie me ha ganado.');
  const r = await ask('Edgar: Es hora de comprobar si el alumno ha superado al maestro. ¿Estás listo para el combate final?');
  if (r !== 0) { await say('Edgar: Tómate tu tiempo. Prepara bien a tu equipo. Aquí te espero.'); return; }
  await say('Edgar: ¡Pues adelante! ¡Esta vez no me voy a cortar… ni un pelo!');
  const res = await battle({ trainer: { id: 'xiko', cls: 'Campeón', name: 'Edgar', leader: true, look: LOOK.xiko, team: xikoTeam(), money: 10000, lose: '¡Increíble! El alumno ha superado al maestro. ¡Eres el nuevo Campeón de Talayuelas!' }, npc: findNpc('xiko') });
  if (res !== 'win') return;
  setFlag('champ'); await healParty(); await say('Edgar: Toma, te lo has ganado: la Gomina Maestra. La gomina secreta de El Cierzo. Nunca falla.'); addItem('gominamaestra'); Audio.sfx('item');
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
  await say('Edgar te estará esperando en El Cierzo. ¡Ve a contárselo!');
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
  if (!flag('starter')) { await say('Abuela: ¿Ya le has dado la carta a Edgar? Está en El Cierzo, en el Paseo del Prado, al lado de la calle Constitución.'); return; }
  if (medalOf('balon') && !flag('bici')) { setFlag('bici'); await say('Abuela: ¡Una medalla! ¡Ay, mi niño, que vas a ser campeón! Toma, la bici de tu abuelo. Con ella irás volando por el pueblo.'); addItem('bici'); Audio.sfx('item'); await say('Recibes la Bici del Abuelo. Úsala desde la Mochila (objetos clave).'); }
  const n = G.S.medals.length; const k = 'bizcocho' + n; if (n > 0 && !flag(k)) { setFlag(k); await say('Abuela: Y toma un trocito de bizcocho para tus Talamones, que están muy delgados.'); await giveItem('bizcocho', 1, 'La abuela'); }
  await say(pick(['Abuela: ¿Has comido? ¿Seguro? Pues come otra vez.', 'Abuela: Abrígate, que aquí por las noches refresca aunque sea verano.', 'Abuela: Cuando te canses, échate en tu cama y descansa. Tus Talamones también lo agradecerán.', 'Abuela: Saluda a Edgar de mi parte. ¡Qué buen chico es!']));
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
  npc(m, { id: 'peluquera', name: 'Peluquera', x: 7, y: 3, dir: 'left', look: LOOK.peluquera, talk: async () => { if (!flag('peine')) { setFlag('peine'); await say('Peluquera: ¿Vienes de parte de Edgar? ¡Ese ladrón de clientes! Je, je, es broma: somos amigos.'); await say('Peluquera: Mira, toma este Peine Mágico. Si un Talamón se debilita, se lo pasas por la cabeza y como nuevo.'); await giveItem('peine', 1, 'La peluquera'); } else await say(pick(['Peluquera: Aquí peinamos a todo el pueblo. Y a sus Talamones, si se dejan.', 'Peluquera: ¿Un Peinecillo? ¡Esos bichos me roban los peines!'])); } }); };
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
