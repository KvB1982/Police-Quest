// Blaulicht über Möwenbrück – die Spielfigur als fertiges 3D-Modell mit echten Bewegungen.
//
// Die Figur (assets/modelle/polizist.glb) kommt aus 3D AI Studio. Ihre drei Bewegungen stecken mit in der Datei:
//   "stehen"  – Arme hängen locker, die Figur atmet (selbst gebaut)
//   "gehen"   – ein Doppelschritt aus einer Bewegungs-Aufnahme (DeepMotion SayMotion)
//   "laufen"  – ein Doppelschritt Sprint aus einer zweiten Aufnahme
// Das Spiel blendet weich zwischen den dreien um, je nachdem wie schnell die Figur gerade ist.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const GROSS = 1.98;          // so groß ist die Figur mit Mütze, in Metern
const MODELL_HOCH = 1.871;          // so groß ist sie in der Datei
const TEMPO_GEHEN = 0.87, TEMPO_LAUFEN = 3.41;     // so schnell (Meter pro Sekunde) sind die Aufnahmen – danach richtet sich, wie schnell die Beine laufen
const AB_LAUFEN = 2.2;              // ab diesem Tempo wird gelaufen statt gegangen
const WECHSEL = 7;                  // so schnell wird zwischen zwei Bewegungen umgeblendet (größer = schneller)
const HELLER = 1.5;                 // die dunkelblaue Uniform wäre im Spiel fast schwarz – so viel heller wird die Figur gemalt

// Tauscht die Kisten-Figur in "gruppe" gegen das Modell aus, sobald es geladen ist. Klappt das Laden nicht, bleibt die Kisten-Figur.
export function ladePolizist(gruppe) {
  new GLTFLoader().load('assets/modelle/polizist.glb', gltf => {
    const modell = gltf.scene;
    modell.scale.multiplyScalar(GROSS / MODELL_HOCH);
    modell.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; o.material.color.setScalar(HELLER); } });      // die Figur ist immer im Bild, also nie wegrechnen
    for (const kind of [...gruppe.children]) gruppe.remove(kind);
    gruppe.add(modell);
    const mixer = new THREE.AnimationMixer(modell), teile = {};
    for (const name of ['stehen', 'gehen', 'laufen']) {
      const a = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, name));
      a.play(); a.setEffectiveWeight(name === 'stehen' ? 1 : 0); teile[name] = { a, stark: name === 'stehen' ? 1 : 0 };
    }
    gruppe.userData = { mixer, teile };
  }, undefined, () => {});
}

// Jedes Bild: die passende Bewegung wählen und ein Stück weiterspielen. tempo = wie schnell die Figur gerade läuft.
export function polizistBewegen(gruppe, dt, tempo) {
  const u = gruppe.userData;
  const soll = tempo > AB_LAUFEN ? 'laufen' : tempo > 0.1 ? 'gehen' : 'stehen';
  let summe = 0;
  for (const [name, t] of Object.entries(u.teile)) { t.stark += ((name === soll ? 1 : 0) - t.stark) * Math.min(1, dt * WECHSEL); summe += t.stark; }
  for (const t of Object.values(u.teile)) t.a.setEffectiveWeight(t.stark / summe);
  u.teile.gehen.a.timeScale = Math.max(0.6, tempo / TEMPO_GEHEN);
  u.teile.laufen.a.timeScale = Math.max(0.7, Math.min(1.5, tempo / TEMPO_LAUFEN));
  u.mixer.update(dt);
}
