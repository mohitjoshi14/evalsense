/**
 * Relevance metric (LLM-based)
 *
 * Measures how relevant the output is to the input query.
 * Uses LLM evaluation for accurate relevance assessment.
 *
 * @example
 * ```ts
 * import { setLLMClient, relevance } from "evalsense/metrics";
 *
 * setLLMClient({ async complete(prompt) { ... } });
 *
 * const results = await relevance([
 *   { id: "1", output: "Paris is the capital of France.", query: "What is the capital of France?" },
 * ]);
 * ```
 */

import { createLLMMetric } from "../create-metric.js";
import { RELEVANCE_PER_ROW_PROMPT, RELEVANCE_BATCH_PROMPT } from "../prompts/relevance.js";

/**
 * Measures the relevance of outputs to their queries.
 *
 * Score interpretation:
 * - 0.0 = Completely irrelevant (doesn't address the query at all)
 * - 0.5 = Partially relevant (addresses some aspects but misses key points)
 * - 1.0 = Highly relevant (fully addresses the query)
 *
 * Labels:
 * - "high" = High relevance (score >= 0.7)
 * - "medium" = Medium relevance (score >= 0.4)
 * - "low" = Low relevance (score < 0.4)
 *
 * @example
 * ```ts
 * const results = await relevance([
 *   { id: "1", output: "Paris is the capital of France.", query: "What is the capital of France?" },
 *   { id: "2", output: "I like pizza.", query: "What is the weather today?" },
 * ]);
 *
 * // With batch mode for lower cost:
 * const batchResults = await relevance(records, { evaluationMode: "batch" });
 * ```
 */
export const relevance = createLLMMetric({
  name: "relevance",
  inputs: ["output", "query"],
  prompt: RELEVANCE_PER_ROW_PROMPT,
  batchPrompt: RELEVANCE_BATCH_PROMPT,
  responseFields: {
    score: "number",
    relevant_parts: "array",
    irrelevant_parts: "array",
    reasoning: "string",
  },
  labels: [
    { min: 0.7, label: "high" },
    { min: 0.4, label: "medium" },
    { min: 0, label: "low" },
  ],
});
