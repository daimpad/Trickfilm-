// Eine Szene bauen und prüfen (Abschnitt 6.5). Aufruf: node lib/build.js <ID|alle>
// Prüft, was sich maschinell entscheiden lässt, und schreibt dist/index.html (eine Datei, lädt nichts nach),
// dist/szene-rig.svg (Markup bei t = 0, für den Remotion-Port) und dist/pruefung.json.
// Nur in Node verwendet.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BUEHNE, FARBEN, ROLLEN, SCHRIFT } from '../tokens/tokens.js';
import { leseBrief } from './brief.js';
import { buendle, importmapSkript } from './bundle.js';
import { RIGS } from './rigs/index.js';
import { REQUISITEN } from './props/index.js';
import { idVerzeichnis, wendeAn } from './snapshot.js';
import { SCHUTZZONE_Y, UNTERLAENGE, standzeit, BESCHRIFTUNG_MAX } from './stage.js';
import { TEMPO_GRENZEN } from './spielweise.js';

export const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SZENEN = join(WURZEL, 'szenen');

/** Prüfungen, die der Build noch nicht maschinell entscheidet; der Lauf nennt sie. */
export const NOCH_NICHT = ['Flackern (höchstens drei Hell-Dunkel-Wechsel je Sekunde): am Kontaktbogen und im Prototyp ansehen'];

/** Alle Szenen-IDs mit brief.yaml, alphabetisch. */
export function alleSzenen() {
  return readdirSync(SZENEN, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(SZENEN, d.name, 'brief.yaml')))
    .map((d) => d.name)
    .sort();
}

/** Szene laden: Brief und Module. Fehlt eine Pflichtdatei, hält es an. */
export async function ladeSzene(id) {
  const ordner = join(SZENEN, id);
  for (const datei of ['brief.yaml', 'geometry.js', 'scene.js', 'animation.js']) {
    if (!existsSync(join(ordner, datei))) throw new Error(`${id}: ${datei} fehlt`);
  }
  const brief = leseBrief(readFileSync(join(ordner, 'brief.yaml'), 'utf8'));
  const lade = (datei) => import(pathToFileURL(join(ordner, datei)).href);
  const [geometry, scene, animation] = await Promise.all([lade('geometry.js'), lade('scene.js'), lade('animation.js')]);
  const requisiten = existsSync(join(ordner, 'requisiten.js')) ? await lade('requisiten.js') : null;
  return { id, ordner, brief, geometry, scene, animation, requisiten };
}

const nahe = (a, b, eps = 1e-3) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= eps;
const TOKEN_FARBEN = new Set(Object.values(FARBEN));

