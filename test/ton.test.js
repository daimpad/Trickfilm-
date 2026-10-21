// Stimme, Wortzeiten, Untertitel, Mischung (Abschnitt 9): Register gleich Dokument gleich Brief, Regeln der Untertitel,
// Pegel und Ducking, Grundrauschen mit festem Seed, integrierte Lautheit gegen ffmpeg.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { leseBrief } from '../lib/brief.js';
import { integriert, RATE } from '../lib/sfx/lautheit.js';
import { absaetzeAusDokument, geplanteDauer } from '../lib/ton/sprechtext.js';
import { hoerbar, platzhalter } from '../lib/ton/stimme.js';
import { einheiten, einsaetzeIn, umbrechen, untertitel, wortzeiten, ZEILE_MAX } from '../lib/ton/zeitleiste.js';
import { ducking, grundrauschen, pegelPlan } from '../lib/ton/mischung.js';

const WURZEL = join(import.meta.dirname, '..');

test('Sprechtext: Register und Dokument gleich, jeder Absatz gleich der Passage im Brief seiner Szene', async () => {
  for (const datei of readdirSync(join(WURZEL, 'texte')).filter((f) => f.endsWith('.ts'))) {
    const film = datei.replace(/\.ts$/, '');
    const { ABSAETZE } = await import(join(WURZEL, 'texte', datei));
    const dok = absaetzeAusDokument(readFileSync(join(WURZEL, 'docs', 'sprechtext', `${film}.md`), 'utf8'));
    assert.deepEqual(dok, ABSAETZE.map((a) => ({ id: a.id, szene: a.szene, text: a.text })), `${film}: texte/${datei} und docs/sprechtext/${film}.md`);
    for (const a of ABSAETZE) {
      const brief = leseBrief(readFileSync(join(WURZEL, 'szenen', a.szene, 'brief.yaml'), 'utf8'));
      assert.equal(brief.sprechtext.passage, a.text, `${a.id}: Passage im Brief von ${a.szene}`);
    }
  }
});

test('Stimme: Platzhalter in geplanter Länge, Ruhe an den Enden bis auf 0,1 s', () => {
  const x = platzhalter(geplanteDauer('x'.repeat(30)));
  assert.equal(x.length, 2 * RATE);
  const mitRuhe = new Float32Array(3 * RATE);
  mitRuhe.set(x, RATE / 2);
  const h = hoerbar(mitRuhe);
  assert.ok(Math.abs(h.start - 0.4) < 0.01 && Math.abs(h.ende - 2.6) < 0.01, JSON.stringify(h));
});

test('Wortzeiten: anteilig nach Zeichen über die gesprochene Strecke, steigend, Kommentare „Wort“ (Zahl)', () => {
  const w = wortzeiten('Ein Antrag ist schnell ausgefüllt.', { laenge_s: 2.2 }, 30);
  assert.equal(w[0].t, 0.1);
  assert.ok(w.every((x, i) => i === 0 || x.t > w[i - 1].t));
  assert.equal(w[4].sauber, 'ausgefüllt');
  assert.deepEqual(einsaetzeIn('tippen: [0.5, 3.0] /* „Antrag“ (15) */'), [{ wort: 'Antrag', bild: 15, zeile: 1 }]);
});

