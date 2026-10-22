# Entscheidungen

Jede Entscheidung mit Datum und Urheber. Spätere Entscheidungen werden unten angehängt, frühere nicht überschrieben.

## 2026-10-19 · Phase 0: Grundfragen

| Frage | Entscheidung | Urheber |
|---|---|---|
| Sichtbarkeit des Repositories | privat (das Repository wurde öffentlich angelegt und wird vor dem ersten Push auf privat gestellt) | entschieden von Regie |
| Sprache von Code, Kommentaren, Commits | Deutsch; Prompts für Geräusche auf Englisch | entschieden von Regie |
| Wie das Repository entsteht | Regie hat `Trickfilm-` leer auf GitHub angelegt und der Sitzung hinzugefügt; Claude klont und füllt es | entschieden von Regie |
| Stimme der Erzählung | gemischt: ElevenLabs als Standard, eigene Aufnahmen ersetzen einzelne Absätze | entschieden von Regie |
| Wie ElevenLabs angesprochen wird | über den ElevenLabs-Connector der Sitzung (kein Schlüssel in Dateien), dazu örtlich über `ELEVENLABS_API_KEY` als Secret | entschieden von Regie |
| Corporate Design | neutrale Startpalette in `tokens/tokens.js`, später durch das CD eines Auftrags ersetzt | entschieden von Regie |
| Schrift | Arial als Systemschrift; in der Cloud Liberation Sans mit denselben Maßen; nie Webfonts | entschieden von Regie |
| Endformat | Remotion für das fertige Video, Browser-Prototyp für die Entwicklung | entschieden von Regie |
| Lottie | vorerst nicht; SVG-Rigs tragen alles | entschieden von Regie |

**Lizenzhinweis (genannt, nicht erfragt):** Remotion ist für Einzelpersonen und Firmen bis drei Personen frei; darüber braucht es eine Firmenlizenz. ElevenLabs-Generierungen sind je nach Tarif kommerziell nutzbar. Beides wird in `docs/LIZENZEN.md` mit Prüfdatum geführt und vor einer Kundenlieferung erneut geprüft.

**Nachtrag 2026-10-19, entschieden von Regie:** Das Repository bleibt vorerst öffentlich. Daraus folgt: keine Kundeninhalte, kein Corporate Design eines Auftrags, keine personenbezogenen Daten und keine unveröffentlichten Sprechtexte im Repository, solange es öffentlich ist. Vor dem ersten Auftrag wird die Sichtbarkeit erneut entschieden.

**Nachtrag 2026-10-19, entschieden von Claude nach Empfehlung:** Der erste Stand wird als `main` angelegt; gearbeitet wird auf Zweigen mit Pull Request gegen `main`.

**Umgebung der Cloud-Sitzung am 2026-10-19 vorgefunden:** Node 22.22.0, npm 10.9.4, ffmpeg und ffprobe unter `/usr/bin`, Chromium unter `/opt/pw-browsers`, Liberation Sans installiert.

## 2026-10-19 · Phase 2: Bibliothek

| Frage | Entscheidung | Urheber |
|---|---|---|
| Startpalette | bleibt wie in Phase 1 vorgeschlagen (keine Einwände) | entschieden von Claude nach Empfehlung |
| `szenen/*/dist/` im Repository | nein: Prototyp, Standbilder und Kontaktbogen sind jederzeit neu erzeugbar und PNGs nicht bitgleich; `protokoll.tsv` bleibt im Repository und wird im Prüflauf verglichen | entschieden von Claude |
| `satz-00` | wird aus der Rig-Spezifikation erzeugt (`npm run figuren:erzeugen`), nicht von Hand gezeichnet; Kopf und Hände weiß, Kleidung aus der Figurenpalette, damit keine Hauttöne als Token nötig sind | entschieden von Claude |
| Referenzbilder `lib/props/KATALOG.png`, `figuren/testposen.png` | im Repository als Sichtungsstand, nicht im Prüflauf verglichen | entschieden von Claude |

## 2026-10-19 · Posen-Editor

