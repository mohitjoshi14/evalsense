/**
 * Basic example of using LLM-based metrics in evalsense
 *
 * This example demonstrates:
 * - Setting up an LLM client
 * - Using hallucination, relevance, faithfulness, and toxicity metrics
 * - Default per-row evaluation mode
 *
 * Run with: npx evalsense run examples/llm-metrics-basic.eval.js
 */

import { describe, evalTest } from "evalsense";
import { setLLMClient, createMockLLMClient } from "evalsense/metrics";
import { hallucination, relevance, faithfulness, toxicity } from "evalsense/metrics/opinionated";

// ============================================================================
// Step 1: Configure LLM Client
// ============================================================================

// In production, implement this with your LLM provider (OpenAI, Anthropic, etc.)
// For this example, we use a mock client
const mockLLMClient = createMockLLMClient({
  response: {
    score: 0.1,
    hallucinated_claims: [],
    relevant_parts: ["answer"],
    irrelevant_parts: [],
    faithful_statements: ["accurate"],
    unfaithful_statements: [],
    categories: [],
    severity: "none",
    reasoning: "The output is accurate and appropriate.",
  },
});

// Set the LLM client globally (one-time setup)
setLLMClient(mockLLMClient);

// ============================================================================
// Step 2: Use Metrics in Evaluation Tests
// ============================================================================

describe("LLM Metrics - Basic Usage", () => {
  evalTest("hallucination detection", async () => {
    const outputs = [
      { id: "1", output: "Paris is the capital of France with 2.1 million residents." },
      { id: "2", output: "Paris has 50 million people and is larger than London." },
    ];

    const context = [
      "Paris is the capital of France. It has approximately 2.1 million residents.",
      "Paris is the capital of France. It has approximately 2.1 million residents.",
    ];

    const results = await hallucination({ outputs, context });

    console.log("\n=== Hallucination Results ===");
    results.forEach((result) => {
      console.log(`Output ${result.id}:`);
      console.log(`  Score: ${result.score.toFixed(2)}`);
      console.log(`  Has Hallucinations: ${result.label}`);
      console.log(`  Reasoning: ${result.reasoning}`);
      console.log("");
    });

    // First output should have low hallucination (accurate)
    // Second output should have high hallucination (wrong population)
  });

  evalTest("relevance assessment", async () => {
    const outputs = [
      { id: "1", output: "The capital of France is Paris." },
      { id: "2", output: "France is known for wine and cheese." },
    ];

    const query = [
      "What is the capital of France?",
      "What is the capital of France?",
    ];

    const results = await relevance({ outputs, query });

    console.log("\n=== Relevance Results ===");
    results.forEach((result) => {
      console.log(`Output ${result.id}:`);
      console.log(`  Score: ${result.score.toFixed(2)}`);
      console.log(`  Relevance: ${result.label}`);
      console.log(`  Reasoning: ${result.reasoning}`);
      console.log("");
    });

    // First output should be highly relevant
    // Second output should be less relevant (doesn't answer the question)
  });

  evalTest("faithfulness to source", async () => {
    const outputs = [
      { id: "1", output: "The study found that 65% of participants improved." },
      { id: "2", output: "The study found that most participants got worse." },
    ];

    const source = [
      "Our study showed that 65% of participants demonstrated improvement.",
      "Our study showed that 65% of participants demonstrated improvement.",
    ];

    const results = await faithfulness({ outputs, source });

    console.log("\n=== Faithfulness Results ===");
    results.forEach((result) => {
      console.log(`Output ${result.id}:`);
      console.log(`  Score: ${result.score.toFixed(2)}`);
      console.log(`  Faithfulness: ${result.label}`);
      console.log(`  Reasoning: ${result.reasoning}`);
      console.log("");
    });

    // First output should be faithful
    // Second output should be unfaithful (contradicts source)
  });

  evalTest("toxicity detection", async () => {
    const outputs = [
      { id: "1", output: "Thank you for your question. I'd be happy to help." },
      { id: "2", output: "That's a stupid question. Why would anyone ask that?" },
    ];

    const results = await toxicity({ outputs });

    console.log("\n=== Toxicity Results ===");
    results.forEach((result) => {
      console.log(`Output ${result.id}:`);
      console.log(`  Score: ${result.score.toFixed(2)}`);
      console.log(`  Severity: ${result.label}`);
      console.log(`  Reasoning: ${result.reasoning}`);
      console.log("");
    });

    // First output should have no toxicity
    // Second output should have moderate toxicity (personal attack)
  });
});

describe("LLM Metrics - Real-World Example", () => {
  evalTest("evaluate chatbot responses", async () => {
    // Simulate a dataset of chatbot interactions
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
        response: "We are open 24/7 to assist you with any questions.",
      },
    ];

    // Evaluate for hallucinations
    const hallucinationResults = await hallucination({
      outputs: interactions.map((i) => ({ id: i.id, output: i.response })),
      context: interactions.map((i) => i.context),
    });

    // Evaluate for relevance
    const relevanceResults = await relevance({
      outputs: interactions.map((i) => ({ id: i.id, output: i.response })),
      query: interactions.map((i) => i.query),
    });

    console.log("\n=== Chatbot Evaluation ===");
    interactions.forEach((interaction, idx) => {
      console.log(`\nConversation: ${interaction.id}`);
      console.log(`Query: "${interaction.query}"`);
      console.log(`Response: "${interaction.response}"`);
      console.log(`Hallucination Score: ${hallucinationResults[idx].score.toFixed(2)}`);
      console.log(`Relevance Score: ${relevanceResults[idx].score.toFixed(2)}`);
    });

    // conv-1: Should be accurate and relevant
    // conv-2: Should be flagged as hallucination (claims 24/7, context says 9-5)
  });
});

// ============================================================================
// Production Setup Example
// ============================================================================

/*
// In production, implement your own LLM client adapter:

import Anthropic from "@anthropic-ai/sdk";

function createAnthropicAdapter(apiKey) {
  const client = new Anthropic({ apiKey });

  return {
    async complete(prompt) {
      const message = await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });
      return message.content[0].text;
    },
  };
}

// Then use it:
setLLMClient(createAnthropicAdapter(process.env.ANTHROPIC_API_KEY));
*/
