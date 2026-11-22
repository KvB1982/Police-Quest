// Blaulicht über Möwenbrück – das Spiel selbst: Bild, Steuerung, Laufen, Fahren.
// Die Geschichte steht in story.js, die Orte in daten.js, die 3D-Formen in welt.js, die Kästen in oberflaeche.js.
//
// Richtungen: Ein Winkel h bedeutet "schaut nach (sin h, cos h)". h = 0 schaut zur Kamera (+z), links ist dann +x.

import * as THREE from 'three';
import { ORTE } from './daten.js';
import * as STORY from './story.js';
import * as UI from './oberflaeche.js';
import * as KLANG from './klang.js';
import { Neigung } from './neigung.js';
import { baueOrt, figur, figurBewegen, figurLeben, autoModell, autoRaeder, spiegelBild } from './welt.js';
import { ladePolizist, polizistSpiele, polizistBewegen } from './polizist.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as BILD from './bilder.js';
import * as KARTE from './karte.js';
import { baueHimmel } from './himmel.js';
import { baueWetter } from './wetter.js';
import { baueUmland } from './umland.js';
import { neuerVerkehr } from './verkehr.js';
import { baueVerkehr } from './verkehrbau.js';
import { woBinIch, UFER, imHindernis } from './stadtplan.js';
import * as JAGD from './jagd.js';

// ------------------------------------------------------------------ Zahlen zum Einstellen
const LAUF_TEMPO = 4.6;          // Meter pro Sekunde zu Fuß
const NAH = 2.1;                 // so nah muss man an etwas heran, um es zu benutzen
const LAMPE_WINKEL = 0.8;        // halbe Breite des Lichtkegels (Bogenmaß)
const GAS = 7, BREMSE = 14, ROLLEN = 1.6;      // Auto: schneller werden, bremsen, ausrollen (m/s²)
const V_MAX = 19, V_MAX_BLAU = 26;             // Höchsttempo ohne und mit Blaulicht (m/s)
// Das Blaulicht hat drei Stufen: 0 = aus, 1 = nur Blaulicht (leise, z. B. zum Absichern), 2 = Blaulicht mit Sirene.
// Schnell fahren darf man mit Stufe 1 und 2. Platz machen Autos und Fußgänger bei Stufe 1 und 2; für eine Verfolgung verlangt Otto die Sirene (Stufe 2).
const AUS = 0, BLAU = 1, SIRENE = 2;
const TREFF_MAUS = 46, TREFF_FINGER = 64;      // so nah (in Bildpunkten) muss ein Klick oder Fingertipp an einem Ding sein, damit es gemeint ist
const MARKEN_ZEIT = 4;                         // so lange zeigt die Lupe 🔍 die Namen aller Dinge (Sekunden)
const ZU_SCHNELL = 58;           // ab so vielen km/h ohne Blaulicht schimpft Otto
const SPEICHER = 'blaulicht.stand.v1';

const LICHT = {                  // Himmel (drinnen), Licht von oben, Sonne, Taschenlampe, Scheinwerfer, Farbe der Sonne
  tag: { himmel: '#9fd3f2', oben: 2.0, sonne: 2.6, lampe: 0, auto: 0 },
  abend: { himmel: '#e39a6b', oben: 1.15, sonne: 1.5, lampe: 0, auto: 250, farbe: '#ffa868' },
  nacht: { himmel: '#0b1430', oben: 0.5, sonne: 0.3, lampe: 25, auto: 500, farbe: '#9db8ff' },
  dunkel: { himmel: '#040508', oben: 0.32, sonne: 0, lampe: 70, auto: 0 },
};
const SICHT = 4300;              // so weit sieht man in der Stadt, dahinter verschwindet alles im Dunst
const SCHATTEN = 95;             // die Sonne wirft Schatten in diesem Umkreis um dich (Meter)
const SCHNITT_VOR = 0.5;         // zu Fuß wird von der Stadt alles weggeschnitten, was mehr als so viele Meter vor dir (zur Kamera hin) steht

// ------------------------------------------------------------------ Spielstand
let Z = neuerStand();
function neuerStand() {
  return { flags: {}, punkte: 0, sachen: [], notizen: [], ziel: null, ort: STORY.START.ort, licht: STORY.START.licht, uhr: STORY.START.uhr,
    imAuto: false, blaulicht: AUS, auto: { x: 0, z: 0, h: 0, v: 0 }, sp: { x: STORY.START.x, z: STORY.START.z } };
}
const spieler = { x: 0, z: 0, h: Math.PI, tap: null, tempo: 0 };
let welt = null;
let beschaeftigt = false;        // true, solange die Geschichte gerade etwas erzählt
const tasten = {};

// ------------------------------------------------------------------ Bild
const canvas = document.getElementById('bild');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.localClippingEnabled = true;                 // damit Häuser vor der Kamera aufgeschnitten werden können
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const szene = new THREE.Scene();
const WINKEL = 50, WINKEL_DRINNEN = 34;      // Blickwinkel der Kamera in Grad: draußen weit, drinnen eng (sieht weniger verzerrt aus)
const kamera = new THREE.PerspectiveCamera(WINKEL, 1, 0.8, 12000);
const blick = new THREE.Vector3();
const oben = new THREE.HemisphereLight('#ffffff', '#8a8a7a', 2);
const sonne = new THREE.DirectionalLight('#fff4e0', 1.5); sonne.position.set(30, 60, 40);
sonne.shadow.mapSize.set(2048, 2048); sonne.shadow.bias = -0.0006; sonne.shadow.normalBias = 0.35;
Object.assign(sonne.shadow.camera, { left: -SCHATTEN, right: SCHATTEN, top: SCHATTEN, bottom: -SCHATTEN, near: 10, far: 700 });
const lampe = new THREE.SpotLight('#fff6d8', 0, 16, 0.55, 0.45, 1.3);
szene.add(oben, sonne, sonne.target, lampe, lampe.target);
// Spar-Modus: Ist das Gerät zu langsam für die große Stadt, schaltet das Spiel von selbst die Schatten ab und rechnet weniger Bildpunkte.
// Mit ?einfach in der Adresse ist er von Anfang an eingeschaltet, mit ?schoen bleibt immer alles an.
const WUNSCH = new URLSearchParams(location.search);
let sparsam = WUNSCH.has('einfach'), langsam = 0, gemessen = 0;
if (sparsam) renderer.setPixelRatio(1);
function tempoMessen(dt) {
  if (sparsam || WUNSCH.has('schoen') || !welt.stadt || window.__polizei.angehalten) return;
  gemessen++; if (dt > 0.042) langsam++;            // langsamer als etwa 24 Bilder pro Sekunde
  if (gemessen < 150) return;
  if (langsam > 100) { sparsam = true; renderer.setPixelRatio(1); groesse(); sonne.castShadow = false; UI.toast('Spar-Modus: ohne Schatten, damit es flüssig läuft'); }
  gemessen = langsam = 0;
}
// Himmel, Umland und Verkehr gibt es nur draußen in der Stadt. Sie werden beim Start einmal gebaut.
let himmel = null, umland = null, verkehr = null, verkehrBild = null;
let wetter = null;               // Regen, Wind, Nebel, Gewitter (wetter.js) – legt sich über das Licht von Tag, Abend und Nacht

