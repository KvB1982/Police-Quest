// Blaulicht über Möwenbrück – baut den Wochenmarkt in 3D (die Daten und Regeln dazu stehen in markt.js).
//
// Damit auch ein iPad den vollen Markt schafft, gilt hier überall derselbe Trick:
//   - Alles, was sich nie bewegt (15 Stände mit hunderten Äpfeln, Broten, Blumen …, Bänke, Kübel, Masten), wird aus einfachen
//     Formen gebaut und am Ende zu EINER einzigen Form verschmolzen ("backen" aus einrichtung.js). Das ist ein Zeichenaufruf.
//   - Die Menschen sind sieben Figuren aus MakeHuman (assets/besucher/b1 … b7.glb, übernommen aus dem Schwester-Spiel Powershot).
//     Sie haben keine Knochen: Jede Figur ist vorher in 13 Haltungen "gebacken" worden (acht Bilder eines Doppelschritts, Stehen,
//     Handy, Foto, Hände in den Hüften, Reden). Das Spiel zeigt für jeden Menschen die Form, die gerade passt – als Instanzen.
//   - Ist man weit weg vom Markt, wird gar nichts gerechnet und gezeichnet.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { backen } from './einrichtung.js';
import { MARKT, STAENDE, SACHEN, MASTEN, ECKMASTEN, KETTEN, Marktleben, BESUCHER_TAG, BESUCHER_SPAR, BESUCHER_ABEND, hindernisse } from './markt.js';

// ---- Zahlen zum Einstellen ----
const SICHT = 170;             // weiter weg vom Markt als so viele Meter: nichts rechnen, nichts zeichnen
const MAST_HOCH = 5.4;         // so hoch sind die Masten für Wimpel und Lichter
const DURCHHANG = 0.07;        // so stark hängt eine Kette durch (Anteil an ihrer Länge)
const WIMPEL = ['#d9534f', '#f0ad4e', '#f6f1e4', '#5bc0de', '#5cb85c', '#e2a51e', '#2f6fb0'];
const KARUSSELL_TEMPO = 0.5;   // so schnell dreht sich das Karussell (Bogenmaß pro Sekunde)
const TAUBEN = 26;             // so viele Tauben picken auf dem Platz
const TAUBE_SCHRECK = 3.4;     // kommt Kim näher als so viele Meter, fliegen sie auf
const MENSCH_GROSS = 1 / 1.78; // die Figuren sind 1,78 m groß gebaut
const OHNE_FARBE = ['b4'];     // diese Figur trägt fertig bunte Kleidung; bei allen anderen ist das Hemd weiß und wird eingefärbt
const HOLZ = '#8a6a44', HOLZ_HELL = '#c9a777', HOLZ_DUNKEL = '#5e452a', EISEN = '#2f3438', STEIN = '#b9b4a8', GRUEN = '#4f8f3f';

const zufall = saat => { let n = saat * 7.3 + 11; return () => { n = (n * 9301 + 49297) % 233280; return n / 233280; }; };
const dunkler = (farbe, k = 0.72) => '#' + new THREE.Color(farbe).multiplyScalar(k).getHexString();

// ---------------------------------------------------------------------------------------------
// Die Bausteine. Jede Form gibt es nur einmal, sie wird nur verschieden groß gezogen – das spart beim Bauen Zeit.
//   K = Kiste · R = Rolle (achse 'y' steht, 'x' oder 'z' liegt; oben = wie breit sie oben ist, 0 = Kegel) · S = Kugel
// ---------------------------------------------------------------------------------------------
const stoffe = new Map(), formen = new Map();
const stoff = farbe => { if (!stoffe.has(farbe)) stoffe.set(farbe, new THREE.MeshLambertMaterial({ color: farbe })); return stoffe.get(farbe); };
const form = (key, baue) => { if (!formen.has(key)) formen.set(key, baue()); return formen.get(key); };
function werkzeug(g) {
  const dazu = (geo, farbe, x, y, z) => { const m = new THREE.Mesh(geo, stoff(farbe)); m.position.set(x, y, z); g.add(m); return m; };
  const K = (b, h, t, x, y, z, farbe = HOLZ) => { const m = dazu(form('k', () => new THREE.BoxGeometry(1, 1, 1)), farbe, x, y, z); m.scale.set(b, h, t); return m; };
  const R = (r, hoch, x, y, z, farbe = HOLZ, achse = 'y', oben = 1, seg = 10) => {
    const m = dazu(form(`r${oben}_${seg}`, () => new THREE.CylinderGeometry(oben, 1, 1, seg)), farbe, x, y, z); m.scale.set(r, hoch, r);
    if (achse === 'x') m.rotation.z = Math.PI / 2; if (achse === 'z') m.rotation.x = Math.PI / 2; return m;
  };
  const S = (r, x, y, z, farbe, sx = 1, sy = 1, sz = 1) => { const m = dazu(form(r > 0.1 ? 's1' : 's0', () => new THREE.IcosahedronGeometry(1, r > 0.1 ? 1 : 0)), farbe, x, y, z); m.scale.set(r * sx, r * sy, r * sz); return m; };
  // eine neue Gruppe an einer Stelle, mit eigenen Bausteinen
  const teil = (x, z, dreh = 0, y = 0) => { const n = new THREE.Group(); n.position.set(x, y, z); n.rotation.y = dreh; g.add(n); return werkzeug(n); };
  return { K, R, S, teil, g };
}

