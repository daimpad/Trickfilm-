// Gemeinsames der Requisiten: Farbrollen aus den Tokens, Hüllgruppe, Hilfen.
// Jede Requisite ist ein Objekt { gruppe, markup(id, pos, farben, opts), ids(id), anker(pos, opts), rahmen(opts) }.
// pos ist der Bezugspunkt der Requisite in Weltkoordinaten; alles andere steht relativ dazu.
import { FARBEN } from '../../tokens/tokens.js';
import { BUEHNE } from '../../tokens/tokens.js';
import { zahl } from '../svg.js';

/** Boden der Bühne in Weltkoordinaten, aus der Rig-Spezifikation übernommen. */
export const BODEN_Y = 760;
/** Tischplatte in Weltkoordinaten. */
export const TISCH_Y = 560;

/** Farbrollen der Requisiten; die Szene überschreibt akzent und akzent2 aus ihrer Palette. */
export function farbenVon(farben = {}) {
  return {
    kontur: FARBEN.schwarz,
    flaeche: FARBEN.weiss,
    flaeche2: FARBEN.primaerHell,
    papier: FARBEN.weiss,
    dunkel: FARBEN.primaerDunkel,
    akzent: FARBEN.rot,
    akzent2: FARBEN.petrol,
    ...Object.fromEntries(Object.entries(farben).filter(([, v]) => v)),
  };
}

/** Hüllgruppe mit Verschiebung; dir spiegelt den Inhalt in einer inneren Gruppe. */
export function huelle(id, pos, inhalt, { dir = 1 } = {}) {
  const innen = dir === 1 ? inhalt : `<g transform="scale(${zahl(dir)} 1)">${inhalt}</g>`;
  return `<g id="${id}" transform="translate(${zahl(pos.x)} ${zahl(pos.y)})">${innen}</g>`;
}

/** Bewegliche Teilgruppe mit Startwert, damit apply ihr Attribut im Markup findet. */
export function teil(id, inhalt, transform = 'translate(0 0)', opacity) {
  return `<g id="${id}" transform="${transform}"${opacity === undefined ? '' : ` opacity="${zahl(opacity)}"`}>${inhalt}</g>`;
}

export const BUEHNEN_BREITE = BUEHNE.breite;
