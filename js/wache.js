// Blaulicht über Möwenbrück – die Polizeiwache Am Deich als reine Daten (ohne three.js).
//
// So ist die Wache aufgebaut (Norden ist oben, die Kamera schaut von Süden):
//
//   Vorplatz mit Leuchtschild, Fahnen und Besucher-Parkplatz
//   ┌──────────┬─────────┬────────────┬───────────┬────────┬───────────┬──────────┐
//   │ Wasch-   │ Umkleide│ Besprechung│ Wachraum  │ Wach-  │ Pausenraum│ Verneh-  │
//   │ raum     │         │            │ mit Tresen│ leitung│ mit Küche │ mung     ├───────────────┐
//   ├──────────┼─────────┴────────────┴───────────┴────────┴───────────┴──────────┤ Zelle 1 · 2 · 3│
//   │ Waffen-  ╪                          Flur                                    ╪ Gewahrsam      │
//   │ kammer   │                                                                  │ (Aufnahme)     │
//   └──────────┴──────────────────────────╪═══╪───────────────────────────────────┴──╪────────────┘
//   Hof: Parkplätze der Streifenwagen, Carport, Zapfsäule, Waschplatz, Lottes Zwinger, Schiebetor
//
// Was in einer echten Wache steht, haben wir nachgeschlagen (Gewahrsam mit Zellentür samt Klappe und Guckloch,
// Liege mit schwer brennbarer Matratze, WC aus Edelstahl, Schließfächer für die Waffe vor dem Zellentrakt,
// Wachtresen hinter Glas, Hof ohne Einblick von der Straße). Der Grundriss selbst ist ausgedacht.

const V = Math.PI / 2, N = Math.PI;       // Drehungen: 0 = schaut nach Süden (zur Kamera), N = nach Norden, V = nach Osten, -V = nach Westen
const D = 0.15;                            // halbe Dicke einer Wand

// ---------------------------------------------------------------------------------------------
// Wände ziehen: Eine Wand läuft an einer Linie entlang (achse 'x' = von West nach Ost, 'z' = von Nord nach Süd).
// tuer = Lücken für Türen, glas = Stücke mit Fenster (jeweils [Mitte, Breite]), aussen = auf welcher Seite roter Klinker klebt (-1 oder 1).
// ---------------------------------------------------------------------------------------------
const WAENDE = [], GLAS = [], KLINKER = [];
function ziehe(achse, fest, von, bis, { tuer = [], glas = [], aussen = 0 } = {}) {
  const luecken = [...tuer.map(l => [...l, 't']), ...glas.map(l => [...l, 'g'])].sort((a, b) => a[0] - b[0]);
  const eck = (a, b, d1, d2) => achse === 'x' ? [a, fest + Math.min(d1, d2), b, fest + Math.max(d1, d2)] : [fest + Math.min(d1, d2), a, fest + Math.max(d1, d2), b];
  const stueck = (a, b) => { if (b - a < 0.02) return; const a2 = a - (a === von ? D : 0), b2 = b + (b === bis ? D : 0); WAENDE.push(eck(a2, b2, -D, D)); if (aussen) KLINKER.push(eck(a2 - 0.08, b2 + 0.08, aussen * D, aussen * (D + 0.08))); };
  let p = von;
  for (const [m, b, art] of luecken) {
    stueck(p, m - b / 2);
    if (art === 'g') { GLAS.push(eck(m - b / 2, m + b / 2, -0.1, 0.1)); if (aussen) KLINKER.push(Object.assign(eck(m - b / 2, m + b / 2, aussen * 0.1, aussen * (D + 0.08)), { h: 0.85 })); }
    p = m + b / 2;
  }
  stueck(p, bis);
}
// Außenwände
ziehe('x', -10, -21, 31.5, { aussen: -1, tuer: [[9.5, 2]], glas: [[-3.4, 1.6], [3.4, 1.6], [6.6, 2.2], [12.4, 2.2], [16.5, 2.6], [25.9, 1.8]] });
ziehe('z', -21, -10, 6, { aussen: -1 });
ziehe('x', 6, -21, 43, { aussen: 1, tuer: [[-19.8, 1.2], [0, 3], [34, 1.6]], glas: [[-9, 5], [9, 5], [19, 5]] });
ziehe('z', 43, -6, 6, { aussen: 1 });
ziehe('x', -6, 31.5, 43, { aussen: -1 });
ziehe('z', 31.5, -10, -6, { aussen: 1 });
// Innenwände
ziehe('x', 0, -21, 31.5, { tuer: [[-9.5, 2], [0, 2], [9.5, 2], [16.5, 1.4], [23, 2], [29.2, 1.4]] });
ziehe('x', 0, 31.5, 43, { tuer: [[33.4, 1.44], [37.25, 1.44], [41.1, 1.44]] });       // die Zellen-Front: In den Lücken sitzen die Zellentüren
ziehe('z', -14, -10, 6, { tuer: [[-3.6, 1.4], [3, 3.4]] });                           // Tür zum Waschraum, Ausgabe der Waffenkammer
ziehe('z', -5, -10, 0); ziehe('z', 5, -10, 0); ziehe('z', 14, -10, 0); ziehe('z', 19, -10, 0); ziehe('z', 27, -10, 0);
ziehe('z', 31.5, -6, 6, { tuer: [[3, 1.6]] });
ziehe('z', 35.33, -6, 0); ziehe('z', 39.17, -6, 0);
ziehe('x', -6.4, 12.4, 14, { tuer: [[13.3, 1.0]] });                                  // neben dem Wachtresen: die Tür hinter den Tresen

// Die Parkplätze im Hof: zehn Stück, jeder 3 m breit. Platz 6 (vor der Hoftür) bleibt immer frei.
const PLATZ = [-15, -12, -9, -6, -3, 0, 3, 6, 9, 12];
const linie = (x, z, b, t, farbe = '#eceff1') => ({ form: 'linie', x, z, b, t, farbe });
// Ein Zaunstück mit Hindernis
const zaun = (x, z, lang, quer = false, draht = true) => ({ form: 'zaun', x, z, b: quer ? 0.2 : lang, t: quer ? lang : 0.2, h: 2.0, dreh: quer ? V : 0, draht, farbe: '#3f4a52' });
// Ein Türschild neben einer Tür
const tuerschild = (text, x, z, dreh = 0) => ({ form: 'schild', text, x, z, dreh, b: 0.9, h: 0.26, y: 1.3 });

