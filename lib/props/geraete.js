// Geräte: Monitor, Tastatur, Maus, Drucker, Telefon, Kabel mit Puls.
import { flaeche, kreis, linie, pfad, vieleck, zahl } from '../svg.js';
import { farbenVon, huelle, teil } from './_basis.js';

/** Monitor; pos = Mitte des Fußes auf der Tischplatte. Bildinhalt in der Gruppe <id>-bild (Mitte des Schirms). */
export const monitor = {
  gruppe: 'geraete',
  markup(id, pos, farben, { bild = '' } = {}) {
    const f = farbenVon(farben);
    return huelle(
      id,
      pos,
      flaeche(-44, -10, 88, 10, { fuellung: f.dunkel }) +
        flaeche(-7, -60, 14, 50, { fuellung: f.flaeche2 }) +
        flaeche(-110, -200, 220, 140, { fuellung: f.dunkel }) +
        flaeche(-98, -188, 196, 116, { fuellung: f.flaeche2, art: 'detail' }) +
        teil(`${id}-bild`, bild, 'translate(0 -130)') +
        // Hell auf dem dunklen Rahmen, damit die Leuchte als grafisches Objekt 3:1 erreicht.
        teil(`${id}-leuchte`, kreis({ x: 92, y: -66 }, 4, { fuellung: f.papier, ohneKontur: true }), 'translate(0 0)', 1),
    );
  },
  ids: (id) => [id, `${id}-bild`, `${id}-leuchte`],
  anker: (pos) => ({ bildMitte: { x: pos.x, y: pos.y - 130 }, bildGroesse: { x: 196, y: 116 } }),
  rahmen: () => ({ x0: -126, y0: -216, x1: 126, y1: 16 }),
};

/** Tastatur; pos = Mitte unten auf der Tischplatte. Tasten senken sich über <id>-tasten. */
export const tastatur = {
  gruppe: 'geraete',
  markup(id, pos, farben) {
    const f = farbenVon(farben);
    const tasten = [-56, -32, -8, 16, 40]
      .map((x) => linie({ x, y: -9 }, { x: x + 16, y: -9 }, { art: 'detail' }))
      .join('');
    return huelle(
      id,
      pos,
      vieleck([[-80, 0], [80, 0], [76, -16], [-76, -16]], { fuellung: f.flaeche2 }) + teil(`${id}-tasten`, tasten),
    );
  },
  ids: (id) => [id, `${id}-tasten`],
  anker: (pos) => ({ tasten: { x: pos.x, y: pos.y - 16 }, links: { x: pos.x - 40, y: pos.y - 16 }, rechts: { x: pos.x + 40, y: pos.y - 16 } }),
  rahmen: () => ({ x0: -96, y0: -32, x1: 96, y1: 16 }),
};

/** Maus; pos = Mitte unten. Die Taste senkt sich über <id>-taste (Klick). */
export const maus = {
  gruppe: 'geraete',
  markup(id, pos, farben) {
    const f = farbenVon(farben);
    return huelle(
      id,
      pos,
      pfad('M18 -2 C32 -2 36 0 48 0', { art: 'detail' }) +
        teil(`${id}-taste`, pfad('M-18 0 A18 13 0 0 1 18 0 Z', { fuellung: f.flaeche2 }) + linie({ x: 0, y: -13 }, { x: 0, y: -6 }, { art: 'detail' })),
    );
  },
  ids: (id) => [id, `${id}-taste`],
  anker: (pos) => ({ oben: { x: pos.x, y: pos.y - 13 } }),
  rahmen: () => ({ x0: -32, y0: -32, x1: 56, y1: 16 }),
};

/** Drucker; pos = Mitte unten. Papierfach <id>-fach, Ausgabe <id>-ausgabe, Licht <id>-licht. */
export const drucker = {
  gruppe: 'geraete',
  markup(id, pos, farben) {
    const f = farbenVon(farben);
    return huelle(
      id,
      pos,
      teil(`${id}-fach`, flaeche(-70, -112, 96, 32, { fuellung: f.papier, art: 'detail' })) +
        flaeche(-90, -80, 180, 80, { fuellung: f.flaeche2 }) +
        linie({ x: -60, y: -40 }, { x: 60, y: -40 }, { art: 'teil' }) +
        teil(`${id}-ausgabe`, vieleck([[-64, -32], [64, -32], [80, -16], [-80, -16]], { fuellung: f.flaeche, art: 'detail' })) +
        teil(`${id}-licht`, kreis({ x: 72, y: -62 }, 6, { fuellung: f.akzent2, art: 'detail' }), 'translate(0 0)', 1),
    );
  },
  ids: (id) => [id, `${id}-fach`, `${id}-ausgabe`, `${id}-licht`],
  anker: (pos) => ({ ausgabe: { x: pos.x, y: pos.y - 36 }, einzug: { x: pos.x - 22, y: pos.y - 112 } }),
  rahmen: () => ({ x0: -106, y0: -128, x1: 106, y1: 16 }),
};

/** Telefon; pos = Mitte unten. Hörer <id>-hoerer hebt sich beim Abnehmen. */
export const telefon = {
  gruppe: 'geraete',
  markup(id, pos, farben) {
    const f = farbenVon(farben);
    const tasten = [-16, 0, 16]
      .flatMap((x) => [-28, -16].map((y) => flaeche(x - 4, y, 8, 8, { fuellung: f.flaeche, art: 'detail', ohneKontur: true })))
      .join('');
    return huelle(
      id,
      pos,
      vieleck([[-50, 0], [50, 0], [40, -40], [-40, -40]], { fuellung: f.dunkel }) +
        tasten +
        teil(`${id}-hoerer`, vieleck([[-56, -40], [56, -40], [56, -54], [32, -60], [-32, -60], [-56, -54]], { fuellung: f.dunkel })),
    );
  },
  ids: (id) => [id, `${id}-hoerer`],
  anker: (pos) => ({ hoerer: { x: pos.x, y: pos.y - 52 } }),
  rahmen: () => ({ x0: -72, y0: -76, x1: 72, y1: 16 }),
};

/**
 * Kabel durch punkte (relativ zu pos) mit einem Puls <id>-puls, den die Szene mit entlang() bewegt.
 * anker.punkte liefert die Weltpunkte für entlang().
 */
export const kabel = {
  gruppe: 'geraete',
  markup(id, pos, farben, { punkte = [{ x: 0, y: 0 }, { x: 160, y: 0 }, { x: 160, y: 80 }] } = {}) {
    const f = farbenVon(farben);
    const d = punkte.map((p, i) => `${i ? 'L' : 'M'}${zahl(p.x)} ${zahl(p.y)}`).join(' ');
    return huelle(
      id,
      pos,
      pfad(d, { art: 'detail', farbe: f.kontur }) +
        teil(`${id}-puls`, kreis({ x: punkte[0].x, y: punkte[0].y }, 8, { fuellung: f.akzent, art: 'detail' }), 'translate(0 0)', 1),
    );
  },
  ids: (id) => [id, `${id}-puls`],
  anker: (pos, { punkte = [{ x: 0, y: 0 }, { x: 160, y: 0 }, { x: 160, y: 80 }] } = {}) => ({
    punkte: punkte.map((p) => ({ x: pos.x + p.x, y: pos.y + p.y })),
  }),
  rahmen: () => ({ x0: -16, y0: -24, x1: 176, y1: 96 }),
};
