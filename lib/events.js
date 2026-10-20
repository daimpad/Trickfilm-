// Ereignisse aus der Zeitfunktion (Abschnitt 8.5): computeState(t) bildgenau abtasten und erkennen,
// wo etwas anschlägt, losgeht, ankommt oder erscheint. Zeiten stehen nie im Brief; sie folgen der Bewegung.
// Bildschirmkoordinaten: „abwärts“ heißt, y wächst. Geschwindigkeiten in Einheiten je Sekunde.

/** Ereignistyp → Erkennungsart. Neue Typen kommen hier dazu, nicht in den Brief. */
export const ERKENNUNG = {
  anschlag: 'tiefpunkt',
  stempel: 'tiefpunkt',
  klick: 'beginn',
  schritt: 'nulldurchgang',
  abheben: 'bewegung_start',
  ausgabe: 'bewegung_start',
  aufbruch: 'bewegung_start',
  ankunft: 'bewegung_ende',
  aufsetzen: 'bewegung_ende',
  aufprall: 'aufprall',
  geraet: 'huellkurve',
  erscheinen: 'schwelle_auf',
};

/** Vorgaben je Erkennungsart; jede Quelle im Brief darf sie überschreiben. mindestbilder: Mindestabstand zweier Ereignisse in Bildern. */
export const VORGABEN = {
  tiefpunkt: { hub: 1.5, mindestbilder: 3 },
  beginn: { schwelle: 0.5, mindestbilder: 3 },
  nulldurchgang: { pegel: 0, richtung: 'beide', mindestbilder: 3 },
  bewegung_start: { schwelle: 20, mindestbilder: 3 },
  bewegung_ende: { schwelle: 20, mindestbilder: 3 },
  aufprall: { stark: 300, schwelle: 20, fenster: 2, mindestbilder: 3 },
  huellkurve: { schwelle: 0.5, ruecksetzen: 0.8, mindestbilder: 3 },
  schwelle_auf: { schwelle: 0.05, ruecksetzen: 0.8, mindestbilder: 3 },
};

const istPunkt = (v) => v !== null && typeof v === 'object' && typeof v.x === 'number' && typeof v.y === 'number';
const abstandVon = (a, b) => (istPunkt(a) ? Math.hypot(a.x - b.x, a.y - b.y) : Math.abs(a - b));

function folge(objekt, teile) {
  let v = objekt;
  for (const k of teile) {
    if (v === null || v === undefined) return undefined;
    v = v[k];
  }
  return v;
}

/**
 * Wert eines Pfads wie „A.armF.hand.y“ oder „haken.deckkraft“. Fehlt er im Zustand und beginnt er mit
 * einer Figur, wird er in deren Gelenken gesucht (rig.gelenke). Ein unbekannter Pfad hält an.
 */
export function wert(zustand, pfad, figuren = {}, cache = new Map()) {
  const teile = pfad.split('.');
  let v = folge(zustand, teile);
  if (v === undefined && figuren[teile[0]] && zustand[teile[0]]) {
    if (!cache.has(teile[0])) cache.set(teile[0], figuren[teile[0]].gelenke(zustand[teile[0]]));
    v = folge(cache.get(teile[0]), teile.slice(1));
  }
  if (v === undefined) throw new Error(`Pfad „${pfad}“ gibt es im Zustand nicht`);
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v !== 'number' && !istPunkt(v)) throw new Error(`Pfad „${pfad}“ ist weder Zahl noch Punkt {x, y}`);
  if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`Pfad „${pfad}“ ist keine endliche Zahl`);
  return v;
}

/** Bilder, an denen ein Ereignis zu nahe am vorigen liegt, fallen weg. */
function mitAbstand(bilder, abstand) {
  const aus = [];
  for (const f of bilder) if (!aus.length || f - aus.at(-1) >= abstand) aus.push(f);
  return aus;
}

