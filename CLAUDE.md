# CLAUDE.md – Regeln der Werkstatt

Diese Datei führt die Regeln, `docs/CHRONIK.md` ihre Geschichte. Wer eine Regel ändert, ändert sie hier in einem Satz mit Datum und hängt in der Chronik einen Absatz an: Anlass, Alternativen, Grund, Messung. „Regie“ ist die Person, die das Repository führt; Entscheidungen werden „entschieden von Regie“ zugeschrieben, ein Name steht nirgends.

## Zweck

Werkstatt für KI-gestützte Trickfilme mit Vertonung und Geräuschen, unabhängig von Auftrag und Inhalt. Bewegung ist eine reine Zeitfunktion, Figuren entstehen aus Rigs, Geräusche aus Bewegungsereignissen, Stimme und Untertitel aus gemessenen Aufnahmen; der Render ist deterministisch. Inhalte, Kunde und Corporate Design kommen als Eingaben dazu.

**Solange das Repository öffentlich ist (entschieden von Regie, 2026-10-19):** keine Kundeninhalte, kein CD eines Auftrags, keine personenbezogenen Daten, keine unveröffentlichten Sprechtexte.

## Grundsätze

1. **Jedes Bild ist eine Funktion der Zeit.** `computeState(t)` liefert Zahlen, eine Zuordnung schreibt sie ins SVG oder JSX. Keine CSS-Animation, kein SMIL, keine `transition`, kein `requestAnimationFrame` als Zeitgeber, kein GSAP, kein Framer Motion. Zufall nur über einen PRNG mit festem Seed.
2. **Die Bibliothek ist DOM-frei.** `lib/` ist reines JavaScript (ESM) und läuft unverändert im Prototyp, in Node und in Remotion.
3. **Geometrie ist Daten.** Positionen, Handziele, Maße, Farben stehen in `geometry.js` je Szene und in den Tokens, nie als nackte Zahl im Markup.
4. **Erst das Bild, dann der Ton, oder umgekehrt, nie beides geraten.** Mit Aufnahme folgen die Beats den gemessenen Wortzeiten; ohne wird geschätzt (15 Zeichen/s, 10–15 % Luft) und als Schätzung markiert.
5. **Geräusche entstehen aus der Bewegung**, abgetastet aus `computeState` und Katalog-Cues zugeordnet.
6. **Was gerechnet ist, wird nie von Hand gepflegt.** Erzeugte Dateien tragen „ERZEUGT von …“ im Kopf, werden im selben Commit wie ihre Quelle nachgezogen und bei Konflikten nie gemischt: Fassung von `main` nehmen, Programm laufen lassen.
7. **Was am Bild zu prüfen ist, wird am Bild geprüft**, an einem gerenderten Standbild, nicht an der Zahl.
8. **Ein Lauf, der etwas nicht weiß, sagt es.** Kein leeres Ergebnis, das wie „nichts zu tun“ aussieht.
9. **Kein Netz beim Rendern.** Keine Remote-Bilder, keine Webfonts, keine API-Aufrufe im Render; erst generieren und ablegen, dann rendern.
10. **Keine Geheimnisse im Repository**, auch nicht in Logs, Protokollen oder Tests. Schlüssel nur aus Umgebungsvariablen oder Secrets.

## Technischer Rahmen

- Node ≥ 22 (LTS), npm. Node 20 ist seit April 2026 ohne Pflege (2026-10-19).
- TypeScript strict für `tools/` und `remotion/`; reines JavaScript (ESM) für `lib/` und `tokens/`, ohne Build.
- Remotion 4.0.x; alle `remotion`- und `@remotion/*`-Pakete exakt auf derselben Fassung, ohne `^`. Alle Fassungen exakt gepinnt; Liste mit Prüfdatum in `docs/LIZENZEN.md`.
- 1920 × 1080, 30 fps. Prototyp rechnet in Sekunden, Remotion in Frames aus `t * fps`.
- Playwright 1.56.1 mit Chromium-Revision 1194. In Cloud-Sitzungen liegt sie unter `/opt/pw-browsers`; dort nie `playwright install`.
- ffmpeg und ffprobe für Schnitt, Messung (EBU R128), Mischung und Encode.
- Erlaubte Abhängigkeiten: `remotion`, `@remotion/cli`, `@remotion/media-utils` bei Bedarf, `react`, `react-dom`, `typescript`, `zod`, `tsx`, `playwright`, Typdeklarationen. Nicht: GSAP, Framer Motion, d3-selection, alles, was selbst ins DOM schreibt, Webfonts, Icon-Pakete, Lottie-Player mit eigener Zeitachse. Lottie vorerst nicht (entschieden von Regie, 2026-10-19).

