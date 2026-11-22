// Blaulicht über Möwenbrück – Figuren als fertige 3D-Modelle mit echten Bewegungen.
//
// Es gibt zwei Sorten Figuren:
//   Polizei (Kim, Otto): Modelle aus 3D AI Studio mit eigenem Gerüst aus 30 Knochen (assets/modelle/polizist.glb, otto.glb)
//   Menschen aus MakeHuman (alle anderen): echtes Gesicht, Haare, Kleidung; Gerüst "mixamo" (assets/modelle/<name>.glb)
// Die Bewegungen stecken nicht in jeder Figur, sondern in drei gemeinsamen Dateien (bewegungen_polizei, bewegungen_frau, bewegungen_mann).
// Es sind Bewegungs-Aufnahmen echter Menschen (Mixamo), mit tools/figur/uebertragen.js auf das jeweilige Gerüst umgerechnet:
//   stehen · umsehen · gehen · laufen · ziehen (Dienstwaffe) · zielen · wegstecken · sitzen · aufstehen
// Das Spiel blendet weich zwischen ihnen um.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as kopiere } from 'three/addons/utils/SkeletonUtils.js';      // kopiert eine Figur samt Gerüst – so reicht eine Datei für mehrere Leute

export const GROSS = 1.98;          // so groß ist Kim mit Mütze, in Metern
const MODELL_HOCH = 1.871;          // so groß ist sie in der Datei
const MENSCH_MAL = 1.14;            // Menschen aus MakeHuman werden um so viel größer gemalt (alle Figuren im Spiel sind ein Stück größer als echte Menschen)
const TEMPO_GEHEN = 0.89, TEMPO_LAUFEN = 4.56;     // so schnell (Meter pro Sekunde) sind die Aufnahmen – danach richtet sich, wie schnell die Beine laufen
const AB_LAUFEN = 2.2;              // ab diesem Tempo wird gelaufen statt gegangen
const WECHSEL = 7;                  // so schnell wird zwischen zwei Bewegungen umgeblendet (größer = schneller)
const HELLER = 1.5;                 // die dunkelblaue Uniform wäre im Spiel fast schwarz – so viel heller wird die Polizei gemalt
const HELLER_MENSCH = 1.15;
const UMSEHEN = [9, 24];            // wer herumsteht, sieht sich alle 9 bis 24 Sekunden einmal um
const SCHLEIFEN = ['stehen', 'gehen', 'laufen', 'zielen', 'sitzen'];      // diese Bewegungen laufen im Kreis, alle anderen genau einmal
const WAFFE_ORT = [-0.045, 0.03, 0.0];   // wo der Griff der Pistole in der rechten Hand liegt, gemessen vom ersten Finger-Gelenk: zurück zum Handgelenk, in die Handfläche hinein, zum Daumen hin (Meter)
const WAFFE_DA = { ziehen: [1.0, 99], zielen: [0, 99], wegstecken: [0, 2.0] };      // in welchen Sekunden einer Bewegung die Pistole in der Hand ist

const lader = new GLTFLoader(), lager = {};
const hole = datei => lager[datei] || (lager[datei] = new Promise((ok, nein) => lader.load(`assets/modelle/${datei}.glb`, ok, undefined, nein)));

// Die Dienstpistole für die Hand: ein Umriss von der Seite (Schlitten, schräger Griff, Abzugsbügel), 2,8 cm dick ausgestanzt.
// Lauf zeigt nach +x, oben ist +z, der Nullpunkt liegt mitten im Griff – dort, wo die Hand zufasst. Sie ist nur zu sehen, solange die Waffe gezogen ist.
function pistole() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: '#17191d', roughness: 0.45, metalness: 0.5 });
  const u = new THREE.Shape([[-0.052, 0.058], [0.128, 0.058], [0.128, 0.03], [0.062, 0.03], [0.062, 0.022], [0.05, 0.004], [0.022, 0.0], [0.016, 0.022], [0.006, -0.058], [-0.03, -0.062], [-0.046, 0.016], [-0.056, 0.03]].map(p => new THREE.Vector2(p[0], p[1])));
  u.holes.push(new THREE.Path([[0.022, 0.024], [0.054, 0.024], [0.045, 0.009], [0.026, 0.006]].map(p => new THREE.Vector2(p[0], p[1]))));
  const form = new THREE.ExtrudeGeometry(u, { depth: 0.028, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1 });
  form.translate(0, 0, -0.014); form.rotateX(Math.PI / 2);
  const k = new THREE.Mesh(form, m); k.castShadow = true; g.add(k);
  g.visible = false; return g;
}

