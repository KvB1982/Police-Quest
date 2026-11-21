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
