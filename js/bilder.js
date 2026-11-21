// Blaulicht über Möwenbrück – selbst gemalte Bilder für die Stadt: Hausfassaden mit Fenstern, Dachziegel,
// Wolken, Wellen, Lichtkegel. Dazu die geladenen Bodenbilder (Asphalt, Pflaster, Gras …) aus assets/boden/.
//
// Eine Fassade ist ein Bild mit 4 Fenstern nebeneinander und 4 Stockwerken übereinander (ein Fensterfeld = 3 m breit,
// ein Stockwerk = 3,05 m hoch). Das Bild wird auf jeder Hauswand so oft wiederholt, wie das Haus breit und hoch ist.
// Zu jeder Fassade gibt es ein zweites Bild "leucht": Dort sind nur die Fenster hell, in denen abends Licht brennt.

import * as THREE from 'three';
import { wuerfel } from './stadtplan.js';

const merk = new Map();
function leinwand(b, h) { const c = document.createElement('canvas'); c.width = b; c.height = h; return [c, c.getContext('2d')]; }
function textur(c, farbe = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  if (farbe) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---- geladene Bilder (Backstein von ambientCG); bis sie da sind, malen wir Ersatz
const geladen = {};
export function ladeBilder() {
  const namen = ['wand_backstein', 'boden_asphalt', 'boden_gehweg', 'boden_kopfstein', 'boden_gras', 'boden_steg'];
  return Promise.all(namen.map(n => new Promise(fertig => {
    const b = new Image();
    b.onload = () => { geladen[n] = b; fertig(); };
    b.onerror = () => fertig();
    b.src = `assets/boden/${n}.jpg`;
  })));
}
// Ein Bodenbild als Textur (wiederholt sich). Fehlt die Datei, gibt es ein gesprenkeltes Ersatzbild.
export function boden(name, grund = '#888888') {
  const key = 'boden' + name;
  if (merk.has(key)) return merk.get(key);
  const [c, k] = leinwand(256, 256);
  if (geladen[name]) k.drawImage(geladen[name], 0, 0, 256, 256);
  else { const w = wuerfel(9); k.fillStyle = grund; k.fillRect(0, 0, 256, 256); for (let i = 0; i < 2600; i++) { k.fillStyle = `rgba(${w() < 0.5 ? '0,0,0' : '255,255,255'},${w() * 0.09})`; k.fillRect(w() * 256, w() * 256, 2, 2); } }
  const t = textur(c); merk.set(key, t); return t;
}

// ---- Wände
const WAND = {
  backstein: { ziegel: '#b0563c', fuge: 0.5, rahmen: '#f3efe6', sturz: '#d8cdbd' },
  dunkel: { ziegel: '#7d3f31', fuge: 0.5, rahmen: '#efe9dc', sturz: '#c9b9a4' },
  klinker: { ziegel: '#d9cfc2', fuge: 0.25, rahmen: '#3d4a57', sturz: null },
  speicher: { ziegel: '#8c4532', fuge: 0.5, rahmen: '#2f5a44', sturz: '#d9c9a8' },
  putz: { putz: '#f6f3ec', rahmen: '#ffffff', sturz: null },
  sandstein: { putz: '#e6d9bc', rahmen: '#f4eedd', sturz: '#cdbd98', quader: true },
  modern: { putz: '#eef0f0', rahmen: '#39424a', band: true },
  halle: { putz: '#e9ecee', blech: true },
};
function grund(k, b, h, W, saat) {
  const w = wuerfel(saat);
  if (W.ziegel) {
    k.fillStyle = W.ziegel; k.fillRect(0, 0, b, h);
    if (geladen.wand_backstein) {           // das echte Backstein-Foto in der Wunschfarbe einfärben
      k.globalAlpha = 0.9; for (let x = 0; x < b; x += 128) for (let y = 0; y < h; y += 128) k.drawImage(geladen.wand_backstein, x, y, 128, 128);
      k.globalAlpha = 1; k.globalCompositeOperation = 'multiply'; k.fillStyle = W.ziegel; k.fillRect(0, 0, b, h);
      k.globalCompositeOperation = 'screen'; k.fillStyle = 'rgba(70,40,30,0.5)'; k.fillRect(0, 0, b, h);
      k.globalCompositeOperation = 'source-over';
    } else {
      for (let y = 0; y < h; y += 4) { k.fillStyle = `rgba(255,240,220,${W.fuge * 0.3})`; k.fillRect(0, y, b, 1);
        for (let x = (y / 4 % 2) * 6; x < b; x += 12) { k.fillStyle = `rgba(${w() < 0.5 ? '0,0,0' : '255,220,190'},${w() * 0.16})`; k.fillRect(x, y + 1, 11, 3); } }
    }
  } else {
    k.fillStyle = W.putz; k.fillRect(0, 0, b, h);
    for (let i = 0; i < 1500; i++) { k.fillStyle = `rgba(${w() < 0.5 ? '0,0,0' : '255,255,255'},${w() * 0.035})`; k.fillRect(w() * b, w() * h, 3, 3); }
    if (W.quader) { k.strokeStyle = 'rgba(90,70,40,0.22)'; k.lineWidth = 1; for (let y = 0; y < h; y += 16) { k.beginPath(); k.moveTo(0, y); k.lineTo(b, y); k.stroke(); for (let x = (y / 16 % 2) * 16; x < b; x += 32) { k.beginPath(); k.moveTo(x, y); k.lineTo(x, y + 16); k.stroke(); } } }
    if (W.blech) { for (let x = 0; x < b; x += 8) { k.fillStyle = 'rgba(0,0,0,0.07)'; k.fillRect(x, 0, 2, h); k.fillStyle = 'rgba(255,255,255,0.12)'; k.fillRect(x + 4, 0, 2, h); } }
  }
}
// Ein Fenster: Rahmen, dunkles Glas mit einem hellen Streifen (Spiegelung), Sprossen, Fensterbank.
function fenster(k, x, y, b, h, W, w, bogen) {
  if (W.sturz) { k.fillStyle = W.sturz; k.fillRect(x - 5, y - 7, b + 10, 6); k.fillRect(x - 6, y + h, b + 12, 5); }
  k.fillStyle = W.rahmen; k.fillRect(x - 3, y - 3, b + 6, h + 6);
  const g = k.createLinearGradient(x, y, x + b, y + h);
  g.addColorStop(0, '#31465a'); g.addColorStop(0.45, '#5d7b93'); g.addColorStop(0.55, '#3a5368'); g.addColorStop(1, '#22323f');
  k.fillStyle = g; k.fillRect(x, y, b, h);
  if (w() < 0.55) { k.fillStyle = 'rgba(245,240,225,0.5)'; k.fillRect(x, y, b, h * (0.18 + w() * 0.3)); }      // Gardine
  k.fillStyle = W.rahmen; k.fillRect(x + b / 2 - 1.5, y, 3, h); if (!W.band) k.fillRect(x, y + h * 0.36, b, 3);
  if (bogen) { k.fillStyle = W.sturz || W.rahmen; k.beginPath(); k.ellipse(x + b / 2, y - 2, b / 2 + 4, 9, 0, Math.PI, 0); k.fill(); }
}
function fensterLicht(k, x, y, b, h, w, viel) {
  if (w() > viel) return;
  const warm = w() < 0.75;
  const g = k.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, warm ? '#ffd68a' : '#cfe6ff'); g.addColorStop(1, warm ? '#c98a3a' : '#7fa6c9');
  k.fillStyle = g; k.fillRect(x, y, b, h);
  k.fillStyle = 'rgba(0,0,0,0.5)'; k.fillRect(x + b / 2 - 1.5, y, 3, h);
}

