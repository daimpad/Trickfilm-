// Prompts für Claude Code, eine Quelle für die Anleitungen und den Prompt-Editor der Webseite.
// {FELD} wird durch den Wert des gleichnamigen Felds ersetzt; tools/seite-platzhalter.js setzt beides in die Seite.

/** Felder, die in Prompts eingesetzt werden: Beschriftung, Vorgabe, mehrzeilig oder Auswahl. */
export const FELDER = {
  ID: { label: 'Szenen-ID', vorgabe: 'FILM-01-name', hinweis: 'Film, Nummer, Kurzname' },
  IDEE: { label: 'Was die Szene zeigt', vorgabe: '[ein Satz, worum es geht]' },
  SPRECHTEXT: { label: 'Sprechtext', vorgabe: '[Sprechtext wörtlich]', mehrzeilig: true },
  GERAEUSCHE: { label: 'Was klingen soll', vorgabe: 'jeder dritte Tastenanschlag, das Erscheinen des Hakens' },
  FIGUR: { label: 'Figur', vorgabe: 'A' },
  SATZ: { label: 'Teilesatz', vorgabe: 'satz-01' },
  ARCHETYP: { label: 'Archetyp', vorgabe: 'sitzend-profil', auswahl: ['sitzend-profil', 'stehend-profil', 'stehend-frontal', 'oberkoerper-nah'] },
};

