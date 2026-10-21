// Seiten für Dritte (Abschnitt 10.4): Muster schlagen ohne Liste an, Markup und Skripte zählen nicht.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pruefeText } from '../tools/nichtoeffentlich';

test('Wortliste: E-Mail, Telefonnummer und Abstimmungsvermerk schlagen an, Markup nicht', () => {
  assert.deepEqual(pruefeText('<p>Kapitel 01 · Demo, 15.0 s</p>').treffer, []);
  assert.deepEqual(pruefeText('<p>Rückfragen an jemand@example.org</p>').treffer, ['E-Mail-Adresse']);
  assert.deepEqual(pruefeText('<p>Tel. +49 30 1234 5678</p>').treffer, ['Telefonnummer']);
  assert.deepEqual(pruefeText('<p>Entwurf, nicht freigegeben</p>').treffer, ['Abstimmungsvermerk']);
  assert.deepEqual(pruefeText('<script>const intern = "a@b.de";</script><p>Ja.</p>').treffer, []);
});
