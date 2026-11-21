# So entsteht die Spielfigur `assets/modelle/polizist.glb`

1. Figur in 3D AI Studio erzeugen (T-Pose, Arme zur Seite). Die Datei hat etwa 1,5 Millionen Dreiecke.
2. `node klein.mjs roh.glb klein.glb 30000` macht daraus 30.000 Dreiecke und ein Bild mit 1024 Punkten (braucht gltf-transform, meshoptimizer und sharp).
3. `klein.glb`, die Bewegungs-Dateien `lauf.fbx` und `sprint.fbx` (DeepMotion SayMotion, Mixamo-Knochen) und diesen Ordner in einen Ordner legen,
   dort `python3 -m http.server 8777` starten.
4. `node backen.mjs` öffnet `schau.html` in einem Browser ohne Fenster (Playwright). `bake.js` rechnet dort:
   - Figur drehen und auf die Größe des Knochen-Gerüsts bringen, Beine gerade stellen
   - für jede Stelle der Figur ausrechnen, welcher Knochen sie bewegt (Gewichte, Stück für Stück in der T-Pose)
   - aus den Aufnahmen je einen Doppelschritt herausschneiden (Gehen: Bilder 5 bis 44 von `lauf.fbx`, Laufen: Bilder 129 bis 153 von `sprint.fbx`),
     auf der Stelle laufen lassen, gerade drehen und das Ende in den Anfang überblenden
   - „stehen“ selbst bauen (Arme hängen, Atmen)
   - alles als eine GLB-Datei speichern (33 Knochen, drei Bewegungen)
   - je Hand drei Gelenke für alle vier Finger zusammen und eins für den Daumen dazubauen und die Finger krümmen (`KRUMM`), weil die Aufnahmen die Finger nicht bewegen

Die FBX-Dateien liegen nicht im Repository (je 10 MB, mit der Vorführ-Figur von DeepMotion). Die Pfade in `backen.mjs` muss man an den eigenen Ordner anpassen.

## Weitere Figuren (Otto und andere)

Für eine weitere Figur braucht man die Aufnahmen nicht mehr: `nach.js` nimmt Gerüst und Bewegungen aus der fertigen `polizist.glb` und rechnet nur die Gewichte neu.

1. Figur in 3D AI Studio erzeugen, am besten aus Kims Vorlage-Bild abgeleitet (gleiche T-Pose, gleiche Maße), dann mit `klein.mjs` verkleinern → `klein.glb`.
2. `klein.glb`, `polizist.glb`, `schau.html`, `nach.js` in einen Ordner, dort `python3 -m http.server 8777`.
3. `node nachbacken.mjs <Ordner von three> otto` schreibt `otto.glb` und Probebilder nach `bilder/`.

## Natürlich stehen (haltung.js)

Die Bewegung „stehen“ aus `bake.js` ist steif (Arme am Körper, beide Beine durchgedrückt). `haltung.js` ersetzt sie: Gewicht auf einem Bein, Becken gekippt,
Schultern gegengleich, Arme neben dem Körper mit gebeugten Ellbogen, dazu atmen, Gewicht verlagern und umsehen (Schleife von 9 Sekunden). Zahlen stehen oben als `STAND`.

- Kim: `node haltung.mjs <Ordner von three> polizist.glb neu.glb`
- Otto: `node haltung.mjs <Ordner von three> otto.glb neu.glb '{"seite":-1,"arm":0.27,"zurueck":0.05,"ellbogen":0.2,"becken":2.2,"blick":0.13,"dauer":10.5}'`

Nur einmal auf eine Datei anwenden (das Skript prüft das). Probebilder landen in `bilder/`. Besser wäre eine echte Aufnahme (zum Beispiel von Mixamo): Dann die Aufnahme
in `bake.js` als weitere Bewegung einlesen statt `steh`.

## Menschen aus MakeHuman / MPFB (in Arbeit)

Für alle Personen außer Kim und Otto: frei verfügbare Menschen aus MakeHuman (CC0) statt Klötzchen.

1. Einmal einrichten: `pip install bpy` (Blender als Python-Modul), `git clone --depth 1 https://github.com/makehumancommunity/mpfb2.git`,
   den Ordner `mpfb2/src/mpfb` nach `~/.config/blender/<Version>/extensions/user_default/mpfb` kopieren.
2. `python3 mensch.py person.glb '{"gender":1,"age":0.6,"weight":0.7}'` baut einen Körper mit dem Gerüst „mixamo“ (saubere Gewichte, einzelne Finger).
3. `node uebertragen.mjs <Ordner von three> person.glb fertig.glb` überträgt stehen, gehen und laufen von `polizist.glb` (Drehungen im Raum, weil die Ruhe-Haltung anders ist).

