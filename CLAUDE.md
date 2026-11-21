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
```

Im Browser: `window.__polizei` enthält `Z` (Spielstand), `S` (Werkzeug der Geschichte), `spieler`, `welt`, `tu(aktion, ding)`, `step(n)`.
`__polizei.angehalten = true` hält die eigene Schleife an, `step(n)` spult n Bilder vor.

## Aufbau

Koordinaten: Meter, x seitlich, z längs (zur Kamera hin ist plus). Ein Winkel h schaut nach (sin h, cos h). Rechtecke sind `[x1, z1, x2, z2]`.

| Datei | Inhalt |
|---|---|
| `js/daten.js` | Die Orte als Daten (ohne three.js): `wache`, `stadt` (Straßennetz, Häuser aus einem festen Zufall, besondere Häuser), `museum`. Dinge und Leute mit `akt` (Stelle in der Geschichte), `wenn`/`bis` (Merker), `licht` (nur im Kegel der Taschenlampe), `folgt` (Otto läuft hinterher) |
| `js/story.js` | Die Geschichte (ohne three.js): `beginn`, `AKT` (eine Funktion je Aktion), `funk` (was man gerade funken kann), `ZONEN` (Stellen, an denen von selbst etwas passiert), `SACHEN`, `DURCHLAUF` (zum Prüfen), `MAX_PUNKTE`. Spricht nur über das Werkzeug `S` mit dem Spiel |
| `js/welt.js` | Baut einen Ort in 3D aus einfachen Formen: `baueOrt`, `figur`, `autoModell`, `schild` |
| `js/oberflaeche.js` | Sprechblase, Auswahl, Zahlenschloss, Notizbuch/Tasche/Funk, Anzeige, Knöpfe, Startbild, Tagesende |
| `js/main.js` | Bild, Licht (`LICHT`: tag, abend, nacht, dunkel), Laufen, Wegsuche A* für das Tippen, Fahren, Kamera, Speichern (`blaulicht.stand.v1`), Töne. Zahlen zum Einstellen oben |

Einen neuen Fall schreibt man so: Dinge und Leute in `daten.js` eintragen, je `akt` eine Funktion in `story.js`, den Weg in `DURCHLAUF` ergänzen, `node tools/story.mjs` laufen lassen.

## Bekannte Grenzen (Stand 21.11.2026)

- Nur Fall 1, Tag 1. Geprüft mit `tools/story.mjs` und in einem Test-Browser ohne Grafikkarte: Ein Test-Programm hat den Tag mit Tasten, Klicks und
  vorgespulten Bildern bis zum Ende gespielt, dazu Standbilder. Nicht von Hand gespielt, nicht auf dem iPad, Töne nicht angehört.
- Die Stadt ist nur ein Netz aus 3 × 3 Straßen. Es gibt keinen anderen Verkehr, keine Ampeln, keine Fußgänger außer den Leuten der Geschichte.
- Alles besteht aus einfachen Formen (keine fertigen 3D-Modelle), Figuren haben keine Finger und nur Punkte als Augen.
- Die Uhr springt mit der Geschichte, sie läuft noch nicht von selbst. Tageszeiten: Tag, Abend, Nacht nur als Lichtstimmung.
- Aussehen der Spielfigur ist noch nicht wählbar. Stimmen gibt es nicht, alles ist Text.
- Im Auto kann die Kamera in ein Haus geraten, wenn man dicht an einer Wand wendet.
- Alle Zahlen (Tempo, Punkte, Abstände) sind geschätzt.
