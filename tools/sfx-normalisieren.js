// Rohaufnahmen → final/ (WAV mono 48 kHz 24 bit) und prototyp/ (OGG/Opus), mit Messung und Protokoll (Abschnitt 8.4).
// Aufruf: node tools/sfx-normalisieren.js [--messen | --vorschlag] [--ordner lib/sfx] [<cue> …]
//   ohne Schalter: jede gewählte Variante bearbeiten, gegenmessen, protokoll-sfx.tsv schreiben
//   --messen: nur messen (Rohvarianten und fertige Dateien), nichts schreiben
//   --vorschlag: je Cue die sauberste Variante vorläufig wählen; bestätigte Einträge bleiben unberührt
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { finalPfad, herkunft, katalogVon, leseAuswahl, prototypPfad, rohVarianten, schreibeAuswahl, SFX } from '../lib/sfx/ablage.js';
import { bearbeite, guete, teile, vermesse } from '../lib/sfx/bearbeiten.js';
import { dekodiere, messeMitFfmpeg, schreibeOgg, schreibeWav } from '../lib/sfx/ffmpeg.js';
import { momentanMax, truePeak, ZIEL } from '../lib/sfx/lautheit.js';

const PROTOKOLL_SPALTEN = ['id', 'art', 'modell', 'prompt', 'varianten', 'wahl', 'vorlaeufig', 'dateien', 'lufs_momentan_max', 'true_peak_dbtp', 'datum', 'lizenz'];
const zelle = (v) => String(v ?? '').replace(/[\t\n]/g, ' ');
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : String(x));

/** Nur messen. Liefert Zeilen für die Ausgabe. */
export function messe(ordner, ids) {
  const zeilen = [];
  for (const c of katalogVon(ordner).filter((c) => !ids.length || ids.includes(c.id))) {
    for (const v of rohVarianten(ordner, c.id)) {
      const x = dekodiere(v.pfad);
      const m = vermesse(x, c);
      zeilen.push({ id: c.id, variante: v.name, ...m, momentan: momentanMax(x), truePeak: truePeak(x), guete: guete(m, c) });
    }
  }
  return zeilen;
}

/** Vorschlag der Auswahl; bestätigte Einträge werden verweigert, nicht überschrieben. */
export function vorschlag(ordner, ids) {
  const katalog = katalogVon(ordner);
  const auswahl = leseAuswahl(ordner);
  const meldungen = [];
  for (const c of katalog.filter((c) => !ids.length || ids.includes(c.id))) {
    const varianten = rohVarianten(ordner, c.id);
    if (!varianten.length) continue;
    if (auswahl[c.id] && !auswahl[c.id].vorlaeufig) {
      meldungen.push(`${c.id}: von Regie bestätigt (${auswahl[c.id].wahl.join(', ')}), kein Vorschlag`);
      continue;
    }
    const bewertet = varianten
      .map((v) => {
        const m = vermesse(dekodiere(v.pfad), c);
        return { name: v.name, m, g: guete(m, c) };
      })
      .filter((b) => Number.isFinite(b.g))
      .sort((a, b) => a.g - b.g || a.name.localeCompare(b.name));
    if (!bewertet.length) {
      meldungen.push(`${c.id}: alle Varianten still`);
      continue;
    }
    let wahl = [bewertet[0].name];
    if ((c.varianten_vorrat ?? 1) > 1) {
      // Für einen Vorrat alle hörbaren Varianten, die saubersten zuerst: Ein gezählter Einsatz (etwa das
      // Loslassen einer Taste) ergibt nach dem Kürzen nicht immer ein eigenes Stück.
      wahl = bewertet.map((b) => b.name);
    }
    auswahl[c.id] = { wahl, vorlaeufig: true };
    meldungen.push(`${c.id}: vorläufig ${wahl.join(', ')}`);
  }
  schreibeAuswahl(ordner, auswahl, katalog);
  return meldungen;
}

