// Übersicht der Zeichenvorlagen als Bild: alle Archetypen auf einem Bogen.
// Aufruf: node tools/vorlagen-bild.js [--ziel figuren/vorlagen.png]
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FARBEN, SCHRIFT } from '../tokens/tokens.js';
import { bildVonHtml } from '../lib/browser.js';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const i = process.argv.indexOf('--ziel');
const ziel = join(WURZEL, i >= 0 ? process.argv[i + 1] : 'figuren/vorlagen.png');
const spez = JSON.parse(readFileSync(join(WURZEL, 'figuren/rig-spezifikation.json'), 'utf8'));

const karten = Object.keys(spez.archetypen)
  .map((name) => {
    const svg = readFileSync(join(WURZEL, `figuren/vorlage_${name}.svg`), 'utf8').replace(/^<\?xml[^>]*>\s*/, '').replace(/<!--[\s\S]*?-->\s*/, '');
    return `<figure>${svg}<figcaption>figuren/vorlage_${name}.svg</figcaption></figure>`;
  })
  .join('');

const html = `<!doctype html><html lang="de"><meta charset="utf-8"><style>
body{margin:0;padding:24px;background:${FARBEN.weiss};color:${FARBEN.primaerDunkel};font-family:${SCHRIFT.familie}}
h1{margin:0 0 16px;font-size:32px}.raster{display:grid;grid-template-columns:repeat(2,auto);gap:24px;justify-content:start}
figure{margin:0;border:2px solid ${FARBEN.schwarz}}figure svg{display:block}figcaption{font-size:18px;padding:6px 8px}
</style><h1>Zeichenvorlagen · Rig-Spezifikation Fassung ${spez.fassung}</h1><div class="raster">${karten}</div></html>`;

await bildVonHtml(html, { breite: 1900, hoehe: 900, pfad: ziel, ganzeSeite: true });
console.log(`geschrieben: ${ziel.replace(WURZEL + '/', '')}`);
