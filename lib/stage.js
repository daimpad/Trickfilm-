// Bühne: Maße, Grafikfläche, feste Beschriftungsplätze, Schutzzone, SVG-Dokument.
import { BUEHNE, FARBEN, SCHRIFT, lesezeitFrames } from '../tokens/tokens.js';
import { maske, text, zahl } from './svg.js';

export const BREITE = BUEHNE.breite;
export const HOEHE = BUEHNE.hoehe;
export const GRAFIK = BUEHNE.grafik;
/** Oberkante der Schutzzone für Untertitel: darunter kein Text, keine tragende Bildaussage. */
export const SCHUTZZONE_Y = BUEHNE.hoehe - BUEHNE.schutzzoneUnten;
/** Grundlinien der Beschriftungszeilen unter der Grafikfläche. */
export const ZEILEN_Y = [GRAFIK.y1 + 56, GRAFIK.y1 + 104];
/** Höchstzahl der Plätze je Zeile. */
export const PLAETZE_JE_ZEILE = [5, 1];
/** Höchstlänge einer Beschriftung in Zeichen. */
export const BESCHRIFTUNG_MAX = 40;
/** Unterlänge der Schrift als Anteil der Schriftgröße, für die Schutzzonenprüfung. */
export const UNTERLAENGE = 0.22;

/** Platz index von anzahl in zeile: Mitte und Breite. */
export function beschriftungsplatz(zeile, index, anzahl) {
  const max = PLAETZE_JE_ZEILE[zeile];
  if (max === undefined) throw new Error(`Bühne: Zeile ${zeile} gibt es nicht`);
  if (anzahl > max || index >= anzahl) throw new Error(`Bühne: Zeile ${zeile} hat höchstens ${max} Plätze`);
  const breite = (GRAFIK.x1 - GRAFIK.x0) / anzahl;
  return { x: GRAFIK.x0 + breite * (index + 0.5), y: ZEILEN_Y[zeile], breite };
}

const LABEL_REIHENFOLGE = ['links', 'mitte', 'rechts'];

/**
 * Beschriftungen links/mitte/rechts in Zeile 0, je mit ID label-<platz>.
 * Leere oder fehlende Plätze bleiben leer, ihre Position bleibt fest.
 */
export function beschriftungen(labels = {}) {
  return LABEL_REIHENFOLGE.map((platz, i) => {
    const inhalt = labels[platz];
    if (!inhalt) return '';
    if (inhalt.length > BESCHRIFTUNG_MAX) throw new Error(`Beschriftung „${platz}“ ist länger als ${BESCHRIFTUNG_MAX} Zeichen`);
    const p = beschriftungsplatz(0, i, LABEL_REIHENFOLGE.length);
    return text(inhalt, p.x, p.y, { id: `label-${platz}`, opacity: 1 });
  }).join('');
}

/** Mindeststandzeit einer Beschriftung in Frames. */
export const standzeit = (inhalt, fps = BUEHNE.fps) => lesezeitFrames(inhalt.length, fps);

/** Liegt ein Text mit Grundlinie y und Größe groesse vollständig über der Schutzzone? */
export function ueberSchutzzone(y, groesse = SCHRIFT.groesse.beschriftung) {
  return y + groesse * UNTERLAENGE <= SCHUTZZONE_Y;
}

/** Vollständiges SVG-Dokument der Bühne mit Titel, Beschreibung und Grundfläche. */
export function svgDocument({ titel, desc, inhalt, grund = FARBEN.weiss, id = 'buehne' }) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" id="${maske(id)}" viewBox="0 0 ${zahl(BREITE)} ${zahl(HOEHE)}" ` +
    `width="${zahl(BREITE)}" height="${zahl(HOEHE)}" role="img" aria-labelledby="${maske(id)}-titel ${maske(id)}-desc">` +
    `<title id="${maske(id)}-titel">${maske(titel)}</title><desc id="${maske(id)}-desc">${maske(desc)}</desc>` +
    `<rect x="0" y="0" width="${zahl(BREITE)}" height="${zahl(HOEHE)}" fill="${grund}"/>` +
    inhalt +
    `</svg>`
  );
}
