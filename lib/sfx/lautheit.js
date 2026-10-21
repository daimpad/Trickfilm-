// Lautheit und True Peak nach ITU-R BS.1770 für mono 48 kHz, ohne Abhängigkeit (Abschnitt 8.4).
// Momentanlautheit: 400-ms-Fenster, alle 100 ms, K-Filter; integrierte Lautheit mit Gates; True Peak: vierfach überabgetastet.
// Gegengeprüft wird mit ffmpeg -af ebur128=peak=true (test/sfx.test.js).

export const RATE = 48000;
const BLOCK = RATE / 10; // 100 ms
const FENSTER = 4 * BLOCK; // 400 ms

/** Biquad als Direktform I über ein Float64Array. */
function biquad(x, [b0, b1, b2], [, a1, a2]) {
  const y = new Float64Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = v;
    y[i] = v;
  }
  return y;
}

/** K-Filter für 48 kHz (BS.1770-4, Tabellen 1 und 2): Hochton-Kuhschwanz, dann Hochpass. */
export function kFilter(x) {
  const stufe1 = biquad(x, [1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]);
  return biquad(stufe1, [1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621]);
}

const lufs = (mittel) => (mittel > 0 ? -0.691 + 10 * Math.log10(mittel) : -Infinity);

/**
 * Größte Momentanlautheit in LUFS. Am Ende wird um ein Fenster mit Stille verlängert, damit auch ein
 * kurzes Geräusch ganz in einem Fenster liegt; jedes Fenster teilt durch volle 400 ms.
 */
export function momentanMax(x) {
  const n = Math.ceil((x.length + FENSTER) / BLOCK) * BLOCK;
  const y = kFilter(Float64Array.from({ length: n }, (_, i) => (i < x.length ? x[i] : 0)));
  const bloecke = [];
  for (let b = 0; b < n / BLOCK; b++) {
    let s = 0;
    for (let i = b * BLOCK; i < (b + 1) * BLOCK; i++) s += y[i] * y[i];
    bloecke.push(s);
  }
  let max = -Infinity;
  for (let b = 0; b < bloecke.length; b++) {
    let s = 0;
    for (let k = Math.max(0, b - 3); k <= b; k++) s += bloecke[k];
    max = Math.max(max, lufs(s / FENSTER));
  }
  return max;
}

/**
 * Integrierte Lautheit in LUFS (BS.1770-4): 400-ms-Blöcke mit 75 % Überlappung, absolutes Gate −70 LUFS,
 * relatives Gate 10 LU unter dem Mittel der Blöcke über dem absoluten Gate. Für Sprache (Abschnitt 9.2).
 */
export function integriert(x) {
  if (x.length < FENSTER) return -Infinity;
  const y = kFilter(Float64Array.from(x));
  const bloecke = [];
  for (let start = 0; start + FENSTER <= y.length; start += BLOCK) {
    let s = 0;
    for (let i = start; i < start + FENSTER; i++) s += y[i] * y[i];
    bloecke.push(s / FENSTER);
  }
  const ueberAbsolut = bloecke.filter((e) => lufs(e) > -70);
  if (!ueberAbsolut.length) return -Infinity;
  const relativ = lufs(ueberAbsolut.reduce((a, b) => a + b, 0) / ueberAbsolut.length) - 10;
  const gezaehlt = ueberAbsolut.filter((e) => lufs(e) > relativ);
  return lufs(gezaehlt.reduce((a, b) => a + b, 0) / gezaehlt.length);
}

// Interpolationsfilter: gefensterter Sinus, 4 Phasen zu je 24 Takten, jede Phase auf Verstärkung 1.
const FAKTOR = 4;
const TAKTE = 24;
const PHASEN = (() => {
  const L = FAKTOR * TAKTE;
  const h = Array.from({ length: L }, (_, n) => {
    const m = (n - (L - 1) / 2) / FAKTOR;
    const sinc = m === 0 ? 1 : Math.sin(Math.PI * m) / (Math.PI * m);
    const fenster = 0.5 - 0.5 * Math.cos((2 * Math.PI * (n + 0.5)) / L);
    return sinc * fenster;
  });
  return Array.from({ length: FAKTOR }, (_, p) => {
    const phase = Array.from({ length: TAKTE }, (_, j) => h[p + FAKTOR * j]);
    const summe = phase.reduce((a, b) => a + b, 0);
    return phase.map((v) => v / summe);
  });
})();

/** True Peak in dBTP: größter Betrag des vierfach überabgetasteten Signals, mindestens der Abtastspitzenwert. */
export function truePeak(x) {
  let max = 0;
  for (let i = 0; i < x.length; i++) max = Math.max(max, Math.abs(x[i]));
  for (let m = 0; m < x.length + TAKTE; m++) {
    for (const phase of PHASEN) {
      let s = 0;
      for (let j = 0; j < TAKTE; j++) {
        const k = m - j;
        if (k >= 0 && k < x.length) s += phase[j] * x[k];
      }
      max = Math.max(max, Math.abs(s));
    }
  }
  return max > 0 ? 20 * Math.log10(max) : -Infinity;
}

/** Abtastspitzenwert in dBFS. */
export function spitze(x) {
  let max = 0;
  for (let i = 0; i < x.length; i++) max = Math.max(max, Math.abs(x[i]));
  return max > 0 ? 20 * Math.log10(max) : -Infinity;
}

/** Ziel 8.4: −20 LUFS größte Momentanlautheit, True Peak ≤ −3 dBTP; bei kurzen Geräuschen geht der True Peak vor. */
export const ZIEL = { momentan: -20, truePeak: -3 };

/** Verstärkung in dB, die beide Ziele einhält, und welches Ziel sie bestimmt. */
export function zielVerstaerkung(x, ziel = ZIEL) {
  const m = momentanMax(x);
  const tp = truePeak(x);
  const nachLautheit = ziel.momentan - m;
  const nachSpitze = ziel.truePeak - tp;
  return nachSpitze < nachLautheit ? { db: nachSpitze, grenze: 'truePeak', momentan: m, truePeak: tp } : { db: nachLautheit, grenze: 'lautheit', momentan: m, truePeak: tp };
}
