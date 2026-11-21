// Prüft die große Stadt ohne Bildschirm:  node tools/stadt.mjs
//   - der Stadtplan: wie viele Häuser, Bäume, Laternen, Autos; kein Haus steht auf einer Straße
//   - die Stellen der Geschichte (Tag 1) sind frei, man kommt zu Fuß hin
//   - der Verkehr: zwei Minuten vorspulen – niemand fährt ineinander, niemand bleibt für immer stehen, kein Fußgänger läuft im Haus
import { PLAN, STRASSEN_X, STRASSEN_Z, GROSS, woBinIch } from '../js/stadtplan.js';
import { ORTE } from '../js/daten.js';
import { neuerVerkehr } from '../js/verkehr.js';

let fehler = 0;
const pruefe = (ok, text) => { console.log((ok ? '  ok      ' : '  FEHLER  ') + text); if (!ok) fehler++; };
const P = PLAN, drin = (x, z, q, r = 0) => x > q[0] - r && x < q[2] + r && z > q[1] - r && z < q[3] + r;

console.log(`Stadt: ${GROSS[2] - GROSS[0]} m breit, ${GROSS[3] - GROSS[1]} m tief · ${STRASSEN_X.length} + ${STRASSEN_Z.length} Straßen · ${P.bloecke.length} Blocks`);
console.log(`       ${P.haeuser.length} Häuser · ${P.baeume.length} Bäume · ${P.laternen.length} Laternen · ${P.parker.length} parkende Autos · ${P.deko.length} Kleinteile`);
pruefe(P.haeuser.length > 1500, 'mehr als 1500 Häuser');
const aufStrasse = P.haeuser.filter(h => P.strassen.some(s => !s.kai && (s.achse === 'x' ? h.r[0] < s.p + s.b / 2 && h.r[2] > s.p - s.b / 2 && h.r[3] > s.von && h.r[1] < s.bis : h.r[1] < s.p + s.b / 2 && h.r[3] > s.p - s.b / 2 && h.r[2] > s.von && h.r[0] < s.bis)));
pruefe(aufStrasse.length === 0, `kein Haus steht auf einer Fahrbahn (${aufStrasse.length})`);
const imWasser = P.haeuser.filter(h => P.wasser.some(q => h.r[0] < q[2] && h.r[2] > q[0] && h.r[1] < q[3] && h.r[3] > q[1]));
pruefe(imWasser.length === 0, `kein Haus steht im Fleet (${imWasser.length})`);

// Die Stellen der Geschichte: Dinge und Leute in der Stadt dürfen nicht in einem Haus oder Baum stecken
const S = ORTE.stadt;
for (const d of [...S.dinge, ...S.leute]) {
  if (d.x === undefined) continue;
  const zu = P.fest.find(q => drin(d.x, d.z, q, d.art === 'tuer' ? -0.5 : 0.2));
  pruefe(!zu, `${d.name} (${d.x}, ${d.z}) ist frei – ${woBinIch(d.x, d.z)}`);
}
pruefe(woBinIch(40, 0) === 'Wachstraße', 'vor der Wache heißt die Straße Wachstraße');

// Verkehr: zwei Minuten laufen lassen, du stehst an der Wache
const v = neuerVerkehr(), sp = { x: 40, z: 0, r: 0.4 };
let eng = 0, imHaus = 0; const standZeit = new Map();
const t0 = Date.now();
for (let i = 0; i < 60 * 120; i++) {
  v.schritt(1 / 60, sp, false);
  if (i % 30) continue;
  for (const a of v.autos) { if (!a.da) continue;
    standZeit.set(a, a.v < 0.05 ? (standZeit.get(a) || 0) + 0.5 : 0);
    for (const b of v.autos) if (a !== b && b.da && Math.hypot(a.x - b.x, a.z - b.z) < 2.2) eng++; }
  for (const m of v.leute) if (m.da && P.fest.some(q => drin(m.x, m.z, q, -0.2))) imHaus++;
}
console.log(`Verkehr: ${v.autos.filter(a => a.da).length} Autos, ${v.leute.filter(m => m.da).length} Fußgänger, 2 Minuten in ${Date.now() - t0} ms`);
pruefe(v.autos.filter(a => a.da).length > 30, 'genug Autos unterwegs');
pruefe(eng === 0, `kein Auto fährt in ein anderes (${eng / 2} Mal zu nah)`);
// Wer vor dir steht, darf warten (du stehst ja auf der Straße). Alle anderen dürfen nicht ewig stehen.
const fest = [...standZeit].filter(([a, t]) => t > 40 && Math.hypot(a.x - sp.x, a.z - sp.z) > 40).length;
pruefe(fest === 0, `kein Auto steht länger als 40 Sekunden (${fest})`);
pruefe(imHaus === 0, `kein Fußgänger läuft durch ein Haus oder einen Baum (${imHaus})`);
// Rettungsgasse: mit Blaulicht halten alle in der Nähe
for (let i = 0; i < 60 * 6; i++) v.schritt(1 / 60, sp, true);
const nah = v.autos.filter(a => a.da && !a.kurve && Math.hypot(a.x - sp.x, a.z - sp.z) < 50);
pruefe(nah.every(a => a.v < 0.5), `mit Blaulicht halten die ${nah.length} Autos in der Nähe an`);

console.log(fehler ? `\n${fehler} Fehler` : '\nAlles in Ordnung.');
process.exit(fehler ? 1 : 0);
