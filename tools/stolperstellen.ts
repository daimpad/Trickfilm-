// Stolperstellen (Abschnitt 9.1): Ersetzungen nur im gesprochenen Text, nie im Bildschirmtext oder Untertitel.
// Abkürzungen ausgeschrieben, Daten als Datum, Fremdwörter lautnah. Daraus entsteht auch ein Aussprachewörterbuch (PLS).
export type Stolperstelle = { schreibweise: string; sprechweise: string };

export const STOLPERSTELLEN: Stolperstelle[] = [
  { schreibweise: 'z. B.', sprechweise: 'zum Beispiel' },
  { schreibweise: 'd. h.', sprechweise: 'das heißt' },
  { schreibweise: 'usw.', sprechweise: 'und so weiter' },
];

const maske = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Gesprochener Text: jede Stolperstelle durch ihre Sprechweise ersetzt. */
export function sprechtext(text: string, liste: Stolperstelle[] = STOLPERSTELLEN): string {
  return liste.reduce((t, s) => t.replace(new RegExp(`(?<![\\p{L}])${maske(s.schreibweise)}(?![\\p{L}])`, 'gu'), s.sprechweise), text);
}

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Aussprachewörterbuch im Format PLS 1.0 (W3C) mit Aliasen. */
export function pls(liste: Stolperstelle[] = STOLPERSTELLEN): string {
  const eintraege = liste.map((s) => `  <lexeme><grapheme>${xml(s.schreibweise)}</grapheme><alias>${xml(s.sprechweise)}</alias></lexeme>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<lexicon version="1.0" xmlns="http://www.w3.org/2005/01/pronunciation-lexicon" alphabet="ipa" xml:lang="de-DE">\n${eintraege}\n</lexicon>\n`;
}
