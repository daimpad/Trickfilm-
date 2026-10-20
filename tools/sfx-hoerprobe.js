// Hörprobe aller Varianten zum Auswählen (Abschnitt 8.4): eine Seite, läuft ohne Netz.
// Aufruf: node tools/sfx-hoerprobe.js [--ordner lib/sfx] [--ziel out/sfx/hoerprobe.html]
//         node tools/sfx-hoerprobe.js --uebernehmen <auswahl.csv> [--ordner lib/sfx]
// Regie wählt je Cue eine Variante (bei einem Vorrat mehrere) und bestätigt; die Seite gibt eine CSV aus,
// --uebernehmen schreibt sie nach auswahl.yaml (bestätigt heißt vorlaeufig: false).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { FARBEN, ROLLEN, SCHRIFT } from '../tokens/tokens.js';
import { finalPfad, katalogVon, leseAuswahl, prototypPfad, rohVarianten, schreibeAuswahl, SFX } from '../lib/sfx/ablage.js';
import { guete, vermesse } from '../lib/sfx/bearbeiten.js';
import { dekodiere } from '../lib/sfx/ffmpeg.js';
import { momentanMax, truePeak } from '../lib/sfx/lautheit.js';

const WURZEL = join(import.meta.dirname, '..');
const maskiere = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '–');

/** Rohaufnahme als OGG/Opus für den Browser, eingebettet. */
function alsOgg(pfad) {
  const b = execFileSync('ffmpeg', ['-v', 'error', '-i', pfad, '-ac', '1', '-c:a', 'libopus', '-b:a', '64k', '-f', 'ogg', '-'], { maxBuffer: 1 << 26 });
  return `data:audio/ogg;base64,${b.toString('base64')}`;
}

