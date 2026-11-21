// Blaulicht über Möwenbrück – der Stadtplan (ohne three.js, läuft auch in node).
//
// Hier wird die ganze Stadt ausgerechnet: Straßen, Kreuzungen, Häuser, Viertel, Fleet, Bahn, Hafen, Park,
// Bäume, Laternen, parkende Autos. Gebaut wird sie daraus in stadtbau.js, gemalt (als Karte) in karte.js.
//
// Die Stadt ist wie eine alte deutsche Hafenstadt angelegt (so ähnlich wie Bremen, Lübeck oder Münster):
//   - in der Mitte die Altstadt mit engen, krummen Gassen rund um den Marktplatz
//   - rundherum der Wallring (früher stand dort die Stadtmauer), außen daran ein grüner Gürtel
//   - von dort gehen die großen Straßen wie Sonnenstrahlen nach draußen (Ausfallstraßen),
//     dazwischen liegen Gürtelstraßen im Bogen
//   - weiter draußen der Stadtring, dahinter Wohngebiete mit Sackgassen, im Westen Bahn, Werft und Gewerbe
//   - ganz im Süden läuft die Autobahn im großen Bogen um die Stadt
//
// Maße in Metern. x = Osten ist plus, z = Süden ist plus. Norden (minus z) ist das Meer.
// Ein Rechteck ist immer [x1, z1, x2, z2]. Die Stadt ist etwa 1,7 km breit und 950 m tief.
// Alles hier ist ausgedacht: Straßennamen, Viertel, Häuser.

