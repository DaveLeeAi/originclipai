import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { LLMProvider, LLMMessage, LLMOptions, LLMResponse } from "./llm";
import { cleanLLMResponse } from "@/lib/llm/response-cleaner";
import { isMockAI, isNoExternalAPIs, logMock, logProvider } from "@/lib/dev-mode";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

/**
 * Anthropic Claude LLM provider implementation.
 * All responses are requested as JSON. Structured responses are
 * validated through Zod schemas with one retry on parse failure.
 */
export class AnthropicLLMProvider implements LLMProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is required for AnthropicLLMProvider");
    }
    this.client = new Anthropic({ apiKey });
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const systemMessages = messages.filter((m) => m.role === "system");
    const nonSystemMessages = messages.filter((m) => m.role !== "system");

    const response = await this.client.messages.create({
      model: options?.model ?? DEFAULT_MODEL,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.3,
      system: systemMessages.map((m) => m.content).join("\n\n") || undefined,
      messages: nonSystemMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const content =
      response.content[0].type === "text" ? response.content[0].text : "";

    console.log(
      `[llm] ${options?.model ?? DEFAULT_MODEL} — input: ${response.usage.input_tokens}, output: ${response.usage.output_tokens}`,
    );

    return {
      content,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  async chatStructured<T>(
    messages: LLMMessage[],
    schema: z.ZodSchema<T>,
    options?: LLMOptions,
  ): Promise<T> {
    const response = await this.chat(messages, options);

    try {
      const cleaned = cleanLLMResponse(response.content);
      const parsed: unknown = JSON.parse(cleaned);
      return schema.parse(parsed);
    } catch (firstError) {
      // Retry once with format reinforcement
      console.warn(
        `[llm] Parse failed, retrying with format reinforcement:`,
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
    return !!process.env.ANTHROPIC_API_KEY;
  }
}

// ─── Provider Instance Cache ─────────────────────────────────────────
// Keyed by mode to allow switching between providers within the same process.

const llmInstances = new Map<string, LLMProvider>();

/**
 * Get the configured LLM provider.
 *
 * Supports three modes:
 * - "mock": fixture data, zero cost (env: MOCK_AI=true or DEV_NO_EXTERNAL_APIS=true)
 * - "gemini-dev": Gemini Flash, ~40x cheaper than Anthropic (env: GEMINI_API_KEY)
 * - "anthropic-prod": Claude Sonnet, production quality (env: ANTHROPIC_API_KEY)
 *
 * @param mode Override the provider mode. If omitted, resolves from env flags.
 */
export function getLLMProvider(mode?: string): LLMProvider {
  const { resolveProviderMode } = require("@/lib/dev-mode") as typeof import("@/lib/dev-mode");
  const effectiveMode = resolveProviderMode(
    mode as import("@/types").ProviderMode | undefined,
  );

  const cached = llmInstances.get(effectiveMode);
  if (cached) return cached;

  let provider: LLMProvider;

  switch (effectiveMode) {
    case "mock": {
      logMock("llm", "Using MockLLMProvider — no paid API calls will be made");
      const { MockLLMProvider } = require("./llm-mock") as { MockLLMProvider: new () => LLMProvider };
      provider = new MockLLMProvider();
      break;
    }

    case "gemini-dev": {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error(
          "GEMINI_API_KEY is not set. Set the key for gemini-dev mode, " +
          "or use MOCK_AI=true for zero-cost development.",
        );
      }
      logProvider("llm", "gemini-dev", "Using GeminiLLMProvider — cheap dev iteration mode");
      const { GeminiLLMProvider } = require("./llm-gemini") as { GeminiLLMProvider: new () => LLMProvider };
      provider = new GeminiLLMProvider();
      break;
    }

    case "anthropic-prod": {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error(
          "ANTHROPIC_API_KEY is not set. The analyze worker requires a configured LLM provider. " +
          "Set MOCK_AI=true for local development without API costs, or set the API key and restart.",
        );
      }
      provider = new AnthropicLLMProvider();
      break;
    }

    default:
      throw new Error(`Unknown LLM provider mode: ${effectiveMode}`);
  }

  llmInstances.set(effectiveMode, provider);
  return provider;
}

/**
 * Check if an LLM provider is available without throwing.
 */
export function isLLMAvailable(mode?: string): boolean {
  const { resolveProviderMode } = require("@/lib/dev-mode") as typeof import("@/lib/dev-mode");
  const effectiveMode = resolveProviderMode(
    mode as import("@/types").ProviderMode | undefined,
  );

  switch (effectiveMode) {
    case "mock":
      return true;
    case "gemini-dev":
      return !!process.env.GEMINI_API_KEY;
    case "anthropic-prod":
      return !!process.env.ANTHROPIC_API_KEY;
    default:
      return false;
  }
}

/** For testing — inject a mock provider */
export function setLLMProvider(provider: LLMProvider, mode = "mock"): void {
  llmInstances.set(mode, provider);
}

/** Clear all cached providers (for testing) */
export function clearLLMProviders(): void {
  llmInstances.clear();
}
