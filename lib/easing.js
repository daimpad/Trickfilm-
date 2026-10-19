// Kurven für Bewegung: jede beginnt bei 0 und endet bei 1 (außer movingHold, das eine Drift liefert).
// Reines JavaScript ohne DOM.

/** Anlauf: Gegenbewegung von 8 % vor dem Start (easeInBack mit c = 1,5). */
const ANLAUF_C = 1.5;
/** Überschwingen: 12 % über das Ziel hinaus, dann zurück (easeOutBack mit c = 1,9). */
const UEBERSCHWING_C = 1.9;
/** Nachschwingen: Perioden bis zur Ruhe und Abklingexponent. */
const SETTLE_PERIODEN = 2.5;
const SETTLE_ABKLINGEN = 3;
/** Pose zu Pose: Anteil des Intervalls, in dem gewechselt wird. */
const SNAP_ANTEIL = 0.25;
/** Drift in Haltepausen: zwei unharmonische Frequenzen in Hz. */
const DRIFT_HZ = [0.37, 0.83];

const klemme = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

export const linear = (x) => klemme(x);
export const easeIn = (x) => klemme(x) ** 3;
export const easeOut = (x) => 1 - (1 - klemme(x)) ** 3;
export const inOut = (x) => {
  const u = klemme(x);
  return u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2;
};

function zurueck(u, c) {
  const v = u - 1;
  return 1 + (c + 1) * v ** 3 + c * v ** 2;
}

/** Anlauf: erst 8 % zurück, dann zum Ziel. */
export const anticipate = (x) => 1 - zurueck(1 - klemme(x), ANLAUF_C);

/** Überschwingen: 12 % hinaus, dann ruhig zurück. */
export const overshoot = (x) => zurueck(klemme(x), UEBERSCHWING_C);

/** Gedämpfte Nachschwingung in 2,5 Perioden, endet genau bei 1. */
export const settle = (x) => {
  const u = klemme(x);
  return 1 - Math.cos(2 * Math.PI * SETTLE_PERIODEN * u) * (1 - u) ** SETTLE_ABKLINGEN;
};

/** Pose zu Pose: verweilen, in der Mitte des Intervalls wechseln, verweilen. */
export const snap = (x, anteil = SNAP_ANTEIL) => {
  const u = klemme(x);
  const a = (1 - anteil) / 2;
  return inOut((u - a) / anteil);
};

/** Wechsel in 6 Bildern um tWechsel: für Pose-zu-Pose an einem festen Zeitpunkt. */
export function snapBei(t, tWechsel, bilder = 6, fps = 30) {
  const halb = bilder / fps / 2;
  return inOut((t - (tWechsel - halb)) / (2 * halb));
}

/**
 * Drift in Haltepausen: 1 bis 2 px aus zwei unharmonischen Sinus,
 * damit nichts länger als eine Sekunde völlig still steht.
 */
export function movingHold(t, amp = 1.5, phase = 0) {
  return (
    amp *
    (0.6 * Math.sin(2 * Math.PI * DRIFT_HZ[0] * t + phase) +
      0.4 * Math.sin(2 * Math.PI * DRIFT_HZ[1] * t + 1.7 * phase))
  );
}

export const KURVEN = { linear, easeIn, easeOut, inOut, anticipate, overshoot, settle, snap };
