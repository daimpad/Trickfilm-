// Galerie (Abschnitt 10.4): alle Szenen eines oder aller Filme auf einer Seite, nach Film und Kapitel, mit
// Kontaktbogen; jede Szenenseite (Prototyp mit Geräuschen) liegt eingebettet daneben. Dazu ein ZIP, das ohne Server
// per Doppelklick läuft. Seiten für Dritte tragen noindex, nofollow und gehen vorher durch die Wortliste.
// Aufruf: npm run galerie [-- <film>]
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { alleSzenen, ladeSzene } from '../lib/build.js';
import { FARBEN, SCHRIFT } from '../tokens/tokens.js';
import { pruefeText } from './nichtoeffentlich.js';

const WURZEL = join(import.meta.dirname, '..');
const maskiere = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
type Eintrag = { id: string; film: string; kapitel: string; titel: string; desc: string; dauer: number };

async function main() {
  const gewuenscht = process.argv[2]?.toLowerCase();
  // Der Name wird Teil eines Pfads, der vor dem Schreiben geleert wird: nur Buchstaben, Ziffern, Bindestrich.
  if (gewuenscht && !/^[a-z0-9-]+$/.test(gewuenscht)) {
    console.error(`FEHLER Galerie: Film „${gewuenscht}“ ist kein gültiger Name`);
    process.exit(2);
  }
  const eintraege: Eintrag[] = [];
  const fehlend: string[] = [];
  for (const id of alleSzenen()) {
    if (id.startsWith('_')) continue;
    const sz = await ladeSzene(id);
    const film = String(sz.brief.film ?? '').toLowerCase();
    if (gewuenscht && film !== gewuenscht) continue;
    if (!existsSync(join(sz.ordner, 'dist', 'index.html')) || !existsSync(join(sz.ordner, 'dist', 'kontaktbogen.png'))) {
      fehlend.push(id);
      continue;
    }
    eintraege.push({ id, film, kapitel: id.split('-')[1] ?? '', titel: String(sz.scene.TITEL ?? id), desc: String(sz.scene.DESC ?? ''), dauer: sz.animation.SPEC.duration });
  }
  if (fehlend.length) {
    console.error(`FEHLER Galerie: ohne Prototyp oder Kontaktbogen: ${fehlend.join(', ')} (npm run szene:bauen und szene:kontaktbogen)`);
    process.exit(1);
  }
  if (!eintraege.length) {
    console.error(`FEHLER Galerie: keine Szene${gewuenscht ? ` im Film „${gewuenscht}“` : ''}`);
    process.exit(1);
  }

  const name = gewuenscht ?? 'alle';
  const ordner = join(WURZEL, 'out', 'galerie', name);
  rmSync(ordner, { recursive: true, force: true });
  mkdirSync(join(ordner, 'szenen'), { recursive: true });
  for (const e of eintraege) {
    const quelle = join(WURZEL, 'szenen', e.id, 'dist');
    copyFileSync(join(quelle, 'index.html'), join(ordner, 'szenen', `${e.id}.html`));
    copyFileSync(join(quelle, 'kontaktbogen.png'), join(ordner, 'szenen', `${e.id}.png`));
  }

  const filme = [...new Set(eintraege.map((e) => e.film))];
  const abschnitte = filme
    .map((f) => {
      const szenen = eintraege.filter((e) => e.film === f);
      const dauer = szenen.reduce((s, e) => s + e.dauer, 0);
      return `<section><h2>Film ${maskiere(f.toUpperCase())} <small>${szenen.length === 1 ? '1 Szene' : `${szenen.length} Szenen`}, ${dauer.toFixed(1)} s</small></h2>
${szenen
  .map(
    (e) => `<article id="${e.id}">
  <h3>Kapitel ${maskiere(e.kapitel)} · ${maskiere(e.titel)} <small>${e.id}, ${e.dauer.toFixed(1)} s</small></h3>
  <p>${maskiere(e.desc)}</p>
  <iframe src="szenen/${e.id}.html" title="${maskiere(e.titel)}" loading="lazy"></iframe>
  <p><a href="szenen/${e.id}.html">Szene allein öffnen</a> · <a href="szenen/${e.id}.png">Kontaktbogen</a></p>
</article>`,
  )
  .join('\n')}
</section>`;
    })
    .join('\n');
  const seite = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Galerie · ${maskiere(name)}</title>
<style>
  body { margin: 0; padding: 32px 16px 64px; background: ${FARBEN.primaerHell}; color: ${FARBEN.primaerDunkel}; font-family: ${SCHRIFT.familie}; line-height: 1.5; }
  main { max-width: 1280px; margin: 0 auto; }
  h1 { font-size: 32px; margin: 0 0 8px; }
  h2 { font-size: 24px; margin: 48px 0 16px; border-bottom: 2px solid ${FARBEN.primaerDunkel}; }
  h3 { font-size: 18px; margin: 32px 0 8px; }
  small { font-weight: 400; font-size: 14px; }
  iframe { width: 100%; aspect-ratio: 5 / 4; border: 2px solid ${FARBEN.schwarz}; background: ${FARBEN.weiss}; }
  a { color: ${FARBEN.primaerDunkel}; }
</style>
</head>
<body>
<main>
<h1>Galerie</h1>
<p>Jede Szene läuft mit Geräuschen; „Abspielen“ oder die Leertaste startet sie. Die Seite braucht keinen Server und kein Netz.</p>
${abschnitte}
</main>
</body>
</html>
`;
  const { treffer, mitListe } = pruefeText(seite);
  if (treffer.length) {
    rmSync(ordner, { recursive: true, force: true });
    console.error(`FEHLER Galerie: Wortliste schlägt an (${treffer.join(', ')}); keine Seite geschrieben`);
    process.exit(1);
  }
  if (!mitListe) console.log('Hinweis: keine Wortliste (nichtoeffentlich.local.txt); nur Muster geprüft');
  writeFileSync(join(ordner, 'index.html'), seite);

  const zip = join(WURZEL, 'out', 'galerie', `galerie-${name}.zip`);
  rmSync(zip, { force: true });
  const r = spawnSync('zip', ['-r', '-q', zip, name], { cwd: join(WURZEL, 'out', 'galerie'), encoding: 'utf8' });
  if (r.error || r.status !== 0) {
    console.error(`FEHLER Galerie: ZIP nicht gebaut (${r.error ? 'zip fehlt' : r.stderr.trim()})`);
    process.exit(1);
  }
  console.log(`Galerie: ${eintraege.length} Szene(n) in ${filme.length} Film(en) → ${relative(WURZEL, join(ordner, 'index.html'))}, ZIP ${relative(WURZEL, zip)}`);
}

await main();
