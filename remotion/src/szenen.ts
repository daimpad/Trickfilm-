// ERZEUGT von tools/remotion.js aus szenen/; nicht von Hand ändern (node tools/remotion.js vorbereiten)
import * as scene0 from '../../szenen/DEMO-01-buero/scene.js';
import * as zeitfunktion0 from '../../szenen/DEMO-01-buero/animation.js';

type Spec = { fps: number; width: number; height: number; duration: number };
export type SzeneImPort = {
  id: string;
  film: string;
  beginn: number;
  scene: { sceneMarkup: () => string; sceneApply: (s: unknown) => [string, string, string | number][] };
  zeitfunktion: { SPEC: Spec; computeState: (t: number) => unknown };
};

export const SZENEN: SzeneImPort[] = [
  { id: 'DEMO-01-buero', film: 'demo', beginn: 0, scene: scene0, zeitfunktion: zeitfunktion0 },
];

export const FILME: { film: string; szenen: string[] }[] = [
  { film: 'demo', szenen: ['DEMO-01-buero'] },
];
