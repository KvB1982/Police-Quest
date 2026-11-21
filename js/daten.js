// Blaulicht über Möwenbrück – die Orte des Spiels als reine Daten (ohne three.js).
//
// Maße in Metern. x = seitlich (rechts ist plus), z = längs (zur Kamera hin ist plus).
// Ein Rechteck schreiben wir immer als [x1, z1, x2, z2] (linke obere Ecke, rechte untere Ecke).
//
// Jeder Ort hat:
//   gross   – wie groß der Ort ist (weiter kann man nicht laufen)
//   boden   – farbige Flächen auf dem Boden
//   waende  – Wände als Rechtecke (man kann nicht hindurch)
//   moebel  – Kisten als Möbel: Mitte x/z, Breite b, Tiefe t, Höhe h, Farbe
//   dinge   – Sachen zum Anklicken (akt = welche Stelle in der Geschichte dann drankommt)
//   leute   – Personen zum Ansprechen
// "wenn" und "bis" sind Merker aus der Geschichte: Das Ding gibt es erst, wenn der Merker "wenn"
// gesetzt ist, und nur so lange, bis der Merker "bis" gesetzt ist.

const POLIZEI = { hemd: '#2b4c9b', hose: '#1b2a4a', haut: '#f0c8a0', haar: '#5a3b22', muetze: '#f4f4f4' };

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
    { x: -6, z: -5, b: 0.7, t: 3.5, h: 0.5, farbe: '#8a6a4a' },        // Bank in der Umkleide
    { x: -10.5, z: -9.4, b: 5, t: 0.8, h: 2, farbe: '#5f7f96' },       // Spinde der Kollegen
    { x: 0, z: -4.5, b: 5, t: 1.6, h: 0.8, farbe: '#7a5a3a' },         // Tisch im Besprechungsraum
    { x: 0, z: -9.6, b: 4, t: 0.3, h: 2.2, farbe: '#f5f5f0' },         // Tafel
    { x: 9, z: -8.6, b: 4, t: 1.2, h: 1, farbe: '#4a4f57' },           // Funkpult
    { x: 12.6, z: -2.5, b: 1.6, t: 3, h: 1, farbe: '#b8894f' },        // Theke der Kantine
    { x: -4, z: 5.2, b: 2.4, t: 0.7, h: 0.5, farbe: '#8a6a4a' },       // Bank im Flur
    { x: -10, z: 19, b: 3, t: 2, h: 1.6, farbe: '#3d5a3a' },           // Müllcontainer im Hof
  ],
  schilder: [
    { x: -9.5, z: -9.8, text: 'Umkleide' }, { x: 0, z: -9.8, text: 'Besprechung' },
    { x: 9.5, z: -9.8, text: 'Leitstelle · Kantine' }, { x: 0, z: 21.5, text: 'Hof' },
  ],
  dinge: [
    { id: 'spind', x: -13.2, z: -6, name: 'Dein Spind', art: 'spind', akt: 'spind', fest: [1, 1.2] },
    { id: 'auto', x: 6, z: 14, art: 'auto', polizei: true, h: 0, fest: [2, 4.4] },
    { id: 'c_vorn', x: 6, z: 17.2, name: 'Scheinwerfer und Blinker prüfen', art: 'punkt', akt: 'check', wenn: 'briefing', bis: 'c_vorn', nah: 1.6 },
    { id: 'c_reifen1', x: 4.2, z: 15.3, name: 'Reifen links prüfen', art: 'punkt', akt: 'check', wenn: 'briefing', bis: 'c_reifen1', nah: 1.6 },
    { id: 'c_reifen2', x: 7.8, z: 12.7, name: 'Reifen rechts prüfen', art: 'punkt', akt: 'check', wenn: 'briefing', bis: 'c_reifen2', nah: 1.6 },
    { id: 'c_heck', x: 6, z: 10.8, name: 'Rücklichter und Kofferraum prüfen', art: 'punkt', akt: 'check', wenn: 'briefing', bis: 'c_heck', nah: 1.6 },
    { id: 'einsteigen', x: 4.2, z: 13.6, name: 'In den Streifenwagen einsteigen', art: 'punkt', akt: 'einsteigen_hof', wenn: 'briefing', nah: 1.6, farbe: '#3fa7ff' },
  ],
  leute: [
    { id: 'otto', x: 2, z: 3.5, name: 'Otto Brandl', akt: 'otto', bis: 'briefing', look: { ...POLIZEI, haar: '#b9b9b9', bart: '#b9b9b9', bauch: 1.15 } },
    { id: 'otto', x: 2.5, z: 15, name: 'Otto Brandl', akt: 'otto', wenn: 'briefing', look: { ...POLIZEI, haar: '#b9b9b9', bart: '#b9b9b9', bauch: 1.15 } },
    { id: 'selin', x: 0, z: -7.5, name: 'Selin Aydin (Leiterin der Wache)', akt: 'selin', look: { ...POLIZEI, haar: '#1e1a17', muetze: null } },
    { id: 'petersen', x: 9, z: -7, name: 'Frau Petersen (Leitstelle)', akt: 'petersen', look: { hemd: '#7a4fa0', hose: '#333', haut: '#f0c8a0', haar: '#d8d2c4' } },
    { id: 'hanne', x: 11.2, z: -2.5, name: 'Hanne (Kantine)', akt: 'hanne', look: { hemd: '#ffffff', hose: '#444', haut: '#e8b890', haar: '#a03a2a' } },
    { id: 'lotte', x: -3, z: 3.6, name: 'Lotte (Diensthund)', akt: 'lotte', hund: true },
  ],
};

