/**
 * Confusion matrix computation
 */

import type { ConfusionMatrix } from "../core/types.js";

/**
 * Builds a confusion matrix from actual and predicted values
 *
 * @param actual - Actual/predicted values from the model
 * @param expected - Expected/ground truth values
 * @returns ConfusionMatrix with matrix, labels, and total
 *
 * @example
 * ```ts
 * const matrix = buildConfusionMatrix(
 *   ["positive", "negative", "positive"],
 *   ["positive", "positive", "positive"]
 * );
 * // matrix.matrix[i][j] = count of expected[i] predicted as actual[j]
 * ```
 */
export function buildConfusionMatrix(actual: unknown[], expected: unknown[]): ConfusionMatrix {
  if (actual.length !== expected.length) {
    throw new Error(
      `Array length mismatch: actual has ${actual.length} elements, expected has ${expected.length}`
    );
  }

  // Collect all unique labels
  const labelSet = new Set<string>();
  for (const val of actual) {
    if (val !== undefined && val !== null) {
      labelSet.add(String(val));
    }
  }
  for (const val of expected) {
    if (val !== undefined && val !== null) {
      labelSet.add(String(val));
    }
  }

  // Sort labels for deterministic ordering
  const labels = Array.from(labelSet).sort();
  const labelIndex = new Map<string, number>();
  labels.forEach((label, idx) => labelIndex.set(label, idx));

  // Initialize confusion matrix with zeros
  const matrix: number[][] = labels.map(() => labels.map(() => 0));

  // Fill the matrix
  // Row = expected (ground truth), Column = actual (predicted)
  for (let i = 0; i < actual.length; i++) {
    const actualVal = actual[i];
    const expectedVal = expected[i];

    if (actualVal === undefined || actualVal === null) continue;
    if (expectedVal === undefined || expectedVal === null) continue;

    const actualIdx = labelIndex.get(String(actualVal));
    const expectedIdx = labelIndex.get(String(expectedVal));

    if (actualIdx !== undefined && expectedIdx !== undefined) {
      matrix[expectedIdx]![actualIdx]!++;
    }
  }

  const total = actual.filter(
    (v, i) => v !== undefined && v !== null && expected[i] !== undefined && expected[i] !== null
  ).length;

  return { matrix, labels, total };
}

/**
 * Gets the count from a confusion matrix for a specific cell
 */
export function getCount(cm: ConfusionMatrix, expectedLabel: string, actualLabel: string): number {
  const expectedIdx = cm.labels.indexOf(expectedLabel);
  const actualIdx = cm.labels.indexOf(actualLabel);

  if (expectedIdx === -1 || actualIdx === -1) {
    return 0;
  }

  return cm.matrix[expectedIdx]?.[actualIdx] ?? 0;
}

/**
 * Gets true positives for a class
 */
export function getTruePositives(cm: ConfusionMatrix, label: string): number {
  return getCount(cm, label, label);
}

/**
 * Gets false positives for a class (predicted as class but wasn't)
 */
export function getFalsePositives(cm: ConfusionMatrix, label: string): number {
  const labelIdx = cm.labels.indexOf(label);
  if (labelIdx === -1) return 0;

  let fp = 0;
  for (let i = 0; i < cm.labels.length; i++) {
    if (i !== labelIdx) {
      fp += cm.matrix[i]?.[labelIdx] ?? 0;
    }
  }
  return fp;
}

/**
 * Gets false negatives for a class (was class but predicted as something else)
 */
export function getFalseNegatives(cm: ConfusionMatrix, label: string): number {
  const labelIdx = cm.labels.indexOf(label);
  if (labelIdx === -1) return 0;

  let fn = 0;
  for (let j = 0; j < cm.labels.length; j++) {
    if (j !== labelIdx) {
      fn += cm.matrix[labelIdx]?.[j] ?? 0;
    }
  }
  return fn;
}

/**
 * Gets true negatives for a class
 */
export function getTrueNegatives(cm: ConfusionMatrix, label: string): number {
  const labelIdx = cm.labels.indexOf(label);
  if (labelIdx === -1) return 0;

  let tn = 0;
  for (let i = 0; i < cm.labels.length; i++) {
    for (let j = 0; j < cm.labels.length; j++) {
      if (i !== labelIdx && j !== labelIdx) {
        tn += cm.matrix[i]?.[j] ?? 0;
      }
    }
  }
  return tn;
}

/**
 * Gets support (total instances) for a class in ground truth
 */
export function getSupport(cm: ConfusionMatrix, label: string): number {
  const labelIdx = cm.labels.indexOf(label);
  if (labelIdx === -1) return 0;

  let support = 0;
  for (let j = 0; j < cm.labels.length; j++) {
    support += cm.matrix[labelIdx]?.[j] ?? 0;
  }
  return support;
}

/**
 * Formats a confusion matrix as a string table
 */
export function formatConfusionMatrix(cm: ConfusionMatrix): string {
  const maxLabelLen = Math.max(...cm.labels.map((l) => l.length), 8);
  const colWidth = Math.max(...cm.matrix.flat().map((n) => String(n).length), maxLabelLen);

  const header = " ".repeat(maxLabelLen + 2) + cm.labels.map((l) => l.padStart(colWidth)).join(" ");

  const rows = cm.labels.map((label, i) => {
    const rowData = cm.matrix[i]!.map((n) => String(n).padStart(colWidth)).join(" ");
    return label.padEnd(maxLabelLen) + "  " + rowData;
  });

  return [header, ...rows].join("\n");
}
