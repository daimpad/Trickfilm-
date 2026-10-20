// Erzeugt aus figuren/rig-spezifikation.json:
//   lib/rigs/spezifikation.js                 die Spezifikation als ES-Modul (Browser und Remotion lesen kein JSON)
//   figuren/vorlage_<archetyp>.svg            Zeichenvorlagen für Illustrator oder Inkscape
//   figuren/teilesaetze/satz-00/<archetyp>.svg  Platzhalter-Teilesatz aus Grundformen, im selben Exportformat
//                                               wie eine Zeichnung; der Importer liest ihn wie jede andere
// Aufruf: node tools/figuren-erzeugen.js [--pruefen]
// --pruefen schreibt nichts und endet mit Fehler, wenn eine Datei veraltet ist.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { layout, teileVon } from './figuren-layout.js';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const QUELLE = 'figuren/rig-spezifikation.json';
const spez = JSON.parse(readFileSync(join(WURZEL, QUELLE), 'utf8'));
const K = spez.kontur;

// Farbschlüssel der Exportregeln (Abschnitt 7.2) und die festen Farben der Grundformen.
const SCHLUESSEL = Object.fromEntries(Object.entries(spez.farbschluessel).map(([hex, rolle]) => [rolle, hex]));
const SCHWARZ = '#000000';
const WEISS = '#ffffff';
const HILFE = '#0096d6';

const z = (v) => String(Math.round(v * 100) / 100);

// ---------- Grundformen mit absoluten Koordinaten (Exportregeln: keine Transformationen) ----------
/** Kapsel als Pfad: senkrecht von y0 bis y1 um den Drehpunkt o, runde Enden als Bögen. */
function kapsel(o, y0, y1, breite, farbe, strich = K.teil) {
  const r = breite / 2;
  const d = `M${z(o.x - r)} ${z(o.y + y0)} A${z(r)} ${z(r)} 0 0 1 ${z(o.x + r)} ${z(o.y + y0)} L${z(o.x + r)} ${z(o.y + y1)} A${z(r)} ${z(r)} 0 0 1 ${z(o.x - r)} ${z(o.y + y1)} Z`;
  return `<path d="${d}" fill="${farbe}" stroke="${SCHWARZ}" stroke-width="${strich}" stroke-linejoin="round"/>`;
}
const vieleck = (o, ps, farbe, strich = K.teil) =>
  `<polygon points="${ps.map(([x, y]) => `${z(o.x + x)},${z(o.y + y)}`).join(' ')}" fill="${farbe}" stroke="${SCHWARZ}" stroke-width="${strich}" stroke-linejoin="round"/>`;
const kreis = (o, cx, cy, r, farbe, strich = K.teil) =>
  `<circle cx="${z(o.x + cx)}" cy="${z(o.y + cy)}" r="${z(r)}" fill="${farbe}" stroke="${SCHWARZ}" stroke-width="${strich}"/>`;
const ellipse = (o, cx, cy, rx, ry, farbe, strich) =>
  `<ellipse cx="${z(o.x + cx)}" cy="${z(o.y + cy)}" rx="${z(rx)}" ry="${z(ry)}" fill="${farbe}" stroke="${SCHWARZ}" stroke-width="${strich}"/>`;
const strichlinie = (o, [x1, y1], [x2, y2], strich) =>
  `<path d="M${z(o.x + x1)} ${z(o.y + y1)} L${z(o.x + x2)} ${z(o.y + y2)}" fill="none" stroke="${SCHWARZ}" stroke-width="${strich}" stroke-linecap="round"/>`;

const HAENDE = {
  offen: (o) => ellipse(o, 0, 13, 10, 13, WEISS, K.detail),
  greifend: (o) => kreis(o, 0, 11, 11, WEISS, K.detail) + strichlinie(o, [8, 6], [13, 13], K.detail),
  zeigend: (o) => kapsel(o, 14, 34, 6, WEISS, K.detail) + kreis(o, 0, 10, 10, WEISS, K.detail),
};

