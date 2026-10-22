<!-- ERZEUGT von tools/bausteine.js aus der Bibliothek; nicht von Hand ändern (npm run bausteine) -->
# Bausteine

Was die Werkstatt an Requisiten, Figuren, Geräuschen und Funktionen anbietet, aus dem Code erzeugt. Ein Bild aller Requisiten: `npm run requisiten` → `lib/props/KATALOG.png`. Beispiele im Zusammenspiel: `szenen/DEMO-01-buero`, `szenen/MIMIK-01-buero`.

## Requisiten

Im Code `requisite(name).markup(id, pos, farben, opts)`; `pos` ist der Bezugspunkt in Weltkoordinaten (Beschreibung). `opts.massstab` skaliert um den Bezugspunkt, Anker und Rahmen rechnen mit. Bewegliche Teile setzt `sceneApply` über ihre ID und das genannte Attribut; ihre Koordinaten gelten im Rahmen der Requisite. Größe aus `rahmen()` bei Maßstab 1, in px.

| Name | Gruppe | Beschreibung, Bezugspunkt | Größe | bewegliche Teile (Attribute) | Anker |
|---|---|---|---|---|---|
| `ablagekasten` | buero | Ablagekasten; pos = Mitte unten. | 168 × 72 | – | einlage |
| `akte` | buero | Akte mit Reiter; pos = Mitte unten. | 112 × 144 | – | griff |
| `aufprall` | zeichen | Aufprall: acht Strahlen um pos. | 120 × 120 | – | mitte |
| `bewegungslinien` | zeichen | Bewegungslinien hinter einem bewegten Ding; pos = vorderes Ende, die Linien laufen nach links. | 96 × 64 | – | vorn |
| `blatt` | buero | Blatt; pos = Mitte. Die ganze Gruppe <id> wird bewegt, gedreht, gestaucht. | 88 × 112 | – | mitte, griff |
| `bruchmarke` | zeichen | Bruchmarke; pos = Mitte. | 72 × 96 | – | mitte |
| `buerostuhl` | moebel | Bürostuhl im Profil; pos = Mitte der Sitzfläche oben. Lehne hinter der Blickrichtung dir. | 160 × 312 | – | sitz |
| `drucker` | geraete | Drucker; pos = Mitte unten. Papierfach <id>-fach, Ausgabe <id>-ausgabe, Licht <id>-licht. | 212 × 144 | <id>-fach (transform); <id>-ausgabe (transform); <id>-licht (transform, opacity) | ausgabe, einzug |
| `formular` | buero | Formular mit drei Feldern; pos = Mitte. Je Feld eine Gruppe <id>-feldN in der Kästchenmitte für einen Haken. | 152 × 192 | <id>-feld1 (transform); <id>-feld2 (transform); <id>-feld3 (transform) | feld1, feld2, feld3 |
| `haken` | zeichen | Haken; pos = Mitte. <id>-strich trägt pathLength 1: stroke-dashoffset 1 → 0 zeichnet ihn. | 82 × 72 | – | mitte |
| `haus` | aussen | Haus; pos = Mitte unten. | 336 × 352 | – | tuer, first |
| `kabel` | geraete | Kabel durch punkte (relativ zu pos) mit einem Puls <id>-puls, den die Szene mit entlang() bewegt. anker.punkte liefert die Weltpunkte für entlang(). | 192 × 120 | <id>-puls (transform, opacity) | punkte |
| `kalender` | buero | Wandkalender; pos = Nagel oben. Das Blatt <id>-blatt lässt sich umblättern. Zahlen setzt die Szene. | 132 × 152 | <id>-blatt (transform) | kopf, feld |
| `maus` | geraete | Maus; pos = Mitte unten. Die Taste senkt sich über <id>-taste (Klick). | 88 × 48 | <id>-taste (transform) | oben |
| `monitor` | geraete | Monitor; pos = Mitte des Fußes auf der Tischplatte. Bildinhalt in der Gruppe <id>-bild (Mitte des Schirms). | 252 × 232 | <id>-bild (transform); <id>-leuchte (transform, opacity) | bildMitte, bildGroesse |
| `pfeil` | zeichen | Pfeil; pos = Anfang. laenge in px, winkel in Grad (0 = nach rechts, im Uhrzeigersinn). | 152 × 64 | – | spitze |
| `regal` | moebel | Regal; pos = Mitte unten auf dem Boden. | 272 × 392 | – | fach1, fach2 |
| `schrank` | moebel | Schrank; pos = Mitte unten auf dem Boden. | 232 × 432 | – | griffL, griffR |
| `schreibtisch` | moebel | Schreibtisch; pos = Mitte der Tischoberkante. Schublade beweglich. | 472 × 232 | <id>-schublade (transform) | platte, links, rechts |
| `stapel` | buero | Stapel Papier von der Seite; pos = Mitte unten. anzahl Blätter. | 96 × 80 | – | oben |
| `stempel` | buero | Stempel; pos = Mitte der Stempelfläche unten. Die ganze Gruppe wird bewegt. | 84 × 98 | – | griff, flaeche |
| `strasse` | aussen | Straße als Band; pos = linkes Ende auf der Mittellinie. | 352 × 112 | – | links, rechts |
| `tastatur` | geraete | Tastatur; pos = Mitte unten auf der Tischplatte. Tasten senken sich über <id>-tasten. | 192 × 48 | <id>-tasten (transform) | tasten, links, rechts |
| `telefon` | geraete | Telefon; pos = Mitte unten. Hörer <id>-hoerer hebt sich beim Abnehmen. | 144 × 92 | <id>-hoerer (transform) | hoerer |
| `tresen` | aussen | Tresen; pos = Mitte der Oberkante. | 392 × 232 | – | platte, links |
| `tuer` | moebel | Tür mit Zarge; pos = Mitte unten. Der Flügel öffnet über transform an der Angel links (x −70). | 192 × 332 | <id>-fluegel (transform) | klinke, angel |
| `wegweiser` | aussen | Wegweiser mit zwei Schildern; pos = Fuß des Pfostens. Schilder als <id>-schild1 (rechts), <id>-schild2 (links). | 288 × 272 | <id>-schild1 (transform); <id>-schild2 (transform) | schild1, schild2 |
| `wolke` | aussen | Wolke; pos = Mitte. Die Szene lässt sie über <id> treiben. | 208 × 132 | – | mitte |

