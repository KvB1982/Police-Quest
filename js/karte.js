// Blaulicht über Möwenbrück – das Radar (kleine runde Karte) und die große Stadtkarte.
// Vorbild: Radar und Landkarte im Reitturnier. Die Karte wird einmal aus dem Stadtplan gemalt (stadtplan.js)
// und dann nur noch verschoben. Norden ist oben. Im Auto dreht sich das Radar mit: Oben ist dann, wohin du fährst.

import { PLAN, KARTEN_ORTE, UFER, FLEET, STADT_RAND, ortAuf, woBinIch } from './stadtplan.js';

const MASS = 1.25;                                   // Bildpunkte pro Meter auf dem Kartenbild
const RAND = [-900, -470, 920, 900];                 // dieser Ausschnitt der Welt ist auf der Karte
const INSEL = { x: 720, z: -330 };
const $ = id => document.getElementById(id);
const kx = x => (x - RAND[0]) * MASS, kz = z => (z - RAND[1]) * MASS;
let bild = null, gross = null;

const HAUS_FARBE = { alt: '#c98f72', city: '#c9b8a4', reihe: '#d4a184', speicher: '#a8705a', einzel: '#d9a98a', wohnblock: '#c5c9cf', gewerbe: '#b9c0c6', besonders: '#e8554a' };
const HOF_FARBE = { asphalt: '#cfd2d6', schotter: '#c9bfae', pflaster: '#e3dccb', kopfstein: '#eadfc6', weg: '#f1e6c2' };
// So sieht eine Straße auf der Karte aus: die Autobahn orange, Ringe und breite Straßen gelb, Gassen hell, der Kai sandfarben
const wegFarbe = W => W.art === 'autobahn' || W.art === 'rampe' ? '#f0a040' : W.art === 'kai' ? '#f1e6c2' : W.art === 'ring' || W.b > 12 ? '#ffe08a' : W.art === 'gasse' ? '#f6f1e6' : '#ffffff';