/** Grundform eines Teils am Drehpunkt o. */
function grundform(name, teil, o) {
  const a = spez.archetypen[name];
  const s = a.segmente;
  const frontal = a.ansicht === 'frontal';
  if (teil === 'torso') {
    return frontal
      ? vieleck(o, [[-34, 10], [34, 10], [38, -60], [46, -116], [32, -132], [-32, -132], [-46, -116], [-38, -60]], SCHLUESSEL.kleidung1)
      : vieleck(o, [[-24, 10], [20, 10], [26, -60], [24, -112], [12, -132], [-14, -134], [-26, -110], [-28, -40]], SCHLUESSEL.kleidung1);
  }
  if (teil === 'head') return kapsel(o, -12, 0, 14, WEISS) + kreis(o, frontal ? 0 : 3, -38, 30, WEISS);
  const [glied, art, form] = teil.split('-');
  if (art === 'upper') return glied.startsWith('arm') ? kapsel(o, 0, s.oberarm, 24, SCHLUESSEL.kleidung1) : kapsel(o, 0, s.oberschenkel, 34, SCHLUESSEL.kleidung2);
  if (art === 'lower') return glied.startsWith('arm') ? kapsel(o, 0, s.unterarm, 22, SCHLUESSEL.kleidung1) : kapsel(o, 0, s.unterschenkel, 30, SCHLUESSEL.kleidung2);
  if (art === 'hand') return HAENDE[form](o);
  if (art === 'foot') {
    const k = s.knoechel;
    if (!frontal) return vieleck(o, [[-12, -8], [10, -8], [34, 2], [34, k], [-12, k]], SCHWARZ, K.detail);
    const v = glied === 'legL' ? -1 : 1;
    return vieleck(o, [[-12 * v, -6], [16 * v, -6], [18 * v, k], [-14 * v, k]], SCHWARZ, K.detail);
  }
  throw new Error(`Grundform für ${teil} fehlt`);
}

const KOPF_SVG = (wozu) => `<?xml version="1.0" encoding="UTF-8"?>\n<!-- ERZEUGT von tools/figuren-erzeugen.js aus ${QUELLE}: ${wozu}. Nicht von Hand ändern. -->\n`;
const svgAuf = (L) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${L.breite}" height="${L.hoehe}" viewBox="0 0 ${L.breite} ${L.hoehe}">\n`;
const ebene = (id, inhalt = '', extra = '') => `  <g id="${id}" inkscape:groupmode="layer" inkscape:label="${id}"${extra}>${inhalt}</g>\n`;

const links = (teil) => teil === 'torso' || /^(armL|legL)-/.test(teil);

