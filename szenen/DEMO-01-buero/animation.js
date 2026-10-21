// Zeitfunktion der Demoszene: nur Zahlen, nur aus GEO, BEATS und CHARAKTER.
import { easeIn, easeOut, inOut, movingHold, settle } from '../../lib/easing.js';
import { bezier2, envelope, gangPhase, interp, schluessel, summe, walkCycle } from '../../lib/motion.js';
import { atmen, erleichtert, fussWippen, konzentriert, stolz, tippen, ueberrascht } from '../../lib/spielweise.js';
import { rig } from '../../lib/rigs/index.js';
import { GEO } from './geometry.js';

export const SPEC = { fps: 30, width: 1920, height: 1080, duration: 15.0 };
export const BEATS = {
  tippen: [0.5, 3.0] /* „Ein Antrag ist schnell ausgefüllt.“ */,
  kommen: [0.6, 3.0],
  senden: [3.0, 3.8] /* „Ein Klick auf Senden,“ */,
  fliegen: [3.8, 5.4] /* „und er ist unterwegs.“ */,
  drucken: [5.4, 6.6] /* „Drüben am Drucker“ */,
  nehmen: [6.6, 8.0] /* „wartet schon jemand, nimmt das Blatt“ */,
  staunen: [8.0, 10.0] /* „und staunt: So schnell ging das noch nie.“ */,
  ablegen: [10.0, 12.2],
};
export const CHARAKTER = { A: { tempo: 1.0, reaktion: 0.7 }, B: { tempo: 1.1, reaktion: 1.0 } };
export const KONTAKTBOGEN = [0.3, 1.6, 3.45, 4.6, 6.3, 7.4, 8.6, 11.0, 13.5];

const FA = GEO.figuren.A;
const FB = GEO.figuren.B;
const H = GEO.haende;
const D = GEO.ausdruck;
const rigA = rig(FA.rig);
const rigB = rig(FB.rig);
// Griffpunkt des Blatts relativ zu seiner Mitte (Anker „griff“ der Requisite, mal Maßstab).
const GRIFF = { x: 20 * D.massstab, y: 32 * D.massstab };
const mitGriff = (p) => ({ x: p.x + GRIFF.x, y: p.y + GRIFF.y });

// Zeitpunkte, die mehrere Teile teilen.
const T_SCHLAG = 3.45; // Eingabetaste
const T_GRIFF = 7.2; // B fasst den Ausdruck
const T_DREHEN = 10.3; // B dreht sich zum Regal
const T_LOSLASSEN = 11.45; // Blatt liegt im Kasten

/** A: konzentriert über der Eingabe, nach dem Senden zurückgelehnt, schaut dem Blatt nach. */
function haltungA(t) {
  const konz = konzentriert(t, envelope(t, [0.1, 0.5, 3.0, 3.8]));
  const [f0, f1] = BEATS.fliegen;
  // Blick folgt dem Blatt nach oben und zur Seite, dann zurück.
  const nachsehen = { head: -10 * envelope(t, [f0, f0 + 0.5, f1, f1 + 0.6]) };
  return summe(atmen(t, CHARAKTER.A.tempo), konz, erleichtert(t, 3.9, CHARAKTER.A.reaktion), nachsehen);
}

/** A, vordere Hand: tippt, holt aus und schlägt die Eingabetaste, dann zurück auf die Tischkante. */
function handAF(t) {
  const p = schluessel(t, [
    [0, H.ruheF.x, H.ruheF.y],
    [BEATS.tippen[0], H.tasteF.x, H.tasteF.y],
    [BEATS.tippen[1], H.tasteF.x, H.tasteF.y],
    [3.25, H.senden.x, H.senden.y - 32],
  ]);
  // Schlag: von oben schnell auf die Taste, kurz halten, dann zurück zur Ruhe.
  const schlag = interp(t, [3.25, T_SCHLAG], [0, 1], easeIn);
  const zurueck = interp(t, [3.6, 4.1], [0, 1], inOut);
  const ziel = {
    x: p.x + (H.senden.x - p.x) * schlag,
    y: p.y + (H.senden.y - p.y) * schlag,
  };
  const ende = { x: ziel.x + (H.ruheF.x - ziel.x) * zurueck, y: ziel.y + (H.ruheF.y - ziel.y) * zurueck };
  const anschlag = tippen(t, BEATS.tippen, 5 / CHARAKTER.A.tempo, 6, 0).handDy;
  return { x: ende.x + movingHold(t, 1, 0), y: ende.y + anschlag };
}

