// src/lib/social/adapter.ts

/**
 * SocialAdapter — the contract every platform integration must implement.
 * Workers call adapters through this interface, never directly.
 */

export interface SocialPostContent {
  /** Post type: video upload or text-only */
  type: 'video' | 'text' | 'thread';

  /** Text content (caption for video, full post for text, first post for thread) */
  text: string;

  /** Video file path (local temp file for upload) */
  videoPath?: string;

  /** Video title (YouTube, TikTok) */
  title?: string;

  /** Hashtags (without # prefix) */
  hashtags?: string[];

  /** Thread posts (for X threads) */
  threadPosts?: string[];

  /** Thumbnail image path (optional) */
  thumbnailPath?: string;
}

export interface SocialPostResult {
  /** Whether the post was published successfully */
  success: boolean;

  /** Platform-assigned post ID */
  platformPostId?: string;

  /** Public URL of the published post */
  platformPostUrl?: string;

  /** Error message if failed */
  error?: string;

  /** Error code for categorization (rate_limit, auth_expired, content_rejected, unknown) */
  errorCode?: 'rate_limit' | 'auth_expired' | 'content_rejected' | 'upload_failed' | 'unknown';
}

export interface SocialTokens {
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  scopes?: string[];
}

export interface SocialUserInfo {
  platformUserId: string;
  platformUsername: string;
  platformAvatarUrl?: string;
}

export interface SocialAdapter {
  /** Platform identifier */
  readonly platform: string;

  /**
   * Exchange OAuth authorization code for tokens.
   * Called during initial account connection.
   */
  exchangeCode(code: string, redirectUri: string): Promise<SocialTokens>;

  /**
   * Refresh an expired access token.
   * Returns new tokens or throws if refresh token is also expired.
   */
  refreshTokens(refreshToken: string): Promise<SocialTokens>;

  /**
   * Get the authenticated user's profile info.
   * Used to display connected account in settings.
   */
  getUserInfo(accessToken: string): Promise<SocialUserInfo>;

  /**
   * Publish content to the platform.
   * Handles both video uploads and text posts.
   */
  publish(content: SocialPostContent, tokens: SocialTokens): Promise<SocialPostResult>;

  /**
   * Check if the current tokens are still valid.
   * Returns false if tokens need refreshing.
   */
  validateTokens(tokens: SocialTokens): Promise<boolean>;

  /**
   * Get the OAuth authorization URL for initial connection.
   * User is redirected here to grant access.
   */
  getAuthUrl(redirectUri: string, state: string): string;

  /**
   * Platform-specific rate limit info.
   */
  getRateLimits(): {
    postsPerDay: number;
    postsPerMinute: number;
    maxVideoSizeMb: number;
    maxVideoDurationSec: number;
    maxCaptionLength: number;
  };
}
