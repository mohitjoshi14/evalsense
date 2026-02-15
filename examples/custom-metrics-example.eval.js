/**
 * Custom Metrics Example
 *
 * Shows how to create and use custom metrics in evalsense.
 * Includes both simple (non-LLM) and advanced (LLM-based) examples.
 *
 * Examples:
 * 1. Simple keyword-based metric
 * 2. Pattern matching metric
 * 3. LLM-based "answer correctness" metric (like Ragas)
 *
 * Run with: npx evalsense run examples/custom-metrics-example.eval.js
 */

import { describe, evalTest, expectStats } from "evalsense";
import {
  createLLMMetric,
  createKeywordMetric,
  createPatternMetric,
  setLLMClient,
  createMockLLMClient,
  normalizeScore,
} from "evalsense/metrics";

// ============================================================================
// Example 1: Simple Keyword-Based Custom Metric
// ============================================================================

describe("Custom Metrics: Keyword-Based", () => {
  evalTest("detect required terms using built-in helper", async () => {
    // Create a metric that checks if outputs contain required medical disclaimers
    const disclaimerMetric = createKeywordMetric(
      "medical-disclaimer",
      ["consult a doctor", "medical professional", "not medical advice"],
      { caseSensitive: false, threshold: 0.3 } // At least 1/3 keywords
    );

    // Example outputs to check
    const outputs = [
      { id: "1", output: "You should consult a doctor before taking any medication." },
      { id: "2", output: "Take two pills daily." }, // Missing disclaimer
      { id: "3", output: "This is not medical advice, but you might try rest." },
    ];

    // Run the metric (these helper functions use the old API: { outputs })
    const results = await disclaimerMetric({ outputs });

    console.log("\n=== Medical Disclaimer Detection ===");
    results.forEach((r) => {
      console.log(`${r.id}: score=${r.score.toFixed(2)}, label=${r.label}`);
    });

    // Assert that at least 50% have disclaimers
    expectStats(results).field("score").percentageAbove(0.3).toBeAtLeast(0.5);
  });

  evalTest("pattern matching with regex", async () => {
    // Detect if outputs contain email addresses
    const emailDetector = createPatternMetric(
      "email-detection",
      [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/],
      { matchScore: 1, noMatchScore: 0 }
    );

    const outputs = [
      { id: "1", output: "Contact us at support@example.com" },
      { id: "2", output: "Visit our website for more info" },
      { id: "3", output: "Email me at john.doe@company.org" },
    ];

    const results = await emailDetector({ outputs });

    console.log("\n=== Email Detection ===");
    results.forEach((r) => {
      console.log(`${r.id}: ${r.label}`);
    });

    expectStats(results).field("score").percentageAbove(0.5).toBeAtLeast(0.5);
  });
});

// ============================================================================
// Example 2: Custom Function-Based Metric
// ============================================================================

describe("Custom Metrics: Function-Based", () => {
  evalTest("custom length checker metric", async () => {
    // Create a metric that checks output length (plain function)
    const responseLength = async (records) => {
      return records.map((record) => {
        const length = record.output.length;
        return {
          id: record.id,
          metric: "response-length",
          score: length,
          label: length < 100 ? "short" : length < 500 ? "medium" : "long",
        };
      });
    };

    const records = [
      { id: "1", output: "Short." },
      { id: "2", output: "This is a medium-length response with some detail." },
      {
        id: "3",
        output: "This is a very long response. ".repeat(50) + "It has lots of information.",
      },
    ];

    // Run the metric (call it as a function)
    const results = await responseLength(records);

    console.log("\n=== Response Length ===");
    results.forEach((r) => {
      console.log(`${r.id}: ${r.score} chars (${r.label})`);
    });

    // Check that average length is reasonable
    expectStats(results).field("score").percentageBelow(1000).toBeAtLeast(0.6);
  });
});

// ============================================================================
// Example 3: LLM-Based "Answer Correctness" Custom Metric
// ============================================================================

// Setup mock LLM client for demo
const mockClient = createMockLLMClient({
  responses: [
    // Per-row responses for answer correctness
    {
      correctness_score: 0.95,
      factual_accuracy: 1.0,
      completeness: 0.9,
      reasoning: "Answer is factually correct and complete.",
    },
    {
      correctness_score: 0.4,
      factual_accuracy: 0.5,
      completeness: 0.3,
      reasoning: "Answer is partially correct but missing key details.",
    },
    {
      correctness_score: 0.8,
      factual_accuracy: 0.9,
      completeness: 0.7,
      reasoning: "Answer is mostly correct with minor omissions.",
    },
  ],
});

setLLMClient(mockClient);

// Answer Correctness Prompt (inspired by Ragas)
const ANSWER_CORRECTNESS_PROMPT = `You are an expert evaluator assessing the correctness of AI-generated answers.

GROUND TRUTH ANSWER:
{groundTruth}

AI-GENERATED ANSWER:
{answer}

TASK:
Evaluate how correct the AI answer is compared to the ground truth.
Consider:
1. Factual Accuracy: Are the facts stated correct?
2. Completeness: Does it cover all important points from ground truth?
3. Relevance: Is the information relevant to what was asked?

SCORING:
- correctness_score: 0-1 (0=completely wrong, 1=perfect)
- factual_accuracy: 0-1 (are facts correct?)
- completeness: 0-1 (covers all key points?)

Return JSON:
{
  "correctness_score": <0-1>,
  "factual_accuracy": <0-1>,
  "completeness": <0-1>,
  "reasoning": "<brief explanation>"
}`;

