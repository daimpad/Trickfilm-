// Mimik (docs/MIMIK.md): ein reduziertes Gesicht aus Punktaugen, Brauen und Mund, gerechnet aus wenigen Zahlen.
// Wahlweise je Figur (mimik: an im Brief); ohne bleibt die Figur ohne Gesicht. DOM-frei.
//   blick   { x, y } in −1 … 1, Pupille zur Seite und nach unten (y positiv)
//   lid     0 offen … 1 geschlossen
//   braue   { winkel } in Grad, positiv senkt das innere Ende (Ärger), negativ hebt es (Sorge, Staunen);
//           { hoehe } in −1 … 1, hebt beide Brauen
//   mund    { kruemmung } −1 … 1, positiv lächelt; { breite } 0,5 … 1,3; { offen } 0 … 1
// Geometrie im Einheitsrahmen des Kopfes (Kopfmitte 0/0, Radius 1); die Gruppe des Gesichts verschiebt und skaliert
// auf den Anker aus lib/mimik-spezifikation.js. So dreht und spiegelt das Gesicht mit dem Kopf.
import { inOut } from './easing.js';
import { interp } from './motion.js';
import { prng } from './zufall.js';
import { FARBEN, STRICH } from '../tokens/tokens.js';

export const NEUTRAL = { blick: { x: 0, y: 0 }, lid: 0.1, braue: { winkel: 0, hoehe: 0 }, mund: { kruemmung: 0.1, breite: 1, offen: 0 } };

// Benannte Ausdrücke; jeder trägt nur, was vom Neutralen abweicht. Die Namen folgen der Spielweise (lib/spielweise.js).
export const AUSDRUECKE = {
  neutral: {},
  konzentriert: { blick: { x: 0.3, y: 0.5 }, lid: 0.35, braue: { winkel: 12, hoehe: -0.15 }, mund: { kruemmung: -0.05, breite: 0.8 } },
  freude: { lid: 0.15, braue: { winkel: -6, hoehe: 0.15 }, mund: { kruemmung: 0.9, breite: 1.15, offen: 0.15 } },
  erleichtert: { lid: 0.35, braue: { winkel: -10, hoehe: 0.1 }, mund: { kruemmung: 0.5 } },
  staunen: { lid: 0, braue: { winkel: -8, hoehe: 0.5 }, mund: { kruemmung: 0, breite: 0.55, offen: 0.8 } },
  zweifel: { blick: { x: 0.5, y: -0.4 }, lid: 0.25, braue: { winkel: -14, hoehe: 0.1 }, mund: { kruemmung: -0.35, breite: 0.8 } },
  aerger: { lid: 0.3, braue: { winkel: 22, hoehe: -0.2 }, mund: { kruemmung: -0.6, breite: 0.9 } },
  muede: { blick: { x: 0, y: 0.3 }, lid: 0.6, braue: { winkel: -4, hoehe: -0.1 }, mund: { kruemmung: -0.1, breite: 0.8 } },
};

/** Vollständiges Gesicht aus einem Namen oder einem Teilobjekt; ein unbekannter Name hält an. */
export function gesicht(a = 'neutral') {
  const teil = typeof a === 'string' ? AUSDRUECKE[a] : a;
  if (!teil) throw new Error(`Mimik: Ausdruck „${a}“ unbekannt; bekannt: ${Object.keys(AUSDRUECKE).join(', ')}`);
  return {
    blick: { ...NEUTRAL.blick, ...teil.blick },
    lid: teil.lid ?? NEUTRAL.lid,
    braue: { ...NEUTRAL.braue, ...teil.braue },
    mund: { ...NEUTRAL.mund, ...teil.mund },
  };
}

const lerp = (a, b, u) => a + (b - a) * u;