/** Alte Vorratsdateien eines Cues entfernen, bevor neue geschrieben werden (nur NN.wav und NN.ogg). */
function leereVorrat(ordner, id) {
  for (const [unter, endung] of [['final', '.wav'], ['prototyp', '.ogg']]) {
    const d = join(ordner, unter, id);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) if (new RegExp(`^\\d{2}\\${endung}$`).test(f)) rmSync(join(d, f));
  }
}

function schreibeBeide(ordner, datei, daten) {
  for (const p of [finalPfad(ordner, datei), prototypPfad(ordner, datei)]) mkdirSync(dirname(p), { recursive: true });
  schreibeWav(daten, finalPfad(ordner, datei));
  schreibeOgg(daten, prototypPfad(ordner, datei));
  const gegen = messeMitFfmpeg(finalPfad(ordner, datei));
  return gegen;
}

/** Normalisieren. Liefert { befunde, meldungen, fehlend, ohneAuswahl, protokoll }. */
export function normalisiere(ordner, ids) {
  const katalog = katalogVon(ordner);
  const auswahl = leseAuswahl(ordner);
  const her = herkunft(ordner);
  const befunde = [];
  const meldungen = [];
  const fehlend = [];
  const ohneAuswahl = [];
  const zeilen = [];
  for (const c of katalog.filter((c) => !ids.length || ids.includes(c.id))) {
    const varianten = rohVarianten(ordner, c.id);
    if (!varianten.length) {
      fehlend.push(c.id);
      continue;
    }
    const a = auswahl[c.id];
    if (!a?.wahl.length) {
      ohneAuswahl.push(c.id);
      continue;
    }
    const gewaehlt = a.wahl.map((n) => varianten.find((v) => v.name === n));
    if (gewaehlt.some((v) => !v)) {
      befunde.push(`${c.id}: Auswahl ${a.wahl.join(', ')} passt nicht zu den Rohvarianten ${varianten.map((v) => v.name).join(', ')}`);
      continue;
    }
    const vorrat = c.varianten_vorrat ?? 1;
    const ergebnisse = [];
    try {
      if (vorrat > 1) {
        leereVorrat(ordner, c.id);
        const stuecke = gewaehlt.flatMap((v) => teile(dekodiere(v.pfad)));
        for (const s of stuecke) {
          if (ergebnisse.length >= vorrat) break;
          try {
            const r = bearbeite(s, { ...c, einzel: true });
            const datei = `${c.id}/${String(ergebnisse.length + 1).padStart(2, '0')}`;
            ergebnisse.push({ datei, ...r, gegen: schreibeBeide(ordner, datei, r.daten) });
          } catch (e) {
            meldungen.push(`${c.id}: Stück übergangen (${e.message})`);
          }
        }
        if (ergebnisse.length < vorrat) befunde.push(`${c.id}: Vorrat ${ergebnisse.length} von ${vorrat} Einzelereignissen; weitere Variante wählen oder generieren`);
      } else {
        const r = bearbeite(dekodiere(gewaehlt[0].pfad), c);
        ergebnisse.push({ datei: c.id, ...r, gegen: schreibeBeide(ordner, c.id, r.daten) });
      }
    } catch (e) {
      befunde.push(`${c.id}: ${e.message}`);
      continue;
    }
    for (const r of ergebnisse) {
      for (const m of r.meldungen) meldungen.push(`${r.datei}: ${m}`);
      // Gegenmessung mit ffmpeg: Lautheit am Ziel, wo sie die Grenze war; True Peak nie über dem Ziel.
      if (r.messung.grenze === 'lautheit' && Math.abs(r.gegen.momentan - ZIEL.momentan) > 0.5) befunde.push(`${r.datei}: ffmpeg misst ${r.gegen.momentan} LUFS statt ${ZIEL.momentan}`);
      if (r.gegen.truePeak > ZIEL.truePeak + 0.5) befunde.push(`${r.datei}: ffmpeg misst True Peak ${r.gegen.truePeak} dBTP`);
    }
    const h = her[`${c.id}/${a.wahl[0]}`] ?? {};
    const lauteste = ergebnisse.reduce((m, r) => (r.gegen.momentan > m.gegen.momentan ? r : m), ergebnisse[0]);
    zeilen.push({
      id: c.id,
      art: c.art,
      modell: h.modell ?? 'unbekannt',
      prompt: c.prompt ?? c.text,
      varianten: varianten.length,
      wahl: a.wahl.join(','),
      vorlaeufig: a.vorlaeufig,
      dateien: ergebnisse.length,
      lufs_momentan_max: lauteste ? f1(lauteste.gegen.momentan) : '',
      true_peak_dbtp: lauteste ? f1(Math.max(...ergebnisse.map((r) => r.gegen.truePeak))) : '',
      datum: h.datum ?? 'unbekannt',
      lizenz: h.lizenz ?? 'unbekannt',
    });
  }
  const protokoll =
    '# ERZEUGT von tools/sfx-normalisieren.js aus katalog.yaml, auswahl.yaml und roh/herkunft.tsv. Nicht von Hand ändern.\n' +
    PROTOKOLL_SPALTEN.join('\t') +
    '\n' +
    zeilen.map((z) => PROTOKOLL_SPALTEN.map((s) => zelle(z[s])).join('\t')).join('\n') +
    (zeilen.length ? '\n' : '');
  if (!ids.length) writeFileSync(join(ordner, 'protokoll-sfx.tsv'), protokoll);
  return { befunde, meldungen, fehlend, ohneAuswahl, protokoll, fertig: zeilen.length };
}