## Figuren

Funktionen jedes Rigs: `markup(prefix, { teilesatz, palette, dir, massstab, mimik })`, `apply(prefix, zustand)`, `gelenke(zustand)` (Weltpunkte), `greife(zustand, arm, ziel)`, `fuss(zustand, bein, ziel)`, `pruefeReichweite(zustand)`. `kopf` ist die Kopfmitte. Handformen: offen, greifend, zeigend. Einzelheiten in `docs/FIGUREN.md`.

| Archetyp | Ansicht | Maßstab | Segmente (px) | Punkte in gelenke() | Posen |
|---|---|---|---|---|---|
| `sitzend-profil` | profil | 1 | rumpf 130, oberarm 90, unterarm 90, oberschenkel 102, unterschenkel 98, knoechel 10 | schulter, nacken, kopf, huefte, armF, armB, legF, legB | – |
| `stehend-profil` | profil | 1 | rumpf 130, oberarm 90, unterarm 90, oberschenkel 102, unterschenkel 98, knoechel 10 | schulter, nacken, kopf, huefte, armF, armB, legF, legB | – |
| `stehend-frontal` | frontal | 1 | rumpf 130, oberarm 90, unterarm 90, oberschenkel 102, unterschenkel 98, knoechel 10 | nacken, kopf, huefte, armL, armR, legL, legR | ruhe, halten, zeigenR, erklaeren |
| `oberkoerper-nah` | profil | 1.8 | rumpf 130, oberarm 90, unterarm 90 | schulter, nacken, kopf, huefte, armF, armB | – |

## Geräusche

219 Cues im Katalog, 219 mit fertigem Klang in `lib/sfx/final/`. Im Brief unter `sfx.ereignisse` ordnet ein Ereignistyp einen Cue zu; erlaubt sind die Typen in der Spalte „Ereignisse“. Laute setzt der Brief unter `sfx.laute` an einen Beat. Einzelheiten in `docs/GERAEUSCHE.md`.

