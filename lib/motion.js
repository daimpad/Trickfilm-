// Bewegung als reine Funktion der Zeit: Interpolation, Hüllkurven, Bahnen, IK/FK, Gang.
// Winkel in Grad im Figurenrahmen: x zeigt in Blickrichtung, y nach unten,
// ein Glied mit Winkel a zeigt in Richtung (sin a, cos a): 0 hängt, 90 zeigt nach vorn.
import { inOut, linear } from './easing.js';

/** Strecke eines Doppelschritts in px bei massstab 1. */
export const DOPPELSCHRITT_PX = 140;

const RAD = Math.PI / 180;
const klemme = (x, a, b) => (x < a ? a : x > b ? b : x);

/**
 * Wie Remotions interpolate() mit clamp an beiden Enden; auch mit mehr als zwei Stützstellen.
 * Die Kurve gilt je Abschnitt.
 */
export function interp(t, zeiten, werte, ease = linear) {
  if (zeiten.length !== werte.length || zeiten.length < 2) {
    throw new Error('interp: Zeiten und Werte brauchen gleiche Länge ≥ 2');
  }
  if (t <= zeiten[0]) return werte[0];
  const n = zeiten.length - 1;
  if (t >= zeiten[n]) return werte[n];
  let i = 0;
  while (t > zeiten[i + 1]) i++;
  const u = (t - zeiten[i]) / (zeiten[i + 1] - zeiten[i]);
  return werte[i] + (werte[i + 1] - werte[i]) * ease(u);
}

/** Schlüsselposen [t, x, y] zu einem Punkt, je Abschnitt mit inOut verbunden. */
export function schluessel(t, posen, ease = inOut) {
  const zeiten = posen.map((p) => p[0]);
  return { x: interp(t, zeiten, posen.map((p) => p[1]), ease), y: interp(t, zeiten, posen.map((p) => p[2]), ease) };
}

/** Hüllkurve über [an0, an1, ab0, ab1]: steigt 0→1, hält, fällt 1→0. */
export function envelope(t, [an0, an1, ab0, ab1], ease = inOut) {
  if (t <= an0 || t >= ab1) return 0;
  if (t < an1) return ease((t - an0) / (an1 - an0));
  if (t <= ab0) return 1;
  return 1 - ease((t - ab0) / (ab1 - ab0));
}

/** Kurzer Puls um mitte mit voller Breite breite: 0 → 1 → 0. */
export function pulse(t, mitte, breite) {
  const u = (t - mitte) / (breite / 2);
  if (Math.abs(u) >= 1) return 0;
  return 0.5 + 0.5 * Math.cos(Math.PI * u);
}

/** Quadratische Bézierbahn: Punkt bei s in [0, 1]. */
export function bezier2(p0, p1, p2, s) {
  const u = klemme(s, 0, 1);
  const a = (1 - u) ** 2;
  const b = 2 * (1 - u) * u;
  const c = u ** 2;
  return { x: a * p0.x + b * p1.x + c * p2.x, y: a * p0.y + b * p1.y + c * p2.y };
}

/** Punkt auf einer Polylinie bei s in [0, 1] nach Bogenlänge. */
export function entlang(punkte, s) {
  if (punkte.length === 1) return { ...punkte[0] };
  const laengen = [];
  let gesamt = 0;
  for (let i = 1; i < punkte.length; i++) {
    const l = Math.hypot(punkte[i].x - punkte[i - 1].x, punkte[i].y - punkte[i - 1].y);
    laengen.push(l);
    gesamt += l;
  }
  let rest = klemme(s, 0, 1) * gesamt;
  for (let i = 0; i < laengen.length; i++) {
    if (rest <= laengen[i] || i === laengen.length - 1) {
      const u = laengen[i] === 0 ? 0 : rest / laengen[i];
      const a = punkte[i];
      const b = punkte[i + 1];
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
    }
    rest -= laengen[i];
  }
  return { ...punkte[punkte.length - 1] };
}

/** Richtung eines Glieds mit Winkel a. */
export function richtung(a) {
  return { x: Math.sin(a * RAD), y: Math.cos(a * RAD) };
}

/** Winkel des Vektors von p nach q im Gliederrahmen. */
export function winkelZu(p, q) {
  return Math.atan2(q.x - p.x, q.y - p.y) / RAD;
}

/** Vorwärtskinematik: Punkte einer Kette ab ursprung mit absoluten Winkeln. */
export function fk(ursprung, laengen, winkel) {
  const punkte = [{ ...ursprung }];
  let p = ursprung;
  for (let i = 0; i < laengen.length; i++) {
    const r = richtung(winkel[i]);
    p = { x: p.x + r.x * laengen[i], y: p.y + r.y * laengen[i] };
    punkte.push(p);
  }
  return punkte;
}

