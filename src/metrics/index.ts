/**
 * Metrics module - entry point for evalsense/metrics
 *
 * Provides LLM-based metrics, custom metric utilities, and LLM client management.
 */

// Re-export opinionated metrics
export * from "./opinionated/index.js";

// Re-export createLLMMetric factory and types
export { createLLMMetric } from "./create-metric.js";
export type {
  LLMMetric,
  LLMMetricConfig,
  LLMMetricOptions,
  EvalRecord,
  InputSpec,
  LabelThreshold,
  ResponseFieldType,
} from "./types.js";

// Re-export custom metric utilities (pattern and keyword based)
export { createPatternMetric, createKeywordMetric } from "./custom.js";

// Re-export utilities
export {
  normalizeScore,
  scoreToLabel,
  createMetricOutput,
  BINARY_THRESHOLDS,
  SEVERITY_THRESHOLDS,
  batch,
  delay,
} from "./utils.js";

// Re-export LLM client management
export {
  setLLMClient,
  getLLMClient,
  resetLLMClient,
  requireLLMClient,
  withLLMClient,
  configureLLM,
  setDefaults,
  getDefaults,
  resetDefaults,
} from "./client.js";
export type {
  LLMDefaults,
  LLMProvider,
  ConfigureLLMOptions,
  ConfigureLLMAutoOptions,
} from "./client.js";

// Re-export LLM utilities
export {
  fillPrompt,
  parseJSONResponse,
  validateResponse,
  extractScore,
  createJSONSchema,
  batchItems,
  createLLMError,
  withTimeout,
} from "./llm-utils.js";

// Re-export mock adapter for testing
export {
  createMockLLMClient,
  createSequentialMockClient,
  createErrorMockClient,
  createSpyMockClient,
} from "./adapters/mock.js";

// Re-export built-in LLM provider adapters
export { createOpenAIAdapter } from "./adapters/openai.js";
export { createAnthropicAdapter } from "./adapters/anthropic.js";
export { createOpenRouterAdapter } from "./adapters/openrouter.js";

// Re-export adapter types
export type { OpenAIAdapterOptions } from "./adapters/openai.js";
export type { AnthropicAdapterOptions } from "./adapters/anthropic.js";
export type { OpenRouterAdapterOptions } from "./adapters/openrouter.js";

// Testing namespace - groups all test utilities for convenient access
import { resetLLMClient, withLLMClient, resetDefaults } from "./client.js";
import {
  createMockLLMClient,
  createSequentialMockClient,
  createErrorMockClient,
  createSpyMockClient,
} from "./adapters/mock.js";

/**
 * Testing utilities for LLM metrics
 *
 * Provides convenient access to all testing-related functions in one namespace.
 *
 * @example
 * ```ts
 * import { testing } from "evalsense/metrics";
 *
 * describe("My tests", () => {
 *   beforeEach(testing.reset);
 *
 *   it("test with mock", async () => {
 *     const result = await testing.withClient(
 *       testing.mock({ response: { score: 0.8 } }),
 *       async () => hallucination([...])
 *     );
 *   });
 * });
 * ```
 */
export const testing = {
  /** Resets global LLM client and defaults */
  reset: () => {
    resetLLMClient();
    resetDefaults();
  },

  /** Creates a mock LLM client */
  mock: createMockLLMClient,

  /** Executes function with scoped LLM client */
  withClient: withLLMClient,

  /** Creates a mock client that returns sequential responses */
  sequentialMock: createSequentialMockClient,

  /** Creates a mock client that always errors */
  errorMock: createErrorMockClient,

  /** Creates a spy mock client that records all prompts */
  spyMock: createSpyMockClient,
};
