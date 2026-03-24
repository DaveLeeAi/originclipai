// src/lib/social/youtube.ts

import { google } from 'googleapis';
import fs from 'fs';
import type {
  SocialAdapter,
  SocialPostContent,
  SocialPostResult,
  SocialTokens,
  SocialUserInfo,
} from './adapter';

const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
];

export class YouTubeAdapter implements SocialAdapter {
  readonly platform = 'youtube';

  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.YOUTUBE_CLIENT_ID!;
    this.clientSecret = process.env.YOUTUBE_CLIENT_SECRET!;

    if (!this.clientId || !this.clientSecret) {
      throw new Error('YouTube OAuth credentials not configured');
    }
  }

  private getOAuth2Client(redirectUri?: string) {
    return new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      redirectUri,
    );
  }

  getAuthUrl(redirectUri: string, state: string): string {
    const oauth2 = this.getOAuth2Client(redirectUri);
    return oauth2.generateAuthUrl({
      access_type: 'offline',
      scope: YOUTUBE_SCOPES,
      state,
      prompt: 'consent', // Force consent to get refresh token
    });
  }

  async exchangeCode(code: string, redirectUri: string): Promise<SocialTokens> {
    const oauth2 = this.getOAuth2Client(redirectUri);
    const { tokens } = await oauth2.getToken(code);

    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token ?? undefined,
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      scopes: tokens.scope?.split(' '),
    };
  }

  async refreshTokens(refreshToken: string): Promise<SocialTokens> {
    const oauth2 = this.getOAuth2Client();
    oauth2.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await oauth2.refreshAccessToken();

    return {
      accessToken: credentials.access_token!,
      refreshToken: credentials.refresh_token ?? refreshToken,
      tokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
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
    const oauth2 = this.getOAuth2Client();
    oauth2.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({ version: 'v3', auth: oauth2 });
    const response = await youtube.channels.list({
      part: ['snippet'],
      mine: true,
    });

    const channel = response.data.items?.[0];
    if (!channel) throw new Error('No YouTube channel found');

    return {
      platformUserId: channel.id!,
      platformUsername: channel.snippet?.title ?? 'Unknown',
      platformAvatarUrl: channel.snippet?.thumbnails?.default?.url ?? undefined,
    };
  }

  async publish(content: SocialPostContent, tokens: SocialTokens): Promise<SocialPostResult> {
    const oauth2 = this.getOAuth2Client();
    oauth2.setCredentials({ access_token: tokens.accessToken });

    const youtube = google.youtube({ version: 'v3', auth: oauth2 });

    if (content.type === 'text') {
      return {
        success: false,
        error: 'YouTube does not support text-only posts',
        errorCode: 'content_rejected',
      };
    }

    if (!content.videoPath) {
      return {
        success: false,
        error: 'Video file path required for YouTube upload',
        errorCode: 'upload_failed',
      };
    }

    try {
      // YouTube Shorts: video must be vertical (9:16) and under 60 seconds
      // The #Shorts hashtag in title/description signals it as a Short
      const title = content.title
        ? `${content.title} #Shorts`
        : '#Shorts';

      const description = [
        content.text,
        '',
        content.hashtags?.map(h => `#${h}`).join(' ') ?? '',
      ].join('\n').trim();

      const response = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: title.slice(0, 100), // YouTube title limit
            description: description.slice(0, 5000),
            categoryId: '22', // People & Blogs
          },
          status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: fs.createReadStream(content.videoPath),
        },
      });

      const videoId = response.data.id;

      return {
        success: true,
        platformPostId: videoId ?? undefined,
        platformPostUrl: videoId ? `https://youtube.com/shorts/${videoId}` : undefined,
      };
    } catch (error: any) {
      // Categorize YouTube API errors
      const status = error?.response?.status;
      const reason = error?.response?.data?.error?.errors?.[0]?.reason;

      if (status === 401 || status === 403) {
        return { success: false, error: error.message, errorCode: 'auth_expired' };
      }
      if (status === 429 || reason === 'rateLimitExceeded') {
        return { success: false, error: error.message, errorCode: 'rate_limit' };
      }
      if (reason === 'uploadLimitExceeded' || reason === 'videoTooLong') {
        return { success: false, error: error.message, errorCode: 'content_rejected' };
      }

      return { success: false, error: error.message, errorCode: 'unknown' };
    }
  }

  getRateLimits() {
    return {
      postsPerDay: 50, // YouTube daily upload limit is generous
      postsPerMinute: 5,
      maxVideoSizeMb: 256_000, // 256GB technically, but we cap at 5GB
      maxVideoDurationSec: 60, // Shorts must be ≤60s
      maxCaptionLength: 5000,
    };
  }
}
