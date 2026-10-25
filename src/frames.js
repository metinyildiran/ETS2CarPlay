export const WIDTH = 1024;
export const HEIGHT = 512;
export const PIXEL_BYTES = WIDTH * HEIGHT * 4;
export function packFrame(pixels, sequence) {
  if (pixels.length !== PIXEL_BYTES) throw new Error('Invalid frame size');
  const header = Buffer.alloc(24);
  header.write('FH6F');
  header.writeUInt32LE(1, 4);
  header.writeUInt32LE(WIDTH, 8);
  header.writeUInt32LE(HEIGHT, 12);
  header.writeUInt32LE(WIDTH * 4, 16);
  header.writeUInt32LE(sequence >>> 0, 20);
  return Buffer.concat([header, pixels]);
}
