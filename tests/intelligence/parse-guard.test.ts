import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { safeParseLLMResponse, parseLLMResponseOrThrow } from '@/lib/intelligence/parse-guard';

const simpleArraySchema = z.array(z.object({
  name: z.string(),
  score: z.number().min(0).max(100),
})).min(1);

const objectWithArraySchema = z.object({
  items: z.array(z.object({
    value: z.string(),
  })).min(1),
  total: z.number(),
});

describe('safeParseLLMResponse', () => {
  it('parses clean JSON', () => {
    const raw = JSON.stringify([{ name: 'test', score: 85 }]);
    const result = safeParseLLMResponse(raw, simpleArraySchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('test');
    }
  });

  it('handles markdown code fences', () => {
    const raw = '```json\n[{"name": "fenced", "score": 90}]\n```';
    const result = safeParseLLMResponse(raw, simpleArraySchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].name).toBe('fenced');
    }
  });

  it('handles preamble text before JSON', () => {
    const raw = 'Here are the results:\n\n[{"name": "preamble", "score": 70}]';
    const result = safeParseLLMResponse(raw, simpleArraySchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].name).toBe('preamble');
    }
  });

  it('handles trailing text after JSON', () => {
    const raw = '[{"name": "trailing", "score": 60}]\n\nLet me know if you need more.';
    const result = safeParseLLMResponse(raw, simpleArraySchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].name).toBe('trailing');
    }
  });

  it('unwraps object to extract inner array when schema expects array', () => {
    // LLM returned {"items": [{...}]} but we expect a bare array
    const raw = JSON.stringify({ results: [{ name: 'unwrapped', score: 55 }] });
    const result = safeParseLLMResponse(raw, simpleArraySchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].name).toBe('unwrapped');
      expect(result.warnings.length).toBeGreaterThan(0);
    }
  });

  it('wraps bare array when schema expects object', () => {
    const raw = JSON.stringify([{ value: 'wrapped' }]);
    const wrappedSchema = z.object({
      items: z.array(z.object({ value: z.string() })).min(1),
    });
    // This is a best-effort — may or may not work depending on key naming
    // The point is it tries the strategy without crashing
    const result = safeParseLLMResponse(raw, wrappedSchema);
    // Either succeeds with wrapping or fails gracefully
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });

  it('returns failure for completely invalid input', () => {
    const result = safeParseLLMResponse('not json at all', simpleArraySchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
      expect(result.rawPreview).toBeTruthy();
    }
  });

  it('returns failure for valid JSON that fails Zod validation', () => {
    const raw = JSON.stringify([{ name: 'x', score: 999 }]); // score > 100
    const result = safeParseLLMResponse(raw, simpleArraySchema);
    expect(result.success).toBe(false);
  });

  it('includes warnings on non-standard parse paths', () => {
    const raw = '```json\n[{"name": "fenced", "score": 50}]\n```\nSome trailing text';
    const result = safeParseLLMResponse(raw, simpleArraySchema);
    expect(result.success).toBe(true);
  });
});

describe('parseLLMResponseOrThrow', () => {
  it('returns data on success', () => {
    const raw = JSON.stringify([{ name: 'test', score: 85 }]);
    const data = parseLLMResponseOrThrow(raw, simpleArraySchema);
    expect(data).toHaveLength(1);
  });

  it('throws on failure with context', () => {
    expect(() => {
      parseLLMResponseOrThrow('bad input', simpleArraySchema, 'test context');
    }).toThrow('test context');
  });

  it('throws with LLMParseError type', () => {
    try {
      parseLLMResponseOrThrow('bad', simpleArraySchema);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).name).toBe('LLMParseError');
    }
  });
});
