// Blaulicht über Möwenbrück – Verfolgungsfahrt (ohne three.js, in node testbar).
//
// Ein Fluchtwagen fährt auf einer festen Strecke durch die Stadt. Die Strecke wird aus dem Straßennetz ausgerechnet:
// vom Start über die Kreuzungen bis zum Ziel (kürzester Weg, das Verfahren heißt Dijkstra).
// Der Fluchtwagen fährt wie an einem Gummiband: Bist du nah dran, gibt er Gas. Fällst du zurück, wird er langsamer.
// So kann man ihn nie ganz verlieren – aber auch nicht einfach überholen.

import { PLAN, ortAuf, imHindernis } from './stadtplan.js';

// ------------------------------------------------------------------ Zahlen zum Einstellen
export const SPUR = [2.3, 1.5, 0.8, 0.1, -0.7, -1.6, -2.6];   // so weit rechts von der Straßenmitte fährt der Fluchtwagen (Meter). Steht dort etwas (ein parkendes Auto), nimmt er die nächste Zahl
export const V_NAH = 24.5;          // sein Tempo, wenn du ihm im Nacken sitzt (m/s) – knapp unter deinem Höchsttempo mit Blaulicht
export const V_FERN = 12;           // sein Tempo, wenn du weit zurück bist
export const NAH = 25, FERN = 110;  // Abstand in Metern für "nah" und "weit zurück"
export const WARTET_AB = 170;       // so weit weg bleibt er stehen (er steckt dann im Verkehr fest), bis du aufholst
export const KURVE_BREMST = 0.55;   // in engen Kurven fährt er bis zu so viel langsamer (0.55 = gut halbes Tempo)

const K = PLAN.knoten;
const naechster = (x, z) => { let b = 0; for (let i = 1; i < K.length; i++) if (Math.hypot(K[i].x - x, K[i].z - z) < Math.hypot(K[b].x - x, K[b].z - z)) b = i; return b; };

// Der kürzeste Weg von Kreuzung a nach Kreuzung b. Gassen und die Autobahn nimmt der Fluchtwagen nicht.
function kreuzungen(a, b) {
  const weit = K.map(() => 1e9), von = K.map(() => null), fertig = new Set();
  weit[a] = 0;
  for (;;) {
    let n = -1;
    for (let i = 0; i < K.length; i++) if (!fertig.has(i) && weit[i] < 1e9 && (n < 0 || weit[i] < weit[n])) n = i;
    if (n < 0 || n === b) break;
    fertig.add(n);
    for (const e of K[n].kanten) {
      if (e.weg.art === 'gasse' || e.weg.art === 'autobahn' || e.weg.art === 'rampe') continue;
      const m = e.a === n ? e.b : e.a;
      if (weit[n] + e.l < weit[m]) { weit[m] = weit[n] + e.l; von[m] = [n, e]; }
    }
  }
  const liste = [];
  for (let n = b; von[n]; n = von[n][0]) liste.unshift(von[n]);
  return liste;        // [[von Kreuzung, Straßenstück], …]
}