// ---------------------------------------------------------------------------------------------
// Die Waren. Jeder Stand hat acht Kisten (vier vorn, vier dahinter eine Stufe höher). Was in welcher Kiste liegt:
//   [Form, Farbe(n), Größe, Zusatz]   Formen: k = runde Sachen als Haufen · l = Längliches · g = wenige große · r = Dosen, Gläser, Laibe
//   q = Stapel aus Päckchen · kegel = Gewürz-Häufchen in Schalen · topf = Töpfe und Krüge · b = Eimer mit Blumen
// ---------------------------------------------------------------------------------------------
const BUNT = ['#e84a6a', '#4ab0e8', '#f4d03a', '#6ac86a', '#b06ad8', '#f08a3a', '#f4f4f4', '#e84a4a'];
const WAREN = {
  gemuese: [['k', '#d63a2a', 0.07], ['l', '#e8862a', 0.045, 2.6], ['g', '#a8cf6a', 0.15], ['k', ['#e8c63a', '#d63a2a', '#5a9a3a'], 0.075], ['k', '#b08a55', 0.065], ['l', '#3f7f3a', 0.05, 2.8], ['g', '#f1ecd6', 0.13], ['k', '#b0447a', 0.06]],
  obst: [['k', '#c9302c', 0.07], ['k', '#9ccc3a', 0.07], ['k', '#f08a1e', 0.075], ['l', '#f2d23a', 0.05, 2.6], ['k', '#5a3a8a', 0.05], ['g', '#3f8f4a', 0.16], ['k', '#f4e04a', 0.06], ['k', '#f0a070', 0.068]],
  kaese: [['r', '#e8b82a', 0.2, 0.1], ['r', '#f0d27a', 0.15, 0.09], ['q', ['#f4dc8a', '#f6e7b0'], 0.16], ['r', '#b0342c', 0.12, 0.1], ['r', '#e8c05a', 0.2, 0.12], ['q', ['#f6e7b0', '#e8b82a'], 0.14], ['r', '#d99a2a', 0.14, 0.1], ['r', '#f1ead0', 0.1, 0.12]],
  fisch: [['l', '#9aa7b0', 0.07, 2.8], ['l', '#c9ced4', 0.06, 3], ['k', '#e0604a', 0.045], ['l', '#f08a70', 0.065, 2.4], ['l', '#7f8f9a', 0.075, 2.8], ['k', '#3a3f55', 0.04], ['k', '#f0a890', 0.04], ['l', '#b9c2c9', 0.06, 3]],
  brot: [['l', '#b8742e', 0.1, 1.8], ['l', '#8a5a2a', 0.1, 1.9], ['k', '#d9a55a', 0.065], ['l', '#d9a85a', 0.05, 4.4], ['g', '#a8682a', 0.16], ['k', '#8a4a1e', 0.06], ['q', ['#f0d9a8', '#d9a55a'], 0.16], ['k', '#e8c88a', 0.055]],
  wurst: [['l', '#8a2a22', 0.05, 3.2], ['l', '#b0443a', 0.055, 3], ['q', ['#d98a80', '#f0c8b8'], 0.16], ['r', '#c9ced4', 0.06, 0.12], ['l', '#6a1e1a', 0.05, 3.4], ['k', '#b86a5a', 0.06], ['q', ['#f0c8b8', '#b0443a'], 0.15], ['l', '#9a3a2a', 0.06, 2.8]],
  honig: [['r', '#e2a51e', 0.05, 0.12], ['r', '#c98a12', 0.05, 0.12], ['r', '#f0c84a', 0.06, 0.14], ['q', ['#f4e0a0', '#e8d28a'], 0.12], ['r', '#a8660e', 0.05, 0.12], ['r', '#e8b83a', 0.045, 0.1], ['q', ['#e8d28a', '#f6ecc0'], 0.13], ['r', '#f6d870', 0.06, 0.14]],
  suess: [['r', BUNT, 0.06, 0.15], ['k', BUNT, 0.05], ['r', BUNT, 0.055, 0.13], ['k', ['#f4f4f4', '#e84a6a'], 0.055], ['r', BUNT, 0.06, 0.15], ['k', BUNT, 0.045], ['q', BUNT, 0.12], ['r', BUNT, 0.05, 0.16]],
  gewuerze: [['kegel', '#d9a521'], ['kegel', '#b0342c'], ['kegel', '#e8862a'], ['kegel', '#5a8f3a'], ['kegel', '#7a4a2a'], ['kegel', '#f0d87a'], ['kegel', '#8a2e3a'], ['kegel', '#c9c0a8']],
  blumen: [['b', '#e84a6a'], ['b', '#f4d03a'], ['b', '#f4f4f4'], ['b', '#b06ad8'], ['b', '#f08a3a'], ['b', '#e84a4a'], ['b', '#f0a0c0'], ['b', '#4a8ae8']],
  toepfer: [['topf', '#2f6fb0'], ['topf', '#c9643a'], ['topf', '#f1ead0'], ['topf', '#3f8f6a'], ['topf', '#c9643a'], ['topf', '#2f6fb0'], ['topf', '#e8c63a'], ['topf', '#f1ead0']],
  koerbe: [['r', '#c9a060', 0.14, 0.14], ['q', ['#d9534f', '#2f6fb0', '#f4d03a', '#f6f1e4'], 0.2], ['r', '#b08a4a', 0.12, 0.18], ['q', ['#5cb85c', '#e8a8b8', '#f6f1e4'], 0.2], ['q', ['#2f6fb0', '#f6f1e4', '#8a4a9a'], 0.22], ['r', '#d9b878', 0.16, 0.12], ['q', ['#e8862a', '#f4d03a', '#d9534f'], 0.2], ['r', '#a8743a', 0.13, 0.16]],
  hof: [['g', '#e8862a', 0.17], ['k', '#b08a55', 0.065], ['q', ['#c9c0a8', '#d9d2bc'], 0.18], ['r', '#b0342c', 0.05, 0.12], ['g', '#e8a03a', 0.15], ['k', ['#c9302c', '#9ccc3a'], 0.07], ['l', '#4a7f3a', 0.06, 2.6], ['r', '#d9dcdf', 0.08, 0.2]],
  eier: [['q', ['#c9c0a8', '#d9d2bc'], 0.18], ['k', '#f4ecd8', 0.042], ['k', '#c9a070', 0.042], ['q', ['#d9d2bc', '#c9c0a8'], 0.18], ['r', '#f4d03a', 0.05, 0.1], ['k', ['#f4ecd8', '#c9a070'], 0.042], ['q', ['#c9c0a8', '#f4ecd8'], 0.16], ['k', '#f4ecd8', 0.042]],
  grill: [['l', '#9a4a2a', 0.04, 3.4], ['l', '#b8642e', 0.04, 3.4], ['k', '#e8c88a', 0.065], ['r', '#f4d03a', 0.035, 0.16]],
};
// Eine Kiste füllen: Mitte (cx, cz), y = Boden der Kiste, b × t = so viel Platz ist darin
function fuelle(W, [art, farbe, r = 0.07, zusatz], cx, y, cz, b, t, w) {
  const f = () => Array.isArray(farbe) ? farbe[Math.floor(w() * farbe.length)] : farbe;
  const raster = (dx, dz, tu) => { const nx = Math.max(1, Math.floor(b / dx)), nz = Math.max(1, Math.floor(t / dz)); for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) tu(cx + (i - (nx - 1) / 2) * dx + (w() - 0.5) * dx * 0.15, cz + (j - (nz - 1) / 2) * dz + (w() - 0.5) * dz * 0.15, i, j); };
  if (art === 'k') { raster(r * 2.05, r * 2.05, (x, z) => W.S(r, x, y + r * 0.9, z, f())); raster(r * 3.4, r * 3.2, (x, z) => W.S(r, x, y + r * 2.3, z, f())); }
  else if (art === 'l') raster(r * 2.1, r * zusatz * 1.75, (x, z) => { const m = W.S(r, x, y + r * 0.9, z, f(), 1, 0.85, zusatz); m.rotation.y = (w() - 0.5) * 0.3; });
  else if (art === 'g') raster(r * 2.15, r * 2.15, (x, z) => W.S(r, x, y + r * 0.82, z, f(), 1, 0.86, 1));
  else if (art === 'r') raster(r * 2.25, r * 2.25, (x, z, i, j) => { const hoch = zusatz, n = r > 0.13 ? 1 + (i + j) % 3 : 1; for (let k = 0; k < n; k++) W.R(r, hoch, x, y + hoch / 2 + k * hoch, z, f(), 'y', 1, 12); if (r < 0.08) W.R(r * 1.05, 0.02, x, y + hoch + 0.01, z, '#f4f2ec', 'y', 1, 8); });
  else if (art === 'q') raster(r * 1.25, r * 1.1, (x, z, i, j) => { const n = 1 + Math.floor(w() * 3); for (let k = 0; k < n; k++) W.K(r, r * 0.34, r * 0.8, x, y + r * 0.17 + k * r * 0.36, z, f()).rotation.y = (w() - 0.5) * 0.25; });
  else if (art === 'kegel') raster(0.27, 0.27, (x, z) => { W.R(0.12, 0.06, x, y + 0.03, z, '#e9e2cf', 'y', 1.15, 10); W.R(0.1, 0.13, x, y + 0.12, z, f(), 'y', 0, 8); });
  else if (art === 'topf') raster(0.3, 0.3, (x, z, i, j) => { const k = 0.8 + w() * 0.5; if ((i + j) % 2) { W.R(0.09 * k, 0.2 * k, x, y + 0.1 * k, z, f(), 'y', 0.7, 10); W.R(0.065 * k, 0.03, x, y + 0.21 * k, z, dunkler(f())); } else { W.S(0.11 * k, x, y + 0.1 * k, z, f(), 1, 0.9, 1); W.R(0.06 * k, 0.07 * k, x, y + 0.2 * k, z, f(), 'y', 1.2, 8); } });
  else if (art === 'b') raster(0.36, 0.4, (x, z) => blumenEimer(W, x, y, z, f(), w));
}
// Ein Zinkeimer mit einem Strauß
function blumenEimer(W, x, y, z, farbe, w, k = 1) {
  W.R(0.13 * k, 0.26 * k, x, y + 0.13 * k, z, '#9aa3a8', 'y', 1.2, 10);
  W.S(0.17 * k, x, y + 0.42 * k, z, '#3f7a3a', 1, 0.8, 1);
  for (let i = 0; i < 6; i++) { const a = i * 1.05 + w() * 0.6, d = (0.06 + w() * 0.09) * k; W.S(0.055 * k, x + Math.sin(a) * d, y + (0.5 + w() * 0.1) * k, z + Math.cos(a) * d, farbe); }
}
// Kisten-Stapel, Sack, Fass: Kleinkram, der neben und hinter den Ständen steht
function holzkiste(W, x, y, z, dreh = 0, voll = null, w = Math.random) {
  const T = W.teil(x, z, dreh, y);
  T.K(0.6, 0.04, 0.4, 0, 0.02, 0, HOLZ_HELL); for (const s of [-1, 1]) { T.K(0.6, 0.09, 0.03, 0, 0.09, s * 0.185, HOLZ_HELL); T.K(0.6, 0.09, 0.03, 0, 0.24, s * 0.185, HOLZ_HELL); T.K(0.03, 0.09, 0.4, s * 0.285, 0.09, 0, HOLZ_HELL); T.K(0.03, 0.09, 0.4, s * 0.285, 0.24, 0, HOLZ_HELL); for (const sz of [-1, 1]) T.K(0.04, 0.3, 0.04, s * 0.28, 0.15, sz * 0.18, HOLZ); }
  if (voll) fuelle(T, voll, 0, 0.14, 0, 0.5, 0.32, w);
}
const sack = (W, x, z, farbe = '#c9b48a') => { W.S(0.3, x, 0.3, z, farbe, 1, 1.15, 0.85); W.S(0.09, x, 0.66, z, dunkler(farbe, 0.85), 1.2, 0.8, 1); };
function fass(W, x, z, farbe = '#8a5a2e') { W.R(0.3, 0.8, x, 0.4, z, farbe, 'y', 0.86, 12); W.R(0.3, 0.25, x, 0.4, z, farbe, 'y', 1, 12).scale.set(0.34, 0.3, 0.34); for (const y of [0.12, 0.4, 0.68]) W.R(y === 0.4 ? 0.35 : 0.32, 0.04, x, y, z, EISEN, 'y', 1, 12); }

