// Endmischung eines Films (Abschnitt 8.6, 9.2): Sprache, Geräusche mit Ducking, Grundrauschen.
// Aufruf: npm run mischen -- <film> [--trotzdem] [--pruefen]
// Schreibt out/ton/<film>-mischung.wav (nie im Repository) und das Lautheitsprotokoll ton/<film>/lautheit.tsv.
// Läuft ein Absatz über seine Szene, wird nicht gemischt; der Lauf sagt, um wie viel. --trotzdem mischt dennoch.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { finalPfad, SFX } from '../lib/sfx/ablage.js';
import { dekodiere, schreibeWav } from '../lib/sfx/ffmpeg.js';
import { integriert, momentanMax, RATE, truePeak } from '../lib/sfx/lautheit.js';
import { begrenze, dbZuFaktor, ducking, grundrauschen, lege, MISCHUNG, pegelPlan } from '../lib/ton/mischung.js';
import { absatzDatei } from '../lib/ton/stimme.js';
import { ladeFilm, mitMessung } from './film.js';

const WURZEL = join(import.meta.dirname, '..');
const NACH_LETZTEM_WORT_S = 1;
type Cue = { t: number; datei: string; gain_db: number };

async function main() {
  const args = process.argv.slice(2);
  const film = args.find((a) => !a.startsWith('--'));
  if (!film) {
    console.error('Aufruf: npm run mischen -- <film> [--trotzdem] [--pruefen]');
    process.exit(2);
  }
  const { szenen, absaetze } = await ladeFilm(film);
  const gemessen = mitMessung(absaetze, film);
  const dauer = szenen.reduce((s, x) => s + x.dauer, 0);
  const n = Math.ceil(dauer * RATE);

  // Überlauf: ein Absatz, der länger ist als seine Szene, wird nicht gemischt.
  const ueber = gemessen.filter((a) => a.einsatz + a.messung.laenge_s > a.szeneImFilm.dauer);
  for (const a of ueber) console.error(`FEHLER ${a.id} läuft ${(a.einsatz + a.messung.laenge_s - a.szeneImFilm.dauer).toFixed(2)} s über ${a.szene} (Einsatz ${a.einsatz} s, ${a.messung.laenge_s.toFixed(2)} s bei ${a.szeneImFilm.dauer} s Szene)`);
  if (ueber.length && !args.includes('--trotzdem')) process.exit(1);
  for (const a of gemessen) {
    const rest = a.szeneImFilm.dauer - a.einsatz - a.messung.laenge_s;
    if (rest < NACH_LETZTEM_WORT_S && rest >= 0) console.log(`Hinweis ${a.id}: nach dem letzten Wort bleiben ${rest.toFixed(2)} s (etwa ${NACH_LETZTEM_WORT_S} s sind vorgesehen)`);
  }

  // Sprache: hörbare Strecke jedes Absatzes an seinem Einsatz in der Szene, gepegelt.
  const plan = pegelPlan(gemessen.map((a) => ({ id: a.id, lufs_i: a.messung.lufs_i, true_peak_dbtp: a.messung.true_peak_dbtp })));
  const teile = gemessen.map((a) => {
    const x = dekodiere(absatzDatei(WURZEL, film, a.id));
    return x.subarray(Math.round(a.messung.start_s * RATE), Math.round(a.messung.ende_s * RATE));
  });
  // Der Begrenzer nimmt etwas Lautheit; ein zweiter Durchgang gleicht sie aus.
  let nachstellen = 0;
  let sprache = new Float32Array(n);
  let tiefe = 0;
  for (let durchgang = 0; durchgang < 2; durchgang++) {
    const roh = new Float32Array(n);
    gemessen.forEach((a, k) => lege(roh, teile[k]!, a.beginn, dbZuFaktor(plan.absaetze[k]!.db + nachstellen)));
    ({ aus: sprache, tiefe_db: tiefe } = begrenze(roh));
    nachstellen += MISCHUNG.sprache_lufs - integriert(sprache);
  }

  // Geräusche: je Szene die Cue-Liste, lautester Cue bei 0 dB; der Bus 12 dB unter der Sprache, dann geduckt.
  const geraeusch = new Float32Array(n);
  let cues = 0;
  for (const s of szenen) {
    const pfad = join(s.ordner, 'sfx-cues.json');
    if (!existsSync(pfad)) {
      console.log(`${s.id}: keine sfx-cues.json, Szene ohne Geräusche`);
      continue;
    }
    const liste = JSON.parse(readFileSync(pfad, 'utf8')).cues as Cue[];
    if (!liste.length) continue;
    const lauteste = Math.max(...liste.map((c) => c.gain_db));
    for (const c of liste) {
      lege(geraeusch, dekodiere(finalPfad(SFX, c.datei)), s.start + c.t, dbZuFaktor(c.gain_db - lauteste));
      cues++;
    }
  }
  const geraeuschMax = cues ? momentanMax(geraeusch) : -Infinity;
  const busDb = Number.isFinite(geraeuschMax) ? MISCHUNG.sprache_lufs - MISCHUNG.geraeusch_abstand_db - geraeuschMax : 0;
  const duck = ducking(sprache);
  const rauschen = grundrauschen(n);
  const mix = new Float32Array(n);
  const bus = dbZuFaktor(busDb);
  for (let i = 0; i < n; i++) mix[i] = sprache[i]! + geraeusch[i]! * bus * duck[i]! + rauschen[i]!;

  const ergebnis = { i: integriert(mix), tp: truePeak(mix), spracheI: integriert(sprache) };
  const f = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : String(v));
  const protokoll =
    '# ERZEUGT von tools/mischen.ts aus ton/<film>/messung.json, den Cue-Listen und den Geräuschen; nicht von Hand ändern\n' +
    ['art', 'id', 'lufs_vorher', 'db', 'lufs_nachher', 'abweichung_db'].join('\t') +
    '\n' +
    gemessen.map((a, k) => ['absatz', a.id, f(a.messung.lufs_i), f(plan.absaetze[k]!.db), f(plan.absaetze[k]!.nach), f(plan.absaetze[k]!.abweichung)].join('\t')).join('\n') +
    '\n' +
    ['geraeusche', `${cues} Cues`, f(geraeuschMax), f(busDb), f(geraeuschMax + busDb), ''].join('\t') +
    '\n' +
    ['film', film, '', '', f(ergebnis.i), `True Peak ${f(ergebnis.tp)} dBTP · Sprache ${f(ergebnis.spracheI)} LUFS · Begrenzer bis ${f(tiefe)} dB`].join('\t') +
    '\n';
  const ziel = join(WURZEL, 'ton', film, 'lautheit.tsv');
  if (args.includes('--pruefen')) {
    if ((existsSync(ziel) ? readFileSync(ziel, 'utf8') : '') !== protokoll) {
      console.error(`FEHLER ton/${film}/lautheit.tsv ist veraltet (npm run mischen -- ${film})`);
      process.exit(1);
    }
    console.log(`${film}: Lautheitsprotokoll aktuell`);
    return;
  }
  mkdirSync(join(WURZEL, 'out', 'ton'), { recursive: true });
  schreibeWav(mix, join(WURZEL, 'out', 'ton', `${film}-mischung.wav`));
  writeFileSync(ziel, protokoll);
  for (const b of plan.befunde) console.error(`Befund ${b}`);
  if (tiefe > MISCHUNG.begrenzer_tiefe_max_db) console.error(`Befund Begrenzer nimmt bis ${f(tiefe)} dB (über ${MISCHUNG.begrenzer_tiefe_max_db}): an der Mischung anhören`);
  for (const h of plan.hinweise) console.log(`Hinweis ${h}`);
  console.log(`${film}: ${dauer.toFixed(1)} s gemischt, ${f(ergebnis.i)} LUFS, True Peak ${f(ergebnis.tp)} dBTP, Geräuschbus ${f(busDb)} dB, Begrenzer bis ${f(tiefe)} dB → out/ton/${film}-mischung.wav; Protokoll ton/${film}/lautheit.tsv`);
}

await main();
