import { describe, it, expect } from "vitest";
import { computeCalibration, computeBrierScore } from "../../../src/statistics/calibration.js";

describe("computeCalibration", () => {
  it("returns zero ECE and MCE for empty arrays", () => {
    const result = computeCalibration([], []);
    expect(result.expectedCalibrationError).toBe(0);
    expect(result.maxCalibrationError).toBe(0);
    expect(result.bins).toHaveLength(0);
  });

  it("throws when predictions and actuals have different lengths", () => {
    expect(() => computeCalibration([0.5], [1, 0])).toThrow("same length");
  });

  it("returns bins with correct count", () => {
    const predictions = [0.1, 0.2, 0.3, 0.8, 0.9];
    const actuals = [0, 0, 0, 1, 1];
    const result = computeCalibration(predictions, actuals, 10);
    expect(result.bins).toHaveLength(10);
  });

  it("returns low ECE for well-calibrated predictions", () => {
    // Predictions close to actual rates
    const predictions = [0.1, 0.1, 0.9, 0.9];
    const actuals = [0, 0, 1, 1];
    const result = computeCalibration(predictions, actuals, 10);
    expect(result.expectedCalibrationError).toBeLessThan(0.15);
  });

  it("returns high ECE for poorly calibrated predictions", () => {
    // Predictions all high but actuals all 0
    const predictions = [0.9, 0.9, 0.9, 0.9];
    const actuals = [0, 0, 0, 0];
    const result = computeCalibration(predictions, actuals, 10);
    expect(result.expectedCalibrationError).toBeGreaterThan(0.5);
  });

  it("MCE is at least as large as ECE", () => {
    const predictions = [0.1, 0.5, 0.9];
    const actuals = [0, 1, 1];
    const result = computeCalibration(predictions, actuals, 5);
    expect(result.maxCalibrationError).toBeGreaterThanOrEqual(result.expectedCalibrationError);
  });

  it("bins have correct start and end values", () => {
    const result = computeCalibration([0.5], [1], 5);
    expect(result.bins[0].binStart).toBe(0);
    expect(result.bins[0].binEnd).toBeCloseTo(0.2);
    expect(result.bins[4].binEnd).toBeCloseTo(1.0);
  });

  it("each prediction falls into exactly one bin", () => {
    const predictions = [0.0, 0.25, 0.5, 0.75, 1.0];
    const actuals = [0, 0, 1, 1, 1];
    const result = computeCalibration(predictions, actuals, 4);
    const totalCount = result.bins.reduce((sum, b) => sum + b.count, 0);
    expect(totalCount).toBe(5);
  });

  it("supports custom number of bins", () => {
    const result = computeCalibration([0.5], [1], 3);
    expect(result.bins).toHaveLength(3);
  });

  it("perfect predictions yield zero ECE", () => {
    // All in one bin with matching prediction/actual
    const predictions = [0.0, 0.0, 0.0, 0.0];
    const actuals = [0, 0, 0, 0];
    const result = computeCalibration(predictions, actuals, 10);
    expect(result.expectedCalibrationError).toBe(0);
  });
});

describe("computeBrierScore", () => {
  it("returns 0 for perfect predictions", () => {
    const predictions = [1, 0, 1, 0];
    const actuals = [1, 0, 1, 0];
    expect(computeBrierScore(predictions, actuals)).toBe(0);
  });

  it("returns 1 for worst-case predictions", () => {
    const predictions = [1, 1, 0, 0];
    const actuals = [0, 0, 1, 1];
    expect(computeBrierScore(predictions, actuals)).toBe(1);
  });

  it("returns 0 for empty arrays", () => {
    expect(computeBrierScore([], [])).toBe(0);
  });

  it("returns 0 when lengths mismatch", () => {
    expect(computeBrierScore([0.5], [1, 0])).toBe(0);
  });

  it("returns intermediate value for imperfect predictions", () => {
    const predictions = [0.7, 0.3, 0.8, 0.2];
    const actuals = [1, 0, 1, 0];
    const score = computeBrierScore(predictions, actuals);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(0.5);
  });

  it("lower score means better calibration", () => {
    const actuals = [1, 0, 1, 0];
    const good = computeBrierScore([0.9, 0.1, 0.9, 0.1], actuals);
    const bad = computeBrierScore([0.5, 0.5, 0.5, 0.5], actuals);
    expect(good).toBeLessThan(bad);
  });
});
