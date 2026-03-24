// src/lib/providers/llm.ts

import { z } from "zod";

export interface LLMMessage {
  role: "user" | "assistant" | "system";
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
   * Send a chat completion request.
   * System messages are extracted and sent via the `system` parameter.
   */
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;

  /**
   * Chat with structured JSON output validated through a Zod schema.
   * Retries once on parse failure with format reinforcement.
   */
  chatStructured<T>(
    messages: LLMMessage[],
    schema: z.ZodSchema<T>,
    options?: LLMOptions,
  ): Promise<T>;

  isAvailable(): Promise<boolean>;
}