| Cue | Art | Ereignisse | Dauer (s) | Pegel (dB) | Eigenschaften | Klang |
|---|---|---|---|---|---|---|
| `aktenvernichter` | sfx | geraet | 1.5 | -29 | – | ja |
| `ampel-ticken` | sfx | geraet | 2 | -33 | loop | ja |
| `atmen-ruhig` | sfx | geraet | 2 | -34 | – | ja |
| `aufruf-ton` | sfx | erscheinen | 1 | -27 | nachklang | ja |
| `aufsetzen-weich` | sfx | aufsetzen, ankunft, aufprall | 0.4 | -28 | einzel | 3 Varianten |
| `aufspringen` | sfx | erscheinen | 0.3 | -30 | einzel | ja |
| `aufzug-ankunft` | sfx | erscheinen, ankunft | 0.8 | -27 | nachklang | ja |
| `aufzug-tueren` | sfx | aufbruch | 1.2 | -30 | – | ja |
| `autotuer-auf` | sfx | aufbruch | 0.6 | -29 | – | ja |
| `autotuer-zu` | sfx | ankunft | 0.6 | -27 | einzel | ja |
| `baustelle-fern` | sfx | geraet | 3 | -40 | loop | ja |
| `beamer` | sfx | geraet | 2 | -36 | loop | ja |
| `benachrichtigung` | sfx | erscheinen | 0.5 | -27 | nachklang | ja |
| `bestaetigung` | sfx | erscheinen | 0.6 | -26 | nachklang | ja |
| `besteck` | sfx | aufsetzen | 0.4 | -29 | einzel | ja |
| `bettdecke` | sfx | geraet | 1 | -32 | – | ja |
| `blatt-flattern` | sfx | abheben | 0.8 | -31 | – | ja |
| `blatt-wischen` | sfx | abheben, aufbruch | 0.4 | -31 | – | ja |
| `bohrer` | sfx | geraet | 1.5 | -29 | – | ja |
| `briefkasten` | sfx | ankunft | 0.6 | -28 | – | ja |
| `buch-aufschlagen` | sfx | aufbruch | 0.6 | -30 | – | ja |
| `buch-zuklappen` | sfx | ankunft, aufsetzen | 0.4 | -27 | einzel | ja |
| `bueroklammer` | sfx | aufprall | 0.3 | -31 | einzel | ja |
| `bus-haelt` | sfx | ankunft | 1.5 | -30 | – | ja |
| `bus-tueren` | sfx | aufbruch | 1.2 | -29 | – | ja |
| `dampf` | sfx | geraet | 0.8 | -30 | – | ja |
| `donner-fern` | sfx | geraet | 2.5 | -32 | nachklang | ja |
| `doppelklick` | sfx | klick | 0.3 | -25 | – | ja |
| `drucker-hakt` | sfx | geraet | 1.2 | -29 | – | ja |
| `drucker-laeuft` | sfx | geraet | 2 | -31 | loop | ja |
| `drucker-start` | sfx | geraet | 2 | -28 | – | ja |
| `druckluft` | sfx | erscheinen | 0.5 | -30 | – | ja |
| `enter-taste` | sfx | anschlag | 0.3 | -25 | einzel | 2 Varianten |
| `etikettendrucker` | sfx | geraet, ausgabe | 1.5 | -30 | – | ja |
| `fahrrad-rollen` | sfx | geraet | 2 | -31 | loop | ja |
| `fahrradklingel` | sfx | erscheinen | 0.8 | -27 | nachklang | ja |
| `fahrzeug` | sfx | aufbruch | 2.5 | -32 | – | ja |
| `fehler-ton` | sfx | erscheinen | 0.5 | -27 | nachklang | ja |
| `fenster-oeffnen` | sfx | aufbruch | 1 | -30 | – | ja |
| `fingerschnippen` | sfx | klick | 0.2 | -27 | einzel | ja |
| `flasche-oeffnen` | sfx | aufbruch | 0.6 | -29 | – | ja |
| `flipchart` | sfx | aufbruch | 0.8 | -29 | – | ja |
| `gartentor` | sfx | aufbruch | 1 | -29 | – | ja |
| `geldscheine` | sfx | geraet | 1 | -30 | – | ja |
| `glaeser-anstossen` | sfx | anschlag | 0.6 | -28 | nachklang | ja |
| `glas-abstellen` | sfx | aufsetzen | 0.4 | -28 | einzel | ja |
| `haende-reiben` | sfx | geraet | 0.8 | -31 | – | ja |
| `haken-setzen` | sfx | anschlag, erscheinen | 0.3 | -28 | einzel | ja |
| `hammer` | sfx | anschlag | 0.4 | -26 | einzel | 3 Varianten |
| `handy-tippen` | sfx | anschlag | 0.2 | -30 | einzel | 3 Varianten |
| `handy-vibration` | sfx | geraet | 0.8 | -28 | – | ja |
| `hefter` | sfx | anschlag, stempel | 0.3 | -26 | einzel | ja |
| `herzschlag` | sfx | geraet | 2 | -32 | loop | ja |
| `hund-fern` | sfx | erscheinen | 1 | -32 | – | ja |
| `jacke-anziehen` | sfx | geraet | 1 | -31 | – | ja |
| `kabel-ziehen` | sfx | aufbruch | 0.3 | -29 | einzel | ja |
| `kaffee-einschenken` | sfx | geraet | 1.5 | -30 | – | ja |
| `kaffeemaschine` | sfx | geraet | 3 | -30 | – | ja |
| `kalenderblatt` | sfx | aufbruch | 0.5 | -29 | – | ja |
| `kamera-ausloeser` | sfx | klick | 0.3 | -27 | einzel | ja |
| `karte-bezahlen` | sfx | erscheinen | 0.4 | -28 | nachklang | ja |
| `karton-abstellen` | sfx | aufsetzen, ankunft | 0.5 | -27 | einzel | ja |
| `karton-oeffnen` | sfx | aufbruch | 0.8 | -29 | – | ja |
| `kasse` | sfx | aufbruch | 0.8 | -28 | nachklang | ja |
| `kassenbon` | sfx | geraet, ausgabe | 1.2 | -30 | – | ja |
| `katze` | sfx | erscheinen | 0.8 | -30 | – | ja |
| `klappe` | sfx | ankunft, aufprall | 0.3 | -28 | einzel | ja |
| `klatschen-einmal` | sfx | anschlag | 0.3 | -27 | einzel | ja |
| `klebeband-abreissen` | sfx | aufbruch | 0.8 | -29 | – | ja |
| `kleidung-rascheln` | sfx | aufbruch | 0.6 | -34 | – | ja |
| `klemmbrett` | sfx | anschlag | 0.3 | -29 | einzel | ja |
| `klettverschluss` | sfx | aufbruch | 0.5 | -29 | – | ja |
| `klimaanlage` | sfx | geraet | 2 | -38 | loop | ja |
| `kopierer` | sfx | geraet | 2.5 | -30 | – | ja |
| `kreide-tafel` | sfx | geraet | 1.2 | -30 | – | ja |
| `kuehlschrank` | sfx | aufbruch | 0.8 | -30 | – | ja |
| `laptop-aufklappen` | sfx | aufbruch | 0.6 | -30 | – | ja |
| `laptop-zuklappen` | sfx | ankunft | 0.5 | -28 | einzel | ja |
| `laut-beeindruckt` | laut | Laut (Beat) | 0.8 | -20 | – | ja |
| `laut-erleichtert` | laut | Laut (Beat) | 0.8 | -20 | – | ja |
| `laut-erschoepft` | laut | Laut (Beat) | 0.9 | -20 | – | ja |
| `laut-erstaunt` | laut | Laut (Beat) | 0.8 | -20 | – | ja |
| `laut-fragend` | laut | Laut (Beat) | 0.9 | -20 | – | ja |
| `laut-nachdenklich` | laut | Laut (Beat) | 0.9 | -20 | – | ja |
| `laut-zoegernd` | laut | Laut (Beat) | 0.8 | -20 | – | ja |
| `laut-zustimmend` | laut | Laut (Beat) | 0.8 | -20 | – | ja |
| `leertaste` | sfx | anschlag | 0.3 | -26 | einzel | 2 Varianten |
| `lichtschalter-zug` | sfx | klick | 0.3 | -29 | einzel | ja |
| `locher` | sfx | anschlag, stempel | 0.4 | -26 | einzel | ja |
| `loeffel-ruehren` | sfx | geraet | 1.2 | -31 | – | ja |
| `magnet` | sfx | ankunft | 0.3 | -29 | einzel | ja |
| `massband` | sfx | ankunft | 0.6 | -29 | – | ja |
| `maus-klick` | sfx | klick | 0.2 | -24 | einzel | 3 Varianten |
| `maus-scrollen` | sfx | geraet | 0.8 | -30 | – | ja |
| `mikrowelle` | sfx | erscheinen | 1.2 | -29 | nachklang | ja |
| `monitor-an` | sfx | erscheinen | 0.5 | -30 | – | ja |
| `motor-leerlauf` | sfx | geraet | 2 | -33 | loop | ja |
| `motor-start` | sfx | aufbruch | 2 | -30 | – | ja |
| `motor-surren` | sfx | aufbruch | 1 | -30 | – | ja |
| `muenze` | sfx | aufprall, aufsetzen | 0.8 | -28 | nachklang | ja |
| `muenzen-zaehlen` | sfx | geraet | 1.2 | -29 | – | ja |
| `nachricht-gesendet` | sfx | erscheinen, abheben | 0.4 | -28 | – | ja |
| `neonlicht` | sfx | erscheinen | 1.2 | -31 | – | ja |
| `ordner-auf` | sfx | klick, aufbruch | 0.4 | -27 | einzel | ja |
| `ordner-zu` | sfx | klick, ankunft | 0.4 | -27 | einzel | ja |
| `paketband` | sfx | geraet | 1 | -29 | – | ja |
| `papier-ablegen` | sfx | ankunft, aufsetzen | 0.5 | -30 | einzel | ja |
| `papier-falten` | sfx | ankunft | 0.6 | -30 | – | ja |
| `papier-knuellen` | sfx | geraet | 1 | -28 | – | ja |
| `papier-raus` | sfx | ausgabe | 0.8 | -28 | – | ja |
| `papier-reissen` | sfx | aufbruch | 0.7 | -28 | – | ja |
| `papiertuete` | sfx | geraet | 0.8 | -30 | – | ja |
| `park` | sfx | geraet | 3 | -40 | loop | ja |
| `piepen-geraet` | sfx | erscheinen | 0.3 | -29 | einzel | ja |
| `pinnwand` | sfx | anschlag | 0.3 | -30 | einzel | ja |
| `plastiktuete` | sfx | geraet | 0.8 | -31 | – | ja |
| `pling-leise` | sfx | erscheinen | 0.4 | -30 | nachklang | ja |
| `radiergummi` | sfx | geraet | 0.8 | -31 | – | ja |
| `raumton-buero` | sfx | geraet | 3 | -40 | loop | ja |
| `rechner-luefter` | sfx | geraet | 2 | -38 | loop | ja |
| `regen` | sfx | geraet | 3 | -36 | loop | ja |
| `regenschirm` | sfx | aufbruch | 0.8 | -29 | – | ja |
| `reissverschluss` | sfx | aufbruch | 0.5 | -29 | – | ja |
| `relais-klick` | sfx | klick | 0.2 | -29 | einzel | ja |
| `rollen` | sfx | aufbruch | 1 | -30 | loop | ja |
| `rollladen` | sfx | aufbruch | 1.5 | -30 | – | ja |
| `saege` | sfx | geraet | 1.5 | -30 | – | ja |
| `scanner` | sfx | geraet | 2.5 | -30 | – | ja |
| `scanner-piep` | sfx | erscheinen | 0.3 | -28 | einzel | ja |
| `schalter` | sfx | klick | 0.2 | -26 | einzel | ja |
| `schalterglocke` | sfx | anschlag | 0.8 | -27 | nachklang | ja |
| `scherbe` | sfx | aufprall | 0.5 | -30 | nachklang | ja |
| `schere` | sfx | geraet | 0.6 | -29 | – | ja |
| `schluessel-ablegen` | sfx | aufprall, aufsetzen | 0.6 | -28 | nachklang | ja |
| `schluessel-schloss` | sfx | klick | 0.8 | -28 | – | ja |
| `schluesselbund` | sfx | aufbruch, aufsetzen | 0.8 | -28 | nachklang | ja |
| `schraubenzieher` | sfx | geraet | 1 | -30 | – | ja |
| `schritt` | sfx | schritt | 0.4 | -28 | einzel | 6 Varianten |
| `schritt-absatz` | sfx | schritt | 0.4 | -28 | einzel | 6 Varianten |
| `schritt-fliesen` | sfx | schritt | 0.4 | -28 | einzel | 6 Varianten |
| `schritt-gras` | sfx | schritt | 0.4 | -30 | einzel | 6 Varianten |
| `schritt-holz` | sfx | schritt | 0.4 | -28 | einzel | 6 Varianten |
| `schritt-kies` | sfx | schritt | 0.4 | -28 | einzel | 6 Varianten |
| `schritt-strasse` | sfx | schritt | 0.4 | -28 | einzel | 6 Varianten |
| `schublade-holz-auf` | sfx | aufbruch | 0.8 | -29 | – | ja |
| `schublade-holz-zu` | sfx | ankunft | 0.6 | -28 | – | ja |
| `schublade-metall-auf` | sfx | aufbruch | 1 | -28 | – | ja |
| `schublade-metall-zu` | sfx | ankunft | 0.8 | -27 | – | ja |
| `schulglocke-fern` | sfx | erscheinen | 2 | -32 | nachklang | ja |
| `schulranzen` | sfx | aufbruch, aufsetzen | 1 | -30 | – | ja |
| `seil-ruck` | sfx | aufprall, klick | 0.4 | -28 | einzel | ja |
| `seiten-blaettern` | sfx | geraet | 1.2 | -30 | – | ja |
| `servo` | sfx | aufbruch | 1 | -30 | – | ja |
| `sofa-setzen` | sfx | aufsetzen | 0.6 | -30 | einzel | ja |
| `stapel-ablegen` | sfx | aufsetzen, ankunft | 0.6 | -28 | einzel | ja |
| `stapel-schieben` | sfx | aufbruch | 0.8 | -30 | – | ja |
| `staubsauger` | sfx | geraet | 2 | -36 | loop | ja |
| `stecker` | sfx | klick, ankunft | 0.3 | -28 | einzel | ja |
| `stempel` | sfx | stempel, anschlag | 0.4 | -24 | einzel | 2 Varianten |
| `stempelkissen` | sfx | anschlag | 0.3 | -30 | einzel | ja |
| `stift-aufsetzen` | sfx | anschlag | 0.2 | -30 | einzel | 3 Varianten |
| `stift-klick` | sfx | klick | 0.2 | -27 | einzel | 3 Varianten |
| `stift-schreiben` | sfx | geraet | 1.5 | -30 | loop | ja |
| `stoppuhr` | sfx | klick | 0.2 | -27 | einzel | ja |
| `strassenbahn` | sfx | aufbruch | 3 | -32 | – | ja |
| `stuhl-aufstehen` | sfx | aufbruch | 0.6 | -30 | – | ja |
| `stuhl-drehen` | sfx | aufbruch | 0.8 | -31 | – | ja |
| `stuhl-ruecken` | sfx | aufbruch | 0.6 | -29 | – | ja |
| `stuhl-setzen` | sfx | aufsetzen | 0.6 | -29 | einzel | ja |
| `summen` | sfx | geraet | 2 | -36 | loop | ja |
| `tasse-abstellen` | sfx | aufsetzen, ankunft | 0.4 | -28 | einzel | 2 Varianten |
| `tastatur-leise` | sfx | anschlag | 0.25 | -28 | einzel | 8 Varianten |
| `tastenanschlag` | sfx | anschlag | 0.3 | -26 | einzel | 8 Varianten |
| `telefon-abheben` | sfx | aufbruch | 0.4 | -28 | einzel | ja |
| `telefon-auflegen` | sfx | ankunft | 0.4 | -27 | einzel | ja |
| `telefon-klingeln` | sfx | geraet | 1.2 | -26 | nachklang | ja |
| `telefon-waehlen` | sfx | geraet | 1 | -30 | – | ja |
| `teller-abstellen` | sfx | aufsetzen | 0.4 | -28 | einzel | ja |
| `textmarker` | sfx | geraet | 0.6 | -30 | – | ja |
| `tippen-folge` | sfx | geraet | 2 | -30 | loop | ja |
| `tisch-klopfen` | sfx | anschlag | 0.3 | -27 | einzel | 3 Varianten |
| `toaster` | sfx | erscheinen | 0.6 | -28 | einzel | ja |
| `tuer-auf` | sfx | aufbruch | 1 | -28 | – | ja |
| `tuer-klopfen` | sfx | anschlag | 0.3 | -26 | einzel | 4 Varianten |
| `tuer-knarren` | sfx | aufbruch | 1.2 | -29 | – | ja |
| `tuer-zu` | sfx | ankunft | 0.8 | -28 | – | ja |
| `tuerklinke` | sfx | klick | 0.4 | -28 | einzel | ja |
| `uhr-ticken` | sfx | geraet | 2 | -32 | loop | ja |
| `ui-klick` | sfx | klick | 0.2 | -28 | einzel | 3 Varianten |
| `ui-pop` | sfx | erscheinen | 0.3 | -29 | einzel | ja |
| `ui-schliessen` | sfx | ankunft | 0.3 | -30 | – | ja |
| `ui-umschalten` | sfx | klick | 0.2 | -28 | einzel | ja |
| `umblaettern` | sfx | abheben | 0.6 | -30 | einzel | 2 Varianten |
| `umschlag-oeffnen` | sfx | aufbruch | 0.8 | -29 | – | ja |
| `umschlag-schliessen` | sfx | ankunft | 0.4 | -31 | einzel | ja |
| `unterschrift` | sfx | geraet | 1.2 | -29 | – | ja |
| `usb-stecker` | sfx | klick, ankunft | 0.3 | -28 | einzel | ja |
| `verkehr-stadt` | sfx | geraet | 3 | -40 | loop | ja |
| `vogel` | sfx | erscheinen | 0.8 | -32 | – | ja |
| `vorhang` | sfx | aufbruch | 1 | -30 | – | ja |
| `waage-kippen` | sfx | ankunft | 0.6 | -28 | – | ja |
| `wartemarke` | sfx | ausgabe | 0.8 | -29 | – | ja |
| `waschmaschine` | sfx | geraet | 3 | -38 | loop | ja |
| `wasser-einschenken` | sfx | geraet | 1.2 | -30 | – | ja |
| `wasserhahn` | sfx | geraet | 1.5 | -30 | – | ja |
| `wasserkocher` | sfx | geraet | 3 | -31 | – | ja |
| `wasserspender` | sfx | geraet | 1.5 | -30 | – | ja |
| `wecker` | sfx | geraet | 1 | -28 | – | ja |
| `werkzeug-ablegen` | sfx | aufsetzen | 0.4 | -28 | einzel | ja |
| `whiteboard-stift` | sfx | geraet | 1.2 | -30 | – | ja |
| `whiteboard-wischen` | sfx | geraet | 1 | -31 | – | ja |
| `whoosh-kurz` | sfx | abheben | 0.5 | -30 | – | ja |
| `whoosh-schnell` | sfx | abheben | 0.4 | -30 | – | ja |
| `whoosh-tief` | sfx | abheben | 0.8 | -31 | – | ja |
| `whoosh-weich` | sfx | abheben | 0.8 | -30 | – | ja |
| `wind` | sfx | geraet | 3 | -38 | loop | ja |
| `zaehler-tick` | sfx | klick, anschlag | 0.2 | -29 | einzel | 4 Varianten |
| `zahnrad` | sfx | geraet | 1.5 | -32 | loop | ja |
| `zollstock` | sfx | aufbruch | 0.8 | -30 | – | ja |

