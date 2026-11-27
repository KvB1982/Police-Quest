// Blaulicht über Möwenbrück – der Horizont: alles, was man weit draußen sieht, damit die Stadt nicht auf einer leeren Platte liegt.
// Vorbild: die Umgebung der Gelände in Powershot (umgebung.js: nah Felder, Wald und Häuser, fern Hügel, alles zu wenigen
// großen Formen verschmolzen) und die Natur im Reitturnier (natur.js: Hügel am Horizont, Vögel, Tiere auf der Weide).
// Hier ist es eine Küste an der Nordsee: flaches Marschland mit Feldern, Knicks (Hecken) und Gräben, Schafe auf dem Deich,
// draußen Halligen, Sandbänke, ein Windpark im Meer und der große Überseehafen.
// Hinaus kann man nicht – das alles ist nur zum Ansehen da (vom Kai, vom Stadtrand und später aus dem Hubschrauber). Alles ist ausgedacht.

import * as THREE from 'three';
import { WIND, LUFT } from './wetterplan.js';
import * as BILD from './bilder.js';
import { Eimer, farbe } from './stadtbau.js';
import { STADT_RAND, UFER, GLEIS, wuerfel } from './stadtplan.js';

// ---- Zahlen zum Einstellen ----
const LAND_WEIT = 2450;                  // so weit reichen die Felder (gemessen von MITTE), dahinter beginnen die Hügel
const MITTE = [0, 300];                  // die Mitte der Hügel-Kette
const HUEGEL_AB = 2500, HUEGEL_HOCH = 0.5;   // wo die Hügel anfangen und wie hoch sie sind (1 = bis 235 m, 0.5 = sanfter Geestrücken)
const MOEWEN = 42;                       // so viele Möwen kreisen über Hafen, Insel und Kutter
export const DOERFER = [[-1750, 520], [1900, 420], [-900, 1750], [1100, 1900], [2700, 1500], [-2800, 1400]];   // die Dorfmitten (auch in umland.js)
// Die zwei Enden der Küstenautobahn: Sie biegen draußen sanft ab und laufen dann hinter dem Deich am Meer entlang.
export const AUTOBAHN_FERN = [
  [[-846, 462], [-1010, 366], [-1220, 290], [-1600, 245], [-2600, 262], [-5000, 330]],
  [[866, 552], [1040, 456], [1280, 368], [1700, 318], [2600, 340], [5000, 430]],
];
const LANDSTRASSEN = [[[-3600, 152], [-826, 152]], [[-1500, 56], [-826, 56]]];
const HAFEN_OST = [1380, UFER - 250, 2300, UFER + 16];       // die Fläche des Überseehafens (ragt ins Meer)
const GAERTEN = [[-300, 930, 320, 1090], [-1120, 560, -900, 800], [905, 610, 1110, 850]];   // drei Kleingarten-Anlagen am Stadtrand
const CAMPING = [-1320, UFER + 62, -1010, UFER + 138];
const WINDRAEDER = [[-1400, 1100], [-1650, 1300], [-1200, 1420], [1500, 950], [1780, 1150], [1380, 1320], [2100, 820], [-2300, 760], [300, 2300], [-150, 2500], [900, 2550]];
const MUEHLE = [-1330, 640];

// ---- kleine Rechen-Helfer ----
const abstandStrecke = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const abstandLinie = (x, z, pts) => { let d = 1e9; for (let i = 0; i + 1 < pts.length; i++) d = Math.min(d, abstandStrecke(x, z, pts[i], pts[i + 1])); return d; };
const inRecht = (x, z, r, rand = 0) => x > r[0] - rand && x < r[2] + rand && z > r[1] - rand && z < r[3] + rand;
// Ein weiches „Rauschen“: gibt für jede Stelle eine Zahl von 0 bis 1, nah beieinander ähnlich (für Flecken in der Landschaft)
function rauschen(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi, h = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return (h(xi, zi) * (1 - u) + h(xi + 1, zi) * u) * (1 - v) + (h(xi, zi + 1) * (1 - u) + h(xi + 1, zi + 1) * u) * v;
}
// So hoch sind die Hügel an einer Stelle: a = Richtung von MITTE aus, t = 0 (innen) bis 1 (außen)
function huegelHoehe(a, t) {
  return Math.sin(t * Math.PI * 0.62) * (95 + 70 * Math.sin(a * 3.1 + 1) + 45 * Math.sin(a * 7.3) + 25 * Math.sin(a * 13.7 + 2)) * Math.max(0, Math.min(1, Math.sin(a) * 2.6 + 0.9)) * HUEGEL_HOCH;
}
const huegelOrt = (a, t) => [Math.cos(a) * (HUEGEL_AB + t * 2280) + MITTE[0], Math.max(0, huegelHoehe(a, t)), Math.sin(a) * (HUEGEL_AB + t * 2280) + MITTE[1]];

// ---- Bau-Helfer: Sie legen einfache Formen in einen Eimer (siehe stadtbau.js) ----
// Rolle oder Kegelstumpf: unten Halbmesser r0, oben r1
function rolle(e, x, z, y0, y1, r0, r1, f, n = 10, deckel = true) {
  for (let i = 0; i < n; i++) {
    const a = i / n * 6.2832, b = (i + 1) / n * 6.2832, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    e.quad([x + ca * r0, y0, z + sa * r0], [x + cb * r0, y0, z + sb * r0], [x + cb * r1, y1, z + sb * r1], [x + ca * r1, y1, z + sa * r1], f);
    if (deckel && r1 > 0.01) e.drei([x, y1, z], [x + ca * r1, y1, z + sa * r1], [x + cb * r1, y1, z + sb * r1], f);
  }
}
// Flache Insel mit krummem Rand: oben eine Fläche, außen fällt sie schräg ab
function scholle(e, x, z, rx, rz, y0, y1, breit, f, saat = 1, n = 22) {
  const rand = i => 0.62 + 0.7 * rauschen(saat * 7.3 + Math.cos(i / n * 6.2832) * 1.4, saat * 3.1 + Math.sin(i / n * 6.2832) * 1.4);
  for (let i = 0; i < n; i++) {
    const a = i / n * 6.2832, b = (i + 1) / n * 6.2832, ka = rand(i), kb = rand((i + 1) % n);
    const p = [x + Math.cos(a) * rx * ka, y1, z + Math.sin(a) * rz * ka], q = [x + Math.cos(b) * rx * kb, y1, z + Math.sin(b) * rz * kb];
    e.drei([x, y1, z], q, p, f);
    e.quad([x + Math.cos(a) * (rx * ka + breit), y0, z + Math.sin(a) * (rz * ka + breit)], [x + Math.cos(b) * (rx * kb + breit), y0, z + Math.sin(b) * (rz * kb + breit)], q, p, f);
  }
}
// Klumpen: eine runde Kuppel mit sechs Ecken – von Weitem ein Busch, eine Baumkrone oder eine Düne
function klumpen(e, x, y, z, rx, ry, rz, f, dreh = 0) {
  const P = [], Q = [];
  for (let i = 0; i < 6; i++) { const a = dreh + i * 1.0472; P.push([x + Math.cos(a) * rx, y, z + Math.sin(a) * rz]); Q.push([x + Math.cos(a + 0.5) * rx * 0.72, y + ry * 0.62, z + Math.sin(a + 0.5) * rz * 0.72]); }
  for (let i = 0; i < 6; i++) { const j = (i + 1) % 6; e.quad(P[j], P[i], Q[i], Q[j], f); e.drei(Q[j], Q[i], [x, y + ry, z], f); }
}
// Haus mit Satteldach (dreh = der First läuft längs statt quer)
function haus(e, x, z, b, t, h, wand, dach, dreh, y = 0) {
  const [bx, bz] = dreh ? [t, b] : [b, t], x1 = x - bx / 2, x2 = x + bx / 2, z1 = z - bz / 2, z2 = z + bz / 2, yh = y + h, yr = yh + Math.min(bx, bz) * 0.45, df = farbe(dach), wf = farbe(wand);
  e.kiste(x1, y, z1, x2, yh, z2, wf);
  if (dreh) { e.quad([x2, yh, z2], [x2, yh, z1], [x, yr, z1], [x, yr, z2], df); e.quad([x1, yh, z1], [x1, yh, z2], [x, yr, z2], [x, yr, z1], df); e.drei([x1, yh, z2], [x2, yh, z2], [x, yr, z2], wf); e.drei([x2, yh, z1], [x1, yh, z1], [x, yr, z1], wf); }
  else { e.quad([x1, yh, z2], [x2, yh, z2], [x2, yr, z], [x1, yr, z], df); e.quad([x2, yh, z1], [x1, yh, z1], [x1, yr, z], [x2, yr, z], df); e.drei([x1, yh, z1], [x1, yh, z2], [x1, yr, z], wf); e.drei([x2, yh, z2], [x2, yh, z1], [x2, yr, z], wf); }
}
// Ein Band am Boden entlang einer Linie aus Punkten (für die Autobahn draußen)
function band(e, pts, breit, y, f) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], l = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / l * breit, nz = (bx - ax) / l * breit;
    // an den Knicken ein Stück länger, damit keine Lücke bleibt
    const v = i + 2 < pts.length ? breit * 0.6 : 0, ex = bx + (bx - ax) / l * v, ez = bz + (bz - az) / l * v;
    e.quad([ax - nx, y, az - nz], [ax + nx, y, az + nz], [ex + nx, y, ez + nz], [ex - nx, y, ez - nz], f, 0, 0, 4, l / 5);
  }
}

