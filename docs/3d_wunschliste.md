# Wunschliste: 3D-Modelle für „Blaulicht über Möwenbrück“

Stand 21.11.2026. Ziel: Das Spiel soll statt aus Klötzen aus echten Modellen bestehen und „cool und realistisch“ aussehen –
und trotzdem auf dem iPad flüssig laufen. Diese Liste sagt für jedes Modell: was, wo im Spiel, woher, wie groß, wie wichtig.

## So hat es Powershot gemacht (das übernehmen wir)

Powershot hat seine Modelle aus **zwei Quellen**:

1. **3D AI Studio** (der 3D-Generator, den Kristian schon hat, auch als Werkzeug für Claude) – für fast alles:
   Spielerfiguren, Autos, Häuser je Land, berühmte Stadien, Möbel, Requisiten. Vorteil: Man bekommt genau das, was man beschreibt,
   ohne Logos, und die Modelle gehören einem selbst. Etwa 80 Modelle, zusammen rund 20 MB.
2. **Poly Haven** (polyhaven.com, Lizenz **CC0** = jeder darf alles, niemand muss genannt werden) – für Kleinteile und Bodenbilder:
   Laterne, Mülltonne, Blumenkübel, Bistro-Tisch, Plastikstuhl und vier Bodenbilder (Gras, Pflaster, Asphalt, Kopfstein).

Und so werden sie eingebaut (steht in Powershot in `js/gelaendemodelle.js`, `js/requisiten.js`, `js/figur.js`, `assets/gelaende/QUELLEN.md`):

- **Erst Klötze, dann Modelle.** Das Spiel baut alles zuerst aus einfachen Formen. Sind die Modelle geladen, wird neu gebaut.
  Ohne Internet oder bei Qualität „niedrig“ bleiben die Klötze. So kann nichts kaputtgehen – das passt genau zu unserer jetzigen `welt.js`.
- **Nur laden, was der Ort braucht.** Im Museum werden keine Autos geladen.
- **Verkleinern vor dem Einbau** mit `tools/modell_klein.mjs` aus Powershot: ein Netz, ein Material, nur das Farbbild (512 oder 1024 Pixel),
  wenige Dreiecke. Richtwerte unten.
- **Eine Tabelle mit Größe und Drehung** je Modell (`MODELLE`: Höhe oder Länge in Metern, Drehung, damit „vorn“ nach +z zeigt).
- **Einmal laden, oft hinstellen**, viele gleiche Dinge (Bäume, Poller, Laternen) als `InstancedMesh`.
- **Figuren** kommen als starre T-Pose aus 3D AI Studio; das Spiel rechnet selbst ein Skelett mit 13 Knochen hinein
  und färbt Hemd, Hose, Haut und Haare im Shader um (`figur.js`). Dadurch reichen wenige Modelle für viele Leute.
- **Quellen-Datei**: Jede fremde Datei steht mit Vorlage, Link, Lizenz und „was wir geändert haben“ in einer Tabelle
  (bei uns: `assets/QUELLEN.md`, so wie die Geräusche in `LIZENZEN.md`).

## Regeln für jedes Modell

