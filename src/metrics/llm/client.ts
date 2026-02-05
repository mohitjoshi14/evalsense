/**
 * LLM client management for metric evaluation
 *
 * Provides a global LLM client that can be configured once and used
 * across all LLM-based metrics, with support for per-call overrides.
 */

import type { LLMClient } from "../../core/types.js";

/**
 * Global LLM client singleton
 */
let globalClient: LLMClient | null = null;

/**
 * Sets the global LLM client for all metrics
 *
 * @example
 * ```ts
 * import { setLLMClient } from "evalsense/metrics";
 *
 * setLLMClient({
 *   async complete(prompt) {
 *     return await yourLLM.generate(prompt);
 *   }
 * });
 * ```
 */
export function setLLMClient(client: LLMClient): void {
  globalClient = client;
}

/**
 * Gets the current global LLM client
 *
 * @returns The global client or null if not set
 */
export function getLLMClient(): LLMClient | null {
  return globalClient;
}

/**
 * Resets the global LLM client
 *
 * Useful for testing or switching between different LLM providers.
 */
export function resetLLMClient(): void {
  globalClient = null;
}

/**
 * Validates that an LLM client is available
 *
 * @param client - Optional client override
 * @param metricName - Name of the metric for error messages
 * @throws Error if no client is configured
 * @returns The client to use (override or global)
 */
export function requireLLMClient(client: LLMClient | undefined, metricName: string): LLMClient {
  const resolvedClient = client ?? globalClient;

  if (!resolvedClient) {
    throw new Error(
      `${metricName}() requires an LLM client. ` +
        `Set a global client with setLLMClient() or pass llmClient in config.`
    );
  }

  return resolvedClient;
}
