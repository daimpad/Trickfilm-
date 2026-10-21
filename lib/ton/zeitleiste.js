// Zeitleiste eines Films (Abschnitt 9.2–9.4): Szenen nacheinander, jeder Absatz beginnt an seinem Einsatz in seiner Szene;
// Wortzeiten anteilig nach Zeichen aus der gemessenen Länge; Untertitel als WebVTT. DOM-frei.
import { RUHE_REST_S } from './stimme.js';
import { ZEICHEN_JE_S } from './sprechtext.js';

export const ZEILE_MAX = 74;
export const ZEILEN_MAX = 2;
export const EINHEIT_MIN_S = 1;

/** Szenen in Reihenfolge mit Beginn im Film: [{ id, start, dauer, fps }]. */
export function szenenFolge(szenen) {
  let t = 0;
  return szenen.map((s) => {
    const e = { id: s.id, start: t, dauer: s.dauer, fps: s.fps };
    t += s.dauer;
    return e;
  });
}

/**
 * Wörter eines Absatzes mit Zeit in der Szene: anteilig nach Zeichen über die gesprochene Strecke
 * (die hörbare Strecke ohne die 0,1 s Rest an beiden Enden), die am Einsatz des Absatzes in der Szene beginnt.
 */
export function wortzeiten(text, messung, fps, einsatz = 0) {
  const rest = Math.min(RUHE_REST_S, messung.laenge_s / 4);
  const strecke = Math.max(messung.laenge_s - 2 * rest, 0);
  const woerter = [];
  const muster = /\S+/g;
  let m;
  while ((m = muster.exec(text))) {
    const t = einsatz + rest + (m.index / text.length) * strecke;
    woerter.push({ nr: woerter.length + 1, wort: m[0], sauber: saeubere(m[0]), t: runde(t), bild: Math.round(t * fps) });
  }
  return woerter;
}

export const saeubere = (wort) => wort.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
const runde = (v) => Number(v.toFixed(3));

/** Kommentare der Form „Wort“ (Zahl) in einer Zeitfunktion: [{ wort, bild, zeile }]. */
export function einsaetzeIn(quelltext) {
  const funde = [];
  quelltext.split('\n').forEach((zeile, i) => {
    for (const m of zeile.matchAll(/„([^“]+)“\s*\((\d+)\)/g)) funde.push({ wort: m[1], bild: Number(m[2]), zeile: i + 1 });
  });
  return funde;
}

/** Zeilenumbruch einer Einheit: höchstens zwei Zeilen zu 74 Zeichen, nur an Wortgrenzen, bevorzugt nach Satzzeichen. */
export function umbrechen(text) {
  if (text.length <= ZEILE_MAX) return [text];
  const woerter = text.split(' ');
  let beste = null;
  for (let k = 1; k < woerter.length; k++) {
    const a = woerter.slice(0, k).join(' ');
    const b = woerter.slice(k).join(' ');
    if (a.length > ZEILE_MAX || b.length > ZEILE_MAX) continue;
    // Möglichst gleich lang, lieber nach einem Satzzeichen als mitten in einer Wortgruppe.
    const guete = Math.abs(a.length - b.length) + (/[.,:;!?]$/.test(a) ? 0 : 20);
    if (!beste || guete < beste.guete) beste = { zeilen: [a, b], guete };
  }
  if (!beste) throw new Error(`Untertitel: „${text}“ passt nicht in zwei Zeilen zu ${ZEILE_MAX} Zeichen`);
  return beste.zeilen;
}

/** Einheiten eines Absatzes: Sätze nacheinander gepackt, solange zwei Zeilen reichen; lange Sätze an Kommas und Wörtern geteilt. */
export function einheiten(text) {
  const saetze = text.match(/[^.!?]+[.!?]+["“”»«]?|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  const stuecke = saetze.flatMap((s) => (passt(s) ? [s] : teileSatz(s)));
  const aus = [];
  for (const s of stuecke) {
    const kandidat = aus.length ? `${aus[aus.length - 1]} ${s}` : s;
    if (aus.length && passt(kandidat)) aus[aus.length - 1] = kandidat;
    else aus.push(s);
  }
  return aus;
}

function passt(text) {
  try {
    return umbrechen(text).length <= ZEILEN_MAX;
  } catch {
    return false;
  }
}

function teileSatz(satz) {
  const teile = satz.split(/(?<=,)\s+/);
  const aus = [];
  for (const t of teile) {
    const kandidat = aus.length ? `${aus[aus.length - 1]} ${t}` : t;
    if (aus.length && passt(kandidat)) aus[aus.length - 1] = kandidat;
    else if (passt(t)) aus.push(t);
    else {
      // Notfalls an Wortgrenzen: so viele Wörter, wie zwei Zeilen fassen.
      let zeile = '';
      for (const w of t.split(' ')) {
        const k = zeile ? `${zeile} ${w}` : w;
        if (passt(k)) zeile = k;
        else {
          aus.push(zeile);
          zeile = w;
        }
      }
      if (zeile) aus.push(zeile);
    }
  }
  return aus;
}

/**
 * Untertitel eines Films aus gemessenen Längen (Abschnitt 9.4). absaetze: [{ text, szeneStart, szeneEnde, messung }]
 * in Filmzeit und Reihenfolge; szeneStart ist der Beginn des Absatzes (Szene plus Einsatz). Jede Einheit beginnt mit ihrem ersten Zeichen; die letzte eines Absatzes läuft nach, bis sie mit
 * 15 Zeichen je Sekunde lesbar ist, höchstens bis zum nächsten Absatz und bis zum Ende der Szene; keine unter 1 s.
 */
export function untertitel(absaetze) {
  const aus = [];
  absaetze.forEach((a, i) => {
    const rest = Math.min(RUHE_REST_S, a.messung.laenge_s / 4);
    const strecke = Math.max(a.messung.laenge_s - 2 * rest, 0);
    const ehs = einheiten(a.text);
    let pos = 0;
    const starts = ehs.map((e) => {
      const p = a.text.indexOf(e, pos);
      pos = p + e.length;
      return a.szeneStart + rest + (p / a.text.length) * strecke;
    });
    const grenze = Math.min(a.szeneEnde, absaetze[i + 1]?.szeneStart ?? Infinity);
    ehs.forEach((e, k) => {
      const start = starts[k];
      const naechste = starts[k + 1];
      let ende = naechste ?? Math.max(a.szeneStart + rest + strecke, start + e.length / ZEICHEN_JE_S);
      ende = Math.max(ende, start + EINHEIT_MIN_S);
      ende = Math.min(ende, naechste ?? grenze);
      aus.push({ start: runde(start), ende: runde(ende), zeilen: umbrechen(e) });
    });
  });
  return aus;
}

const zeit = (s) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sek = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sek).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
};

/** WebVTT mit Vermerk, dass die Datei erzeugt ist. */
export function webvtt(einheitenListe, quelle) {
  return `WEBVTT\n\nNOTE ERZEUGT von ${quelle}; nicht von Hand ändern\n\n${einheitenListe.map((e, i) => `${i + 1}\n${zeit(e.start)} --> ${zeit(e.ende)}\n${e.zeilen.join('\n')}\n`).join('\n')}`;
}
