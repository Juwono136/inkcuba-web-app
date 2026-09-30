import { writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "public/images/inkcuba-logo.png");
const appDir = path.join(root, "src/app");

/**
 * Generate App Router icon assets (PNG only).
 * We intentionally skip favicon.ico — PNG-in-ICO confuses libvips on Windows
 * (GLib VipsInterpretation "space"=32 noise during `next dev`).
 * Next.js serves `app/icon.png` as the favicon automatically.
 */
async function createSquareIcon(size, outputPath) {
  const buffer = await sharp(source, { failOn: "none" })
    .rotate()
    .ensureAlpha()
    .toColorspace("srgb")
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();

  await writeFile(outputPath, buffer);
  return buffer;
}

await createSquareIcon(48, path.join(appDir, "icon.png"));
await createSquareIcon(180, path.join(appDir, "apple-icon.png"));

console.log("Generated icon.png and apple-icon.png (sRGB). favicon.ico omitted by design.");
