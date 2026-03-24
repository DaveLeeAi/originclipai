import Replicate from "replicate";
import type {
  TranscriptionProvider,
  TranscriptionResult,
  TranscriptionOptions,
} from "./transcription";
import type { TranscriptSegment, Speaker, WordTimestamp } from "@/types";

/**
 * Whisper transcription via Replicate serverless GPU.
 * Uses whisper-large-v3 model for best accuracy.
 */
export class WhisperProvider implements TranscriptionProvider {
  readonly name = "whisper";
  private client: Replicate;

  constructor() {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      throw new Error("REPLICATE_API_TOKEN is required for WhisperProvider");
    }
    this.client = new Replicate({ auth: token });
  }

  async transcribe(
    audioUrl: string,
    options?: TranscriptionOptions,
  ): Promise<TranscriptionResult> {
    const output = (await this.client.run(
      "vaibhavs10/incredibly-fast-whisper:3ab86df6c8f54c11309d4d1f930ac292bad43ace52d10c80d87eb258b3c9f79c" as `${string}/${string}:${string}`,
      {
        input: {
          audio: audioUrl,
          language: options?.language ?? "None",
          batch_size: 24,
          timestamp: "word",
          diarise_audio: options?.enableDiarization !== false,
        },
      },
    )) as WhisperReplicateOutput;

    return this.parseOutput(output);
  }

  async isAvailable(): Promise<boolean> {
    try {
      return !!process.env.REPLICATE_API_TOKEN;
    } catch {
      return false;
    }
  }

  private parseOutput(output: WhisperReplicateOutput): TranscriptionResult {
    const fullText = output.text ?? "";
    const rawSegments = output.chunks ?? output.segments ?? [];
    const speakerMap = new Map<string, SpeakerAccumulator>();
    const segments: TranscriptSegment[] = [];
    const wordTimestamps: WordTimestamp[] = [];

    for (const chunk of rawSegments) {
      const speakerId = chunk.speaker ?? "S0";
      const start = chunk.timestamp?.[0] ?? 0;
      const end = chunk.timestamp?.[1] ?? start;

      segments.push({
        start,
        end,
        text: chunk.text?.trim() ?? "",
        speakerId,
        confidence: 0.9, // Whisper doesn't provide per-segment confidence
      });

      // Accumulate speaker talk time
      if (!speakerMap.has(speakerId)) {
        speakerMap.set(speakerId, { talkTime: 0, label: speakerId });
      }
      const acc = speakerMap.get(speakerId)!;
      acc.talkTime += end - start;

      // Extract word-level timestamps if available
      if (chunk.words) {
        for (const w of chunk.words) {
          wordTimestamps.push({
            word: w.word ?? w.text ?? "",
            start: w.start ?? w.timestamp?.[0] ?? start,
            end: w.end ?? w.timestamp?.[1] ?? end,
            speakerId,
          });
        }
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

    const durationSeconds =
      segments.length > 0 ? segments[segments.length - 1].end : 0;
    const words = fullText.split(/\s+/).filter(Boolean);

    return {
      fullText,
      segments,
      speakers,
      wordTimestamps,
      language: output.language ?? "en",
      durationSeconds,
      wordCount: words.length,
      confidenceAvg: 0.9,
    };
  }
}

// ─── Replicate output types ─────────────────────────────────────────

interface SpeakerAccumulator {
  talkTime: number;
  label: string;
}

interface WhisperReplicateOutput {
  text?: string;
  language?: string;
  chunks?: WhisperChunk[];
  segments?: WhisperChunk[];
}

interface WhisperChunk {
  text?: string;
  timestamp?: [number, number];
  speaker?: string;
  words?: WhisperWord[];
}

interface WhisperWord {
  word?: string;
  text?: string;
  start?: number;
  end?: number;
  timestamp?: [number, number];
}
