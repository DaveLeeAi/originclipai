import type { Platform } from "@/types";

// ─── Social Adapter Interface ───────────────────────────────────────

export interface SocialPostResult {
  platformPostId: string;
  platformPostUrl: string;
}

export interface SocialTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface VideoPostOptions {
  title: string;
  description?: string;
  filePath: string;
  hashtags?: string[];
}

export interface TextPostOptions {
  content: string;
  /** For X threads: array of individual post texts */
  threadPosts?: string[];
}

export interface SocialAdapter {
  readonly platform: Platform;

  /**
   * Post a video to the platform.
   */
  postVideo(
    tokens: SocialTokens,
    options: VideoPostOptions,
  ): Promise<SocialPostResult>;

  /**
   * Post text content to the platform.
   */
  postText(
    tokens: SocialTokens,
    options: TextPostOptions,
  ): Promise<SocialPostResult>;

  /**
   * Refresh an expired OAuth token.
   * @returns Updated tokens
   */
  refreshTokens(tokens: SocialTokens): Promise<SocialTokens>;

  /**
   * Validate that tokens are still active.
   */
  validateTokens(tokens: SocialTokens): Promise<boolean>;
}
