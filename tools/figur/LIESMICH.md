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
   - alles als eine GLB-Datei speichern (25 Knochen, drei Bewegungen)

Die FBX-Dateien liegen nicht im Repository (je 10 MB, mit der Vorführ-Figur von DeepMotion). Die Pfade in `backen.mjs` muss man an den eigenen Ordner anpassen.
