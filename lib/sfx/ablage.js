// Ablage der Geräusche: Rohaufnahmen, Herkunft, Auswahl, fertige Dateien (Abschnitt 4 und 8.3–8.4). Nur in Node.
// ordner ist lib/sfx oder, in Tests, ein eigener Ordner mit derselben Gliederung.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { leseYaml } from '../brief.js';
import { leseKatalog } from './katalog.js';

export const SFX = import.meta.dirname;
const ROH_DATEI = /^v(\d+)\.(mp3|wav|ogg|flac|opus|m4a)$/;
export const HERKUNFT_SPALTEN = ['id', 'variante', 'datei', 'modell', 'prompt', 'datum', 'sitzung', 'generierung', 'lizenz', 'parameter'];

/** Katalog des Ordners (eigene katalog.yaml, sonst die der Werkstatt). */
export function katalogVon(ordner = SFX) {
  const eigen = join(ordner, 'katalog.yaml');
  return existsSync(eigen) ? leseKatalog(readFileSync(eigen, 'utf8')) : leseKatalog();
}

/** Rohvarianten eines Cues: [{ name: 'v1', pfad }] nach Nummer. */
export function rohVarianten(ordner, id) {
  const d = join(ordner, 'roh', id);
  if (!existsSync(d)) return [];
  return readdirSync(d)
    .map((f) => [f, ROH_DATEI.exec(f)])
    .filter(([, m]) => m)
    .sort((a, b) => Number(a[1][1]) - Number(b[1][1]))
    .map(([f, m]) => ({ name: `v${m[1]}`, pfad: join(d, f) }));
}

/** Herkunft je Cue und Variante aus roh/herkunft.tsv: { 'id/v1': { modell, prompt, … } }. */
export function herkunft(ordner = SFX) {
  const p = join(ordner, 'roh', 'herkunft.tsv');
  if (!existsSync(p)) return {};
  const [kopf, ...zeilen] = readFileSync(p, 'utf8').split('\n').filter((z) => z && !z.startsWith('#'));
  const spalten = kopf.split('\t');
  return Object.fromEntries(
    zeilen.map((z) => {
      const w = Object.fromEntries(z.split('\t').map((v, i) => [spalten[i], v]));
      return [`${w.id}/${w.variante}`, w];
    }),
  );
}

/** Auswahl je Cue: { id: { wahl: ['v2'], vorlaeufig } }. */
export function leseAuswahl(ordner = SFX) {
  const p = join(ordner, 'auswahl.yaml');
  if (!existsSync(p)) return {};
  const liste = leseYaml(readFileSync(p, 'utf8'), 'auswahl.yaml') ?? [];
  return Object.fromEntries(liste.map((e) => [e.id, { wahl: e.wahl ?? [], vorlaeufig: e.vorlaeufig !== false }]));
}

/** Auswahl schreiben, in der Reihenfolge des Katalogs. */
export function schreibeAuswahl(ordner, auswahl, katalog) {
  const zeilen = ['# Auswahl je Cue: welche Rohvariante gilt. vorlaeufig: true, bis Regie in der Hörprobe bestätigt.', '# Geschrieben von tools/sfx-normalisieren.js --vorschlag und tools/sfx-hoerprobe.js --uebernehmen.'];
  for (const c of katalog) {
    const a = auswahl[c.id];
    if (!a) continue;
    zeilen.push(`- id: ${c.id}`, `  wahl: [${a.wahl.join(', ')}]`, `  vorlaeufig: ${a.vorlaeufig}`);
  }
  writeFileSync(join(ordner, 'auswahl.yaml'), zeilen.join('\n') + '\n');
}

/** Pfad einer fertigen Datei; datei ist <id> oder <id>/NN wie in sfx-cues.json. */
export const finalPfad = (ordner, datei) => join(ordner, 'final', `${datei}.wav`);
export const prototypPfad = (ordner, datei) => join(ordner, 'prototyp', `${datei}.ogg`);