| Regel | Warum |
|---|---|
| Lizenz nur **CC0** oder **CC-BY** (bei CC-BY Namen im Spiel nennen, „Mitwirkende“). Nie „NC“, „Editorial“, „Privat“ oder „keine KI“. | Das Repository ist öffentlich, das Spiel läuft auf GitHub Pages. |
| Selbst erzeugt in 3D AI Studio = gehört uns. In `QUELLEN.md` trotzdem eintragen („3D AI Studio, Beschreibung: …“). | Damit man weiß, woher es kommt. |
| Keine echten Polizei-Wappen, keine echten Automarken (auch keine typische Marken-Front), keine echten Firmenlogos. Schriftzüge wie „POLIZEI“ und „Möwenbrück“ malt das Spiel selbst darauf. | Ausgedachte Stadt; Powershot hatte Ärger mit Fahrdienst-Autos, die echten Luxusmodellen ähnlich sahen. |
| Keine Waffen am Gürtel, keine Handschellen im Einsatz-Bild. Gürtel mit Funkgerät, Taschenlampe, Notizbuch. | Kinderfreundlich (siehe CLAUDE.md). |
| Ein Stil für alles: „leicht realistisch“ – echte Proportionen und Farbbilder, aber sauber und hell, kein Dreck, kein Rost-Grusel. Bei 3D AI Studio immer dazuschreiben: *„stylized realistic, clean, game asset, low poly, no text, no logo“*. | Poly-Haven-Fotomodelle und KI-Modelle sollen nebeneinander nicht fremd wirken. Kenney/Quaternius (sehr comichaft) nur, wenn wir den Stil bewusst wechseln. |
| Größen-Budget siehe unten. Neues Modell vorher verkleinern, danach im Test-Browser als Standbild ansehen. | iPad-Speicher, Ladezeit. |
| Wird ein Modell unter gleichem Namen ersetzt: Versionsnummer im Service-Worker erhöhen (sobald es einen gibt). | Sonst zeigt das iPad das alte Modell. |

### Größen-Budget

| Art | Dreiecke | Farbbild | Datei |
|---|---|---|---|
| Kleinteil (Poller, Mülltonne, Telefon) | 300 – 2.000 | 512 | 30 – 120 KB |
| Möbel, Requisit | 1.000 – 5.000 | 512 | 80 – 250 KB |
| Fahrzeug | 4.000 – 10.000 | 1024 | 100 – 400 KB |
| Haus, großes Gebäude | 2.000 – 8.000 | 1024 | 150 – 600 KB |
| Figur (T-Pose) | 8.000 – 15.000 | 1024 | 0,8 – 1,2 MB |
| Bodenbild (grau, Farbe gibt das Spiel) | – | 512 | 60 – 100 KB |

Ziel für das ganze Spiel: **unter 25 MB Modelle**, je Ort höchstens etwa 6 MB zu laden und 300.000 Dreiecke im Bild.

## Woher: Quellen im Überblick

| Quelle | Lizenz | Gut für | Hinweis |
|---|---|---|---|
| **3D AI Studio** | gehört uns | Figuren, Fahrzeuge, besondere Gebäude, alles mit Möwenbrück-Eigenheit | Hauptquelle wie in Powershot. Kostet Guthaben. Danach verkleinern. |
| **Powershot** (`KvB1982/Powershot`, `assets/`) | eigene + CC0 | Autos, Laternen, Möbel, Vitrine, Spinde, Bodenbilder | Sofort nutzbar, schon verkleinert (siehe nächster Abschnitt). |
| **Poly Haven** – polyhaven.com/models | CC0 | Kleinteile, Möbel, Kisten, Fässer, Bodenbilder, Himmel (HDRI) | Fotorealistisch; immer stark verkleinern (Originale 5.000 – 30.000 Dreiecke). |
| **ambientCG** – ambientcg.com | CC0 | Bodenbilder und Wände: Kopfstein, Backstein, Holzdielen, Fliesen, Linoleum | Nur das Farbbild nehmen, 512 Pixel. |
| **Poly Pizza** – poly.pizza | je Modell CC0 oder CC-BY | Schnelle Ersatzteile (Boje, Anker, Möwe) | Lizenz bei jedem Modell einzeln prüfen; eher comichaft. |
| **Sketchfab** – sketchfab.com (Filter „Downloadable“ + Lizenz „CC0“ oder „CC Attribution“) | CC0 / CC-BY | Seltenes: Fischkutter, Leuchtturm, Glocke, Kran | Braucht ein Konto zum Herunterladen. Vorsicht: viele Modelle sind zu groß oder „NC“. |
| **Kenney** – kenney.nl, **Quaternius** – quaternius.com | CC0 | Notfall-Ersatz | Sehr comichaft, passt nicht zu „realistisch“. |

