// Blaulicht über Möwenbrück – baut aus den Daten eines Ortes (daten.js) die 3D-Welt.
// Drinnen besteht alles aus einfachen Formen: Kisten, Rollen, Kugeln. Die große Stadt baut stadtbau.js.
// Fertige Modelle (assets/modelle/) ersetzen die Kisten, sobald sie geladen sind.

import * as THREE from 'three';
import { polizistBewegen, ladePolizist } from './polizist.js';
import * as MOD from './modelle.js';
import { baueStadt, radForm, RAD_BREIT } from './stadtbau.js';

const mat = (farbe, extra = {}) => new THREE.MeshLambertMaterial({ color: farbe, ...extra });
const kiste = (b, h, t, farbe, extra) => new THREE.Mesh(new THREE.BoxGeometry(b, h, t), mat(farbe, extra));

// ---------------------------------------------------------------------------------------------
// Eine Figur aus einfachen Formen. look = Farben für Hemd, Hose, Haut, Haar, Mütze, Rucksack …
// ---------------------------------------------------------------------------------------------
export function figur(look = {}) {
  const g = new THREE.Group();
  const bauch = look.bauch || 1;
  const bein = () => { const b = new THREE.Group(); const m = kiste(0.2, 0.8, 0.22, look.hose || '#333'); m.position.y = -0.4; b.add(m); b.position.y = 0.8; return b; };
  const arm = () => { const a = new THREE.Group(); const m = kiste(0.15, 0.62, 0.17, look.hemd || '#888'); m.position.y = -0.3; a.add(m);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), mat(look.haut || '#f0c8a0')); hand.position.y = -0.65; a.add(hand); a.position.y = 1.42; return a; };
  const bl = bein(), br = bein(); bl.position.x = -0.13; br.position.x = 0.13;
  const al = arm(), ar = arm(); al.position.x = -0.33 * bauch; ar.position.x = 0.33 * bauch;
  const rumpf = kiste(0.5 * bauch, 0.68, 0.3 * bauch, look.hemd || '#888'); rumpf.position.y = 1.14;
  const kopf = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10), mat(look.haut || '#f0c8a0')); kopf.position.y = 1.68;
  const haar = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(look.haar || '#5a3b22'));
  haar.position.set(0, 1.71, -0.02);
  g.add(bl, br, al, ar, rumpf, kopf, haar);
  // Zwei kleine Augen, damit man sieht, wohin die Figur schaut.
  for (const x of [-0.07, 0.07]) { const a = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), mat('#222')); a.position.set(x, 1.7, 0.17); g.add(a); }
  if (look.bart) { const b = kiste(0.16, 0.04, 0.05, look.bart); b.position.set(0, 1.62, 0.18); g.add(b); }
  if (look.muetze) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.2, 0.1, 14), mat(look.muetze)); m.position.y = 1.86; g.add(m);
    const s = kiste(0.24, 0.02, 0.14, '#1b2a4a'); s.position.set(0, 1.82, 0.2); g.add(s);
  }
  if (look.rucksack) { const r = kiste(0.36, 0.42, 0.16, look.rucksack); r.position.set(0, 1.2, -0.23 * bauch); g.add(r); }
  if (look.klein) g.scale.setScalar(look.klein);
  const kopfTeile = g.children.filter(k => k.position.y > 1.55); for (const k of kopfTeile) k.userData.y0 = k.position.y;
  g.userData = { bl, br, al, ar, schritt: 0, kopfTeile };
  // Sitzt jemand am Boden (der verletzte Wärter)? Dann die Beine nach vorn und alles ein Stück tiefer.
  if (look.sitzt) {
    bl.rotation.x = br.rotation.x = -Math.PI / 2 + 0.12; al.rotation.x = -0.5; ar.rotation.x = -2.6; ar.rotation.z = -0.5;       // eine Hand am Kopf
    const tief = new THREE.Group(); tief.position.y = -0.68; tief.add(...g.children); g.add(tief); g.userData.sitzt = true;
  }
  // Gibt es für diese Person ein fertiges Modell mit Knochen (assets/modelle/<modell>.glb)? Dann ersetzt es die Klötzchen, sobald es geladen ist.
  if (look.modell) ladePolizist(g, look.modell, look.art || 'polizei', look.sitzt ? 'sitzen' : null, look.rucksack || null);
  return g;
}

