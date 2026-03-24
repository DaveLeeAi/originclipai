// src/lib/social/index.ts

import type { SocialAdapter } from './adapter';
import { YouTubeAdapter } from './youtube';
import { TikTokAdapter } from './tiktok';
import { LinkedInAdapter } from './linkedin';
import { XTwitterAdapter } from './x-twitter';

export type { SocialAdapter, SocialPostContent, SocialPostResult, SocialTokens, SocialUserInfo } from './adapter';

const adapters: Record<string, () => SocialAdapter> = {
  youtube: () => new YouTubeAdapter(),
  tiktok: () => new TikTokAdapter(),
  linkedin: () => new LinkedInAdapter(),
  x: () => new XTwitterAdapter(),
};

/**
 * Get the social adapter for a platform.
 * Throws if the platform is not supported.
 */
export function getSocialAdapter(platform: string): SocialAdapter {
  const factory = adapters[platform.toLowerCase()];
  if (!factory) {
    throw new Error(`Unsupported social platform: ${platform}. Supported: ${Object.keys(adapters).join(', ')}`);
  }
  return factory();
}

/**
 * Get all supported platform names.
 */
export function getSupportedPlatforms(): string[] {
  return Object.keys(adapters);
}
