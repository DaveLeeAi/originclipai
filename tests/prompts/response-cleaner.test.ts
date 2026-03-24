import { describe, it, expect } from "vitest";
import { cleanLLMResponse } from "@/lib/llm/response-cleaner";

describe("cleanLLMResponse", () => {
  it("extracts clean JSON array", () => {
    const result = cleanLLMResponse('[{"foo": "bar"}]');
    expect(JSON.parse(result)).toEqual([{ foo: "bar" }]);
  });

  it("extracts clean JSON object", () => {
    const result = cleanLLMResponse('{"foo": "bar"}');
    expect(JSON.parse(result)).toEqual({ foo: "bar" });
  });

  it("removes markdown code fences (```json)", () => {
    const result = cleanLLMResponse('```json\n[{"a": 1}]\n```');
    expect(JSON.parse(result)).toEqual([{ a: 1 }]);
  });

  it("removes markdown code fences (```)", () => {
    const result = cleanLLMResponse('```\n{"key": "val"}\n```');
    expect(JSON.parse(result)).toEqual({ key: "val" });
  });

  it("skips preamble text before JSON", () => {
    const result = cleanLLMResponse(
      'Here are the results:\n\n[{"id": 1}]',
    );
    expect(JSON.parse(result)).toEqual([{ id: 1 }]);
  });

  it("ignores trailing text after JSON", () => {
    const result = cleanLLMResponse(
      '{"value": 42}\n\nLet me know if you need more.',
    );
    expect(JSON.parse(result)).toEqual({ value: 42 });
  });

  it("handles nested objects", () => {
    const input = '{"outer": {"inner": [1, 2, {"deep": true}]}}';
    const result = cleanLLMResponse(input);
    expect(JSON.parse(result)).toEqual({
      outer: { inner: [1, 2, { deep: true }] },
    });
  });

  it("handles strings with brackets inside", () => {
    const input = '{"text": "he said [hello] and {world}"}';
    const result = cleanLLMResponse(input);
    expect(JSON.parse(result)).toEqual({
      text: "he said [hello] and {world}",
    });
  });

  it("handles escaped quotes in strings", () => {
    const input = '{"text": "she said \\"hi\\""}';
    const result = cleanLLMResponse(input);
    expect(JSON.parse(result)).toEqual({ text: 'she said "hi"' });
  });

  it("throws on no JSON", () => {
    expect(() => cleanLLMResponse("no json here")).toThrow(
      "No JSON found in LLM response",
    );
  });

  it("throws on malformed JSON (unclosed brackets)", () => {
    expect(() => cleanLLMResponse("[{")).toThrow(
      "Malformed JSON in LLM response",
    );
  });

  it("handles full LLM response with preamble and fences", () => {
    const raw = `Sure! Here are the clip candidates:

\`\`\`json
[
  {
    "startTime": 10.5,
    "endTime": 45.2,
    "title": "Test clip"
  }
]
\`\`\`

Let me know if you want me to adjust these.`;

    const result = cleanLLMResponse(raw);
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("Test clip");
  });
});