Hinweis zum Herunterladen (Stand 21.11.2026): Poly Haven und ambientCG sind in der Umgebung „Spiele (Sound-Quellen)“ freigeschaltet und gehen.
Poly Pizza und Kenney sperren Programme von sich aus (403, wie Pixabay), Sketchfab braucht ein Konto.
**Schon geladen:** 35 Modelle von Poly Haven und 7 Boden- und Wandbilder von ambientCG, siehe `assets/QUELLEN.md` (noch nicht ins Spiel eingebaut).
Poly Haven hat nur 522 Modelle. Es gibt dort **keine** Figuren, Fahrzeuge, Häuser, Boote, Schließfächer, Spinde, Vitrinen, Poller, Ampeln oder Verkehrsschilder –
die Suchwörter in den Tabellen unten sind für solche Dinge also Wünsche an 3D AI Studio oder Sketchfab.

## Schon da: aus Powershot übernehmen (Priorität A, kostet nichts)

Diese Dateien sind schon verkleinert und haben passende Lizenzen (3D AI Studio = eigene, sonst Poly Haven CC0). Einfach nach
`assets/` kopieren und in `QUELLEN.md` „aus Powershot“ dazuschreiben.

| Datei in Powershot (`assets/gelaende/`) | Größe | Wofür bei uns |
|---|---|---|
| `auto_kompakt`, `auto_kombi`, `auto_van`, `auto_suv`, `auto_limousine` | je 80–100 KB | Verkehr und parkende Autos; `auto_kombi` grau = der Falschparker vor der Kita |
| `laterne_alt` (Poly Haven), `laterne` | 88 / 36 KB | Altstadt und Hafen (alt), Sonnenhang (neu) – nachts leuchten |
| `muelltonne`, `pflanzkuebel`, `plastikstuhl`, `picknicktisch`, `bistro` (alle Poly Haven) | 68–280 KB | Straßen, Hof der Wache, Eisdiele (Bistro), Spielplatz |
| `innen_spinde` | 116 KB | Umkleide der Wache (Kims Spind mit Zahlenschloss aus eigener Form dazu) |
| `innen_empfang` | 116 KB | Tresen am Eingang der Wache |
| `innen_tisch`, `innen_stuehle` | 116 / 160 KB | Besprechungsraum |
| `innen_buffet` | 132 KB | Theke der Kantine |
| `innen_sofa` | 100 KB | Kims Wohnung |
| `innen_vitrine` | 104 KB | Museum: Vitrinen (Feder, Gildenbuch, Goldmünzen) |
| `absperrgitter` | 88 KB | Absperrung am Tatort, Lichterfest |
| `stand`, `schirmtisch` | 108 / 148 KB | Marktstände |
| `mal_kiste` | 396 KB | Kiste mit der Glocken-Kopie (Fall 4) |
| `haus_backstein`, `haus_altbau`, `hochhaus_wohnblock` | 268–508 KB | Häuser der Stadt, bis die eigenen Möwenbrück-Häuser fertig sind |
| `baum_laub`, `baum_fichte` (+ flache Bilder `*_flach.webp`) | 356 / 248 KB | Bäume am Markt, an der Kita, am Deich |
| `boden_asphalt`, `boden_pflaster`, `boden_kopfstein`, `boden_gras` (Poly Haven) | 68–88 KB | Straßen, Gehwege, Altstadt, Wiese – genau so einfärben wie in Powershot (`bodenBild`) |
| `../bank.glb` (Spielerbank) | 328 KB | Bank im Flur der Wache, Wartebank am Bahnhof |

## Neue Modelle

Priorität: **A** = für Fall 1 (was es jetzt schon gibt: Wache, Stadt mit Markt und Kita, Museum bei Nacht) · **B** = Fall 2 und 3 (Hafen, Bahnhof, Gewerbegebiet, Seniorenheim) · **C** = Fall 4 und Schmuck.
„3D AI“ = in 3D AI Studio erzeugen; die Beschreibung in Anführungszeichen ist ein Vorschlag für die Eingabe.

### Figuren (alle aus 3D AI Studio, T-Pose, ohne Finger, mit erfundenen Gesichtern)

