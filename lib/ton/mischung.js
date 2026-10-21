// Endmischung (Abschnitt 8.6, 9.2): Sprache um −16 LUFS, Geräusche 12 dB darunter und unter Sprache
// weitere −6 dB über eine Hüllkurve (30 ms Ansprechen, 150 ms Rückstellen), Grundrauschen bei −60 dBFS.
// Spitzen der Sprache über −1 dBFS nimmt ein Begrenzer mit Vorlauf, damit die Lautheit nicht an einer Spitze hängt. DOM-frei.
import { prng } from '../zufall.js';
import { RATE } from '../sfx/lautheit.js';

export const MISCHUNG = {
  sprache_lufs: -16,
  geraeusch_abstand_db: 12, // Geräusche 10 bis 14 dB unter der Sprache
  pegel_grenze_db: 6, // jeder Absatz höchstens ±6 dB zum Median seines Films
  spitze_max_dbfs: -1, // Spitze nach der Mischung höchstens 1 dB unter Vollaussteuerung
  begrenzer_decke_dbfs: -1.5, // Abtastwerte; 0,5 dB Reserve für Spitzen zwischen den Abtastwerten
  begrenzer_vorlauf_ms: 5,
  begrenzer_rueckstellen_ms: 80,
  begrenzer_tiefe_max_db: 6, // mehr Begrenzung hört man; dann ist die Aufnahme zu spitz
  abweichung_melden_db: 1,
  streuung_melden_lu: 3,
  ducking_db: -6,
  ansprechen_ms: 30,
  rueckstellen_ms: 150,
  sprache_schwelle_dbfs: -45,
  rauschen_dbfs: -60,
  rauschen_seed: 'trickfilm-grundrauschen',
};