### Ereignistypen

| Typ | Erkennung |
|---|---|
| `anschlag` | tiefpunkt |
| `stempel` | tiefpunkt |
| `klick` | beginn |
| `schritt` | nulldurchgang |
| `abheben` | bewegung_start |
| `ausgabe` | bewegung_start |
| `aufbruch` | bewegung_start |
| `ankunft` | bewegung_ende |
| `aufsetzen` | bewegung_ende |
| `aufprall` | aufprall |
| `geraet` | huellkurve |
| `erscheinen` | schwelle_auf |

## Erlaubte Werte im Brief

- `charakter.haltung`: `aufrecht`, `konzentriert`, `gebeugt`, `zurueckgelehnt` oder `null`
- `gefuehlsbogen` einer Figur und `gefuehl` eines Beats: `neutral`, `konzentriert`, `genervt`, `ueberrascht`, `erleichtert`, `stolz`, `ratlos`, `ungeduldig`, `freude`, `zweifel`, `aerger`, `muede`, `staunen`
- `mimik` einer Figur: `an` oder `aus`; Ausdrücke der Mimik: `neutral`, `konzentriert`, `freude`, `erleichtert`, `staunen`, `zweifel`, `aerger`, `muede`
- `sichtung.<punkt>`: `ok` oder `offen`
- `blick`: `rechts` oder `links`; der Film heißt in der ID groß, in Dateinamen klein

