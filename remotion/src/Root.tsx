// Registriert je Szene eine Komposition und je Film einen Master, dazu die Testkarte.
// Der Master setzt die Szenen über <Series> ohne Übergänge aneinander; jede Szene regelt Ein- und Ausblenden selbst.
import React from 'react';
import { Composition, Series } from 'remotion';
import { BUEHNE } from '../../tokens/tokens.js';
import { Palette } from './Palette';
import { Szene } from './Szene';
import { FILME, SZENEN, type SzeneImPort } from './szenen';

const bilder = (sz: SzeneImPort) => Math.round(sz.zeitfunktion.SPEC.duration * sz.zeitfunktion.SPEC.fps);
export const masterId = (film: string) => `Film-${film}`;

const Master: React.FC<{ szenen: string[] }> = ({ szenen }) => (
  <Series>
    {szenen.map((id) => {
      const sz = SZENEN.find((s) => s.id === id)!;
      return (
        <Series.Sequence key={id} durationInFrames={bilder(sz)} name={id}>
          <Szene id={id} />
        </Series.Sequence>
      );
    })}
  </Series>
);

export const Root: React.FC = () => {
  return (
    <>
      <Composition id="Palette" component={Palette} durationInFrames={2 * BUEHNE.fps} fps={BUEHNE.fps} width={BUEHNE.breite} height={BUEHNE.hoehe} />
      {SZENEN.map((sz) => (
        <Composition key={sz.id} id={sz.id} component={Szene} defaultProps={{ id: sz.id }} durationInFrames={bilder(sz)} fps={sz.zeitfunktion.SPEC.fps} width={sz.zeitfunktion.SPEC.width} height={sz.zeitfunktion.SPEC.height} />
      ))}
      {FILME.map((f) => (
        <Composition
          key={f.film}
          id={masterId(f.film)}
          component={Master}
          defaultProps={{ szenen: f.szenen }}
          durationInFrames={f.szenen.reduce((n, id) => n + bilder(SZENEN.find((s) => s.id === id)!), 0)}
          fps={BUEHNE.fps}
          width={BUEHNE.breite}
          height={BUEHNE.hoehe}
        />
      ))}
    </>
  );
};
