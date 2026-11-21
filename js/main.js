// Blaulicht über Möwenbrück – das Spiel selbst: Bild, Steuerung, Laufen, Fahren.
// Die Geschichte steht in story.js, die Orte in daten.js, die 3D-Formen in welt.js, die Kästen in oberflaeche.js.
//
// Richtungen: Ein Winkel h bedeutet "schaut nach (sin h, cos h)". h = 0 schaut zur Kamera (+z), links ist dann +x.

import * as THREE from 'three';
import { ORTE } from './daten.js';
import * as STORY from './story.js';
import * as UI from './oberflaeche.js';
import * as KLANG from './klang.js';
import { baueOrt, figur, figurBewegen, autoModell, spiegelBild } from './welt.js';
import { ladePolizist } from './polizist.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as BILD from './bilder.js';
import * as KARTE from './karte.js';
import { baueHimmel } from './himmel.js';
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
// Schnell fahren darf man mit Stufe 1 und 2. Platz machen die anderen Autos aber nur, wenn sie die Sirene hören (Stufe 2).
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
const kamera = new THREE.PerspectiveCamera(50, 1, 0.8, 12000);
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

function lichtSetzen(name) {
  Z.licht = name;
  const l = LICHT[name], draussen = !!(welt && welt.stadt);
  oben.intensity = l.oben; sonne.intensity = l.sonne; sonne.color.set(l.farbe || '#fff4e0');
  lampe.intensity = l.lampe; wagen.userData.sw.intensity = l.auto;
  if (wagen.userData.lack) wagen.userData.lack.envMapIntensity = SPIEGELN[name] ?? 0.5;
  sonne.castShadow = draussen && name !== 'dunkel' && !sparsam;
  if (draussen && himmel) {
    // In der Stadt: echter Himmel mit Wolken, Dunst in der Ferne, Fenster und Laternen an oder aus
    himmel.setze(name); umland.licht(name); verkehrBild.licht(name); welt.stadt.licht(name);
    szene.background = new THREE.Color(himmel.dunst);
    szene.fog = new THREE.Fog(himmel.dunst, name === 'tag' ? 260 : 160, name === 'tag' ? SICHT : SICHT * 0.75);
    oben.color.set(name === 'nacht' ? '#8fa4d8' : name === 'abend' ? '#ffd9c0' : '#ffffff'); oben.groundColor.set(name === 'nacht' ? '#1a2238' : '#8a8a7a');
  } else {
    szene.background = new THREE.Color(l.himmel);
    szene.fog = new THREE.Fog(l.himmel, name === 'dunkel' ? 30 : 120, name === 'dunkel' ? 60 : 420);
    oben.color.set('#ffffff'); oben.groundColor.set('#8a8a7a'); sonne.position.set(30, 60, 40); sonne.target.position.set(0, 0, 0);
  }
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
    o.da = (!d.wenn || Z.flags[d.wenn]) && (!d.bis || !Z.flags[d.bis]);
    o.mesh.visible = o.da && !(d.folgt && Z.imAuto);
  }
  welt.lose = welt.objekte.filter(o => o.da && o.fest).map(o => o.fest);      // Dinge, die kommen und gehen (der falsch geparkte Kombi …)
  if (!welt.raster) welt.lose = welt.fest.concat(welt.lose);
  gitter = null;      // die Kästchen für die Wegsuche werden beim nächsten Tippen neu gerechnet
}

// ------------------------------------------------------------------ Werkzeug für die Geschichte (siehe story.js)
const S = {
  sag: (wer, text) => UI.dialog(wer, text),
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
  uhr(t) { Z.uhr = t; anzeigen(); },
  blaulicht: () => Z.blaulicht,                    // 0 = aus, 1 = nur Blaulicht, 2 = Blaulicht mit Sirene
  blaulichtAn: stufe => blaulichtSetzen(stufe),
  jagd: () => JAGD.bilanz(jagd),                   // wie lief die Verfolgung? { rumms, sirene }
  speichern() { Z.sp = { x: spieler.x, z: spieler.z }; try { localStorage.setItem(SPEICHER, JSON.stringify(Z)); } catch (e) { /* kein Speicher: dann eben nicht */ } },
  ende: (titel, text) => UI.ende(titel, text, Z.punkte, STORY.MAX_PUNKTE, Z.notizen),
};

