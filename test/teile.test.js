// Teile-Werkstatt: SVG beliebiger Herkunft lesen, einpassen, ableiten, zur Zeichnung setzen, die der Importer annimmt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { lesePfad, leseTeilSvg, rahmenVon, wende } from '../lib/svgpfad.js';
import { einpassen, endPunkt, matrixVon, neuesTeil, teilAusDateiname, verschiebe, wirksameTeile, zeichnung, zieheEnde, zielStrecke } from '../lib/teile.js';
import { pruefeZeichnung } from '../lib/zeichnung.js';
import { pruefeGelenke } from '../tools/import-teilesatz.js';
import { zip, crc32 } from '../lib/zip.js';

const nahe = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

test('Pfadleser: relative Befehle, H/V, S/T, kompakte Bogen-Flags, implizites L', () => {
  const s = lesePfad('m10 10 20 0 h10 v10 s5 5 10 0 t10 0 a5 5 0 0110 0 z');
  assert.equal(s[0].typ, 'M');
  assert.deepEqual([s[1].typ, s[1].x, s[1].y], ['L', 30, 10]);
  assert.deepEqual([s[2].x, s[2].y], [40, 10]);
  assert.deepEqual([s[3].x, s[3].y], [40, 20]);
  const z = s.at(-1);
  assert.equal(z.typ, 'Z');
  const vorZ = s.at(-2);
  assert.ok(nahe(vorZ.x, 70) && nahe(vorZ.y, 20), JSON.stringify(vorZ));
  assert.throws(() => lesePfad('M0 0 X1 1'), /unbekannter Befehl/);
});

test('Bögen werden genau zu Bézierkurven (Kreis mit Radius 50)', () => {
  const s = lesePfad('M0 50 A50 50 0 1 0 100 50 A50 50 0 1 0 0 50 Z');
  for (const seg of s.filter((x) => x.typ === 'C')) {
    const t = 0.5;
    const p = (a, b, c, d) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;
    const i = s.indexOf(seg);
    const v = s[i - 1];
    const x = p(v.x, seg.x1, seg.x2, seg.x);
    const y = p(v.y, seg.y1, seg.y2, seg.y);
    assert.ok(Math.abs(Math.hypot(x - 50, y - 50) - 50) < 0.05, `Abstand ${Math.hypot(x - 50, y - 50)}`);
  }
});

test('Illustrator-artiger Export: CSS-Klassen, Gruppen-Transformationen, Grundformen, Hinweise', () => {
  const svg = `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <defs><style>.cls-1{fill:#ff00ff;stroke:#000;stroke-width:2px}.cls-2{fill:rgb(255,255,255)}</style>
    <linearGradient id="v"><stop offset="0" stop-color="#123456"/></linearGradient></defs>
    <g transform="translate(100 0) scale(2)"><rect class="cls-1" x="0" y="0" width="10" height="40"/></g>
    <circle class="cls-2" cx="20" cy="20" r="10" style="stroke:#000000;stroke-width:3"/>
    <ellipse cx="5" cy="5" rx="4" ry="2" fill="url(#v)"/>
    <polygon points="0,0 10,0 10,10" fill="black" opacity="0.5"/>
    <text x="0" y="0">A</text></svg>`;
  const { formen, hinweise } = leseTeilSvg(svg);
  assert.equal(formen.length, 4);
  const rechteck = formen[0];
  assert.equal(rechteck.fill, '#ff00ff');
  assert.equal(rechteck.stroke, '#000000');
  assert.equal(rechteck.strich, 4, 'Strich wächst mit dem Maßstab 2');
  const r = rahmenVon([rechteck]);
  assert.deepEqual([r.x0, r.y0, r.x1, r.y1], [100, 0, 120, 80]);
  assert.equal(formen[1].fill, '#ffffff');
  assert.equal(formen[2].fill, '#123456');
  assert.ok(hinweise.some((h) => h.includes('Verlauf')));
  assert.ok(hinweise.some((h) => h.includes('Text')));
  assert.ok(hinweise.some((h) => h.includes('Deckkraft')));
});

