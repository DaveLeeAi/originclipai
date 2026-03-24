// src/workers/render/ffmpeg.ts

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileAsync = promisify(execFile);

export type AspectRatio = '9x16' | '1x1' | '16x9';

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RenderOptions {
  inputPath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
  aspectRatio: AspectRatio;
  crop?: CropRect;
  subtitlePath?: string; // ASS subtitle file for caption overlay
  maxHeight?: number; // Default: 1920 for 9:16, 1080 for others
}

interface ProbeResult {
  width: number;
  height: number;
  duration: number;
  fps: number;
  codec: string;
}

// ============================================================
// PROBE
// ============================================================

/**
 * Get video file metadata using FFprobe.
 */
export async function probeVideo(inputPath: string): Promise<ProbeResult> {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_streams',
    '-show_format',
    inputPath,
  ]);

  const data = JSON.parse(stdout);
  const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');

  if (!videoStream) {
    throw new Error('No video stream found in file');
  }

  const [fpsNum, fpsDen] = (videoStream.r_frame_rate || '30/1').split('/');
  const fps = parseInt(fpsNum) / (parseInt(fpsDen) || 1);

  return {
    width: parseInt(videoStream.width),
    height: parseInt(videoStream.height),
    duration: parseFloat(data.format?.duration || videoStream.duration || '0'),
    fps: Math.round(fps),
    codec: videoStream.codec_name,
  };
}

// ============================================================
// EXTRACT CLIP
// ============================================================

/**
 * Extract a segment from source video without re-encoding (fast).
 * Used as the first step before reframing.
 */
export async function extractClip(
  inputPath: string,
  outputPath: string,
  startTime: number,
  endTime: number,
): Promise<void> {
  const duration = endTime - startTime;

  await execFileAsync('ffmpeg', [
    '-y',
    '-ss', startTime.toFixed(3),
    '-i', inputPath,
    '-t', duration.toFixed(3),
    '-c', 'copy',
    '-avoid_negative_ts', 'make_zero',
    outputPath,
  ]);
}

// ============================================================
// ASPECT RATIO DIMENSIONS
// ============================================================

/**
 * Get target dimensions for an aspect ratio.
 * All targets are 1080p equivalent.
 */
export function getTargetDimensions(aspectRatio: AspectRatio): { width: number; height: number } {
  switch (aspectRatio) {
    case '9x16': return { width: 1080, height: 1920 };
    case '1x1':  return { width: 1080, height: 1080 };
    case '16x9': return { width: 1920, height: 1080 };
  }
}

/**
 * Calculate crop rectangle to achieve target aspect ratio.
 * Centers on the provided face position, or centers the frame if no face.
 */
export function calculateCropRect(
  sourceWidth: number,
  sourceHeight: number,
  aspectRatio: AspectRatio,
  faceCenterX?: number,
  faceCenterY?: number,
): CropRect {
  const target = getTargetDimensions(aspectRatio);
  const targetAspect = target.width / target.height;
  const sourceAspect = sourceWidth / sourceHeight;

  let cropW: number;
  let cropH: number;

  if (sourceAspect > targetAspect) {
    // Source is wider than target — crop width
    cropH = sourceHeight;
    cropW = Math.round(sourceHeight * targetAspect);
  } else {
    // Source is taller than target — crop height
    cropW = sourceWidth;
    cropH = Math.round(sourceWidth / targetAspect);
  }

  // Ensure crop dimensions are even (FFmpeg requirement)
  cropW = cropW - (cropW % 2);
  cropH = cropH - (cropH % 2);

  // Center on face if available, otherwise center of frame
  const centerX = faceCenterX ?? sourceWidth / 2;
  const centerY = faceCenterY ?? sourceHeight / 2;

  let x = Math.round(centerX - cropW / 2);
  let y = Math.round(centerY - cropH / 2);

  // Clamp to frame boundaries
  x = Math.max(0, Math.min(x, sourceWidth - cropW));
  y = Math.max(0, Math.min(y, sourceHeight - cropH));

  return { x, y, w: cropW, h: cropH };
}

// ============================================================
// RENDER WITH REFRAME + CAPTIONS
// ============================================================

/**
 * Render a clip with crop (reframe), scale, and optional caption overlay.
 * This is the main render function — produces the final output.
 */
