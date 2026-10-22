# Figuren: Rig und Teilesatz

**Ziel:** eigene Personen auf die Skelette der Werkstatt bringen und in Szenen bewegen.
**Voraussetzung:** ein Zeichenprogramm mit Ebenen (Illustrator, Inkscape) oder Einzelzeichnungen je Teil.
**Ergebnis:** ein Teilesatz unter `lib/teilesaetze/<satz>/`, der in jedem Brief über `teilesatz:` gewählt wird, und ein Testbogen ohne Gelenklücken.

Skelett und Aussehen sind getrennt: Das Rig (`lib/rigs/`) legt Maße, Gelenke und Bewegung fest, der Teilesatz nur, wie die Teile aussehen. Die Rig-Spezifikation ist normativ; sie ändert sich nur mit Rückfrage.

## Begriffe

- **Archetyp:** Skelett mit festen Maßen aus `figuren/rig-spezifikation.json` (`sitzend-profil`, `stehend-profil`, `stehend-frontal`, `oberkoerper-nah`).
- **Teilesatz:** die Zeichnungen aller Teile eines Archetyps, `satz-01`, `satz-02` … Ein Satz steht für dieselbe Person in allen Archetypen, in denen er vorliegt.
- **satz-00:** Platzhalter aus Grundformen, erzeugt von `npm run figuren:erzeugen`; Test- und Rückfallsatz.

## Zeichnen

1. Vorlage kopieren: `figuren/vorlage_<archetyp>.svg` nach `figuren/teilesaetze/<satz>/<archetyp>.svg`.
2. In Illustrator oder Inkscape je Teil in **die Ebene mit genau diesem Namen** zeichnen (`torso`, `head`, `armF-upper` …). Die blasse Referenz und die blauen Drehpunkte liegen in Hilfsebenen (`hilfe-…`) und dürfen bleiben.
3. Jedes Teil deckt den blauen **Überlappungskreis** (14 px) an seinen Gelenken; sonst entstehen beim Drehen Lücken.
4. Handvarianten `offen`, `greifend`, `zeigend` je Hand.
5. Farben: `#ff00ff` Kleidung 1, `#ffff00` Kleidung 2, `#00ff00` Zubehör werden je Szene umgefärbt; alle anderen Farben bleiben, wie gezeichnet.
6. Personen ohne Gesichtszüge, vielfältig, ohne Stereotype.

## Exportregeln

- SVG mit Präsentationsattributen (kein `style`, keine CSS-Klassen), Ebenennamen als Objekt-IDs, zwei Nachkommastellen, nicht minimiert.
- Keine Transformationen (Skalierung, Drehung) an Ebenen oder Formen; vor dem Export umwandeln.
- Konturen 4 oder 6 px; keine Verläufe, Filter, Masken, Schatten, Deckkraft, Texte, Bilder; kein Eckradius an Rechtecken (als Pfad zeichnen).

## Einlesen

```bash
npm run figuren:import -- satz-01
```

Der Importer prüft Ebenen, Formen, Farben und Konturen, verschiebt jedes Teil um seinen Drehpunkt, testet jedes Gelenk bei −60°, 0°, +60°, +120° in Chromium auf Lücken, schreibt `lib/teilesaetze/satz-01/` und einen Bogen `figuren/teilesaetze/satz-01/testposen.png`. Das Protokoll steht in `figuren/import.tsv`. Der Importer ändert keine Zeichnung: Befunde gehen an Regie zurück. `--trotzdem` schreibt auch bei Gelenklücken, nie bei Strukturfehlern.

## Einzelteile statt Vorlage: Teile-Werkstatt

`npm run teile` erzeugt `out/teile/teile-werkstatt.html` (auch auf der Webseite). Jedes Teil wird als eigene SVG-Datei geladen, in beliebigem Maßstab und Programm; der Dateiname (`kopf.svg`, `oberarm.svg`, `armF-hand-zeigend.svg` …) bestimmt den Platz. Die Werkstatt legt die Längsachse auf die Zielstrecke des Skeletts, leitet hintere oder rechte Glieder und Handformen aus vorhandenen ab, ergänzt Fehlendes auf Wunsch aus `satz-00`, prüft die Gelenke live und schreibt ein ZIP mit allen Archetypen der Ansicht im Exportformat oben. Danach gilt der Abschnitt „Einlesen“ unverändert. Verläufe werden zur ersten Farbe, Text und Rasterbilder übergangen, Konturen auf 4 oder 6 px gerundet; die Werkstatt meldet das.

## Bewegen

Der Zustand eines Rigs steht im Figurenrahmen: Blick nach rechts, Winkel vorwärts positiv, Arme absolut, Kopf relativ zum Rumpf. Ein Rig bietet:

| Funktion | Zweck |
|---|---|
| `greife(state, arm, ziel)` | Arm zu einem Weltziel über IK; der Ellbogen beugt nach der natürlichen Seite |
| `fuss(state, bein, ziel)` | Bein zu einem Knöchelziel, Knie nach vorn; Grundlage des Gehens |
| `pruefeReichweite(state)` | Handziele außer Reichweite mit Abstand; der Build meldet sie mit Bild |
| `posen` (frontal) | Haltungen, die IK nicht liefert, etwa vor dem Körper halten |
| `gelenke(state)` | Weltpunkte der Gelenke und die Kopfmitte `kopf`, etwa für Gehaltenes, Blickziele oder Geräuschquellen (`A.armF.hand.y`) |

- **Greifen:** Hände als Schlüsselposen in der Zeitfunktion, dann `greife()`. Ruhelage hängender Arme über Winkel, IK nur zum Greifen. Gehaltenes steht relativ zur Hand.
- **Gehen:** feste Fußpunkte am Boden, der Schwungfuß geht in flachem Bogen von Punkt zu Punkt, die Beine folgen über `fuss()`; die Hüfte fährt an und ab und senkt sich nur so weit, wie die Beinlänge verlangt. Winkelkurven allein lassen den Standfuß rutschen (siehe `docs/SERIE.md`).
- **Spiegelung:** `dir: -1` in `geometry.js` (im Brief `blick: links`) geht als `dir` in den Zustand des Rigs, das spiegelt; ein Umdrehen ist ein Wechsel von `dir` zu einem Zeitpunkt. Jeder Winkel bleibt im Figurenrahmen, nie mit `-dir` multipliziert.
- **Eigene Maße:** `massstab` im Zustand verkleinert oder vergrößert die ganze Figur; Reichweite und Fußpunkte rechnen mit demselben Maßstab.
- **Posen-Editor** (`npm run editor -- --szene <ID> --figur A`): Gelenke ziehen, Schlüsselposen als Code nach `geometry.js`, gelesen mit `posenZustand()` aus `lib/posen.js`.

## Gesicht

Wahlweise trägt eine Figur ein gerechnetes Gesicht (`mimik: an` im Brief, `mimik: true` am Rig). Es gehört nicht zum Teilesatz und wird nicht gezeichnet; Einzelheiten in `docs/MIMIK.md`. Ein Teilesatz mit anderer Kopfform als `satz-00` braucht einen eigenen Sitz in `lib/mimik-spezifikation.js`.

## Variation ohne neue Zeichnung

Palette je Szene über den Farbschlüssel, Blick durch Spiegelung, Haltung und Tempo über die Charakterkarte. Zubehör als eigenes Teil mit Drehpunkt (`zubehoer-…--hals`) ist vorgesehen, aber noch nicht eingebaut; der Importer meldet solche Ebenen derzeit als fremd.
