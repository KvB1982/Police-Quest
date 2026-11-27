// Blaulicht über Möwenbrück – alles, was über dem 3D-Bild liegt: Sprechblasen, Auswahl, Knöpfe, Notizbuch, Funk.
// Die Kästen selbst stehen in index.html, ihr Aussehen in css/style.css.

const $ = id => document.getElementById(id);

let weiter = null;          // wird aufgerufen, wenn der Spieler in einer Sprechblase "Weiter" drückt
let wahlFertig = null;      // wird aufgerufen, wenn der Spieler eine Antwort gewählt hat
let wahlZahl = 0;

export function offen() { return !!(weiter || wahlFertig) || !$('fenster').hidden || !$('schloss').hidden; }

// Eine Sprechblase zeigen und warten, bis der Spieler weiterklickt.
export function dialog(wer, text) {
  return new Promise(fertig => {
    $('dialog').hidden = false; $('optionen').innerHTML = '';
    $('wer').textContent = wer; $('wer').hidden = !wer;
    $('text').textContent = text; $('weiter').hidden = false;
    weiter = () => { weiter = null; $('dialog').hidden = true; fertig(); };
  });
}

// Eine Frage mit mehreren Antworten. Zurück kommt die Nummer der Antwort (0 = die erste).
export function wahl(wer, frage, antworten) {
  return new Promise(fertig => {
    $('dialog').hidden = false; $('weiter').hidden = true;
    $('wer').textContent = wer; $('wer').hidden = !wer;
    $('text').textContent = frage;
    const o = $('optionen'); o.innerHTML = '';
    wahlZahl = antworten.length;
    wahlFertig = i => { wahlFertig = null; $('dialog').hidden = true; o.innerHTML = ''; fertig(i); };
    antworten.forEach((a, i) => {
      const b = document.createElement('button');
      b.textContent = `${i + 1}  ${a}`; b.onclick = () => wahlFertig && wahlFertig(i);
      o.appendChild(b);
    });
  });
}

// Tasten für Sprechblasen: Leertaste/Enter = weiter, 1 2 3 = Antwort wählen. Gibt true zurück, wenn die Taste verbraucht ist.
export function taste(k) {
  if (!$('schloss').hidden) return schlossTaste(k);
  if (!$('fenster').hidden) { if (k === 'Escape' || k === 'Enter' || k === ' ') fensterZu(); return true; }
  if (weiter && (k === ' ' || k === 'Enter' || k === 'e')) { weiter(); return true; }
  if (wahlFertig) { const n = parseInt(k, 10); if (n >= 1 && n <= wahlZahl) wahlFertig(n - 1); return true; }
  return false;
}

// ----------------------------------------------------------------------------- Zahlenschloss
let schlossFertig = null, getippt = '';
function schlossZeigen() { $('schlossZahl').textContent = (getippt + '____').slice(0, 4).split('').join(' '); }
function schlossDruck(z) {
  if (z === 'x') { $('schloss').hidden = true; schlossFertig(null); return; }
  if (z === '<') getippt = getippt.slice(0, -1); else if (getippt.length < 4) getippt += z;
  schlossZeigen();
  if (getippt.length === 4) { $('schloss').hidden = true; schlossFertig(getippt); }
}
function schlossTaste(k) {
  if (/^[0-9]$/.test(k)) schlossDruck(k); else if (k === 'Backspace') schlossDruck('<'); else if (k === 'Escape') schlossDruck('x');
  return true;
}
export function schloss(titel) {
  return new Promise(fertig => {
    getippt = ''; schlossFertig = fertig; $('schlossTitel').textContent = titel; $('schloss').hidden = false; schlossZeigen();
    const t = $('schlossTasten');
    if (!t.children.length) for (const z of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '<', '0', 'x']) {
      const b = document.createElement('button'); b.textContent = z === '<' ? '⌫' : z === 'x' ? '✕' : z; b.onclick = () => schlossDruck(z); t.appendChild(b);
    }
  });
}