// Kleine Bewegungen für alle, die herumstehen: atmen, sich zu dir drehen, beim Sprechen mit den Händen reden.
//   zeit = Sekunden seit Spielstart · spricht = sagt die Figur gerade etwas? · zu = Winkel, in den sie schauen soll (oder null)
export function figurLeben(g, dt, zeit, spricht, zu) {
  const u = g.userData;
  if (!u.al && !u.mixer) return;
  if (u.grund === undefined) { u.grund = g.rotation.y; u.takt = Math.abs(Math.sin(g.position.x * 12.9 + g.position.z * 78.2)) * 6; u.rede = 0; }
  // langsam drehen: zu dir, wenn du nah bist – sonst zurück in die Grundstellung
  let d = (zu ?? u.grund) - g.rotation.y; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  if (u.sitzt) { if (u.mixer) polizistBewegen(g, dt, 0); return; }
  g.rotation.y += d * Math.min(1, dt * 4);
  // Ein fertiges Modell atmet mit seiner eigenen Bewegung "stehen" (läuft es gerade jemandem hinterher, bewegt es sich schon selbst)
  if (u.mixer) { if (!u.selbst) polizistBewegen(g, dt, 0); return; }
  if (!u.al) return;
  const t = zeit + u.takt;
  u.rede += ((spricht ? 1 : 0) - u.rede) * Math.min(1, dt * 6);
  // Atmen: Die Arme pendeln ganz leicht. Beim Sprechen hebt sich ein Arm und wippt im Takt der Worte.
  u.al.rotation.z = -0.04 - Math.sin(t * 1.3) * 0.02; u.ar.rotation.z = 0.04 + Math.sin(t * 1.3) * 0.02;
  u.al.rotation.x = Math.sin(t * 0.7) * 0.04 - u.rede * (0.25 + Math.sin(t * 5.1) * 0.12);
  u.ar.rotation.x = -Math.sin(t * 0.7) * 0.04 - u.rede * (0.9 + Math.sin(t * 6.3) * 0.28);
  if (u.kopfTeile) for (const k of u.kopfTeile) k.position.y = k.userData.y0 + Math.sin(t * 1.3) * 0.006 + u.rede * Math.abs(Math.sin(t * 6.3)) * 0.012;
}

// Beine und Arme schwingen lassen. tempo = wie schnell die Figur gerade läuft (0 = steht).
export function figurBewegen(g, dt, tempo) {
  const u = g.userData;
  if (u.mixer) return polizistBewegen(g, dt, tempo);        // das fertige Modell hat eigene Bewegungen (polizist.js)
  if (!u.bl) return;
  u.schritt += dt * tempo * 2.6;
  const w = tempo > 0.1 ? Math.sin(u.schritt) * 0.7 : 0;
  u.bl.rotation.x = w; u.br.rotation.x = -w; u.al.rotation.x = -w * 0.8; u.ar.rotation.x = w * 0.8;
}

// Lotte, der Diensthund.
function hund() {
  const g = new THREE.Group();
  const fell = '#8a5a2a';
  const k = kiste(0.3, 0.3, 0.8, fell); k.position.y = 0.5;
  const kopf = kiste(0.24, 0.24, 0.3, fell); kopf.position.set(0, 0.72, 0.5);
  const nase = kiste(0.12, 0.1, 0.16, '#2a1a12'); nase.position.set(0, 0.68, 0.7);
  const schwanz = kiste(0.07, 0.07, 0.36, fell); schwanz.position.set(0, 0.66, -0.52); schwanz.rotation.x = -0.7;
  g.add(k, kopf, nase, schwanz);
  for (const [x, z] of [[-0.11, 0.3], [0.11, 0.3], [-0.11, -0.3], [0.11, -0.3]]) { const b = kiste(0.09, 0.38, 0.09, fell); b.position.set(x, 0.19, z); g.add(b); }
  for (const x of [-0.1, 0.1]) { const o = kiste(0.08, 0.14, 0.05, '#2a1a12'); o.position.set(x, 0.9, 0.42); g.add(o); }
  g.userData = { schwanz };
  return g;
}

