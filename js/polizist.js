// Blaulicht über Möwenbrück – die Spielfigur als fertiges 3D-Modell mit echten Bewegungen.
//
// Die Figur (assets/modelle/polizist.glb) kommt aus 3D AI Studio. Ihre drei Bewegungen stecken mit in der Datei:
//   "stehen"  – Gewicht auf einem Bein, Arme hängen neben dem Körper, die Figur atmet, verlagert das Gewicht und sieht sich um (selbst gebaut, tools/figur/haltung.js)
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
// Figuren aus MakeHuman sind in der Datei anders groß als Kim und Otto und brauchen kein Aufhellen:
// hoch = so groß in der Datei, gross = so groß im Spiel (Meter; alle Figuren im Spiel sind ein Stück größer als echte Menschen), heller = Aufhellen
const FIGUREN = {
  thomsen: { hoch: 1.616, gross: 1.84, heller: 1.15 },
};

// Tauscht die Kisten-Figur in "gruppe" gegen das Modell aus, sobald es geladen ist. Klappt das Laden nicht, bleibt die Kisten-Figur.
// datei = welche Figur: 'polizist' (Kim) oder 'otto'. Alle Figuren haben dasselbe Knochen-Gerüst und dieselben drei Bewegungen.
export function ladePolizist(gruppe, datei = 'polizist') {
  new GLTFLoader().load(`assets/modelle/${datei}.glb`, gltf => {
    const modell = gltf.scene;
    const f = FIGUREN[datei] || { hoch: MODELL_HOCH, gross: GROSS, heller: HELLER };
    modell.scale.multiplyScalar(f.gross / f.hoch);
    modell.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; o.material.color.multiplyScalar(f.heller); } });      // die Figur ist immer im Bild, also nie wegrechnen
    for (const kind of [...gruppe.children]) gruppe.remove(kind);
    gruppe.add(modell);
    const mixer = new THREE.AnimationMixer(modell), teile = {};
    for (const name of ['stehen', 'gehen', 'laufen']) {
      const a = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, name));
      a.play(); a.setEffectiveWeight(name === 'stehen' ? 1 : 0);
      if (name === 'stehen') a.time = Math.random() * a.getClip().duration;       // jeder fängt an einer anderen Stelle an, sonst atmen alle im Gleichtakt
      teile[name] = { a, stark: name === 'stehen' ? 1 : 0 };
    }
    gruppe.userData = { ...gruppe.userData, mixer, teile, al: null, bl: null };
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