/** Geschwindigkeit je Bild (Einheiten/s); null, wo ein Nachbar fehlt. Der erste Wert eines Abschnitts gilt als Ruhe. */
function geschwindigkeiten(reihe, fps) {
  return reihe.map((v, i) => {
    if (v === null) return null;
    const vorher = reihe[i - 1];
    return vorher === null || vorher === undefined ? 0 : abstandVon(v, vorher) * fps;
  });
}

const nurZahl = (reihe, art) => {
  if (reihe.some(istPunkt)) throw new Error(`Erkennung „${art}“ braucht eine Zahl, keinen Punkt`);
};

/**
 * Bilder mit Ereignissen in einer Reihe von Werten (null = unsichtbar oder außerhalb des Beats).
 * Jede Lücke beginnt die Erkennung neu.
 */
export function erkenne(art, reihe, fps, optionen = {}) {
  const o = { ...VORGABEN[art], ...optionen };
  if (!VORGABEN[art]) throw new Error(`Erkennungsart „${art}“ unbekannt`);
  const bilder = [];
  if (art === 'tiefpunkt') {
    // Umkehr von abwärts nach aufwärts mit Hysterese: Ein Anschlag braucht hub auf dem Weg hinab und wieder hinauf.
    nurZahl(reihe, art);
    let zustand = null;
    let tief = 0;
    let hoch = 0;
    let hochBild = 0;
    reihe.forEach((x, i) => {
      if (x === null) return void (zustand = null);
      if (zustand === null) {
        zustand = 'auf';
        tief = x;
      }
      if (zustand === 'auf') {
        tief = Math.min(tief, x);
        if (x - tief >= o.hub) {
          zustand = 'ab';
          hoch = x;
          hochBild = i;
        }
      } else {
        if (x > hoch) {
          hoch = x;
          hochBild = i;
        }
        if (hoch - x >= o.hub) {
          bilder.push(hochBild);
          zustand = 'auf';
          tief = x;
        }
      }
    });
  } else if (art === 'beginn') {
    // Der Wert verlässt seine Ruhe (erster Wert des Abschnitts); erneut scharf, wenn er zurückkehrt.
    let ruhe = null;
    let scharf = true;
    reihe.forEach((x, i) => {
      if (x === null) return void (ruhe = null);
      if (ruhe === null) {
        ruhe = x;
        scharf = true;
      }
      const d = abstandVon(x, ruhe);
      if (scharf && d > o.schwelle) {
        bilder.push(i);
        scharf = false;
      } else if (!scharf && d <= o.schwelle / 2) scharf = true;
    });
  } else if (art === 'nulldurchgang') {
    // Der Wert kreuzt den Pegel; das Bild näher am Pegel zählt, bei Gleichstand das frühere.
    nurZahl(reihe, art);
    let seite = 0;
    reihe.forEach((x, i) => {
      if (x === null) return void (seite = 0);
      const s = Math.sign(x - o.pegel);
      if (s === 0) return;
      if (seite !== 0 && s !== seite && (o.richtung === 'beide' || (o.richtung === 'auf') === s > 0)) {
        bilder.push(Math.abs(reihe[i - 1] - o.pegel) <= Math.abs(x - o.pegel) ? i - 1 : i);
      }
      seite = s;
    });
  } else if (art === 'bewegung_start' || art === 'bewegung_ende' || art === 'aufprall') {
    const v = geschwindigkeiten(reihe, fps);
    v.forEach((g, i) => {
      if (g === null || v[i - 1] === null || v[i - 1] === undefined) return;
      const vorher = v[i - 1];
      // Start: das letzte ruhige Bild; Ende: das erste Bild, an dem das Ding angekommen ist.
      if (art === 'bewegung_start' && vorher <= o.schwelle && g > o.schwelle) bilder.push(i - 1);
      if (art === 'bewegung_ende' && vorher > o.schwelle && g <= o.schwelle) bilder.push(i - 1);
      if (art === 'aufprall' && g <= o.schwelle) {
        const davor = v.slice(Math.max(0, i - o.fenster), i).filter((x) => x !== null);
        if (davor.length && Math.max(...davor) >= o.stark && vorher > o.schwelle) bilder.push(i - 1);
      }
    });
  } else {
    // huellkurve, schwelle_auf: steigt über die Schwelle; erneut scharf unter schwelle · ruecksetzen.
    nurZahl(reihe, art);
    let scharf = true;
    reihe.forEach((x, i) => {
      if (x === null) return void (scharf = true);
      if (scharf && x > o.schwelle && (i === 0 || reihe[i - 1] === null || reihe[i - 1] <= o.schwelle)) {
        bilder.push(i);
        scharf = false;
      } else if (!scharf && x < o.schwelle * o.ruecksetzen) scharf = true;
    });
  }
  return mitAbstand(bilder, o.mindestbilder);
}

