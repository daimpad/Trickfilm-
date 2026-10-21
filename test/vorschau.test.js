// Vorschau-Video: Mischung der Geräusche wie im Prototyp (lautester Cue 0 dB) und Meldung fehlender Dateien.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { tonArgumente } from '../tools/szene-vorschau.js';

test('Vorschau: Cues verzögert, relativ zum lautesten gepegelt, summiert und auf die Szenendauer gekürzt', () => {
  const ordner = mkdtempSync(join(tmpdir(), 'vorschau-'));
  try {
    mkdirSync(join(ordner, 'final', 'tastenanschlag'), { recursive: true });
    writeFileSync(join(ordner, 'final', 'tastenanschlag', '01.wav'), '');
    writeFileSync(join(ordner, 'final', 'laut-erstaunt.wav'), '');
    const cues = [
      { t: 0.5333, datei: 'tastenanschlag/01', gain_db: -26 },
      { t: 8.3, datei: 'laut-erstaunt', gain_db: -20 },
    ];
    const r = tonArgumente(cues, 15, ordner);
    assert.equal(r.eingaben.filter((a) => a === '-i').length, 2);
    assert.match(r.filter, /\[1:a\]adelay=533\|533,volume=-6\.0dB\[s0\]/);
    assert.match(r.filter, /\[2:a\]adelay=8300\|8300,volume=0\.0dB\[s1\]/);
    assert.match(r.filter, /amix=inputs=2:normalize=0,apad,atrim=0:15\[ton\]$/);
    assert.throws(() => tonArgumente([{ t: 1, datei: 'fehlt', gain_db: -20 }], 15, ordner), /Geräuschdateien fehlen: fehlt/);
    assert.deepEqual(tonArgumente([], 15, ordner), { eingaben: [], filter: null });
  } finally {
    rmSync(ordner, { recursive: true, force: true });
  }
});
