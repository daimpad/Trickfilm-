// Platzhalter für Skripte, deren Werkzeug erst in einer späteren Phase entsteht.
// Sagt ausdrücklich, dass es nichts getan hat, und endet mit Fehlercode,
// damit ein Lauf nie wie „nichts zu tun“ aussieht.
const [phase, name] = process.argv.slice(2);
console.error(`FEHLER: „${name}“ ist noch nicht gebaut (kommt mit Phase ${phase}). Nichts ausgeführt.`);
process.exit(2);