// Tauscht die Kisten-Figur in "gruppe" gegen das Modell aus, sobald es geladen ist. Klappt das Laden nicht, bleibt die Kisten-Figur.
// datei = welche Figur ('polizist' = Kim, 'otto', 'thomsen' …), art = welches Gerüst: 'polizei', 'frau' oder 'mann'
const WESTE = [0.205, 0.165];      // Schutzweste: halbe Breite und halbe Tiefe in Metern
let schriftBild = null;
function polizeiSchrift() {       // weiße Schrift POLIZEI als Bild (einmal gemalt, für alle Westen)
  if (schriftBild) return schriftBild;
  const c = document.createElement('canvas'); c.width = 256; c.height = 72; const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.font = 'bold 54px Arial, Helvetica, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('POLIZEI', 128, 39, 248);
  schriftBild = new THREE.CanvasTexture(c); schriftBild.colorSpace = THREE.SRGBColorSpace; return schriftBild;
}
export function ladePolizist(gruppe, datei = 'polizist', art = 'polizei', haltung = null, rucksack = null) {
  Promise.all([hole(datei), hole('bewegungen_' + art)]).then(([gltf, bew]) => {
    const modell = kopiere(gltf.scene), polizei = art === 'polizei';
    let hoch = MODELL_HOCH, gross = GROSS;
    if (!polizei) { const kasten = new THREE.Box3().setFromObject(modell); hoch = kasten.max.y - kasten.min.y; gross = hoch * MENSCH_MAL; }
    modell.scale.multiplyScalar(gross / hoch);
    modell.traverse(o => { if (!o.isMesh) return; o.castShadow = true; o.frustumCulled = false;      // die Figur ist fast immer im Bild, also nie wegrechnen
      o.material = o.material.clone(); o.material.color.multiplyScalar(polizei ? HELLER : HELLER_MENSCH);
      if (o.material.transparent) { o.material.transparent = false; o.material.alphaTest = 0.3; o.material.depthWrite = true; o.material.side = THREE.DoubleSide; } });      // Haare und Brauen: hart ausschneiden, sonst flimmern sie
    for (const kind of [...gruppe.children]) gruppe.remove(kind);
    gruppe.add(modell);
    // Rucksack: ein Kasten mit Trägern, der am Rücken festhängt (am Knochen der Brust, damit er jede Bewegung mitmacht)
    // Schutzweste der Kollegen: ein dunkler Mantel um die Brust mit der Schrift POLIZEI vorn und hinten (hängt wie der Rucksack am Brust-Knochen)
    if (rucksack === 'weste') { let brust; modell.traverse(o => { if (o.isBone && /Spine2$/.test(o.name)) brust = o; });
      const weste = new THREE.Group(), stoff = new THREE.MeshStandardMaterial({ color: '#141a2c', roughness: 0.85 });
      const mantel = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.93, 0.36, 20), stoff); mantel.scale.set(WESTE[0], 1, WESTE[1]);
      const kragen = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 1, 0.07, 20), stoff); kragen.scale.set(WESTE[0], 1, WESTE[1]); kragen.position.y = 0.215;
      weste.add(mantel, kragen);
      const schrift = new THREE.MeshBasicMaterial({ map: polizeiSchrift(), transparent: true, alphaTest: 0.4 });
      const hinten = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.056), schrift); hinten.position.set(0, 0.07, -WESTE[1] - 0.003); hinten.rotation.y = Math.PI;
      const vorn = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.034), schrift); vorn.position.set(0.085, 0.09, WESTE[1] - 0.006); vorn.rotation.x = -0.04;
      const funk = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.1, 0.035), new THREE.MeshStandardMaterial({ color: '#0c0d10', roughness: 0.6 })); funk.position.set(-0.1, 0.06, WESTE[1] - 0.004);
      weste.add(hinten, vorn, funk); weste.traverse(o => { o.castShadow = true; });
      gruppe.add(weste); gruppe.userData.sackOffen = brust; gruppe.userData.sack = weste; gruppe.userData.sackOrt = [0.02, -0.012]; }
    else if (rucksack) { let brust; modell.traverse(o => { if (o.isBone && /Spine2$/.test(o.name)) brust = o; });
      const m = new THREE.MeshStandardMaterial({ color: rucksack, roughness: 0.9 }), sack = new THREE.Group();
      const koerper = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.15), m), fach = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.05), m);
      fach.position.set(0, -0.08, -0.09); sack.add(koerper, fach);
      for (const x of [-0.11, 0.11]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.3), m); t.position.set(x, 0.03, 0.13); sack.add(t); }
      sack.traverse(o => { o.castShadow = true; });
      gruppe.add(sack); gruppe.userData.sackOffen = brust; gruppe.userData.sack = sack; }      // angehängt wird er im ersten Bild, wenn die Figur schon richtig steht
    // Die Hüfte wandert in den Aufnahmen auf und ab. Wie weit, hängt von der Größe der Figur ab: auf diese Figur umrechnen.
    let huefte, vorbild; modell.traverse(o => { if (o.isBone && /Hips$/.test(o.name)) huefte = o; }); bew.scene.traverse(o => { if (/Hips$/.test(o.name)) vorbild = o; });
    const mal = polizei ? 1 : huefte.position.length() / vorbild.position.length();
    const mixer = new THREE.AnimationMixer(modell), teile = {};
    for (const vorlage of bew.animations) {
      const clip = vorlage.clone(); if (mal !== 1) for (const s of clip.tracks) if (s.name.endsWith('.position')) for (let i = 0; i < s.values.length; i++) s.values[i] *= mal;
      const a = mixer.clipAction(clip), name = clip.name, kreis = SCHLEIFEN.includes(name);
      if (!kreis) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      a.play(); a.setEffectiveWeight(0); if (!kreis) a.paused = true;
      if (name === 'stehen') a.time = Math.random() * clip.duration;       // jeder fängt an einer anderen Stelle an, sonst atmen alle im Gleichtakt
      teile[name] = { a, stark: 0, lang: clip.duration };
    }
    // Die Pistole hängt an der rechten Hand: Lauf in Richtung der Finger, Oberseite zur Daumen-Seite
    let haut; modell.traverse(o => { if (o.isSkinnedMesh && !haut) haut = o; });
    const knochen = n => haut.skeleton.bones.findIndex(b => b.name.replace(/^mixamorig\d*:?_?/, '') === n), ih = knochen('RightHand');
    let waffe = null;
    if (polizei && ih >= 0) { const sk = haut.skeleton, ruhe = i => new THREE.Vector3().setFromMatrixPosition(sk.boneInverses[i].clone().invert());
      // Die Handfläche liegt vor dem ersten Finger-Gelenk (das Hand-Gelenk selbst sitzt bei dieser Figur neben dem Arm und taugt nicht zum Messen).
      const hand = ruhe(ih), f1 = ruhe(knochen('RightFinger1')), f3 = ruhe(knochen('RightFinger3')), x = f3.clone().sub(f1).normalize();
      const z = new THREE.Vector3(0, 0, 1); z.addScaledVector(x, -z.dot(x)).normalize(); const y = z.clone().cross(x).normalize();
      const einheit = hand.y > 10 ? 100 : 1, ort = f1.clone().addScaledVector(x, WAFFE_ORT[0] * einheit).addScaledVector(y, WAFFE_ORT[1] * einheit).addScaledVector(z, WAFFE_ORT[2] * einheit);
      const soll = new THREE.Matrix4().makeBasis(x, y, z).scale(new THREE.Vector3(einheit, einheit, einheit)).setPosition(ort);
      waffe = pistole(); waffe.matrix.copy(sk.boneInverses[ih].clone().multiply(soll)); waffe.matrixAutoUpdate = false; sk.bones[ih].add(waffe); }
    gruppe.userData = { ...gruppe.userData, mixer, teile, waffe, einmal: null, haltung, warten: UMSEHEN[0] * Math.random() + 3, al: null, bl: null };
    teile[haltung || 'stehen'].stark = 1;
  }).catch(() => {});
}
// Eine Bewegung genau einmal spielen ('umsehen', 'ziehen', 'wegstecken', 'aufstehen'). halten = danach in der letzten Haltung bleiben, bis etwas anderes kommt.
// dann = Haltung, die danach gilt (zum Beispiel null nach 'aufstehen'). Gibt zurück, wie viele Sekunden die Bewegung dauert (0 = Figur hat keine solche).
export function polizistSpiele(gruppe, name, { halten = false, dann } = {}) {
  const u = gruppe.userData, t = u.teile && u.teile[name]; if (!t) return 0;
  t.a.reset(); t.a.paused = false; t.a.setEffectiveWeight(t.stark);
  if (dann === null) gruppe.userData.haltung = null;
  u.einmal = { name, halten, dann }; return t.lang;
}
// Feste Haltung statt "stehen": 'sitzen', 'zielen' oder null
export function polizistHaltung(gruppe, name) { gruppe.userData.haltung = name; }