## Funktionen der Bibliothek

Signatur und erster Satz des Kommentars; Zeit `t` in Sekunden, Winkel in Grad, Koordinaten in px.

### `lib/easing.js`

| Name | Parameter | Zweck |
|---|---|---|
| `linear` | `x` | Gleichförmig, ohne Beschleunigung. |
| `easeIn` | `x` | Langsam anfahren, schnell ankommen (kubisch). |
| `easeOut` | `x` | Schnell anfahren, langsam ankommen (kubisch). |
| `inOut` | `x` | Langsam anfahren und ankommen (kubisch), die übliche Kurve zwischen zwei Posen. |
| `anticipate` | `x` | Anlauf: erst 8 % zurück, dann zum Ziel. |
| `overshoot` | `x` | Überschwingen: 12 % hinaus, dann ruhig zurück. |
| `settle` | `x` | Gedämpfte Nachschwingung in 2,5 Perioden, endet genau bei 1. |
| `snap` | `x, anteil = SNAP_ANTEIL` | Pose zu Pose: verweilen, in der Mitte des Intervalls wechseln, verweilen. |
| `snapBei` | `t, tWechsel, bilder = 6, fps = 30` | Wechsel in 6 Bildern um tWechsel: für Pose-zu-Pose an einem festen Zeitpunkt. |
| `movingHold` | `t, amp = 1.5, phase = 0` | Drift in Haltepausen: 1 bis 2 px aus zwei unharmonischen Sinus, damit nichts länger als eine Sekunde völlig still steht. |
| `KURVEN` | – | Die Kurven nach Namen, für Schlüssel in geometry.js. |

