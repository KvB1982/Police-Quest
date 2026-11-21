// Blaulicht über Möwenbrück – Verkehr und Fußgänger (ohne three.js, läuft auch in node).
//
// Autos fahren auf dem Straßennetz aus stadtplan.js: immer rechts, von Kreuzung zu Kreuzung. An jeder Kreuzung würfeln sie,
// wohin es weitergeht. Sie halten Abstand, lassen an der Kreuzung immer nur ein Auto gleichzeitig fahren und bremsen,
// wenn jemand vor ihnen steht (auch du). Mit Blaulicht fahren alle in der Nähe rechts ran und halten: die Rettungsgasse.
// Fußgänger laufen auf dem Gehweg um ihren Häuserblock. Autos und Fußgänger gibt es nur in deiner Nähe –
// wer zu weit weg ist, wird woanders in der Nähe neu hingestellt. Alle Zahlen sind geschätzt.

import { PLAN, ortAuf, wuerfel } from './stadtplan.js';

export const AUTOS = 46, LEUTE = 44;
const TEMPO = 10.5;            // Meter pro Sekunde (etwa 38 km/h) – auf dem Ring etwas mehr, auf der Autobahn gut doppelt so viel
const WEG_AUTO = 340, NEU_AUTO = [110, 290];     // so weit weg wird ein Auto versetzt · in diesem Abstand taucht es neu auf
const WEG_MENSCH = 175, NEU_MENSCH = [28, 150];
const GASSE = 55;              // mit Blaulicht halten Autos in diesem Umkreis an
const spur = W => W.art === 'autobahn' ? 3.9 : W.b / 4 - 0.5;                 // so weit rechts von der Straßenmitte fährt ein Auto
const schnell = W => W.art === 'autobahn' ? 2.3 : W.art === 'ring' || W.b >= 14 ? 1.25 : W.art === 'rampe' ? 1.2 : 1;

const KLEIDER = ['#c0392b', '#2f6fb0', '#3d8a55', '#e0a030', '#7a4fa0', '#e8e4da', '#34495e', '#d2691e', '#5aa7c9', '#e86a8a'];
const HOSEN = ['#2a3a5a', '#333333', '#5a4a3a', '#3b5a7a', '#6a6a6a', '#1f2a33'];
const HAUT = ['#f0c8a0', '#e8b890', '#d8a878', '#b98560', '#8a5a3c'], HAAR = ['#5a3b22', '#222222', '#c9a24a', '#8a3a1a', '#b9b9b9', '#7a5a3a'];

