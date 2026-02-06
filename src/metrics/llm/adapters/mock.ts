/**
 * Mock LLM client for testing
 *
 * Provides a configurable mock implementation of LLMClient for unit tests.
 */

import type { LLMClient, JSONSchema } from "../../../core/types.js";

/**
 * Configuration for mock LLM client
 */
export interface MockLLMConfig {
  /** Fixed response to return (can be string or object for JSON mode) */
  response?: string | Record<string, unknown>;

  /** Multiple responses for sequential calls */
  responses?: Array<string | Record<string, unknown>>;

  /** Delay in milliseconds before responding */
  delay?: number;

  /** Whether to throw an error */
  shouldError?: boolean;

  /** Error message to throw */
  errorMessage?: string;

  /** Function to validate prompts */
  onPrompt?: (prompt: string) => void;
}

/**
 * Creates a mock LLM client for testing
 *
 * @example
 * ```ts
 * const mock = createMockLLMClient({
 *   response: JSON.stringify({ score: 0.8, reasoning: "test" }),
 *   delay: 100
 * });
 *
 * setLLMClient(mock);
 * ```
 */
export function createMockLLMClient(config: MockLLMConfig = {}): LLMClient {
  const {
    response,
    responses,
    delay = 0,
    shouldError = false,
    errorMessage = "Mock LLM error",
    onPrompt,
  } = config;

  let callCount = 0;

  const getResponse = (): string | Record<string, unknown> => {
    if (responses && responses.length > 0) {
      const resp = responses[Math.min(callCount, responses.length - 1)];
      if (!resp) {
        return JSON.stringify({ score: 0.5, reasoning: "Mock response" });
      }
      callCount++;
      return resp;
    }

    if (response !== undefined) {
      return response;
    }

    // Default response
    return JSON.stringify({ score: 0.5, reasoning: "Mock response" });
  };

  return {
    async complete(prompt: string): Promise<string> {
      // Call validation hook if provided
      if (onPrompt) {
        onPrompt(prompt);
      }

      // Simulate delay
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Simulate error
      if (shouldError) {
        throw new Error(errorMessage);
      }

      // Return response
      const resp = getResponse();
      return typeof resp === "string" ? resp : JSON.stringify(resp);
    },

    async completeStructured<T>(prompt: string, _schema: JSONSchema): Promise<T> {
      // Call validation hook if provided
      if (onPrompt) {
        onPrompt(prompt);
      }

      // Simulate delay
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Simulate error
      if (shouldError) {
        throw new Error(errorMessage);
      }

      // Return response as object
      const resp = getResponse();
      if (typeof resp === "string") {
        try {
          return JSON.parse(resp) as T;
        } catch {
          throw new Error(`Mock response is not valid JSON: ${resp}`);
        }
      }

      return resp as T;
    },
  };
}

/**
 * Creates a mock client that returns sequential responses
 *
 * Useful for testing multiple calls with different responses.
 *
 * @example
 * ```ts
 * const mock = createSequentialMockClient([
 *   { score: 0.2, reasoning: "First call" },
 *   { score: 0.8, reasoning: "Second call" }
 * ]);
 * ```
 */
export function createSequentialMockClient(
  responses: Array<string | Record<string, unknown>>,
  options: { delay?: number } = {}
): LLMClient {
  return createMockLLMClient({
    responses,
    delay: options.delay,
  });
}

/**
 * Creates a mock client that always errors
 *
 * Useful for testing error handling.
 */
export function createErrorMockClient(errorMessage = "Mock LLM error"): LLMClient {
  return createMockLLMClient({
    shouldError: true,
    errorMessage,
  });
}

/**
 * Creates a spy mock client that records all prompts
 *
 * Useful for testing what prompts are being sent to the LLM.
 *
 * @example
 * ```ts
 * const { client, prompts } = createSpyMockClient({ score: 0.5 });
 * await metric({ outputs, context, llmClient: client });
 * console.log(prompts); // See all prompts that were sent
 * ```
 */
export function createSpyMockClient(response: string | Record<string, unknown>): {
  client: LLMClient;
  prompts: string[];
} {
  const prompts: string[] = [];

  const client = createMockLLMClient({
    response,
    onPrompt: (prompt) => prompts.push(prompt),
  });

  return { client, prompts };
}
