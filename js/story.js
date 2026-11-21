// Blaulicht über Möwenbrück – die Geschichte. Fall 1 „Die Feder im Museum“, Tag 1.
//
// Diese Datei kennt keine Grafik. Sie spricht nur mit dem Spiel über das Werkzeug "S":
//   await S.sag(wer, text)            – jemand sagt etwas (wartet, bis der Spieler weiterklickt)
//   await S.wahl(wer, frage, [..])    – der Spieler wählt eine Antwort, zurück kommt die Nummer (0, 1, 2 …)
//   await S.schloss(titel)            – Zahlenschloss, zurück kommt die getippte Zahl oder null
//   S.flag(name) / S.hat(name)        – einen Merker setzen / fragen, ob er gesetzt ist
//   S.punkte(zahl, wofuer)            – Sorgfalts-Punkte geben
//   S.notiz(text)                     – etwas ins Notizbuch schreiben
//   S.gib(sache)                      – etwas in die Tasche stecken
//   S.ziel(text, [ort, x, z])         – was als Nächstes zu tun ist (mit Wegweiser)
//   S.ort(name, x, z)                 – an einen anderen Ort wechseln
//   S.klang(name)                     – ein Geräusch abspielen (Namen stehen in klang.js)
//   S.auto(true/false), S.licht(..), S.uhr(..), S.blaulicht(), S.speichern(), await S.ende(..)
// So kann dasselbe auch ohne Bildschirm durchgespielt werden (tools/story.mjs).

const OTTO = 'Otto Brandl', SELIN = 'Selin Aydin', FUNK = 'Leitstelle (Frau Petersen)', KIM = 'Kim';

export const START = { ort: 'wache', x: 0, z: 3.5, licht: 'tag', uhr: '06:00' };
export const MAX_PUNKTE = 37;

// Was in der Tasche sein kann.
export const SACHEN = {
  ausweis: { name: 'Dienstausweis', text: 'Kim Berger, Polizeianwärter/in, Polizei Möwenbrück. Dienstnummer: 4172' },
  funk: { name: 'Funkgerät', text: 'Damit sprichst du mit der Leitstelle. Dein Funkname: Möwe 14.' },
  notizbuch: { name: 'Notizbuch', text: 'Hier steht alles Wichtige, das du gesehen oder gehört hast.' },
  lampe: { name: 'Taschenlampe', text: 'Geht von allein an, wenn es dunkel ist. Spuren sieht man nur im Lichtkegel.' },
  weste: { name: 'Warnweste', text: 'Leuchtet gelb. Für Einsätze an der Straße.' },
  schluessel: { name: 'Autoschlüssel', text: 'Für den Streifenwagen Möwe 14.' },
};

export async function beginn(S) {
  await S.sag('', 'Montag, 6:00 Uhr. Dein erster Tag bei der Polizei in der Hafenstadt Möwenbrück.');
  await S.sag(OTTO, 'Moin! Du musst Kim Berger sein. Ich bin Otto Brandl, dein Ausbilder. Seit 30 Jahren fahre ich hier Streife.');
  await S.sag(OTTO, 'Erste Regel: Ordnung vor dem Dienst. Hol deine Ausrüstung aus dem Spind in der Umkleide, hinten links.');
  await S.sag(OTTO, 'Die Zahl für das Schloss ist deine Dienstnummer. Die steht auf deinem Ausweis – schau in deine Tasche (🎒).');
  S.gib('ausweis');
  S.ziel('Hol deine Ausrüstung aus dem Spind in der Umkleide', ['wache', -12.2, -6]);
}

