# Figuren: Rig und Teilesatz

Kurzfassung für den ersten Teilesatz; die ausführliche Fassung folgt in Phase 8.

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

## Variation ohne neue Zeichnung

Palette je Szene über den Farbschlüssel, Blick durch Spiegelung, Haltung und Tempo über die Charakterkarte. Zubehör als eigenes Teil mit Drehpunkt (`zubehoer-…--hals`) ist vorgesehen, aber noch nicht eingebaut; der Importer meldet solche Ebenen derzeit als fremd.
