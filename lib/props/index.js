// Verzeichnis aller Requisiten nach Name. Braucht eine zweite Szene eine Requisite aus ihrer
// requisiten.js, wandert sie hierher.
import * as moebel from './moebel.js';
import * as geraete from './geraete.js';
import * as buero from './buero.js';
import * as aussen from './aussen.js';
import * as zeichen from './zeichen.js';

export const REQUISITEN = { ...moebel, ...geraete, ...buero, ...aussen, ...zeichen };

export const GRUPPEN = ['moebel', 'geraete', 'buero', 'aussen', 'zeichen'];

/** Requisite nach Name; ein unbekannter Name hält an. */
export function requisite(name) {
  const r = REQUISITEN[name];
  if (!r) throw new Error(`Requisite „${name}“ unbekannt; bekannt: ${Object.keys(REQUISITEN).join(', ')}`);
  return r;
}
