# Der Weg einer Szene

**Ziel:** eine geprüfte Szene als Prototyp, mit Geräuschen, Stimme, Untertiteln und einem lieferbaren Video.
**Voraussetzung:** eingerichtete Werkstatt (`npm ci`, ffmpeg, Chromium, Schrift; der SessionStart-Hook prüft das), ein Sprechtext für die Szene.
**Ergebnis:** `szenen/<ID>/` mit Brief, Geometrie, Szene und Zeitfunktion; `out/videos/<ID>.mp4` ohne Befund in `out/lieferung.tsv`.

Eine Szene durchläuft fünf Phasen. Am Ende jeder Phase steht ein Halt: Sie geht erst weiter, wenn der Halt erreicht ist.

| Phase | Halt |
|---|---|
| Planen | Brief vollständig, Dauer geschätzt oder gemessen |
| Bauen | `szene:bauen` ohne Befund |
| Prüfen | Kontaktbogen gesichtet, `sichtung` im Brief gesetzt |
| Vertonen | Cue-Liste synchron, Mischung angehört |
| Ausliefern | Video ohne Befund, bei Remotion Parität ohne Abweichung |

## Planen

1. **Anlegen:** `npm run szene:neu -- <FILM>-<NN>-<slug>` kopiert `szenen/_vorlage` (fünf Dateien mit `abweichungen.md`), setzt `id` und `film`, erzeugt `sfx-cues.json` und zieht `remotion/src/szenen.ts` nach. Danach baut die Szene, und `npm run pruefen` bleibt grün. Der Film heißt in der ID groß (`ABNAHME`), in Dateinamen klein (`texte/abnahme.ts`, `ton/abnahme/`).
2. **Brief** (`brief.yaml`): Passage wörtlich aus dem Sprechtext, These und Pointe in je einem Satz, Figuren mit Charakterkarte (wahlweise `mimik: an`, siehe `docs/MIMIK.md`), Requisiten, Beats mit Figur, Aktion, Gefühl und dem Wort, auf das sie fallen. Beschriftungen höchstens 40 Zeichen. Fachliches nur aus dem Sprechtext.
3. **Dauer:** Ohne Aufnahme 15 Zeichen je Sekunde plus 10–15 % Luft, `dauer_geschaetzt: true`. Mit Aufnahme die gemessene Länge (siehe Vertonen).

## Bauen

4. **Geometrie** (`geometry.js`): alle Positionen in Weltkoordinaten, Farben aus den Tokens, Handziele. Ein Handziel liegt innerhalb von Oberarm plus Unterarm; reicht es nicht, rückt die Figur oder das Ziel, nie der Arm.
5. **Szene** (`scene.js`): `sceneMarkup()` aus Rigs und Requisiten, die Z-Reihenfolge im Kopfkommentar begründet; `sceneApply(s)` liefert genau die Attribute, die das Markup trägt. `TITEL` und `DESC` stehen hier.
6. **Zeitfunktion** (`animation.js`): `SPEC`, `BEATS`, `CHARAKTER`, `KONTAKTBOGEN`, `computeState(t)`. Über jeder Funktion eine Zeile, was sie erzählerisch leistet.
   - Hände als Schlüsselposen, dann `rig.greife()`; Haltungen, die IK nicht liefert, aus `rig.posen`.
   - Posen setzen im Posen-Editor (`npm run editor -- --szene <ID> --figur A`); sein Code kommt nach `geometry.js`, `posenZustand()` liest ihn.
   - Gehen mit festen Fußpunkten und `rig.fuss()`, nie über Winkelkurven (siehe `docs/SERIE.md`).
   - Gehaltenes steht relativ zur Hand; Spiegelung setzt das Rig, nie `-dir` in der Szene.
7. **Bauen:** `npm run szene:bauen -- <ID>` prüft Brief gegen Code, Markup, jedes Bild (IDs, Attribute, NaN), Reichweite, Schutzzone und Lesetakt. Jeder Befund nennt Bild und Ort; er wird in Geometrie oder Zeitfunktion behoben, nie im Ergebnis.

## Prüfen

8. **Kontaktbogen:** `npm run szene:kontaktbogen -- <ID>`, jedes der neun Bilder ansehen: Liegt ein Ding falsch vor dem Rumpf? Greift ein Arm durch einen Tisch? Ist die Pointe bei 960 px lesbar? Danach `sichtung` im Brief setzen: je Punkt `ok` oder `offen`.
9. **Prototyp:** `szenen/<ID>/dist/index.html` im Browser; Leertaste spielt, ←/→ gehen um ein Bild, Sprungmarken führen zu den Beats. Ein Video zum Weitergeben baut `npm run szene:vorschau -- <ID>`.
10. **Protokoll:** `npm run szene:protokoll -- <ID>` schreibt `protokoll.tsv`, im selben Commit wie die Änderung.

