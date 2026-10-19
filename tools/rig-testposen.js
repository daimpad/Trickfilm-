// Testposen aller Rigs auf einem Bogen: je Archetyp eine Zeile mit sechs Posen.
// Aufruf: node tools/rig-testposen.js [--satz satz-00] [--ziel figuren/testposen.png]
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FARBEN, SCHRIFT } from '../tokens/tokens.js';
import { RIGS } from '../lib/rigs/index.js';
import { testposen } from '../lib/rigs/testposen.js';
import { wendeAn } from '../lib/snapshot.js';
import { bildVonHtml } from '../lib/browser.js';
import { maske } from '../lib/svg.js';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, standard) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : standard;
};
const satz = arg('--satz', 'satz-00');
const ziel = join(WURZEL, arg('--ziel', 'figuren/testposen.png'));

const ZELLE = { breite: 300, hoehe: 340 };

function zelle(name, pose, nummer) {
  const r = RIGS[name];
  const m = r.spez.massstab;
  const { x0, y0, x1, y1 } = r.rahmen;
  const P = `F${nummer}`;
  const markup = r.markup(P, { teilesatz: satz });
  const svg = wendeAn(markup, r.apply(P, pose.state));
  const boden = r.spez.beine === 'keine' ? '' : (r.spez.huefte_ueber_boden ?? r.spez.fussziel ? (r.spez.huefte_ueber_boden ?? 140) : 0);
  const bodenLinie = boden
    ? `<line x1="${x0 * m}" y1="${boden * m}" x2="${x1 * m}" y2="${boden * m}" stroke="${FARBEN.schwarz}" stroke-width="4"/>`
    : '';
  return (
    `<figure><svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0 * m} ${y0 * m} ${(x1 - x0) * m} ${(y1 - y0) * m}" ` +
    `width="${ZELLE.breite}" height="${ZELLE.hoehe - 40}">${bodenLinie}${svg}</svg>` +
    `<figcaption>${maske(pose.name)}</figcaption></figure>`
  );
}

let nummer = 0;
const zeilen = Object.keys(RIGS)
  .map((name) => {
    const zellen = testposen(name).map((p) => zelle(name, p, nummer++)).join('');
    return `<section><h2>${maske(name)}</h2><div class="reihe">${zellen}</div></section>`;
  })
  .join('');

const html = `<!doctype html><html lang="de"><meta charset="utf-8"><style>
body{margin:0;padding:32px;background:${FARBEN.weiss};color:${FARBEN.primaerDunkel};font-family:${SCHRIFT.familie}}
h1{margin:0 0 24px;font-size:40px}h2{margin:16px 0 8px;font-size:28px}
.reihe{display:flex;gap:16px}figure{margin:0;width:${ZELLE.breite}px;border:4px solid ${FARBEN.schwarz}}
figcaption{font-size:24px;text-align:center;padding:4px 0 8px}svg{display:block}
</style><h1>Testposen der Rigs · Teilesatz ${maske(satz)}</h1>${zeilen}</html>`;

const breite = 64 + 6 * ZELLE.breite + 5 * 16 + 6 * 8;
await bildVonHtml(html, { breite, hoehe: 800, pfad: ziel, ganzeSeite: true });
console.log(`geschrieben: ${ziel.replace(WURZEL + '/', '')} (${Object.keys(RIGS).length} Archetypen × 6 Posen)`);
