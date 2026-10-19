// Szene und Bibliothek zu einer Datei bündeln, für den Prototyp.
// Jedes Modul bleibt ein echtes ES-Modul: Es wird als data:-URL in eine Import-Map gelegt,
// umgeschrieben werden nur die relativen Modulangaben zu festen Schlüsseln „tf:<pfad>“.
// So gibt es keine Falle mit mehrzeiligen Imports oder export { … } am Dateiende (Abschnitt 15):
// der Browser selbst löst die Import- und Exportlisten auf. Nur in Node verwendet.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

// Modulangaben: import … from '…', export … from '…', import '…', import('…').
const ANGABE = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])([^'"\n]+)\2/g;

const schluessel = (wurzel, pfad) => 'tf:' + relative(wurzel, pfad).split(sep).join('/');

/**
 * Bündelt die Module ab den Einstiegen. Liefert { importmap, module, schluessel(pfad) }.
 * Eine Angabe, die kein relativer Pfad ist oder ins Leere zeigt, hält an.
 */
export function buendle(einstiege, wurzel) {
  const module = new Map();
  const offen = einstiege.map((p) => resolve(p));
  while (offen.length) {
    const pfad = offen.pop();
    const k = schluessel(wurzel, pfad);
    if (module.has(k)) continue;
    if (!existsSync(pfad)) throw new Error(`Bündel: Modul fehlt: ${relative(wurzel, pfad)}`);
    if (!relative(wurzel, pfad) || relative(wurzel, pfad).startsWith('..')) throw new Error(`Bündel: Modul außerhalb des Repositorys: ${pfad}`);
    const quelle = readFileSync(pfad, 'utf8');
    const umgeschrieben = quelle.replace(ANGABE, (ganz, vor, q, angabe) => {
      if (!angabe.startsWith('./') && !angabe.startsWith('../')) {
        throw new Error(`Bündel: ${relative(wurzel, pfad)} importiert „${angabe}“; die Bibliothek nimmt nur relative Module`);
      }
      const ziel = resolve(dirname(pfad), angabe);
      offen.push(ziel);
      return `${vor}${q}${schluessel(wurzel, ziel)}${q}`;
    });
    module.set(k, umgeschrieben);
  }
  const importmap = { imports: {} };
  for (const [k, quelle] of module) {
    importmap.imports[k] = 'data:text/javascript;base64,' + Buffer.from(quelle, 'utf8').toString('base64');
  }
  return { importmap, module, schluessel: (p) => schluessel(wurzel, resolve(p)) };
}

/** Die Import-Map als Skriptblock; </script> im Inhalt ist durch Base64 ausgeschlossen. */
export function importmapSkript(importmap) {
  return `<script type="importmap">${JSON.stringify(importmap)}</script>`;
}