| Frage | Entscheidung | Urheber |
|---|---|---|
| Gegenstand | Posen einer Figur: Griffe, Handziele per IK, Schlüsselposen auf einer Zeitleiste | entschieden von Regie |
| Bedienung | Ziehen auf der Bühne und Regler, Pfeiltasten für 1 px oder 8 px | entschieden von Regie |
| Ausgabe | Code zum Kopieren für `geometry.js`, gelesen von `posenZustand()` | entschieden von Regie |
| Ort | im Repository, `npm run editor` erzeugt eine Seite unter `out/editor/` (nicht im Repository) | entschieden von Regie |

## 2026-10-20 · Phase 3: Figurenbaukasten

| Frage | Entscheidung | Urheber |
|---|---|---|
| Aufbau der Zeichenvorlage | im Profil jedes Glied in einer eigenen Säule, Handvarianten daneben; frontal an der Hauptfigur; Drehpunkte fest aus der Spezifikation | entschieden von Claude |
| Teile als Ebenen | nur oberste Ebenen zählen; Name aus `inkscape:label`, sonst `data-name` (Illustrator), sonst `id` | entschieden von Claude |
| Freie Farben | erlaubt und im Protokoll als Hinweis genannt; nur die drei Farbschlüssel werden umgefärbt | entschieden von Claude |
| Gelenklücke | hält den Import an; `--trotzdem` schreibt dennoch, Strukturfehler halten immer an | entschieden von Claude |
| Zubehör-Teile | vorgesehen, noch nicht eingebaut; der Importer meldet sie als fremd | entschieden von Claude |

## 2026-10-20 · Webseite auf GitHub Pages

| Frage | Entscheidung | Urheber |
|---|---|---|
| Seite öffentlich auf GitHub Pages | ja, die Übersicht aller Funktionen mit Prototyp und Posen-Editor | entschieden von Regie |
| Zielgruppe | zwei Ebenen: Wesentliches für Mitwirkende ohne Vorwissen, aufklappbare technische Einzelheiten | entschieden von Regie |
| Live-Teile | Prototyp der Vorlage-Szene und Posen-Editor laufen auf der Seite | entschieden von Regie |
| Aktualität | bei jedem Push auf `main` neu gebaut | entschieden von Regie |
| Aufbau | eine Seite mit Inhaltsverzeichnis | entschieden von Regie |

## 2026-10-20 · Teile-Werkstatt

| Frage | Entscheidung | Urheber |
|---|---|---|
| Ansatz | Einzelzeichnungen je Teil laden, einpassen, live prüfen, Ausgabe für den Importer | entschieden von Regie |
| Ergebnis | Zeichnung im Austauschformat, die der Importer einliest | entschieden von Regie |
| Hilfen | ein Satz für drei Profile, zweite Seite ableiten, Farbschlüssel per Klick, Testposen live | entschieden von Regie |
| Ort | im Repository (`npm run teile`) und auf der Webseite | entschieden von Regie |
| Prüfung | dieselbe Struktur- und Gelenkprüfung wie der Importer, aus `lib/` geteilt | entschieden vom Leitstand |

## 2026-10-20 · Phase 4: Geräusche

| Frage | Entscheidung | Urheber |
|---|---|---|
| Weiter mit Phase 4 nach dem Merge der Teile-Werkstatt | ja („weiter“) | entschieden von Regie |
| Startbestand | 35 Geräusche und 3 Laute nach Abschnitt 8.2, Prompts englisch | entschieden vom Leitstand |
| Pfade in die Gelenke, Ereignistyp `aufbruch` | ja, siehe Chronik | entschieden vom Leitstand |
| Generierung des Startbestands | offen: Kostenfreigabe mit `npm run sfx:kosten` | Regie |

## 2026-10-20 · Geräuschbibliothek

