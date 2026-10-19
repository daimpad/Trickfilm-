// Erzeugt aus figuren/rig-spezifikation.json:
//   lib/rigs/spezifikation.js           die Spezifikation als ES-Modul (Browser und Remotion lesen kein JSON)
//   lib/teilesaetze/satz-00/<archetyp>.js   Platzhalter-Teilesatz aus Grundformen, Test- und Rückfallsatz
// Aufruf: node tools/figuren-erzeugen.js [--pruefen]
// --pruefen schreibt nichts und endet mit Fehler, wenn eine Datei veraltet ist.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const QUELLE = 'figuren/rig-spezifikation.json';
const KOPF = (wozu) => `// ERZEUGT von tools/figuren-erzeugen.js aus ${QUELLE}: ${wozu}. Nicht von Hand ändern.\n`;

const spez = JSON.parse(readFileSync(join(WURZEL, QUELLE), 'utf8'));
const K = spez.kontur;

// Grundformen. Farben nur als Rollen (@kontur, @weiss, @kleidung1, @kleidung2, @zubehoer),
// die das Rig aus Tokens und Palette füllt.
const z = (v) => String(Math.round(v * 100) / 100);
const punkte = (ps) => ps.map(([x, y]) => `${z(x)},${z(y)}`).join(' ');

/** Glied als Kapsel: Konturband in Breite K.teil um die Füllung, runde Enden (Ausnahme für Figuren). */
function glied(laenge, breite, farbe) {
  const d = `M0 0 L0 ${z(laenge)}`;
  return (
    `<path d="${d}" fill="none" stroke="@kontur" stroke-width="${z(breite + 2 * K.teil)}" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="${farbe}" stroke-width="${z(breite)}" stroke-linecap="round"/>`
  );
}

const flaeche = (ps, farbe, strich = K.teil) =>
  `<polygon points="${punkte(ps)}" fill="${farbe}" stroke="@kontur" stroke-width="${strich}" stroke-linejoin="round"/>`;
const kreis = (cx, cy, r, farbe, strich = K.teil) =>
  `<circle cx="${z(cx)}" cy="${z(cy)}" r="${z(r)}" fill="${farbe}" stroke="@kontur" stroke-width="${strich}"/>`;

const kopf = (cx) => glied(12, 12, '@weiss') + kreis(cx, -38, 30, '@weiss');

const haende = {
  offen: `<ellipse cx="0" cy="13" rx="10" ry="13" fill="@weiss" stroke="@kontur" stroke-width="${K.detail}"/>`,
  greifend:
    kreis(0, 11, 11, '@weiss', K.detail) +
    `<path d="M8 6 L13 13" fill="none" stroke="@kontur" stroke-width="${K.detail}" stroke-linecap="round"/>`,
  zeigend:
    `<path d="M0 14 L0 34" fill="none" stroke="@kontur" stroke-width="${z(6 + 2 * K.detail)}" stroke-linecap="round"/>` +
    `<path d="M0 14 L0 34" fill="none" stroke="@weiss" stroke-width="6" stroke-linecap="round"/>` +
    kreis(0, 10, 10, '@weiss', K.detail),
};

function profilTeile(a) {
  const s = a.segmente;
  const teile = {
    torso: flaeche([[-24, 10], [20, 10], [26, -60], [24, -112], [12, -132], [-14, -134], [-26, -110], [-28, -40]], '@kleidung1'),
    head: kopf(3),
  };
  for (const arm of ['armF', 'armB']) {
    teile[`${arm}-upper`] = glied(s.oberarm, 20, '@kleidung1');
    teile[`${arm}-lower`] = glied(s.unterarm, 18, '@kleidung1');
    for (const [form, inhalt] of Object.entries(haende)) teile[`${arm}-hand-${form}`] = inhalt;
  }
  if (a.beine !== 'keine') {
    for (const bein of ['legF', 'legB']) {
      teile[`${bein}-upper`] = glied(s.oberschenkel, 30, '@kleidung2');
      teile[`${bein}-lower`] = glied(s.unterschenkel, 26, '@kleidung2');
      const k = s.knoechel;
      teile[`${bein}-foot`] = flaeche([[-12, -8], [10, -8], [34, 2], [34, k], [-12, k]], '@kontur', K.detail);
    }
  }
  return teile;
}

function frontalTeile(a) {
  const s = a.segmente;
  const teile = {
    torso: flaeche([[-34, 10], [34, 10], [38, -60], [46, -116], [32, -132], [-32, -132], [-46, -116], [-38, -60]], '@kleidung1'),
    head: kopf(0),
  };
  for (const arm of ['armL', 'armR']) {
    teile[`${arm}-upper`] = glied(s.oberarm, 20, '@kleidung1');
    teile[`${arm}-lower`] = glied(s.unterarm, 18, '@kleidung1');
    for (const [form, inhalt] of Object.entries(haende)) teile[`${arm}-hand-${form}`] = inhalt;
  }
  const k = s.knoechel;
  for (const [bein, seite] of [['legL', -1], ['legR', 1]]) {
    teile[`${bein}-upper`] = glied(s.oberschenkel, 30, '@kleidung2');
    teile[`${bein}-lower`] = glied(s.unterschenkel, 26, '@kleidung2');
    teile[`${bein}-foot`] = flaeche([[-12 * seite, -6], [16 * seite, -6], [18 * seite, k], [-14 * seite, k]], '@kontur', K.detail);
  }
  return teile;
}

function teilesatzModul(name, a) {
  const teile = a.ansicht === 'frontal' ? frontalTeile(a) : profilTeile(a);
  const zeilen = Object.entries(teile).map(([id, svg]) => `  '${id}': ${JSON.stringify(svg)},`);
  return (
    KOPF(`Platzhalter-Teilesatz satz-00 für ${name}`) +
    `export const SATZ = 'satz-00';\nexport const ARCHETYP = '${name}';\n` +
    `/** Teile im lokalen System, Drehpunkt im Ursprung; Farben als Rollen @… */\n` +
    `export const TEILE = {\n${zeilen.join('\n')}\n};\n`
  );
}

const dateien = {
  'lib/rigs/spezifikation.js':
    KOPF('normative Maße der Rigs') + `export const SPEZ = ${JSON.stringify(spez, null, 2)};\n`,
};
for (const [name, a] of Object.entries(spez.archetypen)) {
  dateien[`lib/teilesaetze/satz-00/${name}.js`] = teilesatzModul(name, a);
}
dateien['lib/teilesaetze/index.js'] =
  KOPF('Verzeichnis aller Teilesätze') +
  Object.keys(spez.archetypen)
    .map((name, i) => `import * as s00_${i} from './satz-00/${name}.js';`)
    .join('\n') +
  `\n\n/** TEILESAETZE[satz][archetyp] = Modul mit TEILE */\nexport const TEILESAETZE = {\n  'satz-00': {\n` +
  Object.keys(spez.archetypen)
    .map((name, i) => `    '${name}': s00_${i},`)
    .join('\n') +
  `\n  },\n};\n`;

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
