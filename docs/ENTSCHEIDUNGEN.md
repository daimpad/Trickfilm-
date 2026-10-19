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
