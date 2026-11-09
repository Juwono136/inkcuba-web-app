import "server-only";

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import sharp from "sharp";

import { ValidationError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { deleteObject, uploadObject } from "@/lib/storage/client";
import {
  PROJECT_DOCUMENT_MAX_BYTES,
  PROJECT_IMAGE_MAX_BYTES,
  PROJECT_IMAGE_MAX_EDGE,
  PROJECT_VIDEO_MAX_BYTES,
  PROJECT_VIDEO_MAX_SECONDS,
} from "@/lib/projects/limits";

const RASTER = new Set(["image/jpeg", "image/png", "image/webp", "image/tiff"]);

export function projectProxyUrl(key: string): string {
  return `/api/media/${key.replace(/^\//, "")}`;
}

export async function deleteProjectObject(key: string | null | undefined): Promise<void> {
  if (!key || !key.startsWith("projects/")) return;
  try {
    await deleteObject(key);
  } catch (error) {
    logger.warn({ err: error, key }, "Project object delete failed");
  }
}

export async function storeProjectImage(input: {
  portfolioId: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}): Promise<{ key: string; url: string; mimeType: string; size: number }> {
  if (input.buffer.byteLength > PROJECT_IMAGE_MAX_BYTES) {
    throw new ValidationError("Each image must be under 12MB");
  }
  if (!RASTER.has(input.mimeType) && input.mimeType !== "image/jpg") {
    throw new ValidationError("Overview images must be JPG, PNG, WebP, or TIFF");
  }
  assertRasterMagic(input.buffer, input.mimeType);
  const compressed = await compressRaster(input.buffer);
  const key = `projects/${input.portfolioId}/overview/${Date.now()}-${randomUUID()}.jpg`;
  await uploadObject(key, compressed, "image/jpeg");
  return {
    key,
    url: projectProxyUrl(key),
    mimeType: "image/jpeg",
    size: compressed.byteLength,
  };
}

export async function storeProjectVideo(input: {
  portfolioId: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}): Promise<{ key: string; url: string; mimeType: string; size: number; durationSeconds: number }> {
  if (input.buffer.byteLength > PROJECT_VIDEO_MAX_BYTES) {
    throw new ValidationError("Video must be under 100MB");
  }
  const allowed = new Set(["video/mp4", "video/webm", "video/quicktime"]);
  if (!allowed.has(input.mimeType)) {
    throw new ValidationError("Video must be MP4, WebM, or MOV");
  }
  const dir = await mkdtemp(path.join(tmpdir(), "inkcuba-video-"));
  const source = path.join(dir, "source");
  const output = path.join(dir, "out.mp4");
  try {
    await writeFile(source, input.buffer);
    const duration = await probeDuration(source);
    if (duration > PROJECT_VIDEO_MAX_SECONDS) {
      throw new ValidationError("Video must be 3 minutes or shorter");
    }
    await transcode(source, output);
    const compressed = await readFile(output);
    const key = `projects/${input.portfolioId}/video/${Date.now()}-${randomUUID()}.mp4`;
    await uploadObject(key, compressed, "video/mp4");
    return {
      key,
      url: projectProxyUrl(key),
      mimeType: "video/mp4",
      size: compressed.byteLength,
      durationSeconds: Math.round(duration),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function storeProjectDocument(input: {
  portfolioId: string;
  role: "PROJECT" | "ADDITIONAL";
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}): Promise<{ key: string; url: string; mimeType: string; size: number; fileName: string }> {
  if (input.buffer.byteLength > PROJECT_DOCUMENT_MAX_BYTES) {
    throw new ValidationError("Each document must be under 20MB");
  }
  const ext = extensionOf(input.fileName);
  const kind = classifyDocument(ext, input.mimeType, input.buffer);
  const folder = input.role === "PROJECT" ? "docs" : "additional";
  if (kind === "raster") {
    const compressed = await compressRaster(input.buffer);
    const key = `projects/${input.portfolioId}/${folder}/${Date.now()}-${randomUUID()}.jpg`;
    await uploadObject(key, compressed, "image/jpeg");
    return {
      key,
      url: projectProxyUrl(key),
      mimeType: "image/jpeg",
      size: compressed.byteLength,
      fileName: safeName(input.fileName, "jpg"),
    };
  }
  if (kind === "svg") {
    const text = input.buffer.toString("utf8");
    if (!/<svg[\s>]/i.test(text) || /<script|javascript:|on\w+\s*=/i.test(text)) {
      throw new ValidationError("SVG must not contain scripts or event handlers");
    }
    const key = `projects/${input.portfolioId}/${folder}/${Date.now()}-${randomUUID()}.svg`;
    await uploadObject(key, Buffer.from(text, "utf8"), "image/svg+xml");
    return {
      key,
      url: projectProxyUrl(key),
      mimeType: "image/svg+xml",
      size: Buffer.byteLength(text),
      fileName: safeName(input.fileName, "svg"),
    };
  }
  const mime = kind === "pdf" ? "application/pdf" : "application/octet-stream";
  const key = `projects/${input.portfolioId}/${folder}/${Date.now()}-${randomUUID()}.${ext}`;
  await uploadObject(key, input.buffer, mime);
  return {
    key,
    url: projectProxyUrl(key),
    mimeType: mime,
    size: input.buffer.byteLength,
    fileName: safeName(input.fileName, ext),
  };
}

async function compressRaster(buffer: Buffer): Promise<Buffer> {
  const image = sharp(buffer, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const pipeline =
    width > PROJECT_IMAGE_MAX_EDGE || height > PROJECT_IMAGE_MAX_EDGE
      ? image.resize({
          width: PROJECT_IMAGE_MAX_EDGE,
          height: PROJECT_IMAGE_MAX_EDGE,
          fit: "inside",
          withoutEnlargement: true,
        })
      : image;
  return pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}

function assertRasterMagic(buffer: Buffer, mimeType: string) {
  if (buffer.length < 12) throw new ValidationError("The uploaded file is not a valid image");
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const png = buffer[0] === 0x89 && buffer.toString("ascii", 1, 4) === "PNG";
  const webp =
    buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  const tiff =
    buffer.toString("ascii", 0, 2) === "II" || buffer.toString("ascii", 0, 2) === "MM";
  const ok =
    (mimeType === "image/jpeg" && jpeg) ||
    (mimeType === "image/png" && png) ||
    (mimeType === "image/webp" && webp) ||
    (mimeType === "image/tiff" && tiff) ||
    (mimeType === "image/jpg" && jpeg);
  if (!ok) throw new ValidationError("The uploaded file is not a valid image");
}

function extensionOf(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const allowed = new Set([
    "pdf",
    "jpg",
    "jpeg",
    "png",
    "eps",
    "psd",
    "tif",
    "tiff",
    "webp",
    "svg",
    "cdr",
  ]);
  if (!allowed.has(ext)) {
    throw new ValidationError(
      "Documents must be PDF, JPG, PNG, EPS, PSD, TIFF, WebP, SVG, or CDR",
    );
  }
  return ext === "jpeg" ? "jpg" : ext === "tif" ? "tiff" : ext;
}

function classifyDocument(
  ext: string,
  mimeType: string,
  buffer: Buffer,
): "raster" | "svg" | "pdf" | "binary" {
  const head = buffer.subarray(0, 16).toString("utf8");
  if (head.trimStart().startsWith("<") && ext !== "svg") {
    throw new ValidationError("This file looks like a web page, not a document");
  }
  if (ext === "svg") return "svg";
  if (ext === "pdf") {
    if (!buffer.subarray(0, 5).toString("ascii").startsWith("%PDF")) {
      throw new ValidationError("The PDF file is not valid");
    }
    return "pdf";
  }
  if (ext === "jpg" || ext === "png" || ext === "webp" || ext === "tiff") {
    const mime =
      ext === "jpg"
        ? "image/jpeg"
        : ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : "image/tiff";
    assertRasterMagic(buffer, mimeType === "application/octet-stream" ? mime : mime);
    return "raster";
  }
  if (ext === "eps" && !buffer.subarray(0, 4).toString("ascii").startsWith("%!PS") && !buffer.subarray(0, 8).toString("ascii").includes("%!")) {
    throw new ValidationError("The EPS file is not valid");
  }
  if (ext === "psd" && buffer.subarray(0, 4).toString("ascii") !== "8BPS") {
    throw new ValidationError("The PSD file is not valid");
  }
  return "binary";
}

function safeName(fileName: string, ext: string): string {
  const base = fileName.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") ?? "document";
  const cleaned = base.replace(/[^\w.\- ]+/g, "").slice(0, 80) || "document";
  return `${cleaned}.${ext}`;
}

function run(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        reject(new ValidationError("Video processing is unavailable. Install ffmpeg on the server."));
        return;
      }
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `${command} failed`));
    });
  });
}

async function probeDuration(file: string): Promise<number> {
  try {
    const output = await run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      file,
    ]);
    const duration = Number(output.trim());
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new ValidationError("Unable to read the video length");
    }
    return duration;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError("Video processing is unavailable. Install ffmpeg on the server.");
  }
}

async function transcode(source: string, output: string): Promise<void> {
  try {
    await run("ffmpeg", [
      "-y",
      "-i",
      source,
      "-c:v",
      "libx264",
      "-crf",
      "20",
      "-preset",
      "medium",
      "-pix_fmt",
      "yuv420p",
      "-vf",
      "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      "-movflags",
      "+faststart",
      output,
    ]);
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logger.error({ err: error }, "Project video transcode failed");
    throw new ValidationError("Unable to process this video. Use MP4, WebM, or MOV.");
  }
}
