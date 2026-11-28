// Blaulicht über Möwenbrück – die fertigen 3D-Modelle (Ordner assets/modelle/).
// Woher jede Datei kommt, steht in assets/QUELLEN.md (Poly Haven CC0 und Modelle aus dem Schwester-Spiel Powershot).
//
// Jedes Modell wird beim Laden einmal zurechtgerückt: Es steht auf dem Boden (y = 0), seine Mitte liegt bei x = 0 und z = 0,
// und es ist so groß, wie es in der Tabelle steht. Bis ein Modell geladen ist, zeigt das Spiel einfache Formen.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const V = Math.PI / 2;
// name: { h: so hoch in Metern  ODER  l: so lang ist die längste Seite am Boden · dreh: Drehung, damit "vorn" nach +z zeigt }
export const MODELLE = {
  // echt: true = das Material bleibt, wie es aus der Vorlage kommt (mit Glanz und feinen Beulen). Das kostet mehr, deshalb nur beim Streifenwagen.
  streifenwagen: { l: 5.0, dreh: -V, echt: true },
  streifenwagen_stil: { l: 4.8, dreh: -V },      // der Streifenwagen im Stil des Spiels: 4.900 Dreiecke, nur ein Farbbild
  auto_kombi: { l: 4.6, dreh: -V }, auto_kompakt: { l: 4.0, dreh: -V }, auto_van: { l: 5.0 }, auto_suv: { l: 4.7 },
  laterne: { h: 6.5, dreh: V }, laterne_alt: { h: 4.2 }, laterne_hafen: { h: 1.1 },
  baum_laub: { h: 8 }, baum_fichte: { h: 9 },
  muelltonne: { h: 0.95 }, pflanzkuebel: { h: 0.9 }, bank: { l: 1.9, dreh: -V }, tafel: { h: 1.1 }, stromkasten: { h: 1.25 },
  kiste_holz: { l: 1.3 }, fass: { h: 0.95 }, holzfass: { h: 0.95 }, fischkiste: { l: 0.8 }, rettungsring: { h: 0.75 },
  boje: { h: 3.2 }, seezeichen: { h: 6 }, stand: { h: 2.7, dreh: -V }, schirmtisch: { h: 2.7 }, absperrgitter: { l: 2 }, bistro: { l: 1.84 },
  // Möbel und Kleinkram für drinnen (Poly Haven)
  schreibtisch: { l: 2.0 }, holzbank: { l: 1.3 }, laptop: { l: 0.42 }, klemmbrett: { l: 0.34 }, erste_hilfe: { l: 0.53 }, sofa: { l: 1.9 }, regal_metall: { h: 2 },
  croissant: { l: 0.2 }, apfel: { h: 0.09 }, kaese: { l: 0.24 }, bueste: { h: 0.62 }, vase: { h: 0.5 }, bilderrahmen: { l: 1.2 }, kamera_wand: { l: 0.45 },
  mal_brunnen: { l: 6.5 }, mal_yacht: { l: 14, dreh: V }, betonsperre: { l: 1.6 }, reifen: { h: 0.6 }, gully: { l: 0.7 },
};

// Wo sitzen bei einem Auto-Modell die vier Räder, und wie groß sind sie? Das Modell ist aus einem Stück, also suchen wir die Stellen,
// an denen es den Boden berührt: vorn und hinten, links und rechts. Aus der Breite des Reifens in 20 cm Höhe ergibt sich sein Halbmesser.
// Zurück kommt { r, x, vorn, hinten } – das Spiel setzt dort eigene Räder davor, die sich drehen können.
export function raederVon(geo) {
  const p = geo.attributes.position, b = geo.boundingBox, H = 0.2, stellen = [];
  for (const vorn of [1, -1]) {
    let zMin = 1e9, zMax = -1e9, mitteSumme = 0, n = 0, xMax = 0;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i) * vorn; if (y < 0.04 && z > 0.4) { mitteSumme += z; n++; } }
    const mitte = n ? mitteSumme / n : b.max.z * 0.62;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i) * vorn, x = Math.abs(p.getX(i)); if (y < H && Math.abs(z - mitte) < 0.55) { zMin = Math.min(zMin, z); zMax = Math.max(zMax, z); if (y < 0.1) xMax = Math.max(xMax, x); } }
    const sehne = zMax - zMin;
    stellen.push({ z: mitte * vorn, r: Math.max(0.29, Math.min(0.4, (sehne * sehne / 4 + H * H) / (2 * H))), x: xMax });
  }
  return { r: (stellen[0].r + stellen[1].r) / 2, x: Math.max(stellen[0].x, stellen[1].x), vorn: stellen[0].z, hinten: stellen[1].z };
}

const fertig = new Map(), wartet = new Map();
const lader = new GLTFLoader();

// Lädt ein Modell. Zurück kommt { geo, mat } (eine Form, ein Material) oder null, wenn es die Datei nicht gibt.
export function lade(name) {
  if (fertig.has(name)) return Promise.resolve(fertig.get(name));
  if (wartet.has(name)) return wartet.get(name);
  const p = new Promise(ok => {
    lader.load(`assets/modelle/${name}.glb`, g => {
      let netz = null;
      g.scene.updateMatrixWorld(true);
      g.scene.traverse(o => { if (o.isMesh && !netz) netz = o; });
      if (!netz) { fertig.set(name, null); return ok(null); }
      const T = MODELLE[name] || {}, geo = netz.geometry.clone();
      // Verkleinerte Dateien speichern Orte als kleine ganze Zahlen. Zum Drehen und Schieben brauchen wir echte Kommazahlen.
      for (const was of ['position', 'normal']) {
        const a = geo.attributes[was]; if (!a) continue;
        const f = new Float32Array(a.count * 3);
        for (let i = 0; i < a.count; i++) { f[i * 3] = a.getX(i); f[i * 3 + 1] = a.getY(i); f[i * 3 + 2] = a.getZ(i); }
        geo.setAttribute(was, new THREE.BufferAttribute(f, 3));
      }
      geo.applyMatrix4(netz.matrixWorld);
      if (T.dreh) geo.rotateY(T.dreh);
      geo.computeBoundingBox();
      const b = geo.boundingBox, gr = new THREE.Vector3(); b.getSize(gr);
      const mal = T.h ? T.h / gr.y : T.l ? T.l / Math.max(gr.x, gr.z) : 1;
      geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
      geo.scale(mal, mal, mal);
      geo.computeBoundingBox(); geo.computeBoundingSphere();
      const mat = netz.material; if (!T.echt) { mat.metalness = 0; mat.roughness = Math.max(0.6, mat.roughness ?? 0.8); }
      const e = { geo, mat, gr: gr.multiplyScalar(mal) };
      if (/^(auto_|streifenwagen)/.test(name)) e.raeder = raederVon(geo);
      fertig.set(name, e); ok(e);
    }, undefined, f => { console.warn('Modell fehlt: ' + name, f && f.message); fertig.set(name, null); ok(null); });
  });
  wartet.set(name, p);
  return p;
}
export const hat = name => fertig.get(name) || null;
export function ladeAlle(namen) { return Promise.all(namen.map(lade)); }
// Zum Testen: welche Modelle sind fertig, welche laden noch?
export const stand = () => ({ fertig: [...fertig.keys()].filter(n => fertig.get(n)), fehlt: [...fertig.keys()].filter(n => !fertig.get(n)), laedt: [...wartet.keys()].filter(n => !fertig.has(n)) });
