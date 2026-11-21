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
const WAFFE_DA = { ziehen: [1.0, 99], zielen: [0, 99], wegstecken: [0, 2.0] };      // in welchen Sekunden einer Bewegung die Pistole in der Hand ist

const lader = new GLTFLoader(), lager = {};
const hole = datei => lager[datei] || (lager[datei] = new Promise((ok, nein) => lader.load(`assets/modelle/${datei}.glb`, ok, undefined, nein)));

// Eine kleine Pistole aus drei Klötzchen (Lauf nach +x, Griff nach −z). Sie liegt nur in der Hand, solange die Waffe gezogen ist.
function pistole() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: '#16181c', roughness: 0.5, metalness: 0.4 });
  const teil = (b, h, t, x, y, z) => { const k = new THREE.Mesh(new THREE.BoxGeometry(b, h, t), m); k.position.set(x, y, z); k.castShadow = true; g.add(k); };
  teil(0.19, 0.028, 0.034, 0.06, 0, 0.012); teil(0.036, 0.03, 0.1, -0.01, 0, -0.05); teil(0.03, 0.012, 0.04, 0.035, 0, -0.02);
  g.visible = false; return g;
}

// Tauscht die Kisten-Figur in "gruppe" gegen das Modell aus, sobald es geladen ist. Klappt das Laden nicht, bleibt die Kisten-Figur.
// datei = welche Figur ('polizist' = Kim, 'otto', 'thomsen' …), art = welches Gerüst: 'polizei', 'frau' oder 'mann'
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
    if (rucksack) { let brust; modell.traverse(o => { if (o.isBone && /Spine2$/.test(o.name)) brust = o; });
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
      const hand = ruhe(ih), f1 = ruhe(knochen('RightFinger1')), f3 = ruhe(knochen('RightFinger3')), x = f3.clone().sub(f1).normalize(), z = new THREE.Vector3(0, 0, 1), y = z.clone().cross(x).normalize();
      const einheit = hand.y > 10 ? 100 : 1, ort = hand.clone().addScaledVector(x, 0.085 * einheit).addScaledVector(y, -0.035 * einheit);
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

// Jedes Bild: die passende Bewegung wählen und ein Stück weiterspielen. tempo = wie schnell die Figur gerade läuft.
export function polizistBewegen(gruppe, dt, tempo) {
  const u = gruppe.userData, T = u.teile;
  if (tempo > 0.1 && u.haltung === 'zielen') u.haltung = null;                   // wer losläuft, nimmt die Waffe herunter
  if (tempo > 0.1 && u.einmal) u.einmal = null;                                   // wer losläuft, bricht ab, was er gerade tat
  if (u.einmal) { const t = T[u.einmal.name];
    if (t.a.time >= t.lang - (u.einmal.halten ? 0 : 0.3)) { if (!u.einmal.halten) { if (u.einmal.dann !== undefined) u.haltung = u.einmal.dann; u.einmal = null; } } }
  // Wer nur herumsteht, sieht sich ab und zu um
  if (!u.einmal && !u.haltung && tempo <= 0.1 && T.umsehen && (u.warten -= dt) < 0) { u.warten = UMSEHEN[0] + Math.random() * (UMSEHEN[1] - UMSEHEN[0]); polizistSpiele(gruppe, 'umsehen'); }
  const soll = tempo > AB_LAUFEN ? 'laufen' : tempo > 0.1 ? 'gehen' : u.einmal ? u.einmal.name : (u.haltung && T[u.haltung] ? u.haltung : 'stehen');
  let summe = 0;
  for (const [name, t] of Object.entries(T)) { t.stark += ((name === soll ? 1 : 0) - t.stark) * Math.min(1, dt * WECHSEL); if (t.stark < 0.001) t.stark = 0; summe += t.stark; }
  for (const t of Object.values(T)) t.a.setEffectiveWeight(summe ? t.stark / summe : 0);
  T.gehen.a.timeScale = Math.max(0.6, tempo / TEMPO_GEHEN);
  T.laufen.a.timeScale = Math.max(0.7, Math.min(1.3, tempo / TEMPO_LAUFEN));
  u.mixer.update(dt);
  if (u.sackOffen) { gruppe.updateMatrixWorld(true);                                 // der Rucksack: so groß wie die Figur, auf Höhe der Brust, dann am Knochen festmachen
    const ort = gruppe.worldToLocal(u.sackOffen.getWorldPosition(new THREE.Vector3())), k = ort.y / 1.33;
    u.sack.scale.setScalar(k); u.sack.position.set(ort.x, ort.y - 0.06 * k, ort.z - 0.2 * k); gruppe.updateMatrixWorld(true); u.sackOffen.attach(u.sack); u.sackOffen = null; }
  if (u.waffe) { const da = WAFFE_DA[soll], t = T[soll].a.time; u.waffe.visible = !!da && t >= da[0] && t <= da[1]; }
}
