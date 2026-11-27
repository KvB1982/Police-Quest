# Blaulicht über Möwenbrück

Ein Polizei-Krimi in 3D für 10- bis 12-Jährige, für den Browser (PC, iPad und iPhone – Anleitung für die Geräte: `APP-ANLEITUNG.md`). Spannend, aber ohne Tote und ohne Blut.
Du bist neu bei der Polizei in der ausgedachten Hafenstadt Möwenbrück und fährst mit deinem Ausbilder Otto Streife.

**Stand:** erste spielbare Version – Fall 1 „Die Feder im Museum“, Tag 1 (etwa 15–20 Minuten).

## Starten

```bash
python3 tools/server.py     # dann im Browser http://localhost:8765 öffnen
```

Das Spiel braucht beim Start Internet (three.js kommt von jsDelivr).

## Steuerung

Point and Click wie in einem klassischen Adventure: unten links eine Tätigkeit wählen, dann auf ein Ding, eine Person oder den Boden tippen.

| Was | PC | iPad |
|---|---|---|
| Tätigkeit wählen (🚶 Gehen, 👁 Ansehen, 💬 Reden, ✋ Benutzen) | Knöpfe unten links, Tasten 1–4 oder rechte Maustaste | Knöpfe unten links |
| Laufen | auf den Boden klicken, oder Pfeiltasten / WASD | auf den Boden tippen |
| Zeigen, was man antippen kann | 🔍 oder Taste H | 🔍 |
| Das Nächstliegende tun | E oder Knopf unten rechts | Knopf unten rechts |
| Fahren | Pfeiltasten | Knöpfe unten |
| Funk, Notizbuch, Tasche | F, N, T | Knöpfe oben rechts |
| Blaulicht: aus → nur Blaulicht → Blaulicht mit Sirene | B | Knopf rechts |
| Stadtkarte | M | Radar antippen |

## Geräusche

Sirene, Motor, Markt, Möwen, Alarm, Funk, Schritte, Tür, Spind, Pling, Hund und Rumms sind echte Aufnahmen von Freesound
(alle CC0, also frei nutzbar). Sie liegen in `sounds/`, Quellen und Urheber stehen in [LIZENZEN.md](LIZENZEN.md).
Fehlt eine Datei, macht das Spiel selbst einen einfachen Ersatz-Ton.