/** Brief vollständig und deckungsgleich mit dem Code. */
function pruefeBrief(sz, befund) {
  const { brief: b, geometry, scene, animation } = sz;
  const GEO = geometry.GEO ?? {};
  const pflicht = ['id', 'film', 'sprechtext', 'these', 'pointe', 'palette', 'figuren', 'requisiten', 'beats', 'beschriftungen', 'textaequivalent', 'annahmen', 'abweichungen', 'sichtung'];
  for (const k of pflicht) if (!(k in b)) befund('brief', `Feld „${k}“ fehlt`);
  if (b.id !== sz.id) befund('brief', `id „${b.id}“ passt nicht zum Ordner „${sz.id}“`);
  if (b.film && !sz.id.startsWith(`${b.film}-`) && !sz.id.startsWith('_')) befund('brief', `film „${b.film}“ passt nicht zur ID`);

  const st = b.sprechtext ?? {};
  if (!st.passage) befund('brief', 'sprechtext.passage ist leer');
  const spec = animation.SPEC ?? {};
  if (spec.fps !== BUEHNE.fps || spec.width !== BUEHNE.breite || spec.height !== BUEHNE.hoehe) {
    befund('code', `SPEC muss ${BUEHNE.breite}×${BUEHNE.hoehe} bei ${BUEHNE.fps} fps sein`);
  }
  if (!nahe(spec.duration, st.dauer_szene_s)) befund('brief', `dauer_szene_s ${st.dauer_szene_s} ≠ SPEC.duration ${spec.duration}`);
  if (st.dauer_geschaetzt === true && st.passage) {
    const geschaetzt = st.passage.length / 15;
    if (Math.abs(st.dauer_s - geschaetzt) > Math.max(0.5, geschaetzt * 0.1)) {
      befund('brief', `dauer_s ${st.dauer_s} weicht von der Schätzung ${geschaetzt.toFixed(1)} s (15 Zeichen/s) ab`);
    }
    if (!(st.luft_prozent >= 10 && st.luft_prozent <= 15)) befund('brief', `luft_prozent ${st.luft_prozent} nicht zwischen 10 und 15`);
    if (st.dauer_szene_s < st.dauer_s * (1 + (st.luft_prozent ?? 0) / 100) - 0.05) befund('brief', 'dauer_szene_s ist kürzer als Sprechdauer plus Luft');
  }
  if (st.dauer_geschaetzt === false && st.datei && !existsSync(join(WURZEL, st.datei))) befund('brief', `Aufnahme ${st.datei} fehlt`);

  // Beats: gleiche Namen, Reihenfolge und Zeiten wie BEATS.
  const beats = animation.BEATS ?? {};
  const imCode = Object.entries(beats);
  const imBrief = b.beats ?? [];
  if (imCode.map(([n]) => n).join(',') !== imBrief.map((x) => x.name).join(',')) {
    befund('brief', `Beats im Brief (${imBrief.map((x) => x.name).join(', ')}) ≠ BEATS (${imCode.map(([n]) => n).join(', ')})`);
  } else {
    imBrief.forEach((x, i) => {
      const [t0, t1] = imCode[i][1];
      if (!nahe(x.start, t0) || !nahe(x.ende, t1)) befund('brief', `Beat „${x.name}“: Brief ${x.start}–${x.ende} ≠ Code ${t0}–${t1}`);
      if (t1 <= t0 || t0 < 0 || t1 > spec.duration) befund('code', `Beat „${x.name}“ liegt nicht in der Szene`);
    });
  }

  // Palette nur aus den Tokens, deckungsgleich mit GEO.palette.
  for (const k of ['grund', 'akzent1', 'akzent2']) {
    const imB = b.palette?.[k] ?? null;
    const imG = GEO.palette?.[k] ?? null;
    if (imB !== imG) befund('brief', `palette.${k}: Brief ${imB} ≠ GEO ${imG}`);
    if (imB && !TOKEN_FARBEN.has(imB)) befund('brief', `palette.${k} ${imB} ist keine Farbe der Tokens`);
  }

  // Beschriftungen wörtlich wie GEO.labels.
  for (const k of new Set([...Object.keys(b.beschriftungen ?? {}), ...Object.keys(GEO.labels ?? {})])) {
    const imB = b.beschriftungen?.[k] ?? '';
    const imG = GEO.labels?.[k] ?? '';
    if (imB !== imG) befund('brief', `beschriftungen.${k}: „${imB}“ ≠ GEO.labels „${imG}“`);
    if (imB.length > BESCHRIFTUNG_MAX) befund('brief', `beschriftungen.${k} länger als ${BESCHRIFTUNG_MAX} Zeichen`);
  }

  if (!scene.TITEL) befund('code', 'scene.js exportiert keinen TITEL');
  if ((b.textaequivalent ?? '') !== (scene.DESC ?? '')) befund('brief', 'textaequivalent ≠ DESC in scene.js');

  // Figuren: Rig und Teilesatz wie in GEO.figuren, Charakter im erlaubten Tempo.
  for (const f of b.figuren ?? []) {
    const g = GEO.figuren?.[f.prefix];
    if (!g) befund('brief', `Figur ${f.prefix} fehlt in GEO.figuren`);
    else {
      if (g.rig !== f.rig) befund('brief', `Figur ${f.prefix}: rig ${f.rig} ≠ GEO ${g.rig}`);
      if ((g.teilesatz ?? 'satz-00') !== (f.teilesatz ?? 'satz-00')) befund('brief', `Figur ${f.prefix}: teilesatz ungleich`);
    }
    if (!RIGS[f.rig]) befund('brief', `Figur ${f.prefix}: Rig „${f.rig}“ unbekannt`);
    const k = animation.CHARAKTER?.[f.prefix];
    if (!k) befund('code', `CHARAKTER.${f.prefix} fehlt`);
    else if (k.tempo < TEMPO_GRENZEN[0] || k.tempo > TEMPO_GRENZEN[1]) befund('code', `CHARAKTER.${f.prefix}.tempo außerhalb ${TEMPO_GRENZEN.join('–')}`);
    if (f.charakter?.tempo !== undefined && k && !nahe(f.charakter.tempo, k.tempo)) befund('brief', `Figur ${f.prefix}: tempo Brief ≠ CHARAKTER`);
  }

  for (const r of b.requisiten ?? []) {
    if (!REQUISITEN[r] && !sz.requisiten?.REQUISITEN?.[r]) befund('brief', `Requisite „${r}“ weder in der Bibliothek noch in requisiten.js`);
  }

  for (const [k, v] of Object.entries(b.sichtung ?? {})) {
    if (!['ok', 'offen'].includes(v)) befund('brief', `sichtung.${k} muss ok oder offen sein, ist ${v}`);
  }

  const kb = animation.KONTAKTBOGEN ?? [];
  if (kb.length !== 9) befund('code', `KONTAKTBOGEN hat ${kb.length} statt 9 Zeitpunkte`);
  if (kb.some((t) => t < 0 || t > spec.duration)) befund('code', 'KONTAKTBOGEN-Zeitpunkt außerhalb der Szene');
}