| # | Modell | Wo im Spiel | Quelle / Eingabe | Prio |
|---|---|---|---|---|
| F1 | Polizistin in Uniform (Kim, weiblich) | Spielfigur | 3D AI: „young female police officer, navy blue uniform shirt and trousers, cap, utility belt with radio and flashlight, no weapon, no badge text, T-pose“ | A |
| F2 | Polizist in Uniform (Kim, männlich) | Spielfigur (wählbar) | wie F1, „young male“ | A |
| F3 | Älterer Polizist mit Bauch und Schnurrbart (Otto) | Ausbilder, immer dabei | 3D AI: „older police officer, belly, grey moustache, friendly, same uniform“ – das Spiel macht Haare grau | A |
| F4 | Frau in Bürokleidung (Selin, Dr. Thomsen, Frau Petersen) | Wache, Museum | 3D AI, Kleidung wird umgefärbt | A |
| F5 | Mann in Alltagskleidung (Brinkmann, Bäcker, Passanten) | überall | 3D AI, zwei Körperformen (schlank, kräftig) | A |
| F6 | Frau in Alltagskleidung (Erzieherin, Marktfrauen, Hanne) | überall | 3D AI, mit Rucksack als eigenes Teil | A |
| F7 | Kind, etwa 6 Jahre (Ben) und 12 Jahre (Mila) | Markt, Fall 2–4 | 3D AI: „child, casual clothes“ – Kinder nicht nur verkleinerte Erwachsene (Kopf größer), das war in Powershot eine Schwäche | A |
| F8 | Diensthund, Schäferhund-Art (Lotte) | Wache, Spurensuche | 3D AI: „german shepherd dog, standing, neutral pose“; braucht ein eigenes kleines Skelett (4 Beine, Schwanz, Kopf) | A |
| F9 | Alter Fischer mit Bart, Strickpulli, Mütze (Hein, Kapitän Tamm) | Hafen | 3D AI | B |
| F10 | Seniorin mit Strickjacke (Frau Janssen) | Fall 3 | 3D AI | B |
| F11 | Jugendliche mit Kapuzenpulli (Rico, Jette, Malte) | Fall 1–3 | 3D AI; Ricos rote Mütze als eigenes Teil | B |
| F12 | Mann im Anzug (Dr. Kranz, Dassel, Kommissar Wendt) | Fall 2–4 | 3D AI; Narbe an der linken Hand malt das Spiel (Farbfleck) | B |
| F13 | Möwen (sitzend, fliegend), Schafe, Katze | Hafen, Deich, Nacht | 3D AI oder Poly Pizza; Möwen als `InstancedMesh`, Flügelschlag mit zwei Posen | B |

### Fahrzeuge

| # | Modell | Wo im Spiel | Quelle / Eingabe | Prio |
|---|---|---|---|---|
| V1 | Streifenwagen: Kombi in Silber-Blau mit Blaulichtbalken | Hof der Wache, Fahren | 3D AI: „generic european station wagon police car, silver and blue, light bar on roof, no brand, no text“ – Blaulicht und Schrift macht das Spiel (leuchtende Teile extra) | A |
| V2 | Streifenwagen innen (Lenkrad, Funkgerät, Laptop) | Ansicht beim Einsteigen | 3D AI oder einfache Formen | C |
| V3 | Zivilwagen (unauffällige Limousine) | Fall 3, Hinterherfahren | `auto_limousine` aus Powershot umfärben | B |
| V4 | Polizeiboot (kleines Küstenboot) | Fall 2 Nachtwache, Fall 4 | 3D AI: „small police patrol boat, white and blue, searchlight“ | B |
| V5 | Fischkutter (für Hein und den „Geisterkutter“) | Hafen, Fall 2 | 3D AI oder Sketchfab „fishing trawler“ (CC0/CC-BY); Lampenketten, Lautsprecher, Antenne als Extra-Teile | B |
| V6 | Kleine Ruderboote, Motorboot | Hafen, Bootshaus | Poly Pizza / Sketchfab „rowing boat“, 3D AI | B |
| V7 | Lieferwagen (Dassel), Bus, Lastwagen | Verkehr, Fall 4 | `auto_van` aus Powershot; Bus und Lastwagen 3D AI | B |
| V8 | Motorroller (Jette), Fahrrad mit gelber Lieferbox (Kurier) | Fall 2, Fall 3 | 3D AI | B |
| V9 | Rettungsboot der Seenotretter (orange) | Fall 4, Sturmflut | 3D AI | C |