// Eine Stelle der Geschichte abspielen. Solange sie läuft, bleibt die Figur stehen.
async function tu(akt, def) {
  if (beschaeftigt || !STORY.AKT[akt]) return;
  beschaeftigt = true; spieler.tap = null;
  try { await STORY.AKT[akt](S, def); } finally { beschaeftigt = false; sichtbarkeit(); anzeigen(); }
}

function anzeigen() {
  // In der Stadt steht oben links, in welcher Straße oder in welchem Viertel du gerade bist.
  const ort = welt && welt.stadt ? `${woBinIch(spieler.x, spieler.z)} · Möwenbrück` : ORTE[Z.ort].name;
  UI.anzeige({ ziel: Z.ziel && Z.ziel.text, punkte: Z.punkte, uhr: Z.uhr, ort });
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
}

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
function einsteigen() { Z.imAuto = true; spieler.tap = null; sichtbarkeit(); tu('eingestiegen'); }

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
function schieben(x, z, r) {
  const imWeg = nahe(x, z, r + 2);
  // Die fahrenden Autos sind auch im Weg (als Kreise).
  if (verkehr && welt.stadt) for (const c of verkehr.autos) {
    if (!c.da) continue;
    const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), min = r + 1.1;
    if (d < min && d > 0.001) { x = c.x + dx / d * min; z = c.z + dz / d * min; }
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
    if (o) { x = o.x + px * o.c + pz * o.s; z = o.z - px * o.s + pz * o.c; } else { x = px; z = pz; }
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
  if (vx || vz) spieler.tap = null;
  else if (spieler.tap) {
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
  const lenk = (tasten.links ? 1 : 0) - (tasten.rechts ? 1 : 0);
  a.h += lenk * dt * Math.max(-1.6, Math.min(1.6, a.v * 0.16));
  const vorher = a.v;
  const zx = a.x + Math.sin(a.h) * a.v * dt, zz = a.z + Math.cos(a.h) * a.v * dt;
  [a.x, a.z] = schieben(zx, zz, 1.5);
  if (abstand(zx, zz, a.x, a.z) > 0.02) {       // angestoßen
    a.v *= -0.25;
    if (Math.abs(vorher) > 5 && zeit > rummsZeit) { rummsZeit = zeit + 4; KLANG.spiel('rumms'); 
      // Bei einer Verfolgung kostet ein Rumms keinen Punkt – aber den Bonus für sauberes Fahren gibt es dann nicht mehr.
      if (jagd && !jagd.fertig && Z.flags.jagdLos) { jagd.rumms++; UI.toast('Rumms! Otto: „Ruhig bleiben, Kim!“'); } else S.punkte(-1, 'Rumms! Vorsichtig fahren');
    }
  }
  const kmh = Math.abs(a.v) * 3.6;
  zuSchnellZeit = (!Z.blaulicht && kmh > ZU_SCHNELL) ? zuSchnellZeit + dt : 0;
  if (zuSchnellZeit > 1.5 && zeit > schimpfZeit) { schimpfZeit = zeit + 15; S.punkte(-1, 'Otto: „In der Stadt gilt 50!“'); }
  spieler.x = a.x; spieler.z = a.z;
  UI.tacho(kmh);
}

function ottoFolgt(dt) {
  for (const o of welt.objekte) {
    if (!o.def.folgt || Z.imAuto) continue;
    const zx = spieler.x - Math.sin(spieler.h) * 1.4 + Math.cos(spieler.h) * 0.9, zz = spieler.z - Math.cos(spieler.h) * 1.4 - Math.sin(spieler.h) * 0.9;
    const dx = zx - o.x, dz = zz - o.z, d = Math.hypot(dx, dz);
    const tempo = d > 12 ? 40 : d > 1.2 ? LAUF_TEMPO * 1.05 : 0;      // zu weit weg: hinterherspringen
    if (tempo) { o.x += dx / d * Math.min(d, tempo * dt); o.z += dz / d * Math.min(d, tempo * dt); o.mesh.rotation.y = Math.atan2(dx, dz); }
    o.mesh.position.set(o.x, 0, o.z);
    figurBewegen(o.mesh, dt, tempo ? 4 : 0);
  }
}

function zonen() {
  for (const zo of STORY.ZONEN) {
    if (zo.ort !== Z.ort || Z.flags['zone_' + zo.id] || (zo.wenn && !Z.flags[zo.wenn]) || (zo.bis && Z.flags[zo.bis])) continue;
    if (abstand(spieler.x, spieler.z, zo.x, zo.z) < zo.r) { Z.flags['zone_' + zo.id] = true; tu(zo.akt); return; }
  }
}

function kameraSetzen(staerke) {
  let px, py, pz, bx, bz;
  const frei = window.__polizei.frei;       // zum Testen: Kamera an eine feste Stelle setzen, frei = { von: [x, y, z], nach: [x, y, z] }
  if (frei) { kamera.position.set(...frei.von); kamera.lookAt(...frei.nach); return; }
  if (Z.imAuto) {
    const a = Z.auto;
    // Die Kamera fährt hinter dem Wagen her. Gerät sie dabei in ein Haus, rückt sie näher heran und höher.
    let weg = KAMERA_AUTO[0]; py = KAMERA_AUTO[1];
    const imHaus = (x, z) => nahe(x, z, 1).some(q => q[2] - q[0] > 3 && q[3] - q[1] > 3 && imHindernis(x, z, q, 0.8));
    while (weg > 2.5 && imHaus(a.x - Math.sin(a.h) * weg, a.z - Math.cos(a.h) * weg)) { weg -= 1.5; py += 0.9; }
    px = a.x - Math.sin(a.h) * weg; pz = a.z - Math.cos(a.h) * weg;
    bx = a.x + Math.sin(a.h) * 4; bz = a.z + Math.cos(a.h) * 4;
  } else {
    const [hoch, weg] = ORTE[Z.ort].kamera;
    px = spieler.x; py = hoch; pz = spieler.z + weg; bx = spieler.x; bz = spieler.z - 0.5;
  }
  kamera.position.lerp(new THREE.Vector3(px, py, pz), staerke);
  blick.lerp(new THREE.Vector3(bx, 1, bz), staerke);
  kamera.lookAt(blick);
}

// Alles, was nur in der Stadt läuft: Häuser vor der Kamera aufschneiden, Schatten, Himmel, Verkehr, Radar.
let bildNr = 0;
function stadtSchritt(dt) {
  const S = welt.stadt;
  S.schnitt.constant = Z.imAuto || window.__polizei.frei ? 1e9 : spieler.z + SCHNITT_VOR;
  S.schritt(dt, spieler.x, spieler.z);
  // Die Sonne (nachts der Mond) steht immer gleich weit von dir weg, damit ihr Schatten dich begleitet.
  sonne.position.set(spieler.x + himmel.sonneRichtung.x * 300, Math.max(60, himmel.sonneRichtung.y * 300), spieler.z + himmel.sonneRichtung.z * 300);
  sonne.target.position.set(spieler.x, 0, spieler.z);
  himmel.schritt(dt, kamera); umland.schritt(dt);
  // Platz machen die anderen nur bei Blaulicht MIT Sirene. Vor einer Unfallstelle und hinter dem Fluchtwagen bremsen sie.
  const imWeg = welt.objekte.filter(o => o.da && o.def.verkehr).map(o => ({ x: o.def.x, z: o.def.z, r: 1.3 }));
  if (fluchtwagen.visible) imWeg.push({ x: fluchtwagen.position.x, z: fluchtwagen.position.z, r: 1.3 });
  if (!Z.imAuto) imWeg.push({ x: Z.auto.x, z: Z.auto.z, r: 1.3 });       // dein abgestellter Streifenwagen
  verkehr.schritt(dt, { x: spieler.x, z: spieler.z, r: Z.imAuto ? 1.2 : 0.4 }, Z.imAuto && Z.blaulicht === SIRENE, imWeg);
  verkehrBild.schritt();
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
  const frei = !beschaeftigt && !UI.offen() && !KARTE.kartOffen();
  if (frei) { if (Z.imAuto) fahren(dt); else { zuFuss(dt); UI.tacho(null); } }
  else spieler.tempo = 0;
  if (frei) zonen();
  ottoFolgt(dt);

  // Figuren und Wagen an ihre Plätze setzen
  kim.visible = !Z.imAuto; kim.position.set(spieler.x, 0, spieler.z); kim.rotation.y = spieler.h; figurBewegen(kim, dt, spieler.tempo);
  wagen.position.set(Z.auto.x, 0, Z.auto.z); wagen.rotation.y = Z.auto.h;
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
  kameraSetzen(1 - Math.exp(-dt * (Z.imAuto ? 4 : 7)));
  if (welt.stadt) stadtSchritt(dt);
  jagdLauf(dt, frei);
  wegweiser();
  UI.knoepfe(moeglich(), k => k.tun());
  UI.fahrKnoepfe(Z.imAuto);
  markenZeigen();
}

// ------------------------------------------------------------------ Steuerung
const TASTE = { ArrowUp: 'hoch', w: 'hoch', ArrowDown: 'runter', s: 'runter', ArrowLeft: 'links', a: 'links', ArrowRight: 'rechts', d: 'rechts' };
addEventListener('keydown', e => {
  KLANG.an();
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (KARTE.kartOffen()) { if (k === 'm' || k === 'Escape' || k === 'Enter') KARTE.karteZu(); e.preventDefault(); return; }
  if (UI.taste(k)) { e.preventDefault(); return; }
  if (TASTE[k]) { tasten[TASTE[k]] = true; e.preventDefault(); return; }
  if (beschaeftigt) return;
  if (k === 'e' || k === 'Enter') { const m = moeglich(); if (m.length) m[0].tun(); }
  else if (k === 'f') funkAuf(); else if (k === 'n') notizbuchAuf(); else if (k === 't') tascheAuf();
  else if (k === 'b' && Z.imAuto) blaulichtWeiter();
  else if (k === 'm') karteAuf();
  else if (k === 'h') markenBis = zeit + MARKEN_ZEIT;
  else if (!Z.imAuto && VERB_TASTE[k]) verbSetzen(VERB_TASTE[k]);
});
addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (TASTE[k]) tasten[TASTE[k]] = false; });

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
canvas.addEventListener('pointerdown', e => {
  KLANG.an();
  if (Z.imAuto || beschaeftigt || UI.offen() || KARTE.kartOffen()) return;
  if (e.button === 2) {       // rechte Maustaste: nächste Tätigkeit (wie in den alten Adventures)
    const v = Object.keys(VERBEN); return verbSetzen(v[(v.indexOf(verb) + 1) % v.length]);
  }
  const o = unterZeiger(e.clientX, e.clientY, e.pointerType === 'mouse' ? TREFF_MAUS : TREFF_FINGER);
  if (o) return klickAuf(o);
  // Auf den Boden getippt: Die Figur läuft dorthin – egal, welche Tätigkeit gerade gewählt ist.
  strahl.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), kamera);
  if (!strahl.ray.intersectPlane(ebene, treffer)) return;
  const weg = wegSuchen(spieler.x, spieler.z, treffer.x, treffer.z);
  spieler.tap = weg ? { weg, obj: null, zeit: 0 } : null;
});
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
  fluchtwagen.position.set(jagd.x, 0, jagd.z); fluchtwagen.rotation.y = jagd.h + (jagd.fertig ? 0.7 : 0);
  if (frei && jagd.fertig && !Z.flags.jagdFertig && jagd.abstand < 26) { Z.auto.v = 0; tu('jagd_ende'); }
}

