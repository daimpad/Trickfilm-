// Verzeichnis aller Requisiten nach Name. Braucht eine zweite Szene eine Requisite aus ihrer
// requisiten.js, wandert sie hierher.
import * as moebel from './moebel.js';
import * as geraete from './geraete.js';
import * as buero from './buero.js';
import * as aussen from './aussen.js';
import * as zeichen from './zeichen.js';
import { zahl } from '../svg.js';

export const REQUISITEN = { ...moebel, ...geraete, ...buero, ...aussen, ...zeichen };

export const GRUPPEN = ['moebel', 'geraete', 'buero', 'aussen', 'zeichen'];

/**
 * Requisite nach Name; ein unbekannter Name hält an. opts.massstab skaliert die Requisite um ihren Bezugspunkt:
 * das Markup trägt dann translate(x y) scale(m), Anker und Rahmen rechnen mit demselben Maßstab. Bewegliche Teile
 * bleiben in den Maßen der Requisite; eine Szene, die die äußere Gruppe selbst setzt, schreibt scale(m) mit.
 */
export function requisite(name) {
  const r = REQUISITEN[name];
  if (!r) throw new Error(`Requisite „${name}“ unbekannt; bekannt: ${Object.keys(REQUISITEN).join(', ')}`);
  const m = (opts) => opts?.massstab ?? 1;
  return {
    ...r,
    markup(id, pos, farben, opts = {}) {
      const svg = r.markup(id, pos, farben, opts);
      if (m(opts) === 1) return svg;
      const kopf = new RegExp(`^<g id="${id}" transform="translate\\(([^)]*)\\)"`);
      if (!kopf.test(svg)) throw new Error(`Requisite „${name}“: äußere Gruppe ohne translate, massstab nicht anwendbar`);
      return svg.replace(kopf, `<g id="${id}" transform="translate($1) scale(${zahl(m(opts))})"`);
    },
    anker(pos, opts = {}) {
      const a = r.anker ? r.anker(pos, opts) : {};
      const k = m(opts);
      if (k === 1) return a;
      // Punkte rücken vom Bezugspunkt weg, Größen (Schlüssel auf …Groesse) wachsen mit.
      return Object.fromEntries(
        Object.entries(a).map(([n, p]) => [n, /Groesse$/.test(n) ? { x: p.x * k, y: p.y * k } : { x: pos.x + (p.x - pos.x) * k, y: pos.y + (p.y - pos.y) * k }]),
      );
    },
    rahmen(opts = {}) {
      const f = r.rahmen ? r.rahmen(opts) : { x0: 0, y0: 0, x1: 0, y1: 0 };
      const k = m(opts);
      return { x0: f.x0 * k, y0: f.y0 * k, x1: f.x1 * k, y1: f.y1 * k };
    },
  };
}
