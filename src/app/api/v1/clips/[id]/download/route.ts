import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getStorageProvider } from "@/lib/providers/storage-supabase";
import { z } from "zod";
import type { AspectRatio } from "@/types";

const querySchema = z.object({
  aspect: z.enum(["9x16", "1x1", "16x9"]).default("9x16"),
});

/**
 * GET /api/v1/clips/:id/download?aspect=9x16
 *
 * Returns a signed download URL for the rendered clip.
 * Defaults to 9:16 vertical if no aspect ratio specified.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const clip = await prisma.clip.findUnique({
      where: { id: params.id },
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

    // Parse query params
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      aspect: url.searchParams.get("aspect") ?? "9x16",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid aspect ratio", details: parsed.error.errors },
        { status: 400 },
      );
    }

    const { aspect } = parsed.data;
    const renderedFiles = clip.renderedFiles as Record<string, { storageKey: string; width: number; height: number }>;
    const file = renderedFiles[aspect];

    if (!file?.storageKey) {
      return NextResponse.json(
        {
          error: `No rendered file for aspect ratio ${aspect}`,
          available: Object.keys(renderedFiles).filter(
            (k) => k !== "captions" && renderedFiles[k]?.storageKey,
          ),
        },
        { status: 404 },
      );
    }

    const storage = getStorageProvider();
    const signedUrl = await storage.getSignedUrl(file.storageKey, {
      expiresIn: 3600, // 1 hour
    });

    return NextResponse.json({
      clipId: clip.id,
      title: clip.title,
      aspectRatio: aspect,
      width: file.width,
      height: file.height,
      downloadUrl: signedUrl,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error(`[api] GET /api/v1/clips/${params.id}/download error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
