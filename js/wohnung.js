// Blaulicht über Möwenbrück – Kims Wohnung: Fleetufer 7, zweiter Stock (ohne three.js, nur Daten).
//
// Hier beginnt und endet jeder Tag: morgens Wecker, Dusche, Anziehen, Frühstück – abends nach Hause kommen und ins Bett.
// Eine kleine Wohnung für einen jungen Polizisten, der allein wohnt: ein großes Zimmer zum Wohnen und Schlafen,
// eine offene Küche mit Tresen, ein Bad und ein schmaler Flur, in dem das Fahrrad steht.
//
// Maße in Metern wie überall: x = seitlich (rechts ist plus), z = längs (zur Kamera hin ist plus).
// Die Möbel-Formen stehen in js/wohnmoebel.js (Bett, Sofa, Gitarre …) und js/einrichtung.js (Küche, Dusche …).
//
//          Norden (Fenster zum Fleet)
//   +---------------------------------------+
//   | Bett   Schreibtisch  Regal   Fenster  |
//   | Schrank                 Sofa   TV     |      Wohn- und Schlafzimmer
//   | Wäsche  Hanteln               Tresen  |
//   +-----------+--  --+--   ---------------+
//   |  Bad      | Flur |   Küche            |
//   +-----------+-Tür--+--------------------+

import { WACHE_X, WACHE_Z } from './wache.js';

const V = Math.PI / 2, N = Math.PI;       // Drehungen: 0 = schaut nach Süden (zur Kamera), N = nach Norden, V = nach Osten, -V = nach Westen

// Hier parkt dein eigenes Auto: [x, z, Richtung] in Stadt-Maßen.
export const PRIVAT_ZUHAUSE = [303.85, 85, N];                       // am Straßenrand vor dem Haus Fleetufer 7
export const PRIVAT_WACHE = [18 + WACHE_X, 26.6 + WACHE_Z, N];       // freier Platz auf dem Parkplatz der Dienstgruppe (hinter der Wache)
export const HAUSTUER = [310.6, 85];                                 // die Haustür von Fleetufer 7 (an der Straßenseite)

// Eine dünne Wand von (x1, z1) nach (x2, z2) – entweder waagerecht oder senkrecht.
function wand(x1, z1, x2, z2) {
  const d = 0.15;
  return [Math.min(x1, x2) - d, Math.min(z1, z2) - d, Math.max(x1, x2) + d, Math.max(z1, z2) + d];
}

const HOLZ = '#a9825a', DUNKEL = '#5a4632', WEISS = '#f2f2ee';
// Ein Ding zum Antippen an einem Möbel: Man sieht keinen gelben Ring, das Möbel selbst ist das Ding (art: 'spur' ohne Bild).
const ding = (id, x, z, name, sieh, mehr = {}) => ({ id, x, z, name, sieh, art: 'spur', nah: 1.7, ...mehr });
const nurSehen = (id, x, z, name, sieh) => ding(id, x, z, name, sieh, { verb: 'sieh' });

