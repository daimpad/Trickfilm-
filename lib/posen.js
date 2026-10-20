// Schlüsselposen zu einem Rig-Zustand: das Format, das der Posen-Editor ausgibt.
// Zahlenspuren [[t, wert], …] werden mit inOut verbunden, Handformen gelten stufenweise ab ihrem t.
// Arme folgen entweder Handzielen (ziel: [[t, x, y], …], danach IK) oder Winkeln (winkel: [[t, upper, lower], …]).
// Beine folgen Winkeln (winkel: [[t, upper, lower, foot], …]).
import { inOut } from './easing.js';
import { interp } from './motion.js';

const ZAHLEN = ['x', 'y', 'torso', 'head', 'schulter', 'schulterL', 'schulterR', 'deckkraft'];

/** Wert einer Spur bei t; Spalte i der Schlüssel (1 = erster Wert nach t). */
export function spurWert(spur, t, i = 1, ease = inOut) {
  if (!spur?.length) throw new Error('Posen: leere Spur');
  if (spur.length === 1) return spur[0][i];
  return interp(t, spur.map((k) => k[0]), spur.map((k) => k[i]), ease);
}

/** Stufenwert: der letzte Schlüssel mit k[0] ≤ t, sonst der erste. */
export function spurStufe(spur, t) {
  let w = spur[0][1];
  for (const k of spur) if (k[0] <= t) w = k[1];
  return w;
}

/**
 * Zustand des Rigs r bei t aus den Schlüsselposen P. basis liefert Startwerte für alles, was P nicht hat;
 * was P enthält, gilt. Arme mit ziel laufen über r.greife(), damit der Build ihre Reichweite prüfen kann.
 */
export function posenZustand(r, P, t, basis = {}) {
  if (P.archetyp && P.archetyp !== r.name) throw new Error(`Posen für ${P.archetyp}, Rig ist ${r.name}`);
  const z = { ...r.defaults, ...basis };
  for (const k of ZAHLEN) if (P[k]) z[k] = spurWert(P[k], t);
  if (P.dir !== undefined) z.dir = P.dir;
  const arme = r.ansicht === 'frontal' ? ['armL', 'armR'] : ['armF', 'armB'];
  const beine = r.ansicht === 'frontal' ? ['legL', 'legR'] : r.spez.beine === 'keine' ? [] : ['legF', 'legB'];
  for (const bein of beine) {
    const spur = P[bein]?.winkel;
    if (spur) z[bein] = { upper: spurWert(spur, t, 1), lower: spurWert(spur, t, 2), foot: spurWert(spur, t, 3) };
  }
  for (const arm of arme) {
    const p = P[arm];
    if (!p) continue;
    const form = p.form ? spurStufe(p.form, t) : z[arm].form;
    const hand = p.hand ? spurWert(p.hand, t) : z[arm].hand;
    if (p.ziel) {
      const ziel = { x: spurWert(p.ziel, t, 1), y: spurWert(p.ziel, t, 2) };
      z[arm] = r.greife(z, arm, ziel, { beugeseite: p.beugeseite, form, hand });
    } else if (p.winkel) {
      z[arm] = { upper: spurWert(p.winkel, t, 1), lower: spurWert(p.winkel, t, 2), hand, form };
    }
  }
  return z;
}
