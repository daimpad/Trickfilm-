// Video einer Szene, Weg A (Abschnitt 10.1): jedes Bild aus computeState im Chromium gerendert, als PNG an ffmpeg
// (JPEG verschob die helle Grundfläche um 3 Stufen), H.264 CRF 20, yuv420p, BT.709, +faststart. Ton aus der Mischung des Films (npm run mischen), sonst aus
// den Geräuschen nach sfx-cues.json, sonst Stille; Untertitel als abschaltbare Spur und als .vtt daneben.
// Danach prüft tools/lieferung.js Spuren, Lautheit und Farbe und schreibt out/lieferung.tsv.
// Aufruf: npm run video -- <ID …|alle> [--ziel out/videos] [--crf 20] [--neu]
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { alleSzenen, ladeSzene } from '../lib/build.js';
import { starteBrowser } from '../lib/browser.js';
import { standbild } from '../lib/snapshot.js';
import { farbabweichung, pruefeLieferung, rgb } from './lieferung.js';
import { beginnImFilm, tonArgumente, untertitelFuerSzene } from './szene-vorschau.js';

const WURZEL = join(import.meta.dirname, '..');
const ARBEITER = 3;

/** Jüngste Änderung unter einem Pfad (Datei oder Verzeichnis, ohne dist/). */
function juengste(pfad) {
  if (!existsSync(pfad)) return 0;
  const st = statSync(pfad);
  if (!st.isDirectory()) return st.mtimeMs;
  return Math.max(0, ...readdirSync(pfad).filter((n) => n !== 'dist').map((n) => juengste(join(pfad, n))));
}

/** Schrift: Arial oder Liberation Sans muss im System liegen; kein stiller Fallback. */
function pruefeSchrift() {
  const r = spawnSync('fc-match', ['-f', '%{family}', 'Arial'], { encoding: 'utf8' });
  if (r.status !== 0 || !/Arial|Liberation Sans/.test(r.stdout)) throw new Error(`Schrift: Arial wird zu „${r.stdout || 'nichts'}“ aufgelöst; Arial oder Liberation Sans installieren`);
  return r.stdout;
}

/** Tonquelle einer Szene: Ausschnitt der Filmmischung mit Untertiteln, sonst Geräusche, sonst Stille. */
async function tonFuer(sz, ziel) {
  const { duration } = sz.animation.SPEC;
  const film = String(sz.brief.film ?? '').toLowerCase();
  const mischung = join(WURZEL, 'out', 'ton', `${film}-mischung.wav`);
  const vttFilm = join(WURZEL, 'ton', film, 'untertitel.vtt');
  if (film && existsSync(mischung)) {
    const beginn = await beginnImFilm(sz);
    const args = ['-ss', String(beginn), '-t', String(duration), '-i', mischung];
    const quellen = [mischung];
    if (existsSync(vttFilm)) {
      const vtt = ziel.replace(/\.mp4$/, '.vtt');
      writeFileSync(vtt, untertitelFuerSzene(readFileSync(vttFilm, 'utf8'), beginn, duration));
      args.push('-i', vtt, '-map', '0:v', '-map', '1:a', '-map', '2:s', '-c:s', 'mov_text', '-metadata:s:s:0', 'language=deu');
      quellen.push(vttFilm);
    } else args.push('-map', '0:v', '-map', '1:a');
    return { args, quellen, art: existsSync(vttFilm) ? 'Mischung des Films, Untertitel als Spur' : 'Mischung des Films' };
  }
  const cuePfad = join(sz.ordner, 'sfx-cues.json');
  const cues = existsSync(cuePfad) ? JSON.parse(readFileSync(cuePfad, 'utf8')).cues : [];
  const ton = tonArgumente(cues, duration);
  if (ton.filter) return { args: [...ton.eingaben, '-filter_complex', ton.filter, '-map', '0:v', '-map', '[ton]'], quellen: [cuePfad], art: `${cues.length} Geräusche, ohne Stimme` };
  return { args: ['-f', 'lavfi', '-t', String(duration), '-i', 'anullsrc=r=48000:cl=mono', '-map', '0:v', '-map', '1:a'], quellen: [], art: 'Stille' };
}