async function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--ordner');
  const ordner = i >= 0 ? args[i + 1] : SFX;
  const ids = args.filter((a, k) => !a.startsWith('--') && args[k - 1] !== '--ordner');
  const name = relative(process.cwd(), ordner) || '.';
  if (args.includes('--messen')) {
    const zeilen = messe(ordner, ids);
    if (!zeilen.length) console.log(`${name}: keine Rohaufnahmen zu messen; generiert wird erst nach Kostenfreigabe (npm run sfx:kosten)`);
    for (const z of zeilen) {
      console.log(
        `${z.id}/${z.variante}\t${z.stille ? 'still' : `${z.dauer_s.toFixed(2)} s\t${z.einsaetze} Einsätze\tM ${f1(z.momentan)} LUFS\tTP ${f1(z.truePeak)} dBTP${z.vorgeraeusch_s > 0.03 ? `\tVorgeräusch ${z.vorgeraeusch_s.toFixed(2)} s` : ''}${z.uebersteuert ? '\tübersteuert' : ''}\tGüte ${f1(z.guete)}`}`,
      );
    }
    return;
  }
  if (args.includes('--vorschlag')) {
    const meldungen = vorschlag(ordner, ids);
    if (!meldungen.length) console.log(`${name}: keine Rohaufnahmen, also kein Vorschlag`);
    for (const m of meldungen) console.log(m);
    return;
  }
  const r = normalisiere(ordner, ids);
  for (const m of r.meldungen) console.log(m);
  if (r.fehlend.length) console.log(`ohne Rohaufnahme (${r.fehlend.length}): ${r.fehlend.join(', ')}; generiert wird erst nach Kostenfreigabe (npm run sfx:kosten)`);
  if (r.ohneAuswahl.length) console.log(`ohne Auswahl (${r.ohneAuswahl.length}): ${r.ohneAuswahl.join(', ')}; --vorschlag oder Hörprobe`);
  for (const b of r.befunde) console.error(`FEHLER ${b}`);
  console.log(`${name}: ${r.fertig} Cues fertig, ${r.befunde.length} Befunde`);
  if (r.befunde.length) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