const median = (werte) => {
  const s = [...werte].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Pegel je Absatz: auf den Median des Films (höchstens ±6 dB), der Median auf −16 LUFS. Was dabei über −1 dBFS
 * steigt, nimmt der Begrenzer; begrenzung nennt, um wie viel dB. messungen: [{ id, lufs_i, true_peak_dbtp }].
 * Liefert { median, absaetze: [{ id, db, nach, abweichung, begrenzung }], befunde, hinweise }.
 */
export function pegelPlan(messungen, m = MISCHUNG) {
  const med = median(messungen.map((x) => x.lufs_i));
  const befunde = [];
  const hinweise = [];
  const absaetze = messungen.map((x) => {
    const zumMedian = Math.max(-m.pegel_grenze_db, Math.min(m.pegel_grenze_db, med - x.lufs_i));
    const gewuenscht = zumMedian + (m.sprache_lufs - med);
    const db = gewuenscht;
    const begrenzung = Math.max(0, x.true_peak_dbtp + db - m.spitze_max_dbfs);
    if (begrenzung > m.begrenzer_tiefe_max_db) befunde.push(`${x.id}: Spitzen ${begrenzung.toFixed(1)} dB über ${m.spitze_max_dbfs} dBFS, mehr als der Begrenzer hörbar nehmen kann (${m.begrenzer_tiefe_max_db} dB)`);
    const nach = x.lufs_i + db;
    const abweichung = nach - m.sprache_lufs;
    if (Math.abs(abweichung) >= m.abweichung_melden_db) befunde.push(`${x.id}: nach dem Pegeln ${nach.toFixed(1)} LUFS, ${abweichung.toFixed(1)} dB neben ${m.sprache_lufs}`);
    return { id: x.id, db: rund(db), nach: rund(nach), abweichung: rund(abweichung), begrenzung: rund(begrenzung) };
  });
  const lufs = messungen.map((x) => x.lufs_i);
  const streuung = Math.max(...lufs) - Math.min(...lufs);
  if (streuung > m.streuung_melden_lu) hinweise.push(`Streuung der Absätze ${streuung.toFixed(1)} LU (über ${m.streuung_melden_lu})`);
  return { median: rund(med), absaetze, befunde, hinweise };
}

const rund = (v) => Number(v.toFixed(2));
export const dbZuFaktor = (db) => 10 ** (db / 20);

/**
 * Ducking aus der Hüllkurve der Sprache: 1 dort, wo nicht gesprochen wird, bis −6 dB unter Sprache,
 * mit 30 ms Ansprechen und 150 ms Rückstellen. Liefert einen Faktor je Abtastwert.
 */
export function ducking(sprache, m = MISCHUNG) {
  const schwelle = dbZuFaktor(m.sprache_schwelle_dbfs);
  const an = 1 - Math.exp(-1 / ((m.ansprechen_ms / 1000) * RATE));
  const ab = 1 - Math.exp(-1 / ((m.rueckstellen_ms / 1000) * RATE));
  const tiefe = 1 - dbZuFaktor(m.ducking_db);
  // Pegelfolger: Spitzen sofort, Abfall über 20 ms, damit Nulldurchgänge der Sprache nicht als Stille gelten.
  const abfall = Math.exp(-1 / (0.02 * RATE));
  const faktor = new Float32Array(sprache.length);
  let pegel = 0;
  let huelle = 0;
  for (let i = 0; i < sprache.length; i++) {
    pegel = Math.max(Math.abs(sprache[i]), pegel * abfall);
    const ziel = pegel > schwelle ? 1 : 0;
    huelle += (ziel - huelle) * (ziel > huelle ? an : ab);
    faktor[i] = 1 - tiefe * huelle;
  }
  return faktor;
}

/**
 * Begrenzer mit Vorlauf: die nötige Verstärkung je Abtastwert, ihr Minimum über ± Vorlauf, Rückstellen über eine
 * Zeitkonstante, dann über den Vorlauf gemittelt, damit die Absenkung vor der Spitze beginnt und nicht knackt.
 * Liefert { aus, tiefe_db } mit der größten Absenkung.
 */
export function begrenze(x, m = MISCHUNG) {
  const decke = dbZuFaktor(m.begrenzer_decke_dbfs);
  const L = Math.max(1, Math.round((m.begrenzer_vorlauf_ms / 1000) * RATE));
  const ab = 1 - Math.exp(-1 / ((m.begrenzer_rueckstellen_ms / 1000) * RATE));
  const n = x.length;
  const noetig = Float32Array.from(x, (v) => (Math.abs(v) > decke ? decke / Math.abs(v) : 1));
  // Gleitendes Minimum über [i − L, i + L] mit einer monotonen Schlange.
  const minimum = new Float32Array(n);
  const schlange = new Int32Array(n);
  let kopf = 0;
  let ende = 0;
  for (let j = 0; j < n + L; j++) {
    if (j < n) {
      while (ende > kopf && noetig[schlange[ende - 1]] >= noetig[j]) ende--;
      schlange[ende++] = j;
    }
    const i = j - L;
    if (i < 0) continue;
    while (schlange[kopf] < i - L) kopf++;
    minimum[i] = noetig[schlange[kopf]];
  }
  let g = 1;
  const glatt = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    g = minimum[i] < g ? minimum[i] : g + (minimum[i] - g) * ab;
    glatt[i] = g;
  }
  const aus = new Float32Array(n);
  let summe = 0;
  let tiefste = 1;
  const h = Math.floor(L / 2);
  for (let i = -h; i < n; i++) {
    if (i + h < n) summe += glatt[i + h];
    if (i - h - 1 >= 0) summe -= glatt[i - h - 1];
    if (i < 0) continue;
    const zahl = Math.min(i + h, n - 1) - Math.max(i - h, 0) + 1;
    const f = summe / zahl;
    tiefste = Math.min(tiefste, f);
    aus[i] = x[i] * f;
  }
  return { aus, tiefe_db: rund(-20 * Math.log10(tiefste)) };
}

/** Grundrauschen: weißes Rauschen mit festem Seed, Effektivwert −60 dBFS. */
export function grundrauschen(n, m = MISCHUNG) {
  const ziehe = prng(m.rauschen_seed);
  const amp = dbZuFaktor(m.rauschen_dbfs) * Math.sqrt(3); // gleichverteilt in [−a, a] hat den Effektivwert a/√3
  return Float32Array.from({ length: n }, () => amp * (2 * ziehe() - 1));
}

/** Ein Stück an einer Stelle in eine Spur addieren, mit Faktor. */
export function lege(spur, stueck, startS, faktor = 1) {
  const o = Math.round(startS * RATE);
  for (let i = 0; i < stueck.length && o + i < spur.length; i++) if (o + i >= 0) spur[o + i] += faktor * stueck[i];
}
