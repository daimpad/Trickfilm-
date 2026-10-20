// Archetyp stehend-frontal: Maße aus figuren/rig-spezifikation.json, Teile aus dem Teilesatz.
import { frontalRig } from './_frontal.js';

const rig = frontalRig('stehend-frontal');
export const { name, defaults, posen, markup, apply, gelenke, greife, fuss, pruefeReichweite, rahmen } = rig;
export default rig;