const kim = figur({ hemd: '#2b4c9b', hose: '#1b2a4a', haut: '#f0c8a0', haar: '#7a4a22', muetze: '#f4f4f4' });
// Kamera im Auto: so viele Meter hinter dem Wagen und so hoch. Kleiner = der Wagen ist größer im Bild.
const KAMERA_AUTO = [8.2, 4.1];
// So stark spiegelt der Lack des Streifenwagens bei welchem Licht.
const SPIEGELN = { tag: 0.9, abend: 0.5, nacht: 0.22, dunkel: 0.12 };
const wagen = autoModell('#f4f4f4', true);
// Damit der Lack des Streifenwagens glänzt, braucht er etwas zum Spiegeln: ein unsichtbares helles Zimmer rund um das Auto.
{ const pm = new THREE.PMREMGenerator(renderer); spiegelBild(pm.fromScene(new RoomEnvironment(), 0.04).texture); pm.dispose(); }
const zielSaeule = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 120, 20, 1, true),
  new THREE.MeshBasicMaterial({ color: '#ffd23a', transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
kim.traverse(o => { if (o.isMesh) o.castShadow = true; }); ladePolizist(kim); wagen.traverse(o => { if (o.isMesh) o.castShadow = true; });
// Für die Verfolgungsfahrt: der Fluchtwagen (man sieht ihn nur, wenn die Geschichte ihn braucht)
const fluchtwagen = autoModell('#1c2333');
fluchtwagen.visible = false; fluchtwagen.traverse(o => { if (o.isMesh) o.castShadow = true; });
let jagd = null;
szene.add(kim, wagen, zielSaeule, fluchtwagen);

function groesse() {
  renderer.setSize(innerWidth, innerHeight, false);
  kamera.aspect = innerWidth / innerHeight; kamera.updateProjectionMatrix();
}
addEventListener('resize', groesse); groesse();

// So groß ist das Feld, in dem die Sonne Schatten wirft (halbe Breite in Metern). Kleiner = schärfere Schatten.
function schattenFeld(r) {
  const k = sonne.shadow.camera; if (k.right === r) return;
  Object.assign(k, { left: -r, right: r, top: r, bottom: -r }); k.updateProjectionMatrix(); sonne.shadow.normalBias = r < 60 ? 0.06 : 0.35; sonne.shadow.bias = r < 60 ? -0.0004 : -0.0006;
}
function lichtSetzen(name) {
  Z.licht = name;
  const l = LICHT[name], draussen = !!(welt && welt.stadt);
  oben.intensity = l.oben; sonne.intensity = l.sonne; sonne.color.set(l.farbe || '#fff4e0');
  lampe.intensity = l.lampe; wagen.userData.sw.intensity = l.auto;
  if (wagen.userData.lack) wagen.userData.lack.envMapIntensity = SPIEGELN[name] ?? 0.5;
  const innen = !draussen && ORTE[Z.ort].schatten;       // auch die Wache hat Schatten: Sie ist klein, das kostet fast nichts
  sonne.castShadow = (draussen || !!innen) && name !== 'dunkel' && !sparsam;
  schattenFeld(innen ? innen : SCHATTEN);
  if (draussen && himmel) {
    // In der Stadt: echter Himmel mit Wolken, Dunst in der Ferne, Fenster und Laternen an oder aus
    const lampen = wetter ? wetter.lampen(name) : name;         // bei Gewitter gehen auch am Tag die Lichter an
    himmel.setze(name); umland.licht(lampen); verkehrBild.licht(lampen); welt.stadt.licht(lampen);
    szene.background = new THREE.Color(himmel.dunst);
    szene.fog = new THREE.Fog(himmel.dunst, name === 'tag' ? 260 : 160, name === 'tag' ? SICHT : SICHT * 0.75);
    oben.color.set(name === 'nacht' ? '#8fa4d8' : name === 'abend' ? '#ffd9c0' : '#ffffff'); oben.groundColor.set(name === 'nacht' ? '#1a2238' : '#8a8a7a');
  } else {
    szene.background = new THREE.Color(l.himmel);
    szene.fog = new THREE.Fog(l.himmel, name === 'dunkel' ? 30 : 120, name === 'dunkel' ? 60 : 420);
    oben.color.set('#ffffff'); oben.groundColor.set('#8a8a7a');
    const [mx, mz] = ORTE[Z.ort].mitte || [0, 0]; sonne.position.set(mx + 38, 80, mz + 46); sonne.target.position.set(mx, 0, mz);
  }
  if (wetter) wetter.basis(name, draussen);       // das Wetter merkt sich diese Einstellung und legt sich darüber
}

// ------------------------------------------------------------------ Orte wechseln
function ortLaden(name, x, z) {
  if (welt) szene.remove(welt.gruppe);
  Z.ort = name;
  welt = baueOrt(ORTE[name]);
  szene.add(welt.gruppe);
  for (const g of [himmel, umland, verkehrBild]) if (g) { if (welt.stadt) szene.add(g.gruppe); else szene.remove(g.gruppe); }
  rasterBauen();
  lichtSetzen(Z.licht);
  KARTE.radarZeigen(!!welt.stadt);
  spieler.x = x; spieler.z = z; spieler.tap = null;
  wagen.visible = name === 'stadt';
  for (const o of welt.objekte) if (o.def.folgt) { o.x = x + 1.2; o.z = z + 1.2; }
  sichtbarkeit();
  kameraSetzen(1);
}

// Welche Dinge und Leute gibt es gerade? Das hängt von den Merkern der Geschichte ab.
function sichtbarkeit() {
  if (!welt) return;
  for (const o of welt.objekte) {
    const d = o.def;
    o.da = !!((!d.wenn || Z.flags[d.wenn]) && (!d.bis || !Z.flags[d.bis]));
    o.mesh.visible = o.da && !(d.folgt && Z.imAuto);
  }
  welt.lose = welt.objekte.filter(o => o.da && o.fest).map(o => o.fest);      // Dinge, die kommen und gehen (der falsch geparkte Kombi …)
  if (!welt.raster) welt.lose = welt.fest.concat(welt.lose);
  gitter = null;      // die Kästchen für die Wegsuche werden beim nächsten Tippen neu gerechnet
}

// ------------------------------------------------------------------ Werkzeug für die Geschichte (siehe story.js)
let sprecher = '', aktiv = null;       // wer gerade spricht und mit wem oder was man gerade zu tun hat (für die kleinen Bewegungen der Figuren)
const S = {
  sag: (wer, text) => { sprecher = wer; return UI.dialog(wer, text).then(() => { sprecher = ''; }); },
  // Etwas aufgehen (oder zugehen) lassen: eine Tür, den Spind, den Stahlschrank. Wartet, bis es offen ist.
  // Kim macht eine Bewegung vor ('ziehen', 'wegstecken' …). Im Auto passiert nichts.
  zeig(name, halten = false) { if (Z.imAuto || !kim.userData.mixer) return;
    // Waffe ziehen und im Anschlag bleiben, bis 'wegstecken' kommt
    if (name === 'ziehen' && halten) polizistSpiele(kim, 'ziehen', { dann: 'zielen' });
    else polizistSpiele(kim, name, { halten, dann: name === 'wegstecken' ? null : undefined }); },
  oeffne(id, auf = true) {
    const k = welt.klappen[id]; if (!k) return Promise.resolve();
    k.soll = auf ? 1 : 0; KLANG.spiel('tuer', 0.6);
    return new Promise(fertig => { k.wartet = fertig; });
  },
  wahl: (wer, frage, antworten) => UI.wahl(wer, frage, antworten),
  schloss: titel => UI.schloss(titel),
  flag: n => { Z.flags[n] = true; },
  hat: n => !!Z.flags[n],
  wo: () => Z.ort,
  punkte(n, wofuer) { Z.punkte = Math.max(0, Z.punkte + n); UI.toast(`${n > 0 ? '+' : ''}${n} ⭐ ${wofuer}`); if (n > 0) KLANG.spiel('pling'); anzeigen(); },
  notiz(t) { if (!Z.notizen.includes(t)) Z.notizen.push(t); },
  gib(s) { if (!Z.sachen.includes(s)) Z.sachen.push(s); },
  ziel(text, wo) { Z.ziel = { text, wo }; anzeigen(); },
  ort(name, x, z) { ortLaden(name, x, z); KLANG.spiel('tuer'); anzeigen(); },
  klang: name => KLANG.spiel(name),
  auto(an) { Z.imAuto = an; if (an) Z.auto = { x: spieler.x, z: spieler.z, h: -Math.PI / 2, v: 0 }; sichtbarkeit(); kameraSetzen(1); },
  imWagen: () => Z.imAuto,
  licht: lichtSetzen,
  wetter: name => wetter.setze(name),              // ein Wetter festlegen (Namen in wetterplan.js), ohne Namen wieder nach Plan
  blitz: weit => wetter.blitz(weit),               // ein Blitz in der Nähe
  uhr(t) { Z.uhr = t; anzeigen(); },
  blaulicht: () => Z.blaulicht,                    // 0 = aus, 1 = nur Blaulicht, 2 = Blaulicht mit Sirene
  blaulichtAn: stufe => blaulichtSetzen(stufe),
  // Streife fahren: Nach etwa so vielen Sekunden Fahrt meldet sich die Leitstelle, dann kommt die Stelle akt der Geschichte.
  streife(akt, sek = 30) { Z.streife = { akt, rest: sek, ruf: false }; Z.ziel = { text: 'Fahre Streife durch die Stadt, bis sich die Leitstelle meldet', wo: null }; anzeigen(); },
  // Ein Einsatzwagen kommt angefahren: art = 'rtw' (Rettungswagen mit Ärztin und Sanitäter) oder 'streife' (die Kollegen von Möwe 12).
  // ziel = [x, z] wo er hält. wie = { aus: aus welcher Richtung er kommt, zu: [[x, z], [x, z]] wohin die zwei Leute dann gehen, bis: Merker, ab dem er wieder weg ist }
  // Zurück kommt ein Versprechen, das erfüllt ist, sobald der Wagen steht (man muss nicht darauf warten).
  kommt: (art, ziel, wie) => gastRufen(art, ziel, wie),
  // Verfolgung zu Fuß: Die Person id rennt den Weg [[x, z], …] entlang, du läufst hinterher. Zurück kommt true (gefangen) oder false (entwischt).
  verfolge: (id, weg, wie) => laufStart(id, weg, wie),
  // Eine Person geht einen Weg entlang ([[x, z], …]) und bleibt am Ende stehen – zum Beispiel der Festgenommene in seine Zelle.
  fuehre(id, weg) { const o = welt.objekte.find(q => q.def.id === id && q.da); if (!o) return Promise.resolve(); return new Promise(fertig => { o.fuehrt = { weg, i: 0, fertig }; }); },
  jagd: () => JAGD.bilanz(jagd),                   // wie lief die Verfolgung? { rumms, sirene }
  speichern() { Z.sp = { x: spieler.x, z: spieler.z }; try { localStorage.setItem(SPEICHER, JSON.stringify(Z)); } catch (e) { /* kein Speicher: dann eben nicht */ } },
  ende: (titel, text) => UI.ende(titel, text, Z.punkte, STORY.MAX_PUNKTE, Z.notizen),
};

// Eine Stelle der Geschichte abspielen. Solange sie läuft, bleibt die Figur stehen.
async function tu(akt, def) {
  if (beschaeftigt || !STORY.AKT[akt]) return;
  beschaeftigt = true; spieler.tap = null; aktiv = def || null;
  try { await STORY.AKT[akt](S, def); } finally { beschaeftigt = false; aktiv = null; sprecher = ''; sichtbarkeit(); anzeigen(); }
}

function anzeigen() {
  // In der Stadt steht oben links, in welcher Straße oder in welchem Viertel du gerade bist.
  const ort = welt && welt.stadt ? `${woBinIch(spieler.x, spieler.z)} · Möwenbrück` : ORTE[Z.ort].name;
  UI.anzeige({ ziel: Z.ziel && Z.ziel.text, punkte: Z.punkte, uhr: Z.uhr + (wetter ? ' · ' + wetter.bild : ''), ort });
}

// ------------------------------------------------------------------ Dauer-Geräusche (alles andere steht in klang.js)
let schrittZeit = 0;
function geraeusche(dt) {
  const stadt = Z.ort === 'stadt', nah = (x, z, weit) => Math.max(0, 1 - abstand(spieler.x, spieler.z, x, z) / weit);
  KLANG.schleife('sirene', Z.blaulicht === SIRENE ? 1 : 0);
  KLANG.schleife('motor', Z.imAuto ? 0.6 + Math.abs(Z.auto.v) / 40 : 0, 0.8 + Math.abs(Z.auto.v) / 14);
  KLANG.schleife('markt', stadt && Z.licht === 'tag' ? nah(-40, -30, 60) : 0);
  KLANG.schleife('moewen', stadt && Z.licht !== 'nacht' ? 0.25 + Math.max(0, 1 - (spieler.z - UFER) / 160) * 0.75 : 0);      // am Wasser lauter
  KLANG.schleife('alarm', stadt && Z.flags.alarm && !Z.flags.tagEnde ? nah(74, 30, 70) : 0);
  if (!Z.imAuto && spieler.tempo > 0 && (schrittZeit -= dt) <= 0) { schrittZeit = 0.34; KLANG.spiel('schritt'); }
  KLANG.musik(musikWahl());
}

// Welche Hintergrundmusik passt gerade? (Die Stücke und der Schalter stehen in klang.js.)
const HAFEN_NAH = 90;            // so viele Meter vom Ufer weg hört man zu Fuß noch die Hafen-Musik
function musikWahl() {
  if (UI.menueOffen()) return 'titel';
  if (UI.schlossOffen()) return 'raetsel';
  const stadt = Z.ort === 'stadt';
  if (stadt && Z.flags.flucht && !Z.flags.jagdFertig) return 'jagd';
  if (Z.ort === 'museum') return 'museum';
  if (Z.ort === 'wache') return 'wache';
  if (Z.licht === 'nacht' || Z.licht === 'dunkel' || (Z.flags.alarm && !Z.flags.tagEnde)) return 'spannung';
  if (!Z.imAuto && spieler.z - UFER < HAFEN_NAH) return 'hafen';
  return 'streife';
}
const MUSIK_KNOPF = [['🎵', 'Musik: laut'], ['🎵', 'Musik: leise'], ['🔇', 'Musik: aus']];
function musikKnopf(stufe) {
  const b = document.getElementById('kMusik'); if (!b) return;
  b.textContent = MUSIK_KNOPF[stufe][0]; b.title = MUSIK_KNOPF[stufe][1] + ' (Taste U)'; b.classList.toggle('leise', stufe === 1);
}
function musikWeiter() { KLANG.an(); const s = KLANG.musikSchalter(); musikKnopf(s); UI.toast(MUSIK_KNOPF[s][0] + ' ' + MUSIK_KNOPF[s][1]); }
musikKnopf(KLANG.musikStand().stufe);
document.getElementById('kMusik').onclick = musikWeiter;
addEventListener('pointerdown', () => KLANG.an(), { capture: true });      // schon auf dem Startbild: Ton an, sobald man irgendwo tippt

// ------------------------------------------------------------------ Was kann man gerade tun?
function abstand(ax, az, bx, bz) { return Math.hypot(ax - bx, az - bz); }
function winkelDiff(a, b) { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); }

function erreichbar(o) {
  if (!o.da || !o.def.akt) return false;
  const d = o.def, x = o.x ?? d.x, z = o.z ?? d.z;
  const weit = abstand(spieler.x, spieler.z, x, z);
  if (d.licht) {   // nur, wenn der Lichtkegel der Taschenlampe darauf zeigt
    return weit < 3.6 && (weit < 0.9 || winkelDiff(Math.atan2(x - spieler.x, z - spieler.z), spieler.h) < LAMPE_WINKEL);
  }
  return weit < (d.nah || NAH);
}

function moeglich() {
  if (beschaeftigt || UI.offen()) return [];
  if (Z.imAuto) return Math.abs(Z.auto.v) < 1 ? [{ text: 'Aussteigen', tun: aussteigen }] : [];
  const l = welt.objekte.filter(erreichbar)
    .sort((a, b) => abstand(spieler.x, spieler.z, a.x ?? a.def.x, a.z ?? a.def.z) - abstand(spieler.x, spieler.z, b.x ?? b.def.x, b.z ?? b.def.z))
    .slice(0, 3).map(o => ({ text: (o.typ === 'leut' ? '💬 ' : '') + o.def.name, tun: () => tu(o.def.akt, o.def) }));
  if (Z.ort === 'stadt' && abstand(spieler.x, spieler.z, Z.auto.x, Z.auto.z) < 3.6) l.unshift({ text: 'In den Streifenwagen einsteigen', tun: einsteigen });
  return l;
}

function aussteigen() {
  const a = Z.auto;
  // Beim Aussteigen geht die Sirene aus. Das Blaulicht bleibt an, wenn es an war: So sichert der Wagen eine Unfallstelle.
  Z.imAuto = false; kameraSetzen(0.6); a.v = 0; if (Z.blaulicht === SIRENE) blaulichtSetzen(BLAU);
  spieler.x = a.x + Math.cos(a.h) * 2; spieler.z = a.z - Math.sin(a.h) * 2; spieler.h = a.h;
  [spieler.x, spieler.z] = schieben(spieler.x, spieler.z, 0.4);
  for (const o of welt.objekte) if (o.def.folgt) { o.x = a.x - Math.cos(a.h) * 2; o.z = a.z + Math.sin(a.h) * 2; }
  sichtbarkeit();
}
function einsteigen() { neigung.kalibrieren(); Z.imAuto = true; spieler.tap = null; sichtbarkeit(); tu('eingestiegen'); }

function blaulichtSetzen(stufe) {
  Z.blaulicht = stufe === true ? SIRENE : stufe || AUS;
  UI.blaulicht(Z.blaulicht);
}
// Der Knopf 🚨 und die Taste B schalten reihum: aus → nur Blaulicht → Blaulicht mit Sirene → aus
function blaulichtWeiter() {
  blaulichtSetzen((Z.blaulicht + 1) % 3);
  UI.toast(['Blaulicht aus', 'Nur Blaulicht – ohne Sirene', 'Blaulicht mit Sirene'][Z.blaulicht]);
}

async function funkAuf() {
  if (beschaeftigt || UI.offen()) return;
  if (!Z.sachen.includes('funk')) return UI.toast('Du hast noch kein Funkgerät. Es liegt in deinem Spind.');
  const o = STORY.funk(S);
  KLANG.spiel('funk');
  const i = await UI.auswahlFenster('📻 Funkgerät – Möwe 14', o.map(e => e.text), 'Im Moment gibt es nichts zu melden.');
  if (i >= 0) tu(o[i].akt);
}
function notizbuchAuf() {
  if (!UI.offen()) UI.fenster('📓 Notizbuch', Z.notizen.map(text => ({ text: '• ' + text })), Z.sachen.includes('notizbuch') ? 'Noch nichts notiert.' : 'Dein Notizbuch liegt noch im Spind.');
}
function tascheAuf() {
  if (!UI.offen()) UI.fenster('🎒 Tasche', Z.sachen.map(s => ({ fett: STORY.SACHEN[s].name + ':', text: STORY.SACHEN[s].text })), 'Die Tasche ist leer.');
}

// ------------------------------------------------------------------ Nicht durch Wände laufen
// Schiebt einen Kreis (Mitte x/z, Halbmesser r) aus allen Rechtecken heraus, die im Weg stehen.
// Die Stadt hat tausende Hindernisse. Damit das Spiel nicht jedes Mal alle ansehen muss, liegen sie in einem Raster
// aus großen Kästchen (32 m): Gefragt wird immer nur in den Kästchen rund um eine Stelle.
const RASTER = 32;
function rasterBauen() {
  welt.raster = null;
  if (welt.fest.length < 300) return;
  const R = welt.raster = new Map();
  for (const q of welt.fest) for (let i = Math.floor(q[0] / RASTER); i <= Math.floor(q[2] / RASTER); i++) for (let j = Math.floor(q[1] / RASTER); j <= Math.floor(q[3] / RASTER); j++) {
    const k = i * 10000 + j; if (!R.has(k)) R.set(k, []); R.get(k).push(q);
  }
}
// Alle Hindernisse im Umkreis r um die Stelle x/z (ein Rechteck kann doppelt vorkommen – das macht nichts)
function nahe(x, z, r) {
  if (!welt.raster) return welt.lose;
  let l = welt.lose;
  for (let i = Math.floor((x - r) / RASTER); i <= Math.floor((x + r) / RASTER); i++) for (let j = Math.floor((z - r) / RASTER); j <= Math.floor((z + r) / RASTER); j++) {
    const b = welt.raster.get(i * 10000 + j); if (b) l = l.concat(b);
  }
  return l;
}
// wagen = true: Dein Streifenwagen fährt. Dann gibt ein anderes Auto nach und lässt sich wegschieben, statt dich festzuhalten.
const SCHUB = 0.78, SCHUB_WEIT = 6;      // so viel vom Stoß bekommt das andere Auto ab · so weit lässt es sich höchstens verschieben (Meter)
function parkSchub(q, dx, dz) {
  const p = q.park; p.x += dx; p.z += dz; p.weg = (p.weg || 0) + Math.hypot(dx, dz);
  q[0] += dx; q[2] += dx; q[1] += dz; q[3] += dz; if (q.o) { q.o.x += dx; q.o.z += dz; }
  welt.stadt.parkBewegt(p);
}
// Der Streifenwagen ist auch lang und schmal: zwei Kreise von je 1 m, einer vorn, einer hinten. So bleibt er seitlich nicht so leicht hängen.
function schiebWagen(x, z, h) {
  for (const k of [1.25, -1.25]) {
    const cx = x + Math.sin(h) * k, cz = z + Math.cos(h) * k, [nx, nz] = schieben(cx, cz, 1.0, true);
    x += nx - cx; z += nz - cz;
  }
  return [x, z];
}
function schieben(x, z, r, wagen = false) {
  const imWeg = nahe(x, z, r + 2);
  // Die fahrenden Autos sind auch im Weg (als Kreise).
  if (verkehr && welt.stadt) for (const c of verkehr.autos) {
    if (!c.da) continue;
    if (Math.abs(x - c.x) > 5 || Math.abs(z - c.z) > 5) continue;
    // Ein Auto ist lang und schmal: Wir rechnen es als zwei Kreise hintereinander (vorn und hinten).
    for (const k of [1.2, -1.2]) {
      const dx = x - (c.x + Math.sin(c.h) * k), dz = z - (c.z + Math.cos(c.h) * k), d = Math.hypot(dx, dz), min = r + 0.95;
      if (d >= min || d < 0.001) continue;
      const tief = min - d, nx = dx / d, nz = dz / d, s = wagen && Math.hypot(c.ox || 0, c.oz || 0) < SCHUB_WEIT ? SCHUB : 0;
      c.ox = (c.ox || 0) - nx * tief * s; c.oz = (c.oz || 0) - nz * tief * s; c.x -= nx * tief * s; c.z -= nz * tief * s;
      x += nx * tief * (1 - s); z += nz * tief * (1 - s);
    }
  }
  // Fußgänger: Durch Menschen fährt man nicht hindurch – der Wagen bleibt vor ihnen stehen.
  if (wagen && verkehr && welt.stadt) for (const m of verkehr.leute) {
    if (!m.da) continue;
    const dx = x - m.x, dz = z - m.z, d = Math.hypot(dx, dz), min = r + 0.35;
    if (d < min && d > 0.001) { x = m.x + dx / d * min; z = m.z + dz / d * min; }
  }
  for (const G of gaeste) {       // Rettungswagen und die zweite Streife stehen auch im Weg
    const dx = x - G.x, dz = z - G.z, d = Math.hypot(dx, dz), min = r + 1.4;
    if (d < min && d > 0.001) { x = G.x + dx / d * min; z = G.z + dz / d * min; }
  }
  if (fluchtwagen.visible && welt.stadt) {       // der Fluchtwagen auch
    const dx = x - fluchtwagen.position.x, dz = z - fluchtwagen.position.z, d = Math.hypot(dx, dz), min = r + 1.3;
    if (d < min && d > 0.001) { x = fluchtwagen.position.x + dx / d * min; z = fluchtwagen.position.z + dz / d * min; }
  }
  for (let runde = 0; runde < 2; runde++) for (const q of imWeg) {
    // Steht das Hindernis schräg (q.o), rechnen wir kurz so, als stünde es gerade: Die Stelle wird in "seine" Richtung gedreht und danach zurück.
    const o = q.o, R = o ? [-o.hb, -o.ht, o.hb, o.ht] : q;
    let px = x, pz = z;
    if (o) { px = (x - o.x) * o.c - (z - o.z) * o.s; pz = (x - o.x) * o.s + (z - o.z) * o.c; }
    const nx = Math.max(R[0], Math.min(px, R[2])), nz = Math.max(R[1], Math.min(pz, R[3]));
    let dx = px - nx, dz = pz - nz; const d = Math.hypot(dx, dz);
    if (d >= r) continue;
    if (d > 0.0001) { px = nx + dx / d * r; pz = nz + dz / d * r; }
    else {   // mitten im Rechteck: zur nächsten Kante hinaus
      const l = px - R[0], re = R[2] - px, ob = pz - R[1], u = R[3] - pz, m = Math.min(l, re, ob, u);
      if (m === l) px = R[0] - r; else if (m === re) px = R[2] + r; else if (m === ob) pz = R[1] - r; else pz = R[3] + r;
    }
    let wx = px, wz = pz; if (o) { wx = o.x + px * o.c + pz * o.s; wz = o.z - px * o.s + pz * o.c; }
    if (wagen && q.park && (q.park.weg || 0) < SCHUB_WEIT) { parkSchub(q, (x - wx) * SCHUB, (z - wz) * SCHUB); x += (wx - x) * (1 - SCHUB); z += (wz - z) * (1 - SCHUB); }
    else { x = wx; z = wz; }
  }
  const G = ORTE[Z.ort].gross;
  return [Math.max(G[0] + r, Math.min(G[2] - r, x)), Math.max(G[1] + r, Math.min(G[3] - r, z))];
}

// ------------------------------------------------------------------ Wegsuche für das Tippen
// Der Ort wird in kleine Kästchen geteilt (frei oder zu). Gesucht wird der kürzeste Weg von Kästchen zu Kästchen
// um alle Hindernisse herum (das Verfahren heißt A*). Drinnen sind die Kästchen 0,5 m groß, in der Stadt 1 m.
let gitter = null;
function gitterBauen() {
  // In der großen Stadt wird nur ein Fenster von 180 m rund um die Figur in Kästchen geteilt (sonst wären es Millionen).
  const O = ORTE[Z.ort].gross, k = ORTE[Z.ort].draussen ? 1 : 0.5, r = 0.48, F = 90;
  const G = welt.raster ? [Math.max(O[0], Math.floor(spieler.x) - F), Math.max(O[1], Math.floor(spieler.z) - F), Math.min(O[2], Math.floor(spieler.x) + F), Math.min(O[3], Math.floor(spieler.z) + F)] : O;
  const nx = Math.ceil((G[2] - G[0]) / k), nz = Math.ceil((G[3] - G[1]) / k), zu = new Uint8Array(nx * nz);
  for (const q of nahe(spieler.x, spieler.z, F + 4)) {
    const i1 = Math.max(0, Math.floor((q[0] - r - G[0]) / k)), i2 = Math.min(nx - 1, Math.floor((q[2] + r - G[0]) / k));
    const j1 = Math.max(0, Math.floor((q[1] - r - G[1]) / k)), j2 = Math.min(nz - 1, Math.floor((q[3] + r - G[1]) / k));
    for (let j = j1; j <= j2; j++) for (let i = i1; i <= i2; i++) {
      const x = G[0] + (i + 0.5) * k, z = G[1] + (j + 0.5) * k;
      if (q.o ? imHindernis(x, z, q, r) : Math.hypot(x - Math.max(q[0], Math.min(x, q[2])), z - Math.max(q[1], Math.min(z, q[3]))) < r) zu[j * nx + i] = 1;
    }
  }
  gitter = { G, k, nx, nz, zu };
}
function wegSuchen(sx, sz, zx, zz) {
  if (!gitter || welt.raster) gitterBauen();
  const { G, k, nx, nz, zu } = gitter;
  const zelle = (x, z) => [Math.max(0, Math.min(nx - 1, Math.floor((x - G[0]) / k))), Math.max(0, Math.min(nz - 1, Math.floor((z - G[1]) / k)))];
  // Ist das Kästchen zu (z. B. mitten im Spind), das nächste freie in der Nähe nehmen.
  const frei = (i0, j0, nahX, nahZ) => {
    if (!zu[j0 * nx + i0]) return [i0, j0];
    let best = null, bd = 1e9;
    for (let j = Math.max(0, j0 - 8); j <= Math.min(nz - 1, j0 + 8); j++) for (let i = Math.max(0, i0 - 8); i <= Math.min(nx - 1, i0 + 8); i++) {
      if (zu[j * nx + i]) continue;
      const d = Math.hypot(i - i0, j - j0) + 0.3 * Math.hypot(G[0] + (i + 0.5) * k - nahX, G[1] + (j + 0.5) * k - nahZ) / k;
      if (d < bd) { bd = d; best = [i, j]; }
    }
    return best;
  };
  const a = frei(...zelle(sx, sz), sx, sz), b = frei(...zelle(zx, zz), sx, sz);
  if (!a || !b) return null;
  const start = a[1] * nx + a[0], ziel = b[1] * nx + b[0];
  const kosten = new Float32Array(nx * nz).fill(1e9), von = new Int32Array(nx * nz).fill(-1), offen = [start], zuEnde = new Uint8Array(nx * nz);
  kosten[start] = 0;
  const rest = n => Math.hypot(n % nx - b[0], Math.floor(n / nx) - b[1]);
  for (let runden = 0; offen.length && runden < 60000; runden++) {
    let bi = 0; for (let i = 1; i < offen.length; i++) if (kosten[offen[i]] + rest(offen[i]) < kosten[offen[bi]] + rest(offen[bi])) bi = i;
    const n = offen.splice(bi, 1)[0];
    if (n === ziel) break;
    if (zuEnde[n]) continue; zuEnde[n] = 1;
    const i = n % nx, j = Math.floor(n / nx);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ii = i + di, jj = j + dj;
      if ((!di && !dj) || ii < 0 || jj < 0 || ii >= nx || jj >= nz || zu[jj * nx + ii]) continue;
      if (di && dj && (zu[j * nx + ii] || zu[jj * nx + i])) continue;       // nicht schräg um eine Ecke schneiden
      const m = jj * nx + ii, c = kosten[n] + (di && dj ? 1.414 : 1);
      if (c < kosten[m]) { kosten[m] = c; von[m] = n; offen.push(m); }
    }
  }
  if (ziel !== start && von[ziel] < 0) return null;
  const weg = [];
  for (let n = ziel; n !== start && n >= 0; n = von[n]) weg.unshift([G[0] + (n % nx + 0.5) * k, G[1] + (Math.floor(n / nx) + 0.5) * k]);
  if (!zu[zelle(zx, zz)[1] * nx + zelle(zx, zz)[0]]) weg.push([zx, zz]);       // das letzte Stück genau zur getippten Stelle
  return weg;
}

