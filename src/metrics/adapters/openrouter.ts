/**
 * Built-in OpenRouter adapter for evalsense
 *
 * OpenRouter provides access to multiple LLM providers (OpenAI, Anthropic, Google, Meta, etc.)
 * through a single unified API. Great for comparing models or avoiding vendor lock-in.
 *
 * @example
 * ```javascript
 * import { setLLMClient, createOpenRouterAdapter } from 'evalsense/metrics';
 *
 * setLLMClient(createOpenRouterAdapter(process.env.OPENROUTER_API_KEY, {
 *   model: 'anthropic/claude-3.5-sonnet'
 * }));
 * ```
 */

import type { LLMClient, JSONSchema } from "../../core/types.js";
import { parseJSONResponse } from "../llm-utils.js";

export interface OpenRouterAdapterOptions {
  /**
   * Model to use (in format: provider/model-name)
   *
   * Popular options:
   * - `anthropic/claude-3.5-sonnet` - Latest Claude
   * - `openai/gpt-4-turbo` - GPT-4 Turbo
   * - `openai/gpt-3.5-turbo` - Cheap and fast
   * - `google/gemini-pro` - Google Gemini
   * - `meta-llama/llama-3-70b-instruct` - Open source
   *
   * See full list: https://openrouter.ai/models
   *
   * @default "anthropic/claude-3.5-sonnet"
   */
  model?: string;

  /**
   * Temperature for generation (0-2)
   * @default 0
   */
  temperature?: number;

  /**
   * Maximum tokens per completion
   * @default 4096
   */
  maxTokens?: number;

  /**
   * Your app name (for OpenRouter analytics)
   * @default "evalsense"
   */
  appName?: string;

  /**
   * Your app URL (for OpenRouter analytics)
   */
  siteUrl?: string;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;
}

/**
 * Creates an LLM client adapter for OpenRouter.
 *
 * **Setup:**
 * 1. Get API key from https://openrouter.ai/keys
 * 2. Set environment variable: `export OPENROUTER_API_KEY="sk-or-..."`
 * 3. No SDK needed - uses fetch API
 *
 * **Benefits:**
 * - Access 100+ models from one API
 * - Compare different providers easily
 * - Automatic fallbacks and retries
 * - Transparent pricing
 *
 * @param apiKey - Your OpenRouter API key
 * @param options - Configuration options
 * @returns LLM client for use with evalsense metrics
 *
 * @example
 * ```javascript
 * // Basic usage
 * const client = createOpenRouterAdapter(process.env.OPENROUTER_API_KEY);
 * setLLMClient(client);
 *
 * // Use different model
 * const client = createOpenRouterAdapter(process.env.OPENROUTER_API_KEY, {
 *   model: 'openai/gpt-3.5-turbo',  // Cheaper option
 *   appName: 'my-eval-system'
 * });
 *
 * // Use free models for testing
 * const client = createOpenRouterAdapter(process.env.OPENROUTER_API_KEY, {
 *   model: 'meta-llama/llama-3-8b-instruct:free'
 * });
 * ```
 */
export function createOpenRouterAdapter(
  apiKey: string,
  options: OpenRouterAdapterOptions = {}
): LLMClient {
  const {
    model = "anthropic/claude-3.5-sonnet",
    temperature = 0,
    maxTokens = 4096,
    appName = "evalsense",
    siteUrl,
    timeout = 30000,
  } = options;

  // Validate API key
  if (!apiKey) {
    throw new Error("OpenRouter API key is required. " + "Get one at https://openrouter.ai/keys");
  }

  const baseURL = "https://openrouter.ai/api/v1";

  async function callAPI(
    messages: Array<{ role: string; content: string }>,
    jsonMode: boolean = false
  ): Promise<string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": siteUrl || "https://github.com/evalsense/evalsense",
      "X-Title": appName,
    };

    const body: any = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    // Enable JSON mode if supported by model
    if (jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${baseURL}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || response.statusText || "Unknown error";
        throw new Error(`OpenRouter API error (${response.status}): ${errorMessage}`);
      }

      const data: any = await response.json();
      return data.choices?.[0]?.message?.content ?? "";
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw new Error(`OpenRouter request timed out after ${timeout}ms (model: ${model})`);
      }

      const errorMessage = error?.message || String(error);
      throw new Error(
        `OpenRouter API error (model: ${model}): ${errorMessage}\n` +
          `Check your API key and credits at https://openrouter.ai/activity`
      );
    }
  }

  return {
    async complete(prompt: string): Promise<string> {
      return callAPI([{ role: "user", content: prompt }], false);
    },

    async completeStructured<T>(prompt: string, schema: JSONSchema): Promise<T> {
      // Try JSON mode first (works for OpenAI models via OpenRouter)
      let response: string;
      try {
        response = await callAPI(
          [{ role: "user", content: prompt }],
          true // Enable JSON mode
        );
      } catch {
        // If JSON mode not supported, fall back to prompt engineering
        const jsonPrompt =
          prompt +
          "\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanation. " +
          `The JSON must match this schema: ${JSON.stringify(schema)}`;
        response = await callAPI([{ role: "user", content: jsonPrompt }], false);
      }

      try {
        return parseJSONResponse<T>(response);
      } catch (error: any) {
        throw new Error(
          `Failed to parse OpenRouter response as JSON: ${error.message}\n` +
            `Model: ${model}\n` +
            `Response preview: ${response.substring(0, 200)}...`
        );
      }
    },
  };
}
