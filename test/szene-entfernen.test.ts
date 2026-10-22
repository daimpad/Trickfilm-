// Szene verwerfen (tools/szene-entfernen.ts): die Vorlage und fremde Muster lehnt der Lauf ab, eine Szene mit echter
// Aufnahme oder geteiltem Film bleibt stehen, ohne --ja wird nur genannt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const WURZEL = join(import.meta.dirname, '..');
const lauf = (...a: string[]) => spawnSync('npx', ['tsx', 'tools/szene-entfernen.ts', ...a], { cwd: WURZEL, encoding: 'utf8' });

test('Szene entfernen: Vorlage abgelehnt, Demo mit Aufnahme bleibt, ohne --ja nichts geschieht', () => {
  assert.equal(lauf('_vorlage', '--ja').status, 2);
  const demo = lauf('DEMO-01-buero', '--ja');
  assert.equal(demo.status, 1);
  assert.match(demo.stderr, /echte Aufnahmen|weitere Szenen/);
  assert.ok(existsSync(join(WURZEL, 'szenen', 'DEMO-01-buero', 'brief.yaml')));
  assert.equal(lauf('GIBTS-01-nicht').status, 1);
});