/** Zwei Gesichter mischen, u = 0 ergibt a, u = 1 ergibt b. */
export function mische(a, b, u) {
  const p = gesicht(a);
  const q = gesicht(b);
  return {
    blick: { x: lerp(p.blick.x, q.blick.x, u), y: lerp(p.blick.y, q.blick.y, u) },
    lid: lerp(p.lid, q.lid, u),
    braue: { winkel: lerp(p.braue.winkel, q.braue.winkel, u), hoehe: lerp(p.braue.hoehe, q.braue.hoehe, u) },
    mund: { kruemmung: lerp(p.mund.kruemmung, q.mund.kruemmung, u), breite: lerp(p.mund.breite, q.mund.breite, u), offen: lerp(p.mund.offen, q.mund.offen, u) },
  };
}

/**
 * Gesicht bei t aus Schlüsseln [[t, ausdruck], …] (Name oder Teilobjekt), verbunden mit inOut; das Format, das der
 * Mimik-Editor ausgibt. Vor dem ersten und nach dem letzten Schlüssel gilt dieser.
 */
export function mimikZustand(schluessel, t, ease = inOut) {
  if (!schluessel?.length) throw new Error('Mimik: keine Schlüssel');
  if (t <= schluessel[0][0] || schluessel.length === 1) return gesicht(schluessel[0][1]);
  for (let i = 1; i < schluessel.length; i++) {
    const [t1, b] = schluessel[i];
    if (t < t1) {
      const [t0, a] = schluessel[i - 1];
      return mische(a, b, interp(t, [t0, t1], [0, 1], ease));
    }
  }
  return gesicht(schluessel[schluessel.length - 1][1]);
}

export const BLINZELN = { abstand: [3, 6], schliessen: 0.06, oeffnen: 0.09, start: 0.8 };

/**
 * Lidschluss durch Blinzeln bei t, 0 … 1. Die Zeitpunkte folgen einem PRNG mit festem Seed (Abstände 3 bis 6 s);
 * extra nennt weitere Zeitpunkte, etwa kurz vor einem Blickwechsel. Reine Funktion von t.
 */
export function blinzeln(t, seed, { extra = [], ...o } = {}) {
  const b = { ...BLINZELN, ...o };
  const ziehe = prng(`blinzeln:${seed}`);
  const zeiten = [...extra];
  for (let s = b.start + ziehe() * b.abstand[0]; s <= t + b.oeffnen; s += lerp(b.abstand[0], b.abstand[1], ziehe())) zeiten.push(s);
  let lid = 0;
  for (const s of zeiten) {
    const d = t - s;
    if (d < 0 || d > b.schliessen + b.oeffnen) continue;
    lid = Math.max(lid, d < b.schliessen ? d / b.schliessen : 1 - (d - b.schliessen) / b.oeffnen);
  }
  return lid;
}

/** Gesicht mit Blinzeln: das Lid schließt vom gegebenen Wert aus ganz. */
export const mitBlinzeln = (g, b) => ({ ...g, lid: g.lid + (1 - g.lid) * b });

// Maße im Einheitsrahmen (Radius 1). Profil: Merkmale nach vorn verschoben, ein Auge, halber Mund.
const MASS = {
  profil: { augen: [{ x: 0.42, innen: 1 }], augeY: -0.1, mundX: 0.5, mundB: 0.16, blickX: 0.06 },
  frontal: { augen: [{ x: -0.34, innen: 1 }, { x: 0.34, innen: -1 }], augeY: -0.08, mundX: 0, mundB: 0.26, blickX: 0.1 },
};
export const AUGE_R = 0.11;
const BRAUE_L = 0.2;
const r3 = (v) => Number(v.toFixed(3));

