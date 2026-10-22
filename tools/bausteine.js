// Nachschlageseite der Bausteine (docs/BAUSTEINE.md), erzeugt aus der Bibliothek selbst: Requisiten mit Bezugspunkt,
// Größe, Ankern und beweglichen Teilen; Figuren mit Gelenken; Geräusche mit Ereignistypen und vorhandenem Klang;
// erlaubte Werte im Brief; Funktionen der Bibliothek mit Signatur. Nie von Hand ändern.
// Aufruf: npm run bausteine [-- --pruefen]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REQUISITEN, requisite } from '../lib/props/index.js';
import { RIGS } from '../lib/rigs/index.js';
import { ERKENNUNG } from '../lib/events.js';
import { leseKatalog } from '../lib/sfx/katalog.js';
import { SFX, finalPfad } from '../lib/sfx/ablage.js';
import { GEFUEHLE, HALTUNGEN } from '../lib/spielweise.js';
import { AUSDRUECKE } from '../lib/mimik.js';
import { SPEZ } from '../lib/rigs/spezifikation.js';

const WURZEL = join(import.meta.dirname, '..');
const ZIEL = join(WURZEL, 'docs', 'BAUSTEINE.md');
const zelle = (t) => String(t).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const zahl = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/** Erster Satz des JSDoc vor einer exportierten Konstante oder Funktion in einer Datei. */
function jsdoc(datei) {
  const text = readFileSync(join(WURZEL, datei), 'utf8');
  const aus = new Map();
  for (const m of text.matchAll(/\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*export (?:const|function) (\w+)\s*(=\s*\(([^)]*)\)|\(([^)]*)\))?/g)) {
    const doc = m[1].split('\n').map((z) => z.replace(/^\s*\*\s?/, '')).join(' ').trim();
    aus.set(m[2], { doc, params: (m[4] ?? m[5] ?? '').replace(/\s+/g, ' ').trim() });
  }
  return aus;
}

function requisiten() {
  const docs = new Map();
  for (const datei of ['moebel', 'geraete', 'buero', 'aussen', 'zeichen']) for (const [k, v] of jsdoc(`lib/props/${datei}.js`)) docs.set(k, v.doc);
  const zeilen = Object.keys(REQUISITEN)
    .sort()
    .map((name) => {
      const r = requisite(name);
      const svg = r.markup('X', { x: 0, y: 0 }, {});
      const teile = [...svg.matchAll(/<g id="(X-[^"]+)"([^>]*)>/g)].map((m) => `${m[1].replace(/^X/, '<id>')} (${[...m[2].matchAll(/\s([\w-]+)="/g)].map((a) => a[1]).join(', ')})`);
      const f = r.rahmen();
      const anker = Object.keys(r.anker({ x: 0, y: 0 }));
      return `| \`${name}\` | ${REQUISITEN[name].gruppe} | ${zelle(docs.get(name) ?? '')} | ${zahl(f.x1 - f.x0)} × ${zahl(f.y1 - f.y0)} | ${teile.join('; ') || '–'} | ${anker.join(', ') || '–'} |`;
    });
  return [
    '## Requisiten',
    '',
    'Im Code `requisite(name).markup(id, pos, farben, opts)`; `pos` ist der Bezugspunkt in Weltkoordinaten (Beschreibung). `opts.massstab` skaliert um den Bezugspunkt, Anker und Rahmen rechnen mit. Bewegliche Teile setzt `sceneApply` über ihre ID und das genannte Attribut; ihre Koordinaten gelten im Rahmen der Requisite. Größe aus `rahmen()` bei Maßstab 1, in px.',
    '',
    '| Name | Gruppe | Beschreibung, Bezugspunkt | Größe | bewegliche Teile (Attribute) | Anker |',
    '|---|---|---|---|---|---|',
    ...zeilen,
  ];
}

function figuren() {
  const zeilen = Object.entries(RIGS).map(([name, r]) => {
    const g = Object.keys(r.gelenke(r.defaults));
    return `| \`${name}\` | ${r.ansicht} | ${r.spez.massstab ?? 1} | ${Object.entries(r.spez.segmente).map(([k, v]) => `${k} ${v}`).join(', ')} | ${g.join(', ')} | ${r.posen ? Object.keys(r.posen).join(', ') : '–'} |`;
  });
  return [
    '## Figuren',
    '',
    `Funktionen jedes Rigs: \`markup(prefix, { teilesatz, palette, dir, massstab, mimik })\`, \`apply(prefix, zustand)\`, \`gelenke(zustand)\` (Weltpunkte), \`greife(zustand, arm, ziel)\`, \`fuss(zustand, bein, ziel)\`, \`pruefeReichweite(zustand)\`. \`kopf\` ist die Kopfmitte. Handformen: ${SPEZ.handformen.join(', ')}. Einzelheiten in \`docs/FIGUREN.md\`.`,
    '',
    '| Archetyp | Ansicht | Maßstab | Segmente (px) | Punkte in gelenke() | Posen |',
    '|---|---|---|---|---|---|',
    ...zeilen,
  ];
}

