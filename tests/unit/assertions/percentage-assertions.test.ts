import { describe, it, expect, beforeEach } from "vitest";
import { FieldSelector } from "../../../src/assertions/field-selector.js";
import type { AlignedRecord } from "../../../src/core/types.js";
import { resetContext, startTestExecution, endTestExecution } from "../../../src/core/context.js";

describe("FieldSelector - Percentage Assertions", () => {
  beforeEach(() => {
    resetContext();
    startTestExecution();
  });

  describe("percentageBelow", () => {
    it("should pass when percentage is above threshold", () => {
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { score: 0.1 }, expected: {} },
        { id: "2", actual: { score: 0.2 }, expected: {} },
        { id: "3", actual: { score: 0.3 }, expected: {} },
        { id: "4", actual: { score: 0.8 }, expected: {} },
        { id: "5", actual: { score: 0.9 }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "score");

      // 60% of values (0.1, 0.2, 0.3) are <= 0.5
      expect(() => selector.percentageBelow(0.5).toBeAtLeast(0.5)).not.toThrow();
    });

    it("should fail when percentage is below threshold", () => {
      startTestExecution();
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { score: 0.8 }, expected: {} },
        { id: "2", actual: { score: 0.9 }, expected: {} },
        { id: "3", actual: { score: 0.3 }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "score");

      // Only 33% (0.3) are <= 0.5, but we expect 80% - should record failed assertion
      selector.percentageBelow(0.5).toBeAtLeast(0.8);

      const { assertions } = endTestExecution();
      expect(assertions[0].passed).toBe(false);
    });

    it("should include values equal to threshold", () => {
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { score: 0.3 }, expected: {} },
        { id: "2", actual: { score: 0.5 }, expected: {} },
        { id: "3", actual: { score: 0.5 }, expected: {} },
        { id: "4", actual: { score: 0.7 }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "score");

      // 75% (0.3, 0.5, 0.5) are <= 0.5
      expect(() => selector.percentageBelow(0.5).toBeAtLeast(0.7)).not.toThrow();
    });

    it("should handle 100% of values below threshold", () => {
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { score: 0.1 }, expected: {} },
        { id: "2", actual: { score: 0.2 }, expected: {} },
        { id: "3", actual: { score: 0.3 }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "score");

      expect(() => selector.percentageBelow(0.5).toBeAtLeast(1.0)).not.toThrow();
    });

    it("should handle 0% of values below threshold", () => {
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { score: 0.8 }, expected: {} },
        { id: "2", actual: { score: 0.9 }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "score");

      expect(() => selector.percentageBelow(0.5).toBeAtLeast(0.0)).not.toThrow();
    });

    it("should throw clear error when no numeric values", () => {
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { label: "text" }, expected: {} },
        { id: "2", actual: { label: "more" }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "label");

      expect(() => selector.percentageBelow(0.5).toBeAtLeast(0.8)).toThrow(
        "Field 'label' contains no numeric values (found 0 numeric out of 2 total values)"
      );
    });

    it("should filter out null and undefined values", () => {
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { score: 0.1 }, expected: {} },
        { id: "2", actual: { score: null }, expected: {} },
        { id: "3", actual: { score: 0.3 }, expected: {} },
        { id: "4", actual: { score: undefined }, expected: {} },
        { id: "5", actual: { score: 0.9 }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "score");

      // Only 3 numeric values: 0.1, 0.3, 0.9
      // 2 out of 3 (66%) are <= 0.5
      expect(() => selector.percentageBelow(0.5).toBeAtLeast(0.6)).not.toThrow();
    });

    it("should support method chaining", () => {
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { score: 0.1 }, expected: {} },
        { id: "2", actual: { score: 0.2 }, expected: {} },
        { id: "3", actual: { score: 0.8 }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "score");

      // Chain multiple assertions
      expect(() => {
        selector
          .percentageBelow(0.5)
          .toBeAtLeast(0.5) // 66% are <= 0.5
          .percentageAbove(0.5)
          .toBeAtLeast(0.3); // 33% are > 0.5
      }).not.toThrow();
    });

    it("should handle negative numbers", () => {
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { temp: -5 }, expected: {} },
        { id: "2", actual: { temp: -3 }, expected: {} },
        { id: "3", actual: { temp: 0 }, expected: {} },
        { id: "4", actual: { temp: 5 }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "temp");

      // 75% (-5, -3, 0) are <= 0
      expect(() => selector.percentageBelow(0).toBeAtLeast(0.7)).not.toThrow();
    });

    it("should handle decimal thresholds", () => {
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { confidence: 0.123 }, expected: {} },
        { id: "2", actual: { confidence: 0.456 }, expected: {} },
        { id: "3", actual: { confidence: 0.789 }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "confidence");

      // 66% are <= 0.5
      expect(() => selector.percentageBelow(0.5).toBeAtLeast(0.6)).not.toThrow();
    });
  });

  describe("percentageAbove", () => {
    it("should pass when percentage is above threshold", () => {
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { score: 0.8 }, expected: {} },
        { id: "2", actual: { score: 0.9 }, expected: {} },
        { id: "3", actual: { score: 0.95 }, expected: {} },
        { id: "4", actual: { score: 0.1 }, expected: {} },
        { id: "5", actual: { score: 0.2 }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "score");

      // 60% of values (0.8, 0.9, 0.95) are > 0.7
      expect(() => selector.percentageAbove(0.7).toBeAtLeast(0.5)).not.toThrow();
    });

    it("should fail when percentage is below threshold", () => {
      startTestExecution();
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { score: 0.1 }, expected: {} },
        { id: "2", actual: { score: 0.2 }, expected: {} },
        { id: "3", actual: { score: 0.8 }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "score");

      // Only 33% (0.8) are > 0.5, but we expect 80% - should record failed assertion
      selector.percentageAbove(0.5).toBeAtLeast(0.8);

      const { assertions } = endTestExecution();
      expect(assertions[0].passed).toBe(false);
    });

    it("should not include values equal to threshold", () => {
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { score: 0.3 }, expected: {} },
        { id: "2", actual: { score: 0.5 }, expected: {} },
        { id: "3", actual: { score: 0.5 }, expected: {} },
        { id: "4", actual: { score: 0.7 }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "score");

      // Only 25% (0.7) are > 0.5 (equal values don't count)
      expect(() => selector.percentageAbove(0.5).toBeAtLeast(0.2)).not.toThrow();
    });

    it("should handle 100% of values above threshold", () => {
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { score: 0.8 }, expected: {} },
        { id: "2", actual: { score: 0.9 }, expected: {} },
        { id: "3", actual: { score: 0.95 }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "score");

      expect(() => selector.percentageAbove(0.5).toBeAtLeast(1.0)).not.toThrow();
    });

    it("should handle 0% of values above threshold", () => {
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { score: 0.1 }, expected: {} },
        { id: "2", actual: { score: 0.2 }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "score");

      expect(() => selector.percentageAbove(0.5).toBeAtLeast(0.0)).not.toThrow();
    });

    it("should throw clear error when no numeric values", () => {
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { label: "text" }, expected: {} },
        { id: "2", actual: { label: "more" }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "label");

      expect(() => selector.percentageAbove(0.5).toBeAtLeast(0.8)).toThrow(
        "Field 'label' contains no numeric values (found 0 numeric out of 2 total values)"
      );
    });

    it("should filter out null and undefined values", () => {
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { score: 0.8 }, expected: {} },
        { id: "2", actual: { score: null }, expected: {} },
        { id: "3", actual: { score: 0.9 }, expected: {} },
        { id: "4", actual: { score: undefined }, expected: {} },
        { id: "5", actual: { score: 0.1 }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "score");

      // Only 3 numeric values: 0.8, 0.9, 0.1
      // 2 out of 3 (66%) are > 0.5
      expect(() => selector.percentageAbove(0.5).toBeAtLeast(0.6)).not.toThrow();
    });

    it("should support method chaining", () => {
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { score: 0.1 }, expected: {} },
        { id: "2", actual: { score: 0.2 }, expected: {} },
        { id: "3", actual: { score: 0.8 }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "score");

      // Chain multiple assertions
      expect(() => {
        selector
          .percentageAbove(0.5)
          .toBeAtLeast(0.3) // 33% are > 0.5
          .percentageBelow(0.5)
          .toBeAtLeast(0.6); // 66% are <= 0.5
      }).not.toThrow();
    });

    it("should handle negative numbers", () => {
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { temp: -5 }, expected: {} },
        { id: "2", actual: { temp: -3 }, expected: {} },
        { id: "3", actual: { temp: 0 }, expected: {} },
        { id: "4", actual: { temp: 5 }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "temp");

      // 25% (5) are > 0
      expect(() => selector.percentageAbove(0).toBeAtLeast(0.2)).not.toThrow();
    });

    it("should handle decimal thresholds", () => {
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { confidence: 0.123 }, expected: {} },
        { id: "2", actual: { confidence: 0.789 }, expected: {} },
        { id: "3", actual: { confidence: 0.999 }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "confidence");

      // 66% are > 0.5
      expect(() => selector.percentageAbove(0.5).toBeAtLeast(0.6)).not.toThrow();
    });
  });

  describe("Combined percentage assertions", () => {
    it("should work with both above and below assertions", () => {
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { score: 0.1 }, expected: {} },
        { id: "2", actual: { score: 0.2 }, expected: {} },
        { id: "3", actual: { score: 0.3 }, expected: {} },
        { id: "4", actual: { score: 0.7 }, expected: {} },
        { id: "5", actual: { score: 0.8 }, expected: {} },
        { id: "6", actual: { score: 0.9 }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "score");

      expect(() => {
        selector
          .percentageBelow(0.5)
          .toBeAtLeast(0.4) // 50% are <= 0.5
          .percentageAbove(0.5)
          .toBeAtLeast(0.4); // 50% are > 0.5
      }).not.toThrow();
    });

    it("should handle mixed numeric and non-numeric values", () => {
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { value: 0.1 }, expected: {} },
        { id: "2", actual: { value: "text" }, expected: {} },
        { id: "3", actual: { value: 0.8 }, expected: {} },
        { id: "4", actual: { value: null }, expected: {} },
        { id: "5", actual: { value: 0.9 }, expected: {} },
      ];

      const selector = new FieldSelector(aligned, "value");

      // Only numeric: 0.1, 0.8, 0.9
      // 66% are > 0.5
      expect(() => selector.percentageAbove(0.5).toBeAtLeast(0.6)).not.toThrow();
    });
  });
});
