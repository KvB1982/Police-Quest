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
//   S.auto(true/false), S.licht(..), S.uhr(..), S.blaulicht(), S.speichern(), await S.ende(..)
// So kann dasselbe auch ohne Bildschirm durchgespielt werden (tools/story.mjs).

const OTTO = 'Otto Brandl', SELIN = 'Selin Aydin', FUNK = 'Leitstelle (Frau Petersen)', KIM = 'Kim', HARMS = 'Harms (Waffenkammer)';

export const START = { ort: 'wache', x: 0, z: 3.5, licht: 'tag', uhr: '06:00' };
export const MAX_PUNKTE = 45;

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
    if (!S.hat('markt')) return S.sag(OTTO, 'Melde der Leitstelle, dass wir hier fertig sind.');
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
    await S.sag('', 'Der Spind geht auf. Du ziehst Uniform und Schutzweste an und legst den Einsatzgürtel um: Funkgerät, Handschellen, Pfefferspray, Taschenlampe. Das Holster ist noch leer.');
    for (const s of ['funk', 'notizbuch', 'lampe', 'weste', 'handschellen', 'spray', 'schluessel']) S.gib(s);
    S.flag('spind'); S.punkte(2, 'Ausrüstung vollständig');
    S.ziel('Hol deine Dienstwaffe in der Waffenkammer (im Flur links)', ['wache', -11.6, 3]);
  },

  // Die Waffenkammer: Hier bekommt man die Dienstpistole – aber nur, wer genau hinschaut.
  async harms(S) {
    if (!S.hat('spind')) return S.sag(HARMS, 'Erst umziehen. Ohne Einsatzgürtel kein Holster, ohne Holster keine Waffe.');
    if (S.hat('waffe')) return S.sag(HARMS, 'Am Dienstende liegt sie wieder hier. Gesichert und vollzählig.');
    await S.sag(HARMS, 'Berger? Harms, Waffenkammer. Auf meiner Liste steht für Sie die Dienstpistole mit der Nummer MB-0417. Hier unterschreiben.');
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
    S.klang('schloss');
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
    await S.sag(FUNK, 'Verstanden, Möwe 14. Nächster Auftrag: Diebstahl auf dem Wochenmarkt. Einer Frau wurde das Portemonnaie aus der Tasche gezogen. Der Täter soll noch auf dem Platz sein.');
    S.flag('markt'); S.punkte(1, 'Einsatz-Ende gemeldet'); S.uhr('09:30');
    S.ziel('Fahre zum Marktplatz', ['stadt', -40, -1.5]);
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

  // ------------------------------------------------------------------ Einsatz 2: Taschendieb auf dem Markt
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
      else { S.flag('waffeFalsch'); await S.sag(OTTO, 'Lass die stecken, Berger! Ein Taschendieb, mitten zwischen hundert Leuten? Die ziehst du, wenn ein Leben in Gefahr ist. Sonst nie. Nochmal.'); }
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
      if (a === 0) { S.flag('waffeFalsch'); await S.sag(OTTO, 'Waffe runter! Er läuft weg, er bedroht keinen. Auf so einen richtet man keine Pistole. Lauf!'); }
      else await S.sag(OTTO, 'Der hat dich gerade gestoßen und die Rente einer alten Frau in der Tasche. Lauf!');
    }
    await S.sag('', 'Du rennst zwischen den Ständen durch. Am Fischstand stellt sich Otto ihm in den Weg. Der Mann schlägt nach ihm, Otto dreht sich weg – und du bekommst seinen Arm zu fassen.');
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
    await S.sag('', 'Die Kollegen von Möwe 12 bringen den Mann zur Wache. Frau Wolters bekommt ihr Portemonnaie zurück.');
    await S.sag(OTTO, 'Erste Festnahme am ersten Tag. Und das Zittern geht vorbei – bei mir hat es damals bis zum Abend gedauert.');
    S.notiz('Taschendieb festgenommen, drei Portemonnaies sichergestellt.');
    S.flag('marktFertig');
    await S.sag('', 'Der Tag vergeht. Ihr schreibt den Bericht zur Festnahme, esst bei Hanne und fahrt Streife. Langsam wird es Abend.');
    S.licht('abend'); S.uhr('21:30'); S.flag('abend');
    await S.sag(OTTO, 'Eine letzte Runde, dann ist Feierabend. Komm, zurück zum Wagen.');
    S.ziel('Steig in den Streifenwagen', null);
    S.speichern();
  },
  async marktmann(S) { await S.sag('Mann', 'Die Krabben vom Hein sind die besten. Aber mit dem redet ja keiner mehr, seit der Sache mit der Glocke damals.'); },

  // ------------------------------------------------------------------ Abend: Alarm im Museum
  async eingestiegen(S) {
    if (!S.hat('abend') || S.hat('alarm')) return;
    S.flag('alarm'); S.uhr('21:40');
    await S.sag(FUNK, 'Leitstelle an alle Wagen: Alarm im Stadtmuseum am Ostring! Möwe 14, können Sie übernehmen?');
    await S.sag(OTTO, 'Wahrscheinlich wieder die Anlage. Aber wir fahren jeden Alarm an, als wäre er echt. Blaulicht an, Kim! (🚨)');
    S.ziel('Fahre mit Blaulicht zum Stadtmuseum', ['stadt', 80, 30]);
  },
  async z_museum(S) {
    S.licht('nacht');
    if (S.blaulicht()) S.punkte(1, 'Mit Blaulicht zum Alarm');
    await S.sag(OTTO, 'Wir sind da. Siehst du das? Die Tür steht offen, drinnen ist alles dunkel. Das ist kein Fehlalarm. Taschenlampe raus, und bleib hinter mir.');
    S.ziel('Geh ins Museum (Tür an der Straßenseite)', ['stadt', 74, 30]);
  },
  async museumstuer(S) {
    if (!S.hat('alarm')) return S.sag('', 'Das Stadtmuseum. Geöffnet von 10 bis 17 Uhr. Im Schaufenster hängt ein Plakat: „Im Dezember: 700 Jahre Möwenbrück!“');
    S.ort('museum', 0, 6.3); S.licht('dunkel'); S.speichern();
    if (S.hat('imMuseum')) return;
    S.flag('imMuseum');
    await S.sag('', 'Der Strom ist aus. Im Lichtkegel deiner Lampe sitzt rechts ein Mann in Wärter-Uniform an der Wand und hält sich den Kopf. Zwischen seinen Fingern ist Blut.');
    await S.sag(OTTO, 'Verletzter. Der kommt zuerst, Kim – vor jeder Spur.');
    S.ziel('Kümmere dich um den verletzten Wärter', null);
  },
  async ausgang(S) {
    if (!S.hat('tagEnde')) return S.sag(OTTO, 'Wir sind hier noch nicht fertig, Kim.');
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
      if (a === 0) { S.flag('waffeFalsch2'); await S.sag(OTTO, 'Nicht, Kim! Du siehst nicht, was hinter ihm ist, und er läuft weg. Holster. Was macht man stattdessen?'); }
      else await S.sag('', 'Otto packt dich am Gürtel. „Allein im Dunkeln hinter einem her, der doppelt so breit ist wie du? Nein. Was macht man stattdessen?“');
    }
    S.punkte(2, 'Im Dunkeln richtig reagiert');
    await S.sag('', 'Für eine Sekunde steht er im Lichtkegel: groß, dunkle Lederjacke, das Gesicht weggedreht. Dann ist er draußen. Er läuft seltsam – er zieht das rechte Bein nach.');
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
    if (S.hat('kitaFertig') && !S.hat('markt')) o.push({ text: 'Einsatz Kita erledigt melden', akt: 'f_kita_fertig' });
    if (S.hat('opfer') && !S.hat('beschr') && !S.hat('marktFertig')) o.push({ text: 'Beschreibung des Taschendiebs durchgeben', akt: 'f_beschreibung' });
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
// [Aktion, Ding-Nummer oder null, Antworten auf die Auswahl-Fragen, true = nur ein Fehlversuch (fehlt im besten Durchlauf)]
export const DURCHLAUF = [
  ['spind', null, []], ['harms', null, [0, 1, 0, 2, 1]], ['selin', null, [0]],
  ['check', 'c_vorn', []], ['check', 'c_reifen1', []], ['check', 'c_reifen2', []], ['check', 'c_heck', []],
  ['einsteigen_hof', null, []], ['f_anmelden', null, []], ['z_kita', null, []],
  ['erzieherin', null, []], ['falschparker', null, []], ['f_kennz', null, []], ['baecker', null, [1, 0, 0]], ['f_kita_fertig', null, []],
  ['z_markt', null, []], ['opfer', null, [1, 0]], ['f_beschreibung', null, []],
  ['verdacht', 'w1', [], true], ['verdacht', 'w2', [1, 2, 0, 1, 0, 1]],
  ['eingestiegen', null, []], ['z_museum', null, []], ['museumstuer', null, []], ['brinkmann', null, [0, 2]], ['thomsen', null, []],
  ['spur', 'spur_feder', []], ['spur', 'spur_fuss', []], ['fenster', null, []], ['spur', 'spur_kratzer', [0, 2]],
  ['otto', null, [0, 1]], ['brinkmann', null, [1, 0]],
];
// Die Antworten, mit denen es beim ersten Versuch klappt (für die Rechnung der besten Punktzahl).
// Steht eine Aktion zweimal im Durchlauf, sind es zwei Listen hintereinander.
export const BESTE = {
  harms: [[1, 1]], baecker: [[0, 0]], opfer: [[0]], 'verdacht:w2': [[2, 1, 1]],
  brinkmann: [[2], [0]], 'spur:spur_kratzer': [[2]], otto: [[1]],
};
