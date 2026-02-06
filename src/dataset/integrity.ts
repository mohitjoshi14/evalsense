/**
 * Dataset integrity checks
 */

import type { Dataset, IntegrityResult, Prediction } from "../core/types.js";
import { IntegrityError } from "../core/errors.js";

/**
 * Options for integrity checks
 */
export interface IntegrityOptions {
  /** Required fields that must be present in each record */
  requiredFields?: string[];
  /** Whether to throw on integrity failures (default: false) */
  throwOnFailure?: boolean;
}

/**
 * Checks dataset integrity - validates IDs and required fields
 *
 * @param dataset - Dataset to check
 * @param options - Integrity check options
 * @returns Integrity result with details
 */
export function checkIntegrity<T extends Record<string, unknown>>(
  dataset: Dataset<T>,
  options: IntegrityOptions = {}
): IntegrityResult {
  const { requiredFields = [], throwOnFailure = false } = options;

  const seenIds = new Map<string, number>();
  const missingIds: string[] = [];
  const duplicateIds: string[] = [];
  const missingFields: Array<{ id: string; fields: string[] }> = [];

  for (let i = 0; i < dataset.records.length; i++) {
    const record = dataset.records[i];
    if (!record) continue;

    // Check for ID
    const id = record.id ?? record._id;
    if (id === undefined || id === null) {
      missingIds.push(`record[${i}]`);
    } else {
      const idStr = String(id);
      const previousIndex = seenIds.get(idStr);
      if (previousIndex !== undefined) {
        duplicateIds.push(idStr);
      } else {
        seenIds.set(idStr, i);
      }
    }

    // Check for required fields
    if (requiredFields.length > 0) {
      const missing = requiredFields.filter((field) => record[field] === undefined);
      if (missing.length > 0) {
        missingFields.push({
          id: String(id ?? `record[${i}]`),
          fields: missing,
        });
      }
    }
  }

  const valid = missingIds.length === 0 && duplicateIds.length === 0 && missingFields.length === 0;

  const result: IntegrityResult = {
    valid,
    totalRecords: dataset.records.length,
    missingIds,
    duplicateIds,
    missingFields,
  };

  if (throwOnFailure && !valid) {
    const issues: string[] = [];
    if (missingIds.length > 0) {
      issues.push(`${missingIds.length} record(s) missing ID`);
    }
    if (duplicateIds.length > 0) {
      issues.push(
        `${duplicateIds.length} duplicate ID(s): ${duplicateIds.slice(0, 3).join(", ")}${duplicateIds.length > 3 ? "..." : ""}`
      );
    }
    if (missingFields.length > 0) {
      issues.push(`${missingFields.length} record(s) missing required fields`);
    }
    throw new IntegrityError(`Dataset integrity check failed: ${issues.join("; ")}`);
  }

  return result;
}

/**
 * Validates predictions against a dataset
 */
export function validatePredictions(
  predictions: Prediction[],
  expectedIds: string[]
): { valid: boolean; missing: string[]; extra: string[] } {
  const predictionIds = new Set(predictions.map((p) => p.id));
  const expectedIdSet = new Set(expectedIds);

  const missing = expectedIds.filter((id) => !predictionIds.has(id));
  const extra = predictions.map((p) => p.id).filter((id) => !expectedIdSet.has(id));

  return {
    valid: missing.length === 0 && extra.length === 0,
    missing,
    extra,
  };
}

/**
 * Checks if a value is a valid numeric value (not NaN, Infinity, etc.)
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Checks if a value is a valid string label
 */
export function isValidLabel(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
