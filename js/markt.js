// Blaulicht über Möwenbrück – der Wochenmarkt als Daten und Regeln (ohne three.js, in node testbar).
//
// Hier steht, WAS auf dem Marktplatz steht (Stände, Karussell, Drehorgel, Stehtische, Bänke, Masten für die Wimpel …),
// WO Leute stehen bleiben können (Stellen) und WIE die Besucher über den Platz schlendern (Klasse Marktleben).
// Gebaut und gezeichnet wird das alles in marktbau.js.
//
// Vorbild für die vielen Menschen: die Besucher auf dem Turniergelände im Schwester-Spiel Powershot (js/besucher.js dort).
// Maße in Metern. Ein Winkel h schaut nach (sin h, cos h). Rechtecke sind [x1, z1, x2, z2].

import { MARKT_RING } from './stadtplan.js';

// ---- Zahlen zum Einstellen ----
export const BESUCHER_TAG = 100;      // so viele Besucher schlendern am Tag über den Markt
export const BESUCHER_SPAR = 46;     // … im Spar-Modus (langsames Gerät)
export const BESUCHER_ABEND = 12;    // … am Abend (die Stände sind dann fast leer)
const TEMPO = [0.9, 1.45];           // so schnell gehen sie (Meter pro Sekunde, von … bis)
const STEH_ZEIT = [6, 22];           // so lange bleibt jemand an einer Stelle stehen (Sekunden, von … bis)
const PLAUDER_ZEIT = [14, 45];       // wer sich unterhält, bleibt länger
const SCHRITT = 1.3;                 // so viele Meter kommt ein Erwachsener mit einem Doppelschritt voran
const DREH_TEMPO = 5;                // so schnell dreht sich jemand in seine Laufrichtung
const DICK = 0.55;                   // so viel Abstand halten Besucher von Ständen und anderen Hindernissen
const SCHEU_PLATZ = 1.7;             // so viel Platz machen sie jemandem, der über den Markt rennt (der Flüchtende bei einer Verfolgung)
const KIM_PLATZ = 0.8;               // so nah lassen sie Kim an sich heran, dann weichen sie ein Stück aus

// Der Platz (seit 27.11.2026 mitten in der Altstadt, siehe MARKT_RING in stadtplan.js): x1 … z2 = der ganze Block mit den Häusern,
// innen = das freie Pflaster zwischen den Häusern. mx, mz = der Brunnen.
export const MARKT = { x1: MARKT_RING.aussen[0], z1: MARKT_RING.aussen[1], x2: MARKT_RING.aussen[2], z2: MARKT_RING.aussen[3], innen: MARKT_RING.innen, mx: -40, mz: -30 };
// Die Häuser rund um den Platz und die Kirche als Rechtecke: Die Besucher gehen um sie herum (nur durch die Durchgänge kommen sie herein)
const [RX1, RZ1, RX2, RZ2] = MARKT_RING.aussen, RT = MARKT_RING.tief;
export const HAEUSER = [
  ...MARKT_RING.westOst.flatMap(([a, b]) => [[RX1, a, RX1 + RT, b], [RX2 - RT, a, RX2, b]]),
  ...MARKT_RING.sued.map(([a, b]) => [a, RZ2 - RT, b, RZ2]), ...MARKT_RING.nord.map(([a, b]) => [a, RZ1, b, RZ1 + 8]),
  [-65.5, -52, -24, -42],       // die Marienkirche mit ihrem Turm
];
const STAND_B = 4, STAND_T = 2.4;    // so breit und so tief ist ein Stand

