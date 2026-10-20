// Teile-Werkstatt, fachlicher Kern ohne DOM: einzelne Zeichnungen auf das Skelett einpassen, zweite Seite und
// Handvarianten ableiten und alles zu einer Zeichnung im Austauschformat für den Importer zusammensetzen.
// Ein Teil wird nur verschoben, gedreht, gleichmäßig skaliert und gespiegelt, nie verzerrt.
import { SPEZ } from './rigs/spezifikation.js';
import { layout, teileVon } from './rigs/vorlage-layout.js';
import { leseXml, maske } from './zeichnung.js';
import { formenAlsSvg, mal, rahmenVon, transformiereFormen, verschiebung, wende } from './svgpfad.js';

/** Archetypen je Ansicht: ein Profil-Satz gilt für alle drei Profil-Archetypen. */
export const ARCHETYPEN = { profil: ['sitzend-profil', 'stehend-profil', 'oberkoerper-nah'], frontal: ['stehend-frontal'] };
/** Archetyp, dessen Teile die Ansicht vollständig beschreiben (mit Beinen). */
export const VOLL = { profil: 'stehend-profil', frontal: 'stehend-frontal' };

/** Höhe der Handvarianten im Spezifikationsmaß. */
const HAND_HOEHE = { offen: 26, greifend: 22, zeigend: 34 };

/** Teile einer Ansicht in Zeichenreihenfolge. */
export const teileDerAnsicht = (ansicht, spez = SPEZ) => teileVon(spez, VOLL[ansicht]);

/** Art eines Teils: torso, head, upper, lower, hand, foot. */
export function teilArt(id) {
  if (id === 'torso' || id === 'head') return id;
  return id.split('-')[1];
}

/**
 * Zielstrecke eines Teils im lokalen System (Drehpunkt im Ursprung): A und B, auf die die Achse der
 * Zeichnung gelegt wird, und welche Achse der Zeichnung gemeint ist.
 */
export function zielStrecke(id, spez = SPEZ) {
  const s = spez.archetypen[VOLL.profil].segmente;
  const art = teilArt(id);
  const glied = id.split('-')[0];
  if (art === 'torso') return { A: { x: 0, y: 10 }, B: { x: 0, y: -134 }, achse: 'unten-oben' };
  if (art === 'head') return { A: { x: 0, y: 4 }, B: { x: 0, y: -68 }, achse: 'unten-oben' };
  if (art === 'hand') return { A: { x: 0, y: -2 }, B: { x: 0, y: HAND_HOEHE[id.split('-')[2]] - 2 }, achse: 'oben-unten' };
  if (art === 'upper') return { A: { x: 0, y: 0 }, B: { x: 0, y: glied.startsWith('arm') ? s.oberarm : s.oberschenkel }, achse: 'glied' };
  if (art === 'lower') return { A: { x: 0, y: 0 }, B: { x: 0, y: glied.startsWith('arm') ? s.unterarm : s.unterschenkel }, achse: 'glied' };
  if (art === 'foot') {
    if (glied === 'legL') return { A: { x: -16, y: 2 }, B: { x: 12, y: 2 }, achse: 'links-rechts' };
    if (glied === 'legR') return { A: { x: -12, y: 2 }, B: { x: 16, y: 2 }, achse: 'links-rechts' };
    return { A: { x: -12, y: 1 }, B: { x: 34, y: 1 }, achse: 'links-rechts' };
  }
  throw new Error(`Teil „${id}“ unbekannt`);
}

/**
 * Achse der geladenen Zeichnung: a und b in ihren eigenen Koordinaten. Glieder werden an ihrer Längsachse
 * gemessen; die Endpunkte liegen um die halbe Breite eingerückt, damit das Gelenk in der runden Kappe sitzt.
 */
export function quellAchse(formen, achse) {
  const r = rahmenVon(formen);
  const w = r.x1 - r.x0;
  const h = r.y1 - r.y0;
  const cx = (r.x0 + r.x1) / 2;
  const cy = (r.y0 + r.y1) / 2;
  if (achse === 'unten-oben') return { a: { x: cx, y: r.y1 }, b: { x: cx, y: r.y0 } };
  if (achse === 'oben-unten') return { a: { x: cx, y: r.y0 }, b: { x: cx, y: r.y1 } };
  if (achse === 'links-rechts') return { a: { x: r.x0, y: cy }, b: { x: r.x1, y: cy } };
  // Glied: die längere Seite ist die Achse.
  if (h >= w) return h - w > 1 ? { a: { x: cx, y: r.y0 + w / 2 }, b: { x: cx, y: r.y1 - w / 2 } } : { a: { x: cx, y: r.y0 }, b: { x: cx, y: r.y1 } };
  return w - h > 1 ? { a: { x: r.x0 + h / 2, y: cy }, b: { x: r.x1 - h / 2, y: cy } } : { a: { x: r.x0, y: cy }, b: { x: r.x1, y: cy } };
}

