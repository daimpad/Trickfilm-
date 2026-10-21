// Lieferprüfung (Abschnitt 10.3): Farbverschiebung an Flächen erkennen, Rauschen der Kompression nicht.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prng } from '../lib/zufall.js';
import { farbabweichung } from '../tools/lieferung.js';

const B = 160;
const H = 96;
/** Bild mit zwei Farbflächen und einer Kante dazwischen. */
function bild(verschiebung = 0, rauschen = 0) {
  const ziehe = prng('lieferung-test');
  const b = new Uint8Array(B * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < B; x++) {
      const farbe = x < B / 2 ? [245, 243, 238] : [31, 42, 68];
      for (let k = 0; k < 3; k++) b[(y * B + x) * 3 + k] = Math.max(0, Math.min(255, farbe[k] + verschiebung + Math.round((ziehe() * 2 - 1) * rauschen)));
    }
  }
  return b;
}

test('Farbe: gleiche Bilder 0, Rauschen ±4 mittelt sich weg, Verschiebung um 3 wird gemessen', () => {
  const ref = bild();
  assert.equal(farbabweichung(ref, ref, B, H).max, 0);
  const verrauscht = farbabweichung(ref, bild(0, 4), B, H);
  assert.ok(verrauscht.max < 1, JSON.stringify(verrauscht));
  assert.equal(verrauscht.farben, 2);
  const verschoben = farbabweichung(ref, bild(-3, 0), B, H);
  assert.equal(verschoben.max, 3);
  assert.throws(() => farbabweichung(ref, new Uint8Array(3), B, H), /Bildgrößen/);
});