// ---------------------------------------------------------------------------------------------
// Die Stände. Vorn (wo die Kunden stehen) ist bei dreh = 0 im Süden (+z, zur Kamera hin).
// art = was es dort gibt (marktbau.js legt die passenden Waren aus), farben = die Streifen der Markise.
// Die ersten acht stehen genau dort, wo die Stände schon immer standen (die Geschichte verlässt sich darauf).
// ---------------------------------------------------------------------------------------------
const V = Math.PI / 2, HELL = '#f6f1e4';
export const STAENDE = [
  // die Reihe vor der Kirche (in der Mitte bleibt der Weg zur Kirchentür frei)
  { x: -61, z: -40.6, art: 'gemuese', farben: ['#3f8f4a', HELL], name: 'Gemüse vom Deich' },
  { x: -55.5, z: -40.6, art: 'brot', farben: ['#c98a3a', HELL], name: 'Backstube Kruse' },
  { x: -50, z: -40.6, art: 'blumen', farben: ['#d9534f', '#f4c9d6'], name: 'Blumen Wiebke' },
  { x: -30, z: -40.6, art: 'fisch', farben: ['#2f6fb0', HELL], name: 'Fisch-Hein · Krabben' },
  { x: -24.5, z: -40.6, art: 'honig', farben: ['#e2a51e', HELL], name: 'Imkerei Sanddorn' },
  { x: -19, z: -40.6, art: 'obst', farben: ['#e8862a', HELL], name: 'Obst Feddersen' },
  // die Reihe vor den Häusern im Süden (sie schaut nach Norden zum Brunnen; in der Mitte kommt man von der Wachstraße herein)
  { x: -62, z: -15.4, dreh: 2 * V, art: 'wurst', farben: ['#b0342c', HELL], name: 'Wurst & Schinken' },
  { x: -56.5, z: -15.4, dreh: 2 * V, art: 'suess', farben: ['#d9608a', HELL], name: 'Naschwerk' },
  { x: -51, z: -15.4, dreh: 2 * V, art: 'toepfer', farben: ['#2f8f9a', HELL], name: 'Töpferei Tonkopf' },
  { x: -47, z: -15.4, dreh: 2 * V, b: 2.6, art: 'grill', farben: ['#b0342c', '#2b2f33'], name: 'Bratwurst' },
  { x: -29, z: -15.4, dreh: 2 * V, art: 'gewuerze', farben: ['#8a4a9a', HELL], name: 'Gewürze der Welt' },
  { x: -23.5, z: -15.4, dreh: 2 * V, art: 'kaese', farben: ['#e8b82a', '#b0342c'], name: 'Käse-Kate' },
  { x: -18, z: -15.4, dreh: 2 * V, art: 'hof', farben: ['#5a8f3a', '#e8d9a8'], name: 'Hof Jacobs' },
  // zwei Stände Rücken an Rücken westlich vom Brunnen
  { x: -53, z: -31.3, dreh: 2 * V, art: 'koerbe', farben: ['#a8743a', '#e8d9a8'], name: 'Körbe & Stoffe' },
  { x: -53, z: -28.7, art: 'eier', farben: ['#d9a521', HELL], name: 'Eier & Geflügel' },
];

// ---------------------------------------------------------------------------------------------
// Alles andere auf dem Platz. b, t = so viel Platz braucht es als Hindernis (ohne = man kann hindurchgehen).
// ---------------------------------------------------------------------------------------------
const mast = (x, z) => ({ art: 'mast', x, z, b: 0.3, t: 0.3 });
// Vier Masten rund um den Brunnen: Zwischen ihnen hängen die Wimpelketten und die Lichterketten
export const MASTEN = [[-31, -26], [-31.5, -33.2], [-48.5, -36.8], [-49.3, -25.2]];
// Vier Masten in den Ecken des Platzes: Von dort laufen lange Ketten zur Mitte und an den Häusern entlang
export const ECKMASTEN = [[-65.4, -41.5], [-14.6, -41.4], [-14.6, -14.6], [-65.4, -14.6]];
export const KETTEN = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 2], [5, 1], [6, 0], [7, 3], [4, 5], [5, 6], [6, 7], [7, 4]];

