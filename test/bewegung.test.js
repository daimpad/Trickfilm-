// Kurven, Bewegung, Zufall, Spielweise: Verträge, die Szenen voraussetzen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KURVEN, anticipate, overshoot, settle, movingHold, snapBei } from '../lib/easing.js';
import { interp, envelope, entlang, ik, fk, walkCycle, GANG_MASSE, bezier2, summe, gangPhase } from '../lib/motion.js';
import { prng, hash } from '../lib/zufall.js';
import { charakter, ueberrascht, tippen } from '../lib/spielweise.js';

const nahe = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const abtasten = (f, n = 400) => Array.from({ length: n + 1 }, (_, i) => f(i / n));

test('jede Kurve beginnt bei 0 und endet bei 1', () => {
  for (const [name, f] of Object.entries(KURVEN)) {
    assert.ok(nahe(f(0), 0), `${name}(0)`);
    assert.ok(nahe(f(1), 1), `${name}(1)`);
  }
});

test('Anlauf etwa 8 %, Überschwingen 10 bis 15 %, Nachschwingen endet genau bei 1', () => {
  const tief = Math.min(...abtasten(anticipate));
  assert.ok(tief < -0.07 && tief > -0.09, `Anlauf ${tief}`);
  const hoch = Math.max(...abtasten(overshoot));
  assert.ok(hoch > 1.1 && hoch < 1.15, `Überschwingen ${hoch}`);
  assert.equal(settle(1), 1);
  assert.ok(Math.max(...abtasten(settle)) > 1, 'Nachschwingen geht über 1');
});

test('Drift bleibt unter 2 px und steht nie eine Sekunde still', () => {
  const werte = Array.from({ length: 300 }, (_, i) => movingHold(i / 30));
  assert.ok(Math.max(...werte.map(Math.abs)) <= 2);
  for (let i = 0; i + 30 < werte.length; i += 30) {
    const fenster = werte.slice(i, i + 30);
    assert.ok(Math.max(...fenster) - Math.min(...fenster) > 0.05, `Stillstand ab Bild ${i}`);
  }
});

test('Pose zu Pose wechselt in 6 Bildern', () => {
  assert.equal(snapBei(1.0 - 0.11, 1.0), 0);
  assert.equal(snapBei(1.0 + 0.11, 1.0), 1);
});

test('interp klemmt an beiden Enden und kennt mehrere Stützstellen', () => {
  assert.equal(interp(-1, [0, 1], [10, 20]), 10);
  assert.equal(interp(2, [0, 1], [10, 20]), 20);
  assert.equal(interp(0.5, [0, 1], [10, 20]), 15);
  assert.equal(interp(1.5, [0, 1, 2], [0, 10, 0]), 5);
  assert.throws(() => interp(0, [0], [1]));
});

test('Hüllkurve, Bahn und Polylinie', () => {
  assert.equal(envelope(0.5, [0, 1, 2, 3]), 0.5);
  assert.equal(envelope(1.5, [0, 1, 2, 3]), 1);
  assert.equal(envelope(3.5, [0, 1, 2, 3]), 0);
  assert.deepEqual(bezier2({ x: 0, y: 0 }, { x: 5, y: 10 }, { x: 10, y: 0 }, 1), { x: 10, y: 0 });
  const p = entlang([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], 0.75);
  assert.ok(nahe(p.x, 10) && nahe(p.y, 5));
});

test('IK trifft jedes Ziel in Reichweite, außerhalb streckt sie sich und meldet es', () => {
  const s = { x: 0, y: 0 };
  for (const z of [{ x: 120, y: 60 }, { x: 40, y: 150 }, { x: -60, y: 100 }, { x: 170, y: 0 }]) {
    const r = ik(s, z, 90, 90);
    assert.ok(r.erreicht);
    const [, , hand] = fk(s, [90, 90], [r.upper, r.lower]);
    assert.ok(Math.hypot(hand.x - z.x, hand.y - z.y) < 0.01, `Ziel ${JSON.stringify(z)}`);
  }
  const weit = ik(s, { x: 300, y: 0 }, 90, 90);
  assert.equal(weit.erreicht, false);
  assert.ok(nahe(weit.hand.x, 180, 0.01));
  // Ellbogen nach unten bei Griff nach vorn, Knie nach vorn bei beugeseite +1.
  assert.ok(ik(s, { x: 150, y: 0 }, 90, 90, -1).ellbogen.y > 0);
  assert.ok(ik(s, { x: 0, y: 150 }, 102, 98, 1).ellbogen.x > 0);
});

test('Gang: tiefster Fuß immer am Boden, Knie nie nach hinten', () => {
  for (let i = 0; i <= 120; i++) {
    const g = walkCycle(i / 60);
    const hoehe = (b) => GANG_MASSE.oberschenkel * Math.cos((b.upper * Math.PI) / 180) + GANG_MASSE.unterschenkel * Math.cos((b.lower * Math.PI) / 180);
    const tiefster = Math.max(hoehe(g.legF), hoehe(g.legB)) + g.bob;
    assert.ok(nahe(tiefster, GANG_MASSE.oberschenkel + GANG_MASSE.unterschenkel, 1e-9), `Phase ${i / 60}`);
    for (const b of [g.legF, g.legB]) assert.ok(b.lower <= b.upper + 1e-9, `Knie nach hinten bei Phase ${i / 60}`);
  }
  const aus = walkCycle(0.3, 0);
  assert.equal(aus.bob, 0);
  assert.equal(gangPhase(280), 2);
});

test('Zufall ist mit gleichem Seed gleich, mit anderem verschieden', () => {
  const a = prng('DEMO');
  const b = prng('DEMO');
  const folgeA = [a(), a(), a()];
  assert.deepEqual(folgeA, [b(), b(), b()]);
  assert.notDeepEqual(folgeA, [prng('ANDERS')(), 0, 0].slice(0, 3));
  assert.equal(hash('a'), hash('a'));
});

test('Spielweise: Charakterkarte prüft das Tempo, Rezepte addieren sich', () => {
  assert.throws(() => charakter({ tempo: 2 }));
  const s = summe({ torso: 2, armF: { upper: 1 } }, ueberrascht(10, 0, 1));
  assert.ok(s.torso < 0 && s.armF.upper > 1);
  const t = tippen(0.05, [0, 1], 5);
  assert.ok(t.handDy > 0);
});
