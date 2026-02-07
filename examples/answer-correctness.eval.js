/**
 * Answer Correctness Custom Metric Example
 *
 * This example shows how to create an LLM-based "answer correctness" metric
 * similar to Ragas answer_correctness. It evaluates how correct an AI answer
 * is compared to a ground truth reference answer.
 *
 * Key concepts:
 * 1. Custom metrics use registerMetric() to add new evaluation capabilities
 * 2. LLM-based metrics use the global LLM client for evaluation
 * 3. Each metric returns MetricOutput[] with id, metric, score, label, reasoning
 * 4. You can add custom metadata fields for additional insights
 *
 * Run with: npx evalsense run examples/answer-correctness.eval.js
 */

import { describe, evalTest, expectStats } from "evalsense";
import { registerMetric, setLLMClient, createMockLLMClient, getLLMClient } from "evalsense/metrics";

// ============================================================================
// Step 1: Define the Answer Correctness Prompt
// ============================================================================

const ANSWER_CORRECTNESS_PROMPT = `You are an expert evaluator assessing answer quality.

REFERENCE ANSWER (Ground Truth):
{reference}

STUDENT ANSWER (To Evaluate):
{answer}

EVALUATION CRITERIA:

1. **Factual Accuracy** (0-1)
   - Are all facts in the student answer correct?
   - Does it contradict the reference?
   - Score: 0=factually wrong, 1=completely accurate

2. **Completeness** (0-1)
   - Does it cover the key points from reference?
   - Are important details missing?
   - Score: 0=missing everything, 1=covers all points

3. **Overall Correctness** (0-1)
   - Weighted combination of accuracy and completeness
   - Formula: (factual_accuracy * 0.6) + (completeness * 0.4)
   - Score: 0=completely incorrect, 1=perfect answer

EXAMPLES:

Reference: "Paris is the capital of France, located on the Seine River."
Answer: "Paris is the capital of France."
→ factual_accuracy=1.0, completeness=0.7, correctness=0.88

Reference: "The Earth orbits the Sun in 365.25 days."
Answer: "The Earth orbits the Sun yearly."
→ factual_accuracy=0.9, completeness=0.6, correctness=0.78

Reference: "Python was created by Guido van Rossum in 1991."
Answer: "Python was created in the 1990s."
→ factual_accuracy=0.8, completeness=0.5, correctness=0.68

Return JSON only:
{
  "factual_accuracy": <0-1>,
  "completeness": <0-1>,
  "correctness": <0-1>,
  "reasoning": "<1-2 sentence explanation>"
}`;

// ============================================================================
// Step 2: Setup LLM Client
// ============================================================================

// OPTION A: Mock client for testing (no API costs)
const mockClient = createMockLLMClient({
  responses: [
    // Test case 1: Perfect answer
    {
      factual_accuracy: 1.0,
      completeness: 1.0,
      correctness: 1.0,
      reasoning: "Answer is completely accurate and comprehensive.",
    },
    // Test case 2: Partially correct
    {
      factual_accuracy: 0.6,
      completeness: 0.4,
      correctness: 0.52,
      reasoning: "Answer has some correct facts but misses key details.",
    },
    // Test case 3: Mostly correct
    {
      factual_accuracy: 0.9,
      completeness: 0.8,
      correctness: 0.86,
      reasoning: "Answer is accurate with minor omissions.",
    },
    // Test case 4: Wrong answer
    {
      factual_accuracy: 0.2,
      completeness: 0.1,
      correctness: 0.16,
      reasoning: "Answer contains factual errors and misses main points.",
    },
  ],
});

setLLMClient(mockClient);

// OPTION B: Real OpenAI (uncomment to use)
// import { createOpenAIAdapter } from "evalsense/metrics";
// const realClient = createOpenAIAdapter(process.env.OPENAI_API_KEY, {
//   model: "gpt-4-turbo-preview",
//   temperature: 0, // Deterministic for evaluation
// });
// setLLMClient(realClient);

// OPTION C: Real Anthropic (uncomment to use)
// import { createAnthropicAdapter } from "evalsense/metrics";
// const realClient = createAnthropicAdapter(process.env.ANTHROPIC_API_KEY, {
//   model: "claude-3-5-sonnet-20241022",
//   temperature: 0,
// });
// setLLMClient(realClient);