// ---------------------------------------------------------------------------------------------
// Ein Auto aus Kisten. Vorn ist bei +z. Mit polizei = true bekommt es Streifen und Blaulicht.
// ---------------------------------------------------------------------------------------------
// Wo die Blaulicht-Leiste auf dem Streifenwagen sitzt (Anteil an Höhe und Länge des Autos).
// So stark ist der Lack ein Spiegel (0 = gar nicht, 1 = ganz).
const LACK_METALL = 0.35;
const LEISTE_HOCH = 0.968, LEISTE_VOR = -0.05;
// Das Spiegelbild für den Lack: main.js baut es einmal und gibt es hierher (spiegelBild).
let spiegel = null; const lacke = [];
export function spiegelBild(bild) { spiegel = bild; for (const m of lacke) { m.envMap = bild; m.needsUpdate = true; } }

// Eine Haube mit runden Ecken (für das Blaulicht): ein Kasten, dessen Ecken abgerundet sind.
function haube(b, h, t) {
  const r = Math.min(h, t) * 0.42, f = new THREE.Shape();
  f.moveTo(-b / 2 + r, 0); f.lineTo(b / 2 - r, 0); f.quadraticCurveTo(b / 2, 0, b / 2, r); f.lineTo(b / 2, h - r); f.quadraticCurveTo(b / 2, h, b / 2 - r, h);
  f.lineTo(-b / 2 + r, h); f.quadraticCurveTo(-b / 2, h, -b / 2, h - r); f.lineTo(-b / 2, r); f.quadraticCurveTo(-b / 2, 0, -b / 2 + r, 0);
  const g = new THREE.ExtrudeGeometry(f, { depth: t - 2 * r * 0.5, bevelEnabled: true, bevelSize: r * 0.5, bevelThickness: r * 0.5, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -(t - r) / 2); return g;
}

// Die Polizei-Folie: Ein gemaltes Bild (blaues Band, gelber Streifen, Schrift POLIZEI) wird von der Seite auf den Lack "geklebt".
// Das macht das Malprogramm der Grafikkarte: Nur helle Stellen (Lack) an den Seiten bekommen Folie, Fenster und Reifen bleiben frei.
// Zahlen: wo das Band sitzt, als Anteil an der Höhe des Autos (0 = Boden, 1 = Dach).
const FOLIE = { unten: 0.47, oben: 0.66, vorn: 0.88, hinten: 0.05 };
let folienBild = null;
function folie() {
  if (folienBild) return folienBild;
  const c = document.createElement('canvas'); c.width = 2048; c.height = 512;
  const x = c.getContext('2d'), B = c.width, H = c.height;
  const y1 = H * (1 - FOLIE.oben), y2 = H * (1 - FOLIE.unten), x1 = B * FOLIE.hinten, x2 = B * FOLIE.vorn;
  x.fillStyle = '#1549b5'; x.fillRect(x1, y1, x2 - x1, y2 - y1);
  x.fillStyle = '#d8ee2a'; x.fillRect(x1, y2 - (y2 - y1) * 0.16, x2 - x1, (y2 - y1) * 0.16);     // leuchtgelber Streifen unten am Band
  x.fillStyle = '#ffffff'; x.font = `800 ${Math.round((y2 - y1) * 0.7)}px "Arial Narrow", Arial, sans-serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('POLIZEI', B * 0.5, y1 + (y2 - y1) * 0.44);
  folienBild = new THREE.CanvasTexture(c); folienBild.colorSpace = THREE.SRGBColorSpace; folienBild.anisotropy = 8;
  return folienBild;
}
function folieKleben(material, gr) {
  material.onBeforeCompile = sh => {
    sh.uniforms.folie = { value: folie() };
    sh.uniforms.autoMass = { value: new THREE.Vector3(gr.x, gr.y, gr.z) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOrt;\nvarying vec3 vRicht;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOrt = position; vRicht = normal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vOrt;\nvarying vec3 vRicht;\nuniform sampler2D folie;\nuniform vec3 autoMass;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          float hell = dot(diffuseColor.rgb, vec3(0.3333));
          float lack = smoothstep(LACK_AB, LACK_AB + 0.12, hell) * (1.0 - smoothstep(0.08, 0.2, diffuseColor.r - diffuseColor.g));   // nicht auf Fenster, nicht auf rote Rücklichter
          float seite = smoothstep(0.45, 0.7, abs(normalize(vRicht).x));
          vec2 fo = vec2(vOrt.z / autoMass.z + 0.5, vOrt.y / autoMass.y);
          if (vOrt.x > 0.0) fo.x = 1.0 - fo.x;      // damit die Schrift auf beiden Seiten richtig herum steht
          vec4 f = texture2D(folie, fo);
          folieStark = f.a * lack * seite;
          // Hinten läuft das Band über die Heckklappe weiter (dasselbe Bild, ein Stück ohne Schrift).
          float heck = smoothstep(0.5, 0.75, -normalize(vRicht).z) * step(vOrt.z, -0.3 * autoMass.z);
          vec4 h = texture2D(folie, vec2(0.2, fo.y));
          folieStark = max(folieStark, h.a * lack * heck);
          diffuseColor.rgb = mix(diffuseColor.rgb, mix(f.rgb, h.rgb, step(0.5, heck)), folieStark);
        }`)
      .replace('void main() {', 'float folieStark = 0.0;\nvoid main() {')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.1, folieStark);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.45, folieStark);');
    sh.fragmentShader = '#define LACK_AB 0.10\n' + sh.fragmentShader;
  };
}

