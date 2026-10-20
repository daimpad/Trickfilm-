// Kostenfreigabe vor jeder Generierungsrunde (Abschnitt 8.3): Liste der Cues, Varianten, geschätzte Credits.
// Aufruf: node tools/sfx-kosten.js [--ordner lib/sfx] [--varianten 3] [--plan <ziel.json>] [<cue> …]
//   --plan: Generierungsplan aus dem Bestand (je Cue Knotentyp, Modell, Parameter, fehlende Takes; bei Lauten je Stimme) als JSON
// Generiert wird erst nach „ja, generieren“ von Regie; dieses Werkzeug ruft nichts auf.
import { writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { herkunft, katalogVon, rohVarianten, SFX } from '../lib/sfx/ablage.js';

/**
 * Credits je Take, vorsichtig geschätzt. Gemessen am 2026-10-20 über den Connector: Geräusch von 1 s
 * geschätzt 11, abgerechnet 3,3; kurzer Laut mit eleven_v3 abgerechnet 15.
 */
export const CREDITS = { sfx: 11, laut: 15 };
/** Stimmproben, aus denen Regie die Stimme der Laute wählt (8.3: drei bis vier Proben). */
export const STIMMPROBEN = 4;

/** Je Lauf erzeugt der Connector höchstens vier Varianten. */
export const JE_LAUF = 4;

/**
 * Parameter für eleven_text_to_sound_v2 (geprüft am Modellschema, 2026-10-20: duration_seconds 0,5–30,
 * prompt_influence 0–1, loop). Einzelereignisse bekommen Luft, damit der Anschlag ganz darin liegt;
 * Schleifen eine halbe Sekunde mehr für die Naht; Nachklingendes Raum zum Ausklingen.
 */
export function sfxParameter(c) {
  const rund = (x) => Math.round(Math.min(30, Math.max(0.5, x)) * 10) / 10;
  const dauer = c.loop ? c.dauer_s + 0.5 : c.nachklang ? c.dauer_s + 0.8 : c.einzel ? Math.max(1, c.dauer_s + 0.5) : c.dauer_s + 0.4;
  return { duration_seconds: rund(dauer), prompt_influence: c.einzel ? 0.5 : 0.4, loop: Boolean(c.loop) };
}

/** Stimmen der Laute (entschieden von Regie, 2026-10-20: alle vier aus den Proben), je zwei Takes. */
export const STIMMEN = [
  { name: 'Linda', voice_id: 'pqWHDiU3kG9H0RxCmqXX' },
  { name: 'Julia', voice_id: 'etmIPb5HGDEg61TyHOPX' },
  { name: 'Jordan', voice_id: 'OwEAPhTFInN6VSRT9QXm' },
  { name: 'Lo', voice_id: 'nscgRrDRVT6a2RCQs92V' },
];
export const TAKES_JE_STIMME = 2;

/** Ziel an Takes je Geräusch: ganze Läufe zu je vier, mindestens einer, bei Vorrat genug für ihn. */
export const zielTakes = (c) => Math.ceil(Math.max(JE_LAUF, c.varianten_vorrat ?? 1) / JE_LAUF) * JE_LAUF;

/**
 * Generierungsplan aus dem gemessenen Bestand: je Geräusch die fehlenden Takes bis zum Ziel, je Laut die
 * fehlenden Takes jeder Stimme (Stimme laut Spalte parameter der Herkunft). Vollständige Cues fehlen im Plan.
 */
export function plan(ordner = SFX, { ids = [] } = {}) {
  const her = Object.values(herkunft(ordner));
  const aus = [];
  for (const c of katalogVon(ordner).filter((c) => !ids.length || ids.includes(c.id))) {
    const vorhanden = rohVarianten(ordner, c.id).length;
    if (c.art === 'sfx') {
      const fehlend = zielTakes(c) - vorhanden;
      if (fehlend > 0) aus.push({ id: c.id, node_type: 'sfx', model_id: 'eleven_text_to_sound_v2', prompt: c.prompt, model_parameters: sfxParameter(c), fehlend });
    } else {
      const takes = her.filter((h) => h.id === c.id);
      const stimmen = STIMMEN.map((s) => ({ ...s, fehlend: TAKES_JE_STIMME - takes.filter((h) => (h.parameter ?? '').includes(`Stimme ${s.name} `)).length })).filter((s) => s.fehlend > 0);
      if (stimmen.length) aus.push({ id: c.id, node_type: 'tts', model_id: 'eleven_v3', prompt: c.text, stimmen });
    }
  }
  return aus;
}

/** Kostenschätzung für alle noch nicht generierten Cues (oder die genannten). */
export function kosten(ordner = SFX, { varianten = 3, ids = [], stimmeGewaehlt = false } = {}) {
  const offen = katalogVon(ordner).filter((c) => (!ids.length || ids.includes(c.id)) && !rohVarianten(ordner, c.id).length);
  const posten = offen.map((c) => ({ id: c.id, art: c.art, varianten, credits: varianten * CREDITS[c.art], beschreibung: c.prompt ?? c.text }));
  const laute = offen.filter((c) => c.art === 'laut').length;
  const proben = laute && !stimmeGewaehlt ? { anzahl: STIMMPROBEN, credits: STIMMPROBEN * CREDITS.laut } : null;
  const summe = posten.reduce((s, p) => s + p.credits, 0) + (proben?.credits ?? 0);
  return { posten, proben, summe, geraeusche: posten.filter((p) => p.art === 'sfx').length, laute };
}

async function main() {
  const args = process.argv.slice(2);
  const nach = (s, v) => (args.includes(s) ? args[args.indexOf(s) + 1] : v);
  const ordner = nach('--ordner', SFX);
  const varianten = Number(nach('--varianten', 3));
  const ids = args.filter((a, k) => !a.startsWith('--') && !['--ordner', '--varianten', '--plan'].includes(args[k - 1]));
  if (args.includes('--plan')) {
    const p = plan(ordner, { ids });
    writeFileSync(nach('--plan'), JSON.stringify(p, null, 1) + '\n');
    const geraeusche = p.filter((x) => x.node_type === 'sfx').reduce((s, x) => s + x.fehlend, 0);
    const laute = p.filter((x) => x.node_type === 'tts').reduce((s, x) => s + x.stimmen.reduce((t, st) => t + st.fehlend, 0), 0);
    console.log(`Plan: ${p.length} Cues, ${geraeusche} Geräusch-Takes und ${laute} Laut-Takes fehlen → ${nach('--plan')}`);
    return;
  }
  const k = kosten(ordner, { varianten, ids });
  if (!k.posten.length) {
    console.log(`${relative(process.cwd(), ordner) || '.'}: alle genannten Cues haben schon Rohaufnahmen; nichts zu generieren`);
    return;
  }
  console.log('Cue\tArt\tVarianten\tCredits\tPrompt oder Text');
  for (const p of k.posten) console.log(`${p.id}\t${p.art}\t${p.varianten}\t${p.credits}\t${p.beschreibung}`);
  if (k.proben) console.log(`Stimmproben für die Laute\tlaut\t${k.proben.anzahl}\t${k.proben.credits}\tRegie wählt die Stimme vor den Lauten`);
  console.log(`\n${k.geraeusche} Geräusche und ${k.laute} Laute zu je ${varianten} Varianten: geschätzt ${k.summe} Credits (${CREDITS.sfx} je Geräusch-Take, ${CREDITS.laut} je Laut).`);
  console.log('Generiert wird erst nach „ja, generieren“. Ein laufender Aufruf wird nie wiederholt.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