/** Markup ohne Keyframes, SMIL, Verläufe, Filter, Eckradien; clip-path nur auf untransformierten Hüllen. */
function pruefeMarkup(markup, sz, befund) {
  const verboten = [
    [/<style\b|@keyframes/, 'CSS im Markup'],
    [/<(animate|animateTransform|animateMotion|set)\b/, 'SMIL'],
    [/<(linearGradient|radialGradient)\b/, 'Verlauf'],
    [/<(filter|mask)\b/, 'Filter oder Maske'],
    [/<rect\b[^>]*\s(rx|ry)="/, 'Eckradius'],
    [/NaN|undefined|Infinity/, 'ungültiger Wert'],
  ];
  for (const [re, was] of verboten) if (re.test(markup)) befund('markup', `${was} im Markup`);
  for (const m of markup.matchAll(/<[a-zA-Z]+\b([^>]*)\sclip-path="[^"]*"([^>]*)>/g)) {
    if (/\stransform="/.test(m[1] + m[2])) befund('markup', 'clip-path auf einer transformierten Gruppe');
  }
  if (!markup.includes('<desc') || !markup.includes(sz.scene.DESC?.slice(0, 40) ?? '')) befund('markup', '<desc> trägt nicht das Textäquivalent');
  const { doppelt } = idVerzeichnis(markup);
  if (doppelt.length) befund('markup', `doppelte IDs: ${[...new Set(doppelt)].join(', ')}`);
  // Text über der Schutzzone: Grundlinie plus Unterlänge.
  for (const m of markup.matchAll(/<text\b([^>]*)>/g)) {
    const y = Number(/\sy="([^"]+)"/.exec(m[1])?.[1]);
    const gr = Number(/\sfont-size="([^"]+)"/.exec(m[1])?.[1] ?? SCHRIFT.groesse.beschriftung);
    if (Number.isFinite(y) && y + gr * UNTERLAENGE > SCHUTZZONE_Y) befund('schutzzone', `Text bei y ${y} reicht in die Schutzzone (ab y ${SCHUTZZONE_Y})`);
  }
}