// Die Räder eines Wagens drehen: weg = wie weit er schon gerollt ist (Meter), lenk = Einschlag der Vorderräder (−1 … 1)
export function autoRaeder(g, weg, lenk = 0) {
  for (const r of g.userData.raeder || []) { r.rad.rotation.x = weg / r.r; if (r.vorn) r.lenk.rotation.y += (lenk * 0.45 - r.lenk.rotation.y) * 0.2; }
}
export function autoModell(farbe = '#f4f4f4', polizei = false, sorte = 'auto_kombi') {
  const g = new THREE.Group(), kisten = new THREE.Group();
  g.add(kisten);
  const unten = kiste(1.9, 0.6, 4.4, farbe); unten.position.y = 0.62;
  const oben = kiste(1.7, 0.56, 2.3, '#263238'); oben.position.set(0, 1.2, -0.25);
  const dach = kiste(1.72, 0.08, 2.2, farbe); dach.position.set(0, 1.5, -0.25);
  kisten.add(unten, oben, dach);
  for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14), mat('#1a1a1a')); r.rotation.z = Math.PI / 2; r.position.set(x, 0.36, z); kisten.add(r);
  }
  for (const x of [-0.65, 0.65]) {
    const l = kiste(0.4, 0.18, 0.06, '#fff7c0', { emissive: '#fff2a0', emissiveIntensity: 0.6 }); l.position.set(x, 0.72, 2.21); kisten.add(l);
    const r = kiste(0.4, 0.16, 0.06, '#c0392b', { emissive: '#7a1a10', emissiveIntensity: 0.5 }); r.position.set(x, 0.72, -2.21); kisten.add(r);
  }
  const streifen = [];
  if (polizei) {
    for (const x of [-0.96, 0.96]) { const s = kiste(0.03, 0.28, 3.6, '#2b6fd6'); s.position.set(x, 0.66, 0); g.add(s); streifen.push(s); }
    const hb = kiste(1.5, 0.02, 0.5, '#2b6fd6'); hb.position.set(0, 0.93, 1.6); kisten.add(hb);
    // Die Blaulicht-Leiste auf dem Dach: schwarzer Fuß, zwei blaue Hauben, in der Mitte ein silbernes Stück.
    const leiste = new THREE.Group(); leiste.position.set(0, 1.56, -0.1); g.add(leiste);
    const fuss = kiste(1.24, 0.05, 0.34, '#16181b'); fuss.position.y = 0.025;
    const mitte = kiste(0.2, 0.1, 0.3, '#c9ced4'); mitte.position.y = 0.1;
    leiste.add(fuss, mitte);
    const blau = [-0.36, 0.36].map(x => {
      const b = new THREE.Mesh(haube(0.5, 0.13, 0.3), new THREE.MeshStandardMaterial({ color: '#1747c9', roughness: 0.18, metalness: 0.1, emissive: '#1e66ff', emissiveIntensity: 0 }));
      b.position.set(x, 0.05, 0); leiste.add(b); return b;
    });
    // Scheinwerfer für die Fahrt im Dunkeln und ein blaues Licht, das beim Blaulicht mitblitzt.
    const sw = new THREE.SpotLight('#fff4d0', 0, 60, 0.6, 0.5, 1.2); sw.position.set(0, 1, 2.2);
    sw.target.position.set(0, 0, 14); g.add(sw, sw.target);
    const blitz = new THREE.PointLight('#2a6bff', 0, 30, 1.4); blitz.position.set(0, 2.2, 0); g.add(blitz);
    g.userData = { blau, sw, blitz, leiste };
  }
  // Das fertige Modell ersetzt die Kisten, sobald es geladen ist.
  // Der Streifenwagen bekommt die Vorlage in voller Qualität (19.000 Dreiecke, scharfes Bild, Glanz), die anderen Autos die kleine Datei.
  MOD.lade(polizei ? 'streifenwagen' : sorte).then(m => {
    if (!m) return;
    const material = m.mat.clone(); if (!polizei) material.color.set(farbe);
    g.userData.hoch = m.geo.boundingBox ? m.geo.boundingBox.max.y : 1.6;
    const netz = new THREE.Mesh(m.geo, material); netz.castShadow = true;
    kisten.visible = false; g.add(netz);
    // Vier eigene Räder vor den gemalten Rädern des Modells: Sie drehen sich beim Fahren, die vorderen lenken mit (autoRaeder).
    if (m.raeder) { const R = m.raeder, radMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), form = radForm();
      g.userData.raeder = [[1, R.vorn], [-1, R.vorn], [1, R.hinten], [-1, R.hinten]].map(([seite, z]) => {
        const lenk = new THREE.Group(), rad = new THREE.Mesh(form, radMat); rad.scale.set(RAD_BREIT, R.r * 1.03, R.r * 1.03); rad.castShadow = true;
        lenk.position.set(seite * (R.x - RAD_BREIT / 2 - 0.02), R.r * 1.03, z); lenk.add(rad); g.add(lenk); return { lenk, rad, vorn: z > 0, r: R.r };
      }); }
    if (polizei) {
      netz.receiveShadow = true;
      for (const s of streifen) s.visible = false;
      // Die Vorlage ist ganz aus spiegelndem Metall gemalt. Ohne echte Umgebung zum Spiegeln sähe das schwarz aus, deshalb spiegelt der Lack hier nur zum Teil.
      material.metalness = LACK_METALL; material.roughness = 1;
      folieKleben(material, m.gr);
      lacke.push(material); if (spiegel) material.envMap = spiegel;
      g.userData.lack = material;
      g.userData.leiste.position.set(0, m.gr.y * LEISTE_HOCH, m.gr.z * LEISTE_VOR);
    }
  });
  return g;
}

