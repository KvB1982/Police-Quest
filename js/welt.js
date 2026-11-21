// Blaulicht über Möwenbrück – baut aus den Daten eines Ortes (daten.js) die 3D-Welt.
// Alles besteht aus einfachen Formen: Kisten, Rollen, Kugeln. Fertige Modelle kommen später.

import * as THREE from 'three';
import { STRASSEN_X, STRASSEN_Z, STRASSE_BREIT } from './daten.js';

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
  g.userData = { bl, br, al, ar, schritt: 0 };
  return g;
}

// Beine und Arme schwingen lassen. tempo = wie schnell die Figur gerade läuft (0 = steht).
export function figurBewegen(g, dt, tempo) {
  const u = g.userData;
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
export function autoModell(farbe = '#f4f4f4', polizei = false) {
  const g = new THREE.Group();
  const unten = kiste(1.9, 0.6, 4.4, farbe); unten.position.y = 0.62;
  const oben = kiste(1.7, 0.56, 2.3, '#263238'); oben.position.set(0, 1.2, -0.25);
  const dach = kiste(1.72, 0.08, 2.2, farbe); dach.position.set(0, 1.5, -0.25);
  g.add(unten, oben, dach);
  for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14), mat('#1a1a1a')); r.rotation.z = Math.PI / 2; r.position.set(x, 0.36, z); g.add(r);
  }
  for (const x of [-0.65, 0.65]) {
    const l = kiste(0.4, 0.18, 0.06, '#fff7c0', { emissive: '#fff2a0', emissiveIntensity: 0.6 }); l.position.set(x, 0.72, 2.21); g.add(l);
    const r = kiste(0.4, 0.16, 0.06, '#c0392b', { emissive: '#7a1a10', emissiveIntensity: 0.5 }); r.position.set(x, 0.72, -2.21); g.add(r);
  }
  if (polizei) {
    for (const x of [-0.96, 0.96]) { const s = kiste(0.03, 0.28, 3.6, '#2b6fd6'); s.position.set(x, 0.66, 0); g.add(s); }
    const hb = kiste(1.5, 0.02, 0.5, '#2b6fd6'); hb.position.set(0, 0.93, 1.6); g.add(hb);
    const balken = kiste(1.1, 0.1, 0.3, '#333'); balken.position.set(0, 1.58, -0.1); g.add(balken);
    const blau = [-0.36, 0.36].map(x => { const b = kiste(0.34, 0.14, 0.26, '#1e4fd0', { emissive: '#1e66ff', emissiveIntensity: 0 }); b.position.set(x, 1.67, -0.1); g.add(b); return b; });
    // Scheinwerfer für die Fahrt im Dunkeln und ein blaues Licht, das beim Blaulicht mitblitzt.
    const sw = new THREE.SpotLight('#fff4d0', 0, 60, 0.6, 0.5, 1.2); sw.position.set(0, 1, 2.2);
    sw.target.position.set(0, 0, 14); g.add(sw, sw.target);
    const blitz = new THREE.PointLight('#2a6bff', 0, 30, 1.4); blitz.position.set(0, 2.2, 0); g.add(blitz);
    g.userData = { blau, sw, blitz };
  }
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

// Ein Bild mit Fenstern für die Häuser – einmal gemalt, für alle Häuser benutzt.
let fensterBild = null;
function fenster() {
  if (fensterBild) return fensterBild;
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const k = c.getContext('2d');
  k.fillStyle = '#fff'; k.fillRect(0, 0, 128, 128);
  k.fillStyle = '#5d7385';
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) k.fillRect(10 + i * 30, 12 + j * 38, 18, 24);
  fensterBild = new THREE.CanvasTexture(c); fensterBild.colorSpace = THREE.SRGBColorSpace;
  return fensterBild;
}

function flaeche(r, farbe, y = 0.01) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r[2] - r[0], r[3] - r[1]), mat(farbe));
  m.rotation.x = -Math.PI / 2; m.position.set((r[0] + r[2]) / 2, y, (r[1] + r[3]) / 2);
  return m;
}

