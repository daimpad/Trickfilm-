// Fabrik für Rigs im Profil (sitzend, stehend, oberkörper-nah).
// Zustand im Figurenrahmen, Blick nach rechts; die Spiegelung für dir = −1 übernimmt das Rig,
// Winkel aus walkCycle und ik gehen deshalb unverändert hinein (kein −dir in der Szene).
//   x, y        Hüfte in der Welt; dir 1 rechts, −1 links; deckkraft
//   torso       Rumpfneigung, vorwärts positiv; head relativ zum Rumpf; schulter Hub in px
//   armF/armB   { upper, lower } absolut, { hand } relativ zum Unterarm, form offen|greifend|zeigend
//   legF/legB   { upper, lower, foot } absolut; foot positiv = Zehen hoch
//   bob         Hüfte sinkt um bob (Figurenmaß), vom Gang geliefert
import { ik } from '../motion.js';
import { gesicht, gesichtApply, gesichtMarkup } from '../mimik.js';
import { ankerFuer } from '../mimik-spezifikation.js';
import { SPEZ, archetyp, drehe, faerben, lokal, massstabVon, punkt, rundeZahl, teile, tf, welt } from './basis.js';

const ARME = ['armF', 'armB'];
const BEINE = ['legF', 'legB'];

export function profilRig(name) {
  const a = archetyp(name);
  const s = a.segmente;
  const mitBeinen = a.beine !== 'keine';
  const gelenk = Object.fromEntries(Object.entries(a.gelenke).map(([k, v]) => [k, punkt(v)]));
  const formen = SPEZ.handformen;

  /** Ruhelage der Beine im Sitzen: Füße auf dem Boden, Knie vorn (IK zum Fußziel). */
  function sitzBeine() {
    const aus = {};
    for (const bein of BEINE) {
      const h = gelenk[bein === 'legF' ? 'huefteF' : 'huefteB'];
      const [fx, fy] = a.fussziel[bein];
      const r = ik(h, { x: fx, y: fy }, s.oberschenkel, s.unterschenkel, 1);
      aus[bein] = { upper: rundeZahl(r.upper), lower: rundeZahl(r.lower), foot: 0 };
    }
    return aus;
  }

  const defaults = {
    x: 0,
    y: 0,
    dir: 1,
    deckkraft: 1,
    torso: 0,
    head: 0,
    schulter: 0,
    bob: 0,
    armF: { upper: 4, lower: 8, hand: 0, form: 'offen' },
    armB: { upper: -4, lower: 4, hand: 0, form: 'offen' },
    ...(mitBeinen
      ? a.beine === 'statisch'
        ? sitzBeine()
        : { legF: { upper: 0, lower: 0, foot: 0 }, legB: { upper: 0, lower: 0, foot: 0 } }
      : {}),
  };

  const voll = (state) => {
    const z = { ...defaults, ...state };
    for (const k of [...ARME, ...(mitBeinen ? BEINE : [])]) z[k] = { ...defaults[k], ...state[k] };
    return z;
  };

  /** Lokale Gelenkpunkte (Figurenrahmen, ohne bob) aus dem vollständigen Zustand. */
  function lokaleGelenke(z) {
    const schulter = drehe({ x: gelenk.schulter.x, y: gelenk.schulter.y + z.schulter }, z.torso);
    const nacken = drehe(gelenk.nacken, z.torso);
    const p = { schulter, nacken };
    for (const arm of ARME) {
      const { upper, lower } = z[arm];
      const ell = { x: schulter.x + Math.sin((upper * Math.PI) / 180) * s.oberarm, y: schulter.y + Math.cos((upper * Math.PI) / 180) * s.oberarm };
      const hand = { x: ell.x + Math.sin((lower * Math.PI) / 180) * s.unterarm, y: ell.y + Math.cos((lower * Math.PI) / 180) * s.unterarm };
      p[arm] = { schulter, ellbogen: ell, hand };
    }
    if (mitBeinen) {
      for (const bein of BEINE) {
        const h = gelenk[bein === 'legF' ? 'huefteF' : 'huefteB'];
        const { upper, lower } = z[bein];
        const knie = { x: h.x + Math.sin((upper * Math.PI) / 180) * s.oberschenkel, y: h.y + Math.cos((upper * Math.PI) / 180) * s.oberschenkel };
        const knoechel = { x: knie.x + Math.sin((lower * Math.PI) / 180) * s.unterschenkel, y: knie.y + Math.cos((lower * Math.PI) / 180) * s.unterschenkel };
        p[bein] = { huefte: h, knie, knoechel, sohle: { x: knoechel.x, y: knoechel.y + s.knoechel } };
      }
    }
    return p;
  }

  /** Gelenke in Weltkoordinaten. */
  function gelenke(state, opts = {}) {
    const z = voll(state);
    const m = massstabVon(a, opts);
    const l = lokaleGelenke(z);
    const w = (p) => welt(z, p, m);
    const aus = { schulter: w(l.schulter), nacken: w(l.nacken), huefte: w({ x: 0, y: 0 }) };
    for (const arm of ARME) aus[arm] = { schulter: w(l[arm].schulter), ellbogen: w(l[arm].ellbogen), hand: w(l[arm].hand) };
    if (mitBeinen) for (const b of BEINE) aus[b] = Object.fromEntries(Object.entries(l[b]).map(([k, v]) => [k, w(v)]));
    return aus;
  }

  /**
   * Arm zu einem Handziel in Weltkoordinaten. Der Zustand muss Rumpf und Schulter schon tragen.
   * Liefert { upper, lower, hand, form, ziel }; ziel bleibt für die Reichweitenprüfung stehen.
   */
  function greife(state, arm, ziel, { beugeseite = -1, form, hand } = {}) {
    const z = voll(state);
    const m = massstabVon(a, opts(state));
    const schulter = lokaleGelenke(z).schulter;
    const r = ik(schulter, lokal(z, ziel, m), s.oberarm, s.unterarm, beugeseite);
    return { upper: r.upper, lower: r.lower, hand: hand ?? z[arm].hand, form: form ?? z[arm].form, ziel: { x: ziel.x, y: ziel.y } };
  }
  const opts = (state) => ({ massstab: state.massstab });

  /** Bein zu einem Knöchelziel in Weltkoordinaten, Knie nach vorn; der Fußwinkel bleibt. */
  function fuss(state, bein, ziel) {
    if (!mitBeinen) throw new Error(`Rig ${name}: hat keine Beine`);
    const z = voll(state);
    const m = massstabVon(a, opts(state));
    const h = gelenk[bein === 'legF' ? 'huefteF' : 'huefteB'];
    const r = ik(h, lokal(z, ziel, m), s.oberschenkel, s.unterschenkel, 1);
    return { upper: r.upper, lower: r.lower, foot: z[bein].foot };
  }

  /** Handziele, die nicht erreicht werden (Abstand in Weltpixeln). */
  function pruefeReichweite(state, o = {}) {
    const g = gelenke(state, { massstab: state.massstab ?? o.massstab });
    const befunde = [];
    for (const arm of ARME) {
      const ziel = state[arm]?.ziel;
      if (!ziel) continue;
      const abstand = Math.hypot(g[arm].hand.x - ziel.x, g[arm].hand.y - ziel.y);
      if (abstand > 1.5) befunde.push({ arm, abstand: rundeZahl(abstand) });
    }
    return befunde;
  }

  function teilMarkup(T, id, prefix) {
    const svg = T[id];
    if (svg === undefined) throw new Error(`Rig ${name}: Teil „${id}“ fehlt im Teilesatz`);
    return svg;
  }

  function armMarkup(T, P, arm) {
    const varianten = formen
      .map((f) => `<g id="${P}-${arm}-hand-${f}" opacity="${f === 'offen' ? 1 : 0}">${teilMarkup(T, `${arm}-hand-${f}`)}</g>`)
      .join('');
    return (
      `<g id="${P}-${arm}-upper" transform="${tf(0, 0, 0)}">${teilMarkup(T, `${arm}-upper`)}` +
      `<g id="${P}-${arm}-lower" transform="${tf(0, s.oberarm, 0)}">${teilMarkup(T, `${arm}-lower`)}` +
      `<g id="${P}-${arm}-hand" transform="${tf(0, s.unterarm, 0)}">${varianten}</g></g></g>`
    );
  }

  function beinMarkup(T, P, bein) {
    return (
      `<g id="${P}-${bein}-upper" transform="${tf(0, 0, 0)}">${teilMarkup(T, `${bein}-upper`)}` +
      `<g id="${P}-${bein}-lower" transform="${tf(0, s.oberschenkel, 0)}">${teilMarkup(T, `${bein}-lower`)}` +
      `<g id="${P}-${bein}-foot" transform="${tf(0, s.unterschenkel, 0)}">${teilMarkup(T, `${bein}-foot`)}</g></g></g>`
    );
  }

  /** Markup der Figur; Startwerte aller bewegten Attribute stammen aus apply(defaults). */
  /** teile: eigene Teile statt eines importierten Satzes (Vorschau der Teile-Werkstatt). */
  /** mimik: Gesicht in der Kopfgruppe (docs/MIMIK.md); ohne bleibt der Kopf ohne Gesicht. */
  function markup(P, { teilesatz = 'satz-00', teile: eigeneTeile, palette = {}, dir = 1, deckkraft = 1, massstab, mimik = false } = {}) {
    const T = eigeneTeile ?? teile(teilesatz, name);
    const ebenen = {
      torso: `<g id="${P}-torso" transform="${tf(0, 0, 0)}">${teilMarkup(T, 'torso')}</g>`,
      head: `<g id="${P}-head" transform="${tf(0, 0, 0)}">${teilMarkup(T, 'head')}${mimik ? gesichtMarkup(P, 'profil', ankerFuer(name, teilesatz)) : ''}</g>`,
      armF: armMarkup(T, P, 'armF'),
      armB: armMarkup(T, P, 'armB'),
      legF: mitBeinen ? beinMarkup(T, P, 'legF') : '',
      legB: mitBeinen ? beinMarkup(T, P, 'legB') : '',
    };
    const roh = `<g id="${P}" transform="translate(0 0) scale(${dir} 1)" opacity="${deckkraft}">${a.ebenen.map((e) => ebenen[e]).join('')}</g>`;
    const start = apply(P, { ...defaults, dir, deckkraft, massstab });
    return setzeStartwerte(faerben(roh, palette), start);
  }

  /** Reine Liste [id, attribut, wert] für den Zustand. */
  function apply(P, state, o = {}) {
    const z = voll(state);
    const m = massstabVon(a, { massstab: state.massstab ?? o.massstab });
    const l = lokaleGelenke(z);
    const r = rundeZahl;
    const aus = [
      [P, 'transform', `translate(${r(z.x)} ${r(z.y + m * z.bob)}) scale(${r(z.dir * m)} ${r(m)})`],
      [P, 'opacity', r(z.deckkraft)],
      [`${P}-torso`, 'transform', tf(0, 0, z.torso)],
      [`${P}-head`, 'transform', tf(l.nacken.x, l.nacken.y, z.torso + z.head)],
      ...(z.gesicht ? gesichtApply(P, gesicht(z.gesicht), 'profil') : []),
    ];
    for (const arm of ARME) {
      const { upper, lower, hand, form } = z[arm];
      if (!formen.includes(form)) throw new Error(`Rig ${name}: Handform „${form}“ unbekannt`);
      aus.push(
        [`${P}-${arm}-upper`, 'transform', tf(l.schulter.x, l.schulter.y, -upper)],
        [`${P}-${arm}-lower`, 'transform', tf(0, s.oberarm, -(lower - upper))],
        [`${P}-${arm}-hand`, 'transform', tf(0, s.unterarm, -hand)],
        ...formen.map((f) => [`${P}-${arm}-hand-${f}`, 'opacity', f === form ? 1 : 0]),
      );
    }
    if (mitBeinen) {
      for (const bein of BEINE) {
        const { upper, lower, foot } = z[bein];
        const h = gelenk[bein === 'legF' ? 'huefteF' : 'huefteB'];
        aus.push(
          [`${P}-${bein}-upper`, 'transform', tf(h.x, h.y, -upper)],
          [`${P}-${bein}-lower`, 'transform', tf(0, s.oberschenkel, -(lower - upper))],
          [`${P}-${bein}-foot`, 'transform', tf(0, s.unterschenkel, -(foot - lower))],
        );
      }
    }
    return aus;
  }

  /** Lokaler Rahmen der Figur für Bildausschnitte (Testposen, Kontaktbögen). */
  const rahmen = mitBeinen ? { x0: -170, y0: -240, x1: 230, y1: (a.huefte_ueber_boden ?? 140) + 20 } : { x0: -170, y0: -240, x1: 230, y1: 40 };

  return { name, ansicht: 'profil', spez: a, defaults, markup, apply, gelenke, greife, fuss, pruefeReichweite, rahmen };
}

/** Startwerte in das Markup schreiben, damit jedes bewegte Attribut dort schon steht. */
export function setzeStartwerte(svg, liste) {
  const werte = new Map();
  for (const [id, attr, wert] of liste) {
    if (!werte.has(id)) werte.set(id, new Map());
    werte.get(id).set(attr, String(wert));
  }
  return svg.replace(/<g id="([^"]+)"([^>]*)>/g, (ganz, id, rest) => {
    const w = werte.get(id);
    if (!w) return ganz;
    let neu = rest;
    for (const [attr, wert] of w) {
      const re = new RegExp(`\\s${attr}="[^"]*"`);
      neu = re.test(neu) ? neu.replace(re, ` ${attr}="${wert}"`) : `${neu} ${attr}="${wert}"`;
    }
    return `<g id="${id}"${neu}>`;
  });
}
