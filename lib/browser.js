// Chromium für Standbilder, Kontaktbögen und Seitentests. Playwright 1.56.1 erwartet Revision 1194;
// in Cloud-Sitzungen liegt sie unter PLAYWRIGHT_BROWSERS_PATH, örtlich über `npx playwright install chromium`.
// Nur in Node verwendet, nie im Render.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

/** Browser starten; fehlt Chromium, sagt der Fehler, wie man es holt. */
export async function starteBrowser(args = []) {
  try {
    return await chromium.launch({ args });
  } catch (e) {
    throw new Error(`Chromium nicht startbar (örtlich: npx playwright install chromium; in der Cloud nie installieren).\n${e.message}`);
  }
}

/** Bildschirmfoto einer HTML-Seite als PNG; Breite und Höhe in CSS-Pixeln. */
export async function bildVonHtml(html, { breite, hoehe, pfad, ganzeSeite = false }) {
  const browser = await starteBrowser();
  try {
    const seite = await browser.newPage({ viewport: { width: breite, height: hoehe }, deviceScaleFactor: 1 });
    await seite.setContent(html, { waitUntil: 'load' });
    const png = await seite.screenshot({ fullPage: ganzeSeite, type: 'png' });
    if (pfad) writeFileSync(pfad, png);
    return png;
  } finally {
    await browser.close();
  }
}
