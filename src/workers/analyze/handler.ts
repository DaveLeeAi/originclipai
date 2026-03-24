import { prisma } from "@/lib/db/client";
import { updateJobProgress, updateJobStatus } from "@/lib/db/job-progress";
import { getLLMProvider } from "@/lib/providers/llm-anthropic";
import { getStorageProvider } from "@/lib/providers/storage-supabase";
import { fireJobCompletedWebhook } from "@/lib/webhooks/dispatcher";
import { renderQueue } from "@/lib/queue/queues";
import {
  clipAnalysisPrompt,
  speakerRolesPrompt,
  linkedinPostPrompt,
  xThreadPrompt,
  newsletterSectionPrompt,
  summaryPrompt,
  chapterMarkersPrompt,
  type ClipCandidate,
  type SpeakerRoleResult,
} from "@/prompts";
import { formatDuration } from "@/lib/utils/duration";
import type { LLMProvider } from "@/lib/providers/llm";
import type { AnalyzeJobData, Speaker, TranscriptSegment, TextOutputType, WordTimestamp } from "@/types";

const TEXT_ONLY_SOURCES = ["article_url", "pdf_upload"];

/**
 * Analyze handler — runs LLM-powered clip detection and text generation.
 *
 * For video/audio: speaker roles → clip analysis → text generation (parallel)
 * For text-only: text generation only (no clips)
 */
