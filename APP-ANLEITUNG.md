# Blaulicht über Möwenbrück auf iPad und iPhone

Es gibt zwei Wege. Der erste geht sofort, der zweite macht eine echte App daraus.

## Weg 1: Zum Home-Bildschirm (ohne Mac, ohne Xcode)

1. Auf dem iPad oder iPhone **Safari** öffnen: https://kvb1982.github.io/Police-Quest/
2. Auf **Teilen** tippen (Kästchen mit Pfeil), dann **Zum Home-Bildschirm**.
3. Das Spiel über das neue Symbol „Blaulicht“ starten. Es läuft dann im Vollbild.

Nach dem ersten Start mit Internet merkt sich das Gerät die Dateien. Was du schon einmal gesehen hast (Wache, Stadt, Museum), läuft danach auch ohne Internet.
Der Spielstand vom Home-Bildschirm ist getrennt vom Spielstand in Safari.

## Weg 2: Echte App mit Xcode und TestFlight

Das Spiel bleibt, wie es ist. [Capacitor](https://capacitorjs.com) packt die Dateien in eine App, genau wie beim Rennspiel, bei Frontlinie 3 und beim Reitturnier.
Das Xcode-Projekt liegt fertig im Ordner `ios`.

Was die App anders macht als der Browser:

- Echtes Vollbild ohne Statusleiste, fest im Querformat.
- three.js liegt in der App. Alles läuft von Anfang an ohne Internet.
- Der Bildschirm bleibt an, auch wenn man nur durch Neigen lenkt.
- Der Spielstand der App ist getrennt vom Browser.

### Einmal einrichten (auf dem Mac)

Du brauchst **Xcode** und **Node.js**. Beides ist vom Rennspiel schon da. Im Programm **Terminal**:

```bash
cd ~/Documents
git clone https://github.com/KvB1982/Police-Quest.git
cd Police-Quest
npm install
npm run ios
```

`npm run ios` kopiert das Spiel nach `www`, packt es in die App und öffnet Xcode. Beim ersten Öffnen lädt Xcode ein paar Pakete nach.

### Signieren

Das Team (`AX2SZQVU9L`, dasselbe wie bei den anderen Spielen) und die Kennung `de.kvb1982.blaulicht` sind schon eingetragen. Falls Xcode trotzdem fragt:
links oben auf **App** klicken, unter „Targets“ wieder **App**, Reiter **Signing & Capabilities**, Haken bei **Automatically manage signing**, Team wählen.

### Auf iPad oder iPhone starten

1. Gerät per Kabel anschließen, entsperren, „Diesem Computer vertrauen“.
2. In Xcode oben das Gerät als Ziel wählen.
3. Auf den Pfeil **▶** klicken.

### TestFlight

1. Einmalig auf https://appstoreconnect.apple.com unter **Apps → „+“ → Neue App** anlegen: Plattform iOS, Name „Blaulicht über Möwenbrück“, Bundle-ID `de.kvb1982.blaulicht`.
2. Im Terminal im Ordner des Spiels:

```bash
npm run testflight
```

Das holt den neuesten Stand, baut die App und lädt sie hoch. Die Build-Nummer ist die Uhrzeit. Die Anmeldung läuft wie beim Rennspiel
(Konto aus Xcode oder ein API-Schlüssel in `~/.appstoreconnect/blaulicht.env`, siehe Kopf von `scripts/testflight.sh`).

## Steuerung mit den Fingern

- Unten links eine Tätigkeit wählen (Gehen, Ansehen, Reden, Benutzen), dann auf ein Ding, eine Person oder den Boden tippen. Die Lupe zeigt, was es gibt.
- Zwei Finger: Kamera drehen, neigen und zoomen. 🎯 stellt sie zurück.
- Im Streifenwagen: Gerät wie ein Lenkrad drehen, rechter Daumen Gas, linker Daumen Bremse. „↕ Mitte“ stellt geradeaus neu ein. „📱 Neigen: aus“ zeigt stattdessen Pfeile.
- Das iPhone bitte quer halten.

## Noch nicht erprobt

Das Spiel ist bisher nur in einem Test-Browser im iPad- und iPhone-Format geprüft, nicht auf einem echten Gerät. Das Xcode-Projekt ist noch nie gebaut worden.
