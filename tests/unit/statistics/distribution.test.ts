import { describe, it, expect } from "vitest";
import {
  filterNumericValues,
  calculatePercentageBelow,
  calculatePercentageAbove,
} from "../../../src/statistics/distribution.js";

describe("filterNumericValues", () => {
  it("should filter out null values", () => {
    const result = filterNumericValues([1, 2, null, 3]);
    expect(result).toEqual([1, 2, 3]);
  });

  it("should filter out undefined values", () => {
    const result = filterNumericValues([1, undefined, 2, 3]);
    expect(result).toEqual([1, 2, 3]);
  });

  it("should filter out NaN values", () => {
    const result = filterNumericValues([1, NaN, 2, 3]);
    expect(result).toEqual([1, 2, 3]);
  });

  it("should filter out non-numeric types", () => {
    const result = filterNumericValues([1, "2", 3, true, false, {}, []]);
    expect(result).toEqual([1, 3]);
  });

  it("should handle mixed types", () => {
    const result = filterNumericValues([
      1,
      2,
      null,
      "3",
      4,
      undefined,
      NaN,
      5,
      true,
    ]);
    expect(result).toEqual([1, 2, 4, 5]);
  });

  it("should handle empty array", () => {
    const result = filterNumericValues([]);
    expect(result).toEqual([]);
  });

  it("should handle all non-numeric array", () => {
    const result = filterNumericValues([null, undefined, "text", true, {}]);
    expect(result).toEqual([]);
  });

  it("should preserve negative numbers", () => {
    const result = filterNumericValues([-1, -2, null, 3]);
    expect(result).toEqual([-1, -2, 3]);
  });

  it("should preserve zero", () => {
    const result = filterNumericValues([0, null, 1]);
    expect(result).toEqual([0, 1]);
  });

  it("should preserve decimals", () => {
    const result = filterNumericValues([0.5, null, 1.5, 2.3]);
    expect(result).toEqual([0.5, 1.5, 2.3]);
  });
});

describe("calculatePercentageBelow", () => {
  it("should calculate percentage below threshold", () => {
    const result = calculatePercentageBelow([1, 2, 3, 4, 5], 3);
    expect(result).toBeCloseTo(0.6); // 3 out of 5 values (60%)
  });

  it("should include values equal to threshold", () => {
    const result = calculatePercentageBelow([1, 2, 3, 4, 5], 3);
    expect(result).toBeCloseTo(0.6); // 1, 2, 3 are <= 3
  });

  it("should return 0 for empty array", () => {
    const result = calculatePercentageBelow([], 5);
    expect(result).toBe(0);
  });

  it("should return 0 when all values are above threshold", () => {
    const result = calculatePercentageBelow([10, 20, 30], 5);
    expect(result).toBe(0);
  });

  it("should return 1 when all values are below threshold", () => {
    const result = calculatePercentageBelow([1, 2, 3], 10);
    expect(result).toBe(1);
  });

  it("should handle threshold exactly at boundary", () => {
    const result = calculatePercentageBelow([1, 2, 3, 3, 3], 3);
    expect(result).toBe(1); // All values are <= 3
  });

  it("should handle negative numbers", () => {
    const result = calculatePercentageBelow([-5, -3, -1, 0, 1, 3], 0);
    expect(result).toBeCloseTo(0.6667, 3); // 4 out of 6 values
  });

  it("should handle decimal values and threshold", () => {
    const result = calculatePercentageBelow([0.1, 0.5, 0.7, 0.9], 0.6);
    expect(result).toBe(0.5); // 0.1 and 0.5 are <= 0.6
  });

  it("should handle single value below", () => {
    const result = calculatePercentageBelow([5], 10);
    expect(result).toBe(1);
  });

  it("should handle single value above", () => {
    const result = calculatePercentageBelow([15], 10);
    expect(result).toBe(0);
  });

  it("should calculate correctly for 50% split", () => {
    const result = calculatePercentageBelow([1, 2, 5, 10], 3);
    expect(result).toBe(0.5); // 1 and 2 are <= 3
  });
});

describe("calculatePercentageAbove", () => {
  it("should calculate percentage above threshold", () => {
    const result = calculatePercentageAbove([1, 2, 3, 4, 5], 3);
    expect(result).toBeCloseTo(0.4); // 2 out of 5 values (40%)
  });

  it("should not include values equal to threshold", () => {
    const result = calculatePercentageAbove([1, 2, 3, 4, 5], 3);
    expect(result).toBeCloseTo(0.4); // Only 4, 5 are > 3
  });

  it("should return 0 for empty array", () => {
    const result = calculatePercentageAbove([], 5);
    expect(result).toBe(0);
  });

  it("should return 0 when all values are below or equal to threshold", () => {
    const result = calculatePercentageAbove([1, 2, 3], 10);
    expect(result).toBe(0);
  });

  it("should return 1 when all values are above threshold", () => {
    const result = calculatePercentageAbove([10, 20, 30], 5);
    expect(result).toBe(1);
  });

  it("should handle threshold exactly at boundary", () => {
    const result = calculatePercentageAbove([1, 2, 3, 3, 3], 3);
    expect(result).toBe(0); // No values are > 3
  });

  it("should handle negative numbers", () => {
    const result = calculatePercentageAbove([-5, -3, -1, 0, 1, 3], 0);
    expect(result).toBeCloseTo(0.3333, 3); // 2 out of 6 values (1 and 3)
  });

  it("should handle decimal values and threshold", () => {
    const result = calculatePercentageAbove([0.1, 0.5, 0.7, 0.9], 0.6);
    expect(result).toBe(0.5); // 0.7 and 0.9 are > 0.6
  });

  it("should handle single value above", () => {
    const result = calculatePercentageAbove([15], 10);
    expect(result).toBe(1);
  });

  it("should handle single value below", () => {
    const result = calculatePercentageAbove([5], 10);
    expect(result).toBe(0);
  });

  it("should calculate correctly for 50% split", () => {
    const result = calculatePercentageAbove([1, 2, 5, 10], 3);
    expect(result).toBe(0.5); // 5 and 10 are > 3
  });
});

describe("calculatePercentageBelow and calculatePercentageAbove", () => {
  it("should be complementary when no values equal threshold", () => {
    const values = [1, 2, 4, 5];
    const threshold = 3;
    const below = calculatePercentageBelow(values, threshold);
    const above = calculatePercentageAbove(values, threshold);
    expect(below + above).toBeCloseTo(1);
  });

  it("should account for values equal to threshold", () => {
    const values = [1, 2, 3, 4, 5];
    const threshold = 3;
    const below = calculatePercentageBelow(values, threshold); // includes 3
    const above = calculatePercentageAbove(values, threshold); // excludes 3
    // below: 1,2,3 = 0.6, above: 4,5 = 0.4
    expect(below).toBeCloseTo(0.6);
    expect(above).toBeCloseTo(0.4);
    expect(below + above).toBe(1); // 3 is counted in below only
  });
});
