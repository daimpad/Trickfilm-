// Remotion-Port (Abschnitt 10.2): das Markup jeder Szene wird vollständig zu JSX gelesen, Attributnamen in
// React-Schreibweise, Zuordnung nur für bekannte IDs; sichtbare Abweichung nach der Schwelle aus Abschnitt 10.3.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alleSzenen, ladeSzene } from '../lib/build.js';
import { idVerzeichnis } from '../lib/snapshot.js';
import { ids, lies, propName, zuordnung } from '../remotion/src/svg';
import { sichtbareFenster } from '../tools/remotion.js';

test('Port: Markup jeder Szene als Baum mit denselben IDs wie im Prototyp', async () => {
  for (const id of alleSzenen()) {
    const sz = await ladeSzene(id);
    const markup = sz.scene.sceneMarkup();
    const baum = lies(markup);
    assert.equal(baum.tag, 'svg');
    assert.deepEqual([...ids(baum)].sort(), [...idVerzeichnis(markup).ids.keys()].sort(), id);
    const liste = sz.scene.sceneApply(sz.animation.computeState(1));
    assert.ok(zuordnung(liste, ids(baum)).size > 0, id);
  }
  assert.throws(() => zuordnung([['fehlt', 'opacity', 1]], new Set(['da'])), /#fehlt/);
  assert.throws(() => lies('<svg><g></svg>'), /schließt/);
  assert.deepEqual(lies('<svg><text>A &amp; B</text></svg>').kinder, [{ tag: 'text', attrs: {}, kinder: ['A & B'] }]);
});

test('Port: Attributnamen in React-Schreibweise', () => {
  assert.equal(propName('stroke-width'), 'strokeWidth');
  assert.equal(propName('class'), 'className');
  assert.equal(propName('aria-labelledby'), 'aria-labelledby');
  assert.equal(propName('xlink:href'), 'xlinkHref');
  assert.equal(propName('viewBox'), 'viewBox');
});

test('Parität: 12 von 25 Pixeln über 30 Stufen machen ein Fenster sichtbar verschieden, Kantenrauschen nicht', () => {
  const B = 10;
  const a = new Uint8Array(B * B * 3).fill(200);
  const b = Uint8Array.from(a);
  for (let i = 0; i < 11; i++) b[i * 3] = 100; // 11 Pixel im ersten Fenster
  assert.equal(sichtbareFenster(a, b, B, B), 0);
  b[5 * B * 3] = 100; // ein zwölftes Pixel liegt im Fenster darunter
  assert.equal(sichtbareFenster(a, b, B, B), 0);
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) b[(y * B + x) * 3] = 100;
  assert.equal(sichtbareFenster(a, b, B, B), 1);
});
