/**
 * expectStats() - fluent assertion API for statistical evaluation
 */

import type { Prediction, AlignedRecord } from "../core/types.js";
import { alignByKey } from "../dataset/alignment.js";
import { FieldSelector } from "./field-selector.js";

/**
 * Object with aligned records (e.g., from custom model execution)
 */
export interface AlignedRecordsInput {
  aligned: AlignedRecord[];
}

/**
 * Input types that expectStats() accepts
 */
export type StatsInput = AlignedRecordsInput | Prediction[] | AlignedRecord[];

/**
 * Options for expectStats when using two-argument form
 */
export interface ExpectStatsOptions {
  /**
   * Field to use as ID in both arrays (default: "id") - legacy option
   * Also checks "_id" as fallback for expected records.
   */
  idField?: string;

  /**
   * Field to use as ID in predictions array (default: "id")
   */
  predictionIdField?: string;

  /**
   * Field to use as ID in expected/ground truth array (default: "id")
   */
  expectedIdField?: string;

  /**
   * Whether to throw on missing IDs (default: false)
   * When true, throws if any prediction has no matching expected record.
   */
  strict?: boolean;
}

/**
 * Normalizes input to aligned records format
 */
function normalizeInput(input: StatsInput): AlignedRecord[] {
  // AlignedRecordsInput (object with aligned array)
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

  throw new Error(
    "Invalid input to expectStats(): expected { aligned: AlignedRecord[] }, Prediction[], or AlignedRecord[]"
  );
}

/**
 * Entry point for statistical assertions.
 *
 * Supports multiple usage patterns:
 * 1. Single argument: predictions without ground truth (for distribution assertions)
 * 2. Two arguments: predictions with ground truth (for classification/regression metrics)
 * 3. Three arguments: predictions with ground truth and options (for custom ID field)
 *
 * @param inputOrActual - Either StatsInput (one-arg) or Prediction[] (two/three-arg)
 * @param expected - Ground truth data (optional, only for two/three-arg usage)
 * @param options - Alignment options (optional, only for three-arg usage)
 * @returns ExpectStats instance for chaining assertions
 *
 * @example
 * // Pattern 1: Distribution assertions (no ground truth)
 * expectStats(predictions)
 *   .field("confidence")
 *   .percentageBelow(0.5).toBeAtLeast(0.9);
 *
 * @example
 * // Pattern 2: Classification with ground truth
 * expectStats(judgeOutputs, humanLabels)
 *   .field("hallucinated")
 *   .recall(true).toBeAtLeast(0.85)
 *   .precision(true).toBeAtLeast(0.8);
 *
 * @example
 * // Pattern 3: Custom ID field
 * expectStats(predictions, groundTruth, { idField: 'uuid' })
 *   .field("score")
 *   .accuracy.toBeAtLeast(0.8);
 */

export function expectStats(input: StatsInput): ExpectStats;
// eslint-disable-next-line no-redeclare
export function expectStats(
  actual: Prediction[],
  expected: Array<Record<string, unknown>>
): ExpectStats;
// eslint-disable-next-line no-redeclare
export function expectStats(
  actual: Prediction[],
  expected: Array<Record<string, unknown>>,
  options: ExpectStatsOptions
): ExpectStats;
// eslint-disable-next-line no-redeclare
export function expectStats(
  inputOrActual: StatsInput | Prediction[],
  expected?: Array<Record<string, unknown>>,
  options?: ExpectStatsOptions
): ExpectStats {
  // Two or three argument case: align predictions with ground truth
  if (expected !== undefined) {
    if (!Array.isArray(inputOrActual)) {
      throw new Error("When using two-argument expectStats(), first argument must be Prediction[]");
    }
    const alignOptions = options
      ? {
          idField: options.idField,
          predictionIdField: options.predictionIdField,
          expectedIdField: options.expectedIdField,
          strict: options.strict,
        }
      : undefined;
    const aligned = alignByKey(inputOrActual as Prediction[], expected, alignOptions);
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
