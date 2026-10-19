// Archetyp sitzend-profil: Maße aus figuren/rig-spezifikation.json, Teile aus dem Teilesatz.
import { profilRig } from './_profil.js';

const rig = profilRig('sitzend-profil');
export const { name, defaults, markup, apply, gelenke, greife, fuss, pruefeReichweite, rahmen } = rig;
export default rig;