## Verzeichnisse

| Pfad | Inhalt |
|---|---|
| `tokens/tokens.js` | einzige Quelle aller Gestaltungswerte |
| `lib/` | Bibliothek: Kurven, Bewegung, Spielweise, Bühne, SVG, Rigs, Requisiten, Ereignisse, Build, Viewer, `sfx/` |
| `figuren/` | Rig-Spezifikation (normativ), Zeichenvorlagen (erzeugt), `teilesaetze/<satz>/` (Zeichnungen, Testposen), `import.tsv` |
| `tools/` | Werkzeuge für Import, Geräusche, Stimme, Untertitel, Mischung, Video, Galerie, Drehbuch |
| `szenen/<FILM>-<NN>-<slug>/` | je Szene `brief.yaml`, `geometry.js`, `scene.js`, `animation.js`; `dist/` ist erzeugt |
| `remotion/src/` | Kompositionen je Szene und Master je Film |
| `ton/<film>/` | Erzählung je Absatz |
| `docs/` | Entscheidungen, Chronik, Anleitungen, Lizenzen |
| `test/` | Bibliothekstests (`node --test`) |
| `scripts/` | SessionStart-Hook und Starter für Doppelklick |
| `out/` | Renderergebnisse, nie im Repository |

Werkzeuge, die noch nicht gebaut sind, melden über `tools/noch-nicht.js`, in welcher Phase sie kommen, und enden mit Fehler.

## Gestaltung

**Corporate Design:** derzeit die neutrale Startpalette (entschieden von Regie, 2026-10-19). Ein Auftrag ersetzt `tokens/tokens.js`, sonst nichts. *Platz für die Regeln des CD eines Auftrags.*

- Bühne 1920 × 1080; Grafikfläche x 128–1792, y 96–816; Beschriftungen in festen Plätzen darunter (bis fünf in Zeile 0, einer in Zeile 1).
- Schutzzone: die unteren 140 px frei von Text und tragender Bildaussage.
- Abstände auf dem 8-px-Raster: 8, 16, 24, 32, 48, 64, 96, 128.
- Farben nur aus den Tokens; je Szene eine helle Grundfläche, eine Akzentfarbe, höchstens eine zweite. Konturen Schwarz, Text dunkle Primärfarbe oder Schwarz.
- Farbe nie allein: jede Unterscheidung trägt zusätzlich Form oder Wort.
- Keine Dekoration: kein Eckradius an Flächen, keine Schatten, keine Verläufe, keine Emojis. Ausnahme: runde Linienenden an Figuren, Zeichnungen und Effektzeichen.
- Kontraste gemessen über `kontrast()` in den Tokens: Text ≥ 4,5:1, Grafik ≥ 3:1.
- Kein Flackern: höchstens drei Hell-Dunkel-Wechsel je Sekunde.
- Lesetakt: Standzeit ≥ `lesezeitFrames(zeichen)` = (Zeichen / 12) · 30 + 45 Frames.
- Schrift Arial, in der Cloud Liberation Sans mit denselben Maßen; nie Webfonts. Ausnahme nur für die Webseite: vier Schriften unter SIL OFL liegen in `site/schriften/`, nie aus dem Netz; im Film nie (entschieden von Regie, 2026-10-20).
- Figuren ohne Gesichter; Emotion aus Haltung, Tempo, Anlauf, Überschwingen, Pausen. Der Witz liegt in der Situation, nie in der Person; keine Stereotype.

## Arbeitsweise

