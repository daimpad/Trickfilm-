// Baut die Webseite der Werkstatt nach out/seite/ (für GitHub Pages).
// Setzt in site/index.html ein, was sonst veralten würde: die Palette der Filme, alle fertigen Befehle aus
// package.json, Bilder, Schriften, den Prototyp der Vorlage, Posen-Editor und Teile-Werkstatt.
// Hält an, wenn ein Befehl keine Beschreibung hat, ein Platzhalter offen bleibt oder ein Link ins Leere zeigt.
// Aufruf: node tools/seite-bauen.js [--ziel out/seite]
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FARBEN, kontrast } from '../tokens/tokens.js';
import { baueSzene } from '../lib/build.js';
import { kontaktbogen } from '../lib/kontaktbogen.js';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const i = process.argv.indexOf('--ziel');
const ZIEL = join(WURZEL, i >= 0 ? process.argv[i + 1] : 'out/seite');
const maske = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Was jeder Befehl tut; ein neuer Befehl ohne Eintrag hält den Bau an. */
const BESCHREIBUNG = {
  typecheck: 'Typen der Werkzeuge und von Remotion prüfen',
  test: 'alle Bibliothekstests, einschließlich Browser-Tests in Chromium',
  verboten: 'Repository gegen Geheimnisse und Verbotenes prüfen (Animationen, Zufall, Farben, Raster, Webfonts, Netz)',
  'erzeugt:pruefen': 'prüfen, dass alle erzeugten Dateien aktuell sind',
  pruefen: 'alles, was der Prüflauf auf GitHub fährt, örtlich',
  'szene:neu': 'neue Szene aus der Vorlage anlegen: <code>-- FILM-01-name</code>',
  'szene:bauen': 'Szene prüfen und Prototyp erzeugen: <code>-- &lt;ID|alle&gt;</code>',
  'szene:kontaktbogen': 'neun Standbilder mit Schutzzone erzeugen',
  'szene:protokoll': 'Protokoll der Szene schreiben',
  editor: 'Posen-Editor erzeugen, optional mit Szene als Hintergrund',
  teile: 'Teile-Werkstatt erzeugen: Einzelzeichnungen laden, einpassen, als Teilesatz ausgeben',
  requisiten: 'Katalog aller Requisiten als Bild',
  'figuren:erzeugen': 'Spezifikationsmodul, Zeichenvorlagen und satz-00 aus der Rig-Spezifikation',
  'figuren:testposen': 'sechs Testposen je Archetyp als Bild',
  'figuren:vorlagen': 'Zeichenvorlagen erzeugen und als Übersicht zeigen',
  'figuren:import': 'Teilesatz prüfen, Gelenke testen und einlesen: <code>-- satz-01</code>',
  'sfx:cues': 'Geräusch-Cues einer Szene aus ihrer Bewegung, mit Stichprobe am Bild: <code>-- &lt;ID|alle&gt; [--stichprobe]</code>',
  'sfx:messen': 'Geräusche messen (Lautheit, Spitzenpegel)',
  'sfx:normalisieren': 'Geräusche schneiden und normalisieren; <code>-- --vorschlag</code> wählt vorläufig die sauberste Variante',
  'sfx:hoerprobe': 'Hörprobe aller Varianten zum Auswählen; <code>-- --uebernehmen auswahl.csv</code> übernimmt die Wahl',
  'sfx:kosten': 'Kostenschätzung vor einer Generierungsrunde: Cues, Varianten, Credits; <code>-- --plan plan.json</code> schreibt den Generierungsplan',
  'sfx:ablegen': 'heruntergeladene Generierungen prüfen und mit Herkunft nach <code>lib/sfx/roh/</code> übernehmen',
  stimme: 'Erzählung absatzweise erzeugen',
  wortzeit: 'Zeitpunkt jedes Worts aus der Aufnahme',
  untertitel: 'Untertitel als WebVTT',
  mischen: 'Stimme, Geräusche und Grundrauschen mischen',
  video: 'Prototyp Bild für Bild als MP4 mit Ton',
  studio: 'Remotion Studio im Browser öffnen',
  render: 'Video mit Remotion rendern',
  galerie: 'alle Szenen auf einer Seite',
  drehbuch: 'Drehbuch je Film mit Bildern und Marken',
};

