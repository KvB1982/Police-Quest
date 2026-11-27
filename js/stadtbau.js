// Blaulicht über Möwenbrück – baut die große Stadt in 3D (aus dem Stadtplan in stadtplan.js).
//
// So wird es schnell: Alle Wände mit derselben Fassade landen in EINER großen Form ("Eimer"), alle Dächer in einer,
// alle Straßen in einer … Die Grafikkarte muss dann nur wenige Dinge zeichnen, obwohl es fast 2000 Häuser sind.
// Vorbild für die Straßenschluchten: js/stadtbau.js im Rennspiel. Bäume, Laternen und Autos sind "Instanzen":
// eine Form, viele Male hingestellt. Nur die nächsten bekommen das schöne geladene Modell (siehe NahTausch).

import * as THREE from 'three';
import { WIND } from './wetterplan.js';
import { imWind } from './wetter.js';
import * as BILD from './bilder.js';
import * as MOD from './modelle.js';
import { PLAN, UFER, FLEET, STADT_RAND, viertel, ortAuf, wuerfel } from './stadtplan.js';

const GEH = 3;
const FELD = 3, STOCK = 3.05, EG = 3.5;       // ein Fensterfeld ist 3 m breit, ein Stockwerk 3,05 m hoch, das Erdgeschoss 3,5 m
export const AUTO_FARBEN = ['#f2f2f2', '#c9ced3', '#2a2d31', '#2f5d9a', '#b3372e', '#3d6b4f', '#d9cfb8', '#70777e'];

// ---------------------------------------------------------------------------------------------
// Der Eimer: sammelt Dreiecke (Ort, Richtung, Bild-Stelle, Farbe) und macht am Ende eine einzige Form daraus.
// ---------------------------------------------------------------------------------------------
const tmpF = new THREE.Color();
export class Eimer {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; }
  ecke(a, nx, ny, nz, u, v, f) { this.p.push(a[0], a[1], a[2]); this.n.push(nx, ny, nz); this.u.push(u, v); this.c.push(f.r, f.g, f.b); }
  // Viereck a-b-c-d (gegen den Uhrzeigersinn, von außen gesehen); das Bild reicht von (u0, v0) bei a bis (u1, v1) bei c
  quad(a, b, c, d, f, u0 = 0, v0 = 0, u1 = 1, v1 = 1) {
    let nx = (b[1] - a[1]) * (d[2] - a[2]) - (b[2] - a[2]) * (d[1] - a[1]), ny = (b[2] - a[2]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[2] - a[2]), nz = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    this.ecke(a, nx, ny, nz, u0, v0, f); this.ecke(b, nx, ny, nz, u1, v0, f); this.ecke(c, nx, ny, nz, u1, v1, f);
    this.ecke(a, nx, ny, nz, u0, v0, f); this.ecke(c, nx, ny, nz, u1, v1, f); this.ecke(d, nx, ny, nz, u0, v1, f);
  }
  drei(a, b, c, f, u = 0.01, v = 0.02) {
    let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    this.ecke(a, nx, ny, nz, u, v, f); this.ecke(b, nx, ny, nz, u, v, f); this.ecke(c, nx, ny, nz, u, v, f);
  }
  // Fläche auf dem Boden (schaut nach oben); das Bild wiederholt sich alle "kachel" Meter
  boden(r, y, f, kachel = 4) {
    const [x1, z1, x2, z2] = r;
    this.quad([x1, y, z2], [x2, y, z2], [x2, y, z1], [x1, y, z1], f, x1 / kachel, -z2 / kachel, x2 / kachel, -z1 / kachel);
  }
  // Kiste mit einer einzigen Farbe (Bild-Stelle u, v)
  kiste(x1, y1, z1, x2, y2, z2, f, u = 0.01, v = 0.02) {
    const q = (a, b, c, d) => this.quad(a, b, c, d, f, u, v, u, v);
    q([x1, y1, z2], [x2, y1, z2], [x2, y2, z2], [x1, y2, z2]); q([x2, y1, z1], [x1, y1, z1], [x1, y2, z1], [x2, y2, z1]);
    q([x2, y1, z2], [x2, y1, z1], [x2, y2, z1], [x2, y2, z2]); q([x1, y1, z1], [x1, y1, z2], [x1, y2, z2], [x1, y2, z1]);
    q([x1, y2, z2], [x2, y2, z2], [x2, y2, z1], [x1, y2, z1]);
  }
  form() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    return g;
  }
}
export const farbe = hex => new THREE.Color(hex);

// Kleiner Helfer: viele Kopien einer Form (Instanzen)
export function instanzen(geo, mat, liste, setze, schatten = true) {
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, liste.length)), o = new THREE.Object3D();
  im.count = liste.length;
  liste.forEach((e, i) => { o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); const f = setze(o, e, i); o.updateMatrix(); im.setMatrixAt(i, o.matrix); if (f) im.setColorAt(i, tmpF.set(f)); });
  im.castShadow = schatten; im.receiveShadow = false; im.frustumCulled = false;
  return im;
}

// Dasselbe, aber in Stücke geteilt: Die Stadt wird in Kästchen von "zelle" Metern geteilt, jedes Kästchen bekommt seine eigene
// Instanzen-Form. Die Grafikkarte zeichnet dann nur die Kästchen, die gerade im Bild sind (und nur die nahen werfen Schatten).
// Zurück kommt { gruppe, ort }: ort[i] = [Form, Nummer] sagt, wo das i-te Ding der Liste steckt.
export function instanzenGeteilt(geo, mat, liste, setze, schatten = true, zelle = 200) {
  const gruppe = new THREE.Group(), kaesten = new Map(), ort = new Array(liste.length);
  liste.forEach((e, i) => { const k = Math.floor(e.x / zelle) * 1000 + Math.floor(e.z / zelle); if (!kaesten.has(k)) kaesten.set(k, []); kaesten.get(k).push(i); });
  for (const nummern of kaesten.values()) {
    const im = instanzen(geo, mat, nummern.map(i => liste[i]), (o, e, j) => setze(o, e, nummern[j]), schatten);
    im.computeBoundingSphere(); im.frustumCulled = true;
    nummern.forEach((i, j) => { ort[i] = [im, j]; });
    gruppe.add(im);
  }
  return { gruppe, ort };
}

