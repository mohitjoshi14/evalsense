/**
 * Built-in OpenAI adapter for evalsense
 *
 * Provides a simple way to use OpenAI models without writing adapter code.
 *
 * @example
 * ```javascript
 * import { setLLMClient, createOpenAIAdapter } from 'evalsense/metrics';
 *
 * setLLMClient(createOpenAIAdapter(process.env.OPENAI_API_KEY, {
 *   model: 'gpt-4-turbo-preview',
 *   temperature: 0
 * }));
 * ```
 */

import type { LLMClient, JSONSchema } from "../../core/types.js";

export interface OpenAIAdapterOptions {
  /**
   * OpenAI model to use
   * @default "gpt-4-turbo-preview"
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
   * API base URL (for Azure OpenAI or proxies)
   * @default undefined (uses default OpenAI endpoint)
   */
  baseURL?: string;

  /**
   * Organization ID (optional)
   */
  organization?: string;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;
}

/**
 * Creates an LLM client adapter for OpenAI.
 *
 * **Setup:**
 * 1. Install OpenAI SDK: `npm install openai`
 * 2. Get API key from https://platform.openai.com/api-keys
 * 3. Set environment variable: `export OPENAI_API_KEY="sk-..."`
 *
 * **Model Options:**
 * - `gpt-4-turbo-preview` - Most capable, expensive
 * - `gpt-4` - High quality, expensive
 * - `gpt-3.5-turbo` - Fast and cheap (20x cheaper than GPT-4)
 *
 * @param apiKey - Your OpenAI API key
 * @param options - Configuration options
 * @returns LLM client for use with evalsense metrics
 *
 * @example
 * ```javascript
 * // Basic usage
 * const client = createOpenAIAdapter(process.env.OPENAI_API_KEY);
 * setLLMClient(client);
 *
 * // With custom model
 * const client = createOpenAIAdapter(process.env.OPENAI_API_KEY, {
 *   model: 'gpt-3.5-turbo',  // Cheaper model
 *   temperature: 0.3
 * });
 *
 * // With Azure OpenAI
 * const client = createOpenAIAdapter(process.env.AZURE_OPENAI_KEY, {
 *   baseURL: 'https://your-resource.openai.azure.com',
 *   model: 'gpt-4'
 * });
 * ```
 */
export function createOpenAIAdapter(apiKey: string, options: OpenAIAdapterOptions = {}): LLMClient {
  const {
    model = "gpt-4-turbo-preview",
    temperature = 0,
    maxTokens = 4096,
    baseURL,
    organization,
    timeout = 30000,
  } = options;

  // Validate API key
  if (!apiKey) {
    throw new Error(
      "OpenAI API key is required. " + "Get one at https://platform.openai.com/api-keys"
    );
  }

  // Lazy-load OpenAI SDK (peer dependency)
  let OpenAI: any;
  let openaiClient: any;

  function ensureClient() {
    if (openaiClient) return openaiClient;

    try {
      // Try ESM import first
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      OpenAI = require("openai").default || require("openai");
    } catch {
      throw new Error(
        "OpenAI SDK not found. Install it with: npm install openai\n" +
          "Visit https://github.com/openai/openai-node for documentation."
      );
    }

    openaiClient = new OpenAI({
      apiKey,
      baseURL,
      organization,
      timeout,
    });

    return openaiClient;
  }

  return {
    async complete(prompt: string): Promise<string> {
      const client = ensureClient();

      try {
        const response = await client.chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature,
          max_tokens: maxTokens,
        });

        return response.choices[0]?.message?.content ?? "";
      } catch (error: any) {
        // Enhance error message with context
        const errorMessage = error?.message || error?.error?.message || String(error);
        throw new Error(
          `OpenAI API error (model: ${model}): ${errorMessage}\n` +
            `Check your API key and quota at https://platform.openai.com/account/usage`
        );
      }
    },

    async completeStructured<T>(prompt: string, _schema: JSONSchema): Promise<T> {
      const client = ensureClient();

      try {
        const response = await client.chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature,
          max_tokens: maxTokens,
        });

        const text = response.choices[0]?.message?.content ?? "{}";
        return JSON.parse(text) as T;
      } catch (error: any) {
        const errorMessage = error?.message || error?.error?.message || String(error);
        throw new Error(
          `OpenAI API error (model: ${model}): ${errorMessage}\n` +
            `Check your API key and quota at https://platform.openai.com/account/usage`
        );
      }
    },
  };
}