// Steht an dieser Stelle draußen schon etwas (Autobahn, Landstraße, Gleise, Kleingärten, Campingplatz, Mühle)? Dann darf dort kein Feld und kein Baum hin.
export function fernBelegt(x, z, rand = 0) {
  return AUTOBAHN_FERN.some(p => abstandLinie(x, z, p) < 14 + rand) || LANDSTRASSEN.some(p => abstandLinie(x, z, p) < 6 + rand) || (x > GLEIS[0] - rand - 6 && x < GLEIS[2] + rand + 6 && z < GLEIS[3] + 20)
    || GAERTEN.some(r => inRecht(x, z, r, rand + 4)) || inRecht(x, z, CAMPING, rand + 4) || Math.hypot(x - MUEHLE[0], z - MUEHLE[1]) < 34 + rand;
}

// Ein Eimer, der seine Dreiecke nach der Gegend auf mehrere Eimer verteilt. So muss die Grafikkarte nur die Gegenden
// zeichnen, die gerade im Bild sind (wichtig fürs iPad).
class Teiler {
  constructor(xs, zs) { this.xs = xs; this.zs = zs; this.e = new Map(); }
  wo(x, z) { let i = 0, j = 0; while (i < this.xs.length && x > this.xs[i]) i++; while (j < this.zs.length && z > this.zs[j]) j++; const k = i * 10 + j; if (!this.e.has(k)) this.e.set(k, new Eimer()); return this.e.get(k); }
  quad(a, ...r) { this.wo(a[0], a[2]).quad(a, ...r); }
  drei(a, ...r) { this.wo(a[0], a[2]).drei(a, ...r); }
  kiste(x1, y1, z1, ...r) { this.wo(x1, z1).kiste(x1, y1, z1, ...r); }
  boden(r, ...rest) { this.wo(r[0], r[1]).boden(r, ...rest); }
  formen() { return [...this.e.values()].map(e => e.form()); }
  get dreiecke() { let n = 0; for (const e of this.e.values()) n += e.p.length / 9; return n; }
}