// Einfache Formen für die Ferne: Baum, Tanne, Auto, Laterne (Farben stecken in den Ecken der Form)
function gefaerbt(geo, hex) { const f = farbe(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = f.r; a[i * 3 + 1] = f.g; a[i * 3 + 2] = f.b; } geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo.index ? geo.toNonIndexed() : geo; }
function zusammen(teile) {
  const p = [], n = [], c = [];
  for (const g of teile) { p.push(...g.attributes.position.array); n.push(...g.attributes.normal.array); c.push(...g.attributes.color.array); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  return g;
}
const kisteGeo = (b, h, t, x, y, z, hex) => gefaerbt(new THREE.BoxGeometry(b, h, t).translate(x, y, z), hex);
export function baumForm() {       // 1 Einheit hoch
  const krone = new THREE.IcosahedronGeometry(0.34, 1).scale(1, 0.92, 1).translate(0, 0.66, 0), k2 = new THREE.IcosahedronGeometry(0.24, 0).translate(0.16, 0.5, 0.1);
  return zusammen([gefaerbt(new THREE.CylinderGeometry(0.035, 0.05, 0.42, 6).translate(0, 0.21, 0), '#6b4a2e'), gefaerbt(krone, '#ffffff'), gefaerbt(k2, '#e6e6e6')]);
}
export function tanneForm() {
  return zusammen([gefaerbt(new THREE.CylinderGeometry(0.03, 0.04, 0.2, 5).translate(0, 0.1, 0), '#5a3f2a'), gefaerbt(new THREE.ConeGeometry(0.26, 0.5, 7).translate(0, 0.42, 0), '#ffffff'), gefaerbt(new THREE.ConeGeometry(0.18, 0.42, 7).translate(0, 0.78, 0), '#f0f0f0')]);
}
// Ein Rad für fahrende Autos: schwarzer Reifen, dunkle Schüssel, fünf silberne Speichen (an denen sieht man, dass es sich dreht).
// Halbmesser 1 – wer es benutzt, macht es so groß wie die Räder seines Modells. Die Achse liegt quer (in x-Richtung).
export const RAD_BREIT = 0.23;
export function radForm() {
  const t = [gefaerbt(new THREE.CylinderGeometry(1, 1, 1, 22).rotateZ(Math.PI / 2), '#131518'), gefaerbt(new THREE.CylinderGeometry(0.66, 0.66, 1.03, 18).rotateZ(Math.PI / 2), '#24272c')];
  for (let i = 0; i < 5; i++) t.push(gefaerbt(new THREE.BoxGeometry(1.07, 0.6, 0.15).translate(0, 0.33, 0).rotateX(i * Math.PI * 2 / 5), '#b9bfc7'));
  t.push(gefaerbt(new THREE.CylinderGeometry(0.17, 0.17, 1.1, 10).rotateZ(Math.PI / 2), '#c9ced4'));
  return zusammen(t);
}
export function autoForm() {       // vorn ist +z, 4,4 m lang
  const t = [kisteGeo(1.8, 0.62, 4.4, 0, 0.6, 0, '#ffffff'), kisteGeo(1.6, 0.52, 2.3, 0, 1.16, -0.25, '#1d242b'), kisteGeo(1.62, 0.07, 2.2, 0, 1.45, -0.25, '#ffffff')];
  for (const [x, z] of [[-0.86, 1.4], [0.86, 1.4], [-0.86, -1.4], [0.86, -1.4]]) t.push(kisteGeo(0.22, 0.62, 0.62, x, 0.31, z, '#15171a'));
  t.push(kisteGeo(1.5, 0.14, 0.06, 0, 0.72, 2.2, '#fff6c8'), kisteGeo(1.5, 0.14, 0.06, 0, 0.72, -2.2, '#a82a22'));
  return zusammen(t);
}
function laterneForm(alt) {
  return alt ? zusammen([kisteGeo(0.2, 3.6, 0.2, 0, 1.8, 0, '#22262a'), kisteGeo(0.4, 0.5, 0.4, 0, 3.85, 0, '#30353a')])
    : zusammen([kisteGeo(0.24, 6.3, 0.24, 0, 3.15, 0, '#6d747b'), kisteGeo(0.26, 0.12, 1.5, 0, 6.3, 0.6, '#6d747b')]);
}

// ---------------------------------------------------------------------------------------------
// NahTausch: Alle Dinge einer Sorte stehen als einfache Form da. Die nächsten am Spieler werden gegen das
// geladene Modell getauscht (das einfache schrumpft so lange auf null). Zweimal pro Sekunde wird neu gezählt.
// ---------------------------------------------------------------------------------------------
class NahTausch {
  constructor(gruppe, liste, einfach, setze, modellName, platz, weit, schnitt) {
    this.liste = liste; this.einfach = einfach; this.setze = setze; this.platz = platz; this.weit = weit; this.aktiv = [];
    this.o = new THREE.Object3D(); this.null = new THREE.Matrix4().makeScale(0, 0, 0);
    MOD.lade(modellName).then(m => {
      if (!m) return;
      if (schnitt) { m.mat.clippingPlanes = [schnitt]; m.mat.side = THREE.DoubleSide; }
      if (modellName.startsWith('baum')) imWind(m.mat);           // Bäume wiegen sich im Wind
      this.modell = new THREE.InstancedMesh(m.geo, m.mat, platz);
      this.modell.count = 0; this.modell.castShadow = true; this.modell.frustumCulled = false;
      gruppe.add(this.modell);
    });
  }
  matrix(e, i, modell) { const o = this.o; o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); const f = this.setze(o, e, i, modell); o.updateMatrix(); return f; }
  // Ein Ding wurde verschoben (ein parkendes Auto, das der Streifenwagen weggedrückt hat): neu hinstellen
  versetzt(e) {
    if (!this.nr) { this.nr = new Map(); this.liste.forEach((l, i) => this.nr.set(l, i)); }
    const i = this.nr.get(e); if (i === undefined) return;
    const k = this.aktiv.indexOf(i), E = this.einfach.ort;
    if (k >= 0 && this.modell) { this.matrix(e, i, true); this.modell.setMatrixAt(k, this.o.matrix); this.modell.instanceMatrix.needsUpdate = true; }
    else { this.matrix(e, i, false); E[i][0].setMatrixAt(E[i][1], this.o.matrix); E[i][0].instanceMatrix.needsUpdate = true; }
  }
  neu(x, z) {
    if (!this.modell) return;
    const nah = [];
    for (let i = 0; i < this.liste.length; i++) { const e = this.liste[i], d = (e.x - x) ** 2 + (e.z - z) ** 2; if (d < this.weit * this.weit) nah.push([d, i]); }
    nah.sort((a, b) => a[0] - b[0]); nah.length = Math.min(nah.length, this.platz);
    const E = this.einfach.ort;       // wo jedes Ding in den geteilten Instanzen steckt
    for (const i of this.aktiv) { this.matrix(this.liste[i], i, false); E[i][0].setMatrixAt(E[i][1], this.o.matrix); E[i][0].instanceMatrix.needsUpdate = true; }
    this.aktiv = nah.map(n => n[1]);
    this.aktiv.forEach((i, k) => {
      E[i][0].setMatrixAt(E[i][1], this.null); E[i][0].instanceMatrix.needsUpdate = true;
      const f = this.matrix(this.liste[i], i, true); this.modell.setMatrixAt(k, this.o.matrix); if (f) this.modell.setColorAt(k, tmpF.set(f));
    });
    this.modell.count = this.aktiv.length; this.modell.instanceMatrix.needsUpdate = true;
    if (this.modell.instanceColor) this.modell.instanceColor.needsUpdate = true;
  }
}

// Ein Eimer für ein schräg stehendes Haus: Man gibt die Ecken so an, als stünde das Haus gerade mit der Mitte bei 0/0.
// Jede Ecke wird dann gedreht und an den Platz des Hauses geschoben.
export function lokal(e, h) {
  const c = Math.cos(h.dreh), s = Math.sin(h.dreh), m = p => [h.x + p[0] * c + p[2] * s, p[1], h.z - p[0] * s + p[2] * c];
  const L = {
    quad: (a, b, cc, d, f, u0, v0, u1, v1) => e.quad(m(a), m(b), m(cc), m(d), f, u0, v0, u1, v1),
    drei: (a, b, cc, f, u, v) => e.drei(m(a), m(b), m(cc), f, u, v),
    boden: (r, y, f, kachel = 4) => L.quad([r[0], y, r[3]], [r[2], y, r[3]], [r[2], y, r[1]], [r[0], y, r[1]], f, r[0] / kachel, -r[3] / kachel, r[2] / kachel, -r[1] / kachel),
    kiste: (x1, y1, z1, x2, y2, z2, f, u = 0.01, v = 0.02) => {
      const q = (a, b, cc, d) => L.quad(a, b, cc, d, f, u, v, u, v);
      q([x1, y1, z2], [x2, y1, z2], [x2, y2, z2], [x1, y2, z2]); q([x2, y1, z1], [x1, y1, z1], [x1, y2, z1], [x2, y2, z1]);
      q([x2, y1, z2], [x2, y1, z1], [x2, y2, z1], [x2, y2, z2]); q([x1, y1, z1], [x1, y1, z2], [x1, y2, z2], [x1, y2, z1]);
      q([x1, y2, z2], [x2, y2, z2], [x2, y2, z1], [x1, y2, z1]);
    },
  };
  return L;
}

