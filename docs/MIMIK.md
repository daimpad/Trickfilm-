# Mimik

**Ziel:** Figuren, die zusätzlich zu Haltung und Tempo ein Gesicht tragen: Punktaugen, Brauen und Mund.
**Voraussetzung:** eine Szene mit Figuren aus Rigs; die Entscheidung, dass der Film Gesichter zeigt.
**Ergebnis:** je Figur Schlüssel `[t, ausdruck]` in `geometry.js`, ein Gesicht, das mit dem Kopf dreht, blinzelt und sich mit der Erzählung ändert.

Ohne Gesicht bleibt die Vorgabe. Mimik ist wahlweise je Film oder Figur (entschieden von Regie, 2026-10-22). Auch mit Gesicht trägt die Haltung die Erzählung; das Gesicht bestätigt sie, es ersetzt sie nicht.

## Gestaltung

- Augen als schwarze Punkte, Lidschluss und Blickrichtung über ihre Form und Lage; Brauen als Strich; Mund als Kurve, offen als gefüllte Form. Strich 4 px, runde Enden, nur Schwarz.
- Keine Nase, keine Ohren, keine Wimpern, keine Augen- oder Mundformen, die Herkunft, Alter oder Geschlecht zuschreiben. Vielfalt kommt aus Teilesatz und Palette, nicht aus dem Gesicht.
- Im Profil ein Auge, eine Braue und ein halber Mund, nach vorn gerückt; frontal zwei Augen und Brauen.

## Größen

| Größe | Bereich | Wirkung |
|---|---|---|
| `blick.x`, `blick.y` | −1 … 1 | Pupille zur Seite, nach unten (positiv) |
| `lid` | 0 … 1 | 0 offen, 1 geschlossen |
| `braue.winkel` | Grad | positiv senkt das innere Ende (Ärger), negativ hebt es (Sorge, Staunen) |
| `braue.hoehe` | −1 … 1 | hebt beide Brauen |
| `mund.kruemmung` | −1 … 1 | positiv lächelt |
| `mund.breite` | 0,5 … 1,3 | schmal bis breit |
| `mund.offen` | 0 … 1 | geschlossen bis weit offen |

Benannte Ausdrücke in `lib/mimik.js`: neutral, konzentriert, freude, erleichtert, staunen, zweifel, ärger (`aerger`), müde (`muede`). Ein Schlüssel nimmt einen Namen oder ein Teilobjekt, das vom Neutralen abweicht.

## Ablauf

1. **Brief:** bei der Figur `mimik: an`. Der Build meldet ein Gesicht ohne diese Angabe und eine Angabe ohne Gesicht.
2. **Szene:** `rig(…).markup('A', { …, mimik: true })`. Das Gesicht liegt in der Kopfgruppe und dreht und spiegelt mit dem Kopf.
3. **Ausdrücke einstellen:** `npm run mimik` erzeugt `out/editor/mimik-editor.html` (auch auf der Webseite): Regler, Ausdrücke als Ausgangspunkt, groß im Profil und frontal, klein in Bühnengröße und bei 960 px. Schlüssel auf der Zeitleiste setzen und den Code kopieren.
4. **Zeitfunktion:** den Code nach `geometry.js` (`GEO.mimik.A`), in `computeState`:
   ```js
   A.gesicht = mitBlinzeln(mimikZustand(GEO.mimik.A, t), blinzeln(t, 'A', { extra: [3.75] }));
   ```
   Schlüssel an Beats und Wortzeiten legen; ein Umschlag wie Staunen braucht 0,2 bis 0,3 s, ein Abklingen eine Sekunde.
5. **Blinzeln:** alle 3 bis 6 s mit festem Seed je Figur; zusätzliche Lidschläge (`extra`) kurz vor einem Blickwechsel oder einem Umdrehen.
6. **Ansehen:** Standbilder der Köpfe an den Schlüsseln; der Build meldet Augen, die bei 960 px Bildbreite unter 2 px fallen.

## Sitz auf dem Kopf

`lib/mimik-spezifikation.js` hält je Archetyp Kopfmitte und Radius im Rahmen des Kopfteils, passend zu `satz-00`. Ein Teilesatz mit anderer Kopfform trägt eigene Werte unter `teilesaetze.<satz>.<archetyp>`. Die Rig-Spezifikation bleibt davon unberührt.

## Beispiel

`szenen/MIMIK-01-buero` ist die zweite Fassung der Demo: dieselbe Bewegung und Aufnahme, A konzentriert und dann erleichtert, B zweifelnd am Drucker, staunend bei „staunt“, freudig beim Ablegen.
