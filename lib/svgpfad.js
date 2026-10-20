// SVG-Dateien beliebiger Herkunft in einfache Formen übersetzen, ohne DOM (Teile-Werkstatt).
// Jede Form wird zu Segmenten M, L, C, Z mit absoluten Koordinaten; Bögen werden zu Bézierkurven,
// Grundformen zu Pfaden, Transformationen werden eingerechnet, Stile (Attribute, style, CSS-Klassen) aufgelöst.
// So lässt sich ein Teil danach beliebig verschieben, drehen und skalieren, ohne dass Bögen verzerren.
import { leseXml } from './zeichnung.js';

// ---------- Matrizen [a, b, c, d, e, f]: (x, y) → (a·x + c·y + e, b·x + d·y + f) ----------
export const EINHEIT = [1, 0, 0, 1, 0, 0];

/** m·n: erst n, dann m. */
export function mal(m, n) {
  const [a, b, c, d, e, f] = m;
  const [A, B, C, D, E, F] = n;
  return [a * A + c * B, b * A + d * B, a * C + c * D, b * C + d * D, a * E + c * F + e, b * E + d * F + f];
}
export const wende = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
export const verschiebung = (x, y) => [1, 0, 0, 1, x, y];
export const skalierung = (sx, sy = sx) => [sx, 0, 0, sy, 0, 0];
export function drehung(grad, cx = 0, cy = 0) {
  const r = (grad * Math.PI) / 180;
  const m = [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
  return cx || cy ? mal(verschiebung(cx, cy), mal(m, verschiebung(-cx, -cy))) : m;
}
/** Linearer Maßstab einer Matrix (für Strichstärken). */
export const massstabVon = (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));

const ZAHL = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
const zahlen = (s) => (String(s ?? '').match(ZAHL) ?? []).map(Number);

