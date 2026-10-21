// Untertitel (Abschnitt 9.4): WebVTT aus den gemessenen Längen, nie aus Schätzungen.
// Aufruf: npm run untertitel -- <film> [--pruefen]   schreibt ton/<film>/untertitel.vtt
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { untertitel, webvtt } from '../lib/ton/zeitleiste.js';
import { ladeFilm, mitMessung } from './film.js';

const WURZEL = join(import.meta.dirname, '..');

async function main() {
  const [film, schalter] = process.argv.slice(2);
  if (!film) {
    console.error('Aufruf: npm run untertitel -- <film> [--pruefen]');
    process.exit(2);
  }
  const { absaetze } = await ladeFilm(film);
  const gemessen = mitMessung(absaetze, film);
  const einheiten = untertitel(
    gemessen.map((a) => ({ text: a.text, szeneStart: a.szeneImFilm.start, szeneEnde: a.szeneImFilm.start + a.szeneImFilm.dauer, messung: a.messung })),
  );
  const text = webvtt(einheiten, 'tools/untertitel.ts aus texte/ und ton/messung.json');
  const ziel = join(WURZEL, 'ton', film, 'untertitel.vtt');
  if (schalter === '--pruefen') {
    if ((existsSync(ziel) ? readFileSync(ziel, 'utf8') : '') !== text) {
      console.error(`FEHLER ton/${film}/untertitel.vtt ist veraltet (npm run untertitel -- ${film})`);
      process.exit(1);
    }
    console.log(`${film}: Untertitel aktuell`);
    return;
  }
  mkdirSync(join(WURZEL, 'ton', film), { recursive: true });
  writeFileSync(ziel, text);
  console.log(`${film}: ${einheiten.length} Einheiten → ton/${film}/untertitel.vtt`);
}

await main();
