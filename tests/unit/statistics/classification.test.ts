import { describe, it, expect } from "vitest";
import {
  computeClassificationMetrics,
  computeAccuracy,
  computePrecision,
  computeRecall,
  computeF1,
} from "../../../src/statistics/classification.js";

describe("computeAccuracy", () => {
  it("computes correct accuracy", () => {
    const actual = ["a", "b", "a", "a", "b"];
    const expected = ["a", "a", "a", "b", "b"];

    const accuracy = computeAccuracy(actual, expected);
    expect(accuracy).toBe(0.6); // 3 out of 5 correct
  });

  it("returns 0 for empty arrays", () => {
    expect(computeAccuracy([], [])).toBe(0);
  });

  it("returns 1 for perfect predictions", () => {
    const values = ["a", "b", "c"];
    expect(computeAccuracy(values, values)).toBe(1);
  });

  it("handles undefined values", () => {
    const actual = ["a", undefined, "b"];
    const expected = ["a", "a", "b"];
    // Only "a" and "b" are valid pairs
    expect(computeAccuracy(actual, expected)).toBe(1); // 2/2
  });
});

describe("computePrecision", () => {
  it("computes correct precision for a class", () => {
    // actual: [pos, neg, pos, pos]
    // expected: [pos, pos, pos, neg]
    // For "positive": TP=2 (predicted pos, was pos), FP=1 (predicted pos, was neg)
    // Precision = 2/3
    const actual = ["positive", "negative", "positive", "positive"];
    const expected = ["positive", "positive", "positive", "negative"];

    const precision = computePrecision(actual, expected, "positive");
    expect(precision).toBeCloseTo(2 / 3, 5);
  });

  it("returns 0 when no predictions for class", () => {
    const actual = ["a", "a", "a"];
    const expected = ["a", "b", "b"];

    expect(computePrecision(actual, expected, "b")).toBe(0);
  });
});

describe("computeRecall", () => {
  it("computes correct recall for a class", () => {
    // actual: [pos, neg, pos, pos]
    // expected: [pos, pos, pos, neg]
    // For "positive": TP=2, FN=1 (was pos, predicted neg)
    // Recall = 2/3
    const actual = ["positive", "negative", "positive", "positive"];
    const expected = ["positive", "positive", "positive", "negative"];

    const recall = computeRecall(actual, expected, "positive");
    expect(recall).toBeCloseTo(2 / 3, 5);
  });
});

describe("computeF1", () => {
  it("computes correct F1 score", () => {
    const actual = ["positive", "negative", "positive", "positive"];
    const expected = ["positive", "positive", "positive", "negative"];

    const f1 = computeF1(actual, expected, "positive");
    // Precision = 2/3, Recall = 2/3
    // F1 = 2 * (2/3 * 2/3) / (2/3 + 2/3) = 2/3
    expect(f1).toBeCloseTo(2 / 3, 5);
  });

  it("returns 0 when precision and recall are both 0", () => {
    const actual = ["a", "a", "a"];
    const expected = ["b", "b", "b"];

    expect(computeF1(actual, expected, "a")).toBe(0);
  });
});

describe("computeClassificationMetrics", () => {
  it("returns comprehensive metrics object", () => {
    const actual = ["cat", "dog", "cat", "cat", "dog"];
    const expected = ["cat", "cat", "cat", "dog", "dog"];

    const metrics = computeClassificationMetrics(actual, expected);

    expect(metrics.accuracy).toBe(0.6); // 3/5 correct
    expect(metrics.perClass).toHaveProperty("cat");
    expect(metrics.perClass).toHaveProperty("dog");
    expect(metrics.macroAvg).toHaveProperty("precision");
    expect(metrics.macroAvg).toHaveProperty("recall");
    expect(metrics.macroAvg).toHaveProperty("f1");
    expect(metrics.weightedAvg).toHaveProperty("precision");
    expect(metrics.confusionMatrix).toBeDefined();
    expect(metrics.confusionMatrix.labels).toEqual(["cat", "dog"]);
  });

  it("computes macro average correctly", () => {
    const actual = ["a", "b", "a", "b"];
    const expected = ["a", "a", "b", "b"];

    const metrics = computeClassificationMetrics(actual, expected);

    // Class a: precision=1/2, recall=1/2, f1=1/2
    // Class b: precision=1/2, recall=1/2, f1=1/2
    // Macro avg = (1/2 + 1/2) / 2 = 1/2
    expect(metrics.macroAvg.precision).toBeCloseTo(0.5, 5);
    expect(metrics.macroAvg.recall).toBeCloseTo(0.5, 5);
    expect(metrics.macroAvg.f1).toBeCloseTo(0.5, 5);
  });

  it("includes support in per-class metrics", () => {
    const actual = ["a", "a", "a", "b"];
    const expected = ["a", "a", "b", "b"];

    const metrics = computeClassificationMetrics(actual, expected);

    expect(metrics.perClass["a"]?.support).toBe(2); // 2 "a" in expected
    expect(metrics.perClass["b"]?.support).toBe(2); // 2 "b" in expected
  });
});
