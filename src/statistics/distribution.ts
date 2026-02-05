/**
 * Distribution analysis utilities for percentage-based assertions.
 * These functions operate on actual values only (no ground truth required).
 */

/**
 * Filters an array to only include numeric values.
 * Removes null, undefined, NaN, and non-numeric types.
 *
 * @param values - Array of values to filter
 * @returns Array containing only valid numeric values
 *
 * @example
 * filterNumericValues([1, 2, null, "3", 4, undefined, NaN])
 * // Returns: [1, 2, 4]
 */
export function filterNumericValues(values: unknown[]): number[] {
  return values.filter(
    (v): v is number =>
      typeof v === "number" && !Number.isNaN(v) && v !== null && v !== undefined
  );
}

/**
 * Calculates the percentage of values that are below or equal to a threshold.
 *
 * @param values - Array of numeric values
 * @param threshold - Threshold value for comparison
 * @returns Percentage (0-1) of values <= threshold. Returns 0 for empty arrays.
 *
 * @example
 * calculatePercentageBelow([1, 2, 3, 4, 5], 3)
 * // Returns: 0.6 (60% of values are <= 3)
 */
export function calculatePercentageBelow(
  values: number[],
  threshold: number
): number {
  if (values.length === 0) {
    return 0;
  }

  const countBelow = values.filter((v) => v <= threshold).length;
  return countBelow / values.length;
}

/**
 * Calculates the percentage of values that are above a threshold.
 *
 * @param values - Array of numeric values
 * @param threshold - Threshold value for comparison
 * @returns Percentage (0-1) of values > threshold. Returns 0 for empty arrays.
 *
 * @example
 * calculatePercentageAbove([1, 2, 3, 4, 5], 3)
 * // Returns: 0.4 (40% of values are > 3)
 */
export function calculatePercentageAbove(
  values: number[],
  threshold: number
): number {
  if (values.length === 0) {
    return 0;
  }

  const countAbove = values.filter((v) => v > threshold).length;
  return countAbove / values.length;
}
