// Blaulicht über Möwenbrück – alle Geräusche.
//
// Jedes Geräusch hat einen Namen (siehe KLAENGE). Liegt dazu eine Aufnahme im Ordner sounds/ und steht ihr
// Dateiname in sounds/liste.json, wird die Aufnahme gespielt. Sonst erzeugt das Spiel einen einfachen Ersatz-Ton
// selbst (oder bleibt bei diesem Geräusch still). So läuft das Spiel auch ganz ohne Sound-Dateien.
// Woher die Aufnahmen stammen, steht in LIZENZEN.md.

export const KLAENGE = {
  sirene: { datei: 'sirene.mp3', laut: 0.35, schleife: true },     // Martinshorn
  motor: { datei: 'motor.mp3', laut: 0.3, schleife: true },        // Motor des Streifenwagens
  markt: { datei: 'markt.mp3', laut: 0.4, schleife: true },        // Stimmen auf dem Marktplatz
  moewen: { datei: 'moewen.mp3', laut: 0.2, schleife: true },      // Möwen und Hafen
  alarm: { datei: 'alarm.mp3', laut: 0.3, schleife: true },        // Alarmanlage am Museum
  funk: { datei: 'funk.mp3', laut: 0.5 },                          // Knacken, wenn der Funk angeht
  schritt: { datei: 'schritt.mp3', laut: 0.25, mal: 0.12 },        // mal: jeder Schritt klingt etwas anders
  tuer: { datei: 'tuer.mp3', laut: 0.5 },
  schloss: { datei: 'schloss.mp3', laut: 0.6 },                    // Spind geht auf
  pling: { datei: 'pling.mp3', laut: 0.4 },                        // Sorgfalts-Punkt bekommen
  hund: { datei: 'hund.mp3', laut: 0.5, mal: 0.06 },
  rumms: { datei: 'rumms.mp3', laut: 0.6 },                        // irgendwo angestoßen
};

let ton = null;                 // die Tonausgabe des Browsers (gibt es erst nach dem ersten Klick oder Tastendruck)
const aufnahmen = {};           // Name → geladene Aufnahme
const laufend = {};             // Name → Schleife, die gerade spielt

// Die Tonausgabe für andere Dateien (wetter.js erzeugt damit Regen, Wind und Donner). null = noch kein Ton erlaubt
export const kontext = () => ton;

// Ist das Spiel nicht zu sehen (Home-Knopf, anderes Programm, Anruf), soll es still sein. iPhone und iPad spielen sonst
// im Hintergrund weiter oder kommen stumm zurück. schlafen(true) = Ton anhalten, schlafen(false) = wieder an.
let still = false;
export function schlafen(ja) {
  still = ja;
  if (!ton) return;
  try { if (ja) ton.suspend(); else ton.resume(); } catch (e) { /* dann eben nicht */ }
}

// Tonausgabe einschalten. Browser erlauben das erst, wenn der Spieler etwas gedrückt hat.
export function an() {
  if (still) return;                // Das Spiel ist gerade nicht zu sehen (anderes Programm, Bildschirm aus): kein Ton
  if (ton) { if (ton.state !== 'running') ton.resume(); return; }
  try { ton = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ton = null; return; }
  laden();
}

async function laden() {
  let liste = [];
  try { liste = await (await fetch('sounds/liste.json')).json(); } catch (e) { liste = []; }
  for (const [name, k] of Object.entries(KLAENGE)) {
    if (!liste.includes(k.datei)) continue;
    try { aufnahmen[name] = await ton.decodeAudioData(await (await fetch('sounds/' + k.datei)).arrayBuffer()); } catch (e) { /* Datei fehlt oder ist kaputt: Ersatz-Ton */ }
  }
}

