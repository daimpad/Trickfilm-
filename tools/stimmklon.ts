// Einstellungen der Erzählstimme je Film (Abschnitt 9.1): Stimme, Modell, Stabilität, Ähnlichkeit, Tempo.
// Die Stimme wählt die Regie; solange sie fehlt, erzeugt `npm run stimme` nur Platzhalter (--stub).
export type Stimme = { name: string; voice_id: string };
export type Einstellungen = {
  stimme: Stimme | null;
  modell: string;
  stabilitaet: number;
  aehnlichkeit: number;
  tempo: number; // 0,8 bis 1,2; darunter klingt eine Klonstimme gedehnt
};

export const TEMPO_GRENZEN = [0.8, 1.2] as const;

export const STIMMEN: Record<string, Einstellungen> = {
  demo: {
    stimme: { name: 'Damian', voice_id: 'fCNfpvOaXD7yZQS7MduU' }, // entschieden von Regie, 2026-10-21
    modell: 'eleven_multilingual_v2', // bewährt für deutschen Sprechtext
    stabilitaet: 0.5,
    aehnlichkeit: 0.75,
    tempo: 1.0,
  },
  // Zweite Fassung der Demo mit Mimik: dieselbe Stimme und dieselbe Aufnahme (Take 2).
  mimik: {
    stimme: { name: 'Damian', voice_id: 'fCNfpvOaXD7yZQS7MduU' },
    modell: 'eleven_multilingual_v2',
    stabilitaet: 0.5,
    aehnlichkeit: 0.75,
    tempo: 1.0,
  },
};

export function einstellungenVon(film: string): Einstellungen {
  const e = STIMMEN[film];
  if (!e) throw new Error(`Stimme: keine Einstellungen für Film „${film}“ in tools/stimmklon.ts`);
  if (e.tempo < TEMPO_GRENZEN[0] || e.tempo > TEMPO_GRENZEN[1]) throw new Error(`Stimme: Tempo ${e.tempo} außerhalb ${TEMPO_GRENZEN.join('–')}`);
  return e;
}