// ---------------------------------------------------------------------------------------------
// Ein Marktstand. Vorn ist +z. Vier Pfosten, schräges Streifendach mit Zackenrand, Tisch mit Tuch, darauf die Auslage,
// hinten eine Stoffwand, darüber ein Brett mit dem Namen (schilder sammelt die Namensbretter für ein gemeinsames Bild).
// ---------------------------------------------------------------------------------------------
function baueStand(W0, s, nr, schilder, lichter) {
  const W = W0.teil(s.x, s.z, s.dreh || 0), w = zufall(nr + 3), b = s.b || 4, [f1, f2] = s.farben, grill = s.art === 'grill';
  // Pfosten und Querstreben
  for (const sx of [-1, 1]) { W.K(0.09, 2.2, 0.09, sx * (b / 2 - 0.06), 1.1, 1.1); W.K(0.09, 2.5, 0.09, sx * (b / 2 - 0.06), 1.25, -1.1); W.K(0.06, 0.06, 2.3, sx * (b / 2 - 0.06), 2.33, 0).rotation.x = 0.13; }
  W.K(b, 0.07, 0.07, 0, 2.17, 1.1); W.K(b, 0.07, 0.07, 0, 2.47, -1.1);
  // Das Dach: Streifen nebeneinander, vorn tiefer als hinten
  const n = Math.round(b / 0.5), sb = (b + 0.5) / n;
  for (let i = 0; i < n; i++) W.K(sb + 0.005, 0.035, 3.0, (i - (n - 1) / 2) * sb, 2.36, 0.12, i % 2 ? f2 : f1).rotation.x = 0.13;
  // Der Zackenrand vorn: kleine Lappen, abwechselnd lang und kurz
  for (let i = 0; i < n * 2; i++) W.K(sb / 2 + 0.004, i % 2 ? 0.2 : 0.27, 0.025, (i - n + 0.5) * sb / 2, 2.17 - (i % 2 ? 0.1 : 0.135) + 0.02, 1.61, Math.floor(i / 2) % 2 ? f2 : f1);
  // Rückwand aus Stoff und ein halbes Tuch an den Seiten
  W.K(b - 0.1, 1.5, 0.03, 0, 1.7, -1.13, '#ebe2cc'); for (const sx of [-1, 1]) W.K(0.03, 1.3, 0.9, sx * (b / 2 - 0.05), 1.75, -0.68, '#ebe2cc');
  // Der Tisch mit Tuch
  W.K(b - 0.2, 0.06, 1.05, 0, 0.87, 0.6, HOLZ_HELL); W.K(b - 0.18, 0.84, 0.03, 0, 0.43, 1.12, dunkler(f1, 0.9)); W.K(b - 0.18, 0.12, 0.035, 0, 0.8, 1.123, f2 === '#f6f1e4' ? '#f6f1e4' : f2);
  for (const sx of [-1, 1]) W.K(0.03, 0.84, 1.0, sx * (b / 2 - 0.1), 0.43, 0.6, dunkler(f1, 0.8));
  // Die Auslage
  const waren = WAREN[s.art], spalten = Math.round((b - 0.4) / 0.9), sp = (b - 0.4) / spalten;
  if (grill) {       // Bratwurst: Grill mit Rost, daneben Brötchen und Senf
    W.K(1.3, 0.2, 0.7, -0.45, 1.0, 0.62, EISEN); W.K(1.2, 0.02, 0.6, -0.45, 1.11, 0.62, '#5a3a2a'); W.K(1.36, 0.5, 0.05, -0.45, 1.3, 0.24, '#8d949b');
    fuelle(W, waren[0], -0.72, 1.11, 0.62, 0.5, 0.5, w); fuelle(W, waren[1], -0.18, 1.11, 0.62, 0.5, 0.5, w);
    W.K(0.6, 0.12, 0.42, 0.75, 0.96, 0.75, HOLZ_HELL); fuelle(W, waren[2], 0.75, 0.94, 0.75, 0.52, 0.36, w); fuelle(W, waren[3], 0.75, 0.9, 0.3, 0.4, 0.1, w);
    W.K(0.7, 1.0, 0.5, 0.6, 0.5, -0.7, '#c9ced4'); W.R(0.16, 0.5, -0.9, 0.25, -0.75, '#d9534f', 'y', 1, 10);       // Kühlkiste und Gasflasche
  } else {
    if (s.art === 'fisch') { W.K(b - 0.3, 0.1, 0.98, 0, 0.95, 0.6, '#e8f2f6'); W.K(b - 0.26, 0.14, 0.04, 0, 0.97, 1.1, '#9fc4dc'); }
    else W.K(b - 0.4, 0.2, 0.46, 0, 1.0, 0.36, HOLZ);       // die Stufe für die hintere Reihe
    for (let i = 0; i < spalten; i++) {
      const x = (i - (spalten - 1) / 2) * sp, vorn = waren[i % waren.length], hinten = waren[(i + 4) % waren.length], fisch = s.art === 'fisch';
      if (!fisch) { for (const [z, y] of [[0.86, 0.9], [0.36, 1.1]]) { W.K(sp - 0.08, 0.03, 0.44, x, y + 0.015, z, HOLZ_HELL); for (const sz of [-1, 1]) W.K(sp - 0.08, 0.11, 0.025, x, y + 0.055, z + sz * 0.21, HOLZ_HELL); for (const sx of [-1, 1]) W.K(0.025, 0.11, 0.44, x + sx * (sp / 2 - 0.05), y + 0.055, z, HOLZ_HELL); } }
      fuelle(W, vorn, x, fisch ? 1.0 : 0.93, 0.86, sp - 0.16, 0.36, w); fuelle(W, hinten, x, fisch ? 1.0 : 1.13, 0.36, sp - 0.16, 0.36, w);
      W.K(0.13, 0.09, 0.012, x + sp * 0.2, (fisch ? 1.0 : 0.9) + 0.2, 1.08, '#fbfaf2').rotation.x = -0.25;       // Preisschild
    }
  }
  // Die Waage und die Kasse
  W.K(0.26, 0.06, 0.22, b / 2 - 0.42, 0.93, 0.2 + (grill ? 0.75 : 0), '#c9ced4'); W.R(0.15, 0.03, b / 2 - 0.42, 1.02, 0.2 + (grill ? 0.75 : 0), '#e9edf0', 'y', 0.8, 12);
  // Was vom Querbalken hängt: Würste, Knoblauchzöpfe, Kräuter, kleine Körbe
  const haengt = { wurst: ['#8a2a22', '#b0443a', '#6a1e1a'], gewuerze: ['#f1ecd6', '#b0342c'], gemuese: ['#f1ecd6', '#b0447a'], kaese: ['#e8b82a'], koerbe: ['#c9a060'], blumen: ['#4f8f3f'], hof: ['#e8862a', '#f1ecd6'] }[s.art];
  if (haengt) for (let i = 0; i < Math.round(b * 2.2); i++) { const x = -b / 2 + 0.35 + i * (b - 0.7) / (Math.round(b * 2.2) - 1), lang = 0.2 + w() * 0.16; W.K(0.012, 0.1, 0.012, x, 2.1, 1.0, '#3a3a3a'); if (s.art === 'koerbe' || s.art === 'blumen') W.S(0.11, x, 1.95, 1.0, haengt[i % haengt.length], 1, 0.8, 1); else W.R(0.04, lang, x, 2.05 - lang / 2, 1.0, haengt[i % haengt.length], 'y', 0.9, 6); }
  // Lampen unter dem Dach (leuchten abends)
  for (const sx of [-0.55, 0, 0.55]) lichter.push(W.g.localToWorld(new THREE.Vector3(sx * b / 2, 2.08, 0.5)));
  // Das Namensbrett über dem Dachrand
  if (s.name) { W.K(Math.min(b - 0.6, 3.0) + 0.1, 0.5, 0.04, 0, 2.58, 1.5, HOLZ_DUNKEL); schilder.push({ text: s.name, farbe: f1, ort: W.g.localToWorld(new THREE.Vector3(0, 2.58, 1.525)), dreh: s.dreh || 0, b: Math.min(b - 0.6, 3.0), h: 0.42 }); }
  // Kisten, Säcke, Fässer hinter und neben dem Stand
  const hinten = (lx, lz, dreh = 0) => [lx, lz, dreh];
  for (let i = 0; i < 3; i++) { const lx = -b / 2 + 0.5 + i * 0.75 + w() * 0.2; holzkiste(W, lx, 0, -1.55 - w() * 0.15, (w() - 0.5) * 0.4, null); if (w() < 0.6) holzkiste(W, lx + 0.05, 0.31, -1.55, (w() - 0.5) * 0.5, waren[i % waren.length].slice(0, 1)[0] === 'b' ? null : waren[(i * 3) % waren.length], w); }
  if (nr % 3 === 0) fass(W, b / 2 - 0.5, -1.6); else if (nr % 3 === 1) { sack(W, b / 2 - 0.5, -1.55); sack(W, b / 2 - 1.1, -1.65, '#b8a070'); } else holzkiste(W, b / 2 - 0.5, 0, -1.6, 0.3, waren[2], w);
  void hinten;
  // Blumenstand: Eimer auch vor dem Stand auf dem Boden
  if (s.art === 'blumen') for (let i = 0; i < 9; i++) blumenEimer(W, -b / 2 + 0.25 + i * (b - 0.5) / 8, 0, 1.38 + (i % 2) * 0.22, BUNT[(i * 3) % BUNT.length], w, 1.15);
  if (s.art === 'toepfer') for (let i = 0; i < 5; i++) { const x = -b / 2 + 0.4 + i * 0.75, k = 1.3 + w() * 0.6; W.R(0.13 * k, 0.3 * k, x, 0.15 * k, 1.42, ['#c9643a', '#2f6fb0', '#f1ead0'][i % 3], 'y', 0.75, 10); }
  if (s.art === 'koerbe') for (let i = 0; i < 4; i++) { const x = -b / 2 + 0.5 + i * 0.95; W.R(0.26, 0.3, x, 0.15, 1.45, '#c9a060', 'y', 1.2, 10); W.R(0.27, 0.03, x, 0.3, 1.45, '#a8743a', 'y', 1, 10); }
  if (s.art === 'hof') for (let i = 0; i < 6; i++) W.S(0.2 + w() * 0.1, -b / 2 + 0.4 + i * 0.62, 0.2, 1.4 + w() * 0.2, i % 3 ? '#e8862a' : '#e8a03a', 1, 0.8, 1);
  // Die Kreidetafel vor dem Stand
  const T = W.teil(-b / 2 - 0.05, 1.45, 0.5); T.K(0.5, 0.8, 0.03, 0, 0.42, 0.1, HOLZ).rotation.x = -0.22; T.K(0.42, 0.62, 0.012, 0, 0.45, 0.125, '#2b3a33').rotation.x = -0.22; T.K(0.5, 0.8, 0.03, 0, 0.42, -0.1, HOLZ).rotation.x = 0.22;
  for (let i = 0; i < 4; i++) T.K(0.26 - (i % 2) * 0.08, 0.025, 0.005, -0.02, 0.62 - i * 0.11, 0.092 + i * 0.025, '#f1ecd6').rotation.x = -0.22;
}