## Vertonen

11. **Geräusche:** im Brief unter `sfx` nur, welche Ereignisse klingen und wo die Größen im Zustand liegen; `npm run sfx:cues -- <ID> --stichprobe` nach jeder Änderung der Bewegung (sonst meldet der Build eine veraltete Cue-Liste). Einzelheiten in `docs/GERAEUSCHE.md`.
12. **Stimme:** Register (`texte/<film>.ts`, `docs/sprechtext/<film>.md`), Platzhalter oder Aufnahme, Messung, Einsatz, Wortzeiten, Untertitel, Mischung nach `docs/STIMME.md`. Ein neuer Film braucht dafür keinen Eintrag in den Werkzeugen; der Platzhalter läuft sofort. Mit Platzhalter bleibt der Brief bei der Schätzung (`datei: null`, `dauer_geschaetzt: true`); erst nach der Messung einer Aufnahme `datei`, `dauer_s`, `dauer_geschaetzt: false` setzen und die Beats an die Wortzeiten legen. Die Kommentare `„Wort“ (Bild)` tragen ihre Bildnummer erst, wenn gemessen ist (`npm run wortzeit -- <film> <ID> <Wort>`); `npm run wortzeit -- <film> pruefen` hält sie dagegen.
13. **Anhören:** die Mischung im Vorschau-Video; Regie hört ab.

## Ausliefern

14. **Video:** `npm run video -- <ID>` rendert jedes Bild, nimmt den Ton aus der Mischung und die Untertitel als Spur und prüft H.264 BT.709, −16 LUFS ± 1, True Peak ≤ −1 dBTP und Farbe ± 3. Ergebnis `out/videos/<ID>.mp4` mit `.vtt`; ein Befund steht als FEHLER im Log.
15. **Remotion** (wenn verlangt): `npm run remotion:paritaet -- <ID>`, dann `npm run render -- <ID>` oder `npm run render -- Film-<film>`; Ergebnis in `out/remotion/`.
16. **Galerie** für Prüfende: `npm run galerie -- <film>`, Ordner und ZIP unter `out/galerie/`.
17. **Lieferzweig:** Renderergebnisse nie im Repository; soll eine Lieferung bei GitHub liegen, dann auf `git worktree add --orphan -b lieferung/<datum> <pfad>`.
18. **Anhalten:** Status in höchstens fünf Zeilen: ID, Dauer, Pointe, offene Punkte, Pfad des Kontaktbogens oder Videos.

## Nachschlagen

| Was | Wo |
|---|---|
| Requisiten | Bild aller Requisiten: `npm run requisiten` → `lib/props/KATALOG.png`. Im Code `requisite('<name>').markup(id, pos, farben, opts)`; `pos` ist der Bezugspunkt in Weltkoordinaten, bewegliche Teile tragen IDs `<id>-<teil>` (`requisite(name).ids(id)` nennt sie), die `sceneApply` setzt. |
| Figuren | Archetypen und Rig-Funktionen in `docs/FIGUREN.md`, Gesicht in `docs/MIMIK.md` |
| Geräusche | Cue-IDs und Ereignistypen in `lib/sfx/katalog.yaml` und `docs/GERAEUSCHE.md` (Tabelle der Erkennungen) |
| Spielweise | `lib/spielweise.js`: `charakter`, `atmen`, `konzentriert`, `genervt`, `ueberrascht`, `erleichtert`, `stolz`, `ratlos`, `tippen`, `fussWippen` |
| Beispiel | `szenen/DEMO-01-buero` zeigt jeden Baustein einmal: Greifen, Gehen, Requisiten mit beweglichen Teilen (Drucker, Blatt), Geräusche, Stimme mit Einsatz; `szenen/MIMIK-01-buero` dazu Mimik |

## Wenn etwas scheitert

| Meldung | Bedeutung | Abhilfe |
|---|---|---|
| Ziel außer Reichweite (Bild, Abstand) | Handziel weiter als der Arm | Figur oder Ziel in `geometry.js` verschieben |
| `#id` trägt kein Attribut | `sceneApply` setzt etwas, das das Markup nicht kennt | Attribut ins Markup oder aus der Zuordnung nehmen |
| Schutzzone oder Lesetakt | Text zu tief oder zu kurz stehend | Platz der Beschriftung oder Beat verlängern |
| `sfx-cues.json` veraltet | Bewegung geändert | `npm run sfx:cues -- <ID>`, nie von Hand |
| Absatz läuft über die Szene | Aufnahme länger als die Szene | Szene verlängern oder Einsatz kürzen; `--trotzdem` nur zum Anhören |
| LUFS statt −16 ± 1 | Video ohne Mischung | `npm run mischen -- <film>`, dann neu rendern |