export async function handleAnalyzeJob(data: AnalyzeJobData): Promise<void> {
  const { jobId, sourceType } = data;

  try {
    await updateJobStatus(jobId, "analyzing");
    await updateJobProgress(jobId, "analyze", "running");

    const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
    const isTextOnly = TEXT_ONLY_SOURCES.includes(sourceType);
    const llm = getLLMProvider();

    let fullText: string;
    let speakers: Speaker[] = [];
    let segments: TranscriptSegment[] = [];
    let durationSeconds = 0;

    if (isTextOnly) {
      // Load extracted text from storage
      fullText = await loadTextContent(jobId, job.sourceFileKey);
    } else {
      // Load transcript from DB
      const transcript = await prisma.transcript.findUniqueOrThrow({
        where: { jobId },
      });
      fullText = transcript.fullText;
      speakers = transcript.speakers as unknown as Speaker[];
      segments = transcript.segments as unknown as TranscriptSegment[];
      durationSeconds = transcript.durationSeconds ?? 0;

      // Step 1: Speaker role detection
      if (speakers.length > 1) {
        await updateJobProgress(jobId, "analyze", "running", {
          substep: "speaker_roles",
        });

        const first5MinText = getFirst5MinTranscript(segments);
        try {
          const roleResult = await detectSpeakerRoles(llm, speakers, first5MinText, fullText.length);
          speakers = applySpeakerRoles(speakers, roleResult);

          // Update transcript with detected roles
          await prisma.transcript.update({
            where: { jobId },
            data: { speakers: JSON.parse(JSON.stringify(speakers)) },
          });
        } catch (err) {
          console.warn(`[analyze] Speaker role detection failed for job ${jobId}:`, err);
          // Non-fatal — continue with unknown roles
        }
      } else if (speakers.length === 1) {
        speakers[0].role = "solo";
        await prisma.transcript.update({
          where: { jobId },
          data: { speakers: JSON.parse(JSON.stringify(speakers)) },
        });
      }

      // Step 2: Clip analysis
      await updateJobProgress(jobId, "analyze", "running", {
        substep: "clip_scoring",
      });

      const clips = await analyzeClips(llm, {
        sourceTitle: job.sourceTitle ?? "Untitled",
        duration: formatDuration(durationSeconds),
        contentType: detectContentType(speakers),
        speakers,
        transcript: fullText,
      });

      // Store clips in DB
      let sortOrder = 0;
      for (const clip of clips) {
        await prisma.clip.create({
          data: {
            jobId,
            startTime: clip.startTime,
            endTime: clip.endTime,
            duration: clip.duration,
            title: clip.title,
            hook: clip.hook ?? null,
            transcriptExcerpt: clip.transcriptExcerpt,
            score: clip.score,
            scoreFactors: JSON.parse(JSON.stringify(clip.scoreFactors)),
            primarySpeakerId: clip.primarySpeakerId,
            speakerRole: mapSpeakerRole(clip.primarySpeakerId, speakers),
            speakersPresent: JSON.parse(JSON.stringify(clip.speakersPresent)),
            socialCaption: clip.socialCaption ?? null,
            hashtags: JSON.parse(JSON.stringify(clip.topics ?? [])),
            sortOrder: sortOrder++,
          },
        });
      }

      await updateJobProgress(jobId, "analyze", "running", {
        clipsFound: clips.length,
      });

      // Update job clip count
      await prisma.job.update({
        where: { id: jobId },
        data: { clipCount: clips.length },
      });
    }

    // Step 3: Text generation (parallel for all source types)
    await updateJobProgress(jobId, "analyze", "running", {
      substep: "text_generation",
    });

    // Truncate content for text generation prompts (keep under ~100K chars)
    const contentForText = fullText.slice(0, 100_000);

    const textResults = await generateAllTextOutputs(llm, {
      sourceTitle: job.sourceTitle ?? "Untitled",
      sourceType,
      content: contentForText,
      speakers,
      isTextOnly,
      durationSeconds,
      transcript: fullText,
    });

    // Store text outputs in DB
    let textSortOrder = 0;
    for (const output of textResults) {
      await prisma.textOutput.create({
        data: {
          jobId,
          type: output.type,
          label: output.label,
          content: output.content,
          wordCount: output.wordCount,
          threadPosts: output.threadPosts
            ? JSON.parse(JSON.stringify(output.threadPosts))
            : undefined,
          metadata: JSON.parse(
            JSON.stringify({ promptVersion: output.promptVersion }),
          ),
          sortOrder: textSortOrder++,
        },
      });
    }

    // Update job text output count
    await prisma.job.update({
      where: { id: jobId },
      data: { textOutputCount: textResults.length },
    });

    await updateJobProgress(jobId, "analyze", "complete", {
      clipsFound: isTextOnly ? 0 : undefined,
      textsGenerated: textResults.length,
    });

    if (isTextOnly) {
      // Text-only sources have no clips to render — mark complete immediately
      await updateJobStatus(jobId, "complete");

      await fireJobCompletedWebhook(jobId, {
        status: "complete",
        clipCount: 0,
        textOutputCount: textResults.length,
        sourceTitle: job.sourceTitle,
      }).catch((err) => {
        console.warn(`[analyze] Webhook dispatch failed for job ${jobId}:`, err);
      });
    } else {
      // Video/audio sources: fan out render jobs for each clip

      // Load word timestamps from transcript for caption rendering
      const transcript = await prisma.transcript.findUnique({
        where: { jobId },
        select: { wordTimestamps: true },
      });
      const allWordTimestamps = (transcript?.wordTimestamps ?? []) as unknown as WordTimestamp[];

      // Build speaker color map (host = indigo, guest = cyan)
      const speakerColorMap: Record<string, string> = {};
      for (const speaker of speakers) {
        speakerColorMap[speaker.id] =
          speaker.role === "host" || speaker.role === "solo"
            ? "&H004646E5" // Indigo (ASS BGR format)
            : "&H00FFFF00"; // Cyan
      }

      // Enqueue one render job per clip
      const createdClips = await prisma.clip.findMany({
        where: { jobId },
        select: { id: true, startTime: true, endTime: true, captionStyle: true },
      });

      await updateJobStatus(jobId, "rendering");
      await updateJobProgress(jobId, "render", "running", {
        clips_rendered: 0,
        clips_total: createdClips.length,
      });

      for (const clip of createdClips) {
        await renderQueue().add(
          "render",
          {
            jobId,
            clipId: clip.id,
            sourceFileKey: job.sourceFileKey!,
            startTime: clip.startTime,
            endTime: clip.endTime,
            aspectRatios: ["9x16", "1x1", "16x9"],
            captionStyle: clip.captionStyle ?? "karaoke",
            wordTimestamps: allWordTimestamps,
            speakerColors: speakerColorMap,
          },
          {
            jobId: `render-${clip.id}`, // Deterministic ID for dedup
          },
        );
      }

      console.log(
        `[analyze] Enqueued ${createdClips.length} render jobs for job ${jobId}`,
      );
    }
  } catch (error) {
    await updateJobProgress(jobId, "analyze", "error").catch(() => {});
    await updateJobStatus(
      jobId,
      "failed",
      error instanceof Error ? error.message : "Unknown analyze error",
    ).catch(() => {});
    throw error;
  }
}