// ------------------------------------------------------------------ Ein Schritt des Spiels (dt = vergangene Sekunden)
let schimpfZeit = 0, zuSchnellZeit = 0, rummsZeit = 0, zeit = 0;

function zuFuss(dt) {
  let vx = (tasten.rechts ? 1 : 0) - (tasten.links ? 1 : 0), vz = (tasten.runter ? 1 : 0) - (tasten.hoch ? 1 : 0);
  if (vx || vz) {       // mit den Tasten läuft man in Bildschirm-Richtung: "hoch" ist von der Kamera weg, auch wenn sie gedreht ist
    spieler.tap = null;
    const c = Math.cos(kam.w), si = Math.sin(kam.w); [vx, vz] = [vx * c + vz * si, -vx * si + vz * c];
  } else if (spieler.tap) {
    const t = spieler.tap;
    if (t.obj && nahGenug(t.obj)) { spieler.tap = null; benutze(t.obj); return; }
    while (t.weg.length && abstand(spieler.x, spieler.z, t.weg[0][0], t.weg[0][1]) < 0.3) t.weg.shift();
    if (!t.weg.length || (t.zeit += dt) > 60) spieler.tap = null;
    else { const dx = t.weg[0][0] - spieler.x, dz = t.weg[0][1] - spieler.z, d = Math.hypot(dx, dz); vx = dx / d; vz = dz / d; }
  }
  const n = Math.hypot(vx, vz);
  spieler.tempo = n ? LAUF_TEMPO : 0;
  if (!n) return;
  spieler.h = Math.atan2(vx, vz);
  const ax = spieler.x, az = spieler.z;
  [spieler.x, spieler.z] = schieben(spieler.x + vx / n * LAUF_TEMPO * dt, spieler.z + vz / n * LAUF_TEMPO * dt, 0.4);
  if (spieler.tap && abstand(ax, az, spieler.x, spieler.z) < LAUF_TEMPO * dt * 0.2) spieler.tap.zeit += dt * 40;   // hängt fest: bald aufgeben
}

