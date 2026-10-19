// Prüft den Baum gegen Geheimnisse und gegen Verbotenes (Grundsätze 1, 9, 10; Abschnitt 13.3).
// Gelesen werden alle Dateien, die Git kennt oder nicht ignoriert. Jeder Befund nennt Datei,
// Zeile und Regel; ein Befund lässt den Lauf scheitern. Was noch nicht geprüft wird, sagt der Lauf.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { RASTER } from '../tokens/tokens.js';

export interface Befund {
  datei: string;
  zeile: number;
  regel: string;
  auszug: string;
}

interface Regel {
  name: string;
  muster: RegExp;
  /** Gilt die Regel für diese Datei? */
  gilt: (pfad: string) => boolean;
}

const CODE = /\.(js|mjs|ts|tsx|html|svg|css)$/;
const SKRIPT = /\.(js|mjs|ts|tsx)$/;
// Bibliothek, Szenen und Remotion laufen im Render; dort gilt alles, was das Bild betrifft.
const RENDER = /^(lib|szenen|remotion)\//;
// Erzeugtes und Zeichnungen tragen aufgelöste Farben; sie werden über ihre Quelle geprüft.
const ERZEUGT = /(^|\/)dist\/|^lib\/teilesaetze\/|^figuren\//;
// Prüfung, ihr Test und der Build enthalten Verbotenes als Suchmuster; für sie gelten nur die Geheimnisregeln.
const SELBST = new Set(['tools/pruefen-verboten.ts', 'test/verboten.test.ts', 'lib/build.js']);

const imRender = (p: string) => RENDER.test(p) && !ERZEUGT.test(p);
// Tests nennen Verbotenes als Prüfmuster; sie werden nie gerendert.
const keinTest = (p: string) => !p.startsWith('test/');

