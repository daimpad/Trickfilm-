// Kontaktbogen: neun Standbilder je Szene, je 960 px breit, mit eingezeichneter Schutzzone.
// Aufruf: node lib/kontaktbogen.js <ID|alle>. Schreibt dist/snap/t-<s>.svg und dist/kontaktbogen.png.
// Die Schutzzone wird nur auf dem Bogen eingezeichnet, nie in der Szene.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { FARBEN, SCHRIFT, BUEHNE } from '../tokens/tokens.js';
import { alleSzenen, ladeSzene } from './build.js';
import { standbild } from './snapshot.js';
import { bildVonHtml } from './browser.js';
import { SCHUTZZONE_Y } from './stage.js';

const BILD = { breite: 960, hoehe: 540 };
const LUECKE = 16;

/** Name des Beats, in dem t liegt (für die Bildunterschrift). */
function beatBei(beats, t) {
  return Object.entries(beats).find(([, [a, b]]) => t >= a && t <= b)?.[0] ?? '–';
}

export async function kontaktbogen(id) {
  const sz = await ladeSzene(id);
  const dist = join(sz.ordner, 'dist');
  const snap = join(dist, 'snap');
  mkdirSync(snap, { recursive: true });
  const zellen = sz.animation.KONTAKTBOGEN.map((t) => {
    const svg = standbild(sz, t);
    writeFileSync(join(snap, `t-${t.toFixed(2)}.svg`), svg);
    const zone = (SCHUTZZONE_Y / BUEHNE.hoehe) * BILD.hoehe;
    return (
      `<figure><div class="bild"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${BILD.breite}" height="${BILD.hoehe}">` +
      `<div class="zone" style="top:${zone}px"></div></div>` +
      `<figcaption>t = ${t.toFixed(2)} s · Bild ${Math.round(t * sz.animation.SPEC.fps)} · ${beatBei(sz.animation.BEATS, t)}</figcaption></figure>`
    );
  }).join('');
  const html = `<!doctype html><html lang="de"><meta charset="utf-8"><style>
body{margin:0;padding:${LUECKE}px;background:${FARBEN.weiss};color:${FARBEN.primaerDunkel};font-family:${SCHRIFT.familie}}
h1{margin:0 0 8px;font-size:28px}.raster{display:grid;grid-template-columns:repeat(3,${BILD.breite}px);gap:${LUECKE}px}
figure{margin:0}.bild{position:relative;border:2px solid ${FARBEN.schwarz};width:${BILD.breite}px;height:${BILD.hoehe}px}
.bild img{display:block}.zone{position:absolute;left:0;right:0;bottom:0;border-top:4px dashed ${FARBEN.rot}}
figcaption{font-size:20px;padding:4px 0}
</style><h1>${id} · Kontaktbogen · gestrichelt: Oberkante der Schutzzone (y ${SCHUTZZONE_Y})</h1><div class="raster">${zellen}</div></html>`;
  const ziel = join(dist, 'kontaktbogen.png');
  await bildVonHtml(html, { breite: 3 * BILD.breite + 4 * LUECKE + 12, hoehe: 600, pfad: ziel, ganzeSeite: true });
  return ziel;
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Aufruf: node lib/kontaktbogen.js <ID|alle>');
    process.exit(2);
  }
  for (const id of arg === 'alle' ? alleSzenen() : [arg]) {
    const ziel = await kontaktbogen(id);
    console.log(`${id}: Kontaktbogen → ${ziel.replace(/.*\/szenen\//, 'szenen/')}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
