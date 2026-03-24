// src/workers/render/handler.ts

/**
 * Render job handler — business logic for rendering a single clip.
 *
 * For each clip, this handler:
 * 1. Downloads the source video from storage
 * 2. Runs face detection for reframe positioning
 * 3. Renders each requested aspect ratio (9:16, 1:1, 16:9) with captions
 * 4. Validates output dimensions and duration
 * 5. Uploads rendered files to storage
 * 6. Generates SRT/VTT caption files
 * 7. Updates clip record with rendered file keys
 * 8. Checks if all clips for the job are done → marks job COMPLETE
 */

import * as path from "path";
import * as os from "os";
import * as fs from "fs/promises";
import { requireBinary, BinaryNotFoundError } from "@/lib/utils/binary-check";
import { prisma } from "@/lib/db/client";
import { updateJobProgress, updateJobStatus } from "@/lib/db/job-progress";
import { getStorageProvider } from "@/lib/providers/storage-supabase";
import {
  probeVideo,
  calculateCropRect,
  renderClip,
  getTargetDimensions,
  validateOutput,
  type AspectRatio,
} from "./ffmpeg";
import {
  generateAssFile,
  generateSimpleAssFile,
  generateSrt,
  generateVtt,
  type WordTimestamp as CaptionWordTimestamp,
  type SpeakerColor,
} from "./captions";
import {
  buildFaceTrack,
  getCropCenterAtTime,
  type FaceDetectionProvider,
  type FaceTrack,
} from "./face-detect";
import { getFFmpegFaceDetectionProvider } from "./face-detect-ffmpeg";
import type { RenderJobData, WordTimestamp } from "@/types";

interface RenderedFile {
  aspectRatio: AspectRatio;
  storageKey: string;
  width: number;
  height: number;
  durationSeconds: number;
  fileSizeBytes: number;
}

interface CaptionFiles {
  srt: string; // storage key
  vtt: string; // storage key
}

