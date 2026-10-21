// Erzählung je Absatz (Abschnitt 9.1, 9.2). Aufruf: npm run stimme -- <film> [pruefen|--stub|--plan|messen|--ablegen <absatz> <datei> [--generierung <id>]]
//   pruefen      zählt Absätze, Zeichen, Stand und geschätzte Credits; ohne Netz
//   --stub       Platzhalter (Sinuston in geplanter Länge) für jeden Absatz ohne eigene Aufnahme
//   --plan       was über den ElevenLabs-Connector zu erzeugen ist (JSON); generiert wird erst nach „ja, generieren“
//   --ablegen    eine heruntergeladene Generierung als Absatz übernehmen (fremde Daten, nur ffmpeg liest sie)
//   messen       hörbare Strecke, Länge, Lautheit und True Peak jedes Absatzes nach ton/messung.json
// Eine eigene Aufnahme (Datei ohne Eintrag im Manifest) bleibt immer stehen.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { dekodiere, schreibeWav } from '../lib/sfx/ffmpeg.js';
import { geplanteDauer, pruefsumme } from '../lib/ton/sprechtext.js';
import { absatzDatei, leseManifest, manifestPfad, platzhalter, standVon, tonOrdner, vermesseAbsatz } from '../lib/ton/stimme.js';
import { einstellungenVon, type Einstellungen } from './stimmklon.js';
import { sprechtext } from './stolperstellen.js';

const WURZEL = join(import.meta.dirname, '..');
export const MESSUNG = join(WURZEL, 'ton', 'messung.json');
const CREDITS_JE_ZEICHEN: Record<string, number> = { eleven_multilingual_v2: 1, eleven_v3: 1, eleven_flash_v2_5: 0.5 };

export type Absatz = { id: string; szene: string; text: string };

export async function register(film: string): Promise<Absatz[]> {
  const pfad = join(WURZEL, 'texte', `${film}.ts`);
  if (!existsSync(pfad)) throw new Error(`Stimme: kein Register texte/${film}.ts`);
  const m = (await import(pathToFileURL(pfad).href)) as { ABSAETZE: Absatz[] };
  return m.ABSAETZE;
}

const summeFuer = (a: Absatz, e: Einstellungen) => pruefsumme(sprechtext(a.text), { stimme: e.stimme?.voice_id ?? null, modell: e.modell, stabilitaet: e.stabilitaet, aehnlichkeit: e.aehnlichkeit, tempo: e.tempo });

function schreibeManifest(film: string, manifest: { absaetze: Record<string, unknown> }) {
  writeFileSync(manifestPfad(WURZEL, film), JSON.stringify({ _erzeugt: 'ERZEUGT von tools/stimme.ts; nicht von Hand ändern', ...manifest }, null, 2) + '\n');
}

function pruefen(film: string, absaetze: Absatz[], e: Einstellungen) {
  const manifest = leseManifest(WURZEL, film);
  let zeichen = 0;
  for (const a of absaetze) {
    const s = summeFuer(a, e);
    const st = standVon(WURZEL, film, a.id, s, manifest);
    const gesprochen = sprechtext(a.text);
    zeichen += gesprochen.length;
    console.log(`${a.id}\t${a.szene}\t${gesprochen.length} Zeichen\tgeplant ${geplanteDauer(gesprochen, e.tempo).toFixed(1)} s\t${st.stand}${st.veraltet ? ' (veraltet)' : ''}`);
  }
  const credits = Math.ceil(zeichen * (CREDITS_JE_ZEICHEN[e.modell] ?? 1));
  console.log(`${film}: ${absaetze.length} Absätze, ${zeichen} Zeichen, geschätzt ${credits} Credits mit ${e.modell}; Stimme: ${e.stimme ? `${e.stimme.name} (${e.stimme.voice_id})` : 'noch nicht gewählt'}`);
}

function stub(film: string, absaetze: Absatz[], e: Einstellungen) {
  mkdirSync(tonOrdner(WURZEL, film), { recursive: true });
  const manifest = leseManifest(WURZEL, film);
  for (const a of absaetze) {
    const s = summeFuer(a, e);
    const st = standVon(WURZEL, film, a.id, s, manifest);
    if (st.stand === 'eigen') {
      console.log(`${a.id}: eigene Aufnahme, bleibt stehen`);
      continue;
    }
    if (st.stand === 'elevenlabs' && !st.veraltet) {
      console.log(`${a.id}: Generierung aktuell, kein Platzhalter`);
      continue;
    }
    const dauer = geplanteDauer(sprechtext(a.text), e.tempo);
    schreibeWav(platzhalter(dauer), absatzDatei(WURZEL, film, a.id));
    manifest.absaetze[a.id] = { quelle: 'stub', pruefsumme: s };
    console.log(`${a.id}: Platzhalter ${dauer.toFixed(2)} s`);
  }
  schreibeManifest(film, manifest);
}

