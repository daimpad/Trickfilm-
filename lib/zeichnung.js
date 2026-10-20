// Zeichnungen von Teilesätzen lesen und prüfen, ohne DOM: läuft im Importer (Node) und in der Teile-Werkstatt (Browser).
// Prüft Ebenen, Elemente, Attribute, Farben und Konturen nach den Exportregeln (Abschnitt 7.2) und bringt jedes
// Teil um seinen Drehpunkt ins lokale System. Dazu die Bausteine der Gelenkprüfung (Abschnitt 7.3).
import { SPEZ } from './rigs/spezifikation.js';
import { gelenke, layout, teileVon, PRUEFWINKEL } from './rigs/vorlage-layout.js';

// ---------- XML ----------
const ENTITAETEN = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const entschluessle = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (g, e) =>
    e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITAETEN[e] ?? g,
  );
export const maske = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** Kleiner XML-Leser für SVG-Exporte: Elemente, Attribute, Text; Kommentare, PI, DOCTYPE werden übersprungen. */
export function leseXml(text) {
  const wurzel = { name: '#dokument', attrs: {}, kinder: [] };
  const stapel = [wurzel];
  let i = 0;
  const fehler = (was) => {
    const zeile = text.slice(0, i).split('\n').length;
    throw new Error(`XML Zeile ${zeile}: ${was}`);
  };
  while (i < text.length) {
    if (text.startsWith('<!--', i)) {
      const e = text.indexOf('-->', i);
      if (e < 0) fehler('Kommentar nicht geschlossen');
      i = e + 3;
    } else if (text.startsWith('<?', i)) {
      const e = text.indexOf('?>', i);
      if (e < 0) fehler('Verarbeitungsanweisung nicht geschlossen');
      i = e + 2;
    } else if (text.startsWith('<![CDATA[', i)) {
      const e = text.indexOf(']]>', i);
      stapel.at(-1).kinder.push({ text: text.slice(i + 9, e) });
      i = e + 3;
    } else if (text.startsWith('<!', i)) {
      let tiefe = 0;
      for (; i < text.length; i++) {
        if (text[i] === '[') tiefe++;
        else if (text[i] === ']') tiefe--;
        else if (text[i] === '>' && tiefe === 0) break;
      }
      i++;
    } else if (text.startsWith('</', i)) {
      const e = text.indexOf('>', i);
      const name = text.slice(i + 2, e).trim();
      const oben = stapel.pop();
      if (!oben || oben.name !== name) fehler(`</${name}> schließt <${oben?.name}>`);
      i = e + 1;
    } else if (text[i] === '<') {
      const m = /^<([A-Za-z_][\w:.-]*)/.exec(text.slice(i, i + 200));
      if (!m) fehler('ungültiger Tag');
      const el = { name: m[1], attrs: {}, kinder: [] };
      i += m[0].length;
      const re = /\s*([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/y;
      for (;;) {
        re.lastIndex = i;
        const a = re.exec(text);
        if (!a) break;
        el.attrs[a[1]] = entschluessle(a[2] ?? a[3]);
        i = re.lastIndex;
      }
      while (/\s/.test(text[i])) i++;
      stapel.at(-1).kinder.push(el);
      if (text.startsWith('/>', i)) i += 2;
      else if (text[i] === '>') {
        stapel.push(el);
        i++;
      } else fehler(`Tag <${el.name}> nicht geschlossen`);
    } else {
      const e = text.indexOf('<', i);
      const t = text.slice(i, e < 0 ? undefined : e);
      if (t.trim()) stapel.at(-1).kinder.push({ text: entschluessle(t) });
      i = e < 0 ? text.length : e;
    }
  }
  if (stapel.length !== 1) throw new Error(`XML: <${stapel.at(-1).name}> nicht geschlossen`);
  return wurzel;
}

// ---------- Prüfung einer Zeichnung ----------
const ZEICHNEND = new Set(['path', 'polygon', 'polyline', 'circle', 'ellipse', 'rect', 'line']);
const STILL = new Set(['title', 'desc']);
const ATTRIBUTE = new Set([
  'd', 'points', 'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2',
  'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'fill-rule',
]);
const METADATEN = /^(id|data-[\w-]+|xml:[\w-]+|inkscape:[\w-]+|sodipodi:[\w-]+)$/;
const VERBOTEN = ['opacity', 'fill-opacity', 'stroke-opacity', 'filter', 'mask', 'clip-path'];

/** Farbe normalisieren: #rgb → #rrggbb, black/white → Hex; sonst null (nicht erlaubt). */
export function farbe(wert) {
  const v = String(wert).trim().toLowerCase();
  if (v === 'none') return 'none';
  if (v === 'black') return '#000000';
  if (v === 'white') return '#ffffff';
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) return '#' + [...v.slice(1)].map((c) => c + c).join('');
  return null;
}

const ebenenName = (g) => g.attrs['inkscape:label'] ?? g.attrs['data-name'] ?? g.attrs.id ?? '';

/**
 * Zeichnung prüfen und Teile ins lokale System bringen.
 * Liefert { befunde: [{ teil, text }], teile: { id: svg }, freieFarben: Set }.
 */
export function pruefeZeichnung(text, name, spez = SPEZ) {
  const befunde = [];
  const befund = (teil, t) => befunde.push({ teil, text: t });
  const freieFarben = new Set();
  const schluessel = Object.fromEntries(Object.entries(spez.farbschluessel).map(([hex, rolle]) => [hex.toLowerCase(), `@${rolle}`]));
  const konturen = new Set([spez.kontur.detail, spez.kontur.teil]);
  let doc;
  try {
    doc = leseXml(text);
  } catch (e) {
    return { befunde: [{ teil: '-', text: e.message }], teile: {}, freieFarben };
  }
  const svg = doc.kinder.find((k) => k.name === 'svg');
  if (!svg) return { befunde: [{ teil: '-', text: 'kein <svg>-Element' }], teile: {}, freieFarben };
  if (svg.attrs.transform) befund('-', 'transform auf <svg>');
  const soll = teileVon(spez, name);
  const L = layout(spez, name);
  const gefunden = new Map();
  for (const k of svg.kinder) {
    if (k.text !== undefined || STILL.has(k.name) || k.name === 'metadata' || k.name === 'sodipodi:namedview') continue;
    if (k.name === 'defs') {
      if (k.kinder.some((d) => d.name)) befund('-', '<defs> mit Inhalt (Verläufe, Muster, Masken sind nicht erlaubt)');
      continue;
    }
    if (k.name !== 'g') {
      befund('-', `<${k.name}> außerhalb einer Ebene`);
      continue;
    }
    const n = ebenenName(k);
    if (n.startsWith('hilfe')) continue;
    if (!soll.includes(n)) befund(n || '-', `fremde Ebene „${n}“ (erlaubt: Teile des Archetyps und hilfe-…)`);
    else if (gefunden.has(n)) befund(n, 'Ebene doppelt');
    else gefunden.set(n, k);
  }

  function serialisiere(el, teil, geerbt) {
    if (el.text !== undefined) {
      befund(teil, 'Text in einem Teil (Text setzt immer der Code)');
      return '';
    }
    if (STILL.has(el.name)) return '';
    if (el.name !== 'g' && !ZEICHNEND.has(el.name)) {
      befund(teil, `<${el.name}> ist nicht erlaubt`);
      return '';
    }
    const a = el.attrs;
    if (a.transform) befund(teil, `transform an <${el.name}> (Teile ohne Skalierung oder Drehung exportieren)`);
    if (a.style || a.class) befund(teil, `style/class an <${el.name}>: Präsentationsattribute verwenden`);
    if (a.display === 'none' || a.visibility === 'hidden') befund(teil, `verborgenes <${el.name}>`);
    for (const k of VERBOTEN) if (a[k] !== undefined) befund(teil, `${k} an <${el.name}> ist nicht erlaubt`);
    if (el.name === 'rect' && (a.rx || a.ry)) befund(teil, 'Eckradius an <rect> (als Pfad zeichnen)');
    const eigen = { ...geerbt };
    const aus = [];
    for (const [k, v] of Object.entries(a)) {
      if (METADATEN.test(k) || ['transform', 'style', 'class', 'display', 'visibility'].includes(k)) continue;
      if (!ATTRIBUTE.has(k)) {
        if (!VERBOTEN.includes(k)) befund(teil, `Attribut ${k} an <${el.name}> ist nicht erlaubt`);
        continue;
      }
      if (v.includes('url(')) {
        befund(teil, `${k}="${v}": Verweise (Verläufe, Muster) sind nicht erlaubt`);
        continue;
      }
      let wert = v;
      if (k === 'fill' || k === 'stroke') {
        const f = farbe(v);
        if (!f) {
          befund(teil, `${k}="${v}" ist keine erlaubte Farbe (Hex, black, white, none)`);
          continue;
        }
        eigen[k] = f;
        if (schluessel[f]) wert = schluessel[f];
        else {
          if (f !== 'none' && f !== '#000000' && f !== '#ffffff') freieFarben.add(f);
          wert = f;
        }
      }
      if (k === 'stroke-width') eigen.strich = Number(v);
      aus.push(`${k}="${maske(wert)}"`);
    }
    if (ZEICHNEND.has(el.name) && eigen.stroke && eigen.stroke !== 'none' && !konturen.has(eigen.strich ?? 1)) {
      befund(teil, `Kontur ${eigen.strich ?? 1} px an <${el.name}> (erlaubt: ${[...konturen].join(' oder ')} px)`);
    }
    const innen = el.kinder.map((c) => serialisiere(c, teil, eigen)).join('');
    const kopf = `<${el.name}${aus.length ? ' ' + aus.join(' ') : ''}`;
    return el.name === 'g' ? `${kopf}>${innen}</g>` : `${kopf}/>`;
  }

  const teile = {};
  for (const t of soll) {
    const g = gefunden.get(t);
    if (!g) {
      befund(t, 'Teil fehlt');
      continue;
    }
    if (g.attrs.transform) befund(t, 'transform auf der Ebene');
    const geerbt = {};
    for (const k of ['fill', 'stroke']) if (g.attrs[k]) geerbt[k] = farbe(g.attrs[k]);
    if (g.attrs['stroke-width']) geerbt.strich = Number(g.attrs['stroke-width']);
    const innen = g.kinder.map((c) => serialisiere(c, t, geerbt)).join('');
    if (!/<(path|polygon|polyline|circle|ellipse|rect|line)\b/.test(innen)) {
      befund(t, 'Ebene ohne Zeichnung');
      continue;
    }
    const p = L.drehpunkte[t];
    const ebenenAttr = ['fill', 'stroke', 'stroke-width']
      .filter((k) => g.attrs[k])
      .map((k) => ` ${k}="${maske(k === 'stroke-width' ? g.attrs[k] : schluessel[farbe(g.attrs[k])] ?? farbe(g.attrs[k]))}"`)
      .join('');
    teile[t] = `<g transform="translate(${-p.x} ${-p.y})"${ebenenAttr}>${innen}</g>`;
  }
  return { befunde, teile, freieFarben };
}

// ---------- Gelenkprüfung: Bausteine ----------
export const PRUEF = { halbbreite: 20, pixel: 160, toleranz: 2 };

/** Alle Füllungen und Konturen schwarz: geprüft wird Deckung, nicht Farbe. */
const schwarz = (s) => s.replace(/(fill|stroke)="(?!none")[^"]*"/g, '$1="#000000"');

/**
 * Testbilder der Gelenkprüfung: je Gelenk und Winkel ein SVG mit Eltern- und gedrehtem Kindteil um den Gelenkpunkt.
 * Liefert { tests, svgs, radius } (radius in Pixeln des Testbilds).
 */
export function gelenkTests(teile, name, spez = SPEZ) {
  const tests = [];
  for (const g of gelenke(spez, name)) {
    if (!teile[g.eltern] || !teile[g.kind]) continue;
    for (const winkel of PRUEFWINKEL) tests.push({ ...g, winkel });
  }
  const H = PRUEF.halbbreite;
  const svgs = tests.map(({ eltern, kind, punkt: { x, y }, winkel }) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PRUEF.pixel}" height="${PRUEF.pixel}" viewBox="${x - H} ${y - H} ${2 * H} ${2 * H}">` +
    `<rect x="${x - H}" y="${y - H}" width="${2 * H}" height="${2 * H}" fill="#ffffff"/>` +
    `${schwarz(teile[eltern])}<g transform="translate(${x} ${y}) rotate(${winkel})">${schwarz(teile[kind])}</g></svg>`,
  );
  const radius = ((spez.gelenk_ueberlappung / 2) * PRUEF.pixel) / (2 * H);
  return { tests, svgs, radius };
}

/** Weiße Pixel im Kreis um die Bildmitte (RGBA-Daten eines Testbilds). */
export function zaehleWeiss(daten, pixel, radius) {
  let n = 0;
  const m = pixel / 2;
  for (let y = 0; y < pixel; y++) {
    for (let x = 0; x < pixel; x++) {
      if ((x + 0.5 - m) ** 2 + (y + 0.5 - m) ** 2 > radius ** 2) continue;
      const i = (y * pixel + x) * 4;
      if (daten[i] + daten[i + 1] + daten[i + 2] > 3 * 128) n++;
    }
  }
  return n;
}
