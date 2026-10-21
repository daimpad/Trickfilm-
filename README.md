# Trickfilm

Werkstatt für KI-gestützte Trickfilme mit Vertonung und Geräuschen. Bewegung ist eine reine Zeitfunktion, Figuren entstehen aus Rigs, Geräusche aus den Bewegungsereignissen, Stimme und Untertitel aus gemessenen Aufnahmen. Der Render ist deterministisch: Gleiche Eingabe ergibt dasselbe Bild.

Eine leicht lesbare Übersicht aller Funktionen mit Prototyp, Posen-Editor und Teile-Werkstatt zum Ausprobieren: **https://daimpad.github.io/trickfilm/** (bei jedem Merge neu gebaut).

Die Regeln stehen in [`CLAUDE.md`](CLAUDE.md), die Entscheidungen in [`docs/ENTSCHEIDUNGEN.md`](docs/ENTSCHEIDUNGEN.md), der Weg einer Szene in [`docs/ANLEITUNG-SZENE.md`](docs/ANLEITUNG-SZENE.md), das Zeichnen von Figuren in [`docs/FIGUREN.md`](docs/FIGUREN.md).

## Schnellstart

```bash
npm ci                                  # Abhängigkeiten, exakt gepinnt
npm run pruefen                         # Typen, Tests, Geheimnisse und Verbotenes
npm run studio                          # Remotion Studio im Browser
npx remotion still Palette out/p.png    # Standbild der Testkarte
npm run szene:neu -- FILM-01-slug       # neue Szene aus der Vorlage
npm run szene:bauen -- FILM-01-slug     # prüfen und Prototyp nach szenen/<ID>/dist/index.html
npm run editor -- --szene FILM-01-slug --figur A   # Posen-Editor nach out/editor/posen-editor.html
npm run teile                                      # Teile-Werkstatt nach out/teile/teile-werkstatt.html
```

Voraussetzungen: Node ≥ 22, ffmpeg und ffprobe, die Schrift Arial oder Liberation Sans. Chromium kommt örtlich über `npx playwright install chromium`; in Claude-Code-Cloud-Sitzungen liegt es schon vor.

## Stand

Die Werkstatt entsteht in Phasen. Ein Skript, dessen Werkzeug noch fehlt, meldet die Phase, in der es kommt, und endet mit Fehler.

| Phase | Inhalt | Stand |
|---|---|---|
| 0 | Grundentscheidungen | fertig |
| 1 | Grundgerüst, Tokens, Regeln, Prüflauf, SessionStart-Hook | fertig |
| 2 | Bibliothek: Bewegung, Rigs, Requisiten, Build, Viewer | fertig |
| 3 | Figurenbaukasten | fertig, Freigabe der Rig-Spezifikation offen |
| 4 | Geräusche | fertig: 219 Cues bearbeitet, Auswahl vorläufig bis zur Hörprobe |
| 5 | Demoszene `DEMO-01-buero` | gebaut, Sichtung durch Regie offen |
| 6 | Stimme und Untertitel | fertig für `demo`: Stimme Damian, Take 2, Mischung abgenommen |
| 7 | Render und Lieferung | fertig: `npm run video`, Remotion-Port mit Parität (`npm run render`), Lieferprotokoll, Galerie |
| 8 | Dokumentation | offen |

## Lizenzen

Remotion ist für Einzelpersonen und Firmen bis drei Personen frei; darüber braucht es eine Firmenlizenz. Einzelheiten und Prüfstand in [`docs/LIZENZEN.md`](docs/LIZENZEN.md).
