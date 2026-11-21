// Blaulicht über Möwenbrück – der Himmel: eine große Kuppel mit Farbverlauf, Sonne, Mond, Sterne und ziehende Wolken.
// Vorbild: der Himmel im Reitturnier (NATUR.himmel). Die Kuppel wandert immer mit der Kamera mit,
// deshalb kommt man ihr nie näher – genau wie beim echten Himmel.

import * as THREE from 'three';
import * as BILD from './bilder.js';
import { wuerfel } from './stadtplan.js';

const WEIT = 5200;            // Halbmesser der Himmelskuppel in Metern
// Für jede Lichtstimmung: Farbe ganz oben, in der Mitte, am Horizont · Farbe der Wolken · wo die Sonne steht (Richtung und Höhe)
export const STIMMUNG = {
  tag: { oben: '#2f74c8', mitte: '#7fb6ea', horizont: '#d6e8f5', wolke: '#ffffff', dunst: '#c9dcea', sonne: [0.55, 0.62, 0.56], sonneFarbe: '#fff6dc', sterne: 0 },
  abend: { oben: '#34467e', mitte: '#c9788a', horizont: '#ffb86a', wolke: '#ffb7a0', dunst: '#e2a686', sonne: [-0.88, 0.13, 0.45], sonneFarbe: '#ffb060', sterne: 0.25 },
  nacht: { oben: '#040818', mitte: '#0b1634', horizont: '#1c2c52', wolke: '#27324f', dunst: '#141f3c', sonne: [0.4, 0.5, -0.76], sonneFarbe: '#dfe8ff', sterne: 1, mond: true },
};

