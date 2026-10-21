// Remotion-Port (Abschnitt 10.2): Szenenliste erzeugen, Ton bereitstellen, rendern, Parität prüfen.
// Aufruf: node tools/remotion.js vorbereiten [--pruefen]   remotion/src/szenen.ts aus szenen/, Mischungen nach out/remotion/public
//         node tools/remotion.js render <Komposition>      vorbereiten, rendern, Untertitel als Spur, Lieferprüfung
//         node tools/remotion.js paritaet <ID>             Standbilder an den Zeiten des Kontaktbogens gegen den Prototyp
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { alleSzenen, ladeSzene } from '../lib/build.js';
import { bildVonHtml } from '../lib/browser.js';
import { standbild } from '../lib/snapshot.js';
import { farbabweichung, pruefeLieferung, rgb } from './lieferung.js';
import { untertitelFuerSzene } from './szene-vorschau.js';

const WURZEL = join(import.meta.dirname, '..');
export const LISTE = join(WURZEL, 'remotion', 'src', 'szenen.ts');
export const OEFFENTLICH = join(WURZEL, 'out', 'remotion', 'public');
const AUSGABE = join(WURZEL, 'out', 'remotion');
// Sichtbare Abweichung (Abschnitt 10.3): in einem Fenster von 5 × 5 Pixeln weichen mindestens 12 Pixel in einem
// Kanal um mehr als 30 Stufen ab.
export const SICHTBAR = { fenster: 5, pixel: 12, stufen: 30 };

/** Szenen mit Film in Reihenfolge, je mit Beginn im Film; Szenen, deren ID mit _ beginnt, gehören zu keinem Film. */
async function filmSzenen() {
  const aus = [];
  const beginn = new Map();
  for (const id of alleSzenen()) {
    if (id.startsWith('_')) continue;
    const sz = await ladeSzene(id);
    const film = String(sz.brief.film ?? '').toLowerCase();
    if (!film) throw new Error(`${id}: brief.film fehlt; ohne Film keine Komposition`);
    const t = beginn.get(film) ?? 0;
    aus.push({ id, film, beginn: Number(t.toFixed(3)), sz });
    beginn.set(film, t + sz.animation.SPEC.duration);
  }
  return aus;
}

function liste(szenen) {
  const filme = [...new Set(szenen.map((s) => s.film))];
  return [
    '// ERZEUGT von tools/remotion.js aus szenen/; nicht von Hand ändern (node tools/remotion.js vorbereiten)',
    ...szenen.flatMap((s, i) => [`import * as scene${i} from '../../szenen/${s.id}/scene.js';`, `import * as zeitfunktion${i} from '../../szenen/${s.id}/animation.js';`]),
    '',
    'type Spec = { fps: number; width: number; height: number; duration: number };',
    'export type SzeneImPort = {',
    '  id: string;',
    '  film: string;',
    '  beginn: number;',
    '  scene: { sceneMarkup: () => string; sceneApply: (s: unknown) => [string, string, string | number][] };',
    '  zeitfunktion: { SPEC: Spec; computeState: (t: number) => unknown };',
    '};',
    '',
    'export const SZENEN: SzeneImPort[] = [',
    ...szenen.map((s, i) => `  { id: '${s.id}', film: '${s.film}', beginn: ${s.beginn}, scene: scene${i}, zeitfunktion: zeitfunktion${i} },`),
    '];',
    '',
    'export const FILME: { film: string; szenen: string[] }[] = [',
    ...filme.map((f) => `  { film: '${f}', szenen: [${szenen.filter((s) => s.film === f).map((s) => `'${s.id}'`).join(', ')}] },`),
    '];',
    '',
  ].join('\n');
}