// ─── Speaker Role Detection ─────────────────────────────────────────

async function detectSpeakerRoles(
  llm: LLMProvider,
  speakers: Speaker[],
  first5MinText: string,
  fullTranscriptLength: number,
): Promise<SpeakerRoleResult> {
  const speakerInfo = speakers.map((s) => ({
    id: s.id,
    label: s.label,
    talkTimePct: s.talkTimePct,
    talkTimeSeconds: s.talkTimeSeconds,
  }));

  const messages = [
    { role: "system" as const, content: speakerRolesPrompt.system },
    {
      role: "user" as const,
      content: speakerRolesPrompt.buildUserMessage({
        speakers: speakerInfo,
        transcriptFirst5Minutes: first5MinText,
        fullTranscriptLength,
      }),
    },
  ];

  const response = await llm.chat(messages, {
    model: speakerRolesPrompt.model,
    temperature: speakerRolesPrompt.temperature,
    maxTokens: speakerRolesPrompt.maxTokens,
  });

  return speakerRolesPrompt.parseResponse(response.content);
}

function applySpeakerRoles(
  speakers: Speaker[],
  result: SpeakerRoleResult,
): Speaker[] {
  return speakers.map((s) => {
    const detected = result.speakers.find((r) => r.id === s.id);
    if (detected) {
      const role = detected.role === "co_host" ? "host" : detected.role;
      return { ...s, role: role as Speaker["role"] };
    }
    return s;
  });
}

// ─── Clip Analysis ──────────────────────────────────────────────────

interface ClipAnalysisInput {
  sourceTitle: string;
  duration: string;
  contentType: string;
  speakers: Speaker[];
  transcript: string;
}

async function analyzeClips(
  llm: LLMProvider,
  input: ClipAnalysisInput,
): Promise<ClipCandidate[]> {
  const speakerInfo = input.speakers.map((s) => ({
    id: s.id,
    label: s.label,
    role: s.role,
    talkTimePct: s.talkTimePct,
    talkTimeSeconds: s.talkTimeSeconds,
  }));

  const messages = [
    { role: "system" as const, content: clipAnalysisPrompt.system },
    {
      role: "user" as const,
      content: clipAnalysisPrompt.buildUserMessage({
        sourceTitle: input.sourceTitle,
        duration: input.duration,
        contentType: input.contentType,
        speakers: speakerInfo,
        transcript: input.transcript,
        minDuration: 30,
        maxDuration: 90,
        targetClips: 15,
      }),
    },
  ];

  const response = await llm.chat(messages, {
    model: clipAnalysisPrompt.model,
    temperature: clipAnalysisPrompt.temperature,
    maxTokens: clipAnalysisPrompt.maxTokens,
  });

  try {
    return clipAnalysisPrompt.parseResponse(response.content);
  } catch (firstError) {
    console.warn("[analyze] Clip analysis parse failed, retrying...");
    const retryMessages = [
      ...messages,
      { role: "assistant" as const, content: response.content },
      {
        role: "user" as const,
        content:
          "Your response was not valid JSON. Return ONLY a JSON array of clip candidates, no other text.",
      },
    ];
    const retryResponse = await llm.chat(retryMessages, {
      model: clipAnalysisPrompt.model,
      temperature: 0.1,
      maxTokens: clipAnalysisPrompt.maxTokens,
    });
    return clipAnalysisPrompt.parseResponse(retryResponse.content);
  }
}

