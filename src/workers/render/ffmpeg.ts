// src/workers/render/ffmpeg.ts

/**
 * FFmpeg execution layer.
 * Delegates command construction to ffmpeg-command.ts, then executes.
 * This module owns the child_process calls; ffmpeg-command.ts is pure and testable.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import {
  buildProbeArgs,
  buildExtractClipArgs,
  buildRenderArgs,
  buildRenderFromExtractedArgs,
  buildExtractAudioArgs,
  type CropRect,
  type RenderCommandOptions,
} from './ffmpeg-command';

// Re-export types and pure functions from the command builder
// so existing imports from this module continue to work.
export {
  type AspectRatio,
  type CropRect,
  getTargetDimensions,
  calculateCropRect,
  escapeFfmpegPath,
} from './ffmpeg-command';

const execFileAsync = promisify(execFile);

interface RenderOptions {
  inputPath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
  aspectRatio: RenderCommandOptions['aspectRatio'];
  crop?: CropRect;
  subtitlePath?: string;
  maxHeight?: number;
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
  const args = buildProbeArgs({ inputPath });
  const { stdout } = await execFileAsync('ffprobe', args);

  const data = JSON.parse(stdout);
  const videoStream = data.streams?.find((s: Record<string, unknown>) => s.codec_type === 'video');

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
  const args = buildExtractClipArgs({ inputPath, outputPath, startTime, endTime });
  await execFileAsync('ffmpeg', args);
}

// ============================================================
// RENDER WITH REFRAME + CAPTIONS
// ============================================================

/**
 * Render a clip with crop (reframe), scale, and optional caption overlay.
 * This is the main render function — produces the final output.
 */
export async function renderClip(options: RenderOptions): Promise<void> {
  const args = buildRenderArgs({
    inputPath: options.inputPath,
    outputPath: options.outputPath,
    startTime: options.startTime,
    endTime: options.endTime,
    aspectRatio: options.aspectRatio,
    crop: options.crop,
    subtitlePath: options.subtitlePath,
  });

  await execFileAsync('ffmpeg', args, { timeout: 600_000 });
}

/**
 * Render from a pre-extracted clip (already trimmed).
 * Faster because it skips the trim filter.
 */
export async function renderFromExtracted(
  inputPath: string,
  outputPath: string,
  aspectRatio: RenderCommandOptions['aspectRatio'],
  crop?: CropRect,
  subtitlePath?: string,
): Promise<void> {
  const args = buildRenderFromExtractedArgs({
    inputPath,
    outputPath,
    aspectRatio,
    crop,
    subtitlePath,
  });

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
  const args = buildExtractAudioArgs({ inputPath, outputPath, format });
  await execFileAsync('ffmpeg', args);
}

// ============================================================
// VALIDATION
// ============================================================

/**
 * Validate rendered output matches expected dimensions and duration.
 */
export async function validateOutput(
  outputPath: string,
  expectedAspectRatio: RenderCommandOptions['aspectRatio'],
  expectedDurationSec: number,
  toleranceSec: number = 1.5,
): Promise<{ valid: boolean; errors: string[] }> {
  const { getTargetDimensions } = await import('./ffmpeg-command');
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