/** transform-Attribut zu einer Matrix (Liste von links nach rechts multipliziert). */
export function leseTransform(text) {
  let m = EINHEIT;
  if (!text) return m;
  for (const [, art, args] of String(text).matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g)) {
    const z = zahlen(args);
    let t = EINHEIT;
    if (art === 'matrix' && z.length === 6) t = z;
    else if (art === 'translate') t = verschiebung(z[0] ?? 0, z[1] ?? 0);
    else if (art === 'scale') t = skalierung(z[0] ?? 1, z[1] ?? z[0] ?? 1);
    else if (art === 'rotate') t = drehung(z[0] ?? 0, z[1] ?? 0, z[2] ?? 0);
    else if (art === 'skewX') t = [1, 0, Math.tan(((z[0] ?? 0) * Math.PI) / 180), 1, 0, 0];
    else if (art === 'skewY') t = [1, Math.tan(((z[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0];
    m = mal(m, t);
  }
  return m;
}

// ---------- Pfade ----------
/** Bogen als Bézierkurven, je höchstens 90° (Umrechnung nach SVG 1.1, Anhang F.6.5). */
function bogen(x1, y1, rx, ry, phiGrad, gross, uhrzeiger, x2, y2) {
  if (x1 === x2 && y1 === y2) return [];
  if (rx === 0 || ry === 0) return [{ typ: 'L', x: x2, y: y2 }];
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const phi = (phiGrad * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  const lam = x1p ** 2 / rx ** 2 + y1p ** 2 / ry ** 2;
  if (lam > 1) {
    rx *= Math.sqrt(lam);
    ry *= Math.sqrt(lam);
  }
  const zaehler = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const nenner = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let co = Math.sqrt(Math.max(0, zaehler / nenner));
  if (gross === uhrzeiger) co = -co;
  const cxp = (co * rx * y1p) / ry;
  const cyp = (-co * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const winkel = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = winkel(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = winkel((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!uhrzeiger && dt > 0) dt -= 2 * Math.PI;
  else if (uhrzeiger && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9));
  const d = dt / n;
  const k = (4 / 3) * Math.tan(d / 4);
  const punkt = (t) => [cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos];
  const tangente = (t) => [-rx * Math.sin(t) * cos - ry * Math.cos(t) * sin, -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos];
  const aus = [];
  for (let j = 0; j < n; j++) {
    const ta = t1 + j * d;
    const tb = ta + d;
    const [ax, ay] = punkt(ta);
    const [bx, by] = punkt(tb);
    const [dax, day] = tangente(ta);
    const [dbx, dby] = tangente(tb);
    aus.push({ typ: 'C', x1: ax + k * dax, y1: ay + k * day, x2: bx - k * dbx, y2: by - k * dby, x: bx, y: by });
  }
  aus[aus.length - 1].x = x2;
  aus[aus.length - 1].y = y2;
  return aus;
}

/** Pfaddaten zu absoluten Segmenten M, L, C, Z. Ein Fehler nennt die Stelle. */
export function lesePfad(d) {
  const segs = [];
  let i = 0;
  const n = d.length;
  const leer = () => {
    while (i < n && /[\s,]/.test(d[i])) i++;
  };
  const zahl = () => {
    leer();
    const m = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(d.slice(i, i + 40));
    if (!m) throw new Error(`Pfad: Zahl erwartet bei „${d.slice(i, i + 12)}“`);
    i += m[0].length;
    return Number(m[0]);
  };
  const flagge = () => {
    leer();
    const c = d[i];
    if (c !== '0' && c !== '1') throw new Error(`Pfad: Bogen-Flag erwartet bei „${d.slice(i, i + 12)}“`);
    i++;
    return c === '1';
  };
  const weiterZahl = () => {
    leer();
    return i < n && /[-+.\d]/.test(d[i]);
  };
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let letzteC = null;
  let letzteQ = null;
  while (true) {
    leer();
    if (i >= n) break;
    const c = d[i];
    if (!/[MmLlHhVvCcSsQqTtAaZz]/.test(c)) throw new Error(`Pfad: unbekannter Befehl „${c}“`);
    i++;
    const rel = c >= 'a';
    const B = c.toUpperCase();
    if (B === 'Z') {
      segs.push({ typ: 'Z' });
      x = sx;
      y = sy;
      letzteC = letzteQ = null;
      continue;
    }
    let erst = true;
    do {
      const bx = rel ? x : 0;
      const by = rel ? y : 0;
      let neuC = null;
      let neuQ = null;
      if (B === 'M') {
        const nx = zahl() + bx;
        const ny = zahl() + by;
        if (erst) {
          segs.push({ typ: 'M', x: nx, y: ny });
          sx = nx;
          sy = ny;
        } else segs.push({ typ: 'L', x: nx, y: ny });
        x = nx;
        y = ny;
      } else if (B === 'L') {
        const nx = zahl() + bx;
        const ny = zahl() + by;
        segs.push({ typ: 'L', x: nx, y: ny });
        x = nx;
        y = ny;
      } else if (B === 'H') {
        x = zahl() + bx;
        segs.push({ typ: 'L', x, y });
      } else if (B === 'V') {
        y = zahl() + by;
        segs.push({ typ: 'L', x, y });
      } else if (B === 'C' || B === 'S') {
        let x1;
        let y1;
        if (B === 'C') {
          x1 = zahl() + bx;
          y1 = zahl() + by;
        } else {
          x1 = letzteC ? 2 * x - letzteC[0] : x;
          y1 = letzteC ? 2 * y - letzteC[1] : y;
        }
        const x2 = zahl() + bx;
        const y2 = zahl() + by;
        const nx = zahl() + bx;
        const ny = zahl() + by;
        segs.push({ typ: 'C', x1, y1, x2, y2, x: nx, y: ny });
        neuC = [x2, y2];
        x = nx;
        y = ny;
      } else if (B === 'Q' || B === 'T') {
        let qx;
        let qy;
        if (B === 'Q') {
          qx = zahl() + bx;
          qy = zahl() + by;
        } else {
          qx = letzteQ ? 2 * x - letzteQ[0] : x;
          qy = letzteQ ? 2 * y - letzteQ[1] : y;
        }
        const nx = zahl() + bx;
        const ny = zahl() + by;
        segs.push({ typ: 'C', x1: x + (2 / 3) * (qx - x), y1: y + (2 / 3) * (qy - y), x2: nx + (2 / 3) * (qx - nx), y2: ny + (2 / 3) * (qy - ny), x: nx, y: ny });
        neuQ = [qx, qy];
        x = nx;
        y = ny;
      } else if (B === 'A') {
        const rx = zahl();
        const ry = zahl();
        const rot = zahl();
        const gross = flagge();
        const uhr = flagge();
        const nx = zahl() + bx;
        const ny = zahl() + by;
        segs.push(...bogen(x, y, rx, ry, rot, gross, uhr, nx, ny));
        x = nx;
        y = ny;
      }
      letzteC = neuC;
      letzteQ = neuQ;
      erst = false;
    } while (weiterZahl());
  }
  return segs;
}

/** Segmente mit einer Matrix abbilden. */
export function transformiere(segs, m) {
  return segs.map((s) => {
    if (s.typ === 'Z') return s;
    const [x, y] = wende(m, s.x, s.y);
    if (s.typ !== 'C') return { typ: s.typ, x, y };
    const [x1, y1] = wende(m, s.x1, s.y1);
    const [x2, y2] = wende(m, s.x2, s.y2);
    return { typ: 'C', x1, y1, x2, y2, x, y };
  });
}

const z2 = (v) => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
};
/** Segmente als Pfaddaten mit zwei Nachkommastellen. */
export function schreibePfad(segs) {
  return segs
    .map((s) => (s.typ === 'Z' ? 'Z' : s.typ === 'C' ? `C${z2(s.x1)} ${z2(s.y1)} ${z2(s.x2)} ${z2(s.y2)} ${z2(s.x)} ${z2(s.y)}` : `${s.typ}${z2(s.x)} ${z2(s.y)}`))
    .join(' ');
}

/** Grundform als Segmente; null, wenn das Element nichts zeichnet. */
export function formZuSegmenten(el) {
  const a = el.attrs;
  const n = (k, s = 0) => (a[k] === undefined ? s : Number.parseFloat(a[k]));
  switch (el.name) {
    case 'path':
      return a.d ? lesePfad(a.d) : null;
    case 'rect': {
      const x = n('x');
      const y = n('y');
      const w = n('width');
      const h = n('height');
      if (!(w > 0 && h > 0)) return null;
      let rx = a.rx !== undefined ? n('rx') : a.ry !== undefined ? n('ry') : 0;
      let ry = a.ry !== undefined ? n('ry') : rx;
      rx = Math.min(rx, w / 2);
      ry = Math.min(ry, h / 2);
      if (!rx || !ry) return lesePfad(`M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h} Z`);
      return lesePfad(
        `M${x + rx} ${y} L${x + w - rx} ${y} A${rx} ${ry} 0 0 1 ${x + w} ${y + ry} L${x + w} ${y + h - ry} A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h} ` +
          `L${x + rx} ${y + h} A${rx} ${ry} 0 0 1 ${x} ${y + h - ry} L${x} ${y + ry} A${rx} ${ry} 0 0 1 ${x + rx} ${y} Z`,
      );
    }
    case 'circle':
    case 'ellipse': {
      const cx = n('cx');
      const cy = n('cy');
      const rx = el.name === 'circle' ? n('r') : n('rx');
      const ry = el.name === 'circle' ? n('r') : n('ry');
      if (!(rx > 0 && ry > 0)) return null;
      return lesePfad(`M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`);
    }
    case 'line':
      return [
        { typ: 'M', x: n('x1'), y: n('y1') },
        { typ: 'L', x: n('x2'), y: n('y2') },
      ];
    case 'polyline':
    case 'polygon': {
      const z = zahlen(a.points);
      if (z.length < 4) return null;
      const segs = [{ typ: 'M', x: z[0], y: z[1] }];
      for (let i = 2; i + 1 < z.length; i += 2) segs.push({ typ: 'L', x: z[i], y: z[i + 1] });
      if (el.name === 'polygon') segs.push({ typ: 'Z' });
      return segs;
    }
    default:
      return null;
  }
}

// ---------- Stile ----------
const BENANNT = {
  black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', lime: '#00ff00', blue: '#0000ff', yellow: '#ffff00',
  magenta: '#ff00ff', fuchsia: '#ff00ff', cyan: '#00ffff', aqua: '#00ffff', gray: '#808080', grey: '#808080', orange: '#ffa500',
};

/** Farbe zu #rrggbb, 'none' oder null (unbekannt). */
export function normFarbe(wert) {
  const v = String(wert ?? '').trim().toLowerCase();
  if (!v || v === 'none' || v === 'transparent') return 'none';
  if (BENANNT[v]) return BENANNT[v];
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) return '#' + [...v.slice(1)].map((c) => c + c).join('');
  const rgb = /^rgba?\(([^)]+)\)$/.exec(v);
  if (rgb) {
    const teile = rgb[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3);
    const k = teile.map((t) => (t.endsWith('%') ? Math.round(Number.parseFloat(t) * 2.55) : Math.round(Number.parseFloat(t))));
    if (k.length === 3 && k.every((x) => x >= 0 && x <= 255)) return '#' + k.map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  return null;
}

const ERBLICH = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill-rule', 'visibility'];
const EIGEN = ['opacity', 'fill-opacity', 'stroke-opacity', 'display'];

function leseCss(text) {
  const regeln = [];
  const ohne = text.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, selektoren, inhalt] of ohne.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const decl = leseDeklarationen(inhalt);
    for (const s of selektoren.split(',')) regeln.push({ selektor: s.trim(), decl });
  }
  return regeln;
}
function leseDeklarationen(text) {
  const aus = {};
  for (const teil of String(text).split(';')) {
    const i = teil.indexOf(':');
    if (i > 0) aus[teil.slice(0, i).trim().toLowerCase()] = teil.slice(i + 1).trim();
  }
  return aus;
}
function passt(selektor, el) {
  if (/^\.[\w-]+$/.test(selektor)) return (el.attrs.class ?? '').split(/\s+/).includes(selektor.slice(1));
  if (/^#[\w-]+$/.test(selektor)) return el.attrs.id === selektor.slice(1);
  if (/^[a-z]+$/i.test(selektor)) return el.name === selektor;
  return false;
}

/** Wirksamer Stil eines Elements: Attribute, dann CSS-Regeln, dann style-Attribut. */
function stilVon(el, css, geerbt, hinweise) {
  const stil = Object.fromEntries(ERBLICH.filter((k) => geerbt[k] !== undefined).map((k) => [k, geerbt[k]]));
  for (const k of [...ERBLICH, ...EIGEN]) if (el.attrs[k] !== undefined) stil[k] = el.attrs[k];
  for (const r of css) {
    if (passt(r.selektor, el)) Object.assign(stil, r.decl);
    else if (/[\s>+~:[]/.test(r.selektor) && !hinweise.has(`css:${r.selektor}`)) hinweise.add(`css:${r.selektor}`);
  }
  if (el.attrs.style) Object.assign(stil, leseDeklarationen(el.attrs.style));
  return stil;
}

/**
 * Eine SVG-Datei in Formen übersetzen. Liefert { formen, hinweise, rahmen }.
 * Jede Form: { segmente, fill, stroke, strich, linecap, linejoin, fillRule }.
 */
export function leseTeilSvg(text) {
  const doc = leseXml(text);
  const svg = doc.kinder.find((k) => k.name === 'svg');
  if (!svg) throw new Error('keine SVG-Datei (kein <svg>-Element)');
  const ids = new Map();
  let cssText = '';
  const sammle = (el) => {
    if (!el.name) return;
    if (el.attrs.id) ids.set(el.attrs.id, el);
    if (el.name === 'style') cssText += el.kinder.map((k) => k.text ?? '').join('');
    el.kinder.forEach(sammle);
  };
  sammle(svg);
  const css = leseCss(cssText);
  const hinweise = new Set();
  const formen = [];
  const UEBERSPRINGEN = new Set(['defs', 'metadata', 'title', 'desc', 'style', 'sodipodi:namedview', 'clipPath', 'mask', 'linearGradient', 'radialGradient', 'pattern', 'symbol', 'marker', 'filter']);

  function farbeAus(wert, art) {
    const v = String(wert ?? '').trim();
    const url = /^url\(\s*#([^)]+)\)/.exec(v);
    if (url) {
      const g = ids.get(url[1].trim());
      const stopp = g?.kinder.find((k) => k.name === 'stop');
      const stoppFarbe = stopp && (stopp.attrs['stop-color'] ?? leseDeklarationen(stopp.attrs.style ?? '')['stop-color']);
      hinweise.add(`Verlauf in ${art} als Fläche mit seiner ersten Farbe übernommen`);
      return normFarbe(stoppFarbe ?? '#000000') ?? '#000000';
    }
    if (v.toLowerCase() === 'currentcolor') {
      hinweise.add('currentColor als Schwarz übernommen');
      return '#000000';
    }
    const f = normFarbe(v);
    if (f === null) {
      hinweise.add(`unbekannte Farbe „${v}“ als Schwarz übernommen`);
      return '#000000';
    }
    return f;
  }

  function lauf(el, m, geerbt) {
    for (const k of el.kinder) {
      if (!k.name || UEBERSPRINGEN.has(k.name)) continue;
      const stil = stilVon(k, css, geerbt, hinweise);
      if (stil.display === 'none' || stil.visibility === 'hidden') continue;
      for (const o of ['opacity', 'fill-opacity', 'stroke-opacity']) {
        if (stil[o] !== undefined && Number.parseFloat(stil[o]) < 1) hinweise.add('Deckkraft unter 1 wird nicht übernommen (Flächen sind deckend)');
      }
      let m2 = mal(m, leseTransform(k.attrs.transform));
      if (k.name === 'text') {
        hinweise.add('Text übersprungen (in Pfade umwandeln)');
        continue;
      }
      if (k.name === 'image') {
        hinweise.add('Bild übersprungen (nur Vektorformen)');
        continue;
      }
      if (k.name === 'use') {
        const ref = ids.get(String(k.attrs.href ?? k.attrs['xlink:href'] ?? '').replace(/^#/, ''));
        if (!ref) continue;
        m2 = mal(m2, verschiebung(Number.parseFloat(k.attrs.x ?? 0), Number.parseFloat(k.attrs.y ?? 0)));
        lauf({ kinder: [ref.name === 'symbol' ? { ...ref, name: 'g' } : ref] }, m2, stil);
        continue;
      }
      if (k.name === 'g' || k.name === 'a' || k.name === 'switch' || k.name === 'svg') {
        if (k.name === 'svg') m2 = mal(m2, verschiebung(Number.parseFloat(k.attrs.x ?? 0), Number.parseFloat(k.attrs.y ?? 0)));
        lauf(k, m2, stil);
        continue;
      }
      let segs;
      try {
        segs = formZuSegmenten(k);
      } catch (e) {
        hinweise.add(`${e.message} (Form übersprungen)`);
        continue;
      }
      if (!segs || segs.length === 0) continue;
      const fill = farbeAus(stil.fill ?? '#000000', 'der Füllung');
      const stroke = farbeAus(stil.stroke ?? 'none', 'der Kontur');
      if (fill === 'none' && stroke === 'none') continue;
      formen.push({
        segmente: transformiere(segs, m2),
        fill,
        stroke,
        strich: stroke === 'none' ? 0 : (Number.parseFloat(stil['stroke-width'] ?? 1) || 1) * massstabVon(m2),
        linecap: stil['stroke-linecap'] ?? null,
        linejoin: stil['stroke-linejoin'] ?? null,
        fillRule: stil['fill-rule'] ?? null,
      });
    }
  }
  lauf(svg, EINHEIT, {});
  if (hinweise.has('css:')) hinweise.delete('css:');
  const lesbar = [...hinweise].map((h) => (h.startsWith('css:') ? `CSS-Regel „${h.slice(4)}“ nicht unterstützt` : h));
  if (formen.length === 0) throw new Error('keine zeichnenden Formen gefunden');
  return { formen, hinweise: lesbar, rahmen: rahmenVon(formen) };
}

/** Umgebendes Rechteck aller Punkte (Kontrollpunkte eingeschlossen). */
export function rahmenVon(formen) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const f of formen) {
    for (const s of f.segmente) {
      if (s.typ === 'Z') continue;
      for (const [x, y] of s.typ === 'C' ? [[s.x1, s.y1], [s.x2, s.y2], [s.x, s.y]] : [[s.x, s.y]]) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
  }
  return { x0, y0, x1, y1 };
}

/**
 * Formen mit einer Matrix abbilden; Strichstärken wachsen mit dem Maßstab.
 * konturen: erlaubte Stärken; jede Kontur wird auf die nächste gerundet.
 */
export function transformiereFormen(formen, m, { konturen = null } = {}) {
  const k = massstabVon(m);
  return formen.map((f) => {
    let strich = f.strich * k;
    if (konturen && f.stroke !== 'none') strich = konturen.reduce((a, b) => (Math.abs(b - strich) < Math.abs(a - strich) ? b : a));
    return { ...f, segmente: transformiere(f.segmente, m), strich };
  });
}

/** Formen als <path>-Elemente; farbe(hex) bildet Farben ab (Farbschlüssel, Rollen). */
export function formenAlsSvg(formen, { farbe = (f) => f } = {}) {
  return formen
    .map((f) => {
      const a = [`d="${schreibePfad(f.segmente)}"`, `fill="${f.fill === 'none' ? 'none' : farbe(f.fill)}"`];
      if (f.stroke !== 'none') {
        a.push(`stroke="${farbe(f.stroke)}"`, `stroke-width="${z2(f.strich)}"`);
        if (f.linecap) a.push(`stroke-linecap="${f.linecap}"`);
        if (f.linejoin) a.push(`stroke-linejoin="${f.linejoin}"`);
      }
      if (f.fillRule) a.push(`fill-rule="${f.fillRule}"`);
      return `<path ${a.join(' ')}/>`;
    })
    .join('');
}