// ─── Text Generation ────────────────────────────────────────────────

interface TextGenerationInput {
  sourceTitle: string;
  sourceType: string;
  content: string;
  speakers: Speaker[];
  isTextOnly: boolean;
  durationSeconds: number;
  transcript: string;
}

interface TextOutputRecord {
  type: TextOutputType;
  label: string;
  content: string;
  wordCount: number;
  threadPosts?: { postNumber: number; text: string }[];
  promptVersion: string;
}

async function generateAllTextOutputs(
  llm: LLMProvider,
  input: TextGenerationInput,
): Promise<TextOutputRecord[]> {
  const results: TextOutputRecord[] = [];

  // Run text generation prompts in parallel
  const tasks = [
    generateLinkedinPosts(llm, input),
    generateXThreads(llm, input),
    generateNewsletterSections(llm, input),
    generateSummary(llm, input),
  ];

  // Chapter markers only for video/audio with timestamps
  if (!input.isTextOnly && input.durationSeconds > 0) {
    tasks.push(generateChapterMarkers(llm, input));
  }

  const settled = await Promise.allSettled(tasks);

  for (const result of settled) {
    if (result.status === "fulfilled") {
      results.push(...result.value);
    } else {
      console.warn("[analyze] Text generation task failed:", result.reason);
      // Non-fatal — continue with other text outputs
    }
  }

  return results;
}

async function generateLinkedinPosts(
  llm: LLMProvider,
  input: TextGenerationInput,
): Promise<TextOutputRecord[]> {
  const messages = [
    { role: "system" as const, content: linkedinPostPrompt.system },
    {
      role: "user" as const,
      content: linkedinPostPrompt.buildUserMessage({
        sourceTitle: input.sourceTitle,
        sourceType: input.sourceType,
        content: input.content,
        speakers: input.speakers.map((s) => ({
          id: s.id,
          label: s.label,
          role: s.role,
          talkTimePct: s.talkTimePct,
        })),
        count: 3,
      }),
    },
  ];

  const response = await llm.chat(messages, {
    model: linkedinPostPrompt.model,
    temperature: linkedinPostPrompt.temperature,
    maxTokens: linkedinPostPrompt.maxTokens,
  });

  const posts = linkedinPostPrompt.parseResponse(response.content);
  return posts.map((post, i) => ({
    type: "linkedin_post" as const,
    label: `LinkedIn Post ${i + 1}: ${post.focusTopic}`,
    content: post.content,
    wordCount: post.wordCount,
    promptVersion: linkedinPostPrompt.version,
  }));
}

async function generateXThreads(
  llm: LLMProvider,
  input: TextGenerationInput,
): Promise<TextOutputRecord[]> {
  const messages = [
    { role: "system" as const, content: xThreadPrompt.system },
    {
      role: "user" as const,
      content: xThreadPrompt.buildUserMessage({
        sourceTitle: input.sourceTitle,
        sourceType: input.sourceType,
        content: input.content,
        count: 2,
      }),
    },
  ];

  const response = await llm.chat(messages, {
    model: xThreadPrompt.model,
    temperature: xThreadPrompt.temperature,
    maxTokens: xThreadPrompt.maxTokens,
  });

  const threads = xThreadPrompt.parseResponse(response.content);
  return threads.map((thread, i) => ({
    type: "x_thread" as const,
    label: `X Thread ${i + 1}: ${thread.focusTopic}`,
    content: thread.threadPosts.map((p) => p.text).join("\n\n"),
    wordCount: thread.wordCount,
    threadPosts: thread.threadPosts,
    promptVersion: xThreadPrompt.version,
  }));
}