| Frage | Entscheidung | Urheber |
|---|---|---|
| Generierung des Startbestands | ja, alles | entschieden von Regie |
| Umfang darüber hinaus | „je größer desto besser“: Katalog auf 219 Cues erweitert (211 Geräusche, 8 Laute), je Cue mindestens vier Varianten | entschieden von Regie, Auswahl der Cues vom Leitstand |
| Weg der Generierung | ElevenLabs-Connector, Ablage über `npm run sfx:ablegen` | entschieden vom Leitstand |
| Stimme der Laute | alle vier Stimmen aus den Proben (Linda, Julia, Jordan, Lo), je Take 2 („jeweils Take 2“); jeder Laut in allen vier Stimmen, Wahl in der Hörprobe | entschieden von Regie |

## 2026-10-20 · Aufbau der Webseite

| Frage | Entscheidung | Urheber |
|---|---|---|
| Gliederung | vier Bereiche nach Zweck: Werkzeuge, Anleitungen, Bausteine und Regeln, Nachschlagen | entschieden von Regie |
| Navigation | Reiter und je Kapitel eine eigene Ansicht mit Zurück, Übersicht, Weiter | entschieden von Regie |
| Werkzeuge | eigener Bereich mit Kacheln, Querverweise in beide Richtungen | entschieden von Regie |
| Startansicht | ein Satz und vier Einstiege, ohne Scrollen | entschieden von Regie |
| Ebenen | seitenweiter Umschalter „Kurz / Mit Technik“ | entschieden von Regie |
| Suche | einfache Suche auf der Seite, ohne Netz | entschieden von Regie |
| Prototyp | läuft im Werkzeug-Bereich | entschieden von Regie |

## 2026-10-20 · Gestaltung der Webseite

| Frage | Entscheidung | Urheber |
|---|---|---|
| Gestaltung | vorgegebene Farben, Schriften, Rundungen, Schatten und Glas, unter eigenen Namen; der Name der Vorlage erscheint nirgends | entschieden von Regie |
| Schriften | im Repository unter SIL OFL, nie aus dem Netz, nur auf der Webseite | entschieden von Regie |
| Stil-Editor | Regler für Schatten, Tiefe, Unschärfe, Deckkraft, Rundung, Akzent und Titelschrift; Ausgabe als CSS | entschieden von Regie |
| Text | nur das zum Arbeiten Nötige; kein Stand, Datum oder Änderungsverlauf | entschieden von Regie |
| Umfang | nur die Webseite; Posen-Editor und Teile-Werkstatt bleiben | entschieden von Claude |
| Bewegung | keine Übergänge, auch nicht auf der Seite | entschieden von Claude |

## 2026-10-20 · Prompts auf der Webseite

| Frage | Entscheidung | Urheber |
|---|---|---|
| Hauptweg der Anleitungen | Prompt für Claude Code zuerst, Befehl klein darunter | entschieden von Regie |
| Anpassen | Felder je Anleitung und ein Prompt-Editor unter Werkzeuge; jeder Prompt frei bearbeitbar | entschieden von Regie |
| Umfang | alle Anleitungen, dazu Posen-Editor und Hörprobe | entschieden von Regie |
| Quelle | `site/prompts.js`, eingesetzt vom Seitenbau | entschieden von Claude |

## 2026-10-21 · Phase 5: Demoszene

| Frage | Entscheidung | Urheber |
|---|---|---|
| Sprechtext der Demo | Fassung A („Ein Antrag ist schnell ausgefüllt …“) | entschieden von Regie |
| Ansehen ohne Pages | Vorschau-Video `npm run szene:vorschau` statt gelockerter Lesesperre | entschieden von Regie |
| Auftritt von B | Gang mit festen Fußpunkten statt Winkelkurve | Anlass von Regie, Lösung vom Leitstand |

## 2026-10-21 · Phase 6: Stimme und Untertitel

| Frage | Entscheidung | Urheber |
|---|---|---|
| Reihenfolge | erst die ganze Kette mit Platzhalter, dann eine echte Aufnahme | entschieden vom Leitstand |
| Stimme | Damian (deutsch, Standardakzent), `eleven_multilingual_v2`, Tempo 1,0 | entschieden von Regie |
| Kosten | zwei Takes von absatz-01, rund 350 Credits | freigegeben von Regie („ja, generieren“) |
| Take | Take 2 | entschieden von Regie |
| Wörter vor den Beats | Einsatz 1,0 s (`sprechtext.einsatz_s`) statt gestauchter Bewegung | entschieden vom Leitstand |
| Lautheit spitzer Aufnahmen | Begrenzer mit 5 ms Vorlauf, Befund ab 6 dB | entschieden vom Leitstand |
| Mischung | abgenommen („passt alles, hört sich gut an“) | entschieden von Regie |

