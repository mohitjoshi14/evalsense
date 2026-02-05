/**
 * Metric utilities
 */

import type { MetricOutput } from "../../core/types.js";

/**
 * Normalizes a score to 0-1 range
 */
export function normalizeScore(score: number, min = 0, max = 1): number {
  const range = max - min;
  if (range === 0) return 0;
  return Math.max(0, Math.min(1, (score - min) / range));
}

/**
 * Converts a numeric score to a label based on thresholds
 */
export function scoreToLabel(
  score: number,
  thresholds: { label: string; min: number }[]
): string {
  // Sort thresholds by min descending
  const sorted = [...thresholds].sort((a, b) => b.min - a.min);

  for (const { label, min } of sorted) {
    if (score >= min) {
      return label;
    }
  }

  return thresholds[thresholds.length - 1]?.label ?? "unknown";
}

/**
 * Creates a metric output from a score
 */
export function createMetricOutput(
  id: string,
  metric: string,
  score: number,
  labelThresholds?: { label: string; min: number }[]
): MetricOutput {
  const normalizedScore = normalizeScore(score);
  const label = labelThresholds
    ? scoreToLabel(normalizedScore, labelThresholds)
    : normalizedScore >= 0.5
      ? "high"
      : "low";

  return {
    id,
    metric,
    score: normalizedScore,
    label,
  };
}

/**
 * Default thresholds for binary metrics
 */
export const BINARY_THRESHOLDS = [
  { label: "true", min: 0.5 },
  { label: "false", min: 0 },
];

/**
 * Default thresholds for severity metrics
 */
export const SEVERITY_THRESHOLDS = [
  { label: "high", min: 0.7 },
  { label: "medium", min: 0.4 },
  { label: "low", min: 0 },
];

/**
 * Batches items for parallel processing
 */
export function batch<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

/**
 * Delays execution
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
