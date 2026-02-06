/**
 * Use Case 2: LLM Judge Distribution Monitoring
 *
 * Use LLM-based metrics (hallucination, toxicity, relevance, faithfulness)
 * to evaluate model outputs, then monitor the score distributions.
 *
 * This demonstrates:
 * - Setting up an LLM client
 * - Using opinionated metrics
 * - Per-row vs batch evaluation modes
 * - Distribution monitoring without ground truth
 *
 * Key pattern: LLM judges produce scores -> monitor score distributions
 *
 * Run with: npx evalsense run examples/uc2-llm-judge-distribution.eval.js
 */

import { describe, evalTest, expectStats } from "evalsense";
import {
  setLLMClient,
  createMockLLMClient,
  // Uncomment to use real LLM providers:
  // createOpenAIAdapter,
  // createAnthropicAdapter,
  // createOpenRouterAdapter,
} from "evalsense/metrics";
import { hallucination, toxicity, relevance, faithfulness } from "evalsense/metrics/opinionated";

// ============================================================================
// LLM Client Setup
// ============================================================================

// OPTION 1: Mock Client (for testing without API calls)
const llmClient = createMockLLMClient({
  responses: [
    // Per-row responses
    { score: 0.1, hallucinated_claims: [], reasoning: "Accurate content" },
    { score: 0.8, hallucinated_claims: ["wrong data"], reasoning: "Contains hallucination" },
    { score: 0.1, categories: [], severity: "none", reasoning: "Professional tone" },
    { score: 0.7, categories: ["harsh"], severity: "moderate", reasoning: "Rude language" },
    // Batch response
    [
      { id: "1", score: 0.1, reasoning: "Good" },
      { id: "2", score: 0.8, reasoning: "Bad" },
    ],
    // Relevance responses
    { score: 0.9, reasoning: "Directly answers the question" },
    { score: 0.3, reasoning: "Off-topic response" },
    // Faithfulness responses
    { score: 0.95, reasoning: "Accurately reflects source" },
    { score: 0.2, reasoning: "Contradicts source document" },
  ],
});

// OPTION 2: Real OpenAI
// const llmClient = createOpenAIAdapter(process.env.OPENAI_API_KEY, {
//   model: "gpt-4-turbo-preview",
//   temperature: 0,
// });

// OPTION 3: Real Anthropic
// const llmClient = createAnthropicAdapter(process.env.ANTHROPIC_API_KEY, {
//   model: "claude-3-5-sonnet-20241022",
// });

// OPTION 4: OpenRouter (access 100+ models)
// const llmClient = createOpenRouterAdapter(process.env.OPENROUTER_API_KEY, {
//   model: "anthropic/claude-3.5-sonnet",
// });

// Set global LLM client
setLLMClient(llmClient);

// ============================================================================
// Per-Row Mode (Default) - More Accurate, Higher Cost
// ============================================================================

describe("UC2: LLM Judge with Per-Row Mode", () => {
  evalTest("hallucination detection with per-row evaluation", async () => {
    // Model outputs to evaluate
    const outputs = [
      { id: "1", output: "Paris is the capital of France with 2.1 million residents." },
      { id: "2", output: "Paris has 50 million people and is larger than Tokyo." },
    ];

    // Context for grounding
    const context = [
      "Paris is the capital of France. It has approximately 2.1 million residents.",
      "Paris is the capital of France. It has approximately 2.1 million residents.",
    ];

    // Evaluate with per-row mode (default)
    // Makes one LLM call per output
    const results = await hallucination({
      outputs,
      context,
      evaluationMode: "per-row",
    });

    // Each result has: id, metric, score, label, reasoning, evaluationMode
    console.log("\n=== Hallucination Results (Per-Row) ===");
    results.forEach((r) => {
      console.log(`${r.id}: score=${r.score.toFixed(2)}, mode=${r.evaluationMode}`);
    });

    // Monitor distribution: most outputs should have low hallucination
    expectStats(results).field("score").toHavePercentageBelow(0.5, 0.5); // 50% should be below 0.5
  });

  evalTest("toxicity detection per-row", async () => {
    const outputs = [
      { id: "1", output: "Thank you for your question. I'd be happy to help." },
      { id: "2", output: "That's a stupid question. Why would anyone ask that?" },
    ];

    const results = await toxicity({
      outputs,
      evaluationMode: "per-row",
    });

    console.log("\n=== Toxicity Results (Per-Row) ===");
    results.forEach((r) => {
      console.log(`${r.id}: score=${r.score.toFixed(2)}, severity=${r.label}`);
    });

    // Most outputs should have low toxicity
    expectStats(results).field("score").toHavePercentageBelow(0.5, 0.5);
  });
});

// ============================================================================
// Batch Mode - Lower Cost, Potentially Less Accurate
// ============================================================================

