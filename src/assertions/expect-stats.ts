/**
 * expectStats() - fluent assertion API for statistical evaluation
 */

import type { ModelRunResult } from "../dataset/run-model.js";
import type { Prediction, AlignedRecord } from "../core/types.js";
import { alignByKey } from "../dataset/alignment.js";
import { FieldSelector } from "./field-selector.js";

/**
 * Input types that expectStats() accepts
 */
export type StatsInput = ModelRunResult | Prediction[] | AlignedRecord[];

/**
 * Normalizes input to aligned records format
 */
function normalizeInput(input: StatsInput): AlignedRecord[] {
  // ModelRunResult
  if ("aligned" in input && Array.isArray(input.aligned)) {
    return input.aligned;
  }

  // Array of predictions or aligned records
  if (Array.isArray(input)) {
    if (input.length === 0) {
      return [];
    }

    // Check if it's already AlignedRecord[]
    const first = input[0];
    if (first && "actual" in first && "expected" in first) {
      return input as AlignedRecord[];
    }

    // It's Prediction[] - convert to AlignedRecord with empty expected
    return (input as Prediction[]).map((p) => ({
      id: p.id,
      actual: { ...p },
      expected: {},
    }));
  }

  throw new Error("Invalid input to expectStats(): expected ModelRunResult, Prediction[], or AlignedRecord[]");
}

/**
 * Entry point for statistical assertions.
 *
 * Supports two usage patterns:
 * 1. Single argument: predictions without ground truth (for distribution assertions)
 * 2. Two arguments: predictions with ground truth (for classification metrics)
 *
 * @param inputOrActual - Either StatsInput (one-arg) or Prediction[] (two-arg)
 * @param expected - Ground truth data (optional, only for two-arg usage)
 * @returns ExpectStats instance for chaining assertions
 *
 * @example
 * // Pattern 1: Distribution assertions (no ground truth)
 * expectStats(predictions)
 *   .field("confidence")
 *   .toHavePercentageBelow(0.5, 0.9);
 *
 * @example
 * // Pattern 1b: Judge validation (with ground truth)
 * expectStats(judgeOutputs, humanLabels)
 *   .field("hallucinated")
 *   .toHaveRecallAbove(true, 0.85)
 *   .toHavePrecisionAbove(true, 0.8);
 */
export function expectStats(input: StatsInput): ExpectStats;
export function expectStats(
  actual: Prediction[],
  expected: Array<Record<string, unknown>>
): ExpectStats;
export function expectStats(
  inputOrActual: StatsInput | Prediction[],
  expected?: Array<Record<string, unknown>>
): ExpectStats {
  // Two-argument case: align predictions with ground truth
  if (expected !== undefined) {
    if (!Array.isArray(inputOrActual)) {
      throw new Error(
        "When using two-argument expectStats(), first argument must be Prediction[]"
      );
    }
    const aligned = alignByKey(inputOrActual as Prediction[], expected);
    return new ExpectStats(aligned);
  }

  // One-argument case: use existing normalization logic
  const aligned = normalizeInput(inputOrActual as StatsInput);
  return new ExpectStats(aligned);
}

/**
 * Main stats expectation class
 */
export class ExpectStats {
  private aligned: AlignedRecord[];

  constructor(aligned: AlignedRecord[]) {
    this.aligned = aligned;
  }

  /**
   * Selects a field to evaluate
   */
  field(fieldName: string): FieldSelector {
    return new FieldSelector(this.aligned, fieldName);
  }

  /**
   * Gets the raw aligned records (for advanced use)
   */
  getAligned(): AlignedRecord[] {
    return this.aligned;
  }

  /**
   * Gets the count of records
   */
  count(): number {
    return this.aligned.length;
  }
}
