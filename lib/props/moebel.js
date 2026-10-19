// Möbel: Schreibtisch, Bürostuhl, Regal, Schrank, Tür. Zusammengesetzte Flächen mit Kontur.
import { flaeche, kreis, linie } from '../svg.js';
import { BODEN_Y, farbenVon, huelle, teil } from './_basis.js';

/** Schreibtisch; pos = Mitte der Tischoberkante. Schublade beweglich. */
export const schreibtisch = {
  gruppe: 'moebel',
  markup(id, pos, farben, { breite = 440, boden = BODEN_Y } = {}) {
    const f = farbenVon(farben);
    const unten = boden - pos.y;
    const b2 = breite / 2;
    const schublade = teil(
      `${id}-schublade`,
      flaeche(b2 - 176, 24, 136, 72, { fuellung: f.flaeche2 }) + linie({ x: b2 - 132, y: 60 }, { x: b2 - 84, y: 60 }, { art: 'detail' }),
    );
    return huelle(
      id,
      pos,
      flaeche(-b2 + 16, 24, 24, unten - 24, { fuellung: f.flaeche }) +
        flaeche(b2 - 40, 24, 24, unten - 24, { fuellung: f.flaeche }) +
        schublade +
        flaeche(-b2, 0, breite, 24, { fuellung: f.flaeche }),
    );
  },
  ids: (id) => [id, `${id}-schublade`],
  anker: (pos, { breite = 440 } = {}) => ({ platte: { x: pos.x, y: pos.y }, links: { x: pos.x - breite / 2, y: pos.y }, rechts: { x: pos.x + breite / 2, y: pos.y } }),
  rahmen: ({ breite = 440 } = {}) => ({ x0: -breite / 2 - 16, y0: -16, x1: breite / 2 + 16, y1: 216 }),
};

/** Bürostuhl im Profil; pos = Mitte der Sitzfläche oben. Lehne hinter der Blickrichtung dir. */
export const buerostuhl = {
  gruppe: 'moebel',
  markup(id, pos, farben, { boden = BODEN_Y, dir = 1 } = {}) {
    const f = farbenVon(farben);
    const unten = boden - pos.y;
    return huelle(
      id,
      pos,
      flaeche(-58, -150, 18, 140, { fuellung: f.dunkel }) +
        flaeche(-48, -14, 12, 14, { fuellung: f.dunkel }) +
        flaeche(-8, 18, 16, unten - 48, { fuellung: f.flaeche2 }) +
        flaeche(-56, unten - 30, 112, 12, { fuellung: f.dunkel }) +
        kreis({ x: -44, y: unten - 10 }, 10, { fuellung: f.flaeche, art: 'detail' }) +
        kreis({ x: 44, y: unten - 10 }, 10, { fuellung: f.flaeche, art: 'detail' }) +
        flaeche(-48, 0, 96, 18, { fuellung: f.dunkel }),
      { dir },
    );
  },
  ids: (id) => [id],
  anker: (pos) => ({ sitz: { x: pos.x, y: pos.y } }),
  rahmen: () => ({ x0: -80, y0: -166, x1: 80, y1: 146 }),
};

/** Regal; pos = Mitte unten auf dem Boden. */
export const regal = {
  gruppe: 'moebel',
  markup(id, pos, farben) {
    const f = farbenVon(farben);
    const buecher = [
      [-104, -112, 20, 84, f.akzent],
      [-80, -104, 16, 76, f.dunkel],
      [-60, -112, 24, 84, f.akzent2],
      [24, -232, 20, 104, f.dunkel],
      [48, -224, 16, 96, f.akzent],
      [-96, -344, 24, 96, f.akzent2],
    ]
      .map(([x, y, b, h, farbe]) => flaeche(x, y, b, h, { fuellung: farbe, art: 'detail' }))
      .join('');
    return huelle(
      id,
      pos,
      flaeche(-120, -360, 240, 360, { fuellung: f.flaeche, art: 'haupt' }) +
        buecher +
        linie({ x: -120, y: -120 }, { x: 120, y: -120 }, { art: 'teil' }) +
        linie({ x: -120, y: -240 }, { x: 120, y: -240 }, { art: 'teil' }),
    );
  },
  ids: (id) => [id],
  anker: (pos) => ({ fach1: { x: pos.x, y: pos.y - 120 }, fach2: { x: pos.x, y: pos.y - 240 } }),
  rahmen: () => ({ x0: -136, y0: -376, x1: 136, y1: 16 }),
};

/** Schrank; pos = Mitte unten auf dem Boden. */
export const schrank = {
  gruppe: 'moebel',
  markup(id, pos, farben) {
    const f = farbenVon(farben);
    return huelle(
      id,
      pos,
      flaeche(-100, -400, 200, 392, { fuellung: f.flaeche2, art: 'haupt' }) +
        linie({ x: 0, y: -400 }, { x: 0, y: -8 }, { art: 'teil' }) +
        linie({ x: -16, y: -220 }, { x: -16, y: -180 }, { art: 'detail' }) +
        linie({ x: 16, y: -220 }, { x: 16, y: -180 }, { art: 'detail' }) +
        flaeche(-92, -8, 16, 8, { fuellung: f.dunkel, art: 'detail' }) +
        flaeche(76, -8, 16, 8, { fuellung: f.dunkel, art: 'detail' }),
    );
  },
  ids: (id) => [id],
  anker: (pos) => ({ griffL: { x: pos.x - 16, y: pos.y - 200 }, griffR: { x: pos.x + 16, y: pos.y - 200 } }),
  rahmen: () => ({ x0: -116, y0: -416, x1: 116, y1: 16 }),
};

/** Tür mit Zarge; pos = Mitte unten. Der Flügel öffnet über transform an der Angel links (x −70). */
export const tuer = {
  gruppe: 'moebel',
  markup(id, pos, farben) {
    const f = farbenVon(farben);
    const fluegel = teil(
      `${id}-fluegel`,
      flaeche(-70, -290, 140, 290, { fuellung: f.flaeche }) + kreis({ x: 46, y: -140 }, 8, { fuellung: f.dunkel, art: 'detail' }),
    );
    return huelle(id, pos, flaeche(-80, -300, 160, 300, { fuellung: f.dunkel, art: 'haupt' }) + fluegel);
  },
  ids: (id) => [id, `${id}-fluegel`],
  anker: (pos) => ({ klinke: { x: pos.x + 46, y: pos.y - 140 }, angel: { x: pos.x - 70, y: pos.y } }),
  rahmen: () => ({ x0: -96, y0: -316, x1: 96, y1: 16 }),
};
