// src/workers/render/face-detect-ffmpeg.ts

/**
 * FFmpeg-based face detection provider.
 *
 * Uses FFmpeg to extract keyframes, then runs a simple brightness/motion
 * heuristic to estimate the primary speaker position. This is a lightweight
 * v1 approach that avoids Python/MediaPipe dependencies.
 *
 * Strategy:
 * 1. Extract keyframes at regular intervals
 * 2. Run FFmpeg cropdetect to find the "interesting" region per frame
 * 3. Map crop regions to estimated face center positions
 * 4. Fall back to center crop when detection confidence is low
 *
 * This can be swapped for MediaPipe or YOLO-face later via the
 * FaceDetectionProvider interface.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import type { FaceDetectionProvider, FaceBox, KeyframeFaces } from "./face-detect";
import { probeVideo } from "./ffmpeg";

const execFileAsync = promisify(execFile);

/**
 * FFmpeg cropdetect-based face detection.
 *
 * Uses cropdetect filter to identify the non-black/non-uniform region of each
 * keyframe. For talking-head and interview content, this region typically
 * corresponds to the speaker position. Not as accurate as ML-based detection
 * but zero external dependencies beyond FFmpeg.
 */
export class FFmpegFaceDetectionProvider implements FaceDetectionProvider {
  async detectFaces(
    videoPath: string,
    sampleIntervalSec: number = 0.5,
  ): Promise<KeyframeFaces[]> {
    const probe = await probeVideo(videoPath);
    const { width, height, duration } = probe;

    if (duration <= 0 || width <= 0 || height <= 0) {
      return generateCenterKeyframes(duration, sampleIntervalSec);
    }

    const tempDir = path.join(os.tmpdir(), `face-detect-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      const keyframes = await detectWithCropdetect(
        videoPath,
        tempDir,
        width,
        height,
        duration,
        sampleIntervalSec,
      );
      return keyframes;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

/**
 * Run cropdetect on sampled frames and convert to face boxes.
 */
async function detectWithCropdetect(
  videoPath: string,
  tempDir: string,
  sourceWidth: number,
  sourceHeight: number,
  duration: number,
  intervalSec: number,
): Promise<KeyframeFaces[]> {
  const keyframes: KeyframeFaces[] = [];
  const sampleTimes: number[] = [];

  for (let t = 0; t < duration; t += intervalSec) {
    sampleTimes.push(t);
  }

  // Process in batches to avoid overwhelming FFmpeg
  const batchSize = 20;
  for (let i = 0; i < sampleTimes.length; i += batchSize) {
    const batch = sampleTimes.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((t) =>
        detectAtTime(videoPath, tempDir, t, sourceWidth, sourceHeight),
      ),
    );
    keyframes.push(...batchResults);
  }

  return keyframes;
}

/**
 * Detect the "interesting" region at a specific timestamp using cropdetect.
 */
async function detectAtTime(
  videoPath: string,
  tempDir: string,
  time: number,
  sourceWidth: number,
  sourceHeight: number,
): Promise<KeyframeFaces> {
  try {
    // Use cropdetect to find the non-uniform region
    // cropdetect outputs lines like: [Parsed_cropdetect_0 ...] x1:A x2:B y1:C y2:D w:W h:H x:X y:Y
    const { stderr } = await execFileAsync(
      "ffmpeg",
      [
        "-ss", time.toFixed(3),
        "-i", videoPath,
        "-frames:v", "1",
        "-vf", "cropdetect=24:16:0",
        "-f", "null",
        "-",
      ],
      { timeout: 10_000 },
    );

    const cropMatch = stderr.match(
      /crop=(\d+):(\d+):(\d+):(\d+)/,
    );

    if (cropMatch) {
      const cropW = parseInt(cropMatch[1]);
      const cropH = parseInt(cropMatch[2]);
      const cropX = parseInt(cropMatch[3]);
      const cropY = parseInt(cropMatch[4]);

      // Convert crop region to a face box (normalized 0-1)
      const cx = (cropX + cropW / 2) / sourceWidth;
      const cy = (cropY + cropH / 2) / sourceHeight;
      const w = cropW / sourceWidth;
      const h = cropH / sourceHeight;

      // Only treat as a face detection if the crop region is smaller than
      // 90% of the frame (otherwise cropdetect found the whole frame)
      const areaRatio = (cropW * cropH) / (sourceWidth * sourceHeight);
      if (areaRatio < 0.9 && areaRatio > 0.01) {
        const faceBox: FaceBox = {
          cx,
          cy,
          w,
          h,
          confidence: Math.max(0.3, 1 - areaRatio), // Smaller region = higher confidence
        };

        return {
          time,
          faces: [faceBox],
          primary: faceBox,
        };
      }
    }

    // No meaningful crop detected — return empty
    return { time, faces: [], primary: null };
  } catch {
    // FFmpeg failed for this frame — return empty
    return { time, faces: [], primary: null };
  }
}

/**
 * Generate center-positioned keyframes when no detection is possible.
 */
function generateCenterKeyframes(
  duration: number,
  intervalSec: number,
): KeyframeFaces[] {
  const keyframes: KeyframeFaces[] = [];
  for (let t = 0; t < Math.max(duration, 0.1); t += intervalSec) {
    keyframes.push({ time: t, faces: [], primary: null });
  }
  return keyframes;
}

let providerInstance: FFmpegFaceDetectionProvider | null = null;

export function getFFmpegFaceDetectionProvider(): FaceDetectionProvider {
  if (!providerInstance) {
    providerInstance = new FFmpegFaceDetectionProvider();
  }
  return providerInstance;
}