// ---------------------------------------------------------------------------------------------
// Auf einem Stuhl sitzen und arbeiten. Dafür gibt es keine Aufnahme – das Spiel biegt die Figur selbst zurecht:
// Es nimmt die Bewegung "stehen" (damit sie weiter atmet), setzt die Hüfte auf den Stuhl und richtet dann Glied für Glied aus
// (Oberschenkel nach vorn, Unterschenkel nach unten, Unterarme zur Tastatur). Das geht für jedes Gerüst gleich.
//   art: 'tippen' = am Rechner schreiben, ab und zu zur Maus greifen und auf den Bildschirm schauen
//        'lesen'  = Unterarme auf dem Tisch, Blick nach unten auf ein Blatt, manchmal umblättern
//        'ruhe'   = Hände auf den Oberschenkeln, zurückgelehnt (Pause, Wartebereich)
// ---------------------------------------------------------------------------------------------
const SITZ_HOCH = 0.6;              // so hoch über dem Boden ist die Hüfte, wenn jemand auf einem Stuhl sitzt (Meter)
const FUSS_HOCH = 0.1;               // so hoch über dem Boden sitzt das Fußgelenk, wenn der Schuh auf dem Boden steht
const SITZ_TEMPO = 2.2;             // so schnell setzt man sich hin und steht wieder auf (größer = schneller)
const TIPP_TAKT = 11;               // so schnell hüpfen die Hände beim Tippen
export function polizistSitz(gruppe, art, hoch) { const u = gruppe.userData; u.sitzSoll = art || null; if (art) { u.sitzArt = art; u.sitzHoch = hoch || SITZ_HOCH; } }
// Wohin der Kopf schauen soll (Winkel in der Welt) – oder null für geradeaus
export function polizistBlick(gruppe, winkel) { gruppe.userData.blickZu = winkel; }

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _z = new THREE.Vector3(), _q = new THREE.Quaternion(), _w = new THREE.Quaternion(), _p = new THREE.Quaternion(), HOCH = new THREE.Vector3(0, 1, 0);
// Einen Knochen so drehen, dass er auf sein Kind zu in die Richtung "ziel" zeigt (k = wie stark, 0 bis 1)
function richte(kn, kind, ziel, k) {
  kn.getWorldPosition(_a); kind.getWorldPosition(_b); _b.sub(_a).normalize();
  _q.setFromUnitVectors(_b, ziel); dreheWelt(kn, _q, k);
}
// Einen Knochen um eine Achse in der Welt drehen
function dreheWelt(kn, q, k = 1) {
  kn.getWorldQuaternion(_w); _w.premultiply(q); kn.parent.getWorldQuaternion(_p); _w.premultiply(_p.invert());
  kn.quaternion.slerp(_w, k); kn.updateMatrixWorld(true);
}
function sitzPose(gruppe, u, k, dt) {
  if (!u.kn) { u.kn = {}; gruppe.traverse(o => { if (o.isBone) u.kn[o.name.replace(/^mixamorig\d*:?_?/, '')] = o; }); u.sitzT = Math.random() * 30; }
  const K = u.kn, art = u.sitzArt, dreh = gruppe.rotation.y; if (!K.Hips || !K.LeftUpLeg) return;
  const t = (u.sitzT += dt), R = (x, y, z) => _z.set(x, y, z).normalize().applyAxisAngle(HOCH, dreh);       // eine Richtung, von der Figur aus gesehen: x = nach links, y = hoch, z = nach vorn
  gruppe.updateMatrixWorld(true);
  // Hüfte auf den Sitz
  K.Hips.getWorldPosition(_a); const hin = _b.set(0, u.sitzHoch, -0.04).applyAxisAngle(HOCH, dreh); hin.x += gruppe.position.x; hin.z += gruppe.position.z; hin.y += gruppe.position.y;
  _a.lerp(hin, k); K.Hips.parent.worldToLocal(_a); K.Hips.position.copy(_a); K.Hips.updateMatrixWorld(true);
  // Rücken: beim Arbeiten leicht nach vorn, in der Pause zurückgelehnt. Alle paar Sekunden wechselt man ein wenig die Haltung.
  const wiege = Math.sin(t * 0.23) * 0.03, vor = art === 'ruhe' ? -0.16 : art === 'lesen' ? 0.2 : 0.07;
  richte(K.Hips, K.Spine, R(0, 1, -0.05), k); richte(K.Spine, K.Neck || K.Spine2, R(wiege, 1, vor + Math.sin(t * 0.31) * 0.025), k);
  // Beine: Oberschenkel nach vorn, Unterschenkel nach unten. Ein Fuß steht etwas weiter vorn.
  for (const [n, s] of [['Left', 1], ['Right', -1]]) {
    const weit = art === 'ruhe' ? (s > 0 ? 0.3 : 0.08) : (s > 0 ? 0.02 : 0.2);
    // Wie hoch das Knie sein muss, damit der Fuß genau auf dem Boden steht (lange Beine = Knie höher)
    const ob = K[n + 'UpLeg'], un = K[n + 'Leg'], fu = K[n + 'Foot'];
    ob.getWorldPosition(_a); un.getWorldPosition(_b); const langOb = _a.distanceTo(_b), hueftY = _a.y - gruppe.position.y; fu.getWorldPosition(_a); const langUn = _a.distanceTo(_b);
    const knie = FUSS_HOCH + langUn / Math.hypot(1, weit, 0.03), steil = Math.max(-0.4, Math.min(0.45, (knie - hueftY) / langOb));
    richte(ob, un, R(s * 0.13, steil / Math.sqrt(1 - steil * steil) * 1.008, 1), k); richte(un, fu, R(s * 0.03, -1, weit), k);
    if (K[n + 'ToeBase']) richte(K[n + 'Foot'], K[n + 'ToeBase'], R(s * 0.18, -0.42, 1), k);
  }
  // Arme
  const maus = art === 'tippen' ? Math.max(0, Math.min(1, (Math.sin(t * 0.37) - 0.72) * 9)) : 0;       // ab und zu greift die rechte Hand zur Maus
  const blatt = art === 'lesen' ? Math.max(0, Math.min(1, (Math.sin(t * 0.29) - 0.9) * 14)) : 0;       // … oder blättert um
  for (const [n, s] of [['Left', 1], ['Right', -1]]) {
    const ober = K[n + 'Arm'], unter = K[n + 'ForeArm'], hand = K[n + 'Hand']; if (!ober || !unter || !hand) continue;
    if (art === 'ruhe') { richte(ober, unter, R(s * 0.2, -1, 0.1), k); richte(unter, hand, R(-s * 0.12, -0.5, 1), k); }
    else if (art === 'lesen') { richte(ober, unter, R(s * 0.3, -1, 0.42), k); richte(unter, hand, R(-s * (0.55 - (s < 0 ? blatt * 0.5 : 0)), -0.12 + (s < 0 ? blatt * 0.35 : 0), 1), k); }
    else { const m = s < 0 ? maus : 0, hupf = (1 - m) * (Math.sin(t * TIPP_TAKT + s) * 0.022 + Math.sin(t * TIPP_TAKT * 0.63 + s * 2) * 0.016);
      richte(ober, unter, R(s * (0.24 + m * 0.12), -1, 0.34 + m * 0.1), k); richte(unter, hand, R(-s * (0.3 - m * 0.42), -0.24 + hupf, 1), k); }
    // Handfläche nach unten drehen (im Stehen zeigt sie zum Körper)
    unter.getWorldPosition(_a); hand.getWorldPosition(_b); _b.sub(_a).normalize(); _q.setFromAxisAngle(_b, s * (art === 'ruhe' ? 1.0 : 1.3)); dreheWelt(hand, _q, k);
  }
  // Kopf: beim Tippen meist auf den Bildschirm, manchmal auf die Tasten; beim Lesen nach unten. Kommt jemand, schaut man hin.
  if (K.Head) {
    let seite = 0; if (u.blickZu != null) { seite = u.blickZu - dreh; while (seite > Math.PI) seite -= 2 * Math.PI; while (seite < -Math.PI) seite += 2 * Math.PI; seite = Math.max(-1.2, Math.min(1.2, seite)); }
    u.kopfSeite = (u.kopfSeite || 0) + (seite - (u.kopfSeite || 0)) * Math.min(1, dt * 4);
    const runter = (art === 'lesen' ? 0.42 : art === 'tippen' ? 0.06 + Math.max(0, Math.sin(t * 0.53) - 0.6) * 0.7 : 0.02) * (1 - Math.min(1, Math.abs(u.kopfSeite) * 2));
    const zur = art === 'ruhe' ? Math.sin(t * 0.17) * 0.25 : 0;
    _q.setFromAxisAngle(HOCH, (u.kopfSeite + zur) * 0.5); if (K.Neck) dreheWelt(K.Neck, _q, k); dreheWelt(K.Head, _q, k);
    _q.setFromAxisAngle(R(1, 0, 0), runter); dreheWelt(K.Head, _q, k);
  }
}

