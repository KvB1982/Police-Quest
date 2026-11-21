// Blaulicht über Möwenbrück – die Geschichte. Fall 1 „Die Feder im Museum“, Tag 1.
//
// Diese Datei kennt keine Grafik. Sie spricht nur mit dem Spiel über das Werkzeug "S":
//   await S.sag(wer, text)            – jemand sagt etwas (wartet, bis der Spieler weiterklickt)
//   await S.wahl(wer, frage, [..])    – der Spieler wählt eine Antwort, zurück kommt die Nummer (0, 1, 2 …)
//   await S.schloss(titel)            – Zahlenschloss, zurück kommt die getippte Zahl oder null
//   S.flag(name) / S.hat(name)        – einen Merker setzen / fragen, ob er gesetzt ist
//   S.punkte(zahl, wofuer)            – Sorgfalts-Punkte geben
//   S.notiz(text)                     – etwas ins Notizbuch schreiben
//   S.gib(sache)                      – etwas in die Tasche oder an den Gürtel stecken
//   S.ziel(text, [ort, x, z])         – was als Nächstes zu tun ist (mit Wegweiser)
//   S.ort(name, x, z)                 – an einen anderen Ort wechseln
//   S.klang(name)                     – ein Geräusch abspielen (Namen stehen in klang.js)
//   await S.oeffne(ding, true/false)  – eine Tür, den Spind oder einen Schrank auf- oder zugehen lassen (Name = id in daten.js)
//   S.auto(true/false), S.licht(..), S.uhr(..), S.speichern(), await S.ende(..)
//   S.blaulicht()                     – 0 = aus, 1 = nur Blaulicht, 2 = Blaulicht mit Sirene · S.blaulichtAn(stufe) schaltet um
//   S.jagd()                          – wie lief die Verfolgungsfahrt? { rumms: wie oft angestoßen, sirene: lief die Sirene? }
// So kann dasselbe auch ohne Bildschirm durchgespielt werden (tools/story.mjs).

const OTTO = 'Otto Brandl', SELIN = 'Selin Aydin', FUNK = 'Leitstelle (Frau Petersen)', KIM = 'Kim', HARMS = 'Harms (Waffenkammer)';

export const START = { ort: 'wache', x: 0, z: 3.5, licht: 'tag', uhr: '06:00' };
export const MAX_PUNKTE = 63;

// Die Verfolgungsfahrt am Vormittag: Wo der Fluchtwagen losfährt, zu welcher Kreuzung zuerst und wo er am Ende festsitzt
// (der Wendeplatz in der Sackgasse Finkenstieg). Den Weg dazwischen sucht sich jagd.js selbst.
export const JAGD = { start: [-87.2, 99.4], erst: [-88, 125], ziel: [-348, 589] };

// Der Fluchtweg des Taschendiebs über den Markt: im Zickzack zwischen den Ständen durch und in einem Bogen zurück.
const DIEB_WEG = [[-24, -20], [-25, -30], [-34, -36], [-40, -28], [-45, -20], [-56, -17.5], [-56, -8], [-45, -6], [-34, -8]];

// Was in der Tasche sein kann.
export const SACHEN = {
  ausweis: { name: 'Dienstausweis', text: 'Kim Berger, Polizeianwärter/in, Polizei Möwenbrück. Dienstnummer: 4172' },
  funk: { name: 'Funkgerät', text: 'Damit sprichst du mit der Leitstelle. Dein Funkname: Möwe 14.' },
  notizbuch: { name: 'Notizbuch', text: 'Hier steht alles Wichtige, das du gesehen oder gehört hast.' },
  lampe: { name: 'Taschenlampe', text: 'Geht von allein an, wenn es dunkel ist. Spuren sieht man nur im Lichtkegel.' },
  weste: { name: 'Warnweste', text: 'Leuchtet gelb. Für Einsätze an der Straße.' },
  handschellen: { name: 'Handschellen', text: 'Für Festnahmen. Erst ansprechen, dann festhalten, dann Handschellen.' },
  spray: { name: 'Pfefferspray', text: 'Nur, wenn dich jemand angreift und Festhalten nicht reicht.' },
  pistole: { name: 'Dienstpistole', text: 'Nummer MB-0417, gesichert im Holster. Gezogen wird sie nur, wenn jemand bewaffnet ist oder ein Leben in Gefahr ist.' },
  schluessel: { name: 'Autoschlüssel', text: 'Für den Streifenwagen Möwe 14.' },
};

