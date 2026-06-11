import { readFile, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "public/images/inkcuba-logo.png");
const appDir = path.join(root, "src/app");

async function createSquareIcon(size, outputPath) {
  const buffer = await sharp(source)
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  await writeFile(outputPath, buffer);
  return buffer;
}

async function createFaviconIco(pngBuffers, outputPath) {
  // Minimal ICO writer for 16x16 and 32x32 PNG-embedded icons
  const images = pngBuffers.map((buf, index) => ({
    size: index === 0 ? 16 : 32,
    buffer: buf,
  }));

  const headerSize = 6;
  const entrySize = 16;
  const numImages = images.length;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(numImages, 4);

  let offset = headerSize + entrySize * numImages;
  const entries = [];
  const dataChunks = [];

  for (const image of images) {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(image.size === 256 ? 0 : image.size, 0);
    entry.writeUInt8(image.size === 256 ? 0 : image.size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    dataChunks.push(image.buffer);
    offset += image.buffer.length;
  }

  await writeFile(outputPath, Buffer.concat([header, ...entries, ...dataChunks]));
}

const png16 = await createSquareIcon(16, path.join(appDir, ".favicon-16.png"));
const png32 = await createSquareIcon(32, path.join(appDir, ".favicon-32.png"));
await createSquareIcon(48, path.join(appDir, "icon.png"));
await createSquareIcon(180, path.join(appDir, "apple-icon.png"));
await createFaviconIco([png16, png32], path.join(appDir, "favicon.ico"));

console.log("Generated favicon.ico, icon.png, and apple-icon.png");
