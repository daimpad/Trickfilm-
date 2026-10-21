// Erzählung je Absatz (Abschnitt 9.1, 9.2): Platzhalterton, Ruhe an den Enden, Messung, Manifest. Nur in Node.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { integriert, RATE, truePeak } from '../sfx/lautheit.js';

export const RUHE_SCHWELLE_DB = -50;
export const RUHE_REST_S = 0.1;
// Aufnahmen und Manifest liegen in ton/<film>/; das Manifest kennt nur, was das Programm selbst geschrieben hat.
export const tonOrdner = (wurzel, film) => join(wurzel, 'ton', film);
export const absatzDatei = (wurzel, film, id) => join(tonOrdner(wurzel, film), `${id}.wav`);
export const manifestPfad = (wurzel, film) => join(tonOrdner(wurzel, film), 'stimme.json');

/** Platzhalter: Sinuston 220 Hz bei −20 dBFS in geplanter Länge, mit 20 ms Blende an beiden Enden. */
export function platzhalter(dauerS) {
  const n = Math.round(dauerS * RATE);
  const amp = 10 ** (-20 / 20);
  const blende = Math.round(0.02 * RATE);
  return Float32Array.from({ length: n }, (_, i) => amp * Math.min(1, i / blende, (n - 1 - i) / blende) * Math.sin((2 * Math.PI * 220 * i) / RATE));
}

/**
 * Ruhe an den Enden: Beginn und Ende der hörbaren Strecke (über −50 dBFS), mit je 0,1 s Rest.
 * Die Datei bleibt unverändert; Mischung und Wortzeiten rechnen mit diesen Grenzen.
 */
export function hoerbar(x, { schwelleDb = RUHE_SCHWELLE_DB, restS = RUHE_REST_S } = {}) {
  const grenze = 10 ** (schwelleDb / 20);
  let a = 0;
  while (a < x.length && Math.abs(x[a]) < grenze) a++;
  let b = x.length - 1;
  while (b > a && Math.abs(x[b]) < grenze) b--;
  if (a >= x.length) return { start: 0, ende: 0, still: true };
  const rest = Math.round(restS * RATE);
  return { start: Math.max(0, a - rest) / RATE, ende: Math.min(x.length, b + 1 + rest) / RATE, still: false };
}

/** Messung eines Absatzes: Rohlänge, hörbare Strecke, integrierte Lautheit, True Peak. */
export function vermesseAbsatz(x) {
  const h = hoerbar(x);
  const teil = x.subarray(Math.round(h.start * RATE), Math.round(h.ende * RATE));
  return {
    roh_s: runde(x.length / RATE),
    start_s: runde(h.start),
    ende_s: runde(h.ende),
    laenge_s: runde(h.ende - h.start),
    lufs_i: runde(integriert(teil), 1),
    true_peak_dbtp: runde(truePeak(teil), 1),
  };
}

const runde = (v, stellen = 3) => (Number.isFinite(v) ? Number(v.toFixed(stellen)) : v);

/** Manifest lesen: { absaetze: { id: { quelle, pruefsumme, generierung? } } }. */
export function leseManifest(wurzel, film) {
  const p = manifestPfad(wurzel, film);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : { absaetze: {} };
}

/**
 * Stand eines Absatzes: fehlt, eigen (Aufnahme ohne Eintrag im Manifest, bleibt stehen),
 * oder die Quelle aus dem Manifest, mit „veraltet“, wenn Text oder Einstellungen sich geändert haben.
 */
export function standVon(wurzel, film, id, pruefsummeJetzt, manifest = leseManifest(wurzel, film)) {
  const datei = absatzDatei(wurzel, film, id);
  if (!existsSync(datei)) return { stand: 'fehlt' };
  const e = manifest.absaetze[id];
  if (!e) return { stand: 'eigen' };
  return { stand: e.quelle, veraltet: e.pruefsumme !== pruefsummeJetzt };
}
