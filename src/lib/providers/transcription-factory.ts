import type { TranscriptionProvider } from "./transcription";
import { WhisperProvider } from "./transcription-whisper";
import { AssemblyAIProvider } from "./transcription-assemblyai";
import { isNoExternalAPIs, logMock } from "@/lib/dev-mode";

/**
 * Factory function to get the appropriate transcription provider.
 * Returns MockTranscriptionProvider when DEV_NO_EXTERNAL_APIS=true.
 * Workers import this, not the implementations directly.
 */
export function getTranscriptionProvider(
  engine: "whisper" | "assemblyai",
): TranscriptionProvider {
  if (isNoExternalAPIs()) {
    logMock("transcription", `Using MockTranscriptionProvider — no ${engine} API calls will be made`);
    const { MockTranscriptionProvider } = require("./transcription-mock") as {
      MockTranscriptionProvider: new () => TranscriptionProvider;
    };
    return new MockTranscriptionProvider();
  }

  switch (engine) {
    case "whisper":
      return new WhisperProvider();
    case "assemblyai":
      return new AssemblyAIProvider();
    default:
      throw new Error(`Unknown transcription engine: ${engine}`);
  }
}