// ============================================================================
// Step 3: Register the Answer Correctness Metric
// ============================================================================

registerMetric("answer-correctness", async (config) => {
  const { outputs } = config;

  // Custom parameter: reference answers (ground truth)
  // This gets passed via config when calling runMetric()
  const references = config.references || config.reference || [];

  if (references.length === 0) {
    throw new Error("answer-correctness metric requires 'references' array in config");
  }

  if (outputs.length !== references.length) {
    throw new Error(
      `Outputs (${outputs.length}) and references (${references.length}) must have same length`
    );
  }

  const client = getLLMClient();
  if (!client) {
    throw new Error("answer-correctness requires an LLM client. Call setLLMClient() first.");
  }

  // Evaluate each answer against its reference
  const results = await Promise.all(
    outputs.map(async (output, index) => {
      const reference = references[index];

      // Fill prompt template
      const prompt = ANSWER_CORRECTNESS_PROMPT.replace("{reference}", reference).replace(
        "{answer}",
        output.output
      );

      try {
        // Call LLM
        let evaluation;

        if (client.completeStructured) {
          // Prefer structured output if available (OpenAI JSON mode)
          evaluation = await client.completeStructured(prompt, {
            type: "object",
            properties: {
              factual_accuracy: { type: "number" },
              completeness: { type: "number" },
              correctness: { type: "number" },
              reasoning: { type: "string" },
            },
            required: ["factual_accuracy", "completeness", "correctness", "reasoning"],
          });
        } else {
          // Fallback: parse JSON from text
          const response = await client.complete(prompt);
          const jsonMatch =
            response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);
          evaluation = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : response);
        }

        // Validate scores are in 0-1 range
        const normalize = (score) => Math.max(0, Math.min(1, score));

        return {
          id: output.id,
          metric: "answer-correctness",
          score: normalize(evaluation.correctness),
          label:
            evaluation.correctness >= 0.8
              ? "correct"
              : evaluation.correctness >= 0.5
                ? "partial"
                : "incorrect",
          reasoning: evaluation.reasoning,
          evaluationMode: "per-row",
          // Store sub-scores in metadata for detailed analysis
          metadata: {
            factual_accuracy: normalize(evaluation.factual_accuracy),
            completeness: normalize(evaluation.completeness),
          },
        };
      } catch (error) {
        throw new Error(`Failed to evaluate answer correctness for ${output.id}: ${error.message}`);
      }
    })
  );

  return results;
});

// ============================================================================
// Step 4: Use the Metric in Tests
// ============================================================================

