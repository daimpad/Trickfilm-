# Der Weg einer Szene

Zehn Schritte, in dieser Reihenfolge. Die ausführliche Fassung folgt in Phase 8.

1. **Anlegen:** `npm run szene:neu -- <FILM>-<NN>-<slug>` kopiert `szenen/_vorlage`.
2. **Brief** (`brief.yaml`): Passage wörtlich, Dauer (geschätzt 15 Zeichen/s plus 10–15 % Luft, bis eine Aufnahme gemessen ist), These, Pointe, Figuren mit Charakterkarte, Beats, Beschriftungen (je ≤ 40 Zeichen), Textäquivalent. Fachliches nur aus dem Sprechtext.
3. **Geometrie** (`geometry.js`): alle Positionen in Weltkoordinaten, Palette aus den Tokens, Handziele. Ein Handziel liegt innerhalb Oberarm plus Unterarm; reicht es nicht, rückt Figur oder Ziel.
4. **Szene** (`scene.js`): `sceneMarkup()` aus Rigs und Requisiten in begründeter Z-Reihenfolge (Kommentar im Kopf), `sceneApply(s)` liefert genau die Attribute, die das Markup trägt. `TITEL` und `DESC` stehen hier.
5. **Zeitfunktion** (`animation.js`): `SPEC`, `BEATS`, `CHARAKTER`, `KONTAKTBOGEN`, `computeState(t)`. Hände als Schlüsselposen, dann `rig.greife()`. Posen lassen sich im Posen-Editor setzen (`npm run editor -- --szene <ID> --figur A`); sein Code kommt nach `geometry.js`, `posenZustand()` liest ihn in `animation.js`. Gehaltenes steht relativ zur Hand. Ruhelage hängender Arme über Winkel, IK nur zum Greifen.
6. **Geräusche:** Im Brief unter `sfx` nennen, welche Ereignisse klingen (`ereignisse`), wo die Größen im Zustand liegen (`quellen`), was still bleibt (`stumm`) und höchstens einen Laut (`laute`). `npm run sfx:cues -- <ID> --stichprobe` schreibt `sfx-cues.json` und `dist/stichprobe.png`; bewegt sich das Ding im Ereignisbild zuerst, `sichtung.synchron: ok`. Ändert sich die Bewegung, wird die Liste neu erzeugt, nie von Hand korrigiert. Einzelheiten in `docs/GERAEUSCHE.md`.
7. **Bauen:** `npm run szene:bauen -- <ID>` prüft Brief gegen Code, Markup, jedes Bild (IDs, Attribute, NaN), Reichweite, Schutzzone, Lesetakt.
8. **Ansehen:** `npm run szene:kontaktbogen -- <ID>` und jedes der neun Bilder ansehen: Liegt ein Ding falsch vor dem Rumpf? Greift ein Arm durch einen Tisch? Ist die Pointe bei 960 px lesbar? Geändert wird in Geometrie oder Zeitfunktion, nie im Standbild. Danach `sichtung` im Brief setzen.
9. **Prototyp:** `szenen/<ID>/dist/index.html` im Browser: Abspielen (Leertaste), Regler, ←/→, Sprungmarken.
10. **Protokoll:** `npm run szene:protokoll -- <ID>` schreibt `protokoll.tsv`; im selben Commit wie die Änderung.
11. **Anhalten:** Status in höchstens fünf Zeilen: ID, Dauer, Pointe, offene Punkte, Pfad des Kontaktbogens.
