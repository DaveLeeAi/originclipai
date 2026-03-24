import { AssemblyAI } from "assemblyai";
import type {
  TranscriptionProvider,
  TranscriptionResult,
  TranscriptionOptions,
} from "./transcription";
import type { TranscriptSegment, Speaker, WordTimestamp } from "@/types";

/**
 * AssemblyAI transcription provider — used as fallback when Whisper fails.
 * Provides native speaker diarization and word-level timestamps.
 */
export class AssemblyAIProvider implements TranscriptionProvider {
  readonly name = "assemblyai";
  private client: AssemblyAI;

  constructor() {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      throw new Error("ASSEMBLYAI_API_KEY is required for AssemblyAIProvider");
    }
    this.client = new AssemblyAI({ apiKey });
  }

  async transcribe(
    audioUrl: string,
    options?: TranscriptionOptions,
  ): Promise<TranscriptionResult> {
    const transcript = await this.client.transcripts.transcribe({
      audio_url: audioUrl,
      speaker_labels: options?.enableDiarization !== false,
      language_code: (options?.language as "en") ?? undefined,
      word_boost: [],
    });

    if (transcript.status === "error") {
      throw new Error(
        `AssemblyAI transcription failed: ${transcript.error ?? "unknown error"}`,
      );
    }

    return this.parseTranscript({
      text: transcript.text ?? undefined,
      status: transcript.status,
      error: transcript.error ?? undefined,
      utterances: transcript.utterances?.map((u) => ({
        speaker: u.speaker ?? undefined,
        text: u.text,
        start: u.start,
        end: u.end,
        confidence: u.confidence,
        words: u.words?.map((w) => ({
          text: w.text,
          start: w.start,
          end: w.end,
          speaker: w.speaker ?? undefined,
          confidence: w.confidence,
        })),
      })),
      words: transcript.words?.map((w) => ({
        text: w.text,
        start: w.start,
        end: w.end,
        speaker: w.speaker ?? undefined,
        confidence: w.confidence,
      })),
      audio_duration: transcript.audio_duration ?? undefined,
      language_code: transcript.language_code ?? undefined,
      confidence: transcript.confidence ?? undefined,
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      return !!process.env.ASSEMBLYAI_API_KEY;
    } catch {
      return false;
    }
  }

  private parseTranscript(transcript: AssemblyAITranscriptResult): TranscriptionResult {
    const fullText = transcript.text ?? "";
    const speakerMap = new Map<string, SpeakerAccumulator>();
    const segments: TranscriptSegment[] = [];
    const wordTimestamps: WordTimestamp[] = [];

    // Build segments from utterances (speaker-labeled chunks)
    if (transcript.utterances) {
      for (const utterance of transcript.utterances) {
        const speakerId = utterance.speaker ?? "S0";
        const start = (utterance.start ?? 0) / 1000; // ms to seconds
        const end = (utterance.end ?? 0) / 1000;

        segments.push({
          start,
          end,
          text: utterance.text?.trim() ?? "",
          speakerId,
          confidence: utterance.confidence ?? 0.9,
        });

        // Accumulate speaker talk time
        if (!speakerMap.has(speakerId)) {
          speakerMap.set(speakerId, { talkTime: 0, label: speakerId });
        }
        const acc = speakerMap.get(speakerId)!;
        acc.talkTime += end - start;

        // Word-level timestamps from utterance words
        if (utterance.words) {
          for (const w of utterance.words) {
            wordTimestamps.push({
              word: w.text ?? "",
              start: (w.start ?? 0) / 1000,
              end: (w.end ?? 0) / 1000,
              speakerId,
            });
          }
        }
      }
    }

    // Fallback: if no utterances, use words directly
    if (segments.length === 0 && transcript.words) {
      let currentSegmentStart = 0;
      let currentSegmentText = "";
      let currentSpeaker = "S0";

      for (const w of transcript.words) {
        const speakerId = w.speaker ?? "S0";
        const wStart = (w.start ?? 0) / 1000;
        const wEnd = (w.end ?? 0) / 1000;

        wordTimestamps.push({
          word: w.text ?? "",
          start: wStart,
          end: wEnd,
          speakerId,
        });

        // Accumulate speaker talk time
        if (!speakerMap.has(speakerId)) {
          speakerMap.set(speakerId, { talkTime: 0, label: speakerId });
        }
        speakerMap.get(speakerId)!.talkTime += wEnd - wStart;

        // Build segments from word boundaries (split on speaker change or long pause)
        if (speakerId !== currentSpeaker || wStart - (segments[segments.length - 1]?.end ?? 0) > 2) {
          if (currentSegmentText) {
            segments.push({
              start: currentSegmentStart,
              end: (w.start ?? 0) / 1000,
              text: currentSegmentText.trim(),
              speakerId: currentSpeaker,
              confidence: 0.9,
            });
          }
          currentSegmentStart = wStart;
          currentSegmentText = "";
          currentSpeaker = speakerId;
        }
        currentSegmentText += ` ${w.text ?? ""}`;
      }

      // Push final segment
      if (currentSegmentText) {
        segments.push({
          start: currentSegmentStart,
          end: wordTimestamps[wordTimestamps.length - 1]?.end ?? 0,
          text: currentSegmentText.trim(),
          speakerId: currentSpeaker,
          confidence: 0.9,
        });
      }
    }

    // Build speakers array
    const totalTalkTime = Array.from(speakerMap.values()).reduce(
      (sum, s) => sum + s.talkTime,
      0,
    );
    const speakers: Speaker[] = Array.from(speakerMap.entries()).map(
      ([id, acc]) => ({
        id,
        label: acc.label,
        role: "unknown" as const,
        talkTimePct:
          totalTalkTime > 0
            ? Math.round((acc.talkTime / totalTalkTime) * 100)
            : 0,
        talkTimeSeconds: Math.round(acc.talkTime),
      }),
    );

    const durationSeconds = (transcript.audio_duration ?? 0);
    const words = fullText.split(/\s+/).filter(Boolean);

    return {
      fullText,
      segments,
      speakers,
      wordTimestamps,
      language: transcript.language_code ?? "en",
      durationSeconds,
      wordCount: words.length,
      confidenceAvg: transcript.confidence ?? 0.9,
    };
  }
}

// ─── AssemblyAI response types ──────────────────────────────────────

interface SpeakerAccumulator {
  talkTime: number;
  label: string;
}

interface AssemblyAITranscriptResult {
  text?: string;
  status: string;
  error?: string;
  utterances?: AssemblyAIUtterance[];
  words?: AssemblyAIWord[];
  audio_duration?: number;
  language_code?: string;
  confidence?: number;
}

interface AssemblyAIUtterance {
  speaker?: string;
  text?: string;
  start?: number;
  end?: number;
  confidence?: number;
  words?: AssemblyAIWord[];
}

interface AssemblyAIWord {
  text?: string;
  start?: number;
  end?: number;
  speaker?: string;
  confidence?: number;
}