const CHECKS = {
  c_vorn: 'Du schaltest das Licht ein und gehst nach vorn: Beide Scheinwerfer leuchten, die Blinker blinken.',
  c_reifen1: 'Der Reifen ist prall, das Profil ist tief genug. Kein Nagel, kein Riss.',
  c_reifen2: 'Auch dieser Reifen ist in Ordnung. Otto tritt zur Sicherheit einmal dagegen.',
  c_heck: 'Rücklichter und Bremslicht gehen. Im Kofferraum liegen Warndreieck, Verbandskasten und Absperrband.',
};
const SPUREN = {
  spur_feder: ['In der Vitrine liegt eine schwarz-weiße Feder. Sie gehört nicht zur Ausstellung – jemand hat sie hingelegt.',
    'Museum: schwarz-weiße Feder in der Vitrine in der Mitte'],
  spur_fuss: ['Im Lichtkegel siehst du auf dem Boden einen Fußabdruck aus feuchter Erde. Grobes Profil, ziemlich groß.',
    'Museum: Fußabdruck unter dem Westfenster, großer Schuh mit grobem Profil'],
  spur_kratzer: ['Diese Vitrine ist leer. Am Schloss sind frische Kratzer: Sie wurde mit Werkzeug geöffnet. Auf dem Schild steht: „Gildenbuch der Fischer, 1702“.',
    'Museum: Vitrine vom Gildenbuch aufgebrochen, Kratzer am Schloss'],
};

function spurenZahl(S) { return Object.keys(SPUREN).filter(k => S.hat(k)).length; }

