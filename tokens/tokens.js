// Einzige Quelle aller Gestaltungswerte: Farben, Strichstärken, Schrift, Raster, Bühne.
// Ein Auftrag ersetzt diese Datei, sonst nichts. Reines JavaScript ohne DOM,
// damit Prototyp, Node und Remotion dieselben Werte lesen.
//
// Jeder Farbkommentar nennt den gemessenen Kontrast auf Weiß (WCAG 2.x);
// test/tokens.test.js rechnet ihn nach, ein veralteter Kommentar ist ein Fehler.

/** Neutrale Startpalette, entschieden von Regie am 2026-10-19. */
export const FARBEN = {
  schwarz: '#000000', // 21.00:1 auf Weiß
  weiss: '#FFFFFF', // 1.00:1 auf Weiß
  primaerDunkel: '#1F2A44', // 14.26:1 auf Weiß
  primaerHell: '#F5F3EE', // 1.11:1 auf Weiß
  rot: '#B23A2B', // 5.94:1 auf Weiß
  orange: '#A85A0C', // 5.08:1 auf Weiß
  ocker: '#7D6608', // 5.56:1 auf Weiß
  gruen: '#2F7032', // 6.03:1 auf Weiß
  petrol: '#1C6E78', // 5.91:1 auf Weiß
  violett: '#5E4691', // 7.61:1 auf Weiß
};

/** Namen der sechs Sekundärfarben, in fester Reihenfolge. */
export const SEKUNDAER = ['rot', 'orange', 'ocker', 'gruen', 'petrol', 'violett'];

/** Deckung der Flächenfarben; gerechnet als deckender Hexwert, nie als Alpha. */
export const FLAECHE_DECKUNG = 0.08;

/** Kontur Schwarz, Text in der dunklen Primärfarbe oder in Schwarz. */
export const ROLLEN = {
  kontur: FARBEN.schwarz,
  text: FARBEN.primaerDunkel,
  grund: FARBEN.weiss,
};

/** Konturen für Hauptform, Teil und Detail, in Pixel auf der 1920er-Bühne. */
export const STRICH = { haupt: 8, teil: 6, detail: 4 };

/** Systemschrift; in der Cloud liegt Liberation Sans mit den Maßen von Arial. Nie Webfonts. */
export const SCHRIFT = {
  familie: "Arial, 'Liberation Sans', sans-serif",
  groesse: { titel: 64, beschriftung: 40, klein: 32 },
  gewicht: { normal: 400, fett: 700 },
};

/** Abstände auf dem 8-px-Raster. Andere Abstände meldet die Prüfung. */
export const RASTER = [8, 16, 24, 32, 48, 64, 96, 128];

/** Bühne, Grafikfläche und Schutzzone für Untertitel. */
export const BUEHNE = {
  breite: 1920,
  hoehe: 1080,
  fps: 30,
  grafik: { x0: 128, x1: 1792, y0: 96, y1: 816 },
  schutzzoneUnten: 140,
};

/** Mindestkontraste nach WCAG 2.x: Text 4,5:1, grafische Objekte 3:1. */
export const MINDESTKONTRAST = { text: 4.5, grafik: 3 };

/** Höchstens drei Hell-Dunkel-Wechsel je Sekunde. */
export const BLITZE_JE_SEKUNDE_MAX = 3;

// Lesetakt: Zeichen je Sekunde und Grundzeit in Frames.
const LESETAKT_ZEICHEN_JE_S = 12;
const LESETAKT_GRUND_FRAMES = 45;

/**
 * Mindeststandzeit eines erscheinenden Texts in Frames:
 * (Zeichen / 12) * fps + 45, aufgerundet.
 */
export function lesezeitFrames(zeichen, fps = BUEHNE.fps) {
  return Math.ceil((zeichen / LESETAKT_ZEICHEN_JE_S) * fps + LESETAKT_GRUND_FRAMES);
}

function kanal(c8) {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function rgb(hex) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) throw new Error(`Kein Hexwert #RRGGBB: ${hex}`);
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Relative Leuchtdichte nach WCAG 2.x. */
export function leuchtdichte(hex) {
  const [r, g, b] = rgb(hex).map(kanal);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Kontrastverhältnis zweier Farben, 1 bis 21. */
export function kontrast(a, b) {
  const la = leuchtdichte(a);
  const lb = leuchtdichte(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Farbe mit Deckung über Weiß gelegt, als deckender Hexwert. */
export function aufWeiss(hex, deckung) {
  const mische = (c) => Math.round(255 + (c - 255) * deckung);
  return '#' + rgb(hex).map((c) => mische(c).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Je Primär- und Sekundärfarbe eine Fläche mit 8 % Deckung. */
export const FLAECHEN = Object.fromEntries(
  ['primaerDunkel', ...SEKUNDAER].map((name) => [name, aufWeiss(FARBEN[name], FLAECHE_DECKUNG)]),
);
