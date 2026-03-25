import { prisma } from "@/lib/db/client";
import { updateJobProgress, updateJobStatus } from "@/lib/db/job-progress";
import { getLLMProvider } from "@/lib/providers/llm-anthropic";
import { getStorageProvider } from "@/lib/providers/storage-supabase";
import { fireJobCompletedWebhook } from "@/lib/webhooks/dispatcher";
import { renderQueue } from "@/lib/queue/queues";
import {
  speakerRolesPrompt,
  customTemplatePrompt,
  type SpeakerRoleResult,
} from "@/prompts";
import { formatDuration } from "@/lib/utils/duration";
import { isDevMockMode, logMock, resolveProviderMode, logProvider } from "@/lib/dev-mode";
import { incrementLLMCallCount } from "@/lib/cost/guardrails";
import type { LLMProvider } from "@/lib/providers/llm";
import type { AnalyzeJobData, Speaker, TranscriptSegment, TextOutputType, WordTimestamp, GenerationOptions } from "@/types";

// Intelligence layer imports
import {
  chunkTranscriptSegments,
  chunkPlainText,
  detectClips,
  extractInsightsAndQuotes,
  generateTranscriptSummary,
} from "@/lib/intelligence";
import {
  linkedinPostPrompt,
  xThreadPrompt,
  newsletterSectionPrompt,
  chapterMarkersPrompt,
} from "@/prompts";

const TEXT_ONLY_SOURCES = ["article_url", "pdf_upload"];

/**
 * Analyze handler — runs LLM-powered clip detection and text generation.
 *
 * For video/audio: speaker roles → clip detection → insights/quotes → text generation (parallel)
 * For text-only: insights/quotes → text generation only (no clips)
 */
