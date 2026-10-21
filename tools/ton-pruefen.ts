// Erzeugte Tondateien gegen ihre Quellen prüfen, für jeden Film mit Register in texte/:
// Messung, Wortzeiten, Untertitel, Lautheitsprotokoll. Teil von npm run erzeugt:pruefen.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const WURZEL = join(import.meta.dirname, '..');
const filme = readdirSync(join(WURZEL, 'texte'))
  .filter((f) => f.endsWith('.ts'))
  .map((f) => f.replace(/\.ts$/, ''));
if (!filme.length) {
  console.error('ton-pruefen: kein Register in texte/, nichts geprüft');
  process.exit(1);
}
let fehler = 0;
for (const film of filme) {
  for (const [werkzeug, ...args] of [['stimme', 'messen'], ['wortzeit'], ['untertitel'], ['mischen']]) {
    const r = spawnSync('npx', ['tsx', join('tools', `${werkzeug}.ts`), film, ...args, '--pruefen'], { cwd: WURZEL, stdio: 'inherit' });
    if (r.status !== 0) fehler++;
  }
}
process.exit(fehler ? 1 : 0);
