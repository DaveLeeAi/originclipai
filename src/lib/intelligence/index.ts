// src/lib/intelligence/index.ts
//
// Intelligence layer barrel export.
// All transcript analysis, scoring, and extraction utilities.

// Transcript chunking
export {
  chunkTranscriptSegments,
  chunkPlainText,
  estimateTokens,
  type TranscriptChunk,
  type ChunkOptions,
} from './transcript-chunker';

// Clip detection and scoring
export {
  detectClips,
  generateHooksForClip,
  type ClipDetectionInput,
  type ClipDetectionResult,
} from './clip-detector';

export {
  computeCompositeScore,
  getScoreBreakdown,
  rankClips,
  adjustDurationFit,
  adjustSpeakerContinuity,
  expandLegacyScoreFactors,
  validateScoreFactors,
  type ScoreBreakdown,
} from './clip-scorer';

// Insight and quote extraction
export {
  extractInsightsAndQuotes,
  extractInsightsOnly,
  extractQuotesOnly,
  type InsightExtractionInput,
  type InsightExtractionResult,
} from './insight-extractor';

// Summary generation
export {
  generateSummary as generateTranscriptSummary,
  type SummaryInput,
} from './summary-generator';

// Parse guard utilities
export {
  safeParseLLMResponse,
  parseLLMResponseOrThrow,
  type SafeParseResult,
  type ParseResult,
  type ParseFailure,
} from './parse-guard';