// ---------------------------------------------------------------------------------------------
// Die anderen Sachen auf dem Platz
// ---------------------------------------------------------------------------------------------
const bau = {
  bank(W) { for (let i = 0; i < 4; i++) W.K(1.9, 0.04, 0.1, 0, 0.46, -0.16 + i * 0.12, HOLZ); for (let i = 0; i < 3; i++) W.K(1.9, 0.1, 0.035, 0, 0.62 + i * 0.13, -0.27 - i * 0.02, HOLZ); for (const sx of [-0.85, 0.85]) { W.K(0.06, 0.46, 0.5, sx, 0.23, 0, EISEN); W.K(0.06, 0.5, 0.05, sx, 0.7, -0.28, EISEN); W.K(0.06, 0.04, 0.42, sx, 0.64, -0.06, EISEN); } },
  kuebel(W, q) { const w = zufall(q.nr + 40), f = BUNT[q.nr % BUNT.length]; W.R(0.4, 0.5, 0, 0.25, 0, STEIN, 'y', 1.18, 12); W.R(0.44, 0.06, 0, 0.5, 0, dunkler(STEIN, 0.85), 'y', 1, 12); W.S(0.4, 0, 0.62, 0, GRUEN, 1, 0.6, 1);
    for (let i = 0; i < 12; i++) { const a = i * 0.55 + w(), d = 0.1 + w() * 0.26; W.S(0.07, Math.sin(a) * d, 0.8 + w() * 0.08, Math.cos(a) * d, i % 4 ? f : '#f6f1e4'); } if (q.nr % 3 === 0) { W.R(0.03, 1.1, 0, 1.1, 0, '#5e452a'); W.S(0.42, 0, 1.9, 0, '#3f7a3a'); } },
  mast(W) { W.R(0.12, 0.5, 0, 0.25, 0, EISEN, 'y', 0.6, 8); W.R(0.05, MAST_HOCH, 0, MAST_HOCH / 2, 0, '#2f5a3f', 'y', 0.7, 8); W.S(0.09, 0, MAST_HOCH + 0.06, 0, '#e2a51e'); },
  stehtisch(W, q) { W.R(0.28, 0.03, 0, 0.015, 0, EISEN, 'y', 1, 12); W.R(0.035, 1.08, 0, 0.55, 0, '#c9ced4', 'y', 1, 8); W.R(0.38, 0.04, 0, 1.1, 0, '#f1ecd6', 'y', 1, 14); W.R(0.39, 0.3, 0, 0.93, 0, q.schirm || '#f6f1e4', 'y', 0.35, 12);
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + q.x; W.R(0.035, 0.09, Math.sin(a) * 0.2, 1.165, Math.cos(a) * 0.2, i ? '#f6f1e4' : '#d9534f', 'y', 1.2, 8); }
    if (q.schirm) { W.R(0.025, 2.5, 0, 1.25, 0, '#e9e2cf', 'y', 1, 6); for (let i = 0; i < 8; i++) { const m = W.R(1.5, 0.5, 0, 2.55, 0, i % 2 ? '#f6f1e4' : q.schirm, 'y', 0, 8); m.geometry = form('schirm' + i, () => new THREE.CylinderGeometry(0, 1, 1, 1, 1, true, i * Math.PI / 4, Math.PI / 4)); } } },
  drehorgel(W) {       // die Drehorgel: ein bunter Kasten auf einem Wagen mit zwei großen Rädern, vorn Pfeifen, an der Seite die Kurbel
    for (const s of [-1, 1]) { const r = W.R(0.42, 0.06, 0, 0.42, s * 0.46, '#b0342c', 'z', 1, 14); void r; W.R(0.08, 0.1, 0, 0.42, s * 0.46, '#e2a51e', 'z', 1, 8); }
    W.K(1.3, 0.08, 0.8, 0, 0.62, 0, HOLZ_DUNKEL); W.K(1.1, 0.75, 0.66, 0, 1.04, 0, '#8a2e3a'); W.K(1.16, 0.06, 0.72, 0, 1.44, 0, '#e2a51e'); W.K(1.0, 0.5, 0.02, 0, 1.06, 0.34, '#f1e2b0');
    for (let i = 0; i < 9; i++) W.R(0.035, 0.3 + Math.abs(4 - i) * 0.04, -0.4 + i * 0.1, 1.0 + Math.abs(4 - i) * 0.02, 0.37, '#e2a51e', 'y', 1, 6);
    W.K(0.5, 0.04, 0.04, 0.9, 0.6, 0.2, HOLZ_DUNKEL); W.K(0.5, 0.04, 0.04, 0.9, 0.6, -0.2, HOLZ_DUNKEL); W.K(0.04, 0.6, 0.04, 1.12, 0.3, 0, HOLZ_DUNKEL);
    W.R(0.02, 0.2, 0.62, 1.1, 0, '#c9ced4', 'x'); W.K(0.03, 0.22, 0.03, 0.72, 1.0, 0, '#c9ced4'); W.S(0.045, 0.72, 0.88, 0.02, '#2b2f33');
    W.R(0.16, 0.08, -0.2, 1.52, 0, '#3a3e46', 'y', 1, 10); W.R(0.11, 0.03, -0.2, 1.5, 0, '#e2a51e', 'y', 1, 10);       // der Hut für die Münzen
  },
  kaffeewagen(W) {       // ein kleiner dreirädriger Kastenwagen mit Klappe: der „Kaffee-Kutter“
    const f = '#7fbfae'; W.K(3.0, 1.25, 1.7, 0, 1.1, 0, f); W.K(3.0, 0.3, 1.7, 0, 0.33, 0, dunkler(f, 0.8)); W.K(3.06, 0.12, 1.76, 0, 1.78, 0, '#f6f1e4'); W.K(2.6, 0.1, 1.5, 0, 1.88, 0, '#f6f1e4');
    W.K(1.9, 0.75, 0.04, -0.2, 1.3, 0.84, '#2b3a33'); W.K(2.1, 0.06, 0.4, -0.2, 0.92, 1.0, HOLZ_HELL);       // die offene Klappe und der Tresen
    for (let i = 0; i < 6; i++) W.K(0.36, 0.03, 1.0, -1.1 + i * 0.36, 2.02, 1.25, i % 2 ? '#f6f1e4' : '#b0342c').rotation.x = 0.28;
    W.K(0.5, 0.42, 0.3, 0.3, 1.16, 0.9, '#c9ced4'); W.R(0.05, 0.14, 0.3, 1.44, 0.9, '#2b2f33');       // die Kaffeemaschine
    for (let i = 0; i < 6; i++) W.R(0.04, 0.1, -1.0 + i * 0.13, 1.0, 1.05, i % 2 ? '#f6f1e4' : '#c9643a', 'y', 1.25, 8);
    for (const [x, z] of [[-1.0, 0.86], [-1.0, -0.86], [1.0, 0.86], [1.0, -0.86]]) W.R(0.3, 0.14, x, 0.3, z, '#1d2126', 'z', 1, 12);
    W.K(0.04, 0.6, 1.1, 1.52, 1.35, 0, '#bfe0ea'); for (const s of [-1, 1]) W.S(0.09, 1.52, 0.75, s * 0.6, '#fff7c0');
    const T = W.teil(-1.9, 1.3, 0.4); T.K(0.55, 0.9, 0.03, 0, 0.47, 0.1, HOLZ).rotation.x = -0.2; T.K(0.46, 0.7, 0.012, 0, 0.5, 0.125, '#2b3a33').rotation.x = -0.2; T.K(0.55, 0.9, 0.03, 0, 0.47, -0.1, HOLZ).rotation.x = 0.2;
  },
  eiswagen(W) {       // der Eiswagen zum Schieben mit großem Schirm
    W.K(1.4, 0.7, 0.9, 0, 0.75, 0, '#f6f1e4'); W.K(1.42, 0.18, 0.92, 0, 0.5, 0, '#f0a0c0'); W.K(1.44, 0.05, 0.94, 0, 1.12, 0, '#c9ced4');
    for (let i = 0; i < 4; i++) W.R(0.14, 0.03, -0.48 + i * 0.32, 1.16, 0, ['#f6e7b0', '#f0a0c0', '#7a4a2a', '#b8e0b0'][i], 'y', 1, 10);
    for (const s of [-1, 1]) W.R(0.34, 0.06, -0.2, 0.34, s * 0.5, '#e84a6a', 'z', 1, 14); W.R(0.14, 0.05, 0.6, 0.14, 0, EISEN, 'z');
    W.K(0.04, 0.04, 1.0, 0.9, 1.0, 0, '#c9ced4'); for (const s of [-1, 1]) W.K(0.3, 0.04, 0.04, 0.78, 1.0, s * 0.48, '#c9ced4');
    W.R(0.025, 1.6, -0.5, 1.9, -0.3, '#e9e2cf', 'y', 1, 6);
    for (let i = 0; i < 8; i++) { const m = W.R(1.25, 0.42, -0.5, 2.7, -0.3, i % 2 ? '#f6f1e4' : '#e84a6a', 'y', 0, 8); m.geometry = form('schirm' + i, () => new THREE.CylinderGeometry(0, 1, 1, 1, 1, true, i * Math.PI / 4, Math.PI / 4)); }
    for (let i = 0; i < 3; i++) { W.R(0.035, 0.14, 0.2 + i * 0.14, 1.26, 0.3, '#d9a55a', 'y', 0, 6).rotation.x = Math.PI; W.S(0.045, 0.2 + i * 0.14, 1.35, 0.3, ['#f0a0c0', '#f6e7b0', '#7a4a2a'][i]); }
  },
  handkarren(W) {       // ein alter Handkarren voller Kürbisse, daneben Strohballen
    const w = zufall(77); W.K(2.0, 0.08, 1.1, 0, 0.72, 0, HOLZ); for (const s of [-1, 1]) { W.K(2.0, 0.3, 0.05, 0, 0.9, s * 0.55, HOLZ_DUNKEL); W.R(0.5, 0.07, -0.2, 0.5, s * 0.64, HOLZ_DUNKEL, 'z', 1, 14); W.R(0.1, 0.1, -0.2, 0.5, s * 0.64, EISEN, 'z', 1, 8); W.K(1.1, 0.05, 0.05, 1.5, 0.74, s * 0.45, HOLZ); }
    W.K(0.05, 0.3, 1.1, -1.0, 0.9, 0, HOLZ_DUNKEL); W.K(0.06, 0.7, 0.06, 0.9, 0.36, 0, HOLZ);
    for (let i = 0; i < 9; i++) W.S(0.2 + w() * 0.1, -0.75 + (i % 5) * 0.36, 0.95 + Math.floor(i / 5) * 0.26, (w() - 0.5) * 0.6, ['#e8862a', '#e8a03a', '#d9702a', '#c9c06a'][i % 4], 1, 0.78, 1);
    for (const [x, z, d] of [[-0.6, 1.2, 0.2], [0.5, 1.25, -0.15], [-0.05, 1.22, 0.05]]) { const T = W.teil(x, z, d, x === -0.05 ? 0.45 : 0); T.K(0.9, 0.45, 0.5, 0, 0.225, 0, '#e8cf7a'); for (const s of [-0.25, 0.25]) T.K(0.03, 0.47, 0.52, s, 0.225, 0, '#b89a4a'); }
    W.S(0.24, 1.1, 0.2, 1.3, '#e8862a', 1, 0.8, 1); W.S(0.17, 1.45, 0.14, 1.1, '#e8a03a', 1, 0.8, 1);
  },
  kasper(W) {       // das Kasperletheater: eine gestreifte Bude mit Fenster, darin Kasper und das Krokodil
    for (let i = 0; i < 6; i++) W.K(0.3, 1.25, 0.04, -0.75 + i * 0.3, 0.625, 0.52, i % 2 ? '#f6f1e4' : '#d9534f');
    for (const s of [-1, 1]) { W.K(0.08, 2.5, 0.08, s * 0.9, 1.25, 0.5, HOLZ_DUNKEL); W.K(0.04, 2.4, 1.0, s * 0.9, 1.2, 0, '#2f6fb0'); W.K(0.28, 0.75, 0.05, s * 0.72, 1.62, 0.53, '#b0342c'); }
    W.K(1.8, 2.4, 0.04, 0, 1.2, -0.5, '#2f6fb0'); W.K(1.7, 0.75, 0.04, 0, 1.62, 0.2, '#23262b');       // Rückwand und das dunkle Innere hinter dem Fenster
    W.K(1.9, 0.08, 0.2, 0, 1.25, 0.56, HOLZ_HELL); W.K(1.9, 0.5, 0.06, 0, 2.25, 0.52, '#e2a51e'); W.K(1.5, 0.14, 0.07, 0, 2.25, 0.53, '#b0342c'); W.K(2.0, 0.06, 1.2, 0, 2.52, 0, '#b0342c');
    W.R(1.0, 0.45, 0, 2.78, 0.5, '#e2a51e', 'y', 0, 4).scale.z = 0.05;       // der Giebel
    // Kasper mit roter Zipfelmütze …
    W.S(0.13, -0.3, 1.62, 0.5, '#f0c8a0'); W.R(0.12, 0.3, -0.3, 1.85, 0.5, '#d9534f', 'y', 0, 8); W.K(0.26, 0.22, 0.14, -0.3, 1.4, 0.5, '#e2a51e'); W.S(0.035, -0.3, 1.6, 0.63, '#d9534f');
    // … und das grüne Krokodil mit langem Maul
    W.K(0.2, 0.22, 0.16, 0.36, 1.42, 0.5, '#3f8f4a'); W.K(0.16, 0.07, 0.42, 0.36, 1.58, 0.62, '#4faf5a'); W.K(0.16, 0.06, 0.4, 0.36, 1.47, 0.6, '#3f8f4a').rotation.x = 0.25; W.S(0.04, 0.3, 1.64, 0.5, '#f6f1e4'); W.S(0.04, 0.42, 1.64, 0.5, '#f6f1e4');
  },
  heu(W) {       // Strohballen, Kürbisse und eine Vogelscheuche: die Herbst-Ecke
    for (const [x, y, z, d] of [[-0.75, 0, 0, 0.05], [0.2, 0, 0.05, -0.08], [-0.3, 0.45, 0, 0.3], [0.95, 0, -0.2, 1.4]]) { const T = W.teil(x, z, d, y); T.K(0.9, 0.45, 0.5, 0, 0.225, 0, '#e8cf7a'); for (const s of [-0.25, 0.25]) T.K(0.03, 0.47, 0.52, s, 0.225, 0, '#b89a4a'); }
    for (const [x, z, r, f] of [[-1.0, 0.55, 0.22, '#e8862a'], [-0.5, 0.6, 0.16, '#e8a03a'], [0.3, 0.62, 0.26, '#d9702a'], [0.75, 0.5, 0.14, '#c9c06a']]) W.S(r, x, r * 0.78, z, f, 1, 0.78, 1);
    W.S(0.18, 0.2, 0.59, 0.05, '#e8862a', 1, 0.78, 1);
    W.K(0.06, 2.0, 0.06, -0.3, 1.9, -0.1, HOLZ); W.K(1.3, 0.05, 0.05, -0.3, 2.35, -0.1, HOLZ); W.K(0.5, 0.6, 0.2, -0.3, 2.15, -0.1, '#b0342c'); for (const s of [-1, 1]) W.K(0.45, 0.16, 0.16, -0.3 + s * 0.45, 2.36, -0.1, '#b0342c');
    W.S(0.17, -0.3, 2.62, -0.1, '#e8cf7a'); W.R(0.34, 0.03, -0.3, 2.76, -0.1, '#8a6a44', 'y', 1, 10); W.R(0.17, 0.3, -0.3, 2.9, -0.1, '#8a6a44', 'y', 0, 8);
  },
  litfass(W) {       // die Litfaßsäule mit bunten Plakaten (ohne Schrift: nur farbige Zettel)
    const w = zufall(5); W.R(0.72, 0.25, 0, 0.125, 0, STEIN, 'y', 1, 16); W.R(0.62, 2.7, 0, 1.6, 0, '#e9e2cf', 'y', 1, 16); W.R(0.74, 0.14, 0, 3.0, 0, '#2f5a3f', 'y', 1, 16); W.R(0.7, 0.4, 0, 3.27, 0, '#2f5a3f', 'y', 0.2, 16); W.S(0.1, 0, 3.52, 0, '#e2a51e');
    for (let i = 0; i < 14; i++) { const a = i * 0.9 + w() * 0.3, T = W.teil(Math.sin(a) * 0.615, Math.cos(a) * 0.615, a, 0.55 + (i % 3) * 0.75 + w() * 0.2); T.K(0.42, 0.56, 0.02, 0, 0.3, 0, BUNT[i % BUNT.length]); T.K(0.3, 0.08, 0.025, 0, 0.42, 0, '#f6f1e4'); T.K(0.22, 0.2, 0.025, 0, 0.2, 0, dunkler(BUNT[(i + 3) % BUNT.length])); }
  },
  fahrraeder(W) {       // ein Bügel-Ständer mit fünf abgestellten Fahrrädern
    for (let i = 0; i < 5; i++) { const x = -1.3 + i * 0.65, T = W.teil(x, (i % 2) * 0.12, (i % 2 ? 0.08 : -0.06)), f = ['#d9534f', '#2f6fb0', '#2b2f33', '#5cb85c', '#e2a51e'][i];
      W.K(0.04, 0.8, 0.04, x - 0.2, 0.4, -0.5, '#c9ced4'); W.K(0.04, 0.8, 0.04, x - 0.2, 0.4, 0.1, '#c9ced4'); W.K(0.04, 0.04, 0.64, x - 0.2, 0.8, -0.2, '#c9ced4');
      for (const z of [-0.52, 0.52]) { for (let k = 0; k < 10; k++) { const a = k * 0.628; T.K(0.03, 0.03, 0.21, 0, 0.34 + Math.cos(a) * 0.32, z + Math.sin(a) * 0.32, '#1d2126').rotation.x = -a; } T.K(0.015, 0.62, 0.015, 0, 0.34, z, '#9aa0a6'); T.K(0.015, 0.015, 0.62, 0, 0.34, z, '#9aa0a6'); }
      T.K(0.04, 0.04, 0.62, 0, 0.62, -0.05, f).rotation.x = 0.08; T.K(0.04, 0.5, 0.04, 0, 0.56, -0.3, f).rotation.x = -0.3; T.K(0.04, 0.6, 0.04, 0, 0.6, 0.42, f).rotation.x = 0.32; T.K(0.04, 0.04, 0.6, 0, 0.42, 0.1, f).rotation.x = -0.5;
      T.K(0.14, 0.05, 0.26, 0, 0.86, -0.36, '#2b2f33'); T.K(0.5, 0.03, 0.03, 0, 0.95, 0.34, '#2b2f33'); if (i % 2) { T.K(0.3, 0.2, 0.26, 0, 0.82, 0.5, '#c9a060'); }
    }
  },
  wegweiser(W) { W.R(0.05, 3.2, 0, 1.6, 0, '#2f5a3f', 'y', 1, 8); W.S(0.08, 0, 3.24, 0, '#e2a51e'); [[0.3, '#f6f1e4'], [-1.2, '#f6f1e4'], [2.0, '#e8d9a8']].forEach(([a, f], i) => { const T = W.teil(0, 0, a, 2.9 - i * 0.3); T.K(0.9, 0.2, 0.03, 0.5, 0, 0, f); T.K(0.5, 0.03, 0.035, 0.45, 0, 0, '#2b2f33'); }); },
};
bau.ballons = () => {}; bau.karussell = () => {};       // die beiden bewegen sich und werden unten eigens gebaut

