// src/lib/social/linkedin.ts

import type {
  SocialAdapter,
  SocialPostContent,
  SocialPostResult,
  SocialTokens,
  SocialUserInfo,
} from './adapter';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const LINKEDIN_POSTS_URL = 'https://api.linkedin.com/rest/posts';

const LINKEDIN_SCOPES = ['openid', 'profile', 'w_member_social'];

export class LinkedInAdapter implements SocialAdapter {
  readonly platform = 'linkedin';

  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.LINKEDIN_CLIENT_ID!;
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;

    if (!this.clientId || !this.clientSecret) {
      throw new Error('LinkedIn OAuth credentials not configured');
    }
  }

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state,
      scope: LINKEDIN_SCOPES.join(' '),
    });

    return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<SocialTokens> {
    const response = await fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`LinkedIn token exchange failed: ${data.error_description || data.error}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope?.split(' '),
    };
  }

  async refreshTokens(refreshToken: string): Promise<SocialTokens> {
    const response = await fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`LinkedIn token refresh failed: ${data.error_description || data.error}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
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
    const response = await fetch(LINKEDIN_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`LinkedIn user info failed: HTTP ${response.status}`);
    }

    const data = await response.json();

    return {
      platformUserId: data.sub,
      platformUsername: data.name ?? 'Unknown',
      platformAvatarUrl: data.picture,
    };
  }

  async publish(content: SocialPostContent, tokens: SocialTokens): Promise<SocialPostResult> {
    // LinkedIn v1 supports text posts only. Video upload is v2.
    if (content.type === 'video') {
      return {
        success: false,
        error: 'LinkedIn video posting not yet supported. Use text posts.',
        errorCode: 'content_rejected',
      };
    }

    try {
      // Get the user's LinkedIn URN for author field
      const userInfo = await this.getUserInfo(tokens.accessToken);
      const authorUrn = `urn:li:person:${userInfo.platformUserId}`;

      // Build post text
      let postText = content.text;
      if (content.hashtags?.length) {
        postText += '\n\n' + content.hashtags.map(h => `#${h}`).join(' ');
      }

      const response = await fetch(LINKEDIN_POSTS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202401',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: authorUrn,
          commentary: postText.slice(0, 3000), // LinkedIn post limit
          visibility: 'PUBLIC',
          distribution: {
            feedDistribution: 'MAIN_FEED',
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          lifecycleState: 'PUBLISHED',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const status = response.status;

        if (status === 401 || status === 403) {
          return { success: false, error: `Auth error: ${status}`, errorCode: 'auth_expired' };
        }
        if (status === 429) {
          return { success: false, error: 'Rate limited', errorCode: 'rate_limit' };
        }

        return {
          success: false,
          error: `LinkedIn API error ${status}: ${JSON.stringify(errorData).slice(0, 200)}`,
          errorCode: 'unknown',
        };
      }

      // LinkedIn returns the post URN in the x-restli-id header
      const postUrn = response.headers.get('x-restli-id');

      return {
        success: true,
        platformPostId: postUrn ?? undefined,
        platformPostUrl: postUrn
          ? `https://www.linkedin.com/feed/update/${postUrn}`
          : undefined,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, errorCode: 'unknown' };
    }
  }

  getRateLimits() {
    return {
      postsPerDay: 20, // LinkedIn's unofficial limit for API posts
      postsPerMinute: 1,
      maxVideoSizeMb: 0, // Text-only in v1
      maxVideoDurationSec: 0,
      maxCaptionLength: 3000,
    };
  }
}
