// src/lib/dev-mode.ts
//
// Single source of truth for development mode flags and provider mode switching.
// Controls whether paid external APIs are called or mock/cheap data is used instead.

import type { ProviderMode } from "@/types";

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
 * Resolve the effective provider mode for a job.
 *
 * Priority order:
 * 1. Environment overrides (MOCK_AI / DEV_NO_EXTERNAL_APIS force mock)
 * 2. Per-job providerMode (passed at job creation)
 * 3. LLM_PROVIDER_MODE env var (global default)
 * 4. "anthropic-prod" (production default)
 */
export function resolveProviderMode(jobMode?: ProviderMode): ProviderMode {
  // Env-level mock flags always win
  if (isMockAI() || isNoExternalAPIs()) return "mock";

  // Per-job override
  if (jobMode) return jobMode;

  // Global env default
  const envMode = process.env.LLM_PROVIDER_MODE;
  if (envMode === "mock" || envMode === "gemini-dev" || envMode === "anthropic-prod") {
    return envMode;
  }

  return "anthropic-prod";
}

/**
 * Log a clear message when a mock path is used.
 * Always prefixed with [MOCK] for easy grep.
 */
export function logMock(component: string, message: string): void {
  console.log(`[MOCK] [${component}] ${message}`);
}

/**
 * Log provider mode for cost tracking.
 */
export function logProvider(component: string, mode: ProviderMode, message: string): void {
  const prefix = mode === "mock" ? "[MOCK]" : mode === "gemini-dev" ? "[GEMINI-DEV]" : "[ANTHROPIC]";
  console.log(`${prefix} [${component}] ${message}`);
}
