// Erzeugt den Posen-Editor als eine Seite, die offline läuft und die echte Bibliothek nutzt.
// Aufruf: node tools/posen-editor.js [--archetyp <name>] [--szene <ID> [--figur A] [--t 0]] [--frisch] [--ziel <pfad>]
// Mit --szene liegt das Standbild der Szene blass unter der Figur; --figur übernimmt Position, Blick und Palette.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FARBEN, ROLLEN, SCHRIFT } from '../tokens/tokens.js';
import { buendle, importmapSkript } from '../lib/bundle.js';
import { standbild } from '../lib/snapshot.js';
import { ladeSzene } from '../lib/build.js';
import { RIGS } from '../lib/rigs/index.js';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const ziel = join(WURZEL, arg('--ziel') ?? 'out/editor/posen-editor.html');

const start = { archetyp: arg('--archetyp') ?? 'stehend-profil', frisch: process.argv.includes('--frisch') };
if (!RIGS[start.archetyp]) {
  console.error(`FEHLER: Archetyp „${start.archetyp}“ unbekannt; bekannt: ${Object.keys(RIGS).join(', ')}`);
  process.exit(2);
}
let hintergrund = '';
const szenenId = arg('--szene');
if (szenenId) {
  const sz = await ladeSzene(szenenId);
  const t = Number(arg('--t') ?? 0);
  const bild = Buffer.from(standbild(sz, t)).toString('base64');
  hintergrund = `<image href="data:image/svg+xml;base64,${bild}" x="0" y="0" width="1920" height="1080" opacity="0.4"/>`;
  const prefix = arg('--figur');
  if (prefix) {
    const f = sz.geometry.GEO?.figuren?.[prefix];
    if (!f) {
      console.error(`FEHLER: Figur ${prefix} steht nicht in GEO.figuren von ${szenenId}`);
      process.exit(2);
    }
    Object.assign(start, { archetyp: f.rig, x: f.x, y: f.y, dir: f.dir, teilesatz: f.teilesatz, palette: f.palette, frisch: true });
  }
}

const { importmap } = buendle(
  ['lib/rigs/index.js', 'lib/teilesaetze/index.js', 'lib/posen.js', 'lib/rigs/basis.js', 'lib/stage.js', 'tokens/tokens.js'].map((p) => join(WURZEL, p)),
  WURZEL,
);
const css = [
  `--grund: ${FARBEN.primaerHell}`,
  `--weiss: ${FARBEN.weiss}`,
  `--text: ${ROLLEN.text}`,
  `--kontur: ${ROLLEN.kontur}`,
  `--akzent: ${FARBEN.rot}`,
  `--akzent2: ${FARBEN.petrol}`,
  `--hilfe: ${FARBEN.ocker}`,
  `--schrift: ${SCHRIFT.familie}`,
].join('; ') + ';';
const ersetzungen = {
  TOKENS_CSS: css,
  HINTERGRUND: hintergrund,
  IMPORTMAP: importmapSkript(importmap),
  START_JSON: JSON.stringify(start).replace(/</g, '\\u003c'),
};
const vorlage = readFileSync(join(WURZEL, 'lib', 'posen-editor.template.html'), 'utf8');
const seite = vorlage.replace(/\{\{([A-Z_]+)\}\}/g, (ganz, k) => {
  if (!(k in ersetzungen)) throw new Error(`Editor-Vorlage: Platzhalter {{${k}}} unbekannt`);
  return ersetzungen[k];
});
mkdirSync(dirname(ziel), { recursive: true });
writeFileSync(ziel, seite);
console.log(`Posen-Editor → ${ziel.replace(WURZEL + '/', '')} (im Browser öffnen; läuft ohne Netz)`);
