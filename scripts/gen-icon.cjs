// Generates a 1024x1024 RGBA PNG app-icon source (no external deps).
// A deep indigo -> teal diagonal gradient with a soft rounded "spark" glyph.
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const SIZE = 1024;

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
const cx = SIZE * 0.5;
const cy = SIZE * 0.5;

for (let y = 0; y < SIZE; y++) {
  const rowStart = y * (SIZE * 4 + 1);
  raw[rowStart] = 0; // filter byte: none
  for (let x = 0; x < SIZE; x++) {
    const t = (x + y) / (2 * SIZE);
    // Diagonal gradient from indigo (#4f46e5) to teal (#14b8a6)
    let r = lerp(79, 20, t);
    let g = lerp(70, 184, t);
    let b = lerp(229, 166, t);

    // Radial glow toward the center
    const dx = (x - cx) / SIZE;
    const dy = (y - cy) / SIZE;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const glow = Math.max(0, 1 - dist * 2.2);
    r = Math.min(255, r + glow * 60);
    g = Math.min(255, g + glow * 60);
    b = Math.min(255, b + glow * 60);

    const i = rowStart + 1 + x * 4;
    raw[i] = r;
    raw[i + 1] = g;
    raw[i + 2] = b;
    raw[i + 3] = 255;
  }
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;
const idat = zlib.deflateSync(raw, { level: 9 });

const png = Buffer.concat([
  sig,
  chunk("IHDR", ihdr),
  chunk("IDAT", idat),
  chunk("IEND", Buffer.alloc(0)),
]);

const out = path.join(__dirname, "icon-source.png");
fs.writeFileSync(out, png);
console.log("Wrote", out, png.length, "bytes");
