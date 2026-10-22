// Gerüst einer neuen Szene aus szenen/_vorlage. Aufruf: npm run szene:neu -- <FILM>-<NN>-<slug>
// Kopiert brief.yaml, geometry.js, scene.js, animation.js und abweichungen.md; Erzeugtes (dist/, protokoll.tsv) nicht.
// Danach erzeugt es die Cue-Liste der neuen Szene und die Szenenliste für Remotion, damit die Szene sofort baut
// und der Prüflauf grün bleibt.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ID_MUSTER = /^([A-Z][A-Z0-9]*)-(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const DATEIEN = ['brief.yaml', 'geometry.js', 'scene.js', 'animation.js', 'abweichungen.md'];

const id = process.argv[2];
const treffer = id ? ID_MUSTER.exec(id) : null;
if (!id || !treffer) {
  console.error('FEHLER: ID im Format <FILM>-<NN>-<slug>, z. B. DEMO-01-buero (FILM in Großbuchstaben, slug klein mit Bindestrich).');
  process.exit(2);
}
const film = treffer[1];
const quelle = join('szenen', '_vorlage');
const ziel = join('szenen', id);
if (existsSync(ziel)) {
  console.error(`FEHLER: ${ziel} gibt es schon; nichts überschrieben.`);
  process.exit(1);
}
mkdirSync(ziel, { recursive: true });
for (const datei of DATEIEN) copyFileSync(join(quelle, datei), join(ziel, datei));

const briefPfad = join(ziel, 'brief.yaml');
const brief = readFileSync(briefPfad, 'utf8')
  .replace(/^id: _vorlage\b/m, `id: ${id}`)
  .replace(/^film: VORLAGE\b/m, `film: ${film}`);
writeFileSync(briefPfad, brief);

execFileSync('node', ['tools/sfx-cues.js', id], { stdio: 'inherit' });
execFileSync('node', ['tools/remotion.js', 'vorbereiten'], { stdio: 'inherit' });

// Ein neuer Film bekommt Register und Lesefassung mit der Passage der Vorlage und die Kette mit Platzhalterstimme,
// damit der Prüflauf grün bleibt. Gehört die Szene zu einem Film, der schon ein Register hat, bleibt es unberührt.
const klein = (film ?? '').toLowerCase();
const register = join('texte', `${klein}.ts`);
const lesefassung = join('docs', 'sprechtext', `${klein}.md`);
const passage = /^\s*passage:\s*"([^"]*)"/m.exec(brief)?.[1] ?? '';
let neuerFilm = false;
if (!existsSync(register) && !existsSync(lesefassung)) {
  neuerFilm = true;
  writeFileSync(
    register,
    `// Sprechtext des Films ${film}, absatzweise. Dieselben Absätze stehen in docs/sprechtext/${klein}.md; ein Test hält\n` +
      `// beide gleich und jeden Absatz gleich der Passage im Brief seiner Szene. Geändert wird alles zusammen.\n` +
      `export const FILM = '${klein}';\n\nexport const ABSAETZE = [\n  {\n    id: 'absatz-01',\n    szene: '${id}',\n    text: ${JSON.stringify(passage)},\n  },\n];\n`,
  );
  writeFileSync(
    lesefassung,
    `# Sprechtext ${film}\n\nAbsätze in der Reihenfolge des Films. Dieselben Absätze stehen in \`texte/${klein}.ts\`; eine Prüfung hält beide gleich. Geändert wird beides zusammen und nur mit Rückfrage bei der Regie.\n\n## absatz-01 · ${id}\n\n${passage}\n`,
  );
  const tsx = (...a: string[]) => execFileSync('npx', ['tsx', ...a], { stdio: 'inherit' });
  tsx('tools/stimme.ts', klein, '--stub');
  tsx('tools/stimme.ts', klein, 'messen');
  tsx('tools/wortzeit.ts', klein);
  tsx('tools/untertitel.ts', klein);
  tsx('tools/mischen.ts', klein);
}

console.log(`angelegt: ${ziel} (fünf Dateien, dazu sfx-cues.json; remotion/src/szenen.ts nachgezogen)`);
if (neuerFilm) console.log(`neuer Film ${film}: ${register} und ${lesefassung} mit der Passage der Vorlage, Platzhalterstimme gemessen, gemischt`);
else if (existsSync(register)) console.log(`Film ${film} hat schon ein Register: Absatz für ${id} in ${register} und ${lesefassung} ergänzen`);
console.log('Nächste Schritte (docs/ANLEITUNG-SZENE.md):');
console.log(`  1. brief.yaml füllen: Passage, These, Pointe, Beats, Beschriftungen, Textäquivalent; dieselbe Passage in ${register} und ${lesefassung}`);
console.log(`  2. geometry.js, scene.js, animation.js anpassen (TITEL und DESC wie im Brief)`);
console.log(`  3. npm run sfx:cues -- ${id}   nach jeder Änderung der Bewegung, dann npm run szene:bauen -- ${id}`);
console.log(`  4. npm run szene:kontaktbogen -- ${id}   und jedes Bild ansehen`);
console.log(`  5. npm run szene:protokoll -- ${id}`);
console.log(`  6. Nach jeder Änderung der Passage: npm run stimme -- ${klein} --stub, dann messen, wortzeit, untertitel, mischen (docs/STIMME.md)`);
console.log(`  Verwerfen: npm run szene:entfernen -- ${id} --ja`);