// ---------------------------------------------------------------------------------------------
// Die Stadt bauen. Zurück kommt { gruppe, schritt(dt, x, z), licht(name), schnitt }.
// ---------------------------------------------------------------------------------------------
export function baueStadt() {
  const gruppe = new THREE.Group(), P = PLAN, w = wuerfel(4711);
  const schnitt = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e9);      // alles südlich davon (zur Kamera hin) wird weggeschnitten
  const eimer = new Map(), leuchtend = [];
  let E = key => { if (!eimer.has(key)) eimer.set(key, new Eimer()); return eimer.get(key); };
  const WEISS = farbe('#ffffff');

  // ---- Boden: Die Stadt ist in Kästchen von 20 m geteilt. Jedes bekommt den Boden seines Viertels:
  // Kopfstein in der Altstadt, Pflaster in der Innenstadt, Schotter an der Bahn, sonst Rasen. Wo das Fleet ist, bleibt ein Loch.
  const BODEN = { alt: ['kopfstein', '#d8d0c0', 3.5], markt: ['kopfstein', '#e0d6c2', 3.5], speicher: ['kopfstein', '#cfc8bb', 3.5], bahnhof: ['kopfstein', '#d8d2c6', 3.5], city: ['gehweg', '#e6e2d8', 1.6],
    gewerbe: ['gehweg', '#b9b8b2', 2], werft: ['gehweg', '#b0afa8', 2], bahn: ['gehweg', '#8f7f6c', 2] }, RASEN = ['gras', '#9fc777', 6];
  const ohneFleet = (r, tu) => {
    const F = [FLEET[0] - 1, UFER, FLEET[2] + 1, FLEET[3]];
    if (r[0] >= F[2] || r[2] <= F[0] || r[1] >= F[3]) return tu(r);
    if (r[0] < F[0]) tu([r[0], r[1], F[0], r[3]]); if (r[2] > F[2]) tu([F[2], r[1], r[2], r[3]]);
    if (r[3] > F[3]) tu([Math.max(r[0], F[0]), F[3], Math.min(r[2], F[2]), r[3]]);
  };
  for (let x = STADT_RAND.x0; x < STADT_RAND.x1; x += 20) for (let z = UFER; z < STADT_RAND.z1; z += 20) {
    const [k, f, kachel] = BODEN[viertel(x + 10, z + 10)] || RASEN;
    ohneFleet([x, z, x + 20, z + 20], r => E(k).boden(r, 0, farbe(f), kachel));
  }

  // ---- Straßen: Jede Straße ist ein Band entlang ihrer Linie. band() legt ein Stück Band auf den Boden:
  // von s1 bis s2 Meter, "ab" Meter rechts von der Mitte, "breit" Meter breit.
  const band = (e, W, s1, s2, ab, breit, y, f, kachel = 4) => {
    if (s2 < s1) [s1, s2] = [s2, s1];
    s1 = Math.max(0, s1); s2 = Math.min(W.l, s2); if (s2 - s1 < 0.05) return;
    const stellen = [s1, ...W.L.filter(l => l > s1 + 0.05 && l < s2 - 0.05), s2];
    let alt = null;
    for (const s of stellen) {
      const a = ortAuf(W, s - 0.05), b = ortAuf(W, s + 0.05), o = ortAuf(W, s);
      let tx = a[2] + b[2], tz = a[3] + b[3]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      const mehr = 1 / Math.max(0.5, a[2] * tx + a[3] * tz);          // in einer Ecke muss das Band etwas breiter sein, sonst wird es dort schmal
      const L = [o[0] - tz * (ab - breit / 2) * mehr, y, o[1] + tx * (ab - breit / 2) * mehr], R = [o[0] - tz * (ab + breit / 2) * mehr, y, o[1] + tx * (ab + breit / 2) * mehr];
      if (alt) e.quad(alt.L, alt.R, R, L, f, 0, alt.s / kachel, breit / kachel, s / kachel);
      alt = { L, R, s };
    }
  };
  // Eine runde Scheibe auf dem Boden (für Kreuzungen und Wendeplätze)
  const scheibe = (e, x, z, r, y, f) => { for (let i = 0; i < 14; i++) { const a = i / 14 * 6.2832, b = (i + 1) / 14 * 6.2832; e.drei([x, y, z], [x + Math.cos(b) * r, y, z + Math.sin(b) * r], [x + Math.cos(a) * r, y, z + Math.sin(a) * r], f, x / 5, z / 5); } };
  // Eine niedrige Wand entlang einer Straße (Leitplanke), von beiden Seiten zu sehen
  const planke = (W, s1, s2, ab, h, f) => {
    for (let s = s1; s < s2 - 0.1; s += 8) {
      const a = ortAuf(W, s), b = ortAuf(W, Math.min(s2, s + 8));
      const p = [a[0] - a[3] * ab, a[1] + a[2] * ab], q = [b[0] - b[3] * ab, b[1] + b[2] * ab];
      E('farbe').quad([p[0], 0, p[1]], [q[0], 0, q[1]], [q[0], h, q[1]], [p[0], h, p[1]], f, 0.01, 0.02, 0.01, 0.02);
      E('farbe').quad([q[0], 0, q[1]], [p[0], 0, p[1]], [p[0], h, p[1]], [q[0], h, q[1]], f, 0.01, 0.02, 0.01, 0.02);
    }
  };
  const asphalt = farbe('#8a8d92'), hell = farbe('#f1eee6'), bord = farbe('#a9a69e');
  const BELAG = { kai: ['kopfstein', '#cfc8bb', 3.5], gasse: ['kopfstein', '#bdb5a6', 3.5] };
  P.wege.forEach((W, nr) => {
    const [k, f, kachel] = BELAG[W.art] || ['asphalt', '#8a8d92', 5], schnell = W.art === 'autobahn' || W.art === 'rampe';
    const y = 0.02 + nr * 0.0003 + (W.b > 10 ? 0.012 : W.art === 'gasse' ? -0.004 : 0);       // jede Straße liegt ein Haar höher als die vorige, damit an Kreuzungen nichts flimmert
    if (!schnell && W.art !== 'kai') band(E('gehweg'), W, 0, W.l, 0, W.b + 2 * W.geh, 0.008 + nr * 0.0001, hell, 1.6);
    band(E(k), W, 0, W.l, 0, W.b, y, farbe(f), kachel);
    if (W.art === 'gasse' || W.art === 'kai') return;
    // Die Stücke zwischen den Kreuzungen: Bordstein, Mittelstreifen, Haltelinien, Zebrastreifen
    const gross = W.kreuz.filter(q => q.autos >= 3 || q.s === 0 || q.s === W.l);
    for (let i = 0; i + 1 < gross.length; i++) {
      const a = gross[i].s + gross[i].rf, b = gross[i + 1].s - gross[i + 1].rf;
      if (b - a < 4) continue;
      for (const seite of [-1, 1]) band(E('farbe'), W, a, b, seite * (W.b / 2 + 0.14), 0.28, 0.058, schnell ? WEISS : bord);
      const striche = (ab, breit, voll) => { if (voll) return band(E('strich'), W, a, b, ab, breit, 0.064, WEISS); for (let t = a + 6; t + 3 < b - 6; t += 9) band(E('strich'), W, t, t + 3, ab, breit, 0.064, WEISS); };
      if (W.art === 'autobahn') {
        for (const seite of [-1, 1]) { striche(seite * 6.2, 0.15); striche(seite * 1.6, 0.2, true); planke(W, a, b, seite * (W.b / 2 + 0.9), 0.8, farbe('#b9bec4')); }
        band(E('gras'), W, a, b, 0, 2.4, 0.06, farbe('#8fb86a'), 6); planke(W, a, b, 0, 0.9, farbe('#c9ced3'));
        continue;
      }
      if (W.art === 'rampe') continue;
      striche(0, 0.15); if (W.b > 10) for (const ab of [-3.4, 3.4]) striche(ab, 0.12);
      for (const [q, r] of [[gross[i], 1], [gross[i + 1], -1]]) {
        if (q.autos < 3 || b - a < 26) continue;
        const t = q.s + r * q.rf;
        band(E('strich'), W, t + r * 5.6, t + r * 6, -r * W.b / 4, W.b / 2 - 0.4, 0.064, WEISS);                         // Haltelinie auf der rechten Spur
        for (let ab = -W.b / 2 + 0.85; ab < W.b / 2 - 0.3; ab += 1.1) band(E('strich'), W, t + r * 1, t + r * 4.2, ab, 0.5, 0.064, WEISS);       // Zebrastreifen
      }
    }
  });
  // Kreuzungen und Wendeplätze: eine runde Scheibe füllt die Ecken zwischen den Bändern
  for (const K of P.knoten) {
    const auto = K.kanten.filter(e => e.weg.art !== 'gasse'), b = Math.max(...(auto.length ? auto : K.kanten).map(e => e.weg.b)), kai = K.kanten.some(e => e.weg.art === 'kai');
    if (K.grad < 2 || K.kanten.some(e => e.weg.art === 'autobahn')) continue;
    if (!kai) scheibe(E('gehweg'), K.x, K.z, b / 2 + (auto.length ? GEH : 1.5), 0.007, hell);
    scheibe(E(auto.length && !kai ? 'asphalt' : 'kopfstein'), K.x, K.z, b / 2, 0.0185, auto.length && !kai ? asphalt : farbe(kai ? '#cfc8bb' : '#bdb5a6'));
  }
  for (const p of P.wendeplatz) { scheibe(E('gehweg'), p.x, p.z, p.r + 2, 0.007, hell); scheibe(E('asphalt'), p.x, p.z, p.r, 0.0185, asphalt); }
  // Rasen und Höfe: entweder ein gerades Rechteck oder ein Streifen rund um ein (schräges) Haus
  const HOF = { asphalt: ['asphalt', '#7c7f84', 5], schotter: ['gehweg', '#8f7f6c', 2], pflaster: ['kopfstein', '#d8d2c6', 3.5], kopfstein: ['kopfstein', '#e0d6c2', 3.5], weg: ['gehweg', '#e6d9b8', 2] };
  const umHaus = (e, h, rand, y, f, kachel) => lokal(e, h).boden([-h.b / 2 - rand, -h.t / 2 - rand, h.b / 2 + rand, h.t / 2 + rand], y, f, kachel);
  for (const r of P.gruen) { if (r.haus) umHaus(E('gras'), r.haus, r.rand, 0.004, farbe('#9fc777'), 6); else E('gras').boden(r, 0.005, farbe('#9fc777'), 6); }
  for (const h of P.hof) { const [k, f, kachel] = HOF[h.art]; if (h.haus) umHaus(E(k), h.haus, h.rand, 0.004, farbe(f), kachel); else E(k).boden(h.r, h.art === 'weg' ? 0.045 : 0.006, farbe(f), kachel); }

  // ---- Wasser: das Meer, das Fleet (Kanal), die Teiche
  const blau = farbe('#ffffff'), X0 = STADT_RAND.x0, X1 = STADT_RAND.x1;
  E('wasser').boden([-5000, -5000, 5000, UFER], -0.9, blau, 26);
  E('stein').quad([X0, -2.5, UFER], [X1, -2.5, UFER], [X1, 0, UFER], [X0, 0, UFER], farbe('#8d8a84'), X0 / 3, 0, X1 / 3, 1);       // Kaimauer (schaut nach Norden)
  for (const r of P.wasser) {
    E('wasser').boden(r, -1.1, blau, 26);
    const st = farbe('#8d8a84');
    E('stein').quad([r[0], -2.5, r[1]], [r[0], -2.5, r[3]], [r[0], 0, r[3]], [r[0], 0, r[1]], st, r[1] / 3, 0, r[3] / 3, 1);
    E('stein').quad([r[2], -2.5, r[3]], [r[2], -2.5, r[1]], [r[2], 0, r[1]], [r[2], 0, r[3]], st, r[1] / 3, 0, r[3] / 3, 1);
    E('stein').quad([r[2], -2.5, r[3]], [r[0], -2.5, r[3]], [r[0], 0, r[3]], [r[2], 0, r[3]], st, r[0] / 3, 0, r[2] / 3, 1);
    E('gehweg').boden([r[0] - 1, r[1], r[0], r[3]], 0.006, farbe('#bdb9b0'), 3); E('gehweg').boden([r[2], r[1], r[2] + 1, r[3]], 0.006, farbe('#bdb9b0'), 3);
  }
  // Brücken über das Fleet: eine Platte aus Stein, darauf liegen die Straßen
  for (const [z0, z1] of P.bruecken) { E('kopfstein').boden([FLEET[0] - 1, z0, FLEET[2] + 1, z1], 0.003, farbe('#cfc8bb'), 3.5); E('farbe').kiste(FLEET[0] - 1, -0.7, z0, FLEET[2] + 1, 0, z1, farbe('#8d8a84')); }
  for (const t of P.teiche) { const e = E('wasser'); for (let i = 0; i < 20; i++) { const a = i / 20 * 6.2832, b = (i + 1) / 20 * 6.2832;
    e.drei([t.x, 0.05, t.z], [t.x + Math.cos(b) * t.rx, 0.05, t.z + Math.sin(b) * t.rz], [t.x + Math.cos(a) * t.rx, 0.05, t.z + Math.sin(a) * t.rz], blau, t.x / 26, t.z / 26); } }
  // Geländer an Fleet und Brücken
  for (const [x1, z1, x2, z2] of P.gelaender) { const f = farbe('#3b4045');
    E('farbe').kiste(Math.min(x1, x2) - 0.05, 0.95, Math.min(z1, z2) - 0.05, Math.max(x1, x2) + 0.05, 1.05, Math.max(z1, z2) + 0.05, f);
    const l = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(l / 3));
    for (let i = 0; i <= n; i++) { const x = x1 + (x2 - x1) * i / n, z = z1 + (z2 - z1) * i / n; E('farbe').kiste(x - 0.05, 0, z - 0.05, x + 0.05, 1, z + 0.05, f); } }
  // Gleise
  for (const g of P.gleise) for (const ab of [-0.72, 0.72]) E('farbe').kiste(g.x + ab - 0.05, 0.03, g.z1, g.x + ab + 0.05, 0.16, g.z2, farbe('#5c5650'));
  for (const g of P.gleise) for (let z = g.z1; z < 900; z += 1.4) E('farbe').kiste(g.x - 1.2, 0.02, z, g.x + 1.2, 0.08, z + 0.3, farbe('#4f4338'));

  // ---- Häuser
  for (const h of P.haeuser) if (!h.selbst) haus(h);       // die Polizeiwache baut welt.js aus js/wache.js
  function haus(h) {
    // Das Haus wird so gebaut, als stünde es gerade (Tür nach Süden, Mitte bei 0/0). "lokal" dreht und schiebt jede Ecke an ihren Platz.
    const x1 = -h.b / 2, z1 = -h.t / 2, x2 = h.b / 2, z2 = h.t / 2, f = farbe(h.farbe), stil = h.stil;
    const E0 = E; { const alt = E0; E = key => lokal(alt(key), h); }
    try { hausBauen(h, x1, z1, x2, z2, f, stil); } finally { E = E0; }
  }
  function hausBauen(h, x1, z1, x2, z2, f, stil) {
    if (h.kirche) return kircheBauen(h, x1, z1, x2, z2);
    const y1 = h.typ === 'einzel' ? EG + 0.2 : h.h, yE = Math.min(EG, y1);
    const art = h.typ === 'speicher' || stil === 'halle' ? 'tor' : h.laden ? 'laden' : 'wohn';
    const og = E('og_' + stil), eg = E(`eg_${stil}_${art}`);
    const stock = Math.max(1, Math.round((y1 - yE) / STOCK)), uo = Math.floor(w() * 4) / 4, vo = Math.floor(w() * 4) / 4;
    const wand = (ax, az, bx, bz) => {
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / FELD)) / 4;
      eg.quad([ax, 0, az], [bx, 0, bz], [bx, yE, bz], [ax, yE, az], f, uo, 0, uo + n, yE / EG);
      if (y1 > yE + 0.5) og.quad([ax, yE, az], [bx, yE, bz], [bx, y1, bz], [ax, y1, az], f, uo, vo, uo + n, vo + stock / 4);
    };
    wand(x1, z2, x2, z2); wand(x2, z1, x1, z1); wand(x2, z2, x2, z1); wand(x1, z1, x1, z2);
    const D = h.dach, df = farbe(D.farbe);
    if (D.art === 'flach') {
      E('flach').boden([x1, z1, x2, z2], y1 - 0.4, df, 4);
      if (h.typ === 'city' || h.typ === 'wohnblock') { const mx = x1 + (x2 - x1) * (0.3 + w() * 0.4), mz = z1 + (z2 - z1) * (0.3 + w() * 0.4); E('aufbau').kiste(mx - 1.6, y1 - 0.4, mz - 1.4, mx + 1.6, y1 + 1.5, mz + 1.4, farbe('#9aa0a6')); }
    } else {
      const yr = y1 + D.h, dach = E('dach'), ue = 0.35;       // ue = so weit steht das Dach über
      if (D.first === 'x') {
        const zm = (z1 + z2) / 2, l = (x2 - x1) / 3, s = Math.hypot(zm - z1, D.h) / 3;
        dach.quad([x1, y1, z2 + ue], [x2, y1, z2 + ue], [x2, yr, zm], [x1, yr, zm], df, 0, 0, l, s);
        dach.quad([x2, y1, z1 - ue], [x1, y1, z1 - ue], [x1, yr, zm], [x2, yr, zm], df, 0, 0, l, s);
        og.drei([x1, y1, z1], [x1, y1, z2], [x1, yr, zm], f, uo + 0.01, vo + 0.02); og.drei([x2, y1, z2], [x2, y1, z1], [x2, yr, zm], f, uo + 0.01, vo + 0.02);
        if (h.treppe) for (const xe of (h.seite === 'w' ? [x1] : h.seite === 'o' ? [x2] : [x1, x2])) for (let k = 0; k < 4; k++) { const hb = (z2 - z1) / 2 * (1 - (k + 0.3) / 4.4); og.kiste(xe - 0.3, y1 + k * D.h / 3.7, zm - hb, xe + 0.3, y1 + (k + 1) * D.h / 3.7 + 0.5, zm + hb, f, uo + 0.01, vo + 0.02); }
        if (h.schornstein) og.kiste(x1 + (x2 - x1) * 0.3 - 0.35, yr - 1, zm + 0.6, x1 + (x2 - x1) * 0.3 + 0.35, yr + 0.9, zm + 1.3, farbe('#b9a394'), uo + 0.01, vo + 0.02);
      } else {
        const xm = (x1 + x2) / 2, l = (z2 - z1) / 3, s = Math.hypot(xm - x1, D.h) / 3;
        dach.quad([x2 + ue, y1, z2], [x2 + ue, y1, z1], [xm, yr, z1], [xm, yr, z2], df, 0, 0, l, s);
        dach.quad([x1 - ue, y1, z1], [x1 - ue, y1, z2], [xm, yr, z2], [xm, yr, z1], df, 0, 0, l, s);
        og.drei([x1, y1, z2], [x2, y1, z2], [xm, yr, z2], f, uo + 0.01, vo + 0.02); og.drei([x2, y1, z1], [x1, y1, z1], [xm, yr, z1], f, uo + 0.01, vo + 0.02);
        if (h.treppe) for (const ze of (h.seite === 'n' ? [z1] : h.seite === 's' ? [z2] : [z1, z2])) for (let k = 0; k < 4; k++) { const hb = (x2 - x1) / 2 * (1 - (k + 0.3) / 4.4); og.kiste(xm - hb, y1 + k * D.h / 3.7, ze - 0.3, xm + hb, y1 + (k + 1) * D.h / 3.7 + 0.5, ze + 0.3, f, uo + 0.01, vo + 0.02); }
        if (h.schornstein) og.kiste(xm + 0.6, yr - 1, z1 + (z2 - z1) * 0.3 - 0.35, xm + 1.3, yr + 0.9, z1 + (z2 - z1) * 0.3 + 0.35, farbe('#b9a394'), uo + 0.01, vo + 0.02);
      }
    }
    if (h.turm) {         // Turm mit spitzem Dach (Rathaus, Kirche, Bahnhof)
      const tx = h.turm[0] - h.x, tz = h.turm[1] - h.z, tb = h.turm[2], th = h.turm[3], a = tb / 2, n = Math.max(1, Math.round(tb / FELD)) / 4, st = Math.round(th / STOCK) / 4;
      const tw = (ax, az, bx, bz) => og.quad([ax, 0, az], [bx, 0, bz], [bx, th, bz], [ax, th, az], f, 0, 0, n, st);
      tw(tx - a, tz + a, tx + a, tz + a); tw(tx + a, tz - a, tx - a, tz - a); tw(tx + a, tz + a, tx + a, tz - a); tw(tx - a, tz - a, tx - a, tz + a);
      const sp = [tx, th + tb * 1.5, tz], e = [[tx - a - 0.4, th, tz + a + 0.4], [tx + a + 0.4, th, tz + a + 0.4], [tx + a + 0.4, th, tz - a - 0.4], [tx - a - 0.4, th, tz - a - 0.4]];
      for (let i = 0; i < 4; i++) E('dach').drei(e[i], e[(i + 1) % 4], sp, df, 0.5, 0.5);
    }
  }

  // Eine Kirche aus rotem Backstein, wie sie in den alten Hafenstädten an der Küste stehen (Backsteingotik):
  // langes Schiff mit steilem Dach, Stützpfeiler an den Seiten, dazwischen hohe spitze Fenster, im Westen der Turm
  // mit Uhr, Schall-Luken für die Glocken und einem spitzen grünen Helm aus Kupfer. Das Schiff liegt von West nach Ost.
  function kircheBauen(h, x1, z1, x2, z2) {
    const K = E('aufbau'), dach = E('dach'), y1 = h.h, df = farbe(h.dach.farbe);
    const STEIN = [farbe('#a4523c'), farbe('#97493a'), farbe('#b05c44')], HELL = farbe('#d9cfbd'), GLAS = farbe('#27364f'), BUNT = [farbe('#3a5a8a'), farbe('#7a3a4a'), farbe('#3a6a5a')], HOLZ = farbe('#4a3424'), GOLD = farbe('#e2b53a');
    const zm = (z1 + z2) / 2, breit = z2 - z1, yr = y1 + breit * 0.72;
    K.kiste(x1 - 0.25, 0, z1 - 0.25, x2 + 0.25, 0.9, z2 + 0.25, farbe('#8c8478'));       // der Sockel aus Feldstein
    K.kiste(x1, 0.9, z1, x2, y1, z2, STEIN[0]);
    K.kiste(x1 - 0.2, y1 - 0.5, z1 - 0.2, x2 + 0.2, y1, z2 + 0.2, HELL);                // heller Fries unter dem Dach
    // das steile Dach und die beiden Giebel
    dach.quad([x1, y1, z2 + 0.4], [x2, y1, z2 + 0.4], [x2, yr, zm], [x1, yr, zm], df, 0, 0, (x2 - x1) / 3, 3);
    dach.quad([x2, y1, z1 - 0.4], [x1, y1, z1 - 0.4], [x1, yr, zm], [x2, yr, zm], df, 0, 0, (x2 - x1) / 3, 3);
    K.drei([x1, y1, z1], [x1, y1, z2], [x1, yr, zm], STEIN[0]); K.drei([x2, y1, z2], [x2, y1, z1], [x2, yr, zm], STEIN[0]);
    // ein hohes spitzes Fenster: heller Rahmen, dunkles Glas mit einem bunten Feld. An einer Längswand (seite = ±1) oder am Ost-Giebel.
    const fenster = (m, b, yu, yo, seite, ost) => {
      const P = (a, y, t) => ost ? [x2 + t, y, m - a * seite] : [m + a * seite, y, (seite > 0 ? z2 : z1) + t * seite];
      const feld = (bb, u, o, t, f) => { K.quad(P(-bb, u, t), P(bb, u, t), P(bb, o, t), P(-bb, o, t), f); K.drei(P(-bb, o, t), P(bb, o, t), P(0, o + bb * 1.5, t), f); };
      feld(b / 2 + 0.22, yu - 0.2, yo, 0.04, HELL); feld(b / 2, yu, yo, 0.08, GLAS); feld(b / 2 - 0.25, yu + (yo - yu) * 0.55, yo - 0.2, 0.11, BUNT[Math.abs(Math.round(m)) % 3]);
      K.quad(P(-0.07, yu, 0.13), P(0.07, yu, 0.13), P(0.07, yo + b * 0.6, 0.13), P(-0.07, yo + b * 0.6, 0.13), HELL);       // die Mittelstrebe
    };
    // Stützpfeiler und Fenster an beiden Längsseiten; in der Mitte der Südseite das Portal
    const n = Math.max(3, Math.round((x2 - x1) / 4.6)), feldB = (x2 - x1) / n, tuer = Math.floor(n / 2);
    for (const seite of [1, -1]) {
      const zw = seite > 0 ? z2 : z1;
      for (let i = 0; i <= n; i++) { const x = x1 + i * feldB, f = STEIN[1 + i % 2];
        K.kiste(x - 0.42, 0, Math.min(zw, zw + seite * 0.95), x + 0.42, y1 * 0.62, Math.max(zw, zw + seite * 0.95), f);
        K.kiste(x - 0.36, y1 * 0.62, Math.min(zw, zw + seite * 0.55), x + 0.36, y1 - 0.9, Math.max(zw, zw + seite * 0.55), f);
        K.kiste(x - 0.5, y1 * 0.62 - 0.12, Math.min(zw, zw + seite * 1.02), x + 0.5, y1 * 0.62 + 0.1, Math.max(zw, zw + seite * 1.02), HELL); }
      for (let i = 0; i < n; i++) { const m = x1 + (i + 0.5) * feldB;
        if (seite > 0 && i === tuer) {       // das Portal: zwei Stufen, eine schwere Holztür im spitzen Bogen, darüber ein rundes Fenster
          K.kiste(m - 2.1, 0, z2, m + 2.1, 0.16, z2 + 1.5, HELL); K.kiste(m - 1.8, 0.16, z2, m + 1.8, 0.32, z2 + 1.1, HELL);
          const P = (a, y, t) => [m + a, y, z2 + t], bogen = (bb, o, t, f) => { K.quad(P(-bb, 0.32, t), P(bb, 0.32, t), P(bb, o, t), P(-bb, o, t), f); K.drei(P(-bb, o, t), P(bb, o, t), P(0, o + bb * 1.3, t), f); };
          bogen(1.65, 3.3, 0.05, HELL); bogen(1.3, 3.2, 0.1, HOLZ); K.quad(P(-0.04, 0.32, 0.13), P(0.04, 0.32, 0.13), P(0.04, 4.6, 0.13), P(-0.04, 4.6, 0.13), farbe('#2a1c12'));
          for (const sx of [-0.35, 0.35]) K.kiste(m + sx - 0.05, 1.5, z2 + 0.1, m + sx + 0.05, 1.75, z2 + 0.2, GOLD);
          for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, b = a + Math.PI / 4, r = 1.25, ym = y1 - 3.4; K.drei(P(0, ym, 0.06), P(Math.cos(a) * r, ym + Math.sin(a) * r, 0.06), P(Math.cos(b) * r, ym + Math.sin(b) * r, 0.06), k % 2 ? BUNT[k % 3] : GLAS); }
        } else fenster(m, Math.min(1.7, feldB * 0.42), 3.2, y1 - 3.4, seite, false);
      }
    }
    fenster(zm, 2.2, 3.4, y1 - 2.2, 1, true);       // das große Fenster im Ost-Giebel
    for (const dz of [-breit * 0.3, breit * 0.3]) fenster(zm + dz, 1.1, 3.4, y1 - 4.2, 1, true);
    K.kiste(x2 - 0.3, yr - 0.2, zm - 0.3, x2 + 0.3, yr + 1.2, zm + 0.3, STEIN[1]); K.kiste(x2 - 0.06, yr + 1.2, zm - 0.06, x2 + 0.06, yr + 2.6, zm + 0.06, GOLD); K.kiste(x2 - 0.06, yr + 2.0, zm - 0.5, x2 + 0.06, yr + 2.12, zm + 0.5, GOLD);       // das Kreuz auf dem Giebel
    if (!h.turm) return;
    // ---- der Turm
    const tx = h.turm[0] - h.x, tz = h.turm[1] - h.z, a = h.turm[2] / 2, th = h.turm[3];
    K.kiste(tx - a - 0.25, 0, tz - a - 0.25, tx + a + 0.25, 0.9, tz + a + 0.25, farbe('#8c8478'));
    K.kiste(tx - a, 0.9, tz - a, tx + a, th, tz + a, STEIN[0]);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.kiste(tx + sx * a - 0.45, 0, tz + sz * a - 0.45, tx + sx * a + 0.45, th - 1, tz + sz * a + 0.45, STEIN[1]);       // verstärkte Ecken
    for (const y of [y1 + 1.5, th * 0.66, th - 1]) K.kiste(tx - a - 0.18, y, tz - a - 0.18, tx + a + 0.18, y + 0.4, tz + a + 0.18, HELL);                                             // helle Bänder
    // auf jeder Seite: unten ein schmales Fenster, in der Mitte die Uhr, oben zwei Schall-Luken für die Glocken
    for (let s = 0; s < 4; s++) {
      const c = [1, 0, -1, 0][s], d = [0, 1, 0, -1][s];       // (c, d) = nach außen, quer dazu (d, −c)
      const P = (q, y, t) => [tx + c * (a + t) + d * q, y, tz + d * (a + t) - c * q];
      const flaeche = (q1, q2, u, o, t, f) => K.quad(P(q1, u, t), P(q2, u, t), P(q2, o, t), P(q1, o, t), f);
      const spitz = (q, bb, u, o, t, f) => { flaeche(q - bb, q + bb, u, o, t, f); K.drei(P(q - bb, o, t), P(q + bb, o, t), P(q, o + bb * 1.5, t), f); };
      spitz(0, 0.75, y1 * 0.55, y1 + 0.2, 0.05, HELL); spitz(0, 0.5, y1 * 0.55 + 0.25, y1, 0.09, GLAS);
      const yu = th * 0.56, ru = Math.min(1.7, a * 0.42);
      for (let k = 0; k < 12; k++) { const w0 = k * Math.PI / 6, w1 = w0 + Math.PI / 6; K.drei(P(0, yu, 0.07), P(Math.cos(w0) * ru, yu + Math.sin(w0) * ru, 0.07), P(Math.cos(w1) * ru, yu + Math.sin(w1) * ru, 0.07), farbe('#f3efe2'));
        K.drei(P(0, yu, 0.04), P(Math.cos(w0) * (ru + 0.22), yu + Math.sin(w0) * (ru + 0.22), 0.04), P(Math.cos(w1) * (ru + 0.22), yu + Math.sin(w1) * (ru + 0.22), 0.04), GOLD); }
      flaeche(-0.07, 0.07, yu, yu + ru * 0.8, 0.1, farbe('#1c1c1c')); K.quad(P(0, yu - 0.07, 0.1), P(ru * 0.55, yu + 0.25, 0.1), P(ru * 0.55, yu + 0.39, 0.1), P(0, yu + 0.07, 0.1), farbe('#1c1c1c'));       // die Zeiger: zehn nach zwölf
      for (const q of [-a * 0.42, a * 0.42]) { spitz(q, a * 0.26, th * 0.74, th - 3.2, 0.05, HELL); spitz(q, a * 0.2, th * 0.74 + 0.2, th - 3.4, 0.09, farbe('#2b2622'));
        for (let k = 0; k < 5; k++) flaeche(q - a * 0.2, q + a * 0.2, th * 0.74 + 0.5 + k * (th * 0.26 - 4.2) / 5, th * 0.74 + 0.68 + k * (th * 0.26 - 4.2) / 5, 0.12, farbe('#5a5048')); }
    }
    // der Helm: unten vier kleine Giebel, darüber die lange Spitze aus grünem Kupfer, ganz oben Kugel und Wetterhahn
    const hs = h.turm[2] * 2.1, sp = [tx, th + hs, tz], e = [[tx - a - 0.4, th, tz + a + 0.4], [tx + a + 0.4, th, tz + a + 0.4], [tx + a + 0.4, th, tz - a - 0.4], [tx - a - 0.4, th, tz - a - 0.4]];
    for (let i = 0; i < 4; i++) { const p = e[i], q = e[(i + 1) % 4], mitte = [(p[0] + q[0]) / 2, th + a * 1.3, (p[1 + 1] + q[2]) / 2];
      K.drei(p, q, mitte, STEIN[2]); dach.drei(p, mitte, sp, df, 0.5, 0.5); dach.drei(mitte, q, sp, df, 0.5, 0.5); }
    K.kiste(tx - 0.3, th + hs - 0.5, tz - 0.3, tx + 0.3, th + hs + 0.1, tz + 0.3, GOLD); K.kiste(tx - 0.05, th + hs, tz - 0.05, tx + 0.05, th + hs + 1.6, tz + 0.05, GOLD); K.kiste(tx - 0.5, th + hs + 1.2, tz - 0.04, tx + 0.4, th + hs + 1.7, tz + 0.04, GOLD);
    // das Turmportal im Westen
    { const P = (q, y, t) => [tx - a - t, y, tz + q], bogen = (bb, o, t, f) => { K.quad(P(-bb, 0, t), P(bb, 0, t), P(bb, o, t), P(-bb, o, t), f); K.drei(P(-bb, o, t), P(bb, o, t), P(0, o + bb * 1.3, t), f); };
      bogen(1.5, 3.0, 0.5, HELL); bogen(1.15, 2.9, 0.55, HOLZ); }
  }

  // ---- Kleinkram aus einfachen Formen: Stege, Kräne, Boote, Waggons, Bussteige
  const holz = farbe('#ffffff');
  for (const d of P.deko) {
    const e = E('farbe');
    if (d.art === 'steg') {
      E('steg').boden([d.x - 2.2, UFER - d.lang, d.x + 2.2, UFER], 0.02, holz, 2.5);
      E('farbe').kiste(d.x - 2.2, -0.3, UFER - d.lang, d.x + 2.2, 0, UFER, farbe('#6b5a48'));
      for (let z = UFER - 3; z > UFER - d.lang; z -= 7) for (const sx of [-2.1, 2.1]) e.kiste(d.x + sx - 0.18, -2.5, z - 0.18, d.x + sx + 0.18, 0.7, z + 0.18, farbe('#5a4a3a'));
    } else if (d.art === 'kran') {
      const f = farbe('#d8a020');
      for (const [sx, sz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) e.kiste(d.x + sx - 0.4, 0, d.z + sz - 0.4, d.x + sx + 0.4, 22, d.z + sz + 0.4, f);
      e.kiste(d.x - 3.5, 22, d.z - 3.5, d.x + 3.5, 25, d.z + 3.5, f); e.kiste(d.x - 0.8, 25, d.z - 34, d.x + 0.8, 26.6, d.z + 12, f);
      e.kiste(d.x - 0.08, 9, d.z - 30.08, d.x + 0.08, 25, d.z - 29.92, farbe('#333333')); e.kiste(d.x - 1.2, 25, d.z + 6, d.x + 1.2, 28, d.z + 11, farbe('#5a6066'));
    } else if (d.art === 'boot') {
      const f = farbe(['#f2f2f2', '#2f5d9a', '#b3372e', '#3d6b4f'][Math.floor(w() * 4)]);
      e.kiste(d.x - 1.5, -1.3, d.z - 5, d.x + 1.5, -0.3, d.z + 5, f); e.kiste(d.x - 1.1, -0.3, d.z - 2, d.x + 1.1, 0.9, d.z + 1.5, farbe('#f4f0e6')); e.kiste(d.x - 0.05, 0.9, d.z - 0.05, d.x + 0.05, 3.2, d.z + 0.05, farbe('#444444'));
    } else if (d.art === 'waggons') {
      for (let k = 0; k < d.n; k++) { const z = d.z + k * 15, f = farbe(['#8a3b2e', '#4a5a66', '#6b7a4a', '#a8742e'][Math.floor(w() * 4)]);
        e.kiste(d.x - 1.45, 1, z - 6.8, d.x + 1.45, 4, z + 6.8, f); e.kiste(d.x - 1.3, 0.3, z - 6.2, d.x + 1.3, 1, z + 6.2, farbe('#2a2a2a')); }
    } else if (d.art === 'bussteig') {       // ein langes Dach auf Stützen, von Norden nach Süden
      const l = d.lang / 2;
      e.kiste(d.x - 2.4, 3.4, d.z - l, d.x + 2.4, 3.7, d.z + l, farbe('#e9edf0')); e.kiste(d.x - 2, 0, d.z - l, d.x + 2, 0.16, d.z + l, farbe('#c9c6bd'));
      for (let z = -l + 3; z <= l - 3; z += 7) e.kiste(d.x - 0.12, 0, d.z + z - 0.12, d.x + 0.12, 3.4, d.z + z + 0.12, farbe('#59626a'));
    }
  }
  // Kutter an den Stegen (aus Kisten; echte Modelle stehen auf der Wunschliste)
  for (const d of P.deko.filter(d => d.art === 'steg')) for (const seite of [-1, 1]) {
    if (w() < 0.35) continue;
    const e = E('farbe'), x = d.x + seite * 5.4, z = UFER - 10 - w() * (d.lang - 22), f = farbe(['#2f5d9a', '#b3372e', '#3d6b4f', '#f2f2f2', '#1f3d5a'][Math.floor(w() * 5)]);
    e.kiste(x - 2, -1.4, z - 6.5, x + 2, 0.5, z + 6.5, f); e.kiste(x - 1.7, 0.5, z - 6.3, x + 1.7, 0.75, z + 6.3, farbe('#f4f0e6'));
    e.kiste(x - 1.3, 0.5, z + 1, x + 1.3, 2.9, z + 4.4, farbe('#f4f0e6')); e.kiste(x - 1.35, 2.9, z + 0.9, x + 1.35, 3.05, z + 4.5, farbe('#7a3a2c'));
    e.kiste(x - 0.07, 0.5, z - 2.07, x + 0.07, 6.5, z - 1.93, farbe('#4a3a2a')); e.kiste(x - 0.05, 3, z - 5, x + 0.05, 3.1, z - 2, farbe('#4a3a2a'));
  }

  // ---- Materialien und fertige Formen
  const boeden = [];        // alle Boden-Materialien: Bei Regen werden sie dunkel und glänzend (siehe nass)
  const bodenMat = (name, extra = {}) => { const m = new THREE.MeshStandardMaterial({ map: BILD.boden(name), vertexColors: true, roughness: 0.95, ...extra }); m.userData.gras = name === 'boden_gras'; boeden.push(m); return m; };
  const MAT = {
    gehweg: () => bodenMat('boden_gehweg'), asphalt: () => bodenMat('boden_asphalt'), kopfstein: () => bodenMat('boden_kopfstein'), gras: () => bodenMat('boden_gras'),
    steg: () => bodenMat('boden_steg'), stein: () => bodenMat('boden_kopfstein', { side: THREE.DoubleSide }),
    strich: () => new THREE.MeshStandardMaterial({ color: '#e9e9e2', roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }),
    farbe: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
    flach: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, clippingPlanes: [schnitt] }),
    aufbau: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, clippingPlanes: [schnitt] }),
    dach: () => new THREE.MeshStandardMaterial({ map: BILD.ziegel(), vertexColors: true, roughness: 0.8, side: THREE.DoubleSide, clippingPlanes: [schnitt] }),
    wasser: () => new THREE.MeshStandardMaterial({ map: BILD.wellen(), color: '#2f7391', roughness: 0.18, metalness: 0.25 }),
  };
  let wasserMat = null;
  for (const [key, e] of eimer) {
    if (!e.p.length) continue;
    let mat;
    if (key.startsWith('og_') || key.startsWith('eg_')) {
      const [, stil, art] = key.split('_'), b = key.startsWith('og_') ? BILD.fassade(stil) : BILD.erdgeschoss(stil, art);
      mat = new THREE.MeshStandardMaterial({ map: b.map, emissiveMap: b.leucht, emissive: '#ffe2b0', emissiveIntensity: 0, vertexColors: true, roughness: 0.9, side: THREE.DoubleSide, clippingPlanes: [schnitt] });
      leuchtend.push(mat);
    } else mat = MAT[key]();
    if (key === 'wasser') wasserMat = mat;
    const m = new THREE.Mesh(e.form(), mat);
    const hoch = key.startsWith('og_') || key.startsWith('eg_') || key === 'dach' || key === 'farbe';
    m.castShadow = hoch; m.receiveShadow = true; m.frustumCulled = false;
    if (key === 'strich') m.receiveShadow = false;
    gruppe.add(m);
  }

  // ---- Bäume, Laternen, parkende Autos: einfache Formen für alle, Modelle für die nächsten
  const tausch = [];
  const schnittMat = extra => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true, clippingPlanes: [schnitt], ...extra });
  const GRUEN = ['#4f8040', '#5a8c46', '#44763a', '#648f48', '#4c7c42'];
  const laub = P.baeume.filter(b => b.art !== 'fichte'), fichten = P.baeume.filter(b => b.art === 'fichte');
  const setzBaum = (o, b, i, modell) => { o.position.set(b.x, 0, b.z); o.rotation.y = i * 2.4; o.scale.setScalar(modell ? b.h / 8 : b.h); return modell ? null : GRUEN[i % GRUEN.length]; };
  const laubIM = instanzenGeteilt(baumForm(), imWind(schnittMat()), laub, setzBaum); gruppe.add(laubIM.gruppe);
  gruppe.add(instanzenGeteilt(tanneForm(), imWind(schnittMat()), fichten, (o, b, i) => { o.position.set(b.x, 0, b.z); o.scale.setScalar(b.h * 1.2); return ['#3f6f4a', '#4a7a52', '#37634a'][i % 3]; }).gruppe);
  tausch.push(new NahTausch(gruppe, laub, laubIM, setzBaum, 'baum_laub', 12, 60, schnitt));
  for (const alt of [true, false]) {
    const liste = P.laternen.filter(l => !!l.alt === alt);
    const setz = (o, l) => { o.position.set(l.x, 0, l.z); o.rotation.y = l.dreh; };
    const im = instanzenGeteilt(laterneForm(alt), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), liste, setz, false); gruppe.add(im.gruppe);
    tausch.push(new NahTausch(gruppe, liste, im, setz, alt ? 'laterne_alt' : 'laterne', 16, 60));
  }
  const autoMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.2 });
  const setzAuto = (o, a) => { o.position.set(a.x, 0, a.z); o.rotation.y = a.h; return AUTO_FARBEN[a.farbe]; };
  const ARTEN = ['auto_kombi', 'auto_kompakt', 'auto_van', 'auto_suv'];
  const parkTausch = [];
  ARTEN.forEach((name, k) => {
    const liste = P.parker.filter(a => a.art === k), im = instanzenGeteilt(autoForm(), autoMat, liste, setzAuto); gruppe.add(im.gruppe);
    tausch.push(new NahTausch(gruppe, liste, im, (o, a, i, modell) => { const f = setzAuto(o, a); return modell ? (k < 2 ? f : '#ffffff') : f; }, name, 10, 75)); parkTausch[k] = tausch[tausch.length - 1];
  });
  // Laternen-Licht für den Abend: ein heller Punkt oben und ein Lichtfleck auf dem Boden
  const kopf = l => l.alt ? [l.x, 3.85, l.z] : [l.x + Math.sin(l.dreh) * 1.2, 6.2, l.z + Math.cos(l.dreh) * 1.2];
  const punkt = instanzen(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe9b8', fog: false }), P.laternen, (o, l) => { o.position.set(...kopf(l)); }, false);
  const fleckGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const fleck = instanzen(fleckGeo, new THREE.MeshBasicMaterial({ map: BILD.schein('rgba(255,214,150,1)', 'rgba(255,200,120,0)'), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }),
    P.laternen, (o, l) => { const k = kopf(l); o.position.set(k[0], 0.06, k[2]); o.scale.setScalar(l.alt ? 13 : 19); }, false);
  punkt.visible = fleck.visible = false; fleck.renderOrder = 2;
  gruppe.add(punkt, fleck);

  // Kleinteile als geladene Modelle (erst da, wenn die Datei geladen ist)
  const NAME = { brunnen: 'mal_brunnen' }, nachArt = new Map();
  for (const d of P.deko) { const n = NAME[d.art] || d.art; if (MOD.MODELLE[n]) { if (!nachArt.has(n)) nachArt.set(n, []); nachArt.get(n).push(d); } }
  for (const [name, liste] of nachArt) MOD.lade(name).then(m => { if (m) gruppe.add(instanzen(m.geo, m.mat, liste, (o, d) => { o.position.set(d.x, 0, d.z); o.rotation.y = d.dreh || 0; })); });
  // Yachten und Bojen im Hafen
  const yachten = P.deko.filter(d => d.art === 'steg').filter((d, i) => i % 2 === 0).map(d => ({ x: d.x - 6.5, z: UFER - d.lang + 9, dreh: 0 }));
  MOD.lade('mal_yacht').then(m => { if (m) { m.geo.translate(0, -1.1, 0); gruppe.add(instanzen(m.geo, m.mat, yachten, (o, d) => { o.position.set(d.x, 0, d.z); })); } });
  const bojen = [[-300, -230], [-60, -260], [150, -240], [420, -250], [272, -170]].map(([x, z]) => ({ x, z }));
  MOD.lade('boje').then(m => { if (m) { m.geo.translate(0, -1.6, 0); gruppe.add(instanzen(m.geo, m.mat, bojen, (o, d) => { o.position.set(d.x, 0, d.z); })); } });

  let uhr = 0, tauschZeit = 0, welle = 0;
  return {
    gruppe, schnitt, tausch,
    parkBewegt(p) { parkTausch[p.art].versetzt(p); },
    // dt = vergangene Zeit, x/z = wo der Spieler ist
    schritt(dt, x, z) {
      uhr += dt;
      welle += dt * (0.6 + WIND.uWind.value * 1.6);            // bei Wind laufen die Wellen schneller
      if (wasserMat) wasserMat.map.offset.set(welle * 0.006, welle * 0.011);
      if ((tauschZeit -= dt) <= 0) { tauschZeit = 0.5; for (const t of tausch) t.neu(x, z); }
    },
    // Regen: k = 0 trocken … 1 klatschnass. Nasse Straßen sind dunkler und spiegeln das Licht von Laternen, Scheinwerfern und Blaulicht.
    nass(k) {
      fleck.material.opacity = 0.5 + 0.4 * k;                  // die Lichtflecken der Laternen spiegeln sich im nassen Pflaster
      for (const m of boeden) { m.roughness = m.userData.gras ? 0.95 - 0.25 * k : 0.95 - 0.67 * k; m.color.setScalar(1 - (m.userData.gras ? 0.22 : 0.42) * k); }
    },
    // abends und nachts leuchten Fenster und Laternen
    licht(name) {
      const an = name === 'abend' ? 0.75 : name === 'nacht' ? 1.15 : 0;
      for (const m of leuchtend) m.emissiveIntensity = an;
      punkt.visible = fleck.visible = an > 0;
      if (wasserMat) wasserMat.color.set(name === 'nacht' ? '#0c2233' : name === 'abend' ? '#5a6f88' : '#2f7391');
    },
  };
}
