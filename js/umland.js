// Blaulicht über Möwenbrück – alles rund um die Stadt: Felder, Deich, Wälder, Dörfer, Windräder, Hügel am Horizont
// und draußen auf dem Meer die Leuchtturminsel, die Molen und die Schiffe.
// Vorbild: die Landschaft im Reitturnier (NATUR.berge) und die Umgebung der Gelände in Powershot.
// Hinaus kann man nicht – das Umland ist nur zum Ansehen da. Alles ist ausgedacht.

import * as THREE from 'three';
import { WIND, LUFT } from './wetterplan.js';
import { imWind } from './wetter.js';
import * as BILD from './bilder.js';
import * as MOD from './modelle.js';
import { Eimer, farbe, instanzen, instanzenGeteilt, baumForm, tanneForm } from './stadtbau.js';
import { FLEET, STADT_RAND, UFER, wuerfel } from './stadtplan.js';
import { baueHorizont, DOERFER, fernBelegt } from './horizont.js';

export const INSEL = { x: 720, z: -330 };          // hier steht der Leuchtturm
const WELT = 5200;                                 // so weit reicht der Boden in jede Richtung

export function baueUmland() {
  const gruppe = new THREE.Group(), w = wuerfel(909), zw = (a, b) => a + w() * (b - a);
  const X0 = STADT_RAND.x0, X1 = STADT_RAND.x1, Z1 = STADT_RAND.z1;
  const inStadt = (x, z, rand = 0) => x > X0 - rand && x < X1 + rand && z < Z1 + rand;
  const gras = new Eimer(), bunt = new Eimer(), strasse = new Eimer(), sand = new Eimer();

  // ---- Boden: eine große Wiese, darauf ein Flickenteppich aus Feldern
  // (dort, wo in der Stadt das Fleet ist, bleibt ein Streifen frei – sonst läge die Wiese über dem Wasser)
  const fx = [FLEET[0] - 1, FLEET[2] + 1], wiese = farbe('#9cc27a');
  gras.boden([-WELT, UFER, fx[0], WELT], -0.07, wiese, 9); gras.boden([fx[1], UFER, WELT, WELT], -0.07, wiese, 9); gras.boden([fx[0], FLEET[3], fx[1], WELT], -0.07, wiese, 9);
  // Die Felder, Knicks und Gräben legt horizont.js als Flickenteppich darüber.
  // ---- Deich und Strand links und rechts der Stadt
  for (const [a, b] of [[-WELT, X0], [X1, WELT]]) {
    const z1 = UFER + 16, zm = UFER + 30, z2 = UFER + 46, f = farbe('#86b86a');
    gras.quad([a, 0, z2], [b, 0, z2], [b, 6.5, zm], [a, 6.5, zm], f, a / 9, 0, b / 9, 2);
    gras.quad([b, 0, z1], [a, 0, z1], [a, 6.5, zm], [b, 6.5, zm], f, a / 9, 0, b / 9, 2);
    sand.quad([a, -0.06, z1], [b, -0.06, z1], [b, -1.3, UFER - 90], [a, -1.3, UFER - 90], farbe('#e6d7a8'), a / 6, 0, b / 6, 16);
  }
  bunt.kiste(X0 - 0.5, -0.1, UFER + 16, X0, 6.5, UFER + 46, farbe('#86b86a')); bunt.kiste(X1, -0.1, UFER + 16, X1 + 0.5, 6.5, UFER + 46, farbe('#86b86a'));

  // ---- Landstraßen: Stadtring nach Westen und Osten, Westring und Ostring nach Süden. Daneben Alleebäume.
  const laub = [], tannen = [], asphalt = farbe('#7d8085');
  const land = (x1, z1, x2, z2) => {
    strasse.boden([Math.min(x1, x2) - (x1 === x2 ? 4 : 0), Math.min(z1, z2) - (z1 === z2 ? 4 : 0), Math.max(x1, x2) + (x1 === x2 ? 4 : 0), Math.max(z1, z2) + (z1 === z2 ? 4 : 0)], -0.02, asphalt, 5);
    const l = Math.hypot(x2 - x1, z2 - z1);
    for (let t = 20; t < l; t += 26) for (const s of [-1, 1]) {
      const x = x1 + (x2 - x1) * t / l + (z1 === z2 ? 0 : s * 7), z = z1 + (z2 - z1) * t / l + (z1 === z2 ? s * 7 : 0);
      if (w() < 0.75) laub.push({ x, z, h: zw(9, 13) });
    }
  };
  land(-3600, 152, -826, 152); land(-1500, 56, -826, 56);
  // (Die Autobahn läuft draußen in horizont.js im Bogen weiter.)

  // ---- Wälder und einzelne Baumgruppen
  for (let k = 0; k < 34; k++) {
    const cx = zw(-3200, 3200), cz = zw(UFER + 160, 3200), r = zw(60, 240), nadel = w() < 0.4, n = Math.round(r * 0.55);
    if (inStadt(cx, cz, r + 40)) continue;
    for (let i = 0; i < n; i++) { const a = w() * 6.2832, d = Math.sqrt(w()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d * 0.7;
      if (!fernBelegt(x, z, 8)) (nadel ? tannen : laub).push({ x, z, h: zw(11, 18) }); }
  }
  for (let i = 0; i < 420; i++) { const x = zw(-2600, 2600), z = zw(UFER + 60, 2600); if (!inStadt(x, z, 14) && !fernBelegt(x, z, 8)) laub.push({ x, z, h: zw(7, 13) }); }
  const GRUEN = ['#4f8040', '#5a8c46', '#44763a', '#648f48', '#4c7c42'];
  const baumMat = imWind(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  gruppe.add(instanzenGeteilt(baumForm(), baumMat, laub, (o, b, i) => { o.position.set(b.x, 0, b.z); o.rotation.y = i * 1.7; o.scale.setScalar(b.h); return GRUEN[i % 5]; }, false, 900).gruppe);
  gruppe.add(instanzenGeteilt(tanneForm(), baumMat, tannen, (o, b, i) => { o.position.set(b.x, 0, b.z); o.scale.setScalar(b.h * 1.2); return ['#3f6f4a', '#4a7a52', '#37634a'][i % 3]; }, false, 900).gruppe);

  // ---- Dörfer: kleine Häuser mit rotem Dach rund um einen Kirchturm
  const haus = (x, z, b, t, h, wand, dach, dreh) => {
    const [bx, bz] = dreh ? [t, b] : [b, t], x1 = x - bx / 2, x2 = x + bx / 2, z1 = z - bz / 2, z2 = z + bz / 2, yr = h + Math.min(bx, bz) * 0.45, df = farbe(dach), wf = farbe(wand);
    bunt.kiste(x1, 0, z1, x2, h, z2, wf);
    if (dreh) { const xm = x; bunt.quad([x2, h, z2], [x2, h, z1], [xm, yr, z1], [xm, yr, z2], df); bunt.quad([x1, h, z1], [x1, h, z2], [xm, yr, z2], [xm, yr, z1], df);
      bunt.drei([x1, h, z2], [x2, h, z2], [xm, yr, z2], wf); bunt.drei([x2, h, z1], [x1, h, z1], [xm, yr, z1], wf); }
    else { const zm = z; bunt.quad([x1, h, z2], [x2, h, z2], [x2, yr, zm], [x1, yr, zm], df); bunt.quad([x2, h, z1], [x1, h, z1], [x1, yr, zm], [x2, yr, zm], df);
      bunt.drei([x1, h, z1], [x1, h, z2], [x1, yr, zm], wf); bunt.drei([x2, h, z2], [x2, h, z1], [x2, yr, zm], wf); }
  };
  const WAND = ['#f4ead6', '#efdcc0', '#c9705a', '#f3d9cf', '#b8644e', '#fff3d6'], DACH = ['#a8452f', '#8f3f2e', '#7c3a2e', '#4c5258'];
  for (const [dx, dz] of DOERFER) {
    for (let i = 0; i < 26; i++) { const a = w() * 6.2832, d = 30 + Math.sqrt(w()) * 190; haus(dx + Math.cos(a) * d, dz + Math.sin(a) * d * 0.8, zw(9, 13), zw(7, 9), zw(3.5, 6), WAND[Math.floor(w() * 6)], DACH[Math.floor(w() * 4)], w() < 0.5); }
    haus(dx, dz, 26, 12, 9, '#c9705a', '#4c5258', false);       // die Dorfkirche mit Turm
    bunt.kiste(dx - 17, 0, dz - 3, dx - 11, 24, dz + 3, farbe('#c9705a'));
    for (const [a, b] of [[[dx - 17.5, 24, dz + 3.5], [dx - 10.5, 24, dz + 3.5]], [[dx - 10.5, 24, dz + 3.5], [dx - 10.5, 24, dz - 3.5]], [[dx - 10.5, 24, dz - 3.5], [dx - 17.5, 24, dz - 3.5]], [[dx - 17.5, 24, dz - 3.5], [dx - 17.5, 24, dz + 3.5]]]) bunt.drei(a, b, [dx - 14, 38, dz], farbe('#3f6b5a'));
  }
  // Bauernhöfe mit Scheune
  for (let i = 0; i < 16; i++) { const x = zw(-3000, 3000), z = zw(UFER + 200, 3000); if (inStadt(x, z, 120) || fernBelegt(x, z, 30)) continue;
    haus(x, z, 22, 11, 5, '#b8644e', '#7c3a2e', false); haus(x + 20, z + 16, 12, 9, 4.5, '#f4ead6', '#a8452f', true); }

  // (Windräder, Hügel am Horizont, Halligen, Überseehafen, Möwen …: siehe horizont.js)
  const fern = baueHorizont(); gruppe.add(fern.gruppe);

  // ---- Das Meer: Molen mit kleinen Leuchtfeuern, die Leuchtturminsel, Schiffe
  for (const [x, f] of [[-492, '#c0392b'], [652, '#2e9a4f']]) {
    bunt.kiste(x - 4, -2.5, UFER - 170, x + 4, 1.1, UFER, farbe('#8d8a84'));
    bunt.kiste(x - 0.9, 1.1, UFER - 168, x + 0.9, 7, UFER - 166.2, farbe(f)); bunt.kiste(x - 1.2, 7, UFER - 168.3, x + 1.2, 8.3, UFER - 165.9, farbe('#f2f2f2'));
  }
  const insel = new THREE.Group(); insel.position.set(INSEL.x, 0, INSEL.z);
  const L = (geo, hex, extra) => { const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: hex, ...extra })); insel.add(m); return m; };
  L(new THREE.CylinderGeometry(70, 96, 2.4, 28).translate(0, 0.2, 0), '#e6d7a8'); L(new THREE.CylinderGeometry(50, 66, 2.6, 24).translate(0, 2.2, 0), '#8fb86a');
  for (let k = 0; k < 6; k++) L(new THREE.CylinderGeometry(3.3 - k * 0.22, 3.52 - k * 0.22, 5, 16).translate(0, 6 + k * 5, 0), k % 2 ? '#f4f4f0' : '#c8372d');
  L(new THREE.CylinderGeometry(3.6, 3.6, 0.4, 16).translate(0, 33.7, 0), '#2a2d31');
  const glas = L(new THREE.CylinderGeometry(1.7, 1.7, 2.8, 12).translate(0, 35.3, 0), '#fff3c0', { emissive: '#ffe9a0', emissiveIntensity: 0.3 });
  L(new THREE.ConeGeometry(2.3, 2.2, 12).translate(0, 37.8, 0), '#c8372d');
  L(new THREE.BoxGeometry(11, 5, 7).translate(14, 6, 6), '#f4ead6'); L(new THREE.ConeGeometry(8.2, 3.4, 4).rotateY(Math.PI / 4).scale(1, 1, 0.68).translate(14, 10.2, 6), '#a8452f');
  // Der Lichtstrahl: zwei lange durchsichtige Kegel, die sich im Kreis drehen
  const strahl = new THREE.Group(); strahl.position.y = 35.3;
  const strahlMat = new THREE.MeshBasicMaterial({ color: '#fff2c0', vertexColors: true, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  // Der Strahl ist an der Lampe hell und wird nach außen immer blasser (die Farbe der Ecken blendet ihn aus) – so hat er kein hartes Ende.
  for (const r of [0, Math.PI]) { const g = new THREE.ConeGeometry(16, 1300, 14, 6, true).rotateX(-Math.PI / 2).translate(0, 0, 650), f = [];
    for (let i = 0; i < g.attributes.position.count; i++) { const hell = Math.pow(Math.max(0, 1 - g.attributes.position.getZ(i) / 1300), 1.6); f.push(hell, hell, hell); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(f, 3));
    const k = new THREE.Mesh(g, strahlMat); k.rotation.y = r; strahl.add(k); }
  const funkeln = new THREE.Sprite(new THREE.SpriteMaterial({ map: BILD.schein('rgba(255,244,200,1)', 'rgba(255,244,200,0)'), fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  funkeln.position.y = 35.3; funkeln.scale.set(46, 46, 1);
  strahl.visible = funkeln.visible = false; insel.add(strahl, funkeln); gruppe.add(insel);

  // Schiffe: ein Frachter weit draußen, eine Fähre, Segelboote. Sie fahren langsam hin und her.
  const schiffe = [];
  const schiff = (bauen, x, z, tempo, von, bis) => { const g = new THREE.Group(), e = new Eimer(); bauen(e); g.add(new THREE.Mesh(e.form(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }))); g.position.set(x, -0.9, z); if (tempo < 0) g.rotation.y = Math.PI; gruppe.add(g); schiffe.push({ g, tempo, von, bis }); };
  const BOX = ['#b3372e', '#2f5d9a', '#3d6b4f', '#d8a020', '#e9edf0', '#70777e'];
  schiff(e => { e.kiste(-95, 0, -14, 95, 9, 14, farbe('#1f3d5a')); e.kiste(-95, 0, -14.1, 95, 2.4, 14.1, farbe('#8f3f2e'));
    for (let x = -80; x < 50; x += 13) for (let z = -11; z < 10; z += 7.4) e.kiste(x, 9, z, x + 12, 9 + 3 + Math.floor(w() * 4) * 3, z + 6.6, farbe(BOX[Math.floor(w() * 6)]));
    e.kiste(60, 9, -12, 78, 30, 12, farbe('#f1f3f4')); e.kiste(66, 30, -3, 72, 37, 3, farbe('#d8a020')); }, -1500, -2300, 5, -4200, 4200);
  schiff(e => { e.kiste(-32, 0, -7, 32, 4.5, 7, farbe('#f4f4f0')); e.kiste(-32, 0, -7.1, 32, 1.4, 7.1, farbe('#2f5d9a')); e.kiste(-22, 4.5, -5.5, 20, 9, 5.5, farbe('#f4f4f0'));
    e.kiste(-22, 6.2, -5.6, 20, 7.4, 5.6, farbe('#26323a')); e.kiste(2, 9, -1.5, 6, 13, 1.5, farbe('#c8372d')); }, 1200, -900, -4, -3000, 3000);
  const segler = hex => e => { e.kiste(-4.5, 0, -1.4, 4.5, 1.5, 1.4, farbe('#f4f4f0')); e.kiste(-0.08, 1.5, -0.08, 0.08, 13, 0.08, farbe('#444444'));
    e.drei([0.2, 2.2, 0], [0.2, 12.6, 0], [-4.4, 2.2, 0], farbe(hex)); e.drei([0.5, 2, 0], [4.3, 2, 0], [0.5, 10.5, 0], farbe('#f4f4f0')); };
  schiff(segler('#f4f4f0'), -200, -420, 2.2, -1400, 1500); schiff(segler('#f0c040'), 300, -560, -1.8, -1600, 1300); schiff(segler('#e86a5a'), -700, -690, 1.5, -1800, 1200); schiff(segler('#f4f4f0'), 950, -480, -2, -1200, 1900);

  // ---- alles zu wenigen großen Formen zusammensetzen
  const bodenMat = (name, extra) => new THREE.MeshStandardMaterial({ map: BILD.boden(name), vertexColors: true, roughness: 1, ...extra });
  const m1 = new THREE.Mesh(gras.form(), bodenMat('boden_gras', { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 })); m1.receiveShadow = true;
  const m2 = new THREE.Mesh(bunt.form(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const m3 = new THREE.Mesh(strasse.form(), bodenMat('boden_asphalt')), m4 = new THREE.Mesh(sand.form(), bodenMat('boden_gehweg'));
  gruppe.add(m1, m2, m3, m4);
  for (const m of [m1, m2, m3, m4]) m.frustumCulled = false;
  // Seezeichen vor der Hafeneinfahrt (geladenes Modell)
  MOD.lade('seezeichen').then(m => { if (m) { m.geo.translate(0, -1.2, 0); gruppe.add(instanzen(m.geo, m.mat, [[-492, -330], [652, -330], [80, -420]].map(([x, z]) => ({ x, z })), (o, d) => { o.position.set(d.x, 0, d.z); }, false)); } });

  let uhr = 0, nacht = false, strahlHell = 0.2;
  return {
    gruppe, fern,
    schritt(dt) {
      uhr += dt;
      fern.schritt(dt);
      for (const s of schiffe) { s.g.position.x += s.tempo * dt; if (s.g.position.x > s.bis) s.g.position.x = s.von; if (s.g.position.x < s.von) s.g.position.x = s.bis; s.g.position.y = -0.9 + Math.sin(uhr * 0.8 + s.von) * 0.15; }
      if (nacht) { strahl.rotation.y = uhr * 0.7; strahlMat.opacity = strahlHell * LUFT.sicht; }
    },
    licht(name) {
      nacht = name === 'abend' || name === 'nacht';
      strahl.visible = funkeln.visible = nacht; strahlHell = name === 'nacht' ? 0.2 : 0.09;
      glas.material.emissiveIntensity = nacht ? 2.5 : 0.3;
      fern.licht(name);
    },
  };
}
