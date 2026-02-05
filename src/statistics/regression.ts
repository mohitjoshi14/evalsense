/**
 * Regression metrics computation
 */

import type { RegressionMetrics } from "../core/types.js";

/**
 * Computes all regression metrics from actual and expected values
 */
export function computeRegressionMetrics(
  actual: number[],
  expected: number[]
): RegressionMetrics {
  if (actual.length !== expected.length) {
    throw new Error(
      `Array length mismatch: actual has ${actual.length} elements, expected has ${expected.length}`
    );
  }

  const n = actual.length;
  if (n === 0) {
    return { mae: 0, mse: 0, rmse: 0, r2: 0 };
  }

  const mae = computeMAE(actual, expected);
  const mse = computeMSE(actual, expected);
  const rmse = Math.sqrt(mse);
  const r2 = computeR2(actual, expected);

  return { mae, mse, rmse, r2 };
}

/**
 * Computes Mean Absolute Error
 */
export function computeMAE(actual: number[], expected: number[]): number {
  if (actual.length !== expected.length || actual.length === 0) {
    return 0;
  }

  let sum = 0;
  for (let i = 0; i < actual.length; i++) {
    sum += Math.abs((actual[i] ?? 0) - (expected[i] ?? 0));
  }

  return sum / actual.length;
}

/**
 * Computes Mean Squared Error
 */
export function computeMSE(actual: number[], expected: number[]): number {
  if (actual.length !== expected.length || actual.length === 0) {
    return 0;
  }

  let sum = 0;
  for (let i = 0; i < actual.length; i++) {
    const diff = (actual[i] ?? 0) - (expected[i] ?? 0);
    sum += diff * diff;
  }

  return sum / actual.length;
}

/**
 * Computes Root Mean Squared Error
 */
export function computeRMSE(actual: number[], expected: number[]): number {
  return Math.sqrt(computeMSE(actual, expected));
}

/**
 * Computes R-squared (coefficient of determination)
 */
export function computeR2(actual: number[], expected: number[]): number {
  if (actual.length !== expected.length || actual.length === 0) {
    return 0;
  }

  // Calculate mean of expected values
  let meanExpected = 0;
  for (const val of expected) {
    meanExpected += val ?? 0;
  }
  meanExpected /= expected.length;

  // Calculate total sum of squares and residual sum of squares
  let ssTotal = 0;
  let ssResidual = 0;

  for (let i = 0; i < actual.length; i++) {
    const exp = expected[i] ?? 0;
    const act = actual[i] ?? 0;
    ssTotal += (exp - meanExpected) ** 2;
    ssResidual += (exp - act) ** 2;
  }

  // R² = 1 - (SS_res / SS_tot)
  if (ssTotal === 0) {
    return ssResidual === 0 ? 1 : 0;
  }

  return 1 - ssResidual / ssTotal;
}
