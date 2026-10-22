// Markup der Szene aus Rigs und Requisiten, Zuordnung Zustand → Attribute.
// Z-Reihenfolge: Regal hinten rechts, das abgelegte Blatt hinter der Vorderkante des Kastens;
// links Stuhl, Tisch, Monitor, Tastatur und A vor dem Tisch wie in der Vorlage; dann Tisch und Drucker rechts;
// das fliegende Blatt über allem Linken; B vor Regal und Tisch; der Ausdruck in der Hand vor B.
import { svgDocument, beschriftungen } from '../../lib/stage.js';
import { requisite } from '../../lib/props/index.js';
import { rig } from '../../lib/rigs/index.js';
import { zahl } from '../../lib/svg.js';
import { GEO } from './geometry.js';

export const TITEL = 'Demo mit Mimik: Vom Senden zum Ausdruck';
export const DESC =
  'Eine Person am Schreibtisch tippt einen Antrag und schickt ihn ab. Ein Blatt fliegt vom Bildschirm in hohem Bogen zum Drucker. Eine zweite Person, die dort schon wartet, nimmt den Ausdruck, staunt und legt ihn in einen Ablagekasten im Regal.';

const A = GEO.figuren.A;
const B = GEO.figuren.B;
const R = GEO.requisiten;
const D = GEO.ausdruck;
const farben = { akzent: GEO.palette.akzent1, akzent2: GEO.palette.akzent2 };
const blatt = requisite('blatt');

/** Blatt in einer beweglichen Hülle: verschoben, gedreht, skaliert, ein- und ausgeblendet. */
const bewegtesBlatt = (id, pos, massstab) =>
  `<g id="${id}" transform="translate(${zahl(pos.x)} ${zahl(pos.y)}) rotate(0) scale(${zahl(massstab)})" opacity="0">${blatt.markup(`${id}-blatt`, { x: 0, y: 0 }, farben)}</g>`;

export function sceneMarkup() {
  const inhalt = [
    requisite('regal').markup('regal', R.regal, farben),
    bewegtesBlatt('abgelegt', D.einlage, D.massstab),
    requisite('ablagekasten').markup('ablage', R.ablage, farben),
    requisite('buerostuhl').markup('stuhl', R.stuhl, farben, { dir: A.dir }),
    requisite('schreibtisch').markup('tisch', R.tisch, farben, { breite: R.tisch.breite }),
    requisite('monitor').markup('monitor', R.monitor, farben),
    requisite('tastatur').markup('tastatur', R.tastatur, farben),
    rig(A.rig).markup('A', { teilesatz: A.teilesatz, palette: A.palette, dir: A.dir, mimik: true }),
    requisite('schreibtisch').markup('tisch2', R.tisch2, farben, { breite: R.tisch2.breite }),
    requisite('drucker').markup('drucker', R.drucker, farben),
    bewegtesBlatt('flug', GEO.flug.von, 0.2),
    rig(B.rig).markup('B', { teilesatz: B.teilesatz, palette: B.palette, dir: B.dir, mimik: true }),
    bewegtesBlatt('ausdruck', D.innen, D.massstab),
    beschriftungen(GEO.labels),
  ].join('');
  return svgDocument({ titel: TITEL, desc: DESC, inhalt, grund: GEO.palette.grund });
}

const huelle = (p, drehung, massstab) => `translate(${zahl(p.x)} ${zahl(p.y)}) rotate(${zahl(drehung)}) scale(${zahl(massstab)})`;

/** Genau die Attribute, die das Markup schon trägt. */
export function sceneApply(s) {
  return [
    ...rig(A.rig).apply('A', s.A),
    ['tastatur-tasten', 'transform', `translate(0 ${zahl(2 * s.senden.taste)})`],
    ['flug', 'transform', huelle(s.flug.pos, s.flug.drehung, s.flug.massstab)],
    ['flug', 'opacity', s.flug.deckkraft],
    ['drucker', 'transform', `translate(${zahl(R.drucker.x)} ${zahl(R.drucker.y + s.drucker.zittern)})`],
    ['drucker-licht', 'opacity', s.drucker.licht],
    ...rig(B.rig).apply('B', s.B),
    ['ausdruck', 'transform', huelle(s.ausdruck.pos, s.ausdruck.drehung, D.massstab)],
    ['ausdruck', 'opacity', s.ausdruck.deckkraft],
    ['abgelegt', 'transform', huelle(D.einlage, s.abgelegt.drehung, D.massstab)],
    ['abgelegt', 'opacity', s.abgelegt.deckkraft],
  ];
}
