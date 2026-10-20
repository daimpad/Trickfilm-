// Rohaufnahme → fertiges Geräusch (Abschnitt 8.4), rein rechnerisch auf Float-Arrays mono 48 kHz:
// Stille an den Enden weg, Vorgeräusch erkennen, Einsätze finden, kürzen, blenden, Schleife nähen, Pegel setzen.
import { RATE, zielVerstaerkung } from './lautheit.js';

const ms = (x) => Math.round((x / 1000) * RATE);
const db = (x) => Math.pow(10, x / 20);

export const REGELN = {
  stille_db: -50, // Schwelle für Stille an den Enden
  vorlauf_ms: 10, // so viel bleibt vor dem ersten Klang stehen
  einblende_ms: 10,
  ausblende_ms: [40, 120],
  naht_ms: 30,
  huelle_ms: 5, // Fensterlänge der Hüllkurve für Einsätze
  einsatz_db: -20, // ein Einsatz erreicht diese Höhe unter der Spitze …
  ruhe_db: -35, // … nachdem die Hüllkurve so tief lag …
  ruhe_ms: 20, // … und zwar mindestens so lange
};

/** Hüllkurve als RMS je Fenster in dBFS. */
export function huelle(x, fensterMs = REGELN.huelle_ms) {
  const n = ms(fensterMs);
  const aus = [];
  for (let i = 0; i < x.length; i += n) {
    let s = 0;
    const ende = Math.min(x.length, i + n);
    for (let k = i; k < ende; k++) s += x[k] * x[k];
    const r = Math.sqrt(s / Math.max(1, ende - i));
    aus.push(r > 0 ? 20 * Math.log10(r) : -Infinity);
  }
  return { werte: aus, schritt: n };
}

/** Einsätze als Abtastindizes: Die Hüllkurve steigt nahe an die Spitze, nachdem sie lange genug tief lag. */
export function einsaetze(x) {
  const { werte, schritt } = huelle(x);
  const spitze = Math.max(...werte);
  if (!Number.isFinite(spitze)) return [];
  const ruheFenster = Math.ceil(ms(REGELN.ruhe_ms) / schritt);
  const aus = [];
  let ruhig = ruheFenster; // vor dem Anfang gilt Ruhe
  let scharf = true;
  for (let i = 0; i < werte.length; i++) {
    if (werte[i] < spitze + REGELN.ruhe_db) ruhig++;
    else ruhig = 0;
    if (ruhig >= ruheFenster) scharf = true;
    if (scharf && werte[i] >= spitze + REGELN.einsatz_db) {
      aus.push(i * schritt);
      scharf = false;
    }
  }
  return aus;
}

/** Erster und letzter Abtastwert über der Stilleschwelle. */
function grenzen(x) {
  const s = db(REGELN.stille_db);
  let a = 0;
  while (a < x.length && Math.abs(x[a]) < s) a++;
  let b = x.length - 1;
  while (b > a && Math.abs(x[b]) < s) b--;
  return a >= x.length ? null : [a, b + 1];
}

/** Halbkosinus-Blenden: ein über einMs, aus über ausMs. */
export function blende(x, einMs, ausMs) {
  const y = Float64Array.from(x);
  const e = Math.min(ms(einMs), y.length);
  const a = Math.min(ms(ausMs), y.length);
  for (let i = 0; i < e; i++) y[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / e);
  for (let i = 0; i < a; i++) y[y.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / a);
  return y;
}

/** Steigender Nulldurchgang nahe bei i (Suche in beide Richtungen bis 20 ms). */
function nulldurchgang(x, i) {
  for (let d = 0; d < ms(20); d++) {
    for (const k of [i - d, i + d]) if (k > 0 && k < x.length && x[k - 1] < 0 && x[k] >= 0) return k;
  }
  return i;
}

/**
 * Schleife der Länge ~laenge: Schnitt auf einem steigenden Nulldurchgang, die Naht über 30 ms mit dem
 * Anfang überblendet, sodass Ende und Anfang ohne Sprung aneinanderpassen.
 */
export function schleife(x, laenge) {
  const F = ms(REGELN.naht_ms);
  const L = nulldurchgang(x, Math.min(laenge, x.length - F));
  if (L + F > x.length || L < 2 * F) throw new Error('Schleife: Aufnahme zu kurz für Länge und Naht');
  const y = Float64Array.from(x.subarray(0, L));
  for (let i = 0; i < F; i++) {
    const w = 0.5 - 0.5 * Math.cos((Math.PI * i) / F);
    y[i] = x[i] * w + x[L + i] * (1 - w);
  }
  return y;
}

/**
 * Ein Geräusch bearbeiten. cue: Katalogeintrag (dauer_s, einzel, nachklang, loop, art).
 * Liefert { daten, meldungen, messung } oder wirft, wenn nichts Hörbares darin ist.
 */
