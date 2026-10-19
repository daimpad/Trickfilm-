// Standbild bei t als SVG, ohne DOM: die Liste [id, attribut, wert] wird in das Markup geschrieben.
// Läuft in Node; im Browser setzt der Viewer dieselbe Liste per setAttribute.

/**
 * Attribute in ein Markup schreiben. Jede ID muss im Markup stehen und das Attribut schon tragen;
 * sonst hält die Funktion an (die Szene liefert dann ein Attribut, das das Markup nicht kennt).
 */
export function wendeAn(svg, liste) {
  const werte = new Map();
  for (const [id, attr, wert] of liste) {
    if (!werte.has(id)) werte.set(id, new Map());
    werte.get(id).set(attr, String(wert));
  }
  const gesehen = new Set();
  const aus = svg.replace(/<([a-zA-Z][\w:-]*)(\s[^<>]*?)?(\/?)>/g, (ganz, tag, attrs = '', zu) => {
    const idTreffer = /\sid="([^"]+)"/.exec(attrs);
    if (!idTreffer || !werte.has(idTreffer[1])) return ganz;
    const id = idTreffer[1];
    gesehen.add(id);
    let neu = attrs;
    for (const [attr, wert] of werte.get(id)) {
      const re = new RegExp(`(\\s${attr.replace(/[-:]/g, '\\$&')}=")[^"]*(")`);
      if (!re.test(neu)) throw new Error(`Standbild: #${id} trägt kein Attribut „${attr}“ im Markup`);
      neu = neu.replace(re, `$1${wert.replace(/\$/g, '$$$$')}$2`);
    }
    return `<${tag}${neu}${zu}>`;
  });
  for (const id of werte.keys()) if (!gesehen.has(id)) throw new Error(`Standbild: #${id} steht nicht im Markup`);
  return aus;
}

/** IDs und Attribute eines Markups: Map id → Set der Attributnamen; doppelte IDs werden gemeldet. */
export function idVerzeichnis(svg) {
  const ids = new Map();
  const doppelt = [];
  for (const m of svg.matchAll(/<([a-zA-Z][\w:-]*)(\s[^<>]*?)?\/?>/g)) {
    const attrs = m[2] ?? '';
    const id = /\sid="([^"]+)"/.exec(attrs)?.[1];
    if (!id) continue;
    if (ids.has(id)) doppelt.push(id);
    ids.set(id, new Set([...attrs.matchAll(/\s([\w:-]+)="/g)].map((a) => a[1])));
  }
  return { ids, doppelt };
}

/** Standbild einer Szene bei t: Module der Szene, liefert das vollständige SVG. */
export function standbild(szene, t) {
  const s = szene.animation.computeState(t);
  return wendeAn(szene.scene.sceneMarkup(), szene.scene.sceneApply(s));
}
