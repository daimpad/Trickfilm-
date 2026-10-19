// Registriert je Szene eine Komposition und je Film einen Master.
// Bis zum Remotion-Port der Demoszene (Phase 7) steht hier nur die Testkarte.
import React from 'react';
import { Composition } from 'remotion';
import { BUEHNE } from '../../tokens/tokens.js';
import { Palette } from './Palette';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="Palette"
        component={Palette}
        durationInFrames={2 * BUEHNE.fps}
        fps={BUEHNE.fps}
        width={BUEHNE.breite}
        height={BUEHNE.hoehe}
      />
    </>
  );
};
