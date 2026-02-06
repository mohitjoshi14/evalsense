/**
 * Use Case 3: Classification with Ground Truth
 *
 * Compare model predictions against ground truth using classification metrics.
 * Use this when you have labeled data and want to measure accuracy.
 *
 * Key assertions:
 * - toHaveAccuracyAbove(threshold)
 * - toHavePrecisionAbove(class, threshold)
 * - toHaveRecallAbove(class, threshold)
 * - toHaveF1Above(threshold)
 * - toHaveConfusionMatrix()
 * - binarize(threshold) for continuous scores
 *
 * Regression assertions (for numeric predictions):
 * - toHaveMAEBelow(threshold)
 * - toHaveRMSEBelow(threshold)
 * - toHaveR2Above(threshold)
 *
 * Run with: npx evalsense run examples/uc3-classification.eval.js
 */

import { describe, evalTest, expectStats } from "evalsense";
import { readFileSync } from "fs";

// ============================================================================
// Pattern A: Classification from JSON File
// ============================================================================

// Simple keyword-based classifier
function classifySentiment(text) {
  const lower = text.toLowerCase();
  const positive = ["love", "amazing", "great", "fantastic", "good", "recommend", "excellent"];
  const negative = ["terrible", "worst", "hate", "poor", "awful", "disappointing", "bad"];

  let positiveScore = positive.filter((w) => lower.includes(w)).length;
  let negativeScore = negative.filter((w) => lower.includes(w)).length;

  return positiveScore > negativeScore ? "positive" : "negative";
}

describe("UC3: Classification from File", () => {
  evalTest("sentiment classification accuracy", async () => {
    // Load dataset with ground truth
    const groundTruth = JSON.parse(readFileSync("./examples/basic/sentiment.json", "utf-8"));

    // Run classifier and collect predictions
    const predictions = groundTruth.map((record) => ({
      id: record.id,
      sentiment: classifySentiment(record.text),
    }));

    // Assert classification metrics
    expectStats(predictions, groundTruth)
      .field("sentiment")
      .toHaveAccuracyAbove(0.8)
      .toHaveRecallAbove("positive", 0.7)
      .toHaveRecallAbove("negative", 0.7)
      .toHaveConfusionMatrix();
  });

  evalTest("precision and F1", async () => {
    const groundTruth = JSON.parse(readFileSync("./examples/basic/sentiment.json", "utf-8"));
    const predictions = groundTruth.map((r) => ({
      id: r.id,
      sentiment: classifySentiment(r.text),
    }));

    expectStats(predictions, groundTruth)
      .field("sentiment")
      .toHavePrecisionAbove("positive", 0.7)
      .toHavePrecisionAbove("negative", 0.7)
      .toHaveF1Above(0.75);
  });
});

// ============================================================================
// Pattern B: Direct Predictions (Inline Data)
// ============================================================================

describe("UC3: Classification without runModel", () => {
  evalTest("compare predictions directly to ground truth", () => {
    // Your predictions (could come from any source)
    const predictions = [
      { id: "1", category: "spam" },
      { id: "2", category: "ham" },
      { id: "3", category: "spam" },
      { id: "4", category: "ham" },
      { id: "5", category: "ham" },
    ];

    // Ground truth labels
    const groundTruth = [
      { id: "1", category: "spam" },
      { id: "2", category: "ham" },
      { id: "3", category: "ham" }, // Mismatch: predicted spam, actual ham
      { id: "4", category: "ham" },
      { id: "5", category: "spam" }, // Mismatch: predicted ham, actual spam
    ];

    // Two-argument form: expectStats(predictions, groundTruth)
    // 3/5 = 60% accuracy
    expectStats(predictions, groundTruth)
      .field("category")
      .toHaveAccuracyAbove(0.5)
      .toHaveConfusionMatrix();
  });

  evalTest("binary classification with boolean labels", () => {
    const predictions = [
      { id: "1", fraudulent: true },
      { id: "2", fraudulent: false },
      { id: "3", fraudulent: true },
      { id: "4", fraudulent: false },
      { id: "5", fraudulent: true },
    ];

    const groundTruth = [
      { id: "1", fraudulent: true },
      { id: "2", fraudulent: false },
      { id: "3", fraudulent: false },
      { id: "4", fraudulent: false },
      { id: "5", fraudulent: true },
    ];

    // Check recall for true class (catch fraud)
    // TP=2, FN=0, FP=1 → Recall(true) = 2/2 = 100%
    expectStats(predictions, groundTruth).field("fraudulent").toHaveRecallAbove(true, 0.95);
  });
});

// ============================================================================
// Pattern C: Binarizing Continuous Scores
// ============================================================================

