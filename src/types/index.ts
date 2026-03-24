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
