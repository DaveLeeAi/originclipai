import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getUser } from "@/lib/auth/server";
import { scheduleQueue } from "@/lib/queue/queues";
import { z } from "zod";
import type { Platform } from "@/types";

// ─── POST /api/v1/schedule — Create a new scheduled post ─────────

const createScheduleSchema = z
  .object({
    clipId: z.string().uuid().optional(),
    textOutputId: z.string().uuid().optional(),
    platform: z.enum(["youtube", "tiktok", "linkedin", "x"]),
    scheduledAt: z.string().datetime(),
    socialConnectionId: z.string().uuid(),
  })
  .refine((data) => Boolean(data.clipId) !== Boolean(data.textOutputId), {
    message: "Exactly one of clipId or textOutputId must be provided",
  });

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const body: unknown = await request.json();
    const input = createScheduleSchema.parse(body);

    // Verify social connection belongs to the user and is active
    const connection = await prisma.socialConnection.findUnique({
      where: { id: input.socialConnectionId },
      select: { id: true, userId: true, isActive: true, platform: true },
    });

    if (!connection || connection.userId !== userId) {
      return NextResponse.json(
        { error: "Social connection not found" },
        { status: 404 },
      );
    }

    if (!connection.isActive) {
      return NextResponse.json(
        { error: "Social connection is not active" },
        { status: 400 },
      );
    }

    if (connection.platform !== input.platform) {
      return NextResponse.json(
        {
          error: `Social connection platform '${connection.platform}' does not match requested platform '${input.platform}'`,
        },
        { status: 400 },
      );
    }

    // Build content snapshot from clip or text output
    let contentSnapshot: Record<string, unknown> = {};

    if (input.clipId) {
      const clip = await prisma.clip.findUnique({
        where: { id: input.clipId },
        select: {
          id: true,
          title: true,
          socialCaption: true,
          hashtags: true,
          renderedFiles: true,
          job: { select: { userId: true } },
        },
      });

      if (!clip || clip.job.userId !== userId) {
        return NextResponse.json(
          { error: "Clip not found" },
          { status: 404 },
        );
      }

      contentSnapshot = {
        type: "video",
        clipId: clip.id,
        title: clip.title,
        text: clip.socialCaption ?? clip.title,
        hashtags: clip.hashtags,
        renderedFiles: clip.renderedFiles,
      };
    }

    if (input.textOutputId) {
      const textOutput = await prisma.textOutput.findUnique({
        where: { id: input.textOutputId },
        select: {
          id: true,
          type: true,
          label: true,
          content: true,
          threadPosts: true,
          job: { select: { userId: true } },
        },
      });

      if (!textOutput || textOutput.job.userId !== userId) {
        return NextResponse.json(
          { error: "Text output not found" },
          { status: 404 },
        );
      }

      const isThread = textOutput.type === "x_thread";
      contentSnapshot = {
        type: isThread ? "thread" : "text",
        textOutputId: textOutput.id,
        label: textOutput.label,
        text: textOutput.content,
        threadPosts: isThread ? textOutput.threadPosts : undefined,
      };
    }

    // Create the scheduled post
    const scheduledPost = await prisma.scheduledPost.create({
      data: {
        userId,
        clipId: input.clipId ?? null,
        textOutputId: input.textOutputId ?? null,
        platform: input.platform,
        socialConnectionId: input.socialConnectionId,
        scheduledAt: new Date(input.scheduledAt),
        status: "queued",
        contentSnapshot: JSON.parse(JSON.stringify(contentSnapshot)),
      },
      select: {
        id: true,
        platform: true,
        scheduledAt: true,
        status: true,
        clipId: true,
        textOutputId: true,
        socialConnectionId: true,
        createdAt: true,
      },
    });

    // Enqueue with delay until scheduled time
    const delayMs = new Date(input.scheduledAt).getTime() - Date.now();

    await scheduleQueue().add(
      "post",
      {
        scheduledPostId: scheduledPost.id,
        platform: input.platform as Platform,
        socialConnectionId: input.socialConnectionId,
        clipId: input.clipId,
        textOutputId: input.textOutputId,
      },
      {
        delay: Math.max(0, delayMs),
        jobId: `schedule-${scheduledPost.id}`,
      },
    );

    return NextResponse.json({ post: scheduledPost }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[api] POST /api/v1/schedule error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── GET /api/v1/schedule — List scheduled posts ──────────────────

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const posts = await prisma.scheduledPost.findMany({
      where: { userId },
      orderBy: { scheduledAt: "desc" },
      select: {
        id: true,
        platform: true,
        scheduledAt: true,
        status: true,
        platformPostId: true,
        platformPostUrl: true,
        error: true,
        retryCount: true,
        createdAt: true,
        clip: {
          select: {
            id: true,
            title: true,
            score: true,
          },
        },
        textOutput: {
          select: {
            id: true,
            label: true,
            type: true,
          },
        },
      },
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("[api] GET /api/v1/schedule error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
