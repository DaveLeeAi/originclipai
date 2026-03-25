// src/lib/providers/llm-gemini.ts
//
// Gemini Flash LLM provider for cheap development/iteration.
// Uses Google's Gemini 3.1 Flash — significantly cheaper than Claude Sonnet.
// Activated via providerMode: "gemini-dev" on job creation or LLM_PROVIDER_MODE=gemini-dev env.
//
// Cost comparison (approximate):
//   Claude Sonnet: ~$3/M input, ~$15/M output
//   Gemini Flash:  ~$0.075/M input, ~$0.30/M output (40x cheaper)

import { z } from "zod";
import type { LLMProvider, LLMMessage, LLMOptions, LLMResponse } from "./llm";
import { cleanLLMResponse } from "@/lib/llm/response-cleaner";

const DEFAULT_MODEL = "gemini-3.1-flash";

/**
 * Google Gemini Flash LLM provider.
 * Drop-in replacement for AnthropicLLMProvider at ~40x lower cost.
 * Quality is lower but sufficient for development iteration and testing pipeline logic.
 */
export class GeminiLLMProvider implements LLMProvider {
  readonly name = "gemini";
  private apiKey: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required for GeminiLLMProvider");
    }
    this.apiKey = apiKey;
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    // Ignore non-Gemini model names (e.g. "claude-sonnet-4-20250514" from prompt templates)
    const model = options?.model?.startsWith("gemini") ? options.model : DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    // Convert messages to Gemini format
    const systemMessages = messages.filter((m) => m.role === "system");
    const nonSystemMessages = messages.filter((m) => m.role !== "system");

    const systemInstruction = systemMessages.length > 0
      ? { parts: [{ text: systemMessages.map((m) => m.content).join("\n\n") }] }
      : undefined;

    const contents = nonSystemMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.3,
        maxOutputTokens: options?.maxTokens ?? 4096,
        responseMimeType: "text/plain",
      },
    };

    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }

    // 60-second timeout for Gemini free tier
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr instanceof DOMException && fetchErr.name === "AbortError") {
        throw new Error(`[GEMINI] Request timed out after 60s for model ${model}`);
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeout);
    }

    const responseText = await response.text();
    console.log(
      `[GEMINI] ${model} — status: ${response.status}, body preview: ${responseText.slice(0, 200)}`,
    );

    if (!response.ok) {
      throw new Error(`Gemini API error (${response.status}): ${responseText}`);
    }

    const data = JSON.parse(responseText) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
      };
    };

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const inputTokens = data.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0;

    console.log(
      `[GEMINI] ${model} — input: ${inputTokens}, output: ${outputTokens}`,
    );

    return {
      content,
      usage: { inputTokens, outputTokens },
    };
  }

  async chatStructured<T>(
    messages: LLMMessage[],
    schema: z.ZodSchema<T>,
    options?: LLMOptions,
  ): Promise<T> {
    // Request JSON output from Gemini
    const jsonMessages = [
      ...messages,
      {
        role: "user" as const,
        content: "IMPORTANT: Return ONLY valid JSON. No markdown fences, no explanation, just the raw JSON object.",
      },
    ];

    const response = await this.chat(jsonMessages, options);

    try {
      const cleaned = cleanLLMResponse(response.content);
      const parsed: unknown = JSON.parse(cleaned);
      return schema.parse(parsed);
    } catch (firstError) {
      // Retry once with format reinforcement
      console.warn(
        `[llm] Gemini parse failed, retrying with format reinforcement:`,
        firstError instanceof Error ? firstError.message : firstError,
      );

      const retryMessages: LLMMessage[] = [
        ...messages,
        { role: "assistant", content: response.content },
        {
          role: "user",
          content:
            "Your previous response was not valid JSON or did not match the required schema. Return ONLY a valid JSON response with no other text, no markdown fences, no explanation. Just the raw JSON.",
        },
      ];

      const retryResponse = await this.chat(retryMessages, {
        ...options,
        temperature: 0.1,
      });

      const cleaned = cleanLLMResponse(retryResponse.content);
      const parsed: unknown = JSON.parse(cleaned);
      return schema.parse(parsed);
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.GEMINI_API_KEY;
  }
}
