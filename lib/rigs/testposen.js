// Sechs Testposen je Archetyp: Ruhe, Greifen, Zeigen, Tippen, Gehen oder Sitzen, Reaktion.
// Zeigen am Bild, dass Gelenke, Handformen und Spiegelung tragen; dienen auch dem Importer (Phase 3).
import { walkCycle } from '../motion.js';
import { konzentriert, ueberrascht, HALTUNGEN } from '../spielweise.js';
import { RIGS } from './index.js';

/** Profilarme aus einem Spielweise-Rezept zu Zusatzwinkeln addieren. */
function mitArmen(basis, rezept) {
  const aus = { ...basis };
  for (const arm of ['armF', 'armB']) {
    if (!rezept[arm]) continue;
    aus[arm] = { ...basis[arm], upper: (basis[arm]?.upper ?? 0) + rezept[arm].upper, lower: (basis[arm]?.lower ?? 0) + rezept[arm].lower };
  }
  return aus;
}

function profilPosen(r, { sitzt, beine }) {
  const ruhe = { ...r.defaults, x: 0, y: 0 };
  const greifen = { ...ruhe, torso: 4 };
  greifen.armF = r.greife(greifen, 'armF', { x: 130, y: -70 }, { form: 'greifend' });
  const zeigen = { ...ruhe, armF: { upper: 82, lower: 88, form: 'zeigend' } };
  const tippen = { ...ruhe, ...konzentriert(0) };
  tippen.armF = r.greife(tippen, 'armF', { x: 128, y: -36 });
  tippen.armB = r.greife(tippen, 'armB', { x: 108, y: -36 });
  let vierte;
  if (sitzt) {
    vierte = { name: 'Sitzen', state: { ...ruhe, ...HALTUNGEN.zurueckgelehnt, legF: { ...r.defaults.legF, foot: 10 } } };
  } else if (beine) {
    const g = walkCycle(0.2);
    vierte = { name: 'Gehen', state: { ...ruhe, ...g } };
  } else {
    vierte = { name: 'Zurücklehnen', state: { ...ruhe, ...HALTUNGEN.zurueckgelehnt } };
  }
  const u = ueberrascht(1, 0, 1);
  const reaktion = mitArmen({ ...ruhe, torso: u.torso, head: u.head, schulter: u.schulter }, u);
  return [
    { name: 'Ruhe', state: ruhe },
    { name: 'Greifen', state: greifen },
    { name: 'Zeigen', state: zeigen },
    { name: 'Tippen', state: tippen },
    vierte,
    { name: 'Reaktion', state: reaktion },
  ];
}

function frontalPosen(r) {
  const ruhe = { ...r.defaults, x: 0, y: 0 };
  const greifen = { ...ruhe };
  greifen.armR = r.greife(greifen, 'armR', { x: 150, y: -120 }, { form: 'greifend' });
  const tippen = { ...ruhe, head: 6, armL: { upper: 10, lower: -70 }, armR: { upper: 10, lower: -70 } };
  return [
    { name: 'Ruhe', state: ruhe },
    { name: 'Greifen', state: greifen },
    { name: 'Zeigen', state: { ...ruhe, ...r.posen.zeigenR } },
    { name: 'Tippen', state: tippen },
    { name: 'Halten', state: { ...ruhe, ...r.posen.halten } },
    {
      name: 'Reaktion',
      state: {
        ...ruhe,
        head: -10,
        schulterL: -6,
        schulterR: -6,
        armL: { upper: 40, lower: 130, form: 'offen' },
        armR: { upper: 40, lower: 130, form: 'offen' },
      },
    },
  ];
}

/** Testposen eines Archetyps als [{ name, state }]. */
export function testposen(name) {
  const r = RIGS[name];
  if (r.ansicht === 'frontal') return frontalPosen(r);
  return profilPosen(r, { sitzt: r.spez.beine === 'statisch', beine: r.spez.beine !== 'keine' });
}
