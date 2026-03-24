import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface BinaryCheck {
  available: boolean;
  version?: string;
  error?: string;
}

const cache = new Map<string, BinaryCheck>();

/**
 * Check if a binary is available on the system PATH.
 * Results are cached for the lifetime of the process.
 */
export async function checkBinary(name: string, versionFlag = "--version"): Promise<BinaryCheck> {
  if (cache.has(name)) return cache.get(name)!;

  try {
    const { stdout } = await execAsync(`${name} ${versionFlag}`, { timeout: 10_000 });
    const version = stdout.trim().split("\n")[0];
    const result: BinaryCheck = { available: true, version };
    cache.set(name, result);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isNotFound = message.includes("ENOENT") || message.includes("not found") || message.includes("not recognized");
    const result: BinaryCheck = {
      available: false,
      error: isNotFound
        ? `${name} is not installed or not in PATH. Install it to enable this feature.`
        : `${name} check failed: ${message.slice(0, 200)}`,
    };
    cache.set(name, result);
    return result;
  }
}

/**
 * Error thrown when a required binary is not installed.
 * Caught by workers as a permanent (non-retryable) failure.
 */
export class BinaryNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BinaryNotFoundError";
  }
}

/**
 * Require a binary or throw a BinaryNotFoundError (permanent, non-retryable).
 */
export async function requireBinary(name: string, context: string): Promise<void> {
  const check = await checkBinary(name);
  if (!check.available) {
    throw new BinaryNotFoundError(
      `[${context}] ${check.error}\n\n` +
      installHint(name),
    );
  }
}

function installHint(name: string): string {
  switch (name) {
    case "yt-dlp":
      return "Install: pip install yt-dlp  (or: brew install yt-dlp / winget install yt-dlp)";
    case "ffmpeg":
      return "Install: https://ffmpeg.org/download.html  (or: brew install ffmpeg / winget install ffmpeg)";
    case "ffprobe":
      return "Install ffmpeg (ffprobe is included): https://ffmpeg.org/download.html";
    default:
      return `Install ${name} and ensure it is on your system PATH.`;
  }
}