describe("UC2: LLM Judge with Batch Mode", () => {
  evalTest("hallucination detection with batch evaluation", async () => {
    const outputs = [
      { id: "1", output: "The study found 65% improvement in patients." },
      { id: "2", output: "The study found 90% of patients got worse." },
    ];

    const context = [
      "Our research showed 65% of patients demonstrated improvement.",
      "Our research showed 65% of patients demonstrated improvement.",
    ];

    // Evaluate with batch mode
    // Makes ONE LLM call for ALL outputs
    const results = await hallucination({
      outputs,
      context,
      evaluationMode: "batch",
    });

    console.log("\n=== Hallucination Results (Batch) ===");
    results.forEach((r) => {
      console.log(`${r.id}: score=${r.score.toFixed(2)}, mode=${r.evaluationMode}`);
    });

    // Same assertion pattern - just different evaluation mode
    expectStats(results).field("score").toHavePercentageBelow(0.5, 0.5);
  });

  evalTest("cost comparison: per-row vs batch", async () => {
    console.log("\n=== Cost Comparison ===");
    console.log("For 100 outputs:");
    console.log("- Per-row: 100 API calls");
    console.log("- Batch:   1 API call (or batches of ~50)");
    console.log("- Savings: ~99%");
    console.log("");
    console.log("Use batch for:");
    console.log("- Development/testing");
    console.log("- Cost-sensitive scenarios");
    console.log("- Simple outputs");
    console.log("");
    console.log("Use per-row for:");
    console.log("- Production evaluation");
    console.log("- High-stakes decisions");
    console.log("- Complex outputs");
  });
});

// ============================================================================
// Additional Metrics: Relevance and Faithfulness
// ============================================================================

describe("UC2: Other LLM Metrics", () => {
  evalTest("relevance assessment", async () => {
    const outputs = [
      { id: "1", output: "The capital of France is Paris." },
      { id: "2", output: "France has beautiful countryside." },
    ];

    const query = ["What is the capital of France?", "What is the capital of France?"];

    const results = await relevance({
      outputs,
      query,
      evaluationMode: "per-row",
    });

    console.log("\n=== Relevance Results ===");
    results.forEach((r) => {
      console.log(`${r.id}: score=${r.score.toFixed(2)}`);
    });

    // Most should be relevant
    expectStats(results).field("score").toHavePercentageAbove(0.3, 0.5);
  });

  evalTest("faithfulness to source", async () => {
    const outputs = [
      { id: "1", output: "The report concludes with positive findings." },
      { id: "2", output: "The report shows negative results throughout." },
    ];

    const source = [
      "Our report concludes with overall positive findings and recommendations.",
      "Our report concludes with overall positive findings and recommendations.",
    ];

    const results = await faithfulness({
      outputs,
      source,
      evaluationMode: "per-row",
    });

    console.log("\n=== Faithfulness Results ===");
    results.forEach((r) => {
      console.log(`${r.id}: score=${r.score.toFixed(2)}`);
    });

    // At least 50% should be faithful
    expectStats(results).field("score").toHavePercentageAbove(0.5, 0.5);
  });
});

// ============================================================================
// Real-World Example: Chatbot Monitoring
// ============================================================================

describe("UC2: Real-World Chatbot Monitoring", () => {
  evalTest("evaluate chatbot response quality", async () => {
    // Chatbot interaction data
    const interactions = [
      {
        id: "conv-1",
        query: "How do I reset my password?",
        context: "Users can reset passwords via Settings > Account > Reset Password.",
        response: "To reset your password, go to Settings, then Account, and click Reset Password.",
      },
      {
        id: "conv-2",
        query: "What are your business hours?",
        context: "Our support team is available Monday-Friday, 9 AM to 5 PM EST.",
        response: "We are open 24/7 to assist you.",
      },
    ];

    // Check for hallucinations
    const hallucinationResults = await hallucination({
      outputs: interactions.map((i) => ({ id: i.id, output: i.response })),
      context: interactions.map((i) => i.context),
    });

    // Check for relevance
    const relevanceResults = await relevance({
      outputs: interactions.map((i) => ({ id: i.id, output: i.response })),
      query: interactions.map((i) => i.query),
    });

    console.log("\n=== Chatbot Quality Monitoring ===");
    interactions.forEach((i, idx) => {
      console.log(`${i.id}:`);
      console.log(`  Hallucination: ${hallucinationResults[idx].score.toFixed(2)}`);
      console.log(`  Relevance: ${relevanceResults[idx].score.toFixed(2)}`);
    });

    // Quality gates: monitor distributions
    expectStats(hallucinationResults).field("score").toHavePercentageBelow(0.5, 0.5);
    expectStats(relevanceResults).field("score").toHavePercentageAbove(0.5, 0.5);
  });
});
