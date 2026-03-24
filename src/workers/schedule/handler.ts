import { prisma } from "@/lib/db/client";
import { getSocialAdapter } from "@/lib/social";
import type { SocialPostContent, SocialTokens } from "@/lib/social/adapter";
import { scheduleQueue } from "@/lib/queue/queues";
import type { ScheduleJobData, Platform } from "@/types";

/**
 * Schedule handler — publishes a scheduled post to a social platform.
 * Handles token refresh, rate limiting with exponential backoff, and error categorization.
 */
export async function handleScheduleJob(data: ScheduleJobData): Promise<void> {
  const { scheduledPostId } = data;

  // Fetch the scheduled post with its social connection
  const post = await prisma.scheduledPost.findUniqueOrThrow({
    where: { id: scheduledPostId },
    include: {
      socialConnection: true,
      clip: {
        select: {
          id: true,
          title: true,
          socialCaption: true,
          hashtags: true,
          renderedFiles: true,
        },
      },
      textOutput: {
        select: {
          id: true,
          type: true,
          label: true,
          content: true,
          threadPosts: true,
        },
      },
    },
  });

  // Idempotency: if not in queued state, skip
  if (post.status !== "queued") {
    console.log(
      `[schedule] Post ${scheduledPostId} is in status '${post.status}', skipping`,
    );
    return;
  }

  if (!post.socialConnection) {
    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: { status: "failed", error: "No social connection linked" },
    });
    return;
  }

  const connection = post.socialConnection;

  // Mark as posting
  await prisma.scheduledPost.update({
    where: { id: scheduledPostId },
    data: { status: "posting" },
  });

  const adapter = getSocialAdapter(post.platform);

  // Check if tokens need refresh
  let tokens: SocialTokens = {
    accessToken: connection.accessToken,
    refreshToken: connection.refreshToken ?? undefined,
    tokenExpiresAt: connection.tokenExpiresAt ?? undefined,
  };

  const isExpired =
    connection.tokenExpiresAt &&
    connection.tokenExpiresAt.getTime() < Date.now();

  if (isExpired) {
    if (!connection.refreshToken) {
      await markPostFailed(scheduledPostId, "auth_expired");
      await markConnectionError(
        connection.id,
        "Token expired and no refresh token available",
      );
      return;
    }

    try {
      const refreshed = await adapter.refreshTokens(connection.refreshToken);
      tokens = refreshed;

      // Persist new tokens
      await prisma.socialConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken ?? connection.refreshToken,
          tokenExpiresAt: refreshed.tokenExpiresAt ?? null,
          error: null,
        },
      });
    } catch (refreshError) {
      console.error(
        `[schedule] Token refresh failed for connection ${connection.id}:`,
        refreshError,
      );
      await markPostFailed(scheduledPostId, "auth_expired");
      await markConnectionError(connection.id, "Token refresh failed");
      return;
    }
  }

  // Build post content from snapshot or related records
  const content = buildPostContent(post);

  if (!content) {
    await markPostFailed(
      scheduledPostId,
      "No clip or text output found to publish",
    );
    return;
  }

  // Publish to platform
  const result = await adapter.publish(content, tokens);

  if (result.success) {
    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: {
        status: "posted",
        platformPostId: result.platformPostId ?? null,
        platformPostUrl: result.platformPostUrl ?? null,
        error: null,
      },
    });

    await prisma.socialConnection.update({
      where: { id: connection.id },
      data: {
        lastUsedAt: new Date(),
        error: null,
      },
    });

    console.log(
      `[schedule] Post ${scheduledPostId} published successfully to ${post.platform}`,
    );
  } else {
    await handlePublishFailure(
      scheduledPostId,
      connection.id,
      post.retryCount,
      result.error ?? "Unknown publish error",
      result.errorCode ?? "unknown",
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

interface PostWithRelations {
  platform: string;
  contentSnapshot: unknown;
  clip: {
    id: string;
    title: string;
    socialCaption: string | null;
    hashtags: unknown;
    renderedFiles: unknown;
  } | null;
  textOutput: {
    id: string;
    type: string;
    label: string;
    content: string;
    threadPosts: unknown;
  } | null;
}

function buildPostContent(post: PostWithRelations): SocialPostContent | null {
  // Prefer snapshot if available
  const snapshot = post.contentSnapshot as Record<string, unknown> | null;

  if (post.clip) {
    const renderedFiles = post.clip.renderedFiles as Record<string, string>;
    // Prefer 9:16 for short-form platforms, fallback to any available
    const videoPath =
      renderedFiles["9x16"] ??
      renderedFiles["1x1"] ??
      renderedFiles["16x9"] ??
      Object.values(renderedFiles)[0];

    if (!videoPath) {
      return null;
    }

    const hashtags = Array.isArray(post.clip.hashtags)
      ? (post.clip.hashtags as string[])
      : [];

    return {
      type: "video",
      text: post.clip.socialCaption ?? post.clip.title,
      videoPath,
      title: post.clip.title,
      hashtags,
    };
  }

  if (post.textOutput) {
    const isThread = post.textOutput.type === "x_thread";
    const threadPosts = Array.isArray(post.textOutput.threadPosts)
      ? (post.textOutput.threadPosts as string[])
      : undefined;

    return {
      type: isThread ? "thread" : "text",
      text: post.textOutput.content,
      threadPosts: isThread ? threadPosts : undefined,
    };
  }

  // Fall back to snapshot data
  if (snapshot) {
    return {
      type: (snapshot.type as SocialPostContent["type"]) ?? "text",
      text: (snapshot.text as string) ?? "",
      videoPath: snapshot.videoPath as string | undefined,
      title: snapshot.title as string | undefined,
      hashtags: snapshot.hashtags as string[] | undefined,
      threadPosts: snapshot.threadPosts as string[] | undefined,
    };
  }

  return null;
}

async function markPostFailed(
  scheduledPostId: string,
  error: string,
): Promise<void> {
  await prisma.scheduledPost.update({
    where: { id: scheduledPostId },
    data: { status: "failed", error },
  });
}

async function markConnectionError(
  connectionId: string,
  error: string,
): Promise<void> {
  await prisma.socialConnection.update({
    where: { id: connectionId },
    data: { error },
  });
}

async function handlePublishFailure(
  scheduledPostId: string,
  connectionId: string,
  currentRetryCount: number,
  error: string,
  errorCode: string,
): Promise<void> {
  if (errorCode === "auth_expired") {
    await markPostFailed(scheduledPostId, error);
    await markConnectionError(connectionId, "Authentication expired");
    return;
  }

  if (errorCode === "rate_limit" && currentRetryCount < 3) {
    // Exponential backoff: 5min * 2^retryCount
    const delayMs = 5 * 60 * 1000 * Math.pow(2, currentRetryCount);

    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: {
        retryCount: currentRetryCount + 1,
        lastRetryAt: new Date(),
        // Keep status as queued for retry
        status: "queued",
      },
    });

    // Re-fetch the post to get full data needed for ScheduleJobData
    const retryPost = await prisma.scheduledPost.findUniqueOrThrow({
      where: { id: scheduledPostId },
      select: {
        platform: true,
        socialConnectionId: true,
        clipId: true,
        textOutputId: true,
      },
    });

    await scheduleQueue().add(
      "post",
      {
        scheduledPostId,
        platform: retryPost.platform as Platform,
        socialConnectionId: retryPost.socialConnectionId ?? "",
        clipId: retryPost.clipId ?? undefined,
        textOutputId: retryPost.textOutputId ?? undefined,
      },
      {
        delay: delayMs,
        jobId: `schedule-${scheduledPostId}-retry-${currentRetryCount + 1}`,
      },
    );

    console.log(
      `[schedule] Post ${scheduledPostId} rate limited, retrying in ${delayMs / 1000}s (attempt ${currentRetryCount + 1}/3)`,
    );
    return;
  }

  // All other errors or retries exhausted: mark as failed
  await markPostFailed(scheduledPostId, error);
  console.error(
    `[schedule] Post ${scheduledPostId} failed permanently: ${error}`,
  );
}