// Wie ein Ding aussieht, hängt von seiner Art ab.
function dingModell(d) {
  if (d.art === 'auto') { const a = autoModell(d.farbe, d.polizei); a.rotation.y = d.h || 0; return a; }
  if (d.art === 'spind') { const g = new THREE.Group(); const s = kiste(0.9, 2, 1.1, '#3f6f96'); s.position.y = 1;
    const sch = kiste(0.06, 0.14, 0.14, '#e8c84a'); sch.position.set(0.47, 1.1, 0); g.add(s, sch); return g; }
  if (d.art === 'tuer') { const t = kiste(1.8, 2.4, 0.25, '#6a4a2a'); t.position.y = 1.2; if (Math.abs(d.x) > 20) t.rotation.y = Math.PI / 2; return t; }
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
  const haeuser = [];
  const G = def.gross;

  // Boden
  gruppe.add(flaeche([G[0] - 200, G[1] - 200, G[2] + 200, G[3] + 200], def.draussen ? '#7fa86a' : '#111', -0.02));
  for (const b of def.boden) gruppe.add(flaeche(b.r, b.farbe));

  if (def.draussen) {
    // Gehwege unter den Häuserblocks, dann die Straßen darüber
    gruppe.add(flaeche([-118, -98, 118, 98], '#b9b6ad', 0.0));
    for (const b of def.boden) gruppe.add(flaeche(b.r, b.farbe, 0.015));
    const w = STRASSE_BREIT / 2;
    for (const x of STRASSEN_X) gruppe.add(flaeche([x - w, G[1], x + w, G[3]], '#4a4d52', 0.02));
    for (const z of STRASSEN_Z) gruppe.add(flaeche([G[0], z - w, G[2], z + w], '#4a4d52', 0.02));
    // Mittelstreifen: viele kleine weiße Striche als eine einzige Form (das ist schneller)
    const striche = [];
    for (const x of STRASSEN_X) for (let z = G[1] + 4; z < G[3]; z += 8) if (!STRASSEN_Z.some(s => Math.abs(z - s) < w + 1)) striche.push([x, z, 0]);
    for (const z of STRASSEN_Z) for (let x = G[0] + 4; x < G[2]; x += 8) if (!STRASSEN_X.some(s => Math.abs(x - s) < w + 1)) striche.push([x, z, 1]);
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.25, 3), new THREE.MeshBasicMaterial({ color: '#e8e8e0' }), striche.length);
    const o = new THREE.Object3D();
    striche.forEach(([x, z, quer], i) => { o.position.set(x, 0.03, z); o.rotation.set(-Math.PI / 2, 0, quer ? Math.PI / 2 : 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
    gruppe.add(im);
    // Das Meer im Norden
    gruppe.add(flaeche([-400, -500, 400, -100], '#3f7fb0', 0.0));
    // Häuser
    for (const h of def.haeuser) {
      const b = h.r[2] - h.r[0], t = h.r[3] - h.r[1];
      const bild = fenster().clone(); bild.wrapS = bild.wrapT = THREE.RepeatWrapping;
      bild.repeat.set(Math.max(1, Math.round(Math.max(b, t) / 9)), Math.max(1, Math.round(h.h / 8))); bild.needsUpdate = true;
      const m = new THREE.Mesh(new THREE.BoxGeometry(b, h.h, t), mat(h.farbe, { map: bild, transparent: true }));
      m.position.set((h.r[0] + h.r[2]) / 2, h.h / 2, (h.r[1] + h.r[3]) / 2);
      const d = kiste(b + 0.6, 0.5, t + 0.6, h.dach, { transparent: true }); d.position.y = h.h / 2 + 0.25; m.add(d);
      gruppe.add(m); fest.push(h.r); haeuser.push({ mesh: m, r: h.r });
      if (h.schild) { const s = schild(h.schild, 6); s.position.set(m.position.x, h.h + 3, m.position.z); gruppe.add(s); }
    }
    // Bäume
    for (const b of def.baeume) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 2.2, 8), mat('#6a4a2a')); st.position.set(b.x, 1.1, b.z);
      const kr = new THREE.Mesh(new THREE.SphereGeometry(1.9, 10, 8), mat('#4f8a3f')); kr.position.set(b.x, 3.6, b.z);
      gruppe.add(st, kr); fest.push([b.x - 0.4, b.z - 0.4, b.x + 0.4, b.z + 0.4]);
    }
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
    if (q.dach) { const d = kiste(q.b + 0.8, 0.15, q.t + 1, q.dach); d.position.y = q.h / 2 + 1.6; m.add(d);
      for (const sx of [-1, 1]) { const st = kiste(0.1, 1.6, 0.1, '#666'); st.position.set(sx * q.b / 2, q.h / 2 + 0.8, q.t / 2); m.add(st); } }
    fest.push([q.x - q.b / 2, q.z - q.t / 2, q.x + q.b / 2, q.z + q.t / 2]);
  }
  for (const s of def.schilder || []) { const sp = schild(s.text, s.hoch ? 5 : 1.6); sp.position.set(s.x, s.hoch || 2.3, s.z); gruppe.add(sp); }

  // Dinge und Leute. Ob man sie gerade sieht, entscheidet das Spiel (Merker "wenn" und "bis").
  const objekte = [];
  for (const d of def.dinge) {
    const m = dingModell(d); m.position.set(d.x, 0, d.z); gruppe.add(m);
    const o = { def: d, mesh: m, typ: 'ding' };
    if (d.fest) o.fest = [d.x - d.fest[0] / 2, d.z - d.fest[1] / 2, d.x + d.fest[0] / 2, d.z + d.fest[1] / 2];
    objekte.push(o);
  }
  for (const l of def.leute) {
    const m = l.hund ? hund() : figur(l.look);
    m.position.set(l.x || 0, 0, l.z || 0); gruppe.add(m);
    objekte.push({ def: l, mesh: m, typ: 'leut', x: l.x || 0, z: l.z || 0 });
  }
  return { gruppe, fest, haeuser, objekte };
}