const kapsel = (x, y, b, h, farbe = '#ff00ff') =>
  `<svg xmlns="http://www.w3.org/2000/svg"><rect x="${x}" y="${y}" width="${b}" height="${h}" rx="${b / 2}" fill="${farbe}" stroke="#000" stroke-width="1"/></svg>`;

test('Einpassen legt die Achse genau auf die Zielstrecke, senkrecht und waagerecht gezeichnet', () => {
  for (const [svg, wie] of [[kapsel(300, 50, 40, 400), 'senkrecht'], [kapsel(20, 20, 300, 30), 'waagerecht']]) {
    const t = neuesTeil('armF-upper', leseTeilSvg(svg).formen);
    const m = matrixVon(t.lage);
    const { A, B } = zielStrecke('armF-upper');
    const [ax, ay] = wende(m, t.achse.a.x, t.achse.a.y);
    const [bx, by] = wende(m, t.achse.b.x, t.achse.b.y);
    assert.ok(nahe(ax, A.x) && nahe(ay, A.y) && nahe(bx, B.x) && nahe(by, B.y), `${wie}: ${ax},${ay} → ${bx},${by}`);
  }
});

test('Griffe: Ende ziehen dreht und skaliert um den Drehpunkt, auch gespiegelt; Verschieben folgt der Maus', () => {
  for (const flip of [false, true]) {
    const t = neuesTeil('legF-lower', leseTeilSvg(kapsel(0, 0, 30, 200)).formen);
    t.lage = { ...t.lage, flip };
    const q = { x: 40, y: 80 };
    t.lage = zieheEnde(t, q);
    const e = endPunkt(t);
    assert.ok(nahe(e.x, q.x, 1e-6) && nahe(e.y, q.y, 1e-6), `flip ${flip}: ${JSON.stringify(e)}`);
    const vorher = endPunkt(t);
    t.lage = verschiebe(t, 5, -3);
    const nachher = endPunkt(t);
    assert.ok(nahe(nachher.x - vorher.x, 5) && nahe(nachher.y - vorher.y, -3));
  }
});

/** Grobe Einzelteile für die vordere Seite im Profil. */
function profilTeile() {
  const t = {};
  const lade = (id, svg) => (t[id] = neuesTeil(id, leseTeilSvg(svg).formen, `${id}.svg`));
  lade('torso', `<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="60" height="150" fill="#ff00ff" stroke="#000" stroke-width="6"/></svg>`);
  lade('head', `<svg xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="40" r="38" fill="#f0d0b0" stroke="#000" stroke-width="6"/></svg>`);
  lade('armF-upper', kapsel(0, 0, 24, 114));
  lade('armF-lower', kapsel(0, 0, 22, 112));
  lade('armF-hand-offen', `<svg xmlns="http://www.w3.org/2000/svg"><ellipse cx="10" cy="13" rx="10" ry="13" fill="#f0d0b0" stroke="#000" stroke-width="4"/></svg>`);
  lade('legF-upper', kapsel(0, 0, 34, 136, '#ffff00'));
  lade('legF-lower', kapsel(0, 0, 30, 128, '#ffff00'));
  lade('legF-foot', `<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="46" height="18" fill="#000" stroke="#000" stroke-width="4"/></svg>`);
  return t;
}

test('Ableiten: hintere Glieder und Handvarianten aus der vorderen Seite, frontal gespiegelt', () => {
  const { formen, herkunft } = wirksameTeile(profilTeile(), 'profil');
  assert.match(herkunft['armB-upper'], /abgeleitet von armF-upper/);
  assert.match(herkunft['armF-hand-zeigend'], /abgeleitet von armF-hand-offen/);
  assert.match(herkunft['armB-hand-greifend'], /abgeleitet/);
  assert.ok(Object.values(formen).every(Boolean));
  const frontal = { 'armL-upper': neuesTeil('armL-upper', leseTeilSvg(kapsel(0, 0, 24, 114)).formen) };
  frontal['armL-upper'].lage = { ...frontal['armL-upper'].lage, tx: frontal['armL-upper'].lage.tx + 10 };
  const w = wirksameTeile(frontal, 'frontal');
  const l = rahmenVon(w.formen['armL-upper']);
  const r = rahmenVon(w.formen['armR-upper']);
  assert.ok(nahe(l.x0, -r.x1) && nahe(l.x1, -r.x0), 'armR ist armL gespiegelt');
  assert.equal(w.herkunft.torso, 'fehlt');
});

