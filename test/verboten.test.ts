// Prüft die Verbotsprüfung selbst: Verbotenes wird gefunden, Erlaubtes nicht.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pruefeDatei } from '../tools/pruefen-verboten.ts';

const regeln = (pfad: string, inhalt: string) => pruefeDatei(pfad, inhalt).map((b) => b.regel);

test('Geheimnisse werden überall gefunden', () => {
  const schluessel = 'sk_' + 'a1'.repeat(24);
  assert.deepEqual(regeln('docs/notiz.md', `ELEVENLABS_API_KEY=${schluessel}`), ['Geheimnis: ElevenLabs-Schlüssel']);
  assert.deepEqual(regeln('.env', ''), ['Geheimnis: .env-Datei']);
  assert.deepEqual(regeln('ton/.env.local', ''), ['Geheimnis: .env-Datei']);
  assert.deepEqual(regeln('tools/stimme.ts', 'const k = process.env.ELEVENLABS_API_KEY;'), []);
});

test('Zeitgeber und Zufall im Render werden gefunden, in Werkzeugen nicht', () => {
  assert.deepEqual(regeln('lib/motion.js', 'const r = Math.random();'), ['Zufall ohne Seed']);
  assert.deepEqual(regeln('szenen/X/animation.js', 'const t = Date.now();'), ['Uhrzeit im Bild']);
  assert.deepEqual(regeln('tools/stimme.ts', 'const datum = new Date();'), []);
  assert.deepEqual(regeln('lib/x.css', '@keyframes drehen { }'), ['CSS-Animation']);
  assert.deepEqual(regeln('lib/x.js', "import { gsap } from 'gsap';"), ['verbotene Bibliothek']);
});

test('Farbliterale nur in den Tokens und in erzeugten Dateien', () => {
  assert.deepEqual(regeln('lib/svg.js', "const f = '#B23A2B';"), ['Farbliteral außerhalb der Tokens']);
  assert.deepEqual(regeln('tokens/tokens.js', "rot: '#B23A2B',"), []);
  assert.deepEqual(regeln('szenen/X/dist/index.html', 'fill="#B23A2B"'), []);
  assert.deepEqual(regeln('lib/svg.js', 'const anker = "seite.html#abschnitt";'), []);
  // Leser fremder Zeichnungen kennen Schwarz, Weiß und CSS-Farbnamen als Formatkonstanten.
  assert.deepEqual(regeln('lib/svgpfad.js', "white: '#ffffff',"), []);
  assert.deepEqual(regeln('lib/svgpfad.js', "await fetch('x');"), ['Netzaufruf im Render']);
});

test('Netzaufrufe im Render werden gefunden, der SVG-Namensraum nicht', () => {
  assert.deepEqual(regeln('lib/stage.js', "await fetch('x');"), ['Netzaufruf im Render']);
  assert.deepEqual(regeln('lib/stage.js', 'const u = "https://example.org/a.png";'), ['Netzaufruf im Render']);
  assert.deepEqual(regeln('lib/stage.js', 'const ns = "http://www.w3.org/2000/svg";'), []);
  assert.deepEqual(regeln('lib/teile.js', 'xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"'), []);
  assert.deepEqual(regeln('lib/teile.js', 'const u = "https://www.inkscape.org/release/";'), ['Netzaufruf im Render']);
  assert.deepEqual(regeln('lib/viewer.template.html', '<link href="https://fonts.googleapis.com/css">'), [
    'Webfont aus dem Netz',
    'Netzaufruf im Render',
  ]);
});

test('eigene Schriften nur auf der Webseite, aus dem Netz nirgends', () => {
  const eigene = '@font-face { src: url(schriften/inter.woff2); }';
  assert.deepEqual(regeln('site/index.html', eigene), []);
  assert.deepEqual(regeln('lib/viewer.template.html', eigene), ['Webfont']);
  assert.deepEqual(regeln('site/index.html', '<link href="https://fonts.gstatic.com/s/inter.woff2">'), ['Webfont aus dem Netz']);
});

test('Abstände außerhalb des Rasters werden in Bibliothek und Szenen gefunden', () => {
  assert.deepEqual(regeln('szenen/X/geometry.js', 'const GEO = { abstand: 20 };'), ['Abstand außerhalb des Rasters (8, 16, 24, 32, 48, 64, 96, 128)']);
  assert.deepEqual(regeln('szenen/X/geometry.js', 'const GEO = { abstand: 24, randLinks: 128 };'), []);
  assert.deepEqual(regeln('tools/katalog.js', 'const abstand: 20'), []);
});

test('erzeugte Dateien sind von der Farbregel ausgenommen, Geheimnisse nicht', () => {
  assert.deepEqual(regeln('lib/rigs/spezifikation.js', "// ERZEUGT von tools/x.js\nconst f = '#ff00ff';"), []);
  assert.deepEqual(regeln('lib/rigs/basis.js', "const f = '#ff00ff';"), ['Farbliteral außerhalb der Tokens']);
});
