// ============================================================
//  Sprachaufnahmen: Wer sagt was mit welcher Stimme?
//
//  node tools/sprache.mjs            zeigt je Person, wie viele Sätze es gibt und welche Aufnahmen fehlen,
//                                    und schreibt sprache/liste.json neu (das liest das Spiel)
//  node tools/sprache.mjs json       gibt die fehlenden Sätze als Liste aus (Stimme, Datei, Text zum Sprechen)
//  node tools/sprache.mjs alle       zeigt jeden Satz
//  node tools/sprache.mjs aufraeumen löscht Aufnahmen, zu denen es keinen Satz mehr gibt
//
//  Das Werkzeug liest js/story.js und js/daten.js und sammelt alles, was in einer Sprechblase steht:
//  S.sag(wer, text), die Frage bei S.wahl(wer, frage, …) und die Sätze zum Ansehen (sieh).
//  Auch die Antworten zum Antippen gehören dazu: Kim spricht die gewählte Antwort.
//  Jeder Satz bekommt die Datei sprache/<ordner>/<kennung>.mp3 – die Kennung wird aus Sprecher und Text
//  berechnet. Ändert man einen Satz, hat er also keine Aufnahme mehr, bis neu aufgenommen ist.
//  Die Aufnahmen kommen aus der Sprachausgabe von 3D AI Studio (eingebaute Stimmen, Sprache Deutsch).
// ============================================================
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Wer spricht mit welcher Stimme? Name wie in der Sprechblase → [Ordner, Stimme bei 3D AI Studio, Ruhe der Stimme].
// Eine Figur behält ihre Stimme für immer – sonst klingt Otto an Tag 2 plötzlich anders.
// '' ist der Erzähler. Lotte ist ein Hund und bellt (sounds/hund.mp3), sie bekommt keine Aufnahme.
export const STIMMEN = {
  '': ['erzaehler', 'Brian', 0.7],
  'Otto Brandl': ['otto', 'Bill', 0.5],
  'Kim': ['kim', 'Liam', 0.5],
  'Harms': ['harms', 'Callum', 0.5],
  'Selin Aydin': ['selin', 'Rachel', 0.5],
  'Leitstelle (Frau Petersen)': ['leitstelle', 'Alice', 0.6],
  'Timo': ['timo', 'Will', 0.4],
  'Junger Mann': ['timo', 'Will', 0.4],            // das ist Timo, bevor man seinen Namen kennt
  'Mann': ['dieb', 'Chris', 0.45],                 // der Taschendieb
  'Herr Brinkmann': ['brinkmann', 'George', 0.45],
  'Dr. Thomsen': ['thomsen', 'Lily', 0.5],
  'Jan Dirks': ['dirks', 'Roger', 0.5],
  'Meike Tammen': ['tammen', 'Jessica', 0.5],
  'Ben Okafor': ['okafor', 'Eric', 0.5],
  'Hanne': ['hanne', 'Lily', 0.5],
  'Linh Lührs': ['luehrs', 'Laura', 0.5],
  'Frau Jansen': ['jansen', 'Matilda', 0.4],
  'Frau Wolters': ['wolters', 'Sarah', 0.4],
  'Radfahrerin': ['radfahrerin', 'Aria', 0.45],
  'Erzieherin': ['erzieherin', 'Charlotte', 0.5],
  'Frau Nguyen': ['nguyen', 'Charlotte', 0.5],
  'Bäcker Kruse': ['kruse', 'Charlie', 0.5],
  'Herr Janßen': ['janssen', 'Charlie', 0.5],
  'Mann am Stand': ['marktmann', 'Roger', 0.5],
};
const STUMM = ['Lotte'];

