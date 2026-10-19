// Requisiten: eindeutige IDs, bewegliche Gruppen im Markup, keine Dekoration, Farben nur aus den Tokens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REQUISITEN, GRUPPEN } from '../lib/props/index.js';
import { FARBEN } from '../tokens/tokens.js';
import { idVerzeichnis } from '../lib/snapshot.js';

const ERLAUBTE_FARBEN = new Set([...Object.values(FARBEN), 'none']);

for (const [name, r] of Object.entries(REQUISITEN)) {
  test(`${name}: IDs eindeutig, bewegliche Gruppen mit transform, keine Dekoration`, () => {
    assert.ok(GRUPPEN.includes(r.gruppe), `Gruppe ${r.gruppe}`);
    const svg = r.markup('X', { x: 100, y: 500 }, {});
    const { ids, doppelt } = idVerzeichnis(svg);
    assert.deepEqual(doppelt, []);
    for (const id of r.ids('X')) {
      const attrs = ids.get(id);
      assert.ok(attrs?.has('transform') || attrs?.has('stroke-dashoffset'), `${id} ohne bewegliches Attribut`);
    }
    assert.doesNotMatch(svg, /\s(rx|ry)="|Gradient|<filter|<mask|<style|<animate|<set\b/, 'Dekoration oder Animation im Markup');
    for (const [, farbe] of svg.matchAll(/(?:fill|stroke)="([^"]+)"/g)) assert.ok(ERLAUBTE_FARBEN.has(farbe), `Farbe ${farbe}`);
    assert.doesNotMatch(svg, /NaN|undefined/);
    const rahmen = r.rahmen();
    assert.ok(rahmen.x1 > rahmen.x0 && rahmen.y1 > rahmen.y0);
    assert.equal(typeof r.anker({ x: 0, y: 0 }), 'object');
  });
}

test('Runde Linienenden nur an Effektzeichen', () => {
  for (const [name, r] of Object.entries(REQUISITEN)) {
    const svg = r.markup('X', { x: 0, y: 0 }, {});
    if (r.gruppe !== 'zeichen') assert.doesNotMatch(svg, /stroke-linecap="round"/, name);
  }
});

test('Palette der Szene färbt den Akzent', () => {
  const svg = REQUISITEN.akte.markup('A', { x: 0, y: 0 }, { akzent: FARBEN.gruen });
  assert.match(svg, new RegExp(FARBEN.gruen));
});