/** A, hintere Hand: tippt mit und kehrt vor dem Senden zur Tischkante zurück. */
function handAB(t) {
  const p = schluessel(t, [
    [0, H.ruheB.x, H.ruheB.y],
    [BEATS.tippen[0], H.tasteB.x, H.tasteB.y],
    [BEATS.tippen[1], H.tasteB.x, H.tasteB.y],
    [3.4, H.ruheB.x, H.ruheB.y],
  ]);
  const anschlag = tippen(t, BEATS.tippen, 5 / CHARAKTER.A.tempo, 6, 0.5).handDy;
  return { x: p.x + movingHold(t, 1, 0.5), y: p.y + anschlag };
}

/** B: geht von rechts heran, wartet mit wippendem Fuß; Ort und Gang als Funktion der Zeit. */
function gangB(t) {
  const [k0, k1] = [0.6, 2.9];
  const s = interp(t, [k0, k1], [0, 1], inOut);
  const x = FB.start.x + (FB.halt.x - FB.start.x) * s;
  const g = walkCycle(gangPhase(Math.abs(x - FB.start.x)), envelope(t, [k0, k0 + 0.3, k1 - 0.3, k1]));
  // Warten: der Fuß wippt, bis das Blatt da ist.
  const wippen = fussWippen(t, 1.8 * CHARAKTER.B.tempo, 8).foot * envelope(t, [3.3, 3.6, 6.0, 6.3]);
  return { x, g, wippen };
}

/** B: Haltung beim Warten, Staunen über den Ausdruck, Zufriedenheit nach dem Ablegen. */
function haltungB(t) {
  const [s0] = BEATS.staunen;
  const staunen = ueberrascht(t, s0 + 0.1, CHARAKTER.B.reaktion, 0.5);
  const nachlassen = envelope(t, [s0, s0 + 0.1, 9.6, 10.2]);
  return {
    koerper: summe(
      atmen(t, CHARAKTER.B.tempo, 1.3),
      { torso: staunen.torso * nachlassen, head: staunen.head * nachlassen, schulter: staunen.schulter * nachlassen },
      stolz(t, 11.6, CHARAKTER.B.reaktion * 0.6),
    ),
    // Die freie Hand fliegt beim Staunen hoch.
    armB: { upper: staunen.armB.upper * nachlassen, lower: staunen.armB.lower * nachlassen },
  };
}

/** Wo der Ausdruck ist: in der Ausgabe, in der Hand von B, im Kasten. */
function ausdruckMitte(t) {
  const [d0, d1] = [6.0, 6.5];
  const raus = interp(t, [d0, d1], [0, 1], easeOut);
  const ausgabe = { x: D.innen.x + (D.aussen.x - D.innen.x) * raus, y: D.innen.y + (D.aussen.y - D.innen.y) * raus };
  if (t < T_GRIFF) return ausgabe;
  // In der Hand: vor die Augen, nach der Drehung zum Kasten.
  return schluessel(t, [
    [T_GRIFF, D.aussen.x, D.aussen.y],
    [7.35, D.aussen.x, D.aussen.y],
    [8.0, D.vorAugen.x, D.vorAugen.y],
    [T_DREHEN - 0.001, D.vorAugen.x, D.vorAugen.y],
    // Die Drehung ist ein Schnitt: das Blatt springt mit der Hand auf die andere Seite.
    [T_DREHEN, D.vorAugen.x + 2 * (FB.halt.x - D.vorAugen.x), D.vorAugen.y],
    [11.2, D.einlage.x, D.einlage.y - 24],
    [T_LOSLASSEN, D.einlage.x, D.einlage.y],
  ]);
}

/** B, vordere Hand: hängt beim Gehen, greift den Ausdruck, hält ihn, legt ihn ab, kehrt zurück. */
function armBF(B, t, gang, mitte) {
  const frei = { ...rigB.defaults.armF, upper: rigB.defaults.armF.upper + gang.g.armF.upper, lower: rigB.defaults.armF.lower + gang.g.armF.lower };
  if (t < 6.6 || t > 12.2) return frei;
  const ruhe = rigB.gelenke({ ...B, armF: frei }).armF.hand;
  const greifen = interp(t, [6.6, T_GRIFF], [0, 1], inOut);
  const zurueck = interp(t, [11.6, 12.2], [0, 1], inOut);
  const griff = mitGriff(mitte);
  const hin = { x: ruhe.x + (griff.x - ruhe.x) * greifen, y: ruhe.y + (griff.y - ruhe.y) * greifen };
  const ziel = t < 11.6 ? hin : { x: griff.x + (ruhe.x - griff.x) * zurueck, y: griff.y + (ruhe.y - griff.y) * zurueck };
  return rigB.greife(B, 'armF', ziel, { form: t >= T_GRIFF - 0.1 && t < T_LOSLASSEN + 0.1 ? 'greifend' : 'offen' });
}

