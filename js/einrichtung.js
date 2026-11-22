// Blaulicht über Möwenbrück – die Einrichtung: Möbel und Sachen für drinnen und für den Hof, aus einfachen Formen gebaut.
//
// moebelForm(q) baut ein Stück: q.form sagt, was es ist, q.b / q.t / q.h sind Breite, Tiefe und Höhe, q.farbe die Hauptfarbe.
// Vorn ist bei allen +z (dort sitzt man, dort ist die Tür, dorthin schaut das Bild an der Wand).
// Alles, was nur eine Farbe hat, wird später in welt.js zu EINER großen Form verschmolzen (backen) – so bleibt das Spiel
// auch mit hunderten Möbeln schnell. Leuchtendes, Durchsichtiges und Bilder bleiben einzeln.

import * as THREE from 'three';
import * as BILD from './bilder.js';

const mat = (farbe, extra = {}) => new THREE.MeshLambertMaterial({ color: farbe, ...extra });
const dunkel = (farbe, k = 0.72) => '#' + new THREE.Color(farbe).multiplyScalar(k).getHexString();
const STAHL = '#8d949b', SCHWARZ = '#1d2126', WEISS = '#f2f2ee', CHROM = '#c9ced4', POLIZEIBLAU = '#1d3f8a';
const ORDNER = ['#1d3f8a', '#b02a25', '#2e7d32', '#22262b', '#d9a521', '#6b6f75', '#f2f2ee'];

