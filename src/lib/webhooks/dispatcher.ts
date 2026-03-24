import type { WebhookEvent, WebhookPayload } from "@/types";

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s

/**
 * Dispatch a webhook event to a configured URL.
 * Retries up to 3 times with increasing delays.
 */
export async function dispatchWebhook(
  webhookUrl: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OriginClip-Event": event,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });

      if (response.ok) {
        console.log(`[webhook] ${event} delivered to ${webhookUrl}`);
        return;
      }

      console.warn(
        `[webhook] ${event} delivery failed (HTTP ${response.status}), attempt ${attempt + 1}/${MAX_RETRIES + 1}`,
      );
    } catch (error) {
      console.warn(
        `[webhook] ${event} delivery error, attempt ${attempt + 1}/${MAX_RETRIES + 1}:`,
        error instanceof Error ? error.message : error,
      );
    }

    // Wait before retry (skip for last attempt)
    if (attempt < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
    }
  }

  console.error(
    `[webhook] ${event} delivery to ${webhookUrl} failed after ${MAX_RETRIES + 1} attempts`,
  );
}

/**
 * Fire a job.completed webhook if a webhook URL is configured.
 */
export async function fireJobCompletedWebhook(
  jobId: string,
  data: {
    status: string;
    clipCount: number;
    textOutputCount: number;
    sourceTitle?: string | null;
  },
): Promise<void> {
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) return;

  await dispatchWebhook(webhookUrl, "job.completed", {
    jobId,
    ...data,
  });
}
