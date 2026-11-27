// Blaulicht über Möwenbrück – wie der Streifenwagen fährt (ohne three.js, auch in node testbar: node tools/fahren.mjs).
//
// Übernommen aus dem Schwester-Spiel Rennspiel (js/physik.js dort), aber ohne Rennstrecke und ohne die Hilfen,
// die dort an der Strecke hängen. Der Wagen wird wie ein Fahrrad gerechnet: ein Vorderrad (lenkt) und ein
// Hinterrad (treibt an). Die Reifen halten den Wagen in der Kurve. Je schräger ein Reifen über den Boden
// rutscht ("Schräglauf"), desto stärker drückt er zurück – bis zu einer Grenze. Darüber rutscht der Wagen.
//
// Was man davon merkt (anders als vorher, wo sich der Wagen einfach um sich selbst drehte):
//   - Er braucht einen Moment, bis er schnell ist, und einen Bremsweg, bis er steht.
//   - Wer zu schnell in die Kurve fährt, wird nach außen getragen. Vor der Kurve bremsen!
//   - Der Wagen nickt beim Bremsen nach vorn und neigt sich in der Kurve zur Seite.
//   - Es gibt Gänge und eine Drehzahl (für den Drehzahlmesser im Cockpit und den Motor-Ton).
//
// Richtungen wie im ganzen Spiel: Der Wagen schaut nach (sin h, cos h), links von ihm ist (cos h, −sin h).
// v = Tempo nach vorn, q = Tempo quer nach links (beides im Wagen gemessen), r = Drehtempo (plus = nach links).

const G = 9.81;

// Die Werte des Streifenwagens (ein Kombi mit etwa 200 PS). Alle Zahlen sind geschätzt, damit er sich gut fahren lässt.
export const STREIFE = {
  masse: 1700, traeg: 2900,         // Gewicht (kg) und wie träge er sich dreht
  a: 1.3, b: 1.55,                  // Abstand Schwerpunkt → Vorderachse / Hinterachse (m)
  hoehe: 0.55,                      // so hoch liegt der Schwerpunkt: Davon hängt ab, wie viel Gewicht beim Bremsen nach vorn wandert
  haft: 1.35, hinten: 1.08,         // so gut halten die Reifen (mehr als echt, damit Kinder nicht dauernd rutschen); hinten etwas besser = gutmütig
  B: 9, C: 1.45,                    // Form der Reifenkurve
  leistung: 190000, schubMax: 12500,// Motor: Watt und größte Zugkraft (Newton) – beim Anfahren gut 7 m/s²
  zugGriff: 1.6,                    // beim Beschleunigen halten die Reifen längs mehr aus als zur Seite (Spiel-Wert)
  bremse: 1.0, bremseVorn: 0.66, bremsGriff: 1.05,   // Bremse: von 50 km/h steht der Wagen nach etwa 7 m
  widerstand: 0.8, rollen: 0.02, motorBremse: 0.09,  // Luft, Rollen, und der Motor bremst, wenn man vom Gas geht
  lenkMax: 0.6,                     // größter Einschlag der Vorderräder (rad, etwa 34 Grad): Wendekreis gut 9 m
  schraeg: 0.09,                    // so viel weiter als nötig schlagen die Räder bei Tempo höchstens ein (mehr würde nur rutschen)
  folgen: 9, folgenFein: 22,        // so schnell folgen die Räder den Tasten (weich) und dem Neigen (direkt)
  unten: 3,                         // unter diesem Tempo (m/s) rollt der Wagen einfach dorthin, wohin die Räder zeigen
  rueck: 5,                         // Höchsttempo rückwärts (m/s)
  tcRest: 0.85,                     // Traktionskontrolle: so viel Haftung darf das Gas höchstens brauchen
  zugKurve: 0.5,                    // so viel Zugkraft bleibt auch mitten in der Kurve (aus dem Rennspiel: sonst wird der Wagen in jeder Kurve immer langsamer)
  esp: { ab: 4, beta: 0.16, dreh: 7, quer: 0.3 },    // Schleuderschutz: fängt das Heck ab etwa 9 Grad Rutschwinkel
  gaenge: [0, 6.5, 11.5, 16.5, 21.5, 30],            // bis zu diesem Tempo (m/s) reicht Gang 1, 2, 3, 4, 5
  leerlauf: 850, drehzahlMax: 6500,
  schritt: 1 / 120,                 // gerechnet wird in festen kleinen Schritten, egal wie schnell der Bildschirm ist
  jeG: 0.045, kippMax: 0.06,        // Neigung der Karosserie in der Kurve: so viel pro "g", höchstens (rad)
  nickJeG: 0.022, nickMax: 0.035,   // Nicken beim Bremsen und Gasgeben
};

