// Sitz des Gesichts auf dem Kopf, normativ für die Mimik (docs/MIMIK.md). Unabhängig von der Rig-Spezifikation:
// Kopfmitte und Radius im Rahmen des Kopfteils (Ursprung im Nacken, x in Blickrichtung, y nach unten), in px bei
// massstab 1. Die Werte gelten für die Kopfform von satz-00; ein Teilesatz mit anderer Kopfform trägt eigene unter
// teilesaetze.<satz>.<archetyp>. Als JS-Modul, damit Prototyp, Node und Remotion es ohne Build lesen.
export const MIMIK_SPEZ = {
  fassung: 1,
  anker: {
    'sitzend-profil': { x: 3, y: -38, r: 30 },
    'stehend-profil': { x: 3, y: -38, r: 30 },
    'stehend-frontal': { x: 0, y: -38, r: 30 },
    'oberkoerper-nah': { x: 3, y: -38, r: 30 },
  },
  teilesaetze: {},
};

/** Anker eines Archetyps für einen Teilesatz; ein fehlender Archetyp hält an. */
export function ankerFuer(archetyp, teilesatz = 'satz-00') {
  const eigen = MIMIK_SPEZ.teilesaetze[teilesatz]?.[archetyp];
  const a = eigen ?? MIMIK_SPEZ.anker[archetyp];
  if (!a) throw new Error(`Mimik: kein Anker für Archetyp „${archetyp}“ in lib/mimik-spezifikation.js`);
  return a;
}
