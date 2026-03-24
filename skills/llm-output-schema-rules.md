# skills/llm-output-schema-rules.md

> Rules for LLM prompt design, structured JSON output, and Zod validation in OriginClipAI. Read before writing or modifying any prompt template or LLM integration.

---

## Core Rule

**Every LLM call returns structured JSON. Every JSON response is validated through Zod before use.** No exceptions. No freeform text parsing. No regex extraction. No "usually it returns the right format."

---

## Prompt Template Structure

All prompts live in `src/prompts/`. Each prompt is a structured object, not an inline string.

```typescript
// src/prompts/clip-analysis.ts
import { z } from 'zod';

// 1. Define the output schema
export const clipCandidateSchema = z.object({
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  duration: z.number().min(10).max(180),
  title: z.string().min(5).max(200),
  hook: z.string().optional(),
  transcriptExcerpt: z.string(),
  score: z.number().int().min(0).max(100),
  scoreFactors: z.object({
    coherence: z.number().int().min(0).max(100),
    hookStrength: z.number().int().min(0).max(100),
    topicClarity: z.number().int().min(0).max(100),
    emotionalEnergy: z.number().int().min(0).max(100),
  }),
  primarySpeakerId: z.string(),
  speakersPresent: z.array(z.object({
    id: z.string(),
    talkPct: z.number().min(0).max(100),
  })),
  topics: z.array(z.string()),
  socialCaption: z.string().optional(),
});

export const clipAnalysisResponseSchema = z.array(clipCandidateSchema);

export type ClipCandidate = z.infer<typeof clipCandidateSchema>;

// 2. Define the prompt template
export const clipAnalysisPrompt = {
  model: 'claude-sonnet-4-20250514',
  temperature: 0.3,
  maxTokens: 8000,
  
  system: `You are a content strategist analyzing a transcript to identify the best short-form video clip candidates. Return ONLY a JSON array. No other text, no markdown fences, no explanation.`,
  
  buildUserMessage: (params: {
    sourceTitle: string;
    duration: string;
    contentType: string;
    speakers: Speaker[];
    transcript: string;
    minDuration: number;
    maxDuration: number;
    targetClips: number;
  }): string => {
    return `Analyze this transcript and identify the ${params.targetClips} best clip candidates.

SOURCE: ${params.sourceTitle}
DURATION: ${params.duration}
TYPE: ${params.contentType}

SPEAKERS:
${JSON.stringify(params.speakers, null, 2)}

CONSTRAINTS:
- Minimum clip duration: ${params.minDuration} seconds
- Maximum clip duration: ${params.maxDuration} seconds

TRANSCRIPT:
${params.transcript}

Return a JSON array matching this exact structure:
${JSON.stringify([{
  startTime: 0, endTime: 0, duration: 0,
  title: "", hook: "", transcriptExcerpt: "",
  score: 0, scoreFactors: { coherence: 0, hookStrength: 0, topicClarity: 0, emotionalEnergy: 0 },
  primarySpeakerId: "", speakersPresent: [{ id: "", talkPct: 0 }],
  topics: [], socialCaption: ""
}], null, 2)}`;
  },
  
  // 3. Define the response parser
  parseResponse: (raw: string): ClipCandidate[] => {
    const cleaned = cleanLLMResponse(raw);
    const parsed = JSON.parse(cleaned);
    return clipAnalysisResponseSchema.parse(parsed);
  },
};
```

---

## Response Cleaning

LLMs sometimes wrap JSON in markdown code fences or add preamble text. Always clean before parsing.

```typescript
// src/lib/llm/response-cleaner.ts
export function cleanLLMResponse(raw: string): string {
  let cleaned = raw.trim();
  
  // Remove markdown code fences
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  
  cleaned = cleaned.trim();
  
  // Find the first [ or { — skip any preamble text
  const arrayStart = cleaned.indexOf('[');
  const objectStart = cleaned.indexOf('{');
  
  if (arrayStart === -1 && objectStart === -1) {
    throw new Error('No JSON found in LLM response');
  }
  
  const start = arrayStart === -1 ? objectStart 
    : objectStart === -1 ? arrayStart 
    : Math.min(arrayStart, objectStart);
  
  cleaned = cleaned.slice(start);
  
  // Find the matching closing bracket
  const isArray = cleaned.startsWith('[');
  const closeChar = isArray ? ']' : '}';
  let depth = 0;
  let end = -1;
  
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === (isArray ? '[' : '{')) depth++;
    if (cleaned[i] === closeChar) depth--;
    if (depth === 0) { end = i + 1; break; }
  }
  
  if (end === -1) throw new Error('Malformed JSON in LLM response');
  
  return cleaned.slice(0, end);
}
```

---

## The LLM Call Pattern

Every LLM call follows this pattern: build prompt → call provider → clean response → parse JSON → validate with Zod → return typed data.