export async function beginn(S) {
  await S.sag('', 'Montag, 6:00 Uhr. Polizeiwache Am Deich, Möwenbrück. Dein erster Tag im Streifendienst.');
  await S.sag(OTTO, 'Berger? Brandl. Ich bin dein Ausbilder. Dreißig Jahre Streife in dieser Stadt, und dieses Jahr ist mein letztes.');
  await S.sag(OTTO, 'Hier draußen verzeiht dir keiner, wenn du schlampst. Also machen wir alles der Reihe nach. Erst die Ausrüstung: dein Spind steht in der Umkleide, hinten links.');
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
    if (!S.hat('waffe')) return S.sag(OTTO, 'Jetzt zur Waffenkammer, im Flur ganz links. Harms gibt dir deine Dienstwaffe. Lies genau, was du unterschreibst.');
    if (!S.hat('briefing')) return S.sag(OTTO, 'Ab zum Briefing in den Besprechungsraum, die Tür in der Mitte. Die Chefin wartet nicht.');
    if (!S.hat('wagen')) return S.sag(OTTO, 'Vor jeder Fahrt gehen wir einmal um den Wagen: Licht, Reifen links, Reifen rechts, Heck. Das sind die vier gelben Stellen.');
    if (!S.hat('angemeldet')) return S.sag(OTTO, 'Steig ein. Und dann meldest du uns über Funk an.');
    if (!S.hat('kitaFertig')) return S.sag(OTTO, S.hat('halter') ? 'Der Halter ist der Bäcker von nebenan. Sprich ihn an – sachlich, aber deutlich.'
      : S.hat('kennz') ? 'Wem gehört der Wagen? Frag die Leitstelle über Funk (📻).' : 'Sieh dir den grauen Wagen an und schreib das Kennzeichen auf.');
    if (!S.hat('unfall')) return S.sag(OTTO, 'Melde der Leitstelle, dass wir hier fertig sind.');
    if (!S.hat('flucht')) return S.sag(OTTO, !S.hat('ersteHilfe') ? 'Die Frau im roten Wagen, Kim. Verletzte zuerst.'
      : !S.hat('uKennz') ? 'Sprich mit der Zeugin und mit dem Fahrer. Und sieh dir seinen Wagen genau an.' : 'Frag das Kennzeichen über Funk ab (📻). Und bleib zwischen ihm und seiner Fahrertür.');
    if (!S.hat('jagdFertig')) return S.sag(OTTO, 'In den Wagen, Kim! Blaulicht und Sirene!');
    if (!S.hat('marktFertig')) return S.sag(OTTO, S.hat('opfer') ? 'Grüne Jacke, blauer Rucksack. Schau genau hin, bevor du jemanden ansprichst. Und die Waffe bleibt, wo sie ist.'
      : 'Sprich zuerst mit der Bestohlenen. Wir brauchen eine Beschreibung.');
    if (!S.hat('alarm')) return S.sag(OTTO, 'Komm, zurück zum Wagen.');
    return S.sag(OTTO, 'Zum Museum, Kim. Die Tür ist an der Straßenseite.');
  },

  async lotte(S) { S.klang('hund'); await S.sag('Lotte', 'Wuff! (Lotte beschnuppert deine Schuhe, sieht dich lange an und legt sich wieder hin. Du bist wohl in Ordnung.)'); },
  async hanne(S) {
    await S.sag('Hanne', 'Du bist also neu an Ottos Seite? Hanne. Bei mir gibt es mittags Frikadellen – und alles, was in dieser Stadt geredet wird.');
    await S.sag('Hanne', 'Pass auf den Otto auf. Der geht bald in Rente und tut so, als wäre ihm das egal. Dabei gibt es einen alten Fall, der ihm keine Ruhe lässt.');
  },
  // Die Kollegen in der Wache: Jeder hat einen Satz für den Morgen und einen für später, wenn schon etwas passiert ist.
  async kollege(S, d) {
    const spaet = S.hat('jagdFertig');
    if (d.id === 'dirks') {
      if (spaet) return S.sag('Jan Dirks', 'Saubere Fahrt vorhin, Berger. Wir kamen kaum hinterher – und ich fahre Möwe 12 seit acht Jahren.');
      await S.sag('Jan Dirks', 'Moin! Du bist neu bei Otto? Jan Dirks, Möwe 12. Wenn es draußen eng wird und du Verstärkung rufst, sind das meistens wir.');
      return S.sag('Jan Dirks', 'Ein Tipp: Ruf lieber einmal zu früh als einmal zu spät. Dafür lacht dich hier keiner aus.');
    }
    if (d.id === 'tammen') {
      if (spaet) return S.sag('Meike Tammen', 'Der Kombi steht auf dem Hof der Spurensicherung. Den Bericht dazu schreibst aber du – Otto drückt sich seit dreißig Jahren davor.');
      return S.sag('Meike Tammen', 'Meike Tammen, ich fahre mit Jan. Selin will die Streifenpläne vor der Besprechung haben. Bis später auf der Straße!');
    }
    if (d.id === 'okafor') {
      await S.sag('Ben Okafor', 'Reifen, Lichter, Kofferraum – jeden Morgen. Vor zwei Jahren stand ich nachts mit einem Platten am Hafen. Seitdem prüfe ich alles zweimal.');
      return S.sag('Ben Okafor', 'Möwe 9 fährt heute den Stadtring. Wenn du uns siehst: einmal kurz die Hand heben, das gehört sich so.');
    }
    return S.sag('Linh Lührs', spaet ? 'Die Anzeige zum Unfall am Wall liegt schon bei mir. Kennzeichen, Uhrzeit, Zeugen – deine Notizen will ich nachher sehen.' : 'Lührs, Wachdienst. Alles, was ihr draußen aufnehmt, landet am Ende bei mir auf dem Tisch. Schreib leserlich, dann verstehen wir uns.');
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
    S.klang('schloss'); await S.oeffne('spind');
    await S.sag('', 'Der Spind geht auf. Du ziehst Uniform und Schutzweste an und legst den Einsatzgürtel um: Funkgerät, Handschellen, Pfefferspray, Taschenlampe. Das Holster ist noch leer.');
    for (const s of ['funk', 'notizbuch', 'lampe', 'weste', 'handschellen', 'spray', 'schluessel']) S.gib(s);
    S.flag('spind'); S.punkte(2, 'Ausrüstung vollständig');
    await S.oeffne('spind', false);
    S.ziel('Hol deine Dienstwaffe in der Waffenkammer (im Flur links)', ['wache', -11.6, 3]);
  },

  // Die Waffenkammer: Hier bekommt man die Dienstpistole – aber nur, wer genau hinschaut.
  async harms(S) {
    if (!S.hat('spind')) return S.sag(HARMS, 'Erst umziehen. Ohne Einsatzgürtel kein Holster, ohne Holster keine Waffe.');
    if (S.hat('waffe')) return S.sag(HARMS, 'Am Dienstende liegt sie wieder hier. Gesichert und vollzählig.');
    await S.sag(HARMS, 'Berger? Harms, Waffenkammer. Auf meiner Liste steht für Sie die Dienstpistole mit der Nummer MB-0417. Hier unterschreiben.');
    await S.oeffne('waffenschrank');
    await S.sag('', 'Er legt eine Pistole auf den Tresen. Auf dem Verschluss ist eingeschlagen: MB-0471.');
    for (;;) {
      const a = await S.wahl(KIM, 'Was machst du?', [
        'Unterschreiben und die Pistole einstecken',
        '„Die Nummer stimmt nicht. Auf der Liste steht 0417, auf der Waffe 0471.“',
      ]);
      if (a === 1) break;
      await S.sag(HARMS, 'Halt. Sie haben gerade für eine Waffe unterschrieben, die nicht Ihre ist. Wenn damit etwas passiert, steht Ihr Name drunter. Lesen Sie. Nochmal.');
    }
    await S.sag(HARMS, 'Gut. Das mache ich mit allen Neuen, und die Hälfte fällt darauf herein. Hier ist die richtige: MB-0417.');
    for (;;) {
      const a = await S.wahl(HARMS, 'Die Waffe liegt vor Ihnen. Was tun Sie als Erstes?', [
        'Ins Holster stecken, wird schon stimmen',
        'Mündung in die sichere Ecke, Finger weg vom Abzug, Magazin und Lauf prüfen, sichern, dann ins Holster',
        'Probeweise auf die Tür zielen',
      ]);
      if (a === 1) break;
      if (a === 0) await S.sag(HARMS, 'Und woher wissen Sie, ob sie geladen ist? Ob sie gesichert ist? Man prüft jede Waffe selbst. Jedes Mal. Nochmal.');
      else await S.sag(HARMS, 'Hinter der Tür ist der Flur. Eine Waffe zeigt nie auf etwas, das man nicht treffen will. Nochmal.');
    }
    S.klang('schloss'); await S.oeffne('waffenschrank', false);
    S.gib('pistole'); S.flag('waffe'); S.punkte(3, 'Dienstwaffe nach Vorschrift übernommen');
    S.notiz('Dienstwaffe MB-0417 übernommen. Regel: ziehen nur, wenn jemand bewaffnet ist oder ein Leben in Gefahr ist.');
    await S.sag(HARMS, 'Eins noch, Berger. Die meisten hier ziehen sie in dreißig Jahren kein einziges Mal im Ernst. Das ist kein Zufall, das ist gute Arbeit.');
    S.ziel('Geh zum Briefing in den Besprechungsraum', ['wache', 0, -6]);
  },

  async selin(S) {
    if (!S.hat('spind')) return S.sag(SELIN, 'Morgen. Erst umziehen und Ausrüstung holen, dann sehen wir uns beim Briefing.');
    if (S.hat('briefing')) return S.sag(SELIN, 'Guten Dienst, Berger. Und hören Sie auf Brandl – der kennt hier jeden Stein.');
    if (!S.hat('waffe')) return S.sag(SELIN, 'Ihr Holster ist leer, Berger. Ohne Dienstwaffe fährt bei mir niemand Streife. Waffenkammer, im Flur links.');
    S.uhr('06:30');
    await S.sag(SELIN, 'Morgen zusammen. Das ist Kim Berger, ab heute bei uns, auf dem Wagen von Brandl.');
    await S.sag(SELIN, 'Meldung eins: Vor der Kita Sonnenhang wird die Ausfahrt zugeparkt. Das ist dort auch der Rettungsweg. Bitte hinfahren.');
    await S.sag(SELIN, 'Meldung zwei: Wochenmarkt. Seit drei Wochen arbeitet dort ein Taschendieb, wir haben vier Anzeigen. Er rempelt die Leute im Gedränge an.');
    await S.sag(SELIN, 'Meldung drei: Das Stadtmuseum hat eine neue Alarmanlage. Letzte Woche hat sie zweimal falsch ausgelöst. Wir fahren trotzdem jeden Alarm an.');
    const a = await S.wahl('', 'Was machst du während des Briefings?', ['Alles ins Notizbuch schreiben', 'Nur gut zuhören', 'Aus dem Fenster schauen']);
    if (a === 0) {
      S.punkte(2, 'Im Briefing mitgeschrieben');
      S.notiz('Briefing: Kita Sonnenhang – Ausfahrt und Rettungsweg werden zugeparkt');
      S.notiz('Briefing: Wochenmarkt – Taschendieb, rempelt Leute im Gedränge an');
      S.notiz('Briefing: Museum – neue Alarmanlage, zweimal Fehlalarm');
    } else if (a === 1) S.punkte(1, 'Im Briefing zugehört');
    else await S.sag(SELIN, 'Berger! Was ich hier sage, brauchen Sie in zwei Stunden auf der Straße.');
    await S.sag(SELIN, 'Brandl und Berger fahren Möwe 14. Passt aufeinander auf.');
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
    await S.sag(FUNK, 'Leitstelle an Möwe 14: Morgen, Otto. Willkommen an Bord, Kim.');
    await S.sag(FUNK, 'Erster Auftrag: Kita Sonnenhang im Süden der Stadt. Ein Auto blockiert die Ausfahrt.');
    S.flag('angemeldet'); S.punkte(1, 'Über Funk angemeldet');
    await S.sag(OTTO, 'Du fährst. Pfeiltasten oder die Knöpfe unten. In der Stadt höchstens 50. Der Pfeil oben zeigt den Weg.');
    await S.sag(OTTO, 'Der Knopf 🚨 hat drei Stufen: aus, nur Blaulicht, Blaulicht mit Sirene. Beides nur, wenn es wirklich eilt. Ein Falschparker eilt nicht.');
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
    await S.sag(FUNK, 'Verstanden, Möwe 14. Im Moment liegt nichts an. Bleibt auf Streife.');
    S.flag('kitaGemeldet'); S.punkte(1, 'Einsatz-Ende gemeldet'); S.uhr('08:15');
    await S.sag(OTTO, 'Streife heißt: fahren, schauen, da sein. Dreh eine Runde durch die Stadt. Wenn die Leitstelle uns braucht, meldet sie sich.');
    S.streife('ruf_unfall', 30);
    S.speichern();
  },
  // Funkspruch während der Streife: der Verkehrsunfall
  async ruf_unfall(S) {
    await S.sag(FUNK, 'Leitstelle an Möwe 14: Verkehrsunfall in der Marktstraße, südlich der Bäckergasse. Zwei Fahrzeuge, eine Person verletzt. Der Rettungswagen ist alarmiert, ihr seid am nächsten.');
    S.flag('unfall'); S.uhr('08:40');
    await S.sag(OTTO, 'Das eilt. Drück zweimal auf 🚨: einmal ist nur Blaulicht, zweimal ist Blaulicht mit Sirene. Mit Blaulicht machen die anderen Platz – mit Sirene hören sie uns schon, bevor sie uns sehen.');
    S.ziel('Fahre mit Blaulicht und Sirene zur Unfallstelle in der Marktstraße', ['stadt', -85, 96]);
    S.speichern();
  },
  // Der Halter des dunklen Kombi: Der Wagen ist gestohlen. Der Fahrer hört mit – und flieht.
  async f_unfall(S) {
    await S.sag(KIM, 'Möwe 14 an Leitstelle: Halterabfrage. MÖ-TR 388, dunkelblauer Kombi, beteiligt am Unfall Marktstraße.');
    await S.sag(FUNK, 'Möwe 14, Vorsicht: Das Fahrzeug ist seit heute Nacht als gestohlen gemeldet. Es stand am Güterbahnhof.');
    S.punkte(2, 'Kennzeichen über Funk abgefragt');
    S.klang('rumms');
    await S.sag('', 'Der junge Mann hat mitgehört. Er rammt Otto die Schulter in die Seite, Otto prallt gegen den Kotflügel. Der Mann reißt die Fahrertür auf und greift unter das Lenkrad. Zwei Kabel, ein Funke – der Motor heult auf.');
    for (;;) {
      const a = await S.wahl(KIM, 'Der Kombi setzt mit durchdrehenden Reifen zurück. Was tust du?', [
        'Dich vor den Wagen stellen: „Halt! Polizei!“',
        'Waffe ziehen und auf die Reifen schießen',
        'Zur Seite springen, Kennzeichen und Richtung durchgeben, zum Streifenwagen laufen',
      ]);
      if (a === 2) break;
      if (a === 0) await S.sag(OTTO, 'Weg da! Niemand stellt sich vor ein Auto, das flieht. Blech hält man nicht mit dem Körper auf. Was macht man stattdessen?');
      else { S.flag('waffeFalsch3'); S.zeig('ziehen', true); await S.sag(OTTO, 'Nein! Mitten in der Stadt, mit Leuten auf dem Gehweg? Hier wird nicht geschossen. Was macht man stattdessen?'); S.zeig('wegstecken'); }
    }
    await S.sag('', 'Der Kombi schrammt am roten Wagen entlang und jagt die Marktstraße hinunter nach Süden. Glassplitter rieseln auf den Asphalt.');
    await S.sag(KIM, 'Möwe 14 an alle: Fahrerflucht nach Unfall! Gestohlener dunkelblauer Kombi, MÖ-TR 388, Marktstraße Richtung Süden. Wir nehmen die Verfolgung auf.');
    S.kommt('streife', [-87.5, 68], { aus: [0, -1], zu: [[-88.5, 95], [-83, 98]], bis: 'jagdFertig' });       // die Kollegen von Möwe 12 kommen von Norden
    await S.sag(OTTO, 'Mir fehlt nichts, nur die Rippen. Die Sanitäter kümmern sich um Frau Jansen, und da hinten kommt Möwe 12 und übernimmt die Unfallstelle. In den Wagen, Kim! Blaulicht UND Sirene – jetzt brauchen wir beides.');
    S.flag('flucht'); S.uhr('09:05');
    S.notiz('Unfall Marktstraße: Der dunkle Kombi MÖ-TR 388 ist gestohlen (Güterbahnhof). Fahrer hat Otto gestoßen und ist geflohen.');
    S.ziel('Steig ein und verfolge den dunkelblauen Kombi – mit Blaulicht und Sirene!', null);
    S.speichern();
  },
  async f_beschreibung(S) {
    await S.sag(KIM, 'Möwe 14 an Leitstelle: Taschendieb auf dem Markt. Männlich, Mitte zwanzig, grüne Jacke, blauer Rucksack.');
    await S.sag(FUNK, 'Verstanden. Möwe 12 stellt sich an die Ausfahrt zum Wall, falls er euch durchgeht.');
    S.flag('beschr'); S.punkte(2, 'Beschreibung durchgegeben');
  },

  // ------------------------------------------------------------------ Einsatz 1: Kita
  async z_kita(S) {
    await S.sag(OTTO, 'Da vorn steht er, direkt vor der Ausfahrt. Halt an und steig aus (Knopf „Aussteigen“).');
    S.ziel('Sieh dir den grauen Wagen an', ['stadt', -44, 56.4]);
  },
  async erzieherin(S) {
    if (S.hat('kitaFertig')) return S.sag('Erzieherin', 'Vielen Dank! Der Bus ist gut durchgekommen.');
    await S.sag('Erzieherin', 'Gut, dass Sie da sind. Der graue Wagen steht schon wieder vor unserer Ausfahrt. Das ist auch unser Rettungsweg – und gleich kommt der Bus mit den Kindern zurück.');
    if (!S.hat('erz')) { S.flag('erz'); S.punkte(1, 'Zeugin befragt'); S.notiz('Erzieherin: Der graue Wagen steht öfter vor der Ausfahrt (Rettungsweg), der Bus kommt gleich'); }
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
      if (a === 1) await S.sag(OTTO, 'Stopp, Kim. Wer brüllt, hat schon verloren. Sachlich bleiben – gerade, wenn der andere im Unrecht ist. Nochmal.');
      else await S.sag(OTTO, 'Erst grüßen und erklären, worum es geht. Dann kann man immer noch über einen Zettel reden. Nochmal.');
    }
    await S.sag('Bäcker Kruse', 'Verdammt, die Ausfahrt. Ich wollte nur schnell das Mehl ausladen. Ich fahre sofort weg.');
    const b = await S.wahl(KIM, 'Und was machst du jetzt?', [
      'Mündliche Verwarnung: „Dieses Mal bleibt es dabei. Beim nächsten Mal kostet es 35 Euro.“',
      'Trotzdem gleich einen Strafzettel über 35 Euro schreiben',
      'Nichts weiter sagen',
    ]);
    if (b === 0) { S.punkte(3, 'Sachlich und deutlich'); await S.sag(OTTO, 'Genau richtig: ruhig, aber deutlich. Er weiß jetzt Bescheid.'); }
    else if (b === 1) { S.punkte(2, 'Falschparker verwarnt'); await S.sag(OTTO, 'Das darfst du. Beim ersten Mal reicht aber oft eine Verwarnung – er hat es ja sofort eingesehen.'); }
    else { S.punkte(1, 'Ausfahrt frei'); await S.sag(OTTO, 'Du hättest ihm sagen sollen, dass es beim nächsten Mal Geld kostet. Sonst steht er morgen wieder da.'); }
    S.flag('kitaFertig');
    await S.sag('', 'Herr Kruse fährt seinen Wagen weg. Zwei Minuten später biegt der Bus in die Ausfahrt.');
    await S.sag(OTTO, 'Jetzt sagen wir der Leitstelle, dass wir hier fertig sind.');
    S.ziel('Melde über Funk: Einsatz erledigt (📻)', null);
  },

  // ------------------------------------------------------------------ Einsatz 2: Verkehrsunfall mit Fahrerflucht
  async z_unfall(S) {
    await S.sag(OTTO, 'Da vorn. Zwei Wagen, einer halb auf dem Gehweg. Halt mit Abstand dahinter an.');
    await S.sag(OTTO, 'Die Sirene brauchen wir jetzt nicht mehr. Aber das Blaulicht bleibt an, wenn wir aussteigen: Das ist unsere Absperrung, damit uns keiner hinten reinfährt.');
    S.ziel('Sichere die Unfallstelle und sieh nach der verletzten Fahrerin', ['stadt', -90.2, 107.3]);
  },
  async verletzte(S) {
    const F = 'Frau Jansen';
    if (S.hat('ersteHilfe')) return S.sag(F, 'Es geht schon. Mir ist nur schwindelig. Wann kommt denn der Rettungswagen?');
    if (!S.hat('gesichert')) {
      S.flag('gesichert');
      if (S.blaulicht() >= 1) S.punkte(1, 'Unfallstelle mit Blaulicht gesichert');
      else { await S.sag(OTTO, 'Moment, Kim. Unser Blaulicht ist aus, und wir stehen mitten auf der Fahrbahn. Ich schalte es ein. Beim nächsten Mal denkst du selbst daran.'); S.blaulichtAn(1); }
    }
    await S.sag('', 'Die Frau sitzt hinter dem Steuer des roten Wagens, die Tür steht offen. Sie hält sich den Nacken. Der Motor läuft noch, es riecht nach Benzin.');
    for (;;) {
      const a = await S.wahl(KIM, 'Was tust du zuerst?', [
        'Sie am Arm aus dem Wagen ziehen, weg von der Straße',
        'Erst den anderen Fahrer zur Rede stellen',
        'Ansprechen, Motor aus, Zündschlüssel ziehen. Sie bleibt sitzen und hält den Kopf still, bis der Rettungswagen da ist',
      ]);
      if (a === 2) break;
      if (a === 0) await S.sag(OTTO, 'Halt! Sie hat Schmerzen im Nacken. So jemanden bewegt man nur, wenn der Wagen brennt. Nochmal.');
      else await S.sag(OTTO, 'Der läuft uns nicht weg. Menschen zuerst, Kim. Nochmal.');
    }
    S.punkte(2, 'Erste Hilfe an der Unfallstelle');
    await S.sag(F, 'Ich habe für die Radfahrerin gebremst, ganz normal. Und dann hat es von hinten gekracht. Der muss gerast sein.');
    await S.sag(KIM, 'Möwe 14 an Leitstelle: Unfallstelle Marktstraße gesichert. Eine Verletzte, ansprechbar, Schmerzen im Nacken. Kraftstoff läuft aus.');
    await S.sag(FUNK, 'Verstanden. Der Rettungswagen ist gleich bei euch, die Feuerwehr kommt wegen des Benzins.');
    // Der Rettungswagen kommt wirklich angefahren: von Süden die Marktstraße herauf. Ärztin und Sanitäter gehen zu Frau Jansen.
    S.kommt('rtw', [-82.6, 112], { aus: [0, 1], zu: [[-89.3, 109.6], [-89.0, 105.6]], bis: 'jagdFertig' });
    await S.sag('', 'Von Süden hörst du ein Martinshorn näher kommen.');
    S.flag('ersteHilfe');
    S.notiz('Unfall Marktstraße: Frau Jansen (roter Wagen) hat für eine Radfahrerin gebremst, der dunkle Kombi ist hinten aufgefahren. Sie hat Schmerzen im Nacken.');
    S.ziel('Befrage die Zeugin und den Fahrer des dunklen Kombi', null);
  },
  async zeugin(S) {
    await S.sag('Radfahrerin', 'Ich wollte hier über die Straße. Die Frau im roten Wagen hat für mich gehalten. Der Dunkle dahinter kam viel zu schnell – der hat nicht einmal versucht zu bremsen.');
    await S.sag('Radfahrerin', 'Und danach wollte er sofort weiter! Aber sein Motor ist nicht mehr angesprungen. Seitdem steht er da und schaut dauernd die Straße hinunter.');
    if (!S.hat('zeugin')) { S.flag('zeugin'); S.punkte(1, 'Zeugin befragt'); S.notiz('Zeugin (Radfahrerin): Der dunkle Kombi war viel zu schnell und hat nicht gebremst. Der Fahrer wollte gleich weiterfahren.'); }
  },
  async unfallfahrer(S) {
    if (!S.hat('ersteHilfe')) return S.sag(OTTO, 'Erst die Verletzte, Kim. Der hier kann stehen.');
    if (S.hat('uPapiere')) return S.sag('Junger Mann', 'Kann ich jetzt endlich los? Ich hab doch gesagt, die Papiere liegen zu Hause.');
    for (;;) {
      const a = await S.wahl(KIM, 'Wie sprichst du den Fahrer an?', [
        '„Guten Morgen. Sind Sie verletzt? … Dann bitte Führerschein und Fahrzeugschein.“',
        '„Sind Sie eigentlich wahnsinnig? Sie hätten die Frau umbringen können!“',
        '„Sie können gehen. Wir haben ja Ihr Kennzeichen.“',
      ]);
      if (a === 0) break;
      if (a === 1) await S.sag(OTTO, 'Sachlich, Kim. Was er falsch gemacht hat, klärt der Bericht, nicht dein Ärger. Nochmal.');
      else await S.sag(OTTO, 'Bei einem Unfall mit einer Verletzten geht keiner, bevor wir wissen, wer er ist. Nochmal.');
    }
    await S.sag('Junger Mann', 'Mir fehlt nichts. Papiere … hab ich nicht dabei. Liegen zu Hause. Ist doch nur Blech, oder? Kann ich los?');
    await S.sag('', 'Er ist höchstens zwanzig. Er sieht dich nicht an. Sein Blick geht immer wieder zu seinem Wagen und die Straße hinunter.');
    S.flag('uPapiere'); S.punkte(1, 'Fahrer richtig angesprochen');
    await S.sag(OTTO, 'Keine Papiere, und er hat es eilig. Sieh dir seinen Wagen an, Kim. Genau.');
    S.ziel('Sieh dir den dunklen Kombi genau an (👁)', null);
  },
  async unfallwagen(S) {
    await S.sag('', 'Ein dunkelblauer Kombi. Die Front ist eingedrückt, darunter tropft Kühlwasser. Kennzeichen: MÖ-TR 388.');
    await S.sag('', 'Du schaust durch die Seitenscheibe: Die Verkleidung unter dem Lenkrad ist abgerissen, zwei Kabel hängen heraus. Im Zündschloss steckt kein Schlüssel.');
    if (S.hat('uKennz')) return;
    S.flag('uKennz'); S.punkte(1, 'Genau hingesehen');
    S.notiz('Dunkelblauer Kombi MÖ-TR 388: kein Schlüssel im Zündschloss, Kabel hängen unter dem Lenkrad heraus.');
    await S.sag(OTTO, '(leise) Kurzgeschlossen. Sag ihm nichts. Erst die Abfrage über Funk (📻). Und ich stelle mich neben ihn.');
    S.ziel('Frage über Funk das Kennzeichen MÖ-TR 388 ab (📻)', null);
  },
  async roterwagen(S) {
    await S.sag('', S.hat('flucht') ? 'Der rote Wagen wartet auf den Abschleppdienst. Heck eingedrückt, an der Seite eine lange frische Schramme in Dunkelblau.'
      : 'Ein roter Wagen, halb auf dem Gehweg. Das Heck ist eingedrückt, der Kofferraum steht einen Spalt offen. Darunter breitet sich eine schillernde Pfütze aus.');
  },
  // Die Verfolgung ist zu Ende: Der Fluchtwagen sitzt in der Sackgasse fest. (Das Spiel ruft diese Stelle von selbst auf.)
  async jagd_ende(S) {
    if (S.hat('jagdFertig')) return;
    S.kommt('streife', [-334.7, 557.7], { aus: [0.45, -0.89], zu: [[-343.5, 580], [-340.5, 577.5]], bis: 'abgabe1' });       // Verstärkung: Möwe 12 ist hinter uns hergefahren
    await S.sag('', 'Finkenstieg – eine Sackgasse. Der Kombi rutscht über den Wendeplatz, schlägt mit dem Vorderrad gegen den Bordstein und bleibt quer stehen. Aus der Motorhaube steigt Dampf.');
    for (;;) {
      const a = await S.wahl(KIM, 'Er sitzt noch im Wagen. Wie gehst du vor?', [
        'Bis an seine Fahrertür heranfahren und sie aufreißen',
        'Aussteigen und mit gezogener Waffe auf den Wagen zugehen',
        'Den Streifenwagen quer stellen, hinter der offenen Tür bleiben: „Polizei! Motor aus! Hände aus dem Fenster!“',
      ]);
      if (a === 2) break;
      if (a === 0) await S.sag(OTTO, 'Zu nah. Du weißt nicht, was er vorhat. Abstand halten, Deckung nehmen, ansprechen. Nochmal.');
      else { S.flag('waffeFalsch3'); await S.sag(OTTO, 'Siehst du bei ihm eine Waffe? Ich auch nicht. Ein Autodieb, der festsitzt. Die Pistole bleibt im Holster. Nochmal.'); }
    }
    await S.sag('', 'Sekundenlang passiert nichts. Dann fliegt die Fahrertür auf. Der Junge rennt los, auf den Gartenzaun am Ende der Straße zu – und knickt nach drei Schritten weg. Er hat sich beim Aufprall das Knie angeschlagen.');
    for (;;) {
      const a = await S.wahl(KIM, 'Er liegt halb auf dem Rasen und versucht hochzukommen. Was tust du?', [
        'Dich auf ihn werfen und ihm das Knie in den Rücken drücken',
        'Arme auf den Rücken, Handschellen, nach Waffen abtasten: „Sie sind vorläufig festgenommen.“ Dann nach dem Knie sehen',
        'Pfefferspray, sicher ist sicher',
      ]);
      if (a === 1) break;
      if (a === 0) await S.sag(OTTO, 'Er liegt doch schon. So viel Zwang wie nötig und kein bisschen mehr. Nochmal.');
      else await S.sag(OTTO, 'Er greift dich nicht an, er will nur weg und kann nicht. Das Spray ist für Angriffe. Nochmal.');
    }
    S.klang('schloss');
    S.punkte(3, 'Flüchtigen nach Vorschrift gestellt');
    if (!S.hat('waffeFalsch3')) S.punkte(1, 'Die Waffe im Holster gelassen');
    const wie = S.jagd();
    if (wie.rumms === 0) S.punkte(2, 'Verfolgt, ohne etwas zu rammen');
    if (wie.sirene) S.punkte(1, 'Mit Blaulicht und Sirene verfolgt');
    else await S.sag(OTTO, 'Eins noch: Bei einer Verfolgung läuft die Sirene. Die Leute müssen hören, dass da etwas angerast kommt. Blaulicht allein sieht keiner, der um die Ecke biegt.');
    await S.sag('', 'Die Handschellen rasten ein. Der Junge heißt Timo Reents, neunzehn Jahre, kein Führerschein. Er zittert am ganzen Körper.');
    await S.sag('Timo', 'Ich hab den nicht geklaut! Also … nicht für mich. Einer hat mir fünfzig Euro gegeben. Ich sollte den Wagen heute Abend am Ostring abstellen, Schlüssel auf den Hinterreifen, fertig.');
    await S.sag(KIM, 'Wer?');
    await S.sag('Timo', 'Kenn ich nicht. So ein Großer mit Lederjacke. Der hat beim Gehen ein Bein nachgezogen. Mit dem legt man sich nicht an.');
    S.notiz('Timo Reents (19) sollte den gestohlenen Kombi heute Abend am Ostring abstellen, für 50 Euro. Auftraggeber: großer Mann, Lederjacke, zieht ein Bein nach.');
    await S.sag(OTTO, 'Ein gestohlener Wagen, der abends am Ostring bereitstehen soll. Das ist kein Jugendstreich, Kim. Schreib es genau so in den Bericht.');
    await S.sag('', 'Hinter euch hält Möwe 12. Die beiden Kollegen sichern den Kombi, bis der Abschleppwagen kommt. Du merkst erst jetzt, wie fest du das Lenkrad gehalten hast.');
    S.blaulichtAn(0);
    await S.sag(OTTO, 'Wer festnimmt, liefert auch ab. Timo kommt hinten in unseren Wagen, und wir bringen ihn zur Wache. Blaulicht bleibt aus – er läuft uns nicht mehr weg.');
    S.flag('jagdFertig'); S.flag('gefangen1'); S.uhr('09:40');
    S.ziel('Bring Timo zur Wache (halte in der Wachstraße vor der Wache an)', ['stadt', 40, -2.5]);
    S.speichern();
  },
  // Den Festgenommenen an der Wache abgeben
  async z_abgabe1(S) {
    await S.sag('', 'Du hältst vor der Wache. Harms kommt heraus, öffnet die hintere Tür und nimmt Timo am Arm.');
    await S.sag('Harms', 'Reents, Timo? Dann komm mal mit, Junge. Erst das Knie anschauen lassen, dann reden wir.');
    await S.sag(OTTO, 'Den Bericht schreiben wir heute Mittag. Jetzt wieder raus auf die Straße.');
    S.flag('abgabe1'); S.punkte(1, 'Festgenommenen zur Wache gebracht'); S.uhr('09:55');
    S.streife('ruf_markt', 25);
    S.speichern();
  },
  async ruf_markt(S) {
    await S.sag(FUNK, 'Leitstelle an Möwe 14: Diebstahl auf dem Wochenmarkt. Einer Frau wurde das Portemonnaie aus der Tasche gezogen, der Täter soll noch auf dem Platz sein.');
    await S.sag(OTTO, 'Kein Blaulicht. Zum Markt fahren wir ganz normal – sonst ist er weg, bevor wir da sind.');
    S.flag('markt'); S.uhr('10:15');
    S.ziel('Fahre zum Marktplatz', ['stadt', -40, -1.5]);
    S.speichern();
  },

  // ------------------------------------------------------------------ Einsatz 3: Taschendieb auf dem Markt
  async z_markt(S) {
    await S.sag(OTTO, 'Der Markt ist gleich hier rechts. Steig aus, den Rest gehen wir zu Fuß. Die Bestohlene wartet in der Mitte.');
    await S.sag(OTTO, 'Und merk dir für gleich: Ein voller Markt ist der schlechteste Ort der Welt für eine gezogene Waffe.');
    S.ziel('Sprich mit der bestohlenen Frau auf dem Marktplatz', ['stadt', -40, -22]);
  },
  async opfer(S) {
    if (S.hat('marktFertig')) return S.sag('Frau Wolters', 'Danke. Ich hätte nicht gedacht, dass ich das Portemonnaie wiedersehe.');
    if (S.hat('opfer')) return S.sag('Frau Wolters', 'Grüne Jacke, blauer Rucksack. Er muss noch hier sein!');
    for (;;) {
      const a = await S.wahl(KIM, 'Wie befragst du die Frau?', [
        '„Der Reihe nach, bitte: Was fehlt, wann haben Sie es gemerkt, und wer war in Ihrer Nähe?“',
        '„Wer die Tasche offen trägt, muss sich nicht wundern.“',
        '„Auf so einem Markt finden wir den nie.“',
      ]);
      if (a === 0) break;
      await S.sag('', 'Die Frau sieht dich fassungslos an und sagt nichts mehr.');
      await S.sag(OTTO, 'So bekommst du keine Aussage, Kim. Sie ist das Opfer. Frag sie, was passiert ist. Nochmal.');
    }
    S.punkte(2, 'Geschädigte richtig befragt');
    await S.sag('Frau Wolters', 'Mein Portemonnaie, mit der ganzen Rente für diese Woche. Am Käsestand hat mich einer angerempelt, so ein junger Kerl. Zwei Minuten später war die Tasche offen.');
    await S.sag('Frau Wolters', 'Mitte zwanzig vielleicht. Grüne Jacke. Und einen blauen Rucksack hatte er.');
    S.flag('opfer'); S.notiz('Taschendieb auf dem Markt: Mann, Mitte zwanzig, grüne Jacke, blauer Rucksack. Hat Frau Wolters am Käsestand angerempelt.');
    await S.sag(OTTO, 'Gib die Beschreibung durch (📻). Und dann Augen auf. Jacke und Rucksack müssen beide passen.');
    S.ziel('Finde den Mann: grüne Jacke, blauer Rucksack', null);
  },
  async verdacht(S, d) {
    const er = d.id === 'w2';
    if (S.hat('marktFertig')) return S.sag('Mann', 'Den habt ihr ja schnell gehabt.');
    if (!S.hat('opfer')) return S.sag('Mann', 'Moin.');
    if (!er) {
      S.flag('falschGefragt');
      return S.sag('Mann', 'Was wollen Sie von mir? Ich kaufe hier ein. (Schau genau hin: Jacke UND Rucksack müssen passen.)');
    }
    for (;;) {
      const a = await S.wahl(KIM, 'Grüne Jacke, blauer Rucksack. Das ist er. Was tust du?', [
        'Ihn von hinten packen',
        'Waffe ziehen: „Hände hoch!“',
        '„Polizei. Bleiben Sie bitte stehen. Ihren Ausweis, bitte.“',
      ]);
      if (a === 2) break;
      if (a === 0) await S.sag(OTTO, 'Nein. Erst ansprechen. Noch ist er für uns nur ein Mann mit grüner Jacke. Nochmal.');
      else { S.flag('waffeFalsch'); S.zeig('ziehen', true); await S.sag(OTTO, 'Lass die stecken, Berger! Ein Taschendieb, mitten zwischen hundert Leuten? Die ziehst du, wenn ein Leben in Gefahr ist. Sonst nie. Nochmal.'); S.zeig('wegstecken'); }
    }
    await S.sag('Mann', 'Ich? Wieso ich? Ich hab nichts gemacht.');
    S.klang('rumms');
    await S.sag('', 'Im nächsten Moment stößt er dich mit beiden Händen gegen den Käsestand und rennt los. Kisten fallen, jemand schreit.');
    for (;;) {
      const a = await S.wahl(KIM, 'Er rennt zwischen den Ständen davon. Was jetzt?', [
        'Waffe ziehen: „Stehen bleiben, oder ich schieße!“',
        'Hinterher – und Otto zurufen, dass er ihm den Weg abschneidet',
        'Laufen lassen, es ist ja nur ein Portemonnaie',
      ]);
      if (a === 1) break;
      if (a === 0) { S.flag('waffeFalsch'); S.zeig('ziehen', true); await S.sag(OTTO, 'Waffe runter! Er läuft weg, er bedroht keinen. Auf so einen richtet man keine Pistole. Lauf!'); S.zeig('wegstecken'); }
      else await S.sag(OTTO, 'Der hat dich gerade gestoßen und die Rente einer alten Frau in der Tasche. Lauf!');
    }
    // Jetzt wird wirklich gerannt: Der Dieb läuft zwischen den Ständen davon, du hinterher. Entwischt er, geht es von vorn los.
    for (;;) {
      S.ziel('Fang den Taschendieb! Lauf ihm nach, bis du ihn greifen kannst', null);
      if (await S.verfolge('w2', DIEB_WEG)) break;
      await S.sag(OTTO, 'Er ist uns zwischen den Ständen durch! Da – am Käsestand taucht er wieder auf. Nochmal, und lauf nicht nur hinterher: Schneid ihm den Weg ab!');
    }
    await S.sag('', 'Du bekommst seinen Arm zu fassen. Der Mann schlägt nach dir, du drehst dich weg. Otto kommt keuchend dazu.');
    for (;;) {
      const a = await S.wahl(KIM, 'Du hast seinen Arm. Er zerrt und tritt. Was tust du?', [
        'Ihm eine verpassen, damit er Ruhe gibt',
        'Arm auf den Rücken drehen, Handschellen anlegen: „Sie sind vorläufig festgenommen.“',
        'Loslassen und es noch einmal im Guten versuchen',
      ]);
      if (a === 1) break;
      if (a === 0) await S.sag(OTTO, 'Nein! Wir halten fest, wir schlagen nicht. So viel Zwang wie nötig und kein bisschen mehr. Nochmal.');
      else await S.sag(OTTO, 'Dann ist er weg. Jetzt wird nicht mehr verhandelt, jetzt wird festgehalten. Nochmal.');
    }
    S.klang('schloss');
    S.punkte(3, 'Festnahme nach Vorschrift');
    if (!S.hat('falschGefragt')) S.punkte(1, 'Genau hingeschaut');
    if (!S.hat('waffeFalsch')) S.punkte(1, 'Die Waffe im Holster gelassen');
    await S.sag('', 'Die Handschellen rasten ein. In seiner Jacke stecken drei Portemonnaies. Dein Ellbogen ist aufgeschürft, deine Hände zittern ein bisschen.');
    await S.sag('', 'Frau Wolters bekommt ihr Portemonnaie zurück. Otto führt den Mann zum Streifenwagen und setzt ihn auf die Rückbank.');
    await S.sag(OTTO, 'Erste Festnahme am ersten Tag. Und das Zittern geht vorbei – bei mir hat es damals bis zum Abend gedauert. Jetzt bringen wir ihn zur Wache.');
    S.notiz('Taschendieb festgenommen, drei Portemonnaies sichergestellt.');
    S.flag('marktFertig'); S.flag('gefangen2'); S.uhr('11:00');
    S.ziel('Bring den Taschendieb zur Wache (halte in der Wachstraße vor der Wache an)', ['stadt', 40, -2.5]);
    S.speichern();
  },
  async z_abgabe2(S) {
    await S.sag('', 'Vor der Wache wartet Petersen schon. Er nimmt den Mann und die drei Portemonnaies entgegen.');
    await S.sag('Petersen', 'Drei Stück an einem Vormittag. Fleißig, der Herr. Ich nehme ihn auf.');
    S.flag('abgabe2'); S.punkte(1, 'Festgenommenen zur Wache gebracht');
    await S.sag('', 'Der Tag vergeht. Ihr schreibt die Berichte, esst bei Hanne und fahrt Streife. Langsam wird es Abend.');
    S.licht('abend'); S.uhr('21:30'); S.flag('abend');
    await S.sag(OTTO, 'Eine letzte Runde, dann ist Feierabend.');
    S.streife('ruf_museum', 25);
    S.speichern();
  },
  async marktmann(S) { await S.sag('Mann', 'Die Krabben vom Hein sind die besten. Aber mit dem redet ja keiner mehr, seit der Sache mit der Glocke damals.'); },

  // ------------------------------------------------------------------ Abend: Alarm im Museum
  async eingestiegen(S) {
    // Vormittags: Der Fluchtwagen ist unterwegs – die Verfolgung beginnt.
    if (S.hat('flucht') && !S.hat('jagdFertig')) {
      if (S.hat('jagdLos')) return;
      S.flag('jagdLos');
      S.ziel('Verfolge den dunkelblauen Kombi – mit Blaulicht und Sirene!', null);
      return S.sag(OTTO, 'Dranbleiben, aber nicht rammen! Wir wollen ihn stellen, nicht von der Straße schieben. Der gelbe Pfeil zeigt auf ihn. Ich gebe über Funk durch, wo er langfährt.');
    }
    // Alter Spielstand von vor der Streife mit Pausen: Der Alarm kommt dann nach einer kurzen Runde.
    if (S.hat('abend') && !S.hat('alarm') && !S.hat('abgabe2')) S.streife('ruf_museum', 15);
  },
  async ruf_museum(S) {
    if (S.hat('alarm')) return;
    S.flag('alarm'); S.uhr('21:40');
    await S.sag(FUNK, 'Leitstelle an alle Wagen: Alarm im Stadtmuseum am Ostring! Möwe 14, können Sie übernehmen?');
    await S.sag(OTTO, 'Wahrscheinlich wieder die Anlage. Aber wir fahren jeden Alarm an, als wäre er echt. Blaulicht an, Kim – aber ohne Sirene (🚨 einmal drücken). Wer da einbricht, soll uns nicht kommen hören.');
    S.ziel('Fahre mit Blaulicht, aber ohne Sirene zum Stadtmuseum', ['stadt', 80, 30]);
  },
  async z_museum(S) {
    S.licht('nacht');
    const blau = S.blaulicht();
    if (blau) S.punkte(1, 'Mit Blaulicht zum Alarm');
    if (blau === 1) S.punkte(1, 'Leise angefahren, ohne Sirene');
    else if (blau === 2) { await S.sag(OTTO, 'Sirene aus, Kim! Jetzt weiß das ganze Viertel, dass wir kommen – und der da drin auch.'); S.blaulichtAn(1); }
    await S.sag(OTTO, 'Wir sind da. Siehst du das? Die Tür steht offen, drinnen ist alles dunkel. Das ist kein Fehlalarm. Taschenlampe raus, und bleib hinter mir.');
    S.ziel('Geh ins Museum (Tür an der Straßenseite)', ['stadt', 74, 30]);
  },
  async museumstuer(S) {
    if (!S.hat('alarm')) return S.sag('', 'Das Stadtmuseum. Geöffnet von 10 bis 17 Uhr. Im Schaufenster hängt ein Plakat: „Im Dezember: 700 Jahre Möwenbrück!“');
    await S.oeffne('museumstuer');
    S.ort('museum', 0, 6.3); S.licht('dunkel'); S.speichern();
    if (S.hat('imMuseum')) return;
    S.flag('imMuseum');
    await S.sag('', 'Der Strom ist aus. Im Lichtkegel deiner Lampe sitzt rechts ein Mann in Wärter-Uniform an der Wand und hält sich den Kopf. Zwischen seinen Fingern ist Blut.');
    await S.sag(OTTO, 'Verletzter. Der kommt zuerst, Kim – vor jeder Spur.');
    S.ziel('Kümmere dich um den verletzten Wärter', null);
  },
  async ausgang(S) {
    if (!S.hat('tagEnde')) return S.sag(OTTO, 'Wir sind hier noch nicht fertig, Kim.');
    await S.oeffne('ausgang');
    S.ort('stadt', 76, 30); S.licht('nacht');
  },
  async thomsen(S) {
    await S.sag('Dr. Thomsen', 'Imke Thomsen, ich leite das Museum. Der Alarm ging um 21:40 Uhr los, ich war in fünf Minuten hier und habe aufgeschlossen. Da saß Herr Brinkmann schon so da.');
    await S.sag('Dr. Thomsen', 'Und ich verstehe es nicht: Die Goldmünzen sind alle noch da. Es fehlt nur ein altes Buch aus der Vitrine hinten rechts, das Gildenbuch der Fischer. Dafür schlägt man doch keinen Menschen nieder.');
    if (!S.hat('thomsen')) { S.flag('thomsen'); S.punkte(1, 'Leiterin befragt'); S.notiz('Dr. Thomsen: Alarm 21:40 Uhr. Es fehlt nur das Gildenbuch der Fischer – kaum etwas wert. Gold ist noch da. Wärter lag verletzt im Saal.'); }
  },
  async spur(S, d) {
    if (!S.hat('hilfe')) return S.sag(OTTO, 'Erst der Verletzte, Kim. Spuren laufen nicht weg.');
    const [text, notiz] = SPUREN[d.id];
    await S.sag('', text);
    if (S.hat(d.id)) return;      // schon gefunden: nur noch einmal ansehen
    S.flag(d.id); S.punkte(2, 'Spur gefunden'); S.notiz(notiz);
    if (d.id === 'spur_feder') await S.sag('', 'Otto starrt auf die Feder. Er sagt kein Wort, aber seine Hand am Lampengriff wird weiß.');
    const n = spurenZahl(S);
    if (n < 3) return S.ziel(`Suche mit der Taschenlampe Spuren (${n} von 3)`, null);
    await AKT.eindringling(S);
    S.ziel('Sprich mit Otto', null);
  },
  // Einer der Einbrecher ist noch im Haus. Er kommt, wenn die dritte Spur gefunden ist.
  async eindringling(S) {
    if (S.hat('eindringling')) return;
    await S.sag('', 'Hinter dem Schiffsmodell knarrt eine Diele. Dr. Thomsen steht vorn bei der Tür. Otto auch.');
    S.klang('rumms');
    await S.sag('', 'Ein Schatten bricht aus dem Dunkel, breit wie ein Schrank. Eine Schulter trifft dich, du krachst gegen die Vitrine. Als du hochkommst, hat er schon ein Bein auf dem Fensterbrett.');
    for (;;) {
      const a = await S.wahl(KIM, 'Er ist halb aus dem Fenster. Was tust du?', [
        'Waffe ziehen und auf den Schatten zielen',
        'Hinterher, aus dem Fenster springen',
        '„Polizei! Stehen bleiben!“ – Lampe auf ihn, alles merken, sofort funken',
      ]);
      if (a === 2) break;
      if (a === 0) { S.flag('waffeFalsch2'); S.zeig('ziehen', true); await S.sag(OTTO, 'Nicht, Kim! Du siehst nicht, was hinter ihm ist, und er läuft weg. Holster. Was macht man stattdessen?'); S.zeig('wegstecken'); }
      else await S.sag('', 'Otto packt dich am Gürtel. „Allein im Dunkeln hinter einem her, der doppelt so breit ist wie du? Nein. Was macht man stattdessen?“');
    }
    S.punkte(2, 'Im Dunkeln richtig reagiert');
    await S.sag('', 'Für eine Sekunde steht er im Lichtkegel: groß, dunkle Lederjacke, das Gesicht weggedreht. Dann ist er draußen. Er läuft seltsam – er zieht das rechte Bein nach.');
    await S.sag('', 'Lederjacke. Zieht ein Bein nach. Genau so hat Timo heute Morgen den Mann beschrieben, der den Wagen am Ostring bestellt hat.');
    await S.sag(KIM, 'Möwe 14 an alle: Täter flüchtig vom Stadtmuseum Richtung Wallanlagen! Männlich, groß, dunkle Lederjacke, hinkt rechts.');
    await S.sag(FUNK, 'Verstanden, Möwe 14. Alle Wagen: Fahndung im Bereich Ostring und Wall. Bist du verletzt, Kim?');
    await S.sag(KIM, 'Nur die Schulter.');
    S.flag('eindringling');
    S.notiz('Museum: Einer war noch im Haus und hat mich umgestoßen. Groß, dunkle Lederjacke, hinkt rechts. Durchs Westfenster geflohen.');
    await S.sag(OTTO, 'Der hat sich versteckt, als Dr. Thomsen aufschloss. Das Buch war da schon weg. Was hat der hier noch gesucht?');
  },
  async fenster(S) {
    await S.sag('', 'Das Fenster ist nicht zerbrochen und nicht aufgehebelt. Aber der Riegel innen steht offen.');
    if (!S.hat('fenster')) { S.flag('fenster'); S.punkte(1, 'Fenster untersucht'); S.notiz('Museum: Westfenster nicht aufgebrochen – der Riegel war innen offen!'); }
  },
  async otto_museum(S) {
    if (!S.hat('hilfe')) return S.sag(OTTO, 'Der Wärter, Kim. Rechts an der Wand. Der kommt zuerst.');
    const n = spurenZahl(S);
    if (n === 3 && !S.hat('eindringling')) await AKT.eindringling(S);
    if (n < 3) return S.sag(OTTO, `Leuchte in jede Ecke, Kim. Es fehlen noch ${3 - n} Spuren. Schau an den Vitrinen und am Fenster.`);
    if (S.hat('raetsel')) return S.sag(OTTO, S.hat('brink') ? '…' : 'Frag den Wärter, wer hier abends die Fenster verriegelt.');
    for (;;) {
      const a = await S.wahl(OTTO, 'Die Kollegen suchen ihn draußen. Wir bleiben am Tatort. Die wichtigste Frage: Wie sind die hier hereingekommen?', [
        'Durch die Eingangstür – sie stand offen',
        'Durch das Fenster – der Riegel war innen offen',
        'Sie haben das Fenster eingeschlagen',
      ]);
      if (a === 0) await S.sag(OTTO, 'Die Tür hat Dr. Thomsen aufgeschlossen, als sie kam. Der Alarm ging aber vorher los. Denk nochmal nach.');
      else if (a === 2) await S.sag(OTTO, 'Dann müsste Glas am Boden liegen. Siehst du welches? Nochmal.');
      else if (!S.hat('fenster')) { await S.sag(OTTO, 'Raus ist er dort, das haben wir gesehen. Aber rein? Sieh dir das Fenster genau an. Erst nachsehen, dann behaupten.'); return; }
      else break;
    }
    S.flag('raetsel'); S.punkte(3, 'Rätsel gelöst: der Weg der Diebe');
    await S.sag(OTTO, 'Richtig. Das Fenster war nicht aufgebrochen. Jemand hat den Riegel von innen offen gelassen. Frag den Wärter – aber frag, beschuldige nicht.');
    S.ziel('Befrage den Wärter, Herrn Brinkmann', null);
  },
  async brinkmann(S) {
    const B = 'Herr Brinkmann';
    if (!S.hat('hilfe')) {
      for (;;) {
        const a = await S.wahl(KIM, 'Der Wärter ist bei Bewusstsein, aber benommen. Am Hinterkopf hat er eine Platzwunde. Was tust du zuerst?', [
          'Erst die Vitrinen ableuchten – vielleicht ist der Täter noch da',
          'Ihn hochziehen und fragen, was er gesehen hat',
          'Ansprechen, Wunde ansehen, sitzen lassen – und über Funk einen Rettungswagen rufen',
        ]);
        if (a === 2) break;
        if (a === 0) await S.sag(OTTO, 'Ich sichere den Raum. Du kümmerst dich um den Mann. Menschen vor Spuren, immer. Nochmal.');
        else await S.sag(OTTO, 'Mit einer Kopfwunde zieht man keinen hoch. Sitzen lassen, ansprechen, Hilfe rufen. Nochmal.');
      }
      await S.sag(KIM, 'Möwe 14 an Leitstelle: Einbruch im Stadtmuseum bestätigt. Eine verletzte Person, Platzwunde am Kopf, ansprechbar. Wir brauchen einen Rettungswagen.');
      await S.sag(FUNK, 'Rettungswagen ist unterwegs, Möwe 14. Sechs Minuten.');
      await S.sag(B, 'Brinkmann … ich bin hier der Wärter. Ich habe etwas gehört, bin in den Saal, und dann … dann weiß ich nichts mehr.');
      S.flag('hilfe'); S.punkte(2, 'Erst den Verletzten versorgt');
      S.notiz('Museum: Wärter Brinkmann mit Platzwunde am Hinterkopf gefunden. Sagt, er wurde von hinten niedergeschlagen.');
      return S.ziel('Sprich mit Dr. Thomsen und suche mit der Taschenlampe Spuren (0 von 3)', null);
    }
    if (!S.hat('raetsel')) return S.sag(B, 'Zwanzig Jahre bin ich hier. Nie ist etwas passiert. Nie.');
    if (S.hat('brink')) return S.sag(B, 'Ich habe Ihnen alles gesagt.');
    for (;;) {
      const a = await S.wahl(KIM, 'Was fragst du Herrn Brinkmann?', [
        'Herr Brinkmann, wer verriegelt abends die Fenster?',
        'Sie haben das Fenster mit Absicht offen gelassen!',
      ]);
      if (a === 0) break;
      await S.sag(OTTO, 'Langsam, Kim. Der Mann blutet am Kopf. Wir beschuldigen niemanden ohne Beweis. Fragen, nicht behaupten. Nochmal.');
    }
    await S.sag(B, 'Das mache ich. Jeden Abend um sechs. Der Riegel am Westfenster … den muss ich heute vergessen haben.');
    await S.sag('', 'Er sieht dich dabei nicht an. Seine Hände zittern stärker als vorhin.');
    S.flag('brink'); S.punkte(2, 'Wärter fair befragt');
    S.notiz('Wärter Brinkmann: verriegelt jeden Abend die Fenster – heute das Westfenster „vergessen“. Sieht mich dabei nicht an. (Merken!)');
    await S.sag('', 'Der Rettungswagen nimmt Brinkmann mit. Die Fahndung bleibt ohne Ergebnis: Der Hinkende ist verschwunden.');
    await S.sag(OTTO, 'Morgen übernimmt Kommissar Wendt von der Kripo. Wir zwei arbeiten ihm zu.');
    await S.sag('', 'Auf der Fahrt zurück zur Wache sagt Otto lange nichts. Draußen kreist das Licht vom Leuchtturm über den Hafen. Deine Schulter pocht.');
    await S.sag(OTTO, 'Diese Feder, Kim. So eine lag vor dreißig Jahren schon einmal an einem Tatort. Damals lag daneben ein Wachmann, der drei Wochen nicht aufgewacht ist. Den Täter habe ich nie gefunden.');
    await S.sag(OTTO, 'Geh schlafen. Ab morgen wird das hier ernst.');
    S.flag('tagEnde'); S.uhr('23:10'); S.ziel('Tag 1 geschafft!', null); S.speichern();
    await S.ende('Ende von Tag 1', 'Wer schlägt für ein altes Buch einen Wärter nieder? Wer ist der Mann, der hinkt? Und was ist vor dreißig Jahren passiert?');
  },
};

