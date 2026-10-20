// ZIP-Archiv ohne Kompression (Methode „stored“), ohne Abhängigkeit; für Downloads der Teile-Werkstatt.
// Feste Zeitangabe 1980-01-01, damit gleicher Inhalt dasselbe Archiv ergibt.

const TABELLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 eines Byte-Felds. */
export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABELLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Dateien [{ name, inhalt (Text oder Uint8Array) }] zu einem ZIP-Archiv (Uint8Array). */
export function zip(dateien) {
  const enc = new TextEncoder();
  const teile = [];
  const verzeichnis = [];
  let versatz = 0;
  for (const { name, inhalt } of dateien) {
    const n = enc.encode(name);
    const d = typeof inhalt === 'string' ? enc.encode(inhalt) : inhalt;
    const crc = crc32(d);
    const kopf = new DataView(new ArrayBuffer(30));
    kopf.setUint32(0, 0x04034b50, true);
    kopf.setUint16(4, 20, true);
    kopf.setUint16(6, 0x0800, true); // Dateinamen in UTF-8
    kopf.setUint16(8, 0, true);
    kopf.setUint16(10, 0, true);
    kopf.setUint16(12, 0x21, true); // 1980-01-01
    kopf.setUint32(14, crc, true);
    kopf.setUint32(18, d.length, true);
    kopf.setUint32(22, d.length, true);
    kopf.setUint16(26, n.length, true);
    kopf.setUint16(28, 0, true);
    teile.push(new Uint8Array(kopf.buffer), n, d);
    const z = new DataView(new ArrayBuffer(46));
    z.setUint32(0, 0x02014b50, true);
    z.setUint16(4, 20, true);
    z.setUint16(6, 20, true);
    z.setUint16(8, 0x0800, true);
    z.setUint16(10, 0, true);
    z.setUint16(12, 0, true);
    z.setUint16(14, 0x21, true);
    z.setUint32(16, crc, true);
    z.setUint32(20, d.length, true);
    z.setUint32(24, d.length, true);
    z.setUint16(28, n.length, true);
    z.setUint32(42, versatz, true);
    verzeichnis.push(new Uint8Array(z.buffer), n);
    versatz += 30 + n.length + d.length;
  }
  const groesse = verzeichnis.reduce((s, b) => s + b.length, 0);
  const ende = new DataView(new ArrayBuffer(22));
  ende.setUint32(0, 0x06054b50, true);
  ende.setUint16(8, dateien.length, true);
  ende.setUint16(10, dateien.length, true);
  ende.setUint32(12, groesse, true);
  ende.setUint32(16, versatz, true);
  const alle = [...teile, ...verzeichnis, new Uint8Array(ende.buffer)];
  const aus = new Uint8Array(alle.reduce((s, b) => s + b.length, 0));
  let p = 0;
  for (const b of alle) {
    aus.set(b, p);
    p += b.length;
  }
  return aus;
}
