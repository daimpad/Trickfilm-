// Zufall nur mit festem Seed: gleiche Eingabe ergibt dieselbe Folge (Grundsatz 1).

/** 32-bit-Hash einer Zeichenkette (FNV-1a). */
export function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** PRNG mulberry32; liefert eine Funktion, die Zahlen in [0, 1) zieht. */
export function prng(seed) {
  let a = (typeof seed === 'string' ? hash(seed) : seed) >>> 0;
  return function ziehe() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