/** Eine Szene rendern; liefert { id, ziel, uebersprungen, befunde, log }. */
export async function video(id, { zielOrdner = join(WURZEL, 'out', 'videos'), crf = 20, neu = false } = {}) {
  const log = [];
  const sz = await ladeSzene(id);
  const { fps, duration, width, height } = sz.animation.SPEC;
  mkdirSync(zielOrdner, { recursive: true });
  const ziel = join(zielOrdner, `${id}.mp4`);
  const ton = await tonFuer(sz, ziel);
  const stand = Math.max(juengste(sz.ordner), juengste(join(WURZEL, 'lib')), juengste(join(WURZEL, 'tokens')), ...ton.quellen.map(juengste));
  if (!neu && existsSync(ziel) && statSync(ziel).mtimeMs > stand) return { id, ziel, uebersprungen: true, befunde: [], log: [`${id}: aktuell, übersprungen (--neu rendert neu)`] };

  const bilder = Math.round(duration * fps);
  // Ein Bild aus der Mitte des Kontaktbogens dient als Referenz für die Farbe.
  const kb = sz.animation.KONTAKTBOGEN ?? [duration / 2];
  const refBild = Math.min(bilder - 1, Math.round(kb[Math.floor(kb.length / 2)] * fps));
  const refPng = ziel.replace(/\.mp4$/, '.ref.png');
  const args = [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(fps), '-i', '-',
    ...ton.args,
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p',
    '-c:v', 'libx264', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-movflags', '+faststart', '-t', String(duration), ziel,
  ];
  const ffmpeg = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'pipe'] });
  let fehlertext = '';
  ffmpeg.stderr.on('data', (d) => (fehlertext += d));
  const fertig = new Promise((ok, fehler) => ffmpeg.on('close', (code) => (code === 0 ? ok() : fehler(new Error(`FEHLER ffmpeg endete mit ${code}: ${fehlertext.slice(-400)}`)))));
  const browser = await starteBrowser();
  const t0 = Date.now();
  try {
    const seite = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    for (let n = 0; n < bilder; n++) {
      await seite.setContent(`<body style="margin:0">${standbild(sz, n / fps)}</body>`);
      const png = await seite.screenshot({ type: 'png' });
      if (n === refBild) writeFileSync(refPng, png);
      if (!ffmpeg.stdin.write(png)) await new Promise((ok) => ffmpeg.stdin.once('drain', ok));
    }
    ffmpeg.stdin.end();
    await fertig;
  } finally {
    await browser.close();
  }
  log.push(`${id}: ${bilder} Bilder in ${((Date.now() - t0) / 1000).toFixed(0)} s → ${relative(WURZEL, ziel)} (${ton.art})`);
  const farbe = farbabweichung(rgb(refPng), rgb(ziel, refBild), width, height);
  const { zeile, befunde } = pruefeLieferung(ziel, farbe);
  log.push(`${id}: ${zeile.dauer_s} s, ${zeile.bilder} Bilder, ${zeile.lufs_i} LUFS, True Peak ${zeile.true_peak_dbtp} dBTP, Farbe ±${farbe.max} (${farbe.flaechen} Flächen, ${farbe.farben} Farben, Bild ${refBild})`);
  const film = String(sz.brief.film ?? '').toLowerCase();
  const ohneMischung = !ton.art.startsWith('Mischung') ? ` (ohne Mischung des Films; npm run mischen -- ${film || '<film>'})` : '';
  for (const b of befunde) log.push(`FEHLER ${id}: ${b}${/LUFS/.test(b) ? ohneMischung : ''}`);
  return { id, ziel, uebersprungen: false, befunde, log };
}

async function main() {
  const args = process.argv.slice(2);
  const wert = (name, vorgabe) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : vorgabe;
  };
  const zielOrdner = join(WURZEL, wert('--ziel', 'out/videos'));
  const crf = Number(wert('--crf', 20));
  const neu = args.includes('--neu');
  const optionen = new Set(['--ziel', '--crf']);
  const ids = args.filter((a, i) => !a.startsWith('--') && !optionen.has(args[i - 1]));
  if (!ids.length) {
    console.error('Aufruf: npm run video -- <ID …|alle> [--ziel out/videos] [--crf 20] [--neu]');
    process.exit(2);
  }
  console.log(`Schrift: ${pruefeSchrift()}`);
  const liste = ids.includes('alle') ? alleSzenen().filter((id) => !id.startsWith('_')) : ids;
  if (!liste.length) {
    console.error('Video: keine Szene gefunden');
    process.exit(1);
  }
  // Drei Arbeiter, je mit eigenem Browser und eigenem Log; am Ende wird nach FEHLER gesucht.
  const offen = [...liste];
  const ergebnisse = [];
  await Promise.all(
    Array.from({ length: Math.min(ARBEITER, liste.length) }, async () => {
      while (offen.length) {
        const id = offen.shift();
        let r;
        try {
          r = await video(id, { zielOrdner, crf, neu });
        } catch (e) {
          r = { id, befunde: [e.message], log: [`FEHLER ${id}: ${e.message}`] };
        }
        writeFileSync(join(zielOrdner, `${id}.log`), r.log.join('\n') + '\n');
        for (const z of r.log) console.log(z);
        ergebnisse.push(r);
      }
    }),
  );
  const fehler = ergebnisse.filter((r) => r.log.some((z) => z.startsWith('FEHLER')));
  console.log(`${ergebnisse.length} Szenen, ${fehler.length} mit FEHLER; Protokoll out/lieferung.tsv`);
  process.exit(fehler.length ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
