// Verzeichnis der Rigs nach Archetyp.
import sitzendProfil from './sitzend-profil.js';
import stehendProfil from './stehend-profil.js';
import stehendFrontal from './stehend-frontal.js';
import oberkoerperNah from './oberkoerper-nah.js';

export const RIGS = {
  'sitzend-profil': sitzendProfil,
  'stehend-profil': stehendProfil,
  'stehend-frontal': stehendFrontal,
  'oberkoerper-nah': oberkoerperNah,
};

/** Rig nach Name; ein unbekannter Name hält an. */
export function rig(name) {
  const r = RIGS[name];
  if (!r) throw new Error(`Rig „${name}“ unbekannt; bekannt: ${Object.keys(RIGS).join(', ')}`);
  return r;
}