function male(mitNamen) {
  const c = document.createElement('canvas'); c.width = Math.round((RAND[2] - RAND[0]) * MASS); c.height = Math.round((RAND[3] - RAND[1]) * MASS);
  const k = c.getContext('2d'), R = (r, farbe) => { k.fillStyle = farbe; k.fillRect(kx(r[0]), kz(r[1]), (r[2] - r[0]) * MASS, (r[3] - r[1]) * MASS); };
  // eine Fläche mit Ecken (zum Beispiel ein schräges Haus), "rand" Meter größer
  const vieleck = (h, farbe, rand = 0) => {
    const f = rand ? [(h.b / 2 + rand) / (h.b / 2), (h.t / 2 + rand) / (h.t / 2)] : null, co = Math.cos(h.dreh || 0), si = Math.sin(h.dreh || 0);
    k.fillStyle = farbe; k.beginPath();
    h.ecken.forEach((p, i) => {
      let x = p[0], z = p[1];
      if (f) { const dx = x - h.x, dz = z - h.z, u = dx * co - dz * si, v = dx * si + dz * co; x = h.x + (u * f[0]) * co + (v * f[1]) * si; z = h.z - (u * f[0]) * si + (v * f[1]) * co; }
      i ? k.lineTo(kx(x), kz(z)) : k.moveTo(kx(x), kz(z));
    });
    k.closePath(); k.fill();
  };
  const linie = (W, breit, farbe) => { k.strokeStyle = farbe; k.lineWidth = breit * MASS; k.beginPath(); W.pts.forEach((p, i) => i ? k.lineTo(kx(p[0]), kz(p[1])) : k.moveTo(kx(p[0]), kz(p[1]))); k.stroke(); };
  k.lineJoin = 'round'; k.lineCap = 'round';
  k.fillStyle = '#b9d7a0'; k.fillRect(0, 0, c.width, c.height);                                   // Wiesen rundherum
  R([RAND[0], RAND[1], RAND[2], UFER], '#8fc0dc');                                                // das Meer
  k.fillStyle = '#e6d7a8'; k.beginPath(); k.ellipse(kx(INSEL.x), kz(INSEL.z), 90 * MASS, 90 * MASS, 0, 0, 7); k.fill();
  k.fillStyle = '#a9cf8a'; k.beginPath(); k.ellipse(kx(INSEL.x), kz(INSEL.z), 60 * MASS, 60 * MASS, 0, 0, 7); k.fill();
  for (const W of PLAN.wege) if (W.art !== 'autobahn' && W.art !== 'rampe') linie(W, W.b + 2 * (W.geh || 3) + 30, '#e9e5dc');     // die Stadt: heller Boden rund um jede Straße
  for (const r of PLAN.gruen) r.haus ? vieleck(r.haus, '#a9d38c', r.rand) : R(r, '#a9d38c');
  for (const h of PLAN.hof) h.haus ? vieleck(h.haus, HOF_FARBE[h.art], h.rand) : R(h.r, HOF_FARBE[h.art]);
  R(FLEET, '#8fc0dc');
  k.fillStyle = '#8fc0dc'; for (const t of PLAN.teiche) { k.beginPath(); k.ellipse(kx(t.x), kz(t.z), t.rx * MASS, t.rz * MASS, 0, 0, 7); k.fill(); }
  for (const d of PLAN.deko) if (d.art === 'steg') R([d.x - 2.2, UFER - d.lang, d.x + 2.2, UFER], '#b08a5a');
  // Straßen: erst der Gehweg als Rand, dann die Fahrbahn; die großen zuletzt, damit sie obenauf liegen
  const wege = [...PLAN.wege].sort((a, b) => a.b - b.b);
  for (const W of wege) if (W.art !== 'autobahn' && W.art !== 'rampe') linie(W, W.b + 2.4, '#d6d0c4');
  for (const W of wege) linie(W, W.art === 'autobahn' ? W.b + 3 : W.b, W.art === 'autobahn' ? '#c97a20' : wegFarbe(W));
  for (const W of wege) if (W.art === 'autobahn') linie(W, W.b, wegFarbe(W));
  for (const p of PLAN.wendeplatz) { k.fillStyle = '#ffffff'; k.beginPath(); k.arc(kx(p.x), kz(p.z), p.r * MASS, 0, 7); k.fill(); }
  k.strokeStyle = '#6a625a'; k.lineWidth = 1.2; k.setLineDash([5, 4]); k.lineCap = 'butt';
  for (const g of PLAN.gleise) { k.beginPath(); k.moveTo(kx(g.x), kz(Math.max(RAND[1], g.z1))); k.lineTo(kx(g.x), kz(RAND[3])); k.stroke(); }
  k.setLineDash([]);
  k.lineWidth = 1.5; k.strokeStyle = '#8a2a22';
  for (const h of PLAN.haeuser) { vieleck(h, HAUS_FARBE[h.typ] || '#c9b8a4'); if (h.typ === 'besonders') k.stroke(); }
  k.fillStyle = '#5f9a4a'; for (const b of PLAN.baeume) { k.beginPath(); k.arc(kx(b.x), kz(b.z), 2.2, 0, 7); k.fill(); }
  // Zeichen für die besonderen Orte
  k.textAlign = 'center'; k.textBaseline = 'middle';
  const zeichen = (x, z, bild, name) => {
    k.fillStyle = 'rgba(255,255,255,0.92)'; k.strokeStyle = '#1f4f9e'; k.lineWidth = 2; k.beginPath(); k.arc(kx(x), kz(z), 15, 0, 7); k.fill(); k.stroke();
    k.font = '19px system-ui, "Apple Color Emoji", "Noto Color Emoji", sans-serif'; k.fillStyle = '#000'; k.fillText(bild, kx(x), kz(z) + 1);
    if (mitNamen) { k.font = 'bold 13px system-ui, sans-serif'; k.lineWidth = 3.5; k.strokeStyle = 'rgba(255,255,255,0.9)'; k.strokeText(name, kx(x), kz(z) + 26); k.fillStyle = '#1a2440'; k.fillText(name, kx(x), kz(z) + 26); }
  };
  if (mitNamen) {         // Straßennamen: Sie laufen an der Straße entlang, bei langen Straßen mehrmals
    for (const W of PLAN.wege) {
      if (W.art === 'rampe' || W.l < 60) continue;
      k.font = `${W.art === 'gasse' ? 9 : W.b > 12 ? 12 : 11}px system-ui, sans-serif`; k.fillStyle = W.art === 'autobahn' ? '#6a3a00' : '#5a6272';
      const n = Math.max(1, Math.round(W.l / 420));
      for (let i = 0; i < n; i++) {
        const [x, z, tx, tz] = ortAuf(W, W.l * (i + 0.5) / n); let w = Math.atan2(tz, tx); if (w > Math.PI / 2 || w < -Math.PI / 2) w += Math.PI;
        k.save(); k.translate(kx(x), kz(z)); k.rotate(w); k.fillText(W.name, 0, 0.5); k.restore();
      }
    }
    k.font = 'italic bold 22px system-ui, sans-serif'; k.fillStyle = 'rgba(40,90,130,0.6)'; k.fillText('Nordsee', kx(-300), kz(-330)); k.fillText('Möwenbucht', kx(250), kz(-250));
  }
  for (const h of PLAN.haeuser) if (h.typ === 'besonders' && h.bild) zeichen(h.x, h.z, h.bild, (h.schild || '').split(' – ')[0].split(' · ')[0]);
  for (const o of KARTEN_ORTE) zeichen(o.x, o.z, o.bild, o.name);
  return c;
}

