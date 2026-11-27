// Prüft die Verfolgungen zu Fuß (js/hatz.js und die Wege in js/story.js), ohne Bildschirm:
//   node tools/hatz.mjs          ("laut" dahinter zeigt, was unterwegs passiert)
// Geprüft wird: Auf den Runden steht nichts im Weg (auch nicht an den Stellen für Otto und die Kollegen), ein gedachter Verfolger,
// der einfach hinterherrennt, fängt den Flüchtenden in vernünftiger Zeit, wer stehen bleibt, verliert ihn, und mit zwei
// Kollegen an den Sperr-Stellen sitzt er in der Falle.
// Der gedachte Verfolger läuft durch Hindernisse hindurch und stolpert über jede Kiste – ein Mensch läuft anders.
import * as HATZ from '../js/hatz.js';
import { DIEB_HATZ, TIMO_HATZ } from '../js/story.js';
import { PLAN, imHindernis } from '../js/stadtplan.js';
import { ORTE } from '../js/daten.js';

const laut = process.argv.includes('laut');
let fehler = 0; const schlecht = t => { fehler++; console.log('  ✗ ' + t); };
const fest = PLAN.fest.concat(ORTE.stadt.marktFest || []);
const frei = (x, z, r) => !fest.some(q => imHindernis(x, z, q, r));

function pruefe(name, def, start, kimStart) {
  console.log(name);
  const W = def.weg, n = W.length; let lang = 0;
  for (let i = 0; i < n; i++) { const [ax, az] = W[i], [bx, bz] = W[(i + 1) % n], d = Math.hypot(bx - ax, bz - az), m = Math.ceil(d * 2); lang += d;
    for (let k = 0; k <= m; k++) if (!frei(ax + (bx - ax) * k / m, az + (bz - az) * k / m, 0.9)) { schlecht(`Stück ${i} → ${(i + 1) % n}: etwas steht im Weg bei (${(ax + (bx - ax) * k / m).toFixed(1)}, ${(az + (bz - az) * k / m).toFixed(1)})`); break; } }
  for (const p of (def.sperren || []).concat(def.otto ? [def.otto] : [])) { if (!frei(p[0], p[1], 0.6)) schlecht(`Sperr-Stelle (${p}) liegt in einem Hindernis`);
    if (!W.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 3)) schlecht(`Sperr-Stelle (${p}) liegt nicht an der Runde`); }
  for (const i of def.wurf || []) if (i >= n) schlecht(`Wurf-Stelle ${i} gibt es nicht`);
  console.log(`  Runde: ${n} Punkte, ${Math.round(lang)} m`);

  // Ein Verfolger. art: 'rennt' = immer geradewegs hinterher, 'steht' = bleibt stehen. helfer = Kollegen an den Sperr-Stellen (ab Sekunde 12)
  function lauf(art, mitHelfern, vorlauf) {
    const H = HATZ.neueHatz(def, start), kim = { x: kimStart[0], z: kimStart[1] }, dt = 1 / 60; let t = 0, haken = 0, stolper = 0, daneben = 0;
    if (vorlauf) { H.vorlauf = true; for (let i = 0; i < 360; i++) HATZ.hatzSchritt(H, dt, kim, []); HATZ.hatzLos(H); }
    for (; t < 200; t += dt) {
      const helfer = mitHelfern && t > 12 ? def.sperren.map(p => ({ x: p[0], z: p[1] })) : [];
      for (const e of HATZ.hatzSchritt(H, dt, kim, helfer)) { if (e.art === 'haken') haken++; if (e.art === 'stolper') stolper++; if (laut) console.log(`    ${t.toFixed(1)} s: ${e.art}`); }
      if (H.phase === 'weg') return { aus: 'weg', t, haken, stolper };
      if (art === 'rennt') { const dx = H.x - kim.x, dz = H.z - kim.z, d = Math.hypot(dx, dz) || 1, v = HATZ.KIM_TEMPO * H.kimMal; if (d > 0.8) { kim.x += dx / d * v * dt; kim.z += dz / d * v * dt; }
        if (H.nah || (H.phase === 'gestellt' && d < 3)) { const wie = HATZ.hatzGriff(H); if (wie) return { aus: wie, t, haken, stolper, daneben }; daneben++; } }
    }
    return { aus: 'läuft noch', t, haken, stolper };
  }
  const a = lauf('rennt', false, !!def.vorlauf), b = lauf('steht', false, false), c = lauf('rennt', true, !!def.vorlauf);
  console.log(`  hinterherrennen: ${a.aus} nach ${a.t.toFixed(0)} s (${a.haken} Haken, ${a.stolper}-mal gestolpert)`);
  console.log(`  stehen bleiben:  ${b.aus} nach ${b.t.toFixed(0)} s`);
  console.log(`  mit Möwe 12:     ${c.aus} nach ${c.t.toFixed(0)} s (${c.haken} Haken)`);
  if (a.aus !== 'stoss' && a.aus !== 'halt') schlecht('Wer hinterherrennt, fängt ihn nicht');
  if (a.t < 8) schlecht('Die Verfolgung ist zu schnell vorbei'); if (a.t > 75) schlecht('Die Verfolgung dauert zu lange');
  if (b.aus !== 'weg') schlecht('Wer stehen bleibt, sollte ihn verlieren');
  if (!['gestellt', 'stoss', 'halt'].includes(c.aus)) schlecht('Mit Kollegen an den Sperr-Stellen wird er nicht gefasst');
}
const von = id => { const l = ORTE.stadt.leute.find(q => q.id === id); return [l.x, l.z]; };
pruefe('Taschendieb auf dem Markt', DIEB_HATZ, von('w2'), [von('w2')[0] + 1.5, von('w2')[1] + 1.5]);
pruefe('Timo am Finkenstieg', TIMO_HATZ, von('timo'), [-338, 572]);       // Kim steht mit dem Streifenwagen ein Stück die Straße hinauf
console.log(fehler ? `${fehler} Fehler.` : 'Alles in Ordnung.');
process.exit(fehler ? 1 : 0);
