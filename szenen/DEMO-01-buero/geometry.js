// Geometrie der Demoszene: alle Positionen in Weltkoordinaten, Palette, Handziele. Keine nackte Zahl im Markup.
// Links sitzt A am Schreibtisch; rechts steht der Drucker an der Kante eines zweiten Tisches, damit B ihn
// von der Seite erreicht; hinter B ein Regal mit dem Ablagekasten. Boden y 760, Tischplatten y 560.
import { FARBEN } from '../../tokens/tokens.js';

export const GEO = {
  palette: { grund: FARBEN.primaerHell, akzent1: FARBEN.petrol, akzent2: FARBEN.violett },
  labels: { links: 'Antrag', mitte: '', rechts: 'Ausdruck' },
  figuren: {
    A: {
      rig: 'sitzend-profil',
      teilesatz: 'satz-00',
      x: 480,
      y: 620,
      dir: 1,
      palette: { kleidung1: FARBEN.petrol, kleidung2: FARBEN.primaerDunkel, zubehoer: null },
    },
    B: {
      rig: 'stehend-profil',
      teilesatz: 'satz-00',
      // B kommt von rechts herein und bleibt neben dem Drucker stehen; Hüfte 210 px über dem Boden.
      start: { x: 1992, y: 550 }, // vier Schritte zu je 124 px vor dem Halt
      halt: { x: 1496, y: 550 },
      dir: -1,
      palette: { kleidung1: FARBEN.violett, kleidung2: FARBEN.primaerDunkel, zubehoer: null },
    },
  },
  requisiten: {
    stuhl: { x: 476, y: 634 },
    tisch: { x: 752, y: 560, breite: 440 },
    tastatur: { x: 600, y: 560 },
    monitor: { x: 792, y: 560 },
    tisch2: { x: 1264, y: 560, breite: 384 },
    drucker: { x: 1360, y: 560 },
    regal: { x: 1672, y: 760 },
    ablage: { x: 1632, y: 520 },
  },
  // Handziele von A: Ruhe auf der Tischkante, Tippen auf der Tastatur (Oberkante y 544), Senden rechts auf der Tastatur.
  haende: {
    ruheF: { x: 544, y: 558 },
    ruheB: { x: 528, y: 558 },
    tasteF: { x: 624, y: 542 },
    tasteB: { x: 592, y: 542 },
    senden: { x: 640, y: 542 },
  },
  // Weg des gesendeten Blatts: vom Bildschirm in hohem Bogen zum Einzug des Druckers.
  flug: { von: { x: 792, y: 432 }, ueber: { x: 1064, y: 232 }, nach: { x: 1336, y: 440 } },
  // Ausdruck (Blattmitte): gleitet aus der Ausgabe zu B hin, B hält ihn vor das Gesicht und legt ihn in den Kasten.
  ausdruck: {
    innen: { x: 1400, y: 524 },
    aussen: { x: 1440, y: 516 },
    vorAugen: { x: 1400, y: 392 },
    einlage: { x: 1632, y: 492 },
    massstab: 0.6,
  },
};
