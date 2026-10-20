// Webseite: Ansichten mit Adressen, Reiter, Blättern, Ebenen, Suche, Stil-Editor, Prompts, alte Sprungmarken, ohne Skript eine lange Seite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { starteBrowser } from '../lib/browser.js';
import { setzePlatzhalter } from '../tools/seite-platzhalter.js';

const WURZEL = join(import.meta.dirname, '..');

/** Vorlage mit einfachen Platzhaltern statt des vollen Seitenbaus (der braucht Szenen und Bilder). */
function seiteOhneBau(dir) {
  const ersetzung = { PALETTE: '<div class="farbe">Palette</div>', SKRIPTE: '<tr><td>szene:bauen</td><td>Szene bauen</td></tr>' };
  const html = setzePlatzhalter(readFileSync(join(WURZEL, 'site/index.html'), 'utf8'), ersetzung);
  const ziel = join(dir, 'index.html');
  writeFileSync(ziel, html);
  return pathToFileURL(ziel).href;
}

test('Seite: Ansichten, Reiter, Blättern, Ebenen, Suche, Stil-Editor, Prompts, alte Sprungmarken', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'seite-'));
  const browser = await starteBrowser();
  try {
    const url = seiteOhneBau(dir);
    const seite = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const fehler = [];
    seite.on('pageerror', (e) => fehler.push(e.message));
    const sichtbar = () => seite.evaluate(() => [...document.querySelectorAll('.ansicht')].filter((a) => !a.hidden).map((a) => a.dataset.adresse));
    // hashchange kommt nach dem Klick; auf die erwartete Ansicht warten, dann vergleichen.
    const zeigt = async (adresse) => {
      await seite.waitForFunction((x) => document.querySelector(`.ansicht[data-adresse="${x}"]`)?.hidden === false, adresse, { timeout: 5000 }).catch(() => {});
      assert.deepEqual(await sichtbar(), [adresse]);
    };
    await seite.goto(url);
    assert.deepEqual(await sichtbar(), ['start']);
    assert.equal(await seite.evaluate(() => document.querySelectorAll('.ansicht[id]').length), 0, 'Adressen stehen in data-adresse');

    // Reiter: Bereich zeigen, aktiv markieren.
    await seite.click('.reiter a[data-bereich="werkzeuge"]');
    await zeigt('werkzeuge');
    assert.equal(await seite.getAttribute('.reiter a[data-bereich="werkzeuge"]', 'aria-current'), 'true');

    // Kapitel: Brotkrume, Blättern innerhalb des Bereichs, Titel.
    await seite.goto(`${url}#anleitungen/szene`);
    await zeigt('anleitungen/szene');
    assert.equal(await seite.title(), 'Szene bauen · Trickfilm-Werkstatt');
    assert.deepEqual(await seite.$$eval('.ansicht:not([hidden]) .krume > a, .ansicht:not([hidden]) .krume > span', (e) => e.map((x) => x.textContent)), ['Anleitungen', 'Szene bauen']);
    await seite.click('.ansicht:not([hidden]) .blaettern a:last-child');
    await zeigt('anleitungen/figur');
    assert.equal(await seite.getAttribute('.reiter a[data-bereich="anleitungen"]', 'aria-current'), 'true');

    // Jeder Querverweis und jede Kachel führt zu einer vorhandenen Ansicht.
    const ziele = await seite.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href').slice(1)));
    const adressen = await seite.evaluate(() => [...document.querySelectorAll('.ansicht')].map((a) => a.dataset.adresse));
    assert.deepEqual(ziele.filter((z) => !adressen.includes(z)), [], 'Verweise ohne Ziel');

    // Ebenen: Technik-Blöcke nur mit „Mit Technik“, Wahl bleibt erhalten.
    const technikSichtbar = () => seite.evaluate(() => getComputedStyle(document.querySelector('.ansicht:not([hidden]) .technik')).display !== 'none');
    assert.equal(await technikSichtbar(), false);
    await seite.click('#ebene-technik');
    assert.equal(await technikSichtbar(), true);
    await seite.reload();
    assert.equal(await technikSichtbar(), true, 'Wahl bleibt nach dem Neuladen');
    await seite.click('#ebene-kurz');

    // Suche: Treffer mit Ort, Klick zeigt das Kapitel und markiert die Stelle; Technik-Treffer schalten die Ebene um.
    await seite.fill('#suchfeld', 'Exportregeln');
    const ort = await seite.textContent('#treffer li:first-child .ort');
    assert.equal(ort, 'Figur zeichnen · Technik');
    await seite.keyboard.press('Enter');
    await zeigt('anleitungen/figur');
    assert.equal(await seite.evaluate(() => document.documentElement.classList.contains('mit-technik')), true);
    assert.match(await seite.textContent('.markiert'), /Exportregeln/);
    await seite.fill('#suchfeld', 'gibt es nicht xyz');
    assert.equal(await seite.textContent('#treffer'), 'Nichts gefunden.');

    // Stil-Editor: Regler wirken sofort auf die Variablen, bleiben nach dem Neuladen, Zurücksetzen stellt die Vorgabe her.
    const variable = (n) => seite.evaluate((x) => getComputedStyle(document.documentElement).getPropertyValue(x).trim(), n);
    assert.equal(await seite.isHidden('#stil'), true);
    await seite.click('#stil-knopf');
    assert.equal(await seite.isVisible('#stil'), true);
    assert.equal(await seite.inputValue('[data-var="--st-titelschrift"]'), 'var(--st-font-display)', 'Auswahl kennt ihre Vorgabe');
    await seite.$eval('[data-var="--st-unschaerfe"]', (r) => { r.value = '30'; r.dispatchEvent(new Event('input')); });
    assert.equal(await variable('--st-unschaerfe'), '30px');
    assert.match(await seite.evaluate(() => getComputedStyle(document.querySelector('.kopf')).backdropFilter), /blur\(30px\)/);
    await seite.click('#stil-uebernehmen');
    assert.match(await seite.inputValue('#stil-css'), /--st-unschaerfe: 30px;/);
    await seite.reload();
    assert.equal(await variable('--st-unschaerfe'), '30px', 'Wahl bleibt nach dem Neuladen');
    await seite.click('#stil-knopf');
    await seite.click('#stil-zurueck');
    assert.equal(await variable('--st-unschaerfe'), '18px');
    await seite.keyboard.press('Escape');
    assert.equal(await seite.isHidden('#stil'), true);

    // Prompts: Felder setzen sich in alle Prompts ein, bearbeitete bleiben bis Zurücksetzen, der Editor teilt die Felder.
    await seite.goto(`${url}#anleitungen/szene`);
    await zeigt('anleitungen/szene');
    const prompt = (k) => seite.inputValue(`.ansicht:not([hidden]) .prompt[data-prompt="${k}"] textarea`);
    assert.match(await prompt('szene/bauen'), /^Baue FILM-01-name /);
    await seite.fill('.ansicht:not([hidden]) [data-feld="ID"]', 'DEMO-01-buero');
    assert.match(await prompt('szene/bauen'), /^Baue DEMO-01-buero /);
    assert.match(await prompt('szene/anlegen'), /npm run szene:neu -- DEMO-01-buero/);
    await seite.fill('.ansicht:not([hidden]) .prompt[data-prompt="szene/bauen"] textarea', 'Baue nur.');
    await seite.fill('.ansicht:not([hidden]) [data-feld="ID"]', 'DEMO-02-schalter');
    assert.equal(await prompt('szene/bauen'), 'Baue nur.', 'bearbeiteter Prompt bleibt');
    await seite.click('.ansicht:not([hidden]) .prompt[data-prompt="szene/bauen"] .prompt-zurueck');
    assert.match(await prompt('szene/bauen'), /^Baue DEMO-02-schalter /);
    await seite.goto(`${url}#werkzeuge/prompt-editor`);
    await zeigt('werkzeuge/prompt-editor');
    await seite.selectOption('#editor-vorlage', 'szene/protokoll');
    assert.match(await seite.inputValue('#editor-kasten textarea'), /DEMO-02-schalter/, 'Editor nutzt dieselben Felder');
    assert.equal(await seite.isVisible('#editor-kasten .prompt-kopieren'), true);
    await seite.evaluate(() => localStorage.removeItem('werkstatt-felder'));

    // Alte Sprungmarken der früheren Seite.
    await seite.goto(`${url}#editor`);
    await zeigt('werkzeuge/posen-editor');
    assert.equal(await seite.evaluate(() => location.hash), '#werkzeuge/posen-editor');
    assert.deepEqual(fehler, []);

    // Ohne Skript: alles sichtbar, Sprungmarken als ids, Technik lesbar.
    const ohne = await browser.newPage({ javaScriptEnabled: false });
    await ohne.goto(url);
    const stand = await ohne.evaluate(() => ({ verborgen: document.querySelectorAll('.ansicht[hidden]').length, ids: document.querySelectorAll('.ansicht[id]').length, technik: getComputedStyle(document.querySelector('.technik')).display }));
    assert.equal(stand.verborgen, 0);
    assert.ok(stand.ids > 20);
    assert.notEqual(stand.technik, 'none');
  } finally {
    await browser.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