test('Untertitel: zwei Zeilen zu höchstens 74 Zeichen, keine Einheit unter 1 s, die letzte läuft lesbar nach', () => {
  const lang = 'Drüben am Drucker wartet schon jemand, nimmt das Blatt und staunt: So schnell ging das noch nie, und dann noch einmal, weil es so schön war.';
  for (const e of einheiten(lang)) {
    const zeilen = umbrechen(e);
    assert.ok(zeilen.length <= 2 && zeilen.every((z) => z.length <= ZEILE_MAX), e);
  }
  assert.deepEqual(umbrechen('Ein Antrag ist schnell ausgefüllt. Ein Klick auf Senden, und er ist unterwegs.'), ['Ein Antrag ist schnell ausgefüllt.', 'Ein Klick auf Senden, und er ist unterwegs.']);
  // Kurz gesprochen: die Einheit läuft in die Stille nach, bis sie mit 15 Zeichen je Sekunde lesbar ist.
  const u = untertitel([{ text: 'Ein Antrag ist schnell ausgefüllt.', szeneStart: 0, szeneEnde: 6, messung: { laenge_s: 1 } }]);
  assert.equal(u.length, 1);
  assert.ok(u[0].ende - u[0].start >= 34 / 15 - 0.01, JSON.stringify(u));
  // Nie über das Ende der Szene hinaus, nie kürzer als 1 s.
  const v = untertitel([{ text: 'Ja.', szeneStart: 0, szeneEnde: 0.8, messung: { laenge_s: 0.5 } }]);
  assert.ok(v[0].ende <= 0.8);
  const w = untertitel([{ text: 'Ja.', szeneStart: 0, szeneEnde: 5, messung: { laenge_s: 0.4 } }]);
  assert.ok(w[0].ende - w[0].start >= 1);
});

test('Mischung: Absätze auf den Median, höchstens ±6 dB, Median auf −16 LUFS, Spitze höchstens −1 dBFS', () => {
  const p = pegelPlan([
    { id: 'a', lufs_i: -20, true_peak_dbtp: -8 },
    { id: 'b', lufs_i: -22, true_peak_dbtp: -10 },
    { id: 'c', lufs_i: -32, true_peak_dbtp: -20 },
  ]);
  assert.equal(p.median, -22);
  assert.deepEqual(p.absaetze.map((x) => x.db), [4, 6, 12]);
  assert.match(p.befunde.join(), /c: nach dem Pegeln -20\.0 LUFS/);
  assert.match(p.hinweise.join(), /Streuung/);
  const laut = pegelPlan([{ id: 'x', lufs_i: -20, true_peak_dbtp: -2 }]);
  assert.equal(laut.absaetze[0].db, 1, 'Spitze begrenzt die Anhebung');
});

test('Mischung: Ducking −6 dB unter Sprache mit 30 ms Ansprechen und 150 ms Rückstellen; Rauschen −60 dBFS mit festem Seed', () => {
  const sprache = new Float32Array(RATE);
  const bei = (s) => Math.round(s * RATE);
  for (let i = bei(0.2); i < bei(0.6); i++) sprache[i] = 0.3 * Math.sin((2 * Math.PI * 200 * i) / RATE);
  const d = ducking(sprache);
  assert.equal(d[bei(0.1)], 1);
  assert.ok(Math.abs(20 * Math.log10(d[bei(0.55)]) + 6) < 0.3, String(d[bei(0.55)]));
  assert.ok(d[bei(0.95)] > 0.9, 'nach 350 ms fast zurück');
  const r = grundrauschen(RATE);
  const effektiv = Math.sqrt(r.reduce((s, v) => s + v * v, 0) / r.length);
  assert.ok(Math.abs(20 * Math.log10(effektiv) + 60) < 0.2);
  assert.deepEqual(grundrauschen(16), grundrauschen(16));
});

test('Lautheit: integriert mit Gates stimmt mit ffmpeg überein', () => {
  const n = RATE * 6;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    x[i] = (t > 1 && t < 4 ? 0.3 : 0.03) * Math.sin(2 * Math.PI * 440 * t) + (t > 4.5 ? 0.1 * Math.sin(2 * Math.PI * 1000 * t) : 0);
  }
  const r = spawnSync('ffmpeg', ['-nostats', '-hide_banner', '-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', '-', '-af', 'ebur128', '-f', 'null', '-'], { input: Buffer.from(x.buffer), encoding: 'utf8' });
  const ffmpeg = Number(/I:\s*(-?[\d.]+) LUFS/.exec(r.stderr.split('Summary')[1])[1]);
  assert.ok(Math.abs(integriert(x) - ffmpeg) < 0.1, `${integriert(x)} gegen ${ffmpeg}`);
});
