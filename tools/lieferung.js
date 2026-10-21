// Messung einer Lieferdatei (Abschnitt 10.3): Spuren, Dauer, Bilder, Lautheit, True Peak, Farbe, sha256.
// Ergebnis je Datei als Zeile in out/lieferung.tsv; eine Zeile derselben Datei wird ersetzt.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const WURZEL = join(import.meta.dirname, '..');
export const PROTOKOLL = join(WURZEL, 'out', 'lieferung.tsv');
export const VORGABE = { lufs: -16, lufs_toleranz: 1, true_peak_max: -1, farbe_max: 3, breite: 1920, hoehe: 1080, fps: 30 };
const SPALTEN = ['datei', 'dauer_s', 'bilder', 'lufs_i', 'true_peak_dbtp', 'farbe_max', 'sha256', 'befund'];

function lauf(befehl, args, opts = {}) {
  const r = spawnSync(befehl, args, { maxBuffer: 1 << 30, ...opts });
  if (r.status !== 0) throw new Error(`${befehl} ${args.slice(0, 4).join(' ')} …: ${String(r.stderr).slice(-400)}`);
  return r;
}

/** Spuren und Kenngrößen über ffprobe. */
export function spuren(datei) {
  const r = lauf('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', datei], { encoding: 'utf8' });
  const j = JSON.parse(r.stdout);
  return { streams: j.streams, dauer: Number(j.format.duration) };
}