// Das Kinderkarussell: Der Sockel steht, das Dach mit den sechs Pferden dreht sich.
function baueKarussell() {
  const fest = werkzeug(new THREE.Group()), dreh = werkzeug(new THREE.Group()), ROT = '#d9534f', HELLF = '#f6f1e4';
  fest.R(2.3, 0.14, 0, 0.07, 0, '#8a2e3a', 'y', 1, 20); fest.R(2.2, 0.1, 0, 0.19, 0, '#e8d9a8', 'y', 1, 20); fest.R(0.22, 3.2, 0, 1.8, 0, '#e2a51e', 'y', 1, 10);
  for (let i = 0; i < 12; i++) { const m = dreh.R(2.5, 0.8, 0, 3.6, 0, i % 2 ? HELLF : ROT, 'y', 0, 12); m.geometry = form('dach' + i, () => new THREE.CylinderGeometry(0, 1, 1, 1, 1, true, i * Math.PI / 6, Math.PI / 6)); }
  dreh.R(2.5, 0.28, 0, 3.08, 0, '#e2a51e', 'y', 1, 24); dreh.S(0.16, 0, 4.06, 0, '#e2a51e'); dreh.R(0.6, 0.5, 0, 2.7, 0, ROT, 'y', 1.6, 12);
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + 0.26; dreh.S(0.07, Math.sin(a) * 2.5, 3.0, Math.cos(a) * 2.5, '#fff2a8'); }
  const FELL = ['#f6f1e4', '#8a5a2e', '#2b2f33', '#e8d9a8', '#c9a060', '#f6f1e4'], SATTEL = ['#d9534f', '#2f6fb0', '#e2a51e', '#5cb85c', '#8a4a9a', '#e84a6a'];
  for (let i = 0; i < 6; i++) {       // sechs Pferde an goldenen Stangen, abwechselnd hoch und tief
    const a = i * Math.PI / 3, T = dreh.teil(Math.sin(a) * 1.6, Math.cos(a) * 1.6, a + Math.PI / 2, i % 2 ? 0.12 : -0.1);
    T.R(0.03, 2.9, 0, 1.75, 0, '#e2a51e', 'y', 1, 6); T.K(0.26, 0.3, 0.8, 0, 1.0, 0, FELL[i]); T.K(0.2, 0.36, 0.22, 0, 1.25, 0.4, FELL[i]).rotation.x = -0.5; T.K(0.18, 0.2, 0.36, 0, 1.42, 0.6, FELL[i]).rotation.x = 0.25;
    T.K(0.28, 0.08, 0.34, 0, 1.18, -0.02, SATTEL[i]); T.K(0.06, 0.3, 0.1, 0, 1.3, 0.34, dunkler(FELL[i], 0.5)); T.K(0.07, 0.34, 0.07, 0, 1.0, -0.44, dunkler(FELL[i], 0.5)).rotation.x = -0.5;
    for (const [sx, sz, w] of [[-0.09, 0.3, 0.5], [0.09, 0.3, 0.2], [-0.09, -0.3, -0.3], [0.09, -0.3, -0.55]]) T.K(0.07, 0.5, 0.07, sx, 0.66, sz + w * 0.2, FELL[i]).rotation.x = -w;
  }
  return { fest: fest.g, dreh: dreh.g };
}
// Ein Strauß Luftballons an Schnüren (der Verkäufer steht darunter)
function baueBallons() {
  const W = werkzeug(new THREE.Group()), w = zufall(9);
  for (let i = 0; i < 11; i++) { const a = i * 2.4, d = 0.15 + w() * 0.5, x = Math.sin(a) * d, z = Math.cos(a) * d, y = 2.9 + w() * 0.9; W.S(0.24, x, y, z, BUNT[i % BUNT.length], 1, 1.2, 1); W.S(0.04, x, y - 0.3, z, BUNT[i % BUNT.length]);
    const lang = Math.hypot(x, y - 1.5, z), s = W.K(0.008, lang - 0.3, 0.008, x / 2 + 0.3, (y + 1.2) / 2, z / 2, '#f1ecd6'); s.rotation.z = -Math.atan2(x - 0.3 * 2 + 0.3, y - 1.2) ; s.rotation.x = Math.atan2(z, y - 1.2); }
  return W.g;
}
// Eine Taube aus drei Kugeln und einem Schnabel (schaut nach +z)
function taubenForm() {
  const W = werkzeug(new THREE.Group());
  W.S(0.09, 0, 0.12, 0, '#8d949b', 0.85, 0.8, 1.5); W.S(0.05, 0, 0.21, 0.11, '#6f7a86'); W.S(0.06, 0, 0.11, -0.14, '#5d646b', 0.8, 0.4, 1.6); W.S(0.045, 0, 0.15, 0.05, '#4f8a7a', 1, 0.8, 1);
  W.K(0.015, 0.015, 0.05, 0, 0.2, 0.17, '#e2a51e'); for (const s of [-1, 1]) W.S(0.07, s * 0.07, 0.13, -0.02, '#7a828a', 0.35, 0.7, 1.5);
  const netz = backen([W.g], new THREE.Group()); return netz.geometry;
}

