// Prüft den Baum gegen Geheimnisse und gegen Verbotenes (Grundsätze 1, 9, 10; Abschnitt 13.3).
// Gelesen werden alle Dateien, die Git kennt oder nicht ignoriert. Jeder Befund nennt Datei,
// Zeile und Regel; ein Befund lässt den Lauf scheitern. Was noch nicht geprüft wird, sagt der Lauf.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

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
// Prüfung und ihr Test enthalten Verbotenes als Muster und Beispiel; für sie gelten nur die Geheimnisregeln.
const SELBST = new Set(['tools/pruefen-verboten.ts', 'test/verboten.test.ts']);

const imRender = (p: string) => RENDER.test(p) && !ERZEUGT.test(p);

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
  { name: 'CSS-Animation', muster: /@keyframes\b|\banimation(-name)?\s*:|\btransition\s*:/, gilt: (p) => CODE.test(p) },
  { name: 'SMIL', muster: /<(animate|animateTransform|animateMotion|set)\b/, gilt: (p) => CODE.test(p) },
  { name: 'Zufall ohne Seed', muster: /\bMath\.random\s*\(/, gilt: (p) => imRender(p) || p.startsWith('tokens/') },
  { name: 'Uhrzeit im Bild', muster: /\bDate\.now\s*\(|\bnew Date\s*\(/, gilt: (p) => imRender(p) || p.startsWith('tokens/') },
  { name: 'requestAnimationFrame als Zeitgeber', muster: /\brequestAnimationFrame\s*\(/, gilt: (p) => imRender(p) && SKRIPT.test(p) },
  {
    name: 'verbotene Bibliothek',
    muster: /(from\s+|require\(\s*|import\(\s*)['"](gsap|framer-motion|motion|d3-selection|lottie-web)(\/[^'"]*)?['"]/,
    gilt: (p) => SKRIPT.test(p),
  },

  // Gestaltung nur aus den Tokens.
  {
    name: 'Farbliteral außerhalb der Tokens',
    muster: /(?<![\w&/])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b|\b(rgba?|hsla?)\s*\(/,
    gilt: (p) => imRender(p) && CODE.test(p),
  },
  { name: 'Webfont', muster: /@font-face|fonts\.(googleapis|gstatic)\.com|\.woff2?\b/, gilt: (p) => CODE.test(p) },

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
export const NOCH_NICHT = ['Abstände außerhalb des Rasters (kommt mit den Szenengeometrien, Phase 2)'];

export function pruefeDatei(pfad: string, inhalt: string): Befund[] {
  const befunde: Befund[] = [];
  for (const { name, muster } of VERBOTENE_DATEIEN) {
    if (muster.test(pfad)) befunde.push({ datei: pfad, zeile: 0, regel: name, auszug: '' });
  }
  const regeln = REGELN.filter((r) => r.gilt(pfad) && (!SELBST.has(pfad) || r.name.startsWith('Geheimnis')));
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