// Was man gerade über Funk sagen kann. Das hängt davon ab, was schon passiert ist.
export function funk(S) {
  const o = [];
  if (S.hat('imWagen') || S.wo() === 'stadt') {
    if (!S.hat('angemeldet')) o.push({ text: 'Möwe 14 einsatzbereit melden', akt: 'f_anmelden' });
    if (S.hat('kennz') && !S.hat('halter')) o.push({ text: 'Kennzeichen MÖ-KB 512 abfragen', akt: 'f_kennz' });
    if (S.hat('kitaFertig') && !S.hat('kitaGemeldet') && !S.hat('unfall')) o.push({ text: 'Einsatz Kita erledigt melden', akt: 'f_kita_fertig' });
    if (S.hat('uKennz') && !S.hat('flucht')) o.push({ text: 'Kennzeichen MÖ-TR 388 abfragen', akt: 'f_unfall' });
    if (S.hat('opfer') && !S.hat('beschr') && !S.hat('marktFertig')) o.push({ text: 'Beschreibung des Taschendiebs durchgeben', akt: 'f_beschreibung' });
  }
  return o;
}

// Stellen in der Stadt, an denen von selbst etwas passiert, wenn man hinkommt (jede nur einmal).
export const ZONEN = [
  { id: 'zk', ort: 'stadt', x: -44, z: 60, r: 14, akt: 'z_kita', wenn: 'angemeldet', bis: 'kitaFertig' },
  { id: 'zu', ort: 'stadt', x: -85, z: 96, r: 20, akt: 'z_unfall', wenn: 'unfall', bis: 'flucht' },
  { id: 'zm', ort: 'stadt', x: -40, z: -1.5, r: 12, akt: 'z_markt', wenn: 'markt', bis: 'marktFertig' },
  { id: 'za1', ort: 'stadt', x: 40, z: -2.5, r: 13, akt: 'z_abgabe1', wenn: 'gefangen1', bis: 'abgabe1' },
  { id: 'za2', ort: 'stadt', x: 40, z: -2.5, r: 13, akt: 'z_abgabe2', wenn: 'gefangen2', bis: 'abgabe2' },
  { id: 'zmu', ort: 'stadt', x: 80, z: 30, r: 12, akt: 'z_museum', wenn: 'alarm' },
];

