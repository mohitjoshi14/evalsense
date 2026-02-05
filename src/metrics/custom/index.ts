/**
 * Custom metric registration
 */

import type { MetricFn, MetricOutput, MetricConfig } from "../../core/types.js";

/**
 * Registry of custom metrics
 */
const customMetrics = new Map<string, MetricFn>();

/**
 * Registers a custom metric
 *
 * @example
 * ```ts
 * registerMetric("custom-relevance", async ({ outputs, query }) => {
 *   // Custom evaluation logic
 *   return outputs.map(o => ({
 *     id: o.id,
 *     metric: "custom-relevance",
 *     score: evaluateRelevance(o.output, query),
 *   }));
 * });
 * ```
 */
export function registerMetric(name: string, fn: MetricFn): void {
  if (customMetrics.has(name)) {
    throw new Error(`Metric "${name}" is already registered`);
  }
  customMetrics.set(name, fn);
}

/**
 * Gets a registered custom metric
 */
export function getMetric(name: string): MetricFn | undefined {
  return customMetrics.get(name);
}

/**
 * Runs a registered metric
 */
export async function runMetric(name: string, config: MetricConfig): Promise<MetricOutput[]> {
  const fn = customMetrics.get(name);
  if (!fn) {
    throw new Error(`Metric "${name}" is not registered`);
  }
  return fn(config);
}

/**
 * Lists all registered custom metrics
 */
export function listMetrics(): string[] {
  return Array.from(customMetrics.keys());
}

/**
 * Unregisters a metric (mainly for testing)
 */
export function unregisterMetric(name: string): boolean {
  return customMetrics.delete(name);
}

/**
 * Clears all registered metrics (mainly for testing)
 */
export function clearMetrics(): void {
  customMetrics.clear();
}

/**
 * Creates a simple string-matching metric
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
 */
export function createKeywordMetric(
  name: string,
  keywords: string[],
  options: { caseSensitive?: boolean; threshold?: number } = {}
): MetricFn {
  const { caseSensitive = false, threshold = 0.5 } = options;

  const normalizedKeywords = caseSensitive
    ? keywords
    : keywords.map((k) => k.toLowerCase());

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
