// Cue-Liste einer Szene aus ihrer Bewegung (Abschnitt 8.5): computeEvents → Katalog → szenen/<ID>/sfx-cues.json.
// Aufruf: node tools/sfx-cues.js <ID|alle> [--pruefen] [--stichprobe]
//   --pruefen: nichts schreiben, Abweichung vom Repository ist ein Fehler (Prüflauf)
//   --stichprobe: je Ereignistyp aus brief.sfx.stichprobe das Bild davor, darauf und danach → dist/stichprobe.png
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { alleSzenen, ladeSzene } from '../lib/build.js';
import { computeEvents, wert } from '../lib/events.js';
import { rig } from '../lib/rigs/index.js';
import { cueDatei, erzeugeCues } from '../lib/sfx/cues.js';
import { leseKatalog, pruefeKatalog } from '../lib/sfx/katalog.js';
import { standbild } from '../lib/snapshot.js';
import { bildVonHtml } from '../lib/browser.js';
import { FARBEN, SCHRIFT } from '../tokens/tokens.js';

/** Wörter der Szene mit Zeit in der Szene aus ton/<film>/wortzeit.tsv; null, solange es keine Wortzeiten gibt. */
function woerterVon(sz) {
  const pfad = join(import.meta.dirname, '..', 'ton', String(sz.brief.film ?? '').toLowerCase(), 'wortzeit.tsv');
  if (!existsSync(pfad)) return null;
  const zeilen = readFileSync(pfad, 'utf8').split('\n').filter((z) => z && !z.startsWith('#'));
  const kopf = zeilen.shift().split('\t');
  const i = (n) => kopf.indexOf(n);
  const woerter = zeilen.map((z) => z.split('\t')).filter((s) => s[i('szene')] === sz.id).map((s) => ({ wort: s[i('wort')], t: Number(s[i('t_szene_s')]) }));
  return woerter.length ? woerter : null;
}

/** Cue-Liste einer geladenen Szene; null, wenn der Brief keine Geräusche vorsieht. */
export function cuesFuer(sz, katalog = leseKatalog()) {
  const sfx = sz.brief.sfx;
  if (!sfx) return null;
  const A = sz.animation;
  const figuren = Object.fromEntries((sz.brief.figuren ?? []).map((f) => [f.prefix, rig(f.rig)]));
  const ereignisse = computeEvents({ computeState: A.computeState, dauer: A.SPEC.duration, fps: A.SPEC.fps, quellen: sfx.quellen ?? {}, beats: A.BEATS, figuren });
  const r = erzeugeCues({ szene: sz.id, sfx, ereignisse, katalog, beats: A.BEATS, dauer: A.SPEC.duration, fps: A.SPEC.fps, woerter: woerterVon(sz) });
  return { ...r, ereignisse, figuren, text: cueDatei({ szene: sz.id, fps: A.SPEC.fps, dauer: A.SPEC.duration, cues: r.cues }) };
}

const BILD = { breite: 640, hoehe: 360 };

