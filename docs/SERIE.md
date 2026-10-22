# Serie: gemeinsame Erkenntnisse

Jede Sitzung liest diese Datei zu Beginn. Hier steht, was mehr als eine Szene betrifft: Fallen, die schon gekostet haben, und wie Leitstand und Szenen-Sitzungen zusammenarbeiten. Neue Erkenntnisse kommen als eine Zeile mit Datum dazu; die Begründung steht in `docs/CHRONIK.md`.

## Arbeitsteilung

- **Leitstand:** ändert allein `lib/`, Tokens, Werkzeuge und `CLAUDE.md`; merged, baut jede Szene neu und sichtet die Kontaktbögen.
- **Szenen-Sitzung:** arbeitet in einem eigenen Git-Worktree, ändert nur `szenen/<ID>/`, für ihren Film das Register (`texte/<film>.ts`, `docs/sprechtext/<film>.md`) und, über die Werkzeuge, dessen erzeugte Dateien (`ton/<film>/`, `remotion/src/szenen.ts`); was in der Bibliothek fehlt, meldet sie, statt es selbst zu bauen.
- Erzeugte Dateien werden bei Konflikten nie gemischt: Fassung von `main` nehmen, Programm laufen lassen.

## Bild und Bewegung

- **Bündler:** Mehrzeilige Imports und `export { … }` am Dateiende fehlten im Bündel, ohne Meldung. Der Bündler legt deshalb jedes Modul unverändert als ES-Modul in eine Import-Map; der Browser löst Import- und Exportlisten selbst auf.
- **Knie nach hinten:** Beinwinkel zählen im Figurenrahmen vorwärts positiv; gespiegelt wird über das Rig, nie mit `-dir` in der Szene.
- **Fuß im Boden:** Ohne Fußgelenk taucht die Spitze des Schwungbeins in die Bodenlinie; die stehenden Rigs haben eines.
- **Rutschender Standfuß (2026-10-21):** Winkelkurven wie `walkCycle` lassen den Standfuß bei jeder Schrittlänge rutschen, weil die Hüfte gleichmäßig vorrückt und die Beine sinusförmig schwingen. Gehen nur mit festen Fußpunkten und `rig.fuss()`.
- **Hektischer Auftritt (2026-10-21):** Mehr als etwa zwei Schritte je Sekunde wirken gehetzt; lange Wege über An- und Abfahren der Hüfte, nicht über höheres Tempo.
- **Halten vor dem Körper:** Ohne Haltung mit gesenkten Ellbogen stehen die Arme ab wie Flügel; `rig.posen.halten` nehmen.
- **Andere Maße:** Eine Figur mit eigenem Maßstab gibt ihn an Fußpunkte und Reichweitenprüfung weiter.
- **Außer Reichweite:** Rückt ein Ziel, rückt die Figur oder das Ziel, nie der Arm. In der Demo wurde aus der Maus deshalb die Eingabetaste.

## Ton

- **Nachklang:** Ein Klang mit Nachhall (Münze) wurde auf 0,09 s gekürzt, weil er als Einzelereignis galt. Nachklingendes im Katalog als `nachklang` führen.
- **Ein Ereignis, ein Pfad (2026-10-21):** Teilen sich zwei Bewegungen einen Zustandswert, landet ein Geräusch auf dem falschen Ereignis; jedem klingenden Vorgang einen eigenen Wert geben.
- **Digitale Stille** zwischen Absätzen lässt Headsets abschalten; die Mischung legt −60 dBFS Grundrauschen darunter.
- **Aufnahme kürzer als geschätzt (2026-10-21):** Die erste Aufnahme sprach 9 statt 11,7 s; liegen die Wörter gleichmäßig neben den Beats, verschiebt `einsatz_s` den Absatz, statt die Bewegung zu stauchen.
- **Spitze Aufnahmen (2026-10-21):** Gesprochene Sprache hat bis zu 20 dB zwischen Lautheit und Spitze; ohne Begrenzer erreicht sie −16 LUFS nicht. Über 6 dB Begrenzung an der Mischung anhören.
- **Autoplay:** Browser spielen Ton erst nach einem Klick; Prototyp und Galerie warten auf „Abspielen“.

## Video und Lieferung

- **JPEG verschiebt Farbe (2026-10-21):** JPEG als Zwischenformat machte die helle Grundfläche 3 Stufen dunkler; Bilder gehen als PNG an ffmpeg, umgerechnet mit BT.709-Matrix.
- **`-shortest` mit Untertiteln (2026-10-21):** Die Untertitelspur kürzte das Video auf ihr Ende; die Länge kommt aus `SPEC.duration` über `-t`.
- **Remotion-Props (2026-10-21):** Remotion reicht Props als JSON weiter; Module mit Funktionen kommen nicht an, deshalb nur IDs.
- **Untertitel im Spieler** wandern über die Schutzzone, sobald die Steuerleiste steht; auf Seiten unter das Bild setzen, nie einbrennen.
- **Andere Schrift auf anderen Rechnern:** Arial und Liberation Sans haben dieselben Maße, aber andere Pixel; Referenzbilder in einer Umgebung rendern.
- **Bitgleich ist ein Render nicht immer:** An bewegten Kanten weichen 1 bis 2 px ab; sichtbar ist erst ein Fenster von 5 × 5 Pixeln mit mindestens 12 Pixeln über 30 Stufen.

## Arbeit und Kosten

- **Generierung nie wiederholen,** um zu „retten“; erst den Status abfragen. Jeder Aufruf kostet.
- **Erzeugte Dateien** von Hand gemischt ergaben veraltete Stände.
- **Abgeschriebene Zitate altern lautlos:** Belege werden adressiert (Film, Szene, Feld) und erzeugt, nicht kopiert.
- **Ein Werkzeug rät nicht:** Bei fehlender Farbe, fehlendem Pfad oder fehlender Quelle anhalten und melden.
- **Löschen in der Shell:** kein `rm -rf` mit Variablen oder relativen Globs nach `cd`.
