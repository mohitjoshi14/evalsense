/**
 * Example evaluation file for hallucination detection
 * Demonstrates using binarize() for continuous scores
 */

import { describe, evalTest, expectStats, loadDataset, runModel } from "../../dist/index.js";

// Simulated hallucination detector that returns scores
function detectHallucination(record) {
  // This is a mock - in reality, you'd use an LLM or specialized model
  // Returns higher score for likely hallucinations
  const text = record.output.toLowerCase();

  let score = 0;

  // Check for specific numeric claims (often hallucinated)
  if (/\d{3,}/.test(text)) {
    score += 0.3;
  }

  // Check for definitive historical claims
  if (/founded|established|built in \d{2,4}/.test(text)) {
    score += 0.4;
  }

  // Check for superlatives without context
  if (/tallest|longest|biggest|highest|largest/.test(text)) {
    score += 0.2;
  }

  return {
    id: record.id,
    hallucinationScore: Math.min(score, 1),
  };
}

describe("Hallucination detection evaluation", () => {
  evalTest("hallucination recall above 70%", async () => {
    const dataset = loadDataset("./examples/basic/scores.json");

    // Run the detector - return score in the same field as ground truth
    const result = await runModel(dataset, (record) => ({
      id: record.id,
      hallucinated: detectHallucination(record).hallucinationScore, // Continuous score 0-1
    }));

    // Binarize the continuous score and check recall
    expectStats(result)
      .field("hallucinated") // Field name matches ground truth
      .binarize(0.3) // Threshold: score >= 0.3 means hallucinated
      .toHaveRecallAbove(true, 0.5) // At least 50% of hallucinations detected
      .toHaveConfusionMatrix();
  });

  evalTest("low false positive rate", async () => {
    const dataset = loadDataset("./examples/basic/scores.json");

    const result = await runModel(dataset, (record) => ({
      id: record.id,
      hallucinated: detectHallucination(record).hallucinationScore,
    }));

    // Check precision - when we say it's hallucinated, we should be right
    expectStats(result)
      .field("hallucinated")
      .binarize(0.3)
      .toHavePrecisionAbove(true, 0.4);
  });
});