test('Zeichnung aus groben Einzelteilen besteht Import und Gelenkprüfung in allen Profil-Archetypen', async () => {
  const { formen } = wirksameTeile(profilTeile(), 'profil');
  for (const name of ['stehend-profil', 'sitzend-profil', 'oberkoerper-nah']) {
    const z = zeichnung(formen, name, { zuordnung: { '#f0d0b0': null } });
    assert.deepEqual(z.fehlend, []);
    const r = pruefeZeichnung(z.text, name);
    assert.deepEqual(r.befunde.map((b) => `${b.teil}: ${b.text}`), [], name);
    assert.ok(r.freieFarben.has('#f0d0b0'));
  }
  const r = pruefeZeichnung(zeichnung(formen, 'stehend-profil').text, 'stehend-profil');
  assert.deepEqual(await pruefeGelenke(r.teile, 'stehend-profil'), []);
});

test('Farbzuordnung setzt den Farbschlüssel', () => {
  const { formen } = wirksameTeile(profilTeile(), 'profil');
  const z = zeichnung(formen, 'oberkoerper-nah', { zuordnung: { '#f0d0b0': 'zubehoer' } });
  assert.match(z.text, /fill="#00ff00"/);
});

test('Dateinamen: Teil-IDs und deutsche Namen', () => {
  assert.equal(teilAusDateiname('Kopf.svg', 'profil'), 'head');
  assert.equal(teilAusDateiname('oberarm.svg', 'frontal'), 'armL-upper');
  assert.equal(teilAusDateiname('legB-foot.svg', 'profil'), 'legB-foot');
  assert.equal(teilAusDateiname('katze.svg', 'profil'), null);
});

