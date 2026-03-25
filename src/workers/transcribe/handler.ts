import { prisma } from "@/lib/db/client";
import { updateJobProgress, updateJobStatus } from "@/lib/db/job-progress";
import { analyzeQueue } from "@/lib/queue/queues";
import { getTranscriptionProvider } from "@/lib/providers/transcription-factory";
import { getStorageProvider } from "@/lib/providers/storage-supabase";
import { filterHallucinations } from "./hallucination-filter";
import { isNoExternalAPIs, logMock } from "@/lib/dev-mode";
import type { TranscribeJobData } from "@/types";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

/**
 * Transcribe handler — extracts audio, runs transcription with speaker diarization,
 * applies hallucination filter, stores transcript in DB, enqueues analyze step.
 */
export async function handleTranscribeJob(data: TranscribeJobData): Promise<void> {
  const { jobId, sourceFileKey, engine, language } = data;

  try {
    await updateJobStatus(jobId, "transcribing");
    await updateJobProgress(jobId, "transcribe", "running");

    // Idempotency: check if transcript already exists for this job
    const existing = await prisma.transcript.findUnique({
      where: { jobId },
    });
    if (existing) {
      console.log(`[transcribe] Transcript already exists for job ${jobId}, skipping`);
      await updateJobProgress(jobId, "transcribe", "complete", {
        speakers_found: (existing.speakers as unknown[]).length,
      });
      await updateJobStatus(jobId, "analyzing");
      await analyzeQueue().add("analyze", {
        jobId,
        transcriptId: existing.id,
        sourceType: "youtube_url", // Will be resolved from job record
      });
      return;
    }

    // Content hash dedupe: check if another job with the same source already has a transcript.
    // This avoids re-transcribing the same YouTube video, URL, or file.
    const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
    if (job.contentHash) {
      const priorJob = await prisma.job.findFirst({
        where: {
          contentHash: job.contentHash,
          id: { not: jobId },
          status: { in: ["complete", "analyzing", "rendering"] },
        },
        select: { id: true },
        orderBy: { createdAt: "desc" },
      });

      if (priorJob) {
        const priorTranscript = await prisma.transcript.findUnique({
          where: { jobId: priorJob.id },
        });

        if (priorTranscript) {
          console.log(
            `[transcribe] Content hash match — reusing transcript from job ${priorJob.id} for job ${jobId}`,
          );

          // Clone the transcript for this job
          const cloned = await prisma.transcript.create({
            data: {
              jobId,
              fullText: priorTranscript.fullText,
              language: priorTranscript.language,
              segments: priorTranscript.segments as object,
              speakers: priorTranscript.speakers as object,
              wordTimestamps: priorTranscript.wordTimestamps as object,
              engine: priorTranscript.engine,
              durationSeconds: priorTranscript.durationSeconds,
              wordCount: priorTranscript.wordCount,
              confidenceAvg: priorTranscript.confidenceAvg,
            },
          });

          await prisma.job.update({
            where: { id: jobId },
            data: {
              sourceDurationSeconds: priorTranscript.durationSeconds,
              minutesConsumed: (priorTranscript.durationSeconds ?? 0) / 60,
            },
          });

          await updateJobProgress(jobId, "transcribe", "complete", {
            speakers_found: (priorTranscript.speakers as unknown[]).length,
            reused_from: priorJob.id,
          });
          await updateJobStatus(jobId, "analyzing");
          await analyzeQueue().add("analyze", {
            jobId,
            transcriptId: cloned.id,
            sourceType: job.sourceType,
          });
          return;
        }
      }
    }

    // Step 1: Get a signed URL for the source file (for provider API access)
    await updateJobProgress(jobId, "transcribe", "running", {
      substep: "preparing_audio",
    });

    let provider = getTranscriptionProvider(engine);
    let result;

    if (isNoExternalAPIs()) {
      // Mock mode: skip storage/ffmpeg entirely, use fixture data
      logMock("transcribe", `Skipping audio preparation — using mock transcription for job ${jobId}`);
      result = await provider.transcribe("mock://fixture", {
        language,
        enableDiarization: true,
      });
    } else {
      const storage = getStorageProvider();
      const audioUrl = await getAudioUrl(storage, sourceFileKey, jobId);

      // Step 2: Run transcription
      await updateJobProgress(jobId, "transcribe", "running", {
        substep: "transcribing",
      });

      try {
        result = await provider.transcribe(audioUrl, {
          language,
          enableDiarization: true,
        });
      } catch (primaryError) {
        // Fallback to AssemblyAI if Whisper fails
        if (engine === "whisper") {
          console.warn(
            `[transcribe] Whisper failed for job ${jobId}, falling back to AssemblyAI:`,
            primaryError instanceof Error ? primaryError.message : primaryError,
          );

          provider = getTranscriptionProvider("assemblyai");
          const isAvailable = await provider.isAvailable();
          if (!isAvailable) {
            throw primaryError; // No fallback available, re-throw original
          }

          result = await provider.transcribe(audioUrl, {
            language,
            enableDiarization: true,
          });
        } else {
          throw primaryError;
        }
      }
    }

    // Step 3: Apply hallucination filter
    await updateJobProgress(jobId, "transcribe", "running", {
      substep: "filtering",
    });

    const filtered = filterHallucinations(
      result.segments,
      result.wordTimestamps,
    );

    if (filtered.removedCount > 0) {
      console.log(
        `[transcribe] Removed ${filtered.removedCount} hallucinated segments for job ${jobId}`,
      );
    }

    // Step 4: Store transcript in DB (upsert for idempotency)
    await updateJobProgress(jobId, "transcribe", "running", {
      substep: "storing",
      speakers_found: result.speakers.length,
    });

    const engineEnum = provider.name === "whisper" ? "whisper" as const : "assemblyai" as const;
    const segmentsJson = JSON.parse(JSON.stringify(filtered.segments));
    const speakersJson = JSON.parse(JSON.stringify(result.speakers));
    const wordTimestampsJson = JSON.parse(JSON.stringify(filtered.wordTimestamps));

    const transcript = await prisma.transcript.upsert({
      where: { jobId },
      create: {
        jobId,
        fullText: filtered.fullText,
        language: result.language,
        segments: segmentsJson,
        speakers: speakersJson,
        wordTimestamps: wordTimestampsJson,
        engine: engineEnum,
        durationSeconds: result.durationSeconds,
        wordCount: result.wordCount,
        confidenceAvg: result.confidenceAvg,
      },
      update: {
        fullText: filtered.fullText,
        language: result.language,
        segments: segmentsJson,
        speakers: speakersJson,
        wordTimestamps: wordTimestampsJson,
        engine: engineEnum,
        durationSeconds: result.durationSeconds,
        wordCount: result.wordCount,
        confidenceAvg: result.confidenceAvg,
      },
    });

    // Update job with duration/minutes consumed
    const minutesConsumed = (result.durationSeconds ?? 0) / 60;
    await prisma.job.update({
      where: { id: jobId },
      data: {
        sourceDurationSeconds: result.durationSeconds,
        minutesConsumed,
      },
    });

    await updateJobProgress(jobId, "transcribe", "complete", {
      speakers_found: result.speakers.length,
      transcribe_pct: 100,
    });

    // Step 5: Enqueue analyze step
    // Re-fetch job to get latest sourceType (job was fetched earlier for content hash)
    const jobForAnalyze = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
    await updateJobStatus(jobId, "analyzing");
    await analyzeQueue().add("analyze", {
      jobId,
      transcriptId: transcript.id,
      sourceType: jobForAnalyze.sourceType,
    });
  } catch (error) {
    await updateJobProgress(jobId, "transcribe", "error").catch(() => {});
    await updateJobStatus(
      jobId,
      "failed",
      error instanceof Error ? error.message : "Unknown transcription error",
    ).catch(() => {});
    throw error; // Re-throw for BullMQ retry
  }
}

