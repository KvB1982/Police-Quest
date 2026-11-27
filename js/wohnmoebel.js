// Blaulicht über Möwenbrück – Möbel für Kims Wohnung (Fleetufer 7).
//
// Alles ist aus einfachen Formen gebaut: K = Kiste, R = Rolle, S = Kugel. Jede Form schaut nach vorn (+z),
// der Nullpunkt liegt unten in der Mitte. Wo ein Möbel steht, sagt js/wohnung.js.
// Aufgerufen wird das hier von moebelForm in js/einrichtung.js: Kennt sie eine Form nicht, fragt sie wohnForm.

import * as THREE from 'three';

const mat = (farbe, extra = {}) => new THREE.MeshLambertMaterial({ color: farbe, ...extra });
const dunkel = (farbe, k = 0.72) => '#' + new THREE.Color(farbe).multiplyScalar(k).getHexString();
const zufall = saat => { let n = saat * 7.3 + 11; return () => { n = (n * 9301 + 49297) % 233280; return n / 233280; }; };
const SCHWARZ = '#1d2126', WEISS = '#f2f2ee', CHROM = '#c9ced4', HOLZ = '#b98a55', HOLZ_DUNKEL = '#6a4a2e';
const BUCH = ['#1d3f8a', '#b02a25', '#2e7d32', '#22262b', '#d9a521', '#6b6f75', '#f2f2ee', '#7a3a6a', '#c96a2a', '#2f6f7a'];

// Ein gemaltes Bild (Poster, Urkunde, Foto): einmal malen, dann merken.
const bilder = {};
function male(name, b, h, maler) {
  if (bilder[name]) return bilder[name];
  const c = document.createElement('canvas'); c.width = b; c.height = h; maler(c.getContext('2d'), b, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return (bilder[name] = t);
}
function posterBild(art) {
  return male(art, 256, 360, (x, B, H) => {
    if (art === 'leuchtturm') {       // Poster: der Leuchtturm von Möwenbrück bei Sonnenuntergang
      const v = x.createLinearGradient(0, 0, 0, H); v.addColorStop(0, '#27457a'); v.addColorStop(0.55, '#e88a5a'); v.addColorStop(0.7, '#f4c27a'); x.fillStyle = v; x.fillRect(0, 0, B, H);
      x.fillStyle = '#1d3350'; x.fillRect(0, H * 0.72, B, H * 0.28); x.fillStyle = '#2a4668'; for (let i = 0; i < 6; i++) x.fillRect(20 + i * 40, H * 0.76 + (i % 2) * 14, 26, 3);
      x.fillStyle = '#20262e'; x.beginPath(); x.moveTo(40, H * 0.74); x.lineTo(210, H * 0.74); x.lineTo(180, H * 0.68); x.lineTo(70, H * 0.68); x.fill();
      x.fillStyle = '#f2f2ee'; x.beginPath(); x.moveTo(106, H * 0.68); x.lineTo(150, H * 0.68); x.lineTo(141, H * 0.26); x.lineTo(115, H * 0.26); x.fill();
      x.fillStyle = '#b02a25'; x.fillRect(110, H * 0.5, 36, 26); x.fillRect(113, H * 0.33, 30, 20); x.fillRect(110, H * 0.2, 36, 22);
      x.fillStyle = '#fff3b0'; x.fillRect(117, H * 0.215, 22, 12); x.fillStyle = 'rgba(255,243,176,0.35)'; x.beginPath(); x.moveTo(128, H * 0.23); x.lineTo(0, H * 0.1); x.lineTo(0, H * 0.2); x.fill();
      x.fillStyle = '#fff'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.fillText('MÖWENBRÜCK', B / 2, H - 16);
    } else if (art === 'handball') {       // Poster vom Handballverein
      x.fillStyle = '#12305e'; x.fillRect(0, 0, B, H); x.fillStyle = '#f0c030'; x.fillRect(0, H * 0.62, B, 10);
      x.fillStyle = '#f2f2ee'; x.beginPath(); x.arc(B / 2, H * 0.34, 62, 0, 7); x.fill(); x.strokeStyle = '#12305e'; x.lineWidth = 5;
      for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(B / 2 + (i - 1) * 62, H * 0.34, 62, -0.9, 0.9); x.stroke(); }
      x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = 'bold 30px sans-serif'; x.fillText('TSV MÖWENBRÜCK', B / 2, H * 0.74, B - 20); x.font = 'bold 22px sans-serif'; x.fillStyle = '#f0c030'; x.fillText('Kreismeister', B / 2, H * 0.84);
    } else if (art === 'urkunde') {       // die Urkunde der Polizeischule
      x.fillStyle = '#f6f1e2'; x.fillRect(0, 0, B, H); x.strokeStyle = '#b89a4a'; x.lineWidth = 8; x.strokeRect(14, 14, B - 28, H - 28); x.lineWidth = 2; x.strokeRect(26, 26, B - 52, H - 52);
      x.fillStyle = '#1d3f8a'; x.textAlign = 'center'; x.font = 'bold 30px serif'; x.fillText('URKUNDE', B / 2, 78); x.font = '15px serif'; x.fillStyle = '#333'; x.fillText('Polizeischule Nordküste', B / 2, 108);
      x.font = 'bold 24px serif'; x.fillStyle = '#111'; x.fillText('Kim Berger', B / 2, 168); x.fillStyle = '#777'; for (let i = 0; i < 4; i++) x.fillRect(50, 196 + i * 18, B - 100 - (i === 3 ? 60 : 0), 4);
      x.fillStyle = '#b02a25'; x.beginPath(); x.arc(B / 2, 300, 22, 0, 7); x.fill(); x.fillStyle = '#d9a521'; x.beginPath(); x.arc(B / 2, 300, 13, 0, 7); x.fill();
    } else if (art === 'familie') {       // Foto: Mama, Papa und Jule auf dem Deich
      x.fillStyle = '#9fd3f2'; x.fillRect(0, 0, B, H); x.fillStyle = '#6fae5a'; x.fillRect(0, H * 0.62, B, H * 0.38); x.fillStyle = '#5a9a4a'; x.beginPath(); x.moveTo(0, H * 0.62); x.quadraticCurveTo(B / 2, H * 0.5, B, H * 0.62); x.fill();
      x.fillStyle = '#fff6c0'; x.beginPath(); x.arc(B * 0.8, H * 0.16, 26, 0, 7); x.fill();
      [[70, '#c0392b', '#e8b890', '#8a5a2a', 1], [128, '#2c5a8a', '#f0c8a0', '#777', 1.08], [186, '#e0a030', '#f0c8a0', '#c08a3a', 0.86]].forEach(([px, hemd, haut, haar, gr]) => {
        const y = H * 0.74; x.fillStyle = hemd; x.fillRect(px - 20 * gr, y - 80 * gr, 40 * gr, 80 * gr); x.fillStyle = haut; x.beginPath(); x.arc(px, y - 100 * gr, 18 * gr, 0, 7); x.fill(); x.fillStyle = haar; x.beginPath(); x.arc(px, y - 106 * gr, 18 * gr, Math.PI, 2 * Math.PI); x.fill(); });
    } else {       // 'band': ein Konzertplakat
      x.fillStyle = '#16181c'; x.fillRect(0, 0, B, H); const far = ['#e74c3c', '#f0c030', '#3fa7d6']; for (let i = 0; i < 9; i++) { x.strokeStyle = far[i % 3]; x.lineWidth = 6; x.beginPath(); x.arc(B / 2, H * 0.42, 18 + i * 13, 0, 7); x.stroke(); }
      x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = 'bold 34px sans-serif'; x.fillText('NORDWIND', B / 2, H * 0.86); x.font = '16px sans-serif'; x.fillStyle = '#bbb'; x.fillText('Hafenbühne · live', B / 2, H * 0.93);
    }
  });
}