/** Zeichenvorlage: Legende, Referenz satz-00 (blass), Drehpunkte mit Überlappungskreis, leere Teil-Ebenen. */
function vorlage(name) {
  const L = layout(spez, name);
  const teile = teileVon(spez, name);
  const text = (x, y, inhalt, gr = 12) => `<text x="${x}" y="${y}" font-family="Arial, 'Liberation Sans', sans-serif" font-size="${gr}" fill="${SCHWARZ}">${inhalt}</text>`;
  const legende = [
    text(16, 24, `Zeichenvorlage ${name} · Rig-Spezifikation Fassung ${spez.fassung}`, 16),
    text(16, 42, 'Je Teil eine Ebene mit genau diesem Namen; Hilfsebenen (hilfe-…) werden beim Import ignoriert.'),
    text(16, 58, `Blaue Kreise: Drehpunkte mit Überlappungskreis ${spez.gelenk_ueberlappung} px; das Teil muss den Kreis decken.`),
    text(16, 74, 'Konturen 4 oder 6 px · keine Transformationen, Verläufe, Filter, Masken, Schatten · Handvarianten offen, greifend, zeigend.'),
    `<rect x="16" y="82" width="12" height="12" fill="${SCHLUESSEL.kleidung1}"/>` + text(32, 92, `${SCHLUESSEL.kleidung1} Kleidung 1`),
    `<rect x="136" y="82" width="12" height="12" fill="${SCHLUESSEL.kleidung2}" stroke="${SCHWARZ}" stroke-width="1"/>` + text(152, 92, `${SCHLUESSEL.kleidung2} Kleidung 2`),
    `<rect x="256" y="82" width="12" height="12" fill="${SCHLUESSEL.zubehoer}"/>` + text(272, 92, `${SCHLUESSEL.zubehoer} Zubehör`),
  ].join('');
  const referenz = teile.map((t) => grundform(name, t, L.drehpunkte[t])).join('');
  const marken = teile
    .map((t) => {
      const p = L.drehpunkte[t];
      const r = spez.gelenk_ueberlappung / 2;
      return (
        `<circle cx="${z(p.x)}" cy="${z(p.y)}" r="${z(r)}" fill="none" stroke="${HILFE}" stroke-width="1.5"/>` +
        `<path d="M${z(p.x - 10)} ${z(p.y)} L${z(p.x + 10)} ${z(p.y)} M${z(p.x)} ${z(p.y - 10)} L${z(p.x)} ${z(p.y + 10)}" stroke="${HILFE}" stroke-width="1"/>` +
        // Rumpf und linke Glieder links beschriften, damit Namen an gemeinsamen Punkten nicht übereinander stehen.
        (links(t)
          ? `<text x="${z(p.x - 9)}" y="${z(p.y - 4)}" text-anchor="end" font-family="Arial, 'Liberation Sans', sans-serif" font-size="9" fill="${HILFE}">${t}</text>`
          : `<text x="${z(p.x + 9)}" y="${z(p.y - 4)}" font-family="Arial, 'Liberation Sans', sans-serif" font-size="9" fill="${HILFE}">${t}</text>`)
      );
    })
    .join('');
  const a = spez.archetypen[name];
  const boden = a.beine !== 'keine' ? `<path d="M0 ${z(L.haupt.y + 210)} L${L.breite} ${z(L.haupt.y + 210)}" stroke="${HILFE}" stroke-width="1" stroke-dasharray="6 6"/>` : '';
  return (
    KOPF_SVG(`Zeichenvorlage ${name}; zum Zeichnen eine Kopie nach figuren/teilesaetze/<satz>/${name}.svg legen`) +
    svgAuf(L) +
    ebene('hilfe-legende', legende) +
    ebene('hilfe-referenz', referenz, ' opacity="0.25"') +
    ebene('hilfe-drehpunkte', boden + marken) +
    teile.map((t) => ebene(t)).join('') +
    `</svg>\n`
  );
}

/** satz-00 im Exportformat einer Zeichnung: je Teil eine Ebene, absolute Koordinaten, Farbschlüssel. */
function satz00(name) {
  const L = layout(spez, name);
  return (
    KOPF_SVG(`Platzhalter-Teilesatz satz-00 für ${name} im Exportformat`) +
    svgAuf(L) +
    teileVon(spez, name).map((t) => ebene(t, grundform(name, t, L.drehpunkte[t]))).join('') +
    `</svg>\n`
  );
}

const dateien = {
  'lib/rigs/spezifikation.js':
    `// ERZEUGT von tools/figuren-erzeugen.js aus ${QUELLE}: normative Maße der Rigs. Nicht von Hand ändern.\n` +
    `export const SPEZ = ${JSON.stringify(spez, null, 2)};\n`,
};
for (const name of Object.keys(spez.archetypen)) {
  dateien[`figuren/vorlage_${name}.svg`] = vorlage(name);
  dateien[`figuren/teilesaetze/satz-00/${name}.svg`] = satz00(name);
}

const pruefen = process.argv.includes('--pruefen');
let veraltet = 0;
for (const [pfad, inhalt] of Object.entries(dateien)) {
  const ziel = join(WURZEL, pfad);
  const alt = existsSync(ziel) ? readFileSync(ziel, 'utf8') : null;
  if (alt === inhalt) continue;
  if (pruefen) {
    console.error(`FEHLER veraltet: ${pfad} (npm run figuren:erzeugen)`);
    veraltet++;
  } else {
    mkdirSync(dirname(ziel), { recursive: true });
    writeFileSync(ziel, inhalt);
    console.log(`geschrieben: ${pfad}`);
  }
}
console.log(`${Object.keys(dateien).length} Dateien ${pruefen ? 'geprüft' : 'erzeugt'}, ${veraltet} veraltet.`);
if (veraltet) process.exit(1);
