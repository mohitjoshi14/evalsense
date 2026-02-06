/**
 * Per-Row vs Batch Evaluation Modes
 *
 * This example demonstrates the difference between:
 * - Per-row mode: Calls LLM for each output (accurate, expensive)
 * - Batch mode: Calls LLM once for all outputs (cheaper, potentially less accurate)
 *
 * Run with: npx evalsense run examples/llm-metrics-modes.eval.js
 */

import { describe, evalTest } from "evalsense";
import {
  setLLMClient,
  createMockLLMClient,
  // Uncomment to use real LLM providers
  // createOpenAIAdapter,
  // createAnthropicAdapter,
  // createOpenRouterAdapter,
} from "evalsense/metrics";
import { hallucination } from "evalsense/metrics/opinionated";

// OPTION: Use real LLM provider (uncomment one)
// const llmClient = createOpenAIAdapter(process.env.OPENAI_API_KEY, {
//   model: "gpt-4-turbo-preview",
//   temperature: 0,
// });
// const llmClient = createAnthropicAdapter(process.env.ANTHROPIC_API_KEY, {
//   model: "claude-3-5-sonnet-20241022",
// });
// const llmClient = createOpenRouterAdapter(process.env.OPENROUTER_API_KEY, {
//   model: "anthropic/claude-3.5-sonnet",
// });

// OPTION: Use mock client (for demo without API costs)
const llmClient = createMockLLMClient({
  // For batch mode, return array
  responses: [
    // Per-row calls
    { score: 0.1, hallucinated_claims: [], reasoning: "Per-row: Accurate" },
    { score: 0.9, hallucinated_claims: ["wrong data"], reasoning: "Per-row: Hallucinated" },
    // Batch call
    [
      { id: "1", score: 0.1, hallucinated_claims: [], reasoning: "Batch: Accurate" },
      {
        id: "2",
        score: 0.9,
        hallucinated_claims: ["wrong data"],
        reasoning: "Batch: Hallucinated",
      },
    ],
  ],
});

setLLMClient(llmClient);

describe("Evaluation Modes Comparison", () => {
  // Sample dataset
  const outputs = [
    { id: "1", output: "Paris is the capital of France with 2.1 million people." },
    { id: "2", output: "Paris has 50 million people living in the city." },
  ];

  const context = [
    "Paris is the capital of France. Population: 2.1 million.",
    "Paris is the capital of France. Population: 2.1 million.",
  ];

  evalTest("per-row evaluation mode", async () => {
    console.log("\n=== PER-ROW MODE ===");
    console.log("How it works:");
    console.log("- Makes one LLM call per output");
    console.log("- Each evaluation is independent");
    console.log("- Higher accuracy (no cross-contamination)");
    console.log("- Higher cost (N API calls for N outputs)");
    console.log("- Higher latency (sequential or parallel calls)\n");

    const results = await hallucination({
      outputs,
      context,
      evaluationMode: "per-row",
    });

    console.log("Results:");
    results.forEach((result) => {
      console.log(`\nOutput ${result.id}:`);
      console.log(`  Mode: ${result.evaluationMode}`);
      console.log(`  Score: ${result.score.toFixed(2)}`);
      console.log(`  Reasoning: ${result.reasoning}`);
    });

    console.log("\nAPI Calls Made: 2 (one per output)");
  });

  evalTest("batch evaluation mode", async () => {
    console.log("\n=== BATCH MODE ===");
    console.log("How it works:");
    console.log("- Makes one LLM call for all outputs");
    console.log("- All outputs evaluated together");
    console.log("- Lower cost (1 API call total)");
    console.log("- Lower latency (single call)");
    console.log("- Potentially less accurate (LLM sees all at once)\n");

    const results = await hallucination({
      outputs,
      context,
      evaluationMode: "batch",
    });

    console.log("Results:");
    results.forEach((result) => {
      console.log(`\nOutput ${result.id}:`);
      console.log(`  Mode: ${result.evaluationMode}`);
      console.log(`  Score: ${result.score.toFixed(2)}`);
      console.log(`  Reasoning: ${result.reasoning}`);
    });

    console.log("\nAPI Calls Made: 1 (all outputs in single call)");
  });
});