- **Optionen mit Empfehlung:** Wo Regie entscheidet, zwei bis vier Optionen, Empfehlung zuerst. Was nicht Regie gehört, entscheidest du und nennst es.
- **Statusmeldungen** höchstens fünf Zeilen.
- **Erzeugte Dateien messen, nicht lesen:** `wc`, `grep -c`, `head` oder das erzeugende Programm. `.claude/settings.json` sperrt große erzeugte Dateien fürs Lesen; Standbilder bleiben lesbar.
- **Diff zuerst als `--stat`**, Skripte nach Zeilenbereich lesen.
- **Messwerkzeuge gehören ins Repository**, nicht in den Scratchpad.
- **Kommentare sagen, was und warum**, nicht, was früher dort stand. Über jeder Animationsfunktion eine Zeile, was sie erzählerisch leistet.
- **Parallel arbeiten:** Ein Leitstand ändert allein `lib/`, Tokens, Werkzeuge und `CLAUDE.md`. Szenen-Sitzungen arbeiten je in einem eigenen Git-Worktree, ändern nur `szenen/<ID>/` und melden, was in der Bibliothek fehlt. Der Leitstand merged, baut jede Szene neu und sichtet den Kontaktbogen. Gemeinsame Erkenntnisse gehen nach `docs/SERIE.md`; jede Sitzung liest sie zu Beginn.
- **Git:** Branch je Aufgabe, Pull Request gegen `main`, Commits im Imperativ auf Deutsch mit Szenenbezug. Gemergt wird bei grüner Prüfung und wenn Regie es will. Renderergebnisse nie committen; Lieferungen nur auf einem Zweig ohne gemeinsame Geschichte (`git worktree add --orphan -b lieferung/<datum> <pfad>`).
- **Cloud-Sitzungen:** Der SessionStart-Hook (`scripts/sitzung-start.sh`) führt `npm ci` aus und prüft ffmpeg, Chromium und Schrift; Fehlendes meldet er, er installiert nichts still nach. Für örtliche Generierung trägt Regie `ELEVENLABS_API_KEY` als Secret der Umgebung ein; der Connector braucht keinen Schlüssel.
- **MCP:** nur Werkzeuge verwenden, die die Sitzung wirklich anbietet. Fehlt eine Funktion, das ausdrücklich sagen.
- **Löschen:** kein `rm -rf` mit Variablen oder relativen Globs nach `cd`.

## Prüfen

`npm run pruefen` fährt örtlich, was der Prüflauf auf GitHub fährt: Typen, Tests (mit Chromium), Geheimnisse und Verbotenes einschließlich Raster (`tools/pruefen-verboten.ts`), jede Szene bauen, erzeugte Dateien einschließlich der Cue-Listen vergleichen (2026-10-20).

