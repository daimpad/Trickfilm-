// Gerüst einer neuen Szene aus szenen/_vorlage. Aufruf: npm run szene:neu -- <FILM>-<NN>-<slug>
// Kopiert brief.yaml, geometry.js, scene.js, animation.js und abweichungen.md; Erzeugtes (dist/, protokoll.tsv) nicht.
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

console.log(`angelegt: ${ziel}`);
console.log('Nächste Schritte (docs/ANLEITUNG-SZENE.md):');
console.log(`  1. brief.yaml füllen: Passage, These, Pointe, Beats, Beschriftungen, Textäquivalent`);
console.log(`  2. geometry.js, scene.js, animation.js anpassen (TITEL und DESC wie im Brief)`);
console.log(`  3. npm run szene:bauen -- ${id}`);
console.log(`  4. npm run szene:kontaktbogen -- ${id}   und jedes Bild ansehen`);
console.log(`  5. npm run szene:protokoll -- ${id}`);
