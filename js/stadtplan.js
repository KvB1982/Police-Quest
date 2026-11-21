// Blaulicht über Möwenbrück – der Stadtplan (ohne three.js, läuft auch in node).
//
// Hier wird die ganze Stadt ausgerechnet: Straßen, Häuserblocks, Viertel, Kanal, Bahnhof, Hafen, Park,
// Bäume, Laternen, parkende Autos. Gebaut wird sie daraus in stadtbau.js, gemalt (als Karte) in karte.js.
//
// Maße in Metern. x = Osten ist plus, z = Süden ist plus. Norden (minus z) ist das Meer.
// Ein Rechteck ist immer [x1, z1, x2, z2]. Die Stadt ist etwa 1,5 km breit und 900 m tief.
// Alles hier ist ausgedacht: Straßennamen, Viertel, Häuser.

// Ein Würfel, der immer dieselben "Zufalls"-Zahlen liefert – so sieht die Stadt bei jedem Start gleich aus.
export function wuerfel(start) {
  let s = start;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const schneidet = (a, b, rand = 0) => a[0] < b[2] + rand && a[2] > b[0] - rand && a[1] < b[3] + rand && a[3] > b[1] - rand;

export const GEH = 3;            // so breit ist der Gehweg zwischen Fahrbahn und Hauswand
export const UFER = -112;        // nördlich davon ist Wasser
export const KAI = { p: -104, b: 12, von: -485, bis: 645, name: 'Am Kai' };

// Straßen von Norden nach Süden (p = ihre x-Stelle, b = Breite der Fahrbahn)
export const STRASSEN_X = [
  { p: -720, b: 10, name: 'Werftstraße' }, { p: -600, b: 10, name: 'Am Güterbahnhof' }, { p: -480, b: 10, name: 'Bahnhofstraße' },
  { p: -360, b: 14, name: 'Westring' }, { p: -240, b: 10, name: 'Wallstraße' }, { p: -160, b: 10, name: 'Gildenstraße' },
  { p: -80, b: 10, name: 'Marktstraße' }, { p: 0, b: 10, name: 'Deichstraße' }, { p: 80, b: 10, name: 'Museumsstraße' },
  { p: 160, b: 10, name: 'Kapitänsweg' }, { p: 240, b: 10, name: 'Fleetufer West' }, { p: 300, b: 10, name: 'Fleetufer Ost' },
  { p: 400, b: 14, name: 'Ostring' }, { p: 520, b: 10, name: 'Möwenweg' }, { p: 640, b: 10, name: 'Dünenweg' }, { p: 760, b: 10, name: 'Am Sonnenhang' },
];
// Straßen von Westen nach Osten (p = ihre z-Stelle)
export const STRASSEN_Z = [
  { p: -60, b: 10, name: 'Speicherstraße' }, { p: 0, b: 10, name: 'Wachstraße' }, { p: 60, b: 10, name: 'Bäckergasse' },
  { p: 130, b: 10, name: 'Nikolaistraße' }, { p: 210, b: 14, name: 'Stadtring' }, { p: 300, b: 10, name: 'Parkstraße' },
  { p: 400, b: 10, name: 'Lindenallee' }, { p: 500, b: 14, name: 'Südring' }, { p: 600, b: 10, name: 'Rosenweg' },
  { p: 700, b: 10, name: 'Ahornweg' }, { p: 800, b: 10, name: 'Feldrain' },
];
const X0 = STRASSEN_X[0].p, X1 = STRASSEN_X.at(-1).p, Z0 = STRASSEN_Z[0].p, Z1 = STRASSEN_Z.at(-1).p;
for (const s of STRASSEN_X) { s.von = s.p >= -480 && s.p <= 640 ? KAI.p : Z0; s.bis = Z1; }
for (const s of STRASSEN_Z) { s.von = X0; s.bis = X1; }

// So weit kann man laufen und fahren.
export const GROSS = [X0 - 12, UFER + 2, X1 + 12, Z1 + 12];

// ---------------------------------------------------------------------------------------------
// Besondere Häuser. Die ersten vier stehen seit Tag 1 an genau diesen Stellen (die Geschichte kennt sie).
//   r = Grundriss, h = Höhe, stil = Fassade, dach = Farbe oder null (flach), frei = Fläche, die frei bleibt,
//   bild = Zeichen für die Karte, turm = [x, z, Breite, Höhe] für einen Turm mit Spitze
// ---------------------------------------------------------------------------------------------
export const BESONDERE = [
  { r: [25, -22, 55, -8], h: 8, stil: 'klinker', dach: null, schild: 'Polizeiwache', bild: '🚓', frei: [22, -24, 58, -5], farbe: '#f2f2f2' },
  { r: [-55, 38, -32, 52], h: 5, stil: 'putz', farbe: '#ffd98a', dach: '#b8553a', schild: 'Kita Sonnenhang', bild: '🧸', frei: [-58, 36, -10, 55] },
  { r: [-28, 40, -14, 52], h: 6.5, stil: 'backstein', dach: '#8a4a3a', schild: 'Bäckerei Kruse', bild: '🥐', laden: true },
  { r: [52, 18, 73, 42], h: 11, stil: 'sandstein', dach: '#5a6a62', schild: 'Stadtmuseum', bild: '🏛️', frei: [48, 16, 75, 44] },
  // neu in der großen Stadt
  { r: [-150, -48, -92, -12], h: 13, stil: 'backstein', dach: '#3f6b5a', schild: 'Rathaus', bild: '🏰', ganz: true, turm: [-121, -30, 9, 34], treppe: true },
  { r: [98, 82, 146, 108], h: 17, stil: 'backstein', dach: '#3f6b5a', schild: 'Nikolaikirche', bild: '⛪', ganz: true, turm: [95.5, 95, 12, 52], first: 'x' },
  { r: [-532, 140, -492, 200], h: 12, stil: 'backstein', dach: '#5a4a44', schild: 'Bahnhof', bild: '🚉', turm: [-512, 170, 8, 24] },
  { r: [-420, 150, -400, 190], h: 4.5, stil: 'modern', dach: null, schild: 'Busbahnhof · Schließfächer', bild: '🚌', ganz: true, farbe: '#dfe6ea' },
  { r: [-345, 222, -296, 248], h: 9, stil: 'klinker', dach: null, schild: 'Feuerwache', bild: '🚒', frei: [-350, 220, -292, 262], farbe: '#d9644a' },
  { r: [-232, 312, -170, 350], h: 21, stil: 'modern', dach: null, schild: 'Krankenhaus', bild: '🏥', ganz: true, farbe: '#f4f6f6' },
  { r: [415, 225, 482, 250], h: 11, stil: 'klinker', dach: null, schild: 'Schule am Sonnenhang', bild: '🏫', ganz: true, farbe: '#f0d9a8' },
  { r: [538, 226, 604, 262], h: 6.5, stil: 'halle', dach: null, schild: 'Supermarkt', bild: '🛒', ganz: true, farbe: '#f2f2ee', parkplatz: true },
  { r: [420, 316, 500, 346], h: 13, stil: 'putz', farbe: '#f6e3c4', dach: '#a8553c', schild: 'Seniorenheim Abendsonne', bild: '🌻', ganz: true, first: 'x' },
  { r: [-230, 10, -200, 26], h: 12, stil: 'sandstein', dach: '#5a6a62', schild: 'Stadtarchiv', bild: '📜' },
  { r: [90, -52, 120, -36], h: 12, stil: 'backstein', dach: '#7a3a2c', schild: 'Gildehaus der Fischer', bild: '⚓', treppe: true, first: 'z' },
  { r: [-150, 68, -136, 82], h: 10, stil: 'backstein', dach: '#7a3a2c', schild: 'Antiquariat', bild: '📚', laden: true, first: 'z' },
  { r: [-70, 8, -54, 20], h: 9, stil: 'putz', farbe: '#ffe3ea', dach: '#a8553c', schild: 'Eisdiele', bild: '🍦', laden: true, first: 'z' },
  { r: [312, 68, 342, 82], h: 16, stil: 'putz', farbe: '#e9eef2', dach: null, schild: 'Fleetufer 7 – hier wohnst du', bild: '🏠' },
  { r: [600, -97, 630, -72], h: 7, stil: 'backstein', dach: '#b8553a', schild: 'Seenotretter', bild: '🛟', frei: [596, -98, 634, -66], first: 'z' },
];
// Orte ohne Haus, die auf der Karte stehen sollen
export const KARTEN_ORTE = [
  { x: -40, z: -30, name: 'Marktplatz', bild: '🧺' }, { x: 160, z: 400, name: 'Stadtpark', bild: '🌳' },
  { x: 0, z: -104, name: 'Alter Hafen', bild: '⛵' }, { x: -660, z: 250, name: 'Gewerbegebiet Nord', bild: '🏭' },
  { x: -660, z: -84, name: 'Werft', bild: '🏗️' }, { x: 720, z: -330, name: 'Leuchtturminsel', bild: '🗼' },
];
// Stellen, an denen die Geschichte etwas braucht: dort parkt kein fremdes Auto.
const KEIN_PARKEN = [[-44, 58, 26], [80, 30, 22], [40, 0, 26], [-40, 0, 20]];

// Welches Viertel ist ein Block? (cx, cz = seine Mitte, nord = die Reihe direkt am Hafen)
function viertel(cx, cz, nord) {
  if (cx > 240 && cx < 300) return 'kanal';
  if (nord) return cx < -480 ? 'werft' : cx > 640 ? 'duene' : 'speicher';
  if (cx > -600 && cx < -480) return 'bahn';
  if (cx < -600) return 'gewerbe';
  if (cx > -80 && cx < 0 && cz < 0) return 'markt';
  if (cx > 80 && cx < 240 && cz > 300 && cz < 500) return 'park';
  if (cx > -240 && cx < 240 && cz < 210) return 'alt';
  if (cx < 240 && cz < 500) return 'city';
  if (cx > 300 && cz < 210) return 'wohnblock';
  if (cz > 500 && cx < 300 && cx > -480) return 'reihe';
  return 'einzel';
}
export const VIERTEL_NAME = { alt: 'Altstadt', city: 'Innenstadt', speicher: 'Alter Hafen', werft: 'Werft', gewerbe: 'Gewerbegebiet Nord', bahn: 'Bahnhof',
  wohnblock: 'Fleetviertel', reihe: 'Südstadt', einzel: 'Sonnenhang', park: 'Stadtpark', markt: 'Marktplatz', kanal: 'Fleet', duene: 'Deich', frei: '' };

// Farben zum Einfärben der Fassaden
const PASTELL = ['#f4ead6', '#efdcc0', '#e3ecef', '#f3d9cf', '#e2ecd2', '#ece4f0', '#fff3d6', '#dfe6ea', '#f6e0b8', '#e9d2c0'];
const BACKSTEIN = ['#ffffff', '#f0e4dc', '#e2d0c6', '#fff2e6'];
const DACH_ROT = ['#a8452f', '#b5553a', '#8f3f2e', '#9c4a36', '#7c3a2e'], DACH_GRAU = ['#4c5258', '#5a5f66', '#3f4448'];

// So sehen die Häuser in jedem Viertel aus (alle Zahlen: von … bis).
const ZEILE = {
  alt: { tief: 12, breit: [7, 11], stock: [3, 4], stile: ['backstein', 'backstein', 'putz', 'dunkel'], dach: 'giebel', laden: 0.45, vorn: 0.55 },
  city: { tief: 14, breit: [14, 22], stock: [4, 6], stile: ['putz', 'putz', 'backstein', 'modern', 'sandstein'], dach: 'flach', laden: 0.6 },
  reihe: { tief: 10, breit: [7, 8.5], stock: [2, 2], stile: ['backstein', 'putz', 'putz'], dach: 'giebel', laden: 0, vorn: 0 },
  speicher: { tief: 99, breit: [16, 24], stock: [4, 6], stile: ['speicher'], dach: 'giebel', laden: 0, vorn: 1 },
};

function baue() {
  const w = wuerfel(1326);
  const zw = (a, b) => a + w() * (b - a), aus = l => l[Math.floor(w() * l.length)];
  const P = { strassen: [], bloecke: [], haeuser: [], gruen: [], hof: [], wasser: [], teiche: [], sperre: [], baeume: [], laternen: [], parker: [], deko: [], gleise: [], gelaender: [] };

  for (const s of STRASSEN_X) P.strassen.push({ ...s, achse: 'x' });
  for (const s of STRASSEN_Z) P.strassen.push({ ...s, achse: 'z' });
  P.strassen.push({ ...KAI, achse: 'z', kai: true });

  const frei = [[-75, -55, -5, -5]];      // der Marktplatz
  for (const b of BESONDERE) if (b.frei) frei.push(b.frei);
  const haus = h => { if (frei.some(f => schneidet(h.r, f, 0.5)) || BESONDERE.some(b => schneidet(h.r, b.r, 1))) return; P.haeuser.push(h); };

  // Eine Reihe Häuser an einer Seite des Blocks. seite = wohin die Haustür zeigt (n, s, w, o).
  function reihe(a, b, fest1, fest2, seite, typ) {
    const c = ZEILE[typ];
    let x = a;
    while (x < b - 3) {
      let br = zw(c.breit[0], c.breit[1]);
      if (b - x - br < c.breit[0] * 0.8) br = b - x;
      const stock = Math.round(zw(c.stock[0], c.stock[1])), stil = aus(c.stile);
      const r = seite === 'n' || seite === 's' ? [x, fest1, x + br, fest2] : [fest1, x, fest2, x + br];
      const quer = seite === 'n' || seite === 's' ? 'z' : 'x';      // Giebel zur Straße: der First läuft quer zur Straße
      const laengs = quer === 'z' ? 'x' : 'z';
      const backstein = stil === 'backstein' || stil === 'dunkel' || stil === 'speicher';
      const h = { r, seite, stil, stock, h: 3.5 + stock * 3.05 + (typ === 'speicher' ? 1 : 0), farbe: backstein ? aus(BACKSTEIN) : aus(PASTELL),
        laden: w() < c.laden, typ };
      if (c.dach === 'giebel') {
        const vorn = w() < c.vorn;
        h.dach = { art: 'giebel', first: vorn ? quer : laengs, h: typ === 'reihe' ? 3.6 : zw(4, 6), farbe: typ === 'speicher' ? aus(DACH_GRAU) : aus(DACH_ROT) };
        h.treppe = vorn && typ === 'alt' && w() < 0.4;
        h.schornstein = w() < 0.6;
      } else h.dach = { art: 'flach', farbe: aus(DACH_GRAU) };
      haus(h);
      x += br;
    }
  }
  // Ein Block mit Häusern rundherum und einem Hof in der Mitte.
  function zeile(B, typ) {
    const [x1, z1, x2, z2] = B.r, c = ZEILE[typ], tiefe = z2 - z1;
    if (tiefe < c.tief * 1.4) { reihe(x1, x2, z1, z2, 's', typ); return; }                    // nur eine Reihe (die Speicher am Kai)
    if (tiefe < c.tief * 2 + 8) { reihe(x1, x2, z1, z1 + tiefe / 2, 'n', typ); reihe(x1, x2, z1 + tiefe / 2, z2, 's', typ); return; }
    const t = c.tief;
    reihe(x1, x2, z1, z1 + t, 'n', typ); reihe(x1, x2, z2 - t, z2, 's', typ);
    reihe(z1 + t, z2 - t, x1, x1 + t, 'w', typ); reihe(z1 + t, z2 - t, x2 - t, x2, 'o', typ);
    const hof = [x1 + t, z1 + t, x2 - t, z2 - t];
    P.gruen.push(hof);
    for (let i = 0; i < 3; i++) baum(zw(hof[0] + 4, hof[2] - 4), zw(hof[1] + 4, hof[3] - 4), true);
  }
  function baum(x, z, klein, art) {
    if (frei.some(f => x > f[0] && x < f[2] && z > f[1] && z < f[3])) return;
    if (P.haeuser.some(h => x > h.r[0] - 1.5 && x < h.r[2] + 1.5 && z > h.r[1] - 1.5 && z < h.r[3] + 1.5)) return;
    P.baeume.push({ x, z, h: klein ? zw(5, 7) : zw(7, 10), art: art || 'laub' });
  }
  // Häuser mit Garten
  function einzel(B) {
    const [x1, z1, x2, z2] = B.r;
    P.gruen.push(B.r);
    const reihen = z2 - z1 > 52 ? [[z1 + 4, 'n'], [z2 - 13.5, 's']] : [[z1 + 4, 'n']];
    for (const [z, seite] of reihen) for (let x = x1 + 3; x + 11 < x2; x += zw(19, 24)) {
      const br = zw(9, 11.5), stil = aus(['putz', 'putz', 'backstein']);
      haus({ r: [x, z, x + br, z + zw(8.5, 9.5)], seite, stil, stock: 1, h: zw(5.2, 6.4), farbe: stil === 'putz' ? aus(PASTELL) : aus(BACKSTEIN), typ: 'einzel',
        dach: { art: 'giebel', first: w() < 0.6 ? 'x' : 'z', h: zw(3, 4.2), farbe: aus(w() < 0.7 ? DACH_ROT : DACH_GRAU) }, schornstein: true });
      baum(x + br + zw(2, 5), z + zw(-1, 12), true, w() < 0.25 ? 'fichte' : 'laub');
    }
    if (reihen.length > 1) for (let x = x1 + 8; x < x2 - 6; x += zw(14, 22)) baum(x, (z1 + z2) / 2 + zw(-5, 5), false);
  }
  // Wohnblocks mit Rasen dazwischen
  function wohnblock(B) {
    const [x1, z1, x2, z2] = B.r;
    P.gruen.push(B.r);
    for (let z = z1 + 5; z + 13 < z2; z += 36) {
      const teile = x2 - x1 > 70 ? [[x1 + 4, (x1 + x2) / 2 - 5], [(x1 + x2) / 2 + 5, x2 - 4]] : [[x1 + 4, x2 - 4]];
      for (const [a, b] of teile) {
        const stock = Math.round(zw(4, 6));
        haus({ r: [a, z, b, z + 13], seite: 'n', stil: aus(['modern', 'putz', 'modern']), stock, h: 3.5 + stock * 3.05, farbe: aus(PASTELL), typ: 'wohnblock', dach: { art: 'flach', farbe: aus(DACH_GRAU) } });
      }
      for (let x = x1 + 6; x < x2 - 4; x += zw(12, 18)) baum(x, z + 13 + zw(6, 16), false);
    }
  }
  // Hallen im Gewerbegebiet und in der Werft
  function hallen(B, werft) {
    const [x1, z1, x2, z2] = B.r;
    P.hof.push({ r: B.r, art: 'asphalt' });
    const nx = x2 - x1 > 80 ? 2 : 1, nz = z2 - z1 > 70 ? 2 : 1, bx = (x2 - x1) / nx, bz = (z2 - z1) / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      if (w() < 0.12) continue;
      const rx = zw(7, 13), rz = zw(4, 10);
      haus({ r: [x1 + i * bx + rx, z1 + j * bz + rz, x1 + (i + 1) * bx - zw(5, 11), z1 + (j + 1) * bz - zw(4, 10)], seite: 's', stil: 'halle', stock: 2,
        h: zw(7.5, 11), farbe: aus(['#e9ecee', '#cfd8de', '#f0ede4', '#c9d6c8', '#d8dde6']), typ: 'halle', dach: { art: 'flach', farbe: aus(DACH_GRAU) } });
      P.deko.push({ art: w() < 0.5 ? 'kiste_holz' : 'fass', x: x1 + i * bx + rx - 3, z: z1 + j * bz + rz + zw(2, 12), dreh: w() * 6 });
    }
    if (werft) P.deko.push({ art: 'kran', x: (x1 + x2) / 2, z: z1 - 6, dreh: 0 });
  }

  // ---- alle Blocks zwischen den Straßen
  for (let i = 0; i + 1 < STRASSEN_X.length; i++) for (let j = -1; j + 1 < STRASSEN_Z.length; j++) {
    const a = STRASSEN_X[i], b = STRASSEN_X[i + 1], c = STRASSEN_Z[j], d = STRASSEN_Z[j + 1];
    const zelle = [a.p + a.b / 2, j < 0 ? KAI.p + KAI.b / 2 : c.p + c.b / 2, b.p - b.b / 2, d.p - d.b / 2];
    const cx = (zelle[0] + zelle[2]) / 2, cz = (zelle[1] + zelle[3]) / 2;
    let typ = viertel(cx, cz, j < 0);
    const r = typ === 'speicher' ? [zelle[0] + GEH, zelle[1] + 1, zelle[2] - GEH, zelle[3] - 1] : [zelle[0] + GEH, zelle[1] + GEH, zelle[2] - GEH, zelle[3] - GEH];
    const ganz = BESONDERE.find(s => s.ganz && s.r[0] > zelle[0] && s.r[2] < zelle[2] && s.r[1] > zelle[1] && s.r[3] < zelle[3]);
    const B = { r, zelle, typ, name: VIERTEL_NAME[typ] };
    P.bloecke.push(B);
    if (ganz) {
      B.typ = 'frei'; B.haus = ganz;
      if (ganz.parkplatz || ganz.bild === '🚌') P.hof.push({ r, art: 'asphalt' }); else P.gruen.push(r);
      if (ganz.parkplatz) for (let x = r[0] + 6; x < r[2] - 4; x += 2.9) if (w() < 0.55) P.parker.push({ x, z: r[3] - 8, h: 0, art: Math.floor(w() * 4), farbe: Math.floor(w() * 8), platz: true });
      if (ganz.bild === '🚌') for (const z of [158, 170, 182]) P.deko.push({ art: 'bussteig', x: -448, z });
      if (!ganz.parkplatz && ganz.bild !== '🚌') for (let k = 0; k < 9; k++) baum(zw(r[0] + 3, r[2] - 3), zw(r[1] + 3, r[3] - 3), false);
      continue;
    }
    if (ZEILE[typ]) zeile(B, typ);
    else if (typ === 'einzel') einzel(B);
    else if (typ === 'wohnblock') wohnblock(B);
    else if (typ === 'gewerbe' || typ === 'werft') hallen(B, typ === 'werft');
    else if (typ === 'kanal') {
      // Das Fleet: Wasser zwischen zwei Ufermauern. Die Querstraßen sind die Brücken.
      const nord = j < 0, sued = j + 2 === STRASSEN_Z.length;
      P.wasser.push([zelle[0] + 4, nord ? UFER - 2 : zelle[1] - (j === 0 ? 0 : 0), zelle[2] - 4, zelle[3]]);
      P.sperre.push([zelle[0] + 3.2, nord ? UFER : zelle[1], zelle[2] - 3.2, zelle[3]]);
      P.gelaender.push([zelle[0] + 3.4, zelle[1], zelle[0] + 3.4, zelle[3]], [zelle[2] - 3.4, zelle[1], zelle[2] - 3.4, zelle[3]]);
      if (!nord) P.gelaender.push([zelle[0] + 3.4, zelle[1], zelle[2] - 3.4, zelle[1]]);
      if (!sued) P.gelaender.push([zelle[0] + 3.4, zelle[3], zelle[2] - 3.4, zelle[3]]);
      if (w() < 0.7) P.deko.push({ art: 'boot', x: zelle[0] + 9, z: zw(zelle[1] + 12, zelle[3] - 12), dreh: 0 });
      if (w() < 0.5) P.deko.push({ art: 'boot', x: zelle[2] - 9, z: zw(zelle[1] + 12, zelle[3] - 12), dreh: Math.PI });
    } else if (typ === 'bahn') {
      // Links die Gleise (dort kann man nicht hin), rechts Schuppen oder der Bahnhof.
      P.hof.push({ r: [zelle[0] + 2, zelle[1] - 12, zelle[0] + 52, zelle[3] + 12], art: 'schotter' });
      P.sperre.push([zelle[0] + 2, zelle[1], zelle[0] + 52, zelle[3]]);
      P.hof.push({ r: [zelle[0] + 52, zelle[1] + GEH, zelle[2] - GEH, zelle[3] - GEH], art: 'pflaster' });
      if (!BESONDERE.some(s => schneidet(s.r, r)) && w() < 0.7) {
        haus({ r: [zelle[0] + 60, zelle[1] + zw(8, 16), zelle[2] - 8, zelle[3] - zw(8, 16)], seite: 'o', stil: 'halle', stock: 2, h: zw(6, 8), farbe: '#d8d2c4', typ: 'halle', dach: { art: 'flach', farbe: DACH_GRAU[0] } });
      }
      if (w() < 0.6) P.deko.push({ art: 'waggons', x: zelle[0] + 12 + 10 * Math.floor(w() * 4), z: cz + zw(-12, 12), n: 2 + Math.floor(w() * 3) });
    } else if (typ === 'park') {
      P.gruen.push(r);
      P.hof.push({ r: [r[0], cz - 1.5, r[2], cz + 1.5], art: 'weg' }, { r: [cx - 1.5, r[1], cx + 1.5, r[3]], art: 'weg' });
      for (let k = 0; k < 26; k++) { const x = zw(r[0] + 3, r[2] - 3), z = zw(r[1] + 3, r[3] - 3); if (Math.abs(x - cx) > 4 && Math.abs(z - cz) > 4) baum(x, z, false, w() < 0.2 ? 'fichte' : 'laub'); }
      for (const sx of [-1, 1]) P.deko.push({ art: 'bank', x: cx + sx * 14, z: cz - 2.6, dreh: 0 }, { art: 'muelltonne', x: cx + sx * 17, z: cz - 2.4, dreh: 0 });
    } else if (typ === 'markt') P.hof.push({ r, art: 'kopfstein' });
    else if (typ === 'duene') { P.gruen.push([zelle[0], zelle[1] - 6, zelle[2] + 30, zelle[3]]); for (let k = 0; k < 5; k++) baum(zw(r[0], r[2]), zw(r[1], r[3]), true, 'fichte'); }
  }
  // Der Teich im Stadtpark und die Gleise
  P.teiche.push({ x: 124, z: 352, rx: 22, rz: 15 }, { x: 196, z: 452, rx: 15, rz: 11 });
  P.sperre.push([106, 340, 142, 364], [184, 443, 208, 461]);
  P.baeume = P.baeume.filter(b => !P.teiche.some(t => Math.hypot((b.x - t.x) / (t.rx + 3), (b.z - t.z) / (t.rz + 3)) < 1));
  for (const x of [-585, -576, -567, -558]) P.gleise.push({ x, z1: Z0 - 60, z2: Z1 + 400 });

  // ---- die besonderen Häuser
  for (const b of BESONDERE) {
    P.haeuser.push({ r: b.r, seite: 's', stil: b.stil, stock: Math.max(1, Math.round((b.h - 3.5) / 3.05)), h: b.h, farbe: b.farbe || '#ffffff', typ: 'besonders', laden: !!b.laden,
      dach: b.dach ? { art: 'giebel', first: b.first || (b.r[2] - b.r[0] > b.r[3] - b.r[1] ? 'x' : 'z'), h: Math.min(7, (b.first === 'z' ? b.r[2] - b.r[0] : Math.min(b.r[2] - b.r[0], b.r[3] - b.r[1])) * 0.3), farbe: b.dach } : { art: 'flach', farbe: DACH_GRAU[1] },
      treppe: !!b.treppe, schild: b.schild, turm: b.turm, bild: b.bild });
    if (b.turm) { const [x, z, br] = b.turm; P.sperre.push([x - br / 2, z - br / 2, x + br / 2, z + br / 2]); }
  }
  // Bäume, die es schon an Tag 1 gab: am Rand vom Markt, hinter der Kita, am Museum
  const w2 = wuerfel(77);
  for (let i = 0; i < 14; i++) P.baeume.push({ x: -72 + w2() * 64, z: -52 + (i % 2 ? 0 : 44) + w2() * 3, h: 7, art: 'laub' });
  for (let i = 0; i < 6; i++) P.baeume.push({ x: -56 + i * 4.2, z: 35.5, h: 6, art: 'laub' });
  for (let i = 0; i < 5; i++) P.baeume.push({ x: 50, z: 19 + i * 5.5, h: 6.5, art: 'laub' });

  // ---- an jeder Straße: Laternen, Bäume, parkende Autos (immer zwischen zwei Kreuzungen)
  const quer = { x: STRASSEN_Z, z: STRASSEN_X };
  for (const s of P.strassen) {
    const kreuz = quer[s.achse].filter(q => q.p > s.von - 1 && q.p < s.bis + 1);
    if (s.achse === 'x' && s.von === KAI.p) kreuz.unshift({ p: KAI.p, b: KAI.b });
    for (let k = 0; k + 1 < kreuz.length; k++) {
      const a = kreuz[k].p + kreuz[k].b / 2 + 5, b = kreuz[k + 1].p - kreuz[k + 1].b / 2 - 5, mitte = (a + b) / 2;
      const ort = (seite, entlang, ab) => s.achse === 'x' ? [s.p + seite * ab, entlang] : [entlang, s.p + seite * ab];
      const v = seite => { const [x, z] = ort(seite, mitte, 25); return viertel(x, z, z < Z0); };
      const vl = v(-1), vr = v(1), eng = vl === 'alt' || vr === 'alt' || vl === 'speicher' || vr === 'speicher' || vl === 'markt' || vr === 'markt';
      let n = 0;
      for (let t = a + 4; t < b - 2; t += 27, n++) {
        const seite = n % 2 ? 1 : -1, [x, z] = ort(seite, t, s.b / 2 + 0.8);
        P.laternen.push({ x, z, alt: eng, dreh: s.achse === 'x' ? (seite > 0 ? -Math.PI / 2 : Math.PI / 2) : (seite > 0 ? Math.PI : 0) });
      }
      if (!eng && !s.kai) for (let t = a + 12; t < b - 6; t += 13.5) for (const seite of [-1, 1]) {
        const vv = seite < 0 ? vl : vr;
        if (vv === 'kanal' || vv === 'bahn' || vv === 'gewerbe') continue;
        const [x, z] = ort(seite, t + (seite > 0 ? 6 : 0), s.b / 2 + 1.5);
        if (!frei.some(f => x > f[0] && x < f[2] && z > f[1] && z < f[3])) P.baeume.push({ x, z, h: zw(6.5, 9), art: 'laub', strasse: true });
      }
      if (s.b <= 10 && !s.kai && vl !== 'kanal' && vr !== 'kanal') for (let t = a + 3; t < b - 5; t += 5.9) {      // nicht auf den Brücken parken
        const [x, z] = ort(1, t, s.b / 2 - 1.15);
        if (w() > (eng ? 0.22 : 0.34) || KEIN_PARKEN.some(k => Math.hypot(x - k[0], z - k[1]) < k[2])) continue;
        P.parker.push({ x, z, h: s.achse === 'x' ? 0 : -Math.PI / 2, art: Math.floor(w() * 4), farbe: Math.floor(w() * 8) });
      }
    }
  }
  // ---- Kleinkram am Kai: Kisten, Fässer, Rettungsringe, Fischkisten
  for (let x = KAI.von + 14; x < KAI.bis - 10; x += zw(9, 22)) {
    if (x > 236 && x < 304) continue;
    P.deko.push({ art: aus(['kiste_holz', 'holzfass', 'fass', 'fischkiste', 'fischkiste', 'rettungsring', 'kiste_holz']), x, z: UFER + zw(1.4, 2.6), dreh: w() * 6 });
  }
  for (let x = -440; x < 620; x += 96) if (x < 220 || x > 320) P.deko.push({ art: 'steg', x, z: UFER, lang: zw(34, 52) });
  // Mülltonnen, Bänke und Blumenkübel in der Altstadt und Innenstadt
  for (const h of P.haeuser) {
    if ((h.typ !== 'alt' && h.typ !== 'city') || w() > 0.16) continue;
    const mx = (h.r[0] + h.r[2]) / 2, mz = (h.r[1] + h.r[3]) / 2, ab = 0.8;
    const [x, z] = h.seite === 'n' ? [mx, h.r[1] - ab] : h.seite === 's' ? [mx, h.r[3] + ab] : h.seite === 'w' ? [h.r[0] - ab, mz] : [h.r[2] + ab, mz];
    P.deko.push({ art: aus(['muelltonne', 'pflanzkuebel', 'pflanzkuebel', 'bank', 'tafel', 'stromkasten']), x, z, dreh: { n: Math.PI, s: 0, w: -Math.PI / 2, o: Math.PI / 2 }[h.seite] });
  }
  P.deko.push({ art: 'brunnen', x: -40, z: -30 });

  // Was im Weg steht (für das Laufen und Fahren)
  P.fest = P.haeuser.map(h => h.r).concat(P.sperre, P.baeume.map(b => [b.x - 0.35, b.z - 0.35, b.x + 0.35, b.z + 0.35]),
    P.parker.map(p => p.h ? [p.x - 2.2, p.z - 0.95, p.x + 2.2, p.z + 0.95] : [p.x - 0.95, p.z - 2.2, p.x + 0.95, p.z + 2.2]));
  return P;
}

export const PLAN = baue();

// Wie heißt die Straße oder das Viertel an dieser Stelle? (für die Anzeige oben links)
export function woBinIch(x, z) {
  for (const s of PLAN.strassen) {
    const quer = s.achse === 'x' ? x : z, laengs = s.achse === 'x' ? z : x;
    if (Math.abs(quer - s.p) < s.b / 2 + GEH && laengs > s.von - 8 && laengs < s.bis + 8) return s.name;
  }
  const b = PLAN.bloecke.find(b => x >= b.zelle[0] && x <= b.zelle[2] && z >= b.zelle[1] && z <= b.zelle[3]);
  return b ? (b.haus ? b.haus.schild : b.name) : 'Möwenbrück';
}
