import { describe, it, expect, beforeEach } from "vitest";
import { BinarizeSelector } from "../../../src/assertions/binarize.js";
import { resetContext, startTestExecution, endTestExecution } from "../../../src/core/context.js";
import type { AlignedRecord } from "../../../src/core/types.js";

beforeEach(() => {
  resetContext();
});

describe("BinarizeSelector", () => {
  const aligned: AlignedRecord[] = [
    { id: "1", actual: { score: 0.9 }, expected: { score: true } },
    { id: "2", actual: { score: 0.3 }, expected: { score: false } },
    { id: "3", actual: { score: 0.7 }, expected: { score: true } },
    { id: "4", actual: { score: 0.1 }, expected: { score: false } },
  ];

  describe("constructor binarization", () => {
    it("binarizes numeric actual values at threshold", () => {
      const selector = new BinarizeSelector(aligned, "score", 0.5);
      const metrics = selector.getMetrics();
      // 0.9 >= 0.5 → true, 0.3 < 0.5 → false, 0.7 >= 0.5 → true, 0.1 < 0.5 → false
      // Expected: true, false, true, false
      expect(metrics.accuracy).toBe(1.0);
    });

    it("binarizes with different threshold", () => {
      const selector = new BinarizeSelector(aligned, "score", 0.8);
      const metrics = selector.getMetrics();
      // 0.9 >= 0.8 → true, 0.3 < → false, 0.7 < → false, 0.1 < → false
      // Expected: true, false, true, false
      // Actual:   true, false, false, false
      // 1 mismatch (id 3)
      expect(metrics.accuracy).toBe(0.75);
    });

    it("handles boolean expected values", () => {
      const selector = new BinarizeSelector(aligned, "score", 0.5);
      // No error means booleans were converted to strings correctly
      expect(selector.getMetrics()).toBeDefined();
    });

    it("handles numeric expected values", () => {
      const numericAligned: AlignedRecord[] = [
        { id: "1", actual: { score: 0.9 }, expected: { score: 0.8 } },
        { id: "2", actual: { score: 0.2 }, expected: { score: 0.1 } },
      ];
      const selector = new BinarizeSelector(numericAligned, "score", 0.5);
      const metrics = selector.getMetrics();
      // Actual: true, false. Expected: true, false
      expect(metrics.accuracy).toBe(1.0);
    });

    it("handles string expected values", () => {
      const stringAligned: AlignedRecord[] = [
        { id: "1", actual: { score: 0.9 }, expected: { score: "true" } },
        { id: "2", actual: { score: 0.2 }, expected: { score: "false" } },
      ];
      const selector = new BinarizeSelector(stringAligned, "score", 0.5);
      expect(selector.getMetrics().accuracy).toBe(1.0);
    });

    it("handles boolean actual values", () => {
      const boolAligned: AlignedRecord[] = [
        { id: "1", actual: { score: true }, expected: { score: true } },
        { id: "2", actual: { score: false }, expected: { score: false } },
      ];
      const selector = new BinarizeSelector(boolAligned, "score", 0.5);
      expect(selector.getMetrics().accuracy).toBe(1.0);
    });
  });

  describe("accuracy", () => {
    it("returns a MetricMatcher", () => {
      const selector = new BinarizeSelector(aligned, "score", 0.5);
      const matcher = selector.accuracy;
      expect(matcher).toBeDefined();
    });

    it("chains toBeAtLeast and records assertion", () => {
      startTestExecution();
      const selector = new BinarizeSelector(aligned, "score", 0.5);
      const result = selector.accuracy.toBeAtLeast(0.8);
      expect(result).toBe(selector); // returns parent for chaining
      expect(selector.getAssertions()).toHaveLength(1);
      expect(selector.getAssertions()[0].passed).toBe(true);
      endTestExecution();
    });
  });

  describe("f1", () => {
    it("returns a MetricMatcher", () => {
      const selector = new BinarizeSelector(aligned, "score", 0.5);
      expect(selector.f1).toBeDefined();
    });

    it("chains assertions", () => {
      startTestExecution();
      const selector = new BinarizeSelector(aligned, "score", 0.5);
      selector.f1.toBeAtLeast(0.5);
      expect(selector.getAssertions()).toHaveLength(1);
      endTestExecution();
    });
  });

  describe("precision", () => {
    it("returns macro average when no class specified", () => {
      startTestExecution();
      const selector = new BinarizeSelector(aligned, "score", 0.5);
      selector.precision().toBeAtLeast(0.5);
      expect(selector.getAssertions()).toHaveLength(1);
      expect(selector.getAssertions()[0].passed).toBe(true);
      endTestExecution();
    });

    it("returns per-class precision", () => {
      startTestExecution();
      const selector = new BinarizeSelector(aligned, "score", 0.5);
      selector.precision(true).toBeAtLeast(0.5);
      expect(selector.getAssertions()[0].passed).toBe(true);
      endTestExecution();
    });

    it("throws for non-existent class", () => {
      const singleClass: AlignedRecord[] = [
        { id: "1", actual: { score: 0.9 }, expected: { score: 0.9 } },
      ];
      const selector = new BinarizeSelector(singleClass, "score", 0.5);
      // Both actual and expected are "true", so "false" class doesn't exist
      expect(() => selector.precision(false)).toThrow("not found");
    });
  });

  describe("recall", () => {
    it("returns macro average when no class specified", () => {
      startTestExecution();
      const selector = new BinarizeSelector(aligned, "score", 0.5);
      selector.recall().toBeAtLeast(0.5);
      expect(selector.getAssertions()[0].passed).toBe(true);
      endTestExecution();
    });

    it("returns per-class recall", () => {
      startTestExecution();
      const selector = new BinarizeSelector(aligned, "score", 0.5);
      selector.recall(true).toBeAtLeast(0.5);
      expect(selector.getAssertions()[0].passed).toBe(true);
      endTestExecution();
    });

    it("throws for non-existent class", () => {
      const singleClass: AlignedRecord[] = [
        { id: "1", actual: { score: 0.9 }, expected: { score: 0.9 } },
      ];
      const selector = new BinarizeSelector(singleClass, "score", 0.5);
      expect(() => selector.recall(false)).toThrow("not found");
    });
  });

  describe("displayConfusionMatrix", () => {
    it("records assertion and returns self for chaining", () => {
      startTestExecution();
      const selector = new BinarizeSelector(aligned, "score", 0.5);
      const result = selector.displayConfusionMatrix();
      expect(result).toBe(selector);
      const assertions = selector.getAssertions();
      expect(assertions).toHaveLength(1);
      expect(assertions[0].type).toBe("confusionMatrix");
      expect(assertions[0].passed).toBe(true);
      expect(assertions[0].message).toContain("binarized");
      endTestExecution();
    });
  });

  describe("getAssertions", () => {
    it("returns empty array initially", () => {
      const selector = new BinarizeSelector(aligned, "score", 0.5);
      expect(selector.getAssertions()).toHaveLength(0);
    });
  });

  describe("chaining", () => {
    it("supports chaining multiple assertions", () => {
      startTestExecution();
      const selector = new BinarizeSelector(aligned, "score", 0.5);
      selector.accuracy.toBeAtLeast(0.8).f1.toBeAtLeast(0.5).displayConfusionMatrix();
      expect(selector.getAssertions()).toHaveLength(3);
      endTestExecution();
    });
  });
});