export function computeState(t) {
  // A am Schreibtisch.
  const ha = haltungA(t);
  const A = { ...rigA.defaults, x: FA.x, y: FA.y, dir: FA.dir, torso: ha.torso ?? 0, head: ha.head ?? 0, schulter: ha.schulter ?? 0 };
  A.armF = rigA.greife(A, 'armF', handAF(t));
  A.armB = rigA.greife(A, 'armB', handAB(t));

  // Eingabetaste: gedrückt, solange die Hand auf ihr liegt.
  const senden = { taste: interp(t, [T_SCHLAG - 0.03, T_SCHLAG, 3.55, 3.62], [0, 1, 1, 0]) };

  // Das gesendete Blatt fliegt in hohem Bogen zum Drucker und wird eingezogen.
  const [f0, f1] = BEATS.fliegen;
  const s = interp(t, [f0, f1 - 0.1], [0, 1], inOut);
  const flug = {
    pos: bezier2(GEO.flug.von, GEO.flug.ueber, GEO.flug.nach, s),
    drehung: -12 + 24 * s + 10 * Math.sin(2 * Math.PI * 1.5 * s) * (1 - s),
    massstab: interp(t, [f0, f0 + 0.3, f1 - 0.3, f1], [0.3, 0.9, 0.9, 0.4], inOut),
    deckkraft: interp(t, [f0, f0 + 0.08, f1 - 0.12, f1], [0, 1, 1, 0]),
  };

  // Drucker: läuft an, das Licht leuchtet, das Gehäuse zittert leicht.
  const laeuft = envelope(t, [f1 - 0.05, f1 + 0.15, 6.2, 6.5]);
  const drucker = { laeuft, licht: 0.35 + 0.65 * laeuft, zittern: 1 * Math.sin(2 * Math.PI * 6 * t) * laeuft };

  // B kommt, wartet, nimmt, staunt, dreht sich, legt ab.
  const gang = gangB(t);
  const hb = haltungB(t);
  const dir = t < T_DREHEN ? FB.dir : -FB.dir;
  const B = {
    ...rigB.defaults,
    x: gang.x,
    y: FB.halt.y,
    dir,
    bob: gang.g.bob,
    torso: hb.koerper.torso ?? 0,
    head: hb.koerper.head ?? 0,
    schulter: hb.koerper.schulter ?? 0,
    legF: { ...gang.g.legF, foot: gang.g.legF.foot + gang.wippen },
    legB: gang.g.legB,
    armB: {
      ...rigB.defaults.armB,
      upper: rigB.defaults.armB.upper + gang.g.armB.upper + hb.armB.upper,
      lower: rigB.defaults.armB.lower + gang.g.armB.lower + hb.armB.lower,
    },
  };
  const mitte = ausdruckMitte(t);
  B.armF = armBF(B, t, gang, mitte);

  // Ausdruck: sichtbar ab der Ausgabe; nach dem Loslassen übernimmt das Blatt im Kasten.
  const ausdruck = {
    pos: mitte,
    deckkraft: interp(t, [6.0, 6.08], [0, 1]) * (t < T_LOSLASSEN ? 1 : 0),
    drehung: interp(t, [T_DREHEN, 11.2, T_LOSLASSEN], [0, -8, 6], inOut),
  };
  // Einlegen: nur die letzte Abwärtsbewegung in den Kasten, damit das Geräusch auf dem Aufsetzen liegt.
  const einlegen = { y: interp(t, [11.2, T_LOSLASSEN], [D.einlage.y - 24, D.einlage.y], easeIn) };
  const abgelegt = { deckkraft: t >= T_LOSLASSEN ? 1 : 0, drehung: 6 + 2 * interp(t, [T_LOSLASSEN, T_LOSLASSEN + 0.4], [1, 0], settle) };

  return { A, senden, flug, drucker, B, ausdruck, einlegen, abgelegt };
}
