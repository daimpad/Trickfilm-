// Zeitfunktion der Szene: nur Zahlen, nur aus GEO, BEATS und CHARAKTER.
import { easeOut, inOut, movingHold, overshoot } from '../../lib/easing.js';
import { envelope, interp, schluessel, summe } from '../../lib/motion.js';
import { atmen, erleichtert, konzentriert, tippen } from '../../lib/spielweise.js';
import { rig } from '../../lib/rigs/index.js';
import { GEO } from './geometry.js';

export const SPEC = { fps: 30, width: 1920, height: 1080, duration: 6.0 };
export const BEATS = {
  tippen: [0.5, 3.0] /* „Formular“ */,
  warten: [3.0, 3.6],
  haken: [3.6, 4.4] /* „bestätigt“ */,
  reaktion: [4.4, 5.4],
};
export const CHARAKTER = { A: { tempo: 1.0, reaktion: 0.8 } };
export const KONTAKTBOGEN = [0.2, 1.0, 2.0, 2.9, 3.4, 3.8, 4.2, 4.9, 5.8];

const F = GEO.figuren.A;
const H = GEO.haende;
const rigA = rig(F.rig);

/** Haltung: konzentriert über die Eingabe gebeugt, nach dem Haken erleichtert zurück. */
function haltung(t) {
  const k = envelope(t, [0.1, 0.5, 3.2, 3.8]);
  const konz = konzentriert(t, k);
  return summe(atmen(t, CHARAKTER.A.tempo), konz, erleichtert(t, BEATS.reaktion[0], CHARAKTER.A.reaktion));
}

/** Hände: von der Tischkante auf die Tastatur, tippen, zurück; in Pausen eine kleine Drift. */
function hand(t, ruhe, taste, phase) {
  const p = schluessel(t, [
    [0, ruhe.x, ruhe.y],
    [BEATS.tippen[0], taste.x, taste.y],
    [BEATS.tippen[1], taste.x, taste.y],
    [BEATS.warten[1], ruhe.x, ruhe.y],
  ]);
  const anschlag = tippen(t, BEATS.tippen, 5 / CHARAKTER.A.tempo, 6, phase).handDy;
  return { x: p.x + movingHold(t, 1, phase), y: p.y + anschlag };
}

export function computeState(t) {
  const h = haltung(t);
  const A = { ...rigA.defaults, x: F.x, y: F.y, dir: F.dir, torso: h.torso ?? 0, head: h.head ?? 0, schulter: h.schulter ?? 0 };
  A.armF = rigA.greife(A, 'armF', hand(t, H.ruheF, H.tasteF, 0));
  A.armB = rigA.greife(A, 'armB', hand(t, H.ruheB, H.tasteB, 0.5));

  // Haken: erscheint mit Überschwingen und zeichnet sich in 0,5 s.
  const [h0] = BEATS.haken;
  const haken = {
    deckkraft: interp(t, [h0, h0 + 0.1], [0, 1], inOut),
    massstab: interp(t, [h0, h0 + 0.4], [0.9, 1], overshoot),
    versatz: interp(t, [h0, h0 + 0.5], [1, 0], easeOut),
  };
  return { A, haken };
}
