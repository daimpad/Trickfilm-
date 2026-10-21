# Zeichnungen mit KI

**Ziel:** Figuren, Hintergründe und Startbilder aus einem Bildgenerator, die in Strich und Farbe zur Serie passen.
**Voraussetzung:** ein Bildgenerator nach Wahl des Auftrags, ein Vektorisierer (Bildnachzeichner in Illustrator oder Inkscape).
**Ergebnis:** SVG-Lieferobjekte unter `assets/final/`, die nur aus Pfaden bestehen und über die Tokens gefärbt werden.

**Stand:** beschrieben, nicht gebaut. Stilrahmen, Einleseprüfung und `assets/` entstehen mit dem ersten Auftrag, der KI-Bilder braucht (entschieden von Regie, 2026-10-21). Bis dahin gilt dieser Weg als Vorgabe für Hand und Auge.

## Prompt

Ein Prompt wird zusammengesetzt, nicht formuliert:

```
Prompt = Stilrahmen-Kopf + Motivzeile + Stilrahmen-Fuß
```

- Der **Stilrahmen** ist eine Datei (`assets/stil-rahmen.txt`) mit dem einzigen Platzhalter `Subject: <MOTIV>`. Er wird nie je Motiv abgewandelt; seine Konstanz hält die Serie zusammen.
- Die **Motivzeile** beschreibt Bildinhalt, keinen Stil: „eine Person am Stehpult, die ein Blatt hält“, nicht „flach, minimalistisch“. Stilwörter und Verneinungen in der Motivzeile sind Fehler.

## Generat und Lieferobjekt

- **Generate** liegen als PNG unter `assets/generate/<motiv>_<rahmen>_g<NN>.png` und gehen nie in ein Video.
- Aus einem gewählten Generat entsteht durch Vektorisierung und Überarbeitung eine SVG unter `assets/final/`. Nur sie wird verwendet.

## Format der Lieferobjekte

- ausschließlich `<path>` mit absoluten Befehlen;
- in `fill` und `stroke` genau `#000000`, `#ffffff` und `none`; sie stehen für Rollen (Kontur, Fläche, leer), gefärbt wird beim Einlesen über die Tokens;
- runde Linienenden;
- kein `transform`, `text`, `filter`, `mask`, `clipPath`, kein Verlauf.

## Inhalt

- Ziffern dürfen in einer Zeichnung bleiben; Wörter und Buchstaben werden entfernt, Text setzt immer der Code.
- Personen ohne Gesichtszüge, vielfältig, ohne Stereotype, wie unter Gestaltung in `CLAUDE.md`.
- Ein KI-Kennzeichen am Bild ist nicht nötig; wie gekennzeichnet wird, entscheidet der Auftrag.

## Figuren aus KI-Bildern

Eine KI-Zeichnung einer Person ist kein Teilesatz. Soll sie sich bewegen, wird sie in Teile zerlegt und wie jede Zeichnung über die Teile-Werkstatt oder die Vorlage eingelesen (`docs/FIGUREN.md`).
