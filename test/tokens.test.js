// Prüft die Tokens: Kontrastrechnung, Farbkommentare, Flächen, Lesetakt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FARBEN, SEKUNDAER, FLAECHEN, ROLLEN, MINDESTKONTRAST, RASTER, BUEHNE,
  kontrast, aufWeiss, lesezeitFrames,
} from '../tokens/tokens.js';

test('Kontrast Schwarz auf Weiß ist 21:1, gleiche Farben 1:1', () => {
  assert.equal(kontrast('#000000', '#FFFFFF'), 21);
  assert.equal(kontrast('#1F2A44', '#1F2A44'), 1);
});

test('jeder Farbkommentar nennt den gerechneten Kontrast auf Weiß', () => {
  const quelle = readFileSync(new URL('../tokens/tokens.js', import.meta.url), 'utf8');
  const zeilen = [...quelle.matchAll(/^\s+(\w+): '(#[0-9A-Fa-f]{6})', \/\/ (\d+\.\d\d):1 auf Weiß$/gm)];
  assert.equal(zeilen.length, Object.keys(FARBEN).length, 'jede Farbe braucht einen Kontrastkommentar');
  for (const [, name, hex, kommentar] of zeilen) {
    assert.equal(FARBEN[name], hex);
    assert.equal(kontrast(hex, '#FFFFFF').toFixed(2), kommentar, `Kommentar bei ${name} veraltet`);
  }
});

test('Sekundärfarben tragen als grafisches Objekt auf Weiß und auf der hellen Primärfarbe', () => {
  for (const name of SEKUNDAER) {
    assert.ok(kontrast(FARBEN[name], FARBEN.weiss) >= MINDESTKONTRAST.grafik, name);
    assert.ok(kontrast(FARBEN[name], FARBEN.primaerHell) >= MINDESTKONTRAST.grafik, name);
  }
});

test('Textfarbe ist auf jeder Fläche und auf der hellen Primärfarbe lesbar', () => {
  for (const [name, flaeche] of Object.entries(FLAECHEN)) {
    assert.ok(kontrast(ROLLEN.text, flaeche) >= MINDESTKONTRAST.text, name);
  }
  assert.ok(kontrast(ROLLEN.text, FARBEN.primaerHell) >= MINDESTKONTRAST.text);
});

test('Flächen sind deckende Hexwerte mit 8 % über Weiß', () => {
  assert.equal(aufWeiss('#000000', 0.08), '#EBEBEB');
  assert.equal(aufWeiss('#FFFFFF', 0.08), '#FFFFFF');
  for (const flaeche of Object.values(FLAECHEN)) assert.match(flaeche, /^#[0-9A-F]{6}$/);
});

test('Lesetakt: (Zeichen / 12) * 30 + 45 Frames, aufgerundet', () => {
  assert.equal(lesezeitFrames(0), 45);
  assert.equal(lesezeitFrames(12), 75);
  assert.equal(lesezeitFrames(40), 145);
});

test('Raster und Bühne stimmen mit der Vorgabe', () => {
  assert.ok(RASTER.every((a) => a % 8 === 0));
  assert.deepEqual([BUEHNE.breite, BUEHNE.hoehe, BUEHNE.fps], [1920, 1080, 30]);
  assert.equal(BUEHNE.hoehe - BUEHNE.schutzzoneUnten, 940);
});
