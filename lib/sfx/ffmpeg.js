// ffmpeg und ffprobe für Geräusche: dekodieren, schreiben, gegenmessen. Nur in Node.
// Heruntergeladene Audiodateien sind fremde Daten; sie werden nur von ffmpeg dekodiert.
import { execFileSync, spawnSync } from 'node:child_process';
import { RATE } from './lautheit.js';

const BITGENAU = ['-fflags', '+bitexact', '-flags:a', '+bitexact', '-map_metadata', '-1'];

/** Beliebige Audiodatei → Float32Array mono 48 kHz. */
export function dekodiere(pfad) {
  const roh = execFileSync('ffmpeg', ['-v', 'error', '-i', pfad, '-ac', '1', '-ar', String(RATE), '-f', 'f32le', '-acodec', 'pcm_f32le', '-'], {
    maxBuffer: 1 << 28,
  });
  return new Float32Array(roh.buffer.slice(roh.byteOffset, roh.byteOffset + roh.byteLength));
}

function schreibe(x, ziel, codec) {
  const daten = Buffer.from(Float32Array.from(x).buffer);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', '-', ...codec, ...BITGENAU, ziel], { input: daten });
}

/** WAV mono 48 kHz 24 bit. */
export const schreibeWav = (x, ziel) => schreibe(x, ziel, ['-c:a', 'pcm_s24le']);

/** OGG/Opus 48 kbit/s für den Browser. */
export const schreibeOgg = (x, ziel) => schreibe(x, ziel, ['-c:a', 'libopus', '-b:a', '48k']);

/**
 * Gegenmessung mit ffmpeg ebur128 (peak=true): größte Momentanlautheit und True Peak.
 * Am Ende wird wie in lautheit.js um 0,5 s Stille verlängert; ffmpeg schreibt die Messung nach stderr.
 */
export function messeMitFfmpeg(pfad) {
  const r = spawnSync('ffmpeg', ['-nostats', '-hide_banner', '-i', pfad, '-af', 'apad=pad_dur=0.5,ebur128=peak=true:framelog=info', '-f', 'null', '-'], {
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  });
  if (r.status !== 0) throw new Error(`ffmpeg ebur128: ${r.stderr.split('\n').slice(-3).join(' ')}`);
  return ebur128Text(r.stderr);
}

/** Momentanwerte und True Peak aus der Ausgabe von ebur128. */
export function ebur128Text(text) {
  const m = [...text.matchAll(/\bM:\s*(-?[\d.]+|-inf)/g)].map((x) => (x[1] === '-inf' ? -Infinity : Number(x[1])));
  const tp = /True peak:\s*\n\s*Peak:\s*(-?[\d.]+|-inf)/.exec(text);
  if (!m.length || !tp) throw new Error('ffmpeg ebur128: Ausgabe nicht lesbar');
  return { momentan: Math.max(...m), truePeak: tp[1] === '-inf' ? -Infinity : Number(tp[1]) };
}

/** Dauer einer Datei in Sekunden über ffprobe. */
export function dauerVon(pfad) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', pfad], { encoding: 'utf8' }).trim());
}
