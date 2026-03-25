// ─── Source Types ────────────────────────────────────────────────────

export type SourceType =
  | "youtube_url"
  | "video_url"
  | "video_upload"
  | "audio_upload"
  | "article_url"
  | "pdf_upload";

export type JobStatus =
  | "created"
  | "ingesting"
  | "transcribing"
  | "analyzing"
  | "rendering"
  | "complete"
  | "failed"
  | "cancelled";

export type ClipStatus = "review" | "approved" | "rejected";

export type SpeakerRole = "host" | "guest" | "solo" | "unknown";

export type TextOutputType =
  | "linkedin_post"
  | "x_thread"
  | "newsletter_section"
  | "summary"
  | "chapter_markers"
  | "social_caption"
  | "blog_draft"
  | "show_notes"
  | "key_insight"
  | "notable_quote"
  | "custom";

export type TextOutputStatus = "draft" | "approved" | "scheduled" | "posted";

export type Platform =
  | "youtube"
  | "tiktok"
  | "linkedin"
  | "x"
  | "instagram"
  | "facebook";

export type PostStatus =
  | "queued"
  | "posting"
  | "posted"
  | "failed"
  | "cancelled";

export type PlanType = "free" | "creator" | "pro" | "business";

// ─── Queue Job Payloads ─────────────────────────────────────────────

export interface IngestJobData {
  jobId: string;
  sourceType: SourceType;
  sourceUrl?: string;
  sourceFileKey?: string;
}

export interface TranscribeJobData {
  jobId: string;
  sourceFileKey: string;
  engine: "whisper" | "assemblyai";
  language?: string;
}

export interface AnalyzeJobData {
  jobId: string;
  transcriptId: string;
  sourceType: SourceType;
  sourceText?: string;
  customPromptIds?: string[];
  generationOptions?: GenerationOptions;
  providerMode?: ProviderMode;
}

export interface RenderJobData {
  jobId: string;
  clipId: string;
  sourceFileKey: string;
  startTime: number;
  endTime: number;
  aspectRatios: AspectRatio[];
  captionStyle: string;
  wordTimestamps: WordTimestamp[];
  speakerColors: Record<string, string>;
}

export interface ScheduleJobData {
  scheduledPostId: string;
  platform: Platform;
  socialConnectionId: string;
  clipId?: string;
  textOutputId?: string;
}

export interface ExportJobData {
  jobId: string;
  userId: string;
  exportType: "single_clip" | "all_clips" | "all_texts" | "full_package";
  clipId?: string;
  format?: "zip" | "tar";
}

// ─── Job Progress ───────────────────────────────────────────────────

export type StepStatus =
  | "pending"
  | "running"
  | "complete"
  | "error"
  | "skipped";

export interface JobProgress {
  ingest: StepStatus;
  transcribe: StepStatus;
  analyze: StepStatus;
  render: StepStatus;
  details?: {
    transcribe_pct?: number;
    clips_rendered?: number;
    clips_total?: number;
    speakers_found?: number;
  };
}

// ─── Transcript Types ───────────────────────────────────────────────

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speakerId: string;
  confidence: number;
}

export interface Speaker {
  id: string;
  label: string;
  role: SpeakerRole;
  talkTimePct: number;
  talkTimeSeconds: number;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  speakerId: string;
}

// ─── Clip Types ─────────────────────────────────────────────────────

export type AspectRatio = "9x16" | "1x1" | "16x9";

export interface ClipCandidate {
  startTime: number;
  endTime: number;
  title: string;
  hook: string;
  transcriptExcerpt: string;
  score: number;
  scoreFactors: ScoreFactors;
  primarySpeakerId: string;
  speakerRole: SpeakerRole;
  speakersPresent: { id: string; talkPct: number }[];
  socialCaption: string;
  hashtags: string[];
}

export interface ScoreFactors {
  coherence: number;
  hookStrength: number;
  topicClarity: number;
  emotionalEnergy: number;
}

// ─── Cost Control Types ─────────────────────────────────────────────

/**
 * Controls which outputs the analyze worker generates.
 * All default to true — set false to skip and save LLM cost.
 */
export interface GenerationOptions {
  clips: boolean;
  linkedin: boolean;
  xThread: boolean;
  newsletter: boolean;
  summary: boolean;
  insights: boolean;
  quotes: boolean;
  chapterMarkers: boolean;
  customTemplates: boolean;
}

export const DEFAULT_GENERATION_OPTIONS: GenerationOptions = {
  clips: true,
  linkedin: true,
  xThread: true,
  newsletter: true,
  summary: true,
  insights: true,
  quotes: true,
  chapterMarkers: true,
  customTemplates: true,
};

/**
 * Provider mode determines which LLM backend is used.
 * - mock: fixture data, zero cost
 * - gemini-dev: Gemini Flash, cheap dev/iteration
 * - anthropic-prod: Claude Sonnet, production quality
 */
export type ProviderMode = "mock" | "gemini-dev" | "anthropic-prod";

/**
 * Estimated cost breakdown for a job before submission.
 */
export interface CostEstimate {
  transcription: { calls: number; estimatedCost: number };
  analysis: { calls: number; estimatedCost: number };
  textGeneration: { calls: number; estimatedCost: number };
  total: number;
  currency: "USD";
  warnings: string[];
}

/**
 * Daily usage stats for guardrail enforcement.
 */
export interface UsageStats {
  llmCallsToday: number;
  llmCallsLimit: number;
  estimatedCostToday: number;
  costLimitDaily: number;
  jobsToday: number;
}

// ─── Webhook Types ──────────────────────────────────────────────────

export type WebhookEvent =
  | "job.completed"
  | "clip.rendered"
  | "post.published"
  | "post.failed";

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}
