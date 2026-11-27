# Quellen und Lizenzen

## Geräusche

Alle Geräusche sind Aufnahmen von [Freesound](https://freesound.org) unter **CC0** (Creative Commons Zero 1.0:
gemeinfrei, frei nutzbar, auch ohne Namensnennung – https://creativecommons.org/publicdomain/zero/1.0/).
Wir nennen die Urheber trotzdem gern und bedanken uns.

Für das Spiel wurden sie zugeschnitten, auf Mono umgerechnet, in der Lautstärke angeglichen und als MP3 (96 kbit/s) gespeichert.
Die Dauer-Geräusche (Sirene, Motor, Markt, Möwen, Alarm) sind zu Schleifen geschnitten: das Ende geht weich in den Anfang über.
Sie liegen im Ordner `sounds/`; welche das Spiel lädt, steht in `sounds/liste.json`.

| Datei | Wofür | Aufnahme (Ausschnitt) | Urheber | Lizenz |
| --- | --- | --- | --- | --- |
| `sirene.mp3` | Martinshorn beim Blaulicht (Schleife) | [Martinshorn (Siren) 2](https://freesound.org/s/811916/) (Sekunde 1,6–8,0) | TitanKaempfer | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `motor.mp3` | Motor des Streifenwagens (Schleife) | [Vehicle_Car_Peugeot_308_Idle_Exterior_Loop_Mono_02.wav](https://freesound.org/s/522225/) (2–6) | Nox_Sound | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `markt.mp3` | Stimmen auf dem Marktplatz (Schleife) | [Crowded market square in Valencia](https://freesound.org/s/784650/) (10–20) | jdpietrzak | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `moewen.mp3` | Möwen und Hafen (Schleife) | [harbour, seagulls-48k.wav](https://freesound.org/s/208074/) (110–122) | Further_Roman | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `alarm.mp3` | Alarmanlage am Museum (Schleife) | [Burglar Alarm](https://freesound.org/s/613652/) (1–7) | melokacool | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `funk.mp3` | Knacken, wenn der Funk angeht | [Radio Sign Off / Squelch](https://freesound.org/s/524205/) (0–0,3) | JovianSounds | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `schritt.mp3` | ein Schritt | [concrete footstep 1](https://freesound.org/s/166509/) | Yoyodaman234 | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `tuer.mp3` | Tür geht auf (beim Ortswechsel) | [Door opening and closing 3](https://freesound.org/s/482295/) (4,9–6,4) | dossantosbarbosa | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `schloss.mp3` | Spind geht auf | [Locker Open Close.wav](https://freesound.org/s/232548/) (0,75–1,4) | diegoverdoodt | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `pling.mp3` | Sorgfalts-Punkt bekommen | [Coin Collect](https://freesound.org/s/878612/) | Qvantor | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `hund.mp3` | Lotte bellt | [Dog Bark](https://freesound.org/s/495658/) (0,1–1,3) | aunrea | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `rumms.mp3` | mit dem Auto angestoßen | [Thump.wav](https://freesound.org/s/466351/) (0,35–0,87) | Harrisando | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |

Fehlt eine Datei, erzeugt das Spiel einen einfachen Ersatz-Ton selbst (`js/klang.js`).

### Neue Geräusche suchen

Wie bei den Geschwister-Spielen Reitturnier und Rennspiel: auf Freesound suchen, nur mit dem Filter „Creative Commons 0“.
Pixabay sperrt Programme (Cloudflare) und ging deshalb nicht. Kurz zuschneiden (Dauer-Geräusche als Schleife),
Datei in `sounds/` legen, Namen in `sounds/liste.json` und `KLAENGE` (`js/klang.js`) eintragen und hier eine Zeile ergänzen.

## Musik

Die Hintergrundmusik stammt von [Pixabay](https://pixabay.com/music/) und steht unter der
[Pixabay-Inhaltslizenz](https://pixabay.com/service/license-summary/): kostenlos nutzbar, auch ohne Namensnennung,
aber **nicht gemeinfrei**. Die Stücke dürfen nicht unverändert einzeln weitergegeben oder verkauft werden –
wer sie anderswo verwenden möchte, lädt sie bitte selbst bei Pixabay. Wir nennen die Urheber gern und bedanken uns.
Keines der Stücke ist bei Pixabay als KI-erzeugt markiert.

Für das Spiel wurde aus jedem Stück eine Schleife von 80 Sekunden geschnitten (die ersten 84 Sekunden, das Ende geht
4 Sekunden lang weich in den Anfang über: `tools/musik_schleife.py`), die Lautstärke angeglichen und als MP3
(96 kbit/s) gespeichert. Sie liegen im Ordner `musik/`; welche Stimmung welches Stück spielt, steht in `MUSIK` (`js/klang.js`).

| Datei | Wofür | Stück | Urheber |
| --- | --- | --- | --- |
| `titel.mp3` | Startbild | [Detective Intro](https://pixabay.com/music/introoutro-detective-intro-578734/) | Nikita Kondrashev (leberch) |
| `wache.mp3` | auf der Wache | [Investigation](https://pixabay.com/music/crime-scene-investigation-625069/) | Nikita Kondrashev (leberch) |
| `streife.mp3` | unterwegs in der Stadt | [Detective Documentary](https://pixabay.com/music/pulses-detective-documentary-313738/) | Nikita Kondrashev (leberch) |
| `hafen.mp3` | zu Fuß am Wasser | [Aquatic Downtime](https://pixabay.com/music/ambient-aquatic-downtime-363761/) | Geoff Harvey (geoffharvey) |
| `jagd.mp3` | Verfolgungsfahrt | [Chase](https://pixabay.com/music/main-title-chase-254539/) | Nikita Kondrashev (leberch) |
| `museum.mp3` | im Museum | [Dark Ambient](https://pixabay.com/music/ambient-dark-ambient-590151/) | AtlasAudio |
| `spannung.mp3` | nachts in der Stadt, Alarm | [Grey Square (Tension)](https://pixabay.com/music/suspense-grey-square-tension-614347/) | Nikita Kondrashev (leberch) |
| `raetsel.mp3` | Zahlenschloss | [Investigation Piano](https://pixabay.com/music/crime-scene-investigation-piano-611639/) | Nikita Kondrashev (leberch) |

Neue Musik: Pixabay sperrt Programme, im Browser geht es. Stück als MP3 laden, mit ffmpeg die ersten 84,5 Sekunden als WAV
speichern, `python3 tools/musik_schleife.py ein.wav aus.wav`, als MP3 nach `musik/`, in `MUSIK` eintragen und hier eine Zeile ergänzen.

## Stimmen (`sprache/`)

Alle Stimmen sind mit [3D AI Studio](https://www.3daistudio.com) erzeugt (Text zu Sprache, eingebaute Stimmen, über das
Konto des Nutzers; laut Anbieter für eigene Projekte frei nutzbar). Keine echte Person wird nachgemacht.
Welche Person welche Stimme hat, steht in `STIMMEN` in `tools/sprache.mjs`. Neue Aufnahmen: `tools/sprache_LIESMICH.md`.

## Programme

- [three.js](https://threejs.org) r160, MIT-Lizenz, geladen von jsDelivr.
