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
import { gelenke, layout, teileVon, PRUEFWINKEL } from './figuren-layout.js';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPEZ = JSON.parse(readFileSync(join(WURZEL, 'figuren/rig-spezifikation.json'), 'utf8'));

// ---------- XML ----------
const ENTITAETEN = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const entschluessle = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (g, e) =>
    e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITAETEN[e] ?? g,
  );
const maske = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** Kleiner XML-Leser für SVG-Exporte: Elemente, Attribute, Text; Kommentare, PI, DOCTYPE werden übersprungen. */
export function leseXml(text) {
  const wurzel = { name: '#dokument', attrs: {}, kinder: [] };
  const stapel = [wurzel];
  let i = 0;
  const fehler = (was) => {
    const zeile = text.slice(0, i).split('\n').length;
    throw new Error(`XML Zeile ${zeile}: ${was}`);
  };
  while (i < text.length) {
    if (text.startsWith('<!--', i)) {
      const e = text.indexOf('-->', i);
      if (e < 0) fehler('Kommentar nicht geschlossen');
      i = e + 3;
    } else if (text.startsWith('<?', i)) {
      const e = text.indexOf('?>', i);
      if (e < 0) fehler('Verarbeitungsanweisung nicht geschlossen');
      i = e + 2;
    } else if (text.startsWith('<![CDATA[', i)) {
      const e = text.indexOf(']]>', i);
      stapel.at(-1).kinder.push({ text: text.slice(i + 9, e) });
      i = e + 3;
    } else if (text.startsWith('<!', i)) {
      let tiefe = 0;
      for (; i < text.length; i++) {
        if (text[i] === '[') tiefe++;
        else if (text[i] === ']') tiefe--;
        else if (text[i] === '>' && tiefe === 0) break;
      }
      i++;
    } else if (text.startsWith('</', i)) {
      const e = text.indexOf('>', i);
      const name = text.slice(i + 2, e).trim();
      const oben = stapel.pop();
      if (!oben || oben.name !== name) fehler(`</${name}> schließt <${oben?.name}>`);
      i = e + 1;
    } else if (text[i] === '<') {
      const m = /^<([A-Za-z_][\w:.-]*)/.exec(text.slice(i, i + 200));
      if (!m) fehler('ungültiger Tag');
      const el = { name: m[1], attrs: {}, kinder: [] };
      i += m[0].length;
      const re = /\s*([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/y;
      for (;;) {
        re.lastIndex = i;
        const a = re.exec(text);
        if (!a) break;
        el.attrs[a[1]] = entschluessle(a[2] ?? a[3]);
        i = re.lastIndex;
      }
      while (/\s/.test(text[i])) i++;
      stapel.at(-1).kinder.push(el);
      if (text.startsWith('/>', i)) i += 2;
      else if (text[i] === '>') {
        stapel.push(el);
        i++;
      } else fehler(`Tag <${el.name}> nicht geschlossen`);
    } else {
      const e = text.indexOf('<', i);
      const t = text.slice(i, e < 0 ? undefined : e);
      if (t.trim()) stapel.at(-1).kinder.push({ text: entschluessle(t) });
      i = e < 0 ? text.length : e;
    }
  }
  if (stapel.length !== 1) throw new Error(`XML: <${stapel.at(-1).name}> nicht geschlossen`);
  return wurzel;
}

// ---------- Prüfung einer Zeichnung ----------
const ZEICHNEND = new Set(['path', 'polygon', 'polyline', 'circle', 'ellipse', 'rect', 'line']);
const STILL = new Set(['title', 'desc']);
const ATTRIBUTE = new Set([
  'd', 'points', 'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2',
  'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'fill-rule',
]);
const METADATEN = /^(id|data-[\w-]+|xml:[\w-]+|inkscape:[\w-]+|sodipodi:[\w-]+)$/;
const SCHLUESSEL = Object.fromEntries(Object.entries(SPEZ.farbschluessel).map(([hex, rolle]) => [hex.toLowerCase(), `@${rolle}`]));
const KONTUREN = new Set([SPEZ.kontur.detail, SPEZ.kontur.teil]);

/** Farbe normalisieren: #rgb → #rrggbb, black/white → Hex; sonst null (nicht erlaubt). */
function farbe(wert) {
  const v = wert.trim().toLowerCase();
  if (v === 'none') return 'none';
  if (v === 'black') return '#000000';
  if (v === 'white') return '#ffffff';
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) return '#' + [...v.slice(1)].map((c) => c + c).join('');
  return null;
}

const ebenenName = (g) => g.attrs['inkscape:label'] ?? g.attrs['data-name'] ?? g.attrs.id ?? '';

/**
 * Zeichnung prüfen und Teile ins lokale System bringen.
 * Liefert { befunde: [{ teil, text }], teile: { id: svg }, freieFarben: Set }.
 */
export function pruefeZeichnung(text, name, spez = SPEZ) {
  const befunde = [];
  const befund = (teil, t) => befunde.push({ teil, text: t });
  const freieFarben = new Set();
  let doc;
  try {
    doc = leseXml(text);
  } catch (e) {
    return { befunde: [{ teil: '-', text: e.message }], teile: {}, freieFarben };
  }
  const svg = doc.kinder.find((k) => k.name === 'svg');
  if (!svg) return { befunde: [{ teil: '-', text: 'kein <svg>-Element' }], teile: {}, freieFarben };
  if (svg.attrs.transform) befund('-', 'transform auf <svg>');
  const soll = teileVon(spez, name);
  const L = layout(spez, name);
  const gefunden = new Map();
  for (const k of svg.kinder) {
    if (k.text !== undefined || STILL.has(k.name) || k.name === 'metadata' || k.name === 'sodipodi:namedview') continue;
    if (k.name === 'defs') {
      if (k.kinder.some((d) => d.name)) befund('-', '<defs> mit Inhalt (Verläufe, Muster, Masken sind nicht erlaubt)');
      continue;
    }
    if (k.name !== 'g') {
      befund('-', `<${k.name}> außerhalb einer Ebene`);
      continue;
    }
    const n = ebenenName(k);
    if (n.startsWith('hilfe')) continue;
    if (!soll.includes(n)) befund(n || '-', `fremde Ebene „${n}“ (erlaubt: Teile des Archetyps und hilfe-…)`);
    else if (gefunden.has(n)) befund(n, 'Ebene doppelt');
    else gefunden.set(n, k);
  }

  function serialisiere(el, teil, geerbt) {
    if (el.text !== undefined) {
      befund(teil, 'Text in einem Teil (Text setzt immer der Code)');
      return '';
    }
    if (STILL.has(el.name)) return '';
    if (el.name !== 'g' && !ZEICHNEND.has(el.name)) {
      befund(teil, `<${el.name}> ist nicht erlaubt`);
      return '';
    }
    const a = el.attrs;
    if (a.transform) befund(teil, `transform an <${el.name}> (Teile ohne Skalierung oder Drehung exportieren)`);
    if (a.style || a.class) befund(teil, `style/class an <${el.name}>: Präsentationsattribute verwenden`);
    if (a.display === 'none' || a.visibility === 'hidden') befund(teil, `verborgenes <${el.name}>`);
    for (const k of ['opacity', 'fill-opacity', 'stroke-opacity', 'filter', 'mask', 'clip-path']) {
      if (a[k] !== undefined) befund(teil, `${k} an <${el.name}> ist nicht erlaubt`);
    }
    if (el.name === 'rect' && (a.rx || a.ry)) befund(teil, 'Eckradius an <rect> (als Pfad zeichnen)');
    const eigen = { ...geerbt };
    const aus = [];
    for (const [k, v] of Object.entries(a)) {
      if (METADATEN.test(k) || ['transform', 'style', 'class', 'display', 'visibility'].includes(k)) continue;
      if (!ATTRIBUTE.has(k)) {
        if (!['opacity', 'fill-opacity', 'stroke-opacity', 'filter', 'mask', 'clip-path'].includes(k)) befund(teil, `Attribut ${k} an <${el.name}> ist nicht erlaubt`);
        continue;
      }
      if (v.includes('url(')) {
        befund(teil, `${k}="${v}": Verweise (Verläufe, Muster) sind nicht erlaubt`);
        continue;
      }
      let wert = v;
      if (k === 'fill' || k === 'stroke') {
        const f = farbe(v);
        if (!f) {
          befund(teil, `${k}="${v}" ist keine erlaubte Farbe (Hex, black, white, none)`);
          continue;
        }
        eigen[k] = f;
        if (SCHLUESSEL[f]) wert = SCHLUESSEL[f];
        else {
          if (f !== 'none' && f !== '#000000' && f !== '#ffffff') freieFarben.add(f);
          wert = f;
        }
      }
      if (k === 'stroke-width') eigen.strich = Number(v);
      aus.push(`${k}="${maske(wert)}"`);
    }
    if (ZEICHNEND.has(el.name) && eigen.stroke && eigen.stroke !== 'none' && !KONTUREN.has(eigen.strich ?? 1)) {
      befund(teil, `Kontur ${eigen.strich ?? 1} px an <${el.name}> (erlaubt: ${[...KONTUREN].join(' oder ')} px)`);
    }
    const innen = el.kinder.map((c) => serialisiere(c, teil, eigen)).join('');
    const kopf = `<${el.name}${aus.length ? ' ' + aus.join(' ') : ''}`;
    return el.name === 'g' ? `${kopf}>${innen}</g>` : `${kopf}/>`;
  }

  const teile = {};
  for (const t of soll) {
    const g = gefunden.get(t);
    if (!g) {
      befund(t, 'Teil fehlt');
      continue;
    }
    if (g.attrs.transform) befund(t, 'transform auf der Ebene');
    const geerbt = {};
    for (const k of ['fill', 'stroke']) if (g.attrs[k]) geerbt[k] = farbe(g.attrs[k]);
    if (g.attrs['stroke-width']) geerbt.strich = Number(g.attrs['stroke-width']);
    const innen = g.kinder.map((c) => serialisiere(c, t, geerbt)).join('');
    if (!/<(path|polygon|polyline|circle|ellipse|rect|line)\b/.test(innen)) {
      befund(t, 'Ebene ohne Zeichnung');
      continue;
    }
    const p = L.drehpunkte[t];
    const ebenenAttr = ['fill', 'stroke', 'stroke-width']
      .filter((k) => g.attrs[k])
      .map((k) => ` ${k}="${maske(k === 'stroke-width' ? g.attrs[k] : SCHLUESSEL[farbe(g.attrs[k])] ?? farbe(g.attrs[k]))}"`)
      .join('');
    teile[t] = `<g transform="translate(${-p.x} ${-p.y})"${ebenenAttr}>${innen}</g>`;
  }
  return { befunde, teile, freieFarben };
}

// ---------- Gelenkprüfung ----------
const PRUEF = { halbbreite: 20, pixel: 160, toleranz: 2 };

/** Alle Füllungen und Konturen schwarz: geprüft wird Deckung, nicht Farbe. */
const schwarz = (s) => s.replace(/(fill|stroke)="(?!none")[^"]*"/g, '$1="#000000"');

/**
 * Jedes Gelenk bei −60°, 0°, +60°, +120° in Chromium rendern; gezählt werden weiße Pixel im
 * Überlappungskreis um das Gelenk. Liefert die Liste der Lücken.
 */
export async function pruefeGelenke(teile, name, spez = SPEZ) {
  const { starteBrowser } = await import('../lib/browser.js');
  const tests = [];
  for (const g of gelenke(spez, name)) {
    if (!teile[g.eltern] || !teile[g.kind]) continue;
    for (const winkel of PRUEFWINKEL) tests.push({ ...g, winkel });
  }
  const H = PRUEF.halbbreite;
  const svgs = tests.map(({ eltern, kind, punkt: { x, y }, winkel }) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PRUEF.pixel}" height="${PRUEF.pixel}" viewBox="${x - H} ${y - H} ${2 * H} ${2 * H}">` +
    `<rect x="${x - H}" y="${y - H}" width="${2 * H}" height="${2 * H}" fill="#ffffff"/>` +
    `${schwarz(teile[eltern])}<g transform="translate(${x} ${y}) rotate(${winkel})">${schwarz(teile[kind])}</g></svg>`,
  );
  const radius = ((spez.gelenk_ueberlappung / 2) * PRUEF.pixel) / (2 * H);
  const browser = await starteBrowser();
  try {
    const seite = await browser.newPage();
    await seite.setContent('<canvas id="c"></canvas>');
    const weiss = await seite.evaluate(
      async ({ svgs, pixel, radius }) => {
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
          const d = ctx.getImageData(0, 0, pixel, pixel).data;
          let n = 0;
          const m = pixel / 2;
          for (let y = 0; y < pixel; y++) {
            for (let x = 0; x < pixel; x++) {
              if ((x + 0.5 - m) ** 2 + (y + 0.5 - m) ** 2 > radius ** 2) continue;
              const i = (y * pixel + x) * 4;
              if (d[i] + d[i + 1] + d[i + 2] > 3 * 128) n++;
            }
          }
          aus.push(n);
        }
        return aus;
      },
      { svgs, pixel: PRUEF.pixel, radius },
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
