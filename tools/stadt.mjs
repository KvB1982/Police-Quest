// Prüft die große Stadt ohne Bildschirm:  node tools/stadt.mjs
//   - der Stadtplan: wie viele Straßen, Häuser, Bäume; kein Haus steht auf einer Straße, alle Straßen hängen zusammen
//   - die Stellen der Geschichte (Tag 1) sind frei, man kommt zu Fuß hin
//   - der Verkehr: zwei Minuten vorspulen – niemand fährt ineinander, niemand bleibt für immer stehen, kein Fußgänger läuft im Haus
import { PLAN, GROSS, FLEET, BESONDERE, woBinIch, imHindernis } from '../js/stadtplan.js';
import { ORTE } from '../js/daten.js';
import { neuerVerkehr } from '../js/verkehr.js';

let fehler = 0;
const pruefe = (ok, text) => { console.log((ok ? '  ok      ' : '  FEHLER  ') + text); if (!ok) fehler++; };
const P = PLAN;

console.log(`Stadt: ${GROSS[2] - GROSS[0]} m breit, ${GROSS[3] - GROSS[1]} m tief · ${P.wege.length} Straßen · ${P.knoten.length} Kreuzungen · ${P.kanten.length} Straßenstücke`);
console.log(`       ${P.haeuser.length} Häuser · ${P.baeume.length} Bäume · ${P.laternen.length} Laternen · ${P.parker.length} parkende Autos · ${P.deko.length} Kleinteile`);
pruefe(P.haeuser.length > 1300, 'mehr als 1300 Häuser');
const arten = new Set(P.wege.map(W => W.art));
pruefe(['gasse', 'ring', 'autobahn', 'sack'].every(a => arten.has(a)), 'es gibt Gassen, Ringstraßen, Sackgassen und eine Autobahn');
const schraeg = P.haeuser.filter(h => Math.abs(Math.sin(2 * h.dreh)) > 0.2).length;
pruefe(schraeg > P.haeuser.length * 0.3, `viele Häuser stehen schräg (${schraeg}) – die Stadt ist kein Schachbrett mehr`);
// Jedes Haus an fünf Stellen prüfen (Mitte und vier Ecken, die Ecken ein Stück nach innen gerückt)
const proben = h => [[h.x, h.z], ...h.ecken.map(p => [h.x + (p[0] - h.x) * 0.9, h.z + (p[1] - h.z) * 0.9])];
const aufStrasse = P.haeuser.filter(h => !h.fest && proben(h).some(([x, z]) => { const n = P.strasseNah(x, z); return n[1] && n[3] < n[1].b / 2 - 0.3; }));
pruefe(aufStrasse.length === 0, `kein Haus steht auf einer Fahrbahn (${aufStrasse.length}${aufStrasse.length ? ': ' + aufStrasse.slice(0, 3).map(h => `${h.schild || h.typ} ${h.x | 0}/${h.z | 0}`).join(', ') : ''})`);
const imWasser = P.haeuser.filter(h => proben(h).some(([x, z]) => x > FLEET[0] && x < FLEET[2] && z > FLEET[1] && z < FLEET[3]));
pruefe(imWasser.length === 0, `kein Haus steht im Fleet (${imWasser.length})`);
pruefe(P.haeuser.filter(h => h.typ === 'besonders').length === BESONDERE.length, `alle ${BESONDERE.length} besonderen Häuser haben einen Platz gefunden`);
pruefe(P.bruecken.length >= 4 && P.uebergaenge.length >= 2, `${P.bruecken.length} Brücken über das Fleet, ${P.uebergaenge.length} Bahnübergänge`);
// Kommt man von jeder Kreuzung zu jeder anderen? (Sonst gäbe es Straßen, zu denen kein Weg führt.)
const gesehen = new Set([0]), offen = [0];
while (offen.length) { const k = offen.pop(); for (const e of P.knoten[k].kanten) { const n = e.a === k ? e.b : e.a; if (!gesehen.has(n)) { gesehen.add(n); offen.push(n); } } }
pruefe(gesehen.size === P.knoten.length, `alle Straßen hängen zusammen (${gesehen.size} von ${P.knoten.length} Kreuzungen erreichbar)`);
const kurz = P.kanten.filter(e => e.l < 14);
pruefe(kurz.length === 0, `keine Kreuzungen direkt hintereinander (${kurz.length})`);

// Die Stellen der Geschichte: Dinge und Leute in der Stadt dürfen nicht in einem Haus oder Baum stecken
const S = ORTE.stadt;
for (const d of [...S.dinge, ...S.leute]) {
  if (d.x === undefined) continue;
  const zu = P.fest.find(q => imHindernis(d.x, d.z, q, d.art === 'tuer' ? -0.5 : 0.2));
  pruefe(!zu, `${d.name} (${d.x}, ${d.z}) ist frei – ${woBinIch(d.x, d.z)}`);
}
pruefe(woBinIch(40, 0) === 'Wachstraße', 'vor der Wache heißt die Straße Wachstraße');

// Verkehr: an fünf Stellen der Stadt je zwei Minuten laufen lassen
const t0 = Date.now(); let v, sp, eng = 0, imHaus = 0, fest = 0, wenig = 0;
for (const [sx, sz] of [[-300, 300], [0, 700], [450, 200], [-640, 140], [40, 0]]) {
  v = neuerVerkehr(); sp = { x: sx, z: sz, r: 0.4 }; const standZeit = new Map();
  for (let i = 0; i < 60 * 120; i++) {
    v.schritt(1 / 60, sp, false);
    if (i % 30) continue;
    for (const a of v.autos) { if (!a.da) continue;
      standZeit.set(a, a.v < 0.05 ? (standZeit.get(a) || 0) + 0.5 : 0);
      for (const b of v.autos) if (a !== b && b.da && Math.hypot(a.x - b.x, a.z - b.z) < 2.2) eng++; }
    for (const m of v.leute) if (m.da && P.fest.some(q => imHindernis(m.x, m.z, q, -0.2))) imHaus++;
  }
  if (v.autos.filter(a => a.da).length < 30) wenig++;
  // Wer vor dir steht, darf warten (du stehst ja vielleicht auf der Straße). Alle anderen dürfen nicht ewig stehen.
  fest += [...standZeit].filter(([a, t]) => t > 40 && Math.hypot(a.x - sp.x, a.z - sp.z) > 60).length;
}
console.log(`Verkehr: ${v.autos.filter(a => a.da).length} Autos, ${v.leute.filter(m => m.da).length} Fußgänger, 5-mal 2 Minuten in ${Date.now() - t0} ms`);
pruefe(wenig === 0, 'überall genug Autos unterwegs');
pruefe(eng === 0, `kein Auto fährt in ein anderes (${eng / 2} Mal zu nah)`);
pruefe(fest === 0, `kein Auto steht länger als 40 Sekunden (${fest})`);
pruefe(imHaus === 0, `kein Fußgänger läuft durch ein Haus oder einen Baum (${imHaus})`);
// Rettungsgasse: mit Blaulicht halten alle in der Nähe
for (let i = 0; i < 60 * 6; i++) v.schritt(1 / 60, sp, true);
const nah = v.autos.filter(a => a.da && !a.kurve && Math.hypot(a.x - sp.x, a.z - sp.z) < 50);
pruefe(nah.every(a => a.v < 0.5), `mit Blaulicht halten die ${nah.length} Autos in der Nähe an`);

console.log(fehler ? `\n${fehler} Fehler` : '\nAlles in Ordnung.');
process.exit(fehler ? 1 : 0);
