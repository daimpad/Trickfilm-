// Geräusche (Abschnitt 8): Katalog, Ereignisse aus der Bewegung, Cue-Liste, Lautheit gegen ffmpeg,
// Bearbeitung der Rohaufnahmen, Werkzeuge und Ton im Prototyp.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { leseKatalog, pruefeKatalog } from '../lib/sfx/katalog.js';
import { computeEvents, erkenne, wert } from '../lib/events.js';
import { erzeugeCues, waehleVariante } from '../lib/sfx/cues.js';
import { momentanMax, RATE, truePeak } from '../lib/sfx/lautheit.js';
import { bearbeite, einsaetze, teile } from '../lib/sfx/bearbeiten.js';
import { dekodiere, messeMitFfmpeg, schreibeWav } from '../lib/sfx/ffmpeg.js';
import { geraeuscheFuer, ladeSzene, viewerSeite } from '../lib/build.js';
import { rig } from '../lib/rigs/index.js';
import { normalisiere, vorschlag } from '../tools/sfx-normalisieren.js';
import { uebernehme } from '../tools/sfx-hoerprobe.js';
import { kosten } from '../tools/sfx-kosten.js';
import { cuesFuer } from '../tools/sfx-cues.js';
import { starteBrowser } from '../lib/browser.js';

const temp = (name) => mkdtempSync(join(tmpdir(), `${name}-`));
const signal = (s, f) => Float64Array.from({ length: Math.round(s * RATE) }, (_, i) => f(i / RATE));

test('Katalog: Startbestand ohne Befund; Ausgeschlossenes, Wörter und falsche Felder werden gefunden', () => {
  const k = leseKatalog();
  assert.ok(k.length >= 38, `${k.length} Cues`);
  assert.deepEqual(pruefeKatalog(k), []);
  for (const id of ['tastenanschlag', 'schritt', 'maus-klick', 'bestaetigung', 'laut-erstaunt', 'muenze']) assert.ok(k.some((c) => c.id === id), id);
  const schlecht = [
    { id: 'boing', art: 'sfx', prompt: 'cartoon boing', dauer_s: 0.5, gain_db: -20, ereignisse: ['aufprall'] },
    { id: 'publikum', art: 'sfx', prompt: 'audience laughter and applause', dauer_s: 1, gain_db: -20, ereignisse: ['geraet'] },
    { id: 'satz', art: 'laut', text: '[happy] That is great!', dauer_s: 0.8, gain_db: -20 },
    { id: 'lang', art: 'laut', text: '[surprised] Oh?', dauer_s: 1.2, gain_db: -20 },
    { id: 'vorrat', art: 'sfx', prompt: 'soft knock', dauer_s: 0.3, varianten_vorrat: 4, gain_db: -20, ereignisse: ['anschlag'] },
    { id: 'hallend', art: 'sfx', prompt: 'coin', dauer_s: 0.3, gain_db: -20, einzel: true, nachklang: true, ereignisse: ['erfunden'] },
  ];
  const b = pruefeKatalog(schlecht).map((x) => `${x.id}: ${x.text}`);
  assert.ok(b.some((t) => t.startsWith('boing: ausgeschlossen')));
  assert.ok(b.some((t) => t.startsWith('publikum: ausgeschlossen (laugh')));
  assert.ok(b.some((t) => t.startsWith('publikum: ausgeschlossen (applau')));
  assert.ok(b.includes('satz: ein Laut ist kein Wort und kein Satz'));
  assert.ok(b.includes('lang: ein Laut ist kürzer als 1 s'));
  assert.ok(b.some((t) => t.startsWith('vorrat: ein Vorrat braucht einzel')));
  assert.ok(b.some((t) => t.startsWith('hallend: einzel und nachklang')));
  assert.ok(b.includes('hallend: Ereignistyp „erfunden“ unbekannt'));
});

test('Erkennung: Tiefpunkt mit Hysterese, Mindestabstand, Lücken', () => {
  // Drei Anschläge (y wächst abwärts), dazwischen ein Zittern unter der Hysterese.
  const reihe = [0, 2, 6, 2, 0, 0.5, 0, 3, 6, 3, 0, null, 0, 6, 0];
  assert.deepEqual(erkenne('tiefpunkt', reihe, 30), [2, 8, 13]);
  assert.deepEqual(erkenne('tiefpunkt', reihe, 30, { mindestbilder: 8 }), [2, 13]);
  assert.throws(() => erkenne('tiefpunkt', [{ x: 0, y: 0 }], 30), /braucht eine Zahl/);
});

