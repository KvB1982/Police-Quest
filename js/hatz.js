// Blaulicht über Möwenbrück – Verfolgung zu Fuß: was der Flüchtende tut.
//
// Hier wird nur gerechnet (ohne three.js, in node testbar: node tools/hatz.mjs). Das Bild dazu macht main.js.
//
// So läuft eine Verfolgung:
//   · Der Flüchtende rennt eine Runde aus Wegpunkten entlang. Am Anfang ist er schneller als du, dann wird er müde.
//   · Steht ihm jemand im Weg (ein Kollege, Otto oder du selbst), schlägt er einen Haken und rennt in die andere Richtung.
//   · Ist auch dort jemand, sitzt er in der Falle: Er bleibt stehen und hebt die Hände ("gestellt").
//   · An manchen Wegpunkten reißt er Kisten um. Wer hineinläuft, stolpert und verliert Zeit – also außen herum laufen.
//   · Bist du nah genug, drückst du den großen Knopf: zu Boden stoßen oder festhalten (zugreifen). Daneben gegriffen = du strauchelst kurz.
//   · Ist er zu weit weg oder dauert es zu lange, ist er entwischt. Dann geht es von vorn los.
//
// Die Beschreibung einer Verfolgung (def) steht in story.js:
//   { weg: [[x, z], …]   die Runde (der erste Punkt ist dort, wo er losläuft; nach dem letzten geht es wieder zum ersten)
//     tempo: 4.9         so schnell ist er am Anfang (du läufst 4,6 m/s)
//     tempoMin: 3.7      langsamer wird er nicht
//     muede: 0.035       so viel langsamer wird er in jeder Sekunde
//     griff: 'stoss'     was der Knopf tut: 'stoss' = zu Boden stoßen, 'halt' = festhalten
//     wurf: [2, 5]       an diesen Wegpunkten reißt er etwas um
//     sperren: [[x, z]]  Stellen, an denen Kollegen ihm den Weg abschneiden (für main.js)
//     zeit: 60           nach so vielen Sekunden ist er entwischt (sonst ZEIT_MAX)
//     otto: [x, z]       dorthin läuft Otto (für main.js) }

export const KIM_TEMPO = 4.6;        // so schnell läufst du (m/s) – steht auch in main.js (LAUF_TEMPO)
export const GRIFF_NAH = 2.4;        // so nah (Meter) musst du sein, damit der Knopf erscheint
export const GRIFF_WEIT = 3.0;       // so nah muss er beim Drücken wirklich noch sein, sonst greifst du daneben
export const SPERR_WEIT = 6.5;       // so weit vor sich sieht er jemanden im Weg stehen
export const WEG_WEIT = 30;          // ist er so viele Meter weg …
export const WEG_ZEIT = 5;           // … und bleibt es so viele Sekunden lang, ist er entwischt (er läuft im Kreis: Wer abkürzt, holt wieder auf)
export const ZEIT_MAX = 80;          // nach so vielen Sekunden ist er auf jeden Fall weg
const HAKEN_PAUSE = 1.6;             // so lange nach einem Haken schlägt er nicht gleich den nächsten
const FALLE_ZEIT = 3.2;              // schlägt er in so kurzer Zeit zwei Haken, sitzt er in der Falle
const GUMMI_AB = 24, GUMMI_MAL = 0.85;   // ist er weiter weg als so, läuft er langsamer (er schaut sich um) – sonst wäre er sofort verschwunden
const SPURT_NAH = 4.5, SPURT_MAL = 1.22, SPURT_LANG = 1.1, SPURT_PAUSE = 7;   // kommst du nah, legt er einen kurzen Spurt ein
const KISTE_NAH = 1.1, STOLPER_MAL = 0.42, STOLPER_LANG = 1.1;   // so nah an einer Kiste stolperst du, so langsam bist du dann, so lange
const DANEBEN_MAL = 0.5, DANEBEN_LANG = 0.6;                     // daneben gegriffen: kurz langsamer
const ANLAUF = 5;                    // so schnell kommt er in Schwung (m/s in jeder Sekunde)