function geraeusche() {
  const katalog = leseKatalog();
  const klang = (c) => {
    if ((c.varianten_vorrat ?? 1) > 1) {
      let n = 0;
      while (existsSync(join(SFX, 'final', c.id, `${String(n + 1).padStart(2, '0')}.wav`))) n++;
      return n ? `${n} Varianten` : 'fehlt';
    }
    return existsSync(finalPfad(SFX, c.id)) ? 'ja' : 'fehlt';
  };
  const zeilen = katalog
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((c) => `| \`${c.id}\` | ${c.art} | ${(c.ereignisse ?? []).join(', ') || (c.art === 'laut' ? 'Laut (Beat)' : '–')} | ${c.dauer_s ?? ''} | ${c.gain_db ?? ''} | ${['einzel', 'nachklang', 'loop'].filter((k) => c[k]).join(', ') || '–'} | ${klang(c)} |`);
  const vorhanden = zeilen.filter((z) => !z.endsWith('| fehlt |')).length;
  return [
    '## Geräusche',
    '',
    `${katalog.length} Cues im Katalog, ${vorhanden} mit fertigem Klang in \`lib/sfx/final/\`. Im Brief unter \`sfx.ereignisse\` ordnet ein Ereignistyp einen Cue zu; erlaubt sind die Typen in der Spalte „Ereignisse“. Laute setzt der Brief unter \`sfx.laute\` an einen Beat. Einzelheiten in \`docs/GERAEUSCHE.md\`.`,
    '',
    '| Cue | Art | Ereignisse | Dauer (s) | Pegel (dB) | Eigenschaften | Klang |',
    '|---|---|---|---|---|---|---|',
    ...zeilen,
    '',
    '### Ereignistypen',
    '',
    '| Typ | Erkennung |',
    '|---|---|',
    ...Object.entries(ERKENNUNG).map(([t, e]) => `| \`${t}\` | ${e} |`),
  ];
}

function briefwerte() {
  return [
    '## Erlaubte Werte im Brief',
    '',
    `- \`charakter.haltung\`: ${Object.keys(HALTUNGEN).map((h) => `\`${h}\``).join(', ')} oder \`null\``,
    `- \`gefuehlsbogen\` einer Figur und \`gefuehl\` eines Beats: ${GEFUEHLE.map((g) => `\`${g}\``).join(', ')}`,
    `- \`mimik\` einer Figur: \`an\` oder \`aus\`; Ausdrücke der Mimik: ${Object.keys(AUSDRUECKE).map((a) => `\`${a}\``).join(', ')}`,
    '- `sichtung.<punkt>`: `ok` oder `offen`',
    '- `blick`: `rechts` oder `links`; der Film heißt in der ID groß, in Dateinamen klein',
  ];
}

function funktionen() {
  const dateien = ['lib/easing.js', 'lib/motion.js', 'lib/spielweise.js', 'lib/posen.js', 'lib/mimik.js', 'lib/svg.js'];
  const aus = ['## Funktionen der Bibliothek', '', 'Signatur und erster Satz des Kommentars; Zeit `t` in Sekunden, Winkel in Grad, Koordinaten in px.', ''];
  for (const d of dateien) {
    // Auch Exporte ohne eigenen Kommentar (etwa die Kurven) stehen in der Tabelle, mit ihrer Signatur.
    const doc = jsdoc(d);
    const quelle = readFileSync(join(WURZEL, d), 'utf8');
    const eintraege = [...quelle.matchAll(/^export (?:const|function) (\w+)\s*(?:=\s*(?:\(([^)]*)\)|([\w]+)\s*=>)|\(([^)]*)\))?/gm)].map((m) => [m[1], doc.get(m[1]) ?? { doc: '', params: (m[2] ?? m[3] ?? m[4] ?? '').replace(/\s+/g, ' ').trim() }]);
    aus.push(`### \`${d}\``, '', '| Name | Parameter | Zweck |', '|---|---|---|');
    for (const [name, v] of eintraege) aus.push(`| \`${name}\` | ${v.params ? `\`${zelle(v.params)}\`` : '–'} | ${zelle(v.doc.split(/(?<=\.)\s/)[0])} |`);
    aus.push('');
  }
  return aus;
}

const text = [
  '<!-- ERZEUGT von tools/bausteine.js aus der Bibliothek; nicht von Hand ändern (npm run bausteine) -->',
  '# Bausteine',
  '',
  'Was die Werkstatt an Requisiten, Figuren, Geräuschen und Funktionen anbietet, aus dem Code erzeugt. Ein Bild aller Requisiten: `npm run requisiten` → `lib/props/KATALOG.png`. Beispiele im Zusammenspiel: `szenen/DEMO-01-buero`, `szenen/MIMIK-01-buero`.',
  '',
  ...requisiten(),
  '',
  ...figuren(),
  '',
  ...geraeusche(),
  '',
  ...briefwerte(),
  '',
  ...funktionen(),
].join('\n').replace(/\n+$/, '') + '\n';

if (process.argv.includes('--pruefen')) {
  if ((existsSync(ZIEL) ? readFileSync(ZIEL, 'utf8') : '') !== text) {
    console.error('FEHLER docs/BAUSTEINE.md ist veraltet (npm run bausteine)');
    process.exit(1);
  }
  console.log('docs/BAUSTEINE.md aktuell');
} else {
  writeFileSync(ZIEL, text);
  console.log(`docs/BAUSTEINE.md: ${Object.keys(REQUISITEN).length} Requisiten, ${Object.keys(RIGS).length} Archetypen, ${leseKatalog().length} Cues`);
}
