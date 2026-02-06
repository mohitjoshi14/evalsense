/**
 * Example evaluation file for a sentiment classifier
 */

import { describe, evalTest, expectStats, loadDataset, runModel } from "../../dist/index.js";

// Simple keyword-based classifier for demonstration
function classifySentiment(record) {
  const text = record.text.toLowerCase();
  const positiveWords = [
    "love",
    "amazing",
    "great",
    "fantastic",
    "perfect",
    "good",
    "recommend",
    "exceeded",
  ];
  const negativeWords = ["terrible", "worst", "disappointed", "waste", "poor", "broke", "not"];

  let positiveScore = 0;
  let negativeScore = 0;

  for (const word of positiveWords) {
    if (text.includes(word)) positiveScore++;
  }
  for (const word of negativeWords) {
    if (text.includes(word)) negativeScore++;
  }

  return {
    id: record.id,
    sentiment: positiveScore > negativeScore ? "positive" : "negative",
  };
}

describe("Sentiment classifier evaluation", () => {
  evalTest("accuracy above 80%", async () => {
    // Load the dataset
    const dataset = loadDataset("./examples/basic/sentiment.json");

    // Run our classifier on each record
    const result = await runModel(dataset, classifySentiment);

    // Assert statistical properties
    expectStats(result)
      .field("sentiment")
      .toHaveAccuracyAbove(0.8)
      .toHaveRecallAbove("positive", 0.7)
      .toHaveRecallAbove("negative", 0.7)
      .toHaveConfusionMatrix();
  });

  evalTest("precision for positive class", async () => {
    const dataset = loadDataset("./examples/basic/sentiment.json");
    const result = await runModel(dataset, classifySentiment);

    expectStats(result).field("sentiment").toHavePrecisionAbove("positive", 0.7);
  });

  evalTest("F1 score above 0.75", async () => {
    const dataset = loadDataset("./examples/basic/sentiment.json");
    const result = await runModel(dataset, classifySentiment);

    expectStats(result).field("sentiment").toHaveF1Above(0.75);
  });
});
