/**
 * Hallucination detection metric (LLM-based)
 *
 * Detects statements in the output that are not supported by the provided context.
 * Uses LLM evaluation for accurate hallucination detection.
 *
 * @example
 * ```ts
 * import { setLLMClient, hallucination } from "evalsense/metrics";
 *
 * setLLMClient({ async complete(prompt) { ... } });
 *
 * const results = await hallucination([
 *   { id: "1", output: "The capital of France is Paris.", context: "France is in Europe. Its capital is Paris." },
 * ]);
 * ```
 */

import { createLLMMetric } from "../create-metric.js";
import {
  HALLUCINATION_PER_ROW_PROMPT,
  HALLUCINATION_BATCH_PROMPT,
} from "../prompts/hallucination.js";

/**
 * Detects potential hallucinations by checking if output content
 * is supported by the provided context.
 *
 * Score interpretation:
 * - 0.0 = No hallucinations (all claims fully supported)
 * - 0.5 = Some unsupported claims
 * - 1.0 = Severe hallucinations (most/all claims unsupported)
 *
 * Labels:
 * - "true" = Hallucination detected (score >= 0.5)
 * - "false" = No hallucination (score < 0.5)
 *
 * @example
 * ```ts
 * // Per-row mode (default - more accurate)
 * const results = await hallucination([
 *   { id: "1", output: "Paris has 50M people", context: "Paris has 2.1M residents" },
 *   { id: "2", output: "Berlin is Germany's capital", context: "Berlin is the capital of Germany" },
 * ]);
 *
 * // Batch mode (lower cost, less accurate)
 * const batchResults = await hallucination(records, { evaluationMode: "batch" });
 * ```
 */
export const hallucination = createLLMMetric({
  name: "hallucination",
  inputs: ["output", "context"],
  prompt: HALLUCINATION_PER_ROW_PROMPT,
  batchPrompt: HALLUCINATION_BATCH_PROMPT,
  responseFields: {
    score: "number",
    hallucinated_claims: "array",
    reasoning: "string",
  },
  labels: [
    { min: 0.5, label: "true" },
    { min: 0, label: "false" },
  ],
});
