// Blaulicht über Möwenbrück – zeichnet Verkehr und Fußgänger (die Regeln dazu stehen in verkehr.js).
// Jede Auto-Sorte ist EINE Form, die viele Male hingestellt wird ("Instanzen"). Die Fußgänger bestehen aus fünf Formen
// (Beine, Arme, Bauch, Kopf, Haare) – alle Beine aller Leute zusammen sind auch nur eine Instanzen-Form.

import * as THREE from 'three';
import * as MOD from './modelle.js';
import * as BILD from './bilder.js';
import { autoForm, AUTO_FARBEN } from './stadtbau.js';
import { AUTOS, LEUTE } from './verkehr.js';

const ARTEN = ['auto_kombi', 'auto_kompakt', 'auto_van', 'auto_suv'];

export function baueVerkehr(verkehr) {
  const gruppe = new THREE.Group(), o = new THREE.Object3D(), f = new THREE.Color();
  // ---- Autos: erst die einfache Kisten-Form, dann das geladene Modell
  const autoMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.2 });
  const sorten = ARTEN.map((name, k) => {
    const s = { im: null, modell: false, k };
    const neu = (geo, mat, modell) => { if (s.im) gruppe.remove(s.im); s.im = new THREE.InstancedMesh(geo, mat, AUTOS); s.im.castShadow = true; s.im.frustumCulled = false; s.im.count = 0; s.modell = modell; gruppe.add(s.im); };
    neu(autoForm(), autoMat, false);
    MOD.lade(name).then(m => { if (m) neu(m.geo, m.mat, true); });
    return s;
  });
  // Scheinwerfer-Licht auf der Straße (nur abends und nachts)
  const licht = new THREE.InstancedMesh(new THREE.PlaneGeometry(4.4, 9).rotateX(-Math.PI / 2).translate(0, 0.07, 6.6),
    new THREE.MeshBasicMaterial({ map: BILD.schein('rgba(255,240,200,1)', 'rgba(255,240,200,0)'), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }), AUTOS);
  licht.frustumCulled = false; licht.visible = false; licht.renderOrder = 2; gruppe.add(licht);

  // ---- Fußgänger
  const lam = () => new THREE.MeshLambertMaterial();
  const teil = (geo, n) => { const im = new THREE.InstancedMesh(geo, lam(), n); im.castShadow = true; im.frustumCulled = false; im.count = 0; gruppe.add(im); return im; };
  const beine = teil(new THREE.BoxGeometry(0.2, 0.8, 0.22).translate(0, -0.4, 0), LEUTE * 2), arme = teil(new THREE.BoxGeometry(0.15, 0.64, 0.17).translate(0, -0.3, 0), LEUTE * 2);
  const baeuche = teil(new THREE.BoxGeometry(0.5, 0.68, 0.3).translate(0, 1.14, 0), LEUTE), koepfe = teil(new THREE.SphereGeometry(0.19, 10, 8).translate(0, 1.68, 0), LEUTE);
  const haare = teil(new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 1.71, -0.02), LEUTE);
  const m4 = new THREE.Matrix4(), glied = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();

  return {
    gruppe,
    licht(name) { licht.visible = name === 'abend' || name === 'nacht'; },
    // jedes Bild: alle Autos und Leute an ihre Stelle setzen
    schritt() {
      const n = [0, 0, 0, 0]; let l = 0;
      for (const c of verkehr.autos) {
        if (!c.da) continue;
        const s = sorten[c.art];
        o.position.set(c.x, 0, c.z); o.rotation.set(0, c.h, 0); o.scale.set(1, 1, 1); o.updateMatrix();
        s.im.setMatrixAt(n[c.art], o.matrix); s.im.setColorAt(n[c.art], f.set(s.modell && c.art > 1 ? '#ffffff' : AUTO_FARBEN[c.farbe])); n[c.art]++;
        licht.setMatrixAt(l++, o.matrix);
      }
      sorten.forEach((s, k) => { s.im.count = n[k]; s.im.instanceMatrix.needsUpdate = true; if (s.im.instanceColor) s.im.instanceColor.needsUpdate = true; });
      licht.count = l; licht.instanceMatrix.needsUpdate = true;
      let i = 0;
      for (const m of verkehr.leute) {
        if (!m.da) continue;
        o.position.set(m.x, 0, m.z); o.rotation.set(0, m.h, 0); o.scale.setScalar(m.gross); o.updateMatrix();
        const wink = m.geht ? Math.sin(m.schritt) * 0.6 : 0;
        const setze = (im, k, x, y, w) => { glied.makeRotationFromQuaternion(q.setFromEuler(e.set(w, 0, 0))).setPosition(x, y, 0); m4.multiplyMatrices(o.matrix, glied); im.setMatrixAt(k, m4); };
        setze(beine, i * 2, -0.13, 0.8, wink); setze(beine, i * 2 + 1, 0.13, 0.8, -wink); beine.setColorAt(i * 2, f.set(m.hose)); beine.setColorAt(i * 2 + 1, f);
        setze(arme, i * 2, -0.33, 1.42, -wink * 0.8); setze(arme, i * 2 + 1, 0.33, 1.42, wink * 0.8); arme.setColorAt(i * 2, f.set(m.hemd)); arme.setColorAt(i * 2 + 1, f);
        baeuche.setMatrixAt(i, o.matrix); baeuche.setColorAt(i, f); koepfe.setMatrixAt(i, o.matrix); koepfe.setColorAt(i, f.set(m.haut)); haare.setMatrixAt(i, o.matrix); haare.setColorAt(i, f.set(m.haar));
        i++;
      }
      for (const [im, mal] of [[beine, 2], [arme, 2], [baeuche, 1], [koepfe, 1], [haare, 1]]) { im.count = i * mal; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
    },
  };
}
