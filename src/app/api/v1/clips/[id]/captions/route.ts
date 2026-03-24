import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getStorageProvider } from "@/lib/providers/storage-supabase";
import { z } from "zod";

const querySchema = z.object({
  format: z.enum(["srt", "vtt"]).default("srt"),
});

/**
 * GET /api/v1/clips/:id/captions?format=srt
 *
 * Returns a signed download URL for the clip's caption file.
 * Supports SRT and VTT formats.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const clip = await prisma.clip.findUnique({
      where: { id },
      select: {
        id: true,
        renderStatus: true,
        renderedFiles: true,
        title: true,
      },
    });

    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    if (clip.renderStatus !== "complete") {
      return NextResponse.json(
        {
          error: "Clip not yet rendered",
          renderStatus: clip.renderStatus,
        },
        { status: 409 },
      );
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      format: url.searchParams.get("format") ?? "srt",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid format", details: parsed.error.errors },
        { status: 400 },
      );
    }

    const { format } = parsed.data;
    const renderedFiles = clip.renderedFiles as Record<string, unknown>;
    const captions = renderedFiles.captions as { srt?: string; vtt?: string } | undefined;

    if (!captions?.[format]) {
      return NextResponse.json(
        { error: `No ${format.toUpperCase()} caption file available` },
        { status: 404 },
      );
    }

    const storage = getStorageProvider();
    const signedUrl = await storage.getSignedUrl(captions[format]!, {
      expiresIn: 3600,
    });

    return NextResponse.json({
      clipId: clip.id,
      title: clip.title,
      format,
      downloadUrl: signedUrl,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error(`[api] GET /api/v1/clips/captions error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