/** Lage eines Teils: Maßstab s, Drehung rot (Grad), Verschiebung tx/ty, Spiegelung flip. */
export function matrixVon({ s, rot, tx, ty, flip }) {
  const r = (rot * Math.PI) / 180;
  const m = [s * Math.cos(r), s * Math.sin(r), -s * Math.sin(r), s * Math.cos(r), tx, ty];
  return flip ? mal([-1, 0, 0, 1, 0, 0], m) : m;
}

/** Vorschlag der Lage: Achse a→b der Zeichnung auf die Zielstrecke A→B legen. */
export function einpassen(formen, id, spez = SPEZ) {
  return lageAus(quellAchse(formen, zielStrecke(id, spez).achse), id, spez);
}

/** Lage, die eine gegebene Achse { a, b } genau auf die Zielstrecke des Teils legt (auch umgedreht). */
export function lageAus({ a, b }, id, spez = SPEZ) {
  const { A, B } = zielStrecke(id, spez);
  const lq = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const lz = Math.hypot(B.x - A.x, B.y - A.y);
  const s = lz / lq;
  const rot = ((Math.atan2(B.y - A.y, B.x - A.x) - Math.atan2(b.y - a.y, b.x - a.x)) * 180) / Math.PI;
  const m = matrixVon({ s, rot, tx: 0, ty: 0, flip: false });
  const [ax, ay] = wende(m, a.x, a.y);
  return { s, rot, tx: A.x - ax, ty: A.y - ay, flip: false };
}

/** Endpunkt der Achse im lokalen System, für den Griff, der dreht und skaliert. */
export function endPunkt(teil) {
  const [x, y] = wende(matrixVon(teil.lage), teil.achse.b.x, teil.achse.b.y);
  return { x, y };
}

/**
 * Lage so ändern, dass der Achsen-Endpunkt auf q liegt: Drehung und Maßstab um den Drehpunkt (Ursprung).
 * Mit Spiegelung wird im ungespiegelten System gerechnet.
 */
export function zieheEnde(teil, q) {
  const f = teil.lage.flip ? -1 : 1;
  const e = endPunkt(teil);
  const ex = f * e.x;
  const qx = f * q.x;
  const le = Math.hypot(ex, e.y);
  const lq = Math.hypot(qx, q.y);
  if (le < 1e-6 || lq < 1e-6) return teil.lage;
  const k = lq / le;
  const d = Math.atan2(q.y, qx) - Math.atan2(e.y, ex);
  const { s, rot, tx, ty, flip } = teil.lage;
  return { s: s * k, rot: rot + (d * 180) / Math.PI, tx: k * (Math.cos(d) * tx - Math.sin(d) * ty), ty: k * (Math.sin(d) * tx + Math.cos(d) * ty), flip };
}

/** Lage verschieben (im lokalen, sichtbaren System). */
export function verschiebe(teil, dx, dy) {
  const f = teil.lage.flip ? -1 : 1;
  return { ...teil.lage, tx: teil.lage.tx + f * dx, ty: teil.lage.ty + dy };
}

/** Neues Teil aus geladenen Formen, mit Vorschlag der Lage. */
export function neuesTeil(id, formen, datei = '', spez = SPEZ) {
  const { achse } = zielStrecke(id, spez);
  return { id, datei, formen, achse: quellAchse(formen, achse), lage: einpassen(formen, id, spez) };
}

/** Konturen nach den Exportregeln: 4 oder 6 px. */
const konturen = (spez) => [spez.kontur.detail, spez.kontur.teil];

/** Formen eines Teils im lokalen System, Konturen auf 4 oder 6 px gerundet. */
export function lokaleFormen(teil, spez = SPEZ) {
  return transformiereFormen(teil.formen, matrixVon(teil.lage), { konturen: konturen(spez) });
}

/** Woraus ein fehlendes Teil abgeleitet werden kann: { von, spiegeln } oder null. */
export function ableitungFuer(id) {
  const [glied, art, form] = id.split('-');
  if (art === 'hand' && form !== 'offen') return { von: `${glied}-hand-offen`, spiegeln: false };
  const zweite = { armB: 'armF', legB: 'legF', armR: 'armL', legR: 'legL' };
  if (zweite[glied]) return { von: `${zweite[glied]}-${id.split('-').slice(1).join('-')}`, spiegeln: glied === 'armR' || glied === 'legR' };
  return null;
}

/**
 * Wirksame lokale Formen aller Teile einer Ansicht: eigene Zeichnung, sonst abgeleitet (auch über Ketten,
 * etwa armR-hand-zeigend ← armR-hand-offen ← armL-hand-offen). Liefert { formen: id→Formen, herkunft: id→Text }.
 */
export function wirksameTeile(teile, ansicht, spez = SPEZ) {
  const formen = {};
  const herkunft = {};
  const SPIEGEL = [-1, 0, 0, 1, 0, 0];
  const loese = (id, tiefe = 0) => {
    if (id in formen) return formen[id];
    if (teile[id]) {
      formen[id] = lokaleFormen(teile[id], spez);
      herkunft[id] = `eigene Datei ${teile[id].datei}`.trim();
      return formen[id];
    }
    const abl = tiefe < 4 ? ableitungFuer(id) : null;
    const quelle = abl && loese(abl.von, tiefe + 1);
    if (quelle) {
      formen[id] = abl.spiegeln ? transformiereFormen(quelle, SPIEGEL) : quelle;
      herkunft[id] = `abgeleitet von ${abl.von}${abl.spiegeln ? ', gespiegelt' : ''}`;
      return formen[id];
    }
    formen[id] = null;
    herkunft[id] = 'fehlt';
    return null;
  };
  for (const id of teileDerAnsicht(ansicht, spez)) loese(id);
  return { formen, herkunft };
}