### `lib/motion.js`

| Name | Parameter | Zweck |
|---|---|---|
| `DOPPELSCHRITT_PX` | – | Strecke eines Doppelschritts in px bei massstab 1. |
| `interp` | `t, zeiten, werte, ease = linear` | Wie Remotions interpolate() mit clamp an beiden Enden; auch mit mehr als zwei Stützstellen. |
| `schluessel` | `t, posen, ease = inOut` | Schlüsselposen [t, x, y] zu einem Punkt, je Abschnitt mit inOut verbunden. |
| `envelope` | `t, [an0, an1, ab0, ab1], ease = inOut` | Hüllkurve über [an0, an1, ab0, ab1]: steigt 0→1, hält, fällt 1→0. |
| `pulse` | `t, mitte, breite` | Kurzer Puls um mitte mit voller Breite breite: 0 → 1 → 0. |
| `bezier2` | `p0, p1, p2, s` | Quadratische Bézierbahn: Punkt bei s in [0, 1]. |
| `entlang` | `punkte, s` | Punkt auf einer Polylinie bei s in [0, 1] nach Bogenlänge. |
| `richtung` | `a` | Richtung eines Glieds mit Winkel a. |
| `winkelZu` | `p, q` | Winkel des Vektors von p nach q im Gliederrahmen. |
| `fk` | `ursprung, laengen, winkel` | Vorwärtskinematik: Punkte einer Kette ab ursprung mit absoluten Winkeln. |
| `ik` | `schulter, ziel, oberarm, unterarm, beugeseite = -1` | Zweigliedrige IK im Figurenrahmen. |
| `GANG_MASSE` | – | Maße für den Gang, je Figur; eine Figur mit eigenem Maß übergibt ihre eigenen. |
| `walkCycle` | `phase, an = 1, { schritt = 24, knie = 34, arm = 16, fig = GANG_MASSE } = {}` | Gang als Funktion der Phase (1 = ein Doppelschritt). |
| `gangPhase` | `strecke, massstab = 1` | Phase des Gangs nach zurückgelegter Strecke in px. |
| `umblenden` | `t, [t0, t1]` | Wechsel zweier Fassungen (Aufstehen, Setzen): Gewicht der zweiten Fassung, 0 vor wechsel[0], 1 nach wechsel[1], dazwischen in wenigen Bildern. |
| `haengend` | `elternGeschwindigkeit, traegheit = 0.15, grenze = 25` | Hängendes Glied: zeigt unabhängig vom Elternwinkel nach unten, mit leichter Nachschwingung, wenn der Eltern sich bewegt. |
| `summe` | `...teile` | Summe von Teilwerten (Gefühlsrezepte, Haltungen): addiert Zahlen, auch verschachtelt. |