// ---- Radar: wird jedes Bild neu gemalt. s = { x, z, h, imAuto, ziel: [x, z] oder null, wagen: [x, z], autos: [...] }
export function radar(s) {
  const c = $('radarBild'); if (!c) return;
  if (!bild) bild = male(false);
  const k = c.getContext('2d'), G = c.width, m = G / 2, weit = s.imAuto ? 170 : 95, mal = m / weit;       // weit = so viele Meter bis zum Rand
  const dreh = s.imAuto ? s.h - Math.PI : 0;        // im Auto zeigt die Fahrtrichtung nach oben
  k.save(); k.clearRect(0, 0, G, G);
  k.beginPath(); k.arc(m, m, m, 0, 7); k.clip();
  k.fillStyle = '#b9d7a0'; k.fillRect(0, 0, G, G);
  k.translate(m, m); k.rotate(dreh); k.scale(mal / MASS, mal / MASS);
  k.drawImage(bild, -kx(s.x), -kz(s.z));
  k.restore();
  const ort = (x, z) => { const dx = (x - s.x) * mal, dz = (z - s.z) * mal, co = Math.cos(dreh), si = Math.sin(dreh); return [m + dx * co - dz * si, m + dx * si + dz * co]; };
  const punkt = (x, z, farbe, r, amRand) => {
    let [px, pz] = ort(x, z); const d = Math.hypot(px - m, pz - m);
    if (d > m - r - 4) { if (!amRand) return; px = m + (px - m) / d * (m - r - 4); pz = m + (pz - m) / d * (m - r - 4); }
    k.fillStyle = farbe; k.strokeStyle = '#1a2440'; k.lineWidth = 2.5; k.beginPath(); k.arc(px, pz, r, 0, 7); k.fill(); k.stroke();
  };
  for (const a of s.autos || []) if (a.da) punkt(a.x, a.z, '#70777e', 4, false);
  if (s.wagen && !s.imAuto) punkt(s.wagen[0], s.wagen[1], '#ffffff', 8, true);
  if (s.ziel) punkt(s.ziel[0], s.ziel[1], '#ffd23a', 10 + Math.sin(performance.now() / 200) * 2, true);
  // du selbst: ein blauer Pfeil in der Mitte
  k.save(); k.translate(m, m); k.rotate(s.imAuto ? 0 : Math.PI - s.h);
  k.fillStyle = '#1e66ff'; k.strokeStyle = '#ffffff'; k.lineWidth = 3; k.beginPath(); k.moveTo(0, -15); k.lineTo(11, 12); k.lineTo(0, 6); k.lineTo(-11, 12); k.closePath(); k.fill(); k.stroke();
  k.restore();
  const n = $('radarNord'), halb = c.clientWidth / 2, nr = halb - 10;         // das N wandert am Rand mit, wenn sich das Radar dreht
  n.style.left = `${halb + Math.sin(dreh) * nr}px`; n.style.top = `${halb - Math.cos(dreh) * nr - 8}px`;
}
export function radarZeigen(an) { const r = $('radar'); if (r && r.hidden === an) r.hidden = !an; }

