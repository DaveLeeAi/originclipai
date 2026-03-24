// src/lib/social/tiktok.ts

import fs from 'fs';
import type {
  SocialAdapter,
  SocialPostContent,
  SocialPostResult,
  SocialTokens,
  SocialUserInfo,
} from './adapter';

const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_USERINFO_URL = 'https://open.tiktokapis.com/v2/user/info/';
const TIKTOK_UPLOAD_INIT_URL = 'https://open.tiktokapis.com/v2/post/publish/video/init/';

const TIKTOK_SCOPES = ['user.info.basic', 'video.publish', 'video.upload'];

export class TikTokAdapter implements SocialAdapter {
  readonly platform = 'tiktok';

  private clientKey: string;
  private clientSecret: string;

  constructor() {
    this.clientKey = process.env.TIKTOK_CLIENT_KEY!;
    this.clientSecret = process.env.TIKTOK_CLIENT_SECRET!;

    if (!this.clientKey || !this.clientSecret) {
      throw new Error('TikTok OAuth credentials not configured');
    }
  }

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      scope: TIKTOK_SCOPES.join(','),
      response_type: 'code',
      redirect_uri: redirectUri,
      state,
    });

    return `${TIKTOK_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<SocialTokens> {
    const response = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`TikTok token exchange failed: ${data.error_description || data.error}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope?.split(','),
    };
  }

  async refreshTokens(refreshToken: string): Promise<SocialTokens> {
    const response = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`TikTok token refresh failed: ${data.error_description || data.error}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async validateTokens(tokens: SocialTokens): Promise<boolean> {
    if (tokens.tokenExpiresAt && tokens.tokenExpiresAt < new Date()) {
      return false;
    }

    try {
      await this.getUserInfo(tokens.accessToken);
      return true;
    } catch {
      return false;
    }
  }

  async getUserInfo(accessToken: string): Promise<SocialUserInfo> {
    const response = await fetch(
      `${TIKTOK_USERINFO_URL}?fields=open_id,display_name,avatar_url`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    const data = await response.json();

    if (data.error?.code) {
      throw new Error(`TikTok user info failed: ${data.error.message}`);
    }

    const user = data.data?.user;

    return {
      platformUserId: user?.open_id ?? '',
      platformUsername: user?.display_name ?? 'Unknown',
      platformAvatarUrl: user?.avatar_url,
    };
  }

  async publish(content: SocialPostContent, tokens: SocialTokens): Promise<SocialPostResult> {
    if (content.type === 'text' || content.type === 'thread') {
      return {
        success: false,
        error: 'TikTok does not support text-only posts',
        errorCode: 'content_rejected',
      };
    }

    if (!content.videoPath) {
      return {
        success: false,
        error: 'Video file path required for TikTok upload',
        errorCode: 'upload_failed',
      };
    }

    try {
      const fileSize = fs.statSync(content.videoPath).size;

      // Step 1: Initialize upload
      const caption = [
        content.text,
        content.hashtags?.map(h => `#${h}`).join(' ') ?? '',
      ].join(' ').trim().slice(0, 2200); // TikTok caption limit

      const initResponse = await fetch(TIKTOK_UPLOAD_INIT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_info: {
            title: caption,
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: fileSize,
            chunk_size: fileSize, // Single chunk for files under 64MB
            total_chunk_count: 1,
          },
        }),
      });

      const initData = await initResponse.json();

      if (initData.error?.code) {
        const code = initData.error.code;
        if (code === 'spam_risk_too_many_posts') {
          return { success: false, error: initData.error.message, errorCode: 'rate_limit' };
        }
        if (code === 'token_expired' || code === 'access_token_invalid') {
          return { success: false, error: initData.error.message, errorCode: 'auth_expired' };
        }
        return { success: false, error: initData.error.message, errorCode: 'unknown' };
      }

      const uploadUrl = initData.data?.upload_url;
      const publishId = initData.data?.publish_id;

      if (!uploadUrl) {
        return { success: false, error: 'No upload URL returned', errorCode: 'upload_failed' };
      }

      // Step 2: Upload video file
      const videoBuffer = fs.readFileSync(content.videoPath);

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`,
        },
        body: videoBuffer,
      });

      if (!uploadResponse.ok) {
        return {
          success: false,
          error: `Upload failed: HTTP ${uploadResponse.status}`,
          errorCode: 'upload_failed',
        };
      }

      // TikTok processes the video asynchronously after upload.
      // The publish_id can be used to check status later.
      return {
        success: true,
        platformPostId: publishId,
        // TikTok doesn't return a direct URL immediately — it's available after processing
        platformPostUrl: undefined,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, errorCode: 'unknown' };
    }
  }

  getRateLimits() {
    return {
      postsPerDay: 15,
      postsPerMinute: 2,
      maxVideoSizeMb: 4096, // 4GB
      maxVideoDurationSec: 600, // 10 minutes (Shorts are usually ≤60s)
      maxCaptionLength: 2200,
    };
  }
}
