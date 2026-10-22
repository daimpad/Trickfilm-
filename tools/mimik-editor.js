// Erzeugt den Mimik-Editor als eine Seite, die offline läuft und die echte Bibliothek nutzt (docs/MIMIK.md).
// Aufruf: node tools/mimik-editor.js [--profil <archetyp>] [--ziel <pfad>]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FARBEN, ROLLEN, SCHRIFT } from '../tokens/tokens.js';
import { buendle, importmapSkript } from '../lib/bundle.js';
import { RIGS } from '../lib/rigs/index.js';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const ziel = join(WURZEL, arg('--ziel') ?? 'out/editor/mimik-editor.html');
const start = { profil: arg('--profil') ?? 'stehend-profil' };
if (RIGS[start.profil]?.ansicht !== 'profil') {
  console.error(`FEHLER: „${start.profil}“ ist kein Archetyp im Profil; bekannt: ${Object.keys(RIGS).filter((n) => RIGS[n].ansicht === 'profil').join(', ')}`);
  process.exit(2);
}

const { importmap } = buendle(['lib/rigs/index.js', 'lib/teilesaetze/index.js', 'lib/mimik.js', 'tokens/tokens.js'].map((p) => join(WURZEL, p)), WURZEL);
const css = [`--grund: ${FARBEN.primaerHell}`, `--weiss: ${FARBEN.weiss}`, `--text: ${ROLLEN.text}`, `--kontur: ${ROLLEN.kontur}`, `--schrift: ${SCHRIFT.familie}`].join('; ') + ';';
const ersetzungen = { TOKENS_CSS: css, IMPORTMAP: importmapSkript(importmap), START_JSON: JSON.stringify(start).replace(/</g, '\\u003c') };
const vorlage = readFileSync(join(WURZEL, 'lib', 'mimik-editor.template.html'), 'utf8');
const seite = vorlage.replace(/\{\{([A-Z_]+)\}\}/g, (ganz, k) => {
  if (!(k in ersetzungen)) throw new Error(`Mimik-Editor: Platzhalter {{${k}}} unbekannt`);
  return ersetzungen[k];
});
mkdirSync(dirname(ziel), { recursive: true });
writeFileSync(ziel, seite);
console.log(`Mimik-Editor → ${ziel.replace(WURZEL + '/', '')} (im Browser öffnen; läuft ohne Netz)`);