// Ein kurzer selbst erzeugter Ton: Tonhöhe in Hertz, Dauer in Sekunden.
function piep(hz, dauer, laut = 0.06, art = 'sine') {
  const o = ton.createOscillator(), g = ton.createGain();
  o.type = art; o.frequency.value = hz; g.gain.value = laut; g.gain.exponentialRampToValueAtTime(0.001, ton.currentTime + dauer);
  o.connect(g).connect(ton.destination); o.start(); o.stop(ton.currentTime + dauer);
}
const ERSATZ = {
  pling: () => piep(880, 0.12), rumms: () => piep(110, 0.3, 0.12, 'triangle'), funk: () => piep(1400, 0.06, 0.04, 'square'),
  schloss: () => piep(520, 0.08, 0.05, 'square'), tuer: () => piep(180, 0.12, 0.06, 'triangle'),
};

// Ein Geräusch einmal abspielen.
export function spiel(name, laut = 1) {
  if (!ton) return;
  const a = aufnahmen[name];
  if (!a) { if (ERSATZ[name]) ERSATZ[name](); return; }
  const q = ton.createBufferSource(), g = ton.createGain();
  q.buffer = a; g.gain.value = KLAENGE[name].laut * laut; q.connect(g).connect(ton.destination);
  const mal = KLAENGE[name].mal || 0;                      // etwas höher oder tiefer, damit es nicht immer gleich klingt
  if (mal) q.playbackRate.value = 1 + (Math.random() * 2 - 1) * mal;
  q.start();
}

// Ein Dauer-Geräusch ein- oder ausschalten. laut = 0…1 (0 schaltet es aus), tempo = wie schnell es abgespielt wird.
export function schleife(name, laut, tempo = 1) {
  if (!ton) return;
  let s = laufend[name];
  if (laut <= 0.01) { if (s) { s.q.stop(); delete laufend[name]; } return; }
  if (!s) {
    const g = ton.createGain(); g.connect(ton.destination);
    let q;
    if (aufnahmen[name]) { q = ton.createBufferSource(); q.buffer = aufnahmen[name]; q.loop = true; }
    else if (name === 'sirene') { q = ton.createOscillator(); q.type = 'square'; }       // Ersatz: zwei Töne im Wechsel
    else if (name === 'motor') { q = ton.createOscillator(); q.type = 'sawtooth'; }      // Ersatz: tiefes Brummen
    else return;
    q.connect(g); q.start(); s = laufend[name] = { q, g, echt: !!aufnahmen[name] };
  }
  const grund = KLAENGE[name].laut * laut;
  if (s.echt) { s.g.gain.value = grund; s.q.playbackRate.value = tempo; }
  else if (name === 'sirene') { s.g.gain.value = 0.02 * laut; s.q.frequency.value = Math.floor(ton.currentTime * 1.4) % 2 ? 440 : 585; }
  else { s.g.gain.value = 0.015 * laut; s.q.frequency.value = 45 * tempo; }
}

// ------------------------------------------------------------------ Hintergrundmusik
//
// Zu jeder Stimmung gibt es ein Musikstück im Ordner musik/ (Schleifen von 80 Sekunden, Quellen in LIZENZEN.md).
// Das Spiel sagt in jedem Bild, welche Stimmung gerade passt: musik('wache'). Bleibt der Wunsch eine Weile gleich,
// blendet die Musik weich hinüber. Geladen wird ein Stück erst, wenn es zum ersten Mal gebraucht wird.
export const MUSIK = {
  titel: { datei: 'titel.mp3', laut: 0.5 },          // Startbild
  wache: { datei: 'wache.mp3', laut: 0.4 },          // auf der Wache
  streife: { datei: 'streife.mp3', laut: 0.4 },      // unterwegs in der Stadt
  hafen: { datei: 'hafen.mp3', laut: 0.45 },         // zu Fuß am Wasser
  jagd: { datei: 'jagd.mp3', laut: 0.55 },           // Verfolgungsfahrt
  museum: { datei: 'museum.mp3', laut: 0.45 },       // im dunklen Museum
  spannung: { datei: 'spannung.mp3', laut: 0.5 },    // nachts in der Stadt, Alarm
  raetsel: { datei: 'raetsel.mp3', laut: 0.45 },     // Zahlenschloss
};
const MUSIK_STUFEN = [1, 0.45, 0];      // Schalter 🎵: laut → leise → aus
const MUSIK_WARTEN = 1.2;               // so viele Sekunden muss ein Wunsch gleich bleiben, bevor die Musik wechselt
const MUSIK_BLENDE = 1.8;               // so viele Sekunden dauert das Überblenden
const MUSIK_MERKEN = 'blaulicht.musik.v1';
const stuecke = {};                     // Name → geladenes Stück (oder 'laedt', 'fehlt')
let musikStufe = 0, musikAus = null, wunsch = null, wunschSeit = 0, spielt = null;      // spielt = { name, q, g }
try { musikStufe = Math.min(2, Math.max(0, +localStorage.getItem(MUSIK_MERKEN) || 0)); } catch (e) { musikStufe = 0; }