/** Jedes Bild: jede ID und jedes Attribut vorhanden, kein NaN, Handziele erreichbar, Lesetakt der Beschriftungen. */
function pruefeBilder(markup, sz, befund) {
  const { animation, scene, brief } = sz;
  const fps = animation.SPEC.fps;
  const n = Math.round(animation.SPEC.duration * fps);
  const { ids } = idVerzeichnis(markup);
  const gemeldet = new Set();
  const einmal = (schluessel, art, text) => {
    if (gemeldet.has(schluessel)) return;
    gemeldet.add(schluessel);
    befund(art, text);
  };
  const figuren = (brief.figuren ?? []).filter((f) => RIGS[f.rig]);
  const labelBilder = new Map();
  let reichweite = 0;
  for (let f = 0; f <= n; f++) {
    const t = f / fps;
    let s;
    let liste;
    try {
      s = animation.computeState(t);
      liste = scene.sceneApply(s);
    } catch (e) {
      einmal(`fehler:${e.message}`, 'bild', `Bild ${f}: ${e.message}`);
      continue;
    }
    for (const [id, attr, wert] of liste) {
      if (!ids.has(id)) einmal(`id:${id}`, 'bild', `Bild ${f}: #${id} steht nicht im Markup`);
      else if (!ids.get(id).has(attr)) einmal(`attr:${id}:${attr}`, 'bild', `Bild ${f}: #${id} trägt kein „${attr}“ im Markup`);
      const w = String(wert);
      if (wert === null || wert === undefined || /NaN|undefined|Infinity/.test(w)) einmal(`nan:${id}:${attr}`, 'bild', `Bild ${f}: #${id}.${attr} = ${w}`);
      if (id.startsWith('label-') && attr === 'opacity' && Number(wert) > 0.5) labelBilder.set(id, (labelBilder.get(id) ?? 0) + 1);
    }
    for (const fig of figuren) {
      const zustand = s[fig.prefix];
      if (!zustand) {
        einmal(`fig:${fig.prefix}`, 'bild', `computeState liefert keine Figur ${fig.prefix}`);
        continue;
      }
      for (const b of RIGS[fig.rig].pruefeReichweite(zustand)) {
        reichweite++;
        einmal(`reich:${fig.prefix}:${b.arm}`, 'reichweite', `Bild ${f}: ${fig.prefix}.${b.arm} verfehlt das Handziel um ${b.abstand} px (außer Reichweite)`);
      }
    }
  }
  // Lesetakt: jede Beschriftung steht mindestens lesezeitFrames lang.
  for (const [platz, inhalt] of Object.entries(sz.geometry.GEO?.labels ?? {})) {
    if (!inhalt) continue;
    const id = `label-${platz}`;
    const bilder = labelBilder.has(id) ? labelBilder.get(id) : n + 1;
    if (bilder < standzeit(inhalt, fps)) befund('lesetakt', `„${inhalt}“ steht ${bilder} Bilder, braucht ${standzeit(inhalt, fps)}`);
  }
  // Determinismus: dasselbe t ergibt denselben Zustand.
  for (const t of [0, animation.SPEC.duration / 2, animation.SPEC.duration]) {
    if (JSON.stringify(animation.computeState(t)) !== JSON.stringify(animation.computeState(t))) befund('determinismus', `computeState(${t}) ist nicht wiederholbar`);
  }
  return { bilder: n + 1, reichweite };
}

/** CSS-Variablen der Prototyp-Seite aus den Tokens. */
function tokensCss() {
  return [
    `--grund: ${FARBEN.primaerHell}`,
    `--weiss: ${FARBEN.weiss}`,
    `--text: ${ROLLEN.text}`,
    `--kontur: ${ROLLEN.kontur}`,
    `--schrift: ${SCHRIFT.familie}`,
  ].join('; ') + ';';
}

const maskiere = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Geräusche für den Prototyp: Cues aus sfx-cues.json und je Datei das OGG aus lib/sfx/prototyp, soweit
 * schon generiert. Fehlt die Cue-Liste, obwohl der Brief Geräusche vorsieht, ist das ein Befund.
 */
export function geraeuscheFuer(sz, befund = () => {}) {
  const pfad = join(sz.ordner, 'sfx-cues.json');
  if (!existsSync(pfad)) {
    if (sz.brief.sfx) befund('geraeusche', `sfx-cues.json fehlt (npm run sfx:cues -- ${sz.id})`);
    return { cues: [], toene: {} };
  }
  const { cues } = JSON.parse(readFileSync(pfad, 'utf8'));
  const toene = {};
  for (const { datei } of cues) {
    const ogg = join(WURZEL, 'lib', 'sfx', 'prototyp', `${datei}.ogg`);
    if (!(datei in toene) && existsSync(ogg)) toene[datei] = readFileSync(ogg).toString('base64');
  }
  return { cues: cues.map(({ t, datei, gain_db, cue }) => ({ t, datei, gain_db, cue })), toene };
}