describe("UC3: Binarize Continuous Scores", () => {
  evalTest("binarize confidence scores", () => {
    // Predictions with continuous scores
    const predictions = [
      { id: "1", confidence: 0.95 }, // Above 0.5 → true
      { id: "2", confidence: 0.3 }, // Below 0.5 → false
      { id: "3", confidence: 0.75 }, // Above 0.5 → true
      { id: "4", confidence: 0.45 }, // Below 0.5 → false
      { id: "5", confidence: 0.82 }, // Above 0.5 → true
    ];

    // Ground truth (boolean)
    const groundTruth = [
      { id: "1", confidence: true },
      { id: "2", confidence: false },
      { id: "3", confidence: true },
      { id: "4", confidence: false },
      { id: "5", confidence: true },
    ];

    // Binarize at 0.5 threshold
    expectStats(predictions, groundTruth)
      .field("confidence")
      .binarize(0.5)
      .toHaveAccuracyAbove(0.9)
      .toHavePrecisionAbove(true, 0.9)
      .toHaveRecallAbove(true, 0.9)
      .toHaveConfusionMatrix();
  });

  evalTest("hallucination detection with binarized scores", async () => {
    // Simulated hallucination scores
    const predictions = [
      { id: "1", hallucinationScore: 0.12 }, // Low score → not hallucinated
      { id: "2", hallucinationScore: 0.85 }, // High score → hallucinated
      { id: "3", hallucinationScore: 0.08 },
      { id: "4", hallucinationScore: 0.72 },
      { id: "5", hallucinationScore: 0.15 },
    ];

    // Ground truth (boolean)
    const groundTruth = [
      { id: "1", hallucinationScore: false },
      { id: "2", hallucinationScore: true },
      { id: "3", hallucinationScore: false },
      { id: "4", hallucinationScore: true },
      { id: "5", hallucinationScore: false },
    ];

    // Binarize at 0.3 threshold
    expectStats(predictions, groundTruth)
      .field("hallucinationScore")
      .binarize(0.3)
      .toHaveRecallAbove(true, 0.9) // Catch most hallucinations
      .toHavePrecisionAbove(true, 0.8);
  });
});

// ============================================================================
// Pattern D: Regression Metrics
// ============================================================================

describe("UC3: Regression Metrics", () => {
  evalTest("numeric prediction accuracy", () => {
    // Predicted scores
    const predictions = [
      { id: "1", rating: 4.2 },
      { id: "2", rating: 3.8 },
      { id: "3", rating: 4.5 },
      { id: "4", rating: 2.9 },
      { id: "5", rating: 4.1 },
    ];

    // Actual scores
    const groundTruth = [
      { id: "1", rating: 4.0 },
      { id: "2", rating: 4.0 },
      { id: "3", rating: 4.5 },
      { id: "4", rating: 3.0 },
      { id: "5", rating: 4.0 },
    ];

    // Regression assertions
    expectStats(predictions, groundTruth)
      .field("rating")
      .toHaveMAEBelow(0.3) // Mean Absolute Error below 0.3
      .toHaveRMSEBelow(0.3) // Root Mean Squared Error below 0.3
      .toHaveR2Above(0.7); // R² above 0.7
  });

  evalTest("price prediction evaluation", () => {
    const predictions = [
      { id: "1", price: 100 },
      { id: "2", price: 250 },
      { id: "3", price: 180 },
      { id: "4", price: 320 },
    ];

    const groundTruth = [
      { id: "1", price: 105 },
      { id: "2", price: 240 },
      { id: "3", price: 175 },
      { id: "4", price: 310 },
    ];

    expectStats(predictions, groundTruth)
      .field("price")
      .toHaveMAEBelow(15) // Average error below $15
      .toHaveRMSEBelow(15)
      .toHaveR2Above(0.95); // Strong correlation
  });
});

// ============================================================================
// Pattern E: Custom ID Field
// ============================================================================

describe("UC3: Custom ID Field Matching", () => {
  evalTest("align by custom ID field", () => {
    const predictions = [
      { id: "a", uuid: "item-001", label: "positive" },
      { id: "b", uuid: "item-002", label: "negative" },
      { id: "c", uuid: "item-003", label: "positive" },
    ];

    const groundTruth = [
      { uuid: "item-001", label: "positive" },
      { uuid: "item-002", label: "positive" }, // Mismatch
      { uuid: "item-003", label: "positive" },
    ];

    // Use idField option to align by uuid instead of id
    expectStats(predictions, groundTruth, { idField: "uuid" })
      .field("label")
      .toHaveAccuracyAbove(0.6);
  });
});

// ============================================================================
// Multi-Class Classification
// ============================================================================

describe("UC3: Multi-Class Classification", () => {
  evalTest("intent classification metrics", () => {
    const predictions = [
      { id: "1", intent: "book_flight" },
      { id: "2", intent: "check_weather" },
      { id: "3", intent: "book_hotel" },
      { id: "4", intent: "book_flight" },
      { id: "5", intent: "check_weather" },
      { id: "6", intent: "book_flight" },
    ];

    const groundTruth = [
      { id: "1", intent: "book_flight" },
      { id: "2", intent: "check_weather" },
      { id: "3", intent: "book_flight" }, // Mismatch
      { id: "4", intent: "book_flight" },
      { id: "5", intent: "book_hotel" }, // Mismatch
      { id: "6", intent: "book_flight" },
    ];

    // Overall metrics
    expectStats(predictions, groundTruth)
      .field("intent")
      .toHaveAccuracyAbove(0.6) // 4/6 = 66.7%
      .toHaveF1Above(0.5); // Macro F1

    // Per-class metrics
    expectStats(predictions, groundTruth)
      .field("intent")
      .toHavePrecisionAbove("book_flight", 0.6)
      .toHaveRecallAbove("book_flight", 0.6)
      .toHaveConfusionMatrix();
  });
});
