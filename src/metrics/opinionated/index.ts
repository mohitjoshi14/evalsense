/**
 * Opinionated metrics - LLM-based evaluation metrics
 *
 * These metrics use LLM evaluation for accurate assessment of hallucination,
 * relevance, faithfulness, and toxicity. Requires configuring an LLM client
 * with setLLMClient() before use.
 *
 * All metrics now use unified record input (no more parallel arrays):
 *
 * @example
 * ```ts
 * import { setLLMClient, hallucination, relevance, faithfulness, toxicity } from "evalsense/metrics/opinionated";
 *
 * setLLMClient({
 *   async complete(prompt) {
 *     return await yourLLM.generate(prompt);
 *   }
 * });
 *
 * // Unified record input
 * const results = await hallucination([
 *   { id: "1", output: "Paris has 50M people", context: "Paris has 2.1M residents" },
 * ]);
 *
 * // Or with options
 * const batchResults = await relevance(records, { evaluationMode: "batch" });
 * ```
 */

export { hallucination } from "./hallucination.js";
export { relevance } from "./relevance.js";
export { faithfulness } from "./faithfulness.js";
export { toxicity } from "./toxicity.js";
