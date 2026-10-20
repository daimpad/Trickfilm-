// Erzeugt die Teile-Werkstatt als eine Seite, die offline läuft und die echte Bibliothek nutzt.
// Aufruf: node tools/teile-werkstatt.js [--frisch] [--ziel out/teile/teile-werkstatt.html]
// --frisch: ohne gespeicherten Zwischenstand aus dem Browser beginnen.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FARBEN, ROLLEN, SCHRIFT } from '../tokens/tokens.js';
import { buendle, importmapSkript } from '../lib/bundle.js';
import { ARCHETYPEN } from '../lib/teile.js';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const i = process.argv.indexOf('--ziel');
const ziel = join(WURZEL, i >= 0 ? process.argv[i + 1] : 'out/teile/teile-werkstatt.html');

// satz-00 dient als Geist beim Einpassen und als Ergänzung fehlender Teile.
const satz00 = Object.fromEntries(
  [...ARCHETYPEN.profil, ...ARCHETYPEN.frontal].map((name) => [name, readFileSync(join(WURZEL, `figuren/teilesaetze/satz-00/${name}.svg`), 'utf8')]),
);

const { importmap } = buendle(
  ['lib/rigs/spezifikation.js', 'lib/rigs/index.js', 'lib/rigs/testposen.js', 'lib/rigs/vorlage-layout.js', 'lib/snapshot.js', 'lib/svgpfad.js', 'lib/teile.js', 'lib/zeichnung.js', 'lib/zip.js'].map((p) =>
    join(WURZEL, p),
  ),
  WURZEL,
);
const css = [
  `--grund: ${FARBEN.primaerHell}`,
  `--weiss: ${FARBEN.weiss}`,
  `--text: ${ROLLEN.text}`,
  `--kontur: ${ROLLEN.kontur}`,
  `--akzent: ${FARBEN.rot}`,
  `--akzent2: ${FARBEN.petrol}`,
  `--linie: ${FARBEN.primaerDunkel}`,
  `--schrift: ${SCHRIFT.familie}`,
].join('; ') + ';';
const ersetzungen = {
  TOKENS_CSS: css,
  IMPORTMAP: importmapSkript(importmap),
  START_JSON: JSON.stringify({ satz00, frisch: process.argv.includes('--frisch') }).replace(/</g, '\\u003c'),
};
const seite = readFileSync(join(WURZEL, 'lib/teile-werkstatt.template.html'), 'utf8').replace(/\{\{([A-Z_]+)\}\}/g, (ganz, k) => {
  if (!(k in ersetzungen)) throw new Error(`Werkstatt-Vorlage: Platzhalter {{${k}}} unbekannt`);
  return ersetzungen[k];
});
mkdirSync(dirname(ziel), { recursive: true });
writeFileSync(ziel, seite);
console.log(`Teile-Werkstatt → ${ziel.replace(WURZEL + '/', '')} (im Browser öffnen; läuft ohne Netz)`);
