import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';
import { getLLMProvider, isLLMAvailable } from '@/lib/providers/llm-anthropic';
import { textRefinementPrompt } from '@/prompts';

const refineSchema = z.object({
  instruction: z.string().min(1).max(500),
});

/**
 * POST /api/v1/texts/:id/refine — Refine text output with AI.
 *
 * Calls the LLM provider with the refinement prompt template.
 * Falls back to returning the original content if LLM is unavailable.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const text = await prisma.textOutput.findUnique({
      where: { id },
      select: { id: true, content: true, type: true },
    });

    if (!text) {
      return NextResponse.json({ error: 'Text output not found' }, { status: 404 });
    }

    const body: unknown = await request.json();
    const input = refineSchema.parse(body);

    let refinedText = text.content;
    let wordCount = text.content.split(/\s+/).filter(Boolean).length;

    if (isLLMAvailable()) {
      const llm = getLLMProvider();
      const messages = [
        { role: 'system' as const, content: textRefinementPrompt.system },
        {
          role: 'user' as const,
          content: textRefinementPrompt.buildUserMessage({
            currentText: text.content,
            outputType: text.type,
            instruction: input.instruction,
          }),
        },
      ];

      const response = await llm.chat(messages, {
        model: textRefinementPrompt.model,
        temperature: textRefinementPrompt.temperature,
        maxTokens: textRefinementPrompt.maxTokens,
      });

      const result = textRefinementPrompt.parseResponse(response.content);
      refinedText = result.refinedText;
      wordCount = result.wordCount;
    }

    await prisma.textOutput.update({
      where: { id },
      data: { content: refinedText, wordCount },
    });

    return NextResponse.json({ refinedText, wordCount });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    console.error(`[api] POST /api/v1/texts/refine error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
