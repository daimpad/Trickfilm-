// protokoll.tsv der Szene: eine Zeile je Beat und je Prüfung, Abweichungen als „abw“.
// Aufruf: node lib/protokoll.js <ID|alle> [--pruefen]. Deterministisch, ohne Datum:
// --pruefen schreibt nichts und endet mit Fehler, wenn ein Protokoll veraltet ist.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { alleSzenen, baueSzene, geraeuscheFuer } from './build.js';

const SPALTEN = ['szene', 'beat', 'start_s', 'ende_s', 'figur', 'aktion', 'gefuehl', 'requisiten', 'pruefpunkt', 'status', 'anmerkung'];
const zelle = (v) => String(v ?? '').replace(/[\t\n]/g, ' ');

export async function protokoll(id) {
  const r = await baueSzene(id, { schreiben: false });
  if (!r.sz) throw new Error(`${id}: ${r.befunde.map((b) => b.text).join('; ')}`);
  const { brief: b } = r.sz;
  const zeilen = [];
  const zeile = (werte) => zeilen.push(SPALTEN.map((s) => zelle(werte[s])).join('\t'));
  for (const beat of b.beats ?? []) {
    zeile({ szene: id, beat: beat.name, start_s: beat.start, ende_s: beat.ende, figur: beat.figur, aktion: beat.aktion, gefuehl: beat.gefuehl, requisiten: (beat.requisiten ?? []).join(','), anmerkung: beat.wort ? `„${beat.wort}“` : '' });
  }
  const anzahl = (art) => r.befunde.filter((x) => x.art === art).length;
  const status = (n) => (n === 0 ? 'ok' : 'fehler');
  const st = b.sprechtext ?? {};
  zeile({ szene: id, beat: 'pruef', pruefpunkt: 'schutzzone', status: status(anzahl('schutzzone')), anmerkung: 'Text über y 940' });
  zeile({ szene: id, beat: 'pruef', pruefpunkt: 'reichweite', status: status(anzahl('reichweite')), anmerkung: `${r.bilder} Bilder` });
  zeile({ szene: id, beat: 'pruef', pruefpunkt: 'lesetakt', status: status(anzahl('lesetakt')) });
  zeile({ szene: id, beat: 'pruef', pruefpunkt: 'lesbarkeit_960', status: b.sichtung?.lesbarkeit_960 ?? 'offen', anmerkung: 'Sichtung am Kontaktbogen' });
  zeile({ szene: id, beat: 'pruef', pruefpunkt: 'synchron', status: b.sichtung?.synchron ?? 'offen', anmerkung: 'Stichprobe am Bild' });
  if (b.sfx) {
    const { cues, toene } = geraeuscheFuer(r.sz);
    const ohneTon = cues.filter((c) => !(c.datei in toene)).length;
    zeile({ szene: id, beat: 'pruef', pruefpunkt: 'geraeusche', status: ohneTon ? 'ohne_ton' : 'ok', anmerkung: `${cues.length} Cues, ${new Set(cues.map((c) => c.cue)).size} Arten, ${ohneTon} ohne Ton` });
  } else zeile({ szene: id, beat: 'pruef', pruefpunkt: 'geraeusche', status: 'ohne', anmerkung: 'kein Abschnitt sfx im Brief' });
  zeile({ szene: id, beat: 'pruef', pruefpunkt: 'dauer', status: st.dauer_geschaetzt ? 'geschaetzt' : 'gemessen', anmerkung: `Sprechtext ${st.dauer_s} s, Szene ${st.dauer_szene_s} s` });
  zeile({ szene: id, beat: 'pruef', pruefpunkt: 'build', status: status(r.befunde.length), anmerkung: `${r.befunde.length} Befunde` });
  for (const a of b.abweichungen ?? []) zeile({ szene: id, beat: 'abw', anmerkung: typeof a === 'string' ? a : JSON.stringify(a) });
  return `# ERZEUGT von lib/protokoll.js aus brief.yaml und der Prüfung des Builds. Nicht von Hand ändern.\n${SPALTEN.join('\t')}\n${zeilen.join('\n')}\n`;
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Aufruf: node lib/protokoll.js <ID|alle> [--pruefen]');
    process.exit(2);
  }
  const pruefen = process.argv.includes('--pruefen');
  let veraltet = 0;
  for (const id of arg === 'alle' ? alleSzenen() : [arg]) {
    const inhalt = await protokoll(id);
    const ziel = join('szenen', id, 'protokoll.tsv');
    const alt = existsSync(ziel) ? readFileSync(ziel, 'utf8') : null;
    if (alt === inhalt) continue;
    if (pruefen) {
      console.error(`FEHLER veraltet: ${ziel} (npm run szene:protokoll -- ${id})`);
      veraltet++;
    } else {
      writeFileSync(ziel, inhalt);
      console.log(`geschrieben: ${ziel}`);
    }
  }
  if (veraltet) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