describe("When to Use Each Mode", () => {
  evalTest("cost vs accuracy tradeoffs", async () => {
    console.log("\n=== CHOOSING THE RIGHT MODE ===\n");

    console.log("Use PER-ROW mode when:");
    console.log("✓ Accuracy is critical");
    console.log("✓ Each output must be evaluated independently");
    console.log("✓ Budget allows for multiple API calls");
    console.log("✓ Outputs are complex or lengthy");
    console.log("✓ High-stakes evaluation (production monitoring)");

    console.log("\nUse BATCH mode when:");
    console.log("✓ Cost optimization is important");
    console.log("✓ Outputs are simple or short");
    console.log("✓ Lower accuracy is acceptable");
    console.log("✓ Processing large volumes");
    console.log("✓ Development/testing scenarios");

    console.log("\n=== COST EXAMPLE ===");
    console.log("Evaluating 1000 outputs:");
    console.log("Per-row: 1000 API calls");
    console.log("Batch:   1 API call (or ~10 if batching in groups of 100)");
    console.log("Cost savings: ~99% with batch mode");

    console.log("\n=== ACCURACY CONSIDERATIONS ===");
    console.log("Batch mode potential issues:");
    console.log("- LLM may compare outputs against each other");
    console.log("- Context switching between multiple outputs");
    console.log("- Longer prompts may hit token limits");
    console.log("- Scoring may be less consistent");
  });
});

describe("Hybrid Approach", () => {
  evalTest("combining both modes strategically", async () => {
    console.log("\n=== HYBRID STRATEGY ===\n");

    console.log("Strategy: Use batch for initial screening, per-row for edge cases");

    // Step 1: Batch evaluation for quick screening
    console.log("\n1. Batch screening (cheap, fast):");
    const batchResults = await hallucination({
      outputs,
      context,
      evaluationMode: "batch",
    });

    // Identify edge cases (scores near threshold)
    const edgeCases = batchResults.filter((r) => r.score > 0.4 && r.score < 0.6);

    console.log(`   Screened: ${batchResults.length} outputs`);
    console.log(`   Edge cases found: ${edgeCases.length}`);

    // Step 2: Per-row re-evaluation for edge cases
    if (edgeCases.length > 0) {
      console.log("\n2. Per-row re-evaluation for edge cases (accurate):");
      const edgeCaseOutputs = outputs.filter((o) => edgeCases.some((e) => e.id === o.id));
      const edgeCaseContext = edgeCases.map((e) => {
        const idx = outputs.findIndex((o) => o.id === e.id);
        return context[idx];
      });

      const perRowResults = await hallucination({
        outputs: edgeCaseOutputs,
        context: edgeCaseContext,
        evaluationMode: "per-row",
      });

      console.log(`   Re-evaluated: ${perRowResults.length} outputs`);
    }

    console.log("\n3. Cost savings:");
    console.log(`   Total API calls: ${1 + edgeCases.length}`);
    console.log(`   vs pure per-row: ${outputs.length} calls`);
    console.log(`   Savings: ${Math.round((1 - (1 + edgeCases.length) / outputs.length) * 100)}%`);
  });
});

// ============================================================================
// Performance Tips
// ============================================================================

console.log("\n=== PERFORMANCE TIPS ===\n");
console.log("Batch Mode Optimization:");
console.log("- Limit batch size to 50-100 outputs per call");
console.log("- Monitor token limits (prompts get large)");
console.log("- Consider batching by similarity for better results");
console.log("- Use structured output (JSON mode) when available");

console.log("\nPer-Row Mode Optimization:");
console.log("- Use Promise.all() for parallel execution");
console.log("- Implement rate limiting for API quotas");
console.log("- Cache results to avoid re-evaluation");
console.log("- Consider using faster/cheaper models");
