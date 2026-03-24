// src/lib/intelligence/parse-guard.ts
//
// Safe parsing utilities for LLM outputs.
// Wraps Zod validation with fallback strategies.

import { z } from 'zod';
import { cleanLLMResponse, LLMParseError } from '@/lib/llm/response-cleaner';

export interface ParseResult<T> {
  success: true;
  data: T;
  warnings: string[];
}

export interface ParseFailure {
  success: false;
  error: string;
  rawPreview: string;
}

export type SafeParseResult<T> = ParseResult<T> | ParseFailure;

/**
 * Safely parse an LLM response string through a Zod schema.
 * Tries multiple strategies before giving up:
 * 1. Clean + parse + validate
 * 2. If validation partially fails, try lenient parsing
 * 3. Return structured error on total failure
 */
export function safeParseLLMResponse<T>(
  raw: string,
  schema: z.ZodSchema<T>,
): SafeParseResult<T> {
  const warnings: string[] = [];

  // Strategy 1: standard clean + parse + validate
  try {
    const cleaned = cleanLLMResponse(raw);
    const parsed = JSON.parse(cleaned);
    const validated = schema.parse(parsed);
    return { success: true, data: validated, warnings };
  } catch (firstError) {
    // Capture the first error for diagnostics
    const firstMessage = firstError instanceof Error ? firstError.message : String(firstError);
    warnings.push(`Primary parse failed: ${firstMessage}`);
  }

  // Strategy 2: try to extract JSON more aggressively
  try {
    const aggressive = extractJsonAggressive(raw);
    if (aggressive) {
      const parsed = JSON.parse(aggressive);
      const validated = schema.parse(parsed);
      warnings.push('Used aggressive JSON extraction');
      return { success: true, data: validated, warnings };
    }
  } catch {
    // Fall through
  }

  // Strategy 3: try wrapping bare array/object in expected structure
  try {
    const cleaned = cleanLLMResponse(raw);
    const parsed = JSON.parse(cleaned);

    // If schema expects an object with a single array field,
    // and we got a bare array, try wrapping it
    if (Array.isArray(parsed)) {
      const shape = tryGetObjectShape(schema);
      if (shape) {
        for (const key of Object.keys(shape)) {
          const wrapped = { [key]: parsed };
          const attempt = schema.safeParse(wrapped);
          if (attempt.success) {
            warnings.push(`Wrapped bare array as { ${key}: [...] }`);
            return { success: true, data: attempt.data, warnings };
          }
        }
      }
    }

    // If schema expects an array and we got an object with a single array field,
    // try unwrapping it
    if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
      const values = Object.values(parsed);
      for (const val of values) {
        if (Array.isArray(val)) {
          const attempt = schema.safeParse(val);
          if (attempt.success) {
            warnings.push('Unwrapped object to extract inner array');
            return { success: true, data: attempt.data, warnings };
          }
        }
      }
    }
  } catch {
    // Fall through
  }

  return {
    success: false,
    error: `Failed to parse LLM response after all strategies. Warnings: ${warnings.join('; ')}`,
    rawPreview: raw.slice(0, 300),
  };
}

/**
 * Parse or throw — stricter version for use in pipeline steps
 * where a failure should halt processing.
 */
export function parseLLMResponseOrThrow<T>(
  raw: string,
  schema: z.ZodSchema<T>,
  context?: string,
): T {
  const result = safeParseLLMResponse(raw, schema);
  if (result.success) {
    if (result.warnings.length > 0) {
      console.warn(`[parse-guard] ${context ?? 'LLM parse'} warnings:`, result.warnings);
    }
    return result.data;
  }
  throw new LLMParseError(
    `${context ?? 'LLM parse'} failed: ${result.error}`,
    result.rawPreview,
  );
}

// ─── Internal Helpers ──────────────────────────────────────────────

/**
 * More aggressive JSON extraction — looks for JSON patterns
 * even inside text blocks, handles double-encoded strings.
 */
function extractJsonAggressive(raw: string): string | null {
  // Try to find JSON in double-encoded strings
  if (raw.includes('\\n') && raw.includes('\\"')) {
    try {
      const unescaped = JSON.parse(`"${raw}"`);
      const cleaned = cleanLLMResponse(unescaped);
      JSON.parse(cleaned); // validate it parses
      return cleaned;
    } catch {
      // Not double-encoded
    }
  }

  // Try to find the largest valid JSON block
  const patterns = [
    /\{[\s\S]*\}/,
    /\[[\s\S]*\]/,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match) {
      try {
        JSON.parse(match[0]);
        return match[0];
      } catch {
        // Invalid JSON, continue
      }
    }
  }

  return null;
}

/**
 * Attempt to extract the shape keys from a Zod object schema.
 */
function tryGetObjectShape(schema: z.ZodSchema): Record<string, unknown> | null {
  try {
    if (schema instanceof z.ZodObject) {
      return schema.shape as Record<string, unknown>;
    }
    // Unwrap ZodEffects, ZodOptional, etc.
    if ('_def' in schema) {
      const def = (schema as z.ZodType)._def;
      if ('innerType' in def) {
        return tryGetObjectShape(def.innerType as z.ZodSchema);
      }
      if ('schema' in def) {
        return tryGetObjectShape(def.schema as z.ZodSchema);
      }
    }
  } catch {
    // Can't introspect — that's fine
  }
  return null;
}
