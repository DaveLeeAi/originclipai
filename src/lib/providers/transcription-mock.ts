// src/lib/providers/transcription-mock.ts
//
// Mock transcription provider that returns fixture data.
// Activated when DEV_NO_EXTERNAL_APIS=true.
// Zero cost. No Replicate or AssemblyAI calls.

import type { TranscriptionProvider, TranscriptionResult, TranscriptionOptions } from "./transcription";
import { logMock } from "@/lib/dev-mode";
import {
  DEMO_FULL_TEXT,
  DEMO_SEGMENTS,
  DEMO_SPEAKERS,
  DEMO_WORD_TIMESTAMPS,
  DEMO_SOURCE,
} from "@/lib/fixtures/demo-job";

export class MockTranscriptionProvider implements TranscriptionProvider {
  readonly name = "mock";

  async transcribe(
    _audioPath: string,
    _options?: TranscriptionOptions,
  ): Promise<TranscriptionResult> {
    logMock("transcription", `transcribe() called — returning fixture transcript (${DEMO_SEGMENTS.length} segments, ${DEMO_SPEAKERS.length} speakers)`);

    // Simulate a brief delay so progress updates render in the UI
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      fullText: DEMO_FULL_TEXT,
      segments: DEMO_SEGMENTS,
      speakers: DEMO_SPEAKERS,
      wordTimestamps: DEMO_WORD_TIMESTAMPS,
      language: "en",
      durationSeconds: DEMO_SOURCE.durationSeconds,
      wordCount: DEMO_FULL_TEXT.split(/\s+/).length,
      confidenceAvg: 0.95,
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
