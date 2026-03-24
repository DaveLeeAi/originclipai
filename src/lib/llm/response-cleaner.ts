// src/lib/llm/response-cleaner.ts

/**
 * Cleans raw LLM response text to extract valid JSON.
 * Handles: markdown code fences, preamble text, trailing text after JSON.
 */
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
    throw new LLMParseError('No JSON structure found in LLM response', raw);
  }

  const start =
    arrayStart === -1
      ? objectStart
      : objectStart === -1
        ? arrayStart
        : Math.min(arrayStart, objectStart);

  cleaned = cleaned.slice(start);

  // Find the matching closing bracket/brace
  const isArray = cleaned.startsWith('[');
  const openChar = isArray ? '[' : '{';
  const closeChar = isArray ? ']' : '}';
  let depth = 0;
  let end = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === openChar) depth++;
    if (char === closeChar) depth--;

    if (depth === 0) {
      end = i + 1;
      break;
    }
  }

  if (end === -1) {
    throw new LLMParseError('Malformed JSON — no matching closing bracket', raw);
  }

  return cleaned.slice(0, end);
}

/**
 * Custom error class for LLM parse failures.
 * Includes the raw response for debugging.
 */
export class LLMParseError extends Error {
  public readonly rawResponse: string;

  constructor(message: string, rawResponse: string) {
    super(message);
    this.name = 'LLMParseError';
    this.rawResponse = rawResponse.slice(0, 500); // Truncate for logging
  }
}