// Die Strecke als Linie aus Punkten. def = { start: [x, z], erst: [x, z], ziel: [x, z] }
// (erst = die erste Kreuzung, zu der er fährt; so ist klar, in welche Richtung er losfährt)
export function strecke(def) {
  const mitte = [[def.start[0], def.start[1]]];
  const a = naechster(...def.erst), b = naechster(...def.ziel);
  for (const [n, e] of kreuzungen(a, b)) {
    const vor = e.a === n;       // fährt er dieses Straßenstück vorwärts (von a nach b) oder rückwärts?
    for (let s = 0; s <= e.l; s += 5) { const o = ortAuf(e.weg, vor ? e.s0 + s : e.s1 - s); mitte.push([o[0], o[1]]); }
  }
  mitte.push([def.ziel[0], def.ziel[1]]);
  // doppelte und zu dichte Punkte weglassen
  let pts = mitte.filter((p, i) => i === 0 || Math.hypot(p[0] - mitte[i - 1][0], p[1] - mitte[i - 1][1]) > 2);
  // nach rechts auf die eigene Spur rücken (rechts von der Fahrtrichtung (dx, dz) ist (−dz, dx)); Start und Ziel bleiben, wo sie sind.
  // Parkt dort ein Auto oder steht ein Baum, weicht er zur Mitte hin aus.
  const frei = (x, z) => !PLAN.fest.some(q => q[0] - 1.2 < x && x < q[2] + 1.2 && q[1] - 1.2 < z && z < q[3] + 1.2 && (!q.o || imHindernis(x, z, q, 1.2)));
  pts = pts.map((p, i) => {
    if (i === 0 || i === pts.length - 1) return p;
    const v = pts[i - 1], n = pts[i + 1], dx = n[0] - v[0], dz = n[1] - v[1], d = Math.hypot(dx, dz) || 1;
    const ab = SPUR.find(a => frei(p[0] - dz / d * a, p[1] + dx / d * a)) ?? 0;
    return [p[0] - dz / d * ab, p[1] + dx / d * ab];
  });
  // Ecken zweimal abrunden: Aus jeder Ecke werden zwei Punkte, die ein Stück davor und dahinter liegen.
  for (let runde = 0; runde < 2; runde++) {
    const rund = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      rund.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]);
    }
    rund.push(pts.at(-1)); pts = rund;
  }
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, L, l: L.at(-1) };
}

// Wo ist man nach s Metern auf der Strecke? Zurück kommt [x, z, Richtung als Winkel].
export function ortAufStrecke(T, s) {
  s = Math.max(0, Math.min(T.l - 0.01, s));
  let lo = 0, hi = T.L.length - 2;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (T.L[m] <= s) lo = m; else hi = m - 1; }
  const a = T.pts[lo], b = T.pts[lo + 1], d = T.L[lo + 1] - T.L[lo] || 1, t = (s - T.L[lo]) / d;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[0] - a[0], b[1] - a[1])];
}

// Eine neue Verfolgung. amEnde = true: Der Fluchtwagen steht schon am Ziel (für geladene Spielstände).
export function neueJagd(def, amEnde = false) {
  const T = strecke(def), j = { T, s: amEnde ? T.l : 0, v: 0, x: 0, z: 0, h: 0, fertig: amEnde, rumms: 0, dauer: 0, laut: 0, strasse: '', abstand: 0 };
  [j.x, j.z, j.h] = ortAufStrecke(T, j.s);
  return j;
}

// Ein Schritt der Verfolgung. sp = { x, z } wo du bist, faehrst = sitzt du im Streifenwagen?, sirene = läuft die Sirene?
export function jagdSchritt(j, dt, sp, faehrst, sirene) {
  const ab = j.abstand = Math.hypot(sp.x - j.x, sp.z - j.z);
  if (j.fertig) return;
  let ziel;
  if (!faehrst) ziel = ab < 70 ? 14 : 0;                                         // du bist noch zu Fuß: Er fährt ein Stück vor und wartet
  else if (ab < NAH) ziel = V_NAH;
  else if (ab < FERN) ziel = V_NAH + (V_FERN - V_NAH) * (ab - NAH) / (FERN - NAH);
  else ziel = Math.max(0, V_FERN * (1 - (ab - FERN) / (WARTET_AB - FERN)));
  // Kommt gleich eine Kurve? Dann langsamer.
  const vorn = ortAufStrecke(j.T, j.s + 14)[2];
  let dreh = Math.abs(vorn - j.h); if (dreh > Math.PI) dreh = 2 * Math.PI - dreh;
  ziel *= 1 - Math.min(KURVE_BREMST, dreh * 0.7);
  j.v += Math.max(-12 * dt, Math.min(6 * dt, ziel - j.v));
  j.s += j.v * dt;
  if (faehrst) { j.dauer += dt; if (sirene) j.laut += dt; }
  if (j.s >= j.T.l) { j.s = j.T.l; j.v = 0; j.fertig = true; }
  [j.x, j.z, j.h] = ortAufStrecke(j.T, j.s);
}

// Wie lief die Verfolgung? rumms = so oft bist du irgendwo angestoßen, sirene = lief die Sirene die meiste Zeit?
export function bilanz(j) { return { rumms: j ? j.rumms : 0, sirene: !j || j.dauer < 1 || j.laut / j.dauer > 0.6 }; }
