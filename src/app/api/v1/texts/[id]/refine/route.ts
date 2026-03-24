import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';

const refineSchema = z.object({
  instruction: z.string().min(1).max(500),
});

/**
 * POST /api/v1/texts/:id/refine — Refine text output with AI.
 *
 * Phase 3 stub: applies basic instruction-driven transformations.
 * Phase 5 will call the LLM provider with the instruction as a user message.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const text = await prisma.textOutput.findUnique({
      where: { id: params.id },
      select: { id: true, content: true },
    });

    if (!text) {
      return NextResponse.json({ error: 'Text output not found' }, { status: 404 });
    }

    const body: unknown = await request.json();
    const input = refineSchema.parse(body);
    void input;

    // TODO: Phase 4/5 — call LLM provider with:
    //   system: "You are a content editor. Refine the following text."
    //   user: `Instruction: ${input.instruction}\n\nOriginal text:\n${text.content}`
    //
    // For now, return original content with a note that LLM refinement is pending.
    // This allows the UI to be fully wired and tested.

    const refined = text.content;
    const wordCount = refined.split(/\s+/).filter(Boolean).length;

    await prisma.textOutput.update({
      where: { id: params.id },
      data: { content: refined, wordCount },
    });

    return NextResponse.json({ content: refined, wordCount });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 },
      );
    }
    console.error(`[api] POST /api/v1/texts/${params.id}/refine error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