export async function handleAnalyzeJob(data: AnalyzeJobData): Promise<void> {
  const { jobId, sourceType } = data;

  try {
    await updateJobStatus(jobId, "analyzing");
    await updateJobProgress(jobId, "analyze", "running");

    const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });

    // Dedupe guard: if this job already has clips or text outputs, skip re-analysis.
    // Prevents burning paid LLM calls on repeated runs of the same source.
    // Pass FORCE_REANALYZE=true env var to override (for final verification).
    const existingClips = await prisma.clip.count({ where: { jobId } });
    const existingTexts = await prisma.textOutput.count({ where: { jobId } });
    if ((existingClips > 0 || existingTexts > 0) && process.env.FORCE_REANALYZE !== "true") {
      const msg = `Job ${jobId} already has ${existingClips} clips and ${existingTexts} text outputs — skipping re-analysis (set FORCE_REANALYZE=true to override)`;
      if (isDevMockMode()) {
        logMock("analyze", msg);
      } else {
        console.log(`[analyze] ${msg}`);
      }
      await updateJobProgress(jobId, "analyze", "complete", {
        skipped: true,
        existingClips,
        existingTexts,
      });
      await updateJobStatus(jobId, "complete");
      return;
    }

    const isTextOnly = TEXT_ONLY_SOURCES.includes(sourceType);

    // Resolve generation options from job record (set at creation time)
    const genOpts: GenerationOptions = {
      clips: true,
      linkedin: true,
      xThread: true,
      newsletter: true,
      summary: true,
      insights: true,
      quotes: true,
      chapterMarkers: true,
      customTemplates: true,
      ...(job.generationOptions as Partial<GenerationOptions> ?? {}),
      ...(data.generationOptions ?? {}),
    };

    // Resolve provider mode: per-job data > job record > env > default
    const effectiveMode = resolveProviderMode(
      data.providerMode ?? (job.providerMode as import("@/types").ProviderMode) ?? undefined,
    );
    logProvider("analyze", effectiveMode, `Job ${jobId} — mode: ${effectiveMode}`);

    const llm = getLLMProvider(effectiveMode);
    let llmCallCount = 0;

    let fullText: string;
    let speakers: Speaker[] = [];
    let segments: TranscriptSegment[] = [];
    let durationSeconds = 0;

    if (isTextOnly) {
      fullText = await loadTextContent(jobId, job.sourceFileKey);
    } else {
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

          await prisma.transcript.update({
            where: { jobId },
            data: { speakers: JSON.parse(JSON.stringify(speakers)) },
          });
        } catch (err) {
          console.warn(`[analyze] Speaker role detection failed for job ${jobId}:`, err);
        }
      } else if (speakers.length === 1) {
        speakers[0].role = "solo";
        await prisma.transcript.update({
          where: { jobId },
          data: { speakers: JSON.parse(JSON.stringify(speakers)) },
        });
      }

      // Step 2: Clip detection via intelligence layer (if enabled)
      if (genOpts.clips) {
        await updateJobProgress(jobId, "analyze", "running", {
          substep: "clip_scoring",
        });

        const clipResult = await detectClips(llm, {
          sourceTitle: job.sourceTitle ?? "Untitled",
          durationSeconds,
          contentType: detectContentType(speakers),
          speakers,
          transcript: fullText,
          minDuration: 30,
          maxDuration: 90,
          targetClips: 15,
        });
        llmCallCount++;

        // Store clips in DB with expanded score factors
        let sortOrder = 0;
        for (const clip of clipResult.clips) {
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
          clipsFound: clipResult.clips.length,
        });

        await prisma.job.update({
          where: { id: jobId },
          data: { clipCount: clipResult.clips.length },
        });
      } else {
        console.log(`[analyze] Clips disabled for job ${jobId} — skipping clip detection`);
      }
    }

    // Step 3: Intelligence extraction + text generation (parallel)
    await updateJobProgress(jobId, "analyze", "running", {
      substep: "text_generation",
    });

    // Chunk the content for intelligence processing
    const chunks = isTextOnly
      ? chunkPlainText(fullText.slice(0, 100_000))
      : chunkTranscriptSegments(segments, speakers);

    // Truncate content for text generation prompts
    const contentForText = fullText.slice(0, 100_000);

    // Build parallel tasks based on generation options
    const insightsEnabled = genOpts.insights || genOpts.quotes;
    const summaryEnabled = genOpts.summary;
    const textEnabled = genOpts.linkedin || genOpts.xThread || genOpts.newsletter || genOpts.chapterMarkers;

    // Track text generation progress
    let textsGenerated = 0;
    const textsTotal =
      (insightsEnabled ? 1 : 0) +
      (summaryEnabled ? 1 : 0) +
      (genOpts.linkedin ? 1 : 0) +
      (genOpts.xThread ? 1 : 0) +
      (genOpts.newsletter ? 1 : 0) +
      (genOpts.chapterMarkers && !isTextOnly && durationSeconds > 0 ? 1 : 0);

    const textErrors: { type: string; error: string }[] = [];

    const parallelTasks: [
      Promise<Awaited<ReturnType<typeof extractInsightsAndQuotes>> | null>,
      Promise<Awaited<ReturnType<typeof generateTranscriptSummary>> | null>,
      Promise<TextOutputRecord[]>,
    ] = [
      // Insights + quotes (if either enabled)
      insightsEnabled
        ? extractInsightsAndQuotes(llm, {
            sourceTitle: job.sourceTitle ?? "Untitled",
            sourceType,
            chunks,
            speakers,
            maxInsights: genOpts.insights ? 10 : 0,
            maxQuotes: genOpts.quotes ? 8 : 0,
          }).then((r) => {
            llmCallCount++;
            textsGenerated++;
            updateJobProgress(jobId, "analyze", "running", { substep: "text_generation", textsGenerated, textsTotal }).catch(() => {});
            return r;
          }).catch((err) => {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error(`[analyze] Insight/quote extraction failed for job ${jobId}:`, errMsg, err);
            textErrors.push({ type: "insights_quotes", error: errMsg });
            textsGenerated++;
            updateJobProgress(jobId, "analyze", "running", { substep: "text_generation", textsGenerated, textsTotal }).catch(() => {});
            return null;
          })
        : Promise.resolve(null),

      // Summary via intelligence layer
      summaryEnabled
        ? generateTranscriptSummary(llm, {
            sourceTitle: job.sourceTitle ?? "Untitled",
            sourceType,
            chunks,
            speakers,
          }).then((r) => {
            llmCallCount++;
            textsGenerated++;
            updateJobProgress(jobId, "analyze", "running", { substep: "text_generation", textsGenerated, textsTotal }).catch(() => {});
            return r;
          }).catch((err) => {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error(`[analyze] Summary generation failed for job ${jobId}:`, errMsg, err);
            textErrors.push({ type: "summary", error: errMsg });
            textsGenerated++;
            updateJobProgress(jobId, "analyze", "running", { substep: "text_generation", textsGenerated, textsTotal }).catch(() => {});
            return null;
          })
        : Promise.resolve(null),

      // Platform text outputs (filtered by genOpts inside) — each output fails independently inside
      textEnabled
        ? generateAllTextOutputs(llm, {
            sourceTitle: job.sourceTitle ?? "Untitled",
            sourceType,
            content: contentForText,
            speakers,
            isTextOnly,
            durationSeconds,
            transcript: fullText,
          }, genOpts, (count, errors) => {
            textsGenerated += count;
            textErrors.push(...errors);
            updateJobProgress(jobId, "analyze", "running", { substep: "text_generation", textsGenerated, textsTotal }).catch(() => {});
          })
        : Promise.resolve([]),
    ];

    const [insightsResult, summaryResult, textResults] = await Promise.all(parallelTasks);

    // Store all text outputs
    let textSortOrder = 0;

    // Store summary (from intelligence layer, replacing old flow)
    if (summaryResult) {
      await prisma.textOutput.create({
        data: {
          jobId,
          type: "summary",
          label: "Summary",
          content: `${summaryResult.summary}\n\nKey Insights:\n${summaryResult.keyInsights.map((i) => `- ${i}`).join("\n")}`,
          wordCount: summaryResult.wordCount,
          metadata: JSON.parse(JSON.stringify({ source: "intelligence_layer" })),
          sortOrder: textSortOrder++,
        },
      });
    }

    // Store insights as individual TextOutput rows
    if (insightsResult?.insights?.insights) {
      for (const insight of insightsResult.insights.insights) {
        await prisma.textOutput.create({
          data: {
            jobId,
            type: "key_insight",
            label: insight.tags?.[0]
              ? `Insight: ${insight.tags[0]}`
              : "Key Insight",
            content: insight.insight,
            wordCount: insight.insight.split(/\s+/).length,
            metadata: JSON.parse(JSON.stringify({
              significance: insight.significance,
              speakerId: insight.speakerId,
              approximateTimestamp: insight.approximateTimestamp,
              tags: insight.tags,
              confidence: insight.confidence,
              source: "intelligence_layer",
            })),
            sortOrder: textSortOrder++,
          },
        });
      }
    }

    // Store quotes as individual TextOutput rows
    if (insightsResult?.quotes?.quotes) {
      for (const quote of insightsResult.quotes.quotes) {
        await prisma.textOutput.create({
          data: {
            jobId,
            type: "notable_quote",
            label: `Quote: ${quote.speakerLabel ?? quote.speakerId}`,
            content: quote.quote,
            wordCount: quote.quote.split(/\s+/).length,
            metadata: JSON.parse(JSON.stringify({
              speakerId: quote.speakerId,
              speakerLabel: quote.speakerLabel,
              approximateTimestamp: quote.approximateTimestamp,
              context: quote.context,
              impact: quote.impact,
              socialReady: quote.socialReady,
              source: "intelligence_layer",
            })),
            sortOrder: textSortOrder++,
          },
        });
      }
    }

    // Store platform text outputs (LinkedIn, X, newsletter — summary excluded since it's handled above)
    for (const output of textResults) {
      // Skip summary — already stored from intelligence layer
      if (output.type === "summary") continue;

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

    // Step 4: Execute custom prompt templates (if enabled)
    let customOutputCount = 0;
    if (!genOpts.customTemplates) {
      console.log(`[analyze] Custom templates disabled for job ${jobId} — skipping`);
    }
    try {
      const customTemplates = genOpts.customTemplates
        ? await prisma.promptTemplate.findMany({
            where: { userId: job.userId, isActive: true },
          })
        : [];

      if (customTemplates.length > 0) {
        await updateJobProgress(jobId, "analyze", "running", {
          substep: "custom_templates",
          customTemplatesTotal: customTemplates.length,
        });

        for (const template of customTemplates) {
          try {
            const messages = [
              { role: "system" as const, content: customTemplatePrompt.system },
              {
                role: "user" as const,
                content: customTemplatePrompt.buildUserMessage({
                  sourceTitle: job.sourceTitle ?? "Untitled",
                  sourceType,
                  content: contentForText,
                  speakers: speakers.map((s) => ({
                    id: s.id,
                    label: s.label,
                    role: s.role,
                    talkTimePct: s.talkTimePct,
                  })),
                  templateName: template.name,
                  templatePrompt: template.promptText,
                }),
              },
            ];

            const response = await llm.chat(messages, {
              model: customTemplatePrompt.model,
              temperature: customTemplatePrompt.temperature,
              maxTokens: customTemplatePrompt.maxTokens,
            });

            const result = customTemplatePrompt.parseResponse(response.content);

            await prisma.textOutput.create({
              data: {
                jobId,
                type: template.outputType,
                label: template.name,
                content: result.content,
                wordCount: result.wordCount,
                promptTemplateId: template.id,
                metadata: JSON.parse(
                  JSON.stringify({ promptVersion: customTemplatePrompt.version, templateId: template.id }),
                ),
                sortOrder: textSortOrder++,
              },
            });

            await prisma.promptTemplate.update({
              where: { id: template.id },
              data: { usageCount: { increment: 1 } },
            });

            customOutputCount++;
          } catch (templateErr) {
            console.warn(
              `[analyze] Custom template "${template.name}" (${template.id}) failed for job ${jobId}:`,
              templateErr,
            );
          }
        }
      }
    } catch (customErr) {
      console.warn(
        `[analyze] Failed to fetch/execute custom templates for job ${jobId}:`,
        customErr,
      );
    }

    // Count total text outputs stored
    const insightCount = insightsResult?.insights?.insights?.length ?? 0;
    const quoteCount = insightsResult?.quotes?.quotes?.length ?? 0;
    const summaryCount = summaryResult ? 1 : 0;
    const platformTextCount = textResults.filter((t) => t.type !== "summary").length;
    const totalTextOutputs = summaryCount + insightCount + quoteCount + platformTextCount + customOutputCount;

    // Track LLM call count for cost guardrails
    await incrementLLMCallCount(jobId, llmCallCount).catch(() => {});

    await prisma.job.update({
      where: { id: jobId },
      data: { textOutputCount: totalTextOutputs },
    });

    await updateJobProgress(jobId, "analyze", "complete", {
      clipsFound: isTextOnly ? 0 : undefined,
      textsGenerated: totalTextOutputs,
      insightsExtracted: insightCount,
      quotesExtracted: quoteCount,
      customTemplatesRun: customOutputCount,
      ...(textErrors.length > 0 ? { textErrors } : {}),
    });

    if (isTextOnly) {
      await updateJobStatus(jobId, "complete");

      await fireJobCompletedWebhook(jobId, {
        status: "complete",
        clipCount: 0,
        textOutputCount: totalTextOutputs,
        sourceTitle: job.sourceTitle,
      }).catch((err) => {
        console.warn(`[analyze] Webhook dispatch failed for job ${jobId}:`, err);
      });
    } else {
      // ── Original render fan-out (disabled for vertical slice testing) ──
      // const transcript = await prisma.transcript.findUnique({
      //   where: { jobId },
      //   select: { wordTimestamps: true },
      // });
      // const allWordTimestamps = (transcript?.wordTimestamps ?? []) as unknown as WordTimestamp[];
      //
      // const speakerColorMap: Record<string, string> = {};
      // for (const speaker of speakers) {
      //   speakerColorMap[speaker.id] =
      //     speaker.role === "host" || speaker.role === "solo"
      //       ? "&H004646E5"
      //       : "&H00FFFF00";
      // }
      //
      // const createdClips = await prisma.clip.findMany({
      //   where: { jobId },
      //   select: { id: true, startTime: true, endTime: true, captionStyle: true },
      // });
      //
      // await updateJobStatus(jobId, "rendering");
      // await updateJobProgress(jobId, "render", "running", {
      //   clips_rendered: 0,
      //   clips_total: createdClips.length,
      // });
      //
      // for (const clip of createdClips) {
      //   await renderQueue().add(
      //     "render",
      //     {
      //       jobId,
      //       clipId: clip.id,
      //       sourceFileKey: job.sourceFileKey!,
      //       startTime: clip.startTime,
      //       endTime: clip.endTime,
      //       aspectRatios: ["9x16", "1x1", "16x9"],
      //       captionStyle: clip.captionStyle ?? "karaoke",
      //       wordTimestamps: allWordTimestamps,
      //       speakerColors: speakerColorMap,
      //     },
      //     {
      //       jobId: `render-${clip.id}`,
      //     },
      //   );
      // }
      //
      // console.log(
      //   `[analyze] Enqueued ${createdClips.length} render jobs for job ${jobId}`,
      // );

      // Skip render for now — mark complete after analysis
      const createdClips = await prisma.clip.findMany({
        where: { jobId },
        select: { id: true },
      });

      await updateJobProgress(jobId, 'render', 'skipped');
      await updateJobStatus(jobId, 'complete');

      await fireJobCompletedWebhook(jobId, {
        status: 'complete',
        clipCount: createdClips.length,
        textOutputCount: totalTextOutputs,
        sourceTitle: job.sourceTitle,
      }).catch(() => {});
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

// ─── Text Generation (platform-specific outputs) ───────────────────

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
  genOpts?: GenerationOptions,
  onProgress?: (completedCount: number, errors: { type: string; error: string }[]) => void,
): Promise<TextOutputRecord[]> {
  const results: TextOutputRecord[] = [];
  const opts = genOpts ?? {
    clips: true, linkedin: true, xThread: true, newsletter: true,
    summary: true, insights: true, quotes: true, chapterMarkers: true, customTemplates: true,
  };

  interface LabeledTask {
    type: string;
    promise: Promise<TextOutputRecord[]>;
  }

  const tasks: LabeledTask[] = [];

  if (opts.linkedin) {
    tasks.push({ type: "linkedin", promise: generateLinkedinPosts(llm, input) });
  }
  if (opts.xThread) {
    tasks.push({ type: "x_thread", promise: generateXThreads(llm, input) });
  }
  if (opts.newsletter) {
    tasks.push({ type: "newsletter", promise: generateNewsletterSections(llm, input) });
  }

  // Chapter markers only for video/audio with timestamps
  if (opts.chapterMarkers && !input.isTextOnly && input.durationSeconds > 0) {
    tasks.push({ type: "chapter_markers", promise: generateChapterMarkers(llm, input) });
  }

  if (tasks.length === 0) return results;

  const settled = await Promise.allSettled(tasks.map((t) => t.promise));

  let completedCount = 0;
  const errors: { type: string; error: string }[] = [];

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    const taskType = tasks[i].type;
    completedCount++;

    try {
      if (result.status === "fulfilled" && Array.isArray(result.value)) {
        results.push(...result.value);
      } else if (result.status === "rejected") {
        const errMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        console.error(`[analyze] Text generation failed for ${taskType}:`, errMsg, result.reason);
        errors.push({ type: taskType, error: errMsg });
      }
    } catch (iterErr) {
      const errMsg = iterErr instanceof Error ? iterErr.message : String(iterErr);
      console.error(`[analyze] Error processing text generation result for ${taskType}:`, errMsg, iterErr);
      errors.push({ type: taskType, error: errMsg });
    }
  }

  if (onProgress) {
    onProgress(completedCount, errors);
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