async function generateNewsletterSections(
  llm: LLMProvider,
  input: TextGenerationInput,
): Promise<TextOutputRecord[]> {
  const messages = [
    { role: "system" as const, content: newsletterSectionPrompt.system },
    {
      role: "user" as const,
      content: newsletterSectionPrompt.buildUserMessage({
        sourceTitle: input.sourceTitle,
        sourceType: input.sourceType,
        content: input.content,
        count: 2,
      }),
    },
  ];

  const response = await llm.chat(messages, {
    model: newsletterSectionPrompt.model,
    temperature: newsletterSectionPrompt.temperature,
    maxTokens: newsletterSectionPrompt.maxTokens,
  });

  const sections = newsletterSectionPrompt.parseResponse(response.content);
  return sections.map((section, i) => ({
    type: "newsletter_section" as const,
    label: section.sectionTitle || `Newsletter Section ${i + 1}`,
    content: section.content,
    wordCount: section.wordCount,
    promptVersion: newsletterSectionPrompt.version,
  }));
}

async function generateSummary(
  llm: LLMProvider,
  input: TextGenerationInput,
): Promise<TextOutputRecord[]> {
  const messages = [
    { role: "system" as const, content: summaryPrompt.system },
    {
      role: "user" as const,
      content: summaryPrompt.buildUserMessage({
        sourceTitle: input.sourceTitle,
        sourceType: input.sourceType,
        content: input.content,
      }),
    },
  ];

  const response = await llm.chat(messages, {
    model: summaryPrompt.model,
    temperature: summaryPrompt.temperature,
    maxTokens: summaryPrompt.maxTokens,
  });

  const summary = summaryPrompt.parseResponse(response.content);
  return [
    {
      type: "summary" as const,
      label: "Summary",
      content: `${summary.summary}\n\nKey Insights:\n${summary.keyInsights.map((i) => `- ${i}`).join("\n")}`,
      wordCount: summary.wordCount,
      promptVersion: summaryPrompt.version,
    },
  ];
}

async function generateChapterMarkers(
  llm: LLMProvider,
  input: TextGenerationInput,
): Promise<TextOutputRecord[]> {
  const messages = [
    { role: "system" as const, content: chapterMarkersPrompt.system },
    {
      role: "user" as const,
      content: chapterMarkersPrompt.buildUserMessage({
        sourceTitle: input.sourceTitle,
        durationSeconds: input.durationSeconds,
        durationFormatted: formatDuration(input.durationSeconds),
        transcript: input.transcript.slice(0, 50_000),
      }),
    },
  ];

  const response = await llm.chat(messages, {
    model: chapterMarkersPrompt.model,
    temperature: chapterMarkersPrompt.temperature,
    maxTokens: chapterMarkersPrompt.maxTokens,
  });

  const markers = chapterMarkersPrompt.parseResponse(response.content);
  const chapterText = markers.chapters
    .map((c) => `${c.timestamp} ${c.title}`)
    .join("\n");
  return [
    {
      type: "chapter_markers" as const,
      label: "Chapter Markers",
      content: chapterText,
      wordCount: chapterText.split(/\s+/).length,
      promptVersion: chapterMarkersPrompt.version,
    },
  ];
}

// ─── Helpers ────────────────────────────────────────────────────────

function getFirst5MinTranscript(segments: TranscriptSegment[]): string {
  const first5Min = segments.filter((s) => s.start < 300);
  return first5Min
    .map((s) => `[${s.speakerId}] ${s.text}`)
    .join("\n");
}

function detectContentType(speakers: Speaker[]): string {
  if (speakers.length === 0) return "monologue";
  if (speakers.length === 1) return "solo monologue";
  if (speakers.length === 2) return "podcast interview";
  return "panel discussion";
}

function mapSpeakerRole(
  speakerId: string,
  speakers: Speaker[],
): "host" | "guest" | "solo" | "unknown" {
  const speaker = speakers.find((s) => s.id === speakerId);
  return speaker?.role ?? "unknown";
}

async function loadTextContent(
  jobId: string,
  sourceFileKey: string | null,
): Promise<string> {
  if (!sourceFileKey) {
    throw new Error(`No source file key for text-only job ${jobId}`);
  }

  const storage = getStorageProvider();
  const buffer = await storage.download(sourceFileKey);
  const data = JSON.parse(buffer.toString("utf-8")) as {
    content?: string;
    text?: string;
  };
  return data.content ?? data.text ?? "";
}
