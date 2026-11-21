// Blaulicht über Möwenbrück – die Orte des Spiels als reine Daten (ohne three.js).
//
// Maße in Metern. x = seitlich (rechts ist plus), z = längs (zur Kamera hin ist plus).
// Ein Rechteck schreiben wir immer als [x1, z1, x2, z2] (linke obere Ecke, rechte untere Ecke).
//
// Jeder Ort hat:
//   gross   – wie groß der Ort ist (weiter kann man nicht laufen)
//   boden   – farbige Flächen auf dem Boden
//   waende  – Wände als Rechtecke (man kann nicht hindurch)
//   moebel  – Kisten als Möbel: Mitte x/z, Breite b, Tiefe t, Höhe h, Farbe. Mit modell: '…' ersetzt ein fertiges Modell die Kiste (dreh = Drehung)
//   deko    – fertige Modelle nur zum Ansehen, ohne Hindernis: modell, x, z, y (Höhe), dreh
//   tueren  – Türen in den Wänden (x, z, b = Breite der Öffnung). Sie gehen von selbst auf, wenn man davorsteht.
//   dinge   – Sachen zum Anklicken (akt = welche Stelle in der Geschichte dann drankommt)
//   leute   – Personen zum Ansprechen
// "wenn" und "bis" sind Merker aus der Geschichte: Das Ding gibt es erst, wenn der Merker "wenn"
// gesetzt ist, und nur so lange, bis der Merker "bis" gesetzt ist.
//
// Für die Point-and-Click-Steuerung:
//   verb  – welche Tätigkeit passt: 'sieh' = Ansehen. Ohne Angabe: Leute = Reden, Dinge = Benutzen.
//   sieh  – der Satz, der kommt, wenn man etwas nur ansieht (👁), ohne es zu benutzen oder anzusprechen.
//   verkehr: true – steht auf der Straße: Die anderen Autos bremsen davor.

import { PLAN, GROSS } from './stadtplan.js';

const OTTO_SIEH = 'Otto Brandl, dein Ausbilder. Grauer Bart, breite Schultern, die Mütze gerade. Seine Stiefel sind die saubersten der ganzen Wache.';
const POLIZEI = { hemd: '#2b4c9b', hose: '#1b2a4a', haut: '#f0c8a0', haar: '#5a3b22', muetze: '#f4f4f4' };
// Otto hat ein fertiges Modell mit Knochen (assets/modelle/otto.glb). Bis es geladen ist, steht dort die Klötzchen-Figur.
const OTTO_LOOK = { ...POLIZEI, haar: '#b9b9b9', bart: '#b9b9b9', bauch: 1.15, modell: 'otto' };

// Eine dünne Wand von (x1, z1) nach (x2, z2) – entweder waagerecht oder senkrecht.
function wand(x1, z1, x2, z2) {
  const d = 0.15;
  return [Math.min(x1, x2) - d, Math.min(z1, z2) - d, Math.max(x1, x2) + d, Math.max(z1, z2) + d];
}

