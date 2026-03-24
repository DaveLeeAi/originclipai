// src/lib/dev-mode.ts
//
// Single source of truth for development mode flags.
// Controls whether paid external APIs are called or mock data is used instead.

/**
 * When true, LLM calls (Anthropic Claude) return fixture data instead of calling the API.
 * Set via MOCK_AI=true in .env.local.
 */
export function isMockAI(): boolean {
  return process.env.MOCK_AI === "true";
}

/**
 * When true, ALL paid external APIs are blocked (Anthropic, AssemblyAI, Replicate, Stripe).
 * Superset of MOCK_AI — also blocks transcription and other paid services.
 * Set via DEV_NO_EXTERNAL_APIS=true in .env.local.
 */
export function isNoExternalAPIs(): boolean {
  return process.env.DEV_NO_EXTERNAL_APIS === "true";
}

/**
 * Returns true if either mock flag is active.
 * Use this for general "should we use real APIs?" checks.
 */
export function isDevMockMode(): boolean {
  return isMockAI() || isNoExternalAPIs();
}

/**
 * Log a clear message when a mock path is used.
 * Always prefixed with [MOCK] for easy grep.
 */
export function logMock(component: string, message: string): void {
  console.log(`[MOCK] [${component}] ${message}`);
}