function fahren(dt) {
  const a = Z.auto;
  const max = Z.blaulicht ? V_MAX_BLAU : V_MAX;
  if (tasten.hoch) a.v += GAS * dt; else if (tasten.runter) a.v -= (a.v > 0 ? BREMSE : GAS * 0.6) * dt;
  else a.v -= Math.sign(a.v) * Math.min(Math.abs(a.v), ROLLEN * dt);
  a.v = Math.max(-5, Math.min(max, a.v));
  // Lenken: mit den Tasten ganz oder gar nicht – oder das iPad wie ein Lenkrad drehen (dann geht es auch fein)
  const lenk = neigung.an && neigung.signal ? neigung.lenk : (tasten.links ? 1 : 0) - (tasten.rechts ? 1 : 0);
  a.h += lenk * dt * Math.max(-1.6, Math.min(1.6, a.v * 0.16));
  const vorher = a.v, sh = Math.sin(a.h), ch = Math.cos(a.h);
  const zx = a.x + sh * a.v * dt, zz = a.z + ch * a.v * dt;
  const [nx, nz] = schiebWagen(zx, zz, a.h);
  if (abstand(zx, zz, nx, nz) > 0.02 && dt > 0) {       // angestoßen: Der Wagen prallt nicht zurück, er rutscht am Hindernis entlang und dreht sich ein Stück mit
    const vor = ((nx - a.x) * sh + (nz - a.z) * ch) / dt, quer = ((nx - a.x) * ch - (nz - a.z) * sh) / dt;
    a.v += (vor - a.v) * 0.5; a.h += Math.max(-1, Math.min(1, quer * 0.3)) * dt * Math.sign(vorher || 1);
    if (Math.abs(vorher) > 5 && Math.abs(vorher) - Math.abs(vor) > 2.5 && zeit > rummsZeit) { rummsZeit = zeit + 4; KLANG.spiel('rumms');
      // Bei einer Verfolgung kostet ein Rumms keinen Punkt – aber den Bonus für sauberes Fahren gibt es dann nicht mehr.
      if (jagd && !jagd.fertig && Z.flags.jagdLos) { jagd.rumms++; UI.toast('Rumms! Otto: „Ruhig bleiben, Kim!“'); } else S.punkte(-1, 'Rumms! Vorsichtig fahren');
    }
  }
  a.x = nx; a.z = nz; a.weg = (a.weg || 0) + a.v * dt; a.lenk = lenk;
  const kmh = Math.abs(a.v) * 3.6;
  zuSchnellZeit = (!Z.blaulicht && kmh > ZU_SCHNELL) ? zuSchnellZeit + dt : 0;
  if (zuSchnellZeit > 1.5 && zeit > schimpfZeit) { schimpfZeit = zeit + 15; S.punkte(-1, 'Otto: „In der Stadt gilt 50!“'); }
  spieler.x = a.x; spieler.z = a.z;
  UI.tacho(kmh);
}

const FUEHR_TEMPO = 1.5;      // so schnell geht jemand, den die Geschichte führt (m/s)
function ottoFolgt(dt) {
  for (const o of welt.objekte) {
    if (!o.def.folgt || Z.imAuto || !o.da) continue;
    if (o.fuehrt) {       // die Geschichte führt diese Person gerade einen Weg entlang (S.fuehre)
      const F = o.fuehrt, p = F.weg[F.i];
      if (p) { const dx = p[0] - o.x, dz = p[1] - o.z, d = Math.hypot(dx, dz), weg = FUEHR_TEMPO * dt;
        if (d <= weg) { o.x = p[0]; o.z = p[1]; if (++F.i >= F.weg.length && F.fertig) { F.fertig(); F.fertig = null; } }
        else { o.x += dx / d * weg; o.z += dz / d * weg; o.mesh.rotation.y = Math.atan2(dx, dz); } }
      o.mesh.position.set(o.x, 0, o.z); o.mesh.userData.selbst = true; figurBewegen(o.mesh, dt, p ? FUEHR_TEMPO : 0); o.geht = !!p; continue;
    }
    const zx = spieler.x - Math.sin(spieler.h) * 1.4 + Math.cos(spieler.h) * 0.9, zz = spieler.z - Math.cos(spieler.h) * 1.4 - Math.sin(spieler.h) * 0.9;
    const dx = zx - o.x, dz = zz - o.z, d = Math.hypot(dx, dz);
    const tempo = d > 12 ? 40 : d > 1.2 ? LAUF_TEMPO * 1.05 : 0;      // zu weit weg: hinterherspringen
    if (tempo) { o.x += dx / d * Math.min(d, tempo * dt); o.z += dz / d * Math.min(d, tempo * dt); o.mesh.rotation.y = Math.atan2(dx, dz); }
    o.mesh.position.set(o.x, 0, o.z);
    o.mesh.userData.selbst = true; figurBewegen(o.mesh, dt, tempo ? 4 : 0); o.geht = !!tempo;
  }
}

// Kollegen auf ihrer Runde: Sie gehen von Punkt zu Punkt (runde in daten.js), bleiben an manchen Punkten eine Weile stehen
// und halten an, wenn du dicht vor ihnen stehst oder mit ihnen redest.
const RUNDE_TEMPO = 1.25, RUNDE_HALT = 1.5, RUNDE_GEDULD = 3.5;       // so schnell gehen sie (m/s) · so nah (Meter) bleiben sie für dich stehen
function rundenSchritt(dt) {
  for (const o of welt.objekte) {
    const R = o.def.runde; if (!R || !o.da || o.typ !== 'leut') continue;
    if (o.ri === undefined) { o.x = o.def.x; o.z = o.def.z; o.ri = 1 % R.length; o.warte = R[0][2] || 0; if (R[0][3] !== undefined) { o.mesh.rotation.y = R[0][3]; o.mesh.userData.grund = R[0][3]; } }
    const beiDir = !Z.imAuto && abstand(spieler.x, spieler.z, o.x, o.z) < RUNDE_HALT, redet = beschaeftigt && o.def === aktiv;
    // Stehst du im Weg, wartet der Kollege höchstens RUNDE_GEDULD Sekunden und geht dann an dir vorbei.
    o.halt = beiDir ? (o.halt || 0) + dt : 0;
    if (o.warte > 0 || (beiDir && o.halt < RUNDE_GEDULD) || redet) { if (!beiDir && !redet) o.warte -= dt; o.geht = false; o.mesh.userData.selbst = false; continue; }
    const [zx, zz, pause, blick] = R[o.ri], dx = zx - o.x, dz = zz - o.z, d = Math.hypot(dx, dz), weg = RUNDE_TEMPO * dt;
    if (d <= weg) { o.x = zx; o.z = zz; o.ri = (o.ri + 1) % R.length; if (pause) { o.warte = pause; if (blick !== undefined) o.mesh.userData.grund = blick; } }
    else { o.x += dx / d * weg; o.z += dz / d * weg;
      let w = Math.atan2(dx, dz) - o.mesh.rotation.y; while (w > Math.PI) w -= 2 * Math.PI; while (w < -Math.PI) w += 2 * Math.PI; o.mesh.rotation.y += w * Math.min(1, dt * 7); }
    o.mesh.position.set(o.x, 0, o.z); o.mesh.userData.selbst = true; figurBewegen(o.mesh, dt, RUNDE_TEMPO); o.geht = true;
  }
}

