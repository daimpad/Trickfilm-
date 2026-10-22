// Mimik (docs/MIMIK.md): Ausdrücke vollständig und mischbar, Schlüssel über die Zeit, Blinzeln mit festem Seed,
// Gesicht nur im Markup, wenn das Rig mit mimik: true gezeichnet wird, und jeder Ausdruck in jeder Ansicht anwendbar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUSDRUECKE, blinzeln, gesicht, mische, mimikZustand, mitBlinzeln } from '../lib/mimik.js';
import { RIGS } from '../lib/rigs/index.js';
import { idVerzeichnis, wendeAn } from '../lib/snapshot.js';

test('Mimik: Ausdrücke sind vollständig, ein unbekannter Name hält an, Mischen trifft beide Enden', () => {
  for (const n of Object.keys(AUSDRUECKE)) {
    const g = gesicht(n);
    assert.deepEqual(Object.keys(g).sort(), ['blick', 'braue', 'lid', 'mund']);
    assert.ok(g.lid >= 0 && g.lid <= 1 && g.mund.breite >= 0.5 && g.mund.breite <= 1.3, n);
  }
  assert.throws(() => gesicht('grinsen'), /unbekannt/);
  assert.deepEqual(mische('neutral', 'staunen', 0), gesicht('neutral'));
  assert.deepEqual(mische('neutral', 'staunen', 1), gesicht('staunen'));
  assert.equal(mische('neutral', 'staunen', 0.5).mund.offen, 0.4);
});

test('Mimik: Schlüssel über die Zeit, vor dem ersten und nach dem letzten gilt dieser', () => {
  const k = [[1, 'neutral'], [2, 'staunen']];
  assert.deepEqual(mimikZustand(k, 0), gesicht('neutral'));
  assert.deepEqual(mimikZustand(k, 3), gesicht('staunen'));
  const mitte = mimikZustand(k, 1.5).mund.offen;
  assert.ok(mitte > 0.3 && mitte < 0.5, String(mitte));
  assert.throws(() => mimikZustand([], 0), /keine Schlüssel/);
});

test('Mimik: Blinzeln deterministisch, 3 bis 6 s Abstand, zusätzliche Lidschläge an genannten Zeiten', () => {
  const werte = Array.from({ length: 1800 }, (_, i) => blinzeln(i / 30, 'A'));
  assert.deepEqual(werte, Array.from({ length: 1800 }, (_, i) => blinzeln(i / 30, 'A')));
  assert.ok(werte.every((v) => v >= 0 && v <= 1));
  // Lidschläge in 60 s: Anstiege von 0 aus zählen.
  const schlaege = werte.filter((v, i) => v > 0 && (werte[i - 1] ?? 0) === 0).length;
  assert.ok(schlaege >= 10 && schlaege <= 20, String(schlaege));
  assert.notDeepEqual(werte, Array.from({ length: 1800 }, (_, i) => blinzeln(i / 30, 'B')));
  assert.ok(blinzeln(2.06, 'X', { extra: [2], start: 100 }) > 0.999);
  assert.equal(blinzeln(1.9, 'X', { extra: [2], start: 100 }), 0);
  assert.equal(mitBlinzeln(gesicht('freude'), 1).lid, 1);
});

test('Mimik: Gesicht nur mit mimik: true im Markup, jeder Ausdruck in jeder Ansicht anwendbar', () => {
  for (const [name, r] of Object.entries(RIGS)) {
    const ohne = r.markup('A');
    assert.ok(!idVerzeichnis(ohne).ids.has('A-gesicht'), name);
    const mit = r.markup('A', { mimik: true });
    const ids = idVerzeichnis(mit).ids;
    assert.ok(ids.has('A-gesicht') && ids.has('A-mund') && ids.has('A-auge-1'), name);
    assert.equal(ids.has('A-auge-2'), r.ansicht === 'frontal', name);
    for (const n of Object.keys(AUSDRUECKE)) {
      const svg = wendeAn(mit, r.apply('A', { ...r.defaults, gesicht: n }));
      assert.ok(!/NaN|undefined/.test(svg), `${name} ${n}`);
    }
    // Ohne gesicht im Zustand bleibt die Zuordnung frei von Gesichts-IDs, auch bei einem Markup mit Gesicht.
    assert.ok(!r.apply('A', r.defaults).some(([id]) => id.startsWith('A-auge')), name);
  }
});

test('Kopfmitte: gelenke() nennt kopf, er folgt Nacken und Kopfdrehung', () => {
  for (const [name, r] of Object.entries(RIGS)) {
    const g = r.gelenke(r.defaults);
    assert.ok(Number.isFinite(g.kopf?.x) && Number.isFinite(g.kopf?.y), name);
    assert.ok(g.kopf.y < g.nacken.y, `${name}: Kopf über dem Nacken`);
    const gedreht = r.gelenke({ ...r.defaults, head: (r.defaults.head ?? 0) + 30 });
    assert.notDeepEqual(gedreht.kopf, g.kopf, `${name}: Kopf dreht mit`);
    assert.deepEqual(gedreht.nacken, g.nacken, name);
  }
});
