// Markup der Szene aus Rigs und Requisiten, Zuordnung Zustand → Attribute.
// Z-Reihenfolge: Stuhl hinter der Figur; Schreibtisch hinter Tastatur und Monitor;
// Figur vor dem Tisch, damit die Hände über der Tastatur liegen; Haken zuletzt auf dem Schirm.
import { svgDocument, beschriftungen } from '../../lib/stage.js';
import { requisite } from '../../lib/props/index.js';
import { rig } from '../../lib/rigs/index.js';
import { GEO } from './geometry.js';

export const TITEL = 'Vorlage: Eingabe und Bestätigung';
export const DESC =
  'Eine Person sitzt am Schreibtisch und tippt auf der Tastatur. Danach erscheint auf dem Monitor ein grüner Haken, und die Person lehnt sich erleichtert zurück.';

const A = GEO.figuren.A;
const R = GEO.requisiten;
const farben = { akzent: GEO.palette.akzent1 };

export function sceneMarkup() {
  const inhalt = [
    requisite('buerostuhl').markup('stuhl', R.stuhl, farben, { dir: A.dir }),
    requisite('schreibtisch').markup('tisch', R.tisch, farben, { breite: R.tisch.breite }),
    requisite('monitor').markup('monitor', R.monitor, farben),
    requisite('tastatur').markup('tastatur', R.tastatur, farben),
    rig(A.rig).markup('A', { teilesatz: A.teilesatz, palette: A.palette, dir: A.dir }),
    `<g id="pointe" opacity="0">${requisite('haken').markup('haken', R.haken, farben)}</g>`,
    beschriftungen(GEO.labels),
  ].join('');
  return svgDocument({ titel: TITEL, desc: DESC, inhalt, grund: GEO.palette.grund });
}

/** Genau die Attribute, die das Markup schon trägt. */
export function sceneApply(s) {
  return [
    ...rig(A.rig).apply('A', s.A),
    ['pointe', 'opacity', s.haken.deckkraft],
    ['haken', 'transform', `translate(${R.haken.x} ${R.haken.y}) scale(${s.haken.massstab})`],
    ['haken-strich', 'stroke-dashoffset', s.haken.versatz],
  ];
}
