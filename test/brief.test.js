// Briefleser: die YAML-Teilmenge aus Abschnitt 6.1, Fehler mit Zeilennummer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leseBrief, BriefFehler } from '../lib/brief.js';

const BEISPIEL = `
id: DEMO-01-buero                    # <FILM>-<NN>-<slug>
film: DEMO
sprechtext:
  datei: ton/DEMO/absatz-01.wav
  passage: "Sie füllt aus: Feld für Feld."
  dauer_s: 16.5
  dauer_geschaetzt: true
palette: { grund: "#F5F3EE", akzent1: "#B23A2B", akzent2: null }
figuren:
  - prefix: A
    rig: sitzend-profil
    palette: { kleidung1: "#1C6E78", zubehoer: null }
    charakter: { tempo: 1.0, haltung: konzentriert, reaktion: 0.8, tick: null }
    gefuehlsbogen: [konzentriert, ueberrascht, erleichtert]
requisiten: [schreibtisch, monitor]
beats:
  - { name: tippen, start: 0.6, ende: 4.0, figur: A, aktion: "füllt aus", wort: "Formular" }
  - { name: pointe, start: 7.0, ende: 8.2, figur: A, aktion: "staunt" }
annahmen: []
sfx:
  ereignisse:
    anschlag: { cue: tastenanschlag, gain_db: -26, ausduennen: 3 }
  quellen:
    anschlag: [ { pfade: [A.armF.hand.y, A.armB.hand.y], beat: tippen } ]
  stumm: [ankunft]
sichtung: { lesbarkeit_960: ok, synchron: offen }
liste:
  - eins
  - 'zwei ''drei'''
`;

test('liest den Beispielbrief vollständig', () => {
  const b = leseBrief(BEISPIEL);
  assert.equal(b.id, 'DEMO-01-buero');
  assert.equal(b.sprechtext.passage, 'Sie füllt aus: Feld für Feld.');
  assert.equal(b.sprechtext.dauer_s, 16.5);
  assert.equal(b.sprechtext.dauer_geschaetzt, true);
  assert.deepEqual(b.palette, { grund: '#F5F3EE', akzent1: '#B23A2B', akzent2: null });
  assert.equal(b.figuren.length, 1);
  assert.equal(b.figuren[0].rig, 'sitzend-profil');
  assert.deepEqual(b.figuren[0].gefuehlsbogen, ['konzentriert', 'ueberrascht', 'erleichtert']);
  assert.equal(b.figuren[0].charakter.tempo, 1);
  assert.deepEqual(b.requisiten, ['schreibtisch', 'monitor']);
  assert.equal(b.beats[1].name, 'pointe');
  assert.equal(b.beats[0].wort, 'Formular');
  assert.deepEqual(b.annahmen, []);
  assert.deepEqual(b.sfx.quellen.anschlag[0].pfade, ['A.armF.hand.y', 'A.armB.hand.y']);
  assert.deepEqual(b.sfx.stumm, ['ankunft']);
  assert.deepEqual(b.liste, ['eins', "zwei 'drei'"]);
});

test('Fehler nennen die Zeile', () => {
  assert.throws(() => leseBrief('a: 1\na: 2'), (e) => e instanceof BriefFehler && e.zeile === 2);
  assert.throws(() => leseBrief('a: { b: 1'), /Zeile 1/);
  assert.throws(() => leseBrief('these: Ein Satz: mit Doppelpunkt'), /Doppelpunkt/);
  assert.throws(() => leseBrief('a:\n\tb: 1'), /Tabulator/);
});