/** Markup des Gesichts für Figur P; liegt in der Kopfgruppe. Alle bewegten Attribute stehen schon im Markup. */
export function gesichtMarkup(P, ansicht, anker) {
  const m = MASS[ansicht];
  if (!m) throw new Error(`Mimik: Ansicht „${ansicht}“ unbekannt`);
  const strich = r3(STRICH.detail / anker.r);
  const k = FARBEN.schwarz;
  const augen = m.augen
    .map((_, i) => `<ellipse id="${P}-auge-${i + 1}" cx="0" cy="0" rx="${AUGE_R}" ry="${AUGE_R}" fill="${k}"/>` + `<path id="${P}-braue-${i + 1}" d="M0 0" fill="none" stroke="${k}" stroke-width="${strich}" stroke-linecap="round"/>`)
    .join('');
  const mund = `<path id="${P}-mund" d="M0 0" fill="none" stroke="${k}" stroke-width="${strich}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const g = `<g id="${P}-gesicht" transform="translate(${anker.x} ${anker.y}) scale(${anker.r})">${augen}${mund}</g>`;
  return setze(g, gesichtApply(P, gesicht(), ansicht));
}

/** Startwerte aus der Liste in das Markup schreiben. */
function setze(svg, liste) {
  let aus = svg;
  for (const [id, attr, wert] of liste) aus = aus.replace(new RegExp(`(id="${id}"[^>]*?\\s${attr}=")[^"]*(")`), `$1${wert}$2`);
  return aus;
}

/** Liste [id, attribut, wert] für das Gesicht g (vollständig, siehe gesicht()). */
export function gesichtApply(P, g, ansicht) {
  const m = MASS[ansicht];
  if (!m) throw new Error(`Mimik: Ansicht „${ansicht}“ unbekannt`);
  const aus = [];
  const lid = Math.min(1, Math.max(0, g.lid));
  m.augen.forEach((a, i) => {
    const n = i + 1;
    const ex = a.x + g.blick.x * m.blickX;
    const ey = m.augeY + g.blick.y * 0.08;
    aus.push([`${P}-auge-${n}`, 'cx', r3(ex)], [`${P}-auge-${n}`, 'cy', r3(ey)], [`${P}-auge-${n}`, 'rx', r3(AUGE_R * (1 + 0.25 * lid))], [`${P}-auge-${n}`, 'ry', r3(AUGE_R * Math.max(0.08, 1 - lid))]);
    // Braue über dem Auge; ihr inneres Ende zeigt zur Gesichtsmitte (im Profil nach vorn).
    const bx = a.x;
    const by = m.augeY - 0.36 - g.braue.hoehe * 0.14;
    const w = (g.braue.winkel * Math.PI) / 180;
    const dx = BRAUE_L * Math.cos(w) * a.innen;
    const dy = BRAUE_L * Math.sin(w);
    aus.push([`${P}-braue-${n}`, 'd', `M${r3(bx - dx)} ${r3(by - dy)} L${r3(bx + dx)} ${r3(by + dy)}`]);
  });
  // Mund aus kubischen Kurven: offen schließt eine untere Kurve an und füllt die Form. Frontal steigen oder fallen
  // beide Winkel; im Profil nur der hintere, das vordere Ende sitzt fest an der Kopfkontur.
  const my = 0.42;
  const b = m.mundB * g.mund.breite;
  const k = g.mund.kruemmung;
  const o = g.mund.offen;
  const offen = o > 0.02;
  const p = (x, y) => `${r3(x)} ${r3(y)}`;
  let d;
  if (ansicht === 'frontal') {
    const ecke = my - k * 0.06;
    const yo = ecke + k * 0.32 - o * 0.22;
    const yu = ecke + k * 0.32 + o * 0.3;
    const l = p(m.mundX - b, ecke);
    const r = p(m.mundX + b, ecke);
    d = `M${l} C${p(m.mundX - b * 0.5, yo)} ${p(m.mundX + b * 0.5, yo)} ${r}` + (offen ? ` C${p(m.mundX + b * 0.5, yu)} ${p(m.mundX - b * 0.5, yu)} ${l} Z` : '');
  } else {
    const hinten = p(m.mundX - b, my - k * 0.14);
    const vorn = p(m.mundX + b, my);
    const yo = my + k * 0.05 - o * 0.1;
    const yu = my + k * 0.05 + o * 0.32;
    d = `M${hinten} C${p(m.mundX - b * 0.3, yo)} ${p(m.mundX + b * 0.4, yo)} ${vorn}` + (offen ? ` C${p(m.mundX + b * 0.4, yu)} ${p(m.mundX - b * 0.3, yu)} ${hinten} Z` : '');
  }
  aus.push([`${P}-mund`, 'd', d], [`${P}-mund`, 'fill', offen ? FARBEN.schwarz : 'none']);
  return aus;
}
