// Rigs: Markup und apply passen zueinander, Griffe treffen, Knie zeigen nach vorn, Spiegelung trägt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RIGS } from '../lib/rigs/index.js';
import { testposen } from '../lib/rigs/testposen.js';
import { idVerzeichnis, wendeAn } from '../lib/snapshot.js';
import { walkCycle } from '../lib/motion.js';

for (const [name, r] of Object.entries(RIGS)) {
  test(`${name}: jede ID aus apply steht mit ihrem Attribut im Markup, keine doppelt, kein NaN`, () => {
    for (const dir of [1, -1]) {
      const markup = r.markup('A', { dir });
      const { ids, doppelt } = idVerzeichnis(markup);
      assert.deepEqual(doppelt, []);
      for (const pose of testposen(name)) {
        const liste = r.apply('A', { ...pose.state, dir, x: 900, y: 600 });
        for (const [id, attr, wert] of liste) {
          assert.ok(ids.get(id)?.has(attr), `${id}.${attr} fehlt im Markup`);
          assert.ok(!String(wert).includes('NaN'), `${id}.${attr} = ${wert}`);
        }
        wendeAn(markup, liste);
      }
    }
  });

  test(`${name}: Griff in Reichweite trifft, außer Reichweite wird gemeldet (auch gespiegelt)`, () => {
    const arm = r.ansicht === 'frontal' ? 'armR' : 'armF';
    for (const dir of [1, -1]) {
      const basis = { ...r.defaults, x: 900, y: 600, dir };
      const g = r.gelenke(basis);
      const sch = g[arm].schulter;
      const m = r.spez.massstab;
      const nah = { x: sch.x + dir * 100 * m, y: sch.y + 60 * m };
      const st = { ...basis, [arm]: r.greife(basis, arm, nah) };
      assert.deepEqual(r.pruefeReichweite(st), [], `dir ${dir}`);
      const weit = { x: sch.x + dir * 400 * m, y: sch.y };
      const st2 = { ...basis, [arm]: r.greife(basis, arm, weit) };
      assert.equal(r.pruefeReichweite(st2).length, 1);
    }
  });
}

test('stehend-profil: beim Gehen zeigt das Knie in Blickrichtung, in beide Richtungen', () => {
  const r = RIGS['stehend-profil'];
  for (const dir of [1, -1]) {
    for (let i = 0; i < 30; i++) {
      const g = walkCycle(i / 30);
      const gw = r.gelenke({ ...r.defaults, ...g, x: 900, y: 550, dir });
      for (const bein of ['legF', 'legB']) {
        const { huefte, knie, knoechel } = gw[bein];
        // Knie liegt vor der Linie Hüfte–Knöchel (Kreuzprodukt im Bildschirmsystem, nach Blickrichtung).
        const kreuz = (knoechel.x - huefte.x) * (knie.y - huefte.y) - (knoechel.y - huefte.y) * (knie.x - huefte.x);
        assert.ok(dir * kreuz <= 1e-6, `Knie nach hinten: dir ${dir}, Phase ${i / 30}, ${bein}`);
      }
      const sohle = Math.max(gw.legF.sohle.y, gw.legB.sohle.y);
      assert.ok(Math.abs(sohle - (550 + 210)) < 1e-6, `Fuß nicht am Boden: ${sohle}`);
    }
  }
});

test('sitzend-profil: Füße stehen in Ruhe auf dem Boden (y 760)', () => {
  const r = RIGS['sitzend-profil'];
  const g = r.gelenke({ ...r.defaults, x: 600, y: 620 });
  for (const bein of ['legF', 'legB']) assert.ok(Math.abs(g[bein].sohle.y - 760) < 0.5, `${bein}: ${g[bein].sohle.y}`);
});

test('ein fehlender Teilesatz oder eine unbekannte Handform hält an', () => {
  const r = RIGS['stehend-profil'];
  assert.throws(() => r.markup('A', { teilesatz: 'satz-99' }), /satz-99/);
  assert.throws(() => r.apply('A', { armF: { form: 'faust' } }), /faust/);
});