export function bearbeite(roh, cue) {
  const meldungen = [];
  const g = grenzen(roh);
  if (!g) throw new Error('nur Stille');
  let [a, b] = g;
  const ein = einsaetze(roh.subarray(a, b)).map((i) => i + a);
  // Vorgeräusch: Hörbares deutlich vor dem ersten kräftigen Einsatz; bei Einzelereignissen fällt es weg.
  if (ein.length && ein[0] - a > ms(30)) {
    meldungen.push(`Vorgeräusch ${((ein[0] - a) / RATE).toFixed(3)} s vor dem ersten Einsatz${cue.einzel ? ' entfernt' : ''}`);
    if (cue.einzel) a = ein[0];
  }
  a = Math.max(0, a - ms(REGELN.vorlauf_ms));
  const laenge = Math.round(cue.dauer_s * RATE);
  const kuerzbar = !(cue.nachklang || cue.art === 'laut');
  if (cue.einzel && ein.length > 1) {
    const zweiter = ein[1];
    if (zweiter < b) {
      meldungen.push(`${ein.length} Einsätze; gekürzt vor dem zweiten bei ${((zweiter - a) / RATE).toFixed(3)} s`);
      b = zweiter - ms(5);
    }
  }
  let y;
  if (cue.loop) {
    y = schleife(roh.subarray(a), laenge);
  } else {
    if (kuerzbar && b - a > laenge) {
      meldungen.push(`auf ${cue.dauer_s} s gekürzt (war ${((b - a) / RATE).toFixed(2)} s)`);
      b = a + laenge;
    }
    y = Float64Array.from(roh.subarray(a, b));
    const [aMin, aMax] = REGELN.ausblende_ms;
    const aus = Math.max(aMin, Math.min(aMax, (0.3 * y.length * 1000) / RATE));
    y = blende(y, REGELN.einblende_ms, aus);
  }
  const v = zielVerstaerkung(y);
  const f = db(v.db);
  for (let i = 0; i < y.length; i++) y[i] *= f;
  if (v.grenze === 'truePeak') meldungen.push(`Pegel durch True Peak begrenzt (Momentanlautheit ${(v.momentan + v.db).toFixed(1)} LUFS)`);
  return { daten: y, meldungen, messung: { dauer_s: y.length / RATE, verstaerkung_db: v.db, grenze: v.grenze } };
}

/** Eine Aufnahme mit mehreren Anschlägen in Einzelereignisse teilen (für einen Vorrat). */
export function teile(roh) {
  const ein = einsaetze(roh);
  const vor = ms(REGELN.vorlauf_ms);
  return ein.map((start, i) => roh.subarray(Math.max(i ? ein[i - 1] : 0, start - vor), i + 1 < ein.length ? ein[i + 1] - vor : roh.length));
}

/** Messung einer Rohaufnahme für Hörprobe und Vorschlag. */
export function vermesse(roh, cue) {
  const g = grenzen(roh);
  if (!g) return { stille: true, dauer_s: roh.length / RATE, einsaetze: 0, vorgeraeusch_s: 0, abweichung_s: cue.dauer_s };
  const ein = einsaetze(roh.subarray(g[0], g[1]));
  // Übersteuert heißt abgeschnitten: mindestens vier Abtastwerte in Folge an der Grenze, gleiches Vorzeichen.
  // Einzelne Spitzen über 0 dBFS entstehen beim Dekodieren von MP3 auch ohne Abschneiden.
  let folge = 0;
  let abgeschnitten = false;
  for (let i = 0; i < roh.length && !abgeschnitten; i++) {
    folge = Math.abs(roh[i]) >= 0.98 && (folge === 0 || Math.sign(roh[i]) === Math.sign(roh[i - 1])) ? folge + 1 : 0;
    abgeschnitten = folge >= 4;
  }
  return {
    stille: false,
    dauer_s: (g[1] - g[0]) / RATE,
    einsaetze: ein.length,
    vorgeraeusch_s: ein.length ? ein[0] / RATE : 0,
    uebersteuert: abgeschnitten,
    abweichung_s: Math.abs((g[1] - g[0]) / RATE - cue.dauer_s),
  };
}

/**
 * Wie sauber eine Variante ist (kleiner = besser): Übersteuerung, Vorgeräusch, falsche Zahl von Einsätzen,
 * Abweichung von der Ziellänge. Ein Vorrat will viele Einsätze, ein Einzelereignis genau einen.
 */
export function guete(m, cue) {
  if (m.stille) return Infinity;
  let p = 0;
  if (m.uebersteuert) p += 10;
  if (m.vorgeraeusch_s > 0.03) p += 3;
  if (cue.einzel && (cue.varianten_vorrat ?? 1) <= 1 && m.einsaetze !== 1) p += 2 * Math.abs(m.einsaetze - 1);
  if ((cue.varianten_vorrat ?? 1) > 1) p += Math.max(0, cue.varianten_vorrat - m.einsaetze) * 0.5;
  if (!cue.loop && !cue.nachklang && cue.art !== 'laut') p += m.abweichung_s;
  return p;
}
