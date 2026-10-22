# Geräusche

**Ziel:** Geräusche, die aus der Bewegung einer Szene entstehen und deutlich unter der Stimme liegen.
**Voraussetzung:** eine Szene, die ohne Befund baut; für neue Cues eine Kostenfreigabe der Regie.
**Ergebnis:** `szenen/<ID>/sfx-cues.json` (erzeugt) und eine synchrone Stichprobe; die Geräusche selbst liegen in `lib/sfx/final/`.

Dezent, lustig, nicht absurd: leicht überzeichnete echte Geräusche, deutlich unter der Stimme. Ausgeschlossen sind Boing, Rutschpfeife, Hupe, Fanfare, Tröte, Lachen, Applaus, Explosion, Crash, Comic-Schlag, Musik und Jingle; `lib/sfx/katalog.js` hält jeden Prompt dagegen. Je Szene drei bis sechs Geräuscharten, höchstens sechs Geräusche in einer Sekunde, höchstens ein Laut (kürzer als 1 s, ohne Wort, in einer Sprechpause). Nur Physisches klingt.

## Ablauf

1. **Katalog** (`lib/sfx/katalog.yaml`, als Tabelle mit Ereignistypen und vorhandenem Klang in `docs/BAUSTEINE.md`): IDs deutsch, Prompts englisch. `einzel` heißt genau ein Anschlag je Datei, `nachklang` wird nie im Klang gekürzt, `loop` liegt als Schleife unter einem Vorgang, `varianten_vorrat` hält mehrere Einzelereignisse bereit. Ein neuer Cue ist ein eigener Schritt mit Freigabe.
2. **Kosten** (`npm run sfx:kosten`): Cues ohne Rohaufnahme mit geschätzten Credits (vorsichtig 11 je Geräusch-Take, 15 je Laut; abgerechnet wurden 3,3 je Geräusch von 1 s), dazu vier Stimmproben, bevor es Laute gibt. `-- --plan plan.json` rechnet aus dem Bestand, was fehlt: je Geräusch die Takes bis zum Ziel (vier, bei Vorrat genug für ihn), je Laut die Takes jeder der vier Stimmen (Linda, Julia, Jordan, Lo, je zwei); die Parameter folgen aus dem Katalog (`sfxParameter`). Die Warteschlange des Kontos fasst nur etwa 20 bis 30 Generierungen, und es gibt ein Tageslimit: nacheinander und in kleinen Gruppen generieren. Generiert wird erst nach „ja, generieren“; ein laufender Aufruf wird nie wiederholt.
3. **Generieren und ablegen**: über den ElevenLabs-Connector (Knoten je Cue, Parameter aus dem Plan, Laufen lassen, Status abfragen). Die signierten Links gelten zwei Stunden; heruntergeladen wird in ein eigenes, leeres Verzeichnis außerhalb des Repositorys. `npm run sfx:ablegen -- liste.tsv` prüft jede Datei mit ffprobe, legt sie als nächste freie Variante nach `lib/sfx/roh/<id>/vN.<endung>` und schreibt `roh/herkunft.tsv` (Modell, Prompt, Datum, Sitzung, Kennung der Generierung, Lizenz, Parameter samt Stimme; nie ein Schlüssel). Eine Generierung, deren Kennung schon dort steht, wird nicht noch einmal abgelegt.
4. **Messen und vorschlagen** (`npm run sfx:messen`, `npm run sfx:normalisieren -- --vorschlag`): Länge, Einsätze, Momentanlautheit, True Peak, Vorgeräusch, Übersteuerung; der Vorschlag ist vorläufig und lässt Bestätigtes stehen.
5. **Hörprobe** (`npm run sfx:hoerprobe`): alle Varianten zum Anhören, Wahl und Bestätigung als CSV; `npm run sfx:hoerprobe -- --uebernehmen auswahl.csv` schreibt `auswahl.yaml`.
6. **Normalisieren** (`npm run sfx:normalisieren`): Stille an den Enden weg (−50 dBFS, 10 ms Vorlauf), Vorgeräusch bei Einzelereignissen weg, vor dem zweiten Einsatz oder auf `dauer_s` kürzen, 10 ms Halbkosinus ein, 40–120 ms aus, Schleifen auf steigendem Nulldurchgang mit 30 ms Naht. Pegel −20 LUFS größte Momentanlautheit, True Peak ≤ −3 dBTP; bei kurzen Geräuschen geht der True Peak vor. Ausgabe `final/<id>.wav` (mono, 48 kHz, 24 bit) und `prototyp/<id>.ogg` (Opus 48 kbit/s); ein Vorrat entsteht durch Teilen der gewählten Aufnahmen an ihren Einsätzen nach `final/<id>/NN.wav`. ffmpeg misst jede Datei gegen; `protokoll-sfx.tsv` ist erzeugt.
7. **Zuordnen** (`npm run sfx:cues -- <ID> --stichprobe`): siehe unten.

