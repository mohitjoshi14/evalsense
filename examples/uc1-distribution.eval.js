/**
 * Use Case 1: Distribution Monitoring
 *
 * Monitor score distributions from model outputs WITHOUT ground truth.
 * Use this when you want to track whether outputs stay within expected ranges.
 *
 * Key assertions:
 * - percentageAbove(valueThreshold).toBeAtLeast(percentageThreshold)
 * - percentageBelow(valueThreshold).toBeAtLeast(percentageThreshold)
 *
 * No dataset loading required - you can pass predictions directly to expectStats.
 *
 * Run with: npx evalsense run examples/uc1-distribution.eval.js
 */

import { describe, evalTest, expectStats } from "evalsense";

describe("UC1: Distribution Monitoring", () => {
  // ============================================================================
  // Basic Distribution Assertions
  // ============================================================================

  evalTest("monitor confidence scores", () => {
    // Scenario: Track model confidence distribution
    // No ground truth needed - just monitoring the distribution
    const predictions = [
      { id: "1", confidence: 0.95, quality: 0.9 },
      { id: "2", confidence: 0.72, quality: 0.8 },
      { id: "3", confidence: 0.88, quality: 0.75 },
      { id: "4", confidence: 0.65, quality: 0.85 },
      { id: "5", confidence: 0.91, quality: 0.88 },
      { id: "6", confidence: 0.78, quality: 0.92 },
      { id: "7", confidence: 0.82, quality: 0.7 },
      { id: "8", confidence: 0.59, quality: 0.65 },
      { id: "9", confidence: 0.93, quality: 0.95 },
      { id: "10", confidence: 0.76, quality: 0.78 },
    ];

    // Assert at least 70% of confidence scores are above 0.6
    expectStats(predictions).field("confidence").percentageAbove(0.6).toBeAtLeast(0.7);

    // Assert at least 80% of quality scores are above 0.7
    expectStats(predictions).field("quality").percentageAbove(0.7).toBeAtLeast(0.8);
  });

  evalTest("monitor toxicity scores should be low", () => {
    // Scenario: Ensure model outputs have low toxicity
    const predictions = [
      { id: "1", toxicity: 0.02 },
      { id: "2", toxicity: 0.05 },
      { id: "3", toxicity: 0.01 },
      { id: "4", toxicity: 0.08 },
      { id: "5", toxicity: 0.03 },
      { id: "6", toxicity: 0.12 },
      { id: "7", toxicity: 0.02 },
      { id: "8", toxicity: 0.06 },
      { id: "9", toxicity: 0.04 },
      { id: "10", toxicity: 0.01 },
    ];

    // Assert at least 90% of toxicity scores are below 0.1
    expectStats(predictions).field("toxicity").percentageBelow(0.1).toBeAtLeast(0.9);
  });

  // ============================================================================
  // Chained Assertions
  // ============================================================================

  evalTest("chain multiple distribution assertions", () => {
    const predictions = Array.from({ length: 50 }, (_, i) => ({
      id: String(i + 1),
      score: 0.3 + Math.random() * 0.5, // Range: 0.3 to 0.8
    }));

    // Chain assertions to define acceptable range
    expectStats(predictions)
      .field("score")
      .percentageAbove(0.25)
      .toBeAtLeast(0.95) // 95% should be above 0.25
      .percentageBelow(0.85)
      .toBeAtLeast(0.95); // 95% should be below 0.85
  });

  evalTest("monitor multiple fields", () => {
    const predictions = [
      { id: "1", relevance: 0.85, coherence: 0.9, conciseness: 0.75 },
      { id: "2", relevance: 0.72, coherence: 0.85, conciseness: 0.8 },
      { id: "3", relevance: 0.91, coherence: 0.78, conciseness: 0.88 },
      { id: "4", relevance: 0.88, coherence: 0.92, conciseness: 0.7 },
      { id: "5", relevance: 0.76, coherence: 0.88, conciseness: 0.82 },
    ];

    // Monitor each quality dimension independently
    expectStats(predictions).field("relevance").percentageAbove(0.7).toBeAtLeast(0.8);
    expectStats(predictions).field("coherence").percentageAbove(0.75).toBeAtLeast(0.8);
    expectStats(predictions).field("conciseness").percentageAbove(0.7).toBeAtLeast(0.8);
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  evalTest("handles mixed numeric and non-numeric values", () => {
    // Distribution assertions filter to numeric values only
    const predictions = [
      { id: "1", score: 0.1 },
      { id: "2", score: "invalid" },
      { id: "3", score: 0.8 },
      { id: "4", score: null },
      { id: "5", score: 0.9 },
    ];

    // Filters to [0.1, 0.8, 0.9] - 66.7% are > 0.5
    expectStats(predictions).field("score").percentageAbove(0.5).toBeAtLeast(0.6);
  });

  evalTest("boundary conditions", () => {
    const predictions = [
      { id: "1", score: 0.5 }, // Exactly at threshold
      { id: "2", score: 0.5 },
      { id: "3", score: 0.5 },
    ];

    // percentageBelow uses <= so 0.5 counts as below 0.5
    expectStats(predictions).field("score").percentageBelow(0.5).toBeAtLeast(1.0);
  });
});

describe("UC1: Real-World Scenarios", () => {
  evalTest("chatbot response quality monitoring", () => {
    // Simulate chatbot responses with quality scores
    const responses = [
      { id: "chat-1", helpfulness: 0.85, clarity: 0.9 },
      { id: "chat-2", helpfulness: 0.92, clarity: 0.88 },
      { id: "chat-3", helpfulness: 0.78, clarity: 0.82 },
      { id: "chat-4", helpfulness: 0.95, clarity: 0.91 },
      { id: "chat-5", helpfulness: 0.71, clarity: 0.75 },
    ];

    // Quality gate: 80% of responses should be above threshold
    expectStats(responses).field("helpfulness").percentageAbove(0.7).toBeAtLeast(0.8);
    expectStats(responses).field("clarity").percentageAbove(0.75).toBeAtLeast(0.8);
  });

  evalTest("content safety monitoring", () => {
    // Monitor content moderation scores
    const content = [
      { id: "post-1", violationScore: 0.02 },
      { id: "post-2", violationScore: 0.01 },
      { id: "post-3", violationScore: 0.15 },
      { id: "post-4", violationScore: 0.03 },
      { id: "post-5", violationScore: 0.01 },
    ];

    // 80% should have violation score below 0.1
    expectStats(content).field("violationScore").percentageBelow(0.1).toBeAtLeast(0.8);
  });
});
