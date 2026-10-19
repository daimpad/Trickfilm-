// Außen: Haus, Tresen, Wegweiser, Wolke, Straße.
import { flaeche, linie, pfad, vieleck } from '../svg.js';
import { BODEN_Y, farbenVon, huelle, teil } from './_basis.js';

/** Haus; pos = Mitte unten. */
export const haus = {
  gruppe: 'aussen',
  markup(id, pos, farben) {
    const f = farbenVon(farben);
    const fenster = (x) =>
      flaeche(x, -160, 52, 52, { fuellung: f.papier }) +
      linie({ x: x + 26, y: -160 }, { x: x + 26, y: -108 }, { art: 'detail' }) +
      linie({ x, y: -134 }, { x: x + 52, y: -134 }, { art: 'detail' });
    return huelle(
      id,
      pos,
      flaeche(-130, -200, 260, 200, { fuellung: f.flaeche2, art: 'haupt' }) +
        vieleck([[-152, -200], [152, -200], [0, -320]], { fuellung: f.akzent, art: 'haupt' }) +
        flaeche(-26, -112, 52, 112, { fuellung: f.dunkel }) +
        fenster(-104) +
        fenster(52),
    );
  },
  ids: (id) => [id],
  anker: (pos) => ({ tuer: { x: pos.x, y: pos.y - 56 }, first: { x: pos.x, y: pos.y - 320 } }),
  rahmen: () => ({ x0: -168, y0: -336, x1: 168, y1: 16 }),
};

/** Tresen; pos = Mitte der Oberkante. */
export const tresen = {
  gruppe: 'aussen',
  markup(id, pos, farben, { breite = 360, boden = BODEN_Y } = {}) {
    const f = farbenVon(farben);
    const unten = boden - pos.y;
    const b2 = breite / 2;
    return huelle(
      id,
      pos,
      flaeche(-b2 + 10, 20, breite - 20, unten - 20, { fuellung: f.flaeche2, art: 'haupt' }) +
        linie({ x: -b2 + 10, y: 20 + (unten - 20) / 2 }, { x: b2 - 10, y: 20 + (unten - 20) / 2 }, { art: 'detail' }) +
        flaeche(-b2, 0, breite, 20, { fuellung: f.dunkel }),
    );
  },
  ids: (id) => [id],
  anker: (pos, { breite = 360 } = {}) => ({ platte: { x: pos.x, y: pos.y }, links: { x: pos.x - breite / 2, y: pos.y } }),
  rahmen: ({ breite = 360 } = {}) => ({ x0: -breite / 2 - 16, y0: -16, x1: breite / 2 + 16, y1: 216 }),
};

/** Wegweiser mit zwei Schildern; pos = Fuß des Pfostens. Schilder als <id>-schild1 (rechts), <id>-schild2 (links). */
export const wegweiser = {
  gruppe: 'aussen',
  markup(id, pos, farben) {
    const f = farbenVon(farben);
    return huelle(
      id,
      pos,
      flaeche(-6, -240, 12, 240, { fuellung: f.dunkel }) +
        teil(`${id}-schild1`, vieleck([[0, -232], [108, -232], [128, -212], [108, -192], [0, -192]], { fuellung: f.flaeche })) +
        teil(`${id}-schild2`, vieleck([[0, -176], [-108, -176], [-128, -156], [-108, -136], [0, -136]], { fuellung: f.flaeche2 })),
    );
  },
  ids: (id) => [id, `${id}-schild1`, `${id}-schild2`],
  anker: (pos) => ({ schild1: { x: pos.x + 56, y: pos.y - 212 }, schild2: { x: pos.x - 56, y: pos.y - 156 } }),
  rahmen: () => ({ x0: -144, y0: -256, x1: 144, y1: 16 }),
};

/** Wolke; pos = Mitte. Die Szene lässt sie über <id> treiben. */
export const wolke = {
  gruppe: 'aussen',
  markup(id, pos, farben) {
    const f = farbenVon(farben);
    return huelle(
      id,
      pos,
      pfad('M-80 20 A30 30 0 0 1 -60 -16 A40 40 0 0 1 10 -34 A34 34 0 0 1 70 -6 A26 26 0 0 1 80 20 Z', { fuellung: f.flaeche }),
    );
  },
  ids: (id) => [id],
  anker: (pos) => ({ mitte: { x: pos.x, y: pos.y } }),
  rahmen: () => ({ x0: -96, y0: -96, x1: 112, y1: 36 }),
};

/** Straße als Band; pos = linkes Ende auf der Mittellinie. */
export const strasse = {
  gruppe: 'aussen',
  markup(id, pos, farben, { breite = 1664 } = {}) {
    const f = farbenVon(farben);
    const striche = [];
    for (let x = 24; x + 48 <= breite; x += 96) striche.push(flaeche(x, -4, 48, 8, { fuellung: f.flaeche, ohneKontur: true }));
    return huelle(id, pos, flaeche(0, -40, breite, 80, { fuellung: f.dunkel }) + striche.join(''));
  },
  ids: (id) => [id],
  anker: (pos, { breite = 1664 } = {}) => ({ links: { x: pos.x, y: pos.y }, rechts: { x: pos.x + breite, y: pos.y } }),
  rahmen: ({ breite = 1664 } = {}) => ({ x0: -16, y0: -56, x1: Math.min(breite, 320) + 16, y1: 56 }),
};
