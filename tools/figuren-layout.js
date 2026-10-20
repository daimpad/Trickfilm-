// Layout der Zeichenvorlagen: wo jedes Teil mit seinem Drehpunkt auf der Zeichenfläche liegt,
// und welche Gelenke die Gelenkprüfung testet. Eine Quelle für Vorlage, satz-00 und Importer.
// Im Profil steht jedes Glied in einer eigenen Säule, damit sich keine Teile überlagern:
// Rumpf mit Kopf und vorderem Bein, vorderer Arm, hinteres Bein, hinterer Arm, dann die Handvarianten.
// Frontal hängen Arme und Beine an der Hauptfigur. Alles in Spezifikationsmaß (massstab 1).

const HAUPT = { x: 180, y: 300 };
const SAEULEN = { armF: { x: 300, y: 300 }, legB: { x: 420, y: 300 }, armB: { x: 540, y: 300 } };
const HAND_SPALTEN = { profil: { armF: 660, armB: 780 }, frontal: { armL: 620, armR: 740 } };
const HAND_ZEILEN = { greifend: 330, zeigend: 430 };
const FLAECHE = { profil: { breite: 880, hoehe: 560 }, frontal: { breite: 860, hoehe: 560 } };

const plus = (a, [x, y]) => ({ x: a.x + x, y: a.y + y });

/** Teile eines Archetyps in Zeichenreihenfolge, mit Handvarianten. */
export function teileVon(spez, name) {
  const a = spez.archetypen[name];
  const ansicht = a.ansicht;
  const mitBeinen = a.beine !== 'keine';
  const aus = [];
  for (const t of spez.teile[ansicht]) {
    if (t.startsWith('leg') && !mitBeinen) continue;
    if (t.endsWith('-hand')) for (const f of spez.handformen) aus.push(`${t}-${f}`);
    else aus.push(t);
  }
  return aus;
}

/** Drehpunkte aller Teile auf der Zeichenfläche und die Größe der Fläche. */
export function layout(spez, name) {
  const a = spez.archetypen[name];
  const s = a.segmente;
  const g = a.gelenke;
  const ansicht = a.ansicht;
  const p = {};
  p.torso = { ...HAUPT };
  p.head = plus(HAUPT, g.nacken);
  const arme = ansicht === 'frontal' ? [['armL', HAUPT, g.schulterL], ['armR', HAUPT, g.schulterR]] : [['armF', SAEULEN.armF, g.schulter], ['armB', SAEULEN.armB, g.schulter]];
  for (const [arm, basis, schulter] of arme) {
    p[`${arm}-upper`] = plus(basis, schulter);
    p[`${arm}-lower`] = plus(p[`${arm}-upper`], [0, s.oberarm]);
    p[`${arm}-hand-offen`] = plus(p[`${arm}-lower`], [0, s.unterarm]);
    for (const [form, y] of Object.entries(HAND_ZEILEN)) p[`${arm}-hand-${form}`] = { x: HAND_SPALTEN[ansicht][arm], y };
  }
  if (a.beine !== 'keine') {
    const beine = ansicht === 'frontal' ? [['legL', HAUPT, g.huefteL], ['legR', HAUPT, g.huefteR]] : [['legF', HAUPT, g.huefteF], ['legB', SAEULEN.legB, g.huefteB]];
    for (const [bein, basis, huefte] of beine) {
      p[`${bein}-upper`] = plus(basis, huefte);
      p[`${bein}-lower`] = plus(p[`${bein}-upper`], [0, s.oberschenkel]);
      p[`${bein}-foot`] = plus(p[`${bein}-lower`], [0, s.unterschenkel]);
    }
  }
  return { ...FLAECHE[ansicht], drehpunkte: p, haupt: { ...HAUPT } };
}

/**
 * Gelenke für die Gelenkprüfung: Elternteil, Kindteil und Gelenkpunkt im System des Elternteils.
 * Jede Handvariante ist ein eigenes Kind.
 */
export function gelenke(spez, name) {
  const a = spez.archetypen[name];
  const s = a.segmente;
  const g = a.gelenke;
  const teile = new Set(teileVon(spez, name));
  const aus = [];
  const add = (eltern, kind, [x, y]) => {
    if (teile.has(eltern) && teile.has(kind)) aus.push({ eltern, kind, punkt: { x, y } });
  };
  add('torso', 'head', g.nacken);
  const arme = a.ansicht === 'frontal' ? [['armL', g.schulterL], ['armR', g.schulterR]] : [['armF', g.schulter], ['armB', g.schulter]];
  for (const [arm, schulter] of arme) {
    add('torso', `${arm}-upper`, schulter);
    add(`${arm}-upper`, `${arm}-lower`, [0, s.oberarm]);
    for (const f of spez.handformen) add(`${arm}-lower`, `${arm}-hand-${f}`, [0, s.unterarm]);
  }
  const beine = a.ansicht === 'frontal' ? [['legL', g.huefteL], ['legR', g.huefteR]] : [['legF', g.huefteF], ['legB', g.huefteB]];
  for (const [bein, huefte] of beine) {
    if (!huefte) continue;
    add('torso', `${bein}-upper`, huefte);
    add(`${bein}-upper`, `${bein}-lower`, [0, s.oberschenkel]);
    add(`${bein}-lower`, `${bein}-foot`, [0, s.unterschenkel]);
  }
  return aus;
}

/** Winkel der Gelenkprüfung in Grad (Abschnitt 7.3). */
export const PRUEFWINKEL = [-60, 0, 60, 120];
