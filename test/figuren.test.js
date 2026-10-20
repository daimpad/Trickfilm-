// Figurenbaukasten: der Importer nimmt satz-00 ohne Befund, findet Regelverstöße und Gelenklücken.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { leseXml, pruefeZeichnung, pruefeGelenke } from '../tools/import-teilesatz.js';
import { teileVon } from '../lib/rigs/vorlage-layout.js';

const WURZEL = join(import.meta.dirname, '..');
const SPEZ = JSON.parse(readFileSync(join(WURZEL, 'figuren/rig-spezifikation.json'), 'utf8'));
const satz00 = (a) => readFileSync(join(WURZEL, 'figuren/teilesaetze/satz-00', `${a}.svg`), 'utf8');
const texte = (r) => r.befunde.map((b) => `${b.teil}: ${b.text}`);

test('satz-00 besteht die Strukturprüfung in allen Archetypen', () => {
  for (const a of Object.keys(SPEZ.archetypen)) {
    const r = pruefeZeichnung(satz00(a), a);
    assert.deepEqual(texte(r), [], a);
    assert.deepEqual(Object.keys(r.teile).sort(), teileVon(SPEZ, a).sort());
    assert.match(r.teile.torso, /fill="@kleidung1"/);
  }
});

test('Verstöße werden je Teil gemeldet', () => {
  const s = satz00('stehend-profil');
  const mit = (alt, neu) => texte(pruefeZeichnung(s.replace(alt, neu), 'stehend-profil')).join(' | ');
  assert.match(mit('<g id="torso" inkscape:groupmode="layer" inkscape:label="torso">', '<g id="torso" inkscape:groupmode="layer" inkscape:label="torso" transform="scale(2)">'), /torso: transform auf der Ebene/);
  assert.match(mit(/<g id="head"[^>]*>.*?<\/g>\n/, ''), /head: Teil fehlt/);
  assert.match(mit('stroke-width="6"', 'stroke-width="3"'), /Kontur 3 px/);
  assert.match(mit('fill="#ff00ff"', 'style="fill:#ff00ff"'), /Präsentationsattribute/);
  assert.match(mit('<polygon', '<polygon opacity="0.5"'), /opacity/);
  assert.match(mit('</svg>', '<g id="haare" inkscape:groupmode="layer"><path d="M0 0 L1 1" stroke="#000000" stroke-width="4"/></g></svg>'), /fremde Ebene „haare“/);
  assert.match(mit('</svg>', '<text x="1" y="1">A</text></svg>'), /<text> außerhalb einer Ebene/);
  assert.match(mit('fill="#ff00ff"', 'fill="url(#verlauf)"'), /Verweise/);
});

test('Hilfsebenen werden ignoriert; Inkscape-Labels und Illustrator-Namen zählen', () => {
  const s = satz00('stehend-profil')
    .replace('</svg>', '<g id="hilfe-skizze"><text x="1" y="1">Notiz</text></g></svg>')
    .replace('<g id="torso" inkscape:groupmode="layer" inkscape:label="torso">', '<g id="layer7" inkscape:groupmode="layer" inkscape:label="torso">')
    .replace('<g id="head" inkscape:groupmode="layer" inkscape:label="head">', '<g id="head_1_" data-name="head">');
  assert.deepEqual(texte(pruefeZeichnung(s, 'stehend-profil')), []);
});

test('XML-Leser: Kommentare, DOCTYPE, Entitäten, Fehler mit Zeile', () => {
  const d = leseXml('<?xml version="1.0"?><!DOCTYPE svg [ <!ENTITY a "b"> ]><!-- x --><svg a="&amp;&#x41;"><g/></svg>');
  assert.equal(d.kinder[0].attrs.a, '&A');
  assert.throws(() => leseXml('<svg>\n<g></svg>'), /Zeile 2/);
});

test('Gelenkprüfung findet eine Lücke am Ellbogen und keine bei satz-00', async () => {
  const r = pruefeZeichnung(satz00('oberkoerper-nah'), 'oberkoerper-nah');
  assert.deepEqual(await pruefeGelenke(r.teile, 'oberkoerper-nah'), []);
  // Oberarm endet 8 px vor dem Ellbogen, Unterarm beginnt 12 px danach: Der Überlappungskreis bleibt offen.
  const kurz = {
    ...r.teile,
    'armF-upper': '<path d="M-12 0 A12 12 0 0 1 12 0 L12 70 A12 12 0 0 1 -12 70 Z" fill="@kleidung1" stroke="#000000" stroke-width="6"/>',
    'armF-lower': '<path d="M-11 12 A11 11 0 0 1 11 12 L11 90 A11 11 0 0 1 -11 90 Z" fill="@kleidung1" stroke="#000000" stroke-width="6"/>',
  };
  const luecken = await pruefeGelenke(kurz, 'oberkoerper-nah');
  assert.ok(luecken.some((l) => l.eltern === 'armF-upper' && l.kind === 'armF-lower'), JSON.stringify(luecken));
  assert.ok(luecken.every((l) => l.eltern === 'armF-upper' || l.kind === 'armF-upper' || l.eltern === 'armF-lower'));
});
