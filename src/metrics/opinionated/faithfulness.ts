/**
 * Faithfulness metric (LLM-based)
 *
 * Measures how faithful the output is to the source material.
 * Uses LLM evaluation to detect contradictions and misrepresentations.
 *
 * @example
 * ```ts
 * import { setLLMClient, faithfulness } from "evalsense/metrics";
 *
 * setLLMClient({ async complete(prompt) { ... } });
 *
 * const results = await faithfulness([
 *   { id: "1", output: "The document discusses climate change.", source: "This report covers the impacts of climate change on biodiversity." },
 * ]);
 * ```
 */

import { createLLMMetric } from "../create-metric.js";
import { FAITHFULNESS_PER_ROW_PROMPT, FAITHFULNESS_BATCH_PROMPT } from "../prompts/faithfulness.js";

/**
 * Measures the faithfulness of outputs to their source material.
 *
 * Score interpretation:
 * - 0.0 = Unfaithful (contradicts or misrepresents source)
 * - 0.5 = Partially faithful (some accurate, some distortions)
 * - 1.0 = Fully faithful (accurate representation of source)
 *
 * Labels:
 * - "high" = High faithfulness (score >= 0.7)
 * - "medium" = Medium faithfulness (score >= 0.4)
 * - "low" = Low faithfulness (score < 0.4)
 *
 * @example
 * ```ts
 * const results = await faithfulness([
 *   { id: "1", output: "Revenue increased by 15%", source: "Revenue increased by 15% in Q4" },
 *   { id: "2", output: "Sales dropped sharply", source: "Sales increased modestly" },
 * ]);
 *
 * // With batch mode for lower cost:
 * const batchResults = await faithfulness(records, { evaluationMode: "batch" });
 * ```
 */
export const faithfulness = createLLMMetric({
  name: "faithfulness",
  inputs: ["output", "source"],
  prompt: FAITHFULNESS_PER_ROW_PROMPT,
  batchPrompt: FAITHFULNESS_BATCH_PROMPT,
  responseFields: {
    score: "number",
    faithful_statements: "array",
    unfaithful_statements: "array",
    reasoning: "string",
  },
  labels: [
    { min: 0.7, label: "high" },
    { min: 0.4, label: "medium" },
    { min: 0, label: "low" },
  ],
});
