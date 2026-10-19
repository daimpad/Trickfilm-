// Archetyp oberkoerper-nah: Maße aus figuren/rig-spezifikation.json, Teile aus dem Teilesatz.
import { profilRig } from './_profil.js';

const rig = profilRig('oberkoerper-nah');
export const { name, defaults, markup, apply, gelenke, greife, fuss, pruefeReichweite, rahmen } = rig;
export default rig;