const weit = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

// Eine neue Verfolgung. Der Flüchtende steht am ersten Wegpunkt (oder bei start = [x, z]).
export function neueHatz(def, start) {
  const weg = def.weg.map(p => [p[0], p[1]]);
  const [x, z] = start || weg[0];
  return { def, weg, x, z, h: 0, v: 0, i: start ? 0 : 1 % weg.length, richtung: 1,
    tempo: def.tempo ?? 4.9, tempoMin: def.tempoMin ?? 3.7, muede: def.muede ?? 0.035,
    zeit: 0, phase: 'lauf', abstand: 99, nah: false, fern: 0,
    hakenZeit: -9, haken: 0, spurt: 0, spurtFrei: 3, kimMal: 1, kimLangsam: 0,
    wurfDa: new Set(def.wurf || []), kisten: [], vorlauf: false, vorWeg: 0 };
}

// Steht jemand vor ihm im Weg? Geprüft wird der Weg zum nächsten Wegpunkt.
function versperrt(H, leute, zuX, zuZ) {
  const dx = zuX - H.x, dz = zuZ - H.z, d = Math.hypot(dx, dz) || 1, rx = dx / d, rz = dz / d;
  for (const p of leute) {
    const px = p.x - H.x, pz = p.z - H.z, vor = px * rx + pz * rz, quer = Math.abs(px * rz - pz * rx);
    if (vor > 0.3 && vor < SPERR_WEIT && quer < 2.6) return true;
  }
  return false;
}

