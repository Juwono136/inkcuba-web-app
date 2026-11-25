import "server-only";

import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { ValidationError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";

export type VideoBinaryKind = "ffmpeg" | "ffprobe";

const UNAVAILABLE =
  "Video processing is unavailable. Bundled ffmpeg tools are missing — run npm install, or set FFMPEG_PATH / FFPROBE_PATH.";

/**
 * Resolve npm-bundled binaries via absolute paths under process.cwd().
 * Avoid createRequire / package imports: Next webpack RSC can break them
 * ("req is not a function") even when listed in serverExternalPackages.
 */
function bundledBinaryCandidates(kind: VideoBinaryKind): string[] {
  const root = process.cwd();
  const platform = process.env.npm_config_platform || os.platform();
  const arch = process.env.npm_config_arch || os.arch();
  const win = platform === "win32";

  if (kind === "ffmpeg") {
    const name = win ? "ffmpeg.exe" : "ffmpeg";
    return [
      path.join(root, "node_modules", "ffmpeg-static", name),
      // pnpm / nested layouts
      path.join(root, "node_modules", "ffmpeg-static", "bin", name),
    ];
  }

  const name = win ? "ffprobe.exe" : "ffprobe";
  return [
    path.join(root, "node_modules", "ffprobe-static", "bin", platform, arch, name),
    path.join(root, "node_modules", "ffprobe-static", name),
  ];
}

async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Prefer env override, then npm-bundled static binaries on disk, then a verified PATH binary.
 * Never return a bare command name without proving it can be spawned.
 */
export async function resolveVideoBinary(kind: VideoBinaryKind): Promise<string> {
  const envName = kind === "ffmpeg" ? "FFMPEG_PATH" : "FFPROBE_PATH";
  const altEnv = kind === "ffmpeg" ? process.env.FFMPEG_BIN?.trim() : undefined;
  const candidates = [
    process.env[envName]?.trim(),
    altEnv,
    ...bundledBinaryCandidates(kind),
  ].filter((value): value is string => Boolean(value));

  const tried: string[] = [];
  for (const candidate of candidates) {
    tried.push(candidate);
    if (await isExecutable(candidate)) return candidate;
  }

  if (await canSpawnOnPath(kind)) return kind;

  logger.error({ kind, tried }, "No usable video binary found");
  throw new ValidationError(UNAVAILABLE);
}

function canSpawnOnPath(kind: VideoBinaryKind): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(kind, ["-version"], { windowsHide: true, stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

export function runVideoCommand(command: string, args: string[]): Promise<string> {
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
        reject(new ValidationError(UNAVAILABLE));
        return;
      }
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
    });
  });
}

export async function probeVideoDurationSeconds(filePath: string): Promise<number> {
  try {
    const ffprobe = await resolveVideoBinary("ffprobe");
    const output = await runVideoCommand(ffprobe, [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    const duration = Number(output.trim());
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new ValidationError("Unable to read the video length");
    }
    return duration;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logger.error({ err: error }, "ffprobe failed while reading video duration");
    throw new ValidationError(UNAVAILABLE);
  }
}

export async function transcodeProjectVideo(source: string, output: string): Promise<void> {
  try {
    const ffmpeg = await resolveVideoBinary("ffmpeg");
    await runVideoCommand(ffmpeg, [
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