function plan(film: string, absaetze: Absatz[], e: Einstellungen) {
  if (!e.stimme) throw new Error(`Stimme: für „${film}“ ist noch keine Stimme gewählt (tools/stimmklon.ts); die Regie entscheidet`);
  const manifest = leseManifest(WURZEL, film);
  const offen = absaetze.filter((a) => {
    const st = standVon(WURZEL, film, a.id, summeFuer(a, e), manifest);
    return st.stand === 'fehlt' || st.stand === 'stub' || st.veraltet;
  });
  console.log(
    JSON.stringify(
      offen.map((a) => ({ absatz: a.id, szene: a.szene, text: sprechtext(a.text), voice_id: e.stimme!.voice_id, model_id: e.modell, stability: e.stabilitaet, similarity_boost: e.aehnlichkeit, speed: e.tempo })),
      null,
      2,
    ),
  );
}

function ablegen(film: string, absaetze: Absatz[], e: Einstellungen, id: string, datei: string, generierung: string | null) {
  const a = absaetze.find((x) => x.id === id);
  if (!a) throw new Error(`Stimme: Absatz „${id}“ steht nicht im Register`);
  const manifest = leseManifest(WURZEL, film);
  if (standVon(WURZEL, film, id, '', manifest).stand === 'eigen') throw new Error(`Stimme: ${id} ist eine eigene Aufnahme und bleibt stehen`);
  const x = dekodiere(datei);
  if (x.length < 4800) throw new Error(`Stimme: ${datei} hat keinen hörbaren Inhalt`);
  mkdirSync(tonOrdner(WURZEL, film), { recursive: true });
  schreibeWav(x, absatzDatei(WURZEL, film, id));
  manifest.absaetze[id] = { quelle: 'elevenlabs', pruefsumme: summeFuer(a, e), modell: e.modell, stimme: e.stimme, generierung };
  schreibeManifest(film, manifest);
  console.log(`${id}: abgelegt (${(x.length / 48000).toFixed(2)} s) → ton/${film}/${id}.wav`);
}

/** Messung aller Absätze eines Films nach ton/messung.json; mit pruefenNur nur vergleichen. */
export async function messen(film: string, absaetze: Absatz[], pruefenNur = false): Promise<number> {
  const alt = existsSync(MESSUNG) ? JSON.parse(readFileSync(MESSUNG, 'utf8')) : { _erzeugt: '', filme: {} };
  const neu: Record<string, unknown> = {};
  for (const a of absaetze) {
    const p = absatzDatei(WURZEL, film, a.id);
    if (!existsSync(p)) {
      console.log(`${a.id}: keine Aufnahme (npm run stimme -- ${film} --stub)`);
      continue;
    }
    neu[a.id] = { szene: a.szene, ...vermesseAbsatz(dekodiere(p)) };
  }
  const gesamt = { _erzeugt: 'ERZEUGT von tools/stimme.ts messen; nicht von Hand ändern', filme: { ...alt.filme, [film]: neu } };
  const text = JSON.stringify(gesamt, null, 2) + '\n';
  if (pruefenNur) {
    const vorher = existsSync(MESSUNG) ? readFileSync(MESSUNG, 'utf8') : '';
    if (JSON.stringify(JSON.parse(vorher || '{}').filme?.[film] ?? null) !== JSON.stringify(neu)) {
      console.error(`FEHLER ton/messung.json ist für ${film} veraltet (npm run stimme -- ${film} messen)`);
      return 1;
    }
    console.log(`${film}: Messung aktuell`);
    return 0;
  }
  mkdirSync(join(WURZEL, 'ton'), { recursive: true });
  writeFileSync(MESSUNG, text);
  for (const [id, m] of Object.entries(neu)) console.log(`${id}: ${JSON.stringify(m)}`);
  return 0;
}

async function main() {
  const [film, ...rest] = process.argv.slice(2);
  if (!film) {
    console.error('Aufruf: npm run stimme -- <film> [pruefen|--stub|--plan|messen [--pruefen]|--ablegen <absatz> <datei> [--generierung <id>]]');
    process.exit(2);
  }
  const absaetze = await register(film);
  const e = einstellungenVon(film);
  const wert = (name: string) => {
    const i = rest.indexOf(name);
    return i >= 0 ? (rest[i + 1] ?? null) : null;
  };
  if (rest[0] === '--stub') return stub(film, absaetze, e);
  if (rest[0] === '--plan') return plan(film, absaetze, e);
  if (rest[0] === '--ablegen') return ablegen(film, absaetze, e, rest[1] ?? '', rest[2] ?? '', wert('--generierung'));
  if (rest[0] === 'messen') process.exit(await messen(film, absaetze, rest.includes('--pruefen')));
  if (rest[0] === 'pruefen' || rest.length === 0) {
    pruefen(film, absaetze, e);
    if (rest.length === 0) console.log('Generiert wird über den ElevenLabs-Connector nach „ja, generieren“: --plan nennt, was fehlt; --ablegen übernimmt die Datei.');
    return;
  }
  console.error(`Stimme: unbekannter Befehl „${rest[0]}“`);
  process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
