// Importer für Teilesätze (Abschnitt 7.3): figuren/teilesaetze/<satz>/<archetyp>.svg → lib/teilesaetze/<satz>/<archetyp>.js
// 1. Ebenen nach Namen lesen, Hilfsebenen (hilfe-…) ignorieren.
// 2. Prüfen: alle Teile da, keine fremden Ebenen, keine Transformationen, nur erlaubte Elemente, Farben, Konturen.
// 3. Jedes Teil um seinen Drehpunkt ins lokale System verschieben.
// 4. Gelenkprüfung in Chromium: jedes Gelenk bei −60°, 0°, +60°, +120°; Lücken im Überlappungskreis melden.
// 5. Modul schreiben, dazu ein Bogen mit sechs Testposen je Archetyp.
// 6. Protokoll figuren/import.tsv.
// Der Importer ändert keine Zeichnung; Befunde gehen an Regie zurück.
// Aufruf: node tools/import-teilesatz.js <satz|alle> [--pruefen] [--ohne-bild] [--trotzdem]
//   --pruefen   schreibt nichts, endet mit Fehler, wenn Erzeugtes veraltet ist (Prüflauf)
//   --trotzdem  schreibt auch bei Gelenklücken (Strukturfehler halten immer an)
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gelenke, PRUEFWINKEL } from '../lib/rigs/vorlage-layout.js';
import { gelenkTests, leseXml, pruefeZeichnung, zaehleWeiss, PRUEF } from '../lib/zeichnung.js';

export { leseXml, pruefeZeichnung };

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPEZ = JSON.parse(readFileSync(join(WURZEL, 'figuren/rig-spezifikation.json'), 'utf8'));

// ---------- Gelenkprüfung in Chromium ----------
/**
 * Jedes Gelenk bei −60°, 0°, +60°, +120° in Chromium rendern; gezählt werden weiße Pixel im
 * Überlappungskreis um das Gelenk. Liefert die Liste der Lücken.
 */
export async function pruefeGelenke(teile, name, spez = SPEZ) {
  const { starteBrowser } = await import('../lib/browser.js');
  const { tests, svgs, radius } = gelenkTests(teile, name, spez);
  const browser = await starteBrowser();
  try {
    const seite = await browser.newPage();
    await seite.setContent('<canvas id="c"></canvas>');
    // Die Zählung läuft im Browser; zaehleWeiss wird als Quelltext übergeben, damit beide Seiten dieselbe Regel rechnen.
    const weiss = await seite.evaluate(
      async ({ svgs, pixel, radius, zaehler }) => {
        const zaehle = new Function(`return (${zaehler})`)();
        const c = document.getElementById('c');
        c.width = c.height = pixel;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        const aus = [];
        for (const s of svgs) {
          const bild = new Image();
          bild.src = 'data:image/svg+xml;base64,' + btoa(s);
          await bild.decode();
          ctx.clearRect(0, 0, pixel, pixel);
          ctx.drawImage(bild, 0, 0);
          aus.push(zaehle(ctx.getImageData(0, 0, pixel, pixel).data, pixel, radius));
        }
        return aus;
      },
      { svgs, pixel: PRUEF.pixel, radius, zaehler: zaehleWeiss.toString() },
    );
    return tests.map((t, i) => ({ ...t, weiss: weiss[i] })).filter((t) => t.weiss > PRUEF.toleranz);
  } finally {
    await browser.close();
  }
}

// ---------- Ausgabe ----------
function modulText(satz, name, teile) {
  const zeilen = Object.entries(teile).map(([id, svg]) => `  '${id}': ${JSON.stringify(svg)},`);
  return (
    `// ERZEUGT von tools/import-teilesatz.js aus figuren/teilesaetze/${satz}/${name}.svg. Nicht von Hand ändern.\n` +
    `export const SATZ = '${satz}';\nexport const ARCHETYP = '${name}';\n` +
    `/** Teile im lokalen System, Drehpunkt im Ursprung; Farbschlüssel als Rollen @… */\n` +
    `export const TEILE = {\n${zeilen.join('\n')}\n};\n`
  );
}

function indexText(saetze) {
  const imports = [];
  const eintraege = [];
  let n = 0;
  for (const [satz, archetypen] of saetze) {
    const zeilen = [];
    for (const a of archetypen) {
      const v = `t${n++}`;
      imports.push(`import * as ${v} from './${satz}/${a}.js';`);
      zeilen.push(`    '${a}': ${v},`);
    }
    eintraege.push(`  '${satz}': {\n${zeilen.join('\n')}\n  },`);
  }
  return (
    `// ERZEUGT von tools/import-teilesatz.js: Verzeichnis aller importierten Teilesätze. Nicht von Hand ändern.\n` +
    `${imports.join('\n')}\n\n/** TEILESAETZE[satz][archetyp] = Modul mit TEILE */\nexport const TEILESAETZE = {\n${eintraege.join('\n')}\n};\n`
  );
}

const TSV_KOPF = '# ERZEUGT von tools/import-teilesatz.js. Nicht von Hand ändern.\nsatz\tarchetyp\tpruefpunkt\tstatus\tanmerkung\n';

function vergleicheOderSchreibe(pfad, inhalt, pruefen, meldung) {
  const ziel = join(WURZEL, pfad);
  const alt = existsSync(ziel) ? readFileSync(ziel, 'utf8') : null;
  if (alt === inhalt) return 0;
  if (pruefen) {
    console.error(`FEHLER veraltet: ${pfad} (${meldung})`);
    return 1;
  }
  mkdirSync(dirname(ziel), { recursive: true });
  writeFileSync(ziel, inhalt);
  console.log(`geschrieben: ${pfad}`);
  return 0;
}