// ---------------------------------------------------------------------------------------------
// Die Polizeiwache Am Deich: drei Räume, davor der Flur, dahinter der Hof mit dem Streifenwagen.
// ---------------------------------------------------------------------------------------------
const wache = {
  name: 'Polizeiwache Am Deich',
  gross: [-14, -10, 14, 22],
  kamera: [11, 7.5],
  boden: [
    { r: [-14, -10, 14, 6], farbe: '#cfc7b8' },      // Flur
    { r: [-14, -10, -5, 0], farbe: '#9db7c9' },      // Umkleide
    { r: [-5, -10, 5, 0], farbe: '#b9a98a' },        // Besprechungsraum
    { r: [5, -10, 14, 0], farbe: '#a9c4a4' },        // Leitstelle und Kantine
    { r: [-14, 6, 14, 22], farbe: '#6f7378' },       // Hof
  ],
  waende: [
    wand(-14, -10, 14, -10), wand(-14, -10, -14, 22), wand(14, -10, 14, 22), wand(-14, 22, 14, 22),
    wand(-14, 6, -1.5, 6), wand(1.5, 6, 14, 6),                       // Wand zum Hof mit Tür
    wand(-14, 0, -10.5, 0), wand(-8.5, 0, -1, 0), wand(1, 0, 8.5, 0), wand(10.5, 0, 14, 0), // Türen zu den Räumen
    wand(-5, -10, -5, 0), wand(5, -10, 5, 0),
  ],
  moebel: [
    { x: -6, z: -3.6, b: 0.6, t: 1.3, h: 0.5, farbe: '#8a6a4a', modell: 'holzbank', dreh: -Math.PI / 2 },   // Bänke in der Umkleide
    { x: -6, z: -6.4, b: 0.6, t: 1.3, h: 0.5, farbe: '#8a6a4a', modell: 'holzbank', dreh: -Math.PI / 2 },
    { x: -10.5, z: -9.4, b: 5, t: 0.8, h: 2, farbe: '#5f7f96' },       // Spinde der Kollegen
    { x: 0, z: -4.5, b: 5, t: 1.6, h: 0.8, farbe: '#7a5a3a' },         // Tisch im Besprechungsraum
    { x: 0, z: -9.6, b: 4, t: 0.3, h: 2.2, farbe: '#f5f5f0' },         // Tafel
    { x: 8, z: -8.7, b: 2, t: 1, h: 0.8, farbe: '#4a4f57', modell: 'schreibtisch' },      // Funkpult: zwei Schreibtische
    { x: 10.1, z: -8.7, b: 2, t: 1, h: 0.8, farbe: '#4a4f57', modell: 'schreibtisch' },
    { x: 12.6, z: -2.5, b: 1.6, t: 3, h: 1, farbe: '#b8894f' },        // Theke der Kantine
    { x: -4, z: 5.2, b: 1.3, t: 0.6, h: 0.5, farbe: '#8a6a4a', modell: 'holzbank', dreh: Math.PI },       // Bank im Flur
    { x: -11.6, z: 3, b: 0.6, t: 2.2, h: 1.05, farbe: '#6b5a44' },      // Tresen der Waffenkammer
    { x: -10, z: 19, b: 3, t: 2, h: 1.6, farbe: '#3d5a3a' },           // Müllcontainer im Hof
  ],
  deko: [
    { modell: 'laptop', x: 8, z: -8.7, y: 0.8 }, { modell: 'laptop', x: 10.1, z: -8.7, y: 0.8 },
    { modell: 'klemmbrett', x: -11.6, z: 3.6, y: 1.06 }, { modell: 'erste_hilfe', x: 4.6, z: 5.2, y: 0 },
    { modell: 'croissant', x: 12.4, z: -3.2, y: 1.0 }, { modell: 'apfel', x: 12.7, z: -2.4, y: 1.0 }, { modell: 'kaese', x: 12.5, z: -1.6, y: 1.0 },
    { modell: 'pflanzkuebel', x: 13.2, z: 5.2 }, { modell: 'muelltonne', x: -13.2, z: 8 }, { modell: 'reifen', x: 12.8, z: 20.6 }, { modell: 'reifen', x: 12.9, z: 19.8, dreh: 1 },
  ],
  tueren: [{ x: -9.5, z: 0, b: 2 }, { x: 0, z: 0, b: 2 }, { x: 9.5, z: 0, b: 2 }, { x: 0, z: 6, b: 3, farbe: '#5f6b78' }],
  schilder: [
    { x: -9.5, z: -9.8, text: 'Umkleide' }, { x: 0, z: -9.8, text: 'Besprechung' },
    { x: 9.5, z: -9.8, text: 'Leitstelle · Kantine' }, { x: -13.6, z: 3, text: 'Waffenkammer' }, { x: 0, z: 21.5, text: 'Hof' },
  ],
  dinge: [
    { id: 'waffenschrank', x: -13.3, z: 3, name: 'Stahlschrank der Waffenkammer', art: 'schrank', fest: [1, 1.6], sieh: 'Ein schwerer Stahlschrank mit zwei Türen und einem Zahlenschloss. Den Schlüssel dazu hat nur Harms.' },
    { id: 'spind', x: -13.2, z: -6, name: 'Dein Spind', art: 'spind', akt: 'spind', fest: [1, 1.2], sieh: 'Ein schmaler Stahlspind mit Zahlenschloss. Auf dem Namensschild steht: K. Berger.' },
    { id: 'auto', x: 6, z: 14, art: 'auto', polizei: true, h: 0, fest: [2, 4.4] },
    { id: 'c_vorn', x: 6, z: 17.2, name: 'Scheinwerfer und Blinker prüfen', art: 'punkt', akt: 'check', wenn: 'briefing', bis: 'c_vorn', nah: 1.6, verb: 'sieh' },
    { id: 'c_reifen1', x: 4.2, z: 15.3, name: 'Reifen links prüfen', art: 'punkt', akt: 'check', wenn: 'briefing', bis: 'c_reifen1', nah: 1.6, verb: 'sieh' },
    { id: 'c_reifen2', x: 7.8, z: 12.7, name: 'Reifen rechts prüfen', art: 'punkt', akt: 'check', wenn: 'briefing', bis: 'c_reifen2', nah: 1.6, verb: 'sieh' },
    { id: 'c_heck', x: 6, z: 10.8, name: 'Rücklichter und Kofferraum prüfen', art: 'punkt', akt: 'check', wenn: 'briefing', bis: 'c_heck', nah: 1.6, verb: 'sieh' },
    { id: 'einsteigen', x: 4.2, z: 13.6, name: 'In den Streifenwagen einsteigen', art: 'punkt', akt: 'einsteigen_hof', wenn: 'briefing', nah: 1.6, farbe: '#3fa7ff', sieh: 'Die Fahrertür von Möwe 14.' },
  ],
  leute: [
    { id: 'otto', x: 2, z: 3.5, name: 'Otto Brandl', akt: 'otto', sieh: OTTO_SIEH, bis: 'briefing', look: OTTO_LOOK },
    { id: 'otto', x: 2.5, z: 15, name: 'Otto Brandl', akt: 'otto', sieh: OTTO_SIEH, wenn: 'briefing', look: OTTO_LOOK },
    { id: 'selin', x: 0, z: -7.5, name: 'Selin Aydin (Leiterin der Wache)', akt: 'selin', look: { ...POLIZEI, haar: '#1e1a17', muetze: null, modell: 'selin', art: 'frau' }, sieh: 'Selin Aydin leitet die Wache. Kerzengerade, die Uniform wie gebügelt. Sie sieht von ihren Unterlagen auf, bevor du etwas sagst.' },
    { id: 'petersen', x: 9, z: -7, name: 'Frau Petersen (Leitstelle)', akt: 'petersen', look: { hemd: '#7a4fa0', hose: '#333', haut: '#f0c8a0', haar: '#d8d2c4', modell: 'petersen', art: 'frau' }, sieh: 'Frau Petersen sitzt mit Kopfhörer am Funkpult. Vor ihr drei Bildschirme und eine Tasse mit einer Möwe darauf.' },
    { id: 'hanne', x: 11.2, z: -2.5, name: 'Hanne (Kantine)', akt: 'hanne', look: { hemd: '#ffffff', hose: '#444', haut: '#e8b890', haar: '#a03a2a', modell: 'hanne', art: 'frau' }, sieh: 'Hanne steht hinter der Theke der Kantine und wischt, obwohl alles sauber ist. Ihr entgeht hier nichts.' },
    { id: 'harms', x: -10.6, z: 3, name: 'Harms (Waffenkammer)', akt: 'harms', look: { ...POLIZEI, haar: '#3a3a3a', muetze: null, bauch: 1.1, modell: 'harms', art: 'mann' }, sieh: 'Harms lehnt am Tresen der Waffenkammer. Hinter ihm der Stahlschrank, vor ihm eine Liste. Er sieht aus wie jemand, der jede Zeile zweimal liest.' },
    { id: 'lotte', x: -3, z: 3.6, name: 'Lotte (Diensthund)', akt: 'lotte', hund: true, sieh: 'Lotte, der Diensthund. Ein Schäferhund mit grauer Schnauze. Sie hebt ein Ohr und lässt es wieder fallen.' },
  ],
};

