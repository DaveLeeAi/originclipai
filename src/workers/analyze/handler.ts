import { prisma } from "@/lib/db/client";
import { updateJobProgress, updateJobStatus } from "@/lib/db/job-progress";
import { getLLMProvider } from "@/lib/providers/llm-anthropic";
import { getStorageProvider } from "@/lib/providers/storage-supabase";
import { fireJobCompletedWebhook } from "@/lib/webhooks/dispatcher";
import {
  clipAnalysisPrompt,
  speakerRolesPrompt,
  linkedinPostPrompt,
  xThreadPrompt,
  newsletterSectionPrompt,
  summaryPrompt,
  chapterMarkersPrompt,
  type ClipCandidateOutput,
  type SpeakerRoleOutput,
} from "@/prompts";
import { formatDuration } from "@/lib/utils/duration";
import type { AnalyzeJobData, Speaker, TranscriptSegment, TextOutputType } from "@/types";

const TEXT_ONLY_SOURCES = ["article_url", "pdf_upload"];

/**
 * Analyze handler — runs LLM-powered clip detection and text generation.
 *
 * For video/audio: speaker roles → clip analysis → text generation (parallel)
 * For text-only: text generation only (no clips)
 */
export async function handleAnalyzeJob(data: AnalyzeJobData): Promise<void> {
  const { jobId, transcriptId, sourceType } = data;

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
          const roles = await detectSpeakerRoles(llm, speakers, first5MinText);
          speakers = applySpeakerRoles(speakers, roles);

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

    const speakerInfo = speakers
      .map((s) => `${s.label} (${s.role}, ${s.talkTimePct}% talk time)`)
      .join(", ");

    // Truncate content for text generation prompts (keep under ~100K chars)
    const contentForText = fullText.slice(0, 100_000);

    const textResults = await generateAllTextOutputs(llm, {
      sourceTitle: job.sourceTitle ?? "Untitled",
      sourceType,
      content: contentForText,
      speakerInfo,
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

    // For text-only sources: mark complete. For video/audio: would go to rendering (Phase 2).
    // In Phase 1 (no render worker), mark all jobs as complete after analyze.
    await updateJobStatus(jobId, "complete");

    // Fire webhook
    const clipCount = isTextOnly
      ? 0
      : await prisma.clip.count({ where: { jobId } });
    await fireJobCompletedWebhook(jobId, {
      status: "complete",
      clipCount,
      textOutputCount: textResults.length,
      sourceTitle: job.sourceTitle,
    }).catch((err) => {
      console.warn(`[analyze] Webhook dispatch failed for job ${jobId}:`, err);
    });
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
  llm: ReturnType<typeof getLLMProvider>,
  speakers: Speaker[],
  first5MinText: string,
): Promise<SpeakerRoleOutput[]> {
  const messages = [
    { role: "system" as const, content: speakerRolesPrompt.system },
    {
      role: "user" as const,
      content: speakerRolesPrompt.buildUserMessage({
        speakers,
        transcriptFirst5Min: first5MinText,
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
  roles: SpeakerRoleOutput[],
): Speaker[] {
  return speakers.map((s) => {
    const detected = roles.find((r) => r.id === s.id);
    if (detected) {
      const role = detected.role === "co-host" ? "host" : detected.role;
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
  llm: ReturnType<typeof getLLMProvider>,
  input: ClipAnalysisInput,
): Promise<ClipCandidateOutput[]> {
  const messages = [
    { role: "system" as const, content: clipAnalysisPrompt.system },
    {
      role: "user" as const,
      content: clipAnalysisPrompt.buildUserMessage({
        ...input,
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
  speakerInfo: string;
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
  llm: ReturnType<typeof getLLMProvider>,
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
  llm: ReturnType<typeof getLLMProvider>,
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
        speakerInfo: input.speakerInfo,
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
    type: "linkedin_post",
    label: `LinkedIn Post ${i + 1}: ${post.focusTopic}`,
    content: post.content,
    wordCount: post.wordCount,
    promptVersion: linkedinPostPrompt.version,
  }));
}

async function generateXThreads(
  llm: ReturnType<typeof getLLMProvider>,
  input: TextGenerationInput,
): Promise<TextOutputRecord[]> {
  const messages = [
    { role: "system" as const, content: xThreadPrompt.system },
    {
      role: "user" as const,
      content: xThreadPrompt.buildUserMessage({
        sourceTitle: input.sourceTitle,
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
    type: "x_thread",
    label: `X Thread ${i + 1}: ${thread.focusTopic}`,
    content: thread.threadPosts.map((p) => p.text).join("\n\n"),
    wordCount: thread.wordCount,
    threadPosts: thread.threadPosts,
    promptVersion: xThreadPrompt.version,
  }));
}

async function generateNewsletterSections(
  llm: ReturnType<typeof getLLMProvider>,
  input: TextGenerationInput,
): Promise<TextOutputRecord[]> {
  const messages = [
    { role: "system" as const, content: newsletterSectionPrompt.system },
    {
      role: "user" as const,
      content: newsletterSectionPrompt.buildUserMessage({
        sourceTitle: input.sourceTitle,
        sourceType: input.sourceType,
        speakerInfo: input.speakerInfo,
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
    type: "newsletter_section",
    label: section.sectionTitle || `Newsletter Section ${i + 1}`,
    content: section.content,
    wordCount: section.wordCount,
    promptVersion: newsletterSectionPrompt.version,
  }));
}

async function generateSummary(
  llm: ReturnType<typeof getLLMProvider>,
  input: TextGenerationInput,
): Promise<TextOutputRecord[]> {
  const messages = [
    { role: "system" as const, content: summaryPrompt.system },
    {
      role: "user" as const,
      content: summaryPrompt.buildUserMessage({
        sourceTitle: input.sourceTitle,
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
      type: "summary",
      label: "Summary",
      content: `${summary.summary}\n\nKey Insights:\n${summary.keyInsights.map((i) => `- ${i}`).join("\n")}`,
      wordCount: summary.wordCount,
      promptVersion: summaryPrompt.version,
    },
  ];
}

async function generateChapterMarkers(
  llm: ReturnType<typeof getLLMProvider>,
  input: TextGenerationInput,
): Promise<TextOutputRecord[]> {
  const messages = [
    { role: "system" as const, content: chapterMarkersPrompt.system },
    {
      role: "user" as const,
      content: chapterMarkersPrompt.buildUserMessage({
        sourceTitle: input.sourceTitle,
        duration: formatDuration(input.durationSeconds),
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
      type: "chapter_markers",
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