export const AKT = {
  // ------------------------------------------------------------------ Wache
  async otto(S) {
    if (S.hat('tagEnde')) return S.sag(OTTO, 'Feierabend, Kim. Bis morgen.');
    if (S.wo() === 'museum') return AKT.otto_museum(S);
    if (!S.hat('spind')) return S.sag(OTTO, 'Dein Spind ist in der Umkleide, hinten links. Die Zahl ist deine Dienstnummer vom Ausweis.');
    if (!S.hat('briefing')) return S.sag(OTTO, 'Ab zum Briefing in den Besprechungsraum, die Tür in der Mitte. Die Chefin wartet nicht gern.');
    if (!S.hat('wagen')) return S.sag(OTTO, 'Vor jeder Fahrt gehen wir einmal um den Wagen: Licht, Reifen links, Reifen rechts, Heck. Das sind die vier gelben Stellen.');
    if (!S.hat('angemeldet')) return S.sag(OTTO, 'Steig ein. Und dann meldest du uns über Funk an.');
    if (!S.hat('kitaFertig')) return S.sag(OTTO, S.hat('halter') ? 'Der Halter ist der Bäcker von nebenan. Sprich ihn an – freundlich, aber deutlich.'
      : S.hat('kennz') ? 'Wem gehört der Wagen? Frag die Leitstelle über Funk (📻).' : 'Sieh dir den grauen Wagen an und schreib das Kennzeichen auf.');
    if (!S.hat('markt')) return S.sag(OTTO, 'Melde der Leitstelle, dass wir hier fertig sind.');
    if (!S.hat('marktFertig')) return S.sag(OTTO, S.hat('benName') ? 'Gelber Regenmantel, blauer Rucksack. Schau genau hin, bevor du jemanden ansprichst.'
      : 'Sprich mit dem Jungen. Denk dran: Er hat Angst.');
    if (!S.hat('alarm')) return S.sag(OTTO, 'Komm, zurück zum Wagen.');
    return S.sag(OTTO, 'Zum Museum, Kim. Die Tür ist an der Straßenseite.');
  },

  async lotte(S) { S.klang('hund'); await S.sag('Lotte', 'Wuff! (Lotte wedelt mit dem Schwanz und schnuppert an deinen Schuhen.)'); },
  async hanne(S) {
    await S.sag('Hanne', 'Na, du bist also das neue Küken? Ich bin Hanne. Bei mir gibt es mittags Frikadellen – und immer den neuesten Klatsch.');
    await S.sag('Hanne', 'Pass gut auf den Otto auf. Der geht bald in Rente und tut so, als wäre ihm das egal.');
  },
  async petersen(S) {
    await S.sag(FUNK, 'Ich bin Frau Petersen. Wenn du draußen „Möwe 14 an Leitstelle“ sagst, bin ich das am anderen Ende.');
    await S.sag(FUNK, 'Merk dir: Erst sagen, wer du bist. Dann, wo du bist. Dann, was du brauchst.');
  },

  async spind(S) {
    if (S.hat('spind')) return S.sag('', 'Dein Spind. Deine Jacke hängt drin, sonst ist er leer.');
    const zahl = await S.schloss('Zahlenschloss an deinem Spind');
    if (zahl === null) return;
    if (zahl !== '4172') return S.sag('', 'Das Schloss bleibt zu. (Tipp: Die Dienstnummer steht auf deinem Ausweis in der Tasche 🎒.)');
    S.klang('schloss');
    await S.sag('', 'Klick! Der Spind geht auf. Du ziehst die Uniform an und nimmst Funkgerät, Notizbuch, Taschenlampe, Warnweste und den Autoschlüssel.');
    for (const s of ['funk', 'notizbuch', 'lampe', 'weste', 'schluessel']) S.gib(s);
    S.flag('spind'); S.punkte(2, 'Ausrüstung vollständig');
    S.ziel('Geh zum Briefing in den Besprechungsraum', ['wache', 0, -6]);
  },

  async selin(S) {
    if (!S.hat('spind')) return S.sag(SELIN, 'Guten Morgen! Erst umziehen und Ausrüstung holen, dann sehen wir uns beim Briefing.');
    if (S.hat('briefing')) return S.sag(SELIN, 'Guten Dienst, Berger. Und hören Sie auf Brandl – der kennt hier jeden Stein.');
    S.uhr('06:30');
    await S.sag(SELIN, 'Guten Morgen zusammen. Das ist Kim Berger, ab heute bei uns. Herzlich willkommen!');
    await S.sag(SELIN, 'Meldung eins: Vor der Kita Sonnenhang wird morgens immer wieder die Ausfahrt zugeparkt. Bitte dort vorbeischauen.');
    await S.sag(SELIN, 'Meldung zwei: Heute ist Wochenmarkt. Viele Leute – achtet auf Kinder und auf Taschen.');
    await S.sag(SELIN, 'Meldung drei: Das Stadtmuseum hat eine neue Alarmanlage. Letzte Woche hat sie zweimal falsch ausgelöst.');
    const a = await S.wahl('', 'Was machst du während des Briefings?', ['Alles ins Notizbuch schreiben', 'Nur gut zuhören', 'Aus dem Fenster schauen']);
    if (a === 0) {
      S.punkte(2, 'Im Briefing mitgeschrieben');
      S.notiz('Briefing: Kita Sonnenhang – Ausfahrt wird zugeparkt');
      S.notiz('Briefing: Wochenmarkt – auf Kinder und Taschen achten');
      S.notiz('Briefing: Museum – neue Alarmanlage, zweimal Fehlalarm');
    } else if (a === 1) S.punkte(1, 'Im Briefing zugehört');
    else await S.sag(SELIN, 'Berger! Die Möwen können warten. Hier spielt die Musik.');
    await S.sag(SELIN, 'Brandl und Berger fahren heute den Wagen Möwe 14. Guten Dienst!');
    S.flag('briefing');
    await S.sag(OTTO, 'Ich warte im Hof am Wagen. Durch den Flur und dann die große Tür.');
    S.ziel('Geh in den Hof und prüfe den Streifenwagen (4 gelbe Stellen)', ['wache', 6, 14]);
  },

  async check(S, d) {
    await S.sag('', CHECKS[d.id]);
    S.flag(d.id);
    const fertig = Object.keys(CHECKS).filter(k => S.hat(k)).length;
    if (fertig < 4) return S.ziel(`Prüfe den Streifenwagen (${fertig} von 4)`, ['wache', 6, 14]);
    S.flag('wagen'); S.punkte(3, 'Wagen vor der Fahrt geprüft');
    await S.sag(OTTO, 'Alles in Ordnung. Das machen wir jeden Tag so. Wenn bei einem Einsatz das Licht nicht geht, ist es zu spät.');
    S.ziel('Steig in den Streifenwagen (blaue Stelle an der Fahrertür)', ['wache', 4.2, 13.6]);
  },

  async einsteigen_hof(S) {
    if (!S.hat('wagen')) {
      return S.sag(OTTO, 'Halt, nicht so schnell! Erst gehen wir einmal um den Wagen. Stell dir vor, uns platzt mitten im Einsatz ein Reifen.');
    }
    S.uhr('07:00');
    S.ort('stadt', 40, -2.5); S.auto(true);
    await S.sag(OTTO, 'Bevor wir losfahren, melden wir uns bei der Leitstelle an. Drück auf das Funkgerät (📻).');
    S.ziel('Melde dich über Funk bei der Leitstelle an (📻)', null);
  },

  // ------------------------------------------------------------------ Funk
  async f_anmelden(S) {
    await S.sag(KIM, 'Möwe 14 an Leitstelle: Brandl und Berger, wir sind einsatzbereit.');
    await S.sag(FUNK, 'Leitstelle an Möwe 14: Guten Morgen, Otto! Und willkommen, Kim.');
    await S.sag(FUNK, 'Erster Auftrag: Kita Sonnenhang im Süden der Stadt. Ein Auto blockiert die Ausfahrt.');
    S.flag('angemeldet'); S.punkte(1, 'Über Funk angemeldet');
    await S.sag(OTTO, 'Du fährst. Pfeiltasten oder die Knöpfe unten. In der Stadt höchstens 50 – Blaulicht nur, wenn es wirklich eilt. Der Pfeil oben zeigt den Weg.');
    S.ziel('Fahre zur Kita Sonnenhang', ['stadt', -44, 60]);
    S.speichern();
  },
  async f_kennz(S) {
    await S.sag(KIM, 'Möwe 14 an Leitstelle: Bitte Halter abfragen. Kennzeichen MÖ-KB 512, grauer Kombi.');
    await S.sag(FUNK, 'Leitstelle an Möwe 14: Halter ist Jens Kruse, Bäckerei Kruse. Das ist gleich neben der Kita.');
    S.flag('halter'); S.punkte(2, 'Halter über Funk abgefragt');
    S.notiz('Halter des Kombi: Jens Kruse, Bäckerei Kruse (neben der Kita)');
    S.ziel('Sprich mit dem Bäcker', ['stadt', -21, 53.6]);
  },
  async f_kita_fertig(S) {
    await S.sag(KIM, 'Möwe 14 an Leitstelle: Einsatz Kita erledigt, die Ausfahrt ist frei.');
    await S.sag(FUNK, 'Verstanden, Möwe 14. Nächster Auftrag: Auf dem Marktplatz steht ein kleiner Junge ganz allein und weint.');
    S.flag('markt'); S.punkte(1, 'Einsatz-Ende gemeldet'); S.uhr('09:30');
    S.ziel('Fahre zum Marktplatz', ['stadt', -40, -1.5]);
    S.speichern();
  },
  async f_beschreibung(S) {
    await S.sag(KIM, 'Möwe 14 an Leitstelle: Wir suchen die Mutter von Ben, 6 Jahre. Gelber Regenmantel, blauer Rucksack.');
    await S.sag(FUNK, 'Verstanden. Ich sage den Marktleuten Bescheid, die machen eine Durchsage.');
    S.flag('beschr'); S.punkte(2, 'Beschreibung durchgegeben');
  },

  // ------------------------------------------------------------------ Einsatz 1: Kita
  async z_kita(S) {
    await S.sag(OTTO, 'Da vorn steht er, direkt vor der Ausfahrt. Halt an und steig aus (Knopf „Aussteigen“).');
    S.ziel('Sieh dir den grauen Wagen an', ['stadt', -44, 56.4]);
  },
  async erzieherin(S) {
    if (S.hat('kitaFertig')) return S.sag('Erzieherin', 'Vielen Dank! Der Bus ist gut durchgekommen.');
    await S.sag('Erzieherin', 'Gut, dass Sie da sind! Der graue Wagen steht schon wieder vor unserer Ausfahrt. Gleich kommt der Bus mit den Kindern vom Ausflug zurück!');
    if (!S.hat('erz')) { S.flag('erz'); S.punkte(1, 'Zeugin befragt'); S.notiz('Erzieherin: Der graue Wagen steht öfter vor der Ausfahrt, der Bus kommt gleich'); }
  },
  async falschparker(S) {
    await S.sag('', 'Ein grauer Kombi. Er steht genau vor der Ausfahrt der Kita. Niemand sitzt drin. Kennzeichen: MÖ-KB 512.');
    if (S.hat('kennz')) return;
    S.flag('kennz'); S.notiz('Falschparker an der Kita: grauer Kombi, Kennzeichen MÖ-KB 512');
    await S.sag(OTTO, 'Wem gehört der Wagen? Das weiß die Leitstelle. Dafür haben wir den Funk (📻).');
    S.ziel('Frage über Funk das Kennzeichen ab (📻)', null);
  },
  async baecker(S) {
    if (S.hat('kitaFertig')) return S.sag('Bäcker Kruse', 'Kommt nicht wieder vor! Möchten Sie ein Franzbrötchen für den Weg?');
    if (!S.hat('halter')) return S.sag('Bäcker Kruse', 'Moin! Frische Brötchen? Heute sind die Rosinenschnecken besonders gut.');
    for (;;) {
      const a = await S.wahl(KIM, 'Was sagst du zu Herrn Kruse?', [
        'Guten Morgen, Herr Kruse. Ihr Wagen steht vor der Ausfahrt der Kita. Bitte fahren Sie ihn sofort weg.',
        'He! Können Sie nicht lesen? Weg mit der Karre!',
        'Ich schreibe Ihnen jetzt einen Strafzettel.',
      ]);
      if (a === 0) break;
      if (a === 1) await S.sag(OTTO, 'Stopp, Kim. Wir bleiben immer höflich – auch wenn jemand etwas falsch gemacht hat. Versuch es nochmal.');
      else await S.sag(OTTO, 'Erst grüßen und erklären, worum es geht. Dann kann man immer noch über einen Zettel reden. Nochmal.');
    }
    await S.sag('Bäcker Kruse', 'Ach du Schreck! Ich wollte nur schnell das Mehl ausladen. Ich fahre sofort weg!');
    const b = await S.wahl(KIM, 'Und was machst du jetzt?', [
      'Mündliche Verwarnung: „Dieses Mal bleibt es dabei. Beim nächsten Mal kostet es 35 Euro.“',
      'Trotzdem gleich einen Strafzettel über 35 Euro schreiben',
      'Nichts weiter sagen',
    ]);
    if (b === 0) { S.punkte(3, 'Freundlich und deutlich'); await S.sag(OTTO, 'Genau richtig: freundlich, aber deutlich. Er weiß jetzt Bescheid.'); }
    else if (b === 1) { S.punkte(2, 'Falschparker verwarnt'); await S.sag(OTTO, 'Das darfst du. Beim ersten Mal reicht aber oft eine Verwarnung – er hat es ja sofort eingesehen.'); }
    else { S.punkte(1, 'Ausfahrt frei'); await S.sag(OTTO, 'Du hättest ihm sagen sollen, dass es beim nächsten Mal Geld kostet. Sonst steht er morgen wieder da.'); }
    S.flag('kitaFertig');
    await S.sag('', 'Herr Kruse fährt seinen Wagen weg. Zwei Minuten später biegt der Bus mit den Kindern in die Ausfahrt. Alle winken.');
    await S.sag(OTTO, 'Jetzt sagen wir der Leitstelle, dass wir hier fertig sind.');
    S.ziel('Melde über Funk: Einsatz erledigt (📻)', null);
  },

  // ------------------------------------------------------------------ Einsatz 2: Markt
  async z_markt(S) {
    await S.sag(OTTO, 'Der Markt ist gleich hier rechts. Steig aus, den Rest gehen wir zu Fuß. Der Junge soll irgendwo in der Mitte stehen.');
    S.ziel('Finde den Jungen auf dem Marktplatz', ['stadt', -40, -22]);
  },
  async ben(S) {
    if (S.hat('benName')) return S.sag('Ben', 'Mama hat einen gelben Regenmantel an. Und einen blauen Rucksack!');
    for (;;) {
      const a = await S.wahl(KIM, 'Wie sprichst du den Jungen an?', [
        'In die Hocke gehen: „Hallo, ich bin Kim von der Polizei. Wie heißt du denn?“',
        '„Wo sind deine Eltern? Warum läufst du hier allein herum?“',
        'Ihn an der Hand nehmen und losgehen',
      ]);
      if (a === 0) break;
      await S.sag('', 'Der Junge weint noch lauter und sagt kein Wort.');
      await S.sag(OTTO, 'Er hat Angst, Kim. Mach dich klein, sag ihm, wer du bist, und frag ihn nach seinem Namen.');
    }
    S.punkte(2, 'Kind freundlich angesprochen');
    await S.sag('Ben', 'Ich … ich bin Ben. Ich bin sechs. Meine Mama ist weg!');
    await S.sag(KIM, 'Wir finden sie, Ben. Wie sieht deine Mama heute aus?');
    await S.sag('Ben', 'Sie hat einen gelben Regenmantel an. Und einen blauen Rucksack, da sind die Äpfel drin.');
    S.flag('benName'); S.notiz('Ben (6) sucht seine Mutter: gelber Regenmantel, blauer Rucksack');
    await S.sag(OTTO, 'Gib die Beschreibung an die Leitstelle durch (📻). Und dann Augen auf: Hier laufen viele Leute herum.');
    S.ziel('Finde Bens Mutter: gelber Regenmantel, blauer Rucksack', null);
  },
  async frau(S, d) {
    if (S.hat('marktFertig')) return S.sag(d.id === 'w3' ? 'Bens Mutter' : 'Frau', d.id === 'w3' ? 'Nochmal tausend Dank!' : 'Schön, dass der Kleine seine Mama wiederhat.');
    if (!S.hat('benName')) return S.sag('Frau', 'Schöner Markt heute, nicht wahr?');
    if (d.id !== 'w3') {
      S.flag('falschGefragt');
      return S.sag('Frau', 'Nein, ich vermisse kein Kind. (Schau genau hin: Mantel UND Rucksack müssen passen.)');
    }
    await S.sag('Bens Mutter', 'Ben?! Oh, Gott sei Dank! Ich habe nur kurz die Äpfel bezahlt, und weg war er!');
    S.punkte(3, 'Mutter gefunden');
    if (!S.hat('falschGefragt')) S.punkte(1, 'Genau hingeschaut');
    await S.sag(OTTO, 'Ein Tipp für das nächste Mal: Machen Sie mit Ben einen Treffpunkt aus. Zum Beispiel den Brunnen. Wer sich verliert, wartet dort.');
    await S.sag('Ben', 'Tschüss, Kim! Wenn ich groß bin, werde ich auch Polizist!');
    S.flag('marktFertig');
    await S.sag('', 'Der Tag vergeht. Ihr fahrt Streife, esst bei Hanne Frikadellen und schreibt Berichte. Langsam wird es Abend.');
    S.licht('abend'); S.uhr('21:30'); S.flag('abend');
    await S.sag(OTTO, 'Eine letzte Runde, dann ist Feierabend. Komm, zurück zum Wagen.');
    S.ziel('Steig in den Streifenwagen', null);
    S.speichern();
  },
  async marktmann(S) { await S.sag('Mann', 'Die Krabben vom Hein sind die besten, sag ich immer. Aber der redet ja mit keinem.'); },

  // ------------------------------------------------------------------ Abend: Alarm im Museum
  async eingestiegen(S) {
    if (!S.hat('abend') || S.hat('alarm')) return;
    S.flag('alarm'); S.uhr('21:40');
    await S.sag(FUNK, 'Leitstelle an alle Wagen: Alarm im Stadtmuseum am Ostring! Möwe 14, können Sie übernehmen?');
    await S.sag(OTTO, 'Die Anlage spinnt bestimmt wieder. Aber wir fahren jeden Alarm so an, als wäre er echt. Blaulicht an, Kim! (🚨)');
    S.ziel('Fahre mit Blaulicht zum Stadtmuseum', ['stadt', 80, 30]);
  },
  async z_museum(S) {
    S.licht('nacht');
    if (S.blaulicht()) S.punkte(1, 'Mit Blaulicht zum Alarm');
    await S.sag(OTTO, 'Wir sind da. Siehst du das? Die Tür steht offen. Das ist kein Fehlalarm. Taschenlampe raus.');
    S.ziel('Geh ins Museum (Tür an der Straßenseite)', ['stadt', 74, 30]);
  },
  async museumstuer(S) {
    if (!S.hat('alarm')) return S.sag('', 'Das Stadtmuseum. Geöffnet von 10 bis 17 Uhr. Im Schaufenster hängt ein Plakat: „Im Dezember: 700 Jahre Möwenbrück!“');
    S.ort('museum', 0, 6.3); S.licht('dunkel'); S.speichern();
    if (S.hat('imMuseum')) return;
    S.flag('imMuseum');
    await S.sag(OTTO, 'Der Strom ist aus. Leuchte alles ab – Spuren siehst du nur im Lichtkegel. Und sprich mit der Leiterin, sie steht da vorn.');
    S.ziel('Sprich mit Dr. Thomsen und suche mit der Taschenlampe Spuren (0 von 3)', null);
  },
  async ausgang(S) {
    if (!S.hat('tagEnde')) return S.sag(OTTO, 'Wir sind hier noch nicht fertig, Kim.');
    S.ort('stadt', 76, 30); S.licht('nacht');
  },
  async thomsen(S) {
    await S.sag('Dr. Thomsen', 'Ich bin Imke Thomsen, die Leiterin. Der Alarm ging um 21:40 Uhr los, ich war in fünf Minuten hier und habe aufgeschlossen.');
    await S.sag('Dr. Thomsen', 'Das Seltsame: Die Goldmünzen sind alle noch da! Es fehlt nur ein altes Buch aus der Vitrine hinten rechts, das Gildenbuch der Fischer. Das ist kaum etwas wert.');
    if (!S.hat('thomsen')) { S.flag('thomsen'); S.punkte(1, 'Leiterin befragt'); S.notiz('Dr. Thomsen: Alarm 21:40 Uhr. Es fehlt nur das Gildenbuch der Fischer – kaum etwas wert. Gold ist noch da.'); }
  },
  async spur(S, d) {
    const [text, notiz] = SPUREN[d.id];
    await S.sag('', text);
    if (S.hat(d.id)) return;      // schon gefunden: nur noch einmal ansehen
    S.flag(d.id); S.punkte(2, 'Spur gefunden'); S.notiz(notiz);
    if (d.id === 'spur_feder') await S.sag('', 'Otto starrt auf die Feder. Er wird ganz still.');
    const n = spurenZahl(S);
    if (n < 3) S.ziel(`Suche mit der Taschenlampe Spuren (${n} von 3)`, null);
    else S.ziel('Sprich mit Otto', null);
  },
  async fenster(S) {
    await S.sag('', 'Das Fenster ist nicht zerbrochen und nicht aufgehebelt. Aber der Riegel innen steht offen.');
    if (!S.hat('fenster')) { S.flag('fenster'); S.punkte(1, 'Fenster untersucht'); S.notiz('Museum: Westfenster nicht aufgebrochen – der Riegel war innen offen!'); }
  },
  async otto_museum(S) {
    const n = spurenZahl(S);
    if (n < 3) return S.sag(OTTO, `Leuchte in jede Ecke, Kim. Es fehlen noch ${3 - n} Spuren. Schau an den Vitrinen und am Fenster.`);
    if (S.hat('raetsel')) return S.sag(OTTO, S.hat('brink') ? '…' : 'Frag den Wärter, wer hier abends die Fenster verriegelt.');
    for (;;) {
      const a = await S.wahl(OTTO, 'Gut gemacht. Jetzt die wichtigste Frage: Wie sind die Diebe hereingekommen?', [
        'Durch die Eingangstür – sie stand offen',
        'Durch das Fenster – der Riegel war innen offen',
        'Sie haben das Fenster eingeschlagen',
      ]);
      if (a === 0) await S.sag(OTTO, 'Die Tür hat Dr. Thomsen aufgeschlossen, als sie kam. Der Alarm ging aber vorher los. Denk nochmal nach.');
      else if (a === 2) await S.sag(OTTO, 'Dann müsste Glas am Boden liegen. Siehst du welches? Nochmal.');
      else if (!S.hat('fenster')) { await S.sag(OTTO, 'Möglich. Aber hast du dir das Fenster genau angesehen? Erst nachsehen, dann behaupten.'); return; }
      else break;
    }
    S.flag('raetsel'); S.punkte(3, 'Rätsel gelöst: der Weg der Diebe');
    await S.sag(OTTO, 'Richtig. Das Fenster war nicht aufgebrochen. Bleibt die Frage: Wer hat den Riegel offen gelassen? Frag den Wärter.');
    S.ziel('Befrage den Wärter, Herrn Brinkmann', null);
  },
  async brinkmann(S) {
    if (!S.hat('raetsel')) return S.sag('Herr Brinkmann', 'Brinkmann, ich bin hier der Wärter. Schrecklich, so etwas! In 20 Jahren ist hier nie etwas passiert.');
    if (S.hat('brink')) return S.sag('Herr Brinkmann', 'Es tut mir wirklich furchtbar leid.');
    for (;;) {
      const a = await S.wahl(KIM, 'Was fragst du Herrn Brinkmann?', [
        'Herr Brinkmann, wer verriegelt abends die Fenster?',
        'Sie haben das Fenster mit Absicht offen gelassen!',
      ]);
      if (a === 0) break;
      await S.sag(OTTO, 'Langsam, Kim. Wir beschuldigen niemanden ohne Beweis. Fragen, nicht behaupten. Nochmal.');
    }
    await S.sag('Herr Brinkmann', 'Das mache ich. Jeden Abend um sechs. Der Riegel am Westfenster … den muss ich heute vergessen haben. Das tut mir furchtbar leid.');
    S.flag('brink'); S.punkte(2, 'Wärter fair befragt');
    S.notiz('Wärter Brinkmann: verriegelt jeden Abend die Fenster – heute das Westfenster „vergessen“. (Merken!)');
    await S.sag(OTTO, 'Das war es für heute. Morgen übernimmt Kommissar Wendt von der Kripo. Wir zwei helfen ihm.');
    await S.sag('', 'Auf der Fahrt zurück zur Wache sagt Otto lange nichts. Draußen kreist das Licht vom Leuchtturm über den Hafen.');
    await S.sag(OTTO, 'Diese Feder, Kim … So eine habe ich schon einmal gesehen. Vor 30 Jahren. Aber das erzähle ich dir ein andermal.');
    S.flag('tagEnde'); S.uhr('23:10'); S.ziel('Tag 1 geschafft!', null); S.speichern();
    await S.ende('Ende von Tag 1', 'Wer hat das Gildenbuch gestohlen? Warum lässt jemand das Gold liegen und nimmt ein altes Buch? Und was weiß Otto über die Feder?');
  },
};