// Jedes Bild: die passende Bewegung wählen und ein Stück weiterspielen. tempo = wie schnell die Figur gerade läuft.
export function polizistBewegen(gruppe, dt, tempo) {
  const u = gruppe.userData, T = u.teile;
  if (tempo > 0.1 && u.haltung === 'zielen') u.haltung = null;                   // wer losläuft, nimmt die Waffe herunter
  if (tempo > 0.1 && u.einmal) u.einmal = null;                                   // wer losläuft, bricht ab, was er gerade tat
  if (u.einmal) { const t = T[u.einmal.name];
    if (t.a.time >= t.lang - (u.einmal.halten ? 0 : 0.3)) { if (!u.einmal.halten) { if (u.einmal.dann !== undefined) u.haltung = u.einmal.dann; u.einmal = null; } } }
  // Wer nur herumsteht, sieht sich ab und zu um
  if (!u.einmal && !u.haltung && !u.sitzSoll && tempo <= 0.1 && T.umsehen && (u.warten -= dt) < 0) { u.warten = UMSEHEN[0] + Math.random() * (UMSEHEN[1] - UMSEHEN[0]); polizistSpiele(gruppe, 'umsehen'); }
  const soll = tempo > AB_LAUFEN ? 'laufen' : tempo > 0.1 ? 'gehen' : u.einmal ? u.einmal.name : (u.haltung && T[u.haltung] ? u.haltung : 'stehen');
  let summe = 0;
  for (const [name, t] of Object.entries(T)) { t.stark += ((name === soll ? 1 : 0) - t.stark) * Math.min(1, dt * WECHSEL); if (t.stark < 0.001) t.stark = 0; summe += t.stark; }
  for (const t of Object.values(T)) t.a.setEffectiveWeight(summe ? t.stark / summe : 0);
  T.gehen.a.timeScale = Math.max(0.6, tempo / TEMPO_GEHEN);
  T.laufen.a.timeScale = Math.max(0.7, Math.min(1.3, tempo / TEMPO_LAUFEN));
  u.mixer.update(dt);
  // Sitzt die Figur auf einem Stuhl (oder setzt sich gerade, oder steht auf)? Dann nach der Aufnahme die Sitz-Haltung darüberlegen.
  u.sitzK = (u.sitzK || 0) + ((u.sitzSoll && tempo <= 0.1 ? 1 : 0) - (u.sitzK || 0)) * Math.min(1, dt * SITZ_TEMPO); if (u.sitzK < 0.003) u.sitzK = 0;
  if (u.sitzK) { const k = u.sitzK; sitzPose(gruppe, u, k * k * (3 - 2 * k), dt); }
  if (u.sackOffen) { gruppe.updateMatrixWorld(true);                                 // der Rucksack: so groß wie die Figur, auf Höhe der Brust, dann am Knochen festmachen
    const ort = gruppe.worldToLocal(u.sackOffen.getWorldPosition(new THREE.Vector3())), k = ort.y / 1.33;
    const [tief, hinter] = u.sackOrt || [0.06, 0.2]; u.sack.scale.setScalar(k); u.sack.position.set(ort.x, ort.y - tief * k, ort.z - hinter * k); gruppe.updateMatrixWorld(true); u.sackOffen.attach(u.sack); u.sackOffen = null; }
  if (u.waffe) { const da = WAFFE_DA[soll], t = T[soll].a.time; u.waffe.visible = !!da && t >= da[0] && t <= da[1]; }
}
