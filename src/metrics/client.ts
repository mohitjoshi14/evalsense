/**
 * LLM client management for metric evaluation
 *
 * Provides a global LLM client that can be configured once and used
 * across all LLM-based metrics, with support for per-call overrides.
 */

import type { LLMClient } from "../core/types.js";
import { createOpenAIAdapter } from "./adapters/openai.js";
import { createAnthropicAdapter } from "./adapters/anthropic.js";
import { createOpenRouterAdapter } from "./adapters/openrouter.js";

/**
 * Global LLM client singleton
 */
let globalClient: LLMClient | null = null;

/**
 * Global defaults for LLM metrics
 */
export interface LLMDefaults {
  /** Default evaluation mode for all metrics */
  evaluationMode?: "per-row" | "batch";
}

let globalDefaults: LLMDefaults = {};

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

/**
 * Executes a function with a scoped LLM client
 *
 * The client is automatically restored after the function completes,
 * even if an error is thrown. This is ideal for testing scenarios
 * where you want to use a mock client without affecting other tests.
 *
 * @param client - The LLM client to use for this scope
 * @param fn - The async function to execute with the scoped client
 * @returns The result of the function
 *
 * @example
 * ```ts
 * // No need for beforeEach(() => resetLLMClient())
 * it("test with mock client", async () => {
 *   const result = await withLLMClient(mockClient, async () => {
 *     return hallucination([{ id: "1", output: "test", context: "ctx" }]);
 *   });
 *   expect(result[0].score).toBe(0.5);
 * });
 * ```
 */
export async function withLLMClient<T>(client: LLMClient, fn: () => Promise<T>): Promise<T> {
  const previousClient = globalClient;
  globalClient = client;
  try {
    return await fn();
  } finally {
    globalClient = previousClient;
  }
}

/**
 * Sets global defaults for LLM metrics
 *
 * @param defaults - Default options to apply to all metrics
 *
 * @example
 * ```ts
 * // Make all metrics use batch mode by default
 * setDefaults({ evaluationMode: "batch" });
 * ```
 */
export function setDefaults(defaults: LLMDefaults): void {
  globalDefaults = { ...globalDefaults, ...defaults };
}

/**
 * Gets the current global defaults
 *
 * @returns Current global defaults
 */
export function getDefaults(): LLMDefaults {
  return { ...globalDefaults };
}

/**
 * Resets global defaults to empty
 */
export function resetDefaults(): void {
  globalDefaults = {};
}

/**
 * Provider types for configureLLM
 */
export type LLMProvider = "openai" | "anthropic" | "openrouter" | "custom";

/**
 * Options for configureLLM
 */
export interface ConfigureLLMOptions {
  /** LLM provider to use */
  provider: LLMProvider;

  /** API key (auto-detects from environment if not provided) */
  apiKey?: string;

  /** Model to use (provider-specific defaults apply if not set) */
  model?: string;

  /** Temperature for generation */
  temperature?: number;

  /** Max tokens per completion */
  maxTokens?: number;

  /** Custom client (required when provider is "custom") */
  client?: LLMClient;

  /** Global defaults to set */
  defaults?: LLMDefaults;
}

/**
 * Options for auto-detection
 */
export interface ConfigureLLMAutoOptions {
  /** Model to use (optional, uses provider default if not set) */
  model?: string;

  /** Temperature for generation */
  temperature?: number;

  /** Max tokens per completion */
  maxTokens?: number;

  /** Global defaults to set */
  defaults?: LLMDefaults;
}

/**
 * Environment variable names for auto-detection
 */
const ENV_KEYS = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
} as const;

/**
 * Creates an LLM client from configuration options
 */
function createClientFromOptions(options: ConfigureLLMOptions): LLMClient {
  const { provider, apiKey, model, temperature, maxTokens, client } = options;

  if (provider === "custom") {
    if (!client) {
      throw new Error("configureLLM: 'client' is required when provider is 'custom'");
    }
    return client;
  }

  // Get API key from options or environment
  const envKey = ENV_KEYS[provider];
  const resolvedApiKey = apiKey ?? process.env[envKey];

  if (!resolvedApiKey) {
    throw new Error(
      `configureLLM: API key not found. ` +
        `Either pass 'apiKey' option or set ${envKey} environment variable.`
    );
  }

  const adapterOptions = {
    model,
    temperature,
    maxTokens,
  };

  switch (provider) {
    case "openai":
      return createOpenAIAdapter(resolvedApiKey, adapterOptions);
    case "anthropic":
      return createAnthropicAdapter(resolvedApiKey, adapterOptions);
    case "openrouter":
      return createOpenRouterAdapter(resolvedApiKey, adapterOptions);
    default:
      throw new Error(`configureLLM: Unknown provider '${provider}'`);
  }
}

/**
 * Detects the best available provider from environment variables
 */
function detectProvider(): LLMProvider | null {
  // Priority order: OpenAI, Anthropic, OpenRouter
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  return null;
}

/**
 * One-step LLM configuration
 *
 * Simplifies LLM setup by combining adapter creation and client setting
 * into a single call with environment variable auto-detection.
 *
 * @param options - Configuration options
 * @returns The configured LLM client
 *
 * @example
 * ```ts
 * // Explicit provider (API key from environment)
 * configureLLM({ provider: "openai", model: "gpt-4" });
 *
 * // With explicit API key
 * configureLLM({
 *   provider: "anthropic",
 *   apiKey: "sk-ant-...",
 *   model: "claude-3-5-sonnet-20241022"
 * });
 *
 * // With global defaults
 * configureLLM({
 *   provider: "openai",
 *   defaults: { evaluationMode: "batch" }
 * });
 *
 * // Custom client
 * configureLLM({ provider: "custom", client: myClient });
 * ```
 */
export function configureLLM(options: ConfigureLLMOptions): LLMClient {
  const client = createClientFromOptions(options);
  setLLMClient(client);

  if (options.defaults) {
    setDefaults(options.defaults);
  }

  return client;
}

/**
 * Zero-config LLM setup with environment auto-detection
 *
 * Detects available API keys from environment variables and
 * configures the appropriate provider automatically.
 *
 * Detection priority:
 * 1. OPENAI_API_KEY → OpenAI
 * 2. ANTHROPIC_API_KEY → Anthropic
 * 3. OPENROUTER_API_KEY → OpenRouter
 *
 * @param options - Optional configuration overrides
 * @returns The configured LLM client
 * @throws Error if no API key is found in environment
 *
 * @example
 * ```ts
 * // Zero-config: detects from environment
 * configureLLM.auto();
 *
 * // With model override
 * configureLLM.auto({ model: "gpt-4" });
 *
 * // With defaults
 * configureLLM.auto({ defaults: { evaluationMode: "batch" } });
 * ```
 */
configureLLM.auto = function (options: ConfigureLLMAutoOptions = {}): LLMClient {
  const provider = detectProvider();

  if (!provider) {
    throw new Error(
      "configureLLM.auto: No API key found in environment. " +
        "Set one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, or OPENROUTER_API_KEY"
    );
  }

  return configureLLM({
    provider,
    ...options,
  });
};
