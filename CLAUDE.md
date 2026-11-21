# Blaulicht über Möwenbrück – Hinweise für Claude

3D-Polizei-Abenteuer für den Browser (PC und iPad), für Kinder von 10 bis 12. Vater-Sohn-Lernprojekt wie die Geschwister-Spiele
Powershot, Rennspiel, Frontline und Reitturnier. Vorbild für die Art des Spiels ist das alte Adventure Police Quest 1 –
aber nur die Spielidee (Dienstvorschriften richtig befolgen). Name, Figuren, Stadt, Geschichte, Bilder und Musik sind ausgedacht.
Repository: https://github.com/KvB1982/Police-Quest

Das ganze Konzept (vier große Fälle, Hintergrundgeschichte, Rätsel je Tag, Tageszeiten) steht im Claude-Dokument
„Blaulicht Hafenstadt – Story- und Spielkonzept“. Die Hintergrundgeschichte dort muss stimmig bleiben.

## Arbeitsweise

- Antworten, Code-Kommentare und Texte im Spiel auf **Deutsch**. Kommentare so schreiben, dass ein Kind mitlesen kann.
- Kein Build-Schritt: reines HTML/CSS/JavaScript (ES-Module), three.js r160 über eine Import-Map von jsDelivr.
- Commits als `KvB1982 <KvB1982@users.noreply.github.com>`.
- Kinderfreundlich: keine Gewalt, keine Waffen im Einsatz, niemand stirbt. Fehler beenden nie das Spiel – Otto erklärt, man versucht es nochmal.
- Nach Änderungen im Browser prüfen, nicht nur mit den Testwerkzeugen. Ehrlich sagen, was nur als Standbild geprüft wurde.

## Starten und testen

```bash
python3 tools/server.py         # http://localhost:8765, ohne Zwischenspeicher
node tools/story.mjs            # spielt Tag 1 ohne Bildschirm durch: jede Aktion vorhanden, Tagesende erreichbar, Punkte stimmen (mit "laut" zeigt es jeden Satz)
node tools/stadt.mjs            # prüft die große Stadt: Stadtplan (kein Haus auf der Straße, Stellen der Geschichte frei), Verkehr und Fußgänger zwei Minuten vorgespult, Rettungsgasse
```

Im Browser: `window.__polizei` enthält `Z` (Spielstand), `S` (Werkzeug der Geschichte), `spieler`, `welt`, `tu(aktion, ding)`, `step(n)`.
`__polizei.angehalten = true` hält die eigene Schleife an, `step(n)` spult n Bilder vor.
Dazu `ortLaden(name, x, z)`, `lichtSetzen('tag' | 'abend' | 'nacht')`, `verkehr`, `KARTE`, `renderer` und `frei = { von: [x, y, z], nach: [x, y, z] }`
(stellt die Kamera zum Ansehen an eine feste Stelle, `null` = wieder normal). Adresse mit `?einfach` = Spar-Modus von Anfang an, `?schoen` = nie sparen.
Die fertigen Modelle brauchen im Test-Browser ohne Grafikkarte etwa 15 Sekunden, bis alle geladen sind – so lange warten, bevor man ein Standbild macht.

## Aufbau

Koordinaten: Meter, x seitlich, z längs (zur Kamera hin ist plus). Ein Winkel h schaut nach (sin h, cos h). Rechtecke sind `[x1, z1, x2, z2]`.

