// src/lib/social/x-twitter.ts

import crypto from 'crypto';
import type {
  SocialAdapter,
  SocialPostContent,
  SocialPostResult,
  SocialTokens,
  SocialUserInfo,
} from './adapter';

const X_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
const X_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const X_USERINFO_URL = 'https://api.twitter.com/2/users/me';
const X_TWEET_URL = 'https://api.twitter.com/2/tweets';

const X_SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];

export class XTwitterAdapter implements SocialAdapter {
  readonly platform = 'x';

  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.X_API_KEY!;
    this.clientSecret = process.env.X_API_SECRET!;

    if (!this.clientId || !this.clientSecret) {
      throw new Error('X/Twitter API credentials not configured');
    }
  }

  getAuthUrl(redirectUri: string, state: string): string {
    // X uses PKCE for OAuth 2.0
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // Store code_verifier — in production this goes in the session/cache
    // For now, include it in the state parameter (base64 encoded)
    const stateWithVerifier = Buffer.from(
      JSON.stringify({ state, codeVerifier })
    ).toString('base64url');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: X_SCOPES.join(' '),
      state: stateWithVerifier,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${X_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<SocialTokens> {
    // Note: codeVerifier must be extracted from state by the callback handler
    // and passed here. For now, this accepts it as part of the code parameter
    // format: "code|codeVerifier"
    const [authCode, codeVerifier] = code.includes('|')
      ? code.split('|')
      : [code, ''];

    const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(X_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        code: authCode,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`X token exchange failed: ${data.error_description || data.error}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope?.split(' '),
    };
  }

  async refreshTokens(refreshToken: string): Promise<SocialTokens> {
    const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(X_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`X token refresh failed: ${data.error_description || data.error}`);
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
    const response = await fetch(`${X_USERINFO_URL}?user.fields=profile_image_url`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`X user info failed: HTTP ${response.status}`);
    }

    const data = await response.json();

    return {
      platformUserId: data.data.id,
      platformUsername: data.data.username,
      platformAvatarUrl: data.data.profile_image_url,
    };
  }

  async publish(content: SocialPostContent, tokens: SocialTokens): Promise<SocialPostResult> {
    if (content.type === 'video') {
      return {
        success: false,
        error: 'X video posting not yet supported via API v2. Use text posts.',
        errorCode: 'content_rejected',
      };
    }

    try {
      if (content.type === 'thread' && content.threadPosts?.length) {
        return await this.publishThread(content.threadPosts, tokens);
      }

      return await this.publishSingleTweet(content.text, tokens);
    } catch (error: any) {
      return { success: false, error: error.message, errorCode: 'unknown' };
    }
  }

  private async publishSingleTweet(
    text: string,
    tokens: SocialTokens,
  ): Promise<SocialPostResult> {
    const response = await fetch(X_TWEET_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text.slice(0, 280) }),
    });

    if (!response.ok) {
      return this.handleXError(response);
    }

    const data = await response.json();
    const tweetId = data.data?.id;

    return {
      success: true,
      platformPostId: tweetId,
      platformPostUrl: tweetId
        ? `https://x.com/i/status/${tweetId}`
        : undefined,
    };
  }

  private async publishThread(
    posts: string[],
    tokens: SocialTokens,
  ): Promise<SocialPostResult> {
    let previousTweetId: string | undefined;
    let firstTweetId: string | undefined;

    for (let i = 0; i < posts.length; i++) {
      const body: any = { text: posts[i].slice(0, 280) };

      // Reply to previous tweet to form the thread
      if (previousTweetId) {
        body.reply = { in_reply_to_tweet_id: previousTweetId };
      }

      const response = await fetch(X_TWEET_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await this.handleXError(response);
        // If a thread partially fails, report what we posted
        if (firstTweetId) {
          return {
            success: false,
            platformPostId: firstTweetId,
            platformPostUrl: `https://x.com/i/status/${firstTweetId}`,
            error: `Thread failed at post ${i + 1}/${posts.length}: ${error.error}`,
            errorCode: error.errorCode,
          };
        }
        return error;
      }

      const data = await response.json();
      previousTweetId = data.data?.id;

      if (i === 0) {
        firstTweetId = previousTweetId;
      }

      // Rate limit safety: small delay between thread posts
      if (i < posts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      success: true,
      platformPostId: firstTweetId,
      platformPostUrl: firstTweetId
        ? `https://x.com/i/status/${firstTweetId}`
        : undefined,
    };
  }

  private async handleXError(response: Response): Promise<SocialPostResult> {
    const status = response.status;
    const data = await response.json().catch(() => ({}));

    if (status === 401) {
      return { success: false, error: 'Authentication expired', errorCode: 'auth_expired' };
    }
    if (status === 429) {
      return { success: false, error: 'Rate limited by X', errorCode: 'rate_limit' };
    }
    if (status === 403) {
      const detail = data?.detail ?? data?.errors?.[0]?.message ?? 'Forbidden';
      return { success: false, error: detail, errorCode: 'content_rejected' };
    }

    return {
      success: false,
      error: `X API error ${status}: ${JSON.stringify(data).slice(0, 200)}`,
      errorCode: 'unknown',
    };
  }

  getRateLimits() {
    return {
      postsPerDay: 100, // X Basic API plan
      postsPerMinute: 5,
      maxVideoSizeMb: 0, // Text-only in v1
      maxVideoDurationSec: 0,
      maxCaptionLength: 280,
    };
  }
}
