// Kostenfreigabe vor jeder Generierungsrunde (Abschnitt 8.3): Liste der Cues, Varianten, geschätzte Credits.
// Aufruf: node tools/sfx-kosten.js [--ordner lib/sfx] [--varianten 3] [<cue> …]
// Generiert wird erst nach „ja, generieren“ von Regie; dieses Werkzeug ruft nichts auf.
import { relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { katalogVon, rohVarianten, SFX } from '../lib/sfx/ablage.js';

/** Erfahrungswerte aus 8.3: Credits je Take. */
export const CREDITS = { sfx: 17, laut: 15 };
/** Stimmproben, aus denen Regie die Stimme der Laute wählt (8.3: drei bis vier Proben). */
export const STIMMPROBEN = 4;

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
  const ids = args.filter((a, k) => !a.startsWith('--') && !['--ordner', '--varianten'].includes(args[k - 1]));
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
