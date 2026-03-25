// src/lib/cost/content-hash.ts
//
// Content-addressable hashing for transcript and analysis dedupe.
// Same source URL or file content = same hash = reuse existing results.

import { createHash } from "crypto";

/**
 * Generate a content hash for a source input.
 * Used to detect when a user submits the same content twice,
 * allowing us to reuse existing transcript/analysis instead of re-running.
 *
 * Hash is based on:
 * - Source URL (for URL-based inputs) — normalized
 * - Source file key (for uploads)
 * - Source type
 */
export function generateContentHash(input: {
  sourceType: string;
  sourceUrl?: string | null;
  sourceFileKey?: string | null;
}): string {
  const hash = createHash("sha256");
  hash.update(input.sourceType);

  if (input.sourceUrl) {
    hash.update(normalizeUrl(input.sourceUrl));
  } else if (input.sourceFileKey) {
    hash.update(input.sourceFileKey);
  }

  return hash.digest("hex").slice(0, 32); // 32-char hex string
}

/**
 * Normalize a URL for consistent hashing.
 * Strips tracking params, normalizes protocol, trims whitespace.
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());

    // Remove common tracking params
    const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref", "fbclid", "gclid"];
    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }

    // For YouTube, normalize to canonical format
    if (parsed.hostname.includes("youtube.com") || parsed.hostname === "youtu.be") {
      const videoId = extractYouTubeId(url);
      if (videoId) {
        return `youtube:${videoId}`;
      }
    }

    // Sort remaining params for consistency
    parsed.searchParams.sort();

    return parsed.toString().toLowerCase();
  } catch {
    // If URL parsing fails, just normalize whitespace and case
    return url.trim().toLowerCase();
  }
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}