export const WOHN_FORMEN = ['bett', 'nachttisch', 'kleiderschrank', 'sofa', 'couchtisch', 'schreibtisch', 'buecherregal', 'gitarre', 'hanteln', 'waeschestaender',
  'pflanze', 'bar', 'barhocker', 'waschmaschine', 'wc', 'schuhregal', 'poster', 'getraenkekiste', 'konsole', 'vorhang', 'heizung', 'fussmatte', 'badematte', 'schluesselbrett', 'wandregal', 'sporttasche', 'wohnungstuer'];

export function wohnForm(q) {
  if (!WOHN_FORMEN.includes(q.form)) return null;
  const quer = q.t !== undefined && q.h !== undefined && Math.abs(Math.sin(q.dreh || 0)) > 0.7;
  const g = new THREE.Group(), f = q.farbe || HOLZ, b = (quer ? q.t : q.b) || 1, t = (quer ? q.b : q.t) || 1, h = q.h || 1;
  const dazu = m => { m.castShadow = true; g.add(m); return m; };
  const K = (kb, kh, kt, x, y, z, farbe = f, extra) => { const k = new THREE.Mesh(new THREE.BoxGeometry(kb, kh, kt), mat(farbe, extra)); k.position.set(x, y, z); return dazu(k); };
  const R = (r, hoch, x, y, z, farbe = f, achse = 'y', r2 = r, seg = 14) => { const k = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, hoch, seg), mat(farbe)); if (achse === 'x') k.rotation.z = Math.PI / 2; if (achse === 'z') k.rotation.x = Math.PI / 2; k.position.set(x, y, z); return dazu(k); };
  const S = (r, x, y, z, farbe = f, sy = 1, sx = 1, sz = 1) => { const k = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), mat(farbe)); k.position.set(x, y, z); k.scale.set(sx, sy, sz); return dazu(k); };
  const B = (bild, bb, bh, x, y, z) => { const k = new THREE.Mesh(new THREE.PlaneGeometry(bb, bh), new THREE.MeshLambertMaterial({ map: bild })); k.position.set(x, y, z); g.add(k); return k; };
  const L = (kb, kh, kt, x, y, z, farbe, leucht, stark = 0.8) => K(kb, kh, kt, x, y, z, farbe, { emissive: leucht, emissiveIntensity: stark });

  switch (q.form) {
    case 'bett': {       // Bett: Kopfteil hinten (−z), Matratze, Kissen, eine Decke, die nicht ganz ordentlich liegt
      const decke = q.decke || '#3f6a9a';
      K(b, 0.28, t, 0, 0.2, 0, f); K(b, 0.75, 0.07, 0, 0.5, -t / 2 + 0.035, dunkel(f, 0.85)); K(b, 0.3, 0.05, 0, 0.3, t / 2 - 0.025, dunkel(f, 0.85));
      K(b - 0.08, 0.18, t - 0.12, 0, 0.43, 0.01, '#eef0ee');
      K(b - 0.04, 0.1, t * 0.62, 0, 0.56, t * 0.17, decke); K(b - 0.2, 0.07, 0.3, 0.04, 0.6, -t * 0.12, dunkel(decke, 1.15)).rotation.y = 0.12;       // Decke, oben umgeschlagen
      K(0.56, 0.11, 0.36, -b / 4 + 0.03, 0.58, -t / 2 + 0.3, WEISS).rotation.y = 0.1; K(0.52, 0.1, 0.34, b / 4, 0.57, -t / 2 + 0.29, '#dfe6ee').rotation.y = -0.16;
      break; }
    case 'nachttisch': {       // Nachttisch mit Wecker (zwei Glocken), Lampe, Buch und Wasserglas
      K(0.46, 0.46, 0.4, 0, 0.27, 0, f); K(0.5, 0.03, 0.44, 0, 0.515, 0, dunkel(f, 0.8)); K(0.4, 0.17, 0.01, 0, 0.36, 0.205, dunkel(f, 1.1)); K(0.4, 0.17, 0.01, 0, 0.17, 0.205, dunkel(f, 1.1)); for (const y of [0.36, 0.17]) R(0.015, 0.03, 0, y, 0.22, CHROM, 'z');
      R(0.06, 0.035, -0.11, 0.6, 0.08, '#c0392b', 'z', 0.06, 18); R(0.05, 0.036, -0.11, 0.6, 0.082, WEISS, 'z', 0.05, 18); for (const sx of [-1, 1]) { S(0.024, -0.11 + sx * 0.04, 0.665, 0.08, '#d9a521'); K(0.012, 0.04, 0.012, -0.11 + sx * 0.035, 0.545, 0.08, SCHWARZ); }
      R(0.05, 0.02, 0.12, 0.54, -0.08, SCHWARZ); R(0.012, 0.2, 0.12, 0.64, -0.08, CHROM);
      { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.13, 14, 1, true), new THREE.MeshLambertMaterial({ color: '#fff3cf', emissive: '#ffd98a', emissiveIntensity: 0.9, side: THREE.DoubleSide })); s.position.set(0.12, 0.79, -0.08); g.add(s); }
      K(0.15, 0.03, 0.2, 0.1, 0.545, 0.1, '#2e7d32').rotation.y = 0.3; R(0.03, 0.09, -0.12, 0.575, -0.1, '#cfe6ff');
      break; }
    case 'kleiderschrank': {       // zweitüriger Schrank, obendrauf ein Karton und eine Reisetasche
      K(b, h, t, 0, h / 2 + 0.04, 0, f); K(b + 0.04, 0.04, t + 0.03, 0, h + 0.06, 0, dunkel(f, 0.8)); K(b - 0.06, 0.06, t - 0.06, 0, 0.03, 0, SCHWARZ);
      for (const sx of [-1, 1]) { K(b / 2 - 0.03, h - 0.1, 0.015, sx * b / 4, h / 2 + 0.04, t / 2 + 0.006, dunkel(f, 1.1)); K(0.02, 0.24, 0.03, sx * 0.05, h / 2 + 0.06, t / 2 + 0.025, CHROM); }
      K(0.5, 0.26, 0.38, -b / 4, h + 0.21, -0.03, '#c9a36a').rotation.y = 0.08; K(0.5, 0.02, 0.06, -b / 4, h + 0.345, -0.03, '#a8854f'); K(0.54, 0.22, 0.3, b / 4 - 0.02, h + 0.19, 0, '#2b3440'); R(0.01, 0.3, b / 4 - 0.02, h + 0.32, 0, SCHWARZ, 'x');
      break; }
    case 'sofa': {       // Zweisitzer mit Armlehnen, zwei Kissen und einer Wolldecke über der Lehne
      K(b, 0.26, t, 0, 0.25, 0, f); K(b, 0.5, 0.2, 0, 0.6, -t / 2 + 0.1, dunkel(f, 0.92)); for (const sx of [-1, 1]) K(0.18, 0.42, t, sx * (b / 2 - 0.09), 0.46, 0, dunkel(f, 0.86));
      const sitz = (b - 0.4) / 2; for (const sx of [-1, 1]) { K(sitz - 0.02, 0.12, t - 0.26, sx * sitz / 2, 0.43, 0.09, dunkel(f, 1.12)); K(sitz - 0.04, 0.32, 0.12, sx * sitz / 2, 0.66, -t / 2 + 0.25, dunkel(f, 1.08)).rotation.x = -0.14; }
      K(0.36, 0.3, 0.12, -b / 2 + 0.36, 0.63, -0.02, '#d9a521').rotation.set(-0.3, 0.3, 0); K(0.34, 0.28, 0.12, b / 2 - 0.4, 0.62, 0.0, '#3f6a9a').rotation.set(-0.3, -0.25, 0);
      K(0.6, 0.04, 0.5, b / 2 - 0.5, 0.87, -t / 2 + 0.14, '#a23b2e'); K(0.6, 0.34, 0.03, b / 2 - 0.5, 0.7, -t / 2 - 0.01, '#a23b2e');       // Wolldecke hängt über der Lehne
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) K(0.06, 0.12, 0.06, sx * (b / 2 - 0.1), 0.06, sz * (t / 2 - 0.1), SCHWARZ);
      break; }
    case 'couchtisch': {       // niedriger Tisch: Pizzakarton, Controller, Tasse, Handy, Fernbedienung
      K(b, 0.04, t, 0, h - 0.02, 0, f); K(b - 0.16, 0.03, t - 0.12, 0, 0.14, 0, dunkel(f, 0.85)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) K(0.05, h - 0.04, 0.05, sx * (b / 2 - 0.06), (h - 0.04) / 2, sz * (t / 2 - 0.06), dunkel(f, 0.7));
      if (!q.leer) { K(0.34, 0.04, 0.34, -b / 2 + 0.26, h + 0.02, 0.02, '#e9e2cf').rotation.y = 0.2; K(0.16, 0.002, 0.16, -b / 2 + 0.26, h + 0.042, 0.02, '#c0392b').rotation.y = 0.2; }
      K(0.15, 0.04, 0.1, 0.12, h + 0.02, 0.1, '#22262b').rotation.y = -0.4; R(0.04, 0.09, 0.3, h + 0.045, -0.1, '#1d3f8a'); K(0.07, 0.012, 0.15, b / 2 - 0.12, h + 0.006, 0.08, SCHWARZ).rotation.y = 0.5; K(0.05, 0.02, 0.17, 0.05, h + 0.01, -0.14, '#3a3f45').rotation.y = 1.1;
      K(0.26, 0.02, 0.2, 0.1, 0.165, 0, '#7a3a6a'); K(0.24, 0.02, 0.19, 0.11, 0.185, 0.01, '#f2f2ee');
      break; }
    case 'schreibtisch': {       // Schreibtisch mit Rechner: Bildschirm, Tastatur, Maus, Lampe, Lernkarten, Stadtplan
      K(b, 0.04, t, 0, h - 0.02, 0, f); K(0.04, h - 0.04, t - 0.06, -b / 2 + 0.04, (h - 0.04) / 2, 0, dunkel(f, 0.85)); K(0.42, h - 0.06, t - 0.08, b / 2 - 0.23, (h - 0.06) / 2 + 0.01, 0, dunkel(f, 0.9));
      for (let i = 0; i < 3; i++) { K(0.38, 0.19, 0.012, b / 2 - 0.23, 0.14 + i * 0.21, t / 2 - 0.03, dunkel(f, 1.1)); K(0.12, 0.02, 0.02, b / 2 - 0.23, 0.2 + i * 0.21, t / 2 - 0.015, CHROM); }
      K(0.18, 0.4, 0.42, -b / 2 + 0.2, 0.2, -0.04, '#22262b'); L(0.02, 0.02, 0.01, -b / 2 + 0.2, 0.34, 0.172, '#3fd0ff', '#3fd0ff', 1.6);       // der Rechner unter dem Tisch
      K(0.24, 0.02, 0.18, -0.1, h + 0.01, -0.16, SCHWARZ); K(0.04, 0.12, 0.03, -0.1, h + 0.07, -0.19, SCHWARZ); K(0.6, 0.36, 0.03, -0.1, h + 0.3, -0.16, '#15181c'); L(0.56, 0.32, 0.01, -0.1, h + 0.3, -0.142, '#1c3a5e', '#2f6fb5', 0.8);
      K(0.42, 0.02, 0.14, -0.1, h + 0.01, 0.1, SCHWARZ); K(0.06, 0.025, 0.1, 0.22, h + 0.012, 0.12, SCHWARZ); K(0.24, 0.004, 0.2, 0.22, h + 0.002, 0.11, '#3a3f45');
      R(0.07, 0.02, -b / 2 + 0.16, h + 0.01, -0.16, SCHWARZ); K(0.02, 0.3, 0.02, -b / 2 + 0.16, h + 0.16, -0.16, SCHWARZ).rotation.z = -0.25; K(0.18, 0.03, 0.08, -b / 2 + 0.26, h + 0.31, -0.16, SCHWARZ);
      R(0.04, 0.09, -b / 2 + 0.34, h + 0.045, 0.14, WEISS); for (let i = 0; i < 5; i++) K(0.13, 0.006, 0.09, b / 2 - 0.2, h + 0.004 + i * 0.006, 0.12, i % 2 ? '#fff6c2' : '#ffffff').rotation.y = (i - 2) * 0.09;
      K(0.3, 0.004, 0.22, b / 2 - 0.22, h + 0.003, -0.14, '#e9e2cf').rotation.y = -0.12; K(0.1, 0.005, 0.06, b / 2 - 0.2, h + 0.006, -0.12, '#9fc4dc').rotation.y = -0.12;
      break; }
    case 'buecherregal': {       // Regal mit Büchern, Pokal, Gesetzbüchern und einem kleinen Radio
      const n = Math.max(3, Math.round(h / 0.36)), w = zufall(b * 13 + h); for (const sx of [-1, 1]) K(0.03, h, t, sx * (b / 2 - 0.015), h / 2, 0, f); K(b, h, 0.02, 0, h / 2, -t / 2 + 0.01, dunkel(f, 0.85));
      for (let i = 0; i <= n; i++) { const y = 0.03 + i * (h - 0.05) / n; K(b - 0.04, 0.03, t, 0, y, 0, f); if (i === n) break;
        if (i === n - 1) { R(0.05, 0.03, -b / 4, y + 0.03, 0.02, '#3a2a20'); R(0.02, 0.08, -b / 4, y + 0.08, 0.02, '#d9a521'); S(0.07, -b / 4, y + 0.17, 0.02, '#d9a521', 0.9); for (const sx of [-1, 1]) K(0.03, 0.06, 0.015, -b / 4 + sx * 0.085, y + 0.17, 0.02, '#d9a521');       // der Pokal vom Handball
          K(0.22, 0.14, 0.12, b / 4, y + 0.085, 0, '#3a2f25'); R(0.035, 0.01, b / 4 - 0.05, y + 0.09, 0.062, '#c9a36a', 'z'); continue; }
        for (let x = -b / 2 + 0.05; x < b / 2 - 0.09; ) { const d = 0.03 + w() * 0.035, hoch = 0.2 + w() * 0.08; if (w() > 0.13) { const k = K(d - 0.004, hoch, t * 0.72, x + d / 2, y + 0.015 + hoch / 2, 0.01, i === 0 ? ['#b02a25', '#8a1f1c', '#22262b'][Math.floor(w() * 3)] : BUCH[Math.floor(w() * BUCH.length)]); if (w() > 0.9) k.rotation.z = 0.16; } x += d; } }
      break; }
    case 'gitarre': {       // Gitarre auf einem Ständer
      K(0.03, 0.5, 0.03, 0, 0.25, -0.1, SCHWARZ).rotation.x = -0.25; for (const sx of [-1, 1]) K(0.03, 0.03, 0.3, sx * 0.13, 0.02, 0, SCHWARZ); K(0.3, 0.03, 0.03, 0, 0.02, -0.02, SCHWARZ);
      const gi = new THREE.Group(); gi.position.set(0, 0.1, 0.02); gi.rotation.x = -0.22; g.add(gi);
      const teil = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = true; gi.add(m); return m; };
      const rund = (r, x, y, farbe) => { const m = teil(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.09, 20), mat(farbe)), x, y, 0); m.rotation.x = Math.PI / 2; return m; };
      rund(0.19, 0, 0.19, '#c98a3a'); rund(0.15, 0, 0.44, '#c98a3a'); teil(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.092, 14), mat('#2a1c10')), 0, 0.36, 0.001).rotation.x = Math.PI / 2;
      teil(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.56, 0.03), mat('#4a3320')), 0, 0.84, 0.03); teil(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.025), mat('#2a1c10')), 0, 1.19, 0.03); teil(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.03), mat('#2a1c10')), 0, 0.14, 0.05);
      break; }
    case 'hanteln': {       // Sport-Ecke: Matte, zwei Kurzhanteln, eine Kugelhantel, Springseil
      K(b, 0.02, t, 0, 0.012, 0, '#2f6f7a').castShadow = false;
      for (const [x, z, dr] of [[-0.3, 0.22, 0.3], [0.05, 0.3, -0.2]]) { const st = R(0.016, 0.3, x, 0.09, z, CHROM, 'x'); st.rotation.y = dr; for (const s of [-1, 1]) { const k = R(0.075, 0.07, x + Math.cos(dr) * s * 0.13, 0.09, z - Math.sin(dr) * s * 0.13, '#22262b', 'x', 0.075, 12); k.rotation.y = dr; } }
      S(0.11, b / 2 - 0.22, 0.12, -t / 2 + 0.25, '#22262b'); { const griff = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.017, 6, 12, Math.PI), mat('#22262b')); griff.position.set(b / 2 - 0.22, 0.2, -t / 2 + 0.25); griff.castShadow = true; g.add(griff); }
      { const seil = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 5, 14), mat('#c0392b')); seil.rotation.x = Math.PI / 2; seil.position.set(-b / 2 + 0.22, 0.035, -t / 2 + 0.22); g.add(seil); } R(0.016, 0.12, -b / 2 + 0.34, 0.04, -t / 2 + 0.24, SCHWARZ, 'x');
      break; }
    case 'waeschestaender': {       // Wäscheständer mit Socken, T-Shirt und Handtuch
      for (const sx of [-1, 1]) { K(0.02, 1.0, 0.02, sx * b / 2, 0.44, 0, CHROM).rotation.x = 0.5; K(0.02, 1.0, 0.02, sx * b / 2, 0.44, 0, CHROM).rotation.x = -0.5; }
      for (let i = 0; i < 7; i++) R(0.008, b, 0, 0.88, -0.36 + i * 0.12, CHROM, 'x', 0.008, 6);
      const w = zufall(5); for (let i = 0; i < 6; i++) K(0.07, 0.2, 0.012, -b / 2 + 0.1 + i * 0.1, 0.78, -0.36 + (i % 2) * 0.12, ['#22262b', '#f2f2ee', '#22262b', '#c0392b', '#f2f2ee', '#1d3f8a'][i]);
      K(0.42, 0.34, 0.014, b / 4, 0.71, 0.12, '#1d3f8a'); K(0.36, 0.3, 0.014, -b / 4, 0.73, 0.24, '#e9e2cf'); K(0.5, 0.42, 0.014, 0, 0.67, 0.36, '#3f6a9a'); w();
      break; }
    case 'pflanze': {       // Gummibaum im Topf (er heißt Horst)
      R(0.14, 0.26, 0, 0.13, 0, q.topf || '#b5613c', 'y', 0.18); R(0.165, 0.03, 0, 0.27, 0, dunkel(q.topf || '#b5613c', 0.85), 'y', 0.165); R(0.15, 0.01, 0, 0.262, 0, '#3a2a20', 'y', 0.15);
      R(0.02, h - 0.3, 0, 0.27 + (h - 0.3) / 2, 0, '#5a4632'); const w = zufall(h * 9);
      for (let i = 0; i < 11; i++) { const a = i * 2.4, y = 0.5 + (h - 0.5) * (i / 10), r = 0.2 - i * 0.008; const bl = S(0.13, Math.sin(a) * r, y, Math.cos(a) * r, i % 3 ? '#2f7a3a' : '#3d8f48', 0.22, 0.7, 1.25); bl.rotation.set(0.5 + w() * 0.3, a, 0); }
      break; }
    case 'bar': {       // Küchentresen: Platte auf einem Unterschrank, darauf Obstschale, Müsli und eine Tasse
      K(b, h - 0.05, t - 0.08, 0, (h - 0.05) / 2, 0.02, f); K(b + 0.06, 0.05, t + 0.14, 0, h - 0.025, -0.03, q.platte || '#4a4f57'); K(b, 0.08, t - 0.1, 0, 0.04, 0.02, SCHWARZ);
      R(0.13, 0.05, -b / 4, h + 0.025, 0, '#e9e2cf', 'y', 0.09); for (const [x, z, c] of [[-0.04, 0.02, '#e0a030'], [0.05, -0.03, '#c0392b'], [0.01, 0.05, '#6fae5a']]) S(0.045, -b / 4 + x, h + 0.075, z, c);
      K(0.14, 0.24, 0.06, b / 4, h + 0.12, 0.02, '#e0a030').rotation.y = 0.3; K(0.1, 0.1, 0.002, b / 4 + 0.01, h + 0.14, 0.052, '#c0392b').rotation.y = 0.3; R(0.04, 0.09, b / 4 + 0.22, h + 0.045, -0.04, '#f2f2ee');
      break; }
    case 'barhocker': R(0.17, 0.02, 0, 0.01, 0, SCHWARZ); R(0.02, 0.66, 0, 0.34, 0, CHROM); R(0.13, 0.015, 0, 0.26, 0, CHROM, 'y', 0.13, 14); R(0.17, 0.06, 0, 0.7, 0, q.farbe || '#a23b2e', 'y', 0.17, 16); break;
    case 'waschmaschine': {       // Waschmaschine mit rundem Fenster, obendrauf Waschmittel
      K(0.6, 0.85, 0.58, 0, 0.425, 0, WEISS); K(0.6, 0.12, 0.01, 0, 0.78, 0.295, '#dfe3e6'); R(0.035, 0.02, 0.2, 0.78, 0.3, CHROM, 'z'); L(0.1, 0.035, 0.01, -0.1, 0.78, 0.301, '#15181c', '#3fd0ff', 0.6);
      R(0.2, 0.03, 0, 0.42, 0.295, CHROM, 'z', 0.2, 20); R(0.155, 0.032, 0, 0.42, 0.297, '#27384d', 'z', 0.155, 20);
      K(0.12, 0.24, 0.08, -0.18, 0.97, -0.1, '#e67e22'); R(0.035, 0.05, -0.18, 1.11, -0.1, '#22262b'); K(0.2, 0.14, 0.14, 0.14, 0.92, -0.08, '#3f6a9a');
      break; }
    case 'wc': {       // Toilette mit Spülkasten, daneben Papier und Bürste
      K(0.38, 0.36, 0.2, 0, 0.62, -0.2, WEISS); K(0.1, 0.02, 0.04, 0, 0.81, -0.2, CHROM); R(0.17, 0.4, 0, 0.2, 0.08, WEISS, 'y', 0.2, 16).scale.z = 1.25; R(0.2, 0.035, 0, 0.415, 0.08, '#e3e6e8', 'y', 0.2, 16).scale.z = 1.25;
      R(0.055, 0.11, 0.34, 0.6, -0.26, WEISS, 'x'); K(0.02, 0.02, 0.1, 0.34, 0.6, -0.3, CHROM); R(0.05, 0.14, -0.32, 0.07, -0.2, WEISS); R(0.008, 0.36, -0.32, 0.25, -0.2, CHROM);
      break; }
    case 'schuhregal': {       // niedriges Regal mit Schuhen, obendrauf eine Schale für Kleingeld
      K(b, 0.03, t, 0, h, 0, f); K(b, 0.03, t, 0, h / 2, 0, f); K(b, 0.03, t, 0, 0.04, 0, f); for (const sx of [-1, 1]) K(0.03, h, t, sx * (b / 2 - 0.015), h / 2, 0, dunkel(f, 0.85));
      const paare = [['#f2f2ee', 0.07], ['#22262b', h / 2 + 0.03], ['#7a4a2a', 0.07], ['#c0392b', h / 2 + 0.03]];
      paare.forEach(([c, y], i) => { const x = -b / 2 + 0.16 + Math.floor(i / 2) * (b / 2 - 0.02) + (i % 2) * 0.05; for (const d of [0, 0.11]) { K(0.09, 0.07, 0.24, x + d, y + 0.035, 0.01, c); K(0.09, 0.05, 0.1, x + d, y + 0.085, -0.07, c); } });
      R(0.09, 0.03, b / 4, h + 0.03, 0, '#3f6a9a', 'y', 0.06); K(0.14, 0.02, 0.2, -b / 4, h + 0.025, 0, '#e9e2cf').rotation.y = 0.3;
      break; }
    case 'poster': {       // ein Bild an der Wand: q.bild = 'leuchtturm', 'handball', 'urkunde', 'familie' oder 'band' · q.rahmen = Farbe des Rahmens · q.hoch = Höhe der Mitte
      const hh = q.h || b * 1.4, y = q.hoch || 1.1; if (q.rahmen) K(b + 0.06, hh + 0.06, 0.03, 0, y, 0.005, q.rahmen); B(posterBild(q.bild || 'band'), b, hh, 0, y, 0.025);
      break; }
    case 'getraenkekiste': {       // eine Kiste Limo
      K(0.4, 0.26, 0.3, 0, 0.13, 0, q.farbe || '#c0392b'); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) R(0.03, 0.1, -0.15 + i * 0.1, 0.29, -0.1 + j * 0.1, (i + j) % 4 ? '#5a3a1a' : '#2e7d32'); break; }
    case 'konsole': {       // Spielkonsole mit zwei Controllern
      K(0.3, 0.07, 0.24, 0, 0.035, 0, '#f2f2ee'); L(0.04, 0.01, 0.005, -0.1, 0.035, 0.122, '#15181c', '#3fd0ff', 1.5);
      for (const [x, dr] of [[0.3, 0.3], [0.48, -0.5]]) { const k = K(0.15, 0.04, 0.09, x, 0.02, 0.05, x > 0.4 ? '#c0392b' : '#22262b'); k.rotation.y = dr; }
      break; }
    case 'vorhang': {       // ein Vorhang neben dem Fenster (in Falten)
      const n = Math.max(2, Math.round(b / 0.09)); for (let i = 0; i < n; i++) K(b / n + 0.005, h, 0.05, -b / 2 + (i + 0.5) * b / n, h / 2 + 0.06, i % 2 ? 0.02 : -0.02, i % 2 ? f : dunkel(f, 0.88));
      break; }
    case 'heizung': {       // Heizkörper unter dem Fenster
      const n = Math.round(b / 0.08); for (let i = 0; i < n; i++) K(0.055, 0.5, 0.08, -b / 2 + (i + 0.5) * b / n, 0.4, 0, WEISS); K(b, 0.03, 0.05, 0, 0.67, 0, WEISS); K(b, 0.03, 0.05, 0, 0.13, 0, WEISS); R(0.03, 0.06, b / 2 + 0.04, 0.6, 0, '#dfe3e6', 'x');
      break; }
    case 'fussmatte': K(b, 0.02, t, 0, 0.012, 0, '#8a6a3a').castShadow = false; K(b - 0.1, 0.021, t - 0.1, 0, 0.013, 0, '#a8844a').castShadow = false; break;
    case 'badematte': K(b, 0.03, t, 0, 0.018, 0, f).castShadow = false; break;
    case 'schluesselbrett': {       // Schlüsselbrett an der Wand: drei Haken, zwei Schlüssel
      K(0.4, 0.14, 0.025, 0, 1.2, 0.012, HOLZ_DUNKEL); for (let i = 0; i < 3; i++) { K(0.015, 0.015, 0.05, -0.12 + i * 0.12, 1.17, 0.04, CHROM); if (i < 2 && !q.leer) { K(0.03, 0.07, 0.008, -0.12 + i * 0.12, 1.11, 0.05, i ? CHROM : '#22262b'); R(0.02, 0.006, -0.12 + i * 0.12, 1.06, 0.05, i ? '#d9a521' : '#c0392b', 'z'); } }
      break; }
    case 'wandregal': {       // ein Brett an der Wand mit Kleinkram (q.hoch = Höhe)
      const y = q.hoch || 1.15; K(b, 0.03, 0.2, 0, y, 0.1, f); const w = zufall(b * 31 + y); for (let x = -b / 2 + 0.08; x < b / 2 - 0.06; x += 0.13 + w() * 0.05) { const art = w(); if (art < 0.4) R(0.035, 0.1 + w() * 0.05, x, y + 0.075, 0.1, BUCH[Math.floor(w() * BUCH.length)]); else if (art < 0.75) K(0.07, 0.16 + w() * 0.05, 0.1, x, y + 0.1, 0.1, BUCH[Math.floor(w() * BUCH.length)]); else S(0.045, x, y + 0.06, 0.1, '#d9a521'); }
      break; }
    case 'wohnungstuer': {       // die Wohnungstür von innen: Rahmen, Türblatt, Klinke, Guckloch, Kette
      K(1.06, 1.5, 0.05, 0, 0.75, -0.01, '#5d646b'); K(0.92, 1.44, 0.05, 0, 0.74, 0.02, q.farbe || '#e9e2cf'); K(0.74, 0.5, 0.01, 0, 1.05, 0.046, '#dcd4bf'); K(0.74, 0.5, 0.01, 0, 0.42, 0.046, '#dcd4bf');
      K(0.13, 0.025, 0.03, 0.32, 0.98, 0.07, CHROM); K(0.04, 0.14, 0.02, 0.38, 0.98, 0.05, CHROM); R(0.018, 0.02, 0, 1.32, 0.05, CHROM, 'z'); K(0.16, 0.012, 0.012, 0.36, 1.2, 0.05, CHROM);
      break; }
    case 'sporttasche': K(0.56, 0.26, 0.28, 0, 0.14, 0, f === HOLZ ? '#1d3f8a' : f); R(0.012, 0.36, 0, 0.3, 0, SCHWARZ, 'x'); K(0.2, 0.05, 0.005, 0, 0.16, 0.142, WEISS); S(0.095, 0.4, 0.095, 0.05, '#e9e2cf'); break;
  }
  return g;
}
