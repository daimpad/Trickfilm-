// Ein Film für die Tonwerkzeuge: Szenen in Reihenfolge, Absätze aus dem Register, Messung je Absatz.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { alleSzenen, ladeSzene } from '../lib/build.js';
import { szenenFolge } from '../lib/ton/zeitleiste.js';
import { messungPfad, register, type Absatz } from './stimme.js';

export type Messung = { szene: string; roh_s: number; start_s: number; ende_s: number; laenge_s: number; lufs_i: number; true_peak_dbtp: number };
export type SzeneImFilm = { id: string; start: number; dauer: number; fps: number; ordner: string; quelltext: string };
// einsatz: Beginn des Absatzes in seiner Szene (sprechtext.einsatz_s im Brief, sonst 0); beginn: derselbe Zeitpunkt im Film.
export type AbsatzImFilm = Absatz & { messung: Messung | null; szeneImFilm: SzeneImFilm; einsatz: number; beginn: number };

export async function ladeFilm(film: string): Promise<{ szenen: SzeneImFilm[]; absaetze: AbsatzImFilm[] }> {
  const geladen: { id: string; dauer: number; fps: number; ordner: string; einsatz: number }[] = [];
  for (const id of alleSzenen()) {
    const sz = await ladeSzene(id);
    if (String(sz.brief.film ?? '').toLowerCase() !== film.toLowerCase()) continue;
    geladen.push({ id, dauer: sz.animation.SPEC.duration as number, fps: sz.animation.SPEC.fps as number, ordner: sz.ordner as string, einsatz: Number(sz.brief.sprechtext?.einsatz_s ?? 0) });
  }
  if (!geladen.length) throw new Error(`Film „${film}“: keine Szene mit film: ${film.toUpperCase()} im Brief`);
  const folge = szenenFolge(geladen);
  const szenen: SzeneImFilm[] = folge.map((f: { id: string; start: number; dauer: number; fps: number }, i: number) => ({
    ...f,
    ordner: geladen[i]!.ordner,
    quelltext: readFileSync(join(geladen[i]!.ordner, 'animation.js'), 'utf8'),
  }));
  const pfad = messungPfad(film);
  const messung = existsSync(pfad) ? (JSON.parse(readFileSync(pfad, 'utf8')).absaetze ?? {}) : {};
  const absaetze = (await register(film)).map((a) => {
    const szeneImFilm = szenen.find((s) => s.id === a.szene);
    if (!szeneImFilm) throw new Error(`Film „${film}“: ${a.id} gehört zu ${a.szene}, die Szene fehlt`);
    const einsatz = geladen.find((g) => g.id === a.szene)!.einsatz;
    return { ...a, messung: (messung[a.id] as Messung | undefined) ?? null, szeneImFilm, einsatz, beginn: szeneImFilm.start + einsatz };
  });
  return { szenen, absaetze };
}

/** Hält an, wenn ein Absatz noch nicht gemessen ist; ein Lauf, der etwas nicht weiß, sagt es. */
export function mitMessung(absaetze: AbsatzImFilm[], film: string): (AbsatzImFilm & { messung: Messung })[] {
  const ohne = absaetze.filter((a) => !a.messung).map((a) => a.id);
  if (ohne.length) throw new Error(`Film „${film}“: ohne Messung: ${ohne.join(', ')} (npm run stimme -- ${film} messen)`);
  return absaetze as (AbsatzImFilm & { messung: Messung })[];
}
