// Blaulicht über Möwenbrück – das Wetter: Wolkendecke, Regen, Nebel, Wind, Blitz und Donner.
// Vorbild: wetter.js und sturm.js im Reitturnier (Regen aus Strichen rund um die Kamera, Blätter im Wind, Blitz, Donner aus Rauschen).
//
// Welches Wetter gerade ist, steht im Wetterplan (wetterplan.js) und hängt an der Geschichte.
// Diese Datei zeichnet es und lässt es klingen. Sie verändert nur, was main.js beim Licht eingestellt hat:
// main.js stellt Tag, Abend oder Nacht ein und ruft danach basis(). Das Wetter legt sich dann darüber.

import * as THREE from 'three';
import * as KLANG from './klang.js';
import * as BILD from './bilder.js';
import { UFER } from './stadtplan.js';
import { ARTEN, WIND, LUFT, planZeile, wetterBild } from './wetterplan.js';

// ------------------------------------------------------------------ Zahlen zum Einstellen
const WECHSEL = 9;               // so viele Sekunden braucht das Wetter, um ganz umzuschlagen
const TROPFEN = 1700;            // so viele Regen-Striche bei kräftigem Regen (im Spar-Modus die Hälfte)
const REGEN_HOCH = 22, REGEN_WEIT = 24;        // der Regen fällt in einem Kasten rund um dich: so hoch und so weit (Meter)
const SPRITZER = 260;            // kleine Spritzer auf dem Boden
const BLAETTER = 70;             // Blätter, die bei Sturm durch die Luft wirbeln
const NASS_IN = 18, TROCKEN_IN = 150;          // so viele Sekunden, bis die Straße nass ist und bis sie wieder trocken ist
const SICHT_REGEN = 650, SICHT_NEBEL = 190;   // so weit sieht man bei kräftigem Regen und bei dichtem Nebel (Meter)
const BLITZ_PAUSE = [5, 12];     // bei Gewitter kommt alle 5 bis 12 Sekunden ein Blitz
const LEUCHT_PAUSE = [9, 20];    // Wetterleuchten in der Ferne ist seltener
const BLITZ_ZEIT = 0.4;          // so lange leuchtet ein Blitz (Sekunden)
const LINSE_MAX = 12;            // so viele Tropfen kleben höchstens auf der Kamera-Linse
// Farbe von Wolkendecke und Dunst bei trübem Wetter, je nach Tageszeit
const GRAU = { tag: '#8f9aa4', abend: '#5b586a', nacht: '#0d1322', dunkel: '#0d1322' };
const REGEN_HELL = { tag: 0.62, abend: 0.48, nacht: 0.34, dunkel: 0.34 };       // wie gut man die Regen-Striche sieht
// Fahnen: [x, z, Höhe des Masts, Bild]. Sie stehen neben Wache, Rathaus, Museum, Seenotrettern und am Alten Hafen.
const FAHNEN = [
  [23.6, -6.4, 9, 0], [56.4, -6.4, 9, 0], [-90.6, -46, 11, 0], [-90.6, -22, 11, 1], [74.3, 43.3, 9, 0],
  [598, -66, 10, 2], [-26, UFER + 3.2, 10, 1], [0, UFER + 3.2, 12, 0], [26, UFER + 3.2, 10, 2],
];

const lerp = (a, b, t) => a + (b - a) * t, klemm = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const zufall = (a, b) => a + Math.random() * (b - a);

// ------------------------------------------------------------------ Wind in Bäumen und Fahnen
// Bäume biegen sich im Wind: Das rechnet die Grafikkarte selbst aus (für jeden Eckpunkt), deshalb kostet es fast nichts.
// Je höher ein Punkt über dem Boden liegt, desto weiter schwingt er. Jeder Baum schwingt etwas anders (wPhase).
export function imWind(mat) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uZeit = WIND.uZeit; sh.uniforms.uWind = WIND.uWind;
    sh.vertexShader = 'uniform float uZeit;\nuniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        mat3 wM = mat3(instanceMatrix);
        vec3 wOrt = wM * transformed;
        float wPhase = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23;
        float wHoch = max(0.0, wOrt.y - 1.0);
        float wBiegen = uWind * wHoch * wHoch * 0.004 * (0.55 + 0.45 * sin(uZeit * 1.6 + wPhase) + 0.2 * sin(uZeit * 4.7 + wPhase * 1.7 + wOrt.y * 0.9));
        transformed += (vec3(wBiegen, 0.0, wBiegen * 0.35) * wM) / max(0.0001, dot(wM[0], wM[0]));
      #endif`);
  };
  return mat;
}