const OPTIONEN = ['hub', 'schwelle', 'pegel', 'richtung', 'stark', 'fenster', 'mindestbilder', 'ruecksetzen'];

/**
 * Alle Ereignisse einer Szene. quellen: { typ: [ { pfad | pfade, sichtbar?, beat?, figur?, requisite?, ort?, … } ] }
 * aus brief.sfx.quellen; beats: { name: [start, ende] }; figuren: { A: rig } für Pfade in die Gelenke.
 * Liefert [{ typ, bild, t, pfad, quelle, beat, figur, requisite, ort }] nach Zeit geordnet.
 */
export function computeEvents({ computeState, dauer, fps = 30, quellen = {}, beats = {}, figuren = {} }) {
  const anzahl = Math.round(dauer * fps) + 1;
  const zustaende = Array.from({ length: anzahl }, (_, i) => ({ z: computeState(i / fps), cache: new Map() }));
  const aus = [];
  for (const [typ, liste] of Object.entries(quellen)) {
    const art = ERKENNUNG[typ];
    if (!art) throw new Error(`Ereignistyp „${typ}“ unbekannt; bekannt: ${Object.keys(ERKENNUNG).join(', ')}`);
    if (!Array.isArray(liste)) throw new Error(`quellen.${typ} muss eine Liste sein`);
    liste.forEach((q, nr) => {
      const pfade = q.pfade ?? (q.pfad ? [q.pfad] : null);
      if (!pfade?.length) throw new Error(`quellen.${typ}[${nr}]: pfad oder pfade fehlt`);
      const fenster = q.beat ? beats[q.beat] : [0, dauer];
      if (!fenster) throw new Error(`quellen.${typ}[${nr}]: Beat „${q.beat}“ unbekannt`);
      const optionen = Object.fromEntries(OPTIONEN.filter((k) => k in q).map((k) => [k, q[k]]));
      for (const pfad of pfade) {
        const reihe = zustaende.map(({ z, cache }, i) => {
          const t = i / fps;
          if (t < fenster[0] - 1e-9 || t > fenster[1] + 1e-9) return null;
          if (q.sichtbar && !(wert(z, q.sichtbar, figuren, cache) > 0)) return null;
          return wert(z, pfad, figuren, cache);
        });
        for (const bild of erkenne(art, reihe, fps, optionen)) {
          const { z, cache } = zustaende[bild];
          const ort = q.ort ? wert(z, q.ort, figuren, cache) : null;
          aus.push({
            typ,
            bild,
            t: bild / fps,
            pfad,
            quelle: nr,
            beat: q.beat ?? null,
            figur: q.figur ?? null,
            requisite: q.requisite ?? null,
            ort: istPunkt(ort) ? { x: ort.x, y: ort.y } : null,
          });
        }
      }
    });
  }
  return aus.sort((a, b) => a.bild - b.bild || a.typ.localeCompare(b.typ) || a.pfad.localeCompare(b.pfad));
}
