// Liest die YAML-Teilmenge der Szenenbriefe, ohne Fremdbibliothek.
// Unterstützt: Blockabbildungen und -listen nach Einrückung (Leerzeichen), Listeneinträge als Skalar,
// Fluss oder Abbildung, einzeilige Flussabbildungen { … } und Flusslisten [ … ], verschachtelt,
// Zeichenketten in "…" oder '…', Zahlen, true/false, null/~, Kommentare mit #.
// Was nicht in diese Teilmenge passt, hält mit Zeilennummer an, statt still falsch zu lesen.

export class BriefFehler extends Error {
  constructor(zeile, text) {
    super(`brief.yaml Zeile ${zeile}: ${text}`);
    this.zeile = zeile;
  }
}

/** Kommentar am Zeilenende entfernen, Anführungszeichen beachten. */
function ohneKommentar(zeile) {
  let inEinfach = false;
  let inDoppelt = false;
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i];
    if (c === '\\' && inDoppelt) {
      i++;
      continue;
    }
    if (c === "'" && !inDoppelt) inEinfach = !inEinfach;
    else if (c === '"' && !inEinfach) inDoppelt = !inDoppelt;
    else if (c === '#' && !inEinfach && !inDoppelt && (i === 0 || /\s/.test(zeile[i - 1]))) return zeile.slice(0, i);
  }
  return zeile;
}

function skalar(text, nr) {
  const t = text.trim();
  if (t === '' || t === '~' || t === 'null') return null;
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if (t.startsWith('"') || t.startsWith("'")) {
    const { wert, rest } = zeichenkette(t, 0, nr);
    if (t.slice(rest).trim() !== '') throw new BriefFehler(nr, `Text nach Zeichenkette: ${t}`);
    return wert;
  }
  if (/^[[{]/.test(t)) return fluss(t, nr);
  if (/:\s/.test(t) || t.endsWith(':')) throw new BriefFehler(nr, `Doppelpunkt in ungequotetem Wert, bitte in "…" setzen: ${t}`);
  return t;
}

function zeichenkette(t, i, nr) {
  const q = t[i];
  let wert = '';
  let j = i + 1;
  while (j < t.length) {
    const c = t[j];
    if (q === '"' && c === '\\') {
      const n = t[j + 1];
      wert += n === 'n' ? '\n' : n === 't' ? '\t' : n;
      j += 2;
      continue;
    }
    if (c === q) {
      if (q === "'" && t[j + 1] === "'") {
        wert += "'";
        j += 2;
        continue;
      }
      return { wert, rest: j + 1 };
    }
    wert += c;
    j++;
  }
  throw new BriefFehler(nr, 'Zeichenkette nicht geschlossen');
}

/** Einzeiliger Fluss { … } oder [ … ]. */
function fluss(t, nr) {
  let i = 0;
  const leer = () => {
    while (i < t.length && /\s/.test(t[i])) i++;
  };
  function wert() {
    leer();
    const c = t[i];
    if (c === '{') return abbildung();
    if (c === '[') return liste();
    if (c === '"' || c === "'") {
      const z = zeichenkette(t, i, nr);
      i = z.rest;
      return z.wert;
    }
    const start = i;
    while (i < t.length && !/[,\]}]/.test(t[i])) i++;
    return skalar(t.slice(start, i), nr);
  }
  function liste() {
    i++;
    const aus = [];
    leer();
    if (t[i] === ']') {
      i++;
      return aus;
    }
    for (;;) {
      aus.push(wert());
      leer();
      if (t[i] === ',') i++;
      else if (t[i] === ']') {
        i++;
        return aus;
      } else throw new BriefFehler(nr, `erwartet , oder ] in ${t}`);
    }
  }
  function abbildung() {
    i++;
    const aus = {};
    leer();
    if (t[i] === '}') {
      i++;
      return aus;
    }
    for (;;) {
      leer();
      let schluessel;
      if (t[i] === '"' || t[i] === "'") {
        const z = zeichenkette(t, i, nr);
        schluessel = z.wert;
        i = z.rest;
      } else {
        const start = i;
        while (i < t.length && t[i] !== ':') i++;
        schluessel = t.slice(start, i).trim();
      }
      leer();
      if (t[i] !== ':') throw new BriefFehler(nr, `erwartet : nach „${schluessel}“`);
      i++;
      aus[schluessel] = wert();
      leer();
      if (t[i] === ',') i++;
      else if (t[i] === '}') {
        i++;
        return aus;
      } else throw new BriefFehler(nr, `erwartet , oder } in ${t}`);
    }
  }
  const aus = wert();
  leer();
  if (i !== t.length) throw new BriefFehler(nr, `Text nach Fluss: ${t.slice(i)}`);
  return aus;
}

