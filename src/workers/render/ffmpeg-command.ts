// src/workers/render/ffmpeg-command.ts

/**
 * Pure FFmpeg command builder.
 * Returns args arrays without executing — fully testable without FFmpeg installed.
 *
 * Every render operation in the pipeline should go through these builders
 * so the exact command can be inspected, logged, and tested.
 */

export type AspectRatio = '9x16' | '1x1' | '16x9';

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RenderCommandOptions {
  inputPath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
  aspectRatio: AspectRatio;
  crop?: CropRect;
  subtitlePath?: string;
  /** CRF value (0-51, lower = better quality). Default: 23 */
  crf?: number;
  /** Encoding preset. Default: 'medium' */
  preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
  /** Target FPS. Default: 30 */
  fps?: number;
  /** Audio bitrate. Default: '128k' */
  audioBitrate?: string;
}

export interface ExtractedRenderOptions {
  inputPath: string;
  outputPath: string;
  aspectRatio: AspectRatio;
  crop?: CropRect;
  subtitlePath?: string;
  crf?: number;
  preset?: RenderCommandOptions['preset'];
  fps?: number;
  audioBitrate?: string;
}

export interface ExtractClipOptions {
  inputPath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
}

export interface ProbeOptions {
  inputPath: string;
}

export interface ExtractAudioOptions {
  inputPath: string;
  outputPath: string;
  format?: 'wav' | 'mp3';
}

// ============================================================
// DIMENSION CALCULATIONS
// ============================================================

/**
 * Get target pixel dimensions for an aspect ratio.
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

  let cropW: number;
  let cropH: number;

  const sourceAspect = sourceWidth / sourceHeight;
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
// COMMAND BUILDERS
// ============================================================

/**
 * Build FFmpeg args for probing a video file.
 */
export function buildProbeArgs(options: ProbeOptions): string[] {
  return [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_streams',
    '-show_format',
    options.inputPath,
  ];
}

/**
 * Build FFmpeg args for extracting a clip segment without re-encoding (fast copy).
 */
export function buildExtractClipArgs(options: ExtractClipOptions): string[] {
  const duration = options.endTime - options.startTime;
  return [
    '-y',
    '-ss', options.startTime.toFixed(3),
    '-i', options.inputPath,
    '-t', duration.toFixed(3),
    '-c', 'copy',
    '-avoid_negative_ts', 'make_zero',
    options.outputPath,
  ];
}

/**
 * Build the video filter chain for a render operation.
 * Exposed separately for testing and logging.
 */
export function buildVideoFilterChain(options: {
  startTime: number;
  duration: number;
  crop?: CropRect;
  targetWidth: number;
  targetHeight: number;
  subtitlePath?: string;
  /** If true, skip the trim filter (input is already extracted). */
  skipTrim?: boolean;
}): string {
  const filters: string[] = [];

  // 1. Trim (unless pre-extracted)
  if (!options.skipTrim) {
    filters.push(
      `trim=start=${options.startTime.toFixed(3)}:duration=${options.duration.toFixed(3)},setpts=PTS-STARTPTS`,
    );
  }

  // 2. Crop (reframe)
  if (options.crop) {
    filters.push(`crop=${options.crop.w}:${options.crop.h}:${options.crop.x}:${options.crop.y}`);
  }

  // 3. Scale to target dimensions
  filters.push(
    `scale=${options.targetWidth}:${options.targetHeight}:force_original_aspect_ratio=decrease`,
  );

  // 4. Pad to exact dimensions (letterbox/pillarbox if scale didn't match exactly)
  filters.push(
    `pad=${options.targetWidth}:${options.targetHeight}:(ow-iw)/2:(oh-ih)/2:color=black`,
  );

  // 5. Subtitle overlay
  if (options.subtitlePath) {
    filters.push(`ass=${escapeFfmpegPath(options.subtitlePath)}`);
  }

  return filters.join(',');
}

/**
 * Build the audio filter chain for a render operation.
 */
export function buildAudioFilterChain(options: {
  startTime: number;
  duration: number;
  skipTrim?: boolean;
}): string | null {
  if (options.skipTrim) return null;
  return `atrim=start=${options.startTime.toFixed(3)}:duration=${options.duration.toFixed(3)},asetpts=PTS-STARTPTS`;
}

/**
 * Build full FFmpeg args for rendering a clip with crop, scale, and optional captions.
 * This is the main render command — produces the final output MP4.
 */
export function buildRenderArgs(options: RenderCommandOptions): string[] {
  const target = getTargetDimensions(options.aspectRatio);
  const duration = options.endTime - options.startTime;
  const crf = options.crf ?? 23;
  const preset = options.preset ?? 'medium';
  const fps = options.fps ?? 30;
  const audioBitrate = options.audioBitrate ?? '128k';

  const videoFilter = buildVideoFilterChain({
    startTime: options.startTime,
    duration,
    crop: options.crop,
    targetWidth: target.width,
    targetHeight: target.height,
    subtitlePath: options.subtitlePath,
  });

  const audioFilter = buildAudioFilterChain({
    startTime: options.startTime,
    duration,
  });

  const args = [
    '-y',
    '-i', options.inputPath,
    '-vf', videoFilter,
  ];

  if (audioFilter) {
    args.push('-af', audioFilter);
  }

  args.push(
    '-c:v', 'libx264',
    '-preset', preset,
    '-crf', String(crf),
    '-c:a', 'aac',
    '-b:a', audioBitrate,
    '-movflags', '+faststart',
    '-r', String(fps),
    options.outputPath,
  );

  return args;
}

/**
 * Build FFmpeg args for rendering from a pre-extracted clip (already trimmed).
 * Faster because it skips trim/atrim filters.
 */
export function buildRenderFromExtractedArgs(options: ExtractedRenderOptions): string[] {
  const target = getTargetDimensions(options.aspectRatio);
  const crf = options.crf ?? 23;
  const preset = options.preset ?? 'medium';
  const fps = options.fps ?? 30;
  const audioBitrate = options.audioBitrate ?? '128k';

  const videoFilter = buildVideoFilterChain({
    startTime: 0,
    duration: 0,
    crop: options.crop,
    targetWidth: target.width,
    targetHeight: target.height,
    subtitlePath: options.subtitlePath,
    skipTrim: true,
  });

  return [
    '-y',
    '-i', options.inputPath,
    '-vf', videoFilter,
    '-c:v', 'libx264',
    '-preset', preset,
    '-crf', String(crf),
    '-c:a', 'aac',
    '-b:a', audioBitrate,
    '-movflags', '+faststart',
    '-r', String(fps),
    options.outputPath,
  ];
}

/**
 * Build FFmpeg args for extracting audio from a video file.
 */
export function buildExtractAudioArgs(options: ExtractAudioOptions): string[] {
  const format = options.format ?? 'wav';
  const codecArgs = format === 'wav'
    ? ['-c:a', 'pcm_s16le', '-ar', '16000', '-ac', '1']
    : ['-c:a', 'libmp3lame', '-b:a', '128k'];

  return [
    '-y',
    '-i', options.inputPath,
    '-vn',
    ...codecArgs,
    options.outputPath,
  ];
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Escape file path for use inside FFmpeg filter strings.
 * FFmpeg filter syntax requires escaping colons, backslashes, and single quotes.
 */
export function escapeFfmpegPath(filePath: string): string {
  return filePath
    .replace(/\\/g, '/')
    .replace(/:/g, '\\:')
    .replace(/'/g, "'\\''");
}
