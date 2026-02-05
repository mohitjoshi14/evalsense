/**
 * Opinionated metrics - LLM-based evaluation metrics
 *
 * These metrics use LLM evaluation for accurate assessment of hallucination,
 * relevance, faithfulness, and toxicity. Requires configuring an LLM client
 * with setLLMClient() before use.
 *
 * @example
 * ```ts
 * import { setLLMClient, hallucination } from "evalsense/metrics/opinionated";
 *
 * setLLMClient({
 *   async complete(prompt) {
 *     return await yourLLM.generate(prompt);
 *   }
 * });
 *
 * const results = await hallucination({ outputs, context });
 * ```
 */

export { hallucination, type HallucinationConfig } from "./hallucination.js";
export { relevance, type RelevanceConfig } from "./relevance.js";
export { faithfulness, type FaithfulnessConfig } from "./faithfulness.js";
export { toxicity, type ToxicityConfig } from "./toxicity.js";