// ---------------------------------------------------------------------------------------------
// Die Stadt Möwenbrück (erster Teil): ein Netz aus drei mal drei Straßen mit Häuserblocks dazwischen.
// ---------------------------------------------------------------------------------------------
export const STRASSEN_X = [-80, 0, 80];    // Straßen, die von Norden nach Süden laufen
export const STRASSEN_Z = [-60, 0, 60];    // Straßen, die von Westen nach Osten laufen
export const STRASSE_BREIT = 10;

// Ein Würfel, der immer dieselben "Zufalls"-Zahlen liefert – so sieht die Stadt bei jedem Start gleich aus.
function wuerfel(start) {
  let s = start;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function schneidet(a, b, rand = 0) {
  return a[0] < b[2] + rand && a[2] > b[0] - rand && a[1] < b[3] + rand && a[3] > b[1] - rand;
}

// Besondere Häuser, die in der Geschichte vorkommen.
const BESONDERE = [
  { r: [25, -22, 55, -8], h: 7, farbe: '#dfe6ee', dach: '#3c5a8a', schild: 'Polizeiwache' },
  { r: [-55, 38, -32, 52], h: 5, farbe: '#ffd27a', dach: '#d0603a', schild: 'Kita Sonnenhang' },
  { r: [-28, 40, -14, 52], h: 6, farbe: '#e8b89a', dach: '#8a4a3a', schild: 'Bäckerei Kruse' },
  { r: [52, 18, 73, 42], h: 9, farbe: '#c9b79c', dach: '#6a5a4a', schild: 'Stadtmuseum' },
];
// Flächen, auf die der Zufall keine Häuser stellen darf.
const FREI = [[-75, -55, -5, -5], [22, -24, 58, -5], [-58, 36, -10, 55], [48, 16, 75, 44]];

const FARBEN = ['#e9d8b8', '#d9c0a0', '#c7d3d9', '#e6c9c0', '#cfd8b8', '#d8d0e0', '#f0e2c0', '#bfcad6'];
const SPEICHER = ['#a8563c', '#b8664a', '#8f4a36', '#9c5f48'];

function stadtHaeuser() {
  const w = wuerfel(1326);
  const h = [];
  const xs = [[-115, -85], [-75, -5], [5, 75], [85, 115]];
  const zs = [[-95, -65], [-55, -5], [5, 55], [65, 95]];
  for (const [x1, x2] of xs) for (const [z1, z2] of zs) {
    const hafen = z1 < -60;                                   // ganz im Norden stehen die Speicherhäuser
    const nx = Math.max(1, Math.round((x2 - x1) / 15)), nz = Math.max(1, Math.round((z2 - z1) / 15));
    const bx = (x2 - x1) / nx, bz = (z2 - z1) / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const rand = 1.5 + w() * 1.5;
      const r = [x1 + i * bx + rand, z1 + j * bz + rand, x1 + (i + 1) * bx - rand, z1 + (j + 1) * bz - rand];
      const hoch = hafen ? 8 + w() * 4 : 5 + w() * 9;
      const farbe = (hafen ? SPEICHER : FARBEN)[Math.floor(w() * (hafen ? SPEICHER.length : FARBEN.length))];
      if (FREI.some(f => schneidet(r, f, 1))) continue;
      if (w() < 0.12) continue;                               // ab und zu eine Lücke: ein kleiner Platz mit Baum
      h.push({ r, h: hoch, farbe, dach: hafen ? '#5a3a30' : '#7a5548' });
    }
  }
  return h.concat(BESONDERE);
}

function baeume() {
  const w = wuerfel(77);
  const b = [];
  for (let i = 0; i < 14; i++) b.push({ x: -72 + w() * 64, z: -52 + (i % 2 ? 0 : 44) + w() * 3 });   // Rand vom Markt
  for (let i = 0; i < 6; i++) b.push({ x: -56 + i * 4.2, z: 35.5 });                                  // hinter der Kita
  for (let i = 0; i < 5; i++) b.push({ x: 50, z: 19 + i * 5.5 });                                     // am Museum
  return b;
}

const STAND = ['#d9534f', '#f0ad4e', '#5cb85c', '#5bc0de', '#d9534f', '#f0ad4e'];
const marktStaende = [[-60, -40], [-48, -42], [-30, -44], [-20, -36], [-62, -20], [-50, -14], [-28, -16], [-18, -24]]
  .map(([x, z], i) => ({ x, z, b: 4, t: 2.4, h: 1, farbe: '#c9a777', dach: STAND[i % STAND.length] }));