describe("Custom Metrics: Answer Correctness (LLM-Based)", () => {
  evalTest("evaluate answer correctness against ground truth", async () => {
    // Create the answer correctness metric using createLLMMetric
    const answerCorrectness = createLLMMetric({
      name: "answer-correctness",
      inputs: ["output", "groundTruth"],
      prompt: ANSWER_CORRECTNESS_PROMPT,
      responseFields: {
        correctness_score: "number",
        factual_accuracy: "number",
        completeness: "number",
        reasoning: "string",
      },
      scoreField: "correctness_score", // Use "correctness_score" field as the score
      labels: [
        { min: 0.8, label: "correct" },
        { min: 0.5, label: "partial" },
        { min: 0, label: "incorrect" },
      ],
    });

    // Test data: questions with model answers and ground truth
    const testData = [
      {
        id: "1",
        question: "What is the capital of France?",
        modelAnswer: "The capital of France is Paris.",
        groundTruth: "Paris",
      },
      {
        id: "2",
        question: "Who wrote Romeo and Juliet?",
        modelAnswer: "A famous writer wrote it.",
        groundTruth: "William Shakespeare",
      },
      {
        id: "3",
        question: "What is 2+2?",
        modelAnswer: "2 plus 2 equals 4.",
        groundTruth: "4",
      },
    ];

    // Prepare records for metric
    const records = testData.map((d) => ({
      id: d.id,
      output: d.modelAnswer,
      groundTruth: d.groundTruth,
    }));

    // Run custom metric (call it as a function)
    const results = await answerCorrectness(records);

    console.log("\n=== Answer Correctness Results ===");
    results.forEach((r, i) => {
      console.log(`\nQ: ${testData[i].question}`);
      console.log(`Model: ${testData[i].modelAnswer}`);
      console.log(`Truth: ${testData[i].groundTruth}`);
      console.log(`Score: ${r.score.toFixed(2)} (${r.label})`);
      console.log(`Reasoning: ${r.reasoning}`);
    });

    // Assert quality thresholds
    expectStats(results)
      .field("score")
      .percentageAbove(0.5).toBeAtLeast(0.6) // At least 60% should score above 0.5
      .percentageAbove(0.8).toBeAtLeast(0.3); // At least 30% should score above 0.8
  });
});

// ============================================================================
// Example 4: Combining Multiple Custom Metrics
// ============================================================================

describe("Custom Metrics: Combined Evaluation", () => {
  evalTest("multi-metric quality check", async () => {
    const outputs = [
      { id: "1", output: "Paris is the capital. Contact us at support@example.com" },
      { id: "2", output: "Berlin" },
      { id: "3", output: "The capital of France is Paris. This is a detailed answer." },
    ];

    // Create multiple custom metrics
    const charCount = async (outputs) => {
      return outputs.map((o) => ({
        id: o.id,
        metric: "char-count",
        score: o.output.length,
      }));
    };

    const emailDetector = createPatternMetric(
      "email-detection",
      [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/],
      { matchScore: 1, noMatchScore: 0 }
    );

    // Run the metrics
    const lengthResults = await charCount(outputs);
    const emailResults = await emailDetector({ outputs });

    console.log("\n=== Multi-Metric Analysis ===");
    outputs.forEach((o, i) => {
      console.log(`\n${o.id}: "${o.output}"`);
      console.log(`  Length: ${lengthResults[i].score} chars`);
      console.log(`  Has Email: ${emailResults[i].label}`);
    });

    // Assert on combined metrics
    expectStats(lengthResults).field("score").percentageAbove(10).toBeAtLeast(0.6);
    expectStats(emailResults).field("score").percentageAbove(0.5).toBeAtLeast(0.3);
  });
});

// ============================================================================
// Example 5: Using Custom Metrics with Ground Truth Comparison
// ============================================================================

describe("Custom Metrics: With Ground Truth", () => {
  evalTest("compare custom metric scores to labels", async () => {
    // Create a sentiment intensity metric (plain function)
    const sentimentIntensity = async (records) => {
      const positiveWords = ["love", "amazing", "great", "excellent", "fantastic"];
      const negativeWords = ["hate", "terrible", "awful", "horrible", "worst"];

      return records.map((r) => {
        const text = r.output.toLowerCase();
        const posCount = positiveWords.filter((w) => text.includes(w)).length;
        const negCount = negativeWords.filter((w) => text.includes(w)).length;

        const intensity = Math.max(posCount, negCount);

        return {
          id: r.id,
          metric: "sentiment-intensity",
          score: intensity,
          label: intensity >= 2 ? "strong" : intensity >= 1 ? "moderate" : "weak",
        };
      });
    };

    // Test data
    const records = [
      { id: "1", output: "I love this! It's amazing and excellent!" }, // 3 positive
      { id: "2", output: "This is okay." }, // 0
      { id: "3", output: "Terrible and awful product. The worst!" }, // 3 negative
      { id: "4", output: "Pretty good!" }, // 0
    ];

    // Ground truth labels
    const groundTruth = [
      { id: "1", label: "strong" },
      { id: "2", label: "weak" },
      { id: "3", label: "strong" },
      { id: "4", label: "weak" },
    ];

    // Run metric
    const predictions = await sentimentIntensity(records);

    console.log("\n=== Sentiment Intensity ===");
    predictions.forEach((p) => {
      console.log(`${p.id}: score=${p.score}, predicted=${p.label}`);
    });

    // Compare predictions to ground truth
    expectStats(predictions, groundTruth)
      .field("label")
      .accuracy.toBeAtLeast(0.7) // At least 70% accuracy
      .displayConfusionMatrix();
  });
});