// ---------------------------------------------------------------------------------------------
// Gemalte Bilder: Tafeln, Plakate, Schilder, Markierungen. Jedes Bild wird nur einmal gemalt und dann wiederverwendet.
// ---------------------------------------------------------------------------------------------
const bilder = new Map();
function male(key, b, h, maler) {
  if (bilder.has(key)) return bilder.get(key);
  const c = document.createElement('canvas'); c.width = b; c.height = h; maler(c.getContext('2d'), b, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; bilder.set(key, t); return t;
}
const zufall = saat => { let n = saat * 7.3 + 11; return () => { n = (n * 9301 + 49297) % 233280; return n / 233280; }; };
function zeilen(x, w, x0, y0, n, breit, hoch = 11, farbe = '#555') { x.fillStyle = farbe; for (let k = 0; k < n; k++) x.fillRect(x0, y0 + k * hoch, breit * (0.55 + w() * 0.45), 3); }
function kopf(x, cx, cy, r, farbe) {       // ein Umriss statt eines Gesichts (für Fahndungsplakate)
  x.fillStyle = farbe; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.beginPath(); x.ellipse(cx, cy + r * 2.3, r * 1.7, r * 1.5, 0, Math.PI, 0); x.fill();
}
export function wandBild(art) {
  return male('wand' + art, 512, 256, (x, B, H) => {
    const w = zufall(art.length);
    if (art === 'plan') {       // Stadtplan: Wasser, Viertel, Straßen, rote Nadeln
      x.fillStyle = '#e9e2cf'; x.fillRect(0, 0, B, H); x.fillStyle = '#9fc4dc'; x.fillRect(0, 196, B, 60);
      x.strokeStyle = '#b9ad90'; x.lineWidth = 5; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(256, 200); x.lineTo(256 + Math.cos(Math.PI * (1.08 + i * 0.105)) * 300, 200 + Math.sin(Math.PI * (1.08 + i * 0.105)) * 300); x.stroke(); }
      for (const r of [60, 110, 165]) { x.beginPath(); x.arc(256, 200, r, Math.PI, 2 * Math.PI); x.stroke(); }
      x.fillStyle = '#a8c79a'; x.fillRect(90, 60, 46, 30); x.fillRect(360, 90, 40, 34);
      x.fillStyle = '#d23a2a'; for (let i = 0; i < 7; i++) { x.beginPath(); x.arc(70 + w() * 380, 40 + w() * 140, 5, 0, 7); x.fill(); }
    } else if (art === 'pinn') {       // Pinnwand: Kork mit Zetteln
      x.fillStyle = '#b98a55'; x.fillRect(0, 0, B, H);
      for (let i = 0; i < 16; i++) { const px = 16 + (i % 6) * 82 + w() * 14, py = 14 + Math.floor(i / 6) * 80 + w() * 16; x.fillStyle = ['#ffffff', '#fff2a8', '#f4f4f4', '#cfe6ff', '#ffd7c9'][i % 5]; x.fillRect(px, py, 62, 66);
        zeilen(x, w, px + 7, py + 14, 4, 46); x.fillStyle = '#c0392b'; x.beginPath(); x.arc(px + 31, py + 6, 4, 0, 7); x.fill(); }
    } else if (art === 'fahndung') {       // Fahndungsplakate: Umrisse statt Gesichter, darunter Text
      x.fillStyle = '#d9d4c8'; x.fillRect(0, 0, B, H);
      for (let i = 0; i < 4; i++) { const px = 14 + i * 124; x.fillStyle = '#fbfaf5'; x.fillRect(px, 12, 112, 232); x.fillStyle = i === 1 ? '#b02a25' : '#1d3f8a'; x.fillRect(px, 12, 112, 30);
        x.fillStyle = '#fff'; x.font = 'bold 17px Arial, sans-serif'; x.fillText(i === 1 ? 'VERMISST' : 'FAHNDUNG', px + 10, 33); x.fillStyle = '#c9c5ba'; x.fillRect(px + 16, 52, 80, 96); kopf(x, px + 56, 88, 17, '#6b6760');
        zeilen(x, w, px + 12, 162, 6, 88, 12); }
    } else if (art === 'dienstplan') {       // Dienstplan: Tabelle mit bunten Schichten
      x.fillStyle = '#fbfbf7'; x.fillRect(0, 0, B, H); x.fillStyle = POLIZEIBLAU; x.fillRect(0, 0, B, 36); x.fillStyle = '#fff'; x.font = 'bold 22px Arial, sans-serif'; x.fillText('DIENSTPLAN  ·  Wache Am Deich', 14, 26);
      for (let r = 0; r < 7; r++) { x.fillStyle = '#333'; x.fillRect(12, 56 + r * 28, 70 + w() * 30, 5); for (let s = 0; s < 14; s++) { const v = w(); x.fillStyle = v < 0.3 ? '#f0ad4e' : v < 0.6 ? '#5b8fd9' : v < 0.8 ? '#35405a' : '#e6e6e0'; x.fillRect(130 + s * 26, 46 + r * 28, 23, 22); } }
    } else if (art === 'notruf') {       // Plakat: Notruf 110
      x.fillStyle = POLIZEIBLAU; x.fillRect(0, 0, B, H); x.fillStyle = '#fff'; x.font = 'bold 150px Arial, sans-serif'; x.textAlign = 'center'; x.fillText('110', 256, 160);
      x.font = 'bold 34px Arial, sans-serif'; x.fillText('POLIZEI  ·  NOTRUF', 256, 216); x.fillStyle = '#d8ee2a'; x.fillRect(0, 232, B, 10);
    } else if (art === 'kamerabild') {       // Bildschirm mit vier Kamerabildern vom Hof
      x.fillStyle = '#0b0e12'; x.fillRect(0, 0, B, H);
      for (let i = 0; i < 4; i++) { const px = 6 + (i % 2) * 254, py = 5 + Math.floor(i / 2) * 126; x.fillStyle = ['#39424a', '#4a4f47', '#3d4650', '#454038'][i]; x.fillRect(px, py, 246, 118); x.fillStyle = 'rgba(255,255,255,0.14)'; x.fillRect(px + 20 + i * 30, py + 60, 90, 40); x.fillRect(px + 150 - i * 20, py + 30, 50, 70);
        x.fillStyle = '#d23a2a'; x.beginPath(); x.arc(px + 14, py + 14, 5, 0, 7); x.fill(); x.fillStyle = '#e8e8e8'; x.font = '14px monospace'; x.fillText('CAM ' + (i + 1), px + 26, py + 19); }
    } else if (art === 'messlatte') {       // Die Wand für das Foto: Striche alle 10 cm, Zahlen
      x.fillStyle = '#f1efe8'; x.fillRect(0, 0, B, H); x.fillStyle = '#22262b'; x.font = 'bold 20px Arial, sans-serif';
      for (let i = 0; i <= 12; i++) { const y = H - 4 - i * 21; x.fillRect(0, y, B, i % 2 ? 1 : 3); if (i % 2 === 0) { x.fillText(String(100 + i * 10), 8, y - 4); x.fillText(String(100 + i * 10), B - 46, y - 4); } }
    } else if (art === 'whiteboard') {       // Lagebild: Skizze einer Kreuzung, Pfeile, Stichworte
      x.fillStyle = '#fcfcfa'; x.fillRect(0, 0, B, H); x.strokeStyle = '#1d3f8a'; x.lineWidth = 4; x.strokeRect(40, 50, 190, 150); x.beginPath(); x.moveTo(135, 50); x.lineTo(135, 200); x.moveTo(40, 125); x.lineTo(230, 125); x.stroke();
      x.strokeStyle = '#c0392b'; x.beginPath(); x.moveTo(70, 180); x.lineTo(120, 140); x.lineTo(200, 80); x.stroke(); x.beginPath(); x.arc(200, 80, 10, 0, 7); x.stroke();
      x.fillStyle = '#2e7d32'; x.font = 'bold 24px Arial, sans-serif'; x.fillText('Lage heute', 270, 60); zeilen(x, w, 270, 86, 7, 200, 20, '#333');
    } else if (art === 'urkunden') {       // drei gerahmte Urkunden
      x.fillStyle = '#e9e4da'; x.fillRect(0, 0, B, H);
      for (let i = 0; i < 3; i++) { const px = 22 + i * 166; x.fillStyle = '#5a4632'; x.fillRect(px, 30, 140, 190); x.fillStyle = '#fbf6e4'; x.fillRect(px + 9, 39, 122, 172); x.fillStyle = '#b8894f'; x.beginPath(); x.arc(px + 70, 170, 16, 0, 7); x.fill(); zeilen(x, w, px + 24, 62, 6, 92, 14, '#7a6a55'); }
    } else if (art === 'fluchtplan') {       // Flucht- und Rettungsplan: grüner Rand, Grundriss
      x.fillStyle = '#fff'; x.fillRect(0, 0, B, H); x.strokeStyle = '#1e8a3c'; x.lineWidth = 14; x.strokeRect(7, 7, B - 14, H - 14); x.strokeStyle = '#333'; x.lineWidth = 3; x.strokeRect(60, 60, 390, 130); for (const px of [150, 250, 350]) { x.beginPath(); x.moveTo(px, 60); x.lineTo(px, 130); x.stroke(); }
      x.strokeStyle = '#1e8a3c'; x.lineWidth = 6; x.beginPath(); x.moveTo(100, 160); x.lineTo(420, 160); x.lineTo(420, 200); x.stroke(); x.fillStyle = '#1e8a3c'; x.font = 'bold 22px Arial, sans-serif'; x.fillText('Flucht- und Rettungsplan', 60, 44);
    } else if (art === 'foto') {       // Gruppenfoto der Dienstgruppe (nur Umrisse) im Rahmen
      x.fillStyle = '#3a2a1a'; x.fillRect(0, 0, B, H); x.fillStyle = '#b9cfe0'; x.fillRect(16, 16, B - 32, H - 32); x.fillStyle = '#7f9a6a'; x.fillRect(16, 170, B - 32, 70);
      for (let i = 0; i < 9; i++) kopf(x, 60 + i * 49, 118 + (i % 2) * 14, 13, i % 3 ? '#1b2a4a' : '#22335a');
    } else {       // Tafel: Streifenplan des Tages
      x.fillStyle = '#fbfbf7'; x.fillRect(0, 0, B, H); x.fillStyle = POLIZEIBLAU; x.font = 'bold 30px Arial, sans-serif'; x.fillText('STREIFENPLAN', 22, 40);
      x.font = '22px Arial, sans-serif'; ['Möwe 9   Stadtring', 'Möwe 12  Wall · Bahnhof', 'Möwe 14  Altstadt · Hafen'].forEach((t, i) => { x.fillStyle = i === 2 ? '#c0392b' : '#333'; x.fillText(t, 22, 86 + i * 38); });
      x.strokeStyle = '#2e7d32'; x.lineWidth = 4; x.beginPath(); x.moveTo(330, 200); x.lineTo(370, 120); x.lineTo(430, 150); x.lineTo(480, 70); x.stroke(); x.strokeRect(318, 60, 176, 160);
    }
  });
}
// Ein Schild mit Schrift (für Türschilder, Hinweise, Verkehrsschilder). zeilenText = eine oder zwei Zeilen.
function schildBild(text, grund = POLIZEIBLAU, schrift = '#ffffff', rand = null) {
  return male('schild' + text + grund + schrift + rand, 512, 256, (x, B, H) => {
    x.fillStyle = grund; x.fillRect(0, 0, B, H); if (rand) { x.strokeStyle = rand; x.lineWidth = 16; x.strokeRect(8, 8, B - 16, H - 16); }
    const z = text.split('|'); x.fillStyle = schrift; x.textAlign = 'center'; x.textBaseline = 'middle';
    z.forEach((t, i) => { let gr = z.length === 1 ? 120 : 84; x.font = `bold ${gr}px Arial, sans-serif`; while (x.measureText(t).width > B - 50 && gr > 20) { gr -= 6; x.font = `bold ${gr}px Arial, sans-serif`; } x.fillText(t, B / 2, H * (i + 0.5) / z.length + 4); });
  });
}
// Schrift direkt auf dem Boden (durchsichtiger Grund): POLIZEI, Platznummern …
function bodenSchrift(text, farbe = '#f2f2f2') {
  return male('bs' + text + farbe, 512, 128, (x, B, H) => { x.fillStyle = farbe; x.textAlign = 'center'; x.textBaseline = 'middle'; let gr = 110; x.font = `bold ${gr}px Arial, sans-serif`; while (x.measureText(text).width > B - 30) { gr -= 6; x.font = `bold ${gr}px Arial, sans-serif`; } x.fillText(text, B / 2, H / 2 + 6); });
}
// Schraffur (gelb oder weiß, schräg gestreift) für Sperrflächen
function schraffur(farbe) {
  const t = male('schraff' + farbe, 128, 128, (x) => { x.strokeStyle = farbe; x.lineWidth = 22; for (let i = -128; i < 256; i += 64) { x.beginPath(); x.moveTo(i, 128); x.lineTo(i + 128, 0); x.stroke(); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
// Gitter aus Stäben (für Zaun, Tor, Zwinger): durchsichtiges Bild mit senkrechten und waagerechten Linien
function gitterBild(farbe = '#3f4a52', eng = 8) {
  const t = male('gitter' + farbe + eng, 128, 128, (x) => { x.strokeStyle = farbe; x.lineWidth = 3; for (let i = 0; i < eng; i++) { const p = (i + 0.5) * 128 / eng; x.beginPath(); x.moveTo(p, 0); x.lineTo(p, 128); x.stroke(); } x.lineWidth = 5; for (const y of [10, 118]) { x.beginPath(); x.moveTo(0, y); x.lineTo(128, y); x.stroke(); } x.lineWidth = 3; x.beginPath(); x.moveTo(0, 64); x.lineTo(128, 64); x.stroke(); });
  t.wrapS = THREE.RepeatWrapping; return t;
}
// Ölflecken und Pfützen
function fleckBild(art) {
  return male('fleck' + art, 128, 128, (x) => { const w = zufall(art.length * 3); for (let i = 0; i < 7; i++) { const g = x.createRadialGradient(64, 64, 2, 64, 64, 60); const px = 40 + w() * 48, py = 40 + w() * 48, r = 14 + w() * 26;
    const gr = x.createRadialGradient(px, py, 1, px, py, r); gr.addColorStop(0, art === 'oel' ? 'rgba(15,15,18,0.55)' : 'rgba(40,50,60,0.5)'); gr.addColorStop(1, 'rgba(20,20,25,0)'); x.fillStyle = gr; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); void g; } });
}

// ---------------------------------------------------------------------------------------------
// Die Möbel und Sachen selbst
// ---------------------------------------------------------------------------------------------
export function moebelForm(q) {
  // Steht ein Möbel quer (um eine Vierteldrehung gedreht), sind seine Breite und Tiefe vertauscht: q.b und q.t gelten immer für den Raum.
  const quer = q.t !== undefined && q.h !== undefined && Math.abs(Math.sin(q.dreh || 0)) > 0.7;
  const g = new THREE.Group(), f = q.farbe || '#7a5a3a', b = (quer ? q.t : q.b) || 1, t = (quer ? q.b : q.t) || 1, h = q.h || 1;
  // Die Bausteine: K = Kiste, R = Rolle (achse: 'y' steht, 'x' oder 'z' liegt), S = Kugel, B = Bild (schaut nach +z), G = Glas, L = leuchtet
  const dazu = m => { m.castShadow = true; g.add(m); return m; };
  const K = (kb, kh, kt, x, y, z, farbe = f, extra) => { const k = new THREE.Mesh(new THREE.BoxGeometry(kb, kh, kt), mat(farbe, extra)); k.position.set(x, y, z); return dazu(k); };
  const R = (r, hoch, x, y, z, farbe = f, achse = 'y', r2 = r, seg = 14) => { const k = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, hoch, seg), mat(farbe)); if (achse === 'x') k.rotation.z = Math.PI / 2; if (achse === 'z') k.rotation.x = Math.PI / 2; k.position.set(x, y, z); return dazu(k); };
  const S = (r, x, y, z, farbe = f, sy = 1) => { const k = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), mat(farbe)); k.position.set(x, y, z); k.scale.y = sy; return dazu(k); };
  const B = (bild, bb, bh, x, y, z, extra = {}) => { const k = new THREE.Mesh(new THREE.PlaneGeometry(bb, bh), new THREE.MeshLambertMaterial({ map: bild, ...extra })); k.position.set(x, y, z); g.add(k); return k; };
  const BB = (bild, bb, bt, x, z, y = 0.03, extra = {}) => { const k = new THREE.Mesh(new THREE.PlaneGeometry(bb, bt).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: bild, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, ...extra })); k.position.set(x, y, z); k.renderOrder = 2; g.add(k); return k; };       // Bild flach auf dem Boden
  const G = (gb, gh, gt, x, y, z, farbe = '#bfe6ff', dicht = 0.3) => { const k = new THREE.Mesh(new THREE.BoxGeometry(gb, gh, gt), new THREE.MeshLambertMaterial({ color: farbe, transparent: true, opacity: dicht, depthWrite: false })); k.position.set(x, y, z); g.add(k); return k; };
  const L = (kb, kh, kt, x, y, z, farbe, leucht, stark = 0.8) => K(kb, kh, kt, x, y, z, farbe, { emissive: leucht, emissiveIntensity: stark });
  const beine = (bb, bt, hoch, dick, farbe, x0 = 0, z0 = 0) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) K(dick, hoch, dick, x0 + sx * (bb / 2 - dick), hoch / 2, z0 + sz * (bt / 2 - dick), farbe); };
  const bildschirm = (x, y, z, breit = 0.52, dreh = 0, bild = null) => { const s = new THREE.Group(); s.position.set(x, y, z); s.rotation.y = dreh; g.add(s); const k = (kb, kh, kt, px, py, pz, farbe, extra) => { const m = new THREE.Mesh(new THREE.BoxGeometry(kb, kh, kt), mat(farbe, extra)); m.position.set(px, py, pz); m.castShadow = true; s.add(m); };
    k(0.22, 0.02, 0.16, 0, 0.01, 0, SCHWARZ); k(0.04, 0.16, 0.03, 0, 0.09, -0.03, SCHWARZ); k(breit, breit * 0.6, 0.03, 0, 0.14 + breit * 0.3, 0, '#15181c');
    if (bild) { const p = new THREE.Mesh(new THREE.PlaneGeometry(breit - 0.04, breit * 0.6 - 0.04), new THREE.MeshBasicMaterial({ map: bild })); p.position.set(0, 0.14 + breit * 0.3, 0.017); s.add(p); }
    else k(breit - 0.05, breit * 0.6 - 0.05, 0.01, 0, 0.14 + breit * 0.3, 0.018, '#1c3a5e', { emissive: '#2f6fb5', emissiveIntensity: 0.7 }); };
  const stuhl = (x, z, dreh, farbe = '#34495e') => { const s = moebelForm({ form: 'stuhl', farbe }); s.position.set(x, 0, z); s.rotation.y = dreh; g.add(s); };
  const ordnerReihe = (x0, y, z, breit, saat = 1) => { const w = zufall(saat + y * 10 + x0); for (let x = x0; x < x0 + breit - 0.07; ) { const d = 0.055 + w() * 0.03; if (w() > 0.12) K(d - 0.008, 0.3 + w() * 0.03, 0.26, x + d / 2, y + 0.16, z, ORDNER[Math.floor(w() * ORDNER.length)]); x += d; } };
  const wandTafel = (art, breit, hoch = 1.3, rahmen = '#5a4632', y = 1.35) => { K(breit, hoch, 0.05, 0, y, 0, rahmen); B(wandBild(art), breit - 0.1, hoch - 0.1, 0, y, 0.03); };

  switch (q.form) {
    // ------------------------------------------------------------ Tische und Stühle
    case 'tisch': K(b, 0.05, t, 0, h - 0.025, 0); K(b - 0.3, 0.09, t - 0.3, 0, h - 0.095, 0, dunkel(f)); beine(b - 0.2, t - 0.2, h - 0.05, 0.07, q.bein || dunkel(f, 0.6)); break;
    case 'stuhl': { const st = q.farbe || '#34495e'; K(0.44, 0.06, 0.44, 0, 0.46, 0, st); K(0.44, 0.38, 0.05, 0, 0.76, -0.2, st); K(0.04, 0.3, 0.04, -0.18, 0.6, -0.2, SCHWARZ); K(0.04, 0.3, 0.04, 0.18, 0.6, -0.2, SCHWARZ); beine(0.44, 0.44, 0.44, 0.035, SCHWARZ); break; }
    case 'drehstuhl': { const st = q.farbe || '#2b3440';       // Bürostuhl: Fußkreuz, Säule, Sitz, Lehne, Armlehnen
      for (let i = 0; i < 5; i++) { const a = i * 1.257; const k = K(0.05, 0.035, 0.3, Math.sin(a) * 0.15, 0.06, Math.cos(a) * 0.15, SCHWARZ); k.rotation.y = a; R(0.035, 0.05, Math.sin(a) * 0.29, 0.03, Math.cos(a) * 0.29, '#111'); }
      R(0.03, 0.34, 0, 0.25, 0, CHROM); K(0.48, 0.08, 0.46, 0, 0.47, 0, st); K(0.44, 0.52, 0.07, 0, 0.83, -0.22, st).rotation.x = -0.1; K(0.06, 0.2, 0.05, 0, 0.56, -0.23, SCHWARZ);
      for (const sx of [-1, 1]) { K(0.05, 0.03, 0.28, sx * 0.27, 0.68, 0, SCHWARZ); K(0.03, 0.2, 0.03, sx * 0.27, 0.58, 0.02, SCHWARZ); } break; }
    case 'stuhlreihe': { const n = Math.max(2, Math.round(b / 0.55)), w = b / n;       // Wartestühle auf einem Träger
      K(b - 0.1, 0.05, 0.08, 0, 0.36, 0, STAHL); for (const sx of [-1, 1]) { K(0.05, 0.36, 0.05, sx * (b / 2 - 0.2), 0.18, 0, STAHL); K(0.06, 0.03, 0.5, sx * (b / 2 - 0.2), 0.015, 0, STAHL); }
      for (let i = 0; i < n; i++) { const x = -b / 2 + w * (i + 0.5); K(w - 0.08, 0.05, 0.44, x, 0.44, 0.03, f); K(w - 0.08, 0.4, 0.05, x, 0.72, -0.2, f).rotation.x = -0.12; } break; }
    case 'hocker': R(0.17, 0.05, 0, 0.44, 0, f); R(0.025, 0.42, 0, 0.21, 0, CHROM); R(0.16, 0.02, 0, 0.01, 0, CHROM); break;
    case 'arbeitsplatz': {       // Schreibtisch mit Rechner: Man sitzt bei +z und schaut nach −z auf den Bildschirm
      const hh = 0.74, holz = q.platte || '#d8cfbd';
      K(b, 0.04, t, 0, hh - 0.02, 0, holz); for (const sx of [-1, 1]) K(0.04, hh - 0.04, t - 0.08, sx * (b / 2 - 0.05), (hh - 0.04) / 2, 0, STAHL); K(b - 0.12, 0.36, 0.03, 0, hh - 0.24, -t / 2 + 0.08, STAHL);
      K(0.42, 0.56, 0.52, b / 2 - 0.3, 0.3, 0.02, '#6f777f'); for (let i = 0; i < 3; i++) { K(0.38, 0.15, 0.02, b / 2 - 0.3, 0.12 + i * 0.18, 0.285, '#868e96'); K(0.14, 0.02, 0.02, b / 2 - 0.3, 0.17 + i * 0.18, 0.3, SCHWARZ); }
      K(0.18, 0.42, 0.42, -b / 2 + 0.22, 0.23, -0.05, SCHWARZ); L(0.02, 0.02, 0.01, -b / 2 + 0.22, 0.38, 0.165, '#2ecc71', '#2ecc71', 1.5);       // Rechner unter dem Tisch
      if (q.zwei) { bildschirm(-0.28, hh, -t / 2 + 0.2, 0.52, 0.22, q.bild ? wandBild(q.bild) : null); bildschirm(0.28, hh, -t / 2 + 0.2, 0.52, -0.22); } else bildschirm(0, hh, -t / 2 + 0.2, 0.56);
      K(0.42, 0.02, 0.14, 0, hh + 0.01, 0.08, SCHWARZ); K(0.06, 0.025, 0.1, 0.32, hh + 0.012, 0.1, SCHWARZ); K(0.24, 0.004, 0.2, 0.32, hh + 0.002, 0.1, '#3a4048');
      K(0.17, 0.05, 0.21, -b / 2 + 0.24, hh + 0.025, 0.02, '#2b2f33'); K(0.05, 0.035, 0.2, -b / 2 + 0.19, hh + 0.065, 0.02, SCHWARZ);       // Telefon mit Hörer
      const w = zufall(Math.round((q.x || 0) * 3 + (q.z || 0) * 7)); for (let i = 0; i < 3; i++) K(0.21, 0.008, 0.3, b / 2 - 0.34 + w() * 0.05, hh + 0.004 + i * 0.008, 0.02 + w() * 0.05, i === 1 ? '#fff6c2' : '#ffffff').rotation.y = (w() - 0.5) * 0.5;
      R(0.04, 0.09, -0.42, hh + 0.045, 0.16, [POLIZEIBLAU, '#b02a25', '#f2f2ee', '#2e7d32'][Math.floor(w() * 4)]); K(0.24, 0.07, 0.3, b / 2 - 0.28, hh + 0.035, -0.2, '#2b2f33');       // Tasse, Ablagekorb
      break; }
    case 'tischgruppe': {       // Tisch mit Stühlen rundherum (Pausenraum)
      K(b, 0.05, t, 0, h - 0.025, 0); K(b - 0.3, 0.08, t - 0.3, 0, h - 0.09, 0, dunkel(f)); beine(b - 0.16, t - 0.16, h - 0.05, 0.06, STAHL);
      const n = Math.max(1, Math.round(b / 0.7)); for (let i = 0; i < n; i++) { const x = -b / 2 + (i + 0.5) * b / n; stuhl(x, t / 2 + 0.28, Math.PI, q.stuhl); stuhl(x + 0.04, -t / 2 - 0.3, 0.1, q.stuhl); }
      R(0.05, 0.2, 0.2, h + 0.1, 0.05, '#2e7d32'); R(0.035, 0.08, -0.25, h + 0.04, 0.12, WEISS); R(0.035, 0.08, 0.5, h + 0.04, -0.15, POLIZEIBLAU); K(0.3, 0.012, 0.22, -0.55, h + 0.006, -0.1, '#e9e2cf').rotation.y = 0.4; K(0.2, 0.05, 0.14, 0.0, h + 0.025, -0.2, '#b8894f'); break; }

    // ------------------------------------------------------------ Schränke, Regale, Spinde
    case 'spinde': { const n = Math.max(1, Math.round(b / 0.5)), breit = b / n; K(b, h, t, 0, h / 2, 0, dunkel(f, 0.8)); K(b + 0.02, 0.08, t + 0.02, 0, 0.04, 0, SCHWARZ);
      for (let i = 0; i < n; i++) { const x = -b / 2 + breit * (i + 0.5); K(breit - 0.04, h - 0.14, 0.02, x, h / 2 + 0.03, t / 2 + 0.005);
        for (const y of [h - 0.22, h - 0.28, h - 0.34]) K(breit * 0.5, 0.02, 0.01, x, y, t / 2 + 0.02, '#263238'); K(0.03, 0.12, 0.03, x + breit * 0.3, h * 0.55, t / 2 + 0.03, CHROM); K(0.12, 0.05, 0.005, x, h - 0.46, t / 2 + 0.018, WEISS); }
      const w = zufall(Math.round(b * 10)); for (let i = 0; i < n; i += 2) K(0.3, 0.14 + w() * 0.1, 0.4, -b / 2 + breit * (i + 0.5), h + 0.1, 0, ['#1b2a4a', '#5a4632', '#3d4650'][i % 3]);       // Taschen und Kartons obendrauf
      break; }
    case 'akten': { K(b, h, t, 0, h / 2, 0, f); const n = Math.max(2, Math.round(h / 0.36)); for (let i = 0; i < n; i++) { const y = (i + 0.5) * h / n; K(b - 0.06, h / n - 0.04, 0.02, 0, y, t / 2 + 0.005, dunkel(f, 1.15)); K(b * 0.3, 0.025, 0.03, 0, y + 0.04, t / 2 + 0.025, '#2b2f33'); K(0.1, 0.05, 0.005, 0, y - 0.05, t / 2 + 0.018, WEISS); }
      K(0.3, 0.2, 0.25, -b / 4, h + 0.1, 0, '#b98a55'); break; }
    case 'regal': {       // offenes Regal mit Ordnern
      const n = Math.max(2, Math.round(h / 0.4)); for (const sx of [-1, 1]) K(0.03, h, t, sx * (b / 2 - 0.015), h / 2, 0, f); K(b, h, 0.02, 0, h / 2, -t / 2 + 0.01, dunkel(f));
      for (let i = 0; i <= n; i++) { const y = 0.04 + i * (h - 0.06) / n; K(b - 0.04, 0.03, t, 0, y, 0, f); if (i < n) { if (q.inhalt === 'kisten') { const w = zufall(i + b); for (let x = -b / 2 + 0.25; x < b / 2 - 0.2; x += 0.42) K(0.34, 0.2 + w() * 0.08, t - 0.1, x, y + 0.13, 0, ['#b98a55', '#6b6f75', '#3d5a3a', '#b98a55'][Math.floor(w() * 4)]); } else ordnerReihe(-b / 2 + 0.05, y, 0, b - 0.08, i + 1); } } break; }
    case 'sideboard': K(b, h, t, 0, h / 2 + 0.04, 0, f); K(b + 0.04, 0.03, t + 0.04, 0, h + 0.055, 0, dunkel(f, 0.7)); for (let x = -b / 2; x < b / 2 - 0.1; x += b / Math.max(2, Math.round(b / 0.6))) { K(0.015, h - 0.08, 0.01, x + 0.01, h / 2 + 0.04, t / 2 + 0.005, dunkel(f, 0.6)); K(0.02, 0.12, 0.02, x + 0.1, h / 2 + 0.1, t / 2 + 0.015, CHROM); } beine(b - 0.1, t - 0.1, 0.06, 0.05, SCHWARZ); break;
    case 'postfach': {       // Postfächer der Kollegen: viele kleine Fächer
      K(b, h, t, 0, h / 2 + 0.7, 0, '#d8cfbd'); const nx = Math.round(b / 0.28), ny = Math.round(h / 0.2), w = zufall(7);
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const x = -b / 2 + (i + 0.5) * b / nx, y = 0.7 + (j + 0.5) * h / ny; K(b / nx - 0.03, h / ny - 0.03, 0.02, x, y, t / 2 - 0.02, '#3a2f25'); if (w() > 0.45) K(b / nx - 0.08, 0.02 + w() * 0.05, 0.05, x, y - h / ny / 2 + 0.05, t / 2, w() > 0.5 ? WEISS : '#e8d9a8'); } break; }

    // ------------------------------------------------------------ Theken und Tresen
    case 'theke': K(b, h - 0.06, t, 0, (h - 0.06) / 2, 0); K(b + 0.12, 0.06, t + 0.12, 0, h - 0.03, 0, dunkel(f, 0.6)); K(b - 0.1, 0.1, t - 0.1, 0, 0.05, 0, '#2b2b2b'); break;
    case 'tresen': {       // Wachtresen: vorn (bei +z) stehen die Bürger. Hohe Front, dahinter die Arbeitsplatte, obendrauf eine Glasscheibe mit Durchreiche
      K(b, 1.08, 0.12, 0, 0.54, t / 2 - 0.06, f); K(b, 0.05, 0.34, 0, 1.105, t / 2 - 0.1, dunkel(f, 0.55)); K(b, 0.04, t - 0.1, 0, 0.76, -0.05, '#d8cfbd'); K(b - 0.1, 0.1, 0.06, 0, 0.05, t / 2 - 0.02, SCHWARZ);
      for (let x = -b / 2 + 0.03; x <= b / 2; x += (b - 0.06) / Math.max(1, Math.round(b / 1.6))) K(0.05, 0.72, t - 0.14, Math.min(x, b / 2 - 0.03), 0.38, -0.07, dunkel(f, 0.8));
      K(b * 0.5, 0.2, 0.01, 0, 0.6, t / 2 + 0.005, POLIZEIBLAU); B(schildBild('POLIZEI'), b * 0.3, 0.16, 0, 0.6, t / 2 + 0.012);
      const n = Math.max(1, Math.round(b / 1.5)); for (let i = 0; i < n; i++) { const x = -b / 2 + (i + 0.5) * b / n, gb = b / n - 0.12; G(gb, 0.62, 0.02, x, 1.5, t / 2 - 0.1, '#cfeeff', 0.28); K(0.04, 0.72, 0.04, x - gb / 2 - 0.03, 1.49, t / 2 - 0.1, STAHL); K(gb * 0.4, 0.02, 0.2, x, 1.14, t / 2 - 0.1, CHROM); }
      K(0.04, 0.72, 0.04, b / 2 - 0.02, 1.49, t / 2 - 0.1, STAHL); K(b, 0.04, 0.05, 0, 1.83, t / 2 - 0.1, STAHL); break; }
    case 'ausgabe': {       // Ausgabe der Waffenkammer: Tresen mit Gitter darüber. Vorn (bei +z) steht, wer etwas abholt
      K(b, 1.0, t, 0, 0.5, 0, f); K(b + 0.06, 0.05, t + 0.14, 0, 1.025, 0, dunkel(f, 0.55)); K(b - 0.06, 0.1, t + 0.02, 0, 0.05, 0, SCHWARZ);
      for (let x = -b / 2 + 0.04; x <= b / 2 - 0.03; x += 0.16) if (Math.abs(x) > 0.5) K(0.025, 0.75, 0.025, x, 1.42, 0, '#3b4148'); for (const sx of [-1, 1]) K(0.05, 0.78, 0.05, sx * 0.5, 1.44, 0, '#3b4148');
      K(b, 0.05, 0.05, 0, 1.81, 0, '#3b4148'); K(1.0, 0.05, 0.05, 0, 1.45, 0, '#3b4148'); for (let x = -0.42; x < 0.45; x += 0.16) K(0.025, 0.34, 0.025, x, 1.63, 0, '#3b4148'); K(0.3, 0.02, 0.42, -0.2, 1.06, 0.02, '#e9e2cf'); K(0.02, 0.02, 0.14, 0.05, 1.07, 0.05, POLIZEIBLAU); break; }

    // ------------------------------------------------------------ An der Wand
    case 'tafel': wandTafel('tafel', b, 1.3, '#b9bec4', 1.45); K(b * 0.6, 0.03, 0.09, 0, 0.8, 0.06, '#9aa0a6'); for (const [x, c] of [[-0.2, '#c0392b'], [0, POLIZEIBLAU], [0.2, '#2e7d32']]) K(0.12, 0.025, 0.025, x, 0.83, 0.07, c); break;
    case 'plan': case 'pinn': wandTafel(q.form, b); break;
    case 'bild': wandTafel(q.bild || 'foto', b, q.h || 0.9, q.rahmen || '#b9bec4', q.y || 1.35); break;       // irgendein gemaltes Bild an der Wand (q.bild = Name in wandBild)
    case 'schild': K(b, q.h || 0.3, 0.03, 0, q.y || 1.75, 0, q.rahmen || '#e8e8e8'); B(schildBild(q.text || 'POLIZEI', q.farbe || POLIZEIBLAU, q.schrift || '#fff', q.rand), b - 0.04, (q.h || 0.3) - 0.04, 0, q.y || 1.75, 0.02); break;
    case 'uhr': R(0.17, 0.04, 0, 1.75, 0, SCHWARZ, 'z', 0.17, 20); R(0.15, 0.045, 0, 1.75, 0, WEISS, 'z', 0.15, 20); K(0.015, 0.11, 0.01, 0, 1.79, 0.025, SCHWARZ); K(0.08, 0.015, 0.01, 0.03, 1.75, 0.025, SCHWARZ); break;
    case 'spiegel': K(b, 1.0, 0.06, 0, 1.25, 0, '#2b2f33'); K(b - 0.12, 0.88, 0.02, 0, 1.25, 0.03, '#39485a', { emissive: '#27384d', emissiveIntensity: 0.6 }); break;       // die verspiegelte Scheibe im Vernehmungsraum
    case 'feuerloescher': R(0.075, 0.42, 0, 0.62, 0.1, '#c62828'); R(0.03, 0.08, 0, 0.87, 0.1, SCHWARZ); K(0.1, 0.03, 0.03, 0.03, 0.9, 0.1, SCHWARZ); K(0.2, 0.2, 0.01, 0, 1.45, 0.012, '#c62828'); K(0.1, 0.12, 0.012, 0, 1.45, 0.014, WEISS); break;
    case 'haken': { K(b, 0.1, 0.03, 0, 1.6, 0, '#7a5a3a'); const n = Math.round(b / 0.3), far = q.sachen || ['#1b2a4a', '#d8ee2a', '#1b2a4a', '#3d4650', '#d8ee2a', '#1b2a4a']; for (let i = 0; i < n; i++) { const x = -b / 2 + (i + 0.5) * b / n; K(0.03, 0.04, 0.09, x, 1.6, 0.05, CHROM); if (i % 3 !== 2) { K(0.36, 0.62, 0.1, x, 1.24, 0.09, far[i % far.length]); if (far[i % far.length] === '#d8ee2a') K(0.365, 0.05, 0.105, x, 1.15, 0.09, '#c8c8c8'); } } break; }       // Garderobe mit Jacken und Warnwesten
    case 'handtuch': K(0.3, 0.38, 0.14, 0, 1.3, 0.07, WEISS); K(0.2, 0.1, 0.01, 0, 1.09, 0.08, '#e8f0e8'); K(0.3, 0.42, 0.24, 0, 0.21, 0.14, STAHL); break;
    case 'schluessel': K(0.6, 0.5, 0.08, 0, 1.4, 0.04, '#6f777f'); K(0.56, 0.46, 0.01, 0, 1.4, 0.085, '#252a30'); { const w = zufall(3); for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) if (w() > 0.2) { K(0.03, 0.06, 0.01, -0.2 + i * 0.1, 1.5 - j * 0.13, 0.095, ['#d9a521', CHROM, '#b02a25'][Math.floor(w() * 3)]); } } break;
    case 'funklader': K(b, 0.04, 0.24, 0, 1.0, 0.12, STAHL); for (let x = -b / 2 + 0.1; x < b / 2 - 0.05; x += 0.14) { K(0.1, 0.05, 0.12, x, 1.045, 0.12, SCHWARZ); K(0.06, 0.16, 0.035, x, 1.15, 0.12, '#15181c'); K(0.012, 0.09, 0.012, x + 0.02, 1.27, 0.12, SCHWARZ); L(0.014, 0.014, 0.01, x - 0.03, 1.05, 0.185, '#2ecc71', '#2ecc71', 2); } break;

    // ------------------------------------------------------------ Geräte
    case 'automat': K(b, h, t, 0, h / 2, 0, f); L(b - 0.14, h * 0.55, 0.02, 0, h * 0.62, t / 2 + 0.005, '#dff3ff', '#7fb8d8', 0.5); K(b - 0.3, 0.16, 0.03, 0, 0.3, t / 2 + 0.01, '#15181c');
      for (let i = 0; i < 3; i++) for (let k = 0; k < 4; k++) K(0.09, 0.16, 0.02, -b / 2 + 0.2 + k * (b - 0.4) / 3, h * 0.44 + i * 0.26, t / 2 + 0.02, ['#d23a2a', '#f0ad4e', '#2e7d32', '#1d6fd6'][(i + k) % 4]); break;
    case 'monitor': bildschirm(0, 0, 0, 0.52, 0, q.bild ? wandBild(q.bild) : null); break;
    case 'tastatur': K(0.42, 0.02, 0.14, 0, 0.01, 0, SCHWARZ); K(0.06, 0.025, 0.1, 0.34, 0.012, 0.02, SCHWARZ); break;       // Tastatur und Maus
    case 'kaffee': K(0.3, 0.38, 0.3, 0, 0.19, 0, '#2b2f33'); K(0.2, 0.05, 0.12, 0, 0.26, 0.17, '#9aa0a6'); R(0.04, 0.09, 0, 0.045, 0.2, WEISS); L(0.03, 0.03, 0.01, 0.1, 0.33, 0.155, '#e74c3c', '#e74c3c', 1.5); break;
    case 'kopierer': K(0.62, 0.7, 0.6, 0, 0.35, 0, '#d9dcdf'); K(0.66, 0.2, 0.62, 0, 0.8, 0, '#eceff1'); K(0.6, 0.05, 0.5, 0, 0.925, -0.03, '#cfd4d8'); K(0.2, 0.02, 0.1, 0.18, 0.905, 0.25, '#22262b'); L(0.08, 0.015, 0.05, 0.18, 0.918, 0.25, '#7fd0ff', '#7fd0ff', 1); K(0.5, 0.02, 0.3, -0.5, 0.62, 0, '#eceff1'); K(0.3, 0.01, 0.21, -0.5, 0.635, 0, WEISS);
      for (let i = 0; i < 2; i++) K(0.56, 0.02, 0.02, 0, 0.2 + i * 0.25, 0.305, '#9aa0a6'); break;
    case 'wasserspender': K(0.34, 0.95, 0.34, 0, 0.475, 0, WEISS); K(0.3, 0.2, 0.02, 0, 0.7, 0.172, '#cfd4d8'); R(0.13, 0.36, 0, 1.15, 0, '#8fc7ea', 'y', 0.13); R(0.06, 0.06, 0, 0.98, 0, '#8fc7ea'); K(0.03, 0.03, 0.03, -0.06, 0.76, 0.19, '#1d6fd6'); K(0.03, 0.03, 0.03, 0.06, 0.76, 0.19, '#c62828'); break;
    case 'kuehlschrank': K(b, h, t, 0, h / 2, 0, f); K(b - 0.03, h * 0.62, 0.02, 0, h * 0.67, t / 2 + 0.005, dunkel(f, 1.06)); K(b - 0.03, h * 0.32, 0.02, 0, h * 0.17, t / 2 + 0.005, dunkel(f, 1.06)); K(0.03, 0.4, 0.04, -b / 2 + 0.08, h * 0.62, t / 2 + 0.03, CHROM); K(0.03, 0.22, 0.04, -b / 2 + 0.08, h * 0.24, t / 2 + 0.03, CHROM);
      K(0.12, 0.1, 0.005, 0.08, h * 0.8, t / 2 + 0.017, '#fff2a8'); K(0.1, 0.13, 0.005, 0.02, h * 0.62, t / 2 + 0.017, '#cfe6ff'); K(0.05, 0.05, 0.008, 0.16, h * 0.7, t / 2 + 0.018, '#c62828'); break;
    case 'kueche': {       // Küchenzeile: Unterschränke, Arbeitsplatte, Spüle, Herd, Kaffeemaschine, Mikrowelle, Wasserkocher
      K(b, 0.84, t, 0, 0.5, 0, f); K(b, 0.08, t - 0.06, 0, 0.04, -0.03, SCHWARZ); K(b + 0.02, 0.04, t + 0.04, 0, 0.94, 0.01, '#4a4f57');
      const n = Math.max(2, Math.round(b / 0.6)); for (let i = 0; i < n; i++) { const x = -b / 2 + (i + 0.5) * b / n; K(b / n - 0.03, 0.78, 0.015, x, 0.51, t / 2 + 0.006, dunkel(f, 1.08)); K(b / n * 0.5, 0.02, 0.025, x, 0.84, t / 2 + 0.02, CHROM); }
      K(0.5, 0.02, 0.4, -b / 2 + 0.55, 0.955, 0, CHROM); K(0.38, 0.03, 0.3, -b / 2 + 0.5, 0.95, 0, '#7d858d'); R(0.015, 0.2, -b / 2 + 0.5, 1.06, -0.19, CHROM); K(0.03, 0.03, 0.14, -b / 2 + 0.5, 1.16, -0.13, CHROM);       // Spüle mit Hahn
      K(0.56, 0.012, 0.5, 0.15, 0.967, 0, '#15181c'); for (const [px, pz] of [[-0.13, -0.12], [0.13, -0.12], [-0.13, 0.12], [0.13, 0.12]]) R(0.085, 0.006, 0.15 + px, 0.976, pz, '#3a3f45', 'y', 0.085, 18);       // Herd
      K(0.5, 0.3, 0.36, b / 2 - 0.35, 1.11, -0.05, '#e6e8ea'); K(0.34, 0.22, 0.01, b / 2 - 0.42, 1.11, 0.135, '#15181c'); K(0.1, 0.22, 0.01, b / 2 - 0.16, 1.11, 0.135, '#3a3f45');       // Mikrowelle
      K(0.24, 0.34, 0.26, b / 2 - 0.85, 1.13, -0.08, '#2b2f33'); R(0.07, 0.14, b / 2 - 0.85, 1.03, 0.02, '#cfe6ff'); L(0.03, 0.03, 0.01, b / 2 - 0.78, 1.25, 0.055, '#e74c3c', '#e74c3c', 1.5);       // Kaffeemaschine mit Kanne
      R(0.07, 0.2, -b / 2 + 1.0, 1.06, -0.1, WEISS); for (let i = 0; i < 4; i++) R(0.04, 0.09, -b / 2 + 1.18 + i * 0.1, 1.005, 0.12 - (i % 2) * 0.12, [POLIZEIBLAU, WEISS, '#b02a25', '#f0ad4e'][i]);       // Wasserkocher, Tassen
      K(b, 0.5, 0.02, 0, 1.21, -t / 2 + 0.01, '#e6ebe6'); K(b * 0.5, 0.03, 0.18, b * 0.2, 1.42, -t / 2 + 0.1, f); for (let i = 0; i < 5; i++) R(0.035, 0.12, b * 0.02 + i * 0.11, 1.5, -t / 2 + 0.1, ['#d9a521', '#7a3a2c', '#2e7d32', WEISS, '#b02a25'][i]); break; }
    case 'kicker': {       // Tischkicker im Pausenraum
      K(1.4, 0.3, 0.76, 0, 0.78, 0, '#7a4a2a'); K(1.3, 0.02, 0.66, 0, 0.92, 0, '#2e7d32'); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K(0.09, 0.66, 0.09, sx * 0.62, 0.33, sz * 0.3, '#3a2a1a');
      for (let i = 0; i < 8; i++) { const x = -0.56 + i * 0.16, rot = [0, 0, 1, 0, 1, 0, 1, 1][i]; R(0.012, 1.2, x, 1.0, 0, CHROM, 'z'); R(0.025, 0.12, x, 1.0, rot ? 0.64 : -0.64, SCHWARZ, 'z'); const n = [1, 2, 3, 5, 5, 3, 2, 1][i]; for (let k = 0; k < n; k++) K(0.03, 0.1, 0.04, x, 0.97, (k - (n - 1) / 2) * 0.6 / Math.max(1, n - 1 || 1) * (n > 1 ? 1 : 0), rot ? '#c62828' : POLIZEIBLAU); }
      K(1.4, 0.06, 0.05, 0, 0.95, 0.38, '#5a3520'); K(1.4, 0.06, 0.05, 0, 0.95, -0.38, '#5a3520'); break; }
    case 'tv': K(b, 0.42, 0.4, 0, 0.21, 0, '#3a2f25'); K(1.1, 0.64, 0.05, 0, 0.84, -0.05, '#111417'); L(1.04, 0.58, 0.01, 0, 0.84, -0.02, '#27425e', '#3f79b8', 0.7); K(0.3, 0.04, 0.2, 0, 0.44, -0.05, SCHWARZ); K(0.3, 0.06, 0.2, b / 2 - 0.3, 0.45, 0, '#22262b'); break;
    case 'teppich': K(b, 0.015, t, 0, 0.012, 0, f).castShadow = false; K(b - 0.3, 0.016, t - 0.3, 0, 0.013, 0, dunkel(f, 1.18)).castShadow = false; break;
    case 'stehlampe': R(0.16, 0.03, 0, 0.015, 0, SCHWARZ); R(0.015, 1.5, 0, 0.77, 0, CHROM); { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.26, 16, 1, true), new THREE.MeshLambertMaterial({ color: '#fff3cf', emissive: '#ffd98a', emissiveIntensity: 0.9, side: THREE.DoubleSide })); s.position.y = 1.62; g.add(s); } break;
    case 'flagge': {       // Fahne am Ständer: die blau-weiße Stadtfahne mit gelbem Streifen
      R(0.16, 0.04, 0, 0.02, 0, '#b8894f'); R(0.018, 2.1, 0, 1.07, 0, '#b8894f'); S(0.035, 0, 2.14, 0, '#d9a521'); const far = q.farben || [POLIZEIBLAU, WEISS, POLIZEIBLAU]; far.forEach((c, i) => K(0.28, 0.8, 0.03, 0.17 + i * 0.012, 1.66, 0, c).scale.set(1, 1, 1)); far.forEach((c, i) => { const k = K(0.56 / 3, 0.9, 0.022, 0.12 + i * 0.56 / 3, 1.6 - i * 0.03, 0.01 * i, c); k.rotation.z = -0.06; }); break; }
    case 'garderobe': R(0.2, 0.03, 0, 0.015, 0, SCHWARZ); R(0.02, 1.75, 0, 0.9, 0, SCHWARZ); for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4; K(0.02, 0.02, 0.2, Math.sin(a) * 0.1, 1.72, Math.cos(a) * 0.1, SCHWARZ).rotation.y = a; } K(0.34, 0.7, 0.12, 0.12, 1.32, 0.08, '#1b2a4a'); S(0.12, -0.02, 1.84, -0.02, WEISS, 0.5); R(0.12, 0.02, -0.02, 1.8, 0.08, '#1b2a4a'); break;
    case 'papierkorb': R(0.13, 0.3, 0, 0.15, 0, f === '#7a5a3a' ? '#3a3f45' : f, 'y', 0.16); R(0.14, 0.02, 0, 0.3, 0, WEISS, 'y', 0.14); break;
    case 'flipchart': for (const [sx, sz] of [[-0.3, 0.25], [0.3, 0.25], [0, -0.3]]) { const k = K(0.03, 1.8, 0.03, sx * 0.9, 0.9, sz * 0.8, STAHL); k.rotation.x = -sz * 0.35; k.rotation.z = sx * 0.2; } K(0.7, 0.95, 0.03, 0, 1.4, 0.06, WEISS).rotation.x = -0.12; K(0.5, 0.012, 0.04, 0, 1.6, 0.11, POLIZEIBLAU); K(0.42, 0.012, 0.04, -0.04, 1.48, 0.1, '#333'); K(0.46, 0.012, 0.04, -0.02, 1.38, 0.09, '#333'); K(0.3, 0.012, 0.04, -0.1, 1.28, 0.08, '#c0392b'); break;
    case 'hundekorb': R(0.42, 0.16, 0, 0.08, 0, '#7a5a3a', 'y', 0.46, 18); R(0.34, 0.1, 0, 0.14, 0, '#b02a25', 'y', 0.36, 18); R(0.11, 0.06, 0.62, 0.03, 0.1, CHROM, 'y', 0.09); R(0.11, 0.06, 0.62, 0.03, -0.18, CHROM, 'y', 0.09); R(0.08, 0.01, 0.62, 0.062, 0.1, '#8fc7ea'); S(0.06, -0.55, 0.06, 0.2, '#d8ee2a'); break;

    // ------------------------------------------------------------ Gewahrsam
    case 'pritsche': {       // Liege in der Zelle: gemauerter Sockel, blaue Matratze, graue Decke
      K(b, 0.42, t, 0, 0.21, 0, '#cfcabd'); K(b - 0.06, 0.1, t - 0.06, 0, 0.47, 0, '#2f5f8f'); K(b * 0.34, 0.07, t - 0.1, -b / 2 + b * 0.19, 0.55, 0, '#8d9299'); K(b * 0.2, 0.09, t - 0.16, b / 2 - b * 0.13, 0.55, 0, '#e9e6dc'); break; }
    case 'zellenwc': {       // WC und Waschbecken aus Edelstahl in einem Stück, dahinter eine halbhohe Schamwand
      K(0.42, 0.4, 0.5, 0, 0.2, 0.05, CHROM); R(0.17, 0.03, 0, 0.41, 0.08, '#aab0b6', 'y', 0.17, 16); R(0.12, 0.031, 0, 0.412, 0.08, '#5d646b', 'y', 0.12, 16); K(0.5, 0.95, 0.2, 0, 0.475, -0.25, CHROM); K(0.36, 0.1, 0.3, 0, 0.9, -0.06, CHROM); R(0.1, 0.02, 0, 0.955, -0.05, '#5d646b', 'y', 0.1, 16); R(0.02, 0.03, 0.2, 0.8, -0.14, '#6f777f', 'z'); break; }
    case 'effekten': {       // Schließfächer für die Sachen der Festgenommenen: viele kleine Türen mit Nummern
      K(b, h, t, 0, h / 2 + 0.1, 0, '#5d646b'); K(b, 0.1, t - 0.04, 0, 0.05, 0, SCHWARZ); const nx = Math.round(b / 0.4), ny = Math.round(h / 0.4);
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const x = -b / 2 + (i + 0.5) * b / nx, y = 0.1 + (j + 0.5) * h / ny; K(b / nx - 0.03, h / ny - 0.03, 0.02, x, y, t / 2 + 0.005, '#7d858d'); K(0.03, 0.05, 0.02, x + b / nx * 0.3, y, t / 2 + 0.02, '#d9a521'); K(0.1, 0.06, 0.005, x - 0.05, y + 0.08, t / 2 + 0.017, WEISS); } break; }
    case 'fingerabdruck': {       // Tisch mit dem Gerät für Fingerabdrücke (grüne Glasplatte) und Bildschirm
      K(b, 0.04, t, 0, 0.92, 0, '#d8cfbd'); K(b - 0.1, 0.88, t - 0.1, 0, 0.46, 0, '#6f777f'); K(0.36, 0.1, 0.3, -b / 2 + 0.32, 0.99, 0.03, '#2b2f33'); L(0.2, 0.01, 0.16, -b / 2 + 0.32, 1.045, 0.03, '#49d98a', '#2ecc71', 1.2); bildschirm(b / 2 - 0.4, 0.94, -t / 2 + 0.16, 0.46, -0.2);
      K(0.3, 0.02, 0.12, b / 2 - 0.42, 0.95, 0.12, SCHWARZ); K(0.12, 0.04, 0.18, 0.02, 0.96, 0.1, '#e9e2cf'); R(0.03, 0.1, 0.02, 0.99, -0.12, '#1d3f8a'); break; }
    case 'fotostativ': for (let i = 0; i < 3; i++) { const a = i * 2.094; const k = K(0.025, 1.35, 0.025, Math.sin(a) * 0.22, 0.66, Math.cos(a) * 0.22, SCHWARZ); k.rotation.z = -Math.sin(a) * 0.33; k.rotation.x = Math.cos(a) * 0.33; } K(0.16, 0.11, 0.1, 0, 1.4, 0, '#15181c'); R(0.04, 0.09, 0, 1.4, 0.09, '#22262b', 'z'); K(0.06, 0.03, 0.04, 0, 1.47, 0, '#3a3f45'); break;
    case 'sitzbank': K(b, 0.06, t, 0, 0.45, 0, f); K(b, 0.34, 0.05, 0, 0.72, -t / 2 + 0.025, f); for (const sx of [-1, 1]) K(0.06, 0.45, t - 0.06, sx * (b / 2 - 0.15), 0.225, 0, STAHL); R(0.012, b * 0.6, 0, 0.36, t / 2 - 0.04, CHROM, 'x'); break;       // festgeschraubte Bank mit Stange für die Handschellen
    case 'aufnahme': {       // Rekorder und Mikrofon für den Vernehmungstisch
      K(0.26, 0.06, 0.18, 0, 0.03, 0, '#2b2f33'); L(0.03, 0.012, 0.03, 0.08, 0.066, 0.04, '#e74c3c', '#e74c3c', 2); R(0.012, 0.16, -0.24, 0.08, 0.05, SCHWARZ); S(0.03, -0.24, 0.17, 0.05, '#3a3f45'); R(0.05, 0.012, -0.24, 0.006, 0.05, SCHWARZ); break; }

    // ------------------------------------------------------------ Waschraum
    case 'dusche': {       // Duschkabinen nebeneinander: Trennwände, Wanne, Brause, Glastür
      const n = Math.max(1, Math.round(b / 1.0)), w = b / n; for (let i = 0; i <= n; i++) K(0.05, 1.9, t, -b / 2 + i * w, 0.95, 0, '#e6ebe6');
      for (let i = 0; i < n; i++) { const x = -b / 2 + (i + 0.5) * w; K(w - 0.06, 0.08, t - 0.04, x, 0.04, 0, '#f4f6f4'); R(0.04, 0.012, x, 0.085, 0, '#5d646b'); R(0.012, 1.0, x, 1.45, -t / 2 + 0.05, CHROM); R(0.07, 0.03, x, 1.94, -t / 2 + 0.14, CHROM); K(0.02, 0.02, 0.12, x, 1.95, -t / 2 + 0.09, CHROM); K(0.1, 0.06, 0.04, x, 1.1, -t / 2 + 0.04, CHROM);
        G(w - 0.12, 1.8, 0.02, x, 0.98, t / 2 - 0.02, '#d7f0f4', 0.3); K(0.02, 0.2, 0.03, x + w * 0.3, 1.0, t / 2 + 0.01, CHROM); } break; }
    case 'waschtisch': {       // Waschbecken in einer Reihe, darüber ein langer Spiegel
      K(b, 0.06, t, 0, 0.84, 0, '#e9ecee'); K(b - 0.1, 0.3, t - 0.2, 0, 0.66, -0.06, '#cfd4d8'); const n = Math.max(1, Math.round(b / 0.8)); for (let i = 0; i < n; i++) { const x = -b / 2 + (i + 0.5) * b / n; K(0.44, 0.02, 0.32, x, 0.875, 0.02, WEISS); K(0.36, 0.021, 0.24, x, 0.876, 0.02, '#c9d6dc'); R(0.014, 0.14, x, 0.94, -t / 2 + 0.07, CHROM); K(0.025, 0.025, 0.12, x, 1.01, -t / 2 + 0.12, CHROM); R(0.03, 0.12, x + 0.27, 0.93, -t / 2 + 0.08, '#f0ad4e'); }
      K(b - 0.1, 0.7, 0.03, 0, 1.5, -t / 2 + 0.015, CHROM); K(b - 0.16, 0.64, 0.01, 0, 1.5, -t / 2 + 0.035, '#bcd6e2', { emissive: '#5a7f92', emissiveIntensity: 0.35 }); break; }
    case 'wckabine': {       // WC-Kabinen: Trennwände, Tür, dahinter die Toilette
      const n = Math.max(1, Math.round(b / 1.0)), w = b / n; for (let i = 0; i <= n; i++) K(0.04, 1.85, t, -b / 2 + i * w, 1.02, 0, '#7f97a8');
      for (let i = 0; i < n; i++) { const x = -b / 2 + (i + 0.5) * w; K(w - 0.1, 1.75, 0.035, x, 1.05, t / 2 - 0.02, '#9db3c2'); K(0.04, 0.1, 0.03, x + w * 0.3, 1.05, t / 2 + 0.01, CHROM); L(0.05, 0.05, 0.01, x + w * 0.3, 1.2, t / 2, i ? '#2ecc71' : '#e74c3c', i ? '#2ecc71' : '#e74c3c', 1); K(0.38, 0.4, 0.5, x, 0.2, -t / 2 + 0.35, WEISS); K(0.4, 0.5, 0.16, x, 0.65, -t / 2 + 0.1, WEISS); } break; }
    case 'waeschekorb': R(0.24, 0.55, 0, 0.275, 0, '#d8cfbd', 'y', 0.28); S(0.22, 0, 0.56, 0, WEISS, 0.5); S(0.12, 0.1, 0.6, 0.05, '#2f5f8f', 0.6); break;

    // ------------------------------------------------------------ Waffenkammer und Einsatzmittel
    case 'helmregal': {       // Regal mit Helmen, Schutzschilden und Kisten
      const n = 3; for (const sx of [-1, 1]) K(0.04, h, t, sx * (b / 2 - 0.02), h / 2, 0, '#4a515a'); for (let i = 0; i <= n; i++) K(b - 0.06, 0.03, t, 0, 0.1 + i * (h - 0.14) / n, 0, '#565d66');
      for (let x = -b / 2 + 0.26; x < b / 2 - 0.2; x += 0.42) { S(0.15, x, 0.1 + 2 * (h - 0.14) / n + 0.15, 0, '#e9edf0', 0.9); G(0.2, 0.1, 0.02, x, 0.1 + 2 * (h - 0.14) / n + 0.13, 0.14, '#9fd0ff', 0.5); S(0.15, x, 0.1 + (h - 0.14) / n + 0.15, 0, '#1b2a4a', 0.9); }
      for (let x = -b / 2 + 0.3; x < b / 2 - 0.25; x += 0.55) { K(0.44, 0.24, t - 0.1, x, 0.24, 0, '#4b5a3a'); K(0.2, 0.08, 0.01, x, 0.26, t / 2 - 0.045, '#d9c27a'); } break; }
    case 'schilde': for (let i = 0; i < (q.n || 4); i++) { const x = (i - ((q.n || 4) - 1) / 2) * 0.16; const k = G(0.6, 1.05, 0.02, x * 0.3, 0.56, 0.12 + i * 0.07, '#bfe2ff', 0.38); k.rotation.x = -0.14; const s = K(0.5, 0.1, 0.012, x * 0.3, 0.62, 0.125 + i * 0.07, '#22335a'); s.rotation.x = -0.14; } K(0.7, 0.04, 0.5, 0, 0.02, 0.25, '#3b4148'); break;       // Schutzschilde aus Plexiglas, hintereinander angelehnt
    case 'kegel': { const n = q.n || 1; for (let i = 0; i < n; i++) { const y = i * 0.07; K(0.3, 0.03, 0.3, 0, y + 0.015, 0, '#e2571e'); R(0.12, 0.44, 0, y + 0.25, 0, '#f26a1b', 'y', 0.025, 12); R(0.089, 0.1, 0, y + 0.24, 0, WEISS, 'y', 0.066, 12); } break; }       // Leitkegel (n = so viele gestapelt)
    case 'streukiste': K(b, 0.5, t, 0, 0.27, 0, '#e2a51e'); K(b + 0.04, 0.1, t + 0.04, 0, 0.56, 0, '#c98f12').rotation.x = 0.06; K(0.3, 0.14, 0.01, 0, 0.3, t / 2 + 0.006, WEISS); break;

    // ------------------------------------------------------------ Hof: Boden
    case 'linie': { const l = new THREE.Mesh(new THREE.PlaneGeometry(b, t).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: f, polygonOffset: true, polygonOffsetFactor: -4 })); l.position.y = q.y || 0.075; g.add(l); break; }
    case 'schrift': BB(bodenSchrift(q.text, q.farbe || '#f2f2f2'), b, b / 4, 0, 0, q.y || 0.08, { opacity: 0.92 }); break;       // Schrift auf dem Boden
    case 'schraffur': { const bild = schraffur(q.farbe || '#f2f2f2').clone(); bild.needsUpdate = true; bild.repeat.set(b / 0.9, t / 0.9); BB(bild, b, t, 0, 0, q.y || 0.08, { opacity: 0.9 }); break; }
    case 'fleck': BB(fleckBild(q.art || 'oel'), b, b, 0, 0, q.y || 0.078); break;
    case 'matte': K(b, 0.02, t, 0, 0.045, 0, '#3a3f45').castShadow = false; K(b - 0.12, 0.021, t - 0.12, 0, 0.046, 0, '#565046').castShadow = false; break;
    case 'bordstein': K(b, 0.14, t, 0, 0.07, 0, '#b9b6ad'); break;
    case 'beet': K(b, 0.16, t, 0, 0.08, 0, '#b9b6ad'); K(b - 0.2, 0.17, t - 0.2, 0, 0.09, 0, '#4a3a2a'); { const w = zufall(Math.round(b * 7 + t * 3)); for (let x = -b / 2 + 0.4; x < b / 2 - 0.3; x += 0.7) for (let z = -t / 2 + 0.4; z <= t / 2 - 0.3; z += 0.7) { const r = 0.26 + w() * 0.14; S(r, x + (w() - 0.5) * 0.2, 0.17 + r * 0.7, z + (w() - 0.5) * 0.2, ['#3f7a3a', '#4f8a3f', '#356b34', '#5c9447'][Math.floor(w() * 4)], 0.85); if (w() > 0.7) S(0.07, x + 0.1, 0.2 + r * 1.3, z, ['#e8c84a', '#d86a8a', '#f2f2f2'][Math.floor(w() * 3)]); } } break;       // Beet mit Büschen und ein paar Blumen
    case 'hecke': { const k = new THREE.Mesh(new THREE.BoxGeometry(b, h, t), new THREE.MeshLambertMaterial({ color: '#3f7a3c', map: BILD.boden('boden_gras', '#4f8a45') })); k.position.y = h / 2; k.castShadow = true; g.add(k); K(b + 0.1, 0.06, t + 0.1, 0, 0.03, 0, '#4a3a2a'); break; }

    // ------------------------------------------------------------ Hof: Zaun, Tor, Dächer
    case 'zaun': {       // Stabmattenzaun: Pfosten alle 2,5 m, dazwischen Gitter (ein durchsichtiges Bild)
      const n = Math.max(1, Math.round(b / 2.5)), farbe = q.farbe || '#3f4a52'; for (let i = 0; i <= n; i++) K(0.07, h + 0.08, 0.07, -b / 2 + i * b / n, (h + 0.08) / 2, 0, farbe);
      const bild = gitterBild(farbe).clone(); bild.needsUpdate = true; bild.repeat.set(b / 0.5, 1); const p = new THREE.Mesh(new THREE.PlaneGeometry(b, h), new THREE.MeshBasicMaterial({ map: bild, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide })); p.position.y = h / 2 + 0.04; g.add(p);
      if (q.draht) for (let i = 0; i < n; i++) { const x = -b / 2 + (i + 0.5) * b / n; K(b / n, 0.012, 0.012, x, h + 0.2, 0.05, '#9aa0a6'); K(b / n, 0.012, 0.012, x, h + 0.3, 0.1, '#9aa0a6'); } if (q.draht) for (let i = 0; i <= n; i++) K(0.04, 0.3, 0.04, -b / 2 + i * b / n, h + 0.2, 0.05, farbe).rotation.x = 0.4;
      break; }
    case 'tor': {       // Schiebetor: Rahmen mit Stäben auf einer Schiene, daneben der Antrieb mit Warnleuchte
      const farbe = q.farbe || '#3f4a52'; K(b + 2, 0.03, 0.14, 1, 0.015, 0, '#6b6f75'); K(b, 0.1, 0.07, 0, 0.14, 0, farbe); K(b, 0.09, 0.07, 0, h, 0, farbe); for (const sx of [-1, 1]) K(0.09, h, 0.07, sx * (b / 2 - 0.045), h / 2 + 0.05, 0, farbe);
      const bild = gitterBild(farbe, 10).clone(); bild.needsUpdate = true; bild.repeat.set(b / 0.5, 1); const p = new THREE.Mesh(new THREE.PlaneGeometry(b - 0.1, h - 0.15), new THREE.MeshBasicMaterial({ map: bild, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide })); p.position.y = h / 2 + 0.07; g.add(p);
      for (const sx of [-1, 1]) { K(0.22, h + 0.4, 0.22, sx * (b / 2 + 0.16), (h + 0.4) / 2, 0.16, '#5d646b'); } K(0.4, 0.7, 0.34, b / 2 + 0.6, 0.35, 0.3, '#6f777f'); R(0.07, 0.12, b / 2 + 0.16, h + 0.47, 0.16, '#f0ad4e'); K(0.9, 0.5, 0.02, 0, h * 0.62, 0.05, WEISS); B(schildBild('POLIZEI|Einfahrt freihalten', WEISS, POLIZEIBLAU), 0.86, 0.46, 0, h * 0.62, 0.065); break; }
    case 'schranke': K(0.3, 1.05, 0.3, 0, 0.525, 0, '#e9edf0'); K(0.32, 0.12, 0.32, 0, 1.0, 0, '#c62828'); for (let i = 0; i < 8; i++) K(b / 8, 0.09, 0.05, 0.2 + (i + 0.5) * b / 8, 0.95, 0, i % 2 ? '#c62828' : WEISS); K(0.06, 0.9, 0.06, b + 0.25, 0.45, 0, STAHL); break;
    case 'carport': {       // Überdachung: Stahlstützen, Träger, ein helles durchscheinendes Dach (damit man von oben noch sieht, was darunter steht)
      const hh = q.h || 2.6; for (const sx of [-1, 1]) for (let i = 0; i <= Math.round(b / 5); i++) { const x = -b / 2 + 0.15 + i * (b - 0.3) / Math.round(b / 5); K(0.12, hh, 0.12, x, hh / 2, sx * (t / 2 - 0.15), '#5d646b'); }
      for (const sz of [-1, 1]) K(b, 0.14, 0.1, 0, hh + 0.02, sz * (t / 2 - 0.15), '#5d646b'); for (let x = -b / 2 + 0.15; x <= b / 2; x += (b - 0.3) / Math.max(2, Math.round(b / 2.5))) K(0.07, 0.1, t, x, hh + 0.1, 0, '#6f777f');
      { const d = G(b + 0.3, 0.05, t + 0.5, 0, hh + 0.18, 0, '#cfe3ee', 0.34); d.rotation.x = 0.03; } K(b + 0.3, 0.1, 0.1, 0, hh + 0.17, t / 2 + 0.25, '#4a515a'); break; }
    case 'vordach': K(b, 0.1, t, 0, 2.5, 0, '#4a515a'); G(b - 0.1, 0.03, t - 0.1, 0, 2.56, 0, '#cfe3ee', 0.4); for (const sx of [-1, 1]) K(0.08, 2.5, 0.08, sx * (b / 2 - 0.08), 1.25, t / 2 - 0.08, '#5d646b'); break;

    // ------------------------------------------------------------ Hof: Technik und Geräte
    case 'zapfsaeule': {       // kleine Tankstelle: Insel, Säule mit Anzeige und Schlauch, Feuerlöscher
      K(2.2, 0.14, 1.0, 0, 0.07, 0, '#b9b6ad'); K(0.7, 1.5, 0.45, 0, 0.89, 0, '#e9edf0'); K(0.74, 0.3, 0.49, 0, 1.55, 0, POLIZEIBLAU); L(0.4, 0.2, 0.01, 0, 1.25, 0.23, '#12161a', '#1c2a1c', 1); L(0.3, 0.05, 0.012, 0, 1.28, 0.232, '#9be28a', '#7fe06a', 1.5);
      K(0.7, 0.25, 0.01, 0, 0.6, 0.23, '#f0ad4e'); for (const sx of [-1, 1]) { K(0.06, 0.22, 0.08, sx * 0.4, 1.0, 0.05, SCHWARZ); R(0.02, 0.8, sx * 0.44, 0.62, 0.05, SCHWARZ); } for (const sx of [-1, 1]) R(0.07, 0.9, sx * 0.95, 0.52, 0, '#f0c419'); R(0.06, 0.36, 0.25, 0.32, 0.36, '#c62828'); break; }
    case 'waschplatz': {       // Waschplatz: Hochdruckreiniger, Schlauchtrommel an der Wand (bei −z), Eimer und Schwamm
      K(0.5, 0.7, 0.4, -0.6, 0.35, 0.1, '#f0c419'); K(0.52, 0.12, 0.42, -0.6, 0.76, 0.1, SCHWARZ); R(0.1, 0.06, -0.86, 0.1, 0.25, SCHWARZ, 'x'); R(0.1, 0.06, -0.34, 0.1, 0.25, SCHWARZ, 'x'); R(0.02, 0.9, -0.6, 0.95, -0.05, SCHWARZ);
      R(0.26, 0.14, 0.5, 1.1, -0.1, '#3f6f96', 'z', 0.26, 18); R(0.2, 0.16, 0.5, 1.1, -0.1, '#2e7d32', 'z', 0.2, 18); K(0.06, 0.5, 0.06, 0.5, 0.8, -0.18, STAHL);
      R(0.15, 0.28, 1.2, 0.14, 0.4, '#1d6fd6', 'y', 0.18); K(0.16, 0.07, 0.1, 1.2, 0.3, 0.42, '#f0c419'); R(0.14, 0.26, 1.55, 0.13, 0.15, '#c62828', 'y', 0.17); K(0.05, 1.4, 0.05, 1.0, 0.7, -0.14, '#b98a55').rotation.z = 0.12; K(0.3, 0.1, 0.08, 1.09, 0.06, -0.14, '#2b2f33'); break; }
    case 'container': {       // großer Müllcontainer auf Rollen mit gewölbtem Deckel
      K(b, h - 0.3, t, 0, (h - 0.3) / 2 + 0.16, 0, f); const d = R(t / 2, b + 0.06, 0, h - 0.14, 0, dunkel(f, 0.8), 'x', t / 2, 14); d.scale.y = 0.34; K(b + 0.08, 0.06, t + 0.08, 0, h - 0.16, 0, dunkel(f, 0.7));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) R(0.08, 0.06, sx * (b / 2 - 0.14), 0.08, sz * (t / 2 - 0.12), SCHWARZ, 'x'); K(b * 0.4, 0.05, 0.05, 0, h - 0.34, t / 2 + 0.03, dunkel(f, 0.6)); K(0.3, 0.2, 0.01, 0, h * 0.5, t / 2 + 0.006, WEISS); break; }
    case 'fahrradstaender': {       // Fahrradständer mit Polizei-Fahrrädern (q.n Räder)
      const n = q.n || 3; K(b, 0.05, 0.06, 0, 0.03, -0.3, STAHL); K(b, 0.05, 0.06, 0, 0.03, 0.3, STAHL);
      for (let i = 0; i < Math.round(b / 0.6) + 1; i++) { const x = -b / 2 + i * b / Math.round(b / 0.6); const bu = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.02, 6, 14, Math.PI), mat(STAHL)); bu.position.set(x, 0.04, 0); bu.rotation.y = Math.PI / 2; bu.castShadow = true; g.add(bu); }
      for (let i = 0; i < n; i++) { const r = moebelForm({ form: 'fahrrad', farbe: i % 2 ? '#e9edf0' : POLIZEIBLAU }); r.position.set(-b / 2 + 0.3 + i * 0.6, 0, 0.25); r.rotation.y = (i % 2 ? 0.06 : -0.05); g.add(r); } break; }
    case 'fahrrad': {       // ein Fahrrad (schaut nach +z)
      for (const z of [-0.52, 0.52]) { const rad = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.025, 6, 18), mat('#15181c')); rad.position.set(0, 0.355, z); rad.rotation.y = Math.PI / 2; rad.castShadow = true; g.add(rad); R(0.03, 0.06, 0, 0.355, z, CHROM, 'x'); }
      const rohr = (y1, z1, y2, z2, farbe = f, d = 0.035) => { const l = Math.hypot(y2 - y1, z2 - z1); const k = K(d, d, l, 0, (y1 + y2) / 2, (z1 + z2) / 2, farbe); k.rotation.x = -Math.atan2(y2 - y1, z2 - z1); };
      rohr(0.355, -0.52, 0.86, -0.18); rohr(0.86, -0.18, 0.84, 0.36); rohr(0.36, -0.02, 0.84, 0.36); rohr(0.36, -0.02, 0.86, -0.18); rohr(0.355, -0.52, 0.36, -0.02); rohr(0.355, 0.52, 0.95, 0.36, CHROM, 0.03);
      K(0.13, 0.05, 0.26, 0, 0.94, -0.2, SCHWARZ); K(0.03, 0.12, 0.03, 0, 0.9, -0.19, CHROM); K(0.52, 0.03, 0.03, 0, 1.0, 0.36, SCHWARZ); K(0.2, 0.16, 0.3, 0, 0.74, -0.52, '#22262b'); K(0.22, 0.03, 0.34, 0, 0.66, -0.5, STAHL); break; }
    case 'zwinger': {       // Lottes Zwinger: Gitter rundherum, Hundehütte, Napf
      const gz = (bb, x, z, ry) => { const z1 = moebelForm({ form: 'zaun', b: bb, h: 1.8, farbe: '#6b7278' }); z1.position.set(x, 0, z); z1.rotation.y = ry; g.add(z1); };
      gz(b, 0, t / 2, 0); gz(b, 0, -t / 2, 0); gz(t, -b / 2, 0, Math.PI / 2); gz(t, b / 2, 0, Math.PI / 2); K(b, 0.06, t, 0, 0.03, 0, '#a9a69c');
      K(1.1, 0.7, 1.2, -b / 2 + 0.9, 0.4, -t / 2 + 0.9, '#8a5a2a'); { const d = K(1.3, 0.06, 0.8, -b / 2 + 0.9, 0.98, -t / 2 + 0.58, '#5a3b22'); d.rotation.x = -0.6; const e = K(1.3, 0.06, 0.8, -b / 2 + 0.9, 0.98, -t / 2 + 1.22, '#5a3b22'); e.rotation.x = 0.6; } K(0.44, 0.5, 0.02, -b / 2 + 0.9, 0.3, -t / 2 + 1.51, '#22262b');
      R(0.13, 0.07, b / 2 - 0.6, 0.095, t / 2 - 0.5, CHROM, 'y', 0.11); S(0.07, b / 2 - 1.1, 0.13, 0, '#c62828'); K(0.5, 0.2, 0.02, 0, 1.3, t / 2 + 0.02, WEISS); B(schildBild('LOTTE|Diensthund', WEISS, POLIZEIBLAU), 0.48, 0.18, 0, 1.3, t / 2 + 0.035); break; }
    case 'schildmast': {       // Schild an einem Mast: q.text (| trennt zwei Zeilen), q.art = 'rund' für ein rundes Verkehrsschild
      const hh = q.h || 2.4; R(0.03, hh, 0, hh / 2, 0, CHROM); if (q.art === 'park') { K(0.6, 0.6, 0.03, 0, hh - 0.3, 0.04, '#1d5fc4'); B(schildBild('P', '#1d5fc4'), 0.56, 0.56, 0, hh - 0.3, 0.06); K(0.6, 0.3, 0.03, 0, hh - 0.8, 0.04, WEISS); B(schildBild(q.text || 'Nur für|Dienstfahrzeuge', WEISS, '#111'), 0.56, 0.26, 0, hh - 0.8, 0.06); }
      else { K(b, b * 0.5, 0.03, 0, hh - b * 0.25, 0.04, WEISS); B(schildBild(q.text || 'POLIZEI', q.farbe || POLIZEIBLAU, q.schrift || '#fff', q.rand), b - 0.04, b * 0.5 - 0.04, 0, hh - b * 0.25, 0.06); } break; }
    case 'pylon': {       // Leuchtschild "POLIZEI" vor dem Eingang: blaue Stele, von beiden Seiten beschriftet
      K(1.3, 0.3, 0.4, 0, 0.15, 0, '#6b6f75'); K(1.1, 2.6, 0.24, 0, 1.6, 0, POLIZEIBLAU, { emissive: '#12307a', emissiveIntensity: 0.6 }); for (const s of [1, -1]) { const p = B(schildBild('POLIZEI', POLIZEIBLAU), 1.0, 0.5, 0, 2.4, s * 0.125, { emissive: '#ffffff', emissiveMap: schildBild('POLIZEI', POLIZEIBLAU), emissiveIntensity: 0.55 }); if (s < 0) p.rotation.y = Math.PI; const u = B(schildBild('Wache|Am Deich', POLIZEIBLAU), 0.9, 0.45, 0, 1.6, s * 0.125); if (s < 0) u.rotation.y = Math.PI; } K(1.1, 0.06, 0.25, 0, 0.75, 0, '#d8ee2a'); break; }
    case 'fahnenmast': { const hh = q.h || 7; R(0.05, hh, 0, hh / 2, 0, '#d9dcdf', 'y', 0.035); S(0.07, 0, hh + 0.03, 0, '#d9a521'); R(0.2, 0.1, 0, 0.05, 0, '#8d949b'); const far = q.farben || [POLIZEIBLAU, WEISS, POLIZEIBLAU]; far.forEach((c, i) => { const k = K(1.5, 0.3, 0.02, 0.8, hh - 0.25 - i * 0.3, 0, c); k.rotation.y = 0.12; k.rotation.z = -0.03; }); break; }
    case 'antenne': {       // Funkmast: schlankes Gitter mit Antennen und rotem Licht an der Spitze
      const hh = q.h || 11; for (const [sx, sz] of [[-1, -1], [1, -1], [0, 1]]) { const k = R(0.03, hh, sx * 0.18, hh / 2, sz * 0.16, '#b9bec4', 'y', 0.02, 6); k.rotation.z = sx * 0.012; } for (let y = 0.6; y < hh; y += 0.8) { K(0.38, 0.02, 0.02, 0, y, -0.16, '#b9bec4'); K(0.02, 0.02, 0.34, 0.1, y, 0, '#b9bec4'); K(0.02, 0.02, 0.34, -0.1, y, 0, '#b9bec4'); }
      K(0.6, 0.5, 0.5, 0, 0.25, 0, '#8d949b'); for (const y of [hh - 1.2, hh - 2.4]) { R(0.015, 1.3, 0.35, y, 0, WEISS); K(0.4, 0.02, 0.02, 0.18, y - 0.4, 0, '#b9bec4'); } R(0.2, 0.08, -0.3, hh - 3.2, 0.1, WEISS, 'x'); L(0.08, 0.1, 0.08, 0, hh + 0.05, 0, '#e74c3c', '#e74c3c', 2); break; }
    case 'hofleuchte': {       // Flutlicht-Mast für den Hof
      const hh = q.h || 5.5; R(0.12, 0.3, 0, 0.15, 0, '#6b6f75'); R(0.06, hh, 0, hh / 2, 0, '#8d949b', 'y', 0.045); K(0.9, 0.06, 0.08, 0, hh, 0.2, '#8d949b'); for (const sx of [-1, 1]) { const k = K(0.34, 0.1, 0.26, sx * 0.3, hh - 0.05, 0.4, '#3a3f45'); k.rotation.x = 0.5; const l = L(0.28, 0.02, 0.2, sx * 0.3, hh - 0.11, 0.42, '#fff8dc', '#ffe9a8', 1.6); l.rotation.x = 0.5; l.castShadow = false; } break; }
    case 'wandleuchte': K(0.26, 0.1, 0.12, 0, q.y || 1.55, 0.06, '#3a3f45'); L(0.22, 0.03, 0.09, 0, (q.y || 1.55) - 0.06, 0.07, '#fff8dc', '#ffe9a8', 1.6).castShadow = false; break;
    case 'klima': K(0.9, 0.7, 0.36, 0, 0.5, 0, '#d9dcdf'); R(0.26, 0.02, -0.12, 0.5, 0.185, '#3a3f45', 'z', 0.26, 18); K(0.9, 0.12, 0.3, 0, 0.08, 0, '#6b6f75'); break;
    case 'poller': R(0.07, 0.9, 0, 0.45, 0, q.farbe || '#e9edf0'); R(0.072, 0.12, 0, 0.72, 0, '#c62828'); S(0.07, 0, 0.9, 0, q.farbe || '#e9edf0', 0.6); break;
    case 'aschenbecher': R(0.09, 0.9, 0, 0.45, 0, STAHL); R(0.12, 0.04, 0, 0.92, 0, SCHWARZ); R(0.16, 0.03, 0, 0.015, 0, SCHWARZ); break;
    case 'briefkasten': K(0.4, 0.5, 0.2, 0, 1.25, 0.1, '#e2a51e'); K(0.3, 0.03, 0.01, 0, 1.4, 0.205, SCHWARZ); K(0.2, 0.12, 0.01, 0, 1.22, 0.205, WEISS); break;
    case 'klingel': K(0.14, 0.3, 0.05, 0, 1.3, 0.025, CHROM); L(0.05, 0.05, 0.01, 0, 1.36, 0.052, '#7fd0ff', '#7fd0ff', 1.5); K(0.08, 0.1, 0.01, 0, 1.22, 0.052, '#22262b'); break;
    case 'stufen': for (let i = 0; i < 3; i++) K(b - i * 0.1, 0.1, t - i * 0.5, 0, 0.05 + i * 0.1, -i * 0.25, '#bdb9ae'); for (const sx of [-1, 1]) { R(0.025, 1.0, sx * (b / 2 - 0.1), 0.5, t / 2 - 0.2, CHROM); R(0.025, t - 0.2, sx * (b / 2 - 0.1), 1.0, 0.1, CHROM, 'z'); } break;

    // ------------------------------------------------------------ Museum
    case 'haus': {       // ein Haus der Nachbarschaft, nur Kulisse: vier Wände mit gemalten Fenstern, darauf ein Dach. q.stil = Art der Fassade, q.dach = Farbe der Ziegel
      const fa = BILD.fassade(q.stil || 'backstein'), seite = (breit, x, z, ry) => { const bild = fa.map.clone(); bild.needsUpdate = true; bild.wrapS = bild.wrapT = THREE.RepeatWrapping; bild.repeat.set(Math.max(1, Math.round(breit / 3)) / 4, Math.max(1, Math.round(h / 3.05)) / 4);
        const w = new THREE.Mesh(new THREE.PlaneGeometry(breit, h), new THREE.MeshLambertMaterial({ map: bild })); w.position.set(x, h / 2, z); w.rotation.y = ry; g.add(w); };
      seite(b, 0, t / 2, 0); seite(b, 0, -t / 2, Math.PI); seite(t, b / 2, 0, Math.PI / 2); seite(t, -b / 2, 0, -Math.PI / 2); K(b + 0.3, 0.25, t + 0.3, 0, h + 0.1, 0, '#5a5f66');
      if (q.dach) { const first = Math.min(b, t) * 0.32, ecken = [], P = (x, y, z) => ecken.push(x, y, z), bx = b / 2 + 0.3, tz = t / 2 + 0.3, y0 = h + 0.2;       // Satteldach: zwei schräge Flächen und zwei Giebel
        P(-bx, y0, tz); P(bx, y0, tz); P(bx, y0 + first, 0); P(-bx, y0, tz); P(bx, y0 + first, 0); P(-bx, y0 + first, 0);
        P(bx, y0, -tz); P(-bx, y0, -tz); P(-bx, y0 + first, 0); P(bx, y0, -tz); P(-bx, y0 + first, 0); P(bx, y0 + first, 0);
        P(bx, y0, tz); P(bx, y0, -tz); P(bx, y0 + first, 0); P(-bx, y0, -tz); P(-bx, y0, tz); P(-bx, y0 + first, 0);
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(ecken, 3)); geo.computeVertexNormals(); const d = new THREE.Mesh(geo, mat(q.dach)); d.castShadow = true; g.add(d);
        K(0.6, 1.2, 0.6, b * 0.25, y0 + first * 0.7, t * 0.1, '#8a5a4a'); }
      break; }
    case 'schiff': {       // Schiffsmodell: Rumpf, zwei Masten, Segel
      K(0.34, 0.16, 1.5, 0, 0.14, 0, '#5a3b22'); K(0.26, 0.1, 1.2, 0, 0.27, 0, '#7a5230'); K(0.2, 0.14, 0.36, 0, 0.36, -0.55, '#5a3b22'); K(0.06, 0.06, 0.5, 0, 0.3, 0.95, '#5a3b22');
      for (const z of [-0.2, 0.35]) { K(0.03, 1.05, 0.03, 0, 0.82, z, '#3a2a1a'); K(0.5, 0.3, 0.02, 0, 0.75, z + 0.03, '#efe6d0'); K(0.4, 0.24, 0.02, 0, 1.1, z + 0.03, '#efe6d0'); }
      K(0.3, 0.02, 0.5, 0, 0.05, 0, '#3a2a20'); break; }
    case 'kordel': { for (const sx of [-1, 1]) { K(0.06, 0.9, 0.06, sx * b / 2, 0.45, 0, '#c9a24a'); K(0.22, 0.03, 0.22, sx * b / 2, 0.015, 0, '#c9a24a'); } K(b, 0.04, 0.04, 0, 0.78, 0, '#8a1f2a'); break; }
    default: K(b, h, t, 0, h / 2, 0);
  }
  return g;
}

