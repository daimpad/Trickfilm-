// Katalog der Geräusche und Laute lesen und prüfen (Abschnitt 8.1–8.2).
// Jeder Prompt wird gegen die Ausschlussliste gehalten: kein Boing, keine Fanfare, kein Lachen, keine Musik.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { leseYaml } from '../brief.js';
import { ERKENNUNG } from '../events.js';

export const KATALOG_PFAD = join(import.meta.dirname, 'katalog.yaml');

/** Ausgeschlossen nach 8.1, englisch (Prompts) und deutsch (Kommentare, Texte). */
export const AUSSCHLUSS = [
  /\bboing/i,
  /slide whistle|rutschpfeife/i,
  /\bhorns?\b|\bhonk|\bhupe/i,
  /fanfare/i,
  /kazoo|party horn|tr[öo]te/i,
  /laugh|lachen|gelächter|lachkonserve/i,
  /applau/i,
  /explosion|explod/i,
  /\bcrash/i,
  /cartoon (hit|punch|bonk|smack)|comic-?schlag|\bbonk/i,
  /stinger|jingle/i,
  /\bmusic|\bmelody|\bsong\b|musik/i,
];

const ARTEN = new Set(['sfx', 'laut']);
const FELDER = new Set(['id', 'art', 'prompt', 'text', 'dauer_s', 'varianten_vorrat', 'gain_db', 'ereignisse', 'einzel', 'nachklang', 'loop']);

/** Katalog als Liste; Standard ist lib/sfx/katalog.yaml. */
export function leseKatalog(text = readFileSync(KATALOG_PFAD, 'utf8')) {
  const liste = leseYaml(text, 'katalog.yaml');
  if (!Array.isArray(liste)) throw new Error('katalog.yaml: erwartet eine Liste von Cues');
  return liste;
}

/** Katalog als Abbildung id → Eintrag. */
export const katalogNachId = (liste) => Object.fromEntries(liste.map((c) => [c.id, c]));

/** Befunde [{ id, text }] für einen Katalog; leer heißt: in Ordnung. */
export function pruefeKatalog(liste) {
  const befunde = [];
  const befund = (id, text) => befunde.push({ id, text });
  const ids = new Set();
  for (const c of liste) {
    const id = c?.id ?? '?';
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) befund(id, 'id klein, mit Bindestrichen, ohne Umlaute');
    if (ids.has(id)) befund(id, 'id doppelt');
    ids.add(id);
    for (const k of Object.keys(c ?? {})) if (!FELDER.has(k)) befund(id, `Feld „${k}“ unbekannt`);
    if (!ARTEN.has(c.art)) befund(id, 'art muss sfx oder laut sein');
    if (!(typeof c.dauer_s === 'number' && c.dauer_s > 0)) befund(id, 'dauer_s fehlt oder ist nicht positiv');
    if (typeof c.gain_db !== 'number' || c.gain_db > 0) befund(id, 'gain_db fehlt oder ist größer als 0');
    if (c.varianten_vorrat !== undefined && !(Number.isInteger(c.varianten_vorrat) && c.varianten_vorrat >= 1)) befund(id, 'varianten_vorrat ist keine ganze Zahl ≥ 1');
    if (c.varianten_vorrat > 1 && !c.einzel) befund(id, 'ein Vorrat braucht einzel: true (je Datei genau ein Anschlag)');
    if (c.einzel && c.nachklang) befund(id, 'einzel und nachklang schließen sich aus: Nachklingendes nie als Einzelereignis kürzen');
    const quelle = c.art === 'laut' ? c.text : c.prompt;
    if (typeof quelle !== 'string' || !quelle.trim()) befund(id, c.art === 'laut' ? 'text fehlt' : 'prompt fehlt');
    for (const muster of AUSSCHLUSS) if (muster.test(`${id} ${quelle ?? ''}`)) befund(id, `ausgeschlossen (${muster.source})`);
    if (c.art === 'sfx') {
      if (!Array.isArray(c.ereignisse) || !c.ereignisse.length) befund(id, 'ereignisse fehlen');
      for (const e of c.ereignisse ?? []) if (!ERKENNUNG[e]) befund(id, `Ereignistyp „${e}“ unbekannt`);
    } else if (c.art === 'laut') {
      if (c.dauer_s >= 1) befund(id, 'ein Laut ist kürzer als 1 s');
      if (!/^\[[a-z ]+\]/.test(c.text ?? '')) befund(id, 'text beginnt mit einem Audio-Tag in eckigen Klammern');
      const rest = (c.text ?? '').replace(/\[[^\]]*\]/g, '').trim();
      if (rest.split(/\s+/).length > 1 || rest.replace(/[^A-Za-z]/g, '').length > 6) befund(id, 'ein Laut ist kein Wort und kein Satz');
      if (c.ereignisse) befund(id, 'Laute hängen an Beats, nicht an Ereignissen');
    }
  }
  return befunde;
}
