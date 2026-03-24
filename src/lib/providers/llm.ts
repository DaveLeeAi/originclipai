import type { z } from "zod";

// ─── LLM Provider Interface ────────────────────────────────────────

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface LLMProvider {
  readonly name: string;

  /**
   * Send a chat completion request and return raw text response.
   */
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;

  /**
   * Send a chat completion request and parse the response as structured JSON.
   * @param messages - Chat messages
   * @param schema - Zod schema for response validation
   * @param options - LLM configuration options
   */
  chatStructured<T>(
    messages: LLMMessage[],
    schema: z.ZodSchema<T>,
    options?: LLMOptions,
  ): Promise<T>;

  /**
   * Check if the provider is available and properly configured.
   */
  isAvailable(): Promise<boolean>;
}
