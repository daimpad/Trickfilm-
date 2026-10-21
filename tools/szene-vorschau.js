// Vorschau-Video einer Szene: jedes Bild aus computeState gerendert, als MP4 nach out/vorschau/<ID>.mp4.
// Ton: gibt es die Mischung des Films (npm run mischen), ihr Ausschnitt für diese Szene mit Stimme, und die Untertitel
// als abschaltbare Spur; sonst nur die Geräusche nach sfx-cues.json. Das fertige Video baut Phase 7 (npm run video).
// Aufruf: node tools/szene-vorschau.js <ID>
// Mischung wie im Prototyp: der lauteste Cue bei 0 dB, die übrigen nach gain_db relativ dazu.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { alleSzenen, ladeSzene } from '../lib/build.js';
import { standbild } from '../lib/snapshot.js';
import { starteBrowser } from '../lib/browser.js';
import { finalPfad, SFX } from '../lib/sfx/ablage.js';

const WURZEL = join(import.meta.dirname, '..');

/** ffmpeg-Argumente für die Tonspur: je Cue eine Eingabe, verzögert, im Pegel gesetzt, summiert. */
export function tonArgumente(cues, dauer, ordner = SFX) {
  const fehlend = cues.filter((c) => !existsSync(finalPfad(ordner, c.datei))).map((c) => c.datei);
  if (fehlend.length) throw new Error(`Vorschau: Geräuschdateien fehlen: ${[...new Set(fehlend)].join(', ')} (npm run sfx:normalisieren)`);
  if (!cues.length) return { eingaben: [], filter: null };
  const lauteste = Math.max(...cues.map((c) => c.gain_db));
  const eingaben = cues.flatMap((c) => ['-i', finalPfad(ordner, c.datei)]);
  const spuren = cues.map((c, i) => {
    const ms = Math.round(c.t * 1000);
    return `[${i + 1}:a]adelay=${ms}|${ms},volume=${(c.gain_db - lauteste).toFixed(1)}dB[s${i}]`;
  });
  const summe = `${cues.map((_, i) => `[s${i}]`).join('')}amix=inputs=${cues.length}:normalize=0,apad,atrim=0:${dauer}[ton]`;
  return { eingaben, filter: [...spuren, summe].join(';') };
}

/** Beginn der Szene in ihrem Film: Summe der Dauern aller früheren Szenen desselben Films. */
async function beginnImFilm(sz) {
  const film = String(sz.brief.film ?? '');
  let t = 0;
  for (const andere of alleSzenen()) {
    if (andere === sz.id) return t;
    const s = await ladeSzene(andere);
    if (String(s.brief.film ?? '') === film) t += s.animation.SPEC.duration;
  }
  return t;
}

/** Untertitel des Films auf die Szene verschoben: nur Einheiten, die in die Szene fallen. */
function untertitelFuerSzene(vtt, beginn, dauer) {
  const sek = (z) => z.split(':').reduce((s, v) => s * 60 + Number(v), 0);
  const zeit = (s) => new Date(Math.max(0, s) * 1000).toISOString().slice(11, 23);
  const bloecke = vtt.split(/\n\n+/).filter((b) => b.includes('-->'));
  const aus = bloecke
    .map((b) => {
      const zeilen = b.split('\n');
      const i = zeilen.findIndex((z) => z.includes('-->'));
      const [a, e] = zeilen[i].split('-->').map((x) => sek(x.trim()));
      return { a: a - beginn, e: e - beginn, text: zeilen.slice(i + 1).join('\n') };
    })
    .filter((u) => u.e > 0 && u.a < dauer);
  return `WEBVTT\n\n${aus.map((u, k) => `${k + 1}\n${zeit(u.a)} --> ${zeit(Math.min(u.e, dauer))}\n${u.text}\n`).join('\n')}`;
}

export async function vorschau(id) {
  const sz = await ladeSzene(id);
  const { fps, duration } = sz.animation.SPEC;
  const film = String(sz.brief.film ?? '').toLowerCase();
  const mischung = join(WURZEL, 'out', 'ton', `${film}-mischung.wav`);
  const vttPfad = join(WURZEL, 'ton', film, 'untertitel.vtt');
  const mitMischung = film && existsSync(mischung);
  const cuePfad = join(sz.ordner, 'sfx-cues.json');
  const cues = existsSync(cuePfad) ? JSON.parse(readFileSync(cuePfad, 'utf8')).cues : [];
  if (!existsSync(cuePfad)) console.log(`${id}: keine sfx-cues.json, Vorschau ohne Geräusche (npm run sfx:cues -- ${id})`);
  const ton = mitMischung ? null : tonArgumente(cues, duration);

  const ziel = join(WURZEL, 'out/vorschau', `${id}.mp4`);
  mkdirSync(join(WURZEL, 'out/vorschau'), { recursive: true });
  let tonArgs;
  if (mitMischung) {
    const beginn = await beginnImFilm(sz);
    tonArgs = ['-ss', String(beginn), '-t', String(duration), '-i', mischung];
    if (existsSync(vttPfad)) {
      const szeneVtt = join(WURZEL, 'out/vorschau', `${id}.vtt`);
      writeFileSync(szeneVtt, untertitelFuerSzene(readFileSync(vttPfad, 'utf8'), beginn, duration));
      tonArgs.push('-i', szeneVtt, '-map', '0:v', '-map', '1:a', '-map', '2:s', '-c:s', 'mov_text', '-metadata:s:s:0', 'language=deu');
    } else tonArgs.push('-map', '0:v', '-map', '1:a');
    tonArgs.push('-c:a', 'aac', '-b:a', '192k');
  } else {
    tonArgs = [...ton.eingaben, ...(ton.filter ? ['-filter_complex', ton.filter, '-map', '0:v', '-map', '[ton]', '-c:a', 'aac', '-b:a', '192k'] : ['-map', '0:v'])];
  }
  const args = [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    ...tonArgs,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-t', String(duration), ziel,
  ];
  const ffmpeg = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const fertig = new Promise((ok, fehler) => ffmpeg.on('close', (code) => (code === 0 ? ok() : fehler(new Error(`ffmpeg endete mit ${code}`)))));

  const browser = await starteBrowser();
  try {
    const seite = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const bilder = Math.round(duration * fps);
    for (let n = 0; n < bilder; n++) {
      await seite.setContent(`<body style="margin:0">${standbild(sz, n / fps)}</body>`);
      const png = await seite.screenshot({ type: 'png' });
      if (!ffmpeg.stdin.write(png)) await new Promise((ok) => ffmpeg.stdin.once('drain', ok));
    }
    ffmpeg.stdin.end();
    await fertig;
    return { ziel, bilder, cues: cues.length, mitMischung };
  } finally {
    await browser.close();
  }
}

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error('Aufruf: node tools/szene-vorschau.js <ID>');
    process.exit(2);
  }
  const r = await vorschau(id);
  console.log(`${id}: ${r.bilder} Bilder → ${r.ziel.replace(WURZEL + '/', '')} (${r.mitMischung ? 'Ton aus der Mischung des Films, Untertitel als Spur' : `${r.cues} Geräusche, ohne Stimme`})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
