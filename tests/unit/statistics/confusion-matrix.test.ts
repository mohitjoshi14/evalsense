import { describe, it, expect } from "vitest";
import {
  buildConfusionMatrix,
  getTruePositives,
  getFalsePositives,
  getFalseNegatives,
  getSupport,
  formatConfusionMatrix,
} from "../../../src/statistics/confusion-matrix.js";

describe("buildConfusionMatrix", () => {
  it("builds correct matrix for binary classification", () => {
    const actual = ["positive", "negative", "positive", "positive", "negative"];
    const expected = ["positive", "positive", "positive", "negative", "negative"];

    const cm = buildConfusionMatrix(actual, expected);

    expect(cm.labels).toEqual(["negative", "positive"]);
    expect(cm.total).toBe(5);
    // Row = expected (truth), Col = actual (prediction)
    // negative truth: [1 TN, 1 FP] - indices 4, 3
    // positive truth: [1 FN, 2 TP] - indices 1, 0+2
    expect(cm.matrix).toEqual([
      [1, 1], // truth negative: 1 predicted negative, 1 predicted positive
      [1, 2], // truth positive: 1 predicted negative, 2 predicted positive
    ]);
  });

  it("handles multiclass classification", () => {
    const actual = ["cat", "dog", "bird", "cat", "dog", "cat"];
    const expected = ["cat", "dog", "cat", "cat", "bird", "dog"];

    const cm = buildConfusionMatrix(actual, expected);

    expect(cm.labels).toEqual(["bird", "cat", "dog"]);
    expect(cm.total).toBe(6);
  });

  it("handles empty arrays", () => {
    const cm = buildConfusionMatrix([], []);
    expect(cm.labels).toEqual([]);
    expect(cm.matrix).toEqual([]);
    expect(cm.total).toBe(0);
  });

  it("ignores undefined and null values", () => {
    const actual = ["a", null, "b", undefined, "a"];
    const expected = ["a", "a", "b", "b", "a"];

    const cm = buildConfusionMatrix(actual, expected);
    expect(cm.total).toBe(3); // Only 3 valid pairs
  });
});

describe("confusion matrix helpers", () => {
  const actual = ["positive", "negative", "positive", "positive", "negative"];
  const expected = ["positive", "positive", "positive", "negative", "negative"];
  const cm = buildConfusionMatrix(actual, expected);

  it("getTruePositives returns correct count", () => {
    expect(getTruePositives(cm, "positive")).toBe(2);
    expect(getTruePositives(cm, "negative")).toBe(1);
  });

  it("getFalsePositives returns correct count", () => {
    // positive predicted but was negative = 1 (index 3)
    expect(getFalsePositives(cm, "positive")).toBe(1);
    // negative predicted but was positive = 1 (index 1)
    expect(getFalsePositives(cm, "negative")).toBe(1);
  });

  it("getFalseNegatives returns correct count", () => {
    // was positive but predicted negative = 1 (index 1)
    expect(getFalseNegatives(cm, "positive")).toBe(1);
    // was negative but predicted positive = 1 (index 3)
    expect(getFalseNegatives(cm, "negative")).toBe(1);
  });

  it("getSupport returns correct count", () => {
    expect(getSupport(cm, "positive")).toBe(3); // 3 positive in ground truth (indices 0,1,2)
    expect(getSupport(cm, "negative")).toBe(2); // 2 negative in ground truth (indices 3,4)
  });

  it("returns 0 for unknown labels", () => {
    expect(getTruePositives(cm, "unknown")).toBe(0);
    expect(getFalsePositives(cm, "unknown")).toBe(0);
  });
});

describe("formatConfusionMatrix", () => {
  it("formats matrix as readable string", () => {
    const cm = buildConfusionMatrix(["a", "b", "a", "a"], ["a", "a", "a", "b"]);

    const formatted = formatConfusionMatrix(cm);
    expect(formatted).toContain("a");
    expect(formatted).toContain("b");
    expect(formatted.split("\n").length).toBeGreaterThan(1);
  });
});
