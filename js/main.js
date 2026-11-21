// Blaulicht über Möwenbrück – das Spiel selbst: Bild, Steuerung, Laufen, Fahren.
// Die Geschichte steht in story.js, die Orte in daten.js, die 3D-Formen in welt.js, die Kästen in oberflaeche.js.
//
// Richtungen: Ein Winkel h bedeutet "schaut nach (sin h, cos h)". h = 0 schaut zur Kamera (+z), links ist dann +x.

import * as THREE from 'three';
import { ORTE } from './daten.js';
import * as STORY from './story.js';
import * as UI from './oberflaeche.js';
import * as KLANG from './klang.js';
import { baueOrt, figur, figurBewegen, autoModell } from './welt.js';

// ------------------------------------------------------------------ Zahlen zum Einstellen
const LAUF_TEMPO = 4.6;          // Meter pro Sekunde zu Fuß
const NAH = 2.1;                 // so nah muss man an etwas heran, um es zu benutzen
const LAMPE_WINKEL = 0.8;        // halbe Breite des Lichtkegels (Bogenmaß)
const GAS = 7, BREMSE = 14, ROLLEN = 1.6;      // Auto: schneller werden, bremsen, ausrollen (m/s²)
const V_MAX = 19, V_MAX_BLAU = 26;             // Höchsttempo ohne und mit Blaulicht (m/s)
const ZU_SCHNELL = 58;           // ab so vielen km/h ohne Blaulicht schimpft Otto
const SPEICHER = 'blaulicht.stand.v1';

const LICHT = {                  // Himmel, Licht von oben, Sonne, Taschenlampe, Scheinwerfer
  tag: { himmel: '#9fd3f2', oben: 2.2, sonne: 1.6, lampe: 0, auto: 0 },
  abend: { himmel: '#e39a6b', oben: 1.2, sonne: 0.8, lampe: 0, auto: 250, farbe: '#ffb070' },
  nacht: { himmel: '#0b1430', oben: 0.45, sonne: 0.1, lampe: 25, auto: 500 },
  dunkel: { himmel: '#040508', oben: 0.32, sonne: 0, lampe: 70, auto: 0 },
};

// ------------------------------------------------------------------ Spielstand
let Z = neuerStand();
function neuerStand() {
  return { flags: {}, punkte: 0, sachen: [], notizen: [], ziel: null, ort: STORY.START.ort, licht: STORY.START.licht, uhr: STORY.START.uhr,
    imAuto: false, blaulicht: false, auto: { x: 0, z: 0, h: 0, v: 0 }, sp: { x: STORY.START.x, z: STORY.START.z } };
}
const spieler = { x: 0, z: 0, h: Math.PI, tap: null, tempo: 0 };
let welt = null;
let beschaeftigt = false;        // true, solange die Geschichte gerade etwas erzählt
const tasten = {};

// ------------------------------------------------------------------ Bild
const canvas = document.getElementById('bild');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const szene = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(50, 1, 0.5, 600);
const blick = new THREE.Vector3();
const oben = new THREE.HemisphereLight('#ffffff', '#8a8a7a', 2);
const sonne = new THREE.DirectionalLight('#fff4e0', 1.5); sonne.position.set(30, 60, 40);
const lampe = new THREE.SpotLight('#fff6d8', 0, 16, 0.55, 0.45, 1.3);
szene.add(oben, sonne, lampe, lampe.target);

