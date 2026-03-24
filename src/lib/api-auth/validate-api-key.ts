// src/lib/api-auth/validate-api-key.ts

import { db } from '@/lib/db/client';
import bcrypt from 'bcryptjs';

export interface ApiKeyValidation {
  valid: boolean;
  userId?: string;
  keyId?: string;
  plan?: string;
  error?: string;
}

/**
 * Validate a Bearer token that starts with sk_live_.
 * Looks up the key by prefix, then bcrypt-compares the full key against the stored hash.
 * Updates lastUsedAt and usageCount on successful validation.
 */
export async function validateApiKey(bearerToken: string): Promise<ApiKeyValidation> {
  if (!bearerToken.startsWith('sk_live_')) {
    return { valid: false, error: 'Invalid key format. Keys start with sk_live_' };
  }

  const prefix = bearerToken.slice(0, 16);

  // Find candidate keys by prefix
  const candidates = await db.apiKey.findMany({
    where: { keyPrefix: prefix, isActive: true },
    include: { user: { select: { id: true, plan: true } } },
  });

  if (candidates.length === 0) {
    return { valid: false, error: 'Invalid API key' };
  }

  // Compare full key against each candidate's hash
  for (const candidate of candidates) {
    const match = await bcrypt.compare(bearerToken, candidate.keyHash);
    if (match) {
      // Update usage stats (fire and forget — don't block the request)
      db.apiKey.update({
        where: { id: candidate.id },
        data: {
          lastUsedAt: new Date(),
          usageCount: { increment: 1 },
        },
      }).catch(() => {}); // Non-critical — don't fail the request

      return {
        valid: true,
        userId: candidate.user.id,
        keyId: candidate.id,
        plan: candidate.user.plan,
      };
    }
  }

  return { valid: false, error: 'Invalid API key' };
}

/**
 * Extract and validate auth from a request.
 * Supports both Supabase session (cookie) and API key (Bearer token).
 * Returns userId if authenticated, null otherwise.
 */
export async function authenticateRequest(
  request: Request,
): Promise<{ userId: string; authMethod: 'session' | 'api_key'; plan: string } | null> {
  const authHeader = request.headers.get('authorization');

  // API key auth
  if (authHeader?.startsWith('Bearer sk_')) {
    const token = authHeader.slice(7);
    const result = await validateApiKey(token);
    if (result.valid && result.userId) {
      return { userId: result.userId, authMethod: 'api_key', plan: result.plan ?? 'FREE' };
    }
    return null;
  }

  // Session auth is handled by Supabase middleware — if we get here,
  // the user is already authenticated via cookie and available via getUser()
  return null; // Caller should fall back to getUser()
}
