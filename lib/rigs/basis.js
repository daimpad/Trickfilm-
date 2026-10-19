// Gemeinsames der Rigs: Spezifikation, Teilesatz, Palette, Koordinaten zwischen Figur und Welt.
import { FARBEN } from '../../tokens/tokens.js';
import { TEILESAETZE } from '../teilesaetze/index.js';
import { SPEZ } from './spezifikation.js';

export { SPEZ };

/** Standardpalette einer Figur, wenn die Szene keine nennt. */
export const PALETTE_STANDARD = { kleidung1: FARBEN.petrol, kleidung2: FARBEN.primaerDunkel, zubehoer: FARBEN.ocker };

/** Archetyp aus der Spezifikation; ein unbekannter Name hält an. */
export function archetyp(name) {
  const a = SPEZ.archetypen[name];
  if (!a) throw new Error(`Rig: Archetyp „${name}“ steht nicht in der Spezifikation`);
  return a;
}

/** Teile eines Teilesatzes für einen Archetyp; Fehlendes hält an. */
export function teile(satz, name) {
  const modul = TEILESAETZE[satz]?.[name];
  if (!modul) throw new Error(`Rig: Teilesatz „${satz}“ hat keinen Archetyp „${name}“`);
  return modul.TEILE;
}

/** Farbrollen @… durch Tokens und Palette ersetzen. Eine Rolle ohne Farbe hält an. */
export function faerben(svg, palette = {}) {
  const farben = { kontur: FARBEN.schwarz, weiss: FARBEN.weiss, ...PALETTE_STANDARD, ...stripNull(palette) };
  return svg.replace(/@([a-z0-9]+)/g, (_, rolle) => {
    const f = farben[rolle];
    if (!f) throw new Error(`Rig: Farbrolle @${rolle} hat keine Farbe`);
    return f;
  });
}

function stripNull(o) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined));
}

const RAD = Math.PI / 180;

/** Punkt p um den Ursprung drehen, im Uhrzeigersinn auf dem Bildschirm (wie SVG rotate). */
export function drehe(p, grad) {
  const c = Math.cos(grad * RAD);
  const s = Math.sin(grad * RAD);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

export const punkt = ([x, y]) => ({ x, y });

/** Maßstab einer Figur: Archetyp mal eigenes Maß (Kinder, Nähe). */
export const massstabVon = (a, opts = {}) => a.massstab * (opts.massstab ?? 1);

/** Figurenpunkt (lokal, Hüfte im Ursprung) in Weltkoordinaten. */
export function welt(state, lokal, m) {
  const dir = state.dir ?? 1;
  return { x: state.x + dir * m * lokal.x, y: state.y + m * ((state.bob ?? 0) + lokal.y) };
}

/** Weltpunkt in Figurenkoordinaten. */
export function lokal(state, w, m) {
  const dir = state.dir ?? 1;
  return { x: (w.x - state.x) / (dir * m), y: (w.y - state.y) / m - (state.bob ?? 0) };
}

/** Transform eines Gelenks: verschieben, dann drehen; Zahlen auf zwei Stellen. */
export function tf(x, y, grad) {
  const r = (v) => Math.round(v * 100) / 100;
  return `translate(${r(x)} ${r(y)}) rotate(${r(grad)})`;
}

export function rundeZahl(v) {
  return Math.round(v * 100) / 100;
}