| Datei | Inhalt |
|---|---|
| `js/daten.js` | Die Orte als Daten (ohne three.js): `wache`, `stadt` (nur noch, was die Geschichte dort braucht: Marktstände, Dinge, Leute; die Stadt selbst kommt als `plan` aus `stadtplan.js`), `museum`. Dinge und Leute mit `akt` (Stelle in der Geschichte), `wenn`/`bis` (Merker), `licht` (nur im Kegel der Taschenlampe), `folgt` (Otto läuft hinterher) |
| `js/stadtplan.js` | Der Stadtplan (ohne three.js, in node testbar): 16 Straßen von Nord nach Süd (`STRASSEN_X`), 11 von West nach Ost (`STRASSEN_Z`), der Kai (`KAI`), Ufer (`UFER`), 19 besondere Häuser (`BESONDERE`; die ersten vier stehen wie an Tag 1), Orte für die Karte (`KARTEN_ORTE`). `PLAN` = alles ausgerechnet aus einem festen Zufall: `strassen`, `bloecke` (165, jeder mit Viertel: Altstadt, Innenstadt, Alter Hafen, Werft, Gewerbegebiet, Bahnhof, Fleetviertel, Südstadt, Sonnenhang, Stadtpark, Marktplatz, Fleet), `haeuser` (rund 1880, mit Fassaden-Stil, Stockwerken, Dach, Laden), `gruen`, `hof`, `wasser` (das Fleet), `teiche`, `baeume`, `laternen`, `parker`, `deko`, `gleise`, `gelaender`, `sperre`, `fest` (alles, was im Weg steht). `woBinIch(x, z)` = Straßen- oder Viertelname. Alles ausgedacht |
| `js/stadtbau.js` | Baut die Stadt in 3D (`baueStadt`). Vorbild: `stadtbau.js` im Rennspiel (Straßenschluchten). Alle Wände einer Fassade, alle Dächer, alle Straßen … werden je zu EINER Form verschmolzen (`Eimer`), deshalb nur etwa 100 Zeichenaufrufe. Bäume, Laternen, parkende Autos sind Instanzen in Kästchen von 200 m (`instanzenGeteilt`); die nächsten am Spieler werden gegen das geladene Modell getauscht (`NahTausch`). `schnitt` = Schnitt-Ebene: Zu Fuß wird alles weggeschnitten, was zwischen Kamera und Figur steht (Häuser, Dächer, Bäume) – man schaut wie in ein Puppenhaus. `licht(name)`: abends leuchten Fenster und Laternen |
| `js/bilder.js` | Selbst gemalte Bilder: acht Fassaden-Stile mit Fenstern (`fassade`, je mit Leucht-Bild für die Nacht), Erdgeschosse (Wohnen, Laden, Tor), Dachziegel, Wellen, Wolken, Lichtflecken; dazu die geladenen Bodenbilder aus `assets/boden/` (`ladeBilder`, `boden`) |
| `js/modelle.js`, `assets/modelle/` | Lädt fertige 3D-Modelle (`lade(name)` → eine Form, ein Material, auf den Boden gestellt und auf die Größe aus `MODELLE` gebracht). 53 Dateien, etwa 6 MB: Poly Haven (CC0) und aus Powershot übernommene. Herkunft jeder Datei: `assets/QUELLEN.md` – neue dort eintragen (nur CC0 oder eigene). Verkleinern: `tools/modell_klein.mjs` (braucht gltf-transform, nicht installiert). Wunschliste: `docs/3d_wunschliste.md` |
| `js/himmel.js` | Himmel wie im Reitturnier: Kuppel mit Farbverlauf, Sonne oder Mond, Sterne, 46 ziehende Wolken (`STIMMUNG` je Lichtstimmung). Wandert mit der Kamera |
| `js/umland.js` | Alles rund um die Stadt, nur zum Ansehen: Felder, Deich, Strand, Landstraßen mit Alleen, Wälder, sechs Dörfer mit Kirche, Bauernhöfe, elf Windräder (drehen sich), Hügel am Horizont, Molen, Leuchtturminsel (`INSEL`, nachts mit kreisendem Lichtstrahl), Frachter, Fähre, Segelboote |
| `js/verkehr.js`, `js/verkehrbau.js` | Verkehr und Fußgänger. Regeln ohne three.js: 46 Autos fahren rechts von Kreuzung zu Kreuzung, halten Abstand, immer nur ein Auto in der Kreuzung, bremsen für den Spieler, bilden mit Blaulicht eine Rettungsgasse (`GASSE`); 40 Fußgänger laufen um ihren Häuserblock. Beide gibt es nur in der Nähe des Spielers (werden sonst versetzt). `verkehrbau.js` zeichnet sie als Instanzen |
| `js/karte.js` | Radar (rund, oben rechts; zu Fuß Norden oben, im Auto Fahrtrichtung oben; Ziel gelb, Streifenwagen weiß, am Rand festgehalten) und große Stadtkarte (Taste M oder Radar antippen; verschieben, zoomen, Straßennamen). Beide aus `PLAN` gemalt, Vorbild Reitturnier |
| `js/story.js` | Die Geschichte (ohne three.js): `beginn`, `AKT` (eine Funktion je Aktion), `funk` (was man gerade funken kann), `ZONEN` (Stellen, an denen von selbst etwas passiert), `SACHEN`, `DURCHLAUF` (zum Prüfen), `MAX_PUNKTE`. Spricht nur über das Werkzeug `S` mit dem Spiel |
| `js/welt.js` | Baut einen Ort in 3D: drinnen aus einfachen Formen, die Stadt über `baueStadt`. `baueOrt`, `figur`, `autoModell` (Kombi-Modell mit Blaulicht, bis es geladen ist Kisten), `schild` |
| `js/oberflaeche.js` | Sprechblase, Auswahl, Zahlenschloss, Notizbuch/Tasche/Funk, Anzeige, Knöpfe, Startbild, Tagesende |
| `js/klang.js`, `sounds/` | Alle Geräusche (`KLAENGE`: Datei, Lautstärke, Schleife, `mal` = zufällig etwas höher/tiefer). Lädt die Dateien aus `sounds/liste.json`, sonst Ersatz-Töne. 12 Aufnahmen von Freesound, alle CC0, Quellen in `LIZENZEN.md` (Pixabay sperrt Programme). Dauer-Geräusche sind Schleifen mit weich überblendetem Ende |
| `js/main.js` | Bild, Licht (`LICHT`: tag, abend, nacht, dunkel), Schatten der Sonne rund um den Spieler (`SCHATTEN`), Laufen, Wegsuche A* für das Tippen (in der Stadt nur in einem Fenster von 180 m um die Figur), Hindernisse in einem Raster (`rasterBauen`, `nahe`), Fahren, Kamera (rückt im Auto näher, wenn sie in ein Haus geriete), Spar-Modus (`tempoMessen`), Speichern (`blaulicht.stand.v1`), Töne. Zahlen zum Einstellen oben |

