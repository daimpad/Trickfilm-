# Chronik der Regeln

Je Regeländerung ein Absatz: Anlass, Alternativen, Grund, Messung. Die geltende Regel steht in `CLAUDE.md`.

## 2026-10-19 · Node ≥ 22 statt ≥ 20

**Anlass:** Der Prompt nennt Node ≥ 20; `node --test` mit Dateimustern braucht Node 22, und Node 20 ist seit April 2026 ohne Pflege. **Alternativen:** Node 20 halten und Testdateien einzeln aufzählen. **Grund:** Eine gepflegte LTS-Linie und Muster, die neue Tests ohne Änderung am Skript aufnehmen. **Messung:** Cloud-Sitzung mit Node 22.22.0; Prüflauf mit Node 22.

## 2026-10-19 · Playwright 1.56.1 statt der neuesten Fassung

**Anlass:** Referenzbilder müssen in derselben Umgebung entstehen. **Alternativen:** Playwright 1.64.1 mit eigenem Chromium und `executablePath` in der Cloud. **Grund:** 1.56.1 erwartet genau die vorinstallierte Chromium-Revision 1194; Cloud-Sitzung und Prüflauf rendern dann mit demselben Browser. **Messung:** `browsers.json` von playwright-core 1.56.1 nennt Revision 1194; `/opt/pw-browsers/chromium-1194` vorhanden.

## 2026-10-19 · Remotion über die Headless-Shell

**Anlass:** `remotion still` scheiterte mit dem vollen Chromium („Old Headless mode has been removed“). **Alternativen:** Remotion lädt seine eigene Shell nach (in der Cloud ohne Netz nicht sicher). **Grund:** `remotion.config.ts` nimmt die vorinstallierte `chromium_headless_shell-*` aus `PLAYWRIGHT_BROWSERS_PATH`, wenn sie da ist; örtlich bleibt das Verhalten von Remotion. **Messung:** Testkarte „Palette“ als Standbild gerendert und angesehen.

## 2026-10-19 · Lesesperren auf große Textdateien beschränkt

**Anlass:** Die Sperre auf `out/**` und `szenen/*/dist/**` verhinderte auch das Ansehen von Standbildern und Kontaktbögen, das Grundsatz 7 verlangt. **Alternativen:** Bilder in den Scratchpad kopieren. **Grund:** Gesperrt wird, was groß und textförmig ist (gebündelte Seiten, SVG-Standbilder, TSV, Ton); Bilder bleiben lesbar. **Messung:** keine.