/** Stichprobe: je Typ das erste Ereignis, Bild davor, darauf, danach, mit dem Wert des Pfads. */
async function stichprobe(sz, ergebnis) {
  const typen = sz.brief.sfx.stichprobe ?? [];
  const fps = sz.animation.SPEC.fps;
  const reihen = [];
  for (const typ of typen) {
    const e = ergebnis.ereignisse.find((x) => x.typ === typ);
    if (!e) {
      reihen.push(`<h2>${typ}: kein Ereignis erkannt</h2>`);
      continue;
    }
    const zellen = [e.bild - 1, e.bild, e.bild + 1].map((f) => {
      const t = f / fps;
      const z = sz.animation.computeState(t);
      const v = wert(z, e.pfad, ergebnis.figuren);
      const zahl = typeof v === 'number' ? v.toFixed(2) : `${v.x.toFixed(1)}, ${v.y.toFixed(1)}`;
      const svg = Buffer.from(standbild(sz, t)).toString('base64');
      return `<figure${f === e.bild ? ' class="ereignis"' : ''}><img src="data:image/svg+xml;base64,${svg}" width="${BILD.breite}" height="${BILD.hoehe}"><figcaption>Bild ${f}${f === e.bild ? ' · Ereignis' : ''} · ${e.pfad} = ${zahl}</figcaption></figure>`;
    });
    reihen.push(`<h2>${typ} bei ${e.t.toFixed(3)} s (Bild ${e.bild})</h2><div class="reihe">${zellen.join('')}</div>`);
  }
  const html = `<!doctype html><html lang="de"><meta charset="utf-8"><style>
body{margin:0;padding:16px;background:${FARBEN.weiss};color:${FARBEN.primaerDunkel};font-family:${SCHRIFT.familie}}
h1{font-size:24px;margin:0 0 8px}h2{font-size:20px;margin:16px 0 8px}.reihe{display:grid;grid-template-columns:repeat(3,${BILD.breite}px);gap:16px}
figure{margin:0;border:2px solid ${FARBEN.primaerDunkel}}figure.ereignis{border:4px solid ${FARBEN.rot}}img{display:block}figcaption{font-size:16px;padding:4px}
</style><h1>${sz.id} · Stichprobe: Bewegt sich das Ding im Ereignisbild zuerst, ist die Szene synchron.</h1>${reihen.join('')}</html>`;
  const ziel = join(sz.ordner, 'dist', 'stichprobe.png');
  mkdirSync(join(sz.ordner, 'dist'), { recursive: true });
  await bildVonHtml(html, { breite: 3 * BILD.breite + 4 * 16 + 16, hoehe: 400, pfad: ziel, ganzeSeite: true });
  return ziel;
}

async function main() {
  const arg = process.argv[2];
  if (!arg || arg.startsWith('--')) {
    console.error('Aufruf: node tools/sfx-cues.js <ID|alle> [--pruefen] [--stichprobe]');
    process.exit(2);
  }
  const pruefen = process.argv.includes('--pruefen');
  const katalog = leseKatalog();
  const kb = pruefeKatalog(katalog);
  for (const b of kb) console.error(`FEHLER katalog.yaml ${b.id}: ${b.text}`);
  let fehler = kb.length;
  for (const id of arg === 'alle' ? alleSzenen() : [arg]) {
    const sz = await ladeSzene(id);
    const ziel = join(sz.ordner, 'sfx-cues.json');
    let r;
    try {
      r = cuesFuer(sz, katalog);
    } catch (e) {
      console.error(`FEHLER ${id}: ${e.message}`);
      fehler++;
      continue;
    }
    if (!r) {
      if (existsSync(ziel)) {
        if (pruefen) {
          console.error(`FEHLER ${id}: sfx-cues.json liegt vor, aber der Brief hat keinen Abschnitt sfx`);
          fehler++;
        } else rmSync(ziel);
      }
      console.log(`${id}: ohne Geräusche (kein Abschnitt sfx im Brief)`);
      continue;
    }
    for (const b of r.befunde) console.error(`FEHLER ${id}: ${b}`);
    for (const h of r.hinweise) console.log(`Hinweis ${id}: ${h}`);
    fehler += r.befunde.length;
    const alt = existsSync(ziel) ? readFileSync(ziel, 'utf8') : null;
    if (pruefen) {
      if (alt !== r.text) {
        console.error(`FEHLER veraltet: szenen/${id}/sfx-cues.json (npm run sfx:cues -- ${id})`);
        fehler++;
      }
    } else if (!r.befunde.length && alt !== r.text) writeFileSync(ziel, r.text);
    const arten = new Set(r.cues.map((q) => q.cue));
    console.log(`${id}: ${r.ereignisse.length} Ereignisse, ${r.cues.length} Cues, ${arten.size} Arten${pruefen ? '' : ` → szenen/${id}/sfx-cues.json`}`);
    if (process.argv.includes('--stichprobe')) {
      const bild = await stichprobe(sz, r);
      console.log(`${id}: Stichprobe → ${bild.replace(/.*\/szenen\//, 'szenen/')}; danach sichtung.synchron im Brief setzen`);
    }
  }
  if (fehler) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