// Die Namensbretter aller Stände: EIN gemaltes Bild mit allen Namen untereinander, EINE Form mit allen Brettern
function baueSchilder(liste) {
  const c = document.createElement('canvas'), ZEILE = 128; c.width = 1024; c.height = 2048;
  const x = c.getContext('2d'), orte = [], uv = [], richt = [], index = [];
  liste.forEach((s, i) => {
    const y = i * ZEILE; x.fillStyle = '#f6f1e4'; x.fillRect(0, y, 1024, ZEILE); x.strokeStyle = s.farbe; x.lineWidth = 12; x.strokeRect(10, y + 10, 1004, ZEILE - 20);
    x.fillStyle = dunkler(s.farbe, 0.7); x.font = '800 74px Georgia, "Times New Roman", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s.text, 512, y + ZEILE / 2 + 4, 940);
    const cs = Math.cos(s.dreh), sn = Math.sin(s.dreh), k = orte.length / 3, v1 = 1 - (y + ZEILE) / 2048, v2 = 1 - y / 2048;
    for (const [dx, dy, u, v] of [[-1, -1, 0, v1], [1, -1, 1, v1], [1, 1, 1, v2], [-1, 1, 0, v2]]) { orte.push(s.ort.x + dx * s.b / 2 * cs, s.ort.y + dy * s.h / 2, s.ort.z - dx * s.b / 2 * sn); uv.push(u, v); richt.push(sn, 0, cs); }
    index.push(k, k + 1, k + 2, k, k + 2, k + 3);
  });
  const bild = new THREE.CanvasTexture(c); bild.colorSpace = THREE.SRGBColorSpace; bild.anisotropy = 8;
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(orte, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(richt, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(index);
  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: bild }));
}