### Polizeiwache Am Deich (innen und Hof)

| # | Modell | Wo | Quelle / Suchwörter | Prio |
|---|---|---|---|---|
| W1 | Schreibtisch mit Bildschirm, Tastatur, Telefon | Leitstelle, Büros | Poly Haven „desk“, „office chair“, „computer monitor“, „telephone“; oder 3D AI als ein Stück | A |
| W2 | Funkpult der Leitstelle mit Mikrofon und Bildschirmen | Leitstelle (Frau Petersen) | 3D AI: „police dispatch console with microphone and three monitors“ | A |
| W3 | Pinnwand mit Karten und Fotos, Whiteboard auf Rollen | Besprechung (Pinnwand-Rätsel) | 3D AI; Zettel und Fäden malt das Spiel als Bild darauf | A |
| W4 | Aktenschrank, Regal mit Ordnern, Wanduhr | Büros, Keller (Ottos alte Akte) | Poly Haven „filing cabinet“, „shelf“, „wall clock“ | A |
| W5 | Bürostuhl, Kantinen-Tisch mit Stühlen, Kaffeemaschine, Tablett | Kantine | Poly Haven „coffee machine“, „chair“; `innen_tisch` | A |
| W6 | Umkleide: Bank, Spiegel, Kleiderhaken | Umkleide | `innen_spinde` + Poly Haven „bench“; Zahlenschloss bleibt eigene Form | A |
| W7 | Zelle mit Gittertür, Pritsche | Zelle (meist leer) | 3D AI: „friendly clean police holding cell with bench, bars“ | B |
| W8 | Werkstatt: Werkbank, Reifenstapel, Werkzeugwand, Wagenheber | Hof/Werkstatt | Poly Haven „workbench“, „tool“, „tyre“ | B |
| W9 | Hof: Müllcontainer, Fahrradständer, Tor, Fahnenmast | Hof | Poly Haven „dumpster“, „bike rack“; 3D AI | A |
| W10 | Das Wachen-Gebäude von außen (Backstein, Flachdach, blaues Schild) | Stadt | 3D AI: „small north german brick police station building, two floors, flat roof“ – Schild „Polizei“ malt das Spiel | A |
| W11 | Kleinkram: Funkgerät, Taschenlampe, Notizbuch, Dienstausweis, Kaffeebecher | Tasche, Großansicht | 3D AI je Stück, sehr klein (300–1.000 Dreiecke) | B |

### Stadt Möwenbrück: Altstadt, Markt, Sonnenhang