Noch offen: Haut, Kleidung, Haare und Augen. Die stecken im Paket `makehuman_system_assets_cc0.zip` von files.makehumancommunity.org – der Host war aus der
Cloud-Umgebung nicht erreichbar. Ohne das Paket entstehen nur nackte, einfarbige Körper.

### Angezogene Menschen (seit 21.11.2026, erste Person: Dr. Thomsen)

Die CC0-Pakete von MakeHuman (Haut, Haare, Kleidung …) liegen als zip in den Projektdateien (`police-quest/makehuman/`, mit `liste.txt`), nicht im Repository.
Sie werden in den Daten-Ordner von MPFB ausgepackt (`~/.config/blender/5.3/extensions/.user/user_default/mpfb/data`).

```bash
python3 mensch.py thomsen_roh.glb '{"gender":0.0,"age":0.62,"weight":0.32,"muscle":0.4,"height":0.5,"haut":"middleage_caucasian_female","brauen":"eyebrow001","wimpern":"eyelashes01","haare":"toigo_curled_under_bob","augenfarbe":"green","sparen":0.45,"kleidung":["toigo_female_suit","toigo_ankle_boots_female"],"farbe":{"boots":[0.12,0.1,0.1]}}'
node uebertragen.mjs <Ordner von three> thomsen_roh.glb thomsen.glb      # Bewegungen von Kim, Finger locker gekrümmt, Probebilder
npx gltf-transform resize thomsen.glb k.glb --width 1024 --height 1024 && npx gltf-transform webp k.glb assets/modelle/thomsen.glb --quality 82
```

Danach in `js/polizist.js` bei `FIGUREN` eintragen (Größe in der Datei, Größe im Spiel) und in `daten.js` `look.modell: 'thomsen'` setzen.
Nicht `gltf-transform simplify` benutzen – das zerstört die kleinen Augen. Dreiecke spart `"sparen"` (nur an der Kleidung).

## Bewegungen aus Aufnahmen (seit 21.11.2026)

Kristian hat 52 Bewegungs-Aufnahmen von Mixamo heruntergeladen (FBX, Ordner „Motion Capture“ auf seinem Mac). Die FBX-Dateien kommen **nicht** ins Repository.
Im Spiel liegen nur die fertig umgerechneten Bewegungen, getrennt von den Figuren – eine Datei für alle Figuren mit demselben Gerüst:

| Datei | für wen |
|---|---|
| `assets/modelle/bewegungen_polizei.glb` | Kim und Otto (Gerüst aus `polizist.glb`) |
| `assets/modelle/bewegungen_frau.glb` | Frauen aus MakeHuman |
| `assets/modelle/bewegungen_mann.glb` | Männer aus MakeHuman |

Welche Aufnahme zu welcher Bewegung wird, steht in `bewegungen.json` (`name`, `datei`, dazu `von`/`bis` = Ausschnitt in Sekunden, `amOrt` = läuft auf der Stelle,
`faust` = Hand geschlossen). Neu rechnen:

```bash
node uebertragen.mjs <Ordner von three> <figur.glb> <bewegungen_aus.glb> bewegungen.json    # malt auch Probebilder nach bilder/
```

Benutzt werden: Idle-2 (stehen), Looking Behind (umsehen), Swagger Walk (gehen), Running-2 (laufen), Drawing Gun (ziehen), Pistol Aim (zielen, wegstecken),
Standing Up (sitzen, aufstehen). Nicht benutzt: Sport-Übungen, Gewehr-Aufnahmen, Seitschritte.
Im Spiel: `ladePolizist(gruppe, datei, art)` holt Figur und passende Bewegungen, `polizistSpiele(gruppe, 'ziehen')` spielt eine Bewegung einmal,
die Geschichte ruft das über `S.zeig(name, halten)` auf.

Für Männer und Frauen aus MakeHuman gelten eigene Listen (`bewegungen_mann.json`, `bewegungen_frau.json`): gleich, nur mit `eng` (Grad) bei `stehen` und `umsehen`,
weil die Aufnahme sehr breitbeinig steht.

## Alle Personen bauen (leute.py)

`leute.py` enthält das Rezept jeder Person und ruft für jede `bau.sh` auf (`mensch.py` → verkleinern auf 512 Punkte → WebP → `assets/modelle/<id>.glb`).
Die Pfade in `bau.sh` passen zur Cloud-Sitzung, in der sie entstanden sind – vorher anpassen. Ansehen: `python3 -m http.server 8777` in einem Ordner mit `leute.html`
und einem Verweis `spiel` → `assets/modelle`, dann `node leute.mjs <Ordner von three> selin:frau harms:mann …` (malt `bilder/L_<id>.png`: vier Seiten und das Gesicht).
