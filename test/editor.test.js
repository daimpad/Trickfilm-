// Posen-Editor und Posenformat: Ziehen setzt Handziele, Schlüssel ergeben Code, den posenZustand liest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { RIGS } from '../lib/rigs/index.js';
import { posenZustand, spurWert, spurStufe } from '../lib/posen.js';
import { starteBrowser } from '../lib/browser.js';

const WURZEL = join(import.meta.dirname, '..');

test('posenZustand: Spuren, Stufen, Handziele über IK', () => {
  assert.equal(spurWert([[0, 0], [1, 10]], 0.5), 5);
  assert.equal(spurWert([[0, 7]], 3), 7);
  assert.equal(spurStufe([[0, 'offen'], [1, 'greifend']], 0.99), 'offen');
  assert.equal(spurStufe([[0, 'offen'], [1, 'greifend']], 1), 'greifend');
  const r = RIGS['stehend-profil'];
  const P = {
    archetyp: 'stehend-profil',
    dir: -1,
    x: [[0, 900]],
    y: [[0, 550]],
    torso: [[0, 0], [1, 10]],
    armF: { ziel: [[0, 800, 520], [1, 780, 470]], beugeseite: -1, form: [[0, 'offen'], [0.5, 'greifend']] },
    legF: { winkel: [[0, 10, 0, 0]] },
  };
  const z = posenZustand(r, P, 1);
  assert.equal(z.dir, -1);
  assert.equal(z.torso, 10);
  assert.equal(z.armF.form, 'greifend');
  const hand = r.gelenke(z).armF.hand;
  assert.ok(Math.hypot(hand.x - 780, hand.y - 470) < 0.5, JSON.stringify(hand));
  assert.deepEqual(r.pruefeReichweite(z), []);
  assert.throws(() => posenZustand(RIGS['sitzend-profil'], P, 0), /Posen für stehend-profil/);
});

test('Rigs: fuss() stellt den Knöchel aufs Ziel', () => {
  for (const [name, bein] of [['stehend-profil', 'legF'], ['stehend-frontal', 'legR']]) {
    const r = RIGS[name];
    const basis = { ...r.defaults, x: 900, y: 550 };
    const ziel = { x: 930, y: 730 };
    const z = { ...basis, [bein]: r.fuss(basis, bein, ziel) };
    const k = r.gelenke(z)[bein].knoechel;
    assert.ok(Math.hypot(k.x - ziel.x, k.y - ziel.y) < 0.5, `${name}: ${JSON.stringify(k)}`);
  }
});

test('Editor im Browser: Hand ziehen, zwei Schlüssel, Code', async () => {
  const ziel = join(WURZEL, 'out', 'editor', 'test-editor.html');
  execFileSync('node', [join(WURZEL, 'tools', 'posen-editor.js'), '--archetyp', 'stehend-profil', '--frisch', '--ziel', 'out/editor/test-editor.html'], { cwd: WURZEL });
  const browser = await starteBrowser();
  try {
    const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    const fehler = [];
    seite.on('pageerror', (e) => fehler.push(e.message));
    seite.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));
    await seite.goto(pathToFileURL(ziel).href);
    await seite.waitForFunction(() => document.documentElement.dataset.bereit === '1');

    // Bühnenpunkt → Bildschirmpunkt, um echte Zeigerereignisse zu schicken.
    const aufSchirm = (p) =>
      seite.evaluate(({ x, y }) => {
        const svg = document.getElementById('buehne');
        const pt = svg.createSVGPoint();
        pt.x = x;
        pt.y = y;
        const s = pt.matrixTransform(svg.getScreenCTM());
        return { x: s.x, y: s.y };
      }, p);
    const ziehe = async (id, nach) => {
      const griff = (await seite.evaluate(() => window.editor.griffe())).find((g) => g.id === id);
      const von = await aufSchirm(griff.p);
      const bis = await aufSchirm(nach);
      await seite.mouse.move(von.x, von.y);
      await seite.mouse.down();
      await seite.mouse.move(bis.x, bis.y, { steps: 5 });
      await seite.mouse.up();
    };

    await ziehe('armF', { x: 1060, y: 470 });
    await seite.click('#setzen');
    await seite.fill('#zeit', '1');
    await ziehe('rumpf', { x: 1000, y: 420 });
    await ziehe('armF', { x: 1040, y: 520 });
    await seite.click('#setzen');

    const P = await seite.evaluate(() => window.editor.posen());
    assert.equal(P.archetyp, 'stehend-profil');
    assert.equal(P.armF.ziel.length, 2, JSON.stringify(P.armF));
    assert.ok(Math.abs(P.armF.ziel[0][1] - 1060) <= 2 && Math.abs(P.armF.ziel[0][2] - 470) <= 2, JSON.stringify(P.armF.ziel));
    assert.ok(P.torso.length === 2 && P.torso[1][1] > 0, JSON.stringify(P.torso));
    const code = await seite.evaluate(() => window.editor.code());
    assert.match(code, /export const POSEN_A = \{/);
    assert.match(code, /ziel: \[\[0, /);
    // Der Code lässt sich als Modul lesen und ergibt dieselbe Pose.
    const modul = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
    const z = posenZustand(RIGS['stehend-profil'], modul.POSEN_A, 1);
    const hand = RIGS['stehend-profil'].gelenke(z).armF.hand;
    assert.ok(Math.hypot(hand.x - P.armF.ziel[1][1], hand.y - P.armF.ziel[1][2]) < 0.5);

    await seite.screenshot({ path: join(WURZEL, 'out', 'editor', 'test-editor.png'), fullPage: true });
    assert.deepEqual(fehler, []);
  } finally {
    await browser.close();
  }
});
