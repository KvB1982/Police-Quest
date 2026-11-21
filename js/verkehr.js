// Blaulicht über Möwenbrück – Verkehr und Fußgänger (ohne three.js, läuft auch in node).
//
// Autos fahren auf dem Straßennetz aus stadtplan.js: immer rechts, von Kreuzung zu Kreuzung. An jeder Kreuzung würfeln sie,
// wohin es weitergeht. Sie halten Abstand, lassen an der Kreuzung immer nur ein Auto gleichzeitig fahren und bremsen,
// wenn jemand vor ihnen steht (auch du). Mit Blaulicht fahren alle in der Nähe rechts ran und halten: die Rettungsgasse.
// Fußgänger laufen auf dem Gehweg um ihren Häuserblock. Autos und Fußgänger gibt es nur in deiner Nähe –
// wer zu weit weg ist, wird woanders in der Nähe neu hingestellt. Alle Zahlen sind geschätzt.

import { PLAN, STRASSEN_X, STRASSEN_Z, wuerfel } from './stadtplan.js';

export const AUTOS = 46, LEUTE = 40;
const TEMPO = 10.5;            // Meter pro Sekunde (etwa 38 km/h)
const WEG_AUTO = 340, NEU_AUTO = [110, 290];     // so weit weg wird ein Auto versetzt · in diesem Abstand taucht es neu auf
const WEG_MENSCH = 175, NEU_MENSCH = [28, 150];
const GASSE = 55;              // mit Blaulicht halten Autos in diesem Umkreis an
const NX = STRASSEN_X.length, NZ = STRASSEN_Z.length;
const spur = s => s.b / 4 - 0.5;                 // so weit rechts von der Straßenmitte fährt ein Auto

const KLEIDER = ['#c0392b', '#2f6fb0', '#3d8a55', '#e0a030', '#7a4fa0', '#e8e4da', '#34495e', '#d2691e', '#5aa7c9', '#e86a8a'];
const HOSEN = ['#2a3a5a', '#333333', '#5a4a3a', '#3b5a7a', '#6a6a6a', '#1f2a33'];
const HAUT = ['#f0c8a0', '#e8b890', '#d8a878', '#b98560', '#8a5a3c'], HAAR = ['#5a3b22', '#222222', '#c9a24a', '#8a3a1a', '#b9b9b9', '#7a5a3a'];