export async function renderClip(options: RenderOptions): Promise<void> {
  const {
    inputPath,
    outputPath,
    startTime,
    endTime,
    aspectRatio,
    crop,
    subtitlePath,
  } = options;

  const target = getTargetDimensions(aspectRatio);
  const duration = endTime - startTime;

  // Build filter chain
  const filters: string[] = [];

  // 1. Trim (if not already extracted)
  // Using -ss and -t is faster, but filter-based trim is more precise
  filters.push(`trim=start=${startTime.toFixed(3)}:duration=${duration.toFixed(3)},setpts=PTS-STARTPTS`);

  // 2. Crop (reframe)
  if (crop) {
    filters.push(`crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`);
  }

  // 3. Scale to target dimensions
  filters.push(`scale=${target.width}:${target.height}:force_original_aspect_ratio=decrease`);

  // 4. Pad to exact dimensions (if scale didn't match exactly)
  filters.push(`pad=${target.width}:${target.height}:(ow-iw)/2:(oh-ih)/2:color=black`);

  // 5. Subtitle overlay (if captions provided)
  if (subtitlePath) {
    // ASS subtitles are rendered via the ass filter
    // The subtitle file must use absolute positioning that accounts for the target resolution
    filters.push(`ass=${escapeFfmpegPath(subtitlePath)}`);
  }

  const videoFilter = filters.join(',');

  const args = [
    '-y',
    '-i', inputPath,
    '-vf', videoFilter,
    '-af', `atrim=start=${startTime.toFixed(3)}:duration=${duration.toFixed(3)},asetpts=PTS-STARTPTS`,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-r', '30', // Normalize to 30fps
    outputPath,
  ];

  await execFileAsync('ffmpeg', args, { timeout: 600_000 }); // 10 min timeout
}

/**
 * Render from a pre-extracted clip (already trimmed).
 * Faster because it skips the trim filter.
 */
export async function renderFromExtracted(
  inputPath: string,
  outputPath: string,
  aspectRatio: AspectRatio,
  crop?: CropRect,
  subtitlePath?: string,
): Promise<void> {
  const target = getTargetDimensions(aspectRatio);
  const filters: string[] = [];

  if (crop) {
    filters.push(`crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`);
  }

  filters.push(`scale=${target.width}:${target.height}:force_original_aspect_ratio=decrease`);
  filters.push(`pad=${target.width}:${target.height}:(ow-iw)/2:(oh-ih)/2:color=black`);

  if (subtitlePath) {
    filters.push(`ass=${escapeFfmpegPath(subtitlePath)}`);
  }

  const args = [
    '-y',
    '-i', inputPath,
    '-vf', filters.join(','),
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-r', '30',
    outputPath,
  ];

  await execFileAsync('ffmpeg', args, { timeout: 600_000 });
}

// ============================================================
// EXTRACT AUDIO
// ============================================================

/**
 * Extract audio track from video for transcription.
 */
export async function extractAudio(
  inputPath: string,
  outputPath: string,
  format: 'wav' | 'mp3' = 'wav',
): Promise<void> {
  const codecArgs = format === 'wav'
    ? ['-c:a', 'pcm_s16le', '-ar', '16000', '-ac', '1'] // 16kHz mono WAV for Whisper
    : ['-c:a', 'libmp3lame', '-b:a', '128k'];

  await execFileAsync('ffmpeg', [
    '-y',
    '-i', inputPath,
    '-vn', // No video
    ...codecArgs,
    outputPath,
  ]);
}

// ============================================================
// VALIDATION
// ============================================================

/**
 * Validate rendered output matches expected dimensions and duration.
 */
export async function validateOutput(
  outputPath: string,
  expectedAspectRatio: AspectRatio,
  expectedDurationSec: number,
  toleranceSec: number = 1.5,
): Promise<{ valid: boolean; errors: string[] }> {
  const probe = await probeVideo(outputPath);
  const target = getTargetDimensions(expectedAspectRatio);
  const errors: string[] = [];

  if (probe.width !== target.width || probe.height !== target.height) {
    errors.push(`Dimensions mismatch: got ${probe.width}x${probe.height}, expected ${target.width}x${target.height}`);
  }

  if (Math.abs(probe.duration - expectedDurationSec) > toleranceSec) {
    errors.push(`Duration mismatch: got ${probe.duration.toFixed(1)}s, expected ${expectedDurationSec.toFixed(1)}s (±${toleranceSec}s)`);
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Escape file path for use inside FFmpeg filter strings.
 * FFmpeg filter syntax requires escaping colons, backslashes, and single quotes.
 */
function escapeFfmpegPath(filePath: string): string {
  return filePath
    .replace(/\\/g, '/')
    .replace(/:/g, '\\:')
    .replace(/'/g, "'\\''");
}