export const SACHEN = [
  { art: 'karussell', x: -19.2, z: -24.5, b: 4.6, t: 4.6 },
  { art: 'kasper', x: -26.5, z: -30, b: 1.9, t: 1.2 },
  { art: 'drehorgel', x: -59, z: -28.3, b: 1.5, t: 1.0 },
  { art: 'kaffeewagen', x: -64.5, z: -22, b: 3.2, t: 1.9, dreh: V },
  { art: 'eiswagen', x: -17.5, z: -35, b: 1.6, t: 1.1 },
  { art: 'handkarren', x: -33.5, z: -32.5, b: 2.4, t: 1.4, dreh: 0.1 },
  { art: 'ballons', x: -63.3, z: -30.2 },
  { art: 'heu', x: -43, z: -11, b: 2.4, t: 1.5, dreh: V },
  { art: 'fahrraeder', x: -37, z: -10.5, b: 3.4, t: 1.9, dreh: -V },
  { art: 'stehtisch', x: -44.3, z: -20, b: 0.5, t: 0.5, schirm: '#d9534f' }, { art: 'stehtisch', x: -34.5, z: -19.3, b: 0.5, t: 0.5, schirm: '#e2a51e' },
  { art: 'stehtisch', x: -62.4, z: -35.3, b: 0.5, t: 0.5, schirm: '#2f8f9a' }, { art: 'stehtisch', x: -43.6, z: -39.6, b: 0.5, t: 0.5 }, { art: 'stehtisch', x: -36.4, z: -39.6, b: 0.5, t: 0.5 },
  { art: 'bank', x: -65.3, z: -37, b: 2, t: 0.7, dreh: V }, { art: 'bank', x: -65.3, z: -17.6, b: 2, t: 0.7, dreh: V },
  { art: 'bank', x: -14.7, z: -38, b: 2, t: 0.7, dreh: -V },
  { art: 'litfass', x: -15.4, z: -18.8, b: 1.5, t: 1.5 },
  { art: 'wegweiser', x: -43.7, z: -13.4, b: 0.3, t: 0.3 },
  ...[[-65.4, -32.7], [-65.4, -27.3], [-14.6, -32.7], [-14.6, -27.3], [-46.6, -41.4], [-33.4, -41.4], [-35.4, -14.6]]
    .map(([x, z], i) => ({ art: 'kuebel', x, z, b: 0.9, t: 0.9, nr: i })),
  ...[...MASTEN, ...ECKMASTEN].map(([x, z]) => mast(x, z)),
];

// Das Rechteck, das ein Stand oder eine Sache auf dem Boden belegt (steht etwas quer, sind Breite und Tiefe vertauscht)
function rechteck(q, b = q.b, t = q.t) {
  const quer = Math.abs(Math.sin(q.dreh || 0)) > 0.7, bb = quer ? t : b, tt = quer ? b : t;
  return [q.x - bb / 2, q.z - tt / 2, q.x + bb / 2, q.z + tt / 2];
}
// Eine Stelle vor (oder neben) einem Ding in die Welt rechnen: lx = seitlich, lz = nach vorn
export function vonDing(q, lx, lz) { const a = q.dreh || 0, c = Math.cos(a), s = Math.sin(a); return [q.x + lx * c + lz * s, q.z - lx * s + lz * c]; }

// Alles, was im Weg steht – für das Spiel (welt.js macht daraus Hindernisse) und für die Wege der Besucher
export function hindernisse() {
  return [...STAENDE.map(s => rechteck(s, s.b || STAND_B, STAND_T)), ...SACHEN.filter(q => q.b).map(q => rechteck(q))];
}
// Der Brunnen in der Mitte ist für das Spiel kein Hindernis (so war es immer), die Besucher gehen aber um ihn herum
const BRUNNEN = [MARKT.mx - 2.6, MARKT.mz - 2.6, MARKT.mx + 2.6, MARKT.mz + 2.6];

