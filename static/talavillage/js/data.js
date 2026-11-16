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
  talapedia: { n: 'Talapedia', k: 'key', d: 'Enciclopedia de Talamones que te dio Edgar.' },
  bici: { n: 'Bici del Abuelo', k: 'key', d: 'Una bici antigua pero rapidísima. Úsala desde el menú (o con el botón B para correr).' },
  pina: { n: 'Piña Sagrada', k: 'key', d: 'Una de las tres Piñas Sagradas de Las Peñas. Brilla con luz dorada.' },
  flotador: { n: 'Flotador', k: 'key', d: 'Un flotador de la piscina municipal. Te deja cruzar el agua profunda del arroyo.' },
  carta: { n: 'Carta de la Abuela', k: 'key', d: 'Una carta para Edgar, el de la barbería El Cierzo.' },
};
for (const k in ITEMS) ITEMS[k].id = k;

const STATUS = { quem: { n: 'QUE', c: '#e86a2a', t: 'quemado' }, vene: { n: 'ENV', c: '#9a4fc9', t: 'envenenado' }, para: { n: 'PAR', c: '#d6b21a', t: 'paralizado' }, dorm: { n: 'DOR', c: '#7d8a99', t: 'dormido' } };
const STATN = { atk: 'Ataque', def: 'Defensa', esp: 'Especial', vel: 'Velocidad', acc: 'Precisión' };

Object.assign(window, { TYPES, CHART, typeEff, MOVES, ITEMS, STATUS, STATN });
