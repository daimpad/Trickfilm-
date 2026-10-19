// Testkarte der Werkstatt: zeigt die Startpalette mit Namen, Hexwert und gemessenem Kontrast.
// Prüft die Kette Tokens → JSX → Render und die Schrift im Render-System.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { BUEHNE, FARBEN, FLAECHEN, ROLLEN, SCHRIFT, SEKUNDAER, STRICH, kontrast } from '../../tokens/tokens.js';

type Farbname = keyof typeof FARBEN;

// Sechs Spalten teilen sich die Breite der Grafikfläche; nichts ragt über x1 hinaus.
const SPALTE = Math.floor((BUEHNE.grafik.x1 - BUEHNE.grafik.x0) / 6);
const FELD = { breite: 192, hoehe: 80 };
const REIHE_Y = [BUEHNE.grafik.y0 + 96, BUEHNE.grafik.y0 + 384];
const NAMEN: Farbname[][] = [
  ['primaerDunkel', 'primaerHell', 'schwarz'],
  SEKUNDAER as Farbname[],
];

const Feld: React.FC<{ name: Farbname; x: number; y: number }> = ({ name, x, y }) => {
  const hex = FARBEN[name];
  const flaeche = (FLAECHEN as Record<string, string>)[name];
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: SPALTE }}>
      <div
        style={{
          width: FELD.breite,
          height: FELD.hoehe,
          background: hex,
          border: `${STRICH.detail}px solid ${ROLLEN.kontur}`,
        }}
      />
      {flaeche ? (
        <div style={{ width: FELD.breite, height: 24, background: flaeche, borderLeft: `${STRICH.detail}px solid ${ROLLEN.kontur}`, borderRight: `${STRICH.detail}px solid ${ROLLEN.kontur}`, borderBottom: `${STRICH.detail}px solid ${ROLLEN.kontur}` }} />
      ) : null}
      <div style={{ fontSize: SCHRIFT.groesse.klein, fontWeight: SCHRIFT.gewicht.fett, marginTop: 8 }}>{name}</div>
      <div style={{ fontSize: SCHRIFT.groesse.klein - 8 }}>
        {hex} · {kontrast(hex, FARBEN.weiss).toFixed(2)}:1
      </div>
    </div>
  );
};

export const Palette: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: ROLLEN.grund, color: ROLLEN.text, fontFamily: SCHRIFT.familie }}>
      <div
        style={{
          position: 'absolute',
          left: BUEHNE.grafik.x0,
          top: BUEHNE.grafik.y0,
          fontSize: SCHRIFT.groesse.titel,
          fontWeight: SCHRIFT.gewicht.fett,
        }}
      >
        Startpalette
      </div>
      {NAMEN.map((reihe, r) =>
        reihe.map((name, i) => (
          <Feld key={name} name={name} x={BUEHNE.grafik.x0 + i * SPALTE} y={REIHE_Y[r] ?? 0} />
        )),
      )}
    </AbsoluteFill>
  );
};