/** Alle Füll- und Konturfarben der geladenen Teile, sortiert. */
export function farbenVon(teile) {
  const f = new Set();
  for (const t of Object.values(teile)) for (const form of t.formen) for (const c of [form.fill, form.stroke]) if (c && c !== 'none') f.add(c);
  return [...f].sort();
}

/** Inhalt der Ebenen einer Zeichnung (für die Ergänzung aus satz-00): Name → SVG-Text. */
export function ebenenInhalt(text) {
  const doc = leseXml(text);
  const svg = doc.kinder.find((k) => k.name === 'svg');
  const schreibe = (el) => {
    if (el.text !== undefined) return maske(el.text);
    const attrs = Object.entries(el.attrs).map(([k, v]) => ` ${k}="${maske(v)}"`).join('');
    return el.kinder.length ? `<${el.name}${attrs}>${el.kinder.map(schreibe).join('')}</${el.name}>` : `<${el.name}${attrs}/>`;
  };
  const aus = {};
  for (const k of svg?.kinder ?? []) if (k.name === 'g') aus[k.attrs['inkscape:label'] ?? k.attrs.id] = k.kinder.map(schreibe).join('');
  return aus;
}

/**
 * Zeichnung im Austauschformat für einen Archetyp. zuordnung bildet Farben auf Rollen ab
 * (kleidung1, kleidung2, zubehoer); ergaenzung liefert Ebeneninhalt für fehlende Teile (satz-00) oder fehlt.
 * Liefert { text, ergaenzt: [ids], fehlend: [ids] }.
 */
export function zeichnung(formen, name, { zuordnung = {}, ergaenzung = null, quelle = 'Teile-Werkstatt' } = {}, spez = SPEZ) {
  const L = layout(spez, name);
  const schluessel = Object.fromEntries(Object.entries(spez.farbschluessel).map(([hex, rolle]) => [rolle, hex]));
  const farbe = (hex) => (zuordnung[hex] ? schluessel[zuordnung[hex]] : hex);
  const ergaenzt = [];
  const fehlend = [];
  const ebenen = teileVon(spez, name).map((id) => {
    let inhalt = '';
    if (formen[id]) {
      const p = L.drehpunkte[id];
      inhalt = formenAlsSvg(transformiereFormen(formen[id], verschiebung(p.x, p.y)), { farbe });
    } else if (ergaenzung?.[id]) {
      inhalt = ergaenzung[id];
      ergaenzt.push(id);
    } else fehlend.push(id);
    return `  <g id="${id}" inkscape:groupmode="layer" inkscape:label="${id}">${inhalt}</g>\n`;
  });
  const text =
    `<?xml version="1.0" encoding="UTF-8"?>\n<!-- ${maske(quelle)}: Teilesatz für ${name}${ergaenzt.length ? `; aus satz-00 ergänzt: ${ergaenzt.join(', ')}` : ''}. -->\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${L.breite}" height="${L.hoehe}" viewBox="0 0 ${L.breite} ${L.hoehe}">\n` +
    ebenen.join('') +
    `</svg>\n`;
  return { text, ergaenzt, fehlend };
}

/** Dateiname zu Teil: Teil-IDs und deutsche Namen (kopf, rumpf, oberarm …), sonst null. */
export function teilAusDateiname(datei, ansicht) {
  const stamm = datei.toLowerCase().replace(/\.svg$/, '').replace(/[\s_]+/g, '-');
  const ids = teileDerAnsicht(ansicht);
  const genau = ids.find((id) => id.toLowerCase() === stamm);
  if (genau) return genau;
  const vorn = ansicht === 'frontal' ? { arm: 'armL', leg: 'legL' } : { arm: 'armF', leg: 'legF' };
  const NAMEN = {
    rumpf: 'torso', koerper: 'torso', torso: 'torso', kopf: 'head', head: 'head',
    oberarm: `${vorn.arm}-upper`, unterarm: `${vorn.arm}-lower`, hand: `${vorn.arm}-hand-offen`, 'hand-offen': `${vorn.arm}-hand-offen`,
    'hand-greifend': `${vorn.arm}-hand-greifend`, 'hand-zeigend': `${vorn.arm}-hand-zeigend`, faust: `${vorn.arm}-hand-greifend`,
    oberschenkel: `${vorn.leg}-upper`, unterschenkel: `${vorn.leg}-lower`, fuss: `${vorn.leg}-foot`, 'fuß': `${vorn.leg}-foot`, schuh: `${vorn.leg}-foot`,
  };
  return NAMEN[stamm] ?? null;
}
