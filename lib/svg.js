// SVG-Bausteine als Zeichenketten: Linie, Polylinie, Fläche, Vieleck, Kreis, Ellipse, Gruppe, Text.
// Strichstärken kommen aus den Tokens; Farben übergibt der Aufrufer aus den Tokens oder der Palette.
import { FARBEN, SCHRIFT, STRICH } from '../tokens/tokens.js';

/** Zahl mit höchstens zwei Nachkommastellen; NaN wird nie still geschrieben. */
export function zahl(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`svg: keine endliche Zahl: ${v}`);
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
}

/** Text für Inhalte und Attribute maskieren. */
export function maske(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function attribute(a) {
  return Object.entries(a)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => ` ${k}="${typeof v === 'number' ? zahl(v) : maske(v)}"`)
    .join('');
}

const strich = (art) => STRICH[art ?? 'teil'] ?? art;

/** Gemeinsame Strichattribute: runde Enden nur, wo erlaubt (Figuren, Zeichnungen, Effektzeichen). */
function strichAttr({ farbe = FARBEN.schwarz, art = 'teil', rund = false } = {}) {
  return {
    stroke: farbe,
    'stroke-width': strich(art),
    'stroke-linecap': rund ? 'round' : 'butt',
    'stroke-linejoin': rund ? 'round' : 'miter',
  };
}

const punkteText = (punkte) => punkte.map((p) => `${zahl(p.x ?? p[0])},${zahl(p.y ?? p[1])}`).join(' ');

export function linie(a, b, opts = {}) {
  return `<line${attribute({ id: opts.id, x1: a.x, y1: a.y, x2: b.x, y2: b.y, ...strichAttr(opts), opacity: opts.opacity })}/>`;
}

export function polylinie(punkte, opts = {}) {
  return `<polyline${attribute({ id: opts.id, points: punkteText(punkte), fill: 'none', ...strichAttr(opts), opacity: opts.opacity })}/>`;
}

/** Rechteckige Fläche mit Kontur; nie mit Eckradius. */
export function flaeche(x, y, breite, hoehe, opts = {}) {
  return `<rect${attribute({
    id: opts.id,
    x,
    y,
    width: breite,
    height: hoehe,
    fill: opts.fuellung ?? FARBEN.weiss,
    ...(opts.ohneKontur ? {} : strichAttr(opts)),
    opacity: opts.opacity,
  })}/>`;
}

export function vieleck(punkte, opts = {}) {
  return `<polygon${attribute({
    id: opts.id,
    points: punkteText(punkte),
    fill: opts.fuellung ?? FARBEN.weiss,
    ...(opts.ohneKontur ? {} : strichAttr(opts)),
    opacity: opts.opacity,
  })}/>`;
}

export function kreis(c, r, opts = {}) {
  return `<circle${attribute({
    id: opts.id,
    cx: c.x,
    cy: c.y,
    r,
    fill: opts.fuellung ?? FARBEN.weiss,
    ...(opts.ohneKontur ? {} : strichAttr(opts)),
    opacity: opts.opacity,
  })}/>`;
}

export function ellipse(c, rx, ry, opts = {}) {
  return `<ellipse${attribute({
    id: opts.id,
    cx: c.x,
    cy: c.y,
    rx,
    ry,
    fill: opts.fuellung ?? FARBEN.weiss,
    ...(opts.ohneKontur ? {} : strichAttr(opts)),
    opacity: opts.opacity,
  })}/>`;
}

/** Pfad mit absoluten Befehlen. */
export function pfad(d, opts = {}) {
  return `<path${attribute({
    id: opts.id,
    d,
    fill: opts.fuellung ?? 'none',
    ...(opts.ohneKontur ? {} : strichAttr(opts)),
    'stroke-dasharray': opts.dash,
    'stroke-dashoffset': opts.dashOffset,
    pathLength: opts.pathLength,
    opacity: opts.opacity,
  })}/>`;
}

/** Gruppe; transform und opacity stehen immer im Markup, wenn die Gruppe bewegt wird. */
export function gruppe(inhalt, { id, transform, opacity, clip } = {}) {
  return `<g${attribute({ id, transform, opacity, 'clip-path': clip })}>${Array.isArray(inhalt) ? inhalt.join('') : inhalt}</g>`;
}

/** Transform-Text aus Verschiebung, Drehung (Grad) und Maßstab. */
export function transform({ x = 0, y = 0, drehung = 0, sx = 1, sy = 1 } = {}) {
  let t = `translate(${zahl(x)} ${zahl(y)})`;
  if (drehung) t += ` rotate(${zahl(drehung)})`;
  if (sx !== 1 || sy !== 1) t += ` scale(${zahl(sx)} ${zahl(sy)})`;
  return t;
}

/** Text in der Systemschrift aus den Tokens. */
export function text(inhalt, x, y, opts = {}) {
  return `<text${attribute({
    id: opts.id,
    x,
    y,
    'font-family': SCHRIFT.familie,
    'font-size': opts.groesse ?? SCHRIFT.groesse.beschriftung,
    'font-weight': opts.gewicht ?? SCHRIFT.gewicht.normal,
    'text-anchor': opts.anker ?? 'middle',
    fill: opts.farbe ?? FARBEN.primaerDunkel,
    opacity: opts.opacity,
  })}>${maske(inhalt)}</text>`;
}