// ---- Die große Karte: verschieben mit dem Finger, größer und kleiner mit Rad oder zwei Fingern
let ansicht = { x: 0, y: 0, mal: 1 }, stand = null, zeiger = new Map(), verbunden = false, zwick = 0;
export const kartOffen = () => !$('karte').hidden;
function anwenden() {
  const rahmen = $('karteRahmen'), c = $('karteBild'), min = Math.min(rahmen.clientWidth / c.width, rahmen.clientHeight / c.height);
  ansicht.mal = Math.max(min, Math.min(3, ansicht.mal));
  const b = c.width * ansicht.mal, h = c.height * ansicht.mal;
  ansicht.x = b <= rahmen.clientWidth ? (rahmen.clientWidth - b) / 2 : Math.max(rahmen.clientWidth - b, Math.min(0, ansicht.x));
  ansicht.y = h <= rahmen.clientHeight ? (rahmen.clientHeight - h) / 2 : Math.max(rahmen.clientHeight - h, Math.min(0, ansicht.y));
  c.style.transform = `translate(${ansicht.x}px, ${ansicht.y}px) scale(${ansicht.mal})`;
}
function zoom(faktor, px, py) {
  const alt = ansicht.mal; ansicht.mal *= faktor; anwenden();
  const f = ansicht.mal / alt; ansicht.x = px - (px - ansicht.x) * f; ansicht.y = py - (py - ansicht.y) * f; anwenden();
}
function marken() {
  const c = $('karteBild'), k = c.getContext('2d'), s = stand;
  k.drawImage(gross, 0, 0);
  const marke = (x, z, farbe, r, text) => { k.fillStyle = farbe; k.strokeStyle = '#1a2440'; k.lineWidth = 3; k.beginPath(); k.arc(kx(x), kz(z), r, 0, 7); k.fill(); k.stroke();
    if (text) { k.font = 'bold 15px system-ui, sans-serif'; k.textAlign = 'center'; k.lineWidth = 4; k.strokeStyle = '#fff'; k.strokeText(text, kx(x), kz(z) - r - 9); k.fillStyle = '#1a2440'; k.fillText(text, kx(x), kz(z) - r - 9); } };
  if (s.wagen) marke(s.wagen[0], s.wagen[1], '#ffffff', 9, s.imAuto ? '' : 'Streifenwagen');
  if (s.ziel) marke(s.ziel[0], s.ziel[1], '#ffd23a', 13, 'Ziel');
  marke(s.x, s.z, '#1e66ff', 11, 'Du');
}
export function karteAuf(s) {
  if (!gross) gross = male(true);
  stand = s;
  const c = $('karteBild'); c.width = gross.width; c.height = gross.height;
  marken();
  $('karteWo').textContent = `Du bist hier: ${woBinIch(s.x, s.z)}` + (s.zielText ? ` · Ziel: ${s.zielText}` : '');
  $('karte').hidden = false;
  const rahmen = $('karteRahmen');
  ansicht.mal = Math.max(1, Math.min(rahmen.clientWidth / 900, 1.6));
  ansicht.x = rahmen.clientWidth / 2 - kx(s.x) * ansicht.mal; ansicht.y = rahmen.clientHeight / 2 - kz(s.z) * ansicht.mal; anwenden();
  if (verbunden) return; verbunden = true;
  $('karteZu').onclick = karteZu;
  rahmen.addEventListener('wheel', e => { e.preventDefault(); const r = rahmen.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  rahmen.addEventListener('pointerdown', e => { zeiger.set(e.pointerId, [e.clientX, e.clientY]); rahmen.setPointerCapture(e.pointerId); zwick = 0; });
  rahmen.addEventListener('pointermove', e => {
    if (!zeiger.has(e.pointerId)) return;
    const alt = zeiger.get(e.pointerId); zeiger.set(e.pointerId, [e.clientX, e.clientY]);
    if (zeiger.size === 1) { ansicht.x += e.clientX - alt[0]; ansicht.y += e.clientY - alt[1]; anwenden(); }
    else if (zeiger.size === 2) { const [a, b] = [...zeiger.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), r = rahmen.getBoundingClientRect();
      if (zwick) zoom(d / zwick, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top); zwick = d; }
  });
  for (const ev of ['pointerup', 'pointercancel']) rahmen.addEventListener(ev, e => { zeiger.delete(e.pointerId); zwick = 0; });
}
export function karteZu() { $('karte').hidden = true; zeiger.clear(); }
