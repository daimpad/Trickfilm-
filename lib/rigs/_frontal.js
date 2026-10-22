// Fabrik für das frontale Rig (Zeigen, Erklären, Reagieren).
// Zustand: x, y (Hüfte), dir, deckkraft, torso (seitliche Neigung, zum Bild rechts positiv), head relativ,
// schulterL/schulterR Hub in px (negativ = hoch), armL/armR { upper, lower, hand, form },
// legL/legR { upper, lower, foot }. Arm- und Beinwinkel: 0 hängt, positiv = vom Körper weg.
import { ik } from '../motion.js';
import { setzeStartwerte } from './_profil.js';
import { gesicht, gesichtApply, gesichtMarkup } from '../mimik.js';
import { ankerFuer } from '../mimik-spezifikation.js';
import { SPEZ, archetyp, drehe, faerben, lokal, massstabVon, punkt, rundeZahl, teile, tf, welt } from './basis.js';

const SEITE = { armL: -1, armR: 1, legL: -1, legR: 1 };

export function frontalRig(name) {
  const a = archetyp(name);
  const s = a.segmente;
  const g = Object.fromEntries(Object.entries(a.gelenke).map(([k, v]) => [k, punkt(v)]));
  const formen = SPEZ.handformen;

  const defaults = {
    x: 0,
    y: 0,
    dir: 1,
    deckkraft: 1,
    torso: 0,
    head: 0,
    schulterL: 0,
    schulterR: 0,
    bob: 0,
    armL: { upper: 6, lower: 4, hand: 0, form: 'offen' },
    armR: { upper: 6, lower: 4, hand: 0, form: 'offen' },
    legL: { upper: 3, lower: 3, foot: 0 },
    legR: { upper: 3, lower: 3, foot: 0 },
  };

  /** Haltungen, die IK nicht liefert: vor dem Körper halten mit gesenkten Ellbogen (sonst Flügel). */
  const posen = {
    ruhe: { armL: { upper: 6, lower: 4 }, armR: { upper: 6, lower: 4 } },
    halten: { armL: { upper: 4, lower: -82, form: 'greifend' }, armR: { upper: 4, lower: -82, form: 'greifend' } },
    zeigenR: { armR: { upper: 70, lower: 86, form: 'zeigend' } },
    erklaeren: { armL: { upper: 18, lower: -30, form: 'offen' }, armR: { upper: 22, lower: -20, form: 'offen' } },
  };

  const voll = (state) => {
    const z = { ...defaults, ...state };
    for (const k of Object.keys(SEITE)) z[k] = { ...defaults[k], ...state[k] };
    return z;
  };

  // Ein Glied mit Winkel a auf Seite v zeigt in Richtung (v·sin a, cos a).
  const ende = (p, v, winkel, laenge) => ({
    x: p.x + v * Math.sin((winkel * Math.PI) / 180) * laenge,
    y: p.y + Math.cos((winkel * Math.PI) / 180) * laenge,
  });

  function lokaleGelenke(z) {
    const nacken = drehe(g.nacken, z.torso);
    // Kopfmitte: Sitz des Gesichts aus der Mimik-Spezifikation (Kopfform von satz-00), mit Rumpf und Kopf gedreht.
    const k = drehe(ankerFuer(name), z.torso + z.head);
    const p = { nacken, kopf: { x: nacken.x + k.x, y: nacken.y + k.y } };
    for (const arm of ['armL', 'armR']) {
      const v = SEITE[arm];
      const basis = arm === 'armL' ? g.schulterL : g.schulterR;
      const hub = arm === 'armL' ? z.schulterL : z.schulterR;
      const schulter = drehe({ x: basis.x, y: basis.y + hub }, z.torso);
      const ellbogen = ende(schulter, v, z[arm].upper, s.oberarm);
      p[arm] = { schulter, ellbogen, hand: ende(ellbogen, v, z[arm].lower, s.unterarm) };
    }
    for (const bein of ['legL', 'legR']) {
      const v = SEITE[bein];
      const huefte = bein === 'legL' ? g.huefteL : g.huefteR;
      const knie = ende(huefte, v, z[bein].upper, s.oberschenkel);
      const knoechel = ende(knie, v, z[bein].lower, s.unterschenkel);
      p[bein] = { huefte, knie, knoechel, sohle: { x: knoechel.x, y: knoechel.y + s.knoechel } };
    }
    return p;
  }

  function gelenke(state) {
    const z = voll(state);
    const m = massstabVon(a, { massstab: z.massstab });
    const l = lokaleGelenke(z);
    const w = (p) => welt(z, p, m);
    const aus = { nacken: w(l.nacken), kopf: w(l.kopf), huefte: w({ x: 0, y: 0 }) };
    for (const k of Object.keys(SEITE)) aus[k] = Object.fromEntries(Object.entries(l[k]).map(([n, v]) => [n, w(v)]));
    return aus;
  }

  /** Arm zu einem Weltziel; beugeseite +1 legt den Ellbogen nach außen. Für „vor dem Körper“ posen.halten nehmen. */
  function greife(state, arm, ziel, { beugeseite = 1, form, hand } = {}) {
    const z = voll(state);
    const m = massstabVon(a, { massstab: z.massstab });
    const v = SEITE[arm];
    const sch = lokaleGelenke(z)[arm].schulter;
    const zl = lokal(z, ziel, m);
    // In den Rahmen der Seite spiegeln, damit ik() mit (sin, cos) rechnet.
    const r = ik({ x: v * sch.x, y: sch.y }, { x: v * zl.x, y: zl.y }, s.oberarm, s.unterarm, beugeseite);
    return { upper: r.upper, lower: r.lower, hand: hand ?? z[arm].hand, form: form ?? z[arm].form, ziel: { x: ziel.x, y: ziel.y } };
  }

  /** Bein zu einem Knöchelziel in Weltkoordinaten, Knie nach außen; der Fußwinkel bleibt. */
  function fuss(state, bein, ziel) {
    const z = voll(state);
    const m = massstabVon(a, { massstab: z.massstab });
    const v = SEITE[bein];
    const h = bein === 'legL' ? g.huefteL : g.huefteR;
    const zl = lokal(z, ziel, m);
    const r = ik({ x: v * h.x, y: h.y }, { x: v * zl.x, y: zl.y }, s.oberschenkel, s.unterschenkel, 1);
    return { upper: r.upper, lower: r.lower, foot: z[bein].foot };
  }

  function pruefeReichweite(state) {
    const gw = gelenke(state);
    const befunde = [];
    for (const arm of ['armL', 'armR']) {
      const ziel = state[arm]?.ziel;
      if (!ziel) continue;
      const abstand = Math.hypot(gw[arm].hand.x - ziel.x, gw[arm].hand.y - ziel.y);
      if (abstand > 1.5) befunde.push({ arm, abstand: rundeZahl(abstand) });
    }
    return befunde;
  }

  const teil = (T, id) => {
    if (T[id] === undefined) throw new Error(`Rig ${name}: Teil „${id}“ fehlt im Teilesatz`);
    return T[id];
  };

  function gliedMarkup(T, P, k, mitHand) {
    const [l1, l2] = k.startsWith('arm') ? [s.oberarm, s.unterarm] : [s.oberschenkel, s.unterschenkel];
    const ende3 = mitHand
      ? `<g id="${P}-${k}-hand" transform="${tf(0, l2, 0)}">${formen
          .map((f) => `<g id="${P}-${k}-hand-${f}" opacity="${f === 'offen' ? 1 : 0}">${teil(T, `${k}-hand-${f}`)}</g>`)
          .join('')}</g>`
      : `<g id="${P}-${k}-foot" transform="${tf(0, l2, 0)}">${teil(T, `${k}-foot`)}</g>`;
    return (
      `<g id="${P}-${k}-upper" transform="${tf(0, 0, 0)}">${teil(T, `${k}-upper`)}` +
      `<g id="${P}-${k}-lower" transform="${tf(0, l1, 0)}">${teil(T, `${k}-lower`)}${ende3}</g></g>`
    );
  }

  /** teile: eigene Teile statt eines importierten Satzes (Vorschau der Teile-Werkstatt). */
  /** mimik: Gesicht in der Kopfgruppe (docs/MIMIK.md); ohne bleibt der Kopf ohne Gesicht. */
  function markup(P, { teilesatz = 'satz-00', teile: eigeneTeile, palette = {}, dir = 1, deckkraft = 1, massstab, mimik = false } = {}) {
    const T = eigeneTeile ?? teile(teilesatz, name);
    const ebenen = {
      torso: `<g id="${P}-torso" transform="${tf(0, 0, 0)}">${teil(T, 'torso')}</g>`,
      head: `<g id="${P}-head" transform="${tf(0, 0, 0)}">${teil(T, 'head')}${mimik ? gesichtMarkup(P, 'frontal', ankerFuer(name, teilesatz)) : ''}</g>`,
      armL: gliedMarkup(T, P, 'armL', true),
      armR: gliedMarkup(T, P, 'armR', true),
      legL: gliedMarkup(T, P, 'legL', false),
      legR: gliedMarkup(T, P, 'legR', false),
    };
    const roh = `<g id="${P}" transform="translate(0 0) scale(${dir} 1)" opacity="${deckkraft}">${a.ebenen.map((e) => ebenen[e]).join('')}</g>`;
    return setzeStartwerte(faerben(roh, palette), apply(P, { ...defaults, dir, deckkraft, massstab }));
  }

  function apply(P, state) {
    const z = voll(state);
    const m = massstabVon(a, { massstab: z.massstab });
    const l = lokaleGelenke(z);
    const r = rundeZahl;
    const aus = [
      [P, 'transform', `translate(${r(z.x)} ${r(z.y + m * z.bob)}) scale(${r(z.dir * m)} ${r(m)})`],
      [P, 'opacity', r(z.deckkraft)],
      [`${P}-torso`, 'transform', tf(0, 0, z.torso)],
      [`${P}-head`, 'transform', tf(l.nacken.x, l.nacken.y, z.torso + z.head)],
      ...(z.gesicht ? gesichtApply(P, gesicht(z.gesicht), 'frontal') : []),
    ];
    // SVG rotate(θ) dreht (0, 1) nach (−sin θ, cos θ); für Seite v gilt θ = −v·Winkel.
    for (const arm of ['armL', 'armR']) {
      const v = SEITE[arm];
      const { upper, lower, hand, form } = z[arm];
      if (!formen.includes(form)) throw new Error(`Rig ${name}: Handform „${form}“ unbekannt`);
      aus.push(
        [`${P}-${arm}-upper`, 'transform', tf(l[arm].schulter.x, l[arm].schulter.y, -v * upper)],
        [`${P}-${arm}-lower`, 'transform', tf(0, s.oberarm, -v * (lower - upper))],
        [`${P}-${arm}-hand`, 'transform', tf(0, s.unterarm, -v * hand)],
        ...formen.map((f) => [`${P}-${arm}-hand-${f}`, 'opacity', f === form ? 1 : 0]),
      );
    }
    for (const bein of ['legL', 'legR']) {
      const v = SEITE[bein];
      const { upper, lower, foot } = z[bein];
      aus.push(
        [`${P}-${bein}-upper`, 'transform', tf(l[bein].huefte.x, l[bein].huefte.y, -v * upper)],
        [`${P}-${bein}-lower`, 'transform', tf(0, s.oberschenkel, -v * (lower - upper))],
        [`${P}-${bein}-foot`, 'transform', tf(0, s.unterschenkel, -v * (foot - lower))],
      );
    }
    return aus;
  }

  const rahmen = { x0: -200, y0: -240, x1: 200, y1: a.huefte_ueber_boden + 20 };

  return { name, ansicht: 'frontal', spez: a, defaults, posen, markup, apply, gelenke, greife, fuss, pruefeReichweite, rahmen };
}