// Türen, Spind und Schrank: jedes Bild ein Stück weiter auf oder zu. Türen in den Wänden gehen von selbst auf, wenn du oder Otto davorstehen.
function klappenSchritt(dt) {
  for (const k of Object.values(welt.klappen)) {
    if (k.auto) {
      const nah = (x, z) => abstand(x, z, k.auto.x, k.auto.z) < k.auto.r;
      const ich = nah(spieler.x, spieler.z), soll = ich || welt.objekte.some(o => (o.def.folgt || o.def.runde) && o.da && o.x !== undefined && nah(o.x, o.z)) ? 1 : 0;
      if (soll && !k.soll) KLANG.spiel('tuer', ich ? 0.35 : 0.12);       // öffnet ein Kollege die Tür, hört man es nur leise
      k.soll = soll;
    }
    k.ist += Math.max(-dt * 2.6, Math.min(dt * 2.6, k.soll - k.ist));
    const t = k.ist * k.ist * (3 - 2 * k.ist);       // weich anfahren und abbremsen
    for (const e of k.teile) e.teil.rotation.y = e.zu + (e.auf - e.zu) * t;
    if (k.wartet && Math.abs(k.ist - k.soll) < 0.02) { const f = k.wartet; k.wartet = null; f(); }
  }
}
// Die Leute stehen nicht steif herum: Sie atmen, drehen sich zu dir, wenn du nah bist, und reden mit den Händen.
function leuteLeben(dt) {
  for (const o of welt.objekte) {
    if (o.typ !== 'leut' || o.def.hund || !o.da) continue;
    const x = o.x ?? o.def.x, z = o.z ?? o.def.z, weit = abstand(spieler.x, spieler.z, x, z);
    const spricht = !!sprecher && (o.def.name.startsWith(sprecher) || (o.def === aktiv && sprecher !== 'Kim' && !sprecher.startsWith('Otto') && !sprecher.startsWith('Leitstelle')));
    if (o.rennt) continue;                     // rennt gerade weg: bewegt sich schon selbst
    if ((o.def.folgt || o.def.runde) && o.geht) continue;       // Otto oder ein Kollege läuft gerade: Dann schwingen Arme und Beine schon
    figurLeben(o.mesh, dt, zeit, spricht, weit < 5 && !Z.imAuto ? Math.atan2(spieler.x - x, spieler.z - z) : o.def.folgt ? o.mesh.rotation.y : null);
  }
}

// Stellen, an denen von selbst etwas passiert. Im Auto fährt das Spiel dort einfach weiter – erst wenn man anhält, geht der Einsatz los.
const STEHT = 0.8;       // langsamer als so (m/s) gilt als angehalten
let haltHinweis = '', funkPiep = 0;
function zonen(dt) {
  const steht = !Z.imAuto || Math.abs(Z.auto.v) < STEHT;
  for (const zo of STORY.ZONEN) {
    if (zo.ort !== Z.ort || Z.flags['zone_' + zo.id] || (zo.wenn && !Z.flags[zo.wenn]) || (zo.bis && Z.flags[zo.bis])) continue;
    if (abstand(spieler.x, spieler.z, zo.x, zo.z) >= zo.r) continue;
    if (steht) { Z.flags['zone_' + zo.id] = true; haltHinweis = ''; tu(zo.akt); return; }
    if (haltHinweis !== zo.id) { haltHinweis = zo.id; UI.toast('Du bist da. Halt an – dann geht es los.'); }
    return;
  }
  // Streife: Die Zeit läuft nur, solange man wirklich fährt. Dann piept der Funk; angenommen wird der Spruch, sobald man anhält.
  const st = Z.streife;
  if (!st || Z.ort !== 'stadt') return;
  if (!st.ruf) {
    if (Z.imAuto && Math.abs(Z.auto.v) > 3) st.rest -= dt;
    if (st.rest <= 0) { st.ruf = true; funkPiep = 0; Z.ziel = { text: '📻 Die Leitstelle ruft! Halt an und hör zu', wo: null }; anzeigen(); }
  } else if (steht && Z.imAuto) { Z.streife = null; tu(st.akt); }
  else if (zeit > funkPiep) { funkPiep = zeit + 6; KLANG.spiel('funk'); UI.toast(Z.imAuto ? '📻 Funkspruch von der Leitstelle! Halt an und hör zu.' : '📻 Im Wagen piept der Funk. Steig ein!'); }
}

// ---- Die Kamera drehen, neigen und zoomen (wie auf dem Pferdehof im Reitturnier)
// Maus: rechte Taste ziehen = drehen und neigen, Mausrad = zoomen. Finger: mit zwei Fingern drehen, neigen und kneifen.
// Dazu die Knöpfe ⟲ ⟳ ＋ － am rechten Rand und die Tasten Q, R (drehen), + und − (zoomen), Pos1 = wieder wie am Anfang.
// w = Drehung um die Figur (0 = Blick nach Norden), neig = steiler (+) oder flacher (−) als normal, mal = Abstand (1 = normal).
// Die Werte mit z davor sind das Ziel, die anderen laufen weich hinterher. wAuto = Drehung um den Wagen (geht beim Fahren von selbst zurück).
const kam = { w: 0, neig: 0, mal: 1, zw: 0, zneig: 0, zmal: 1, wAuto: 0, zwAuto: 0, taste: null, zeiger: new Map(), rechts: null, zog: 0, tipp: null };
const KAM_MAL = [0.4, 3.2], KAM_NEIG = [-0.75, 0.9];       // so nah und so weit, so flach und so steil geht es
function kamGrenzen() {
  kam.zmal = Math.max(KAM_MAL[0], Math.min(KAM_MAL[1], kam.zmal)); kam.zneig = Math.max(KAM_NEIG[0], Math.min(KAM_NEIG[1], kam.zneig));
}
function kamNormal() { kam.zw = Math.round(kam.zw / (Math.PI * 2)) * Math.PI * 2; kam.zneig = 0; kam.zmal = 1; kam.zwAuto = 0; }
function kamDrehen(dw, dn) { if (Z.imAuto) kam.zwAuto += dw; else kam.zw += dw; kam.zneig += dn; kamGrenzen(); }
function kamSchritt(dt) {
  const t = kam.taste;
  if (t === 'links') kamDrehen(dt * 1.6, 0); else if (t === 'rechts') kamDrehen(-dt * 1.6, 0);
  else if (t === 'nah') kam.zmal *= Math.exp(-dt * 1.4); else if (t === 'fern') kam.zmal *= Math.exp(dt * 1.4);
  kamGrenzen();
  // Im Auto dreht sich die Kamera von selbst wieder hinter den Wagen, sobald man fährt und nicht gerade an ihr zieht.
  if (Z.imAuto && !kam.zeiger.size && !t && Math.abs(Z.auto.v) > 2) kam.zwAuto *= Math.exp(-dt * 1.5);
  const k = Math.min(1, dt * 8);
  kam.w += (kam.zw - kam.w) * k; kam.neig += (kam.zneig - kam.neig) * k; kam.mal += (kam.zmal - kam.mal) * k; kam.wAuto += (kam.zwAuto - kam.wAuto) * k;
}
// Wie steil schaut die Kamera gerade (Winkel über dem Boden) und wie weit ist sie weg?
function kamLage() {
  const [hoch, weg] = Z.imAuto ? [KAMERA_AUTO[1], KAMERA_AUTO[0]] : ORTE[Z.ort].kamera;
  const e = Math.max(0.12, Math.min(1.5, Math.atan2(hoch - 1, weg) + kam.neig));
  // Drinnen schaut die Kamera mit einem engeren Blickwinkel von weiter weg: Dann kippen die Leute am Bildrand nicht so schief zur Seite.
  const drinnen = !Z.imAuto && !ORTE[Z.ort].draussen, winkel = drinnen ? WINKEL_DRINNEN : WINKEL;
  if (kamera.fov !== winkel) { kamera.fov = winkel; kamera.updateProjectionMatrix(); }
  return { e, d: Math.hypot(hoch - 1, weg) * kam.mal * Math.tan(WINKEL * Math.PI / 360) / Math.tan(winkel * Math.PI / 360) };
}

function kameraSetzen(staerke) {
  let px, py, pz, bx, bz;
  const frei = window.__polizei.frei;       // zum Testen: Kamera an eine feste Stelle setzen, frei = { von: [x, y, z], nach: [x, y, z] }
  if (frei) { kamera.position.set(...frei.von); kamera.lookAt(...frei.nach); return; }
  if (Z.imAuto) {
    const a = Z.auto;
    // Die Kamera fährt hinter dem Wagen her. Gerät sie dabei in ein Haus, rückt sie näher heran und höher.
    const L = kamLage(), h = a.h + kam.wAuto, sh = Math.sin(h), ch = Math.cos(h);
    let weg = Math.cos(L.e) * L.d; py = 1 + Math.sin(L.e) * L.d;
    const imHaus = (x, z) => nahe(x, z, 1).some(q => q[2] - q[0] > 3 && q[3] - q[1] > 3 && imHindernis(x, z, q, 0.8));
    while (weg > 2.5 && py < 30 && imHaus(a.x - sh * weg, a.z - ch * weg)) { weg -= 1.5; py += 0.9; }
    px = a.x - sh * weg; pz = a.z - ch * weg;
    const vor = 4 * Math.max(0, 1 - Math.abs(kam.wAuto));       // von hinten schaut die Kamera ein Stück voraus, von der Seite auf den Wagen
    bx = a.x + Math.sin(a.h) * vor; bz = a.z + Math.cos(a.h) * vor;
  } else {
    // Zu Fuß kreist die Kamera um die Figur: w = von wo, e = wie steil, d = wie weit weg.
    const L = kamLage(), c = Math.cos(L.e);
    px = spieler.x + Math.sin(kam.w) * c * L.d; py = 1 + Math.sin(L.e) * L.d; pz = spieler.z + Math.cos(kam.w) * c * L.d;
    bx = spieler.x - Math.sin(kam.w) * 0.5; bz = spieler.z - Math.cos(kam.w) * 0.5;
  }
  kamera.position.lerp(new THREE.Vector3(px, py, pz), staerke);
  blick.lerp(new THREE.Vector3(bx, 1, bz), staerke);
  kamera.lookAt(blick);
}