// Obergeschosse: 4 Felder × 4 Stockwerke. Ergebnis: { map, leucht }
export function fassade(stil) {
  const key = 'og' + stil;
  if (merk.has(key)) return merk.get(key);
  const W = WAND[stil] || WAND.putz, [c, k] = leinwand(512, 512), [cl, kl] = leinwand(256, 256);
  grund(k, 512, 512, W, 11);
  kl.fillStyle = '#000'; kl.fillRect(0, 0, 256, 256); kl.scale(0.5, 0.5);
  const w = wuerfel(stil.length * 37 + 5), wl = wuerfel(stil.length * 91 + 3);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const x0 = i * 128, y0 = j * 128;
    if (W.blech) { if (j === 1) { fenster(k, x0 + 18, y0 + 30, 92, 34, { rahmen: '#55606a' }, () => 1); fensterLicht(kl, x0 + 18, y0 + 30, 92, 34, wl, 0.35); } continue; }
    if (W.band) { fenster(k, x0 + 6, y0 + 34, 116, 58, W, w); fensterLicht(kl, x0 + 6, y0 + 34, 116, 58, wl, 0.4); k.fillStyle = 'rgba(0,0,0,0.08)'; k.fillRect(x0, y0 + 122, 128, 6); continue; }
    if (stil === 'speicher') {
      if (i === 1) { k.fillStyle = '#2f5a44'; k.fillRect(x0 + 34, y0 + 30, 60, 92); k.fillStyle = 'rgba(0,0,0,0.3)'; k.fillRect(x0 + 63, y0 + 30, 2, 92); k.fillStyle = '#d9c9a8'; k.fillRect(x0 + 28, y0 + 122, 72, 6); }   // Ladeluke
      else { fenster(k, x0 + 44, y0 + 44, 40, 56, W, () => 1, true); fensterLicht(kl, x0 + 44, y0 + 44, 40, 56, wl, 0.12); }
      continue;
    }
    fenster(k, x0 + 36, y0 + 30, 56, 78, W, w, stil === 'sandstein');
    fensterLicht(kl, x0 + 36, y0 + 30, 56, 78, wl, 0.42);
  }
  if (W.ziegel || W.quader) { k.fillStyle = 'rgba(0,0,0,0.10)'; for (let j = 0; j < 4; j++) k.fillRect(0, j * 128 + 124, 512, 3); }   // schmales Gesims je Stockwerk
  const e = { map: textur(c), leucht: textur(cl) };
  merk.set(key, e); return e;
}