// Wimpelketten und Lichterketten zwischen den Masten: alle Wimpel sind EINE Form, alle Schnüre eine, alle Lämpchen eine
function baueKetten(lichter) {
  const P = [...MASTEN, ...ECKMASTEN], orte = [], farben = [], richt = [], schnur = [], f = new THREE.Color(); let nr = 0;
  for (const [a, b] of KETTEN) {
    const [ax, az] = P[a], [bx, bz] = P[b], lang = Math.hypot(bx - ax, bz - az), n = Math.round(lang / 0.42), tx = (bx - ax) / lang, tz = (bz - az) / lang;
    const ort = k => { const t = k / n; return [ax + (bx - ax) * t, MAST_HOCH - 0.1 - 4 * DURCHHANG * lang * t * (1 - t), az + (bz - az) * t]; };
    for (let k = 0; k < n; k++) {
      const [x, y, z] = ort(k), [x2, y2, z2] = ort(k + 1); schnur.push(x, y, z, x2, y2, z2);
      if (k % 4 === 2) { lichter.push(new THREE.Vector3((x + x2) / 2, (y + y2) / 2 - 0.09, (z + z2) / 2)); continue; }
      f.set(WIMPEL[nr++ % WIMPEL.length]);
      orte.push(x + tx * 0.03, y, z + tz * 0.03, x2 - tx * 0.03, y2, z2 - tz * 0.03, (x + x2) / 2, (y + y2) / 2 - 0.44, (z + z2) / 2);
      for (let i = 0; i < 3; i++) { farben.push(f.r, f.g, f.b); richt.push(-tz, 0.35, tx); }
    }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(orte, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(farben, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(richt, 3));
  const wimpel = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(schnur, 3));
  return [wimpel, new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: '#3a3a3a' }))];
}
function baueLichter(lichter) {
  const vor = new THREE.OctahedronGeometry(0.075, 0).attributes.position, orte = [];
  for (const l of lichter) for (let i = 0; i < vor.count; i++) orte.push(vor.getX(i) + l.x, vor.getY(i) * 1.3 + l.y, vor.getZ(i) + l.z);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(orte, 3));
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#e6dcc0', fog: false }));
}

// ---------------------------------------------------------------------------------------------
// Die Menschen laden (nur einmal): { b1: { bilder: [13 Formen], map }, … } oder null, wenn etwas fehlt
// ---------------------------------------------------------------------------------------------
let figuren = null;
function ladeFiguren() {
  if (!figuren) figuren = Promise.all(['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'].map(name => new GLTFLoader().loadAsync(`assets/besucher/${name}.glb`).then(gltf => {
    const bilder = []; let map = null;
    gltf.scene.traverse(o => { if (o.isMesh) { bilder.push(o.geometry); map = o.material.map; } });
    return [name, { bilder, map }];
  }))).then(alle => Object.fromEntries(alle)).catch(e => { console.warn('Die Marktbesucher konnten nicht geladen werden:', e); return null; });
  return figuren;
}