// Ein Schritt. kim = { x, z }, helfer = [{ x, z }, …] (alle, die ihm den Weg abschneiden können).
// Zurück kommt eine Liste mit dem, was gerade passiert ist: 'haken', 'gestellt', 'wurf' (mit x, z), 'stolper', 'spurt', 'weg'.
export function hatzSchritt(H, dt, kim, helfer = []) {
  const was = [];
  H.abstand = weit(kim.x, kim.z, H.x, H.z);
  if (H.kimLangsam > 0 && (H.kimLangsam -= dt) <= 0) H.kimMal = 1;
  if (H.phase !== 'lauf') { H.v = 0; H.nah = H.phase === 'gestellt' && H.abstand < GRIFF_WEIT + 0.4; return was; }
  H.zeit += dt;
  const n = H.weg.length;
  let ziel = H.weg[H.i];
  // Im Vorlauf (die Geschichte erzählt noch) rennt er nur ein Stück voraus und wartet dann, bis du loslaufen darfst.
  if (H.vorlauf && H.vorWeg > (H.def.vorlauf ?? 13)) { H.v = 0; return was; }
  // Jemand im Weg? Haken schlagen – oder aufgeben, wenn es in beide Richtungen nicht weitergeht.
  if (!H.vorlauf && H.zeit - H.hakenZeit > HAKEN_PAUSE) {
    const alle = helfer.concat([kim]);
    if (versperrt(H, alle, ziel[0], ziel[1])) {
      const zurueck = H.weg[(H.i - H.richtung + n) % n];
      // In der Falle sitzt er nur zwischen dir und einem Kollegen von der Streife. Otto (halb) ist dafür zu langsam: Vor ihm schlägt er nur einen Haken.
      const ganze = helfer.filter(p => !p.halb);
      const beide = ganze.length > 0 && (versperrt(H, ganze.concat([kim]), zurueck[0], zurueck[1]) || H.zeit - H.hakenZeit < FALLE_ZEIT);
      if (beide) { H.phase = 'gestellt'; H.v = 0; H.h = Math.atan2(kim.x - H.x, kim.z - H.z); was.push({ art: 'gestellt' }); return was; }
      H.richtung = -H.richtung; H.i = (H.i + H.richtung + n) % n; H.hakenZeit = H.zeit; H.haken++; ziel = H.weg[H.i];
      was.push({ art: 'haken' });
    }
  }
  // Wie schnell? Er wird müde. Weit vorn bummelt er, kommst du nah, spurtet er kurz.
  let soll = Math.max(H.tempoMin, H.tempo - H.muede * H.zeit);
  if (H.abstand > GUMMI_AB) soll *= GUMMI_MAL;
  H.spurtFrei -= dt;
  if (H.spurt > 0) { H.spurt -= dt; soll *= SPURT_MAL; }
  else if (!H.vorlauf && H.abstand < SPURT_NAH && H.spurtFrei <= 0 && H.def.spurt !== false) { H.spurt = SPURT_LANG; H.spurtFrei = SPURT_PAUSE; was.push({ art: 'spurt' }); }
  H.v = Math.min(soll, H.v + ANLAUF * dt);
  // Laufen: zum nächsten Wegpunkt, dort weiter zum übernächsten
  let rest = H.v * dt;
  for (let k = 0; k < 4 && rest > 0; k++) {
    const dx = ziel[0] - H.x, dz = ziel[1] - H.z, d = Math.hypot(dx, dz);
    if (d > 0.01) H.h = Math.atan2(dx, dz);
    if (d > rest) { H.x += dx / d * rest; H.z += dz / d * rest; break; }
    H.x = ziel[0]; H.z = ziel[1]; rest -= d;
    if (H.wurfDa.has(H.i) && !H.vorlauf) { H.wurfDa.delete(H.i); const kiste = { x: H.x, z: H.z, zeit: H.zeit, getroffen: false }; H.kisten.push(kiste); was.push({ art: 'wurf', x: H.x, z: H.z }); }
    H.i = (H.i + H.richtung + n) % n; ziel = H.weg[H.i];
  }
  if (H.vorlauf) { H.vorWeg += H.v * dt; return was; }
  // Umgerissene Kisten: Wer hineinläuft, stolpert (einmal je Kiste). Eine halbe Sekunde hat man Zeit zum Ausweichen.
  for (const kiste of H.kisten) if (!kiste.getroffen && H.zeit - kiste.zeit > 0.25 && weit(kim.x, kim.z, kiste.x, kiste.z) < KISTE_NAH) {
    kiste.getroffen = true; H.kimMal = STOLPER_MAL; H.kimLangsam = STOLPER_LANG; was.push({ art: 'stolper' });
  }
  H.abstand = weit(kim.x, kim.z, H.x, H.z);
  H.nah = H.abstand < GRIFF_NAH;
  H.fern = H.abstand > WEG_WEIT ? H.fern + dt : 0;
  if (H.fern > WEG_ZEIT || H.zeit > (H.def.zeit ?? ZEIT_MAX)) { H.phase = 'weg'; was.push({ art: 'weg' }); }
  return was;
}

// Der große Knopf wurde gedrückt. Zurück kommt 'stoss', 'halt', 'gestellt' (er hatte schon aufgegeben) oder null (daneben gegriffen).
export function hatzGriff(H) {
  if (H.phase === 'gestellt') { if (H.abstand > GRIFF_WEIT + 0.4) return null; H.phase = 'fest'; H.wie = 'gestellt'; return 'gestellt'; }
  if (H.phase !== 'lauf' || H.vorlauf) return null;
  if (H.abstand > GRIFF_WEIT) { H.kimMal = DANEBEN_MAL; H.kimLangsam = DANEBEN_LANG; return null; }
  H.wie = H.def.griff === 'halt' ? 'halt' : 'stoss'; H.phase = H.wie === 'stoss' ? 'boden' : 'fest'; H.v = 0;
  return H.wie;
}
// Der Vorlauf ist vorbei: Jetzt zählt es.
export function hatzLos(H) { H.vorlauf = false; H.zeit = 0; H.fern = 0; H.hakenZeit = -9; H.spurtFrei = 2.5; }