// Alles, was nur in der Stadt läuft: Häuser vor der Kamera aufschneiden, Schatten, Himmel, Verkehr, Radar.
let bildNr = 0;
function stadtSchritt(dt) {
  const S = welt.stadt;
  // Die Schnitt-Ebene steht immer quer vor der Kamera – dreht man die Kamera, dreht sie sich mit. Von steil oben braucht man sie nicht.
  const sw = Math.sin(kam.w), cw = Math.cos(kam.w);
  S.schnitt.normal.set(-sw, 0, -cw);
  S.schnitt.constant = Z.imAuto || window.__polizei.frei || kamLage().e > 1.2 ? 1e9 : spieler.x * sw + spieler.z * cw + SCHNITT_VOR;
  S.schritt(dt, spieler.x, spieler.z);
  // Die Sonne (nachts der Mond) steht immer gleich weit von dir weg, damit ihr Schatten dich begleitet.
  sonne.position.set(spieler.x + himmel.sonneRichtung.x * 300, Math.max(60, himmel.sonneRichtung.y * 300), spieler.z + himmel.sonneRichtung.z * 300);
  sonne.target.position.set(spieler.x, 0, spieler.z);
  himmel.schritt(dt, kamera); umland.schritt(dt);
  // Platz machen die anderen nur bei Blaulicht MIT Sirene. Vor einer Unfallstelle und hinter dem Fluchtwagen bremsen sie.
  const imWeg = welt.objekte.filter(o => o.da && o.def.verkehr).map(o => ({ x: o.def.x, z: o.def.z, r: 1.3 }));
  if (fluchtwagen.visible) imWeg.push({ x: fluchtwagen.position.x, z: fluchtwagen.position.z, r: 1.3 });
  for (const G of gaeste) imWeg.push({ x: G.x, z: G.z, r: 1.4 });
  if (!Z.imAuto) imWeg.push({ x: Z.auto.x, z: Z.auto.z, r: 1.3 });       // dein abgestellter Streifenwagen
  verkehr.schritt(dt, { x: spieler.x, z: spieler.z, r: Z.imAuto ? 1.2 : 0.4, h: Z.imAuto ? Z.auto.h : undefined, v: Z.imAuto ? Z.auto.v : 0 }, Z.imAuto && Z.blaulicht > AUS, imWeg);
  verkehrBild.schritt(dt, spieler.x, spieler.z);
  for (const s of welt.hausSchilder) s.visible = abstand(s.position.x, s.position.z, spieler.x, spieler.z) < 150;
  if (++bildNr % 2 === 0) KARTE.radar(kartenStand());
  if (bildNr % 30 === 0) anzeigen();
}
function kartenStand() {
  const w = Z.ziel && Z.ziel.wo;
  return { x: spieler.x, z: spieler.z, h: Z.imAuto ? Z.auto.h : spieler.h, imAuto: Z.imAuto, ziel: w && w[0] === 'stadt' ? [w[1], w[2]] : null, zielText: Z.ziel && Z.ziel.text,
    wagen: [Z.auto.x, Z.auto.z], autos: verkehr.autos };
}
function karteAuf() { if (welt.stadt && !beschaeftigt && !UI.offen()) { if (KARTE.kartOffen()) KARTE.karteZu(); else KARTE.karteAuf(kartenStand()); } }

function wegweiser() {
  const w = Z.ziel && Z.ziel.wo;
  const da = !!w && w[0] === Z.ort;
  zielSaeule.visible = da && Z.ort === 'stadt';
  if (!da) return UI.pfeil(null);
  zielSaeule.position.set(w[1], 60, w[2]);
  const dx = w[1] - spieler.x, dz = w[2] - spieler.z, weit = Math.hypot(dx, dz);
  if (weit < 3) return UI.pfeil(null);
  // Im Auto zeigt "oben" im Bild nach vorn, zu Fuß nach Norden (−z).
  const h = Z.auto.h;
  const winkel = Z.imAuto ? Math.atan2(-(dx * Math.cos(h) - dz * Math.sin(h)), dx * Math.sin(h) + dz * Math.cos(h)) : Math.atan2(dx, -dz);
  UI.pfeil(winkel, weit);
}

function schritt(dt) {
  zeit += dt;
  const frei = (!beschaeftigt || !!lauf) && !UI.offen() && !KARTE.kartOffen();       // bei einer Verfolgung zu Fuß läuft man weiter, obwohl die Geschichte gerade „dran“ ist
  if (frei) { if (Z.imAuto) fahren(dt); else { zuFuss(dt); UI.tacho(null); } }
  else spieler.tempo = 0;
  if (frei && !lauf) zonen(dt);
  laufSchritt(dt);
  ottoFolgt(dt);

  // Figuren und Wagen an ihre Plätze setzen
  kim.visible = !Z.imAuto; kim.position.set(spieler.x, 0, spieler.z); kim.rotation.y = spieler.h; figurBewegen(kim, dt, spieler.tempo);
  wagen.position.set(Z.auto.x, 0, Z.auto.z); wagen.rotation.y = Z.auto.h; autoRaeder(wagen, Z.auto.weg || 0, Z.imAuto ? Z.auto.lenk || 0 : 0);
  const u = wagen.userData, blink = Z.blaulicht && Math.floor(zeit * 5) % 2;
  u.blau[0].material.emissiveIntensity = Z.blaulicht && blink ? 3 : 0; u.blau[1].material.emissiveIntensity = Z.blaulicht && !blink ? 3 : 0;
  u.blitz.intensity = Z.blaulicht ? (blink ? 70 : 28) : 0;
  geraeusche(dt);
  // Taschenlampe: leuchtet dahin, wohin die Figur schaut
  lampe.position.set(spieler.x, 2.4, spieler.z);
  lampe.target.position.set(spieler.x + Math.sin(spieler.h) * 3.2, 0, spieler.z + Math.cos(spieler.h) * 3.2);
  // Leuchtende Stellen pulsieren, Lotte wedelt
  for (const o of welt.objekte) {
    if (o.mesh.userData.ring) o.mesh.userData.ring.scale.setScalar(1 + Math.sin(zeit * 4) * 0.15);
    if (o.mesh.userData.schwanz) o.mesh.userData.schwanz.rotation.y = Math.sin(zeit * 9) * 0.6;
  }
  kamSchritt(dt);
  kameraSetzen(1 - Math.exp(-dt * (Z.imAuto ? 4 : 7)));
  if (welt.stadt) stadtSchritt(dt);
  if (wetter) { if (welt.stadt) wetter.fahnen(welt.stadt.schnitt); wetter.schritt(dt, { x: blick.x, z: blick.z, flags: Z.flags, imAuto: Z.imAuto, sparsam, stadt: welt.stadt }); }
  jagdLauf(dt, frei); gastSchritt(dt);
  rundenSchritt(dt); klappenSchritt(dt); leuteLeben(dt);
  wegweiser();
  UI.knoepfe(lauf ? [] : moeglich(), k => k.tun());
  UI.fahrKnoepfe(Z.imAuto);
  markenZeigen();
}

// ------------------------------------------------------------------ Steuerung
const KAM_TASTE = { q: 'links', r: 'rechts', '+': 'nah', '-': 'fern' };
const TASTE = { ArrowUp: 'hoch', w: 'hoch', ArrowDown: 'runter', s: 'runter', ArrowLeft: 'links', a: 'links', ArrowRight: 'rechts', d: 'rechts' };
addEventListener('keydown', e => {
  KLANG.an();
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (KARTE.kartOffen()) { if (k === 'm' || k === 'Escape' || k === 'Enter') KARTE.karteZu(); e.preventDefault(); return; }
  if (UI.taste(k)) { e.preventDefault(); return; }
  if (TASTE[k]) { tasten[TASTE[k]] = true; e.preventDefault(); return; }
  if (k === 'u') { musikWeiter(); return; }          // Musik geht immer, auch mitten im Gespräch
  if (KAM_TASTE[k]) { kam.taste = KAM_TASTE[k]; e.preventDefault(); return; }
  if (beschaeftigt) return;
  if (k === 'e' || k === 'Enter') { const m = moeglich(); if (m.length) m[0].tun(); }
  else if (k === 'f') funkAuf(); else if (k === 'n') notizbuchAuf(); else if (k === 't') tascheAuf();
  else if (k === 'b' && Z.imAuto) blaulichtWeiter();
  else if (k === 'm') karteAuf();
  else if (k === 'Home') kamNormal();
  else if (k === 'h') markenBis = zeit + MARKEN_ZEIT;
  else if (!Z.imAuto && VERB_TASTE[k]) verbSetzen(VERB_TASTE[k]);
});
addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (TASTE[k]) tasten[TASTE[k]] = false; if (KAM_TASTE[k]) kam.taste = null; });

// ------------------------------------------------------------------ Point and Click (wie in einem klassischen Adventure)
// Unten links stehen vier Tätigkeiten: Gehen, Ansehen, Reden, Benutzen. Man wählt eine aus und tippt dann auf ein Ding,
// eine Person oder auf den Boden. Die Figur läuft von selbst hin und tut es. Das geht mit der Maus genauso wie mit dem Finger
// auf dem iPad – deshalb hängt nichts davon ab, dass man mit dem Zeiger über etwas "schwebt".
const VERBEN = { geh: ['🚶', 'Gehen'], sieh: ['👁', 'Ansehen'], rede: ['💬', 'Reden'], nimm: ['✋', 'Benutzen'] };
const VERB_TASTE = { 1: 'geh', 2: 'sieh', 3: 'rede', 4: 'nimm' };
let verb = 'geh', markenBis = 0, markenAn = false;
const wagenDing = { wagen: true };       // der Streifenwagen in der Stadt ist auch etwas zum Anklicken

function verbSetzen(v) { verb = v; UI.verb(v); UI.satz(`${VERBEN[v][0]} ${VERBEN[v][1]}`); }
// Welche Tätigkeit passt zu einem Ding? Leute spricht man an, Dinge benutzt man – außer in daten.js steht verb: 'sieh'.
const verbVon = o => o.wagen ? 'nimm' : o.def.verb || (o.typ === 'leut' ? 'rede' : 'nimm');
const nameVon = o => o.wagen ? 'Streifenwagen Möwe 14' : o.def.name;
const ortVon = o => o.wagen ? [Z.auto.x, Z.auto.z] : [o.x ?? o.def.x, o.z ?? o.def.z];
const nahGenug = o => o.wagen ? abstand(spieler.x, spieler.z, Z.auto.x, Z.auto.z) < 3.6 : erreichbar(o);
function benutze(o) { if (o.wagen) einsteigen(); else tu(o.def.akt, o.def); }