test('ZIP ist gültig und deterministisch', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const a = zip([{ name: 'satz-01/stehend-profil.svg', inhalt: '<svg/>' }, { name: 'satz-01/LIESMICH.txt', inhalt: 'Grüße' }]);
  assert.deepEqual(a, zip([{ name: 'satz-01/stehend-profil.svg', inhalt: '<svg/>' }, { name: 'satz-01/LIESMICH.txt', inhalt: 'Grüße' }]));
  const dir = mkdtempSync(join(tmpdir(), 'zip-'));
  try {
    writeFileSync(join(dir, 'a.zip'), a);
    const liste = execFileSync('python3', ['-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print("|".join(z.namelist())); print(z.read("satz-01/LIESMICH.txt").decode())', join(dir, 'a.zip')], { encoding: 'utf8' });
    assert.match(liste, /satz-01\/stehend-profil\.svg\|satz-01\/LIESMICH\.txt/);
    assert.match(liste, /Grüße/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Werkstatt im Browser: Dateien laden, Ende ziehen, ZIP besteht den Importer', async () => {
  const WURZEL = join(import.meta.dirname, '..');
  const ziel = join(WURZEL, 'out', 'teile', 'test-werkstatt.html');
  execFileSync('node', [join(WURZEL, 'tools', 'teile-werkstatt.js'), '--frisch', '--ziel', 'out/teile/test-werkstatt.html'], { cwd: WURZEL });
  const { starteBrowser } = await import('../lib/browser.js');
  const { pathToFileURL } = await import('node:url');
  const browser = await starteBrowser();
  const dir = mkdtempSync(join(tmpdir(), 'werkstatt-'));
  try {
    const seite = await browser.newPage({ viewport: { width: 1500, height: 1100 }, acceptDownloads: true });
    const fehler = [];
    seite.on('pageerror', (e) => fehler.push(e.message));
    seite.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));
    await seite.goto(pathToFileURL(ziel).href);
    await seite.waitForFunction(() => document.documentElement.dataset.bereit === '1');
    // Deutsche Dateinamen; Zuordnung über den Namen.
    const svg = (inhalt) => `<svg xmlns="http://www.w3.org/2000/svg">${inhalt}</svg>`;
    const kap = (b, h, f) => svg(`<rect x="0" y="0" width="${b}" height="${h}" rx="${b / 2}" fill="${f}" stroke="#000" stroke-width="1"/>`);
    const dateien = {
      'rumpf.svg': svg('<rect x="0" y="0" width="60" height="150" fill="#ff00ff" stroke="#000" stroke-width="6"/>'),
      'kopf.svg': svg('<circle cx="40" cy="40" r="38" fill="#f0d0b0" stroke="#000" stroke-width="6"/>'),
      'oberarm.svg': kap(24, 114, '#ff00ff'),
      'unterarm.svg': kap(22, 112, '#ff00ff'),
      'hand.svg': svg('<ellipse cx="10" cy="13" rx="10" ry="13" fill="#f0d0b0" stroke="#000" stroke-width="4"/>'),
      'oberschenkel.svg': kap(34, 136, '#ffff00'),
      'unterschenkel.svg': kap(30, 128, '#ffff00'),
      'fuss.svg': svg('<rect x="0" y="0" width="46" height="18" fill="#000" stroke="#000" stroke-width="4"/>'),
    };
    await seite.setInputFiles('#mehrere', Object.entries(dateien).map(([name, t]) => ({ name, mimeType: 'image/svg+xml', buffer: Buffer.from(t) })));
    await seite.waitForFunction(() => Object.keys(window.werkstatt.zustand().teile.profil).length === 8);
    assert.deepEqual(await seite.evaluate(() => window.werkstatt.meldungen()), []);
    const herkunft = await seite.evaluate(() => window.werkstatt.herkunft());
    assert.match(herkunft['legB-foot'], /abgeleitet von legF-foot/);
    assert.match(herkunft['armF-hand-zeigend'], /abgeleitet/);
    // Endgriff des Unterarms ein Stück ziehen und zurück: Griff reagiert, Ergebnis bleibt prüfbar.
    await seite.locator('#liste li', { hasText: 'Unterarm' }).first().click();
    const vorher = (await seite.evaluate(() => window.werkstatt.zustand())).teile.profil['armF-lower'].lage;
    const griff = await seite.locator('#endgriff').boundingBox();
    await seite.mouse.move(griff.x + griff.width / 2, griff.y + griff.height / 2);
    await seite.mouse.down();
    await seite.mouse.move(griff.x + griff.width / 2 + 30, griff.y + griff.height / 2, { steps: 4 });
    await seite.mouse.up();
    const nachher = (await seite.evaluate(() => window.werkstatt.zustand())).teile.profil['armF-lower'].lage;
    assert.notEqual(nachher.rot, vorher.rot, 'Ziehen am Griff dreht das Teil');
    await seite.fill('#r-rot', String(vorher.rot));
    await seite.fill('#r-s', String(vorher.s * 100));
    await seite.dispatchEvent('#r-s', 'change');
    await seite.fill('#r-rot', String(vorher.rot));
    await seite.dispatchEvent('#r-rot', 'change');
    await seite.evaluate(() => window.werkstatt.pruefung());
    assert.deepEqual(await seite.evaluate(() => window.werkstatt.luecken()), []);
    const [download] = await Promise.all([seite.waitForEvent('download'), seite.click('#export')]);
    const pfad = join(dir, 'satz-01.zip');
    await download.saveAs(pfad);
    const inhalt = JSON.parse(
      execFileSync('python3', ['-I', '-c', 'import sys,zipfile,json; z=zipfile.ZipFile(sys.argv[1]); print(json.dumps({n: z.read(n).decode() for n in z.namelist()}))', pfad], { encoding: 'utf8' }),
    );
    assert.deepEqual(Object.keys(inhalt).sort(), ['satz-01/LIESMICH.txt', 'satz-01/oberkoerper-nah.svg', 'satz-01/sitzend-profil.svg', 'satz-01/stehend-profil.svg']);
    for (const name of ['stehend-profil', 'sitzend-profil', 'oberkoerper-nah']) {
      const r = pruefeZeichnung(inhalt[`satz-01/${name}.svg`], name);
      assert.deepEqual(r.befunde.map((b) => `${b.teil}: ${b.text}`), [], name);
    }
    assert.match(inhalt['satz-01/LIESMICH.txt'], /npm run figuren:import -- satz-01/);
    assert.deepEqual(fehler, []);
  } finally {
    await browser.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