// ----------------------------------------------------------------------------- Fenster (Notizbuch, Tasche, Funk)
let fensterWahl = null;
function fensterZu() { $('fenster').hidden = true; if (fensterWahl) { const f = fensterWahl; fensterWahl = null; f(-1); } }
export function fenster(titel, zeilen, leer = '') {
  $('fensterTitel').textContent = titel;
  const i = $('fensterInhalt'); i.innerHTML = '';
  if (!zeilen.length) { const p = document.createElement('p'); p.textContent = leer; i.appendChild(p); }
  for (const z of zeilen) { const p = document.createElement('p'); if (z.fett) { const b = document.createElement('b'); b.textContent = z.fett + ' '; p.appendChild(b); } p.appendChild(document.createTextNode(z.text)); i.appendChild(p); }
  $('fenster').hidden = false;
}
// Ein Fenster mit Knöpfen zum Auswählen (für den Funk). Zurück kommt die Nummer oder -1 bei "Schließen".
export function auswahlFenster(titel, texte, leer) {
  return new Promise(fertig => {
    fenster(titel, [], texte.length ? '' : leer);
    fensterWahl = fertig;
    texte.forEach((t, n) => { const b = document.createElement('button'); b.textContent = t; b.onclick = () => { fensterWahl = null; $('fenster').hidden = true; fertig(n); }; $('fensterInhalt').appendChild(b); });
  });
}

// ----------------------------------------------------------------------------- Anzeige oben und Knöpfe unten
export function anzeige({ ziel, punkte, uhr, ort }) {
  $('ziel').textContent = ziel ? '➜ ' + ziel : ''; $('punkte').textContent = `⭐ ${punkte}`; $('uhr').textContent = `🕐 ${uhr}`; $('ortName').textContent = ort;
}
export function tacho(kmh) { $('tacho').hidden = kmh === null; if (kmh !== null) $('tacho').textContent = `${Math.round(kmh)} km/h`; }

// Der Wegweiser-Pfeil: winkel in Bogenmaß (0 = geradeaus), weit = Meter bis zum Ziel. null = kein Pfeil.
export function pfeil(winkel, weit) {
  $('pfeil').hidden = winkel === null;
  if (winkel === null) return;
  $('pfeilBild').style.transform = `rotate(${winkel}rad)`; $('pfeilWeit').textContent = `${Math.round(weit)} m`;
}

let alteKnoepfe = '';
// Knöpfe für das, was man gerade tun kann (in der Nähe ansprechen, einsteigen …).
export function knoepfe(liste, druck) {
  const neu = liste.map(l => l.text).join('|');
  if (neu === alteKnoepfe) return;
  alteKnoepfe = neu;
  const k = $('knoepfe'); k.innerHTML = '';
  const finger = document.body.classList.contains('finger');       // "E" ist die Taste für den ersten Knopf – ohne Tastatur lassen wir sie weg
  liste.forEach((l, i) => { const b = document.createElement('button'); b.textContent = (i === 0 && !finger ? 'E  ' : '') + l.text; b.onclick = () => druck(l); k.appendChild(b); });
}

let toastZeit = null;
export function toast(text) {
  const t = $('toast'); t.textContent = text; t.hidden = false; t.classList.remove('weg'); void t.offsetWidth; t.classList.add('weg');
  clearTimeout(toastZeit); toastZeit = setTimeout(() => { t.hidden = true; }, 2600);
}

// Im Auto: Knöpfe zum Fahren und das Blaulicht. Zu Fuß: die Leiste mit den vier Tätigkeiten.
export function fahrKnoepfe(an, blau = true) { $('kamKnoepfe').hidden = false; $('fahren').hidden = !an; $('neigLeiste').hidden = !an; $('blaulicht').hidden = !an || !blau; $('verben').hidden = an; if (an) $('satz').hidden = true; document.body.classList.toggle('imAuto', an); }

