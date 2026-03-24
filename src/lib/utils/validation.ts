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

/** Job creation request schema */
export const createJobSchema = z.discriminatedUnion("sourceType", [
  z.object({
    sourceType: z.literal("youtube_url"),
    sourceUrl: youtubeUrlSchema,
  }),
  z.object({
    sourceType: z.literal("video_url"),
    sourceUrl: videoUrlSchema,
  }),
  z.object({
    sourceType: z.literal("video_upload"),
    sourceFileKey: z.string().min(1),
  }),
  z.object({
    sourceType: z.literal("audio_upload"),
    sourceFileKey: z.string().min(1),
  }),
  z.object({
    sourceType: z.literal("article_url"),
    sourceUrl: z.string().url(),
  }),
  z.object({
    sourceType: z.literal("pdf_upload"),
    sourceFileKey: z.string().min(1),
  }),
]);

export type CreateJobInput = z.infer<typeof createJobSchema>;
