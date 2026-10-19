// Büro: Blatt, Akte, Stapel, Stempel, Kalender, Ablagekasten, Formular mit Feldern.
// Squash und Stretch sind an Requisiten erlaubt (Blatt, Ordner), nie an Figuren.
import { flaeche, kreis, linie, vieleck } from '../svg.js';
import { farbenVon, huelle, teil } from './_basis.js';

/** Blatt; pos = Mitte. Die ganze Gruppe <id> wird bewegt, gedreht, gestaucht. */
export const blatt = {
  gruppe: 'buero',
  markup(id, pos, farben) {
    const f = farbenVon(farben);
    const zeilen = [-20, -8, 4, 16].map((y) => linie({ x: -18, y }, { x: y === 16 ? 4 : 18, y }, { art: 'detail' })).join('');
    return huelle(id, pos, flaeche(-28, -40, 56, 80, { fuellung: f.papier }) + zeilen);
  },
  ids: (id) => [id],
  anker: (pos) => ({ mitte: { x: pos.x, y: pos.y }, griff: { x: pos.x + 20, y: pos.y + 32 } }),
  rahmen: () => ({ x0: -44, y0: -56, x1: 44, y1: 56 }),
};

/** Akte mit Reiter; pos = Mitte unten. */
export const akte = {
  gruppe: 'buero',
  markup(id, pos, farben) {
    const f = farbenVon(farben);
    return huelle(
      id,
      pos,
      flaeche(-40, -112, 32, 14, { fuellung: f.akzent }) +
        flaeche(-40, -100, 80, 100, { fuellung: f.akzent }) +
        flaeche(-24, -72, 48, 20, { fuellung: f.papier, art: 'detail' }),
    );
  },
  ids: (id) => [id],
  anker: (pos) => ({ griff: { x: pos.x + 36, y: pos.y - 50 } }),
  rahmen: () => ({ x0: -56, y0: -128, x1: 56, y1: 16 }),
};

/** Stapel Papier von der Seite; pos = Mitte unten. anzahl Blätter. */
export const stapel = {
  gruppe: 'buero',
  markup(id, pos, farben, { anzahl = 6 } = {}) {
    const f = farbenVon(farben);
    const blaetter = Array.from({ length: anzahl }, (_, i) =>
      flaeche(-32 + (i % 2) * 4, -8 * (i + 1), 60, 8, { fuellung: f.papier, art: 'detail' }),
    ).join('');
    return huelle(id, pos, blaetter);
  },
  ids: (id) => [id],
  anker: (pos, { anzahl = 6 } = {}) => ({ oben: { x: pos.x, y: pos.y - 8 * anzahl } }),
  rahmen: ({ anzahl = 6 } = {}) => ({ x0: -48, y0: -8 * anzahl - 16, x1: 48, y1: 16 }),
};

/** Stempel; pos = Mitte der Stempelfläche unten. Die ganze Gruppe wird bewegt. */
export const stempel = {
  gruppe: 'buero',
  markup(id, pos, farben) {
    const f = farbenVon(farben);
    return huelle(
      id,
      pos,
      flaeche(-8, -40, 16, 26, { fuellung: f.flaeche2 }) +
        flaeche(-26, -14, 52, 14, { fuellung: f.dunkel }) +
        kreis({ x: 0, y: -52 }, 14, { fuellung: f.akzent }),
    );
  },
  ids: (id) => [id],
  anker: (pos) => ({ griff: { x: pos.x, y: pos.y - 52 }, flaeche: { x: pos.x, y: pos.y } }),
  rahmen: () => ({ x0: -42, y0: -82, x1: 42, y1: 16 }),
};

/** Wandkalender; pos = Nagel oben. Das Blatt <id>-blatt lässt sich umblättern. Zahlen setzt die Szene. */
export const kalender = {
  gruppe: 'buero',
  markup(id, pos, farben) {
    const f = farbenVon(farben);
    const raster =
      [56, 80, 104].map((y) => linie({ x: -50, y }, { x: 50, y }, { art: 'detail' })).join('') +
      [-25, 0, 25].map((x) => linie({ x, y: 32 }, { x, y: 120 }, { art: 'detail' })).join('');
    return huelle(
      id,
      pos,
      teil(`${id}-blatt`, flaeche(-50, 8, 100, 112, { fuellung: f.papier }) + flaeche(-50, 8, 100, 24, { fuellung: f.akzent }) + raster) +
        linie({ x: -24, y: 0 }, { x: -24, y: 16 }, { art: 'teil' }) +
        linie({ x: 24, y: 0 }, { x: 24, y: 16 }, { art: 'teil' }),
    );
  },
  ids: (id) => [id, `${id}-blatt`],
  anker: (pos) => ({ kopf: { x: pos.x, y: pos.y + 20 }, feld: { x: pos.x, y: pos.y + 68 } }),
  rahmen: () => ({ x0: -66, y0: -16, x1: 66, y1: 136 }),
};

/** Ablagekasten; pos = Mitte unten. */
export const ablagekasten = {
  gruppe: 'buero',
  markup(id, pos, farben) {
    const f = farbenVon(farben);
    return huelle(
      id,
      pos,
      vieleck([[-60, 0], [60, 0], [68, -40], [-68, -40]], { fuellung: f.flaeche2 }) +
        linie({ x: -56, y: -32 }, { x: 56, y: -32 }, { art: 'detail' }),
    );
  },
  ids: (id) => [id],
  anker: (pos) => ({ einlage: { x: pos.x, y: pos.y - 24 } }),
  rahmen: () => ({ x0: -84, y0: -56, x1: 84, y1: 16 }),
};

/** Formular mit drei Feldern; pos = Mitte. Je Feld eine Gruppe <id>-feldN in der Kästchenmitte für einen Haken. */
export const formular = {
  gruppe: 'buero',
  markup(id, pos, farben) {
    const f = farbenVon(farben);
    const felder = [0, 1, 2]
      .map((i) => {
        const y = -40 + i * 36;
        return (
          flaeche(-44, y, 20, 20, { fuellung: f.flaeche, art: 'detail' }) +
          linie({ x: -16, y: y + 16 }, { x: 44, y: y + 16 }, { art: 'detail' }) +
          teil(`${id}-feld${i + 1}`, '', `translate(-34 ${y + 10})`)
        );
      })
      .join('');
    return huelle(
      id,
      pos,
      flaeche(-60, -80, 120, 160, { fuellung: f.papier }) + linie({ x: -44, y: -60 }, { x: 24, y: -60 }, { art: 'teil' }) + felder,
    );
  },
  ids: (id) => [id, `${id}-feld1`, `${id}-feld2`, `${id}-feld3`],
  anker: (pos) => ({
    feld1: { x: pos.x - 34, y: pos.y - 30 },
    feld2: { x: pos.x - 34, y: pos.y + 6 },
    feld3: { x: pos.x - 34, y: pos.y + 42 },
  }),
  rahmen: () => ({ x0: -76, y0: -96, x1: 76, y1: 96 }),
};
