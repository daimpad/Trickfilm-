// Sprechtext: Absätze aus dem Dokument lesen, Prüfsumme, geplante Länge (Abschnitt 9.1). DOM-frei.
import { createHash } from 'node:crypto';

export const ZEICHEN_JE_S = 15;

/** Absätze aus docs/sprechtext/<film>.md: Überschrift „## <id> · <szene>“, darunter der Text bis zur nächsten. */
export function absaetzeAusDokument(md) {
  const teile = md.split(/^## /m).slice(1);
  return teile.map((teil) => {
    const [kopf, ...rest] = teil.split('\n');
    const [id, szene] = kopf.split('·').map((s) => s.trim());
    return { id, szene, text: rest.join('\n').trim().replace(/\s+/g, ' ') };
  });
}

/** Geplante Sprechdauer in Sekunden: 15 Zeichen je Sekunde, geteilt durch das Tempo des Films. */
export const geplanteDauer = (text, tempo = 1) => text.length / ZEICHEN_JE_S / tempo;

/** Prüfsumme über alles, was den Klang bestimmt: gesprochener Text und Einstellungen. */
export function pruefsumme(sprechtext, einstellungen) {
  return createHash('sha256').update(JSON.stringify({ sprechtext, einstellungen })).digest('hex').slice(0, 16);
}