// Der Blaulicht-Knopf zeigt, welche Stufe gerade läuft: 0 = aus, 1 = nur Blaulicht, 2 = Blaulicht mit Sirene.
export function blaulicht(stufe) {
  const b = $('blaulicht');
  b.textContent = ['🚨 Blaulicht: aus', '🔵 Nur Blaulicht', '🔵🔊 Blaulicht + Sirene'][stufe];
  b.classList.toggle('an', stufe > 0); b.classList.toggle('laut', stufe === 2);
}

// ----------------------------------------------------------------------------- Point and Click
// Welche der vier Tätigkeiten ist gerade gewählt? (geh, sieh, rede, nimm)
export function verb(v) { for (const b of document.querySelectorAll('#verben button[data-v]')) b.classList.toggle('an', b.dataset.v === v); }
// Die Satz-Zeile über der Leiste, wie in alten Adventures: "👁 Ansehen: Dein Spind". Verschwindet nach ein paar Sekunden.
let satzZeit = null, alterSatz = '';
export function satz(text) {
  if (text === alterSatz && !$('satz').hidden) return;
  alterSatz = text; $('satz').textContent = text; $('satz').hidden = false;
  clearTimeout(satzZeit); satzZeit = setTimeout(() => { $('satz').hidden = true; }, 3500);
}
// Namens-Schildchen über allem, was man antippen kann (die Lupe 🔍). liste = [{ x, y, text, bild }] oder null = weg damit.
export function marken(liste) {
  const m = $('marken');
  if (!liste) { m.hidden = true; return; }
  m.hidden = false;
  while (m.children.length < liste.length) m.appendChild(document.createElement('div'));
  [...m.children].forEach((d, i) => {
    const l = liste[i]; d.hidden = !l; if (!l) return;
    d.textContent = `${l.bild} ${l.text}`; d.style.left = `${l.x}px`; d.style.top = `${l.y}px`;
  });
}

// Startbild: Neues Spiel oder Weiterspielen.
export const menueOffen = () => !$('menue').hidden;      // für die Musik: Startbild zu sehen?
export const schlossOffen = () => !$('schloss').hidden;  // … oder das Zahlenschloss?
export function menue(gibtStand) {
  return new Promise(fertig => {
    $('menue').hidden = false; $('weiterSpielen').hidden = !gibtStand;
    $('neuesSpiel').onclick = () => { $('menue').hidden = true; fertig('neu'); };
    $('weiterSpielen').onclick = () => { $('menue').hidden = true; fertig('weiter'); };
  });
}

export function ende(titel, text, punkte, max, notizen) {
  return new Promise(fertig => {
    const rang = punkte >= max * 0.9 ? 'Saubere Arbeit. Otto nickt – mehr Lob gibt es von ihm nicht.' : punkte >= max * 0.7 ? 'Ordentlich für den ersten Tag.' : 'Geschafft. Morgen sitzen die Vorschriften besser.';
    $('endeTitel').textContent = titel; $('endeText').textContent = text;
    $('endePunkte').textContent = `Sorgfalts-Punkte: ${punkte} von ${max}. ${rang}`;
    const l = $('endeNotizen'); l.innerHTML = '';
    for (const n of notizen) { const li = document.createElement('li'); li.textContent = n; l.appendChild(li); }
    $('ende').hidden = false;
    $('endeZu').onclick = () => { $('ende').hidden = true; fertig(); };
  });
}

export function verbinde({ notizbuch, tasche, funk, blaulicht, verb: verbWahl, lupe }) {
  $('weiter').onclick = () => weiter && weiter();
  $('dialog').onclick = e => { if (e.target.tagName !== 'BUTTON' && weiter) weiter(); };
  $('fensterZu').onclick = fensterZu;
  for (const b of document.querySelectorAll('#verben button[data-v]')) b.onclick = () => verbWahl(b.dataset.v);
  $('kLupe').onclick = lupe; verb('geh');
  $('kNotiz').onclick = notizbuch; $('kTasche').onclick = tasche; $('kFunk').onclick = funk; $('blaulicht').onclick = blaulicht;
}