// Reifenkurve: Kraft bei Schräglauf al, Grenze D (wie im Rennspiel)
const reifen = (al, D, B, C) => D * Math.sin(C * Math.atan(B * al));
const zwischen = (x, a, b) => Math.max(a, Math.min(b, x));

// Füllt einen Wagen-Stand (das ist Z.auto im Spiel) mit allem, was die Fahrphysik braucht. Alte Spielstände haben nur x, z, h, v.
export function bereit(a) {
  for (const k of ['v', 'q', 'r', 'lenkWinkel', 'ax', 'ay', 'kippen', 'nicken', 'rutsch', 'weg']) if (!Number.isFinite(a[k])) a[k] = 0;
  if (!a.gang) a.gang = 1;
  if (!Number.isFinite(a.drehzahl)) a.drehzahl = STREIFE.leerlauf;
  return a;
}
// Der Wagen steht (nach dem Laden, Einsteigen, Versetzen)
export function halt(a) { bereit(a); a.v = a.q = a.r = a.ax = a.ay = 0; a.rutsch = 0; return a; }

// Einen Zeitschritt rechnen.
//   a   = der Wagen (x, z, h, v, q, r …)
//   e   = was der Fahrer will: gas 0…1, brems 0…1, lenk −1…1 (plus = links), fein = true beim Neigen (dann folgen die Räder sofort)
//   max = Höchsttempo (m/s): ohne Blaulicht langsamer als mit
// Der Ort (a.x, a.z) wird hier schon weitergerückt. Ob ein Haus im Weg steht, prüft das Spiel danach (stoss weiter unten).
export function schritt(a, e, dt, max, p = STREIFE) {
  bereit(a);
  const n = Math.max(1, Math.ceil(dt / p.schritt - 1e-6)), h = dt / n;
  const L = p.a + p.b;
  let rutsch = 0;
  for (let k = 0; k < n; k++) {
    const u = a.v, v = a.q, r = a.r, au = Math.abs(u);
    const mu = p.haft, ayMax = mu * G;

    // ---- Lenkung: Voll eingeschlagen heißt bei jedem Tempo „so eng, wie die Reifen es schaffen“ (aus dem Rennspiel, Fahrgefühl „echter“).
    // Mehr Einschlag würde die Vorderräder nur quer über die Straße schieben – dann führe der Wagen geradeaus ins Haus.
    const voll = au > 2 ? Math.min(p.lenkMax, Math.atan(L * ayMax / (u * u)) + p.schraeg) : p.lenkMax;
    const ziel = zwischen(e.lenk || 0, -1, 1) * voll;
    a.lenkWinkel += (ziel - a.lenkWinkel) * Math.min(1, h * (e.fein ? p.folgenFein : p.folgen));
    a.lenkWinkel = zwischen(a.lenkWinkel, -voll - 0.05, voll + 0.05);

    // ---- Gewicht auf den Achsen: Beim Bremsen drückt es auf die Vorderräder, beim Gasgeben auf die Hinterräder
    const um = zwischen(a.ax * p.hoehe / (L * G), -0.15, 0.2) * p.masse * G * 0.5;
    const Fzf = p.masse * G * p.b / L - um, Fzr = p.masse * G * p.a / L + um;
    const muF = mu * Fzf, muR = mu * p.hinten * Fzr;

    // ---- Motor und Bremse
    let Fx = 0, Fbf = 0, Fbr = 0;
    const gas = zwischen(e.gas || 0, 0, 1), brems = zwischen(e.brems || 0, 0, 1);
    if (gas > 0 && u > -0.5) {
      Fx = gas * Math.min(p.schubMax, p.leistung / Math.max(au, 1));
      Fx *= zwischen((max * 1.03 - u) / (max * 0.12), 0, 1);       // kurz vor dem Höchsttempo lässt der Schub nach
    }
    if (brems > 0) {
      if (u > 0.3) {
        const Fb = brems * p.bremse * (muF + muR) * p.bremsGriff;
        // Antiblockiersystem: Die Hinterräder bremsen nie bis an die Grenze (sonst bricht das Heck aus) …
        Fbf = Math.min(Fb * p.bremseVorn, muF * 0.98 * p.bremsGriff); Fbr = Math.min(Fb * (1 - p.bremseVorn), muR * 0.6 * p.bremsGriff);
        // … und wer beim Bremsen lenkt, bekommt etwas weniger Bremse, damit Haftung zum Lenken übrig bleibt (Kurven-ABS).
        const w = Math.min(1, Math.abs(e.lenk || 0) * 1.5) * 0.75, wH = Math.min(0.98, w * 1.3);
        Fbf = Math.min(Fbf, muF * Math.sqrt(1 - w * w) * p.bremsGriff); Fbr = Math.min(Fbr, muR * Math.sqrt(1 - wH * wH) * p.bremsGriff);
      } else if (gas <= 0) {
        // steht der Wagen, heißt Bremse: Rückwärtsgang
        Fx = -brems * p.schubMax * 0.6 * zwischen((p.rueck + u) / (p.rueck * 0.25), 0, 1);
      }
    }
    if (u < -0.3 && gas > 0) { Fbf = muF * 0.5 * gas; Fbr = muR * 0.5 * gas; }       // rollt rückwärts und man gibt Gas: erst bremsen
    // Traktionskontrolle: Das Hinterrad zieht nur so stark, wie neben der Kurvenkraft noch Haftung übrig ist.
    const zugGrenze = Math.sqrt(Math.max(0, (muR * p.tcRest) ** 2 - (a.Fyr || 0) ** 2)) * p.zugGriff;
    const zugG = Math.max(zugGrenze, muR * p.zugGriff * p.zugKurve);       // (die geschenkte Zugkraft kostet die Hinterreifen keine Haftung zur Seite)
    Fx = zwischen(Fx, -zugG, zugG);

    // ---- Reifen zur Seite (Schräglauf). Ganz langsam wäre das wackelig, deshalb mindestens "unten".
    const us = Math.max(au, p.unten), sgn = u >= 0 ? 1 : -1;
    const alF = a.lenkWinkel * sgn - Math.atan2(v + p.a * r, us), alR = -Math.atan2(v - p.b * r, us);
    // Haftkreis: Was zum Bremsen und Ziehen gebraucht wird, fehlt für die Kurve
    const lfx = Fbf / p.bremsGriff, lrx = Math.min(Math.abs(Fx), zugGrenze) / p.zugGriff + Fbr / p.bremsGriff;
    const DF = Math.sqrt(Math.max(0, muF * muF - lfx * lfx)), DR = Math.sqrt(Math.max(0, muR * muR - lrx * lrx));
    const kriech = zwischen((au - p.unten * 0.3) / p.unten, 0, 1);
    const Fyf = reifen(alF, DF, p.B, p.C) * kriech, Fyr = reifen(alR, DR, p.B, p.C) * kriech;
    a.Fyr = Fyr;
    rutsch = Math.max(rutsch, kriech * Math.max(Math.abs(alF), Math.abs(alR)) * p.B / 1.6, au > 4 ? Math.max(lfx / (muF + 1e-9), lrx / (muR + 1e-9)) * 0.9 : 0);

    // ---- Widerstände: Luft, Rollen, Motorbremse
    const Fd = 0.5 * 1.2 * p.widerstand * u * au + p.rollen * p.masse * G * Math.sign(u) * Math.min(1, au / 0.5) + (gas > 0 ? 0 : p.motorBremse * p.masse * u);
    const Fb = (Fbf + Fbr) * Math.sign(u) * Math.min(1, au / 0.3);
    const cs = Math.cos(a.lenkWinkel), sn = Math.sin(a.lenkWinkel);
    let du = (Fx - Fb - Fd - Fyf * sn) / p.masse + v * r;
    let dv = (Fyf * cs + Fyr) / p.masse - u * r;
    let dr = (p.a * Fyf * cs - p.b * Fyr) / p.traeg;

    // ---- Schleuderschutz (wie ESP im echten Auto, aus dem Rennspiel): Dreht sich der Wagen schneller, als die Räder lenken,
    // oder rutscht das Heck zu weit zur Seite, dreht ein Gegen-Moment ihn zurück und er wird dabei etwas langsamer.
    if (au > p.esp.ab) {
      const E = p.esp, rLenk = u * Math.tan(a.lenkWinkel) / L, rGrip = (muF + muR) / p.masse / au * 1.08;
      const rZiel = zwischen(rLenk, -rGrip, rGrip), beta = Math.atan2(v, au);
      let korr = 0;
      if (r * rZiel >= 0 && Math.abs(r) > Math.abs(rZiel)) korr -= (r - rZiel) * E.dreh;       // dreht zu schnell (Heck kommt)
      else if (r * rZiel < 0) korr -= r * E.dreh;                                              // dreht gegen die Lenkung
      const zuviel = Math.abs(beta) - E.beta;
      if (zuviel > 0) korr += Math.sign(beta) * zuviel * E.dreh * 6;                           // rutscht zu schräg: Nase in Fahrtrichtung
      korr = zwischen(korr, -E.dreh * 1.2, E.dreh * 1.2);
      dr += korr; du -= Math.abs(korr) * E.quer * Math.sign(u);
    }

    a.v = u + du * h; a.q = v + dv * h; a.r = r + dr * h;
    // Ganz langsam (Rangieren, Wenden): Der Wagen rollt genau dorthin, wohin die Räder zeigen, und rutscht nicht.
    if (kriech < 1) {
      const rRoll = a.v * Math.tan(a.lenkWinkel) / L;
      a.r = a.r * kriech + rRoll * (1 - kriech); a.q = a.q * kriech + rRoll * p.b * (1 - kriech);
    }
    // Stehen bleiben: Ohne Gas und fast ohne Tempo steht der Wagen wirklich (sonst kriecht er ewig)
    if (gas <= 0 && !(brems > 0 && u <= 0.3) && Math.abs(a.v) < 0.12) { a.v = 0; a.q = 0; a.r = 0; }
    a.v = zwischen(a.v, -p.rueck, max * 1.06);
    a.ax += (du - v * r - a.ax) * Math.min(1, h * 12); a.ay += (u * r - a.ay) * Math.min(1, h * 10);

    // ---- Ort weiterrücken
    a.h += a.r * h;
    const sh = Math.sin(a.h), ch = Math.cos(a.h);
    a.x += (sh * a.v + ch * a.q) * h; a.z += (ch * a.v - sh * a.q) * h;
    a.weg += a.v * h;
  }

  // ---- Gang und Drehzahl (nur für Anzeige und Ton)
  const au = Math.abs(a.v), Gg = p.gaenge;
  if (a.v < -0.3) a.gang = 0;       // 0 = Rückwärtsgang
  else {
    if (a.gang < 1) a.gang = 1;
    while (a.gang < Gg.length - 1 && au > Gg[a.gang] * 0.97) a.gang++;         // hochschalten kurz vor dem Ende des Gangs
    while (a.gang > 1 && au < Gg[a.gang - 1] * 0.8) a.gang--;                  // herunterschalten erst ein Stück darunter (sonst flattert es)
  }
  const oben = a.gang ? Gg[a.gang] : p.rueck * 1.4;
  const soll = p.leerlauf + (p.drehzahlMax - p.leerlauf) * Math.min(1.02, au / oben) * 0.92 + (e.gas > 0 && au < 2 ? 900 * e.gas : 0);
  a.drehzahl += (soll - a.drehzahl) * Math.min(1, dt * 9);

  // ---- Karosserie (nur fürs Bild): neigt sich in der Kurve nach außen, nickt beim Bremsen nach vorn
  const kipp = zwischen(a.ay / G * p.jeG, -p.kippMax, p.kippMax), nick = zwischen(-a.ax / G * p.nickJeG, -p.nickMax, p.nickMax);
  a.kippen += (kipp - a.kippen) * Math.min(1, dt * 6); a.nicken += (nick - a.nicken) * Math.min(1, dt * 7);
  a.rutsch += (Math.min(1, Math.max(0, rutsch - 0.75) * 3) - a.rutsch) * Math.min(1, dt * 10);       // 0 … 1: so sehr quietschen die Reifen
  return a;
}