/**
 * Get a publicly accessible URL for the audio file.
 * If the source is a video, extract audio first.
 */
async function getAudioUrl(
  storage: { getSignedUrl: (key: string, options?: { expiresIn?: number }) => Promise<string>; download: (key: string) => Promise<Buffer> },
  sourceFileKey: string,
  jobId: string,
): Promise<string> {
  // Check if source is a video that needs audio extraction
  const isVideo = /\.(mp4|webm|mkv|avi|mov)$/i.test(sourceFileKey);

  if (!isVideo) {
    // Audio file — just get a signed URL
    return storage.getSignedUrl(sourceFileKey, { expiresIn: 3600 });
  }

  // Video file — extract audio to WAV and upload
  const tempDir = path.join(os.tmpdir(), `transcribe-${jobId}`);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    const videoBuffer = await storage.download(sourceFileKey);
    const videoPath = path.join(tempDir, "source.mp4");
    const audioPath = path.join(tempDir, "audio.wav");

    await fs.writeFile(videoPath, videoBuffer);

    // Extract audio using FFmpeg
    await execAsync(
      `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}" -y`,
      { timeout: 300_000 },
    );

    // Upload extracted audio
    const audioBuffer = await fs.readFile(audioPath);
    const audioKey = `jobs/${jobId}/audio.wav`;
    const { getStorageProvider: getStorage } = await import(
      "@/lib/providers/storage-supabase"
    );
    await getStorage().upload(audioKey, audioBuffer, {
      contentType: "audio/wav",
    });

    return storage.getSignedUrl(audioKey, { expiresIn: 3600 });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