/** Seite der Hörprobe als Text. */
export function hoerprobeSeite(ordner = SFX) {
  const katalog = katalogVon(ordner);
  const auswahl = leseAuswahl(ordner);
  let generiert = 0;
  const abschnitte = katalog.map((c) => {
    const varianten = rohVarianten(ordner, c.id);
    const a = auswahl[c.id];
    const kopf = `<h2 id="${c.id}">${c.id} <span class="leise">${c.art} · ${c.dauer_s} s${(c.varianten_vorrat ?? 1) > 1 ? ` · Vorrat ${c.varianten_vorrat}` : ''}${c.einzel ? ' · Einzelereignis' : ''}${c.nachklang ? ' · klingt nach' : ''}${c.loop ? ' · Schleife' : ''}</span></h2><p class="prompt">${maskiere(c.prompt ?? c.text)}</p>`;
    if (!varianten.length) return `<section class="cue offen" data-id="${c.id}">${kopf}<p class="leise">noch nicht generiert</p></section>`;
    generiert++;
    const mehrfach = (c.varianten_vorrat ?? 1) > 1;
    const zeilen = varianten.map((v) => {
      const x = dekodiere(v.pfad);
      const m = vermesse(x, c);
      const gewaehlt = a?.wahl.includes(v.name);
      return `<tr><td><label><input type="${mehrfach ? 'checkbox' : 'radio'}" name="wahl-${c.id}" value="${v.name}"${gewaehlt ? ' checked' : ''}> ${v.name}</label></td><td><audio controls preload="none" src="${alsOgg(v.pfad)}"></audio></td><td>${m.stille ? 'still' : `${m.dauer_s.toFixed(2)} s`}</td><td>${m.einsaetze}</td><td>${f1(momentanMax(x))}</td><td>${f1(truePeak(x))}</td><td>${m.vorgeraeusch_s > 0.03 ? `${m.vorgeraeusch_s.toFixed(2)} s` : '–'}</td><td>${m.uebersteuert ? 'ja' : '–'}</td><td>${f1(guete(m, c))}</td></tr>`;
    });
    const dateien = mehrfach ? Array.from({ length: c.varianten_vorrat }, (_, i) => `${c.id}/${String(i + 1).padStart(2, '0')}`) : [c.id];
    const fertige = dateien.filter((d) => existsSync(finalPfad(ordner, d)) && existsSync(prototypPfad(ordner, d)));
    const fertig = fertige.length
      ? `<p>Fertig bearbeitet: ${fertige.map((d) => `<audio controls preload="none" title="${d}" src="data:audio/ogg;base64,${readFileSync(prototypPfad(ordner, d)).toString('base64')}"></audio>`).join(' ')}</p>`
      : '';
    return `<section class="cue" data-id="${c.id}" data-mehrfach="${mehrfach}">${kopf}<table><thead><tr><th>Wahl</th><th>Hören</th><th>Länge</th><th>Einsätze</th><th>M max LUFS</th><th>TP dBTP</th><th>Vorgeräusch</th><th>übersteuert</th><th>Güte</th></tr></thead><tbody>${zeilen.join('')}</tbody></table>${fertig}<label><input type="checkbox" class="bestaetigt"${a && !a.vorlaeufig ? ' checked' : ''}> bestätigt</label></section>`;
  });
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Hörprobe</title><style>
:root{--grund:${FARBEN.primaerHell};--weiss:${FARBEN.weiss};--text:${ROLLEN.text};--kontur:${ROLLEN.kontur};--schrift:${SCHRIFT.familie}}
body{margin:0;padding:16px;background:var(--grund);color:var(--text);font-family:var(--schrift)}h1{font-size:24px}h2{font-size:18px;margin:0 0 4px}
.cue{background:var(--weiss);border:2px solid var(--kontur);padding:8px 16px;margin-bottom:16px}.cue.offen{opacity:0.7}
table{border-collapse:collapse;margin:8px 0}td,th{border-bottom:1px solid var(--kontur);padding:4px 8px;text-align:left;font-size:14px}
.prompt{font-style:italic;margin:0 0 8px}.leise{font-weight:400;font-size:14px}button{font:inherit;padding:4px 12px;border:2px solid var(--kontur);background:var(--weiss);cursor:pointer}
</style></head><body><h1>Hörprobe · ${generiert} von ${katalog.length} Cues generiert</h1>
<p>Je Cue die Variante wählen (bei einem Vorrat mehrere) und „bestätigt“ setzen. Dann die CSV herunterladen und mit <code>npm run sfx:hoerprobe -- --uebernehmen auswahl.csv</code> übernehmen. Güte: kleiner ist sauberer.</p>
<p><button id="csv" type="button">CSV herunterladen</button></p>${abschnitte.join('')}
<script>
document.getElementById('csv').addEventListener('click', () => {
  const zeilen = ['id;wahl;bestaetigt'];
  for (const s of document.querySelectorAll('section.cue:not(.offen)')) {
    const wahl = [...s.querySelectorAll('input[name^="wahl-"]:checked')].map((i) => i.value);
    if (wahl.length) zeilen.push([s.dataset.id, wahl.join('|'), s.querySelector('.bestaetigt').checked ? 'ja' : 'nein'].join(';'));
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([zeilen.join('\\n') + '\\n'], { type: 'text/csv' }));
  a.download = 'auswahl.csv';
  a.click();
});
</script></body></html>
`;
}

/** CSV der Hörprobe nach auswahl.yaml. Liefert Meldungen; unbekannte Cues oder Varianten halten an. */
export function uebernehme(ordner, csv) {
  const katalog = katalogVon(ordner);
  const auswahl = leseAuswahl(ordner);
  const meldungen = [];
  const [kopf, ...zeilen] = csv.split(/\r?\n/).filter(Boolean);
  if (kopf.trim() !== 'id;wahl;bestaetigt') throw new Error('auswahl.csv: erste Zeile muss „id;wahl;bestaetigt“ sein');
  for (const z of zeilen) {
    const [id, wahl, bestaetigt] = z.split(';').map((s) => s.trim());
    const c = katalog.find((k) => k.id === id);
    if (!c) throw new Error(`auswahl.csv: Cue „${id}“ steht nicht im Katalog`);
    const namen = rohVarianten(ordner, id).map((v) => v.name);
    const liste = wahl.split('|').filter(Boolean);
    for (const n of liste) if (!namen.includes(n)) throw new Error(`auswahl.csv: ${id} hat keine Variante „${n}“`);
    if (!liste.length) throw new Error(`auswahl.csv: ${id} ohne Wahl`);
    if (liste.length > 1 && (c.varianten_vorrat ?? 1) <= 1) throw new Error(`auswahl.csv: ${id} hat keinen Vorrat, also genau eine Variante`);
    auswahl[id] = { wahl: liste, vorlaeufig: bestaetigt !== 'ja' };
    meldungen.push(`${id}: ${liste.join(', ')}${bestaetigt === 'ja' ? ' (bestätigt)' : ' (vorläufig)'}`);
  }
  schreibeAuswahl(ordner, auswahl, katalog);
  return meldungen;
}

async function main() {
  const args = process.argv.slice(2);
  const nach = (schalter, vorgabe) => (args.includes(schalter) ? args[args.indexOf(schalter) + 1] : vorgabe);
  const ordner = nach('--ordner', SFX);
  if (args.includes('--uebernehmen')) {
    for (const m of uebernehme(ordner, readFileSync(nach('--uebernehmen'), 'utf8'))) console.log(m);
    console.log('auswahl.yaml geschrieben; danach npm run sfx:normalisieren');
    return;
  }
  const ziel = join(WURZEL, nach('--ziel', 'out/sfx/hoerprobe.html'));
  mkdirSync(dirname(ziel), { recursive: true });
  writeFileSync(ziel, hoerprobeSeite(ordner));
  const offen = katalogVon(ordner).filter((c) => !rohVarianten(ordner, c.id).length).length;
  console.log(`Hörprobe → ${ziel.replace(WURZEL + '/', '')}${offen ? ` (${offen} Cues noch nicht generiert)` : ''}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