/** Prototyp-Seite aus der Vorlage; ton aus geraeuscheFuer. */
export function viewerSeite(sz, markup, ton = { cues: [], toene: {} }) {
  const { importmap, schluessel } = buendle([join(sz.ordner, 'scene.js'), join(sz.ordner, 'animation.js')], WURZEL);
  const vorlage = readFileSync(join(WURZEL, 'lib', 'viewer.template.html'), 'utf8');
  const ersetzungen = {
    TITEL: maskiere(`${sz.id} · ${sz.scene.TITEL ?? ''}`),
    TOKENS_CSS: tokensCss(),
    SVG: markup,
    DESC: maskiere(sz.scene.DESC ?? ''),
    IMPORTMAP: importmapSkript(importmap),
    CUES_JSON: JSON.stringify(ton).replace(/</g, '\\u003c'),
    SZENE_ANIMATION: schluessel(join(sz.ordner, 'animation.js')),
    SZENE_SCENE: schluessel(join(sz.ordner, 'scene.js')),
  };
  return vorlage.replace(/\{\{([A-Z_]+)\}\}/g, (ganz, k) => {
    if (!(k in ersetzungen)) throw new Error(`Viewer-Vorlage: Platzhalter {{${k}}} unbekannt`);
    return ersetzungen[k];
  });
}

/** Szene bauen. schreiben = false prüft nur. Liefert { id, befunde, bilder, ... }. */
export async function baueSzene(id, { schreiben = true } = {}) {
  const befunde = [];
  const befund = (art, text) => befunde.push({ art, text });
  let sz;
  try {
    sz = await ladeSzene(id);
  } catch (e) {
    return { id, befunde: [{ art: 'laden', text: e.message }], bilder: 0, reichweite: 0, nochNicht: NOCH_NICHT };
  }
  pruefeBrief(sz, befund);
  const ton = geraeuscheFuer(sz, befund);
  let markup = '';
  let ergebnis = { bilder: 0, reichweite: 0 };
  try {
    markup = sz.scene.sceneMarkup();
    pruefeMarkup(markup, sz, befund);
    ergebnis = pruefeBilder(markup, sz, befund);
  } catch (e) {
    befund('markup', e.message);
  }
  const pruefung = { id, bilder: ergebnis.bilder, befunde, nochNicht: NOCH_NICHT };
  if (schreiben && markup) {
    const dist = join(sz.ordner, 'dist');
    mkdirSync(dist, { recursive: true });
    try {
      const start = wendeAn(markup, sz.scene.sceneApply(sz.animation.computeState(0)));
      writeFileSync(join(dist, 'szene-rig.svg'), start);
      writeFileSync(join(dist, 'index.html'), viewerSeite(sz, markup, ton));
    } catch (e) {
      befund('bundle', e.message);
    }
    writeFileSync(join(dist, 'pruefung.json'), JSON.stringify(pruefung, null, 2) + '\n');
  }
  return { ...pruefung, reichweite: ergebnis.reichweite, sz };
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Aufruf: node lib/build.js <ID|alle>');
    process.exit(2);
  }
  const ids = arg === 'alle' ? alleSzenen() : [arg];
  if (ids.length === 0) {
    console.error('FEHLER: keine Szene gefunden (szenen/<ID>/brief.yaml)');
    process.exit(1);
  }
  let fehler = 0;
  for (const id of ids) {
    const r = await baueSzene(id);
    for (const b of r.befunde) console.error(`FEHLER ${id} [${b.art}] ${b.text}`);
    console.log(`${id}: ${r.bilder} Bilder geprüft, ${r.befunde.length} Befunde${r.befunde.length ? '' : ` → szenen/${id}/dist/index.html`}`);
    fehler += r.befunde.length;
  }
  for (const n of NOCH_NICHT) console.log(`nicht maschinell geprüft: ${n}`);
  if (fehler) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