/**
 * Zweigliedrige IK im Figurenrahmen. beugeseite −1 legt den Ellbogen nach unten und hinten
 * (Arm, der nach vorn greift), +1 nach vorn (Knie). Liefert absolute Winkel; liegt das Ziel
 * außer Reichweite, streckt sich das Glied zum Ziel hin und erreicht = false.
 */
export function ik(schulter, ziel, oberarm, unterarm, beugeseite = -1) {
  const d = Math.hypot(ziel.x - schulter.x, ziel.y - schulter.y);
  const dMax = oberarm + unterarm - 1e-6;
  const dMin = Math.abs(oberarm - unterarm) + 1e-6;
  const dEff = klemme(d, dMin, dMax);
  const phi = d === 0 ? 0 : winkelZu(schulter, ziel);
  const cosAlpha = (oberarm ** 2 + dEff ** 2 - unterarm ** 2) / (2 * oberarm * dEff);
  const alpha = Math.acos(klemme(cosAlpha, -1, 1)) / RAD;
  const upper = phi + beugeseite * alpha;
  const [, ellbogen] = fk(schulter, [oberarm], [upper]);
  const zielEff = d === 0 ? ziel : { x: schulter.x + ((ziel.x - schulter.x) * dEff) / d, y: schulter.y + ((ziel.y - schulter.y) * dEff) / d };
  const lower = winkelZu(ellbogen, zielEff);
  const [, , hand] = fk(schulter, [oberarm, unterarm], [upper, lower]);
  return { upper, lower, ellbogen, hand, erreicht: d <= oberarm + unterarm + 0.5 };
}

/** Maße für den Gang, je Figur; eine Figur mit eigenem Maß übergibt ihre eigenen. */
export const GANG_MASSE = { oberschenkel: 102, unterschenkel: 98, knoechel: 10 };

/**
 * Gang als Funktion der Phase (1 = ein Doppelschritt). an blendet den Zyklus ein und aus.
 * Liefert absolute Winkel für Beine und Arme und bob: um so viel sinkt die Hüfte,
 * damit der tiefste Fuß auf dem Boden steht (im Figurenmaß, ohne massstab).
 */
export function walkCycle(phase, an = 1, { schritt = 24, knie = 34, arm = 16, fig = GANG_MASSE } = {}) {
  const w = 2 * Math.PI * phase;
  const bein = (verschiebung) => {
    const s = Math.sin(w + verschiebung);
    const upper = schritt * s * an;
    // Knie beugt sich in der Schwungphase (Bein bewegt sich nach vorn), nie nach hinten durch.
    const schwung = Math.max(0, Math.cos(w + verschiebung));
    const lower = upper - knie * schwung * an;
    const foot = 8 * schwung * an * Math.max(0, -Math.sin(w + verschiebung) + 0.3);
    return { upper, lower, foot };
  };
  const legF = bein(0);
  const legB = bein(Math.PI);
  const hoehe = (b) => fig.oberschenkel * Math.cos(b.upper * RAD) + fig.unterschenkel * Math.cos(b.lower * RAD);
  const bob = fig.oberschenkel + fig.unterschenkel - Math.max(hoehe(legF), hoehe(legB));
  const schwingen = (verschiebung) => {
    const upper = -arm * Math.sin(w + verschiebung) * an;
    return { upper, lower: upper + 10 * an + 6 * Math.max(0, Math.sin(w + verschiebung + Math.PI)) * an };
  };
  return { legF, legB, armF: schwingen(0), armB: schwingen(Math.PI), bob };
}

/** Phase des Gangs nach zurückgelegter Strecke in px. */
export function gangPhase(strecke, massstab = 1) {
  return strecke / (DOPPELSCHRITT_PX * massstab);
}

/**
 * Wechsel zweier Fassungen (Aufstehen, Setzen): Gewicht der zweiten Fassung,
 * 0 vor wechsel[0], 1 nach wechsel[1], dazwischen in wenigen Bildern.
 */
export function umblenden(t, [t0, t1]) {
  return inOut((t - t0) / (t1 - t0));
}

/**
 * Hängendes Glied: zeigt unabhängig vom Elternwinkel nach unten, mit leichter Nachschwingung,
 * wenn der Eltern sich bewegt. Liefert den absoluten Winkel.
 */
export function haengend(elternGeschwindigkeit, traegheit = 0.15, grenze = 25) {
  return klemme(-elternGeschwindigkeit * traegheit, -grenze, grenze);
}

/** Summe von Teilwerten (Gefühlsrezepte, Haltungen): addiert Zahlen, auch verschachtelt. */
export function summe(...teile) {
  const aus = {};
  for (const teil of teile) {
    if (!teil) continue;
    for (const [k, v] of Object.entries(teil)) {
      if (typeof v === 'number') aus[k] = (aus[k] ?? 0) + v;
      else if (v && typeof v === 'object') aus[k] = summe(aus[k] ?? {}, v);
    }
  }
  return aus;
}