export function neuerVerkehr(saat = 5) {
  const w = wuerfel(saat), zw = (a, b) => a + w() * (b - a);
  const autos = [], leute = [], belegt = new Array(NX * NZ).fill(null);
  const knoten = (i, j) => [STRASSEN_X[i].p, STRASSEN_Z[j].p];
  const nachbarn = (i, j) => [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < NX && b < NZ);
  const bloecke = PLAN.bloecke.filter(b => b.typ !== 'kanal' && b.typ !== 'bahn');

  // Ein Stück Straße von Kreuzung a nach Kreuzung b einrichten
  function strecke(c, a, b) {
    const [ax, az] = knoten(...a), [bx, bz] = knoten(...b), l = Math.hypot(bx - ax, bz - az);
    c.a = a; c.b = b; c.dx = (bx - ax) / l; c.dz = (bz - az) / l; c.l = l;
    const str = a[0] === b[0] ? STRASSEN_X[a[0]] : STRASSEN_Z[a[1]];
    c.ab = spur(str);
    c.s0 = (a[0] === b[0] ? STRASSEN_Z[a[1]] : STRASSEN_X[a[0]]).b / 2 + 2.5;        // hier beginnt das gerade Stück hinter der Kreuzung
    c.s1 = l - (a[0] === b[0] ? STRASSEN_Z[b[1]] : STRASSEN_X[b[0]]).b / 2 - 7.5;    // hier ist die Haltelinie vor der nächsten Kreuzung
    c.kurve = null;
  }
  // Ort auf der Spur: s Meter hinter Kreuzung a, "rand" Meter weiter rechts
  function ortAuf(c, s, rand = 0) {
    const [ax, az] = knoten(...c.a), ab = c.ab + rand;
    return [ax + c.dx * s - c.dz * ab, az + c.dz * s + c.dx * ab];       // rechts von der Fahrtrichtung (dx, dz) ist (−dz, dx)
  }
  function setzeAuto(c, mx, mz, anfang) {
    for (let versuch = 0; versuch < 12; versuch++) {
      const i = Math.floor(w() * NX), j = Math.floor(w() * NZ), [x, z] = knoten(i, j), d = Math.hypot(x - mx, z - mz);
      if (!anfang && (d < NEU_AUTO[0] || d > NEU_AUTO[1])) continue;
      if (anfang && d > NEU_AUTO[1]) continue;
      const n = nachbarn(i, j), b = n[Math.floor(w() * n.length)];
      strecke(c, [i, j], b);
      c.s = zw(c.s0, c.s1); [c.x, c.z] = ortAuf(c, c.s);
      if (Math.hypot(c.x - mx, c.z - mz) < (anfang ? 30 : NEU_AUTO[0] * 0.8) || autos.some(o => o !== c && o.x !== undefined && Math.hypot(o.x - c.x, o.z - c.z) < 14)) continue;
      c.h = Math.atan2(c.dx, c.dz); c.v = TEMPO; c.rand = 0; c.da = true;
      return;
    }
    c.da = false;
  }
  function setzeMensch(m, mx, mz, anfang) {
    for (let versuch = 0; versuch < 10; versuch++) {
      const B = bloecke[Math.floor(w() * bloecke.length)], r = B.zelle;
      if (r[2] < mx - 190 || r[0] > mx + 190 || r[3] < mz - 190 || r[1] > mz + 190) continue;
      const eng = B.typ === 'speicher' ? 0.45 : 2;        // die Speicher stehen fast bis an die Straße
      m.r = [r[0] + 2, r[1] + eng, r[2] - 2, r[3] - eng]; m.kante = Math.floor(w() * 4); m.richtung = w() < 0.5 ? 1 : -1;
      m.s = w() * kantenLang(m); menschOrt(m);
      const d = Math.hypot(m.x - mx, m.z - mz);
      if (d > NEU_MENSCH[1] || (!anfang && d < NEU_MENSCH[0]) || (anfang && d < 6)) continue;
      m.da = true; m.pause = 0; return;
    }
    m.da = false;
  }
  const kantenLang = m => m.kante % 2 ? m.r[3] - m.r[1] : m.r[2] - m.r[0];
  // Kanten im Uhrzeigersinn (von oben gesehen): 0 = Nordseite nach Osten, 1 = Ostseite nach Süden, 2 = Südseite nach Westen, 3 = Westseite nach Norden
  function menschOrt(m) {
    const [x1, z1, x2, z2] = m.r, s = m.s;
    [m.x, m.z, m.h] = m.kante === 0 ? [x1 + s, z1, Math.PI / 2] : m.kante === 1 ? [x2, z1 + s, 0] : m.kante === 2 ? [x2 - s, z2, -Math.PI / 2] : [x1, z2 - s, Math.PI];
    if (m.richtung < 0) m.h += Math.PI;
  }

  for (let i = 0; i < AUTOS; i++) autos.push({ art: Math.floor(w() * 4), farbe: Math.floor(w() * 8), da: false });
  for (let i = 0; i < LEUTE; i++) leute.push({ hemd: KLEIDER[Math.floor(w() * KLEIDER.length)], hose: HOSEN[Math.floor(w() * HOSEN.length)], haut: HAUT[Math.floor(w() * HAUT.length)], haar: HAAR[Math.floor(w() * HAAR.length)],
    gross: w() < 0.2 ? zw(0.62, 0.8) : zw(0.94, 1.06), tempo: zw(1.1, 1.6), schritt: w() * 6, geht: 0, da: false });

  let erstes = true;
  return {
    autos, leute,
    // dt = vergangene Zeit · sp = { x, z, r } wo du gerade bist (r = wie breit) · blaulicht = fährst du mit Blaulicht?
    schritt(dt, sp, blaulicht) {
      for (const c of autos) {
        if (!c.da || Math.hypot(c.x - sp.x, c.z - sp.z) > WEG_AUTO) { if (c.kurve) belegt[c.kurve.k] = null; setzeAuto(c, sp.x, sp.z, erstes); if (!c.da) continue; }
        const fx = Math.sin(c.h), fz = Math.cos(c.h);
        // Steht jemand vor mir? (ein anderes Auto oder du)
        let frei = 99;
        const pruefe = (x, z, breit) => { const ex = x - c.x, ez = z - c.z, vor = ex * fx + ez * fz, seite = Math.abs(ex * fz - ez * fx); if (vor > 0.5 && vor < 16 && seite < breit) frei = Math.min(frei, vor); };
        for (const o of autos) if (o !== c && o.da) pruefe(o.x, o.z, 1.7);
        pruefe(sp.x, sp.z, 1.2 + sp.r);
        let ziel = frei < 7.5 ? 0 : frei < 14 ? TEMPO * 0.45 : TEMPO;
        const gasse = blaulicht && !c.kurve && Math.hypot(c.x - sp.x, c.z - sp.z) < GASSE;
        if (gasse) ziel = 0;
        c.rand += ((gasse ? 0.6 : 0) - c.rand) * Math.min(1, dt * 2);
        if (c.kurve) {
          c.v += Math.max(-9 * dt, Math.min(3 * dt, Math.min(ziel, TEMPO * 0.6) - c.v)); c.v = Math.max(0, c.v);
          const k = c.kurve; k.u = Math.min(1, k.u + c.v * dt / k.lang);
          const u = k.u, q = 1 - u;
          c.x = q * q * k.p0[0] + 2 * q * u * k.p1[0] + u * u * k.p2[0]; c.z = q * q * k.p0[1] + 2 * q * u * k.p1[1] + u * u * k.p2[1];
          const tx = 2 * q * (k.p1[0] - k.p0[0]) + 2 * u * (k.p2[0] - k.p1[0]), tz = 2 * q * (k.p1[1] - k.p0[1]) + 2 * u * (k.p2[1] - k.p1[1]);
          if (Math.hypot(tx, tz) > 0.01) c.h = Math.atan2(tx, tz);
          if (u >= 1) { belegt[k.k] = null; c.s = k.s; c.kurve = null; c.h = Math.atan2(c.dx, c.dz); }
          continue;
        }
        // Vor der Haltelinie abbremsen, wenn die Kreuzung besetzt ist
        const k = c.b[1] * NX + c.b[0], bisLinie = c.s1 - c.s;
        const kreuzungFrei = !belegt[k] || belegt[k] === c;
        if (!kreuzungFrei && bisLinie < 14) ziel = Math.min(ziel, bisLinie < 1 ? 0 : TEMPO * 0.4);
        if (bisLinie < 12) ziel = Math.min(ziel, TEMPO * 0.6);
        c.v += Math.max(-9 * dt, Math.min(3 * dt, ziel - c.v)); c.v = Math.max(0, c.v);
        c.s += c.v * dt;
        if (c.s >= c.s1) {
          if (kreuzungFrei && !gasse) {       // in die Kreuzung einfahren: nächste Straße würfeln (nicht zurück, wenn es anders geht)
            let n = nachbarn(...c.b).filter(([a, b]) => a !== c.a[0] || b !== c.a[1]);
            if (!n.length) n = [c.a];
            const gerade = n.find(([a, b]) => a - c.b[0] === c.b[0] - c.a[0] && b - c.b[1] === c.b[1] - c.a[1]);
            const nach = gerade && w() < 0.55 ? gerade : n[Math.floor(w() * n.length)];
            const p0 = ortAuf(c, c.s1), alt = { dx: c.dx, dz: c.dz, ab: c.ab, b: c.b };
            strecke(c, alt.b, nach);
            const p2 = ortAuf(c, c.s0), [bx, bz] = knoten(...alt.b);
            const istGerade = Math.abs(alt.dx * c.dx + alt.dz * c.dz) > 0.9;
            const p1 = istGerade ? [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2] : [bx - alt.dz * alt.ab - c.dz * c.ab, bz + alt.dx * alt.ab + c.dx * c.ab];
            c.kurve = { p0, p1, p2, u: 0, k, s: c.s0, lang: Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) };
            belegt[k] = c;
          } else { c.s = c.s1; c.v = 0; }
        }
        if (!c.kurve) [c.x, c.z] = ortAuf(c, c.s, c.rand);
      }
      for (const m of leute) {
        if (!m.da || Math.hypot(m.x - sp.x, m.z - sp.z) > WEG_MENSCH) { setzeMensch(m, sp.x, sp.z, erstes); if (!m.da) continue; }
        if (m.pause > 0) { m.pause -= dt; m.geht = 0; continue; }
        m.geht = m.tempo; m.schritt += dt * m.tempo * 4.2;
        m.s += m.tempo * dt;
        if (m.s >= kantenLang(m)) {       // an der Ecke: meistens um die Ecke weiter, manchmal umdrehen, manchmal kurz stehen bleiben
          if (w() < 0.25) { m.richtung = -m.richtung; m.s = 0; }
          else { m.kante = (m.kante + (m.richtung > 0 ? 1 : 3)) % 4; m.s = 0; }
          if (w() < 0.3) m.pause = zw(1.5, 5);
        }
        const s = m.s; if (m.richtung < 0) m.s = kantenLang(m) - s;
        menschOrt(m); m.s = s;
      }
      erstes = false;
    },
  };
}