export const WOHNUNG = {
  name: 'Fleetufer 7 · deine Wohnung',
  gross: [-5.3, -4.1, 5.3, 4.1],
  kamera: [8.5, 5.5],
  tempo: 2.0,                  // drinnen geht man, man rennt nicht
  schatten: 12,
  aussen: '#20262e',
  wandFarbe: '#efe9dc',
  boden: [
    { r: [-5, -3.8, 5, 1.2], farbe: '#c9a678', art: 'parkett' },          // Wohn- und Schlafzimmer
    { r: [-1.2, 1.2, 1.2, 3.8], farbe: '#c9a678', art: 'parkett' },       // Flur
    { r: [-5, 1.2, -1.2, 3.8], farbe: '#cfe0e6', art: 'fliesen' },        // Bad
    { r: [1.2, 1.2, 5, 3.8], farbe: '#e6dccb', art: 'fliesen' },          // Küche
  ],
  waende: [
    wand(-5, -3.8, 1.6, -3.8), wand(3.6, -3.8, 5, -3.8),                  // Norden (dazwischen das Fenster)
    wand(-5, -3.8, -5, 3.8), wand(5, -3.8, 5, 3.8), wand(-5, 3.8, 5, 3.8),
    wand(-5, 1.2, -0.5, 1.2), wand(0.5, 1.2, 1.35, 1.2),                  // zwischen Zimmer und Bad / Flur
    wand(-1.2, 1.2, -1.2, 2.1), wand(-1.2, 3.0, -1.2, 3.8),               // zwischen Bad und Flur (mit Tür)
    wand(1.2, 1.2, 1.2, 3.8),                                             // zwischen Flur und Küche
  ],
  glaswaende: [wand(1.6, -3.8, 3.6, -3.8)],
  tueren: [{ x: 0, z: 1.2, b: 1.0, farbe: '#e9e2cf' }, { x: -1.2, z: 2.55, b: 0.9, quer: true, farbe: '#e9e2cf' }],
  moebel: [
    // ----- Schlafecke
    { x: -4.15, z: -2.62, b: 1.4, t: 2.05, h: 0.6, farbe: DUNKEL, form: 'bett' },
    { x: -3.12, z: -3.42, b: 0.5, t: 0.44, h: 0.52, farbe: DUNKEL, form: 'nachttisch' },
    { x: -4.62, z: -0.3, b: 0.6, t: 1.5, h: 1.9, farbe: '#e4dccb', form: 'kleiderschrank', dreh: V },
    // ----- Arbeitsecke
    { x: -1.3, z: -3.35, b: 1.5, t: 0.65, h: 0.75, farbe: HOLZ, form: 'schreibtisch' },
    { x: 0.45, z: -3.5, b: 1.0, t: 0.3, h: 1.8, farbe: HOLZ, form: 'buecherregal' },
    // ----- Wohnecke
    { x: 2.25, z: -1.25, b: 0.9, t: 1.9, h: 0.8, farbe: '#5c6b7a', form: 'sofa', dreh: V },
    { x: 3.45, z: -1.25, b: 0.6, t: 1.1, h: 0.42, farbe: HOLZ, form: 'couchtisch', dreh: V },
    { x: 4.62, z: -1.25, b: 0.45, t: 1.5, h: 0.5, farbe: '#3a2f25', form: 'tv', dreh: -V },
    { x: 3.3, z: -1.25, b: 3.0, t: 2.6, h: 0.02, farbe: '#8a3d35', form: 'teppich', durch: true },
    { x: 4.5, z: -3.3, b: 0.4, t: 0.4, h: 1.35, farbe: '#2f7a3a', form: 'pflanze' },
    { x: 4.55, z: 0.25, b: 0.4, t: 0.5, h: 1.3, farbe: '#c98a3a', form: 'gitarre', dreh: -V },
    // ----- Sport und Wäsche
    { x: -2.85, z: 0.4, b: 1.3, t: 0.8, h: 0.03, farbe: '#2f6f7a', form: 'hanteln', durch: true },
    { x: -4.3, z: 0.52, b: 0.9, t: 0.8, h: 0.9, farbe: '#b8bcc0', form: 'waeschestaender' },
    // ----- Küche: Tresen zum Zimmer hin, Küchenzeile an der Wand, Kühlschrank
    { x: 3.7, z: 1.2, b: 2.6, t: 0.6, h: 1.0, farbe: '#e9e4d8', form: 'bar' },
    { x: 4.6, z: 2.75, b: 0.65, t: 2.1, h: 0.9, farbe: '#e9e4d8', form: 'kueche', dreh: -V },
    { x: 1.7, z: 3.35, b: 0.7, t: 0.7, h: 1.8, farbe: '#d9dcdf', form: 'kuehlschrank', dreh: V },
    // ----- Bad
    { x: -4.4, z: 3.2, b: 1.0, t: 1.0, h: 1.9, farbe: '#e6ebe6', form: 'dusche', dreh: V },
    { x: -4.3, z: 1.72, b: 0.7, t: 0.75, h: 0.8, farbe: WEISS, form: 'wc' },
    { x: -3.0, z: 1.62, b: 0.8, t: 0.5, h: 0.85, farbe: '#e9ecee', form: 'waschtisch' },
    { x: -1.75, z: 1.66, b: 0.6, t: 0.6, h: 0.85, farbe: WEISS, form: 'waschmaschine' },
    // ----- Flur
    { x: 0.92, z: 2.25, b: 0.4, t: 1.75, h: 1.0, farbe: '#c0392b', form: 'fahrrad' },
    { x: -0.95, z: 1.72, b: 0.3, t: 0.75, h: 0.5, farbe: HOLZ, form: 'schuhregal', dreh: V },
    { x: -0.85, z: 3.42, b: 0.4, t: 0.4, h: 1.8, farbe: '#222', form: 'garderobe' },
  ],
  deko: [
    { form: 'drehstuhl', x: -1.3, z: -2.6, dreh: N + 0.35, farbe: '#2b3440' },
    { form: 'stehlampe', x: 2.2, z: -2.55 },
    { form: 'konsole', x: 4.62, z: -2.35, dreh: -V },
    { form: 'heizung', x: 2.6, z: -3.58, b: 1.4 },
    { form: 'vorhang', x: 1.42, z: -3.6, b: 0.36, h: 1.5, farbe: '#3f6a9a' }, { form: 'vorhang', x: 3.78, z: -3.6, b: 0.36, h: 1.5, farbe: '#3f6a9a' },
    { form: 'sporttasche', x: -3.6, z: -0.75, dreh: 0.5 },
    { form: 'barhocker', x: 3.1, z: 0.6 }, { form: 'barhocker', x: 4.1, z: 0.62 },
    { form: 'getraenkekiste', x: 1.62, z: 2.5, dreh: V }, { form: 'papierkorb', x: 2.05, z: 3.5 },
    { form: 'badematte', x: -3.3, z: 3.05, b: 0.8, t: 0.5, farbe: '#3f6a9a' },
    { form: 'handtuch', x: -4.84, z: 2.3, dreh: V }, { form: 'waeschekorb', x: -1.65, z: 3.4 },
    { form: 'fussmatte', x: 0, z: 3.25, b: 0.8, t: 0.5 },
    { form: 'wohnungstuer', x: 0, z: 3.64, dreh: N },
    { form: 'schluesselbrett', x: 0.78, z: 3.645, dreh: N },
    // Bilder an den Wänden
    { form: 'poster', bild: 'leuchtturm', x: -1.95, z: -3.645, b: 0.5 },
    { form: 'poster', bild: 'urkunde', x: -0.75, z: -3.645, b: 0.36, h: 0.27, hoch: 1.22, rahmen: '#3a2a20' },
    { form: 'poster', bild: 'familie', x: -3.1, z: -3.645, b: 0.32, h: 0.24, hoch: 1.2, rahmen: '#d8d2c4' },
    { form: 'poster', bild: 'handball', x: 1.12, z: -3.645, b: 0.4 },
    { form: 'poster', bild: 'band', x: -4.845, z: -2.5, b: 0.55, dreh: V },
    { form: 'wandregal', x: -4.2, z: -3.65, b: 0.9, hoch: 1.22, farbe: HOLZ },
  ],
  schilder: [],
  dinge: [
    // ----- Damit geht die Geschichte weiter
    ding('wecker', -3.12, -2.85, 'Wecker', 'Ein alter Wecker mit zwei Glocken. Er hat schon deinem Opa gehört und ist lauter als jede Sirene.', { akt: 'wecker' }),
    ding('bett', -3.1, -2.1, 'Dein Bett', 'Dein Bett. Die Decke liegt so, wie du heute Morgen herausgekrochen bist.', { akt: 'bett' }),
    ding('kleiderschrank', -3.95, -0.3, 'Kleiderschrank', 'Dein Kleiderschrank. Links hängen drei Pullover, rechts die Trainingsjacke vom Handball. Die Uniform bleibt immer in der Wache.', { akt: 'kleiderschrank' }),
    ding('dusche', -3.55, 3.2, 'Dusche', 'Die Dusche. Das Wasser braucht genau elf Sekunden, bis es warm ist. Du hast mitgezählt.', { akt: 'dusche' }),
    ding('waschbecken', -3.0, 2.25, 'Waschbecken', 'Waschbecken, Zahnbürste, Rasierer. Im Spiegel schaut dich ein junger Polizist an.', { akt: 'waschbecken' }),
    ding('kaffee', 3.95, 2.3, 'Kaffeemaschine', 'Die Kaffeemaschine war ein Geschenk von Mama zum Einzug. Daneben steht deine Tasse mit dem Aufdruck: Bester Torwart.', { akt: 'kaffee' }),
    ding('kuehlschrank', 2.35, 3.35, 'Kühlschrank', 'Am Kühlschrank kleben der Dienstplan, ein Foto vom Handball und ein Zettel: Milch kaufen!', { akt: 'kuehlschrank' }),
    ding('schluesselbrett', 0.6, 3.2, 'Schlüsselbrett', 'Das Schlüsselbrett neben der Tür: Wohnungsschlüssel und Autoschlüssel. Der dritte Haken ist für den Fahrradschlüssel, und der ist immer woanders.', { akt: 'schluesselbrett', nah: 1.4 }),
    ding('wohnungstuer', 0, 3.15, 'Wohnungstür', 'Deine Wohnungstür. Auf dem Klingelschild draußen steht: K. Berger.', { akt: 'wohnungstuer', nah: 1.4 }),
    ding('fernseher', 4.0, -0.35, 'Fernseher', 'Dein Fernseher. Daneben liegt die Spielkonsole mit zwei Controllern. Den zweiten benutzt nur dein Kumpel Malte.', { akt: 'fernseher' }),
    ding('handy', 3.05, -1.9, 'Dein Handy', 'Dein Handy liegt auf dem Couchtisch. Das Display hat einen Sprung, seit es dir beim Training aus der Tasche gefallen ist.', { akt: 'handy' }),
    ding('gitarre', 4.05, 0.25, 'Gitarre', 'Deine Gitarre. Du kannst genau vier Lieder, und drei davon sind dasselbe.', { akt: 'gitarre' }),
    // ----- Nur zum Ansehen
    nurSehen('schreibtisch', -1.3, -2.2, 'Schreibtisch', 'Dein Schreibtisch. Neben dem Rechner liegen Lernkarten für die Prüfung im Verkehrsrecht und ein Stadtplan von Möwenbrück. Die Straßen im Hafen hast du gelb angemalt.'),
    nurSehen('regal', 0.45, -2.85, 'Bücherregal', 'Unten stehen die roten Gesetzbücher, darüber Krimis. Ganz oben der Pokal: Bezirksmeister im Handball, vor drei Jahren. Du standest im Tor.'),
    nurSehen('urkunde', -0.75, -2.75, 'Urkunde an der Wand', 'Eine Urkunde im Rahmen: Polizeischule bestanden. Dein Name ist richtig geschrieben. Das ist bei Berger nicht schwer.'),
    nurSehen('foto', -2.6, -3.1, 'Foto an der Wand', 'Ein Foto von zu Hause: Mama, Papa und deine kleine Schwester Jule am Deich. Jule zieht eine Grimasse. Wie immer.'),
    nurSehen('sofa', 2.9, -0.6, 'Sofa', 'Dein Sofa. Die rote Wolldecke hat Oma gestrickt. Sie kratzt ein bisschen, aber das sagst du ihr nie.'),
    nurSehen('pizza', 3.45, -2.05, 'Pizzakarton', 'Ein Pizzakarton von Da Enzo. Zwei Stücke Salami sind noch drin. Enzo kennt deine Bestellung schon auswendig.'),
    nurSehen('hanteln', -2.85, -0.25, 'Hanteln', 'Zwei Hanteln, eine Kugelhantel und ein Springseil. Wer bei der Polizei arbeitet, muss fit bleiben.'),
    nurSehen('waeschestaender', -3.6, 0.55, 'Wäscheständer', 'Der Wäscheständer. Die Socken hängen hier seit Donnerstag. Trocken sind sie längst.'),
    nurSehen('fenster', 2.6, -3.0, 'Fenster', 'Unten liegt der Fleet, dahinter die Dächer der Speicherstadt. Ganz hinten dreht sich das Licht vom Leuchtturm.'),
    nurSehen('pflanze', 4.1, -2.9, 'Gummibaum', 'Der Gummibaum heißt Horst. Er war schon da, als du eingezogen bist, und er überlebt alles.'),
    nurSehen('fahrrad', 0.3, 2.25, 'Fahrrad', 'Dein Fahrrad steht im Flur, weil es im Keller keinen Platz gibt. Die Nachbarin findet das nicht gut.'),
    nurSehen('waschmaschine', -1.9, 2.35, 'Waschmaschine', 'Die Waschmaschine. Sie wandert beim Schleudern jedes Mal ein Stück durchs Bad.'),
    nurSehen('garderobe', -0.5, 3.0, 'Garderobe', 'An der Garderobe hängen deine Regenjacke und eine Mütze. In Möwenbrück braucht man beides das ganze Jahr.'),
  ],
  leute: [],
};