## 2026-10-21 · Phase 7: Render und Lieferung

| Frage | Entscheidung | Urheber |
|---|---|---|
| Zwischenformat der Bilder | PNG statt JPEG Qualität 92 (JPEG verschob die Farbe um 3 Stufen) | entschieden vom Leitstand |
| Ton im Remotion-Port | die fertige Mischung des Films, keine zweite Mischung | entschieden vom Leitstand |
| Markup im Port | zur Laufzeit zu JSX gelesen, keine zweite Fassung | entschieden vom Leitstand |
| Wortliste für Seiten an Dritte | nur örtlich (`nichtoeffentlich.local.txt`) | entschieden vom Leitstand |
| zod | auf 4.5.4, die Fassung, die Remotion verlangt | entschieden von Regie |
| Merge | bei grüner Prüfung | entschieden von Regie |

## 2026-10-21 · Phase 8: Dokumentation

| Frage | Entscheidung | Urheber |
|---|---|---|
| Vorgehen | erst Gliederung je Dokument, dann schreiben | entschieden von Regie |
| Umfang | knapp, je ein bis drei Seiten | entschieden von Regie |
| Zeichnungen mit KI | nur beschreiben; Stilrahmen und Einleseprüfung mit dem ersten Auftrag | entschieden von Regie |

## 2026-10-22 · Mimik

| Frage | Entscheidung | Urheber |
|---|---|---|
| Verhältnis zur Regel „ohne Gesichter“ | wahlweise je Film oder Figur (`mimik: an`), ohne bleibt die Vorgabe | entschieden von Regie |
| Umfang | Augen, Brauen, Mund | entschieden von Regie |
| Technik | eigene, gerechnete Ebene; Sitz in `lib/mimik-spezifikation.js`, Rig-Spezifikation unberührt | entschieden von Regie |
| Werkzeug | Mimik-Editor im Browser (`npm run mimik`) | entschieden von Regie |
| Demo | zweite Fassung `MIMIK-01-buero` mit eigener Mischung; die abgenommene Demo bleibt | entschieden von Regie |
| Spezifikation als JS-Modul statt JSON | damit Prototyp, Node und Remotion sie ohne Build lesen | entschieden vom Leitstand |

## 2026-10-22 · Abnahme und Nacharbeit

| Frage | Entscheidung | Urheber |
|---|---|---|
| Umfang der Nacharbeit | alle Befunde der zweiten Abnahme in einem Pull Request | entschieden von Regie |
| Nachschlageseite | `docs/BAUSTEINE.md`, erzeugt aus der Bibliothek (`npm run bausteine`), im Prüflauf verglichen | entschieden vom Leitstand |
| Messung der Stimme | je Film in `ton/<film>/messung.json` statt einer gemeinsamen Datei, damit Szenen-Sitzungen verschiedener Filme nicht kollidieren | entschieden vom Leitstand |
| Skalieren von Requisiten | `opts.massstab` um den Bezugspunkt; Anker und Rahmen rechnen mit, bewegliche Teile bleiben in den Maßen der Requisite | entschieden vom Leitstand |
| Erlaubte Werte im Brief | Haltung und Gefühle prüft der Build gegen `lib/spielweise.js` | entschieden vom Leitstand |
| Szene verwerfen | `npm run szene:entfernen` nur mit `--ja`; echte Aufnahmen und Absätze eines geteilten Films hält der Lauf an | entschieden vom Leitstand |
| Laute in der Sprache | Hinweis aus den Wortzeiten, kein Befund; ob ein Laut verschoben wird, entscheidet die Regie | entschieden vom Leitstand |