// Ein kompletter Durchlauf zum Prüfen (tools/story.mjs und der Test im Browser):
// [Aktion, Ding-Nummer oder null, Antworten auf die Auswahl-Fragen, true = nur ein Fehlversuch (fehlt im besten Durchlauf)]
export const DURCHLAUF = [
  ['spind', null, []], ['harms', null, [0, 1, 0, 2, 1]], ['selin', null, [0]],
  ['check', 'c_vorn', []], ['check', 'c_reifen1', []], ['check', 'c_reifen2', []], ['check', 'c_heck', []],
  ['einsteigen_hof', null, []], ['f_anmelden', null, []], ['z_kita', null, []],
  ['erzieherin', null, []], ['falschparker', null, []], ['f_kennz', null, []], ['baecker', null, [1, 0, 0]], ['f_kita_fertig', null, []], ['ruf_unfall', null, []],
  ['z_unfall', null, []], ['verletzte', null, [0, 2]], ['zeugin', null, []], ['unfallfahrer', null, [1, 0]], ['unfallwagen', null, []], ['roterwagen', null, []],
  ['f_unfall', null, [1, 2]], ['eingestiegen', null, []], ['jagd_ende', null, [1, 2, 0, 1]], ['z_abgabe1', null, []], ['ruf_markt', null, []],
  ['z_markt', null, []], ['opfer', null, [1, 0]], ['f_beschreibung', null, []],
  ['verdacht', 'w1', [], true], ['verdacht', 'w2', [1, 2, 0, 1, 0, 1]],
  ['z_abgabe2', null, []], ['ruf_museum', null, []], ['z_museum', null, []], ['museumstuer', null, []], ['brinkmann', null, [0, 2]], ['thomsen', null, []],
  ['spur', 'spur_feder', []], ['spur', 'spur_fuss', []], ['fenster', null, []], ['spur', 'spur_kratzer', [0, 2]],
  ['otto', null, [0, 1]], ['brinkmann', null, [1, 0]],
];
// Die Antworten, mit denen es beim ersten Versuch klappt (für die Rechnung der besten Punktzahl).
// Steht eine Aktion zweimal im Durchlauf, sind es zwei Listen hintereinander.
export const BESTE = {
  harms: [[1, 1]], baecker: [[0, 0]], verletzte: [[2]], unfallfahrer: [[0]], f_unfall: [[2]], jagd_ende: [[2, 1]], opfer: [[0]], 'verdacht:w2': [[2, 1, 1]],
  brinkmann: [[2], [0]], 'spur:spur_kratzer': [[2]], otto: [[1]],
};