const SCHLUESSEL = /^("[^"]*"|'[^']*'|[A-Za-z_][\w-]*)\s*:(?:\s+|$)(.*)$/;

/** Brieftext zu Objekt. */
export function leseBrief(text) {
  const zeilen = [];
  text.split(/\r?\n/).forEach((roh, i) => {
    if (/\t/.test(roh.match(/^\s*/)[0])) throw new BriefFehler(i + 1, 'Tabulator in der Einrückung');
    const z = ohneKommentar(roh).replace(/\s+$/, '');
    if (z.trim() === '') return;
    zeilen.push({ nr: i + 1, einzug: z.match(/^ */)[0].length, inhalt: z.trim() });
  });
  let pos = 0;

  function block(einzug) {
    const z = zeilen[pos];
    if (!z || z.einzug < einzug) return null;
    return z.inhalt.startsWith('- ') || z.inhalt === '-' ? folge(z.einzug) : abbildung(z.einzug);
  }

  function abbildung(einzug) {
    const aus = {};
    while (pos < zeilen.length && zeilen[pos].einzug === einzug) {
      const z = zeilen[pos];
      const m = SCHLUESSEL.exec(z.inhalt);
      if (!m) throw new BriefFehler(z.nr, `erwartet „schlüssel: wert“: ${z.inhalt}`);
      const schluessel = m[1].replace(/^["']|["']$/g, '');
      if (schluessel in aus) throw new BriefFehler(z.nr, `Schlüssel „${schluessel}“ doppelt`);
      pos++;
      if (m[2] === '') {
        const naechste = zeilen[pos];
        aus[schluessel] = naechste && naechste.einzug > einzug ? block(naechste.einzug) : naechste && naechste.einzug === einzug && naechste.inhalt.startsWith('- ') ? folge(einzug) : null;
      } else {
        aus[schluessel] = skalar(m[2], z.nr);
      }
    }
    if (pos < zeilen.length && zeilen[pos].einzug > einzug) throw new BriefFehler(zeilen[pos].nr, 'unerwartete Einrückung');
    return aus;
  }

  function folge(einzug) {
    const aus = [];
    while (pos < zeilen.length && zeilen[pos].einzug === einzug && (zeilen[pos].inhalt.startsWith('- ') || zeilen[pos].inhalt === '-')) {
      const z = zeilen[pos];
      const rest = z.inhalt === '-' ? '' : z.inhalt.slice(2).trim();
      if (rest === '') {
        pos++;
        aus.push(block(zeilen[pos]?.einzug ?? einzug + 2));
      } else if (SCHLUESSEL.test(rest) && !/^[[{"']/.test(rest)) {
        // Abbildung im Listeneintrag: erste Zeile hier, weitere Schlüssel auf der Einrückung des Inhalts.
        zeilen[pos] = { nr: z.nr, einzug: einzug + 2, inhalt: rest };
        aus.push(abbildung(einzug + 2));
      } else {
        pos++;
        aus.push(skalar(rest, z.nr));
      }
    }
    return aus;
  }

  const wurzel = zeilen.length ? block(zeilen[0].einzug) : {};
  if (pos < zeilen.length) throw new BriefFehler(zeilen[pos].nr, `nicht gelesen: ${zeilen[pos].inhalt}`);
  return wurzel;
}