// Was man gerade über Funk sagen kann. Das hängt davon ab, was schon passiert ist.
export function funk(S) {
  const o = [];
  if (S.hat('imWagen') || S.wo() === 'stadt') {
    if (!S.hat('angemeldet')) o.push({ text: 'Möwe 14 einsatzbereit melden', akt: 'f_anmelden' });
    if (S.hat('kennz') && !S.hat('halter')) o.push({ text: 'Kennzeichen MÖ-KB 512 abfragen', akt: 'f_kennz' });
    if (S.hat('kitaFertig') && !S.hat('markt')) o.push({ text: 'Einsatz Kita erledigt melden', akt: 'f_kita_fertig' });
    if (S.hat('benName') && !S.hat('beschr') && !S.hat('marktFertig')) o.push({ text: 'Beschreibung von Bens Mutter durchgeben', akt: 'f_beschreibung' });
  }
  return o;
}

// Stellen in der Stadt, an denen von selbst etwas passiert, wenn man hinkommt (jede nur einmal).
export const ZONEN = [
  { id: 'zk', ort: 'stadt', x: -44, z: 60, r: 14, akt: 'z_kita', wenn: 'angemeldet', bis: 'kitaFertig' },
  { id: 'zm', ort: 'stadt', x: -40, z: -1.5, r: 12, akt: 'z_markt', wenn: 'markt', bis: 'marktFertig' },
  { id: 'zmu', ort: 'stadt', x: 80, z: 30, r: 12, akt: 'z_museum', wenn: 'alarm' },
];

// Ein kompletter Durchlauf zum Prüfen (tools/story.mjs und der Test im Browser):
// [Aktion, Ding-Nummer oder null, Antworten auf die Auswahl-Fragen]
export const DURCHLAUF = [
  ['spind', null, []], ['selin', null, [0]],
  ['check', 'c_vorn', []], ['check', 'c_reifen1', []], ['check', 'c_reifen2', []], ['check', 'c_heck', []],
  ['einsteigen_hof', null, []], ['f_anmelden', null, []], ['z_kita', null, []],
  ['erzieherin', null, []], ['falschparker', null, []], ['f_kennz', null, []], ['baecker', null, [1, 0, 0]], ['f_kita_fertig', null, []],
  ['z_markt', null, []], ['ben', null, [1, 0]], ['f_beschreibung', null, []], ['frau', 'w3', []],
  ['eingestiegen', null, []], ['z_museum', null, []], ['museumstuer', null, []], ['thomsen', null, []],
  ['spur', 'spur_feder', []], ['spur', 'spur_fuss', []], ['spur', 'spur_kratzer', []], ['fenster', null, []],
  ['otto', null, [0, 1]], ['brinkmann', null, [1, 0]],
];
