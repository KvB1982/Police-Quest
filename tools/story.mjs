// Spielt Tag 1 ohne Bildschirm einmal durch und prüft, ob alles zusammenpasst:
//   node tools/story.mjs          (mit "laut" dahinter zeigt es jeden Satz)
// Geprüft wird: Jede Aktion aus daten.js gibt es in story.js, der Durchlauf kommt bis zum Tagesende,
// und die Punkte bei bestem Vorgehen stimmen mit MAX_PUNKTE überein.
import { ORTE } from '../js/daten.js';
import * as STORY from '../js/story.js';

const laut = process.argv.includes('laut');
let fehler = 0;
const melde = t => { fehler++; console.log('FEHLER: ' + t); };

for (const [name, ort] of Object.entries(ORTE)) for (const d of [...ort.dinge, ...ort.leute]) {
  if (d.akt && !STORY.AKT[d.akt]) melde(`${name}: „${d.id}“ will die Aktion „${d.akt}“, die gibt es nicht`);
  if (d.akt && !d.name) melde(`${name}: „${d.id}“ hat keinen Namen für den Knopf`);
}
for (const z of STORY.ZONEN) if (!STORY.AKT[z.akt]) melde(`Zone ${z.id}: Aktion „${z.akt}“ fehlt`);

function spiele(durchlauf) {
  const Z = { flags: {}, punkte: 0, sachen: [], notizen: [], ort: STORY.START.ort, blau: false, ende: false };
  let antworten = [];
  const S = {
    sag: async (wer, t) => { if (laut) console.log(`  ${wer || '·'}: ${t}`); },
    wahl: async (wer, frage, liste) => {
      if (!antworten.length) throw new Error(`Keine Antwort mehr für: ${frage}`);
      const a = antworten.shift(); if (laut) console.log(`  ? ${frage} → ${liste[a]}`); return a;
    },
    schloss: async () => '4172',
    flag: n => { Z.flags[n] = true; }, hat: n => !!Z.flags[n], wo: () => Z.ort,
    punkte: n => { Z.punkte += n; }, notiz: t => Z.notizen.push(t), gib: s => Z.sachen.push(s),
    ziel: () => {}, ort: n => { if (!ORTE[n]) melde(`Ort „${n}“ gibt es nicht`); Z.ort = n; }, auto: () => {}, licht: () => {}, uhr: () => {},
    klang: () => {}, blaulicht: () => true, speichern: () => {}, ende: async () => { Z.ende = true; },
  };
  return (async () => {
    await STORY.beginn(S);
    for (const [akt, id, antw] of durchlauf) {
      antworten = [...antw];
      if (akt.startsWith('f_') && !STORY.funk(S).some(o => o.akt === akt)) melde(`Funk „${akt}“ wird an dieser Stelle nicht angeboten`);
      const def = id ? Object.values(ORTE).flatMap(o => [...o.dinge, ...o.leute]).find(d => d.id === id) : null;
      if (id && !def) melde(`Ding „${id}“ gibt es nicht`);
      if (laut) console.log(`\n[${akt}${id ? ' ' + id : ''}]`);
      await STORY.AKT[akt](S, def);
      if (antworten.length) melde(`${akt}: ${antworten.length} Antwort(en) nicht gebraucht`);
    }
    return Z;
  })();
}

const Z = await spiele(STORY.DURCHLAUF);
if (!Z.ende || !Z.flags.tagEnde) melde('Der Durchlauf kommt nicht bis zum Tagesende');
// Bester Durchlauf: überall gleich die richtige Antwort
const dran = {};
const beste = STORY.DURCHLAUF.filter(e => !e[3]).map(([a, i, w]) => {
  const liste = STORY.BESTE[`${a}:${i}`] || STORY.BESTE[a];
  if (!liste) return [a, i, w];
  const k = `${a}:${i}`; dran[k] = (dran[k] || 0) + 1;
  return [a, i, liste[Math.min(dran[k], liste.length) - 1]];
});
const B = await spiele(beste);
if (B.punkte !== STORY.MAX_PUNKTE) melde(`Beste Punktzahl ist ${B.punkte}, in story.js steht MAX_PUNKTE = ${STORY.MAX_PUNKTE}`);
console.log(`Durchlauf mit Fehlversuchen: ${Z.punkte} Punkte, bester Durchlauf: ${B.punkte} Punkte, ${B.notizen.length} Notizen.`);
console.log(fehler ? `${fehler} Fehler.` : 'Alles in Ordnung.');
process.exit(fehler ? 1 : 0);