| # | Modell | Wo | Quelle / Suchwörter | Prio |
|---|---|---|---|---|
| S1 | Norddeutsche Giebelhäuser (Backstein, Treppengiebel), 3–4 Arten | Altstadt, Hafen | 3D AI: „north german brick gabled town house, stepped gable, 3 floors“ – das macht Möwenbrück erkennbar | A |
| S2 | Speicherhäuser am Hafen (hoch, Backstein, Ladeluken, Seilwinde) | Alter Hafen, Speicher 7 | 3D AI: „old brick harbour warehouse, hoist beam, loading doors“ | A |
| S3 | Stadtmuseum (Backstein mit Säulen, breite Treppe) | Altstadt | 3D AI | A |
| S4 | Kita mit buntem Zaun, Bäckerei mit Schaufenster und Markise | Sonnenhang (Fall 1) | 3D AI | A |
| S5 | Marktstände mit gestreiften Markisen, Obst- und Gemüsekisten, Käse, Fischbude | Marktplatz | `stand` aus Powershot; Poly Haven „crate“, „fruit“, „vegetables“ | A |
| S6 | Straßenmöbel: Poller, Parkbank, Fahrradständer, Hydrant, Briefkasten, Verkehrsschilder, Bushaltestelle, Litfaßsäule | überall | Poly Haven „bollard“, „bench“, „fire hydrant“, „road sign“; Schilder-Bild malt das Spiel | A |
| S7 | Ampel und Zebrastreifen-Schild | Kreuzungen | 3D AI oder Poly Haven „traffic light“ | B |
| S8 | Rathaus (Backstein-Gotik, Arkaden) und Glockenturm / Kirche | Altstadt, Fall 4 | 3D AI: „brick gothic town hall“, „brick church tower with open bell chamber“ | B |
| S9 | Eisdiele mit Tischen und Sonnenschirmen | Altstadt | `bistro`, `schirmtisch` aus Powershot | B |
| S10 | Schule, Supermarkt, Spielplatz (Rutsche, Schaukel, Sandkasten) | Sonnenhang | 3D AI; Spielplatz Poly Pizza „playground“ | B |
| S11 | Bäume: Linde, Kastanie, Kiefer am Deich, Hecken | überall | `baum_laub` aus Powershot; 3D AI für norddeutsche Arten | B |
| S12 | Bodenbilder: rotes Klinkerpflaster, Gehwegplatten, Holzbohlen (Steg), nasser Asphalt für die Nacht | Stadt, Hafen | ambientCG „PavingStones“, „Bricks“, „WoodFloor“ (CC0) | A |
| S13 | Himmel: Nordsee-Himmel Tag, Abendrot, Nacht mit Sternen | alle Außenorte | Poly Haven HDRI (CC0), stark verkleinert als Zylinder-Bild wie in Powershot | B |

### Stadtmuseum (Fall 1, nachts)

| # | Modell | Wo | Quelle / Suchwörter | Prio |
|---|---|---|---|---|
| M1 | Vitrinen (Glas mit Holzsockel), eine aufgebrochen | Saal | `innen_vitrine` aus Powershot; Kratzer malt das Spiel | A |
| M2 | Schiffsmodell auf Sockel (Hanse-Kogge) | Saal | 3D AI: „wooden model of a medieval cog ship on a pedestal“ | A |
| M3 | Großes Ölbild vom alten Hafen im Goldrahmen | Saal | Rahmen 3D AI, Bild selbst malen oder gemeinfreies Gemälde | A |
| M4 | Altes Buch (Gildenbuch), Schatulle mit Goldmünzen, Feder | Vitrinen, Spuren | 3D AI, sehr klein; Poly Haven „book“, „coins“ | A |
| M5 | Ritterrüstung, Anker, Steuerrad, Galionsfigur, Sitzbank | Saal (Schmuck) | Poly Haven / 3D AI | B |
| M6 | Fenster mit Riegel (Großansicht für das Rätsel) | Saal | eigene Form genügt, sonst 3D AI | C |

### Alter Hafen und Leuchtturminsel (Fall 2 und 4)

| # | Modell | Wo | Quelle / Suchwörter | Prio |
|---|---|---|---|---|
| H1 | Kaimauer, Holzsteg mit Pfählen, Poller zum Festmachen | Hafen | 3D AI; Poly Haven „mooring bollard“ | B |
| H2 | Hafenkran (alter Drehkran) | Werft | 3D AI oder Sketchfab „harbour crane“ (CC-BY) | B |
| H3 | Fischkisten, Fässer, Netze, Tauwerk, Bojen, Anker, Paletten, Hummerkörbe | überall am Wasser | Poly Haven „barrel“, „crate“, „pallet“, „rope“; Poly Pizza „buoy“, „anchor“ | B |
| H4 | Fischbude (Holzhütte mit Klappe) | Mole | 3D AI | B |
| H5 | Bootsschuppen (Holz, großes Tor zum Wasser) | Fall 2 Tag 4, Fall 4 Bootshaus | 3D AI | B |
| H6 | Leuchtturm (rot-weiß) mit Wärterhaus | Leuchtturminsel | 3D AI: „red and white lighthouse with small keeper house“; Lichtkegel macht das Spiel | B |
| H7 | Deich mit Schafen, Treppe, Damm zur Insel | Rand der Stadt | Gelände aus eigenen Formen, Schafe F13 | C |
| H8 | Flaschenzug, Seil, Holzgerüst | Fall 4 (Glockentausch) | 3D AI | C |
| H9 | Wachhaus der Seenotretter | Hafen, Fall 2 (Heins Alibi) | 3D AI | B |

