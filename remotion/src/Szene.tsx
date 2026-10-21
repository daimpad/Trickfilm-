// Eine Szene in Remotion: dieselben Module wie der Prototyp (geometry.js, animation.js, scene.js), je Bild
// computeState(frame / fps) und die Zuordnung aus sceneApply als Props. Keine gestalterische Änderung im Port.
// Ton: der Ausschnitt der Filmmischung (npm run mischen) ab dem Beginn der Szene im Film; fehlt sie, bleibt es still.
import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, getStaticFiles, staticFile, useCurrentFrame } from 'remotion';
import { alsJsx, ids, lies, zuordnung } from './svg';
import { SZENEN } from './szenen';

export const mischungPfad = (film: string) => `ton/${film}-mischung.wav`;

// Props bleiben eine ID: Remotion reicht Props als JSON weiter, Module mit Funktionen kämen nicht an.
export const Szene: React.FC<{ id: string }> = ({ id }) => {
  const szene = SZENEN.find((s) => s.id === id);
  if (!szene) throw new Error(`Szene ${id} fehlt in remotion/src/szenen.ts (node tools/remotion.js vorbereiten)`);
  const frame = useCurrentFrame();
  const { fps } = szene.zeitfunktion.SPEC;
  const baum = useMemo(() => lies(szene.scene.sceneMarkup()), [szene]);
  const bekannt = useMemo(() => ids(baum), [baum]);
  const s = szene.zeitfunktion.computeState(frame / fps);
  const bild = alsJsx(baum, zuordnung(szene.scene.sceneApply(s), bekannt));
  const ton = mischungPfad(szene.film);
  const mitTon = getStaticFiles().some((f) => f.name === ton);
  return (
    <AbsoluteFill>
      {bild}
      {mitTon ? <Audio src={staticFile(ton)} trimBefore={Math.round(szene.beginn * fps)} /> : null}
    </AbsoluteFill>
  );
};