// Alles, was man gerade antippen kann. Spuren im Dunkeln zählen erst, wenn die Taschenlampe darauf zeigt – sonst wäre das Suchen zu leicht.
function antippbar() {
  if (!welt || Z.imAuto) return [];
  const l = welt.objekte.filter(o => o.da && o.def.name && (o.def.akt || o.def.sieh) && (!o.def.licht || erreichbar(o)));
  if (Z.ort === 'stadt') l.push(wagenDing);
  return l;
}
// Wo ist ein Ding auf dem Bildschirm? Zurück kommt [x, y] in Bildpunkten oder null, wenn es hinter der Kamera liegt.
const bildOrt = new THREE.Vector3();
function aufSchirm(o) {
  const [x, z] = ortVon(o);
  bildOrt.set(x, o.typ === 'leut' ? 1.2 : 0.9, z).project(kamera);
  return bildOrt.z > 1 ? null : [(bildOrt.x + 1) / 2 * innerWidth, (1 - bildOrt.y) / 2 * innerHeight];
}
// Welches Ding liegt unter dem Zeiger oder Finger? Gemessen wird auf dem Bildschirm – so trifft man auch mit einem dicken Finger.
function unterZeiger(px, py, weit) {
  let best = null, bd = weit;
  for (const o of antippbar()) {
    const p = aufSchirm(o); if (!p) continue;
    const d = Math.hypot(p[0] - px, p[1] - py) / (o.wagen || o.def.art === 'auto' ? 1.7 : 1);       // Autos sind groß
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
// Zu einem Ding hinlaufen. tun = true: dort gleich benutzen.
function hinlaufen(o, tun) {
  if (tun && nahGenug(o)) return benutze(o);
  const [x, z] = ortVon(o), weg = wegSuchen(spieler.x, spieler.z, x, z);
  spieler.tap = weg ? { weg, obj: tun ? o : null, zeit: 0 } : null;
}
// Etwas nur ansehen: ein kurzer Satz, ohne hinzulaufen.
async function ansehen(o) {
  if (beschaeftigt) return;
  const text = o.wagen ? 'Dein Streifenwagen, Funkname Möwe 14. Blau-silber, mit Blaulicht auf dem Dach. Otto hat ihn heute Morgen noch gewaschen.'
    : o.def.sieh || (o.typ === 'leut' ? `Das ist ${o.def.name}.` : `${o.def.name}. Nichts Auffälliges.`);
  beschaeftigt = true; spieler.tap = null;
  try { await UI.dialog('', text); } finally { beschaeftigt = false; }
}
function klickAuf(o) {
  const passt = verbVon(o);
  UI.satz(`${VERBEN[verb][0]} ${VERBEN[verb][1]}: ${nameVon(o)}`);
  if (verb === 'geh') return hinlaufen(o, false);
  if (verb === passt) return hinlaufen(o, true);
  if (verb === 'sieh') return ansehen(o);
  if (verb === 'nimm' && o.typ === 'leut') return UI.toast('Menschen benutzt man nicht. Sprich mit ihnen (💬 Reden).');
  if (verb === 'nimm') return UI.toast('Sieh es dir erst genau an (👁 Ansehen).');
  UI.toast(passt === 'sieh' ? 'Das antwortet nicht. Sieh es dir an (👁 Ansehen).' : 'Das antwortet nicht. Versuch ✋ Benutzen.');
}

const strahl = new THREE.Raycaster(), ebene = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), treffer = new THREE.Vector3();
// Ein Klick oder Fingertipp auf die Welt: ein Ding antippen oder zu einer Stelle am Boden laufen.
function weltTipp(x, y, maus) {
  if (Z.imAuto || (beschaeftigt && !lauf) || UI.offen() || KARTE.kartOffen()) return;
  const o = lauf ? null : unterZeiger(x, y, maus ? TREFF_MAUS : TREFF_FINGER);       // bei einer Verfolgung wird nur gelaufen
  if (o) return klickAuf(o);
  // Auf den Boden getippt: Die Figur läuft dorthin – egal, welche Tätigkeit gerade gewählt ist.
  strahl.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1), kamera);
  if (!strahl.ray.intersectPlane(ebene, treffer)) return;
  const weg = wegSuchen(spieler.x, spieler.z, treffer.x, treffer.z);
  spieler.tap = weg ? { weg, obj: null, zeit: 0 } : null;
}
// Die Maus tippt sofort beim Drücken. Ein Finger tippt erst beim Loslassen – so stört es nicht, wenn ein zweiter Finger dazukommt
// (zwei Finger drehen und zoomen die Kamera). Die rechte Maustaste: kurz drücken = nächste Tätigkeit, ziehen = Kamera drehen.
const ZUG_AB = 10;       // ab so vielen Bildpunkten ist es kein Tipp mehr, sondern ein Ziehen
canvas.addEventListener('pointerdown', e => {
  KLANG.an();
  if (KARTE.kartOffen()) return;
  kam.zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
  try { canvas.setPointerCapture(e.pointerId); } catch (f) { /* geht nicht überall */ }
  if (e.pointerType === 'mouse') {
    if (e.button === 2) { kam.rechts = e.pointerId; kam.zog = 0; }
    else if (e.button === 0) weltTipp(e.clientX, e.clientY, true);
    return;
  }
  kam.tipp = kam.zeiger.size === 1 ? e.pointerId : null;       // ein zweiter Finger: kein Tipp mehr, sondern Kamera
  if (kam.zeiger.size >= 2) spieler.tap = spieler.tap && spieler.tap.obj ? spieler.tap : null;
});
canvas.addEventListener('pointermove', e => {
  const p = kam.zeiger.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  if (kam.rechts === e.pointerId) { kam.zog += Math.abs(dx) + Math.abs(dy); if (kam.zog > ZUG_AB) { kamDrehen(-dx * 0.008, dy * 0.006); kam.w = kam.zw; kam.wAuto = kam.zwAuto; kam.neig = kam.zneig; } }
  else if (kam.zeiger.size >= 2) {
    let o = null; for (const [id, q] of kam.zeiger) if (id !== e.pointerId) { o = q; break; }
    const alt = Math.hypot(p.x - o.x, p.y - o.y), neu = Math.hypot(e.clientX - o.x, e.clientY - o.y);
    if (alt > 8 && neu > 8) kam.zmal *= alt / neu;
    kamDrehen(-dx * 0.004, dy * 0.003);
    kam.w = kam.zw; kam.wAuto = kam.zwAuto; kam.neig = kam.zneig; kam.mal = kam.zmal;
  }
  p.x = e.clientX; p.y = e.clientY;
});
function zeigerEnde(e, abbruch) {
  const p = kam.zeiger.get(e.pointerId); if (!p) return;
  kam.zeiger.delete(e.pointerId);
  if (kam.rechts === e.pointerId) {
    kam.rechts = null;
    if (kam.zog <= ZUG_AB && !abbruch && !Z.imAuto && !beschaeftigt && !UI.offen()) { const v = Object.keys(VERBEN); verbSetzen(v[(v.indexOf(verb) + 1) % v.length]); }
  } else if (kam.tipp === e.pointerId && !abbruch && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < ZUG_AB * 1.6) weltTipp(e.clientX, e.clientY, false);
  if (kam.tipp === e.pointerId) kam.tipp = null;
}
canvas.addEventListener('pointerup', e => zeigerEnde(e, false));
canvas.addEventListener('pointercancel', e => zeigerEnde(e, true));
canvas.addEventListener('wheel', e => { e.preventDefault(); if (UI.offen() || KARTE.kartOffen()) return; kam.zmal *= Math.exp(Math.sign(e.deltaY) * Math.min(0.3, Math.abs(e.deltaY) * 0.0015)); kamGrenzen(); }, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());
// Mit der Maus: Schwebt der Zeiger über etwas, steht unten der Satz dazu ("Ansehen: Dein Spind").
canvas.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || Z.imAuto || beschaeftigt || UI.offen()) return;
  const o = unterZeiger(e.clientX, e.clientY, TREFF_MAUS);
  canvas.style.cursor = o ? 'pointer' : '';
  UI.satz(`${VERBEN[verb][0]} ${VERBEN[verb][1]}${o ? ': ' + nameVon(o) : ''}`);
});
// Die Lupe 🔍 (Taste H): zeigt ein paar Sekunden lang die Namen von allem, was man antippen kann.
function markenZeigen() {
  const an = zeit < markenBis && !Z.imAuto && !beschaeftigt && !UI.offen();
  if (!an) { if (markenAn) UI.marken(null); markenAn = false; return; }
  markenAn = true;
  UI.marken(antippbar().map(o => { const p = aufSchirm(o); return p && p[0] > 40 && p[0] < innerWidth - 40 && p[1] > 90 && p[1] < innerHeight - 110 && { x: p[0], y: p[1], text: nameVon(o), bild: VERBEN[verbVon(o)][0] }; }).filter(Boolean));
}

// ------------------------------------------------------------------ Verfolgungsfahrt
// Die Geschichte setzt den Merker "flucht": Dann fährt der Fluchtwagen los (Strecke und Tempo stehen in jagd.js).
// Hat man ihn am Ende der Strecke gestellt, kommt die Stelle "jagd_ende" der Geschichte dran.
function jagdLauf(dt, frei) {
  const an = Z.ort === 'stadt' && Z.flags.flucht && !Z.flags.marktFertig;
  fluchtwagen.visible = !!an;
  if (!an) { jagd = null; return; }
  if (!jagd) jagd = JAGD.neueJagd(STORY.JAGD, !!Z.flags.jagdFertig);
  const stand = jagd.fertig;
  if (frei) JAGD.jagdSchritt(jagd, dt, spieler, Z.imAuto, Z.blaulicht === SIRENE);
  if (frei && !stand) {
    const str = woBinIch(jagd.x, jagd.z);
    if (Z.imAuto && str !== jagd.strasse) { if (jagd.strasse) UI.toast(`📻 Otto funkt: „Flüchtiger jetzt: ${str}!“`); jagd.strasse = str; }
    if (Z.imAuto && jagd.abstand > 150 && zeit > schimpfZeit) { schimpfZeit = zeit + 10; UI.toast('Otto: „Wir verlieren ihn! Gib Gas!“'); }
    if (jagd.fertig) KLANG.spiel('rumms');
  }
  if (Z.ziel && !Z.flags.jagdFertig) Z.ziel.wo = ['stadt', jagd.x, jagd.z];       // der Wegweiser zeigt immer auf den Fluchtwagen
  // Am Ende steht der Wagen quer am Bordstein. Kommt man nah heran, geht die Geschichte weiter.
  fluchtwagen.position.set(jagd.x, 0, jagd.z); fluchtwagen.rotation.y = jagd.h + (jagd.fertig ? 0.7 : 0); autoRaeder(fluchtwagen, jagd.s);
  // Am Ziel geht es erst weiter, wenn man in der Nähe angehalten hat.
  if (frei && jagd.fertig && !Z.flags.jagdFertig && jagd.abstand < 26) {
    if (!Z.imAuto || Math.abs(Z.auto.v) < STEHT) tu('jagd_ende');
    else if (haltHinweis !== 'jagd') { haltHinweis = 'jagd'; UI.toast('Da steht er! Halt mit Abstand an.'); }
  }
}

// ------------------------------------------------------------------ Verfolgung zu Fuß
// Jemand rennt weg – und zwar wirklich: Die Figur läuft ihren Weg entlang, du rennst hinterher (Tasten oder Tippen).
// Kommst du auf Armlänge heran, hast du sie. Kommt sie am Ende ihres Wegs an oder ist sie zu weit weg, ist sie entwischt.
const LAUF_FLUCHT = 4.0, LAUF_FANG = 1.4, LAUF_WEIT = 42;       // Tempo des Flüchtenden (du: 4,6 m/s), so nah = gefangen, so weit = entwischt
let lauf = null;
function laufStart(id, weg, { tempo = LAUF_FLUCHT } = {}) {
  const o = welt.objekte.find(o => o.def.id === id && o.da);
  if (!o) return Promise.resolve(true);
  const x0 = o.x ?? o.def.x, z0 = o.z ?? o.def.z;
  o.x = x0; o.z = z0; spieler.tap = null;
  return new Promise(fertig => { lauf = { o, weg: weg.map(p => [...p]), tempo, x0, z0, h0: o.mesh.rotation.y, fertig, zeit: 0 }; });
}
function laufSchritt(dt) {
  const L = lauf; if (!L) return;
  const o = L.o, ziel = L.weg[0]; L.zeit += dt;
  if (ziel) {
    const dx = ziel[0] - o.x, dz = ziel[1] - o.z, d = Math.hypot(dx, dz), v = Math.min(L.tempo, 1.5 + L.zeit * 6);       // er kommt erst in Schwung
    if (d < 0.5) L.weg.shift(); else { o.x += dx / d * v * dt; o.z += dz / d * v * dt; o.mesh.rotation.y = Math.atan2(dx, dz); }
  }
  o.mesh.position.set(o.x, 0, o.z); o.mesh.userData.selbst = true; o.rennt = true; figurBewegen(o.mesh, dt, ziel ? L.tempo : 0);
  const ab = abstand(spieler.x, spieler.z, o.x, o.z), gefangen = ab < LAUF_FANG;
  if (!gefangen && ziel && ab < LAUF_WEIT) return;
  lauf = null; o.rennt = false; o.mesh.userData.selbst = false; spieler.tap = null;
  if (!gefangen) { o.x = L.x0; o.z = L.z0; o.mesh.position.set(o.x, 0, o.z); o.mesh.rotation.y = L.h0; }       // entwischt: Er steht wieder am Anfang, für den nächsten Versuch
  L.fertig(gefangen);
}

