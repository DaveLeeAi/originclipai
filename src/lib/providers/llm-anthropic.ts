import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { LLMProvider, LLMMessage, LLMOptions, LLMResponse } from "./llm";
import { cleanLLMResponse } from "@/lib/llm/response-cleaner";
import { isMockAI, isNoExternalAPIs, logMock } from "@/lib/dev-mode";

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

let llmInstance: LLMProvider | null = null;

/**
 * Get the configured LLM provider.
 * Returns MockLLMProvider when MOCK_AI=true or DEV_NO_EXTERNAL_APIS=true.
 * Returns AnthropicLLMProvider if ANTHROPIC_API_KEY is set.
 * Throws a clear error at call time (not at import time) if not configured.
 */
export function getLLMProvider(): LLMProvider {
  if (!llmInstance) {
    if (isMockAI() || isNoExternalAPIs()) {
      logMock("llm", "Using MockLLMProvider — no Anthropic API calls will be made");
      // Lazy import to avoid loading fixture data when not needed
      const { MockLLMProvider } = require("./llm-mock") as { MockLLMProvider: new () => LLMProvider };
      llmInstance = new MockLLMProvider();
    } else if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. The analyze worker requires a configured LLM provider. " +
        "Set MOCK_AI=true for local development without API costs, or set the API key and restart.",
      );
    } else {
      llmInstance = new AnthropicLLMProvider();
    }
  }
  return llmInstance;
}

/**
 * Check if an LLM provider is available without throwing.
 */
export function isLLMAvailable(): boolean {
  return isMockAI() || isNoExternalAPIs() || !!process.env.ANTHROPIC_API_KEY;
}

/** For testing — inject a mock provider */
export function setLLMProvider(provider: LLMProvider): void {
  llmInstance = provider;
}
