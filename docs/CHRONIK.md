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

## 2026-10-19 · Bündel über Import-Map statt Verkettung

**Anlass:** Abschnitt 15 nennt den Bündler, der mehrzeilige Imports und `export { … }` still verlor. **Alternativen:** einen Parser für Import- und Exportlisten schreiben; esbuild als neue Abhängigkeit. **Grund:** Jedes Modul bleibt ein echtes ES-Modul als `data:`-URL in einer Import-Map; umgeschrieben werden nur relative Modulangaben. Der Browser löst die Listen selbst auf, es gibt keine Form, die verloren gehen kann. Ein nicht relativer Import hält den Build an. **Messung:** Test mit mehrzeiligem Import, `export { … }` und `export *`; Prototyp der Vorlage läuft in Chromium ohne Fehler.

## 2026-10-19 · Das Rig übernimmt die Blickrichtung

**Anlass:** Falle „Knie nach hinten“: Beinwinkel mussten in der Szene mit `-dir` multipliziert werden. **Alternativen:** die Regel dokumentieren und am Standbild prüfen. **Grund:** Der Zustand eines Rigs steht im Figurenrahmen (Blick nach rechts, vorwärts positiv); Spiegelung und Vorzeichen setzt das Rig. Winkel aus `walkCycle` und `ik` gehen unverändert hinein, das `-dir` entfällt. **Messung:** Test: Knie liegt in beide Blickrichtungen über einen ganzen Doppelschritt vor der Linie Hüfte–Knöchel, der tiefste Fuß steht auf y 760.

## 2026-10-19 · Arme absolut, Kopf relativ

**Anlass:** `ik(…, neigung)` im Prompt. **Alternativen:** Armwinkel relativ zum Rumpf. **Grund:** Armwinkel sind absolut, das Rig rechnet die Schulter aus der Rumpfneigung; damit braucht `ik` keine Neigung, und ein Handziel bleibt bei geneigtem Rumpf stehen. Der Kopf ist relativ zum Rumpf, weil er ihm folgt. **Messung:** Reichweitenprüfung im Build über jedes Bild der Vorlage.

## 2026-10-19 · Autoplay-Test mit document-user-activation-required

**Anlass:** Unter `--autoplay-policy=user-gesture-required` lief der Tonkontext in Chromium sofort (`running`), der Test prüfte also nichts. **Alternativen:** nur von Hand im Desktop-Browser prüfen. **Grund:** Für Web Audio wendet Chromium `document-user-activation-required` an; unter dieser Regel meldet der Tonkontext `suspended`, und die Seite wartet bei 0. **Messung:** Seitentest mit beiden Regeln grün.