test('Erkennung: Beginn, Nulldurchgang, Bewegung, Aufprall, Hüllkurve, Schwelle', () => {
  assert.deepEqual(erkenne('beginn', [0, 0, 0.2, 1, 1, 0, 0, 1], 30), [3, 7]);
  assert.deepEqual(erkenne('nulldurchgang', [-2, -1, 1, 2, 1, -1, -2], 30, { mindestbilder: 1 }), [1, 4]);
  assert.deepEqual(erkenne('nulldurchgang', [-2, -1, 1, 2, 1, -1, -2], 30, { richtung: 'auf', mindestbilder: 1 }), [1]);
  // Ein Punkt ruht, fliegt mit 300 px/s, ruht wieder.
  const flug = [0, 0, 0, 10, 20, 30, 30, 30].map((x) => ({ x, y: 100 }));
  assert.deepEqual(erkenne('bewegung_start', flug, 30), [2]);
  assert.deepEqual(erkenne('bewegung_ende', flug, 30), [5]);
  // Aufprall: schnell an (900 px/s), sofort still.
  assert.deepEqual(erkenne('aufprall', [0, 0, 30, 60, 60, 60], 30), [3]);
  assert.deepEqual(erkenne('aufprall', [0, 1, 2, 3, 3], 30), []);
  // Hüllkurve mit Rücksetzen unter 0,4: zwei Einsätze, kein Doppel bei Zittern um die Schwelle.
  assert.deepEqual(erkenne('huellkurve', [0, 0.6, 0.45, 0.6, 0.2, 0.7], 30, { mindestbilder: 1 }), [1, 5]);
  assert.deepEqual(erkenne('schwelle_auf', [0, 0, 0.02, 0.3, 1], 30), [3]);
});

test('Pfade: Zustand, Gelenke der Figur, Fehler bei Unbekanntem', () => {
  const r = rig('sitzend-profil');
  const z = { A: { ...r.defaults, x: 900, y: 600 }, haken: { deckkraft: 0.5, an: true } };
  assert.equal(wert(z, 'haken.deckkraft'), 0.5);
  assert.equal(wert(z, 'haken.an'), 1);
  const y = wert(z, 'A.armF.hand.y', { A: r });
  assert.equal(y, r.gelenke(z.A).armF.hand.y);
  assert.throws(() => wert(z, 'A.armF.flosse.y', { A: r }), /gibt es im Zustand nicht/);
  assert.throws(() => wert(z, 'haken'), /weder Zahl noch Punkt/);
});

test('Vorlage: Ereignisse deterministisch, Cue-Liste aktuell, Anschläge im Tippen-Beat', async () => {
  const sz = await ladeSzene('_vorlage');
  const a = cuesFuer(sz);
  const b = cuesFuer(sz);
  assert.deepEqual(a.ereignisse, b.ereignisse);
  assert.equal(a.text, b.text);
  assert.deepEqual(a.befunde, []);
  assert.equal(readFileSync(join(sz.ordner, 'sfx-cues.json'), 'utf8'), a.text, 'sfx-cues.json veraltet: npm run sfx:cues -- _vorlage');
  const [t0, t1] = sz.animation.BEATS.tippen;
  const anschlaege = a.ereignisse.filter((e) => e.typ === 'anschlag');
  assert.ok(anschlaege.length >= 20 && anschlaege.every((e) => e.t >= t0 && e.t <= t1), `${anschlaege.length} Anschläge`);
  // Jedes Ereignisbild ist ein Tiefpunkt der Hand: davor höher (kleineres y), danach nicht tiefer.
  const figuren = { A: rig('sitzend-profil') };
  for (const e of anschlaege) {
    const y = (f) => wert(sz.animation.computeState(f / 30), e.pfad, figuren);
    assert.ok(y(e.bild) > y(e.bild - 1) && y(e.bild) >= y(e.bild + 1), `Bild ${e.bild}`);
  }
  assert.equal(a.cues.filter((q) => q.art === 'laut').length, 1);
});