// Knöpfe zum Fahren auf dem Bildschirm (für das iPad)
for (const b of document.querySelectorAll('#fahren button')) {
  const t = b.dataset.t;
  b.addEventListener('pointerdown', e => { tasten[t] = true; e.preventDefault(); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => { tasten[t] = false; });
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
window.__polizei = { get Z() { return Z; }, S, get jagd() { return jagd; }, get verb() { return verb; }, verbSetzen, antippbar, aufSchirm, spieler, tasten, STORY, ORTE, tu, bild, KARTE, kamera, renderer, get verkehr() { return verkehr; }, get himmel() { return himmel; }, ortLaden, lichtSetzen, kam: () => ({ k: kamera, v: new THREE.Vector3() }), get welt() { return welt; }, angehalten: false, frei: null,
  step(n = 1, ohneBild = false) { for (let i = 0; i < n; i++) schritt(1 / 60); if (!ohneBild) bild(); } };       // ohneBild = nur rechnen, nicht zeichnen (schneller)

async function start() {
  let alt = null;
  try { alt = JSON.parse(localStorage.getItem(SPEICHER)); } catch (e) { alt = null; }
  await BILD.ladeBilder();           // Bodenbilder (Asphalt, Pflaster, Gras …) zuerst laden
  himmel = baueHimmel(); umland = baueUmland(); verkehr = neuerVerkehr(); verkehrBild = baueVerkehr(verkehr);
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
