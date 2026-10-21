# Stimme und Untertitel

Die Erzählung entsteht absatzweise; jeder Absatz gehört zu einer Szene und beginnt an ihrem Anfang oder an seinem Einsatz (`sprechtext.einsatz_s`). Bild und Untertitel folgen der gemessenen Aufnahme, nie umgekehrt.

## Ablauf

1. **Register** (`texte/<film>.ts`) und **Lesefassung** (`docs/sprechtext/<film>.md`) sind gleich; jeder Absatz ist wörtlich die Passage `sprechtext.passage` im Brief seiner Szene. Ein Test hält alle drei gleich. Stimme und Einstellungen je Film stehen in `tools/stimmklon.ts` (Tempo 0,8–1,2), Aussprachehilfen in `tools/stolperstellen.ts`.
2. **Prüfen** (`npm run stimme -- <film>`): Absätze, Zeichen, Stand jeder Aufnahme (fehlt, eigen, veraltet), geschätzte Credits. Ohne Netz.
3. **Platzhalter** (`npm run stimme -- <film> --stub`): ein Ton in der geschätzten Länge (15 Zeichen/s), damit die ganze Kette ohne Kosten läuft.
4. **Generieren**: `npm run stimme -- <film> --plan` gibt die Parameter für den ElevenLabs-Connector aus; generiert wird erst nach Kostenfreigabe und „ja, generieren“, ein laufender Aufruf wird nie wiederholt. Heruntergeladen wird in ein eigenes, leeres Verzeichnis; `npm run stimme -- <film> --ablegen <absatz> <datei> --generierung <id>` prüft die Datei und legt sie nach `ton/<film>/<absatz>.wav`.
5. **Messen** (`npm run stimme -- <film> messen`): hörbare Strecke (Ruhe an den Enden bis auf 0,1 s bei −50 dBFS), Länge, integrierte Lautheit, True Peak nach `ton/messung.json`. Danach im Brief `datei`, `dauer_s` und `dauer_geschaetzt: false` setzen. Liegen die Wörter gleichmäßig vor oder hinter ihren Beats, verschiebt `sprechtext.einsatz_s` den Absatz in der Szene, statt die Bewegung zu stauchen; sonst die Beats an die Wortzeiten legen.
6. **Wortzeiten** (`npm run wortzeit -- <film> [wort]`): anteilig nach Zeichen über die gesprochene Strecke, nach `ton/<film>/wortzeit.tsv`. Kommentare der Form `„Wort“ (Bild)` in `animation.js` prüft `npm run wortzeit -- <film> pruefen`.
7. **Untertitel** (`npm run untertitel -- <film>`): WebVTT nach `ton/<film>/untertitel.vtt`, höchstens zwei Zeilen zu 74 Zeichen, keine Einheit unter 1 s, die letzte läuft nach, bis sie mit 15 Zeichen/s lesbar ist. Nie eingebrannt.
8. **Mischen** (`npm run mischen -- <film>`): Absätze auf den Median des Films (höchstens ±6 dB), Sprache −16 LUFS, Spitze ≤ −1 dBFS über einen Begrenzer mit 5 ms Vorlauf (Befund ab 6 dB Absenkung); Geräusche 12 dB darunter und unter Sprache −6 dB (30 ms Ansprechen, 150 ms Rückstellen); Grundrauschen −60 dBFS mit festem Seed. Läuft ein Absatz über seine Szene, wird nicht gemischt (`--trotzdem` mischt dennoch). Ergebnis `out/ton/<film>-mischung.wav`, Protokoll `ton/<film>/lautheit.tsv`. `npm run szene:vorschau -- <ID>` nimmt die Mischung samt Untertitelspur.

Messung, Wortzeiten, Untertitel und Lautheitsprotokoll sind erzeugt; `npm run erzeugt:pruefen` vergleicht sie.