// ---------------------------------------------------------------------------------------------
// Backen: Alle einfarbigen Teile einer Gruppe zu EINER Form verschmelzen (jede Ecke merkt sich ihre Farbe).
// Aus hunderten Zeichenaufrufen wird so einer – das iPad dankt es. Leuchtendes, Durchsichtiges und Bilder bleiben, wie sie sind.
// ---------------------------------------------------------------------------------------------
export function backen(wurzeln, ziel) {
  const orte = [], richt = [], farben = [], weg = [], v = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const w of wurzeln) { w.updateMatrixWorld(true); w.traverse(o => {
    const m = o.material;
    if (!o.isMesh || !m || !m.isMeshLambertMaterial || m.map || m.transparent || m.emissiveIntensity > 0 && m.emissive.getHex() !== 0 || m.side !== THREE.FrontSide) return;
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, p = geo.attributes.position, n = geo.attributes.normal; nm.getNormalMatrix(o.matrixWorld);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); orte.push(v.x, v.y, v.z); v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); richt.push(v.x, v.y, v.z); farben.push(m.color.r, m.color.g, m.color.b); }
    weg.push(o);
  }); }
  for (const o of weg) { o.parent.remove(o); o.geometry.dispose(); o.material.dispose(); }
  if (!orte.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(orte, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(richt, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(farben, 3));
  const netz = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })); netz.castShadow = true; netz.receiveShadow = true; ziel.add(netz);
  return netz;
}