// Erdgeschoss: 4 Felder nebeneinander. art: 'wohn' (Haustür und Fenster), 'laden' (Schaufenster), 'tor' (große Tore)
const MARKISE = ['#c0392b', '#2e6f9e', '#2f7a55', '#d08a1e'];
export function erdgeschoss(stil, art) {
  const key = 'eg' + stil + art;
  if (merk.has(key)) return merk.get(key);
  const W = WAND[stil] || WAND.putz, [c, k] = leinwand(512, 128), [cl, kl] = leinwand(256, 64);
  grund(k, 512, 128, W, 23);
  kl.fillStyle = '#000'; kl.fillRect(0, 0, 256, 64); kl.scale(0.5, 0.5);
  const w = wuerfel(stil.length * 13 + art.length), wl = wuerfel(77);
  k.fillStyle = 'rgba(0,0,0,0.22)'; k.fillRect(0, 116, 512, 12);                 // Sockel
  for (let i = 0; i < 4; i++) {
    const x0 = i * 128;
    if (art === 'tor') {
      if (i % 2) { k.fillStyle = stil === 'halle' ? '#7d8a94' : '#2f5a44'; k.fillRect(x0 + 14, 22, 100, 106); k.strokeStyle = 'rgba(0,0,0,0.25)'; for (let y = 30; y < 128; y += 10) { k.beginPath(); k.moveTo(x0 + 14, y); k.lineTo(x0 + 114, y); k.stroke(); } }
      else if (stil !== 'halle') { fenster(k, x0 + 44, 40, 40, 50, W, () => 1, true); }
    } else if (art === 'laden') {
      if (i === 2) { k.fillStyle = '#3b3f45'; k.fillRect(x0 + 36, 34, 56, 94); k.fillStyle = '#6f8ea3'; k.fillRect(x0 + 42, 40, 44, 60); fensterLicht(kl, x0 + 42, 40, 44, 60, () => 0, 1); }
      else { k.fillStyle = '#2d3136'; k.fillRect(x0 + 8, 34, 112, 82); const g = k.createLinearGradient(x0, 40, x0 + 128, 110); g.addColorStop(0, '#4b6578'); g.addColorStop(0.5, '#86a4b6'); g.addColorStop(1, '#3a5364');
        k.fillStyle = g; k.fillRect(x0 + 13, 39, 102, 72); fensterLicht(kl, x0 + 13, 39, 102, 72, () => 0, 1);
        k.fillStyle = 'rgba(255,255,255,0.35)'; for (let n = 0; n < 4; n++) k.fillRect(x0 + 22 + n * 24, 80 + (n % 2) * 8, 14, 26); }     // Sachen im Schaufenster
      k.fillStyle = MARKISE[1]; k.fillRect(x0, 4, 128, 26);                       // Markise, gestreift
      k.fillStyle = 'rgba(255,255,255,0.85)'; for (let x = 0; x < 128; x += 20) k.fillRect(x0 + x, 4, 10, 26);
      k.fillStyle = 'rgba(0,0,0,0.25)'; k.fillRect(x0, 28, 128, 4);
    } else {
      if (i === 1) { k.fillStyle = W.rahmen; k.fillRect(x0 + 40, 24, 48, 100); k.fillStyle = ['#5a3a26', '#2f4f6a', '#3d5a40', '#7a2f2a'][Math.floor(w() * 4)]; k.fillRect(x0 + 44, 28, 40, 96);
        k.fillStyle = '#6f8ea3'; k.fillRect(x0 + 50, 34, 28, 22); fensterLicht(kl, x0 + 50, 34, 28, 22, wl, 0.6); k.fillStyle = '#d9b860'; k.fillRect(x0 + 76, 78, 4, 8); }
      else { fenster(k, x0 + 36, 28, 56, 66, W, w); fensterLicht(kl, x0 + 36, 28, 56, 66, wl, 0.4); }
    }
  }
  const e = { map: textur(c), leucht: textur(cl) };
  merk.set(key, e); return e;
}