// Kennung aus Sprecher und Text (immer dieselbe für denselben Satz)
export function kennung(wer, text) {
  let h = 0x811c9dc5;
  for (const c of wer + '|' + text) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

// So wird ein Satz gesprochen: ohne Bildchen, Zahlen und Kürzel ausgeschrieben.
const ERSETZEN = [
  [/\s*\((🎒|📻|📓)\)/gu, ''], [/ auf 🚨/gu, ' auf den Knopf'], [/[🎒📻📓🚨👁💬✋🔍]/gu, ''],
  [/\b(\d{1,2}):00 Uhr/g, '$1 Uhr'], [/\b(\d{1,2}):(\d\d) Uhr/g, '$1 Uhr $2'],
  [/MB-0417/g, 'M B, null vier eins sieben'], [/MB-0471/g, 'M B, null vier sieben eins'], [/MÖ-KB 512/g, 'M Ö, K B, fünf eins zwei'],
  [/\b1702\b/g, 'siebzehnhundertzwei'], [/Möwe 7/g, 'Möwe sieben'], [/fehlen noch 1 Spuren/g, 'fehlt noch eine Spur'], [/\b0417\b/g, 'null vier eins sieben'], [/\b0471\b/g, 'null vier sieben eins'], [/\b35 Euro/g, 'fünfunddreißig Euro'], [/\b4172\b/g, 'vier eins sieben zwei'],
  [/MÖ-TR 388/g, 'M Ö, T R, drei acht acht'], [/Möwe 14/g, 'Möwe vierzehn'], [/Möwe 12/g, 'Möwe zwölf'], [/Möwe 9/g, 'Möwe neun'],
  [/\s–\s/g, ', '], [/„|“/g, ''],
];
export function sprechtext(text) {
  let t = text;
  for (const [a, b] of ERSETZEN) t = t.replace(a, b);
  // Was in Klammern steht, ist eine Regieanweisung („Er lächelt dünn …“): Das liest in der Sprechblase jeder selbst.
  t = t.replace(/\s*\([^)]*\)/g, '');
  return t.replace(/\s+/g, ' ').trim();
}