// ---------------------------------------------------------------------------------------------
// Die Stadt Möwenbrück: Was die Geschichte dort braucht.
// ---------------------------------------------------------------------------------------------
// Die ganze Stadt (Straßen, Häuser, Viertel, Kanal, Hafen …) wird in stadtplan.js ausgerechnet.
// Hier steht nur, was die Geschichte in der Stadt braucht: Marktstände, Dinge und Leute.
const STAND = ['#d9534f', '#f0ad4e', '#5cb85c', '#5bc0de', '#d9534f', '#f0ad4e'];
const marktStaende = [[-60, -40], [-48, -42], [-30, -44], [-20, -36], [-62, -20], [-50, -14], [-28, -16], [-18, -24]]
  .map(([x, z], i) => ({ x, z, b: 4, t: 2.4, h: 1, farbe: '#c9a777', dach: STAND[i % STAND.length] }));

const stadt = {
  name: 'Möwenbrück',
  gross: GROSS,
  kamera: [8.5, 14],
  draussen: true,
  plan: PLAN,                 // der große Stadtplan aus stadtplan.js
  boden: [],
  waende: [],
  moebel: marktStaende,
  schilder: [{ x: -40, z: -30, text: 'Marktplatz', hoch: 7 }],
  dinge: [
    { id: 'falschparker', x: -44, z: 56.4, name: 'Grauer Kombi vor der Ausfahrt', art: 'auto', farbe: '#8d9196', h: Math.PI / 2, akt: 'falschparker', wenn: 'angemeldet', bis: 'kitaFertig', fest: [4.4, 2], nah: 3.4, verb: 'sieh' },
    // Der Verkehrsunfall in der Marktstraße (gibt es erst, wenn die Leitstelle ihn meldet)
    { id: 'unfallwagen', x: -87.2, z: 99.4, name: 'Dunkelblauer Kombi', art: 'auto', farbe: '#1c2333', h: -0.12, akt: 'unfallwagen', verb: 'sieh', wenn: 'unfall', bis: 'flucht', fest: [2.2, 4.6], nah: 3.6, verkehr: true },
    { id: 'roterwagen', x: -92, z: 107.2, name: 'Roter Wagen', art: 'auto', farbe: '#b8322a', h: -0.5, akt: 'roterwagen', verb: 'sieh', wenn: 'unfall', bis: 'marktFertig', fest: [3, 4.4], nah: 3.8, verkehr: true },
    { id: 'museumstuer', x: 74, z: 30, name: 'Tür zum Stadtmuseum', art: 'tuer', akt: 'museumstuer', nah: 2.4, sieh: 'Eine schwere Holztür mit Messinggriff. Daneben ein Schild: Stadtmuseum Möwenbrück, geöffnet 10 bis 17 Uhr.' },
  ],
  leute: [
    { id: 'otto', folgt: true, name: 'Otto Brandl', akt: 'otto', sieh: OTTO_SIEH, look: OTTO_LOOK },
    { id: 'erzieherin', x: -44, z: 53.4, name: 'Erzieherin der Kita', akt: 'erzieherin', wenn: 'angemeldet', look: { hemd: '#e86a8a', hose: '#3b5a7a', haut: '#e8b890', haar: '#2a1a12', modell: 'erzieherin', art: 'frau' }, sieh: 'Eine Erzieherin der Kita Sonnenhang. Sie sieht alle paar Sekunden auf die Uhr und dann die Straße hinunter.' },
    { id: 'baecker', x: -21, z: 53.6, name: 'Bäcker vor der Bäckerei', akt: 'baecker', look: { hemd: '#ffffff', hose: '#f0f0f0', haut: '#f0c8a0', haar: '#7a5a3a', muetze: '#ffffff', bauch: 1.2, modell: 'baecker', art: 'mann' }, sieh: 'Ein Bäcker ganz in Weiß, Mehl bis zu den Ellbogen. Auf dem Schild über der Tür steht: Bäckerei Kruse.' },
    { id: 'verletzte', x: -90.3, z: 107.6, name: 'Fahrerin im roten Wagen', akt: 'verletzte', wenn: 'unfall', bis: 'flucht', nah: 2.6, sieh: 'Eine Frau um die fünfzig hinter dem Steuer. Blass, eine Hand im Nacken. Der Sicherheitsgurt ist noch angelegt.', look: { hemd: '#3f7f8a', hose: '#444', haut: '#f0c8a0', haar: '#6a4a3a', modell: 'verletzte', art: 'frau' } },
    { id: 'unfallfahrer', x: -85.4, z: 100.2, name: 'Fahrer des dunklen Kombi', akt: 'unfallfahrer', wenn: 'unfall', bis: 'flucht', sieh: 'Ein junger Mann, höchstens zwanzig. Kapuzenjacke, an der rechten Hand ein frischer Kratzer. Er wippt auf den Fußballen wie einer, der gleich losrennt.', look: { hemd: '#4a4f57', hose: '#2a2a2a', haut: '#f0c8a0', haar: '#3a2a1a', modell: 'unfallfahrer', art: 'mann' } },
    { id: 'zeugin', x: -78.6, z: 104.5, name: 'Radfahrerin', akt: 'zeugin', wenn: 'unfall', bis: 'flucht', sieh: 'Eine Frau in Sportsachen. Sie hält ihr Rad am Lenker fest, die Knöchel sind weiß.', look: { hemd: '#e0b030', hose: '#2a3a5a', haut: '#e8b890', haar: '#2a1a12', muetze: '#d23a2a', modell: 'zeugin', art: 'frau' } },
    { id: 'opfer', x: -40, z: -22, name: 'Bestohlene Frau', akt: 'opfer', wenn: 'markt', look: { hemd: '#8a6fa8', hose: '#444', haut: '#f0c8a0', haar: '#d8d2c4', modell: 'opfer', art: 'frau' }, sieh: 'Eine ältere Frau mit einer offenen Handtasche. Sie hält sie mit beiden Händen fest und sieht sich immer wieder um.' },
    { id: 'w1', x: -57, z: -37, name: 'Mann am Gemüsestand', akt: 'verdacht', look: { hemd: '#3f9a4a', hose: '#444', haut: '#f0c8a0', haar: '#3a2a1a', rucksack: '#d23a2a', modell: 'w1', art: 'mann' }, sieh: 'Ein Mann am Gemüsestand. Grüne Jacke, roter Rucksack. Er wiegt in Ruhe Tomaten ab.' },
    { id: 'w2', x: -25, z: -13.5, name: 'Mann am Käsestand', akt: 'verdacht', bis: 'marktFertig', look: { hemd: '#3f9a4a', hose: '#333', haut: '#e8b890', haar: '#8a5a2a', rucksack: '#2a5ad2', modell: 'w2', art: 'mann' }, sieh: 'Ein junger Mann am Käsestand. Grüne Jacke, blauer Rucksack. Er kauft nichts – er schaut den Leuten auf die Taschen.' },
    { id: 'w3', x: -17, z: -40, name: 'Mann am Obststand', akt: 'verdacht', look: { hemd: '#c9772e', hose: '#2a3a5a', haut: '#f0c8a0', haar: '#c9a24a', rucksack: '#2a5ad2', modell: 'w3', art: 'mann' }, sieh: 'Ein Mann am Obststand. Orange Jacke, blauer Rucksack. Er probiert eine Weintraube.' },
    { id: 'm1', x: -46, z: -30, name: 'Mann mit Einkaufskorb', akt: 'marktmann', look: { hemd: '#7a8a5a', hose: '#5a4a3a', haut: '#d8a878', haar: '#222', modell: 'm1', art: 'mann' }, sieh: 'Ein Mann mit Einkaufskorb. Obenauf liegt eine Tüte Krabben.' },
  ],
};

