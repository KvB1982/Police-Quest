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
  schritt: { datei: 'schritt.mp3', laut: 0.25 },
  tuer: { datei: 'tuer.mp3', laut: 0.5 },
  schloss: { datei: 'schloss.mp3', laut: 0.6 },                    // Spind geht auf
  pling: { datei: 'pling.mp3', laut: 0.4 },                        // Sorgfalts-Punkt bekommen
  hund: { datei: 'hund.mp3', laut: 0.5 },
  rumms: { datei: 'rumms.mp3', laut: 0.6 },                        // irgendwo angestoßen
};

let ton = null;                 // die Tonausgabe des Browsers (gibt es erst nach dem ersten Klick oder Tastendruck)
const aufnahmen = {};           // Name → geladene Aufnahme
const laufend = {};             // Name → Schleife, die gerade spielt

// Tonausgabe einschalten. Browser erlauben das erst, wenn der Spieler etwas gedrückt hat.
export function an() {
  if (ton) { if (ton.state === 'suspended') ton.resume(); return; }
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
  q.buffer = a; g.gain.value = KLAENGE[name].laut * laut; q.connect(g).connect(ton.destination); q.start();
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

export function alleAus() { for (const n of Object.keys(laufend)) schleife(n, 0); }
