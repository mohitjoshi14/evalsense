/**
 * Custom metric utilities
 *
 * Provides simple pattern-based and keyword-based metrics for non-LLM use cases.
 * For LLM-based custom metrics, use createLLMMetric() from evalsense/metrics.
 */

import type { MetricFn, MetricOutput, MetricConfig } from "../core/types.js";

/**
 * Creates a simple string-matching metric
 *
 * @example
 * ```ts
 * const containsCodeMetric = createPatternMetric("contains-code", [
 *   /```[\s\S]*?```/,
 *   /function\s+\w+\s*\(/,
 *   /const\s+\w+\s*=/,
 * ]);
 *
 * const results = await containsCodeMetric({
 *   outputs: [{ id: "1", output: "const x = 5" }]
 * });
 * ```
 */
export function createPatternMetric(
  name: string,
  patterns: RegExp[],
  options: { matchScore?: number; noMatchScore?: number } = {}
): MetricFn {
  const { matchScore = 1, noMatchScore = 0 } = options;

  return async (config: MetricConfig): Promise<MetricOutput[]> => {
    return config.outputs.map((o) => {
      const hasMatch = patterns.some((p) => p.test(o.output));
      return {
        id: o.id,
        metric: name,
        score: hasMatch ? matchScore : noMatchScore,
        label: hasMatch ? "detected" : "not_detected",
      };
    });
  };
}

/**
 * Creates a keyword-based metric
 *
 * @example
 * ```ts
 * const techTermsMetric = createKeywordMetric("tech-terms", [
 *   "machine learning",
 *   "neural network",
 *   "algorithm",
 * ], { threshold: 0.3 });
 *
 * const results = await techTermsMetric({
 *   outputs: [{ id: "1", output: "This uses a neural network algorithm." }]
 * });
 * ```
 */
export function createKeywordMetric(
  name: string,
  keywords: string[],
  options: { caseSensitive?: boolean; threshold?: number } = {}
): MetricFn {
  const { caseSensitive = false, threshold = 0.5 } = options;

  const normalizedKeywords = caseSensitive ? keywords : keywords.map((k) => k.toLowerCase());

  return async (config: MetricConfig): Promise<MetricOutput[]> => {
    return config.outputs.map((o) => {
      const text = caseSensitive ? o.output : o.output.toLowerCase();
      const matches = normalizedKeywords.filter((k) => text.includes(k));
      const score = matches.length / keywords.length;

      return {
        id: o.id,
        metric: name,
        score,
        label: score >= threshold ? "detected" : "not_detected",
      };
    });
  };
}