// ---------------------------------------------------------------------------------------------
// Den ganzen Markt bauen. Zurück kommt { gruppe, schritt(dt, kim, sparsam), licht(name), leben }.
// ---------------------------------------------------------------------------------------------
export function baueMarkt() {
  const gruppe = new THREE.Group(), stat = new THREE.Group(), W = werkzeug(stat), schilder = [], lichter = [];
  STAENDE.forEach((s, i) => baueStand(W, s, i, schilder, lichter));
  for (const q of SACHEN) if (bau[q.art]) bau[q.art](W.teil(q.x, q.z, q.dreh || 0), q);
  // Karussell und Luftballons bewegen sich: Sie bekommen eigene Formen
  const kq = SACHEN.find(q => q.art === 'karussell'), K = baueKarussell(), karussell = new THREE.Group(), kFest = new THREE.Group();
  kFest.position.set(kq.x, 0, kq.z); karussell.position.set(kq.x, 0, kq.z); gruppe.add(kFest, karussell); backen([K.fest], kFest); backen([K.dreh], karussell);
  const bq = SACHEN.find(q => q.art === 'ballons'), ballons = new THREE.Group(); ballons.position.set(bq.x, 0, bq.z); gruppe.add(ballons); backen([baueBallons()], ballons);
  const fest = backen([stat], gruppe); if (fest) fest.material = new THREE.MeshLambertMaterial({ vertexColors: true });
  gruppe.add(baueSchilder(schilder), ...baueKetten(lichter));
  const lampen = baueLichter(lichter); gruppe.add(lampen);
  // Ein warmer Schein auf dem Pflaster unter den Lichterketten (nur abends und nachts)
  const schein = new THREE.Mesh(new THREE.CircleGeometry(30, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffb860', transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending }));
  schein.scale.set(1.15, 1, 0.8); schein.position.set(MARKT.mx, 0.05, MARKT.mz); schein.visible = false; schein.renderOrder = 2; gruppe.add(schein);

  // ---- Tauben: eine Form, viele Male hingestellt
  const netz = { rechtecke: hindernisse() }, belegt = (x, z) => netz.rechtecke.some(r => x > r[0] - 0.4 && x < r[2] + 0.4 && z > r[1] - 0.4 && z < r[3] + 0.4) || Math.hypot(x - MARKT.mx, z - MARKT.mz) < 3.6;
  const taubenIM = new THREE.InstancedMesh(taubenForm(), new THREE.MeshLambertMaterial({ vertexColors: true }), TAUBEN); taubenIM.castShadow = true; taubenIM.frustumCulled = false; gruppe.add(taubenIM);
  const tw = zufall(31), landeplatz = (mx, mz, r) => { for (let v = 0; v < 30; v++) { const a = tw() * 6.283, d = tw() * r, x = mx + Math.sin(a) * d, z = mz + Math.cos(a) * d; if (x > MARKT.innen[0] + 1 && x < MARKT.innen[2] - 1 && z > MARKT.innen[1] + 1 && z < MARKT.innen[3] - 1 && !belegt(x, z)) return [x, z]; } return [mx, mz]; };
  const SCHWARM = [[-44, -24.5], [-37, -36.5], [-27, -25.5], [-49, -20], [-58, -24]];
  const tauben = Array.from({ length: TAUBEN }, (_, i) => { const [mx, mz] = SCHWARM[i % SCHWARM.length], [x, z] = landeplatz(mx, mz, 2.6); return { x, z, y: 0, h: tw() * 6.283, zx: x, zz: z, warte: tw() * 4, flug: 0, takt: tw() * 9, ax: x, az: z }; });

  // ---- Menschen
  const leben = new Marktleben(BESUCHER_TAG), o = new THREE.Object3D(), farbe = new THREE.Color();
  let menge = null, zahl = BESUCHER_TAG, verkauf = true, zeit = 0, nah = true;
  ladeFiguren().then(M => {
    if (!M) return;
    const anzahl = {}; for (const p of leben.alle) anzahl[p.wer] = (anzahl[p.wer] || 0) + 1;
    menge = {};
    for (const [name, n] of Object.entries(anzahl)) {
      const mat = new THREE.MeshLambertMaterial({ map: M[name].map, alphaTest: 0.45, side: THREE.DoubleSide });
      // Die Farbe des Besuchers kommt nur aufs Hemd. Das Hemd erkennt man an seiner Stelle im Bild der Figur.
      mat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `
        #ifdef USE_COLOR
        { vec2 f = vec2(vMapUv.x, 1.0 - vMapUv.y); if (f.x >= 0.5 && f.x <= 0.75 && f.y >= 0.5) diffuseColor.rgb *= vColor; }
        #endif`); };
      menge[name] = M[name].bilder.map(geo => { const im = new THREE.InstancedMesh(geo, mat, n); im.setColorAt(0, farbe.set('#ffffff')); im.count = 0; im.frustumCulled = false; im.castShadow = true; im.visible = false; gruppe.add(im); return im; });
    }
  });
  function zeigeLeute() {
    for (const reihe of Object.values(menge)) for (const im of reihe) im.count = 0;
    for (const p of leben.alle) {
      if (!p.da) continue;
      const im = menge[p.wer][p.bild], k = p.gross * 1.75 * MENSCH_GROSS;
      o.position.set(p.x + (p.sx || 0), p.hoch || 0, p.z + (p.sz || 0)); o.rotation.set(0, p.h, 0); o.scale.set(k * p.breit, k, k * p.breit); o.updateMatrix();
      im.setMatrixAt(im.count, o.matrix); im.setColorAt(im.count, OHNE_FARBE.includes(p.wer) ? farbe.set('#ffffff') : farbe.set(p.hemd)); im.count++;
    }
    for (const reihe of Object.values(menge)) for (const im of reihe) { im.visible = im.count > 0; if (im.visible) { im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; } }
  }
  function taubenSchritt(dt, kim) {
    tauben.forEach((t, i) => {
      if (t.flug > 0) {       // im Flug: in einem Bogen zum neuen Landeplatz
        t.flug = Math.max(0, t.flug - dt / t.dauer); const k = 1 - t.flug, weich = k * k * (3 - 2 * k);
        t.x = t.ax + (t.zx - t.ax) * weich; t.z = t.az + (t.zz - t.az) * weich; t.y = Math.sin(k * Math.PI) * t.hoch; t.h = Math.atan2(t.zx - t.ax, t.zz - t.az);
      } else {
        if (kim && Math.hypot(kim.x - t.x, kim.z - t.z) < TAUBE_SCHRECK) {       // Kim kommt: auffliegen und woanders landen
          const [mx, mz] = SCHWARM[Math.floor(tw() * SCHWARM.length)]; [t.zx, t.zz] = landeplatz(mx, mz, 3); t.ax = t.x; t.az = t.z; t.flug = 1; t.dauer = 1.8 + tw() * 1.4; t.hoch = 2.5 + tw() * 3;
        } else {       // am Boden: ein paar Schritte trippeln, dann picken
          t.warte -= dt; const dx = t.zx - t.x, dz = t.zz - t.z, d = Math.hypot(dx, dz);
          if (d > 0.05) { t.x += dx / d * Math.min(d, 0.5 * dt); t.z += dz / d * Math.min(d, 0.5 * dt); t.h = Math.atan2(dx, dz); }
          else if (t.warte <= 0) { t.warte = 1.5 + tw() * 5; const [x, z] = landeplatz(t.x, t.z, 1.3); t.zx = x; t.zz = z; }
        }
      }
      const fliegt = t.flug > 0, pick = !fliegt && Math.sin(zeit * 3 + t.takt) > 0.55;
      o.position.set(t.x, t.y + (fliegt ? 0 : Math.abs(Math.sin(zeit * 9 + t.takt)) * 0.012), t.z); o.rotation.set(pick ? 0.7 : fliegt ? -0.25 : 0, t.h, 0, 'YXZ');
      o.scale.set(fliegt ? 1.5 + Math.sin(zeit * 30 + i) * 1.1 : 1, 1, 1); o.updateMatrix(); taubenIM.setMatrixAt(i, o.matrix);
    });
    taubenIM.instanceMatrix.needsUpdate = true;
  }

  return {
    gruppe, leben,
    // abends leuchten die Lichterketten, es sind nur noch wenige Leute da; nachts ist der Markt leer
    licht(name) {
      const spaet = name === 'abend' || name === 'nacht' || name === 'dunkel';
      lampen.material.color.set(spaet ? '#ffd27a' : '#e6dcc0'); schein.visible = spaet;
      zahl = name === 'tag' ? BESUCHER_TAG : name === 'abend' ? BESUCHER_ABEND : 0; verkauf = name === 'tag' || name === 'abend';
      taubenIM.visible = name === 'tag' || name === 'abend';
    },
    // einmal pro Bild. kim = { x, z } wenn Kim zu Fuß unterwegs ist (sonst null), sx/sz = wo der Spieler ist
    schritt(dt, sx, sz, kim, sparsam) {
      const weit = Math.hypot(sx - MARKT.mx, sz - MARKT.mz);
      if (weit > SICHT) { if (nah) { nah = false; gruppe.visible = false; } return; }
      if (!nah) { nah = true; gruppe.visible = true; }
      zeit += dt;
      karussell.rotation.y += dt * KARUSSELL_TEMPO;
      ballons.rotation.z = Math.sin(zeit * 0.9) * 0.05; ballons.rotation.x = Math.sin(zeit * 0.7 + 1) * 0.04;
      for (const v of leben.feste) v.da = verkauf;
      leben.schritt(dt, kim, sparsam ? Math.min(zahl, BESUCHER_SPAR) : zahl);
      if (menge) zeigeLeute();
      if (taubenIM.visible) taubenSchritt(dt, kim);
    },
  };
}
