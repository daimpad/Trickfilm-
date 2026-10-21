// Wortliste für Seiten an Dritte (Abschnitt 10.4): interne Namen, Abstimmungsstände, Kundendaten.
// Die Liste selbst ist nicht öffentlich und liegt in nichtoeffentlich.local.txt (nie im Repository, je Zeile ein
// Wort oder Ausdruck, # beginnt einen Kommentar). Ohne Liste prüft der Lauf nur Muster und sagt, dass die Liste fehlt.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const WURZEL = join(import.meta.dirname, '..');
export const LISTE = join(WURZEL, 'nichtoeffentlich.local.txt');

// Muster, die ohne Liste anschlagen: E-Mail-Adressen, Telefonnummern, Vermerke zum Abstimmungsstand.
const MUSTER: [string, RegExp][] = [
  ['E-Mail-Adresse', /[\w.+-]+@[\w-]+\.[\w.-]+/],
  ['Telefonnummer', /\+?\d[\d /-]{8,}\d/],
  ['Abstimmungsvermerk', /\b(entwurf|intern|vertraulich|nicht freigegeben|zur abstimmung)\b/i],
];

export function woerter(): string[] | null {
  if (!existsSync(LISTE)) return null;
  return readFileSync(LISTE, 'utf8')
    .split('\n')
    .map((z) => z.replace(/#.*/, '').trim())
    .filter(Boolean);
}

/** Text gegen Liste und Muster prüfen; liefert die Treffer (ohne den Treffer selbst zu wiederholen) und ob es eine Liste gab. */
export function pruefeText(text: string): { treffer: string[]; mitListe: boolean } {
  const liste = woerter();
  const sichtbar = text.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
  const treffer: string[] = [];
  for (const [name, re] of MUSTER) if (re.test(sichtbar)) treffer.push(name);
  for (const [i, w] of (liste ?? []).entries()) if (sichtbar.toLowerCase().includes(w.toLowerCase())) treffer.push(`Eintrag ${i + 1} der Wortliste`);
  return { treffer, mitListe: liste !== null };
}
