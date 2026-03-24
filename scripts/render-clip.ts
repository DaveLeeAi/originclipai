#!/usr/bin/env tsx
// scripts/render-clip.ts

/**
 * Standalone CLI to render a single clip from a local video file.
 * Bypasses DB, storage, and queue — useful for testing the render pipeline locally.
 *
 * Usage:
 *   npx tsx scripts/render-clip.ts --input video.mp4 --start 10 --end 40 --aspect 9x16
 *   npx tsx scripts/render-clip.ts --input video.mp4 --start 0 --end 30 --aspect 1x1 --captions karaoke --output out.mp4
 *
 * Options:
 *   --input     Source video file path (required)
 *   --output    Output file path (default: rendered-{aspect}.mp4 in cwd)
 *   --start     Clip start time in seconds (default: 0)
 *   --end       Clip end time in seconds (default: 30)
 *   --aspect    Aspect ratio: 9x16, 1x1, 16x9 (default: 9x16)
 *   --captions  Caption style: karaoke, boxed, minimal, impact, subtitle, none (default: none)
 *   --words     Path to a JSON file with word timestamps for captions
 *   --face-x    Face center X as fraction 0-1 (default: auto-detect or 0.5)
 *   --face-y    Face center Y as fraction 0-1 (default: auto-detect or 0.5)
 *   --no-face   Skip face detection, use center crop
 *   --crf       CRF quality value 0-51 (default: 23)
 *   --preset    Encoding speed preset (default: medium)
 *   --dry-run   Print the FFmpeg command without executing
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
  type AspectRatio,
  getTargetDimensions,
  calculateCropRect,
  buildRenderArgs,
  buildRenderFromExtractedArgs,
  buildExtractClipArgs,
  buildProbeArgs,
  type RenderCommandOptions,
} from '../src/workers/render/ffmpeg-command';
import {
  generateAssFile,
  generateSimpleAssFile,
  CAPTION_STYLES,
  type WordTimestamp,
} from '../src/workers/render/captions';

const execFileAsync = promisify(execFile);

// ─── Argument Parsing ────────────────────────────────────────────────

interface CliArgs {
  input: string;
  output: string;
  start: number;
  end: number;
  aspect: AspectRatio;
  captions: string;
  wordsFile?: string;
  faceX?: number;
  faceY?: number;
  noFace: boolean;
  crf: number;
  preset: RenderCommandOptions['preset'];
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  const parsed: Partial<CliArgs> = { noFace: false, dryRun: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--input':    parsed.input = next; i++; break;
      case '--output':   parsed.output = next; i++; break;
      case '--start':    parsed.start = parseFloat(next); i++; break;
      case '--end':      parsed.end = parseFloat(next); i++; break;
      case '--aspect':   parsed.aspect = next as AspectRatio; i++; break;
      case '--captions': parsed.captions = next; i++; break;
      case '--words':    parsed.wordsFile = next; i++; break;
      case '--face-x':   parsed.faceX = parseFloat(next); i++; break;
      case '--face-y':   parsed.faceY = parseFloat(next); i++; break;
      case '--no-face':  parsed.noFace = true; break;
      case '--crf':      parsed.crf = parseInt(next); i++; break;
      case '--preset':   parsed.preset = next as RenderCommandOptions['preset']; i++; break;
      case '--dry-run':  parsed.dryRun = true; break;
      case '--help':     printUsage(); process.exit(0);
      default:
        if (!parsed.input && !arg.startsWith('-')) {
          parsed.input = arg;
        } else {
          console.error(`Unknown argument: ${arg}`);
          process.exit(1);
        }
    }
  }

  if (!parsed.input) {
    console.error('Error: --input is required');
    printUsage();
    process.exit(1);
  }

  const aspect = parsed.aspect ?? '9x16';
  const validAspects: AspectRatio[] = ['9x16', '1x1', '16x9'];
  if (!validAspects.includes(aspect)) {
    console.error(`Error: --aspect must be one of ${validAspects.join(', ')}`);
    process.exit(1);
  }

  return {
    input: parsed.input,
    output: parsed.output ?? `rendered-${aspect}.mp4`,
    start: parsed.start ?? 0,
    end: parsed.end ?? 30,
    aspect,
    captions: parsed.captions ?? 'none',
    wordsFile: parsed.wordsFile,
    faceX: parsed.faceX,
    faceY: parsed.faceY,
    noFace: parsed.noFace ?? false,
    crf: parsed.crf ?? 23,
    preset: parsed.preset ?? 'medium',
    dryRun: parsed.dryRun ?? false,
  };
}

function printUsage(): void {
  console.log(`
Usage: npx tsx scripts/render-clip.ts --input <video> [options]

Options:
  --input <path>     Source video file (required)
  --output <path>    Output file (default: rendered-{aspect}.mp4)
  --start <sec>      Start time in seconds (default: 0)
  --end <sec>        End time in seconds (default: 30)
  --aspect <ratio>   9x16 | 1x1 | 16x9 (default: 9x16)
  --captions <style> karaoke | boxed | minimal | impact | subtitle | none
  --words <file>     JSON file with word timestamps for captions
  --face-x <0-1>     Manual face center X position
  --face-y <0-1>     Manual face center Y position
  --no-face          Skip face detection, use center crop
  --crf <0-51>       Quality (lower = better, default: 23)
  --preset <name>    Encoding speed (default: medium)
  --dry-run          Print FFmpeg command without executing
  --help             Show this help
  `);
}

// ─── Probe ───────────────────────────────────────────────────────────

async function probeLocal(inputPath: string): Promise<{ width: number; height: number; duration: number }> {
  const probeArgs = buildProbeArgs({ inputPath });
  const { stdout } = await execFileAsync('ffprobe', probeArgs);
  const data = JSON.parse(stdout);
  const video = data.streams?.find((s: Record<string, unknown>) => s.codec_type === 'video');
  if (!video) throw new Error('No video stream found');
  return {
    width: parseInt(video.width),
    height: parseInt(video.height),
    duration: parseFloat(data.format?.duration || video.duration || '0'),
  };
}

// ─── Face Detection (lightweight, local-only) ────────────────────────

async function detectFaceCenter(
  videoPath: string,
  startTime: number,
  endTime: number,
  sourceWidth: number,
  sourceHeight: number,
): Promise<{ cx: number; cy: number } | null> {
  // Sample 3 frames from the clip and run cropdetect
  const sampleTimes = [
    startTime,
    startTime + (endTime - startTime) / 2,
    endTime - 0.5,
  ].filter(t => t >= startTime && t <= endTime);

  const detections: Array<{ cx: number; cy: number }> = [];

  for (const t of sampleTimes) {
    try {
      const { stderr } = await execFileAsync('ffmpeg', [
        '-ss', t.toFixed(3),
        '-i', videoPath,
        '-frames:v', '1',
        '-vf', 'cropdetect=24:16:0',
        '-f', 'null',
        '-',
      ], { timeout: 10_000 });

      const match = stderr.match(/crop=(\d+):(\d+):(\d+):(\d+)/);
      if (match) {
        const cropW = parseInt(match[1]);
        const cropH = parseInt(match[2]);
        const cropX = parseInt(match[3]);
        const cropY = parseInt(match[4]);
        const areaRatio = (cropW * cropH) / (sourceWidth * sourceHeight);

        if (areaRatio < 0.9 && areaRatio > 0.01) {
          detections.push({
            cx: (cropX + cropW / 2) / sourceWidth,
            cy: (cropY + cropH / 2) / sourceHeight,
          });
        }
      }
    } catch {
      // Skip failed frame
    }
  }

  if (detections.length === 0) return null;

  // Average the detections
  const avgCx = detections.reduce((s, d) => s + d.cx, 0) / detections.length;
  const avgCy = detections.reduce((s, d) => s + d.cy, 0) / detections.length;
  return { cx: avgCx, cy: avgCy };
}

// ─── Main ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  // Validate input exists
  try {
    await fs.access(args.input);
  } catch {
    console.error(`Error: Input file not found: ${args.input}`);
    process.exit(1);
  }

  console.log(`\n--- OriginClipAI Local Render ---`);
  console.log(`Input:    ${args.input}`);
  console.log(`Output:   ${args.output}`);
  console.log(`Time:     ${args.start}s → ${args.end}s (${(args.end - args.start).toFixed(1)}s)`);
  console.log(`Aspect:   ${args.aspect}`);
  console.log(`Captions: ${args.captions}`);
  console.log(`CRF:      ${args.crf}`);
  console.log(`Preset:   ${args.preset}`);

  // Step 1: Probe source
  console.log(`\n[1/4] Probing source video...`);
  const probe = await probeLocal(args.input);
  console.log(`  ${probe.width}x${probe.height}, ${probe.duration.toFixed(1)}s`);

  // Clamp end time to video duration
  const endTime = Math.min(args.end, probe.duration);
  if (endTime <= args.start) {
    console.error(`Error: Start time (${args.start}s) >= end time (${endTime}s)`);
    process.exit(1);
  }

  // Step 2: Determine crop position
  console.log(`[2/4] Determining crop position...`);
  let faceCenterX: number | undefined;
  let faceCenterY: number | undefined;

  if (args.faceX !== undefined && args.faceY !== undefined) {
    faceCenterX = args.faceX * probe.width;
    faceCenterY = args.faceY * probe.height;
    console.log(`  Manual face position: (${args.faceX.toFixed(2)}, ${args.faceY.toFixed(2)})`);
  } else if (!args.noFace) {
    const face = await detectFaceCenter(args.input, args.start, endTime, probe.width, probe.height);
    if (face) {
      faceCenterX = face.cx * probe.width;
      faceCenterY = face.cy * probe.height;
      console.log(`  Detected face at: (${face.cx.toFixed(2)}, ${face.cy.toFixed(2)})`);
    } else {
      console.log(`  No face detected — using center crop`);
    }
  } else {
    console.log(`  Face detection skipped — using center crop`);
  }

  const crop = calculateCropRect(probe.width, probe.height, args.aspect, faceCenterX, faceCenterY);
  const target = getTargetDimensions(args.aspect);
  console.log(`  Crop: ${crop.w}x${crop.h} at (${crop.x}, ${crop.y}) → ${target.width}x${target.height}`);

  // Step 3: Generate captions if requested
  let subtitlePath: string | undefined;
  if (args.captions !== 'none') {
    console.log(`[3/4] Generating captions (${args.captions})...`);

    if (args.wordsFile) {
      const wordsJson = await fs.readFile(args.wordsFile, 'utf-8');
      const allWords: WordTimestamp[] = JSON.parse(wordsJson);

      // Filter words to clip time range and rebase to 0
      const clipWords = allWords
        .filter(w => w.start >= args.start && w.end <= endTime)
        .map(w => ({ ...w, start: w.start - args.start, end: w.end - args.start }));

      if (clipWords.length === 0) {
        console.log(`  Warning: No words found in time range ${args.start}s-${endTime}s`);
      } else {
        const assContent = args.captions === 'subtitle'
          ? generateSimpleAssFile(
              groupIntoSegments(clipWords, 5),
              args.captions,
              target.width,
              target.height,
            )
          : generateAssFile(clipWords, args.captions, target.width, target.height);

        subtitlePath = path.join(path.dirname(args.output), '.render-captions.ass');
        await fs.writeFile(subtitlePath, assContent, 'utf-8');
        console.log(`  Generated ${clipWords.length} words → ${subtitlePath}`);
      }
    } else {
      console.log(`  Warning: --words file not provided. Generating placeholder captions.`);
      const placeholderWords: WordTimestamp[] = [
        { word: '[Captions', start: 0, end: 0.5 },
        { word: 'require', start: 0.6, end: 1.0 },
        { word: '--words', start: 1.1, end: 1.5 },
        { word: 'file]', start: 1.6, end: 2.0 },
      ];
      const assContent = generateAssFile(placeholderWords, args.captions, target.width, target.height);
      subtitlePath = path.join(path.dirname(args.output), '.render-captions.ass');
      await fs.writeFile(subtitlePath, assContent, 'utf-8');
    }
  } else {
    console.log(`[3/4] Captions: skipped`);
  }

  // Step 4: Render
  console.log(`[4/4] Rendering...`);

  const renderArgs = buildRenderArgs({
    inputPath: args.input,
    outputPath: args.output,
    startTime: args.start,
    endTime: endTime,
    aspectRatio: args.aspect,
    crop,
    subtitlePath,
    crf: args.crf,
    preset: args.preset,
  });

  if (args.dryRun) {
    console.log(`\n  Dry run — FFmpeg command:`);
    console.log(`  ffmpeg ${renderArgs.map(a => a.includes(' ') || a.includes(',') ? `'${a}'` : a).join(' ')}`);
    console.log(`\n  Video filter chain:`);
    const vfIndex = renderArgs.indexOf('-vf');
    if (vfIndex !== -1) {
      const filters = renderArgs[vfIndex + 1].split(',');
      filters.forEach((f, i) => console.log(`    ${i + 1}. ${f}`));
    }
  } else {
    const startMs = Date.now();
    await execFileAsync('ffmpeg', renderArgs, { timeout: 600_000 });
    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);

    // Report output
    const stat = await fs.stat(args.output);
    const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);
    console.log(`  Done in ${elapsed}s → ${args.output} (${sizeMB} MB)`);
  }

  // Clean up temp caption file
  if (subtitlePath) {
    await fs.rm(subtitlePath, { force: true }).catch(() => {});
  }

  console.log(`\n--- Render complete ---\n`);
}

// ─── Helpers ─────────────────────────────────────────────────────────

function groupIntoSegments(
  words: WordTimestamp[],
  wordsPerSegment: number,
): Array<{ text: string; start: number; end: number }> {
  const segments: Array<{ text: string; start: number; end: number }> = [];
  for (let i = 0; i < words.length; i += wordsPerSegment) {
    const group = words.slice(i, i + wordsPerSegment);
    if (group.length === 0) continue;
    segments.push({
      text: group.map(w => w.word).join(' '),
      start: group[0].start,
      end: group[group.length - 1].end,
    });
  }
  return segments;
}

main().catch((err) => {
  console.error('Render failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
