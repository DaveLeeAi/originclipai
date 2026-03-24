// src/lib/providers/llm.ts

export interface LLMCompletionParams {
  model: string;
  temperature: number;
  maxTokens: number;
  system: string;
  messages: LLMMessage[];
}

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface LLMProvider {
  complete(params: LLMCompletionParams): Promise<LLMCompletionResult>;
}

// --- Claude Implementation ---

import Anthropic from '@anthropic-ai/sdk';

export class ClaudeLLMProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
    });
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const response = await this.client.messages.create({
      model: params.model,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      system: params.system,
      messages: params.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
    };
  }
}

// --- Factory ---

let _provider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (!_provider) {
    _provider = new ClaudeLLMProvider();
  }
  return _provider;
}

/** For testing — inject a mock provider */
export function setLLMProvider(provider: LLMProvider): void {
  _provider = provider;
}