/** Ereignisse einer Testszene in festen Abständen. */
const ereignisse = (typ, zeiten) => zeiten.map((t) => ({ typ, t, bild: Math.round(t * 30), pfad: 'p', beat: null, figur: null, requisite: null, ort: null }));

test('Cues: Ausdünnen, Versatz, Vorrat ohne Wiederholung, Dichte, nicht zugeordnete Quellen', () => {
  const katalog = leseKatalog();
  const sfx = { ereignisse: { anschlag: { cue: 'tastenanschlag', ausduennen: 2, versatz_s: -0.05 } }, quellen: { anschlag: [{ pfad: 'p' }], klick: [{ pfad: 'q' }] } };
  const zeiten = Array.from({ length: 10 }, (_, i) => 0.5 + i * 0.2);
  const r = erzeugeCues({ szene: 'X', sfx, ereignisse: ereignisse('anschlag', zeiten), katalog, dauer: 5 });
  assert.equal(r.cues.length, 5);
  assert.equal(r.cues[0].t, 0.45);
  for (let i = 1; i < r.cues.length; i++) assert.notEqual(r.cues[i].datei, r.cues[i - 1].datei);
  assert.match(r.cues[0].datei, /^tastenanschlag\/0[1-8]$/);
  assert.ok(r.befunde.some((b) => b.startsWith('quellen.klick: weder in ereignisse noch in stumm')));
  const dicht = erzeugeCues({ szene: 'X', sfx: { ereignisse: { anschlag: { cue: 'tastenanschlag' } }, quellen: { anschlag: [{ pfad: 'p' }] } }, ereignisse: ereignisse('anschlag', zeiten.map((t) => t / 2)), katalog, dauer: 5 });
  assert.ok(dicht.befunde.some((b) => /Geräusche zwischen/.test(b)), dicht.befunde.join('; '));
  const falsch = erzeugeCues({ szene: 'X', sfx: { ereignisse: { anschlag: { cue: 'whoosh-kurz' } }, quellen: { anschlag: [{ pfad: 'p' }] }, laute: [{ beat: 'a', cue: 'laut-erstaunt' }, { beat: 'a', cue: 'laut-fragend' }] }, ereignisse: [], katalog, beats: { a: [1, 2] }, dauer: 5 });
  assert.ok(falsch.befunde.some((b) => b.includes('nicht für anschlag vorgesehen')));
  assert.ok(falsch.befunde.includes('2 Laute (höchstens 1 je Szene)'));
  // Gleiche Eingabe, gleiche Wahl; nie zweimal dieselbe Datei hintereinander.
  assert.deepEqual(waehleVariante('S', 'anschlag', 'tastenanschlag', 3, 8, -1), waehleVariante('S', 'anschlag', 'tastenanschlag', 3, 8, -1));
  const w = waehleVariante('S', 'anschlag', 'tastenanschlag', 3, 8, -1);
  assert.notEqual(waehleVariante('S', 'anschlag', 'tastenanschlag', 3, 8, w.variante - 1).variante, w.variante);
});

/** Testsignale über ffmpeg erzeugen. */
function lavfi(ziel, quelle) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', quelle, ziel]);
  return ziel;
}

