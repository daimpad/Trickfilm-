# Lizenzen und Fassungen

Stand: **2026-10-19**. Die Fassungen sind an diesem Tag gegen die Paketquelle geprüft. Remotion ist an der Lizenzdatei des Pakets geprüft. Die Angaben zu ElevenLabs stammen aus dem Einrichtungsprompt und sind **noch nicht an der Quelle geprüft**; das geschieht vor der ersten Kundenlieferung.

## Remotion

Frei (auch kommerziell) für Einzelpersonen, gewinnorientierte Organisationen mit bis zu drei Beschäftigten, gemeinnützige Organisationen und zur Erprobung ohne kommerzielle Nutzung. Alle anderen brauchen eine Company License. Quelle: `node_modules/remotion/LICENSE.md` der Fassung 4.0.535, gelesen am 2026-10-19.

## ElevenLabs

Generierungen (Stimme, Geräusche, Laute) sind je nach Tarif kommerziell nutzbar. Vor einer Kundenlieferung den aktuellen Tarif und die Nutzungsbedingungen prüfen, ungeprüft. Herkunft jeder Generierung steht in `lib/sfx/roh/herkunft.tsv` (ab Phase 4).

## Schrift

Film: Arial (System) und Liberation Sans (SIL Open Font License 1.1, in der Cloud-Umgebung installiert). Keine Webfonts.

Webseite (`site/schriften/`, Teilmenge Latein aus dem Google-Fonts-Verzeichnis, geprüft 2026-10-20; Lizenztexte daneben):

| Datei | Schrift | Lizenz |
|---|---|---|
| `bricolage-grotesque.woff2` | Bricolage Grotesque, variabel (opsz 12–96, wght 400–800) | SIL OFL 1.1 (`OFL-bricolagegrotesque.txt`) |
| `fraunces-kursiv.woff2` | Fraunces Italic, variabel (opsz 9–144, wght 300–600) | SIL OFL 1.1 (`OFL-fraunces.txt`) |
| `instrument-sans.woff2` | Instrument Sans, variabel (wght 400–700) | SIL OFL 1.1 (`OFL-instrumentsans.txt`) |
| `inter.woff2` | Inter, variabel (wght 400–800) | SIL OFL 1.1 (`OFL-inter.txt`) |

## Fremdmaterial

Noch keines. Jede Stock-Quelle bekommt einen Registereintrag mit Quelle, Urheber, Lizenz und Abrufdatum.

## Gepinnte Fassungen

Geprüft am 2026-10-19 gegen die npm-Paketquelle. Gewählt wurde je Paket eine Fassung, die mindestens rund eine Woche alt ist, außer bei Patch-Fassungen einer Linie, die schon länger besteht.

| Paket | Fassung | erschienen | neueste am Prüftag | Grund der Wahl |
|---|---|---|---|---|
| remotion | 4.0.535 | 2026-10-12 | 4.0.537 (2026-10-19) | eine Woche alt; 4.0.537 erst am Prüftag erschienen |
| @remotion/cli | 4.0.535 | 2026-10-12 | 4.0.537 | gleiche Fassung wie remotion, Pflicht |
| react, react-dom | 19.3.1 | 2026-10-14 | 19.3.1 | Patch der Linie 19.3 (seit 2026-09-09) |
| zod | 4.5.4 | 2026-08-29 | 4.6.7 | die Fassung, die Remotion 4.0.535 verlangt (entschieden von Regie, 2026-10-21) |
| typescript | 5.9.3 | 2025-09-30 | 7.0.2 | bewährte Linie; 6 und 7 sind neue Hauptlinien |
| tsx | 4.23.15 | 2026-09-20 | 4.23.15 | |
| playwright | 1.56.1 | 2025-10-17 | 1.64.1 | erwartet die vorinstallierte Chromium-Revision 1194 |
| @types/react | 19.3.0 | 2026-09-09 | 19.3.0 | |
| @types/node | 22.20.5 | 2026-10-01 | 26.6.5 | passend zu Node 22 |

Alle transitiven `@remotion/*`-Pakete stehen auf 4.0.535; der Prüflauf hält das fest.
