/**
 * Built-in Anthropic (Claude) adapter for evalsense
 *
 * Provides a simple way to use Claude models without writing adapter code.
 *
 * @example
 * ```javascript
 * import { setLLMClient, createAnthropicAdapter } from 'evalsense/metrics';
 *
 * setLLMClient(createAnthropicAdapter(process.env.ANTHROPIC_API_KEY, {
 *   model: 'claude-3-5-sonnet-20241022'
 * }));
 * ```
 */

import type { LLMClient, JSONSchema } from "../../../core/types.js";
import { parseJSONResponse } from "../utils.js";

export interface AnthropicAdapterOptions {
  /**
   * Anthropic model to use
   * @default "claude-3-5-sonnet-20241022"
   */
  model?: string;

  /**
   * Maximum tokens per completion
   * @default 4096
   */
  maxTokens?: number;

  /**
   * Temperature for generation (0-1)
   * Note: Anthropic doesn't support temperature > 1
   * @default 0
   */
  temperature?: number;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;
}

/**
 * Creates an LLM client adapter for Anthropic Claude.
 *
 * **Setup:**
 * 1. Install Anthropic SDK: `npm install @anthropic-ai/sdk`
 * 2. Get API key from https://console.anthropic.com/
 * 3. Set environment variable: `export ANTHROPIC_API_KEY="sk-ant-..."`
 *
 * **Model Options:**
 * - `claude-3-5-sonnet-20241022` - Latest, most capable (recommended)
 * - `claude-3-opus-20240229` - Most capable, expensive
 * - `claude-3-sonnet-20240229` - Balanced performance
 * - `claude-3-haiku-20240307` - Fast and affordable
 *
 * @param apiKey - Your Anthropic API key
 * @param options - Configuration options
 * @returns LLM client for use with evalsense metrics
 *
 * @example
 * ```javascript
 * // Basic usage
 * const client = createAnthropicAdapter(process.env.ANTHROPIC_API_KEY);
 * setLLMClient(client);
 *
 * // With custom model
 * const client = createAnthropicAdapter(process.env.ANTHROPIC_API_KEY, {
 *   model: 'claude-3-haiku-20240307',  // Cheaper, faster model
 *   maxTokens: 2048
 * });
 * ```
 */
export function createAnthropicAdapter(
  apiKey: string,
  options: AnthropicAdapterOptions = {}
): LLMClient {
  const {
    model = "claude-3-5-sonnet-20241022",
    maxTokens = 4096,
    temperature = 0,
    timeout = 30000,
  } = options;

  // Validate API key
  if (!apiKey) {
    throw new Error(
      "Anthropic API key is required. " + "Get one at https://console.anthropic.com/"
    );
  }

  // Validate temperature (Anthropic only supports 0-1)
  if (temperature < 0 || temperature > 1) {
    throw new Error(`Anthropic temperature must be between 0 and 1, got ${temperature}`);
  }

  // Lazy-load Anthropic SDK (peer dependency)
  let Anthropic: any;
  let anthropicClient: any;

  function ensureClient() {
    if (anthropicClient) return anthropicClient;

    try {
      // Try ESM import first
      Anthropic = require("@anthropic-ai/sdk").default || require("@anthropic-ai/sdk");
    } catch (error) {
      throw new Error(
        "Anthropic SDK not found. Install it with: npm install @anthropic-ai/sdk\n" +
          "Visit https://github.com/anthropics/anthropic-sdk-typescript for documentation."
      );
    }

    anthropicClient = new Anthropic({
      apiKey,
      timeout,
    });

    return anthropicClient;
  }

  return {
    async complete(prompt: string): Promise<string> {
      const client = ensureClient();

      try {
        const message = await client.messages.create({
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [{ role: "user", content: prompt }],
        });

        // Extract text from first content block
        const firstBlock = message.content[0];
        return firstBlock?.type === "text" ? firstBlock.text : "";
      } catch (error: any) {
        const errorMessage = error?.message || error?.error?.message || String(error);
        throw new Error(
          `Anthropic API error (model: ${model}): ${errorMessage}\n` +
            `Check your API key and usage at https://console.anthropic.com/`
        );
      }
    },

    async completeStructured<T>(prompt: string, schema: JSONSchema): Promise<T> {
      // Note: Anthropic doesn't have built-in JSON mode yet
      // We parse JSON from text response
      const jsonPrompt =
        prompt +
        "\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanation. " +
        `The JSON must match this schema: ${JSON.stringify(schema)}`;

      const response = await this.complete(jsonPrompt);

      try {
        return parseJSONResponse<T>(response);
      } catch (error: any) {
        throw new Error(
          `Failed to parse Anthropic response as JSON: ${error.message}\n` +
            `Response preview: ${response.substring(0, 200)}...`
        );
      }
    },
  };
}