// Ein Fahnen-Bild malen: 0 = Stadtfahne von Möwenbrück (blau-weiß mit Möwe), 1 = rot-weiß gestreift, 2 = Seenotretter (ausgedacht)
function fahnenBild(art) {
  const c = document.createElement('canvas'); c.width = 96; c.height = 64;
  const k = c.getContext('2d');
  if (art === 1) { for (let i = 0; i < 4; i++) { k.fillStyle = i % 2 ? '#f4f1ea' : '#c23a30'; k.fillRect(0, i * 16, 96, 16); } }
  else if (art === 2) { k.fillStyle = '#f4f1ea'; k.fillRect(0, 0, 96, 64); k.fillStyle = '#d6452e'; k.fillRect(0, 26, 96, 12); k.fillRect(40, 0, 14, 64); }
  else {
    k.fillStyle = '#24579c'; k.fillRect(0, 0, 96, 64); k.fillStyle = '#f4f1ea'; k.fillRect(0, 22, 96, 20);
    k.strokeStyle = '#24579c'; k.lineWidth = 3; k.lineCap = 'round'; k.beginPath(); k.moveTo(34, 35); k.quadraticCurveTo(42, 24, 48, 33); k.quadraticCurveTo(54, 24, 62, 35); k.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Fahnenmasten mit Fahnen. Das Tuch weht in Windrichtung (nach Osten, +x); ohne Wind hängt es schlaff herunter.
function baueFahnen(schnitt) {
  const gruppe = new THREE.Group(), o = new THREE.Object3D();
  const ebenen = schnitt ? [schnitt] : [];
  const mast = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.09, 1, 6).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: '#d9dcdf', clippingPlanes: ebenen }), FAHNEN.length);
  FAHNEN.forEach(([x, z, h], i) => { o.position.set(x, 0, z); o.scale.set(1, h, 1); o.updateMatrix(); mast.setMatrixAt(i, o.matrix); });
  gruppe.add(mast);
  for (let art = 0; art < 3; art++) {
    const liste = FAHNEN.filter(f => f[3] === art);
    const mat = new THREE.MeshLambertMaterial({ map: fahnenBild(art), side: THREE.DoubleSide, clippingPlanes: ebenen });
    mat.onBeforeCompile = sh => {
      sh.uniforms.uZeit = WIND.uZeit; sh.uniforms.uWind = WIND.uWind;
      sh.vertexShader = 'uniform float uZeit;\nuniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float fWeit = position.x / 2.6;                                   // 0 = am Mast, 1 = am freien Ende
        float fKraft = clamp(uWind * 1.4, 0.0, 1.0);                      // 0 = hängt schlaff, 1 = steht waagerecht
        float fPhase = instanceMatrix[3].x * 0.7;
        float fWelle = sin(position.x * 2.6 - uZeit * (4.0 + uWind * 5.0) + fPhase);
        transformed.z += fWelle * fWeit * (0.1 + 0.22 * min(uWind, 2.0));
        transformed.y += fWelle * fWeit * 0.06 - (1.0 - fKraft) * fWeit * fWeit * 1.5;
        transformed.x *= 0.35 + 0.65 * fKraft;`);
    };
    const tuch = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.6, 1.7, 14, 3).translate(1.3, -0.85, 0), mat, liste.length);
    liste.forEach(([x, z, h], i) => { o.position.set(x + 0.07, h - 0.1, z); o.scale.set(1, 1, 1); o.updateMatrix(); tuch.setMatrixAt(i, o.matrix); });
    tuch.frustumCulled = false; gruppe.add(tuch);
  }
  return gruppe;
}

// ------------------------------------------------------------------ Geräusche: Regen, Wind und Donner aus Rauschen
// Regen klingt wie Rauschen – genau das erzeugt das Spiel hier selbst (keine Aufnahme). Ein Filter macht daraus
// helles Prasseln (draußen), dumpfes Trommeln (aufs Autodach, aufs Dach der Wache) oder das Heulen des Windes.
function baueKlang(ton) {
  const n = ton.sampleRate * 2, puf = ton.createBuffer(1, n, ton.sampleRate), d = puf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const quelle = tempo => { const q = ton.createBufferSource(); q.buffer = puf; q.loop = true; q.playbackRate.value = tempo; q.start(); return q; };
  const filter = (art, hz, q = 0.7) => { const f = ton.createBiquadFilter(); f.type = art; f.frequency.value = hz; f.Q.value = q; return f; };
  const leise = () => { const g = ton.createGain(); g.gain.value = 0; g.connect(ton.destination); return g; };
  const K = { regen: leise(), dach: leise(), wind: leise(), pfeifen: leise() };
  quelle(1).connect(filter('highpass', 900)).connect(K.regenFilter = filter('lowpass', 7000)).connect(K.regen);
  quelle(0.83).connect(filter('bandpass', 260, 0.8)).connect(K.dach);
  quelle(0.5).connect(K.windFilter = filter('bandpass', 380, 1.3)).connect(K.wind);
  quelle(0.71).connect(K.pfeifFilter = filter('bandpass', 1100, 7)).connect(K.pfeifen);
  return K;
}
// Donner: tiefes Grollen, das langsam verklingt. laut = 0…1, warten = Sekunden bis er zu hören ist (Schall ist langsamer als Licht),
// dumpf = man hört ihn durch Wände
function donner(laut, warten, dumpf) {
  const ton = KLANG.kontext(); if (!ton) return;
  try {
    const dauer = 3.4, n = Math.floor(ton.sampleRate * dauer), puf = ton.createBuffer(1, n, ton.sampleRate), d = puf.getChannelData(0);
    let wert = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n, huelle = Math.pow(1 - t, 1.5) * (0.55 + 0.45 * Math.sin(t * 31) * Math.sin(t * 7.3));
      wert = wert * 0.965 + (Math.random() * 2 - 1) * 0.035;                                   // tiefes Grollen
      d[i] = (wert * 9 + (t < 0.04 ? (Math.random() * 2 - 1) * (1 - t / 0.04) * 0.5 : 0)) * huelle;      // am Anfang ein Knall
    }
    const q = ton.createBufferSource(), g = ton.createGain(), f = ton.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = dumpf ? 300 : lerp(600, 5000, laut);
    q.buffer = puf; g.gain.value = Math.min(1, laut) * (dumpf ? 0.6 : 0.9);
    q.connect(f).connect(g).connect(ton.destination); q.start(ton.currentTime + warten);
  } catch (e) { /* ohne Ton geht es auch */ }
}

// ------------------------------------------------------------------ Tropfen auf der Kamera-Linse
// Ein paar durchsichtige Tropfen über dem Bild, wenn man im Regen steht. Der Browser bewegt sie selbst (CSS), das kostet kaum etwas.
function baueLinse() {
  const stil = document.createElement('style');
  stil.textContent = `#linse { position: fixed; inset: 0; pointer-events: none; overflow: hidden; }
    #linse i { position: absolute; border-radius: 50% 50% 48% 52%; opacity: 0; animation: linsenTropfen 3.2s ease-in forwards;
      background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55), rgba(215,230,245,0.16) 45%, rgba(120,140,165,0.22) 100%); box-shadow: inset 0 -1px 2px rgba(255,255,255,0.35); }
    @keyframes linsenTropfen { 0% { opacity: 0; transform: translateY(0) scale(0.4); } 6% { opacity: 0.85; transform: translateY(0) scale(1); }
      55% { opacity: 0.8; transform: translateY(6px) scale(1); } 100% { opacity: 0; transform: translateY(70px) scale(0.8, 1.25); } }`;
  document.head.appendChild(stil);
  const kasten = document.createElement('div'); kasten.id = 'linse';
  const bild = document.getElementById('bild'); bild.parentNode.insertBefore(kasten, bild.nextSibling);
  kasten.addEventListener('animationend', e => e.target.remove());
  return {
    tropfen() {
      if (kasten.childElementCount >= LINSE_MAX) return;
      const t = document.createElement('i'), gr = zufall(10, 30);
      t.style.cssText = `left:${zufall(2, 96)}%;top:${zufall(2, 85)}%;width:${gr}px;height:${gr * 1.15}px`;
      kasten.appendChild(t);
    },
    leeren() { kasten.replaceChildren(); },
  };
}

// ------------------------------------------------------------------ Das Wetter bauen
// t = { szene, kamera, oben, sonne, himmel, melde(text), neuesLicht() } aus main.js
export function baueWetter(t) {
  const { szene, kamera, oben, sonne, himmel } = t;
  const jetzt = { decke: 0, dunkel: 0, regen: 0, wind: 0.3, nebel: 0, blitz: 0 };      // das Wetter in diesem Augenblick (gleitet zum Ziel)
  let art = 'klar', fest = null, zeile = null, erstes = true, uhr = 0, nass = 0, nassGemeldet = -1, lampenDunkel = false;
  let B = null;                  // was main.js eingestellt hat (siehe basis)
  const farbe = new THREE.Color(), hell = new THREE.Color('#dfe6ff'), c = new THREE.Color();

  // ---- Regen: Striche, die rund um dich fallen (wie im Reitturnier)
  const regenOrt = new Float32Array(TROPFEN * 6), tropfen = [];
  for (let i = 0; i < TROPFEN; i++) tropfen.push([zufall(-REGEN_WEIT, REGEN_WEIT), Math.random() * REGEN_HOCH, zufall(-REGEN_WEIT, REGEN_WEIT), zufall(15, 22)]);
  const regenGeo = new THREE.BufferGeometry(); regenGeo.setAttribute('position', new THREE.BufferAttribute(regenOrt, 3));
  const regen = new THREE.LineSegments(regenGeo, new THREE.LineBasicMaterial({ color: '#d4e4f2', transparent: true, opacity: 0.5, fog: false, depthWrite: false }));
  regen.frustumCulled = false; regen.visible = false; regen.renderOrder = 3;
  // ---- Spritzer: helle Punkte, die auf dem Boden aufblitzen
  const spritzOrt = new Float32Array(SPRITZER * 3);
  const spritzGeo = new THREE.BufferGeometry(); spritzGeo.setAttribute('position', new THREE.BufferAttribute(spritzOrt, 3));
  const spritzer = new THREE.Points(spritzGeo, new THREE.PointsMaterial({ map: BILD.schein('rgba(225,238,250,1)', 'rgba(225,238,250,0)'), size: 0.34, transparent: true, opacity: 0.55, depthWrite: false }));
  spritzer.frustumCulled = false; spritzer.visible = false; spritzer.renderOrder = 3;
  // ---- Blätter im Sturm
  const blatt = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 0.17), new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), BLAETTER), blaetter = [], o = new THREE.Object3D();
  ['#c9772a', '#d9a62a', '#8a5a2a', '#7fa83a', '#b8442a', '#e0c060'].forEach((f, k) => { for (let i = k; i < BLAETTER; i += 6) blatt.setColorAt(i, c.set(f)); });
  for (let i = 0; i < BLAETTER; i++) blaetter.push({ x: zufall(-26, 26), y: Math.random() * 7, z: zufall(-26, 26), p: Math.random() * 6.28, v: zufall(0.7, 1.4), r: Math.random() * 6.28 });
  blatt.frustumCulled = false; blatt.visible = false;
  // ---- Blitz: ein gezacktes Band vom Himmel bis zum Boden und ein heller Schein an seinem Fuß
  const ZACKEN = 14, blitzOrt = new Float32Array(ZACKEN * 18 * 2);
  const blitzGeo = new THREE.BufferGeometry(); blitzGeo.setAttribute('position', new THREE.BufferAttribute(blitzOrt, 3));
  const blitzMat = new THREE.MeshBasicMaterial({ color: '#eef2ff', fog: false, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  const blitzBand = new THREE.Mesh(blitzGeo, blitzMat); blitzBand.frustumCulled = false; blitzBand.visible = false; blitzBand.renderOrder = -7;
  const draussenTeile = new THREE.Group(); draussenTeile.add(regen, spritzer, blatt, blitzBand);
  let fahnen = null;
  szene.add(draussenTeile);

  // Ein Blitz schlägt bei (x, z) ein. Das Band wird aus Zacken gebaut, mit einem Seitenast.
  let blitzRest = 0, blitzKraft = 0, naechsterBlitz = 4;
  function band(nr, x1, y1, z1, x2, y2, z2, dick) {
    // ein Stück des Blitzes: ein schmales Viereck, quer zur Blickrichtung
    const qx = kamera.position.z - z1, qz = -(kamera.position.x - x1), l = Math.hypot(qx, qz) || 1, ax = -qz / l * dick, az = qx / l * dick, k = nr * 18;
    blitzOrt.set([x1 - ax, y1, z1 - az, x1 + ax, y1, z1 + az, x2 + ax, y2, z2 + az, x1 - ax, y1, z1 - az, x2 + ax, y2, z2 + az, x2 - ax, y2, z2 - az], k);
  }
  function blitzen(x, z, kraft, sichtbar) {
    blitzRest = BLITZ_ZEIT; blitzKraft = kraft;
    const weit = Math.hypot(x - kamera.position.x, z - kamera.position.z);
    blitzBand.visible = sichtbar;
    if (sichtbar) {
      const hoch = 620, dick = Math.max(0.6, weit * 0.011);
      let px = x + zufall(-120, 120), py = hoch, pz = z + zufall(-120, 120), ast = 3 + Math.floor(Math.random() * 6), ax = 0, ay = 0, az = 0;
      for (let i = 0; i < ZACKEN; i++) {
        const f = (i + 1) / ZACKEN, schluss = i === ZACKEN - 1;
        const nx = schluss ? x : lerp(px, x, 1 / (ZACKEN - i)) + zufall(-40, 40) * (1 - f), ny = hoch * (1 - f), nz = schluss ? z : lerp(pz, z, 1 / (ZACKEN - i)) + zufall(-40, 40) * (1 - f);
        band(i, px, py, pz, nx, ny, nz, dick);
        if (i === ast) { ax = px; ay = py; az = pz; }
        px = nx; py = ny; pz = nz;
      }
      const rx = zufall(-1, 1), rz = zufall(-1, 1);          // der Seitenast: dünner, läuft schräg weg und endet in der Luft
      for (let i = 0; i < ZACKEN; i++) {
        const lang = i < 6 ? 34 : 0, nx = ax + rx * lang + zufall(-14, 14), ny = ay - lang * 1.1, nz = az + rz * lang + zufall(-14, 14);
        band(ZACKEN + i, ax, ay, az, i < 6 ? nx : ax, i < 6 ? ny : ay, i < 6 ? nz : az, dick * 0.5);
        if (i < 6) { ax = nx; ay = ny; az = nz; }
      }
      blitzGeo.attributes.position.needsUpdate = true;
    }
    // Schall braucht für 340 Meter eine Sekunde – der Donner kommt deshalb später als der Blitz.
    donner(klemm(1.1 - weit / 1100, 0.25, 1) * kraft, Math.min(3, weit / 340), !B || !B.draussen);
  }

  // ---- Ton
  let K = null, linse = null, linseZeit = 0;
  function klang(dt, wo) {
    const ton = KLANG.kontext(); if (!ton) return;
    if (!K) K = baueKlang(ton);
    const setz = (g, v) => g.gain.setTargetAtTime(v, ton.currentTime, 0.25);
    const r = Math.min(1.3, jetzt.regen), w = WIND.uWind.value;
    // draußen prasselt es hell · im Auto trommelt es dazu aufs Dach · drinnen hört man nur das dumpfe Trommeln
    setz(K.regen, r * (wo === 'draussen' ? 0.11 : wo === 'auto' ? 0.05 : 0.008));
    setz(K.dach, r * (wo === 'draussen' ? 0.05 : wo === 'auto' ? 0.3 : 0.2));
    K.regenFilter.frequency.setTargetAtTime(wo === 'draussen' ? 7000 : 2600, ton.currentTime, 0.3);
    const drin = wo === 'drinnen' ? 0.3 : wo === 'auto' ? 0.55 : 1;
    setz(K.wind, Math.min(0.42, 0.07 * w * w) * drin);
    setz(K.pfeifen, Math.max(0, w - 1.1) * 0.035 * drin);                    // erst bei Sturm pfeift es um die Ecken
    K.windFilter.frequency.setTargetAtTime(300 + 170 * w, ton.currentTime, 0.4);
    K.pfeifFilter.frequency.setTargetAtTime(850 + 260 * w + 120 * Math.sin(uhr * 0.9), ton.currentTime, 0.3);
  }

  const W = {
    get art() { return art; },
    get jetzt() { return jetzt; },
    get nass() { return nass; },
    get bild() { return wetterBild(art, B ? B.name : 'tag'); },
    get name() { return ARTEN[art].name; },
    ARTEN,
    // Zum Ausprobieren und für besondere Stellen: ein Wetter festlegen (null = wieder nach Plan). sofort = ohne Übergang
    setze(name, sofort) { fest = ARTEN[name] ? name : null; if (sofort) erstes = true; },
    // Ein Blitz in der Nähe (weit = Meter von dir weg)
    blitz(weit = 140) { const a = Math.random() * 6.283; blitzen(kamera.position.x + Math.sin(a) * weit, kamera.position.z - Math.abs(Math.cos(a)) * weit - 30, 1, !!(B && B.draussen)); },
    // Tagsüber wird es bei Gewitter so finster, dass Fenster und Laternen angehen sollen.
    lampen(name) { return name === 'tag' && lampenDunkel ? 'abend' : name; },
    // main.js hat gerade Tag, Abend oder Nacht eingestellt: Das merkt sich das Wetter als Grundlage.
    basis(name, draussen) {
      B = { name, draussen, oben: oben.intensity, sonne: sonne.intensity, nah: szene.fog.near, fern: szene.fog.far, farbe: szene.fog.color.clone() };
      if (!draussen && linse) linse.leeren();
    },
    // Fahnen aufstellen (einmal, sobald die Stadt gebaut ist)
    fahnen(schnitt) { if (!fahnen) { fahnen = baueFahnen(schnitt); draussenTeile.add(fahnen); } },

    // Jedes Bild. s = { x, z (worauf die Kamera schaut), flags, imAuto, sparsam, stadt }
    schritt(dt, s) {
      uhr += dt;
      // ---- 1. Welches Wetter soll sein? Der Plan folgt der Geschichte.
      const z = planZeile(s.flags), soll = fest || z.wetter;
      if (z !== zeile) { if (zeile && !fest && !erstes) { if (z.text) t.melde(z.text); if (z.einschlag) W.blitz(120); } zeile = z; }
      art = soll;
      const Z = ARTEN[art], ruck = dt / WECHSEL * 2;                // gleitet in kleinen Schritten zum Ziel
      for (const n in jetzt) jetzt[n] = erstes ? Z[n] : jetzt[n] + klemm(Z[n] - jetzt[n], -ruck, ruck);
      // ---- 2. Wind: weht in Böen, mal stärker, mal schwächer
      const boe = jetzt.wind * (0.8 + 0.2 * Math.sin(uhr * 0.5) + 0.14 * Math.sin(uhr * 1.37 + 1) + 0.08 * Math.sin(uhr * 3.1));
      WIND.uZeit.value = uhr; WIND.uWind.value = boe;
      LUFT.sicht = klemm(1 - Math.min(1, jetzt.regen) - jetzt.nebel - (jetzt.dunkel > 0.45 && Z.regen === 0 ? 0.5 : 0));
      const draussen = !!(B && B.draussen), regnet = Math.min(1.3, jetzt.regen);
      draussenTeile.visible = draussen;
      // ---- 3. Blitze: bei Gewitter nah und mit Band, bei Sturm nur Wetterleuchten über der See
      if (jetzt.blitz > 0.6 && Z.blitz) {
        naechsterBlitz -= dt;
        if (naechsterBlitz <= 0) {
          const nah = Z.blitz >= 2 && jetzt.blitz > 1.5;
          naechsterBlitz = zufall(...(nah ? BLITZ_PAUSE : LEUCHT_PAUSE));
          const a = Math.random() * 6.283, weit = nah ? zufall(220, 900) : zufall(1500, 2600);
          // Wetterleuchten kommt immer von der See (Norden, −z)
          blitzen(kamera.position.x + Math.sin(a) * weit, kamera.position.z + (nah ? Math.cos(a) : -Math.abs(Math.cos(a)) - 0.4) * weit, nah ? zufall(0.6, 1) : 0.35, draussen);
        }
      }
      let bl = 0;
      if (blitzRest > 0) {
        blitzRest -= dt;
        bl = Math.max(0, blitzRest / BLITZ_ZEIT) * blitzKraft * (Math.sin(uhr * 75) > -0.25 ? 1 : 0.3);       // ein Blitz flackert
        blitzMat.opacity = Math.min(1, bl * 1.6);
        if (blitzRest <= 0) blitzBand.visible = false;
      }
      // ---- 4. Licht, Dunst und Himmel
      if (B) {
        const nacht = B.name === 'nacht' || B.name === 'dunkel';
        if (draussen) {
          farbe.copy(B.farbe).lerp(c.set(GRAU[B.name] || GRAU.nacht), Math.min(1, jetzt.decke * 0.85 + jetzt.dunkel * 0.3)).multiplyScalar(1 - jetzt.dunkel * 0.45);
          himmel.wetter.decke = jetzt.decke; himmel.wetter.dunkel = jetzt.dunkel; himmel.wetter.wind = 1 + boe * 3; himmel.wetter.blitz = bl;
          himmel.wetter.farbe.copy(farbe);
          if (bl > 0) farbe.lerp(hell, Math.min(0.6, bl * 0.55));
          szene.fog.color.copy(farbe); szene.background.copy(farbe);
          // Nebel nimmt die Sicht sehr schnell: Schon halber Nebel lässt nur noch ein Fünftel der Sichtweite übrig.
          const klarWeit = lerp(B.fern, SICHT_REGEN, Math.min(1, regnet));
          szene.fog.near = lerp(lerp(B.nah, 50, Math.min(1, regnet)), 6, Math.sqrt(jetzt.nebel));
          szene.fog.far = klarWeit * Math.pow(SICHT_NEBEL / klarWeit, jetzt.nebel);
          sonne.intensity = B.sonne * (1 - 0.8 * Math.max(jetzt.decke * 0.75, jetzt.dunkel)) + bl * 1.6;
          oben.intensity = B.oben * (1 - jetzt.dunkel * (nacht ? 0.3 : 0.5)) + bl * (nacht ? 2.6 : 1.6);
        } else {
          // drinnen: Nur der Blitz zuckt durch die Fenster.
          oben.intensity = B.oben + bl * 0.9;
        }
        const dunkelNeu = jetzt.dunkel > (lampenDunkel ? 0.45 : 0.6);
        if (dunkelNeu !== lampenDunkel) { lampenDunkel = dunkelNeu; if (B.name === 'tag') t.neuesLicht(); }
      }
      // ---- 5. Nasse Straße: wird im Regen langsam dunkel und glänzend, trocknet danach wieder
      nass = erstes ? (regnet > 0.3 ? 1 : 0) : klemm(nass + (regnet > 0.2 ? dt / NASS_IN * regnet : -dt / TROCKEN_IN));
      if (s.stadt && s.stadt.nass && (Math.abs(nass - nassGemeldet) > 0.02 || s.stadt !== W.stadtAlt)) { nassGemeldet = nass; W.stadtAlt = s.stadt; s.stadt.nass(nass); }
      erstes = false;
      // ---- 6. Regen, Spritzer, Blätter (nur draußen)
      if (draussen) {
        const anteil = klemm(regnet / 1.3) * (s.sparsam ? 0.5 : 1), n = Math.round(TROPFEN * anteil);
        regen.visible = n > 8;
        if (regen.visible) {
          const schraeg = boe * 0.5;
          for (let i = 0; i < n; i++) {
            const p = tropfen[i], q = i * 6;
            p[1] -= p[3] * dt; p[0] += boe * 7 * dt;
            if (p[1] < 0) { p[1] += REGEN_HOCH; p[0] = zufall(-REGEN_WEIT, REGEN_WEIT); p[2] = zufall(-REGEN_WEIT, REGEN_WEIT); }
            if (p[0] > REGEN_WEIT) p[0] -= REGEN_WEIT * 2;
            regenOrt[q] = s.x + p[0]; regenOrt[q + 1] = p[1]; regenOrt[q + 2] = s.z + p[2];
            regenOrt[q + 3] = s.x + p[0] - schraeg; regenOrt[q + 4] = p[1] + 0.95; regenOrt[q + 5] = s.z + p[2] - schraeg * 0.3;
          }
          regenGeo.setDrawRange(0, n * 2); regenGeo.attributes.position.needsUpdate = true;
          regen.material.opacity = (REGEN_HELL[B.name] || 0.3) * (0.6 + 0.4 * klemm(regnet)) + bl * 0.3;
        }
        const ns = Math.round(SPRITZER * anteil);
        spritzer.visible = ns > 4;
        if (spritzer.visible) {
          // jedes Bild springt ein Fünftel der Spritzer an eine neue Stelle – so flimmert der Boden
          for (let j = 0; j < SPRITZER / 5; j++) { const i = Math.floor(Math.random() * SPRITZER) * 3; spritzOrt[i] = s.x + zufall(-24, 24); spritzOrt[i + 1] = 0.12; spritzOrt[i + 2] = s.z + zufall(-20, 14); }
          spritzGeo.setDrawRange(0, ns); spritzGeo.attributes.position.needsUpdate = true;
          spritzer.material.opacity = (REGEN_HELL[B.name] || 0.3) * 1.1;
        }
        const nb = Math.round(BLAETTER * klemm((boe - 0.9) / 0.9));
        blatt.visible = nb > 0;
        if (blatt.visible) {
          for (let i = 0; i < nb; i++) {
            const b = blaetter[i];
            b.p += dt * 5 * b.v; b.r += dt * 9 * b.v;
            b.x += (boe * 6 * b.v + Math.sin(b.p) * 3) * dt; b.z += (boe * 2 * b.v + Math.cos(b.p * 0.8) * 3) * dt; b.y += Math.sin(b.p * 1.3) * 2.2 * dt;
            if (b.x > 26) b.x -= 52; if (b.z > 26) b.z -= 52; if (b.z < -26) b.z += 52;
            b.y = b.y < 0.15 ? 0.15 : b.y > 8 ? 0.4 : b.y;
            o.position.set(s.x + b.x, b.y, s.z + b.z); o.rotation.set(b.r, b.p, b.r * 0.7); o.updateMatrix(); blatt.setMatrixAt(i, o.matrix);
          }
          blatt.count = nb; blatt.instanceMatrix.needsUpdate = true;
        }
        // Tropfen auf der Linse: je stärker der Regen, desto öfter
        if (regnet > 0.2 && (linseZeit -= dt) <= 0) { linseZeit = zufall(0.5, 1.4) / regnet; if (!linse) linse = baueLinse(); linse.tropfen(); }
      }
      klang(dt, draussen ? (s.imAuto ? 'auto' : 'draussen') : 'drinnen');
    },
  };
  return W;
}
