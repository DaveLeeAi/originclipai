import type { TranscriptionProvider } from "./transcription";
import { WhisperProvider } from "./transcription-whisper";
import { AssemblyAIProvider } from "./transcription-assemblyai";

/**
 * Factory function to get the appropriate transcription provider.
 * Workers import this, not the implementations directly.
 */
export function getTranscriptionProvider(
  engine: "whisper" | "assemblyai",
): TranscriptionProvider {
  switch (engine) {
    case "whisper":
      return new WhisperProvider();
    case "assemblyai":
      return new AssemblyAIProvider();
    default:
      throw new Error(`Unknown transcription engine: ${engine}`);
  }
}