async function importiere(satz, { pruefen, ohneBild, trotzdem }) {
  const ordner = join(WURZEL, 'figuren/teilesaetze', satz);
  if (!existsSync(ordner)) throw new Error(`Teilesatz ${satz}: Ordner figuren/teilesaetze/${satz} fehlt`);
  const archetypen = Object.keys(SPEZ.archetypen).filter((a) => existsSync(join(ordner, `${a}.svg`)));
  const fremd = readdirSync(ordner).filter((d) => d.endsWith('.svg') && !archetypen.includes(d.slice(0, -4)));
  if (archetypen.length === 0) throw new Error(`Teilesatz ${satz}: keine Zeichnung (<archetyp>.svg) gefunden`);
  const zeilen = [];
  const zeile = (archetyp, pruefpunkt, status, anmerkung = '') => zeilen.push([satz, archetyp, pruefpunkt, status, anmerkung].join('\t'));
  for (const d of fremd) zeile('-', 'datei', 'fehler', `${d}: kein Archetyp der Spezifikation`);
  let fehler = fremd.length;
  const geschrieben = [];
  for (const a of archetypen) {
    const { befunde, teile, freieFarben } = pruefeZeichnung(readFileSync(join(ordner, `${a}.svg`), 'utf8'), a);
    zeile(a, 'struktur', befunde.length ? 'fehler' : 'ok', `${Object.keys(teile).length} Teile`);
    for (const b of befunde) zeile(a, 'struktur', 'fehler', `${b.teil}: ${b.text}`);
    if (freieFarben.size) zeile(a, 'farben', 'hinweis', `bleiben wie gezeichnet: ${[...freieFarben].sort().join(', ')}`);
    if (befunde.length) {
      fehler += befunde.length;
      continue;
    }
    const luecken = await pruefeGelenke(teile, a);
    zeile(a, 'gelenke', luecken.length ? 'luecke' : 'ok', `${gelenke(SPEZ, a).length} Gelenke × ${PRUEFWINKEL.length} Winkel`);
    for (const l of luecken) zeile(a, 'gelenke', 'luecke', `${l.eltern} → ${l.kind} bei ${l.winkel}°: ${l.weiss} Pixel offen`);
    if (luecken.length && !trotzdem) {
      fehler += luecken.length;
      continue;
    }
    fehler += vergleicheOderSchreibe(`lib/teilesaetze/${satz}/${a}.js`, modulText(satz, a, teile), pruefen, `npm run figuren:import -- ${satz}`);
    geschrieben.push(a);
  }

  // Verzeichnis aller Sätze: vorhandene Module plus die eben geschriebenen.
  const basis = join(WURZEL, 'lib/teilesaetze');
  const saetze = new Map();
  for (const d of existsSync(basis) ? readdirSync(basis, { withFileTypes: true }) : []) {
    if (!d.isDirectory()) continue;
    const vorhanden = Object.keys(SPEZ.archetypen).filter((a) => existsSync(join(basis, d.name, `${a}.js`)) || (d.name === satz && geschrieben.includes(a)));
    if (vorhanden.length) saetze.set(d.name, vorhanden);
  }
  if (!saetze.has(satz) && geschrieben.length) saetze.set(satz, geschrieben);
  const sortiert = [...saetze.entries()].sort(([x], [y]) => x.localeCompare(y));
  fehler += vergleicheOderSchreibe('lib/teilesaetze/index.js', indexText(sortiert), pruefen, `npm run figuren:import -- ${satz}`);

  // Protokoll: Zeilen anderer Sätze bleiben stehen.
  const tsvPfad = join(WURZEL, 'figuren/import.tsv');
  const andere = existsSync(tsvPfad)
    ? readFileSync(tsvPfad, 'utf8').split('\n').filter((z) => z && !z.startsWith('#') && !z.startsWith('satz\t') && !z.startsWith(`${satz}\t`))
    : [];
  const alle = [...andere, ...zeilen].sort((x, y) => x.split('\t')[0].localeCompare(y.split('\t')[0]));
  fehler += vergleicheOderSchreibe('figuren/import.tsv', TSV_KOPF + alle.join('\n') + '\n', pruefen, `npm run figuren:import -- ${satz}`);

  if (!pruefen && !ohneBild && geschrieben.length) {
    execFileSync('node', [join(WURZEL, 'tools/rig-testposen.js'), '--satz', satz, '--ziel', `figuren/teilesaetze/${satz}/testposen.png`], { cwd: WURZEL, stdio: 'inherit' });
  }
  console.log(`${satz}: ${archetypen.length} Zeichnungen, ${geschrieben.length} importiert, ${fehler} Befunde.`);
  return fehler;
}

async function main() {
  const arg = process.argv[2];
  if (!arg || arg.startsWith('--')) {
    console.error('Aufruf: node tools/import-teilesatz.js <satz|alle> [--pruefen] [--ohne-bild] [--trotzdem]');
    process.exit(2);
  }
  const opts = { pruefen: process.argv.includes('--pruefen'), ohneBild: process.argv.includes('--ohne-bild'), trotzdem: process.argv.includes('--trotzdem') };
  const saetze = arg === 'alle' ? readdirSync(join(WURZEL, 'figuren/teilesaetze')).sort() : [arg];
  let fehler = 0;
  for (const s of saetze) fehler += await importiere(s, opts);
  if (fehler) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
