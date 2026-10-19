// Katalog aller Requisiten auf einem Bogen, nach Gruppe, in einheitlichem Maßstab.
// Aufruf: node tools/requisiten-katalog.js [--ziel lib/props/KATALOG.png]
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FARBEN, SCHRIFT } from '../tokens/tokens.js';
import { GRUPPEN, REQUISITEN } from '../lib/props/index.js';
import { bildVonHtml } from '../lib/browser.js';
import { maske } from '../lib/svg.js';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const i = process.argv.indexOf('--ziel');
const ziel = join(WURZEL, i >= 0 ? process.argv[i + 1] : 'lib/props/KATALOG.png');

/** Maßstab des Bogens. */
const M = 0.6;
// Für den Bogen: Abstand von Bezugspunkt zum Boden, wie in einer Szene mit Tisch bei y 560 und Sitz bei 634.
const OPTS = { schreibtisch: { boden: 200 }, tresen: { boden: 200 }, buerostuhl: { boden: 126 }, strasse: { breite: 320 } };

function karte(name, r) {
  const opts = OPTS[name] ?? {};
  const { x0, y0, x1, y1 } = r.rahmen(opts);
  const svg = r.markup(`k-${name}`, { x: 0, y: 0 }, {}, opts);
  const ids = r.ids(`k-${name}`).filter((id) => id !== `k-${name}`).map((id) => id.replace(`k-${name}-`, ''));
  return (
    `<figure><svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" ` +
    `width="${Math.round((x1 - x0) * M)}" height="${Math.round((y1 - y0) * M)}">${svg}</svg>` +
    `<figcaption><b>${maske(name)}</b>${ids.length ? `<br>${maske(ids.join(', '))}` : ''}</figcaption></figure>`
  );
}

const abschnitte = GRUPPEN.map((g) => {
  const karten = Object.entries(REQUISITEN)
    .filter(([, r]) => r.gruppe === g)
    .map(([name, r]) => karte(name, r))
    .join('');
  return `<section><h2>${maske(g)}</h2><div class="reihe">${karten}</div></section>`;
}).join('');

const html = `<!doctype html><html lang="de"><meta charset="utf-8"><style>
body{margin:0;padding:32px;background:${FARBEN.weiss};color:${FARBEN.primaerDunkel};font-family:${SCHRIFT.familie}}
h1{margin:0 0 8px;font-size:40px}h2{margin:24px 0 8px;font-size:28px}
.reihe{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-end}
figure{margin:0;display:flex;flex-direction:column;align-items:center}
figcaption{font-size:18px;text-align:center;padding-top:8px;max-width:260px}svg{display:block}
</style><h1>Requisiten · ${Object.keys(REQUISITEN).length} Stück, Maßstab ${M}</h1>
<p>Unter dem Namen die beweglichen Teilgruppen (&lt;id&gt;-…).</p>${abschnitte}</html>`;

await bildVonHtml(html, { breite: 1600, hoehe: 900, pfad: ziel, ganzeSeite: true });
console.log(`geschrieben: ${ziel.replace(WURZEL + '/', '')} (${Object.keys(REQUISITEN).length} Requisiten)`);
