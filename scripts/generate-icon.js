// Generate a minimal valid 256x256 PNG icon
const fs = require('fs');
const zlib = require('zlib');

const width = 256;
const height = 256;

// Create pixel data - a gradient blue/purple icon with "IQ" feel
const rawData = Buffer.alloc((width * 4 + 1) * height);

for (let y = 0; y < height; y++) {
  rawData[y * (width * 4 + 1)] = 0; // filter byte
  for (let x = 0; x < width; x++) {
    const idx = y * (width * 4 + 1) + 1 + x * 4;
    const nx = x / width;
    const ny = y / height;
    
    // Rounded rectangle mask
    const cx = Math.abs(x - width/2) / (width/2);
    const cy = Math.abs(y - height/2) / (height/2);
    const corner = 0.85;
    const inRect = (cx < corner || cy < corner) || (cx*cx + cy*cy < 1.1);
    
    if (inRect && cx < 0.95 && cy < 0.95) {
      // Gradient from blue to purple
      rawData[idx] = Math.floor(30 + 80 * nx);     // R
      rawData[idx + 1] = Math.floor(100 + 60 * (1-nx)); // G  
      rawData[idx + 2] = Math.floor(200 + 55 * ny);      // B
      rawData[idx + 3] = 255;                       // A
    } else {
      rawData[idx] = 0;
      rawData[idx + 1] = 0;
      rawData[idx + 2] = 0;
      rawData[idx + 3] = 0;
    }
  }
}

const compressed = zlib.deflateSync(rawData);

// Build PNG file
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function writeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // color type (RGBA)
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

const png = Buffer.concat([
  signature,
  writeChunk('IHDR', ihdr),
  writeChunk('IDAT', compressed),
  writeChunk('IEND', Buffer.alloc(0))
]);

fs.writeFileSync('public/icon.png', png);
console.log(`Generated icon: ${png.length} bytes (${width}x${height} PNG)`);
