// Spielweise ohne Gesicht: Emotion aus Haltung, Tempo, Anlauf, Überschwingen und Pausen.
// Jedes Rezept liefert Teilwerte, die mit summe() aus motion.js addiert werden:
//   torso      Rumpfneigung in Grad (vorwärts positiv)
//   head       Kopfneigung relativ zum Rumpf in Grad (vorwärts positiv)
//   schulter   Schulterhub in px (negativ = hoch)
//   armF/armB  Zusatzwinkel { upper, lower } in Grad
//   handDy     Versatz der Hand in px (für Tippen, Klicken)
//   foot       Fußwinkel in Grad (Zehen hoch positiv)
import { anticipate, inOut, movingHold, overshoot, settle } from './easing.js';
import { interp, pulse } from './motion.js';

/** Grenzen der Charakterkarte. */
export const TEMPO_GRENZEN = [0.7, 1.3];

/**
 * Charakterkarte zu Parametern. tempo: Faktor auf Beat-Dauern (1,3 bedächtig bis 0,7 hektisch);
 * reaktion: Amplitude von Anlauf und Überschwingen (0 bis 1); haltung: Grundhaltung; tick: Nebenbewegung.
 */
export function charakter({ tempo = 1, haltung = null, reaktion = 0.8, tick = null } = {}) {
  if (tempo < TEMPO_GRENZEN[0] || tempo > TEMPO_GRENZEN[1]) {
    throw new Error(`Charakter: tempo ${tempo} außerhalb ${TEMPO_GRENZEN.join(' bis ')}`);
  }
  return { tempo, haltung, reaktion, tick };
}

/** Beat-Dauer nach dem Tempo der Figur. */
export const dauer = (sekunden, karte) => sekunden * (karte?.tempo ?? 1);

/** Grundhaltungen in Ruhe. */
export const HALTUNGEN = {
  aufrecht: { torso: 0, head: 0, schulter: 0 },
  konzentriert: { torso: 6, head: 8, schulter: 1 },
  gebeugt: { torso: 10, head: 6, schulter: 3 },
  zurueckgelehnt: { torso: -6, head: -4, schulter: 0 },
};

/** Atmen: ruhige Bewegung von Rumpf und Schulter, Periode etwa 4 s. */
export function atmen(t, tempo = 1, phase = 0) {
  const w = (2 * Math.PI * t) / (4 * tempo) + phase;
  return { torso: 0.6 * Math.sin(w), schulter: 1 * Math.sin(w) };
}

/** Konzentriert: Vorneigung, kleine gleichmäßige Amplitude. */
export function konzentriert(t, staerke = 1) {
  return {
    torso: 6 * staerke + 0.4 * movingHold(t, 1, 0.3),
    head: 8 * staerke + 0.5 * movingHold(t, 1, 1.1),
    schulter: 1 * staerke,
  };
}

/** Genervt: Pause vor der Aktion, Schultern hoch, kurzer Kopfschlag bei t0. */
export function genervt(t, t0, reaktion = 0.8) {
  const hoch = interp(t, [t0 - 0.4, t0], [0, 1], inOut);
  return {
    schulter: -6 * reaktion * hoch,
    head: -10 * reaktion * pulse(t, t0 + 0.08, 0.24),
    torso: -2 * reaktion * hoch,
  };
}

/** Überrascht: Anlauf nach hinten, Kopf zurück, Hände hoch, dann Halt. */
export function ueberrascht(t, t0, reaktion = 0.8, dauerS = 0.5) {
  const u = interp(t, [t0, t0 + dauerS], [0, 1], anticipate);
  return {
    torso: -8 * reaktion * u,
    head: -12 * reaktion * u,
    schulter: -4 * reaktion * u,
    // Hände hoch: Oberarm nach vorn oben, Unterarm zeigt aufwärts.
    armF: { upper: 70 * reaktion * u, lower: 145 * reaktion * u },
    armB: { upper: 55 * reaktion * u, lower: 125 * reaktion * u },
  };
}

/** Erleichtert: Schultern sinken langsam, Nachschwingen. */
export function erleichtert(t, t0, reaktion = 0.8, dauerS = 1.2) {
  const u = interp(t, [t0, t0 + dauerS], [0, 1], settle);
  return { schulter: 4 * reaktion * u, torso: -3 * reaktion * u, head: 3 * reaktion * u };
}

/** Stolz: aufrecht, Kopf hoch, Überschwingen beim Aufrichten. */
export function stolz(t, t0, reaktion = 0.8, dauerS = 0.6) {
  const u = interp(t, [t0, t0 + dauerS], [0, 1], overshoot);
  return { torso: -5 * reaktion * u, head: -8 * reaktion * u, schulter: -2 * reaktion * u };
}

/** Ratlos: Kopf pendelt zwischen zwei Zielen, Hand hebt und senkt sich halb. */
export function ratlos(t, t0, t1, reaktion = 0.8) {
  const an = interp(t, [t0, t0 + 0.3, t1 - 0.3, t1], [0, 1, 1, 0], inOut);
  const pendel = Math.sin((2 * Math.PI * (t - t0)) / 1.6);
  return {
    head: 9 * reaktion * pendel * an,
    armF: { upper: 25 * an * (0.5 + 0.5 * Math.sin((2 * Math.PI * (t - t0)) / 2.4)), lower: 45 * an },
  };
}

/**
 * Tippen: Hand senkt sich je Anschlag; frequenz in Anschlägen je Sekunde.
 * Jeder Anschlag hat einen Tiefpunkt (für Ereignisse und Geräusche).
 */
export function tippen(t, [t0, t1], frequenz = 5, hub = 6, phase = 0) {
  if (t < t0 || t > t1) return { handDy: 0 };
  const u = (t - t0) * frequenz + phase;
  const anschlag = Math.max(0, Math.sin(2 * Math.PI * u));
  return { handDy: hub * anschlag ** 2 };
}

/** Fußwippen als Tick: Zehen heben und senken sich. */
export function fussWippen(t, frequenz = 1.6, amp = 8) {
  return { foot: amp * Math.max(0, Math.sin(2 * Math.PI * frequenz * t)) };
}