// Angestoßen: Das Spiel hat den Wagen aus einem Hindernis geschoben – von (zx, zz), wo ihn die Fahrphysik hinhaben wollte,
// nach (nx, nz). Der Wagen prallt nicht zurück, er rutscht am Hindernis entlang: Das Tempo IN das Hindernis hinein geht verloren,
// das Tempo daran entlang bleibt (etwas gebremst), und die Nase dreht sich ein Stück mit.
// Zurück kommt, wie hart der Stoß war (verlorenes Tempo in m/s) – daraus macht das Spiel den „Rumms“.
export function stoss(a, zx, zz, nx, nz, dt) {
  const dx = nx - zx, dz = nz - zz, d = Math.hypot(dx, dz);
  a.x = nx; a.z = nz;
  if (d < 1e-4 || dt <= 0) return 0;
  const ex = dx / d, ez = dz / d;                                   // Richtung weg vom Hindernis
  const sh = Math.sin(a.h), ch = Math.cos(a.h);
  let wx = sh * a.v + ch * a.q, wz = ch * a.v - sh * a.q;           // Tempo in der Welt
  const hinein = -(wx * ex + wz * ez);                              // so schnell fuhr er ins Hindernis
  if (hinein <= 0) return 0;
  wx += ex * hinein; wz += ez * hinein;                             // dieser Teil ist weg
  const reib = 1 - Math.min(0.5, hinein * 0.03);       // am Hindernis entlangschrammen bremst
  wx *= reib; wz *= reib;
  a.v = wx * sh + wz * ch; a.q = wx * ch - wz * sh;
  // Die Nase dreht sich vom Hindernis weg (von welcher Seite kam der Stoß?)
  const seite = ex * ch - ez * sh;
  a.r = a.r * 0.5 + zwischen(seite * hinein * 0.12, -1.2, 1.2) * Math.sign(a.v || 1);
  return hinein;
}

export const kmh = a => Math.abs(a.v) * 3.6;
