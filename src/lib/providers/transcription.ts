import type { TranscriptSegment, Speaker, WordTimestamp } from "@/types";

// ─── Transcription Provider Interface ───────────────────────────────

export interface TranscriptionResult {
  fullText: string;
  segments: TranscriptSegment[];
  speakers: Speaker[];
  wordTimestamps: WordTimestamp[];
  language: string;
  durationSeconds: number;
  wordCount: number;
  confidenceAvg: number;
}

export interface TranscriptionOptions {
  language?: string;
  enableDiarization?: boolean;
  maxSpeakers?: number;
}

export interface TranscriptionProvider {
  readonly name: string;

  /**
   * Transcribe an audio file and return structured transcript data.
   * @param audioPath - Path or storage key to the audio file
   * @param options - Transcription configuration options
   */
  transcribe(
    audioPath: string,
    options?: TranscriptionOptions,
  ): Promise<TranscriptionResult>;

  /**
   * Check if the provider is available and properly configured.
   */
  isAvailable(): Promise<boolean>;
}
