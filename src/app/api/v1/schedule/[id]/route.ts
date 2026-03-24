import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSessionUserId } from "@/lib/auth";
import { scheduleQueue } from "@/lib/queue/queues";
import { z } from "zod";

const updateScheduleSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(["queued", "cancelled"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const post = await prisma.scheduledPost.findUnique({
      where: { id },
      select: { userId: true, status: true },
    });

    if (!post || post.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body: unknown = await request.json();
    const input = updateScheduleSchema.parse(body);

    // If cancelling a queued post, remove the BullMQ job
    if (input.status === "cancelled" && post.status === "queued") {
      try {
        const queue = scheduleQueue();
        const job = await queue.getJob(`schedule-${id}`);
        if (job) {
          await job.remove();
        }
      } catch (removeError) {
        console.warn(
          `[api] Failed to remove BullMQ job for post ${id}:`,
          removeError,
        );
        // Continue with DB update even if queue removal fails
      }
    }

    // If rescheduling a queued post, update the BullMQ job
    if (input.scheduledAt && post.status === "queued") {
      try {
        const queue = scheduleQueue();
        // Remove old job
        const oldJob = await queue.getJob(`schedule-${id}`);
        if (oldJob) {
          await oldJob.remove();
        }
        // Re-enqueue with new delay
        const delayMs =
          new Date(input.scheduledAt).getTime() - Date.now();

        // Fetch full post data to re-enqueue
        const fullPost = await prisma.scheduledPost.findUniqueOrThrow({
          where: { id },
          select: {
            platform: true,
            socialConnectionId: true,
            clipId: true,
            textOutputId: true,
          },
        });

        await queue.add(
          "post",
          {
            scheduledPostId: id,
            platform: fullPost.platform,
            socialConnectionId: fullPost.socialConnectionId ?? "",
            clipId: fullPost.clipId ?? undefined,
            textOutputId: fullPost.textOutputId ?? undefined,
          },
          {
            delay: Math.max(0, delayMs),
            jobId: `schedule-${id}`,
          },
        );
      } catch (requeueError) {
        console.warn(
          `[api] Failed to reschedule BullMQ job for post ${id}:`,
          requeueError,
        );
      }
    }

    const updated = await prisma.scheduledPost.update({
      where: { id },
      data: {
        ...(input.scheduledAt
          ? { scheduledAt: new Date(input.scheduledAt) }
          : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        platform: true,
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
    console.error(`[api] PATCH /api/v1/schedule error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const post = await prisma.scheduledPost.findUnique({
      where: { id },
      select: { userId: true, status: true },
    });

    if (!post || post.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Cannot delete posts that have already been published
    if (post.status === "posted") {
      return NextResponse.json(
        { error: "Cannot delete a post that has already been published" },
        { status: 400 },
      );
    }

    // If the post is queued, remove the BullMQ job first
    if (post.status === "queued") {
      try {
        const queue = scheduleQueue();
        const job = await queue.getJob(`schedule-${id}`);
        if (job) {
          await job.remove();
        }
      } catch (removeError) {
        console.warn(
          `[api] Failed to remove BullMQ job for post ${id}:`,
          removeError,
        );
      }
    }

    // Mark as cancelled rather than hard-deleting for audit trail
    await prisma.scheduledPost.update({
      where: { id },
      data: { status: "cancelled" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[api] DELETE /api/v1/schedule error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
