// Eine Szene verwerfen: Ordner entfernen, Remotion-Szenenliste nachziehen. Aufruf: npm run szene:entfernen -- <ID> [--ja]
// Ohne --ja nennt der Lauf nur, was er entfernen würde. Gehört die Szene allein zu ihrem Film und trägt dieser nur
// Platzhalterstimmen, gehen Register, Lesefassung und ton/<film>/ mit; eine echte Aufnahme entfernt der Lauf nie.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const WURZEL = join(import.meta.dirname, '..');
const ID_MUSTER = /^([A-Z][A-Z0-9]*)-(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

const [id, ...rest] = process.argv.slice(2);
const ja = rest.includes('--ja');
const treffer = id ? ID_MUSTER.exec(id) : null;
if (!id || !treffer) {
  console.error('Aufruf: npm run szene:entfernen -- <FILM>-<NN>-<slug> [--ja]  (die Vorlage _vorlage lässt sich nicht entfernen)');
  process.exit(2);
}
const ordner = join(WURZEL, 'szenen', id);
if (!existsSync(ordner)) {
  console.error(`FEHLER: szenen/${id} gibt es nicht; nichts entfernt.`);
  process.exit(1);
}
const klein = treffer[1]!.toLowerCase();
const register = join(WURZEL, 'texte', `${klein}.ts`);
const lesefassung = join(WURZEL, 'docs', 'sprechtext', `${klein}.md`);
const ton = join(WURZEL, 'ton', klein);

// Andere Szenen desselben Films und die Absätze dieser Szene im Register.
const andere = readdirSync(join(WURZEL, 'szenen')).filter((n) => n !== id && n.startsWith(`${treffer[1]}-`));
const registerText = existsSync(register) ? readFileSync(register, 'utf8') : '';
const absaetzeHier = [...registerText.matchAll(/id:\s*'([^']+)',\s*szene:\s*'([^']+)'/g)].filter((m) => m[2] === id).map((m) => m[1]!);
const absaetzeAndere = [...registerText.matchAll(/id:\s*'([^']+)',\s*szene:\s*'([^']+)'/g)].filter((m) => m[2] !== id).map((m) => m[1]!);
const manifest = existsSync(join(ton, 'stimme.json')) ? JSON.parse(readFileSync(join(ton, 'stimme.json'), 'utf8')).absaetze ?? {} : {};
const echte = absaetzeHier.filter((a) => existsSync(join(ton, `${a}.wav`)) && manifest[a]?.quelle !== 'stub');

const mitFilm = andere.length === 0 && absaetzeAndere.length === 0 && echte.length === 0;
if (echte.length) {
  console.error(`FEHLER: ${id} hat echte Aufnahmen (${echte.join(', ')} in ton/${klein}/); erst die Absätze im Register klären, dann entfernen. Nichts entfernt.`);
  process.exit(1);
}
if (absaetzeHier.length && !mitFilm) {
  console.error(`FEHLER: ${absaetzeHier.join(', ')} in texte/${klein}.ts gehören zu ${id}, der Film hat weitere Szenen oder Absätze; erst diese Absätze aus Register und Lesefassung nehmen. Nichts entfernt.`);
  process.exit(1);
}
const ziele = [`szenen/${id}/`, ...(mitFilm && registerText ? [`texte/${klein}.ts`, `docs/sprechtext/${klein}.md`, `ton/${klein}/`] : [])];
if (!ja) {
  console.log(`Würde entfernen: ${ziele.join(', ')}; danach remotion/src/szenen.ts nachziehen. Mit --ja ausführen.`);
  process.exit(0);
}
rmSync(ordner, { recursive: true });
if (mitFilm && registerText) {
  rmSync(register);
  if (existsSync(lesefassung)) rmSync(lesefassung);
  if (existsSync(ton)) rmSync(ton, { recursive: true });
}
execFileSync('node', ['tools/remotion.js', 'vorbereiten'], { cwd: WURZEL, stdio: 'inherit' });
console.log(`entfernt: ${ziele.join(', ')}`);
