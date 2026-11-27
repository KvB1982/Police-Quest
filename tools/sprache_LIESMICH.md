# Stimmen neu aufnehmen

Jeder Satz im Spiel hat eine Aufnahme in `sprache/`. Ändert sich ein Satz oder kommt ein neuer Tag dazu, fehlen Aufnahmen.

1. `node tools/sprache.mjs` zeigt, was fehlt. Neue Personen bekommen in `STIMMEN` (oben in der Datei) einen Ordner,
   eine Stimme und die Ruhe (`stability`: 0,7 für den Erzähler, 0,4 bis 0,5 für aufgeregte Leute).
   Zahlen, Kennzeichen und Kürzel, die falsch gelesen würden, kommen in `ERSETZEN`.
2. `node tools/sprache_stapel.mjs plan` teilt die fehlenden Sätze in Stapel: eine Stimme, höchstens 8 Sätze, dazwischen
   `[long pause]`. Das spart Aufträge (bezahlt wird je angefangene 100 Zeichen eines Auftrags).
   Danach `plan` nicht noch einmal aufrufen, bis alle Stapel geholt sind – die Nummern würden sich verschieben.
3. `node tools/sprache_stapel.mjs zeig 0 9` druckt die Stapel. Jeden mit `generate_speech` von 3D AI Studio abschicken:
   Stimme und Ruhe wie gedruckt, `language_code: 'de'`, Text genau wie gedruckt (nur die ersten 40 Zeichen müssen stimmen,
   daraus wird die Adresse der Datei gebaut).
4. `node tools/sprache_stapel.mjs hol 0:<task_id> 1:<task_id> …` lädt, schneidet an den langen Pausen, macht alle Stücke
   gleich laut (Mono, 32 kHz) und legt sie nach `sprache/`. Meldet es „FALSCH: 7 Stücke statt 8“, stehen dahinter die Pausen:
   Dann mit kleinerer Grenze noch einmal (`0:<task_id>:0.9`) und die gedruckten Längen ansehen – sie müssen zur Zahl der
   Buchstaben passen (etwa 0,06 Sekunden je Buchstabe). Liam, Bill und Callum machen oft nur Pausen von einer Sekunde.
5. `node tools/sprache.mjs` noch einmal: schreibt `sprache/liste.json` und zeigt, ob noch etwas fehlt.
   `node tools/sprache.mjs aufraeumen` löscht Aufnahmen, zu denen es keinen Satz mehr gibt.

Lehnt der Dienst einen Stapel ab („content policy“), liegt es meist an einem einzelnen harten Satz (falsche Antworten wie
„Waffe ziehen …“). Den Stapel teilen; ein Satz, der allein abgelehnt wird, bleibt ohne Stimme (das Spiel zeigt dann nur den Text).

Anhören kann im Cloud-Rechner niemand: Geprüft sind nur Zahl, Länge und Lautstärke der Stücke.