- Rig-Zustand im Figurenrahmen: Blick nach rechts, Winkel vorwärts positiv, Arme absolut, Kopf relativ zum Rumpf; Spiegelung setzt das Rig, nie `-dir` in der Szene (2026-10-19).
- Handziele über `rig.greife()`; ein Ziel außer Reichweite meldet der Build mit Bild und Abstand.
- Haltungen, die IK nicht liefert (vor dem Körper halten), als Pose aus `rig.posen`.
- Teilesätze entstehen nur über den Importer (`npm run figuren:import -- <satz>`) aus `figuren/teilesaetze/<satz>/<archetyp>.svg`; auch `satz-00`, dessen Zeichnung `npm run figuren:erzeugen` schreibt. Zeichenregeln in `docs/FIGUREN.md` (2026-10-20).
- Webseite: `site/index.html` ist der Text, `tools/seite-bauen.js` setzt Befehle, Palette, Bilder, Schriften, Prototyp und Editor ein; `.github/workflows/static.yml` veröffentlicht sie bei jedem Push auf `main` auf GitHub Pages. Ein neuer Befehl in `package.json` braucht eine Beschreibung in `tools/seite-bauen.js`, sonst scheitert der Prüflauf (2026-10-20). Aufbau der Seite: Start und vier Bereiche (Werkzeuge, Anleitungen, Bausteine und Regeln, Nachschlagen), jedes Kapitel eine `section.ansicht` mit Adresse `#bereich/kapitel`, Technik in `.technik`; ein neues Werkzeug bekommt eine Kachel unter Werkzeuge und Querverweise in beide Richtungen (2026-10-20). Die Seite zeigt nur, was zum Arbeiten nötig ist: kein Stand, kein Datum, keine Änderungsnotizen; Symbole als Inline-SVG im Sprite der Seite, kein Icon-Paket. Ihre Gestaltung steht als `--st-*`-Variablen in `site/index.html`; die Stilwerte (Schatten, Tiefe, Unschärfe, Deckkraft, Rundung, Akzent, Titelschrift) stellt der Stil-Editor der Seite ein und gibt sie als CSS zum Übernehmen aus. Rundungen und Schatten der Seite sind erlaubt, die Regeln unter Gestaltung gelten für den Film (2026-10-20). Jede Anleitung beginnt mit Ziel, Voraussetzung und Ergebnis, gliedert längere Wege in Phasen und nennt je Schritt, was danach zu sehen ist; Kacheln sagen, ob eine Aufgabe im Browser oder im Repository läuft. Material zum Herunterladen (Zeichenvorlagen, `satz-00`) kopiert der Seitenbau, nie von Hand (2026-10-20). Jeder Schritt, den Claude ausführen kann, trägt einen Prompt für Claude Code vor seinem Befehl; Schritte von Hand sind als solche markiert. Alle Prompts und ihre Felder stehen nur in `site/prompts.js`; Anleitungen und Prompt-Editor lesen sie über `tools/seite-platzhalter.js` (entschieden von Regie, 2026-10-20).
- Teile-Werkstatt (`npm run teile`): Einzelzeichnungen je Teil laden, einpassen, als Teilesatz im Exportformat ausgeben; ihr Ergebnis geht wie jede Zeichnung durch den Importer, Prüfung und Layout teilt sie mit ihm über `lib/zeichnung.js` und `lib/rigs/vorlage-layout.js` (2026-10-20).
- Geräusche: Der Brief nennt unter `sfx` nur, welche Ereignisse klingen und wo die Größen im Zustand liegen; `npm run sfx:cues` erzeugt `sfx-cues.json`, nie von Hand. Pfade dürfen in die Gelenke einer Figur zeigen (`A.armF.hand.y`). Neue Ereignistypen kommen in `lib/events.js`, neue Cues in `lib/sfx/katalog.yaml` mit Freigabe; jeder Prompt läuft gegen die Ausschlussliste in `lib/sfx/katalog.js`. Vor jeder Generierung `npm run sfx:kosten` und „ja, generieren“ von Regie (2026-10-20).
- Stimme: Register `texte/<film>.ts`, Lesefassung `docs/sprechtext/<film>.md` und Passage im Brief sind wörtlich gleich; Messung, Wortzeiten, Untertitel und Lautheitsprotokoll erzeugen `stimme messen`, `wortzeit`, `untertitel` und `mischen`, nie von Hand; ohne Aufnahme läuft die Kette mit einem Platzhalter (`--stub`). Liegen die Wörter gleichmäßig neben ihren Beats, verschiebt `sprechtext.einsatz_s` den Absatz, statt die Bewegung zu stauchen. Ablauf in `docs/STIMME.md` (2026-10-21).
- Video (`npm run video -- <ID|alle>`): Bilder als PNG an ffmpeg, H.264 mit BT.709-Matrix, Ton aus der Mischung des Films, Untertitel als Spur; jede Datei misst `tools/lieferung.js` (Spuren, Lautheit, True Peak, Farbe gegen ein Standbild, sha256) nach `out/lieferung.tsv`. Ein Video ohne Befund ist die Bedingung jeder Lieferung (2026-10-21).
- Posen-Editor (`npm run editor`): erzeugt `out/editor/posen-editor.html`; sein Code (Schlüsselposen) gehört nach `geometry.js` und wird mit `posenZustand()` aus `lib/posen.js` gelesen.

## Ohne Rückfrage geschieht nicht

- neue Abhängigkeit aufnehmen;
- Token ändern;
- Rig-Spezifikation ändern (eingefroren ab Freigabe von Phase 3);
- Sprechtext oder Bildschirmtext umformulieren (Kürzen mit Liste zur Durchsicht ist erlaubt);
- generieren, was Credits kostet (Kostenfreigabe mit Cue-Liste, Varianten, geschätzten Credits; ein laufender Aufruf wird nie wiederholt);
- auf ein öffentliches Remote pushen (für dieses Repository erteilt von Regie, 2026-10-19, solange keine Kundeninhalte darin sind);
- eine Seite öffentlich machen.
