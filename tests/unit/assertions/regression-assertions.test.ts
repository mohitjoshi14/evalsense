import { describe, it, expect, beforeEach } from "vitest";
import { expectStats } from "../../../src/assertions/expect-stats.js";
import { resetContext, startTestExecution, endTestExecution } from "../../../src/core/context.js";
import type { AlignedRecord } from "../../../src/core/types.js";

beforeEach(() => {
  resetContext();
});

describe("Regression Assertions", () => {
  const createAligned = (actual: number[], expected: number[]): AlignedRecord[] =>
    actual.map((a, i) => ({
      id: String(i),
      actual: { score: a },
      expected: { score: expected[i] },
    }));

  describe("toHaveMAEBelow", () => {
    it("passes when MAE is below threshold", () => {
      startTestExecution();
      // Perfect predictions: MAE = 0
      const aligned = createAligned([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);

      expect(() => expectStats(aligned).field("score").toHaveMAEBelow(0.1)).not.toThrow();

      const { assertions } = endTestExecution();
      expect(assertions[0]?.passed).toBe(true);
      expect(assertions[0]?.type).toBe("mae");
    });

    it("fails when MAE exceeds threshold", () => {
      startTestExecution();
      // MAE = 1.0
      const aligned = createAligned([1, 2, 3], [2, 3, 4]);

      expectStats(aligned).field("score").toHaveMAEBelow(0.5);

      const { assertions } = endTestExecution();
      expect(assertions[0].passed).toBe(false);
      expect(assertions[0].message).toContain("exceeds threshold");
    });

    it("passes when MAE equals threshold", () => {
      startTestExecution();
      // MAE = 1.0
      const aligned = createAligned([1, 2, 3], [2, 3, 4]);

      expect(() => expectStats(aligned).field("score").toHaveMAEBelow(1.0)).not.toThrow();

      endTestExecution();
    });

    it("records assertion result correctly", () => {
      startTestExecution();
      const aligned = createAligned([1, 2, 3, 4, 5], [1.1, 2.1, 2.9, 4.1, 4.9]);

      expectStats(aligned).field("score").toHaveMAEBelow(0.2);

      const { assertions } = endTestExecution();
      expect(assertions).toHaveLength(1);
      expect(assertions[0]?.type).toBe("mae");
      expect(assertions[0]?.field).toBe("score");
      expect(assertions[0]?.actual).toBeCloseTo(0.1, 5);
      expect(assertions[0]?.expected).toBe(0.2);
    });
  });

  describe("toHaveRMSEBelow", () => {
    it("passes when RMSE is below threshold", () => {
      startTestExecution();
      // Perfect predictions: RMSE = 0
      const aligned = createAligned([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);

      expect(() => expectStats(aligned).field("score").toHaveRMSEBelow(0.1)).not.toThrow();

      const { assertions } = endTestExecution();
      expect(assertions[0]?.passed).toBe(true);
      expect(assertions[0]?.type).toBe("rmse");
    });

    it("fails when RMSE exceeds threshold", () => {
      startTestExecution();
      // MSE = 1.0, RMSE = 1.0
      const aligned = createAligned([1, 2, 3], [2, 3, 4]);

      expectStats(aligned).field("score").toHaveRMSEBelow(0.5);

      const { assertions } = endTestExecution();
      expect(assertions[0].passed).toBe(false);
      expect(assertions[0].message).toContain("exceeds threshold");
    });

    it("passes when RMSE equals threshold", () => {
      startTestExecution();
      // RMSE = 1.0
      const aligned = createAligned([1, 2, 3], [2, 3, 4]);

      expect(() => expectStats(aligned).field("score").toHaveRMSEBelow(1.0)).not.toThrow();

      endTestExecution();
    });

    it("penalizes large errors more than MAE", () => {
      startTestExecution();
      // One large error: [1, 2, 10] vs [1, 2, 3]
      // MAE = (0 + 0 + 7) / 3 ≈ 2.33
      // MSE = (0 + 0 + 49) / 3 ≈ 16.33, RMSE ≈ 4.04
      const aligned = createAligned([1, 2, 10], [1, 2, 3]);

      // MAE would pass at 3.0, but RMSE won't
      expectStats(aligned).field("score").toHaveRMSEBelow(3.0);

      const { assertions } = endTestExecution();
      expect(assertions[0].passed).toBe(false);
    });
  });

  describe("toHaveR2Above", () => {
    it("passes for perfect predictions (R² = 1)", () => {
      startTestExecution();
      const aligned = createAligned([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);

      expect(() => expectStats(aligned).field("score").toHaveR2Above(0.99)).not.toThrow();

      const { assertions } = endTestExecution();
      expect(assertions[0]?.passed).toBe(true);
      expect(assertions[0]?.type).toBe("r2");
      expect(assertions[0]?.actual).toBe(1);
    });

    it("fails when R² is below threshold", () => {
      startTestExecution();
      // Predictions far off from expected
      const aligned = createAligned([10, 20, 30], [1, 2, 3]);

      expectStats(aligned).field("score").toHaveR2Above(0.5);

      const { assertions } = endTestExecution();
      expect(assertions[0].passed).toBe(false);
      expect(assertions[0].message).toContain("below threshold");
    });

    it("passes when R² equals threshold", () => {
      startTestExecution();
      const aligned = createAligned([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);

      expect(() => expectStats(aligned).field("score").toHaveR2Above(1.0)).not.toThrow();

      endTestExecution();
    });

    it("handles good but imperfect predictions", () => {
      startTestExecution();
      // Close predictions with small errors
      const aligned = createAligned([1.1, 1.9, 3.1, 3.9, 5.1], [1, 2, 3, 4, 5]);

      // Should have high R² (> 0.95)
      expect(() => expectStats(aligned).field("score").toHaveR2Above(0.95)).not.toThrow();

      endTestExecution();
    });
  });

  describe("Error handling", () => {
    it("throws when no ground truth provided", () => {
      startTestExecution();
      const predictions = [
        { id: "1", score: 0.8 },
        { id: "2", score: 0.6 },
      ];

      expect(() => expectStats(predictions).field("score").toHaveMAEBelow(0.1)).toThrow(
        "requires ground truth"
      );

      endTestExecution();
    });

    it("throws when actual values are not numeric", () => {
      startTestExecution();
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { score: "high" }, expected: { score: 1 } },
        { id: "2", actual: { score: "low" }, expected: { score: 0 } },
      ];

      expect(() => expectStats(aligned).field("score").toHaveMAEBelow(0.1)).toThrow(
        "no numeric actual values"
      );

      endTestExecution();
    });

    it("throws when expected values are not numeric", () => {
      startTestExecution();
      const aligned: AlignedRecord[] = [
        { id: "1", actual: { score: 1 }, expected: { score: "high" } },
        { id: "2", actual: { score: 0 }, expected: { score: "low" } },
      ];

      expect(() => expectStats(aligned).field("score").toHaveMAEBelow(0.1)).toThrow(
        "no numeric expected values"
      );

      endTestExecution();
    });
  });

  describe("Method chaining", () => {
    it("supports chaining multiple regression assertions", () => {
      startTestExecution();
      const aligned = createAligned([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);

      expect(() =>
        expectStats(aligned)
          .field("score")
          .toHaveMAEBelow(0.1)
          .toHaveRMSEBelow(0.1)
          .toHaveR2Above(0.99)
      ).not.toThrow();

      const { assertions } = endTestExecution();
      expect(assertions).toHaveLength(3);
      expect(assertions[0]?.type).toBe("mae");
      expect(assertions[1]?.type).toBe("rmse");
      expect(assertions[2]?.type).toBe("r2");
    });

    it("supports mixing regression and distribution assertions", () => {
      startTestExecution();
      const aligned = createAligned([0.9, 0.8, 0.85, 0.95, 0.88], [0.9, 0.8, 0.85, 0.95, 0.88]);

      expect(
        () =>
          expectStats(aligned).field("score").toHaveMAEBelow(0.1).toHavePercentageAbove(0.7, 1.0) // All values > 0.7
      ).not.toThrow();

      const { assertions } = endTestExecution();
      expect(assertions).toHaveLength(2);
      expect(assertions[0]?.type).toBe("mae");
      expect(assertions[1]?.type).toBe("percentageAbove");
    });
  });

  describe("Two-argument expectStats with regression", () => {
    it("works with separate predictions and ground truth arrays", () => {
      startTestExecution();
      const predictions = [
        { id: "1", rating: 4.5 },
        { id: "2", rating: 3.8 },
        { id: "3", rating: 4.2 },
      ];
      const groundTruth = [
        { id: "1", rating: 4.6 },
        { id: "2", rating: 3.9 },
        { id: "3", rating: 4.1 },
      ];

      expect(() =>
        expectStats(predictions, groundTruth).field("rating").toHaveMAEBelow(0.2)
      ).not.toThrow();

      endTestExecution();
    });
  });
});
