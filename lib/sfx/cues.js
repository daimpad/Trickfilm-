// Cue-Liste einer Szene aus ihren Ereignissen (Abschnitt 8.5): Zuordnung zu Katalog-Cues, Ausdünnen,
// Versatz, deterministische Wahl aus dem Vorrat, Laute an Beats, Prüfung der Dichte.
import { hash } from '../zufall.js';

export const DICHTE = { jeSekunde: 6, artenMin: 3, artenMax: 6, lauteMax: 1 };
export const KOPF = 'ERZEUGT von tools/sfx-cues.js aus brief.yaml und animation.js. Nicht von Hand ändern.';

const katalogNachId = (liste) => Object.fromEntries(liste.map((c) => [c.id, c]));
const rund = (x) => Math.round(x * 10000) / 10000;

/** Datei eines Cues: bei Vorrat <id>/NN, sonst <id>; gleiche Animation ergibt dieselbe Wahl, nie zweimal dieselbe hintereinander. */
export function waehleVariante(szene, typ, cue, nummer, vorrat, vorige) {
  if (vorrat <= 1) return { variante: 1, datei: cue };
  let i = hash(`${szene}|${typ}|${cue}|${nummer}`) % vorrat;
  if (i === vorige) i = (i + 1) % vorrat;
  return { variante: i + 1, datei: `${cue}/${String(i + 1).padStart(2, '0')}` };
}

/**
 * sfx: Abschnitt sfx des Briefs; ereignisse: Ergebnis von computeEvents; katalog: Liste aus leseKatalog.
 * Liefert { cues, befunde, hinweise }. Befunde halten den Lauf an, Hinweise nennt er.
 */
export function erzeugeCues({ szene, sfx, ereignisse, katalog, beats = {}, dauer, fps = 30 }) {
  const K = katalogNachId(katalog);
  const befunde = [];
  const hinweise = [];
  const zuordnung = sfx?.ereignisse ?? {};
  const stumm = new Set(sfx?.stumm ?? []);
  const cues = [];

  for (const [typ, z] of Object.entries(zuordnung)) {
    const c = K[z?.cue];
    if (!c) {
      befunde.push(`ereignisse.${typ}: Cue „${z?.cue}“ steht nicht im Katalog`);
      continue;
    }
    if (c.art !== 'sfx') befunde.push(`ereignisse.${typ}: „${c.id}“ ist ein Laut; Laute gehören unter laute`);
    else if (!c.ereignisse.includes(typ)) befunde.push(`ereignisse.${typ}: „${c.id}“ ist im Katalog nicht für ${typ} vorgesehen (${c.ereignisse.join(', ')})`);
    if (!(sfx.quellen ?? {})[typ]) befunde.push(`ereignisse.${typ}: keine Quelle unter quellen.${typ}`);
    if (stumm.has(typ)) befunde.push(`${typ} steht in ereignisse und in stumm`);
    if (z.ausduennen !== undefined && !(Number.isInteger(z.ausduennen) && z.ausduennen >= 1)) befunde.push(`ereignisse.${typ}.ausduennen ist keine ganze Zahl ≥ 1`);
  }
  for (const typ of Object.keys(sfx?.quellen ?? {})) {
    if (!zuordnung[typ] && !stumm.has(typ)) befunde.push(`quellen.${typ}: weder in ereignisse noch in stumm; ein Lauf rät nicht, ob es klingt`);
  }

  const nachTyp = new Map();
  for (const e of ereignisse) {
    if (!nachTyp.has(e.typ)) nachTyp.set(e.typ, []);
    nachTyp.get(e.typ).push(e);
  }
  for (const [typ, liste] of nachTyp) {
    const z = zuordnung[typ];
    const c = K[z?.cue];
    if (!z || !c || c.art !== 'sfx') continue;
    const n = z.ausduennen ?? 1;
    liste.filter((_, i) => i % n === 0).forEach((e) => {
      const t = Math.max(0, e.t + (z.versatz_s ?? 0));
      cues.push({ t: rund(t), typ, cue: c.id, art: 'sfx', gain_db: z.gain_db ?? c.gain_db, beat: e.beat, figur: e.figur, requisite: e.requisite, ort: e.ort, pfad: e.pfad });
    });
  }
  for (const l of sfx?.laute ?? []) {
    const c = K[l.cue];
    if (!c || c.art !== 'laut') {
      befunde.push(`laute: „${l.cue}“ ist kein Laut im Katalog`);
      continue;
    }
    const b = beats[l.beat];
    if (!b) {
      befunde.push(`laute: Beat „${l.beat}“ unbekannt`);
      continue;
    }
    cues.push({ t: rund(b[0] + (l.versatz_s ?? 0)), typ: 'laut', cue: c.id, art: 'laut', gain_db: l.gain_db ?? c.gain_db, beat: l.beat, figur: l.figur ?? null, requisite: null, ort: null, pfad: null });
  }

  cues.sort((a, b) => a.t - b.t || a.cue.localeCompare(b.cue));
  const zaehler = new Map();
  for (const q of cues) {
    const c = K[q.cue];
    const stand = zaehler.get(q.cue) ?? { nummer: 0, vorige: -1 };
    const w = waehleVariante(szene, q.typ, q.cue, stand.nummer, c.varianten_vorrat ?? 1, stand.vorige);
    zaehler.set(q.cue, { nummer: stand.nummer + 1, vorige: w.variante - 1 });
    Object.assign(q, w, { bild: Math.round(q.t * fps) });
    if (q.t > dauer) befunde.push(`${q.cue} bei ${q.t} s liegt nach dem Ende der Szene (${dauer} s)`);
  }

  // Dichte: höchstens sechs Geräusche in einer Sekunde, drei bis sechs Arten, höchstens ein Laut.
  for (let i = 0; i < cues.length; i++) {
    const imFenster = cues.filter((q) => q.t >= cues[i].t && q.t < cues[i].t + 1).length;
    if (imFenster > DICHTE.jeSekunde) {
      befunde.push(`${imFenster} Geräusche zwischen ${cues[i].t} s und ${rund(cues[i].t + 1)} s (höchstens ${DICHTE.jeSekunde}); ausduennen erhöhen`);
      break;
    }
  }
  const arten = new Set(cues.map((q) => q.cue));
  if (arten.size > DICHTE.artenMax) befunde.push(`${arten.size} Geräuscharten (höchstens ${DICHTE.artenMax})`);
  if (arten.size < DICHTE.artenMin) hinweise.push(`${arten.size} Geräuscharten; üblich sind ${DICHTE.artenMin} bis ${DICHTE.artenMax}`);
  const laute = cues.filter((q) => q.art === 'laut');
  if (laute.length > DICHTE.lauteMax) befunde.push(`${laute.length} Laute (höchstens ${DICHTE.lauteMax} je Szene)`);
  if (laute.length) hinweise.push('Laut liegt in einer Sprechpause: an der Aufnahme prüfen, sobald es eine gibt');
  return { cues, befunde, hinweise };
}

/** JSON der Cue-Liste, eine Zeile je Cue, damit Abweichungen im Diff lesbar sind. */
export function cueDatei({ szene, fps, dauer, cues }) {
  const zeilen = cues.map((q) => '    ' + JSON.stringify(q));
  return `{\n  "_erzeugt": ${JSON.stringify(KOPF)},\n  "szene": ${JSON.stringify(szene)},\n  "fps": ${fps},\n  "dauer": ${dauer},\n  "cues": [\n${zeilen.join(',\n')}\n  ]\n}\n`;
}