// Ein Schild mit Schrift, das immer zur Kamera schaut.
export function schild(text, hoch = 3) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const k = c.getContext('2d');
  k.fillStyle = 'rgba(20,40,80,0.85)'; k.beginPath(); k.roundRect(4, 4, 504, 88, 20); k.fill();
  k.fillStyle = '#fff'; k.font = 'bold 46px system-ui, sans-serif'; k.textAlign = 'center'; k.textBaseline = 'middle';
  k.fillText(text, 256, 50, 480);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  s.scale.set(hoch * 2.4, hoch * 0.45, 1); s.renderOrder = 10;
  return s;
}

function flaeche(r, farbe, y = 0.01) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r[2] - r[0], r[3] - r[1]), mat(farbe));
  m.rotation.x = -Math.PI / 2; m.position.set((r[0] + r[2]) / 2, y, (r[1] + r[3]) / 2);
  return m;
}

// ---------------------------------------------------------------------------------------------
// Sachen, die aufgehen: Türen, der Spind, der Stahlschrank. Jede "Klappe" ist ein Brett an einem Scharnier.
// Das Spiel dreht es jedes Bild ein Stück weiter (main.js, klappenSchritt). auf = Winkel, wenn es ganz offen ist.
// ---------------------------------------------------------------------------------------------
function brett(breit, hoch, dick, farbe, griff = true) {
  const angel = new THREE.Group();                         // das Scharnier: Um diese Stelle dreht sich das Brett
  const b = kiste(breit, hoch, dick, farbe); b.position.set(breit / 2, hoch / 2, 0); angel.add(b);
  if (griff) for (const z of [-1, 1]) { const g = kiste(0.05, 0.14, 0.05, '#d9c27a'); g.position.set(breit - 0.14, hoch * 0.5, z * (dick / 2 + 0.03)); angel.add(g); }
  return angel;
}
// Dein Spind: ein Blechschrank mit Tür. Vorn ist bei +x. Drinnen hängt die Jacke.
function spindModell() {
  const g = new THREE.Group(), blau = '#3f6f96', dunkel = '#2c4f6c';
  for (const [b, h, t, x, y, z] of [[0.04, 2, 1.1, -0.43, 1, 0], [0.9, 2, 0.04, 0, 1, -0.53], [0.9, 2, 0.04, 0, 1, 0.53], [0.9, 0.04, 1.1, 0, 1.98, 0], [0.9, 0.06, 1.1, 0, 0.03, 0], [0.86, 0.03, 1.02, 0, 1.55, 0]]) {
    const k = kiste(b, h, t, x < -0.4 || y === 1.55 ? dunkel : blau); k.position.set(x, y, z); g.add(k);
  }
  const innen = kiste(0.02, 1.9, 1.0, '#1c2f40'); innen.position.set(-0.4, 1, 0); g.add(innen);
  const jacke = kiste(0.5, 0.75, 0.16, '#1b2a4a'); jacke.position.set(-0.05, 1.12, 0.1);
  const stange = kiste(0.03, 0.03, 1.0, '#c9ced4'); stange.position.set(0, 1.5, 0);
  const schuhe = kiste(0.3, 0.12, 0.5, '#1a1a1a'); schuhe.position.set(0.05, 0.12, 0);
  g.add(jacke, stange, schuhe);
  const tuer = brett(1.06, 1.94, 0.04, blau, false); tuer.rotation.y = -Math.PI / 2; tuer.position.set(0.45, 0.03, -0.53);
  const schloss = kiste(0.06, 0.14, 0.14, '#e8c84a'); schloss.position.set(0.9, 1.07, -0.04); tuer.add(schloss);
  for (const y of [1.7, 1.78]) { const l = kiste(0.5, 0.025, 0.045, dunkel); l.position.set(0.53, y, -0.01); tuer.add(l); }       // Lüftungs-Schlitze
  const halter = new THREE.Group(); halter.add(tuer); g.add(halter);
  g.userData = { klappe: { teile: [{ teil: tuer, zu: -Math.PI / 2, auf: -Math.PI / 2 + 1.9 }] } };
  return g;
}
// Der Stahlschrank der Waffenkammer: zwei Türen, drinnen Fächer. Vorn ist bei +x.
function schrankModell(d) {
  const g = new THREE.Group(), [tief, breit] = d.fest || [1, 2.6], stahl = '#3b4148';
  for (const [b, h, t, x, y, z] of [[0.05, 2, breit, -tief / 2 + 0.03, 1, 0], [tief, 2, 0.05, 0, 1, -breit / 2 + 0.03], [tief, 2, 0.05, 0, 1, breit / 2 - 0.03], [tief, 0.05, breit, 0, 1.98, 0], [tief, 0.08, breit, 0, 0.04, 0]]) {
    const k = kiste(b, h, t, stahl); k.position.set(x, y, z); g.add(k);
  }
  const innen = kiste(0.02, 1.9, breit - 0.1, '#15181c'); innen.position.set(-tief / 2 + 0.07, 1, 0); g.add(innen);
  for (const y of [0.55, 1.0, 1.45]) {
    const fach = kiste(tief - 0.12, 0.03, breit - 0.12, '#565d66'); fach.position.set(0, y, 0); g.add(fach);
    for (let i = 0; i < 5; i++) { const kasten = kiste(0.34, 0.2, 0.3, i % 2 ? '#20242a' : '#2b3038'); kasten.position.set(0, y + 0.12, -breit / 2 + 0.36 + i * (breit - 0.72) / 4); g.add(kasten); }
  }
  const teile = [];
  for (const s of [-1, 1]) {
    const t = brett(breit / 2 - 0.02, 1.9, 0.05, '#4a515a'); t.position.set(tief / 2, 0.05, s * (breit / 2 - 0.02));
    const zu = s < 0 ? -Math.PI / 2 : Math.PI / 2; t.rotation.y = zu;
    teile.push({ teil: t, zu, auf: zu + s * -1.75 }); g.add(t);
  }
  g.userData = { klappe: { teile } };
  return g;
}

