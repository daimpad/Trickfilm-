// Geometrie der Szene: alle Positionen in Weltkoordinaten, Palette, Handziele. Keine nackte Zahl im Markup.
import { FARBEN } from '../../tokens/tokens.js';

export const GEO = {
  palette: { grund: FARBEN.primaerHell, akzent1: FARBEN.gruen, akzent2: null },
  labels: { links: 'Eingabe', mitte: '', rechts: 'Bestätigung' },
  figuren: {
    A: {
      rig: 'sitzend-profil',
      teilesatz: 'satz-00',
      x: 730,
      y: 620,
      dir: 1,
      palette: { kleidung1: FARBEN.petrol, kleidung2: FARBEN.primaerDunkel, zubehoer: null },
    },
  },
  requisiten: {
    stuhl: { x: 726, y: 634 },
    tisch: { x: 1000, y: 560, breite: 440 },
    tastatur: { x: 852, y: 560 },
    monitor: { x: 1040, y: 560 },
    haken: { x: 1040, y: 430 },
  },
  // Handziele: Ruhe auf der Tischkante, Tippen auf der Tastatur (Oberkante y 544).
  haende: {
    ruheF: { x: 792, y: 558 },
    ruheB: { x: 774, y: 558 },
    tasteF: { x: 872, y: 542 },
    tasteB: { x: 838, y: 542 },
  },
};