// ------------------------------------------------------------------ Sätze aus dem Programm holen
const src = readFileSync(join(root, 'js/story.js'), 'utf8');
// Einen Aufruf ab der Stelle hinter „(“ zerlegen: die Argumente und alle Texte darin
function aufruf(i) {
  let tiefe = 1, arg = '', args = [], texte = [[]];
  while (i < src.length && tiefe > 0) {
    const c = src[i];
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1, s = '';
      while (src[j] !== c) { if (src[j] === '\\') { s += src[j + 1]; j += 2; } else s += src[j++]; }
      // Merker wie S.hat('halter') oder Vergleiche (=== 'gef2') sind keine Sätze
      if (!/(\(|[=!]==\s*|\+\s*)$/.test(arg) || /(sag|wahl)\($/.test(arg)) texte[texte.length - 1].push(c === '`' && s.includes('${') ? { muster: s } : s);
      arg += src.slice(i, j + 1); i = j + 1; continue;
    }
    if ('([{'.includes(c)) tiefe++;
    if (')]}'.includes(c)) { tiefe--; if (!tiefe) break; }
    if (c === ',' && tiefe === 1) { args.push(arg.trim()); arg = ''; texte.push([]); i++; continue; }
    arg += c; i++;
  }
  args.push(arg.trim());
  return { args, texte };
}
// Namen wie OTTO oder B, die oben oder in einer Aktion festgelegt sind
const NAMEN = {};
for (const m of src.matchAll(/\b([A-Z][A-Z_]*) = '([^']*)'/g)) NAMEN[m[1]] = m[2];
const werVon = a => a.startsWith("'") ? a.slice(1, -1) : NAMEN[a];

// Sätze mit Lücken (`Zelle ${n}, Berger.`): alle Fälle ausrechnen, die im Spiel vorkommen
const GEFANGEN = { 1: { name: 'Timo', wen: 'Timo' }, 2: { name: 'Der Taschendieb', wen: 'den Taschendieb' } };
function fuelle(muster) {
  const faelle = new Set();
  const ns = muster.includes('3 - n') ? [0, 1, 2] : [1, 2];
  for (const n of ns) for (const nr of muster.includes('${nr}') ? [1, 2, 3] : [1]) {
    try { faelle.add(new Function('n', 'nr', 'g', 'GEFANGEN', 'return `' + muster.replace(/`/g, '\\`') + '`')(n, nr, GEFANGEN[n], GEFANGEN)); } catch (e) { /* diesen Fall gibt es nicht */ }
  }
  return [...faelle];
}

const saetze = new Map();       // Kennung → { wer, text }
const unklar = [];
function nimm(wer, text) {
  if (wer === undefined) { unklar.push(text); return; }
  if (STUMM.includes(wer) || !/[a-zäöü]{2}/i.test(sprechtext(text))) return;
  saetze.set(kennung(wer, text), { wer, text });
}
function nimmAlle(wer, liste) { for (const t of liste) for (const s of (t.muster ? fuelle(t.muster) : [t])) nimm(wer, s); }
for (const m of src.matchAll(/S\.sag\(/g)) {
  if (src.lastIndexOf('\n', m.index) >= 0 && src.slice(src.lastIndexOf('\n', m.index), m.index).includes('//')) continue;    // steht in einer Bemerkung
  const a = aufruf(m.index + m[0].length);
  if (a.texte.slice(1).flat().length) nimmAlle(werVon(a.args[0]), a.texte.slice(1).flat());
}
for (const m of src.matchAll(/S\.wahl\(/g)) {
  if (src.slice(src.lastIndexOf('\n', m.index), m.index).includes('//')) continue;
  const a = aufruf(m.index + m[0].length);
  nimmAlle(werVon(a.args[0]), a.texte[1] || []);
  nimmAlle('Kim', a.texte.slice(2).flat());          // die Antworten zum Antippen: Kim spricht die gewählte
}
// Texte, die über einen Namen geholt werden: die vier Stellen am Wagen und die Spuren im Museum
const STORY = await import(join(root, 'js/story.js'));
for (const liste of ['CHECKS', 'SPUREN']) {
  const m = src.match(new RegExp('const ' + liste + ' = \\{([\\s\\S]*?)\\n\\};'));
  if (!m) { unklar.push(liste + ' nicht gefunden'); continue; }
  const obj = new Function('return {' + m[1] + '}')();
  for (const v of Object.values(obj)) nimm('', Array.isArray(v) ? v[0] : v);
}
// Sätze zum Ansehen (👁)
const { ORTE } = await import(join(root, 'js/daten.js'));
for (const ort of Object.values(ORTE)) for (const d of [...ort.dinge, ...ort.leute]) if (d.sieh) nimm('', d.sieh);
const haupt = readFileSync(join(root, 'js/main.js'), 'utf8').match(/const text = o\.wagen ? '([^']*)'/);
if (haupt) nimm('', haupt[1]);
void STORY;

// ------------------------------------------------------------------ Was gibt es schon?
const ordner = join(root, 'sprache');
const liste = {}, fehlt = [], proWer = {};
for (const [k, s] of saetze) {
  const st = STIMMEN[s.wer];
  const p = (proWer[s.wer] ||= { n: 0, z: 0, da: 0, st });
  p.n++; p.z += sprechtext(s.text).length;
  if (!st) continue;
  const datei = `${st[0]}/${k}.mp3`;
  if (existsSync(join(ordner, datei))) { liste[s.wer + '|' + s.text] = datei; p.da++; }
  else fehlt.push({ wer: s.wer, stimme: st[1], ruhe: st[2], datei, text: s.text, sprich: sprechtext(s.text) });
}

const was = process.argv[2];
if (was === 'json') { console.log(JSON.stringify(fehlt, null, 1)); process.exit(0); }
if (was === 'aufraeumen' && existsSync(ordner)) {
  const gut = new Set(Object.values(liste));
  for (const o of readdirSync(ordner, { withFileTypes: true })) if (o.isDirectory()) for (const f of readdirSync(join(ordner, o.name))) {
    if (f.endsWith('.mp3') && !gut.has(o.name + '/' + f)) { unlinkSync(join(ordner, o.name, f)); console.log('gelöscht: ' + o.name + '/' + f); }
  }
}
mkdirSync(ordner, { recursive: true });
writeFileSync(join(ordner, 'liste.json'), JSON.stringify(liste, null, 0) + '\n');

let N = 0, Z = 0, DA = 0, C = 0;
console.log('Wer'.padEnd(30) + 'Stimme'.padEnd(11) + 'Sätze  Zeichen  Aufnahmen');
for (const [wer, p] of Object.entries(proWer).sort((a, b) => b[1].z - a[1].z)) {
  console.log((wer || 'Erzähler').padEnd(30) + (p.st ? p.st[1] : '— KEINE —').padEnd(11) + String(p.n).padStart(5) + String(p.z).padStart(9) + String(p.da).padStart(11));
  N += p.n; Z += p.z; DA += p.da;
}
for (const f of fehlt) C += Math.ceil(f.sprich.length / 100);
console.log(`\n${N} Sätze, ${Z} Zeichen, ${DA} Aufnahmen da, ${fehlt.length} fehlen (ein Satz je Aufnahme: etwa ${C} Credits).`);
if (was === 'alle') for (const s of saetze.values()) console.log(`  ${s.wer || '·'}: ${s.text}`);
let fehler = 0;
for (const t of unklar) { fehler++; console.log('FEHLER: Sprecher nicht erkannt bei: ' + JSON.stringify(t).slice(0, 90)); }
for (const [wer, p] of Object.entries(proWer)) if (!p.st) { fehler++; console.log(`FEHLER: „${wer}“ hat keine Stimme (STIMMEN oben in tools/sprache.mjs)`); }
process.exit(fehler ? 1 : 0);
