// Heruntergeladene Generierungen in die Ablage übernehmen (Abschnitt 8.3): prüfen, als nächste freie
// Variante nach roh/<id>/vN.<endung> kopieren, Herkunft nach roh/herkunft.tsv schreiben.
// Aufruf: node tools/sfx-ablegen.js <liste.tsv> [--ordner lib/sfx]
// liste.tsv (mit Kopfzeile): id, quelle, modell, prompt, sitzung, generierung, parameter
// Heruntergeladene Dateien sind fremde Daten: Sie werden nur von ffprobe gelesen und nie ausgeführt.
// Eine Generierung, deren Kennung schon in der Herkunft steht, wird nicht noch einmal abgelegt.
import { execFileSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { HERKUNFT_SPALTEN, herkunft, katalogVon, rohVarianten, SFX } from '../lib/sfx/ablage.js';

export const LIZENZ = 'ElevenLabs, Nutzung nach Tarif; vor Kundenlieferung prüfen';
const ENDUNGEN = new Set(['.mp3', '.wav', '.ogg', '.flac', '.opus', '.m4a']);
const SPALTEN = ['id', 'quelle', 'modell', 'prompt', 'sitzung', 'generierung', 'parameter'];
const zelle = (v) => String(v ?? '').replace(/[\t\n]/g, ' ');

/** Dauer einer Audiodatei; wirft, wenn ffprobe keine Tonspur findet. */
function pruefeTon(pfad) {
  const r = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_type:format=duration', '-of', 'csv=p=0', pfad], { encoding: 'utf8' });
  const zeilen = r.trim().split('\n');
  if (!zeilen.includes('audio')) throw new Error('keine Tonspur');
  const dauer = Number(zeilen.find((z) => /^[\d.]+$/.test(z)));
  if (!(dauer > 0.1)) throw new Error(`Dauer ${dauer} s`);
  return dauer;
}

/** Liste ablegen. datum ist der Tag der Generierung (Vorgabe: heute). Liefert { abgelegt, uebergangen, fehler }. */
export function ablegen(ordner, listeText, datum = new Date().toISOString().slice(0, 10)) {
  const katalog = new Map(katalogVon(ordner).map((c) => [c.id, c]));
  const bekannt = new Set(Object.values(herkunft(ordner)).map((h) => h.generierung).filter(Boolean));
  const [kopf, ...zeilen] = listeText.split(/\r?\n/).filter(Boolean);
  const spalten = kopf.split('\t');
  for (const s of SPALTEN) if (!spalten.includes(s)) throw new Error(`Liste: Spalte „${s}“ fehlt`);
  const herkunftPfad = join(ordner, 'roh', 'herkunft.tsv');
  if (!existsSync(herkunftPfad)) {
    mkdirSync(join(ordner, 'roh'), { recursive: true });
    writeFileSync(herkunftPfad, HERKUNFT_SPALTEN.join('\t') + '\n');
  }
  const abgelegt = [];
  const uebergangen = [];
  const fehler = [];
  const neueZeilen = [];
  for (const z of zeilen) {
    const w = Object.fromEntries(z.split('\t').map((v, i) => [spalten[i], v]));
    if (!katalog.has(w.id)) {
      fehler.push(`${w.id}: steht nicht im Katalog`);
      continue;
    }
    if (w.generierung && bekannt.has(w.generierung)) {
      uebergangen.push(`${w.id}: Generierung ${w.generierung} liegt schon ab`);
      continue;
    }
    const endung = extname(w.quelle).toLowerCase();
    if (!ENDUNGEN.has(endung)) {
      fehler.push(`${w.id}: Endung „${endung}“ ist kein erlaubtes Tonformat`);
      continue;
    }
    let dauer;
    try {
      dauer = pruefeTon(w.quelle);
    } catch (e) {
      fehler.push(`${w.id}: ${w.quelle}: ${e.message}`);
      continue;
    }
    const nummer = Math.max(0, ...rohVarianten(ordner, w.id).map((v) => Number(v.name.slice(1)))) + 1;
    const ziel = join(ordner, 'roh', w.id, `v${nummer}${endung}`);
    mkdirSync(join(ordner, 'roh', w.id), { recursive: true });
    copyFileSync(w.quelle, ziel);
    bekannt.add(w.generierung);
    neueZeilen.push(
      HERKUNFT_SPALTEN.map((s) =>
        zelle({ id: w.id, variante: `v${nummer}`, datei: `v${nummer}${endung}`, modell: w.modell, prompt: w.prompt, datum, sitzung: w.sitzung, generierung: w.generierung, lizenz: LIZENZ, parameter: w.parameter }[s]),
      ).join('\t'),
    );
    abgelegt.push(`${w.id}/v${nummer} (${dauer.toFixed(2)} s)`);
  }
  // Ein Schreibaufruf je Liste, damit parallele Ablagen keine Zeilen verschränken.
  if (neueZeilen.length) appendFileSync(herkunftPfad, neueZeilen.join('\n') + '\n');
  return { abgelegt, uebergangen, fehler };
}

async function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--ordner');
  const ordner = i >= 0 ? args[i + 1] : SFX;
  const liste = args.find((a, k) => !a.startsWith('--') && args[k - 1] !== '--ordner');
  if (!liste) {
    console.error('Aufruf: node tools/sfx-ablegen.js <liste.tsv> [--ordner lib/sfx]');
    process.exit(2);
  }
  const r = ablegen(ordner, readFileSync(liste, 'utf8'));
  for (const u of r.uebergangen) console.log(`übergangen ${u}`);
  for (const f of r.fehler) console.error(`FEHLER ${f}`);
  console.log(`${r.abgelegt.length} abgelegt, ${r.uebergangen.length} übergangen, ${r.fehler.length} Fehler`);
  if (r.fehler.length) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