// ------------------------------------------------------------------ Einsatzwagen, die zu Hilfe kommen
// Der Rettungswagen ist der weiße Kastenwagen mit rotem Streifen und Blaulicht, die zweite Streife ein Wagen wie deiner.
// Sie fahren über das Straßennetz an (Strecke: anfahrt in jagd.js), halten, und zwei Leute steigen aus und gehen zu ihrer Stelle.
const GAST_LEUTE = { rtw: [['aerztin', 'frau'], ['sani', 'mann']], streife: [['pol1', 'mann', 'weste'], ['pol2', 'frau', 'weste']] };      // Möwe 12: Jan Dirks und Meike Tammen
const GAST_TEMPO = 15, GAST_GEHT = 2.0;       // so schnell fährt der Wagen (m/s) und so schnell gehen die Leute
const gaeste = [];
function gastBauen(art) {
  if (art === 'streife') return autoModell('#f4f4f4', true);
  const g = autoModell('#ffffff', false, 'auto_van'), rot = new THREE.MeshStandardMaterial({ color: '#d8261c', roughness: 0.6 });
  for (const x of [-1.12, 1.12]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 4.3), rot); s.position.set(x, 0.95, -0.1); g.add(s); }
  const blau = [-0.5, 0.5].map(x => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.3), new THREE.MeshStandardMaterial({ color: '#1747c9', roughness: 0.2, emissive: '#1e66ff', emissiveIntensity: 0 })); b.position.set(x, 1.97, 1.1); g.add(b); return b; });
  const blitz = new THREE.PointLight('#2a6bff', 0, 30, 1.4); blitz.position.set(0, 2.6, 0); g.add(blitz);
  g.userData.blau = blau; g.userData.blitz = blitz;
  return g;
}
function gastRufen(art, ziel, { aus = [0, 1], zu = null, bis = null } = {}) {
  if (!welt || !welt.stadt || !GAST_LEUTE[art]) return Promise.resolve();
  const T = JAGD.anfahrt(ziel, aus); if (!T) return Promise.resolve();
  const mesh = gastBauen(art); mesh.traverse(o => { if (o.isMesh) o.castShadow = true; }); szene.add(mesh);
  const leute = GAST_LEUTE[art].map(([datei, gerüst, weste], i) => { const g = new THREE.Group(); g.visible = false; szene.add(g); ladePolizist(g, datei, gerüst, null, weste || null); return { g, x: 0, z: 0, h: 0, ziel: zu && zu[i] || null, tempo: 0 }; });
  return new Promise(da => { gaeste.push({ art, T, s: 0, v: 0, weg: 0, x: T.pts[0][0], z: T.pts[0][1], h: 0, mesh, leute, bis, da, steht: false }); });
}
function gaesteWeg() { for (const G of gaeste) { szene.remove(G.mesh); for (const c of G.leute) szene.remove(c.g); if (G.da) G.da(); } gaeste.length = 0; }
function gastSchritt(dt) {
  if (gaeste.length && (!welt || !welt.stadt)) gaesteWeg();
  for (let i = gaeste.length - 1; i >= 0; i--) {
    const G = gaeste[i];
    // Ist der Einsatz vorbei und du bist weit weg, verschwindet der Wagen wieder.
    if (G.bis && Z.flags[G.bis] && abstand(spieler.x, spieler.z, G.x, G.z) > 90) { szene.remove(G.mesh); for (const c of G.leute) szene.remove(c.g); gaeste.splice(i, 1); continue; }
    if (!G.steht) {
      const rest = G.T.l - G.s, soll = Math.min(GAST_TEMPO, Math.max(1.5, rest * 0.45));
      G.v += Math.max(-9 * dt, Math.min(5 * dt, soll - G.v)); G.s = Math.min(G.T.l, G.s + G.v * dt); G.weg += G.v * dt;
      [G.x, G.z, G.h] = JAGD.ortAufStrecke(G.T, G.s);
      if (rest < 0.1) {       // angekommen: Die beiden steigen links und rechts aus
        G.steht = true; G.v = 0; KLANG.spiel('tuer', 0.5);
        G.leute.forEach((c, k) => { const seite = k ? 1.7 : -1.7; c.x = G.x + Math.cos(G.h) * seite + Math.sin(G.h) * 0.6; c.z = G.z - Math.sin(G.h) * seite + Math.cos(G.h) * 0.6; c.h = G.h; c.g.visible = true; });
        if (G.da) { G.da(); G.da = null; }
      }
    } else for (const c of G.leute) {
      c.tempo = 0;
      if (c.ziel) { const dx = c.ziel[0] - c.x, dz = c.ziel[1] - c.z, d = Math.hypot(dx, dz);
        if (d > 0.3) { const f = Math.min(1, GAST_GEHT * dt / d); c.x += dx * f; c.z += dz * f; c.h = Math.atan2(dx, dz); c.tempo = GAST_GEHT; } else c.ziel = null; }
      c.g.position.set(c.x, 0, c.z); c.g.rotation.y = c.h; polizistBewegen(c.g, dt, c.tempo);
    }
    G.mesh.position.set(G.x, 0, G.z); G.mesh.rotation.y = G.h; autoRaeder(G.mesh, G.weg);
    const u = G.mesh.userData, blink = Math.floor(zeit * 5) % 2;
    if (u.blau) { u.blau[0].material.emissiveIntensity = blink ? 3 : 0; u.blau[1].material.emissiveIntensity = blink ? 0 : 3; }
    if (u.blitz) u.blitz.intensity = blink ? 60 : 24;
  }
}

// Knöpfe zum Fahren auf dem Bildschirm (für das iPad)
for (const b of document.querySelectorAll('#fahren button')) {
  const t = b.dataset.t;
  b.addEventListener('pointerdown', e => { tasten[t] = true; e.preventDefault(); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => { tasten[t] = false; });
}
// ---- Lenken durch Neigen (iPad): Knopf "📱 Neigen" im Auto. Auf einem Gerät mit Finger-Bildschirm geht es beim Start von selbst an.
const neigung = new Neigung();
const NEIG_MERKER = 'blaulicht.neigen.v1';
const mitFingern = () => navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches;
function neigZeigen() {
  const k = document.getElementById('neigKnopf'), an = neigung.an;
  k.textContent = `📱 Neigen: ${an ? 'an' : 'aus'}`; k.classList.toggle('an', an);
  document.getElementById('neigMitte').hidden = !an; document.body.classList.toggle('neigen', an);
}
async function neigSchalten(an, laut = true) {
  if (an) { const ok = await neigung.start(); if (!ok && laut) UI.toast('Der Bewegungs-Sensor ist hier nicht erlaubt oder nicht da.'); if (ok && laut) UI.toast('Dreh das iPad wie ein Lenkrad. „↕ Mitte“ stellt geradeaus neu ein.'); }
  else neigung.stop();
  try { localStorage.setItem(NEIG_MERKER, neigung.an ? 'an' : 'aus'); } catch (e) { /* dann eben nicht merken */ }
  neigZeigen();
}
document.getElementById('neigKnopf').addEventListener('click', () => neigSchalten(!neigung.an));
document.getElementById('neigMitte').addEventListener('click', () => { neigung.kalibrieren(); UI.toast('Geradeaus ist jetzt so, wie du das iPad gerade hältst.'); });
// Das iPad fragt nur nach einem Fingertipp um Erlaubnis – deshalb gleich beim Tipp auf "Neues Spiel" oder "Weiter spielen".
for (const id of ['neuesSpiel', 'weiterSpielen']) document.getElementById(id).addEventListener('click', () => {
  let wunsch = null; try { wunsch = localStorage.getItem(NEIG_MERKER); } catch (e) { wunsch = null; }
  if (mitFingern() && wunsch !== 'aus' && !neigung.an) neigSchalten(true, false);
});

// Die vier Kamera-Knöpfe am rechten Rand (gedrückt halten)
for (const b of document.querySelectorAll('#kamKnoepfe button')) {
  if (b.dataset.k === 'normal') { b.addEventListener('click', kamNormal); continue; }
  b.addEventListener('pointerdown', e => { e.preventDefault(); kam.taste = b.dataset.k; });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => { kam.taste = null; });
  b.addEventListener('contextmenu', e => e.preventDefault());
}
document.getElementById('radar').addEventListener('click', karteAuf);
UI.verbinde({ notizbuch: notizbuchAuf, tasche: tascheAuf, funk: funkAuf, blaulicht: blaulichtWeiter, verb: verbSetzen, lupe: () => { markenBis = zeit + MARKEN_ZEIT; } });

// ------------------------------------------------------------------ Start und Schleife
function bild() { renderer.render(szene, kamera); }
let letzte = performance.now();
function schleife(jetzt) {
  const vorher = letzte, dt = Math.min(0.05, (jetzt - letzte) / 1000); letzte = jetzt;
  if (welt && !window.__polizei.angehalten) { schritt(dt); tempoMessen((jetzt - vorher) / 1000); }
  if (welt && !window.__polizei.angehalten) bild();       // angehalten: Dann zeichnet nur noch step()
  requestAnimationFrame(schleife);
}

// Zum Testen: __polizei.step(n) spult n Bilder vor, __polizei.tu('spind') spielt eine Stelle der Geschichte.
window.__polizei = { get Z() { return Z; }, get kim() { return kim; }, S, get beschaeftigt() { return beschaeftigt; }, get jagd() { return jagd; }, get verb() { return verb; }, verbSetzen, antippbar, aufSchirm, spieler, tasten, STORY, ORTE, tu, bild, KARTE, kamera, renderer, get verkehr() { return verkehr; }, get himmel() { return himmel; }, ortLaden, lichtSetzen, kam: () => ({ k: kamera, v: new THREE.Vector3() }), get welt() { return welt; }, angehalten: false, get wetter() { return wetter; }, frei: null, get lauf() { return lauf; }, gaeste, neigung, kamStand: kam, kamNormal,
  step(n = 1, ohneBild = false) { for (let i = 0; i < n; i++) schritt(1 / 60); if (!ohneBild) bild(); } };       // ohneBild = nur rechnen, nicht zeichnen (schneller)

async function start() {
  let alt = null;
  try { alt = JSON.parse(localStorage.getItem(SPEICHER)); } catch (e) { alt = null; }
  await BILD.ladeBilder();           // Bodenbilder (Asphalt, Pflaster, Gras …) zuerst laden
  himmel = baueHimmel(); umland = baueUmland(); verkehr = neuerVerkehr(); verkehrBild = baueVerkehr(verkehr);
  wetter = baueWetter({ szene, kamera, oben, sonne, himmel, melde: UI.toast, neuesLicht: () => lichtSetzen(Z.licht) });
  if (WUNSCH.get('wetter')) wetter.setze(WUNSCH.get('wetter'), true);       // zum Ausprobieren: ?wetter=gewitter
  lichtSetzen('tag'); ortLaden('wache', 0, 3.5); anzeigen();
  requestAnimationFrame(schleife);
  const was = await UI.menue(!!alt);
  KLANG.an();
  if (was === 'weiter') {
    Z = alt; blaulichtSetzen(AUS); Z.auto.v = 0;
    lichtSetzen(Z.licht); ortLaden(Z.ort, Z.sp.x, Z.sp.z); anzeigen();
  } else {
    Z = neuerStand(); blaulichtSetzen(AUS); lichtSetzen(Z.licht); ortLaden(Z.ort, Z.sp.x, Z.sp.z); anzeigen();
    beschaeftigt = true;
    await STORY.beginn(S);
    beschaeftigt = false; anzeigen();
  }
}
start();