## Brief

```yaml
sfx:
  ereignisse:
    anschlag: { cue: tastenanschlag, ausduennen: 3 }    # nur jeder dritte klingt
    erscheinen: { cue: bestaetigung, versatz_s: -0.03 }  # knapp vor dem sichtbaren Ereignis
  quellen:
    anschlag: [ { pfade: [A.armF.hand.y, A.armB.hand.y], beat: tippen, figur: A, requisite: tastatur } ]
    erscheinen: [ { pfad: haken.deckkraft, beat: haken } ]
  stumm: []                                              # erkannt, aber still
  laute: [ { beat: reaktion, versatz_s: 0.2, cue: laut-erleichtert, figur: A } ]
  stichprobe: [anschlag, erscheinen]
```

Pfade zeigen in den Zustand aus `computeState` oder, wenn es dort nichts gibt, in die Gelenke der Figur (`rig.gelenke`). `sichtbar: <pfad>` blendet Bilder aus, in denen der Wert nicht größer als 0 ist. Jede Quelle darf die Vorgaben ihrer Erkennung überschreiben (`hub`, `schwelle`, `pegel`, `richtung`, `stark`, `mindestbilder`).

| Ereignis | Erkennung | Vorgabe |
|---|---|---|
| anschlag, stempel | Tiefpunkt: abwärts (y wächst), dann aufwärts | Hub 1,5, Abstand 3 Bilder |
| klick | Beginn: Wert verlässt seine Ruhe | Schwelle 0,5 |
| schritt | Nulldurchgang | Pegel 0, beide Richtungen |
| abheben, ausgabe, aufbruch | Bewegungsbeginn | 20 Einheiten/s |
| ankunft, aufsetzen | Bewegungsende | 20 Einheiten/s |
| aufprall | schnell (≥ 300/s), dann sofort still | Fenster 2 Bilder |
| geraet | Hüllkurve steigt über die Schwelle | 0,5, scharf unter 0,4 |
| erscheinen | Deckkraft oder Maßstab über der Schwelle | 0,05 |

Die Variante aus einem Vorrat wählt ein Hash über Szene, Typ, Cue und laufende Nummer, nie zweimal dieselbe hintereinander. `sfx-cues.json` ist erzeugt; der Prüflauf erzeugt sie neu und vergleicht. Ändert sich die Bewegung, wird sie neu erzeugt, nie von Hand korrigiert. Die Stichprobe zeigt je Typ das Bild davor, darauf und danach mit dem Wert des Pfads; bewegt sich das Ding im Ereignisbild zuerst, ist die Szene synchron.

## Mischung

Im Prototyp ist die Geräuschspur ungeduckt: der lauteste Cue bei 0 dB, die übrigen nach `gain_db` relativ dazu. In der Endmischung (`npm run mischen -- <film>`, siehe `docs/STIMME.md`) liegt der Geräuschbus so, dass seine größte Momentanlautheit 12 dB unter der Sprache steht, und wird unter Sprache um weitere 6 dB geduckt (30 ms Ansprechen, 150 ms Rückstellen). Ein Laut steht in einer Sprechpause: vor dem ersten Wort, 0,25 bis 0,85 s nach einem Satzzeichen oder ab 0,5 s nach dem letzten Wort. `sfx:cues` prüft das gegen `ton/<film>/wortzeit.tsv` und nennt einen Laut in der Sprache als Hinweis; ohne Wortzeiten sagt er, dass nicht geprüft ist. Fällt ein Laut gewollt auf ein Wort, trägt er im Brief `am_wort: true` und wird nicht gehalten.

## Typische Fehler

| Befund | Ursache | Abhilfe |
|---|---|---|
| ein Geräusch auf dem falschen Ereignis | zwei Bewegungen teilen einen Pfad | eigenen Zustandswert (etwa `einlegen.y`) in `computeState` führen und im Brief darauf zeigen |
| zu viele Geräuscharten | jede Bewegung klingt | Unwichtiges unter `stumm` legen; drei bis sechs Arten je Szene |
| Häufung von Anschlägen | Tippen erzeugt ein Ereignis je Tiefpunkt | `ausduennen: n` am Ereignis |
| abgeschnittener Nachklang | Klang als Einzelereignis geführt | im Katalog `nachklang` setzen, nie kürzen |
| Cue-Liste veraltet | Bewegung geändert | `npm run sfx:cues -- <ID>`, nie von Hand |