/** Integrierte Lautheit und True Peak des Tons über ffmpeg ebur128. */
export function lautheit(datei) {
  const r = spawnSync('ffmpeg', ['-nostats', '-hide_banner', '-i', datei, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const summe = r.stderr.split('Summary:')[1] ?? '';
  const i = /I:\s*(-?[\d.]+|-inf) LUFS/.exec(summe)?.[1];
  const tp = /Peak:\s*(-?[\d.]+|-inf) dBFS/.exec(summe)?.[1];
  if (!i || !tp) throw new Error(`Lautheit von ${datei} nicht messbar`);
  return { lufs: Number(i), truePeak: Number(tp) };
}

/** Rohes RGB eines Bilds aus einer Datei (PNG oder Video), für Videos das Bild Nummer n mit BT.709-Matrix. */
export function rgb(datei, n = null) {
  const filter = n === null ? 'format=rgb24' : `select=eq(n\\,${n}),scale=in_color_matrix=bt709:in_range=tv,format=rgb24`;
  const args = ['-v', 'error', '-i', datei, '-vf', filter, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'];
  if (n !== null) args.splice(args.indexOf('-frames:v'), 0, '-vsync', '0');
  return lauf('ffmpeg', args).stdout;
}

/**
 * Farbe: Flächen, die im Referenzbild 15 × 15 Pixel gleichfarbig sind, je Farbe gesammelt; je Fläche das Mittel über
 * 3 × 3 im Video gegen die Referenz. Die Verschiebung einer Farbe ist das Mittel dieser Abweichungen je Kanal, so
 * zählt ein Farbfehler und nicht das Rauschen der Kompression. Liefert die größte Verschiebung, die Zahl der Flächen
 * und die Farbe, an der sie liegt.
 */
export function farbabweichung(ref, vid, breite = VORGABE.breite, hoehe = VORGABE.hoehe) {
  if (ref.length !== breite * hoehe * 3 || vid.length !== ref.length) throw new Error(`Farbe: Bildgrößen ${ref.length} und ${vid.length} passen nicht zu ${breite} × ${hoehe}`);
  const R = 7;
  const px = (b, x, y, k) => b[(y * breite + x) * 3 + k];
  const jeFarbe = new Map();
  let flaechen = 0;
  for (let y = R + 1; y < hoehe - R - 1; y += 8) {
    for (let x = R + 1; x < breite - R - 1; x += 8) {
      let flach = true;
      for (let dy = -R; dy <= R && flach; dy++) for (let dx = -R; dx <= R && flach; dx++) for (let k = 0; k < 3; k++) if (px(ref, x + dx, y + dy, k) !== px(ref, x, y, k)) flach = false;
      if (!flach) continue;
      flaechen++;
      const farbe = [0, 1, 2].map((k) => px(ref, x, y, k)).join(',');
      const e = jeFarbe.get(farbe) ?? { n: 0, summe: [0, 0, 0] };
      e.n++;
      for (let k = 0; k < 3; k++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += px(vid, x + dx, y + dy, k);
        e.summe[k] += s / 9 - px(ref, x, y, k);
      }
      jeFarbe.set(farbe, e);
    }
  }
  let max = 0;
  let an = '';
  for (const [farbe, e] of jeFarbe) {
    for (const s of e.summe) {
      if (Math.abs(s / e.n) > max) {
        max = Math.abs(s / e.n);
        an = farbe;
      }
    }
  }
  return { max: Number(max.toFixed(2)), flaechen, farben: jeFarbe.size, an };
}

/**
 * Lieferdatei prüfen: genau eine Video- und eine Tonspur (Untertitel dürfen dazukommen), H.264 yuv420p BT.709,
 * 1920 × 1080, 30 fps, AAC 48 kHz, −16 LUFS ± 1, True Peak ≤ −1 dBTP; farbe: { max } aus farbabweichung.
 */
export function pruefeLieferung(datei, farbe = null) {
  const { streams, dauer } = spuren(datei);
  const v = streams.filter((s) => s.codec_type === 'video');
  const a = streams.filter((s) => s.codec_type === 'audio');
  const befunde = [];
  if (v.length !== 1 || a.length !== 1) befunde.push(`${v.length} Video- und ${a.length} Tonspuren statt je einer`);
  const vs = v[0] ?? {};
  const as = a[0] ?? {};
  if (vs.codec_name !== 'h264' || vs.pix_fmt !== 'yuv420p') befunde.push(`Video ${vs.codec_name} ${vs.pix_fmt} statt h264 yuv420p`);
  for (const f of ['color_primaries', 'color_transfer', 'color_space']) if (vs[f] !== 'bt709') befunde.push(`${f} ${vs[f] ?? 'fehlt'} statt bt709`);
  if (vs.width !== VORGABE.breite || vs.height !== VORGABE.hoehe) befunde.push(`${vs.width} × ${vs.height} statt ${VORGABE.breite} × ${VORGABE.hoehe}`);
  if (vs.r_frame_rate !== `${VORGABE.fps}/1`) befunde.push(`Bildrate ${vs.r_frame_rate} statt ${VORGABE.fps}/1`);
  if (as.codec_name !== 'aac' || as.sample_rate !== '48000') befunde.push(`Ton ${as.codec_name} ${as.sample_rate} Hz statt aac 48000 Hz`);
  const { lufs, truePeak } = lautheit(datei);
  if (Math.abs(lufs - VORGABE.lufs) > VORGABE.lufs_toleranz) befunde.push(`${lufs} LUFS statt ${VORGABE.lufs} ± ${VORGABE.lufs_toleranz}`);
  if (truePeak > VORGABE.true_peak_max) befunde.push(`True Peak ${truePeak} dBTP über ${VORGABE.true_peak_max}`);
  if (farbe && farbe.max > VORGABE.farbe_max) befunde.push(`Farbe weicht bis ${farbe.max} Stufen ab (höchstens ${VORGABE.farbe_max})`);
  if (farbe && farbe.flaechen === 0) befunde.push('Farbe nicht messbar: keine gleichfarbige Fläche im Referenzbild');
  const zeile = {
    datei: relative(WURZEL, datei),
    dauer_s: dauer.toFixed(3),
    bilder: vs.nb_frames ?? '',
    lufs_i: lufs.toFixed(1),
    true_peak_dbtp: truePeak.toFixed(1),
    farbe_max: farbe ? String(farbe.max) : '',
    sha256: createHash('sha256').update(readFileSync(datei)).digest('hex'),
    befund: befunde.join('; '),
  };
  schreibeZeile(zeile);
  return { zeile, befunde };
}

function schreibeZeile(zeile) {
  const kopf = `# ERZEUGT von tools/lieferung.js; je Datei eine Zeile\n${SPALTEN.join('\t')}\n`;
  const alt = existsSync(PROTOKOLL) ? readFileSync(PROTOKOLL, 'utf8').split('\n').slice(2).filter((z) => z && !z.startsWith(`${zeile.datei}\t`)) : [];
  writeFileSync(PROTOKOLL, kopf + [...alt, SPALTEN.map((s) => zeile[s]).join('\t')].sort().join('\n') + '\n');
}
