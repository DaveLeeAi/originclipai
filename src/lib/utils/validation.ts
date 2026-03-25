import { z } from "zod";

/** Validate a YouTube URL */
export const youtubeUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => {
      const patterns = [
        /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
        /^https?:\/\/youtu\.be\/[\w-]+/,
        /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]+/,
      ];
      return patterns.some((p) => p.test(url));
    },
    { message: "Invalid YouTube URL" },
  );

/** Validate a generic video URL */
export const videoUrlSchema = z.string().url();

/** Generation options — controls which outputs the analyze worker produces */
export const generationOptionsSchema = z.object({
  clips: z.boolean().default(true),
  linkedin: z.boolean().default(true),
  xThread: z.boolean().default(true),
  newsletter: z.boolean().default(true),
  summary: z.boolean().default(true),
  insights: z.boolean().default(true),
  quotes: z.boolean().default(true),
  chapterMarkers: z.boolean().default(true),
  customTemplates: z.boolean().default(true),
}).partial();

/** Provider mode — which LLM backend to use */
export const providerModeSchema = z.enum(["mock", "gemini-dev", "anthropic-prod"]).default("anthropic-prod");

/** Shared fields for cost control, added to every source type variant */
const costControlFields = {
  generationOptions: generationOptionsSchema.optional(),
  providerMode: providerModeSchema.optional(),
};

/** Job creation request schema */
export const createJobSchema = z.discriminatedUnion("sourceType", [
  z.object({
    sourceType: z.literal("youtube_url"),
    sourceUrl: youtubeUrlSchema,
    ...costControlFields,
  }),
  z.object({
    sourceType: z.literal("video_url"),
    sourceUrl: videoUrlSchema,
    ...costControlFields,
  }),
  z.object({
    sourceType: z.literal("video_upload"),
    sourceFileKey: z.string().min(1),
    ...costControlFields,
  }),
  z.object({
    sourceType: z.literal("audio_upload"),
    sourceFileKey: z.string().min(1),
    ...costControlFields,
  }),
  z.object({
    sourceType: z.literal("article_url"),
    sourceUrl: z.string().url(),
    ...costControlFields,
  }),
  z.object({
    sourceType: z.literal("pdf_upload"),
    sourceFileKey: z.string().min(1),
    ...costControlFields,
  }),
]);

export type CreateJobInput = z.infer<typeof createJobSchema>;

/** Cost estimate request schema */
export const costEstimateSchema = z.object({
  sourceType: z.enum(["youtube_url", "video_url", "video_upload", "audio_upload", "article_url", "pdf_upload"]),
  estimatedDurationMinutes: z.number().min(0).max(480).optional(),
  generationOptions: generationOptionsSchema.optional(),
  providerMode: providerModeSchema.optional(),
});

export type CostEstimateInput = z.infer<typeof costEstimateSchema>;

/** Stage rerun request schema */
export const stageRerunSchema = z.object({
  stage: z.enum(["transcribe", "analyze", "render"]),
  generationOptions: generationOptionsSchema.optional(),
  providerMode: providerModeSchema.optional(),
});

export type StageRerunInput = z.infer<typeof stageRerunSchema>;