/** Szenenliste schreiben (oder prüfen) und die Mischungen der Filme in den öffentlichen Ordner legen. */
export async function vorbereiten({ pruefen = false } = {}) {
  const szenen = await filmSzenen();
  const text = liste(szenen);
  if (pruefen) {
    if ((existsSync(LISTE) ? readFileSync(LISTE, 'utf8') : '') !== text) throw new Error(`${relative(WURZEL, LISTE)} ist veraltet (node tools/remotion.js vorbereiten)`);
    return { szenen, ohneTon: [] };
  }
  writeFileSync(LISTE, text);
  mkdirSync(join(OEFFENTLICH, 'ton'), { recursive: true });
  const ohneTon = [];
  for (const film of new Set(szenen.map((s) => s.film))) {
    const quelle = join(WURZEL, 'out', 'ton', `${film}-mischung.wav`);
    if (existsSync(quelle)) copyFileSync(quelle, join(OEFFENTLICH, 'ton', `${film}-mischung.wav`));
    else ohneTon.push(film);
  }
  return { szenen, ohneTon };
}

function remotion(args) {
  const r = spawnSync('npx', ['remotion', ...args, '--log', 'error'], { cwd: WURZEL, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`FEHLER remotion ${args[0]}: ${(r.stderr || r.stdout).slice(-800)}`);
}

/** Prototyp-Standbild einer Szene bei Bild n als PNG. */
async function prototypBild(sz, n, pfad) {
  const { fps, width, height } = sz.animation.SPEC;
  await bildVonHtml(`<body style="margin:0">${standbild(sz, n / fps)}</body>`, { breite: width, hoehe: height, pfad });
}

/** Sichtbar verschiedene Fenster zwischen zwei RGB-Bildern (Abschnitt 10.3). */
export function sichtbareFenster(a, b, breite, hoehe, s = SICHTBAR) {
  let fenster = 0;
  for (let y = 0; y + s.fenster <= hoehe; y += s.fenster) {
    for (let x = 0; x + s.fenster <= breite; x += s.fenster) {
      let n = 0;
      for (let dy = 0; dy < s.fenster; dy++) {
        for (let dx = 0; dx < s.fenster; dx++) {
          const i = ((y + dy) * breite + x + dx) * 3;
          if (Math.abs(a[i] - b[i]) > s.stufen || Math.abs(a[i + 1] - b[i + 1]) > s.stufen || Math.abs(a[i + 2] - b[i + 2]) > s.stufen) n++;
        }
      }
      if (n >= s.pixel) fenster++;
    }
  }
  return fenster;
}

/** Parität: Remotion-Standbild und Prototyp an jeder Zeit des Kontaktbogens; eine sichtbare Abweichung ist ein Portfehler. */
export async function paritaet(id) {
  await vorbereiten();
  const sz = await ladeSzene(id);
  const { fps, width, height } = sz.animation.SPEC;
  const ordner = join(AUSGABE, 'paritaet', id);
  mkdirSync(ordner, { recursive: true });
  const ergebnis = [];
  for (const t of sz.animation.KONTAKTBOGEN) {
    const n = Math.round(t * fps);
    const port = join(ordner, `${n}-remotion.png`);
    const proto = join(ordner, `${n}-prototyp.png`);
    remotion(['still', id, port, '--frame', String(n), '--image-format', 'png']);
    await prototypBild(sz, n, proto);
    ergebnis.push({ t, bild: n, fenster: sichtbareFenster(rgb(proto), rgb(port), width, height) });
  }
  return ergebnis;
}

/** Komposition rendern, Untertitel als Spur, Lieferprüfung mit Farbe gegen den Prototyp. */
export async function render(komposition) {
  const { szenen, ohneTon } = await vorbereiten();
  const master = /^Film-(.+)$/.exec(komposition)?.[1];
  const teile = master ? szenen.filter((s) => s.film === master) : szenen.filter((s) => s.id === komposition);
  if (!teile.length) throw new Error(`Render: keine Komposition „${komposition}“ (Szenen-ID oder Film-<film>)`);
  const film = teile[0].film;
  const log = [];
  if (ohneTon.includes(film)) log.push(`FEHLER ${komposition}: keine Mischung für Film ${film} (npm run mischen -- ${film}); gerendert ohne Ton`);
  mkdirSync(AUSGABE, { recursive: true });
  const roh = join(AUSGABE, `${komposition}.roh.mp4`);
  const ziel = join(AUSGABE, `${komposition}.mp4`);
  const t0 = Date.now();
  remotion(['render', komposition, roh]);
  // Untertitel des Films auf den Ausschnitt verschoben, als abschaltbare Spur und als .vtt daneben.
  const vttFilm = join(WURZEL, 'ton', film, 'untertitel.vtt');
  const beginn = teile[0].beginn;
  const dauer = teile.reduce((s, x) => s + x.sz.animation.SPEC.duration, 0);
  if (existsSync(vttFilm)) {
    const vtt = ziel.replace(/\.mp4$/, '.vtt');
    writeFileSync(vtt, untertitelFuerSzene(readFileSync(vttFilm, 'utf8'), beginn, dauer));
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', roh, '-i', vtt, '-map', '0', '-map', '1', '-c', 'copy', '-c:s', 'mov_text', '-metadata:s:s:0', 'language=deu', '-movflags', '+faststart', ziel], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`FEHLER Untertitel einbinden: ${r.stderr.slice(-400)}`);
    unlinkSync(roh);
  } else renameSync(roh, ziel);
  log.push(`${komposition}: gerendert in ${((Date.now() - t0) / 1000).toFixed(0)} s → ${relative(WURZEL, ziel)}`);
  // Farbe an einem Bild aus der Mitte des Kontaktbogens der ersten Szene.
  const sz = teile[0].sz;
  const kb = sz.animation.KONTAKTBOGEN;
  const n = Math.round(kb[Math.floor(kb.length / 2)] * sz.animation.SPEC.fps);
  const ref = ziel.replace(/\.mp4$/, '.ref.png');
  await prototypBild(sz, n, ref);
  const farbe = farbabweichung(rgb(ref), rgb(ziel, n), sz.animation.SPEC.width, sz.animation.SPEC.height);
  const { zeile, befunde } = pruefeLieferung(ziel, farbe);
  log.push(`${komposition}: ${zeile.dauer_s} s, ${zeile.bilder} Bilder, ${zeile.lufs_i} LUFS, True Peak ${zeile.true_peak_dbtp} dBTP, Farbe ±${farbe.max} (${farbe.flaechen} Flächen, Bild ${n})`);
  for (const b of befunde) log.push(`FEHLER ${komposition}: ${b}`);
  return log;
}

async function main() {
  const [befehl, arg, ...rest] = process.argv.slice(2);
  if (befehl === 'vorbereiten') {
    const pruefen = arg === '--pruefen' || rest.includes('--pruefen');
    const { szenen, ohneTon } = await vorbereiten({ pruefen });
    console.log(`${relative(WURZEL, LISTE)}: ${szenen.length} Szenen ${pruefen ? 'aktuell' : 'geschrieben'}${ohneTon.length ? `; ohne Mischung: ${ohneTon.join(', ')} (npm run mischen -- <film>)` : ''}`);
    return;
  }
  if (befehl === 'render' && arg) {
    const log = await render(arg);
    for (const z of log) console.log(z);
    if (log.some((z) => z.startsWith('FEHLER'))) process.exit(1);
    return;
  }
  if (befehl === 'paritaet' && arg) {
    const ergebnis = await paritaet(arg);
    for (const e of ergebnis) console.log(`${arg} t = ${e.t} s (Bild ${e.bild}): ${e.fenster ? `FEHLER ${e.fenster} sichtbar verschiedene Fenster` : 'gleich'}`);
    console.log(`Bilder: out/remotion/paritaet/${arg}/`);
    if (ergebnis.some((e) => e.fenster)) process.exit(1);
    return;
  }
  console.error('Aufruf: node tools/remotion.js vorbereiten [--pruefen] | render <Komposition> | paritaet <ID>');
  process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (e) {
    console.error(e.message.startsWith('FEHLER') ? e.message : `FEHLER ${e.message}`);
    process.exit(1);
  }
}