test('Lautheit und True Peak stimmen mit ffmpeg ebur128 überein', () => {
  const d = temp('lautheit');
  try {
    const proben = [
      lavfi(join(d, 'sinus.wav'), 'sine=frequency=997:duration=1:sample_rate=48000,volume=-6dB'),
      lavfi(join(d, 'rauschen.wav'), 'anoisesrc=d=0.6:c=pink:r=48000:a=0.4:s=3'),
      lavfi(join(d, 'kurz.wav'), "aevalsrc='0.7*sin(2*PI*700*t)*exp(-30*t)':s=48000:d=0.25"),
      lavfi(join(d, 'hoch.wav'), 'sine=frequency=11000:duration=0.5:sample_rate=48000'),
    ];
    for (const p of proben) {
      const x = dekodiere(p);
      const ff = messeMitFfmpeg(p);
      assert.ok(Math.abs(momentanMax(x) - ff.momentan) <= 0.2, `${p}: M ${momentanMax(x)} gegen ${ff.momentan}`);
      assert.ok(Math.abs(truePeak(x) - ff.truePeak) <= 0.5, `${p}: TP ${truePeak(x)} gegen ${ff.truePeak}`);
    }
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test('Bearbeiten: Vorgeräusch weg, vor dem zweiten Einsatz gekürzt, Nachklang bleibt, Schleife ohne Sprung, Pegel am Ziel', () => {
  const schlag = (t, t0) => (t >= t0 ? 0.6 * Math.sin(2 * Math.PI * 900 * t) * Math.exp(-40 * (t - t0)) : 0);
  const vorgeraeusch = (t) => (t > 0.05 && t < 0.2 ? 0.02 * Math.sin(2 * Math.PI * 3000 * t) : 0);
  const zwei = signal(1, (t) => vorgeraeusch(t) + schlag(t, 0.3) + schlag(t, 0.6));
  assert.equal(einsaetze(zwei).length, 2, 'das leise Vorgeräusch ist kein Einsatz');
  const r = bearbeite(zwei, { dauer_s: 0.5, einzel: true });
  assert.ok(r.meldungen.some((m) => m.startsWith('Vorgeräusch') && m.endsWith('entfernt')), r.meldungen.join('; '));
  assert.ok(r.meldungen.some((m) => m.includes('gekürzt vor dem zweiten')), r.meldungen.join('; '));
  assert.ok(r.messung.dauer_s < 0.31 && r.messung.dauer_s > 0.2, `${r.messung.dauer_s} s`);
  assert.equal(einsaetze(r.daten).length, 1);
  assert.ok(Math.max(momentanMax(r.daten) - -20, truePeak(r.daten) - -3) > -0.05, 'eines der Ziele ist erreicht');
  assert.ok(momentanMax(r.daten) <= -19.95 && truePeak(r.daten) <= -2.95);
  assert.equal(teile(signal(1, (t) => schlag(t, 0.1) + schlag(t, 0.4) + schlag(t, 0.7))).length, 3);
  // Nachklang wird nie im Klang gekürzt, auch wenn er länger ist als dauer_s.
  const muenze = bearbeite(signal(1.5, (t) => 0.3 * Math.sin(2 * Math.PI * 1500 * t) * Math.exp(-4 * t)), { dauer_s: 0.3, nachklang: true });
  assert.ok(muenze.messung.dauer_s > 1, `${muenze.messung.dauer_s} s`);
  // Schleife: die Naht springt nicht stärker als das Signal von Abtastwert zu Abtastwert.
  const s = bearbeite(signal(3, (t) => 0.05 * Math.sin(2 * Math.PI * 120 * t) + 0.02 * Math.sin(2 * Math.PI * 240 * t)), { dauer_s: 1, loop: true }).daten;
  let innen = 0;
  for (let i = 1; i < s.length; i++) innen = Math.max(innen, Math.abs(s[i] - s[i - 1]));
  assert.ok(Math.abs(s[0] - s.at(-1)) <= innen * 1.05, `Naht ${Math.abs(s[0] - s.at(-1))}, innen ${innen}`);
  assert.throws(() => bearbeite(new Float64Array(4800), { dauer_s: 0.3 }), /nur Stille/);
});

test('Werkzeuge: Vorschlag, Normalisieren mit Vorrat, Gegenmessung, Protokoll, Übernahme, Kosten', () => {
  const d = temp('sfx');
  try {
    writeFileSync(
      join(d, 'katalog.yaml'),
      ['- id: klick', '  art: sfx', '  prompt: "single soft click"', '  dauer_s: 0.2', '  varianten_vorrat: 3', '  gain_db: -26', '  einzel: true', '  ereignisse: [klick]', '- id: klang', '  art: sfx', '  prompt: "single bell ring"', '  dauer_s: 0.3', '  gain_db: -26', '  nachklang: true', '  ereignisse: [geraet]', '- id: oh', '  art: laut', '  text: "[surprised] Oh?"', '  dauer_s: 0.8', '  gain_db: -20', ''].join('\n'),
    );
    mkdirSync(join(d, 'roh', 'klick'), { recursive: true });
    mkdirSync(join(d, 'roh', 'klang'), { recursive: true });
    const schlag = (t, t0) => (t >= t0 ? 0.6 * Math.sin(2 * Math.PI * 900 * t) * Math.exp(-40 * (t - t0)) : 0);
    schreibeWav(signal(1.2, (t) => schlag(t, 0.1) + schlag(t, 0.4) + schlag(t, 0.7)), join(d, 'roh', 'klick', 'v1.wav'));
    schreibeWav(signal(0.8, (t) => schlag(t, 0.2)), join(d, 'roh', 'klick', 'v2.wav'));
    schreibeWav(signal(1.5, (t) => 0.3 * Math.sin(2 * Math.PI * 1500 * t) * Math.exp(-4 * t)), join(d, 'roh', 'klang', 'v1.wav'));
    writeFileSync(join(d, 'roh', 'herkunft.tsv'), 'id\tvariante\tdatei\tmodell\tprompt\tdatum\tsitzung\tgenerierung\tlizenz\nklang\tv1\tv1.wav\ttest\tsingle bell ring\t2026-10-20\ttest\tkennung-1\tTest\n');

    vorschlag(d, []);
    const auswahl = readFileSync(join(d, 'auswahl.yaml'), 'utf8');
    assert.match(auswahl, /- id: klick\n {2}wahl: \[v1, v2\]\n {2}vorlaeufig: true/, "Vorrat: alle hörbaren Varianten, die sauberste zuerst");
    const r = normalisiere(d, []);
    assert.deepEqual(r.befunde, []);
    assert.deepEqual(r.fehlend, ['oh']);
    for (const f of ['final/klick/01.wav', 'final/klick/03.wav', 'prototyp/klick/02.ogg', 'final/klang.wav', 'prototyp/klang.ogg']) assert.ok(existsSync(join(d, f)), f);
    const format = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=sample_rate,channels,codec_name', '-of', 'csv=p=0', join(d, 'final', 'klang.wav')], { encoding: 'utf8' }).trim();
    assert.equal(format, 'pcm_s24le,48000,1');
    const protokoll = readFileSync(join(d, 'protokoll-sfx.tsv'), 'utf8').split('\n');
    assert.match(protokoll[0], /^# ERZEUGT von tools\/sfx-normalisieren\.js/);
    assert.match(protokoll.find((z) => z.startsWith('klang\t')), /\ttest\tsingle bell ring\t1\tv1\ttrue\t1\t-20\.0\t.*\t2026-10-20\tTest$/);

    // Bestätigt bleibt bestätigt: der Vorschlag verweigert, die Übernahme prüft Varianten.
    const m = uebernehme(d, 'id;wahl;bestaetigt\nklick;v2|v1;ja\n');
    assert.deepEqual(m, ['klick: v2, v1 (bestätigt)']);
    assert.ok(vorschlag(d, []).includes('klick: von Regie bestätigt (v2, v1), kein Vorschlag'));
    assert.throws(() => uebernehme(d, 'id;wahl;bestaetigt\nklang;v9;ja\n'), /keine Variante „v9“/);
    assert.throws(() => uebernehme(d, 'id;wahl;bestaetigt\nklang;v1|v1;ja\n'), /genau eine Variante/);

    const k = kosten(d);
    assert.deepEqual(k.posten.map((p) => [p.id, p.credits]), [['oh', 45]]);
    assert.equal(k.summe, 45 + 60, 'drei Laut-Takes und vier Stimmproben');
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test('Prototyp: Cues eingebettet, Status nennt fehlenden Ton, vorhandener Ton wird dekodiert', async () => {
  const sz = await ladeSzene('_vorlage');
  const ton = geraeuscheFuer(sz);
  assert.ok(ton.cues.length > 0);
  const d = temp('ogg');
  const browser = await starteBrowser(['--autoplay-policy=no-user-gesture-required']);
  try {
    // Ein Ton für die erste Datei, die übrigen fehlen.
    const ogg = join(d, 'ton.ogg');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=800:duration=0.2:sample_rate=48000', '-c:a', 'libopus', '-b:a', '48k', ogg]);
    const erste = ton.cues[0].datei;
    const mitEinem = { cues: ton.cues, toene: { [erste]: readFileSync(ogg).toString('base64') } };
    const seite = await browser.newPage();
    const fehler = [];
    seite.on('pageerror', (e) => fehler.push(e.message));
    await seite.setContent(viewerSeite(sz, sz.scene.sceneMarkup(), mitEinem));
    await seite.waitForFunction(() => document.getElementById('tonstatus').textContent.length > 0);
    const ohne = ton.cues.filter((c) => c.datei !== erste).length;
    assert.equal(await seite.textContent('#tonstatus'), `${ton.cues.length} Cues, ${ohne} ohne Ton (noch nicht generiert)`);
    assert.deepEqual(fehler, []);
  } finally {
    await browser.close();
    rmSync(d, { recursive: true, force: true });
  }
});

test('Ablegen: prüft Ton, nummeriert Varianten, schreibt Herkunft, legt nichts doppelt ab; Plan folgt dem Katalog', async () => {
  const { ablegen } = await import('../tools/sfx-ablegen.js');
  const { plan, sfxParameter } = await import('../tools/sfx-kosten.js');
  const d = temp('ablegen');
  try {
    writeFileSync(join(d, 'katalog.yaml'), ['- { id: klick, art: sfx, prompt: "single click", dauer_s: 0.2, varianten_vorrat: 6, gain_db: -26, einzel: true, ereignisse: [klick] }', '- { id: summen, art: sfx, prompt: "hum", dauer_s: 2.0, gain_db: -36, loop: true, ereignisse: [geraet] }', '- { id: oh, art: laut, text: "[surprised] Oh?", dauer_s: 0.8, gain_db: -20 }', ''].join('\n'));
    const quelle = join(d, 'download');
    mkdirSync(quelle);
    schreibeWav(signal(0.5, (t) => 0.3 * Math.sin(2 * Math.PI * 800 * t)), join(quelle, 'a.wav'));
    schreibeWav(signal(0.5, (t) => 0.3 * Math.sin(2 * Math.PI * 900 * t)), join(quelle, 'b.wav'));
    writeFileSync(join(quelle, 'kaputt.mp3'), 'kein Ton');
    const kopf = 'id\tquelle\tmodell\tprompt\tsitzung\tgenerierung\tparameter\n';
    const zeile = (datei, gen) => `klick\t${join(quelle, datei)}\televen_text_to_sound_v2\tsingle click\tflow F / S\t${gen}\tduration 1\n`;
    const r = ablegen(d, kopf + zeile('a.wav', 'g1') + zeile('b.wav', 'g2') + zeile('kaputt.mp3', 'g3'), '2026-10-20');
    assert.deepEqual(r.abgelegt.map((a) => a.split(' ')[0]), ['klick/v1', 'klick/v2']);
    assert.equal(r.fehler.length, 1);
    assert.match(r.fehler[0], /kaputt\.mp3/);
    const nochmal = ablegen(d, kopf + zeile('a.wav', 'g1'), '2026-10-20');
    assert.equal(nochmal.abgelegt.length, 0);
    assert.equal(nochmal.uebergangen.length, 1);
    const herkunft = readFileSync(join(d, 'roh', 'herkunft.tsv'), 'utf8').trim().split('\n');
    assert.equal(herkunft.length, 3);
    assert.match(herkunft[2], /^klick\tv2\tv2\.wav\televen_text_to_sound_v2\tsingle click\t2026-10-20\tflow F \/ S\tg2\t/);
    assert.throws(() => ablegen(d, 'id\tquelle\n'), /Spalte „modell“ fehlt/);
    // Plan aus dem Bestand: Vorrat 6 braucht acht Takes, zwei liegen vor; Schleifen bekommen Luft für die Naht;
    // Laute fehlen je Stimme.
    const p = plan(d);
    assert.deepEqual(p.map((x) => [x.id, x.fehlend ?? x.stimmen.length]), [['klick', 6], ['summen', 4], ['oh', 4]]);
    assert.deepEqual(p.find((x) => x.id === 'oh').stimmen.map((s) => s.fehlend), [2, 2, 2, 2]);
    assert.deepEqual(sfxParameter({ dauer_s: 2.0, loop: true }), { duration_seconds: 2.5, prompt_influence: 0.4, loop: true });
    assert.deepEqual(sfxParameter({ dauer_s: 0.2, einzel: true }), { duration_seconds: 1, prompt_influence: 0.5, loop: false });
    assert.equal(plan(d, { ids: ['summen'] }).length, 1);
    assert.match(herkunft[0], /\tparameter$/);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});
