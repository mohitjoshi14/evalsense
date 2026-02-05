/**
 * Metrics module - entry point for evalsense/metrics
 */

// Re-export opinionated metrics
export * from "./opinionated/index.js";

// Re-export custom metric utilities
export {
  registerMetric,
  getMetric,
  runMetric,
  listMetrics,
  unregisterMetric,
  clearMetrics,
  createPatternMetric,
  createKeywordMetric,
} from "./custom/index.js";

// Re-export utilities
export {
  normalizeScore,
  scoreToLabel,
  createMetricOutput,
  BINARY_THRESHOLDS,
  SEVERITY_THRESHOLDS,
  batch,
  delay,
} from "./utils/index.js";

// Re-export LLM client management
export { setLLMClient, getLLMClient, resetLLMClient, requireLLMClient } from "./llm/client.js";

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
} from "./llm/utils.js";

// Re-export mock adapter for testing
export {
  createMockLLMClient,
  createSequentialMockClient,
  createErrorMockClient,
  createSpyMockClient,
} from "./llm/adapters/mock.js";

// Re-export built-in LLM provider adapters
export { createOpenAIAdapter } from "./llm/adapters/openai.js";
export { createAnthropicAdapter } from "./llm/adapters/anthropic.js";
export { createOpenRouterAdapter } from "./llm/adapters/openrouter.js";

// Re-export adapter types
export type { OpenAIAdapterOptions } from "./llm/adapters/openai.js";
export type { AnthropicAdapterOptions } from "./llm/adapters/anthropic.js";
export type { OpenRouterAdapterOptions } from "./llm/adapters/openrouter.js";
