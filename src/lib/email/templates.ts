// src/lib/email/templates.ts

/**
 * Email templates for OriginClipAI transactional emails.
 *
 * These return plain objects with subject + html + text.
 * The sending mechanism (Resend, Postmark, etc.) is abstracted elsewhere.
 *
 * All templates produce both HTML and plain text versions.
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// --- SHARED STYLES ---

const BRAND_COLOR = '#6366F1';
const BG_COLOR = '#F8FAFC';

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 24px;">
  <div style="margin-bottom:32px;">
    <span style="display:inline-block;background:linear-gradient(135deg,${BRAND_COLOR},#818CF8);color:#fff;font-weight:800;font-size:14px;width:32px;height:32px;line-height:32px;text-align:center;border-radius:8px;">O</span>
    <span style="margin-left:8px;font-weight:700;font-size:16px;color:#0F172A;">OriginClipAI</span>
  </div>
  <div style="background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:32px;">
    ${content}
  </div>
  <div style="margin-top:24px;text-align:center;font-size:12px;color:#94A3B8;">
    <p>OriginClipAI · Content repurposing for creators</p>
    <p><a href="https://originclipai.com/settings" style="color:#94A3B8;">Manage preferences</a></p>
  </div>
</div>
</body>
</html>`;
}

function button(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:linear-gradient(135deg,${BRAND_COLOR},#818CF8);color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;margin:8px 0;">${text}</a>`;
}

// --- TEMPLATES ---

/**
 * Welcome email — sent after signup
 */
export function welcomeEmail(params: {
  name?: string;
  appUrl: string;
}): EmailTemplate {
  const greeting = params.name ? `Hi ${params.name},` : 'Welcome,';

  return {
    subject: 'Welcome to OriginClipAI — let\'s repurpose your first piece of content',
    html: emailWrapper(`
      <h1 style="font-size:22px;font-weight:700;color:#0F172A;margin:0 0 16px;">${greeting}</h1>
      <p style="font-size:15px;color:#64748B;line-height:1.6;margin:0 0 16px;">
        You're in. OriginClipAI turns your long-form content into video clips, LinkedIn posts, X threads, and newsletter sections — from one upload.
      </p>
      <p style="font-size:15px;color:#64748B;line-height:1.6;margin:0 0 24px;">
        You have <strong style="color:#0F172A;">30 free minutes</strong> this month. That's enough to process a full podcast episode or a couple of shorter videos.
      </p>
      ${button('Process your first video', params.appUrl + '/new')}
      <p style="font-size:13px;color:#94A3B8;margin:24px 0 0;">
        Paste a YouTube URL, upload a video, or even drop in a blog post URL — we handle all of it.
      </p>
    `),
    text: `${greeting}

Welcome to OriginClipAI.

You have 30 free minutes this month. Paste a YouTube URL to get started: ${params.appUrl}/new

OriginClipAI turns your long-form content into video clips, LinkedIn posts, X threads, and newsletter sections — from one upload.`,
  };
}

/**
 * Job complete — sent when a processing job finishes
 */
export function jobCompleteEmail(params: {
  name?: string;
  sourceTitle: string;
  clipCount: number;
  textCount: number;
  jobUrl: string;
}): EmailTemplate {
  const greeting = params.name ? `${params.name}, your` : 'Your';

  return {
    subject: `${params.clipCount} clips + ${params.textCount} text outputs ready — "${params.sourceTitle}"`,
    html: emailWrapper(`
      <h1 style="font-size:22px;font-weight:700;color:#0F172A;margin:0 0 16px;">${greeting} content is ready</h1>
      <p style="font-size:15px;color:#64748B;line-height:1.6;margin:0 0 8px;">
        We finished processing <strong style="color:#0F172A;">"${params.sourceTitle}"</strong>.
      </p>
      <div style="background:#F8FAFC;border-radius:10px;padding:16px;margin:16px 0;">
        <div style="font-size:14px;margin-bottom:6px;">
          <span style="color:#22C55E;font-weight:700;">${params.clipCount}</span>
          <span style="color:#64748B;"> video clips scored and captioned</span>
        </div>
        <div style="font-size:14px;">
          <span style="color:#3B82F6;font-weight:700;">${params.textCount}</span>
          <span style="color:#64748B;"> text outputs (LinkedIn, X, newsletter)</span>
        </div>
      </div>
      <p style="font-size:15px;color:#64748B;line-height:1.6;margin:0 0 24px;">
        Review your outputs, approve the best ones, and schedule them.
      </p>
      ${button('Review outputs', params.jobUrl + '/review')}
    `),
    text: `${greeting} content is ready.

"${params.sourceTitle}" has been processed:
- ${params.clipCount} video clips scored and captioned
- ${params.textCount} text outputs (LinkedIn, X, newsletter)

Review your outputs: ${params.jobUrl}/review`,
  };
}