function verlauf(s) {         // ein schmales Bild: oben die Farbe vom Zenit, unten die vom Horizont
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const k = c.getContext('2d'), g = k.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, s.oben); g.addColorStop(0.3, s.mitte); g.addColorStop(0.5, s.horizont); g.addColorStop(1, s.horizont);
  k.fillStyle = g; k.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function baueHimmel() {
  const gruppe = new THREE.Group(), w = wuerfel(2024);
  const bilder = {}; for (const n in STIMMUNG) bilder[n] = verlauf(STIMMUNG[n]);
  const kuppel = new THREE.Mesh(new THREE.SphereGeometry(WEIT, 32, 20), new THREE.MeshBasicMaterial({ map: bilder.tag, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
  kuppel.renderOrder = -10; gruppe.add(kuppel);

  // Sonne (oder Mond): ein heller Kern und ein großer weicher Schein
  const kern = new THREE.Sprite(new THREE.SpriteMaterial({ map: BILD.schein(), fog: false, depthWrite: false, toneMapped: false }));
  const hof = new THREE.Sprite(new THREE.SpriteMaterial({ map: BILD.schein('rgba(255,255,255,0.55)'), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, toneMapped: false }));
  kern.renderOrder = -9; hof.renderOrder = -9; gruppe.add(hof, kern);

  // Sterne: viele kleine Punkte auf der oberen Hälfte der Kuppel
  const orte = [];
  for (let i = 0; i < 900; i++) { const a = w() * 6.2832, h = 0.06 + w() * 0.94, r = Math.sqrt(1 - h * h); orte.push(Math.cos(a) * r * WEIT * 0.96, h * WEIT * 0.96, Math.sin(a) * r * WEIT * 0.96); }
  const sterneGeo = new THREE.BufferGeometry(); sterneGeo.setAttribute('position', new THREE.Float32BufferAttribute(orte, 3));
  const sterne = new THREE.Points(sterneGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  sterne.renderOrder = -9; gruppe.add(sterne);

  // Wolken: flache Bilder, die immer zur Kamera schauen. Sie ziehen langsam mit dem Wind nach Osten.
  const wolken = [], wolkenBilder = [1, 2, 3, 4, 5, 6].map(i => BILD.wolke(i));
  for (let i = 0; i < 46; i++) {
    const m = new THREE.SpriteMaterial({ map: wolkenBilder[i % 6], fog: false, depthWrite: false, transparent: true, opacity: 0.9, toneMapped: false });
    const s = new THREE.Sprite(m), gross = 420 + w() * 900;
    s.scale.set(gross, gross * 0.42, 1); s.renderOrder = -8;
    s.userData = { gross, x: (w() * 2 - 1) * 4200, z: (w() * 2 - 1) * 4200, y: 480 + w() * 900, tempo: 5 + w() * 6 };
    wolken.push(s); gruppe.add(s);
  }

  // Wolkendecke für trübes Wetter: eine zweite, graue Kuppel vor Sonne und Sternen. Sie ist durchsichtig, solange der Himmel klar ist.
  const decke = new THREE.Mesh(new THREE.SphereGeometry(WEIT * 0.93, 24, 12), new THREE.MeshBasicMaterial({ color: '#8f9aa4', side: THREE.BackSide, fog: false, depthWrite: false, transparent: true, opacity: 0, toneMapped: false }));
  decke.renderOrder = -8.5; gruppe.add(decke);
  // Das Wetter (wetter.js) schreibt hier hinein: decke = wie zugezogen (0…1), dunkel = wie finster die Wolken sind (0…1),
  // wind = wie schnell die Wolken ziehen (1 = normal), farbe = Farbe der Wolkendecke, blitz = gerade zuckt ein Blitz (0…1)
  const wetter = { decke: 0, dunkel: 0, wind: 1, farbe: new THREE.Color('#8f9aa4'), blitz: 0 };
  const DUNKLE_WOLKE = { tag: '#4a525d', abend: '#353041', nacht: '#090c18' };
  const wolkenFarbe = new THREE.Color(), dunkleWolke = new THREE.Color(), blitzFarbe = new THREE.Color('#e8eeff');
  let name = 'tag';

  const sonneRichtung = new THREE.Vector3(0.5, 0.6, 0.5);
  let jetzt = STIMMUNG.tag;
  return {
    gruppe, sonneRichtung, wetter,
    get dunst() { return jetzt.dunst; },
    // Lichtstimmung wechseln: tag, abend oder nacht
    setze(n) {
      name = STIMMUNG[n] ? n : 'nacht';
      const s = jetzt = STIMMUNG[name];
      kuppel.material.map = bilder[name];
      sonneRichtung.set(...s.sonne).normalize();
      kern.material.color.set(s.sonneFarbe); hof.material.color.set(s.sonneFarbe);
      const gr = s.mond ? 260 : 420; kern.scale.set(gr, gr, 1); hof.scale.set(gr * (s.mond ? 3 : 5), gr * (s.mond ? 3 : 5), 1);
      hof.material.opacity = s.mond ? 0.35 : 0.8;
      sterne.material.opacity = s.sterne;
      for (const c of wolken) { c.material.color.set(s.wolke); c.material.opacity = s.mond ? 0.55 : 0.92; }
    },
    // jedes Bild: Wolken weiterschieben, alles an die Kamera hängen
    schritt(dt, kamera) {
      gruppe.position.set(kamera.position.x, 0, kamera.position.z);
      kern.position.copy(sonneRichtung).multiplyScalar(WEIT * 0.9); hof.position.copy(kern.position);
      // Bei trübem Wetter: Die Wolkendecke schiebt sich vor Sonne und Sterne, die Wolken werden größer, dichter und dunkler.
      const zu = wetter.decke, klar = jetzt.mond ? 0.55 : 0.92;
      decke.material.opacity = zu * 0.86; decke.material.color.copy(wetter.farbe).lerp(blitzFarbe, wetter.blitz * 0.5);
      kern.material.opacity = 1 - zu; hof.material.opacity = (jetzt.mond ? 0.35 : 0.8) * (1 - zu);
      sterne.material.opacity = jetzt.sterne * (1 - zu);
      wolkenFarbe.set(jetzt.wolke).lerp(dunkleWolke.set(DUNKLE_WOLKE[name]), Math.min(1, wetter.dunkel * 1.8)).lerp(blitzFarbe, wetter.blitz * 0.6);
      for (const c of wolken) {
        const u = c.userData;
        u.x += u.tempo * wetter.wind * dt; if (u.x > 4200) u.x -= 8400;
        c.position.set(u.x, u.y, u.z);
        c.material.color.copy(wolkenFarbe);
        const gr = u.gross * (1 + zu * 0.7); c.scale.set(gr, gr * 0.42, 1);
        // weit weg werden die Wolken blasser, damit keine am Rand plötzlich auftaucht
        const fern = Math.hypot(u.x, u.z) / 4200;
        c.material.opacity = (klar + (1 - klar) * zu) * Math.max(0, Math.min(1, (1.25 - fern) * 3));
      }
    },
  };
}
