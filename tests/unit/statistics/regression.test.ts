import { describe, it, expect } from "vitest";
import {
  computeMAE,
  computeMSE,
  computeRMSE,
  computeR2,
  computeRegressionMetrics,
} from "../../../src/statistics/regression.js";

describe("computeMAE", () => {
  it("computes mean absolute error correctly", () => {
    const actual = [1, 2, 3, 4, 5];
    const expected = [1, 2, 3, 4, 5];
    expect(computeMAE(actual, expected)).toBe(0);
  });

  it("computes MAE for non-perfect predictions", () => {
    const actual = [1, 2, 3];
    const expected = [2, 3, 4];
    // Errors: |1-2|=1, |2-3|=1, |3-4|=1 → MAE = 3/3 = 1
    expect(computeMAE(actual, expected)).toBe(1);
  });

  it("handles negative differences", () => {
    const actual = [5, 4, 3];
    const expected = [2, 3, 4];
    // Errors: |5-2|=3, |4-3|=1, |3-4|=1 → MAE = 5/3 ≈ 1.667
    expect(computeMAE(actual, expected)).toBeCloseTo(5 / 3, 5);
  });

  it("returns 0 for empty arrays", () => {
    expect(computeMAE([], [])).toBe(0);
  });

  it("returns 0 for mismatched array lengths", () => {
    expect(computeMAE([1, 2], [1])).toBe(0);
  });
});

describe("computeMSE", () => {
  it("computes mean squared error correctly", () => {
    const actual = [1, 2, 3, 4, 5];
    const expected = [1, 2, 3, 4, 5];
    expect(computeMSE(actual, expected)).toBe(0);
  });

  it("computes MSE for non-perfect predictions", () => {
    const actual = [1, 2, 3];
    const expected = [2, 3, 4];
    // Errors: 1^2 + 1^2 + 1^2 = 3 → MSE = 3/3 = 1
    expect(computeMSE(actual, expected)).toBe(1);
  });

  it("squares the errors", () => {
    const actual = [0, 0];
    const expected = [3, 4];
    // Errors: 3^2 + 4^2 = 9 + 16 = 25 → MSE = 25/2 = 12.5
    expect(computeMSE(actual, expected)).toBe(12.5);
  });

  it("returns 0 for empty arrays", () => {
    expect(computeMSE([], [])).toBe(0);
  });

  it("returns 0 for mismatched array lengths", () => {
    expect(computeMSE([1, 2, 3], [1])).toBe(0);
  });
});

describe("computeRMSE", () => {
  it("computes root mean squared error correctly", () => {
    const actual = [1, 2, 3, 4, 5];
    const expected = [1, 2, 3, 4, 5];
    expect(computeRMSE(actual, expected)).toBe(0);
  });

  it("is the square root of MSE", () => {
    const actual = [0, 0];
    const expected = [3, 4];
    // MSE = 12.5, RMSE = sqrt(12.5) ≈ 3.536
    expect(computeRMSE(actual, expected)).toBeCloseTo(Math.sqrt(12.5), 5);
  });

  it("returns 0 for empty arrays", () => {
    expect(computeRMSE([], [])).toBe(0);
  });
});

describe("computeR2", () => {
  it("returns 1 for perfect predictions", () => {
    const actual = [1, 2, 3, 4, 5];
    const expected = [1, 2, 3, 4, 5];
    expect(computeR2(actual, expected)).toBe(1);
  });

  it("returns 0 when predictions equal the mean", () => {
    const expected = [1, 2, 3, 4, 5];
    const mean = 3;
    const actual = [mean, mean, mean, mean, mean];
    // When actual == mean for all, R² should be 0
    expect(computeR2(actual, expected)).toBe(0);
  });

  it("can return negative R² for very poor predictions", () => {
    // Predictions are worse than just predicting the mean
    const expected = [1, 2, 3];
    const actual = [10, 20, 30]; // way off
    const r2 = computeR2(actual, expected);
    expect(r2).toBeLessThan(0);
  });

  it("returns 1 when expected values are all the same (no variance)", () => {
    const actual = [5, 5, 5];
    const expected = [5, 5, 5];
    // SS_total = 0, SS_residual = 0 → R² = 1
    expect(computeR2(actual, expected)).toBe(1);
  });

  it("returns 0 when expected has no variance but actual differs", () => {
    const actual = [1, 2, 3];
    const expected = [5, 5, 5];
    // SS_total = 0, SS_residual > 0 → R² = 0
    expect(computeR2(actual, expected)).toBe(0);
  });

  it("returns 0 for empty arrays", () => {
    expect(computeR2([], [])).toBe(0);
  });

  it("returns 0 for mismatched array lengths", () => {
    expect(computeR2([1, 2, 3], [1, 2])).toBe(0);
  });

  it("computes R² correctly for typical data", () => {
    // y_actual closely tracks y_expected with some noise
    const expected = [1, 2, 3, 4, 5];
    const actual = [1.1, 1.9, 3.1, 3.9, 5.1];

    const r2 = computeR2(actual, expected);
    // Should be high but not perfect
    expect(r2).toBeGreaterThan(0.95);
    expect(r2).toBeLessThan(1);
  });
});

describe("computeRegressionMetrics", () => {
  it("returns all metrics at once", () => {
    const actual = [1, 2, 3, 4, 5];
    const expected = [1, 2, 3, 4, 5];

    const metrics = computeRegressionMetrics(actual, expected);

    expect(metrics).toEqual({
      mae: 0,
      mse: 0,
      rmse: 0,
      r2: 1,
    });
  });

  it("computes consistent metrics", () => {
    const actual = [1, 3, 5];
    const expected = [2, 3, 4];

    const metrics = computeRegressionMetrics(actual, expected);

    // Verify each metric is consistent with individual functions
    expect(metrics.mae).toBe(computeMAE(actual, expected));
    expect(metrics.mse).toBe(computeMSE(actual, expected));
    expect(metrics.rmse).toBe(computeRMSE(actual, expected));
    expect(metrics.r2).toBe(computeR2(actual, expected));
  });

  it("throws for mismatched array lengths", () => {
    expect(() => computeRegressionMetrics([1, 2], [1, 2, 3])).toThrow("Array length mismatch");
  });

  it("returns zeros for empty arrays", () => {
    const metrics = computeRegressionMetrics([], []);
    expect(metrics).toEqual({
      mae: 0,
      mse: 0,
      rmse: 0,
      r2: 0,
    });
  });

  it("handles single value arrays", () => {
    const metrics = computeRegressionMetrics([3], [5]);

    expect(metrics.mae).toBe(2);
    expect(metrics.mse).toBe(4);
    expect(metrics.rmse).toBe(2);
    // R² with single value and no variance in expected
    expect(metrics.r2).toBe(0);
  });
});
