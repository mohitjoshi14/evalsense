/**
 * Dataset alignment utilities
 * Aligns predictions with ground truth by ID
 */

import type { Prediction, AlignedRecord } from "../core/types.js";
import { IntegrityError } from "../core/errors.js";

/**
 * Options for alignment
 */
export interface AlignOptions {
  /** Whether to throw on missing IDs (default: false) */
  strict?: boolean;
  /** Field to use as ID in both arrays (default: "id") - legacy option */
  idField?: string;
  /** Field to use as ID in predictions array (default: "id") */
  predictionIdField?: string;
  /** Field to use as ID in expected/ground truth array (default: "id") */
  expectedIdField?: string;
}

/**
 * Aligns predictions with expected values by ID
 *
 * @param predictions - Model predictions with IDs
 * @param expected - Ground truth records with IDs
 * @param options - Alignment options
 * @returns Array of aligned records
 */
export function alignByKey(
  predictions: Prediction[],
  expected: Array<Record<string, unknown>>,
  options: AlignOptions = {}
): AlignedRecord[] {
  const { strict = false, idField, predictionIdField, expectedIdField } = options;

  // Determine which fields to use for IDs
  // Priority: specific field options > legacy idField > default "id"
  const predIdField = predictionIdField ?? idField ?? "id";
  const expIdField = expectedIdField ?? idField ?? "id";

  // Build lookup map for expected values
  const expectedMap = new Map<string, Record<string, unknown>>();
  for (const record of expected) {
    const id = String(record[expIdField] ?? record._id);
    if (!id || id === "undefined") {
      throw new IntegrityError(
        `Expected record missing ${expIdField} field: ${JSON.stringify(record)}`
      );
    }
    expectedMap.set(id, record);
  }

  const aligned: AlignedRecord[] = [];
  const missingIds: string[] = [];

  for (const prediction of predictions) {
    const id = String((prediction as Record<string, unknown>)[predIdField]);
    if (!id || id === "undefined") {
      throw new IntegrityError(
        `Prediction missing ${predIdField} field: ${JSON.stringify(prediction)}`
      );
    }
    const expectedRecord = expectedMap.get(id);

    if (!expectedRecord) {
      missingIds.push(id);
      if (strict) {
        continue;
      }
      // In non-strict mode, include with empty expected
      aligned.push({
        id,
        actual: { ...prediction },
        expected: {},
      });
    } else {
      aligned.push({
        id,
        actual: { ...prediction },
        expected: { ...expectedRecord },
      });
    }
  }

  if (strict && missingIds.length > 0) {
    throw new IntegrityError(
      `${missingIds.length} prediction(s) have no matching expected record`,
      missingIds
    );
  }

  return aligned;
}

/**
 * Extracts field values from aligned records for statistical analysis
 *
 * @param aligned - Aligned records
 * @param field - Field name to extract
 * @returns Object with actual and expected arrays
 */
export function extractFieldValues(
  aligned: AlignedRecord[],
  field: string
): { actual: unknown[]; expected: unknown[]; ids: string[] } {
  const actual: unknown[] = [];
  const expected: unknown[] = [];
  const ids: string[] = [];

  for (const record of aligned) {
    actual.push(record.actual[field]);
    expected.push(record.expected[field]);
    ids.push(record.id);
  }

  return { actual, expected, ids };
}

/**
 * Filters aligned records to only those with values in both actual and expected
 */
export function filterComplete(aligned: AlignedRecord[], field: string): AlignedRecord[] {
  return aligned.filter((record) => {
    const actualValue = record.actual[field];
    const expectedValue = record.expected[field];
    return actualValue !== undefined && expectedValue !== undefined;
  });
}