// Ein Würfel, der immer dieselben "Zufalls"-Zahlen liefert – so sieht die Stadt bei jedem Start gleich aus.
export function wuerfel(start) {
  let s = start;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export const GEH = 3;            // so breit ist der Gehweg zwischen Fahrbahn und Hauswand
export const UFER = -112;        // nördlich davon ist Wasser
export const KAI_Z = -104;       // hier läuft die Straße am Hafen entlang
export const GROSS = [-832, UFER + 2, 852, 856];          // so weit kann man laufen und fahren
export const STADT_RAND = { x0: -850, x1: 870, z1: 880 }; // so weit reicht der Boden der Stadt
export const FLEET = [249, UFER - 2, 291, 455];           // das Fleet (ein Kanal) – Wasser
export const GLEIS = [-486, -58, -455, 1300];             // die Bahngleise

// Die Stadt ist rund um den Hafen gewachsen. Darum rechnen wir viele Straßen mit "Winkel und Abstand" aus:
// pol(grad, r) = die Stelle, die r Meter vom Hafen weg liegt, in Richtung grad (0 = Osten, 90 = Süden, 180 = Westen).
// Nach Osten ist die Stadt etwas breiter gezogen als nach Westen.
export const MITTE = [0, KAI_Z];
const OST = 1.105, WEST = 0.87;
export const pol = (grad, r) => { const a = grad * Math.PI / 180, c = Math.cos(a); return [r * c * (c > 0 ? OST : WEST), MITTE[1] + r * Math.sin(a)]; };
export const polar = (x, z) => { const dx = x / (x > 0 ? OST : WEST), dz = z - MITTE[1]; return [Math.hypot(dx, dz), Math.atan2(dz, dx) * 180 / Math.PI]; };
export const R_WALL = 380, R_GUERTEL = 465, R_MITTEL = 552, R_RING = 640, R_FELD = 740, R_RAND = 830;

// ---------------------------------------------------------------------------------------------
// Kleine Rechen-Helfer für Linien
// ---------------------------------------------------------------------------------------------
const weit = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
// Der Punkt auf der Strecke a–b, der p am nächsten liegt
function fuss(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2));
  return [a[0] + dx * t, a[1] + dz * t];
}
// Macht aus wenigen Punkten eine weiche Kurve, die durch alle Punkte läuft.
function glatt(pts) {
  const aus = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(1, Math.round(weit(p1, p2) / 14));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      aus.push(k === 0 ? [p1[0], p1[1]] : [0, 1].map(j => 0.5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  aus.push([pts.at(-1)[0], pts.at(-1)[1]]);
  return aus;
}
// Wo ist man nach s Metern auf einem Weg? Zurück kommt [x, z, Richtung x, Richtung z].
export function ortAuf(W, s) {
  s = Math.max(0, Math.min(W.l, s));
  let lo = 0, hi = W.L.length - 2;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (W.L[m] <= s) lo = m; else hi = m - 1; }
  const a = W.pts[lo], b = W.pts[lo + 1], d = W.L[lo + 1] - W.L[lo] || 1, t = (s - W.L[lo]) / d;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (b[0] - a[0]) / d, (b[1] - a[1]) / d];
}
// Die vier Ecken eines (vielleicht schräg stehenden) Hauses. dreh = wohin die Haustür schaut: nach (sin dreh, cos dreh).
export function eckenVon(h, rand = 0) {
  const c = Math.cos(h.dreh), s = Math.sin(h.dreh), hb = h.b / 2 + rand, ht = h.t / 2 + rand;
  return [[-hb, -ht], [hb, -ht], [hb, ht], [-hb, ht]].map(([lx, lz]) => [h.x + lx * c + lz * s, h.z - lx * s + lz * c]);
}
// Überschneiden sich zwei schräge Rechtecke? (Man sucht eine Linie, die beide trennt.)
function ueberlappt(A, B) {
  for (const E of [A, B]) for (let i = 0; i < 2; i++) {
    const ax = E[i + 1][1] - E[i][1], az = -(E[i + 1][0] - E[i][0]);
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    for (const p of A) { const d = p[0] * ax + p[1] * az; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
    for (const p of B) { const d = p[0] * ax + p[1] * az; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
    if (a1 <= b0 || b1 <= a0) return false;
  }
  return true;
}
const huelle = E => [Math.min(...E.map(p => p[0])), Math.min(...E.map(p => p[1])), Math.max(...E.map(p => p[0])), Math.max(...E.map(p => p[1]))];
const imRechteck = (x, z, r, rand = 0) => x > r[0] - rand && x < r[2] + rand && z > r[1] - rand && z < r[3] + rand;

// ---------------------------------------------------------------------------------------------
// Die Straßen. art: 'kai' (Hafenstraße aus Kopfstein), 'gasse' (eng, nur zu Fuß und für den Streifenwagen),
// 'strasse', 'ring' (breit), 'autobahn', 'rampe' (Auffahrt), 'sack' (Sackgasse mit Wendeplatz)
// ---------------------------------------------------------------------------------------------
function wegeListe() {
  const W = [];
  const weg = (name, b, art, pts, rund) => { W.push({ name, b, art, geh: art === 'gasse' ? 1.5 : art === 'autobahn' || art === 'rampe' ? 0.5 : GEH, pts: rund ? glatt(pts) : pts.map(p => [p[0], p[1]]) }); };
  const K = x => [x, KAI_Z], RW = g => pol(g, R_WALL);
  // Ein Bogen um den Hafen: von Winkel g0 bis g1, alle 5 Grad ein Punkt und dazu genau an den Winkeln in "dazu"
  const bogen = (r, g0, g1, dazu = []) => {
    const gs = [g0, g1, ...dazu.filter(g => g > g0 && g < g1)];
    for (let g = Math.ceil(g0 / 5) * 5; g < g1; g += 5) if (gs.every(q => Math.abs(q - g) > 1.6)) gs.push(g);
    return gs.sort((a, b) => a - b).map(g => pol(g, r));
  };
  // Ein Strahl vom Hafen weg: gerade Linie in Richtung g, von Abstand r0 bis r1
  const strahl = (g, r0, r1) => [...new Set([r0, R_WALL, R_GUERTEL, R_MITTEL, R_RING, R_FELD, R_RAND, r1])].filter(r => r >= r0 && r <= r1).sort((a, b) => a - b).map(r => pol(g, r));
  const STRAHLEN = [7, 20, 32, 44.4, 62, 70, 80, 90, 100.5, 111, 122.5, 135, 139.5, 141, 155, 163.5, 168, 172];

  // ---- am Wasser
  weg('Am Kai', 12, 'kai', [K(-485), K(645)]);
  weg('Werftstraße', 10, 'strasse', [K(-485), pol(180, R_RING), [-650, -98], [-740, -84], [-826, -76]], true);
  weg('Strandweg', 10, 'strasse', [K(645), pol(0, R_RING), [770, -96], [846, -80]], true);

  // ---- die Altstadt: die großen Straßen (rund um Markt, Wache, Kita und Museum sind sie gerade wie an Tag 1)
  weg('Speicherstraße', 10, 'strasse', [RW(172), [-200, -64], [-80, -60], [80, -60], [240, -60], [300, -60], RW(7)]);
  weg('Wachstraße', 10, 'strasse', [[-245, -22], [-165, -10], [-80, 0], [80, 0], [165, 6], [240, 4]]);
  weg('Bäckergasse', 10, 'strasse', [RW(155), [-190, 72], [-80, 60], [80, 60], [160, 68], [240, 62]]);
  weg('Marktstraße', 10, 'strasse', [K(-80), [-80, 60], [-88, 125], [-106, 195], RW(111)]);
  weg('Deichstraße', 10, 'strasse', [K(0), [0, 60], [7, 130], [3, 205], RW(90)]);
  weg('Museumsstraße', 10, 'strasse', [K(80), [80, 60], [90, 130], [116, 198], RW(70)]);
  weg('Fleetufer West', 10, 'strasse', [K(240), pol(70, R_RING)]);
  weg('Fleetufer Ost', 10, 'strasse', [K(300), [300, 478]]);
  // ---- die Altstadt: enge, krumme Gassen
  weg('Wallgasse', 5, 'gasse', [K(-245), [-238, -50], [-245, -22], [-262, 30], [-236, 95], RW(139.5)], true);
  weg('Gildengasse', 5, 'gasse', [K(-165), [-158, -62], [-165, -10], [-150, 40], [-163, 74], [-142, 140], [-152, 200], RW(122.5)], true);
  weg('Schustergasse', 5, 'gasse', [[-236, 95], [-200, 112], [-142, 140], [-88, 125]], true);
  weg('Rosmaringang', 5, 'gasse', [RW(163.5), [-262, 30], [-150, 40], [-80, 34]], true);
  weg('Ziegelgang', 5, 'gasse', [[-152, 200], [-106, 195], [-50, 190], [3, 205], [60, 196], [116, 198]], true);
  weg('Kleine Krämergasse', 5, 'gasse', [[-40, 60], [-46, 125], [-50, 190], RW(100.5)], true);
  weg('Lotsengang', 5, 'gasse', [[40, 60], [50, 128], [60, 196], RW(80)], true);
  weg('Nikolaigasse', 5, 'gasse', [[-88, 125], [-46, 125], [7, 130], [50, 128], [90, 130], [165, 128], [240, 132]], true);
  weg('Kapitänsgang', 5, 'gasse', [K(160), [164, -60], [165, 6], [160, 68], [165, 128], [175, 190], RW(62)], true);
  weg('Netzmachergang', 5, 'gasse', [K(360), [356, -59], [364, 10], [350, 70], RW(32)], true);
  weg('Fischbrücke', 5, 'gasse', [[300, 8], [364, 10], RW(20)], true);
  weg('Mühlengang', 5, 'gasse', [[300, 70], [350, 70]]);

  // ---- der Wallring rund um die Altstadt und die Bögen weiter draußen
  weg('Wallring', 14, 'ring', bogen(R_WALL, 0, 180, STRAHLEN));
  weg('Ostgürtel', 10, 'strasse', bogen(R_GUERTEL, 20, 70, STRAHLEN));
  weg('Westgürtel', 10, 'strasse', bogen(R_GUERTEL, 90, 155, STRAHLEN));
  weg('Am Bahnhof', 12, 'strasse', bogen(R_GUERTEL, 155, 180, STRAHLEN));
  weg('Lindenring', 10, 'strasse', bogen(R_MITTEL, 20, 70, STRAHLEN));
  weg('Südgürtel', 10, 'strasse', bogen(R_MITTEL, 90, 141, STRAHLEN));
  weg('Stadtring', 14, 'ring', bogen(R_RING, 0, 180, STRAHLEN));
  weg('Feldrain', 8, 'strasse', bogen(R_FELD, 44.4, 90, [60, 70, 78]));
  weg('Ahornweg', 8, 'strasse', bogen(R_FELD, 90, 135, [100.5, 106, 111, 120, 122.5]));
  weg('Am Stadtrand', 8, 'sack', bogen(R_RAND, 70, 115, [78, 90, 106]));

  // ---- die Strahlen: Straßen vom Wallring nach draußen
  weg('Möwenweg', 10, 'strasse', strahl(20, R_WALL, R_RING));
  weg('Dünenweg', 10, 'strasse', strahl(32, R_WALL, R_RING));
  weg('Lübecker Chaussee', 14, 'strasse', [...strahl(44.4, R_WALL, R_FELD), [660, 520], [716, 640]]);
  weg('Parkstraße', 10, 'strasse', strahl(70, R_WALL, R_FELD));
  weg('Südallee', 14, 'strasse', [...strahl(90, R_WALL, R_RAND), [0, 772]]);
  weg('Rosenweg', 10, 'strasse', strahl(100.5, R_GUERTEL, R_FELD));
  weg('Lindenallee', 10, 'strasse', strahl(111, R_WALL, R_FELD));
  weg('Krankenhausweg', 10, 'strasse', strahl(122.5, R_GUERTEL, R_FELD));
  weg('Hamburger Chaussee', 14, 'strasse', [...strahl(135, R_WALL, R_FELD), [-540, 500], [-600, 575], [-640, 596]]);
  weg('Lokschuppenweg', 10, 'strasse', strahl(141, R_GUERTEL, R_RING));
  weg('Bahnhofstraße', 12, 'strasse', strahl(155, R_WALL, R_GUERTEL));
  weg('Postgang', 10, 'strasse', strahl(168, R_WALL, R_GUERTEL));
  // kleine Wohnstraßen am Stadtrand, manche sind Sackgassen mit Wendeplatz
  weg('Kiebitzweg', 8, 'strasse', strahl(78, R_FELD, R_RAND));
  weg('Lerchenweg', 8, 'strasse', strahl(106, R_FELD, R_RAND));
  weg('Drosselgang', 8, 'sack', strahl(60, R_FELD, 796));
  weg('Finkenstieg', 8, 'sack', strahl(120, R_FELD, 800));

  // ---- der Sonnenhang im Osten: geschwungene Wohnstraßen
  weg('Strandallee', 10, 'strasse', [RW(7), [520, -50], [620, -40], [699, -30]], true);
  weg('Dünenring', 8, 'strasse', [[520, -50], [540, 20], [600, 60], [650, 30], [620, -40]], true);

  // ---- Werft und Gewerbegebiet im Westen (hinter der Bahn)
  weg('Industriestraße', 10, 'strasse', [[-680, -92], [-684, 60], [-680, 150], [-690, 320], [-660, 440], [-600, 575]], true);
  weg('Kranweg', 10, 'strasse', [[-826, 56], [-684, 60], [-545, 62]]);
  weg('Am Güterbahnhof', 10, 'strasse', [[-826, 152], [-680, 150], [-518, 150]]);
  weg('Hallenweg', 10, 'strasse', [[-826, 316], [-690, 320], [-540, 500]], true);

  // ---- die Autobahn im Süden mit ihren Auffahrten
  weg('Küstenautobahn', 22, 'autobahn', [[-846, 462], [-600, 610], [-300, 765], [0, 822], [300, 800], [600, 700], [866, 552]], true);
  weg('Auffahrt West', 7, 'rampe', [[0, 772], [-40, 792], [-110, 812]], true);
  weg('Auffahrt Ost', 7, 'rampe', [[0, 772], [40, 794], [120, 822]], true);
  return W;
}

// ---------------------------------------------------------------------------------------------
// Aus den Linien wird ein Netz: Wo sich zwei Straßen treffen oder kreuzen, entsteht eine Kreuzung (ein "Knoten").
// Die Stücke dazwischen heißen Kanten. Der Verkehr fährt später von Knoten zu Knoten.
// ---------------------------------------------------------------------------------------------
function verbinden(W) {
  // 1. Endet ein Weg ganz nah an einem anderen, wird sein Ende genau dorthin gezogen.
  for (const w of W) for (const ende of [0, 1]) {
    const p = ende ? w.pts.at(-1) : w.pts[0];
    let best = null;
    for (const o of W) {
      if (o === w) continue;
      for (let i = 0; i + 1 < o.pts.length; i++) { const q = fuss(p, o.pts[i], o.pts[i + 1]), d = weit(p, q); if (d < 16 && (!best || d < best.d)) best = { d, o, i, q }; }
    }
    if (!best) continue;
    const { o, i } = best; let q = best.q;
    if (weit(q, o.pts[i]) < 1) q = o.pts[i]; else if (weit(q, o.pts[i + 1]) < 1) q = o.pts[i + 1]; else o.pts.splice(i + 1, 0, q);
    w.pts[ende ? w.pts.length - 1 : 0] = q;
  }
  // 2. Wo sich zwei Wege kreuzen, bekommen beide dort einen Punkt.
  const neu = new Map(W.map(w => [w, []]));
  for (let a = 0; a < W.length; a++) for (let b = a + 1; b < W.length; b++) {
    const A = W[a].pts, B = W[b].pts;
    for (let i = 0; i + 1 < A.length; i++) for (let j = 0; j + 1 < B.length; j++) {
      const p = A[i], p2 = A[i + 1], q = B[j], q2 = B[j + 1];
      if (Math.max(p[0], p2[0]) < Math.min(q[0], q2[0]) - 0.01 || Math.min(p[0], p2[0]) > Math.max(q[0], q2[0]) + 0.01 || Math.max(p[1], p2[1]) < Math.min(q[1], q2[1]) - 0.01 || Math.min(p[1], p2[1]) > Math.max(q[1], q2[1]) + 0.01) continue;
      const rx = p2[0] - p[0], rz = p2[1] - p[1], sx = q2[0] - q[0], sz = q2[1] - q[1], n = rx * sz - rz * sx;
      if (Math.abs(n) < 1e-9) continue;
      const t = ((q[0] - p[0]) * sz - (q[1] - p[1]) * sx) / n, u = ((q[0] - p[0]) * rz - (q[1] - p[1]) * rx) / n;
      if (t < -1e-6 || t > 1 + 1e-6 || u < -1e-6 || u > 1 + 1e-6) continue;
      const X = [p[0] + rx * t, p[1] + rz * t];
      const eckeA = weit(X, p) < 1 ? i : weit(X, p2) < 1 ? i + 1 : -1, eckeB = weit(X, q) < 1 ? j : weit(X, q2) < 1 ? j + 1 : -1;
      const punkt = eckeA >= 0 ? A[eckeA] : eckeB >= 0 ? B[eckeB] : X;
      if (eckeA < 0) neu.get(W[a]).push([i, t, punkt]);
      if (eckeB < 0) neu.get(W[b]).push([j, u, punkt]); else B[eckeB] = punkt;
    }
  }
  for (const w of W) for (const [i, , p] of neu.get(w).sort((x, y) => y[0] - x[0] || y[1] - x[1])) w.pts.splice(i + 1, 0, p);
  // 3. Punkte, die fast an derselben Stelle liegen, werden zu einem einzigen Punkt.
  const haufen = [];
  for (const w of W) for (let i = 0; i < w.pts.length; i++) {
    const p = w.pts[i]; let h = haufen.find(h => weit(h.p, p) < 1.5);
    if (!h) haufen.push(h = { p: [p[0], p[1]], wege: new Set(), ende: false });
    w.pts[i] = h.p; h.wege.add(w); if (i === 0 || i === w.pts.length - 1) h.ende = true;
  }
  for (const w of W) w.pts = w.pts.filter((p, i) => i === 0 || p !== w.pts[i - 1]);
  // 4. Knoten und Kanten
  const knoten = [], kanten = [], nr = new Map();
  for (const h of haufen) if (h.wege.size > 1 || h.ende) { nr.set(h.p, knoten.length); knoten.push({ x: h.p[0], z: h.p[1], kanten: [] }); }
  for (const w of W) {
    w.L = [0]; for (let i = 1; i < w.pts.length; i++) w.L.push(w.L[i - 1] + weit(w.pts[i - 1], w.pts[i]));
    w.l = w.L.at(-1); w.kreuz = [];
    let von = null;
    w.pts.forEach((p, i) => {
      if (!nr.has(p)) return;
      const k = nr.get(p);
      w.kreuz.push({ s: w.L[i], k });
      if (von) { const e = { a: von.k, b: k, weg: w, s0: von.s, s1: w.L[i], l: w.L[i] - von.s, nr: kanten.length }; kanten.push(e); knoten[von.k].kanten.push(e); knoten[k].kanten.push(e); }
      von = { k, s: w.L[i] };
    });
  }
  // 5. Wie groß ist jede Kreuzung? r = so weit reicht sie (für alle Wege), rf = dasselbe nur für Straßen, auf denen Autos fahren.
  const faehrt = w => w.art !== 'gasse';
  for (const K of knoten) {
    const arme = K.kanten.map(e => { const s = e.a === knoten.indexOf(K) ? e.s0 + Math.min(6, e.l / 2) : e.s1 - Math.min(6, e.l / 2), o = ortAuf(e.weg, s), d = Math.hypot(o[0] - K.x, o[1] - K.z) || 1; return { dx: (o[0] - K.x) / d, dz: (o[1] - K.z) / d, b: e.weg.b, auto: faehrt(e.weg) }; });
    const radius = liste => {
      let r = 0;
      for (let i = 0; i < liste.length; i++) for (let j = i + 1; j < liste.length; j++) {
        const w = Math.acos(Math.max(-1, Math.min(1, liste[i].dx * liste[j].dx + liste[i].dz * liste[j].dz)));
        if (w > 2.7) continue;                                    // fast geradeaus: das ist keine Ecke
        r = Math.max(r, Math.max(liste[i].b, liste[j].b) / 2 / Math.tan(w / 2) + 1.5, Math.max(liste[i].b, liste[j].b) / 2 + 1.5);
      }
      return Math.min(26, r);
    };
    K.r = radius(arme); K.rf = radius(arme.filter(a => a.auto)); K.autos = arme.filter(a => a.auto).length; K.grad = arme.length;
  }
  for (const w of W) for (const q of w.kreuz) { q.r = knoten[q.k].r; q.rf = knoten[q.k].rf; q.autos = knoten[q.k].autos; q.grad = knoten[q.k].grad; }
  return { knoten, kanten };
}

// ---------------------------------------------------------------------------------------------
// Welches Viertel ist an einer Stelle? Danach richtet sich, welche Häuser dort stehen.
// ---------------------------------------------------------------------------------------------
export function viertel(x, z) {
  if (z < UFER) return 'wasser';
  if (imRechteck(x, z, FLEET, 1)) return 'fleet';
  if (x > GLEIS[0] - 4 && x < GLEIS[2] + 4 && z > GLEIS[1] - 6) return 'bahn';
  if (x < GLEIS[0]) return z < -20 ? 'werft' : 'gewerbe';
  const [r, g] = polar(x, z);
  if (z < -68 && x > -485 && x < 645) return 'speicher';
  if (r < R_WALL - 8) return x > -80 && x < 0 && z > -60 && z < 0 ? 'markt' : 'alt';
  if (r < R_WALL + 34) return 'wall';
  if (g > 71.5 && g < 88.5 && r > R_WALL + 34 && r < R_RING - 12) return 'park';
  if (x < -404 && r < R_GUERTEL + 30 && z < 135) return 'bahnhof';
  if (r < R_RING) return r < 505 ? 'city' : g < 66 ? 'wohnblock' : g > 118 ? 'city' : 'reihe';
  return 'einzel';
}
export const VIERTEL_NAME = { alt: 'Altstadt', markt: 'Marktplatz', city: 'Innenstadt', speicher: 'Alter Hafen', werft: 'Werft', gewerbe: 'Gewerbegebiet Nord', bahn: 'Bahn', bahnhof: 'Bahnhofsviertel',
  wohnblock: 'Fleetviertel', reihe: 'Südstadt', einzel: 'Sonnenhang', park: 'Stadtpark', wall: 'Wallanlagen', fleet: 'Fleet', wasser: 'Hafen' };

// ---------------------------------------------------------------------------------------------
// Besondere Häuser. Die ersten vier stehen seit Tag 1 an genau diesen Stellen (die Geschichte kennt sie).
//   r = Grundriss (fest)  ODER  um = [x, z] ungefähre Stelle und gr = [Breite, Tiefe]: dann sucht der Plan selbst einen freien Platz
//   h = Höhe, stil = Fassade, dach = Farbe oder null (flach), frei = Fläche, die frei bleibt,
//   bild = Zeichen für die Karte, turm = [x, z, Breite, Höhe] für einen Turm mit Spitze (bei "um": [dx, dz, Breite, Höhe] von der Mitte aus)
// ---------------------------------------------------------------------------------------------
export const BESONDERE = [
  { r: [25, -22, 55, -8], h: 8, stil: 'klinker', dach: null, schild: 'Polizeiwache', bild: '🚓', frei: [22, -24, 58, -5], farbe: '#f2f2f2' },
  { r: [-55, 38, -32, 52], h: 5, stil: 'putz', farbe: '#ffd98a', dach: '#b8553a', schild: 'Kita Sonnenhang', bild: '🧸', frei: [-58, 36, -10, 55] },
  { r: [-28, 40, -14, 52], h: 6.5, stil: 'backstein', dach: '#8a4a3a', schild: 'Bäckerei Kruse', bild: '🥐', laden: true },
  { r: [52, 18, 73, 42], h: 11, stil: 'sandstein', dach: '#5a6a62', schild: 'Stadtmuseum', bild: '🏛️', frei: [48, 16, 75, 44] },
  // die anderen Häuser der Altstadt
  { r: [-150, -50, -92, -18], h: 13, stil: 'backstein', dach: '#3f6b5a', schild: 'Rathaus', bild: '🏰', turm: [-121, -34, 9, 34], treppe: true },
  { r: [104, 82, 152, 108], h: 17, stil: 'backstein', dach: '#3f6b5a', schild: 'Nikolaikirche', bild: '⛪', turm: [101.5, 95, 12, 52], first: 'x', frei: [93, 78, 155, 121] },
  { r: [90, -50, 120, -34], h: 12, stil: 'backstein', dach: '#7a3a2c', schild: 'Gildehaus der Fischer', bild: '⚓', treppe: true, first: 'z' },
  { r: [-70, 8, -54, 20], h: 9, stil: 'putz', farbe: '#ffe3ea', dach: '#a8553c', schild: 'Eisdiele', bild: '🍦', laden: true, first: 'z' },
  { r: [311, 78, 336, 92], h: 16, stil: 'putz', farbe: '#e9eef2', dach: null, schild: 'Fleetufer 7 – hier wohnst du', bild: '🏠' },
  { r: [600, -94, 630, -70], h: 7, stil: 'backstein', dach: '#b8553a', schild: 'Seenotretter', bild: '🛟', frei: [596, -95, 634, -62], first: 'z' },
  { um: [-210, 14], gr: [28, 15], h: 12, stil: 'sandstein', dach: '#5a6a62', schild: 'Stadtarchiv', bild: '📜' },
  { um: [-128, 96], gr: [14, 13], h: 10, stil: 'backstein', dach: '#7a3a2c', schild: 'Antiquariat', bild: '📚', laden: true, first: 'z' },
  // draußen vor dem Wallring
  { um: [-436, 78], gr: [28, 62], h: 12, stil: 'backstein', dach: '#5a4a44', schild: 'Bahnhof', bild: '🚉', turm: [0, 0, 8, 24], platz: 'pflaster' },
  { um: [-398, 156], gr: [14, 40], h: 4.5, stil: 'modern', dach: null, schild: 'Busbahnhof · Schließfächer', bild: '🚌', farbe: '#dfe6ea', platz: 'asphalt', ost: 34, bus: true },
  { um: [-262, 408], gr: [48, 26], h: 9, stil: 'klinker', dach: null, schild: 'Feuerwache', bild: '🚒', farbe: '#d9644a', platz: 'asphalt', vor: 14 },
  { um: [-120, 372], gr: [50, 32], h: 21, stil: 'modern', dach: null, schild: 'Krankenhaus', bild: '🏥', farbe: '#f4f6f6', platz: 'gruen' },
  { um: [468, 196], gr: [52, 22], h: 11, stil: 'klinker', dach: null, schild: 'Schule am Sonnenhang', bild: '🏫', farbe: '#f0d9a8', platz: 'pflaster', vor: 16 },
  { um: [560, 150], gr: [54, 28], h: 6.5, stil: 'halle', dach: null, schild: 'Supermarkt', bild: '🛒', farbe: '#f2f2ee', platz: 'asphalt', vor: 24, parkplatz: true },
  { um: [392, 372], gr: [58, 24], h: 13, stil: 'putz', farbe: '#f6e3c4', dach: '#a8553c', schild: 'Seniorenheim Abendsonne', bild: '🌻', first: 'x', platz: 'gruen' },
];
// Orte ohne Haus, die auf der Karte stehen sollen
export const KARTEN_ORTE = [
  { x: -40, z: -30, name: 'Marktplatz', bild: '🧺' }, { x: 108, z: 420, name: 'Stadtpark', bild: '🌳' },
  { x: 0, z: -104, name: 'Alter Hafen', bild: '⛵' }, { x: -700, z: 230, name: 'Gewerbegebiet Nord', bild: '🏭' },
  { x: -650, z: -60, name: 'Werft', bild: '🏗️' }, { x: 720, z: -330, name: 'Leuchtturminsel', bild: '🗼' },
  { x: 0, z: 800, name: 'Autobahn', bild: '🛣️' },
];
// Stellen, an denen die Geschichte etwas braucht: dort parkt kein fremdes Auto.
const KEIN_PARKEN = [[-44, 58, 26], [80, 30, 22], [40, 0, 26], [-40, 0, 20]];

// Farben zum Einfärben der Fassaden
const PASTELL = ['#f4ead6', '#efdcc0', '#e3ecef', '#f3d9cf', '#e2ecd2', '#ece4f0', '#fff3d6', '#dfe6ea', '#f6e0b8', '#e9d2c0'];
const BACKSTEIN = ['#ffffff', '#f0e4dc', '#e2d0c6', '#fff2e6'];
const DACH_ROT = ['#a8452f', '#b5553a', '#8f3f2e', '#9c4a36', '#7c3a2e'], DACH_GRAU = ['#4c5258', '#5a5f66', '#3f4448'];

// So sehen die Häuser in jedem Viertel aus (alle Zahlen: von … bis).
//   tief/breit = Maße · stock = Stockwerke · garten = Abstand zum Gehweg · luecke = Abstand zum Nachbarn · vorn = wie oft der Giebel zur Straße zeigt
const BAU = {
  alt: { tief: [9.5, 12], breit: [6, 10], stock: [3, 4], stile: ['backstein', 'backstein', 'putz', 'dunkel'], dach: 'giebel', laden: 0.45, vorn: 0.6, garten: 0 },
  city: { tief: [13, 15], breit: [14, 22], stock: [4, 6], stile: ['putz', 'putz', 'backstein', 'modern', 'sandstein'], dach: 'flach', laden: 0.6, garten: 0 },
  reihe: { tief: [10, 10], breit: [7, 8.5], stock: [2, 2], stile: ['backstein', 'putz', 'putz'], dach: 'giebel', laden: 0, vorn: 0, garten: 3 },
  speicher: { tief: [15, 17], breit: [16, 24], stock: [4, 6], stile: ['speicher'], dach: 'giebel', laden: 0, vorn: 1, garten: 0 },
  einzel: { tief: [8.5, 9.5], breit: [9, 11.5], stock: [1, 1], stile: ['putz', 'putz', 'backstein'], dach: 'giebel', laden: 0, vorn: 0.4, garten: 5, luecke: [7, 12] },
  wohnblock: { tief: [13, 13], breit: [34, 52], stock: [4, 6], stile: ['modern', 'putz', 'modern'], dach: 'flach', laden: 0, garten: 7, luecke: [14, 22] },
  gewerbe: { tief: [20, 32], breit: [28, 46], stock: [2, 2], stile: ['halle'], dach: 'flach', laden: 0, garten: 8, luecke: [10, 18] },
};
BAU.markt = BAU.alt; BAU.werft = BAU.gewerbe; BAU.bahnhof = BAU.city;

function baue() {
  const w = wuerfel(1326);
  const zw = (a, b) => a + w() * (b - a), aus = l => l[Math.floor(w() * l.length)];
  const P = { wege: wegeListe(), haeuser: [], gruen: [], hof: [], wasser: [FLEET], teiche: [], sperre: [], baeume: [], laternen: [], parker: [], deko: [], gleise: [], gelaender: [], bruecken: [], wendeplatz: [] };
  Object.assign(P, verbinden(P.wege));

  // ---- Suchhilfe: In welchem Kästchen (60 m) liegen welche Straßenstücke? So findet man schnell die Straßen in der Nähe.
  const KAST = 60, stueckIn = new Map();
  for (const W of P.wege) for (let i = 0; i + 1 < W.pts.length; i++) {
    const a = W.pts[i], b = W.pts[i + 1];
    for (let cx = Math.floor(Math.min(a[0], b[0]) / KAST); cx <= Math.floor(Math.max(a[0], b[0]) / KAST); cx++) for (let cz = Math.floor(Math.min(a[1], b[1]) / KAST); cz <= Math.floor(Math.max(a[1], b[1]) / KAST); cz++) {
      const k = cx * 1000 + cz; if (!stueckIn.has(k)) stueckIn.set(k, []); stueckIn.get(k).push([W, i]);
    }
  }
  // Wie weit ist es von hier bis zum Rand des nächsten Gehwegs? (Minus = man steht auf Straße oder Gehweg.) Zurück: [Abstand, Weg, s, Abstand zur Mittellinie]
  const strasseNah = (x, z) => {
    let best = [1e9, null, 0, 1e9];
    const cx = Math.floor(x / KAST), cz = Math.floor(z / KAST);
    for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) for (const [W, n] of stueckIn.get(i * 1000 + j) || []) {
      const q = fuss([x, z], W.pts[n], W.pts[n + 1]), m = Math.hypot(x - q[0], z - q[1]), d = m - W.b / 2 - W.geh - (W.art === 'autobahn' ? 26 : W.art === 'rampe' ? 12 : 0);
      if (d < best[0]) best = [d, W, W.L[n] + weit(q, W.pts[n]), m];
    }
    return best;
  };
  P.strasseNah = strasseNah;

  // ---- Brücken: Wo eine Straße über das Fleet oder die Gleise führt, bleibt der Weg frei.
  const luecken = band => {
    const l = [];
    for (const W of P.wege) {
      const hw = W.b / 2 + W.geh; let z0 = 1e9, z1 = -1e9;
      const fertig = () => { if (z1 >= z0) l.push([z0 - hw * (z1 - z0 > 6 ? 1.5 : 1) - 2.5, z1 + hw * (z1 - z0 > 6 ? 1.5 : 1) + 2.5]); z0 = 1e9; z1 = -1e9; };      // schräge Brücken brauchen etwas mehr Platz
      for (let s = 0; s <= W.l; s += 1.5) { const [x, z] = ortAuf(W, s); if (x > band[0] && x < band[2] && z > band[1] - hw && z < band[3] + hw) { z0 = Math.min(z0, z); z1 = Math.max(z1, z); } else fertig(); }
      fertig();
    }
    l.sort((a, b) => a[0] - b[0]);
    const eins = [];
    for (const q of l) { if (eins.length && q[0] <= eins.at(-1)[1] + 2) eins.at(-1)[1] = Math.max(eins.at(-1)[1], q[1]); else eins.push([...q]); }
    return eins;
  };
  const zwischen = (band, l, bis) => { const st = []; let z = band[1]; for (const q of l) { if (q[0] > z) st.push([z, Math.min(q[0], bis)]); z = Math.max(z, q[1]); } if (z < bis) st.push([z, bis]); return st.filter(q => q[1] - q[0] > 0.5); };
  P.bruecken = luecken(FLEET).filter(q => q[0] < FLEET[3]).map(q => [Math.max(q[0], UFER), Math.min(q[1], FLEET[3])]);
  for (const [z0, z1] of zwischen([FLEET[0], UFER, FLEET[2], FLEET[3]], P.bruecken, FLEET[3])) {
    P.sperre.push([FLEET[0] - 0.8, z0, FLEET[2] + 0.8, z1]);
    P.gelaender.push([FLEET[0] - 0.6, z0, FLEET[0] - 0.6, z1], [FLEET[2] + 0.6, z0, FLEET[2] + 0.6, z1]);
    if (z0 > UFER + 1) P.gelaender.push([FLEET[0] - 0.6, z0, FLEET[2] + 0.6, z0]);
    P.gelaender.push([FLEET[0] - 0.6, z1, FLEET[2] + 0.6, z1]);
    if (z1 - z0 > 30) { if (w() < 0.8) P.deko.push({ art: 'boot', x: FLEET[0] + 5, z: zw(z0 + 8, z1 - 8), dreh: 0 }); if (w() < 0.6) P.deko.push({ art: 'boot', x: FLEET[2] - 5, z: zw(z0 + 8, z1 - 8), dreh: Math.PI }); }
  }
  P.uebergaenge = luecken(GLEIS).filter(q => q[0] < GROSS[3]);
  for (const [z0, z1] of zwischen(GLEIS, P.uebergaenge, GROSS[3] + 10)) P.sperre.push([GLEIS[0] + 2, z0, GLEIS[2] - 2, z1]);
  for (const x of [-481, -474, -467, -460]) P.gleise.push({ x, z1: GLEIS[1], z2: GLEIS[3] });
  for (let z = 0; z < 700; z += zw(70, 130)) if (!P.uebergaenge.some(q => z > q[0] - 40 && z < q[1] + 60)) P.deko.push({ art: 'waggons', x: aus([-481, -474, -460]), z, n: 2 + Math.floor(w() * 3) });

  // ---- die besonderen Häuser: feste stehen, wo sie stehen; die anderen suchen sich einen freien Platz in der Nähe
  const frei = [[-75, -55, -5, -5]];      // der Marktplatz
  const besetzt = [];
  const platzFrei = r => {
    if (besetzt.some(q => r[0] < q[2] + 8 && r[2] > q[0] - 8 && r[1] < q[3] + 8 && r[3] > q[1] - 8)) return false;
    for (let x = r[0]; x <= r[2] + 0.01; x += (r[2] - r[0]) / Math.ceil((r[2] - r[0]) / 5)) for (let z = r[1]; z <= r[3] + 0.01; z += (r[3] - r[1]) / Math.ceil((r[3] - r[1]) / 5)) {
      const v = viertel(x, z);
      if (v === 'wasser' || v === 'fleet' || v === 'bahn' || v === 'wall' || v === 'park' || strasseNah(x, z)[0] < 1.5) return false;
    }
    return true;
  };
  for (const b of BESONDERE) {
    if (!b.r) {
      const [bb, tt] = b.gr, vor = b.vor || 0, ost = b.ost || 0;
      for (let d = 0; d < 180 && !b.r; d += 3) for (let k = 0; k < (d ? 24 : 1) && !b.r; k++) {
        const x = Math.round(b.um[0] + Math.cos(k * 0.2618) * d), z = Math.round(b.um[1] + Math.sin(k * 0.2618) * d);
        if (platzFrei([x - bb / 2 - 3, z - tt / 2 - 3, x + bb / 2 + ost + 3, z + tt / 2 + vor + 3])) b.r = [x - bb / 2, z - tt / 2, x + bb / 2, z + tt / 2];
      }
      if (!b.r) { b.r = [b.um[0] - bb / 2, b.um[1] - tt / 2, b.um[0] + bb / 2, b.um[1] + tt / 2]; b.eng = true; }
      if (b.turm) b.turm = [(b.r[0] + b.r[2]) / 2 + b.turm[0], (b.r[1] + b.r[3]) / 2 + b.turm[1], b.turm[2], b.turm[3]];
      const hofR = [b.r[0] - 3, b.r[1] - 3, b.r[2] + ost + 3, b.r[3] + vor + 3];
      b.frei = hofR;
      if (b.platz === 'gruen') P.gruen.push(hofR); else if (b.platz) P.hof.push({ r: hofR, art: b.platz });
      if (b.parkplatz) for (const dz of [8, 19]) for (let x = b.r[0] + 3; x < b.r[2] - 2; x += 2.9) if (w() < 0.6) P.parker.push({ x, z: b.r[3] + dz, h: 0, art: Math.floor(w() * 4), farbe: Math.floor(w() * 8), platz: true });
      if (b.bus) for (const dx of [8, 18, 28]) P.deko.push({ art: 'bussteig', x: b.r[2] + dx, z: (b.r[1] + b.r[3]) / 2, lang: 34 });
    }
    besetzt.push(b.frei || b.r);
    if (b.frei) frei.push(b.frei);
  }

  // ---- Suchhilfe für Häuser (damit keines in einem anderen steht)
  const HK = 40, hausIn = new Map();
  const merken = h => { for (let i = Math.floor(h.r[0] / HK); i <= Math.floor(h.r[2] / HK); i++) for (let j = Math.floor(h.r[1] / HK); j <= Math.floor(h.r[3] / HK); j++) { const k = i * 1000 + j; if (!hausIn.has(k)) hausIn.set(k, []); hausIn.get(k).push(h); } };
  const hausBei = (x, z, rand) => { const l = hausIn.get(Math.floor(x / HK) * 1000 + Math.floor(z / HK)); return !!l && l.some(h => { const dx = x - h.x, dz = z - h.z, c = Math.cos(h.dreh), s = Math.sin(h.dreh); return Math.abs(dx * c - dz * s) < h.b / 2 + rand && Math.abs(dx * s + dz * c) < h.t / 2 + rand; }); };
  const VERBOTEN = { wasser: 1, fleet: 1, bahn: 1, wall: 1, park: 1 };
  // Passt ein Haus an diese Stelle? Es darf nicht auf Straße, Gehweg, Wasser, Gleisen, einem Platz oder einem anderen Haus stehen.
  function passt(h) {
    h.ecken = eckenVon(h); h.r = huelle(h.ecken);
    if (h.r[0] < GROSS[0] + 2 || h.r[2] > GROSS[2] - 2 || h.r[3] > GROSS[3] - 2 || h.r[1] < KAI_Z + 6) return false;
    const E = h.ecken, proben = [[h.x, h.z]];
    for (let k = 0; k < 4; k++) { const a = E[k], b = E[(k + 1) % 4], n = Math.ceil(weit(a, b) / 3.5); for (let i = 0; i < n; i++) proben.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]); }
    for (const [x, z] of proben) { if (VERBOTEN[viertel(x, z)] || strasseNah(x, z)[0] < -0.25 || frei.some(f => imRechteck(x, z, f, 0.5))) return false; }
    if (BESONDERE.some(b => h.r[0] < b.r[2] + 1 && h.r[2] > b.r[0] - 1 && h.r[1] < b.r[3] + 1 && h.r[3] > b.r[1] - 1)) return false;
    const eng = eckenVon(h, -0.2);
    for (let i = Math.floor(h.r[0] / HK); i <= Math.floor(h.r[2] / HK); i++) for (let j = Math.floor(h.r[1] / HK); j <= Math.floor(h.r[3] / HK); j++)
      for (const o of hausIn.get(i * 1000 + j) || []) if (ueberlappt(eng, o.ecken)) return false;
    return true;
  }
  // Ein Haus fertig einrichten (Stockwerke, Fassade, Dach …) und in den Plan eintragen
  function einziehen(h, c) {
    const stock = Math.round(zw(c.stock[0], c.stock[1])), stil = aus(c.stile), typ = h.typ;
    const backstein = stil === 'backstein' || stil === 'dunkel' || stil === 'speicher';
    Object.assign(h, { seite: 's', stil, stock, laden: w() < c.laden,
      h: typ === 'einzel' ? zw(5.2, 6.4) : typ === 'gewerbe' ? zw(7.5, 11) : 3.5 + stock * 3.05 + (typ === 'speicher' ? 1 : 0),
      farbe: typ === 'gewerbe' ? aus(['#e9ecee', '#cfd8de', '#f0ede4', '#c9d6c8', '#d8dde6']) : backstein ? aus(BACKSTEIN) : aus(PASTELL) });
    if (c.dach === 'giebel') {
      const vorn = w() < c.vorn;       // Giebel zur Straße: der First läuft von vorn nach hinten ('z'), sonst die Straße entlang ('x')
      h.dach = { art: 'giebel', first: vorn ? 'z' : 'x', h: typ === 'reihe' ? 3.6 : typ === 'einzel' ? zw(3, 4.2) : zw(4, 6), farbe: typ === 'speicher' ? aus(DACH_GRAU) : aus(typ === 'einzel' && w() < 0.3 ? DACH_GRAU : DACH_ROT) };
      h.treppe = vorn && typ === 'alt' && w() < 0.4;
      h.schornstein = w() < 0.6;
    } else h.dach = { art: 'flach', farbe: aus(DACH_GRAU) };
    P.haeuser.push(h); merken(h);
  }
  // ---- Häuser an jeder Straße entlang, links und rechts. Erst die großen Straßen, dann die Gassen.
  const hausTyp = v => v === 'markt' ? 'alt' : v === 'werft' ? 'gewerbe' : v === 'bahnhof' ? 'city' : v;
  for (const W of [...P.wege].sort((a, b) => b.b - a.b)) {
    if (W.art === 'autobahn' || W.art === 'rampe') continue;
    for (const seite of [-1, 1]) {
      let s = 2;
      while (s < W.l - 2) {
        const [x0, z0, tx0, tz0] = ortAuf(W, s + 4), v = viertel(x0 - tz0 * seite * (W.b / 2 + W.geh + 7), z0 + tx0 * seite * (W.b / 2 + W.geh + 7)), c = BAU[v];
        if (!c) { s += 5; continue; }
        let br = zw(c.breit[0], c.breit[1]); const t = zw(c.tief[0], c.tief[1]);
        const [mx, mz, tx, tz] = ortAuf(W, s + br / 2), nx = -tz * seite, nz = tx * seite, ab = W.b / 2 + W.geh + c.garten + t / 2 + 0.05;
        const h = { x: mx + nx * ab, z: mz + nz * ab, b: br, t, dreh: Math.atan2(-nx, -nz), typ: hausTyp(v) };
        if (!passt(h)) { s += 2.2; continue; }
        einziehen(h, c);
        if (c.garten && h.typ !== 'gewerbe') P.gruen.push({ haus: h, rand: h.typ === 'wohnblock' ? 7 : 4.5 });
        if (h.typ === 'gewerbe') { P.hof.push({ haus: h, rand: 7, art: 'asphalt' }); if (w() < 0.5) P.deko.push({ art: w() < 0.5 ? 'kiste_holz' : 'fass', x: h.x - nx * (t / 2 + 2.5), z: h.z - nz * (t / 2 + 2.5), dreh: w() * 6 }); }
        s += br + (c.luecke ? zw(c.luecke[0], c.luecke[1]) : 0);
      }
    }
  }
  // Hinterhäuser: In der Altstadt stehen auch in den Höfen noch Häuser, dicht an dicht.
  for (let i = 0; i < 2600; i++) {
    const x = zw(-330, 420), z = zw(-90, 280), v = viertel(x, z);
    if (v !== 'alt') continue;
    const n = strasseNah(x, z); if (!n[1] || n[0] < 10 || n[0] > 60) continue;
    const o = ortAuf(n[1], n[2]), c = BAU.alt;
    const h = { x, z, b: zw(6, 10), t: zw(7, 10), dreh: Math.atan2(o[2], o[3]) + Math.floor(w() * 4) * Math.PI / 2, typ: 'alt' };
    if (passt(h)) { einziehen(h, c); h.laden = false; h.hinten = true; }
  }

  // ---- Bäume
  const baumOk = (x, z, rand = 1.5) => !frei.some(f => imRechteck(x, z, f)) && !hausBei(x, z, rand) && !BESONDERE.some(b => imRechteck(x, z, b.r, 1.5));
  const baum = (x, z, klein, art) => { if (baumOk(x, z)) P.baeume.push({ x, z, h: klein ? zw(5, 7) : zw(7, 10), art: art || 'laub' }); };
  // in Höfen, Gärten, auf dem Wall und im Park (überall, wo kein Haus und keine Straße ist)
  for (let i = 0; i < 5200; i++) {
    const x = zw(GROSS[0] + 6, GROSS[2] - 6), z = zw(KAI_Z + 12, GROSS[3] - 8), v = viertel(x, z);
    if (v === 'wasser' || v === 'fleet' || v === 'bahn' || v === 'markt' || v === 'speicher' || v === 'bahnhof') continue;
    const d = strasseNah(x, z)[0];
    if (d < (v === 'wall' || v === 'park' ? 2.5 : 5)) continue;
    const dicht = v === 'park' ? 0.5 : v === 'wall' ? 0.3 : v === 'einzel' ? 0.5 : v === 'alt' ? 0.14 : v === 'gewerbe' || v === 'werft' ? 0.1 : 0.34;
    if (w() > dicht || !baumOk(x, z, 2.5)) continue;
    P.baeume.push({ x, z, h: v === 'park' || v === 'wall' ? zw(7.5, 11) : zw(5, 8), art: w() < (v === 'einzel' || v === 'park' ? 0.2 : 0.06) ? 'fichte' : 'laub' });
  }
  // Die Wallanlagen: ein grüner Gürtel mit alten Bäumen außen am Wallring, und viele Bäume im Stadtpark
  for (let g = 3; g < 178; g += 1.15) for (const r of [R_WALL + 13, R_WALL + 21, R_WALL + 29]) { const [x, z] = pol(g + zw(-0.4, 0.4), r + zw(-2.5, 2.5)); if (viertel(x, z) === 'wall' && strasseNah(x, z)[0] > 2.5 && w() < 0.8) baum(x, z, false, w() < 0.1 ? 'fichte' : 'laub'); }
  for (let i = 0; i < 260; i++) { const [x, z] = pol(zw(72, 88), zw(R_WALL + 40, R_RING - 16)); if (strasseNah(x, z)[0] > 3) baum(x, z, false, w() < 0.2 ? 'fichte' : 'laub'); }
  // Der Stadtpark: zwei Teiche, Wege und Bänke
  P.teiche.push({ x: 88, z: 372, rx: 22, rz: 15 }, { x: 118, z: 470, rx: 15, rz: 11 });
  P.sperre.push([70, 360, 106, 384], [106, 461, 130, 479]);
  P.hof.push({ r: [20, 418, 196, 421], art: 'weg' }, { r: [104, 300, 107, 520], art: 'weg' });
  for (const sx of [-1, 1]) P.deko.push({ art: 'bank', x: 105 + sx * 16, z: 416.5, dreh: 0 }, { art: 'muelltonne', x: 105 + sx * 19, z: 416.8, dreh: 0 });
  P.baeume = P.baeume.filter(b => !P.teiche.some(t => Math.hypot((b.x - t.x) / (t.rx + 3), (b.z - t.z) / (t.rz + 3)) < 1) && !(b.z > 416 && b.z < 423 && b.x > 18 && b.x < 198) && !(b.x > 102 && b.x < 109 && b.z > 298 && b.z < 522));
  // Bäume, die es schon an Tag 1 gab: am Rand vom Markt, hinter der Kita, am Museum
  const w2 = wuerfel(77);
  for (let i = 0; i < 14; i++) P.baeume.push({ x: -72 + w2() * 64, z: -52 + (i % 2 ? 0 : 44) + w2() * 3, h: 7, art: 'laub' });
  for (let i = 0; i < 6; i++) P.baeume.push({ x: -56 + i * 4.2, z: 35.5, h: 6, art: 'laub' });
  for (let i = 0; i < 5; i++) P.baeume.push({ x: 50, z: 19 + i * 5.5, h: 6.5, art: 'laub' });

  // ---- an jeder Straße: Laternen, Bäume, parkende Autos (immer mit Abstand zu den Kreuzungen)
  const anKreuzung = (W, s, rand) => W.kreuz.some(q => Math.abs(q.s - s) < q.r + rand);
  const aufBand = (x, z) => imRechteck(x, z, FLEET, 4) || (x > GLEIS[0] - 3 && x < GLEIS[2] + 3 && z > GLEIS[1]);
  for (const W of P.wege) {
    if (W.art === 'autobahn' || W.art === 'rampe') continue;
    const neben = (s, seite, ab) => { const [x, z, tx, tz] = ortAuf(W, s); return [x - tz * seite * ab, z + tx * seite * ab, tx, tz]; };
    let n = 0;
    for (let s = 9; s < W.l - 5; s += W.art === 'gasse' ? 34 : 27, n++) {
      const seite = n % 2 ? 1 : -1, [x, z, tx, tz] = neben(s, seite, W.b / 2 + 0.6);
      if (anKreuzung(W, s, 2) || aufBand(x, z) || z < KAI_Z - 2) continue;
      const v = viertel(x, z), alt = W.art === 'gasse' || W.art === 'kai' || v === 'alt' || v === 'markt' || v === 'speicher';
      P.laternen.push({ x, z, alt, dreh: Math.atan2(tz * seite, -tx * seite) });       // der Arm der Laterne zeigt zur Straße
    }
    if (W.art === 'gasse' || W.art === 'kai') continue;
    for (const seite of [-1, 1]) for (let s = 14 + (seite > 0 ? 6 : 0); s < W.l - 8; s += 13.5) {
      const [x, z] = neben(s, seite, W.b / 2 + 1.15), v = viertel(x, z);
      if (anKreuzung(W, s, 5) || aufBand(x, z) || v === 'alt' || v === 'markt' || v === 'speicher' || v === 'gewerbe' || v === 'werft' || v === 'bahn' || v === 'wasser') continue;
      if (baumOk(x, z, 1)) P.baeume.push({ x, z, h: zw(6.5, 9), art: 'laub', strasse: true });
    }
    if (W.b > 10) continue;
    for (const seite of [-1, 1]) for (let s = 6; s < W.l - 6; s += 5.9) {
      const [x, z, tx, tz] = neben(s, seite, W.b / 2 - 1.15), v = viertel(x, z);
      if (v === 'markt' || w() > (v === 'alt' || v === 'speicher' ? 0.13 : 0.2) || anKreuzung(W, s, 7) || aufBand(x, z) || KEIN_PARKEN.some(k => Math.hypot(x - k[0], z - k[1]) < k[2])) continue;
      P.parker.push({ x, z, h: Math.atan2(tx * seite, tz * seite), art: Math.floor(w() * 4), farbe: Math.floor(w() * 8) });      // rechts am Rand, in Fahrtrichtung
    }
  }
  // Wendeplätze am Ende der Sackgassen
  for (const W of P.wege) if (W.art === 'sack') for (const s of [0, W.l]) { const q = W.kreuz.find(q => q.s === s); if (q && q.grad === 1) P.wendeplatz.push({ x: ortAuf(W, s)[0], z: ortAuf(W, s)[1], r: 10 }); }

  // ---- Kleinkram am Kai: Kisten, Fässer, Rettungsringe, Fischkisten, Stege, der Kran der Werft
  for (let x = -471; x < 635; x += zw(9, 22)) {
    if (x > 236 && x < 304) continue;
    P.deko.push({ art: aus(['kiste_holz', 'holzfass', 'fass', 'fischkiste', 'fischkiste', 'rettungsring', 'kiste_holz']), x, z: UFER + zw(1.4, 2.6), dreh: w() * 6 });
  }
  for (let x = -440; x < 620; x += 96) if (x < 220 || x > 320) P.deko.push({ art: 'steg', x, z: UFER, lang: zw(34, 52) });
  P.deko.push({ art: 'kran', x: -600, z: UFER + 3, dreh: 0 }, { art: 'kran', x: -720, z: UFER + 8, dreh: 0 });
  // Mülltonnen, Bänke und Blumenkübel vor den Häusern in der Altstadt und Innenstadt
  for (const h of P.haeuser) {
    if ((h.typ !== 'alt' && h.typ !== 'city') || h.hinten || w() > 0.16) continue;
    const x = h.x + Math.sin(h.dreh) * (h.t / 2 + 0.8), z = h.z + Math.cos(h.dreh) * (h.t / 2 + 0.8);
    P.deko.push({ art: aus(['muelltonne', 'pflanzkuebel', 'pflanzkuebel', 'bank', 'tafel', 'stromkasten']), x, z, dreh: h.dreh });
  }
  P.deko.push({ art: 'brunnen', x: -40, z: -30 });
  P.hof.push({ r: [-72, -52, -8, -8], art: 'kopfstein' });

  // ---- die besonderen Häuser eintragen
  for (const b of BESONDERE) {
    const r = b.r, h = { x: (r[0] + r[2]) / 2, z: (r[1] + r[3]) / 2, b: r[2] - r[0], t: r[3] - r[1], dreh: 0, seite: 's', stil: b.stil, stock: Math.max(1, Math.round((b.h - 3.5) / 3.05)), h: b.h, farbe: b.farbe || '#ffffff', typ: 'besonders', laden: !!b.laden,
      dach: b.dach ? { art: 'giebel', first: b.first || (r[2] - r[0] > r[3] - r[1] ? 'x' : 'z'), h: Math.min(7, (b.first === 'z' ? r[2] - r[0] : Math.min(r[2] - r[0], r[3] - r[1])) * 0.3), farbe: b.dach } : { art: 'flach', farbe: DACH_GRAU[1] },
      treppe: !!b.treppe, schild: b.schild, turm: b.turm, bild: b.bild };
    h.ecken = eckenVon(h); h.r = r;
    P.haeuser.push(h);
    if (b.turm) { const [x, z, br] = b.turm; P.sperre.push([x - br / 2, z - br / 2, x + br / 2, z + br / 2]); }
  }
  P.baeume = P.baeume.filter(b => !BESONDERE.some(s => imRechteck(b.x, b.z, s.r, 1.5) || (s.turm && Math.hypot(b.x - s.turm[0], b.z - s.turm[1]) < s.turm[2])));

  // ---- Was im Weg steht (für das Laufen und Fahren). Jedes Hindernis ist ein Rechteck [x1, z1, x2, z2].
  // Steht es schräg, hängt daran noch "o": Mitte, halbe Breite, halbe Tiefe und die Drehung (c, s).
  const schraeg = (x, z, hb, ht, dreh) => {
    if (Math.abs(Math.sin(dreh) * Math.cos(dreh)) < 0.001) { const quer = Math.abs(Math.sin(dreh)) > 0.5, a = quer ? ht : hb, b = quer ? hb : ht; return [x - a, z - b, x + a, z + b]; }
    const E = eckenVon({ x, z, b: hb * 2, t: ht * 2, dreh }), q = huelle(E);
    q.o = { x, z, hb, ht, c: Math.cos(dreh), s: Math.sin(dreh) };
    return q;
  };
  P.fest = P.haeuser.map(h => schraeg(h.x, h.z, h.b / 2, h.t / 2, h.dreh)).concat(P.sperre, P.baeume.map(b => [b.x - 0.35, b.z - 0.35, b.x + 0.35, b.z + 0.35]),
    P.parker.map(p => { const q = schraeg(p.x, p.z, 0.95, 2.2, p.h); q.park = p; return q; }));      // q.park: Dieses Hindernis ist ein parkendes Auto – der Streifenwagen kann es wegschieben
  return P;
}

export const PLAN = baue();

// Steckt die Stelle x/z in einem Hindernis? (rand = so viel Luft muss rundherum sein)
export function imHindernis(x, z, q, rand = 0) {
  if (!q.o) return x > q[0] - rand && x < q[2] + rand && z > q[1] - rand && z < q[3] + rand;
  const o = q.o, dx = x - o.x, dz = z - o.z;
  return Math.abs(dx * o.c - dz * o.s) < o.hb + rand && Math.abs(dx * o.s + dz * o.c) < o.ht + rand;
}

// Wie heißt die Straße oder das Viertel an dieser Stelle? (für die Anzeige oben links)
export function woBinIch(x, z) {
  const n = PLAN.strasseNah(x, z);
  if (n[1] && n[3] < n[1].b / 2 + n[1].geh + 1) return n[1].name;
  const b = BESONDERE.find(b => imRechteck(x, z, b.frei || b.r, 2));
  return b ? b.schild.split(' – ')[0] : VIERTEL_NAME[viertel(x, z)] || 'Möwenbrück';
}
