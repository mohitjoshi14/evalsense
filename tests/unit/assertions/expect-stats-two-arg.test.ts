import { describe, it, expect, beforeEach } from "vitest";
import { expectStats } from "../../../src/assertions/expect-stats.js";
import type { Prediction } from "../../../src/core/types.js";
import { resetContext, startTestExecution } from "../../../src/core/context.js";

describe("expectStats - Two Argument API", () => {
  beforeEach(() => {
    resetContext();
    startTestExecution();
  });

  describe("Alignment", () => {
    it("should align predictions with ground truth by id", () => {
      const predictions: Prediction[] = [
        { id: "1", sentiment: "positive" },
        { id: "2", sentiment: "negative" },
        { id: "3", sentiment: "positive" },
      ];

      const groundTruth = [
        { id: "1", sentiment: "positive" },
        { id: "2", sentiment: "positive" },
        { id: "3", sentiment: "positive" },
      ];

      const stats = expectStats(predictions, groundTruth);
      const aligned = stats.getAligned();

      expect(aligned).toHaveLength(3);
      expect(aligned[0].actual.sentiment).toBe("positive");
      expect(aligned[0].expected.sentiment).toBe("positive");
      expect(aligned[1].actual.sentiment).toBe("negative");
      expect(aligned[1].expected.sentiment).toBe("positive");
    });

    it("should align predictions with ground truth when ground truth uses _id", () => {
      const predictions: Prediction[] = [
        { id: "a", label: "cat" },
        { id: "b", label: "dog" },
      ];

      const groundTruth = [
        { _id: "a", label: "cat" },
        { _id: "b", label: "cat" },
      ];

      const stats = expectStats(predictions, groundTruth);
      const aligned = stats.getAligned();

      expect(aligned).toHaveLength(2);
      expect(aligned[0].id).toBe("a");
      expect(aligned[1].id).toBe("b");
      expect(aligned[0].actual.label).toBe("cat");
      expect(aligned[0].expected.label).toBe("cat");
    });

    it("should throw error when first argument is not Prediction[]", () => {
      const modelRunResult = {
        predictions: [],
        aligned: [],
        dataset: [],
      };

      const groundTruth = [{ id: "1", label: "test" }];

      expect(() => {
        // @ts-expect-error - testing runtime error
        expectStats(modelRunResult, groundTruth);
      }).toThrow("When using two-argument expectStats(), first argument must be Prediction[]");
    });
  });

  describe("Classification Metrics with Ground Truth", () => {
    it("should calculate accuracy with ground truth", () => {
      const predictions: Prediction[] = [
        { id: "1", sentiment: "positive" },
        { id: "2", sentiment: "positive" },
        { id: "3", sentiment: "negative" },
        { id: "4", sentiment: "positive" },
      ];

      const groundTruth = [
        { id: "1", sentiment: "positive" },
        { id: "2", sentiment: "negative" },
        { id: "3", sentiment: "negative" },
        { id: "4", sentiment: "positive" },
      ];

      // Accuracy: 3/4 = 75%
      expect(() => {
        expectStats(predictions, groundTruth).field("sentiment").accuracy.toBeAtLeast(0.7);
      }).not.toThrow();
    });

    it("should calculate precision with ground truth", () => {
      const predictions: Prediction[] = [
        { id: "1", label: true },
        { id: "2", label: true },
        { id: "3", label: false },
        { id: "4", label: true },
      ];

      const groundTruth = [
        { id: "1", label: true },
        { id: "2", label: false },
        { id: "3", label: false },
        { id: "4", label: true },
      ];

      // Precision for true: TP=2, FP=1 -> 2/3 = 66.7%
      expect(() => {
        expectStats(predictions, groundTruth).field("label").precision(true).toBeAtLeast(0.6);
      }).not.toThrow();
    });

    it("should calculate recall with ground truth", () => {
      const predictions: Prediction[] = [
        { id: "1", label: true },
        { id: "2", label: false },
        { id: "3", label: true },
        { id: "4", label: true },
      ];

      const groundTruth = [
        { id: "1", label: true },
        { id: "2", label: true },
        { id: "3", label: true },
        { id: "4", label: false },
      ];

      // Recall for true: TP=2, FN=1 -> 2/3 = 66.7%
      expect(() => {
        expectStats(predictions, groundTruth).field("label").recall(true).toBeAtLeast(0.6);
      }).not.toThrow();
    });

    it("should calculate F1 with ground truth", () => {
      const predictions: Prediction[] = [
        { id: "1", category: "A" },
        { id: "2", category: "A" },
        { id: "3", category: "B" },
        { id: "4", category: "A" },
      ];

      const groundTruth = [
        { id: "1", category: "A" },
        { id: "2", category: "B" },
        { id: "3", category: "B" },
        { id: "4", category: "A" },
      ];

      expect(() => {
        expectStats(predictions, groundTruth).field("category").f1.toBeAtLeast(0.6);
      }).not.toThrow();
    });

    it("should support confusion matrix with ground truth", () => {
      const predictions: Prediction[] = [
        { id: "1", sentiment: "positive" },
        { id: "2", sentiment: "negative" },
      ];

      const groundTruth = [
        { id: "1", sentiment: "positive" },
        { id: "2", sentiment: "positive" },
      ];

      expect(() => {
        expectStats(predictions, groundTruth).field("sentiment").displayConfusionMatrix();
      }).not.toThrow();
    });
  });

  describe("Ground Truth Validation", () => {
    it("should throw error when using classification metrics without ground truth", () => {
      const predictions: Prediction[] = [
        { id: "1", label: "positive" },
        { id: "2", label: "negative" },
      ];

      expect(() => {
        expectStats(predictions).field("label").accuracy.toBeAtLeast(0.8);
      }).toThrow(
        'Classification metric requires ground truth, but field "label" has no expected values'
      );
    });

    it("should throw error for precision without ground truth", () => {
      const predictions: Prediction[] = [
        { id: "1", label: true },
        { id: "2", label: false },
      ];

      expect(() => {
        expectStats(predictions).field("label").precision(true).toBeAtLeast(0.8);
      }).toThrow("Classification metric requires ground truth");
    });

    it("should throw error for recall without ground truth", () => {
      const predictions: Prediction[] = [
        { id: "1", label: true },
        { id: "2", label: false },
      ];

      expect(() => {
        expectStats(predictions).field("label").recall(true).toBeAtLeast(0.8);
      }).toThrow("Classification metric requires ground truth");
    });

    it("should throw error for F1 without ground truth", () => {
      const predictions: Prediction[] = [
        { id: "1", label: "A" },
        { id: "2", label: "B" },
      ];

      expect(() => {
        expectStats(predictions).field("label").f1.toBeAtLeast(0.8);
      }).toThrow("Classification metric requires ground truth");
    });

    it("should allow percentage assertions without ground truth", () => {
      const predictions: Prediction[] = [
        { id: "1", score: 0.1 },
        { id: "2", score: 0.2 },
        { id: "3", score: 0.8 },
      ];

      // Distribution assertions should work without ground truth
      expect(() => {
        expectStats(predictions).field("score").percentageBelow(0.5).toBeAtLeast(0.6); // 66% are <= 0.5
      }).not.toThrow();
    });
  });

  describe("Judge Validation Pattern", () => {
    it("should validate judge outputs against human labels", () => {
      // Judge outputs (predictions)
      const judgeOutputs: Prediction[] = [
        { id: "1", hallucinated: true },
        { id: "2", hallucinated: false },
        { id: "3", hallucinated: true },
        { id: "4", hallucinated: false },
        { id: "5", hallucinated: true },
      ];

      // Human labels (ground truth)
      const humanLabels = [
        { id: "1", hallucinated: true },
        { id: "2", hallucinated: false },
        { id: "3", hallucinated: false },
        { id: "4", hallucinated: false },
        { id: "5", hallucinated: true },
      ];

      // Validate judge: TP=2, FP=1, FN=0, TN=2
      // Recall for true: 2/2 = 100%
      // Precision for true: 2/3 = 66.7%
      expect(() => {
        expectStats(judgeOutputs, humanLabels)
          .field("hallucinated")
          .recall(true).toBeAtLeast(0.95) // High recall: don't miss hallucinations
          .precision(true).toBeAtLeast(0.6); // Some false positives OK
      }).not.toThrow();
    });

    it("should validate tool selection judge", () => {
      const judgeOutputs: Prediction[] = [
        { id: "1", selectedTool: "search" },
        { id: "2", selectedTool: "calculator" },
        { id: "3", selectedTool: "search" },
        { id: "4", selectedTool: "weather" },
      ];

      const groundTruth = [
        { id: "1", selectedTool: "search" },
        { id: "2", selectedTool: "calculator" },
        { id: "3", selectedTool: "calendar" },
        { id: "4", selectedTool: "weather" },
      ];

      // Accuracy: 3/4 = 75%
      expect(() => {
        expectStats(judgeOutputs, groundTruth).field("selectedTool").accuracy.toBeAtLeast(0.7);
      }).not.toThrow();
    });

    it("should validate refusal detection judge with high recall", () => {
      const judgeOutputs: Prediction[] = [
        { id: "1", shouldRefuse: true },
        { id: "2", shouldRefuse: true },
        { id: "3", shouldRefuse: false },
        { id: "4", shouldRefuse: true },
        { id: "5", shouldRefuse: false },
      ];

      const groundTruth = [
        { id: "1", shouldRefuse: true },
        { id: "2", shouldRefuse: false }, // FP: over-cautious is OK
        { id: "3", shouldRefuse: false },
        { id: "4", shouldRefuse: true },
        { id: "5", shouldRefuse: false },
      ];

      // Recall for true: 2/2 = 100% (never miss harmful requests)
      // Precision for true: 2/3 = 66.7% (some false positives OK)
      expect(() => {
        expectStats(judgeOutputs, groundTruth).field("shouldRefuse").recall(true).toBeAtLeast(0.95); // Must catch all harmful requests
      }).not.toThrow();
    });
  });

  describe("Chaining with Distribution Assertions", () => {
    it("should allow mixing distribution and classification assertions", () => {
      const predictions: Prediction[] = [
        { id: "1", label: true, confidence: 0.9 },
        { id: "2", label: false, confidence: 0.2 },
        { id: "3", label: true, confidence: 0.85 },
        { id: "4", label: false, confidence: 0.1 },
      ];

      const groundTruth = [
        { id: "1", label: true },
        { id: "2", label: false },
        { id: "3", label: true },
        { id: "4", label: false },
      ];

      expect(() => {
        expectStats(predictions, groundTruth).field("label").accuracy.toBeAtLeast(0.95); // Perfect accuracy

        expectStats(predictions, groundTruth).field("confidence").percentageAbove(0.5).toBeAtLeast(0.4); // 50% have high confidence
      }).not.toThrow();
    });
  });

  describe("Flexible ID Matching Options", () => {
    it("should allow custom idField option for ground truth only", () => {
      // predictions.id must match groundTruth[expectedIdField]
      const predictions: Prediction[] = [
        { id: "uuid-1", score: "high" },
        { id: "uuid-2", score: "low" },
      ];

      const groundTruth = [
        { uuid: "uuid-1", score: "high" },
        { uuid: "uuid-2", score: "high" },
      ];

      // Using expectedIdField for groundTruth
      const stats = expectStats(predictions, groundTruth, { expectedIdField: "uuid" });
      const aligned = stats.getAligned();

      expect(aligned).toHaveLength(2);
      expect(aligned[0].expected.score).toBe("high");
      expect(aligned[1].expected.score).toBe("high");
    });

    it("should work with different ID field names in expected (asymmetric)", () => {
      // Predictions use "id", ground truth uses "itemId"
      const predictions: Prediction[] = [
        { id: "item-001", label: "positive" },
        { id: "item-002", label: "negative" },
      ];

      const groundTruth = [
        { itemId: "item-001", label: "positive" },
        { itemId: "item-002", label: "positive" },
      ];

      expect(() => {
        expectStats(predictions, groundTruth, { expectedIdField: "itemId" })
          .field("label")
          .accuracy.toBeAtLeast(0.4);
      }).not.toThrow();
    });

    it("should support strict mode", () => {
      const predictions: Prediction[] = [
        { id: "1", label: "a" },
        { id: "2", label: "b" },
        { id: "3", label: "c" }, // No matching ground truth
      ];

      const groundTruth = [
        { id: "1", label: "a" },
        { id: "2", label: "b" },
        // Missing id: "3"
      ];

      // Non-strict mode (default): includes record with empty expected
      const statsNonStrict = expectStats(predictions, groundTruth);
      expect(statsNonStrict.count()).toBe(3);

      // Strict mode: throws on missing IDs
      expect(() => {
        expectStats(predictions, groundTruth, { strict: true });
      }).toThrow();
    });

    it("should combine expectedIdField and strict options", () => {
      // Asymmetric: predictions.id matches groundTruth.customId
      const predictions: Prediction[] = [
        { id: "custom-1", label: "a" },
        { id: "custom-2", label: "b" },
      ];

      const groundTruth = [
        { customId: "custom-1", label: "a" },
        { customId: "custom-2", label: "b" },
      ];

      expect(() => {
        expectStats(predictions, groundTruth, { expectedIdField: "customId", strict: true })
          .field("label")
          .accuracy.toBeAtLeast(0.9);
      }).not.toThrow();
    });

    it("should support both predictionIdField and expectedIdField", () => {
      // Both arrays use custom ID fields
      const predictions = [
        { postId: "post-1", score: "high" },
        { postId: "post-2", score: "low" },
      ] as Array<Record<string, unknown>>;

      const groundTruth = [
        { uuid: "post-1", score: "high" },
        { uuid: "post-2", score: "high" },
      ];

      expect(() => {
        expectStats(predictions, groundTruth, {
          predictionIdField: "postId",
          expectedIdField: "uuid",
        })
          .field("score")
          .accuracy.toBeAtLeast(0.4);
      }).not.toThrow();
    });
  });
});