### `lib/spielweise.js`

| Name | Parameter | Zweck |
|---|---|---|
| `TEMPO_GRENZEN` | – | Grenzen der Charakterkarte. |
| `charakter` | `{ tempo = 1, haltung = null, reaktion = 0.8, tick = null } = {}` | Charakterkarte zu Parametern. |
| `dauer` | `sekunden, karte` | Beat-Dauer nach dem Tempo der Figur. |
| `HALTUNGEN` | – | Grundhaltungen in Ruhe. |
| `GEFUEHLE` | – | Gefühle, die ein Brief einer Figur (gefuehlsbogen) und einem Beat (gefuehl) zuschreiben darf. |
| `atmen` | `t, tempo = 1, phase = 0` | Atmen: ruhige Bewegung von Rumpf und Schulter, Periode etwa 4 s. |
| `konzentriert` | `t, staerke = 1` | Konzentriert: Vorneigung, kleine gleichmäßige Amplitude. |
| `genervt` | `t, t0, reaktion = 0.8` | Genervt: Pause vor der Aktion, Schultern hoch, kurzer Kopfschlag bei t0. |
| `ueberrascht` | `t, t0, reaktion = 0.8, dauerS = 0.5` | Überrascht: Anlauf nach hinten, Kopf zurück, Hände hoch, dann Halt. |
| `erleichtert` | `t, t0, reaktion = 0.8, dauerS = 1.2` | Erleichtert: Schultern sinken langsam, Nachschwingen. |
| `stolz` | `t, t0, reaktion = 0.8, dauerS = 0.6` | Stolz: aufrecht, Kopf hoch, Überschwingen beim Aufrichten. |
| `ratlos` | `t, t0, t1, reaktion = 0.8` | Ratlos: Kopf pendelt zwischen zwei Zielen, Hand hebt und senkt sich halb. |
| `tippen` | `t, [t0, t1], frequenz = 5, hub = 6, phase = 0` | Tippen: Hand senkt sich je Anschlag; frequenz in Anschlägen je Sekunde. |
| `fussWippen` | `t, frequenz = 1.6, amp = 8` | Fußwippen als Tick: Zehen heben und senken sich. |