Einen neuen Fall schreibt man so: Dinge und Leute in `daten.js` eintragen, je `akt` eine Funktion in `story.js`, den Weg in `DURCHLAUF` ergänzen, `node tools/story.mjs` laufen lassen.

## Bekannte Grenzen (Stand 21.11.2026)

- Nur Fall 1, Tag 1. Geprüft mit `tools/story.mjs`, `tools/stadt.mjs` und in einem Test-Browser ohne Grafikkarte: Ein Test-Programm hat den Tag in der großen Stadt
  über die echte Oberfläche bis zum Ende gespielt (zu den Stellen wurde dabei gesprungen, nicht gefahren), dazu ein Stück gelaufen (Tippen) und gefahren.
  Nicht von Hand gespielt, nicht auf dem iPad, Töne nicht angehört.
- Die große Stadt (1,5 km × 0,9 km), Himmel, Umland, Verkehr, Radar und Karte sind nur als Standbilder angesehen (Tag, Abend, Nacht; zu Fuß, im Auto, von oben),
  nicht in flüssiger Bewegung. Tempo auf dem iPad unbekannt: je nach Blick 0,6 bis 1,7 Millionen Dreiecke mit Schatten und rund 110 bis 300 Zeichenaufrufe.
  Ist das Gerät zu langsam, schaltet der Spar-Modus die Schatten ab – ob das reicht, ist nicht erprobt.
- Die Stadt ist ein rechtwinkliges Netz. Alle Häuser sind Kästen mit gemalter Fassade und Dach (keine Balkone, Erker, Schaufenster zum Hineinsehen); man kann nur in Wache und Museum hinein.
  Zu Fuß sind die Häuser vor der Kamera aufgeschnitten, man sieht dann ihre Innenwände ohne Zimmer.
- Verkehr: keine Ampeln, keine Vorfahrt – in der Kreuzung fährt immer nur ein Auto. Autos biegen in einem Bogen ab, blinken nicht, überholen nicht und parken nicht ein.
  Fußgänger gehen nur um ihren Block, überqueren keine Straße, laufen durch die Spielfigur und durcheinander hindurch. Busse, Fahrräder, Züge und Schiffe im Hafen fahren nicht.
- Der Streifenwagen ist ein silberner Kombi mit blauen Streifen und Blaulicht aus Kisten (kein eigenes Polizei-Modell). Figuren sind weiter aus einfachen Formen.
- Das Umland ist flach bis zu den Hügeln am Horizont und nur Kulisse. Kutter, Kran, Waggons, Bussteige und Stege sind aus Kisten.
- Die Uhr springt mit der Geschichte, sie läuft noch nicht von selbst. Tageszeiten: Tag, Abend, Nacht als Lichtstimmung (kein fließender Übergang, kein Regen).
- Aussehen der Spielfigur ist noch nicht wählbar. Stimmen gibt es nicht, alles ist Text.
- Alte Spielstände passen weiter (die Stellen von Tag 1 liegen an denselben Orten); steht die Figur dabei in einem neuen Haus, wird sie hinausgeschoben.
- Alle Zahlen (Tempo, Punkte, Abstände, Verkehr) sind geschätzt.