export function neuerVerkehr(saat = 5) {
  const w = wuerfel(saat), zw = (a, b) => a + w() * (b - a);
  const K = PLAN.knoten, autos = [], leute = [], belegt = new Array(K.length).fill(null);
  // Das Netz für Autos: alle Kanten außer den Gassen. fahr[k] = die Kanten, die von Kreuzung k abgehen.
  const kanten = PLAN.kanten.filter(e => e.weg.art !== 'gasse'), fahr = K.map(() => []);
  for (const e of kanten) { fahr[e.a].push(e); fahr[e.b].push(e); }
  const gehwege = PLAN.wege.filter(W => W.art !== 'autobahn' && W.art !== 'rampe');

  // Ein Stück Straße befahren: Kante e, richtung +1 = von Kreuzung a nach b, −1 = von b nach a
  function strecke(c, e, richtung) {
    const von = richtung > 0 ? e.a : e.b, nach = richtung > 0 ? e.b : e.a;
    c.e = e; c.richtung = richtung; c.von = von; c.nach = nach; c.ab = spur(e.weg); c.max = TEMPO * schnell(e.weg);
    c.s0 = fahr[von].length > 1 ? K[von].rf : 0;                                        // hier beginnt das Stück hinter der Kreuzung
    c.s1 = e.l - K[nach].rf - (fahr[nach].length >= 3 ? 5 : fahr[nach].length === 1 ? 6 : 0.5);      // hier ist die Haltelinie vor der nächsten Kreuzung
    if (c.s1 < c.s0 + 2) { c.s0 = e.l * 0.35; c.s1 = e.l * 0.65; }                        // sehr kurzes Stück
    c.kurve = null;
  }
  // Ort auf der Spur: s Meter hinter der Start-Kreuzung, "rand" Meter weiter rechts. Zurück: [x, z, Richtung x, Richtung z]
  function ortAufSpur(c, s, rand = 0) {
    const o = ortAuf(c.e.weg, c.richtung > 0 ? c.e.s0 + s : c.e.s1 - s), dx = o[2] * c.richtung, dz = o[3] * c.richtung, ab = c.ab + rand;
    return [o[0] - dz * ab, o[1] + dx * ab, dx, dz];       // rechts von der Fahrtrichtung (dx, dz) ist (−dz, dx)
  }
  function setzeAuto(c, mx, mz, anfang) {
    for (let versuch = 0; versuch < 14; versuch++) {
      const e = kanten[Math.floor(w() * kanten.length)], d = Math.hypot(K[e.a].x - mx, K[e.a].z - mz);
      if (d > NEU_AUTO[1] + 60 || (!anfang && d < NEU_AUTO[0] - 60)) continue;
      strecke(c, e, w() < 0.5 ? 1 : -1);
      c.s = zw(c.s0, c.s1); const o = ortAufSpur(c, c.s); c.x = o[0]; c.z = o[1];
      const ab = Math.hypot(c.x - mx, c.z - mz);
      if (ab > NEU_AUTO[1] || ab < (anfang ? 30 : NEU_AUTO[0]) || autos.some(o2 => o2 !== c && o2.da && Math.hypot(o2.x - c.x, o2.z - c.z) < 16)) continue;
      c.h = Math.atan2(o[2], o[3]); c.v = c.max; c.rand = 0; c.da = true;
      return;
    }
    c.da = false;
  }
  // Fußgänger gehen auf dem Gehweg an einer Straße entlang (rechts oder links davon).
  const gehAb = W => W.art === 'gasse' ? W.b / 2 + 0.9 : W.b / 2 + 2.1;
  function menschZiel(m) {
    const o = ortAuf(m.W, m.s), ab = gehAb(m.W) * m.seite;
    m.zx = o[0] - o[3] * ab; m.zz = o[1] + o[2] * ab;
  }
  function setzeMensch(m, mx, mz, anfang) {
    for (let versuch = 0; versuch < 12; versuch++) {
      const W = gehwege[Math.floor(w() * gehwege.length)];
      m.W = W; m.s = zw(2, W.l - 2); m.seite = W.art === 'kai' || w() < 0.5 ? 1 : -1; m.richtung = w() < 0.5 ? 1 : -1;
      menschZiel(m);
      const d = Math.hypot(m.zx - mx, m.zz - mz);
      if (d > NEU_MENSCH[1] || (!anfang && d < NEU_MENSCH[0]) || (anfang && d < 6) || m.zz < -108) continue;
      m.x = m.zx; m.z = m.zz; m.h = 0; m.da = true; m.pause = 0; m.ecke = null; return;
    }
    m.da = false;
  }

  for (let i = 0; i < AUTOS; i++) autos.push({ art: Math.floor(w() * 4), farbe: Math.floor(w() * 8), da: false });
  for (let i = 0; i < LEUTE; i++) leute.push({ hemd: KLEIDER[Math.floor(w() * KLEIDER.length)], hose: HOSEN[Math.floor(w() * HOSEN.length)], haut: HAUT[Math.floor(w() * HAUT.length)], haar: HAAR[Math.floor(w() * HAAR.length)],
    gross: w() < 0.2 ? zw(0.62, 0.8) : zw(0.94, 1.06), tempo: zw(1.1, 1.6), schritt: w() * 6, geht: 0, da: false });

  let erstes = true;
  return {
    autos, leute,
    // dt = vergangene Zeit · sp = { x, z, r } wo du gerade bist (r = wie breit) · blaulicht = fährst du mit Blaulicht und Sirene?
    // imWeg = Liste von { x, z, r }: Dinge, die auf der Straße stehen (Unfallwagen, dein abgestellter Streifenwagen …)
    schritt(dt, sp, blaulicht, imWeg = []) {
      for (const c of autos) {
        if (!c.da || Math.hypot(c.x - sp.x, c.z - sp.z) > WEG_AUTO) { if (c.kurve) belegt[c.kurve.k] = null; setzeAuto(c, sp.x, sp.z, erstes); if (!c.da) continue; }
        const fx = Math.sin(c.h), fz = Math.cos(c.h);
        // Steht jemand vor mir? (ein anderes Auto oder du)
        let frei = 99;
        const pruefe = (x, z, breit) => { const ex = x - c.x, ez = z - c.z, vor = ex * fx + ez * fz, seite = Math.abs(ex * fz - ez * fx); if (vor > 0.5 && vor < 22 && seite < breit) frei = Math.min(frei, vor); };
        // Mitten in der Kreuzung zählen nur die Autos, die schon auf der neuen Straße vor mir fahren – sonst blockieren sich alle gegenseitig.
        for (const o of autos) if (o !== c && o.da && (!c.kurve || (o.e === c.e && o.richtung === c.richtung && !o.kurve))) pruefe(o.x, o.z, 1.7);
        pruefe(sp.x, sp.z, 1.2 + sp.r);
        for (const h of imWeg) pruefe(h.x, h.z, 1.2 + h.r);
        let ziel = frei < 7.5 ? 0 : frei < 14 ? TEMPO * 0.45 : frei < 22 ? Math.min(c.max, TEMPO) : c.max;
        const gasse = blaulicht && !c.kurve && Math.hypot(c.x - sp.x, c.z - sp.z) < GASSE;
        if (gasse) ziel = 0;
        c.rand += ((gasse ? 0.6 : 0) - c.rand) * Math.min(1, dt * 2);
        if (c.kurve) {
          c.v += Math.max(-9 * dt, Math.min(3 * dt, Math.min(ziel, Math.max(TEMPO * 0.6, c.max * k0(c.kurve))) - c.v)); c.v = Math.max(0, c.v);
          const k = c.kurve; k.u = Math.min(1, k.u + c.v * dt / k.lang);
          const u = k.u, q = 1 - u;
          c.x = q * q * k.p0[0] + 2 * q * u * k.p1[0] + u * u * k.p2[0]; c.z = q * q * k.p0[1] + 2 * q * u * k.p1[1] + u * u * k.p2[1];
          const tx = 2 * q * (k.p1[0] - k.p0[0]) + 2 * u * (k.p2[0] - k.p1[0]), tz = 2 * q * (k.p1[1] - k.p0[1]) + 2 * u * (k.p2[1] - k.p1[1]);
          if (Math.hypot(tx, tz) > 0.01) c.h = Math.atan2(tx, tz);
          if (u >= 1) { belegt[k.k] = null; c.s = c.s0; c.kurve = null; }
          continue;
        }
        // Vor der Haltelinie abbremsen, wenn die Kreuzung besetzt ist (oder wenn es dort um die Ecke geht)
        const k = c.nach, bisLinie = c.s1 - c.s, echte = fahr[k].length >= 3 || fahr[k].length === 1;
        const kreuzungFrei = !belegt[k] || belegt[k] === c;
        if (!kreuzungFrei && bisLinie < 14) ziel = Math.min(ziel, bisLinie < 1 ? 0 : TEMPO * 0.4);
        if (echte && bisLinie < 12 + c.v) ziel = Math.min(ziel, TEMPO * 0.6);
        c.v += Math.max(-9 * dt, Math.min(3 * dt, ziel - c.v)); c.v = Math.max(0, c.v);
        c.s += c.v * dt;
        if (c.s >= c.s1) {
          if (kreuzungFrei && !gasse) {       // in die Kreuzung einfahren: nächste Straße würfeln (nicht zurück und nicht in eine Sackgasse, wenn es anders geht)
            let n = fahr[k].filter(e => e !== c.e), gut = n.filter(e => fahr[e.a === k ? e.b : e.a].length > 1);
            if (gut.length) n = gut;
            if (!n.length) n = [c.e];
            const alt = ortAufSpur(c, c.s1);
            // am liebsten geradeaus weiter
            const gerade = n.map(e => { const o = ortAuf(e.weg, e.a === k ? e.s0 + Math.min(8, e.l / 2) : e.s1 - Math.min(8, e.l / 2)), d = Math.hypot(o[0] - K[k].x, o[1] - K[k].z) || 1; return [(o[0] - K[k].x) / d * alt[2] + (o[1] - K[k].z) / d * alt[3], e]; }).sort((a, b) => b[0] - a[0])[0];
            const nach = gerade[0] > 0.8 && w() < 0.6 ? gerade[1] : n[Math.floor(w() * n.length)];
            strecke(c, nach, nach.a === k ? 1 : -1);
            const neu = ortAufSpur(c, c.s0), p0 = [alt[0], alt[1]], p2 = [neu[0], neu[1]];
            // Der Bogen durch die Kreuzung: Er beginnt in der alten Richtung und endet in der neuen.
            const n2 = alt[2] * neu[3] - alt[3] * neu[2];
            let p1 = [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2];
            if (Math.abs(n2) > 0.2) { const t = ((p2[0] - p0[0]) * neu[3] - (p2[1] - p0[1]) * neu[2]) / n2; if (t > 0 && t < 60) p1 = [p0[0] + alt[2] * t, p0[1] + alt[3] * t]; }
            c.kurve = { p0, p1, p2, u: 0, k, gerade: Math.abs(n2) < 0.35 && alt[2] * neu[2] + alt[3] * neu[3] > 0, lang: Math.max(1, Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1])) };
            belegt[k] = c;
          } else { c.s = c.s1; c.v = 0; }
        }
        if (!c.kurve) { const o = ortAufSpur(c, c.s, c.rand); c.x = o[0]; c.z = o[1]; c.h = Math.atan2(o[2], o[3]); }
      }
      for (const m of leute) {
        if (!m.da || Math.hypot(m.x - sp.x, m.z - sp.z) > WEG_MENSCH) { setzeMensch(m, sp.x, sp.z, erstes); if (!m.da) continue; }
        if (m.pause > 0) { m.pause -= dt; m.geht = 0; continue; }
        m.geht = m.tempo; m.schritt += dt * m.tempo * 4.2;
        // Erst zur Ziel-Stelle auf dem Gehweg laufen; ist man dort, rückt die Ziel-Stelle ein Stück weiter.
        const weg = m.tempo * dt;
        if (m.ecke) { const ex = m.ecke[0] - m.x, ez = m.ecke[1] - m.z, ed = Math.hypot(ex, ez); if (ed < 0.3) m.ecke = null; else { const f = Math.min(1, weg / ed); m.x += ex * f; m.z += ez * f; m.h = Math.atan2(ex, ez); continue; } }
        const dx = m.zx - m.x, dz = m.zz - m.z, d = Math.hypot(dx, dz);
        if (d > 0.02) { const f = Math.min(1, weg / d); m.x += dx * f; m.z += dz * f; m.h = Math.atan2(dx, dz); }
        if (d > 1.2) continue;
        const alt = m.s; m.s += m.richtung * weg;
        const q = m.W.kreuz.find(q => (q.s - alt) * (q.s - m.s) <= 0 && q.grad > 1), ende = m.s < 1.5 || m.s > m.W.l - 1.5;
        if (ende || (q && w() < 0.35)) {       // an einer Kreuzung oder am Ende der Straße: abbiegen, umdrehen oder kurz stehen bleiben
          const hier = q || m.W.kreuz.find(q => Math.abs(q.s - m.s) < 3);
          const andere = hier ? PLAN.knoten[hier.k].kanten.filter(e => e.weg !== m.W && e.weg.art !== 'autobahn' && e.weg.art !== 'rampe') : [];
          if (andere.length && w() < 0.8) {
            const e = andere[Math.floor(w() * andere.length)], k = hier.k;
            const o1 = ortAuf(m.W, hier.s), ab1 = gehAb(m.W) * m.seite, alteSeite = [-o1[3] * ab1, o1[2] * ab1];
            m.W = e.weg; m.richtung = e.a === k ? 1 : -1; m.s = (e.a === k ? e.s0 : e.s1) + m.richtung * (PLAN.knoten[k].r + 2);
            m.seite = m.W.art === 'kai' || w() < 0.5 ? 1 : -1;
            // Erst um die Hausecke herum: die Ecke, an der sich der alte und der neue Gehweg treffen
            const o2 = ortAuf(m.W, e.a === k ? e.s0 : e.s1), ab2 = gehAb(m.W) * m.seite;
            m.ecke = [PLAN.knoten[k].x + alteSeite[0] - o2[3] * ab2, PLAN.knoten[k].z + alteSeite[1] + o2[2] * ab2];
          } else if (ende) { m.richtung = -m.richtung; m.s = Math.max(1.6, Math.min(m.W.l - 1.6, m.s)); if (w() < 0.5) m.seite = m.W.art === 'kai' ? 1 : -m.seite; }
          if (w() < 0.3) m.pause = zw(1.5, 5);
        }
        m.s = Math.max(0.5, Math.min(m.W.l - 0.5, m.s));
        menschZiel(m);
      }
      erstes = false;
    },
  };
}
// In einer Kurve fährt ein Auto langsamer als geradeaus.
const k0 = kurve => kurve.gerade ? 1 : 0;