// ---------------------------------------------------------------------------------------------
// Stellen, an denen Besucher stehen bleiben: { x, z, h = wohin sie schauen, art }
//   stand = Kundschaft vor einem Stand · brunnen · plausch = zwei oder drei unterhalten sich · tisch = Stehtisch
//   schau = Zuschauer (Karussell, Drehorgel) · kind = hier bleiben Kinder gern stehen · rand = hier verlässt man den Platz
// ---------------------------------------------------------------------------------------------
const blick = (x, z, zx, zz) => Math.atan2(zx - x, zz - z);
function baueStellen() {
  const S = [], dazu = (x, z, h, art, extra = {}) => S.push({ x, z, h, art, frei: true, ...extra });
  for (const s of STAENDE) {       // drei Kunden vor jedem Stand (beim kleinen Grill zwei), sie schauen zum Stand
    const n = (s.b || STAND_B) > 3 ? 3 : 2;
    for (let i = 0; i < n; i++) { const [x, z] = vonDing(s, (i - (n - 1) / 2) * 1.25, STAND_T / 2 + 0.75 + (i % 2) * 0.25); dazu(x, z, (s.dreh || 0) + Math.PI, 'stand'); }
  }
  for (let i = 0; i < 9; i++) { const w = i * 0.698 + 0.3, x = MARKT.mx + Math.sin(w) * 4.6, z = MARKT.mz + Math.cos(w) * 4.6; dazu(x, z, w + Math.PI, i % 3 === 1 ? 'kind' : 'brunnen'); }
  for (const q of SACHEN) {
    if (q.art === 'karussell') for (let i = 0; i < 7; i++) { const w = -2.3 + i * 0.55, x = q.x + Math.sin(w) * 4.2, z = q.z + Math.cos(w) * 4.2; dazu(x, z, w + Math.PI, i % 2 ? 'kind' : 'schau'); }
    if (q.art === 'drehorgel') for (let i = 0; i < 6; i++) { const w = -0.9 + i * 0.5, x = q.x + Math.sin(w) * 3.1, z = q.z + Math.cos(w) * 3.1; dazu(x, z, w + Math.PI, i === 2 ? 'kind' : 'schau'); }
    if (q.art === 'stehtisch') for (let i = 0; i < 3; i++) { const w = i * 2.094 + q.x, x = q.x + Math.sin(w) * 1.15, z = q.z + Math.cos(w) * 1.15; dazu(x, z, w + Math.PI, 'tisch'); }
    if (q.art === 'kaffeewagen' || q.art === 'eiswagen') for (let i = 0; i < 2; i++) { const [x, z] = vonDing(q, i * 1.1 - 0.5, q.t / 2 + 0.8 + i * 0.3); dazu(x, z, Math.PI, i && q.art === 'eiswagen' ? 'kind' : 'stand'); }
    if (q.art === 'ballons') for (let i = 0; i < 3; i++) { const w = 0.4 + i * 0.9, x = q.x + Math.sin(w) * 1.7, z = q.z + Math.cos(w) * 1.7; dazu(x, z, w + Math.PI, 'kind'); }
    if (q.art === 'kasper') for (let i = 0; i < 8; i++) { const [x, z] = vonDing(q, (i % 4 - 1.5) * 0.95, 2.1 + Math.floor(i / 4) * 1.1 + (i % 2) * 0.2); dazu(x, z, Math.PI, i < 5 ? 'kind' : 'schau'); }
    if (q.art === 'litfass') dazu(q.x - 1.9, q.z + 0.4, V, 'brunnen');
  }
  // Leute, die sich unterhalten: zwei oder drei stehen im Kreis und schauen sich an
  [[-45.5, -26, 3], [-35.5, -26.5, 2], [-58.5, -19.5, 2], [-25.5, -25.8, 2], [-62, -25.5, 2], [-40, -11.5, 2], [-22, -37, 3], [-41, -37.6, 2], [-57.5, -37.4, 2], [-27, -19.6, 2], [-47.5, -30.5, 2], [-33.5, -23.5, 3]]
    .forEach(([mx, mz, n], k) => { for (let i = 0; i < n; i++) { const w = k * 1.3 + i * 6.283 / n, x = mx + Math.sin(w) * 0.62, z = mz + Math.cos(w) * 0.62; dazu(x, z, w + Math.PI, 'plausch'); } });
  // Hier kommen und gehen die Leute: an den Rändern des Platzes
  for (const [x, z] of [[-40.5, -8.6], [-39, -8.9], [-41.8, -9.2], [-69, -30], [-11, -30], [-22.5, -47.5]]) dazu(x, z, 0, 'rand', { viele: true });
  return S;
}
export const STELLEN = baueStellen();