// Schalter: 0 = laut, 1 = leise, 2 = aus. Ohne Zahl wird eine Stufe weitergeschaltet. Gibt die neue Stufe zurück.
export function musikSchalter(stufe) {
  musikStufe = stufe === undefined ? (musikStufe + 1) % MUSIK_STUFEN.length : stufe;
  try { localStorage.setItem(MUSIK_MERKEN, musikStufe); } catch (e) { /* dann merkt es sich das Spiel eben nicht */ }
  if (musikAus) musikAus.gain.setTargetAtTime(MUSIK_STUFEN[musikStufe], ton.currentTime, 0.15);
  return musikStufe;
}
export const musikStand = () => ({ stufe: musikStufe, wunsch, spielt: spielt && spielt.name, geladen: Object.keys(stuecke).filter(n => stuecke[n] && stuecke[n].duration) });

async function musikLaden(name) {
  stuecke[name] = 'laedt';
  try { stuecke[name] = await ton.decodeAudioData(await (await fetch('musik/' + MUSIK[name].datei)).arrayBuffer()); } catch (e) { stuecke[name] = 'fehlt'; }
}

// Welche Musik passt gerade? In jedem Bild aufrufen. null = keine Musik.
export function musik(name) {
  if (!ton) return;
  const jetzt = ton.currentTime;
  if (name !== wunsch) { wunsch = name; wunschSeit = jetzt; }
  if (musikStufe === 2) {                                                    // ausgeschaltet: nichts laden, Laufendes ausblenden
    if (spielt) { spielt.g.gain.setTargetAtTime(0, jetzt, 0.2); spielt.q.stop(jetzt + 1.5); spielt = null; }
    return;
  }
  if (name && !stuecke[name]) musikLaden(name);
  const dran = spielt ? spielt.name : null;
  if (name === dran || (dran && jetzt - wunschSeit < MUSIK_WARTEN)) return;  // nicht bei jedem kurzen Wechsel umschalten
  if (name && !(stuecke[name] && stuecke[name].duration)) { if (stuecke[name] !== 'fehlt') return; name = null; if (!dran) return; }
  if (!musikAus) { musikAus = ton.createGain(); musikAus.gain.value = MUSIK_STUFEN[musikStufe]; musikAus.connect(ton.destination); }
  if (spielt) { const alt = spielt; alt.g.gain.setTargetAtTime(0, jetzt, MUSIK_BLENDE / 4); alt.q.stop(jetzt + MUSIK_BLENDE * 1.5); spielt = null; }
  if (!name) return;
  const q = ton.createBufferSource(), g = ton.createGain();
  q.buffer = stuecke[name]; q.loop = true; g.gain.value = 0; g.gain.setTargetAtTime(MUSIK[name].laut, jetzt, MUSIK_BLENDE / 4);
  q.connect(g).connect(musikAus); q.start();
  spielt = { name, q, g };
}

export function alleAus() { for (const n of Object.keys(laufend)) schleife(n, 0); }