export async function handleRenderJob(data: RenderJobData): Promise<void> {
  const {
    jobId,
    clipId,
    sourceFileKey,
    startTime,
    endTime,
    aspectRatios,
    captionStyle,
    wordTimestamps,
    speakerColors,
  } = data;

  await requireBinary("ffmpeg", "render:clip");

  const tempDir = path.join(os.tmpdir(), `render-${clipId}`);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // Idempotency check: skip if already rendered
    const existingClip = await prisma.clip.findUnique({ where: { id: clipId } });
    if (!existingClip) {
      console.warn(`[render] Clip ${clipId} not found, skipping`);
      return;
    }
    if (existingClip.renderStatus === "complete") {
      console.log(`[render] Clip ${clipId} already rendered, skipping`);
      await checkJobCompletion(jobId);
      return;
    }

    // Mark clip as rendering
    await prisma.clip.update({
      where: { id: clipId },
      data: { renderStatus: "rendering" },
    });

    await updateJobProgress(jobId, "render", "running", {
      substep: `rendering_clip_${clipId}`,
    });

    // Step 1: Download source video
    const storage = getStorageProvider();
    const sourcePath = path.join(tempDir, "source.mp4");
    const sourceBuffer = await storage.download(sourceFileKey);
    await fs.writeFile(sourcePath, sourceBuffer);

    // Step 2: Probe source video
    const probe = await probeVideo(sourcePath);

    // Step 3: Face detection for reframe
    const faceProvider = getFaceDetectionProvider();
    const clipDuration = endTime - startTime;

    // Extract the clip segment first for face detection (faster than full video)
    const segmentPath = path.join(tempDir, "segment.mp4");
    const { extractClip: extractClipFn } = await import("./ffmpeg");
    await extractClipFn(sourcePath, segmentPath, startTime, endTime);

    const keyframeFaces = await faceProvider.detectFaces(segmentPath, 0.5);
    const faceTrack = buildFaceTrack(keyframeFaces);

    // Step 4: Prepare captions
    const clipWords = filterWordsForClip(wordTimestamps, startTime, endTime);
    const captionSpeakerColors = buildSpeakerColors(speakerColors);

    // Step 5: Render each aspect ratio
    const renderedFiles: RenderedFile[] = [];

    for (const aspectRatio of aspectRatios) {
      const rendered = await renderSingleAspectRatio({
        sourcePath,
        tempDir,
        clipId,
        startTime,
        endTime,
        clipDuration,
        aspectRatio,
        sourceWidth: probe.width,
        sourceHeight: probe.height,
        faceTrack,
        captionStyle,
        clipWords,
        captionSpeakerColors,
      });
      renderedFiles.push(rendered);
    }

    // Step 6: Upload rendered files to storage
    const uploadedFiles: Record<string, { storageKey: string; width: number; height: number }> = {};

    for (const rendered of renderedFiles) {
      const fileBuffer = await fs.readFile(
        path.join(tempDir, `output-${rendered.aspectRatio}.mp4`),
      );
      const storageKey = `clips/${jobId}/${clipId}/${rendered.aspectRatio}.mp4`;
      await storage.upload(storageKey, fileBuffer, {
        contentType: "video/mp4",
      });

      uploadedFiles[rendered.aspectRatio] = {
        storageKey,
        width: rendered.width,
        height: rendered.height,
      };
    }

    // Step 7: Generate and upload SRT/VTT caption files
    const captionSegments = buildCaptionSegments(clipWords);
    const captionFiles = await uploadCaptionFiles(
      storage,
      jobId,
      clipId,
      captionSegments,
    );

    // Step 8: Update clip record
    await prisma.clip.update({
      where: { id: clipId },
      data: {
        renderStatus: "complete",
        renderedFiles: JSON.parse(JSON.stringify({
          ...uploadedFiles,
          captions: captionFiles,
        })),
      },
    });

    // Step 9: Check if all clips for job are done
    await checkJobCompletion(jobId);
  } catch (error) {
    // Update clip status to failed
    await prisma.clip
      .update({
        where: { id: clipId },
        data: { renderStatus: "failed" },
      })
      .catch(() => {});

    await updateJobProgress(jobId, "render", "error").catch(() => {});

    console.error(`[render] Clip ${clipId} render failed:`, error);

    // Binary not found is permanent — fail the whole job immediately, don't retry
    if (error instanceof BinaryNotFoundError) {
      await updateJobStatus(jobId, "failed", error.message).catch(() => {});
      return;
    }

    throw error;
  } finally {
    // Always clean up temp files
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ─── Single Aspect Ratio Render ──────────────────────────────────────

interface SingleRenderInput {
  sourcePath: string;
  tempDir: string;
  clipId: string;
  startTime: number;
  endTime: number;
  clipDuration: number;
  aspectRatio: AspectRatio;
  sourceWidth: number;
  sourceHeight: number;
  faceTrack: FaceTrack;
  captionStyle: string;
  clipWords: CaptionWordTimestamp[];
  captionSpeakerColors: SpeakerColor[];
}

async function renderSingleAspectRatio(
  input: SingleRenderInput,
): Promise<RenderedFile> {
  const {
    sourcePath,
    tempDir,
    clipId,
    startTime,
    endTime,
    clipDuration,
    aspectRatio,
    sourceWidth,
    sourceHeight,
    faceTrack,
    captionStyle,
    clipWords,
    captionSpeakerColors,
  } = input;

  const target = getTargetDimensions(aspectRatio);
  const outputPath = path.join(tempDir, `output-${aspectRatio}.mp4`);

  // Calculate crop rectangle using face track midpoint
  // For 16:9 passthrough on 16:9 source, crop is effectively a no-op
  const midpointTime = clipDuration / 2;
  const faceCenter = getCropCenterAtTime(faceTrack, midpointTime);
  const crop = calculateCropRect(
    sourceWidth,
    sourceHeight,
    aspectRatio,
    faceCenter.cx * sourceWidth,
    faceCenter.cy * sourceHeight,
  );

  // Generate caption ASS file
  let subtitlePath: string | undefined;
  if (clipWords.length > 0) {
    const assContent =
      captionStyle === "subtitle"
        ? generateSimpleAssFile(
            buildCaptionSegments(clipWords),
            captionStyle,
            target.width,
            target.height,
          )
        : generateAssFile(
            clipWords,
            captionStyle,
            target.width,
            target.height,
            captionSpeakerColors.length > 0 ? captionSpeakerColors : undefined,
          );

    subtitlePath = path.join(tempDir, `captions-${aspectRatio}.ass`);
    await fs.writeFile(subtitlePath, assContent, "utf-8");
  }

  // Render
  await renderClip({
    inputPath: sourcePath,
    outputPath,
    startTime,
    endTime,
    aspectRatio,
    crop,
    subtitlePath,
  });

  // Validate output
  const validation = await validateOutput(outputPath, aspectRatio, clipDuration);
  if (!validation.valid) {
    console.warn(
      `[render] Clip ${clipId} ${aspectRatio} validation warnings:`,
      validation.errors,
    );
    // Non-fatal: warn but don't fail the render
  }

  const stat = await fs.stat(outputPath);

  return {
    aspectRatio,
    storageKey: "", // Will be set after upload
    width: target.width,
    height: target.height,
    durationSeconds: clipDuration,
    fileSizeBytes: stat.size,
  };
}

// ─── Job Completion Tracking ─────────────────────────────────────────

/**
 * Check if all clips for a job have been rendered.
 * When all clips are complete, update the job status to COMPLETE.
 */
async function checkJobCompletion(jobId: string): Promise<void> {
  const totalClips = await prisma.clip.count({ where: { jobId } });
  const renderedClips = await prisma.clip.count({
    where: { jobId, renderStatus: "complete" },
  });
  const failedClips = await prisma.clip.count({
    where: { jobId, renderStatus: "failed" },
  });

  // Update progress with render counts
  await updateJobProgress(jobId, "render", "running", {
    clips_rendered: renderedClips,
    clips_total: totalClips,
  });

  if (renderedClips + failedClips >= totalClips) {
    // All clips have been processed (some may have failed)
    if (failedClips > 0 && renderedClips === 0) {
      // All clips failed — mark job as failed
      await updateJobProgress(jobId, "render", "error", {
        clips_rendered: renderedClips,
        clips_total: totalClips,
      });
      await updateJobStatus(
        jobId,
        "failed",
        `All ${failedClips} clips failed to render`,
      );
    } else {
      // At least some clips rendered — mark complete
      await updateJobProgress(jobId, "render", "complete", {
        clips_rendered: renderedClips,
        clips_total: totalClips,
      });
      await updateJobStatus(jobId, "complete");
    }
  }
}

// ─── Caption Helpers ─────────────────────────────────────────────────

/**
 * Filter word timestamps to only include words within the clip boundaries.
 * Adjusts timestamps to be relative to clip start (0-based).
 */
function filterWordsForClip(
  wordTimestamps: WordTimestamp[],
  startTime: number,
  endTime: number,
): CaptionWordTimestamp[] {
  return wordTimestamps
    .filter((w) => w.start >= startTime && w.end <= endTime)
    .map((w) => ({
      word: w.word,
      start: w.start - startTime,
      end: w.end - startTime,
      speakerId: w.speakerId,
    }));
}

/**
 * Convert word timestamps into display segments (groups of ~5 words).
 */
function buildCaptionSegments(
  words: CaptionWordTimestamp[],
): Array<{ text: string; start: number; end: number; speakerId?: string }> {
  const segments: Array<{ text: string; start: number; end: number; speakerId?: string }> = [];
  const wordsPerSegment = 5;

  for (let i = 0; i < words.length; i += wordsPerSegment) {
    const group = words.slice(i, i + wordsPerSegment);
    if (group.length === 0) continue;

    segments.push({
      text: group.map((w) => w.word).join(" "),
      start: group[0].start,
      end: group[group.length - 1].end,
      speakerId: group[0].speakerId,
    });
  }

  return segments;
}

/**
 * Convert speaker color map to the format expected by captions.ts.
 */
function buildSpeakerColors(
  speakerColors: Record<string, string>,
): SpeakerColor[] {
  return Object.entries(speakerColors).map(([speakerId, color]) => ({
    speakerId,
    color,
  }));
}

/**
 * Upload SRT and VTT caption files to storage.
 */
async function uploadCaptionFiles(
  storage: ReturnType<typeof getStorageProvider>,
  jobId: string,
  clipId: string,
  segments: Array<{ text: string; start: number; end: number }>,
): Promise<CaptionFiles> {
  const srtContent = generateSrt(segments);
  const vttContent = generateVtt(segments);

  const srtKey = `clips/${jobId}/${clipId}/captions.srt`;
  const vttKey = `clips/${jobId}/${clipId}/captions.vtt`;

  await Promise.all([
    storage.upload(srtKey, Buffer.from(srtContent, "utf-8"), {
      contentType: "text/plain",
    }),
    storage.upload(vttKey, Buffer.from(vttContent, "utf-8"), {
      contentType: "text/vtt",
    }),
  ]);

  return { srt: srtKey, vtt: vttKey };
}

// ─── Provider ────────────────────────────────────────────────────────

/**
 * Get the face detection provider.
 * Uses FFmpeg-based detection in v1. Can be swapped for MediaPipe later.
 */
function getFaceDetectionProvider(): FaceDetectionProvider {
  return getFFmpegFaceDetectionProvider();
}
