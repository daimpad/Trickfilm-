// Wortzeiten (Abschnitt 9.3): für jedes Wort der Frame, in dem es fällt, aus der gemessenen Länge, anteilig nach Zeichen.
// Aufruf: npm run wortzeit -- <film>                  schreibt ton/<film>/wortzeit.tsv
//         npm run wortzeit -- <film> <szene> "Wort"   nennt den Frame des ersten Vorkommens
//         npm run wortzeit -- <film> pruefen          hält Kommentare „Wort“ (Zahl) in den Zeitfunktionen dagegen
//         npm run wortzeit -- <film> --pruefen        vergleicht die TSV mit einer neu gerechneten
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { einsaetzeIn, saeubere, wortzeiten } from '../lib/ton/zeitleiste.js';
import { ladeFilm, mitMessung } from './film.js';

const WURZEL = join(import.meta.dirname, '..');
const SPALTEN = ['absatz', 'szene', 'nr', 'wort', 't_szene_s', 'bild', 't_film_s'];

async function main() {
  const [film, a2, a3] = process.argv.slice(2);
  if (!film) {
    console.error('Aufruf: npm run wortzeit -- <film> [<szene> "Wort" | pruefen | --pruefen]');
    process.exit(2);
  }
  const { absaetze } = await ladeFilm(film);
  const gemessen = mitMessung(absaetze, film);
  const zeilen = gemessen.flatMap((a) =>
    wortzeiten(a.text, a.messung, a.szeneImFilm.fps, a.einsatz).map((w: { nr: number; wort: string; sauber: string; t: number; bild: number }) => ({ ...w, absatz: a.id, szene: a.szene, tFilm: Number((a.szeneImFilm.start + w.t).toFixed(3)) })),
  );

  if (a2 && a2 !== 'pruefen' && a2 !== '--pruefen') {
    const gesucht = saeubere(a3 ?? '').toLowerCase();
    const w = zeilen.find((z) => z.szene === a2 && z.sauber.toLowerCase() === gesucht);
    if (!w) {
      console.error(`Wortzeit: „${a3}“ kommt in ${a2} nicht vor`);
      process.exit(1);
    }
    console.log(`${a2} „${w.sauber}“: Bild ${w.bild} (t = ${w.t.toFixed(2)} s in der Szene)`);
    return;
  }

  if (a2 === 'pruefen') {
    const { szenen } = await ladeFilm(film);
    let geprueft = 0;
    let fehler = 0;
    for (const s of szenen) {
      for (const e of einsaetzeIn(s.quelltext)) {
        geprueft++;
        const w = zeilen.find((z) => z.szene === s.id && z.sauber.toLowerCase() === saeubere(e.wort).toLowerCase());
        if (!w) {
          console.error(`FEHLER ${s.id}/animation.js:${e.zeile}: „${e.wort}“ kommt im Sprechtext nicht vor`);
          fehler++;
        } else if (Math.abs(w.bild - e.bild) > 1) {
          console.error(`FEHLER ${s.id}/animation.js:${e.zeile}: „${e.wort}“ (${e.bild}), gemessen fällt es in Bild ${w.bild}`);
          fehler++;
        }
      }
    }
    console.log(geprueft ? `${film}: ${geprueft} Einsätze geprüft, ${fehler} Befunde` : `${film}: keine Kommentare der Form „Wort“ (Zahl) in den Zeitfunktionen; nichts zu vergleichen`);
    process.exit(fehler ? 1 : 0);
  }

  const tsv =
    '# ERZEUGT von tools/wortzeit.ts aus texte/ und ton/<film>/messung.json; nicht von Hand ändern\n' +
    SPALTEN.join('\t') +
    '\n' +
    zeilen.map((z) => [z.absatz, z.szene, z.nr, z.wort, z.t.toFixed(3), z.bild, z.tFilm.toFixed(3)].join('\t')).join('\n') +
    '\n';
  const ziel = join(WURZEL, 'ton', film, 'wortzeit.tsv');
  if (a2 === '--pruefen') {
    const alt = existsSync(ziel) ? readFileSync(ziel, 'utf8') : '';
    if (alt !== tsv) {
      console.error(`FEHLER ton/${film}/wortzeit.tsv ist veraltet (npm run wortzeit -- ${film})`);
      process.exit(1);
    }
    console.log(`${film}: Wortzeiten aktuell`);
    return;
  }
  mkdirSync(join(WURZEL, 'ton', film), { recursive: true });
  writeFileSync(ziel, tsv);
  console.log(`${film}: ${zeilen.length} Wörter → ton/${film}/wortzeit.tsv`);
}

await main();
