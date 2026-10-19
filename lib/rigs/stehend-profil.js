// Archetyp stehend-profil: Maße aus figuren/rig-spezifikation.json, Teile aus dem Teilesatz.
import { profilRig } from './_profil.js';

const rig = profilRig('stehend-profil');
export const { name, defaults, markup, apply, gelenke, greife, pruefeReichweite, rahmen } = rig;
export default rig;