export function baueHorizont() {
  const gruppe = new THREE.Group(), w = wuerfel(4711), zw = (a, b) => a + w() * (b - a), aus = l => l[Math.floor(w() * l.length)];
  const X0 = STADT_RAND.x0, X1 = STADT_RAND.x1, Z1 = STADT_RAND.z1;
  const inStadt = (x, z, rand = 0) => x > X0 - rand && x < X1 + rand && z < Z1 + rand;
  // Vier Eimer: Dinge an Land, Dinge im Meer, Felder (liegen flach auf der Wiese), Wasser (Gräben, flaches Wasser)
  const land = new Teiler([-1100, 0, 1100], [700, 1700]), see = new Teiler([-1100, 300, 1300], [-1500]), felder = new Teiler([-1100, 0, 1100], [700, 1700]), strasse = new Eimer(), graben = new Eimer(), flach = new Eimer();
  const blink = [], warm = [];           // Lichter für die Nacht: rote Blinklichter und warme Lampen [x, y, z, r, g, b]
  const lampe = (x, y, z, hex) => { const f = farbe(hex); warm.push(x, y, z, f.r, f.g, f.b); };

  // ================================================================== AN LAND
  // ---- Die Autobahn läuft draußen in einem weiten Bogen weiter (früher lief sie geradeaus ins Meer)
  for (const pts of AUTOBAHN_FERN) {
    band(strasse, pts, 11, -0.02, farbe('#7d8085'));
    // Leitplanke in der Mitte und ab und zu ein blaues Schild
    for (let i = 0; i + 1 < pts.length; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], l = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / l * 0.25, nz = (bx - ax) / l * 0.25;
      land.quad([ax - nx, 0, az - nz], [bx - nx, 0, bz - nz], [bx - nx, 0.8, bz - nz], [ax - nx, 0.8, az - nz], farbe('#b9bec4')); }
  }
  const besetzt = (x, z, rand = 0) => inStadt(x, z, 34 + rand) || fernBelegt(x, z, rand);

  // ---- Felder wie ein Flickenteppich: Reihe für Reihe, jedes Feld etwas anders breit. Dazwischen bleibt ein Streifen Wiese.
  const FELD = ['#e9d23c', '#d8c477', '#cdb96a', '#8fb85e', '#7fae58', '#a3c66a', '#6f9f52', '#b08a5a', '#9a7648', '#b9d46a', '#86b060', '#c7d98a'];
  const WALD = ['#3f6f3a', '#4a7c42', '#44763a', '#557f46', '#3a6640'], NADEL = ['#2f5a44', '#37634a', '#3f6f4a'];
  const wiesen = [], stoppeln = [];
  // Das Land ist in breite Streifen geteilt; in jedem liegen die Felder etwas anders – sonst sähe es von oben aus wie ein Schachbrett.
  for (let bx = -3300; bx < 3300;) { const bBreit = zw(650, 1150);
  for (let z = UFER + 64 + zw(0, 40); z < 2800;) {
    const tief = zw(100, 230);
    for (let x = bx; x < bx + bBreit - 60;) {
      const breit = Math.min(zw(140, 330), bx + bBreit - x), x2 = x + breit - 7, z2 = z + tief - 7, mx = x + breit / 2, mz = z + tief / 2;
      const frei = Math.hypot(mx - MITTE[0], mz - MITTE[1]) < LAND_WEIT && ![[x, z], [x2, z], [x, z2], [x2, z2], [mx, mz]].some(([a, b]) => besetzt(a, b, 3));
      if (frei) {
        const wurf = w();
        if (wurf < 0.1) {             // ein Waldstück: dicht an dicht Baumkronen
          const nadel = w() < 0.35;
          for (let i = 0, n = Math.round(breit * tief / 760); i < n; i++) { const r = zw(8, 12.5); klumpen(land, zw(x + 8, x2 - 8), 0, zw(z + 8, z2 - 8), r, nadel ? r * 2 : r * 1.35, r, farbe(aus(nadel ? NADEL : WALD)), w() * 6); }
          felder.boden([x, z, x2, z2], 0, farbe('#5f8a4a'), 14);
        } else {
          const nr = Math.floor(w() * FELD.length); felder.boden([x, z, x2, z2], 0, farbe(FELD[nr]), 14);
          if (nr >= 3 && nr <= 6 && w() < 0.4) wiesen.push([x, z, x2, z2]);         // grüne Weide: hier können Kühe stehen
          if (nr >= 1 && nr <= 2 && w() < 0.5) stoppeln.push([x, z, x2, z2]);       // gemähtes Kornfeld: hier liegen Strohballen
          // Knick: eine Hecke mit Bäumen am Rand des Feldes
          if (w() < 0.45) { const laengs = w() < 0.5, f = farbe(aus(WALD));
            if (laengs) land.kiste(x, 0, z2 + 1.5, x2, 3.2, z2 + 5, f); else land.kiste(x2 + 1.5, 0, z, x2 + 5, 3.2, z2, f);
            for (let i = 0, n = 2 + Math.floor(w() * 5); i < n; i++) { const r = zw(4, 6.5); klumpen(land, laengs ? zw(x, x2) : x2 + 3.2, 2.5, laengs ? z2 + 3.2 : zw(z, z2), r, r * 1.5, r, farbe(aus(WALD)), w() * 6); } }
          // Graben: ein schmaler Streifen Wasser am Rand (das Marschland wird so entwässert)
          else if (w() < 0.4) graben.boden([x, z - 5, x2, z - 2.2], 0.02, farbe('#4a86a0'), 20);
        }
      }
      x += breit;
    }
    z += tief;
  }
  bx += bBreit; }
  // ---- Kühe auf den Weiden (schwarz-weiß) und Strohballen auf den Stoppelfeldern
  for (const r of wiesen.slice(0, 26)) for (let i = 0, n = 5 + Math.floor(w() * 7); i < n; i++) {
    const x = zw(r[0] + 10, r[2] - 10), z = zw(r[1] + 10, r[3] - 10), q = w() < 0.5, l = 1.1, d = 0.42;
    land.kiste(x - (q ? l : d), 0.55, z - (q ? d : l), x + (q ? l : d), 1.45, z + (q ? d : l), farbe(w() < 0.25 ? '#6b4a34' : '#f2efe6'));
    land.kiste(x - (q ? 0.5 : d + 0.02), 0.8, z - (q ? d + 0.02 : 0.5), x + (q ? 0.2 : d + 0.02), 1.47, z + (q ? d + 0.02 : 0.2), farbe('#2a2623'));       // der schwarze Fleck
    land.kiste(x + (q ? l : -0.2), 0.9, z + (q ? -0.2 : l), x + (q ? l + 0.55 : 0.2), 1.5, z + (q ? 0.2 : l + 0.55), farbe('#2a2623'));                    // der Kopf
  }
  for (const r of stoppeln.slice(0, 22)) for (let i = 0, n = 6 + Math.floor(w() * 8); i < n; i++) rolle(land, zw(r[0] + 8, r[2] - 8), zw(r[1] + 8, r[3] - 8), 0, 1.5, 0.95, 0.95, farbe('#e3cf82'), 7);

  // ---- Schafe auf dem Deich, links und rechts der Stadt
  const deichHoch = z => Math.max(0, 6.5 * (1 - Math.abs(z - (UFER + 30)) / 15));
  for (const [a, b, n] of [[-2600, X0 - 12, 170], [X1 + 12, HAFEN_OST[0] - 30, 70], [HAFEN_OST[2] + 40, 3300, 60]]) for (let i = 0; i < n; i++) {
    const x = zw(a, b), z = zw(UFER + 19, UFER + 43), y = deichHoch(z), q = w() < 0.5;
    land.kiste(x - (q ? 0.6 : 0.33), y + 0.3, z - (q ? 0.33 : 0.6), x + (q ? 0.6 : 0.33), y + 0.95, z + (q ? 0.33 : 0.6), farbe(w() < 0.08 ? '#4a4038' : '#f1ede2'));
    land.kiste(x + (q ? 0.6 : -0.15), y + 0.6, z + (q ? -0.15 : 0.6), x + (q ? 0.92 : 0.15), y + 0.98, z + (q ? 0.15 : 0.92), farbe('#2c2622'));
  }
  // Ein Weg oben auf dem Deich und ein paar Bänke
  for (const [a, b] of [[-3600, X0 - 2], [X1 + 2, HAFEN_OST[0] - 4]]) strasse.boden([a, UFER + 28.6, b, UFER + 31.4], 6.56, farbe('#c9c2b0'), 3);

  // ---- Strandkörbe am Strand und eine Seebrücke im Westen
  for (const [a, b, n] of [[-1500, X0 - 20, 64], [X1 + 20, HAFEN_OST[0] - 60, 36]]) for (let i = 0; i < n; i++) {
    const x = a + (b - a) * (i + w() * 0.7) / n, z = UFER + zw(3, 12), f = farbe(aus(['#2f5d9a', '#c8372d', '#2e9a4f', '#e3a92c'])), y = -0.1;
    land.kiste(x - 0.75, y, z - 0.5, x + 0.75, y + 0.9, z + 0.5, farbe('#e8dcc0')); land.kiste(x - 0.78, y + 0.9, z - 0.1, x + 0.78, y + 1.75, z + 0.55, f); land.kiste(x - 0.78, y + 1.6, z - 0.75, x + 0.78, y + 1.75, z - 0.1, farbe('#f4f4f0'));
  }
  { const x = -1160, z0 = UFER + 16, z1 = UFER - 190, holz = farbe('#8a7458');
    see.kiste(x - 3, 2.2, z1, x + 3, 2.6, z0, holz); for (let z = z0 - 6; z > z1; z -= 12) for (const s of [-2.6, 2.6]) see.kiste(x + s - 0.25, -2.5, z - 0.25, x + s + 0.25, 2.2, z + 0.25, farbe('#5a4a3a'));
    for (const s of [-3, 3]) see.kiste(x + s - 0.06, 3.5, z1, x + s + 0.06, 3.6, z0, farbe('#f4f4f0'));
    see.kiste(x - 9, 2.2, z1 - 16, x + 9, 2.6, z1, holz); haus(see, x, z1 - 8, 11, 8, 3.6, '#f4f4f0', '#3f6b5a', false, 2.6);       // das Teehaus am Ende
    lampe(x, 6, z1 - 8, '#ffd9a0'); for (let z = z0 - 20; z > z1; z -= 40) lampe(x, 4.2, z, '#fff0c8'); }

  // ---- Campingplatz hinter dem Deich: weiße Wohnwagen und bunte Zelte
  for (let x = CAMPING[0] + 8; x < CAMPING[2] - 6; x += 13) for (let z = CAMPING[1] + 8; z < CAMPING[3] - 4; z += 17) {
    if (w() < 0.25) continue;
    if (w() < 0.6) { land.kiste(x - 3, 0.5, z - 1.1, x + 3, 2.7, z + 1.1, farbe('#f4f4f0')); land.kiste(x - 3.02, 1.5, z - 1.12, x + 1, 2.1, z + 1.12, farbe(aus(['#2f5d9a', '#c8372d', '#3d6b4f', '#70777e']))); }
    else { const f = farbe(aus(['#e86a2a', '#2f9a8f', '#d8c020', '#c8372d'])); land.quad([x - 2, 0, z - 1.6], [x + 2, 0, z - 1.6], [x + 2, 1.9, z], [x - 2, 1.9, z], f); land.quad([x + 2, 0, z + 1.6], [x - 2, 0, z + 1.6], [x - 2, 1.9, z], [x + 2, 1.9, z], f); }
  }
  felder.boden(CAMPING, 0, farbe('#a7c97c'), 14);
  haus(land, CAMPING[0] + 14, CAMPING[3] + 10, 16, 8, 3.4, '#f4ead6', '#a8452f', false); lampe(CAMPING[0] + 14, 4, CAMPING[3] + 4, '#ffd9a0');

  // ---- Kleingärten am Stadtrand: kleine Lauben mit bunten Dächern, Hecken und Obstbäume
  for (const r of GAERTEN) {
    felder.boden(r, 0, farbe('#8fbd66'), 10);
    for (let x = r[0] + 2; x + 13 < r[2]; x += 14) for (let z = r[1] + 2, reihe = 0; z + 17 < r[3]; z += 19, reihe++) {
      land.kiste(x, 0, z + 17, x + 13, 1.3, z + 17.8, farbe('#3f6f3a'));
      if (reihe % 2 === 0) land.kiste(x + 13, 0, z, x + 13.7, 1.3, z + 17.8, farbe('#44763a'));
      haus(land, x + zw(3.5, 9), z + zw(3.5, 7), 4.4, 3.4, 2.2, aus(['#f4ead6', '#b8644e', '#8fb0c8', '#e9d9a0', '#7a9a6a', '#fff3d6']), aus(['#a8452f', '#4c5258', '#3f6b5a', '#7c3a2e']), w() < 0.5);
      const br = zw(1.8, 2.8); klumpen(land, x + zw(3, 10), 0.4, z + zw(10, 14), br, br * 1.7, br, farbe(aus(WALD)), w() * 6);
      if (w() < 0.4) land.kiste(x + 1.5, 0, z + 9, x + 4.5, 0.3, z + 15, farbe(aus(['#e9d23c', '#d8574a', '#c98ad0', '#7a5a3a'])));        // ein Blumen- oder Gemüsebeet
    }
  }

  // ---- Die alte Windmühle auf ihrem Hügel: Die Flügel drehen sich langsam.
  const [mhx, mhz] = MUEHLE;
  rolle(land, mhx, mhz, 0, 3.2, 22, 13, farbe('#7fae58'), 14); rolle(land, mhx, mhz, 3.2, 5.4, 6.4, 6, farbe('#8d8a84'), 8);
  rolle(land, mhx, mhz, 5.4, 17, 5.2, 3.3, farbe('#f1ebdc'), 8); rolle(land, mhx, mhz, 17, 20.5, 3.6, 0.6, farbe('#4a3a2c'), 8);
  rolle(land, mhx, mhz, 5.4, 5.8, 8, 8, farbe('#6b5a48'), 8);                                           // der Umgang (Galerie)
  const muehlRad = new THREE.Group(); muehlRad.position.set(mhx, 18.3, mhz - 4.2);
  { const e = new Eimer(), holz = farbe('#4a3a2c'), tuch = farbe('#efe6d0');
    for (let k = 0; k < 4; k++) { const c = Math.cos(k * 1.5708), s = Math.sin(k * 1.5708), q = (x, y, z = 0) => [x * c - y * s, x * s + y * c, z];
      e.quad(q(-0.2, 0), q(0.2, 0), q(0.2, 13), q(-0.2, 13), holz); e.quad(q(0.2, 2.5, -0.1), q(2.6, 2.5, -0.1), q(2.6, 12.6, -0.1), q(0.2, 12.6, -0.1), tuch); }
    muehlRad.add(new THREE.Mesh(e.form(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }))); }
  gruppe.add(muehlRad);
  haus(land, mhx + 22, mhz + 14, 12, 8, 3.6, '#f4ead6', '#a8452f', false); lampe(mhx + 22, 3, mhz + 9.6, '#ffd9a0');

  // ---- Wasserturm, Funkturm auf dem Hügel und die Hochspannungsleitung quer übers Land
  { const [x, z] = [DOERFER[0][0] + 150, DOERFER[0][1] + 90]; rolle(land, x, z, 0, 26, 3.4, 2.8, farbe('#c9705a'), 10); rolle(land, x, z, 26, 30, 2.8, 6.5, farbe('#c9705a'), 10, false); rolle(land, x, z, 30, 38, 6.5, 6.5, farbe('#e9e2d0'), 10); rolle(land, x, z, 38, 42, 6.8, 0.4, farbe('#3f6b5a'), 10); }
  { const [x, y, z] = huegelOrt(Math.PI / 2 + 0.16, 0.42); rolle(land, x, z, y - 4, y + 118, 6, 3, farbe('#d9d9d6'), 10); rolle(land, x, z, y + 118, y + 124, 3, 11, farbe('#c9ced3'), 12, false); rolle(land, x, z, y + 124, y + 132, 11, 9, farbe('#aeb4ba'), 12);
    rolle(land, x, z, y + 132, y + 172, 2, 1.2, farbe('#d9d9d6'), 6); for (let k = 0; k < 5; k++) rolle(land, x, z, y + 172 + k * 9, y + 181 + k * 9, 0.9, 0.9, farbe(k % 2 ? '#f4f4f0' : '#c8372d'), 5);
    blink.push(x, y + 218, z, x, y + 134, z + 10, x, y + 134, z - 10); }
  const masten = [], drahtP = [];
  { const a = [HAFEN_OST[2] - 120, UFER + 110], b = [1500, 1300], c = [-700, 2380], n1 = 7, n2 = 11;
    for (let i = 0; i <= n1; i++) masten.push([a[0] + (b[0] - a[0]) * i / n1, a[1] + (b[1] - a[1]) * i / n1, Math.atan2(b[0] - a[0], b[1] - a[1])]);
    for (let i = 1; i <= n2; i++) masten.push([b[0] + (c[0] - b[0]) * i / n2, b[1] + (c[1] - b[1]) * i / n2, Math.atan2(c[0] - b[0], c[1] - b[1])]);
    const grau = farbe('#8e979f'), arme = [[30, 9], [37, 12], [44, 7]];
    masten.forEach(([x, z, h], nr) => {
      const c = Math.cos(h), s = Math.sin(h);       // der Mast: vier schräge Beine, drei Querarme
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) land.quad([x + sx * 4.2 - 0.3, 0, z + sz * 4.2], [x + sx * 4.2 + 0.3, 0, z + sz * 4.2], [x + sx * 0.5 + 0.25, 47, z + sz * 0.5], [x + sx * 0.5 - 0.25, 47, z + sz * 0.5], grau);
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) land.quad([x + sx * 4.2, 0, z + sz * 4.2 - 0.3], [x + sx * 4.2, 0, z + sz * 4.2 + 0.3], [x + sx * 0.5, 47, z + sz * 0.5 + 0.25], [x + sx * 0.5, 47, z + sz * 0.5 - 0.25], grau);
      for (let y = 8; y < 44; y += 9) { const r = 4.2 - y / 47 * 3.7; land.kiste(x - r, y - 0.12, z - r, x + r, y + 0.12, z + r, grau); }
      for (const [y, l] of arme) land.quad([x - c * l, y, z + s * l], [x + c * l, y, z - s * l], [x + c * l, y + 0.5, z - s * l], [x - c * l, y + 0.5, z + s * l], grau);
      if (nr > 0) { const [px, pz, ph] = masten[nr - 1], pc = Math.cos(ph), ps = Math.sin(ph);          // die Drähte hängen ein wenig durch
        for (const [y, l] of arme) for (const seite of [-1, 1]) for (let k = 0; k < 6; k++) { const t0 = k / 6, t1 = (k + 1) / 6, durch = t => y - 7 * 4 * t * (1 - t);
          const ax = px - pc * l * seite, az = pz + ps * l * seite, bx = x - c * l * seite, bz = z + s * l * seite;
          drahtP.push(ax + (bx - ax) * t0, durch(t0), az + (bz - az) * t0, ax + (bx - ax) * t1, durch(t1), az + (bz - az) * t1); } }
    }); }

  // ---- Windräder an Land und der Windpark draußen im Meer: Türme fest, alle Flügel zusammen als Instanzen
  const windOrte = WINDRAEDER.map(([x, z]) => ({ x, z, hoch: 95, dreh: 2.2 + w() * 0.3 }));
  for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) windOrte.push({ x: -2500 + i * 300 + r * 90 + zw(-20, 20), z: -2550 - r * 250, hoch: 105, dreh: 2.2 + w() * 0.2, meer: true });
  for (const o of windOrte) {
    const e = o.meer ? see : land, c = Math.cos(o.dreh), s = Math.sin(o.dreh);
    if (o.meer) rolle(e, o.x, o.z, -2, 9, 4.2, 3.4, farbe('#e3b21c'), 8);            // gelber Sockel im Wasser
    rolle(e, o.x, o.z, o.meer ? 9 : 0, o.hoch, 2.6, 1.4, farbe('#f1f3f4'), 8);
    e.quad([o.x - c * 2 - s * 6, o.hoch - 2, o.z + s * 2 - c * 6], [o.x + c * 2 - s * 6, o.hoch - 2, o.z - s * 2 - c * 6], [o.x + c * 2 + s * 5, o.hoch - 2, o.z - s * 2 + c * 5], [o.x - c * 2 + s * 5, o.hoch - 2, o.z + s * 2 + c * 5], farbe('#e4e7ea'));
    e.quad([o.x - c * 2 - s * 6, o.hoch + 2, o.z + s * 2 - c * 6], [o.x + c * 2 - s * 6, o.hoch + 2, o.z - s * 2 - c * 6], [o.x + c * 2 + s * 5, o.hoch + 2, o.z - s * 2 + c * 5], [o.x - c * 2 + s * 5, o.hoch + 2, o.z + s * 2 + c * 5], farbe('#f1f3f4'));
    for (const q of [-1, 1]) e.quad([o.x + q * c * 2 - s * 6, o.hoch - 2, o.z - q * s * 2 - c * 6], [o.x + q * c * 2 + s * 5, o.hoch - 2, o.z - q * s * 2 + c * 5], [o.x + q * c * 2 + s * 5, o.hoch + 2, o.z - q * s * 2 + c * 5], [o.x + q * c * 2 - s * 6, o.hoch + 2, o.z - q * s * 2 - c * 6], farbe('#eceff1'));
    blink.push(o.x, o.hoch + 3.5, o.z);
  }
  const fluegelGeo = new THREE.BufferGeometry();
  { const p = []; for (let k = 0; k < 3; k++) { const a = k * 2.0944, c = Math.cos(a), s = Math.sin(a), q = (x, y) => [x * c - y * s, x * s + y * c, 0];
      p.push(...q(-1.6, 2), ...q(1.9, 2), ...q(0.4, 44), ...q(-1.6, 2), ...q(0.4, 44), ...q(-0.5, 44)); }
    fluegelGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); fluegelGeo.computeVertexNormals(); }
  const rotoren = new THREE.InstancedMesh(fluegelGeo, new THREE.MeshLambertMaterial({ color: '#f1f3f4', side: THREE.DoubleSide }), windOrte.length);
  rotoren.frustumCulled = false; gruppe.add(rotoren);
  const rotorStand = windOrte.map(o => ({ m: new THREE.Matrix4().makeRotationY(o.dreh).setPosition(o.x + Math.sin(o.dreh) * 6.4, o.hoch, o.z + Math.cos(o.dreh) * 6.4), winkel: w() * 6, tempo: 0.9 + w() * 0.5, gross: o.meer ? 1.15 : 1 }));

  // ---- Die Hügel am Horizont (der Geestrücken): sanft, mit Flecken aus Wald, Wiese und Feld, oben stehen Bäume
  { const p = [], c = [], idx = [], RINGE = 11, TEILE = 150, F = ['#7fae58', '#4a7c42', '#a3c66a', '#3f6f3a', '#d8c477', '#557f46'].map(farbe), fern = farbe('#6f93a0');
    for (let k = 0; k < RINGE; k++) for (let i = 0; i <= TEILE; i++) {
      const a = -0.5 + (Math.PI + 1) * i / TEILE, t = k / (RINGE - 1), [x, y, z] = huegelOrt(a, t);
      p.push(x, Math.max(-0.3, huegelHoehe(a, t)) - 0.1, z);
      const fl = F[Math.floor(rauschen(x / 260, z / 260) * 5.99)], m = Math.min(0.55, y / 220 + t * 0.25);        // weiter hinten und oben wird es blauer (Dunst)
      c.push(fl.r + (fern.r - fl.r) * m, fl.g + (fern.g - fl.g) * m, fl.b + (fern.b - fl.b) * m);
    }
    for (let k = 0; k + 1 < RINGE; k++) for (let i = 0; i < TEILE; i++) { const a = k * (TEILE + 1) + i, b = a + TEILE + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setIndex(idx); g.computeVertexNormals();
    gruppe.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
    // Wald auf den Hügeln: große Klumpen, dort wo das Rauschen „Wald“ sagt
    for (let i = 0; i < 2600; i++) { const a = -0.45 + (Math.PI + 0.9) * w(), t = 0.04 + w() * 0.55, [x, y, z] = huegelOrt(a, t);
      if (y < 3 || rauschen(x / 260, z / 260) * 5.99 % 2 < 1) continue;
      const r = zw(16, 30); klumpen(land, x, y - 3, z, r, r * 1.05, r, farbe(aus(w() < 0.3 ? NADEL : WALD)), w() * 6); }
  }

  // ---- Lichter in den Dörfern (nur nachts zu sehen)
  for (const [dx, dz] of DOERFER) { for (let i = 0; i < 22; i++) { const a = w() * 6.2832, d = 30 + Math.sqrt(w()) * 190; lampe(dx + Math.cos(a) * d, zw(2.5, 5), dz + Math.sin(a) * d * 0.8, w() < 0.8 ? '#ffd9a0' : '#fff4d8'); } lampe(dx - 14, 22, dz, '#ffe9b0'); }
  for (const pts of AUTOBAHN_FERN) for (let i = 1; i + 1 < pts.length; i++) lampe(pts[i][0], 9, pts[i][1], '#ffc070');
  for (let i = 0; i < 90; i++) { const x = zw(-3000, 3000), z = zw(UFER + 120, 2600); if (!inStadt(x, z, 60)) lampe(x, 4, z, '#ffd9a0'); }       // einzelne Höfe

  // ================================================================== IM MEER
  // ---- Halligen: flache Inseln mit einer Warft (kleiner Hügel), auf der die Häuser stehen
  const WAND = ['#f4ead6', '#c9705a', '#b8644e', '#fff3d6'], DACH = ['#a8452f', '#8f3f2e', '#6d7a4a', '#4c5258'];
  [[-950, -1260, 200, 95, 3], [330, -1620, 260, 120, 5], [1720, -1230, 170, 85, 2]].forEach(([x, z, rx, rz, n], nr) => {
    scholle(flach, x, z, rx * 1.5, rz * 1.7, -0.62, -0.62, 0, farbe('#5fa9b4'), nr + 11, 20);                 // helles, flaches Wasser ringsum
    scholle(see, x, z, rx, rz, -1.6, 0.35, 22, farbe('#d9cba0'), nr + 3); scholle(see, x, z, rx * 0.86, rz * 0.82, 0.3, 0.8, 6, farbe('#86b86a'), nr + 5);
    for (let k = 0; k < n; k++) { const wx = x + (k - (n - 1) / 2) * rx * 0.42 + zw(-12, 12), wz = z + zw(-0.25, 0.25) * rz;
      rolle(see, wx, wz, 0.7, 4.6, 30, 19, farbe('#7fae58'), 12);
      for (let h = 0, m = 2 + Math.floor(w() * 2); h < m; h++) { const hx = wx + (h - (m - 1) / 2) * 13, hz = wz + zw(-5, 5); haus(see, hx, hz, 11, 7.5, 3.3, aus(WAND), aus(DACH), w() < 0.3, 4.6); lampe(hx, 6.6, hz + 4, '#ffd9a0'); }
      klumpen(see, wx + zw(-14, 14), 4.4, wz - 9, 4, 5.5, 4, farbe(aus(WALD)), k); }
    if (nr === 1) { haus(see, x + rx * 0.5, z + 12, 14, 7, 5, '#f4f4f0', '#4c5258', false, 0.8); see.kiste(x + rx * 0.5 - 10.5, 0.8, z + 10, x + rx * 0.5 - 7, 13, z + 14, farbe('#f4f4f0')); rolle(see, x + rx * 0.5 - 8.75, z + 12, 13, 19, 2.6, 0, farbe('#3f6b5a'), 4); }       // die kleine Halligkirche
  });
  // ---- Sandbänke: Bei Ebbe schauen sie aus dem Wasser. Auf einer liegen Seehunde.
  [[-330, -1110, 190, 46], [960, -1420, 150, 40], [-1560, -1560, 230, 60], [1330, -1960, 210, 52], [-640, -1880, 170, 44], [2380, -690, 180, 48], [-1820, -1020, 140, 36]].forEach(([x, z, rx, rz], nr) => {
    scholle(flach, x, z, rx * 1.9, rz * 2.6, -0.62, -0.62, 0, farbe('#63adb6'), nr + 31, 18);
    scholle(see, x, z, rx, rz, -1.3, -0.35, 26, farbe('#e3d4a4'), nr + 21, 18);
    if (nr < 2) for (let i = 0; i < 9; i++) { const sx = x + zw(-0.5, 0.5) * rx, sz = z + zw(-0.4, 0.4) * rz; klumpen(see, sx, -0.35, sz, 1.1, 0.55, 0.42, farbe(aus(['#5a5650', '#74706a', '#8a8378'])), w() * 3); }
  });
  // Helles Wasser vor den Stränden (dort ist es flach)
  for (const [a, b] of [[-3600, X0 - 4], [X1 + 4, HAFEN_OST[0]], [HAFEN_OST[2], 3600]]) for (let x = a; x < b; x += 300) scholle(flach, x + 150, UFER - 95, 215, 46, -0.62, -0.62, 0, farbe('#63adb6'), x * 0.01 + 50, 12);

  // ---- Die Landzunge im Westen: Dünen, Strandhafer und ein grün-weißes Leuchtfeuer an der Spitze
  [[-2460, -150, 230], [-2380, -330, 170], [-2260, -480, 130], [-2110, -590, 95], [-1960, -650, 62]].forEach(([x, z, r], nr) => {
    scholle(flach, x, z, r * 1.5, r * 1.5, -0.62, -0.62, 0, farbe('#63adb6'), nr + 61, 14);
    scholle(see, x, z, r, r * 0.9, -1.5, 0.5, 20, farbe('#e6d7a8'), nr + 41, 16);
    for (let i = 0, n = Math.round(r / 9); i < n; i++) { const a = w() * 6.2832, d = Math.sqrt(w()) * r * 0.62, rr = zw(9, 20); klumpen(see, x + Math.cos(a) * d, 0.3, z + Math.sin(a) * d * 0.9, rr, rr * zw(0.25, 0.45), rr * 0.8, farbe(aus(['#e9dcb0', '#dccf9e', '#a9b87a', '#93ab6c'])), w() * 6); }
  });
  { const [x, z] = [-1960, -650]; for (let k = 0; k < 5; k++) rolle(see, x, z, 0.5 + k * 4.4, 4.9 + k * 4.4, 2.5 - k * 0.2, 2.3 - k * 0.2, farbe(k % 2 ? '#f4f4f0' : '#2e8a4f'), 10);
    rolle(see, x, z, 22.5, 24.6, 1.3, 1.3, farbe('#fff3c0'), 8); rolle(see, x, z, 24.6, 26.4, 1.9, 0, farbe('#2e8a4f'), 8); lampe(x, 23.6, z, '#eaffd0'); }

  // ---- Der Überseehafen im Osten: Containerbrücken, bunte Containerstapel, Tanks, Silos und das Kraftwerk mit dem hohen Schornstein
  { const [x0, z0, x1, z1] = HAFEN_OST, BOX = ['#b3372e', '#2f5d9a', '#3d6b4f', '#d8a020', '#e9edf0', '#70777e', '#c8612a'];
    see.kiste(x0, -2.6, z0, x1, 1.0, z1, farbe('#9a9892')); see.boden([x0 + 2, z0 + 2, x1 - 2, z1 - 2], 1.04, farbe('#85888c'), 8);
    for (let i = 0; i < 4; i++) {                   // Containerbrücken: zwei Portale, oben ein langer Ausleger übers Wasser
      const x = x0 + 130 + i * 110, f = farbe(i % 2 ? '#2f5d9a' : '#c8612a'), z = z0 + 24;
      for (const sx of [-13, 13]) for (const sz of [-12, 12]) see.kiste(x + sx - 1.1, 1, z + sz - 1.1, x + sx + 1.1, 46, z + sz + 1.1, f);
      see.kiste(x - 14, 44, z - 13, x + 14, 47, z + 13, f); see.kiste(x - 2.2, 47, z - 62, x + 2.2, 50, z + 30, f); see.kiste(x - 4, 50, z + 2, x + 4, 56, z + 12, farbe('#e9edf0'));
      see.kiste(x - 0.9, 50, z - 4, x + 0.9, 68, z - 1, f); see.quad([x - 0.5, 68, z - 2.5], [x + 0.5, 68, z - 2.5], [x + 0.5, 50, z - 58], [x - 0.5, 50, z - 58], f); see.quad([x - 0.5, 68, z - 2.5], [x + 0.5, 68, z - 2.5], [x + 0.5, 50, z + 28], [x - 0.5, 50, z + 28], f);
      blink.push(x, 69, z - 2.5); lampe(x, 47, z - 30, '#fff4d8'); lampe(x, 47, z, '#fff4d8');
    }
    for (let x = x0 + 70; x < x0 + 520; x += 15) for (let z = z0 + 66; z < z1 - 60; z += 8) { if (w() < 0.18) continue; const h = 1 + Math.floor(w() * 4);
      for (let k = 0; k < h; k++) see.kiste(x, 1.04 + k * 2.6, z, x + 12.2, 3.6 + k * 2.6, z + 2.5 * 2.4, farbe(aus(BOX))); }
    for (let i = 0; i < 3; i++) haus(see, x0 + 600 + i * 78, z0 + 150, 60, 34, 11, '#d5d9dc', '#8a9299', true, 1);                    // Lagerhallen
    for (let i = 0; i < 4; i++) rolle(see, x0 + 575 + i * 15, z0 + 62, 1, 34, 6.5, 6.5, farbe('#c9ced3'), 10);                          // Silos
    for (let i = 0; i < 6; i++) rolle(see, x1 - 70 - (i % 3) * 44, z0 + 60 + Math.floor(i / 3) * 46, 1, 15, 18, 18, farbe(i % 2 ? '#f1f3f4' : '#e3e6e8'), 14);   // Tanks
    const kx = x1 - 250, kz = z1 - 70;                                                                                                   // das Kraftwerk
    see.kiste(kx - 34, 1, kz - 20, kx + 34, 38, kz + 20, farbe('#9aa3ab')); see.kiste(kx - 34, 38, kz - 12, kx + 10, 50, kz + 12, farbe('#858e96')); see.kiste(kx + 36, 1, kz - 16, kx + 70, 16, kz + 16, farbe('#b7bec4'));
    for (let k = 0; k < 9; k++) rolle(see, kx - 52, kz, 1 + k * 14, 15 + k * 14, 5 - k * 0.22, 4.78 - k * 0.22, farbe(k >= 6 && k % 2 === 0 ? '#c8372d' : '#f1f3f4'), 10, k === 8);
    blink.push(kx - 52, 128, kz, kx - 52, 86, kz + 4.5);
    for (let x = x0 + 40; x < x1; x += 90) { lampe(x, 14, z0 + 60, '#ffb860'); lampe(x + 45, 14, z1 - 40, '#ffb860'); }
    for (let i = 0; i < 14; i++) lampe(kx + zw(-30, 60), zw(6, 34), kz + 20.5, '#fff0c0');
  }

  // ---- Tonnen am Fahrwasser: rote links, grüne rechts, vom Hafen hinaus aufs Meer
  const tonnen = [];
  for (let i = 0; i < 9; i++) for (const s of [-1, 1]) { const x = 80 + s * 46 + i * 14, z = -520 - i * 170, f = s < 0 ? '#c8372d' : '#2e9a4f';
    rolle(see, x, z, -1.4, 0.9, 1.5, 1.2, farbe(f), 8); if (s < 0) rolle(see, x, z, 0.9, 3.4, 0.9, 0.9, farbe(f), 6); else rolle(see, x, z, 0.9, 3.6, 1.1, 0, farbe(f), 6);
    const c = farbe(s < 0 ? '#ff4838' : '#48ff70'); tonnen.push(x, 4, z, c.r, c.g, c.b); }

  // ---- Schiffe: Kutter, Tanker, Segelboote einer Regatta und ein Frachter am Kai des Überseehafens
  const schiffe = [], schiffMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const schiffLicht = new THREE.PointsMaterial({ fog: false, size: 4, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false });
  const nachtDinge = [];
  const schiff = (bauen, x, z, tempo, von, bis, lichter = []) => {
    const g = new THREE.Group(), e = new Eimer(); bauen(e); g.add(new THREE.Mesh(e.form(), schiffMat)); g.position.set(x, -0.9, z); if (tempo < 0) g.rotation.y = Math.PI;
    if (lichter.length) { const lg = new THREE.BufferGeometry(), p = [], c = []; for (const [lx, ly, lz, hex] of lichter) { const f = farbe(hex); p.push(lx, ly, lz); c.push(f.r, f.g, f.b); }
      lg.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); lg.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); const pt = new THREE.Points(lg, schiffLicht); pt.visible = false; g.add(pt); nachtDinge.push(pt); }
    gruppe.add(g); if (tempo) schiffe.push({ g, tempo, von, bis }); return g;
  };
  const kutter = hex => e => {          // Krabbenkutter: kleiner Rumpf, Steuerhaus, Mast und zwei Ausleger mit Netzen
    e.kiste(-8, 0, -2.6, 8, 2.6, 2.6, farbe(hex)); e.kiste(-8, 2.3, -2.7, 8, 2.7, 2.7, farbe('#f4f4f0')); e.drei([8, 0, -2.6], [8, 0, 2.6], [11.5, 2.7, 0], farbe(hex)); e.drei([8, 2.7, -2.6], [8, 2.7, 2.6], [11.5, 2.7, 0], farbe('#f4f4f0'));
    e.kiste(-6, 2.7, -1.8, -1.5, 5.6, 1.8, farbe('#f4f4f0')); e.kiste(-5.7, 4.2, -1.85, -1.8, 5.1, 1.85, farbe('#26323a')); e.kiste(0.6, 2.7, -0.12, 0.84, 11, 0.12, farbe('#5a4a3a'));
    for (const s of [-1, 1]) { e.quad([0.6, 9.5, 0], [0.84, 9.5, 0], [0.84, 4.5, s * 9], [0.6, 4.5, s * 9], farbe('#5a4a3a')); e.drei([0.7, 4.5, s * 9], [-2.2, 1.2, s * 8], [3.2, 1.2, s * 8], farbe('#3d6b4f')); }
  };
  const segler = hex => (e, x = 0, z = 0) => { e.kiste(x - 4.5, 0, z - 1.4, x + 4.5, 1.5, z + 1.4, farbe('#f4f4f0')); e.kiste(x - 0.08, 1.5, z - 0.08, x + 0.08, 13, z + 0.08, farbe('#444444'));
    e.drei([x + 0.2, 2.2, z], [x + 0.2, 12.6, z], [x - 4.4, 2.2, z], farbe(hex)); e.drei([x + 0.5, 2, z], [x + 4.3, 2, z], [x + 0.5, 10.5, z], farbe('#f4f4f0')); };
  const frachter = (rumpf, lang) => e => { const BOX = ['#b3372e', '#2f5d9a', '#3d6b4f', '#d8a020', '#e9edf0', '#c8612a'];
    e.kiste(-lang, 0, -15, lang, 10, 15, farbe(rumpf)); e.kiste(-lang, 0, -15.1, lang, 2.6, 15.1, farbe('#8f3f2e'));
    for (let x = -lang + 14; x < lang - 44; x += 13) for (let z = -12; z < 11; z += 7.6) e.kiste(x, 10, z, x + 12, 13 + Math.floor(w() * 5) * 3, z + 6.8, farbe(aus(BOX)));
    e.kiste(lang - 36, 10, -13, lang - 18, 32, 13, farbe('#f1f3f4')); e.kiste(lang - 30, 32, -3, lang - 24, 39, 3, farbe('#2f5d9a')); };
  schiff(kutter('#2f5d9a'), -420, -1010, 0, 0, 0, [[0.7, 11.2, 0, '#ffffff'], [-3, 6, 0, '#ffd9a0']]);                                    // liegt vor der Sandbank und fischt
  const kutter2 = schiff(kutter('#3d6b4f'), 500, -770, 1.6, -1900, 2000, [[0.7, 11.2, 0, '#ffffff'], [-3, 6, 0, '#ffd9a0'], [6, 3, 2.6, '#48ff70'], [6, 3, -2.6, '#ff4838']]);
  schiff(e => { e.kiste(-120, 0, -19, 120, 8, 19, farbe('#7a2f2a')); e.kiste(-120, 6, -19.1, 120, 8.2, 19.1, farbe('#2a2d31')); for (let x = -100; x < 70; x += 34) e.kiste(x, 8, -1.2, x + 26, 11, 1.2, farbe('#c9ced3'));
    e.kiste(-112, 8, -15, -86, 30, 15, farbe('#f1f3f4')); e.kiste(-104, 30, -4, -96, 40, 4, farbe('#c8372d')); }, 2600, -2080, -4.2, -4300, 4300, [[-99, 41, 0, '#ffffff'], [100, 14, 0, '#ffffff'], [-99, 24, 15, '#ffd9a0'], [-99, 24, -15, '#ffd9a0']]);
  schiff(e => { const F = ['#f4f4f0', '#f0c040', '#e86a5a', '#5aa0e8', '#f4f4f0', '#7ad08a', '#f4f4f0']; F.forEach((f, i) => segler(f)(e, (i % 4) * 34 - i * 7, Math.floor(i / 4) * 46 + (i % 3) * 13)); }, 150, -640, 1.9, -900, 1300);   // die Regatta
  schiff(frachter('#22384f', 98), HAFEN_OST[0] + 300, HAFEN_OST[1] - 19, 0, 0, 0, [[70, 40, 0, '#ffffff'], [-80, 14, 0, '#ffffff'], [70, 26, 13.2, '#ffd9a0'], [70, 20, 13.2, '#ffd9a0'], [64, 26, 13.2, '#ffd9a0']]);

  // ================================================================== IN DER LUFT
  // ---- Möwen: zwei Flügel als Dreiecke. Jede kreist um ihre Stelle, die Flügel schlagen auf und ab.
  const moeweGeo = new THREE.BufferGeometry();
  moeweGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.16, 0, 0, -0.22, -0.62, 0.26, 0.02, 0, 0, 0.16, 0.62, 0.26, 0.02, 0, 0, -0.22,
    -0.62, 0.26, 0.02, -0.55, 0.24, -0.12, -1.25, 0.1, -0.08, 0.62, 0.26, 0.02, 1.25, 0.1, -0.08, 0.55, 0.24, -0.12], 3));
  moeweGeo.computeVertexNormals();
  const moewen = new THREE.InstancedMesh(moeweGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide }), MOEWEN + 17);
  moewen.frustumCulled = false; gruppe.add(moewen);
  const SCHWARM = [[80, -150, 150, 34], [720, -330, 90, 44], [-420, -1010, 46, 16], [-1160, UFER - 190, 60, 20], [HAFEN_OST[0] + 300, HAFEN_OST[1] + 60, 110, 40]];
  const voegel = [];
  for (let i = 0; i < MOEWEN; i++) { const s = SCHWARM[i % 5 === 4 ? 4 : i % 4]; voegel.push({ s, r: s[2] * zw(0.25, 1), h: s[3] * zw(0.55, 1.5), a: w() * 6.2832, tempo: zw(7, 11) * (w() < 0.5 ? 1 : -1), schlag: zw(5, 8), ph: w() * 6, gross: zw(0.9, 1.3) }); }
  // Zugvögel: ein Keil aus 17 Gänsen, der langsam hoch über das Land zieht
  const zug = { x: -2600, z: 1500 };
  for (let i = 0; i < 17; i++) voegel.push({ keil: true, dx: -Math.ceil(i / 2) * 5.5, dz: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 4.2, schlag: zw(3.2, 3.8), ph: i * 0.7, gross: 1.5 });
  const o3 = new THREE.Object3D(), dunkel = new THREE.Color('#3a3f46'), weissF = new THREE.Color('#ffffff');
  voegel.forEach((v, i) => moewen.setColorAt(i, v.keil ? dunkel : weissF));

  // ---- Zwei Heißluftballons treiben mit dem Wind über das Land
  const ballons = [];
  for (const [x, z, h, f1, f2] of [[-1500, 1250, 230, '#e8452f', '#f6d23a'], [1300, 1650, 310, '#2f6fc8', '#f4f4f0']]) {
    const e = new Eimer(), R = 11, N = 12;
    for (let k = 0; k < 6; k++) for (let i = 0; i < N; i++) { const y0 = -R + k * R / 3, y1 = y0 + R / 3, r = y => Math.sqrt(Math.max(0, R * R - y * y)) * (y < 0 ? 1 + y / R * 0.42 : 1), a = i / N * 6.2832, b = (i + 1) / N * 6.2832;
      e.quad([Math.cos(a) * r(y0), y0, Math.sin(a) * r(y0)], [Math.cos(b) * r(y0), y0, Math.sin(b) * r(y0)], [Math.cos(b) * r(y1), y1, Math.sin(b) * r(y1)], [Math.cos(a) * r(y1), y1, Math.sin(a) * r(y1)], farbe((i + k) % 2 ? f1 : f2)); }
    e.kiste(-1.1, -R - 6.2, -1.1, 1.1, -R - 4.4, 1.1, farbe('#8a6a44')); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) e.kiste(sx - 0.05, -R - 4.4, sz - 0.05, sx + 0.05, -R + 0.5, sz + 0.05, farbe('#4a3a2c'));
    const m = new THREE.Mesh(e.form(), schiffMat); m.position.set(x, h, z); gruppe.add(m); ballons.push({ m, h, ph: w() * 6 });
  }

  // ================================================================== ZUSAMMENSETZEN
  const fest = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const stuecke = [...land.formen(), ...see.formen()].map(g => new THREE.Mesh(g, fest));
  // Felder, Straßen und Gräben liegen flach auf der Wiese. Damit sie nicht flimmern, werden sie beim Zeichnen ein Stück „nach vorn“ gerückt.
  const flachMat = (extra) => new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -6, ...extra });
  const feldMat = flachMat({ map: BILD.boden('boden_gras') }), mFelder = felder.formen().map(g => { const m = new THREE.Mesh(g, feldMat); m.renderOrder = 1; return m; });
  const mStrasse = new THREE.Mesh(strasse.form(), flachMat({ map: BILD.boden('boden_asphalt'), polygonOffsetFactor: -2, polygonOffsetUnits: -12 }));
  const mGraben = new THREE.Mesh(graben.form(), flachMat({ polygonOffsetFactor: -2, polygonOffsetUnits: -12 }));
  const mFlach = new THREE.Mesh(flach.form(), flachMat({ transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
  mStrasse.renderOrder = 2; mGraben.renderOrder = 2; mFlach.renderOrder = 3;
  const draht = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(drahtP, 3)), new THREE.LineBasicMaterial({ color: '#59626b', transparent: true, opacity: 0.6 }));
  gruppe.add(...stuecke, ...mFelder, mStrasse, mGraben, mFlach, draht);
  // Lichter für die Nacht: Punkte, die immer gleich groß gemalt werden (so sieht man sie auch weit draußen)
  const punkte = (liste, mitFarbe, gross, hex) => { const g = new THREE.BufferGeometry(), p = [], c = [], n = mitFarbe ? 6 : 3;
    for (let i = 0; i < liste.length; i += n) { p.push(liste[i], liste[i + 1], liste[i + 2]); if (mitFarbe) c.push(liste[i + 3], liste[i + 4], liste[i + 5]); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); if (mitFarbe) g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    const pt = new THREE.Points(g, new THREE.PointsMaterial({ size: gross, sizeAttenuation: false, vertexColors: mitFarbe, color: hex || '#ffffff', transparent: true, depthWrite: false, toneMapped: false, fog: false }));
    pt.visible = false; pt.frustumCulled = false; gruppe.add(pt); return pt; };
  const pBlink = punkte(blink, false, 4.5, '#ff3a2a'), pWarm = punkte(warm, true, 3.6), pTonnen = punkte(tonnen, true, 4);

  let uhr = 0, nacht = false;
  const mRot = new THREE.Matrix4(), mAus = new THREE.Matrix4();
  return {
    gruppe,
    // Zum Testen: Zahlen über alles, was hier gebaut wurde
    zahlen: () => ({ dreieckeLand: land.dreiecke, dreieckeSee: see.dreiecke, felder: felder.dreiecke / 2, windraeder: windOrte.length, masten: masten.length, voegel: voegel.length }),
    schritt(dt) {
      uhr += dt;
      const wind = 0.35 + WIND.uWind.value * 1.3;                       // mehr Wind = Windräder und Mühle drehen schneller
      rotorStand.forEach((r, i) => { r.winkel += r.tempo * dt * wind; mAus.copy(r.m).multiply(mRot.makeRotationZ(r.winkel)); if (r.gross !== 1) mAus.scale(o3.scale.setScalar(r.gross)); rotoren.setMatrixAt(i, mAus); });
      rotoren.instanceMatrix.needsUpdate = true;
      muehlRad.rotation.z += dt * 0.45 * wind;
      for (const s of schiffe) { s.g.position.x += s.tempo * dt; if (s.g.position.x > s.bis) s.g.position.x = s.von; if (s.g.position.x < s.von) s.g.position.x = s.bis; s.g.position.y = -0.9 + Math.sin(uhr * 0.9 + s.von) * 0.18; s.g.rotation.x = Math.sin(uhr * 0.7 + s.von) * 0.02; }
      SCHWARM[2][0] = -420; SCHWARM[4][0] = HAFEN_OST[0] + 300;
      zug.x += 9 * dt; if (zug.x > 3200) zug.x = -3200;
      voegel.forEach((v, i) => {
        if (v.keil) { o3.position.set(zug.x + v.dx, 150 + Math.sin(uhr * 0.4 + v.ph) * 1.5, zug.z + v.dz - zug.x * 0.12); o3.rotation.set(0, -Math.PI / 2 + 0.12, 0); o3.scale.set(v.gross, v.gross * Math.sin(uhr * v.schlag + v.ph) * 1.2, v.gross); }
        else { v.a += v.tempo / v.r * dt; const gleiten = Math.sin(uhr * 0.5 + v.ph) > 0.2;
          o3.position.set(v.s[0] + Math.cos(v.a) * v.r, v.h + Math.sin(uhr * 0.6 + v.ph) * 3, v.s[1] + Math.sin(v.a) * v.r * 0.8);
          o3.rotation.set(0, -v.a + (v.tempo > 0 ? Math.PI : 0), (v.tempo > 0 ? -0.35 : 0.35), 'YXZ');
          o3.scale.set(v.gross, v.gross * (gleiten ? 0.5 : Math.sin(uhr * v.schlag + v.ph) * 1.3), v.gross); }
        o3.updateMatrix(); moewen.setMatrixAt(i, o3.matrix);
      });
      moewen.instanceMatrix.needsUpdate = true;
      for (const b of ballons) { b.m.position.x += (1.5 + WIND.uWind.value * 5) * dt; if (b.m.position.x > 3000) b.m.position.x = -3000; b.m.position.y = b.h + Math.sin(uhr * 0.15 + b.ph) * 14; b.m.rotation.y = uhr * 0.05 + b.ph; }
      if (nacht) { const an = Math.floor(uhr * 0.8) % 2 === 0; pBlink.visible = an; pTonnen.visible = Math.floor(uhr * 1.25) % 3 === 0;
        pBlink.material.opacity = pWarm.material.opacity = pTonnen.material.opacity = schiffLicht.opacity = Math.max(0.05, LUFT.sicht * LUFT.sicht); }       // bei Nebel und Regen sieht man die fernen Lichter kaum
    },
    licht(name) {
      nacht = name === 'abend' || name === 'nacht';
      pBlink.visible = pWarm.visible = pTonnen.visible = nacht; for (const p of nachtDinge) p.visible = nacht;
      moewen.visible = name !== 'nacht'; for (const b of ballons) b.m.visible = name === 'tag' || name === 'abend';
      draht.material.opacity = name === 'nacht' ? 0.25 : 0.6;
    },
  };
}