// Dachziegel (grau gemalt, die Farbe kommt vom Material)
export function ziegel() {
  if (merk.has('ziegel')) return merk.get('ziegel');
  const [c, k] = leinwand(128, 128), w = wuerfel(3);
  k.fillStyle = '#e6e6e6'; k.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 8) { k.fillStyle = 'rgba(0,0,0,0.28)'; k.fillRect(0, y + 7, 128, 1.5);
    for (let x = (y / 8 % 2) * 4; x < 128; x += 8) { k.fillStyle = `rgba(0,0,0,${0.05 + w() * 0.16})`; k.fillRect(x, y, 7, 7); } }
  const t = textur(c); merk.set('ziegel', t); return t;
}

// Wellen für das Wasser
export function wellen() {
  if (merk.has('wellen')) return merk.get('wellen');
  const [c, k] = leinwand(256, 256), w = wuerfel(5);
  k.fillStyle = '#ffffff'; k.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 380; i++) { const x = w() * 256, y = w() * 256, l = 10 + w() * 34; k.strokeStyle = `rgba(${w() < 0.5 ? '0,30,60' : '255,255,255'},${0.05 + w() * 0.12})`; k.lineWidth = 1 + w() * 2;
    k.beginPath(); k.moveTo(x, y); k.quadraticCurveTo(x + l / 2, y - 3 - w() * 3, x + l, y); k.stroke(); }
  const t = textur(c); merk.set('wellen', t); return t;
}

// Eine Wolke: viele weiche weiße Kreise, unten etwas dunkler.
export function wolke(saat) {
  const [c, k] = leinwand(256, 128), w = wuerfel(saat * 13 + 7);
  for (let i = 0; i < 26; i++) {
    const x = 40 + w() * 176, y = 52 + w() * 34 - Math.sin((x - 40) / 176 * Math.PI) * 22, r = 16 + w() * 26;
    const g = k.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.6, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    k.fillStyle = g; k.beginPath(); k.arc(x, y, r, 0, 7); k.fill();
  }
  k.globalCompositeOperation = 'source-atop';
  const s = k.createLinearGradient(0, 40, 0, 110); s.addColorStop(0, 'rgba(120,135,160,0)'); s.addColorStop(1, 'rgba(120,135,160,0.5)');
  k.fillStyle = s; k.fillRect(0, 0, 256, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Ein weicher runder Lichtfleck (für Laternen, Sonne, Mond)
export function schein(innen = 'rgba(255,255,255,1)', aussen = 'rgba(255,255,255,0)') {
  const key = 'schein' + innen + aussen;
  if (merk.has(key)) return merk.get(key);
  const [c, k] = leinwand(128, 128), g = k.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, innen); g.addColorStop(0.25, innen.replace(/[\d.]+\)$/, '0.55)')); g.addColorStop(1, aussen);
  k.fillStyle = g; k.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; merk.set(key, t); return t;
}

// Ein Schild mit Schrift als Bild (für Hauswände)
export function schrift(text, farbe = '#ffffff', grundFarbe = '#1f4f9e') {
  const [c, k] = leinwand(512, 96);
  k.fillStyle = grundFarbe; k.fillRect(0, 0, 512, 96);
  k.strokeStyle = 'rgba(255,255,255,0.7)'; k.lineWidth = 4; k.strokeRect(5, 5, 502, 86);
  k.fillStyle = farbe; k.font = 'bold 50px system-ui, sans-serif'; k.textAlign = 'center'; k.textBaseline = 'middle';
  k.fillText(text, 256, 51, 480);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
