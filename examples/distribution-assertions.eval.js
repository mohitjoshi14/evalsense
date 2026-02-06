/**
 * Distribution Assertions Example
 *
 * Demonstrates Pattern 1: percentage-based distributional assertions
 * without requiring ground truth data.
 *
 * Use case: Monitor score distributions to ensure model outputs
 * stay within expected ranges.
 */

import { describe, evalTest, expectStats } from "evalsense";

// Simulate a model that generates confidence scores
function generatePredictions(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    confidence: Math.random(),
    toxicity: Math.random() * 0.3, // Most scores should be low
    quality: 0.5 + Math.random() * 0.5, // Most scores should be high
  }));
}

describe("Distribution Monitoring", () => {
  evalTest("confidence scores should be well-distributed", () => {
    const predictions = generatePredictions(100);

    // Assert that at least 40% of confidence scores are above 0.5
    expectStats(predictions).field("confidence").toHavePercentageAbove(0.5, 0.4);

    // Assert that at least 40% of confidence scores are below 0.5
    expectStats(predictions).field("confidence").toHavePercentageBelow(0.5, 0.4);
  });

  evalTest("toxicity scores should be mostly low", () => {
    const predictions = generatePredictions(100);

    // Assert that at least 90% of toxicity scores are below 0.5
    expectStats(predictions).field("toxicity").toHavePercentageBelow(0.5, 0.9);
  });

  evalTest("quality scores should be mostly high", () => {
    const predictions = generatePredictions(100);

    // Assert that at least 90% of quality scores are above 0.5
    expectStats(predictions).field("quality").toHavePercentageAbove(0.5, 0.9);
  });

  evalTest("chained distribution assertions", () => {
    const predictions = generatePredictions(100);

    // Chain multiple assertions on the same field
    expectStats(predictions)
      .field("confidence")
      .toHavePercentageAbove(0.3, 0.6) // At least 60% above 0.3
      .toHavePercentageBelow(0.9, 0.8); // At least 80% below 0.9
  });

  evalTest("multiple fields with distribution assertions", () => {
    const predictions = generatePredictions(100);

    // Assert on multiple fields
    expectStats(predictions).field("toxicity").toHavePercentageBelow(0.3, 0.85);

    expectStats(predictions).field("quality").toHavePercentageAbove(0.6, 0.75);
  });
});

describe("Edge Cases", () => {
  evalTest("handles mixed numeric and non-numeric values", () => {
    const predictions = [
      { id: "1", score: 0.1 },
      { id: "2", score: "invalid" },
      { id: "3", score: 0.8 },
      { id: "4", score: null },
      { id: "5", score: 0.9 },
    ];

    // Should filter to only numeric values (0.1, 0.8, 0.9)
    // 66% are > 0.5
    expectStats(predictions).field("score").toHavePercentageAbove(0.5, 0.6);
  });

  evalTest("handles all values below threshold", () => {
    const predictions = [
      { id: "1", score: 0.1 },
      { id: "2", score: 0.2 },
      { id: "3", score: 0.3 },
    ];

    // 100% are below 0.5
    expectStats(predictions).field("score").toHavePercentageBelow(0.5, 1.0);
  });

  evalTest("handles all values above threshold", () => {
    const predictions = [
      { id: "1", score: 0.8 },
      { id: "2", score: 0.9 },
      { id: "3", score: 0.95 },
    ];

    // 100% are above 0.5
    expectStats(predictions).field("score").toHavePercentageAbove(0.5, 1.0);
  });
});