// ---------------------------------------------------------------------------------------------
// Das Stadtmuseum bei Nacht: ein großer Saal mit Vitrinen. Hier braucht man die Taschenlampe.
// ---------------------------------------------------------------------------------------------
const museum = {
  name: 'Stadtmuseum',
  gross: [-12, -8, 12, 8],
  kamera: [11, 7.5],
  boden: [{ r: [-12, -8, 12, 8], farbe: '#8a6f52' }, { r: [-3, -4.5, 3, 0.5], farbe: '#7a2f2f' }],
  waende: [wand(-12, -8, 12, -8), wand(-12, -8, -12, 8), wand(12, -8, 12, 8), wand(-12, 8, -1.2, 8), wand(1.2, 8, 12, 8)],
  moebel: [
    { x: 0, z: -2, b: 1.6, t: 1.6, h: 1, farbe: '#3a2a20', glas: true },     // Vitrine in der Mitte (Feder)
    { x: 7, z: -5.5, b: 1.6, t: 1.2, h: 1, farbe: '#3a2a20', glas: true },   // leere Vitrine (Gildenbuch)
    { x: -6, z: -5.5, b: 1.6, t: 1.2, h: 1, farbe: '#3a2a20', glas: true, gold: true },  // Goldmünzen
    { x: -6, z: 3, b: 1.2, t: 1.2, h: 1, farbe: '#3a2a20', glas: true, gold: true },
    { x: 8.5, z: 0.5, b: 0.8, t: 2.6, h: 1.8, farbe: '#5a4636' },             // Schiffsmodell auf Sockel
    { x: 0, z: -7.5, b: 5, t: 0.3, h: 2.4, farbe: '#2a3f5a' },                // großes Hafenbild
    { x: -10.6, z: -6.6, b: 0.6, t: 0.6, h: 1.1, farbe: '#d8d2c4' },          // Sockel mit Büste
    { x: 10.6, z: -6.6, b: 0.6, t: 0.6, h: 0.9, farbe: '#d8d2c4' },           // Sockel mit Vase
    { x: -9, z: 6.9, b: 1.3, t: 0.6, h: 0.5, farbe: '#8a6a4a', modell: 'holzbank', dreh: Math.PI },      // Bank für Besucher
  ],
  deko: [
    { modell: 'bueste', x: -10.6, z: -6.6, y: 1.1 }, { modell: 'vase', x: 10.6, z: -6.6, y: 0.9 },
    { modell: 'bilderrahmen', x: -5, z: -7.7, y: 0.75 }, { modell: 'bilderrahmen', x: 5, z: -7.7, y: 0.75 },
    { modell: 'kamera_wand', x: 11.5, z: -7.5, y: 1.5, dreh: -2.3 },
  ],
  schilder: [],
  dinge: [
    { id: 'spur_feder', x: 0, z: -0.7, name: 'Vitrine in der Mitte ansehen', art: 'spur', akt: 'spur', licht: true, zeig: [0, 1.06, -1.3, 0.12, 0.02, 0.5, '#f2f2f2'], verb: 'sieh' },
    { id: 'spur_fuss', x: -10.2, z: 1.5, name: 'Boden unter dem Fenster ansehen', art: 'spur', akt: 'spur', licht: true, zeig: [-0.3, 0.02, 0, 0.14, 0.01, 0.34, '#3a2a1a'], verb: 'sieh' },
    { id: 'spur_kratzer', x: 7, z: -4.4, name: 'Leere Vitrine ansehen', art: 'spur', akt: 'spur', licht: true, verb: 'sieh' },
    { id: 'fenster', x: -11.5, z: 0, name: 'Fenster untersuchen', art: 'fenster', akt: 'fenster', licht: true, nah: 2.6, verb: 'sieh' },
    { id: 'ausgang', x: 0, z: 7.6, name: 'Hinausgehen', art: 'tuer', akt: 'ausgang', nah: 1.6, sieh: 'Die Tür nach draußen. Durch den Spalt fällt blaues Flackern herein: euer Streifenwagen.' },
  ],
  leute: [
    { id: 'otto', x: -2.5, z: 5, name: 'Otto Brandl', akt: 'otto', sieh: OTTO_SIEH, look: OTTO_LOOK },
    { id: 'thomsen', x: 3.5, z: 5.5, name: 'Dr. Thomsen (Museumsleiterin)', akt: 'thomsen', look: { hemd: '#6a2f5a', hose: '#222', haut: '#f0c8a0', haar: '#8a3a1a', modell: 'thomsen', art: 'frau' }, sieh: 'Dr. Thomsen, die Leiterin des Museums. Mantel über dem Schlafanzug, Schlüsselbund in der Faust. Sie zählt mit den Augen die Vitrinen.' },
    { id: 'brinkmann', x: 11.3, z: 5.2, h: -Math.PI / 2, name: 'Herr Brinkmann (Wärter)', akt: 'brinkmann', nah: 2.4, look: { hemd: '#5a5a3a', hose: '#3a3a2a', haut: '#e8b890', haar: '#777', sitzt: true, modell: 'brinkmann', art: 'mann' }, sieh: 'Der Wärter. Er sitzt an der Wand und presst ein Taschentuch an den Hinterkopf. Seine Uniformjacke ist an der Schulter schmutzig.' },
  ],
};

export const ORTE = { wache, stadt, museum };