// Wer hinter welchem Stand steht und verkauft: { x, z, h, wer (Figur), hemd }
const SCHUERZE = ['#f4f2ec', '#2e4a7a', '#8a2e3a', '#f4f2ec', '#3a3e46', '#e8dcc0'];
export const VERKAEUFER = [
  ...STAENDE.map((s, i) => { const [x, z] = vonDing(s, ((i * 7) % 5 - 2) * 0.3, -0.35); return { x, z, h: s.dreh || 0, wer: ['b2', 'b5', 'b1', 'b6', 'b3', 'b4'][i % 6], hemd: SCHUERZE[i % 6], fest: true, takt: i * 2.7 }; }),
  ...SACHEN.filter(q => ['drehorgel', 'kaffeewagen', 'eiswagen', 'ballons'].includes(q.art)).map((q, i) => {
    const [x, z] = q.art === 'drehorgel' ? vonDing(q, 1.15, 0.1) : q.art === 'ballons' ? [q.x, q.z] : q.art === 'eiswagen' ? vonDing(q, 0, -0.95) : vonDing(q, 0.2, -0.1);
    return { x, z, h: q.art === 'drehorgel' ? -0.5 : 0, wer: ['b3', 'b6', 'b5', 'b1'][i % 4], hemd: ['#8a2e3a', '#f4f2ec', '#f0b8c8', '#e8c63a'][i % 4], fest: true, takt: i * 4.1 + 1, hoch: q.art === 'kaffeewagen' ? 0.25 : 0 };
  }),
];

