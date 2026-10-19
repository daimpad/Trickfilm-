// Build und Prototyp: Die Prüfung schlägt bei Fehlern an; die Seite läuft in Chromium mit beiden Autoplay-Regeln.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { baueSzene, SZENEN } from '../lib/build.js';
import { buendle } from '../lib/bundle.js';
import { starteBrowser } from '../lib/browser.js';

test('Vorlage baut ohne Befund', async () => {
  const r = await baueSzene('_vorlage', { schreiben: true });
  assert.deepEqual(r.befunde, []);
  assert.ok(r.bilder > 100);
});

/** Kopie der Vorlage als Prüfling, mit einer gezielten Störung. */
async function gestoert(name, aendere) {
  const id = `_test-${name}`;
  const ziel = join(SZENEN, id);
  cpSync(join(SZENEN, '_vorlage'), ziel, { recursive: true });
  for (const [datei, f] of Object.entries(aendere)) {
    const p = join(ziel, datei);
    writeFileSync(p, f(readFileSync(p, 'utf8').replace(/id: _vorlage/, `id: ${id}`)));
  }
  writeFileSync(join(ziel, 'brief.yaml'), readFileSync(join(ziel, 'brief.yaml'), 'utf8').replace(/id: _vorlage/, `id: ${id}`));
  try {
    return await baueSzene(id, { schreiben: false });
  } finally {
    rmSync(ziel, { recursive: true, force: true });
  }
}

test('Build findet Handziel außer Reichweite, Beat-Abweichung, NaN und fremde Farbe', async () => {
  const weit = await gestoert('weit', { 'geometry.js': (s) => s.replace('tasteF: { x: 872, y: 542 }', 'tasteF: { x: 1180, y: 542 }') });
  assert.ok(weit.befunde.some((b) => b.art === 'reichweite'), JSON.stringify(weit.befunde));

  const beat = await gestoert('beat', { 'animation.js': (s) => s.replace('warten: [3.0, 3.6]', 'warten: [3.0, 3.7]') });
  assert.ok(beat.befunde.some((b) => b.art === 'brief' && b.text.includes('warten')));

  const nan = await gestoert('nan', { 'animation.js': (s) => s.replace('versatz: interp(', 'versatz: NaN * interp(') });
  assert.ok(nan.befunde.some((b) => b.art === 'bild' && b.text.includes('NaN')));

  const farbe = await gestoert('farbe', { 'brief.yaml': (s) => s.replace('akzent1: "#2F7032"', 'akzent1: "#123456"') });
  assert.ok(farbe.befunde.some((b) => b.text.includes('keine Farbe der Tokens')));
});

test('Bündel löst mehrzeilige Imports und export { … } auf und lehnt Pakete ab', () => {
  const dir = mkdtempSync(join(SZENEN, '..', 'out-bundle-'));
  try {
    writeFileSync(join(dir, 'a.js'), "import {\n  b,\n  c,\n} from './b.js';\nexport { b, c };\n");
    writeFileSync(join(dir, 'b.js'), "const b = 1;\nconst c = 2;\nexport { b, c };\nexport * from './c.js';\n");
    writeFileSync(join(dir, 'c.js'), 'export const d = 3;\n');
    const { module } = buendle([join(dir, 'a.js')], join(dir));
    assert.deepEqual([...module.keys()].sort(), ['tf:a.js', 'tf:b.js', 'tf:c.js']);
    assert.match(module.get('tf:a.js'), /from 'tf:b\.js'/);
    writeFileSync(join(dir, 'd.js'), "import x from 'gsap';\n");
    assert.throws(() => buendle([join(dir, 'd.js')], dir), /nur relative Module/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// document-user-activation-required ist die Regel, die Desktop-Chromium für Web Audio anwendet;
// user-gesture-required greift dort nicht auf AudioContext.
for (const regel of ['no-user-gesture-required', 'document-user-activation-required']) {
  test(`Prototyp in Chromium (Autoplay: ${regel}): läuft ohne Fehler, Springen und Abspielen`, async () => {
    const browser = await starteBrowser([`--autoplay-policy=${regel}`]);
    try {
      const seite = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      const fehler = [];
      seite.on('pageerror', (e) => fehler.push(e.message));
      seite.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));
      await seite.goto(pathToFileURL(join(SZENEN, '_vorlage', 'dist', 'index.html')).href);
      await seite.waitForFunction(() => document.documentElement.dataset.bereit === '1');
      const ohneKlick = await seite.evaluate(() => ({ spielt: window.szene.spielt(), ton: window.szene.tonZustand() }));
      if (regel === 'document-user-activation-required') {
        assert.equal(ohneKlick.spielt, false, 'ohne Klick darf die Szene nicht stumm laufen');
        assert.match(await seite.textContent('#hinweis'), /Abspielen/);
      } else {
        assert.equal(ohneKlick.spielt, true, 'mit erlaubtem Ton startet die Szene');
      }
      await seite.evaluate(() => window.szene.zeige(114));
      assert.equal(await seite.inputValue('#regler'), '114');
      assert.equal(await seite.getAttribute('#pointe', 'opacity'), '1');
      await seite.keyboard.press('ArrowRight');
      assert.equal(await seite.inputValue('#regler'), '115');
      await seite.click('#abspielen');
      await seite.waitForFunction(() => window.szene.spielt());
      assert.deepEqual(fehler, []);
    } finally {
      await browser.close();
    }
  });
}

test('Prototyp mit reduzierter Bewegung steht', async () => {
  const browser = await starteBrowser();
  try {
    const kontext = await browser.newContext({ reducedMotion: 'reduce' });
    const seite = await kontext.newPage();
    await seite.goto(pathToFileURL(join(SZENEN, '_vorlage', 'dist', 'index.html')).href);
    await seite.waitForFunction(() => document.documentElement.dataset.bereit === '1');
    assert.equal(await seite.evaluate(() => window.szene.spielt()), false);
  } finally {
    await browser.close();
  }
});
