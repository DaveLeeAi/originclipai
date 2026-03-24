// src/lib/email/provider.ts

/**
 * Email sending abstraction.
 * v1: Resend. Can swap to Postmark, SendGrid, etc.
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  tags?: Record<string, string>;
}

export interface EmailProvider {
  send(params: SendEmailParams): Promise<{ id: string; success: boolean }>;
}

// --- RESEND IMPLEMENTATION ---

export class ResendEmailProvider implements EmailProvider {
  private apiKey: string;
  private fromAddress: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY ?? '';
    this.fromAddress = process.env.EMAIL_FROM ?? 'OriginClipAI <noreply@originclipai.com>';
  }

  async send(params: SendEmailParams): Promise<{ id: string; success: boolean }> {
    if (!this.apiKey) {
      console.warn('[email] No RESEND_API_KEY configured. Skipping email send.');
      return { id: 'skipped', success: false };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
          reply_to: params.replyTo,
          tags: params.tags
            ? Object.entries(params.tags).map(([name, value]) => ({ name, value }))
            : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[email] Resend error:', data);
        return { id: '', success: false };
      }

      return { id: data.id, success: true };
    } catch (error) {
      console.error('[email] Send failed:', error);
      return { id: '', success: false };
    }
  }
}

// --- FACTORY ---

let _provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!_provider) {
    _provider = new ResendEmailProvider();
  }
  return _provider;
}

// --- CONVENIENCE ---

import type { EmailTemplate } from './templates';

/**
 * Send a template-based email.
 */
export async function sendEmail(
  to: string,
  template: EmailTemplate,
  tags?: Record<string, string>,
): Promise<void> {
  const provider = getEmailProvider();
  await provider.send({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    tags,
  });
}
