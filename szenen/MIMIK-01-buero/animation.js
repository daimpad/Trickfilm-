// Zeitfunktion der Demoszene mit Mimik: nur Zahlen, nur aus GEO, BEATS und CHARAKTER. Bewegung wie DEMO-01-buero,
// dazu je Figur ein Gesicht aus GEO.mimik mit Blinzeln.
import { easeIn, easeOut, inOut, movingHold, settle } from '../../lib/easing.js';
import { bezier2, envelope, interp, schluessel, summe } from '../../lib/motion.js';
import { atmen, erleichtert, fussWippen, konzentriert, stolz, tippen, ueberrascht } from '../../lib/spielweise.js';
import { rig } from '../../lib/rigs/index.js';
import { blinzeln, mimikZustand, mitBlinzeln } from '../../lib/mimik.js';
import { GEO } from './geometry.js';

export const SPEC = { fps: 30, width: 1920, height: 1080, duration: 15.0 };
export const BEATS = {
  tippen: [0.5, 3.0] /* „ausgefüllt“ (68) */,
  kommen: [0.6, 3.0],
  senden: [3.0, 3.8] /* „Senden“ (107), Eingabetaste kurz davor */,
  fliegen: [3.8, 5.4] /* „unterwegs“ (136) */,
  drucken: [5.4, 6.6] /* „Drucker“ (168) */,
  nehmen: [6.6, 8.0] /* „Blatt“ (227), Griff zwischen „nimmt“ und „Blatt“ */,
  staunen: [8.0, 10.0] /* „staunt“ (242) */,
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

// Gang von B: ruhig, mit festen Fußpunkten. Der Standfuß steht still, der Schwungfuß geht in flachem Bogen
// zum nächsten Punkt; die Beine folgen über rig.fuss(). Fußpunkte im Abstand SCHRITT_PX, vier Schritte bis zum
// Halt und ein Schlussschritt, damit B mit beiden Füßen nebeneinander ankommt.
const SCHRITT_PX = 124;
const GANG = [0.4, 3.4];
const RAMPE = 0.5;
const KNOECHEL_Y = 750; // Sohle auf dem Boden (y 760), Knöchel 10 px darüber
const BEIN = 200; // Oberschenkel plus Unterschenkel
const HUB = 16; // Höhe des Schwungfußes in der Mitte des Schritts
// Fußbewegungen: Bein, von, nach (Weg ab Start in px), Dauer in Anteilen der Gangzeit.
const SCHRITTE = [
  ['legF', 0, 1, 0.75],
  ['legB', 0, 2, 1],
  ['legF', 1, 3, 1],
  ['legB', 2, 4, 1],
  ['legF', 3, 4, 0.75],
];

/** Anteil des Wegs mit trapezförmiger Geschwindigkeit: anfahren, gleichmäßig gehen, abbremsen. */
function weg(t, [t0, t1], rampe) {
  const T = t1 - t0;
  const vmax = 1 / (T - rampe);
  const u = Math.min(Math.max(t - t0, 0), T);
  if (u < rampe) return (vmax * u * u) / (2 * rampe);
  if (u <= T - rampe) return vmax * (rampe / 2 + (u - rampe));
  const d = T - u;
  return 1 - (vmax * d * d) / (2 * rampe);
}

/** Ort beider Füße (Weg ab Start in px und Hub) zur Zeit t. */
function fuesse(t) {
  const summe = SCHRITTE.reduce((n, [, , , d]) => n + d, 0);
  const pos = { legF: { weg: 0, hub: 0 }, legB: { weg: 0, hub: 0 } };
  let t0 = GANG[0];
  for (const [bein, von, nach, d] of SCHRITTE) {
    const t1 = t0 + ((GANG[1] - GANG[0]) * d) / summe;
    const u = interp(t, [t0, t1], [0, 1], inOut);
    if (t >= t0) pos[bein] = { weg: SCHRITT_PX * (von + (nach - von) * u), hub: t < t1 ? HUB * Math.sin(Math.PI * u) : 0 };
    t0 = t1;
  }
  return pos;
}

/** B: geht von rechts heran, wartet mit wippendem Fuß; Ort der Hüfte und Fußziele als Funktion der Zeit. */
function gangB(t) {
  const richtung = Math.sign(FB.halt.x - FB.start.x);
  const x = FB.start.x + (FB.halt.x - FB.start.x) * weg(t, GANG, RAMPE);
  const f = fuesse(t);
  const ziel = (bein) => ({ x: FB.start.x + richtung * f[bein].weg, y: KNOECHEL_Y - f[bein].hub });
  // Die Hüfte senkt sich so weit, dass der fernere Fuß erreichbar bleibt.
  const dx = Math.max(Math.abs(ziel('legF').x - x), Math.abs(ziel('legB').x - x));
  const bob = BEIN - Math.sqrt(Math.max(BEIN * BEIN - dx * dx, 0)) + 0.5;
  // Warten: der Fuß wippt, bis das Blatt da ist.
  const wippen = fussWippen(t, 1.8 * CHARAKTER.B.tempo, 8).foot * envelope(t, [3.8, 4.1, 6.0, 6.3]);
  return { x, bob, zielF: ziel('legF'), zielB: ziel('legB'), wippen };
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
function armBF(B, t, schwingen, mitte) {
  const frei = { ...rigB.defaults.armF, upper: rigB.defaults.armF.upper + schwingen.armF, lower: rigB.defaults.armF.lower + schwingen.armF };
  if (t < 6.6 || t > 12.2) return frei;
  const ruhe = rigB.gelenke({ ...B, armF: frei }).armF.hand;
  const greifen = interp(t, [6.6, T_GRIFF], [0, 1], inOut);
  const zurueck = interp(t, [11.6, 12.2], [0, 1], inOut);
  const griff = mitGriff(mitte);
  const hin = { x: ruhe.x + (griff.x - ruhe.x) * greifen, y: ruhe.y + (griff.y - ruhe.y) * greifen };
  const ziel = t < 11.6 ? hin : { x: griff.x + (ruhe.x - griff.x) * zurueck, y: griff.y + (ruhe.y - griff.y) * zurueck };
  return rigB.greife(B, 'armF', ziel, { form: t >= T_GRIFF - 0.1 && t < T_LOSLASSEN + 0.1 ? 'greifend' : 'offen' });
}

/** Gesicht einer Figur: Ausdruck aus den Schlüsseln, darüber Blinzeln mit festem Seed je Figur. */
function gesichtVon(P, t) {
  return mitBlinzeln(mimikZustand(GEO.mimik[P], t), blinzeln(t, `MIMIK-01-${P}`, { extra: GEO.blinzeln[P] }));
}

export function computeState(t) {
  // A am Schreibtisch.
  const ha = haltungA(t);
  const A = { ...rigA.defaults, x: FA.x, y: FA.y, dir: FA.dir, torso: ha.torso ?? 0, head: ha.head ?? 0, schulter: ha.schulter ?? 0 };
  A.armF = rigA.greife(A, 'armF', handAF(t));
  A.armB = rigA.greife(A, 'armB', handAB(t));
  A.gesicht = gesichtVon('A', t);

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
    bob: gang.bob,
    torso: hb.koerper.torso ?? 0,
    head: hb.koerper.head ?? 0,
    schulter: hb.koerper.schulter ?? 0,
  };
  const legF = rigB.fuss(B, 'legF', gang.zielF);
  B.legF = { ...legF, foot: legF.foot + gang.wippen };
  B.legB = rigB.fuss(B, 'legB', gang.zielB);
  // Arme schwingen gegen die Beine: vorderer Arm gegen das vordere Bein, halb so weit.
  const schwingen = { armF: -0.5 * B.legF.upper, armB: -0.5 * B.legB.upper };
  B.armB = {
    ...rigB.defaults.armB,
    upper: rigB.defaults.armB.upper + schwingen.armB + hb.armB.upper,
    lower: rigB.defaults.armB.lower + schwingen.armB + hb.armB.lower,
  };
  const mitte = ausdruckMitte(t);
  B.armF = armBF(B, t, schwingen, mitte);
  B.gesicht = gesichtVon('B', t);

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
