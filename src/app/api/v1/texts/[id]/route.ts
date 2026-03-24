import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { z } from "zod";

const updateTextSchema = z.object({
  status: z.enum(["draft", "approved", "scheduled", "posted"]).optional(),
  content: z.string().min(1).optional(),
  label: z.string().min(1).max(200).optional(),
});

/**
 * PATCH /api/v1/texts/:id — Update a text output (approve, edit content).
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const text = await prisma.textOutput.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!text) {
      return NextResponse.json(
        { error: "Text output not found" },
        { status: 404 },
      );
    }

    const body: unknown = await request.json();
    const input = updateTextSchema.parse(body);

    const wordCount = input.content
      ? input.content.split(/\s+/).filter(Boolean).length
      : undefined;

    const updated = await prisma.textOutput.update({
      where: { id: params.id },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(wordCount !== undefined ? { wordCount } : {}),
      },
      select: {
        id: true,
        type: true,
        label: true,
        content: true,
        wordCount: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }

    console.error(`[api] PATCH /api/v1/texts/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/v1/texts/:id — Get a single text output with full details.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const text = await prisma.textOutput.findUnique({
      where: { id: params.id },
    });

    if (!text) {
      return NextResponse.json(
        { error: "Text output not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(text);
  } catch (error) {
    console.error(`[api] GET /api/v1/texts/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