/** Fertige Befehle mit Beschreibung; noch nicht gebaute (tools/noch-nicht.js) erscheinen nicht. */
function skripte() {
  const pkg = JSON.parse(readFileSync(join(WURZEL, 'package.json'), 'utf8'));
  const fehlend = Object.keys(pkg.scripts).filter((k) => !BESCHREIBUNG[k]);
  if (fehlend.length) throw new Error(`Seite: Befehle ohne Beschreibung in tools/seite-bauen.js: ${fehlend.join(', ')}`);
  return Object.entries(pkg.scripts)
    .filter(([, befehl]) => !/noch-nicht\.js/.test(befehl))
    .map(([name]) => `<tr><td><code>${maske(name)}</code></td><td>${BESCHREIBUNG[name]}</td></tr>`)
    .join('');
}

function palette() {
  return Object.entries(FARBEN)
    .map(
      ([name, hex]) =>
        `<div class="farbe"><span style="background:${hex}"></span><p><strong>${name}</strong><br>${hex} · ${kontrast(hex, FARBEN.weiss).toFixed(2)}:1</p></div>`,
    )
    .join('');
}

function kopiere(von, nach) {
  const quelle = join(WURZEL, von);
  if (!existsSync(quelle)) throw new Error(`Seite: ${von} fehlt (erst erzeugen)`);
  mkdirSync(dirname(join(ZIEL, nach)), { recursive: true });
  copyFileSync(quelle, join(ZIEL, nach));
}

// 1. Prototyp und Kontaktbogen der Vorlage-Szene.
const vorlage = await baueSzene('_vorlage');
if (vorlage.befunde.length) throw new Error(`Seite: Vorlage hat Befunde: ${vorlage.befunde.map((b) => b.text).join('; ')}`);
await kontaktbogen('_vorlage');
kopiere('szenen/_vorlage/dist/index.html', 'prototyp/index.html');
kopiere('szenen/_vorlage/dist/kontaktbogen.png', 'bilder/kontaktbogen-vorlage.png');

// 2. Posen-Editor mit der Vorlage als Hintergrund, ohne gespeicherten Zwischenstand.
mkdirSync(join(ZIEL, 'editor'), { recursive: true });
execFileSync('node', [join(WURZEL, 'tools/posen-editor.js'), '--szene', '_vorlage', '--figur', 'A', '--ziel', join(ZIEL, 'editor/index.html').replace(WURZEL + '/', '')], {
  cwd: WURZEL,
  stdio: 'inherit',
});

// 3. Teile-Werkstatt, ohne gespeicherten Zwischenstand.
execFileSync('node', [join(WURZEL, 'tools/teile-werkstatt.js'), '--frisch', '--ziel', join(ZIEL, 'teile/index.html').replace(WURZEL + '/', '')], {
  cwd: WURZEL,
  stdio: 'inherit',
});

// 4. Bilder aus dem Repository.
kopiere('lib/props/KATALOG.png', 'bilder/requisiten.png');
kopiere('figuren/teilesaetze/satz-00/testposen.png', 'bilder/testposen.png');
kopiere('figuren/vorlagen.png', 'bilder/vorlagen.png');

// 5. Schriften der Seite (SIL OFL, im Repository; nie aus dem Netz).
for (const f of readdirSync(join(WURZEL, 'site/schriften'))) kopiere(`site/schriften/${f}`, `schriften/${f}`);

// 6. Seite aus der Vorlage.
const ersetzungen = { PALETTE: palette(), SKRIPTE: skripte() };
const html = readFileSync(join(WURZEL, 'site/index.html'), 'utf8').replace(/\{\{([A-Z_]+)\}\}/g, (ganz, k) => {
  if (!(k in ersetzungen)) throw new Error(`Seite: Platzhalter {{${k}}} unbekannt`);
  return ersetzungen[k];
});

// 7. Jeder relative Link, jedes Bild und jede Schrift muss existieren.
const fehlend = [...html.matchAll(/\s(?:href|src)="([^"#:]+?)"/g), ...html.matchAll(/url\(([^)#:]+?)\)/g)]
  .map((m) => m[1])
  .filter((p) => !existsSync(join(ZIEL, p.endsWith('/') ? `${p}index.html` : p)));
if (fehlend.length) throw new Error(`Seite: Links ins Leere: ${fehlend.join(', ')}`);

writeFileSync(join(ZIEL, 'index.html'), html);
// Ohne Jekyll liefert Pages die Dateien unverändert aus.
writeFileSync(join(ZIEL, '.nojekyll'), '');
console.log(`Seite → ${ZIEL.replace(WURZEL + '/', '')}/index.html (Prototyp, Editor, Teile-Werkstatt, 4 Bilder, Schriften)`);
