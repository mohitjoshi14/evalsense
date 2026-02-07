import { describe, it, expect, beforeEach } from "vitest";
import { expectStats } from "../../../src/assertions/expect-stats.js";
import { resetContext, startTestExecution, endTestExecution } from "../../../src/core/context.js";
import type { AlignedRecord } from "../../../src/core/types.js";

beforeEach(() => {
  resetContext();
});

describe("expectStats", () => {
  it("accepts aligned records array", () => {
    const aligned: AlignedRecord[] = [
      { id: "1", actual: { label: "a" }, expected: { label: "a" } },
    ];

    const stats = expectStats(aligned);
    expect(stats.count()).toBe(1);
  });

  it("accepts predictions array", () => {
    const predictions = [
      { id: "1", label: "a" },
      { id: "2", label: "b" },
    ];

    const stats = expectStats(predictions);
    expect(stats.count()).toBe(2);
  });

  it("accepts ModelRunResult", () => {
    const result = {
      predictions: [{ id: "1", label: "a" }],
      aligned: [{ id: "1", actual: { label: "a" }, expected: { label: "a" } }],
      duration: 100,
    };

    const stats = expectStats(result);
    expect(stats.count()).toBe(1);
  });

  it("returns FieldSelector from field()", () => {
    const aligned: AlignedRecord[] = [
      { id: "1", actual: { label: "a" }, expected: { label: "a" } },
    ];

    const selector = expectStats(aligned).field("label");
    expect(selector).toBeDefined();
    expect(typeof selector.accuracy).toBe("object");
  });
});

describe("FieldSelector assertions", () => {
  const createAligned = (actual: string[], expected: string[]): AlignedRecord[] =>
    actual.map((a, i) => ({
      id: String(i),
      actual: { label: a },
      expected: { label: expected[i] },
    }));

  it("accuracy passes when accuracy meets threshold", () => {
    startTestExecution();
    const aligned = createAligned(["a", "a", "a", "b"], ["a", "a", "a", "a"]);

    // 3/4 = 75% accuracy
    expect(() => expectStats(aligned).field("label").accuracy.toBeAtLeast(0.7)).not.toThrow();

    endTestExecution();
  });

  it("accuracy records failed assertion when accuracy below threshold", () => {
    startTestExecution();
    const aligned = createAligned(["a", "b", "b", "b"], ["a", "a", "a", "a"]);

    // 1/4 = 25% accuracy - assertion should not throw, but should record failure
    expectStats(aligned).field("label").accuracy.toBeAtLeast(0.5);

    const { assertions } = endTestExecution();
    expect(assertions).toHaveLength(1);
    expect(assertions[0].passed).toBe(false);
    expect(assertions[0].message).toContain("not at least");
  });

  it("recall with class parameter", () => {
    startTestExecution();
    // "positive" in expected: 3 times
    // "positive" correctly predicted: 2 times
    // Recall for "positive" = 2/3 ≈ 66.7%
    const aligned = createAligned(
      ["positive", "negative", "positive", "positive"],
      ["positive", "positive", "positive", "negative"]
    );

    expect(() =>
      expectStats(aligned).field("label").recall("positive").toBeAtLeast(0.6)
    ).not.toThrow();

    const { assertions: assertions1 } = endTestExecution();
    expect(assertions1[0].passed).toBe(true);

    // Test failed assertion
    startTestExecution();
    expectStats(aligned).field("label").recall("positive").toBeAtLeast(0.8);
    const { assertions: assertions2 } = endTestExecution();
    expect(assertions2[0].passed).toBe(false);
  });

  it("precision with class parameter", () => {
    startTestExecution();
    const aligned = createAligned(
      ["positive", "positive", "positive", "negative"],
      ["positive", "negative", "positive", "negative"]
    );

    // Predicted "positive" 3 times, 2 were correct
    // Precision = 2/3 ≈ 66.7%
    expect(() =>
      expectStats(aligned).field("label").precision("positive").toBeAtLeast(0.6)
    ).not.toThrow();

    endTestExecution();
  });

  it("f1 for overall F1", () => {
    startTestExecution();
    const aligned = createAligned(["a", "b", "a", "b"], ["a", "a", "b", "b"]);

    // 50% accuracy, each class has P=R=0.5, F1=0.5
    expect(() => expectStats(aligned).field("label").f1.toBeAtLeast(0.4)).not.toThrow();

    endTestExecution();
  });

  it("displayConfusionMatrix records metrics", () => {
    startTestExecution();
    const aligned = createAligned(["a", "b"], ["a", "b"]);

    expectStats(aligned).field("label").displayConfusionMatrix();

    const { fieldMetrics } = endTestExecution();
    expect(fieldMetrics).toHaveLength(1);
    expect(fieldMetrics[0]?.field).toBe("label");
    expect(fieldMetrics[0]?.metrics.confusionMatrix).toBeDefined();
  });

  it("supports chaining multiple assertions", () => {
    startTestExecution();
    const aligned = createAligned(["a", "a", "b", "b"], ["a", "a", "b", "b"]);

    expect(() =>
      expectStats(aligned)
        .field("label")
        .accuracy.toBeAtLeast(0.9)
        .f1.toBeAtLeast(0.9)
        .displayConfusionMatrix()
    ).not.toThrow();

    endTestExecution();
  });
});

describe("BinarizeSelector", () => {
  it("binarizes continuous scores", () => {
    startTestExecution();
    const aligned: AlignedRecord[] = [
      { id: "1", actual: { score: 0.8 }, expected: { score: true } },
      { id: "2", actual: { score: 0.3 }, expected: { score: false } },
      { id: "3", actual: { score: 0.6 }, expected: { score: true } },
      { id: "4", actual: { score: 0.4 }, expected: { score: false } },
    ];

    // Binarize at 0.5: [true, false, true, false] vs [true, false, true, false]
    // 100% accuracy
    expect(() =>
      expectStats(aligned).field("score").binarize(0.5).accuracy.toBeAtLeast(0.9)
    ).not.toThrow();

    endTestExecution();
  });

  it("recall with boolean class", () => {
    startTestExecution();
    const aligned: AlignedRecord[] = [
      { id: "1", actual: { score: 0.8 }, expected: { score: true } },
      { id: "2", actual: { score: 0.3 }, expected: { score: true } },
      { id: "3", actual: { score: 0.6 }, expected: { score: false } },
    ];

    // Expected true: 2, Predicted true: 2 (0.8 and 0.6)
    // But 0.3 was expected true, predicted false → FN
    // Recall for true = 1/2 = 50%
    expect(() =>
      expectStats(aligned).field("score").binarize(0.5).recall(true).toBeAtLeast(0.4)
    ).not.toThrow();

    endTestExecution();
  });
});