describe("Answer Correctness Evaluation", () => {
  evalTest("evaluate QA model outputs", async () => {
    // Your QA dataset with questions, model answers, and reference answers
    const qaDataset = [
      {
        id: "q1",
        question: "What is the capital of France?",
        modelAnswer: "Paris is the capital city of France.",
        referenceAnswer: "Paris",
      },
      {
        id: "q2",
        question: "Who invented the telephone?",
        modelAnswer: "Some inventor in the past.",
        referenceAnswer: "Alexander Graham Bell invented the telephone in 1876.",
      },
      {
        id: "q3",
        question: "What is photosynthesis?",
        modelAnswer:
          "Photosynthesis is the process where plants convert light into energy using chlorophyll.",
        referenceAnswer:
          "Photosynthesis is the process by which plants use sunlight, water, and CO2 to produce oxygen and energy in the form of sugar.",
      },
      {
        id: "q4",
        question: "How many planets are in our solar system?",
        modelAnswer: "There are 9 planets in the solar system.",
        referenceAnswer: "There are 8 planets in our solar system.",
      },
    ];

    // Prepare data for metric
    const outputs = qaDataset.map((item) => ({
      id: item.id,
      output: item.modelAnswer,
    }));

    const references = qaDataset.map((item) => item.referenceAnswer);

    // Run the custom metric
    const { runMetric } = await import("evalsense/metrics");
    const results = await runMetric("answer-correctness", { outputs, references });

    // Display results
    console.log("\n╔════════════════════════════════════════════════════════════════╗");
    console.log("║              ANSWER CORRECTNESS EVALUATION                     ║");
    console.log("╚════════════════════════════════════════════════════════════════╝\n");

    qaDataset.forEach((item, i) => {
      const result = results[i];
      console.log(`\n[${item.id}] ${item.question}`);
      console.log(`├─ Model Answer: "${item.modelAnswer}"`);
      console.log(`├─ Reference:    "${item.referenceAnswer}"`);
      console.log(`├─ Correctness:  ${(result.score * 100).toFixed(0)}% (${result.label})`);
      console.log(`├─ Accuracy:     ${(result.metadata.factual_accuracy * 100).toFixed(0)}%`);
      console.log(`├─ Completeness: ${(result.metadata.completeness * 100).toFixed(0)}%`);
      console.log(`└─ Reasoning:    ${result.reasoning}`);
    });

    // Statistical assertions on the distribution
    expectStats(results)
      .field("score")
      .percentageAbove(0.5).toBeAtLeast(0.5) // At least 50% should score above 0.5
      .percentageAbove(0.8).toBeAtLeast(0.25); // At least 25% should be highly correct
  });

  evalTest("monitor answer quality over time", async () => {
    // Simulate production QA data
    const productionData = [
      { id: "p1", answer: "Correct and complete answer.", reference: "Correct answer." },
      { id: "p2", answer: "Partially correct.", reference: "Fully correct answer." },
      { id: "p3", answer: "Another good answer.", reference: "Expected answer." },
    ];

    const outputs = productionData.map((d) => ({ id: d.id, output: d.answer }));
    const references = productionData.map((d) => d.reference);

    const { runMetric } = await import("evalsense/metrics");
    const results = await runMetric("answer-correctness", { outputs, references });

    console.log("\n=== Production Quality Monitoring ===");
    console.log(`Total Answers: ${results.length}`);
    console.log(
      `Avg Score: ${(results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(2)}`
    );

    const correct = results.filter((r) => r.label === "correct").length;
    const partial = results.filter((r) => r.label === "partial").length;
    const incorrect = results.filter((r) => r.label === "incorrect").length;

    console.log(`Correct: ${correct}, Partial: ${partial}, Incorrect: ${incorrect}`);

    // Quality gate: fail if too many incorrect answers
    expectStats(results).field("score").percentageBelow(0.3).toBeAtLeast(0.2); // Less than 20% should be poor quality
  });
});

// ============================================================================
// Step 5: Compare Answer Correctness to Simple Exact Match
// ============================================================================

describe("Comparing Metrics: Answer Correctness vs Exact Match", () => {
  evalTest("show advantage of semantic correctness over exact match", async () => {
    const testCases = [
      {
        id: "1",
        answer: "The capital is Paris.",
        reference: "Paris",
        exactMatch: false, // Different wording
        semanticallyCorrect: true, // Same meaning
      },
      {
        id: "2",
        answer: "Paris",
        reference: "Paris",
        exactMatch: true,
        semanticallyCorrect: true,
      },
      {
        id: "3",
        answer: "Berlin",
        reference: "Paris",
        exactMatch: false,
        semanticallyCorrect: false,
      },
    ];

    // Run answer correctness metric
    const outputs = testCases.map((t) => ({ id: t.id, output: t.answer }));
    const references = testCases.map((t) => t.reference);

    const { runMetric } = await import("evalsense/metrics");
    const correctnessResults = await runMetric("answer-correctness", { outputs, references });

    // Simple exact match
    const exactMatchResults = testCases.map((t) => ({
      id: t.id,
      metric: "exact-match",
      score: t.answer.toLowerCase() === t.reference.toLowerCase() ? 1 : 0,
      label: t.exactMatch ? "match" : "no-match",
    }));

    console.log("\n=== Metric Comparison ===\n");
    testCases.forEach((t, i) => {
      console.log(`[${t.id}] Answer: "${t.answer}" | Reference: "${t.reference}"`);
      console.log(`  Exact Match:        ${exactMatchResults[i].score === 1 ? "✓" : "✗"}`);
      console.log(
        `  Answer Correctness: ${(correctnessResults[i].score * 100).toFixed(0)}% (${correctnessResults[i].label})`
      );
      console.log("");
    });

    console.log("📊 Key Insight:");
    console.log("Exact match misses semantically correct answers with different wording.");
    console.log("Answer correctness uses LLM to understand semantic equivalence.\n");
  });
});