export const REGELN: Regel[] = [
  // Geheimnisse: überall.
  { name: 'Geheimnis: privater Schlüssel', muster: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, gilt: () => true },
  { name: 'Geheimnis: ElevenLabs-Schlüssel', muster: /\bsk_[0-9a-f]{40,}\b/, gilt: () => true },
  { name: 'Geheimnis: GitHub-Token', muster: /\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/, gilt: () => true },
  { name: 'Geheimnis: AWS-Schlüssel', muster: /\bAKIA[0-9A-Z]{16}\b/, gilt: () => true },
  {
    name: 'Geheimnis: Schlüssel als Wert',
    muster: /\b(api[_-]?key|xi-api-key|token|secret|passwor[dt])\b\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i,
    gilt: () => true,
  },

  // Bewegung nur als Zeitfunktion.
  { name: 'CSS-Animation', muster: /@keyframes\b|\banimation(-name)?\s*:|\btransition\s*:/, gilt: (p) => CODE.test(p) && keinTest(p) },
  { name: 'SMIL', muster: /<(animate|animateTransform|animateMotion|set)\b/, gilt: (p) => CODE.test(p) && keinTest(p) },
  { name: 'Zufall ohne Seed', muster: /\bMath\.random\s*\(/, gilt: (p) => imRender(p) || p.startsWith('tokens/') },
  { name: 'Uhrzeit im Bild', muster: /\bDate\.now\s*\(|\bnew Date\s*\(/, gilt: (p) => imRender(p) || p.startsWith('tokens/') },
  { name: 'requestAnimationFrame als Zeitgeber', muster: /\brequestAnimationFrame\s*\(/, gilt: (p) => imRender(p) && SKRIPT.test(p) },
  {
    name: 'verbotene Bibliothek',
    muster: /(from\s+|require\(\s*|import\(\s*)['"](gsap|framer-motion|motion|d3-selection|lottie-web)(\/[^'"]*)?['"]/,
    gilt: (p) => SKRIPT.test(p) && keinTest(p),
  },

  // Gestaltung nur aus den Tokens.
  {
    name: 'Farbliteral außerhalb der Tokens',
    muster: /(?<![\w&/])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b|\b(rgba?|hsla?)\s*\(/,
    gilt: (p) => imRender(p) && CODE.test(p),
  },
  { name: 'Webfont', muster: /@font-face|fonts\.(googleapis|gstatic)\.com|\.woff2?\b/, gilt: (p) => CODE.test(p) && keinTest(p) },

  // Kein Netz im Render; der SVG-Namensraum ist eine Kennung, kein Abruf.
  {
    name: 'Netzaufruf im Render',
    muster: /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|['"`]https?:\/\/(?!www\.w3\.org\/)/,
    gilt: (p) => imRender(p) && CODE.test(p),
  },
];

/** Dateinamen, die nie im Baum liegen dürfen. */
const VERBOTENE_DATEIEN: { name: string; muster: RegExp }[] = [
  { name: 'Geheimnis: .env-Datei', muster: /(^|\/)\.env(\.[^/]*)?$/ },
  { name: 'Geheimnis: Schlüsseldatei', muster: /\.(pem|key|p12|pfx)$/ },
];

/** Prüfungen aus Abschnitt 13.3, die erst mit einer späteren Phase greifen. */
export const NOCH_NICHT: string[] = [];

// Abstände heißen abstand…, rand…, luecke… oder einzug…; ihr Zahlwert muss auf dem 8-px-Raster liegen.
const ABSTAND = /\b(abstand|rand|luecke|einzug)\w*\s*:\s*(-?\d+(?:\.\d+)?)\b/gi;
const RASTER_WERTE = new Set([0, ...RASTER]);

function pruefeRaster(pfad: string, inhalt: string): Befund[] {
  if (!(RENDER.test(pfad) && !ERZEUGT.test(pfad) && SKRIPT.test(pfad))) return [];
  const befunde: Befund[] = [];
  inhalt.split('\n').forEach((text, i) => {
    for (const m of text.matchAll(ABSTAND)) {
      if (!RASTER_WERTE.has(Math.abs(Number(m[2])))) {
        befunde.push({ datei: pfad, zeile: i + 1, regel: `Abstand außerhalb des Rasters (${RASTER.join(', ')})`, auszug: text.trim().slice(0, 120) });
      }
    }
  });
  return befunde;
}

// Erzeugte Dateien tragen „ERZEUGT von“ im Kopf; ihre Farben stammen aus geprüften Quellen.
const istErzeugt = (inhalt: string) => /^\/\/ ERZEUGT von /.test(inhalt) || /^# ERZEUGT von /.test(inhalt);

export function pruefeDatei(pfad: string, inhalt: string): Befund[] {
  const befunde: Befund[] = [];
  for (const { name, muster } of VERBOTENE_DATEIEN) {
    if (muster.test(pfad)) befunde.push({ datei: pfad, zeile: 0, regel: name, auszug: '' });
  }
  const erzeugt = istErzeugt(inhalt);
  const regeln = REGELN.filter(
    (r) =>
      r.gilt(pfad) &&
      (!SELBST.has(pfad) || r.name.startsWith('Geheimnis')) &&
      !(erzeugt && r.name === 'Farbliteral außerhalb der Tokens'),
  );
  befunde.push(...pruefeRaster(pfad, inhalt));
  if (regeln.length === 0) return befunde;
  inhalt.split('\n').forEach((text, i) => {
    for (const r of regeln) {
      const m = r.muster.exec(text);
      if (m) befunde.push({ datei: pfad, zeile: i + 1, regel: r.name, auszug: text.trim().slice(0, 120) });
    }
  });
  return befunde;
}

function dateienImBaum(): string[] {
  const aus = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return aus.split('\0').filter(Boolean);
}

const BINAER = /\.(png|jpe?g|gif|webp|ogg|opus|wav|mp3|mp4|zip|pdf|ttf|otf)$/i;

function main(): void {
  const dateien = dateienImBaum();
  const befunde: Befund[] = [];
  for (const pfad of dateien) {
    let inhalt = '';
    if (!BINAER.test(pfad)) {
      try {
        inhalt = readFileSync(pfad, 'utf8');
      } catch {
        continue; // gelöscht, aber noch nicht aus dem Index genommen
      }
    }
    befunde.push(...pruefeDatei(pfad, inhalt));
  }
  for (const b of befunde) console.error(`FEHLER ${b.datei}:${b.zeile}  ${b.regel}  ${b.auszug}`);
  for (const n of NOCH_NICHT) console.log(`noch nicht geprüft: ${n}`);
  console.log(`${dateien.length} Dateien geprüft, ${REGELN.length + VERBOTENE_DATEIEN.length} Regeln, ${befunde.length} Befunde.`);
  if (befunde.length > 0) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
