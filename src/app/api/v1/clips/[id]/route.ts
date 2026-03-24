import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { z } from "zod";

const updateClipSchema = z.object({
  status: z.enum(["review", "approved", "rejected"]).optional(),
  title: z.string().min(1).max(200).optional(),
  socialCaption: z.string().max(500).optional(),
  platforms: z.array(z.enum(["youtube", "tiktok", "linkedin", "x", "instagram", "facebook"])).optional(),
});

/**
 * PATCH /api/v1/clips/:id — Update a clip (approve/reject, edit title/caption).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const clip = await prisma.clip.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    const body: unknown = await request.json();
    const input = updateClipSchema.parse(body);

    const updated = await prisma.clip.update({
      where: { id },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.socialCaption !== undefined
          ? { socialCaption: input.socialCaption }
          : {}),
        ...(input.platforms !== undefined
          ? { platforms: input.platforms }
          : {}),
      },
      select: {
        id: true,
        status: true,
        title: true,
        socialCaption: true,
        platforms: true,
        score: true,
        startTime: true,
        endTime: true,
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

    console.error(`[api] PATCH /api/v1/clips error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/v1/clips/:id — Get a single clip with full details.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const clip = await prisma.clip.findUnique({
      where: { id },
    });

    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    return NextResponse.json(clip);
  } catch (error) {
    console.error(`[api] GET /api/v1/clips error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