/**
 * Post published — sent when a scheduled post goes live
 */
export function postPublishedEmail(params: {
  name?: string;
  platform: string;
  contentTitle: string;
  postUrl?: string;
  dashboardUrl: string;
}): EmailTemplate {
  const platformName = params.platform.charAt(0).toUpperCase() + params.platform.slice(1);
  const greeting = params.name ? `${params.name}, your` : 'Your';

  return {
    subject: `Published to ${platformName}: "${params.contentTitle}"`,
    html: emailWrapper(`
      <h1 style="font-size:22px;font-weight:700;color:#0F172A;margin:0 0 16px;">${greeting} post is live</h1>
      <p style="font-size:15px;color:#64748B;line-height:1.6;margin:0 0 16px;">
        <strong style="color:#0F172A;">"${params.contentTitle}"</strong> was published to ${platformName}.
      </p>
      ${params.postUrl ? `<p style="margin:0 0 24px;">${button('View on ' + platformName, params.postUrl)}</p>` : ''}
      <p style="font-size:13px;color:#94A3B8;">
        <a href="${params.dashboardUrl}" style="color:${BRAND_COLOR};">Go to dashboard</a> to see all your scheduled posts.
      </p>
    `),
    text: `${greeting} post is live.

"${params.contentTitle}" was published to ${platformName}.
${params.postUrl ? `View it: ${params.postUrl}` : ''}

Dashboard: ${params.dashboardUrl}`,
  };
}

/**
 * Usage warning — sent when user reaches 80% of their monthly limit
 */
export function usageWarningEmail(params: {
  name?: string;
  minutesUsed: number;
  minutesLimit: number;
  plan: string;
  upgradeUrl: string;
}): EmailTemplate {
  const pct = Math.round((params.minutesUsed / params.minutesLimit) * 100);
  const remaining = params.minutesLimit - params.minutesUsed;
  const greeting = params.name ? `Hi ${params.name},` : 'Hi,';

  return {
    subject: `You've used ${pct}% of your monthly minutes`,
    html: emailWrapper(`
      <h1 style="font-size:22px;font-weight:700;color:#0F172A;margin:0 0 16px;">${greeting}</h1>
      <p style="font-size:15px;color:#64748B;line-height:1.6;margin:0 0 16px;">
        You've used <strong style="color:#0F172A;">${params.minutesUsed} of ${params.minutesLimit} minutes</strong> on your ${params.plan} plan this month.
        You have <strong style="color:#F59E0B;">${remaining} minutes remaining</strong>.
      </p>
      <div style="background:#F8FAFC;border-radius:8px;height:8px;margin:16px 0;overflow:hidden;">
        <div style="background:${pct >= 90 ? '#EF4444' : '#F59E0B'};height:100%;width:${pct}%;border-radius:8px;"></div>
      </div>
      <p style="font-size:15px;color:#64748B;line-height:1.6;margin:0 0 24px;">
        Need more minutes? Upgrade your plan for uninterrupted processing.
      </p>
      ${button('Upgrade plan', params.upgradeUrl)}
    `),
    text: `${greeting}

You've used ${params.minutesUsed} of ${params.minutesLimit} minutes on your ${params.plan} plan. ${remaining} minutes remaining.

Upgrade: ${params.upgradeUrl}`,
  };
}

/**
 * Post failed — sent when a scheduled post fails after all retries
 */
export function postFailedEmail(params: {
  name?: string;
  platform: string;
  contentTitle: string;
  error: string;
  dashboardUrl: string;
}): EmailTemplate {
  const platformName = params.platform.charAt(0).toUpperCase() + params.platform.slice(1);

  return {
    subject: `Failed to publish to ${platformName}: "${params.contentTitle}"`,
    html: emailWrapper(`
      <h1 style="font-size:22px;font-weight:700;color:#0F172A;margin:0 0 16px;">Post failed to publish</h1>
      <p style="font-size:15px;color:#64748B;line-height:1.6;margin:0 0 16px;">
        We couldn't publish <strong style="color:#0F172A;">"${params.contentTitle}"</strong> to ${platformName} after multiple attempts.
      </p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 16px;margin:16px 0;">
        <p style="font-size:13px;color:#EF4444;margin:0;"><strong>Error:</strong> ${params.error}</p>
      </div>
      <p style="font-size:15px;color:#64748B;line-height:1.6;margin:0 0 24px;">
        You can retry from your dashboard or post manually.
      </p>
      ${button('Go to dashboard', params.dashboardUrl)}
    `),
    text: `Post failed to publish.

"${params.contentTitle}" could not be published to ${platformName}.
Error: ${params.error}

Retry from your dashboard: ${params.dashboardUrl}`,
  };
}
