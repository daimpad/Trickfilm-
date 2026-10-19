// Effektzeichen: Haken, Pfeil, Bruchmarke, Bewegungslinien, Aufprall.
// Runde Linienenden sind hier die dokumentierte Ausnahme, damit Zeichen und Figuren eine Familie bilden.
import { linie, pfad, polylinie, zahl } from '../svg.js';
import { farbenVon, huelle } from './_basis.js';

/** Haken; pos = Mitte. <id>-strich trägt pathLength 1: stroke-dashoffset 1 → 0 zeichnet ihn. */
export const haken = {
  gruppe: 'zeichen',
  markup(id, pos, farben) {
    const f = farbenVon(farben);
    return huelle(
      id,
      pos,
      pfad('M-24 0 L-6 18 L26 -22', { id: `${id}-strich`, farbe: f.akzent, art: 'haupt', rund: true, pathLength: 1, dash: 1, dashOffset: 0 }),
    );
  },
  ids: (id) => [id, `${id}-strich`],
  anker: (pos) => ({ mitte: { x: pos.x, y: pos.y } }),
  rahmen: () => ({ x0: -40, y0: -38, x1: 42, y1: 34 }),
};

/** Pfeil; pos = Anfang. laenge in px, winkel in Grad (0 = nach rechts, im Uhrzeigersinn). */
export const pfeil = {
  gruppe: 'zeichen',
  markup(id, pos, farben, { laenge = 120, winkel = 0 } = {}) {
    const f = farbenVon(farben);
    const L = laenge;
    return huelle(
      id,
      pos,
      `<g transform="rotate(${zahl(winkel)})">` +
        linie({ x: 0, y: 0 }, { x: L - 4, y: 0 }, { farbe: f.kontur, art: 'haupt', rund: true }) +
        polylinie([{ x: L - 22, y: -16 }, { x: L, y: 0 }, { x: L - 22, y: 16 }], { farbe: f.kontur, art: 'haupt', rund: true }) +
        `</g>`,
    );
  },
  ids: (id) => [id],
  anker: (pos, { laenge = 120, winkel = 0 } = {}) => ({
    spitze: { x: pos.x + laenge * Math.cos((winkel * Math.PI) / 180), y: pos.y + laenge * Math.sin((winkel * Math.PI) / 180) },
  }),
  rahmen: ({ laenge = 120 } = {}) => ({ x0: -16, y0: -32, x1: laenge + 16, y1: 32 }),
};

/** Bruchmarke; pos = Mitte. */
export const bruchmarke = {
  gruppe: 'zeichen',
  markup(id, pos, farben) {
    const f = farbenVon(farben);
    return huelle(
      id,
      pos,
      polylinie([{ x: -28, y: -32 }, { x: -6, y: -8 }, { x: -18, y: 4 }, { x: 12, y: 32 }], { farbe: f.kontur, art: 'teil', rund: true }),
    );
  },
  ids: (id) => [id],
  anker: (pos) => ({ mitte: { x: pos.x, y: pos.y } }),
  rahmen: () => ({ x0: -44, y0: -48, x1: 28, y1: 48 }),
};

/** Bewegungslinien hinter einem bewegten Ding; pos = vorderes Ende, die Linien laufen nach links. */
export const bewegungslinien = {
  gruppe: 'zeichen',
  markup(id, pos, farben) {
    const f = farbenVon(farben);
    const l = [[-16, 40], [0, 64], [16, 40]]
      .map(([y, len]) => linie({ x: -len, y }, { x: 0, y }, { farbe: f.kontur, art: 'teil', rund: true }))
      .join('');
    return huelle(id, pos, l);
  },
  ids: (id) => [id],
  anker: (pos) => ({ vorn: { x: pos.x, y: pos.y } }),
  rahmen: () => ({ x0: -80, y0: -32, x1: 16, y1: 32 }),
};

/** Aufprall: acht Strahlen um pos. */
export const aufprall = {
  gruppe: 'zeichen',
  markup(id, pos, farben) {
    const f = farbenVon(farben);
    const strahlen = Array.from({ length: 8 }, (_, i) => {
      const w = (i * Math.PI) / 4;
      return linie({ x: 24 * Math.cos(w), y: 24 * Math.sin(w) }, { x: 44 * Math.cos(w), y: 44 * Math.sin(w) }, { farbe: f.kontur, art: 'teil', rund: true });
    }).join('');
    return huelle(id, pos, strahlen);
  },
  ids: (id) => [id],
  anker: (pos) => ({ mitte: { x: pos.x, y: pos.y } }),
  rahmen: () => ({ x0: -60, y0: -60, x1: 60, y1: 60 }),
};