### Bahnhof, Gewerbegebiet, andere Orte

| # | Modell | Wo | Quelle / Suchwörter | Prio |
|---|---|---|---|---|
| B1 | Schließfach-Wand (mit Fach 12) | Busbahnhof, Fall 1–3 | 3D AI: „metal luggage lockers wall, numbered doors“ – Nummern malt das Spiel | B |
| B2 | Bahnhofshalle / Busbahnhof mit Dach, Fahrplan-Tafel, Fundbüro-Schalter | Bahnhof | 3D AI | B |
| B3 | Lagerhalle mit Rolltor, Autowaschanlage | Gewerbegebiet, Fall 3 | 3D AI | B |
| B4 | Tresor, Telefon-Tisch mit Headsets (Anrufer-Büro) | Fall 3 Durchsuchung | 3D AI; Poly Haven „safe“ | B |
| B5 | Antiquariat innen (Bücherregale, Ladentheke), Gildehaus (Holzvertäfelung, Wappenschild erfunden) | Fall 1 Tag 2 | Poly Haven „bookshelf“; 3D AI | B |
| B6 | Stadtarchiv (Kartenschrank, Lesetisch, große Hafenkarte) | Fall 1 Tag 4 | 3D AI | B |
| B7 | Seniorenheim-Saal (Stühle, Rednerpult) | Fall 3 Tag 2 | `innen_stuehle`, `innen_podium` aus Powershot | B |
| B8 | Kims Wohnung: Bett, Wecker, Küchenzeile, Fernseher, Fenster mit Blick auf den Hafen | zwischen den Schichten | Poly Haven „bed“, „tv“, „kitchen“; `innen_sofa` | B |
| B9 | Glockengießerei (Werkstatt mit Gussform) und Bauernhof | Fall 4 Tag 2, Landstraße | 3D AI | C |
| B10 | Die Glocke von 1326 (Bronze, mit Inschrift innen) und ihre glatte Kopie | Fall 4 | 3D AI: „old bronze church bell, medieval“ – Inschrift als Bild innen, das Spiel tauscht nur das Bild | C |
| B11 | Bühne mit Lichterketten, Buden, Feuerwerk-Gestell | Lichterfest, Fall 4 Tag 5 | 3D AI; Lichter und Feuerwerk macht das Spiel | C |
| B12 | Rathaus-Saal mit Modell „Neuer Hafen“ (Architekturmodell auf Tisch) | Fall 4 Tag 4 | 3D AI | C |

## Was aus einfachen Formen bleibt

Straßen, Gehwege, Wände in Räumen, Böden (mit Bodenbildern), Blaulicht-Leuchten, Lichtkegel von Taschenlampe und Leuchtturm,
Schilder und Schriften (das Spiel malt sie, dann gibt es keine Rechtschreibfehler im Modell), Pinnwand-Zettel, Wasser.

## Reihenfolge zum Bauen

1. **Powershot-Modelle übernehmen** und den Lade-Baustein bauen (`js/modelle.js` nach dem Vorbild `gelaendemodelle.js`) – sofort ein großer Schritt, kostet kein Guthaben.
2. **A-Liste aus 3D AI Studio**: Figuren F1–F8, Streifenwagen V1, Wache W10, Giebelhäuser S1, Speicher S2, Museum S3, Kita/Bäckerei S4, Leitstelle W2, Pinnwand W3, Schiffsmodell M2. Etwa 18 Modelle.
3. **A-Liste von Poly Haven / ambientCG** (in einem Thread mit freigeschaltetem Netz): Straßenmöbel S6, Büro W1/W4/W5, Bodenbilder S12. Jedes mit `modell_klein.mjs` verkleinern, in `QUELLEN.md` eintragen.
4. Dann B, wenn Fall 2 und 3 gebaut werden; C mit Fall 4.

Nach jedem Schritt im Test-Browser ansehen (Tag und Nacht, PC und iPad-Format) und Dreiecke zählen.