/** Prompt-Vorlagen je Anleitung und Schritt; die Schlüssel stehen als {{PROMPT:…}} in site/index.html. */
export const PROMPTS = {
  'einrichten/holen': {
    gruppe: 'Einrichten',
    titel: 'Repository holen',
    text: 'Klone https://github.com/daimpad/trickfilm.git in einen Ordner trickfilm und arbeite von dort aus.',
  },
  'einrichten/pakete': {
    gruppe: 'Einrichten',
    titel: 'Pakete installieren',
    text: 'Installiere die Abhängigkeiten mit npm ci und sag mir, ob Node 22 oder neuer, ffmpeg, ffprobe und die Schrift Arial oder Liberation Sans vorhanden sind.',
  },
  'einrichten/chromium': {
    gruppe: 'Einrichten',
    titel: 'Chromium einrichten',
    text: 'Richte Chromium für Playwright ein (npx playwright install chromium). In einer Cloud-Sitzung liegt es schon unter /opt/pw-browsers; dann nichts installieren.',
  },
  'einrichten/pruefen': {
    gruppe: 'Einrichten',
    titel: 'Alles prüfen',
    text: 'Führe npm run pruefen aus und melde in höchstens fünf Zeilen, ob alles grün ist und was fehlt, falls nicht.',
  },

  'uebung/anlegen': {
    gruppe: 'Erste Übung',
    titel: 'Kopie anlegen',
    text: 'Lege mit npm run szene:neu -- UEBUNG-01-test eine Übungskopie der Vorlage an und sag mir, welche Dateien entstanden sind.',
  },
  'uebung/geraeusche': {
    gruppe: 'Erste Übung',
    titel: 'Geräusche zuordnen',
    text: 'Ordne in UEBUNG-01-test die Geräusche zu (npm run sfx:cues -- UEBUNG-01-test) und nenne die Zahl der Ereignisse und Cues.',
  },
  'uebung/bauen': {
    gruppe: 'Erste Übung',
    titel: 'Bauen',
    text: 'Baue UEBUNG-01-test und nenne die Zahl der Befunde.',
  },
  'uebung/aendern': {
    gruppe: 'Erste Übung',
    titel: 'Farbe ändern',
    text: 'Ändere in szenen/UEBUNG-01-test/geometry.js die Farbe kleidung1 von Figur A von FARBEN.petrol auf FARBEN.violett und baue neu.',
  },
  'uebung/ansehen': {
    gruppe: 'Erste Übung',
    titel: 'Kontaktbogen ansehen',
    text: 'Erzeuge den Kontaktbogen von UEBUNG-01-test und zeig ihn mir.',
  },
  'uebung/fehler': {
    gruppe: 'Erste Übung',
    titel: 'Fehler auslösen',
    text: 'Setze in szenen/UEBUNG-01-test/geometry.js Figur A auf x 560, baue neu und erkläre mir die Meldung des Builds.',
  },
  'uebung/beheben': {
    gruppe: 'Erste Übung',
    titel: 'Beheben',
    text: 'Setze Figur A in UEBUNG-01-test zurück auf x 730 und baue neu.',
  },
  'uebung/aufraeumen': {
    gruppe: 'Erste Übung',
    titel: 'Aufräumen',
    text: 'Lösche den Übungsordner szenen/UEBUNG-01-test; er gehört nicht ins Repository.',
  },

  'szene/anlegen': {
    gruppe: 'Szene bauen',
    titel: 'Anlegen',
    text: 'Lege auf einem eigenen Zweig eine neue Szene {ID} an (npm run szene:neu -- {ID}).',
  },
  'szene/brief': {
    gruppe: 'Szene bauen',
    titel: 'Brief schreiben',
    text:
      'Fülle szenen/{ID}/brief.yaml. Die Szene zeigt: {IDEE}\nSprechtext wörtlich: „{SPRECHTEXT}“\n' +
      'Schätze die Dauer mit 15 Zeichen je Sekunde plus 10–15 % Luft und markiere sie als geschätzt. Schlage These, Pointe, Figuren mit Charakter und Beats vor. Frag mich, bevor du Sprech- oder Bildschirmtext umformulierst.',
  },
  'szene/geometrie': {
    gruppe: 'Szene bauen',
    titel: 'Geometrie festlegen',
    text: 'Lege in szenen/{ID}/geometry.js fest, wo Figuren und Requisiten stehen und wohin die Hände greifen: Abstände auf dem 8-px-Raster, Farben nur aus den Tokens, jedes Handziel in Reichweite.',
  },
  'szene/aufbau': {
    gruppe: 'Szene bauen',
    titel: 'Szene aufbauen',
    text: 'Baue in szenen/{ID}/scene.js die Szene aus Figuren und Requisiten auf, von hinten nach vorn, mit einer Zeile Begründung für die Reihenfolge. TITEL und DESC wie im Brief.',
  },
  'szene/bewegung': {
    gruppe: 'Szene bauen',
    titel: 'Bewegung schreiben',
    text: 'Schreibe in szenen/{ID}/animation.js die Bewegung nach den Beats des Briefs, über jeder Animationsfunktion eine Zeile, was sie erzählerisch leistet; Hände über rig.greife(). Zeig mir danach je Beat ein Standbild.',
  },
  'szene/geraeusche': {
    gruppe: 'Szene bauen',
    titel: 'Geräusche zuordnen',
    text: 'Ordne in {ID} Geräusche zu: {GERAEUSCHE}. Trag sie im Brief unter sfx ein, führe npm run sfx:cues -- {ID} --stichprobe aus und zeig mir die Stichprobe.',
  },
  'szene/bauen': {
    gruppe: 'Szene bauen',
    titel: 'Bauen',
    text: 'Baue {ID} und behebe jeden Befund in Geometrie oder Bewegung, nie im Standbild. Nenne mir, was du geändert hast.',
  },
  'szene/ansehen': {
    gruppe: 'Szene bauen',
    titel: 'Kontaktbogen ansehen',
    text: 'Erzeuge den Kontaktbogen von {ID}, zeig ihn mir und prüfe jedes der neun Bilder: Liegt etwas falsch vor dem Körper, greift ein Arm durch den Tisch, ist die Pointe bei 960 px lesbar?',
  },
  'szene/abspielen': {
    gruppe: 'Szene bauen',
    titel: 'Prototyp prüfen',
    text: 'Prüfe den Prototyp von {ID} im Browser: Laufen Bild und Geräusche zusammen? Zeig mir je Beat ein Standbild.',
  },
  'szene/protokoll': {
    gruppe: 'Szene bauen',
    titel: 'Protokoll schreiben',
    text: 'Schreibe das Protokoll von {ID} (npm run szene:protokoll -- {ID}).',
  },
  'szene/anhalten': {
    gruppe: 'Szene bauen',
    titel: 'Anhalten und melden',
    text: 'Halte an und melde in höchstens fünf Zeilen, was an {ID} fertig ist und was offen bleibt. Committe, pushe und öffne einen Pull Request gegen main.',
  },

  'figur/teile': {
    gruppe: 'Figur zeichnen',
    titel: 'Welche Teile?',
    text: 'Welche Körperteile braucht der Archetyp {ARCHETYP}, wie müssen die Dateien für die Teile-Werkstatt heißen, und welche Regeln gelten für die Zeichnung?',
  },
  'figur/einlesen': {
    gruppe: 'Figur zeichnen',
    titel: 'Teilesatz einlesen',
    text: 'Ich habe den Teilesatz {SATZ} unter figuren/teilesaetze/{SATZ}/ abgelegt. Lies ihn ein (npm run figuren:import -- {SATZ}), zeig mir die Testposen und erkläre jede Lücke an einem Gelenk.',
  },
  'figur/vorlage': {
    gruppe: 'Figur zeichnen',
    titel: 'Vorlage anlegen',
    text: 'Lege die Zeichenvorlage für {ARCHETYP} als figuren/teilesaetze/{SATZ}/{ARCHETYP}.svg an und erkläre mir kurz ihre Ebenen und die blauen Kreise.',
  },

  'geraeusche/eintragen': {
    gruppe: 'Geräusche pflegen',
    titel: 'Ereignisse eintragen',
    text: 'Trag im Brief von {ID} unter sfx ein, welche Ereignisse klingen: {GERAEUSCHE}. Wähle die Cues aus dem Katalog und nenne mir, welche du nimmst.',
  },
  'geraeusche/stichprobe': {
    gruppe: 'Geräusche pflegen',
    titel: 'Zeitpunkte finden',
    text: 'Führe npm run sfx:cues -- {ID} --stichprobe aus und zeig mir die Stichprobe: Bewegt sich das Ding im Ereignisbild zuerst?',
  },
  'geraeusche/bauen': {
    gruppe: 'Geräusche pflegen',
    titel: 'Neu bauen',
    text: 'Baue {ID} neu und sag mir, ob der Prototyp die Geräusche mitspielt.',
  },
  'geraeusche/kosten': {
    gruppe: 'Geräusche pflegen',
    titel: 'Kosten schätzen (Regie)',
    text: 'Welche Geräusche fehlen für {ID}? Führe npm run sfx:kosten aus und lege mir Cue-Liste, Varianten und geschätzte Credits vor. Generiere noch nichts.',
  },
  'geraeusche/generieren': {
    gruppe: 'Geräusche pflegen',
    titel: 'Generieren (Regie)',
    text: 'Ja, generieren: Erzeuge die vorgelegten Geräusche über den ElevenLabs-Connector, nacheinander in kleinen Gruppen, und lege sie mit npm run sfx:ablegen ab. Wiederhole nie einen laufenden Aufruf.',
  },
  'geraeusche/waehlen': {
    gruppe: 'Geräusche pflegen',
    titel: 'Wählen und bearbeiten',
    text: 'Erzeuge die Hörprobe (npm run sfx:hoerprobe). Wenn ich dir auswahl.csv gebe, übernimm die Wahl und normalisiere die Geräusche.',
  },

  'werkzeug/posen': {
    gruppe: 'Werkzeuge',
    titel: 'Posen-Editor öffnen',
    text: 'Erzeuge den Posen-Editor für {ID}, Figur {FIGUR} (npm run editor -- --szene {ID} --figur {FIGUR}), und sag mir, wo die Datei liegt.',
  },
  'werkzeug/mimik': {
    gruppe: 'Werkzeuge',
    titel: 'Mimik-Editor öffnen',
    text: 'Erzeuge den Mimik-Editor (npm run mimik) und sag mir, wo die Datei liegt. Figur {FIGUR} in {ID} soll ein Gesicht tragen: setz im Brief mimik: an und in scene.js mimik: true.',
  },
  'werkzeug/mimik-code': {
    gruppe: 'Werkzeuge',
    titel: 'Mimik übernehmen',
    text: 'Hier ist der Code aus dem Mimik-Editor für Figur {FIGUR}:\n[Code einfügen]\nTrag ihn in szenen/{ID}/geometry.js ein, lies ihn in animation.js mit mimikZustand() und blinzeln(), baue neu und zeig mir Standbilder der Köpfe an den Schlüsseln.',
  },
  'werkzeug/posen-code': {
    gruppe: 'Werkzeuge',
    titel: 'Posen übernehmen',
    text: 'Hier ist der Code aus dem Posen-Editor für Figur {FIGUR}:\n[Code einfügen]\nTrag ihn in szenen/{ID}/geometry.js ein, lies ihn in animation.js mit posenZustand() und baue neu.',
  },
};