```typescript
// src/workers/analyze/clip-analyzer.ts
import { llmProvider } from '@/lib/providers/llm';
import { clipAnalysisPrompt, type ClipCandidate } from '@/prompts/clip-analysis';
import { cleanLLMResponse } from '@/lib/llm/response-cleaner';

export async function analyzeClips(
  transcript: Transcript,
  speakers: Speaker[],
  options: ClipAnalysisOptions
): Promise<ClipCandidate[]> {
  
  // 1. Build the prompt
  const userMessage = clipAnalysisPrompt.buildUserMessage({
    sourceTitle: options.sourceTitle,
    duration: formatDuration(transcript.durationSeconds),
    contentType: options.contentType,
    speakers,
    transcript: transcript.fullText,
    minDuration: options.minDuration ?? 30,
    maxDuration: options.maxDuration ?? 90,
    targetClips: options.targetClips ?? 15,
  });
  
  // 2. Call the LLM
  const rawResponse = await llmProvider.complete({
    model: clipAnalysisPrompt.model,
    temperature: clipAnalysisPrompt.temperature,
    maxTokens: clipAnalysisPrompt.maxTokens,
    system: clipAnalysisPrompt.system,
    messages: [{ role: 'user', content: userMessage }],
  });
  
  // 3. Parse and validate
  try {
    return clipAnalysisPrompt.parseResponse(rawResponse);
  } catch (parseError) {
    // 4. Retry once with format reinforcement
    const retryMessage = `${userMessage}\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY a JSON array, nothing else.`;
    
    const retryResponse = await llmProvider.complete({
      model: clipAnalysisPrompt.model,
      temperature: 0.1, // Lower temperature for retry
      maxTokens: clipAnalysisPrompt.maxTokens,
      system: clipAnalysisPrompt.system,
      messages: [{ role: 'user', content: retryMessage }],
    });
    
    return clipAnalysisPrompt.parseResponse(retryResponse);
    // If this throws too, let it propagate — worker error handling catches it
  }
}
```

---

## Zod Schema Rules

### Be Specific, Not Permissive

```typescript
// ❌ Too permissive
const clipSchema = z.object({
  score: z.number(),           // Could be -999 or 1000000
  title: z.string(),           // Could be empty
  startTime: z.any(),          // Defeats the purpose
});

// ✅ Specific constraints
const clipSchema = z.object({
  score: z.number().int().min(0).max(100),
  title: z.string().min(5).max(200),
  startTime: z.number().min(0),
});
```

### Use Defaults for Optional Fields

```typescript
const scoreFactorsSchema = z.object({
  coherence: z.number().int().min(0).max(100).default(50),
  hookStrength: z.number().int().min(0).max(100).default(50),
  topicClarity: z.number().int().min(0).max(100).default(50),
  emotionalEnergy: z.number().int().min(0).max(100).default(50),
});
```

### Validate Arrays Have Content

```typescript
// ❌ Allows empty arrays — useless clip analysis
const responseSchema = z.array(clipSchema);

// ✅ Requires at least one result
const responseSchema = z.array(clipSchema).min(1).max(30);
```

### Export Both Schema and Type

```typescript
export const clipCandidateSchema = z.object({ ... });
export type ClipCandidate = z.infer<typeof clipCandidateSchema>;

// Now the worker uses the type for function signatures
// and the schema for runtime validation
```

---

## Per-Output-Type Schema

Every text output type has its own Zod schema:

```typescript
// src/prompts/schemas/index.ts

export const linkedinPostSchema = z.object({
  content: z.string().min(50).max(3000),
  wordCount: z.number().int().min(50).max(500),
  focusTopic: z.string(),
  hookLine: z.string().min(10).max(200),
});

export const xThreadSchema = z.object({
  threadPosts: z.array(z.object({
    postNumber: z.number().int().min(1),
    text: z.string().min(10).max(280),
  })).min(3).max(15),
  postCount: z.number().int().min(3).max(15),
  wordCount: z.number().int(),
  focusTopic: z.string(),
});

export const newsletterSectionSchema = z.object({
  content: z.string().min(100).max(5000),
  wordCount: z.number().int().min(100).max(1000),
  sectionTitle: z.string(),
  focusTopic: z.string(),
});

export const summarySchema = z.object({
  summary: z.string().min(50).max(2000),
  keyInsights: z.array(z.string()).min(2).max(10),
  wordCount: z.number().int(),
});

export const chapterMarkersSchema = z.object({
  chapters: z.array(z.object({
    timestamp: z.string().regex(/^\d+:\d{2}$/),
    title: z.string().min(3).max(100),
  })).min(3).max(20),
});
```

---

## Prompt Versioning

Prompts evolve. When a prompt changes, track the version:

```typescript
export const clipAnalysisPrompt = {
  version: '1.2',  // Increment when prompt changes
  model: 'claude-sonnet-4-20250514',
  // ...
};
```

Store the prompt version alongside results in the database so you can track which prompt version produced which outputs:

```typescript
await db.clip.create({
  data: {
    ...clipData,
    metadata: { promptVersion: clipAnalysisPrompt.version },
  },
});
```

---

## Cost Awareness

Log token usage for every LLM call:

```typescript
// In LLM provider implementation
const response = await anthropic.messages.create({ ... });

console.log(`[llm] ${promptName} — input: ${response.usage.input_tokens}, output: ${response.usage.output_tokens}`);

// Store for billing analysis
await db.llmUsageLog.create({
  data: {
    jobId,
    promptName,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    costEstimate: estimateCost(response.model, response.usage),
  },
});
```

---

## What NOT to Do

- Do not parse LLM responses with regex — always use JSON.parse + Zod
- Do not trust LLM output without validation — always validate through schema
- Do not hardcode prompts inline in worker files — always use prompt templates
- Do not retry more than once on parse failure — if two attempts fail, the prompt needs fixing
- Do not use `z.any()` or `z.unknown()` in output schemas — be specific
- Do not send user PII (email, name, billing info) to the LLM — transcripts are content, not personal data
- Do not log full LLM responses in production — they can be large. Log token counts and parse success/failure
- Do not assume the LLM will follow the schema perfectly — that's why Zod exists