### `lib/posen.js`

| Name | Parameter | Zweck |
|---|---|---|
| `spurWert` | `spur, t, i = 1, ease = inOut` | Wert einer Spur bei t; Spalte i der Schlüssel (1 = erster Wert nach t). |
| `spurStufe` | `spur, t` | Stufenwert: der letzte Schlüssel mit k[0] ≤ t, sonst der erste. |
| `posenZustand` | `r, P, t, basis = {}` | Zustand des Rigs r bei t aus den Schlüsselposen P. |

### `lib/mimik.js`

| Name | Parameter | Zweck |
|---|---|---|
| `NEUTRAL` | – |  |
| `AUSDRUECKE` | – |  |
| `gesicht` | `a = 'neutral'` | Vollständiges Gesicht aus einem Namen oder einem Teilobjekt; ein unbekannter Name hält an. |
| `mische` | `a, b, u` | Zwei Gesichter mischen, u = 0 ergibt a, u = 1 ergibt b. |
| `mimikZustand` | `schluessel, t, ease = inOut` | Gesicht bei t aus Schlüsseln [[t, ausdruck], …] (Name oder Teilobjekt), verbunden mit inOut; das Format, das der Mimik-Editor ausgibt. |
| `BLINZELN` | – |  |
| `blinzeln` | `t, seed, { extra = [], ...o } = {}` | Lidschluss durch Blinzeln bei t, 0 … 1. |
| `mitBlinzeln` | `g, b` | Gesicht mit Blinzeln: das Lid schließt vom gegebenen Wert aus ganz. |
| `AUGE_R` | – |  |
| `gesichtMarkup` | `P, ansicht, anker` | Markup des Gesichts für Figur P; liegt in der Kopfgruppe. |
| `gesichtApply` | `P, g, ansicht` | Liste [id, attribut, wert] für das Gesicht g (vollständig, siehe gesicht()). |

### `lib/svg.js`

| Name | Parameter | Zweck |
|---|---|---|
| `zahl` | `v` | Zahl mit höchstens zwei Nachkommastellen; NaN wird nie still geschrieben. |
| `maske` | `text` | Text für Inhalte und Attribute maskieren. |
| `linie` | `a, b, opts = {}` |  |
| `polylinie` | `punkte, opts = {}` |  |
| `flaeche` | `x, y, breite, hoehe, opts = {}` | Rechteckige Fläche mit Kontur; nie mit Eckradius. |
| `vieleck` | `punkte, opts = {}` |  |
| `kreis` | `c, r, opts = {}` |  |
| `ellipse` | `c, rx, ry, opts = {}` |  |
| `pfad` | `d, opts = {}` | Pfad mit absoluten Befehlen. |
| `gruppe` | `inhalt, { id, transform, opacity, clip } = {}` | Gruppe; transform und opacity stehen immer im Markup, wenn die Gruppe bewegt wird. |
| `transform` | `{ x = 0, y = 0, drehung = 0, sx = 1, sy = 1 } = {}` | Transform-Text aus Verschiebung, Drehung (Grad) und Maßstab. |
| `text` | `inhalt, x, y, opts = {}` | Text in der Systemschrift aus den Tokens. |