const stadt = {
  name: 'Möwenbrück',
  gross: [-120, -100, 120, 100],
  kamera: [12, 10.5],
  draussen: true,
  haeuser: stadtHaeuser(),
  baeume: baeume(),
  boden: [{ r: [-75, -55, -5, -5], farbe: '#d6c7a8' }],   // Marktplatz mit Pflaster
  waende: [],
  moebel: marktStaende,
  schilder: [{ x: -40, z: -30, text: 'Marktplatz', hoch: 7 }],
  dinge: [
    { id: 'falschparker', x: -44, z: 56.4, name: 'Grauer Kombi vor der Ausfahrt', art: 'auto', farbe: '#8d9196', h: Math.PI / 2, akt: 'falschparker', wenn: 'angemeldet', bis: 'kitaFertig', fest: [4.4, 2], nah: 3.4 },
    { id: 'museumstuer', x: 74, z: 30, name: 'Tür zum Stadtmuseum', art: 'tuer', akt: 'museumstuer', nah: 2.4 },
  ],
  leute: [
    { id: 'otto', folgt: true, name: 'Otto Brandl', akt: 'otto', look: { ...POLIZEI, haar: '#b9b9b9', bart: '#b9b9b9', bauch: 1.15 } },
    { id: 'erzieherin', x: -44, z: 53.4, name: 'Erzieherin der Kita', akt: 'erzieherin', wenn: 'angemeldet', look: { hemd: '#e86a8a', hose: '#3b5a7a', haut: '#e8b890', haar: '#2a1a12' } },
    { id: 'baecker', x: -21, z: 53.6, name: 'Bäcker vor der Bäckerei', akt: 'baecker', look: { hemd: '#ffffff', hose: '#f0f0f0', haut: '#f0c8a0', haar: '#7a5a3a', muetze: '#ffffff', bauch: 1.2 } },
    { id: 'ben', x: -40, z: -22, name: 'Kleiner Junge', akt: 'ben', wenn: 'markt', bis: 'marktFertig', look: { hemd: '#e04a3a', hose: '#2a4a8a', haut: '#f0c8a0', haar: '#c9a24a', klein: 0.62 } },
    { id: 'w1', x: -57, z: -37, name: 'Frau am Gemüsestand', akt: 'frau', look: { hemd: '#f2d22e', hose: '#444', haut: '#f0c8a0', haar: '#3a2a1a', rucksack: '#d23a2a' } },
    { id: 'w2', x: -25, z: -13.5, name: 'Frau am Käsestand', akt: 'frau', look: { hemd: '#3f9a4a', hose: '#333', haut: '#e8b890', haar: '#8a5a2a', rucksack: '#2a5ad2' } },
    { id: 'w3', x: -17, z: -40, name: 'Frau am Obststand', akt: 'frau', look: { hemd: '#f2d22e', hose: '#2a3a5a', haut: '#f0c8a0', haar: '#c9a24a', rucksack: '#2a5ad2' } },
    { id: 'm1', x: -46, z: -30, name: 'Mann mit Einkaufskorb', akt: 'marktmann', look: { hemd: '#7a8a5a', hose: '#5a4a3a', haut: '#d8a878', haar: '#222' } },
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
  ],
  schilder: [],
  dinge: [
    { id: 'spur_feder', x: 0, z: -0.7, name: 'Vitrine in der Mitte ansehen', art: 'spur', akt: 'spur', licht: true, zeig: [0, 1.06, -1.3, 0.12, 0.02, 0.5, '#f2f2f2'] },
    { id: 'spur_fuss', x: -10.2, z: 1.5, name: 'Boden unter dem Fenster ansehen', art: 'spur', akt: 'spur', licht: true, zeig: [-0.3, 0.02, 0, 0.14, 0.01, 0.34, '#3a2a1a'] },
    { id: 'spur_kratzer', x: 7, z: -4.4, name: 'Leere Vitrine ansehen', art: 'spur', akt: 'spur', licht: true },
    { id: 'fenster', x: -11.5, z: 0, name: 'Fenster untersuchen', art: 'fenster', akt: 'fenster', licht: true, nah: 2.6 },
    { id: 'ausgang', x: 0, z: 7.6, name: 'Hinausgehen', art: 'tuer', akt: 'ausgang', nah: 1.6 },
  ],
  leute: [
    { id: 'otto', x: -2.5, z: 5, name: 'Otto Brandl', akt: 'otto', look: { ...POLIZEI, haar: '#b9b9b9', bart: '#b9b9b9', bauch: 1.15 } },
    { id: 'thomsen', x: 3.5, z: 5.5, name: 'Dr. Thomsen (Museumsleiterin)', akt: 'thomsen', look: { hemd: '#6a2f5a', hose: '#222', haut: '#f0c8a0', haar: '#8a3a1a' } },
    { id: 'brinkmann', x: 8.5, z: 5.5, name: 'Herr Brinkmann (Wärter)', akt: 'brinkmann', look: { hemd: '#5a5a3a', hose: '#3a3a2a', haut: '#e8b890', haar: '#777', muetze: '#3a3a2a' } },
  ],
};

export const ORTE = { wache, stadt, museum };
