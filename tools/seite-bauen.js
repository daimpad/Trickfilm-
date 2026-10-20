// Baut die Webseite der Werkstatt nach out/seite/ (für GitHub Pages).
// Setzt in site/index.html ein, was sonst veralten würde: Tokens, Palette, alle Befehle aus package.json,
// den Stand der Phasen aus der README, Bilder, den Prototyp der Vorlage und den Posen-Editor.
// Hält an, wenn ein Befehl keine Beschreibung hat, ein Platzhalter offen bleibt oder ein Link ins Leere zeigt.
// Aufruf: node tools/seite-bauen.js [--ziel out/seite]
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FARBEN, ROLLEN, SCHRIFT, kontrast } from '../tokens/tokens.js';
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
  requisiten: 'Katalog aller Requisiten als Bild',
  'figuren:erzeugen': 'Spezifikationsmodul, Zeichenvorlagen und satz-00 aus der Rig-Spezifikation',
  'figuren:testposen': 'sechs Testposen je Archetyp als Bild',
  'figuren:vorlagen': 'Zeichenvorlagen erzeugen und als Übersicht zeigen',
  'figuren:import': 'Teilesatz prüfen, Gelenke testen und einlesen: <code>-- satz-01</code>',
  'sfx:cues': 'Geräusch-Cues einer Szene aus ihrer Bewegung',
  'sfx:messen': 'Geräusche messen (Lautheit, Spitzenpegel)',
  'sfx:normalisieren': 'Geräusche schneiden und normalisieren',
  'sfx:hoerprobe': 'Hörprobe aller Varianten zum Auswählen',
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

function skripte() {
  const pkg = JSON.parse(readFileSync(join(WURZEL, 'package.json'), 'utf8'));
  const fehlend = Object.keys(pkg.scripts).filter((k) => !BESCHREIBUNG[k]);
  if (fehlend.length) throw new Error(`Seite: Befehle ohne Beschreibung in tools/seite-bauen.js: ${fehlend.join(', ')}`);
  return Object.entries(pkg.scripts)
    .map(([name, befehl]) => {
      const phase = /noch-nicht\.js (\d+)/.exec(befehl)?.[1];
      const stand = phase ? `kommt mit Phase ${phase}` : '<span class="stand-fertig">bereit</span>';
      return `<tr><td><code>${maske(name)}</code></td><td>${BESCHREIBUNG[name]}</td><td>${stand}</td></tr>`;
    })
    .join('');
}

function stand() {
  const readme = readFileSync(join(WURZEL, 'README.md'), 'utf8');
  const zeilen = [...readme.matchAll(/^\| (\d+) \| (.+?) \| (.+?) \|$/gm)];
  if (zeilen.length === 0) throw new Error('Seite: keine Phasentabelle in README.md gefunden');
  return zeilen
    .map(([, nr, inhalt, st]) => {
      const text = maske(inhalt).replace(/`([^`]+)`/g, '<code>$1</code>');
      const s = st.startsWith('fertig') ? `<span class="stand-fertig">${maske(st)}</span>` : maske(st);
      return `<tr><td>${nr}</td><td>${text}</td><td>${s}</td></tr>`;
    })
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

function erstellt() {
  let sha = 'unbekannt';
  try {
    sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: WURZEL, encoding: 'utf8' }).trim();
  } catch {
    /* ohne Git bleibt die Kennung unbekannt, und die Seite sagt es */
  }
  return `${new Date().toISOString().slice(0, 10)}, Commit ${sha}`;
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

// 3. Bilder aus dem Repository.
kopiere('lib/props/KATALOG.png', 'bilder/requisiten.png');
kopiere('figuren/teilesaetze/satz-00/testposen.png', 'bilder/testposen.png');
kopiere('figuren/vorlagen.png', 'bilder/vorlagen.png');

// 4. Seite aus der Vorlage.
const css = [
  `--grund: ${FARBEN.primaerHell}`,
  `--weiss: ${FARBEN.weiss}`,
  `--text: ${ROLLEN.text}`,
  `--kontur: ${ROLLEN.kontur}`,
  `--link: ${FARBEN.petrol}`,
  `--linie: ${FARBEN.primaerDunkel}`,
  `--flaeche: ${FARBEN.primaerHell}`,
  `--schrift: ${SCHRIFT.familie}`,
].join('; ') + ';';
const ersetzungen = { TOKENS_CSS: css, PALETTE: palette(), SKRIPTE: skripte(), STAND: stand(), ERSTELLT: erstellt() };
const html = readFileSync(join(WURZEL, 'site/index.html'), 'utf8').replace(/\{\{([A-Z_]+)\}\}/g, (ganz, k) => {
  if (!(k in ersetzungen)) throw new Error(`Seite: Platzhalter {{${k}}} unbekannt`);
  return ersetzungen[k];
});

// 5. Jeder relative Link und jedes Bild muss existieren.
const fehlend = [...html.matchAll(/\s(?:href|src)="([^"#:]+?)"/g)]
  .map((m) => m[1])
  .filter((p) => !existsSync(join(ZIEL, p.endsWith('/') ? `${p}index.html` : p)));
if (fehlend.length) throw new Error(`Seite: Links ins Leere: ${fehlend.join(', ')}`);

writeFileSync(join(ZIEL, 'index.html'), html);
// Ohne Jekyll liefert Pages die Dateien unverändert aus.
writeFileSync(join(ZIEL, '.nojekyll'), '');
console.log(`Seite → ${ZIEL.replace(WURZEL + '/', '')}/index.html (Prototyp, Editor, 4 Bilder)`);
