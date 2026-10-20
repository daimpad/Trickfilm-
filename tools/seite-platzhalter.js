// Platzhalter der Webseite: {{NAME}} aus einer Tabelle, {{PROMPT:schlüssel}} als Prompt-Kasten,
// {{FELDER:A,B}} als Eingabefelder, {{PROMPT_DATEN}} als JSON für den Prompt-Editor.
// Gemeinsam für tools/seite-bauen.js und den Browser-Test der Seite; ein unbekannter Platzhalter hält an.
import { FELDER, PROMPTS } from '../site/prompts.js';

export const maske = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Setzt die Vorgaben der Felder in eine Vorlage ein. */
export function fuelle(text, werte = {}) {
  return text.replace(/\{([A-Z_]+)\}/g, (_, k) => werte[k] ?? FELDER[k].vorgabe);
}

/** Felder, die eine Vorlage verwendet. */
export const felderVon = (text) => [...new Set([...text.matchAll(/\{([A-Z_]+)\}/g)].map((m) => m[1]))];

// Jede Vorlage darf nur bekannte Felder verwenden.
for (const [k, p] of Object.entries(PROMPTS)) {
  const fremd = felderVon(p.text).filter((f) => !FELDER[f]);
  if (fremd.length) throw new Error(`Prompt ${k}: unbekannte Felder ${fremd.join(', ')}`);
}

function promptKasten(schluessel) {
  const p = PROMPTS[schluessel];
  if (!p) throw new Error(`Seite: Prompt „${schluessel}“ fehlt in site/prompts.js`);
  const text = fuelle(p.text);
  const zeilen = Math.max(2, text.split('\n').reduce((n, z) => n + Math.ceil(z.length / 88), 0));
  return (
    `<div class="prompt" data-prompt="${maske(schluessel)}">` +
    `<div class="prompt-kopf"><span>Prompt für Claude Code</span>` +
    `<button type="button" class="prompt-zurueck" hidden>Zurücksetzen</button>` +
    `<button type="button" class="prompt-kopieren" hidden><svg class="icon" aria-hidden="true"><use href="#i-kopieren"/></svg>Kopieren</button></div>` +
    `<textarea class="prompt-text" rows="${zeilen}" spellcheck="false" aria-label="Prompt: ${maske(p.titel)}">${maske(text)}</textarea></div>`
  );
}

function feldEingabe(name) {
  const f = FELDER[name];
  if (!f) throw new Error(`Seite: Feld „${name}“ fehlt in site/prompts.js`);
  const attr = `data-feld="${name}" aria-label="${maske(f.label)}"`;
  const eingabe = f.auswahl
    ? `<select ${attr}>${f.auswahl.map((w) => `<option${w === f.vorgabe ? ' selected' : ''}>${maske(w)}</option>`).join('')}</select>`
    : f.mehrzeilig
      ? `<textarea ${attr} placeholder="${maske(f.vorgabe)}" rows="2"></textarea>`
      : `<input type="text" ${attr} placeholder="${maske(f.vorgabe)}">`;
  return `<label><span>${maske(f.label)}${f.hinweis ? ` <small>${maske(f.hinweis)}</small>` : ''}</span>${eingabe}</label>`;
}

function felder(liste) {
  return `<div class="felder"><p>In alle Prompts dieser Anleitung eingesetzt; bleibt nur in diesem Browser.</p>${liste.split(',').map((n) => feldEingabe(n.trim())).join('')}</div>`;
}

/** Ersetzt alle Platzhalter; `tabelle` liefert die einfachen ({{PALETTE}}, {{SKRIPTE}}). */
export function setzePlatzhalter(html, tabelle) {
  return html.replace(/\{\{([A-Z_]+)(?::([^}]+))?\}\}/g, (ganz, k, arg) => {
    if (k === 'PROMPT' && arg) return promptKasten(arg);
    if (k === 'FELDER' && arg) return felder(arg);
    if (k === 'PROMPT_DATEN') return JSON.stringify({ felder: FELDER, prompts: PROMPTS }).replace(/</g, '\\u003c');
    if (!(k in tabelle)) throw new Error(`Seite: Platzhalter ${ganz} unbekannt`);
    return tabelle[k];
  });
}