const kim = figur({ hemd: '#2b4c9b', hose: '#1b2a4a', haut: '#f0c8a0', haar: '#7a4a22', muetze: '#f4f4f4' });
const wagen = autoModell('#f4f4f4', true);
const zielSaeule = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 40, 20, 1, true),
  new THREE.MeshBasicMaterial({ color: '#ffd23a', transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
szene.add(kim, wagen, zielSaeule);

function groesse() {
  renderer.setSize(innerWidth, innerHeight, false);
  kamera.aspect = innerWidth / innerHeight; kamera.updateProjectionMatrix();
}
addEventListener('resize', groesse); groesse();

function lichtSetzen(name) {
  Z.licht = name;
  const l = LICHT[name];
  szene.background = new THREE.Color(l.himmel);
  szene.fog = new THREE.Fog(l.himmel, name === 'dunkel' ? 30 : 120, name === 'dunkel' ? 60 : 420);
  oben.intensity = l.oben; sonne.intensity = l.sonne; sonne.color.set(l.farbe || '#fff4e0');
  lampe.intensity = l.lampe; wagen.userData.sw.intensity = l.auto;
}

// ------------------------------------------------------------------ Orte wechseln
function ortLaden(name, x, z) {
  if (welt) szene.remove(welt.gruppe);
  Z.ort = name;
  welt = baueOrt(ORTE[name]);
  szene.add(welt.gruppe);
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
  welt.imWeg = welt.fest.concat(welt.objekte.filter(o => o.da && o.fest).map(o => o.fest));
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
  licht: lichtSetzen,
  uhr(t) { Z.uhr = t; anzeigen(); },
  blaulicht: () => Z.blaulicht,
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
  UI.anzeige({ ziel: Z.ziel && Z.ziel.text, punkte: Z.punkte, uhr: Z.uhr, ort: ORTE[Z.ort].name });
}

// ------------------------------------------------------------------ Dauer-Geräusche (alles andere steht in klang.js)
let schrittZeit = 0;
function geraeusche(dt) {
  const stadt = Z.ort === 'stadt', nah = (x, z, weit) => Math.max(0, 1 - abstand(spieler.x, spieler.z, x, z) / weit);
  KLANG.schleife('sirene', Z.blaulicht ? 1 : 0);
  KLANG.schleife('motor', Z.imAuto ? 0.6 + Math.abs(Z.auto.v) / 40 : 0, 0.8 + Math.abs(Z.auto.v) / 14);
  KLANG.schleife('markt', stadt && Z.licht === 'tag' ? nah(-40, -30, 60) : 0);
  KLANG.schleife('moewen', stadt && Z.licht !== 'nacht' ? 0.4 + nah(0, -100, 120) * 0.6 : 0);
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
  Z.imAuto = false; kameraSetzen(0.6); a.v = 0; blaulichtSetzen(false);
  spieler.x = a.x + Math.cos(a.h) * 2; spieler.z = a.z - Math.sin(a.h) * 2; spieler.h = a.h;
  [spieler.x, spieler.z] = schieben(spieler.x, spieler.z, 0.4);
  for (const o of welt.objekte) if (o.def.folgt) { o.x = a.x - Math.cos(a.h) * 2; o.z = a.z + Math.sin(a.h) * 2; }
  sichtbarkeit();
}
function einsteigen() { Z.imAuto = true; spieler.tap = null; sichtbarkeit(); tu('eingestiegen'); }

function blaulichtSetzen(an) {
  Z.blaulicht = an;
  document.getElementById('blaulicht').classList.toggle('an', an);
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
function schieben(x, z, r) {
  for (let runde = 0; runde < 2; runde++) for (const q of welt.imWeg) {
    const nx = Math.max(q[0], Math.min(x, q[2])), nz = Math.max(q[1], Math.min(z, q[3]));
    let dx = x - nx, dz = z - nz; const d = Math.hypot(dx, dz);
    if (d >= r) continue;
    if (d > 0.0001) { x = nx + dx / d * r; z = nz + dz / d * r; }
    else {   // mitten im Rechteck: zur nächsten Kante hinaus
      const l = x - q[0], re = q[2] - x, o = z - q[1], u = q[3] - z, m = Math.min(l, re, o, u);
      if (m === l) x = q[0] - r; else if (m === re) x = q[2] + r; else if (m === o) z = q[1] - r; else z = q[3] + r;
    }
  }
  const G = ORTE[Z.ort].gross;
  return [Math.max(G[0] + r, Math.min(G[2] - r, x)), Math.max(G[1] + r, Math.min(G[3] - r, z))];
}

// ------------------------------------------------------------------ Wegsuche für das Tippen
// Der Ort wird in kleine Kästchen geteilt (frei oder zu). Gesucht wird der kürzeste Weg von Kästchen zu Kästchen
// um alle Hindernisse herum (das Verfahren heißt A*). Drinnen sind die Kästchen 0,5 m groß, in der Stadt 1 m.
let gitter = null;
function gitterBauen() {
  const G = ORTE[Z.ort].gross, k = ORTE[Z.ort].draussen ? 1 : 0.5, r = 0.48;
  const nx = Math.ceil((G[2] - G[0]) / k), nz = Math.ceil((G[3] - G[1]) / k), zu = new Uint8Array(nx * nz);
  for (const q of welt.imWeg) {
    const i1 = Math.max(0, Math.floor((q[0] - r - G[0]) / k)), i2 = Math.min(nx - 1, Math.floor((q[2] + r - G[0]) / k));
    const j1 = Math.max(0, Math.floor((q[1] - r - G[1]) / k)), j2 = Math.min(nz - 1, Math.floor((q[3] + r - G[1]) / k));
    for (let j = j1; j <= j2; j++) for (let i = i1; i <= i2; i++) {
      const x = G[0] + (i + 0.5) * k, z = G[1] + (j + 0.5) * k;
      if (Math.hypot(x - Math.max(q[0], Math.min(x, q[2])), z - Math.max(q[1], Math.min(z, q[3]))) < r) zu[j * nx + i] = 1;
    }
  }
  gitter = { G, k, nx, nz, zu };
}
function wegSuchen(sx, sz, zx, zz) {
  if (!gitter) gitterBauen();
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
    if (t.obj && erreichbar(t.obj)) { spieler.tap = null; tu(t.obj.def.akt, t.obj.def); return; }
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
    if (Math.abs(vorher) > 5 && zeit > rummsZeit) { rummsZeit = zeit + 4; KLANG.spiel('rumms'); S.punkte(-1, 'Rumms! Vorsichtig fahren'); }
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
  if (Z.imAuto) {
    const a = Z.auto;
    px = a.x - Math.sin(a.h) * 11; pz = a.z - Math.cos(a.h) * 11; py = 5.5;
    bx = a.x + Math.sin(a.h) * 5; bz = a.z + Math.cos(a.h) * 5;
  } else {
    const [hoch, weg] = ORTE[Z.ort].kamera;
    px = spieler.x; py = hoch; pz = spieler.z + weg; bx = spieler.x; bz = spieler.z - 0.5;
  }
  kamera.position.lerp(new THREE.Vector3(px, py, pz), staerke);
  blick.lerp(new THREE.Vector3(bx, 1, bz), staerke);
  kamera.lookAt(blick);
}

// Häuser, die zwischen Kamera und Figur stehen, werden durchsichtig.
function haeuserBlenden() {
  for (const h of welt.haeuser) {
    const vor = !Z.imAuto && h.r[1] > spieler.z - 1 && h.r[1] < spieler.z + 22 && h.r[0] < spieler.x + 11 && h.r[2] > spieler.x - 11;
    const ziel = vor ? 0.15 : 1, m = h.mesh.material;
    if (m.opacity !== ziel) { m.opacity = ziel; h.mesh.children[0].material.opacity = ziel; m.depthWrite = !vor; }
  }
}

function wegweiser() {
  const w = Z.ziel && Z.ziel.wo;
  const da = !!w && w[0] === Z.ort;
  zielSaeule.visible = da && Z.ort === 'stadt';
  if (!da) return UI.pfeil(null);
  zielSaeule.position.set(w[1], 20, w[2]);
  const dx = w[1] - spieler.x, dz = w[2] - spieler.z, weit = Math.hypot(dx, dz);
  if (weit < 3) return UI.pfeil(null);
  // Im Auto zeigt "oben" im Bild nach vorn, zu Fuß nach Norden (−z).
  const h = Z.auto.h;
  const winkel = Z.imAuto ? Math.atan2(-(dx * Math.cos(h) - dz * Math.sin(h)), dx * Math.sin(h) + dz * Math.cos(h)) : Math.atan2(dx, -dz);
  UI.pfeil(winkel, weit);
}

function schritt(dt) {
  zeit += dt;
  const frei = !beschaeftigt && !UI.offen();
  if (frei) { if (Z.imAuto) fahren(dt); else { zuFuss(dt); UI.tacho(null); } }
  else spieler.tempo = 0;
  if (frei) zonen();
  ottoFolgt(dt);

  // Figuren und Wagen an ihre Plätze setzen
  kim.visible = !Z.imAuto; kim.position.set(spieler.x, 0, spieler.z); kim.rotation.y = spieler.h; figurBewegen(kim, dt, spieler.tempo);
  wagen.position.set(Z.auto.x, 0, Z.auto.z); wagen.rotation.y = Z.auto.h;
  const u = wagen.userData, blink = Z.blaulicht && Math.floor(zeit * 5) % 2;
  u.blau[0].material.emissiveIntensity = Z.blaulicht && blink ? 3 : 0; u.blau[1].material.emissiveIntensity = Z.blaulicht && !blink ? 3 : 0;
  u.blitz.intensity = Z.blaulicht ? (blink ? 160 : 60) : 0;
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
  haeuserBlenden(); wegweiser();
  UI.knoepfe(moeglich(), k => k.tun());
  UI.fahrKnoepfe(Z.imAuto);
}

// ------------------------------------------------------------------ Steuerung
const TASTE = { ArrowUp: 'hoch', w: 'hoch', ArrowDown: 'runter', s: 'runter', ArrowLeft: 'links', a: 'links', ArrowRight: 'rechts', d: 'rechts' };
addEventListener('keydown', e => {
  KLANG.an();
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (UI.taste(k)) { e.preventDefault(); return; }
  if (TASTE[k]) { tasten[TASTE[k]] = true; e.preventDefault(); return; }
  if (beschaeftigt) return;
  if (k === 'e' || k === 'Enter') { const m = moeglich(); if (m.length) m[0].tun(); }
  else if (k === 'f') funkAuf(); else if (k === 'n') notizbuchAuf(); else if (k === 't') tascheAuf();
  else if (k === 'b' && Z.imAuto) blaulichtSetzen(!Z.blaulicht);
});
addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (TASTE[k]) tasten[TASTE[k]] = false; });

// Tippen oder Klicken auf den Boden: Die Figur läuft dorthin. Tippt man auf ein Ding oder eine Person, benutzt sie es dort gleich.
const strahl = new THREE.Raycaster(), ebene = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), treffer = new THREE.Vector3();
canvas.addEventListener('pointerdown', e => {
  KLANG.an();
  if (Z.imAuto || beschaeftigt || UI.offen()) return;
  strahl.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), kamera);
  if (!strahl.ray.intersectPlane(ebene, treffer)) return;
  let obj = null, best = 1.8;
  for (const o of welt.objekte) {
    if (!o.da || !o.def.akt) continue;
    const d = abstand(treffer.x, treffer.z, o.x ?? o.def.x, o.z ?? o.def.z);
    if (d < best) { best = d; obj = o; }
  }
  const weg = wegSuchen(spieler.x, spieler.z, obj ? (obj.x ?? obj.def.x) : treffer.x, obj ? (obj.z ?? obj.def.z) : treffer.z);
  spieler.tap = weg ? { weg, obj, zeit: 0 } : null;
});
// Knöpfe zum Fahren auf dem Bildschirm (für das iPad)
for (const b of document.querySelectorAll('#fahren button')) {
  const t = b.dataset.t;
  b.addEventListener('pointerdown', e => { tasten[t] = true; e.preventDefault(); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => { tasten[t] = false; });
}
UI.verbinde({ notizbuch: notizbuchAuf, tasche: tascheAuf, funk: funkAuf, blaulicht: () => blaulichtSetzen(!Z.blaulicht) });

// ------------------------------------------------------------------ Start und Schleife
function bild() { renderer.render(szene, kamera); }
let letzte = performance.now();
function schleife(jetzt) {
  const dt = Math.min(0.05, (jetzt - letzte) / 1000); letzte = jetzt;
  if (welt && !window.__polizei.angehalten) schritt(dt);
  if (welt) bild();
  requestAnimationFrame(schleife);
}

// Zum Testen: __polizei.step(n) spult n Bilder vor, __polizei.tu('spind') spielt eine Stelle der Geschichte.
window.__polizei = { get Z() { return Z; }, S, spieler, tasten, STORY, ORTE, tu, bild, kam: () => ({ k: kamera, v: new THREE.Vector3() }), get welt() { return welt; }, angehalten: false,
  step(n = 1) { for (let i = 0; i < n; i++) schritt(1 / 60); bild(); } };

async function start() {
  let alt = null;
  try { alt = JSON.parse(localStorage.getItem(SPEICHER)); } catch (e) { alt = null; }
  lichtSetzen('tag'); ortLaden('wache', 0, 3.5); anzeigen();
  requestAnimationFrame(schleife);
  const was = await UI.menue(!!alt);
  KLANG.an();
  if (was === 'weiter') {
    Z = alt; Z.blaulicht = false; Z.auto.v = 0;
    lichtSetzen(Z.licht); ortLaden(Z.ort, Z.sp.x, Z.sp.z); anzeigen();
  } else {
    Z = neuerStand(); lichtSetzen(Z.licht); ortLaden(Z.ort, Z.sp.x, Z.sp.z); anzeigen();
    beschaeftigt = true;
    await STORY.beginn(S);
    beschaeftigt = false; anzeigen();
  }
}
start();
