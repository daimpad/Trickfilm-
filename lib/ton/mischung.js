// Endmischung (Abschnitt 8.6, 9.2): Sprache um −16 LUFS, Geräusche 12 dB darunter und unter Sprache
// weitere −6 dB über eine Hüllkurve (30 ms Ansprechen, 150 ms Rückstellen), Grundrauschen bei −60 dBFS. DOM-frei.
import { prng } from '../zufall.js';
import { RATE } from '../sfx/lautheit.js';

export const MISCHUNG = {
  sprache_lufs: -16,
  geraeusch_abstand_db: 12, // Geräusche 10 bis 14 dB unter der Sprache
  pegel_grenze_db: 6, // jeder Absatz höchstens ±6 dB zum Median seines Films
  spitze_max_dbfs: -1, // angehoben nur bis 1 dB unter Vollaussteuerung
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
 * Pegel je Absatz: auf den Median des Films (höchstens ±6 dB), der Median auf −16 LUFS, Spitze höchstens −1 dBFS.
 * messungen: [{ id, lufs_i, true_peak_dbtp }]. Liefert { median, absaetze: [{ id, db, nach, abweichung }], befunde, hinweise }.
 */
export function pegelPlan(messungen, m = MISCHUNG) {
  const med = median(messungen.map((x) => x.lufs_i));
  const befunde = [];
  const hinweise = [];
  const absaetze = messungen.map((x) => {
    const zumMedian = Math.max(-m.pegel_grenze_db, Math.min(m.pegel_grenze_db, med - x.lufs_i));
    const gewuenscht = zumMedian + (m.sprache_lufs - med);
    const db = Math.min(gewuenscht, m.spitze_max_dbfs - x.true_peak_dbtp);
    const nach = x.lufs_i + db;
    const abweichung = nach - m.sprache_lufs;
    if (Math.abs(abweichung) >= m.abweichung_melden_db) befunde.push(`${x.id}: nach dem Pegeln ${nach.toFixed(1)} LUFS, ${abweichung.toFixed(1)} dB neben ${m.sprache_lufs}`);
    return { id: x.id, db: rund(db), nach: rund(nach), abweichung: rund(abweichung) };
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