// ---------------------------------------------------------------------------------------------
// Wege um die Stände herum: ein "Sicht-Netz". Jede Ecke eines Hindernisses (ein Stück nach außen gerückt) ist ein Punkt.
// Zwei Punkte sind verbunden, wenn man vom einen zum anderen gehen kann, ohne durch etwas hindurchzumüssen.
// Den kürzesten Weg über diese Punkte sucht "weg" (nach dem Verfahren von Dijkstra).
// ---------------------------------------------------------------------------------------------
// Geht die Strecke von a nach b durch das Rechteck r (um d aufgeblasen)?
function schneidet(ax, az, bx, bz, r, d) {
  let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
  for (const [p, q] of [[-dx, ax - (r[0] - d)], [dx, r[2] + d - ax], [-dz, az - (r[1] - d)], [dz, r[3] + d - az]]) {
    if (p === 0) { if (q <= 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return t1 - t0 > 1e-6;
}
export function baueNetz(rechtecke = [...hindernisse(), BRUNNEN, ...HAEUSER]) {
  const frei = (ax, az, bx, bz) => !rechtecke.some(r => schneidet(ax, az, bx, bz, r, DICK));
  const drin = (x, z, d = DICK) => rechtecke.some(r => x > r[0] - d && x < r[2] + d && z > r[1] - d && z < r[3] + d);
  const punkte = [];
  for (const r of rechtecke) for (const [x, z] of [[r[0], r[1]], [r[2], r[1]], [r[0], r[3]], [r[2], r[3]]]) {
    const px = x + (x === r[0] ? -1 : 1) * (DICK + 0.25), pz = z + (z === r[1] ? -1 : 1) * (DICK + 0.25);
    if (px > MARKT.x1 + 0.4 && px < MARKT.x2 - 0.4 && pz > MARKT.z1 + 0.4 && pz < MARKT.z2 - 0.4 && !drin(px, pz)) punkte.push([px, pz]);
  }
  const n = punkte.length, nachbarn = punkte.map(() => []);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (frei(punkte[i][0], punkte[i][1], punkte[j][0], punkte[j][1])) {
    const d = Math.hypot(punkte[i][0] - punkte[j][0], punkte[i][1] - punkte[j][1]); nachbarn[i].push([j, d]); nachbarn[j].push([i, d]);
  }
  // Der Weg von (ax, az) nach (bx, bz) als Liste von Punkten (der letzte ist das Ziel). Gibt es keinen, geht es einfach geradeaus.
  function weg(ax, az, bx, bz) {
    if (frei(ax, az, bx, bz)) return [[bx, bz]];
    const weit = new Array(n + 1).fill(Infinity), von = new Array(n + 1).fill(-1), fertig = new Array(n + 1).fill(false), ZIEL = n;
    const zumZiel = punkte.map(p => frei(p[0], p[1], bx, bz) ? Math.hypot(p[0] - bx, p[1] - bz) : Infinity);
    for (let i = 0; i < n; i++) if (frei(ax, az, punkte[i][0], punkte[i][1])) weit[i] = Math.hypot(ax - punkte[i][0], az - punkte[i][1]);
    for (;;) {
      let k = -1; for (let i = 0; i <= n; i++) if (!fertig[i] && weit[i] < Infinity && (k < 0 || weit[i] < weit[k])) k = i;
      if (k < 0) return [[bx, bz]];
      if (k === ZIEL) break;
      fertig[k] = true;
      for (const [j, d] of nachbarn[k]) if (weit[k] + d < weit[j]) { weit[j] = weit[k] + d; von[j] = k; }
      if (weit[k] + zumZiel[k] < weit[ZIEL]) { weit[ZIEL] = weit[k] + zumZiel[k]; von[ZIEL] = k; }
    }
    const pfad = [[bx, bz]]; for (let k = von[ZIEL]; k >= 0; k = von[k]) pfad.unshift(punkte[k]);
    return pfad;
  }
  return { punkte, nachbarn, weg, frei, drin };
}

// ---------------------------------------------------------------------------------------------
// Das Leben auf dem Markt: Jeder Besucher sucht sich eine freie Stelle, geht hin, bleibt eine Weile und sucht die nächste.
// Die Haltungen (bild) sind die 13 gebackenen Formen der Besucher-Figuren: 0–7 = ein Doppelschritt, dann:
// ---------------------------------------------------------------------------------------------
export const STEH = 8, HANDY = 9, FOTO = 10, HUEFTEN = 11, REDEN = 12, SCHRITT_BILDER = 8;
const ERWACHSENE = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'], KIND = 'b7';
// Hemdfarben der Besucher. Mit Absicht kein Grün: Der Taschendieb trägt eine grüne Jacke, den soll man wiederfinden können.
const HEMD = ['#f4f2ec', '#f4f2ec', '#24365a', '#9cc0e4', '#d8483c', '#f0d87a', '#e8a8b8', '#3a3e46', '#dcd6c6', '#4a8ac8', '#8a2e3a', '#e8862a', '#b8a0d0', '#7a5a3a', '#f0f0f0'];
const HALTUNG = { stand: [STEH, STEH, HUEFTEN, REDEN], brunnen: [FOTO, HANDY, STEH, HUEFTEN], plausch: [REDEN, REDEN, STEH], tisch: [REDEN, STEH, HANDY], schau: [STEH, FOTO, HUEFTEN, STEH], kind: [STEH, HUEFTEN, STEH], rand: [STEH] };
const zw = (a, b, w) => a + (b - a) * w;

export class Marktleben {
  constructor(zahl = BESUCHER_TAG, wuerfel = Math.random) {
    this.w = wuerfel; this.netz = baueNetz(); this.zeit = 0;
    this.stellen = STELLEN.map(s => ({ ...s }));
    this.feste = VERKAEUFER.map((v, i) => ({ ...v, bild: STEH, gross: 0.96 + (i % 4) * 0.025, breit: 1, da: true }));
    this.leute = [];
    for (let i = 0; i < zahl; i++) {
      const kind = i % 9 === 4, w = this.w;
      const p = { wer: kind ? KIND : ERWACHSENE[Math.floor(w() * 6)], hemd: HEMD[Math.floor(w() * HEMD.length)], gross: kind ? zw(0.58, 0.76, w()) : zw(0.92, 1.06, w()), breit: zw(0.93, 1.07, w()),
        kind, tempo: zw(TEMPO[0], TEMPO[1], w()) * (kind ? 1.1 : 1), takt: w() * 6.28, eigen: w() * 100, x: 0, z: 0, h: 0, sx: 0, sz: 0, bild: STEH, geht: false, da: true, pfad: null, stelle: null, warte: 0 };
      // Am Anfang steht jeder schon irgendwo – der Markt ist sofort voll
      const s = this.sucheStelle(p, true);
      p.x = s.x; p.z = s.z; p.h = s.h; this.ankommen(p, s); p.warte *= w();
      this.leute.push(p);
    }
    this.alle = [...this.feste, ...this.leute];
  }
  // Eine freie Stelle aussuchen: Kinder mögen Karussell, Ballons und Brunnen; ab und zu geht jemand vom Platz
  sucheStelle(p, anfang = false) {
    const w = this.w;
    for (let v = 0; v < 40; v++) {
      const s = this.stellen[Math.floor(w() * this.stellen.length)];
      if (!s.frei && !s.viele || s === p.stelle) continue;
      if (anfang && s.art === 'rand') continue;
      if (s.art === 'rand' && w() < 0.55) continue;
      if (p.kind ? s.art !== 'kind' && w() < 0.7 : s.art === 'kind' && w() < 0.6) continue;
      // meistens nicht quer über den ganzen Platz: nahe Stellen sind beliebter
      if (!anfang && Math.hypot(s.x - p.x, s.z - p.z) > 26 && w() < 0.6) continue;
      return s;
    }
    return this.stellen.find(s => s.viele);
  }
  ankommen(p, s) {
    const w = this.w, zeit = s.art === 'plausch' || s.art === 'tisch' ? PLAUDER_ZEIT : STEH_ZEIT;
    if (p.stelle && !p.stelle.viele) p.stelle.frei = true;
    p.stelle = s; if (!s.viele) s.frei = false;
    p.geht = false; p.pfad = null; p.warte = s.art === 'rand' ? 0.5 + w() * 2 : zw(zeit[0], zeit[1], w());
    p.art = HALTUNG[s.art][Math.floor(w() * HALTUNG[s.art].length)];
  }
  // Einmal pro Bild: alle ein Stück weiterbewegen. kim = { x, z } oder null, zahl = so viele Besucher sind gerade da
  schritt(dt, kim = null, zahl = this.leute.length) {
    this.zeit += dt; const t = this.zeit;
    this.leute.forEach((p, i) => {
      p.da = i < zahl; if (!p.da) return;
      if (p.geht) {
        const ziel = p.pfad[0], dx = ziel[0] - p.x, dz = ziel[1] - p.z, d = Math.hypot(dx, dz), weit = p.tempo * dt;
        if (d <= weit) { p.x = ziel[0]; p.z = ziel[1]; p.pfad.shift(); if (!p.pfad.length) this.ankommen(p, p.ziel); }
        else {
          p.x += dx / d * weit; p.z += dz / d * weit; p.takt += weit / (SCHRITT * p.gross) * 6.283;
          let dh = Math.atan2(dx, dz) - p.h; while (dh > Math.PI) dh -= 6.283; while (dh < -Math.PI) dh += 6.283; p.h += dh * Math.min(1, dt * DREH_TEMPO);
        }
        p.bild = Math.floor((((p.takt / 6.283) % 1) + 1) % 1 * SCHRITT_BILDER) % SCHRITT_BILDER;
      } else {
        p.warte -= dt;
        let dh = p.stelle.h - p.h; while (dh > Math.PI) dh -= 6.283; while (dh < -Math.PI) dh += 6.283; p.h += dh * Math.min(1, dt * DREH_TEMPO);
        // Wer redet oder fotografiert, tut das nicht ununterbrochen
        p.bild = p.art === REDEN ? (Math.sin(t * 0.9 + p.eigen) > -0.2 ? REDEN : STEH) : p.art === FOTO ? (Math.sin(t * 0.35 + p.eigen) > 0.2 ? FOTO : STEH) : p.art;
        if (p.warte <= 0) { const s = this.sucheStelle(p); if (s) { p.ziel = s; p.pfad = this.netz.weg(p.x, p.z, s.x, s.z); p.geht = true; if (p.stelle && !p.stelle.viele) p.stelle.frei = true; if (!s.viele) s.frei = false; p.stelle = s; } }
      }
      // Kim kommt zu nah: ein Stück zur Seite treten (sx, sz = so weit steht die Figur gerade neben ihrer Stelle)
      let wx = 0, wz = 0;
      if (kim) { const dx = p.x - kim.x, dz = p.z - kim.z, d = Math.hypot(dx, dz); if (d < KIM_PLATZ) { const k = (KIM_PLATZ - d) / (d || 1); wx = (d ? dx : 1) * k; wz = dz * k; } }
      if (this.scheu) for (const q of this.scheu) { const dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz); if (d < SCHEU_PLATZ) { const k = (SCHEU_PLATZ - d) / (d || 1); wx += (d ? dx : 1) * k; wz += dz * k; } }       // vor jemandem, der rennt, springt man weiter zur Seite
      p.sx += (wx - p.sx) * Math.min(1, dt * 8); p.sz += (wz - p.sz) * Math.min(1, dt * 8);
    });
    // Die Verkäufer: Sie stehen, reden mit der Kundschaft, stemmen mal die Hände in die Hüften
    for (const v of this.feste) { const k = Math.sin(t * 0.23 + v.takt); v.bild = k > 0.45 ? REDEN : k < -0.7 ? HUEFTEN : STEH; }
  }
}