// Wie ein Ding aussieht, hängt von seiner Art ab.
function dingModell(d) {
  if (d.art === 'auto') { const a = autoModell(d.farbe, d.polizei); a.rotation.y = d.h || 0; return a; }
  if (d.art === 'spind') return spindModell();
  if (d.art === 'schrank') return schrankModell(d);
  if (d.art === 'tuer') {       // eine Tür im Rahmen, die aufschwingt
    const g = new THREE.Group(), holz = '#6a4a2a';
    for (const x of [-0.97, 0.97]) { const p = kiste(0.14, 2.5, 0.3, '#4a3320'); p.position.set(x, 1.25, 0); g.add(p); }
    const sturz = kiste(2.08, 0.14, 0.3, '#4a3320'); sturz.position.y = 2.5; g.add(sturz);
    const t = brett(1.8, 2.4, 0.12, holz); t.position.set(-0.9, 0, 0); g.add(t);
    if (Math.abs(d.x) > 20) g.rotation.y = Math.PI / 2;
    g.userData = { klappe: { teile: [{ teil: t, zu: 0, auf: -1.7 }] } };
    return g;
  }
  if (d.art === 'fenster') { const f = kiste(0.12, 1.3, 2, '#a8d0e8', { emissive: '#20405a', emissiveIntensity: 0.6 }); f.position.y = 1.5; return f; }
  if (d.art === 'spur') {   // Spuren sind klein und dunkel – man findet sie erst im Licht der Lampe
    const g = new THREE.Group();
    if (d.zeig) { const [x, y, z, b, h, t, farbe] = d.zeig; const m = kiste(b, h, t, farbe); m.position.set(x, y, z); m.rotation.y = 0.5; g.add(m); }
    return g;
  }
  // Eine leuchtende Stelle am Boden: Hier kann man etwas tun.
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.5, 24), new THREE.MeshBasicMaterial({ color: d.farbe || '#ffd23a', side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; g.add(ring);
  g.userData = { ring };
  return g;
}

// ---------------------------------------------------------------------------------------------
// Baut einen ganzen Ort. Zurück kommen die Gruppe für die Szene, alle Dinge und Leute
// und die Liste der Rechtecke, durch die man nicht laufen oder fahren kann.
// ---------------------------------------------------------------------------------------------
export function baueOrt(def) {
  const gruppe = new THREE.Group();
  const fest = [];                 // Rechtecke, die im Weg stehen
  const G = def.gross;
  let stadt = null;
  const hausSchilder = [];         // Namen über den besonderen Häusern (man sieht sie nur aus der Nähe)

  if (def.plan) {
    // Die große Stadt: Straßen, Häuser, Hafen … kommen fertig aus stadtbau.js
    stadt = baueStadt(); gruppe.add(stadt.gruppe);
    for (const r of def.plan.fest) fest.push(r);
    for (const h of def.plan.haeuser) if (h.schild) { const s = schild(h.schild, 6); s.position.set(h.x, h.h + (h.dach.h || 0) + 3.5, h.z); gruppe.add(s); hausSchilder.push(s); }
  } else {
    gruppe.add(flaeche([G[0] - 200, G[1] - 200, G[2] + 200, G[3] + 200], '#111', -0.02));
    // Jeder Boden liegt ein kleines Stück höher als der davor – lägen zwei genau gleich hoch, würden ihre Farben flackern.
    def.boden.forEach((b, i) => gruppe.add(flaeche(b.r, b.farbe, 0.01 + i * 0.012)));
  }

  // Wände: drinnen niedrig, damit man von oben in die Räume schauen kann
  for (const r of def.waende) {
    const m = kiste(r[2] - r[0], 1.5, r[3] - r[1], '#e9e4da'); m.position.set((r[0] + r[2]) / 2, 0.75, (r[1] + r[3]) / 2);
    gruppe.add(m); fest.push(r);
  }
  for (const q of def.moebel) {
    const m = kiste(q.b, q.h, q.t, q.farbe); m.position.set(q.x, q.h / 2, q.z); gruppe.add(m);
    if (q.glas) { const gl = kiste(q.b - 0.1, 0.7, q.t - 0.1, '#bfe6ff', { transparent: true, opacity: 0.35 }); gl.position.y = q.h / 2 + 0.35; m.add(gl); }
    if (q.gold) { const go = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16), mat('#e8c030', { emissive: '#7a5a00' })); go.position.y = q.h / 2 + 0.06; m.add(go); }
    if (q.modell) MOD.lade(q.modell).then(mo => {       // ein fertiges Modell ersetzt die Kiste
      if (!mo) return;
      const n = new THREE.Mesh(mo.geo, mo.mat); n.position.set(q.x, 0, q.z); n.rotation.y = q.dreh || 0; n.castShadow = true; m.visible = false; gruppe.add(n);
    });
    if (q.dach) { const d = kiste(q.b + 0.8, 0.15, q.t + 1, q.dach); d.position.y = q.h / 2 + 1.6; m.add(d);
      for (const sx of [-1, 1]) { const st = kiste(0.1, 1.6, 0.1, '#666'); st.position.set(sx * q.b / 2, q.h / 2 + 0.8, q.t / 2); m.add(st); }
      // Marktstand: das geladene Modell ersetzt die Kisten
      MOD.lade('stand').then(mo => { if (!mo) return; const n = new THREE.Mesh(mo.geo, mo.mat); n.position.set(q.x, 0, q.z); n.castShadow = true; m.visible = false; gruppe.add(n); }); }
    fest.push([q.x - q.b / 2, q.z - q.t / 2, q.x + q.b / 2, q.z + q.t / 2]);
  }
  // Fertige Modelle als Schmuck (ohne Hindernis): { modell, x, z, y (Höhe), dreh, mal (größer/kleiner) }
  for (const q of def.deko || []) MOD.lade(q.modell).then(mo => {
    if (!mo) return;
    const n = new THREE.Mesh(mo.geo, mo.mat); n.position.set(q.x, q.y || 0, q.z); n.rotation.y = q.dreh || 0; if (q.mal) n.scale.setScalar(q.mal); gruppe.add(n);
  });
  // Türen in den Wänden: Sie gehen von selbst auf, wenn jemand davorsteht. { x, z, b = Breite der Öffnung }
  const klappen = {};
  (def.tueren || []).forEach((t, i) => {
    const teile = [], fluegel = t.b > 2.2 ? 2 : 1, breit = t.b / fluegel;
    for (let f = 0; f < fluegel; f++) {
      const s = f === 0 ? -1 : 1, blatt = brett(breit - 0.04, 1.46, 0.07, t.farbe || '#8a6a4a');
      blatt.position.set(t.x + s * t.b / 2, 0.02, t.z); const zu = s < 0 ? 0 : Math.PI; blatt.rotation.y = zu;
      teile.push({ teil: blatt, zu, auf: zu + s * 1.75 }); gruppe.add(blatt);
    }
    klappen['tuer' + i] = { teile, ist: 0, soll: 0, auto: { x: t.x, z: t.z, r: 2.3 } };
  });
  for (const s of def.schilder || []) { const sp = schild(s.text, s.hoch ? 5 : 1.6); sp.position.set(s.x, s.hoch || 2.3, s.z); gruppe.add(sp); }

  // Dinge und Leute. Ob man sie gerade sieht, entscheidet das Spiel (Merker "wenn" und "bis").
  const objekte = [];
  for (const d of def.dinge) {
    const m = dingModell(d); m.position.set(d.x, 0, d.z); gruppe.add(m);
    const o = { def: d, mesh: m, typ: 'ding' };
    if (m.userData.klappe) klappen[d.id] = { ...m.userData.klappe, ist: 0, soll: 0 };
    if (d.fest) o.fest = [d.x - d.fest[0] / 2, d.z - d.fest[1] / 2, d.x + d.fest[0] / 2, d.z + d.fest[1] / 2];
    objekte.push(o);
  }
  for (const l of def.leute) {
    const m = l.hund ? hund() : figur(l.look);
    m.position.set(l.x || 0, 0, l.z || 0); m.rotation.y = l.h || 0; gruppe.add(m);
    objekte.push({ def: l, mesh: m, typ: 'leut', x: l.x || 0, z: l.z || 0 });
  }
  return { gruppe, fest, objekte, stadt, hausSchilder, klappen };
}
