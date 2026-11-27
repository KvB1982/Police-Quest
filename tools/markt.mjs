// Blaulicht über Möwenbrück – prüft den Wochenmarkt (js/markt.js) ohne Bildschirm:
//   node tools/markt.mjs
// Nichts steht ineinander, der Fluchtweg des Taschendiebs und die Leute der Geschichte sind frei, jede Stelle ist zu Fuß
// erreichbar, und fünf Minuten Markttreiben laufen durch, ohne dass ein Besucher in einem Stand landet.
import { HAEUSER, MARKT, STAENDE, SACHEN, STELLEN, VERKAEUFER, hindernisse, baueNetz, Marktleben, BESUCHER_TAG } from '../js/markt.js';
import { DIEB_WEG } from '../js/story.js';
import { ORTE } from '../js/daten.js';
import { PLAN } from '../js/stadtplan.js';

let fehler = 0; const schlecht = t => { fehler++; console.log('  ✗ ' + t); };
const R = hindernisse(), name = i => i < STAENDE.length ? 'Stand ' + STAENDE[i].name : SACHEN.filter(q => q.b)[i - STAENDE.length].art;
const zuRechteck = (x, z, r) => Math.hypot(Math.max(r[0] - x, 0, x - r[2]), Math.max(r[1] - z, 0, z - r[3]));

console.log(`Markt: ${STAENDE.length} Stände, ${SACHEN.length} Sachen, ${R.length} Hindernisse, ${STELLEN.length} Stellen, ${VERKAEUFER.length} Verkäufer`);
// 1. Nichts steht ineinander oder außerhalb des Platzes
R.forEach((a, i) => { if (a[0] < MARKT.x1 || a[2] > MARKT.x2 || a[1] < MARKT.z1 || a[3] > MARKT.z2) schlecht(`${name(i)} ragt über den Platz hinaus`);
  R.forEach((b, j) => { if (j > i && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) schlecht(`${name(i)} und ${name(j)} stehen ineinander`); }); });
// 1b. Nichts steht in einem der Häuser rund um den Platz oder in der Kirche
R.forEach((a, i) => HAEUSER.forEach(h => { if (a[0] < h[2] && h[0] < a[2] && a[1] < h[3] && h[1] < a[3]) schlecht(`${name(i)} steht in einem Haus am Markt`); }));
// 2. Bäume der Stadt stehen nicht in einem Stand
for (const b of PLAN.baeume) R.forEach((r, i) => { if (zuRechteck(b.x, b.z, r) < 0.5) schlecht(`${name(i)} steht an einem Baum (${b.x.toFixed(1)}, ${b.z.toFixed(1)})`); });
// 3. Der Fluchtweg des Taschendiebs bleibt frei (alle halbe Meter nachgemessen)
let eng = 9;
for (let i = 0; i + 1 < DIEB_WEG.length; i++) { const [ax, az] = DIEB_WEG[i], [bx, bz] = DIEB_WEG[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) * 2);
  for (let k = 0; k <= n; k++) R.forEach((r, j) => { const d = zuRechteck(ax + (bx - ax) * k / n, az + (bz - az) * k / n, r); eng = Math.min(eng, d); if (d < 1.2) schlecht(`${name(j)} steht am Fluchtweg (Abstand ${d.toFixed(2)} m, Stück ${i})`); }); }
console.log(`  Fluchtweg: engste Stelle ${eng.toFixed(2)} m`);
// 4. Die Leute der Geschichte stehen frei
for (const l of ORTE.stadt.leute) if (l.x > MARKT.x1 && l.x < MARKT.x2 && l.z > MARKT.z1 && l.z < MARKT.z2) {
  R.forEach((r, j) => { if (zuRechteck(l.x, l.z, r) < 0.6) schlecht(`${l.id} steht zu nah an ${name(j)}`); });
  for (const s of STELLEN) if (Math.hypot(s.x - l.x, s.z - l.z) < 0.9) schlecht(`Stelle (${s.x.toFixed(1)}, ${s.z.toFixed(1)}, ${s.art}) liegt auf ${l.id}`);
}
// 5. Stellen: nicht in einem Hindernis, nicht aufeinander, vom Rand aus erreichbar
const netz = baueNetz();
STELLEN.forEach((s, i) => {
  if (netz.drin(s.x, s.z)) schlecht(`Stelle ${s.art} (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) liegt in einem Hindernis`);
  if (s.x < MARKT.x1 + 0.3 || s.x > MARKT.x2 - 0.3 || s.z < MARKT.z1 + 0.3 || s.z > MARKT.z2 - 0.3) schlecht(`Stelle ${s.art} (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) liegt nicht auf dem Platz`);
  STELLEN.forEach((t, j) => { if (j > i && Math.hypot(s.x - t.x, s.z - t.z) < 0.55) schlecht(`Zwei Stellen liegen aufeinander: (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) ${s.art}/${t.art}`); });
  const w = netz.weg(-40, -9.5, s.x, s.z); if (w.length === 1 && !netz.frei(-40, -9.5, s.x, s.z)) schlecht(`Zur Stelle ${s.art} (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) führt kein Weg`);
});
console.log(`  Wege-Netz: ${netz.punkte.length} Punkte, ${netz.nachbarn.reduce((a, n) => a + n.length, 0) / 2} Verbindungen`);
// 6. Fünf Minuten Markt: Niemand steckt in einem Stand, alle bewegen sich
let saat = 7; const wuerfel = () => { saat = (saat * 9301 + 49297) % 233280; return saat / 233280; };
const L = new Marktleben(BESUCHER_TAG, wuerfel); let drin = 0, gehen = 0, bilder = 0, t0 = performance.now();
const start = L.leute.map(p => [p.x, p.z]), weit = L.leute.map(() => 0);
for (let i = 0; i < 300 * 30; i++) { L.schritt(1 / 30, { x: -40 + Math.sin(i / 200) * 20, z: -25 }); bilder++;
  L.leute.forEach((p, k) => { if (Number.isNaN(p.x)) drin += 1000; if (i % 15 === 0 && R.some(r => p.x > r[0] + 0.1 && p.x < r[2] - 0.1 && p.z > r[1] + 0.1 && p.z < r[3] - 0.1)) drin++; if (p.geht) gehen++; weit[k] = Math.max(weit[k], Math.hypot(p.x - start[k][0], p.z - start[k][1])); }); }
const ms = (performance.now() - t0) / bilder;
if (drin) schlecht(`${drin}-mal stand ein Besucher in einem Hindernis`);
if (weit.some(w => w < 2)) schlecht(`${weit.filter(w => w < 2).length} Besucher haben sich in fünf Minuten nicht vom Fleck bewegt`);
const doppelt = L.stellen.filter(s => !s.viele && L.leute.filter(p => p.stelle === s).length > 1).length; if (doppelt) schlecht(`${doppelt} Stellen sind doppelt belegt`);
console.log(`  Markttreiben: im Schnitt gehen ${(gehen / bilder).toFixed(0)} von ${L.leute.length}, ${ms.toFixed(3)} ms Rechenzeit je Bild`);
console.log(fehler ? `\n${fehler} Fehler` : '\nAlles in Ordnung.');
process.exit(fehler ? 1 : 0);
