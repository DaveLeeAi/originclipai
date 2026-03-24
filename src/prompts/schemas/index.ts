// src/prompts/schemas/index.ts

import { z } from 'zod';

// ============================================================
// CLIP ANALYSIS
// ============================================================

export const scoreFactorsSchema = z.object({
  coherence: z.number().int().min(0).max(100),
  hookStrength: z.number().int().min(0).max(100),
  topicClarity: z.number().int().min(0).max(100),
  emotionalEnergy: z.number().int().min(0).max(100),
});

export const clipCandidateSchema = z.object({
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  duration: z.number().min(10).max(180),
  title: z.string().min(3).max(200),
  hook: z.string().max(300).optional().nullable(),
  transcriptExcerpt: z.string().min(10),
  score: z.number().int().min(0).max(100),
  scoreFactors: scoreFactorsSchema,
  primarySpeakerId: z.string(),
  speakersPresent: z.array(
    z.object({
      id: z.string(),
      talkPct: z.number().min(0).max(100),
    })
  ),
  topics: z.array(z.string()).max(5),
  socialCaption: z.string().max(500).optional().nullable(),
});

export const clipAnalysisResponseSchema = z.array(clipCandidateSchema).min(1).max(30);

export type ScoreFactors = z.infer<typeof scoreFactorsSchema>;
export type ClipCandidate = z.infer<typeof clipCandidateSchema>;

// ============================================================
// SPEAKER ROLES
// ============================================================

export const speakerRoleResultSchema = z.object({
  speakers: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['host', 'guest', 'co_host', 'solo', 'unknown']),
      confidence: z.number().min(0).max(1),
      reasoning: z.string(),
    })
  ),
});

export type SpeakerRoleResult = z.infer<typeof speakerRoleResultSchema>;

// ============================================================
// LINKEDIN POST
// ============================================================

export const linkedinPostSchema = z.object({
  content: z.string().min(50).max(3000),
  wordCount: z.number().int().min(30).max(500),
  focusTopic: z.string().min(3).max(200),
  hookLine: z.string().min(5).max(200),
});

export const linkedinPostsResponseSchema = z.array(linkedinPostSchema).min(1).max(5);

export type LinkedinPost = z.infer<typeof linkedinPostSchema>;

// ============================================================
// X THREAD
// ============================================================

export const threadPostSchema = z.object({
  postNumber: z.number().int().min(1),
  text: z.string().min(5).max(280),
});

export const xThreadSchema = z.object({
  threadPosts: z.array(threadPostSchema).min(3).max(15),
  postCount: z.number().int().min(3).max(15),
  wordCount: z.number().int(),
  focusTopic: z.string().min(3).max(200),
});

export const xThreadsResponseSchema = z.array(xThreadSchema).min(1).max(3);

export type ThreadPost = z.infer<typeof threadPostSchema>;
export type XThread = z.infer<typeof xThreadSchema>;

// ============================================================
// NEWSLETTER SECTION
// ============================================================

export const newsletterSectionSchema = z.object({
  content: z.string().min(100).max(5000),
  wordCount: z.number().int().min(80).max(1000),
  sectionTitle: z.string().min(3).max(200),
  focusTopic: z.string().min(3).max(200),
});

export const newsletterSectionsResponseSchema = z.array(newsletterSectionSchema).min(1).max(3);

export type NewsletterSection = z.infer<typeof newsletterSectionSchema>;

// ============================================================
// SUMMARY
// ============================================================

export const summarySchema = z.object({
  summary: z.string().min(50).max(3000),
  keyInsights: z.array(z.string().min(5).max(300)).min(2).max(10),
  wordCount: z.number().int(),
});

export type Summary = z.infer<typeof summarySchema>;

// ============================================================
// CHAPTER MARKERS
// ============================================================

export const chapterMarkerSchema = z.object({
  timestamp: z.string().regex(/^\d+:\d{2}(:\d{2})?$/),
  title: z.string().min(3).max(100),
});

export const chapterMarkersSchema = z.object({
  chapters: z.array(chapterMarkerSchema).min(3).max(20),
});

export type ChapterMarker = z.infer<typeof chapterMarkerSchema>;
export type ChapterMarkers = z.infer<typeof chapterMarkersSchema>;

// ============================================================
// TEXT REFINEMENT
// ============================================================

export const refinementResultSchema = z.object({
  refinedText: z.string().min(10),
  wordCount: z.number().int(),
  changesMade: z.string().min(5).max(500),
});

export type RefinementResult = z.infer<typeof refinementResultSchema>;

// ============================================================
// BLOG DRAFT
// ============================================================

export const blogDraftSchema = z.object({
  title: z.string().min(5).max(200),
  content: z.string().min(200).max(15000),
  wordCount: z.number().int().min(200).max(2000),
  sections: z.array(z.string()).min(2).max(10),
  metaDescription: z.string().min(50).max(160),
});

export type BlogDraft = z.infer<typeof blogDraftSchema>;
