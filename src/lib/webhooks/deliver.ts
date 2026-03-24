// src/lib/webhooks/deliver.ts

import crypto from 'crypto';
import { db } from '@/lib/db/client';

/**
 * Webhook event types that OriginClipAI sends to user-configured endpoints.
 */
export type WebhookEvent =
  | 'job.completed'
  | 'clip.rendered'
  | 'post.published'
  | 'post.failed';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Deliver a webhook event to all configured endpoints for a user.
 *
 * - Signs the payload with HMAC-SHA256 using the user's webhook secret
 * - Retries up to 3 times with exponential backoff
 * - Logs delivery attempts
 *
 * This is called from workers after pipeline events (job complete, post published, etc.)
 */
export async function deliverWebhook(
  userId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  // In v1, webhook URL is stored on the profile.
  // In v2, this becomes a separate webhook_endpoints table with multiple URLs.
  const profile = await db.profile.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!profile) return;

  // TODO: In v1, check if user has a webhook URL configured
  // For now, this is a no-op placeholder that will be wired when
  // the webhook configuration UI is built.
  // The function signature and retry logic are ready.

  // When webhook URLs are configured, build payload and call deliverToEndpoint:
  // const payload: WebhookPayload = { event, timestamp: new Date().toISOString(), data };
  // await deliverToEndpoint(webhookUrl, webhookSecret, payload);
  console.log(`[webhook] ${event} for user ${userId}:`, JSON.stringify(data).slice(0, 200));
}

/**
 * Deliver a webhook payload to a specific endpoint with signing and retry.
 */
export async function deliverToEndpoint(
  url: string,
  secret: string,
  payload: WebhookPayload,
  maxRetries: number = 3,
): Promise<boolean> {
  const body = JSON.stringify(payload);
  const signature = signPayload(body, secret);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OriginClipAI-Signature': signature,
          'X-OriginClipAI-Event': payload.event,
          'X-OriginClipAI-Timestamp': payload.timestamp,
          'User-Agent': 'OriginClipAI-Webhook/1.0',
        },
        body,
        signal: AbortSignal.timeout(10_000), // 10s timeout
      });

      if (response.ok || (response.status >= 200 && response.status < 300)) {
        console.log(`[webhook] Delivered ${payload.event} to ${url} (attempt ${attempt})`);
        return true;
      }

      // 4xx errors (except 429) are permanent failures — don't retry
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        console.error(`[webhook] Permanent failure ${response.status} for ${url}`);
        return false;
      }

      // 429 or 5xx — retry with backoff
      console.warn(`[webhook] Attempt ${attempt} failed with ${response.status} for ${url}`);
    } catch (error) {
      console.warn(`[webhook] Attempt ${attempt} error for ${url}:`, error);
    }

    // Exponential backoff: 2s, 4s, 8s
    if (attempt < maxRetries) {
      await sleep(2000 * Math.pow(2, attempt - 1));
    }
  }

  console.error(`[webhook] All ${maxRetries} attempts failed for ${url}`);
  return false;
}

/**
 * Sign a payload with HMAC-SHA256.
 * The receiving endpoint can verify: HMAC(body, secret) === X-OriginClipAI-Signature
 */
function signPayload(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Verify an incoming webhook signature (for receiving webhooks FROM platforms).
 */
export function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
