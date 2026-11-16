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
