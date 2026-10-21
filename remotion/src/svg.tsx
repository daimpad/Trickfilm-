// Markup einer Szene als JSX: einmal in einen Baum gelesen, je Bild mit den Attributen aus sceneApply als Props
// gerendert. Attributnamen werden zu React-Schreibweise (stroke-width → strokeWidth, class → className).
import React from 'react';

export type Knoten = { tag: string; attrs: Record<string, string>; kinder: (Knoten | string)[] };
export type Zuordnung = Map<string, Record<string, string>>;

const ENTITAETEN: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const entschluessle = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (ganz, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
    return ENTITAETEN[e] ?? ganz;
  });

/** SVG-Markup in einen Baum lesen; Kommentare und Verarbeitungsanweisungen werden übergangen. */
export function lies(markup: string): Knoten {
  const wurzel: Knoten = { tag: '#wurzel', attrs: {}, kinder: [] };
  const stapel: Knoten[] = [wurzel];
  const muster = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/([\w:-]+)\s*>|<([\w:-]+)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = muster.exec(markup))) {
    const oben = stapel[stapel.length - 1]!;
    if (m[1]) {
      if (oben.tag !== m[1]) throw new Error(`SVG: </${m[1]}> schließt <${oben.tag}>`);
      stapel.pop();
    } else if (m[2]) {
      const attrs: Record<string, string> = {};
      for (const a of (m[3] ?? '').matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[a[1]!] = entschluessle(a[2]!);
      const k: Knoten = { tag: m[2], attrs, kinder: [] };
      oben.kinder.push(k);
      if (!m[4]) stapel.push(k);
    } else if (m[5] && m[5].trim()) {
      oben.kinder.push(entschluessle(m[5]));
    }
  }
  if (stapel.length !== 1) throw new Error(`SVG: <${stapel[stapel.length - 1]!.tag}> nicht geschlossen`);
  const svg = wurzel.kinder.find((k): k is Knoten => typeof k !== 'string');
  if (!svg) throw new Error('SVG: kein Element im Markup');
  return svg;
}

/** Attributname in React-Schreibweise. */
export function propName(name: string): string {
  if (name === 'class') return 'className';
  if (name.startsWith('aria-') || name.startsWith('data-')) return name;
  if (name === 'xlink:href') return 'xlinkHref';
  if (name === 'xml:space') return 'xmlSpace';
  return name.replace(/[-:]([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Liste [id, attribut, wert] aus sceneApply als Zuordnung id → Attribute; unbekannte IDs halten an. */
export function zuordnung(liste: [string, string, string | number][], ids: Set<string>): Zuordnung {
  const z: Zuordnung = new Map();
  for (const [id, attr, wert] of liste) {
    if (!ids.has(id)) throw new Error(`Szene: #${id} steht nicht im Markup`);
    z.set(id, { ...(z.get(id) ?? {}), [attr]: String(wert) });
  }
  return z;
}

/** Alle IDs eines Baums. */
export function ids(k: Knoten, aus = new Set<string>()): Set<string> {
  if (k.attrs.id) aus.add(k.attrs.id);
  for (const c of k.kinder) if (typeof c !== 'string') ids(c, aus);
  return aus;
}

/** Baum als React-Elemente, mit den Attributen der Zuordnung über denen des Markups. */
export function alsJsx(k: Knoten, z: Zuordnung, schluessel: string | number = 0): React.ReactElement {
  const attrs = k.attrs.id && z.has(k.attrs.id) ? { ...k.attrs, ...z.get(k.attrs.id) } : k.attrs;
  const props: Record<string, string | number> = { key: schluessel };
  for (const [name, wert] of Object.entries(attrs)) props[propName(name)] = wert;
  const kinder = k.kinder.map((c, i) => (typeof c === 'string' ? c : alsJsx(c, z, i)));
  return React.createElement(k.tag, props, ...kinder);
}