export function wacheDaten({ POLIZEI, KOLLEGE, OTTO_LOOK, OTTO_SIEH }) {
  const HARMS = { name: 'Harms (Waffenkammer)', look: { ...POLIZEI, haar: '#3a3a3a', muetze: null, bauch: 1.1, modell: 'harms', art: 'mann' } };
  const HARMS_KAMMER = { ...HARMS, id: 'harms', x: -15.3, z: 3, h: V, akt: 'harms', nah: 3.2, runde: [[-15.3, 3, 16, V], [-17.6, 1.7, 7, N], [-16.9, 4.3, 6, 0]], sieh: 'Harms hinter dem Gitter der Waffenausgabe. Er zählt Helme, prüft Kisten und hakt alles auf seiner Liste ab. Er sieht aus wie jemand, der jede Zeile zweimal liest.' };
  const HARMS_GEWAHRSAM = { ...HARMS, look: { ...HARMS.look, arbeit: 'tippen' }, id: 'harms_g', name: 'Harms (Gewahrsam)', x: 41.28, z: 3.6, h: -V, akt: 'gewahrsam', nah: 3, sieh: 'Harms hat heute auch den Gewahrsam. Vor ihm liegt das Gewahrsamsbuch, daneben ein Stapel durchsichtiger Beutel für die Sachen der Festgenommenen.' };
  const TIMO = { hemd: '#4a4f57', hose: '#2a2a2a', haut: '#f0c8a0', haar: '#3a2a1a', modell: 'unfallfahrer', art: 'mann' };
  const DIEB = { hemd: '#3f9a4a', hose: '#333', haut: '#e8b890', haar: '#8a5a2a', modell: 'w2', art: 'mann' };

  return {
    name: 'Polizeiwache Am Deich',
    gross: [-23.6, -17, 45.6, 29.6],
    kamera: [11, 7.5],
    schatten: 46, mitte: [11, 8],                 // die Sonne wirft hier Schatten (Feld von 46 m um die Mitte)
    aussen: '#8f9499', aussenArt: 'gehweg',
    wandFarbe: '#ece7dc',
    waende: WAENDE, glaswaende: GLAS, klinker: KLINKER,
    boden: [
      { r: [-25, 6, 47, 31], farbe: '#7b8086', art: 'asphalt', ueber: 0 },             // Hof
      { r: [-60, 33.5, 80, 41], farbe: '#6a6e73', art: 'asphalt', ueber: 0 },          // die Wachstraße vor dem Tor
      { r: [-60, -27, 80, -19.5], farbe: '#6a6e73', art: 'asphalt', ueber: 0 },        // die Straße Am Deich vor dem Eingang
      { r: [-25, -10, -21.2, 6], farbe: '#6f9a5f', art: 'gras', ueber: 0 }, { r: [43.2, -10, 47, 6], farbe: '#6f9a5f', art: 'gras', ueber: 0 }, { r: [31.7, -10, 43.2, -6.2], farbe: '#6f9a5f', art: 'gras', ueber: 0 },
      { r: [19, -17.5, 31, -11.2], farbe: '#74787d', art: 'asphalt', ueber: 0 },       // Besucher-Parkplatz
      { r: [-14, 0, 31.5, 6], farbe: '#d6cfbd', art: 'linoleum', ueber: 1 },           // Flur
      { r: [-13.85, 0.15, 31.35, 0.75], farbe: '#a9a18d', art: 'linoleum', ueber: 2 }, { r: [-13.85, 5.25, 31.35, 5.85], farbe: '#a9a18d', art: 'linoleum', ueber: 2 },       // dunkle Streifen an den Wänden
      { r: [-21, -10, -14, 0], farbe: '#d3e0e4', art: 'fliesen', ueber: 1 },           // Waschraum
      { r: [-21, 0, -14, 6], farbe: '#8f959b', art: 'linoleum', ueber: 1 },            // Waffenkammer
      { r: [-14, -10, -5, 0], farbe: '#a9c0cf', art: 'fliesen', ueber: 1 },            // Umkleide
      { r: [-5, -10, 5, 0], farbe: '#c9a777', art: 'parkett', ueber: 1 },              // Besprechung
      { r: [5, -10, 14, 0], farbe: '#bcccb8', art: 'linoleum', ueber: 1 },             // Wachraum
      { r: [5, -10, 14, -6.4], farbe: '#d9d4c6', art: 'fliesen', ueber: 2 },           // … davor der Wartebereich für Bürger
      { r: [14, -10, 19, 0], farbe: '#5f7896', art: 'teppich', ueber: 1 },             // Wachleitung
      { r: [19, -10, 27, 0], farbe: '#d6b98a', art: 'parkett', ueber: 1 },             // Pausenraum
      { r: [27, -10, 31.5, 0], farbe: '#9aa09a', art: 'linoleum', ueber: 1 },          // Vernehmung
      { r: [31.5, -6, 43, 6], farbe: '#b9c6c1', art: 'linoleum', ueber: 1 },           // Gewahrsam
      { r: [31.5, -6, 43, 0], farbe: '#cfdcd4', art: 'fliesen', ueber: 2 },            // die Zellen
    ],
    moebel: [
      // ----- Umkleide
      { x: -10.5, z: -9.4, b: 5, t: 0.8, h: 2, farbe: '#5f7f96', form: 'spinde' },
      { x: -13.5, z: -8.3, b: 0.8, t: 1.5, h: 2, farbe: '#5f7f96', form: 'spinde', dreh: V },
      { x: -5.5, z: -6.2, b: 0.8, t: 5, h: 2, farbe: '#5f7f96', form: 'spinde', dreh: -V },
      { x: -9.8, z: -6.7, b: 1.3, t: 0.6, h: 0.5, farbe: '#8a6a4a', modell: 'holzbank' }, { x: -9.8, z: -3.3, b: 1.3, t: 0.6, h: 0.5, farbe: '#8a6a4a', modell: 'holzbank' },
      // ----- Waschraum
      { x: -18.6, z: -9.35, b: 4, t: 1.1, h: 1.9, farbe: '#e6ebe6', form: 'dusche' },
      { x: -20.3, z: -4.2, b: 1.3, t: 3, h: 1.85, farbe: '#7f97a8', form: 'wckabine', dreh: V },
      { x: -17.4, z: -0.45, b: 3, t: 0.55, h: 0.85, farbe: '#e9ecee', form: 'waschtisch', dreh: N },
      // ----- Waffenkammer
      { x: -14, z: 3, b: 0.5, t: 3.4, h: 1, farbe: '#6b5a44', form: 'ausgabe', dreh: V },
      { x: -18, z: 0.5, b: 3, t: 0.6, h: 2, farbe: '#6f777f', form: 'helmregal' },
      { x: -16.9, z: 5.5, b: 3, t: 0.6, h: 2, farbe: '#6f777f', form: 'regal', inhalt: 'kisten', dreh: N },
      // ----- Besprechung
      { x: 0, z: -4.5, b: 5, t: 1.6, h: 0.76, farbe: '#7a5a3a', form: 'tisch' },
      { x: 4.5, z: -2.2, b: 0.55, t: 2.4, h: 0.85, farbe: '#8a6a4a', form: 'sideboard', dreh: -V },
      // ----- Wachraum: Tresen, Funkpult, Schreibplatz
      { x: 8.8, z: -6.4, b: 7.2, t: 0.9, h: 1.1, farbe: '#3d5a80', form: 'tresen', dreh: N },
      { x: 13.3, z: -3.2, b: 1.0, t: 2.4, h: 0.75, form: 'arbeitsplatz', zwei: true, bild: 'kamerabild', dreh: -V },
      { x: 6.9, z: -1.0, b: 1.8, t: 0.9, h: 0.75, form: 'arbeitsplatz', dreh: N },
      { x: 12.5, z: -0.5, b: 1.6, t: 0.5, h: 1.4, farbe: '#8d949b', form: 'akten', dreh: N },
      { x: 5.6, z: -8.3, b: 0.6, t: 2.4, h: 0.5, farbe: '#3d6fa0', form: 'stuhlreihe', dreh: V },
      { x: 12.3, z: -9.4, b: 2.2, t: 0.6, h: 0.5, farbe: '#3d6fa0', form: 'stuhlreihe' },
      // ----- Wachleitung
      { x: 16.5, z: -5.6, b: 1.9, t: 0.9, h: 0.75, form: 'arbeitsplatz', platte: '#7a5a3a', dreh: N },
      { x: 18.5, z: -5.2, b: 0.55, t: 2.6, h: 0.85, farbe: '#6a4a2a', form: 'sideboard', dreh: -V },
      { x: 14.5, z: -6.8, b: 0.5, t: 2.2, h: 1.9, farbe: '#7a5a3a', form: 'regal', dreh: V },
      // ----- Pausenraum
      { x: 22.2, z: -9.55, b: 4.4, t: 0.65, h: 0.9, farbe: '#e9e4d8', form: 'kueche' },
      { x: 25.0, z: -9.5, b: 0.7, t: 0.7, h: 1.9, farbe: '#d9dcdf', form: 'kuehlschrank' },
      { x: 22.2, z: -7.1, b: 3.2, t: 0.7, h: 1.0, farbe: '#b8894f', form: 'theke' },
      { x: 21.6, z: -3.2, b: 2.1, t: 0.9, h: 0.75, farbe: '#c9a777', form: 'tischgruppe', stuhl: '#b0533c' },
      { x: 19.5, z: -5.6, b: 0.75, t: 0.9, h: 1.9, farbe: '#b02a25', form: 'automat', dreh: V },
      { x: 25.6, z: -5.6, b: 0.8, t: 1.4, h: 0.9, farbe: '#2e7d32', form: 'kicker', dreh: V },
      { x: 26.5, z: -2.2, b: 0.5, t: 1.4, h: 0.5, farbe: '#3a2f25', form: 'tv', dreh: -V },
      { x: 24.3, z: -2.2, b: 0.9, t: 1.9, h: 0.7, farbe: '#5a6b7d', modell: 'sofa', dreh: V },
      // ----- Vernehmung
      { x: 29.2, z: -5.6, b: 1.6, t: 0.9, h: 0.75, farbe: '#9aa0a6', form: 'tisch', bein: '#4a515a' },
      { x: 31.05, z: -8.6, b: 0.5, t: 1.6, h: 1.4, farbe: '#8d949b', form: 'akten', dreh: -V },
      // ----- Flur
      { x: -4, z: 5.4, b: 1.3, t: 0.6, h: 0.5, farbe: '#8a6a4a', modell: 'holzbank' }, { x: 9, z: 5.4, b: 1.3, t: 0.6, h: 0.5, farbe: '#8a6a4a', modell: 'holzbank' },
      { x: 14, z: 5.55, b: 1.6, t: 0.5, h: 1.4, farbe: '#8d949b', form: 'akten', dreh: N },
      { x: 19, z: 5.45, b: 2.2, t: 0.6, h: 0.5, farbe: '#3d6fa0', form: 'stuhlreihe', dreh: N },
      { x: 12.6, z: 0.5, b: 0.7, t: 0.6, h: 0.95, form: 'kopierer' },
      { x: 4.2, z: 0.42, b: 1.7, t: 0.4, h: 1.5, farbe: '#b9a98a', form: 'postfach' },
      { x: -6.2, z: 0.5, b: 2.2, t: 0.6, h: 0.5, farbe: '#3d6fa0', form: 'stuhlreihe' }, { x: 20.6, z: 0.5, b: 1.8, t: 0.5, h: 0.5, farbe: '#8a6a4a', form: 'sitzbank' },
      { x: 25.4, z: 5.5, b: 1.4, t: 0.6, h: 1.9, farbe: '#2f5f8f', form: 'automat', dreh: N },
      // ----- Gewahrsam: Aufnahme-Tisch, Schließfächer, Fingerabdrücke, Bänke
      { x: 40.6, z: 3.6, b: 0.9, t: 2.0, h: 0.75, form: 'arbeitsplatz', dreh: V },
      { x: 42.6, z: 3.6, b: 0.45, t: 2.4, h: 1.6, form: 'effekten', dreh: -V },
      { x: 38.6, z: 5.5, b: 1.5, t: 0.6, h: 0.95, form: 'fingerabdruck', dreh: N },
      { x: 35.35, z: 0.5, b: 1.7, t: 0.5, h: 0.5, farbe: '#6f8a86', form: 'sitzbank' }, { x: 39.2, z: 0.5, b: 1.7, t: 0.5, h: 0.5, farbe: '#6f8a86', form: 'sitzbank' },
      // die drei Zellen: Liege an der Rückwand, WC an der Seite
      ...[31.5, 35.33, 39.17].flatMap(x => [
        { x: x + 2.2, z: -5.3, b: 2.1, t: 0.9, h: 0.5, form: 'pritsche' },
        { x: x + 0.5, z: -2.6, b: 0.6, t: 0.6, h: 0.9, form: 'zellenwc', dreh: V },
      ]),
      // ----- Hof
      { x: -20.6, z: 26.2, b: 5.2, t: 5.2, h: 1.8, form: 'zwinger', durch: true },
      ...[[-20.6, 23.6, 5.2, 0.2], [-18, 26.2, 0.2, 5.2]].map(([x, z, b, t]) => ({ x, z, b, t, h: 1.8, farbe: '#6b7278' })).map(q => ({ ...q, form: 'linie', y: -1 })),       // unsichtbare Hindernisse am Zwinger
      { x: -22.4, z: 9.2, b: 1.4, t: 1.1, h: 1.35, farbe: '#3d5a3a', form: 'container' }, { x: -22.4, z: 10.9, b: 1.4, t: 1.1, h: 1.35, farbe: '#4a5a6a', form: 'container' },
      { x: 24, z: 12.5, b: 2.2, t: 1.0, h: 1.6, form: 'zapfsaeule' },
      { x: 30, z: 18.4, b: 9, t: 2.2, h: 0.3, form: 'beet' }, { x: 30, z: 18.4, b: 0.5, t: 0.5, h: 5.5, form: 'hofleuchte', dreh: N },                    // grüne Insel mitten im Hof
      { x: 28.5, z: 6.75, b: 2.6, t: 0.9, h: 1.2, form: 'waschplatz' },
      { x: -7, z: 7.1, b: 2.6, t: 1.4, h: 1.0, form: 'fahrradstaender', n: 3 },
      { x: 14.6, z: 6.6, b: 0.9, t: 0.6, h: 0.6, form: 'streukiste' },
      { x: 44.9, z: 12.5, b: 0.5, t: 2, h: 1, farbe: '#888', modell: 'absperrgitter', dreh: V }, { x: 44.9, z: 14.9, b: 0.5, t: 2, h: 1, farbe: '#888', modell: 'absperrgitter', dreh: V },
      { x: 44.6, z: 9.4, b: 1.6, t: 0.5, h: 0.8, farbe: '#888', modell: 'betonsperre' }, { x: 44.6, z: 10.3, b: 1.6, t: 0.5, h: 0.8, farbe: '#888', modell: 'betonsperre' },
      { x: 23, z: 29.2, b: 0.5, t: 0.5, h: 5.5, form: 'hofleuchte', dreh: N }, { x: -8, z: 29.2, b: 0.5, t: 0.5, h: 5.5, form: 'hofleuchte', dreh: N }, { x: 44.8, z: 20, b: 0.5, t: 0.5, h: 5.5, form: 'hofleuchte', dreh: -V },
      { x: -23, z: 7.4, b: 0.7, t: 0.7, h: 11, form: 'antenne' },
      // der Zaun rund um den Hof, in der Mitte der Südseite das Schiebetor
      zaun(-10.6, 30, 26.8), zaun(27.4, 30, 36.8), zaun(-24, 18, 24, true), zaun(46, 18, 24, true), zaun(-22.5, 6, 3, false, false), zaun(44.5, 6, 3, false, false),
      { x: 6, z: 30, b: 6, t: 0.3, h: 1.9, form: 'tor' },
      // ----- Vorplatz
      { x: 5, z: -14.5, b: 1.3, t: 0.4, h: 3, form: 'pylon' },
      ...[13.2, 14.6, 16].map((x, i) => ({ x, z: -15, b: 0.3, t: 0.3, h: 7, form: 'fahnenmast', farben: [['#1d3f8a', '#f2f2ee', '#1d3f8a'], ['#f2f2ee', '#c62828', '#f2f2ee'], ['#111', '#c62828', '#d9a521']][i] })),
      { x: 2, z: -11.2, b: 2.0, t: 1.4, h: 1.0, form: 'fahrradstaender', n: 2 },
      { x: -9, z: -10.9, b: 15, t: 1.0, h: 0.3, form: 'beet' }, { x: 16.8, z: -10.9, b: 3.4, t: 1.0, h: 0.3, form: 'beet' },
      { x: -4, z: -17.6, b: 30, t: 0.7, h: 0.9, form: 'hecke' }, { x: 37, z: -17.6, b: 12, t: 0.7, h: 0.9, form: 'hecke' },
      { x: 37.3, z: -8.2, b: 10, t: 0.8, h: 1.1, form: 'hecke' },
    ],
    deko: [
      // ----- Umkleide
      { form: 'haken', x: -12.3, z: -0.18, b: 2.1, dreh: N }, { form: 'spiegel', x: -6.9, z: -0.18, b: 0.8, dreh: N }, { form: 'waeschekorb', x: -5.6, z: -1.0 },
      { form: 'matte', x: -9.5, z: -0.9, b: 1.6, t: 0.9 }, { form: 'uhr', x: -7.4, z: -9.82 }, { modell: 'pflanzkuebel', x: -5.7, z: -9.3 },
      { form: 'schild', text: 'Dienstsport|Di + Do 16 Uhr', x: -13.82, z: -1.7, dreh: V, b: 0.9, h: 0.45, y: 1.2, farbe: '#f2f2ee', schrift: '#1d3f8a' },
      // ----- Waschraum
      { form: 'handtuch', x: -14.18, z: -1.6, dreh: -V }, { form: 'handtuch', x: -20.82, z: -1.2, dreh: V }, { form: 'matte', x: -18.6, z: -8.2, b: 3.6, t: 0.7 },
      { form: 'sitzbank', x: -15, z: -6.5, b: 1.6, t: 0.45, farbe: '#b9a98a', dreh: -V }, { form: 'waeschekorb', x: -14.6, z: -9.3 },
      // ----- Waffenkammer
      { form: 'schilde', x: -20.5, z: 0.9, n: 4, dreh: 0.3 }, { form: 'funklader', x: -14.18, z: 0.8, b: 0.9, dreh: -V }, { form: 'schluessel', x: -14.18, z: 5.4, dreh: -V },
      { form: 'kegel', x: -15.2, z: 5.3, n: 5 }, { form: 'feuerloescher', x: -20.82, z: 5.2, dreh: V }, { modell: 'klemmbrett', x: -14.05, z: 3.7, y: 1.06 },
      // ----- Besprechung
      { form: 'tafel', x: 0, z: -9.82, b: 3.6 }, { form: 'bild', bild: 'whiteboard', x: -4.82, z: -5, b: 2.6, h: 1.2, dreh: V }, { form: 'bild', bild: 'dienstplan', x: 4.82, z: -6.6, b: 2.4, h: 1.1, dreh: -V },
      { form: 'flipchart', x: 3.9, z: -8.9, dreh: -0.5 }, { form: 'flagge', x: -4.3, z: -9.2 }, { form: 'uhr', x: 2.4, z: -9.82 }, { form: 'kaffee', x: 4.5, z: -1.6, y: 0.9, dreh: -V },
      ...[-1.8, -0.6, 0.6, 1.8].flatMap(x => [{ form: 'stuhl', x, z: -3.45, dreh: N, rollt: x === 1.8 }, { form: 'stuhl', x, z: -5.55 }]),
      { form: 'stuhl', x: -2.95, z: -4.5, dreh: V }, { form: 'stuhl', x: 2.95, z: -4.5, dreh: -V },
      { modell: 'klemmbrett', x: -0.9, z: -4.4, y: 0.77, dreh: 0.4 }, { modell: 'laptop', x: 1.8, z: -4.02, y: 0.76 }, { modell: 'pflanzkuebel', x: -4.3, z: -0.8 },
      // ----- Wachraum
      { form: 'drehstuhl', x: 12.72, z: -3.2, dreh: V }, { form: 'drehstuhl', x: 6.9, z: -1.8, rollt: true }, { form: 'drehstuhl', x: 7.0, z: -5.64, dreh: N, rollt: true }, { form: 'tastatur', x: 7.0, z: -5.95, y: 0.78, dreh: N },
      { form: 'bild', bild: 'plan', x: 5.18, z: -3.4, b: 2.6, h: 1.2, dreh: V }, { form: 'funklader', x: 5.18, z: -5.3, b: 0.9, dreh: V }, { form: 'schluessel', x: 13.82, z: -5.5, dreh: -V },
      { form: 'uhr', x: 13.82, z: -1.0, dreh: -V }, { form: 'papierkorb', x: 11.2, z: -5.6 }, { form: 'monitor', x: 10.6, z: -6.2, y: 0.78, dreh: 0.2 }, { form: 'monitor', x: 7.0, z: -6.2, y: 0.78, dreh: -0.2 },
      { form: 'bild', bild: 'fahndung', x: 13.82, z: -8.4, b: 2.4, h: 1.2, dreh: -V }, { form: 'bild', bild: 'notruf', x: 6.6, z: -9.72, b: 1.3, h: 0.7, y: 0.45, rahmen: '#1d3f8a' },
      { form: 'matte', x: 9.5, z: -9.2, b: 1.8, t: 1.0 }, { modell: 'pflanzkuebel', x: 5.6, z: -6.95 }, { form: 'wasserspender', x: 13.5, z: -7.3, dreh: -V }, { form: 'papierkorb', x: 5.5, z: -9.5 },
      { form: 'schild', text: 'Bitte hier|anmelden', x: 8.8, z: -6.92, dreh: N, b: 1.0, h: 0.4, y: 1.55, farbe: '#f2f2ee', schrift: '#1d3f8a' },
      // ----- Wachleitung
      { form: 'drehstuhl', x: 16.5, z: -6.34 }, { form: 'stuhl', x: 15.9, z: -4.5, dreh: N + 0.15 }, { form: 'stuhl', x: 17.1, z: -4.5, dreh: N - 0.15 },
      { form: 'teppich', x: 16.5, z: -5.4, b: 3.6, t: 3.2, farbe: '#7a2f2f' }, { form: 'bild', bild: 'urkunden', x: 18.82, z: -5.2, b: 2.2, h: 1.0, dreh: -V }, { form: 'flagge', x: 18.3, z: -9.2 },
      { form: 'stehlampe', x: 14.6, z: -9.3 }, { form: 'garderobe', x: 18.4, z: -0.7 }, { modell: 'pflanzkuebel', x: 14.6, z: -0.7 }, { form: 'bild', bild: 'foto', x: 14.18, z: -3, b: 1.5, h: 0.9, dreh: V, rahmen: '#3a2a1a' },
      { modell: 'vase', x: 18.5, z: -4.4, y: 0.9 }, { modell: 'bueste', x: 18.5, z: -6.0, y: 0.9, dreh: -V }, { form: 'papierkorb', x: 17.7, z: -6.4 },
      // ----- Pausenraum
      { form: 'hocker', x: 21.2, z: -6.35, farbe: '#b0533c' }, { form: 'hocker', x: 22.2, z: -6.35, farbe: '#b0533c' }, { form: 'hocker', x: 23.2, z: -6.35, farbe: '#b0533c' },
      { modell: 'croissant', x: 21.4, z: -7.1, y: 1.0 }, { modell: 'apfel', x: 22.3, z: -7.0, y: 1.0 }, { modell: 'kaese', x: 23.1, z: -7.15, y: 1.0 },
      { form: 'teppich', x: 25.2, z: -2.2, b: 3.0, t: 2.6, farbe: '#3d5a80' }, { form: 'bild', bild: 'pinn', x: 26.82, z: -7.6, b: 2.2, h: 1.1, dreh: -V }, { form: 'uhr', x: 20.2, z: -9.82 },
      { form: 'wasserspender', x: 19.5, z: -7.2, dreh: V }, { form: 'papierkorb', x: 19.5, z: -4.6 }, { modell: 'pflanzkuebel', x: 26.4, z: -9.3 }, { modell: 'pflanzkuebel', x: 19.6, z: -0.7 },
      { form: 'stehlampe', x: 26.4, z: -0.7 }, { form: 'bild', bild: 'foto', x: 21.3, z: -0.18, b: 1.6, h: 0.9, dreh: N, rahmen: '#3a2a1a' },
      { form: 'schild', text: 'Kaffeekasse|ist Ehrensache', x: 19.18, z: -8.6, dreh: V, b: 1.0, h: 0.45, y: 1.3, farbe: '#fff2a8', schrift: '#333' },
      // ----- Vernehmung
      { form: 'stuhl', x: 29.2, z: -6.5, farbe: '#4a515a' }, { form: 'stuhl', x: 28.8, z: -4.7, dreh: N, farbe: '#4a515a' }, { form: 'stuhl', x: 29.8, z: -4.7, dreh: N, farbe: '#4a515a' },
      { form: 'aufnahme', x: 29.2, z: -5.6, y: 0.75 }, { form: 'spiegel', x: 27.18, z: -5.6, b: 2.4, dreh: V }, { form: 'uhr', x: 29.2, z: -9.82 }, { modell: 'kamera_wand', x: 31.1, z: -9.6, y: 1.5, dreh: -2.4 },
      { form: 'schild', text: 'Vernehmung|Bitte Ruhe', x: 31.32, z: -3, dreh: -V, b: 0.9, h: 0.45, y: 1.25, farbe: '#b02a25' }, { form: 'papierkorb', x: 27.6, z: -0.6 },
      // ----- Flur
      { form: 'linie', x: 8.75, z: 3, b: 45, t: 0.12, farbe: '#1d3f8a', y: 0.03 }, { form: 'matte', x: 0, z: 5.1, b: 2.6, t: 1.2 },
      tuerschild('Umkleide', -7.7, 0.18), tuerschild('Besprechung', 1.9, 0.18), tuerschild('Wache', 11.3, 0.18), tuerschild('Wachleitung', 18.0, 0.18), tuerschild('Pausenraum', 24.8, 0.18), tuerschild('Vernehmung', 27.9, 0.18),
      tuerschild('Waffenkammer', -13.82, 5.3, V), tuerschild('Gewahrsam', 31.32, 4.5, -V),
      { form: 'bild', bild: 'pinn', x: 4.5, z: 5.82, b: 2.2, h: 1.1, dreh: N }, { form: 'feuerloescher', x: 2.3, z: 5.82, dreh: N }, { form: 'bild', bild: 'fluchtplan', x: -2.6, z: 5.82, b: 1.0, h: 0.6, y: 1.2, dreh: N },
      { form: 'bild', bild: 'fahndung', x: 27.5, z: 5.82, b: 2.4, h: 1.2, dreh: N }, { form: 'bild', bild: 'urkunden', x: 20.6, z: 0.18, b: 2.0, h: 0.8, y: 1.15 },
      { form: 'uhr', x: 14.3, z: 0.18 }, { form: 'bild', bild: 'foto', x: -3.2, z: 0.18, b: 1.5, h: 0.9, rahmen: '#3a2a1a' }, { form: 'bild', bild: 'notruf', x: 6.0, z: 0.18, b: 1.2, h: 0.65, y: 1.1, rahmen: '#1d3f8a' },
      { form: 'feuerloescher', x: -12.2, z: 0.18 }, { form: 'bild', bild: 'dienstplan', x: 26.2, z: 0.18, b: 1.6, h: 0.8, y: 1.15 }, { form: 'stehlampe', x: 30.9, z: 5.2 },
      { form: 'teppich', x: 0, z: 3, b: 3.4, t: 4.2, farbe: '#3d5a80' }, { form: 'flagge', x: -1.6, z: 0.5 }, { form: 'wasserspender', x: 7.0, z: 0.45 }, { form: 'hundekorb', x: -2.6, z: 5.0 }, { form: 'garderobe', x: 2.7, z: 0.6 },
      { modell: 'pflanzkuebel', x: -13.3, z: 5.3 }, { modell: 'pflanzkuebel', x: 30.8, z: 0.7 }, { modell: 'pflanzkuebel', x: 12.4, z: 5.3 }, { modell: 'erste_hilfe', x: 5.9, z: 5.4, y: 0 },
      { form: 'papierkorb', x: 15.3, z: 5.5 }, { form: 'papierkorb', x: -5.2, z: 5.5 }, { modell: 'kamera_wand', x: 30.9, z: 5.6, y: 1.5, dreh: 2.4 },
      // ----- Gewahrsam
      { form: 'bild', bild: 'messlatte', x: 36.3, z: 5.82, b: 1.3, h: 1.4, y: 1.0, dreh: N, rahmen: '#22262b' }, { form: 'fotostativ', x: 36.3, z: 3.9, dreh: 0 },
      { form: 'schild', text: 'Waffen|einschließen!', x: 32.17, z: 0.18, b: 0.8, h: 0.42, y: 1.2, farbe: '#b02a25' },
      { form: 'drehstuhl', x: 41.34, z: 3.6, dreh: -V }, { form: 'uhr', x: 42.82, z: 1.2, dreh: -V }, { form: 'feuerloescher', x: 31.68, z: 5.3, dreh: V },
      { form: 'schraffur', x: 37.25, z: 1.1, b: 9.6, t: 0.35, farbe: '#d8a81e', y: 0.03 }, { modell: 'kamera_wand', x: 42.6, z: 5.6, y: 1.5, dreh: -2.4 }, { form: 'papierkorb', x: 42.4, z: 5.4 },
      { modell: 'klemmbrett', x: 40.5, z: 4.1, y: 0.76, dreh: 1.2 },
      // ----- Hof: Parkplätze
      ...[...PLATZ.map(x => x - 1.5), 13.5].map(x => linie(x, 14.2, 0.14, 6.4)),
      ...PLATZ.map((x, i) => ({ form: 'schrift', text: String(i + 1), x, z: 18.4, b: 3.4, farbe: '#e8eaec' })),
      ...PLATZ.filter(x => x !== 0).map(x => ({ form: 'bordstein', x, z: 11.25, b: 1.9, t: 0.2 })),
      { form: 'schraffur', x: 0, z: 9.6, b: 2.9, t: 6.6, farbe: '#e8c020' },                                    // Weg von der Hoftür: frei halten
      { form: 'schrift', text: 'POLIZEI', x: 6, z: 24.5, b: 9, farbe: '#e8eaec' }, { form: 'schrift', text: 'AUSFAHRT', x: 6, z: 27.6, b: 5.4, farbe: '#e8c020' },
      { form: 'carport', x: -13.5, z: 14.2, b: 6.2, t: 6.6 },
      { form: 'schildmast', art: 'park', x: -17.2, z: 10.9 }, { form: 'schildmast', art: 'park', x: 14.2, z: 10.9 },
      // Gewahrsams-Tür: gelbe Sperrfläche, Schrift, Lampe
      { form: 'schraffur', x: 34, z: 8.6, b: 3.4, t: 4.6, farbe: '#e8c020' }, { form: 'schrift', text: 'GEWAHRSAM', x: 34, z: 11.8, b: 4.6, farbe: '#e8c020' },
      { form: 'wandleuchte', x: 34, z: 6.26, y: 1.62 }, { form: 'wandleuchte', x: 0, z: 6.26, y: 1.62 }, { form: 'wandleuchte', x: -19.8, z: 6.26, y: 1.62 },
      { form: 'schild', text: 'Gewahrsam|Zuführung', x: 36, z: 6.27, b: 1.1, h: 0.45, y: 1.2 }, { form: 'schild', text: 'Waffenkammer', x: -18.2, z: 6.27, b: 1.1, h: 0.3, y: 1.25 },
      { form: 'klima', x: 21.5, z: 6.5 }, { form: 'klima', x: 39.5, z: 6.5 }, { modell: 'stromkasten', x: 41.6, z: 6.6 },
      // Tanken und Waschen
      { form: 'schrift', text: 'DIESEL', x: 24, z: 14.4, b: 3.2, farbe: '#e8eaec' }, { form: 'fleck', x: 22.8, z: 11.4, b: 2.4 }, { form: 'fleck', x: 28.6, z: 8.6, b: 3.4, art: 'wasser' }, { form: 'fleck', x: 30, z: 9.6, b: 2.2, art: 'wasser' },
      linie(28.8, 10.4, 6.4, 0.12, '#3fa7ff'), linie(25.6, 8.4, 0.12, 4.0, '#3fa7ff'), linie(32, 8.4, 0.12, 4.0, '#3fa7ff'), { form: 'schrift', text: 'WASCHPLATZ', x: 28.8, z: 11.2, b: 4.2, farbe: '#3fa7ff' },
      // Parkplätze der Kolleginnen und Kollegen an der Südseite
      ...[16.5, 19.5, 22.5, 25.5, 28.5, 31.5, 34.5, 37.5, 40.5].map(x => linie(x, 26.6, 0.14, 5.6)), { form: 'schrift', text: 'DIENSTGRUPPE', x: 28.5, z: 22.8, b: 6.4, farbe: '#e8eaec' },
      // Kleinkram, der einen Hof lebendig macht
      { form: 'kegel', x: 15.4, z: 7.4, n: 4 }, { form: 'kegel', x: 16.1, z: 7.0, n: 1 }, { form: 'fleck', x: -5.8, z: 13.6, b: 1.8 }, { form: 'fleck', x: 9.2, z: 15.2, b: 1.5 }, { form: 'fleck', x: -2.8, z: 14.8, b: 1.3 },
      { modell: 'muelltonne', x: 16.9, z: 6.7 }, { modell: 'muelltonne', x: 17.7, z: 6.7 }, { modell: 'reifen', x: -22.9, z: 12.6 }, { modell: 'reifen', x: -22.8, z: 13.4, dreh: 1 }, { modell: 'kiste_holz', x: -22.4, z: 15.2, dreh: 0.3 },
      { form: 'aschenbecher', x: 2.4, z: 6.6 }, { form: 'sitzbank', x: 4.4, z: 6.65, b: 1.8, t: 0.5, farbe: '#8a6a4a' }, { modell: 'pflanzkuebel', x: -2.3, z: 6.7 }, { modell: 'pflanzkuebel', x: 6.2, z: 6.7 },
      { form: 'poller', x: -1.7, z: 11.2 }, { form: 'poller', x: 1.7, z: 11.2 }, { form: 'poller', x: 32.2, z: 11 }, { form: 'poller', x: 35.8, z: 11 },
      { modell: 'baum_laub', x: -22, z: 20 }, { modell: 'baum_laub', x: 44.7, z: 21.5, mal: 0.6 }, { modell: 'baum_laub', x: 44.6, z: 27.2, mal: 0.8 }, { form: 'beet', x: 44.6, z: 24, b: 2.2, t: 9 }, { modell: 'gully', x: 6, z: 21, y: 0.02 }, { modell: 'gully', x: 24, z: 20, y: 0.02 },
      { form: 'schildmast', text: 'Schritt|fahren', x: 2.3, z: 29.3, b: 0.8, farbe: '#f2f2ee', schrift: '#111', dreh: N }, { modell: 'kamera_wand', x: 3.0, z: 6.3, y: 1.45, dreh: 0.6 },
      // ----- vor dem Tor: Gehweg, Wachstraße, Häuser gegenüber
      linie(10, 37.25, 140, 0.14),
      { form: 'bordstein', x: 10, z: 33.4, b: 140, t: 0.25 }, { form: 'bordstein', x: 10, z: 41.1, b: 140, t: 0.25 },
      { form: 'haus', x: -34, z: 50, b: 18, t: 11, h: 12.2, stil: 'backstein', dach: '#7a3b2e' }, { form: 'haus', x: -13, z: 50, b: 21, t: 11, h: 9.2, stil: 'putz', dach: '#5a4a44' },
      { form: 'haus', x: 9, z: 50.5, b: 18, t: 11, h: 12.2, stil: 'dunkel', dach: '#4a4f57' }, { form: 'haus', x: 30, z: 50, b: 21, t: 11, h: 9.2, stil: 'sandstein', dach: '#7a3b2e' }, { form: 'haus', x: 52, z: 50.5, b: 18, t: 11, h: 12.2, stil: 'backstein', dach: '#5a4a44' },
      { modell: 'laterne', x: -14, z: 32.6 }, { modell: 'laterne', x: 26, z: 32.6 }, { modell: 'baum_laub', x: -30, z: 32.4 }, { modell: 'baum_laub', x: 50, z: 32.4 }, { modell: 'baum_laub', x: -4, z: 42.6, mal: 0.9 }, { modell: 'baum_laub', x: 20, z: 42.6 },
      // ----- Vorplatz und die Straße Am Deich
      { form: 'vordach', x: 9.5, z: -11.2, b: 3.6, t: 2.4, dreh: N }, { form: 'matte', x: 9.5, z: -10.9, b: 1.8, t: 0.9 },
      { form: 'briefkasten', x: 11.4, z: -10.26, dreh: N }, { form: 'klingel', x: 8.1, z: -10.26, dreh: N }, { form: 'schild', text: 'POLIZEI', x: 9.5, z: -10.27, dreh: N, b: 1.9, h: 0.4, y: 1.25 },
      { form: 'wandleuchte', x: 7.4, z: -10.26, dreh: N, y: 1.6 }, { form: 'wandleuchte', x: 11.9, z: -10.26, dreh: N, y: 1.6 }, { modell: 'kamera_wand', x: 13.6, z: -10.3, y: 1.45, dreh: N },
      { form: 'sitzbank', x: -2, z: -12.4, b: 1.8, t: 0.5, farbe: '#8a6a4a', dreh: N }, { modell: 'muelltonne', x: -0.4, z: -12.3 }, { form: 'aschenbecher', x: 7.2, z: -11.6 },
      { modell: 'laterne_alt', x: 1, z: -16.4 }, { modell: 'laterne_alt', x: 17.6, z: -16.4 }, { modell: 'laterne_alt', x: -16, z: -16.4 }, { modell: 'laterne_alt', x: 33, z: -16.4 },
      { modell: 'baum_laub', x: -12, z: -14.2, mal: 0.85 }, { modell: 'baum_laub', x: -20, z: -14, mal: 0.7 }, { modell: 'baum_laub', x: 38, z: -12.6, mal: 0.8 }, { modell: 'baum_laub', x: 45, z: -3, mal: 0.75 }, { modell: 'baum_laub', x: -23.4, z: -5, mal: 0.6 },
      ...[20.5, 23.5, 26.5, 29.5].map(x => linie(x, -14.6, 0.14, 5.4)), { form: 'schrift', text: 'BESUCHER', x: 25, z: -11.8, b: 4.2, farbe: '#e8eaec' }, { form: 'schildmast', art: 'park', text: 'Besucher|der Wache', x: 19.4, z: -11.6, dreh: N },
      { form: 'bordstein', x: 10, z: -19.4, b: 140, t: 0.25 }, { form: 'bordstein', x: 10, z: -27.1, b: 140, t: 0.25 }, linie(10, -23.25, 140, 0.14),
      { form: 'haus', x: -32, z: -36, b: 20, t: 11, h: 12.2, stil: 'sandstein', dach: '#5a4a44' }, { form: 'haus', x: -9, z: -36.5, b: 21, t: 11, h: 9.2, stil: 'backstein', dach: '#7a3b2e' },
      { form: 'haus', x: 13, z: -36, b: 18, t: 11, h: 12.2, stil: 'putz', dach: '#7a3b2e' }, { form: 'haus', x: 34, z: -36.5, b: 20, t: 11, h: 9.2, stil: 'dunkel', dach: '#4a4f57' }, { form: 'haus', x: 56, z: -36, b: 19, t: 11, h: 12.2, stil: 'sandstein', dach: '#5a4a44' },
      { modell: 'baum_laub', x: -22, z: -28.6 }, { modell: 'baum_laub', x: 2, z: -28.6, mal: 0.9 }, { modell: 'baum_laub', x: 24, z: -28.6 }, { modell: 'baum_laub', x: 46, z: -28.6, mal: 0.9 },
    ],
    tueren: [
      { x: -9.5, z: 0, b: 2 }, { x: 0, z: 0, b: 2 }, { x: 9.5, z: 0, b: 2 }, { x: 16.5, z: 0, b: 1.4 }, { x: 23, z: 0, b: 2 }, { x: 29.2, z: 0, b: 1.4, farbe: '#6f777f' },
      { x: 0, z: 6, b: 3, farbe: '#5f6b78' }, { x: 9.5, z: -10, b: 2, art: 'glas' }, { x: -14, z: -3.6, b: 1.4, quer: true, farbe: '#b9c7cf' },
      { x: -19.8, z: 6, b: 1.2, farbe: '#4a515a' }, { x: 13.3, z: -6.4, b: 1.0, art: 'glas' },
      { x: 31.5, z: 3, b: 1.6, quer: true, farbe: '#5d6f6c' }, { x: 34, z: 6, b: 1.6, farbe: '#4a515a' },
    ],
    schilder: [
      { x: -17.5, z: -9.8, text: 'Waschraum' }, { x: -9.5, z: -9.8, text: 'Umkleide' }, { x: 0, z: -9.8, text: 'Besprechung' }, { x: 9.5, z: -9.8, text: 'Wache' }, { x: 16.5, z: -9.8, text: 'Wachleitung' },
      { x: 23, z: -9.8, text: 'Pausenraum' }, { x: 29.2, z: -9.8, text: 'Vernehmung' }, { x: 37.25, z: -5.8, text: 'Gewahrsam' }, { x: -17.5, z: 0.4, text: 'Waffenkammer' },
    ],
    dinge: [
      { id: 'waffenschrank', x: -20.3, z: 3, name: 'Stahlschrank der Waffenkammer', art: 'schrank', fest: [1, 1.6], sieh: 'Ein schwerer Stahlschrank mit zwei Türen und einem Zahlenschloss. Den Schlüssel dazu hat nur Harms.' },
      { id: 'spind', x: -13.2, z: -6, name: 'Dein Spind', art: 'spind', akt: 'spind', fest: [1, 1.2], sieh: 'Ein schmaler Stahlspind mit Zahlenschloss. Auf dem Namensschild steht: K. Berger.' },
      { id: 'auto', x: 6, z: 14, art: 'auto', polizei: true, h: 0, fest: [2, 4.4] },
      { id: 'moewe9', x: -6, z: 14, art: 'auto', polizei: true, leicht: true, h: 0, fest: [2, 4.4], name: 'Streifenwagen Möwe 9', verb: 'sieh', sieh: 'Möwe 9, der Wagen von Ben Okafor. Frisch gewaschen, die Reifen glänzen noch nass.' },
      { id: 'moewe12', x: 12, z: 14, art: 'auto', polizei: true, leicht: true, h: 0, fest: [2, 4.4], name: 'Streifenwagen Möwe 12', verb: 'sieh', sieh: 'Möwe 12, der Wagen von Jan Dirks und Meike Tammen. Auf dem Beifahrersitz liegt eine angebissene Laugenstange.' },
      { id: 'zivil', x: -12, z: 14, art: 'auto', farbe: '#4f5a66', h: 0, fest: [2, 4.4], name: 'Ziviler Dienstwagen', verb: 'sieh', sieh: 'Ein grauer Kombi ohne Aufschrift. Nur wer genau hinsieht, entdeckt das Blaulicht hinter dem Kühlergrill. Den fährt die Kripo.' },
      { id: 'bus', x: -15, z: 14.2, art: 'bus', h: 0, fest: [2.1, 5], name: 'Mannschaftswagen', verb: 'sieh', sieh: 'Der Mannschaftswagen der Wache. Neun Sitze, hinten Absperrband, Kegel und eine Kiste Warnwesten. Er kommt bei Festen und großen Einsätzen raus.' },
      { id: 'moewe7', x: 28.8, z: 8.6, art: 'auto', polizei: true, leicht: true, h: V, fest: [4.4, 2], name: 'Streifenwagen Möwe 7', verb: 'sieh', sieh: 'Möwe 7 steht tropfnass auf dem Waschplatz. An der Stoßstange klebt noch Schaum, im Eimer daneben schwimmt ein Schwamm.' },
      { id: 'privat1', x: 19.5 + 1.5, z: 26.6, art: 'auto', farbe: '#b03a2e', h: N, fest: [2, 4.4], name: 'Roter Kleinwagen', verb: 'sieh', sieh: 'Ein kleiner roter Wagen mit einem Aufkleber: „Frikadellen sind auch eine Lösung.“ Das kann nur Hannes sein.' },
      { id: 'privat2', x: 28.5 + 1.5, z: 26.6, art: 'auto', farbe: '#2f5a44', h: N, fest: [2, 4.4], name: 'Grüner Kombi', verb: 'sieh', sieh: 'Ein dunkelgrüner Kombi, mindestens zwanzig Jahre alt und blitzsauber. Am Spiegel baumelt ein kleiner Anker. Ottos Wagen.' },
      { id: 'privat3', x: 37.5 + 1.5, z: 26.6, art: 'auto', farbe: '#d9dcdf', h: N, fest: [2, 4.4], name: 'Silberner Wagen', verb: 'sieh', sieh: 'Ein silberner Wagen mit Kindersitz auf der Rückbank und Sand im Fußraum.' },
      { id: 'besucher', x: 22, z: -14.6, art: 'auto', farbe: '#3d6fa0', h: N, fest: [2, 4.4], name: 'Blauer Wagen', verb: 'sieh', sieh: 'Ein blauer Wagen auf dem Besucher-Parkplatz. Hinter der Scheibe liegt eine Parkscheibe – ordentlich eingestellt.' },
      { id: 'c_vorn', x: 6, z: 17.2, name: 'Scheinwerfer und Blinker prüfen', art: 'punkt', akt: 'check', wenn: 'briefing', bis: 'c_vorn', nah: 1.6, verb: 'sieh' },
      { id: 'c_reifen1', x: 4.2, z: 15.3, name: 'Reifen links prüfen', art: 'punkt', akt: 'check', wenn: 'briefing', bis: 'c_reifen1', nah: 1.6, verb: 'sieh' },
      { id: 'c_reifen2', x: 7.8, z: 12.7, name: 'Reifen rechts prüfen', art: 'punkt', akt: 'check', wenn: 'briefing', bis: 'c_reifen2', nah: 1.6, verb: 'sieh' },
      { id: 'c_heck', x: 6, z: 10.8, name: 'Rücklichter und Kofferraum prüfen', art: 'punkt', akt: 'check', wenn: 'briefing', bis: 'c_heck', nah: 1.6, verb: 'sieh' },
      { id: 'einsteigen', x: 4.2, z: 13.6, name: 'In den Streifenwagen einsteigen', art: 'punkt', akt: 'einsteigen_hof', wenn: 'briefing', nah: 1.6, farbe: '#3fa7ff', sieh: 'Die Fahrertür von Möwe 14.' },
      // Gewahrsam: Schließfächer für die Waffe und die drei Zellentüren
      { id: 'waffenfach', x: 31.7, z: 1.1, h: V, name: 'Waffenschließfach', art: 'waffenfach', akt: 'waffenfach', nah: 2.2, sieh: 'Sechs kleine Stahlfächer mit Schlüssel. Darüber ein rotes Schild: Waffen einschließen! In den Zellentrakt geht niemand mit Pistole.' },
      ...[33.4, 37.25, 41.1].map((x, i) => ({ id: 'zelle' + (i + 1), nr: i + 1, x, z: 0, name: `Zelle ${i + 1}`, art: 'zellentuer', akt: 'zelle', nah: 2.4, fest: [1.4, 0.3], sieh: 'Eine schwere Stahltür mit zwei Riegeln. In der Mitte die Klappe für das Essen, darüber das Guckloch. Von innen gibt es keine Klinke.' })),
    ],
    leute: [
      { id: 'otto', x: 2, z: 3.5, name: 'Otto Brandl', akt: 'otto', sieh: OTTO_SIEH, bis: 'briefing', look: OTTO_LOOK },
      { id: 'otto', x: 2.5, z: 15, name: 'Otto Brandl', akt: 'otto', sieh: OTTO_SIEH, wenn: 'briefing', look: OTTO_LOOK },
      { id: 'selin', x: 0, z: -7.5, name: 'Selin Aydin (Leiterin der Wache)', akt: 'selin', bis: 'briefing', look: { ...POLIZEI, haar: '#1e1a17', muetze: null, modell: 'selin', art: 'frau' }, sieh: 'Selin Aydin leitet die Wache. Kerzengerade, die Uniform wie gebügelt. Sie sieht von ihren Unterlagen auf, bevor du etwas sagst.' },
      // Nach der Besprechung sitzt sie in ihrem Büro am Rechner
      { id: 'selin', x: 16.5, z: -6.28, h: 0, name: 'Selin Aydin (Leiterin der Wache)', akt: 'selin', wenn: 'briefing', nah: 2.6, look: { ...POLIZEI, haar: '#1e1a17', muetze: null, modell: 'selin', art: 'frau', arbeit: 'tippen' }, sieh: 'Selin Aydin sitzt in ihrem Büro am Rechner und schreibt den Dienstplan für nächste Woche. Kerzengerade, auch im Sitzen.' },
      { id: 'petersen', x: 12.78, z: -3.2, h: V, name: 'Frau Petersen (Leitstelle)', akt: 'petersen', nah: 2.4, look: { hemd: '#7a4fa0', hose: '#333', haut: '#f0c8a0', haar: '#d8d2c4', modell: 'petersen', art: 'frau', arbeit: 'tippen' }, sieh: 'Frau Petersen sitzt mit Kopfhörer am Funkpult und tippt. Vor ihr zwei Bildschirme – auf einem die Kameras vom Hof – und eine Tasse mit einer Möwe darauf.' },
      { id: 'hanne', x: 22.2, z: -8.2, h: 0, name: 'Hanne (Pausenraum)', akt: 'hanne', nah: 2.6, runde: [[22.2, -8.1, 14, 0], [21.0, -8.75, 9, N], [24.3, -8.6, 6, 1.2], [23.2, -8.1, 8, 0], [22.6, -8.75, 7, N]], look: { hemd: '#ffffff', hose: '#444', haut: '#e8b890', haar: '#a03a2a', modell: 'hanne', art: 'frau' }, sieh: 'Hanne ist hinter der Theke im Pausenraum unterwegs: Kaffee aufsetzen, Brötchen aus dem Kühlschrank, wischen, obwohl alles sauber ist. Ihr entgeht hier nichts.' },
      // Harms ist in der Waffenkammer – außer wenn du jemanden einlieferst: Dann wartet er im Gewahrsam.
      { ...HARMS_KAMMER, bis: 'gefangen1' }, { ...HARMS_KAMMER, wenn: 'abgabe1', bis: 'gefangen2' }, { ...HARMS_KAMMER, wenn: 'abgabe2' },
      { ...HARMS_GEWAHRSAM, wenn: 'gefangen1', bis: 'abgabe1' }, { ...HARMS_GEWAHRSAM, wenn: 'gefangen2', bis: 'abgabe2' },
      // Die Festgenommenen: Erst laufen sie neben dir her (folgt), später sitzen sie in ihrer Zelle.
      { id: 'gef1', folgt: true, x: 5.2, z: 12.4, name: 'Timo Reents', akt: 'gefangener', wenn: 'gefangen1', bis: 'zelle1', look: TIMO, sieh: 'Timo Reents, der Fahrer des dunklen Kombi. Die Hände in Handschellen vor dem Bauch, den Blick auf dem Boden. Er humpelt.' },
      { id: 'gef2', folgt: true, x: 5.2, z: 12.4, name: 'Der Taschendieb', akt: 'gefangener', wenn: 'gefangen2', bis: 'zelle2', look: DIEB, sieh: 'Der Mann vom Käsestand. Ohne Rucksack sieht er schmaler aus. Er mustert jede Tür, an der ihr vorbeikommt.' },
      { id: 'timo_zelle', x: 33.6, z: -5.25, y: 0.5, h: -V, name: 'Timo Reents (Zelle 1)', akt: 'zellenmann', nah: 6, wenn: 'zelle1', look: { ...TIMO, sitzt: true }, sieh: 'Timo sitzt auf der Liege, das verletzte Bein ausgestreckt. Er zupft an der grauen Decke und schaut nicht zur Tür.' },
      { id: 'dieb_zelle', x: 37.25, z: -1.9, h: 0, name: 'Der Taschendieb (Zelle 2)', akt: 'zellenmann', nah: 3.4, wenn: 'zelle2', look: DIEB, sieh: 'Der Taschendieb steht dicht an der Tür und lauscht. Als er dich bemerkt, tut er, als würde er die Wand betrachten.' },
      // Kollegen im Dienst. "runde" = ihr Weg durch die Wache: Punkte [x, z, Pause in Sekunden, Blickrichtung in der Pause]. Sie gehen ihn immer wieder ab.
      { id: 'dirks', x: 6.9, z: -1.76, name: 'Jan Dirks (Möwe 12)', akt: 'kollege', look: KOLLEGE('pol1', 'mann'), sieh: 'Jan Dirks fährt Möwe 12. Fast zwei Meter groß, die Ärmel hochgekrempelt. Er tippt seinen Bericht von gestern Nacht – und holt zwischendurch etwas aus seinem Spind.',
        runde: [[6.9, -1.76, 34, 0, 'tippen'], [7.8, -1.8], [8.6, -2.3], [9.5, -1.4], [9.5, 1.8], [-9.3, 1.8], [-9.5, -1.6], [-8.2, -5, 9, -1.57], [-9.5, -1.6], [-9.3, 1.8], [9.5, 1.8], [9.5, -1.4], [8.6, -2.3], [7.8, -1.8]] },
      { id: 'tammen', x: 9, z: 9.5, name: 'Meike Tammen (Möwe 12)', akt: 'kollege', look: KOLLEGE('pol2', 'frau'), sieh: 'Meike Tammen, die Beifahrerin von Möwe 12. Pferdeschwanz, wacher Blick. Sie schaut am Wagen nach dem Rechten, liest den Dienstplan und trägt im Besprechungsraum ihre Einsätze in den Rechner ein.',
        runde: [[9, 9.5, 9, 0.9], [1.9, 8.6], [0.9, 7.2], [0, 1.4], [0, -1.3], [3.6, -2.2], [3.7, -6.2, 7, -1.95], [3.2, -2.9], [2.5, -3.3], [1.8, -3.4, 24, N, 'tippen'], [2.5, -3.3], [2.2, -2.2], [0, -1.3], [0, 1.4], [0.9, 7.2], [1.9, 8.6]] },
      { id: 'okafor', x: -7.9, z: 16.6, name: 'Ben Okafor (Möwe 9)', akt: 'kollege', look: KOLLEGE('pol3', 'mann'), sieh: 'Ben Okafor prüft Möwe 9 vor der Streife – Reifen, Lichter, Kofferraum. Genau das, was Otto gleich von dir sehen will.',
        runde: [[-7.9, 16.6, 6, 1.57], [-6, 17.6, 5, 3.14], [-4.2, 17.2], [-4.1, 15, 6, -1.57], [-4.1, 10.6], [-6, 10.2, 6, 0], [-7.9, 10.6]] },
      { id: 'luehrs', x: 7.0, z: -5.7, h: N, name: 'Linh Lührs (Wachdienst)', akt: 'kollege', nah: 2.4, look: KOLLEGE('pol4', 'frau'), sieh: 'Linh Lührs hat heute Wachdienst. Sie sitzt am Tresen hinter der Scheibe und tippt Anzeigen in den Rechner, eine nach der anderen. Zwischendurch holt sie eine Akte aus dem Schrank.',
        runde: [[7.0, -5.7, 30, N, 'tippen'], [7.9, -5.6], [8.2, -4.6], [11.7, -1.5, 7, 0.6], [8.8, -4.4], [8.8, -5.45, 12, N], [7.9, -5.6]] },
      { id: 'lotte', x: -3, z: 3.6, name: 'Lotte (Diensthund)', akt: 'lotte', hund: true, sieh: 'Lotte, der Diensthund. Ein Schäferhund mit grauer Schnauze. Sie hebt ein Ohr und lässt es wieder fallen.' },
      // Bürger im Wartebereich
      { id: 'buerger1', x: 5.72, z: -8.3, h: V, name: 'Herr Janßen', akt: 'buerger', look: { hemd: '#8a7a5a', hose: '#444', haut: '#f0c8a0', haar: '#cfcfcf', modell: 'p6', art: 'mann', arbeit: 'ruhe', sitzHoch: 0.58 }, sieh: 'Ein älterer Herr sitzt im Wartebereich. Er hält eine Fahrradklingel in der Hand – ohne Fahrrad.' },
      { id: 'buerger2', x: 12.03, z: -9.4, h: 0, name: 'Frau Nguyen', akt: 'buerger', look: { hemd: '#c96a7a', hose: '#333', haut: '#e8c8a0', haar: '#1e1a17', modell: 'p3', art: 'frau', arbeit: 'ruhe', sitzHoch: 0.58 }, sieh: 'Eine Frau sitzt auf den Wartestühlen, einen dicken Umschlag auf dem Schoß. Sie schaut alle paar Sekunden zum Tresen.' },
    ],
  };
}
