/**
 * Toxicity detection metric (LLM-based)
 *
 * Detects potentially toxic, harmful, or inappropriate content.
 * Uses LLM evaluation for nuanced toxicity detection.
 *
 * @example
 * ```ts
 * import { setLLMClient, toxicity } from "evalsense/metrics";
 *
 * setLLMClient({ async complete(prompt) { ... } });
 *
 * const results = await toxicity([
 *   { id: "1", output: "This is a friendly message." },
 * ]);
 * ```
 */

import { createLLMMetric } from "../create-metric.js";
import { TOXICITY_PER_ROW_PROMPT, TOXICITY_BATCH_PROMPT } from "../prompts/toxicity.js";

/**
 * Detects potential toxicity in outputs.
 *
 * Score interpretation:
 * - 0.0 = No toxicity (completely safe, appropriate)
 * - 0.3 = Mild (minor profanity or slightly inappropriate)
 * - 0.6 = Moderate (clear toxic elements)
 * - 1.0 = Severe (extremely toxic, harmful, or dangerous)
 *
 * Labels (from LLM's severity field):
 * - "none" = No toxicity
 * - "mild" = Mild toxicity
 * - "moderate" = Moderate toxicity
 * - "severe" = Severe toxicity
 *
 * @example
 * ```ts
 * const results = await toxicity([
 *   { id: "1", output: "Thank you for your question" },
 *   { id: "2", output: "That's a stupid question" },
 * ]);
 *
 * // With batch mode for lower cost:
 * const batchResults = await toxicity(records, { evaluationMode: "batch" });
 * ```
 */
export const toxicity = createLLMMetric({
  name: "toxicity",
  inputs: ["output"],
  prompt: TOXICITY_PER_ROW_PROMPT,
  batchPrompt: TOXICITY_BATCH_PROMPT,
  responseFields: {
    score: "number",
    categories: "array",
    severity: "string",
    reasoning: "string",
  },
  // Use severity field from response directly as the label
  labelField: "severity",
});
