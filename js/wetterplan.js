// Blaulicht über Möwenbrück – der Wetterplan: welche Wetter-Arten es gibt und wann welches Wetter ist.
// Hier steht nur die Rechnung (ohne three.js), damit man sie auch ohne Bildschirm prüfen kann.
// Gezeichnet und zum Klingen gebracht wird das Wetter in wetter.js. Vorbild: wetter.js und sturm.js im Reitturnier.

// Der Wind für alle: Bäume, Fahnen, Windräder, Wellen und Wolken schauen hier nach.
// uZeit = Sekunden seit dem Start · uWind = wie stark es gerade weht (0 = still, 1 = frischer Wind, 2 = Sturm)
export const WIND = { uZeit: { value: 0 }, uWind: { value: 0.3 } };
// Wie weit man durch die Luft sieht: 1 = klar, 0 = dichter Regen oder Nebel (der Lichtstrahl des Leuchtturms verblasst dann)
export const LUFT = { sicht: 1 };

// Jede Wetter-Art in Zahlen:
//   decke  = wie viel vom Himmel die Wolken zudecken (0 … 1)
//   dunkel = wie viel Licht die Wolken schlucken (0 … 1)
//   regen  = wie stark es regnet (0 = gar nicht, 1 = kräftig, mehr = Wolkenbruch)
//   wind   = wie stark es weht (siehe oben)
//   nebel  = wie dicht der Nebel ist (0 … 1)
//   blitz  = 0 keine Blitze · 1 Wetterleuchten in der Ferne · 2 Gewitter direkt über der Stadt
export const ARTEN = {
  klar: { bild: '☀️', name: 'klar', decke: 0.05, dunkel: 0, regen: 0, wind: 0.3, nebel: 0, blitz: 0 },
  dunst: { bild: '🌫️', name: 'Morgendunst', decke: 0.6, dunkel: 0.05, regen: 0, wind: 0.15, nebel: 0.55, blitz: 0 },
  wolken: { bild: '⛅', name: 'Wolken', decke: 0.5, dunkel: 0.12, regen: 0, wind: 0.6, nebel: 0, blitz: 0 },
  truebe: { bild: '☁️', name: 'bedeckt', decke: 0.9, dunkel: 0.35, regen: 0, wind: 0.9, nebel: 0, blitz: 0 },
  niesel: { bild: '🌦️', name: 'Nieselregen', decke: 0.85, dunkel: 0.3, regen: 0.35, wind: 0.5, nebel: 0.1, blitz: 0 },
  regen: { bild: '🌧️', name: 'Regen', decke: 0.95, dunkel: 0.45, regen: 0.85, wind: 0.8, nebel: 0, blitz: 0 },
  nebel: { bild: '🌫️', name: 'Nebel', decke: 0.8, dunkel: 0.1, regen: 0, wind: 0.1, nebel: 1, blitz: 0 },
  sturm: { bild: '💨', name: 'Sturm', decke: 0.9, dunkel: 0.5, regen: 0, wind: 2, nebel: 0, blitz: 1 },
  gewitter: { bild: '⛈️', name: 'Gewitter', decke: 1, dunkel: 0.7, regen: 1.3, wind: 1.8, nebel: 0, blitz: 2 },
};

// Das Wetter folgt der Geschichte. Die Liste wird von oben nach unten gelesen: Es gilt die LETZTE Zeile, deren Merker
// (wenn) schon gesetzt ist. text = Meldung, wenn das Wetter umschlägt · einschlag = gleich ein Blitz ganz in der Nähe
export const PLAN = [
  { wetter: 'dunst' },                                                                    // 06:00 Dienstbeginn: Dunst vom Hafen
  { wenn: 'wagen', wetter: 'klar', text: '☀️ Der Morgendunst verzieht sich' },             // 07:00 erste Streife
  { wenn: 'kitaFertig', wetter: 'wolken' },                                               // Unfall und Verfolgung unter aufziehenden Wolken
  { wenn: 'jagdFertig', wetter: 'truebe', text: '☁️ Der Himmel zieht sich zu, Wind kommt auf' },     // Markt
  { wenn: 'abend', wetter: 'sturm', text: '💨 Sturm zieht auf – über der See leuchtet es schon' },   // 21:30
  { wenn: 'alarm', wetter: 'gewitter', text: '⛈️ Das Gewitter ist da!', einschlag: true },           // Alarm im Museum
  { wenn: 'museumFertig', wetter: 'regen', text: '🌧️ Das Gewitter zieht ab, es regnet weiter' },
];

// Welche Zeile des Plans gilt gerade? flags = die Merker der Geschichte (Z.flags)
export function planZeile(flags) {
  let z = PLAN[0];
  for (const p of PLAN) if (!p.wenn || flags[p.wenn]) z = p;
  return z;
}

// Das Wetter-Bildchen für die Anzeige oben. Bei klarem Himmel steht nachts der Mond da.
export function wetterBild(art, licht) {
  return art === 'klar' && (licht === 'nacht' || licht === 'dunkel') ? '🌙' : ARTEN[art].bild;
}
